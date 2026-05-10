/* ─────────────────────────────────────────────────────────────
   components.js — Baseerah Institute
   Fetches global.json then injects announcement bar, nav, footer.
   Self-contained. No exports.
───────────────────────────────────────────────────────────── */

(function () {
  'use strict';

  // ── Helpers ──────────────────────────────────────────────────
  const isIndex = () => {
    const p = window.location.pathname;
    return p === '/' || p.endsWith('/index.html') || p.endsWith('/index') || p === '';
  };

  // Resolve a link: on index.html use #hash, on other pages use full path
  const link = (hash, fullPath) => isIndex() ? hash : fullPath;

  // Mark the active nav link based on current page filename
  const markActive = () => {
    const path = window.location.pathname;
    const page = path.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav-links a, .mob-links a').forEach(a => {
      const href = a.getAttribute('href') || '';
      const hpage = href.split('/').pop().split('#')[0] || 'index.html';
      a.classList.toggle('active', hpage === page && hpage !== '');
    });
    if (isIndex()) {
      const home = document.querySelector('.nav-links a[href="index.html"], .nav-links a[href="/"]');
      if (home) home.classList.add('active');
    }
  };

  // ── Init Announcement Bar ─────────────────────────────────────
  function initAnnouncement(g) {
    const bar = document.getElementById('bar-container');
    if (!bar) return;
    const text = g.announcement_text || '';
    const href = g.announcement_link || '#';
    bar.innerHTML = `<div class="bar">\uD83C\uDF3F ${text} <a href="${href}">View all courses \u2192</a></div>`;
  }

  // ── Init Nav ──────────────────────────────────────────────────
  function initNav(g) {
    const container = document.getElementById('nav-container');
    if (!container) return;

    const onIndex = isIndex();
    const navLinks = [
      { label: 'Home',        href: onIndex ? '/'          : 'index.html' },
      { label: 'About',       href: onIndex ? '#about'     : 'about.html' },
      { label: 'Courses',     href: onIndex ? '#courses'   : 'courses.html' },
      { label: 'Our Teacher', href: onIndex ? '#teacher'   : 'about.html#teacher' },
      { label: 'Events',      href: onIndex ? '#events'    : 'index.html#events' },
      { label: 'Shop',        href: 'shop.html' },
      { label: 'Blog',        href: 'blog.html' },
      { label: 'Donate',      href: onIndex ? '#donate'    : 'donate.html' },
      { label: 'Contact',     href: onIndex ? '#contact'   : 'contact.html' },
    ];

    const desktopLinks = navLinks
      .map(l => `<a href="${l.href}">${l.label}</a>`)
      .join('');

    const regHref = onIndex ? '#courses' : 'courses.html#register';

    container.innerHTML = `
<nav id="navbar" class="transparent">
  <div class="nav-wrap">
    <a href="${onIndex ? '/' : 'index.html'}" class="logo">
      <div class="logo-wrap">
        <img src="${onIndex ? '' : '../'}logo-colour.png" alt="Baseerah Institute" class="logo-img logo-colour"/>
        <img src="${onIndex ? '' : '../'}logo-white.png"  alt="Baseerah Institute" class="logo-img logo-white"/>
      </div>
    </a>
    <div class="nav-links">${desktopLinks}</div>
    <a href="${regHref}" class="btn btn-primary btn-sm nav-cta">Register Now</a>
    <button class="hamburger" id="hamburger" aria-label="Open menu">
      <span></span><span></span><span></span>
    </button>
  </div>
</nav>`;

    markActive();

    // ALL pages: transparent at top, solid on scroll — nav is sticky
    const navbar = document.getElementById('navbar');
    const onScroll = () => {
      const scrolled = window.scrollY > 60;
      navbar.classList.toggle('scrolled',  scrolled);
      navbar.classList.toggle('transparent', !scrolled);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll(); // run immediately in case page loaded mid-scroll
  }

  // ── Init Mobile Nav Panel ─────────────────────────────────────
  function initMobileNav(g) {
    const container = document.getElementById('nav-container');
    if (!container) return;

    const onIndex = isIndex();
    const p = (hash, full) => onIndex ? hash : full;

    container.insertAdjacentHTML('beforeend', `
<!-- Mobile overlay dim -->
<div class="mob-overlay" id="mobOverlay"></div>

<!-- Mobile panel slides in from right -->
<div class="mob" id="mobMenu" role="dialog" aria-modal="true" aria-label="Navigation">
  <button class="mob-close" id="mobClose" aria-label="Close menu">&times;</button>

  <div class="mob-inner">
    <div class="mob-links">

      <!-- Home -->
      <a href="${p('/', 'index.html')}">Home</a>

      <!-- About — expandable -->
      <button class="mob-group-btn" id="mobAboutBtn">
        About <span class="mob-arrow">+</span>
      </button>
      <div class="mob-sub" id="mobAboutSub">
        <a href="${p('#about', 'about.html')}">About Us</a>
        <a href="${p('#teacher', 'about.html#teacher')}">Our Teacher</a>
      </div>

      <!-- Courses — expandable -->
      <button class="mob-group-btn" id="mobCoursesBtn">
        Courses <span class="mob-arrow">+</span>
      </button>
      <div class="mob-sub" id="mobCoursesSub">
        <a href="${p('#courses', 'courses.html#arabic-mastery')}">Arabic Mastery</a>
        <a href="${p('#courses', 'courses.html#ladies-hifth')}">Hifth Programme</a>
        <a href="${p('#courses', 'courses.html#thursday-dawrah')}">Thursday Dawrah</a>
        <a href="${p('#courses', 'courses.html#conversational-arabic')}">Take a Leap to Speak</a>
        <a href="${p('#courses', 'courses.html#aqidah')}">Aqidah Course</a>
      </div>

      <a href="${p('#events', 'index.html#events')}">Events</a>
      <a href="shop.html">Shop</a>
      <a href="blog.html">Blog</a>
      <a href="${p('#donate', 'donate.html')}">Donate</a>
      <a href="${p('#contact', 'contact.html')}">Contact</a>

    </div><!-- /mob-links -->

    <div class="mob-foot">
      <div class="mob-foot-contact">
        <a href="tel:${(g.phone || '').replace(/\s/g,'')}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.4 2 2 0 0 1 3.6 1.22h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.82a16 16 0 0 0 6 6l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.73 16z"/>
          </svg>
          ${g.phone || ''}
        </a>
        <a href="mailto:${g.email || ''}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
            <polyline points="22,6 12,12 2,6"/>
          </svg>
          ${g.email || ''}
        </a>
      </div>
      <div class="mob-social">
        <a href="${g.instagram_url || '#'}" target="_blank" rel="noopener" aria-label="Instagram" style="color:#009EA8">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
            <circle cx="12" cy="12" r="4"/>
            <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>
          </svg>
        </a>
        <a href="${g.facebook_url || '#'}" target="_blank" rel="noopener" aria-label="Facebook" style="color:#1877F2">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
          </svg>
        </a>
        <a href="${g.whatsapp_channel_url || '#'}" target="_blank" rel="noopener" aria-label="WhatsApp Channel" style="color:#25D366">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
          </svg>
        </a>
      </div>
    </div><!-- /mob-foot -->
  </div><!-- /mob-inner -->
</div><!-- /mob -->`);
  }

  // ── Attach Mobile Nav Event Listeners ────────────────────────
  function attachMobileNavListeners() {
    const hamburger = document.getElementById('hamburger');
    const mobMenu   = document.getElementById('mobMenu');
    const mobOverlay = document.getElementById('mobOverlay');
    const mobClose  = document.getElementById('mobClose');
    if (!hamburger || !mobMenu) return;

    const openPanel = () => {
      hamburger.classList.add('open');
      mobMenu.classList.add('open');
      mobOverlay.classList.add('open');
      document.body.style.overflow = 'hidden';
    };
    const closePanel = () => {
      hamburger.classList.remove('open');
      mobMenu.classList.remove('open');
      mobOverlay.classList.remove('open');
      document.body.style.overflow = '';
    };

    hamburger.addEventListener('click', () =>
      mobMenu.classList.contains('open') ? closePanel() : openPanel()
    );
    mobClose.addEventListener('click', closePanel);
    mobOverlay.addEventListener('click', closePanel);
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && mobMenu.classList.contains('open')) closePanel();
    });

    // Focus trap
    mobMenu.addEventListener('keydown', e => {
      if (e.key !== 'Tab') return;
      const focusable = mobMenu.querySelectorAll('a, button');
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (e.shiftKey ? document.activeElement === first : document.activeElement === last) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
      }
    });

    // Close on link click
    mobMenu.querySelectorAll('a').forEach(a =>
      a.addEventListener('click', closePanel)
    );

    // About sub-toggle
    const aboutBtn = document.getElementById('mobAboutBtn');
    const aboutSub = document.getElementById('mobAboutSub');
    aboutBtn && aboutBtn.addEventListener('click', () => {
      const open = aboutSub.classList.toggle('open');
      aboutBtn.classList.toggle('open', open);
    });

    // Courses sub-toggle
    const coursesBtn = document.getElementById('mobCoursesBtn');
    const coursesSub = document.getElementById('mobCoursesSub');
    coursesBtn && coursesBtn.addEventListener('click', () => {
      const open = coursesSub.classList.toggle('open');
      coursesBtn.classList.toggle('open', open);
    });
  }

  // ── Init Footer ───────────────────────────────────────────────
  function initFooter(g) {
    const container = document.getElementById('footer-container');
    if (!container) return;

    const onIndex = isIndex();
    const logoPath = onIndex ? '' : '../';

    container.innerHTML = `
<footer>
  <div class="wrap">
    <div class="ftop">

      <!-- Brand column -->
      <div class="fb">
        <a href="${onIndex ? '/' : 'index.html'}">
          <img src="${logoPath}logo-white.png" alt="Baseerah Institute" class="logo-img"/>
        </a>
        <p>${g.footer_description || ''}</p>
        <div class="fsoc">
          <a href="${g.instagram_url || '#'}" target="_blank" rel="noopener" aria-label="Instagram" class="fs" style="color:#009EA8">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
              <circle cx="12" cy="12" r="4"/>
              <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>
            </svg>
          </a>
          <a href="${g.facebook_url || '#'}" target="_blank" rel="noopener" aria-label="Facebook" class="fs" style="color:#1877F2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
            </svg>
          </a>
          <a href="${g.whatsapp_channel_url || '#'}" target="_blank" rel="noopener" aria-label="WhatsApp" class="fs" style="color:#25D366">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
            </svg>
          </a>
        </div>
      </div>

      <!-- Programmes column -->
      <div class="fc">
        <h5>Programmes</h5>
        <ul>
          <li><a href="courses.html">Arabic Mastery</a></li>
          <li><a href="courses.html">Hifth Programme</a></li>
          <li><a href="courses.html">Thursday Dawrah</a></li>
          <li><a href="courses.html">Take a Leap to Speak</a></li>
        </ul>
      </div>

      <!-- Institute column -->
      <div class="fc">
        <h5>Institute</h5>
        <ul>
          <li><a href="about.html">About</a></li>
          <li><a href="shop.html">Shop</a></li>
          <li><a href="donate.html">Donate</a></li>
          <li><a href="contact.html">Contact</a></li>
        </ul>
      </div>

    </div><!-- /ftop -->

    <div class="fbot">
      <span>&copy; ${new Date().getFullYear()} Baseerah Institute &nbsp;&middot;&nbsp; NPC ${g.npc_number || ''} &nbsp;&middot;&nbsp; All rights reserved</span>
      <span><a href="mailto:${g.email || ''}">${g.email || ''}</a></span>
    </div>

  </div>
</footer>`;
  }

  // ── Reveal on scroll ──────────────────────────────────────────
  function initReveal() {
    const els = document.querySelectorAll('.reveal');
    if (!els.length) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); } });
    }, { threshold: 0.12 });
    els.forEach(el => io.observe(el));
  }

  // ── Bootstrap ─────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    // Resolve path to global.json — works from any depth
    const depth = window.location.pathname.split('/').length - 2;
    const prefix = depth > 0 ? '../'.repeat(depth) : '';
    const globalUrl = `${prefix}_data/settings/global.json`;

    fetch(globalUrl)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(g => {
        initAnnouncement(g);
        initNav(g);
        initMobileNav(g);
        initFooter(g);
        attachMobileNavListeners();
        markActive();
        initReveal();
      })
      .catch(err => {
        console.warn('[components.js] Could not load global.json:', err);
        // Inject minimal nav/footer so page doesn't break
        initNav({});
        initMobileNav({});
        initFooter({});
        attachMobileNavListeners();
        initReveal();
      });
  });

})();
