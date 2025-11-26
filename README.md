# TEDxKI Website

Static marketing site for the TEDxKI event. The source is plain HTML/CSS/JS but a small Node-based build step now pulls structured content from Contentful and pre-renders the pages into `dist/` so the final deploy is a fully static site (no PHP proxy required).

## How things are structured
- Entry points live in `index.html` (home) plus section pages in `sites/<section>` (about, team, sponsors, watch, contact). Each template pulls in shared CSS/JS from the project root.
- Shared layout: `partials/includes.js` defines custom elements (header, social strip, footer) so the navigation lives in one place.
- Global behavior: `app.js` handles the theme toggle, mobile menu, scroll fade-ins, sponsor marquee, contact helper, etc.
- Page-specific behavior:
  - Landing page (`index.html` + `sites/landing/landing.js`) now just handles hero animations; the hero background URL/alt text is baked in during the build.
  - Team page (`sites/team/team.html/js`) relies on pre-rendered cards; the script only controls animations and responsive masonry layout.
  - Events page (`sites/events/events.html/js`) receives its entire dataset inline (JSON script tag) and the JS simply wires up the year switcher + hero sizing animations.
  - Other sections (watch, sponsors, contact, etc.) remain pure static HTML.
- Build logic lives in `scripts/`. `render-*.js` files fetch from Contentful via GraphQL and mutate the HTML templates with `jsdom` before writing to `dist/`.

## Contentful integration
- Copy `.env.example` to `.env` and fill:
  - `CONTENTFUL_SPACE_ID`, `CONTENTFUL_ENVIRONMENT` (usually `master`) and `CONTENTFUL_ACCESS_TOKEN` (Content Delivery token).
  - `TEAM_YEAR` – cohort rendered on the Team page.
  - `LANDING_HERO_ASSET_CODE` – `imageStatic.code` used for the landing hero background asset.
- GraphQL queries live in `scripts/queries/`. They pull:
  - `eventCollection` (full detail) for the events page, including speakers/hosts/performers/teams.
  - `newTeamMemberCardCollection` filtered by year for the team grid.
  - `imageStaticCollection` for the landing hero asset.
- Results are serialized directly into the destination HTML so the deployed files have real markup + an inline JSON payload (`<script id="event-data">`) for any client-side interactions (event switching) without further network calls.

## Requirements
- Node.js 18+ (the scripts rely on the built-in `fetch` API and `fs.cp`).
- A Contentful space with the content types referenced above and a valid CDA token.
- Optional: any static file server (for previewing the `dist/` output locally).

## Build & preview locally
1. `cp .env.example .env` and fill in your Contentful credentials.
2. Install dependencies: `npm install` (creates `node_modules/`).
3. Run the build: `npm run build`.
4. Serve the generated site in `dist/` using any static server (`npx serve dist`, `python -m http.server --directory dist`, etc.).

The build script performs:
- Clean `dist/`.
- Copy static assets (CSS, JS, HTML templates, partials, etc.).
- Render landing, events, and team pages with live data from Contentful and write them back into `dist/`.

## Editing and adding content
- Navigation/footer/social links: edit `partials/includes.js` once and re-run the build.
- Shared look and feel: adjust `styles.css`.
- Page copy/layout: edit the HTML in `index.html` or `sites/<section>/<section>.html`. Templates are the source of truth; `dist/` is disposable output.
- Images/icons: drop files into `assets/` and reference via root-relative paths (e.g., `/assets/images/foo.jpg`). For Contentful-managed assets update the relevant entries in Contentful; the next build will pick them up.
- Watch page: cards are static HTML (`sites/watch/watch.html`); adjust them + the `<select>` as needed.
- Contact CTA/form: still a `mailto:` block in `index.html`; update copy there.

## Maintaining for future years
- **Team**: add/update `newTeamMemberCard` entries in Contentful for the new year, set `TEAM_YEAR` in `.env`, then rerun the build.
- **Events**: add new `event` entries in Contentful (with speakers/hosts/performers/teams). The newest year is chosen automatically, but you can override via `EVENT_YEAR` env var if needed.
- **Landing hero**: create/update an `imageStatic` entry and set `LANDING_HERO_ASSET_CODE` accordingly.
- **Watch archive / sponsors**: update the static HTML directly.
- After any Contentful/content changes simply rerun `npm run build` and deploy the refreshed `dist/` directory.

## Using Contentful static images (ImageStatic)
- Content type: `imageStatic` with fields `code` (unique), `altDiscription`, and `file` (asset link).
- Quick HTML usage: add `data-static-code="your-code"` to any `img` (or `source`/`picture` child). Aliases `data-static-image-code`, `data-static-image-params`, and `data-static-image-alt` also work. Optional helpers:
  - `data-static-params="fm=webp&q=85&w=1400"` to append URL params (alias: `data-static-image-params`).
  - `data-static-alt="Custom alt"` to override alt (alias: `data-static-image-alt`).
  - `data-placeholder="/assets/fallback.jpg"` and/or `src="/assets/fallback.jpg"` as a local fallback if fetch fails.
- The build prerender fills `src`/`alt` using Contentful and writes the result into `dist/`. No client fetch is done at runtime.
- Explicit targets already wired:
  - Landing hero: `#hero-background` reads `data-static-code`/`data-static-image-code` when present, otherwise falls back to `LANDING_HERO_ASSET_CODE` (default `hero-background`) with params `fm=webp&q=86&w=1400`.
  - About page: `#aboutHeroImage` / `#aboutStoryImage` read `data-static-code`/`data-static-image-code` when present, otherwise fall back to `ABOUT_HERO_IMAGE_CODE` / `ABOUT_STORY_IMAGE_CODE` (or `ABOUT_IMAGE_CODES` comma list) with params baked in.
- Generic support: `render-team.js`, `render-events.js`, and the “static” pages (contact, sponsors, watch) run `injectStaticImages` with `[data-static-code]` (or the aliases). Add the attribute and rebuild to pull any ImageStatic asset.
- Adding a new page: either
  1) Add `data-static-code` images and include the page path in `STATIC_PAGES` inside `scripts/build.js` so it prerenders, or
  2) Create a small `scripts/render-<page>.js` that calls `injectStaticImages(document, ...)` for custom targets and add a build step.

## Deployment notes
- Deploy the contents of `dist/` to any static host (GitHub Pages, Netlify, Vercel static, S3, etc.). No PHP or runtime data fetching is required.
- Keep `.env`/tokens out of version control. CI/CD can inject these env vars before running `npm run build` to generate production artifacts.
