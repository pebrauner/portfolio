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
                                    HEALING, ITEMS
     index  <  last  ->  AT MM:SS   LVL, K/D, LH/DN, GPM/XPM,
                                    GOLD, XP, 5 MIN GOLD, TEAM SHARE,
                                    ITEMS OWNED

   Ten columns in both modes, one colgroup, identical widths, so the
   switch never moves a column or changes the height of the card.

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
    selectEvent: 'mt:select-player',
    testid: 'match-scoreboard'
  };

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
        id: 'player', width: 20, kind: 'player',
        label: 'Player', liveLabel: 'Player'
      },
      {
        id: 'lvl', width: 5, align: 'num',
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
        id: 'kda', width: 9.5, align: 'num',
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
        id: 'lhdn', width: 7.5, align: 'num',
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
        id: 'gold', width: 9, align: 'num',
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
        id: 'c7', width: 9, align: 'num',
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
        id: 'c8', width: 9, align: 'num',
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
        id: 'c9', width: 7.5, align: 'num',
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
        id: 'items', width: 15, kind: 'items',
        label: 'Items', liveLabel: 'Items owned',
        title: 'The six slots and the neutral at the whistle. Before it, what the player owns at that reading'
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
    var G5 = ctx.G5;
    var Timeline = ctx.Timeline;
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

    var header = h('div', { 'class': 'card-header' },
      h('div', { 'class': 'titles' },
        h('h2', { 'class': 'title' }, 'Scoreboard'),
        h('div', { 'class': 'subtitle' },
          'Every row reads the same minute as the timeline. Scrub the strip and the table follows.')
      ),
      h('div', { 'class': 'action mt-sb-modewrap' }, modeChip, liveNote)
    );

    /* ---- the two tables ---- */
    var rowsByKey = {};
    var tables = ['radiant', 'dire'].map(function (side) {
      return buildTable(side);
    });

    var footNote = buildFootnote();

    var root = h('section', {
      'class': 'card mt-sb',
      'data-testid': opts.testid,
      'data-mode': 'final'
    }, header, tables[0].wrap, tables[1].wrap, footNote, srLive);

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

    root.addEventListener('mt:destroy', function () {
      if (stopSub) stopSub();
      if (stopHl) stopHl();
    });

    /* ------------------------------------------------------------
       builders
       ------------------------------------------------------------ */
    function buildTable(side) {
      var team = teams[side];
      var list = bySide[side];
      var isWinner = G5.match.winnerKey === team.key;

      var cg = h('colgroup');
      COLS.forEach(function (c) {
        cg.appendChild(h('col', { style: 'width:' + c.width + '%' }));
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

      var playerCell = h('th', { scope: 'row', 'class': 'mt-sb-playercell' },
        h('span', { 'class': 'mt-sb-pwrap' },
          pickBtn,
          h('span', { 'class': 'mt-sb-pnames' },
            h('span', { 'class': 'mt-sb-handle' }, p.handle),
            h('span', { 'class': 'mt-sb-hero' },
              Hub.heroImg(p.hero, { side: side, size: 'sm', alt: p.heroDisplay }),
              h('span', { 'class': 'mt-sb-heroname' }, p.heroDisplay)
            )
          ),
          h('span', { 'class': 'mt-sb-pos u-tnum', title: 'Position ' + p.pos }, 'P' + p.pos)
        )
      );

      var tds = COLS.map(function (c) {
        if (c.kind === 'player') return playerCell;
        if (c.kind === 'items') {
          var cell = buildItemsCell(p);
          cells.items = cell;
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

      return { tr: tr, cells: cells, player: p, side: side };
    }

    /* items: both states are built once, the mode flips which is shown,
       so scrubbing never creates or destroys an <img> */
    function buildItemsCell(p) {
      var finalBox = h('span', { 'class': 'mt-sb-items mt-sb-items--final' });
      (p.items.final || []).forEach(function (name, k) {
        if (!name) return;
        finalBox.appendChild(itemNode(name, p.items.finalDisplay[k], p.items.finalIcons[k]));
      });
      if (p.items.neutral) {
        finalBox.appendChild(itemNode(p.items.neutral, p.items.neutralDisplay, p.items.neutralIcon, 'neutral'));
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

      var td = h('td', { 'class': 'mt-sb-itemcell' }, finalBox, liveBox);
      return { td: td, finalBox: finalBox, liveBox: liveBox, nodes: nodes, more: more, player: p };
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
        items.push(h('li', null,
          'Credited kills sum to ' + G5.match.killsCredited.radiant + ' for ' + G5.match.radiant.tag +
          ' against an official ' + G5.match.kills.radiant + '. ' + victim + ' died to the fountain at ' +
          un.clock + ', so that kill has no credited killer and belongs to ' + side.displayName + ' as a team.'));
      }

      items.push(h('li', null,
        'Assists are published only as a final total, so the live column reads K / D and the final column K / D / A.'));

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
