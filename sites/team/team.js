// team.js – Smooth reveal (double-rAF commit) + hero sizing
(() => {
  'use strict';

  /* ---------- Reveal animation (smooth + decoded) ---------- */
  const io = new IntersectionObserver((entries, obs) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const el = entry.target;

      const kickoff = () => {
        // 0) mark as animating (GPU hint)
        el.classList.add('animating');

        // 1) apply initial state class this frame
        el.classList.add('pre-reveal');

        // 2) next frame: allow styles to commit
        requestAnimationFrame(() => {
          // 3) then add the final state with a tiny stagger
          const idx = Number(el.dataset.revealIndex || 0);
          const delay = Math.min(420, 40 + idx * 22);
          setTimeout(() => {
            if (el.classList.contains('portrait-wrap')) {
              el.classList.add('revealed');
            } else {
              el.classList.add('is-visible');
            }
            // cleanup GPU hint after transition
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
    // start earlier so decoding can finish and the pre-state can commit
    rootMargin: '200px 0px 140px 0px',
    threshold: 0.01
  });

  document.addEventListener('DOMContentLoaded', () => {
    // stable indices for stagger
    let i = 0;
    document.querySelectorAll('.portrait-wrap').forEach(n => {
      n.dataset.revealIndex = i++;
      io.observe(n);
    });
    document.querySelectorAll('.animate-once').forEach(n => io.observe(n));
  });

  /* ---------- Hero sizing (unchanged) ---------- */
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
})();