/* cardview.js — shared card rendering for The Vault's public pages (share.html / s.html / d.html / u.html).
   Gives those pages the same card richness as the in-app inventory:
     • CV.cardImg(stored, name, set)  → a full-card image URL, falling back to Scryfall by name(+set)
                                        when the shared blob has no image (e.g. buy lists / unowned cards).
     • CV.enrich(rootEl)              → batch-fetches type_line + rarity for every [data-cv-name] tile and
                                        paints the inventory-style type/rarity "marks" pill onto each.
     • CV.open(name, set, stored, o)  → a rich card viewer: full art + type line + mana cost + rarity + set
                                        + price + Scryfall link (fetched on demand).
   Depends only on a global tr() (from i18n.js) when present; otherwise falls back to the English source. */
(function () {
  'use strict';
  const SCRY = 'https://api.scryfall.com';
  const T = (k, p) => (typeof window.tr === 'function' ? window.tr(k, p) : interp(k, p));
  function interp(k, p) { return p ? String(k).replace(/\{(\w+)\}/g, (m, x) => (p[x] != null ? p[x] : m)) : k; }
  const E = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const safe = (u) => /^https:\/\/[^'"()\s]+$/.test(String(u || '')) ? String(u) : '';
  const lc = (s) => String(s || '').trim().toLowerCase();
  const frontFace = (n) => String(n || '').split('//')[0].trim();   // DFC / split → front face for exact lookups
  const money = (n) => (typeof window.money === 'function') ? window.money(n) : ('$' + (Number(n) || 0).toFixed(2));
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  /* ---------- type / rarity / mana glyphs (mirror app.js so the marks match the inventory) ---------- */
  const TYPE_ICON = { Creatures: 'ms-creature', Planeswalkers: 'ms-planeswalker', Instants: 'ms-instant', Sorceries: 'ms-sorcery', Artifacts: 'ms-artifact', Enchantments: 'ms-enchantment', Lands: 'ms-land', Other: 'ms-multiple' };
  const RARITY_LABEL = { common: 'Common', uncommon: 'Uncommon', rare: 'Rare', mythic: 'Mythic', special: 'Special', bonus: 'Bonus' };
  function category(typeLine) {
    const t = lc(typeLine).split(' // ')[0];   // categorise by the front face, same precedence as app.js
    if (t.includes('land')) return 'Lands';
    if (t.includes('creature')) return 'Creatures';
    if (t.includes('planeswalker')) return 'Planeswalkers';
    if (t.includes('instant')) return 'Instants';
    if (t.includes('sorcery')) return 'Sorceries';
    if (t.includes('artifact')) return 'Artifacts';
    if (t.includes('enchantment')) return 'Enchantments';
    return 'Other';
  }
  function typeIconClass(typeLine) {
    const tl = lc(typeLine);
    if (tl.includes('saga')) return 'ms-saga';
    if (tl.includes('token')) return 'ms-token';
    return TYPE_ICON[category(typeLine)] || 'ms-multiple';
  }
  function typeIcon(typeLine) {
    return `<i class="ms ${typeIconClass(typeLine)} type-ico" title="${E(T(category(typeLine)))}" aria-hidden="true"></i>`;
  }
  function rarityIcon(rarity) {
    if (!rarity) return '';
    return `<i class="ms ms-rarity rar rar-${E(rarity)}" title="${E(T(RARITY_LABEL[rarity] || rarity))}" aria-hidden="true"></i>`;
  }
  function manaSymbols(cost) {
    if (!cost) return '';
    const toks = String(cost).match(/\{[^}]+\}/g) || [];
    if (!toks.length) return '';
    return '<span class="mc">' + toks.map(t => {
      const s = t.slice(1, -1).toLowerCase().replace(/\//g, '');
      return `<i class="ms ms-cost ms-shadow ms-${E(s)}" aria-hidden="true"></i>`;
    }).join('') + '</span>';
  }

  /* ---------- Scryfall card data, batch-fetched and cached by lowercased name ---------- */
  const cache = new Map();   // lc(name) → { name, type_line, mana_cost, rarity, set, set_name, price, foilPrice, uri, image, art }
  function distill(c) {
    const f = (c.card_faces && c.card_faces[0]) || c;
    const iu = c.image_uris || f.image_uris || {};
    const usd = c.prices && (c.prices.usd || c.prices.usd_foil);
    return {
      name: c.name, type_line: c.type_line || f.type_line || '', mana_cost: c.mana_cost || f.mana_cost || '',
      rarity: c.rarity || '', set: (c.set || '').toUpperCase(), set_name: c.set_name || '',
      price: Number(c.prices && c.prices.usd) || 0, foilPrice: Number(c.prices && c.prices.usd_foil) || 0,
      uri: c.scryfall_uri || '', image: iu.normal || iu.large || '', art: iu.art_crop || ''
    };
  }
  function commit(c) { const d = distill(c); cache.set(lc(d.name), d); cache.set(lc(frontFace(d.name)), d); return d; }
  // Batch-resolve a set of card names (Scryfall /cards/collection, 75 per request). Resolves only the misses.
  async function fetchMany(names) {
    const want = [...new Set(names.map(lc))].filter(n => n && !cache.has(n));
    for (let i = 0; i < want.length; i += 75) {
      const chunk = want.slice(i, i + 75).map(n => ({ name: frontFace(n) }));
      try {
        const r = await fetch(SCRY + '/cards/collection', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identifiers: chunk }) });
        if (r.ok) { const j = await r.json(); (j.data || []).forEach(commit); }
      } catch (e) { /* offline — leave them un-enriched */ }
      if (i + 75 < want.length) await sleep(90);   // be polite to Scryfall between chunks
    }
    // any still missing (not found) → cache an empty stub so we don't refetch forever
    want.forEach(n => { if (!cache.has(n)) cache.set(n, null); });
  }
  // Resolve ONE card, honouring the requested set/printing, for the viewer.
  async function fetchOne(name, set) {
    const k = lc(name);
    if (cache.has(k) && cache.get(k)) {
      const d = cache.get(k);
      if (!set || lc(d.set) === lc(set)) return d;   // cached printing already matches (or no set asked)
    }
    const base = SCRY + '/cards/named?exact=' + encodeURIComponent(frontFace(name));
    let c = null;
    try { let r = await fetch(base + (set ? '&set=' + encodeURIComponent(lc(set)) : '')); if (r.ok) c = await r.json(); } catch (e) {}
    if ((!c || c.object !== 'card') && set) { try { let r = await fetch(base); if (r.ok) c = await r.json(); } catch (e) {} }
    return (c && c.object === 'card') ? commit(c) : (cache.get(k) || null);
  }

  /* ---------- image URLs ---------- */
  function imgUrl(name, set, version) {
    let u = SCRY + '/cards/named?exact=' + encodeURIComponent(frontFace(name)) + '&format=image&version=' + (version || 'normal');
    if (set) u += '&set=' + encodeURIComponent(lc(set));
    return u;
  }
  // Prefer the sharer's stored image (their exact printing); otherwise pull it straight from Scryfall.
  function cardImg(stored, name, set, version) { return safe(stored) || imgUrl(name, set, version); }

  /* ---------- tile enrichment: paint inventory-style type/rarity marks onto [data-cv-name] tiles ---------- */
  async function enrich(root) {
    root = root || document;
    const tiles = [...root.querySelectorAll('[data-cv-name]')].filter(el => !el.__cvMarked);
    if (!tiles.length) return;
    tiles.forEach(el => { el.__cvMarked = true; });
    await fetchMany(tiles.map(el => el.getAttribute('data-cv-name')));
    tiles.forEach(el => {
      const d = cache.get(lc(el.getAttribute('data-cv-name')));
      if (!d) return;
      const marks = (d.type_line ? typeIcon(d.type_line) : '') + rarityIcon(d.rarity);
      if (!marks) return;
      const art = el.querySelector('.tile-art, .topc-art, .cv-art-host') || el;
      if (art.querySelector('.cv-marks')) return;
      const span = document.createElement('span');
      span.className = 'cv-marks';
      span.innerHTML = marks;
      art.appendChild(span);
    });
  }

  /* ---------- rich card viewer (its own overlay so every page behaves identically) ---------- */
  let overlay = null, lastFocus = null, openSeq = 0;
  function ensureOverlay() {
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.id = 'cv2';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.innerHTML = `<button class="cv2-close" type="button" aria-label="${E(T('Close'))}">✕</button><div class="cv2-card" role="dialog" aria-modal="true"></div>`;
    overlay.addEventListener('click', e => { if (e.target === overlay || e.target.closest('.cv2-close')) close(); });
    document.body.appendChild(overlay);
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && overlay.classList.contains('on')) close(); });
    return overlay;
  }
  function metaHtml(d, name, set, o) {
    const qtyFoil = [(o && o.qty) ? `${o.qty}×` : '', (o && o.foil) ? `✦ ${E(T('Foil'))}` : ''].filter(Boolean).join(' · ');
    const rare = d && d.rarity ? `${rarityIcon(d.rarity)} ${E(T(RARITY_LABEL[d.rarity] || d.rarity))}` : '';
    const setStr = d && d.set ? `${E(d.set)}${d.set_name ? ' · ' + E(d.set_name) : ''}` : (set ? E(String(set).toUpperCase()) : '');
    const price = (o && o.price) ? Number(o.price) : (d ? (d.price || d.foilPrice) : 0);
    const tagBits = [setStr, price ? money(price) : ''].filter(Boolean).join(' · ');
    const uri = d && d.uri ? d.uri : '';
    return `<div class="cv2-meta">
        <div class="cv2-name">${E(name)}</div>
        ${qtyFoil ? `<div class="cv2-sub">${qtyFoil}</div>` : ''}
        ${d && d.type_line ? `<div class="cv2-type">${typeIcon(d.type_line)} ${E(d.type_line)}</div>` : ''}
        ${d && d.mana_cost ? `<div class="cv2-cost">${manaSymbols(d.mana_cost)}</div>` : ''}
        ${(rare || tagBits) ? `<div class="cv2-tags">${rare}${rare && tagBits ? ' · ' : ''}${tagBits}</div>` : ''}
        ${safe(uri) ? `<a class="cv2-link" href="${safe(uri)}" target="_blank" rel="noopener">${E(T('View on Scryfall ↗'))}</a>` : ''}
      </div>`;
  }
  function open(name, set, stored, o) {
    o = o || {};
    if (!name) return;
    const ov = ensureOverlay();
    const box = ov.querySelector('.cv2-card');
    const seq = ++openSeq;
    const img = cardImg(stored, name, set);
    const cached = cache.get(lc(name));
    box.innerHTML = `<img class="cv2-img" src="${safe(img)}" alt="${E(name)}" onerror="this.style.display='none'" />${metaHtml(cached, name, set, o)}`;
    lastFocus = document.activeElement;
    ov.classList.add('on'); ov.setAttribute('aria-hidden', 'false');
    const closeBtn = ov.querySelector('.cv2-close'); if (closeBtn) closeBtn.focus();
    // fetch full details (type/mana/rarity/set/price) and repaint the meta when they land
    fetchOne(name, set).then(d => {
      if (seq !== openSeq || !ov.classList.contains('on')) return;   // a newer open() or a close() superseded us
      if (!d) return;
      const m = box.querySelector('.cv2-meta');
      if (m) m.outerHTML = metaHtml(d, name, set, o);
    });
  }
  function close() {
    if (!overlay) return;
    overlay.classList.remove('on'); overlay.setAttribute('aria-hidden', 'true');
    openSeq++;
    if (lastFocus && lastFocus.focus) { try { lastFocus.focus(); } catch (e) {} }
  }

  /* ---------- injected styles (use each page's shared theme vars) ---------- */
  function injectCss() {
    const css = `
    .cv-marks { position: absolute; bottom: 7px; left: 7px; z-index: 3; display: inline-flex; align-items: center; gap: 5px;
      padding: 3px 7px; border-radius: 99px; background: rgba(12,10,15,.62); border: 1px solid rgba(201,162,39,.22);
      backdrop-filter: blur(3px); box-shadow: 0 2px 6px rgba(0,0,0,.5); pointer-events: none; }
    .cv-marks .ms { font-size: 12px; line-height: 1; }
    .type-ico { font-size: 14px; color: var(--brass, #b08d57); line-height: 1; vertical-align: -1px; flex-shrink: 0; }
    .cv-marks .type-ico { color: var(--parch-dim, #cdb9a3); }
    .rar { font-size: 13px; line-height: 1; vertical-align: -1px; flex-shrink: 0; }
    .rar-common { color: #878c93; } .rar-uncommon { color: #a6c8da; }
    .rar-rare { color: #e9c24a; text-shadow: 0 0 4px rgba(233,194,74,.5); }
    .rar-mythic { color: #f0622b; text-shadow: 0 0 5px rgba(240,98,43,.6); }
    .rar-special, .rar-bonus { color: var(--gold, #c9a227); text-shadow: 0 0 5px rgba(201,162,39,.5); }
    .mc { display: inline-flex; gap: 3px; align-items: center; vertical-align: middle; }
    .mc .ms { font-size: 15px; }
    #cv2 { position: fixed; inset: 0; z-index: 60; display: none; align-items: center; justify-content: center; padding: 24px;
      background: rgba(8,6,11,.86); backdrop-filter: blur(6px); }
    #cv2.on { display: flex; }
    #cv2 .cv2-card { display: flex; flex-direction: column; align-items: center; gap: 14px; max-width: 92vw; max-height: 92vh; overflow-y: auto; }
    #cv2 .cv2-img { width: 360px; max-width: 80vw; border-radius: 16px; box-shadow: 0 30px 70px -20px #000; display: block; }
    #cv2 .cv2-meta { text-align: center; max-width: 360px; }
    #cv2 .cv2-name { font-family: var(--display, Georgia, serif); font-size: 23px; color: var(--parch, #efe6d2); line-height: 1.2; }
    #cv2 .cv2-sub { font-family: var(--label, system-ui); font-size: 12px; color: var(--muted, #9a8f7d); margin-top: 4px; letter-spacing: .03em; }
    #cv2 .cv2-type { font-family: var(--mono, monospace); font-size: 13px; color: var(--parch-dim, #cdb9a3); margin-top: 9px; }
    #cv2 .cv2-type .type-ico { color: var(--gold-soft, #e3c766); margin-right: 7px; font-size: 15px; }
    #cv2 .cv2-cost { margin-top: 8px; }
    #cv2 .cv2-tags { font-family: var(--label, system-ui); font-size: 12.5px; color: var(--muted, #9a8f7d); margin-top: 9px; letter-spacing: .02em; }
    #cv2 .cv2-tags .ms-rarity { margin-right: 3px; }
    #cv2 .cv2-link { display: inline-block; margin-top: 13px; font-family: var(--label, system-ui); font-size: 12px; color: var(--gold-soft, #e3c766); text-decoration: none; border-bottom: 1px solid rgba(201,162,39,.4); padding-bottom: 1px; }
    #cv2 .cv2-link:hover { color: var(--gold, #c9a227); }
    #cv2 .cv2-close { position: fixed; top: 18px; right: 22px; font-size: 26px; color: var(--parch-dim, #cdb9a3); background: none; border: none; cursor: pointer; line-height: 1; }
    #cv2 .cv2-close:hover { color: var(--gold-soft, #e3c766); }`;
    const st = document.createElement('style'); st.id = 'cv2-style'; st.textContent = css; document.head.appendChild(st);
  }

  injectCss();
  window.CV = { cardImg, enrich, open, close, fetchMany, _cache: cache };
})();
