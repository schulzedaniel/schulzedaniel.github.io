/* watch.js
   Minimal, dependency-free:
   - Supercut: autoplay, play 5s then pause to poster frame
   - Grid click: open modal, inject YouTube iframe (only when needed)
   - Year filter
   - Accessible modal (focus trap simplified)
*/

(function(){
    // Utility
    const $ = (sel, ctx=document) => ctx.querySelector(sel);
    const $$ = (sel, ctx=document) => Array.from(ctx.querySelectorAll(sel));
  
    // SUPER CUT: play for 5s then pause on last frame (if video available)
    const supercut = $('#supercut');
    if (supercut) {
      // wait for canplay then set timer
      supercut.addEventListener('canplay', () => {
        // play briefly, then pause on a nice frame
        const SHOW_MS = 5000;
        try {
          supercut.play().catch(()=>{/* autoplay blocked */});
        } catch(e){}
        setTimeout(() => {
          // pause and keep last frame (if poster exists, keep poster by setting paused)
          if (!supercut.paused) supercut.pause();
          // reduce opacity to hint it's now static
          supercut.style.opacity = '0.98';
        }, SHOW_MS);
      });
    }
  
    // VIDEO GRID interactions
    const grid = $('#video-grid');
    const yearFilter = $('#year-filter');
    const modal = $('#video-modal');
    const modalBackdrop = modal && modal.querySelector('.modal-backdrop');
    const playerWrap = $('#player-wrap');
    const playerMeta = $('#player-meta');
    const modalTitle = $('#modal-title');
    const modalClose = $('#modal-close');
  
    // Helper to build YouTube iframe
    function makeYouTubeIframe(videoId, start=0) {
      const params = new URLSearchParams({
        autoplay: 1,
        rel: 0,
        modestbranding: 1,
        showinfo: 0,
        playsinline: 1,
        start: start
      });
      const src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?${params.toString()}`;
      const iframe = document.createElement('iframe');
      iframe.setAttribute('allow','autoplay; fullscreen; encrypted-media; picture-in-picture');
      iframe.setAttribute('src', src);
      iframe.setAttribute('title', 'Video Player');
      iframe.setAttribute('loading', 'lazy');
      iframe.setAttribute('allowfullscreen', '');
      return iframe;
    }
  
    // Open modal and inject iframe
    function openModal(videoId, title, meta) {
      if (!modal) return;
      modal.setAttribute('aria-hidden','false');
      // create iframe
      playerWrap.innerHTML = '';
      playerWrap.appendChild(makeYouTubeIframe(videoId));
      playerMeta.textContent = meta || '';
      modalTitle.textContent = title || 'Video';
      // trap focus: focus close button
      setTimeout(()=> modalClose && modalClose.focus(), 120);
      // lock scroll
      document.documentElement.style.overflow = 'hidden';
    }
  
    function closeModal() {
      if (!modal) return;
      modal.setAttribute('aria-hidden','true');
      // remove iframe to stop playback
      playerWrap.innerHTML = '';
      playerMeta.textContent = '';
      modalTitle.textContent = 'Video';
      document.documentElement.style.overflow = '';
    }
  
    // attach click handlers to grid (delegation)
    if (grid) {
      grid.addEventListener('click', (ev) => {
        const btn = ev.target.closest('.thumb-btn');
        if (!btn) return;
        const card = btn.closest('.video-card');
        if (!card) return;
        const videoId = card.getAttribute('data-youtube');
        const title = card.querySelector('.title')?.textContent || '';
        const year = card.getAttribute('data-year') || '';
        const meta = `${year}`;
        if (videoId) openModal(videoId, title, meta);
      });
  
      // keyboard accessibility: Enter/Space on .thumb-btn will trigger click naturally since it's a button
    }
  
    // modal close events
    if (modal) {
      modal.addEventListener('click', (ev) => {
        // close when clicking backdrop
        if (ev.target === modalBackdrop) closeModal();
      });
      modalClose && modalClose.addEventListener('click', closeModal);
      window.addEventListener('keydown', (ev) => {
        if (ev.key === 'Escape' && modal && modal.getAttribute('aria-hidden') === 'false') closeModal();
      });
    }
  
    // Year filter
    if (yearFilter && grid) {
      yearFilter.addEventListener('change', (ev) => {
        const val = ev.target.value;
        const cards = $$('.video-card', grid);
        cards.forEach(c => {
          if (val === 'all' || c.getAttribute('data-year') === val) {
            c.style.display = '';
          } else {
            c.style.display = 'none';
          }
        });
      });
    }
  
    // Progressive enhancement: If JS disabled, grid still shows thumbnails (they are buttons and do nothing).
    // DONE
  })();
  