# ImStillHere

Personal portfolio site for [Alberto Bandini](https://github.com/Scevola44).

Built with [Astro](https://astro.build) + Tailwind CSS, based on the [`career-portfolio-template`](https://github.com/nbakh16/career-portfolio-template) by nbakh16.

Deployed to GitHub Pages at https://scevola44.github.io/ImStillHere/

## Editing content

All content lives in plain JSON under `src/data/`:

| File              | What it controls                                                            |
| ----------------- | --------------------------------------------------------------------------- |
| `home.json`       | Name, intro paragraph, hero photo, resume PDF link, social icons & contacts |
| `resume.json`     | Experience, education, skills, languages, certificates (JSON Resume schema) |
| `tech.json`       | Tech-stack section: categorised skills with proficiency level + icons       |
| `featured.json`   | Curation overlay for the Portfolio (`pinned`: order, `hidden`: drop)        |
| `projects.json`   | **Generated** on every build — do not edit by hand                          |

The Portfolio section is fetched from the GitHub REST API at build time
(`scripts/fetch-github-projects.mjs`) for the user `Scevola44`. New repos
appear automatically; tweak `featured.json` to pin or hide individual ones.

To change the colour palette, edit `src/config.ts` and pick one of:
`default`, `strategic`, `innovator`, `executive`.

## Local development

```sh
npm install
npm run dev      # runs the GitHub fetch then starts http://localhost:4321/ImStillHere/
```

## Build & preview

```sh
npm run build
npm run preview
```

## Deploy

Pushing to the `main` branch triggers `.github/workflows/deploy.yml`, which
runs the GitHub fetch, builds the site, and publishes it to GitHub Pages.

## Resume PDF

The "Download PDF" button on the home page links to `Alberto-Bandini-Resume.pdf`
relative to the site root. Drop the compiled PDF into `public/` to make it
available — Astro copies everything in `public/` verbatim into the build output.
