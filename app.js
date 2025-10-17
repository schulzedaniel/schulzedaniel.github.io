/* app.js
   - theme toggle (uses images)
   - mobile hamburger toggle with accessible aria attributes
   - typing animation for hero with accent spans (science/connect match --accent)
   - continuous marquee animation via requestAnimationFrame (no jump)
   - contact form: example fetch to a server endpoint (see comments)
   - IntersectionObserver for .scroll-fade
*/

/* ========== THEME TOGGLE ========= */
(function () {
  const root = document.documentElement;
  const themeToggle = document.getElementById('theme-toggle');
  const mobileThemeToggle = document.getElementById('mobile-theme-toggle');

  function setTheme(isDark) {
    if (isDark) {
      root.setAttribute('data-theme', 'dark');
      themeToggle && themeToggle.setAttribute('aria-pressed', 'true');
      mobileThemeToggle && mobileThemeToggle.setAttribute('aria-pressed', 'true');
    } else {
      root.removeAttribute('data-theme');
      themeToggle && themeToggle.setAttribute('aria-pressed', 'false');
      mobileThemeToggle && mobileThemeToggle.setAttribute('aria-pressed', 'false');
    }
  }

  // initialize based on saved preference or system
  const saved = localStorage.getItem('site-theme');
  if (saved) {
    setTheme(saved === 'dark');
  } else {
    // use prefers-color-scheme if available
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    setTheme(prefersDark);
  }

  function toggleTheme() {
    const isDark = !!document.documentElement.getAttribute('data-theme');
    setTheme(!isDark);
    localStorage.setItem('site-theme', !isDark ? 'dark' : 'light');
  }

  themeToggle && themeToggle.addEventListener('click', toggleTheme);
  mobileThemeToggle && mobileThemeToggle.addEventListener('click', function () {
    toggleTheme();
    // keep the mobile menu open so user sees effect
  });
})();

/* ========== HAMBURGER / MOBILE MENU ========= */
(function () {
  const hamburger = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobileMenu');
  const mobileClose = document.getElementById('mobileClose');

  function openMenu() {
    hamburger.classList.add('open');
    mobileMenu.classList.add('open');
    hamburger.setAttribute('aria-expanded', 'true');
    mobileMenu.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden'; // prevent background scroll
  }
  function closeMenu() {
    hamburger.classList.remove('open');
    mobileMenu.classList.remove('open');
    hamburger.setAttribute('aria-expanded', 'false');
    mobileMenu.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  hamburger && hamburger.addEventListener('click', function () {
    if (hamburger.classList.contains('open')) closeMenu(); else openMenu();
  });

  mobileClose && mobileClose.addEventListener('click', closeMenu);

  // also close menu when clicking a link inside mobile menu
  mobileMenu && mobileMenu.addEventListener('click', (e) => {
    if (e.target.tagName === 'A') closeMenu();
  });

  // close ESC
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeMenu();
  });
})();

/* ========== TYPING ANIMATION (HERO) ========= */
(function () {
  const line1El = document.getElementById('line1');
  const line2El = document.getElementById('line2');

  // lines with accent words: 'science' and 'connect' wrapped in span.accent
  const lines = [
    'Spread <span class="accent">science</span>,',
    '<span class="accent">connect</span> the world.'
  ];

  const TYPING_SPEED = 36; // ms per char
  const LINE_PAUSE = 500;

  function typeLine(el, text, cb) {
    el.innerHTML = '';
    let i = 0;
    const plain = text;
    function step() {
      // we write HTML-safe by adding characters; because text contains tags, we add one char at a time to innerHTML
      el.innerHTML = plain.slice(0, i);
      i++;
      if (i <= plain.length) {
        setTimeout(step, TYPING_SPEED);
      } else {
        cb && setTimeout(cb, LINE_PAUSE);
      }
    }
    step();
  }

  function run() {
    typeLine(line1El, lines[0], () => {
      typeLine(line2El, lines[1], null);
    });
  }

  // re-run on theme change? keep simple: run once on load
  if (line1El && line2El) run();
})();

/* ========== SCROLL FADE (IntersectionObserver) ========= */
(function () {
  const els = document.querySelectorAll('.scroll-fade');
  if (!els.length) return;
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(en => {
      if (en.isIntersecting) {
        en.target.classList.add('visible');
        // optionally unobserve to keep it visible forever
        obs.unobserve(en.target);
      }
    });
  }, { threshold: 0.12 });
  els.forEach(el => obs.observe(el));
})();

/* ========== CONTINUOUS MARQUEE (smooth, no jump) ========= */
(function () {
  const marquee = document.getElementById('marquee');
  const track = document.getElementById('marqueeTrack');
  if (!marquee || !track) return;

  // ensure track content is duplicated if not already
  // we rely on the fact that the HTML already contains a duplicate. If not, clone.
  // compute width of first half (the base content)
  function ensureDuplicate() {
    // check if track children contain duplicates by comparing first 1 and next N
    const items = Array.from(track.children);
    if (items.length < 2) return;
    // if not duplicate (simple heuristic) clone all children and append
    const half = items.length / 2;
    if (half % 1 !== 0) return; // already odd; leave it
    let identical = true;
    for (let i = 0; i < half; i++) {
      const a = items[i].querySelector('img')?.getAttribute('src') || '';
      const b = items[i + half]?.querySelector('img')?.getAttribute('src') || '';
      if (a !== b) { identical = false; break; }
    }
    if (!identical) {
      // append clones to allow seamless loop
      const clones = items.map(it => it.cloneNode(true));
      clones.forEach(c => track.appendChild(c));
    }
  }
  ensureDuplicate();

  let speed = 0.12; // px per ms (tweak for faster/slower)
  let lastTime = null;
  let offset = 0;

  function getHalfWidth() {
    // compute width of half of the track (first unique set)
    const children = Array.from(track.children);
    // find a split: try to find duplicate pattern by comparing srcs
    let half = Math.floor(children.length / 2);
    if (half < 1) half = children.length;
    const widths = children.slice(0, half).reduce((w, el) => w + el.getBoundingClientRect().width + parseFloat(getComputedStyle(el).gap || 0), 0);
    return widths;
  }

  let halfWidth = getHalfWidth();

  // recompute sizes on resize
  window.addEventListener('resize', () => {
    halfWidth = getHalfWidth();
  });

  let rafId = null;
  function step(ts) {
    if (!lastTime) lastTime = ts;
    const dt = ts - lastTime;
    lastTime = ts;
    offset += speed * dt;
    if (!halfWidth) halfWidth = getHalfWidth() || 1;
    if (offset >= halfWidth) {
      // wrap without visual jump by using modulo
      offset = offset % halfWidth;
    }
    track.style.transform = `translateX(${-offset}px)`;
    rafId = requestAnimationFrame(step);
  }
  rafId = requestAnimationFrame(step);

  // pause/resume on click
  let paused = false;
  marquee.addEventListener('click', () => {
    paused = !paused;
    if (paused) {
      cancelAnimationFrame(rafId);
      rafId = null;
    } else {
      lastTime = null;
      rafId = requestAnimationFrame(step);
    }
  });

  // small performance: pause when tab is hidden
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = null;
    } else {
      if (!rafId) { lastTime = null; rafId = requestAnimationFrame(step); }
    }
  });
})();

/* ========== CONTACT FORM SUBMIT (example / recommended flow) ========= */
(function () {
  const form = document.getElementById('contactForm');
  const status = document.getElementById('formStatus');

  if (!form) return;

  // Important note:
  // - To send mail to a recipient address that is NOT visible in client-side source you need a server or serverless endpoint.
  // - Options:
  //    1) Use Formspree (serverless): you'll get an endpoint like https://formspree.io/f/xxxxx — however the endpoint itself will be present in the client.
  //    2) Best privacy: implement a small serverless function (e.g. Netlify Functions, Vercel Serverless, AWS Lambda) which holds the real recipient address as an environment variable. The client calls the function; the function sends the email. The recipient address is not in the static repo.
  // In this code we implement a client-side fetch to an endpoint referenced by data-form-endpoint attribute.
  // Replace data-form-endpoint or implement a serverless endpoint per above.

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    status.hidden = true;
    const endpoint = form.getAttribute('data-form-endpoint') || ''; // <<< set this in HTML or replace with your server endpoint
    const data = new FormData(form);
    const payload = Object.fromEntries(data.entries());

    // local validation can be extended
    if (!payload.name || !payload.email || !payload.message) {
      status.hidden = false;
      status.textContent = 'Please fill out all fields.';
      return;
    }

    // optimistic UI
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.setAttribute('aria-busy', 'true');
    status.hidden = false;
    status.textContent = 'Sending…';

    try {
      if (!endpoint) {
        // Example fallback: open mailto (not recommended for UX/privacy)
        status.textContent = 'No endpoint configured. Replace data-form-endpoint with your serverless endpoint or Formspree URL.';
        submitBtn.disabled = false;
        submitBtn.removeAttribute('aria-busy');
        return;
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        status.textContent = 'Message sent — thank you!';
        form.reset();
      } else {
        const text = await res.text();
        status.textContent = 'Failed to send. Please try again later.';
        console.error('Form submit error:', res.status, text);
      }
    } catch (err) {
      console.error(err);
      status.textContent = 'Network error. Please try again later.';
    } finally {
      submitBtn.disabled = false;
      submitBtn.removeAttribute('aria-busy');
    }
  });
})();

/* ========== SMALL UTIL: render current year ========== */
(function () {
  const y = new Date().getFullYear();
  const el = document.getElementById('year');
  if (el) el.textContent = y;
})();
