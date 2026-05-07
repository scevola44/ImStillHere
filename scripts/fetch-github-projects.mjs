#!/usr/bin/env node
import { readFile, writeFile, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DATA_DIR = join(ROOT, 'src', 'data');
const FEATURED_PATH = join(DATA_DIR, 'featured.json');
const PROJECTS_PATH = join(DATA_DIR, 'projects.json');

const GITHUB_USER = 'Scevola44';
const API_URL = `https://api.github.com/users/${GITHUB_USER}/repos?per_page=100&sort=updated&type=owner`;

async function fileExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function readFeatured() {
  try {
    const raw = await readFile(FEATURED_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      pinned: Array.isArray(parsed.pinned) ? parsed.pinned : [],
      hidden: Array.isArray(parsed.hidden) ? parsed.hidden : [],
    };
  } catch {
    return { pinned: [], hidden: [] };
  }
}

function ogImageUrlFallback(repoName) {
  return `https://opengraph.githubassets.com/1/${GITHUB_USER}/${repoName}`;
}

// Uses the GraphQL API to get the real openGraphImageUrl for each repo.
// This is necessary because custom social preview images are served from
// repository-images.githubusercontent.com and are not reachable via the
// opengraph.githubassets.com URL pattern used as the fallback above.
async function fetchOgImageUrls(repoNames, headers) {
  if (!process.env.GITHUB_TOKEN) return {};

  const aliases = repoNames
    .map((name, i) => `r${i}: repository(owner: "${GITHUB_USER}", name: ${JSON.stringify(name)}) { openGraphImageUrl }`)
    .join('\n');

  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: `{ ${aliases} }` }),
  });

  if (!res.ok) return {};

  const { data } = await res.json();
  if (!data) return {};

  return Object.fromEntries(
    repoNames.map((name, i) => [name, data[`r${i}`]?.openGraphImageUrl])
  );
}

function shapeRepo(repo, ogImageUrls) {
  return {
    name: repo.name,
    description: repo.description || '',
    htmlUrl: repo.html_url,
    homepage: repo.homepage || '',
    language: repo.language || '',
    stars: repo.stargazers_count || 0,
    forks: repo.forks_count || 0,
    topics: Array.isArray(repo.topics) ? repo.topics : [],
    fork: !!repo.fork,
    archived: !!repo.archived,
    ogImageUrl: ogImageUrls[repo.name] || ogImageUrlFallback(repo.name),
    updatedAt: repo.updated_at,
  };
}

async function fetchRepos() {
  const headers = { 'Accept': 'application/vnd.github+json', 'User-Agent': 'imstillhere-build' };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  const res = await fetch(API_URL, { headers });
  if (!res.ok) {
    throw new Error(`GitHub API ${res.status}: ${await res.text()}`);
  }
  const repos = await res.json();
  if (!Array.isArray(repos)) {
    throw new Error('Unexpected GitHub API response shape');
  }

  const repoNames = repos.map(r => r.name);
  let ogImageUrls = {};
  try {
    ogImageUrls = await fetchOgImageUrls(repoNames, headers);
    const withCustom = Object.values(ogImageUrls).filter(Boolean).length;
    if (withCustom > 0) {
      console.log(`[fetch-github-projects] Resolved ${withCustom} OG image URLs via GraphQL.`);
    }
  } catch (err) {
    console.warn(`[fetch-github-projects] GraphQL OG image fetch failed, using fallback URLs: ${err.message}`);
  }

  return repos.map(r => shapeRepo(r, ogImageUrls));
}

function sortRepos(repos, pinned) {
  const pinnedIndex = new Map(pinned.map((name, i) => [name, i]));
  return repos.slice().sort((a, b) => {
    const aPinned = pinnedIndex.has(a.name);
    const bPinned = pinnedIndex.has(b.name);
    if (aPinned && bPinned) return pinnedIndex.get(a.name) - pinnedIndex.get(b.name);
    if (aPinned) return -1;
    if (bPinned) return 1;
    if (a.stars !== b.stars) return b.stars - a.stars;
    return new Date(b.updatedAt) - new Date(a.updatedAt);
  });
}

async function ensureFileExists() {
  if (!(await fileExists(PROJECTS_PATH))) {
    await writeFile(PROJECTS_PATH, '[]\n');
  }
}

async function main() {
  // Allow callers (e.g. postinstall) to just guarantee the file exists without hitting the API.
  if (process.argv.includes('--ensure-only')) {
    await ensureFileExists();
    return;
  }

  const { pinned, hidden } = await readFeatured();
  const hiddenSet = new Set(hidden);

  let repos;
  try {
    repos = await fetchRepos();
    console.log(`[fetch-github-projects] Fetched ${repos.length} repos for ${GITHUB_USER}.`);
  } catch (err) {
    console.warn(`[fetch-github-projects] Skipping fetch: ${err.message}`);
    if (await fileExists(PROJECTS_PATH)) {
      console.warn('[fetch-github-projects] Keeping existing projects.json.');
      return;
    }
    console.warn('[fetch-github-projects] Writing empty projects.json so build can proceed.');
    await writeFile(PROJECTS_PATH, '[]\n');
    return;
  }

  const filtered = repos.filter(r => !r.fork && !hiddenSet.has(r.name));
  const sorted = sortRepos(filtered, pinned);

  await writeFile(PROJECTS_PATH, JSON.stringify(sorted, null, 2) + '\n');
  console.log(`[fetch-github-projects] Wrote ${sorted.length} projects to projects.json.`);
}

main().catch(err => {
  console.error('[fetch-github-projects] Fatal:', err);
  process.exit(1);
});
