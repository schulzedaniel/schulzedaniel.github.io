import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

import { runContentfulQuery } from './lib/contentful.js';
import { EVENT_LIST_QUERY, EVENT_BY_YEAR_QUERY } from './queries/eventQueries.js';
import { renderEventContent, renderEventOptions, determineInitialYear } from '../sites/events/eventRenderer.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const DIST_DIR = path.join(ROOT_DIR, 'dist');

export async function renderEventsPage() {
  // 1) Fetch the list of events (lightweight) to pick years and names
  const listData = await runContentfulQuery(EVENT_LIST_QUERY, { limit: 20 });
  const list = (listData?.eventCollection?.items || [])
    .filter(item => Number.isInteger(item?.yearIdentifier));

  if (!list.length) {
    throw new Error('Contentful returned no events to render.');
  }

  // 2) Fetch full detail per event (lower per-query complexity)
  const detailedEvents = [];
  for (const evt of list) {
    const year = evt.yearIdentifier;
    try {
      const detailData = await runContentfulQuery(EVENT_BY_YEAR_QUERY, { year });
      const full = detailData?.eventCollection?.items?.[0];
      if (full) detailedEvents.push(full);
    } catch (err) {
      console.warn(`Skipping event year ${year} due to fetch error:`, err?.message || err);
    }
  }

  if (!detailedEvents.length) {
    throw new Error('No detailed event entries could be fetched.');
  }

  const preferredYear = process.env.EVENT_YEAR ? Number.parseInt(process.env.EVENT_YEAR, 10) : null;
  const initialYear = determineInitialYear(detailedEvents, preferredYear, detailedEvents[0].yearIdentifier) || detailedEvents[0].yearIdentifier;
  const initialEvent = detailedEvents.find(evt => evt.yearIdentifier === initialYear) || detailedEvents[0];

  const templatePath = path.join(ROOT_DIR, 'sites/events/events.html');
  const template = await fs.readFile(templatePath, 'utf8');
  const dom = new JSDOM(template);
  const { document } = dom.window;

  renderEventOptions(document, detailedEvents, initialYear);
  renderEventContent(document, initialEvent, { fallbackYear: initialYear });

  const dataEl = document.getElementById('event-data');
  if (dataEl) {
    const payload = {
      events: detailedEvents,
      initialYear,
      defaultYear: detailedEvents[0].yearIdentifier,
    };
    dataEl.textContent = JSON.stringify(payload);
  }

  const outputPath = path.join(DIST_DIR, 'sites/events/events.html');
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, dom.serialize(), 'utf8');
}

const isDirectRun = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  renderEventsPage().catch(err => {
    console.error('Failed to prerender events page:', err);
    process.exitCode = 1;
  });
}
