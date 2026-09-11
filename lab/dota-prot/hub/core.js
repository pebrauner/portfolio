/* ============================================================
   Hub core - element builder, formatters, asset resolvers,
   rdy.gg link builders, tab controller, mount registry.

   Owned by the shell. Component agents must NOT edit this file:
   report a change request instead.

   Load order (see the shell):
     data/ti2026.js  ->  window.TI2026
     data/gf-game5-snapshot.js  ->  window.GF5
     hub/core.js  ->  window.Hub
     hub/live.js  hub/tournament.js  hub/editorial.js
   ============================================================ */
(function (global) {
  'use strict';

  /* ---------- constants ---------- */

  var PORTRAIT_DIR = 'assets/dota2_portraits/';
  var ITEM_DIR = 'assets/dota2_items/';
  var TEAM_DIR = 'assets/teams/';
  var RDY = 'https://rdy.gg/en/dota2';

  /* Hero portrait files present in assets/dota2_portraits (127 files).
     Valve internal names, no extension. Used so a component can ask
     before it renders instead of shipping a 404. */
  var HERO_FILES = ('abaddon,abyssal_underlord,alchemist,ancient_apparition,antimage,arc_warden,axe,bane,' +
    'batrider,beastmaster,bloodseeker,bounty_hunter,brewmaster,bristleback,broodmother,centaur,chaos_knight,' +
    'chen,clinkz,crystal_maiden,dark_seer,dark_willow,dawnbreaker,dazzle,death_prophet,disruptor,doom_bringer,' +
    'dragon_knight,drow_ranger,earth_spirit,earthshaker,elder_titan,ember_spirit,enchantress,enigma,' +
    'faceless_void,furion,grimstroke,gyrocopter,hoodwink,huskar,invoker,jakiro,juggernaut,keeper_of_the_light,' +
    'kez,kunkka,largo,legion_commander,leshrac,lich,life_stealer,lina,lion,lone_druid,luna,lycan,magnataur,' +
    'marci,mars,medusa,meepo,mirana,monkey_king,morphling,muerta,naga_siren,necrolyte,nevermore,night_stalker,' +
    'nyx_assassin,obsidian_destroyer,ogre_magi,omniknight,oracle,pangolier,phantom_assassin,phantom_lancer,' +
    'phoenix,primal_beast,puck,pudge,pugna,queenofpain,rattletrap,razor,riki,ringmaster,rubick,sand_king,' +
    'shadow_demon,shadow_shaman,shredder,silencer,skeleton_king,skywrath_mage,slardar,slark,snapfire,sniper,' +
    'spectre,spirit_breaker,storm_spirit,sven,techies,templar_assassin,terrorblade,tidehunter,tinker,tiny,' +
    'treant,troll_warlord,tusk,undying,ursa,vengefulspirit,venomancer,viper,visage,void_spirit,warlock,weaver,' +
    'windrunner,winter_wyvern,wisp,witch_doctor,zuus').split(',');

  var HERO_SET = {};
  for (var hi = 0; hi < HERO_FILES.length; hi++) { HERO_SET[HERO_FILES[hi]] = true; }

  /* Asset registries. TI2026.portraits / TI2026.items ship
     { base, ext, existing:[...] } and always win over the list above. */
  function registryFor(kind) {
    var d = data();
    var reg = kind === 'item' ? d.items : d.portraits;
    if (reg && reg.existing && reg.existing.length) {
      if (!reg._set) {
        reg._set = {};
        for (var i = 0; i < reg.existing.length; i++) { reg._set[String(reg.existing[i]).toLowerCase()] = true; }
      }
      return { base: reg.base || (kind === 'item' ? ITEM_DIR : PORTRAIT_DIR), ext: reg.ext || '.png', set: reg._set };
    }
    if (kind === 'item') return { base: ITEM_DIR, ext: '.png', set: null };
    return { base: PORTRAIT_DIR, ext: '.png', set: HERO_SET };
  }

  /* Team logo files that exist under assets/teams today. Data may override
     with team.logo. Anything not here resolves to null -> monogram chip. */
  /* assets/teams/1win.png is a stock photograph of another organisation, not
     a mark, so Iron Wing has no crest on file and falls back to a monogram. */
  var TEAM_LOGO_FALLBACK = {
    spirit: 'spirit.png',
    vision: 'Parivision.webp',
    parivision: 'Parivision.webp',
    yandex: 'Yandex.webp',
    boomboys: 'betboom.png',
    betboom: 'betboom.png',
    liquid: 'liquid.png',
    falcons: 'falcons.png',
    lgd: 'lgd-gaming.png',
    lgdgaming: 'lgd-gaming.png',
    xtreme: 'xtreme.png',
    xtremegaming: 'xtreme.png',
    og: 'og.png'
  };

  /* Slug used for rdy.gg hero routes: Valve internal name -> display slug.
     Only the names that differ need an entry. */
  var HERO_ROUTE_SLUG = {
    antimage: 'anti-mage',
    doom_bringer: 'doom',
    furion: 'natures-prophet',
    magnataur: 'magnus',
    necrolyte: 'necrophos',
    nevermore: 'shadow-fiend',
    obsidian_destroyer: 'outworld-destroyer',
    queenofpain: 'queen-of-pain',
    rattletrap: 'clockwerk',
    shredder: 'timbersaw',
    skeleton_king: 'wraith-king',
    treant: 'treant-protector',
    vengefulspirit: 'vengeful-spirit',
    wisp: 'io',
    zuus: 'zeus',
    centaur: 'centaur-warrunner',
    largo: 'largo',
    kez: 'kez'
  };

  /* ---------- tiny helpers ---------- */

  function isNil(v) { return v === null || v === undefined; }

  function norm(v) {
    return String(v === null || v === undefined ? '' : v).toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  function data() { return global.TI2026 || {}; }
  function snapshot() { return global.GF5 || {}; }

  /* ---------- h(): element builder ----------
     h('div', {class:'card'}, h('span', null, 'hi'), 'text')
     attrs: class/className, id, text, html (trusted only), style (string or
     object), dataset keys via data-*, aria-* / role / any attribute, and
     on* handlers (onclick: fn). null / undefined / false children skipped. */
  function h(tag, attrs, /* ...children */) {
    var el = document.createElement(tag);
    if (attrs) {
      for (var k in attrs) {
        if (!Object.prototype.hasOwnProperty.call(attrs, k)) continue;
        var v = attrs[k];
        if (isNil(v) || v === false) continue;
        if (k === 'class' || k === 'className') { el.className = v; }
        else if (k === 'text') { el.textContent = v; }
        else if (k === 'html') { el.innerHTML = v; }
        else if (k === 'style') {
          if (typeof v === 'string') { el.setAttribute('style', v); }
          else { for (var s in v) { if (Object.prototype.hasOwnProperty.call(v, s)) el.style.setProperty(s, v[s]); } }
        }
        else if (k === 'dataset') { for (var d in v) { if (Object.prototype.hasOwnProperty.call(v, d)) el.dataset[d] = v[d]; } }
        else if (k.slice(0, 2) === 'on' && typeof v === 'function') { el.addEventListener(k.slice(2), v); }
        else if (v === true) { el.setAttribute(k, ''); }
        else { el.setAttribute(k, v); }
      }
    }
    appendChildren(el, Array.prototype.slice.call(arguments, 2));
    return el;
  }

  function appendChildren(el, kids) {
    for (var i = 0; i < kids.length; i++) {
      var c = kids[i];
      if (isNil(c) || c === false || c === '') continue;
      if (Array.isArray(c)) { appendChildren(el, c); continue; }
      if (c.nodeType) { el.appendChild(c); continue; }
      el.appendChild(document.createTextNode(String(c)));
    }
  }

  /* frag(...children) for returning several nodes at once */
  function frag() {
    var f = document.createDocumentFragment();
    appendChildren(f, Array.prototype.slice.call(arguments));
    return f;
  }

  /* ---------- SVG helpers ---------- */

  var SVG_NS = 'http://www.w3.org/2000/svg';

  function svg(tag, attrs /* ...children */) {
    var el = document.createElementNS(SVG_NS, tag);
    if (attrs) {
      for (var k in attrs) {
        if (!Object.prototype.hasOwnProperty.call(attrs, k)) continue;
        var v = attrs[k];
        if (isNil(v) || v === false) continue;
        if (k === 'text') { el.textContent = v; continue; }
        if (k.slice(0, 2) === 'on' && typeof v === 'function') { el.addEventListener(k.slice(2), v); continue; }
        el.setAttribute(k === 'className' ? 'class' : k, v);
      }
    }
    appendChildren(el, Array.prototype.slice.call(arguments, 2));
    return el;
  }

  /* points: [[x,y], ...] -> "M x y L x y ..." ; closed adds Z */
  function svgPath(points, closed) {
    if (!points || !points.length) return '';
    var d = 'M' + points[0][0] + ' ' + points[0][1];
    for (var i = 1; i < points.length; i++) { d += 'L' + points[i][0] + ' ' + points[i][1]; }
    return closed ? d + 'Z' : d;
  }

  /* Catmull-Rom -> cubic bezier, for a gold curve that is not jagged.
     tension 0 = straight segments, .5 = smooth. */
  function svgSmoothPath(points, tension) {
    if (!points || points.length < 3) return svgPath(points);
    var t = isNil(tension) ? 0.5 : tension;
    var d = 'M' + points[0][0] + ' ' + points[0][1];
    for (var i = 0; i < points.length - 1; i++) {
      var p0 = points[i - 1] || points[i];
      var p1 = points[i];
      var p2 = points[i + 1];
      var p3 = points[i + 2] || p2;
      var c1x = p1[0] + (p2[0] - p0[0]) / 6 * t * 2;
      var c1y = p1[1] + (p2[1] - p0[1]) / 6 * t * 2;
      var c2x = p2[0] - (p3[0] - p1[0]) / 6 * t * 2;
      var c2y = p2[1] - (p3[1] - p1[1]) / 6 * t * 2;
      d += 'C' + r2(c1x) + ' ' + r2(c1y) + ' ' + r2(c2x) + ' ' + r2(c2y) + ' ' + r2(p2[0]) + ' ' + r2(p2[1]);
    }
    return d;
  }

  function r2(n) { return Math.round(n * 100) / 100; }

  /* linear scale factory: scale(domain [min,max], range [min,max]) */
  function scale(domain, range) {
    var d0 = domain[0], d1 = domain[1], r0 = range[0], r1 = range[1];
    var span = (d1 - d0) || 1;
    return function (v) { return r0 + (v - d0) / span * (r1 - r0); };
  }

  /* single-colour inline icon, fill currentColor */
  function icon(pathD, opts) {
    opts = opts || {};
    return svg('svg', {
      'class': 'icon ' + (opts.className || ''),
      viewBox: opts.viewBox || '0 0 24 24',
      width: '1em', height: '1em', fill: 'currentColor',
      'aria-hidden': 'true', focusable: 'false'
    }, svg('path', { d: pathD }));
  }

  /* ---------- formatters ---------- */

  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  var fmt = {
    /* 21400 -> "21,400" ; null -> "" */
    num: function (n, fallback) {
      if (isNil(n) || isNaN(n)) return isNil(fallback) ? '' : fallback;
      return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    },
    /* k-style gold: 21400 -> "21.4k", 940 -> "940", 112300 -> "112.3k" */
    gold: function (n, fallback) {
      if (isNil(n) || isNaN(n)) return isNil(fallback) ? '' : fallback;
      var a = Math.abs(n);
      var sign = n < 0 ? '-' : '';
      if (a < 1000) return sign + Math.round(a);
      var k = a / 1000;
      return sign + (k >= 100 ? k.toFixed(1) : k.toFixed(1)) + 'k';
    },
    /* signed gold, for a lead: +7.8k / -1.2k */
    goldSigned: function (n, fallback) {
      if (isNil(n) || isNaN(n)) return isNil(fallback) ? '' : fallback;
      return (n > 0 ? '+' : '') + fmt.gold(n);
    },
    /* 3862 -> "64:22" ; supports over an hour as mm:ss past 60 */
    clock: function (seconds, fallback) {
      if (isNil(seconds) || isNaN(seconds)) return isNil(fallback) ? '' : fallback;
      var s = Math.max(0, Math.round(seconds));
      var m = Math.floor(s / 60);
      var rest = s % 60;
      return m + ':' + (rest < 10 ? '0' : '') + rest;
    },
    /* minutes -> "42:00" */
    clockFromMinutes: function (minutes, fallback) {
      if (isNil(minutes) || isNaN(minutes)) return isNil(fallback) ? '' : fallback;
      return fmt.clock(minutes * 60);
    },
    /* "2026-08-23" -> "23 Aug 2026" ; style 'short' -> "23 Aug" ;
       style 'weekday' -> "Sunday, 23 August 2026" */
    date: function (iso, style, fallback) {
      if (!iso) return isNil(fallback) ? '' : fallback;
      var parts = String(iso).slice(0, 10).split('-');
      if (parts.length < 3) return String(iso);
      var y = Number(parts[0]), mo = Number(parts[1]) - 1, da = Number(parts[2]);
      if (isNaN(y) || isNaN(mo) || isNaN(da)) return String(iso);
      if (style === 'short') return da + ' ' + MONTHS[mo];
      if (style === 'weekday') {
        var dt = new Date(Date.UTC(y, mo, da));
        var wd = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dt.getUTCDay()];
        var full = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
          'August', 'September', 'October', 'November', 'December'][mo];
        return wd + ', ' + da + ' ' + full + ' ' + y;
      }
      return da + ' ' + MONTHS[mo] + ' ' + y;
    },
    /* 0.632 -> "63%" ; (63.2, {raw:true}) -> "63%" */
    pct: function (v, opts) {
      opts = opts || {};
      if (isNil(v) || isNaN(v)) return isNil(opts.fallback) ? '' : opts.fallback;
      var n = opts.raw ? v : v * 100;
      return n.toFixed(isNil(opts.digits) ? 0 : opts.digits) + '%';
    },
    /* "23 Aug 2026" style label for a series: "Bo5" */
    bo: function (n) { return isNil(n) ? '' : 'Bo' + n; },
    /* prints a value or a dash when the data says null. Never invent. */
    orDash: function (v) { return isNil(v) || v === '' ? '-' : v; }
  };

  /* ---------- asset resolvers ---------- */

  function heroExists(internalName) {
    var r = registryFor('hero');
    var n = String(internalName || '').toLowerCase();
    return !!(n && (!r.set || r.set[n]));
  }

  /* 'dark_seer' -> 'assets/dota2_portraits/dark_seer.png', or null if the
     file is not in the repo (caller renders a placeholder tile). */
  function heroPortrait(internalName) {
    var r = registryFor('hero');
    var n = String(internalName || '').toLowerCase();
    if (!n) return null;
    if (r.set && !r.set[n]) return null;
    return r.base + n + r.ext;
  }

  /* 'Dark Seer' -> 'dark_seer' via TI2026.heroIndex (display -> internal).
     Returns the input lowercased with spaces as underscores when the index
     has no entry, so a caller can still try. */
  function heroInternal(displayName) {
    if (!displayName) return null;
    var idx = data().heroIndex;
    if (idx && idx[displayName]) return idx[displayName];
    if (idx) {
      var want = norm(displayName);
      for (var k in idx) {
        if (Object.prototype.hasOwnProperty.call(idx, k) && norm(k) === want) return idx[k];
      }
    }
    return String(displayName).toLowerCase().replace(/[^a-z0-9]+/g, '_');
  }

  function itemExists(itemName) {
    var r = registryFor('item');
    var n = String(itemName || '').toLowerCase().replace(/^item_/, '');
    return !!(n && (!r.set || r.set[n]));
  }

  /* 'black_king_bar' -> 'assets/dota2_items/black_king_bar.png', or null
     when the file is not in the repo (render an empty item slot). */
  function itemIcon(itemName) {
    var r = registryFor('item');
    var n = String(itemName || '').toLowerCase().replace(/^item_/, '');
    if (!n) return null;
    if (r.set && !r.set[n]) return null;
    return r.base + n + r.ext;
  }

  /* returns a path or null. Data wins: TI2026 team.logo is used as-is. */
  function teamLogo(teamKey) {
    var t = team(teamKey);
    if (t && t.logo) return t.logo;
    var f = TEAM_LOGO_FALLBACK[norm(teamKey)] || (t ? TEAM_LOGO_FALLBACK[norm(t.key || t.name)] : null);
    return f ? TEAM_DIR + f : null;
  }

  /* ---------- team lookup ---------- */

  var teamIndex = null;

  function buildTeamIndex() {
    teamIndex = {};
    var list = data().teams;
    if (!list) return;
    var arr = Array.isArray(list) ? list : Object.keys(list).map(function (k) {
      var v = list[k];
      if (v && typeof v === 'object' && !v.key) v.key = k;
      return v;
    });
    for (var i = 0; i < arr.length; i++) {
      var t = arr[i];
      if (!t) continue;
      var keys = [t.key, t.id, t.slug, t.tag, t.name, t.shortName, t.displayName];
      if (Array.isArray(t.aliases)) keys = keys.concat(t.aliases);
      for (var j = 0; j < keys.length; j++) {
        var k2 = norm(keys[j]);
        if (k2 && !teamIndex[k2]) teamIndex[k2] = t;
      }
    }
  }

  function team(teamKey) {
    if (!teamKey) return null;
    if (typeof teamKey === 'object') return teamKey;
    if (!teamIndex) buildTeamIndex();
    return teamIndex[norm(teamKey)] || null;
  }

  function teamName(teamKey) {
    var t = team(teamKey);
    return t ? (t.name || t.displayName || String(teamKey)) : String(teamKey || '');
  }

  /* deterministic, muted disc colour when the data has no team colour */
  function teamColor(teamKey) {
    var t = team(teamKey);
    if (t && (t.colour || t.color)) return t.colour || t.color;
    var s = norm(t ? (t.key || t.name) : teamKey) || 'x';
    var hash = 0;
    for (var i = 0; i < s.length; i++) { hash = (hash * 31 + s.charCodeAt(i)) % 360; }
    return 'hsl(' + hash + ', 34%, 27%)';
  }

  /* A team colour is a brand colour, not a text background. Darken it over
     the page ground so white initials clear 4.5:1 on every team. */
  function discBackground(teamKey) {
    var c = teamColor(teamKey);
    return 'linear-gradient(rgba(1,9,23,.58), rgba(1,9,23,.58)), linear-gradient(' + c + ', ' + c + ')';
  }

  /* The same darkened colour as a flat value. discBackground paints it as a
     gradient pair, which a contrast reader cannot see through: it reads the
     computed background-color and finds the raw brand colour underneath
     (verifier I06, white on Nigma Galaxy green measured 2.3:1). Setting this
     as the background-color as well changes nothing visually, because the
     opaque gradient covers it, and makes the measured value the true one. */
  function discColor(teamKey) {
    return 'color-mix(in srgb, ' + teamColor(teamKey) + ' 42%, #010917)';
  }

  function initials(str, max) {
    var s = String(str || '').replace(/[^A-Za-z0-9 _.\-]/g, '').trim();
    if (!s) return '?';
    var words = s.split(/[\s_.\-]+/).filter(Boolean);
    var out;
    if (words.length >= 2) { out = words[0].charAt(0) + words[1].charAt(0); }
    else { out = s.slice(0, 2); }
    return out.slice(0, max || 2).toUpperCase();
  }

  /* the one short code for a team, the same on every surface */
  function teamTag(teamKey) {
    var t = team(teamKey);
    if (t && t.abbr) return t.abbr;
    if (t && t.tag) return t.tag;
    return initials(t ? t.name : teamKey, 3);
  }

  function sameTeam(a, b) {
    var ta = team(a), tb = team(b);
    if (ta && tb) return (ta.key || ta.name) === (tb.key || tb.name);
    return norm(a) === norm(b);
  }

  /* ---------- kills pairs ---------- */

  /* The two finalists swap sides between games, so a raw radiant-dire kills
     pair reads left to right in a different order on every row: 42-17 leads
     with Spirit, 46-48 leads with VISION, and nothing on the row says which
     (verifier I01). Every surface that prints a pair goes through here, so
     the order is fixed once and both ends carry a tag.

     score       { radiant: n, dire: n } for THAT game, or null
     radiantKey  the team on Radiant in that game
     direKey     the team on Dire in that game
     opts.left   the team that always leads. Defaults to the Radiant team of
                 the frozen decider, which is the side every other surface on
                 the page leads with.
     opts.stack  two lines, tag then number, for a narrow cell. */
  function killsLeadKey() {
    var s = snapshot();
    return (s && s.sides && s.sides.radiant) || null;
  }

  function killsPairParts(score, radiantKey, direKey, leftKey) {
    if (!score || !radiantKey || !direKey) return null;
    var r = score.radiant, d = score.dire;
    if (typeof r !== 'number' || typeof d !== 'number') return null;
    var left = leftKey || killsLeadKey() || radiantKey;
    var leftIsRadiant = sameTeam(left, radiantKey);
    if (!leftIsRadiant && !sameTeam(left, direKey)) leftIsRadiant = true;
    return {
      left: { key: leftIsRadiant ? radiantKey : direKey, tag: teamTag(leftIsRadiant ? radiantKey : direKey), value: leftIsRadiant ? r : d },
      right: { key: leftIsRadiant ? direKey : radiantKey, tag: teamTag(leftIsRadiant ? direKey : radiantKey), value: leftIsRadiant ? d : r }
    };
  }

  function killsPairText(score, radiantKey, direKey, opts) {
    var p = killsPairParts(score, radiantKey, direKey, (opts || {}).left);
    if (!p) return '';
    return p.left.tag + ' ' + p.left.value + ' : ' + p.right.value + ' ' + p.right.tag;
  }

  function killsPair(score, radiantKey, direKey, opts) {
    opts = opts || {};
    var p = killsPairParts(score, radiantKey, direKey, opts.left);
    if (!p) return null;
    var cls = 'kills-pair' + (opts.stack ? ' kills-pair--stack' : '') +
      (opts.className ? ' ' + opts.className : '');
    function tag(t) { return h('span', { 'class': 'kp-tag' }, t); }
    function num(v) { return h('span', { 'class': 'kp-num u-tnum' }, String(v)); }
    if (opts.stack) {
      return h('span', { 'class': cls, title: killsPairText(score, radiantKey, direKey, opts) },
        h('span', { 'class': 'kp-row' }, tag(p.left.tag), num(p.left.value)),
        h('span', { 'class': 'kp-row' }, tag(p.right.tag), num(p.right.value)));
    }
    return h('span', { 'class': cls, title: killsPairText(score, radiantKey, direKey, opts) },
      h('span', { 'class': 'kp-side' }, tag(p.left.tag), num(p.left.value)),
      h('span', { 'class': 'kp-sep' }, ':'),
      h('span', { 'class': 'kp-side kp-side--right' }, num(p.right.value), tag(p.right.tag)));
  }

  /* ---------- avatar and monogram ---------- */

  /* player: { handle, photo?, realName? }. Returns an <img> when the photo
     path exists in the data, otherwise an initials disc on a team-coloured
     background. Size: 'sm' | '' | 'lg'. */
  function avatar(player, teamKey, size) {
    player = player || {};
    var cls = 'avatar' + (size ? ' avatar-' + size : '');
    var label = player.handle || player.name || '';
    if (player.photo) {
      var img = h('img', {
        'class': cls,
        src: encodeURI(player.photo),
        alt: label,
        loading: 'lazy',
        decoding: 'async',
        style: player.facePosition ? { 'object-position': player.facePosition } : null
      });
      img.addEventListener('error', function () {
        var fb = avatarInitials(label, teamKey, size);
        if (img.parentNode) img.parentNode.replaceChild(fb, img);
      });
      return img;
    }
    return avatarInitials(label, teamKey, size);
  }

  function avatarInitials(label, teamKey, size) {
    return h('span', {
      'class': 'avatar avatar--initials' + (size ? ' avatar-' + size : ''),
      style: { 'background-color': discColor(teamKey), 'background-image': discBackground(teamKey), 'border-color': 'rgba(255,255,255,.12)' },
      'aria-hidden': label ? 'true' : null,
      title: label || null
    }, initials(label));
  }

  /* team logo <img>, or a monogram chip when no file exists.
     size: 'sm' | '' | 'lg' */
  function teamCrest(teamKey, size) {
    var t = team(teamKey);
    var name = teamName(teamKey);
    var cls = 'team-logo' + (size ? ' team-logo-' + size : '');
    var src = teamLogo(teamKey);
    if (src) {
      var img = h('img', { 'class': cls, src: encodeURI(src), alt: name, loading: 'lazy', decoding: 'async' });
      img.addEventListener('error', function () {
        var fb = monogram(teamKey, size);
        if (img.parentNode) img.parentNode.replaceChild(fb, img);
      });
      return img;
    }
    return monogram(teamKey, size);
  }

  function monogram(teamKey, size) {
    var t = team(teamKey);
    var name = teamName(teamKey);
    return h('span', {
      'class': 'monogram' + (size ? ' team-logo-' + size : ''),
      style: { 'background-color': discColor(teamKey), 'background-image': discBackground(teamKey) },
      title: name,
      'aria-hidden': 'true'
      /* the team's one short code, so a crest substitute and a text tag can
         never disagree about how a team is abbreviated */
    }, (t && t.abbr) ? t.abbr : initials(t && t.tag ? t.tag : name, 3));
  }

  /* hero portrait <img> or a neutral tile when the file is missing.
     side: 'radiant' | 'dire' | undefined ; size: 'sm' | '' | 'lg' */
  function heroImg(internalName, opts) {
    opts = opts || {};
    var cls = 'hero-portrait' +
      (opts.size ? ' hero-portrait-' + opts.size : '') +
      (opts.side ? ' hero-portrait--' + opts.side : '') +
      (opts.className ? ' ' + opts.className : '');
    var src = heroPortrait(internalName);
    var label = opts.alt || heroLabel(internalName);
    if (!src) return h('span', { 'class': cls + ' img-missing', title: label, 'aria-hidden': 'true' });
    return h('img', { 'class': cls, src: src, alt: label, title: label, loading: 'lazy', decoding: 'async' });
  }

  /* 'dark_seer' -> 'Dark Seer' (display fallback only; prefer a name from data) */
  function heroLabel(internalName) {
    return String(internalName || '').split('_').map(function (w) {
      return w ? w.charAt(0).toUpperCase() + w.slice(1) : w;
    }).join(' ');
  }

  /* ---------- rdy.gg links ---------- */

  var link = {
    /* finished match route; live/upcoming is /matches/{id} */
    match: function (id) { return id ? RDY + '/results/' + id : null; },
    liveMatch: function (id) { return id ? RDY + '/matches/' + id : null; },
    team: function (id) { return id ? RDY + '/teams/' + id : null; },
    player: function (id) { return id ? RDY + '/players/' + id : null; },
    hero: function (slugOrInternal) {
      if (!slugOrInternal) return null;
      var n = String(slugOrInternal).toLowerCase();
      var slug = HERO_ROUTE_SLUG[n] || n.replace(/_/g, '-');
      return RDY + '/heroes/' + slug;
    },
    tournament: function (id) { return id ? RDY + '/tournaments/' + id : null; },
    news: function (slug) { return slug ? RDY + '/news/' + slug : RDY + '/news'; },
    section: function (path) { return path ? RDY + '/' + path : RDY; }
  };

  /* anchor that degrades to a plain span when there is no real URL.
     Never emit href="#". */
  function extLink(href, attrs, /* ...children */) {
    var kids = Array.prototype.slice.call(arguments, 2);
    if (!href) return h.apply(null, [ 'span', attrs ].concat(kids));
    var a = Object.assign({}, attrs || {}, { href: href, target: '_blank', rel: 'noopener' });
    return h.apply(null, [ 'a', a ].concat(kids));
  }

  /* ---------- mount registry ---------- */

  var registry = {};
  var mounted = false;

  function register(mountId, renderFn) {
    if (!mountId || typeof renderFn !== 'function') return;
    registry[mountId] = renderFn;
    if (mounted) mountOne(document.getElementById(mountId));
  }

  function context() { return { TI2026: data(), GF5: snapshot(), Hub: Hub }; }

  function mountOne(el) {
    if (!el) return;
    var id = el.id || el.getAttribute('data-mount');
    var fn = registry[id];
    el.textContent = '';
    if (!fn) {
      el.appendChild(h('div', { 'class': 'mount-placeholder' }, 'component: ' + id));
      return;
    }
    try {
      fn(el, context());
    } catch (err) {
      el.appendChild(h('div', { 'class': 'mount-error' },
        'component ' + id + ' failed: ' + (err && err.message ? err.message : String(err))));
      if (global.console && console.error) console.error('[Hub] mount ' + id + ' failed', err);
    }
  }

  function mountAll() {
    var nodes = document.querySelectorAll('[data-mount]');
    for (var i = 0; i < nodes.length; i++) { mountOne(nodes[i]); }
    mounted = true;
  }

  /* ---------- tabs ---------- */

  var tabs = {
    init: function (opts) {
      opts = opts || {};
      var bar = document.querySelector(opts.bar || '[data-testid="tab-bar"]');
      if (!bar) return;
      var btns = Array.prototype.slice.call(bar.querySelectorAll('[role="tab"][data-tab]'));
      if (!btns.length) return;

      function panelFor(name) { return document.querySelector('[role="tabpanel"][data-panel="' + name + '"]'); }

      function activate(name, opt) {
        opt = opt || {};
        var found = false;
        for (var i = 0; i < btns.length; i++) {
          var b = btns[i];
          var on = b.getAttribute('data-tab') === name;
          if (on) found = true;
          b.setAttribute('aria-selected', on ? 'true' : 'false');
          b.tabIndex = on ? 0 : -1;
          var p = panelFor(b.getAttribute('data-tab'));
          if (p) p.hidden = !on;
        }
        if (!found) return false;
        if (opt.focus) {
          for (var j = 0; j < btns.length; j++) {
            if (btns[j].getAttribute('data-tab') === name) { btns[j].focus(); break; }
          }
        }
        if (opt.hash !== false) {
          try { history.replaceState(null, '', '#' + name); } catch (e) { location.hash = name; }
        }
        if (opt.scroll) window.scrollTo({ top: 0, behavior: 'smooth' });
        return true;
      }

      bar.addEventListener('click', function (ev) {
        var b = ev.target.closest ? ev.target.closest('[role="tab"][data-tab]') : null;
        if (!b) return;
        activate(b.getAttribute('data-tab'), { scroll: false });
      });

      bar.addEventListener('keydown', function (ev) {
        var i = btns.indexOf(document.activeElement);
        if (i < 0) return;
        var next = -1;
        if (ev.key === 'ArrowRight') next = (i + 1) % btns.length;
        else if (ev.key === 'ArrowLeft') next = (i - 1 + btns.length) % btns.length;
        else if (ev.key === 'Home') next = 0;
        else if (ev.key === 'End') next = btns.length - 1;
        if (next < 0) return;
        ev.preventDefault();
        activate(btns[next].getAttribute('data-tab'), { focus: true });
      });

      window.addEventListener('hashchange', function () {
        var name = (location.hash || '').replace(/^#/, '');
        if (name) activate(name, { hash: false });
      });

      var initial = (location.hash || '').replace(/^#/, '');
      if (!initial || !activate(initial, { hash: false })) {
        activate(btns[0].getAttribute('data-tab'), { hash: false });
      }

      Hub.tabs.activate = activate;
    },
    activate: function () { /* replaced by init */ }
  };

  /* ---------- delegated image error handler (no inline onerror) ---------- */

  function installImageGuard() {
    document.addEventListener('error', function (ev) {
      var t = ev.target;
      if (!t || t.tagName !== 'IMG' || t.dataset.imgGuard === 'done') return;
      t.dataset.imgGuard = 'done';
      t.classList.add('img-missing');
      t.removeAttribute('src');
      if (global.console && console.warn) console.warn('[Hub] image missing:', t.getAttribute('alt') || '(no alt)');
    }, true);
  }

  /* ---------- public API ---------- */

  var Hub = {
    version: '1.0.0',
    register: register,
    mountAll: mountAll,
    h: h,
    frag: frag,
    svg: svg,
    svgPath: svgPath,
    svgSmoothPath: svgSmoothPath,
    scale: scale,
    icon: icon,
    fmt: fmt,
    heroPortrait: heroPortrait,
    heroExists: heroExists,
    heroInternal: heroInternal,
    itemExists: itemExists,
    discBackground: discBackground,
    discColor: discColor,
    killsPair: killsPair,
    killsPairText: killsPairText,
    heroImg: heroImg,
    heroLabel: heroLabel,
    itemIcon: itemIcon,
    teamLogo: teamLogo,
    teamCrest: teamCrest,
    monogram: monogram,
    team: team,
    teamName: teamName,
    teamColor: teamColor,
    teamTag: teamTag,
    initials: initials,
    avatar: avatar,
    link: link,
    extLink: extLink,
    tabs: tabs,
    get data() { return data(); },
    get snapshot() { return snapshot(); }
  };

  global.Hub = Hub;

  function boot() {
    installImageGuard();
    buildTeamIndex();
    tabs.init();
    mountAll();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(window);
