import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

import { runContentfulQuery } from './lib/contentful.js';
import { STATIC_IMAGE_QUERY } from './queries/landingQueries.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const DIST_DIR = path.join(ROOT_DIR, 'dist');

export async function renderLandingPage() {
  const heroCode = process.env.LANDING_HERO_ASSET_CODE || 'hero-background';
  const data = await runContentfulQuery(STATIC_IMAGE_QUERY, { code: heroCode, limit: 1 });
  const heroEntry = data?.imageStaticCollection?.items?.[0] || null;

  const templatePath = path.join(ROOT_DIR, 'index.html');
  const dom = new JSDOM(await fs.readFile(templatePath, 'utf8'));
  const { document } = dom.window;

  if (heroEntry?.file?.url) {
    const heroImg = document.getElementById('hero-background');
    if (heroImg) {
      heroImg.src = heroEntry.file.url;
      if (heroEntry.altDiscription) {
        heroImg.alt = heroEntry.altDiscription;
      } else if (heroEntry.file.description && !heroImg.alt) {
        heroImg.alt = heroEntry.file.description;
      }
    }
  }

  const outputPath = path.join(DIST_DIR, 'index.html');
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, dom.serialize(), 'utf8');
}

const isDirectRun = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  renderLandingPage().catch(err => {
    console.error('Failed to prerender landing page:', err);
    process.exitCode = 1;
  });
}
