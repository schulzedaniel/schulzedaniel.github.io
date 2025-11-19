# TEDxKI Website

Static marketing site for the TEDxKI event. The site is pure HTML/CSS/JS with a small PHP proxy that pulls structured content from Contentful (team, hero assets). Everything lives in this repo – no build step.

## How things are structured
- Entry points: `index.html` (home) plus section pages in `sites/<section>` (about, team, sponsors, watch, contact). Each page pulls in shared CSS/JS from the project root.
- Shared layout: `partials/includes.js` defines custom elements for the header, social strip, and footer so the nav is maintained in one place.
- Global behavior: `app.js` handles theme toggle, the mobile menu, scroll fade-ins, sponsor marquee, contact-form helper, and auto-updated copyright year.
- Page-specific behavior:
  - Landing hero/static assets from Contentful: `sites/landing/landing.js` fetches images by `code` (see below).
  - Team grid from Contentful: `sites/team/team.js` fetches people for a given year and builds a balanced masonry grid.
  - Watch page: `sites/watch/watch.js` controls the modal video player and year filter. The grid itself is currently static HTML.
- Styling: `styles.css` holds the shared design system and layout. Each page has its own CSS next to the HTML (e.g., `sites/team/team.css`).
- Assets: images/logos/icons under `assets/`; videos under `assets/videos/`; working files (e.g., GIMP) live under `assets/GIMP_Files/`.

## Contentful integration
- Proxy: `contentful-proxy.php` posts GraphQL requests to Contentful and returns the JSON (requires PHP + cURL on the server). It currently hardcodes `spaceId`, `envId`, and an access token—move these to environment variables or a server-only config for production.
- Team data:
  - Content type: `newTeamMemberCard` with fields `firstName`, `positionTitle`, `team`, `year`, `isLead`, `linkedInUrl`, `portrait`.
  - The year is set via `TEAM_YEAR` in `sites/team/team.js`; records are filtered and sorted (team, leads first, name) before rendering.
- Static images:
  - Content type: `imageStatic` queried by a `code` field. `sites/landing/landing.js` calls `loadStaticImage('hero-background', 'hero-background')` to fill the landing hero image/alt text.
  - Add new assets in Contentful, then call `loadStaticImage('<code>', '<element-id>')` for other placeholders.
- If the proxy is not reachable (e.g., local `file://`), pages still load but dynamic bits (hero image, team grid) will stay empty or use placeholders.

## Requirements
- PHP 8+ with cURL enabled (for the Contentful proxy).
- Any static web server. No Node/build tooling is required.
- Internet access for Contentful and any externally hosted images/videos.

## Run locally
1) Ensure PHP is installed (`php -v`).
2) From the repo root, run `php -S localhost:8000`.
3) Open `http://localhost:8000/index.html`. Dynamic data (hero image, team grid) will load via `contentful-proxy.php` if the token/space/env are valid.

## Editing and adding content
- Navigation/footer/social links: edit `partials/includes.js` once; all pages pick it up.
- Shared look and feel: adjust `styles.css`.
- Page copy/layout: edit the HTML inside `index.html` or `sites/<section>/<section>.html`. Keep the `<script defer>` tags that pull in shared and page JS.
- Images/icons: drop files into `assets/` and reference them with root-relative paths (e.g., `/assets/images/foo.jpg`). For Contentful-managed images, upload to Contentful and reference via `loadStaticImage`.
- Watch page: update the cards in `sites/watch/watch.html` (`data-year`, `data-youtube`, titles, thumbnails) and add/remove year options in the `<select>` when a new season is added.
- Contact CTA/form: the main contact block is a `mailto:` in `index.html`. `app.js` includes a generic form helper that posts to a `data-form-endpoint` URL if you add a real form element.

## Maintaining for future years
- Team rollover:
  - Create/update `newTeamMemberCard` entries in Contentful for the new year (set `year` and `team` consistently).
  - Change `TEAM_YEAR` in `sites/team/team.js` to the active year so the correct cohort renders.
- Hero/background assets: add new `imageStatic` entries (e.g., `hero-background`) and ensure the target element IDs exist in the HTML.
- Watch archive: add the new year to the filter dropdown and add cards for each talk with the right `data-year` and YouTube IDs.
- Sponsors/partners: swap marquee logos in `index.html` (or move them to Contentful and query similarly to the team/static image patterns).
- Tokens/secrets: rotate the Contentful access token and keep secrets out of version control; inject via environment/config on the hosting server.
- Quick smoke test each season: load `/index.html` and `/sites/team/team.html` locally with the PHP server running and watch the console for Contentful errors.

## Deployment notes
- Host on a server that can run PHP so `contentful-proxy.php` works. If deploying to a static-only host, dynamic Contentful data will not load; consider replacing the proxy with a serverless function or pre-rendering data during CI.
- Keep the proxy endpoint path the same (`/contentful-proxy.php`) unless you also update the fetch calls in `sites/landing/landing.js` and `sites/team/team.js`.
