/* ------------------------------------------------------------------
   match/players.js  ->  #m-players
   Player comparison: pick any two of the ten, a six axis radar
   normalised to the MATCH high in every stat, a stat bar list with one
   geometry for every row, a gold earned chart bound to the master
   timeline, a ten player damage panel and the hero of the game.

   Rules this module keeps:
   - one array is the whole truth. Final figures come from
     G5.players[].final, per minute figures from
     G5.players[].perMinute[MatchTimeline.index]. Nothing is typed.
   - the radar and the bars share one normalisation rule: value over the
     match high for that stat, across all ten players. Never the pair
     max, so two shapes can differ (Phase 1 findings F15, V07).
   - every polygon vertex and every bar width is computed from the same
     array, so a shape can never drift from the number beside it
     (F16, V06).
   - every bar row has identical track geometry (V03).
   - selection is a small custom event, so the scoreboard can drive it.

   Options, all with defaults, override with window.MatchPlayersOptions
   before this file runs.
   ------------------------------------------------------------------ */
(function (global) {
  'use strict';

  var Hub = global.Hub;
  if (!Hub || typeof Hub.register !== 'function') return;

  var h = Hub.h;
  var svg = Hub.svg;
  var fmt = Hub.fmt;

  var DEFAULTS = {
    slotA: 'yatoro',
    slotB: 'satanic',
    selectEvent: 'mt:select-player',
    radar: {
      size: 380, height: 330, radius: 100, rings: 4, labelGap: 38,
      valueGap: 14, valueMinR: 34, valueSpread: 10, valueSpreadUpright: 22,
      mode: 'live'   /* 'live' follows the timeline, 'final' reads the aggregates */
    },
    chart: { width: 760, height: 214, pad: 22, tickEvery: 10 },
    damageMetric: 'heroDamage',
    crossHighlight: true,
    testid: 'player-comparison'
  };

  function assign(target) {
    for (var i = 1; i < arguments.length; i++) {
      var src = arguments[i];
      if (!src) continue;
      for (var k in src) if (Object.prototype.hasOwnProperty.call(src, k)) target[k] = src[k];
    }
    return target;
  }

  function at(arr, i) {
    if (!arr || !arr.length) return null;
    return arr[Math.max(0, Math.min(i, arr.length - 1))];
  }

  var N = function (v) { return fmt.num(v); };
  var ONE = function (v) { return (Math.round(v * 10) / 10).toFixed(1); };

  /* the six radar axes, clockwise from the top */
  var RADAR_AXES = [
    { id: 'kills', label: 'Kills', get: function (f) { return f.kills; }, print: String },
    { id: 'assists', label: 'Assists', get: function (f) { return f.assists; }, print: String },
    { id: 'heroDamage', label: 'Hero dmg', get: function (f) { return f.heroDamage; }, print: N },
    { id: 'towerDamage', label: 'Tower dmg', get: function (f) { return f.towerDamage; }, print: N },
    { id: 'lastHits', label: 'Last hits', get: function (f) { return f.lastHits; }, print: N },
    { id: 'netWorth', label: 'Net worth', get: function (f) { return f.netWorth; }, print: N }
  ];

  /* radar-ignores-clock: the six final axes above are aggregates, so four of
     them (assists, hero damage, tower damage, net worth) have no per minute
     array in the record and cannot honestly be drawn at a minute. The live
     radar therefore draws the six quantities OpenDota does report every
     minute. Both sets are normalised to the match high, so a shape at minute
     12 and a shape at minute 64 are read on the same scale. */
  var RADAR_AXES_LIVE = [
    { id: 'kills', label: 'Kills', series: 'kills', print: String },
    { id: 'deaths', label: 'Deaths', series: 'deaths', print: String },
    { id: 'lastHits', label: 'Last hits', series: 'lastHits', print: N },
    { id: 'denies', label: 'Denies', series: 'denies', print: N },
    { id: 'level', label: 'Level', series: 'level', print: String },
    { id: 'gold', label: 'Net worth', series: 'gold', print: N }
  ];

  /* the bar list. Same normalisation as the radar: the match high */
  var BAR_ROWS = [
    { id: 'kills', label: 'Kills', get: function (f) { return f.kills; }, print: String },
    { id: 'deaths', label: 'Deaths', get: function (f) { return f.deaths; }, print: String, lower: true },
    { id: 'assists', label: 'Assists', get: function (f) { return f.assists; }, print: String },
    { id: 'kda', label: 'KDA ratio', get: function (f) { return f.kda; }, print: ONE },
    { id: 'level', label: 'Level', get: function (f) { return f.level; }, print: String },
    { id: 'lastHits', label: 'Last hits', get: function (f) { return f.lastHits; }, print: N },
    { id: 'denies', label: 'Denies', get: function (f) { return f.denies; }, print: N },
    { id: 'gpm', label: 'GPM', get: function (f) { return f.gpm; }, print: N },
    { id: 'xpm', label: 'XPM', get: function (f) { return f.xpm; }, print: N },
    { id: 'netWorth', label: 'Net worth', get: function (f) { return f.netWorth; }, print: N },
    { id: 'heroDamage', label: 'Hero damage', get: function (f) { return f.heroDamage; }, print: N },
    { id: 'towerDamage', label: 'Tower damage', get: function (f) { return f.towerDamage; }, print: N },
    { id: 'heroHealing', label: 'Healing', get: function (f) { return f.heroHealing; }, print: N },
    { id: 'damageTaken', label: 'Damage taken', get: function (f) { return f.damageTaken; }, print: N, lower: true }
  ];

  var DAMAGE_METRICS = [
    { id: 'heroDamage', label: 'Hero damage', get: function (f) { return f.heroDamage; } },
    { id: 'towerDamage', label: 'Tower damage', get: function (f) { return f.towerDamage; } },
    { id: 'heroHealing', label: 'Healing', get: function (f) { return f.heroHealing; } },
    { id: 'damageTaken', label: 'Damage taken', get: function (f) { return f.damageTaken; } }
  ];

  Hub.register('m-players', function (mount, ctx) {
    var G5 = ctx.G5;
    var Timeline = ctx.Timeline;
    if (!G5 || !G5.players || !G5.players.length || !Timeline) return;

    var opts = assign({}, DEFAULTS, global.MatchPlayersOptions || {});
    opts.radar = assign({}, DEFAULTS.radar, (global.MatchPlayersOptions || {}).radar);
    opts.chart = assign({}, DEFAULTS.chart, (global.MatchPlayersOptions || {}).chart);

    var players = G5.players.slice();
    var byKey = {};
    players.forEach(function (p) { byKey[p.key] = p; });

    var last = Timeline.last;

    /* the match high for every stat we draw, over all ten players */
    var HIGH = {};
    function high(id, get) {
      if (HIGH[id] !== undefined) return HIGH[id];
      var best = 0;
      players.forEach(function (p) {
        var v = get(p.final);
        if (typeof v === 'number' && v > best) best = v;
      });
      HIGH[id] = best;
      return best;
    }
    RADAR_AXES.forEach(function (a) { high(a.id, a.get); });
    /* the live axes are read off the arrays, so their high is the highest
       reading any of the ten posted at any minute of the game */
    var HIGH_LIVE = {};
    RADAR_AXES_LIVE.forEach(function (a) {
      var best = 0;
      players.forEach(function (p) {
        var arr = p.perMinute && p.perMinute[a.series];
        if (!arr) return;
        for (var i = 0; i < arr.length; i++) if (arr[i] > best) best = arr[i];
      });
      HIGH_LIVE[a.id] = best || 1;
    });
    BAR_ROWS.forEach(function (r) { high(r.id, r.get); });
    DAMAGE_METRICS.forEach(function (m) { high(m.id, m.get); });

    /* ---------- selection state ---------- */
    var slots = [
      byKey[opts.slotA] ? opts.slotA : players[0].key,
      byKey[opts.slotB] ? opts.slotB : players[1].key
    ];
    var oldest = 0; /* the slot that the next pick replaces */

    /* ---------- build ---------- */
    var picker = buildPicker();
    var headline = buildHeadline();
    var radar = buildRadar();
    var bars = buildBars();
    var chart = buildChart();
    var damage = buildDamage();
    var hotg = buildTopPerformer();

    /* radar-ignores-clock: the radar's own two state control. It moves the
       radar only; every other panel already follows the master timeline. */
    var segLive = h('button', {
      type: 'button', 'class': 'm-seg-btn', 'aria-pressed': 'true',
      onclick: function () { setRadarMode('live'); }
    }, 'At this minute');
    var segFinal = h('button', {
      type: 'button', 'class': 'm-seg-btn', 'aria-pressed': 'false',
      onclick: function () { setRadarMode('final'); }
    }, 'Final');
    var radarSeg = h('div', { 'class': 'm-seg mt-pl-radarseg', role: 'group', 'aria-label': 'Radar reading' }, segLive, segFinal);

    function setRadarMode(next) {
      radar.setMode(next);
      segLive.setAttribute('aria-pressed', next === 'live' ? 'true' : 'false');
      segFinal.setAttribute('aria-pressed', next === 'final' ? 'true' : 'false');
      radarChip.textContent = next === 'live' ? Timeline.clockAt(Timeline.index) : G5.match.durationClock;
    }
    var radarChip = h('span', { 'class': 'chip chip--outline mt-pl-radarclock u-tnum' }, '');

    var root = h('section', {
      'class': 'card mt-pl',
      'data-testid': opts.testid
    },
      h('div', { 'class': 'card-header' },
        h('div', { 'class': 'titles' },
          h('h2', { 'class': 'title' }, 'Player comparison'),
          h('div', { 'class': 'subtitle' },
            'Pick any two of the ten. Every axis and every bar runs from zero to the highest figure anyone posted in this game.')
        ),
        h('div', { 'class': 'action' }, radarSeg)
      ),
      picker.el,
      /* players-dead-space: the radar is 380 wide and 330 tall while the two
         player cards beside it ran out 170px short, leaving a 620 by 170 hole
         in the middle of the card. The two columns now carry balanced stacks:
         the radar with the ten player damage panel under it, the cards with
         the fourteen stat rows under them. */
      h('div', { 'class': 'mt-pl-top' },
        h('div', { 'class': 'mt-pl-radarcol' },
          h('div', { 'class': 'mt-pl-radarhead' },
            h('span', { 'class': 'm-sub' }, 'Radar'), radarChip),
          radar.el,
          h('p', { 'class': 'mt-pl-caption' },
            'Each axis runs from zero to the match high in that stat, so a full vertex means nobody did more. The faint outline is the same player at the final whistle.'),
          hotg),
        h('div', { 'class': 'mt-pl-sidecol' }, headline.el, bars.el)
      ),
      chart.el,
      damage.el
    );

    mount.appendChild(root);

    /* ---------- wiring ---------- */
    document.addEventListener(opts.selectEvent, function (ev) {
      var d = (ev && ev.detail) || {};
      if (!d.key || !byKey[d.key]) return;
      select(d.key, d.slot);
    });

    var paintedIndex = null;
    var stopSub = Timeline.subscribe(function (s) {
      if (paintedIndex === s.index) return;
      paintedIndex = s.index;
      paintIndex(s.index);
    });

    var stopHl = null;
    if (opts.crossHighlight && typeof Timeline.onHighlight === 'function') {
      stopHl = Timeline.onHighlight(function (key) {
        var nodes = root.querySelectorAll('[data-player-key]');
        for (var i = 0; i < nodes.length; i++) {
          nodes[i].classList.toggle('is-hl', nodes[i].getAttribute('data-player-key') === key);
        }
      });
    }

    var cursorEl = chart.cursor;
    var stopCursor = Timeline.subscribe(function (s) {
      var f = Math.max(0, Math.min(1, s.position / s.last));
      cursorEl.style.setProperty('--x', String(f));
      chart.plot.classList.toggle('is-scrubbing', s.state === 'scrubbing');
      chart.plot.classList.toggle('is-playing', !!s.playing);
    });

    root.addEventListener('mt:destroy', function () {
      if (stopSub) stopSub();
      if (stopHl) stopHl();
      if (stopCursor) stopCursor();
      if (chart.detach) chart.detach();
    });

    selectionChanged();

    /* ==============================================================
       picker: all ten, two slots, click replaces the older slot
       ============================================================== */
    function buildPicker() {
      var btns = {};
      function group(side) {
        var team = side === 'radiant' ? G5.match.radiant : G5.match.dire;
        var list = players.filter(function (p) { return p.side === side; })
          .sort(function (a, b) { return a.pos - b.pos; });
        var row = h('div', { 'class': 'mt-pl-pgroup mt-pl-pgroup--' + side },
          h('span', { 'class': 'mt-pl-pteam' },
            Hub.teamCrest(team.key, 'sm'),
            h('span', { 'class': 'mt-pl-pteamname' }, team.tag),
            h('span', { 'class': 'chip chip--' + side }, side === 'radiant' ? 'Radiant' : 'Dire')
          ),
          list.map(function (p) {
            var btn = h('button', {
              type: 'button',
              'class': 'mt-pl-pbtn m-hl',
              'data-player-key': p.key,
              'data-player-id': p.key,
              'aria-pressed': 'false',
              title: p.handle + ', ' + p.heroDisplay,
              onclick: function () { select(p.key, null); },
              onmouseenter: function () { if (opts.crossHighlight) Timeline.highlightPlayer(p.key); },
              onmouseleave: function () { if (opts.crossHighlight) Timeline.highlightPlayer(null); },
              onfocus: function () { if (opts.crossHighlight) Timeline.highlightPlayer(p.key); },
              onblur: function () { if (opts.crossHighlight) Timeline.highlightPlayer(null); }
            },
              Hub.avatar(p, p.teamKey, 'sm'),
              h('span', { 'class': 'mt-pl-pname' }, p.handle),
              h('span', { 'class': 'mt-pl-pslot' }, '')
            );
            btns[p.key] = btn;
            return btn;
          })
        );
        return row;
      }

      var el = h('div', { 'class': 'mt-pl-picker', 'data-testid': 'player-picker' },
        group('radiant'), group('dire'));
      return { el: el, btns: btns };
    }

    /* ==============================================================
       headline: the two chosen players, side by side
       ============================================================== */
    function buildHeadline() {
      function stat(label) {
        var v = h('span', { 'class': 'mt-pl-hsv u-tnum' }, '');
        return { el: h('span', { 'class': 'mt-pl-hstat' }, h('span', { 'class': 'mt-pl-hsl' }, label), v), v: v };
      }

      function card(slot) {
        var photo = h('span', { 'class': 'mt-pl-hphoto' });
        var handle = h('span', { 'class': 'mt-pl-hhandle' }, '');
        var hero = h('span', { 'class': 'mt-pl-hhero' }, '');
        var line = h('span', { 'class': 'mt-pl-hline u-tnum' }, '');
        var nw = h('span', { 'class': 'mt-pl-hnw u-tnum' }, '');
        var atLabel = h('span', { 'class': 'mt-pl-hatlabel u-tnum' }, '');
        var gold = stat('Gold'), lvl = stat('Level'), kd = stat('K / D'), share = stat('Team share');
        var el = h('div', {
          'class': 'mt-pl-hcard m-hl mt-pl-hcard--' + slot,
          'data-slot': slot,
          'data-player-key': ''
        },
          h('span', { 'class': 'mt-pl-htop' },
            h('span', { 'class': 'mt-pl-hbadge' }, slot.toUpperCase()),
            photo,
            h('span', { 'class': 'mt-pl-hnames' }, handle, hero,
              /* radar-ignores-clock: the final figures sat unlabelled directly
                 above the at-this-minute block, so two temporalities read as
                 one column. The boundary is now explicit. */
              h('span', { 'class': 'mt-pl-hfinal' },
                h('span', { 'class': 'mt-pl-hfinal-label' }, 'Final'), line, nw))
          ),
          h('span', { 'class': 'mt-pl-hat' },
            atLabel,
            h('span', { 'class': 'mt-pl-hstats' }, gold.el, lvl.el, kd.el, share.el)
          )
        );
        return {
          el: el, photo: photo, handle: handle, hero: hero, line: line, nw: nw,
          atLabel: atLabel, gold: gold.v, lvl: lvl.v, kd: kd.v, share: share.v
        };
      }
      var a = card('a'), b = card('b');
      var el = h('div', { 'class': 'mt-pl-headline' }, a.el, b.el);
      return { el: el, a: a, b: b };
    }

    /* ==============================================================
       radar
       ============================================================== */
    function buildRadar() {
      var R = opts.radar.radius;
      var W = opts.radar.size, H = opts.radar.height;
      var cx = W / 2, cy = 158;

      function point(axisIndex, t) {
        var ang = (-90 + axisIndex * (360 / RADAR_AXES.length)) * Math.PI / 180;
        return [cx + Math.cos(ang) * R * t, cy + Math.sin(ang) * R * t];
      }

      var gridEls = [];
      for (var r = 1; r <= opts.radar.rings; r++) {
        var t = r / opts.radar.rings;
        var pts = RADAR_AXES.map(function (a, k) { return point(k, t); });
        gridEls.push(svg('polygon', {
          'class': 'mt-pl-ring' + (r === opts.radar.rings ? ' mt-pl-ring--outer' : ''),
          points: pts.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' ')
        }));
      }

      var spokes = RADAR_AXES.map(function (a, k) {
        var p = point(k, 1);
        return svg('line', { 'class': 'mt-pl-spoke', x1: cx, y1: cy, x2: p[0].toFixed(1), y2: p[1].toFixed(1) });
      });

      var labels = RADAR_AXES.map(function (a, k) {
        var ang = (-90 + k * 60) * Math.PI / 180;
        var lx = cx + Math.cos(ang) * (R + opts.radar.labelGap);
        var ly = cy + Math.sin(ang) * (R + opts.radar.labelGap);
        var anchor = 'middle';
        if (Math.cos(ang) > 0.3) anchor = 'start';
        else if (Math.cos(ang) < -0.3) anchor = 'end';
        var dy = Math.sin(ang) > 0.3 ? 10 : (Math.sin(ang) < -0.3 ? -2 : 4);
        return svg('text', {
          'class': 'mt-pl-axis', x: lx.toFixed(1), y: (ly + dy).toFixed(1), 'text-anchor': anchor
        }, a.label);
      });

      function series(slot) {
        /* the ghost is the same player's shape at the final reading, so a
           reader at minute 12 sees how far each of them still had to go */
        var ghost = svg('polygon', { 'class': 'mt-pl-ghost mt-pl-ghost--' + slot, points: '' });
        var poly = svg('polygon', { 'class': 'mt-pl-shape mt-pl-shape--' + slot, points: '' });
        var dots = RADAR_AXES.map(function () {
          return svg('circle', { 'class': 'mt-pl-vdot mt-pl-vdot--' + slot, r: 3.2, cx: cx, cy: cy });
        });
        var texts = RADAR_AXES.map(function () {
          return svg('text', { 'class': 'mt-pl-vval mt-pl-vval--' + slot, x: cx, y: cy, 'text-anchor': 'middle' }, '');
        });
        return { ghost: ghost, poly: poly, dots: dots, texts: texts };
      }

      var sa = series('a'), sb = series('b');

      var node = svg('svg', {
        'class': 'mt-pl-radar',
        viewBox: '0 0 ' + W + ' ' + H,
        width: W, height: H,
        role: 'img',
        'aria-label': 'Radar of six final statistics for the two selected players, each axis scaled to the match high'
      },
        gridEls, spokes, labels,
        sa.ghost, sb.ghost,
        sa.poly, sb.poly,
        sa.dots, sb.dots,
        sa.texts, sb.texts
      );

      /* radar-ignores-clock: mode 'live' reads the per minute arrays at the
         master timeline's index, mode 'final' reads the aggregate record.
         The axis maxima are always the match high, so the shape at minute 12
         and the shape at the whistle are comparable. */
      var mode = opts.radar.mode === 'final' ? 'final' : 'live';
      var paintedIndex = last;

      function axesNow() { return mode === 'live' ? RADAR_AXES_LIVE : RADAR_AXES; }
      function highNow(axis) {
        return (mode === 'live' ? HIGH_LIVE[axis.id] : HIGH[axis.id]) || 1;
      }
      function valueAt(axis, p, i) {
        if (mode !== 'live') return axis.get(p.final);
        var arr = p.perMinute && p.perMinute[axis.series];
        if (!arr || !arr.length) return 0;
        var j = i < 0 ? 0 : (i >= arr.length ? arr.length - 1 : i);
        return arr[j];
      }

      function paintLabels() {
        axesNow().forEach(function (a, k) { labels[k].textContent = a.label; });
        node.setAttribute('aria-label', mode === 'live'
          ? 'Radar of six per minute statistics for the two selected players at the current minute, each axis scaled to the match high'
          : 'Radar of six final statistics for the two selected players, each axis scaled to the match high');
      }

      function setMode(next) {
        mode = next === 'final' ? 'final' : 'live';
        paintLabels();
        paint(paintedIndex);
      }

      function paint(i) {
        if (typeof i !== 'number') i = paintedIndex;
        paintedIndex = i;
        var axes = axesNow();
        var showGhost = mode === 'live' && i < last;
        [['a', sa], ['b', sb]].forEach(function (pair) {
          var slot = pair[0], s = pair[1];
          var p = byKey[slots[slot === 'a' ? 0 : 1]];
          var pts = [];
          var gpts = [];
          axes.forEach(function (axis, k) {
            var v = valueAt(axis, p, i);
            var hi = highNow(axis);
            var t = Math.max(0, Math.min(1, v / hi));
            var pt = point(k, t);
            pts.push(pt);
            if (showGhost) {
              var gv = valueAt(axis, p, last);
              gpts.push(point(k, Math.max(0, Math.min(1, gv / hi))));
            }
            s.dots[k].setAttribute('cx', pt[0].toFixed(1));
            s.dots[k].setAttribute('cy', pt[1].toFixed(1));
            /* the value sits just outside its own vertex, on the axis,
               with the two slots split either side of it, so a number
               never lands on a line or on the other player's number */
            var ang = (-90 + k * (360 / RADAR_AXES.length)) * Math.PI / 180;
            var dirX = Math.cos(ang), dirY = Math.sin(ang);
            var upright = Math.abs(dirX) < 0.3;
            var rr = Math.min(Math.max(R * t + opts.radar.valueGap, opts.radar.valueMinR), R - opts.radar.valueGap);
            var spread = (upright ? opts.radar.valueSpreadUpright : opts.radar.valueSpread) * (slot === 'a' ? -1 : 1);
            var offX = -dirY * spread, offY = dirX * spread;
            s.texts[k].setAttribute('x', (cx + dirX * rr + offX).toFixed(1));
            s.texts[k].setAttribute('y', (cy + dirY * rr + offY + 4).toFixed(1));
            s.texts[k].setAttribute('text-anchor',
              upright ? (offX >= 0 ? 'start' : 'end') : (dirX > 0 ? 'start' : 'end'));
            s.texts[k].textContent = axis.print(v);
          });
          s.poly.setAttribute('points', pts.map(function (q) { return q[0].toFixed(1) + ',' + q[1].toFixed(1); }).join(' '));
          s.ghost.setAttribute('points', gpts.map(function (q) { return q[0].toFixed(1) + ',' + q[1].toFixed(1); }).join(' '));
          s.ghost.setAttribute('data-side', p.side);
          s.ghost.style.display = showGhost ? '' : 'none';
          s.poly.setAttribute('data-side', p.side);
          s.dots.forEach(function (d) { d.setAttribute('data-side', p.side); });
          s.texts.forEach(function (t2) { t2.setAttribute('data-side', p.side); });
        });
        declutter();
      }

      /* Two values on the same axis, or two low values from different
         axes, can land on the same pixels. Measure the twelve boxes once
         per selection and push the collisions apart vertically. The axis
         names never move. */
      function declutter() {
        var fixed = [], movable = [];
        labels.forEach(function (t) { var b = boxOf(t); if (b) fixed.push({ box: b, movable: false }); });
        [sa, sb].forEach(function (s) {
          s.texts.forEach(function (t) {
            var b = boxOf(t);
            if (b) movable.push({ el: t, box: b, movable: true, y: parseFloat(t.getAttribute('y')) });
          });
        });
        if (!movable.length) return;

        for (var pass = 0; pass < 8; pass++) {
          var any = false;
          for (var i = 0; i < movable.length; i++) {
            var A = movable[i];
            var others = movable.slice(0, i).concat(movable.slice(i + 1)).concat(fixed);
            for (var j = 0; j < others.length; j++) {
              var B = others[j];
              if (!hitBox(A.box, B.box)) continue;
              any = true;
              var over = Math.min(A.box.y + A.box.h, B.box.y + B.box.h) - Math.max(A.box.y, B.box.y) + 1.5;
              var dir = (A.box.y + A.box.h / 2) <= (B.box.y + B.box.h / 2) ? -1 : 1;
              if (B.movable) { shiftY(A, dir * over / 2); shiftY(B, -dir * over / 2); }
              else { shiftY(A, dir * over); }
            }
          }
          if (!any) break;
        }
      }

      function boxOf(t) {
        try {
          var b = t.getBBox();
          if (!b || (!b.width && !b.height)) return null;
          return { x: b.x, y: b.y, w: b.width, h: b.height };
        } catch (e) { return null; }
      }

      function hitBox(a, b) {
        return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
      }

      function shiftY(item, dy) {
        var next = Math.max(14, Math.min(H - 6, item.y + dy));
        dy = next - item.y;
        item.y = next;
        item.box.y += dy;
        item.el.setAttribute('y', next.toFixed(1));
      }

      paintLabels();
      return {
        el: h('div', { 'class': 'mt-pl-radarwrap' }, node),
        paint: paint,
        setMode: setMode,
        getMode: function () { return mode; }
      };
    }

    /* ==============================================================
       stat bars: one geometry for every row
       ============================================================== */
    function buildBars() {
      var rows = BAR_ROWS.map(function (r) {
        var va = h('span', { 'class': 'mt-pl-bval mt-pl-bval--a u-tnum' }, '');
        var vb = h('span', { 'class': 'mt-pl-bval mt-pl-bval--b u-tnum' }, '');
        var fa = h('span', { 'class': 'm-bar-fill mt-pl-bfill mt-pl-bfill--a' });
        var fb = h('span', { 'class': 'm-bar-fill mt-pl-bfill mt-pl-bfill--b' });
        var hi = h('span', { 'class': 'mt-pl-bhigh u-tnum' }, r.print(HIGH[r.id]));
        var el = h('div', { 'class': 'mt-pl-brow', 'data-stat': r.id },
          h('span', { 'class': 'mt-pl-blabel' }, r.label,
            r.lower ? h('span', { 'class': 'mt-pl-blow', title: 'lower is better' }, 'low') : null),
          va,
          h('span', { 'class': 'm-bar-track mt-pl-btrack mt-pl-btrack--a' }, fa),
          h('span', { 'class': 'm-bar-track mt-pl-btrack mt-pl-btrack--b' }, fb),
          vb,
          hi
        );
        return { def: r, el: el, va: va, vb: vb, fa: fa, fb: fb };
      });

      var head = h('div', { 'class': 'mt-pl-bhead' },
        h('span', { 'class': 'mt-pl-blabel m-sub' }, 'Stat'),
        h('span', { 'class': 'mt-pl-bval m-sub mt-pl-bhead-a' }, 'A'),
        h('span', { 'class': 'mt-pl-btrack m-sub' }, ''),
        h('span', { 'class': 'mt-pl-btrack m-sub' }, ''),
        h('span', { 'class': 'mt-pl-bval m-sub mt-pl-bhead-b' }, 'B'),
        h('span', { 'class': 'mt-pl-bhigh m-sub' }, 'Match high')
      );

      var el = h('div', { 'class': 'mt-pl-bars', 'data-testid': 'player-stat-bars' },
        head,
        h('div', { 'class': 'mt-pl-browlist' }, rows.map(function (r) { return r.el; })),
        h('p', { 'class': 'mt-pl-bnote' },
          'Both tracks in a row are the same width and the same scale: the right hand figure is the ' +
          'highest anyone posted in this game, and a full bar means that player set it. Rows marked low ' +
          'are the ones where less is better.')
      );

      function paint() {
        var pa = byKey[slots[0]], pb = byKey[slots[1]];
        rows.forEach(function (row) {
          var d = row.def;
          var hi = HIGH[d.id] || 1;
          var a = d.get(pa.final), b = d.get(pb.final);
          row.va.textContent = d.print(a);
          row.vb.textContent = d.print(b);
          row.fa.style.width = (Math.max(0, Math.min(1, a / hi)) * 100).toFixed(2) + '%';
          row.fb.style.width = (Math.max(0, Math.min(1, b / hi)) * 100).toFixed(2) + '%';
          row.el.setAttribute('data-lead', a === b ? 'tie' : (a > b ? 'a' : 'b'));
          row.fa.setAttribute('data-side', pa.side);
          row.fb.setAttribute('data-side', pb.side);
        });
        head.querySelector('.mt-pl-bhead-a').textContent = pa.handle;
        head.querySelector('.mt-pl-bhead-b').textContent = pb.handle;
      }

      return { el: el, paint: paint };
    }

    /* ==============================================================
       gold earned chart for the two, bound to the master timeline
       ============================================================== */
    function buildChart() {
      var W = opts.chart.width, H = opts.chart.height, PAD = opts.chart.pad;
      var plotBottom = H - PAD;
      var plotTop = 10;

      function x(i) { return last > 0 ? (i / last) * W : 0; }

      var ticks = [];
      for (var m = 0; m <= last; m += opts.chart.tickEvery) ticks.push(m);
      if (ticks[ticks.length - 1] !== last) {
        /* the final reading always gets a label. Drop the tick before it
           when the two would collide */
        if (ticks.length > 1 && last - ticks[ticks.length - 1] < opts.chart.tickEvery * 0.6) ticks.pop();
        ticks.push(last);
      }

      var grid = [];
      ticks.forEach(function (t, k) {
        grid.push(svg('line', {
          'class': 'mt-pl-cgrid', x1: x(t).toFixed(1), x2: x(t).toFixed(1),
          y1: plotTop, y2: plotBottom
        }));
        var tx = k === 0 ? 3 : (k === ticks.length - 1 ? W - 3 : x(t));
        grid.push(svg('text', {
          'class': 'mt-pl-ctick', x: tx.toFixed(1), y: H - 5,
          'text-anchor': k === 0 ? 'start' : (k === ticks.length - 1 ? 'end' : 'middle')
        }, t + 'm'));
      });

      var yLines = [];
      var yLabels = [];
      for (var g = 0; g < 4; g++) {
        yLines.push(svg('line', { 'class': 'mt-pl-cgrid mt-pl-cgrid--y', x1: 0, x2: W, y1: 0, y2: 0 }));
        yLabels.push(svg('text', { 'class': 'mt-pl-cylab', x: 3, y: 0 }, ''));
      }

      var pathA = svg('path', { 'class': 'mt-pl-cline mt-pl-cline--a', d: '' });
      var pathB = svg('path', { 'class': 'mt-pl-cline mt-pl-cline--b', d: '' });

      var node = svg('svg', {
        'class': 'mt-pl-chart',
        viewBox: '0 0 ' + W + ' ' + H,
        width: W, height: H,
        'aria-hidden': 'true'
      }, grid, yLines, yLabels, pathA, pathB);

      var dotA = h('span', { 'class': 'mt-pl-cdot mt-pl-cdot--a' });
      var dotB = h('span', { 'class': 'mt-pl-cdot mt-pl-cdot--b' });
      var cursor = h('div', { 'class': 'm-cursor mt-pl-cursor', style: '--x:1' },
        h('div', { 'class': 'm-cursor-line' }), dotA, dotB);

      var plot = h('div', {
        'class': 'mt-pl-plot',
        tabindex: '0',
        role: 'slider',
        'aria-label': 'Gold earned by the two selected players, minute by minute',
        'aria-valuemin': '0',
        'aria-valuemax': String(last),
        'aria-valuenow': String(last)
      }, node, cursor);

      var readGold = h('span', { 'class': 'm-readout-value u-tnum' }, '');
      var readGoldB = h('span', { 'class': 'm-readout-value u-tnum' }, '');
      var readGap = h('span', { 'class': 'm-readout-value u-tnum' }, '');
      var readClock = h('span', { 'class': 'm-readout-value u-tnum' }, '');
      var readLvl = h('span', { 'class': 'm-readout-value u-tnum' }, '');
      var readKd = h('span', { 'class': 'm-readout-value u-tnum' }, '');
      var labA = h('span', { 'class': 'm-readout-label' }, 'A gold');
      var labB = h('span', { 'class': 'm-readout-label' }, 'B gold');

      var readout = h('div', { 'class': 'm-readout mt-pl-readout' },
        h('div', { 'class': 'm-readout-item' }, h('span', { 'class': 'm-readout-label' }, 'Clock'), readClock),
        h('div', { 'class': 'm-readout-item' }, labA, readGold),
        h('div', { 'class': 'm-readout-item' }, labB, readGoldB),
        h('div', { 'class': 'm-readout-item' }, h('span', { 'class': 'm-readout-label' }, 'Gap'), readGap),
        h('div', { 'class': 'm-readout-item' }, h('span', { 'class': 'm-readout-label' }, 'Levels'), readLvl),
        h('div', { 'class': 'm-readout-item' }, h('span', { 'class': 'm-readout-label' }, 'K / D'), readKd)
      );

      var srLive = h('p', { 'class': 'u-sr-only', 'aria-live': 'polite' }, '');

      var legend = h('div', { 'class': 'm-legend mt-pl-clegend' },
        /* pl-same-team-colour: the swatch is a miniature of the line it labels,
           carrying its colour AND its dash, with the A or B badge beside it,
           so a legend entry maps to a line even when both players are on the
           same side and therefore share the side colour. */
        h('span', { 'class': 'm-legend-item' },
          h('span', { 'class': 'mt-pl-legbadge mt-pl-legbadge--a' }, 'A'),
          h('span', { 'class': 'm-swatch mt-pl-swatch mt-pl-swatch--a' }),
          h('span', { 'class': 'mt-pl-legname mt-pl-legname--a' }, '')),
        h('span', { 'class': 'm-legend-item' },
          h('span', { 'class': 'mt-pl-legbadge mt-pl-legbadge--b' }, 'B'),
          h('span', { 'class': 'm-swatch mt-pl-swatch mt-pl-swatch--b' }),
          h('span', { 'class': 'mt-pl-legname mt-pl-legname--b' }, '')),
        h('span', { 'class': 'm-legend-item mt-pl-leghint' }, 'Drag the plot, or use the arrow keys. It stays where you let go.')
      );

      var hint = h('span', { 'class': 'mt-pl-chint u-tnum' }, '');
      var el = h('div', { 'class': 'mt-pl-chartcard' },
        h('div', { 'class': 'mt-pl-chead' },
          h('h3', { 'class': 'mt-pl-h3' }, 'Gold earned, minute by minute'),
          hint
        ),
        readout,
        h('div', { 'class': 'mt-pl-plotwrap' }, plot),
        legend,
        srLive
      );

      var detach = Timeline.attachScrubSurface(plot, { keyboard: true });
      /* M-06: silent unless focus is inside this chart card */
      var speak = Timeline.quietLive ? Timeline.quietLive(srLive, el)
        : function (t) { srLive.textContent = t; };

      var yMax = 1;

      function paintSelection() {
        var pa = byKey[slots[0]], pb = byKey[slots[1]];
        var ga = pa.perMinute.gold, gb = pb.perMinute.gold;
        yMax = 0;
        for (var i = 0; i <= last; i++) {
          if (ga[i] > yMax) yMax = ga[i];
          if (gb[i] > yMax) yMax = gb[i];
        }
        yMax = Math.max(1, Math.ceil(yMax / 5000) * 5000);

        for (var g = 0; g < yLines.length; g++) {
          var v = yMax * ((g + 1) / (yLines.length + 1));
          var yy = yFor(v);
          yLines[g].setAttribute('y1', yy.toFixed(1));
          yLines[g].setAttribute('y2', yy.toFixed(1));
          yLabels[g].setAttribute('y', (yy - 3).toFixed(1));
          yLabels[g].textContent = fmt.gold(Math.round(v));
        }

        pathA.setAttribute('d', line(ga));
        pathB.setAttribute('d', line(gb));
        pathA.setAttribute('data-side', pa.side);
        pathB.setAttribute('data-side', pb.side);
        el.querySelector('.mt-pl-legname--a').textContent = pa.handle + ', ' + pa.heroDisplay;
        el.querySelector('.mt-pl-legname--b').textContent = pb.handle + ', ' + pb.heroDisplay;
        el.querySelector('.mt-pl-swatch--a').setAttribute('data-side', pa.side);
        el.querySelector('.mt-pl-swatch--b').setAttribute('data-side', pb.side);
        labA.textContent = pa.handle + ' gold';
        labB.textContent = pb.handle + ' gold';
      }

      function yFor(v) {
        var t = Math.max(0, Math.min(1, v / yMax));
        return plotBottom - t * (plotBottom - plotTop);
      }

      function line(arr) {
        var pts = [];
        for (var i = 0; i <= last; i++) pts.push([x(i), yFor(arr[i])]);
        return Hub.svgPath(pts, false);
      }

      function paintIndexLocal(i) {
        var pa = byKey[slots[0]], pb = byKey[slots[1]];
        var ga = at(pa.perMinute.gold, i), gb = at(pb.perMinute.gold, i);
        var clock = Timeline.clockAt(i);
        readClock.textContent = clock;
        readGold.textContent = N(ga);
        readGoldB.textContent = N(gb);
        readGap.textContent = (ga === gb ? '0' : (ga > gb ? '+' : '-') + N(Math.abs(ga - gb)));
        readGap.className = 'm-readout-value u-tnum ' + (ga === gb ? '' : (ga > gb ? 'is-' + pa.side : 'is-' + pb.side));
        readLvl.textContent = at(pa.perMinute.level, i) + ' / ' + at(pb.perMinute.level, i);
        readKd.textContent = at(pa.perMinute.kills, i) + '-' + at(pa.perMinute.deaths, i) +
          '  ' + at(pb.perMinute.kills, i) + '-' + at(pb.perMinute.deaths, i);

        dotA.style.setProperty('--y', (yFor(ga) / H).toFixed(4));
        dotB.style.setProperty('--y', (yFor(gb) / H).toFixed(4));

        plot.setAttribute('aria-valuenow', String(i));
        plot.setAttribute('aria-valuetext', clock + ', ' + pa.handle + ' ' + N(ga) + ' gold, ' + pb.handle + ' ' + N(gb) + ' gold');
        speak(clock + ', ' + pa.handle + ' ' + N(ga) + ' gold, ' + pb.handle + ' ' + N(gb) + ' gold', Timeline.state);
        hint.textContent = i >= last ? 'Final, ' + G5.match.durationClock : 'At ' + clock;
      }

      return {
        el: el, plot: plot, cursor: cursor, detach: detach,
        paintSelection: paintSelection, paintIndex: paintIndexLocal
      };
    }

    /* ==============================================================
       ten player damage panel
       ============================================================== */
    function buildDamage() {
      var metric = opts.damageMetric;

      var segBtns = DAMAGE_METRICS.map(function (m) {
        return h('button', {
          type: 'button', 'class': 'm-seg-btn mt-pl-dseg',
          'aria-pressed': m.id === metric ? 'true' : 'false',
          'data-metric': m.id,
          onclick: function () { setMetric(m.id); }
        }, m.label);
      });

      var seg = h('div', { 'class': 'm-seg', role: 'group', 'aria-label': 'Damage metric' }, segBtns);

      var list = h('div', { 'class': 'mt-pl-dlist' });
      var rows = players.map(function (p) {
        var fill = h('span', { 'class': 'm-bar-fill mt-pl-dfill', 'data-side': p.side });
        var val = h('span', { 'class': 'mt-pl-dval u-tnum' }, '');
        var rank = h('span', { 'class': 'mt-pl-drank u-tnum' }, '');
        var el = h('div', {
          'class': 'mt-pl-drow m-hl',
          'data-player-key': p.key,
          'data-player-id': p.key,
          'data-side': p.side,
          onmouseenter: function () { if (opts.crossHighlight) Timeline.highlightPlayer(p.key); },
          onmouseleave: function () { if (opts.crossHighlight) Timeline.highlightPlayer(null); }
        },
          rank,
          Hub.heroImg(p.hero, { side: p.side, size: 'sm', alt: p.heroDisplay }),
          h('span', { 'class': 'mt-pl-dname' },
            h('span', { 'class': 'mt-pl-dhandle' }, p.handle),
            h('span', { 'class': 'mt-pl-dhero' }, p.heroDisplay)),
          h('span', { 'class': 'm-bar-track mt-pl-dtrack' }, fill),
          val
        );
        list.appendChild(el);
        return { p: p, el: el, fill: fill, val: val, rank: rank };
      });

      var totals = h('div', { 'class': 'mt-pl-dtotals' });

      var el = h('div', { 'class': 'mt-pl-damage', 'data-testid': 'player-damage' },
        h('div', { 'class': 'mt-pl-dhead' },
          h('h3', { 'class': 'mt-pl-h3' }, 'All ten, sorted'),
          seg
        ),
        list,
        totals
      );

      function setMetric(id) {
        metric = id;
        segBtns.forEach(function (b) {
          b.setAttribute('aria-pressed', b.getAttribute('data-metric') === id ? 'true' : 'false');
        });
        paint();
      }

      function paint() {
        var def = null;
        DAMAGE_METRICS.forEach(function (m) { if (m.id === metric) def = m; });
        if (!def) return;
        var hi = HIGH[def.id] || 1;
        var sorted = rows.slice().sort(function (a, b) { return def.get(b.p.final) - def.get(a.p.final); });
        sorted.forEach(function (row, k) {
          var v = def.get(row.p.final);
          row.val.textContent = N(v);
          row.rank.textContent = String(k + 1);
          row.fill.style.width = (Math.max(0, Math.min(1, v / hi)) * 100).toFixed(2) + '%';
          row.el.classList.toggle('is-zero', !v);
          list.appendChild(row.el);
        });
        var tr = 0, td = 0;
        players.forEach(function (p) {
          if (p.side === 'radiant') tr += def.get(p.final); else td += def.get(p.final);
        });
        totals.textContent = '';
        totals.appendChild(h('span', { 'class': 'mt-pl-dtot u-tnum', 'data-side': 'radiant' },
          G5.match.radiant.tag + ' ' + N(tr)));
        totals.appendChild(h('span', { 'class': 'mt-pl-dtot u-tnum', 'data-side': 'dire' },
          G5.match.dire.tag + ' ' + N(td)));
        totals.appendChild(h('span', { 'class': 'mt-pl-dtotlab' }, def.label + ', team totals. Bars run to the match high, ' + N(hi) + '.'));
      }

      paint();
      return { el: el, paint: paint };
    }

    /* ==============================================================
       top performer

       NO NARRATIVE RULE C, 2026-09-11. Nobody picks a hero of the game. This
       is the argmax of a published points formula over the ten final stat
       lines, and the formula is printed in the card so the reader can redo the
       ranking from the table below it.
       ============================================================== */
    function buildTopPerformer() {
      var hg = G5.topPerformer;
      if (!hg) return null;
      var p = byKey[hg.playerKey];
      var link = Hub.link && Hub.link.player ? Hub.link.player(hg.rdyPlayerId) : null;

      var stats = [
        { label: 'Points', value: (Math.round(hg.points * 10) / 10).toFixed(1) },
        { label: 'K / D / A', value: hg.line },
        { label: 'Net worth', value: N(hg.netWorth) },
        { label: 'Net worth share', value: hg.netWorthSharePct + '%' }
      ];

      return h('div', {
        'class': 'mt-pl-hotg m-hl',
        'data-player-key': hg.playerKey,
        'data-player-id': hg.playerKey,
        'data-testid': 'top-performer',
        onmouseenter: function () { if (opts.crossHighlight) Timeline.highlightPlayer(hg.playerKey); },
        onmouseleave: function () { if (opts.crossHighlight) Timeline.highlightPlayer(null); }
      },
        h('div', { 'class': 'mt-pl-hotg-top' },
          h('span', { 'class': 'mt-pl-hotg-photo' }, Hub.avatar(p || hg, hg.teamKey, 'lg')),
          h('span', { 'class': 'mt-pl-hotg-names' },
            h('span', { 'class': 'chip chip--gold' }, 'Top performer'),
            h('span', { 'class': 'mt-pl-hotg-handle' },
              link ? Hub.extLink(link, { 'class': 'mt-pl-hotg-link' }, hg.handle) : hg.handle),
            h('span', { 'class': 'mt-pl-hotg-hero' },
              Hub.heroImg(hg.hero, { side: p ? p.side : 'dire', size: 'sm', alt: hg.heroDisplay }),
              h('span', null, hg.heroDisplay + ', ' + hg.realName))
          ),
          h('span', { 'class': 'mt-pl-hotg-stats' }, stats.map(function (s) {
            return h('span', { 'class': 'mt-pl-hotg-stat' },
              h('span', { 'class': 'm-readout-label' }, s.label),
              h('span', { 'class': 'm-readout-value u-tnum' }, s.value));
          }))
        ),
        h('p', { 'class': 'mt-pl-hotg-why' }, hg.rule),
        h('button', {
          type: 'button', 'class': 'btn btn-ghost btn-sm mt-pl-hotg-btn',
          onclick: function () { select(hg.playerKey, null); }
        }, 'Put ' + hg.handle + ' in the comparison')
      );
    }

    /* ==============================================================
       selection and paint
       ============================================================== */
    function select(key, slot) {
      if (!byKey[key]) return;
      var target;
      if (slot === 'a' || slot === 0) target = 0;
      else if (slot === 'b' || slot === 1) target = 1;
      else {
        if (slots[0] === key || slots[1] === key) return;
        target = oldest;
      }
      if (slots[target] === key) return;
      var other = target === 0 ? 1 : 0;
      if (slots[other] === key) { slots[other] = slots[target]; }
      slots[target] = key;
      oldest = target === 0 ? 1 : 0;
      selectionChanged();
    }

    function selectionChanged() {
      var pa = byKey[slots[0]], pb = byKey[slots[1]];

      Object.keys(picker.btns).forEach(function (k) {
        var btn = picker.btns[k];
        var isA = k === slots[0], isB = k === slots[1];
        btn.setAttribute('aria-pressed', (isA || isB) ? 'true' : 'false');
        btn.setAttribute('data-slot', isA ? 'a' : (isB ? 'b' : ''));
        btn.querySelector('.mt-pl-pslot').textContent = isA ? 'A' : (isB ? 'B' : '');
      });

      paintHeadline(headline.a, pa, 'a');
      paintHeadline(headline.b, pb, 'b');

      /* pl-same-team-colour: colour by slot with side as the first cue. A on
         its own side token; B on its side token unless the pair shares a side,
         in which case B takes the page's gold so two series are never one
         colour separated only by a dash. */
      var sameSide = pa.side === pb.side;
      root.style.setProperty('--mt-pl-a-side', pa.side === 'radiant' ? 'var(--side-radiant)' : 'var(--side-dire)');
      root.style.setProperty('--mt-pl-b-side', sameSide
        ? 'var(--match-magnet)'
        : (pb.side === 'radiant' ? 'var(--side-radiant)' : 'var(--side-dire)'));
      root.setAttribute('data-same-side', sameSide ? 'true' : 'false');

      radar.paint(Timeline.index);
      bars.paint();
      chart.paintSelection();
      paintIndex(Timeline.index);
    }

    function paintHeadline(card, p, slot) {
      card.el.setAttribute('data-player-key', p.key);
      card.el.setAttribute('data-side', p.side);
      card.photo.textContent = '';
      card.photo.appendChild(Hub.avatar(p, p.teamKey, 'lg'));
      card.handle.textContent = p.handle;
      card.hero.textContent = p.heroDisplay + ', position ' + p.pos;
      card.line.textContent = p.final.kills + ' / ' + p.final.deaths + ' / ' + p.final.assists;
      card.nw.textContent = N(p.final.netWorth) + ' net worth';
    }

    function paintIndex(i) {
      chart.paintIndex(i);
      radar.paint(i);
      radarChip.textContent = radar.getMode() === 'live'
        ? (i >= last ? G5.match.durationClock : Timeline.clockAt(i))
        : G5.match.durationClock;
      paintHeadlineIndex(headline.a, byKey[slots[0]], i);
      paintHeadlineIndex(headline.b, byKey[slots[1]], i);
    }

    function paintHeadlineIndex(card, p, i) {
      var isFinal = i >= last;
      var gold = at(p.perMinute.gold, i);
      var teamGold = G5.series && G5.series.teamGold ? at(G5.series.teamGold[p.side], i) : null;
      card.atLabel.textContent = isFinal
        ? 'At the whistle, ' + G5.match.durationClock
        : 'At ' + Timeline.clockAt(i);
      card.gold.textContent = N(gold);
      card.lvl.textContent = String(at(p.perMinute.level, i));
      card.kd.textContent = at(p.perMinute.kills, i) + ' / ' + at(p.perMinute.deaths, i);
      card.share.textContent = teamGold
        ? fmt.pct((gold / teamGold) * 100, { raw: true, digits: 1 })
        : fmt.orDash(null);
    }
  });

  global.MatchPlayers = { defaults: DEFAULTS, version: '1.0.0' };

})(window);
