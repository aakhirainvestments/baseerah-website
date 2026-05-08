/* ─────────────────────────────────────────────────────────────
   blog.js — Baseerah Institute
   Handles blog/post.html — fetches post by slug, renders full
   post layout with audio, PDF, YouTube, prev/next, related posts,
   share buttons, newsletter signup.
───────────────────────────────────────────────────────────── */

(function () {
  'use strict';

  const depth  = window.location.pathname.split('/').length - 2;
  const prefix = depth > 0 ? '../'.repeat(depth) : '';
  const dataUrl = path => `${prefix}_data/${path}`;

  const safeFetch = url =>
    fetch(url).then(r => r.ok ? r.json() : Promise.reject(`${r.status} ${url}`));

  // ── Slug from URL ─────────────────────────────────────────────
  const getSlug = () => {
    const params = new URLSearchParams(window.location.search);
    return params.get('slug') || '';
  };

  // ── Markdown → HTML (minimal renderer) ───────────────────────
  const mdToHtml = md => {
    if (!md) return '';
    return md
      .replace(/^#{3}\s(.+)$/gm, '<h3>$1</h3>')
      .replace(/^#{2}\s(.+)$/gm, '<h2>$1</h2>')
      .replace(/^#{1}\s(.+)$/gm, '<h1>$1</h1>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width:100%;border-radius:12px;margin:16px 0"/>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
      .replace(/^---$/gm, '<hr style="border:none;border-top:1px solid var(--cream-deep);margin:32px 0"/>')
      .replace(/^>\s(.+)$/gm, '<blockquote style="border-left:3px solid var(--teal);padding:12px 20px;margin:24px 0;background:var(--teal-faint);border-radius:0 12px 12px 0;font-style:italic;color:var(--text-mid)">$1</blockquote>')
      .replace(/^[-*]\s(.+)$/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>)/s, '<ul style="display:flex;flex-direction:column;gap:8px;padding-left:20px;margin:16px 0">$1</ul>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/^(?!<[h|b|u|o|l|i|p|hr|blockquote])(.+)$/gm, (m) => m.startsWith('<') ? m : `<p>${m}</p>`)
      .replace(/<p><\/p>/g, '');
  };

  // ── YouTube URL → embed URL ───────────────────────────────────
  const toEmbedUrl = url => {
    if (!url) return '';
    const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([^&?/\s]{11})/);
    return m ? `https://www.youtube.com/embed/${m[1]}` : url;
  };

  // ── Format date ───────────────────────────────────────────────
  const fmtDate = d => new Date(d).toLocaleDateString('en-ZA', {
    day: 'numeric', month: 'long', year: 'numeric'
  });

  // ── Read time ─────────────────────────────────────────────────
  const readTime = text => Math.max(1, Math.ceil((text || '').split(/\s+/).length / 200));

  // ── Category label ────────────────────────────────────────────
  const catLabel = { arabic: 'Arabic', hifth: 'Hifth', fiqh: 'Fiqh & Tazkiya', institute: 'Institute News' };

  // ── Open Graph meta updater ───────────────────────────────────
  const setOG = (title, desc, image, url) => {
    const set = (prop, val) => {
      let el = document.querySelector(`meta[property="${prop}"]`);
      if (!el) { el = document.createElement('meta'); el.setAttribute('property', prop); document.head.appendChild(el); }
      el.setAttribute('content', val || '');
    };
    set('og:title',       title);
    set('og:description', desc);
    set('og:image',       image);
    set('og:url',         url);
    document.title = title ? `${title} — Baseerah Institute` : 'Baseerah Institute';
  };

  // ── Share buttons ─────────────────────────────────────────────
  const shareButtons = (title, url) => `
<div class="post-share" style="display:flex;gap:12px;flex-wrap:wrap;margin:32px 0">
  <a href="https://wa.me/?text=${encodeURIComponent(title + ' ' + url)}"
     target="_blank" rel="noopener"
     class="btn" style="background:#25D366;color:white;font-size:12px;padding:10px 20px">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>
    WhatsApp
  </a>
  <a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}"
     target="_blank" rel="noopener"
     class="btn" style="background:#1877F2;color:white;font-size:12px;padding:10px 20px">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
    Facebook
  </a>
  <button id="copyLinkBtn"
     class="btn btn-outline" style="font-size:12px;padding:10px 20px">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
    Copy Link
  </button>
</div>`;

  // ── Audio player ──────────────────────────────────────────────
  const audioPlayer = src => `
<div class="audio-player" style="background:var(--teal-faint);border-radius:var(--r-md);padding:20px 24px;margin:32px 0;display:flex;align-items:center;gap:16px">
  <button id="audioPlayBtn" style="width:48px;height:48px;border-radius:50%;background:var(--teal);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:var(--trans)">
    <svg id="audioPlayIcon" width="20" height="20" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg>
  </button>
  <div style="flex:1;display:flex;flex-direction:column;gap:8px">
    <input id="audioProgress" type="range" min="0" max="100" value="0"
      style="width:100%;accent-color:var(--teal);cursor:pointer"/>
    <div style="display:flex;justify-content:space-between;font-size:11.5px;color:var(--text-light)">
      <span id="audioCurrent">0:00</span>
      <span id="audioDuration">0:00</span>
    </div>
  </div>
  <audio id="audioEl" src="${src}" preload="metadata"></audio>
</div>`;

  // ── PDF download card ─────────────────────────────────────────
  const pdfCard = src => {
    const name = src.split('/').pop();
    return `
<a href="${src}" download class="pdf-card"
   style="display:flex;align-items:center;gap:16px;background:var(--cream-warm);border:1.5px solid var(--cream-deep);border-radius:var(--r-md);padding:18px 22px;margin:24px 0;transition:var(--trans);text-decoration:none"
   onmouseover="this.style.borderColor='var(--teal)'" onmouseout="this.style.borderColor='var(--cream-deep)'">
  <div style="width:44px;height:44px;background:var(--teal-faint);border-radius:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0">
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--teal)" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
  </div>
  <div style="flex:1">
    <p style="font-size:13.5px;font-weight:600;color:var(--charcoal);margin-bottom:2px">${name}</p>
    <small style="font-size:11.5px;color:var(--text-light)">PDF Download</small>
  </div>
  <div style="color:var(--teal)">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
  </div>
</a>`;
  };

  // ── Attach audio player listeners ─────────────────────────────
  const attachAudioListeners = () => {
    const audio    = document.getElementById('audioEl');
    const playBtn  = document.getElementById('audioPlayBtn');
    const playIcon = document.getElementById('audioPlayIcon');
    const progress = document.getElementById('audioProgress');
    const current  = document.getElementById('audioCurrent');
    const duration = document.getElementById('audioDuration');
    if (!audio || !playBtn) return;

    const fmt = s => {
      const m = Math.floor(s / 60), sec = Math.floor(s % 60);
      return `${m}:${sec.toString().padStart(2,'0')}`;
    };

    playBtn.addEventListener('click', () => {
      if (audio.paused) {
        audio.play();
        playIcon.innerHTML = '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>';
      } else {
        audio.pause();
        playIcon.innerHTML = '<polygon points="5 3 19 12 5 21 5 3"/>';
      }
    });

    audio.addEventListener('timeupdate', () => {
      if (!audio.duration) return;
      progress.value = (audio.currentTime / audio.duration) * 100;
      current.textContent = fmt(audio.currentTime);
    });

    audio.addEventListener('loadedmetadata', () => {
      duration.textContent = fmt(audio.duration);
    });

    progress.addEventListener('input', () => {
      audio.currentTime = (progress.value / 100) * audio.duration;
    });

    audio.addEventListener('ended', () => {
      playIcon.innerHTML = '<polygon points="5 3 19 12 5 21 5 3"/>';
    });
  };

  // ── Copy link button ──────────────────────────────────────────
  const attachCopyLink = () => {
    const btn = document.getElementById('copyLinkBtn');
    if (!btn) return;
    btn.addEventListener('click', () => {
      navigator.clipboard.writeText(window.location.href).then(() => {
        btn.textContent = 'Copied!';
        setTimeout(() => { btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg> Copy Link`; }, 2000);
      });
    });
  };

  // ── Prev / Next nav ───────────────────────────────────────────
  const renderPrevNext = (posts, currentSlug, container) => {
    if (!container) return;
    const sorted = [...posts].filter(p => p.published).sort((a,b) => new Date(b.date) - new Date(a.date));
    const slugOf = p => p.title.toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'');
    const idx = sorted.findIndex(p => slugOf(p) === currentSlug);
    if (idx === -1) return;

    const prev = sorted[idx + 1] || null;
    const next = sorted[idx - 1] || null;

    container.innerHTML = `
<div class="post-prevnext" style="display:grid;grid-template-columns:1fr 1fr;gap:0;background:white;border-radius:var(--r-md);box-shadow:var(--shadow-sm);overflow:hidden;margin:60px 0">
  <a href="${prev ? 'post.html?slug='+encodeURIComponent(slugOf(prev)) : '#'}"
     class="pn-side" style="padding:28px 32px;display:flex;flex-direction:column;gap:8px;border-right:1px solid var(--cream-deep);text-decoration:none;transition:var(--trans);${!prev?'opacity:.35;pointer-events:none':''}"
     onmouseover="this.style.background='var(--teal-faint)'" onmouseout="this.style.background=''">
    <span style="font-size:10px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:var(--teal);display:flex;align-items:center;gap:8px">
      <span class="pn-arrow" style="font-size:20px;color:var(--teal);transition:transform .25s ease">←</span>
      PREVIOUS
    </span>
    <span style="font-family:'Cormorant Garamond',serif;font-size:18px;font-weight:600;color:var(--charcoal);line-height:1.3">${prev ? prev.title : 'No earlier post'}</span>
  </a>
  <a href="${next ? 'post.html?slug='+encodeURIComponent(slugOf(next)) : '#'}"
     class="pn-side" style="padding:28px 32px;display:flex;flex-direction:column;align-items:flex-end;gap:8px;text-decoration:none;transition:var(--trans);text-align:right;${!next?'opacity:.35;pointer-events:none':''}"
     onmouseover="this.style.background='var(--teal-faint)'" onmouseout="this.style.background=''">
    <span style="font-size:10px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:var(--teal);display:flex;align-items:center;gap:8px">
      NEXT
      <span class="pn-arrow" style="font-size:20px;color:var(--teal);transition:transform .25s ease">→</span>
    </span>
    <span style="font-family:'Cormorant Garamond',serif;font-size:18px;font-weight:600;color:var(--charcoal);line-height:1.3">${next ? next.title : 'No newer post'}</span>
  </a>
</div>`;

    // Hover nudge arrows
    container.querySelectorAll('.pn-side').forEach((side, i) => {
      const arrow = side.querySelector('.pn-arrow');
      side.addEventListener('mouseenter', () => { if (arrow) arrow.style.transform = i===0 ? 'translateX(-4px)' : 'translateX(4px)'; });
      side.addEventListener('mouseleave', () => { if (arrow) arrow.style.transform = ''; });
    });
  };

  // ── Related posts ─────────────────────────────────────────────
  const renderRelated = (posts, current, container) => {
    if (!container) return;
    const others = posts.filter(p => p.published && p.title !== current.title);
    const same   = others.filter(p => p.category === current.category).slice(0,3);
    const related = same.length >= 2 ? same : others.slice(0,3);
    if (!related.length) return;

    const slugOf = p => p.title.toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'');
    container.innerHTML = `
<div style="margin:60px 0">
  <span class="eyebrow" style="display:block;margin-bottom:24px">You Might Also Like</span>
  <div style="display:flex;flex-direction:column;gap:16px">
    ${related.map(p => `
    <a href="post.html?slug=${encodeURIComponent(slugOf(p))}"
       style="display:flex;align-items:center;gap:16px;background:white;border-radius:var(--r-md);padding:16px;box-shadow:var(--shadow-sm);text-decoration:none;transition:var(--trans)"
       onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform=''">
      <div style="width:72px;height:72px;border-radius:12px;overflow:hidden;flex-shrink:0;background:var(--teal-faint);display:flex;align-items:center;justify-content:center">
        ${p.cover_image ? `<img src="${p.cover_image}" alt="${p.title}" style="width:100%;height:100%;object-fit:cover"/>` : `<span style="font-size:28px">📖</span>`}
      </div>
      <div style="flex:1">
        <span style="font-size:10px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--teal);display:block;margin-bottom:4px">${catLabel[p.category]||p.category}</span>
        <h4 style="font-family:'Cormorant Garamond',serif;font-size:17px;font-weight:600;color:var(--charcoal);line-height:1.3">${p.title}</h4>
        <small style="font-size:12px;color:var(--text-light)">${fmtDate(p.date)}</small>
      </div>
      <span style="color:var(--teal);font-size:18px;flex-shrink:0">→</span>
    </a>`).join('')}
  </div>
</div>`;
  };

  // ── Main post renderer ────────────────────────────────────────
  async function renderPost() {
    const slug = getSlug();
    const postContainer  = document.getElementById('post-container');
    const prevNextEl     = document.getElementById('prevnext-container');
    const relatedEl      = document.getElementById('related-container');

    if (!postContainer) return;

    if (!slug) {
      postContainer.innerHTML = `<div style="text-align:center;padding:80px 24px">
        <h2 style="font-family:'Cormorant Garamond',serif;font-size:36px;color:var(--charcoal)">Post not found</h2>
        <a href="../blog.html" class="btn btn-outline" style="margin-top:24px">Back to Blog</a>
      </div>`;
      return;
    }

    // Show loading state
    postContainer.innerHTML = `<div style="text-align:center;padding:80px 24px">
      <div class="skeleton" style="height:400px;border-radius:var(--r-lg);margin-bottom:40px"></div>
      <div class="skeleton skeleton-line title" style="width:60%;margin:0 auto 16px"></div>
      <div class="skeleton skeleton-line" style="width:80%;margin:0 auto 10px"></div>
      <div class="skeleton skeleton-line short" style="width:40%;margin:0 auto"></div>
    </div>`;

    // Load all posts for prev/next/related
    let allPosts = [];
    try { allPosts = await safeFetch(dataUrl('blog/all.json')); } catch { /* ok */ }

    // Find the post by slug
    const slugOf = p => p.title.toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'');
    let post = allPosts.find(p => slugOf(p) === slug);

    if (!post) {
      postContainer.innerHTML = `<div style="text-align:center;padding:80px 24px">
        <span style="font-size:48px">📖</span>
        <h2 style="font-family:'Cormorant Garamond',serif;font-size:36px;color:var(--charcoal);margin:16px 0">Post not found</h2>
        <p style="color:var(--text-mid);margin-bottom:28px">This post may have moved or been unpublished.</p>
        <a href="../blog.html" class="btn btn-outline">Back to Blog</a>
      </div>`;
      return;
    }

    // Set Open Graph
    const postUrl = window.location.href;
    setOG(post.title, post.excerpt, post.cover_image, postUrl);

    const rt = readTime((post.body || '') + ' ' + (post.excerpt || ''));

    postContainer.innerHTML = `

<!-- Cover image hero -->
<div class="post-cover" style="position:relative;height:480px;overflow:hidden;border-radius:var(--r-lg);margin-bottom:48px">
  ${post.cover_image
    ? `<img src="${post.cover_image}" alt="${post.title}" style="width:100%;height:100%;object-fit:cover"/>`
    : `<div style="width:100%;height:100%;background:linear-gradient(135deg,var(--charcoal) 0%,var(--teal-mid) 100%);display:flex;align-items:center;justify-content:center;font-size:80px">📖</div>`}
  <div style="position:absolute;inset:0;background:linear-gradient(to bottom,transparent 30%,rgba(26,26,46,.8) 100%)"></div>
  <div style="position:absolute;bottom:40px;left:40px;right:40px">
    <span style="display:inline-block;font-size:10px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;background:var(--teal);color:white;padding:5px 14px;border-radius:100px;margin-bottom:14px">${catLabel[post.category] || post.category}</span>
    <h1 style="font-family:'Cormorant Garamond',serif;font-size:clamp(28px,4vw,52px);font-weight:300;font-style:italic;color:white;line-height:1.1;margin-bottom:12px">${post.title}</h1>
    ${post.excerpt ? `<p style="font-size:16px;color:rgba(255,255,255,.75);line-height:1.65;max-width:680px">${post.excerpt}</p>` : ''}
  </div>
</div>

<!-- Post meta row -->
<div style="display:flex;align-items:center;flex-wrap:wrap;gap:16px;margin-bottom:32px;padding-bottom:24px;border-bottom:1px solid var(--cream-deep)">
  <span style="font-size:13.5px;font-weight:600;color:var(--charcoal)">${post.author || 'Shaykhah Rukayya Samsodien'}</span>
  <span style="color:var(--cream-deep)">·</span>
  <span style="font-size:13px;color:var(--text-light)">${fmtDate(post.date)}</span>
  <span style="color:var(--cream-deep)">·</span>
  <span style="font-size:13px;color:var(--text-light)">${rt} min read</span>
</div>

<!-- Share buttons -->
${shareButtons(post.title, postUrl)}

<!-- Audio player -->
${post.audio_file ? audioPlayer(post.audio_file) : ''}

<!-- PDF download -->
${post.pdf_file ? pdfCard(post.pdf_file) : ''}

<!-- YouTube embed -->
${post.youtube_embed ? `
<div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:var(--r-md);margin:32px 0">
  <iframe src="${toEmbedUrl(post.youtube_embed)}" style="position:absolute;inset:0;width:100%;height:100%;border:none;border-radius:var(--r-md)" allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture" allowfullscreen title="${post.title}"></iframe>
</div>` : ''}

<!-- Post body -->
<hr style="border:none;border-top:1px solid var(--cream-deep);margin:32px 0"/>
<div class="post-body-content" style="font-size:16px;line-height:1.9;color:var(--text);max-width:720px">
  ${mdToHtml(post.body)}
</div>

<!-- Bottom share buttons -->
<div style="margin-top:48px;padding-top:28px;border-top:1px solid var(--cream-deep)">
  <p style="font-size:12px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--text-light);margin-bottom:14px">Share this post</p>
  ${shareButtons(post.title, postUrl)}
</div>

<!-- Back to blog -->
<a href="../blog.html" class="btn btn-outline" style="margin-top:32px;display:inline-flex">← Back to Blog</a>
`;

    // Apply Arabic font to Arabic text within body
    document.querySelectorAll('.post-body-content').forEach(el => {
      el.querySelectorAll('h1,h2,h3').forEach(h => {
        h.style.fontFamily = "'Cormorant Garamond', serif";
        h.style.color = 'var(--charcoal)';
        h.style.marginBottom = '12px';
        h.style.marginTop = '32px';
      });
    });

    attachAudioListeners();
    attachCopyLink();

    // Prev/Next and Related
    renderPrevNext(allPosts, slug, prevNextEl);
    renderRelated(allPosts, post, relatedEl);
  }

  // ── Newsletter signup on post page ────────────────────────────
  function initNewsletterSection() {
    const el = document.getElementById('post-newsletter');
    if (!el) return;
    el.innerHTML = `
<section style="background:var(--charcoal);padding:80px 0;position:relative;overflow:hidden;margin-top:60px">
  <div style="position:absolute;top:-80px;right:-80px;width:400px;height:400px;background:radial-gradient(ellipse,rgba(0,158,168,.12) 0%,transparent 68%);border-radius:55% 45% 40% 60%;pointer-events:none"></div>
  <div class="wrap" style="max-width:600px;text-align:center;position:relative;z-index:2">
    <span class="eyebrow" style="display:block;margin-bottom:16px">Stay Connected</span>
    <h2 style="font-family:'Cormorant Garamond',serif;font-size:clamp(28px,4vw,44px);font-weight:300;color:white;margin-bottom:14px">Get updates from Baseerah</h2>
    <p style="font-size:15px;color:rgba(255,255,255,.6);line-height:1.78;margin-bottom:32px">New articles, event announcements, and early registration — delivered to your inbox. No spam, ever.</p>
    <form name="newsletter" method="POST" data-netlify="true" netlify-honeypot="bot-field" style="display:flex;gap:12px;flex-wrap:wrap;justify-content:center">
      <input type="hidden" name="form-name" value="newsletter"/>
      <input type="hidden" name="bot-field"/>
      <input type="email" name="email" placeholder="Your email address" required
             style="font-family:'DM Sans',sans-serif;font-size:14px;padding:15px 20px;border:1.5px solid rgba(255,255,255,.15);border-radius:100px;background:rgba(255,255,255,.08);color:white;outline:none;flex:1;min-width:240px"/>
      <button type="submit" class="btn btn-primary">Subscribe</button>
    </form>
  </div>
</section>`;
  }

  // ── Bootstrap ─────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    renderPost();
    initNewsletterSection();
  });

})();
