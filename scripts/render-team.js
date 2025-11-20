import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

import { runContentfulQuery } from './lib/contentful.js';
import { TEAM_BY_YEAR_QUERY } from './queries/teamQueries.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const DIST_DIR = path.join(ROOT_DIR, 'dist');

export async function renderTeamPage() {
  const teamYear = process.env.TEAM_YEAR ? Number.parseInt(process.env.TEAM_YEAR, 10) : new Date().getFullYear();
  const data = await runContentfulQuery(TEAM_BY_YEAR_QUERY, { year: teamYear, limit: 400 });
  const members = data?.newTeamMemberCardCollection?.items || [];
  if (!members.length) {
    throw new Error(`No team members found for year ${teamYear}.`);
  }

  const templatePath = path.join(ROOT_DIR, 'sites/team/team.html');
  const dom = new JSDOM(await fs.readFile(templatePath, 'utf8'));
  const { document } = dom.window;

  const grid = document.getElementById('teamGrid');
  const colsWrapper = grid?.querySelector('.cols');
  if (!grid || !colsWrapper) {
    throw new Error('Team grid container is missing from the template.');
  }

  const ordered = orderMembers(members);
  let columns = Array.from(colsWrapper.querySelectorAll('.col'));
  if (!columns.length) {
    for (let i = 1; i <= 4; i++) {
      const col = document.createElement('div');
      col.className = `col col-${i}`;
      colsWrapper.appendChild(col);
    }
    columns = Array.from(colsWrapper.querySelectorAll('.col'));
  }
  columns.forEach(col => { col.innerHTML = ''; });

  ordered.forEach((member, index) => {
    const colIndex = index % columns.length;
    const card = buildTeamCard(document, member, index);
    columns[colIndex].appendChild(card);
  });

  const outputPath = path.join(DIST_DIR, 'sites/team/team.html');
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, dom.serialize(), 'utf8');
}

function orderMembers(items) {
  const teams = new Map();
  items.forEach(member => {
    const teamName = member.team || 'Other';
    if (!teams.has(teamName)) teams.set(teamName, []);
    teams.get(teamName).push(member);
  });

  const sortedTeams = Array.from(teams.keys()).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  const ordered = [];
  sortedTeams.forEach(teamName => {
    const bucket = teams.get(teamName);
    bucket.sort((a, b) => {
      const leadA = !!a.isLead;
      const leadB = !!b.isLead;
      if (leadA !== leadB) return leadA ? -1 : 1;
      return (a.firstName || '').localeCompare(b.firstName || '', undefined, { sensitivity: 'base' });
    });
    ordered.push(...bucket);
  });
  return ordered;
}

function normalizeUrl(url) {
  if (!url) return '';
  const trimmed = String(url).trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function buildTeamCard(doc, member, index) {
  const card = doc.createElement('article');
  card.className = 'team-card';

  const wrap = doc.createElement('div');
  wrap.className = 'portrait-wrap animate-once';
  wrap.dataset.anim = 'slide-up';
  wrap.dataset.revealIndex = String(index);

  const firstName = member.firstName || member.name || '';
  const lastName = member.lastName || '';
  const displayName = [firstName, lastName].filter(Boolean).join(' ') || 'Team member';
  const role = member.positionTitle || '';
  const portraitUrl = member?.portrait?.url;
  const portraitDesc = member?.portrait?.description || `${displayName} — ${role}`.trim();

  if (portraitUrl) {
    const img = doc.createElement('img');
    img.className = 'portrait';
    img.src = withImageParams(portraitUrl, 'fm=webp&q=80&w=900');
    img.alt = portraitDesc || 'Team portrait';
    img.loading = 'lazy';
    img.decoding = 'async';
    wrap.appendChild(img);
  } else {
    const placeholder = doc.createElement('div');
    placeholder.className = 'portrait portrait--placeholder';
    placeholder.textContent = displayName.charAt(0).toUpperCase();
    placeholder.setAttribute('aria-label', displayName);
    wrap.appendChild(placeholder);
  }

  const label = doc.createElement('div');
  label.className = 'card-label';

  const nameEl = doc.createElement('span');
  nameEl.className = 'name';
  nameEl.textContent = firstName || displayName;
  const sup = doc.createElement('span');
  sup.className = 'sup';
  sup.textContent = 'x';
  nameEl.appendChild(sup);
  label.appendChild(nameEl);

  if (role) {
    const roleEl = doc.createElement('span');
    roleEl.className = 'role';
    roleEl.textContent = role;
    label.appendChild(roleEl);
  }

  const linkedinUrl = normalizeUrl(member.linkedInUrl);
  if (linkedinUrl) {
    const anchor = doc.createElement('a');
    anchor.className = 'linkedin';
    anchor.href = linkedinUrl;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    anchor.setAttribute('aria-label', `LinkedIn ${displayName}`);

    const icon = doc.createElement('img');
    icon.src = '/assets/logos/social/LI-In-Bug.png';
    icon.alt = 'LinkedIn';
    anchor.appendChild(icon);
    wrap.appendChild(anchor);
  }

  wrap.appendChild(label);
  card.appendChild(wrap);
  return card;
}

function withImageParams(url, params) {
  if (!url) return '';
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}${params}`;
}

const isDirectRun = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  renderTeamPage().catch(err => {
    console.error('Failed to prerender team page:', err);
    process.exitCode = 1;
  });
}
