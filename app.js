/* app.js (update)
 - robust single-run typing
 - temporary theme toggle (no persistence)
 - mobile menu fix (hamburger)
 - marquee: autoplay, click-to-pause, second-click -> sponsors.html
 - social strip: hover expands labels (CSS), no JS necessary beyond accessibility
*/

(() => {
  // --- Guard against re-init ---
  if (window.__appInitialized) return;
  window.__appInitialized = true;

  // --- Typing (single, robust) ---
  const line1 = document.getElementById('line1');
  const line2 = document.getElementById('line2');
  const phrases = ["Spread science,", "connect the world."];
  const typingSpeed = 45;
  const pauseBetweenLines = 300;
  let typed = false;

  const sleep = ms => new Promise(r => setTimeout(r, ms));

  async function typeLine(el, text) {
    el.textContent = '';
    for (let i = 0; i < text.length; i++) {
      el.textContent += text[i];
      await sleep(typingSpeed);
    }
  }

  async function startTyping() {
    if (typed || !line1 || !line2) return;
    typed = true;
    await typeLine(line1, phrases[0]);
    await sleep(pauseBetweenLines);
    await typeLine(line2, phrases[1]);
  }

  window.addEventListener('load', startTyping, { once: true });

  // --- Theme toggle (temporary only) ---
  const toggle = document.getElementById('theme-toggle');
  const root = document.documentElement;
  if (toggle) {
    toggle.addEventListener('click', () => {
      const isDark = root.getAttribute('data-theme') === 'dark';
      if (isDark) root.removeAttribute('data-theme');
      else root.setAttribute('data-theme', 'dark');
      // Update aria-pressed
      toggle.setAttribute('aria-pressed', String(!isDark));
    });
  }

  // --- Mobile hamburger menu fix ---
  const hamburger = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobileMenu');
  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', (e) => {
      const open = hamburger.getAttribute('aria-expanded') === 'true';
      hamburger.setAttribute('aria-expanded', String(!open));
      mobileMenu.hidden = open;
    });
    // ensure clicking outside closes it
    document.addEventListener('click', (e) => {
      if (!mobileMenu.hidden && !mobileMenu.contains(e.target) && !hamburger.contains(e.target)) {
        mobileMenu.hidden = true;
        hamburger.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // --- Social strip: ensure keyboard focus also expands labels (accessibility) ---
  const socialStrip = document.getElementById('socialStrip');
  if (socialStrip) {
    socialStrip.addEventListener('touchstart', () => {
      socialStrip.classList.add('touch-active');
      // remove after short timeout to allow quick tap behavior
      setTimeout(() => socialStrip.classList.remove('touch-active'), 3000);
    }, { passive: true });
  }

  // --- Marquee: autoplay + click-to-pause + second-click -> sponsors.html ---
  const marquee = document.getElementById('marquee');
  const marqueeTrack = document.getElementById('marqueeTrack');
  if (marquee && marqueeTrack) {
    let auto = true;
    let isDragging = false;
    let startX = 0, prevTranslate = 0, currTranslate = 0;
    let animFrame = null;
    const speed = 0.5; // px per rAF step approx
    let resumeTimer = null;

    // animation step
    function step() {
      if (!isDragging && auto) {
        const half = marqueeTrack.scrollWidth / 2 || 1;
        currTranslate -= speed;
        if (Math.abs(currTranslate) >= half) currTranslate += half;
        marqueeTrack.style.transform = `translate3d(${currTranslate}px,0,0)`;
      }
      animFrame = requestAnimationFrame(step);
    }
    animFrame = requestAnimationFrame(step);

    // drag handlers
    function onPointerDown(e) {
      isDragging = true;
      startX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
      prevTranslate = currTranslate;
      // stop auto immediately
      auto = false;
      clearTimeout(resumeTimer);
    }
    function onPointerMove(e) {
      if (!isDragging) return;
      const x = e.clientX || (e.touches && e.touches[0].clientX) || 0;
      const dx = x - startX;
      currTranslate = prevTranslate + dx;
      marqueeTrack.style.transform = `translate3d(${currTranslate}px,0,0)`;
    }
    function onPointerUp() {
      if (!isDragging) return;
      isDragging = false;
      // resume after 5s
      resumeTimer = setTimeout(() => { auto = true; }, 5000);
    }

    marquee.addEventListener('pointerdown', onPointerDown, { passive: true });
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerup', onPointerUp, { passive: true });

    // Click-to-pause + second click -> sponsors.html
    let clickedOnce = false;
    marquee.addEventListener('click', (e) => {
      // if drag, ignore click (prevents false click)
      if (isDragging) return;
      if (!clickedOnce) {
        // first click = pause
        auto = false;
        clickedOnce = true;
        clearTimeout(resumeTimer);
        // resume auto after 30s if no further action (fallback)
        resumeTimer = setTimeout(() => { auto = true; clickedOnce = false; }, 30000);
      } else {
        // second click: go to sponsors page
        window.location.href = 'sponsors.html';
      }
    });

    // ensure cleanup on unload
    window.addEventListener('beforeunload', () => {
      cancelAnimationFrame(animFrame);
      clearTimeout(resumeTimer);
    });
  }

  // --- Footer year ---
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

})();
