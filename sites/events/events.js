import { renderEventContent, renderEventOptions, determineInitialYear } from './eventRenderer.js';

const FALLBACK_DEFAULT_YEAR = 2025;

let revealIndexSeed = 0;
let heroResizeHandle;
const pageState = {
  events: [],
  defaultYear: FALLBACK_DEFAULT_YEAR,
};
let activeYear = null;

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

function primeStaticReveals({ resetIndices = false } = {}) {
  if (resetIndices) revealIndexSeed = 0;
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

function readEmbeddedEvents() {
  const el = document.getElementById('event-data');
  if (!el) return { events: [] };
  try {
    return JSON.parse(el.textContent || '{}');
  } catch (err) {
    console.error('[event] Failed to parse embedded events payload', err);
    return { events: [] };
  }
}

function getSelectedYearFromUrl() {
  try {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get('year');
    if (!raw) return null;
    const parsed = Number.parseInt(raw.trim(), 10);
    return Number.isNaN(parsed) ? null : parsed;
  } catch (err) {
    return null;
  }
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

function loadEvent(year) {
  const event = pageState.events.find(evt => evt.yearIdentifier === year);
  if (!event) {
    console.warn('[event] No event entry found for year', year);
    return false;
  }
  activeYear = year;
  renderEventContent(document, event, { fallbackYear: year });
  primeStaticReveals({ resetIndices: true });
  setActiveEventOption(year);
  queueHeroSizing();
  return true;
}

function bootstrap() {
  primeStaticReveals();
  const embedded = readEmbeddedEvents();
  pageState.events = Array.isArray(embedded.events) ? embedded.events : [];
  pageState.defaultYear = embedded.defaultYear || FALLBACK_DEFAULT_YEAR;

  const preferredFromUrl = getSelectedYearFromUrl();
  const initialYear = determineInitialYear(
    pageState.events,
    preferredFromUrl,
    embedded.initialYear || pageState.defaultYear
  ) || pageState.defaultYear;

  renderEventOptions(document, pageState.events, initialYear, (year) => {
    if (year === activeYear) return;
    if (loadEvent(year)) {
      updateUrlYear(year);
    }
  });

  if (!loadEvent(initialYear)) {
    const fallback = pageState.events[0]?.yearIdentifier || pageState.defaultYear;
    loadEvent(fallback);
  }

  window.addEventListener('resize', queueHeroSizing, { passive: true });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
