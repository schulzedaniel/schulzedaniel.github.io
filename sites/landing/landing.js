(function () {
    /* ---------------- SAFE TYPING with tags (returns Promise) ----------------
   Builds DOM once (with nested tags), then types into text nodes.
   Returns a Promise that resolves when finished.
*/
function typeHtmlWithTags(container, htmlLike, options = {}) {
  const charDelay = options.charDelay ?? 40;
  // Return a Promise so callers can await completion
  return new Promise((resolve) => {
    const tokens = [];
    const regex = /(<[^>]+>)|([^<]+)/g;
    let m;
    while ((m = regex.exec(htmlLike)) !== null) {
      if (m[1]) tokens.push({ type: 'tag', text: m[1] });
      else if (m[2]) tokens.push({ type: 'text', text: m[2] });
    }

    const stack = [container];
    const textNodes = [];

    tokens.forEach(tok => {
      if (tok.type === 'tag') {
        const tagText = tok.text.trim();
        const isClosing = /^<\s*\/\s*([^\s>]+)\s*>$/i.test(tagText);
        if (isClosing) {
          const tagName = tagText.match(/^<\s*\/\s*([^\s>]+)\s*>$/i)[1].toLowerCase();
          for (let i = stack.length - 1; i > 0; i--) {
            if (stack[i].nodeName && stack[i].nodeName.toLowerCase() === tagName) {
              stack.splice(i);
              break;
            }
          }
        } else {
          const openMatch = tagText.match(/^<\s*([^\s>]+)([^>]*)>$/i);
          if (openMatch) {
            const tagName = openMatch[1].toLowerCase();
            const attrText = openMatch[2] || '';
            const el = document.createElement(tagName);
            const classMatch = attrText.match(/class\s*=\s*["']([^"']+)["']/i);
            if (classMatch) el.className = classMatch[1];
            const idMatch = attrText.match(/id\s*=\s*["']([^"']+)["']/i);
            if (idMatch) el.id = idMatch[1];
            const styleMatch = attrText.match(/style\s*=\s*["']([^"']+)["']/i);
            if (styleMatch) el.setAttribute('style', styleMatch[1]);
            stack[stack.length - 1].appendChild(el);
            stack.push(el);
          }
        }
      } else {
        const text = tok.text.replace(/\r?\n/g, '');
        if (text.length === 0) return;
        const tn = document.createTextNode('');
        stack[stack.length - 1].appendChild(tn);
        textNodes.push({ node: tn, full: text });
      }
    });

    // typing loop using requestAnimationFrame and accumulator
    let nodeIndex = 0, charIndex = 0, lastTime = null, acc = 0;
    function step(ts) {
      if (!lastTime) lastTime = ts;
      const dt = ts - lastTime;
      lastTime = ts;
      acc += dt;
      while (acc >= charDelay) {
        acc -= charDelay;
        if (nodeIndex >= textNodes.length) {
          resolve();
          return;
        }
        const current = textNodes[nodeIndex];
        const nextChar = current.full.charAt(charIndex);
        current.node.data += nextChar;
        charIndex++;
        if (charIndex >= current.full.length) {
          nodeIndex++;
          charIndex = 0;
        }
      }
      requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  });
}

/* ---------------- RESERVE HEIGHT BEFORE TYPING ---------------- */
function reserveMaskHeight(lineMaskEl, htmlString) {
  return new Promise((resolve) => {
    if (!lineMaskEl) return resolve();
    const meas = document.createElement('div');
    meas.style.position = 'absolute';
    meas.style.left = '-9999px';
    meas.style.top = '0';
    meas.style.visibility = 'hidden';
    meas.style.pointerEvents = 'none';

    const maskRect = lineMaskEl.getBoundingClientRect();
    const widthPx = Math.max(40, Math.round(maskRect.width || lineMaskEl.offsetWidth || 600));
    meas.style.width = widthPx + 'px';

    const computed = window.getComputedStyle(lineMaskEl);
    meas.style.fontFamily = computed.fontFamily;
    meas.style.fontSize = computed.fontSize;
    meas.style.fontWeight = computed.fontWeight;
    meas.style.lineHeight = computed.lineHeight;
    meas.style.letterSpacing = computed.letterSpacing;
    meas.style.whiteSpace = 'normal';

    meas.innerHTML = htmlString;
    document.body.appendChild(meas);

    const measured = Math.ceil(meas.getBoundingClientRect().height || meas.offsetHeight || 0);
    lineMaskEl.style.height = measured + 'px';
    lineMaskEl.style.minHeight = measured + 'px';

    document.body.removeChild(meas);
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  });
}

/* ---------------- HERO: typing + reveal (works reliably) ---------------- */
(function () {
  const maskSel = '.line-mask';
  const FINAL1 = 'Ideas <span class="accent">change</span>';
  const FINAL2 = 'everything.';
  const CHAR_DELAY = 70;

  async function initHero() {
    const l1Mask = document.querySelector(`${maskSel}:nth-of-type(1)`);
    const l2Mask = document.querySelector(`${maskSel}:nth-of-type(2)`);
    const l1Inner = document.getElementById('line1');
    const l2Inner = document.getElementById('line2');

    if (!l1Mask || !l2Mask || !l1Inner || !l2Inner) {
      if (l1Inner) l1Inner.innerHTML = FINAL1;
      if (l2Inner) l2Inner.innerHTML = FINAL2;
      return;
    }

    // reduced motion: skip typing, show final text immediately and ensure revealed class present
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      l1Inner.innerHTML = FINAL1;
      l2Inner.innerHTML = FINAL2;
      l1Mask.style.height = '';
      l2Mask.style.height = '';
      l1Inner.classList.add('revealed');
      l2Inner.classList.add('revealed');
      return;
    }

    try {
      // first line: reserve height, reveal (make visible), then type
      await reserveMaskHeight(l1Mask, FINAL1);
      l1Inner.innerHTML = ''; // ensure empty
      // Add revealed -> CSS (should move it from translateX(-100%) -> 0). Add before typing to show slide.
      requestAnimationFrame(() => {
        l1Inner.classList.add('revealed');
        // slight delay so the reveal animation starts
        setTimeout(async () => {
          await typeHtmlWithTags(l1Inner, FINAL1, { charDelay: CHAR_DELAY });
          // after first finished, proceed to second
          await reserveMaskHeight(l2Mask, FINAL2);
          l2Inner.innerHTML = '';
          requestAnimationFrame(() => {
            l2Inner.classList.add('revealed');
            setTimeout(async () => {
              await typeHtmlWithTags(l2Inner, FINAL2, { charDelay: CHAR_DELAY });
            }, 80);
          });
        }, 80);
      });
    } catch (err) {
      console.error('Hero init error', err);
      l1Inner.innerHTML = FINAL1;
      l2Inner.innerHTML = FINAL2;
      l1Inner.classList.add('revealed');
      l2Inner.classList.add('revealed');
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initHero);
  else initHero();

  // recompute heights on resize (debounced)
  (function () {
    let t = null;
    window.addEventListener('resize', () => {
      clearTimeout(t);
      t = setTimeout(async () => {
        try {
          const l1Mask = document.querySelector(`${maskSel}:nth-of-type(1)`);
          const l2Mask = document.querySelector(`${maskSel}:nth-of-type(2)`);
          if (l1Mask) await reserveMaskHeight(l1Mask, FINAL1);
          if (l2Mask) await reserveMaskHeight(l2Mask, FINAL2);
        } catch (e) { /* ignore */ }
      }, 140);
    });
  })();
})();

})();
