(function () {

  /* ─── capture loader path synchronously (currentScript is null in defer/async) ─── */
  var _cs  = document.currentScript;
  var loaderSrc = _cs ? _cs.src : '';
  var loaderDir = loaderSrc ? loaderSrc.replace(/[^/]+$/, '') : location.href.replace(/[^/]+$/, '');
  var rootURL   = loaderSrc ? new URL('../', loaderSrc).href : location.origin + '/';

  /* ─── inject full CSS ─── */
  var style = document.createElement('style');
  style.textContent = [
    '*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }',
    ':root {',
    '  --red: #e03418; --red-hot: #ff5c2b; --red-dark: #8b1a1a;',
    '  --red-glow: rgba(224,52,24,0.25); --red-glow-soft: rgba(224,52,24,0.1);',
    '  --bg: #0a0a0a; --surface: #111; --surface2: #161616;',
    '  --border: #1e1e1e; --text: #eae4dc; --text-dim: #b0b0b0;',
    '  --yellow: #f5c542; --yellow-glow: rgba(245,197,66,0.2);',
    '}',
    'html { scroll-behavior: smooth; background: var(--bg); }',
    'body { background: transparent; color: var(--text); font-family: \'Chakra Petch\', sans-serif; overflow-x: hidden; cursor: crosshair; line-height: 1.6; }',
    '#dither-bg { position: fixed; inset: 0; width: 100%; height: 100%; z-index: 0; pointer-events: none; }',
    '::selection { background: var(--red-glow); color: var(--text); }',
    '::-webkit-scrollbar { width: 4px; }',
    '::-webkit-scrollbar-track { background: var(--bg); }',
    '::-webkit-scrollbar-thumb { background: var(--border); }',
    '::-webkit-scrollbar-thumb:hover { background: var(--red); }',
    '.scanlines { position: fixed; inset: 0; background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,.18) 2px, rgba(0,0,0,.18) 4px); pointer-events: none; z-index: 9998; }',
    '.vignette { position: fixed; inset: 0; background: radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,.70) 100%); pointer-events: none; z-index: 9997; }',
    '.progress-bar { position: fixed; bottom: 0; left: 0; height: 2px; background: var(--red); width: 0%; z-index: 10001; box-shadow: 0 0 8px var(--red-glow); transition: width .1s linear; }',

    /* nav */
    'nav { position: fixed; top: 0; left: 0; right: 0; z-index: 9999; display: flex; justify-content: space-between; align-items: center; padding: 16px 32px; background: rgba(10,10,10,.88); border-bottom: 1px solid var(--border); backdrop-filter: blur(6px); }',
    '.nav-logo { font-family: \'Press Start 2P\', monospace; font-size: 10px; color: var(--red); text-shadow: 0 0 8px var(--red-glow); letter-spacing: 2px; text-decoration: none; }',
    '.nav-links { display: flex; gap: 24px; list-style: none; }',
    '.nav-links a { font-family: \'IBM Plex Mono\', monospace; font-size: 12px; color: var(--text-dim); text-decoration: none; text-transform: uppercase; letter-spacing: 2px; transition: color .2s, text-shadow .2s; }',
    '.nav-links a:hover, .nav-links a.active { color: var(--red); text-shadow: 0 0 6px var(--red-glow); }',
    '.nav-left { display: flex; align-items: center; gap: 20px; }',
    '.nav-back { font-family: \'IBM Plex Mono\', monospace; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: var(--text-dim); text-decoration: none; transition: color .2s; border: 1px solid var(--border); padding: 6px 12px; }',
    '.nav-back:hover { color: var(--red); border-color: var(--red-dark); }',

    /* article shell */
    '.article-wrap { position: relative; z-index: 1; max-width: 980px; margin: 0 auto; padding: 120px 40px 100px; }',
    '.back-link { display: inline-flex; align-items: center; gap: 8px; font-family: \'IBM Plex Mono\', monospace; font-size: 12px; letter-spacing: 2px; text-transform: uppercase; color: var(--text-dim); text-decoration: none; margin-bottom: 48px; transition: color .2s; }',
    '.back-link:hover { color: var(--red); }',
    '.article-source { font-family: \'IBM Plex Mono\', monospace; font-size: 12px; letter-spacing: 3px; text-transform: uppercase; color: var(--red); margin-bottom: 16px; }',
    '.article-title { font-family: \'Chakra Petch\', sans-serif; font-weight: 700; font-size: clamp(32px, 5vw, 52px); line-height: 1.2; color: var(--text); margin-bottom: 24px; letter-spacing: 0.5px; }',
    '.article-byline { font-family: \'IBM Plex Mono\', monospace; font-size: 13px; letter-spacing: 2px; color: var(--text-dim); display: flex; align-items: center; gap: 16px; margin-bottom: 40px; flex-wrap: wrap; }',
    '.article-byline-sep { width: 1px; height: 12px; background: var(--border); flex-shrink: 0; }',
    '.article-divider { width: 100%; height: 1px; background: linear-gradient(to right, var(--red), transparent); margin-bottom: 48px; opacity: 0.5; }',

    /* body text */
    '.article-body p { font-size: 18px; line-height: 1.85; color: var(--text); margin-bottom: 1.5em; }',
    '.article-body p:first-of-type::first-letter { font-size: 3.2em; font-weight: 700; line-height: 0.85; float: left; margin-right: 8px; margin-top: 4px; color: var(--red); text-shadow: 0 0 12px var(--red-glow); }',
    '.article-body h2 { font-family: \'Chakra Petch\', sans-serif; font-weight: 700; font-size: 24px; color: var(--text); margin: 2.5em 0 1em; padding-left: 14px; border-left: 3px solid var(--red); letter-spacing: 1px; text-transform: uppercase; }',
    '.article-body h3 { font-family: \'Chakra Petch\', sans-serif; font-weight: 600; font-size: 16px; color: var(--text-dim); margin: 2em 0 0.75em; padding-left: 14px; border-left: 3px solid var(--red-dark); text-transform: uppercase; letter-spacing: 2px; }',
    '.article-body a { color: var(--text-dim); text-decoration: underline; text-underline-offset: 3px; transition: color .2s; }',
    '.article-body a:hover { color: var(--red); }',
    '.article-body blockquote { border-left: 3px solid var(--red); background: var(--surface); padding: 20px 24px; margin: 2em 0; font-style: italic; font-size: 19px; color: var(--text); line-height: 1.7; }',
    '.article-body blockquote cite { display: block; margin-top: 10px; font-style: normal; font-family: \'IBM Plex Mono\', monospace; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: var(--red); }',

    /* placeholder */
    '.placeholder-note { font-family: \'IBM Plex Mono\', monospace; font-size: 12px; color: var(--red-dark); border: 1px dashed var(--red-dark); padding: 8px 14px; margin-bottom: 1.5em; background: rgba(139,26,26,0.06); letter-spacing: 1px; }',

    /* annotation — base (shared between inline mobile and margin desktop) */
    '.annotation-label { font-family: \'IBM Plex Mono\', monospace; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: var(--yellow); opacity: 0.55; display: block; margin-bottom: 8px; }',
    '.annotation p { font-size: 13px !important; line-height: 1.7; color: rgba(245,197,66,0.72) !important; margin-bottom: 0.5em !important; }',
    '.annotation p:last-child { margin-bottom: 0 !important; }',
    '.annotation p::first-letter { all: unset !important; float: none !important; font-size: inherit !important; color: inherit !important; text-shadow: none !important; }',
    '.annotation a { color: rgba(245,197,66,0.55); text-decoration: underline; text-underline-offset: 3px; transition: color .2s; }',
    '.annotation a:hover { color: var(--yellow); }',
    '.annotation strong { color: rgba(245,197,66,0.9); font-weight: 600; }',
    '.annotation em { font-style: italic; }',

    /* ── MARGIN ANNOTATION GRID LAYOUT ── */
    '.article-body { display: grid; grid-template-columns: 1fr 240px; column-gap: 52px; align-items: start; }',
    '.article-body > * { grid-column: 1; min-width: 0; }',
    /* annotations go to column 2 */
    '.article-body > .annotation { grid-column: 2; align-self: start; margin: 0; padding: 0 0 0 14px; border-left: 2px solid rgba(245,197,66,0.22); background: none; }',
    /* hr spans both columns */
    '.article-body > hr.article-hr { grid-column: 1 / -1; border: none; border-top: 1px solid var(--border); margin: 3em 0; }',
    /* Q&A: full width, sub-grid for its own annotations */
    '.article-body > .article-qa { grid-column: 1 / -1; display: grid; grid-template-columns: 1fr 240px; column-gap: 52px; align-items: start; }',
    '.article-qa > * { grid-column: 1; min-width: 0; }',
    '.article-qa > .annotation { grid-column: 2; align-self: start; margin: 0; padding: 0 0 0 14px; border-left: 2px solid rgba(245,197,66,0.22); background: none; }',

    /* img credit */
    '.img-credit { font-family: \'IBM Plex Mono\', monospace; font-size: 11px; color: var(--text-dim); opacity: 0.45; letter-spacing: 1px; margin-bottom: 2em; margin-top: -0.5em; }',

    /* Q&A standalone styles */
    '.article-qa { margin-top: 0; }',
    '.qa-question { font-family: \'Chakra Petch\', sans-serif; font-weight: 700; font-size: 20px; color: var(--text); margin: 2em 0 0.75em; }',
    '.qa-answer { font-size: 18px; line-height: 1.85; color: var(--text); margin-bottom: 1em; }',
    '.qa-answer::first-letter { all: unset; }',

    'footer { text-align: center; padding: 24px; border-top: 1px solid var(--border); font-family: \'IBM Plex Mono\', monospace; font-size: 10px; color: var(--text-dim); letter-spacing: 2px; position: relative; z-index: 1; }',
    '.fade-in { opacity: 0; transform: translateY(20px); transition: opacity .7s ease, transform .7s ease; }',
    '.fade-in.visible { opacity: 1; transform: translateY(0); }',
    '.article-loading { font-family: \'IBM Plex Mono\', monospace; font-size: 11px; letter-spacing: 3px; text-transform: uppercase; color: var(--text-dim); padding-top: 40px; opacity: 0.4; }',

    /* ── MOBILE: annotations go back inline ── */
    '@media (max-width: 900px) {',
    '  nav { padding: 12px 16px; }',
    '  .nav-links { gap: 12px; }',
    '  .nav-links a { font-size: 9px; }',
    '  .article-wrap { max-width: 720px; padding: 100px 20px 80px; }',
    '  .article-body { display: block; }',
    '  .article-body > .article-qa { display: block; }',
    '  .article-body > .annotation, .article-qa > .annotation {',
    '    margin: 1.75em 0;',
    '    padding: 14px 0 14px 20px;',
    '    border-left: 2px solid rgba(245,197,66,0.3);',
    '    background: rgba(245,197,66,0.025);',
    '  }',
    '}',
  ].join('\n');
  document.head.appendChild(style);

  /* ─── Google Fonts ─── */
  if (!document.querySelector('link[href*="googleapis"]')) {
    var fl = document.createElement('link');
    fl.rel = 'stylesheet';
    fl.href = 'https://fonts.googleapis.com/css2?family=Press+Start+2P&family=Chakra+Petch:ital,wght@0,400;0,600;0,700;1,400&family=IBM+Plex+Mono:wght@400;600&display=swap';
    document.head.appendChild(fl);
  }

  /* ─── paint background immediately ─── */
  document.documentElement.style.background = '#0a0a0a';

  /* ─── build page structure ─── */
  document.body.innerHTML =
    '<div class="progress-bar" id="progressBar"></div>' +
    '<canvas id="dither-bg"></canvas>' +
    '<div class="scanlines"></div>' +
    '<div class="vignette"></div>' +
    '<nav>' +
      '<div class="nav-left">' +
        '<a href="' + rootURL + 'index.html" class="nav-back">\u2190 Back</a>' +
        '<a href="' + rootURL + 'index.html" class="nav-logo">PB.</a>' +
      '</div>' +
      '<ul class="nav-links">' +
        '<li><a href="' + rootURL + 'index.html#video">Video</a></li>' +
        '<li><a href="' + rootURL + 'index.html#photography">Photography</a></li>' +
        '<li><a href="' + rootURL + 'index.html#content">Content</a></li>' +
        '<li><a href="' + rootURL + 'index.html#writing" class="active">Writing</a></li>' +
        '<li><a href="' + rootURL + 'index.html#contact">Contact</a></li>' +
      '</ul>' +
    '</nav>' +
    '<article class="article-wrap" id="article-root">' +
      '<div class="article-loading">Loading</div>' +
    '</article>' +
    '<footer>Pedro Brauner \u00a9 2026</footer>';

  /* ─── dither bg script ─── */
  var dSc = document.createElement('script');
  dSc.src = loaderDir + 'dither-bg.js';
  document.body.appendChild(dSc);

  /* ─── marked.js → then init ─── */
  var mSc = document.createElement('script');
  mSc.src = 'https://cdn.jsdelivr.net/npm/marked@9.1.6/marked.min.js';
  mSc.onload = initArticle;
  document.body.appendChild(mSc);

  /* ─── helpers ─── */
  function parseFrontmatter(raw) {
    var m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
    if (!m) return { meta: {}, content: raw };
    var meta = {};
    m[1].split(/\r?\n/).forEach(function (line) {
      var i = line.indexOf(':');
      if (i > -1) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim();
    });
    return { meta: meta, content: m[2] };
  }

  function readingTime(html) {
    var d = document.createElement('div');
    d.innerHTML = html;
    var words = (d.textContent || '').trim().split(/\s+/).filter(Boolean).length;
    return Math.ceil(words / 220);
  }

  function initFadeIn() {
    var els = document.querySelectorAll('.fade-in');
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e, i) {
        if (e.isIntersecting) {
          setTimeout(function () { e.target.classList.add('visible'); }, i * 80);
          obs.unobserve(e.target);
        }
      });
    }, { threshold: 0.1 });
    els.forEach(function (el) { obs.observe(el); });
  }

  /* ─── main article init (runs after marked.js loads) ─── */
  async function initArticle() {
    var slug = (window.ARTICLE_SLUG) || new URLSearchParams(location.search).get('slug');
    var root = document.getElementById('article-root');

    if (!slug) {
      root.innerHTML = '<p style="color:var(--red);font-family:\'IBM Plex Mono\',monospace;padding:2em;font-size:13px;letter-spacing:2px">No article specified.</p>';
      return;
    }

    /* configure marked: external links open in new tab */
    var renderer = new marked.Renderer();
    renderer.link = function (href, title, text) {
      var ext = href && (href.startsWith('http://') || href.startsWith('https://'));
      return '<a href="' + href + '"' +
        (ext ? ' target="_blank" rel="noopener"' : '') +
        (title ? ' title="' + title + '"' : '') +
        '>' + text + '</a>';
    };
    marked.use({ renderer: renderer, gfm: true, breaks: false });

    try {
      var res = await fetch(loaderDir + 'articles/' + slug + '.md');
      if (!res.ok) throw new Error(res.status);
      var raw = await res.text();
      var parsed = parseFrontmatter(raw);
      var rendered = marked.parse(parsed.content);
      var mins = readingTime(rendered);

      document.title = (parsed.meta.title || 'Article') + ' \u2014 Pedro Brauner';

      root.innerHTML =
        '<a href="' + rootURL + 'index.html#writing" class="back-link fade-in">\u2190 Writing</a>' +
        '<header class="fade-in">' +
          '<div class="article-source">' + (parsed.meta.source || '') + '</div>' +
          '<h1 class="article-title">' + (parsed.meta.title || '') + '</h1>' +
          '<div class="article-byline">' +
            '<span>By Pedro Brauner</span>' +
            '<span class="article-byline-sep"></span>' +
            '<span>' + (parsed.meta.byline || '') + '</span>' +
            '<span class="article-byline-sep"></span>' +
            '<span>' + mins + ' min read</span>' +
          '</div>' +
          '<div class="article-divider"></div>' +
        '</header>' +
        '<div class="article-body fade-in">' + rendered + '</div>';

      initFadeIn();

      var bar = document.getElementById('progressBar');
      window.addEventListener('scroll', function () {
        var total = document.documentElement.scrollHeight - window.innerHeight;
        if (total > 0) bar.style.width = (window.scrollY / total * 100) + '%';
      }, { passive: true });

    } catch (err) {
      root.innerHTML = '<p style="color:var(--red);font-family:\'IBM Plex Mono\',monospace;padding:2em;font-size:13px;letter-spacing:2px">Article not found.</p>';
    }
  }

})();
