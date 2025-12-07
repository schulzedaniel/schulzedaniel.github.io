/* app.js — Updated: hero reveal + marquee drag/pause/click behavior
   - Theme toggle (explicit data-theme 'light'|'dark')
   - Accessible hamburger / mobile menu
   - Safe per-character typing that supports HTML tags (no innerHTML slicing)
   - Reserve exact mask heights before typing to avoid layout shifts
   - Hero reveal is visible (adds .revealed before typing and awaits completion)
   - Robust continuous marquee:
     * clones sets to create seamless loop
     * pointer drag left/right to manually move; on release pause 3s then resume
     * click (no drag) navigates to sponsors.html
     * no pause on hover, no lift on hover
   - Contact form example (POST to data-form-endpoint)
   - Scroll-fade IntersectionObserver
   - Small util: current year rendering
*/

(function () {
  'use strict';

  /* ---------------- THEME (explicit + persistent) ---------------- */
  (function () {
    const root = document.documentElement;
    const themeToggle = document.getElementById('theme-toggle');
    const mobileThemeToggle = document.getElementById('mobile-theme-toggle');

    function setTheme(mode) {
      if (mode === 'dark') {
        root.setAttribute('data-theme', 'dark');
        localStorage.setItem('site-theme', 'dark');
        if (themeToggle) themeToggle.setAttribute('aria-pressed', 'true');
        if (mobileThemeToggle) mobileThemeToggle.setAttribute('aria-pressed', 'true');
      } else {
        root.setAttribute('data-theme', 'light');
        localStorage.setItem('site-theme', 'light');
        if (themeToggle) themeToggle.setAttribute('aria-pressed', 'false');
        if (mobileThemeToggle) mobileThemeToggle.setAttribute('aria-pressed', 'false');
      }
    }

    function toggleTheme() {
      const current = root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
      setTheme(current === 'dark' ? 'light' : 'dark');
    }

    // Initialize theme state (inline head script should already set explicit state)
    (function initTheme() {
      try {
        const attr = document.documentElement.getAttribute('data-theme');
        if (attr === 'dark' || attr === 'light') {
          if (!localStorage.getItem('site-theme')) localStorage.setItem('site-theme', attr);
        } else {
          const saved = localStorage.getItem('site-theme');
          if (saved === 'dark' || saved === 'light') {
            document.documentElement.setAttribute('data-theme', saved);
          } else {
            const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
            document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
            localStorage.setItem('site-theme', prefersDark ? 'dark' : 'light');
          }
        }
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        if (themeToggle) themeToggle.setAttribute('aria-pressed', String(isDark));
        if (mobileThemeToggle) mobileThemeToggle.setAttribute('aria-pressed', String(isDark));
      } catch (e) { /* ignore */ }
    })();

    if (themeToggle) themeToggle.addEventListener('click', toggleTheme);
    if (mobileThemeToggle) mobileThemeToggle.addEventListener('click', toggleTheme);
  })();

  /* ---------------- HAMBURGER / MOBILE MENU ---------------- */
  (function () {
    const hamburger = document.getElementById('hamburger');
    const mobileMenu = document.getElementById('mobileMenu');
    const mobileClose = document.getElementById('mobileClose');
    if (!hamburger || !mobileMenu) return;

    function openMenu() {
      hamburger.classList.add('open');
      mobileMenu.classList.add('open');
      hamburger.setAttribute('aria-expanded', 'true');
      mobileMenu.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    }
    function closeMenu() {
      hamburger.classList.remove('open');
      mobileMenu.classList.remove('open');
      hamburger.setAttribute('aria-expanded', 'false');
      mobileMenu.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }

    hamburger.addEventListener('click', () => {
      if (hamburger.classList.contains('open')) closeMenu(); else openMenu();
    });
    mobileClose && mobileClose.addEventListener('click', closeMenu);
    mobileMenu.addEventListener('click', (e) => { if (e.target && e.target.tagName === 'A') closeMenu(); });
    document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') closeMenu(); });
  })();



  /* ---------------- SCROLL FADE ---------------- */
  (function () {
    const els = document.querySelectorAll('.scroll-fade');
    if (!els.length) return;
    const obs = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    els.forEach(el => obs.observe(el));
  })();

  /* ---------------- MARQUEE: seamless loop + pointer drag + 3s pause + click -> sponsors ----------------
     Behavior:
     - The marquee is animated by requestAnimationFrame moving 'offset' (px).
     - ensureSets() groups existing logos into one .marquee-set and clones it (track contains two sets).
     - Pointer interactions:
        * pointerdown + pointermove -> consider as drag when horizontal movement > threshold
        * if drag occurred: marquee pauses and follows pointer movement
        * on pointerup: if it was a click (no significant drag) => navigate to sponsors.html
                    if it was a drag => pause for 3000ms then resume automated animation
     - No pause on hover; no lift on hover for marquee (CSS should not add hover-lift)
  */
  (function () {
    const marquee = document.getElementById('marquee');
    const track = document.getElementById('marqueeTrack');
    if (!marquee || !track) return;

    function ensureSets() {
      const existingSet = track.querySelector('.marquee-set');
      if (existingSet) {
        const sets = track.querySelectorAll('.marquee-set');
        if (sets.length < 2) track.appendChild(existingSet.cloneNode(true));
        return;
      }
      const children = Array.from(track.children);
      // create a marquee-set container and move children into it
      const set = document.createElement('div');
      set.className = 'marquee-set';
      children.forEach(ch => set.appendChild(ch));
      // ensure .marquee-track has no extra whitespace nodes; append two sets
      track.appendChild(set);
      track.appendChild(set.cloneNode(true));
    }

    ensureSets();

    // compute width of a single set (first)
    function getSetWidth() {
      const first = track.querySelector('.marquee-set');
      return first ? first.getBoundingClientRect().width : Math.max(1, track.getBoundingClientRect().width / 2);
    }

    // animation state
    let setWidth = 0;
    let offset = 0;         // px moved leftwards
    let lastTs = null;
    let rafId = null;
    let speed = 0.06;       // px per ms (tweak)
    let autoRunning = true; // whether auto animation is active
    let resumeTimer = null;

    // pointer drag state
    let dragging = false;
    let pointerId = null;
    let startX = 0;
    let lastX = 0;
    let moved = 0;          // total moved distance
    const DRAG_THRESHOLD = 6;     // px to distinguish click from drag
    const RESUME_DELAY = 3000;    // ms to resume after drag

    // main RAF step for auto animation
    function step(ts) {
      if (!lastTs) lastTs = ts;
      const dt = ts - lastTs;
      lastTs = ts;
      if (autoRunning) {
        offset += speed * dt;
        if (setWidth && offset >= setWidth) offset = offset % setWidth;
        track.style.transform = `translateX(${-offset}px)`;
      } else {
        // if not autoRunning but not dragging, still apply transform based on offset (so manual set persists)
        track.style.transform = `translateX(${-offset}px)`;
      }
      rafId = requestAnimationFrame(step);
    }

    function startAuto() {
      autoRunning = true;
      if (!rafId) { lastTs = null; rafId = requestAnimationFrame(step); }
    }
    function stopAuto() {
      autoRunning = false;
    }

    // initialize
    function init() {
      setWidth = getSetWidth() || 1;
      offset = offset % (setWidth || 1);
      lastTs = null;
      if (!rafId) rafId = requestAnimationFrame(step);
    }

    // handle pointer interactions (works for mouse and touch)
    function onPointerDown(e) {
      // only respond to main button / primary pointer
      if (e.isPrimary === false) return;
      // prevent text selection
      e.preventDefault();

      // start capturing pointer
      const p = e;
      pointerId = p.pointerId;
      marquee.setPointerCapture(pointerId);

      dragging = false;
      startX = lastX = p.clientX;
      moved = 0;

      // stop automatic animation while interacting
      stopAuto();
    }

    function onPointerMove(e) {
      if (pointerId == null || e.pointerId !== pointerId) return;
      const p = e;
      const dx = p.clientX - lastX;
      lastX = p.clientX;
      moved += Math.abs(dx);

      // if user has moved enough, enter dragging mode
      if (!dragging && Math.abs(p.clientX - startX) > DRAG_THRESHOLD) dragging = true;

      if (dragging) {
        // update offset according to pointer movement:
        // pointer moved right (dx>0) => shift content right => decrease offset
        offset = offset - dx;
        // normalize offset so it remains within [0,setWidth)
        if (setWidth) offset = (offset % setWidth + setWidth) % setWidth;
        // apply transform immediately
        track.style.transform = `translateX(${-offset}px)`;
      }
    }

    function onPointerUp(e) {
      if (pointerId == null || e.pointerId !== pointerId) return;
      const p = e;
      // release capture
      try { marquee.releasePointerCapture(pointerId); } catch(_) {}
      pointerId = null;

      // if it was a drag (moved beyond threshold), pause for RESUME_DELAY then resume
      if (dragging) {
        // schedule resume
        if (resumeTimer) { clearTimeout(resumeTimer); resumeTimer = null; }
        resumeTimer = setTimeout(() => {
          startAuto();
          resumeTimer = null;
        }, RESUME_DELAY);
        dragging = false;
        return;
      }

      // if not dragging (a click), navigate to sponsors page
      // Make sure the click wasn't a tiny accidental move by verifying moved < threshold
      if (moved < DRAG_THRESHOLD) {
        // navigate (relative)
        window.location.href = '/sites/sponsors/sponsors.html';
      } else {
        // tiny move but not considered dragging? schedule resume
        if (resumeTimer) { clearTimeout(resumeTimer); }
        resumeTimer = setTimeout(() => { startAuto(); resumeTimer = null; }, RESUME_DELAY);
      }
    }

    function onPointerCancel(e) {
      if (pointerId == null || e.pointerId !== pointerId) return;
      try { marquee.releasePointerCapture(pointerId); } catch(_) {}
      pointerId = null;
      dragging = false;
      if (resumeTimer) clearTimeout(resumeTimer);
      resumeTimer = setTimeout(() => { startAuto(); resumeTimer = null; }, RESUME_DELAY);
    }

    // Pause animation when tab hidden
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (rafId) cancelAnimationFrame(rafId);
        rafId = null;
      } else {
        lastTs = null;
        rafId = requestAnimationFrame(step);
      }
    });

    // recompute on resize
    let resizeTimer = null;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      cancelAnimationFrame(rafId);
      rafId = null;
      resizeTimer = setTimeout(() => {
        setWidth = getSetWidth();
        offset = offset % (setWidth || 1);
        lastTs = null;
        rafId = requestAnimationFrame(step);
      }, 120);
    });

    // Attach pointer events: pointerdown/move/up/cancel
    marquee.addEventListener('pointerdown', onPointerDown, { passive: false });
    marquee.addEventListener('pointermove', onPointerMove, { passive: false });
    marquee.addEventListener('pointerup', onPointerUp);
    marquee.addEventListener('pointercancel', onPointerCancel);

    // Start
    init();
  })();

  /* ---------------- CONTACT FORM (example) ---------------- */
  (function () {
    const form = document.getElementById('contactForm');
    const status = document.getElementById('formStatus');
    if (!form) return;

    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      status.hidden = false;
      status.textContent = 'Sending…';
      const endpoint = form.getAttribute('data-form-endpoint') || '';
      const formData = new FormData(form);
      const payload = Object.fromEntries(formData.entries());
      const submitBtn = form.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.setAttribute('aria-busy', 'true');

      try {
        if (!endpoint) {
          status.textContent = 'No endpoint configured. Please set data-form-endpoint.';
          submitBtn.disabled = false;
          submitBtn.removeAttribute('aria-busy');
          return;
        }
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          status.textContent = 'Message sent — thank you!';
          form.reset();
        } else {
          const txt = await res.text();
          status.textContent = 'Failed to send. Try again later.';
          console.error('Form error', res.status, txt);
        }
      } catch (err) {
        console.error('Form exception', err);
        status.textContent = 'Network error. Please try again later.';
      } finally {
        submitBtn.disabled = false;
        submitBtn.removeAttribute('aria-busy');
      }
    });
  })();

  /* ---------------- YEAR UTILITY ---------------- */
  (function () {
    const el = document.getElementById('year');
    if (el) el.textContent = new Date().getFullYear();
  })();




})();
