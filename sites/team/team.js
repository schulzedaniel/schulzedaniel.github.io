// team.js - reveal animations + column-parallax + precise hero placement
(() => {
    /* ---------- Reveal once for full card ---------- */
    const revealOpts = {
      root: null,
      rootMargin: '0px 0px -8% 0px',
      threshold: 0.12
    };
  
    const revealObserver = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target;
  
          if (el.classList.contains('portrait-wrap')) {
            // reveal entire card
            el.classList.add('revealed');
          } else {
            // title/intro items
            el.classList.add('is-visible');
          }
  
          obs.unobserve(el);
        }
      });
    }, revealOpts);
  
    // observe portrait wraps and any .animate-once items (title/intro)
    document.querySelectorAll('.portrait-wrap').forEach(n => revealObserver.observe(n));
    document.querySelectorAll('.animate-once').forEach(n => revealObserver.observe(n));
  
    /* ---------- Column parallax + hero placement ---------- */
    const grid = document.getElementById('teamGrid');
    const cols = document.querySelectorAll('.cols .col');
    const heroMedia = document.getElementById('heroMedia');
    const teamHero = document.getElementById('teamHero');
    const accentRect = document.querySelector('.accent-rect');
  
    // column speeds (1 & 3 slower, 2 & 4 faster)
    const speeds = {
      'col-1': 0.035,
      'col-2': 0.07,
      'col-3': 0.035,
      'col-4': 0.07
    };
  
    let ticking = false;
  
    function updateParallaxAndHero() {
      const scrollY = window.scrollY || window.pageYOffset;
      const viewportH = window.innerHeight;
  
      // Column parallax only on larger screens
      if (window.innerWidth >= 760 && grid) {
        const gridTopAbs = grid.getBoundingClientRect().top + scrollY;
        const start = gridTopAbs - viewportH;
        const progress = Math.max(0, scrollY - start);
  
        cols.forEach(col => {
          let key = '';
          if (col.classList.contains('col-1')) key = 'col-1';
          else if (col.classList.contains('col-2')) key = 'col-2';
          else if (col.classList.contains('col-3')) key = 'col-3';
          else key = 'col-4';
  
          const translateY = Math.round(progress * speeds[key]);
          col.style.transform = `translateY(${translateY}px)`;
        });
      } else {
        cols.forEach(c => c.style.transform = '');
      }
  
      // Hero subtle parallax — we keep it small and smooth
      if (heroMedia && teamHero && window.innerWidth >= 520) {
        // compute base top (set initially so that image overlaps the accent rect by 20% of image height)
        positionHeroMedia(); // ensures baseline top is recalculated
        // then apply subtle additional upward movement as user scrolls
        const heroTopAbs = teamHero.getBoundingClientRect().top + scrollY;
        const heroStart = heroTopAbs - viewportH;
        const heroProg = Math.max(0, scrollY - heroStart);
        const heroTranslate = Math.round(heroProg * 0.06); // small px movement
        // combine with current top translation (we modify via translateY combined)
        // heroMedia uses translateX(-50%) and top in px; we'll apply additional translateY by inline transform
        // read current base translate (we keep translateX in place)
        heroMedia.style.transform = `translateX(-50%) translateY(calc(var(--hero-base-overhang, -20%) - ${heroTranslate}px))`;
      } else if (heroMedia) {
        heroMedia.style.transform = 'translateX(-50%) translateY(var(--hero-base-overhang, -20%))';
      }
  
      ticking = false;
    }
  
    function onScroll() {
      if (!ticking) {
        window.requestAnimationFrame(updateParallaxAndHero);
        ticking = true;
      }
    }
  
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', () => { positionHeroMedia(); onScroll(); }, { passive: true });
  
    /* ---------- Precise hero placement: compute hero-media top so image overlaps rect ~20% ---------- */
    function positionHeroMedia() {
      if (!heroMedia || !teamHero || !accentRect) return;
      const heroRect = teamHero.getBoundingClientRect();
      const accentRectRel = accentRect.getBoundingClientRect();
      // measurement relative to .team-hero
      const accentTopRel = accentRectRel.top - heroRect.top; // px inside teamHero
      const img = heroMedia.querySelector('.hero-img') || heroMedia.querySelector('img');
  
      if (!img) return;
  
      // ensure image is loaded to get correct height
      const applied = () => {
        const imgBounds = img.getBoundingClientRect();
        const displayedH = imgBounds.height;
        // desired overhang: portion of image that should extend OVER the rect (positive = image extends above rect)
        const overhangRatio = 0.20; // 20%
        // compute top inside teamHero so that image top = accentTopRel - (displayedH * (1 - overhangRatio))
        const imageTopInside = accentTopRel - (displayedH * (1 - overhangRatio));
  
        // store CSS variable used by transform for combine translateY
        heroMedia.style.setProperty('--hero-base-overhang', `-${Math.round(overhangRatio * 100)}%`);
        // set an initial transform preserving translateX and the base overhang (JS parallax will adjust further)
        heroMedia.style.transform = `translateX(-50%) translateY(var(--hero-base-overhang, -20%))`;
      };
  
      // if image has intrinsic size or already loaded, use it; otherwise wait for load
      if (img.complete && img.naturalHeight !== 0) {
        applied();
      } else {
        img.addEventListener('load', applied, { once: true });
      }
    }
  
    // run on DOM ready
    document.addEventListener('DOMContentLoaded', () => {
      positionHeroMedia();
      onScroll();
    });
  
    // also run shortly after in case fonts/images change layout
    setTimeout(() => { positionHeroMedia(); onScroll(); }, 500);
  })();
  