/* TI 2026 hub, tournament components.
 * Mounts: m-standings-snapshot, m-bracket, m-schedule, m-standings, m-teams.
 * Every value on screen is read from window.TI2026 / window.GF5. No literals.
 * Owner: tournament agent. Do not edit the shell, hub.css, core.js or the data.
 */
(function () {
  'use strict';

  if (!window.Hub) { return; }

  var h = Hub.h;
  var fmt = Hub.fmt;

  /* ============================================================
     shared helpers
     ============================================================ */

  function tname(key) {
    var t = Hub.team(key);
    return t ? (t.displayName || t.name || String(key)) : String(key);
  }

  /* One short code per team, three uppercase letters, stored in the data.
     Nothing in this file shortens a name on its own any more. */
  function ttag(key) {
    var t = Hub.team(key);
    if (t && t.abbr) { return t.abbr; }
    return Hub.initials(tname(key), 3);
  }

  /* Game records, recomputed from the series actually listed on this page.
     Two stored rows disagreed with their own round cells, and a table must
     never contradict itself. The stored figure is kept in the data. */
  var GAME_RECORDS = null;
  function gameRecords(gs) {
    if (GAME_RECORDS) { return GAME_RECORDS; }
    var agg = {};
    (gs.rounds || []).forEach(function (rnd) {
      (rnd.series || []).forEach(function (ser) {
        var parts = String(ser.score || '').split('-');
        var a = parseInt(parts[0], 10);
        var b = parseInt(parts[1], 10);
        if (isNaN(a) || isNaN(b)) { return; }
        [[ser.teamA, a, b], [ser.teamB, b, a]].forEach(function (x) {
          if (!x[0]) { return; }
          if (!agg[x[0]]) { agg[x[0]] = { wins: 0, losses: 0 }; }
          agg[x[0]].wins += x[1];
          agg[x[0]].losses += x[2];
        });
      });
    });
    GAME_RECORDS = agg;
    return agg;
  }

  /* { wins, losses, text } for a standings row, derived not stored */
  function gameRecord(gs, teamKey, fallback) {
    var rec = gameRecords(gs)[teamKey];
    if (!rec) {
      return {
        wins: (fallback && fallback.gameWins) || 0,
        losses: (fallback && fallback.gameLosses) || 0,
        text: (fallback && fallback.gameRecord) || ''
      };
    }
    return { wins: rec.wins, losses: rec.losses, text: rec.wins + '-' + rec.losses };
  }

  var DERIVED_NOTE = 'Game records are counted from the round by round series in this table, ' +
    'so the total and the cells can never disagree. Two rows differ by one game from the ' +
    'figure published with the standings.';

  /* the Swiss rounds run from the first round date to the last, which is not
     the same span as the phase, because the Elimination Round follows it */
  function roundsSpan(gs) {
    var rounds = gs.rounds || [];
    if (!rounds.length) { return dateRange(gs.dates); }
    var first = rounds[0].date;
    var last = rounds[rounds.length - 1].date;
    if (!first || !last) { return dateRange(gs.dates); }
    if (first === last) { return fmt.date(last); }
    return fmt.date(first, 'short') + ' to ' + fmt.date(last);
  }

  function scoreParts(score) {
    var p = String(score === null || score === undefined ? '' : score).split('-');
    return [p[0] || '', p.length > 1 ? p[1] : ''];
  }

  function dateRange(str) {
    var s = String(str || '');
    var bits = s.split(' to ');
    if (bits.length === 2) { return fmt.date(bits[0], 'short') + ' to ' + fmt.date(bits[1]); }
    return fmt.date(s);
  }

  /* crest + name, one line. dir 'rtl' mirrors it for the left side of a match row. */
  function teamInline(key, opts) {
    opts = opts || {};
    var label = opts.tagOnly ? ttag(key) : tname(key);
    return h('span', {
      'class': 'tour-team' + (opts.rtl ? ' tour-team--rtl' : '') + (opts.className ? ' ' + opts.className : ''),
      'data-team-id': key
    },
      Hub.teamCrest(key, opts.size === undefined ? 'sm' : opts.size),
      h('span', { 'class': 'tour-team-name u-truncate' }, label));
  }

  /* '9-13' -> '9th to 13th', '3' -> '3rd', 'grand final' -> null */
  function ordinal(n) {
    var v = parseInt(n, 10);
    if (isNaN(v)) { return null; }
    var mod100 = v % 100;
    var suffix = 'th';
    if (mod100 < 11 || mod100 > 13) {
      if (v % 10 === 1) { suffix = 'st'; }
      else if (v % 10 === 2) { suffix = 'nd'; }
      else if (v % 10 === 3) { suffix = 'rd'; }
    }
    return v + suffix;
  }

  function placementText(placement) {
    var p = String(placement || '');
    if (!p) { return null; }
    if (p.indexOf('-') > -1) {
      var b = p.split('-');
      var a1 = ordinal(b[0]);
      var a2 = ordinal(b[1]);
      return a1 && a2 ? a1 + ' to ' + a2 : null;
    }
    var one = ordinal(p);
    return one ? one : null;
  }

  function placementOrder(team) {
    var p = String(team.placement || '');
    if (p === 'grand final') { return -1; }
    var n = parseInt(p, 10);
    return isNaN(n) ? 99 : n;
  }

  var CHEVRON = 'M7.4 8.6 12 13.2l4.6-4.6L18 10l-6 6-6-6z';

  function chevron() {
    return Hub.icon(CHEVRON, { className: 'tour-chev' });
  }

  /* redraw hook shared by the bracket link layer */
  function onLayout(el, fn) {
    var raf = null;
    var timer = null;
    function clear() {
      if (raf) { window.cancelAnimationFrame(raf); raf = null; }
      if (timer) { window.clearTimeout(timer); timer = null; }
    }
    /* rAF is throttled in a background tab, so a timeout backs it up.
       fn only measures and writes classes, so running it twice is harmless. */
    function run() {
      clear();
      if (window.requestAnimationFrame) {
        raf = window.requestAnimationFrame(function () { raf = null; fn(); });
      }
      timer = window.setTimeout(function () { timer = null; fn(); }, 90);
    }
    run();
    if (window.ResizeObserver) {
      var ro = new window.ResizeObserver(run);
      ro.observe(el);
    }
    window.addEventListener('resize', run);
    if (document.fonts && document.fonts.ready && document.fonts.ready.then) {
      document.fonts.ready.then(run, function () {});
    }
    return run;
  }

  /* A wide table scrolls on purpose, but only says so when it actually
     overflows. Hover is never the only carrier of that information. */
  function scrollHint(scrollEl, label) {
    var hint = h('div', { 'class': 'tour-scroll-hint' }, chevron(), label);
    if (scrollEl.parentNode) { scrollEl.parentNode.insertBefore(hint, scrollEl.nextSibling); }
    onLayout(scrollEl, function () {
      if (!scrollEl.clientWidth) { return; }
      var over = scrollEl.scrollWidth - scrollEl.clientWidth > 2;
      scrollEl.classList.toggle('is-scrollable', over);
    });
    return hint;
  }

  /* ============================================================
     1. m-standings-snapshot  (Overview, compact Swiss table)
     ============================================================ */

  Hub.register('m-standings-snapshot', function (mount, ctx) {
    var TI = ctx.TI2026;
    var gs = TI.groupStage || {};
    var standings = gs.standings || [];

    /* The Overview shows the shape of the table, not the whole table: the
       Standings tab is where all 16 rows live. */
    var TOP = 8;
    var shown = standings.slice(0, TOP);

    var card = h('div', { 'class': 'card tour-card', 'data-testid': 'standings-snapshot' });

    card.appendChild(h('div', { 'class': 'card-header' },
      h('div', { 'class': 'titles' },
        h('h2', { 'class': 'title' }, 'Group Stage, top ' + TOP),
        h('div', { 'class': 'subtitle' },
          gs.system + ' system, ' + gs.roundsCount + ' rounds of ' + gs.seriesLength + ', ' + roundsSpan(gs))),
      h('div', { 'class': 'action' },
        h('button', {
          type: 'button', 'class': 'btn btn-sm',
          onclick: function () { Hub.tabs.activate('standings', { scroll: true }); }
        }, 'Full standings', chevron()))));

    var table = h('table', { 'class': 'hub-table hub-table--compact tour-snap-table' },
      h('thead', null, h('tr', null,
        h('th', { 'class': 'col-num tour-c-rank', scope: 'col' }, '#'),
        h('th', { scope: 'col' }, 'Team'),
        h('th', { 'class': 'col-num tour-c-wl', scope: 'col' }, 'W-L'),
        h('th', { 'class': 'tour-c-games', scope: 'col' }, 'Games'),
        h('th', { 'class': 'tour-c-form', scope: 'col' }, 'Round by round'))));

    var currentOutcome = null;
    var body = null;
    var zoneCount = {};
    var zoneShown = {};
    standings.forEach(function (row) { zoneCount[row.outcome] = (zoneCount[row.outcome] || 0) + 1; });
    shown.forEach(function (row) { zoneShown[row.outcome] = (zoneShown[row.outcome] || 0) + 1; });

    shown.forEach(function (row) {
      if (row.outcome !== currentOutcome) {
        currentOutcome = row.outcome;
        body = h('tbody', { 'class': 'tour-zone-group tour-zone--' + row.outcome });
        body.appendChild(h('tr', { 'class': 'tour-zone-row' },
          h('th', { colspan: '5', scope: 'colgroup' },
            h('span', { 'class': 'tour-zone-dot' }),
            h('span', { 'class': 'tour-zone-label' }, row.outcomeLabel),
            h('span', { 'class': 'tour-zone-count u-dim' },
              zoneShown[row.outcome] === zoneCount[row.outcome]
                ? zoneCount[row.outcome] + ' teams'
                : zoneShown[row.outcome] + ' of ' + zoneCount[row.outcome] + ' teams'))));
        table.appendChild(body);
      }

      var team = Hub.team(row.teamKey) || {};
      var alive = String(team.placement || '') === 'grand final';
      var gr = gameRecord(gs, row.teamKey, row);
      var totalGames = gr.wins + gr.losses;
      var winPct = totalGames ? (gr.wins / totalGames) * 100 : 0;
      var results = (team.groupStage && team.groupStage.roundResults) || [];
      var byRound = {};
      results.forEach(function (r) { byRound[r.round] = r; });

      var formCells = (gs.rounds || []).map(function (rnd) {
        var r = byRound[rnd.round];
        if (!r) {
          return h('span', { 'class': 'tour-form-pill is-none', title: rnd.round + ': no series' }, '-');
        }
        return h('span', {
          'class': 'tour-form-pill is-' + String(r.result || '').toLowerCase(),
          title: rnd.round + ': ' + r.result + ' ' + r.score + ' against ' + tname(r.opponent)
        }, r.result);
      });

      body.appendChild(h('tr', { 'class': 'tour-snap-row' + (alive ? ' is-alive' : ''), 'data-team-id': row.teamKey },
        h('td', { 'class': 'col-num tour-c-rank' }, h('span', { 'class': 'tour-rank' }, row.rank)),
        h('td', { 'class': 'cell-strong' },
          h('span', { 'class': 'tour-snap-team' },
            teamInline(row.teamKey),
            alive ? h('span', { 'class': 'chip chip--gold' }, 'Grand Final') : null)),
        h('td', { 'class': 'col-num tour-c-wl' }, h('span', { 'class': 'tour-wl u-tnum' }, row.seriesRecord)),
        h('td', { 'class': 'tour-c-games' },
          h('span', { 'class': 'tour-games' },
            h('span', { 'class': 'tour-games-bar', 'aria-hidden': 'true' },
              h('span', { 'class': 'tour-games-win', style: { '--w': winPct.toFixed(1) + '%' } })),
            h('span', { 'class': 'tour-games-text u-tnum' }, gr.text))),
        h('td', { 'class': 'tour-c-form' }, h('span', { 'class': 'tour-form' }, formCells))));
    });

    var snapScroll = h('div', { 'class': 'scroll-x tour-scroll' }, table);
    card.appendChild(h('div', { 'class': 'card-body tour-snap-body' }, snapScroll));
    scrollHint(snapScroll, 'Scroll sideways for the full row');

    card.appendChild(h('div', { 'class': 'card-footer tour-snap-more' },
      h('span', { 'class': 'tour-legend-item' }, h('span', { 'class': 'tour-form-pill is-w' }, 'W'), 'series won'),
      h('span', { 'class': 'tour-legend-item' }, h('span', { 'class': 'tour-form-pill is-l' }, 'L'), 'series lost'),
      h('span', { 'class': 'tour-legend-item' }, h('span', { 'class': 'tour-form-pill is-none' }, '-'), 'no series that round'),
      h('span', { 'class': 'spacer' }),
      h('button', {
        type: 'button', 'class': 'btn btn-sm btn-primary',
        onclick: function () { Hub.tabs.activate('standings', { scroll: true }); }
      }, 'Show all ' + standings.length, chevron())));

    mount.appendChild(card);
  });

  /* ============================================================
     2. m-bracket  (Overview, full double elimination)
     ============================================================ */

  /* Chronological stage order of every main-event round, so a team's
     previous series can be resolved from the data instead of guessed. */
  var STAGE_ORDER = [
    ['upper', 0], ['lower', 0], ['upper', 1], ['lower', 1],
    ['upper', 2], ['lower', 2], ['lower', 3]
  ];

  function buildBracketModel(br) {
    var nodes = [];
    STAGE_ORDER.forEach(function (pair, i) {
      var laneKey = pair[0];
      var rounds = br[laneKey] || [];
      var round = rounds[pair[1]];
      if (!round) { return; }
      (round.series || []).forEach(function (s, j) {
        nodes.push({
          id: laneKey + '-' + pair[1] + '-' + j,
          lane: laneKey,
          roundIdx: pair[1],
          stage: i + 1,
          round: round,
          series: s
        });
      });
    });
    if (br.grandFinal) {
      nodes.push({
        id: 'grand-final',
        lane: 'final',
        roundIdx: 0,
        stage: STAGE_ORDER.length + 1,
        round: { round: br.grandFinal.round, shortRound: br.grandFinal.shortRound, date: br.grandFinal.date },
        series: br.grandFinal
      });
    }
    return nodes;
  }

  /* the last series a team played before `stage`, whatever the result */
  function previousSeries(nodes, teamKey, stage) {
    var best = null;
    nodes.forEach(function (n) {
      if (n.stage >= stage) { return; }
      var s = n.series;
      if (s.teamA !== teamKey && s.teamB !== teamKey) { return; }
      if (!best || n.stage > best.stage) { best = n; }
    });
    return best;
  }

  function seriesCard(node, opts) {
    opts = opts || {};
    var s = node.series;
    var sp = scoreParts(s.score);
    var live = !s.winner;

    function row(key, scoreText) {
      var won = s.winner && s.winner === key;
      var lost = s.winner && s.winner !== key;
      var out = s.eliminated && s.eliminated === key;
      return h('div', {
        'class': 'tour-sr' + (won ? ' is-win' : '') + (lost ? ' is-loss' : '') +
          (live ? ' is-live' : '') + (out ? ' is-out' : ''),
        'data-team-id': key
      },
        Hub.teamCrest(key, 'sm'),
        h('span', { 'class': 'tour-sr-name u-truncate' }, tname(key)),
        h('span', { 'class': 'tour-sr-score u-tnum' }, scoreText));
    }

    return h('div', {
      'class': 'tour-series' + (live ? ' is-live' : '') + (opts.className ? ' ' + opts.className : ''),
      'data-testid': 'match-row'
    },
      h('div', { 'class': 'tour-series-rows' },
        row(s.teamA, sp[0]),
        row(s.teamB, sp[1])),
      h('div', { 'class': 'tour-series-foot' },
        h('span', null, fmt.date(s.date, 'short')),
        h('span', { 'class': 'tour-dot-sep' }, '·'),
        h('span', null, s.seriesLength),
        live ? h('span', { 'class': 'chip chip--live' }, 'Live') : null),
      s.eliminated
        ? h('div', { 'class': 'tour-series-out' },
          h('span', { 'class': 'tour-out' }, ttag(s.eliminated)),
          h('span', { 'class': 'tour-series-out-text' }, 'eliminated'))
        : null);
  }

  Hub.register('m-bracket', function (mount, ctx) {
    var TI = ctx.TI2026;
    var br = TI.bracket || {};
    var gf = br.grandFinal || {};
    var nodes = buildBracketModel(br);
    var elements = {};

    var card = h('div', { 'class': 'card tour-card tour-bracket-card', 'data-testid': 'bracket' });

    card.appendChild(h('div', { 'class': 'card-header' },
      h('div', { 'class': 'titles' },
        h('h2', { 'class': 'title' }, 'Main Event bracket'),
        h('div', { 'class': 'subtitle' }, br.format + ', ' + dateRange(br.dates))),
      h('div', { 'class': 'action' },
        h('button', {
          type: 'button', 'class': 'btn btn-sm',
          onclick: function () { Hub.tabs.activate('schedule', { scroll: true }); }
        }, 'Full schedule', chevron()))));

    var bodyEl = h('div', { 'class': 'card-body tour-bracket-body' });

    [
      { key: 'upper', label: 'Upper Bracket', sub: 'Losers drop into the Lower Bracket' },
      /* No narrative rule, round 2 (audit N-R2-02). The sub-caption read "One
         loss and the run is over", a rhetorical restatement of the format
         inside a data module. It is now the plain format rule, the same
         register as its Upper Bracket sibling. */
      { key: 'lower', label: 'Lower Bracket', sub: 'Single elimination' }
    ].forEach(function (lane) {
      var rounds = br[lane.key] || [];
      if (!rounds.length) { return; }

      var laneEl = h('section', { 'class': 'tour-lane tour-lane--' + lane.key });
      laneEl.appendChild(h('div', { 'class': 'tour-lane-head' },
        h('h3', { 'class': 'tour-lane-title' }, lane.label),
        h('span', { 'class': 'tour-lane-sub u-dim' }, lane.sub)));

      var cols = h('div', { 'class': 'tour-br-cols', style: { '--cols': String(rounds.length) } });

      rounds.forEach(function (round, idx) {
        var laneNodes = nodes.filter(function (n) { return n.lane === lane.key && n.roundIdx === idx; });

        /* who drops in from the other bracket, read from the data */
        var feeders = {};
        laneNodes.forEach(function (n) {
          [n.series.teamA, n.series.teamB].forEach(function (k) {
            var prev = previousSeries(nodes, k, n.stage);
            if (prev && prev.lane !== lane.key) { feeders[prev.round.shortRound] = true; }
          });
        });
        var feederNames = Object.keys(feeders);

        var colBody = h('div', { 'class': 'tour-br-col-body' });
        laneNodes.forEach(function (n) {
          var el = seriesCard(n);
          elements[n.id] = el;
          colBody.appendChild(h('div', { 'class': 'tour-br-slot' }, el));
        });

        cols.appendChild(h('div', { 'class': 'tour-br-col' },
          h('div', { 'class': 'tour-br-col-head' },
            h('div', { 'class': 'tour-br-round' }, round.shortRound || round.round),
            h('div', { 'class': 'tour-br-date u-dim' }, fmt.date(round.date, 'short')),
            feederNames.length
              ? h('div', { 'class': 'tour-br-feed u-dim' }, 'Losers from ' + feederNames.join(' and '))
              : null),
          colBody));
      });

      laneEl.appendChild(cols);
      bodyEl.appendChild(laneEl);

      /* connectors, measured from the real boxes so they can never lie */
      var pairs = [];
      nodes.forEach(function (n) {
        if (n.lane !== lane.key) { return; }
        [n.series.teamA, n.series.teamB].forEach(function (k) {
          var prev = previousSeries(nodes, k, n.stage);
          if (!prev || prev.lane !== lane.key) { return; }
          if (!elements[prev.id] || !elements[n.id]) { return; }
          pairs.push({
            from: elements[prev.id],
            to: elements[n.id],
            kind: prev.series.winner === k ? 'win' : 'drop'
          });
        });
      });
      attachLinkLayer(cols, pairs);
    });

    /* ---- grand final ---- */
    if (gf && gf.teamA) {
      var gfScore = scoreParts(gf.score);
      var routes = [gf.teamA, gf.teamB].map(function (k) {
        var prev = previousSeries(nodes, k, STAGE_ORDER.length + 1);
        if (!prev) { return null; }
        var sp = scoreParts(prev.series.score);
        var own = prev.series.teamA === k ? sp[0] + '-' + sp[1] : sp[1] + '-' + sp[0];
        var opp = prev.series.teamA === k ? prev.series.teamB : prev.series.teamA;
        return { key: k, round: prev.round.round, score: own, opponent: opp };
      }).filter(Boolean);

      bodyEl.appendChild(h('section', { 'class': 'tour-lane tour-lane--final' },
        h('div', { 'class': 'tour-lane-head' },
          h('h3', { 'class': 'tour-lane-title' }, gf.round),
          h('span', { 'class': 'tour-lane-sub u-dim' }, gf.seriesLength + ', ' + gf.venue)),
        h('div', { 'class': 'tour-gf', 'data-testid': 'card-match' },
          h('div', { 'class': 'tour-gf-side', 'data-testid': 'home-team', 'data-team-id': gf.teamA },
            Hub.teamCrest(gf.teamA, 'lg'),
            h('span', { 'class': 'tour-gf-name u-truncate' }, tname(gf.teamA))),
          h('div', { 'class': 'tour-gf-mid' },
            h('div', { 'class': 'tour-gf-score score' },
              h('span', null, gfScore[0]),
              h('span', { 'class': 'tour-gf-dash' }, '-'),
              h('span', null, gfScore[1])),
            h('div', { 'class': 'tour-gf-state' },
              h('span', { 'class': 'tour-pulse', 'aria-hidden': 'true' }),
              'Game ' + gf.game + ' in progress'),
            h('div', { 'class': 'tour-gf-date u-dim' }, fmt.date(gf.date))),
          h('div', { 'class': 'tour-gf-side tour-gf-side--right', 'data-testid': 'away-team', 'data-team-id': gf.teamB },
            h('span', { 'class': 'tour-gf-name u-truncate' }, tname(gf.teamB)),
            Hub.teamCrest(gf.teamB, 'lg'))),
        routes.length
          ? h('div', { 'class': 'tour-gf-routes' }, routes.map(function (r) {
            return h('div', { 'class': 'tour-gf-route u-dim' },
              h('span', { 'class': 'tour-gf-route-team' }, tname(r.key)),
              ' won the ' + r.round + ' ' + r.score + ' against ' + tname(r.opponent));
          }))
          : null));
    }

    card.appendChild(bodyEl);
    card.appendChild(h('div', { 'class': 'card-footer tour-legend' },
      h('span', { 'class': 'tour-legend-item' }, h('span', { 'class': 'tour-legend-line is-win', 'aria-hidden': 'true' }), 'winner advances'),
      h('span', { 'class': 'tour-legend-item' }, h('span', { 'class': 'tour-out tour-legend-out' }, 'TAG'), 'that team is eliminated from the event'),
      h('span', { 'class': 'tour-legend-item' }, h('span', { 'class': 'chip chip--live' }, 'Live'), 'series in progress'),
      h('p', { 'class': 'tour-note u-dim' }, 'Teams that dropped from the Upper Bracket enter where each Lower Bracket column says they do. Connector lines are drawn between series inside the same bracket.')));

    mount.appendChild(card);
  });

  /* SVG connector layer, measured from the live boxes and redrawn on resize */
  function attachLinkLayer(container, pairs) {
    if (!pairs.length) { return; }
    var layer = Hub.svg('svg', {
      'class': 'tour-br-links', 'aria-hidden': 'true', focusable: 'false',
      preserveAspectRatio: 'none'
    });
    container.insertBefore(layer, container.firstChild);

    function round1(n) { return Math.round(n * 10) / 10; }

    onLayout(container, function () {
      var base = container.getBoundingClientRect();
      if (!base.width || !base.height) { return; }
      var w = Math.round(base.width);
      var hgt = Math.round(base.height);
      /* viewBox only. The box is sized to the container by tournament.css, so
         a measurement taken before a resize can never leave a layer wider than
         its column grid and push the whole page sideways. With
         preserveAspectRatio="none" a stale viewBox only scales the lines until
         the next redraw. */
      layer.setAttribute('viewBox', '0 0 ' + w + ' ' + hgt);
      while (layer.firstChild) { layer.removeChild(layer.firstChild); }
      pairs.forEach(function (p) {
        var a = p.from.getBoundingClientRect();
        var b = p.to.getBoundingClientRect();
        var x1 = a.right - base.left;
        var y1 = a.top - base.top + a.height / 2;
        var x2 = b.left - base.left;
        var y2 = b.top - base.top + b.height / 2;
        if (x2 - x1 < 4) { return; }
        var mx = x1 + (x2 - x1) / 2;
        var d = 'M' + round1(x1) + ' ' + round1(y1) +
          'H' + round1(mx) + 'V' + round1(y2) + 'H' + round1(x2);
        layer.appendChild(Hub.svg('path', { d: d, 'class': 'tour-br-link is-' + p.kind, fill: 'none' }));
      });
    });
  }

  /* ============================================================
     3. m-schedule  (Schedule tab)
     ============================================================ */

  function matchRow(opts) {
    var s = opts.series;
    var sp = scoreParts(s.score);
    var live = !s.winner;
    var aWon = s.winner === s.teamA;
    var bWon = s.winner === s.teamB;

    var timeCell = h('td', { 'class': 'tour-c-when' },
      h('span', { 'class': 'tour-when-date' }, fmt.date(s.date, 'short')),
      opts.time ? h('span', { 'class': 'tour-when-time u-dim u-tnum' }, opts.time) : null,
      opts.roundLabel ? h('span', { 'class': 'tour-when-round u-dim' }, opts.roundLabel) : null);

    return h('tr', { 'class': 'tour-match' + (live ? ' is-live' : ''), 'data-testid': 'match-row' },
      timeCell,
      h('td', { 'class': 'col-mid tour-c-bo' }, h('span', { 'class': 'chip chip--outline' }, s.seriesLength)),
      h('td', { 'class': 'tour-c-home' + (aWon ? ' is-win' : '') }, teamInline(s.teamA, { rtl: true })),
      h('td', { 'class': 'col-mid tour-c-score' },
        h('span', { 'class': 'tour-score' + (live ? ' is-live' : '') },
          h('span', { 'class': aWon ? 'is-win' : '' }, sp[0]),
          h('span', { 'class': 'tour-score-dash' }, '-'),
          h('span', { 'class': bWon ? 'is-win' : '' }, sp[1]))),
      h('td', { 'class': 'tour-c-away' + (bWon ? ' is-win' : '') }, teamInline(s.teamB)),
      h('td', { 'class': 'col-mid tour-c-status' },
        live
          ? h('span', { 'class': 'chip chip--live' }, 'Live')
          : h('span', { 'class': 'tour-final u-dim' }, 'Final')));
  }

  function scheduleTable(rows) {
    return h('div', { 'class': 'scroll-x' },
      h('table', { 'class': 'hub-table hub-table--compact tour-sched-table' },
        h('thead', null, h('tr', null,
          h('th', { scope: 'col', 'class': 'tour-c-when' }, 'When'),
          h('th', { scope: 'col', 'class': 'col-mid tour-c-bo' }, 'Format'),
          h('th', { scope: 'col', 'class': 'u-right tour-c-home' }, 'Team'),
          h('th', { scope: 'col', 'class': 'col-mid tour-c-score' }, 'Score'),
          h('th', { scope: 'col', 'class': 'tour-c-away' }, 'Team'),
          h('th', { scope: 'col', 'class': 'col-mid tour-c-status' }, 'Status'))),
        h('tbody', null, rows)));
  }

  Hub.register('m-schedule', function (mount, ctx) {
    var TI = ctx.TI2026;
    var GF5 = ctx.GF5 || {};
    var gs = TI.groupStage || {};
    var er = TI.eliminationRound || {};
    var br = TI.bracket || {};
    var phaseMeta = ((TI.event || {}).format || {}).phases || [];
    var wrap = h('div', { 'class': 'tour-sched', 'data-testid': 'schedule' });

    function phaseCard(opts) {
      var card = h('section', { 'class': 'card tour-card tour-phase', 'data-testid': 'competition-info' });
      card.appendChild(h('div', { 'class': 'card-header' },
        h('div', { 'class': 'titles' },
          h('h2', { 'class': 'title' }, opts.title),
          h('div', { 'class': 'subtitle' }, opts.sub)),
        opts.chip ? h('div', { 'class': 'action' }, opts.chip) : null));
      card.appendChild(h('div', { 'class': 'card-body tour-phase-summary' },
        h('span', { 'class': 'tour-flow' },
          h('strong', { 'class': 'u-tnum' }, opts.teamsIn),
          h('span', { 'class': 'u-dim' }, ' teams in')),
        opts.flow.map(function (f) {
          return h('span', { 'class': 'tour-flow' },
            h('span', { 'class': 'tour-flow-dot is-' + f.kind, 'aria-hidden': 'true' }),
            h('strong', { 'class': 'u-tnum' }, f.count),
            h('span', { 'class': 'u-dim' }, ' ' + f.label));
        }),
        opts.rule ? h('p', { 'class': 'tour-note u-dim' }, opts.rule) : null));
      return card;
    }

    function groupBlock(label, sub, rows, live) {
      return h('div', { 'class': 'card-body tour-day' + (live ? ' is-live' : '') },
        h('div', { 'class': 'tour-day-head' },
          h('h3', { 'class': 'tour-day-title' }, label),
          sub ? h('span', { 'class': 'tour-day-sub u-dim' }, sub) : null,
          live ? h('span', { 'class': 'chip chip--live' }, 'Live now') : null),
        scheduleTable(rows));
    }

    /* ---- Group Stage ---- */
    var gsMeta = phaseMeta[0] || {};
    var zoneCounts = {};
    (gs.standings || []).forEach(function (r) { zoneCounts[r.outcome] = (zoneCounts[r.outcome] || 0) + 1; });

    var gsCard = phaseCard({
      title: gsMeta.name || 'Group Stage',
      /* roundsSpan, not the stored phase window: gs.dates runs to 16 Aug
         because that is Elimination Round day, while the five Swiss rounds
         listed under this card run 13 to 15 Aug (verifier I02) */
      sub: gs.system + ', ' + gs.roundsCount + ' rounds of ' + gs.seriesLength + ', ' + roundsSpan(gs),
      teamsIn: gsMeta.teams || (gs.standings || []).length,
      flow: [
        { kind: 'up', count: zoneCounts.main_event || 0, label: 'straight to the Main Event' },
        { kind: 'mid', count: zoneCounts.elimination_round || 0, label: 'to the Elimination Round' },
        { kind: 'out', count: zoneCounts.eliminated || 0, label: 'eliminated' }
      ],
      rule: gsMeta.advancement
    });
    (gs.rounds || []).forEach(function (round) {
      var rows = (round.series || []).map(function (s) { return matchRow({ series: s }); });
      gsCard.appendChild(groupBlock(round.round, fmt.date(round.date) + ', ' + rows.length + ' series', rows, false));
    });
    wrap.appendChild(gsCard);

    /* ---- Elimination Round ---- */
    var erMeta = phaseMeta[1] || {};
    var erCard = phaseCard({
      title: erMeta.name || 'Elimination Round',
      sub: (erMeta.type || '') + ', ' + er.seriesLength + ', ' + fmt.date(er.date),
      teamsIn: (er.series || []).length * 2,
      flow: [
        { kind: 'up', count: (er.advanced || []).length, label: 'advanced to the Main Event' },
        { kind: 'out', count: (er.eliminated || []).length, label: 'eliminated' }
      ],
      rule: er.pairingRule
    });
    erCard.appendChild(groupBlock(fmt.date(er.date, 'weekday'), (er.series || []).length + ' series', (er.series || []).map(function (s) {
      return matchRow({ series: s });
    }), false));
    wrap.appendChild(erCard);

    /* ---- Main Event, grouped by day ---- */
    var meMeta = phaseMeta[2] || {};
    var mainNodes = buildBracketModel(br);
    var eliminatedSoFar = 0;
    var stillIn = 0;
    mainNodes.forEach(function (n) {
      if (n.series.eliminated) { eliminatedSoFar += 1; }
      if (!n.series.winner) { stillIn += 2; }
    });

    var days = {};
    var dayOrder = [];
    mainNodes.forEach(function (n) {
      var d = n.series.date;
      if (!days[d]) { days[d] = []; dayOrder.push(d); }
      days[d].push(n);
    });
    dayOrder.sort();

    var meCard = phaseCard({
      title: meMeta.name || 'Main Event',
      sub: (meMeta.type || br.format) + ', ' + dateRange(br.dates),
      teamsIn: meMeta.teams || 8,
      flow: [
        { kind: 'out', count: eliminatedSoFar, label: 'eliminated so far' },
        { kind: 'live', count: stillIn, label: 'still playing' }
      ],
      rule: meMeta.advancement
    });

    dayOrder.forEach(function (d) {
      var nodesForDay = days[d];
      var hasLive = nodesForDay.some(function (n) { return !n.series.winner; });
      var isToday = GF5.date && d === GF5.date;
      var rows = nodesForDay.map(function (n) {
        var isGf = n.lane === 'final';
        return matchRow({
          series: n.series,
          roundLabel: n.round.shortRound || n.round.round,
          time: isGf && GF5.startTimeShanghai ? GF5.startTimeShanghai + ' local' : null
        });
      });
      meCard.appendChild(groupBlock(
        (isToday ? 'Today, ' : '') + fmt.date(d, 'weekday'),
        nodesForDay.length + ' series',
        rows,
        hasLive));
    });

    if (GF5.live) {
      meCard.appendChild(h('div', { 'class': 'card-footer tour-sched-foot' },
        h('span', { 'class': 'u-dim' },
          'Grand Final in progress. ' + GF5.seriesNote),
        h('button', {
          type: 'button', 'class': 'btn btn-sm btn-primary',
          onclick: function () { Hub.tabs.activate('overview', { scroll: true }); }
        }, 'Open the live panel', chevron())));
    }
    wrap.appendChild(meCard);

    mount.appendChild(wrap);
  });

  /* ============================================================
     4. m-standings  (Standings tab)
     ============================================================ */

  Hub.register('m-standings', function (mount, ctx) {
    var TI = ctx.TI2026;
    var gs = TI.groupStage || {};
    var er = TI.eliminationRound || {};
    var rounds = gs.rounds || [];
    var wrap = h('div', { 'class': 'tour-standings', 'data-testid': 'standings' });

    /* ---- Swiss table ---- */
    var card = h('section', { 'class': 'card tour-card', 'data-testid': 'standings-table' });
    card.appendChild(h('div', { 'class': 'card-header' },
      h('div', { 'class': 'titles' },
        h('h2', { 'class': 'title' }, 'Group Stage, Swiss standings'),
        h('div', { 'class': 'subtitle' },
          (gs.standings || []).length + ' teams, ' + gs.roundsCount + ' rounds of ' + gs.seriesLength + ', ' + roundsSpan(gs)))));

    var head = h('tr', null,
      h('th', { scope: 'col', 'class': 'col-num tour-c-rank' }, '#'),
      h('th', { scope: 'col' }, 'Team'),
      h('th', { scope: 'col', 'class': 'col-num tour-c-wl' }, 'W-L'),
      h('th', { scope: 'col', 'class': 'col-num tour-c-gr' }, 'Games'));
    rounds.forEach(function (r) {
      head.appendChild(h('th', { scope: 'col', 'class': 'col-mid tour-c-round' },
        h('span', { 'class': 'tour-round-h' }, 'R' + String(r.round).replace(/[^0-9]/g, '')),
        h('span', { 'class': 'tour-round-d u-dim' }, fmt.date(r.date, 'short'))));
    });

    var table = h('table', { 'class': 'hub-table tour-standings-table' },
      h('caption', null, 'Final Swiss standings. Each round cell shows the opponent tag and the series score for the team in that row.'),
      h('thead', null, head));

    var currentOutcome = null;
    var tbody = null;
    var zoneTotals = {};
    (gs.standings || []).forEach(function (r) { zoneTotals[r.outcome] = (zoneTotals[r.outcome] || 0) + 1; });

    (gs.standings || []).forEach(function (row) {
      if (row.outcome !== currentOutcome) {
        currentOutcome = row.outcome;
        tbody = h('tbody', { 'class': 'tour-zone-group tour-zone--' + row.outcome });
        tbody.appendChild(h('tr', { 'class': 'tour-zone-row' },
          h('th', { colspan: String(4 + rounds.length), scope: 'colgroup' },
            h('span', { 'class': 'tour-zone-dot' }),
            h('span', { 'class': 'tour-zone-label' }, row.outcomeLabel),
            h('span', { 'class': 'tour-zone-count u-dim' }, zoneTotals[row.outcome] + ' teams'))));
        table.appendChild(tbody);
      }

      var team = Hub.team(row.teamKey) || {};
      var alive = String(team.placement || '') === 'grand final';
      var byRound = {};
      ((team.groupStage && team.groupStage.roundResults) || []).forEach(function (r) { byRound[r.round] = r; });

      var tr = h('tr', { 'class': 'tour-st-row' + (alive ? ' is-alive' : ''), 'data-team-id': row.teamKey },
        h('td', { 'class': 'col-num tour-c-rank' }, h('span', { 'class': 'tour-rank' }, row.rank)),
        h('td', { 'class': 'cell-strong' },
          h('span', { 'class': 'tour-snap-team' },
            teamInline(row.teamKey),
            h('span', { 'class': 'tour-tag u-dim' }, ttag(row.teamKey)))),
        h('td', { 'class': 'col-num tour-c-wl' }, h('span', { 'class': 'tour-wl u-tnum' }, row.seriesRecord)),
        h('td', { 'class': 'col-num tour-c-gr u-dim' }, gameRecord(gs, row.teamKey, row).text));

      rounds.forEach(function (r) {
        var res = byRound[r.round];
        if (!res) {
          tr.appendChild(h('td', { 'class': 'col-mid tour-c-round' },
            h('span', { 'class': 'tour-rr is-none' },
              h('span', { 'class': 'tour-rr-op' }, 'no series'))));
          return;
        }
        tr.appendChild(h('td', { 'class': 'col-mid tour-c-round' },
          h('span', { 'class': 'tour-rr is-' + String(res.result).toLowerCase() },
            h('span', { 'class': 'tour-rr-op' }, ttag(res.opponent)),
            h('span', { 'class': 'tour-rr-score u-tnum' }, res.result + ' ' + res.score))));
      });

      tbody.appendChild(tr);
    });

    var stScroll = h('div', { 'class': 'scroll-x tour-scroll' }, table);
    var stBody = h('div', { 'class': 'card-body card-pad-0' }, stScroll);
    card.appendChild(stBody);
    scrollHint(stScroll, 'Scroll sideways for every round');

    card.appendChild(h('div', { 'class': 'card-footer tour-legend' },
      h('span', { 'class': 'tour-legend-item' }, h('span', { 'class': 'tour-zone-dot tour-zone--main_event' }), 'top 3, straight to the Main Event'),
      h('span', { 'class': 'tour-legend-item' }, h('span', { 'class': 'tour-zone-dot tour-zone--elimination_round' }), 'ranks 4 to 13, Elimination Round'),
      h('span', { 'class': 'tour-legend-item' }, h('span', { 'class': 'tour-zone-dot tour-zone--eliminated' }), 'bottom 3, out of the event'),
      h('span', { 'class': 'tour-legend-item' }, h('span', { 'class': 'tour-rr is-w' }, h('span', { 'class': 'tour-rr-op' }, ttag('spirit')), h('span', { 'class': 'tour-rr-score' }, 'W 2-0')), 'opponent and series score'),
      h('p', { 'class': 'tour-note u-dim' }, DERIVED_NOTE),
      gs.tiebreakNote ? h('p', { 'class': 'tour-note u-dim' }, gs.tiebreakNote) : null));
    wrap.appendChild(card);

    /* ---- Elimination Round ---- */
    var erCard = h('section', { 'class': 'card tour-card', 'data-testid': 'elimination-round' });
    erCard.appendChild(h('div', { 'class': 'card-header' },
      h('div', { 'class': 'titles' },
        h('h2', { 'class': 'title' }, 'Elimination Round'),
        h('div', { 'class': 'subtitle' },
          fmt.date(er.date, 'weekday') + ', ' + (er.series || []).length + ' series of ' + er.seriesLength))));

    erCard.appendChild(h('div', { 'class': 'card-body' },
      scheduleTable((er.series || []).map(function (s) { return matchRow({ series: s }); }))));

    erCard.appendChild(h('div', { 'class': 'card-body tour-advance' },
      h('div', { 'class': 'tour-advance-col' },
        h('div', { 'class': 'u-label tour-advance-title tour-advance-title--in' }, 'Advanced to the Main Event'),
        h('div', { 'class': 'tour-advance-list' }, (er.advanced || []).map(function (k) {
          return h('span', { 'class': 'tour-adv-team is-in' }, teamInline(k));
        }))),
      h('div', { 'class': 'tour-advance-col' },
        h('div', { 'class': 'u-label tour-advance-title tour-advance-title--out' }, 'Eliminated'),
        h('div', { 'class': 'tour-advance-list' }, (er.eliminated || []).map(function (k) {
          return h('span', { 'class': 'tour-adv-team is-out' }, teamInline(k));
        })))));

    if (er.pairingRule) {
      erCard.appendChild(h('div', { 'class': 'card-footer' }, h('p', { 'class': 'tour-note u-dim' }, er.pairingRule)));
    }
    wrap.appendChild(erCard);

    mount.appendChild(wrap);
  });

  /* ============================================================
     5. m-teams  (Teams tab)
     ============================================================ */

  function rosterRow(player, teamKey) {
    var link = Hub.link.player(player.rdyPlayerId);
    var nameNode = Hub.extLink(link, { 'class': 'tour-pl-handle' }, player.handle);
    return h('div', { 'class': 'tour-pl', 'data-testid': 'player-card', 'data-player-id': player.rdyPlayerId || player.handle },
      Hub.avatar(player, teamKey, 'sm'),
      h('span', { 'class': 'tour-pl-main' },
        nameNode,
        player.realName ? h('span', { 'class': 'tour-pl-real u-dim u-truncate' }, player.realName) : null),
      player.pos ? h('span', { 'class': 'tour-pos' }, 'Pos ' + player.pos) : null);
  }

  function routeRow(entry) {
    var won = entry.result === 'W';
    var live = entry.result === 'live';
    return h('div', { 'class': 'tour-route' + (won ? ' is-win' : '') + (live ? ' is-live' : '') },
      /* no u-truncate: these two wrap now, they used to lose their tail
         behind an ellipsis in the narrow Teams grid (verifier I05) */
      h('span', { 'class': 'tour-route-round' }, entry.shortRound || entry.round),
      h('span', { 'class': 'tour-route-op' }, 'vs ' + tname(entry.opponent)),
      h('span', { 'class': 'tour-route-score u-tnum' }, entry.score),
      h('span', { 'class': 'tour-route-flag' }, live ? 'Live' : entry.result));
  }

  Hub.register('m-teams', function (mount, ctx) {
    var TI = ctx.TI2026;
    var ev = TI.event || {};
    var fmtx = ev.format || {};
    var teams = (TI.teams || []).slice();

    var LEAD = { spirit: 0, vision: 1 };
    teams.sort(function (a, b) {
      var la = LEAD[a.key] === undefined ? 9 : LEAD[a.key];
      var lb = LEAD[b.key] === undefined ? 9 : LEAD[b.key];
      if (la !== lb) { return la - lb; }
      var d = placementOrder(a) - placementOrder(b);
      if (d !== 0) { return d; }
      var ra = (a.groupStage && a.groupStage.rank) || 99;
      var rb = (b.groupStage && b.groupStage.rank) || 99;
      return ra - rb;
    });

    var regions = {};
    teams.forEach(function (t) { if (t.region) { regions[t.region] = true; } });

    var wrap = h('div', { 'class': 'tour-teams', 'data-testid': 'teams' });

    wrap.appendChild(h('section', { 'class': 'card tour-card tour-teams-head' },
      h('div', { 'class': 'card-header' },
        h('div', { 'class': 'titles' },
          h('h2', { 'class': 'title' }, 'The 16 teams'),
          h('div', { 'class': 'subtitle' },
            Object.keys(regions).length + ' regions, ' + fmtx.directInvites + ' direct invites and ' +
            fmtx.qualifierSlots + ' qualifier slots'))),
      h('div', { 'class': 'card-body tour-teams-note' },
        h('p', { 'class': 'tour-note u-dim' },
          'Status is as of the frozen moment, Grand Final game ' + ((ctx.GF5 || {}).game || '') +
          '. Roster positions are shown where the data has them, and outside the two finalists they are inferred rather than official. A player with no photo on file renders as initials on the team colour.'))));

    var grid = h('div', { 'class': 'tour-team-grid' });

    teams.forEach(function (t, i) {
      var alive = String(t.placement || '') === 'grand final';
      var place = placementText(t.placement);
      var rosterId = 'tour-roster-' + t.key;
      var open = alive;

      var body = h('div', { 'class': 'tour-team-body', id: rosterId, hidden: !open });

      /* roster */
      body.appendChild(h('div', { 'class': 'tour-team-sec' },
        h('div', { 'class': 'u-label tour-team-sec-title' }, 'Roster'),
        h('div', { 'class': 'tour-roster' }, (t.roster || []).map(function (p) { return rosterRow(p, t.key); })),
        t.coach
          ? h('div', { 'class': 'tour-coach' },
            h('span', { 'class': 'tour-coach-label u-dim' }, 'Coach'),
            h('span', { 'class': 'tour-coach-name' }, t.coach.handle),
            t.coach.realName ? h('span', { 'class': 'tour-pl-real u-dim' }, t.coach.realName) : null)
          : null));

      /* run through the event */
      var runRows = [];
      if (t.groupStage) {
        runRows.push(h('div', { 'class': 'tour-route is-info' },
          h('span', { 'class': 'tour-route-round' }, 'Group Stage'),
          h('span', { 'class': 'tour-route-op' }, ordinal(t.groupStage.rank) + ' of ' + teams.length),
          h('span', { 'class': 'tour-route-score u-tnum' }, t.groupStage.seriesRecord),
          h('span', { 'class': 'tour-route-flag u-dim' },
            gameRecord(TI.groupStage || {}, t.key, t.groupStage).text)));
      }
      if (t.eliminationRound) {
        runRows.push(routeRow({
          shortRound: 'Elimination Round',
          opponent: t.eliminationRound.opponent,
          score: t.eliminationRound.score,
          result: t.eliminationRound.result
        }));
      }
      (t.mainEventSeries || []).forEach(function (s) { runRows.push(routeRow(s)); });

      body.appendChild(h('div', { 'class': 'tour-team-sec' },
        h('div', { 'class': 'u-label tour-team-sec-title' }, 'Run through the event'),
        h('div', { 'class': 'tour-routes' }, runRows)));

      /* No narrative rule, round 2 (audit N-R2-03/04/05). teams[].notes is now
         a computed-only field: build_ti2026.py generates it from an allowlist
         of four rules over the event's own record and emits nothing for every
         other team, so a note can no longer carry biography, reported facts or
         anything from after the freeze. The notesSafeBeforeDecider /
         notesPreDeciderAngle pair that used to guard this line is gone with
         the prose it guarded. */
      var note = t.notes;
      if (note) {
        body.appendChild(h('div', { 'class': 'tour-team-sec' },
          h('div', { 'class': 'u-label tour-team-sec-title' }, 'Notes'),
          h('p', { 'class': 'tour-team-note' }, note)));
      }

      var teamLink = Hub.link.team(t.rdyTeamId);
      if (teamLink) {
        body.appendChild(h('div', { 'class': 'tour-team-sec' },
          Hub.extLink(teamLink, { 'class': 'tour-team-link' }, tname(t.key) + ' on rdy.gg', chevron())));
      }

      var toggle = h('button', {
        type: 'button',
        'class': 'tour-team-head-btn',
        'aria-expanded': open ? 'true' : 'false',
        'aria-controls': rosterId
      },
        Hub.teamCrest(t.key, 'lg'),
        h('span', { 'class': 'tour-team-id' },
          h('span', { 'class': 'tour-team-name-lg u-truncate' }, t.displayName),
          h('span', { 'class': 'tour-team-sub u-dim u-truncate' },
            ttag(t.key) + ' · ' + t.region)),
        h('span', { 'class': 'tour-team-head-right' }, chevron()));

      toggle.addEventListener('click', function () {
        var isOpen = toggle.getAttribute('aria-expanded') === 'true';
        toggle.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
        body.hidden = isOpen;
      });

      var card = h('article', {
        'class': 'card tour-card tour-team-card' + (alive ? ' is-alive' : ''),
        'data-testid': 'event-card',
        'data-team-id': t.key,
        style: { '--i': String(Math.min(i, 11)) }
      },
        toggle,
        h('div', { 'class': 'tour-team-meta' },
          alive
            ? h('span', { 'class': 'chip chip--live' }, 'Live')
            : (place ? h('span', { 'class': 'chip chip--gold' }, place) : null),
          h('span', { 'class': 'chip chip--outline tour-qual' }, t.qualification),
          h('span', { 'class': 'tour-team-status' + (alive ? ' u-gold' : ' u-dim') }, t.status),
          t.nameNote ? h('span', { 'class': 'tour-team-alias u-dim' }, t.nameNote) : null),
        body);

      grid.appendChild(card);
    });

    wrap.appendChild(grid);
    mount.appendChild(wrap);
  });

})();
