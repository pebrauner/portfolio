/* ============================================================
   match/economy.js
   #m-economy : the gold and experience advantage chart.

   One array is the whole truth. Every figure in this module is
   G5.series.<array>[MatchTimeline.index]. Nothing is typed by hand.

   Owns: .mt-eco-* only. Reads the timeline, never keeps its own index.
   ============================================================ */
(function (global) {
  'use strict';

  var Hub = global.Hub;
  if (!Hub || typeof Hub.register !== 'function') return;

  var h = Hub.h;
  var svg = Hub.svg;
  var fmt = Hub.fmt;

  /* ---- 9. options with defaults, all documented ---- */
  var DEFAULTS = {
    mode: 'gold',          /* 'gold' | 'xp' | 'totals' */
    height: 300,           /* plot height in px */
    heightNarrow: 256,     /* plot height when the plot box is under narrowAt */
    narrowAt: 760,
    dataTop: 20,           /* px reserved above the curve for fight markers */
    railH: 15,             /* px reserved for the objective rail */
    rulerH: 17,            /* px reserved for the minute labels */
    yTicks: 5,
    labelEvery: 10,        /* a minute label every N minutes */
    mergePx: 12,           /* objective glyphs closer than this merge into one */
    markers: true,
    phaseTiles: true,
    sweepMs: 720,          /* mount sweep, skipped under reduced motion */
    lookback: 5            /* the "last N minutes" readout row */
  };

  var uid = 0;

  function clamp01(v) { return v < 0 ? 0 : (v > 1 ? 1 : v); }
  function reducedMotion() {
    return !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  /* nice axis ticks, so every gridline carries a round number */
  function niceNum(x, round) {
    if (!(x > 0)) return 1;
    var exp = Math.floor(Math.log(x) / Math.LN10);
    var f = x / Math.pow(10, exp);
    var nf;
    if (round) nf = f < 1.5 ? 1 : (f < 3 ? 2 : (f < 7 ? 5 : 10));
    else nf = f <= 1 ? 1 : (f <= 2 ? 2 : (f <= 5 ? 5 : 10));
    return nf * Math.pow(10, exp);
  }

  function ticksFor(min, max, count) {
    if (max === min) { max = min + 1; }
    var step = niceNum((max - min) / Math.max(1, count - 1), true);
    var lo = Math.floor(min / step) * step;
    var hi = Math.ceil(max / step) * step;
    var out = [];
    for (var v = lo; v <= hi + step * 0.5; v += step) out.push(Math.round(v));
    return { lo: lo, hi: hi, step: step, ticks: out };
  }

  /* ---------------------------------------------------------- */

  Hub.register('m-economy', function (mount, ctx) {
    var G5 = ctx.G5 || {};
    var T = ctx.Timeline;
    if (!T || !G5.series || !G5.minutes) return;

    var opts = {};
    var userOpts = (global.MatchEconomyOptions || {});
    for (var k in DEFAULTS) {
      if (Object.prototype.hasOwnProperty.call(DEFAULTS, k)) {
        opts[k] = Object.prototype.hasOwnProperty.call(userOpts, k) ? userOpts[k] : DEFAULTS[k];
      }
    }

    var S = G5.series;
    var M = G5.minutes;
    var LAST = M.last;
    var radiantKey = G5.match.radiant.key;      /* vision  */
    var direKey = G5.match.dire.key;            /* spirit  */
    var radiantTag = Hub.teamTag(radiantKey) || G5.match.radiant.tag;
    var direTag = Hub.teamTag(direKey) || G5.match.dire.tag;
    function tagOf(key) { return key === radiantKey ? radiantTag : direTag; }
    function nameOf(key) { return key === radiantKey ? G5.match.radiant.name : G5.match.dire.name; }
    var id = 'eco' + (++uid);

    var mode = opts.mode;

    /* ---- the three series a mode can draw, all straight from G5 ---- */
    function series() {
      if (mode === 'xp') {
        return {
          kind: 'diverge', metric: 'xp', values: S.xpAdvantage,
          radiant: S.teamXp.radiant, dire: S.teamXp.dire,
          title: 'Experience advantage', unit: 'XP'
        };
      }
      if (mode === 'totals') {
        return {
          kind: 'pair', metric: 'gold', values: S.goldAdvantage,
          radiant: S.teamGold.radiant, dire: S.teamGold.dire,
          title: 'Team gold, both sides', unit: 'gold'
        };
      }
      return {
        kind: 'diverge', metric: 'gold', values: S.goldAdvantage,
        radiant: S.teamGold.radiant, dire: S.teamGold.dire,
        title: 'Gold advantage', unit: 'gold'
      };
    }

    /* ============================================================
       1. Markers. The fights and the objectives on the same x scale
          as the master strip, and the same ids, so a magnet the
          strip already seeded is not duplicated here.
       ============================================================ */

    var PRIORITY = {
      ancient: 9, barracks: 8, roshan: 7, aegis: 6, tower: 5,
      tormentor: 4, courier: 3, firstblood: 3
    };

    function objGlyphKind(o) {
      if (o.type === 'tower') return o.tier >= 3 ? 'tower-hi' : 'tower';
      return o.type;
    }

    /* objectives that share a second (Roshan and the Aegis) become one marker */
    var objMarkers = (function () {
      var bySecond = {};
      var order = [];
      var list = G5.objectives || [];
      for (var i = 0; i < list.length; i++) {
        var o = list[i];
        var kk = String(o.seconds);
        if (!bySecond[kk]) { bySecond[kk] = []; order.push(kk); }
        bySecond[kk].push(o);
      }
      return order.map(function (kk) {
        var group = bySecond[kk];
        var lead = group[0];
        for (var i = 1; i < group.length; i++) {
          if ((PRIORITY[group[i].type] || 0) > (PRIORITY[lead.type] || 0)) lead = group[i];
        }
        var seconds = lead.seconds;
        var gained = lead.takenBy || lead.side;   /* buildings: takenBy. Roshan and friends: side */
        return {
          id: 'obj-' + seconds,
          seconds: seconds,
          clock: lead.clock,
          f: Math.min(seconds / 60, LAST) / LAST,
          index: Math.min(LAST, Math.round(seconds / 60)),
          kind: objGlyphKind(lead),
          type: lead.type,
          side: gained,
          priority: PRIORITY[lead.type] || 1,
          label: group.map(function (g) { return g.headline; }).join(' '),
          short: shortFor(lead),
          count: group.length
        };
      });
    })();

    function shortFor(o) {
      if (o.type === 'tower') return tagOf(o.takenBy) + ' T' + o.tier + (o.lane ? ' ' + o.lane : '');
      if (o.type === 'barracks') return 'Rax ' + (o.lane || '');
      if (o.type === 'ancient') return 'Ancient';
      if (o.type === 'roshan') return 'Roshan';
      if (o.type === 'aegis') return 'Aegis';
      if (o.type === 'tormentor') return 'Tormentor';
      if (o.type === 'courier') return 'Courier';
      if (o.type === 'firstblood') return 'First blood';
      return o.type;
    }

    var fightMarkers = (G5.teamfights || []).map(function (tf) {
      return {
        id: tf.id,
        seconds: tf.startSeconds,
        clock: tf.startClock,
        f: Math.min(tf.startSeconds / 60, LAST) / LAST,
        index: Math.min(LAST, tf.startMinute),
        side: tf.winnerSide === 'dire' ? direKey : radiantKey,
        winnerSide: tf.winnerSide,
        featured: !!tf.featured,
        label: tf.headline,
        short: tf.startClock + ' fight',
        swing: tf.goldSwing
      };
    });

    /* one registration, canonical ids, so moments.js dedupes against it */
    T.addSnapPoints(fightMarkers.map(function (m) {
      return {
        index: m.index, seconds: m.seconds, id: m.id, kind: 'fight',
        side: m.winnerSide, label: m.label, short: m.short,
        priority: m.featured ? 9 : 6
      };
    }));
    /* Objectives are NOT registered here. The strip already seeded them with
       the same 'obj-<seconds>' ids and deliberately keeps one magnet per
       minute, so registering all 28 would turn the strip into a picket fence.
       The chart still draws every objective on its own rail below, and the
       ones the strip did seed light up through markerEls when captured. */

    /* ============================================================
       2. DOM, built once
       ============================================================ */

    var seg = h('div', { 'class': 'm-seg', role: 'group', 'aria-label': 'Chart series' });
    var segBtns = {};
    [['gold', 'Gold'], ['xp', 'XP'], ['totals', 'Team totals']].forEach(function (pair) {
      var b = h('button', {
        type: 'button', 'class': 'm-seg-btn', 'aria-pressed': mode === pair[0] ? 'true' : 'false',
        dataset: { mode: pair[0] }, onclick: function () { setMode(pair[0]); }
      }, pair[1]);
      segBtns[pair[0]] = b;
      seg.appendChild(b);
    });

    var legend = h('div', { 'class': 'm-legend mt-eco-legend' },
      h('span', { 'class': 'm-legend-item' }, h('span', { 'class': 'm-swatch m-swatch--radiant' }), radiantTag + ' ahead'),
      h('span', { 'class': 'm-legend-item' }, h('span', { 'class': 'm-swatch m-swatch--dire' }), direTag + ' ahead'),
      h('span', { 'class': 'm-legend-item' }, h('span', { 'class': 'mt-eco-key mt-eco-key--fight' }), 'Teamfight'),
      h('span', { 'class': 'm-legend-item' }, h('span', { 'class': 'mt-eco-key mt-eco-key--tower' }), 'Tower, barracks'),
      h('span', { 'class': 'm-legend-item' }, h('span', { 'class': 'mt-eco-key mt-eco-key--roshan' }), 'Roshan, Aegis, Tormentor'));

    var svgHost = h('div', { 'class': 'mt-eco-svghost' });

    /* interaction-rule-change 2026-09-11: a hover previews, it never moves
       the page. The ghost is drawn inside this chart's own SVG and goes away
       when the pointer leaves; MatchTimeline.index does not hear about it. */
    var ghost = null;

    var cursor = h('div', { 'class': 'm-cursor mt-eco-cursor', style: '--x: 1' },
      h('div', { 'class': 'm-cursor-line' }));

    function dot(cls) {
      return h('div', { 'class': 'mt-eco-dot ' + cls, style: '--dx: 1; --dy: .5' },
        h('span', { 'class': 'mt-eco-dot-ring' }),
        h('span', { 'class': 'mt-eco-dot-flag u-tnum' }, ''));
    }
    var dotAdv = dot('mt-eco-dot--adv');
    var dotR = dot('mt-eco-dot--radiant');
    var dotD = dot('mt-eco-dot--dire');

    var plot = h('div', {
      'class': 'mt-eco-plot',
      tabindex: '0',
      role: 'slider',
      'aria-label': 'Economy chart, drag to move the match clock. It stays where you let go',
      'aria-valuemin': '0',
      'aria-valuemax': String(LAST),
      'aria-valuenow': String(T.index),
      'aria-valuetext': ''
    }, svgHost, cursor, dotAdv, dotR, dotD,
      h('div', { 'class': 'mt-eco-edge mt-eco-edge--start' }),
      h('div', { 'class': 'mt-eco-edge mt-eco-edge--end' }));

    /* ---- readout card, the same index as the chart ---- */
    function ro(label, cls) {
      var v = h('div', { 'class': 'm-readout-value u-tnum ' + (cls || '') }, '');
      return { item: h('div', { 'class': 'm-readout-item mt-eco-ro-item' }, h('div', { 'class': 'm-readout-label' }, label), v), value: v, label: label };
    }

    var roClock = ro('Match clock');
    var roAdv = ro('Advantage');
    var roR = ro(radiantTag + ' gold', 'is-radiant');
    var roD = ro(direTag + ' gold', 'is-dire');
    var roKills = ro('Kills');
    var roTowers = ro('Towers lost');
    var roDelta = ro('Last ' + opts.lookback + ' minutes');

    var roPhase = h('span', { 'class': 'chip mt-eco-phasechip' }, '');
    var roState = h('span', { 'class': 'mt-eco-state' }, '');
    var roMomentTime = h('span', { 'class': 'mt-eco-moment-time u-tnum' }, '');
    var roMomentText = h('span', { 'class': 'mt-eco-moment-text' }, '');
    var roMoment = h('div', { 'class': 'mt-eco-moment' }, roMomentTime, roMomentText);

    /* COMPACT, 2026-09-12: the headline reading is the clock, the advantage
       and the kills. The four supporting figures stay built and stay painted;
       they simply move into the phase breakdown panel, so a reader who opens
       it sees the same live numbers, not a second copy of them. */
    var roGridMain = h('div', { 'class': 'm-readout mt-eco-ro-grid mt-eco-ro-grid--main' },
      roClock.item, roAdv.item, roKills.item);
    var roGridMore = h('div', { 'class': 'm-readout mt-eco-ro-grid mt-eco-ro-grid--more' },
      roR.item, roD.item, roTowers.item, roDelta.item);

    var readout = h('div', { 'class': 'mt-eco-readout', 'data-testid': 'economy-readout' },
      h('div', { 'class': 'mt-eco-ro-head' }, roPhase, roState),
      roGridMain,
      h('div', { 'class': 'm-sub mt-eco-moment-label' }, 'Last moment'),
      roMoment);

    var live = h('div', { 'class': 'u-sr-only', 'aria-live': 'polite', 'aria-atomic': 'true' }, '');

    /* ---- phase tiles ---- */
    var phaseTiles = [];
    var phasesWrap = h('div', { 'class': 'mt-eco-phases', 'data-testid': 'economy-phases' });
    (G5.phases || []).forEach(function (p) {
      var goldV = h('span', { 'class': 'mt-eco-phase-gold u-tnum' }, fmt.goldSigned(p.goldDeltaChange));
      var tile = h('button', {
        type: 'button',
        'class': 'mt-eco-phase',
        dataset: { phase: p.key },
        'aria-label': p.label + ', ' + p.fromClock + ' to ' + p.toClock + '. Go to ' + p.toClock + '.',
        onclick: function () { T.set(Math.min(LAST, p.to)); },
        onmouseenter: function () { plot.dataset.phaseHover = p.key; },
        onmouseleave: function () { delete plot.dataset.phaseHover; },
        onfocus: function () { plot.dataset.phaseHover = p.key; },
        onblur: function () { delete plot.dataset.phaseHover; }
      },
        h('span', { 'class': 'mt-eco-phase-head' },
          h('span', { 'class': 'mt-eco-phase-name' }, p.label),
          h('span', { 'class': 'mt-eco-phase-win u-tnum' }, p.fromClock + ' to ' + p.toClock)),
        h('span', { 'class': 'mt-eco-phase-main' },
          goldV,
          h('span', { 'class': 'mt-eco-phase-to' }, p.goldDeltaChange === 0 ? 'level' : 'to ' + tagOf(p.goldDeltaChange > 0 ? direKey : radiantKey))),
        h('span', { 'class': 'mt-eco-phase-stats' },
          h('span', { 'class': 'mt-eco-phase-stat' },
            h('span', { 'class': 'mt-eco-phase-stat-label' }, 'Kills'),
            Hub.killsPair(p.kills, radiantKey, direKey, { left: radiantKey })),
          h('span', { 'class': 'mt-eco-phase-stat' },
            h('span', { 'class': 'mt-eco-phase-stat-label' }, 'Towers'),
            Hub.killsPair(p.towers, radiantKey, direKey, { left: radiantKey }))));
      goldV.classList.add(p.goldDeltaChange >= 0 ? 'is-dire' : 'is-radiant');
      phaseTiles.push({ el: tile, phase: p });
      phasesWrap.appendChild(tile);
    });

    var noteText = 'Positive is ' + G5.match.dire.name + ', the Dire side. Drag the chart, or press an arrow key, to move every panel on this page to that minute, and it stays there when you let go. Hovering only previews the reading. A moment marker captures the cursor before you release it.';

    /* the reading rule is one click away instead of four lines under the chart */
    var noteTip = Hub.infoTip
      ? Hub.infoTip(noteText, { id: id + '-note', label: 'How to read this chart' })
      : h('p', { 'class': 'mt-eco-note' }, noteText);

    /* COMPACT: the five phase tiles and the four supporting readings are the
       breakdown. One button, one count, nothing deleted. */
    var phaseCount = (G5.phases || []).length;
    /* COMP-5, 2026-09-12: the panel carries the four supporting readings as
       well as the phase rows, so the label counts both halves of what it
       hides. Both counts are read off the arrays that build them. */
    var roMoreCount = roGridMore.children.length;
    var phaseExp = Hub.expander({
      id: id + '-phases',
      count: phaseCount,
      className: 'mt-eco-exp',
      label: function (n) {
        return 'Show ' + roMoreCount + ' more readings and ' + n + ' phase rows';
      },
      hideLabel: function (n) {
        return 'Hide the ' + roMoreCount + ' readings and ' + n + ' phase rows';
      },
      content: h('div', { 'class': 'mt-eco-more' }, roGridMore, phasesWrap)
    });
    if (Hub.onUnmount) Hub.onUnmount(phaseExp.destroy);

    var card = h('section', { 'class': 'card mt-eco', 'data-testid': 'match-economy' },
      h('div', { 'class': 'card-header mt-eco-header' },
        h('div', { 'class': 'titles' },
          h('h2', { 'class': 'title' }, 'Economy'),
          h('div', { 'class': 'subtitle mt-eco-subtitle' }, '')),
        h('div', { 'class': 'action' }, seg, noteTip)),
      h('div', { 'class': 'card-body mt-eco-body' },
        legend,
        h('div', { 'class': 'mt-eco-main' }, plot, readout),
        phaseExp.root,
        live));

    var subtitleEl = card.querySelector('.mt-eco-subtitle');
    /* M-06: one page level live region (the strip). This one only speaks
       while focus is inside the economy card and the timeline has settled. */
    var speak = T.quietLive ? T.quietLive(live, card) : function (t) { live.textContent = t; };

    mount.textContent = '';
    mount.appendChild(card);

    /* ============================================================
       3. Drawing. Rebuilt on width change and on mode change only,
          never per frame.
       ============================================================ */

    var geom = null;
    var markerEls = {};

    function draw() {
      var W = Math.max(240, Math.round(plot.clientWidth || 900));
      var H = W < opts.narrowAt ? opts.heightNarrow : opts.height;
      var s = series();
      var dataTop = opts.dataTop;
      var dataBottom = H - opts.rulerH - opts.railH;
      var railY = dataBottom + 2;
      var box = svg('svg', {
        'class': 'mt-eco-svg', viewBox: '0 0 ' + W + ' ' + H,
        width: '100%', height: String(H), 'aria-hidden': 'true', focusable: 'false'
      });

      var lo, hi, tk;
      if (s.kind === 'pair') {
        var pmax = 0;
        for (var i = 0; i <= LAST; i++) { pmax = Math.max(pmax, s.radiant[i], s.dire[i]); }
        tk = ticksFor(0, pmax, opts.yTicks);
        lo = 0; hi = tk.hi;
      } else {
        var vmin = 0, vmax = 0;
        for (var j = 0; j <= LAST; j++) { vmin = Math.min(vmin, s.values[j]); vmax = Math.max(vmax, s.values[j]); }
        tk = ticksFor(vmin, vmax, opts.yTicks);
        lo = tk.lo; hi = tk.hi;
      }

      function x(i) { return (i / LAST) * W; }
      function y(v) { return dataBottom - ((v - lo) / (hi - lo)) * (dataBottom - dataTop); }

      /* phase bands, labelled inside the box */
      var bands = svg('g', { 'class': 'mt-eco-bands' });
      (G5.phases || []).forEach(function (p) {
        var x0 = x(p.from), x1 = x(Math.min(p.to, LAST));
        bands.appendChild(svg('rect', {
          'class': 'mt-eco-band mt-eco-band--' + p.key, 'data-phase': p.key,
          x: x0, y: dataTop - 14, width: Math.max(0, x1 - x0), height: (dataBottom - dataTop) + 14
        }));
        bands.appendChild(svg('text', {
          'class': 'mt-eco-band-label', x: x0 + 7, y: dataTop - 5
        }, p.label.toUpperCase()));
      });
      box.appendChild(bands);

      /* grid and the y axis, labels inside the viewBox */
      var grid = svg('g', { 'class': 'mt-eco-grid' });
      tk.ticks.forEach(function (v) {
        if (v < lo - 0.5 || v > hi + 0.5) return;
        var yy = Math.round(y(v)) + 0.5;
        grid.appendChild(svg('line', {
          'class': 'mt-eco-gridline' + (v === 0 ? ' mt-eco-gridline--zero' : ''),
          x1: 0, x2: W, y1: yy, y2: yy
        }));
        var txt = s.kind === 'pair' ? fmt.gold(v) : fmt.goldSigned(v);
        if (v === 0) txt = s.kind === 'pair' ? '0' : 'level';
        /* the top gridline sits under the phase band labels, so its own
           label goes below the line instead of above it */
        var ly = (yy - 4 < dataTop + 8) ? yy + 13 : yy - 4;
        var lab = svg('text', {
          'class': 'mt-eco-ylabel' + (v === 0 ? ' mt-eco-ylabel--zero' : ''),
          x: 6, y: ly
        }, txt);
        grid.appendChild(lab);
      });
      box.appendChild(grid);

      /* the series */
      var seriesG = svg('g', { 'class': 'mt-eco-series' });
      if (s.kind === 'pair') {
        [['radiant', s.radiant], ['dire', s.dire]].forEach(function (pair) {
          var pts = [];
          for (var i = 0; i <= LAST; i++) pts.push([x(i), y(pair[1][i])]);
          var area = pts.slice();
          area.push([x(LAST), dataBottom], [x(0), dataBottom]);
          seriesG.appendChild(svg('path', { 'class': 'mt-eco-area mt-eco-area--' + pair[0], d: Hub.svgPath(area, true) }));
          seriesG.appendChild(svg('path', { 'class': 'mt-eco-line mt-eco-line--' + pair[0], d: Hub.svgPath(pts) }));
        });
      } else {
        var zeroY = y(0);
        var pts2 = [];
        for (var n = 0; n <= LAST; n++) pts2.push([x(n), y(s.values[n])]);
        var areaD = Hub.svgPath(pts2.concat([[x(LAST), zeroY], [x(0), zeroY]]), true);
        var lineD = Hub.svgPath(pts2);

        var defs = svg('defs', null,
          svg('clipPath', { id: id + '-up' }, svg('rect', { x: 0, y: 0, width: W, height: Math.max(0, zeroY) })),
          svg('clipPath', { id: id + '-dn' }, svg('rect', { x: 0, y: zeroY, width: W, height: Math.max(0, H - zeroY) })));
        box.appendChild(defs);

        var gUp = svg('g', { 'clip-path': 'url(#' + id + '-up)' },
          svg('path', { 'class': 'mt-eco-area mt-eco-area--dire', d: areaD }),
          svg('path', { 'class': 'mt-eco-line mt-eco-line--dire', d: lineD }));
        var gDn = svg('g', { 'clip-path': 'url(#' + id + '-dn)' },
          svg('path', { 'class': 'mt-eco-area mt-eco-area--radiant', d: areaD }),
          svg('path', { 'class': 'mt-eco-line mt-eco-line--radiant', d: lineD }));
        seriesG.appendChild(gUp);
        seriesG.appendChild(gDn);
      }
      box.appendChild(seriesG);

      /* markers */
      markerEls = {};
      if (opts.markers) {
        var marks = svg('g', { 'class': 'mt-eco-marks' });

        /* objectives on their own rail, merged when they would collide */
        var placed = [];
        objMarkers.slice().sort(function (a, b) { return a.seconds - b.seconds; }).forEach(function (m) {
          var px = m.f * W;
          var prev = placed[placed.length - 1];
          if (prev && px - prev.px < opts.mergePx) {
            prev.merged.push(m);
            if (m.priority > prev.lead.priority) prev.lead = m;
            return;
          }
          placed.push({ px: px, lead: m, merged: [m] });
        });

        placed.forEach(function (slot) {
          var m = slot.lead;
          var side = m.side === radiantKey ? 'radiant' : 'dire';
          var g = svg('g', {
            'class': 'mt-eco-mark mt-eco-mark--obj mt-eco-mark--' + m.kind + ' is-' + side,
            'data-snap-id': m.id,
            transform: 'translate(' + slot.px.toFixed(2) + ',' + (railY + 6) + ')'
          });
          g.appendChild(svg('line', { 'class': 'mt-eco-mark-stem', x1: 0, x2: 0, y1: -6, y2: -(railY + 6 - dataTop) }));
          if (m.kind === 'roshan' || m.kind === 'aegis') {
            g.appendChild(svg('circle', { 'class': 'mt-eco-glyph', cx: 0, cy: 0, r: 4.2 }));
            g.appendChild(svg('circle', { 'class': 'mt-eco-glyph-inner', cx: 0, cy: 0, r: 1.7 }));
          } else if (m.kind === 'ancient') {
            g.appendChild(svg('path', { 'class': 'mt-eco-glyph', d: 'M0 -5.4 L4.8 0 L0 5.4 L-4.8 0 Z' }));
          } else if (m.kind === 'barracks') {
            g.appendChild(svg('rect', { 'class': 'mt-eco-glyph', x: -4.2, y: -4.2, width: 8.4, height: 8.4, rx: 1 }));
          } else if (m.kind === 'tower-hi') {
            g.appendChild(svg('rect', { 'class': 'mt-eco-glyph', x: -3.4, y: -4.6, width: 6.8, height: 9.2, rx: 1 }));
          } else if (m.kind === 'tower') {
            g.appendChild(svg('rect', { 'class': 'mt-eco-glyph', x: -2.6, y: -3.6, width: 5.2, height: 7.2, rx: 1 }));
          } else {
            g.appendChild(svg('circle', { 'class': 'mt-eco-glyph', cx: 0, cy: 0, r: 2.6 }));
          }
          if (slot.merged.length > 1) {
            var right = slot.px > W - 16;
            g.appendChild(svg('text', {
              'class': 'mt-eco-mark-count', x: right ? -6 : 6, y: 3,
              'text-anchor': right ? 'end' : 'start'
            }, String(slot.merged.length)));
          }
          marks.appendChild(g);
          markerEls[m.id] = g;
          for (var q = 0; q < slot.merged.length; q++) { markerEls[slot.merged[q].id] = g; }
        });

        /* fights sit on the curve itself */
        fightMarkers.forEach(function (m) {
          var vy = s.kind === 'pair' ? y(s.dire[m.index]) : y(s.values[m.index]);
          var g = svg('g', {
            'class': 'mt-eco-mark mt-eco-mark--fight is-' + (m.winnerSide === 'dire' ? 'dire' : 'radiant') + (m.featured ? ' is-featured' : ''),
            'data-snap-id': m.id,
            transform: 'translate(' + (m.f * W).toFixed(2) + ',' + vy.toFixed(2) + ')'
          });
          if (m.featured) g.appendChild(svg('circle', { 'class': 'mt-eco-fight-halo', cx: 0, cy: 0, r: 9 }));
          g.appendChild(svg('path', { 'class': 'mt-eco-glyph mt-eco-fight', d: 'M0 -5.6 L5.6 0 L0 5.6 L-5.6 0 Z' }));
          marks.appendChild(g);
          markerEls[m.id] = g;
        });

        /* NO NARRATIVE RULE, 2026-09-11: the one labelled fight is the biggest
           swing, teamfights[].featured, the argmax of abs(swingWindow.value).
           The rule itself is printed under the fights and objectives card. */
        var feat = null;
        for (var fi = 0; fi < fightMarkers.length; fi++) { if (fightMarkers[fi].featured) feat = fightMarkers[fi]; }
        if (feat) {
          var fx = feat.f * W;
          var fy = s.kind === 'pair' ? y(s.dire[feat.index]) : y(s.values[feat.index]);
          var anchorRight = fx > W * 0.72;
          var lg = svg('g', { 'class': 'mt-eco-featlabel' });
          lg.appendChild(svg('line', { 'class': 'mt-eco-featlabel-line', x1: fx, y1: fy - 10, x2: fx, y2: Math.max(dataTop + 14, fy - 34) }));
          lg.appendChild(svg('text', {
            'class': 'mt-eco-featlabel-time u-tnum', x: anchorRight ? fx - 8 : fx + 8,
            y: Math.max(dataTop + 14, fy - 34) + 2, 'text-anchor': anchorRight ? 'end' : 'start'
          }, feat.clock));
          lg.appendChild(svg('text', {
            'class': 'mt-eco-featlabel-text', x: anchorRight ? fx - 8 : fx + 8,
            y: Math.max(dataTop + 14, fy - 34) + 15, 'text-anchor': anchorRight ? 'end' : 'start'
          }, 'Biggest swing'));
          marks.appendChild(lg);
        }

        box.appendChild(marks);
      }

      /* the minute ruler, inside the box */
      var ruler = svg('g', { 'class': 'mt-eco-ruler' });
      ruler.appendChild(svg('line', { 'class': 'mt-eco-ruler-rule', x1: 0, x2: W, y1: H - opts.rulerH + 0.5, y2: H - opts.rulerH + 0.5 }));
      for (var t = 0; t <= LAST; t += 5) {
        var xx = x(t);
        var major = t % opts.labelEvery === 0;
        ruler.appendChild(svg('line', {
          'class': 'mt-eco-rtick' + (major ? ' mt-eco-rtick--major' : ''),
          x1: xx, x2: xx, y1: H - opts.rulerH, y2: H - opts.rulerH + (major ? 5 : 3)
        }));
        if (major) {
          var anchor = t === 0 ? 'start' : (t >= LAST - 2 ? 'end' : 'middle');
          ruler.appendChild(svg('text', {
            'class': 'mt-eco-rlabel u-tnum', x: t === 0 ? 2 : (t >= LAST - 2 ? xx - 2 : xx), y: H - 4, 'text-anchor': anchor
          }, t === 0 ? '0 min' : String(t)));
        }
      }
      box.appendChild(ruler);

      svgHost.textContent = '';
      svgHost.appendChild(box);
      if (!reducedMotion() && opts.sweepMs > 0) {
        box.classList.add('is-sweeping');
        global.setTimeout(function () { box.classList.remove('is-sweeping'); }, opts.sweepMs + 60);
      }

      /* the hover preview layer, on top of everything this chart draws */
      var gLine = svg('line', { 'class': 'mt-eco-ghost-line', x1: 0, x2: 0, y1: dataTop - 14, y2: dataBottom });
      var gBox = svg('rect', { 'class': 'mt-eco-ghost-box', x: 0, y: dataTop - 12, width: 96, height: 30, rx: 4 });
      var gClock = svg('text', { 'class': 'mt-eco-ghost-clock', x: 0, y: dataTop + 1 }, '');
      var gValue = svg('text', { 'class': 'mt-eco-ghost-value', x: 0, y: dataTop + 13 }, '');
      var gDot = svg('circle', { 'class': 'mt-eco-ghost-dot', cx: 0, cy: 0, r: 3.5 });
      var gGroup = svg('g', {
        'class': 'mt-eco-ghost', 'data-testid': 'economy-ghost',
        'aria-hidden': 'true', visibility: 'hidden'
      }, gLine, gDot, gBox, gClock, gValue);
      box.appendChild(gGroup);
      ghost = { g: gGroup, line: gLine, box: gBox, clock: gClock, value: gValue, dot: gDot };

      geom = { W: W, H: H, y: y, lo: lo, hi: hi, s: s, dataTop: dataTop, dataBottom: dataBottom };

      subtitleEl.textContent = s.title + ', minute by minute. ' +
        (s.kind === 'pair' ? 'Both team totals on one axis.' : 'Above the line is ' + direTag + ', below is ' + radiantTag + '.');

      dotAdv.hidden = s.kind === 'pair';
      dotR.hidden = s.kind !== 'pair';
      dotD.hidden = s.kind !== 'pair';
      roR.label = radiantTag + ' ' + (s.metric === 'xp' ? 'XP' : 'gold');
      roD.label = direTag + ' ' + (s.metric === 'xp' ? 'XP' : 'gold');
      roR.item.firstChild.textContent = roR.label;
      roD.item.firstChild.textContent = roD.label;
      roAdv.item.firstChild.textContent = s.metric === 'xp' ? 'XP advantage' : 'Gold advantage';

      lastPaint = -1;
      apply(T.getState());
    }

    function setMode(next) {
      if (next === mode) return;
      mode = next;
      for (var kk in segBtns) {
        if (Object.prototype.hasOwnProperty.call(segBtns, kk)) segBtns[kk].setAttribute('aria-pressed', kk === mode ? 'true' : 'false');
      }
      draw();
    }

    /* ============================================================
       4. The subscriber. Text and CSS variables only.
       ============================================================ */

    var lastPaint = -1;
    var lastMood = '';
    var lastRubber = 0;
    var lastCaptured = null;
    var lastPhase = '';

    function setDot(el, f, value, text) {
      el.style.setProperty('--dx', String(clamp01(f)));
      el.style.setProperty('--dy', String(clamp01(geom.y(value) / geom.H)));
      el.classList.toggle('is-right', f > 0.74);
      el.lastChild.textContent = text;
    }

    function apply(st) {
      if (!geom) return;
      var i = st.index;
      var s = geom.s;

      cursor.style.setProperty('--x', String(clamp01(st.position / st.last)));

      /* principle 5: the rubber band is feedback, shown as an edge glow */
      var rb = st.rubberPx || 0;
      if (rb !== lastRubber) {
        lastRubber = rb;
        var cap = (T.options && T.options.rubberMax) || 56;
        plot.style.setProperty('--rubber-start', rb < 0 ? String(clamp01(-rb / cap)) : '0');
        plot.style.setProperty('--rubber-end', rb > 0 ? String(clamp01(rb / cap)) : '0');
      }

      card.classList.toggle('is-scrubbing', st.state === 'scrubbing');
      card.classList.toggle('is-playing', !!st.playing);

      var mood = st.index >= LAST ? 'Final reading' : 'At ' + M.clockAt[st.index];
      if (mood !== lastMood) { lastMood = mood; roState.textContent = mood; roState.classList.toggle('is-final', st.index >= LAST); }

      var capId = st.captured ? st.captured.id : null;
      if (capId !== lastCaptured) {
        if (lastCaptured && markerEls[lastCaptured]) markerEls[lastCaptured].classList.remove('is-captured');
        if (capId && markerEls[capId]) markerEls[capId].classList.add('is-captured');
        lastCaptured = capId;
      }

      if (i === lastPaint) return;
      lastPaint = i;

      var gold = S.goldAdvantage[i];
      var metricVals = s.kind === 'pair' ? null : s.values;
      var adv = s.kind === 'pair' ? gold : metricVals[i];
      var clock = M.clockAt[i];
      var kills = T.killsAt(i);
      var isFinal = i >= LAST;

      if (s.kind === 'pair') {
        setDot(dotR, i / LAST, s.radiant[i], fmt.gold(s.radiant[i]));
        setDot(dotD, i / LAST, s.dire[i], fmt.gold(s.dire[i]));
      } else {
        setDot(dotAdv, i / LAST, adv, fmt.goldSigned(adv));
        dotAdv.classList.toggle('is-dire', adv >= 0);
        dotAdv.classList.toggle('is-radiant', adv < 0);
      }

      roClock.value.textContent = clock;

      var leadKey = adv === 0 ? null : (adv > 0 ? direKey : radiantKey);
      roAdv.value.textContent = leadKey
        ? fmt.goldSigned(Math.abs(adv)) + ' ' + tagOf(leadKey)
        : fmt.goldSigned(0) + ' level';
      roAdv.value.classList.toggle('is-dire', adv > 0);
      roAdv.value.classList.toggle('is-radiant', adv < 0);

      roR.value.textContent = fmt.num(s.radiant[i]);
      roD.value.textContent = fmt.num(s.dire[i]);

      roKills.value.textContent = '';
      roKills.value.appendChild(Hub.killsPair(kills, radiantKey, direKey, { left: radiantKey }));

      roTowers.value.textContent = '';
      roTowers.value.appendChild(Hub.killsPair(
        { radiant: S.towersDown.radiant[i], dire: S.towersDown.dire[i] }, radiantKey, direKey, { left: radiantKey }));

      var back = Math.max(0, i - opts.lookback);
      var d = (s.kind === 'pair' ? gold : metricVals[i]) - (s.kind === 'pair' ? S.goldAdvantage[back] : metricVals[back]);
      roDelta.value.textContent = d === 0
        ? fmt.goldSigned(0) + ' level'
        : fmt.goldSigned(Math.abs(d)) + ' ' + tagOf(d > 0 ? direKey : radiantKey);
      roDelta.value.classList.toggle('is-dire', d > 0);
      roDelta.value.classList.toggle('is-radiant', d < 0);
      roDelta.item.firstChild.textContent = back === i ? 'From the start' : 'Since ' + M.clockAt[back];

      /* Timeline.phaseAt returns {id, label, from, to}, the id is the key */
      var ph = T.phaseAt(i);
      var phKey = ph ? (ph.id || ph.key) : null;
      if (ph && phKey !== lastPhase) {
        lastPhase = phKey;
        roPhase.textContent = ph.label;
        roPhase.className = 'chip mt-eco-phasechip mt-eco-phasechip--' + phKey;
        for (var p = 0; p < phaseTiles.length; p++) {
          var on = phaseTiles[p].phase.key === phKey;
          phaseTiles[p].el.classList.toggle('is-on', on);
          if (on) phaseTiles[p].el.setAttribute('aria-current', 'true');
          else phaseTiles[p].el.removeAttribute('aria-current');
        }
      }

      var moment = T.snapAtOrBefore(i);
      if (moment) {
        roMomentTime.textContent = moment.seconds !== null && moment.seconds !== undefined
          ? fmt.clock(moment.seconds) : M.clockAt[moment.index];
        roMomentText.textContent = moment.label || moment.short;
      } else {
        roMomentTime.textContent = '';
        roMomentText.textContent = 'No moment at or before this reading.';
      }

      plot.setAttribute('aria-valuenow', String(i));
      /* at a zero advantage the word replaces the number, the way the master
         strip says it, instead of trailing an empty ", level" after a 0 */
      var metricWord = s.metric === 'xp' ? 'experience' : 'gold';
      var vt = clock + ', ' + (leadKey
          ? metricWord + ' advantage ' + fmt.num(Math.abs(adv)) + ' to ' + nameOf(leadKey)
          : metricWord + ' level') +
        ', kills ' + Hub.killsPairText(kills, radiantKey, direKey, { left: radiantKey });
      plot.setAttribute('aria-valuetext', vt);
      speak(vt, st.state);
    }

    /* ============================================================
       5. Wiring
       ============================================================ */

    /* the ghost cursor: this chart's own preview, drawn from the callback and
       cleared on leave. Nothing outside this SVG changes. */
    function drawGhost(frac, i) {
      if (!ghost || !geom) return;
      if (frac === null) { ghost.g.setAttribute('visibility', 'hidden'); return; }
      var s = geom.s;
      var gx = (i / LAST) * geom.W;
      var adv = s.kind === 'pair' ? S.goldAdvantage[i] : s.values[i];
      var gy = geom.y(adv);
      var lead = adv === 0 ? null : (adv > 0 ? direKey : radiantKey);
      var valueText = adv === 0
        ? 'level'
        : fmt.goldSigned(Math.abs(adv)) + ' ' + tagOf(lead);
      ghost.clock.textContent = M.clockAt[i];
      ghost.value.textContent = valueText;
      var boxW = Math.max(76, 7 + valueText.length * 6.1);
      var bx = gx + 8;
      if (bx + boxW > geom.W - 2) bx = gx - 8 - boxW;
      if (bx < 2) bx = 2;
      ghost.line.setAttribute('x1', String(gx));
      ghost.line.setAttribute('x2', String(gx));
      ghost.dot.setAttribute('cx', String(gx));
      ghost.dot.setAttribute('cy', String(gy));
      ghost.box.setAttribute('x', String(bx));
      ghost.box.setAttribute('width', String(boxW));
      ghost.clock.setAttribute('x', String(bx + 6));
      ghost.value.setAttribute('x', String(bx + 6));
      ghost.g.setAttribute('visibility', 'visible');
    }

    T.attachScrubSurface(plot, { keyboard: true, onPreview: drawGhost });
    T.subscribe(apply);

    draw();

    var raf = 0;
    var lastW = plot.clientWidth;
    function onResize() {
      if (raf) return;
      raf = global.requestAnimationFrame(function () {
        raf = 0;
        var w = plot.clientWidth;
        if (Math.abs(w - lastW) < 2) return;
        lastW = w;
        draw();
      });
    }
    /* Phase 4 remount: the observer and the window listener outlive this
       mount's subtree, so both register their undo with the Hub. Without it
       a five game switch leaves five observers watching five detached plots. */
    if (global.ResizeObserver) {
      var ro = new global.ResizeObserver(onResize);
      ro.observe(plot);
      if (Hub.onUnmount) Hub.onUnmount(function () { ro.disconnect(); });
    } else {
      global.addEventListener('resize', onResize);
      if (Hub.onUnmount) Hub.onUnmount(function () { global.removeEventListener('resize', onResize); });
    }
  });

}(window));
