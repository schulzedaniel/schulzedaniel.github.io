/* watch.js
   - Contentful-powered video library
   - Search + filter by year
   - "Surprise me" random picker with highlight animation
   - YouTube (no-cookie) consent gate before playback
*/

(function(){
  const BRAND_HTML = '<span class="brand-mark">TED<span class="sup">x</span></span><span class="brand-tail">KI</span>';
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const CONSENT_KEY = 'tedxki_youtube_consent';

  const grid = $('#video-grid');
  const yearFilter = $('#year-filter');
  const searchInput = $('#talk-search');
  const resultCount = $('#result-count');
  const emptyState = $('#empty-state');
  const resetBtn = $('#reset-filters');
  const clearEmptyBtn = $('#clear-empty');
  const surpriseBtn = $('#surprise-btn');
  const talkCount = $('#talk-count');
  const yearRange = $('#year-range');
  const openConsentBtn = $('#open-consent');

  const modal = $('#video-modal');
  const modalBackdrop = modal?.querySelector('.modal-backdrop');
  const modalClose = $('#modal-close');
  const playerWrap = $('#player-wrap');
  const modalTitle = $('#modal-title');
  const playerSub = $('#player-sub');

  const consentModal = $('#consent-modal');
  const consentBackdrop = consentModal?.querySelector('.modal-backdrop');
  const consentClose = $('#consent-close');
  const consentAccept = $('#consent-accept');
  const consentDecline = $('#consent-decline');

  const supercut = $('#supercut');

  const state = {
    videos: [],
    years: [],
    videoById: new Map(),
    consent: false,
  };
  let cards = [];
  let pendingVideo = null;

  function readPayload() {
    const el = document.getElementById('video-data');
    if (!el) return { videos: [], years: [] };
    try {
      return JSON.parse(el.textContent || '{}');
    } catch (err) {
      console.warn('[watch] Failed to parse embedded video payload', err);
      return { videos: [], years: [] };
    }
  }

  function saveConsent(value) {
    state.consent = !!value;
    try {
      if (value) {
        localStorage.setItem(CONSENT_KEY, '1');
      } else {
        localStorage.removeItem(CONSENT_KEY);
      }
    } catch (err) {
      /* ignore persistence errors */
    }
  }

  function hasConsent() {
    if (state.consent) return true;
    try {
      return localStorage.getItem(CONSENT_KEY) === '1';
    } catch (err) {
      return false;
    }
  }

  function formatCount(count) {
    const safe = Number.isFinite(count) ? count : 0;
    return `${safe} ${safe === 1 ? 'talk' : 'talks'}`;
  }

  function uniqueYears(videos) {
    const set = new Set();
    videos.forEach(v => { if (Number.isInteger(v.year)) set.add(v.year); });
    return Array.from(set).sort((a, b) => b - a);
  }

  function buildCard(video, idx) {
    const card = document.createElement('article');
    card.className = 'video-card';
    card.dataset.videoId = video.videoId || '';
    card.dataset.embed = video.embedUrl || '';
    card.dataset.year = video.year ? String(video.year) : '';
    card.dataset.title = (video.title || '').toLowerCase();
    card.dataset.index = String(idx);

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'thumb-btn';
    btn.setAttribute('aria-label', `Play: ${video.title}`);

    const badge = document.createElement('span');
    badge.className = 'year-badge';
    badge.textContent = video.year ? String(video.year) : 'TEDxKI';
    btn.appendChild(badge);

    const img = document.createElement('img');
    img.className = 'thumb-img';
    img.src = video.thumbnail;
    img.alt = `${video.title} preview`;
    img.loading = 'lazy';
    img.decoding = 'async';
    btn.appendChild(img);

    const overlay = document.createElement('div');
    overlay.className = 'play-overlay';
    overlay.innerHTML = `
      <span class="spark" aria-hidden="true"></span>
      <span class="play-icon" aria-hidden="true">▶</span>
      <span class="play-label">Watch now</span>
    `;
    btn.appendChild(overlay);

    const meta = document.createElement('div');
    meta.className = 'meta';
    const title = document.createElement('div');
    title.className = 'title';
    title.textContent = video.title;
    const sub = document.createElement('div');
    sub.className = 'meta-sub';
    sub.innerHTML = video.year ? `${BRAND_HTML} • ${video.year}` : BRAND_HTML;
    meta.appendChild(title);
    meta.appendChild(sub);

    card.appendChild(btn);
    card.appendChild(meta);
    return card;
  }

  function ensureCards() {
    if (!grid || state.videos.length === 0) return;
    const existing = grid.querySelector('.video-card');
    if (existing) {
      cards = $$('.video-card', grid);
      return;
    }
    const frag = document.createDocumentFragment();
    state.videos.forEach((video, idx) => frag.appendChild(buildCard(video, idx)));
    grid.appendChild(frag);
    cards = $$('.video-card', grid);
  }

  function populateYearFilter() {
    if (!yearFilter) return;
    const years = state.years.length ? state.years : uniqueYears(state.videos);
    if (!years.length) return;

    yearFilter.innerHTML = '';
    const all = document.createElement('option');
    all.value = 'all';
    all.textContent = 'All years';
    yearFilter.appendChild(all);

    years.forEach(year => {
      const opt = document.createElement('option');
      opt.value = String(year);
      opt.textContent = String(year);
      yearFilter.appendChild(opt);
    });
  }

  function updateHeroMeta() {
    if (talkCount) talkCount.textContent = formatCount(state.videos.length);
    const years = state.years.length ? state.years : uniqueYears(state.videos);
    if (yearRange && years.length) {
      const max = Math.max(...years);
      const min = Math.min(...years);
      yearRange.textContent = min === max ? `TEDxKI ${max}` : `TEDxKI ${min}–${max}`;
    }
  }

  function updateResultCount(count) {
    if (resultCount) resultCount.textContent = formatCount(count);
  }

  function filterCards() {
    const query = (searchInput?.value || '').trim().toLowerCase();
    const yearVal = yearFilter?.value || 'all';
    let visible = 0;

    cards.forEach(card => {
      const title = card.dataset.title || '';
      const matchesTitle = query ? title.includes(query) : true;
      const matchesYear = yearVal === 'all' || card.dataset.year === yearVal;
      const show = matchesTitle && matchesYear;
      card.hidden = !show;
      if (show) visible += 1;
    });

    if (emptyState) emptyState.hidden = visible > 0 || cards.length === 0;
    if (grid) grid.dataset.state = visible > 0 ? 'has-results' : 'no-results';
    updateResultCount(visible);
  }

  function resetFilters() {
    if (searchInput) searchInput.value = '';
    if (yearFilter) yearFilter.value = 'all';
    filterCards();
  }

  function getVisibleCards() {
    return cards.filter(card => !card.hidden);
  }

  function highlightCard(card) {
    if (!card) return;
    card.classList.add('surprise');
    setTimeout(() => card.classList.remove('surprise'), 850);
  }

  function getVideoFromCard(card) {
    if (!card) return null;
    const id = card.dataset.videoId;
    if (id && state.videoById.has(id)) return state.videoById.get(id);
    return {
      title: card.querySelector('.title')?.textContent?.trim() || 'TEDxKI talk',
      year: Number.parseInt(card.dataset.year, 10) || null,
      videoId: id || '',
      embedUrl: card.dataset.embed || '',
    };
  }

  function lockScroll(enable) {
    document.documentElement.style.overflow = enable ? 'hidden' : '';
  }

  function openModal(video) {
    if (!modal || !playerWrap || !video?.embedUrl) return;
    const src = video.embedUrl.includes('autoplay=')
      ? video.embedUrl
      : `${video.embedUrl}${video.embedUrl.includes('?') ? '&' : '?'}autoplay=1`;

    playerWrap.innerHTML = '';
    const iframe = document.createElement('iframe');
    iframe.src = src;
    iframe.title = video.title || 'TEDxKI talk';
    iframe.loading = 'lazy';
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    iframe.referrerPolicy = 'strict-origin-when-cross-origin';
    iframe.allowFullscreen = true;
    playerWrap.appendChild(iframe);

    if (modalTitle) modalTitle.textContent = video.title || 'TEDxKI talk';
    if (playerSub) playerSub.innerHTML = video.year ? `${BRAND_HTML} • ${video.year}` : BRAND_HTML;

    modal.setAttribute('aria-hidden', 'false');
    lockScroll(true);
    setTimeout(() => modalClose?.focus(), 80);
  }

  function closeModal() {
    if (!modal) return;
    modal.setAttribute('aria-hidden', 'true');
    playerWrap.innerHTML = '';
    lockScroll(false);
  }

  function openConsent() {
    if (!consentModal) return;
    consentModal.setAttribute('aria-hidden', 'false');
    lockScroll(true);
    setTimeout(() => consentAccept?.focus(), 80);
  }

  function closeConsent({ clearPending = false } = {}) {
    if (!consentModal) return;
    consentModal.setAttribute('aria-hidden', 'true');
    lockScroll(false);
    if (clearPending) pendingVideo = null;
  }

  function requestPlay(video) {
    if (!video?.embedUrl) return;
    if (hasConsent()) {
      saveConsent(true);
      openModal(video);
      return;
    }
    pendingVideo = video;
    openConsent();
  }

  function handleCardClick(event) {
    const btn = event.target.closest('.thumb-btn');
    if (!btn) return;
    const card = btn.closest('.video-card');
    if (!card) return;
    const video = getVideoFromCard(card);
    requestPlay(video);
  }

  function handleSurprise() {
    const candidates = getVisibleCards();
    const list = candidates.length ? candidates : cards;
    if (!list.length) return;
    const pick = list[Math.floor(Math.random() * list.length)];
    highlightCard(pick);
    pick.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => {
      const video = getVideoFromCard(pick);
      requestPlay(video);
    }, 320);
  }

  function handleConsentAccept() {
    saveConsent(true);
    closeConsent();
    if (pendingVideo) {
      openModal(pendingVideo);
      pendingVideo = null;
    }
  }

  function handleConsentDecline() {
    closeConsent({ clearPending: true });
  }

  function bindEvents() {
    if (grid) grid.addEventListener('click', handleCardClick);
    searchInput?.addEventListener('input', filterCards);
    yearFilter?.addEventListener('change', filterCards);
    resetBtn?.addEventListener('click', resetFilters);
    clearEmptyBtn?.addEventListener('click', resetFilters);
    surpriseBtn?.addEventListener('click', handleSurprise);
    openConsentBtn?.addEventListener('click', () => openConsent());

    modalBackdrop?.addEventListener('click', closeModal);
    modalClose?.addEventListener('click', closeModal);
    consentBackdrop?.addEventListener('click', () => closeConsent({ clearPending: true }));
    consentClose?.addEventListener('click', () => closeConsent({ clearPending: true }));
    consentAccept?.addEventListener('click', handleConsentAccept);
    consentDecline?.addEventListener('click', handleConsentDecline);

    window.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape') {
        if (consentModal?.getAttribute('aria-hidden') === 'false') {
          closeConsent({ clearPending: true });
        } else if (modal?.getAttribute('aria-hidden') === 'false') {
          closeModal();
        }
      }
    });
  }

  function initSupercut() {
    if (!supercut) return;
    supercut.autoplay = true;
    supercut.muted = true;
    supercut.playsInline = true;
    supercut.setAttribute('playsinline', '');
    supercut.setAttribute('webkit-playsinline', '');

    const tryPlay = () => {
      try { supercut.play().catch(() => {}); } catch (e) {}
      supercut.style.opacity = '0.98';
    };

    supercut.addEventListener('canplay', tryPlay, { once: true });

    // iOS may require a user gesture; fall back to first interaction
    const unlock = () => {
      tryPlay();
      window.removeEventListener('touchstart', unlock, true);
      window.removeEventListener('click', unlock, true);
    };
    window.addEventListener('touchstart', unlock, true);
    window.addEventListener('click', unlock, true);
  }

  function bootstrap() {
    const payload = readPayload();
    state.videos = Array.isArray(payload.videos) ? payload.videos : [];
    state.years = Array.isArray(payload.years) ? payload.years : [];
    state.videoById = new Map(state.videos.map(video => [video.videoId, video]));
    state.consent = hasConsent();

    ensureCards();
    populateYearFilter();
    updateHeroMeta();
    bindEvents();
    filterCards();
    initSupercut();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }
})();
