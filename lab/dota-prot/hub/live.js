/* ==========================================================================
   hub/live.js - Overview live surfaces for the TI 2026 Hub prototype.
   Mounts: m-live, m-gold-graph, m-objectives, m-scoreboard, m-events,
           m-draft-live and the Drafts tab board (m-drafts).
   Everything is read from window.GF5 (the frozen Game 5 snapshot) and
   window.TI2026 (the tournament dossier). No literals, no results.
   ========================================================================== */
(function () {
  'use strict';

  if (!window.Hub) return;

  var h = Hub.h;
  var svg = Hub.svg;
  var fmt = Hub.fmt;

  /* ---------------------------------------------------------------- icons */

  var ICON = {
    clock: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 5h-2v6l5 3 1-1.7-4-2.3V7z',
    play: 'M8 5v14l11-7L8 5z',
    chart: 'M4 19h16v2H4v-2zm2-7h3v6H6v-6zm5-6h3v12h-3V6zm5 3h3v9h-3V9z',
    tower: 'M6 21V9l2-2V3h3v3h2V3h3v4l2 2v12H6zm3-2h6v-8l-1.5-1.5h-3L9 11v8z',
    shield: 'M12 2l8 3v6c0 5-3.4 9.4-8 11-4.6-1.6-8-6-8-11V5l8-3z',
    gem: 'M6 3h12l3 6-9 12L3 9l3-6z',
    swords: 'M4 3l7 7-1.6 1.6L2.5 4.7 4 3zm16 0l1.5 1.7-6.9 6.9L13 10l7-7zM8 14l2 2-5 5H3v-2l5-5zm8 0l5 5v2h-2l-5-5 2-2z',
    drop: 'M12 2s6 7 6 11a6 6 0 1 1-12 0c0-4 6-11 6-11z',
    star: 'M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.3 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8L12 2z'
  };

  function ico(pathD, cls) { return Hub.icon(pathD, { className: cls || '' }); }

  /* -------------------------------------------------------------- helpers */

  /* card(opts, ...children) -> .card with a standard header */
  function card(opts, children) {
    var head = null;
    if (opts.title) {
      head = h('div', { 'class': 'card-header' },
        h('div', { 'class': 'titles' },
          h('h2', { 'class': 'title' }, opts.title),
          opts.sub ? h('div', { 'class': 'subtitle' }, opts.sub) : null),
        opts.action ? h('div', { 'class': 'action' }, opts.action) : null);
    }
    var attrs = {
      'class': 'card live-fade' + (opts.cls ? ' ' + opts.cls : ''),
      'data-testid': opts.testid || null
    };
    return h('div', attrs, head, children);
  }

  function sideLabel(side) { return side === 'radiant' ? 'Radiant' : 'Dire'; }

  /* One short code per team, stored uppercase in the data. Never shorten a
     team name in a component: every badge, bar end and tag reads the same
     three letters. */
  function abbr(keyOrTeam) {
    var t = (keyOrTeam && keyOrTeam.key) ? Hub.team(keyOrTeam.key) : Hub.team(keyOrTeam);
    if (t && t.abbr) { return t.abbr; }
    if (keyOrTeam && keyOrTeam.abbr) { return keyOrTeam.abbr; }
    return Hub.initials(t ? t.name : keyOrTeam, 3);
  }

  /* The gold bar and the gold chart draw the same number, so they have to
     agree on the axis. One helper, one envelope. */
  function goldNiceMax(series) {
    var maxAbs = 0;
    (series || []).forEach(function (d) { maxAbs = Math.max(maxAbs, Math.abs(d.value)); });
    return Math.max(2000, Math.ceil((maxAbs * 1.12) / 1000) * 1000);
  }

  function sideChip(side) {
    return h('span', { 'class': 'chip chip--' + side }, sideLabel(side));
  }

  /* GF5 side -> the tournament team record */
  function teamOf(GF5, side) { return GF5.teams[side]; }

  /* roster row from TI2026, for the photo crop and the rdy.gg player id */
  function rosterRow(TI, teamKey, handle) {
    var t = Hub.team(teamKey);
    if (!t || !t.roster) return null;
    for (var i = 0; i < t.roster.length; i++) {
      if (t.roster[i].handle === handle) return t.roster[i];
    }
    return null;
  }

  function playerFace(TI, p) {
    var r = rosterRow(TI, p.teamKey, p.handle);
    return {
      handle: p.handle,
      photo: p.photo || (r && r.photo) || null,
      facePosition: r ? r.facePosition : null
    };
  }

  function playerLink(TI, p, cls) {
    var r = rosterRow(TI, p.teamKey, p.handle);
    var id = r ? r.rdyPlayerId : null;
    return Hub.extLink(Hub.link.player(id), { 'class': cls || null }, p.handle);
  }

  /* a real <a> for a same-folder prototype page */
  function pageLink(href, cls, children) {
    return h('a', { href: href, 'class': cls || null }, children);
  }

  /* grow an element after paint, so the bar animates in */
  function growLater(el, prop, value) {
    if (window.requestAnimationFrame) {
      window.requestAnimationFrame(function () {
        window.requestAnimationFrame(function () { el.style.setProperty(prop, value); });
      });
    } else { el.style.setProperty(prop, value); }
  }

  function sortedStrip(GF5, side) {
    return GF5.heroStrip.filter(function (x) { return x.team === side; })
      .sort(function (a, b) { return a.pickOrder - b.pickOrder; });
  }

  function playersOf(GF5, side) {
    return GF5.players.filter(function (p) { return p.team === side; })
      .sort(function (a, b) { return (a.pos || 9) - (b.pos || 9); });
  }

  /* ======================================================================
     1. m-live : the live match card
     ====================================================================== */

  Hub.register('m-live', function (mount, ctx) {
    var GF5 = ctx.GF5, TI = ctx.TI2026;
    var gf = TI.grandFinal;
    var radiant = teamOf(GF5, 'radiant');
    var dire = teamOf(GF5, 'dire');
    var adv = GF5.goldAdvantage[GF5.goldAdvantage.length - 1];

    /* --- top strip: context chips, live clock, actions --- */
    var chips = h('div', { 'class': 'cluster live-ctx' },
      h('span', { 'class': 'chip chip--gold' }, GF5.stage),
      h('span', { 'class': 'chip chip--outline' }, 'Best of ' + GF5.format.replace(/^Bo/, '')),
      h('span', { 'class': 'chip chip--outline' }, 'Game ' + GF5.game),
      h('span', { 'class': 'chip chip--live' },
        h('span', { 'class': 'live-dot', 'aria-hidden': 'true' }), 'Live'),
      h('span', { 'class': 'live-clock clock' }, GF5.frozenAt.clock),
      h('span', { 'class': 'live-snapshot-tag' }, 'snapshot'));

    var actions = h('div', { 'class': 'cluster live-actions' },
      pageLink('TI2026_Match_Analysis_rdy_gg.html', 'btn btn-sm',
        [ico(ICON.chart), 'Match analysis']),
      Hub.extLink('https://www.twitch.tv/dota2ti', { 'class': 'btn btn-sm btn-primary' },
        ico(ICON.play), 'Watch on Twitch'));

    var topRow = h('div', { 'class': 'live-top' }, chips, h('div', { 'class': 'spacer' }), actions);

    /* --- team column --- */
    function teamCol(side) {
      var t = teamOf(GF5, side);
      var meta = Hub.team(t.key);
      return h('div', {
        'class': 'live-team live-team--' + side,
        'data-testid': side === 'radiant' ? 'home-team' : 'away-team',
        'data-team-id': t.openDotaId || null
      },
        h('div', { 'class': 'live-team-crest' }, Hub.teamCrest(t.key, 'lg')),
        h('div', { 'class': 'live-team-id' },
          h('div', { 'class': 'live-team-name' },
            Hub.extLink(Hub.link.team(meta && meta.rdyTeamId), null, t.name)),
          h('div', { 'class': 'cluster-sm live-team-meta' },
            sideChip(side),
            h('span', { 'class': 'u-dim rdy-par-7' }, meta ? meta.region : ''))));
    }

    /* --- series score and per game pips --- */
    var scoreBlock = h('div', { 'class': 'live-score' },
      h('div', { 'class': 'live-score-line' },
        h('span', { 'class': 'score live-score-num live-score-num--radiant' }, String(GF5.seriesScore[radiant.key])),
        h('span', { 'class': 'live-score-sep' }, ':'),
        h('span', { 'class': 'score live-score-num live-score-num--dire' }, String(GF5.seriesScore[dire.key]))),
      h('div', { 'class': 'live-score-cap u-dim rdy-par-7' }, 'Series, first to 3'));

    var pips = h('ol', { 'class': 'live-pips' }, gf.games.map(function (g) {
      var isLive = g.status === 'live';
      var winKey = g.winner;
      var winSide = winKey ? (winKey === radiant.key ? 'radiant' : 'dire') : null;
      var wt = winKey ? Hub.team(winKey) : null;
      return h('li', {
        'class': 'live-pip' + (isLive ? ' live-pip--live' : '') + (winSide ? ' live-pip--' + winSide : '')
      },
        h('span', { 'class': 'live-pip-g rdy-subh-6' }, 'G' + g.game),
        h('span', { 'class': 'live-pip-win' }, isLive ? 'Live now' : (wt ? abbr(wt.key) : '')),
        /* Sides swap game to game, so the kills pair is printed in one fixed
           order with both tags on it (verifier I01), never as a bare pair. */
        isLive
          ? h('span', { 'class': 'live-pip-sub u-dim' }, 'decider')
          : Hub.killsPair(g.killScore, g.radiant, g.dire, { className: 'live-pip-kills' }),
        (!isLive && g.duration)
          ? h('span', { 'class': 'live-pip-dur u-dim u-tnum' }, g.duration)
          : null);
    }));

    var centre = h('div', { 'class': 'live-centre' }, scoreBlock);

    var teamsRow = h('div', { 'class': 'live-teams' }, teamCol('radiant'), centre, teamCol('dire'));
    var pipsRow = h('div', { 'class': 'live-pipsrow' },
      h('div', { 'class': 'live-pipsrow-lab rdy-subh-6 u-dim' }, 'Game by game'), pips);

    /* --- hero strips --- */
    function strip(side) {
      var rows = sortedStrip(GF5, side);
      return h('div', { 'class': 'live-strip live-strip--' + side },
        h('div', { 'class': 'live-strip-head rdy-subh-6 u-dim' },
          sideLabel(side) + ', ' + abbr(teamOf(GF5, side).key)),
        h('ul', { 'class': 'live-strip-list' }, rows.map(function (x) {
          return h('li', { 'class': 'live-strip-item' },
            h('span', { 'class': 'live-strip-art' },
              Hub.heroImg(x.hero, { side: side, alt: x.heroName }),
              h('span', { 'class': 'live-lvl' }, String(x.level))),
            h('span', { 'class': 'live-strip-hero u-truncate' }, x.heroName),
            h('span', { 'class': 'live-strip-handle u-truncate u-dim' }, x.handle));
        })));
    }

    var stripsRow = h('div', { 'class': 'live-strips' }, strip('radiant'), strip('dire'));

    /* --- diverging gold advantage bar --- */
    var SCALE = goldNiceMax(GF5.goldAdvantage);
    var lead = adv.value >= 0 ? dire : radiant;
    var leadSide = adv.value >= 0 ? 'dire' : 'radiant';
    var fillPct = Math.min(Math.abs(adv.value) / SCALE, 1) * 50;

    var fill = h('span', {
      'class': 'live-gbar-fill live-gbar-fill--' + leadSide,
      style: { width: '0%' }
    });
    growLater(fill, 'width', fillPct + '%');

    var ticks = [-SCALE, -SCALE / 2, 0, SCALE / 2, SCALE];
    var bar = h('div', { 'class': 'live-gbar', 'data-testid': 'gold-bar' },
      h('div', { 'class': 'live-gbar-heads' },
        h('div', { 'class': 'live-gbar-end' },
          h('span', { 'class': 'live-gbar-team u-radiant rdy-subh-6' }, abbr(radiant.key)),
          h('span', { 'class': 'live-gbar-num u-tnum' }, fmt.num(adv.radiant) + ' g')),
        h('div', { 'class': 'live-gbar-mid' },
          h('span', { 'class': 'live-gbar-lead u-tnum live-gbar-lead--' + leadSide },
            abbr(lead.key) + ' ' + fmt.goldSigned(Math.abs(adv.value))),
          h('span', { 'class': 'live-gbar-lead-sub u-dim' }, 'gold lead at ' + GF5.frozenAt.clock)),
        h('div', { 'class': 'live-gbar-end live-gbar-end--right' },
          h('span', { 'class': 'live-gbar-team u-dire rdy-subh-6' }, abbr(dire.key)),
          h('span', { 'class': 'live-gbar-num u-tnum' }, fmt.num(adv.dire) + ' g'))),
      h('div', { 'class': 'live-gbar-track' },
        h('span', { 'class': 'live-gbar-zero' }),
        fill),
      h('div', { 'class': 'live-gbar-axis u-dim u-tnum' }, ticks.map(function (t) {
        /* unsigned, and tinted by half, so the axis says which way it runs.
           --x places the label on the same scale the track fill uses, so the
           zero tick always lands on .live-gbar-zero */
        var half = t === 0 ? 'zero' : (t < 0 ? 'radiant' : 'dire');
        return h('span', {
          'class': 'live-gbar-tick live-gbar-tick--' + half,
          style: { '--x': (((t + SCALE) / (2 * SCALE)) * 100) + '%' }
        }, t === 0 ? 'even' : fmt.gold(Math.abs(t)));
      })),
      h('p', { 'class': 'live-gbar-callout rdy-par-6' }, GF5.nowCallout));

    mount.appendChild(card({
      cls: 'card--live live-card',
      testid: 'card-match',
      title: GF5.stage + ', game ' + GF5.game,
      sub: GF5.seriesNote + ' ' + GF5.venue + ', ' + fmt.date(GF5.date) + '.',
      action: Hub.extLink(GF5.sourceUrl, null, 'OpenDota ' + GF5.matchId)
    }, [topRow, teamsRow, pipsRow, stripsRow, bar]));
  });

  /* ======================================================================
     2. m-gold-graph : diverging area chart of the gold advantage
     ====================================================================== */

  Hub.register('m-gold-graph', function (mount, ctx) {
    var GF5 = ctx.GF5;
    var radiant = teamOf(GF5, 'radiant');
    var dire = teamOf(GF5, 'dire');
    var series = GF5.goldAdvantage;
    var last = series[series.length - 1];

    var W = 640, H = 260;
    var M = { top: 24, right: 58, bottom: 32, left: 48 };
    var plotW = W - M.left - M.right;
    var plotH = H - M.top - M.bottom;
    var zeroY = M.top + plotH / 2;

    var niceMax = goldNiceMax(series);

    var lastMinute = last.minute;
    var x = Hub.scale([0, lastMinute], [M.left, M.left + plotW]);
    var y = Hub.scale([-niceMax, niceMax], [M.top + plotH, M.top]);

    var pts = series.map(function (d) { return [x(d.minute), y(d.value)]; });
    var areaPts = pts.concat([[x(lastMinute), zeroY], [x(0), zeroY]]);

    var gfx = [];

    /* clip halves: Spirit (Dire) ahead is above the zero line, VISION below */
    var clipTop = svg('clipPath', { id: 'live-gg-clip-top' },
      svg('rect', { x: M.left, y: M.top, width: plotW, height: zeroY - M.top }));
    var clipBot = svg('clipPath', { id: 'live-gg-clip-bot' },
      svg('rect', { x: M.left, y: zeroY, width: plotW, height: M.top + plotH - zeroY }));
    gfx.push(svg('defs', null, clipTop, clipBot));

    /* grid */
    var gridVals = [niceMax, niceMax / 2, 0, -niceMax / 2, -niceMax];
    gridVals.forEach(function (v) {
      gfx.push(svg('line', {
        'class': v === 0 ? 'live-gg-zero' : 'live-gg-grid',
        x1: M.left, x2: M.left + plotW, y1: y(v), y2: y(v)
      }));
    });

    /* x grid every 5 minutes */
    for (var m = 0; m <= lastMinute; m += 5) {
      gfx.push(svg('line', { 'class': 'live-gg-grid-v', x1: x(m), x2: x(m), y1: M.top, y2: M.top + plotH }));
    }

    var areaD = Hub.svgPath(areaPts, true);
    gfx.push(svg('path', { 'class': 'live-gg-area live-gg-area--dire', d: areaD, 'clip-path': 'url(#live-gg-clip-top)' }));
    gfx.push(svg('path', { 'class': 'live-gg-area live-gg-area--radiant', d: areaD, 'clip-path': 'url(#live-gg-clip-bot)' }));
    gfx.push(svg('path', { 'class': 'live-gg-line', d: Hub.svgPath(pts, false) }));

    /* y tick labels, inside the viewBox */
    gridVals.forEach(function (v) {
      /* unsigned ticks, tinted by half: the top half is Spirit ahead, the
         bottom half is VISION ahead, so the axis is not two identical pairs */
      var half = v === 0 ? 'zero' : (v > 0 ? 'dire' : 'radiant');
      gfx.push(svg('text', {
        'class': 'live-gg-tick live-gg-tick--' + half, x: M.left - 8, y: y(v) + 4, 'text-anchor': 'end'
      }, v === 0 ? '0' : fmt.gold(Math.abs(v))));
    });

    /* x tick labels */
    for (var t = 0; t <= lastMinute; t += 5) {
      gfx.push(svg('text', {
        'class': 'live-gg-tick', x: x(t), y: M.top + plotH + 18, 'text-anchor': 'middle'
      }, t + 'm'));
    }

    /* side captions inside the plot */
    gfx.push(svg('text', { 'class': 'live-gg-side live-gg-side--dire', x: M.left + 6, y: M.top + 14 },
      dire.name + ' ahead'));
    gfx.push(svg('text', { 'class': 'live-gg-side live-gg-side--radiant', x: M.left + 6, y: M.top + plotH - 6 },
      radiant.name + ' ahead'));

    /* markers: first blood from the objectives, then the derived chart markers */
    var markers = [];
    (GF5.objectives || []).forEach(function (o) {
      if (o.type === 'CHAT_MESSAGE_FIRSTBLOOD') {
        markers.push({
          minute: Math.floor(o.seconds / 60), seconds: o.seconds,
          label: 'First blood to ' + o.by, kind: 'firstblood', team: o.team
        });
      }
    });
    markers = markers.concat(GF5.chartMarkers || []);
    markers.sort(function (a, b) { return a.seconds - b.seconds; });

    markers.forEach(function (mk, i) {
      var val = (series[mk.minute] || last).value;
      var mx = x(mk.minute), my = y(val);
      gfx.push(svg('line', { 'class': 'live-gg-mk-stem', x1: mx, x2: mx, y1: my, y2: zeroY }));
      gfx.push(svg('circle', { 'class': 'live-gg-mk live-gg-mk--' + mk.kind, cx: mx, cy: my, r: 8 }));
      gfx.push(svg('text', { 'class': 'live-gg-mk-num', x: mx, y: my + 4, 'text-anchor': 'middle' }, String(i + 1)));
    });

    /* the freeze line and the end callout */
    gfx.push(svg('line', { 'class': 'live-gg-now', x1: x(lastMinute), x2: x(lastMinute), y1: M.top, y2: M.top + plotH }));
    gfx.push(svg('circle', { 'class': 'live-gg-end', cx: x(lastMinute), cy: y(last.value), r: 4 }));
    gfx.push(svg('text', {
      'class': 'live-gg-callout', x: x(lastMinute) + 8, y: y(last.value) - 8
    }, fmt.goldSigned(last.value)));
    gfx.push(svg('text', {
      'class': 'live-gg-callout-sub', x: x(lastMinute) + 8, y: y(last.value) + 8
    }, abbr(dire.key)));
    gfx.push(svg('text', {
      'class': 'live-gg-tick', x: x(lastMinute), y: M.top - 10, 'text-anchor': 'middle'
    }, GF5.frozenAt.clock));

    var chart = svg('svg', {
      'class': 'live-gg', viewBox: '0 0 ' + W + ' ' + H, width: '100%',
      preserveAspectRatio: 'xMidYMid meet', role: 'img',
      'aria-label': 'Gold advantage per minute. ' + dire.name + ' lead by ' +
        fmt.num(Math.abs(last.value)) + ' gold at ' + GF5.frozenAt.clock + '.'
    }, gfx);

    var legend = h('div', { 'class': 'cluster live-gg-legend' },
      h('span', { 'class': 'live-key live-key--dire' },
        h('span', { 'class': 'live-key-swatch' }), dire.name + ' ahead'),
      h('span', { 'class': 'live-key live-key--radiant' },
        h('span', { 'class': 'live-key-swatch' }), radiant.name + ' ahead'),
      h('span', { 'class': 'live-key live-key--line' },
        h('span', { 'class': 'live-key-swatch' }), 'Gold difference'),
      h('span', { 'class': 'u-dim rdy-par-7' }, 'Scale +/- ' + fmt.gold(niceMax)));

    var keyList = h('ol', { 'class': 'live-gg-keys' }, markers.map(function (mk, i) {
      return h('li', { 'class': 'live-gg-keyitem' },
        h('span', { 'class': 'live-gg-keynum live-gg-mk--' + mk.kind }, String(i + 1)),
        h('span', { 'class': 'live-gg-keytime u-tnum u-dim' }, fmt.clock(mk.seconds)),
        h('span', { 'class': 'live-gg-keytext' }, mk.label));
    }));

    mount.appendChild(card({
      testid: 'gold-graph',
      title: 'Gold advantage',
      sub: 'total gold earned, per minute, to ' + GF5.frozenAt.clock,
      action: h('span', { 'class': 'u-dim rdy-par-7' }, GF5.goldAdvantageNote.split('.')[0])
    }, [
      legend,
      h('div', { 'class': 'live-gg-wrap' }, chart),
      h('div', { 'class': 'u-label live-sub-label' }, 'Marked moments'),
      keyList
    ]));
  });

  /* ======================================================================
     3. m-objectives : buildings, Roshan and the Aegis
     ====================================================================== */

  Hub.register('m-objectives', function (mount, ctx) {
    var GF5 = ctx.GF5;
    var LANES = [{ key: 'top', label: 'Top' }, { key: 'mid', label: 'Mid' }, { key: 'bot', label: 'Bot' }];

    function dot(alive, label, text) {
      return h('span', {
        'class': 'live-tdot' + (alive ? ' live-tdot--up' : ' live-tdot--down'),
        title: label,
        'aria-label': label
      }, h('span', { 'class': 'live-tdot-txt' }, text));
    }

    function standing(t) {
      var n = 0;
      LANES.forEach(function (l) { t[l.key].forEach(function (v) { if (v) n++; }); });
      t.t4.forEach(function (v) { if (v) n++; });
      return n;
    }

    function matrix(side) {
      var t = GF5.towerStatus[side];
      var team = teamOf(GF5, side);
      var rows = LANES.map(function (l) {
        var cells = [h('span', { 'class': 'live-obj-lane rdy-subh-6' }, l.label)];
        t[l.key].forEach(function (alive, i) {
          cells.push(dot(alive, abbr(team.key) + ' ' + l.label + ' tier ' + (i + 1) + ': ' +
            (alive ? 'standing' : 'destroyed'), String(i + 1)));
        });
        cells.push(h('span', { 'class': 'live-obj-gap' }));
        var rax = t.rax[l.key];
        cells.push(dot(rax.melee, abbr(team.key) + ' ' + l.label + ' melee barracks: ' +
          (rax.melee ? 'standing' : 'destroyed'), 'M'));
        cells.push(dot(rax.ranged, abbr(team.key) + ' ' + l.label + ' ranged barracks: ' +
          (rax.ranged ? 'standing' : 'destroyed'), 'R'));
        return h('div', { 'class': 'live-obj-row' }, cells);
      });

      var baseRow = h('div', { 'class': 'live-obj-row' },
        h('span', { 'class': 'live-obj-lane rdy-subh-6' }, 'Base'),
        dot(t.t4[0], abbr(team.key) + ' tier 4, left: ' + (t.t4[0] ? 'standing' : 'destroyed'), '4'),
        dot(t.t4[1], abbr(team.key) + ' tier 4, right: ' + (t.t4[1] ? 'standing' : 'destroyed'), '4'),
        h('span', { 'class': 'live-obj-gap' }),
        dot(t.ancient, abbr(team.key) + ' ancient: ' + (t.ancient ? 'standing' : 'destroyed'), 'A'));

      return h('div', { 'class': 'live-obj-team live-obj-team--' + side },
        h('div', { 'class': 'live-obj-head' },
          Hub.teamCrest(team.key, 'sm'),
          h('span', { 'class': 'live-obj-name' }, team.name),
          sideChip(side),
          h('span', { 'class': 'spacer' }),
          h('span', { 'class': 'live-obj-count' },
            h('span', { 'class': 'live-obj-countnum u-tnum' }, String(standing(t))),
            h('span', { 'class': 'live-obj-countlab u-dim' }, 'of 11 up'))),
        h('div', { 'class': 'live-obj-cols rdy-subh-6 u-dim' },
          h('span', { 'class': 'live-obj-lane' }, 'Lane'),
          h('span', null, 'T1'), h('span', null, 'T2'), h('span', null, 'T3'),
          h('span', { 'class': 'live-obj-gap' }),
          h('span', null, 'Mel'), h('span', null, 'Rng')),
        rows, baseRow);
    }

    var r = GF5.roshan;
    var rTeam = Hub.team(r.aegisHolderTeam || (r.killedBy === 'dire' ? GF5.sides.dire : GF5.sides.radiant));
    var rosh = h('div', { 'class': 'live-rosh' },
      h('div', { 'class': 'live-rosh-head' },
        h('span', { 'class': 'live-rosh-ico' }, ico(ICON.gem)),
        h('span', { 'class': 'rdy-subh-4' }, 'Roshan'),
        h('span', { 'class': 'chip chip--outline' }, r.state === 'dead' ? 'Dead' : 'Alive'),
        h('span', { 'class': 'spacer' }),
        h('span', { 'class': 'u-dim rdy-par-7 u-tnum' }, 'kill ' + r.killCount)),
      h('dl', { 'class': 'live-rosh-list' },
        h('div', null, h('dt', null, 'Killed at'), h('dd', { 'class': 'u-tnum' }, r.killedAtClock)),
        h('div', null, h('dt', null, 'Taken by'),
          h('dd', null, rTeam ? rTeam.name : sideLabel(r.killedBy))),
        h('div', null, h('dt', null, 'Respawn window'), h('dd', { 'class': 'u-tnum' }, r.respawnWindow)),
        h('div', null, h('dt', null, 'Aegis'),
          h('dd', { 'class': 'live-rosh-aegis' },
            Hub.heroImg(r.aegisHolderHero, { side: r.aegisHolderTeam === GF5.sides.dire ? 'dire' : 'radiant', size: 'sm' }),
            h('span', null, r.aegisHolder),
            h('span', { 'class': 'u-dim u-tnum' }, 'to ' + r.aegisExpiresClock)))));

    var legend = h('div', { 'class': 'cluster live-obj-legend' },
      h('span', { 'class': 'live-key' }, h('span', { 'class': 'live-tdot live-tdot--up live-tdot--key' }), 'Standing'),
      h('span', { 'class': 'live-key' }, h('span', { 'class': 'live-tdot live-tdot--down live-tdot--key' }), 'Destroyed'),
      h('span', { 'class': 'u-dim rdy-par-7' }, 'T1 to T3 towers, Mel and Rng barracks, 4 tier four, A ancient'));

    mount.appendChild(card({
      testid: 'objectives',
      title: 'Objectives',
      sub: 'buildings standing at ' + GF5.frozenAt.clock
    }, [
      h('div', { 'class': 'live-obj-grid' }, matrix('radiant'), matrix('dire')),
      legend, rosh
    ]));
  });

  /* ======================================================================
     4. m-scoreboard : both teams, full stat line
     ====================================================================== */

  Hub.register('m-scoreboard', function (mount, ctx) {
    var GF5 = ctx.GF5, TI = ctx.TI2026;

    /* match highs, for the subtle per column highlight */
    var HIGH = {};
    ['level', 'kills', 'assists', 'lastHits', 'denies', 'gpm', 'xpm', 'gold'].forEach(function (k) {
      HIGH[k] = GF5.players.reduce(function (a, p) { return Math.max(a, p[k] || 0); }, 0);
    });

    function num(p, key, cls) {
      var isHigh = HIGH[key] !== undefined && p[key] === HIGH[key];
      return h('span', { 'class': (cls || '') + (isHigh ? ' live-high' : '') }, fmt.num(p[key]));
    }

    /* An item slot is a picture of an item, not a control. Seventy focusable
       buttons that only swap a readout were seventy dead keyboard stops, so
       the slot is a labelled image and the name rides on the label. */
    function itemSlot(item, readout) {
      if (!item) {
        return h('span', { 'class': 'live-item live-item--empty', 'aria-hidden': 'true' });
      }
      var src = Hub.itemIcon(item.name);
      var inner = src
        ? h('img', { 'class': 'item-icon', src: src, alt: '', loading: 'lazy', decoding: 'async' })
        : h('span', { 'class': 'live-item-abbr' }, Hub.initials(item.label, 2));
      var slot = h('span', {
        'class': 'live-item' + (src ? '' : ' live-item--text'),
        role: 'img', 'aria-label': item.label, title: item.label
      }, inner);
      function show() { readout.textContent = item.label; }
      function clear() { readout.textContent = readout.dataset.idle; }
      slot.addEventListener('mouseenter', show);
      slot.addEventListener('mouseleave', clear);
      return slot;
    }

    function teamTable(side) {
      var team = teamOf(GF5, side);
      var meta = Hub.team(team.key);
      var ps = playersOf(GF5, side);
      var sum = { kills: 0, deaths: 0, assists: 0, gold: 0 };
      ps.forEach(function (p) {
        sum.kills += p.kills; sum.deaths += p.deaths; sum.assists += p.assists; sum.gold += p.gold;
      });

      var readout = h('div', { 'class': 'live-sb-readout u-dim rdy-par-7' });
      readout.dataset.idle = 'Hover an item to read its name. Every slot also carries the name as its label.';
      readout.textContent = readout.dataset.idle;

      var head = h('div', { 'class': 'live-sb-head live-sb-head--' + side, 'data-team-id': team.openDotaId || null },
        Hub.teamCrest(team.key, 'lg'),
        h('div', { 'class': 'live-sb-headid' },
          h('h3', { 'class': 'rdy-subh-3 u-truncate' },
            Hub.extLink(Hub.link.team(meta && meta.rdyTeamId), null, team.name)),
          h('div', { 'class': 'cluster-sm' }, sideChip(side),
            h('span', { 'class': 'u-dim rdy-par-7' }, meta ? meta.region : ''))),
        h('div', { 'class': 'spacer' }),
        h('div', { 'class': 'live-sb-sums' },
          h('div', { 'class': 'live-sb-sum' },
            h('span', { 'class': 'live-sb-sumv u-tnum' }, sum.kills + ' / ' + sum.deaths + ' / ' + sum.assists),
            h('span', { 'class': 'live-sb-suml u-dim' }, 'team K / D / A')),
          h('div', { 'class': 'live-sb-sum' },
            h('span', { 'class': 'live-sb-sumv u-tnum' }, fmt.num(sum.gold)),
            h('span', { 'class': 'live-sb-suml u-dim' }, 'team gold'))));

      var thead = h('thead', null, h('tr', null,
        h('th', { scope: 'col' }, 'Player'),
        h('th', { scope: 'col' }, 'Hero'),
        h('th', { scope: 'col', 'class': 'col-mid' }, 'LVL'),
        h('th', { scope: 'col', 'class': 'col-mid' }, 'K / D / A'),
        h('th', { scope: 'col', 'class': 'col-mid' }, 'LH / DN'),
        h('th', { scope: 'col', 'class': 'col-mid' }, 'GPM / XPM'),
        h('th', { scope: 'col', 'class': 'col-num' }, 'GOLD'),
        h('th', { scope: 'col' }, 'Items')));

      var tbody = h('tbody', null, ps.map(function (p) {
        var r = rosterRow(TI, p.teamKey, p.handle);
        var slots = [];
        for (var i = 0; i < 6; i++) slots.push(itemSlot(p.items[i] || null, readout));
        var tags = [];
        if (p.aghanimsBlessing) {
          tags.push(h('span', { 'class': 'live-agh live-agh--bless', title: 'Aghanim’s Blessing', 'aria-label': 'Aghanim’s Blessing' }, 'B'));
        }
        if (p.aghanimsShard) {
          tags.push(h('span', { 'class': 'live-agh', title: 'Aghanim’s Shard', 'aria-label': 'Aghanim’s Shard' }, 'S'));
        }
        var isAegis = GF5.roshan && GF5.roshan.aegisHolder === p.handle;

        return h('tr', { 'data-player-id': r && r.rdyPlayerId ? r.rdyPlayerId : null },
          h('td', null, h('span', { 'class': 'live-sb-player' },
            Hub.avatar(playerFace(TI, p), p.teamKey, 'sm'),
            h('span', { 'class': 'live-sb-pname' },
              h('span', { 'class': 'live-sb-handle u-truncate' }, playerLink(TI, p)),
              h('span', { 'class': 'live-sb-pos u-dim' },
                p.pos ? 'Pos ' + p.pos : '', isAegis ? h('span', { 'class': 'live-aegis-tag' }, 'Aegis') : null)))),
          h('td', null, h('span', { 'class': 'live-sb-hero' },
            Hub.heroImg(p.hero, { side: side, size: 'sm', alt: p.heroName }),
            h('span', { 'class': 'live-sb-heroname u-truncate' },
              Hub.extLink(Hub.link.hero(p.hero), null, p.heroName)))),
          h('td', { 'class': 'col-mid' }, num(p, 'level', 'live-sb-lvl')),
          h('td', { 'class': 'col-mid u-nowrap' },
            num(p, 'kills'), h('span', { 'class': 'live-slash' }, '/'),
            h('span', null, fmt.num(p.deaths)), h('span', { 'class': 'live-slash' }, '/'),
            num(p, 'assists')),
          h('td', { 'class': 'col-mid u-nowrap' },
            num(p, 'lastHits'), h('span', { 'class': 'live-slash' }, '/'), num(p, 'denies')),
          h('td', { 'class': 'col-mid u-nowrap' },
            num(p, 'gpm'), h('span', { 'class': 'live-slash' }, '/'), num(p, 'xpm')),
          h('td', { 'class': 'col-num' }, num(p, 'gold')),
          h('td', null, h('span', { 'class': 'live-items' },
            h('span', { 'class': 'live-items-grid' }, slots),
            h('span', { 'class': 'live-items-side' },
              itemSlot(p.neutral, readout),
              tags.length ? h('span', { 'class': 'live-agh-wrap' }, tags) : null))));
      }));

      return h('div', {
        'class': 'live-sb-team',
        'data-testid': side === 'radiant' ? 'home-team' : 'away-team'
      }, head,
        h('div', { 'class': 'scroll-x live-sb-scroll' },
          h('table', { 'class': 'hub-table live-sb-table' }, thead, tbody)),
        readout);
    }

    var notes = h('div', { 'class': 'live-sb-notes u-dim rdy-par-7' },
      h('p', null, 'LVL level, K / D / A kills deaths assists, LH / DN last hits denies, ' +
        'GPM / XPM gold and experience per minute, GOLD total gold earned at ' + GF5.frozenAt.clock + '.'),
      h('p', null, h('span', { 'class': 'live-high live-high--key' }, 'Underlined'), ' marks the match high in that column.'),
      h('p', null, 'Six carried item slots, then the ringed slot: the neutral item. ' +
        'S marks Aghanim’s Shard, B marks Aghanim’s Blessing.'),
      h('p', null, GF5.dataNotes.gold),
      h('p', null, 'Assist totals at the freeze are a teamfight participation proxy.'));

    mount.appendChild(card({
      testid: 'scoreboard',
      title: 'Scoreboard',
      sub: 'game ' + GF5.game + ' at ' + GF5.frozenAt.clock + ', kills ' + GF5.killScore +
        ' (' + abbr(teamOf(GF5, 'radiant').key) + ' first)'
    }, [teamTable('radiant'), h('hr', { 'class': 'divider live-rule' }), teamTable('dire'), notes]));
  });

  /* ======================================================================
     5. m-events : the timestamped feed
     ====================================================================== */

  Hub.register('m-events', function (mount, ctx) {
    var GF5 = ctx.GF5;
    var TYPE = {
      state: { icon: ICON.chart, label: 'Game state' },
      tower: { icon: ICON.tower, label: 'Building' },
      aegis: { icon: ICON.shield, label: 'Aegis' },
      roshan: { icon: ICON.gem, label: 'Roshan' },
      teamfight: { icon: ICON.swords, label: 'Teamfight' },
      tormentor: { icon: ICON.star, label: 'Tormentor' },
      firstblood: { icon: ICON.drop, label: 'First blood' }
    };

    var items = GF5.events.map(function (e) {
      var t = TYPE[e.type] || { icon: ICON.clock, label: e.type };
      var isKey = Math.floor(e.seconds / 60) === GF5.keyMoment.minute && e.type === 'teamfight';
      var teamName = e.team ? teamOf(GF5, e.team).name : null;
      return h('li', {
        'class': 'live-ev live-ev--' + (e.team || 'neutral') + (isKey ? ' live-ev--key' : ''),
        'data-testid': 'event'
      },
        h('span', { 'class': 'live-ev-rail' }),
        h('span', { 'class': 'live-ev-ico' }, ico(t.icon)),
        h('div', { 'class': 'live-ev-body' },
          h('div', { 'class': 'live-ev-top' },
            h('span', { 'class': 'live-ev-time u-tnum' }, e.time),
            h('span', { 'class': 'live-ev-type rdy-subh-6 u-dim' }, t.label),
            teamName ? h('span', { 'class': 'live-ev-team u-dim' }, teamName) : null,
            isKey ? h('span', { 'class': 'chip chip--gold' }, 'Key moment') : null),
          h('h3', { 'class': 'live-ev-head rdy-subh-4' }, e.headline),
          h('p', { 'class': 'live-ev-detail rdy-par-7' }, e.detail)));
    });

    mount.appendChild(card({
      testid: 'events',
      title: 'Live feed',
      sub: 'newest first, every logged event to ' + GF5.frozenAt.clock,
      action: h('span', { 'class': 'u-dim rdy-par-7 u-tnum' }, GF5.events.length + ' events')
    }, [
      h('ol', { 'class': 'live-evlist' }, items),
      h('p', { 'class': 'live-ev-foot u-dim rdy-par-7' },
        'The feed stops at the freeze. Nothing after ' + GF5.frozenAt.clock + ' is recorded.')
    ]));
  });

  /* ======================================================================
     5b. m-mini-score : the sticky score strip
     A page that calls itself live showed no score for 92 percent of its
     scroll length. This appears the moment the live card leaves the
     viewport, including on the five tabs that never show it.
     ====================================================================== */

  Hub.register('m-mini-score', function (mount, ctx) {
    var GF5 = ctx.GF5;
    var radiant = teamOf(GF5, 'radiant');
    var dire = teamOf(GF5, 'dire');

    function end(side, team) {
      return h('span', { 'class': 'mini-team mini-team--' + side },
        Hub.teamCrest(team.key, 'sm'),
        h('span', { 'class': 'mini-abbr' }, abbr(team.key)));
    }

    var inner = h('div', { 'class': 'mini-inner' },
      h('span', { 'class': 'chip chip--live mini-live' },
        h('span', { 'class': 'live-dot', 'aria-hidden': 'true' }), 'Live'),
      end('radiant', radiant),
      h('span', { 'class': 'mini-score u-tnum' },
        h('span', { 'class': 'u-radiant' }, String(GF5.seriesScore[radiant.key])),
        h('span', { 'class': 'mini-score-sep' }, ':'),
        h('span', { 'class': 'u-dire' }, String(GF5.seriesScore[dire.key]))),
      end('dire', dire),
      h('span', { 'class': 'mini-sep', 'aria-hidden': 'true' }),
      h('span', { 'class': 'mini-meta' }, 'Game ' + GF5.game),
      h('span', { 'class': 'mini-clock u-tnum' }, GF5.frozenAt.clock),
      h('span', { 'class': 'spacer' }),
      h('button', {
        type: 'button', 'class': 'btn btn-sm mini-jump',
        onclick: function () {
          Hub.tabs.activate('overview', { scroll: false });
          var card = document.getElementById('m-live');
          if (card && card.scrollIntoView) { card.scrollIntoView({ block: 'start' }); }
        }
      }, 'Live panel'));

    mount.appendChild(h('div', { 'class': 'container' }, inner));
    mount.setAttribute('aria-hidden', 'true');
    mount.setAttribute('aria-label', 'Series score');

    var live = document.getElementById('m-live');
    if (!live || !window.IntersectionObserver) { return; }
    var io = new window.IntersectionObserver(function (entries) {
      var on = !entries[0].isIntersecting;
      mount.classList.toggle('is-on', on);
      /* the strip joins the sticky stack, so anything else sticking under
         it (the Today card) has to know how tall the stack is now */
      document.documentElement.classList.toggle('has-mini', on);
      mount.setAttribute('aria-hidden', on ? 'false' : 'true');
    }, { rootMargin: '-' + 110 + 'px 0px 0px 0px', threshold: 0 });
    io.observe(live);
  });

  /* ======================================================================
     6. draft board, shared by m-draft-live and the Drafts tab
     ====================================================================== */

  /* normalise a draft row from either data file */
  function draftRow(row) {
    return {
      order: row.order,
      type: row.type,
      phase: row.phase,
      team: row.team,
      teamKey: row.teamKey,
      hero: row.hero,
      heroName: row.heroName || row.heroDisplay || Hub.heroLabel(row.hero)
    };
  }

  function phaseGroups(rows) {
    var out = [], last = null;
    rows.forEach(function (r) {
      if (!last || last.phase !== r.phase) { last = { phase: r.phase, rows: [] }; out.push(last); }
      last.rows.push(r);
    });
    return out;
  }

  /* hero internal name -> picking player handle */
  function pickerIndex(game) {
    var idx = {};
    if (game.lineups) {
      ['radiant', 'dire'].forEach(function (s) {
        (game.lineups[s] || []).forEach(function (l) { idx[l.hero] = l.player; });
      });
    }
    if (game.players) {
      game.players.forEach(function (p) { if (p.hero) idx[p.hero] = p.handle; });
    }
    return idx;
  }

  function draftTile(r, pickers) {
    var isBan = r.type === 'ban';
    var side = r.team;
    var handle = !isBan ? pickers[r.hero] : null;
    return h('li', { 'class': 'live-dt live-dt--' + (isBan ? 'ban' : 'pick') + ' live-dt--' + side },
      h('span', { 'class': 'live-dt-art' },
        Hub.heroImg(r.hero, { side: isBan ? null : side, alt: r.heroName }),
        isBan ? h('span', { 'class': 'live-dt-slash', 'aria-hidden': 'true' }) : null,
        h('span', { 'class': 'live-dt-order u-tnum' }, String(r.order))),
      h('span', { 'class': 'live-dt-txt' },
        h('span', { 'class': 'live-dt-hero' }, r.heroName),
        h('span', { 'class': 'live-dt-sub u-truncate u-dim' }, isBan ? 'Banned' : (handle || 'Picked'))));
  }

  /* game: { draft, lineups?, players?, radiantKey, direKey, label } */
  function draftBoard(game, opts) {
    opts = opts || {};
    var rows = game.draft.map(draftRow);
    var pickers = pickerIndex(game);
    var groups = phaseGroups(rows);
    var lanes = [
      { side: 'radiant', key: game.radiantKey },
      { side: 'dire', key: game.direKey }
    ];

    var laneHead = h('div', { 'class': 'live-df-lanes live-df-lanehead' }, lanes.map(function (l) {
      var t = Hub.team(l.key);
      return h('div', { 'class': 'live-df-lanetitle' },
        Hub.teamCrest(l.key, 'sm'),
        h('span', { 'class': 'live-df-lanename' }, t ? t.name : l.key),
        sideChip(l.side));
    }));

    var body = groups.map(function (g) {
      var per = lanes.map(function (l) {
        return g.rows.filter(function (r) { return r.teamKey === l.key; });
      });
      var rowsInPhase = Math.max(per[0].length, per[1].length);
      return h('div', { 'class': 'live-df-phase' },
        h('div', { 'class': 'u-label live-df-phasename' }, g.phase),
        h('div', { 'class': 'live-df-lanes' }, lanes.map(function (l, li) {
          var mine = per[li];
          var cells = mine.map(function (r) { return draftTile(r, pickers); });
          while (cells.length < rowsInPhase) {
            cells.push(h('li', { 'class': 'live-dt live-dt--none' },
              h('span', { 'class': 'live-dt-sub u-dim' }, 'no turn')));
          }
          return h('ul', { 'class': 'live-df-lane' }, cells);
        })));
    });

    var lineupBlock = null;
    if (game.lineups) {
      lineupBlock = h('div', { 'class': 'live-df-lineups' },
        h('div', { 'class': 'u-label live-sub-label' }, 'Final lineups'),
        h('div', { 'class': 'live-df-lanes' }, lanes.map(function (l) {
          return h('ul', { 'class': 'live-lineup' }, (game.lineups[l.side] || []).map(function (x) {
            return h('li', { 'class': 'live-lineup-item' },
              Hub.heroImg(x.hero, { side: l.side, size: 'sm', alt: x.heroName }),
              h('span', { 'class': 'live-lineup-txt' },
                h('span', { 'class': 'u-truncate' }, x.heroName),
                h('span', { 'class': 'u-dim u-truncate' },
                  x.player + (x.pos ? ', pos ' + x.pos : ''))));
          }));
        })));
    }

    var counts = { bans: 0, picks: 0 };
    rows.forEach(function (r) { if (r.type === 'ban') counts.bans++; else counts.picks++; });

    return h('div', { 'class': 'live-df', 'data-testid': opts.testid || 'draft-board' },
      h('div', { 'class': 'cluster live-df-legend' },
        h('span', { 'class': 'live-key live-key--ban' }, h('span', { 'class': 'live-key-swatch' }), counts.bans + ' bans'),
        h('span', { 'class': 'live-key live-key--pick' }, h('span', { 'class': 'live-key-swatch' }), counts.picks + ' picks'),
        h('span', { 'class': 'u-dim rdy-par-7' }, 'numbered in Captain’s Mode order')),
      laneHead, body, lineupBlock);
  }

  Hub.register('m-draft-live', function (mount, ctx) {
    var GF5 = ctx.GF5;
    var game = {
      draft: GF5.draft,
      lineups: GF5.lineups,
      radiantKey: GF5.sides.radiant,
      direKey: GF5.sides.dire
    };
    mount.appendChild(card({
      testid: 'draft-live',
      title: 'Game ' + GF5.game + ' draft',
      sub: 'Captain’s Mode, ' + GF5.draftCounts.bans + ' bans and ' + GF5.draftCounts.picks + ' picks',
      action: pageLink('TI2026_Match_Analysis_rdy_gg.html#draft', null, 'Full draft analysis')
    }, draftBoard(game, { testid: 'draft-board-g5' })));
  });

  /* ---- Drafts tab: the same board for every grand final game ---- */

  /* games 1 to 4 carry players, not lineups: derive the five per side */
  function lineupsFromPlayers(players) {
    if (!players || !players.length) return null;
    var out = { radiant: [], dire: [] };
    players.forEach(function (p) {
      if (!out[p.side]) return;
      out[p.side].push({
        hero: p.hero,
        heroName: p.heroDisplay || Hub.heroLabel(p.hero),
        player: p.handle,
        pos: null
      });
    });
    return out;
  }

  Hub.register('m-drafts', function (mount, ctx) {
    var GF5 = ctx.GF5, TI = ctx.TI2026;
    var gf = TI.grandFinal;

    var games = gf.games.filter(function (g) { return g.draft && g.draft.length; })
      .map(function (g) {
        return {
          game: g.game,
          status: g.status,
          winner: g.winner,
          duration: g.duration,
          killScore: g.killScore,
          matchId: g.matchId,
          draft: g.draft,
          players: g.players,
          lineups: lineupsFromPlayers(g.players),
          radiantKey: g.radiant,
          direKey: g.dire
        };
      });

    /* game five comes from the snapshot: real draft, no result */
    var g5 = null;
    for (var i = 0; i < games.length; i++) { if (games[i].game === GF5.game) g5 = games[i]; }
    if (g5) {
      g5.draft = GF5.draft;
      g5.lineups = GF5.lineups;
      g5.players = null;
      g5.radiantKey = GF5.sides.radiant;
      g5.direKey = GF5.sides.dire;
    }

    var body = h('div', { 'class': 'live-drafts-body' });
    var chips = h('div', { 'class': 'cluster live-drafts-nav', role: 'group', 'aria-label': 'Grand final game' });

    function render(g) {
      body.textContent = '';
      var meta = [];
      meta.push(h('span', { 'class': 'chip chip--outline' }, 'Game ' + g.game));
      if (g.status === 'live') {
        meta.push(h('span', { 'class': 'chip chip--live' }, h('span', { 'class': 'live-dot', 'aria-hidden': 'true' }), 'Live'));
        meta.push(h('span', { 'class': 'u-dim rdy-par-7' }, 'decider, frozen at ' + GF5.frozenAt.clock));
      } else {
        var w = Hub.team(g.winner);
        if (w) meta.push(h('span', { 'class': 'chip chip--green' }, w.name + ' won'));
        if (g.duration) meta.push(h('span', { 'class': 'u-dim rdy-par-7 u-tnum' }, g.duration));
        /* same fixed order and tags as the Overview strip and the sidebar
           table, so the three surfaces cannot disagree (verifier I01) */
        var kp = Hub.killsPair(g.killScore, g.radiantKey, g.direKey, { className: 'rdy-par-7' });
        if (kp) {
          meta.push(h('span', { 'class': 'cluster-sm live-drafts-kills' },
            h('span', { 'class': 'u-dim rdy-par-7' }, 'Kills'), kp));
        }
      }
      if (g.matchId) {
        meta.push(Hub.extLink(g.status === 'live' ? Hub.link.liveMatch(g.matchId) : Hub.link.match(g.matchId),
          { 'class': 'live-drafts-link' }, 'Match ' + g.matchId));
      }
      body.appendChild(h('div', { 'class': 'cluster live-drafts-meta' }, meta));
      body.appendChild(draftBoard(g, { testid: 'draft-board-g' + g.game }));
    }

    games.forEach(function (g) {
      var btn = h('button', {
        type: 'button', 'class': 'chip-filter', 'aria-pressed': g.game === GF5.game ? 'true' : 'false',
        dataset: { game: String(g.game) }
      }, 'Game ' + g.game);
      btn.addEventListener('click', function () {
        Array.prototype.forEach.call(chips.querySelectorAll('.chip-filter'), function (b) {
          b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
        });
        render(g);
      });
      chips.appendChild(btn);
      if (g.game === GF5.game) render(g);
    });

    mount.appendChild(card({
      testid: 'drafts',
      title: 'Grand final drafts',
      /* Every other surface on the page leads with the Radiant team of the
         decider, TEAM VISION. gf.teamA / teamB are stored the other way
         round, so the pair is ordered here rather than printed raw
         (verifier I10). */
      sub: gf.seriesLength + ', ' + Hub.teamName(GF5.sides.radiant) + ' against ' +
        Hub.teamName(GF5.sides.dire) + ', ' + fmt.date(gf.date),
      action: pageLink('TI2026_Match_Analysis_rdy_gg.html#draft', null, 'Full draft analysis')
    }, [chips, body]));
  });

})();
