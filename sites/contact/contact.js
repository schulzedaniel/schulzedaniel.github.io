(function () {
  const options = Array.from(document.querySelectorAll('[data-form-option]'));
  const frame = document.getElementById('formFrame');
  const viewer = document.getElementById('formViewer');
  const titleEl = document.getElementById('formTitle');
  const descEl = document.getElementById('formDesc');
  const linkEl = document.getElementById('formDirectLink');
  const emailBlock = document.getElementById('formEmailBlock');
  const emailNoteEl = document.getElementById('formEmailNote');
  const emailTextEl = document.getElementById('formEmailText');
  const emailButton = document.getElementById('formEmailButton');

  if (!options.length || !frame) return;

  function applySelection(btn) {
    if (!btn) return;
    const { src, height, title, desc, link, key } = btn.dataset;

    options.forEach(opt => {
      const active = opt === btn;
      opt.classList.toggle('is-active', active);
      opt.setAttribute('aria-selected', active ? 'true' : 'false');
      opt.tabIndex = active ? 0 : -1;
    });

    if (viewer && btn.id) viewer.setAttribute('aria-labelledby', btn.id);

    const nextTitle = title || btn.querySelector('h3')?.textContent || 'Contact';
    if (titleEl) titleEl.textContent = nextTitle;
    const nextDesc = desc || btn.querySelector('p')?.textContent || '';
    if (descEl) descEl.textContent = nextDesc;

    if (emailBlock) {
      const mailTarget = btn.dataset.email || '';
      const mailNote = btn.dataset.emailNote || '';
      const mailText = btn.dataset.emailText || '';
      const mailSubject = btn.dataset.emailSubject || `${nextTitle} inquiry`;
      const hasMail = Boolean(mailTarget);

      emailBlock.hidden = !hasMail;
      emailBlock.style.display = hasMail ? '' : 'none';
      emailBlock.setAttribute('aria-hidden', hasMail ? 'false' : 'true');

      if (emailNoteEl) {
        emailNoteEl.hidden = !mailNote;
        emailNoteEl.textContent = mailNote || '';
      }

      if (emailTextEl) {
        emailTextEl.hidden = !mailText;
        emailTextEl.textContent = mailText || '';
      }

      if (emailButton) {
        if (hasMail) {
          const encodedSubject = mailSubject ? `?subject=${encodeURIComponent(mailSubject)}` : '';
          emailButton.href = `mailto:${mailTarget}${encodedSubject}`;
          emailButton.textContent = `✉️ ${mailTarget}`;
        } else {
          emailButton.removeAttribute('href');
          emailButton.textContent = '';
        }
      }
    }

    if (frame) {
      const nextSrc = src || '';
      if (height) {
        frame.style.height = `${height}px`;
        frame.setAttribute('height', height);
      }
      if (nextSrc && frame.dataset.activeSrc !== nextSrc) {
        frame.src = nextSrc;
        frame.dataset.activeSrc = nextSrc;
      }
      frame.title = `${nextTitle} form`;
    }

    if (linkEl) {
      const href = link || src || '';
      if (href) {
        linkEl.href = href;
      }
    }

    if (key) {
      try {
        history.replaceState(null, '', `#${key}`);
      } catch (err) {
        /* ignore */
      }
    }
  }

  function selectByKey(key) {
    const match = options.find(opt => opt.dataset.key === key);
    applySelection(match || options[0]);
  }

  options.forEach((btn, idx) => {
    if (!btn.id) btn.id = `contact-tab-${idx + 1}`;
    btn.setAttribute('role', 'tab');
    if (!btn.hasAttribute('aria-selected')) btn.setAttribute('aria-selected', 'false');
    btn.tabIndex = -1;

    btn.addEventListener('click', () => applySelection(btn));
    btn.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter' || ev.key === ' ') {
        ev.preventDefault();
        applySelection(btn);
      }
    });
  });

  if (viewer) viewer.setAttribute('role', 'tabpanel');

  const initialKey = window.location.hash ? window.location.hash.slice(1) : '';
  selectByKey(initialKey || options[0]?.dataset.key);

  window.addEventListener('hashchange', () => {
    const key = window.location.hash ? window.location.hash.slice(1) : '';
    if (key) selectByKey(key);
  });
})();
