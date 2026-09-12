/* ============================================================
   match/wards.js
   #m-wards : the ward map. Every observer and sentry in the game,
   placed on the Dota 2 minimap, read at the timeline's index.

   The data rule, never a guess. A ward is ALIVE at index i when
     placedSeconds <= secondsAt[i] &&
     (leftSeconds === null || leftSeconds > secondsAt[i])

   The coordinate rule, from G5.wards.coordinate, is the one function
   place() below. OpenDota ward x and y are cells on the 128 cell
   playable grid, so both run 64 to 192:
     fx = (x - 64) / 128        left to right
     fy = 1 - (y - 64) / 128    top to bottom
   which puts the Radiant fountain bottom left and the Dire fountain
   top right, the way every minimap draws it.

   The art under it is OpenDota's patch 7.40 terrain render, which is
   square and covers that same grid edge to edge, so the two need no
   offset and no padding term. Checked against the art: the map centre
   (cell 128, 128) lands on the centre of the image, the mid lane is
   the fx + fy = 1 diagonal and the early game position clouds from the
   match record fall on the lane roads the art draws. OpenDota's own
   overlay divides by 127 rather than 128; that is the discrete bin
   form of the same rule and it puts cell 128 about 0.4 per cent off
   the centre of the art, so 128 it is.

   Owns: .mt-wd-* only. Reads MatchTimeline, never keeps its own
   index. The subscriber writes classes and text, never geometry.
   ============================================================ */
(function (global) {
  'use strict';

  var Hub = global.Hub;
  if (!Hub || typeof Hub.register !== 'function') return;

  var h = Hub.h;
  var svg = Hub.svg;

  /* ---- 9. options with defaults ---- */
  var DEFAULTS = {
    mode: 'minute',          /* 'minute' = alive at the index, 'all' = every placement */
    side: 'both',            /* 'both' | 'radiant' | 'dire' */
    showObservers: true,
    showSentries: true,
    showCircles: true,       /* the vision and true sight circles */
    windowSeconds: 60,       /* the vision events window, either side of the current second */
    pulseSeconds: 60,        /* a ward that left this recently still pulses at its spot */
    maxEvents: 10,           /* rows in the vision events list */
    clusterCells: 8,         /* whole game mode: cells that count as the same cluster */
    clusterFull: 4,          /* neighbours that make a cluster fully opaque */
    viewBox: 1000            /* the square the map is drawn in */
  };

  /* the terrain art, resolved against the page, not against this script */
  var MAP_ART = 'assets/map/minimap.jpg';

  function clamp01(v) { return v < 0 ? 0 : (v > 1 ? 1 : v); }

  Hub.register('m-wards', function (mount, ctx) {
    var G5 = ctx.G5 || {};
    var T = ctx.Timeline;
    var W = G5.wards;
    if (!T || !W || !G5.minutes || !G5.players) return;

    var opts = {};
    var userOpts = (global.MatchWardsOptions || {});
    for (var k in DEFAULTS) {
      if (Object.prototype.hasOwnProperty.call(DEFAULTS, k)) {
        opts[k] = Object.prototype.hasOwnProperty.call(userOpts, k) ? userOpts[k] : DEFAULTS[k];
      }
    }

    var M = G5.minutes;
    var LAST = M.last;
    var SEC = M.secondsAt;
    var VB = opts.viewBox;
    var COORD = W.coordinate;
    var TAG = { radiant: G5.match.radiant.tag, dire: G5.match.dire.tag };
    var TEAM = { radiant: G5.match.radiant.displayName || G5.match.radiant.name,
                 dire: G5.match.dire.displayName || G5.match.dire.name };
    var OTHER = { radiant: 'dire', dire: 'radiant' };

    /* ---- geometry, computed once ---- */
    var CELLS = COORD.cells;
    var UNITS = COORD.unitsPerCell;
    var OBS_R = (COORD.observerVisionUnits / UNITS) / CELLS * VB;
    var SEN_R = (COORD.sentryTrueSightUnits / UNITS) / CELLS * VB;

    /* ---- the one transform ----
       A ward's cell pair becomes a fraction of the map, fx left to right and
       fy top to bottom, and the same fraction is a place in the viewBox and a
       place on the art, because the art covers the grid edge to edge. Nothing
       else in this module turns an x and a y into a position. The clamp is for
       the handful of wards a fraction of a cell outside the grid. */
    function place(ward) {
      var fx = clamp01((ward.x - COORD.xMin) / CELLS);
      var fy = clamp01(1 - (ward.y - COORD.yMin) / CELLS);
      return { fx: fx, fy: fy,
        x: Math.round(fx * VB * 10) / 10,
        y: Math.round(fy * VB * 10) / 10 };
    }

    var PLAYER = {};
    G5.players.forEach(function (p) { PLAYER[p.key] = p; });

    var ALL = W.observers.concat(W.sentries).slice().sort(function (a, b) {
      return a.placedSeconds - b.placedSeconds || a.id - b.id;
    });

    /* the index a second belongs to: the first reading at or after it, so
       pinning a placement always lands on a minute where the ward is up and
       pinning a deward always lands on the minute that shows its pulse */
    function indexOf(seconds) {
      if (seconds <= 0) return 0;
      return Math.max(0, Math.min(LAST, Math.ceil(seconds / 60)));
    }

    /* ============================================================
       1. Derived series. One pass, then every readout is an array
          read at the index and nothing on screen can disagree.
       ============================================================ */
    var sides = ['radiant', 'dire'];
    var aliveObs = { radiant: [], dire: [] };
    var aliveSen = { radiant: [], dire: [] };
    var placedAt = { radiant: [], dire: [] };
    var dewardsAt = { radiant: [], dire: [] };
    var perPlayerAt = {};
    G5.players.forEach(function (p) {
      perPlayerAt[p.key] = { obs: [], sen: [], killed: [] };
    });

    (function buildSeries() {
      for (var i = 0; i <= LAST; i++) {
        var cut = SEC[i];
        var counts = {};
        sides.forEach(function (s) {
          counts[s] = { obs: 0, sen: 0, placed: 0, dew: 0 };
        });
        var per = {};
        G5.players.forEach(function (p) { per[p.key] = { obs: 0, sen: 0, killed: 0 }; });

        for (var a = 0; a < ALL.length; a++) {
          var w = ALL[a];
          if (w.placedSeconds <= cut) {
            counts[w.side].placed += 1;
            per[w.playerKey][w.kind === 'observer' ? 'obs' : 'sen'] += 1;
            if (w.leftSeconds === null || w.leftSeconds > cut) {
              counts[w.side][w.kind === 'observer' ? 'obs' : 'sen'] += 1;
            }
          }
          if (w.dewardedByKey && w.leftSeconds !== null && w.leftSeconds <= cut) {
            counts[PLAYER[w.dewardedByKey].side].dew += 1;
            per[w.dewardedByKey].killed += 1;
          }
        }
        sides.forEach(function (s) {
          aliveObs[s].push(counts[s].obs);
          aliveSen[s].push(counts[s].sen);
          placedAt[s].push(counts[s].placed);
          dewardsAt[s].push(counts[s].dew);
        });
        G5.players.forEach(function (p) {
          perPlayerAt[p.key].obs.push(per[p.key].obs);
          perPlayerAt[p.key].sen.push(per[p.key].sen);
          perPlayerAt[p.key].killed.push(per[p.key].killed);
        });
      }
    })();

    var barMax = 1;
    W.perPlayer.forEach(function (r) {
      barMax = Math.max(barMax, r.observersPlaced + r.sentriesPlaced);
    });

    /* the vision events feed: every placement and every deward, in time order */
    var EVENTS = [];
    ALL.forEach(function (w) {
      EVENTS.push({ seconds: w.placedSeconds, type: 'placed', ward: w, actorKey: w.playerKey });
      if (w.dewardedByKey && w.leftSeconds !== null) {
        EVENTS.push({ seconds: w.leftSeconds, type: 'dewarded', ward: w, actorKey: w.dewardedByKey });
      }
    });
    EVENTS.sort(function (a, b) { return a.seconds - b.seconds; });

    /* whole game mode: how crowded each observer spot is. The number is the
       module's, keyed by ward id in DENSITY, never written back onto the
       shared records in G5.wards: the data agent owns those. */
    var DENSITY = {};
    (function density() {
      var r = opts.clusterCells / CELLS;
      var obs = W.observers;
      var f = [];
      obs.forEach(function (w) { var q = place(w); f.push([q.fx, q.fy]); });
      for (var i = 0; i < obs.length; i++) {
        var n = 0;
        for (var j = 0; j < obs.length; j++) {
          if (i === j) continue;
          var dx = f[i][0] - f[j][0], dy = f[i][1] - f[j][1];
          if (dx * dx + dy * dy <= r * r) n += 1;
        }
        DENSITY[obs[i].id] = Math.min(1, n / opts.clusterFull);
      }
    })();

    /* ============================================================
       2. The map
       ============================================================ */
    var mapSvg = svg('svg', {
      'class': 'mt-wd-svg',
      viewBox: '0 0 ' + VB + ' ' + VB,
      preserveAspectRatio: 'xMidYMid meet',
      role: 'img',
      'aria-label': 'The Dota 2 minimap with every observer and sentry of the game placed on it'
    });

    /* The terrain is the game's own minimap art. It is square and it covers the
       whole playable grid edge to edge, so preserveAspectRatio none is exact
       rather than a crop. It is the bottom layer: the vision circles, the
       markers, the pulses and the focus ring are all appended after it. */
    var terrain = svg('g', { 'class': 'mt-wd-terrain', 'aria-hidden': 'true' },
      svg('image', {
        'class': 'mt-wd-art',
        href: MAP_ART, x: '0', y: '0', width: String(VB), height: String(VB),
        preserveAspectRatio: 'none'
      }),
      /* a thin wash over the art, so a side coloured eye or ring keeps its
         contrast over the bright lane roads and the Radiant grass. The number
         is measured, not chosen: see wards.css and map-image-notes.md */
      svg('rect', { 'class': 'mt-wd-wash', x: '0', y: '0', width: String(VB), height: String(VB) }));

    mapSvg.appendChild(terrain);

    var visionLayer = svg('g', { 'class': 'mt-wd-vision-layer' });
    var markerLayer = svg('g', { 'class': 'mt-wd-markers' });
    mapSvg.appendChild(visionLayer);
    mapSvg.appendChild(markerLayer);

    /* ============================================================
       3. One node per ward, built once, keyed by ward id
       ============================================================ */
    var marks = [];

    function wardTitle(w) {
      var who = PLAYER[w.playerKey];
      var kind = w.kind === 'observer' ? 'Observer' : 'Sentry';
      var line = kind + ', ' + who.handle + ' (' + who.heroDisplay + ', ' + TAG[w.side] +
        '), placed ' + w.placedClock;
      if (w.leftReason === 'dewarded') {
        line += ', dewarded ' + w.leftClock + (w.dewardedByLabel ? ' by ' + w.dewardedByLabel : '');
      } else if (w.leftReason === 'expired') {
        line += ', expired ' + w.leftClock;
      } else {
        line += ', still up at the final whistle';
      }
      return line;
    }

    function glyphFor(w) {
      if (w.kind === 'observer') {
        return svg('g', { 'class': 'mt-wd-glyph' },
          svg('path', { 'class': 'mt-wd-eye',
            d: 'M-12 0 Q 0 -9.5 12 0 Q 0 9.5 -12 0 Z' }),
          svg('circle', { 'class': 'mt-wd-pupil', r: '3.4' }));
      }
      return svg('g', { 'class': 'mt-wd-glyph' },
        svg('circle', { 'class': 'mt-wd-ring', r: '7.5' }),
        svg('circle', { 'class': 'mt-wd-pupil', r: '2.8' }));
    }

    ALL.forEach(function (w) {
      var d = DENSITY[w.id] || 0;
      var p = place(w);
      var cx = p.x, cy = p.y;
      var pos = 'translate(' + cx + ' ' + cy + ')';
      var circle = svg('circle', {
        'class': 'mt-wd-vision is-' + w.side + ' is-' + w.kind,
        cx: String(cx), cy: String(cy),
        r: String(Math.round((w.kind === 'observer' ? OBS_R : SEN_R) * 10) / 10)
      });
      visionLayer.appendChild(circle);

      var pulse = svg('g', { 'class': 'mt-wd-pulse' },
        svg('path', { 'class': 'mt-wd-cross', d: 'M-8 -8 L8 8 M8 -8 L-8 8' }),
        svg('circle', { 'class': 'mt-wd-fade', r: '13' }));

      var g = svg('g', {
        'class': 'mt-wd-w mt-wd-w--' + w.kind + ' is-' + w.side,
        transform: pos,
        style: '--mt-wd-d:' + d,
        'data-ward-id': String(w.id),
        'data-player-key': w.playerKey,
        'data-testid': 'ward-marker'
      }, glyphFor(w), pulse, svg('title', { text: wardTitle(w) }));

      g.addEventListener('mouseenter', function () { hold(w); T.highlightPlayer(w.playerKey); });
      g.addEventListener('mouseleave', function () { release(); T.highlightPlayer(null); });
      g.addEventListener('click', function () { T.set(indexOf(w.placedSeconds)); hold(w); });

      marks.push({ ward: w, g: g, circle: circle, d: d, shown: null, circleOn: null, pulse: null });
    });
    marks.forEach(function (m) { markerLayer.appendChild(m.g); });

    /* ============================================================
       4. Controls
       ============================================================ */
    function segBtn(label, on, fn) {
      return h('button', {
        type: 'button', 'class': 'm-seg-btn', 'aria-pressed': on ? 'true' : 'false',
        onclick: fn
      }, label);
    }

    var modeBtns = [];
    var modeSeg = h('div', { 'class': 'm-seg mt-wd-seg', role: 'group', 'aria-label': 'What the map shows' });
    [['minute', 'At this minute'], ['all', 'Whole game']].forEach(function (pair) {
      var b = segBtn(pair[1], opts.mode === pair[0], function () {
        opts.mode = pair[0];
        modeBtns.forEach(function (x) { x.el.setAttribute('aria-pressed', x.id === opts.mode ? 'true' : 'false'); });
        root.classList.toggle('is-mode-all', opts.mode === 'all');
        cursorIndex = -1;
        repaint();
      });
      modeBtns.push({ id: pair[0], el: b });
      modeSeg.appendChild(b);
    });

    var sideBtns = [];
    var sideSeg = h('div', { 'class': 'm-seg mt-wd-seg', role: 'group', 'aria-label': 'Which side to show' });
    [['both', 'Both'], ['radiant', TAG.radiant], ['dire', TAG.dire]].forEach(function (pair) {
      var b = segBtn(pair[1], opts.side === pair[0], function () {
        opts.side = pair[0];
        sideBtns.forEach(function (x) { x.el.setAttribute('aria-pressed', x.id === opts.side ? 'true' : 'false'); });
        cursorIndex = -1;
        repaint();
      });
      if (pair[0] === 'radiant') b.classList.add('is-radiant');
      if (pair[0] === 'dire') b.classList.add('is-dire');
      sideBtns.push({ id: pair[0], el: b });
      sideSeg.appendChild(b);
    });

    /* one of Observers and Sentries always stays on, so the map is never
       blank and the state is never unrecoverable. The chip that is the only
       live kind refuses its own click, and says so: aria-disabled for as long
       as it is the last one standing, so the refusal is legible. */
    var kindBtns = {};
    function otherKind(key) { return key === 'showObservers' ? 'showSentries' : 'showObservers'; }
    function isLastKind(key) { return !!opts[key] && !opts[otherKind(key)]; }

    function paintKindChips() {
      Object.keys(kindBtns).forEach(function (key) {
        var b = kindBtns[key];
        var locked = isLastKind(key);
        b.setAttribute('aria-pressed', opts[key] ? 'true' : 'false');
        b.setAttribute('aria-disabled', locked ? 'true' : 'false');
        b.classList.toggle('is-locked', locked);
      });
    }

    function kindBtn(label, key) {
      var b = h('button', {
        type: 'button', 'class': 'chip-filter mt-wd-kindbtn',
        'aria-pressed': opts[key] ? 'true' : 'false',
        onclick: function () {
          if (isLastKind(key)) return;
          opts[key] = !opts[key];
          paintKindChips();
          cursorIndex = -1;
          repaint();
        }
      }, label);
      kindBtns[key] = b;
      return b;
    }
    var obsBtn = kindBtn('Observers', 'showObservers');
    var senBtn = kindBtn('Sentries', 'showSentries');
    paintKindChips();

    var circleBtn = h('button', {
      type: 'button', 'class': 'chip-filter mt-wd-kindbtn',
      'aria-pressed': opts.showCircles ? 'true' : 'false',
      onclick: function () {
        opts.showCircles = !opts.showCircles;
        circleBtn.setAttribute('aria-pressed', opts.showCircles ? 'true' : 'false');
        root.classList.toggle('is-nocircles', !opts.showCircles);
        repaint();
      }
    }, 'Vision circles');

    var clockChip = h('span', { 'class': 'mt-wd-clock u-tnum' }, '');

    /* ============================================================
       5. Panel
       ============================================================ */
    function readoutItem(label, cls) {
      var val = h('span', { 'class': 'm-readout-value' + (cls ? ' ' + cls : '') }, '');
      return { el: h('span', { 'class': 'm-readout-item' },
        h('span', { 'class': 'm-readout-label' }, label), val), val: val };
    }

    var rdAliveR = readoutItem(TAG.radiant + ' live', 'is-radiant');
    var rdAliveD = readoutItem(TAG.dire + ' live', 'is-dire');
    var rdPlacedR = readoutItem(TAG.radiant + ' placed', 'is-radiant');
    var rdPlacedD = readoutItem(TAG.dire + ' placed', 'is-dire');
    var rdDewR = readoutItem(TAG.radiant + ' dewards', 'is-radiant');
    var rdDewD = readoutItem(TAG.dire + ' dewards', 'is-dire');

    /* COMPACT, 2026-09-12: the headline is what is ALIVE at this minute, one
       line, both sides. Placed and dewarded keep their items and keep being
       painted; they move into the details panel with the per player bars. */
    var readoutMain = h('div', { 'class': 'm-readout mt-wd-readout mt-wd-readout--main' },
      rdAliveR.el, rdAliveD.el);
    var readoutMore = h('div', { 'class': 'm-readout mt-wd-readout mt-wd-readout--more' },
      rdPlacedR.el, rdPlacedD.el, rdDewR.el, rdDewD.el);

    var dewardTip = Hub.infoTip
      ? Hub.infoTip('A ward counts as alive at a minute when it was placed at or before that ' +
          'minute and had not left the map by it. A deward is credited to the side of the player ' +
          'OpenDota names as the killer, at the second the ward left the map.',
          /* A11Y-2, 2026-09-12: this tip and the map tip below both asked for
             the id 'mt-wd-rule', so both captions were stamped
             mt-wd-rule-caption and the second button's aria-controls resolved
             to the first button's caption. One id each. */
          { id: 'mt-wd-countrule', label: 'How these counts are worked out' })
      : null;

    var playerRows = [];
    var playersWrap = h('div', { 'class': 'mt-wd-players' });
    G5.players.forEach(function (p) {
      var obsFill = h('span', { 'class': 'm-bar-fill mt-wd-fill mt-wd-fill--obs m-bar-fill--' + p.side });
      var senFill = h('span', { 'class': 'm-bar-fill mt-wd-fill mt-wd-fill--sen' });
      var nObs = h('b', { 'class': 'u-tnum' }, '0');
      var nSen = h('b', { 'class': 'u-tnum' }, '0');
      var nKill = h('b', { 'class': 'u-tnum' }, '0');
      var row = h('div', {
        'class': 'mt-wd-prow m-hl is-' + p.side,
        dataset: { playerKey: p.key, playerId: p.rdyPlayerId === null ? '' : String(p.rdyPlayerId) },
        'data-testid': 'player-card',
        onmouseenter: function () { T.highlightPlayer(p.key); },
        onmouseleave: function () { T.highlightPlayer(null); }
      },
        Hub.avatar(p, p.teamKey, 'sm'),
        h('span', { 'class': 'mt-wd-pname u-truncate' }, p.handle),
        h('span', { 'class': 'm-bar-track mt-wd-track' }, obsFill, senFill),
        h('span', { 'class': 'mt-wd-pnums' }, nObs, h('i', null, 'obs'), nSen, h('i', null, 'sen'),
          nKill, h('i', null, 'killed')));
      playersWrap.appendChild(row);
      playerRows.push({ p: p, row: row, obsFill: obsFill, senFill: senFill,
        nObs: nObs, nSen: nSen, nKill: nKill });
    });

    var eventsList = h('div', { 'class': 'mt-wd-events', 'data-testid': 'wards-events' });
    var eventsEmpty = h('p', { 'class': 'mt-wd-empty' }, '');

    var caption = h('p', { 'class': 'mt-wd-caption', id: 'm-wards-caption',
      'data-testid': 'wards-caption' }, '');
    var live = h('p', { 'class': 'u-sr-only mt-wd-live' }, '');

    var legend = h('div', { 'class': 'm-legend mt-wd-legend' },
      h('span', { 'class': 'm-legend-item' },
        h('span', { 'class': 'mt-wd-key mt-wd-key--obs' }), 'Observer, vision ' +
        Hub.fmt.num(COORD.observerVisionUnits) + ' units'),
      h('span', { 'class': 'm-legend-item' },
        h('span', { 'class': 'mt-wd-key mt-wd-key--sen' }), 'Sentry, true sight ' +
        Hub.fmt.num(COORD.sentryTrueSightUnits) + ' units'),
      h('span', { 'class': 'm-legend-item' },
        h('span', { 'class': 'mt-wd-key mt-wd-key--dew' }), 'Dewarded, in the killer colour'),
      h('span', { 'class': 'm-legend-item' },
        h('span', { 'class': 'm-swatch m-swatch--radiant' }), TEAM.radiant + ', Radiant'),
      h('span', { 'class': 'm-legend-item' },
        h('span', { 'class': 'm-swatch m-swatch--dire' }), TEAM.dire + ', Dire'));

    var mapBox = h('div', {
      'class': 'mt-wd-map',
      tabindex: '0',
      role: 'group',
      'aria-describedby': 'm-wards-caption',
      'aria-label': 'Ward map. Left and right arrows move through the wards on the map, ' +
        'Enter goes to the minute a ward was placed.'
    }, mapSvg);

    /* COMP-4, 2026-09-12: compact hides the card subtitle, so the one rule it
       carried gets an info affordance beside the title instead of vanishing. */
    var WD_RULE = 'Ward positions from the match record on the Dota 2 minimap.';
    var ruleTip = Hub.infoTip
      ? Hub.infoTip(WD_RULE, { id: 'mt-wd-maprule', label: 'What this map shows' })
      : null;

    /* every figure the panel used to print, one click away and still live */
    var detailsExp = Hub.expander({
      id: 'mt-wd-details',
      count: G5.players.length,
      className: 'mt-wd-exp',
      /* COMP-5, 2026-09-12: the panel is not only the per player counts, so
         the label names the whole payload. The events list is a window on the
         clock, so it is named and not counted. */
      label: function (n) {
        return 'Show ward counts for ' + n + ' players, vision events and the key';
      },
      hideLabel: 'Hide the ward counts, the events and the key',
      content: h('div', { 'class': 'mt-wd-more' },
        readoutMore,
        h('div', { 'class': 'mt-wd-block' },
          h('div', { 'class': 'm-sub' }, 'Wards placed up to this minute'), playersWrap),
        h('div', { 'class': 'mt-wd-block' },
          h('div', { 'class': 'm-sub' }, 'Vision events'), eventsList, eventsEmpty),
        legend)
    });
    if (Hub.onUnmount) Hub.onUnmount(detailsExp.destroy);

    var root = h('section', {
      'class': 'card mt-wd' + (opts.mode === 'all' ? ' is-mode-all' : '') +
        (opts.showCircles ? '' : ' is-nocircles'),
      'data-testid': 'match-wards'
    },
      h('div', { 'class': 'card-header mt-wd-header' },
        h('div', { 'class': 'titles' },
          h('h2', { 'class': 'title' }, 'Vision'),
          h('div', { 'class': 'subtitle' }, WD_RULE)),
        h('div', { 'class': 'action mt-wd-actions' }, clockChip, ruleTip, modeSeg)),
      h('div', { 'class': 'card-body mt-wd-body' },
        h('div', { 'class': 'mt-wd-bar' }, sideSeg,
          h('span', { 'class': 'mt-wd-chips' }, obsBtn, senBtn, circleBtn)),
        h('div', { 'class': 'mt-wd-grid' },
          h('div', { 'class': 'mt-wd-mapcol' }, mapBox, caption),
          h('div', { 'class': 'mt-wd-panel' },
            h('div', { 'class': 'mt-wd-aliveline' }, readoutMain, dewardTip),
            detailsExp.root)),
        live));

    mount.textContent = '';
    mount.appendChild(root);

    var speak = T.quietLive(live, root);

    /* ============================================================
       6. Painting. Classes and text only, never geometry.
       ============================================================ */
    var held = null;          /* the ward under the pointer or the keyboard cursor */
    var cursorIndex = -1;     /* position in the visible list, for the keyboard */
    var visible = [];
    var lastPaint = -1;
    var lastState = '';

    function passesFilter(w) {
      if (!opts.showObservers && w.kind === 'observer') return false;
      if (!opts.showSentries && w.kind === 'sentry') return false;
      if (opts.side !== 'both' && w.side !== opts.side) return false;
      return true;
    }

    function aliveAt(w, cut) {
      return w.placedSeconds <= cut && (w.leftSeconds === null || w.leftSeconds > cut);
    }

    function paintMap(i) {
      var cut = SEC[i];
      var all = opts.mode === 'all';
      visible = [];
      for (var n = 0; n < marks.length; n++) {
        var m = marks[n], w = m.ward;
        var ok = passesFilter(w);
        var live_ = ok && (all || aliveAt(w, cut));
        var pulse = '';
        if (ok && !all && !live_ && w.leftSeconds !== null &&
            w.leftSeconds <= cut && w.leftSeconds > cut - opts.pulseSeconds) {
          pulse = w.leftReason === 'dewarded' ? 'dewarded' : 'expired';
        }
        var shown = live_ || !!pulse;
        if (shown !== m.shown) {
          m.g.classList.toggle('is-shown', shown);
          m.shown = shown;
        }
        var circleOn = live_ && !all;
        if (circleOn !== m.circleOn) {
          m.circle.classList.toggle('is-shown', circleOn);
          m.circleOn = circleOn;
        }
        if (pulse !== m.pulse) {
          m.g.classList.remove('is-pulse-dewarded', 'is-pulse-expired');
          if (pulse) m.g.classList.add('is-pulse-' + pulse);
          m.pulse = pulse;
        }
        if (shown) visible.push(m);
      }
      /* a ward the reader was holding can leave the map when the index moves.
         Let it go rather than caption a marker that is no longer drawn. */
      if (held && heldMark && !heldMark.shown) release();
    }

    function paintPanel(i) {
      rdAliveR.val.textContent = aliveObs.radiant[i] + ' obs, ' + aliveSen.radiant[i] + ' sen';
      rdAliveD.val.textContent = aliveObs.dire[i] + ' obs, ' + aliveSen.dire[i] + ' sen';
      rdPlacedR.val.textContent = String(placedAt.radiant[i]);
      rdPlacedD.val.textContent = String(placedAt.dire[i]);
      rdDewR.val.textContent = String(dewardsAt.radiant[i]);
      rdDewD.val.textContent = String(dewardsAt.dire[i]);

      playerRows.forEach(function (r) {
        var o = perPlayerAt[r.p.key].obs[i];
        var s = perPlayerAt[r.p.key].sen[i];
        r.nObs.textContent = String(o);
        r.nSen.textContent = String(s);
        r.nKill.textContent = String(perPlayerAt[r.p.key].killed[i]);
        r.obsFill.style.width = (o / barMax * 100) + '%';
        r.senFill.style.width = (s / barMax * 100) + '%';
        r.senFill.style.left = (o / barMax * 100) + '%';
      });
    }

    function plural(n, one, many) { return n + ' ' + (Math.abs(n) === 1 ? one : many); }

    function eventText(ev) {
      var w = ev.ward;
      var kind = w.kind === 'observer' ? 'observer' : 'sentry';
      if (ev.type === 'placed') {
        return PLAYER[w.playerKey].handle + (kind === 'observer' ? ' places an observer' : ' places a sentry');
      }
      var by = ev.actorKey ? PLAYER[ev.actorKey].handle : null;
      return (by || TAG[OTHER[w.side]]) + ' kills a ' + PLAYER[w.playerKey].handle + ' ' + kind;
    }

    /* The rows are a pool: maxEvents buttons built once, with their listeners
       bound to a mutable slot, so a frame writes text and classes and hides
       the spare rows. Nothing is created or destroyed while the index moves,
       and a keyboard user on a row keeps their focus. */
    var eventSlots = [];
    (function buildEventRows() {
      for (var n = 0; n < opts.maxEvents; n++) {
        var slot = { ev: null, clockText: null, label: null, side: null, type: null, key: null };
        slot.clock = h('span', { 'class': 'mt-wd-ev-clock u-tnum' }, '');
        slot.text = h('span', { 'class': 'mt-wd-ev-text u-truncate' }, '');
        slot.btn = (function (s) {
          return h('button', {
            type: 'button', 'class': 'mt-wd-event m-hl',
            onclick: function () {
              if (!s.ev) return;
              T.set(indexOf(s.ev.seconds));
              hold(s.ev.ward);
            },
            onmouseenter: function () {
              if (!s.ev) return;
              hold(s.ev.ward);
              T.highlightPlayer(s.ev.actorKey || s.ev.ward.playerKey);
            },
            onmouseleave: function () { release(); T.highlightPlayer(null); },
            onfocus: function () { if (s.ev) hold(s.ev.ward); }
          }, s.clock, h('span', { 'class': 'mt-wd-ev-dot' }), s.text);
        }(slot));
        slot.btn.hidden = true;
        eventsList.appendChild(slot.btn);
        eventSlots.push(slot);
      }
    })();

    function paintEvents(i) {
      var cut = SEC[i];
      var lo = cut - opts.windowSeconds, hi = cut + opts.windowSeconds;
      var rows = [];
      for (var n = EVENTS.length - 1; n >= 0 && rows.length < opts.maxEvents; n--) {
        var ev = EVENTS[n];
        if (ev.seconds > hi || ev.seconds < lo) continue;
        rows.push(ev);
      }
      for (var s = 0; s < eventSlots.length; s++) {
        var slot = eventSlots[s];
        var row = rows[s] || null;
        if (!row) {
          if (slot.ev) { slot.ev = null; slot.btn.hidden = true; }
          continue;
        }
        var w = row.ward;
        var colourSide = row.type === 'placed' ? w.side : PLAYER[row.actorKey].side;
        var key = row.actorKey || w.playerKey;
        var clockText = row.type === 'placed' ? w.placedClock : w.leftClock;
        var label = eventText(row);
        slot.ev = row;
        slot.btn.hidden = false;
        if (slot.clockText !== clockText) { slot.clock.textContent = clockText; slot.clockText = clockText; }
        if (slot.label !== label) { slot.text.textContent = label; slot.label = label; }
        if (slot.side !== colourSide) {
          slot.btn.classList.remove('is-radiant', 'is-dire');
          slot.btn.classList.add('is-' + colourSide);
          slot.side = colourSide;
        }
        if (slot.type !== row.type) {
          slot.btn.classList.remove('is-placed', 'is-dewarded');
          slot.btn.classList.add('is-' + row.type);
          slot.type = row.type;
        }
        if (slot.key !== key) { slot.btn.dataset.playerKey = key; slot.key = key; }
        slot.btn.classList.toggle('is-hl', !!T.highlighted && T.highlighted === key);
      }
      eventsEmpty.hidden = rows.length > 0;
      if (!rows.length) {
        eventsEmpty.textContent = 'No ward went up or down inside the window around ' +
          M.clockAt[i] + '.';
      }
    }

    function captionFor(i) {
      if (held) return wardTitle(held);
      if (opts.mode === 'all') {
        return 'Every ward of the game: ' + plural(W.observers.length, 'observer', 'observers') +
          ' and ' + plural(W.sentries.length, 'sentry', 'sentries') + '. ' + TAG.radiant +
          ' placed ' + (W.totals.radiant.observers + W.totals.radiant.sentries) + ', ' + TAG.dire +
          ' placed ' + (W.totals.dire.observers + W.totals.dire.sentries) + '.';
      }
      return 'At ' + M.clockAt[i] + ': ' + TAG.radiant + ' hold ' +
        plural(aliveObs.radiant[i], 'observer', 'observers') + ' and ' +
        plural(aliveSen.radiant[i], 'sentry', 'sentries') + ', ' + TAG.dire + ' hold ' +
        plural(aliveObs.dire[i], 'observer', 'observers') + ' and ' +
        plural(aliveSen.dire[i], 'sentry', 'sentries') + '. Hover a ward for who placed it and ' +
        'how it left.';
    }

    function paintCaption(i, state) {
      var text = captionFor(i);
      caption.textContent = text;
      speak(text, state);
    }

    var heldMark = null;
    function markFor(w) {
      for (var n = 0; n < marks.length; n++) { if (marks[n].ward === w) return marks[n]; }
      return null;
    }
    function hold(w) {
      if (heldMark) heldMark.g.classList.remove('is-held');
      held = w;
      heldMark = markFor(w);
      if (heldMark) heldMark.g.classList.add('is-held');
      /* the real state, not a hard coded one: quietLive only arms the live
         region while the timeline is idle, so the keyboard walk through the
         wards has to pass the truth through or it is silent */
      paintCaption(T.index, T.state);
    }
    function release() {
      if (heldMark) heldMark.g.classList.remove('is-held');
      heldMark = null;
      held = null;
      paintCaption(T.index, T.state);
    }

    /* the chip is the one element a reader scans to know what the map means,
       so it is painted by every path that can change the map, not only by a
       move of the index */
    function paintClock(i) {
      var all = opts.mode === 'all';
      clockChip.textContent = all ? 'Whole game' : 'Live at ' + M.clockAt[i];
      clockChip.classList.toggle('is-final', !all && i >= LAST);
    }

    function repaint() {
      var i = T.index;
      paintMap(i);
      paintPanel(i);
      paintEvents(i);
      paintClock(i);
      paintCaption(i, T.state);
    }

    function apply(st) {
      var i = st.index;
      if (i !== lastPaint) {
        lastPaint = i;
        paintMap(i);
        paintPanel(i);
        paintEvents(i);
        paintClock(i);
        paintCaption(i, st.state);
      } else if (st.state !== lastState) {
        paintCaption(i, st.state);
      }
      lastState = st.state;
      root.classList.toggle('is-playing', !!st.playing);
    }

    /* ============================================================
       7. Keyboard: the map is one tab stop, arrows walk the wards
       ============================================================ */
    mapBox.addEventListener('keydown', function (e) {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      if (!visible.length) return;
      var key = e.key;
      if (key === 'ArrowRight' || key === 'ArrowDown') {
        e.preventDefault();
        cursorIndex = (cursorIndex + 1) % visible.length;
      } else if (key === 'ArrowLeft' || key === 'ArrowUp') {
        e.preventDefault();
        cursorIndex = (cursorIndex <= 0 ? visible.length : cursorIndex) - 1;
      } else if (key === 'Home') {
        e.preventDefault();
        cursorIndex = 0;
      } else if (key === 'End') {
        e.preventDefault();
        cursorIndex = visible.length - 1;
      } else if (key === 'Enter') {
        if (cursorIndex >= 0 && visible[cursorIndex]) {
          e.preventDefault();
          T.set(indexOf(visible[cursorIndex].ward.placedSeconds));
        }
        return;
      } else if (key === 'Escape') {
        cursorIndex = -1;
        release();
        return;
      } else {
        return;
      }
      hold(visible[cursorIndex].ward);
      T.highlightPlayer(visible[cursorIndex].ward.playerKey);
    });
    mapBox.addEventListener('blur', function () {
      cursorIndex = -1;
      release();
      T.highlightPlayer(null);
    });

    /* ============================================================
       8. Wiring
       ============================================================ */
    T.onHighlight(function (key) {
      root.classList.toggle('is-hl', !!key);
      for (var n = 0; n < marks.length; n++) {
        marks[n].g.classList.toggle('is-hl', !!key && marks[n].ward.playerKey === key);
      }
      playerRows.forEach(function (r) { r.row.classList.toggle('is-hl', !!key && r.p.key === key); });
      eventSlots.forEach(function (s) { s.btn.classList.toggle('is-hl', !!key && s.key === key); });
    });

    T.subscribe(apply);
    repaint();
  });

}(window));
