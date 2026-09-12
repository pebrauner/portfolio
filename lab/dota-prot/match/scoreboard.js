/* ------------------------------------------------------------------
   match/scoreboard.js  ->  #m-scoreboard
   Two five row tables, Radiant (TEAM VISION) then Dire (Team Spirit).

   One array is the whole truth: every value in this module is either
   G5.players[].final (the post match row) or G5.players[].perMinute[i]
   at MatchTimeline.index. Nothing is typed by hand, nothing is
   interpolated. The team rows are the sum of the five player rows, so
   the table cannot disagree with itself, and the GOLD column sums to
   G5.series.teamGold[side][i], so it cannot disagree with the economy
   chart either.

   The column set follows the index:
     index === last  ->  FINAL      LVL, K/D/A, LH/DN, GPM/XPM,
                                    NET WORTH, HERO DMG, TOWER DMG,
                                    HEALING, TALENTS, AGHANIM'S, ITEMS
     index  <  last  ->  AT MM:SS   LVL, K/D, LH/DN, GPM/XPM,
                                    GOLD, XP, 5 MIN GOLD, TEAM SHARE,
                                    TALENTS, AGHANIM'S, ITEMS OWNED

   Twelve columns in both modes, one colgroup, identical widths, so the
   switch never moves a column or changes the height of the card.

   PHASE 4. Two columns joined the set and neither one moves with the
   clock, because neither quantity is published against a minute:
     TALENTS    players[].talents, four tiers, one glyph, an inline text
                panel on hover or focus. OpenDota timestamps a talent only
                as the nth upgrade the player spent, never as a second, so
                the column reads the same at every index and says so.
     AGHANIM'S  players[].aghanims, OpenDota's aghanims_scepter and
                aghanims_shard flags. P4-03: this is the UPGRADE active on
                the hero, not the item in the bag. A Scepter bought and not
                consumed shows in Items with the chip off, and the column
                caption and the footnote both say so.
   Under 1280 both collapse to zero width and their contents move into the
   items cell, which takes the width back. One node each, moved by a
   matchMedia listener: nothing is built twice.

   Options, all with defaults, override with window.MatchScoreboardOptions
   before this file runs.
   ------------------------------------------------------------------ */
(function (global) {
  'use strict';

  var Hub = global.Hub;
  if (!Hub || typeof Hub.register !== 'function') return;

  var h = Hub.h;
  var fmt = Hub.fmt;

  var DEFAULTS = {
    sortBy: 'pos',            /* 'pos' or 'slot' */
    teamRow: true,            /* the sum row above each five */
    markColumnMax: true,      /* underline the match high in each column */
    itemColumns: 4,           /* icons per row in the items cell */
    liveItemCap: 8,           /* icons shown before a "+n" chip */
    recentWindow: 5,          /* minutes behind the index for 5 MIN GOLD */
    crossHighlight: true,     /* hover a row lights the player everywhere */
    talents: true,            /* the talents column and its inline panel */
    aghanims: true,           /* the scepter and shard column */
    collapseQuery: '(max-width: 1279px)', /* below this the two collapse into items */
    entityLinks: true,        /* hero and player cells link out to rdy.gg */
    selectEvent: 'mt:select-player',
    testid: 'match-scoreboard'
  };

  var TIER_LEVELS = [10, 15, 20, 25];

  function assign(target) {
    for (var i = 1; i < arguments.length; i++) {
      var src = arguments[i];
      if (!src) continue;
      for (var k in src) if (Object.prototype.hasOwnProperty.call(src, k)) target[k] = src[k];
    }
    return target;
  }

  function num(v) { return (v === null || v === undefined) ? fmt.orDash(null) : fmt.num(v); }
  function at(arr, i) {
    if (!arr || !arr.length) return null;
    return arr[Math.max(0, Math.min(i, arr.length - 1))];
  }

  /* ----------------------------------------------------------------
     The ten columns. Each one knows how to read a player in both
     modes, how to aggregate the five into the team row, and which
     number decides the column high.
     ---------------------------------------------------------------- */
  function buildColumns(env) {
    var opts = env.opts;

    function pm(p, key, i) { return at(p.perMinute[key], i); }

    function minutesAt(i) {
      var s = env.Timeline.secondsAt(i);
      return (typeof s === 'number' && s > 0) ? s / 60 : 0;
    }

    function rate(total, i) {
      var m = minutesAt(i);
      if (!m) return null;
      return Math.round(total / m);
    }

    function sum(list, read) {
      var t = 0;
      for (var i = 0; i < list.length; i++) {
        var v = read(list[i]);
        if (typeof v === 'number') t += v;
      }
      return t;
    }

    return [
      {
        id: 'player', width: 17.5, kind: 'player',
        label: 'Player', liveLabel: 'Player'
      },
      {
        id: 'lvl', width: 4.5, align: 'num',
        label: 'Lvl', liveLabel: 'Lvl',
        title: 'Hero level',
        read: function (p, i, isFinal) {
          return { a: String(isFinal ? p.final.level : pm(p, 'level', i)) };
        },
        metric: function (p, i, isFinal) { return isFinal ? p.final.level : pm(p, 'level', i); },
        team: function (list, i, isFinal) {
          var best = 0;
          for (var k = 0; k < list.length; k++) {
            var v = isFinal ? list[k].final.level : pm(list[k], 'level', i);
            if (v > best) best = v;
          }
          return { a: String(best), note: 'highest level' };
        }
      },
      {
        id: 'kda', width: 9, align: 'num',
        label: 'K / D / A', liveLabel: 'K / D',
        title: 'Kills, deaths and assists. Assists are published only as a final total, so the live column is K / D',
        read: function (p, i, isFinal) {
          if (isFinal) return { a: p.final.kills + ' / ' + p.final.deaths + ' / ' + p.final.assists };
          return { a: pm(p, 'kills', i) + ' / ' + pm(p, 'deaths', i) };
        },
        metric: function (p, i, isFinal) { return isFinal ? p.final.kills : pm(p, 'kills', i); },
        team: function (list, i, isFinal) {
          var k = sum(list, function (p) { return isFinal ? p.final.kills : pm(p, 'kills', i); });
          var d = sum(list, function (p) { return isFinal ? p.final.deaths : pm(p, 'deaths', i); });
          if (isFinal) {
            var a = sum(list, function (p) { return p.final.assists; });
            return { a: k + ' / ' + d + ' / ' + a };
          }
          return { a: k + ' / ' + d };
        }
      },
      {
        id: 'lhdn', width: 7, align: 'num',
        label: 'LH / DN', liveLabel: 'LH / DN',
        title: 'Last hits over denies',
        read: function (p, i, isFinal) {
          return isFinal
            ? { a: num(p.final.lastHits), b: num(p.final.denies) }
            : { a: num(pm(p, 'lastHits', i)), b: num(pm(p, 'denies', i)) };
        },
        metric: function (p, i, isFinal) { return isFinal ? p.final.lastHits : pm(p, 'lastHits', i); },
        team: function (list, i, isFinal) {
          return {
            a: num(sum(list, function (p) { return isFinal ? p.final.lastHits : pm(p, 'lastHits', i); })),
            b: num(sum(list, function (p) { return isFinal ? p.final.denies : pm(p, 'denies', i); }))
          };
        }
      },
      {
        id: 'rates', width: 8.5, align: 'num',
        label: 'GPM / XPM', liveLabel: 'GPM / XPM',
        title: 'Gold and experience per minute. Before the whistle both are the totals at that reading divided by the minutes played',
        read: function (p, i, isFinal) {
          if (isFinal) return { a: num(p.final.gpm), b: num(p.final.xpm) };
          return { a: num(rate(pm(p, 'gold', i), i)), b: num(rate(pm(p, 'xp', i), i)) };
        },
        metric: function (p, i, isFinal) { return isFinal ? p.final.gpm : rate(pm(p, 'gold', i), i); },
        team: function (list, i, isFinal) {
          if (isFinal) {
            return {
              a: num(sum(list, function (p) { return p.final.gpm; })),
              b: num(sum(list, function (p) { return p.final.xpm; }))
            };
          }
          return {
            a: num(rate(sum(list, function (p) { return pm(p, 'gold', i); }), i)),
            b: num(rate(sum(list, function (p) { return pm(p, 'xp', i); }), i))
          };
        }
      },
      {
        id: 'gold', width: 8.5, align: 'num',
        label: 'Net worth', liveLabel: 'Gold',
        title: 'Net worth at the whistle. Before it, gold earned to that reading',
        read: function (p, i, isFinal) {
          return { a: num(isFinal ? p.final.netWorth : pm(p, 'gold', i)) };
        },
        metric: function (p, i, isFinal) { return isFinal ? p.final.netWorth : pm(p, 'gold', i); },
        team: function (list, i, isFinal) {
          return { a: num(sum(list, function (p) { return isFinal ? p.final.netWorth : pm(p, 'gold', i); })) };
        }
      },
      {
        id: 'c7', width: 8, align: 'num',
        label: 'Hero dmg', liveLabel: 'XP',
        title: 'Hero damage at the whistle. Before it, experience earned to that reading',
        read: function (p, i, isFinal) {
          return { a: num(isFinal ? p.final.heroDamage : pm(p, 'xp', i)) };
        },
        metric: function (p, i, isFinal) { return isFinal ? p.final.heroDamage : pm(p, 'xp', i); },
        team: function (list, i, isFinal) {
          return { a: num(sum(list, function (p) { return isFinal ? p.final.heroDamage : pm(p, 'xp', i); })) };
        }
      },
      {
        id: 'c8', width: 8, align: 'num',
        label: 'Tower dmg', liveLabel: opts.recentWindow + ' min gold',
        title: 'Tower damage at the whistle. Before it, gold earned in the previous ' + opts.recentWindow + ' minutes',
        read: function (p, i, isFinal) {
          if (isFinal) return { a: num(p.final.towerDamage) };
          return { a: num(recent(p, i)) };
        },
        metric: function (p, i, isFinal) { return isFinal ? p.final.towerDamage : recent(p, i); },
        team: function (list, i, isFinal) {
          return {
            a: num(sum(list, function (p) { return isFinal ? p.final.towerDamage : recent(p, i); }))
          };
        }
      },
      {
        id: 'c9', width: 6.5, align: 'num',
        label: 'Healing', liveLabel: 'Team share',
        title: 'Hero healing at the whistle. Before it, the share of the team gold this player holds',
        read: function (p, i, isFinal) {
          if (isFinal) return { a: num(p.final.heroHealing) };
          return { a: share(p, i) };
        },
        metric: function (p, i, isFinal) {
          if (isFinal) return p.final.heroHealing;
          var t = teamGoldAt(p.side, i);
          return t ? pm(p, 'gold', i) / t : null;
        },
        team: function (list, i, isFinal) {
          if (isFinal) return { a: num(sum(list, function (p) { return p.final.heroHealing; })) };
          var t = teamGoldAt(list[0].side, i);
          return { a: t ? fmt.pct(100, { raw: true, digits: 1 }) : fmt.orDash(null) };
        }
      },
      {
        id: 'talents', width: 6.5, kind: 'talents', collapsible: true,
        label: 'Talents', liveLabel: 'Talents',
        title: 'The four talent tiers, 10, 15, 20 and 25. OpenDota publishes a talent as the nth upgrade the player spent, never as a second, so this column does not move with the clock'
      },
      {
        id: 'aghs', width: 7, kind: 'aghs', collapsible: true,
        label: "Aghanim's", liveLabel: "Aghanim's",
        title: "The Scepter or Shard UPGRADE active on the hero at the whistle, read from OpenDota's aghanims_scepter and aghanims_shard flags. A Scepter or Shard carried in the inventory and not consumed is an item, not an upgrade, so it is listed in Items and left off this column. Not a purchase, so this column does not move with the clock"
      },
      {
        id: 'items', width: 9, kind: 'items',
        label: 'Items', liveLabel: 'Items owned',
        title: 'The six slots and the neutral at the whistle, with a count of what is left in the backpack. Before it, what the player owns at that reading'
      }
    ];

    function recent(p, i) {
      var from = Math.max(0, i - opts.recentWindow);
      var a = pm(p, 'gold', i), b = pm(p, 'gold', from);
      if (typeof a !== 'number' || typeof b !== 'number') return null;
      return Math.max(0, a - b);
    }

    function teamGoldAt(side, i) {
      var tg = env.G5.series && env.G5.series.teamGold;
      if (!tg || !tg[side]) return null;
      return at(tg[side], i);
    }

    function share(p, i) {
      var t = teamGoldAt(p.side, i);
      var g = pm(p, 'gold', i);
      if (!t || typeof g !== 'number') return fmt.orDash(null);
      return fmt.pct((g / t) * 100, { raw: true, digits: 1 });
    }
  }

  /* ----------------------------------------------------------------
     mount
     ---------------------------------------------------------------- */
  Hub.register('m-scoreboard', function (mount, ctx) {
    /* read the record at call time, never at file load: the game switcher
       re-mounts this module against a different window.GAMES entry */
    var G5 = ctx.G5 || global.G5;
    var Timeline = ctx.Timeline || global.MatchTimeline;

    /* idempotent re-mount: tear the previous render down first, so a second
       call leaves one table and no orphan subscriptions */
    if (typeof mount.__mtSbTeardown === 'function') {
      try { mount.__mtSbTeardown(); } catch (err) { /* a dead subscription is not fatal */ }
      mount.__mtSbTeardown = null;
    }
    mount.textContent = '';
    if (!G5 || !G5.players || !G5.players.length || !Timeline) return;

    var opts = assign({}, DEFAULTS, global.MatchScoreboardOptions || {});
    var env = { G5: G5, Timeline: Timeline, opts: opts };
    var COLS = buildColumns(env);

    var last = Timeline.last;
    var sides = Timeline.sides ? Timeline.sides() : { radiant: 'vision', dire: 'spirit' };
    var teams = {
      radiant: G5.match.radiant,
      dire: G5.match.dire
    };

    var bySide = { radiant: [], dire: [] };
    G5.players.forEach(function (p) { (bySide[p.side] || bySide.radiant).push(p); });
    ['radiant', 'dire'].forEach(function (s) {
      bySide[s].sort(function (a, b) {
        return opts.sortBy === 'slot' ? a.slot - b.slot : a.pos - b.pos;
      });
    });

    /* ---- header ---- */
    var modeChip = h('span', { 'class': 'chip chip--gold mt-sb-mode u-tnum', 'data-testid': 'scoreboard-mode' }, 'Final');
    var liveNote = h('span', { 'class': 'mt-sb-modenote' }, '');
    var srLive = h('p', { 'class': 'u-sr-only', 'aria-live': 'polite' }, '');

    /* COMP-4, 2026-09-12: compact hides the card subtitle, so the rule it
       carried moves behind an 'i' beside the title rather than off the page. */
    var SB_RULE = 'Every row reads the same minute as the timeline. Scrub the strip and the table follows.';
    var ruleTip = Hub.infoTip
      ? Hub.infoTip(SB_RULE, { id: 'mt-sb-rule', label: 'What the table is reading' })
      : null;

    var header = h('div', { 'class': 'card-header' },
      h('div', { 'class': 'titles' },
        h('h2', { 'class': 'title' }, 'Scoreboard'),
        h('div', { 'class': 'subtitle' }, SB_RULE)
      ),
      h('div', { 'class': 'action mt-sb-modewrap' }, ruleTip, modeChip, liveNote)
    );

    /* ---- the two tables ---- */
    var rowsByKey = {};
    var tables = ['radiant', 'dire'].map(function (side) {
      return buildTable(side);
    });

    var footNote = buildFootnote();

    /* ------------------------------------------------------------
       COMPACT, 2026-09-12. The default table is PLAYER, LVL, K/D/A,
       GPM/XPM, NET and ITEMS. LH/DN, HERO DMG, TOWER DMG, HEALING,
       TALENTS and AGHANIM'S are still built, still painted and still in
       the DOM; compact zeroes their columns the same way the 1024 reflow
       zeroes two of them, and the expander gives them their width back.
       The rule notes ride in the same panel, because they are the notes
       that explain those columns.
       ------------------------------------------------------------ */
    var MINIMAL_COLS = ['lhdn', 'c7', 'c8', 'c9', 'talents', 'aghs'];

    /* one stable hook per cell, stamped positionally so a body cell can never
       disagree with the <col> above it */
    function stampCols(wrap) {
      var i, k;
      var cols = wrap.querySelectorAll('col');
      for (i = 0; i < cols.length && i < COLS.length; i++) {
        cols[i].setAttribute('data-col', COLS[i].id);
      }
      var trs = wrap.querySelectorAll('tr');
      for (i = 0; i < trs.length; i++) {
        var cells = trs[i].children;
        for (k = 0; k < cells.length && k < COLS.length; k++) {
          cells[k].setAttribute('data-col', COLS[k].id);
        }
      }
    }
    stampCols(tables[0].wrap);
    stampCols(tables[1].wrap);

    var colsExp = Hub.expander({
      id: 'mt-sb-cols',
      count: MINIMAL_COLS.length,
      className: 'm-expander--footer mt-sb-colsexp',
      label: function (n) { return 'More columns, ' + n + ' hidden'; },
      hideLabel: 'Fewer columns',
      content: footNote
    });
    if (Hub.onUnmount) Hub.onUnmount(colsExp.destroy);

    var root = h('section', {
      'class': 'card mt-sb is-cols-min',
      'data-testid': opts.testid,
      'data-mode': 'final'
    }, header, tables[0].wrap, tables[1].wrap, colsExp.root, srLive);

    /* the table is wide when the panel is open, narrow when it is not, in
       both densities: the expander owns one state and the class mirrors it */
    function syncCols() { root.classList.toggle('is-cols-min', !colsExp.isOpen()); }
    /* the expander's own onclick was registered first, so its state is already
       flipped when this runs: no timer, no frame where the two disagree */
    colsExp.button.addEventListener('click', syncCols);
    var stopColsDensity = Hub.density.subscribe(syncCols);
    syncCols();

    mount.appendChild(root);
    /* M-06: silent unless focus is inside the scoreboard and the clock is idle */
    var speak = (Timeline && Timeline.quietLive)
      ? Timeline.quietLive(srLive, root)
      : function (t) { srLive.textContent = t; };

    /* ---- state ---- */
    var painted = null;
    var stopSub = Timeline.subscribe(function (s) {
      if (painted === s.index) return;
      painted = s.index;
      paint(s.index);
    });

    var stopHl = null;
    if (opts.crossHighlight && typeof Timeline.onHighlight === 'function') {
      stopHl = Timeline.onHighlight(function (key) {
        for (var k in rowsByKey) {
          if (!Object.prototype.hasOwnProperty.call(rowsByKey, k)) continue;
          rowsByKey[k].tr.classList.toggle('is-hl', k === key);
        }
      });
    }

    /* ------------------------------------------------------------
       the 1024 reflow: the two Phase 4 columns collapse to zero width
       and their one node each moves into the items cell. No node is
       built twice and no state travels with the move.
       ------------------------------------------------------------ */
    var mq = (global.matchMedia && opts.collapseQuery) ? global.matchMedia(opts.collapseQuery) : null;

    /* The decision is read from the stylesheet, never from a second copy
       of the breakpoint in script: scoreboard.css sets --mt-sb-collapsed
       to 1 inside the same media query that zeroes the two columns, so
       the moved nodes and the zeroed columns cannot disagree. */
    function wantsCollapse() {
      var v = global.getComputedStyle(root).getPropertyValue('--mt-sb-collapsed');
      if (v) return v.trim() === '1';
      return !!(mq && mq.matches);
    }

    function applyCollapse(collapsed) {
      root.classList.toggle('is-collapsed', !!collapsed);
      for (var k in rowsByKey) {
        if (!Object.prototype.hasOwnProperty.call(rowsByKey, k)) continue;
        var rec = rowsByKey[k];
        if (!rec.extras || !rec.extras.length) continue;
        for (var n = 0; n < rec.extras.length; n++) {
          var ex = rec.extras[n];
          var host = collapsed ? rec.collapseHost : ex.wide;
          if (host && ex.node.parentNode !== host) host.appendChild(ex.node);
        }
      }
    }

    var onMq = function () { applyCollapse(wantsCollapse()); };

    /* A window resize is the second path to the same decision. Some
       embedded and emulated viewports resize the page without firing the
       media query's own change event, and a collapse that never runs
       leaves both columns at zero width with their contents still in
       them, which is the one failure this reflow must not have. */
    var collapseRaf = 0;
    var onResizeCollapse = function () {
      if (collapseRaf) global.clearTimeout(collapseRaf);
      /* a timer, not requestAnimationFrame: a hidden or background tab
         never runs a frame callback, and a collapse that never runs is
         the one failure this reflow must not have */
      collapseRaf = global.setTimeout(function () {
        collapseRaf = 0;
        applyCollapse(wantsCollapse());
      }, 16);
    };

    applyCollapse(wantsCollapse());
    if (mq) {
      if (mq.addEventListener) mq.addEventListener('change', onMq);
      else if (mq.addListener) mq.addListener(onMq);
    }
    global.addEventListener('resize', onResizeCollapse);

    /* the third path, and the only one that is guaranteed: the element's
       own size change. A window resize event and a media query change can
       both be missed in an embedded viewport; an observed box cannot. */
    var collapseRo = null;
    if (global.ResizeObserver) {
      collapseRo = new global.ResizeObserver(onResizeCollapse);
      collapseRo.observe(root);
    }

    function teardown() {
      if (stopSub) { stopSub(); stopSub = null; }
      if (stopHl) { stopHl(); stopHl = null; }
      if (stopColsDensity) { stopColsDensity(); stopColsDensity = null; }
      if (mq) {
        if (mq.removeEventListener) mq.removeEventListener('change', onMq);
        else if (mq.removeListener) mq.removeListener(onMq);
      }
      global.removeEventListener('resize', onResizeCollapse);
      if (collapseRo) collapseRo.disconnect();
      if (collapseRaf) global.clearTimeout(collapseRaf);
      document.removeEventListener('keydown', onEscape, true);
    }

    mount.__mtSbTeardown = teardown;
    root.addEventListener('mt:destroy', teardown);

    /* ------------------------------------------------------------
       builders
       ------------------------------------------------------------ */
    function buildTable(side) {
      var team = teams[side];
      var list = bySide[side];
      var isWinner = G5.match.winnerKey === team.key;

      var cg = h('colgroup');
      COLS.forEach(function (c) {
        cg.appendChild(h('col', {
          'class': 'mt-sb-col mt-sb-col--' + c.id,
          style: 'width:' + c.width + '%'
        }));
      });

      var ths = COLS.map(function (c) {
        return h('th', {
          scope: 'col',
          'class': (c.align === 'num' ? 'col-num ' : '') + 'mt-sb-th mt-sb-th--' + c.id,
          title: c.title || null
        }, c.label);
      });

      var thead = h('thead', null, h('tr', null, ths));

      var teamCells = COLS.map(function (c) {
        if (c.kind === 'player') {
          return h('th', { scope: 'row', 'class': 'mt-sb-teamcell' },
            h('span', { 'class': 'mt-sb-twrap' },
              h('span', { 'class': 'mt-sb-crest' }, Hub.teamCrest(team.key, 'sm')),
              h('span', { 'class': 'mt-sb-teamnames' },
                h('span', { 'class': 'mt-sb-teamname' }, team.displayName),
                h('span', { 'class': 'mt-sb-teamsub' },
                  side === 'radiant' ? 'Radiant' : 'Dire',
                  isWinner ? ', won the game' : ''
                )
              )
            )
          );
        }
        if (c.kind === 'items') return h('td', { 'class': 'mt-sb-teamitems', 'aria-hidden': 'true' }, '');
        if (c.kind === 'talents' || c.kind === 'aghs') {
          /* neither quantity sums over a team, so the team row leaves it blank
             rather than inventing an aggregate */
          return h('td', { 'class': 'mt-sb-teamextra mt-sb-cell--' + c.id, 'aria-hidden': 'true' }, '');
        }
        var a = h('span', { 'class': 'mt-sb-a' }, '');
        var b = h('span', { 'class': 'mt-sb-b' }, '');
        var td = h('td', { 'class': 'col-num u-tnum mt-sb-teamnum' }, a, b);
        return td;
      });

      var teamRow = h('tr', { 'class': 'mt-sb-team mt-sb-team--' + side }, teamCells);

      var body = h('tbody');
      if (opts.teamRow) body.appendChild(teamRow);

      var rowRecords = list.map(function (p, idx) {
        var rec = buildRow(p, side, idx);
        body.appendChild(rec.tr);
        rowsByKey[p.key] = rec;
        return rec;
      });

      var table = h('table', {
        'class': 'hub-table hub-table--compact mt-sb-table',
        'data-side': side,
        'data-team-id': team.key
      },
        h('caption', { 'class': 'u-sr-only' },
          team.displayName + ', ' + (side === 'radiant' ? 'Radiant' : 'Dire') +
          '. Values follow the timeline, the header says which minute.'),
        cg, thead, body);

      var wrap = h('div', {
        'class': 'mt-sb-tablewrap mt-sb-tablewrap--' + side,
        'data-testid': side === 'radiant' ? 'home-team' : 'away-team'
      }, table);

      return { wrap: wrap, ths: ths, teamCells: teamCells, rows: rowRecords, side: side, list: list };
    }

    function buildRow(p, side, idx) {
      var cells = {};

      /* player cell: the avatar is the compare control */
      var pickBtn = h('button', {
        type: 'button',
        'class': 'mt-sb-pick',
        'data-player-id': p.key,
        'aria-label': 'Compare ' + p.handle + ', ' + p.heroDisplay,
        title: 'Compare ' + p.handle,
        onclick: function () {
          document.dispatchEvent(new CustomEvent(opts.selectEvent, {
            detail: { key: p.key, slot: null, source: 'scoreboard' }
          }));
          var target = document.getElementById('m-players');
          if (target && target.scrollIntoView) target.scrollIntoView({ block: 'nearest', behavior: prefersReduced() ? 'auto' : 'smooth' });
        }
      }, Hub.avatar(p, p.teamKey, 'sm'));

      /* PHASE 4, item 4: the handle and the hero name are cross links.
         Hub.extLink degrades to a plain span when the id is null, so a
         player without an rdy.gg id still renders, just without a link. */
      var playerHref = opts.entityLinks ? linkPlayer(p.rdyPlayerId) : null;
      var heroHref = opts.entityLinks ? linkHero(p.hero) : null;

      var handleNode = Hub.extLink(playerHref, {
        'class': 'mt-sb-handle' + (playerHref ? ' mt-sb-link' : ''),
        'data-player-id': p.rdyPlayerId === null || p.rdyPlayerId === undefined ? null : String(p.rdyPlayerId),
        title: playerHref ? p.handle + ' on rdy.gg' : p.handle
      }, p.handle);

      var heroNameNode = Hub.extLink(heroHref, {
        'class': 'mt-sb-heroname' + (heroHref ? ' mt-sb-link' : ''),
        title: heroHref ? p.heroDisplay + ' on rdy.gg' : p.heroDisplay
      }, p.heroDisplay);

      var playerCell = h('th', { scope: 'row', 'class': 'mt-sb-playercell' },
        h('span', { 'class': 'mt-sb-pwrap' },
          pickBtn,
          h('span', { 'class': 'mt-sb-pnames' },
            handleNode,
            h('span', { 'class': 'mt-sb-hero' },
              Hub.heroImg(p.hero, { side: side, size: 'sm', alt: p.heroDisplay }),
              heroNameNode
            )
          ),
          h('span', { 'class': 'mt-sb-pos u-tnum', title: 'Position ' + p.pos }, 'P' + p.pos)
        )
      );

      var talentNode = opts.talents ? buildTalents(p) : null;
      var aghsNode = opts.aghanims ? buildAghs(p) : null;

      var talentTd = h('td', { 'class': 'mt-sb-extracell mt-sb-cell--talents' });
      var aghsTd = h('td', { 'class': 'mt-sb-extracell mt-sb-cell--aghs' });
      if (talentNode) talentTd.appendChild(talentNode);
      if (aghsNode) aghsTd.appendChild(aghsNode);

      /* each movable node remembers the cell it belongs to at full width */
      var extras = [];
      if (talentNode) extras.push({ node: talentNode, wide: talentTd });
      if (aghsNode) extras.push({ node: aghsNode, wide: aghsTd });

      var itemsCell = null;

      var tds = COLS.map(function (c) {
        if (c.kind === 'player') return playerCell;
        if (c.kind === 'talents') return talentTd;
        if (c.kind === 'aghs') return aghsTd;
        if (c.kind === 'items') {
          var cell = buildItemsCell(p);
          cells.items = cell;
          itemsCell = cell;
          return cell.td;
        }
        var a = h('span', { 'class': 'mt-sb-a' }, '');
        var b = h('span', { 'class': 'mt-sb-b' }, '');
        var td = h('td', { 'class': 'col-num u-tnum mt-sb-num mt-sb-num--' + c.id }, a, b);
        cells[c.id] = { td: td, a: a, b: b };
        return td;
      });

      var tr = h('tr', {
        'class': 'mt-sb-row m-hl',
        'data-player-key': p.key,
        'data-player-id': p.key,
        'data-testid': 'player-card',
        style: '--mt-sb-i:' + idx,
        onmouseenter: function () { if (opts.crossHighlight) Timeline.highlightPlayer(p.key); },
        onmouseleave: function () { if (opts.crossHighlight) Timeline.highlightPlayer(null); },
        onfocusin: function () { if (opts.crossHighlight) Timeline.highlightPlayer(p.key); },
        onfocusout: function () { if (opts.crossHighlight) Timeline.highlightPlayer(null); }
      }, tds);

      /* the collapse moves these two nodes between the two hosts and
         nothing else: one DOM node per player, either side of 1280 */
      return {
        tr: tr, cells: cells, player: p, side: side,
        extras: extras,
        talentTd: talentTd, aghsTd: aghsTd,
        collapseHost: itemsCell ? itemsCell.extraBox : talentTd
      };
    }

    /* items: both states are built once, the mode flips which is shown,
       so scrubbing never creates or destroys an <img>.

       PHASE 4 shape change. items.final is an object now, not an array.
       The six main slots are items.final.main, and items.finalFlat is the
       same six kept for a pre Phase 4 reader; this cell reads main and
       falls back to finalFlat so it renders against either payload. The
       backpack is a count chip here and the three slots themselves are
       drawn in full in the purchases card, which has the room. */
    function mainSlots(p) {
      var f = p.items.final;
      if (f && f.main) return { names: f.main, display: f.mainDisplay, icons: f.mainIcons };
      return { names: p.items.finalFlat || [], display: p.items.finalDisplay || [], icons: p.items.finalIcons || [] };
    }

    function neutralSlot(p) {
      var f = p.items.final;
      if (f && f.neutral) {
        return { name: f.neutral[0], display: (f.neutralDisplay || [])[0], icon: (f.neutralIcons || [])[0] };
      }
      return { name: p.items.neutral, display: p.items.neutralDisplay, icon: p.items.neutralIcon };
    }

    function backpackFilled(p) {
      var f = p.items.final;
      var out = [];
      if (!f || !f.backpack) return out;
      for (var k = 0; k < f.backpack.length; k++) {
        if (f.backpack[k]) out.push((f.backpackDisplay || [])[k] || f.backpack[k]);
      }
      return out;
    }

    function buildItemsCell(p) {
      var finalBox = h('span', { 'class': 'mt-sb-items mt-sb-items--final' });
      var main = mainSlots(p);
      main.names.forEach(function (name, k) {
        if (!name) return;
        finalBox.appendChild(itemNode(name, main.display[k], main.icons[k]));
      });
      var nslot = neutralSlot(p);
      if (nslot.name) {
        finalBox.appendChild(itemNode(nslot.name, nslot.display, nslot.icon, 'neutral'));
      }
      var pack = backpackFilled(p);
      if (pack.length) {
        finalBox.appendChild(h('span', {
          'class': 'mt-sb-pack u-tnum',
          title: 'In the backpack at the whistle: ' + pack.join(', ') + '. The three slots are drawn in full in the purchases card.',
          'aria-label': 'Backpack, ' + pack.length + ', ' + pack.join(', ')
        }, String(pack.length) + 'B'));
      }

      var liveBox = h('span', { 'class': 'mt-sb-items mt-sb-items--live' });
      var owned = (p.items.timeline || []).filter(function (e) { return !e.consumable && !e.usedOnPickup && !e.recipe; });
      var nodes = owned.map(function (e) {
        var n = itemNode(e.item, e.display + ' ' + e.clock, e.icon);
        n.hidden = true;
        liveBox.appendChild(n);
        return { node: n, entry: e };
      });
      var more = h('span', { 'class': 'mt-sb-more u-tnum' }, '');
      more.hidden = true;
      liveBox.appendChild(more);
      liveBox.hidden = true;

      /* the host the talents glyph and the Aghanim's chips move into
         under 1280, kept empty and zero height above it */
      var extraBox = h('span', { 'class': 'mt-sb-itemextra' });

      var td = h('td', { 'class': 'mt-sb-itemcell' }, finalBox, liveBox, extraBox);
      return { td: td, finalBox: finalBox, liveBox: liveBox, nodes: nodes, more: more, extraBox: extraBox, player: p };
    }

    function itemNode(name, display, icon, extra) {
      var cls = 'item-icon mt-sb-item' + (extra ? ' mt-sb-item--' + extra : '');
      if (icon) {
        return h('img', {
          'class': cls, src: encodeURI(icon), alt: display || name,
          title: display || name, loading: 'lazy', decoding: 'async'
        });
      }
      return h('span', {
        'class': cls + ' mt-sb-item--text', title: display || name,
        'aria-label': display || name
      }, String(display || name).replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase());
    }

    /* ------------------------------------------------------------
       PHASE 4, item 4: cross links.
       Hub.link.hero and Hub.link.player are the shared builders. If a
       build of hub/core.js ever ships without one, the same URL pattern
       is rebuilt here rather than dropping the link: rdy.gg hero routes
       are the Valve internal name with underscores as hyphens.
       ------------------------------------------------------------ */
    var RDY_DOTA = 'https://rdy.gg/en/dota2';

    function linkHero(internalName) {
      if (!internalName) return null;
      if (Hub.link && typeof Hub.link.hero === 'function') return Hub.link.hero(internalName);
      return RDY_DOTA + '/heroes/' + String(internalName).toLowerCase().replace(/_/g, '-');
    }

    function linkPlayer(id) {
      if (id === null || id === undefined || id === '') return null;
      if (Hub.link && typeof Hub.link.player === 'function') return Hub.link.player(id);
      return RDY_DOTA + '/players/' + id;
    }

    /* ------------------------------------------------------------
       PHASE 4, item 2a: the talents glyph and its inline panel.

       The glyph is four tiers wide, one per hero level, each drawn as a
       pair of cells: the side the player took first is filled, the other
       is empty, and a tier he never reached or that OpenDota never logged
       is drawn empty and says which in the panel. The panel is plain
       text in the document, shown by a hidden flag, so there is no
       popover library, no scroll lock and no focus trap.

       Left and right are the constants order, not a screen position.
       That rule is captioned in every panel and the payload's own
       talentRule sentence is printed once under the tables.
       ------------------------------------------------------------ */
    var openTalent = null;

    /* A hover is a preview and a click is a pin, the same split the rest of
       the page uses. A pinned panel survives the pointer leaving and the
       button losing focus; Escape and a second click unpin it. Without the
       pin a click on a panel the pointer had already opened would read as
       the panel refusing to open. */
    function closeTalent(returnFocus) {
      if (!openTalent) return;
      var rec = openTalent;
      openTalent = null;
      rec.pinned = false;
      rec.panel.hidden = true;
      rec.btn.setAttribute('aria-expanded', 'false');
      if (returnFocus && rec.btn.focus) rec.btn.focus();
    }

    function showTalent(rec) {
      if (openTalent === rec) return;
      closeTalent(false);
      openTalent = rec;
      rec.panel.hidden = false;
      rec.btn.setAttribute('aria-expanded', 'true');
    }

    function hideTalent(rec) {
      if (openTalent !== rec || rec.pinned) return;
      closeTalent(false);
    }

    function onEscape(e) {
      if (e.key !== 'Escape' || !openTalent) return;
      e.stopPropagation();
      closeTalent(true);
    }
    document.addEventListener('keydown', onEscape, true);

    function tierState(t) {
      if (!t) return 'none';
      if (t.status === 'notReached') return 'unreached';
      if (t.status === 'notLogged') return 'unlogged';
      if (t.chosenSide === 'left') return 'l';
      if (t.chosenSide === 'right') return 'r';
      return 'none';
    }

    function tierByLevel(list, level) {
      for (var i = 0; i < (list || []).length; i++) {
        if (list[i] && list[i].level === level) return list[i];
      }
      return null;
    }

    function optionNode(opt, tier, sideName) {
      if (!opt) {
        return h('span', { 'class': 'mt-sb-talopt is-missing' }, 'not published');
      }
      var chosen = !!tier && tier.chosenSide === sideName && tier.status === 'taken';
      var also = !!tier && tier.bothTaken && !chosen && opt.taken;
      var cls = 'mt-sb-talopt' +
        (chosen ? ' is-chosen' : '') +
        (also ? ' is-also' : '') +
        (opt.valueKnown === false ? ' is-novalue' : '');
      var title = opt.valueKnown === false
        ? 'The constants publish this talent as ' + opt.displayTemplate +
          ' and no value to fill it, so the number is not printed.'
        : opt.display;
      var node = h('span', { 'class': cls, title: title },
        h('span', { 'class': 'mt-sb-taltext' }, opt.display));
      if (chosen) node.appendChild(h('em', { 'class': 'mt-sb-taltag' }, 'taken'));
      else if (also) node.appendChild(h('em', { 'class': 'mt-sb-taltag mt-sb-taltag--late' }, 'taken later'));
      return node;
    }

    function buildTalents(p) {
      var list = p.talents || [];
      if (!list.length) return null;

      var glyph = h('span', { 'class': 'mt-sb-talglyph', 'aria-hidden': 'true' });
      var taken = 0, noValue = 0;

      TIER_LEVELS.forEach(function (level) {
        var t = tierByLevel(list, level);
        if (t && t.status === 'taken') taken++;
        if (t) {
          if (t.left && t.left.valueKnown === false) noValue++;
          if (t.right && t.right.valueKnown === false) noValue++;
        }
        glyph.appendChild(h('span', { 'class': 'mt-sb-tier is-' + tierState(t) },
          h('i', { 'class': 'mt-sb-half mt-sb-half--l' }),
          h('i', { 'class': 'mt-sb-half mt-sb-half--r' })));
      });

      var panelId = 'mt-sb-tal-' + String(p.key).replace(/[^A-Za-z0-9_-]/g, '');

      var rows = h('ul', { 'class': 'mt-sb-tallist' });
      TIER_LEVELS.forEach(function (level) {
        var t = tierByLevel(list, level);
        var pair = h('span', { 'class': 'mt-sb-talopts' },
          optionNode(t && t.left, t, 'left'),
          optionNode(t && t.right, t, 'right'));
        var note = null;
        if (!t || t.status === 'notReached') {
          note = h('span', { 'class': 'mt-sb-talnote' },
            p.handle + ' never reached hero level ' + level + ' in this game.');
        } else if (t.status === 'notLogged') {
          note = h('span', { 'class': 'mt-sb-talnote' },
            'OpenDota logs no talent for this tier, so no side is claimed.');
        }
        var li = h('li', { 'class': 'mt-sb-talrow' + (note ? ' is-quiet' : '') },
          h('span', { 'class': 'mt-sb-tallvl u-tnum' }, String(level)),
          pair);
        if (note) li.appendChild(note);
        rows.appendChild(li);
      });

      var caption = h('p', { 'class': 'mt-sb-talrule' },
        'Left is the first talent the constants list for that level and right is the second. ' +
        'OpenDota does not publish which side the client draws on the left, so this is an order, not a layout.');

      /* P4R2-05: the noun and the verb follow the count, so one unvalued
         talent reads as one and two read as two. */
      var counts = h('p', { 'class': 'mt-sb-talcount u-tnum' },
        taken + ' of ' + TIER_LEVELS.length + ' tiers resolved' +
        (noValue
          ? ', ' + noValue + (noValue === 1
            ? ' talent name here carries no published value and prints the effect without a number'
            : ' talent names here carry no published value and print the effect without a number')
          : ''));

      var panel = h('div', {
        'class': 'mt-sb-talpanel',
        id: panelId,
        role: 'group',
        'aria-label': 'Talents taken by ' + p.handle + ', ' + p.heroDisplay
      },
        h('p', { 'class': 'mt-sb-talhead' }, p.handle + ', ' + p.heroDisplay),
        rows, counts, caption);
      panel.hidden = true;

      var btn = h('button', {
        type: 'button',
        'class': 'mt-sb-tal',
        'aria-expanded': 'false',
        'aria-controls': panelId,
        'aria-label': 'Talents, ' + p.handle + ', ' + p.heroDisplay + ', ' +
          taken + ' of ' + TIER_LEVELS.length + ' tiers resolved',
        title: 'Talents taken by ' + p.handle
      }, glyph);

      var rec = { btn: btn, panel: panel, pinned: false };

      btn.addEventListener('click', function () {
        if (rec.pinned) { closeTalent(false); return; }
        showTalent(rec);
        rec.pinned = true;
      });
      btn.addEventListener('focus', function () { showTalent(rec); });
      btn.addEventListener('blur', function () { hideTalent(rec); });

      var wrap = h('span', { 'class': 'mt-sb-talwrap' }, btn, panel);
      wrap.addEventListener('mouseenter', function () { showTalent(rec); });
      wrap.addEventListener('mouseleave', function () {
        if (document.activeElement === btn) return;
        hideTalent(rec);
      });

      return wrap;
    }

    /* ------------------------------------------------------------
       PHASE 4, item 2b: the Aghanim's cell.
       Two chips, always both drawn, so a missing upgrade reads as an
       absence and not as missing data.

       P4-03. The chip is the UPGRADE, not the item. OpenDota's
       aghanims_scepter and aghanims_shard flags describe the upgrade
       active on the hero, so a chip can be on with no matching item in
       the final six (the upgrade came from a Blessing or a consumed
       Scepter), and a chip can be off while ultimate_scepter sits in the
       inventory (bought, not consumed). Both readings are correct and the
       page now says which one this column is, next to the column and in
       the footnote, so the Items card and this card cannot be read as
       contradicting each other.
       ------------------------------------------------------------ */
    function aghChip(on, label, p) {
      return h('span', {
        'class': 'mt-sb-agh' + (on ? ' is-on' : ' is-off'),
        title: p.handle + ': ' + label + ' upgrade ' + (on ? 'active' : 'not active') + ' at the whistle',
        'aria-label': label + ' upgrade ' + (on ? 'active' : 'not active')
      }, label);
    }

    /* P4-03 support: the players who END the game carrying the physical
       Scepter or Shard while the upgrade flag is off. Counted off the same
       record the Items card prints, never typed in, so the footnote states
       the size of the discrepancy instead of leaving the reader to find it. */
    function carriedItemName(which) {
      return which === 'scepter' ? 'ultimate_scepter' : 'aghanims_shard';
    }

    function carriesUnconsumed(p, which) {
      var f = p.items && p.items.final;
      var slots = [];
      if (f && f.main) slots = slots.concat(f.main);
      else if (p.items && p.items.finalFlat) slots = slots.concat(p.items.finalFlat);
      if (f && f.backpack) slots = slots.concat(f.backpack);
      return slots.indexOf(carriedItemName(which)) !== -1;
    }

    function carriedNotActive() {
      var out = [];
      (G5.players || []).forEach(function (p) {
        var a = p.aghanims || {};
        ['scepter', 'shard'].forEach(function (which) {
          if (!a[which] && carriesUnconsumed(p, which)) {
            out.push({ handle: p.handle, which: which === 'scepter' ? 'Scepter' : 'Shard' });
          }
        });
      });
      return out;
    }

    function buildAghs(p) {
      var a = p.aghanims;
      if (!a) return null;
      return h('span', { 'class': 'mt-sb-aghs' },
        aghChip(!!a.scepter, 'Scepter', p),
        aghChip(!!a.shard, 'Shard', p));
    }

    function buildFootnote() {
      var un = (G5.uncreditedDeaths || [])[0];
      var items = [];

      items.push(h('li', null,
        'The team row is the sum of the five rows below it. Lvl shows the highest level on the team.'));
      items.push(h('li', null,
        'The match high in every column is underlined.'));

      if (un) {
        var victim = un.victimHandle;
        var side = un.victimSide === 'dire' ? G5.match.radiant : G5.match.dire;
        var whenText = un.secondsKnown === false
          ? 'at a second OpenDota does not publish'
          : 'at ' + un.clock;
        var sourceText = un.source ? ', source ' + String(un.source).replace(/_/g, ' ') : '';
        items.push(h('li', null,
          'Credited kills sum to ' + G5.match.killsCredited.radiant + ' for ' + G5.match.radiant.tag +
          ' against an official ' + G5.match.kills.radiant + '. ' + victim + ' died ' + whenText +
          ' with no credited killer' + sourceText + ', so that kill belongs to ' + side.displayName + ' as a team.'));
      }

      items.push(h('li', null,
        'Assists are published only as a final total, so the live column reads K / D and the final column K / D / A.'));

      if (opts.talents || opts.aghanims) {
        items.push(h('li', null,
          "Talents and Aghanim's do not move with the clock. OpenDota publishes a talent as the nth " +
          'upgrade a player spent, never as a second, and it publishes the scepter and shard state as one ' +
          'flag a player, never as a time, so both columns read the same at every index.'));
      }

      if (opts.talents && G5.talentRule) {
        items.push(h('li', { 'class': 'mt-sb-rule' }, G5.talentRule));
      }

      /* P4-03: the Aghanim's column states its own rule, the way the
         talent column does, and then states how many rows on this page
         the rule separates from the inventory. */
      if (opts.aghanims) {
        items.push(h('li', { 'class': 'mt-sb-rule' },
          "Aghanim's rule: a chip is on when OpenDota sets aghanims_scepter or aghanims_shard for that " +
          'player, which is the upgrade active on the hero at the whistle. A Scepter or Shard sitting ' +
          'unconsumed in the inventory is an item and not an upgrade, so it is listed in Items and in Final ' +
          'inventory and left off this column.'));

        var carried = carriedNotActive();
        if (carried.length) {
          items.push(h('li', null,
            (carried.length === 1 ? 'One row reads' : carried.length + ' rows read') +
            ' item yes, upgrade no in this game: ' +
            carried.map(function (c) { return c.handle + ' (' + c.which + ')'; }).join(', ') +
            '. The item is in the inventory and the upgrade flag is not set.'));
        }
      }

      var unresolved = G5.talentsUnresolved || [];
      if (opts.talents && unresolved.length) {
        items.push(h('li', null,
          unresolved.length === 1
            ? 'One talent could not be placed against the current constants: ' +
              unresolved[0].playerHandle + ' took ' + unresolved[0].display +
              ' and that tier reads as not logged rather than being guessed.'
            : unresolved.length + ' talents could not be placed against the current constants, so those tiers ' +
              'read as not logged rather than being guessed.'));
      }

      return h('div', { 'class': 'mt-sb-foot' },
        h('ul', { 'class': 'mt-sb-notes' }, items));
    }

    function prefersReduced() {
      return !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches);
    }

    /* ------------------------------------------------------------
       paint: one index, every cell
       ------------------------------------------------------------ */
    function paint(i) {
      var isFinal = i >= last;
      root.setAttribute('data-mode', isFinal ? 'final' : 'live');

      /* header */
      modeChip.textContent = isFinal ? 'Final' : 'At ' + Timeline.clockAt(i);
      modeChip.className = 'chip mt-sb-mode u-tnum ' + (isFinal ? 'chip--gold' : 'chip--outline');
      liveNote.textContent = isFinal
        ? 'Post match rows, ' + G5.match.durationClock
        : 'Reading ' + i + ' of ' + last;
      speak('Scoreboard at ' + (isFinal ? 'the final whistle, ' + G5.match.durationClock : Timeline.clockAt(i)),
        Timeline.state);

      /* column headers */
      tables.forEach(function (t) {
        t.ths.forEach(function (th, k) {
          var c = COLS[k];
          var label = isFinal ? c.label : (c.liveLabel || c.label);
          if (th.textContent !== label) th.textContent = label;
        });
      });

      /* the match high per column, over all ten players */
      var tops = {};
      if (opts.markColumnMax) {
        COLS.forEach(function (c) {
          if (!c.metric) return;
          var best = null;
          G5.players.forEach(function (p) {
            var v = c.metric(p, i, isFinal);
            if (typeof v !== 'number' || isNaN(v)) return;
            if (best === null || v > best) best = v;
          });
          tops[c.id] = best;
        });
      }

      /* rows */
      tables.forEach(function (t) {
        t.rows.forEach(function (rec) {
          COLS.forEach(function (c) {
            if (!c.read) return;
            var cell = rec.cells[c.id];
            if (!cell) return;
            var v = c.read(rec.player, i, isFinal);
            setText(cell.a, v.a);
            if (v.b === undefined || v.b === null) {
              cell.b.hidden = true;
            } else {
              cell.b.hidden = false;
              setText(cell.b, v.b);
            }
            if (opts.markColumnMax && c.metric) {
              var mine = c.metric(rec.player, i, isFinal);
              var top = tops[c.id];
              cell.td.classList.toggle('is-top', typeof mine === 'number' && top !== null && mine === top && top > 0);
            }
          });
          paintItems(rec.cells.items, i, isFinal);
        });

        /* team row */
        if (!opts.teamRow) return;
        COLS.forEach(function (c, k) {
          if (!c.team) return;
          var cell = t.teamCells[k];
          if (!cell) return;
          var v = c.team(t.list, i, isFinal);
          var a = cell.firstChild, b = cell.lastChild;
          setText(a, v.a);
          if (v.b === undefined || v.b === null) { b.hidden = true; } else { b.hidden = false; setText(b, v.b); }
          cell.title = v.note || '';
        });
      });
    }

    function paintItems(cell, i, isFinal) {
      if (!cell) return;
      cell.finalBox.hidden = !isFinal;
      cell.liveBox.hidden = isFinal;
      if (isFinal) return;

      var cut = Timeline.secondsAt(i);
      var live = [];
      for (var k = 0; k < cell.nodes.length; k++) {
        var e = cell.nodes[k].entry;
        var ownedNow = e.seconds <= cut && (e.consumedAt === null || e.consumedAt > cut);
        cell.nodes[k].node.hidden = true;
        if (ownedNow) live.push(cell.nodes[k]);
      }
      /* the cap keeps the cell two icon rows tall at every index, so
         scrubbing never changes the height of the card */
      var over = live.length > opts.liveItemCap;
      var shown = over ? opts.liveItemCap - 1 : live.length;
      var showFrom = live.length - shown;
      for (var j = showFrom; j < live.length; j++) live[j].node.hidden = false;
      if (over) {
        cell.more.hidden = false;
        setText(cell.more, '+' + showFrom);
      } else {
        cell.more.hidden = true;
      }
    }

    function setText(node, value) {
      var s = (value === null || value === undefined) ? '' : String(value);
      if (node.textContent !== s) node.textContent = s;
    }
  });

  global.MatchScoreboard = { defaults: DEFAULTS, version: '1.0.0' };

})(window);
