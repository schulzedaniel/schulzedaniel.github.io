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
        - Liest gewünschte Spaltenanzahl aus Breakpoints aus
        - Verteilt Karten in jeweils kürzeste Spalte (height-based)
        - Reflow nur wenn sich die Spaltenanzahl ändert
     ========================================================= */
  const colsWrap = document.querySelector('.team-grid .cols');
  if (!colsWrap) return;

  // Breakpoints -> Ziel-Spalten
  const mq4 = window.matchMedia('(min-width: 1201px)'); // 4 Spalten
  const mq3 = window.matchMedia('(min-width: 901px) and (max-width: 1200px)'); // 3
  const mq2a = window.matchMedia('(min-width: 641px) and (max-width: 900px)'); // 2
  const mq2b = window.matchMedia('(max-width: 640px) and (min-width: 421px)');  // 2
  const mq1 = window.matchMedia('(max-width: 420px)'); // 1

  function targetCols() {
    if (mq4.matches) return 4;
    if (mq3.matches) return 3;
    if (mq2a.matches || mq2b.matches) return 2;
    if (mq1.matches) return 1;
    return 4;
  }

  // Alle Cards einsammeln (egal in welcher Spalte sie aktuell stecken)
  function collectCards() {
    const cards = [];
    colsWrap.querySelectorAll('.col').forEach(col => {
      col.querySelectorAll('.team-card').forEach(card => cards.push(card));
    });
    return cards;
  }

  // Spaltencontainer neu aufbauen
  function buildCols(n) {
    colsWrap.innerHTML = '';
    for (let i = 1; i <= n; i++) {
      const col = document.createElement('div');
      col.className = `col col-${i}`;
      colsWrap.appendChild(col);
    }
  }

  // Hilfsfunktion: aktuelle Spaltenhöhen messen (Summe der Card-Höhen)
  function colHeights() {
    return Array.from(colsWrap.querySelectorAll('.col')).map(col => {
      // clientHeight reicht; Cards haben feste aspect-ratio -> stabile Höhen
      return col.clientHeight;
    });
  }

  // Karte in die kürzeste Spalte stecken
  function appendToShortest(card) {
    const columns = Array.from(colsWrap.querySelectorAll('.col'));
    let minIdx = 0;
    let minH = columns[0].clientHeight;
    for (let i = 1; i < columns.length; i++) {
      const h = columns[i].clientHeight;
      if (h < minH) { minH = h; minIdx = i; }
    }
    columns[minIdx].appendChild(card);
  }

  let lastCols = -1;
  function relayoutIfNeeded() {
    const want = targetCols();
    if (want === lastCols) return;

    const cards = collectCards();
    buildCols(want);

    // Re-insert with balancing (kürzeste Spalte zuerst), in DOM-Reihenfolge
    // Tipp: rAF erlaubt Layout-Batch
    requestAnimationFrame(() => {
      cards.forEach(card => appendToShortest(card));
    });

    lastCols = want;
  }

  // Initiale Verteilung nach DOMContentLoaded, dann auf resize
  document.addEventListener('DOMContentLoaded', () => {
    // Kleines Timeout damit Fonts etc. gelayoutet sind
    setTimeout(relayoutIfNeeded, 0);
  });

  // Debounced resize
  let resizeTO;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTO);
    resizeTO = setTimeout(relayoutIfNeeded, 100);
  });

})();