// team.js — lightweight parallax / scroll-speed script
(() => {
    const rows = Array.from(document.querySelectorAll('.team-row'));
    const title = document.querySelector('.team-title');
    const heroImg = document.querySelector('.hero-img');
    let lastScroll = window.scrollY || 0;
    let ticking = false;
  
    function onScroll() {
      lastScroll = window.scrollY || window.pageYOffset;
      if (!ticking) {
        window.requestAnimationFrame(update);
        ticking = true;
      }
    }
  
    function update() {
      const sc = lastScroll;
      // title parallax: small inverse move when scrolling
      if (title) {
        // move title slightly slower than scroll (subtle)
        const heroRect = title.getBoundingClientRect();
        const offset = sc * 0.06;
        title.style.transform = `translateY(${offset}px)`;
      }
  
      // hero image subtle parallax (move opposite)
      if (heroImg) {
        const offsetImg = sc * -0.02;
        heroImg.style.transform = `translateY(calc(-1 * var(--team-img-overhang) + ${offsetImg}px))`;
      }
  
      // rows: each row can define data-speed (base) and each child can have data-speed-mult
      rows.forEach(row => {
        const base = parseFloat(row.getAttribute('data-speed')) || 0.08;
        // compute transform based on page offset from row top
        const rect = row.getBoundingClientRect();
        // we use negative translateY when scrolling down for parallax illusion
        const translate = (window.scrollY + window.innerHeight - rect.top) * base * -1;
        row.style.transform = `translateY(${translate}px)`;
      });
  
      ticking = false;
    }
  
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', () => {
      // recompute on resize
      update();
    });
    // initial call
    update();
  })();
  