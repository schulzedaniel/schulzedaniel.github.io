// team.js – Smooth reveal + hero sizing + responsive masonry balancing
(() => {
  'use strict';

  /* =========================================================
     1) SMOOTH REVEAL (double-rAF pre-state + decode)
     ========================================================= */
  const io = new IntersectionObserver((entries, obs) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const el = entry.target;

      const kickoff = () => {
        el.classList.add('animating');
        el.classList.add('pre-reveal');

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
  });

  document.addEventListener('DOMContentLoaded', () => {
    // Indizes für stabile Staffelung
    let i = 0;
    document.querySelectorAll('.portrait-wrap').forEach(n => {
      n.dataset.revealIndex = i++;
      io.observe(n);
    });
    document.querySelectorAll('.animate-once').forEach(n => io.observe(n));
  });

  /* =========================================================
     2) HERO SIZING (unverändert)
     ========================================================= */
  function initTeamShowcaseSizing() {
    const showcase = document.querySelector('.team-showcase');
    if (!showcase) return;

    const stack = showcase.querySelector('.team-stack');
    const imgWrap = stack?.querySelector('.team-image-wrap');
    const img = imgWrap?.querySelector('.team-image');
    const rect = stack?.querySelector('.team-bg-rect');
    if (!stack || !img || !rect) return;

    let OVERHANG_F = 0.20;
    const cssVal = getComputedStyle(showcase).getPropertyValue('--overhang-f');
    if (cssVal) OVERHANG_F = parseFloat(cssVal) || OVERHANG_F;

    function recompute() {
      const imgH = img.getBoundingClientRect().height;
      if (!imgH || imgH < 8) return;
      stack.style.height = imgH + 'px';
      rect.style.height = Math.max(8, Math.round(imgH * (1 - OVERHANG_F))) + 'px';
    }

    if (!img.complete) img.addEventListener('load', () => requestAnimationFrame(recompute), { once: true });
    else requestAnimationFrame(recompute);

    let rafId;
    function onResize() {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(recompute);
    }
    window.addEventListener('resize', onResize, { passive: true });
  }

  document.addEventListener('DOMContentLoaded', initTeamShowcaseSizing);
  setTimeout(initTeamShowcaseSizing, 500);


  /* =========================================================
     3) RESPONSIVE MASONRY BALANCING
        - Unterstützt mehrere Grids (je Team-Sektion)
        - Immer mindestens 2 Spalten auch auf kleinen Screens
     ========================================================= */
  const mq4 = window.matchMedia('(min-width: 1201px)'); // 4 Spalten
  const mq3 = window.matchMedia('(min-width: 901px) and (max-width: 1200px)'); // 3

  function targetCols() {
    if (mq4.matches) return 4;
    if (mq3.matches) return 3;
    return 2; // Mobile bleibt zweispaltig
  }

  function collectCards(colsWrap) {
    const cards = [];
    colsWrap.querySelectorAll('.col').forEach(col => {
      col.querySelectorAll('.team-card').forEach(card => cards.push(card));
    });
    return cards;
  }

  function buildCols(colsWrap, n) {
    colsWrap.innerHTML = '';
    for (let i = 1; i <= n; i++) {
      const col = document.createElement('div');
      col.className = `col col-${i}`;
      colsWrap.appendChild(col);
    }
  }

  function appendToShortest(colsWrap, card) {
    const columns = Array.from(colsWrap.querySelectorAll('.col'));
    if (!columns.length) return;
    let minIdx = 0;
    let minH = columns[0].clientHeight;
    for (let i = 1; i < columns.length; i++) {
      const h = columns[i].clientHeight;
      if (h < minH) { minH = h; minIdx = i; }
    }
    columns[minIdx].appendChild(card);
  }

  function relayoutGrid(state) {
    const want = targetCols();
    if (!state || !state.colsWrap) return;
    if (want === state.lastCols) return;

    const cards = collectCards(state.colsWrap);
    buildCols(state.colsWrap, want);

    requestAnimationFrame(() => {
      cards.forEach(card => appendToShortest(state.colsWrap, card));
    });

    state.lastCols = want;
  }

  function bindMasonry() {
    const states = Array.from(document.querySelectorAll('.team-grid .cols')).map(colsWrap => ({
      colsWrap,
      lastCols: -1
    }));
    if (!states.length) return;

    const relayoutAll = () => states.forEach(relayoutGrid);

    // Kleines Timeout damit Fonts etc. gelayoutet sind
    setTimeout(relayoutAll, 0);

    // Debounced resize
    let resizeTO;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTO);
      resizeTO = setTimeout(relayoutAll, 100);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindMasonry);
  } else {
    bindMasonry();
  }

})();
