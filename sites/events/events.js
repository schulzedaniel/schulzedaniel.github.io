// events.js – Fetch event data from Contentful via the PHP proxy and render the page
(() => {
  'use strict';

  const PROXY_ENDPOINT = '/contentful-proxy.php';
  const DEFAULT_YEAR = 2025;

  const EVENT_QUERY = `
    query EventByYear($year: Int!) {
      eventCollection(where: { yearIdentifier: $year }, limit: 1) {
        items {
          name
          yearIdentifier
          description
          startTime
          endTime
          location
          ticketSaleLink
          image {
            url
            description
          }
          teamPhoto {
            url
            description
          }
          speakersCollection(limit: 48) {
            items {
              __typename
              ... on Speaker {
                name
                jobTitle
                linkedInProfileLink
                photo {
                  url
                  description
                }
              }
              ... on Host {
                name
                photo {
                  url
                  description
                }
                linkedin
              }
              ... on Performer {
                name
                title
                photo {
                  url
                  description
                }
              }
              ... on NewTeamMemberCard {
                firstName
                lastName
                positionTitle
              }
            }
          }
          hostsCollection(limit: 24) {
            items {
              __typename
              ... on Host {
                name
                photo {
                  url
                  description
                }
                linkedin
              }
              ... on Speaker {
                name
                jobTitle
                linkedInProfileLink
                photo {
                  url
                  description
                }
              }
              ... on Performer {
                name
                title
                photo {
                  url
                  description
                }
              }
              ... on NewTeamMemberCard {
                firstName
                lastName
                positionTitle
              }
            }
          }
          performersCollection(limit: 24) {
            items {
              __typename
              ... on Performer {
                name
                title
                photo {
                  url
                  description
                }
              }
              ... on Speaker {
                name
                jobTitle
                linkedInProfileLink
                photo {
                  url
                  description
                }
              }
              ... on NewTeamMemberCard {
                firstName
                lastName
                positionTitle
              }
            }
          }
          teamsCollection(limit: 24) {
            items {
              __typename
              ... on Team {
                name
                teamMembersCollection(limit: 100) {
                  items {
                    __typename
                    ... on NewTeamMemberCard {
                      firstName
                      lastName
                      positionTitle
                      team
                      isLead
                      linkedInUrl
                      portrait {
                        url
                        description
                      }
                    }
                    ... on TeamMember {
                      name
                      title
                      photo {
                        url
                        description
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  `;

  const EVENT_LIST_QUERY = `
    query EventList {
      eventCollection(order: yearIdentifier_DESC, limit: 50) {
        items {
          sys { id }
          name
          yearIdentifier
        }
      }
    }
  `;

  let activeLoadToken = 0;

  let revealIndexSeed = 0;
  let heroResizeHandle;
  const revealObserver = typeof window !== 'undefined' && 'IntersectionObserver' in window
    ? new IntersectionObserver((entries, obs) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const el = entry.target;

          const kickoff = () => {
            el.classList.add('animating', 'pre-reveal');

            requestAnimationFrame(() => {
              const idx = Number(el.dataset.revealIndex || 0);
              const delay = Math.min(420, 40 + idx * 22);
              setTimeout(() => {
                if (el.classList.contains('portrait-wrap')) {
                  el.classList.add('revealed');
                } else {
                  el.classList.add('is-visible');
                }
                el.addEventListener('transitionend', () => {
                  el.classList.remove('animating', 'pre-reveal');
                  el.style.willChange = 'auto';
                }, { once: true });
              }, delay);
            });

            obs.unobserve(el);
          };

          if (el.classList.contains('portrait-wrap')) {
            const img = el.querySelector('img');
            if (img && 'decode' in img) {
              img.decode().catch(() => {}).finally(kickoff);
            } else {
              kickoff();
            }
          } else {
            kickoff();
          }
        }
      }, {
        root: null,
        rootMargin: '200px 0px 140px 0px',
        threshold: 0.01
      })
    : null;

  function observeForReveal(el) {
    if (!el) return;
    if (!revealObserver) {
      if (el.classList.contains('portrait-wrap')) {
        el.classList.add('revealed');
      } else {
        el.classList.add('is-visible');
      }
      return;
    }
    if (el.dataset.revealBound === '1') return;
    if (el.classList.contains('portrait-wrap') && !el.dataset.revealIndex) {
      el.dataset.revealIndex = String(revealIndexSeed++);
    }
    el.dataset.revealBound = '1';
    revealObserver.observe(el);
  }

  function primeStaticReveals() {
    const targets = document.querySelectorAll('.animate-once');
    if (!targets.length) return;
    targets.forEach(observeForReveal);
  }

  function applyHeroSizing() {
    const hero = document.querySelector('.event-hero');
    const heroImg = document.getElementById('eventImage');
    if (!hero || !heroImg) return;
    const height = heroImg.getBoundingClientRect().height;
    if (!height || !Number.isFinite(height)) return;
    hero.style.setProperty('--hero-img-height', `${height}px`);
  }

  function queueHeroSizing() {
    clearTimeout(heroResizeHandle);
    heroResizeHandle = setTimeout(() => {
      requestAnimationFrame(applyHeroSizing);
    }, 120);
  }

  async function fetchEventList() {
    const data = await fetchFromProxy(EVENT_LIST_QUERY, {});
    const items = data?.eventCollection?.items || [];
    return items
      .map(item => ({
        id: item?.sys?.id || '',
        yearIdentifier: item?.yearIdentifier,
        name: item?.name || `TEDxKI ${item?.yearIdentifier ?? ''}`
      }))
      .filter(item => Number.isInteger(item.yearIdentifier))
      .sort((a, b) => b.yearIdentifier - a.yearIdentifier);
  }

  async function fetchFromProxy(query, variables) {
    const res = await fetch(PROXY_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables })
    });

    const text = await res.text();
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (err) {
      console.error('[event] Invalid JSON from proxy:', text);
      throw err;
    }

    if (!res.ok) {
      throw new Error(`[event] Proxy request failed (${res.status})`);
    }
    if (parsed.errors?.length) {
      console.error('[event] GraphQL errors:', parsed.errors);
      throw new Error(parsed.errors[0].message || 'Contentful error');
    }

    return parsed.data;
  }

  function normalizedItems(collection) {
    if (!collection) return [];
    if (Array.isArray(collection)) return collection.filter(Boolean);
    if (Array.isArray(collection.items)) return collection.items.filter(Boolean);
    return [];
  }

  function normalizeUrl(url) {
    if (!url) return '';
    const trimmed = String(url).trim();
    if (!trimmed) return '';
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return `https://${trimmed}`;
  }

  function withImageParams(url, params = 'fm=webp&q=80&w=1200') {
    if (!url) return '';
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}${params}`;
  }

  function getPreferredAsset(entry, keys) {
    if (!entry) return null;
    for (const key of keys) {
      const asset = entry[key];
      if (asset?.url) return asset;
    }
    return null;
  }

  function getSelectedYear() {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get('year');
    if (!raw) return null;
    const parsed = Number.parseInt(raw.trim(), 10);
    return Number.isNaN(parsed) ? null : parsed;
  }

  function setText(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = value || '';
  }

  function setHtml(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = value || '';
  }

  function formatDateRange(startISO, endISO) {
    const fmt = new Intl.DateTimeFormat(undefined, { month: 'long', day: 'numeric' });

    const parse = (val) => {
      if (!val) return null;
      const d = new Date(val);
      return Number.isNaN(d.getTime()) ? null : d;
    };

    const start = parse(startISO);
    const end = parse(endISO);

    if (start && end) {
      const sameDay = start.toDateString() === end.toDateString();
      if (sameDay) return fmt.format(start);
      return `${fmt.format(start)} – ${fmt.format(end)}`;
    }
    if (start) return fmt.format(start);
    if (end) return fmt.format(end);
    return '';
  }

  function metaLine(event) {
    const datePart = formatDateRange(event?.startTime, event?.endTime);
    const locationPart = event?.location || '';
    return [datePart, locationPart].filter(Boolean).join(' • ');
  }

  function normalizePersonName(person) {
    const fallback = [person?.firstName, person?.lastName].filter(Boolean).join(' ');
    return (person?.name || fallback || person?.title || '').trim();
  }

  function normalizeRole(person) {
    return (person?.positionTitle || person?.title || person?.jobTitle || person?.role || '').trim();
  }

  function getPersonImage(person) {
    if (person?.photo?.url) return person.photo;
    if (person?.portrait?.url) return person.portrait;
    return null;
  }

  function getNameInitial(person) {
    const name = normalizePersonName(person);
    const firstChar = name.charAt(0).toUpperCase();
    return firstChar || '?';
  }

  function renderHero(event, fallbackYear) {
    const yearText = event?.yearIdentifier || fallbackYear;
    setText('eventYear', yearText ? `TEDxKI ${yearText}` : 'TEDxKI');
    setText('eventName', event?.name || '');
    setText('eventMeta', metaLine(event));
    setHtml('eventDescription', event?.description || '');

    const heroAsset = getPreferredAsset(event, ['heroImage', 'image', 'teamPhoto']);
    const heroImg = document.getElementById('eventImage');
    if (heroImg && heroAsset?.url) {
      heroImg.src = withImageParams(heroAsset.url, 'fm=webp&q=85&w=1400');
      heroImg.alt = heroAsset.description || event?.name || 'TEDxKI event';
      const syncSizing = () => queueHeroSizing();
      if (!heroImg.complete) {
        heroImg.addEventListener('load', syncSizing, { once: true });
      } else {
        syncSizing();
      }
    } else {
      queueHeroSizing();
    }

  }

  function createPersonCard(person) {
    const card = document.createElement('article');
    card.className = 'event-person-card';

    const avatar = document.createElement('div');
    avatar.className = 'event-person-avatar';
    const photo = getPersonImage(person);
    if (photo?.url) {
      const img = document.createElement('img');
      img.src = withImageParams(photo.url, 'fm=webp&w=300&q=80');
      img.alt = photo.description || normalizePersonName(person) || 'Event contributor';
      img.loading = 'lazy';
      img.decoding = 'async';
      avatar.appendChild(img);
    } else {
      const span = document.createElement('span');
      span.textContent = getNameInitial(person);
      avatar.appendChild(span);
    }
    card.appendChild(avatar);

    const meta = document.createElement('div');
    meta.className = 'event-person-meta';

    const name = document.createElement('div');
    name.className = 'event-person-name';
    name.textContent = normalizePersonName(person);
    meta.appendChild(name);

    const roleText = normalizeRole(person);
    if (roleText) {
      const role = document.createElement('div');
      role.className = 'event-person-role';
      role.textContent = roleText;
      meta.appendChild(role);
    }

    card.appendChild(meta);
    return card;
  }

  function renderPeopleSection(collection, gridId, sectionId) {
    const section = document.getElementById(sectionId);
    const grid = document.getElementById(gridId);
    if (!section || !grid) return;

    const people = normalizedItems(collection);
    grid.innerHTML = '';

    if (!people.length) {
      section.hidden = true;
      return;
    }

    people.forEach(person => {
      grid.appendChild(createPersonCard(person));
    });

    section.hidden = false;
  }

  function buildTeamCard(member) {
    const derivedName = (member?.displayName || member?.name || [member?.firstName, member?.lastName].filter(Boolean).join(' ')).trim();
    const fullName = derivedName || 'Team member';
    const roleText = member?.positionTitle || member?.title || '';
    const portraitAsset = member?.portrait?.url ? member.portrait : member?.photo;

    const card = document.createElement('article');
    card.className = 'team-card';

    const wrap = document.createElement('div');
    wrap.className = 'portrait-wrap animate-once';
    wrap.dataset.anim = 'slide-up';

    if (portraitAsset?.url) {
      const img = document.createElement('img');
      img.className = 'portrait';
      img.src = withImageParams(portraitAsset.url, 'fm=webp&q=80&w=900');
      img.alt = portraitAsset.description || fullName || 'Team member';
      img.loading = 'lazy';
      img.decoding = 'async';
      wrap.appendChild(img);
    } else {
      const placeholder = document.createElement('div');
      placeholder.className = 'portrait portrait--placeholder';
      placeholder.textContent = (fullName || '?').charAt(0).toUpperCase();
      placeholder.setAttribute('aria-label', fullName || 'Team member');
      wrap.appendChild(placeholder);
    }

    const label = document.createElement('div');
    label.className = 'card-label';

    const nameEl = document.createElement('span');
    nameEl.className = 'name';
    nameEl.textContent = fullName;
    label.appendChild(nameEl);

    if (roleText) {
      const roleEl = document.createElement('span');
      roleEl.className = 'role';
      roleEl.textContent = roleText;
      label.appendChild(roleEl);
    }

    wrap.appendChild(label);

    const linkedIn = normalizeUrl(member?.linkedInUrl);
    if (linkedIn) {
      const link = document.createElement('a');
      link.className = 'linkedin';
      link.href = linkedIn;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.setAttribute('aria-label', `LinkedIn ${fullName}`.trim());

      const icon = document.createElement('img');
      icon.src = '/assets/logos/social/LI-In-Bug.png';
      icon.alt = 'LinkedIn';
      link.appendChild(icon);
      wrap.appendChild(link);
    }

    card.appendChild(wrap);
    return { card, wrap };
  }

  function createTeamSection(team) {
    const section = document.createElement('section');
    section.className = 'event-team-section';

    const header = document.createElement('header');
    header.className = 'event-team-header';
    const title = document.createElement('h3');
    title.textContent = team?.title || team?.name || 'Team';
    header.appendChild(title);
    section.appendChild(header);

    const grid = document.createElement('div');
    grid.className = 'team-grid';
    const colsWrap = document.createElement('div');
    colsWrap.className = 'cols';

    const members = normalizedItems(team?.teamMembersCollection);
    if (!members.length) return null;
    const columnCount = Math.max(1, Math.min(4, members.length || 1));
    const columns = [];
    for (let i = 0; i < columnCount; i++) {
      const col = document.createElement('div');
      col.className = `col col-${i + 1}`;
      columns.push(col);
      colsWrap.appendChild(col);
    }

    members.forEach((member, index) => {
      const { card, wrap } = buildTeamCard(member);
      const column = columns[index % columnCount];
      column.appendChild(card);
      observeForReveal(wrap);
    });

    grid.appendChild(colsWrap);
    section.appendChild(grid);
    return section;
  }

  function renderEventTeams(teamsCollection) {
    const container = document.getElementById('eventTeams');
    const section = document.getElementById('eventTeamsSection');
    if (!container || !section) return;

    const teams = normalizedItems(teamsCollection).sort((a, b) => {
      const nameA = (a?.title || a?.name || '').toLowerCase();
      const nameB = (b?.title || b?.name || '').toLowerCase();
      if (nameA < nameB) return -1;
      if (nameA > nameB) return 1;
      return 0;
    });

    container.innerHTML = '';

    if (!teams.length) {
      section.hidden = true;
      return;
    }

    const sections = teams.map(createTeamSection).filter(Boolean);
    if (!sections.length) {
      section.hidden = true;
      return;
    }

    const frag = document.createDocumentFragment();
    sections.forEach(teamSection => frag.appendChild(teamSection));
    container.appendChild(frag);
    section.hidden = false;
  }

  function determineInitialYear(events) {
    const preferred = getSelectedYear();
    if (preferred && events.some(ev => ev.yearIdentifier === preferred)) {
      return preferred;
    }
    if (events.length) {
      return events[0].yearIdentifier;
    }
    return DEFAULT_YEAR;
  }

  function renderEventOptions(events, activeYear) {
    const block = document.getElementById('eventSwitcherBlock');
    const optionsEl = document.getElementById('eventSwitcher');
    if (!optionsEl || !block) return;

    optionsEl.innerHTML = '';
    if (!events.length) {
      block.hidden = true;
      return;
    }

    block.hidden = false;
    events.forEach(evt => {
      const year = evt.yearIdentifier;
      const label = evt.name || `TEDxKI ${year ?? ''}`;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'event-switcher__option';
      btn.dataset.year = year;
      btn.textContent = year ?? label;
      btn.title = label;
      if (year === activeYear) btn.classList.add('is-active');
      btn.addEventListener('click', () => {
        if (btn.classList.contains('is-active')) return;
        loadEvent(year);
      });
      optionsEl.appendChild(btn);
    });
  }

  function setActiveEventOption(year) {
    const buttons = document.querySelectorAll('.event-switcher__option');
    buttons.forEach(btn => {
      const btnYear = Number.parseInt(btn.dataset.year, 10);
      if (btnYear === year) {
        btn.classList.add('is-active');
      } else {
        btn.classList.remove('is-active');
      }
    });
  }

  function updateUrlYear(year) {
    if (typeof history?.replaceState !== 'function') return;
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('year', String(year));
      history.replaceState({}, '', url.toString());
    } catch (err) {
      console.warn('[event] Failed to update URL params', err);
    }
  }

  async function loadEvent(year) {
    const numericYear = Number.parseInt(year, 10);
    if (Number.isNaN(numericYear)) return;

    setActiveEventOption(numericYear);
    updateUrlYear(numericYear);
    const requestId = ++activeLoadToken;

    try {
      const data = await fetchFromProxy(EVENT_QUERY, { year: numericYear });
      if (requestId !== activeLoadToken) return;

      const event = data?.eventCollection?.items?.[0];
      if (!event) {
        console.warn('[event] No event entry found for year', numericYear);
        return;
      }

      renderHero(event, numericYear);
      renderPeopleSection(event?.speakersCollection, 'speakersGrid', 'speakersSection');
      renderPeopleSection(event?.hostsCollection, 'hostsGrid', 'hostsSection');
      renderPeopleSection(event?.performersCollection, 'performersGrid', 'performersSection');
      renderEventTeams(event?.teamsCollection);
    } catch (err) {
      if (requestId === activeLoadToken) {
        console.error('[event] Failed to load event page:', err);
      }
    }
  }

  async function initEventPage() {
    try {
      const availableEvents = await fetchEventList();
      const initialYear = determineInitialYear(availableEvents);
      renderEventOptions(availableEvents, initialYear);
      await loadEvent(initialYear);
    } catch (err) {
      console.error('[event] Failed to initialize events:', err);
      await loadEvent(DEFAULT_YEAR);
    }
  }

  const bootstrap = () => {
    primeStaticReveals();
    initEventPage();
    window.addEventListener('resize', queueHeroSizing, { passive: true });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }
})();
