import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { renderLandingPage } from './render-landing.js';
import { renderEventsPage } from './render-events.js';
import { renderTeamPage } from './render-team.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const DIST_DIR = path.join(ROOT_DIR, 'dist');

function fmt(ms) {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

async function step(label, fn) {
  const started = Date.now();
  process.stdout.write(`▶ ${label}...\n`);
  await fn();
  const elapsed = Date.now() - started;
  process.stdout.write(`✓ ${label} (${fmt(elapsed)})\n`);
}

async function cleanDist() {
  await fs.rm(DIST_DIR, { recursive: true, force: true });
}

async function copyStaticAssets() {
  const entries = [
    'assets',
    'partials',
    'sites',
    'styles.css',
    'app.js',
    'README.md',
    'notes.md'
  ];

  for (const entry of entries) {
    const src = path.join(ROOT_DIR, entry);
    try {
      const stats = await fs.lstat(src);
      const dest = path.join(DIST_DIR, entry);
      if (stats.isDirectory()) {
        await fs.cp(src, dest, { recursive: true });
      } else {
        await fs.mkdir(path.dirname(dest), { recursive: true });
        await fs.copyFile(src, dest);
      }
    } catch (err) {
      // optional entries may not exist (e.g., notes)
      if (err.code !== 'ENOENT') throw err;
    }
  }
}

async function build() {
  const overallStart = Date.now();

  await step('Cleaning dist', cleanDist);
  await step('Copying static assets', copyStaticAssets);
  await step('Rendering landing page', renderLandingPage);
  await step('Rendering events page', renderEventsPage);
  await step('Rendering team page', renderTeamPage);

  const total = Date.now() - overallStart;
  console.log(`Build complete in ${fmt(total)}. Output in ./dist`);
}

const isDirectRun = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  build().catch(err => {
    console.error('Build failed:', err);
    process.exitCode = 1;
  });
}
