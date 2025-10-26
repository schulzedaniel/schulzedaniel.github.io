// team.js – Final Version
// Features:
// - Scroll reveal animation for cards + title/intro
// - Dynamic sizing of team hero (image + rectangle alignment)
// - No parallax or cross-feature interference

(() => {
  'use strict';

  /* ---------- Reveal animation ---------- */
  const revealOpts = {
    root: null,
    rootMargin: '0px 0px -8% 0px',
    threshold: 0.12
  };

  const revealObserver = new IntersectionObserver((entries, obs) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const el = entry.target;

      if (el.classList.contains('portrait-wrap')) {
        el.classList.add('revealed');
      } else {
        el.classList.add('is-visible');
      }
      obs.unobserve(el);
    }
  }, revealOpts);

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.portrait-wrap').forEach(n => revealObserver.observe(n));
    document.querySelectorAll('.animate-once').forEach(n => revealObserver.observe(n));
  });

  /* ---------- Hero sizing ---------- */
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