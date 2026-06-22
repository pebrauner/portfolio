/* =====================================================================
   The Vault — MTG collection & deck tracker
   Vanilla JS · Scryfall data · localStorage persistence
   ===================================================================== */
'use strict';

const STORE_KEY = 'mtg-vault-v1';
const SCRYFALL = 'https://api.scryfall.com/cards/collection';

/* ---------- prefs constants (must exist before load()/migrate() run at boot) ---------- */
const THEMES = ['grimoire', 'arcane', 'tome', 'verdant', 'ember'];
const TILE_MIN = 110, TILE_MAX = 280, TILE_DEF = 168;
function clampTile(n) { n = Number(n); if (!Number.isFinite(n)) return TILE_DEF; return Math.min(TILE_MAX, Math.max(TILE_MIN, Math.round(n))); }

/* ---------- state ---------- */
let state = load();
let currentDeckId = null;
let invSearch = '';
let invAcItems = [];          // current Collection-search autocomplete suggestion names (owned cards, local)
let invAcActive = -1;         // keyboard-highlighted index in the Collection-search autocomplete
let buySearch = '';           // Buy List name filter (view-only; export/copy stay full)
let sellSearch = '';          // Sell List name filter (view-only)
let invFilter = 'all';
let invFacet = null;   // { kind:'guild', colors:['R','G'], label:'Gruul' } | { kind:'tribe', value:'Goblin' }
let invColors = [];    // selected colour filters, e.g. ['R','G']; 'C' = colourless
let invColorOnly = false; // when true, show only cards confined to the selected colours
let invType = 'all';   // category filter (matches category())
let invRarity = 'all'; // rarity filter
let invSort = 'name';  // 'name' | 'price-desc' | 'price-asc'
let buyDeckSel = [];          // deck ids to include in the buy list; [] = every deck
let buyExclude = new Set();   // name-keys kept off the buy list — derived from state.buyExclude
function rebuildBuyExclude() { buyExclude = new Set(state.buyExclude); }   // MUST run whenever `state` is reassigned (sync pull / restore)
rebuildBuyExclude();
function setBuyExclude(k, excluded) { if (excluded) buyExclude.add(k); else buyExclude.delete(k); state.buyExclude = [...buyExclude]; save(); }
let invMode = 'art';          // inventory display: 'art' gallery | 'text' list
let buyMode = 'art';          // buy list display: 'art' gallery | 'text' list
let buySort = 'price-desc';   // buy list sort: 'name' | 'price-desc' | 'price-asc' | 'rarity-desc' | 'rarity-asc' | 'color' | 'type' | 'set'
let sellMode = 'art';         // sell list display: 'art' gallery | 'text' list
let sellSort = 'price-desc';  // sell list sort (same vocabulary as buySort)
let sellMatchOpen = false;    // sell list "match a pasted wants-list" panel (transient)
let sellMatchText = '';       // the pasted list text
let sellMatchResult = null;   // { matches:[{name,want,have,price}], misses:[...] } | null
let sellMatchLoading = false; // resolving the pasted list against Scryfall
let buyMatchOpen = false;     // buy list "match a seller's haves-list" panel (transient)
let buyMatchText = '';        // the pasted seller list text
let buyMatchResult = null;    // { wants:[{name,have,need,price}], skip:[...] } | null
let buyMatchLoading = false;  // resolving the pasted list against Scryfall
let buyMatchOf = '';          // exact textarea text the current buyMatchResult was built from (drift guard)
let sellMatchOf = '';         // exact textarea text the current sellMatchResult was built from (drift guard)
let buyMatchMode = 'art';     // match-result display: 'art' gallery | 'text' list
let sellMatchMode = 'art';    // match-result display: 'art' gallery | 'text' list
let buyMatchStoreName = '';   // name of the store whose for-sale list the buy-match is running against ('' = pasted text)
let buyMatchStoreLoading = false;  // loading a store's public inventory for the buy-match
let myStoresCache = null;     // cached `my_stores` rows for the "From a store" chips (null = not fetched)
let ckById = null, ckBySku = null, ckLoading = false;   // Card Kingdom price index (in-memory, per session): by scryfall id & by "SET-COLLECTOR"
let invTile = clampTile(state.prefs.invTile);   // inventory gallery tile min-width (px)
let buyTile = clampTile(state.prefs.buyTile);   // buy list gallery tile min-width (px)
let sellTile = clampTile(state.prefs.sellTile); // sell list gallery tile min-width (px)
let deckView = state.prefs.deckView;            // deck detail display: 'list' rows | 'stacks' overlapping art
let deckTile = clampTile(state.prefs.deckTile); // stacks-view column width (px)
let deckEdit = false;                            // deck-detail recipe-editing mode (transient)
let deckShowOriginal = false;                    // deck-detail "original list" diff panel (transient)
let deckPendingDelete = null;                    // deck id awaiting delete confirmation (transient)
let deckCardFilter = 'all';                      // deck-detail card filter: 'all' | 'owned' | 'missing' (transient)
let deckAcItems = [], deckAcSeq = 0;             // add-card autocomplete state
// --- Browse (Scryfall search) — transient, in-memory only ---
let browseQuery = '';                            // last raw user text
let browseAcItems = [], browseAcActive = -1, browseAcSeq = 0;   // Browse search autocomplete (Scryfall card-name suggestions)
let browseResults = [];                          // RAW Scryfall card objects for the current query (accumulates across pages)
let browseIds = [];                              // colour-identity filter pips, e.g. ['R','G']; 'C' = colourless
let browseCmdrOnly = true;                        // Commander-first default
let browseOrder = 'edhrec';                       // Scryfall order
let browseNextPage = null;                        // next_page URL when has_more, else null
let browseTotal = 0;                              // total_cards from the response
let browseLoading = false;                        // guards double-fires
let browseSeq = 0;                                // stale-guard for out-of-order responses
let browseTile = clampTile(state.prefs.browseTile);
let browseMode = 'cards';                          // 'cards' | 'sets' | 'decks' | 'stores'
let setsCache = null, setsLoading = false;         // /sets result, loaded once per session
let browseStoresTab = 'popular';                   // 'popular' | 'mine'
let browseStoresCache = null;                      // last-rendered store list (for in-place follow updates)

function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return migrate(JSON.parse(raw));
  } catch (e) { /* ignore */ }
  return migrate({ decks: [], variants: {}, cards: {}, art: {} });
}
// Bring older saves (per-name counts in `owned`) up to the variant model.
function migrate(s) {
  s.decks ||= [];
  // Record each deck's list as first imported so later edits can be diffed/reverted.
  // Legacy decks (no record yet) are back-filled to their current list as the baseline.
  s.decks.forEach(d => { if (!d.original) d.original = (d.cards || []).map(c => ({ name: c.name, qty: c.qty })); });
  s.cards ||= {};
  s.art ||= {};   // name-key -> chosen display printing { image, art, set, set_name, collector, scryfallId }
  s.wishlist ||= {};   // name-key -> desired qty (manual buy list, fed from Browse)
  s.history ||= [];    // activity ledger: [{ t, type:'bought'|'sold'|'added'|'removed', name, qty, unit, value?, foil?, note? }]
  s.buyExclude = Array.isArray(s.buyExclude) ? s.buyExclude : [];   // name-keys the user permanently keeps OFF the buy list
  // Sell lists: multiple named "folders", each variant-id -> copies listed.
  // Migrate the old single `s.sellList` into the first folder.
  if (!Array.isArray(s.sellLists)) {
    s.sellLists = [{ id: uid(), name: 'Sell List', items: (s.sellList && typeof s.sellList === 'object') ? s.sellList : {} }];
  }
  if (!s.sellLists.length) s.sellLists.push({ id: uid(), name: 'Sell List', items: {} });
  s.sellLists.forEach(l => { l.items ||= {}; if (!l.name) l.name = 'Sell List'; });
  if (!s.activeSellList || !s.sellLists.some(l => l.id === s.activeSellList)) s.activeSellList = s.sellLists[0].id;
  delete s.sellList;
  // Buy binders: optional MANUAL "buy folders" the user fills by hand (urgency / need-now / future),
  // shown alongside the auto "Deck needs" list. items: { [nameKey]: { n: displayName, q: qty } }.
  s.buyBinders = Array.isArray(s.buyBinders) ? s.buyBinders : [];
  s.buyBinders.forEach(b => { b.items ||= {}; if (!b.id) b.id = uid(); if (!b.name) b.name = 'Binder'; });
  if (s.activeBuyBinder && !s.buyBinders.some(b => b.id === s.activeBuyBinder)) s.activeBuyBinder = null;
  if (!s.activeBuyBinder) s.activeBuyBinder = null;   // null = the auto "Deck needs" list
  if (!s.variants) {
    s.variants = {};
    if (s.owned) for (const [k, n] of Object.entries(s.owned)) {
      if (n > 0) s.variants[k] = [newVariant({ qty: n })];
    }
  }
  delete s.owned;
  // unified UI preferences (theme, gallery tile sizes, deck-detail view mode)
  s.prefs ||= {};
  s.prefs.theme = THEMES.includes(s.prefs.theme) ? s.prefs.theme : 'grimoire';
  s.prefs.invTile = clampTile(s.prefs.invTile);
  s.prefs.buyTile = clampTile(s.prefs.buyTile);
  s.prefs.sellTile = clampTile(s.prefs.sellTile);
  s.prefs.deckView = ['stacks', 'grid', 'list'].includes(s.prefs.deckView) ? s.prefs.deckView : 'list';
  s.prefs.deckTile = clampTile(s.prefs.deckTile != null ? s.prefs.deckTile : 200);
  s.prefs.browseTile = clampTile(s.prefs.browseTile);
  s.prefs.showLegality = !!s.prefs.showLegality;
  s.prefs.priceSource = (s.prefs.priceSource === 'ck') ? 'ck' : 'tcg';   // 'tcg' (TCGplayer) | 'ck' (Card Kingdom)
  s.prefs.lang = (s.prefs.lang === 'es') ? 'es' : 'en';   // UI language ('en' source | 'es'); cards always stay English
  s.ckPrices ||= {};   // persisted per-collection CK cache: { nameKey: [retail, retailFoil] }
  if (s.ckCacheV !== 2) { s.ckPrices = {}; s.ckCacheV = 2; }   // drop pre-fix (imprecise) CK cache
  return s;
}
function save() { localStorage.setItem(STORE_KEY, JSON.stringify(state)); if (typeof scheduleSyncPush === 'function') scheduleSyncPush(); }

/* ---------- helpers ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const key = (n) => n.toLowerCase();
const money = (n) => '$' + (n || 0).toFixed(2);
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

function card(name) {
  return state.cards[key(name)] || { name, type_line: 'Unknown', colors: [], price: 0, notFound: true };
}
// The art the user picked to represent this card, falling back to the fetched default printing.
const chosenArt = (name) => state.art[key(name)] || null;
const displayImage = (name) => { const a = chosenArt(name); return (a && a.image) || card(name).image || ''; };
const displayArt = (name) => { const a = chosenArt(name); return (a && a.art) || card(name).art || ''; };

/* ---------- ownership: per-variant rows ---------- */
const CONDITIONS = ['NM', 'LP', 'MP', 'HP', 'DMG'];
const COND_LABEL = { NM: 'Near Mint', LP: 'Lightly Played', MP: 'Moderately Played', HP: 'Heavily Played', DMG: 'Damaged' };
// ManaBox / common condition strings -> our codes.
const CSV_COND = { mint: 'NM', near_mint: 'NM', excellent: 'LP', good: 'LP', lightly_played: 'LP', light_played: 'LP', played: 'MP', moderately_played: 'MP', heavily_played: 'HP', poor: 'DMG', damaged: 'DMG' };

function newVariant(o = {}) {
  return {
    id: uid(),
    qty: Math.max(0, o.qty ?? 1),
    foil: !!o.foil,
    condition: o.condition || 'NM',
    set: (o.set || '').toUpperCase(),
    collector: o.collector || '',
    scryfallId: o.scryfallId || '',
    notes: o.notes || '',
    addedAt: o.addedAt ?? Date.now()   // when this copy entered the collection (for newest/oldest sort)
  };
}
// Newest acquisition time across a card's variants (0 for legacy copies with no timestamp).
const addedOf = (name) => variantsOf(name).reduce((a, v) => Math.max(a, v.addedAt || 0), 0);
const variantsOf = (name) => state.variants[key(name)] || [];
const ownedOf = (name) => variantsOf(name).reduce((a, v) => a + (v.qty || 0), 0);
const wishOf = (name) => state.wishlist[key(name)] || 0;
function addToWishlist(name, n = 1) {
  const k = key(name);
  state.wishlist[k] = Math.max(0, (state.wishlist[k] || 0) + n);
  if (!state.wishlist[k]) delete state.wishlist[k];
  save();
}

// ---- Card Kingdom prices (primary, when selected) with TCGplayer fallback ----
const ckActive = () => state.prefs.priceSource === 'ck';
// CK retail (foil-aware) matched STRICTLY to the exact printing: scryfall id first, then exact
// set code + collector number (CK's `sku`). NO coarse name/set fallback — a card can have several
// printings in one set at very different prices, so set-code alone would pick the wrong one.
// Returns 0 ("no precise CK price → use TCGplayer") rather than guessing.
function ckLookup(id, setc, coll, name, foil) {
  const pick = e => e ? (foil ? (e[1] || e[0]) : e[0]) : 0;
  if (ckById) {
    if (id) { const v = pick(ckById.get(id)); if (v > 0) return v; }
    if (setc && coll) { const v = pick(ckBySku.get(`${setc}-${coll}`.toUpperCase())); if (v > 0) return v; }
    return 0;
  }
  const c = state.ckPrices[key(name)];   // cross-session cache (by name = the card's default printing)
  return c ? pick(c) : 0;
}
function ckPriceOf(name, foil) {
  const a = chosenArt(name), meta = card(name) || {};
  const id = (a && a.scryfallId) || meta.id;
  const setc = ((a && a.set) || meta.set || '').toUpperCase();
  const coll = (a && a.collector) || meta.collector || '';
  return ckLookup(id, setc, coll, name, foil);
}

// Effective unit price = Card Kingdom retail when CK is the source & lists the card; else the
// chosen display printing's price, else the fetched default (TCGplayer). Price follows the chosen art.
function priceOf(name) {
  if (ckActive()) { const ck = ckPriceOf(name, false); if (ck > 0) return ck; }
  const a = chosenArt(name);
  if (a && a.price > 0) return a.price;
  return card(name).price || 0;
}
function foilPriceOf(name) {
  if (ckActive()) { const ck = ckPriceOf(name, true); if (ck > 0) return ck; }
  const a = chosenArt(name);
  if (a && a.price_foil > 0) return a.price_foil;
  if (a && a.price > 0) return a.price;            // chosen printing has no foil price → use its non-foil
  const meta = card(name);
  return meta.price_foil || meta.price || 0;
}
function variantPrice(name, v) {
  if (ckActive()) {
    const a = chosenArt(name), meta = card(name) || {};
    const id = v.scryfallId || (a && a.scryfallId) || meta.id;
    const setc = (v.set || (a && a.set) || meta.set || '').toUpperCase();
    const coll = v.collector || (a && a.collector) || meta.collector || '';
    const ck = ckLookup(id, setc, coll, name, !!v.foil);
    if (ck > 0) return ck;
  }
  return v.foil ? foilPriceOf(name) : priceOf(name);
}
// Names whose CK price we persist for fast cross-session lookup (the user's actual collection).
function ckRelevantNames() {
  const names = new Set();
  Object.keys(state.variants || {}).forEach(k => names.add(k));
  (state.decks || []).forEach(d => (d.cards || []).forEach(c => names.add(key(c.name))));
  Object.keys(state.wishlist || {}).forEach(k => names.add(k));
  return names;
}
function persistCKForCollection() {
  const out = {};
  ckRelevantNames().forEach(nk => {
    const name = (state.cards[nk] && state.cards[nk].name) || nk;
    const nf = ckPriceOf(name, false), f = ckPriceOf(name, true);
    if (nf > 0 || f > 0) out[nk] = [nf || 0, f || 0];
  });
  state.ckPrices = out;
}
// Fetch Card Kingdom's full pricelist (matched to Scryfall ids), build the in-memory index,
// cache the collection's prices, and switch the app to CK pricing.
// Fetch CK's pricelist and build the in-memory exact-match indexes (no side effects beyond them).
async function ensureCKIndex(force) {
  if (ckById && !force) return true;
  try {
    const res = await fetch('https://api.cardkingdom.com/api/pricelist');
    if (!res.ok) throw new Error('CK ' + res.status);
    const data = (await res.json()).data || [];
    const byId = new Map(), bySku = new Map();
    for (const e of data) {
      const r = parseFloat(e.price_retail) || 0;
      if (r <= 0) continue;
      const fi = (e.is_foil === 'true' || e.is_foil === true) ? 1 : 0;
      if (e.scryfall_id) { const cur = byId.get(e.scryfall_id) || [0, 0]; cur[fi] = r; byId.set(e.scryfall_id, cur); }
      if (e.sku) { const sk = String(e.sku).toUpperCase(); const cur = bySku.get(sk) || [0, 0]; cur[fi] = r; bySku.set(sk, cur); }
    }
    ckById = byId; ckBySku = bySku;
    return true;
  } catch (e) { return false; }
}
// Full refresh from the price control: rebuild the index, back-fill scryfall ids on old cached
// cards (so CK matches the EXACT printing, not a guess), re-cache, and switch the app to CK.
async function refreshCKPrices() {
  if (ckLoading) return;
  ckLoading = true; renderPriceSrc();
  ckById = null; ckBySku = null;
  const ok = await ensureCKIndex(true);
  if (ok) {
    const needIds = [...ckRelevantNames()]
      .filter(nk => !state.cards[nk] || !state.cards[nk].id)
      .map(nk => ({ name: (state.cards[nk] && state.cards[nk].name) || nk, qty: 1 }));
    if (needIds.length) { try { await resolveCards(needIds); } catch (e) { /* keep what we can */ } }
    persistCKForCollection();
    state.ckUpdated = Date.now();
    state.prefs.priceSource = 'ck';
    save(); render();
    toast(`Card Kingdom prices loaded — ${ckById.size.toLocaleString()} printings.`);
  } else {
    toast('Could not load Card Kingdom prices. Check your connection and try again.');
  }
  ckLoading = false; renderPriceSrc();
}
function renderPriceSrc() {
  const el = $('#priceSrc'); if (!el) return;
  el.querySelectorAll('[data-pricesrc]').forEach(b => b.classList.toggle('on', b.dataset.pricesrc === state.prefs.priceSource));
  const ref = $('#ckRefresh');
  if (ref) {
    ref.classList.toggle('spinning', ckLoading);
    const when = state.ckUpdated ? new Date(state.ckUpdated).toLocaleDateString() : 'never';
    ref.title = ckLoading ? 'Loading Card Kingdom prices…' : `Refresh Card Kingdom prices (last: ${when})`;
  }
}
function setPriceSource(src) {
  if (src === 'ck' && !ckById && !(state.ckPrices && Object.keys(state.ckPrices).length)) { refreshCKPrices(); return; }
  state.prefs.priceSource = src; save(); render();
}
function ownedValueOf(name) {
  return variantsOf(name).reduce((a, v) => a + variantPrice(name, v) * v.qty, 0);
}
// Per-copy value of a card: the richest printing owned (foil-aware), else the unit price.
function unitPrice(name) {
  const vs = variantsOf(name);
  if (vs.length) return Math.max(...vs.map(v => variantPrice(name, v)));
  return priceOf(name);
}
// Price spans for the card viewer — reflect the chosen printing.
function pricesHtml(name) {
  const p = priceOf(name), pf = foilPriceOf(name);
  const out = [];
  if (p) out.push(`<span class="cv-price">${money(p)}</span>`);
  if (pf && pf !== p) out.push(`<span class="cv-foil">${money(pf)} foil</span>`);
  return out.join('');
}
// Set/edition label for the card viewer — reflects the chosen printing when one is set.
function setTagHtml(name) {
  const a = chosenArt(name), meta = card(name);
  const set = (a && a.set) || meta.set;
  const sn = (a && a.set_name) || meta.set_name;
  return set ? `${esc(set)}${sn ? ' · ' + esc(sn) : ''}` : '';
}

// Merge a printing into a matching variant (same foil + condition + set) or add a new one.
function addVariant(name, a = {}) {
  const k = key(name);
  const list = (state.variants[k] ||= []);
  const foil = !!a.foil, condition = a.condition || 'NM', set = (a.set || '').toUpperCase();
  const m = list.find(v => v.foil === foil && (v.condition || 'NM') === condition && (v.set || '') === set);
  if (m) { m.qty += (a.qty || 1); m.addedAt = Date.now(); }   // a fresh acquisition floats this card to "newest"
  else list.push(newVariant(a));
}

// Total owned for a name, adjusting a plain "base" variant — used by steppers/toggles outside the variant editor.
function setOwned(name, n) {
  n = Math.max(0, n);
  const k = key(name);
  const list = state.variants[k] || [];
  const total = list.reduce((a, v) => a + v.qty, 0);
  const delta = n - total;
  if (delta === 0) { save(); return; }
  if (n === 0) { delete state.variants[k]; save(); return; }
  if (!list.length) { state.variants[k] = [newVariant({ qty: n })]; save(); return; }
  const base = list.find(v => !v.foil && (v.condition || 'NM') === 'NM' && !v.set);
  if (delta > 0) {
    if (base) { base.qty += delta; base.addedAt = Date.now(); } else list.push(newVariant({ qty: delta }));
  } else {
    let rem = -delta;
    const order = base ? [base, ...list.filter(v => v !== base)] : [...list];
    for (const v of order) { const take = Math.min(v.qty, rem); v.qty -= take; rem -= take; if (rem <= 0) break; }
    const kept = list.filter(v => v.qty > 0);
    if (kept.length) state.variants[k] = kept; else delete state.variants[k];
  }
  save();
}

/* =====================================================================
   HISTORY / ACTIVITY LEDGER — every inventory change is logged by day.
   types: 'bought' | 'sold' | 'added' | 'removed'  (bought/sold = money).
   ===================================================================== */
const HIST_CAP = 4000;
function sameDay(a, b) {
  const x = new Date(a), y = new Date(b);
  return x.getFullYear() === y.getFullYear() && x.getMonth() === y.getMonth() && x.getDate() === y.getDate();
}
function logEvent(type, name, qty, unit, opts = {}) {
  qty = Math.round(qty) || 0;
  if (qty <= 0) return;
  state.history ||= [];
  const e = { t: Date.now(), type, name, qty, unit: +unit || 0 };
  if (opts.value != null) e.value = +opts.value || 0;   // explicit total (bulk summaries where unit*qty isn't meaningful)
  if (opts.foil) e.foil = true;
  if (opts.note) e.note = opts.note;
  const last = state.history[state.history.length - 1];
  // coalesce rapid repeats of the same card+action within the same day (e.g. stepper spam)
  if (last && last.type === type && last.name === name && last.value == null && e.value == null
      && !last.note && !opts.note && !!last.foil === !!opts.foil && sameDay(last.t, e.t)) {
    last.qty += qty; last.t = e.t; if (e.unit) last.unit = e.unit;
    return;
  }
  state.history.push(e);
  if (state.history.length > HIST_CAP) state.history = state.history.slice(-HIST_CAP);
}
// Log a manual inventory delta (steppers, toggles, copy add/delete) as added/removed.
function logChange(name, before, after) {
  const d = (after || 0) - (before || 0);
  if (d) logEvent(d > 0 ? 'added' : 'removed', name, Math.abs(d), priceOf(name));
}
// Log an acquisition of resolved {name,qty,foil} cards: itemise a small batch,
// summarise a big one (CSV / whole-deck imports) so history isn't flooded.
function logAcquired(resolved, summaryLabel) {
  const items = (resolved || []).filter(c => (c.qty || 0) > 0);
  if (!items.length) return;
  if (items.length <= 12) {
    items.forEach(c => logEvent('added', c.name, c.qty, priceOf(c.name), { foil: !!c.foil }));
  } else {
    const copies = items.reduce((a, c) => a + c.qty, 0);
    const value = items.reduce((a, c) => a + c.qty * priceOf(c.name), 0);
    logEvent('added', summaryLabel, copies, 0, { value, note: 'bulk' });
  }
}

/* ---------- undo: snapshot-based reversal of buy/sell/delete actions ---------- */
let undoStack = [];   // session-only: [{ label, snap }] — most recent last
const UNDO_MAX = 40;
function snapshotState() {
  return JSON.stringify({
    variants: state.variants, sellLists: state.sellLists, activeSellList: state.activeSellList,
    wishlist: state.wishlist, decks: state.decks, history: state.history,
    buyBinders: state.buyBinders, activeBuyBinder: state.activeBuyBinder,
    art: state.art,   // chosen printings — so "Optimize deck" (and any printing swap) is undoable
  });
}
function pushUndo(label) {
  undoStack.push({ label, snap: snapshotState() });
  if (undoStack.length > UNDO_MAX) undoStack.shift();
  renderUndo();
}
function dropUndo() { undoStack.pop(); renderUndo(); }   // discard the last point (action turned out to be a no-op)
function undo() {
  const u = undoStack.pop();
  if (!u) { toast(tr('Nothing to undo.')); renderUndo(); return; }
  const s = JSON.parse(u.snap);
  state.variants = s.variants; state.sellLists = s.sellLists; state.activeSellList = s.activeSellList;
  state.wishlist = s.wishlist; state.decks = s.decks; state.history = s.history;
  if (s.buyBinders) state.buyBinders = s.buyBinders;   // older snapshots predate binders → leave current
  if ('activeBuyBinder' in s) state.activeBuyBinder = s.activeBuyBinder;
  if (s.art) state.art = s.art;   // older snapshots predate art capture → leave current
  currentDeckId = null;   // a restored/removed deck may no longer match the open detail view
  save(); render();
  toast(tr('Undone — {label}.', { label: u.label }));
}
function renderUndo() {
  const b = $('#undoBtn'); if (!b) return;
  const u = undoStack[undoStack.length - 1];
  b.hidden = !u;
  if (u) b.title = tr('Undo: {label}', { label: u.label });
}
const histValue = e => e.value != null ? e.value : e.qty * (e.unit || 0);

/* ---------- decklist parsing ---------- */
const SECTION_RE = /^(deck|sideboard|maybeboard|commander|companion|sb:|maindeck|lands?|creatures?|spells?|planeswalkers?)\s*:?\s*$/i;

function cleanName(raw) {
  let n = raw.trim();
  n = n.replace(/ \/ /g, ' // ');                               // split/DFC: "Road / Ruin" -> "Road // Ruin"
  // Order matters: Archidekt is "Name (set) collector [Category]", Moxfield is "Name (SET) collector *F*".
  n = n.replace(/\s*\[[^\]]*\]\s*$/, '');                       // [Category] / [Maybeboard{noDeck}…] (Archidekt)
  n = n.replace(/\s*\*[A-Za-z★]+\*\s*$/i, '');                  // *F* / *E* foil / etched / *CMDR* markers
  n = n.replace(/\s+\([A-Za-z0-9]{2,6}\)\s*[\dA-Za-z\-★]*\s*$/, ''); // (set) collector-number
  n = n.replace(/\s+#.*$/, '');                                // #trailing tags
  return n.trim();
}

function parseDecklist(text) {
  const out = new Map();
  let inCommander = false;   // track a "Commander" section so its cards are tagged
  for (let line of text.split('\n')) {
    line = line.trim();
    if (!line || line.startsWith('//')) continue;
    if (SECTION_RE.test(line)) { inCommander = /^commanders?\s*:?\s*$/i.test(line); continue; }
    const m = line.match(/^(\d+)\s*[xX]?\s+(.+)$/);
    let qty = 1, namePart = line;
    if (m) { qty = parseInt(m[1], 10); namePart = m[2]; }
    // commander markers: a Commander section, Moxfield *CMDR*, or an Archidekt [Commander…] category
    const isCmd = inCommander || /\*CMDR\*/i.test(namePart) || /\[Commander[^\]]*\]/i.test(namePart);
    // Capture the exact printing (set + collector) before cleanName strips it,
    // so we price each card as the specific printing the list calls out.
    let set = '', collector = '';
    const sc = namePart.match(/\(([A-Za-z0-9]{2,6})\)\s*([0-9A-Za-z★-]+)?/);
    if (sc) { set = sc[1]; collector = sc[2] || ''; }
    const name = cleanName(namePart);
    if (!name) continue;
    const k = name.toLowerCase();
    const existing = out.get(k);
    if (existing) { existing.qty += qty; if (isCmd) existing.commander = true; }
    else out.set(k, { name, qty, set, collector, commander: isCmd });
  }
  return [...out.values()];
}

/* ---------- CSV parsing (ManaBox / generic collection exports) ---------- */
// Minimal RFC-4180 reader: handles quoted fields, escaped quotes, and commas inside names.
function parseCSV(text) {
  const rows = [];
  let row = [], field = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQuotes = false; }
      else field += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ',') { row.push(field); field = ''; }
    else if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (ch !== '\r') field += ch;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

// Aggregate a ManaBox-style CSV into per-variant entries, keyed by name + set + collector + foil + condition.
function parseCardCSV(text) {
  const rows = parseCSV(text);
  if (rows.length < 2) return [];
  const header = rows[0].map(h => h.trim().toLowerCase());
  const col = (...names) => { for (const n of names) { const i = header.indexOf(n); if (i >= 0) return i; } return -1; };
  const iName = col('name'), iQty = col('quantity', 'count', 'qty'), iSet = col('set code', 'set'),
        iColl = col('collector number', 'collector', 'card number'), iSid = col('scryfall id', 'scryfall_id'),
        iFoil = col('foil'), iCond = col('condition');
  if (iName < 0) return [];
  const out = new Map();
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const name = (row[iName] || '').trim();
    if (!name) continue;
    const qty = iQty >= 0 ? (parseInt(row[iQty], 10) || 0) : 1;
    if (qty <= 0) continue;
    const set = iSet >= 0 ? (row[iSet] || '').trim() : '';
    const collector = iColl >= 0 ? (row[iColl] || '').trim() : '';
    const foilRaw = iFoil >= 0 ? (row[iFoil] || '').trim().toLowerCase() : '';
    const foil = !!foilRaw && !['normal', 'false', 'no', '0', ''].includes(foilRaw);
    const condition = CSV_COND[iCond >= 0 ? (row[iCond] || '').trim().toLowerCase() : ''] || 'NM';
    const scryfallId = iSid >= 0 ? (row[iSid] || '').trim() : '';
    const mk = `${name.toLowerCase()}|${set.toLowerCase()}|${collector}|${foil ? 'f' : 'n'}|${condition}`;
    const cur = out.get(mk);
    if (cur) cur.qty += qty;
    else out.set(mk, { name, qty, set, collector, scryfallId, foil, condition });
  }
  return [...out.values()];
}

/* ---------- Scryfall fetch ---------- */
// Split / double-faced cards ("A // B") only match on the front-face name in Scryfall's collection API.
const frontFace = (n) => (n.includes(' // ') ? n.split(' // ')[0].trim() : n);

async function postIdentifiers(ids) {
  const found = [];
  for (let i = 0; i < ids.length; i += 75) {
    const chunk = ids.slice(i, i + 75);
    const res = await fetch(SCRYFALL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifiers: chunk })
    });
    if (!res.ok) throw new Error('Scryfall ' + res.status);
    const data = await res.json();
    (data.data || []).forEach(c => found.push(c));
    if (i + 75 < ids.length) await sleep(120);
  }
  return found;
}

// entries: [{name, set, collector}] — prefer the exact printing (set + collector) for accurate pricing,
// falling back to name (front-face for splits). Any printing miss is retried by name.
async function fetchCardData(entries) {
  const seen = new Map();
  entries.forEach(e => { if (!seen.has(key(e.name))) seen.set(key(e.name), e); });
  const unique = [...seen.values()];
  const index = {};      // lower(name or front-face) -> card

  const idFor = (e) => e.scryfallId ? { id: e.scryfallId }
    : (e.set && e.collector) ? { set: e.set.toLowerCase(), collector_number: String(e.collector) }
    : { name: frontFace(e.name) };

  const absorb = (cards) => cards.forEach(c => {
    index[key(c.name)] = c;
    if (c.card_faces && c.card_faces[0]) index[key(c.card_faces[0].name)] = c;
  });

  absorb(await postIdentifiers(unique.map(idFor)));

  // Printings that didn't resolve (wrong/stale collector number) — retry by name.
  const unresolved = unique.filter(e => !index[key(e.name)]);
  if (unresolved.length) absorb(await postIdentifiers(unresolved.map(e => ({ name: frontFace(e.name) }))));

  return index;
}

function distill(c) {
  const face = c.card_faces && c.card_faces[0] ? c.card_faces[0] : c;
  const img = (c.image_uris || face.image_uris || {});
  const prices = c.prices || {};
  const usd = parseFloat(prices.usd || prices.usd_foil || 0) || 0;
  const usdFoil = parseFloat(prices.usd_foil || prices.usd || 0) || 0;
  return {
    name: c.name,
    id: c.id || '',          // scryfall id of this printing (for exact Card Kingdom price matching)
    collector: c.collector_number || '',   // for exact set+collector (CK sku) matching
    mana_cost: c.mana_cost || face.mana_cost || '',
    cmc: c.cmc ?? 0,
    type_line: c.type_line || face.type_line || '',
    colors: c.color_identity || [],
    rarity: c.rarity || '',
    set: (c.set || '').toUpperCase(),
    set_name: c.set_name || '',
    price: usd,
    price_foil: usdFoil,
    image: img.normal || img.large || img.small || '',
    art: img.art_crop || '',
    uri: c.scryfall_uri || '',
    tcg: (c.purchase_uris || {}).tcgplayer || '',
    legalities: c.legalities || {}   // { standard:'legal'|'not_legal'|'banned'|'restricted', ... }
  };
}

// Outbound "buy" links for a card. TCGplayer uses Scryfall's exact product link when
// available (else a name search); Card Kingdom has no Scryfall data, so we link a search.
function buyLinks(meta) {
  const q = encodeURIComponent(meta.name || '');
  const tcg = meta.tcg || `https://www.tcgplayer.com/search/magic/product?q=${q}`;
  const ck = `https://www.cardkingdom.com/catalog/search?search=header&filter%5Bname%5D=${q}`;
  return `<a class="cv-buy tcg" href="${esc(tcg)}" target="_blank" rel="noopener">TCGplayer ↗</a>
    <a class="cv-buy ck" href="${esc(ck)}" target="_blank" rel="noopener">Card Kingdom ↗</a>`;
}

/* ---------- card category ---------- */
function category(name) {
  const t = (card(name).type_line || '').toLowerCase().split(' // ')[0]; // categorise by front face
  if (t.includes('land')) return 'Lands';
  if (t.includes('creature')) return 'Creatures';
  if (t.includes('planeswalker')) return 'Planeswalkers';
  if (t.includes('instant')) return 'Instants';
  if (t.includes('sorcery')) return 'Sorceries';
  if (t.includes('artifact')) return 'Artifacts';
  if (t.includes('enchantment')) return 'Enchantments';
  return 'Other';
}
const CAT_ORDER = ['Creatures', 'Planeswalkers', 'Instants', 'Sorceries', 'Artifacts', 'Enchantments', 'Lands', 'Other'];

/* ---------- format legality (keys are exact Scryfall legalities keys) ---------- */
const LEGAL_FORMATS = [
  ['standard', 'Standard'], ['pioneer', 'Pioneer'], ['modern', 'Modern'],
  ['legacy', 'Legacy'], ['vintage', 'Vintage'], ['commander', 'Commander'], ['pauper', 'Pauper']
];
// Playable iff legal or restricted (restricted = Vintage 1-copy cap, which we don't enforce).
const PLAYABLE = s => s === 'legal' || s === 'restricted';

/* ---------- mana-font iconography (authentic MTG glyphs rendered as gold/brass ink) ---------- */
// Card-type glyph per CAT_ORDER bucket, with finer overrides (Saga, Token) read from the type line.
const TYPE_ICON = { Creatures: 'ms-creature', Planeswalkers: 'ms-planeswalker', Instants: 'ms-instant', Sorceries: 'ms-sorcery', Artifacts: 'ms-artifact', Enchantments: 'ms-enchantment', Lands: 'ms-land', Other: 'ms-multiple' };
// Wear glyph for off-NM condition badges.
const COND_ICON = { LP: 'ms-counter-shield', MP: 'ms-counter-shield', HP: 'ms-counter-damage', DMG: 'ms-counter-damage' };
function typeIconClass(name) {
  const tl = (card(name).type_line || '').toLowerCase();
  if (tl.includes('saga')) return 'ms-saga';
  if (tl.includes('token')) return 'ms-token';
  return TYPE_ICON[category(name)] || 'ms-multiple';
}
// Inline card-type glyph for a card by name.
function typeIcon(name) {
  return `<i class="ms ${typeIconClass(name)} type-ico" title="${esc(tr(category(name)))}" aria-hidden="true"></i>`;
}
// Card-type glyph for a category label (group headers); inherits the header's brass colour.
function catIcon(cat) {
  return `<i class="ms ${TYPE_ICON[cat] || 'ms-multiple'} gh-ico" aria-hidden="true"></i>`;
}
// Rarity gem, tinted per tier via the rar-* colour classes (RARITY_LABEL is defined later; only read at call time).
function rarityIcon(rarity) {
  if (!rarity) return '';
  return `<i class="ms ms-rarity rar rar-${esc(rarity)}" title="${esc(tr(RARITY_LABEL[rarity] || rarity))}" aria-hidden="true"></i>`;
}
// Foil shimmer glyph — one coherent sparkle used wherever a foil copy is marked.
const FOIL_SPARK = '<i class="ms ms-dfc-spark foil-spark" title="Foil" aria-hidden="true"></i>';
// Rarity ordering for sorting (higher = rarer).
const RARITY_RANK = { common: 1, uncommon: 2, rare: 3, mythic: 4, special: 5, bonus: 5, masterpiece: 6 };
const rarityRank = (name) => RARITY_RANK[card(name).rarity] || 0;

/* ---------- mana / colour rendering ---------- */
// Authentic mana-font cost symbols. Each {token} maps to an ms-cost pip:
// colours {W}->ms-w, generic {3}->ms-3, hybrid {W/U}->ms-wu, phyrexian {W/P}->ms-wp, {X}->ms-x, {C}->ms-c, {S}->ms-s.
function manaSymbols(cost) {
  if (!cost) return '';
  const toks = cost.match(/\{[^}]+\}/g) || [];
  if (!toks.length) return '';
  return '<span class="mc">' + toks.map(t => {
    const s = t.slice(1, -1).toLowerCase().replace(/\//g, '');
    return `<i class="ms ms-cost ms-shadow ms-${esc(s)}" aria-hidden="true"></i>`;
  }).join('') + '</span>';
}
// A single authentic MTG mana symbol (Mana font). `pip` class carries our sizing hooks.
function manaPip(c) {
  return `<i class="ms ms-cost ms-shadow ms-${(c || 'C').toLowerCase()} pip"></i>`;
}
function pips(colors) {
  const cs = (colors && colors.length) ? colors : ['C'];
  return cs.map(manaPip).join('');
}

/* A faint colour-identity glow for a deck card, keyed to its primary colour. */
function deckAura(deck) {
  const cols = deckColors(deck);
  const map = { W: '244,234,208', U: '74,143,214', B: '138,111,163', R: '212,69,47', G: '63,168,106' };
  if (!cols.length) return 'rgba(201,162,39,.16)';
  return `rgba(${map[cols[0]] || '201,162,39'},.20)`;
}

/* Tiny heraldic corner flourish (gold) for the four corners of a deck card. */
const DECK_CORNER_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round"><path d="M3 15 L3 6 Q3 3 6 3 L15 3" stroke-width="1.6"/><path d="M15 3 Q20 3 20 8" stroke-width="1.3" opacity=".75"/><circle cx="6.4" cy="6.4" r=".9" fill="currentColor" stroke="none"/></svg>`;
const DECK_CORNERS = ['tl', 'tr', 'bl', 'br'].map(p => `<span class="corner ${p}">${DECK_CORNER_SVG}</span>`).join('');

/* Count a numeric stat up from zero, restoring its exact text at the end. */
function animateStat(el) {
  const raw = el.textContent.trim();
  const m = raw.match(/^([^\d-]*)([\d,]+(?:\.\d+)?)(.*)$/);
  if (!m) return;
  const pre = m[1], end = parseFloat(m[2].replace(/,/g, '')), suf = m[3], isInt = !m[2].includes('.');
  const t0 = performance.now(), dur = 900;
  (function step(t) {
    const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3), v = end * e;
    el.textContent = pre + (isInt ? Math.round(v).toLocaleString() : v.toFixed(2)) + suf;
    if (k < 1) requestAnimationFrame(step); else el.textContent = raw;
  })(t0);
}

/* =====================================================================
   AGGREGATIONS
   ===================================================================== */
function allCardNames() {
  const set = new Set();
  state.decks.forEach(d => d.cards.forEach(c => set.add(c.name)));
  Object.keys(state.variants).forEach(k => {   // state.cards is keyed by key(name) → direct O(1) lookup
    const real = state.cards[k];
    set.add(real ? real.name : k);
  });
  Object.keys(state.wishlist).forEach(k => {
    const real = state.cards[k];
    set.add(real ? real.name : k);
  });
  return [...set];
}

function decksUsing(name) {
  return state.decks.filter(d => d.cards.some(c => key(c.name) === key(name)));
}
function maxRequired(name) {
  let m = 0;
  state.decks.forEach(d => d.cards.forEach(c => { if (key(c.name) === key(name)) m = Math.max(m, c.qty); }));
  return m;
}

function deckStats(deck) {
  let total = 0, ownedFull = 0, completeCost = 0, value = 0;
  deck.cards.forEach(c => {
    total += c.qty;
    const have = ownedOf(c.name);
    const p = priceOf(c.name);
    value += Math.min(have, c.qty) * p;
    if (have >= c.qty) ownedFull += c.qty;
    else { completeCost += (c.qty - have) * p; ownedFull += have; }
  });
  return { total, ownedFull, completeCost, value, pct: total ? Math.round(ownedFull / total * 100) : 0 };
}

function deckColors(deck) {
  const set = new Set();
  deck.cards.forEach(c => (card(c.name).colors || []).forEach(x => set.add(x)));
  return ['W', 'U', 'B', 'R', 'G'].filter(x => set.has(x));
}

// Per-format verdict for a deck. status: 'legal' | 'illegal' | 'unknown'.
// 'unknown' = one or more cards have no legalities data yet (old cache / notFound) — re-check to resolve.
function deckLegality(deck) {
  const seen = new Map();
  deck.cards.forEach(c => { if (!seen.has(key(c.name))) seen.set(key(c.name), c.name); });
  const names = [...seen.values()];
  const out = {};
  LEGAL_FORMATS.forEach(([fmt]) => {
    const bad = [], missing = [];
    names.forEach(n => {
      const leg = card(n).legalities;
      if (!leg || Object.keys(leg).length === 0) { missing.push(n); return; }
      const s = leg[fmt];
      if (s === undefined) { missing.push(n); return; }
      if (!PLAYABLE(s)) bad.push(n);
    });
    out[fmt] = { status: missing.length ? 'unknown' : (bad.length ? 'illegal' : 'legal'), bad, missing };
  });
  const anyUnknown = names.some(n => { const l = card(n).legalities; return !l || Object.keys(l).length === 0; });
  return { formats: out, anyUnknown };
}
// A card can be a deck's commander if it's a legendary creature.
function canBeCommander(name) {
  const tl = (card(name).type_line || '').toLowerCase();
  return tl.includes('legendary') && tl.includes('creature');
}
// The deck's commander, but only if it's still one of the deck's cards.
function deckCommander(deck) {
  return (deck.commander && deck.cards.some(c => key(c.name) === key(deck.commander))) ? deck.commander : null;
}
function deckArt(deck) {
  const cmd = deckCommander(deck);
  if (cmd && displayArt(cmd)) return displayArt(cmd);   // a commander defines the deck's identity
  for (const c of deck.cards) {
    const meta = card(c.name);
    if (displayArt(c.name) && !(meta.type_line || '').toLowerCase().includes('land')) return displayArt(c.name);
  }
  for (const c of deck.cards) { if (displayArt(c.name)) return displayArt(c.name); }
  return '';
}

function statsFor(names) {
  let ownedCount = 0, ownedValue = 0, buyCost = 0;
  names.forEach(n => {
    const have = ownedOf(n), need = maxRequired(n), p = priceOf(n);
    ownedCount += have;
    ownedValue += ownedValueOf(n);
    buyCost += Math.max(0, need - have) * p;
  });
  return { unique: names.length, ownedCount, ownedValue, buyCost };
}
function globalStats() {
  return { decks: state.decks.length, ...statsFor(allCardNames()) };
}

/* ---------- forge: collection lens for deck-building ---------- */
const COLOR_NAME = { W: 'White', U: 'Blue', B: 'Black', R: 'Red', G: 'Green', C: 'Colourless' };
const COLOR_ORDER = ['W', 'U', 'B', 'R', 'G', 'C'];
const GUILDS = { WU: 'Azorius', WB: 'Orzhov', WR: 'Boros', WG: 'Selesnya', UB: 'Dimir', UR: 'Izzet', UG: 'Simic', BR: 'Rakdos', BG: 'Golgari', RG: 'Gruul' };

// Creature subtypes from a card's front-face type line ("Legendary Creature — Elf Druid" -> [Elf, Druid]).
function subtypesOf(meta) {
  const tl = meta.type_line || '';
  if (!/creature/i.test(tl)) return [];
  const front = tl.split('//')[0];
  const idx = front.indexOf('—');
  if (idx < 0) return [];
  return front.slice(idx + 1).trim().split(/\s+/).filter(Boolean);
}

// Aggregate owned cards by colour identity and creature subtype.
function forgeData() {
  const colors = {};
  COLOR_ORDER.forEach(c => colors[c] = { copies: 0, unique: 0, value: 0 });
  const tribes = {};
  allCardNames().forEach(n => {
    const have = ownedOf(n);
    if (have <= 0) return;
    const meta = card(n);
    const val = ownedValueOf(n);
    const cols = (meta.colors && meta.colors.length) ? meta.colors : ['C'];
    cols.forEach(c => { const b = colors[c]; if (b) { b.unique++; b.copies += have; b.value += val; } });
    subtypesOf(meta).forEach(sub => { tribes[sub] = (tribes[sub] || 0) + have; });
  });
  return { colors, tribes };
}

function renderForge() {
  const el = $('#forgeBody');
  if (!el) return;
  const { colors, tribes } = forgeData();

  if (!COLOR_ORDER.some(c => colors[c].copies > 0)) {
    el.innerHTML = `<div class="empty-state"><span class="empty-mark"><i class="ms ms-ability-craft" aria-hidden="true"></i></span><h2>${tr('Nothing forged yet')}</h2><p>${tr('Mark cards as owned and the Forge will reveal what you can build.')}</p></div>`;
    return;
  }

  const maxC = Math.max(...COLOR_ORDER.map(c => colors[c].copies), 1);
  const colorRows = COLOR_ORDER.filter(c => colors[c].copies > 0).map(c => {
    const b = colors[c];
    return `<div class="cspread-row">
      ${manaPip(c)}
      <span class="cs-name">${tr(COLOR_NAME[c])}</span>
      <div class="cs-bar"><i class="${c}" style="width:${Math.round(b.copies / maxC * 100)}%"></i></div>
      <span class="cs-copies">${b.copies}</span>
      <span class="cs-unique">${b.unique} ${tr('unique')}</span>
      <span class="cs-val"><i class="ms ms-counter-gold cs-coin" aria-hidden="true"></i>${money(b.value)}</span>
    </div>`;
  }).join('');

  // Strongest two-colour pairings, ranked by the weaker colour (the realistic ceiling for a build).
  const colored = COLOR_ORDER.filter(c => c !== 'C' && colors[c].copies > 0);
  const pairs = [];
  for (let i = 0; i < colored.length; i++) for (let j = i + 1; j < colored.length; j++) {
    const k = ['W', 'U', 'B', 'R', 'G'].filter(x => x === colored[i] || x === colored[j]).join('');
    if (!GUILDS[k]) continue;
    pairs.push({ a: colored[i], b: colored[j], guild: GUILDS[k], depth: Math.min(colors[colored[i]].copies, colors[colored[j]].copies) });
  }
  pairs.sort((x, y) => y.depth - x.depth);
  const sugg = pairs.slice(0, 3).filter(p => p.depth > 0).map(p =>
    `<span class="sug-chip" data-colors="${p.a}${p.b}" data-guild="${p.guild}"><i class="ms ms-guild-${p.guild.toLowerCase()} guild-crest" aria-hidden="true"></i>${manaPip(p.a)}${manaPip(p.b)}<b>${p.guild}</b><span class="sug-n">~${p.depth} ${tr('per colour')}</span></span>`
  ).join('');
  const suggBlock = sugg ? `<div class="forge-suggest"><span class="sug-label">${tr('Strongest pairings')}</span><div class="sug-row">${sugg}</div></div>` : '';

  const tribeList = Object.entries(tribes).sort((a, b) => b[1] - a[1]);
  const maxT = tribeList.length ? tribeList[0][1] : 1;
  const tribeRows = tribeList.slice(0, 16).map(([name, count]) => {
    const verdict = count >= 12 ? `<span class="tribe-verdict ready"><i class="ms ms-ability-craft" aria-hidden="true"></i> ${tr('Deck-ready')}</span>`
      : count >= 6 ? `<span class="tribe-verdict brew"><i class="ms ms-creature" aria-hidden="true"></i> ${tr('Brewing')}</span>` : '<span class="tribe-verdict"></span>';
    return `<div class="tribe-row" data-tribe="${esc(name)}">
      <i class="ms ms-creature tribe-ico" aria-hidden="true"></i>
      <span class="tribe-name">${esc(name)}</span>
      <div class="tribe-bar"><i style="width:${Math.round(count / maxT * 100)}%"></i></div>
      <span class="tribe-count">${count}</span>
      ${verdict}
    </div>`;
  }).join('');
  const tribeHead = `<div class="group-head"><i class="ms ms-creature gh-ico" aria-hidden="true"></i>${tr('Tribal Potential')}</div>`;
  const tribeBlock = tribeList.length
    ? `${tribeHead}<div class="forge-tribes">${tribeRows}</div>`
    : `${tribeHead}<p class="view-sub" style="padding:8px 2px">${tr('No creature types catalogued yet.')}</p>`;

  el.innerHTML = `<div class="group-head">${tr('Colour Spread')}</div><div class="forge-colors">${colorRows}</div>${suggBlock}${tribeBlock}`;
}

/* ---------- inventory facet (drill-down from the Forge) ---------- */
function renderFacetBar() {
  const bar = $('#invFacetBar');
  if (!bar) return;
  if (!invFacet) { bar.hidden = true; bar.innerHTML = ''; return; }
  bar.hidden = false;
  const tag = invFacet.kind === 'guild'
    ? `<i class="ms ms-guild-${(invFacet.label || '').toLowerCase()} guild-crest" aria-hidden="true"></i>${invFacet.colors.map(manaPip).join('')}<span>${esc(invFacet.label)} — ${tr('castable cards')}</span>`
    : `<i class="ms ms-creature facet-creature" aria-hidden="true"></i><span>${tr('Tribe')} · ${esc(invFacet.value)}</span>`;
  bar.innerHTML = `<span class="facet-tag">${tag}</span><button class="facet-clear" id="facetClear">${tr('✕ clear')}</button>`;
}
function syncSeg() {
  $$('#invFilter .seg-btn').forEach(x => x.classList.toggle('is-active', x.dataset.filter === invFilter));
}
function applyFacet(facet) {
  invFacet = facet;
  invFilter = 'all';            // inventory is already owned-only
  syncSeg();
  setView('inventory');
  renderInventory();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* =====================================================================
   RENDERING
   ===================================================================== */
/* ---------- home ---------- */
let homeQuery = '';
let homeMvItems = [], homeMvSeq = 0, homeMvQuery = '';   // homepage "In the multiverse" — unowned Scryfall name suggestions
function renderHome() {
  const view = $('#view-home');
  if (!view || !view.classList.contains('is-active')) return;   // only build when the home view is showing
  const g = globalStats();
  const stats = $('#homeStats');
  if (stats) stats.innerHTML = `
    <span class="home-stat"><b>${g.decks}</b> ${tr(g.decks === 1 ? 'deck' : 'decks')}</span>
    <span class="home-stat"><b>${g.ownedCount}</b> ${tr(g.ownedCount === 1 ? 'card' : 'cards')}</span>
    <span class="home-stat"><b>${money(g.ownedValue)}</b> ${tr('value')}</span>`;
  renderHomeBg();
  renderHomeResults();
}
// a small built-in fallback so the wall is never empty before the big Scryfall pool loads
const HOME_SHOWCASE = ['Sol Ring', 'Lightning Bolt', 'Counterspell', 'Llanowar Elves', 'Cyclonic Rift', 'Smothering Tithe', 'Rhystic Study', 'Birds of Paradise', 'Brainstorm', 'Cultivate', 'Sword of Fire and Ice', 'Wrath of God', 'Swords to Plowshares', 'Demonic Tutor', 'Solemn Simulacrum', 'Eternal Witness', 'Aura Shards', 'Mana Crypt'].map(n => `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(n)}&format=image&version=small`);
const safeArt = (u) => /^https:\/\/[^'"()\s]+$/.test(String(u || '')) ? String(u) : '';   // safe in a CSS url('…')
// A big, VARIED pool of beautiful cards across types & eras — creatures, planeswalkers, spells and full-art lands
// in their striking printings — DE-DUPED by card name (so it isn't 40 Sol Rings) and shuffled. Cached in
// localStorage (NOT the synced state blob), refreshed weekly.
const HOME_ART_KEY = STORE_KEY + ':homeart2';
const HOME_QUERIES = [
  '(t:creature or t:planeswalker or t:enchantment or t:instant or t:sorcery) (is:showcase or is:borderless or is:extendedart or is:fullart) -is:digital game:paper',
  'is:fullart (t:land or t:creature) -is:digital game:paper'
];
let homeArtPool = [];
let homeArtFetching = false;
try { const j = JSON.parse(localStorage.getItem(HOME_ART_KEY)); if (j && Array.isArray(j.pool)) homeArtPool = j.pool.filter(safeArt); } catch (e) {}
function homeArtFresh() { try { const j = JSON.parse(localStorage.getItem(HOME_ART_KEY)); return j && Array.isArray(j.pool) && j.pool.length >= 120 && (Date.now() - (j.at || 0)) < 7 * 864e5; } catch (e) { return false; } }
async function loadHomeArtPool() {
  if (homeArtFetching || homeArtFresh()) return;
  homeArtFetching = true;
  try {
    const byName = new Map();   // one art per card name → no repeats of the same card
    for (const q of HOME_QUERIES) {
      let url = 'https://api.scryfall.com/cards/search?q=' + encodeURIComponent(q) + '&unique=art&order=edhrec';
      for (let p = 0; p < 2 && url; p++) {
        const r = await fetch(url); if (!r.ok) break;
        const j = await r.json();
        (j.data || []).forEach(c => {
          const u = (c.image_uris && c.image_uris.small) || (c.card_faces && c.card_faces[0] && c.card_faces[0].image_uris && c.card_faces[0].image_uris.small);
          const nm = c.name || c.oracle_id || u;
          if (safeArt(u) && !byName.has(nm)) byName.set(nm, u);
        });
        url = j.has_more ? j.next_page : null;
        if (url) await new Promise(res => setTimeout(res, 110));   // be gentle to Scryfall
      }
    }
    let pool = [...byName.values()];
    for (let i = pool.length - 1; i > 0; i--) { const k = Math.floor(Math.random() * (i + 1)); [pool[i], pool[k]] = [pool[k], pool[i]]; }   // shuffle
    pool = pool.slice(0, 320);
    if (pool.length >= 40) {
      homeArtPool = pool;
      try { localStorage.setItem(HOME_ART_KEY, JSON.stringify({ pool, at: Date.now() })); } catch (e) {}
      const bg = $('#homeBg'); if (bg) { bg.dataset.sig = ''; renderHomeBg(); }   // rebuild with the full pool now that it's loaded
    }
  } catch (e) {}
  homeArtFetching = false;
}
function renderHomeBg() {
  const bg = $('#homeBg'); if (!bg) return;
  loadHomeArtPool();   // top up / refresh the pool in the background (no-op if fresh or already fetching)
  const imgs = homeArtPool.length >= 40 ? homeArtPool : HOME_SHOWCASE;
  const vw = window.innerWidth || 1280, vh = window.innerHeight || 800;
  // the .home-bg layer overscans to ~140% of the viewport (CSS inset:-20%), so fill that area + a margin
  const COLS = Math.min(30, Math.max(10, Math.ceil((vw * 1.5) / 168)));
  const PER = Math.min(20, Math.max(8, Math.ceil((vh * 1.5) / 228) + 1));
  const sig = imgs.length + '·' + COLS + '·' + PER + '·' + imgs[0];
  if (bg.dataset.sig === sig) return;   // don't rebuild (and restart the roll) every render
  bg.dataset.sig = sig;
  const DUR = [24, 18, 30, 21, 27, 19, 26, 22, 29, 17, 25, 20];   // each column its own (clearly visible) velocity
  let html = '';
  for (let c = 0; c < COLS; c++) {
    let set = '';
    for (let i = 0; i < PER; i++) set += `<div class="home-card" style="background-image:url('${imgs[(c * PER + i) % imgs.length]}')"></div>`;
    // doubled set = seamless loop; inline duration + negative delay so columns intercalate at different speeds/offsets (direction alternates via CSS)
    html += `<div class="home-col"><div class="home-col-track" style="animation-duration:${DUR[c % DUR.length]}s;animation-delay:-${c * 5}s">${set}${set}</div></div>`;
  }
  bg.innerHTML = `<div class="home-cols">${html}</div>`;
}
function homeResults(q) {
  q = q.trim().toLowerCase();
  if (q.length < 2) return null;
  const decks = state.decks.filter(d => d.name.toLowerCase().includes(q)).slice(0, 5);
  const cards = allCardNames().filter(n => ownedOf(n) > 0 && n.toLowerCase().includes(q)).slice(0, 6);
  return { decks, cards };
}
function renderHomeResults() {
  const box = $('#homeResults'); if (!box) return;
  const inp = $('#homeSearch'); if (inp && inp.value !== homeQuery) inp.value = homeQuery;
  const r = homeResults(homeQuery);
  if (!r) { box.hidden = true; box.innerHTML = ''; return; }
  let html = '';
  if (r.decks.length) html += `<div class="hr-group"><div class="hr-h">${tr('Decks')}</div>${r.decks.map(d => { const n = (d.cards || []).reduce((a, c) => a + c.qty, 0); return `<button class="hr-item" data-homedeck="${d.id}"><i class="ms ms-saga" aria-hidden="true"></i><span class="hr-name">${esc(d.name)}</span><span class="hr-sub">${n} ${tr(n === 1 ? 'card' : 'cards')}</span></button>`; }).join('')}</div>`;
  if (r.cards.length) html += `<div class="hr-group"><div class="hr-h">${tr('Your cards')}</div>${r.cards.map(n => `<button class="hr-item" data-homecard="${esc(n)}"><i class="ms ms-token" aria-hidden="true"></i><span class="hr-name">${esc(n)}</span><span class="hr-sub">${ownedOf(n)}×</span></button>`).join('')}</div>`;
  // Cards you DON'T own that match — surfaced from all of Magic via Scryfall (fetched async by fetchHomeMultiverse)
  const mv = (homeMvQuery === homeQuery.trim().toLowerCase()) ? homeMvItems : [];
  if (mv.length) html += `<div class="hr-group"><div class="hr-h">${tr('In the multiverse')}</div>${mv.map(n => `<button class="hr-item mv" data-homemv="${esc(n)}"><span class="hr-art" style="background-image:url('${addArtUrl(n)}')" aria-hidden="true"></span><span class="hr-name">${esc(n)}</span><span class="hr-go">→</span></button>`).join('')}</div>`;
  html += `<button class="hr-item hr-all" data-homebrowse><i class="ms ms-ability-investigate" aria-hidden="true"></i><span class="hr-name">${tr('Search all cards for “{q}”', { q: esc(homeQuery.trim()) })}</span><span class="hr-go">→</span></button>`;
  box.innerHTML = html; box.hidden = false;
}
// Pull card-name suggestions from Scryfall, keep only the ones the player doesn't own, and show them
// in the home dropdown's "In the multiverse" group. Debounced + seq-guarded against stale keystrokes.
async function fetchHomeMultiverse(q) {
  q = (q || '').trim();
  if (q.length < 2) { homeMvItems = []; homeMvQuery = ''; renderHomeResults(); return; }
  const seq = ++homeMvSeq;
  try {
    const res = await fetch('https://api.scryfall.com/cards/autocomplete?q=' + encodeURIComponent(q));
    if (!res.ok) return;
    const data = await res.json();
    if (seq !== homeMvSeq) return;                 // a newer keystroke already fired
    homeMvItems = (data.data || []).filter(n => ownedOf(n) === 0).slice(0, 6);
    homeMvQuery = q.toLowerCase();
    renderHomeResults();
  } catch (e) { /* offline — silently no-op */ }
}
const homeMvDebounced = (() => { let t; return (q) => { clearTimeout(t); t = setTimeout(() => fetchHomeMultiverse(q), 200); }; })();
function homeGoBrowse() {
  const q = homeQuery.trim();
  setView('browse');
  if (q) { const inp = $('#browseSearch'); if (inp) inp.value = q; browseQuery = q; browseSearch(q, { fresh: true }); }
}
// Open a specific (usually unowned) card in Browse, pre-searched to its exact name — so the player
// lands on its tile with the "add to collection / buy list" actions. Used by the home "multiverse" group.
function homeGoBrowseCard(name) {
  name = (name || '').trim(); if (!name) return;
  setView('browse');
  const inp = $('#browseSearch'); if (inp) inp.value = name;
  browseQuery = name;
  browseSearch(name, { fresh: true });
}

function render() {
  renderHome();
  renderDecks();
  if (currentDeckId) renderDeckDetail();
  renderInventory();
  renderForge();
  renderBuyList();
  renderSellList();
  renderBrowse();
  renderHistory();
  renderProfileView();
  if ($('#view-store') && $('#view-store').classList.contains('is-active')) renderStoreDashboard();
  renderUndo();
  renderPriceSrc();
}

/* ---------- history / activity ledger ---------- */
let histFilter = 'all';   // all | bought | sold | adjust
const HIST_META = {
  bought:  { label: 'Bought',  ic: 'ms-counter-shield', sign: 'out' },
  sold:    { label: 'Sold',    ic: 'ms-counter-gold',   sign: 'in'  },
  added:   { label: 'Added',   ic: 'ms-token',          sign: ''    },
  removed: { label: 'Removed', ic: 'ms-graveyard',      sign: ''    },
};
function clearHistory() {
  if (!(state.history || []).length) { toast(tr('History is already empty.')); return; }
  if (!confirm(tr('Clear the entire activity history? This can’t be undone. (Your collection and prices are not affected.)'))) return;
  state.history = []; save(); render();
  toast(tr('Activity history cleared.'));
}
function histRow(e) {
  const meta = HIST_META[e.type] || HIST_META.added;
  const time = new Date(e.t).toLocaleTimeString(I18N.locale(), { hour: 'numeric', minute: '2-digit' });
  const val = histValue(e);
  const valStr = val ? `${meta.sign === 'in' ? '+' : meta.sign === 'out' ? '−' : ''}${money(val)}` : '—';
  const isCard = !e.note && state.cards[key(e.name)];
  const nm = `${esc(e.name)}${e.foil ? ` ${FOIL_SPARK}` : ''}`;
  const nameHtml = isCard
    ? `<span class="hr-name nm" data-name="${esc(e.name)}" title="${esc(e.name)}">${nm}</span>`
    : `<span class="hr-name" title="${esc(e.name)}">${nm}</span>`;
  return `<div class="hist-row ${e.type}">
    <span class="hr-badge ${e.type}"><i class="ms ${meta.ic}" aria-hidden="true"></i> ${tr(meta.label)}</span>
    ${nameHtml}
    <span class="hr-qty">×${e.qty}</span>
    <span class="hr-val ${meta.sign}">${valStr}</span>
    <span class="hr-time">${time}</span>
  </div>`;
}
function renderHistory() {
  const all = (state.history || []).slice().sort((a, b) => b.t - a.t);
  const boughtVal = all.filter(e => e.type === 'bought').reduce((a, e) => a + histValue(e), 0);
  const soldVal = all.filter(e => e.type === 'sold').reduce((a, e) => a + histValue(e), 0);
  const net = soldVal - boughtVal;
  const sumEl = $('#histSummary');
  if (sumEl) sumEl.innerHTML = all.length ? `
    <div class="stat-card"><div class="label"><i class="ms ms-counter-gold stat-ic" aria-hidden="true"></i>${tr('Sold')}</div><div class="value gold">${money(soldVal)}</div><div class="sub">${tr('money in')}</div></div>
    <div class="stat-card"><div class="label"><i class="ms ms-counter-shield stat-ic" aria-hidden="true"></i>${tr('Bought')}</div><div class="value">${money(boughtVal)}</div><div class="sub">${tr('money out')}</div></div>
    <div class="stat-card"><div class="label"><i class="ms ms-ability-craft stat-ic" aria-hidden="true"></i>${tr('Net')}</div><div class="value ${net >= 0 ? 'gold' : ''}">${net < 0 ? '−' : ''}${money(Math.abs(net))}</div><div class="sub">${tr('sold − bought')}</div></div>
    <div class="stat-card"><div class="label"><i class="ms ms-counter-lore stat-ic" aria-hidden="true"></i>${tr('Entries')}</div><div class="value">${all.length}</div><div class="sub">${tr('logged events')}</div></div>` : '';
  $$('#histFilter .seg-btn').forEach(b => b.classList.toggle('is-active', b.dataset.hfilter === histFilter));
  const rows = all.filter(e => histFilter === 'all' || (histFilter === 'adjust' ? (e.type === 'added' || e.type === 'removed') : e.type === histFilter));
  const body = $('#historyBody');
  if (!body) return;
  if (!rows.length) {
    body.innerHTML = `<div class="empty-state"><span class="empty-mark"><i class="ms ms-counter-lore" aria-hidden="true"></i></span><h2>${all.length ? tr('Nothing here') : tr('No activity yet')}</h2><p>${all.length ? tr('No events match this filter.') : tr('Buy, sell, or add cards and every change is logged here, day by day.')}</p></div>`;
    return;
  }
  const groups = [];
  let cur = null;
  rows.forEach(e => {
    const dayKey = new Date(e.t).toDateString();
    if (!cur || cur.key !== dayKey) { cur = { key: dayKey, t: e.t, items: [] }; groups.push(cur); }
    cur.items.push(e);
  });
  body.innerHTML = groups.map(g => {
    const dBought = g.items.filter(e => e.type === 'bought').reduce((a, e) => a + histValue(e), 0);
    const dSold = g.items.filter(e => e.type === 'sold').reduce((a, e) => a + histValue(e), 0);
    const dayLabel = new Date(g.t).toLocaleDateString(I18N.locale(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const tally = [dSold ? `<span class="ht-in">+${money(dSold)}</span>` : '', dBought ? `<span class="ht-out">−${money(dBought)}</span>` : ''].filter(Boolean).join(' ');
    return `<div class="hist-day">
      <div class="hist-day-head"><span class="hd-date">${dayLabel}</span><span class="hd-tally">${tally}</span></div>
      ${g.items.map(histRow).join('')}
    </div>`;
  }).join('');
}

function renderDecks() {
  const g = globalStats();
  $('#ledgerSummary').innerHTML = state.decks.length ? `
    <div class="stat-card"><div class="label"><i class="ms ms-saga stat-ic" aria-hidden="true"></i>${tr('Decks')}</div><div class="value">${g.decks}</div></div>
    <div class="stat-card"><div class="label"><i class="ms ms-multiple stat-ic" aria-hidden="true"></i>${tr('Unique Cards')}</div><div class="value">${g.unique}</div><div class="sub">${tr('{n} owned copies', { n: g.ownedCount })}</div></div>
    <div class="stat-card"><div class="label"><i class="ms ms-counter-gold stat-ic" aria-hidden="true"></i>${tr('Collection Value')}</div><div class="value gold">${money(g.ownedValue)}</div><div class="sub">${tr('at market price')}</div></div>
    <div class="stat-card"><div class="label"><i class="ms ms-counter-gold stat-ic" aria-hidden="true"></i>${tr('Cost to Complete All')}</div><div class="value">${money(g.buyCost)}</div><div class="sub">${tr('still to acquire')}</div></div>` : '';

  const grid = $('#deckGrid');
  $('#decksEmpty').hidden = state.decks.length > 0;
  // "+ New deck" tile — only shown when decks exist (the empty state has its own button).
  const newDeckTile = state.decks.length
    ? `<button class="deck-new" data-newdeck title="${tr('New deck')}" aria-label="${tr('New deck')}"><span class="dn-plus" aria-hidden="true">+</span><span class="dn-label">${tr('New deck')}</span></button>`
    : '';
  grid.innerHTML = newDeckTile + state.decks.map(d => {
    const s = deckStats(d);
    const art = deckArt(d);
    return `<article class="deck-card" data-deck="${d.id}" style="--aura:${deckAura(d)}">
      <div class="glare"></div>
      <div class="crest">
        ${art ? `<div class="art" style="background-image:url('${esc(art)}')"></div>` : ''}
        <div class="pips">${pips(deckColors(d))}</div>
      </div>
      <div class="body">
        <h3>${esc(d.name)}</h3>
        <div class="meta">${tr('{n} cards', { n: s.total })} · ${tr('{p}% complete', { p: s.pct })}</div>
        <div class="progress"><i style="width:${s.pct}%"></i></div>
        <div class="foot">
          <span class="have">${tr('{a}/{b} owned', { a: s.ownedFull, b: s.total })}</span>
          <span class="cost ${s.completeCost === 0 ? 'zero' : ''}">${s.completeCost === 0 ? tr('✓ Complete') : '<i class="ms ms-counter-gold foot-coin" aria-hidden="true"></i>' + money(s.completeCost) + ' ' + tr('to finish')}</span>
        </div>
      </div>
      ${DECK_CORNERS}
    </article>`;
  }).join('');

  $$('#ledgerSummary .value').forEach(animateStat);
}

function renderDeckDetail() {
  const deck = state.decks.find(d => d.id === currentDeckId);
  if (!deck) { currentDeckId = null; setView('decks'); return; }
  const s = deckStats(deck);

  const cmd = deckCommander(deck);
  const ownedCount = deck.cards.filter(c => ownedOf(c.name) > 0).length;
  const missingCount = deck.cards.length - ownedCount;
  const cardShown = (name) => deckCardFilter === 'all' || (deckCardFilter === 'owned' ? ownedOf(name) > 0 : ownedOf(name) <= 0);
  const showCmd = !!cmd && cardShown(cmd);
  const groups = {};
  deck.cards.forEach(c => { if (cmd && key(c.name) === key(cmd)) return; if (!cardShown(c.name)) return; (groups[category(c.name)] ||= []).push(c); });

  let body = `<div class="deck-hero">
    <div>
      <div class="deck-title">
        <h2 data-deck-title="${deck.id}">${esc(deck.name)}</h2>
        <button class="rename" data-rename-deck="${deck.id}" title="${tr('Rename deck')}" aria-label="${tr('Rename deck')}"><i class="ms ms-artist-nib" aria-hidden="true"></i></button>
      </div>
      <div class="pips">${pips(deckColors(deck))}</div>
    </div>
    <div class="spacer"></div>
    <div class="seg" id="deckViewMode" title="${tr('Switch between stacked art, a full card grid, or a text list')}">
      <button class="seg-btn ${deckView === 'stacks' ? 'is-active' : ''}" data-mode="stacks"><i class="ms ms-token" aria-hidden="true"></i> ${tr('Stacks')}</button>
      <button class="seg-btn ${deckView === 'grid' ? 'is-active' : ''}" data-mode="grid"><i class="ms ms-library" aria-hidden="true"></i> ${tr('Grid')}</button>
      <button class="seg-btn ${deckView === 'list' ? 'is-active' : ''}" data-mode="list"><i class="ms ms-multiple" aria-hidden="true"></i> ${tr('List')}</button>
    </div>
    <div class="seg" id="deckCardFilter" title="${tr('Show all cards, only the ones you own, or only the ones you\'re still missing')}">
      <button class="seg-btn ${deckCardFilter === 'all' ? 'is-active' : ''}" data-cardfilter="all">${tr('All')}</button>
      <button class="seg-btn ${deckCardFilter === 'owned' ? 'is-active' : ''}" data-cardfilter="owned">${tr('Owned')} ${ownedCount}</button>
      <button class="seg-btn ${deckCardFilter === 'missing' ? 'is-active' : ''}" data-cardfilter="missing">${tr('Missing')} ${missingCount}</button>
    </div>
    ${(deckView === 'stacks' || deckView === 'grid') ? `<label class="size-ctl" id="deckSizeWrap" title="${tr('Card size')}">
      <i class="ms ms-token size-ic size-ic--sm" aria-hidden="true"></i>
      <input type="range" id="deckSizeRange" class="size-range" min="110" max="280" step="2" value="${deckTile}" aria-label="${tr('Card size')}" />
      <i class="ms ms-token size-ic size-ic--lg" aria-hidden="true"></i>
    </label>` : ''}
    <button class="lg-toggle ${deck.shareCode ? 'on' : ''}" data-deckshare title="${deck.shareCode ? tr('Published to the community — manage the link') : tr('Publish this deck so others can view & like it')}"><i class="ms ms-counter-lore" aria-hidden="true"></i> ${deck.shareCode ? tr('Published') : tr('Share')}</button>
    <button class="lg-toggle ${deckEdit ? 'on' : ''}" data-deckedit title="${tr('Add / remove cards in this deck')}"><i class="ms ms-ability-craft" aria-hidden="true"></i> ${tr('Edit')}</button>
    <button class="lg-toggle ${state.prefs.showLegality ? 'on' : ''}" data-lgtoggle title="${tr('Show format legality')}"><i class="ms ms-counter-shield" aria-hidden="true"></i> ${tr('Legality')}</button>
    <button class="lg-toggle ${deckShowOriginal ? 'on' : ''}" data-origtoggle title="${tr('Compare with the original imported list')}"><i class="ms ms-saga" aria-hidden="true"></i> ${tr('Original')}${deckDivergence(deck) ? ` <span class="og-badge">${deckDivergence(deck)}</span>` : ''}</button>
    ${s.completeCost > 0 ? `<button class="lg-toggle deck-optimize" data-deckoptimize title="${tr('Switch every unowned card to its cheapest printing to lower the buy cost')}"><i class="ms ms-counter-gold" aria-hidden="true"></i> ${tr('Optimize')}</button>` : ''}
    <div class="hero-stat"><div class="v">${s.pct}%</div><div class="l">${tr('Complete')}</div></div>
    <div class="hero-stat"><div class="v">${money(s.value)}</div><div class="l"><i class="ms ms-counter-gold stat-ic" aria-hidden="true"></i>${tr('Owned Value')}</div></div>
    <div class="hero-stat"><div class="v">${money(s.completeCost)}</div><div class="l"><i class="ms ms-counter-gold stat-ic" aria-hidden="true"></i>${tr('To Finish')}</div></div>
    <button class="del" data-del-deck="${deck.id}"><i class="ms ms-counter-skull" aria-hidden="true"></i> ${tr('Delete')}</button>
  </div>`;

  if (state.prefs.showLegality) body += legalityBar(deck);
  if (deckShowOriginal) body += originalPanel(deck);
  if (deckEdit) body += deckAddBar();

  const shownTotal = deckCardFilter === 'owned' ? ownedCount : deckCardFilter === 'missing' ? missingCount : deck.cards.length;
  if (deck.cards.length === 0) {
    body += `<div class="empty-state" style="padding:64px 20px"><span class="empty-mark"><i class="ms ms-ability-craft" aria-hidden="true"></i></span><h2>${tr('No cards yet')}</h2><p>${deckEdit ? tr('Add cards above, or from the {browse} tab.', { browse: '<b>' + tr('Browse') + '</b>' }) : tr('Add cards above (tap {edit}), or from the {browse} tab.', { edit: '<b>' + tr('Edit') + '</b>', browse: '<b>' + tr('Browse') + '</b>' })}</p></div>`;
  } else if (shownTotal === 0) {
    body += `<div class="empty-state" style="padding:64px 20px"><span class="empty-mark"><i class="ms ms-counter-shield" aria-hidden="true"></i></span><h2>${deckCardFilter === 'missing' ? tr('Deck complete') : tr('Nothing owned yet')}</h2><p>${deckCardFilter === 'missing' ? tr('You own every card in this deck.') : tr('You don’t own any of this deck’s cards yet.')}</p></div>`;
  } else if (deckView === 'stacks') {
    body += renderDeckCards(groups, showCmd ? cmd : null);
  } else if (deckView === 'grid') {
    body += renderDeckGrid(groups, showCmd ? cmd : null);
  } else {
    if (showCmd) {
      const cq = (deck.cards.find(c => key(c.name) === key(cmd)) || {}).qty || 1;
      body += `<div class="group-head cmd-head"><i class="ms ms-commander" aria-hidden="true"></i>${tr('Commander')}</div><div class="card-table">${cardRow(cmd, cq, true)}</div>`;
    }
    CAT_ORDER.forEach(cat => {
      const rows = groups[cat];
      if (!rows || !rows.length) return;
      const count = rows.reduce((a, c) => a + c.qty, 0);
      body += `<div class="group-head">${catIcon(cat)}${tr(cat)} · ${count}</div><div class="card-table">`;
      body += rows.sort((a, b) => a.name.localeCompare(b.name)).map(c => cardRow(c.name, c.qty, true)).join('');
      body += `</div>`;
    });
  }

  if (deckPendingDelete === deck.id) body = deckDeleteBar(deck) + body;

  $('#app').classList.toggle('wide', deckView === 'stacks' || deckView === 'grid');
  $('#deckDetail').innerHTML = body;
}

/* ---------- deck rename (inline) ---------- */
function startRenameDeck(id) {
  const deck = state.decks.find(d => d.id === id);
  if (!deck) return;
  const h2 = document.querySelector(`[data-deck-title="${id}"]`);
  if (!h2 || h2.querySelector('input')) return;
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'deck-rename-input';
  input.value = deck.name;
  input.maxLength = 80;
  h2.replaceChildren(input);
  input.focus();
  input.select();
  let done = false;
  const commit = () => {
    if (done) return; done = true;
    deck.name = input.value.trim() || deck.name || 'Untitled Deck';
    save();
    render();
  };
  const cancel = () => { if (done) return; done = true; render(); };
  input.addEventListener('keydown', ev => {
    if (ev.key === 'Enter') { ev.preventDefault(); commit(); }
    else if (ev.key === 'Escape') { ev.preventDefault(); cancel(); }
  });
  input.addEventListener('blur', commit);
}

/* ---------- Archidekt-style stacked deck view ---------- */
function renderDeckCards(groups, cmd) {
  let html = `<div class="deck-stacks" style="--stack-w:${deckTile}px">`;
  if (cmd) {
    const deck = state.decks.find(d => d.id === currentDeckId);
    const cq = ((deck && deck.cards.find(c => key(c.name) === key(cmd))) || {}).qty || 1;
    html += deckCardColumn('Commander', [{ name: cmd, qty: cq }]);   // 'Commander' is a category key; column header translates it
  }
  CAT_ORDER.forEach(cat => {
    const rows = groups[cat];
    if (rows && rows.length) html += deckCardColumn(cat, rows);
  });
  return html + '</div>';
}
function deckCardColumn(cat, rows) {
  const sorted = rows.slice().sort((a, b) => a.name.localeCompare(b.name));
  const qty = sorted.reduce((a, c) => a + c.qty, 0);
  const total = sorted.reduce((a, c) => a + c.qty * priceOf(c.name), 0);
  const headIcon = cat === 'Commander' ? '<i class="ms ms-commander gh-ico" aria-hidden="true"></i>' : catIcon(cat);
  let html = `<section class="stack-col${cat === 'Commander' ? ' cmd-col' : ''}">
    <header class="stack-head">${headIcon}<span class="sh-name">${esc(tr(cat))}</span><span class="sh-qty">${qty}</span><span class="sh-price">${money(total)}</span></header>
    <div class="stack-cards">`;
  sorted.forEach((c, i) => {
    const meta = card(c.name);
    const src = displayImage(c.name);
    const art = src
      ? `<img class="sc-art" src="${esc(src)}" alt="${esc(c.name)}" loading="lazy"/>`
      : `<div class="sc-art sc-fallback"><i class="ms ms-dfc-back" aria-hidden="true"></i></div>`;
    const pr = priceOf(c.name);
    const price = pr ? money(pr) : '—';
    const owned = ownedOf(c.name) > 0;
    const rm = deckEdit ? `<button class="sc-remove" data-deckremove="${esc(c.name)}" title="${tr('Remove from deck')}" aria-label="${tr('Remove')}">✕</button>` : '';
    html += `<div class="stack-card nm${owned ? '' : ' not-owned'}" data-name="${esc(c.name)}" style="z-index:${i + 1}" title="${esc(c.name)}${owned ? '' : ' — ' + tr('not owned')}">
      ${art}
      <span class="sc-strip"><span class="sc-qty">${c.qty}×</span><span class="sc-name">${esc(c.name)}</span><span class="sc-price">${price}</span></span>
      ${rm}
    </div>`;
  });
  return html + `</div></section>`;
}

/* ---------- deck grid view (full card tiles grouped by type, like the collection gallery) ---------- */
function renderDeckGrid(groups, cmd) {
  let html = `<div class="deck-typeview" style="--tile:${deckTile}px">`;
  const section = (cat, rows, isCmd) => {
    const sorted = rows.slice().sort((a, b) => a.name.localeCompare(b.name));
    const qty = sorted.reduce((a, c) => a + c.qty, 0);
    const val = sorted.reduce((a, c) => a + c.qty * priceOf(c.name), 0);
    const icon = isCmd ? '<i class="ms ms-commander gh-ico" aria-hidden="true"></i>' : catIcon(cat);
    return `<div class="group-head${isCmd ? ' cmd-head' : ''}">${icon}${esc(tr(cat))} · ${qty}<span class="gh-val">${money(val)}</span></div>`
      + `<div class="deck-gallery">${sorted.map(c => deckGridTile(c.name, c.qty)).join('')}</div>`;
  };
  if (cmd) {
    const deck = state.decks.find(d => d.id === currentDeckId);
    const cq = ((deck && deck.cards.find(c => key(c.name) === key(cmd))) || {}).qty || 1;
    html += section('Commander', [{ name: cmd, qty: cq }], true);
  }
  CAT_ORDER.forEach(cat => { const rows = groups[cat]; if (rows && rows.length) html += section(cat, rows, false); });
  return html + '</div>';
}
function deckGridTile(name, qty) {
  const owned = ownedOf(name) > 0;   // not-owned cards grey out (restore on hover), mirroring the stacks view
  return `<div class="art-tile deckcard${owned ? '' : ' not-owned'}" title="${esc(name)}${owned ? '' : ' — ' + tr('not owned')}">
    <button class="art-open" data-name="${esc(name)}">
      ${artTile(name, qty + '×', `<span class="art-val">${money(priceOf(name))}</span>`, '', true)}
    </button>
  </div>`;
}

/* ---------- optimize deck: switch unowned cards to their cheapest printing ----------
   Fetches all printings per not-fully-owned card from Scryfall (cached), previews the
   projected buy-cost savings, confirms, then applies undoably. Chosen printings are
   GLOBAL per card name, so this changes those cards everywhere they appear. */
let optimizeBusy = false;
async function optimizeDeck(btn) {
  if (optimizeBusy) return;
  const deck = state.decks.find(d => d.id === currentDeckId);
  if (!deck) return;
  const qtyOf = (n) => (deck.cards.find(c => key(c.name) === key(n)) || {}).qty || 0;
  const names = [...new Set(deck.cards.map(c => c.name))].filter(n => ownedOf(n) < qtyOf(n));
  if (!names.length) { toast(tr('Every card in this deck is owned — nothing to optimize.')); return; }

  optimizeBusy = true;
  const origHtml = btn ? btn.innerHTML : '';
  if (btn) btn.disabled = true;
  const setBtn = (txt) => { if (btn) btn.innerHTML = `<span class="spin"></span> ${esc(txt)}`; };

  const currentUsd = (n) => { const a = chosenArt(n); return (a && a.price > 0) ? a.price : (card(n).price || 0); };
  const changes = [];   // { name, copies, from, to, print }
  let done = 0, failed = 0;
  for (const n of names) {
    setBtn(tr('Optimizing… {done}/{total}', { done: ++done, total: names.length }));
    const wasCached = key(n) in printingsCache;
    let prints; try { prints = await loadPrintings(n); } catch (e) { prints = []; }
    if (!wasCached) await sleep(70);   // gentle on Scryfall for fresh lookups only
    if (!prints || !prints.length) { failed++; continue; }
    const priced = prints.filter(p => p.price > 0);
    if (!priced.length) continue;
    const cheap = priced.reduce((m, p) => (p.price < m.price ? p : m), priced[0]);
    const from = currentUsd(n);
    if (!from || cheap.price < from - 0.005) changes.push({ name: n, copies: Math.max(1, qtyOf(n) - ownedOf(n)), from, to: cheap.price, print: cheap });
  }

  if (btn) { btn.disabled = false; btn.innerHTML = origHtml; }
  optimizeBusy = false;

  if (!changes.length) {
    toast(failed === names.length ? tr('Couldn’t reach Scryfall — try again.') : tr('Already on the cheapest printings — nothing to change.'));
    return;
  }
  const savings = changes.reduce((a, c) => a + c.copies * Math.max(0, (c.from || c.to) - c.to), 0);
  if (!confirm(tr('Optimize will switch {n} cards to their cheapest printing, lowering this deck’s buy cost by about {amt}. This changes those cards’ printing everywhere they appear. Continue?', { n: changes.length, amt: money(savings) }))) return;

  pushUndo(tr('Optimize {deck}', { deck: deck.name }));
  changes.forEach(c => {
    const p = c.print;
    state.art[key(c.name)] = { image: p.image, art: p.art, set: p.set, set_name: p.set_name, collector: p.collector, scryfallId: p.id, price: p.price, price_foil: p.price_foil };
  });
  save();
  render();
  toast(tr('Optimized {n} cards — about {amt} off the buy cost.', { n: changes.length, amt: money(savings) }), { undo: true });
}

/* ---------- deck format legality ---------- */
function legalityBar(deck) {
  const { formats, anyUnknown } = deckLegality(deck);
  const chips = LEGAL_FORMATS.map(([fmt, label]) => {
    const v = formats[fmt];
    const count = v.bad.length;
    const tipText = v.status === 'legal' ? tr('Legal|status') : v.status === 'unknown' ? tr('Unknown — re-check') : tr(count === 1 ? '{n} card not legal' : '{n} cards not legal', { n: count });
    const badge = v.status === 'illegal' ? `<span class="lg-count">${count}</span>`
      : v.status === 'unknown' ? `<span class="lg-count q">?</span>` : `<i class="ms ms-counter-shield lg-ok" aria-hidden="true"></i>`;
    return `<button class="lg-chip ${v.status}" data-lgfmt="${fmt}" title="${esc(tr(label))} — ${esc(tipText)}" aria-expanded="false">
      <span class="lg-name">${esc(tr(label))}</span>${badge}<i class="ms ms-ability-investigate lg-i" aria-hidden="true"></i>
    </button>`;
  }).join('');
  const panels = LEGAL_FORMATS.map(([fmt, label]) => {
    const v = formats[fmt];
    if (v.status === 'legal') return '';
    const list = (names, kind) => names.length
      ? `<div class="lg-list ${kind}">${names.map(n => `<button class="lg-card nm" data-name="${esc(n)}">${esc(n)}</button>`).join('')}</div>` : '';
    const body = `${v.bad.length ? `<div class="lg-sub">${tr('Not legal in {fmt}', { fmt: esc(tr(label)) })}</div>${list(v.bad, 'bad')}` : ''}`
      + `${v.missing.length ? `<div class="lg-sub">${tr('Unknown — re-check to confirm')}</div>${list(v.missing, 'unknown')}` : ''}`;
    return `<div class="lg-panel" data-lgpanel="${fmt}" hidden>${body}</div>`;
  }).join('');
  const recheck = anyUnknown
    ? `<button class="lg-recheck" data-lgrecheck="${deck.id}"><i class="ms ms-ability-investigate" aria-hidden="true"></i> ${tr('Re-check legality')}</button>` : '';
  return `<div class="deck-legality"><div class="lg-row">${chips}${recheck}</div>${panels}</div>`;
}
async function recheckDeckLegality(deckId) {
  const deck = state.decks.find(d => d.id === deckId);
  if (!deck) return;
  toast(tr('Re-checking legality…'));
  try {
    await resolveCards(deck.cards.map(c => ({ name: c.name, qty: c.qty })));
    save();
    render();
    toast(tr('Legality updated.'));
  } catch (e) {
    toast(tr('Scryfall lookup failed — try again.'));
  }
}

/* ---------- deck "original list" record (diff + restore) ---------- */
// What's changed since the deck was first imported (or last re-baselined).
function deckDiff(deck) {
  const orig = deck.original || [];
  const om = new Map(orig.map(c => [key(c.name), c.qty]));
  const cm = new Map(deck.cards.map(c => [key(c.name), c.qty]));
  const disp = {};
  orig.forEach(c => disp[key(c.name)] = c.name);
  deck.cards.forEach(c => disp[key(c.name)] = c.name);
  const added = [], removed = [], changed = [];
  new Set([...om.keys(), ...cm.keys()]).forEach(k => {
    const o = om.get(k) || 0, n = cm.get(k) || 0;
    if (!o && n) added.push({ name: disp[k], qty: n });
    else if (o && !n) removed.push({ name: disp[k], qty: o });
    else if (o !== n) changed.push({ name: disp[k], from: o, to: n });
  });
  const byName = (a, b) => a.name.localeCompare(b.name);
  added.sort(byName); removed.sort(byName); changed.sort(byName);
  return { added, removed, changed, origQty: orig.reduce((a, c) => a + c.qty, 0), origUnique: orig.length };
}
function deckDivergence(deck) {
  if (!deck.original) return 0;
  const d = deckDiff(deck);
  return d.added.length + d.removed.length + d.changed.length;
}
function originalPanel(deck) {
  if (!deck.original) return '';
  const { added, removed, changed, origQty, origUnique } = deckDiff(deck);
  const unchanged = !added.length && !removed.length && !changed.length;
  const chip = (n) => `<button class="og-card nm" data-name="${esc(n)}">${esc(n)}</button>`;
  const section = (cls, icon, label, items) => items.length
    ? `<div class="og-group ${cls}"><div class="og-sub">${icon} ${label} · ${items.length}</div><div class="og-list">${items.map(it =>
        cls === 'chg'
          ? `<button class="og-card nm" data-name="${esc(it.name)}">${esc(it.name)} <span class="og-delta">${it.from}→${it.to}</span></button>`
          : chip(it.name)).join('')}</div></div>`
    : '';
  return `<div class="deck-original">
    <div class="og-head">
      <span class="og-title"><i class="ms ms-saga" aria-hidden="true"></i> ${tr('Original list · {n} cards', { n: origQty })}${origUnique !== origQty ? ` ${tr('({n} unique)', { n: origUnique })}` : ''}</span>
      <div class="og-actions">
        <button class="og-btn" data-origcopy="${deck.id}" title="${tr('Copy the original list as text')}"><i class="ms ms-multiple" aria-hidden="true"></i> ${tr('Copy')}</button>
        <button class="og-btn" data-origrebaseline="${deck.id}" title="${tr('Record the current list as the new original')}"><i class="ms ms-artist-nib" aria-hidden="true"></i> ${tr('Set current as original')}</button>
        <button class="og-btn warn" data-origrestore="${deck.id}" title="${tr('Revert this deck to its original list')}"${unchanged ? ' disabled' : ''}>${tr('↺ Restore original')}</button>
      </div>
    </div>
    ${unchanged
      ? `<div class="og-empty">${tr('Unchanged from the original import.')}</div>`
      : `<div class="og-groups">
          ${section('add', '<i class="ms ms-counter-plus" aria-hidden="true"></i>', tr('Added since'), added)}
          ${section('rem', '<i class="ms ms-counter-skull" aria-hidden="true"></i>', tr('Removed since'), removed)}
          ${section('chg', '<i class="ms ms-loyalty-up" aria-hidden="true"></i>', tr('Quantity changed'), changed)}
        </div>`}
  </div>`;
}
function restoreDeckOriginal(deckId) {
  const deck = state.decks.find(d => d.id === deckId);
  if (!deck || !deck.original) return;
  if (!confirm(tr('Revert “{name}” to its original {n}-card list? Cards added since will be removed and any cuts restored. (Your owned-card counts are untouched.)', { name: deck.name, n: deck.original.length }))) return;
  deck.cards = deck.original.map(c => ({ name: c.name, qty: c.qty }));
  if (deck.commander && !deck.cards.some(c => key(c.name) === key(deck.commander))) deck.commander = null;
  save(); render();
  toast(tr('Reverted “{name}” to its original list.', { name: deck.name }));
}
function rebaselineDeck(deckId) {
  const deck = state.decks.find(d => d.id === deckId);
  if (!deck) return;
  if (!confirm(tr('Record the current {n}-card list of “{name}” as the new original? This replaces the previously recorded original.', { n: deck.cards.length, name: deck.name }))) return;
  deck.original = deck.cards.map(c => ({ name: c.name, qty: c.qty }));
  save(); render();
  toast(tr('Recorded the current list as the original for “{name}”.', { name: deck.name }));
}
function copyDeckOriginal(deckId) {
  const deck = state.decks.find(d => d.id === deckId);
  if (!deck || !deck.original) return;
  const text = deck.original.slice().sort((a, b) => a.name.localeCompare(b.name)).map(c => `${c.qty} ${c.name}`).join('\n');
  navigator.clipboard.writeText(text).then(() => toast(tr('Original list copied to clipboard.')), () => toast(tr('Copy failed.')));
}

/* ---------- delete a deck (optionally selling off its cards) ---------- */
// How many owned copies removing this deck's cards would take out of inventory,
// and which of them are still used by OTHER decks (so we can warn).
function deckDeleteStats(deck) {
  let copies = 0, unique = 0;
  const sharedDecks = new Set();
  deck.cards.forEach(c => {
    const take = Math.min(c.qty, ownedOf(c.name));
    if (take <= 0) return;
    copies += take; unique++;
    decksUsing(c.name).forEach(d => { if (d.id !== deck.id) sharedDecks.add(d.name); });
  });
  return { copies, unique, sharedDecks: [...sharedDecks] };
}
function deckDeleteBar(deck) {
  const { copies, sharedDecks } = deckDeleteStats(deck);
  const sharedNote = sharedDecks.length
    ? `<div class="ddc-warn"><i class="ms ms-counter-shield" aria-hidden="true"></i> ${tr(sharedDecks.length === 1 ? 'Some of these cards are also in {decks} — removing copies will leave it short.' : 'Some of these cards are also in {decks} — removing copies will leave them short.', { decks: '<b>' + esc(sharedDecks.join('</b>, <b>')) + '</b>' })}</div>`
    : '';
  return `<div class="deck-delete-confirm">
    <div class="ddc-head"><i class="ms ms-counter-skull" aria-hidden="true"></i> ${tr('Delete “{name}”?', { name: esc(deck.name) })}</div>
    <div class="ddc-actions">
      <button class="ddc-btn" data-confirm-del-only="${deck.id}">${tr('Delete deck only')}<span class="ddc-sub">${tr('keep my cards in my collection')}</span></button>
      <button class="ddc-btn danger" data-confirm-del-cards="${deck.id}"${copies ? '' : ' disabled'}>${tr(copies === 1 ? 'Delete & remove {n} copy from collection' : 'Delete & remove {n} copies from collection', { n: copies })}<span class="ddc-sub">${tr('I sold this deck')}</span></button>
      <button class="ddc-btn ghost" data-confirm-del-cancel>${tr('Cancel')}</button>
    </div>
    ${sharedNote}
  </div>`;
}
function deleteDeck(id) {
  const deck = state.decks.find(d => d.id === id);
  if (!deck) return;
  if (deck.shareCode) unpublishDeck(deck);   // remove its community/public deck row + likes
  state.decks = state.decks.filter(d => d.id !== id);
  deckPendingDelete = null; currentDeckId = null;
  save(); render(); setView('decks');
  toast(tr('Deleted “{name}”. Your cards stay in your collection.', { name: deck.name }));
}
function deleteDeckAndCards(id) {
  const deck = state.decks.find(d => d.id === id);
  if (!deck) return;
  if (deck.shareCode) unpublishDeck(deck);   // unpublish + clear shareCode BEFORE the undo snapshot, so undo can't restore a dead "Published" link
  pushUndo(tr('delete of “{name}”', { name: deck.name }));
  let removed = 0, removedVal = 0;
  deck.cards.forEach(c => {
    const take = Math.min(c.qty, ownedOf(c.name));
    if (take > 0) { setOwned(c.name, ownedOf(c.name) - take); removed += take; removedVal += take * priceOf(c.name); }
  });
  if (removed > 0) logEvent('removed', `${deck.name} (deck sell-off)`, removed, 0, { value: removedVal, note: 'deck sell-off' });
  state.decks = state.decks.filter(d => d.id !== id);
  deckPendingDelete = null; currentDeckId = null;
  save(); render(); setView('decks');
  toast(tr(removed === 1 ? 'Deleted “{name}” and removed {n} copy from your collection.' : 'Deleted “{name}” and removed {n} copies from your collection.', { name: deck.name, n: removed }), { undo: true });
}

/* ---------- deck editing (add / remove / qty) ---------- */
function deckAddBar() {
  return `<div class="deck-add-bar">
    <div class="deck-add-field">
      <i class="ms ms-counter-plus deck-add-ic" aria-hidden="true"></i>
      <input type="text" id="deckAddInput" class="deck-add-input" placeholder="${tr('Add a card to this deck…')}" autocomplete="off" spellcheck="false" role="combobox" aria-expanded="false" aria-controls="deckAddMenu" />
      <div class="deck-ac" id="deckAddMenu" role="listbox" hidden></div>
    </div>
    <span class="deck-add-hint">${tr('Pick a suggestion or press Enter to add.')}</span>
  </div>`;
}
function deckHideAc() { const m = $('#deckAddMenu'); if (m) { m.hidden = true; m.innerHTML = ''; } deckAcItems = []; }
async function deckFetchAc(q) {
  const seq = ++deckAcSeq;
  try {
    const res = await fetch('https://api.scryfall.com/cards/autocomplete?q=' + encodeURIComponent(q));
    if (!res.ok) return;
    const data = await res.json();
    if (seq !== deckAcSeq) return;
    const menu = $('#deckAddMenu'); if (!menu) return;
    deckAcItems = (data.data || []).slice(0, 10);
    if (!deckAcItems.length) { deckHideAc(); return; }
    menu.innerHTML = deckAcItems.map((n, i) => `<button type="button" class="ac-item" role="option" data-deckac="${i}">${esc(n)}</button>`).join('');
    menu.hidden = false;
  } catch (e) { /* offline — silently no-op */ }
}
const deckAcDebounced = (() => { let t; return (q) => { clearTimeout(t); t = setTimeout(() => deckFetchAc(q), 170); }; })();

async function addCardToDeck(name) {
  const deck = state.decks.find(d => d.id === currentDeckId);
  if (!deck || !name) return;
  let canonical = name;
  try { const { resolved } = await resolveCards([{ name, qty: 1 }]); if (resolved && resolved[0]) canonical = resolved[0].name; } catch (e) { /* keep typed name */ }
  const existing = deck.cards.find(c => key(c.name) === key(canonical));
  if (existing) existing.qty += 1;
  else deck.cards.push({ name: canonical, qty: 1 });
  save();
  render();
  const ni = $('#deckAddInput'); if (ni) ni.focus();   // re-rendered input
  toast(tr('Added {card} to “{name}”.', { card: canonical, name: deck.name }));
}
function removeCardFromDeck(name) {
  const deck = state.decks.find(d => d.id === currentDeckId);
  if (!deck) return;
  deck.cards = deck.cards.filter(c => key(c.name) !== key(name));
  if (deck.commander && key(deck.commander) === key(name)) deck.commander = null;
  save();
  render();
}
function setDeckQty(name, delta) {
  const deck = state.decks.find(d => d.id === currentDeckId);
  if (!deck) return;
  const c = deck.cards.find(x => key(x.name) === key(name));
  if (!c) return;
  c.qty = Math.max(1, c.qty + delta);
  save();
  render();
}

/* ---- Assign a card to ANY deck from the card viewer (independent of the open deck) ---- */
function deckQtyOf(name, deck) {
  const c = deck.cards.find(x => key(x.name) === key(name));
  return c ? c.qty : 0;
}
// Set the absolute copy-count of `name` in deck `deckId` (0 removes it).
function setCardInDeck(name, deckId, newQty) {
  const deck = state.decks.find(d => d.id === deckId);
  if (!deck || !name) return;
  newQty = Math.max(0, Math.round(newQty));
  const c = deck.cards.find(x => key(x.name) === key(name));
  if (newQty === 0) {
    deck.cards = deck.cards.filter(x => key(x.name) !== key(name));
    if (deck.commander && key(deck.commander) === key(name)) deck.commander = null;   // pulled the commander out
  } else if (c) { c.qty = newQty; }
  else { deck.cards.push({ name, qty: newQty }); }
  save();
  render();                 // inventory "where"/deck views behind the modal stay live
  refreshDeckAssign(name);  // and the chips in the still-open viewer
}
function toggleCardInDeck(name, deckId) {
  const deck = state.decks.find(d => d.id === deckId);
  if (!deck) return;
  const wasIn = deckQtyOf(name, deck) > 0;
  setCardInDeck(name, deckId, wasIn ? 0 : 1);
  toast(tr(wasIn ? 'Removed {card} from “{name}”.' : 'Added {card} to “{name}”.', { card: name, name: deck.name }));
}
// The "Assign to decks" block inside the card viewer — every deck as a toggle row + qty stepper.
function deckAssignHtml(name) {
  if (!state.decks.length) {
    return `<div class="cv-decks-head"><i class="ms ms-saga" aria-hidden="true"></i> ${tr('Assign to decks')}</div>
      <div class="cv-decks-empty">${tr('No decks yet — import or build one first.')}</div>`;
  }
  const rows = state.decks.map(d => {
    const q = deckQtyOf(name, d);
    const isCmd = d.commander && key(d.commander) === key(name);
    return `<div class="cv-deck-row${q ? ' in' : ''}">
      <button type="button" class="cv-deck-tog" data-assigndeck="${esc(d.id)}" data-name="${esc(name)}" title="${q ? tr('Remove from {name}', { name: esc(d.name) }) : tr('Add to {name}', { name: esc(d.name) })}">
        <i class="ms ${q ? 'ms-saga' : 'ms-counter-plus'} cv-deck-ic" aria-hidden="true"></i>
        <span class="cv-deck-name">${esc(d.name)}</span>
        ${isCmd ? `<i class="ms ms-commander cv-deck-cmd" title="${tr('Commander')}" aria-hidden="true"></i>` : ''}
      </button>
      <div class="cv-deck-step">
        <button type="button" data-assignqty="-1" data-deck="${esc(d.id)}" data-name="${esc(name)}" ${q ? '' : 'disabled'} aria-label="${tr('One fewer in {name}', { name: esc(d.name) })}">−</button>
        <span class="n">${q}</span>
        <button type="button" data-assignqty="1" data-deck="${esc(d.id)}" data-name="${esc(name)}" aria-label="${tr('One more in {name}', { name: esc(d.name) })}">+</button>
      </div>
    </div>`;
  }).join('');
  return `<div class="cv-decks-head"><i class="ms ms-saga" aria-hidden="true"></i> ${tr('Assign to decks')}</div>
    <div class="cv-decks-list">${rows}</div>`;
}
function refreshDeckAssign(name) {
  const box = $('#cvDeckAssign');
  if (box && cardViewName && key(cardViewName) === key(name)) box.innerHTML = deckAssignHtml(name);
}

function cardRow(name, reqQty, showStepper) {
  const meta = card(name);
  if (deckEdit) {
    return `<div class="card-row editing">
      <div class="deck-qty">
        <button data-deckqty="-1" data-name="${esc(name)}" aria-label="${tr('One fewer')}">−</button>
        <span class="n">${reqQty}</span>
        <button data-deckqty="1" data-name="${esc(name)}" aria-label="${tr('One more')}">+</button>
      </div>
      <div class="cname">
        <span class="nm" data-name="${esc(name)}" data-uri="${esc(meta.uri || '')}" title="${esc(name)}">${esc(name)}</span>
        ${manaSymbols(meta.mana_cost)}
      </div>
      <button class="deck-remove" data-deckremove="${esc(name)}" title="${tr('Remove from deck')}" aria-label="${tr('Remove {name}', { name: esc(name) })}">✕</button>
    </div>`;
  }
  const have = ownedOf(name);
  const cls = have >= reqQty ? 'owned' : have > 0 ? 'partial' : 'missing';
  const need = Math.max(0, reqQty - have);
  const priceEach = priceOf(name);
  const priceCell = need > 0
    ? `<div class="price"><span class="need">${money(need * priceEach)}</span></div>`
    : `<div class="price have-all">${tr('✓ owned')}</div>`;
  const stepper = showStepper ? `
    <div class="own-step">
      <button data-step="-1" data-name="${esc(name)}">−</button>
      <span class="n">${have}<span class="req">/${reqQty}</span></span>
      <button data-step="1" data-name="${esc(name)}">+</button>
    </div>` : '';
  return `<div class="card-row ${cls}">
    <button class="toggle ${have >= reqQty ? 'on' : ''}" data-toggle="${esc(name)}" data-req="${reqQty}" title="${tr('Toggle owned')}"></button>
    <div class="cname">
      <span class="qty">${reqQty}×</span>
      <span class="nm" data-uri="${esc(meta.uri || '')}" title="${esc(name)}">${esc(name)}</span>
      ${manaSymbols(meta.mana_cost)}
    </div>
    ${stepper}
    ${priceCell}
  </div>`;
}

function renderInventory() {
  let names = allCardNames().filter(n => ownedOf(n) > 0);   // unowned cards live on the Buy List, not here
  const q = invSearch.toLowerCase();
  if (q) names = names.filter(n => n.toLowerCase().includes(q));
  names = names.filter(n => {
    const have = ownedOf(n), need = maxRequired(n);
    if (invFilter === 'owned') return have > 0;
    if (invFilter === 'needed') return need > have;
    if (invFilter === 'loose') return have > 0 && decksUsing(n).length === 0;
    return true;
  });
  if (invFacet) names = names.filter(n => {
    const meta = card(n);
    if (invFacet.kind === 'guild') return (meta.colors || []).every(c => invFacet.colors.includes(c));
    if (invFacet.kind === 'tribe') return subtypesOf(meta).includes(invFacet.value);
    return true;
  });
  if (invColors.length) names = names.filter(n => {
    const cols = card(n).colors || [];
    if (invColorOnly) {
      // "only" mode: the card must be confined to the selected colours
      if (cols.length === 0) return invColors.includes('C');
      return cols.every(c => invColors.includes(c));
    }
    return invColors.some(c => c === 'C' ? cols.length === 0 : cols.includes(c));
  });
  if (invType !== 'all') names = names.filter(n => category(n) === invType);
  if (invRarity !== 'all') names = names.filter(n => (card(n).rarity || '') === invRarity);
  if (invSort === 'price-desc') names.sort((a, b) => unitPrice(b) - unitPrice(a) || a.localeCompare(b));
  else if (invSort === 'price-asc') names.sort((a, b) => unitPrice(a) - unitPrice(b) || a.localeCompare(b));
  else if (invSort === 'rarity-desc') names.sort((a, b) => rarityRank(b) - rarityRank(a) || a.localeCompare(b));
  else if (invSort === 'rarity-asc') names.sort((a, b) => rarityRank(a) - rarityRank(b) || a.localeCompare(b));
  else if (invSort === 'new') names.sort((a, b) => addedOf(b) - addedOf(a) || a.localeCompare(b));   // newest acquisitions first
  else if (invSort === 'old') names.sort((a, b) => addedOf(a) - addedOf(b) || a.localeCompare(b));   // legacy (no timestamp) = oldest → first
  else names.sort((a, b) => a.localeCompare(b));

  renderFacetBar();
  $('#invFilterClear').hidden = !(invColors.length || invColorOnly || invType !== 'all' || invRarity !== 'all' || invSort !== 'name');

  const faceted = !!invFacet;
  const g = faceted ? statsFor(names) : globalStats();
  $('#invStats').innerHTML = `
    <div class="s"><div class="v">${g.unique}</div><div class="l"><i class="ms ms-multiple stat-ic" aria-hidden="true"></i>${faceted ? tr('Cards Shown') : tr('Unique Cards')}</div></div>
    <div class="s"><div class="v">${g.ownedCount}</div><div class="l"><i class="ms ms-library stat-ic" aria-hidden="true"></i>${tr('Owned Copies')}</div></div>
    <div class="s"><div class="v">${money(g.ownedValue)}</div><div class="l"><i class="ms ms-counter-gold stat-ic" aria-hidden="true"></i>${faceted ? tr('Value Shown') : tr('Collection Value')}</div></div>
    <div class="s"><div class="v">${money(g.buyCost)}</div><div class="l"><i class="ms ms-counter-gold stat-ic" aria-hidden="true"></i>${tr('Still to Buy')}</div></div>`;

  const table = $('#inventoryTable');
  table.classList.toggle('gallery', invMode === 'art');
  table.style.setProperty('--tile', invTile + 'px');
  const invSizeWrap = $('#invSizeWrap');
  if (invSizeWrap) { invSizeWrap.hidden = invMode !== 'art'; const r = $('#invSizeRange'); if (r) r.value = invTile; }
  if (!names.length) {
    table.innerHTML = `<div class="view-sub" style="padding:30px 0">${tr('No cards match.')}</div>`;
  } else if (invMode === 'art') {
    table.innerHTML = names.map(n => inventoryArtTile(n)).join('');
  } else {
    table.innerHTML = names.map(n => inventoryCardBlock(n)).join('');
  }
}

// A full-card-art tile for the gallery view (aggregates a card's variants).
// inlineQty=true puts the quantity badge next to the card name (used by the deck Grid view)
// instead of as an overlay on the card image.
function artTile(name, badge, valueHtml, extra = '', inlineQty = false) {
  const meta = card(name);
  const src = displayImage(name);
  const img = src
    ? `<img src="${esc(src)}" alt="${esc(name)}" loading="lazy"/>`
    : `<div class="art-fallback"><i class="ms ms-dfc-back" aria-hidden="true"></i></div>`;
  const marks = `<span class="art-marks">${typeIcon(name)}${rarityIcon(meta.rarity)}</span>`;
  const overlay = (badge && !inlineQty) ? `<span class="art-qty">${badge}</span>` : '';
  const nameHtml = (badge && inlineQty) ? `<b class="art-qn">${badge}</b> ${esc(name)}` : esc(name);
  return `<div class="art-img">${img}${overlay}${marks}${extra}</div>
    <div class="art-info"><span class="art-name">${nameHtml}</span>${valueHtml}</div>`;
}
// One art tile for the list-matcher galleries (opens the card viewer on click). `dim` greys cards in the "skip / not-owned" group.
function matchTile(name, badge, price, dim) {
  return `<div class="art-tile match${dim ? ' dim' : ''}"><button class="art-open" data-name="${esc(name)}">${artTile(name, badge, `<span class="art-val">${price ? money(price) : '—'}</span>`)}</button></div>`;
}
// Art / List toggle shown above match results. `id` = 'buyMatchMode' | 'sellMatchMode'; `mode` = current.
function matchModeToggle(id, mode) {
  return `<div class="seg sm-modeseg" id="${id}">
    <button class="seg-btn ${mode === 'art' ? 'is-active' : ''}" data-matchmode="art"><i class="ms ms-token" aria-hidden="true"></i> ${tr('Art')}</button>
    <button class="seg-btn ${mode === 'text' ? 'is-active' : ''}" data-matchmode="text"><i class="ms ms-multiple" aria-hidden="true"></i> ${tr('List')}</button>
  </div>`;
}
function inventoryArtTile(name) {
  const meta = card(name);
  const have = ownedOf(name);
  const anyFoil = variantsOf(name).some(v => v.foil);
  const foilTag = anyFoil ? `<span class="art-foil" title="${tr('Foil copy')}">${FOIL_SPARK}</span>` : '';
  const listed = cardListedAnywhere(name);
  return `<div class="art-tile inv${listed ? ' listed' : ''}">
    <button class="art-open" data-name="${esc(name)}">
      ${artTile(name, have + '×', `<span class="art-val">${money(ownedValueOf(name))}</span>`, foilTag)}
    </button>
    <button class="inv-sell" data-sellcard="${esc(name)}" title="${listed ? tr('In a sell list — choose lists') : tr('Add to a sell list')}" aria-label="${tr('Choose sell lists')}"><i class="ms ms-counter-gold" aria-hidden="true"></i></button>
  </div>`;
}

function whereCell(name) {
  const used = decksUsing(name);
  return used.length
    ? `<span class="where"><i class="ms ms-saga where-ic" aria-hidden="true"></i>${tr('in')} <b>${used.map(d => esc(d.name)).join('</b>, <b>')}</b></span>`
    : `<span class="where unlinked" style="color:var(--brass)"><i class="ms ms-land where-ic" aria-hidden="true"></i>${tr('unlinked')}</span>`;
}

// One card = its own variant rows (foil / printing / condition split out).
// Editing the properties lives in the card viewer now — click the card to open it.
function inventoryCardBlock(name) {
  const vs = variantsOf(name);
  if (!vs.length) return '';
  return `<div class="inv-card">${vs.map(v => inventoryVariantRow(name, v)).join('')}</div>`;
}

function inventoryVariantRow(name, v) {
  const meta = card(name);
  const unit = variantPrice(name, v);
  const badges = [
    v.foil ? `<span class="vbadge foil">${FOIL_SPARK} Foil</span>` : '',
    (v.condition && v.condition !== 'NM') ? `<span class="vbadge cond"><i class="ms ${COND_ICON[v.condition] || 'ms-counter-shield'}" aria-hidden="true"></i> ${esc(v.condition)}</span>` : '',
    v.set ? `<span class="vbadge set"><i class="ms ms-fw ms-multiple" aria-hidden="true"></i> ${esc(v.set)}${v.collector ? ' ' + esc(v.collector) : ''}</span>` : '',
    v.notes ? `<span class="vbadge note" title="${esc(v.notes)}"><i class="ms ms-artist-nib" aria-hidden="true"></i> ${esc(v.notes)}</span>` : ''
  ].join('');
  return `<div class="variant-wrap" data-vwrap="${v.id}">
    <div class="card-row owned">
      <span class="toggle on" title="${tr('Owned')}"></span>
      <div class="cname">
        <span class="row-marks">${typeIcon(name)}${rarityIcon(meta.rarity)}</span>
        <span class="nm" data-name="${esc(name)}" data-uri="${esc(meta.uri || '')}" title="${esc(name)}">${esc(name)}</span>
        ${manaSymbols(meta.mana_cost)}
        ${badges}
      </div>
      <div class="own-step">
        <button data-vstep="-1" data-vid="${v.id}" data-name="${esc(name)}">−</button>
        <span class="n">${v.qty}</span>
        <button data-vstep="1" data-vid="${v.id}" data-name="${esc(name)}">+</button>
      </div>
      ${whereCell(name)}
      <div class="price">${money(unit)}<br><span style="color:var(--gold-soft)">${money(unit * v.qty)}</span></div>
      <button class="inv-sell-btn ${variantListedAnywhere(v.id) ? 'on' : ''}" data-sellvar="${v.id}" data-name="${esc(name)}" title="${tr('Choose which sell list(s) this copy goes in')}"><i class="ms ms-counter-gold" aria-hidden="true"></i> ${variantListedAnywhere(v.id) ? tr('Listed') : tr('Sell')}</button>
    </div>
  </div>`;
}

// Variant property editor — rendered inside the card viewer ("Edit copies").
function cardVariantsEditor(name) {
  const vs = variantsOf(name);
  const rows = vs.map(v => `
    <div class="cvv-row" data-cvwrap="${v.id}">
      <div class="cvv-top">
        <div class="own-step">
          <button data-vstep="-1" data-vid="${v.id}" data-name="${esc(name)}">−</button>
          <span class="n">${v.qty}</span>
          <button data-vstep="1" data-vid="${v.id}" data-name="${esc(name)}">+</button>
        </div>
        <label class="ve-toggle"><input type="checkbox" data-vfoil="${v.id}" ${v.foil ? 'checked' : ''}/> ${FOIL_SPARK} Foil</label>
        <button class="ve-print" data-vprint="${v.id}" data-name="${esc(name)}" title="${tr('Choose this copy\'s printing')}"><i class="ms ms-artist-nib" aria-hidden="true"></i> ${v.set ? esc(v.set) : tr('Printing')}</button>
        <button class="ve-sell ${variantListedAnywhere(v.id) ? 'on' : ''}" data-cvsell="${v.id}" data-name="${esc(name)}" title="${tr('Choose which sell list(s) this copy goes in')}"><i class="ms ms-counter-gold" aria-hidden="true"></i> ${variantListedAnywhere(v.id) ? tr('Listed') : tr('Sell')}</button>
        <button class="ve-del" data-vdel="${v.id}" data-name="${esc(name)}" title="${tr('Remove this copy')}">${tr('Delete')}</button>
      </div>
      <div class="cvv-strip" data-vstripwrap="${v.id}" hidden></div>
      <div class="cvv-fields">
        <label class="ve-field"><span>${tr('Condition')}</span>
          <select data-vcond="${v.id}">${CONDITIONS.map(c => `<option value="${c}" ${v.condition === c ? 'selected' : ''}>${tr(COND_LABEL[c])}</option>`).join('')}</select>
        </label>
        <label class="ve-field"><span>${tr('Set')}</span><input type="text" data-vset="${v.id}" value="${esc(v.set || '')}" placeholder="CMM" maxlength="6"/></label>
        <label class="ve-field"><span>${tr('Collector №')}</span><input type="text" data-vcoll="${v.id}" value="${esc(v.collector || '')}" placeholder="—" maxlength="12"/></label>
        <label class="ve-field grow"><span>${tr('Notes / tags')}</span><input type="text" data-vnotes="${v.id}" value="${esc(v.notes || '')}" placeholder="${tr('signed, altered, traded…')}"/></label>
      </div>
    </div>`).join('');
  return `${rows || `<p class="cvv-empty">${tr('No copies catalogued yet — add one below.')}</p>`}
    <button class="add-variant" data-addvar="${esc(name)}"><i class="ms ms-token" aria-hidden="true"></i> ${tr('add a printing or foil')}</button>`;
}
function refreshCardEditor() {
  const box = $('#cvVariants');
  if (box && !box.hidden && cardViewName) box.innerHTML = cardVariantsEditor(cardViewName);
}

// Decks currently included in the buy list (empty selection = all decks).
function buyDecksActive() {
  return buyDeckSel.length ? state.decks.filter(d => buyDeckSel.includes(d.id)) : state.decks;
}
// Highest copy-count a card is required at, limited to a given set of decks.
// How many copies of a card are "wanted" for the buy list = the max of the deck requirement
// (across the active decks) and the manual wishlist. MAX, not sum — an EDH singleton you both
// run and wishlist still only needs one copy.
function requiredFor(name, decks) {
  let m = wishOf(name);
  decks.forEach(d => d.cards.forEach(c => { if (key(c.name) === key(name)) m = Math.max(m, c.qty); }));
  return m;
}

function renderBuyDeckFilter() {
  const bar = $('#buyDeckFilter');
  if (!bar) return;
  if (state.decks.length <= 1) { bar.hidden = true; bar.innerHTML = ''; return; }
  bar.hidden = false;
  const chips = state.decks.map(d => {
    const on = buyDeckSel.length === 0 || buyDeckSel.includes(d.id);
    return `<button class="buy-deck-chip ${on ? 'on' : ''}" data-deck="${d.id}">${esc(d.name)}</button>`;
  }).join('');
  bar.innerHTML = `<span class="buy-filter-label"><i class="ms ms-library" aria-hidden="true"></i> ${tr('Decks')}</span>${chips}` +
    (buyDeckSel.length ? `<button class="buy-deck-chip clear" data-deck="all">${tr('↺ All decks')}</button>` : '');
}

// Single source of truth for buy-list ordering — shared by renderBuyList, buyListText, buyExportRows.
// `decks` is the active deck filter (price sorts use the line cost). Name is the stable secondary key.
function buyCompare(sort, decks) {
  const subOf = n => (requiredFor(n, decks) - ownedOf(n)) * priceOf(n);
  const byName = (a, b) => a.localeCompare(b);
  const colorKey = n => {
    const cs = card(n).colors || [];
    if (cs.length === 0) return COLOR_ORDER.indexOf('C');     // colourless
    if (cs.length > 1) return COLOR_ORDER.length + cs.length; // multicolour after all monos & colourless
    return COLOR_ORDER.indexOf(cs[0]);                        // mono W/U/B/R/G
  };
  const typeKey = n => CAT_ORDER.indexOf(category(n));
  const setKey = n => (card(n).set || '￿');              // missing set sorts last
  switch (sort) {
    case 'name':        return byName;
    case 'price-asc':   return (a, b) => subOf(a) - subOf(b) || byName(a, b);
    case 'rarity-desc': return (a, b) => rarityRank(b) - rarityRank(a) || byName(a, b);
    case 'rarity-asc':  return (a, b) => rarityRank(a) - rarityRank(b) || byName(a, b);
    case 'color':       return (a, b) => colorKey(a) - colorKey(b) || byName(a, b);
    case 'type':        return (a, b) => typeKey(a) - typeKey(b) || byName(a, b);
    case 'set':         return (a, b) => setKey(a).localeCompare(setKey(b)) || byName(a, b);
    default:            return (a, b) => subOf(b) - subOf(a) || byName(a, b); // price-desc: biggest line cost first
  }
}
function colorGroupLabel(n) {
  const cs = card(n).colors || [];
  if (cs.length === 0) return 'Colourless';
  if (cs.length > 1) return 'Multicolour';
  return COLOR_NAME[cs[0]] || 'Colourless';
}

function renderBuyList() {
  renderBuyFolders();
  const binder = activeBinder();
  toggleBuyHeaderForMode(!!binder);
  if (binder) { renderBinder(binder); return; }   // a manual binder is open — skip the auto deck-needs list
  renderBuyDeckFilter();
  const matchBtn = $('#buyMatchBtn'); if (matchBtn) matchBtn.classList.toggle('on', buyMatchOpen);
  if (buyMatchOpen) {
    if ($('#buyListSub')) $('#buyListSub').textContent = buyMatchStoreName
      ? tr('Matching your buy list against {store}.', { store: buyMatchStoreName })
      : tr('Paste a seller’s list to see what you’d buy.');
    const wrap = $('#buySizeWrap'); if (wrap) wrap.hidden = true;
    const t = $('#buyTable'); if (t) { t.classList.remove('gallery'); t.innerHTML = buyMatchPanel(); }
    return;
  }
  const decks = buyDecksActive();
  let names = allCardNames().filter(n => requiredFor(n, decks) > ownedOf(n));
  const q = buySearch.trim().toLowerCase();
  const se = $('#buySearch'); if (se && se.value !== buySearch) se.value = buySearch;
  if (q) names = names.filter(n => n.toLowerCase().includes(q));
  names.sort(buyCompare(buySort, decks));
  let total = 0, copies = 0, picked = 0, pickedCost = 0;
  const rowData = names.map(n => {
    const need = requiredFor(n, decks) - ownedOf(n);
    const sub = need * priceOf(n);
    total += sub; copies += need;
    const included = !buyExclude.has(key(n));
    if (included) { picked += need; pickedCost += sub; }
    const used = decks.filter(d => d.cards.some(c => key(c.name) === key(n)));
    return { n, need, sub, included, used, wished: wishOf(n) > 0 };
  });
  const deckCount = new Set(names.flatMap(n => decks.filter(d => d.cards.some(c => key(c.name) === key(n))).map(d => d.id))).size;
  const selecting = picked !== copies;
  $('#buyListSub').textContent = names.length
    ? ((selecting
        ? tr('{picked} of {copies} cards selected · {pickedCost} of {total}', { picked, copies, pickedCost: money(pickedCost), total: money(total) })
        : tr(deckCount === 1 ? '{copies} cards across {decks} deck · {total} total' : '{copies} cards across {decks} decks · {total} total', { copies, decks: deckCount, total: money(total) })) + (q ? ' · ' + tr('matching “{q}”', { q: buySearch.trim() }) : ''))
    : (q ? tr('No buy-list cards match “{q}”.', { q: buySearch.trim() })
         : (buyDeckSel.length ? tr('Nothing to buy for the selected decks.') : tr('Nothing to buy — every deck is complete.')));

  const table = $('#buyTable');
  table.classList.toggle('gallery', buyMode === 'art');
  table.style.setProperty('--tile', buyTile + 'px');
  const buySizeWrap = $('#buySizeWrap');
  if (buySizeWrap) { buySizeWrap.hidden = buyMode !== 'art'; const r = $('#buySizeRange'); if (r) r.value = buyTile; }
  if (!names.length) {
    table.innerHTML = q
      ? `<div class="empty-state"><span class="empty-mark"><i class="ms ms-ability-investigate" aria-hidden="true"></i></span><h2>${tr('No matches')}</h2><p>${tr('No buy-list cards match “{q}”.', { q: esc(buySearch.trim()) })}</p></div>`
      : `<div class="empty-state"><span class="empty-mark"><i class="ms ms-counter-shield" aria-hidden="true"></i></span><h2>${tr('Fully stocked')}</h2><p>${tr('You own everything your decks require.')}</p></div>`;
  } else if (buyMode === 'art') {
    table.innerHTML = rowData.map(buyArtTile).join('');
  } else {
    // Colour/type sorts get section dividers so a printed seller list reads like a binder.
    const grouping = buySort === 'color' || buySort === 'type';
    let last = null;
    table.innerHTML = rowData.map(rd => {
      let head = '';
      if (grouping) {
        const g = buySort === 'color' ? colorGroupLabel(rd.n) : category(rd.n);
        if (g !== last) { head = `<div class="buy-group-head">${esc(tr(g))}</div>`; last = g; }
      }
      return head + buyRow(rd);
    }).join('');
  }
}
function buyRow({ n, need, sub, included, used, wished }) {
  const meta = card(n);
  const where = used.length
    ? `<i class="ms ms-saga where-ic" aria-hidden="true"></i>${tr('for')} <b>${used.map(d => esc(d.name)).join('</b>, <b>')}</b>${wished ? ` <b class="wish-tag">${tr('＋ wishlist')}</b>` : ''}`
    : `<i class="ms ms-counter-gold where-ic" aria-hidden="true"></i><b class="wish-tag">${tr('Wishlist')}</b>`;
  return `<div class="card-row missing ${included ? '' : 'excluded'}">
    <input type="checkbox" class="buy-pick" data-pick="${esc(n)}" ${included ? 'checked' : ''} title="${tr('On your buy list — uncheck to permanently skip buying this card')}" />
    <div class="cname"><span class="row-marks">${typeIcon(n)}${rarityIcon(meta.rarity)}</span><span class="qty">${need}×</span><span class="nm" data-name="${esc(n)}" data-uri="${esc(meta.uri || '')}">${esc(n)}</span>${manaSymbols(meta.mana_cost)}</div>
    <span class="where">${where}</span>
    <div class="price"><span class="need">${money(sub)}</span></div>
    ${state.buyBinders.length ? `<button class="to-binder" data-tobinder="${esc(n)}" title="${tr('File into a buy binder')}" aria-label="${tr('Add to a buy binder')}"><i class="ms ms-counter-lore" aria-hidden="true"></i></button>` : ''}
    <button class="buy-got" data-bought="${esc(n)}" title="${tr('I bought {n} — add to my collection', { n: need })}"><i class="ms ms-counter-shield" aria-hidden="true"></i> ${tr('Bought')}</button>
  </div>`;
}
function buyArtTile({ n, need, sub, included }) {
  const pick = `<input type="checkbox" class="buy-pick art-pick" data-pick="${esc(n)}" ${included ? 'checked' : ''} title="${tr('Include in the exported list')}" />`;
  return `<div class="art-tile buy ${included ? '' : 'excluded'}">
    ${pick}
    ${state.buyBinders.length ? `<button class="to-binder tile" data-tobinder="${esc(n)}" title="${tr('File into a buy binder')}" aria-label="${tr('Add to a buy binder')}"><i class="ms ms-counter-lore" aria-hidden="true"></i></button>` : ''}
    <button class="buy-got-tile" data-bought="${esc(n)}" title="${tr('I bought {n} — add to my collection', { n: need })}"><i class="ms ms-counter-shield" aria-hidden="true"></i></button>
    <button class="art-open" data-name="${esc(n)}">
      ${artTile(n, need + '×', `<span class="art-val need">${money(sub)}</span>`)}
    </button>
  </div>`;
}
// "Bought" — acquire the still-needed copies into collection; the card then drops off the buy list.
function markBought(name) {
  const need = requiredFor(name, buyDecksActive()) - ownedOf(name);
  if (need <= 0) return;
  pushUndo(tr('buy of {n}× {name}', { n: need, name }));
  addVariant(name, { qty: need });
  logEvent('bought', name, need, priceOf(name));
  save(); render();
  toast(tr('Bought {n}× {name} — added to your collection.', { n: need, name }), { undo: true });
}

/* =====================================================================
   VIEW ROUTING
   ===================================================================== */
function setView(v) {
  if (v !== 'deck') currentDeckId = null;   // leaving the deck view drops deck context (so card-view commander control etc. don't leak)
  document.documentElement.classList.toggle('home-active', v === 'home');   // home is a fixed, non-scrolling full-screen landing
  $$('.view').forEach(s => s.classList.remove('is-active'));
  $('#view-' + v).classList.add('is-active');
  $$('.tab').forEach(t => t.classList.toggle('is-active', t.dataset.view === v));
  const bs = $('#buysellTab'); if (bs) bs.classList.toggle('is-active', ['buylist', 'selllist', 'history'].includes(v));
  $$('#buysellMenu [data-view]').forEach(b => b.classList.toggle('on', b.dataset.view === v));
  if (v !== 'deck') $('#app').classList.remove('wide');   // stacks-view wide layout is deck-only
}
function openDeck(id) {
  currentDeckId = id;
  deckEdit = false;
  deckShowOriginal = false;
  deckPendingDelete = null;
  deckCardFilter = 'all';
  renderDeckDetail();
  $$('.view').forEach(s => s.classList.remove('is-active'));
  $('#view-deck').classList.add('is-active');
  $$('.tab').forEach(t => t.classList.remove('is-active'));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* =====================================================================
   IMPORT FLOW
   ===================================================================== */
// Fetch + cache parsed cards, returning canonical {name, qty} list and miss count.
async function resolveCards(parsed) {
  const index = await fetchCardData(parsed);
  let missing = 0;
  const resolved = parsed.map(p => {
    const found = index[key(p.name)];
    let canonical = p.name;
    if (found) {
      const d = distill(found);
      state.cards[key(d.name)] = d;
      canonical = d.name;
    } else {
      state.cards[key(p.name)] = { name: p.name, type_line: 'Unknown', colors: [], price: 0, mana_cost: '', notFound: true };
      missing++;
    }
    return { ...p, name: canonical };
  });
  return { resolved, missing };
}

async function importDeck() {
  const name = $('#deckNameInput').value.trim() || 'Untitled Deck';
  const text = $('#decklistInput').value;
  const ownAll = $('#ownAllInput').checked;
  const parsed = parseDecklist(text);
  const status = $('#importStatus');
  if (!parsed.length) { status.textContent = tr('No cards detected — check the list.'); return; }

  status.innerHTML = `<span class="spin"></span>${tr('Summoning {n} cards from Scryfall…', { n: parsed.length })}`;
  $('#confirmImport').disabled = true;
  try {
    const { resolved, missing } = await resolveCards(parsed);
    if (ownAll) {
      let added = 0, addedVal = 0;
      resolved.forEach(c => {
        const cur = ownedOf(c.name), tgt = Math.max(cur, c.qty);
        if (tgt > cur) { added += tgt - cur; addedVal += (tgt - cur) * priceOf(c.name); }
        setOwned(c.name, tgt);
      });
      if (added > 0) logEvent('added', `${name} (deck owned)`, added, 0, { value: addedVal, note: 'deck owned' });
    }
    const cmd = resolved.find(c => c.commander);
    const cards = resolved.map(c => ({ name: c.name, qty: c.qty }));
    const deck = { id: uid(), name, cards, original: cards.map(c => ({ ...c })) };
    if (cmd) deck.commander = cmd.name;
    state.decks.push(deck);
    save();
    closeImport();
    render();
    setView('decks');
    toast(tr('“{name}” catalogued', { name }) + (cmd ? ' · ' + tr('{name} set as commander', { name: esc(cmd.name) }) : '') + (missing ? ' · ' + tr(missing === 1 ? '{n} card not found' : '{n} cards not found', { n: missing }) : '') + '.');
  } catch (e) {
    status.textContent = tr('Scryfall lookup failed — check your connection and retry.');
  } finally {
    $('#confirmImport').disabled = false;
  }
}

// Build from scratch: create an empty deck and open it so cards can be added one by one (or from Browse).
function createEmptyDeck() {
  const name = $('#deckNameInput').value.trim() || 'New Deck';
  const deck = { id: uid(), name, cards: [], original: [] };
  state.decks.push(deck);
  save();
  closeImport();
  openDeck(deck.id);
  deckEdit = true;            // open straight into edit mode so the add-card bar is ready (openDeck resets it)
  renderDeckDetail();
  $('#deckAddInput') && $('#deckAddInput').focus();
  toast(tr('Created “{name}” — add cards below, or from Browse.', { name }));
}
function openImport() { $('#importModal').hidden = false; $('#deckNameInput').focus(); }
function closeImport() {
  $('#importModal').hidden = true;
  $('#deckNameInput').value = '';
  $('#decklistInput').value = '';
  $('#ownAllInput').checked = false;
  $('#importStatus').textContent = '';
}

/* add loose owned cards (not tied to any deck) */
async function addLooseCards() {
  const text = $('#addInput') ? $('#addInput').value : '';
  const tagEntries = addTags.map(t => ({ name: t.name, qty: t.qty, foil: t.foil }));
  const combined = [...tagEntries, ...parseDecklist(text)];
  const status = $('#addStatus');
  if (!combined.length) { status.textContent = tr('No cards yet — search to add some, or paste a list.'); return; }

  status.innerHTML = `<span class="spin"></span>${tr('Looking up {n} cards…', { n: combined.length })}`;
  $('#confirmAdd').disabled = true;
  try {
    const { resolved, missing } = await resolveCards(combined);
    if (addTarget === 'store' && myStore) {
      const added = addResolvedToStore(resolved);
      scheduleStoreSave(); closeAdd(); setView('store'); renderStoreDashboard();
      toast(tr(added === 1 ? 'Added {n} card to your inventory' : 'Added {n} cards to your inventory', { n: added }) + (missing ? ' · ' + tr('{n} not found', { n: missing }) : '') + '.');
      return;
    }
    resolved.forEach(c => addVariant(c.name, { qty: c.qty, foil: !!c.foil }));
    logAcquired(resolved, tr('Added {n} cards', { n: resolved.length }));
    save();
    closeAdd();
    render();
    setView('inventory');
    const n = resolved.length;
    toast(tr(n === 1 ? 'Added {n} card to your collection' : 'Added {n} cards to your collection', { n }) + (missing ? ' · ' + tr('{n} not found', { n: missing }) : '') + '.');
  } catch (e) {
    status.textContent = tr('Scryfall lookup failed — check your connection and retry.');
  } finally {
    $('#confirmAdd').disabled = false;
  }
}

// Import a ManaBox / collection CSV as owned (unlinked) inventory.
async function importCSV(file) {
  const status = $('#addStatus');
  let parsed;
  try { parsed = parseCardCSV(await file.text()); }
  catch (e) { status.textContent = tr('Could not read that file.'); return; }
  if (!parsed.length) { status.textContent = tr('No cards found — is this a ManaBox CSV export?'); return; }

  status.innerHTML = `<span class="spin"></span>${tr('Importing {n} cards from “{file}”…', { n: parsed.length, file: esc(file.name) })}`;
  $('#confirmAdd').disabled = true;
  $('#csvBtn').disabled = true;
  try {
    const { resolved, missing } = await resolveCards(parsed);
    if (addTarget === 'store' && myStore) {
      const added = addResolvedToStore(resolved);
      scheduleStoreSave(); closeAdd(); setView('store'); renderStoreDashboard();
      toast(tr('Imported {n} cards into your inventory', { n: added }) + (missing ? ' · ' + tr('{n} not found', { n: missing }) : '') + '.');
      return;
    }
    resolved.forEach(c => addVariant(c.name, { qty: c.qty, foil: c.foil, condition: c.condition, set: c.set, collector: c.collector, scryfallId: c.scryfallId }));
    logAcquired(resolved, `CSV import (${file.name})`);
    save();
    closeAdd();
    render();
    setView('inventory');
    const copies = resolved.reduce((a, c) => a + c.qty, 0);
    toast(tr('Imported {n} cards from CSV', { n: copies }) + (missing ? ' · ' + tr('{n} not found', { n: missing }) : '') + '.');
  } catch (e) {
    status.textContent = tr('Import failed — check your connection and retry.');
  } finally {
    $('#confirmAdd').disabled = false;
    $('#csvBtn').disabled = false;
  }
}

/* ---------- cheapest printing (same card, different set) ---------- */
const cheapestCache = {};   // nameKey -> { price, set, set_name, uri } | null
async function cheapestPrinting(name) {
  const k = key(name);
  if (k in cheapestCache) return cheapestCache[k];
  const q = encodeURIComponent(`!"${frontFace(name)}"`);
  try {
    const res = await fetch(`https://api.scryfall.com/cards/search?unique=prints&q=${q}`);
    if (!res.ok) { cheapestCache[k] = null; return null; }
    const data = await res.json();
    const priced = (data.data || [])
      .map(c => ({ c, usd: parseFloat(c.prices && c.prices.usd) }))
      .filter(x => x.usd > 0)
      .sort((a, b) => a.usd - b.usd);
    if (!priced.length) { cheapestCache[k] = null; return null; }
    const c = priced[0].c;
    const out = { price: priced[0].usd, set: (c.set || '').toUpperCase(), set_name: c.set_name || '', uri: c.scryfall_uri || '' };
    cheapestCache[k] = out;
    return out;
  } catch (e) { cheapestCache[k] = null; return null; }
}

/* ---------- every printing of a card (for the art / printing picker) ---------- */
const printingsCache = {};   // nameKey -> [{ id, set, set_name, collector, image, art, small, rarity, price }]
async function loadPrintings(name) {
  const k = key(name);
  if (k in printingsCache) return printingsCache[k];
  const q = encodeURIComponent(`!"${frontFace(name)}"`);
  try {
    const res = await fetch(`https://api.scryfall.com/cards/search?unique=prints&order=released&q=${q}`);
    if (!res.ok) { printingsCache[k] = []; return []; }
    const data = await res.json();
    const out = (data.data || []).map(c => {
      const face = c.card_faces && c.card_faces[0] ? c.card_faces[0] : c;
      const img = c.image_uris || face.image_uris || {};
      return {
        id: c.id,
        set: (c.set || '').toUpperCase(),
        set_name: c.set_name || '',
        collector: c.collector_number || '',
        image: img.normal || img.large || img.small || '',
        art: img.art_crop || '',
        small: img.small || img.normal || '',
        rarity: c.rarity || '',
        price: parseFloat((c.prices || {}).usd) || 0,
        price_foil: parseFloat((c.prices || {}).usd_foil) || 0
      };
    }).filter(p => p.image);
    printingsCache[k] = out;
    return out;
  } catch (e) { printingsCache[k] = []; return []; }
}

/* ---------- curated budget swaps (functionally similar, cheaper) ---------- */
const SWAPS = {
  'mana crypt': ['Sol Ring', 'Arcane Signet', 'Mind Stone', 'Fellwar Stone'],
  'mana vault': ['Sol Ring', 'Worn Powerstone', 'Mind Stone'],
  'cyclonic rift': ['Evacuation', "River's Rebuke", 'Devastation Tide', 'Coastal Breach'],
  'rhystic study': ['Mystic Remora', 'Verge Rangers'],
  'smothering tithe': ['Tempting Contract', 'Storm the Vault'],
  'the great henge': ["Garruk's Uprising", 'Elemental Bond', 'Colossal Majesty'],
  'dockside extortionist': ['Treasure Map', 'Brass Knuckles'],
  'mana drain': ['Counterspell', 'Dissipate', 'Cancel'],
  'force of will': ['Counterspell', 'Negate', 'Swan Song'],
  'craterhoof behemoth': ['End-Raze Forerunners', 'Pathbreaker Ibex', 'Overwhelming Stampede', 'Overrun'],
  'esper sentinel': ['Mystic Remora', 'Rhystic Study', 'Tithe'],
  'sword of feast and famine': ['Loxodon Warhammer', 'Bonesplitter', 'Maul of the Skyclaves'],
  'scalding tarn': ['Evolving Wilds', 'Terramorphic Expanse', 'Fabled Passage'],
  'misty rainforest': ['Evolving Wilds', 'Terramorphic Expanse', 'Fabled Passage'],
  'verdant catacombs': ['Evolving Wilds', 'Terramorphic Expanse', 'Fabled Passage'],
  'steam vents': ['Izzet Guildgate', 'Highland Lake', 'Swiftwater Cliffs'],
  'sacred foundry': ['Boros Guildgate', 'Wind-Scarred Crag', 'Stone Quarry'],
  'gaea\'s cradle': ['Growing Rites of Itlimoc', 'Itlimoc, Cradle of the Sun', 'Nykthos, Shrine to Nyx'],
  'doubling season': ['Parallel Lives', 'Primal Vigor', 'Anointed Procession'],
  'teferi\'s protection': ['Heroic Intervention', "Boros Charm", 'Flawless Maneuver'],
  'demonic tutor': ['Diabolic Tutor', 'Grim Tutor', 'Dark Petition'],
  'vampiric tutor': ['Diabolic Intent', 'Grim Tutor', 'Mastermind\'s Acquisition']
};

/* ---------- card art viewer ---------- */
const RARITY_LABEL = { common: 'Common', uncommon: 'Uncommon', rare: 'Rare', mythic: 'Mythic', special: 'Special', bonus: 'Bonus' };
let cardViewName = null;
function openCardView(name) {
  cardViewName = name;
  const meta = card(name);
  const img = $('#cardViewImg');
  const fb = $('#cardViewFallback');
  const heroSrc = displayImage(name);
  if (heroSrc) {
    img.onerror = () => { img.hidden = true; fb.hidden = false; };
    img.onload = () => { img.hidden = false; fb.hidden = true; };
    img.src = heroSrc; img.alt = meta.name; img.hidden = false; fb.hidden = true;
  } else {
    img.removeAttribute('src'); img.hidden = true; fb.hidden = false;
  }
  // Commander assignment — only when viewing a legendary creature that's in the currently-open deck.
  const deckCtx = currentDeckId ? state.decks.find(d => d.id === currentDeckId) : null;
  const showCmd = deckCtx && deckCtx.cards.some(c => key(c.name) === key(name)) && canBeCommander(name);
  const isCmd = showCmd && key(deckCtx.commander || '') === key(name);
  const commanderHtml = showCmd
    ? `<label class="cv-commander${isCmd ? ' on' : ''}"><input type="checkbox" id="cvCommander" ${isCmd ? 'checked' : ''}/> <i class="ms ms-commander" aria-hidden="true"></i> ${tr('Commander of “{name}”', { name: esc(deckCtx.name) })}</label>`
    : '';
  $('#cardViewMeta').innerHTML = `
    <h3>${esc(meta.name)}</h3>
    ${meta.type_line ? `<div class="cv-type">${typeIcon(meta.name)}${esc(meta.type_line)}</div>` : ''}
    ${meta.mana_cost ? `<div class="cv-cost">${manaSymbols(meta.mana_cost)}</div>` : ''}
    ${commanderHtml}
    <div class="cv-tags">
      <span class="cv-set" id="cvSet">${setTagHtml(name)}</span>
      ${meta.rarity ? `<span class="cv-rarity ${esc(meta.rarity)}"><i class="ms ms-rarity" aria-hidden="true"></i> ${esc(tr(RARITY_LABEL[meta.rarity] || meta.rarity))}</span>` : ''}
    </div>
    <div class="cv-quick">
      <button class="cvq pos" data-cvbought title="${tr('I bought one — add a copy to your collection')}"><i class="ms ms-counter-shield" aria-hidden="true"></i> ${tr('Bought')}</button>
      <button class="cvq neg" data-cvsold ${ownedOf(name) ? '' : 'disabled'} title="${tr('I sold one — remove a copy from your collection')}"><i class="ms ms-counter-gold" aria-hidden="true"></i> ${tr('Sold')}</button>
      <button class="cvq ${wishOf(name) ? 'on' : ''}" data-cvwish title="${tr('Add to / remove from your buy list')}">${wishOf(name) ? tr('✓ Buy list') : tr('＋ Buy list')}</button>
      <button class="cvq ${variantsOf(name).some(v => variantListedAnywhere(v.id)) ? 'on' : ''}" data-cvsell ${ownedOf(name) ? '' : 'disabled'} title="${tr('List your copies for sale')}">${variantsOf(name).some(v => variantListedAnywhere(v.id)) ? tr('✓ Sell list') : tr('＋ Sell list')}</button>
    </div>
    <div class="cv-prices" id="cvPrices">${pricesHtml(name)}</div>
    <div class="cv-arts" id="cvArts">
      <button class="cv-art-btn" id="cvArtBtn"><i class="ms ms-artist-brush" aria-hidden="true"></i> ${tr('Choose art / printing')}</button>
      <div class="cv-art-strip" id="cvArtStrip" hidden></div>
    </div>
    <div class="cv-cheapest" id="cvCheapest"></div>
    ${meta.notFound ? `<div class="cv-missing">${tr('No printing matched on Scryfall — re-import to fetch its art.')}</div>` : ''}
    ${meta.uri ? `<a class="cv-link" href="${esc(meta.uri)}" target="_blank" rel="noopener">${tr('View on Scryfall ↗')}</a>` : ''}
    <div class="cv-buys">${buyLinks(meta)}</div>
    <div class="cv-edit">
      <button class="cv-edit-btn" id="cvEditBtn"><i class="ms ms-token" aria-hidden="true"></i> ${tr('Edit copies')}${ownedOf(name) ? ` <span class="cv-edit-n">${ownedOf(name)}</span>` : ''}</button>
      <div class="cv-variants" id="cvVariants" hidden></div>
    </div>
    <div class="cv-deckassign" id="cvDeckAssign">${deckAssignHtml(name)}</div>
    <div class="cv-swaps" id="cvSwaps"></div>`;
  $('#cardModal').hidden = false;
  if (!meta.notFound) loadCheapest(name, meta);
  renderSwaps(name);
}
// quick transaction + list actions from the card view
function cvBought(name) {
  pushUndo(tr('buy of {n}× {name}', { n: 1, name }));
  addVariant(name, { qty: 1 });
  logEvent('bought', name, 1, priceOf(name));
  save(); render(); openCardView(name);
  toast(tr('Bought {n}× {name} — added to your collection.', { n: 1, name }), { undo: true });
}
function cvSold(name) {
  if (ownedOf(name) <= 0) return;
  pushUndo(tr('sale of {n}× {name}', { n: 1, name }));
  const unit = priceOf(name);
  setOwned(name, ownedOf(name) - 1);
  logEvent('sold', name, 1, unit);
  save(); render(); openCardView(name);
  toast(tr('Sold {n}× {name} — removed from your collection.', { n: 1, name }), { undo: true });
}
function cvWishToggle(name) {
  const on = wishOf(name) > 0;
  addToWishlist(name, on ? -wishOf(name) : 1);
  render(); openCardView(name);
  toast(on ? tr('Removed {name} from your buy list.', { name }) : tr('Added {name} to your buy list.', { name }));
}
function closeCardView() { $('#cardModal').hidden = true; cardViewName = null; $('#cardViewImg').removeAttribute('src'); }

// Reveal the strip of every printing so the user can pick which art represents this card.
async function revealPrintings(name) {
  const strip = $('#cvArtStrip'), btn = $('#cvArtBtn');
  if (!strip) return;
  if (!strip.hidden) { strip.hidden = true; btn.classList.remove('on'); return; }
  strip.hidden = false; btn.classList.add('on');
  strip.innerHTML = `<span class="spin"></span><span class="cv-cheap-label">${tr('Loading printings…')}</span>`;
  const prints = await loadPrintings(name);
  if (cardViewName !== name || !$('#cvArtStrip')) return;
  if (!prints.length) { $('#cvArtStrip').innerHTML = `<span class="cv-art-empty">${tr('No alternate printings found.')}</span>`; return; }
  // With CK pricing on, load the CK index so each printing shows its exact CK price (and the
  // main price re-syncs to CK for the chosen printing).
  if (ckActive() && !ckById) {
    $('#cvArtStrip').innerHTML = `<span class="spin"></span><span class="cv-cheap-label">${tr('Loading Card Kingdom prices…')}</span>`;
    await ensureCKIndex();
    if (cardViewName !== name || !$('#cvArtStrip')) return;
    const pe = $('#cvPrices'); if (pe) pe.innerHTML = pricesHtml(name);
  }
  $('#cvArtStrip').innerHTML = `<input type="text" id="cvArtSearch" class="cv-art-search" placeholder="${tr('Filter printings — set, name or № (e.g. “MH2 376”)')}" autocomplete="off" spellcheck="false" />
    <div class="cv-art-results" id="cvArtResults"></div>`;
  renderPrintings(name, '');
  const inp = $('#cvArtSearch'); if (inp) inp.focus();
}
// Match a printing against a query: every whitespace-separated term must appear in "set set_name collector".
function printingMatches(p, q) {
  if (!q) return true;
  const hay = `${p.set} ${p.set_name} ${p.collector || ''}`.toLowerCase();
  return q.toLowerCase().split(/\s+/).filter(Boolean).every(t => hay.includes(t));
}
function renderPrintings(name, q) {
  const box = $('#cvArtResults'); if (!box) return;
  const prints = printingsCache[key(name)] || [];
  const cur = chosenArt(name), curId = cur && cur.scryfallId, curSet = card(name).set || '';
  const vs = variantsOf(name);
  const ownsPrinting = (p) => vs.some(v =>
    (v.scryfallId && v.scryfallId === p.id) ||
    (v.set && v.set === p.set && (!v.collector || !p.collector || v.collector === p.collector)));
  const html = prints
    .map((p, i) => ({ p, i }))
    .filter(({ p }) => printingMatches(p, q))
    .map(({ p, i }) => {
      const on = curId ? p.id === curId : p.set === curSet;
      const owned = ownsPrinting(p);
      const pr = (ckActive() && ckById) ? ((ckById.get(p.id) || [0])[0] || 0) : p.price;   // CK retail per printing when CK active
      return `<button type="button" class="cv-art ${on ? 'on' : ''}${owned ? ' owned' : ''}" data-printidx="${i}" title="${esc(p.set_name || p.set)}${p.collector ? ' · #' + esc(p.collector) : ''}${owned ? ' · ' + tr('owned') : ''}${pr ? ' · ' + money(pr) : ''}">
        <img src="${esc(p.small)}" alt="${esc(p.set_name)}" loading="lazy"/>
        <span class="cv-art-set">${esc(p.set)}${p.collector ? ' ' + esc(p.collector) : ''}</span>
        <span class="cv-art-price">${pr ? money(pr) : '—'}</span>
      </button>`;
    }).join('');
  box.innerHTML = html || `<span class="cv-art-empty">${tr('No printing matches “{q}”.', { q: esc(q) })}</span>`;
}

// Lock a chosen printing's art as this card's display art.
function pickPrinting(name, idx) {
  const prints = printingsCache[key(name)] || [];
  const p = prints[idx];
  if (!p) return;
  state.art[key(name)] = { image: p.image, art: p.art, set: p.set, set_name: p.set_name, collector: p.collector, scryfallId: p.id, price: p.price, price_foil: p.price_foil };
  save();
  const img = $('#cardViewImg'), fb = $('#cardViewFallback');
  if (img) { img.onload = () => { img.hidden = false; if (fb) fb.hidden = true; }; img.src = p.image; img.hidden = false; if (fb) fb.hidden = true; }
  $$('#cvArtStrip .cv-art').forEach(b => b.classList.toggle('on', +b.dataset.printidx === idx));
  const pricesEl = $('#cvPrices'); if (pricesEl) pricesEl.innerHTML = pricesHtml(name);
  const setEl = $('#cvSet'); if (setEl) setEl.innerHTML = setTagHtml(name);
  renderInventory();   // the inventory tile behind the modal now shows the new art + price
  toast(tr('Art set to {set}', { set: p.set_name || p.set }) + (p.price ? ' · ' + money(p.price) : '') + '.');
}

// Reveal a per-copy printing strip inside the "Edit copies" editor so a single
// owned copy can be tagged with the exact set/collector it is.
async function revealCopyPrintings(name, vid, btn) {
  const strip = document.querySelector(`.cvv-strip[data-vstripwrap="${vid}"]`);
  if (!strip) return;
  if (!strip.hidden) { strip.hidden = true; btn.classList.remove('on'); return; }
  // close any other open copy strips first
  $$('.cvv-strip').forEach(s => { if (s !== strip) { s.hidden = true; s.innerHTML = ''; } });
  $$('.ve-print').forEach(b => { if (b !== btn) b.classList.remove('on'); });
  strip.hidden = false; btn.classList.add('on');
  strip.innerHTML = `<span class="spin"></span><span class="cv-cheap-label">${tr('Loading printings…')}</span>`;
  const prints = await loadPrintings(name);
  if (cardViewName !== name || !document.querySelector(`.cvv-strip[data-vstripwrap="${vid}"]`)) return;
  const box = document.querySelector(`.cvv-strip[data-vstripwrap="${vid}"]`);
  if (!prints.length) { box.innerHTML = `<span class="cv-art-empty">${tr('No alternate printings found.')}</span>`; return; }
  const v = variantById(name, vid);
  box.innerHTML = prints.map((p, i) => {
    const on = v && (v.scryfallId ? p.id === v.scryfallId : (v.set && p.set === v.set && (!v.collector || p.collector === v.collector)));
    return `<button type="button" class="cv-art cvv-art ${on ? 'on' : ''}" data-vpick="${i}" data-vid="${vid}" data-name="${esc(name)}" title="${esc(p.set_name || p.set)}${p.collector ? ' · #' + esc(p.collector) : ''}${p.price ? ' · ' + money(p.price) : ''}">
      <img src="${esc(p.small)}" alt="${esc(p.set_name)}" loading="lazy"/>
      <span class="cv-art-set">${esc(p.set)}${p.collector ? ' · ' + esc(p.collector) : ''}</span>
      <span class="cv-art-price">${p.price ? money(p.price) : '—'}</span>
    </button>`;
  }).join('');
}

// Tag a specific owned copy with a chosen printing's set / collector / id.
function pickCopyPrinting(name, vid, idx) {
  const prints = printingsCache[key(name)] || [];
  const p = prints[idx];
  const v = variantById(name, vid);
  if (!p || !v) return;
  v.set = p.set; v.collector = p.collector; v.scryfallId = p.id;
  save(); render(); refreshCardEditor();
  toast(tr('Copy tagged {set}', { set: p.set_name || p.set }) + (p.collector ? ' #' + p.collector : '') + '.');
}

// Primary "cheaper option": the cheapest printing of the same card across all sets.
async function loadCheapest(name, meta) {
  const el = $('#cvCheapest');
  if (!el) return;
  el.innerHTML = `<span class="spin"></span><span class="cv-cheap-label"><i class="ms ms-counter-gold" aria-hidden="true"></i> ${tr('Finding cheapest printing…')}</span>`;
  const cp = await cheapestPrinting(name);
  if (cardViewName !== name || !$('#cvCheapest')) return;
  const box = $('#cvCheapest');
  if (!cp) { box.innerHTML = ''; return; }
  const listed = priceOf(name);
  const save = listed - cp.price;
  if (listed && save > 0.01) {
    box.innerHTML = `<div class="cv-cheap hit">
      <span class="cv-cheap-label"><i class="ms ms-counter-gold" aria-hidden="true"></i> ${tr('Cheapest printing')}</span>
      <b>${money(cp.price)}</b>
      <span class="cv-cheap-set">${esc(cp.set)}${cp.set_name ? ' · ' + esc(cp.set_name) : ''}</span>
      <span class="cv-cheap-save">${tr('save {amount}', { amount: money(save) })}</span>
    </div>`;
  } else {
    box.innerHTML = `<div class="cv-cheap ok"><i class="ms ms-counter-shield" aria-hidden="true"></i> ${tr('Cheapest printing is {price} ({set})', { price: money(cp.price), set: esc(cp.set) })}</div>`;
  }
}

// Secondary, opt-in: functionally similar cheaper cards from the curated list.
function renderSwaps(name) {
  const wrap = $('#cvSwaps');
  if (!wrap) return;
  const list = SWAPS[key(name)];
  if (!list || !list.length) { wrap.innerHTML = ''; return; }
  wrap.innerHTML = `<button class="cv-swap-btn" id="cvSwapBtn"><i class="ms ms-loyalty-down" aria-hidden="true"></i> ${tr(list.length === 1 ? 'Show {n} budget alternative' : 'Show {n} budget alternatives', { n: list.length })}</button><div class="cv-swap-list" id="cvSwapList" hidden></div>`;
}

async function revealSwaps(name, btn) {
  const list = SWAPS[key(name)] || [];
  btn.disabled = true;
  btn.innerHTML = `<span class="spin"></span>${tr('Pricing alternatives…')}`;
  const need = list.filter(n => { const m = state.cards[key(n)]; return !m || m.notFound; });
  if (need.length) {
    try {
      const idx = await fetchCardData(need.map(n => ({ name: n })));
      need.forEach(n => { const f = idx[key(n)]; if (f) state.cards[key(f.name)] = distill(f); });
      save();
    } catch (e) { /* show names without prices */ }
  }
  if (cardViewName !== name || !$('#cvSwapList')) return;
  const box = $('#cvSwapList');
  box.hidden = false;
  box.innerHTML = list.map(n => {
    const m = card(n), p = priceOf(n);
    return `<button class="cv-swap-chip" data-swap="${esc(m.name)}">
      <span class="cv-swap-name">${esc(m.name)}</span>
      <span class="cv-swap-price">${p ? money(p) : '—'}</span>
    </button>`;
  }).join('');
  btn.hidden = true;
}

/* ---------- Add-Cards autocomplete tag composer ---------- */
let addTags = [];           // [{ name, qty, foil }]
let acItems = [];           // current suggestion names
let acActive = -1;          // keyboard-highlighted index
let acSeq = 0;              // guards against out-of-order autocomplete responses

async function fetchAutocomplete(q) {
  const seq = ++acSeq;
  try {
    const res = await fetch('https://api.scryfall.com/cards/autocomplete?q=' + encodeURIComponent(q));
    if (!res.ok) return;
    const data = await res.json();
    if (seq !== acSeq) return;            // a newer keystroke already fired
    showACMenu(data.data || []);
  } catch (e) { /* offline — silently no-op */ }
}
const acDebounced = (() => { let t; return (q) => { clearTimeout(t); t = setTimeout(() => fetchAutocomplete(q), 170); }; })();

/* =====================================================================
   BROWSE — Scryfall card search (Commander-first)
   ===================================================================== */
function setBrowseStatus(msg) { const s = $('#browseStatus'); if (s) s.textContent = msg; }

// Build the Scryfall q-string from the raw user text + current scope/identity filters.
function buildBrowseQuery(raw) {
  raw = (raw || '').trim();
  const looksAdvanced = /[:<>=]|\bor\b|[()"]/i.test(raw);   // power users keep full Scryfall syntax
  const parts = [];
  if (raw) parts.push(looksAdvanced ? raw : `(name:${JSON.stringify(raw)} or o:${JSON.stringify(raw)})`);
  if (browseCmdrOnly) parts.push('legal:commander');
  if (browseIds.length) {
    const ci = browseIds.filter(c => c !== 'C').join('').toLowerCase();
    parts.push(ci ? `id<=${ci}` : 'id=c');   // colour-identity bound; 'C' alone = colourless
  }
  parts.push('game:paper');
  return parts.join(' ');
}

async function browseSearch(raw, { fresh = true } = {}) {
  if (!fresh && browseLoading) return;              // block double "Load more"
  const built = buildBrowseQuery(raw);
  const meaningful = built.replace(/game:paper/g, '').replace(/legal:commander/g, '').trim();
  if (!meaningful) { browseResults = []; browseNextPage = null; browseTotal = 0; renderBrowse(); setBrowseStatus(''); return; }
  const seq = ++browseSeq;                          // bump first so any in-flight search becomes stale
  let url;
  if (!fresh && browseNextPage) url = browseNextPage;
  else {
    url = `https://api.scryfall.com/cards/search?unique=cards&order=${encodeURIComponent(browseOrder)}&dir=auto&q=${encodeURIComponent(built)}`;
    if (fresh) { browseResults = []; browseNextPage = null; browseTotal = 0; }
  }
  browseLoading = true;
  setBrowseStatus(fresh ? tr('Searching the multiverse…') : tr('Loading more…'));
  try {
    const res = await fetch(url);
    if (seq !== browseSeq) return;
    if (res.status === 404) {                        // 404 = zero matches, NOT an error
      if (fresh) browseResults = [];
      browseNextPage = null; browseTotal = browseResults.length;
      renderBrowse(); setBrowseStatus(browseResults.length ? '' : tr('No cards match.'));
      return;
    }
    if (!res.ok) throw new Error('Scryfall ' + res.status);
    const data = await res.json();
    if (seq !== browseSeq) return;
    (data.data || []).forEach(c => { state.cards[key(c.name)] = distill(c); });   // commit so artTile reads real data
    browseResults = fresh ? (data.data || []) : browseResults.concat(data.data || []);
    browseNextPage = data.has_more ? data.next_page : null;
    browseTotal = data.total_cards || browseResults.length;
    renderBrowse();
    setBrowseStatus(tr(browseTotal === 1 ? '{n} card found' : '{n} cards found', { n: browseTotal.toLocaleString() }));
    await sleep(75);                                 // be polite to Scryfall
  } catch (e) {
    if (seq === browseSeq) setBrowseStatus(tr('Scryfall is unreachable — try again.'));
  } finally {
    if (seq === browseSeq) browseLoading = false;
  }
}

/* ---------- Browse search autocomplete — Scryfall card-name suggestions ----------
   Only fires for plain-name queries (skipped when the text uses Scryfall syntax like t:, o:, mv<=, "…", or).
   Picking a suggestion fills the box and runs the full search; the live debounced search still runs underneath. */
const browseLooksAdvanced = (raw) => /[:<>=]|\bor\b|[()"]/i.test(raw || '');
async function fetchBrowseAc(q) {
  const seq = ++browseAcSeq;
  try {
    const res = await fetch('https://api.scryfall.com/cards/autocomplete?q=' + encodeURIComponent(q));
    if (!res.ok) return;
    const data = await res.json();
    if (seq !== browseAcSeq) return;            // a newer keystroke already fired
    showBrowseAc(data.data || []);
  } catch (e) { /* offline — silently no-op */ }
}
const browseAcDebounced = (() => { let t; return (q) => { clearTimeout(t); t = setTimeout(() => fetchBrowseAc(q), 170); }; })();
function showBrowseAc(names) {
  const menu = $('#browseAcMenu'), input = $('#browseSearch');
  if (!menu) return;
  if (input && document.activeElement !== input) return;   // focus left the box before the fetch returned — don't pop a stale menu
  browseAcItems = names.slice(0, 10); browseAcActive = -1;
  if (!browseAcItems.length) { hideBrowseAc(); return; }
  menu.innerHTML = browseAcItems.map((n, i) => `<button type="button" class="ac-item" role="option" data-bacidx="${i}"><span class="ac-art" style="background-image:url('${addArtUrl(n)}')" aria-hidden="true"></span><span class="ac-name">${esc(n)}</span></button>`).join('');
  menu.hidden = false; if (input) input.setAttribute('aria-expanded', 'true');
}
function hideBrowseAc() {
  const menu = $('#browseAcMenu'), input = $('#browseSearch');
  if (menu) { menu.hidden = true; menu.innerHTML = ''; }
  if (input) input.setAttribute('aria-expanded', 'false');
  browseAcItems = []; browseAcActive = -1;
}
function setBrowseAcActive(i) {
  const btns = $$('#browseAcMenu .ac-item');
  if (!btns.length) return;
  browseAcActive = (i + btns.length) % btns.length;
  btns.forEach((b, bi) => b.classList.toggle('active', bi === browseAcActive));
  btns[browseAcActive].scrollIntoView({ block: 'nearest' });
}
function pickBrowseAc(name) {
  if (!name) return;
  const input = $('#browseSearch'); if (input) input.value = name;
  browseQuery = name; hideBrowseAc();
  browseSearch(name, { fresh: true });
}
// A browse result tile — reuses the inventory artTile() (cards are committed to state.cards on fetch).
function browseResultTile(c, i) {
  const name = c.name;
  const owned = ownedOf(name), wished = wishOf(name);
  const val = `<span class="art-val">${priceOf(name) ? money(priceOf(name)) : '—'}</span>`;
  const status = owned ? `<span class="browse-badge owned"><i class="ms ms-counter-shield" aria-hidden="true"></i> ${tr('{n} owned', { n: owned })}</span>`
    : wished ? `<span class="browse-badge wished"><i class="ms ms-counter-gold" aria-hidden="true"></i> ${tr('on buy list')}</span>` : '';
  return `<div class="art-tile browse">
    ${status}
    <button class="art-open" data-name="${esc(name)}">${artTile(name, '', val)}</button>
    <div class="browse-actions">
      <button class="browse-act${wished ? ' on' : ''}" data-bwish="${i}" title="${wished ? tr('Remove from buy list') : tr('Add to buy list')}"><i class="ms ms-counter-gold" aria-hidden="true"></i></button>
      <button class="browse-act${owned ? ' on' : ''}" data-bown="${i}" title="${tr('Add a copy to your collection')}"><i class="ms ms-counter-plus" aria-hidden="true"></i></button>
    </div>
  </div>`;
}

// Dispatcher: show the active Browse pane and render it.
function renderBrowse() {
  const panes = { cards: $('#browsePaneCards'), sets: $('#browsePaneSets'), decks: $('#browsePaneDecks'), stores: $('#browsePaneStores') };
  if (!panes.cards) return;
  for (const [m, el] of Object.entries(panes)) { if (el) el.hidden = browseMode !== m; }
  if (browseMode === 'cards') renderBrowseCards();
  else if (browseMode === 'sets') renderBrowseSets();
  else if (browseMode === 'decks') renderBrowseDecks();
  else if (browseMode === 'stores') renderBrowseStores();
}
function setBrowseMode(mode) {
  browseMode = mode;
  $$('#browseModes .seg-btn').forEach(b => b.classList.toggle('is-active', b.dataset.bmode === mode));
  if (mode === 'sets' && !setsCache) loadSets();
  renderBrowse();
}

/* ---------- Browse: stores (Popular + My Stores, with follow/rank) ---------- */
// Entry point: reflects the sub-toggle, then fetches the active tab's list and paints it.
async function renderBrowseStores() {
  const g = $('#browseStores'); if (!g) return;
  $$('#browseStoresTabs .seg-btn').forEach(b => b.classList.toggle('is-active', b.dataset.stab === browseStoresTab));

  if (browseStoresTab === 'mine' && !authUser) {
    browseStoresCache = null;
    g.innerHTML = `<div class="empty-state" style="padding:48px 20px"><span class="empty-mark"><i class="ms ms-counter-lore" aria-hidden="true"></i></span><h2>${tr('Sign in to see your stores')}</h2><p>${tr('Add the game stores you visit to keep their events, hours and stock close.')}</p><div style="margin-top:14px"><button class="btn gold" data-storesignin="1">${tr('Sign in')}</button></div></div>`;
    return;
  }

  g.innerHTML = `<p class="bd-note">${tr('Loading stores…')}</p>`;
  const tab = browseStoresTab;
  let list = [];
  if (sb) {
    try {
      const { data, error } = tab === 'mine'
        ? await sb.rpc('my_stores')
        : await sb.rpc('top_stores', { p_limit: 24 });
      if (!error && Array.isArray(data)) list = data;
    } catch (e) { list = []; }
  }
  if (browseStoresTab !== tab) return;   // tab switched mid-fetch — let the newer render win
  browseStoresCache = list;
  paintBrowseStores();
}
// Paint from cache only (no fetch) — used after follow toggles for an in-place update.
function paintBrowseStores() {
  const g = $('#browseStores'); if (!g) return;
  const list = browseStoresCache || [];
  if (!list.length) {
    if (browseStoresTab === 'mine') {
      g.innerHTML = `<div class="empty-state" style="padding:48px 20px"><span class="empty-mark"><i class="ms ms-counter-lore" aria-hidden="true"></i></span><h2>${tr('No stores yet.')}</h2><p>${tr('Find a shop under {popular} and add it to keep it here.', { popular: '<b>' + tr('Popular') + '</b>' })}</p></div>`;
    } else {
      g.innerHTML = `<div class="empty-state" style="padding:48px 20px"><span class="empty-mark"><i class="ms ms-counter-lore" aria-hidden="true"></i></span><h2>${tr('No stores yet.')}</h2></div>`;
    }
    return;
  }
  g.innerHTML = `<div class="precon-grid">${list.map(storeCardHtml).join('')}</div>`;
}
function storeCardHtml(st) {
  const slug = st.slug || '';
  const place = [st.city, st.country].filter(Boolean).map(esc).join(' · ');
  const rank = (st.rank === null || st.rank === undefined) ? null : Number(st.rank);
  const n = Number(st.followers) || 0;
  const badge = (rank !== null && !Number.isNaN(rank))
    ? tr('#{rank} · {n} collectors', { rank, n })
    : tr('{n} collectors', { n });
  const followed = !!st.followed;
  const logo = st.logo
    ? `<img class="store-tile-logo" src="${esc(st.logo)}" alt="" loading="lazy" />`
    : `<span class="store-tile-logo store-tile-logo--ph"><i class="ms ms-counter-lore" aria-hidden="true"></i></span>`;
  return `<article class="precon-card store-tile" data-storeopen="${esc(slug)}" tabindex="0" role="link" title="${esc(st.name || '')}">
    <div class="store-tile-head">
      ${logo}
      <div class="store-tile-id">
        <h3>${esc(st.name || tr('Store'))}${st.verified ? ` <span class="verified-chip sm"><i class="ms ms-counter-shield" aria-hidden="true"></i> ${tr('Verified')}</span>` : ''}</h3>
        ${place ? `<div class="store-tile-place">${place}</div>` : ''}
      </div>
    </div>
    <div class="precon-meta">${badge}</div>
    <div class="precon-actions">
      <button class="btn ${followed ? 'ghost' : 'gold'}" data-storefollow="${esc(slug)}">${followed ? tr('✓ In My Stores') : tr('＋ Add to My Stores')}</button>
    </div>
  </article>`;
}
async function toggleStoreFollow(slug) {
  if (!slug) return;
  if (!authUser) { openAuth('signin'); return; }
  if (!sb) return;
  try {
    const { data, error } = await sb.rpc('toggle_store_follow', { p_slug: slug });
    if (error || !data) return;
    if (Array.isArray(browseStoresCache)) {
      const st = browseStoresCache.find(s => s.slug === slug);
      if (st) {
        st.followed = !!data.followed;
        if (data.count !== undefined && data.count !== null) st.followers = data.count;
        st.rank = (data.rank === undefined) ? st.rank : data.rank;
      }
      // On the "mine" tab, unfollowing should drop the store from the list.
      if (browseStoresTab === 'mine' && st && !st.followed) {
        browseStoresCache = browseStoresCache.filter(s => s.slug !== slug);
      }
    }
    paintBrowseStores();
  } catch (e) { /* graceful: leave UI as-is */ }
}

function renderBrowseCards() {
  const t = $('#browseTable');
  if (!t) return;
  t.style.setProperty('--tile', browseTile + 'px');
  const r = $('#browseSizeRange'); if (r) r.value = browseTile;
  if (!browseResults.length) {
    t.innerHTML = browseLoading ? '' : (browseQuery || browseIds.length
      ? `<div class="empty-state"><span class="empty-mark"><i class="ms ms-ability-investigate" aria-hidden="true"></i></span><h2>${tr('No cards match')}</h2><p>${tr('Try a different search or loosen the filters.')}</p></div>`
      : `<div class="empty-state"><span class="empty-mark"><i class="ms ms-ability-investigate" aria-hidden="true"></i></span><h2>${tr('Browse the multiverse')}</h2><p>${tr('Search any card by name, or use Scryfall syntax like {a}, {b}, {c}.', { a: '<code>t:creature</code>', b: '<code>o:"flying"</code>', c: '<code>mv&lt;=3</code>' })}</p></div>`);
  } else {
    t.innerHTML = browseResults.map((c, i) => browseResultTile(c, i)).join('');
  }
  const more = $('#browseMore'); if (more) more.hidden = !browseNextPage;
}

/* ---------- Browse: expansions / sets ---------- */
async function loadSets() {
  if (setsCache || setsLoading) return;
  setsLoading = true;
  renderBrowse();
  try {
    const res = await fetch('https://api.scryfall.com/sets');
    if (!res.ok) throw new Error('sets ' + res.status);
    const data = await res.json();
    const today = new Date().toISOString().slice(0, 10);
    const TYPES = new Set(['core', 'expansion', 'commander', 'masters', 'draft_innovation', 'masterpiece']);
    setsCache = (data.data || [])
      .filter(s => !s.digital && s.card_count > 0 && TYPES.has(s.set_type) && (!s.released_at || s.released_at <= today))
      .sort((a, b) => (b.released_at || '').localeCompare(a.released_at || ''));
  } catch (e) { setsCache = []; }
  finally { setsLoading = false; renderBrowse(); }
}
function renderBrowseSets() {
  const g = $('#browseSets');
  if (!g) return;
  if (!setsCache) { g.innerHTML = `<div class="view-sub" style="padding:24px 0"><span class="spin"></span> ${tr('Loading expansions…')}</div>`; return; }
  if (!setsCache.length) { g.innerHTML = `<div class="view-sub" style="padding:24px 0">${tr('Couldn\'t load expansions — try again.')}</div>`; return; }
  g.innerHTML = setsCache.map(s => {
    const year = (s.released_at || '').slice(0, 4);
    return `<button class="set-chip" data-setcode="${esc(s.code)}" title="${esc(s.name)}">
      ${s.icon_svg_uri ? `<img class="set-icon" src="${esc(s.icon_svg_uri)}" alt="" loading="lazy"/>` : '<span class="set-icon"></span>'}
      <span class="set-text"><span class="set-name">${esc(s.name)}</span><span class="set-meta">${esc(s.code.toUpperCase())} · ${tr('{n} cards', { n: s.card_count })}${year ? ' · ' + year : ''}</span></span>
    </button>`;
  }).join('');
}
function browseSet(code) {
  browseQuery = 'e:' + code;
  const inp = $('#browseSearch'); if (inp) inp.value = browseQuery;
  setBrowseMode('cards');
  browseSearch(browseQuery, { fresh: true });
}

/* ---------- Browse: recommended Commander decks (curated starters) ---------- */
const BROWSE_BASICS = new Set(['plains', 'island', 'swamp', 'mountain', 'forest', 'wastes']);
// CURATED_DECKS is defined in decks.js (loaded before app.js). Each deck carries its FULL decklist
// as raw text (`list`); parseDecklist (strips set codes / foil markers) parses it once, on demand.
const _curatedParsed = new Map();
function parsedCuratedDeck(d) {
  if (!_curatedParsed.has(d.id)) _curatedParsed.set(d.id, parseDecklist(d.list));
  return _curatedParsed.get(d.id);
}

// Community decks (published by players, surfaced once liked) — cached; null = not loaded yet.
const COMMUNITY_MIN_LIKES = 1;   // a published deck appears in Browse once it has at least this many likes
let communityDecks = null, communityLoading = false;
async function loadCommunityDecks() {
  if (!sb || communityLoading) return;
  communityLoading = true;
  try {
    const { data, error } = await sb.rpc('top_community_decks', { p_min_likes: COMMUNITY_MIN_LIKES, p_limit: 24 });
    communityDecks = (!error && Array.isArray(data)) ? data : [];
  } catch (e) { communityDecks = []; }
  communityLoading = false;
  if (browseMode === 'decks') renderBrowseDecks();
}
function preconCardHtml(d, i) {
  const count = parsedCuratedDeck(d).reduce((a, c) => a + c.qty, 0);
  return `<article class="precon-card">
    <div class="precon-head">
      <div class="pips">${pips(d.colors)}</div>
      <h3>${esc(d.name)}</h3>
      <div class="precon-cmd"><i class="ms ms-commander" aria-hidden="true"></i> ${esc(d.commander)}</div>
    </div>
    <p class="precon-blurb">${esc(tr(d.blurb))}</p>
    <div class="precon-meta">${tr('{n} cards', { n: count })} · ${tr('Commander')}</div>
    <div class="precon-actions">
      <button class="btn ghost" data-recimport="${i}"><i class="ms ms-saga btn-ico" aria-hidden="true"></i>${tr('Import as deck')}</button>
      <button class="btn ghost" data-recwish="${i}"><i class="ms ms-counter-gold btn-ico" aria-hidden="true"></i>${tr('To buy list')}</button>
      <button class="btn ghost" data-recown="${i}"><i class="ms ms-counter-plus btn-ico" aria-hidden="true"></i>${tr('Mark owned')}</button>
    </div>
  </article>`;
}
function communityCardHtml(cd) {
  const data = cd.data || {};
  const count = Number(data.count) || (Array.isArray(data.cards) ? data.cards.reduce((a, c) => a + (Number(c.qty) || 0), 0) : 0);
  const url = deckShareUrl(cd.code);
  const likes = Number(cd.likes) || 0;
  return `<article class="precon-card community">
    <div class="precon-head">
      <div class="pips">${pips(Array.isArray(data.colors) ? data.colors : [])}</div>
      <h3>${esc(cd.name || tr('Untitled Deck'))}</h3>
      ${cd.commander ? `<div class="precon-cmd"><i class="ms ms-commander" aria-hidden="true"></i> ${esc(cd.commander)}</div>` : ''}
    </div>
    <div class="precon-meta">${tr('{n} cards', { n: count })}${cd.username ? ` · ${tr('by @{user}', { user: esc(cd.username) })}` : ''} · <span class="cd-likes"><span class="cd-heart">♥</span> ${likes}</span></div>
    <div class="precon-actions">
      <a class="btn ghost" href="${esc(url)}" target="_blank" rel="noopener"><i class="ms ms-ability-investigate btn-ico" aria-hidden="true"></i>${tr('View deck')}</a>
      <button class="btn ghost" data-cdimport="${esc(cd.code)}"><i class="ms ms-saga btn-ico" aria-hidden="true"></i>${tr('Import as deck')}</button>
    </div>
  </article>`;
}
function renderBrowseDecks() {
  const g = $('#browseDecks'); if (!g) return;
  if (communityDecks === null && sb) loadCommunityDecks();   // lazy first load
  let html = '';
  const communityInner = communityDecks === null
    ? `<p class="bd-note">${tr('Loading community decks…')}</p>`
    : (communityDecks.length
        ? `<div class="precon-grid">${communityDecks.map(communityCardHtml).join('')}</div>`
        : `<p class="bd-note">${tr('No community decks yet — publish one from a deck’s {share} button. Decks appear here once they’re liked.', { share: '<b>' + tr('Share') + '</b>' })}</p>`);
  html += `<div class="bd-sec"><h2 class="bd-sec-h"><i class="ms ms-counter-lore" aria-hidden="true"></i> ${tr('Community decks')}</h2>${communityInner}</div>`;
  html += `<div class="bd-sec"><h2 class="bd-sec-h"><i class="ms ms-commander" aria-hidden="true"></i> ${tr('Starter decks')}</h2><div class="precon-grid">${(typeof CURATED_DECKS !== 'undefined' ? CURATED_DECKS : []).map(preconCardHtml).join('')}</div></div>`;
  g.innerHTML = html;
}
async function communityDeckImport(code) {
  const cd = (communityDecks || []).find(d => d.code === code);
  if (!cd || !cd.data || !Array.isArray(cd.data.cards)) { toast(tr('Could not load that deck.')); return; }
  toast(tr('Importing {name}…', { name: cd.name }));
  try {
    const { resolved, missing } = await resolveCards(cd.data.cards.map(c => ({ name: c.name, qty: c.qty })));
    const cards = resolved.map(c => ({ name: c.name, qty: c.qty }));
    const deck = { id: uid(), name: cd.name || 'Imported Deck', cards, original: cards.map(c => ({ ...c })), commander: cd.commander || '' };
    state.decks.push(deck);
    save(); render(); setView('decks');
    toast(tr('Imported “{name}”', { name: cd.name }) + (missing ? ' · ' + tr(missing === 1 ? '{n} card not found' : '{n} cards not found', { n: missing }) : '') + '.');
  } catch (e) { toast(tr('Scryfall lookup failed — try again.')); }
}
async function recDeckImport(i) {
  const d = CURATED_DECKS[i];
  if (!d) return;
  toast(tr('Importing {name}…', { name: d.name }));
  try {
    const { resolved, missing } = await resolveCards(parsedCuratedDeck(d).map(c => ({ name: c.name, qty: c.qty })));
    const cards = resolved.map(c => ({ name: c.name, qty: c.qty }));
    const deck = { id: uid(), name: d.name, cards, original: cards.map(c => ({ ...c })), commander: d.commander };
    state.decks.push(deck);
    save(); render(); setView('decks');
    toast(tr('Imported “{name}”', { name: d.name }) + (missing ? ' · ' + tr(missing === 1 ? '{n} card not found' : '{n} cards not found', { n: missing }) : '') + '.');
  } catch (e) { toast(tr('Scryfall lookup failed — try again.')); }
}
async function recDeckWish(i) {
  const d = CURATED_DECKS[i];
  if (!d) return;
  toast(tr('Adding {name} to your buy list…', { name: d.name }));
  try {
    const { resolved } = await resolveCards(parsedCuratedDeck(d).map(c => ({ name: c.name, qty: c.qty })));
    resolved.forEach(c => { if (!BROWSE_BASICS.has(key(c.name))) state.wishlist[key(c.name)] = Math.max(wishOf(c.name), 1); });
    save(); render();
    toast(tr('{name} added to your buy list (basics skipped).', { name: d.name }));
  } catch (e) { toast(tr('Scryfall lookup failed — try again.')); }
}
async function recDeckOwn(i) {
  const d = CURATED_DECKS[i];
  if (!d) return;
  toast(tr('Adding {name} to your collection…', { name: d.name }));
  try {
    const { resolved } = await resolveCards(parsedCuratedDeck(d).map(c => ({ name: c.name, qty: c.qty })));
    resolved.forEach(c => addVariant(c.name, { qty: c.qty }));
    logAcquired(resolved, `${d.name} (deck)`);
    save(); render();
    toast(tr('{name} added to your collection.', { name: d.name }));
  } catch (e) { toast(tr('Scryfall lookup failed — try again.')); }
}

function commitBrowsed(cardObj) {
  const d = distill(cardObj);
  state.cards[key(d.name)] = d;
  return d.name;
}
function addBrowsedToOwned(cardObj) {
  const n = commitBrowsed(cardObj);
  addVariant(n, { qty: 1 });
  logEvent('added', n, 1, priceOf(n));
  save(); render();
  toast(tr('Added a copy of {name} to your collection.', { name: n }));
}
function addBrowsedToWishlist(cardObj) {
  const n = commitBrowsed(cardObj);
  if (wishOf(n)) { addToWishlist(n, -wishOf(n)); render(); toast(tr('{name} removed from your buy list.', { name: n })); }
  else { addToWishlist(n, 1); render(); toast(tr('{name} added to your buy list.', { name: n })); }
}

function showACMenu(names) {
  const menu = $('#acMenu'), input = $('#addAutocomplete');
  const have = new Set(addTags.map(t => key(t.name)));
  acItems = names.filter(n => !have.has(key(n))).slice(0, 10);
  acActive = -1;
  if (!acItems.length) { hideACMenu(); return; }
  menu.innerHTML = acItems.map((n, i) => `<button type="button" class="ac-item" role="option" data-acidx="${i}"><span class="ac-art" style="background-image:url('${addArtUrl(n)}')" aria-hidden="true"></span><span class="ac-name">${esc(n)}</span></button>`).join('');
  menu.hidden = false;
  input.setAttribute('aria-expanded', 'true');
}
function hideACMenu() {
  const menu = $('#acMenu'), input = $('#addAutocomplete');
  if (menu) { menu.hidden = true; menu.innerHTML = ''; }
  if (input) input.setAttribute('aria-expanded', 'false');
  acItems = []; acActive = -1;
}
function setACActive(i) {
  const btns = $$('#acMenu .ac-item');
  if (!btns.length) return;
  acActive = (i + btns.length) % btns.length;
  btns.forEach((b, bi) => b.classList.toggle('active', bi === acActive));
  btns[acActive].scrollIntoView({ block: 'nearest' });
}
// ── Collection (inventory) search autocomplete — LOCAL (no network); suggests owned card names.
function showInvAc(q) {
  const menu = $('#invAcMenu'), input = $('#invSearch');
  if (!menu) return;
  const ql = (q || '').toLowerCase();
  const owned = allCardNames().filter(n => ownedOf(n) > 0);
  const sorted = owned
    .filter(n => n.toLowerCase().includes(ql))
    .sort((a, b) => {                                // prefix matches first, then alphabetical
      const pa = a.toLowerCase().startsWith(ql) ? 0 : 1, pb = b.toLowerCase().startsWith(ql) ? 0 : 1;
      return pa - pb || a.localeCompare(b);
    });
  invAcItems = sorted.slice(0, 10);
  invAcActive = -1;
  if (!invAcItems.length) { hideInvAc(); return; }
  menu.innerHTML = invAcItems.map((n, i) => `<button type="button" class="ac-item" role="option" data-invacidx="${i}"><span class="ac-art" style="background-image:url('${addArtUrl(n)}')" aria-hidden="true"></span><span class="ac-name">${esc(n)}</span></button>`).join('');
  menu.hidden = false;
  if (input) input.setAttribute('aria-expanded', 'true');
}
function hideInvAc() {
  const menu = $('#invAcMenu'), input = $('#invSearch');
  if (menu) { menu.hidden = true; menu.innerHTML = ''; }
  if (input) input.setAttribute('aria-expanded', 'false');
  invAcItems = []; invAcActive = -1;
}
function setInvAcActive(i) {
  const btns = $$('#invAcMenu .ac-item');
  if (!btns.length) return;
  invAcActive = (i + btns.length) % btns.length;
  btns.forEach((b, bi) => b.classList.toggle('active', bi === invAcActive));
  btns[invAcActive].scrollIntoView({ block: 'nearest' });
}
// Selecting a suggestion filters the Collection to that exact card name.
function pickInvAc(name) {
  if (!name) return;
  invSearch = name;
  const input = $('#invSearch'); if (input) input.value = name;
  hideInvAc();
  renderInventory();
}
function addTagByName(name) {
  if (!name || addTags.some(t => key(t.name) === key(name))) return;
  addTags.push({ name, qty: 1, foil: false });
  renderAddTags();
  const inp = $('#addAutocomplete');
  inp.value = ''; hideACMenu(); inp.focus();
}
// card-art url: prefer a printing we already know, else Scryfall's named-image endpoint (no JSON fetch)
const addArtUrl = (name) => displayArt(name) || ('https://api.scryfall.com/cards/named?exact=' + encodeURIComponent(name) + '&format=image&version=art_crop');
function renderAddTags() {
  const wrap = $('#addTagList');
  if (!wrap) return;
  wrap.innerHTML = addTags.map((t, i) => `
    <span class="add-tag" data-tagidx="${i}">
      <span class="at-art" style="background-image:url('${addArtUrl(t.name)}')" aria-hidden="true"></span>
      <span class="at-name" title="${esc(t.name)}">${esc(t.name)}</span>
      <span class="at-step">
        <button type="button" data-tagstep="-1" aria-label="${tr('One fewer')}">−</button>
        <b>${t.qty}</b>
        <button type="button" data-tagstep="1" aria-label="${tr('One more')}">+</button>
      </span>
      <button type="button" class="at-foil ${t.foil ? 'on' : ''}" data-tagfoil title="${tr('Foil copy')}"><i class="ms ms-dfc-spark" aria-hidden="true"></i></button>
      <button type="button" class="at-x" data-tagremove aria-label="${tr('Remove {name}', { name: esc(t.name) })}">✕</button>
    </span>`).join('');
}

let addTarget = 'collection';   // 'collection' (personal) | 'store' (active store inventory)
function openAdd(target) {
  addTarget = (target === 'store' && myStore) ? 'store' : 'collection';
  $('#addModal').hidden = false;
  const t = $('#addModalTitle'); if (t) t.textContent = addTarget === 'store' ? tr('Add Cards to Inventory') : tr('Add Cards to Collection');
  addTags = []; renderAddTags(); hideACMenu();
  $('#addAutocomplete').value = '';
  if ($('#addInput')) $('#addInput').value = '';
  $('#addStatus').textContent = '';
  $('#addAutocomplete').focus();
}
function closeAdd() {
  $('#addModal').hidden = true;
  if ($('#addInput')) $('#addInput').value = '';
  $('#addAutocomplete').value = '';
  addTags = []; renderAddTags(); hideACMenu();
  $('#addStatus').textContent = '';
  addTarget = 'collection';
}

/* =====================================================================
   BACKUP
   ===================================================================== */
function exportBackup() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `vault-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  toast(tr('Backup exported.'));
}
function restoreBackup(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!data.decks || !data.cards || (!data.variants && !data.owned)) throw new Error('bad shape');
      state = migrate(data);
      rebuildBuyExclude();
      undoStack = [];   // the restored state is a fresh baseline — pre-restore undo points no longer apply
      save();
      currentDeckId = null;
      render();
      setView('decks');
      toast(tr('Backup restored.'));
    } catch (e) { toast(tr('That file is not a valid Vault backup.')); }
  };
  reader.readAsText(file);
}

/* ---------- buy list export ---------- */
function buyListText() {
  const decks = buyDecksActive();
  const names = allCardNames().filter(n => requiredFor(n, decks) > ownedOf(n) && !buyExclude.has(key(n)));
  names.sort(buyCompare(buySort, decks));
  return names.map(n => `${requiredFor(n, decks) - ownedOf(n)} ${card(n).name}`).join('\n');
}
// Cards to buy, after deck filter + per-card selection, richest-first (shared by copy + PDF).
function buyExportRows() {
  const decks = buyDecksActive();
  const names = allCardNames().filter(n => requiredFor(n, decks) > ownedOf(n) && !buyExclude.has(key(n)));
  names.sort(buyCompare(buySort, decks));
  return names.map(n => {
    const meta = card(n);
    const need = requiredFor(n, decks) - ownedOf(n);
    return { name: meta.name, need, price: priceOf(n), sub: need * priceOf(n), image: meta.image, set: meta.set, set_name: meta.set_name,
      used: decks.filter(d => d.cards.some(c => key(c.name) === key(n))).map(d => d.name) };
  });
}

// Build a printable sheet (8 cards/page · 2×4) and open the browser's print → Save as PDF.
async function exportBuyPDF() {
  const rows = buyExportRows();
  if (!rows.length) { toast(tr('Nothing to buy — every deck is complete.')); return; }
  const total = rows.reduce((a, r) => a + r.sub, 0);
  const copies = rows.reduce((a, r) => a + r.need, 0);
  const scope = buyDeckSel.length ? buyDecksActive().map(d => d.name).join(', ') : tr('All decks');
  const date = new Date().toLocaleDateString(I18N.locale(), { year: 'numeric', month: 'long', day: 'numeric' });

  const cell = (r) => `<div class="print-card">
    <div class="pc-art">${r.image ? `<img src="${esc(r.image)}" alt="" />` : `<div class="pc-art-fallback">✶</div>`}<span class="pc-qty">${r.need}×</span></div>
    <div class="pc-info">
      <div class="pc-name">${esc(r.name)}</div>
      ${r.set ? `<div class="pc-set">${esc(r.set)}${r.set_name ? ' · ' + esc(r.set_name) : ''}</div>` : ''}
      ${r.used.length ? `<div class="pc-decks">${tr('for {decks}', { decks: esc(r.used.join(', ')) })}</div>` : ''}
      <div class="pc-price"><span class="pc-each">${tr('{price} ea', { price: money(r.price) })}</span><span class="pc-sub">${money(r.sub)}</span></div>
    </div>
  </div>`;

  const pages = [];
  for (let i = 0; i < rows.length; i += 8) pages.push(rows.slice(i, i + 8));
  const html = pages.map((pg, i) => `<section class="print-page">
    ${i === 0 ? `<header class="print-head">
      <h1>${tr('Buy List')}</h1>
      <div class="print-meta">${tr(copies === 1 ? '{n} card' : '{n} cards', { n: copies })} · ${money(total)} · ${esc(scope)} · ${esc(date)}</div>
    </header>` : ''}
    <div class="print-grid">${pg.map(cell).join('')}</div>
  </section>`).join('');

  const root = $('#printRoot');
  root.innerHTML = html;
  const imgs = [...root.querySelectorAll('img')];
  await Promise.all(imgs.map(img => img.complete ? Promise.resolve() : new Promise(res => { img.onload = img.onerror = res; })));
  window.print();
}

// Every owned card as "<qty> <name>", alphabetical — for copying the whole collection.
function collectionText() {
  const names = allCardNames().filter(n => ownedOf(n) > 0);
  names.sort((a, b) => a.localeCompare(b));
  return names.map(n => `${ownedOf(n)} ${card(n).name}`).join('\n');
}

// Write text to the clipboard with a graceful textarea fallback; returns true on success.
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (e) {
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.focus(); ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (e2) { ok = false; }
    ta.remove();
    return ok;
  }
}

async function copyBuyList() {
  const binder = activeBinder();
  const text = binder ? binderRows(binder).map(r => `${r.q} ${r.n}`).join('\n') : buyListText();
  if (!text) { toast(binder ? tr('“{name}” is empty.', { name: binder.name }) : tr('Nothing to buy — every deck is complete.')); return; }
  const lines = text.split('\n').length;
  toast(await copyText(text)
    ? tr(lines === 1 ? '{label} copied — {n} card ready to send.' : '{label} copied — {n} cards ready to send.', { label: binder ? `“${binder.name}”` : tr('Buy list'), n: lines })
    : tr('Could not access the clipboard.'));
}

/* =====================================================================
   SELL LISTS — multiple named "folders", each lists owned copies for sale
   state.sellLists = [{ id, name, items: { variantId: copiesListed } }]
   state.activeSellList = id of the folder being viewed / added to
   ===================================================================== */
function activeSellList() {
  let l = state.sellLists.find(x => x.id === state.activeSellList);
  if (!l) { l = state.sellLists[0]; if (l) state.activeSellList = l.id; }
  return l;
}
function sellItems() { const l = activeSellList(); return l ? l.items : {}; }
function sellListName() { const l = activeSellList(); return l ? l.name : 'Sell List'; }
const sellQtyOf = (vid) => sellItems()[vid] || 0;

// variantId -> { name (display), v (live variant object) } across the whole collection
function variantIndex() {
  const idx = new Map();
  for (const k of Object.keys(state.variants)) {
    const name = (state.cards[k] && state.cards[k].name) || k;
    (state.variants[k] || []).forEach(v => idx.set(v.id, { name, v }));
  }
  return idx;
}
// Drop sell entries whose variant is gone, and clamp each to the copies still owned — across ALL folders.
function pruneSellList() {
  const idx = variantIndex();
  let changed = false;
  state.sellLists.forEach(l => {
    for (const vid of Object.keys(l.items)) {
      const hit = idx.get(vid);
      const clamped = hit ? Math.min(l.items[vid], hit.v.qty) : 0;
      if (clamped <= 0) { delete l.items[vid]; changed = true; }
      else if (clamped !== l.items[vid]) { l.items[vid] = clamped; changed = true; }
    }
  });
  if (changed) save();
}
function setSellQty(vid, delta) {
  const items = sellItems();
  const hit = variantIndex().get(vid);
  if (!hit) { delete items[vid]; save(); render(); return; }
  const next = Math.max(0, Math.min((items[vid] || 0) + delta, hit.v.qty));
  if (next <= 0) delete items[vid]; else items[vid] = next;
  save(); render();
}
// Toggle one variant on/off the ACTIVE folder (default = list every copy of it).
function toggleSellVariant(name, vid) {
  const v = variantById(name, vid);
  if (!v) return;
  const items = sellItems();
  if (items[vid] > 0) delete items[vid];
  else if (v.qty > 0) items[vid] = v.qty;
  save(); render();
}
// Toggle every variant of a card at once (used by the inventory art tile).
function toggleSellCard(name) {
  const vs = variantsOf(name), items = sellItems();
  const anyListed = vs.some(v => items[v.id] > 0);
  vs.forEach(v => { if (anyListed) delete items[v.id]; else if (v.qty > 0) items[v.id] = v.qty; });
  save(); render();
  toast(anyListed ? tr('Removed {name} from “{list}”.', { name, list: sellListName() }) : tr('Listed {name} in “{list}”.', { name, list: sellListName() }));
}
function removeFromSell(vid) { delete sellItems()[vid]; save(); render(); }
function removeVariantFromAllSellLists(vid) { state.sellLists.forEach(l => { delete l.items[vid]; }); }
// List every variant of every "unlinked" owned card (owned, in no deck) into the active folder.
function addUnlinkedToSell() {
  const items = sellItems();
  let added = 0;
  allCardNames().forEach(n => {
    if (ownedOf(n) <= 0 || decksUsing(n).length) return;
    variantsOf(n).forEach(v => { if (v.qty > 0 && !(items[v.id] > 0)) { items[v.id] = v.qty; added++; } });
  });
  save(); render();
  toast(added ? tr(added === 1 ? 'Listed {n} unlinked copy in “{list}”.' : 'Listed {n} unlinked copies in “{list}”.', { n: added, list: sellListName() }) : tr('No unlinked cards to add — they’re all in decks or already listed.'));
}
// Fresh, sorted sell rows for the ACTIVE folder.
function sellRows() {
  const idx = variantIndex(), items = sellItems();
  const rows = [];
  for (const vid of Object.keys(items)) {
    const hit = idx.get(vid);
    if (!hit) continue;
    const qty = Math.min(items[vid], hit.v.qty);
    if (qty <= 0) continue;
    const unit = variantPrice(hit.name, hit.v);
    rows.push({ vid, name: hit.name, v: hit.v, qty, unit, sub: unit * qty, used: decksUsing(hit.name) });
  }
  return rows;
}
/* sell list folders — create / switch / rename / delete */
function setActiveSellList(id) { if (state.sellLists.some(l => l.id === id)) { state.activeSellList = id; save(); render(); } }
function createSellList(name) {
  const l = { id: uid(), name: (name || '').trim() || tr('List {n}', { n: state.sellLists.length + 1 }), items: {} };
  state.sellLists.push(l); state.activeSellList = l.id; save(); render();
  toast(tr('Created sell list “{name}”.', { name: l.name }));
}
function renameSellList(id, name) {
  const l = state.sellLists.find(x => x.id === id); if (!l) return;
  const nm = (name || '').trim(); if (!nm) return;
  l.name = nm; save(); render();
}
function deleteSellList(id) {
  const l = state.sellLists.find(x => x.id === id); if (!l) return;
  const n = Object.keys(l.items).length;
  if (n && !confirm(tr(n === 1 ? 'Delete the sell list “{name}” and unlist its {n} card? (Your collection is untouched.)' : 'Delete the sell list “{name}” and unlist its {n} cards? (Your collection is untouched.)', { name: l.name, n }))) return;
  state.sellLists = state.sellLists.filter(x => x.id !== id);
  if (!state.sellLists.length) state.sellLists.push({ id: uid(), name: 'Sell List', items: {} });
  state.activeSellList = state.sellLists[0].id;
  // a shared link pointing at this folder is now orphaned — revoke it so it doesn't linger as a frozen "live" link
  if (typeof myShares !== 'undefined') myShares.filter(s => s.source === id).forEach(s => revokeShare(s.code));
  save(); render();
  toast(tr('Deleted sell list “{name}”.', { name: l.name }));
}
function renderSellFolders() {
  const wrap = $('#sellFolders'); if (!wrap) return;
  const active = activeSellList();
  wrap.innerHTML = state.sellLists.map(l => {
    const count = Object.keys(l.items).length;
    const on = active && l.id === active.id;
    return `<span class="sell-folder-wrap${on ? ' on' : ''}">
      <button class="sell-folder${on ? ' on' : ''}" data-sellfolder="${l.id}"><i class="ms ms-token" aria-hidden="true"></i> ${esc(l.name)}${count ? ` <span class="sf-count">${count}</span>` : ''}</button>
      ${on ? `<button class="sf-icon" data-sellfolder-rename="${l.id}" title="${tr('Rename this list')}" aria-label="${tr('Rename')}"><i class="ms ms-artist-nib" aria-hidden="true"></i></button><button class="sf-icon" data-sellfolder-del="${l.id}" title="${tr('Delete this list')}" aria-label="${tr('Delete')}">✕</button>` : ''}
    </span>`;
  }).join('') + `<button class="sell-folder add" data-sellfolder-new title="${tr('Create a new sell list')}">${tr('+ New list')}</button>`;
}

/* an inventory card/copy is "listed" if it's in ANY folder (the gold tile state) */
function variantListedAnywhere(vid) { return state.sellLists.some(l => l.items[vid] > 0); }
function cardListedAnywhere(name) { return variantsOf(name).some(v => variantListedAnywhere(v.id)); }
function variantInList(vid, listId) { const l = state.sellLists.find(x => x.id === listId); return !!(l && l.items[vid] > 0); }
function cardInList(name, listId) { const l = state.sellLists.find(x => x.id === listId); return !!l && variantsOf(name).some(v => l.items[v.id] > 0); }
// toggle a card / single copy in a SPECIFIC folder (used by the folder picker)
function toggleSellVariantIn(name, vid, listId) {
  const v = variantById(name, vid), l = state.sellLists.find(x => x.id === listId);
  if (!v || !l) return;
  const adding = !(l.items[vid] > 0);
  if (adding) { if (v.qty > 0) l.items[vid] = v.qty; } else delete l.items[vid];
  save(); render();
  toast(adding ? tr('Listed {name} in “{list}”.', { name, list: l.name }) : tr('Unlisted {name} from “{list}”.', { name, list: l.name }));
}
function toggleSellCardIn(name, listId) {
  const l = state.sellLists.find(x => x.id === listId); if (!l) return;
  const vs = variantsOf(name), any = vs.some(v => l.items[v.id] > 0);
  vs.forEach(v => { if (any) delete l.items[v.id]; else if (v.qty > 0) l.items[v.id] = v.qty; });
  save(); render();
  toast(any ? tr('Removed {name} from “{list}”.', { name, list: l.name }) : tr('Listed {name} in “{list}”.', { name, list: l.name }));
}

/* folder-picker popover — choose which sell list(s) an inventory card / copy goes in */
let sellPickTarget = null;   // { name, vid: null (whole card) | variantId (one copy) }
function openSellPicker(target, anchorEl) {
  sellPickTarget = target;
  const menu = $('#sellPickMenu'); if (!menu) return;
  renderSellPicker();
  menu.hidden = false;
  const r = anchorEl.getBoundingClientRect();
  const left = Math.max(8, Math.min(r.left, window.innerWidth - menu.offsetWidth - 8));
  let top = r.bottom + 6;
  if (top + menu.offsetHeight > window.innerHeight - 8) top = Math.max(8, r.top - menu.offsetHeight - 6);
  menu.style.left = left + 'px';
  menu.style.top = top + 'px';
}
function renderSellPicker() {
  const menu = $('#sellPickMenu'); if (!menu || !sellPickTarget) return;
  const { name, vid } = sellPickTarget;
  const inIt = (id) => vid ? variantInList(vid, id) : cardInList(name, id);
  menu.innerHTML = `<div class="sp-head">${tr('List “{name}” in…', { name: esc(name) })}</div>`
    + state.sellLists.map(l => `<button class="sp-item${inIt(l.id) ? ' on' : ''}" data-sp-list="${l.id}"><span class="sp-check">${inIt(l.id) ? '✓' : ''}</span><span class="sp-name">${esc(l.name)}</span></button>`).join('')
    + `<button class="sp-item sp-new" data-sp-new><span class="sp-check">+</span><span class="sp-name">${tr('New list…')}</span></button>`;
}
function closeSellPicker() { const m = $('#sellPickMenu'); if (m) m.hidden = true; sellPickTarget = null; }

/* =====================================================================
   BUY BINDERS — optional MANUAL buy folders alongside the auto "Deck needs" list
   state.buyBinders = [{ id, name, items: { [nameKey]: { n: displayName, q: qty } } }]
   state.activeBuyBinder = id of the binder being viewed | null = the auto deck-needs list
   ===================================================================== */
function activeBinder() { return state.activeBuyBinder ? (state.buyBinders.find(b => b.id === state.activeBuyBinder) || null) : null; }
function binderById(id) { return state.buyBinders.find(b => b.id === id) || null; }
function binderCount(b) { return b ? Object.keys(b.items).length : 0; }
function cardInBinder(name, binderId) { const b = binderById(binderId); return !!(b && b.items[key(name)]); }
function binderItemQty(name, binderId) { const b = binderById(binderId); const it = b && b.items[key(name)]; return it ? it.q : 0; }

function setActiveBuyBinder(id) { if (id) buyMatchOpen = false; state.activeBuyBinder = id || null; save(); render(); }
function createBuyBinder(name) {
  const b = { id: uid(), name: (name || '').trim() || tr('Binder {n}', { n: state.buyBinders.length + 1 }), items: {} };
  state.buyBinders.push(b); state.activeBuyBinder = b.id; save(); render();
  toast(tr('Created buy binder “{name}”.', { name: b.name }));
  return b;
}
function renameBuyBinder(id, name) {
  const b = binderById(id); if (!b) return;
  const nm = (name || '').trim(); if (!nm) return;
  b.name = nm; save(); render();
}
function deleteBuyBinder(id) {
  const b = binderById(id); if (!b) return;
  const n = binderCount(b);
  if (n && !confirm(tr(n === 1 ? 'Delete the buy binder “{name}” and its {n} card? (Your collection and the auto buy list are untouched.)' : 'Delete the buy binder “{name}” and its {n} cards? (Your collection and the auto buy list are untouched.)', { name: b.name, n }))) return;
  state.buyBinders = state.buyBinders.filter(x => x.id !== id);
  if (state.activeBuyBinder === id) state.activeBuyBinder = null;
  save(); render();
  toast(tr('Deleted buy binder “{name}”.', { name: b.name }));
}
// add / set / remove a card in a specific binder
function addCardToBinder(name, binderId, qty) {
  const b = binderById(binderId); if (!b) return false;
  const k = key(name), meta = card(name);
  const nm = (meta && !meta.notFound && meta.name) || name;
  const cur = b.items[k];
  b.items[k] = { n: nm, q: Math.max(1, (cur ? cur.q : 0) + (qty || 1)) };
  save(); return true;
}
function setBinderQty(name, binderId, q) {
  const b = binderById(binderId); if (!b) return;
  const k = key(name);
  if (q <= 0) delete b.items[k];
  else if (b.items[k]) b.items[k].q = q;
  save(); render();
}
function removeCardFromBinder(name, binderId) { const b = binderById(binderId); if (!b) return; delete b.items[key(name)]; save(); render(); }
function toggleCardInBinder(name, binderId) {
  const b = binderById(binderId); if (!b) return;
  if (b.items[key(name)]) { delete b.items[key(name)]; save(); render(); toast(tr('Removed {name} from “{binder}”.', { name, binder: b.name })); }
  else { addCardToBinder(name, binderId, 1); render(); toast(tr('Added {name} to “{binder}”.', { name, binder: b.name })); }
}
// resolve a typed name (fetching card data if we've never seen it) and add it to a binder
async function addNameToBinder(name, binderId) {
  name = (name || '').trim(); if (!name) return;
  const b = binderById(binderId); if (!b) { toast(tr('Open a binder first.')); return; }
  let meta = card(name);
  if (!meta || meta.notFound) {
    const status = $('#binderAddStatus'); if (status) status.textContent = tr('Looking up…');
    try {
      const idx = await fetchCardData([{ name }]);
      const c = idx[key(name)] || idx[key(frontFace(name))];
      if (c) { state.cards[key(c.name)] = distill(c); name = c.name; }
      else { if (status) status.textContent = tr('Couldn’t find “{name}”.', { name }); return; }
    } catch (e) { if (status) status.textContent = tr('Lookup failed — check your connection.'); return; }
  }
  addCardToBinder(name, binderId, 1);
  render();
  const inp = $('#binderAddInput'); if (inp) { inp.value = ''; inp.focus(); }
  const status = $('#binderAddStatus'); if (status) status.textContent = '';
  toast(tr('Added {name} to “{binder}”.', { name, binder: b.name }));
}
// "Bought" from a binder — acquire the wanted copies into the collection, then drop them from the binder.
function boughtFromBinder(name, binderId) {
  const b = binderById(binderId); if (!b) return;
  const it = b.items[key(name)]; if (!it) return;
  const q = it.q || 1;
  pushUndo(tr('buy of {n}× {name}', { n: q, name }));
  addVariant(name, { qty: q });
  logEvent('bought', name, q, priceOf(name));
  delete b.items[key(name)];
  save(); render();
  toast(tr('Bought {n}× {name} — added to your collection.', { n: q, name }), { undo: true });
}
// sorted rows for the active binder (reuses buyCompare's name comparator vocabulary)
function binderRows(b) {
  const names = Object.keys(b.items).map(k => b.items[k].n);
  const query = buySearch.trim().toLowerCase();
  let list = query ? names.filter(n => n.toLowerCase().includes(query)) : names;
  const qtyOf = (n) => (b.items[key(n)] ? b.items[key(n)].q : 1);
  const byName = (a, c) => a.localeCompare(c);
  // price sorts must use the binder's own line cost (qty × unit), not the deck-needs comparator (which is 0 here)
  if (buySort === 'price-desc') list.sort((a, c) => qtyOf(c) * priceOf(c) - qtyOf(a) * priceOf(a) || byName(a, c));
  else if (buySort === 'price-asc') list.sort((a, c) => qtyOf(a) * priceOf(a) - qtyOf(c) * priceOf(c) || byName(a, c));
  else list.sort(buyCompare(buySort, []));   // name/rarity/colour/type/set read card() metadata directly — fine
  return list.map(n => ({ n, q: qtyOf(n) }));
}

function renderBuyFolders() {
  const wrap = $('#buyFolders'); if (!wrap) return;
  const activeId = state.activeBuyBinder;
  const needsCount = (() => { try { return allCardNames().filter(n => requiredFor(n, state.decks) > ownedOf(n)).length; } catch (e) { return 0; } })();
  let html = `<button class="sell-folder${!activeId ? ' on' : ''}" data-buyfolder="auto"><i class="ms ms-counter-lore" aria-hidden="true"></i> ${tr('Deck needs')}${needsCount ? ` <span class="sf-count">${needsCount}</span>` : ''}</button>`;
  html += state.buyBinders.map(b => {
    const on = b.id === activeId, n = binderCount(b);
    return `<span class="sell-folder-wrap${on ? ' on' : ''}">
      <button class="sell-folder${on ? ' on' : ''}" data-buyfolder="${b.id}"><i class="ms ms-token" aria-hidden="true"></i> ${esc(b.name)}${n ? ` <span class="sf-count">${n}</span>` : ''}</button>
      ${on ? `<button class="sf-icon" data-buyfolder-rename="${b.id}" title="${tr('Rename this binder')}" aria-label="${tr('Rename')}"><i class="ms ms-artist-nib" aria-hidden="true"></i></button><button class="sf-icon" data-buyfolder-del="${b.id}" title="${tr('Delete this binder')}" aria-label="${tr('Delete')}">✕</button>` : ''}
    </span>`;
  }).join('');
  html += `<button class="sell-folder add" data-buyfolder-new title="${tr('Create a buy binder (e.g. Need now / Soon / Someday)')}">${tr('+ New binder')}</button>`;
  wrap.innerHTML = html;
}

// hide the auto-list-only header controls + deck filter when viewing a manual binder
function toggleBuyHeaderForMode(isBinder) {
  [['#buyDeckFilter', isBinder], ['#buyMatchBtn', isBinder], ['#exportPdfBtn', isBinder], ['#buyShareBtn', isBinder]]
    .forEach(([sel, hide]) => { const el = $(sel); if (el) el.hidden = hide; });
}

function renderBinder(b) {
  $('#buyDeckFilter').hidden = true;
  const rows = binderRows(b);
  const total = rows.reduce((a, r) => a + r.q * priceOf(r.n), 0);
  const copies = rows.reduce((a, r) => a + r.q, 0);
  const se = $('#buySearch'); if (se && se.value !== buySearch) se.value = buySearch;
  $('#buyListSub').textContent = rows.length
    ? tr(copies === 1 ? '{n} card in “{binder}” · {total}' : '{n} cards in “{binder}” · {total}', { n: copies, binder: b.name, total: money(total) }) + (buySearch.trim() ? ' · ' + tr('matching “{q}”', { q: buySearch.trim() }) : '')
    : (buySearch.trim() ? tr('No cards in “{binder}” match “{q}”.', { binder: b.name, q: buySearch.trim() }) : tr('“{binder}” is empty — add cards below.', { binder: b.name }));

  const table = $('#buyTable');
  table.classList.remove('gallery');   // binder lays out its own add-bar + grid wrapper, so the table stays a plain block
  table.style.setProperty('--tile', buyTile + 'px');
  const buySizeWrap = $('#buySizeWrap');
  if (buySizeWrap) { buySizeWrap.hidden = buyMode !== 'art'; const r = $('#buySizeRange'); if (r) r.value = buyTile; }

  const addBar = `<div class="binder-add">
    <i class="ms ms-counter-lore binder-add-ic" aria-hidden="true"></i>
    <input type="text" id="binderAddInput" class="binder-add-input" placeholder="${tr('Add a card by name — type it and press Enter…')}" autocomplete="off" />
    <button class="btn gold sm" id="binderAddBtn">${tr('Add')}</button>
    <span class="binder-add-status" id="binderAddStatus"></span>
  </div>`;

  if (!rows.length) {
    table.innerHTML = addBar + `<div class="empty-state" style="padding:40px 20px"><span class="empty-mark"><i class="ms ms-token" aria-hidden="true"></i></span><h2>${tr('{binder} is empty', { binder: esc(b.name) })}</h2><p>${tr('Add cards you plan to buy — by name above, or with the {icon} button on any card in {needs}.', { icon: '<i class="ms ms-counter-lore" aria-hidden="true"></i>', needs: '<b>' + tr('Deck needs') + '</b>' })}</p></div>`;
    return;
  }
  table.innerHTML = addBar + (buyMode === 'art'
    ? `<div class="binder-gallery">${rows.map(r => binderArtTile(r, b.id)).join('')}</div>`
    : rows.map(r => binderRow(r, b.id)).join(''));
}
function binderRow({ n, q }, binderId) {
  const meta = card(n);
  return `<div class="card-row missing binder-row">
    <div class="cname"><span class="row-marks">${typeIcon(n)}${rarityIcon(meta.rarity)}</span>
      <span class="bd-step"><button data-binderstep="-1" data-bname="${esc(n)}" aria-label="One fewer">−</button><b>${q}×</b><button data-binderstep="1" data-bname="${esc(n)}" aria-label="One more">+</button></span>
      <span class="nm" data-name="${esc(n)}" data-uri="${esc(meta.uri || '')}">${esc(n)}</span>${manaSymbols(meta.mana_cost)}</div>
    <div class="price"><span class="need">${money(q * priceOf(n))}</span></div>
    <button class="buy-got" data-binderbought="${esc(n)}" title="${tr('I bought {n} — add to my collection', { n: q })}"><i class="ms ms-counter-shield" aria-hidden="true"></i> ${tr('Bought')}</button>
    <button class="bd-x" data-binderremove="${esc(n)}" title="${tr('Remove from this binder')}" aria-label="${tr('Remove')}">✕</button>
  </div>`;
}
function binderArtTile({ n, q }, binderId) {
  return `<div class="art-tile buy binder-tile">
    <button class="bd-x tile" data-binderremove="${esc(n)}" title="${tr('Remove from this binder')}" aria-label="${tr('Remove')}">✕</button>
    <button class="buy-got-tile" data-binderbought="${esc(n)}" title="${tr('I bought {n} — add to my collection', { n: q })}"><i class="ms ms-counter-shield" aria-hidden="true"></i></button>
    <button class="art-open" data-name="${esc(n)}">
      ${artTile(n, q + '×', `<span class="art-val need">${money(q * priceOf(n))}</span>`)}
    </button>
  </div>`;
}

/* buy-binder picker — choose which binder(s) a card goes in (from the auto buy list / card view) */
let buyPickName = null;
function openBuyPicker(name, anchorEl) {
  if (!state.buyBinders.length) { const b = createBuyBinder(tr('Need now')); addCardToBinder(name, b.id, 1); render(); toast(tr('Added {name} to “{binder}”.', { name, binder: b.name })); return; }
  buyPickName = name;
  const menu = $('#buyPickMenu'); if (!menu) return;
  renderBuyPicker();
  menu.hidden = false;
  const r = anchorEl.getBoundingClientRect();
  const left = Math.max(8, Math.min(r.left, window.innerWidth - menu.offsetWidth - 8));
  let top = r.bottom + 6;
  if (top + menu.offsetHeight > window.innerHeight - 8) top = Math.max(8, r.top - menu.offsetHeight - 6);
  menu.style.left = left + 'px'; menu.style.top = top + 'px';
}
function renderBuyPicker() {
  const menu = $('#buyPickMenu'); if (!menu || !buyPickName) return;
  menu.innerHTML = `<div class="sp-head">${tr('Add “{name}” to…', { name: esc(buyPickName) })}</div>`
    + state.buyBinders.map(b => `<button class="sp-item${cardInBinder(buyPickName, b.id) ? ' on' : ''}" data-bp-binder="${b.id}"><span class="sp-check">${cardInBinder(buyPickName, b.id) ? '✓' : ''}</span><span class="sp-name">${esc(b.name)}</span></button>`).join('')
    + `<button class="sp-item sp-new" data-bp-new><span class="sp-check">+</span><span class="sp-name">${tr('New binder…')}</span></button>`;
}
function closeBuyPicker() { const m = $('#buyPickMenu'); if (m) m.hidden = true; buyPickName = null; }

/* ---------- match a pasted wants-list against your collection ---------- */
// Build the {matches, misses} report from a list of {name, qty} (names already canonical).
function buildMatchResult(wantList) {
  const want = new Map();
  wantList.forEach(p => {
    const k = key(p.name);
    if (want.has(k)) want.get(k).qty += p.qty; else want.set(k, { name: p.name, qty: p.qty });
  });
  const matches = [], misses = [];
  want.forEach(w => {
    const have = ownedOf(w.name);
    (have > 0 ? matches : misses).push({ name: w.name, want: w.qty, have, price: priceOf(w.name) });
  });
  matches.sort((a, b) => (b.price * Math.min(b.want, b.have)) - (a.price * Math.min(a.want, a.have)) || a.name.localeCompare(b.name));
  misses.sort((a, b) => a.name.localeCompare(b.name));
  return { matches, misses };
}
function matchList(text) { return buildMatchResult(parseDecklist(text || '')); }
// Resolve the pasted names through Scryfall (canonicalises DFCs / odd spellings / accents,
// and fetches prices) so matching against the collection is reliable — same as deck import.
async function runSellMatch() {
  const ta = $('#sellMatchInput'); if (ta) sellMatchText = ta.value;
  sellMatchOf = sellMatchText;                   // snapshot for the quick-sell drift guard
  const parsed = parseDecklist(sellMatchText || '');
  if (!parsed.length) { sellMatchResult = { matches: [], misses: [] }; renderSellList(); return; }
  sellMatchLoading = true; renderSellList();
  try {
    const { resolved } = await resolveCards(parsed.map(p => ({ name: p.name, qty: p.qty })));
    sellMatchResult = buildMatchResult(resolved);
  } catch (e) {
    sellMatchResult = buildMatchResult(parsed);   // fall back to local exact-name match
    toast(tr('Scryfall lookup failed — matched names locally instead.'));
  }
  sellMatchLoading = false; renderSellList();
}
function copyMatchHaves() {
  if (!sellMatchResult || !sellMatchResult.matches.length) { toast(tr('Nothing to copy — no matches.')); return; }
  const text = sellMatchResult.matches.map(m => `${Math.min(m.want, m.have)} ${m.name}${m.price ? ` — ${money(m.price)} ea` : ''}`).join('\n');
  copyText(text).then(ok => toast(ok ? tr(sellMatchResult.matches.length === 1 ? 'Copied {n} card you have.' : 'Copied {n} cards you have.', { n: sellMatchResult.matches.length }) : tr('Could not access the clipboard.')));
}
function addMatchesToSell() {
  if (!sellMatchResult || !sellMatchResult.matches.length) { toast(tr('No matches to add.')); return; }
  const items = sellItems();
  let n = 0;
  sellMatchResult.matches.forEach(m => variantsOf(m.name).forEach(v => { if (v.qty > 0 && !(items[v.id] > 0)) { items[v.id] = v.qty; n++; } }));
  save(); render();
  toast(n ? tr(n === 1 ? 'Added {n} matched copy to “{list}”.' : 'Added {n} matched copies to “{list}”.', { n, list: sellListName() }) : tr('Those matches are already in this list.'));
}
// Quick-sell: I sold the matched copies — remove them from collection (plain
// copies first via setOwned, keeping special printings/foils), then re-match.
function quickSellMatches() {
  const r = sellMatchResult;
  if (!r || !r.matches.length) { toast(tr('No matched cards to sell.')); return; }
  const ta = $('#sellMatchInput');
  if (ta && ta.value.trim() !== (sellMatchOf || '').trim()) { toast(tr('The list changed — click “Match against my collection” again first.')); return; }
  const copies = r.matches.reduce((a, m) => a + Math.min(m.want, ownedOf(m.name)), 0);   // LIVE owned, not the stale match value
  if (!copies) { toast(tr('Those copies are no longer in your collection.')); return; }
  if (!confirm(tr(copies === 1 ? 'Sell {n} matched copy? They’ll be removed from your collection.' : 'Sell {n} matched copies? They’ll be removed from your collection.', { n: copies }))) return;
  pushUndo('quick-sell');
  let cards = 0, sold = 0;
  const remWant = r.matches.map(m => {
    const have = ownedOf(m.name);               // recompute LIVE so the sold count matches what actually leaves inventory
    const n = Math.min(m.want, have);
    if (n > 0) { setOwned(m.name, have - n); logEvent('sold', m.name, n, m.price); cards++; sold += n; }   // m.price = price shown at match time
    return { name: m.name, qty: m.want - n };   // buyer's want left after this sale
  });
  if (!sold) dropUndo();   // nothing actually sold — discard the undo point
  // re-derive the buyer's wants (minus what we just sold) so a second click can't double-sell
  const wanted = [...remWant, ...r.misses.map(x => ({ name: x.name, qty: x.want }))].filter(w => w.qty > 0);
  sellMatchResult = buildMatchResult(wanted);
  save(); render();
  toast(sold ? tr('Sold {copies} ({cards}) — removed from collection.', { copies: tr(sold === 1 ? '{n} copy' : '{n} copies', { n: sold }), cards: tr(cards === 1 ? '{n} card' : '{n} cards', { n: cards }) }) : tr('Nothing to sell.'), { undo: !!sold });
}
function renderMatchResults() {
  const r = sellMatchResult; if (!r) return '';
  const total = r.matches.length + r.misses.length;
  if (!total) return `<div class="sm-summary">${tr('No cards found in that list — paste a Moxfield / Archidekt export (one card per line).')}</div>`;
  const fulfill = r.matches.reduce((a, m) => a + Math.min(m.want, m.have) * m.price, 0);
  const haveCopies = r.matches.reduce((a, m) => a + Math.min(m.want, m.have), 0);
  const matchRow = m => `<div class="sm-row have"><span class="sm-name nm" data-name="${esc(m.name)}" title="${esc(m.name)}">${esc(m.name)}</span><span class="sm-qty">${tr('want {a} · {have}', { a: m.want, have: `<b class="sm-have">${tr('have {n}', { n: m.have })}</b>` })}</span><span class="sm-price">${m.price ? money(m.price) : '—'}</span></div>`;
  const missRow = m => `<div class="sm-row miss"><span class="sm-name nm" data-name="${esc(m.name)}" title="${esc(m.name)}">${esc(m.name)}</span><span class="sm-qty">${tr('want {n}', { n: m.want })}</span><span class="sm-x">${tr('not owned')}</span></div>`;
  const matchTileFn = m => matchTile(m.name, m.have + '×', m.price);
  const missTileFn = m => matchTile(m.name, '', m.price, true);
  const secList = (arr, rowFn, tileFn) => sellMode === 'art'   // driven by the main Art/List toggle (#sellViewMode)
    ? `<div class="card-table gallery sm-gallery" style="--tile:150px">${arr.map(tileFn).join('')}</div>`
    : `<div class="sm-list">${arr.map(rowFn).join('')}</div>`;
  return `<div class="sm-summary">${tr('You have {x} of the {total} requested · {copies} · {value} at market', { x: `<b>${r.matches.length}</b>`, total: `<b>${total}</b>`, copies: tr(haveCopies === 1 ? '{n} copy' : '{n} copies', { n: haveCopies }), value: `<b>${money(fulfill)}</b>` })}</div>
    ${r.matches.length ? `<div class="sm-act">
      <button class="btn" id="sellMatchSell"><i class="ms ms-counter-gold" aria-hidden="true"></i> ${tr('Quick-sell · −{n} from collection', { n: haveCopies })}</button>
      <button class="btn ghost" id="sellMatchAdd">${tr('＋ Add to “{list}”', { list: esc(sellListName()) })}</button>
      <button class="btn ghost" id="sellMatchCopy">${tr('⧉ Copy what you have')}</button>
    </div>` : ''}
    ${r.matches.length ? `<div class="sm-sec">${tr('You have · {n}', { n: r.matches.length })}</div>${secList(r.matches, matchRow, matchTileFn)}` : `<div class="sm-empty">${tr('None of those cards are in your collection.')}</div>`}
    ${r.misses.length ? `<div class="sm-sec">${tr('Not owned · {n}', { n: r.misses.length })}</div>${secList(r.misses, missRow, missTileFn)}` : ''}`;
}
function sellMatchPanel() {
  const results = sellMatchLoading
    ? `<div class="sm-loading"><span class="spin"></span><span>${tr('Looking the list up on Scryfall…')}</span></div>`
    : renderMatchResults();
  return `<div class="sell-match">
    <div class="sm-intro">${tr('Paste a wants-list (Moxfield / Archidekt export, or “1 Card Name” per line) and match it against everything you own.')}</div>
    <textarea id="sellMatchInput" class="sm-input" placeholder="${tr('Paste a list — one card per line, e.g.  1 Lightning Bolt')}" spellcheck="false">${esc(sellMatchText)}</textarea>
    <div class="sm-controls">
      <button class="btn" id="sellMatchRun" ${sellMatchLoading ? 'disabled' : ''}><i class="ms ms-ability-investigate" aria-hidden="true"></i> ${tr('Match against my collection')}</button>
      <button class="btn ghost" id="sellMatchClear">${tr('Clear')}</button>
    </div>
    <div class="sm-results">${results}</div>
  </div>`;
}
// ── Buy list "match a seller's list" — the mirror of the sell matcher. Paste a
// list someone has FOR SALE and see which of those cards are on your buy list
// (still needed for your active decks / wishlist), with how many you'd take.
function buildBuyMatchResult(haveList) {
  const decks = buyDecksActive();
  const offered = new Map();
  haveList.forEach(p => {
    const k = key(p.name);
    if (offered.has(k)) offered.get(k).qty += p.qty; else offered.set(k, { name: p.name, qty: p.qty });
  });
  const wants = [], skip = [];
  offered.forEach(o => {
    const need = requiredFor(o.name, decks) - ownedOf(o.name);
    (need > 0 ? wants : skip).push({ name: o.name, have: o.qty, need: Math.max(0, need), price: priceOf(o.name) });
  });
  wants.sort((a, b) => (b.price * Math.min(b.have, b.need)) - (a.price * Math.min(a.have, a.need)) || a.name.localeCompare(b.name));
  skip.sort((a, b) => a.name.localeCompare(b.name));
  return { wants, skip };
}
async function runBuyMatch() {
  const ta = $('#buyMatchInput'); if (ta) buyMatchText = ta.value;
  buyMatchOf = buyMatchText;                     // snapshot for the quick-buy drift guard
  buyMatchStoreName = '';                        // a pasted-text match is no longer tied to a store
  const parsed = parseDecklist(buyMatchText || '');
  if (!parsed.length) { buyMatchResult = { wants: [], skip: [] }; renderBuyList(); return; }
  buyMatchLoading = true; renderBuyList();
  try {
    const { resolved } = await resolveCards(parsed.map(p => ({ name: p.name, qty: p.qty })));
    buyMatchResult = buildBuyMatchResult(resolved);
  } catch (e) {
    buyMatchResult = buildBuyMatchResult(parsed);   // fall back to local exact-name match
    toast(tr('Scryfall lookup failed — matched names locally instead.'));
  }
  buyMatchLoading = false; renderBuyList();
}
// Resolve a store's for-sale cards to the printing the store actually stocks (its `set`),
// so the gallery shows clean, store-accurate art rather than Scryfall's newest default
// (which can be an odd crossover/promo printing — e.g. a Marvel Arcane Signet). Owned cards
// already have their own art, so we skip them. Returns the list with canonical names.
async function resolveStoreCards(items) {
  const out = [];
  for (const it of items) {
    const k = key(it.name);
    if (ownedOf(it.name) > 0 && state.cards[k] && !state.cards[k].notFound) { out.push(it); continue; }
    const base = 'https://api.scryfall.com/cards/named?exact=' + encodeURIComponent(frontFace(it.name));
    let cd = null;
    try { const r = await fetch(base + (it.set ? '&set=' + encodeURIComponent(String(it.set).toLowerCase()) : '')); if (r.ok) cd = await r.json(); } catch (e) {}
    if ((!cd || cd.object !== 'card') && it.set) { try { const r2 = await fetch(base); if (r2.ok) cd = await r2.json(); } catch (e) {} }   // set miss → default printing
    if (cd && cd.object === 'card') { const d = distill(cd); state.cards[key(d.name)] = d; out.push({ ...it, name: d.name }); }
    else out.push(it);
    await sleep(55);   // gentle on Scryfall
  }
  return out;
}
// Match the buy list against a store's public for-sale inventory (their sell list).
// Pulls get_store_profile(slug) → inventory.cards, keeps for-sale (!reserved && qty>0),
// merges dupes by name, and runs buildBuyMatchResult against it.
async function matchBuyAgainstStore(slug) {
  if (!sb || !slug) return;
  buyMatchOpen = true; buyMatchText = ''; buyMatchOf = '';
  buyMatchStoreName = ''; buyMatchStoreLoading = true; buyMatchResult = null;
  setView('buylist'); renderBuyList();
  try {
    const { data, error } = await sb.rpc('get_store_profile', { p_slug: slug });
    if (error || !data) throw error || new Error('no data');
    buyMatchStoreName = data.name || data.store_name || slug;
    const cards = (data.inventory && Array.isArray(data.inventory.cards)) ? data.inventory.cards : [];
    const merged = new Map();
    cards.forEach(c => {
      const name = c && c.name; const qty = Number(c && c.qty) || 0;
      if (!name || c.reserved || c.display || qty <= 0) return;   // skip reserved + Cabinet (display) cards — not for sale
      const k = key(name);
      if (merged.has(k)) merged.get(k).qty += qty; else merged.set(k, { name, qty, set: c.set || '' });
    });
    const haveList = [...merged.values()];
    if (!haveList.length) { buyMatchStoreLoading = false; buyMatchResult = { wants: [], skip: [] }; renderBuyList(); return; }
    // resolve to the store's actual printing (their set) so the gallery shows clean, store-accurate art
    let resolved; try { resolved = await resolveStoreCards(haveList); } catch (e) { resolved = haveList; }
    buyMatchResult = buildBuyMatchResult(resolved);
    buyMatchStoreLoading = false;
    renderBuyList();
  } catch (e) {
    buyMatchStoreLoading = false; buyMatchStoreName = ''; buyMatchResult = null;
    renderBuyList();
    toast(tr('Could not load that store.'));
  }
}
function copyBuyMatchWants() {
  if (!buyMatchResult || !buyMatchResult.wants.length) { toast(tr('Nothing to copy — no matches.')); return; }
  const text = buyMatchResult.wants.map(w => `${Math.min(w.have, w.need)} ${w.name}${w.price ? ` — ${money(w.price)} ea` : ''}`).join('\n');
  copyText(text).then(ok => toast(ok ? tr(buyMatchResult.wants.length === 1 ? 'Copied {n} card you want.' : 'Copied {n} cards you want.', { n: buyMatchResult.wants.length }) : tr('Could not access the clipboard.')));
}
// Quick-buy: I bought everything I wanted off the seller's list — add those
// copies straight to collection, then re-match so the bought cards drop off.
function quickBuyMatches() {
  const r = buyMatchResult;
  if (!r || !r.wants.length) { toast(tr('No matched cards to buy.')); return; }
  const ta = $('#buyMatchInput');
  if (ta && ta.value.trim() !== (buyMatchOf || '').trim()) { toast(tr('The list changed — click “Match against my buy list” again first.')); return; }
  const decks = buyDecksActive();
  pushUndo('quick-buy');
  let cards = 0, copies = 0;
  const remOffer = r.wants.map(w => {
    const need = requiredFor(w.name, decks) - ownedOf(w.name);   // recompute LIVE — ownership may have changed since the match
    const n = Math.max(0, Math.min(w.have, need));
    if (n > 0) { addVariant(w.name, { qty: n }); logEvent('bought', w.name, n, w.price); cards++; copies += n; }   // w.price = price shown at match time
    return { name: w.name, qty: w.have - n };   // seller's stock left after this buy
  });
  if (!copies) dropUndo();   // nothing actually bought — discard the undo point
  // re-derive the offer (depleted by what we bought) so a second click can't re-buy
  const offered = [...remOffer, ...r.skip.map(s => ({ name: s.name, qty: s.have }))].filter(o => o.qty > 0);
  buyMatchResult = buildBuyMatchResult(offered);
  save(); render();
  toast(copies ? tr('Bought {copies} ({cards}) — added to collection.', { copies: tr(copies === 1 ? '{n} copy' : '{n} copies', { n: copies }), cards: tr(cards === 1 ? '{n} card' : '{n} cards', { n: cards }) }) : tr('Nothing to buy.'), { undo: !!copies });
}
function renderBuyMatchResults() {
  const r = buyMatchResult; if (!r) return '';
  const total = r.wants.length + r.skip.length;
  if (!total) return `<div class="sm-summary">${tr('No cards found in that list — paste a Moxfield / Archidekt export (one card per line).')}</div>`;
  const cost = r.wants.reduce((a, w) => a + Math.min(w.have, w.need) * w.price, 0);
  const buyCopies = r.wants.reduce((a, w) => a + Math.min(w.have, w.need), 0);
  const wantRow = w => `<div class="sm-row have"><span class="sm-name nm" data-name="${esc(w.name)}" title="${esc(w.name)}">${esc(w.name)}</span><span class="sm-qty">${tr('they have {a} · {need}', { a: w.have, need: `<b class="sm-have">${tr('you need {n}', { n: w.need })}</b>` })}</span><span class="sm-price">${w.price ? money(w.price) : '—'}</span></div>`;
  const skipRow = s => `<div class="sm-row miss"><span class="sm-name nm" data-name="${esc(s.name)}" title="${esc(s.name)}">${esc(s.name)}</span><span class="sm-qty">${tr('they have {n}', { n: s.have })}</span><span class="sm-x">${tr('don’t need')}</span></div>`;
  const wantTileFn = w => matchTile(w.name, w.need + '×', w.price);
  const skipTileFn = s => matchTile(s.name, '', s.price, true);
  const secList = (arr, rowFn, tileFn) => buyMode === 'art'   // driven by the main Art/List toggle (#buyViewMode)
    ? `<div class="card-table gallery sm-gallery" style="--tile:150px">${arr.map(tileFn).join('')}</div>`
    : `<div class="sm-list">${arr.map(rowFn).join('')}</div>`;
  return `<div class="sm-summary">${tr('You’d buy {x} of the {total} offered · {copies} · {cost}', { x: `<b>${r.wants.length}</b>`, total: `<b>${total}</b>`, copies: tr(buyCopies === 1 ? '{n} copy' : '{n} copies', { n: buyCopies }), cost: `<b>${money(cost)}</b>` })}</div>
    ${r.wants.length ? `<div class="sm-act">
      <button class="btn" id="buyMatchBuy"><i class="ms ms-counter-shield" aria-hidden="true"></i> ${tr('Quick-buy · +{n} to collection', { n: buyCopies })}</button>
      <button class="btn ghost" id="buyMatchCopy">${tr('⧉ Copy what you want')}</button>
    </div>` : ''}
    ${r.wants.length ? `<div class="sm-sec">${tr('You want · {n}', { n: r.wants.length })}</div>${secList(r.wants, wantRow, wantTileFn)}` : `<div class="sm-empty">${tr('Nothing on that list is on your buy list.')}</div>`}
    ${r.skip.length ? `<div class="sm-sec">${tr('Don’t need · {n}', { n: r.skip.length })}</div>${secList(r.skip, skipRow, skipTileFn)}` : ''}`;
}
// "From a store" chips — the stores the user follows; clicking matches the buy
// list against that store's public for-sale inventory. Fetched once and cached.
function buyMatchStoreChips() {
  const list = myStoresCache;
  if (!Array.isArray(list) || !list.length) return '';
  const chips = list.filter(s => s && s.slug).map(s =>
    `<button type="button" class="buy-store-chip" data-buystorematch="${esc(s.slug)}">${esc(s.name || s.slug)}</button>`
  ).join('');
  if (!chips) return '';
  return `<div class="buy-store-row"><span class="buy-store-label"><i class="ms ms-counter-lore" aria-hidden="true"></i> ${tr('From a store')}</span>${chips}</div>`;
}
function buyMatchPanel() {
  // Lazily fetch the user's stores once, then re-render so the chips appear.
  if (sb && myStoresCache === null) {
    myStoresCache = [];   // mark as in-flight so we don't refetch on every render
    sb.rpc('my_stores').then(({ data, error }) => {
      myStoresCache = (!error && Array.isArray(data)) ? data : [];
      if (buyMatchOpen) renderBuyList();
    }).catch(() => { myStoresCache = []; });
  }
  const header = buyMatchStoreName ? `<div class="sm-store-head"><i class="ms ms-counter-lore" aria-hidden="true"></i> ${tr('Matching against {store}', { store: '<b>' + esc(buyMatchStoreName) + '</b>' })}</div>` : '';
  const results = buyMatchStoreLoading
    ? `<div class="sm-loading"><span class="spin"></span><span>${tr('Loading that store’s for-sale cards…')}</span></div>`
    : buyMatchLoading
      ? `<div class="sm-loading"><span class="spin"></span><span>${tr('Looking the list up on Scryfall…')}</span></div>`
      : (buyMatchStoreName && buyMatchResult && !buyMatchResult.wants.length && !buyMatchResult.skip.length)
        ? `<div class="sm-summary">${tr('{store} has no cards for sale right now.', { store: esc(buyMatchStoreName) })}</div>`
        : renderBuyMatchResults();
  return `<div class="sell-match">
    <div class="sm-intro">${tr('Paste a list someone has {forsale} (Moxfield / Archidekt export, or “1 Card Name” per line) — I’ll show which of those cards you still need for your decks & wishlist.', { forsale: '<b>' + tr('for sale') + '</b>' })}</div>
    ${buyMatchStoreChips()}
    <textarea id="buyMatchInput" class="sm-input" placeholder="${tr('Paste a seller’s list — one card per line, e.g.  1 Lightning Bolt')}" spellcheck="false">${esc(buyMatchText)}</textarea>
    <div class="sm-controls">
      <button class="btn" id="buyMatchRun" ${buyMatchLoading ? 'disabled' : ''}><i class="ms ms-ability-investigate" aria-hidden="true"></i> ${tr('Match against my buy list')}</button>
      <button class="btn ghost" id="buyMatchClear">${tr('Clear')}</button>
    </div>
    ${header}
    <div class="sm-results">${results}</div>
  </div>`;
}
function sellCompare(sort) {
  const byName = (a, b) => a.name.localeCompare(b.name);
  const colorKey = r => { const cs = card(r.name).colors || []; if (!cs.length) return COLOR_ORDER.indexOf('C'); if (cs.length > 1) return COLOR_ORDER.length + cs.length; return COLOR_ORDER.indexOf(cs[0]); };
  switch (sort) {
    case 'name':        return byName;
    case 'price-asc':   return (a, b) => a.sub - b.sub || byName(a, b);
    case 'rarity-desc': return (a, b) => rarityRank(b.name) - rarityRank(a.name) || byName(a, b);
    case 'rarity-asc':  return (a, b) => rarityRank(a.name) - rarityRank(b.name) || byName(a, b);
    case 'color':       return (a, b) => colorKey(a) - colorKey(b) || byName(a, b);
    case 'type':        return (a, b) => CAT_ORDER.indexOf(category(a.name)) - CAT_ORDER.indexOf(category(b.name)) || byName(a, b);
    case 'set':         return (a, b) => (a.v.set || card(a.name).set || '￿').localeCompare(b.v.set || card(b.name).set || '￿') || byName(a, b);
    default:            return (a, b) => b.sub - a.sub || byName(a, b);   // price-desc
  }
}
// "Mark sold" — remove the listed copies from collection and clear the entry.
function markSold(vid) {
  const hit = variantIndex().get(vid);
  if (!hit) { removeVariantFromAllSellLists(vid); save(); render(); return; }
  const qty = Math.min(sellQtyOf(vid), hit.v.qty);
  pushUndo(tr('sale of {n}× {name}', { n: qty, name: hit.name }));
  logEvent('sold', hit.name, qty, variantPrice(hit.name, hit.v), { foil: hit.v.foil });
  hit.v.qty -= qty;
  removeVariantFromAllSellLists(vid);
  if (hit.v.qty <= 0) removeVariant(hit.name, vid); else save();
  render();
  toast(tr('Sold {n}× {name} — removed from collection.', { n: qty, name: hit.name + (hit.v.foil ? ' (foil)' : '') }), { undo: true });
}
function markAllSold() {
  const rows = sellRows();
  if (!rows.length) return;
  const copies = rows.reduce((a, r) => a + r.qty, 0);
  if (!confirm(tr(copies === 1 ? 'Mark all {n} listed copy in “{list}” as sold? They will be removed from your collection.' : 'Mark all {n} listed copies in “{list}” as sold? They will be removed from your collection.', { n: copies, list: sellListName() }))) return;
  pushUndo(tr('“Sold all” of {copies}', { copies: tr(copies === 1 ? '{n} copy' : '{n} copies', { n: copies }) }));
  rows.forEach(r => {
    const v = variantById(r.name, r.vid);
    if (v) { logEvent('sold', r.name, r.qty, r.unit, { foil: v.foil }); v.qty -= r.qty; if (v.qty <= 0) removeVariant(r.name, r.vid); }
    removeVariantFromAllSellLists(r.vid);
  });
  save(); render();
  toast(tr(copies === 1 ? 'Marked {n} card as sold.' : 'Marked {n} cards as sold.', { n: copies }), { undo: true });
}

function variantBadges(v) {
  return [
    v.foil ? `<span class="vbadge foil">${FOIL_SPARK} Foil</span>` : '',
    (v.condition && v.condition !== 'NM') ? `<span class="vbadge cond"><i class="ms ${COND_ICON[v.condition] || 'ms-counter-shield'}" aria-hidden="true"></i> ${esc(v.condition)}</span>` : '',
    v.set ? `<span class="vbadge set"><i class="ms ms-fw ms-multiple" aria-hidden="true"></i> ${esc(v.set)}${v.collector ? ' ' + esc(v.collector) : ''}</span>` : ''
  ].join('');
}
function renderSellList() {
  pruneSellList();
  renderSellFolders();
  const matchBtn = $('#sellMatchBtn'); if (matchBtn) matchBtn.classList.toggle('on', sellMatchOpen);
  if (sellMatchOpen) {
    if ($('#sellListSub')) $('#sellListSub').textContent = tr('Paste a wants-list to see which cards you own.');
    const wrap = $('#sellSizeWrap'); if (wrap) wrap.hidden = true;
    const t = $('#sellTable'); if (t) { t.classList.remove('gallery'); t.innerHTML = sellMatchPanel(); }
    return;
  }
  let rows = sellRows();
  const q = sellSearch.trim().toLowerCase();
  const ss = $('#sellSearch'); if (ss && ss.value !== sellSearch) ss.value = sellSearch;
  if (q) rows = rows.filter(r => r.name.toLowerCase().includes(q));
  rows.sort(sellCompare(sellSort));
  const copies = rows.reduce((a, r) => a + r.qty, 0);
  const total = rows.reduce((a, r) => a + r.sub, 0);
  const sub = $('#sellListSub');
  if (sub) sub.textContent = rows.length
    ? tr('“{list}” · {copies} of {cards} · {total} at market', { list: sellListName(), copies: tr(copies === 1 ? '{n} copy' : '{n} copies', { n: copies }), cards: tr(rows.length === 1 ? '{n} card' : '{n} cards', { n: rows.length }), total: money(total) }) + (q ? ' · ' + tr('matching “{q}”', { q: sellSearch.trim() }) : '')
    : (q ? tr('No cards in “{list}” match “{q}”.', { list: sellListName(), q: sellSearch.trim() }) : tr('“{list}” is empty.', { list: sellListName() }));
  const table = $('#sellTable');
  if (!table) return;
  table.classList.toggle('gallery', sellMode === 'art');
  table.style.setProperty('--tile', sellTile + 'px');
  const wrap = $('#sellSizeWrap');
  if (wrap) { wrap.hidden = sellMode !== 'art'; const r = $('#sellSizeRange'); if (r) r.value = sellTile; }
  if (!rows.length) {
    table.innerHTML = q
      ? `<div class="empty-state"><span class="empty-mark"><i class="ms ms-ability-investigate" aria-hidden="true"></i></span><h2>${tr('No matches')}</h2><p>${tr('No cards in “{list}” match “{q}”.', { list: esc(sellListName()), q: esc(sellSearch.trim()) })}</p></div>`
      : `<div class="empty-state"><span class="empty-mark"><i class="ms ms-counter-gold" aria-hidden="true"></i></span><h2>${tr('Nothing listed for sale')}</h2><p>${tr('List cards from your Collection (each card has a “Sell” button), or add everything you’re not using in a deck.')}</p><button class="btn" data-selladd><i class="ms ms-land btn-ico" aria-hidden="true"></i> ${tr('Add all unlinked cards')}</button></div>`;
    return;
  }
  if (sellMode === 'art') {
    table.innerHTML = rows.map(sellArtTile).join('');
  } else {
    const grouping = sellSort === 'color' || sellSort === 'type';
    let last = null;
    table.innerHTML = rows.map(r => {
      let head = '';
      if (grouping) { const g = sellSort === 'color' ? colorGroupLabel(r.name) : category(r.name); if (g !== last) { head = `<div class="buy-group-head">${esc(tr(g))}</div>`; last = g; } }
      return head + sellRow(r);
    }).join('');
  }
}
function sellRow(r) {
  const { vid, name, v, qty, unit, sub, used } = r;
  const meta = card(name);
  const warn = used.length ? `<span class="sell-warn" title="${tr('Still in {decks}', { decks: esc(used.map(d => d.name).join(', ')) })}"><i class="ms ms-saga" aria-hidden="true"></i> ${tr('in')} ${esc(used.map(d => d.name).join(', '))}</span>` : '';
  return `<div class="card-row owned sell-row">
    <div class="cname"><span class="row-marks">${typeIcon(name)}${rarityIcon(meta.rarity)}</span><span class="nm" data-name="${esc(name)}" data-uri="${esc(meta.uri || '')}" title="${esc(name)}">${esc(name)}</span>${manaSymbols(meta.mana_cost)}${variantBadges(v)}${warn}</div>
    <div class="own-step sell-step">
      <button data-sellqty="-1" data-vid="${esc(vid)}" aria-label="${tr('List one fewer')}">−</button>
      <span class="n">${qty}<span class="req">/${v.qty}</span></span>
      <button data-sellqty="1" data-vid="${esc(vid)}" ${qty >= v.qty ? 'disabled' : ''} aria-label="${tr('List one more')}">+</button>
    </div>
    <div class="price"><span class="sell-each">${tr('{price} ea', { price: money(unit) })}</span><br><span class="sell-sub">${money(sub)}</span></div>
    <button class="sell-sold" data-sold="${esc(vid)}" title="${tr('Mark sold & remove from collection')}"><i class="ms ms-counter-gold" aria-hidden="true"></i> ${tr('Sold')}</button>
    <button class="sell-rm" data-sellrm="${esc(vid)}" title="${tr('Remove from sell list')}" aria-label="${tr('Remove from sell list')}">✕</button>
  </div>`;
}
function sellArtTile(r) {
  const { vid, name, v, qty, sub } = r;
  const foilTag = v.foil ? `<span class="art-foil" title="Foil">${FOIL_SPARK}</span>` : '';
  return `<div class="art-tile sell">
    <button class="art-open" data-name="${esc(name)}">
      ${artTile(name, qty + '×', `<span class="art-val">${money(sub)}</span>`, foilTag)}
    </button>
    <div class="sell-tile-bar">
      <div class="own-step sell-step">
        <button data-sellqty="-1" data-vid="${esc(vid)}" aria-label="${tr('List one fewer')}">−</button>
        <span class="n">${qty}<span class="req">/${v.qty}</span></span>
        <button data-sellqty="1" data-vid="${esc(vid)}" ${qty >= v.qty ? 'disabled' : ''} aria-label="${tr('List one more')}">+</button>
      </div>
      <button class="sell-sold" data-sold="${esc(vid)}" title="${tr('Mark sold & remove from collection')}"><i class="ms ms-counter-gold" aria-hidden="true"></i></button>
      <button class="sell-rm" data-sellrm="${esc(vid)}" title="${tr('Remove from sell list')}" aria-label="${tr('Remove')}">✕</button>
    </div>
  </div>`;
}

function sellExportRows() { const rows = sellRows(); rows.sort(sellCompare(sellSort)); return rows; }
function sellListText() {
  return sellExportRows().map(r => {
    const v = r.v;
    const tags = [v.set ? v.set + (v.collector ? ' ' + v.collector : '') : '', v.foil ? 'Foil' : '', (v.condition && v.condition !== 'NM') ? v.condition : ''].filter(Boolean).join(', ');
    return `${r.qty} ${r.name}${tags ? ` [${tags}]` : ''} — ${money(r.unit)} ea`;
  }).join('\n');
}
async function copySellList() {
  const text = sellListText();
  if (!text) { toast(tr('“{list}” is empty.', { list: sellListName() })); return; }
  const n = text.split('\n').length;
  toast(await copyText(text) ? tr(n === 1 ? '“{list}” copied — {n} card ready to send.' : '“{list}” copied — {n} cards ready to send.', { list: sellListName(), n }) : tr('Could not access the clipboard.'));
}
async function exportSellPDF() {
  const rows = sellExportRows();
  if (!rows.length) { toast(tr('“{list}” is empty.', { list: sellListName() })); return; }
  const total = rows.reduce((a, r) => a + r.sub, 0);
  const copies = rows.reduce((a, r) => a + r.qty, 0);
  const date = new Date().toLocaleDateString(I18N.locale(), { year: 'numeric', month: 'long', day: 'numeric' });
  const cell = (r) => {
    const img = displayImage(r.name);
    const tags = [r.v.foil ? 'Foil' : '', (r.v.condition && r.v.condition !== 'NM') ? r.v.condition : ''].filter(Boolean).join(' · ');
    const setLine = [r.v.set ? esc(r.v.set) + (r.v.collector ? ' ' + esc(r.v.collector) : '') : '', tags ? esc(tags) : ''].filter(Boolean).join(' · ');
    return `<div class="print-card">
      <div class="pc-art">${img ? `<img src="${esc(img)}" alt="" />` : `<div class="pc-art-fallback">❖</div>`}<span class="pc-qty">${r.qty}×</span></div>
      <div class="pc-info">
        <div class="pc-name">${esc(r.name)}</div>
        ${setLine ? `<div class="pc-set">${setLine}</div>` : ''}
        <div class="pc-price"><span class="pc-each">${tr('{price} ea', { price: money(r.unit) })}</span><span class="pc-sub">${money(r.sub)}</span></div>
      </div>
    </div>`;
  };
  const pages = [];
  for (let i = 0; i < rows.length; i += 8) pages.push(rows.slice(i, i + 8));
  const html = pages.map((pg, i) => `<section class="print-page">
    ${i === 0 ? `<header class="print-head"><h1>${tr('Sell List')} — ${esc(sellListName())}</h1><div class="print-meta">${tr(copies === 1 ? '{n} card' : '{n} cards', { n: copies })} · ${money(total)} · ${esc(date)}</div></header>` : ''}
    <div class="print-grid">${pg.map(cell).join('')}</div>
  </section>`).join('');
  const root = $('#printRoot');
  root.innerHTML = html;
  const imgs = [...root.querySelectorAll('img')];
  await Promise.all(imgs.map(img => img.complete ? Promise.resolve() : new Promise(res => { img.onload = img.onerror = res; })));
  window.print();
}

async function copyCollection() {
  const text = collectionText();
  if (!text) { toast(tr('Your collection is empty — nothing to copy.')); return; }
  const lines = text.split('\n').length;
  toast(await copyText(text)
    ? tr(lines === 1 ? 'Collection copied — {n} card.' : 'Collection copied — {n} cards.', { n: lines })
    : tr('Could not access the clipboard.'));
}

/* ---------- toast ---------- */
let toastTimer, lastToastMsg = null, lastToastAt = 0;
function toast(msg, opts = {}) {
  if (msg == null || msg === '') return;                                                    // never show a blank notification
  const now = Date.now();
  if (!opts.undo && msg === lastToastMsg && now - lastToastAt < 4000) { lastToastAt = now; return; }   // suppress a repeating identical toast so a stray loop can't keep one pinned on screen
  lastToastMsg = msg; lastToastAt = now;
  const t = $('#toast');
  if (opts.undo && undoStack.length) {
    t.innerHTML = `<span class="toast-msg"></span><button class="toast-undo" id="toastUndo">${tr('↶ Undo')}</button>`;
    t.querySelector('.toast-msg').textContent = msg;
  } else {
    t.textContent = msg;
  }
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, opts.undo ? 7000 : 3200);
}

/* =====================================================================
   EVENTS
   ===================================================================== */
$('#tabs').addEventListener('click', e => {
  const grp = e.target.closest('[data-navgroup]');
  if (grp) {   // the Buy/Sell dropdown tab — toggle its menu
    e.stopPropagation();
    const g = $('#buysellGroup'); g.classList.toggle('open');
    grp.setAttribute('aria-expanded', g.classList.contains('open') ? 'true' : 'false');
    $('#settingsGroup') && $('#settingsGroup').classList.remove('open');
    return;
  }
  const item = e.target.closest('[data-view]');   // a real tab OR a Buy/Sell menu item
  if (!item) return;
  currentDeckId = null;
  if (invFacet) { invFacet = null; renderInventory(); }
  $('#buysellGroup') && $('#buysellGroup').classList.remove('open');
  setView(item.dataset.view);
});
const settingsBtnEl = $('#settingsBtn');
if (settingsBtnEl) settingsBtnEl.addEventListener('click', e => {
  e.stopPropagation();
  const g = $('#settingsGroup'); g.classList.toggle('open');
  settingsBtnEl.setAttribute('aria-expanded', g.classList.contains('open') ? 'true' : 'false');
  $('#buysellGroup') && $('#buysellGroup').classList.remove('open');
});
const settingsMenuEl = $('#settingsMenu'); if (settingsMenuEl) settingsMenuEl.addEventListener('click', e => e.stopPropagation());   // stay open while adjusting settings
document.addEventListener('click', () => {   // any outside click closes the dropdowns
  $('#buysellGroup') && $('#buysellGroup').classList.remove('open');
  $('#settingsGroup') && $('#settingsGroup').classList.remove('open');
});
// hover-intent for the Buy/Sell dropdown: open on enter, close after a grace delay
let buysellCloseTimer = null;
const buysellGroupEl = $('#buysellGroup');
if (buysellGroupEl) {
  buysellGroupEl.addEventListener('mouseenter', () => { clearTimeout(buysellCloseTimer); buysellGroupEl.classList.add('open'); });
  buysellGroupEl.addEventListener('mouseleave', () => { clearTimeout(buysellCloseTimer); buysellCloseTimer = setTimeout(() => buysellGroupEl.classList.remove('open'), 280); });
}
const histFilterEl = $('#histFilter');
if (histFilterEl) histFilterEl.addEventListener('click', e => {
  const b = e.target.closest('.seg-btn'); if (!b) return;
  histFilter = b.dataset.hfilter; renderHistory();
});
const histClearBtn = $('#histClearBtn'); if (histClearBtn) histClearBtn.addEventListener('click', clearHistory);
const undoBtnEl = $('#undoBtn'); if (undoBtnEl) undoBtnEl.addEventListener('click', undo);
const toastEl = $('#toast'); if (toastEl) toastEl.addEventListener('click', e => { if (e.target.closest('#toastUndo')) { toastEl.hidden = true; undo(); } });
// (New Deck creation now lives on the "+ New deck" tile in the Decks view — see the #deckGrid [data-newdeck] handler.)
$('#emptyImportBtn').addEventListener('click', openImport);
const emptyBrowseDecksEl = $('#emptyBrowseDecks'); if (emptyBrowseDecksEl) emptyBrowseDecksEl.addEventListener('click', () => { setView('browse'); setBrowseMode('decks'); });
$('#closeImport').addEventListener('click', closeImport);
$('#confirmImport').addEventListener('click', importDeck);
const scratchDeckBtn = $('#scratchDeckBtn'); if (scratchDeckBtn) scratchDeckBtn.addEventListener('click', createEmptyDeck);
$('#importModal').addEventListener('click', e => { if (e.target.id === 'importModal') closeImport(); });
$('#backToDecks').addEventListener('click', () => { currentDeckId = null; setView('decks'); });
$('#addCardsBtn').addEventListener('click', openAdd);
$('#copyCollectionBtn').addEventListener('click', copyCollection);
$('#closeAdd').addEventListener('click', closeAdd);
$('#confirmAdd').addEventListener('click', addLooseCards);
$('#addAutocomplete').addEventListener('input', e => {
  const q = e.target.value.trim();
  if (q.length < 2) { hideACMenu(); return; }
  acDebounced(q);
});
$('#addAutocomplete').addEventListener('keydown', e => {
  if (e.key === 'ArrowDown') { e.preventDefault(); setACActive(acActive + 1); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); setACActive(acActive - 1); }
  else if (e.key === 'Enter') {
    const pick = acActive >= 0 ? acItems[acActive] : acItems[0];
    if (pick) { e.preventDefault(); addTagByName(pick); }
  } else if (e.key === 'Escape') { hideACMenu(); }
  else if (e.key === 'Backspace' && !e.target.value && addTags.length) { addTags.pop(); renderAddTags(); }
});
$('#addAutocomplete').addEventListener('blur', () => setTimeout(hideACMenu, 120));
// mousedown (not click) so selection beats the input's blur
$('#acMenu').addEventListener('mousedown', e => {
  const it = e.target.closest('.ac-item');
  if (it) { e.preventDefault(); addTagByName(acItems[+it.dataset.acidx]); }
});
$('#addTagList').addEventListener('click', e => {
  const tagEl = e.target.closest('.add-tag'); if (!tagEl) return;
  const i = +tagEl.dataset.tagidx, t = addTags[i]; if (!t) return;
  if (e.target.closest('[data-tagremove]')) { addTags.splice(i, 1); renderAddTags(); return; }
  if (e.target.closest('[data-tagfoil]')) { t.foil = !t.foil; renderAddTags(); return; }
  const step = e.target.closest('[data-tagstep]');
  if (step) { t.qty = Math.max(1, t.qty + (+step.dataset.tagstep)); renderAddTags(); }
});
$('#csvBtn').addEventListener('click', () => $('#csvInput').click());
$('#csvInput').addEventListener('change', e => { if (e.target.files[0]) importCSV(e.target.files[0]); e.target.value = ''; });
$('#addModal').addEventListener('click', e => { if (e.target.id === 'addModal') closeAdd(); });
$('#closeCard').addEventListener('click', closeCardView);
$('#cardModal').addEventListener('click', e => { if (e.target.id === 'cardModal') closeCardView(); });
$('#cardViewMeta').addEventListener('input', e => {
  if (e.target.id === 'cvArtSearch') renderPrintings(cardViewName, e.target.value.trim());
});
$('#cardViewMeta').addEventListener('click', e => {
  if (e.target.closest('[data-cvbought]')) { cvBought(cardViewName); return; }
  if (e.target.closest('[data-cvsold]')) { cvSold(cardViewName); return; }
  if (e.target.closest('[data-cvwish]')) { cvWishToggle(cardViewName); return; }
  const cvSellBtn = e.target.closest('[data-cvsell]');
  if (cvSellBtn) { openSellPicker({ name: cardViewName, vid: null }, cvSellBtn); return; }
  const editBtn = e.target.closest('#cvEditBtn');
  if (editBtn) {
    const box = $('#cvVariants');
    if (box.hidden) { box.innerHTML = cardVariantsEditor(cardViewName); box.hidden = false; editBtn.classList.add('on'); }
    else { box.hidden = true; editBtn.classList.remove('on'); }
    return;
  }
  const artBtn = e.target.closest('#cvArtBtn');
  if (artBtn) { revealPrintings(cardViewName); return; }
  const copyPrintBtn = e.target.closest('.ve-print');
  if (copyPrintBtn) { revealCopyPrintings(copyPrintBtn.dataset.name, copyPrintBtn.dataset.vprint, copyPrintBtn); return; }
  const copyPick = e.target.closest('.cvv-art');
  if (copyPick) { pickCopyPrinting(copyPick.dataset.name, copyPick.dataset.vid, +copyPick.dataset.vpick); return; }
  const artPick = e.target.closest('.cv-art');
  if (artPick) { pickPrinting(cardViewName, +artPick.dataset.printidx); return; }
  const assignTog = e.target.closest('[data-assigndeck]');
  if (assignTog) { toggleCardInDeck(assignTog.dataset.name, assignTog.dataset.assigndeck); return; }
  const assignStep = e.target.closest('[data-assignqty]');
  if (assignStep) {
    const deck = state.decks.find(d => d.id === assignStep.dataset.deck);
    if (deck) setCardInDeck(assignStep.dataset.name, deck.id, deckQtyOf(assignStep.dataset.name, deck) + (+assignStep.dataset.assignqty));
    return;
  }
  const swapBtn = e.target.closest('#cvSwapBtn');
  if (swapBtn) { revealSwaps(cardViewName, swapBtn); return; }
  const chip = e.target.closest('.cv-swap-chip');
  if (chip) openCardView(chip.dataset.swap);
});
const priceSrcEl = $('#priceSrc');
if (priceSrcEl) priceSrcEl.addEventListener('click', e => {
  if (e.target.closest('#ckRefresh')) { refreshCKPrices(); return; }
  const opt = e.target.closest('[data-pricesrc]');
  if (opt) setPriceSource(opt.dataset.pricesrc);
});
$('#exportBtn').addEventListener('click', exportBackup);
$('#importFileBtn').addEventListener('click', () => $('#restoreInput').click());
$('#restoreInput').addEventListener('change', e => { if (e.target.files[0]) restoreBackup(e.target.files[0]); e.target.value = ''; });

/* ---------- store profiles ---------- */
const genInviteBtn = $('#genStoreInvite'); if (genInviteBtn) genInviteBtn.addEventListener('click', () => { const g = $('#settingsGroup'); if (g) g.classList.remove('open'); generateStoreInvite(); });
const myStoreNavBtn = $('#myStoreBtn'); if (myStoreNavBtn) myStoreNavBtn.addEventListener('click', () => { const g = $('#settingsGroup'); if (g) g.classList.remove('open'); setView('store'); render(); });
const storeDash = $('#storeDashboard');
if (storeDash) {
  storeDash.addEventListener('input', e => {
    if (!myStore) return;
    const f = e.target.closest('[data-storefield]');
    if (f) { myStore[f.dataset.storefield] = f.value; scheduleStoreSave(); return; }
    const s = e.target.closest('[data-social]');
    if (s) { myStore.socials = myStore.socials || {}; myStore.socials[s.dataset.social] = s.value.trim(); scheduleStoreSave(); return; }
    if (e.target.id === 'invSearchInput') { storeInvQuery = e.target.value; storeInvShown = 80; renderStoreInventory(); return; }
  });
  storeDash.addEventListener('change', e => {
    if (!myStore) return;
    const hr = e.target.closest('[data-hours]');
    if (hr) {
      myStore.hours = myStore.hours || {};
      const d = hr.dataset.hours, bound = hr.dataset.bound;
      myStore.hours[d] = myStore.hours[d] || {};
      if (bound === 'closed') {
        if (e.target.checked) { myStore.hours[d].open = ''; myStore.hours[d].close = ''; }
        else if (!myStore.hours[d].open && !myStore.hours[d].close) { myStore.hours[d].open = '12:00'; myStore.hours[d].close = '20:00'; }   // opening a day → sensible default so it's never left half-set
        renderStoreDashboard();   // re-render to enable/disable the selects for this day
      } else {
        myStore.hours[d][bound] = e.target.value;
      }
      scheduleStoreSave();
      return;
    }
    const selBox = e.target.closest('[data-invselect]'); if (selBox) { toggleInvSel(selBox.dataset.invselect, selBox); return; }
    if (e.target.id === 'invSelAll') { selectAllShown(e.target.checked); return; }
    const mv = e.target.closest('[data-invmove]'); if (mv) { moveInvCard(mv.dataset.invmove, mv.dataset.invb, e.target.value); return; }
    if (e.target.id === 'storeShowOwner') { myStore.show_owner = e.target.checked; scheduleStoreSave(); schedulePublicProfileRefresh(); return; }
  });
  storeDash.addEventListener('click', e => {
    if (e.target.closest('#storeCopyLink')) { copyText(storePublicUrl(myStore.slug)).then(ok => toast(ok ? tr('Store link copied ✓') : tr('Copy failed'))); return; }
    if (e.target.closest('#storeCopyMon')) {
      myStore.hours = myStore.hours || {};
      const mon = myStore.hours.mon || {};
      STORE_DAYS.forEach(([k]) => { if (k !== 'mon') myStore.hours[k] = { open: mon.open || '', close: mon.close || '' }; });
      scheduleStoreSave(); renderStoreDashboard();
      toast(tr('Copied Monday’s hours to every day.'));
      return;
    }
    if (e.target.closest('#storeAddEvent')) { openStoreEvent(null); return; }
    if (e.target.closest('#storeGenStaff')) { generateStoreStaffInvite(); return; }
    if (e.target.closest('#staffInviteCopy')) { const i = $('#staffInviteLink'); if (i) copyText(i.value).then(ok => toast(ok ? tr('Staff link copied ✓') : tr('Copy failed'))); return; }
    if (e.target.closest('#staffInviteQr')) { const i = $('#staffInviteLink'); if (i) downloadQrPng(i.value, 'staff-invite'); return; }
    let sm; if ((sm = e.target.closest('[data-staffrm]'))) { removeStoreMember(sm.dataset.staffrm); return; }
    if (e.target.closest('#invAddCards')) { openAdd('store'); return; }
    if (e.target.closest('#invRefreshPrices')) { refreshStorePrices(); return; }
    if (e.target.closest('#invBulkMove')) { const s2 = $('#invBulkBinder'); bulkMoveToBinder(s2 ? s2.value : ''); return; }
    if (e.target.closest('#invBulkReserve')) { bulkSetReserved(true); return; }
    if (e.target.closest('#invBulkDisplay')) { bulkSetDisplay(true); return; }
    if (e.target.closest('#invBulkForsale')) { bulkSetReserved(false); bulkSetDisplay(false); return; }
    if (e.target.closest('#invBulkSell')) { bulkSell(); return; }
    if (e.target.closest('#invBulkRemove')) { bulkRemoveInv(); return; }
    if (e.target.closest('#invBulkClear')) { clearInvSelection(); return; }
    let m;
    if ((m = e.target.closest('[data-imode]'))) { storeInvMode = m.dataset.imode; $$('#storeInvMode .seg-btn').forEach(b => b.classList.toggle('is-active', b === m)); renderStoreInventory(); return; }
    if ((m = e.target.closest('[data-invbinder]'))) { storeInvBinder = m.dataset.invbinder; storeInvShown = 80; renderStoreInvBinders(); renderStoreInventory(); return; }
    if (e.target.closest('[data-invbindernew]')) { const nm = prompt(tr('Name this binder (e.g. Commander singles, Sealed, New arrivals):'), ''); if (nm) addInvBinder(nm); return; }
    if ((m = e.target.closest('[data-invbinderrename]'))) { const b = storeInv().binders.find(x => x.id === m.dataset.invbinderrename); const nm = prompt(tr('Rename binder:'), b ? b.name : ''); if (nm != null) renameInvBinder(m.dataset.invbinderrename, nm); return; }
    if ((m = e.target.closest('[data-invbinderdel]'))) { if (confirm(tr('Delete this binder? Its cards move to Unfiled (they stay in your inventory).'))) deleteInvBinder(m.dataset.invbinderdel); return; }
    if ((m = e.target.closest('[data-invsell]'))) { sellInvCopy(m.dataset.invsell, m.dataset.invb); return; }
    if ((m = e.target.closest('[data-invbuy]'))) { restockInvCopy(m.dataset.invbuy, m.dataset.invb); return; }
    if ((m = e.target.closest('[data-invres]'))) { toggleInvReserved(m.dataset.invres, m.dataset.invb); return; }
    if ((m = e.target.closest('[data-invdisplay]'))) { toggleInvDisplay(m.dataset.invdisplay, m.dataset.invb); return; }
    if ((m = e.target.closest('[data-invrm]'))) { removeInvCard(m.dataset.invrm, m.dataset.invb); return; }
    if ((m = e.target.closest('[data-evedit]'))) { openStoreEvent(m.dataset.evedit); return; }
    if ((m = e.target.closest('[data-evdel]'))) { deleteStoreEvent(m.dataset.evdel); return; }
    if ((m = e.target.closest('[data-evmanage]'))) { const id = m.dataset.evmanage; if (manageEventId === id) { manageEventId = null; renderStoreEventList(); } else { manageEventId = id; loadEventRegs(id); } return; }
    if ((m = e.target.closest('[data-evmode]'))) { eventResultsMode = m.dataset.evmode; renderStoreEventList(); return; }
    if (e.target.closest('#evWalkinAdd')) { addEventWalkin(); return; }
    if ((m = e.target.closest('[data-evsaveresults]'))) { saveEventResults(m.dataset.evsaveresults); return; }
  });
  storeDash.addEventListener('change', e => {
    let m;
    if ((m = e.target.closest('[data-evplace]'))) { eventResultEdits[m.dataset.evplace] = Number(e.target.value) || 0; const row = e.target.closest('.ev-reg-row'); const medal = row && row.querySelector('.ev-reg-medal'); if (medal) medal.textContent = placementMedal(eventResultEdits[m.dataset.evplace]); return; }
    if ((m = e.target.closest('[data-evwin]'))) { eventResultEdits[m.dataset.evwin] = e.target.checked ? 1 : 0; const row = e.target.closest('.ev-reg-row'); const medal = row && row.querySelector('.ev-reg-medal'); if (medal) medal.textContent = placementMedal(eventResultEdits[m.dataset.evwin]); return; }
  });
  storeDash.addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target.id === 'evWalkinInput') { e.preventDefault(); addEventWalkin(); }
  });
}
const closeStoreInviteEl = $('#closeStoreInvite'); if (closeStoreInviteEl) closeStoreInviteEl.addEventListener('click', closeStoreInvite);
const storeInviteModalEl = $('#storeInviteModal');
if (storeInviteModalEl) storeInviteModalEl.addEventListener('click', e => {
  if (e.target.id === 'storeInviteModal') { closeStoreInvite(); return; }
  if (e.target.closest('#storeInviteCopy')) { const i = $('#storeInviteLink'); if (i) copyText(i.value).then(ok => toast(ok ? tr('Invite link copied ✓') : tr('Copy failed'))); return; }
  if (e.target.closest('#storeInviteQr')) { downloadQrPng(storeInviteResult, 'store-invite'); return; }
});
const closeStoreCreateEl = $('#closeStoreCreate'); if (closeStoreCreateEl) closeStoreCreateEl.addEventListener('click', closeStoreCreate);
const storeCreateModalEl = $('#storeCreateModal');
if (storeCreateModalEl) storeCreateModalEl.addEventListener('click', e => {
  if (e.target.id === 'storeCreateModal') { closeStoreCreate(); return; }
  if (e.target.closest('#scCreate')) { doRedeemStore(); return; }
});
const closeStoreEventEl = $('#closeStoreEvent'); if (closeStoreEventEl) closeStoreEventEl.addEventListener('click', closeStoreEvent);
const storeEventModalEl = $('#storeEventModal');
if (storeEventModalEl) storeEventModalEl.addEventListener('click', e => {
  if (e.target.id === 'storeEventModal') { closeStoreEvent(); return; }
  if (e.target.closest('#evSave')) { saveStoreEventFromModal(); return; }
});
const closeFriendMatchEl = $('#closeFriendMatch'); if (closeFriendMatchEl) closeFriendMatchEl.addEventListener('click', closeFriendMatch);
const friendMatchModalEl = $('#friendMatchModal');
if (friendMatchModalEl) friendMatchModalEl.addEventListener('click', e => { if (e.target.id === 'friendMatchModal') closeFriendMatch(); });

$('#deckGrid').addEventListener('click', e => {
  if (e.target.closest('[data-newdeck]')) { openImport(); return; }
  const c = e.target.closest('.deck-card');
  if (c) openDeck(c.dataset.deck);
});

// All deck-detail delegation in one place (rename, view toggle, legality). .nm/.lg-card fall through to the global handler.
$('#deckDetail').addEventListener('click', e => {
  const recheck = e.target.closest('[data-lgrecheck]');
  if (recheck) { recheckDeckLegality(recheck.dataset.lgrecheck); return; }
  const rename = e.target.closest('[data-rename-deck]');
  if (rename) { startRenameDeck(rename.dataset.renameDeck); return; }
  const seg = e.target.closest('#deckViewMode .seg-btn');
  if (seg) { deckView = seg.dataset.mode; state.prefs.deckView = deckView; save(); renderDeckDetail(); return; }
  const cf = e.target.closest('#deckCardFilter .seg-btn');
  if (cf) { deckCardFilter = cf.dataset.cardfilter; renderDeckDetail(); return; }
  const lgt = e.target.closest('[data-lgtoggle]');
  if (lgt) { state.prefs.showLegality = !state.prefs.showLegality; save(); renderDeckDetail(); return; }
  const deckShareBtn = e.target.closest('[data-deckshare]');
  if (deckShareBtn) { openDeckShare(currentDeckId); return; }
  const editToggle = e.target.closest('[data-deckedit]');
  if (editToggle) { deckEdit = !deckEdit; deckHideAc(); renderDeckDetail(); return; }
  const origToggle = e.target.closest('[data-origtoggle]');
  if (origToggle) { deckShowOriginal = !deckShowOriginal; renderDeckDetail(); return; }
  const optimize = e.target.closest('[data-deckoptimize]');
  if (optimize) { optimizeDeck(optimize); return; }
  const origCopy = e.target.closest('[data-origcopy]');
  if (origCopy) { copyDeckOriginal(origCopy.dataset.origcopy); return; }
  const origRebase = e.target.closest('[data-origrebaseline]');
  if (origRebase) { rebaselineDeck(origRebase.dataset.origrebaseline); return; }
  const origRestore = e.target.closest('[data-origrestore]');
  if (origRestore) { restoreDeckOriginal(origRestore.dataset.origrestore); return; }
  const dq = e.target.closest('[data-deckqty]');
  if (dq) { setDeckQty(dq.dataset.name, parseInt(dq.dataset.deckqty, 10)); return; }
  const dr = e.target.closest('[data-deckremove]');
  if (dr) { e.stopPropagation(); removeCardFromDeck(dr.dataset.deckremove); return; }
  const dac = e.target.closest('[data-deckac]');
  if (dac) { addCardToDeck(deckAcItems[+dac.dataset.deckac]); return; }
  const chip = e.target.closest('.lg-chip');
  if (chip) {
    const fmt = chip.dataset.lgfmt;
    const panel = $(`.lg-panel[data-lgpanel="${fmt}"]`, $('#deckDetail'));
    if (!panel) return;
    const open = panel.hidden;
    $$('#deckDetail .lg-panel').forEach(p => p.hidden = true);
    $$('#deckDetail .lg-chip').forEach(c => c.setAttribute('aria-expanded', 'false'));
    panel.hidden = !open;
    chip.setAttribute('aria-expanded', String(open));
  }
});
// stacks-view card-size slider (lives in the deck hero, re-rendered each renderDeckDetail)
$('#deckDetail').addEventListener('input', e => {
  const r = e.target.closest('#deckSizeRange');
  if (r) {
    deckTile = clampTile(r.value);
    const stacks = $('.deck-stacks'); if (stacks) stacks.style.setProperty('--stack-w', deckTile + 'px');
    const grid = $('.deck-typeview'); if (grid) grid.style.setProperty('--tile', deckTile + 'px');
    state.prefs.deckTile = deckTile; save();
    return;
  }
  const add = e.target.closest('#deckAddInput');
  if (add) {
    const q = add.value.trim();
    if (q.length < 2) { deckHideAc(); return; }
    deckAcDebounced(q);
  }
});
$('#deckDetail').addEventListener('keydown', e => {
  if (!e.target.closest('#deckAddInput')) return;
  if (e.key === 'Enter') { e.preventDefault(); const pick = deckAcItems[0] || e.target.value.trim(); if (pick) addCardToDeck(pick); }
  else if (e.key === 'Escape') { deckHideAc(); }
});
$('#deckDetail').addEventListener('focusout', e => { if (e.target.closest('#deckAddInput')) setTimeout(deckHideAc, 150); });

// pointer-driven tilt + glare on deck cards
$('#deckGrid').addEventListener('pointermove', e => {
  const c = e.target.closest('.deck-card');
  if (!c) return;
  const r = c.getBoundingClientRect();
  const px = (e.clientX - r.left) / r.width;   // 0..1
  const py = (e.clientY - r.top) / r.height;   // 0..1
  c.style.setProperty('--ry', ((px - .5) * 6).toFixed(2) + 'deg');
  c.style.setProperty('--rx', ((.5 - py) * 5).toFixed(2) + 'deg');
  c.style.setProperty('--gx', (px * 100).toFixed(1) + '%');
  c.style.setProperty('--gy', (py * 100).toFixed(1) + '%');
});
$('#deckGrid').addEventListener('pointerout', e => {
  const c = e.target.closest('.deck-card');
  if (!c || c.contains(e.relatedTarget)) return;
  c.style.removeProperty('--rx'); c.style.removeProperty('--ry');
});

// pointer drifts the foil hue on inventory cards
$('#inventoryTable').addEventListener('pointermove', e => {
  const img = e.target.closest('.art-img');
  if (!img || !img.querySelector('.art-foil')) return;
  const r = img.getBoundingClientRect();
  const x = (e.clientX - r.left) / r.width;
  img.style.setProperty('--hue', ((x - .5) * 180).toFixed(0) + 'deg');
});

$('#invSearch').addEventListener('input', e => {
  invSearch = e.target.value; renderInventory();
  const q = e.target.value.trim();
  if (q.length >= 2) showInvAc(q); else hideInvAc();
});
$('#invSearch').addEventListener('keydown', e => {
  if (e.key === 'ArrowDown') { e.preventDefault(); setInvAcActive(invAcActive + 1); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); setInvAcActive(invAcActive - 1); }
  else if (e.key === 'Enter') {
    const pick = invAcActive >= 0 ? invAcItems[invAcActive] : invAcItems[0];
    if (pick) { e.preventDefault(); pickInvAc(pick); }
  } else if (e.key === 'Escape') { hideInvAc(); }
});
$('#invSearch').addEventListener('blur', () => setTimeout(hideInvAc, 120));
// mousedown (not click) so selection beats the input's blur
const invAcMenuEl = $('#invAcMenu');
if (invAcMenuEl) invAcMenuEl.addEventListener('mousedown', e => {
  const it = e.target.closest('.ac-item');
  if (it) { e.preventDefault(); pickInvAc(invAcItems[+it.dataset.invacidx]); }
});
$('#invFilter').addEventListener('click', e => {
  const b = e.target.closest('.seg-btn');
  if (!b) return;
  invFilter = b.dataset.filter;
  $$('#invFilter .seg-btn').forEach(x => x.classList.toggle('is-active', x === b));
  renderInventory();
});

$('#invColorFilter').addEventListener('click', e => {
  const b = e.target.closest('.cpip');
  if (!b) return;
  const c = b.dataset.color;
  if (invColors.includes(c)) invColors = invColors.filter(x => x !== c);
  else invColors = [...invColors, c];
  b.classList.toggle('on', invColors.includes(c));
  renderInventory();
});
$('#invViewMode').addEventListener('click', e => {
  const b = e.target.closest('.seg-btn');
  if (!b) return;
  invMode = b.dataset.mode;
  $$('#invViewMode .seg-btn').forEach(x => x.classList.toggle('is-active', x === b));
  renderInventory();
});
$('#buyViewMode').addEventListener('click', e => {
  const b = e.target.closest('.seg-btn');
  if (!b) return;
  buyMode = b.dataset.mode;
  $$('#buyViewMode .seg-btn').forEach(x => x.classList.toggle('is-active', x === b));
  renderBuyList();
});
$('#buySortFilter').addEventListener('change', e => { buySort = e.target.value; renderBuyList(); });
const invSizeRange = $('#invSizeRange');
if (invSizeRange) invSizeRange.addEventListener('input', e => {
  invTile = clampTile(e.target.value);
  $('#inventoryTable').style.setProperty('--tile', invTile + 'px');
  state.prefs.invTile = invTile; save();
});
const buySizeRange = $('#buySizeRange');
if (buySizeRange) buySizeRange.addEventListener('input', e => {
  buyTile = clampTile(e.target.value);
  $('#buyTable').style.setProperty('--tile', buyTile + 'px');
  state.prefs.buyTile = buyTile; save();
});

/* ---------- Sell list events ---------- */
const sellViewMode = $('#sellViewMode');
if (sellViewMode) sellViewMode.addEventListener('click', e => {
  const b = e.target.closest('.seg-btn');
  if (!b) return;
  sellMode = b.dataset.mode;
  $$('#sellViewMode .seg-btn').forEach(x => x.classList.toggle('is-active', x === b));
  renderSellList();
});
const sellSortFilter = $('#sellSortFilter');
if (sellSortFilter) sellSortFilter.addEventListener('change', e => { sellSort = e.target.value; renderSellList(); });
const sellSizeRange = $('#sellSizeRange');
if (sellSizeRange) sellSizeRange.addEventListener('input', e => {
  sellTile = clampTile(e.target.value);
  $('#sellTable').style.setProperty('--tile', sellTile + 'px');
  state.prefs.sellTile = sellTile; save();
});
const copySellBtn = $('#copySellBtn');     if (copySellBtn) copySellBtn.addEventListener('click', copySellList);
const exportSellPdfBtn = $('#exportSellPdfBtn'); if (exportSellPdfBtn) exportSellPdfBtn.addEventListener('click', exportSellPDF);
const sellAddUnlinkedBtn = $('#sellAddUnlinkedBtn'); if (sellAddUnlinkedBtn) sellAddUnlinkedBtn.addEventListener('click', addUnlinkedToSell);
const sellMarkAllBtn = $('#sellMarkAllBtn'); if (sellMarkAllBtn) sellMarkAllBtn.addEventListener('click', markAllSold);
const sellSearchEl = $('#sellSearch'); if (sellSearchEl) sellSearchEl.addEventListener('input', e => { sellSearch = e.target.value; renderSellList(); });
const sellMatchBtn = $('#sellMatchBtn'); if (sellMatchBtn) sellMatchBtn.addEventListener('click', () => { sellMatchOpen = !sellMatchOpen; renderSellList(); });
const sellTableEl = $('#sellTable');
if (sellTableEl) {
  sellTableEl.addEventListener('click', e => {
    const mm = e.target.closest('[data-matchmode]'); if (mm) { sellMatchMode = mm.dataset.matchmode; renderSellList(); return; }
    if (e.target.closest('#sellMatchRun')) { runSellMatch(); return; }
    if (e.target.closest('#sellMatchClear')) { sellMatchText = ''; sellMatchResult = null; renderSellList(); return; }
    if (e.target.closest('#sellMatchSell')) { quickSellMatches(); return; }
    if (e.target.closest('#sellMatchAdd')) { addMatchesToSell(); return; }
    if (e.target.closest('#sellMatchCopy')) { copyMatchHaves(); return; }
  });
  sellTableEl.addEventListener('input', e => { if (e.target.id === 'sellMatchInput') sellMatchText = e.target.value; });
}
const sellFolders = $('#sellFolders');
if (sellFolders) sellFolders.addEventListener('click', e => {
  const ren = e.target.closest('[data-sellfolder-rename]');
  if (ren) { const l = state.sellLists.find(x => x.id === ren.dataset.sellfolderRename); const nm = prompt(tr('Rename sell list:'), l ? l.name : ''); if (nm != null) renameSellList(ren.dataset.sellfolderRename, nm); return; }
  const del = e.target.closest('[data-sellfolder-del]');
  if (del) { deleteSellList(del.dataset.sellfolderDel); return; }
  if (e.target.closest('[data-sellfolder-new]')) { const nm = prompt(tr('Name this sell list:'), tr('List {n}', { n: state.sellLists.length + 1 })); if (nm != null) createSellList(nm); return; }
  const f = e.target.closest('[data-sellfolder]');
  if (f) { setActiveSellList(f.dataset.sellfolder); return; }
});
const sellPickMenu = $('#sellPickMenu');
if (sellPickMenu) sellPickMenu.addEventListener('click', e => {
  if (!sellPickTarget) return;
  const { name, vid } = sellPickTarget;
  const item = e.target.closest('[data-sp-list]');
  if (item) { if (vid) toggleSellVariantIn(name, vid, item.dataset.spList); else toggleSellCardIn(name, item.dataset.spList); renderSellPicker(); return; }
  if (e.target.closest('[data-sp-new]')) {
    const nm = prompt(tr('Name this sell list:'), tr('List {n}', { n: state.sellLists.length + 1 }));
    if (nm == null) return;
    createSellList(nm);
    const newId = state.sellLists[state.sellLists.length - 1].id;
    if (vid) toggleSellVariantIn(name, vid, newId); else toggleSellCardIn(name, newId);
    renderSellPicker();
  }
});
// close the picker on outside click / Escape (but not when clicking a Sell button or the menu itself)
document.addEventListener('pointerdown', e => {
  const m = $('#sellPickMenu');
  if (m && !m.hidden && !e.target.closest('#sellPickMenu, [data-sellcard], [data-sellvar], [data-cvsell]')) closeSellPicker();
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSellPicker(); });

/* ---------- Buy binder events ---------- */
const buyFolders = $('#buyFolders');
if (buyFolders) buyFolders.addEventListener('click', e => {
  const ren = e.target.closest('[data-buyfolder-rename]');
  if (ren) { const b = binderById(ren.dataset.buyfolderRename); const nm = prompt(tr('Rename buy binder:'), b ? b.name : ''); if (nm != null) renameBuyBinder(ren.dataset.buyfolderRename, nm); return; }
  const del = e.target.closest('[data-buyfolder-del]');
  if (del) { deleteBuyBinder(del.dataset.buyfolderDel); return; }
  if (e.target.closest('[data-buyfolder-new]')) { const nm = prompt(tr('Name this buy binder (e.g. Need now, Soon, Someday):'), tr('Binder {n}', { n: state.buyBinders.length + 1 })); if (nm != null) createBuyBinder(nm); return; }
  const f = e.target.closest('[data-buyfolder]');
  if (f) { setActiveBuyBinder(f.dataset.buyfolder === 'auto' ? null : f.dataset.buyfolder); return; }
});
const buyPickMenu = $('#buyPickMenu');
if (buyPickMenu) buyPickMenu.addEventListener('click', e => {
  if (!buyPickName) return;
  const item = e.target.closest('[data-bp-binder]');
  if (item) { toggleCardInBinder(buyPickName, item.dataset.bpBinder); renderBuyPicker(); return; }
  if (e.target.closest('[data-bp-new]')) {
    const nm = prompt(tr('Name this buy binder (e.g. Need now, Soon, Someday):'), tr('Binder {n}', { n: state.buyBinders.length + 1 }));
    if (nm == null) return;
    const b = createBuyBinder(nm);
    addCardToBinder(buyPickName, b.id, 1); render();
    renderBuyPicker();
  }
});
document.addEventListener('pointerdown', e => {
  const m = $('#buyPickMenu');
  if (m && !m.hidden && !e.target.closest('#buyPickMenu, [data-tobinder]')) closeBuyPicker();
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeBuyPicker(); });
const buyTableEl = $('#buyTable');
if (buyTableEl) buyTableEl.addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target.id === 'binderAddInput') { e.preventDefault(); addNameToBinder(e.target.value, state.activeBuyBinder); }
});

/* ---------- Browse events ---------- */
const browseDebounced = (() => { let t; return q => { clearTimeout(t); t = setTimeout(() => browseSearch(q, { fresh: true }), 350); }; })();
$('#browseSearch').addEventListener('input', e => {
  browseQuery = e.target.value.trim();
  if (browseQuery.length < 2 && !browseIds.length) { browseResults = []; browseNextPage = null; browseTotal = 0; renderBrowse(); setBrowseStatus(''); hideBrowseAc(); return; }
  if (browseQuery.length >= 2 && !browseLooksAdvanced(browseQuery)) browseAcDebounced(browseQuery); else hideBrowseAc();
  browseDebounced(browseQuery);
});
$('#browseSearch').addEventListener('keydown', e => {
  if (browseAcItems.length) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setBrowseAcActive(browseAcActive + 1); return; }
    if (e.key === 'ArrowUp') { e.preventDefault(); setBrowseAcActive(browseAcActive - 1); return; }
    if (e.key === 'Escape') { hideBrowseAc(); return; }
    if (e.key === 'Enter' && browseAcActive >= 0) { e.preventDefault(); pickBrowseAc(browseAcItems[browseAcActive]); return; }
  }
  if (e.key === 'Enter') { browseQuery = e.target.value.trim(); hideBrowseAc(); browseSearch(browseQuery, { fresh: true }); }
});
$('#browseSearch').addEventListener('blur', () => setTimeout(hideBrowseAc, 120));
// mousedown (not click) so the pick beats the input's blur
const browseAcMenuEl = $('#browseAcMenu');
if (browseAcMenuEl) browseAcMenuEl.addEventListener('mousedown', e => {
  const it = e.target.closest('.ac-item');
  if (it) { e.preventDefault(); pickBrowseAc(browseAcItems[+it.dataset.bacidx]); }
});
$('#browseCmdrOnly').addEventListener('change', e => { browseCmdrOnly = e.target.checked; browseSearch(browseQuery, { fresh: true }); });
$('#browseIdFilter').addEventListener('click', e => {
  const p = e.target.closest('.cpip');
  if (!p) return;
  const c = p.dataset.color, i = browseIds.indexOf(c);
  if (i >= 0) browseIds.splice(i, 1); else browseIds.push(c);
  p.classList.toggle('on', browseIds.includes(c));
  browseSearch(browseQuery, { fresh: true });
});
$('#browseOrder').addEventListener('change', e => { browseOrder = e.target.value; browseSearch(browseQuery, { fresh: true }); });
const browseSizeRange = $('#browseSizeRange');
if (browseSizeRange) browseSizeRange.addEventListener('input', e => {
  browseTile = clampTile(e.target.value);
  $('#browseTable').style.setProperty('--tile', browseTile + 'px');
  state.prefs.browseTile = browseTile; save();
});
$('#browseMoreBtn').addEventListener('click', () => browseSearch(browseQuery, { fresh: false }));
$('#browseTable').addEventListener('click', e => {
  const w = e.target.closest('[data-bwish]');
  if (w) { e.stopPropagation(); addBrowsedToWishlist(browseResults[+w.dataset.bwish]); return; }
  const o = e.target.closest('[data-bown]');
  if (o) { e.stopPropagation(); addBrowsedToOwned(browseResults[+o.dataset.bown]); return; }
});
$('#browseModes').addEventListener('click', e => {
  const b = e.target.closest('.seg-btn');
  if (b) setBrowseMode(b.dataset.bmode);
});
$('#browseSets').addEventListener('click', e => {
  const c = e.target.closest('[data-setcode]');
  if (c) browseSet(c.dataset.setcode);
});
$('#browseDecks').addEventListener('click', e => {
  const cdi = e.target.closest('[data-cdimport]'); if (cdi) { communityDeckImport(cdi.dataset.cdimport); return; }
  const imp = e.target.closest('[data-recimport]'); if (imp) { recDeckImport(+imp.dataset.recimport); return; }
  const wish = e.target.closest('[data-recwish]'); if (wish) { recDeckWish(+wish.dataset.recwish); return; }
  const own = e.target.closest('[data-recown]'); if (own) { recDeckOwn(+own.dataset.recown); return; }
});
const browseStoresTabsEl = $('#browseStoresTabs');
if (browseStoresTabsEl) browseStoresTabsEl.addEventListener('click', e => {
  const b = e.target.closest('.seg-btn'); if (!b) return;
  if (browseStoresTab === b.dataset.stab) return;
  browseStoresTab = b.dataset.stab;
  renderBrowseStores();
});
const browseStoresEl = $('#browseStores');
if (browseStoresEl) browseStoresEl.addEventListener('click', e => {
  const si = e.target.closest('[data-storesignin]'); if (si) { openAuth('signin'); return; }
  const f = e.target.closest('[data-storefollow]'); if (f) { e.stopPropagation(); toggleStoreFollow(f.dataset.storefollow); return; }
  const open = e.target.closest('[data-storeopen]'); if (open) { const slug = open.dataset.storeopen; if (slug) window.open(storePublicUrl(slug), '_blank', 'noopener'); return; }
});
if (browseStoresEl) browseStoresEl.addEventListener('keydown', e => {   // role="link" cards: open on Enter/Space
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const card = e.target.closest('[data-storeopen]');
  if (!card || e.target.closest('[data-storefollow]')) return;
  e.preventDefault();
  if (card.dataset.storeopen) window.open(storePublicUrl(card.dataset.storeopen), '_blank', 'noopener');
});
$('#invTypeFilter').addEventListener('click', e => {
  const b = e.target.closest('.tpip');
  if (!b) return;
  invType = (invType === b.dataset.type) ? 'all' : b.dataset.type;
  $$('#invTypeFilter .tpip').forEach(x => x.classList.toggle('on', x.dataset.type === invType));
  renderInventory();
});
$('#invRarityFilter').addEventListener('click', e => {
  const b = e.target.closest('.rpip');
  if (!b) return;
  invRarity = (invRarity === b.dataset.rarity) ? 'all' : b.dataset.rarity;
  $$('#invRarityFilter .rpip').forEach(x => x.classList.toggle('on', x.dataset.rarity === invRarity));
  renderInventory();
});
$('#invSortFilter').addEventListener('change', e => { invSort = e.target.value; renderInventory(); });
$('#invColorOnlyInput').addEventListener('change', e => { invColorOnly = e.target.checked; renderInventory(); });
$('#invFilterClear').addEventListener('click', () => {
  invColors = []; invColorOnly = false; invType = 'all'; invRarity = 'all'; invSort = 'name';
  $$('#invColorFilter .cpip').forEach(x => x.classList.remove('on'));
  $('#invColorOnlyInput').checked = false;
  $$('#invTypeFilter .tpip').forEach(x => x.classList.remove('on'));
  $$('#invRarityFilter .rpip').forEach(x => x.classList.remove('on'));
  $('#invSortFilter').value = 'name';
  renderInventory();
});
$('#copyBuyBtn').addEventListener('click', copyBuyList);
$('#exportPdfBtn').addEventListener('click', exportBuyPDF);
window.addEventListener('afterprint', () => { $('#printRoot').innerHTML = ''; });

function toggleBuyDeck(id) {
  if (buyDeckSel.length === 0) buyDeckSel = state.decks.map(d => d.id);   // materialise "all" before removing one
  buyDeckSel = buyDeckSel.includes(id) ? buyDeckSel.filter(x => x !== id) : [...buyDeckSel, id];
  if (buyDeckSel.length === state.decks.length) buyDeckSel = [];          // everything on == no filter
}
$('#buyDeckFilter').addEventListener('click', e => {
  const chip = e.target.closest('[data-deck]');
  if (!chip) return;
  if (chip.dataset.deck === 'all') buyDeckSel = [];
  else toggleBuyDeck(chip.dataset.deck);
  renderBuyList();
});
$('#buyTable').addEventListener('change', e => {
  const pick = e.target.closest('.buy-pick');
  if (!pick) return;
  setBuyExclude(key(pick.dataset.pick), !pick.checked);   // persists across reloads, filters & devices
  renderBuyList();
});
const buySearchEl = $('#buySearch'); if (buySearchEl) buySearchEl.addEventListener('input', e => { buySearch = e.target.value; renderBuyList(); });
const buyMatchBtn = $('#buyMatchBtn'); if (buyMatchBtn) buyMatchBtn.addEventListener('click', () => { buyMatchOpen = !buyMatchOpen; renderBuyList(); });
$('#buyTable').addEventListener('click', e => {
  const got = e.target.closest('[data-bought]');
  if (got) { e.stopPropagation(); markBought(got.dataset.bought); return; }
  const mm = e.target.closest('[data-matchmode]'); if (mm) { buyMatchMode = mm.dataset.matchmode; renderBuyList(); return; }
  const storeChip = e.target.closest('[data-buystorematch]'); if (storeChip) { matchBuyAgainstStore(storeChip.dataset.buystorematch); return; }
  if (e.target.closest('#buyMatchRun')) { runBuyMatch(); return; }
  if (e.target.closest('#buyMatchClear')) { buyMatchText = ''; buyMatchResult = null; buyMatchStoreName = ''; renderBuyList(); return; }
  if (e.target.closest('#buyMatchBuy')) { quickBuyMatches(); return; }
  if (e.target.closest('#buyMatchCopy')) { copyBuyMatchWants(); return; }
});
$('#buyTable').addEventListener('input', e => { if (e.target.id === 'buyMatchInput') buyMatchText = e.target.value; });

$('#forgeBody').addEventListener('click', e => {
  const chip = e.target.closest('.sug-chip');
  if (chip && chip.dataset.colors) { applyFacet({ kind: 'guild', colors: chip.dataset.colors.split(''), label: chip.dataset.guild }); return; }
  const row = e.target.closest('.tribe-row');
  if (row && row.dataset.tribe) applyFacet({ kind: 'tribe', value: row.dataset.tribe });
});
$('#invFacetBar').addEventListener('click', e => {
  if (e.target.closest('#facetClear')) { invFacet = null; renderInventory(); }
});

/* delegated actions across all card tables */
/* variant editing (inventory) */
function variantById(name, id) { return variantsOf(name).find(v => v.id === id); }
function removeVariant(name, id) {
  const k = key(name);
  const kept = variantsOf(name).filter(v => v.id !== id);
  if (kept.length) state.variants[k] = kept; else delete state.variants[k];
  save();
}

document.addEventListener('click', e => {
  const vstep = e.target.closest('[data-vstep]');
  if (vstep) {
    const v = variantById(vstep.dataset.name, vstep.dataset.vid);
    if (v) {
      const before = ownedOf(vstep.dataset.name);
      v.qty = Math.max(0, v.qty + parseInt(vstep.dataset.vstep, 10));
      if (v.qty === 0) removeVariant(vstep.dataset.name, v.id);
      logChange(vstep.dataset.name, before, ownedOf(vstep.dataset.name)); save();
      render();
      refreshCardEditor();
    }
    return;
  }
  const vdel = e.target.closest('[data-vdel]');
  if (vdel) {
    const before = ownedOf(vdel.dataset.name);
    removeVariant(vdel.dataset.name, vdel.dataset.vdel);
    logChange(vdel.dataset.name, before, ownedOf(vdel.dataset.name)); save();
    render(); refreshCardEditor();
    return;
  }
  const addvar = e.target.closest('[data-addvar]');
  if (addvar) {
    const list = (state.variants[key(addvar.dataset.addvar)] ||= []);
    list.push(newVariant({ qty: 1 }));
    logEvent('added', addvar.dataset.addvar, 1, priceOf(addvar.dataset.addvar)); save();
    render(); refreshCardEditor();
    return;
  }
  // ----- sell list (Sell buttons open a folder picker) -----
  const sellCardBtn = e.target.closest('[data-sellcard]');
  if (sellCardBtn) { openSellPicker({ name: sellCardBtn.dataset.sellcard, vid: null }, sellCardBtn); return; }
  const sellVarBtn = e.target.closest('[data-sellvar]');
  if (sellVarBtn) { openSellPicker({ name: sellVarBtn.dataset.name, vid: sellVarBtn.dataset.sellvar }, sellVarBtn); return; }
  const cvSellBtn = e.target.closest('[data-cvsell]');
  if (cvSellBtn) { openSellPicker({ name: cvSellBtn.dataset.name, vid: cvSellBtn.dataset.cvsell }, cvSellBtn); return; }
  const sellQtyBtn = e.target.closest('[data-sellqty]');
  if (sellQtyBtn) { setSellQty(sellQtyBtn.dataset.vid, parseInt(sellQtyBtn.dataset.sellqty, 10)); return; }
  const soldBtn = e.target.closest('[data-sold]');
  if (soldBtn) { markSold(soldBtn.dataset.sold); return; }
  const sellRmBtn = e.target.closest('[data-sellrm]');
  if (sellRmBtn) { removeFromSell(sellRmBtn.dataset.sellrm); return; }
  if (e.target.closest('[data-selladd]')) { addUnlinkedToSell(); return; }
  // ----- buy binders (file a card into a binder; act on a card inside a binder) -----
  const toBinder = e.target.closest('[data-tobinder]');
  if (toBinder) { openBuyPicker(toBinder.dataset.tobinder, toBinder); return; }
  const binderBought = e.target.closest('[data-binderbought]');
  if (binderBought) { boughtFromBinder(binderBought.dataset.binderbought, state.activeBuyBinder); return; }
  const binderRm = e.target.closest('[data-binderremove]');
  if (binderRm) { removeCardFromBinder(binderRm.dataset.binderremove, state.activeBuyBinder); return; }
  const binderStep = e.target.closest('[data-binderstep]');
  if (binderStep) { const nm = binderStep.dataset.bname; setBinderQty(nm, state.activeBuyBinder, Math.max(1, binderItemQty(nm, state.activeBuyBinder) + parseInt(binderStep.dataset.binderstep, 10))); return; }   // floor at 1 — only the ✕ removes
  if (e.target.closest('#binderAddBtn')) { const inp = $('#binderAddInput'); if (inp) addNameToBinder(inp.value, state.activeBuyBinder); return; }
  const toggle = e.target.closest('[data-toggle]');
  if (toggle) {
    const name = toggle.dataset.toggle;
    const req = parseInt(toggle.dataset.req, 10) || 1;
    const before = ownedOf(name);
    setOwned(name, before >= req ? 0 : req);
    logChange(name, before, ownedOf(name)); save();
    render();
    return;
  }
  const step = e.target.closest('[data-step]');
  if (step) {
    const name = step.dataset.name;
    const before = ownedOf(name);
    setOwned(name, before + parseInt(step.dataset.step, 10));
    logChange(name, before, ownedOf(name)); save();
    render();
    return;
  }
  const tile = e.target.closest('.art-open');
  if (tile) { openCardView(tile.dataset.name); return; }
  const link = e.target.closest('.nm');
  if (link) { openCardView(link.dataset.name || link.getAttribute('title') || link.textContent.trim()); return; }
  const del = e.target.closest('[data-del-deck]');
  if (del) { deckPendingDelete = del.dataset.delDeck; renderDeckDetail(); return; }
  const delOnly = e.target.closest('[data-confirm-del-only]');
  if (delOnly) { deleteDeck(delOnly.dataset.confirmDelOnly); return; }
  const delCards = e.target.closest('[data-confirm-del-cards]');
  if (delCards) { deleteDeckAndCards(delCards.dataset.confirmDelCards); return; }
  if (e.target.closest('[data-confirm-del-cancel]')) { deckPendingDelete = null; renderDeckDetail(); return; }
});

/* variant property edits — fire on commit (blur / selection) to avoid re-render mid-keystroke */
document.addEventListener('change', e => {
  const t = e.target;
  if (t.id === 'cvCommander') {
    const deck = state.decks.find(d => d.id === currentDeckId);
    if (deck) { deck.commander = t.checked ? cardViewName : null; save(); render(); }
    return;
  }
  // The variant editor lives in the card viewer; cardViewName is the card being edited.
  const nameOf = () => e.target.closest('#cardModal') ? cardViewName : null;
  const commit = (id, apply) => {
    const v = variantById(nameOf(), id);
    if (v) { apply(v); save(); render(); refreshCardEditor(); }
  };
  if (t.dataset.vfoil !== undefined) commit(t.dataset.vfoil, v => v.foil = t.checked);
  else if (t.dataset.vcond !== undefined) commit(t.dataset.vcond, v => v.condition = t.value);
  else if (t.dataset.vset !== undefined) commit(t.dataset.vset, v => v.set = t.value.trim().toUpperCase());
  else if (t.dataset.vcoll !== undefined) commit(t.dataset.vcoll, v => v.collector = t.value.trim());
  else if (t.dataset.vnotes !== undefined) commit(t.dataset.vnotes, v => v.notes = t.value.trim());
});

document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  const qm = $('#qrModal'); if (qm && !qm.hidden) { closeQr(); return; }   // QR sits on top of the share modal — close it first
  if (!$('#cardModal').hidden) closeCardView();
  if (!$('#importModal').hidden) closeImport();
  if (!$('#addModal').hidden) closeAdd();
  const sm = $('#shareModal'); if (sm && !sm.hidden) closeShare();
  const dsm = $('#deckShareModal'); if (dsm && !dsm.hidden) closeDeckShare();
  const fmm = $('#friendMatchModal'); if (fmm && !fmm.hidden) { closeFriendMatch(); return; }
  const sev = $('#storeEventModal'); if (sev && !sev.hidden) { closeStoreEvent(); return; }
  const sim = $('#storeInviteModal'); if (sim && !sim.hidden) closeStoreInvite();
  const scm = $('#storeCreateModal'); if (scm && !scm.hidden) closeStoreCreate();
});

/* ---------- theme ---------- */
function applyTheme(t) {
  const theme = THEMES.includes(t) ? t : 'grimoire';
  document.documentElement.dataset.theme = theme;
  $$('#themeSwitch .sw').forEach(b => {
    const on = b.dataset.theme === theme;
    b.classList.toggle('is-active', on);
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
}
function setTheme(t) {
  state.prefs.theme = THEMES.includes(t) ? t : 'grimoire';
  save();
  applyTheme(state.prefs.theme);
  pickAppBg();
}
// Background art pools — themed scenes per colour + a shared pool of neutral
// atmospheres; the app backdrop picks randomly each load so it varies.
const BG = {
  grimoire: ['grimoire', 'abstract'],
  arcane: ['arcane'],
  tome: ['tome', 'tome2'],
  ember: ['ember'],
  verdant: [],
  ambient: ['space1', 'space2', 'space3', 'space4', 'space5', 'manamist1', 'manamist2', 'manamist3', 'manamist4', 'manamist5', 'mountain1', 'mountain2', 'mountain3', 'mountain4', 'archway1', 'archway2', 'archway3'],
};
const pickFrom = a => a[Math.floor(Math.random() * a.length)];
function pickAppBg() {
  const own = BG[state.prefs.theme] || [];
  const pick = (own.length && Math.random() < 0.5) ? pickFrom(own) : pickFrom(own.concat(BG.ambient));
  const el = $('.app-bg');
  if (el && pick) el.style.backgroundImage = `url("bg/${pick}.jpg")`;
}
function pickSigninBg() {
  document.documentElement.style.setProperty('--signin-bg', `url("bg/${pickFrom(['signin1', 'signin2', 'signin3'])}.jpg")`);
}
$('#themeSwitch').addEventListener('click', e => {
  const b = e.target.closest('.sw');
  if (b) setTheme(b.dataset.theme);
});

/* ---------- UI language (English source + Spanish) ---------- */
function applyLang() {
  $$('#langSwitch .lang-opt').forEach(b => {
    const on = b.dataset.lang === state.prefs.lang;
    b.classList.toggle('on', on);
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
}
function setLang(lang) {
  const l = (lang === 'es') ? 'es' : 'en';
  if (l === state.prefs.lang) return;
  state.prefs.lang = l;
  save();
  I18N.setLang(l);   // repaint static markup + <html lang>
  applyLang();
  render();           // re-render dynamic view bodies (all tr() calls re-run)
}
const langSwitchEl = $('#langSwitch');
if (langSwitchEl) langSwitchEl.addEventListener('click', e => {
  const b = e.target.closest('.lang-opt');
  if (b) setLang(b.dataset.lang);
});

/* =====================================================================
   SUPABASE — accounts, profiles & multi-device sync
   Local localStorage stays the source of truth/cache; the whole `state`
   blob is mirrored to Supabase per user. Pull on open/focus, debounced
   push on change, last-write-wins by updated_at.
   ===================================================================== */
const SUPA_URL = 'https://yaxczuttvpvqfomhyfbg.supabase.co';
const SUPA_KEY = 'sb_publishable_le56dg5VAp5Bmfg3BZ4XCQ_c2sSPuOu';
const SYNC_META_KEY = STORE_KEY + ':sync';
let sb = null;
try { if (window.supabase) sb = window.supabase.createClient(SUPA_URL, SUPA_KEY); } catch (e) { sb = null; }

let authUser = null;        // supabase auth user | null
let authProfile = null;     // profiles row | null
let authMode = 'signin';    // 'signin' | 'signup'
let justSignedUp = false;   // set on signup → afterSignIn launches onboarding (Phase 2)
let syncBusy = false;       // a push is in flight
let syncPushTimer = null;   // pending debounced push (truthy = dirty/queued)
let syncResolving = false;  // first sign-in reconciliation in progress
let syncSuppress = false;   // adopting remote → don't echo it back as a push

// Does a state blob hold an actual collection (vs an empty shell)?
function collectionNonEmpty(s) {
  if (!s) return false;
  const v = s.variants && Object.values(s.variants).some(list => (list || []).some(x => x.qty > 0));
  const d = (s.decks || []).length > 0;
  const w = s.wishlist && Object.keys(s.wishlist).length > 0;
  return !!(v || d || w);
}
function syncMeta() { try { return JSON.parse(localStorage.getItem(SYNC_META_KEY)) || {}; } catch (e) { return {}; } }
function setSyncMeta(m) { try { localStorage.setItem(SYNC_META_KEY, JSON.stringify(m)); } catch (e) {} }

async function initSync() {
  renderAccount();
  if (!sb) return;
  loadStores(); loadStoreCounts();   // community store list + popularity (fire-and-forget)
  try {
    const { data } = await sb.auth.getSession();
    if (data.session) { authUser = data.session.user; await afterSignIn(); }
  } catch (e) {}
  renderAccount();
  sb.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' && session && (!authUser || authUser.id !== session.user.id)) {
      authUser = session.user; afterSignIn();
    } else if (event === 'SIGNED_OUT') {
      authUser = null; authProfile = null; setSyncMeta({}); renderAccount();
    }
  });
}

// ---------- auth ----------
async function doAuth() {
  if (!sb) return;
  const signup = authMode === 'signup';
  const email = $('#authEmail').value.trim();
  const password = $('#authPassword').value;
  const username = $('#authUsername').value.trim();
  const confirmPw = $('#authConfirm').value;
  const status = $('#authStatus');
  if (!email || !password) { status.textContent = tr('Enter your email and password.'); return; }
  if (signup) {
    if (!/^[a-zA-Z0-9_.]{3,24}$/.test(username)) { status.textContent = tr('Username: 3–24 letters, numbers, “_” or “.”'); return; }
    if (password.length < 6) { status.textContent = tr('Use a password of at least 6 characters.'); return; }
    if (password !== confirmPw) { status.textContent = tr('Those passwords don’t match.'); return; }
  }
  $('#authSubmit').disabled = true;
  status.innerHTML = `<span class="spin"></span>${signup ? tr('Creating your account…') : tr('Signing in…')}`;
  try {
    if (signup) {
      const { data: avail, error: chkErr } = await sb.rpc('username_available', { name: username });
      if (!chkErr && avail === false) { status.textContent = tr('That username is taken — try another.'); $('#authSubmit').disabled = false; return; }
    }
    const { data, error } = signup
      ? await sb.auth.signUp({ email, password, options: { data: { username } } })
      : await sb.auth.signInWithPassword({ email, password });
    if (error) { status.textContent = error.message; $('#authSubmit').disabled = false; return; }
    if (signup && !data.session) {
      status.textContent = tr('Account created — check your email to confirm, then sign in.');
      $('#authSubmit').disabled = false;
      return;
    }
    if (signup && data.user) {
      justSignedUp = true;   // afterSignIn will launch onboarding
      try { await sb.from('profiles').update({ username, display_name: username, updated_at: new Date().toISOString() }).eq('id', data.user.id); } catch (e) {}
    }
    closeAuth();   // signed in — onAuthStateChange takes over
  } catch (e) {
    status.textContent = tr('Something went wrong — try again.');
    $('#authSubmit').disabled = false;
  }
}
async function signOut() {
  if (!sb) return;
  clearTimeout(syncPushTimer); syncPushTimer = null;   // cancel any queued push so it can't fire under the next user
  clearTimeout(liveShareTimer); liveShareTimer = null; myShares = [];
  clearTimeout(publicProfileTimer); publicProfileTimer = null;
  try { await sb.auth.signOut(); } catch (e) {}
  authUser = null; authProfile = null; setSyncMeta({});
  myStore = null; myStores = []; storeEvents = []; storeTx = []; storeMembers = []; friends = []; myWins = null; manageEventId = null; eventRegs = []; pendingStoreInvite = null; pendingStaffInvite = null; refreshStoreMenu();
  closeProfile(); renderAccount();
  if (['view-profile', 'view-store'].some(v => $('#' + v) && $('#' + v).classList.contains('is-active'))) setView('decks');
  toast(tr('Signed out — this device is now local-only.'));
}
async function loadProfile() {
  if (!sb || !authUser) return;
  try {
    const { data } = await sb.from('profiles').select('*').eq('id', authUser.id).maybeSingle();
    authProfile = data || { id: authUser.id, display_name: (authUser.email || '').split('@')[0] };
  } catch (e) { authProfile = { id: authUser.id, display_name: (authUser.email || '').split('@')[0] }; }
}

// ---------- first sign-in: reconcile this device vs the account ----------
async function afterSignIn() {
  if (syncResolving) return;          // re-entrancy guard — onAuthStateChange can fire SIGNED_IN repeatedly (token refresh)
  syncResolving = true; renderAccount();   // held for the WHOLE function: also blocks echo-pushes during reconciliation
  try {
    await loadProfile();
    loadStores(); loadStoreCounts();   // shared store list + popularity
    loadMyShares().then(() => { if (publicProfileOn()) publishPublicProfile(true); });   // my shares; refresh public profile if on
    loadMyStore().then(() => { refreshStoreMenu(); if (pendingStaffInvite) redeemStaffInvite(); else maybePromptStoreCreate(); });   // store ownership + admin menu + any pending store/staff invite
    loadFriends();   // friends list + publish my trade lists
    const uid = authUser && authUser.id;
    if (!uid) return;
    const { data, error } = await sb.from('collections').select('data, updated_at').eq('user_id', uid).maybeSingle();
    if (error) { toast(tr('Signed in, but sync failed:') + ' ' + error.message); return; }
    if (!authUser || authUser.id !== uid) return;   // signed out / switched user mid-fetch — abandon
    const remote = data || { data: {}, updated_at: null };
    const meta = syncMeta();
    const remoteHas = collectionNonEmpty(remote.data);
    const localHas = collectionNonEmpty(state);
    // has THIS device synced with THIS account before (and to which remote version)?
    const knownRemote = meta.remoteUpdatedAt;
    const inSync = remote.updated_at && remote.updated_at === knownRemote;   // we already hold the account's latest
    // Online-first: the account is the source of truth. Whenever it holds a collection this
    // device isn't already in sync with, the account wins — no prompt. Local only "wins" by
    // seeding an EMPTY account, or by pushing edits made on top of the version we last synced.
    if (inSync) {
      if (meta.dirty && localHas) await pushNow();          // unsynced edits on the synced version → push up
    } else if (remoteHas && !localHas) {
      await downloadWithOverlay(remote);                    // fresh device → big "loading your collection" overlay
    } else if (remoteHas) {
      adoptRemote(remote.data, remote.updated_at); toast(tr('Loaded the latest from your account.'));   // routine re-sync → quiet toast
    } else if (localHas) {
      await uploadWithOverlay();                            // account is empty → seed it from this device
    } else {
      setSyncMeta({ remoteUpdatedAt: remote.updated_at, dirty: false });
    }
  } catch (e) { toast(tr('Signed in, but sync failed.')); }
  finally {
    syncResolving = false; renderAccount();
    if (justSignedUp) {   // first run after creating an account → onboarding
      justSignedUp = false;
      // a store-invite signup goes through the store-create flow instead — don't stack the player onboarding on top
      if (pendingStoreInvite) { /* store-create modal is their onboarding */ }
      else if ($('#syncModal').hidden) startOnboarding(); else pendingOnboardAfterSync = true;
    }
  }
}
function adoptRemote(remoteData, updatedAt) {
  syncSuppress = true;
  state = migrate(remoteData);
  rebuildBuyExclude();   // the derived Set must follow the adopted state, not the previous device's
  save();
  syncSuppress = false;
  setSyncMeta({ remoteUpdatedAt: updatedAt, dirty: false });
  undoStack = [];
  render();
}

// ---------- push / pull ----------
function scheduleSyncPush() {
  if (!sb || !authUser || syncResolving || syncSuppress) return;
  const m = syncMeta(); if (!m.dirty) setSyncMeta({ ...m, dirty: true });   // survives a reload before the push lands
  clearTimeout(syncPushTimer);
  syncPushTimer = setTimeout(() => { syncPushTimer = null; pushNow(); }, 2500);
  scheduleLiveShareRefresh();        // keep any "live" shared links current too
  schedulePublicProfileRefresh();    // and a public profile snapshot, if enabled
  scheduleDeckShareRefresh();        // and any published community decks
  renderAccount();
}
// Owned/deck/wishlist card metadata must sync (prices/images render offline);
// drop browse-only cached cards (re-fetchable) so the blob stays small.
function pruneForSync() {
  const refs = new Set(Object.keys(state.variants || {}));
  (state.decks || []).forEach(d => (d.cards || []).forEach(c => refs.add(key(c.name))));
  Object.keys(state.wishlist || {}).forEach(k => refs.add(k));
  (state.buyBinders || []).forEach(b => Object.keys(b.items || {}).forEach(k => refs.add(k)));   // keep metadata for binder-only "want to buy" cards across devices
  const cards = {};
  for (const k of Object.keys(state.cards || {})) if (refs.has(k)) cards[k] = state.cards[k];
  return { ...state, cards };
}
async function pushNow() {
  const uid = authUser && authUser.id;            // capture the user this push is FOR
  if (!sb || !uid) return { ok: false, error: 'not signed in' };
  clearTimeout(syncPushTimer); syncPushTimer = null;
  syncBusy = true; renderAccount();
  const updated_at = new Date().toISOString();
  let result = { ok: false, error: 'unknown' };
  try {
    // write to the captured uid (not authUser.id, which may change mid-flight on signout);
    // .select() the row back so we store the SERVER's canonical timestamp string
    // (Postgres timestamptz formats differently than the ISO string we send).
    const { data, error } = await sb.from('collections').upsert({ user_id: uid, data: pruneForSync(), updated_at }).select('updated_at').single();
    if (authUser && authUser.id === uid) {          // still the same signed-in user
      if (!error && data) { setSyncMeta({ remoteUpdatedAt: data.updated_at, dirty: false }); result = { ok: true }; }
      else { scheduleSyncPush(); result = { ok: false, error: (error && error.message) || 'no response' }; }   // failed → stay dirty and retry
    } else { result = { ok: false, error: 'signed out mid-sync' }; }
  } catch (e) { if (authUser && authUser.id === uid) scheduleSyncPush(); result = { ok: false, error: e.message }; }
  syncBusy = false; renderAccount();
  return result;
}
async function syncPullIfNewer() {
  if (!sb || !authUser || syncResolving || syncBusy || syncPushTimer || syncMeta().dirty) return;   // skip if local has unsynced changes
  try {
    const { data } = await sb.from('collections').select('data, updated_at').eq('user_id', authUser.id).maybeSingle();
    if (!data || !data.updated_at) return;
    if (data.updated_at !== syncMeta().remoteUpdatedAt && collectionNonEmpty(data.data)) {
      adoptRemote(data.data, data.updated_at);
      toast(tr('Synced the latest from another device.'));
    }
  } catch (e) {}
}

/* ============ shareable buy/sell lists (Supabase short links) ============ */
const SHARE_TTL_DAYS = 30;
let myShares = [];               // this user's shared_lists rows (cache for management + live refresh)
let liveShareTimer = null;       // debounced live-share refresh
let shareCtx = { kind: 'buy', folderId: null, live: false };
let shareLastResult = null;      // {url, live} of the link just created (for the result panel)

function shareCode() {
  const a = 'abcdefghijkmnpqrstuvwxyz23456789';   // no l/o/0/1 — unambiguous
  const arr = new Uint8Array(8);
  if (window.crypto && crypto.getRandomValues) crypto.getRandomValues(arr);
  else for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 256);
  let s = ''; for (const x of arr) s += a[x % a.length];
  return s;
}
// Build a URL to a sibling page in the deployed vault dir (handles /vault/, /vault/index.html, extensionless /vault).
function vaultPageUrl(file) {
  const p = location.pathname;
  const dir = /\.[^/]+$/.test(p) ? p.replace(/[^/]*$/, '') : p.replace(/\/?$/, '/');
  return location.origin + dir + file;
}
function shareBaseUrl() { return vaultPageUrl('share.html'); }
function shareUrl(code) { return shareBaseUrl() + '?id=' + code; }
function ownerDisplayName() { return (authProfile && (authProfile.display_name || authProfile.username)) || (authUser && (authUser.email || '').split('@')[0]) || 'A player'; }

/* ============ QR codes for share links (qrcode-generator from CDN; degrades to nothing if absent) ============ */
const QR_DARK = '#17120a';   // near-black module — high contrast on the light tile so phones scan it reliably
const QR_LIGHT = '#f7f1e3';  // parchment background (the 4-module quiet zone is part of this rect)
// Build the smallest QR model that fits `text`; error-correction 'M' (15%). Returns null if the lib didn't load.
function makeQr(text, ec) {
  if (typeof qrcode !== 'function' || !text) return null;
  text = String(text);
  for (let t = 1; t <= 40; t++) {
    try { const q = qrcode(t, ec || 'M'); q.addData(text); q.make(); return q; }
    catch (e) { /* code length overflow at this version — try a larger one */ }
  }
  return null;
}
// Crisp, scalable SVG (dark modules on a light tile, 4-module quiet zone). '' if the lib is missing.
function qrSvg(text, opts) {
  opts = opts || {};
  const qr = makeQr(text, opts.ec);
  if (!qr) return '';
  const margin = opts.margin == null ? 4 : opts.margin;
  const n = qr.getModuleCount(), total = n + margin * 2;
  let d = '';
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    if (qr.isDark(r, c)) d += 'M' + (c + margin) + ' ' + (r + margin) + 'h1v1h-1z';
  }
  const sz = opts.size ? ' width="' + opts.size + '" height="' + opts.size + '"' : '';
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + total + ' ' + total + '"' + sz +
    ' shape-rendering="crispEdges" class="qr-svg" role="img" aria-label="QR code linking to this list">' +
    '<rect width="' + total + '" height="' + total + '" fill="' + (opts.light || QR_LIGHT) + '"/>' +
    '<path d="' + d + '" fill="' + (opts.dark || QR_DARK) + '"/></svg>';
}
function qrSlug(s) { return (String(s || 'list').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40)) || 'list'; }
// Rasterise straight to a canvas (no async SVG decode) and save a high-res PNG.
function downloadQrPng(text, filename) {
  const qr = makeQr(text, 'M');
  if (!qr) { toast(tr('Couldn’t generate the QR code — reload the page and try again.')); return; }
  const n = qr.getModuleCount(), margin = 4, total = n + margin * 2;
  const scale = Math.max(6, Math.ceil(960 / total));   // ~960px+ square, integer scale → no seams
  const dim = total * scale;
  const cv = document.createElement('canvas'); cv.width = dim; cv.height = dim;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = QR_LIGHT; ctx.fillRect(0, 0, dim, dim);
  ctx.fillStyle = QR_DARK;
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    if (qr.isDark(r, c)) ctx.fillRect((c + margin) * scale, (r + margin) * scale, scale, scale);
  }
  const name = (filename || 'vault-list') + '-qr.png';
  const fire = (href, revoke) => { const a = document.createElement('a'); a.href = href; a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { a.remove(); if (revoke) URL.revokeObjectURL(href); }, 1500); };
  if (cv.toBlob) cv.toBlob(b => { if (!b) { toast(tr('Could not save the QR code.')); return; } fire(URL.createObjectURL(b), true); }, 'image/png');
  else { try { fire(cv.toDataURL('image/png'), false); } catch (e) { toast(tr('Could not save the QR code.')); } }
}

let qrModalCode = null;
function openQrModal(code) { qrModalCode = code; const m = $('#qrModal'); if (m) m.hidden = false; renderQrModal(); }
function closeQr() { const m = $('#qrModal'); if (m) m.hidden = true; qrModalCode = null; }
function renderQrModal() {
  const body = $('#qrBody'); if (!body) return;
  const code = qrModalCode;
  const s = myShares.find(x => x.code === code);
  const url = shareUrl(code);
  const kindLabel = s ? (s.kind === 'sell' ? tr('Sell list') : tr('Buy list')) : '';
  const title = (s && s.title) || kindLabel || tr('List');
  const svg = qrSvg(url, { margin: 4 });
  body.innerHTML =
    '<p class="qr-lead">' + tr('Point a phone camera at this code to open {title}', { title: '<b>' + esc(title) + '</b>' }) + (kindLabel ? ' · ' + esc(kindLabel) : '') + '.</p>' +
    '<div class="qr-frame">' + (svg || '<div class="qr-fail">' + tr('Couldn’t render the code — check your connection and reopen.') + '</div>') + '</div>' +
    '<div class="qr-url"><input type="text" readonly id="qrUrlInput" value="' + esc(url) + '" /></div>' +
    '<div class="qr-actions">' +
      '<button class="btn gold" data-qrdownload="' + esc(code) + '">' + tr('Download PNG') + '</button>' +
      '<button class="btn" data-qrcopy="' + esc(code) + '">' + tr('Copy link') + '</button>' +
      '<a class="btn" href="' + esc(url) + '" target="_blank" rel="noopener">' + tr('Open ↗') + '</a>' +
    '</div>';
}

// The shared buy list is your FULL buy list across every deck — a pure function of saved state,
// deliberately independent of the current deck-filter / exclude view (so a "live" link can't silently
// re-scope itself to whatever filter happens to be active when a background refresh fires).
function shareItemsBuy() {
  const decks = state.decks;
  const names = allCardNames().filter(n => requiredFor(n, decks) > ownedOf(n));
  names.sort((a, b) => a.localeCompare(b));
  return names.map(n => ({ name: n, qty: requiredFor(n, decks) - ownedOf(n), price: +(priceOf(n) || 0).toFixed(2), img: displayImage(n) || '', uri: (card(n).uri) || '' }));
}
function shareItemsSell(folderId) {
  const l = state.sellLists.find(x => x.id === folderId);
  if (!l) return [];
  const idx = variantIndex(), out = [];
  for (const vid of Object.keys(l.items)) {
    const hit = idx.get(vid); if (!hit) continue;
    const qty = Math.min(l.items[vid], hit.v.qty); if (qty <= 0) continue;
    out.push({ name: hit.name, qty, price: +(variantPrice(hit.name, hit.v) || 0).toFixed(2), set: hit.v.set || '', foil: !!hit.v.foil, img: displayImage(hit.name) || '', uri: (card(hit.name).uri) || '' });
  }
  out.sort((a, b) => a.name.localeCompare(b.name));
  return out;
}
function shareTitleFor(kind, folderId) {
  if (kind === 'buy') return 'Buy List';
  const l = state.sellLists.find(x => x.id === folderId);
  return (l && l.name) || 'Sell List';
}
function shareItemsFor(kind, folderId) { return kind === 'buy' ? shareItemsBuy() : shareItemsSell(folderId); }
// a binder's cards in the shareable item shape
function binderShareItems(b) {
  return Object.keys(b.items).map(k => {
    const n = b.items[k].n, q = b.items[k].q;
    return { name: n, qty: q, price: +(priceOf(n) || 0).toFixed(2), img: displayImage(n) || '', uri: (card(n).uri) || '' };
  }).sort((a, c) => a.name.localeCompare(c.name));
}
function shareDataFor(kind, folderId) {
  const base = { owner: ownerDisplayName(), priceSrc: state.prefs.priceSource || 'tcg' };
  if (kind === 'buy') {
    // A buy share now includes your binders as CATEGORIES (one single link, sections on top).
    // `sections` only appears when at least one binder has cards — otherwise it's the flat auto list (backward compatible).
    const binderSecs = state.buyBinders.map(b => ({ label: b.name, items: binderShareItems(b) })).filter(s => s.items.length);
    const needs = shareItemsBuy();
    if (binderSecs.length) {
      const sections = [];
      if (needs.length) sections.push({ label: 'Deck needs', items: needs });
      sections.push(...binderSecs);
      return { ...base, items: sections.flatMap(s => s.items), sections };
    }
    return { ...base, items: needs };
  }
  return { ...base, items: shareItemsFor(kind, folderId) };
}

async function loadMyShares() {
  if (!sb || !authUser) { myShares = []; return; }
  try {
    const { data, error } = await sb.from('shared_lists').select('*').eq('owner', authUser.id).order('created_at', { ascending: false });
    if (!error && Array.isArray(data)) myShares = data;
  } catch (e) {}
}
async function createShare(kind, folderId, live) {
  if (!sb || !authUser) return { error: 'not signed in' };
  const data = shareDataFor(kind, folderId);
  if (!data.items.length) return { error: 'empty' };
  const code = shareCode();
  const row = {
    code, owner: authUser.id, kind, title: shareTitleFor(kind, folderId),
    source: kind === 'buy' ? 'buy' : folderId, live: !!live, data,
    expires_at: live ? null : new Date(Date.now() + SHARE_TTL_DAYS * 864e5).toISOString()
  };
  try {
    const { data: saved, error } = await sb.from('shared_lists').insert(row).select('*').single();
    if (error) return { error: error.message };
    myShares.unshift(saved);
    return { code, url: shareUrl(code), row: saved };
  } catch (e) { return { error: e.message }; }
}
async function revokeShare(code) {
  if (!sb || !authUser) return;
  try { await sb.from('shared_lists').delete().eq('code', code).eq('owner', authUser.id); } catch (e) {}
  myShares = myShares.filter(s => s.code !== code);
}
// keep "live" links current: recompute their items when the source list changes (debounced)
function scheduleLiveShareRefresh() {
  if (!sb || !authUser || !myShares.some(s => s.live)) return;
  clearTimeout(liveShareTimer);
  liveShareTimer = setTimeout(refreshLiveShares, 3000);
}

/* =====================================================================
   COMMUNITY DECKS — publish a deck publicly (shared_decks), like decks, surface popular ones in Browse
   deck.shareCode = its published code; RLS is owner-only, anon reads via the get_shared_deck RPC.
   ===================================================================== */
let deckShareTimer = null, deckShareBusy = false;
const lastDeckPush = new Map();   // shareCode -> JSON of the last-pushed snapshot (skip needless re-writes; NOT synced)
function deckShareUrl(code) { return vaultPageUrl('d.html') + '?id=' + code; }
function deckPushSig(deck) { return JSON.stringify({ name: deck.name, commander: deckCommander(deck) || '', data: deckShareData(deck) }); }
// curated, anonymous-readable snapshot (no private/collection data — just the deck list + art)
function deckShareData(deck) {
  const cards = deck.cards.map(c => ({
    name: c.name, qty: c.qty, type: category(c.name),
    img: displayImage(c.name) || '', uri: (card(c.name).uri) || '', price: +(priceOf(c.name) || 0).toFixed(2)
  }));
  return { owner: ownerDisplayName(), commander: deckCommander(deck) || '', colors: deckColors(deck), count: deck.cards.reduce((a, c) => a + c.qty, 0), cards };
}
async function publishDeck(deck) {
  if (!sb || !authUser) return { error: 'not signed in' };
  if (!deck.cards.length) return { error: 'empty' };
  const code = deck.shareCode || shareCode();   // reuse a stable code so re-publishing updates the same row
  const row = {
    code, owner: authUser.id, username: (authProfile && authProfile.username) || null,
    name: deck.name, commander: deckCommander(deck) || '', data: deckShareData(deck),
    public: true, updated_at: new Date().toISOString()
  };
  try {
    const { error } = await sb.from('shared_decks').upsert(row);
    if (error) return { error: error.message };
    deck.shareCode = code; lastDeckPush.set(code, deckPushSig(deck)); save();
    return { code, url: deckShareUrl(code) };
  } catch (e) { return { error: e.message }; }
}
async function unpublishDeck(deck) {
  if (!sb || !authUser || !deck.shareCode) return;
  const code = deck.shareCode;
  try { await sb.from('shared_decks').delete().eq('code', code).eq('owner', authUser.id); } catch (e) {}
  lastDeckPush.delete(code); communityDecks = null;   // drop the cached Browse community list so it refetches without this deck
  delete deck.shareCode; save();
}
// keep published decks' snapshots current when the deck changes (debounced off save → scheduleSyncPush)
function scheduleDeckShareRefresh() {
  if (!sb || !authUser || !state.decks.some(d => d.shareCode)) return;
  clearTimeout(deckShareTimer); deckShareTimer = setTimeout(refreshPublishedDecks, 3500);
}
async function refreshPublishedDecks() {
  if (!sb || !authUser || deckShareBusy) return;
  const uid = authUser.id; deckShareBusy = true;
  try {
    for (const d of state.decks.filter(x => x.shareCode)) {
      if (!authUser || authUser.id !== uid) return;
      const sig = deckPushSig(d);
      if (lastDeckPush.get(d.shareCode) === sig) continue;   // unchanged since last push — skip the write
      try {
        const { error } = await sb.from('shared_decks').update({ name: d.name, commander: deckCommander(d) || '', data: deckShareData(d), updated_at: new Date().toISOString() }).eq('code', d.shareCode).eq('owner', uid);
        if (!error) lastDeckPush.set(d.shareCode, sig);
      } catch (e) {}
    }
  } finally { deckShareBusy = false; }
}

/* deck-share modal (publish / copy link + QR / unpublish) */
let deckShareDeckId = null;
function openDeckShare(deckId) {
  deckShareDeckId = deckId || currentDeckId;
  const m = $('#deckShareModal'); if (m) m.hidden = false;
  renderDeckShareModal();
}
function closeDeckShare() { const m = $('#deckShareModal'); if (m) m.hidden = true; deckShareDeckId = null; }
function renderDeckShareModal() {
  const body = $('#deckShareBody'); if (!body) return;
  const deck = state.decks.find(d => d.id === deckShareDeckId);
  if (!deck) { body.innerHTML = `<p class="share-note">${tr('Deck not found.')}</p>`; return; }
  if (!sb || !authUser) {
    body.innerHTML = `<div class="share-signin"><p>${tr('Create a free account to publish decks to the community — others can view and like them.')}</p><button class="btn gold" id="deckShareSignIn">${tr('Sign in / Create account')}</button></div>`;
    return;
  }
  if (deck.shareCode) {
    const url = deckShareUrl(deck.shareCode);
    const qrMarkup = qrSvg(url, { margin: 4 });
    body.innerHTML = `
      <div class="share-result">
        <div class="share-result-h"><i class="ms ms-counter-gold" aria-hidden="true"></i> ${tr('Published to the community')}</div>
        <div class="share-link-row"><input type="text" id="deckShareLink" readonly value="${esc(url)}" /><button class="btn gold" id="deckShareCopy">${tr('Copy')}</button></div>
        <p class="share-note">${tr('Anyone with this link can view {name} and like it. It updates automatically when you change the deck.', { name: '<b>' + esc(deck.name) + '</b>' })} <a href="${esc(url)}" target="_blank" rel="noopener">${tr('Open ↗')}</a></p>
        ${qrMarkup ? `<div class="share-qr"><div class="share-qr-code">${qrMarkup}</div><div class="share-qr-side"><div class="share-qr-cap">${tr('Scan to open on a phone.')}</div><button class="btn gold sm" id="deckShareQr">${tr('Download QR')}</button></div></div>` : ''}
      </div>
      <button class="btn share-create" id="deckUnpublishBtn"><i class="ms ms-counter-skull" aria-hidden="true"></i> ${tr('Unpublish this deck')}</button>`;
  } else {
    const n = deck.cards.reduce((a, c) => a + c.qty, 0);
    body.innerHTML = `
      <p class="share-lead">${tr(n === 1 ? 'Publish {name} — {n} card — so other players can view and like it. Your collection and prices stay private.' : 'Publish {name} — {n} cards — so other players can view and like it. Your collection and prices stay private.', { name: '<b>' + esc(deck.name) + '</b>', n })}</p>
      <button class="btn gold share-create" id="deckPublishBtn" ${deck.cards.length ? '' : 'disabled'}><i class="ms ms-commander" aria-hidden="true"></i> ${tr('Publish to community')}</button>`;
  }
}
async function doPublishDeck() {
  const deck = state.decks.find(d => d.id === deckShareDeckId); if (!deck) return;
  const btn = $('#deckPublishBtn'); if (btn) { btn.disabled = true; btn.textContent = tr('Publishing…'); }
  const r = await publishDeck(deck);
  if (r.error) { toast(r.error === 'empty' ? tr('This deck is empty — add cards first.') : tr('Could not publish:') + ' ' + r.error); renderDeckShareModal(); return; }
  renderDeckShareModal(); renderDeckDetail();
  const ok = await copyText(r.url);
  toast(ok ? tr('Deck published & link copied ✓') : tr('Deck published ✓'));
}
async function doUnpublishDeck() {
  const deck = state.decks.find(d => d.id === deckShareDeckId); if (!deck) return;
  if (!confirm(tr('Unpublish “{name}”? Its public link and any likes will be removed.', { name: deck.name }))) return;
  await unpublishDeck(deck);
  renderDeckShareModal(); renderDeckDetail();
  toast(tr('Deck unpublished.'));
}
let liveShareBusy = false;
async function refreshLiveShares() {
  if (!sb || !authUser || liveShareBusy) return;
  const uid = authUser.id;            // the user this refresh is FOR
  liveShareBusy = true;
  try {
    for (const s of myShares.filter(x => x.live)) {
      if (!authUser || authUser.id !== uid) return;   // signed out / switched user mid-flight → abandon
      const folderId = s.kind === 'sell' ? s.source : null;
      if (s.kind === 'sell' && !state.sellLists.some(l => l.id === folderId)) continue;   // folder deleted → stop updating
      const next = shareDataFor(s.kind, folderId);
      const title = shareTitleFor(s.kind, folderId);   // propagate sell-folder renames
      if (JSON.stringify(next) === JSON.stringify(s.data) && title === s.title) continue;   // nothing changed
      try {
        const { error } = await sb.from('shared_lists').update({ data: next, title, updated_at: new Date().toISOString() }).eq('code', s.code).eq('owner', uid);
        if (!error && authUser && authUser.id === uid) { s.data = next; s.title = title; }
      } catch (e) {}
    }
  } finally { liveShareBusy = false; }
}
async function copyText(t) { try { await navigator.clipboard.writeText(t); return true; } catch (e) { return false; } }

/* ---------- share modal ---------- */
function openShare(kind) {
  shareCtx = { kind, folderId: kind === 'sell' ? state.activeSellList : null, live: false };
  shareLastResult = null;
  const m = $('#shareModal'); if (m) m.hidden = false;
  renderShareModal();
}
function closeShare() { const m = $('#shareModal'); if (m) m.hidden = true; }
function renderShareModal() {
  const body = $('#shareBody'); if (!body) return;
  if (!sb || !authUser) {
    body.innerHTML = `<div class="share-signin"><p>${tr('Create a free account to make shareable links — your lists sync across your devices too.')}</p><button class="btn gold" id="shareSignIn">${tr('Sign in / Create account')}</button></div>`;
    return;
  }
  const { kind, folderId, live } = shareCtx;
  const title = shareTitleFor(kind, folderId);
  const shareData = shareDataFor(kind, folderId);   // buy share now folds in your binders as categories
  const items = shareData.items;
  const count = items.reduce((a, i) => a + i.qty, 0);
  const secNote = (shareData.sections && shareData.sections.length > 1) ? ` · <b>${tr('{n} categories', { n: shareData.sections.length })}</b>` : '';
  const existing = myShares.filter(s => s.kind === kind && (kind === 'buy' || s.source === folderId));
  const qrMarkup = shareLastResult ? qrSvg(shareLastResult.url, { margin: 4 }) : '';   // '' if the QR lib didn't load — then we omit the whole block (no dead button)
  const result = shareLastResult ? `
    <div class="share-result">
      <div class="share-result-h"><i class="ms ms-counter-gold" aria-hidden="true"></i> ${tr('Link ready')}${shareLastResult.live ? ' · <b>' + tr('live') + '</b>' : ''}</div>
      <div class="share-link-row"><input type="text" id="shareLinkInput" readonly value="${esc(shareLastResult.url)}" /><button class="btn gold" id="shareCopyBtn">${tr('Copy')}</button></div>
      <p class="share-note">${shareLastResult.live ? tr('This link always shows your current list.') : tr('A snapshot of your list right now — it won’t change. Expires in {n} days.', { n: SHARE_TTL_DAYS })} <a href="${esc(shareLastResult.url)}" target="_blank" rel="noopener">${tr('Open preview ↗')}</a></p>
      ${qrMarkup ? `<div class="share-qr">
        <div class="share-qr-code">${qrMarkup}</div>
        <div class="share-qr-side">
          <div class="share-qr-cap">${tr('Scan to open on a phone — great for trade posts & in person.')}</div>
          <button class="btn gold sm" id="shareQrDownload">${tr('Download QR')}</button>
        </div>
      </div>` : ''}
    </div>` : '';
  body.innerHTML = `
    ${result}
    <p class="share-lead">${tr(count === 1 ? 'Sharing {title} — {n} card' : 'Sharing {title} — {n} cards', { title: '<b>' + esc(title) + '</b>', n: count })}${secNote}${items.length ? '' : ' · <span class="share-empty">' + tr('this list is empty') + '</span>'}.</p>
    <div class="share-kindwrap">
      <button class="share-opt ${!live ? 'on' : ''}" data-sharelive="0"><div class="share-opt-t">${tr('Snapshot')}</div><div class="share-opt-d">${tr('Freezes the list as it is now. Best for a single trade.')}</div></button>
      <button class="share-opt ${live ? 'on' : ''}" data-sharelive="1"><div class="share-opt-t">${tr('Live link')}</div><div class="share-opt-d">${tr('Always shows your current list — updates when you change it.')}</div></button>
    </div>
    <button class="btn gold share-create" id="shareCreateBtn" ${items.length ? '' : 'disabled'}>${live ? tr('Create live link') : tr('Create link')}</button>
    ${existing.length ? `<div class="share-existing"><div class="share-existing-h">${tr('Existing links for this list')}</div>${existing.map(shareRowHtml).join('')}</div>` : ''}`;
}
function shareRowHtml(s) {
  const exp = s.expires_at ? tr('expires {date}', { date: new Date(s.expires_at).toLocaleDateString(I18N.locale()) }) : tr('no expiry');
  return `<div class="share-ex-row">
    <span class="share-ex-tag ${s.live ? 'live' : ''}">${s.live ? tr('LIVE') : tr('SNAP')}</span>
    <code class="share-ex-code">${esc(s.code)}</code>
    <span class="share-ex-meta">${esc(s.title || '')} · ${exp}</span>
    <button class="link-btn" data-shareqr="${esc(s.code)}">${tr('QR')}</button>
    <button class="link-btn" data-sharecopy="${esc(s.code)}">${tr('Copy')}</button>
    <button class="link-btn danger" data-sharerevoke="${esc(s.code)}">${tr('Revoke')}</button>
  </div>`;
}
async function doCreateShare() {
  const btn = $('#shareCreateBtn'); if (btn) { btn.disabled = true; btn.textContent = tr('Creating…'); }
  const r = await createShare(shareCtx.kind, shareCtx.folderId, shareCtx.live);
  if (r.error) { toast(r.error === 'empty' ? tr('That list is empty — nothing to share.') : r.error === 'not signed in' ? tr('Sign in to create a link.') : tr('Could not create the link:') + ' ' + r.error); if (btn) { btn.disabled = false; btn.textContent = shareCtx.live ? tr('Create live link') : tr('Create link'); } return; }
  shareLastResult = { url: r.url, live: shareCtx.live };
  renderShareModal();
  renderProfileView();   // keep the profile's "Shared links" card in sync (no-ops when that view is hidden)
  const ok = await copyText(r.url);
  toast(ok ? tr('Share link created & copied ✓') : tr('Share link created ✓'));
}
// share.html "Match with my lists" hands a list off via localStorage; consume it on boot.
// A SELL link (their haves) → match against MY Buy List; a BUY link (their wants) → match against MY Sell List.
const INCOMING_KEY = 'vault:incoming';
function consumeIncomingMatch() {
  let raw; try { raw = localStorage.getItem(INCOMING_KEY); } catch (e) {}
  if (!raw) return;
  try { localStorage.removeItem(INCOMING_KEY); } catch (e) {}
  let inc; try { inc = JSON.parse(raw); } catch (e) { return; }
  if (!inc || !inc.text) return;
  const who = (typeof inc.from === 'string' && inc.from.trim()) ? tr('{name}’s', { name: inc.from.trim() }) : tr('their');
  if (inc.kind === 'buy') {
    sellMatchText = inc.text; sellMatchOpen = true; setView('selllist'); renderSellList(); runSellMatch();
    toast(tr('Matched {who} wants against your Sell List.', { who }));
  } else {
    buyMatchText = inc.text; buyMatchOpen = true; setView('buylist'); renderBuyList(); runBuyMatch();
    toast(tr('Matched {who} list against your Buy List.', { who }));
  }
}
// s.html "Match my buy list" hands a store slug off via localStorage; on boot we match
// the user's buy list against that store's public for-sale inventory.
const INCOMING_BUY_STORE_KEY = 'vault:matchBuyStore';
function consumeIncomingBuyStore() {
  let slug; try { slug = localStorage.getItem(INCOMING_BUY_STORE_KEY); } catch (e) {}
  if (!slug) return;
  try { localStorage.removeItem(INCOMING_BUY_STORE_KEY); } catch (e) {}
  matchBuyAgainstStore(slug);
}
// d.html "Import this deck" hands the deck off via localStorage; import it into the user's decks on boot.
const INCOMING_DECK_KEY = 'vault:incomingDeck';
async function consumeIncomingDeck() {
  let raw; try { raw = localStorage.getItem(INCOMING_DECK_KEY); } catch (e) {}
  if (!raw) return;
  try { localStorage.removeItem(INCOMING_DECK_KEY); } catch (e) {}
  let inc; try { inc = JSON.parse(raw); } catch (e) { return; }
  if (!inc || !Array.isArray(inc.cards) || !inc.cards.length) return;
  const name = (typeof inc.name === 'string' && inc.name.trim()) ? inc.name.trim().slice(0, 80) : 'Imported Deck';
  toast(tr('Importing “{name}”…', { name }));
  try {
    const want = inc.cards.map(c => ({ name: String(c.name || ''), qty: Math.max(1, parseInt(c.qty, 10) || 1) })).filter(c => c.name);
    const { resolved, missing } = await resolveCards(want);
    if (!resolved.length) { toast(tr('Could not import that deck — no cards resolved.')); return; }
    const cards = resolved.map(c => ({ name: c.name, qty: c.qty }));
    const deck = { id: uid(), name, cards, original: cards.map(c => ({ ...c })), commander: (typeof inc.commander === 'string' ? inc.commander : '') };
    state.decks.push(deck);
    save(); render(); openDeck(deck.id);
    toast(tr('Imported “{name}”', { name }) + (missing ? ' · ' + tr(missing === 1 ? '{n} card not found' : '{n} cards not found', { n: missing }) : '') + '.');
  } catch (e) { toast(tr('Scryfall lookup failed — try again.')); }
}

/* =====================================================================
   STORE PROFILES (admin-gated) — create via your invite, manage info/hours/events, publish library
   ===================================================================== */
let myStore = null;             // the active store I manage | null
let myStores = [];              // all stores I manage (owner or staff)
let storeEvents = [];           // myStore's events (owner editing)
let storeTx = [];               // myStore's recent transactions (sales / stock-ins ledger)
let storeMembers = [];          // myStore's members (owner + managers)
let pendingStoreInvite = null;  // ?store-invite=CODE captured at boot until sign-in
let pendingStaffInvite = null;  // ?store-staff=CODE captured at boot until sign-in
let storeInviteResult = '';     // last-minted invite link (admin modal)
let storeSaveTimer = null;
let editingEventId = null;      // event being edited in the modal, or null = new
// --- event registrations + results (owner-only inline panel under an event row) ---
let manageEventId = null;       // the event whose registrations/results panel is open, or null
let eventRegs = [];             // get_event_registrations() rows for manageEventId
let eventResultsMode = 'podium';// 'podium' (1st/2nd/3rd) | 'winners' (multiple) — English tokens, never translated
let eventResultEdits = {};      // working editor state: { [user_id]: placement (0=none, 1/2/3) }
let eventWalkins = [];          // walk-in players added via find_player: { user_id, username, display_name }
// store inventory UI state (the store's OWN inventory — every card is for sale unless reserved)
let storeInvMode = 'list', storeInvQuery = '', storeInvBinder = '', storeInvShown = 80;
let selectedInv = new Set();    // inventory cards selected for bulk actions (keys = name|binder|foil)
function isStoreAdmin() { return !!(authProfile && authProfile.is_admin); }
function hasStore() { return !!myStore; }
function storePublicUrl(slug) { return vaultPageUrl('s.html') + '?s=' + encodeURIComponent(slug); }
function storeInviteUrl(code) { return vaultPageUrl('') + '?store-invite=' + code; }

async function loadMyStore() {
  myStore = null; myStores = []; storeEvents = [];
  if (!sb || !authUser) return;
  try {
    const { data: mem } = await sb.from('store_members').select('store_slug, role');
    const slugs = (mem || []).map(m => m.store_slug);
    if (!slugs.length) return;
    const { data: stores } = await sb.from('store_profiles').select('*').in('slug', slugs);
    myStores = stores || [];
    myStore = myStores.find(s => s.owner === authUser.id) || myStores[0] || null;   // a store I own takes precedence as the active one
    if (myStore) { await loadStoreEvents(); loadStoreTransactions(); loadStoreMembers(); }
  } catch (e) {}
}
function isStoreOwner() { return !!(myStore && authUser && myStore.owner === authUser.id); }
function storeStaffInviteUrl(code) { return vaultPageUrl('') + '?store-staff=' + code; }
async function loadStoreMembers() {
  storeMembers = [];
  if (!sb || !myStore) return;
  try { const { data } = await sb.rpc('get_store_members', { p_slug: myStore.slug }); storeMembers = Array.isArray(data) ? data : []; renderStoreStaff(); } catch (e) {}
}
async function generateStoreStaffInvite() {
  if (!sb || !myStore || !isStoreOwner()) { toast(tr('Only the store owner can invite staff.')); return; }
  const code = shareCode();
  try {
    const { error } = await sb.rpc('create_store_staff_invite', { p_slug: myStore.slug, p_code: code });
    if (error) { toast(tr('Could not create staff invite:') + ' ' + error.message); return; }
    const url = storeStaffInviteUrl(code), box = $('#storeStaffInvite');
    if (box) {
      const qr = qrSvg(url, { margin: 4 });
      box.innerHTML = `<div class="share-result"><div class="share-result-h"><i class="ms ms-counter-lore" aria-hidden="true"></i> ${tr('Staff invite link')}</div>
        <div class="share-link-row"><input type="text" id="staffInviteLink" readonly value="${esc(url)}" /><button class="btn gold" id="staffInviteCopy">${tr('Copy')}</button></div>
        <p class="share-note">${tr('Send this to a co-manager. When they open it while signed in, they join as a {manager}. Works once.', { manager: '<b>' + tr('manager') + '</b>' })}</p>
        ${qr ? `<div class="share-qr"><div class="share-qr-code">${qr}</div><div class="share-qr-side"><div class="share-qr-cap">${tr('Or have them scan this.')}</div><button class="btn gold sm" id="staffInviteQr">${tr('Download QR')}</button></div></div>` : ''}</div>`;
    }
    copyText(url);
    toast(tr('Staff invite created & copied ✓'));
  } catch (e) { toast(tr('Could not create staff invite.')); }
}
async function removeStoreMember(uid) {
  if (!sb || !myStore || !isStoreOwner()) return;
  const m = storeMembers.find(x => x.user_id === uid);
  if (!confirm(tr('Remove {who} from the store?', { who: m && m.username ? '@' + m.username : tr('this manager') }))) return;
  try {
    const { error } = await sb.rpc('remove_store_member', { p_slug: myStore.slug, p_user: uid });
    if (error) { toast(tr('Could not remove:') + ' ' + error.message); return; }
    await loadStoreMembers(); toast(tr('Manager removed.'));
  } catch (e) { toast(tr('Could not remove the manager.')); }
}
function renderStoreStaff() {
  const list = $('#storeStaffList'); if (!list) return;
  if (!storeMembers.length) { list.innerHTML = `<p class="bd-note">${tr('Loading…')}</p>`; return; }
  list.innerHTML = storeMembers.map(m => {
    const owner = m.role === 'owner';
    const who = m.username ? '@' + esc(m.username) : (m.display_name ? esc(m.display_name) : tr('Member'));
    return `<div class="store-staff-row"><span class="ss-role${owner ? ' owner' : ''}">${owner ? tr('Owner') : tr('Manager')}</span><span class="ss-who">${who}</span>${(isStoreOwner() && !owner) ? `<button class="link-btn danger" data-staffrm="${esc(m.user_id)}">${tr('Remove')}</button>` : ''}</div>`;
  }).join('');
}

/* ---- redeem a staff invite (?store-staff=) → join the store as a manager ---- */
function consumeStaffInvite() {
  let code = null;
  try { code = new URLSearchParams(location.search).get('store-staff'); } catch (e) {}
  if (!code) return;
  try { const url = new URL(location.href); url.searchParams.delete('store-staff'); history.replaceState(null, '', url.toString()); } catch (e) {}
  pendingStaffInvite = code;
  if (authUser) redeemStaffInvite();
  else setTimeout(() => { if (pendingStaffInvite && !authUser) { toast(tr('Sign in to join this store as staff.')); openAuth('signup'); } }, 1800);
}
async function redeemStaffInvite() {
  if (!sb || !authUser || !pendingStaffInvite) return;
  const code = pendingStaffInvite; pendingStaffInvite = null;
  try {
    const { error } = await sb.rpc('redeem_store_staff_invite', { p_code: code });
    if (error) { toast(tr('Staff invite:') + ' ' + error.message); return; }
    await loadMyStore(); refreshStoreMenu();
    setView('store'); render();
    toast(tr('You’re now a manager of this store.'));
  } catch (e) { toast(tr('Could not join the store.')); }
}
async function loadStoreEvents() {
  if (!sb || !myStore) { storeEvents = []; return; }
  try { const { data } = await sb.from('store_events').select('*').eq('store_slug', myStore.slug).order('starts_at'); storeEvents = Array.isArray(data) ? data : []; } catch (e) { storeEvents = []; }
}
async function loadStoreTransactions() {
  storeTx = [];
  if (!sb || !myStore) return;
  try { const { data } = await sb.from('store_transactions').select('*').eq('store_slug', myStore.slug).order('created_at', { ascending: false }).limit(250); storeTx = Array.isArray(data) ? data : []; renderStoreHistory(); } catch (e) {}
}
// record a sale or a stock-in to the immutable ledger (fire-and-forget; prepends + re-renders on success)
function recordStoreTx(kind, name, qty, unitPrice) {
  if (!sb || !myStore) return;
  const q = Number(qty) || 1, up = +(Number(unitPrice) || 0).toFixed(2);
  const row = { store_slug: myStore.slug, kind, name, qty: q, unit_price: up, value: +(up * q).toFixed(2) };
  try {
    sb.from('store_transactions').insert(row).then(({ error }) => {
      if (!error) { storeTx.unshift({ ...row, created_at: new Date().toISOString() }); if (storeTx.length > 250) storeTx.pop(); renderStoreHistory(); }
    });
  } catch (e) {}
}
function refreshStoreMenu() {
  const inv = $('#genStoreInvite'); if (inv) inv.hidden = !isStoreAdmin();
  const my = $('#myStoreBtn'); if (my) my.hidden = !hasStore();
}

/* ---- admin: mint a one-time store invite ---- */
async function generateStoreInvite() {
  if (!sb || !authUser || !isStoreAdmin()) { toast(tr('Admins only.')); return; }
  const note = prompt(tr('Store invite — a note for you (e.g. the store this is for):'), '');
  if (note === null) return;
  const code = shareCode();
  try {
    const { error } = await sb.rpc('create_store_invite', { p_code: code, p_note: note || null });
    if (error) { toast(tr('Could not create invite:') + ' ' + error.message); return; }
    storeInviteResult = storeInviteUrl(code);
    const m = $('#storeInviteModal'); if (m) m.hidden = false;
    renderStoreInviteModal();
    copyText(storeInviteResult);
  } catch (e) { toast(tr('Could not create invite.')); }
}
function closeStoreInvite() { const m = $('#storeInviteModal'); if (m) m.hidden = true; }
function renderStoreInviteModal() {
  const body = $('#storeInviteBody'); if (!body) return;
  const url = storeInviteResult, qr = qrSvg(url, { margin: 4 });
  body.innerHTML = `<p class="share-note">${tr('Send this one-time link to a store owner. When they open it while signed in, they can create their store. It works once.')}</p>
    <div class="share-link-row"><input type="text" id="storeInviteLink" readonly value="${esc(url)}" /><button class="btn gold" id="storeInviteCopy">${tr('Copy')}</button></div>
    ${qr ? `<div class="share-qr"><div class="share-qr-code">${qr}</div><div class="share-qr-side"><div class="share-qr-cap">${tr('Or have them scan this.')}</div><button class="btn gold sm" id="storeInviteQr">${tr('Download QR')}</button></div></div>` : ''}`;
}

/* ---- redeem an invite + create the store ---- */
function consumeStoreInvite() {
  let code = null;
  try { code = new URLSearchParams(location.search).get('store-invite'); } catch (e) {}
  if (!code) return;
  try { const url = new URL(location.href); url.searchParams.delete('store-invite'); history.replaceState(null, '', url.toString()); } catch (e) {}
  pendingStoreInvite = code;
  // the auth session restores async after boot — if already signed in, prompt now; otherwise afterSignIn() will,
  // and if no session restores at all, fall back to asking them to sign in.
  if (authUser) maybePromptStoreCreate();
  else setTimeout(() => { if (pendingStoreInvite && !authUser) { toast(tr('Sign in or create an account to set up your store.')); openAuth('signup'); } }, 1800);
}
function maybePromptStoreCreate() {
  if (!pendingStoreInvite) return;
  if (!authUser) { toast(tr('Sign in (or make an account) to set up your store.')); openAuth('signup'); return; }
  if (myStore) { toast(tr('This account already runs a store.')); pendingStoreInvite = null; setView('store'); render(); return; }
  closeAuth();   // dismiss any auth modal a slow session-restore may have popped, so it can't stack behind the create modal
  const m = $('#storeCreateModal'); if (m) m.hidden = false; renderStoreCreate();
}
function closeStoreCreate() { const m = $('#storeCreateModal'); if (m) m.hidden = true; pendingStoreInvite = null; }
function renderStoreCreate() {
  const body = $('#storeCreateBody'); if (!body) return;
  body.innerHTML = `<p class="share-note">${tr("You've been invited to open a store on The Vault. Pick a name and a web address.")}</p>
    <label class="ve-field"><span>${tr('Store name')}</span><input type="text" id="scName" class="text-input" maxlength="60" placeholder="${esc(tr('Wonderland TCG'))}" /></label>
    <label class="ve-field"><span>${tr('Store address')} <em>${tr('(letters, numbers, dashes)')}</em></span><div class="slug-row"><span class="slug-pre">…/s.html?s=</span><input type="text" id="scSlug" class="text-input" maxlength="40" placeholder="wonderland" /></div></label>
    <div class="modal-status" id="scStatus"></div>
    <button class="btn gold" id="scCreate">${tr('Create my store')}</button>`;
}
async function doRedeemStore() {
  const name = ($('#scName') ? $('#scName').value : '').trim();
  const slug = ($('#scSlug') ? $('#scSlug').value : '').trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
  const st = $('#scStatus');
  if (!name) { if (st) st.textContent = tr('Enter a store name.'); return; }
  if (slug.length < 3) { if (st) st.textContent = tr('The address needs at least 3 letters or numbers.'); return; }
  if (!pendingStoreInvite) { if (st) st.textContent = tr('Your invite link is missing — reopen it.'); return; }
  const btn = $('#scCreate'); if (btn) { btn.disabled = true; btn.textContent = tr('Creating…'); }
  try {
    const { error } = await sb.rpc('redeem_store_invite', { p_code: pendingStoreInvite, p_slug: slug, p_name: name });
    if (error) { if (st) st.textContent = error.message; if (btn) { btn.disabled = false; btn.textContent = tr('Create my store'); } return; }
    pendingStoreInvite = null;
    await loadMyStore(); refreshStoreMenu();
    closeStoreCreate(); setView('store'); render();
    toast(tr('Your store is live! Add your hours, events and library.'));
  } catch (e) { if (st) st.textContent = tr('Something went wrong.'); if (btn) { btn.disabled = false; btn.textContent = tr('Create my store'); } }
}

/* ---- store dashboard (owner editor) ---- */
const STORE_DAYS = [['mon', 'Mon'], ['tue', 'Tue'], ['wed', 'Wed'], ['thu', 'Thu'], ['fri', 'Fri'], ['sat', 'Sat'], ['sun', 'Sun']];
// 30-min time slots 00:00–23:30. value is always 'HH:MM' 24h (what s.html parses); label is a friendly 12h time.
const TIME_SLOTS = (() => { const out = []; for (let m = 0; m < 24 * 60; m += 30) { const h = Math.floor(m / 60), mm = m % 60; out.push(String(h).padStart(2, '0') + ':' + String(mm).padStart(2, '0')); } return out; })();
function timeLabel12(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  // localized label (e.g. en → "6:00 PM", es → "18:00"); the stored VALUE stays 'HH:MM' 24h
  try { return new Date(2000, 0, 1, h, m).toLocaleTimeString(I18N.locale(), { hour: 'numeric', minute: '2-digit' }); }
  catch (e) { const ap = h < 12 ? 'AM' : 'PM', h12 = (h % 12) || 12; return `${h12}:${String(m).padStart(2, '0')} ${ap}`; }
}
// <option> list for a time <select>; `sel` = currently-selected 'HH:MM' ('' = the placeholder).
function timeSelectOptions(sel, placeholder) {
  return `<option value="">${esc(placeholder || '—')}</option>` +
    TIME_SLOTS.map(t => `<option value="${t}"${t === sel ? ' selected' : ''}>${timeLabel12(t)}</option>`).join('');
}
function renderStoreDashboard() {
  const el = $('#storeDashboard'); if (!el) return;
  if (!authUser) { el.innerHTML = `<div class="empty-state" style="padding:60px 20px"><span class="empty-mark"><i class="ms ms-counter-lore"></i></span><h2>${tr('Sign in')}</h2><p>${tr('Store management needs your account.')}</p></div>`; return; }
  if (!myStore) { el.innerHTML = `<div class="empty-state" style="padding:60px 20px"><span class="empty-mark"><i class="ms ms-counter-lore"></i></span><h2>${tr('No store on this account')}</h2><p>${tr('Store profiles are invite-only. If you run a game store and want one, ask for an invite link.')}</p></div>`; return; }
  const s = myStore, soc = s.socials || {}, hours = s.hours || {};
  const fld = (key, label, ph, val, type) => `<label class="ve-field"><span>${label}</span><input type="${type || 'text'}" class="text-input" data-storefield="${key}" value="${esc(val || '')}" placeholder="${esc(ph || '')}" /></label>`;
  const socFld = (key, label, ph) => `<label class="ve-field"><span>${label}</span><input type="text" class="text-input" data-social="${key}" value="${esc(soc[key] || '')}" placeholder="${esc(ph)}" /></label>`;
  const dayRow = (k, lbl) => {
    const h = hours[k] || {};
    const closed = !(h.open || h.close);
    const dis = closed ? ' disabled' : '';
    return `<div class="hr-row${closed ? ' is-closed' : ''}" data-hrday="${k}">
      <span class="hr-day">${lbl}</span>
      <label class="hr-closed"><input type="checkbox" class="hr-closedbox" data-hours="${k}" data-bound="closed"${closed ? ' checked' : ''} /> ${tr('Closed')}</label>
      <select class="hr-time hr-select" data-hours="${k}" data-bound="open"${dis}>${timeSelectOptions(h.open || '', tr('Open'))}</select>
      <span class="hr-dash">–</span>
      <select class="hr-time hr-select" data-hours="${k}" data-bound="close"${dis}>${timeSelectOptions(h.close || '', tr('Close'))}</select>
    </div>`;
  };
  el.innerHTML = `
    <div class="store-head">
      <div><h2 class="view-title">${esc(s.name)} <span class="verified-chip"><i class="ms ms-counter-shield"></i> ${tr('Verified')}</span></h2>
      <p class="view-sub"><a href="${esc(storePublicUrl(s.slug))}" target="_blank" rel="noopener">${tr('View public page ↗')}</a> · <span id="storeSaveState" class="store-savestate"></span></p>
      <p class="view-sub store-social" id="storeSocialLine" hidden></p></div>
      <div class="store-head-actions">
        <button class="btn" id="storeCopyLink"><i class="ms ms-counter-lore btn-ico"></i> ${tr('Copy link')}</button>
      </div>
    </div>
    <div class="store-grid">
      <section class="store-card"><h3>${tr('Details')}</h3>
        ${fld('name', tr('Store name'), '', s.name)}
        <label class="ve-field"><span>${tr('Bio')}</span><textarea class="text-input store-bio" data-storefield="bio" maxlength="400" placeholder="${tr("What's your store about?")}">${esc(s.bio || '')}</textarea></label>
        <div class="store-2col">${fld('city', tr('City'), 'Lima', s.city)}${fld('country', tr('Country'), 'Peru', s.country)}</div>
        ${fld('address', tr('Address'), 'Av. Larco 345, Miraflores', s.address)}
        <div class="store-2col">${fld('phone', tr('Phone'), '', s.phone)}${fld('whatsapp', tr('WhatsApp'), '+51…', s.whatsapp)}</div>
        ${fld('website', tr('Website'), 'https://…', s.website)}
        ${fld('logo', tr('Logo image URL'), 'https://…', s.logo)}
        <label class="pv-toggle" style="margin-top:8px"><input type="checkbox" id="storeShowOwner" ${s.show_owner ? 'checked' : ''}/> ${tr('Link my store & player profile to each other (shows “Run by @{user}” here and “Runs {store}” on my profile)', { user: esc((authProfile && authProfile.username) || 'me'), store: esc(s.name) })}</label>
      </section>
      <section class="store-card">
        <h3>${tr('Socials')}</h3>
        ${socFld('instagram', 'Instagram', 'https://instagram.com/…')}
        ${socFld('facebook', 'Facebook', 'https://facebook.com/…')}
        ${socFld('x', 'X / Twitter', 'https://x.com/…')}
        ${socFld('discord', 'Discord', 'https://discord.gg/…')}
        <h3 style="margin-top:20px">${tr('Open hours')}</h3>
        <div class="hours-editor">${STORE_DAYS.map(([k, l]) => dayRow(k, tr(l))).join('')}</div>
        <button class="btn ghost sm" id="storeCopyMon" style="margin-top:10px"><i class="ms ms-counter-lore btn-ico" aria-hidden="true"></i> ${tr('Copy Monday to all days')}</button>
      </section>
    </div>
    <section class="store-card store-inv">
      <div class="store-card-h"><h3>${tr('Inventory')} <span class="store-savestate" id="invCount"></span></h3>
        <div class="seg" id="storeInvMode"><button class="seg-btn ${storeInvMode === 'art' ? 'is-active' : ''}" data-imode="art"><i class="ms ms-token"></i> ${tr('Art')}</button><button class="seg-btn ${storeInvMode === 'list' ? 'is-active' : ''}" data-imode="list"><i class="ms ms-multiple"></i> ${tr('List')}</button></div>
      </div>
      <p class="bd-note" style="margin:0 0 12px">${tr('Every card here is automatically for sale (at Card Kingdom price) — unless you mark it {reserved}. Search a card and hit {sell} when one leaves the shelf.', { reserved: '<b>' + tr('Reserved') + '</b>', sell: '<b>' + tr('Sell') + '</b>' })} ${tr('Mark a card {display} to feature it in The Cabinet (shown but not for sale).', { display: '<b>' + tr('On display') + '</b>' })}</p>
      <div class="inv-actions">
        <button class="btn gold sm" id="invAddCards"><i class="ms ms-multiple btn-ico" aria-hidden="true"></i> ${tr('Add cards')}</button>
        <button class="btn sm" id="invRefreshPrices" title="${tr('Pull the latest Card Kingdom prices')}"><i class="ms ms-counter-gold btn-ico" aria-hidden="true"></i> ${tr('Refresh prices')}</button>
      </div>
      <div class="inv-binders" id="storeInvBinders"></div>
      <input type="search" id="invSearchInput" class="lib-search" placeholder="${tr('Search your inventory…')}" value="${esc(storeInvQuery)}" autocomplete="off" />
      <div class="inv-bulk" id="invBulk" hidden></div>
      <div id="storeInvBody"></div>
    </section>
    <section class="store-card"><div class="store-card-h"><h3>${tr('Events')}</h3><button class="btn gold sm" id="storeAddEvent">${tr('+ Add event')}</button></div>
      <div id="storeEventList"></div></section>
    <section class="store-card"><div class="store-card-h"><h3>${tr('Sales & history')}</h3><span class="store-savestate" id="storeHistSummary"></span></div>
      <div id="storeHistList"></div></section>
    <section class="store-card"><div class="store-card-h"><h3>${tr('Staff')}</h3>${isStoreOwner() ? `<button class="btn gold sm" id="storeGenStaff"><i class="ms ms-counter-lore btn-ico" aria-hidden="true"></i> ${tr('Invite staff')}</button>` : ''}</div>
      <p class="bd-note" style="margin:0 0 12px">${isStoreOwner() ? tr('Invite other Vault accounts to co-manage this store. They get their own login — no shared password.') : tr('You manage this store as staff.')}</p>
      <div id="storeStaffInvite"></div>
      <div id="storeStaffList"></div></section>`;
  renderStoreEventList();
  renderStoreInvBinders();
  renderStoreInventory();
  renderStoreHistory();
  renderStoreStaff();
  loadStoreSocial();
}
// Show "{n} collectors have added your store · ranked #{rank}" in the dashboard header. Best-effort.
async function loadStoreSocial() {
  const line = $('#storeSocialLine');
  if (!line || !sb || !myStore) return;
  try {
    const { data, error } = await sb.rpc('get_store_social', { p_slug: myStore.slug });
    if (error || !data) return;
    const n = Number(data.followers) || 0;
    const rank = (data.rank === null || data.rank === undefined) ? null : Number(data.rank);
    let txt = tr('{n} collectors have added your store', { n });
    if (rank !== null && !Number.isNaN(rank)) txt += ' ' + tr('· ranked #{rank}', { rank });
    line.textContent = txt;
    line.hidden = false;
  } catch (e) { /* graceful: no social line */ }
}
function renderStoreHistory() {
  const el = $('#storeHistList'); if (!el) return;
  const sum = $('#storeHistSummary');
  if (!storeTx.length) { el.innerHTML = `<p class="bd-note">${tr("No sales yet. The green {sell} button on a card logs each sale here — your running record of what's moved.", { sell: '<b>' + tr('Sell') + '</b>' })}</p>`; if (sum) sum.textContent = ''; return; }
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const sold = storeTx.filter(t => t.kind === 'sold');
  const soldToday = sold.filter(t => t.created_at && new Date(t.created_at) >= today);
  const todayQty = soldToday.reduce((a, t) => a + (Number(t.qty) || 0), 0), todayVal = soldToday.reduce((a, t) => a + (Number(t.value) || 0), 0);
  const shownVal = sold.reduce((a, t) => a + (Number(t.value) || 0), 0);
  if (sum) sum.textContent = tr('{qty} sold today · {todayVal} · {recentVal} recent', { qty: todayQty, todayVal: money(todayVal), recentVal: money(shownVal) });
  el.innerHTML = storeTx.slice(0, 80).map(t => {
    const when = t.created_at ? new Date(t.created_at).toLocaleString(I18N.locale(), { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '';
    const isSold = t.kind === 'sold';
    return `<div class="store-tx-row"><span class="tx-badge ${isSold ? 'sold' : 'stock'}">${isSold ? tr('Sold') : tr('Stocked')}</span><span class="tx-name">${esc(t.name)}</span><span class="tx-qty">${Number(t.qty) || 1}×</span><span class="tx-val${isSold ? ' sold' : ''}">${money(t.value)}</span><span class="tx-when">${esc(when)}</span></div>`;
  }).join('');
}
// 1→🏆 / 2→🥈 / 3→🥉 ; anything else → '' (medals are universal symbols, not translatable text)
function placementMedal(p) { return ({ 1: '🏆', 2: '🥈', 3: '🥉' })[Number(p)] || ''; }
function renderStoreEventList() {
  const el = $('#storeEventList'); if (!el) return;
  if (!storeEvents.length) { el.innerHTML = `<p class="bd-note">${tr('No events yet. Add your first — a Commander night, FNM, a tournament…')}</p>`; return; }
  const owner = isStoreOwner();
  el.innerHTML = storeEvents.map(ev => {
    const when = ev.starts_at ? new Date(ev.starts_at).toLocaleString(I18N.locale(), { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : tr('No date set');
    const bits = [ev.format, ev.recurring ? '↻ ' + ev.recurring : '', ev.prize_pool ? tr('Prize') + ' ' + ev.prize_pool : ''].filter(Boolean).join(' · ');
    const open = manageEventId === ev.id;
    return `<div class="store-ev-row"><div class="sev-main"><div class="sev-title">${esc(ev.title)}</div><div class="sev-when">${esc(when)}${bits ? ' · ' + esc(bits) : ''}</div></div>
      ${owner ? `<button class="link-btn${open ? ' is-active' : ''}" data-evmanage="${esc(ev.id)}">${tr('Registrations & results')}</button>` : ''}<button class="link-btn" data-evedit="${esc(ev.id)}">${tr('Edit')}</button><button class="link-btn danger" data-evdel="${esc(ev.id)}">${tr('Delete')}</button></div>
      ${open ? `<div class="ev-manage" id="evManage-${esc(ev.id)}">${renderEventManagePanel()}</div>` : ''}`;
  }).join('');
}
// load registrations for an event, then re-render the list (panel rebuilds from eventRegs)
async function loadEventRegs(id) {
  eventRegs = []; eventResultEdits = {}; eventWalkins = []; eventResultsMode = 'podium';
  if (sb && isStoreOwner() && id) {
    try {
      const { data, error } = await sb.rpc('get_event_registrations', { p_event_id: id });
      if (!error && Array.isArray(data)) {
        eventRegs = data;
        // seed editor state from any existing placements
        eventRegs.forEach(r => { if (r.placement) eventResultEdits[r.user_id] = Number(r.placement); });
      }
    } catch (e) { /* graceful: empty panel */ }
  }
  renderStoreEventList();
}
// build the inline panel HTML for the currently-open event (manageEventId)
function renderEventManagePanel() {
  if (!isStoreOwner()) return '';
  // combine registrants + any walk-ins added in this editor session (walk-ins not already registered)
  const regIds = new Set(eventRegs.map(r => r.user_id));
  const people = eventRegs.concat(eventWalkins.filter(w => !regIds.has(w.user_id)).map(w => ({ ...w, status: null, walkin: true })));
  if (!people.length && !eventWalkins.length) {
    return `<p class="bd-note ev-manage-note">${tr('No registrations yet.')}</p>` + walkinAdderHtml();
  }
  const rows = people.map(r => {
    const who = esc(r.display_name || ('@' + (r.username || '')));
    const cur = Number(eventResultEdits[r.user_id]) || 0;
    const statusChip = r.walkin ? `<span class="ev-chip walkin">${tr('Walk-in')}</span>`
      : `<span class="ev-chip ${r.status === 'waitlist' ? 'waitlist' : 'going'}">${r.status === 'waitlist' ? tr('Waitlist') : tr('Going')}</span>`;
    let editor;
    if (eventResultsMode === 'winners') {
      editor = `<label class="ev-win-toggle"><input type="checkbox" data-evwin="${esc(r.user_id)}" ${cur === 1 ? 'checked' : ''}/> ${tr('Winner')}</label>`;
    } else {
      const opt = (v, lbl) => `<option value="${v}" ${cur === v ? 'selected' : ''}>${lbl}</option>`;
      editor = `<select class="ev-place-sel" data-evplace="${esc(r.user_id)}">${opt(0, tr('None'))}${opt(1, '🏆 ' + tr('1st'))}${opt(2, '🥈 ' + tr('2nd'))}${opt(3, '🥉 ' + tr('3rd'))}</select>`;
    }
    return `<div class="ev-reg-row"><span class="ev-reg-who">${who} ${statusChip}</span><span class="ev-reg-medal">${placementMedal(cur)}</span><span class="ev-reg-edit">${editor}</span></div>`;
  }).join('');
  return `<div class="ev-results-head">
      <span class="ev-results-title">${tr('Results')}</span>
      <div class="seg ev-mode-seg"><button class="seg-btn ${eventResultsMode === 'podium' ? 'is-active' : ''}" data-evmode="podium">${tr('Podium')}</button><button class="seg-btn ${eventResultsMode === 'winners' ? 'is-active' : ''}" data-evmode="winners">${tr('Winners')}</button></div>
    </div>
    <div class="ev-reg-list">${rows}</div>
    ${walkinAdderHtml()}
    <div class="ev-results-actions"><button class="btn gold sm" data-evsaveresults="${esc(manageEventId)}">${tr('Save results')}</button></div>`;
}
function walkinAdderHtml() {
  return `<div class="ev-walkin"><input type="text" class="pv-search-input" id="evWalkinInput" placeholder="${tr('Add player by @username')}" autocomplete="off" /><button class="btn sm" id="evWalkinAdd">${tr('Add')}</button><span class="ev-walkin-msg" id="evWalkinMsg"></span></div>`;
}
// resolve a @username via find_player and add to the working walk-in list
async function addEventWalkin() {
  const inp = $('#evWalkinInput'), msg = $('#evWalkinMsg');
  const u = ((inp && inp.value) || '').trim().replace(/^@/, '');
  if (!u) return;
  if (!sb) { if (msg) msg.textContent = tr('No player with that username.'); return; }
  try {
    const { data, error } = await sb.rpc('find_player', { p_username: u });
    const hit = (!error && Array.isArray(data) && data[0]) ? data[0] : null;
    if (!hit) { if (msg) msg.textContent = tr('No player with that username.'); return; }
    if (!eventWalkins.some(w => w.user_id === hit.user_id) && !eventRegs.some(r => r.user_id === hit.user_id)) eventWalkins.push(hit);
    renderStoreEventList();
  } catch (e) { if (msg) msg.textContent = tr('No player with that username.'); }
}
// build p_results from the editor and persist via set_event_results
async function saveEventResults(id) {
  if (!sb || !isStoreOwner() || !id) return;
  const results = Object.keys(eventResultEdits)
    .map(uid => ({ user_id: uid, placement: Number(eventResultEdits[uid]) || 0 }))
    .filter(r => r.placement >= 1 && r.placement <= 3);
  try {
    const { error } = await sb.rpc('set_event_results', { p_event_id: id, p_mode: eventResultsMode, p_results: results });
    if (error) { toast(tr('Could not save results.')); return; }
    await loadEventRegs(id);
    toast(tr('Results saved.'));
  } catch (e) { toast(tr('Could not save results.')); }
}
// debounced field save
function scheduleStoreSave() {
  const ss = $('#storeSaveState'); if (ss) ss.textContent = tr('Saving…');
  clearTimeout(storeSaveTimer); storeSaveTimer = setTimeout(saveStoreNow, 800);
}
async function saveStoreNow() {
  if (!sb || !myStore) return;
  if (!myStore.name || !myStore.name.trim()) myStore.name = 'Store';   // keep in-memory == the NOT NULL fallback we persist
  const row = {
    name: myStore.name, bio: myStore.bio || null, city: myStore.city || null, country: myStore.country || null,
    address: myStore.address || null, phone: myStore.phone || null, whatsapp: myStore.whatsapp || null,
    website: myStore.website || null, logo: myStore.logo || null, socials: myStore.socials || {}, hours: myStore.hours || {},
    inventory: myStore.inventory || {}, show_owner: !!myStore.show_owner,
    updated_at: new Date().toISOString()
  };
  try {
    const { error } = await sb.from('store_profiles').update(row).eq('slug', myStore.slug);
    const ss = $('#storeSaveState'); if (ss) ss.textContent = error ? tr('Save failed') : tr('Saved ✓');
  } catch (e) { const ss = $('#storeSaveState'); if (ss) ss.textContent = tr('Save failed'); }
}
/* ---- store inventory (the store's OWN cards; every one is for sale unless reserved) ---- */
function storeInv() {
  if (!myStore) return { binders: [], cards: [] };
  myStore.inventory = myStore.inventory || {};
  if (!Array.isArray(myStore.inventory.binders)) myStore.inventory.binders = [];
  if (!Array.isArray(myStore.inventory.cards)) myStore.inventory.cards = [];
  return myStore.inventory;
}
function invCardAt(name, binder) { return storeInv().cards.find(c => key(c.name) === key(name) && (c.binder || '') === (binder || '')); }
// store prices come from the pricing system, Card Kingdom preferred (never set by hand)
function storePriceOf(name) { const ck = ckPriceOf(name, false); return ck > 0 ? ck : (priceOf(name) || 0); }
// add resolved cards (from the Add Cards modal in store mode) into the active store's inventory
function addResolvedToStore(resolved) {
  if (!myStore) return 0;
  const inv = storeInv(); let added = 0; const txRows = [];
  resolved.forEach(c => {
    const q = c.qty || 1, up = +(storePriceOf(c.name) || 0).toFixed(2);
    const ex = inv.cards.find(x => key(x.name) === key(c.name) && (x.binder || '') === (storeInvBinder || '') && !!x.foil === !!c.foil);
    if (ex) ex.qty += q;
    else inv.cards.push({ name: c.name, qty: q, price: up, set: c.set || (card(c.name).set || ''), foil: !!c.foil, binder: storeInvBinder || '', reserved: false, display: false });
    added += q;
    txRows.push({ store_slug: myStore.slug, kind: 'stocked', name: c.name, qty: q, unit_price: up, value: +(up * q).toFixed(2) });
  });
  if (sb && txRows.length) {   // one batch insert for the stock-in, not one per card
    try { sb.from('store_transactions').insert(txRows).then(({ error }) => { if (!error) { txRows.forEach(r => storeTx.unshift({ ...r, created_at: new Date().toISOString() })); storeTx = storeTx.slice(0, 250); renderStoreHistory(); } }); } catch (e) {}
  }
  return added;
}
function refreshStorePrices() {
  if (!myStore) return;
  storeInv().cards.forEach(c => { c.price = +(storePriceOf(c.name) || 0).toFixed(2); });
  scheduleStoreSave(); renderStoreInventory();
  toast(tr('Inventory prices refreshed from Card Kingdom.'));
}
// sell / restock a single copy — the core "keep a tight ship" action
function sellInvCopy(name, binder) {
  const c = invCardAt(name, binder); if (!c) return;
  recordStoreTx('sold', name, 1, c.price);   // log the sale to the ledger
  const left = c.qty - 1;
  if (left <= 0) { removeInvCard(name, binder); toast(tr('Sold the last {name} — out of stock.', { name })); }
  else { c.qty = left; scheduleStoreSave(); renderStoreInvBinders(); renderStoreInventory(); toast(tr('Sold 1 {name} · {n} left in stock.', { name, n: left })); }
}
function restockInvCopy(name, binder) {
  const c = invCardAt(name, binder); if (!c) return;
  c.qty += 1; recordStoreTx('stocked', name, 1, c.price); scheduleStoreSave(); renderStoreInvBinders(); renderStoreInventory();
  toast(tr('Restocked {name} · {n} in stock.', { name, n: c.qty }));
}
async function addInventoryCard(name) {
  name = (name || '').trim(); if (!name || !myStore) return;
  let meta = card(name);
  if (!meta || meta.notFound) {
    const st = $('#invAddStatus'); if (st) st.textContent = tr('Looking up…');
    try { const idx = await fetchCardData([{ name }]); const c = idx[key(name)] || idx[key(frontFace(name))]; if (c) { state.cards[key(c.name)] = distill(c); name = c.name; } else { if (st) st.textContent = tr('Couldn’t find “{name}”.', { name }); return; } }
    catch (e) { const st2 = $('#invAddStatus'); if (st2) st2.textContent = tr('Lookup failed — check your connection.'); return; }
  }
  const inv = storeInv();
  const ex = inv.cards.find(c => key(c.name) === key(name) && (c.binder || '') === (storeInvBinder || ''));
  if (ex) ex.qty += 1;
  else inv.cards.push({ name, qty: 1, price: +(priceOf(name) || 0).toFixed(2), set: (card(name).set || ''), foil: false, binder: storeInvBinder || '', reserved: false, display: false });
  scheduleStoreSave();
  const inp = $('#invAddInput'); if (inp) { inp.value = ''; inp.focus(); }
  renderStoreInvBinders(); renderStoreInventory();
  toast(tr('Added {name} to your inventory.', { name }));
}
function setInvQty(name, binder, q) { const c = invCardAt(name, binder); if (!c) return; if (q <= 0) storeInv().cards = storeInv().cards.filter(x => x !== c); else c.qty = q; scheduleStoreSave(); renderStoreInvBinders(); renderStoreInventory(); }
function setInvPrice(name, binder, p) { const c = invCardAt(name, binder); if (!c) return; c.price = Math.max(0, +(parseFloat(p) || 0).toFixed(2)); scheduleStoreSave(); }
function toggleInvReserved(name, binder) { const c = invCardAt(name, binder); if (!c) return; c.reserved = !c.reserved; scheduleStoreSave(); renderStoreInventory(); }
function toggleInvDisplay(name, binder) { const c = invCardAt(name, binder); if (!c) return; c.display = !c.display; scheduleStoreSave(); renderStoreInventory(); }
function removeInvCard(name, binder) { storeInv().cards = storeInv().cards.filter(c => !(key(c.name) === key(name) && (c.binder || '') === (binder || ''))); scheduleStoreSave(); renderStoreInvBinders(); renderStoreInventory(); }
function moveInvCard(name, binder, toBinder) { const c = invCardAt(name, binder); if (!c) return; c.binder = toBinder || ''; scheduleStoreSave(); renderStoreInvBinders(); renderStoreInventory(); }
// merge inventory entries that share name + binder + foil (sum their qty) — keeps the list tidy after bulk moves
function mergeInventoryDupes() {
  const inv = storeInv(), map = new Map();
  inv.cards.forEach(c => {
    const k = key(c.name) + '|' + (c.binder || '') + '|' + (c.foil ? 'F' : '');
    const hit = map.get(k);
    if (hit) hit.qty += (Number(c.qty) || 0); else map.set(k, c);
  });
  inv.cards = [...map.values()];
}
/* ---- inventory selection + bulk actions (select cards, then move / reserve / sell / remove) ---- */
function invSelKey(c) { return key(c.name) + '|' + (c.binder || '') + '|' + (c.foil ? 'F' : ''); }
function selectedInvCards() { return storeInv().cards.filter(c => selectedInv.has(invSelKey(c))); }
function toggleInvSel(selKey, el) {
  if (selectedInv.has(selKey)) selectedInv.delete(selKey); else selectedInv.add(selKey);
  const row = el && el.closest('.store-inv-row, .store-inv-tile'); if (row) row.classList.toggle('selected', selectedInv.has(selKey));
  renderInvBulkBar(); refreshInvSelAll();
}
function clearInvSelection() { selectedInv.clear(); renderStoreInventory(); }
function selectAllShown(on) {
  invFiltered().forEach(c => { const k = invSelKey(c); if (on) selectedInv.add(k); else selectedInv.delete(k); });
  renderStoreInventory();
}
function bulkMoveToBinder(toBinder) {
  const cards = selectedInvCards(); if (!cards.length) return;
  cards.forEach(c => { c.binder = toBinder || ''; });
  mergeInventoryDupes(); selectedInv.clear();
  scheduleStoreSave(); renderStoreInvBinders(); renderStoreInventory();
  const label = toBinder ? ((storeInv().binders.find(b => b.id === toBinder) || {}).name || tr('a binder')) : tr('Unfiled');
  toast(tr(cards.length === 1 ? 'Moved {n} card into “{label}”.' : 'Moved {n} cards into “{label}”.', { n: cards.length, label }));
}
function bulkSetReserved(val) {
  const cards = selectedInvCards(); if (!cards.length) return;
  cards.forEach(c => { c.reserved = val; });
  scheduleStoreSave(); renderStoreInventory();
  toast(tr(cards.length === 1 ? '{n} card marked {state}.' : '{n} cards marked {state}.', { n: cards.length, state: val ? tr('reserved') : tr('for sale') }));
}
function bulkSetDisplay(val) {
  const cards = selectedInvCards(); if (!cards.length) return;
  cards.forEach(c => { c.display = val; });
  scheduleStoreSave(); renderStoreInventory();
  toast(tr(cards.length === 1 ? '{n} card marked {state}.' : '{n} cards marked {state}.', { n: cards.length, state: val ? tr('on display') : tr('for sale') }));
}
function bulkSell() {
  const cards = selectedInvCards(); if (!cards.length) return;
  if (!confirm(tr(cards.length === 1 ? 'Sell one copy of each of the {n} selected card?' : 'Sell one copy of each of the {n} selected cards?', { n: cards.length }))) return;
  cards.forEach(c => { recordStoreTx('sold', c.name, 1, c.price); c.qty -= 1; });
  storeInv().cards = storeInv().cards.filter(c => c.qty > 0);   // drop sold-out
  selectedInv.clear();
  scheduleStoreSave(); renderStoreInvBinders(); renderStoreInventory();
  toast(tr(cards.length === 1 ? 'Sold 1 each — {n} card.' : 'Sold 1 each — {n} cards.', { n: cards.length }));
}
function bulkRemoveInv() {
  const cards = selectedInvCards(); if (!cards.length) return;
  if (!confirm(tr(cards.length === 1 ? 'Remove {n} selected card from inventory entirely?' : 'Remove {n} selected cards from inventory entirely?', { n: cards.length }))) return;
  storeInv().cards = storeInv().cards.filter(c => !selectedInv.has(invSelKey(c)));
  selectedInv.clear();
  scheduleStoreSave(); renderStoreInvBinders(); renderStoreInventory();
  toast(tr(cards.length === 1 ? 'Removed {n} card.' : 'Removed {n} cards.', { n: cards.length }));
}
function refreshInvSelAll() {
  const cb = $('#invSelAll'); if (!cb) return;
  const rows = invFiltered();
  cb.checked = rows.length > 0 && rows.every(c => selectedInv.has(invSelKey(c)));
}
function renderInvBulkBar() {
  const bar = $('#invBulk'); if (!bar) return;
  const n = selectedInv.size;
  if (!n) { bar.hidden = true; bar.innerHTML = ''; return; }
  const opts = `<option value="">${tr('Unfiled')}</option>` + storeInv().binders.map(b => `<option value="${b.id}">${esc(b.name)}</option>`).join('');
  bar.hidden = false;
  bar.innerHTML = `<span class="inv-bulk-label">${tr('{n} selected', { n })}</span>
    <span class="inv-bulk-move"><select id="invBulkBinder" class="siv-binder">${opts}</select><button class="btn sm" id="invBulkMove">${tr('Move here')}</button></span>
    <button class="btn sm" id="invBulkReserve">${tr('Reserve')}</button>
    <button class="btn sm" id="invBulkDisplay"><i class="ms ms-counter-lore" aria-hidden="true"></i> ${tr('Display')}</button>
    <button class="btn sm" id="invBulkForsale">${tr('For sale')}</button>
    <button class="btn sm" id="invBulkSell"><i class="ms ms-counter-gold" aria-hidden="true"></i> ${tr('Sell 1 each')}</button>
    <button class="btn sm danger" id="invBulkRemove">${tr('Remove')}</button>
    <button class="link-btn" id="invBulkClear">${tr('Clear')}</button>`;
}
function addInvBinder(nm) { nm = (nm || '').trim(); if (!nm || !myStore) return; storeInv().binders.push({ id: uid(), name: nm.slice(0, 40) }); scheduleStoreSave(); renderStoreInvBinders(); renderStoreInventory(); }
function renameInvBinder(id, nm) { const b = storeInv().binders.find(x => x.id === id); if (b && (nm || '').trim()) { b.name = nm.trim().slice(0, 40); scheduleStoreSave(); renderStoreInvBinders(); } }
function deleteInvBinder(id) { const inv = storeInv(); inv.binders = inv.binders.filter(b => b.id !== id); inv.cards.forEach(c => { if (c.binder === id) c.binder = ''; }); if (storeInvBinder === id) storeInvBinder = ''; scheduleStoreSave(); renderStoreInvBinders(); renderStoreInventory(); }
function invFiltered() {
  const q = storeInvQuery.trim().toLowerCase();
  return storeInv().cards.filter(c => (storeInvBinder === '' || (c.binder || '') === storeInvBinder) && (!q || c.name.toLowerCase().includes(q)));
}
function renderStoreInvBinders() {
  const el = $('#storeInvBinders'); if (!el || !myStore) return;
  const inv = storeInv();
  const total = inv.cards.reduce((a, c) => a + c.qty, 0), forsale = inv.cards.filter(c => !c.reserved && !c.display).reduce((a, c) => a + c.qty, 0), onDisplay = inv.cards.filter(c => c.display).reduce((a, c) => a + c.qty, 0);
  const cnt = $('#invCount'); if (cnt) cnt.textContent = total ? (tr('{total} cards · {forsale} for sale', { total, forsale }) + (onDisplay ? ' · ' + tr('{n} on display', { n: onDisplay }) : '')) : '';
  let html = `<button class="sell-folder${storeInvBinder === '' ? ' on' : ''}" data-invbinder="">${tr('All')}</button>`;
  html += inv.binders.map(b => {
    const on = storeInvBinder === b.id, n = inv.cards.filter(c => (c.binder || '') === b.id).length;
    return `<span class="sell-folder-wrap${on ? ' on' : ''}"><button class="sell-folder${on ? ' on' : ''}" data-invbinder="${b.id}"><i class="ms ms-token"></i> ${esc(b.name)}${n ? ` <span class="sf-count">${n}</span>` : ''}</button>${on ? `<button class="sf-icon" data-invbinderrename="${b.id}" title="${tr('Rename')}"><i class="ms ms-artist-nib"></i></button><button class="sf-icon" data-invbinderdel="${b.id}" title="${tr('Delete')}">✕</button>` : ''}</span>`;
  }).join('');
  html += `<button class="sell-folder add" data-invbindernew>${tr('+ New binder')}</button>`;
  el.innerHTML = html;
}
function renderStoreInventory() {
  const wrap = $('#storeInvBody'); if (!wrap || !myStore) return;
  const rows = invFiltered(), shown = rows.slice(0, storeInvShown);
  if (!rows.length) { wrap.innerHTML = `<p class="bd-note">${storeInvQuery ? tr('No cards match your search.') : tr('No cards here yet — add some above.')}</p>`; renderInvBulkBar(); return; }
  const binderOpts = (cur) => `<option value=""${!cur ? ' selected' : ''}>${tr('Unfiled')}</option>` + storeInv().binders.map(b => `<option value="${b.id}"${cur === b.id ? ' selected' : ''}>${esc(b.name)}</option>`).join('');
  const more = rows.length > storeInvShown ? `<button class="more-btn" id="invMore">${tr('Show {n} more', { n: rows.length - storeInvShown })}</button>` : '';
  const sel = (c) => selectedInv.has(invSelKey(c));
  const allSel = shown.length > 0 && shown.every(sel);
  const selAll = `<label class="inv-selall"><input type="checkbox" id="invSelAll" ${allSel ? 'checked' : ''}/> ${tr('Select all shown')}</label>`;
  if (storeInvMode === 'art') {
    wrap.innerHTML = selAll + `<div class="binder-gallery">${shown.map(c => `
      <div class="art-tile buy store-inv-tile${c.reserved ? ' reserved' : ''}${c.display ? ' on-display' : ''}${sel(c) ? ' selected' : ''}">
        <input type="checkbox" class="inv-sel art-pick" data-invselect="${esc(invSelKey(c))}" ${sel(c) ? 'checked' : ''} title="${tr('Select')}" />
        <button class="bd-x tile" data-invrm="${esc(c.name)}" data-invb="${esc(c.binder || '')}" title="${tr('Remove entirely')}">✕</button>
        <button class="siv-res-tile" data-invres="${esc(c.name)}" data-invb="${esc(c.binder || '')}" title="${c.reserved ? tr('Reserved (not for sale)') : tr('For sale — click to reserve')}"><i class="ms ms-counter-${c.reserved ? 'skull' : 'gold'}"></i></button>
        <button class="siv-disp-tile" data-invdisplay="${esc(c.name)}" data-invb="${esc(c.binder || '')}" title="${c.display ? tr('In The Cabinet (on display, not for sale)') : tr('Put on display in The Cabinet')}"><i class="ms ms-counter-${c.display ? 'lore' : 'shield'}"></i></button>
        <button class="art-open" data-name="${esc(c.name)}">${artTile(c.name, tr('{n} in stock', { n: c.qty }), `<span class="art-val">${money(c.price)}</span>`)}</button>
        <div class="siv-tile-sell"><button data-invsell="${esc(c.name)}" data-invb="${esc(c.binder || '')}" title="${tr('Sell one')}">${tr('Sell')}</button><button class="siv-tile-buy" data-invbuy="${esc(c.name)}" data-invb="${esc(c.binder || '')}" title="${tr('Restock one')}">+1</button></div>
      </div>`).join('')}</div>${more}`;
  } else {
    wrap.innerHTML = selAll + `<div class="inv-rows">${shown.map(c => `
      <div class="store-inv-row${c.reserved ? ' reserved' : ''}${c.display ? ' on-display' : ''}${sel(c) ? ' selected' : ''}">
        <input type="checkbox" class="inv-sel" data-invselect="${esc(invSelKey(c))}" ${sel(c) ? 'checked' : ''} title="${tr('Select')}" />
        <span class="siv-name nm" data-name="${esc(c.name)}">${esc(c.name)}</span>
        <span class="siv-stock">${tr('{n} in stock', { n: c.qty })}</span>
        <span class="siv-price">${money(c.price)}</span>
        <button class="siv-sell" data-invsell="${esc(c.name)}" data-invb="${esc(c.binder || '')}" title="${tr('Sell one copy')}"><i class="ms ms-counter-gold" aria-hidden="true"></i> ${tr('Sell')}</button>
        <button class="siv-buy" data-invbuy="${esc(c.name)}" data-invb="${esc(c.binder || '')}" title="${tr('Add one copy (restock)')}">+1</button>
        ${storeInv().binders.length ? `<select class="siv-binder" data-invmove="${esc(c.name)}" data-invb="${esc(c.binder || '')}">${binderOpts(c.binder || '')}</select>` : ''}
        <button class="siv-res link-btn${c.reserved ? ' danger' : ''}" data-invres="${esc(c.name)}" data-invb="${esc(c.binder || '')}">${c.reserved ? tr('Reserved') : tr('For sale')}</button>
        <button class="siv-disp link-btn${c.display ? ' on' : ''}" data-invdisplay="${esc(c.name)}" data-invb="${esc(c.binder || '')}" title="${c.display ? tr('In The Cabinet (on display, not for sale)') : tr('Put on display in The Cabinet')}"><i class="ms ms-counter-${c.display ? 'lore' : 'shield'}" aria-hidden="true"></i> ${c.display ? tr('On display') : tr('Display')}</button>
        <button class="bd-x" data-invrm="${esc(c.name)}" data-invb="${esc(c.binder || '')}" title="${tr('Remove entirely')}">✕</button>
      </div>`).join('')}</div>${more}`;
  }
  const moreBtn = $('#invMore'); if (moreBtn) moreBtn.addEventListener('click', () => { storeInvShown += 120; renderStoreInventory(); });
  renderInvBulkBar();
}

/* ---- store event editor (modal) ---- */
function openStoreEvent(id) {
  editingEventId = id || null;
  const m = $('#storeEventModal'); if (m) m.hidden = false;
  renderStoreEventModal();
}
function closeStoreEvent() { const m = $('#storeEventModal'); if (m) m.hidden = true; editingEventId = null; }
function renderStoreEventModal() {
  const body = $('#storeEventBody'); if (!body) return;
  const ev = editingEventId ? (storeEvents.find(e => e.id === editingEventId) || {}) : {};
  const p2 = n => String(n).padStart(2, '0');
  // Split an ISO timestamp into a 'YYYY-MM-DD' date and the nearest 30-min 'HH:MM' slot.
  const splitDT = (iso) => {
    if (!iso) return { date: '', time: '' };
    const d = new Date(iso); if (isNaN(d)) return { date: '', time: '' };
    const date = `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
    const slot = Math.round((d.getHours() * 60 + d.getMinutes()) / 30) * 30;   // snap to nearest 30 min
    const clamped = Math.min(slot, 23 * 60 + 30);
    const time = `${p2(Math.floor(clamped / 60))}:${p2(clamped % 60)}`;
    return { date, time };
  };
  const startDT = splitDT(ev.starts_at), endDT = splitDT(ev.ends_at);
  body.innerHTML = `
    <label class="ve-field"><span>${tr('Title')}</span><input type="text" id="evTitle" class="text-input" maxlength="80" value="${esc(ev.title || '')}" placeholder="${esc(tr('Commander Bracket Night'))}" /></label>
    <div class="store-2col">
      <label class="ve-field"><span>${tr('Format')}</span><input type="text" id="evFormat" class="text-input" maxlength="40" value="${esc(ev.format || '')}" placeholder="Commander" /></label>
      <label class="ve-field"><span>${tr('Repeats')}</span><select id="evRecurring" class="text-input"><option value="">${tr('One-off')}</option><option value="weekly"${ev.recurring === 'weekly' ? ' selected' : ''}>${tr('Weekly')}</option><option value="biweekly"${ev.recurring === 'biweekly' ? ' selected' : ''}>${tr('Every 2 weeks')}</option><option value="monthly"${ev.recurring === 'monthly' ? ' selected' : ''}>${tr('Monthly')}</option></select></label>
    </div>
    <div class="store-2col">
      <label class="ve-field"><span>${tr('Starts')}</span><div class="ev-dt"><input type="date" id="evStartDate" class="text-input ev-date" value="${esc(startDT.date)}" /><select id="evStartTime" class="text-input ev-time">${timeSelectOptions(startDT.time, tr('Time'))}</select></div></label>
      <label class="ve-field"><span>${tr('Ends')} <em>${tr('(optional)')}</em></span><div class="ev-dt"><input type="date" id="evEndDate" class="text-input ev-date" value="${esc(endDT.date)}" /><select id="evEndTime" class="text-input ev-time">${timeSelectOptions(endDT.time, tr('Time'))}</select></div></label>
    </div>
    <div class="store-2col">
      <label class="ve-field"><span>${tr('Prize pool')}</span><input type="text" id="evPrize" class="text-input" maxlength="60" value="${esc(ev.prize_pool || '')}" placeholder="S/300 store credit" /></label>
      <label class="ve-field"><span>${tr('Entry fee')}</span><input type="text" id="evEntry" class="text-input" maxlength="40" value="${esc(ev.entry_fee || '')}" placeholder="S/20" /></label>
    </div>
    <label class="ve-field"><span>${tr('Capacity')} <em>${tr('(optional)')}</em></span><input type="number" id="evCap" class="text-input" min="0" value="${ev.capacity != null ? Number(ev.capacity) : ''}" placeholder="32" /></label>
    <label class="ve-field"><span>${tr('Description')}</span><textarea id="evDesc" class="text-input store-bio" maxlength="400" placeholder="${tr('Details, structure, what to bring…')}">${esc(ev.description || '')}</textarea></label>
    <div class="modal-status" id="evStatus"></div>
    <button class="btn gold" id="evSave">${editingEventId ? tr('Save event') : tr('Add event')}</button>`;
}
async function saveStoreEventFromModal() {
  if (!sb || !myStore) return;
  const title = ($('#evTitle') ? $('#evTitle').value : '').trim();
  const st = $('#evStatus');
  if (!title) { if (st) st.textContent = tr('Give the event a title.'); return; }
  // Combine a date input + a 'HH:MM' time select into an ISO timestamp. No date → null (no time → midnight).
  const combineISO = (dateId, timeId) => {
    const date = ($(dateId) ? $(dateId).value : '').trim();
    if (!date) return null;
    const time = ($(timeId) ? $(timeId).value : '').trim() || '00:00';
    const d = new Date(`${date}T${time}`);
    return isNaN(d) ? null : d.toISOString();
  };
  const capRaw = ($('#evCap') ? $('#evCap').value : '').trim();
  const row = {
    store_slug: myStore.slug, title, format: ($('#evFormat').value || '').trim() || null,
    recurring: $('#evRecurring').value || null, starts_at: combineISO('#evStartDate', '#evStartTime'), ends_at: combineISO('#evEndDate', '#evEndTime'),
    prize_pool: ($('#evPrize').value || '').trim() || null, entry_fee: ($('#evEntry').value || '').trim() || null,
    capacity: capRaw ? parseInt(capRaw, 10) : null, description: ($('#evDesc').value || '').trim() || null
  };
  const btn = $('#evSave'); if (btn) { btn.disabled = true; btn.textContent = tr('Saving…'); }
  try {
    let error;
    if (editingEventId) ({ error } = await sb.from('store_events').update(row).eq('id', editingEventId).eq('store_slug', myStore.slug));
    else ({ error } = await sb.from('store_events').insert(row));
    if (error) { if (st) st.textContent = error.message; if (btn) { btn.disabled = false; btn.textContent = editingEventId ? tr('Save event') : tr('Add event'); } return; }
    await loadStoreEvents(); closeStoreEvent(); renderStoreDashboard();
    toast(editingEventId ? tr('Event updated.') : tr('Event added.'));
  } catch (e) { if (st) st.textContent = tr('Something went wrong.'); if (btn) { btn.disabled = false; btn.textContent = editingEventId ? tr('Save event') : tr('Add event'); } }
}
async function deleteStoreEvent(id) {
  if (!sb || !myStore) return;
  const ev = storeEvents.find(e => e.id === id);
  if (!confirm(tr('Delete “{title}”?', { title: ev ? ev.title : tr('this event') }))) return;
  try { await sb.from('store_events').delete().eq('id', id).eq('store_slug', myStore.slug); } catch (e) {}
  await loadStoreEvents(); renderStoreDashboard();
  toast(tr('Event deleted.'));
}

/* ============ public profile link (a curated, anonymous-readable snapshot) ============ */
let publicProfileTimer = null;
function profilePublicUrl() {
  const un = (authProfile && authProfile.username) || '';
  return vaultPageUrl('u.html') + '?u=' + encodeURIComponent(un);
}
// pick one share link per kind for the profile hub: prefer a live link, else the most recent non-expired one
function pickProfileShare(kind) {
  const now = new Date();
  const cands = myShares.filter(s => s.kind === kind && (s.live || !s.expires_at || new Date(s.expires_at) > now));
  cands.sort((a, b) => (b.live ? 1 : 0) - (a.live ? 1 : 0) || String(b.created_at || '').localeCompare(String(a.created_at || '')));
  return cands[0];
}
// The public snapshot honours the per-section toggles and NEVER includes total collection value.
function buildPublicProfileSnapshot() {
  const p = (authProfile && authProfile.prefs) || {};
  const un = (authProfile && authProfile.username) || '';
  const dn = (authProfile && authProfile.display_name) || un;
  const snap = {
    username: un, display_name: dn, bio: (p.bio || '').slice(0, 280),
    experience: p.experience || '', formats: Array.isArray(p.formats) ? p.formats : [],
    since: (authUser && authUser.created_at) || '', avatarHue: avatarHue(un || dn)
  };
  // real name + precise location are extra PII — only published when the user explicitly opts in
  if (p.publicIdentity) { snap.full_name = p.full_name || ''; snap.country = p.country || ''; snap.city = p.city || ''; }
  if (p.publicDecks !== false) {
    snap.decks = [...state.decks]
      .sort((a, b) => (b.playing ? 1 : 0) - (a.playing ? 1 : 0) || a.name.localeCompare(b.name))
      .map(d => ({ name: d.name, commander: d.commander || '', count: (d.cards || []).reduce((a, c) => a + c.qty, 0), playing: !!d.playing, code: d.shareCode || '' }));
  }
  if (p.publicStores !== false) {
    snap.stores = (Array.isArray(p.favorite_stores) ? p.favorite_stores : []).map(s => ({ name: s, count: storeCounts[s] || 0 }));
  }
  if (p.publicTopCards) {
    snap.topCards = topOwnedCards(5).map(c => ({ name: c.name, value: c.value, img: displayImage(c.name) || '', uri: (card(c.name).uri) || '' }));
  }
  // list-link hub (user opted in): at most one Buy + one Sell link
  snap.lists = [pickProfileShare('buy'), pickProfileShare('sell')].filter(Boolean).map(s => ({ kind: s.kind, code: s.code, title: s.title || '', url: shareUrl(s.code) }));
  // owner's-choice cross-link: if I run a store and opted in (show_owner), link to it from my player profile
  if (myStore && myStore.owner === (authUser && authUser.id) && myStore.show_owner) snap.store = { slug: myStore.slug, name: myStore.name };
  return snap;
}
async function publishPublicProfile(makePublic) {
  if (!sb || !authUser) return { error: 'not signed in' };
  const username = authProfile && authProfile.username;
  if (!username) return { error: 'no username' };
  try {
    const { error } = await sb.from('public_profiles').upsert({
      user_id: authUser.id, username, data: buildPublicProfileSnapshot(), public: !!makePublic, updated_at: new Date().toISOString()
    });
    if (error) return { error: error.message };
    return { ok: true, url: profilePublicUrl() };
  } catch (e) { return { error: e.message }; }
}
function publicProfileOn() { return !!(authProfile && authProfile.prefs && authProfile.prefs.profilePublic); }
function schedulePublicProfileRefresh() {
  if (!sb || !authUser || !publicProfileOn()) return;
  clearTimeout(publicProfileTimer);
  publicProfileTimer = setTimeout(() => publishPublicProfile(true), 3500);
}
function maybeRepublishProfile() { if (publicProfileOn()) publishPublicProfile(true); }
async function togglePublicProfile(on) {
  if (!(authProfile && authProfile.username)) { toast(tr('Add a username in Edit profile first.')); renderProfileView(); return; }
  await setPublicPref('profilePublic', on);
  const r = await publishPublicProfile(on);
  if (r.error) toast(tr('Could not update public profile:') + ' ' + r.error);
  else { toast(on ? tr('Your profile is public ✓') : tr('Your profile is now private.')); if (on) copyText(r.url); }
  renderProfileView();
}

/* ---------- find other players' public profiles ---------- */
let profileSearchQuery = '';
let profileSearchTimer = null;
let myWins = null;   // get_user_wins() result: { wins, podiums, recent:[...] } | null until loaded
function openPublicProfile(username) {
  const u = String(username || '').trim().replace(/^@/, '');
  if (u) window.open(vaultPageUrl('u.html') + '?u=' + encodeURIComponent(u), '_blank', 'noopener');
}
async function runProfileSearch() {
  const box = $('#pvSearchResults'); if (!box) return;
  const q = profileSearchQuery.trim();
  if (q.length < 2) { box.hidden = true; box.innerHTML = ''; return; }
  let rows = [];
  if (sb) { try { const { data, error } = await sb.rpc('search_public_profiles', { q }); if (!error && Array.isArray(data)) rows = data; } catch (e) {} }
  const items = rows.map(r => `<button class="pvs-item" data-pvprofile="${esc(r.username)}">
    <span class="pf-avatar pvs-av" style="--ah:${Number(r.avatar_hue) || 40}">${esc(profileInitials(r.display_name || r.username))}</span>
    <span class="pvs-id"><span class="pvs-name">${esc(r.display_name || r.username)}</span><span class="pvs-handle">@${esc(r.username)}</span></span>
    <span class="pvs-go">↗</span></button>`).join('');
  box.innerHTML = items + `<button class="pvs-item pvs-direct" data-pvprofile="${esc(q)}"><i class="ms ms-ability-investigate" aria-hidden="true"></i> ${tr('Open @{user} directly →', { user: esc(q.replace(/^@/, '')) })}</button>`;
  box.hidden = false;
}

/* =====================================================================
   FRIENDS — add by @username, then match your buy/sell lists against a friend's
   ===================================================================== */
let friends = [];   // get_friends() rows: {req_id, friend_id, username, display_name, status, direction}
async function loadFriends() {
  friends = [];
  if (!sb || !authUser) { renderFriends(); return; }
  try { const { data } = await sb.rpc('get_friends'); friends = Array.isArray(data) ? data : []; } catch (e) {}
  publishMyTrades();   // keep my wants/haves current so friends can match against me
  renderFriends();
}
// my wants = buy list (deck needs + wishlist − owned); my haves = everything across my sell folders
function myWants() {
  const decks = state.decks;
  return allCardNames().filter(n => requiredFor(n, decks) > ownedOf(n)).map(n => ({ name: n, qty: requiredFor(n, decks) - ownedOf(n) }));
}
function myHaves() {
  const idx = variantIndex(), seen = new Set(), out = [];
  state.sellLists.forEach(l => Object.keys(l.items).forEach(vid => {
    if (seen.has(vid)) return; seen.add(vid);
    const hit = idx.get(vid); if (!hit) return;
    const qty = Math.min(l.items[vid], hit.v.qty); if (qty <= 0) return;
    out.push({ name: hit.name, qty, price: +(variantPrice(hit.name, hit.v) || 0).toFixed(2) });
  }));
  return out;
}
async function publishMyTrades() {
  if (!sb || !authUser) return;
  try { await sb.from('trade_lists').upsert({ user_id: authUser.id, wants: myWants(), haves: myHaves(), updated_at: new Date().toISOString() }); } catch (e) {}
}
async function sendFriendRequest(username) {
  username = (username || '').trim().replace(/^@/, '');
  if (!username || !sb || !authUser) return;
  try {
    const { data, error } = await sb.rpc('send_friend_request', { p_username: username });
    if (error) { toast(error.message); return; }
    toast(data && data.status === 'accepted' ? tr('You and @{user} are now friends.', { user: username }) : tr('Friend request sent to @{user}.', { user: username }));
    const inp = $('#friendAddInput'); if (inp) inp.value = '';
    await loadFriends();
  } catch (e) { toast(tr('Could not send the request.')); }
}
async function respondFriend(id, accept) {
  if (!sb) return;
  try { await sb.rpc('respond_friend_request', { p_id: id, p_accept: accept }); await loadFriends(); toast(accept ? tr('Friend added.') : tr('Request declined.')); } catch (e) {}
}
async function removeFriend(otherId) {
  if (!sb) return;
  if (!confirm(tr('Remove this friend?'))) return;
  try { await sb.rpc('remove_friend', { p_other: otherId }); await loadFriends(); toast(tr('Friend removed.')); } catch (e) {}
}
async function matchWithFriend(friendId, friendName) {
  if (!sb) return;
  toast(tr('Matching with @{user}…', { user: friendName }));
  await publishMyTrades();   // ensure my side is fresh too
  try {
    const { data, error } = await sb.rpc('get_friend_trades', { p_friend: friendId });
    if (error || !data) { toast(tr('Could not load their lists — are you still friends?')); return; }
    const theirWantSet = new Set((data.wants || []).map(c => key(c.name)));
    const theirHaveMap = new Map((data.haves || []).map(c => [key(c.name), c]));
    const canSell = myHaves().filter(c => theirWantSet.has(key(c.name)));                                  // my haves they want
    const canBuy = myWants().filter(c => theirHaveMap.has(key(c.name))).map(c => ({ ...c, price: theirHaveMap.get(key(c.name)).price || 0 }));   // my wants they have
    showFriendMatch(friendName, canSell, canBuy);
  } catch (e) { toast(tr('Match failed.')); }
}
function showFriendMatch(name, canSell, canBuy) {
  const m = $('#friendMatchModal'); if (!m) return;
  m.hidden = false;
  const body = $('#friendMatchBody'); if (!body) return;
  const total = (arr) => arr.reduce((a, c) => a + (Number(c.qty) || 1) * (Number(c.price) || 0), 0);
  const list = (arr, empty) => arr.length
    ? `<div class="fm-list">${arr.map(c => `<div class="fm-row"><span class="fm-qty">${Number(c.qty) || 1}×</span><span class="nm fm-name" data-name="${esc(c.name)}">${esc(c.name)}</span><span class="fm-price">${c.price ? money(c.price) : ''}</span></div>`).join('')}</div>`
    : `<p class="fm-empty">${empty}</p>`;
  body.innerHTML = `
    <p class="share-note">${tr('What you and {who} can trade right now, based on your buy & sell lists.', { who: '<b>@' + esc(name) + '</b>' })}</p>
    <div class="fm-sec sell"><div class="fm-h"><span><i class="ms ms-loyalty-up" aria-hidden="true"></i> ${tr('You can sell to them')}</span><span class="fm-tot">${canSell.length} · ${money(total(canSell))}</span></div>${list(canSell, tr('Nothing of yours is on their buy list.'))}</div>
    <div class="fm-sec buy"><div class="fm-h"><span><i class="ms ms-counter-gold" aria-hidden="true"></i> ${tr('You can buy from them')}</span><span class="fm-tot">${canBuy.length} · ${money(total(canBuy))}</span></div>${list(canBuy, tr('They have nothing on your buy list.'))}</div>`;
}
function closeFriendMatch() { const m = $('#friendMatchModal'); if (m) m.hidden = true; }
function renderFriends() {
  const el = $('#pvFriendsList'); if (!el) return;
  const incoming = friends.filter(f => f.direction === 'incoming');
  const accepted = friends.filter(f => f.direction === 'friend');
  const outgoing = friends.filter(f => f.direction === 'outgoing');
  const cnt = $('#pvFriendCount'); if (cnt) cnt.textContent = accepted.length || '';
  let html = '';
  if (incoming.length) html += `<div class="pv-fr-sub">${tr('Requests')}</div>` + incoming.map(f => `<div class="pv-friend-row"><span class="pv-fr-who">@${esc(f.username || '')}</span><span class="pv-fr-act"><button class="btn gold sm" data-fraccept="${esc(f.req_id)}">${tr('Accept')}</button><button class="link-btn" data-frdecline="${esc(f.req_id)}">${tr('Decline')}</button></span></div>`).join('');
  if (accepted.length) html += (incoming.length ? `<div class="pv-fr-sub">${tr('Friends')}</div>` : '') + accepted.map(f => `<div class="pv-friend-row"><span class="pv-fr-who" data-frprofile="${esc(f.username || '')}">@${esc(f.username || '')}</span><span class="pv-fr-act"><button class="btn sm" data-frmatch="${esc(f.friend_id)}" data-frname="${esc(f.username || '')}"><i class="ms ms-ability-investigate" aria-hidden="true"></i> ${tr('Match')}</button><button class="link-btn danger" data-frremove="${esc(f.friend_id)}">${tr('Remove')}</button></span></div>`).join('');
  if (outgoing.length) html += `<div class="pv-fr-sub">${tr('Pending')}</div>` + outgoing.map(f => `<div class="pv-friend-row"><span class="pv-fr-who">@${esc(f.username || '')}</span><span class="pv-fr-pending">${tr('requested')}</span></div>`).join('');
  el.innerHTML = html || `<p class="pv-empty">${tr('No friends yet. Add one by @username to match trade lists.')}</p>`;
}

// ---------- account / profile UI ----------
function renderAccount() {
  const b = $('#accountBtn'); if (!b) return;
  if (!sb) { b.hidden = true; return; }
  b.hidden = false;
  if (authUser) {
    const name = (authProfile && (authProfile.display_name || authProfile.username)) || (authUser.email || '').split('@')[0];
    const busy = syncBusy || syncPushTimer || syncResolving;
    b.innerHTML = `<span class="sync-dot ${busy ? 'saving' : 'ok'}"></span> ${esc(name)}`;
    b.title = tr('Signed in as {email}', { email: authUser.email }) + (busy ? ' · ' + tr('syncing…') : ' · ' + tr('synced')) + ' — ' + tr('click for profile');
  } else {
    b.innerHTML = tr('Sign in');
    b.title = tr('Sign in to sync your collection across devices');
  }
}
function renderAuthMode() {
  const signup = authMode === 'signup';
  $('#authTitle').textContent = signup ? tr('Create account') : tr('Sign in');
  $('#authHint').textContent = signup ? tr('Create your account — your collection syncs across all your devices.') : tr('Sign in to sync your collection across devices.');
  $('#authSubmit').textContent = signup ? tr('Create account') : tr('Sign in');
  $('#authSwitch').textContent = signup ? tr('Already have an account? Sign in') : tr('Need an account? Create one');
  $('#authUsername').hidden = !signup;
  $('#authConfirm').hidden = !signup;
  $('#authPassword').autocomplete = signup ? 'new-password' : 'current-password';
  $('#authSubmit').disabled = false;
}
function openAuth(mode) {
  authMode = mode || 'signin';
  renderAuthMode();
  pickSigninBg();
  $('#authStatus').textContent = '';
  $('#authModal').hidden = false;
  $('#authEmail').focus();
}
function closeAuth() { $('#authModal').hidden = true; $('#authPassword').value = ''; $('#authConfirm').value = ''; }
function profileInitials(name) {
  const parts = String(name || '?').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}
function avatarHue(s) { let h = 0; for (const c of String(s || '')) h = (h * 31 + c.charCodeAt(0)) % 360; return h; }
function renderProfile() {
  const body = $('#profileBody'); if (!body) return;
  if (!authUser) { body.innerHTML = `<p class="modal-hint">${tr('Not signed in.')}</p>`; return; }
  const g = globalStats();
  const p = (authProfile && authProfile.prefs) || {};
  const dn = (authProfile && authProfile.display_name) || '';
  const un = (authProfile && authProfile.username) || '';
  const initials = profileInitials(dn || p.full_name || un || authUser.email);
  body.innerHTML = `
    <div class="pf-avatar-row">
      <div class="pf-avatar" style="--ah:${avatarHue(un || dn || authUser.email)}">${esc(initials)}</div>
      <div class="pf-id"><div class="pf-name">${esc(dn || un || tr('Planeswalker'))}</div><div class="pf-handle">@${esc(un || '—')}</div></div>
    </div>
    <div class="profile-fields">
      <label class="ve-field"><span>${tr('Display name')}</span><input type="text" id="pfDisplay" class="text-input" value="${esc(dn)}" maxlength="40" /></label>
      <label class="ve-field"><span>${tr('Username')}</span><input type="text" id="pfUsername" class="text-input" value="${esc(un)}" maxlength="24" placeholder="${tr('a unique handle')}" /></label>
      <label class="ve-field"><span>${tr('Full name')} <em>${tr('(optional)')}</em></span><input type="text" id="pfFullName" class="text-input" value="${esc(p.full_name || '')}" maxlength="60" placeholder="${tr('optional')}" /></label>
      <div class="pf-row2">
        <label class="ve-field"><span>${tr('Country')}</span><input type="text" id="pfCountry" class="text-input" value="${esc(p.country || 'Peru')}" maxlength="40" /></label>
        <label class="ve-field"><span>${tr('City')}</span><input type="text" id="pfCity" class="text-input" value="${esc(p.city || 'Lima')}" maxlength="40" /></label>
      </div>
      <label class="ve-field"><span>${tr('Bio')} <em>${tr('(optional)')}</em></span><textarea id="pfBio" class="text-input pf-bio" maxlength="280" placeholder="${tr('A short bio for your profile…')}">${esc(p.bio || '')}</textarea></label>
      <label class="ve-field"><span>${tr('Email')}</span><div class="pf-static">${esc(authUser.email || '')}</div></label>
    </div>
    <div class="profile-stats">
      <div><b>${g.unique}</b><span>${tr('cards')}</span></div>
      <div><b>${money(g.ownedValue)}</b><span>${tr('value')}</span></div>
      <div><b>${g.decks}</b><span>${tr('decks')}</span></div>
    </div>
    <div class="modal-status" id="pfStatus"></div>
    <div class="modal-foot">
      <button class="btn ghost" id="pfSignOut"><i class="ms ms-loyalty-down" aria-hidden="true"></i> ${tr('Sign out')}</button>
      <button class="btn gold" id="pfSave">${tr('Save profile')}</button>
    </div>
    <div class="profile-syncbox">
      <div class="psb-title">${tr('Sync')}</div>
      <p class="psb-hint">${tr('Changes sync automatically. If a device looks out of date, force it here.')}</p>
      <div class="profile-sync">
        <button class="btn ghost" id="pfPush"><i class="ms ms-loyalty-up" aria-hidden="true"></i> ${tr('Sync this device → account')}</button>
        <button class="btn ghost" id="pfPull"><i class="ms ms-loyalty-down" aria-hidden="true"></i> ${tr('Load account → this device')}</button>
      </div>
      <div class="modal-status" id="pfSyncStatus"></div>
    </div>
    <button class="onb-rerun" id="pfRerun">${tr('↻ Re-run the welcome setup')}</button>`;
}
function openProfile() { renderProfile(); $('#profileModal').hidden = false; }
function closeProfile() { $('#profileModal').hidden = true; }
async function saveProfileEdits() {
  if (!sb || !authUser) return;
  const display_name = $('#pfDisplay').value.trim();
  const username = $('#pfUsername').value.trim() || null;
  const prefs = { ...((authProfile && authProfile.prefs) || {}),
    full_name: $('#pfFullName').value.trim(),
    bio: $('#pfBio') ? $('#pfBio').value.trim() : ((authProfile && authProfile.prefs && authProfile.prefs.bio) || ''),
    country: $('#pfCountry').value.trim(),
    city: $('#pfCity').value.trim() };
  const st = $('#pfStatus'); st.innerHTML = `<span class="spin"></span>${tr('Saving…')}`;
  try {
    const { error } = await sb.from('profiles').update({ display_name, username, prefs, updated_at: new Date().toISOString() }).eq('id', authUser.id);
    if (error) { st.textContent = /duplicate|unique/i.test(error.message) ? tr('That username is already taken.') : error.message; return; }
    authProfile = { ...(authProfile || {}), display_name, username, prefs };
    st.textContent = tr('Saved ✓'); renderAccount(); renderProfileView();
  } catch (e) { st.textContent = tr('Could not save — try again.'); }
}
// Sync progress overlay — shown on the first upload / first download at sign-in.
let syncOverlayTimer = null;
function showSyncOverlay(title) {
  clearTimeout(syncOverlayTimer);
  const m = $('#syncModal'); if (!m) return false;
  $('#syncTitle').textContent = title;
  const fill = $('#syncFill');
  fill.classList.remove('done', 'error');
  fill.style.transition = 'none'; fill.style.width = '8%';
  $('#syncStatus').textContent = '';
  $('#syncDone').hidden = true;
  m.hidden = false;
  requestAnimationFrame(() => { fill.style.transition = 'width 1.8s ease'; fill.style.width = '85%'; });   // creep toward 85% while it works
  return true;
}
function finishSyncOverlay(ok, message) {
  const m = $('#syncModal'); if (!m || m.hidden) return;
  const fill = $('#syncFill');
  fill.style.transition = 'width .35s ease'; fill.style.width = '100%';
  fill.classList.add(ok ? 'done' : 'error');
  $('#syncTitle').textContent = ok ? tr('All synced ✓') : tr('Sync failed');
  $('#syncStatus').textContent = message;
  $('#syncDone').hidden = false;
  clearTimeout(syncOverlayTimer);
  if (ok) syncOverlayTimer = setTimeout(closeSyncOverlay, 2800);   // auto-dismiss on success; errors stay so they can be read
}
function closeSyncOverlay() { clearTimeout(syncOverlayTimer); const m = $('#syncModal'); if (m) m.hidden = true; if (pendingOnboardAfterSync) { pendingOnboardAfterSync = false; startOnboarding(); } }
const minDelay = ms => new Promise(res => setTimeout(res, ms));   // keeps the bar visible long enough to read
async function uploadWithOverlay() {
  showSyncOverlay(tr('Uploading your collection…'));
  const [r] = await Promise.all([pushNow(), minDelay(900)]);
  const g = globalStats();
  if (r.ok) finishSyncOverlay(true, tr('{cards} · {decks} · {value} now backed up to your account.', { cards: tr(g.unique === 1 ? '{n} card' : '{n} cards', { n: g.unique }), decks: tr(g.decks === 1 ? '{n} deck' : '{n} decks', { n: g.decks }), value: money(g.ownedValue) }));
  else { finishSyncOverlay(false, (r.error || tr('Upload failed')) + ' — ' + tr('you can retry from Profile → Sync.')); toast(tr('Sync failed — open Profile to retry.')); }
}
async function downloadWithOverlay(remote) {
  showSyncOverlay(tr('Loading your collection…'));
  await minDelay(700);
  adoptRemote(remote.data, remote.updated_at);
  const g = globalStats();
  finishSyncOverlay(true, tr('{cards} · {decks} loaded from your account.', { cards: tr(g.unique === 1 ? '{n} card' : '{n} cards', { n: g.unique }), decks: tr(g.decks === 1 ? '{n} deck' : '{n} decks', { n: g.decks }) }));
}

// Manual sync controls (recovery + clear feedback when auto-sync looks off).
async function forceSyncPush() {
  const st = $('#pfSyncStatus');
  if (!sb || !authUser) { if (st) st.textContent = tr('Not signed in.'); return; }
  if (st) st.innerHTML = `<span class="spin"></span>${tr('Uploading this device’s collection…')}`;
  const r = await pushNow();
  if (st) st.textContent = r.ok ? tr('Synced to your account ✓') : (tr('Sync failed:') + ' ' + (r.error || 'unknown') + ' — ' + tr('try again.'));
}
async function forceSyncPull() {
  const st = $('#pfSyncStatus');
  if (!sb || !authUser) { if (st) st.textContent = tr('Not signed in.'); return; }
  if (st) st.innerHTML = `<span class="spin"></span>${tr('Loading from your account…')}`;
  try {
    const { data, error } = await sb.from('collections').select('data, updated_at').eq('user_id', authUser.id).maybeSingle();
    if (error) { if (st) st.textContent = tr('Failed:') + ' ' + error.message; return; }
    if (!data || !collectionNonEmpty(data.data)) { if (st) st.textContent = tr('Your account has no saved collection yet. On the device that has your cards, tap “Sync this device → account”.'); return; }
    if (collectionNonEmpty(state) && !confirm(tr('Replace this device’s collection with the one saved in your account?'))) { if (st) st.textContent = tr('Cancelled.'); return; }
    adoptRemote(data.data, data.updated_at);
    const g = globalStats();
    if (st) st.textContent = tr(g.unique === 1 ? 'Loaded {n} card from your account ✓' : 'Loaded {n} cards from your account ✓', { n: g.unique });
  } catch (e) { if (st) st.textContent = tr('Failed — check your connection and retry.'); }
}

/* ---------- onboarding wizard (full-page, after signup) ---------- */
const LIMA_STORES = ['Wonderland', 'Control Wavi', 'Carloncho Store', 'La Mazmorra', 'Perú Collectors', '5to Turno'];
let storeList = [...LIMA_STORES];   // community store list (loaded from Supabase; falls back to the Lima seed)
async function loadStores() {
  if (!sb) return;
  try {
    const { data, error } = await sb.from('stores').select('name').order('name');
    if (!error && Array.isArray(data) && data.length) storeList = data.map(s => s.name);
  } catch (e) {}
}
// add a store to the shared list (so everyone can pick it) + locally right away
async function addStoreGlobal(name) {
  name = (name || '').trim(); if (!name) return;
  if (!storeList.some(s => s.toLowerCase() === name.toLowerCase())) storeList.push(name);
  if (sb && authUser) { try { await sb.from('stores').insert({ name }); } catch (e) {} }   // dup / table-missing / RLS errors ignored
}
// how many players picked each store (for the "N players here" badge)
let storeCounts = {};
async function loadStoreCounts() {
  if (!sb) return;
  try {
    const { data, error } = await sb.rpc('store_popularity');
    if (!error && Array.isArray(data)) { const m = {}; data.forEach(r => m[r.name] = Number(r.picks) || 0); storeCounts = m; }
  } catch (e) {}
}
const ONB_THEME_SW = { grimoire: '#c9a227', arcane: '#8a6fa3', tome: '#4a8fd6', verdant: '#3fa86a', ember: '#d4452f' };
const ONB_EXP = [
  { v: 'new', label: 'New to Magic', sub: 'Just getting into it' },
  { v: 'intermediate', label: 'Intermediate', sub: 'A few years in' },
  { v: 'veteran', label: 'Veteran', sub: 'Seen every set' },
];
const ONB_FORMATS = ['Commander / EDH', 'Standard', 'Pioneer', 'Modern', 'Legacy', 'Vintage', 'Pauper', 'Draft / Limited', 'Cube'];
const ONB_BUCKETS = [
  { v: 'starter', label: 'Just starting', sub: 'under 100 cards' },
  { v: 'shoebox', label: 'A shoebox', sub: '100 – 1,000' },
  { v: 'collection', label: 'A real collection', sub: '1,000 – 10,000' },
  { v: 'hoard', label: 'A hoard', sub: '10,000+' },
];
const ONB_GOALS = [
  { v: 'value', label: 'Track my collection’s value' },
  { v: 'decks', label: 'Build & manage decks' },
  { v: 'trade', label: 'Buy & sell cards' },
  { v: 'missing', label: 'See what I’m missing' },
];
// ONB_EXP/BUCKETS/GOALS labels & ONB_FORMATS entries are translated at their display sites via tr().
const ONB_STEPS = ['welcome', 'experience', 'location', 'formats', 'size', 'goals', 'price', 'theme', 'import', 'done'];
let onboardStep = 0;
let onboardData = {};
let onboardImportView = 'choose';   // import step: 'choose' | 'csv' | 'paste'
let pendingOnboardAfterSync = false;

function startOnboarding() {
  const p = (authProfile && authProfile.prefs) || {};
  onboardData = {
    experience: p.experience || '',
    country: p.country || 'Peru',
    city: p.city || 'Lima',
    stores: Array.isArray(p.favorite_stores) ? [...p.favorite_stores] : [],
    formats: Array.isArray(p.formats) ? [...p.formats] : [],
    collection: p.collection_estimate || '',
    goals: Array.isArray(p.goals) ? [...p.goals] : [],
    priceSource: state.prefs.priceSource || 'ck',
    theme: state.prefs.theme || 'grimoire',
  };
  onboardStep = 0; onboardImportView = 'choose';
  $('#onboardModal').hidden = false;
  renderOnboard();
}
function onboardName() { return (authProfile && (authProfile.username || authProfile.display_name)) || 'planeswalker'; }
function onbCard(label, sub, on, attr) { return `<button class="onb-card ${on ? 'on' : ''}" ${attr}><span class="onb-card-l">${esc(label)}</span>${sub ? `<span class="onb-card-s">${esc(sub)}</span>` : ''}</button>`; }
function onbChip(label, on, attr) { return `<button class="onb-chip ${on ? 'on' : ''}" ${attr}>${esc(label)}</button>`; }
function onbStepHtml(key) {
  const d = onboardData;
  switch (key) {
    case 'welcome': return `<div class="onb-hero"><div class="onb-mark"><i class="ms ms-counter-lore" aria-hidden="true"></i></div>
      <h2>${tr('Welcome, {name} 👋', { name: esc(onboardName()) })}</h2><p>${tr('A few quick questions to set up The Vault for you. Skip anything you like.')}</p></div>`;
    case 'experience': return `<h2 class="onb-q">${tr('How long have you played Magic?')}</h2>
      <div class="onb-grid">${ONB_EXP.map(e => onbCard(tr(e.label), tr(e.sub), d.experience === e.v, `data-onb-exp="${e.v}"`)).join('')}</div>`;
    case 'location': return `<h2 class="onb-q">${tr('Where do you play?')}</h2>
      <div class="pf-row2"><label class="ve-field"><span>${tr('Country')}</span><input type="text" id="onbCountry" class="text-input" value="${esc(d.country)}" maxlength="40" /></label>
      <label class="ve-field"><span>${tr('City')}</span><input type="text" id="onbCity" class="text-input" value="${esc(d.city)}" maxlength="40" /></label></div>
      <p class="onb-sub">${tr('Your favorite local stores')}</p>
      <div class="onb-chips">${(() => {
        const all = [...storeList, ...d.stores.filter(s => !storeList.some(x => x.toLowerCase() === s.toLowerCase()))];
        all.sort((a, b) => (storeCounts[b] || 0) - (storeCounts[a] || 0) || a.localeCompare(b));   // most-played first
        return all.map(s => {
          const on = d.stores.some(x => x.toLowerCase() === s.toLowerCase());
          const n = storeCounts[s] || 0;
          return `<button class="onb-chip ${on ? 'on' : ''}" data-onb-store="${esc(s)}" title="${n ? tr(n === 1 ? '{n} player plays here' : '{n} players play here', { n }) : ''}">${esc(s)}${n > 0 ? ` <span class="onb-chip-n">${n}</span>` : ''}</button>`;
        }).join('');
      })()}</div>
      <div class="onb-addrow"><input type="text" id="onbStoreAdd" class="text-input" placeholder="${tr('Add another store…')}" maxlength="40" /><button class="btn ghost" id="onbStoreAddBtn">${tr('Add')}</button></div>`;
    case 'formats': return `<h2 class="onb-q">${tr('What do you play?')}</h2>
      <div class="onb-chips">${ONB_FORMATS.map(f => onbChip(tr(f), d.formats.includes(f), `data-onb-fmt="${esc(f)}"`)).join('')}</div>`;
    case 'size': return `<h2 class="onb-q">${tr('Roughly how big is your collection?')}</h2>
      <div class="onb-grid">${ONB_BUCKETS.map(b => onbCard(tr(b.label), tr(b.sub), d.collection === b.v, `data-onb-size="${b.v}"`)).join('')}</div>`;
    case 'goals': return `<h2 class="onb-q">${tr('What do you want to use The Vault for?')}</h2><p class="onb-sub">${tr('Pick any.')}</p>
      <div class="onb-grid">${ONB_GOALS.map(g => onbCard(tr(g.label), '', d.goals.includes(g.v), `data-onb-goal="${g.v}"`)).join('')}</div>`;
    case 'price': return `<h2 class="onb-q">${tr('Which prices should we show?')}</h2>
      <div class="onb-grid">${onbCard('Card Kingdom', tr('What Lima uses'), d.priceSource === 'ck', `data-onb-price="ck"`)}${onbCard('TCGplayer', tr('US market price'), d.priceSource === 'tcg', `data-onb-price="tcg"`)}</div>`;
    case 'theme': return `<h2 class="onb-q">${tr('Pick your look')}</h2>
      <div class="onb-themes">${THEMES.map(t => `<button class="onb-theme ${d.theme === t ? 'on' : ''}" data-onb-theme="${t}"><span class="onb-theme-sw" style="background:${ONB_THEME_SW[t]}"></span>${esc(tr(t[0].toUpperCase() + t.slice(1)))}</button>`).join('')}</div>`;
    case 'import':
      if (onboardImportView === 'csv') return `<h2 class="onb-q">${tr('Import from ManaBox')}</h2>
        <ol class="onb-steps">
          <li>${tr('In {b}, go to your {collection}.', { b: '<b>ManaBox</b>', collection: '<b>' + tr('Collection') + '</b>' })}</li>
          <li>${tr('Tap the {dots} at the top right.', { dots: '<b>' + tr('⋯ (three dots)') + '</b>' })}</li>
          <li>${tr('Tap {export} — the CSV downloads to your device.', { export: '<b>' + tr('Export') + '</b>' })}</li>
          <li>${tr('Tap {choose} below and pick it — it goes into your {collection}.', { choose: '<b>' + tr('Choose CSV file') + '</b>', collection: '<b>' + tr('collection') + '</b>' })}</li>
        </ol>
        <div class="onb-importrow"><button class="btn gold" id="onbCsvBtn"><i class="ms ms-loyalty-up btn-ico" aria-hidden="true"></i> ${tr('Choose CSV file…')}</button><input type="file" id="onbCsvInput" accept=".csv,text/csv" hidden /></div>
        <div class="modal-status" id="onbImportStatus"></div>
        <button class="onb-rerun" id="onbImportBack">${tr('← back to import options')}</button>`;
      if (onboardImportView === 'paste') return `<h2 class="onb-q">${tr('Paste a list')}</h2>
        <ol class="onb-steps">
          <li>${tr('In {b} (or Archidekt), open your deck or collection.', { b: '<b>Moxfield</b>' })}</li>
          <li>${tr('Click {more}, then {copy} the list.', { more: '<b>More → Export</b>', copy: '<b>' + tr('Copy') + '</b>' })}</li>
          <li>${tr('Paste it below and import — every card is added to your {collection} as owned.', { collection: '<b>' + tr('collection') + '</b>' })}</li>
        </ol>
        <textarea id="onbPasteInput" class="sm-input" placeholder="1 Sol Ring&#10;1 Lightning Bolt&#10;1 Counterspell&#10;…" spellcheck="false"></textarea>
        <div class="onb-importrow"><button class="btn gold" id="onbPasteBtn"><i class="ms ms-multiple btn-ico" aria-hidden="true"></i> ${tr('Add to my collection')}</button></div>
        <div class="modal-status" id="onbImportStatus"></div>
        <button class="onb-rerun" id="onbImportBack">${tr('← back to import options')}</button>`;
      return `<h2 class="onb-q">${tr('Get your collection in')}</h2><p class="onb-sub">${tr('Add it now, or skip and add cards anytime later. Imports go straight into your {collection} — decks come later.', { collection: '<b>' + tr('collection') + '</b>' })}</p>
        <div class="onb-grid">${onbCard(tr('Scan with ManaBox'), tr('Import a ManaBox CSV export'), false, `data-onb-import="csv"`)}${onbCard(tr('Paste a list'), tr('From Moxfield, Archidekt, etc.'), false, `data-onb-import="paste"`)}${onbCard(tr('I’ll add cards later'), tr('Jump straight into the app'), false, `data-onb-import="later"`)}</div>`;
    case 'done': return `<div class="onb-hero"><div class="onb-mark done"><i class="ms ms-counter-shield" aria-hidden="true"></i></div>
      <h2>${tr('You’re all set! 🎉')}</h2><p>${tr('Your collection syncs to your account automatically. Welcome to The Vault.')}</p></div>`;
  }
  return '';
}
function onbNavHtml(key) {
  const last = onboardStep === ONB_STEPS.length - 1;
  const back = (onboardStep > 0 && !last) ? `<button class="btn ghost" id="onbBack">${tr('Back')}</button>` : `<span></span>`;
  if (key === 'welcome') return `<div class="onb-nav"><span></span><button class="btn gold" id="onbNext">${tr('Get started')}</button></div>`;
  if (key === 'import') return `<div class="onb-nav">${back}<span></span></div>`;   // choosing a card advances/finishes
  if (last) return `<div class="onb-nav"><span></span><button class="btn gold" id="onbNext">${tr('Enter the Vault')}</button></div>`;
  return `<div class="onb-nav">${back}<div class="onb-nav-r"><button class="btn ghost" id="onbSkip">${tr('Skip')}</button><button class="btn gold" id="onbNext">${tr('Next')}</button></div></div>`;
}
function renderOnboard() {
  const body = $('#onboardBody'); if (!body) return;
  const key = ONB_STEPS[onboardStep];
  const pf = $('#onbProgress'); if (pf) pf.style.width = Math.round((onboardStep / (ONB_STEPS.length - 1)) * 100) + '%';
  body.innerHTML = `<div class="onb-step">${onbStepHtml(key)}</div>${onbNavHtml(key)}`;
}
function syncOnboardInputs() {
  const c = $('#onbCountry'); if (c) onboardData.country = c.value.trim();
  const ci = $('#onbCity'); if (ci) onboardData.city = ci.value.trim();
}
function onboardNext() { syncOnboardInputs(); onboardImportView = 'choose'; if (onboardStep >= ONB_STEPS.length - 1) { finishOnboarding(); return; } onboardStep++; renderOnboard(); }
function onboardBack() { syncOnboardInputs(); onboardImportView = 'choose'; if (onboardStep > 0) { onboardStep--; renderOnboard(); } }
function onboardSkip() { syncOnboardInputs(); onboardImportView = 'choose'; if (onboardStep < ONB_STEPS.length - 1) { onboardStep++; renderOnboard(); } }
function onboardImport(kind) {
  if (kind === 'later') { onboardImportView = 'choose'; onboardStep = ONB_STEPS.length - 1; renderOnboard(); return; }
  onboardImportView = kind;   // 'csv' or 'paste' → show that source's instructions + importer inline
  renderOnboard();
}
// Onboarding imports go straight into the INVENTORY (owned), never a deck.
async function onbImportCSV(file) {
  const st = $('#onbImportStatus'); if (!file) return;
  let parsed;
  try { parsed = parseCardCSV(await file.text()); } catch (e) { if (st) st.textContent = tr('Could not read that file.'); return; }
  if (!parsed.length) { if (st) st.textContent = tr('No cards found — is this a ManaBox CSV export?'); return; }
  if (st) st.innerHTML = `<span class="spin"></span>${tr('Importing {n} cards…', { n: parsed.length })}`;
  try {
    const { resolved, missing } = await resolveCards(parsed);
    resolved.forEach(c => addVariant(c.name, { qty: c.qty, foil: c.foil, condition: c.condition, set: c.set, collector: c.collector, scryfallId: c.scryfallId }));
    logAcquired(resolved, tr('ManaBox CSV import')); save();
    onbImportDone(resolved.reduce((a, c) => a + c.qty, 0), missing);
  } catch (e) { if (st) st.textContent = tr('Lookup failed — check your connection and retry.'); }
}
async function onbImportPaste() {
  const st = $('#onbImportStatus');
  const ta = $('#onbPasteInput'); const parsed = parseDecklist(ta ? ta.value : '');
  if (!parsed.length) { if (st) st.textContent = tr('Paste a list first — one card per line.'); return; }
  if (st) st.innerHTML = `<span class="spin"></span>${tr('Importing {n} cards…', { n: parsed.length })}`;
  try {
    const { resolved, missing } = await resolveCards(parsed.map(p => ({ name: p.name, qty: p.qty })));
    resolved.forEach(c => addVariant(c.name, { qty: c.qty }));
    logAcquired(resolved, tr('Pasted list import')); save();
    onbImportDone(resolved.reduce((a, c) => a + c.qty, 0), missing);
  } catch (e) { if (st) st.textContent = tr('Lookup failed — check your connection and retry.'); }
}
function onbImportDone(copies, missing) {
  const st = $('#onbImportStatus');
  if (st) st.textContent = tr(copies === 1 ? 'Added {n} card to your collection' : 'Added {n} cards to your collection', { n: copies }) + (missing ? ' · ' + tr('{n} not found', { n: missing }) : '') + ' ✓';
  setTimeout(() => { onboardImportView = 'choose'; onboardStep = ONB_STEPS.length - 1; renderOnboard(); }, 1100);
}
async function finishOnboarding() {
  syncOnboardInputs();
  $('#onboardModal').hidden = true;
  if (onboardData.theme) setTheme(onboardData.theme);
  state.prefs.priceSource = onboardData.priceSource === 'ck' ? 'ck' : 'tcg'; save(); renderPriceSrc();
  if (onboardData.priceSource === 'ck' && !ckById && !(state.ckPrices && Object.keys(state.ckPrices).length) && typeof refreshCKPrices === 'function') refreshCKPrices();
  if (sb && authUser) {
    const prefs = { ...((authProfile && authProfile.prefs) || {}),
      experience: onboardData.experience, country: onboardData.country, city: onboardData.city,
      favorite_stores: onboardData.stores, formats: onboardData.formats,
      collection_estimate: onboardData.collection, goals: onboardData.goals, onboarded: true };
    authProfile = { ...(authProfile || {}), prefs };
    try { await sb.from('profiles').update({ prefs, updated_at: new Date().toISOString() }).eq('id', authUser.id); } catch (e) {}
  }
  toast(tr('Welcome to The Vault! 🎉'));
}
const onbBodyEl = $('#onboardBody');
if (onbBodyEl) onbBodyEl.addEventListener('click', e => {
  const t = e.target;
  let m;
  if ((m = t.closest('[data-onb-exp]'))) { onboardData.experience = m.dataset.onbExp; renderOnboard(); return; }
  if ((m = t.closest('[data-onb-size]'))) { onboardData.collection = m.dataset.onbSize; renderOnboard(); return; }
  if ((m = t.closest('[data-onb-price]'))) { onboardData.priceSource = m.dataset.onbPrice; renderOnboard(); return; }
  if ((m = t.closest('[data-onb-theme]'))) { onboardData.theme = m.dataset.onbTheme; setTheme(onboardData.theme); renderOnboard(); return; }
  if ((m = t.closest('[data-onb-store]'))) { const s = m.dataset.onbStore; onboardData.stores = onboardData.stores.includes(s) ? onboardData.stores.filter(x => x !== s) : [...onboardData.stores, s]; m.classList.toggle('on'); return; }
  if ((m = t.closest('[data-onb-fmt]'))) { const f = m.dataset.onbFmt; onboardData.formats = onboardData.formats.includes(f) ? onboardData.formats.filter(x => x !== f) : [...onboardData.formats, f]; m.classList.toggle('on'); return; }
  if ((m = t.closest('[data-onb-goal]'))) { const g = m.dataset.onbGoal; onboardData.goals = onboardData.goals.includes(g) ? onboardData.goals.filter(x => x !== g) : [...onboardData.goals, g]; m.classList.toggle('on'); return; }
  if (t.closest('#onbStoreAddBtn')) { syncOnboardInputs(); const inp = $('#onbStoreAdd'); const v = (inp && inp.value.trim()) || ''; if (v) { addStoreGlobal(v); if (!onboardData.stores.some(s => s.toLowerCase() === v.toLowerCase())) onboardData.stores.push(v); } renderOnboard(); return; }
  if ((m = t.closest('[data-onb-import]'))) { onboardImport(m.dataset.onbImport); return; }
  if (t.closest('#onbCsvBtn')) { $('#onbCsvInput') && $('#onbCsvInput').click(); return; }
  if (t.closest('#onbPasteBtn')) { onbImportPaste(); return; }
  if (t.closest('#onbImportBack')) { onboardImportView = 'choose'; renderOnboard(); return; }
  if (t.closest('#onbNext')) { onboardNext(); return; }
  if (t.closest('#onbBack')) { onboardBack(); return; }
  if (t.closest('#onbSkip')) { onboardSkip(); return; }
});
if (onbBodyEl) onbBodyEl.addEventListener('change', e => { if (e.target.id === 'onbCsvInput' && e.target.files[0]) onbImportCSV(e.target.files[0]); });
const onbSkipAllEl = $('#onbSkipAll'); if (onbSkipAllEl) onbSkipAllEl.addEventListener('click', () => finishOnboarding());

/* ---------- profile page (full-page overview; the modal is the editor) ---------- */
function topOwnedCards(n = 5) {
  return allCardNames().filter(name => ownedOf(name) > 0)
    .map(name => ({ name, value: unitPrice(name) }))
    .filter(c => c.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, n);
}
async function setPublicPref(key, val) {
  if (!authProfile) return;
  authProfile.prefs = { ...(authProfile.prefs || {}), [key]: val };
  if (sb && authUser) { try { await sb.from('profiles').update({ prefs: authProfile.prefs, updated_at: new Date().toISOString() }).eq('id', authUser.id); } catch (e) {} }
}
function renderProfileView() {
  const el = $('#profileView'); if (!el) return;
  const view = $('#view-profile');
  if (view && !view.classList.contains('is-active')) return;   // only build when the page is showing
  if (!sb || !authUser) {
    el.innerHTML = `<div class="empty-state"><span class="empty-mark"><i class="ms ms-counter-lore" aria-hidden="true"></i></span><h2>${tr('Sign in to see your profile')}</h2><p>${tr('Create an account for a profile, cross-device sync and shareable lists.')}</p><button class="btn gold" id="pvSignIn">${tr('Sign in')}</button></div>`;
    return;
  }
  const p = (authProfile && authProfile.prefs) || {};
  const dn = (authProfile && authProfile.display_name) || (authUser.email || '').split('@')[0];
  const un = (authProfile && authProfile.username) || '';
  const g = globalStats();
  const since = authUser.created_at ? new Date(authUser.created_at).toLocaleDateString(I18N.locale(), { month: 'long', year: 'numeric' }) : '';
  const expLabel = { new: tr('New to Magic'), intermediate: tr('Intermediate'), veteran: tr('Veteran') }[p.experience] || '';
  const fmts = Array.isArray(p.formats) ? p.formats : [];
  const decks = [...state.decks].sort((a, b) => (b.playing ? 1 : 0) - (a.playing ? 1 : 0) || a.name.localeCompare(b.name));
  const stores = Array.isArray(p.favorite_stores) ? p.favorite_stores : [];
  const top = topOwnedCards(5);
  const recent = (state.history || []).slice(-6).reverse();
  const loc = [p.city, p.country].filter(Boolean).join(', ');
  const bio = (p.bio || '').trim();
  el.innerHTML = `
    <div class="pv-hero">
      <div class="pf-avatar pv-av" style="--ah:${avatarHue(un || dn || authUser.email)}">${esc(profileInitials(dn || p.full_name || un))}</div>
      <div class="pv-id">
        <h2 class="pv-name">${esc(p.full_name || dn)}</h2>
        <div class="pv-handle">@${esc(un || '—')}${loc ? ` · <i class="ms ms-land" aria-hidden="true"></i> ${esc(loc)}` : ''}</div>
        <div class="pv-badges">${expLabel ? `<span class="pv-badge">${esc(expLabel)}</span>` : ''}${fmts.slice(0, 4).map(f => `<span class="pv-badge soft">${esc(f)}</span>`).join('')}${since ? `<span class="pv-badge soft">${tr('Member since {date}', { date: esc(since) })}</span>` : ''}</div>
      </div>
      <button class="btn ghost" id="pvEdit"><i class="ms ms-artist-nib btn-ico" aria-hidden="true"></i> ${tr('Edit profile')}</button>
    </div>
    ${bio ? `<p class="pv-bio">${esc(bio)}</p>` : ''}
    <div class="pv-stats">
      <div><b>${g.ownedCount}</b><span>${tr('cards')}</span></div>
      <div><b>${money(g.ownedValue)}</b><span>${tr('value')}</span></div>
      <div><b>${g.decks}</b><span>${tr('decks')}</span></div>
    </div>
    <div class="pv-grid">
      <div class="pv-col">
        <div class="pv-card">
          <div class="pv-card-h"><h3>${tr('My decks')}</h3><span class="pv-count">${decks.length}</span></div>
          ${decks.length ? `<div class="pv-decks">${decks.map(d => { const n = (d.cards || []).reduce((a, c) => a + c.qty, 0); return `
            <div class="pv-deck ${d.playing ? 'playing' : ''}">
              <button class="pv-star ${d.playing ? 'on' : ''}" data-pvstar="${d.id}" title="${d.playing ? tr('Currently playing — click to unmark') : tr('Mark as currently playing')}">★</button>
              <button class="pv-deck-open" data-pvdeck="${d.id}"><span class="pv-deck-name">${esc(d.name)}</span><span class="pv-deck-sub">${tr('{n} cards', { n })}${d.commander ? ' · ' + esc(d.commander) : ''}</span></button>
            </div>`; }).join('')}</div>` : `<p class="pv-empty">${tr('No decks yet — {link}.', { link: `<button class="link-btn" id="pvImportDeck">${tr('import one')}</button>` })}</p>`}
        </div>
        <div class="pv-card">
          <div class="pv-card-h"><h3>${tr('Recent activity')}</h3></div>
          ${recent.length ? `<div class="pv-activity">${recent.map(e => { const meta = HIST_META[e.type] || HIST_META.added; return `<div class="pv-act"><span class="hr-badge ${e.type}">${tr(meta.label)}</span><span class="pv-act-name">${esc(e.name)}</span><span class="pv-act-qty">×${e.qty}</span></div>`; }).join('')}</div>` : `<p class="pv-empty">${tr('No activity yet.')}</p>`}
        </div>
      </div>
      <div class="pv-col">
        <div class="pv-card">
          <div class="pv-card-h"><h3>${tr('Find players')}</h3></div>
          <div class="pv-search">
            <i class="ms ms-ability-investigate pv-search-ic" aria-hidden="true"></i>
            <input type="search" id="pvSearchInput" class="pv-search-input" placeholder="${tr('Search players by name or @username…')}" autocomplete="off" value="${esc(profileSearchQuery)}" />
            <div class="pv-search-results" id="pvSearchResults" hidden></div>
          </div>
        </div>
        <div class="pv-card">
          <div class="pv-card-h"><h3>${tr('Friends')}</h3><span class="pv-count" id="pvFriendCount"></span></div>
          <div class="pv-friend-add"><input type="text" id="friendAddInput" class="pv-search-input" placeholder="${tr('Add a friend by @username…')}" autocomplete="off" /><button class="btn gold sm" id="friendAddBtn">${tr('Add')}</button></div>
          <p class="pv-hint">${tr('Add friends, then {match} to see what you can buy from or sell to each other.', { match: '<b>' + tr('Match') + '</b>' })}</p>
          <div id="pvFriendsList"></div>
        </div>
        <div class="pv-card">
          <div class="pv-card-h"><h3>${tr('My lists')}</h3></div>
          <div class="pv-links"><button class="btn ghost" data-pvgo="buylist"><i class="ms ms-counter-gold btn-ico" aria-hidden="true"></i> ${tr('Buy List')}</button><button class="btn ghost" data-pvgo="selllist"><i class="ms ms-loyalty-up btn-ico" aria-hidden="true"></i> ${tr('Sell List')}</button></div>
          <div class="pv-links" style="margin-top:8px"><button class="btn" data-pvshare="buy"><i class="ms ms-counter-lore btn-ico" aria-hidden="true"></i> ${tr('Share Buy List')}</button><button class="btn" data-pvshare="sell"><i class="ms ms-counter-lore btn-ico" aria-hidden="true"></i> ${tr('Share Sell List')}</button></div>
        </div>
        <div class="pv-card">
          <div class="pv-card-h"><h3>${tr('Shared links')}</h3><span class="pv-count">${myShares.length}</span></div>
          ${myShares.length ? `<div class="pv-shares">${myShares.map(shareRowHtml).join('')}</div>` : `<p class="pv-empty">${tr('No links yet. Use “Share” on a list to make one.')}</p>`}
        </div>
        <div class="pv-card">
          <div class="pv-card-h"><h3>${tr('My stores')}</h3></div>
          ${stores.length ? `<div class="pv-stores">${stores.map(s => `<span class="onb-chip on">${esc(s)}${storeCounts[s] ? ` <span class="onb-chip-n">${storeCounts[s]}</span>` : ''}</span>`).join('')}</div>` : `<p class="pv-empty">${tr('None set — {link}.', { link: `<button class="link-btn" id="pvSetStores">${tr('add some')}</button>` })}</p>`}
        </div>
        <div class="pv-card">
          <div class="pv-card-h"><h3>${tr('Top cards')}</h3></div>
          ${top.length ? `<div class="pv-top">${top.map((c, i) => `<div class="pv-toprow"><span class="pv-toprank">${i + 1}</span><span class="pv-topname nm" data-name="${esc(c.name)}">${esc(c.name)}</span><span class="pv-topval">${money(c.value)}</span></div>`).join('')}</div>` : `<p class="pv-empty">${tr('No owned cards yet.')}</p>`}
        </div>
        <div class="pv-card" id="pvWinsCard" hidden></div>
        <div class="pv-card">
          <div class="pv-card-h"><h3>${tr('Public profile')}</h3>${p.profilePublic ? `<span class="pv-pub-on">${tr('● public')}</span>` : ''}</div>
          <p class="pv-hint">${tr('A shareable page with your decks, stores & trades. Your total collection value always stays private.')}</p>
          <label class="pv-toggle"><input type="checkbox" id="pvPublic" ${p.profilePublic ? 'checked' : ''}/> <b>${tr('Make my profile public')}</b></label>
          ${p.profilePublic ? `<div class="pv-publiclink"><input type="text" id="pvProfileLink" readonly value="${esc(profilePublicUrl())}"/><button class="btn" data-pvcopyprofile>${tr('Copy')}</button><a class="btn" href="${esc(profilePublicUrl())}" target="_blank" rel="noopener">${tr('Open ↗')}</a></div>` : ''}
          <div class="pv-pub-subs">
            <p class="pv-hint">${tr('What the page shows (always: your display name & @handle):')}</p>
            <label class="pv-toggle"><input type="checkbox" id="pvPubIdentity" ${p.publicIdentity ? 'checked' : ''}/> ${tr('My real name & city')}</label>
            <label class="pv-toggle"><input type="checkbox" id="pvPubDecks" ${p.publicDecks !== false ? 'checked' : ''}/> ${tr('My decks')}</label>
            <label class="pv-toggle"><input type="checkbox" id="pvPubStores" ${p.publicStores !== false ? 'checked' : ''}/> ${tr('My stores')}</label>
            <label class="pv-toggle"><input type="checkbox" id="pvPubTop" ${p.publicTopCards ? 'checked' : ''}/> ${tr('My top 5 cards')}</label>
          </div>
        </div>
      </div>
    </div>`;
  renderFriends();
  renderWinsCard();   // paint cached wins immediately (if any), then refresh from the server
  if (un) loadMyWins();
}
// milestone tier from total wins: 1–4 Bronze, 5–9 Silver, 10–24 Gold, 25+ Mythic
function winsTier(n) {
  if (n >= 25) return tr('Mythic');
  if (n >= 10) return tr('Gold');
  if (n >= 5) return tr('Silver');
  if (n >= 1) return tr('Bronze');
  return '';
}
async function loadMyWins() {
  if (!sb || !authProfile || !authProfile.username) return;
  try {
    const { data, error } = await sb.rpc('get_user_wins', { p_username: authProfile.username });
    if (error || !data) return;
    myWins = data;
    renderWinsCard();
  } catch (e) { /* graceful: leave the card hidden */ }
}
function renderWinsCard() {
  const el = $('#pvWinsCard'); if (!el) return;
  const w = myWins || {};
  const wins = Number(w.wins) || 0;
  const recent = Array.isArray(w.recent) ? w.recent : [];
  if (!wins && !recent.length) {
    if (myWins === null) { el.hidden = true; return; }   // not loaded yet — keep hidden, no flash
    el.hidden = false;
    el.innerHTML = `<div class="pv-card-h"><h3>${tr('Tournament wins')}</h3></div><p class="pv-empty">${tr('No tournament wins yet.')}</p>`;
    return;
  }
  el.hidden = false;
  const tier = winsTier(wins);
  const headline = wins === 1 ? tr('Winner of 1 tournament') : tr('Winner of {n} tournaments', { n: wins });
  const recentHtml = recent.slice(0, 5).map(r => {
    const medal = placementMedal(r.placement);
    const store = r.store_name || r.store_slug || '';
    const sub = store ? ' <span class="pv-win-at">' + tr('at {store}', { store: esc(store) }) + '</span>' : '';
    const slug = r.store_slug || '';
    const title = `<span class="pv-win-title">${esc(r.event_title || '')}</span>`;
    return `<div class="pv-win-row">${medal ? `<span class="pv-win-medal">${medal}</span>` : ''}${slug ? `<button class="link-btn pv-win-link" data-pvstore="${esc(slug)}">${title}${sub}</button>` : `<span>${title}${sub}</span>`}</div>`;
  }).join('');
  el.innerHTML = `<div class="pv-card-h"><h3>${tr('Tournament wins')}</h3>${tier ? `<span class="pv-win-tier ${esc(winsTierToken(wins))}">${esc(tier)}</span>` : ''}</div>
    <div class="pv-win-headline">${esc(headline)}</div>
    ${recentHtml ? `<div class="pv-wins">${recentHtml}</div>` : ''}`;
}
// internal CSS token for the tier badge color (not user-visible — never translated)
function winsTierToken(n) { return n >= 25 ? 'mythic' : n >= 10 ? 'gold' : n >= 5 ? 'silver' : 'bronze'; }
const profileViewEl = $('#profileView');
if (profileViewEl) {
  profileViewEl.addEventListener('click', e => {
    let m;
    if (e.target.closest('#pvSignIn')) { openAuth('signin'); return; }
    if (e.target.closest('#pvEdit')) { openProfile(); return; }
    if ((m = e.target.closest('[data-pvstar]'))) { const d = state.decks.find(x => x.id === m.dataset.pvstar); if (d) { d.playing = !d.playing; save(); renderProfileView(); } return; }
    if ((m = e.target.closest('[data-pvdeck]'))) { openDeck(m.dataset.pvdeck); return; }
    if ((m = e.target.closest('[data-pvgo]'))) { setView(m.dataset.pvgo); return; }
    if ((m = e.target.closest('[data-pvshare]'))) { openShare(m.dataset.pvshare); return; }
    if ((m = e.target.closest('[data-shareqr]'))) { openQrModal(m.dataset.shareqr); return; }
    if ((m = e.target.closest('[data-sharecopy]'))) { copyText(shareUrl(m.dataset.sharecopy)).then(ok => toast(ok ? tr('Link copied ✓') : tr('Copy failed'))); return; }
    if ((m = e.target.closest('[data-sharerevoke]'))) { const code = m.dataset.sharerevoke; if (confirm(tr('Revoke this link? Anyone holding it will no longer be able to open the list.'))) revokeShare(code).then(() => renderProfileView()); return; }
    if (e.target.closest('#pvImportDeck')) { openImport(); return; }
    if (e.target.closest('#pvSetStores')) { startOnboarding(); return; }
    if (e.target.closest('[data-pvcopyprofile]')) { copyText(profilePublicUrl()).then(ok => toast(ok ? tr('Profile link copied ✓') : tr('Copy failed'))); return; }
    if ((m = e.target.closest('[data-pvprofile]'))) { openPublicProfile(m.dataset.pvprofile); return; }
    if (e.target.closest('#friendAddBtn')) { const i = $('#friendAddInput'); if (i) sendFriendRequest(i.value); return; }
    if ((m = e.target.closest('[data-fraccept]'))) { respondFriend(m.dataset.fraccept, true); return; }
    if ((m = e.target.closest('[data-frdecline]'))) { respondFriend(m.dataset.frdecline, false); return; }
    if ((m = e.target.closest('[data-frmatch]'))) { matchWithFriend(m.dataset.frmatch, m.dataset.frname); return; }
    if ((m = e.target.closest('[data-frremove]'))) { removeFriend(m.dataset.frremove); return; }
    if ((m = e.target.closest('[data-frprofile]'))) { openPublicProfile(m.dataset.frprofile); return; }
    if ((m = e.target.closest('[data-pvstore]'))) { window.open(storePublicUrl(m.dataset.pvstore), '_blank', 'noopener'); return; }
  });
  profileViewEl.addEventListener('input', e => {
    if (e.target.id === 'pvSearchInput') { profileSearchQuery = e.target.value; clearTimeout(profileSearchTimer); profileSearchTimer = setTimeout(runProfileSearch, 280); }
  });
  profileViewEl.addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target.id === 'friendAddInput') { e.preventDefault(); sendFriendRequest(e.target.value); }
  });
  profileViewEl.addEventListener('change', e => {
    if (e.target.id === 'pvPublic') { togglePublicProfile(e.target.checked); }
    else if (e.target.id === 'pvPubIdentity') { setPublicPref('publicIdentity', e.target.checked).then(maybeRepublishProfile); }
    else if (e.target.id === 'pvPubDecks') { setPublicPref('publicDecks', e.target.checked).then(maybeRepublishProfile); }
    else if (e.target.id === 'pvPubStores') { setPublicPref('publicStores', e.target.checked).then(maybeRepublishProfile); }
    else if (e.target.id === 'pvPubTop') { setPublicPref('publicTopCards', e.target.checked).then(maybeRepublishProfile); }
  });
}

// account / auth / profile listeners
const accountBtnEl = $('#accountBtn'); if (accountBtnEl) accountBtnEl.addEventListener('click', () => { if (authUser) { setView('profile'); renderProfileView(); loadFriends(); } else openAuth('signin'); });
const closeAuthEl = $('#closeAuth'); if (closeAuthEl) closeAuthEl.addEventListener('click', closeAuth);
const authModalEl = $('#authModal'); if (authModalEl) authModalEl.addEventListener('click', e => { if (e.target.id === 'authModal') closeAuth(); });
const authSubmitEl = $('#authSubmit'); if (authSubmitEl) authSubmitEl.addEventListener('click', doAuth);
const authSwitchEl = $('#authSwitch'); if (authSwitchEl) authSwitchEl.addEventListener('click', () => { authMode = authMode === 'signup' ? 'signin' : 'signup'; renderAuthMode(); $('#authStatus').textContent = ''; });
const authPwEl = $('#authPassword'); if (authPwEl) authPwEl.addEventListener('keydown', e => { if (e.key === 'Enter') doAuth(); });
const closeProfileEl = $('#closeProfile'); if (closeProfileEl) closeProfileEl.addEventListener('click', closeProfile);
const profileModalEl = $('#profileModal'); if (profileModalEl) profileModalEl.addEventListener('click', e => { if (e.target.id === 'profileModal') closeProfile(); });
const profileBodyEl = $('#profileBody'); if (profileBodyEl) profileBodyEl.addEventListener('click', e => {
  if (e.target.closest('#pfSave')) saveProfileEdits();
  else if (e.target.closest('#pfSignOut')) signOut();
  else if (e.target.closest('#pfPush')) forceSyncPush();
  else if (e.target.closest('#pfPull')) forceSyncPull();
  else if (e.target.closest('#pfRerun')) { closeProfile(); startOnboarding(); }
});
const syncDoneEl = $('#syncDone'); if (syncDoneEl) syncDoneEl.addEventListener('click', closeSyncOverlay);
const syncCloseEl = $('#syncClose'); if (syncCloseEl) syncCloseEl.addEventListener('click', closeSyncOverlay);
document.addEventListener('visibilitychange', () => { if (!document.hidden) syncPullIfNewer(); });
window.addEventListener('focus', syncPullIfNewer);

// share buttons + share modal
const buyShareBtn = $('#buyShareBtn'); if (buyShareBtn) buyShareBtn.addEventListener('click', () => openShare('buy'));
const sellShareBtn = $('#sellShareBtn'); if (sellShareBtn) sellShareBtn.addEventListener('click', () => openShare('sell'));
const closeShareEl = $('#closeShare'); if (closeShareEl) closeShareEl.addEventListener('click', closeShare);
const shareModalEl = $('#shareModal');
if (shareModalEl) shareModalEl.addEventListener('click', e => {
  if (e.target.id === 'shareModal') { closeShare(); return; }
  let m;
  if (e.target.closest('#shareSignIn')) { closeShare(); openAuth('signin'); return; }
  if ((m = e.target.closest('[data-sharelive]'))) { shareCtx.live = m.dataset.sharelive === '1'; shareLastResult = null; renderShareModal(); return; }
  if (e.target.closest('#shareCreateBtn')) { doCreateShare(); return; }
  if (e.target.closest('#shareCopyBtn')) { const inp = $('#shareLinkInput'); if (inp) copyText(inp.value).then(ok => toast(ok ? tr('Link copied ✓') : tr('Copy failed'))); return; }
  if (e.target.closest('#shareQrDownload')) { if (shareLastResult) downloadQrPng(shareLastResult.url, qrSlug(shareTitleFor(shareCtx.kind, shareCtx.folderId))); return; }
  if ((m = e.target.closest('[data-shareqr]'))) { openQrModal(m.dataset.shareqr); return; }
  if ((m = e.target.closest('[data-sharecopy]'))) { copyText(shareUrl(m.dataset.sharecopy)).then(ok => toast(ok ? tr('Link copied ✓') : tr('Copy failed'))); return; }
  if ((m = e.target.closest('[data-sharerevoke]'))) { const code = m.dataset.sharerevoke; if (confirm(tr('Revoke this link? Anyone holding it will no longer be able to open the list.'))) revokeShare(code).then(() => { renderShareModal(); renderProfileView(); }); return; }
});

// QR modal (opens over the share modal or the profile view)
const closeQrEl = $('#closeQr'); if (closeQrEl) closeQrEl.addEventListener('click', closeQr);
const qrModalEl = $('#qrModal');
if (qrModalEl) qrModalEl.addEventListener('click', e => {
  if (e.target.id === 'qrModal') { closeQr(); return; }
  let m;
  if ((m = e.target.closest('[data-qrdownload]'))) { const s = myShares.find(x => x.code === m.dataset.qrdownload); downloadQrPng(shareUrl(m.dataset.qrdownload), qrSlug(s && s.title ? s.title : (s && s.kind === 'sell' ? 'sell-list' : 'buy-list'))); return; }
  if ((m = e.target.closest('[data-qrcopy]'))) { copyText(shareUrl(m.dataset.qrcopy)).then(ok => toast(ok ? tr('Link copied ✓') : tr('Copy failed'))); return; }
});

// deck publish / community-share modal
const closeDeckShareEl = $('#closeDeckShare'); if (closeDeckShareEl) closeDeckShareEl.addEventListener('click', closeDeckShare);
const deckShareModalEl = $('#deckShareModal');
if (deckShareModalEl) deckShareModalEl.addEventListener('click', e => {
  if (e.target.id === 'deckShareModal') { closeDeckShare(); return; }
  if (e.target.closest('#deckShareSignIn')) { closeDeckShare(); openAuth('signin'); return; }
  if (e.target.closest('#deckPublishBtn')) { doPublishDeck(); return; }
  if (e.target.closest('#deckUnpublishBtn')) { doUnpublishDeck(); return; }
  if (e.target.closest('#deckShareCopy')) { const inp = $('#deckShareLink'); if (inp) copyText(inp.value).then(ok => toast(ok ? tr('Link copied ✓') : tr('Copy failed'))); return; }
  if (e.target.closest('#deckShareQr')) { const inp = $('#deckShareLink'); if (inp) downloadQrPng(inp.value, 'vault-deck'); return; }
});

// home (landing) listeners
const brandHomeEl = $('#brandHome'); if (brandHomeEl) brandHomeEl.addEventListener('click', () => { setView('home'); renderHome(); $('#homeSearch') && $('#homeSearch').focus(); });
const homeSearchEl = $('#homeSearch');
if (homeSearchEl) {
  homeSearchEl.addEventListener('input', e => { homeQuery = e.target.value; renderHomeResults(); homeMvDebounced(homeQuery); });
  homeSearchEl.addEventListener('keydown', e => { if (e.key === 'Enter') { homeQuery = e.target.value; homeGoBrowse(); } });
}
const siteFooterEl = $('#siteFooter');
if (siteFooterEl) siteFooterEl.addEventListener('click', e => { const b = e.target.closest('[data-foot-view]'); if (b) { setView(b.dataset.footView); window.scrollTo(0, 0); } });
let homeResizeTimer;
window.addEventListener('resize', () => { clearTimeout(homeResizeTimer); homeResizeTimer = setTimeout(() => { const v = $('#view-home'); if (v && v.classList.contains('is-active')) renderHomeBg(); }, 250); });
const homeViewEl = $('#view-home');
if (homeViewEl) homeViewEl.addEventListener('click', e => {
  let m;
  if ((m = e.target.closest('[data-homego]'))) { setView(m.dataset.homego); return; }
  if ((m = e.target.closest('[data-homedeck]'))) { openDeck(m.dataset.homedeck); return; }
  if ((m = e.target.closest('[data-homecard]'))) { openCardView(m.dataset.homecard); return; }
  if ((m = e.target.closest('[data-homemv]'))) { homeGoBrowseCard(m.dataset.homemv); return; }
  if (e.target.closest('[data-homebrowse]')) { homeGoBrowse(); return; }
});

/* ---------- boot ---------- */
I18N.lang = state.prefs.lang;
document.documentElement.lang = state.prefs.lang;
I18N.apply();        // translate the static index.html chrome
applyLang();         // light the active EN/ES button
applyTheme(state.prefs.theme);
pickAppBg();
if ($('#view-home') && $('#view-home').classList.contains('is-active')) document.documentElement.classList.add('home-active');   // home is the default landing
render();
initSync();
consumeIncomingMatch();   // a shared list opened via "Match with my lists" lands here
consumeIncomingDeck();    // a shared deck opened via "Import this deck" lands here
if (sb) consumeIncomingBuyStore();   // a store's "match my buy list" hand-off lands here
consumeStoreInvite();     // a store invite link (?store-invite=) lands here
consumeStaffInvite();     // a staff invite link (?store-staff=) lands here
