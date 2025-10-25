// team.js - Reveal animations + team-showcase sizing helper
(() => {
  'use strict';

  /* ---------- Reveal once for full card (IntersectionObserver) ---------- */
  const revealOpts = {
    root: null,
    rootMargin: '0px 0px -8% 0px',
    threshold: 0.12
  };

  const revealObserver = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;

      const el = entry.target;

      if (el.classList.contains('portrait-wrap')) {
        // reveal entire card (image + label + icon)
        el.classList.add('revealed');
      } else {
        // title/intro items and any other animate-once
        el.classList.add('is-visible');
      }

      // stop observing this element (once-only)
      obs.unobserve(el);
    });
  }, revealOpts);

  // Observe portrait-wraps and any .animate-once items (title/intro)
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.portrait-wrap').forEach(n => revealObserver.observe(n));
    document.querySelectorAll('.animate-once').forEach(n => revealObserver.observe(n));
  });


  /* ---------- team-showcase sizing helper ----------
     Ensures:
      - .team-stack height = image height (so title/text sit beneath)
      - .team-bg-rect height = imageHeight * (1 - overhangFraction)
     This keeps the bottoms of image and rect exactly aligned (both bottom:0).
  */
  function initTeamShowcaseSizing() {
    const showcase = document.querySelector('.team-showcase');
    if (!showcase) return;

    const stack = showcase.querySelector('.team-stack');
    const imgWrap = stack && stack.querySelector('.team-image-wrap');
    const img = imgWrap && imgWrap.querySelector('.team-image');
    const rect = stack && stack.querySelector('.team-bg-rect');

    // read CSS custom property if set, otherwise fallback to 0.20
    let OVERHANG_F = 0.20;
    try {
      const v = getComputedStyle(showcase).getPropertyValue('--overhang-f');
      if (v) OVERHANG_F = parseFloat(v) || OVERHANG_F;
    } catch (e) { /* ignore */ }

    if (!stack || !img || !rect) return;

    // recompute stack and rect heights based on current image layout
    function recompute() {
      // measure displayed image height
      const imgBounds = img.getBoundingClientRect();
      const imgH = Math.round(imgBounds.height);

      if (!imgH || imgH < 8) {
        // image not loaded or too small — skip
        return;
      }

      // set stack height equal to image height so the title sits directly under the visual block
      stack.style.height = imgH + 'px';

      // set rectangle height so rect = imageH * (1 - f)
      const rectH = Math.max(8, Math.round(imgH * (1 - OVERHANG_F)));
      rect.style.height = rectH + 'px';
    }

    // wait for the image to load (handles cached images too)
    if (!img.complete) {
      img.addEventListener('load', () => {
        requestAnimationFrame(recompute);
      }, { once: true });
    } else {
      // if already loaded, compute on next frame
      requestAnimationFrame(recompute);
    }

    // recompute on window resize (rAF debounced)
    let rafId = null;
    function onResize() {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        recompute();
        rafId = null;
      });
    }
    window.addEventListener('resize', onResize, { passive: true });
  }

  // init sizing on DOM ready
  document.addEventListener('DOMContentLoaded', () => {
    initTeamShowcaseSizing();
  });

  // also attempt a second init shortly after in case images/fonts change layout
  setTimeout(() => {
    initTeamShowcaseSizing();
  }, 500);

  /* ---------- Clean exit: no parallax, no hero-media positioners ---------- */
  // Note: old parallax / hero positioning code was intentionally removed.
  // If you have other scripts that still reference `.hero-media`, `.hero-img`, `.accent-rect`,
  // please remove/guard them (they conflict with the team-showcase approach).

})();

  