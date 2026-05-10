/* ─────────────────────────────────────────────────────────────
   app.js — Baseerah Institute
   Page-detecting router. Uses compiled all.json for single-fetch
   performance. Mapping functions protect UI from CMS field changes.
───────────────────────────────────────────────────────────── */

(function () {
  'use strict';

  // ── Path helpers ─────────────────────────────────────────────
  const depth   = window.location.pathname.split('/').length - 2;
  const prefix  = depth > 0 ? '../'.repeat(depth) : '';
  const dataUrl = path => `${prefix}_data/${path}`;

  const page = () => window.location.pathname.split('/').pop() || 'index.html';
  const isPage = name => page() === name || page() === name.replace('.html','') ||
    (name === 'index.html' && (page() === '' || window.location.pathname === '/'));

  // ── Safe fetch with fallback ──────────────────────────────────
  const safeFetch = url =>
    fetch(url).then(r => r.ok ? r.json() : Promise.reject(`${r.status} ${url}`));

  // ── Data mapping functions (stability layer) ──────────────────
  const mapCourse = raw => ({
    title:       raw.title        || '',
    category:    raw.category     || '',
    eyebrow:     raw.eyebrow      || '',
    status:      raw.status       || 'active',
    icon:        raw.icon         || '📖',
    featured:    raw.featured     ?? false,
    fees:        raw.fees?.display || raw.fees?.once_off || raw.fees?.monthly || '',
    feesObj:     raw.fees         || {},
    days:        raw.schedule?.days  || '',
    times:       raw.schedule?.times || '',
    venue:       raw.location?.venue || '',
    mode:        raw.location?.mode  || '',
    open_to:     raw.open_to     || 'Females only',
    dates:       raw.dates        || '',
    about:       raw.about        || '',
    subjects:    Array.isArray(raw.subjects) ? raw.subjects : [],
    prerequisites: raw.prerequisites || '',
    image:       raw.image        || '',
    published:   raw.published    ?? true,
  });

  const mapEvent = raw => ({
    title:        raw.title       || '',
    day:          raw.day         || '',
    month:        raw.month       || '',
    year:         raw.year        || '2026',
    description:  raw.description || '',
    time:         raw.time        || '',
    location:     raw.location    || '',
    fee:          raw.fee?.display || (raw.fee?.is_free ? 'Free' : ''),
    isFree:       raw.fee?.is_free ?? false,
    registration_link:   raw.registration_link   || '',
    registration_open:   raw.registration_open   ?? false,
    registration_fee:    raw.registration_fee    ?? null,
    max_attendees:       raw.max_attendees        ?? null,
    registration_deadline: raw.registration_deadline || '',
    form_fields:  Array.isArray(raw.form_fields) ? raw.form_fields : [],
    published:    raw.published ?? true,
  });

  const mapProduct = raw => ({
    title:    raw.title    || '',
    category: raw.category || '',
    eyebrow:  raw.eyebrow  || '',
    description: raw.description || '',
    image:    raw.cover_image || '',
    price:    raw.price?.display || (raw.price?.amount ? `R${raw.price.amount}` : 'TBC'),
    amount:   raw.price?.amount  || null,
    confirmed: raw.price?.confirmed ?? true,
    badgeText:  raw.badge?.text  || '',
    badgeColor: raw.badge?.color || '',
    stock:    raw.stock    || 'in_stock',
    author:   raw.author_attribution ?? false,
    published: raw.published ?? true,
  });

  const mapFaq = raw => ({
    question: raw.question || '',
    answer:   raw.answer   || '',
    category: raw.category || 'general',
    order:    raw.order    ?? 99,
    published: raw.published ?? true,
  });

  // ── Skeleton helpers ──────────────────────────────────────────
  const skeletonCard = () => `
    <div class="skeleton-card">
      <div class="skeleton skeleton-img"></div>
      <div class="skeleton-body">
        <div class="skeleton skeleton-line short"></div>
        <div class="skeleton skeleton-line title"></div>
        <div class="skeleton skeleton-line"></div>
        <div class="skeleton skeleton-line short"></div>
      </div>
    </div>`;

  const showSkeletons = (id, count = 3) => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = Array(count).fill(skeletonCard()).join('');
  };

  // ── Empty state helper ────────────────────────────────────────
  const emptyState = (icon, title, msg) => `
    <div class="empty-state">
      <span class="empty-icon">${icon}</span>
      <h3>${title}</h3>
      <p>${msg}</p>
    </div>`;

  // ── Status pill helper ────────────────────────────────────────
  const statusPill = s => ({
    active:    `<span class="ac-pill">Active</span>`,
    upcoming:  `<span class="ac-pill gold">Upcoming</span>`,
    closed:    `<span class="ac-pill" style="color:var(--text-light);background:var(--cream-deep)">Closed</span>`,
    waitlist:  `<span class="ac-pill gold">Waitlist</span>`,
  }[s] || '');

  const modePill = m => m ? `<span class="ac-pill">${m}</span>` : '';

  // ══════════════════════════════════════════════════════════════
  //  PAGE: index.html
  // ══════════════════════════════════════════════════════════════
  async function initIndex() {
    await Promise.all([
      initHero(),
      initCoursesPreview(),
      initEvents(),
      initWhatsAppBanner(),
      initStats(),
      initTestimonialsFromData(),
    ]);
  }

  // ── Stats ─────────────────────────────────────────────────────
  async function initStats() {
    const el = document.getElementById('stats-container');
    if (!el) return;
    let stats;
    try { const d = await safeFetch(dataUrl('settings/stats.json')); stats = d.stats || []; }
    catch { return; }
    el.innerHTML = `<div class="stats-grid">${stats.map(s =>
      `<div class="stat"><div class="stat-n">${s.number}</div><div class="stat-l">${s.label}</div></div>`
    ).join('')}</div>`;
  }

  // ── Testimonials from JSON ────────────────────────────────────
  async function initTestimonialsFromData() {
    const track  = document.getElementById('testiTrack');
    const dotsEl = document.getElementById('testiDots');
    if (!track) return;
    let list;
    try { list = (await safeFetch(dataUrl('testimonials/all.json'))).filter(t => t.published).sort((a,b) => a.order - b.order); }
    catch { list = []; }
    if (!list.length) { initTestimonials(); return; }

    track.innerHTML = list.map((t,i) => `
      <div class="testi-item${i===0?' active':''}">
        <span class="qmark">"</span>
        <blockquote>"${t.quote}"</blockquote>
        <div class="testi-meta">
          <span class="testi-name">${t.name}</span>
          <span class="testi-role">${t.role}</span>
        </div>
      </div>`).join('');

    if (dotsEl) {
      dotsEl.innerHTML = list.map((_,i) =>
        `<button class="tdot${i===0?' active':''}" data-i="${i}"></button>`
      ).join('');
    }
    initTestimonials();
  }

  // ── Page hero loader (inner pages) ───────────────────────────
  async function initPageHero(pageKey) {
    const el = document.getElementById('page-hero-container');
    if (!el) return;
    let h;
    try { h = await safeFetch(dataUrl(`settings/hero-${pageKey}.json`)); }
    catch { return; }
    const bgStyle = h.bg_image ? `style="background-image:url('${h.bg_image}');background-size:cover;background-position:center"` : '';
    el.innerHTML = `
<section class="page-hero" ${bgStyle}>
  ${h.bg_image ? `<div style="position:absolute;inset:0;background:rgba(26,26,46,.65);z-index:0"></div>` : ''}
  <div class="wrap" style="position:relative;z-index:1">
    <div class="page-hero-text reveal">
      <span class="eyebrow">${h.eyebrow}</span>
      <h1>${h.heading} <em>${h.heading_em}</em></h1>
      ${h.subtext ? `<p>${h.subtext}</p>` : ''}
    </div>
  </div>
</section>`;
  }

  // ── Hero carousel ─────────────────────────────────────────────
  async function initHero() {
    const el = document.getElementById('hero-container');
    if (!el) return;
    let hero;
    try { hero = await safeFetch(dataUrl('settings/hero.json')); }
    catch { return; }
    const slides = hero.slides || [];
    if (!slides.length) return;

    el.innerHTML = `
<section class="hero" id="hero">
  ${slides.map((s,i) => `<div class="hero-bg${i===0?' active':''}" style="background-image:url('${s.bg_image}')"></div>`).join('')}
  <div class="hero-gradient"></div>
  <div class="h-blob1"></div><div class="h-blob2"></div>
  <div class="wrap slides-wrap">
    ${slides.map((s,i) => `
    <div class="slide${i===0?' active':''}">
      <span class="slide-eye">${s.eyebrow}</span>
      <h1>${s.heading1}<br/><em>${s.heading2_teal}</em></h1>
      ${s.subtext ? `<p class="slide-sub">${s.subtext}</p>` : ''}
      ${s.arabic_text ? `<span class="slide-arabic">${s.arabic_text}</span>` : ''}
      ${s.arabic_ref  ? `<span class="slide-arabic-ref">${s.arabic_ref}</span>` : ''}
      <div class="slide-actions">
        <a href="${s.btn_primary_link}" class="btn btn-primary">${s.btn_primary_text}</a>
        ${s.btn_secondary_text ? `<a href="${s.btn_secondary_link}" class="btn btn-ghost">${s.btn_secondary_text}</a>` : ''}
      </div>
    </div>`).join('')}
  </div>
  <div class="cdots" id="cdots">
    ${slides.map((_,i) => `<button class="dot${i===0?' active':''}" data-i="${i}"></button>`).join('')}
  </div>
</section>`;

    // Carousel logic
    let cur = 0, timer;
    const allSlides = el.querySelectorAll('.slide');
    const allBgs    = el.querySelectorAll('.hero-bg');
    const allDots   = el.querySelectorAll('.dot');

    const goTo = n => {
      allSlides[cur].classList.remove('active');
      allBgs[cur].classList.remove('active');
      allDots[cur].classList.remove('active');
      cur = (n + slides.length) % slides.length;
      allSlides[cur].classList.add('active');
      allBgs[cur].classList.add('active');
      allDots[cur].classList.add('active');
    };

    const start = () => { clearInterval(timer); timer = setInterval(() => goTo(cur+1), 6500); };
    allDots.forEach(d => d.addEventListener('click', () => { goTo(+d.dataset.i); start(); }));
    start();
  }

  // ── Courses preview (featured + 3 cards) ─────────────────────
  async function initCoursesPreview() {
    const el = document.getElementById('courses-preview-container');
    if (!el) return;
    let courses;
    try { courses = (await safeFetch(dataUrl('courses/all.json'))).map(mapCourse).filter(c => c.published); }
    catch { el.innerHTML = emptyState('📖','Courses loading soon','Check back shortly.'); return; }

    const featured = courses.find(c => c.featured) || courses[0];
    const rest     = courses.filter(c => c !== featured).slice(0,3);

    const cardHtml = c => `
      <div class="cc reveal">
        <div class="cc-img">
          ${c.image ? `<img src="${c.image}" alt="${c.title}"/>` : '<div style="width:100%;height:100%;background:var(--teal-light);display:flex;align-items:center;justify-content:center;font-size:40px">'+c.icon+'</div>'}
          <span class="cc-tag teal">${c.eyebrow}</span>
        </div>
        <div class="cc-body">
          <span class="eyebrow">${c.eyebrow}</span>
          <h3>${c.title}</h3>
          <p>${c.about.slice(0,120)}…</p>
          <div class="cc-meta">
            ${c.days ? `<div class="cc-row"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>${c.days} · ${c.times}</div>` : ''}
            ${c.fees ? `<div class="cc-row"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>${c.fees}</div>` : ''}
          </div>
          <a href="courses.html" class="btn btn-outline">Learn More</a>
        </div>
      </div>`;

    el.innerHTML = `<div class="cgrid">
      <div class="cc featured reveal">
        <div class="cc-img">
          ${featured.image ? `<img src="${featured.image}" alt="${featured.title}"/>` : '<div style="width:100%;height:100%;background:var(--teal-light);display:flex;align-items:center;justify-content:center;font-size:60px">'+featured.icon+'</div>'}
          <span class="cc-tag teal">Flagship · ${featured.eyebrow}</span>
        </div>
        <div class="cc-body">
          <span class="eyebrow">${featured.eyebrow}</span>
          <h3>${featured.title}</h3>
          <p>${featured.about}</p>
          <div class="cc-meta">
            ${featured.days ? `<div class="cc-row"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>${featured.days} · ${featured.times}</div>` : ''}
            ${featured.fees ? `<div class="cc-row"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>${featured.fees}</div>` : ''}
          </div>
          <a href="courses.html#register" class="btn btn-primary">Register Now</a>
        </div>
      </div>
      ${rest.map(cardHtml).join('')}
    </div>`;
  }

  // ── Events ────────────────────────────────────────────────────
  async function initEvents() {
    const el = document.getElementById('events-container');
    if (!el) return;
    let events;
    try { events = (await safeFetch(dataUrl('events/all.json'))).map(mapEvent).filter(e => e.published); }
    catch { el.innerHTML = emptyState('📅','Events coming soon','Stay tuned.'); return; }

    events = events.slice(0,6);
    if (!events.length) { el.innerHTML = emptyState('📅','No upcoming events','Check back soon.'); return; }

    // Inject event registration modal into body (once)
    if (!document.getElementById('eventRegOverlay')) {
      document.body.insertAdjacentHTML('beforeend', `
<div class="modal-overlay" id="eventRegOverlay">
  <div class="modal" style="max-width:560px">
    <button class="modal-close" id="eventRegClose">&times;</button>
    <h3 id="eventRegTitle"></h3>
    <p class="modal-book" id="eventRegMeta"></p>
    <div id="eventRegFormWrap"></div>
  </div>
</div>`);
      document.getElementById('eventRegClose').addEventListener('click', closeEventModal);
      document.getElementById('eventRegOverlay').addEventListener('click', e => { if (e.target.id === 'eventRegOverlay') closeEventModal(); });
      document.addEventListener('keydown', e => { if (e.key === 'Escape') closeEventModal(); });
    }

    el.innerHTML = `<div class="egrid">
      ${events.map((e,i) => `
      <div class="ec reveal">
        <div class="e-date">
          <strong>${e.day}</strong>
          <span>${e.month}</span>
        </div>
        <div class="e-info">
          <h4>${e.title}</h4>
          <p>${e.description}</p>
          ${e.time ? `<p style="font-size:12px;color:var(--text-light)">${e.time}</p>` : ''}
          <span class="e-fee${e.isFree?' gf':''}">${e.fee}</span>
          ${e.registration_open
            ? `<br/><button class="btn btn-primary" style="margin-top:10px;font-size:11px;padding:8px 18px" onclick="openEventReg(${i})">Register</button>`
            : e.registration_link
              ? `<br/><a href="${e.registration_link}" class="btn btn-primary" style="margin-top:10px;font-size:11px;padding:8px 18px">Register</a>`
              : ''}
        </div>
      </div>`).join('')}
    </div>`;

    // Store events on window so openEventReg can access them
    window._baseerahEvents = events;
  }

  function closeEventModal() {
    const ov = document.getElementById('eventRegOverlay');
    if (ov) ov.classList.remove('open');
  }

  window.openEventReg = function(idx) {
    const events = window._baseerahEvents || [];
    const e = events[idx];
    if (!e) return;

    const overlay = document.getElementById('eventRegOverlay');
    const titleEl = document.getElementById('eventRegTitle');
    const metaEl  = document.getElementById('eventRegMeta');
    const formWrap = document.getElementById('eventRegFormWrap');
    if (!overlay) return;

    titleEl.textContent = e.title;
    metaEl.textContent  = [e.time, e.location, e.fee].filter(Boolean).join(' · ');

    // Check max_attendees / deadline
    const now = new Date();
    const deadlinePassed = e.registration_deadline && new Date(e.registration_deadline) < now;

    if (deadlinePassed) {
      formWrap.innerHTML = `<div class="notice"><span class="notice-icon">⏰</span><p>Registration for this event has closed.</p></div>`;
      overlay.classList.add('open');
      return;
    }

    // Build dynamic form from form_fields
    const fields = e.form_fields.length ? e.form_fields : [
      { label: 'Full Name',     type: 'text',  required: true },
      { label: 'Email Address', type: 'email', required: true },
      { label: 'Phone Number',  type: 'tel',   required: false },
    ];

    const fieldHtml = fields.map(f => {
      const name = f.label.toLowerCase().replace(/\s+/g,'_');
      if (f.type === 'select' && f.options) {
        const opts = f.options.split(',').map(o => `<option value="${o.trim()}">${o.trim()}</option>`).join('');
        return `<div class="form-group"><label>${f.label}${f.required?' *':''}</label><select name="${name}"${f.required?' required':''}><option value="">Select…</option>${opts}</select></div>`;
      }
      if (f.type === 'textarea') {
        return `<div class="form-group"><label>${f.label}${f.required?' *':''}</label><textarea name="${name}" rows="3"${f.required?' required':''}></textarea></div>`;
      }
      if (f.type === 'checkbox') {
        return `<div class="form-group" style="flex-direction:row;align-items:center;gap:10px"><input type="checkbox" name="${name}" id="${name}"${f.required?' required':''}><label for="${name}" style="text-transform:none;letter-spacing:0;font-size:13px">${f.label}</label></div>`;
      }
      return `<div class="form-group"><label>${f.label}${f.required?' *':''}</label><input type="${f.type}" name="${name}"${f.required?' required':''}></div>`;
    }).join('');

    // Payment step if fee present
    const hasFee = e.registration_fee && e.registration_fee > 0;
    const payHtml = hasFee ? `
<div id="eventPayStep" style="display:none;margin-top:24px;padding-top:20px;border-top:1px solid var(--cream-deep)">
  <p style="font-size:13px;font-weight:600;color:var(--charcoal);margin-bottom:16px">Registration fee: <span style="color:var(--teal)">R${e.registration_fee}</span></p>
  <div style="display:flex;gap:12px;flex-wrap:wrap">
    <button type="button" class="btn btn-primary" style="font-size:12px;padding:10px 20px" onclick="triggerEventPayment('yoco','${e.title}',${e.registration_fee})">Pay with Yoco</button>
    <button type="button" class="btn" style="font-size:12px;padding:10px 20px;background:#003087;color:white" onclick="triggerEventPayment('payfast','${e.title}',${e.registration_fee})">Pay with PayFast</button>
    <button type="button" class="btn btn-outline" style="font-size:12px;padding:10px 20px" onclick="showEftDetails()">Pay via EFT</button>
  </div>
  <div id="eftDetails" style="display:none;margin-top:16px;background:var(--charcoal);border-radius:var(--r-sm);padding:16px">
    <p style="font-size:13px;color:rgba(255,255,255,.75);line-height:1.8">
      <strong style="color:white">FNB · Baseerah Institute</strong><br/>
      Account: 62897506641 · Branch: 203 109<br/>
      Ref: <strong style="color:var(--teal)">${e.title.slice(0,20)}</strong>
    </p>
  </div>
</div>` : '';

    formWrap.innerHTML = `
<form id="eventRegForm" name="event-registration" method="POST" data-netlify="true" netlify-honeypot="bot-field">
  <input type="hidden" name="form-name" value="event-registration"/>
  <input type="hidden" name="bot-field"/>
  <input type="hidden" name="event_name" value="${e.title}"/>
  ${fieldHtml}
  ${payHtml}
  <button type="submit" class="btn btn-primary form-submit" style="margin-top:8px">${hasFee ? 'Continue to Payment' : 'Submit Registration'}</button>
  <p class="form-note">We'll confirm your registration within 1 business day.</p>
</form>`;

    // If has fee, show payment step on submit instead of submitting
    if (hasFee) {
      document.getElementById('eventRegForm').addEventListener('submit', e2 => {
        e2.preventDefault();
        const form = e2.target;
        const valid = form.reportValidity();
        if (!valid) return;
        document.getElementById('eventPayStep').style.display = 'block';
        form.querySelector('[type=submit]').style.display = 'none';
      });
    }

    overlay.classList.add('open');
  };

  window.showEftDetails = function() {
    const el = document.getElementById('eftDetails');
    if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
  };

  window.triggerEventPayment = async function(method, eventName, amount) {
    const formEl = document.getElementById('eventRegForm');
    const nameEl  = formEl.querySelector('[name="full_name"]') || formEl.querySelector('[type="text"]');
    const emailEl = formEl.querySelector('[name="email_address"]') || formEl.querySelector('[type="email"]');
    const student_name  = nameEl  ? nameEl.value  : '';
    const student_email = emailEl ? emailEl.value : '';

    try {
      const res = await fetch('/.netlify/functions/create-registration-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_name, email: student_email, phone: '', course_or_event: eventName, amount, payment_type: 'registration_fee', payment_method: method })
      });
      const data = await res.json();
      if (data.checkoutUrl) { window.location.href = data.checkoutUrl; }
      else if (data.paymentUrl) { window.location.href = data.paymentUrl; }
      else if (data.params) { submitPayFastForm(data.params); }
    } catch(err) {
      alert('Payment could not be initiated. Please try EFT or contact us directly.');
    }
  };

  // ── WhatsApp banner ───────────────────────────────────────────
  async function initWhatsAppBanner() {
    const el = document.getElementById('whatsapp-banner-container');
    if (!el) return;
    let g;
    try { g = await safeFetch(dataUrl('settings/global.json')); }
    catch { return; }

    el.innerHTML = `
<section class="whatsapp-banner">
  <div class="wrap">
    <div class="whatsapp-banner-in">
      <div class="wa-text reveal">
        <span class="eyebrow">Stay Connected</span>
        <h2>Stay in the loop</h2>
        <p>Join our WhatsApp channel for event updates, course announcements, and reminders.</p>
      </div>
      <a href="${g.whatsapp_channel_url || '#'}" target="_blank" rel="noopener" class="btn btn-primary reveal" style="background:#25D366;flex-shrink:0">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>
        Join the Channel →
      </a>
    </div>
  </div>
</section>`;
  }

  // ── Testimonials (hardcoded, rotating) ───────────────────────
  function initTestimonials() {
    const track = document.getElementById('testiTrack');
    const dotsEl = document.getElementById('testiDots');
    if (!track || !dotsEl) return;
    const items = track.querySelectorAll('.testi-item');
    const dots  = dotsEl.querySelectorAll('.tdot');
    if (!items.length) return;
    let cur = 0, timer;
    const goTo = n => {
      items[cur].classList.remove('active');
      dots[cur].classList.remove('active');
      cur = (n + items.length) % items.length;
      items[cur].classList.add('active');
      dots[cur].classList.add('active');
    };
    const start = () => { clearInterval(timer); timer = setInterval(() => goTo(cur+1), 5000); };
    dots.forEach(d => d.addEventListener('click', () => { goTo(+d.dataset.i); start(); }));
    start();
  }

  // ══════════════════════════════════════════════════════════════
  //  PAGE: courses.html
  // ══════════════════════════════════════════════════════════════
  async function initCourses() {
    const el = document.getElementById('courses-container');
    if (!el) return;
    showSkeletons('courses-container', 4);

    let courses;
    try { courses = (await safeFetch(dataUrl('courses/all.json'))).map(mapCourse).filter(c => c.published); }
    catch { el.innerHTML = emptyState('📖','Could not load courses','Please try refreshing the page.'); return; }

    if (!courses.length) { el.innerHTML = emptyState('📖','No courses yet','Check back soon.'); return; }

    const renderCourses = (list) => {
      el.innerHTML = list.length
        ? list.map(c => courseAccordion(c)).join('')
        : emptyState('🔍','No courses in this category','Try another filter.');
      attachAccordionListeners();
    };

    renderCourses(courses);

    // Filter tabs
    document.querySelectorAll('.ftab').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.ftab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const f = btn.dataset.filter;
        renderCourses(f === 'all' ? courses : courses.filter(c => c.category === f));
      });
    });

    // Populate registration dropdown
    const sel = document.getElementById('course-select');
    if (sel) {
      sel.innerHTML = '<option value="">Select a course…</option>' +
        courses.map(c => `<option value="${c.title}">${c.title}</option>`).join('');
    }

    // Registration form — payment step
    const regForm = document.getElementById('reg-form') || document.querySelector('form[name="registration"]');
    if (regForm) {
      // Inject payment step container after form if not present
      if (!document.getElementById('reg-payment-step')) {
        regForm.insertAdjacentHTML('afterend', `
<div id="reg-payment-step" style="display:none;margin-top:24px">
  <div style="background:white;border-radius:var(--r-lg);padding:32px;box-shadow:var(--shadow-sm)">
    <h4 style="font-family:'Cormorant Garamond',serif;font-size:22px;color:var(--charcoal);margin-bottom:6px">Pay Registration Fee</h4>
    <p style="font-size:13.5px;color:var(--text-mid);margin-bottom:24px">R300 once-off · secures your place in the programme.</p>
    <div style="display:flex;gap:12px;flex-wrap:wrap">
      <button type="button" class="btn btn-primary" onclick="triggerRegistrationPayment('yoco')">Pay with Yoco</button>
      <button type="button" class="btn" style="background:#003087;color:white" onclick="triggerRegistrationPayment('payfast')">Pay with PayFast</button>
      <button type="button" class="btn btn-outline" id="showEftReg">Pay via EFT / SnapScan</button>
    </div>
    <div id="eft-reg-details" style="display:none;margin-top:20px;background:var(--charcoal);border-radius:var(--r-sm);padding:16px">
      <p style="font-size:13px;color:rgba(255,255,255,.75);line-height:1.8">
        <strong style="color:white">FNB · Baseerah Institute</strong><br/>
        Account: 62897506641 · Branch: 203 109<br/>
        Reference: <strong style="color:var(--teal)">Registration 2026</strong>
      </p>
    </div>
  </div>
</div>`);

        document.getElementById('showEftReg')?.addEventListener('click', () => {
          const d = document.getElementById('eft-reg-details');
          if (d) d.style.display = d.style.display === 'none' ? 'block' : 'none';
        });
      }

      regForm.addEventListener('submit', e => {
        const payRadio = regForm.querySelector('[name="payment_preference"]:checked');
        const payPref  = payRadio ? payRadio.value : 'online';
        if (payPref === 'eft') return; // let Netlify handle it
        e.preventDefault();
        if (!regForm.reportValidity()) return;
        document.getElementById('reg-payment-step').style.display = 'block';
        document.getElementById('reg-payment-step').scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }

  function courseAccordion(c) {
    return `
<div class="ac" id="${c.title.toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'')}">
  <div class="ac-head">
    <div class="ac-icon">${c.icon}</div>
    <div class="ac-title">
      <span class="eyebrow">${c.eyebrow}</span>
      <h3>${c.title}</h3>
      <div class="ac-meta-row">
        ${statusPill(c.status)}
        ${c.fees ? `<span class="ac-pill">${c.fees}</span>` : ''}
        ${modePill(c.mode)}
      </div>
    </div>
    <div class="ac-toggle">+</div>
  </div>
  <div class="ac-divider"></div>
  <div class="ac-body">
    <div class="ac-grid">
      <div class="ac-detail">
        <h4>About this programme</h4>
        <p>${c.about}</p>
        ${c.subjects.length ? `<h4>Subjects &amp; topics</h4><ul>${c.subjects.map(s=>`<li>${s}</li>`).join('')}</ul>` : ''}
        ${c.prerequisites ? `<h4>Prerequisites</h4><p>${c.prerequisites}</p>` : ''}
      </div>
      <div>
        <div class="ac-aside">
          ${c.days ? `<div class="ac-aside-row"><div class="ac-aside-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div><div class="ac-aside-text"><small>Schedule</small><span>${c.days} · ${c.times}</span></div></div>` : ''}
          ${c.venue ? `<div class="ac-aside-row"><div class="ac-aside-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg></div><div class="ac-aside-text"><small>Location</small><span>${c.venue}</span></div></div>` : ''}
          ${c.feesObj.registration || c.feesObj.monthly || c.feesObj.once_off ? `<div class="ac-aside-row"><div class="ac-aside-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></div><div class="ac-aside-text"><small>Fees</small><span>${[c.feesObj.registration&&('R'+c.feesObj.registration+' reg'),c.feesObj.monthly,c.feesObj.once_off,c.feesObj.international].filter(Boolean).join(' · ')}</span></div></div>` : ''}
          ${c.dates ? `<div class="ac-aside-row"><div class="ac-aside-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></div><div class="ac-aside-text"><small>Dates</small><span>${c.dates}</span></div></div>` : ''}
          <div class="ac-aside-row"><div class="ac-aside-icon">👩</div><div class="ac-aside-text"><small>Open to</small><span>${c.open_to}</span></div></div>
        </div>
        <div class="ac-cta">
          <a href="#register" class="btn btn-primary">Register Now</a>
          <a href="contact.html" class="btn btn-outline">Ask a Question</a>
        </div>
      </div>
    </div>
  </div>
</div>`;
  }

  function attachAccordionListeners() {
    document.querySelectorAll('.ac-head').forEach(head => {
      head.addEventListener('click', () => {
        const ac = head.closest('.ac');
        const isOpen = ac.classList.contains('open');
        document.querySelectorAll('.ac.open').forEach(o => o.classList.remove('open'));
        if (!isOpen) ac.classList.add('open');
      });
    });
  }

  // ══════════════════════════════════════════════════════════════
  //  PAGE: shop.html
  // ══════════════════════════════════════════════════════════════
  async function initShop() {
    showSkeletons('products-container', 6);

    const [products, stockistsData] = await Promise.allSettled([
      safeFetch(dataUrl('shop/all.json')),
      safeFetch(dataUrl('settings/stockists.json')),
    ]);

    // Products
    const el = document.getElementById('products-container');
    if (el) {
      if (products.status === 'rejected') {
        el.innerHTML = emptyState('📚','Could not load products','Please try refreshing.'); 
      } else {
        const list = products.value.map(mapProduct).filter(p => p.published);
        const renderProducts = (items) => {
          el.innerHTML = items.length
            ? `<div class="shop-grid">${items.map(productCard).join('')}</div>`
            : emptyState('🔍','No products in this category','Try another filter.');
          attachOrderListeners();
        };
        renderProducts(list);
        document.querySelectorAll('.ftab').forEach(btn => {
          btn.addEventListener('click', () => {
            document.querySelectorAll('.ftab').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const f = btn.dataset.filter;
            renderProducts(f === 'all' ? list : list.filter(p => p.category === f));
          });
        });
      }
    }

    // Stockists
    const sel = document.getElementById('stockists-container');
    if (sel && stockistsData.status === 'fulfilled') {
      const list = stockistsData.value.stockists || [];
      sel.innerHTML = `<div class="stockists-grid">${list.map(s => `
        <div class="stockist-card">
          <div class="stockist-icon">📍</div>
          <h3>${s.name}</h3>
          <p>${s.description}</p>
          <address>${s.address.replace(/\n/g,'<br/>')}</address>
          <div class="btn-row">
            ${s.website_url ? `<a href="${s.website_url}" target="_blank" rel="noopener" class="btn btn-outline" style="font-size:12px;padding:10px 20px">Visit Website</a>` : ''}
            ${s.google_maps_url ? `<a href="${s.google_maps_url}" target="_blank" rel="noopener" class="btn btn-primary" style="font-size:12px;padding:10px 20px">View on Maps</a>` : ''}
          </div>
        </div>`).join('')}</div>`;
    }

    // Payment logos
    const payEl = document.getElementById('payment-logos-container');
    if (payEl) {
      payEl.innerHTML = `
<div class="payment-logos">
  <div class="wrap">
    <div class="payment-logos-in">
      <div class="pay-pill"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#009EA8" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg> Yoco</div>
      <div class="pay-pill"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#003087" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg> PayFast</div>
      <div class="pay-pill" style="color:#25D366">📱 SnapScan</div>
      <div class="pay-pill">🏦 EFT</div>
      <div class="pay-pill" style="color:#003087">🅿 PayPal</div>
    </div>
  </div>
</div>`;
    }

    // Order modal close
    const overlay = document.getElementById('orderOverlay');
    const closeBtn = document.getElementById('modalClose');
    if (overlay) overlay.addEventListener('click', e => { if (e.target===overlay) closeModal(); });
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    document.addEventListener('keydown', e => { if (e.key==='Escape') closeModal(); });
  }

  function productCard(p) {
    const badgeColors = { teal:'var(--teal)', gold:'var(--gold)', new:'var(--charcoal)' };
    return `
<div class="product">
  <div class="product-img${p.image ? '' : ' placeholder-img'}">
    ${p.image
      ? `<img src="${p.image}" alt="${p.title}"/>`
      : `<span>${p.badgeText === 'Bestseller' ? '📖' : p.badgeText === 'New' ? '✨' : '📚'}</span><p>${p.eyebrow}</p>`}
    ${p.badgeText ? `<span class="product-badge" style="background:${badgeColors[p.badgeColor]||'var(--charcoal)'}">${p.badgeText}</span>` : ''}
  </div>
  <div class="product-body">
    <span class="eyebrow">${p.eyebrow}</span>
    <h3>${p.title}</h3>
    ${p.author ? `<p class="product-attribution">by Shaykhah Rukayya Samsodien</p>` : ''}
    <p>${p.description}</p>
    <div class="product-footer">
      <div class="product-price">
        ${p.price}
        ${!p.confirmed ? `<small>Price TBC</small>` : ''}
        ${p.stock === 'out_of_stock' ? `<small style="color:var(--text-light)">Out of stock</small>` : ''}
        ${p.stock === 'coming_soon' ? `<small style="color:var(--gold)">Coming soon</small>` : ''}
      </div>
      <div class="product-actions">
        ${p.stock !== 'out_of_stock' && p.stock !== 'coming_soon'
          ? `<button class="btn btn-primary" style="font-size:12px;padding:10px 18px" onclick="openOrderModal('${p.title.replace(/'/g,"\\'")}')">${p.confirmed ? 'Order' : 'Enquire'}</button>`
          : `<span class="btn btn-outline" style="font-size:12px;padding:10px 18px;opacity:.5;cursor:default">Unavailable</span>`}
      </div>
    </div>
  </div>
</div>`;
  }

  function attachOrderListeners() {
    document.querySelectorAll('[onclick^="openOrderModal"]').forEach(btn => {
      // onclick already set inline — no additional listener needed
    });
  }

  function closeModal() {
    const overlay = document.getElementById('orderOverlay');
    if (overlay) overlay.classList.remove('open');
  }

  window.openOrderModal = function(title) {
    const overlay = document.getElementById('orderOverlay');
    const bookEl  = document.getElementById('modal-book-title');
    const input   = document.getElementById('modal-product-input');
    if (!overlay) return;
    if (bookEl) bookEl.textContent = title;
    if (input) input.value = title;
    overlay.classList.add('open');
  };

  // ══════════════════════════════════════════════════════════════
  //  PAGE: blog.html
  // ══════════════════════════════════════════════════════════════
  async function initBlog() {
    const featuredEl = document.getElementById('featured-post-container');
    const gridEl     = document.getElementById('blog-grid-container');
    const comingEl   = document.querySelector('.coming-soon-banner');

    let posts;
    try {
      const all = await safeFetch(dataUrl('blog/all.json'));
      posts = all.filter(p => p.published).sort((a,b) => new Date(b.date) - new Date(a.date));
    } catch {
      posts = [];
    }

    if (!posts.length) {
      if (comingEl) comingEl.style.display = 'block';
      if (featuredEl) featuredEl.innerHTML = '';
      if (gridEl) gridEl.innerHTML = '';
      return;
    }

    if (comingEl) comingEl.style.display = 'none';

    const catLabel = { arabic:'Arabic', hifth:'Hifth', fiqh:'Fiqh & Tazkiya', institute:'Institute News' };
    const fmtDate  = d => new Date(d).toLocaleDateString('en-ZA',{day:'numeric',month:'long',year:'numeric'});

    const slugOf = post => {
      const idx = posts.indexOf(post);
      return `post-${idx}`;
    };

    // Featured
    const featured = posts[0];
    if (featuredEl) {
      featuredEl.innerHTML = `
<a class="featured-post reveal" href="blog/post.html?slug=${encodeURIComponent(featured.title.toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,''))}">
  <div class="featured-img">
    ${featured.cover_image ? `<img src="${featured.cover_image}" alt="${featured.title}"/>` : '<div style="width:100%;height:100%;background:var(--teal-light);display:flex;align-items:center;justify-content:center;font-size:60px">📖</div>'}
    <span class="featured-badge">Latest</span>
  </div>
  <div class="featured-body">
    <span class="eyebrow">${catLabel[featured.category] || featured.category}</span>
    <h2>${featured.title}</h2>
    <div class="post-meta">
      <span>${featured.author || 'Shaykhah Rukayya Samsodien'}</span>
      <span>·</span>
      <span>${fmtDate(featured.date)}</span>
    </div>
    <p>${featured.excerpt}</p>
    <span class="btn btn-primary" style="align-self:flex-start">Read More →</span>
  </div>
</a>`;
    }

    // Grid
    const rest = posts.slice(1);
    let activeFilter = 'all';

    const renderGrid = (list) => {
      if (!gridEl) return;
      gridEl.innerHTML = list.length ? `<div class="blog-grid">${list.map(p => postCard(p, catLabel, fmtDate)).join('')}</div>` : emptyState('📖','No posts in this category','Try another filter.');
    };

    renderGrid(rest);

    // Filter tabs
    document.querySelectorAll('.ftab').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.ftab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeFilter = btn.dataset.filter;
        const filtered = activeFilter === 'all' ? rest : rest.filter(p => p.category === activeFilter);
        renderGrid(filtered);
      });
    });

    // Search
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        const q = searchInput.value.toLowerCase();
        const base = activeFilter === 'all' ? rest : rest.filter(p => p.category === activeFilter);
        renderGrid(q ? base.filter(p => p.title.toLowerCase().includes(q) || (p.excerpt||'').toLowerCase().includes(q)) : base);
      });
    }
  }

  function postCard(p, catLabel, fmtDate) {
    const slug = p.title.toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'');
    return `
<div class="post-card" onclick="location.href='blog/post.html?slug=${encodeURIComponent(slug)}'">
  <div class="post-img${p.cover_image ? '' : ' coming'}">
    ${p.cover_image ? `<img src="${p.cover_image}" alt="${p.title}"/>` : `<span>📖</span>`}
    <span class="post-cat ${p.category}">${catLabel[p.category] || p.category}</span>
  </div>
  <div class="post-body">
    <div class="post-meta">
      <span>${p.author || 'Shaykhah Rukayya Samsodien'}</span>
      <span>·</span>
      <span>${fmtDate(p.date)}</span>
    </div>
    <h3>${p.title}</h3>
    <p>${p.excerpt}</p>
    <a href="blog/post.html?slug=${encodeURIComponent(slug)}" class="read-more">Read More →</a>
  </div>
</div>`;
  }

  // ══════════════════════════════════════════════════════════════
  //  PAGE: donate.html
  // ══════════════════════════════════════════════════════════════
  async function initDonate() {
    let g;
    try { g = await safeFetch(dataUrl('settings/global.json')); } catch { return; }

    const bankEl = document.getElementById('bank-details-container');
    if (bankEl) {
      bankEl.innerHTML = `
<div class="bank-details">
  <div class="bank-row"><span class="bank-label">Bank</span><span class="bank-value">${g.bank_name}</span></div>
  <div class="bank-row"><span class="bank-label">Account Name</span><span class="bank-value">${g.bank_account_name}</span></div>
  <div class="bank-row"><span class="bank-label">Account Number</span><span class="bank-value">${g.bank_account}</span></div>
  <div class="bank-row"><span class="bank-label">Account Type</span><span class="bank-value">${g.bank_account_type}</span></div>
  <div class="bank-row"><span class="bank-label">Branch Code</span><span class="bank-value">${g.bank_branch}</span></div>
</div>
${g.paypal_link ? `<div class="paypal-box"><p>International donors — PayPal accepted</p><a href="${g.paypal_link}" target="_blank" rel="noopener">Donate via PayPal →</a></div>` : ''}`;
    }

    const snapEl = document.getElementById('snapscan-container');
    if (snapEl && g.snapscan_qr) {
      snapEl.innerHTML = `<div class="snapscan-wrap"><small>Scan to Donate</small><img src="${g.snapscan_qr}" alt="SnapScan QR" style="width:180px;height:180px;border-radius:12px"/><div class="snapscan-types"><span class="s-type">Zakaat</span><span class="s-type">Lillah</span><span class="s-type">Sadaqah</span><span class="s-type">Sponsor a Student</span></div></div>`;
    }
  }

  // ══════════════════════════════════════════════════════════════
  //  PAGE: about.html
  // ══════════════════════════════════════════════════════════════
  async function initAbout() {
    const [globalRes, teacherRes, faqRes] = await Promise.allSettled([
      safeFetch(dataUrl('settings/global.json')),
      safeFetch(dataUrl('settings/teacher.json')),
      safeFetch(dataUrl('faqs/all.json')),
    ]);

    // Contact details
    if (globalRes.status === 'fulfilled') {
      const g = globalRes.value;
      const el = document.getElementById('contact-details-container');
      if (el) {
        el.innerHTML = `
<div class="citems">
  <div class="citem"><div class="cicon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.4 2 2 0 0 1 3.6 1.22h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.82a16 16 0 0 0 6 6l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.73 16z"/></svg></div><div class="citem-t"><small>Phone</small><a href="tel:${(g.phone||'').replace(/\s/g,'')}">${g.phone}</a></div></div>
  <div class="citem"><div class="cicon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,12 2,6"/></svg></div><div class="citem-t"><small>Email</small><a href="mailto:${g.email}">${g.email}</a></div></div>
  <div class="citem"><div class="cicon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg></div><div class="citem-t"><small>Address</small><span>${g.address_line1}<br/>${g.address_line2}</span></div></div>
</div>`;
      }
    }

    // Teacher
    if (teacherRes.status === 'fulfilled') {
      const t = teacherRes.value;
      const el = document.getElementById('teacher-container');
      if (el) {
        el.innerHTML = `
<div class="sh-grid">
  <div class="sh-img-wrap reveal">
    <div class="sh-frame">
      ${t.photo ? `<img src="${t.photo}" alt="${t.name}"/>` : '<div style="width:100%;height:100%;background:var(--teal-light);display:flex;align-items:center;justify-content:center;font-size:80px">👩</div>'}
    </div>
    <div class="sh-cred"><p>${t.credential_text}</p></div>
  </div>
  <div class="sh-text reveal">
    <span class="eyebrow">Our Teacher</span>
    <h2>${t.name}</h2>
    <p>${t.bio_paragraph_1}</p>
    <p>${t.bio_paragraph_2}</p>
    <p>${t.bio_paragraph_3}</p>
    ${t.publications?.length ? `<div class="sh-pubs"><h4>Publications</h4><ul>${t.publications.map(p=>`<li>${p}</li>`).join('')}</ul></div>` : ''}
    <a href="contact.html" class="btn btn-outline" style="margin-top:28px">Get in Touch</a>
  </div>
</div>`;
      }
    }

    // Teachers grid
    const teachersEl = document.getElementById('teachers-container');
    if (teachersEl) {
      let teachers = [];
      try { teachers = (await safeFetch(dataUrl('teachers/all.json'))).filter(t => t.published).sort((a,b) => a.order - b.order); }
      catch { teachers = []; }
      teachersEl.innerHTML = teachers.length ? `<div class="teachers-grid">
        ${teachers.map(t => `
        <div class="tc reveal">
          <div class="tc-img${t.photo ? '' : ' placeholder'}">
            ${t.photo
              ? `<img src="${t.photo}" alt="${t.name}"/>`
              : `<div class="ph-icon">👩‍🏫</div><p>${t.name === 'Teacher Profile' ? 'Coming soon' : t.name.split(' ')[0]}</p>`}
          </div>
          <div class="tc-body${t.name === 'Teacher Profile' ? ' coming' : ''}">
            <h3>${t.name}</h3>
            <span class="role">${t.role}</span>
            <p>${t.bio}</p>
          </div>
        </div>`).join('')}
      </div>` : '';
    }
  }
      const faqs = faqRes.value.map(mapFaq).filter(f => f.published).sort((a,b) => a.order - b.order);
      const faqEl = document.getElementById('faq-container');
      if (faqEl) {
        let activeFilter = 'all';
        const renderFaqs = (list) => {
          faqEl.innerHTML = list.length
            ? `<div class="faq-accordion">${list.map(f => `
              <div class="faq-item">
                <div class="faq-q"><h4>${f.question}</h4><span class="faq-toggle">+</span></div>
                <div class="faq-a"><p>${f.answer}</p></div>
              </div>`).join('')}</div>`
            : emptyState('❓','No FAQs in this category','');
          // Accordion listeners
          faqEl.querySelectorAll('.faq-q').forEach(q => {
            q.addEventListener('click', () => {
              const item = q.closest('.faq-item');
              const isOpen = item.classList.contains('open');
              faqEl.querySelectorAll('.faq-item.open').forEach(o => o.classList.remove('open'));
              if (!isOpen) item.classList.add('open');
            });
          });
        };
        renderFaqs(faqs);

        document.querySelectorAll('[data-faq-filter]').forEach(btn => {
          btn.addEventListener('click', () => {
            document.querySelectorAll('[data-faq-filter]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeFilter = btn.dataset.faqFilter;
            renderFaqs(activeFilter === 'all' ? faqs : faqs.filter(f => f.category === activeFilter));
          });
        });
      }
    }
  }

  // ══════════════════════════════════════════════════════════════
  //  PAGE: contact.html
  // ══════════════════════════════════════════════════════════════
  async function initContact() {
    let g;
    try { g = await safeFetch(dataUrl('settings/global.json')); } catch { return; }
    const el = document.getElementById('contact-details-container');
    if (!el) return;
    el.innerHTML = `
<div class="citems">
  <div class="citem"><div class="cicon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.4 2 2 0 0 1 3.6 1.22h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.82a16 16 0 0 0 6 6l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.73 16z"/></svg></div><div class="citem-body"><small>Phone / WhatsApp</small><a href="tel:${(g.phone||'').replace(/\s/g,'')}">${g.phone}</a></div></div>
  <div class="citem"><div class="cicon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,12 2,6"/></svg></div><div class="citem-body"><small>Email</small><a href="mailto:${g.email}">${g.email}</a></div></div>
  <div class="citem"><div class="cicon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg></div><div class="citem-body"><small>Address</small><p>${g.address_line1}<br/>${g.address_line2}</p></div></div>
</div>`;
  }

  // ── PayFast form submitter (shared) ──────────────────────────
  window.submitPayFastForm = function(params) {
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = 'https://www.payfast.co.za/eng/process';
    for (const [k, v] of Object.entries(params)) {
      const inp = document.createElement('input');
      inp.type = 'hidden'; inp.name = k; inp.value = v;
      form.appendChild(inp);
    }
    document.body.appendChild(form);
    form.submit();
  };

  // ── Courses: registration payment trigger ─────────────────────
  window.triggerRegistrationPayment = async function(method) {
    const form = document.getElementById('reg-form') || document.querySelector('form[name="registration"]');
    if (!form) return;
    if (!form.reportValidity()) return;

    const get = name => (form.querySelector(`[name="${name}"]`) || {}).value || '';
    const payload = {
      student_name:   get('name') || get('student_name'),
      email:          get('email'),
      phone:          get('phone'),
      course_or_event: get('course') || get('course_select'),
      amount:         0, // registration fee — function will determine
      payment_type:   'registration_fee',
      payment_method: method,
    };

    try {
      const res  = await fetch('/.netlify/functions/create-registration-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.checkoutUrl)  { window.location.href = data.checkoutUrl; }
      else if (data.paymentUrl) { window.location.href = data.paymentUrl; }
      else if (data.params)  { window.submitPayFastForm(data.params); }
    } catch {
      alert('Payment could not be initiated. Please pay via EFT or contact us.');
    }
  };

  // ── Donation payment trigger (donate.html) ────────────────────
  window.triggerDonationPayment = async function(method) {
    const amountEl = document.getElementById('donation-amount');
    const typeEl   = document.getElementById('donation-type');
    const nameEl   = document.getElementById('donor-name');
    const emailEl  = document.getElementById('donor-email');

    const amount        = parseFloat((amountEl || {}).value) || 0;
    const donation_type = (typeEl  || {}).value || 'Sadaqah';
    const donor_name    = (nameEl  || {}).value || '';
    const donor_email   = (emailEl || {}).value || '';

    if (amount < 1) { alert('Please enter a donation amount.'); return; }

    try {
      const res  = await fetch('/.netlify/functions/create-donation-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, donation_type, donor_name, donor_email, payment_method: method }),
      });
      const data = await res.json();
      if (data.checkoutUrl)  { window.location.href = data.checkoutUrl; }
      else if (data.paymentUrl) { window.location.href = data.paymentUrl; }
      else if (data.params)  { window.submitPayFastForm(data.params); }
    } catch {
      alert('Payment could not be initiated. Please try EFT or contact us.');
    }
  };

  // ── Donate.html: render donation payment widget ───────────────
  async function initDonatePaymentWidget() {
    const el = document.getElementById('donation-payment-container');
    if (!el) return;
    el.innerHTML = `
<div style="background:white;border-radius:var(--r-lg);padding:32px;box-shadow:var(--shadow-sm)">
  <h3 style="font-family:'Cormorant Garamond',serif;font-size:26px;font-weight:600;color:var(--charcoal);margin-bottom:6px">Donate Online</h3>
  <span style="font-size:13px;color:var(--text-light);display:block;margin-bottom:24px">Secure payment via Yoco or PayFast</span>

  <div class="form-group">
    <label>Your Name</label>
    <input type="text" id="donor-name" placeholder="Fatimah Hendricks"/>
  </div>
  <div class="form-group">
    <label>Email Address</label>
    <input type="email" id="donor-email" placeholder="you@example.com"/>
  </div>
  <div class="form-group">
    <label>Donation Type *</label>
    <select id="donation-type">
      <option value="Zakaat">Zakaat</option>
      <option value="Lillah">Lillah</option>
      <option value="Sadaqah" selected>Sadaqah</option>
      <option value="Sponsor a Student">Sponsor a Student</option>
    </select>
  </div>
  <div class="form-group">
    <label>Amount (ZAR) *</label>
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:10px">
      ${[100,250,500,1000].map(a => `<button type="button" class="btn btn-outline" style="font-size:12px;padding:8px 18px" onclick="document.getElementById('donation-amount').value=${a};document.querySelectorAll('.amt-quick').forEach(b=>b.classList.remove('active'));this.classList.add('active')" >${'R'+a}</button>`).join('')}
    </div>
    <input type="number" id="donation-amount" placeholder="Enter amount" min="10" step="10"/>
  </div>

  <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:24px">
    <button type="button" class="btn btn-primary" onclick="triggerDonationPayment('yoco')">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
      Pay with Yoco
    </button>
    <button type="button" class="btn" style="background:#003087;color:white" onclick="triggerDonationPayment('payfast')">
      PayFast
    </button>
  </div>
</div>`;
  }

  // ── ROUTER — detect page and run correct module ───────────────
  document.addEventListener('DOMContentLoaded', () => {
    const p = page();
    if      (isPage('index.html'))   initIndex();
    else if (isPage('courses.html')) { initPageHero('courses'); initCourses(); }
    else if (isPage('shop.html'))    { initPageHero('shop');    initShop(); }
    else if (isPage('blog.html'))    { initPageHero('blog');    initBlog(); }
    else if (isPage('donate.html'))  { initPageHero('donate');  initDonate(); initDonatePaymentWidget(); }
    else if (isPage('about.html'))   { initPageHero('about');   initAbout(); }
    else if (isPage('contact.html')) { initPageHero('contact'); initContact(); }
  });

})();
