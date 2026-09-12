/* ============================================================
   match/app.js  -  the series header and the five map switcher
   ------------------------------------------------------------
   Owner: shell agent. Loads AFTER hub/core.js and BEFORE match/timeline.js.

   Two jobs.

   1. window.MatchApp, the page's game state machine.
        MatchApp.currentGame            the game number on screen, 1 to 5
        MatchApp.currentMatchId         its OpenDota id
        MatchApp.current                its row out of window.GAME_INDEX
        MatchApp.games                  all five rows, in game order
        MatchApp.selectGame(x, opts)    x is a game number OR a match id
        MatchApp.loadGame(file, cb)     inject one game file, once
        MatchApp.urlFor(n)              the ?game=N url, hash preserved

      selectGame is the whole protocol, in this fixed order:

        a. resolve the row, load data/games/<id>.js if it is not in
           window.GAMES yet (each file is injected at most once)
        b. window.G5 = window.GAMES[id]
        c. MatchTimeline.reset({ last: G5.minutes.last, startIndex: last })
           which drops every subscriber, every snap point, the mirrored
           jumps, the memoised series and the built strip
        d. Hub.remountAll(), which runs every registered teardown and then
           re-runs every mount against the new window.G5
        e. re-template the things that are not inside a mount: the document
           title and the breadcrumb's current page
        f. history: pushState on a user choice, replaceState on boot, never
           on a popstate

   2. The mount m-serieshead: rdy.gg's own identity block above our banner.
      Tournament link, the series start time, the format chip, both teams
      linked to their rdy.gg team pages, then one flex row of the series
      score card (brand green), a labelled odds PLACEHOLDER at rdy.gg's
      192x128 footprint, and the five map tabs.

   House rules kept: no narrative, no literal numbers in markup (every
   figure is read out of window.GAME_INDEX, window.GAMES or
   window.SERIES_CONTEXT), tabular numerals on anything numeric, keyboard
   parity on the tablist, and no em dashes.
   ============================================================ */
(function (global) {
  'use strict';

  var Hub = global.Hub;
  if (!Hub || typeof Hub.register !== 'function') return;

  var h = Hub.h;
  var fmt = Hub.fmt;

  /* Options with defaults, principle 9. */
  var DEFAULTS = {
    /* the query parameter the switcher owns */
    param: 'game',
    /* rdy.gg draws TEAM VISION on the left of its score card and of every
       map tab score, captured 2026-09-10 in rdy-match-page-notes.md. The
       two teams swap Radiant and Dire between games, so a fixed left team
       is the only way five tab scores read in one order. */
    leftKey: 'vision',
    /* where a tier chip may come from, in order. CR7: GAME_INDEX.tier is
       published now, carrying the string rdy.gg itself prints on this
       series; with neither field present the chip is omitted rather than
       invented. */
    tierFields: ['GAME_INDEX.tier', 'TI2026.event.tier'],
    /* the tab strip announces itself against the main column */
    controls: 'main'
  };

  var opts = DEFAULTS;

  function IDX() { return global.GAME_INDEX || null; }
  function TI() { return global.TI2026 || {}; }
  function CTX() { return global.SERIES_CONTEXT || null; }
  function games() { var i = IDX(); return (i && i.games) || []; }

  /* ------------------------------------------------------------
     1. Rows and ids
     ------------------------------------------------------------ */

  function rowByGame(n) {
    var g = games();
    for (var i = 0; i < g.length; i++) if (g[i].game === Number(n)) return g[i];
    return null;
  }

  function rowByMatchId(id) {
    var g = games();
    for (var i = 0; i < g.length; i++) if (String(g[i].matchId) === String(id)) return g[i];
    return null;
  }

  /* a game number or a match id, whichever the caller has */
  function resolveRow(x) {
    if (x === null || x === undefined || x === '') return null;
    var n = Number(x);
    if (!isNaN(n) && n >= 1 && n <= games().length) {
      var byGame = rowByGame(n);
      if (byGame) return byGame;
    }
    return rowByMatchId(x);
  }

  /* the game the shell preloaded, read off the record itself so the boot
     game is never a literal in this file */
  function bootRow() {
    var g5 = global.G5;
    var id = g5 && g5.match ? g5.match.id : null;
    return rowByMatchId(id) || games()[games().length - 1] || null;
  }

  var current = null;

  /* ------------------------------------------------------------
     2. Loading a game file, once
     ------------------------------------------------------------ */

  var loading = {};

  function loadGame(file, cb) {
    if (typeof cb !== 'function') cb = function () {};
    if (!file) { cb(new Error('no file')); return; }
    if (loading[file] === 'done') { cb(null); return; }
    if (loading[file]) { loading[file].push(cb); return; }

    loading[file] = [cb];
    var el = document.createElement('script');
    el.src = file;
    el.async = false;
    el.addEventListener('load', function () { finish(file, null); });
    el.addEventListener('error', function () { finish(file, new Error('failed to load ' + file)); });
    (document.head || document.documentElement).appendChild(el);
  }

  function finish(file, err) {
    var waiting = loading[file];
    loading[file] = err ? null : 'done';
    if (!waiting || !waiting.length) return;
    for (var i = 0; i < waiting.length; i++) {
      try { waiting[i](err); } catch (e) {
        if (global.console && console.error) console.error('[MatchApp] load callback failed', e);
      }
    }
  }

  /* ------------------------------------------------------------
     3. Applying a game
     ------------------------------------------------------------ */

  var applying = false;
  var refocusTabs = false;
  /* the row the user last asked for. A game file is 300KB of JSON in a
     script tag, so two quick clicks put two loads in flight; only the one
     that is still wanted may apply. Without this the slower file wins. */
  var requested = null;

  function applyRow(row) {
    var payload = (global.GAMES || {})[String(row.matchId)];
    if (!payload) {
      if (global.console && console.error) {
        console.error('[MatchApp] game ' + row.game + ' loaded but window.GAMES["' + row.matchId + '"] is absent');
      }
      return false;
    }

    applying = true;
    current = row;
    global.G5 = payload;

    var T = global.MatchTimeline;
    if (T && typeof T.reset === 'function') {
      var lastIdx = (payload.minutes && typeof payload.minutes.last === 'number')
        ? payload.minutes.last : undefined;
      T.reset({ last: lastIdx, startIndex: lastIdx });
    }

    /* Hub has not booted yet on a deep link that resolved before
       DOMContentLoaded: its own mountAll is still coming, and calling
       remountAll here would mount everything twice. */
    if (Hub.mounted) Hub.remountAll();

    retitle(payload);
    applying = false;

    if (refocusTabs) {
      refocusTabs = false;
      var active = document.querySelector('.m-sh-tab[aria-selected="true"]');
      if (active && active.focus) active.focus();
    }
    if (T && typeof T.measure === 'function') T.measure();
    return true;
  }

  /* the two strings that live outside every mount */
  function retitle(payload) {
    var m = payload.match || {};
    var ser = m.series || {};
    var stage = ser.event || 'Grand Final';
    var label = stage + ' Game ' + ser.game;
    var winKey = m.winnerKey || null;
    var loseKey = winKey && m.radiant && m.dire
      ? (winKey === m.dire.key ? m.radiant.key : m.dire.key) : null;

    if (winKey && loseKey) {
      document.title = label + ': ' + Hub.teamName(winKey) + ' vs ' + Hub.teamName(loseKey) +
        ' | Match Analysis | rdy.gg';
    }
    var crumb = document.querySelector('.breadcrumb [aria-current="page"]');
    if (crumb) crumb.textContent = label;
  }

  /* ------------------------------------------------------------
     4. The URL
     ------------------------------------------------------------ */

  function paramGame() {
    var m = new RegExp('[?&]' + opts.param + '=([^&#]+)').exec(global.location.search);
    return m ? Number(decodeURIComponent(m[1])) : null;
  }

  /* ?game=N, with the hash (the Hub links to #draft) carried through */
  function urlFor(gameNumber) {
    var search = global.location.search || '';
    var re = new RegExp('([?&])' + opts.param + '=[^&#]*');
    if (re.test(search)) {
      search = search.replace(re, '$1' + opts.param + '=' + gameNumber);
    } else {
      search = (search ? search + '&' : '?') + opts.param + '=' + gameNumber;
    }
    return global.location.pathname + search + (global.location.hash || '');
  }

  /* ------------------------------------------------------------
     5. selectGame
     ------------------------------------------------------------ */

  function selectGame(x, o) {
    o = o || {};
    var row = resolveRow(x);
    if (!row) return false;

    requested = row;
    var same = current && current.matchId === row.matchId;
    if (!same || o.force) {
      if ((global.GAMES || {})[String(row.matchId)]) {
        applyRow(row);
      } else {
        document.documentElement.classList.add('is-loading-game');
        loadGame(row.file, function (err) {
          if (err) {
            document.documentElement.classList.remove('is-loading-game');
            if (global.console && console.error) console.error('[MatchApp] ' + err.message);
            return;
          }
          /* a stale load never paints over a newer choice */
          if (!requested || requested.matchId !== row.matchId) return;
          document.documentElement.classList.remove('is-loading-game');
          applyRow(row);
        });
      }
    }

    if (o.history !== false && global.history && global.history.pushState) {
      var url = urlFor(row.game);
      if (o.replace) global.history.replaceState({ game: row.game }, '', url);
      else global.history.pushState({ game: row.game }, '', url);
    }
    /* the tiles repaint even while the file is still in flight, so a click
       never looks ignored */
    paintTabs(row.game);
    return true;
  }

  if (global.addEventListener) {
    global.addEventListener('popstate', function (e) {
      var n = (e && e.state && e.state.game) || paramGame() || (bootRow() && bootRow().game);
      if (n) selectGame(n, { history: false });
    });
  }

  /* ------------------------------------------------------------
     6. The series header component
     ------------------------------------------------------------ */

  /* the series score, counted off the five rows rather than parsed out of a
     string, so the card and the tiles cannot disagree */
  function seriesWins() {
    var out = {};
    games().forEach(function (r) { out[r.winnerKey] = (out[r.winnerKey] || 0) + 1; });
    return out;
  }

  /* both team keys, left one first, taken from the rows themselves */
  function teamKeys() {
    var seen = [];
    games().forEach(function (r) {
      [r.radiantKey, r.direKey].forEach(function (k) {
        if (k && seen.indexOf(k) < 0) seen.push(k);
      });
    });
    var left = seen.indexOf(opts.leftKey) >= 0 ? opts.leftKey : seen[0];
    var right = seen.filter(function (k) { return k !== left; })[0] || seen[1];
    return { left: left, right: right };
  }

  function rdyTeamId(key) {
    var g5 = global.G5 || {};
    var m = g5.match || {};
    if (m.radiant && m.radiant.key === key && m.radiant.rdyTeamId) return m.radiant.rdyTeamId;
    if (m.dire && m.dire.key === key && m.dire.rdyTeamId) return m.dire.rdyTeamId;
    var c = CTX();
    if (c && c.teams && c.teams[key] && c.teams[key].rdyTeamId) return c.teams[key].rdyTeamId;
    return null;
  }

  /* the tier chip only exists when a source field does. CR7: GAME_INDEX now
     carries tier and tierSource, read off rdy.gg's own series header, so the
     chip is drawn and the chip's title says where the value came from. With
     neither field present no chip is drawn and no tier is asserted. */
  function tierValue() {
    var i = IDX();
    if (i && i.tier) return String(i.tier);
    var ev = TI().event;
    if (ev && ev.tier) return String(ev.tier);
    return null;
  }

  function tierSource() {
    var i = IDX();
    if (i && i.tier && i.tierSource) return String(i.tierSource);
    var ev = TI().event;
    if (ev && ev.tier && ev.tierSource) return String(ev.tierSource);
    return null;
  }

  /* the series start: the first game's own start time out of the index */
  function seriesStart() {
    var first = games()[0];
    return first ? (first.startTimeUtc || null) : null;
  }

  function startLabel(iso) {
    if (!iso) return null;
    var d = new Date(iso);
    if (isNaN(d.getTime())) return null;
    function pad(n) { return (n < 10 ? '0' : '') + n; }
    return fmt.date(iso) + ', ' + pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes()) + ' UTC';
  }

  function teamLink(key, testid) {
    var href = Hub.link.team(rdyTeamId(key));
    var id = rdyTeamId(key);
    var attrs = {
      'class': 'm-sh-team',
      'data-testid': testid,
      dataset: { teamId: id ? String(id) : '' }
    };
    return Hub.extLink(href, attrs,
      Hub.teamCrest(key, 'sm'),
      h('span', { 'class': 'm-sh-team-name' }, Hub.teamName(key)));
  }

  function identityBlock() {
    var i = IDX();
    var keys = teamKeys();
    var tHref = Hub.link.tournament(i && i.tournamentRdyId);
    var name = (TI().event && TI().event.name) || (i && i.leagueName) || null;
    var iso = seriesStart();
    var tier = tierValue();

    var chips = h('div', { 'class': 'm-sh-chips' },
      tier ? h('span', {
        'class': 'chip chip--gold',
        'data-testid': 'tier-chip',
        title: tierSource() ? ('Tier ' + tier + '. Source: ' + tierSource()) : ('Tier ' + tier),
        'aria-label': 'Tier ' + tier
      }, tier) : null,
      (i && i.bo) ? h('span', { 'class': 'chip chip--outline' }, fmt.bo(i.bo).toUpperCase()) : null);

    return h('div', { 'class': 'm-sh-id' },
      name ? (tHref
        ? Hub.extLink(tHref, { 'class': 'm-sh-tournament' }, name)
        : h('span', { 'class': 'm-sh-tournament' }, name)) : null,
      iso ? h('time', { 'class': 'm-sh-time u-tnum', datetime: iso }, startLabel(iso)) : null,
      chips,
      h('div', { 'class': 'm-sh-teams' },
        teamLink(keys.left, 'home-team'),
        h('span', { 'class': 'm-sh-vs', 'aria-hidden': 'true' }, 'vs'),
        teamLink(keys.right, 'away-team')));
  }

  function scoreCard() {
    var i = IDX();
    var keys = teamKeys();
    var wins = seriesWins();
    var href = Hub.link.series(i && i.seriesRdyId);
    var left = wins[keys.left] || 0;
    var right = wins[keys.right] || 0;
    var text = Hub.teamName(keys.left) + ' ' + left + ', ' +
      Hub.teamName(keys.right) + ' ' + right + '. Open the series on rdy.gg.';

    return Hub.extLink(href, {
      'class': 'm-sh-score',
      'data-testid': 'series-score',
      'aria-label': text,
      title: text
    },
      h('span', { 'class': 'm-sh-score-side' },
        Hub.teamCrest(keys.left, 'sm'),
        h('span', { 'class': 'm-sh-score-name' }, Hub.teamName(keys.left))),
      h('span', { 'class': 'm-sh-score-nums u-tnum' },
        h('span', { 'class': 'm-sh-score-num' }, String(left)),
        h('span', { 'class': 'm-sh-score-sep', 'aria-hidden': 'true' }, ':'),
        h('span', { 'class': 'm-sh-score-num' }, String(right))),
      h('span', { 'class': 'm-sh-score-side m-sh-score-side--right' },
        h('span', { 'class': 'm-sh-score-name' }, Hub.teamName(keys.right)),
        Hub.teamCrest(keys.right, 'sm')));
  }

  /* item 7: a placeholder, not an odds widget. No price, no bookmaker, no
     affiliate link. It carries rdy.gg's 192x128 footprint and says in words
     what rdy.gg puts there. */
  function oddsPlaceholder() {
    return h('div', {
      'class': 'ad-slot ad-slot--odds m-sh-odds',
      'data-testid': 'slot-odds',
      role: 'note'
    }, 'This is where the odds card would go');
  }

  /* ---- the five tiles ---- */

  var tabEls = [];

  function tileFor(row) {
    var keys = teamKeys();
    var dur = row.durationClock || (row.durationSeconds ? fmt.clock(row.durationSeconds) : '');
    var label = 'Game ' + row.game;
    var aria = label + ', won by ' + Hub.teamName(row.winnerKey) + ', kills ' +
      Hub.killsPairText(row.kills, row.radiantKey, row.direKey, { left: keys.left }) +
      (dur ? ', ' + dur : '');

    var btn = h('button', {
      type: 'button',
      role: 'tab',
      'class': 'm-sh-tab',
      id: 'maptab-' + row.game,
      'data-game': String(row.game),
      'data-match-id': String(row.matchId),
      'data-testid': 'map-tab',
      'aria-selected': 'false',
      'aria-controls': opts.controls,
      'aria-label': aria,
      title: aria,
      tabindex: '-1'
    },
      h('span', { 'class': 'm-sh-tab-label' }, label),
      h('span', { 'class': 'm-sh-tab-logo' }, Hub.teamCrest(row.winnerKey, 'sm')),
      h('span', { 'class': 'm-sh-tab-score u-tnum' },
        Hub.killsPair(row.kills, row.radiantKey, row.direKey, { left: keys.left })),
      h('span', { 'class': 'm-sh-tab-dur u-tnum' },
        Hub.icon('M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 10.6V6h-2v7.4l5.2 3.1 1-1.7z'),
        h('span', null, dur)));

    btn.addEventListener('click', function () { selectGame(row.game, {}); });
    return btn;
  }

  function paintTabs(gameNumber) {
    for (var i = 0; i < tabEls.length; i++) {
      var t = tabEls[i];
      var on = t.game === gameNumber;
      t.el.setAttribute('aria-selected', on ? 'true' : 'false');
      t.el.setAttribute('tabindex', on ? '0' : '-1');
      t.el.classList.toggle('is-on', on);
    }
  }

  function tabStrip() {
    tabEls = [];
    var strip = h('div', {
      'class': 'm-sh-tabs',
      role: 'tablist',
      'aria-label': 'Map',
      'data-testid': 'map-tabs'
    });
    games().forEach(function (row) {
      var el = tileFor(row);
      tabEls.push({ el: el, game: row.game });
      strip.appendChild(el);
    });

    /* keyboard parity, principle 8: arrows move, Home and End jump, and the
       move selects, which is the automatic-activation tablist pattern. */
    strip.addEventListener('keydown', function (e) {
      var order = tabEls.map(function (t) { return t.game; });
      var at = order.indexOf(current ? current.game : order[order.length - 1]);
      var next = null;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = order[Math.min(order.length - 1, at + 1)];
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = order[Math.max(0, at - 1)];
      else if (e.key === 'Home') next = order[0];
      else if (e.key === 'End') next = order[order.length - 1];
      else return;
      e.preventDefault();
      if (next === null || next === undefined) return;
      refocusTabs = true;
      selectGame(next, {});
      var el = document.querySelector('.m-sh-tab[data-game="' + next + '"]');
      if (el && el.focus) el.focus();
    });

    return strip;
  }

  Hub.register('m-serieshead', function (mount) {
    if (!IDX()) {
      mount.appendChild(h('div', { 'class': 'mount-placeholder' }, 'data/games/index.js is not loaded'));
      return;
    }
    if (!current) current = bootRow();

    var section = h('section', { 'class': 'm-sh', 'data-testid': 'series-header' },
      identityBlock(),
      h('div', { 'class': 'm-sh-row' },
        scoreCard(),
        oddsPlaceholder(),
        tabStrip()));

    mount.appendChild(section);
    paintTabs(current ? current.game : null);
  });

  /* ------------------------------------------------------------
     7. Public API and boot
     ------------------------------------------------------------ */

  var MatchApp = {
    version: '1.0.0',
    get options() { return opts; },
    get games() { return games().slice(); },
    get current() { return current; },
    get currentGame() { return current ? current.game : null; },
    get currentMatchId() { return current ? current.matchId : null; },
    selectGame: selectGame,
    loadGame: loadGame,
    rowByGame: rowByGame,
    rowByMatchId: rowByMatchId,
    rdyTeamId: rdyTeamId,
    urlFor: urlFor,
    init: function (o) {
      var k; var next = {};
      for (k in DEFAULTS) if (DEFAULTS.hasOwnProperty(k)) next[k] = DEFAULTS[k];
      if (o) for (k in o) if (o.hasOwnProperty(k) && o[k] !== undefined) next[k] = o[k];
      opts = next;
      return MatchApp;
    }
  };

  global.MatchApp = MatchApp;

  /* ------------------------------------------------------------
     P4-04. The sticky rail offset.

     The 160x600 placeholder is labelled sticky and rdy.gg's own rail ad is
     sticky (rdy-match-page-notes.md line 166), so the placeholder has to
     behave like one. Two sticky siblings at the same top overlap, and the
     summary card is already the rail's sticky card, so the slot is offset
     to sit directly under it: match.css reads --match-rail-top, this reads
     the three numbers that make it.

       summary's own computed sticky top
     + summary's measured height
     + the side column's own gap

     Measured, never typed: the summary card changes height with the game,
     and it is re-rendered on every remount. An observed box is the only
     source that cannot fall out of step with the render.
     ------------------------------------------------------------ */
  (function railOffset() {
    var doc = document;

    function px(v) { var n = parseFloat(v); return isFinite(n) ? n : 0; }

    function measure() {
      var page = doc.querySelector('.match-page');
      var col = doc.querySelector('.match-page .side-col');
      var summary = col ? col.querySelector(':scope > .mount') : null;
      var rail = col ? col.querySelector(':scope > .ad-slot--rail') : null;
      if (!page || !summary || !rail) return;

      var cs = global.getComputedStyle(summary);
      if (cs.position !== 'sticky') {
        /* below 1024 the sidebar stacks and nothing sticks; the stylesheet
           already switches the rail to static, so leave the var unset */
        page.style.removeProperty('--match-rail-top');
        return;
      }
      var gap = px(global.getComputedStyle(col).rowGap);
      var top = px(cs.top) + summary.getBoundingClientRect().height + gap;
      page.style.setProperty('--match-rail-top', Math.round(top) + 'px');
    }

    var pending = 0;
    function schedule() {
      if (pending) global.clearTimeout(pending);
      pending = global.setTimeout(function () { pending = 0; measure(); }, 32);
    }

    function watch() {
      measure();
      var col = doc.querySelector('.match-page .side-col');
      var summary = col ? col.querySelector(':scope > .mount') : null;
      if (summary && global.ResizeObserver) {
        var ro = new global.ResizeObserver(schedule);
        ro.observe(summary);
        /* the mount element survives a remount, so this observer is wired
           once and never registered as a teardown */
      }
      global.addEventListener('resize', schedule);
    }

    if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', watch);
    else watch();
  }());

  /* ------------------------------------------------------------
     P4R2-04. The leaderboard placeholder's drawn size.

     The slot declares rdy.gg's 728x90 footprint in its own text, and the
     stylesheet caps it at max-width:100%. Below 1280 the main column is
     narrower than 728px, so the box scales down and the stated size stops
     being the drawn size. The caption reads the element's own rect and
     says what it actually measures, and it is dropped the moment the box
     is at its full footprint again.

     No figure here is typed. The stated pair is parsed once out of the
     label the markup already carries, before the caption node exists, and
     the drawn pair comes from getBoundingClientRect.
     ------------------------------------------------------------ */
  (function leaderboardCaption() {
    var doc = document;
    var slot = null, capEl = null, statedW = 0, statedH = 0;

    function paint() {
      if (!slot || !capEl) return;
      var r = slot.getBoundingClientRect();
      var w = Math.round(r.width), ht = Math.round(r.height);
      if (w === statedW && ht === statedH) {
        capEl.textContent = '';
        capEl.hidden = true;
        return;
      }
      capEl.hidden = false;
      capEl.textContent = 'shown at ' + w + ' x ' + ht + ' here';
    }

    var pending = 0;
    function schedule() {
      if (pending) global.clearTimeout(pending);
      pending = global.setTimeout(function () { pending = 0; paint(); }, 32);
    }

    function start() {
      slot = doc.querySelector('.match-page .ad-slot--leaderboard');
      if (!slot) return;
      var stated = /(\d+)\s*(?:x|\u00d7)\s*(\d+)/i.exec(slot.textContent || '');
      if (!stated) return;
      statedW = Number(stated[1]);
      statedH = Number(stated[2]);

      capEl = h('span', { 'class': 'm-slot-actual', 'data-testid': 'slot-leaderboard-actual' });
      capEl.hidden = true;
      slot.appendChild(capEl);

      paint();
      if (global.ResizeObserver) new global.ResizeObserver(schedule).observe(slot);
      global.addEventListener('resize', schedule);
    }

    if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', start);
    else start();
  }());

  /* boot: the shell preloaded one game file. If the url asks for a
     different one, fetch it now; the swap lands before DOMContentLoaded
     when the network is warm, and through remountAll when it is not. */
  current = bootRow();
  (function boot() {
    if (!current) return;
    var wanted = paramGame();
    if (global.history && global.history.replaceState) {
      global.history.replaceState({ game: current.game }, '', urlFor(current.game));
    }
    if (wanted && wanted !== current.game && rowByGame(wanted)) {
      selectGame(wanted, { replace: true });
    }
  }());

}(window));
