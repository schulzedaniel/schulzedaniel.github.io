//<!-- /partials/includes.js -->

class SiteHeader extends HTMLElement {
  connectedCallback(){
    this.innerHTML = `
    <header class="site-header" id="top" role="banner">
    <nav class="nav container" role="navigation" aria-label="Main navigation">
        <a class="logo" href="/index.html" aria-label="Go to homepage">
        <img id="site-logo" src="/assets/logos/logo.png" alt="Project Logo" width="1176" height="252" loading="eager">
        </a>
        <ul class="nav-links" role="menubar">
        <li><a href="/index.html">HOME</a></li>
        <li><a href="/sites/about/about.html">ABOUT</a></li>
        <li><a href="/sites/events/events.html">EVENTS</a></li>
        <li><a href="/sites/team/team.html">TEAM</a></li>
        <li><a href="/sites/sponsors/sponsors.html">SPONSORS</a></li>
        <li><a href="/sites/watch/watch.html">WATCH</a></li>
        <li><a href="/sites/contact/contact.html">CONTACT</a></li>
        </ul>
        <div class="controls">
        <button id="theme-toggle" class="theme-toggle" aria-label="Toggle light / dark" aria-pressed="false" title="Toggle theme">
            <span class="theme-track" aria-hidden="true">
            <img src="/assets/icons/sun.png" alt="" class="theme-img theme-img-sun" />
            <img src="/assets/icons/moon.png" alt="" class="theme-img theme-img-moon" />
            <span class="theme-thumb" aria-hidden="true"></span>
            </span>
        </button>
        <button class="hamburger" id="hamburger" aria-label="Open navigation" aria-expanded="false">
            <span></span><span></span><span></span>
        </button>
        </div>
    </nav>
    <div class="mobile-menu" id="mobileMenu" aria-hidden="true">
        <div class="mobile-top">
        <button id="mobile-theme-toggle" class="theme-toggle small" aria-label="Toggle theme (mobile)" aria-pressed="false" title="Toggle theme">
            <span class="theme-track" aria-hidden="true">
            <img src="/assets/icons/sun.png" alt="" class="theme-img theme-img-sun" />
            <img src="/assets/icons/moon.png" alt="" class="theme-img theme-img-moon" />
            <span class="theme-thumb" aria-hidden="true"></span>
            </span>
        </button>
        <button id="mobileClose" class="mobile-close" aria-label="Close menu">Close</button>
        </div>
        <a href="/index.html">HOME</a>
        <a href="/sites/about/about.html">ABOUT</a>
        <a href="/sites/events/events.html">EVENTS</a>
        <a href="/sites/team/team.html">TEAM</a>
        <a href="/sites/sponsors/sponsors.html">SPONSORS</a>
        <a href="/sites/watch/watch.html">WATCH</a>
        <a href="/sites/contact/contact.html">CONTACT</a>
    </div>
    </header>`;
  }
}

class SocialStrip extends HTMLElement {
  connectedCallback(){
    this.innerHTML = `
    <aside class="social-strip" id="socialStrip" aria-label="Social Media Links">
    <a class="social" href="https://www.instagram.com/tedxki/" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
        <img src="/assets/logos/social/Instagram_Glyph_Gradient.png" alt="" class="social-logo" />
        <span class="label">Instagram</span>
    </a>
    <a class="social" href="https://www.tiktok.com/@tedxki" target="_blank" rel="noopener noreferrer" aria-label="TikTok">
        <img src="/assets/logos/social/TikTok_Icon_Black_Circle.png" alt="" class="social-logo" />
        <span class="label">TikTok</span>
    </a>
    <a class="social" href="https://www.linkedin.com/company/tedxki/" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
        <img src="/assets/logos/social/LI-In-Bug.png" alt="" class="social-logo" />
        <span class="label">LinkedIn</span>
    </a>
    <a class="social" href="https://www.facebook.com/people/TEDx-KI/61560876282016/" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
        <img src="/assets/logos/social/Facebook_Logo_Primary.png" alt="" class="social-logo" />
        <span class="label">Facebook</span>
    </a>
    </aside>`;
  }
}

class SiteFooter extends HTMLElement {
  connectedCallback(){
    this.innerHTML = `
<footer class="site-footer safe-pad">
  <div class="container footer-inner">
    <p>© <span id="year"></span> TEDxKI. All rights reserved. | x = independently organized TED event</p>
    <a class="footer-badge" href="/index.html" aria-label="Go to homepage">
      <img src="/assets/logos/TEDxWithDisclaimer_light.png" alt="TEDxKI Logo (with disclaimer: x = independently organized TED event)" width="1194" height="364" decoding="async"/>
    </a>
  </div>
</footer>`;
  }
}

customElements.define('site-header', SiteHeader);
customElements.define('social-strip', SocialStrip);
customElements.define('site-footer', SiteFooter);
