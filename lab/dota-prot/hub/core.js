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
    /* P4R2-01, verified live 2026-09-11: an rdy.gg hero route IS the Valve
       internal name with underscores turned into hyphens. /heroes/nevermore,
       /rattletrap, /doom-bringer, /wisp, /furion and /centaur all resolve;
       the display spellings /shadow-fiend, /clockwerk, /doom, /io,
       /natures-prophet and /centaur-warrunner all 404. The old display-slug
       map did the translation backwards, so no exception table is kept:
       every name goes through the one rule. */
    hero: function (slugOrInternal) {
      if (!slugOrInternal) return null;
      return RDY + '/heroes/' + String(slugOrInternal).toLowerCase().replace(/_/g, '-');
    },
    tournament: function (id) { return id ? RDY + '/tournaments/' + id : null; },
    /* Phase 4: a finished SERIES lives on the same /results/ route as a match.
       Kept as its own name so a call site reads what it means. */
    series: function (id) { return id ? RDY + '/results/' + id : null; },
    /* Phase 4 fix P4-02: one map of a finished series. rdy.gg has no route
       keyed by the OpenDota match id, so /results/<matchId> falls through to
       the generic results listing. The map is selected by the series id plus
       ?mapTab=N, confirmed live and recorded in
       .claude/dota-work/rdy-match-page-notes.md lines 3 to 7 and 56.
       rdy.gg's own tabs do not rewrite the query after the first load, so
       ?mapTab=N is honoured on initial navigation only, which is exactly how
       an outbound link uses it. Without a map number this is link.series. */
    seriesMap: function (id, mapNumber) {
      if (!id) return null;
      var n = Number(mapNumber);
      if (!n || n < 1) return RDY + '/results/' + id;
      return RDY + '/results/' + id + '?mapTab=' + n;
    },
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

  /* Phase 4 link helper: any hero portrait or hero name may become a link to
     that hero's rdy.gg page. Degrades to a span when the internal name is
     missing, and NEVER emits an anchor inside an interactive control: that is
     the caller's job to avoid, because an <a> inside a <button> is invalid. */
  function heroLink(internalName, attrs /*, children */) {
    var kids = Array.prototype.slice.call(arguments, 2);
    var href = internalName ? link.hero(internalName) : null;
    return extLink.apply(null, [ href, attrs ].concat(kids));
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

  /* ---------- Phase 4: remount, for the map switcher ----------
     A component that wires anything OUTSIDE its own mount subtree (a listener
     on document or window, an observer, a subscription owned by another
     module) registers the undo here while it renders. remountAll runs every
     registered undo, then re-runs every mount function against whatever the
     data globals now hold. mountAll is untouched: a first boot registers
     nothing to undo, so the two are the same call on a cold page. */
  var teardowns = [];

  function onUnmount(fn) {
    if (typeof fn === 'function') teardowns.push(fn);
    return fn;
  }

  function runTeardowns() {
    var list = teardowns;
    teardowns = [];
    for (var i = list.length - 1; i >= 0; i--) {
      try { list[i](); } catch (err) {
        if (global.console && console.error) console.error('[Hub] teardown failed', err);
      }
    }
    return list.length;
  }

  function remountAll() {
    var undone = runTeardowns();
    mountAll();
    return undone;
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

  /* ---------- density (compact | detailed) ----------
     Pedro, 2026-09-12: "we have too much information on the screen. Let's do
     a compact version, maintaining the value, but less details."

     COMPACT is the default and the shipped state. Every module keeps its
     headline value on screen and moves the rest behind Hub.expander, which
     says in words what it reveals and how many. DETAILED is one switch that
     forces every expander open at once. Nothing is ever deleted: every number
     that was on the page stays reachable in at most two clicks.

     The mode lives on <body> as is-compact / is-detailed so CSS can react
     without a subscription, and in localStorage under 'dota-prot-density'.
     Storage is optional: a private window that throws on getItem simply
     starts compact every time. */

  var DENSITY_KEY = 'dota-prot-density';
  var DENSITY_DEFAULT = 'compact';
  var DENSITY_MODES = { compact: true, detailed: true };
  var densityMode = DENSITY_DEFAULT;
  var densitySubs = [];
  var densityBooted = false;

  function densityStored() {
    try {
      var v = global.localStorage ? global.localStorage.getItem(DENSITY_KEY) : null;
      return v && DENSITY_MODES[v] ? v : null;
    } catch (e) { return null; }
  }

  function densityStore(mode) {
    try { if (global.localStorage) global.localStorage.setItem(DENSITY_KEY, mode); } catch (e) { /* storage off */ }
  }

  function densityApplyClasses() {
    var b = document.body;
    if (!b) return;
    b.classList.toggle('is-compact', densityMode === 'compact');
    b.classList.toggle('is-detailed', densityMode === 'detailed');
  }

  function densityNotify() {
    var list = densitySubs.slice();
    for (var i = 0; i < list.length; i++) {
      try { list[i](densityMode); } catch (err) {
        if (global.console && console.error) console.error('[Hub] density subscriber failed', err);
      }
    }
  }

  /* set(mode, opts). opts.persist === false writes nothing to storage (used by
     a test or a one-off preview). opts.silent === true skips subscribers. */
  function densitySet(mode, opts) {
    opts = opts || {};
    var next = DENSITY_MODES[mode] ? mode : DENSITY_DEFAULT;
    var changed = next !== densityMode;
    densityMode = next;
    densityApplyClasses();
    if (opts.persist !== false) densityStore(next);
    if (!opts.silent && (changed || opts.force)) densityNotify();
    return densityMode;
  }

  /* Runs before mountAll so the first paint is already in the right mode and
     no component has to re-render itself on boot. Safe to call twice. */
  function densityInit() {
    densityMode = densityStored() || DENSITY_DEFAULT;
    densityApplyClasses();
    densityBooted = true;
    densityNotify();
    return densityMode;
  }

  var density = {
    KEY: DENSITY_KEY,
    DEFAULT: DENSITY_DEFAULT,
    get: function () { return densityMode; },
    set: densitySet,
    toggle: function () { return densitySet(densityMode === 'compact' ? 'detailed' : 'compact'); },
    isCompact: function () { return densityMode === 'compact'; },
    isDetailed: function () { return densityMode === 'detailed'; },
    init: densityInit,
    get booted() { return densityBooted; },
    /* subscribe(fn) -> unsubscribe. fn receives the new mode. */
    subscribe: function (fn) {
      if (typeof fn !== 'function') return function () {};
      densitySubs.push(fn);
      return function () {
        var i = densitySubs.indexOf(fn);
        if (i >= 0) densitySubs.splice(i, 1);
      };
    }
  };

  /* A subscription owned by a detached node is dead weight: every helper below
     drops its own when its root leaves the document. */
  function densityBind(root, fn) {
    var off = density.subscribe(function (mode) {
      if (root && root.isConnected === false) { off(); return; }
      fn(mode);
    });
    return off;
  }

  /* ---------- densitySwitch(): the one global control ----------
     Two buttons, aria-pressed, arrow keys between them. A page places it in
     its own toolbar; there is never more than one per page, but several
     instances stay in sync because they all read Hub.density. */

  function densitySwitch(attrs) {
    attrs = attrs || {};
    var a = {};
    for (var k in attrs) {
      if (!Object.prototype.hasOwnProperty.call(attrs, k)) continue;
      if (k === 'class' || k === 'className' || k === 'label') continue;
      a[k] = attrs[k];
    }
    a['class'] = 'm-density' + (attrs.className || attrs['class'] ? ' ' + (attrs.className || attrs['class']) : '');
    a.role = 'group';
    a['aria-label'] = attrs.label || 'Information density';

    var btns = [];
    function makeBtn(mode, text) {
      var b = h('button', {
        type: 'button',
        'class': 'm-density-btn',
        'data-density': mode,
        text: text,
        onclick: function () { density.set(mode); }
      });
      btns.push(b);
      return b;
    }
    /* Copy written here, not in the markup: the control is built, never typed
       into a page, so both pages read the same two words. */
    var root = h('div', a, makeBtn('compact', 'Compact'), makeBtn('detailed', 'Detailed'));

    root.addEventListener('keydown', function (ev) {
      var i = btns.indexOf(document.activeElement);
      if (i < 0) return;
      var next = -1;
      if (ev.key === 'ArrowRight' || ev.key === 'ArrowDown') next = (i + 1) % btns.length;
      else if (ev.key === 'ArrowLeft' || ev.key === 'ArrowUp') next = (i - 1 + btns.length) % btns.length;
      else if (ev.key === 'Home') next = 0;
      else if (ev.key === 'End') next = btns.length - 1;
      if (next < 0) return;
      ev.preventDefault();
      btns[next].focus();
      btns[next].click();
    });

    function paint() {
      for (var i = 0; i < btns.length; i++) {
        var on = btns[i].getAttribute('data-density') === densityMode;
        btns[i].setAttribute('aria-pressed', on ? 'true' : 'false');
        btns[i].classList.toggle('is-on', on);
      }
    }
    paint();
    densityBind(root, paint);
    root.refresh = paint;
    return root;
  }

  /* ---------- expander(): the compact convention ----------
     A labelled button that says what it reveals and how many, plus a panel
     that carries the hidden attribute while it is closed.

       Hub.expander({
         id: 'objectives',                          // optional, one is made
         count: list.length,
         label: function (n) { return 'Show all ' + n + ' objectives'; },
         hideLabel: 'Show fewer',                   // string or fn(count)
         content: function () { return buildTable(); },   // element or fn
         defaultOpen: false,
         forceOpenWhenDetailed: true
       })
       -> { root, button, panel, open(), close(), toggle(), isOpen(), setCount(n), destroy() }

     In DETAILED the panel is forced open, the button reads the hide label and
     goes aria-disabled: the global switch owns the state while that mode is
     on. Back in COMPACT the expander returns to whatever the reader left it.
     The content function runs once, the first time the panel is shown. */

  var expanderSeq = 0;

  function expander(opts) {
    opts = opts || {};
    var id = opts.id || ('m-exp-' + (++expanderSeq));
    var panelId = id + '-panel';
    var btnId = id + '-btn';
    var lockWhenDetailed = opts.forceOpenWhenDetailed !== false;
    var ownOpen = !!opts.defaultOpen;
    var count = isNil(opts.count) ? null : opts.count;
    var filled = false;

    function labelText(which) {
      var v = which === 'hide'
        ? (isNil(opts.hideLabel) ? 'Show fewer' : opts.hideLabel)
        : (isNil(opts.label) ? 'Show more' : opts.label);
      return typeof v === 'function' ? String(v(count)) : String(v);
    }

    var labelEl = h('span', { 'class': 'm-expander-label' });
    var caret = h('span', { 'class': 'm-expander-caret', 'aria-hidden': 'true' });
    var button = h('button', {
      type: 'button',
      id: btnId,
      'class': 'm-expander-btn',
      'aria-controls': panelId,
      'aria-expanded': 'false',
      onclick: function () {
        if (isLocked()) return;
        ownOpen = !ownOpen;
        paint();
      }
    }, labelEl, caret);

    var panel = h('div', { id: panelId, 'class': 'm-expander-panel', role: 'group', 'aria-labelledby': btnId });
    panel.hidden = true;

    var root = h('div', { 'class': 'm-expander' + (opts.className ? ' ' + opts.className : ''), 'data-expander': id }, button, panel);

    function isLocked() { return lockWhenDetailed && densityMode === 'detailed'; }
    function effectiveOpen() { return isLocked() || ownOpen; }

    function fill() {
      if (filled) return;
      filled = true;
      var c = opts.content;
      var node = typeof c === 'function' ? c(panel) : c;
      if (node && node !== panel) appendChildren(panel, [ node ]);
    }

    function paint() {
      var open = effectiveOpen();
      var locked = isLocked();
      if (open) fill();
      panel.hidden = !open;
      button.setAttribute('aria-expanded', open ? 'true' : 'false');
      labelEl.textContent = labelText(open ? 'hide' : 'show');
      button.classList.toggle('is-open', open);
      button.classList.toggle('is-locked', locked);
      if (locked) { button.setAttribute('aria-disabled', 'true'); }
      else { button.removeAttribute('aria-disabled'); }
      root.classList.toggle('is-open', open);
    }

    paint();
    var off = densityBind(root, paint);

    return {
      root: root,
      button: button,
      panel: panel,
      id: id,
      open: function () { ownOpen = true; paint(); },
      close: function () { ownOpen = false; paint(); },
      toggle: function () { ownOpen = !ownOpen; paint(); },
      isOpen: effectiveOpen,
      isLocked: isLocked,
      /* the count is data, so a component that re-reads its data relabels
         the button instead of rebuilding the expander */
      setCount: function (n) { count = isNil(n) ? null : n; paint(); },
      refresh: paint,
      destroy: off
    };
  }

  /* ---------- infoTip(): a rule caption that is not always on screen ----------
     A derived label earns one line of explanation, but that line does not have
     to sit under it forever. infoTip parks it behind a small 'i' that toggles
     the caption inline, with the same aria-expanded contract as an expander.
     Returns the wrapper element, with .button and .caption on it. */

  var infoSeq = 0;

  function infoTip(text, opts) {
    opts = opts || {};
    var id = opts.id || ('m-info-' + (++infoSeq));
    var capId = id + '-caption';
    var open = !!opts.defaultOpen;

    var caption = h('span', { id: capId, 'class': 'm-infotip-caption', text: text || '' });
    caption.hidden = !open;

    var button = h('button', {
      type: 'button',
      'class': 'm-infotip-btn',
      'aria-controls': capId,
      'aria-expanded': open ? 'true' : 'false',
      'aria-label': opts.label || 'How this is worked out',
      title: text || null,
      text: 'i'
    });
    button.addEventListener('click', function () {
      open = !open;
      caption.hidden = !open;
      button.setAttribute('aria-expanded', open ? 'true' : 'false');
      button.classList.toggle('is-on', open);
    });

    var root = h('span', { 'class': 'm-infotip' + (opts.className ? ' ' + opts.className : '') }, button, caption);
    root.button = button;
    root.caption = caption;
    root.isOpen = function () { return open; };
    return root;
  }

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
    version: '1.1.0',
    register: register,
    mountAll: mountAll,
    remountAll: remountAll,
    onUnmount: onUnmount,
    get mounted() { return mounted; },
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
    heroLink: heroLink,
    tabs: tabs,
    density: density,
    densitySwitch: densitySwitch,
    expander: expander,
    infoTip: infoTip,
    get data() { return data(); },
    get snapshot() { return snapshot(); }
  };

  global.Hub = Hub;

  function boot() {
    installImageGuard();
    buildTeamIndex();
    /* before mountAll, so the first paint is already compact and no component
       has to correct itself after it has drawn */
    densityInit();
    tabs.init();
    mountAll();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(window);
