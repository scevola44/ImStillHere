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

function ogImageUrl(repoName) {
  // GitHub auto-generates social preview images at this URL.
  // The first path segment is a cache-busting hash; any non-empty value works.
  return `https://opengraph.githubassets.com/1/${GITHUB_USER}/${repoName}`;
}

function shapeRepo(repo) {
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
    ogImageUrl: ogImageUrl(repo.name),
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
  return repos.map(shapeRepo);
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
