/* ============================================================
   match/timeline.js
   The master timeline for the Match Analysis page.

   Owned by the shell agent. Component agents must NOT edit this
   file. Read .claude/dota-work/match-contract.md first.

   It ships three things:

   1. window.MatchTimeline
      The single source of truth for the current minute index.
      Every chart, table and card on the page renders "the arrays
      at MatchTimeline.index", so two modules can never disagree.

   2. the master timeline strip  (mount #m-timeline)
   3. the match banner           (mount #m-banner)

   It also widens the mount context so every component receives
   { TI2026, G5, Timeline, Hub } without hub/core.js changing.

   The interaction principles this implements are written out
   in the contract. The short version:
     - one array is the whole truth
     - the scrub only moves the index, and the index snaps
     - tracking is instant, and the index stays where you left it
     - a hover previews, it never moves the page
     - commitment at a distance: magnets capture before release
     - rubber at the ends, and only the rubber travels back
     - play is discrete stepping, one reading per tick
     - the visual is the state: one group, one CSS variable
     - tabular numerals, keyboard parity, options with defaults
   ============================================================ */

(function (global) {
  'use strict';

  var Hub = global.Hub;
  if (!Hub) {
    if (global.console && console.error) console.error('[MatchTimeline] hub/core.js must load first');
    return;
  }

  var h = Hub.h;
  var svg = Hub.svg;
  var fmt = Hub.fmt;

  /* ------------------------------------------------------------
     0. Defaults. Every one of them is overridable through
        MatchTimeline.init(options).
     ------------------------------------------------------------ */

  var DEFAULTS = {
    /* Grand Final Game 5 ran 64:22, so OpenDota carries 65 one minute
       readings, indices 0 to 64. G5.minutes.last overrides this. */
    last: 64,
    startIndex: null,    /* the index on boot. null means the final reading */
    /* magnet-over-capture: 34 snap points over 64 minutes with one fixed 14px
       radius tiled the axis, so capture became the resting state and a release
       almost always pinned. The radius now scales with the surface and only the
       top tier of moments magnetises. The rest stay visible markers you can tap. */
    magnetRadius: 16,    /* px, the ceiling on the capture distance */
    magnetRadiusMin: 8,  /* px, the floor, so a magnet is never smaller than a finger */
    magnetRadiusScale: 0.45, /* px of radius per px of one minute on this surface */
    magnetKinds: ['swing', 'fight', 'rax', 'roshan', 'aegis', 'ancient', 'firstblood'],
    magnetLead: 1.5,     /* the nearest magnet must be this much closer than the runner up */
    rubberR: 320,        /* drawn = (R * raw) / (R + raw) */
    rubberMax: 56,       /* px, hard ceiling on the drawn overshoot */
    rubberReturnMs: 200, /* the only thing that travels after a release, and only from past an end */
    tapSlop: 4,          /* px of travel that still counts as a tap */
    hoverPreview: true,  /* a hover draws a local preview on its own surface and nothing else */
    tickMs: 400,         /* play at 1x advances one reading every 400ms */
    speeds: [1, 2, 4],   /* the speed toggle cycles these */
    /* the frame clock. Defaults to requestAnimationFrame; a test harness or a
       headless run can pass its own pair. */
    raf: null,
    caf: null,
    seedSnapPoints: true,/* seed the magnets from G5.teamfights and G5.objectives */
    reducedMotion: null, /* a MediaQueryList, or true/false to force it */
    phases: [
      { id: 'laning', label: 'Laning', from: 0, to: 10 },
      { id: 'mid', label: 'Mid game', from: 10, to: 30 },
      { id: 'late', label: 'Late game', from: 30, to: null }
    ],
    tickEvery: 5,
    labelEvery: 10
  };

  var opts = null;

  /* ------------------------------------------------------------
     1. Data resolution.
        Everything comes from window.G5 (data/gf-game5-full.js).
        window.TI2026 fills in tournament level facts only. A fact
        that is missing is never printed.
     ------------------------------------------------------------ */

  function G5() { return global.G5 || {}; }
  function TI() { return global.TI2026 || {}; }
  function MATCH() { return G5().match || {}; }
  function SERIES() { return G5().series || {}; }
  function MINUTES() { return G5().minutes || {}; }

  function sideTeam(side) {
    var t = MATCH()[side];
    if (t && t.key) return t;
    var key = side === 'radiant' ? 'vision' : 'spirit';
    var team = Hub.team(key);
    return team ? { key: team.key, name: team.name, tag: Hub.teamTag(team.key) } : { key: key, name: key, tag: key };
  }

  function sides() {
    return { radiant: sideTeam('radiant').key, dire: sideTeam('dire').key };
  }

  /* Phase 4. data/ti2026.js carries no rdy.gg id for Team Spirit, so every
     game record reads match.dire.rdyTeamId === null for them. The id is in
     data/series-context.js, which was built for exactly this. Record first,
     context second, null third: no id is ever guessed. */
  function rdyTeamId(key) {
    if (!key) return null;
    var m = MATCH();
    if (m.radiant && m.radiant.key === key && m.radiant.rdyTeamId) return m.radiant.rdyTeamId;
    if (m.dire && m.dire.key === key && m.dire.rdyTeamId) return m.dire.rdyTeamId;
    var ctx = global.SERIES_CONTEXT;
    if (ctx && ctx.teams && ctx.teams[key] && ctx.teams[key].rdyTeamId) return ctx.teams[key].rdyTeamId;
    return null;
  }

  /* A dense array indexed by minute, built from any of:
       [{ minute, value }]   [{ minute, radiant, dire }]   [n, n, n, ...]
     Returns null when the series is not in the data. */
  function denseSeries(raw, pick) {
    if (!raw || !raw.length) return null;
    var out = [], i, row, v;
    if (typeof raw[0] === 'number') {
      for (i = 0; i < raw.length; i++) out[i] = raw[i];
      return out;
    }
    for (i = 0; i < raw.length; i++) {
      row = raw[i];
      if (!row) continue;
      v = pick(row);
      if (v === null || v === undefined) continue;
      out[typeof row.minute === 'number' ? row.minute : i] = v;
    }
    if (!out.length) return null;
    for (i = 0; i < out.length; i++) if (out[i] === undefined) out[i] = i > 0 ? out[i - 1] : 0;
    return out;
  }

  var cache = {};

  /* gold advantage per minute, Dire minus Radiant.
     Positive means Team Spirit ahead, negative means TEAM VISION ahead.
     Same convention as the Hub snapshot, so the two pages agree. */
  function goldSeries() {
    if (cache.gold !== undefined) return cache.gold;
    cache.gold = denseSeries(SERIES().goldAdvantage, function (r) {
      if (typeof r.value === 'number') return r.value;
      if (typeof r.dire === 'number' && typeof r.radiant === 'number') return r.dire - r.radiant;
      return null;
    });
    return cache.gold;
  }

  function killSeries() {
    if (cache.kills !== undefined) return cache.kills;
    var k = SERIES().killsCumulative;
    cache.kills = (k && k.radiant && k.dire) ? { radiant: k.radiant, dire: k.dire } : null;
    return cache.kills;
  }

  function resolveLast() {
    var m = MINUTES();
    if (typeof m.last === 'number') return m.last;
    var gold = goldSeries();
    if (gold) return gold.length - 1;
    var d = MATCH().durationSeconds;
    if (typeof d === 'number') return Math.floor(d / 60);
    return DEFAULTS.last;
  }

  /* every banner fact, or null where the data does not have it */
  function facts() {
    var m = MATCH();
    var gf = TI().grandFinal || {};
    var ser = m.series || {};
    var r = sideTeam('radiant');
    var d = sideTeam('dire');
    return {
      matchId: m.id || null,
      date: m.date || null,
      dateLabel: m.dateLabel || (m.date ? fmt.date(m.date) : null),
      duration: m.durationClock || (typeof m.durationSeconds === 'number' ? fmt.clock(m.durationSeconds) : null),
      durationSeconds: typeof m.durationSeconds === 'number' ? m.durationSeconds : null,
      radiantKey: r.key,
      direKey: d.key,
      radiant: r,
      dire: d,
      killScore: m.kills || null,
      winnerKey: m.winnerKey || null,
      seriesScore: ser.scoreAfter || null,
      seriesWinnerKey: ser.winnerKey || m.winnerKey || null,
      stage: ser.event || gf.stage || 'Grand Final',
      bo: ser.bo || 5,
      game: ser.game || 5,
      gameMode: m.gameMode || null,
      league: m.league || null,
      venue: m.venue || gf.venue || null,
      /* OpenDota carries a numeric patch id, which is not a version string.
         G5.match.patch is null on purpose. Only a real display string prints. */
      patch: typeof m.patch === 'string' ? m.patch : null
    };
  }

  /* ------------------------------------------------------------
     2. The engine
     ------------------------------------------------------------ */

  var last = DEFAULTS.last;
  var position = last;     /* continuous, index units, may pass the ends while rubbering */
  var index = last;        /* the snapped reading, always an integer inside [0, last] */
  var mode = 'idle';       /* 'idle' | 'scrubbing' | 'returning' | 'playing' */
  var captured = null;     /* the snap point currently held by the magnet */
  var pxPerIndex = 10;     /* from the surface being scrubbed, for the magnet radius in px */
  var rectWidth = 640;

  var subs = [];
  var hlSubs = [];
  var highlighted = null;
  var snaps = [];
  var snapIds = {};

  var frameQueued = false;
  var returnRaf = 0;

  /* the time lapse: a discrete stepper, not an animation */
  var playing = false;
  var speedIdx = 0;
  var playTimer = 0;
  var playAnchorIndex = 0;
  var playAnchorAt = 0;

  function now() { return (global.performance && performance.now) ? performance.now() : Date.now(); }
  function clampIdx(v) { return v < 0 ? 0 : (v > last ? last : v); }

  function reduced() {
    var rm = opts.reducedMotion;
    if (rm === true || rm === false) return rm;
    if (rm && typeof rm.matches === 'boolean') return rm.matches;
    return false;
  }

  function rubberPx() {
    if (position > last) return (position - last) * pxPerIndex;
    if (position < 0) return position * pxPerIndex;
    return 0;
  }

  function snapshotState() {
    return {
      index: index,
      position: position,
      fraction: last > 0 ? position / last : 0,
      state: mode,
      captured: captured,
      last: last,
      rubberPx: rubberPx(),
      highlighted: highlighted,
      playing: playing,
      speed: speedValue()
    };
  }

  function schedule() {
    if (frameQueued) return;
    frameQueued = true;
    opts.raf(flush);
  }

  function flush() {
    frameQueued = false;
    var st = snapshotState();
    for (var i = 0; i < subs.length; i++) {
      try { subs[i](st); } catch (err) {
        if (global.console && console.error) console.error('[MatchTimeline] subscriber failed', err);
      }
    }
  }

  function recomputeIndex() {
    index = captured ? clampIdx(captured.index) : clampIdx(Math.round(position));
  }

  /* the capture distance on the surface that is driving the timeline right now */
  function magnetRadius() {
    if (!opts.magnetRadius) return 0;
    var r = opts.magnetRadiusScale * pxPerIndex;
    if (r < opts.magnetRadiusMin) r = opts.magnetRadiusMin;
    if (r > opts.magnetRadius) r = opts.magnetRadius;
    return r;
  }

  function magnetises(snap) {
    var kinds = opts.magnetKinds;
    if (!kinds || !kinds.length) return true;
    for (var i = 0; i < kinds.length; i++) if (kinds[i] === snap.kind) return true;
    return false;
  }

  function findMagnet() {
    var r = magnetRadius();
    if (!snaps.length || !r) return null;
    var best = null, bestD = Infinity, runnerUp = Infinity, d, i;
    for (i = 0; i < snaps.length; i++) {
      if (!magnetises(snaps[i])) continue;
      d = Math.abs(position - snaps[i].index) * pxPerIndex;
      if (d > r) continue;
      if (d < bestD) { runnerUp = bestD; bestD = d; best = snaps[i]; }
      else if (d < runnerUp) { runnerUp = d; }
    }
    /* two magnets this close together are a crowd, not a target: hold neither */
    if (best && runnerUp !== Infinity && bestD * opts.magnetLead > runnerUp) return null;
    return best;
  }

  function cancelReturn() {
    if (returnRaf) { opts.caf(returnRaf); returnRaf = 0; }
    if (mode === 'returning') mode = 'idle';
  }

  /* pointer -> position, with the rubber band past either end */
  function positionFromPointer(clientX, rect) {
    var w = Math.max(1, rect.width);
    var x = clientX - rect.left;
    var over = x < 0 ? x : (x > w ? x - w : 0);
    var drawn = 0;
    if (over) {
      var raw = Math.abs(over);
      drawn = (opts.rubberR * raw) / (opts.rubberR + raw);
      if (drawn > opts.rubberMax) drawn = opts.rubberMax;
      if (over < 0) drawn = -drawn;
    }
    var core = x < 0 ? 0 : (x > w ? w : x);
    pxPerIndex = w / Math.max(1, last);
    rectWidth = w;
    return ((core + drawn) / w) * last;
  }

  function applyPointer(clientX, rect) {
    /* a pointer on any scrub surface stops the time lapse: the reader's
       hand outranks the clock */
    pause();
    cancelReturn();
    mode = 'scrubbing';
    position = positionFromPointer(clientX, rect);
    captured = findMagnet();
    recomputeIndex();
    schedule();
  }

  /* interaction-rule-change 2026-09-11: there is no journey home. On release
     the index stays exactly where the finger left it, or on the magnet it
     captured. The only thing that still travels is the rubber band, and only
     from past an end back to that end. Everything else settles on the frame
     the pointer went up. */

  function settleHere() {
    cancelReturn();
    recomputeIndex();
    position = index;
    mode = 'idle';
    schedule();
  }

  /* past an end: a short return to the edge, instant under reduced motion */
  function returnToEdge() {
    var target = position > last ? last : (position < 0 ? 0 : null);
    if (target === null) { settleHere(); return; }
    cancelReturn();
    captured = null;
    recomputeIndex();
    if (reduced() || !(opts.rubberReturnMs > 0)) {
      position = target;
      mode = 'idle';
      recomputeIndex();
      schedule();
      return;
    }
    var from = position;
    var startedAt = now();
    var ms = opts.rubberReturnMs;
    mode = 'returning';
    returnRaf = opts.raf(function stepBack() {
      returnRaf = 0;
      if (mode !== 'returning') return;
      var k = (now() - startedAt) / ms;
      if (k >= 1) {
        position = target;
        mode = 'idle';
        recomputeIndex();
        schedule();
        return;
      }
      var e = 1 - Math.pow(1 - k, 3);
      position = from + (target - from) * e;
      recomputeIndex();
      schedule();
      returnRaf = opts.raf(stepBack);
    });
  }

  /* ---- public state moves ---- */

  function set(i, meta) {
    meta = meta || {};
    if (!meta.fromPlay) pause();
    cancelReturn();
    position = clampIdx(Number(i) || 0);
    captured = meta.captured || null;
    recomputeIndex();
    position = index;
    if (meta.state) mode = meta.state;
    else if (mode !== 'playing') mode = 'idle';
    schedule();
    return index;
  }

  function setFraction(f, meta) {
    f = Number(f);
    if (isNaN(f)) return index;
    if (f < 0) f = 0;
    if (f > 1) f = 1;
    meta = meta || {};
    if (!meta.fromPlay) pause();
    /* the magnet radius is in px, so a chart driving the timeline from its
       own plot box passes that box's width and gets magnets at its own scale */
    if (typeof meta.width === 'number' && meta.width > 0) {
      rectWidth = meta.width;
      pxPerIndex = meta.width / Math.max(1, last);
    }
    cancelReturn();
    position = f * last;
    mode = meta.state || 'scrubbing';
    captured = (meta.magnets === false) ? null : findMagnet();
    recomputeIndex();
    schedule();
    return index;
  }

  /* interaction-rule-change 2026-09-11: pin and unpin are kept as thin
     aliases so moments.js, wards.js and story.js keep working. There is no
     pinned state any more: a jump is a jump. */
  function pin(i) { return set(i); }
  function unpin() { return null; }
  function togglePin(i) { return set(i); }

  function step(delta) {
    pause();
    cancelReturn();
    captured = null;
    position = clampIdx(Math.round(position) + delta);
    mode = 'idle';
    recomputeIndex();
    schedule();
    return index;
  }

  /* ---- play, the time lapse ----------------------------------------
     Discrete stepping, never an animation: one real reading per tick, so
     every module follows it exactly as it follows a scrub. Reduced motion
     changes nothing here. The tick is anchored to a timestamp rather than
     counted, so a throttled timer catches up instead of drifting. */

  function speedValue() {
    var list = (opts && opts.speeds && opts.speeds.length) ? opts.speeds : DEFAULTS.speeds;
    return list[speedIdx % list.length];
  }

  function tickPeriod() {
    var ms = (opts && opts.tickMs) || DEFAULTS.tickMs;
    return Math.max(16, ms / speedValue());
  }

  function stopTimer() {
    if (playTimer) { global.clearInterval(playTimer); playTimer = 0; }
  }

  function startTimer() {
    stopTimer();
    playAnchorIndex = index;
    playAnchorAt = now();
    var period = tickPeriod();
    playTimer = global.setInterval(playTick, Math.max(16, Math.round(period / 4)));
  }

  function playTick() {
    if (!playing) { stopTimer(); return; }
    var due = Math.floor((now() - playAnchorAt) / tickPeriod());
    var want = playAnchorIndex + due;
    if (want >= last) {
      set(last, { fromPlay: true });
      pause();
      return;
    }
    if (want !== index) set(want, { fromPlay: true });
  }

  function play() {
    if (playing) return true;
    cancelReturn();
    /* pressing play on the final reading replays from the first one */
    if (index >= last) { set(0); }
    playing = true;
    mode = 'playing';
    startTimer();
    schedule();
    return true;
  }

  function pause() {
    if (!playing) return false;
    playing = false;
    stopTimer();
    if (mode === 'playing') mode = 'idle';
    schedule();
    return false;
  }

  function toggle() { return playing ? pause() : play(); }

  function speed(n) {
    var list = (opts && opts.speeds && opts.speeds.length) ? opts.speeds : DEFAULTS.speeds;
    var at = -1, i;
    if (n === undefined || n === null) at = (speedIdx + 1) % list.length;
    else for (i = 0; i < list.length; i++) if (list[i] === Number(n)) at = i;
    if (at < 0) return speedValue();
    speedIdx = at;
    if (playing) startTimer();
    schedule();
    return speedValue();
  }

  function subscribe(fn) {
    if (typeof fn !== 'function') return function () {};
    subs.push(fn);
    try { fn(snapshotState()); } catch (err) {
      if (global.console && console.error) console.error('[MatchTimeline] subscriber failed', err);
    }
    return function () {
      var i = subs.indexOf(fn);
      if (i >= 0) subs.splice(i, 1);
    };
  }

  /* ---- snap points, the magnets ---- */

  function addSnapPoints(list) {
    if (!list || !list.length) return snaps.length;
    var added = 0;
    for (var i = 0; i < list.length; i++) {
      var s = list[i];
      if (!s) continue;
      var idx = typeof s.index === 'number' ? s.index :
        (typeof s.minute === 'number' ? s.minute :
          (typeof s.seconds === 'number' ? Math.round(s.seconds / 60) : null));
      if (idx === null) continue;
      var id = s.id || (s.kind || 'snap') + '-' + idx;
      if (snapIds[id]) continue;
      var point = {
        index: clampIdx(Math.round(idx)),
        id: id,
        label: s.label || '',
        short: s.short || s.label || '',
        kind: s.kind || 'moment',
        side: s.side || null,
        seconds: typeof s.seconds === 'number' ? s.seconds : null,
        priority: typeof s.priority === 'number' ? s.priority : 1,
        meta: s.meta || null
      };
      snapIds[id] = point;
      snaps.push(point);
      added++;
    }
    if (added) {
      snaps.sort(function (a, b) { return a.index - b.index; });
      renderMarks();
      schedule();
    }
    return snaps.length;
  }

  /* The strip seeds itself from the record so the magnets exist before any
     component mounts. One snap per minute, the most significant wins.
     Ids are stable: 'tf<n>' for a teamfight, 'obj-<seconds>' for an
     objective, so moments.js can add the same list without duplicating. */
  /* 'swing' is the biggest-swing fight, teamfights[].featured, chosen by the
     build as the argmax of abs(swingWindow.value). There is no 'story' kind
     any more: nothing on this page is a magnet because a person said so. */
  var SNAP_PRIORITY = { swing: 6, fight: 5, ancient: 5, rax: 4, roshan: 4, tower: 2, tormentor: 1, courier: 1, firstblood: 1 };

  /* moments-tower-side-inverted: ONE rule for the whole page. An objective is
     coloured by the side that GAINED it, never by the side that owned it.
     A building carries takenBy; a roshan, an aegis, a tormentor and first
     blood carry the gaining side in `side`; a lost courier is the one entry
     whose `side` is the side that lost it. */
  function gainSide(o) {
    if (!o) return null;
    if (o.takenBy) return o.takenBy;
    if (o.type === 'courier') return o.side === 'radiant' ? 'dire' : (o.side === 'dire' ? 'radiant' : null);
    return o.side || null;
  }

  function objectiveSnap(o) {
    var building = o.type === 'tower' || o.type === 'barracks' || o.type === 'ancient';
    var kind = o.type === 'barracks' ? 'rax' : o.type;
    var short = '';
    if (o.type === 'tower') short = (o.tier ? 'Tier ' + o.tier : 'Tower') + (o.lane ? ' ' + o.lane : '');
    else if (o.type === 'barracks') short = (o.lane ? o.lane.charAt(0).toUpperCase() + o.lane.slice(1) + ' ' : '') + 'rax';
    else if (o.type === 'ancient') short = 'Ancient falls';
    else if (o.type === 'roshan') short = 'Roshan ' + (o.number || '');
    else if (o.type === 'tormentor') short = 'Tormentor';
    else if (o.type === 'firstblood') short = 'First blood';
    return {
      index: Math.min(last, Math.round(o.seconds / 60)),
      id: 'obj-' + o.seconds,
      kind: kind,
      side: gainSide(o),
      seconds: o.seconds,
      label: o.headline || short,
      short: short.trim(),
      priority: SNAP_PRIORITY[kind] || 1
    };
  }

  function seedSnapPoints() {
    var g = G5();
    var out = [], i;
    var fights = g.teamfights || [];
    for (i = 0; i < fights.length; i++) {
      var tf = fights[i];
      out.push({
        index: Math.min(last, typeof tf.startMinute === 'number' ? tf.startMinute : Math.round(tf.startSeconds / 60)),
        id: tf.id || ('tf' + (i + 1)),
        kind: tf.featured ? 'swing' : 'fight',
        side: tf.winnerSide || null,
        seconds: tf.startSeconds,
        label: tf.headline || '',
        short: tf.featured ? 'Biggest swing' : ('Teamfight ' + (tf.number || i + 1)),
        priority: tf.featured ? SNAP_PRIORITY.swing : SNAP_PRIORITY.fight
      });
    }
    var objs = g.objectives || [];
    for (i = 0; i < objs.length; i++) {
      var o = objs[i];
      if (!o || typeof o.seconds !== 'number') continue;
      if (o.type === 'aegis' || o.type === 'courier') continue;   /* the aegis shares its second with the roshan */
      if (o.type === 'tower' && o.tier === 1) continue;           /* fourteen towers would be a picket fence */
      out.push(objectiveSnap(o));
    }
    /* one per minute, the most significant wins */
    var best = {};
    for (i = 0; i < out.length; i++) {
      var s = out[i];
      if (!best[s.index] || s.priority > best[s.index].priority) best[s.index] = s;
    }
    var all = [];
    for (var k in best) if (best.hasOwnProperty(k)) all.push(best[k]);
    all.sort(function (a, b) { return a.index - b.index; });
    /* two barracks in the same push read as the same marker twice */
    var list = [];
    for (i = 0; i < all.length; i++) {
      var prev = list[list.length - 1];
      if (prev && all[i].index - prev.index <= 1 && all[i].short === prev.short) continue;
      list.push(all[i]);
    }
    addSnapPoints(list);
    return list.length;
  }

  function clearSnapPoints(kind) {
    var kept = [];
    for (var i = 0; i < snaps.length; i++) {
      if (kind && snaps[i].kind !== kind) kept.push(snaps[i]);
      else delete snapIds[snaps[i].id];
    }
    snaps = kept;
    renderMarks();
    schedule();
    return snaps.length;
  }

  function snapAtOrBefore(i) {
    var found = null;
    for (var n = 0; n < snaps.length; n++) {
      if (snaps[n].index <= i) found = snaps[n]; else break;
    }
    return found;
  }

  function nearestSnap(i) {
    var best = null, bestD = Infinity;
    for (var n = 0; n < snaps.length; n++) {
      var d = Math.abs(snaps[n].index - i);
      if (d < bestD) { bestD = d; best = snaps[n]; }
    }
    return best;
  }

  /* ---- cross module player highlight ---- */

  function highlightPlayer(key) {
    var next = key || null;
    if (next === highlighted) return highlighted;
    highlighted = next;
    var root = document.body;
    if (root) root.classList.toggle('has-hl', !!highlighted);
    for (var i = 0; i < hlSubs.length; i++) {
      try { hlSubs[i](highlighted); } catch (err) {
        if (global.console && console.error) console.error('[MatchTimeline] highlight subscriber failed', err);
      }
    }
    return highlighted;
  }

  function onHighlight(fn) {
    if (typeof fn !== 'function') return function () {};
    hlSubs.push(fn);
    try { fn(highlighted); } catch (err) {}
    return function () {
      var i = hlSubs.indexOf(fn);
      if (i >= 0) hlSubs.splice(i, 1);
    };
  }

  /* ---- mirrorJumps: the sidebar's landmarks, in the sticky strip ----
     The sidebar card that owns Start / Peak / Closest / Swing / Final scrolls
     out of view, so the same stops are mirrored here, where they are always
     reachable. The sidebar derives them from G5.landmarks and hands them over
     with the rule that produced each one; this file never types a minute and
     never writes a label. */
  var pendingJumps = null;

  function mirrorJumps(list) {
    pendingJumps = list && list.length ? list.slice() : null;
    renderJumps();
  }

  function renderJumps() {
    if (!els || !els.jumps || !pendingJumps) return;
    els.jumps.textContent = '';
    els.jumpBtns = [];
    for (var i = 0; i < pendingJumps.length; i++) {
      (function (j) {
        var b = h('button', {
          type: 'button',
          'class': 'mt-tl-jump',
          'aria-pressed': 'false',
          'data-minute': String(j.minute),
          title: j.title || ('Go to ' + j.label + ', ' + j.clock),
          'aria-label': j.ariaLabel || ((j.title ? j.title + ' ' : '') + 'Go to minute ' + j.minute + '.'),
          onclick: function () { set(j.minute); }
        },
          h('span', { 'class': 'mt-tl-jump-word' }, j.label),
          h('span', { 'class': 'mt-tl-jump-clock u-tnum' }, j.clock || clockAt(j.minute))
        );
        els.jumps.appendChild(b);
        els.jumpBtns.push({ el: b, minute: j.minute });
      }(pendingJumps[i]));
    }
    paintJumps(snapshotState());
  }

  function paintJumps(st) {
    if (!els || !els.jumpBtns) return;
    for (var i = 0; i < els.jumpBtns.length; i++) {
      var j = els.jumpBtns[i];
      var on = j.minute === st.index;
      j.el.classList.toggle('is-on', on);
      j.el.setAttribute('aria-pressed', on ? 'true' : 'false');
    }
  }

  /* ---- quietLive: one page speaks, the modules stay silent ------------
     Six simultaneous polite regions turn a single arrow press into six
     announcements, three of them the same clock. The strip's region is the
     page's canonical one. Every other module registers here: its text is
     still written on every frame (so aria-valuetext and any AT that reads
     the node on demand stay correct) but the node only becomes a live
     region while focus is inside that module, and it only speaks when the
     timeline is idle, never mid scrub.
     Options: {root, live, announceOnFocus}. Returns speak(text, state). */
  function quietLive(liveEl, rootEl, options) {
    var o = options || {};
    var spoken = '';
    var focused = false;
    if (!liveEl) return function () {};
    liveEl.setAttribute('aria-live', 'off');
    if (!liveEl.getAttribute('role')) liveEl.setAttribute('role', 'status');
    if (rootEl && rootEl.addEventListener) {
      rootEl.addEventListener('focusin', function () { focused = true; });
      rootEl.addEventListener('focusout', function () {
        focused = false;
        liveEl.setAttribute('aria-live', 'off');
      });
    }
    return function speak(text, state) {
      /* the node is only a live region while focus is inside this module AND
         the timeline has settled, so a 61 sample drag queues nothing */
      var on = focused && (!state || state === 'idle');
      liveEl.setAttribute('aria-live', on ? (o.politeness || 'polite') : 'off');
      if (text === spoken) return;
      spoken = text;
      liveEl.textContent = text;
    };
  }

  /* ---- attachScrubSurface: two lines make any plot box scrubbable ---- */

  function attachScrubSurface(el, o) {
    if (!el) return function () {};
    o = o || {};
    var down = false, travel = 0, sx = 0, sy = 0, pid = null;

    /* interaction-rule-change 2026-09-11: a hover never changes page state.
       It may draw a PREVIEW on its own surface, which is what onPreview is
       for: onPreview(fraction, index) while the bare pointer moves over the
       box, onPreview(null) when it leaves. The global index, every other
       module and the sidebar stay exactly where they are. Only a pointerdown,
       a drag, a tap, the keyboard and play move the clock. */
    var onPreview = typeof o.onPreview === 'function' ? o.onPreview : null;
    var wantsPreview = o.preview !== false && opts.hoverPreview !== false;

    el.classList.add('m-scrub');

    function rect() { return el.getBoundingClientRect(); }
    function scrub(e) { applyPointer(e.clientX, rect()); }

    function previewAt(clientX) {
      if (!onPreview || !wantsPreview) return;
      var r = rect();
      var w = Math.max(1, r.width);
      var t = (clientX - r.left) / w;
      if (t < 0) t = 0;
      if (t > 1) t = 1;
      el.classList.add('is-previewing');
      onPreview(t, clampIdx(Math.round(t * last)));
    }

    function clearPreview() {
      el.classList.remove('is-previewing');
      if (onPreview) onPreview(null);
    }

    function onDown(e) {
      if (e.button !== undefined && e.button !== 0) return;
      clearPreview();
      down = true; travel = 0; sx = e.clientX; sy = e.clientY; pid = e.pointerId;
      try { el.setPointerCapture(pid); } catch (err) {}
      el.classList.add('is-scrubbing');
      scrub(e);
      if (e.cancelable) e.preventDefault();
    }

    function onEnter(e) {
      if (down) return;
      previewAt(e.clientX);
    }

    function onMove(e) {
      if (down) {
        travel = Math.max(travel, Math.abs(e.clientX - sx) + Math.abs(e.clientY - sy));
        scrub(e);
      } else {
        previewAt(e.clientX);
      }
    }

    /* the release: the index stays where the finger left it, or on the
       magnet it captured. Nothing travels except a stretched rubber band. */
    function onUp() {
      if (!down) return;
      down = false;
      try { el.releasePointerCapture(pid); } catch (err) {}
      el.classList.remove('is-scrubbing');
      if (position > last || position < 0) returnToEdge();
      else settleHere();
      if (typeof o.onRelease === 'function') o.onRelease(snapshotState());
    }

    function onCancel() {
      if (!down) return;
      down = false;
      el.classList.remove('is-scrubbing');
      if (position > last || position < 0) returnToEdge();
      else settleHere();
    }

    function onLeave() {
      clearPreview();
    }

    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointerenter', onEnter);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onCancel);
    el.addEventListener('pointerleave', onLeave);

    var detachKeys = o.keyboard === false ? null : attachKeys(el);

    return function detach() {
      clearPreview();
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointerenter', onEnter);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onCancel);
      el.removeEventListener('pointerleave', onLeave);
      if (detachKeys) detachKeys();
      el.classList.remove('m-scrub');
    };
  }

  /* ---- attachJumpSurface: the same box, click to jump, no drag ----
     COMPACT, 2026-09-12. Pedro: too many competing scrub surfaces. Only the
     master strip and the economy chart stay draggable. Every other plot keeps
     its clock binding as a JUMP: one click moves the page to that minute and
     it stays there, the arrow keys still walk it, and no hover and no drag
     ever moves the index. Same release contract, one gesture fewer. */
  function attachJumpSurface(el, o) {
    if (!el) return function () {};
    o = o || {};
    el.classList.add('m-jump');

    function onClick(e) {
      if (e.button !== undefined && e.button !== 0) return;
      applyPointer(e.clientX, el.getBoundingClientRect());
      settleHere();
      if (typeof o.onRelease === 'function') o.onRelease(snapshotState());
    }

    el.addEventListener('click', onClick);
    var detachKeys = o.keyboard === false ? null : attachKeys(el);

    return function detach() {
      el.removeEventListener('click', onClick);
      if (detachKeys) detachKeys();
      el.classList.remove('m-jump');
    };
  }

  /* keyboard parity, principle 8 */
  function attachKeys(el) {
    function onKey(e) {
      var k = e.key;
      var big = e.shiftKey ? 5 : 1;
      if (k === 'ArrowRight' || k === 'ArrowUp') { step(big); }
      else if (k === 'ArrowLeft' || k === 'ArrowDown') { step(-big); }
      else if (k === 'Home') { set(0); }
      else if (k === 'End') { set(last); }
      else if (k === 'Enter' || k === ' ' || k === 'Spacebar') { toggle(); }
      else if (k === 'Escape') { pause(); }
      else if (k === 'PageUp') { step(10); }
      else if (k === 'PageDown') { step(-10); }
      else return;
      e.preventDefault();
      e.stopPropagation();
    }
    el.addEventListener('keydown', onKey);
    return function () { el.removeEventListener('keydown', onKey); };
  }

  /* ------------------------------------------------------------
     3. Readout helpers. Every number the strip prints is the
        series at the current index, never a typed constant.
     ------------------------------------------------------------ */

  function phaseAt(i) {
    var ph = opts.phases || DEFAULTS.phases;
    for (var n = 0; n < ph.length; n++) {
      var to = ph[n].to === null || ph[n].to === undefined ? last : ph[n].to;
      if (i >= ph[n].from && i < to) return ph[n];
      if (n === ph.length - 1 && i >= ph[n].from) return ph[n];
    }
    return null;
  }

  /* The last index is the end of the match, not minute 64:00, so the clock
     comes from G5.minutes.clockAt and never from i * 60. */
  function clockAt(i) {
    var ca = MINUTES().clockAt;
    if (ca && ca[i]) return ca[i];
    var f = facts();
    if (i >= last && f.durationSeconds) return fmt.clock(f.durationSeconds);
    return fmt.clockFromMinutes(i);
  }

  function secondsAt(i) {
    var sa = MINUTES().secondsAt;
    if (sa && typeof sa[i] === 'number') return sa[i];
    return i * 60;
  }

  /* { value, leaderKey, leaderTag, side } or null when there is no series */
  function goldAt(i) {
    var g = goldSeries();
    if (!g) return null;
    var v = g[Math.min(i, g.length - 1)];
    if (typeof v !== 'number') return null;
    var f = facts();
    return {
      value: v,
      abs: Math.abs(v),
      leaderKey: v === 0 ? null : (v > 0 ? f.direKey : f.radiantKey),
      leaderTag: v === 0 ? null : Hub.teamTag(v > 0 ? f.direKey : f.radiantKey),
      side: v === 0 ? null : (v > 0 ? 'dire' : 'radiant')
    };
  }

  function killsAt(i) {
    var k = killSeries();
    if (!k) return null;
    var a = Math.min(i, k.radiant.length - 1);
    var b = Math.min(i, k.dire.length - 1);
    return { radiant: k.radiant[a], dire: k.dire[b] };
  }

  function readout(i) {
    if (typeof i !== 'number') i = index;
    return {
      index: i,
      clock: clockAt(i),
      phase: phaseAt(i),
      gold: goldAt(i),
      kills: killsAt(i),
      moment: snapAtOrBefore(i),
      isFinal: i >= last
    };
  }

  /* ------------------------------------------------------------
     4. The strip
     ------------------------------------------------------------ */

  var els = null;

  function pct(i) { return (last > 0 ? (i / last) * 100 : 0); }

  function buildStrip(mount) {
    var f = facts();

    var clock = h('div', { 'class': 'mt-tl-clock u-tnum', 'data-testid': 'timeline-clock' }, clockAt(index));
    var phase = h('div', { 'class': 'mt-tl-phase' }, '');

    var goldVal = h('span', { 'class': 'mt-tl-stat-value u-tnum' }, '');
    var goldStat = h('div', { 'class': 'mt-tl-stat' },
      h('span', { 'class': 'mt-tl-stat-label' }, 'Gold'), goldVal);

    var killsVal = h('span', { 'class': 'mt-tl-stat-value u-tnum' }, '');
    var killsStat = h('div', { 'class': 'mt-tl-stat' },
      h('span', { 'class': 'mt-tl-stat-label' }, 'Kills'), killsVal);

    var momentTime = h('span', { 'class': 'mt-tl-moment-time u-tnum' }, '');
    var momentText = h('span', { 'class': 'mt-tl-moment-text' }, '');
    var moment = h('div', { 'class': 'mt-tl-moment' }, momentTime, momentText);

    /* interaction-rule-change 2026-09-11: the pin control is gone. In its
       place, at the left of the strip, a time lapse: Start, Play or Pause,
       End, and a speed toggle. Play advances one real reading per tick, so
       every module follows it exactly as it follows a drag. */

    var startBtn = h('button', {
      type: 'button',
      'class': 'mt-tl-pbtn mt-tl-pbtn--edge',
      'data-testid': 'timeline-start',
      'aria-label': 'Go to the first reading',
      title: 'Start',
      onclick: function () { set(0); }
    }, Hub.icon('M7 5h2v14H7zm3 7 8-7v14z'));

    var endBtn = h('button', {
      type: 'button',
      'class': 'mt-tl-pbtn mt-tl-pbtn--edge',
      'data-testid': 'timeline-end',
      'aria-label': 'Go to the final reading',
      title: 'End',
      onclick: function () { set(last); }
    }, Hub.icon('M15 5h2v14h-2zM6 5l8 7-8 7z'));

    var playGlyph = h('span', { 'class': 'mt-tl-pbtn-glyph' },
      Hub.icon('M8 5v14l11-7z'));
    var playWord = h('span', { 'class': 'mt-tl-pbtn-word' }, 'Play');
    var playClock = h('span', { 'class': 'mt-tl-pbtn-clock u-tnum' }, clockAt(index));
    var playBtn = h('button', {
      type: 'button',
      'class': 'mt-tl-pbtn mt-tl-pbtn--play',
      'data-testid': 'timeline-play',
      'aria-pressed': 'false',
      'aria-label': 'Play the match as a time lapse',
      title: 'Play the match as a time lapse',
      onclick: function () { toggle(); }
    }, playGlyph, playWord, playClock, h('span', { 'class': 'mt-tl-pbtn-bar', 'aria-hidden': 'true' }));

    var speedBtn = h('button', {
      type: 'button',
      'class': 'mt-tl-speed u-tnum',
      'data-testid': 'timeline-speed',
      'aria-label': 'Playback speed, 1x',
      title: 'Playback speed',
      onclick: function () { speed(); }
    }, '1x');

    var playGroup = h('div', {
      'class': 'mt-tl-play',
      role: 'group',
      'aria-label': 'Time lapse',
      'data-testid': 'timeline-transport'
    }, startBtn, playBtn, endBtn, speedBtn);

    var hint = h('div', { 'class': 'mt-tl-hint' }, 'Drag to scrub, hover to preview, Space to play');

    /* jump-buttons-no-state: the five landmarks mirrored out of the sidebar
       card, which stops being on screen long before the article ends. Filled
       by mirrorJumps once the sidebar has derived them from G5.landmarks. */
    var jumpsEl = h('div', { 'class': 'mt-tl-jumps', role: 'group', 'aria-label': 'Jump to a moment' });

    var head = h('div', { 'class': 'mt-tl-head' },
      playGroup,
      h('div', { 'class': 'mt-tl-clockbox' }, clock, phase),
      h('div', { 'class': 'mt-tl-readout' }, goldStat, killsStat, moment),
      h('div', { 'class': 'mt-tl-actions' }, jumpsEl, hint));

    var bands = h('div', { 'class': 'mt-tl-bands' });
    var ticks = h('div', { 'class': 'mt-tl-ticks' });
    var marks = h('div', { 'class': 'mt-tl-marks', 'data-testid': 'timeline-marks' });
    var spark = buildSpark();

    var track = h('div', { 'class': 'mt-tl-track' }, bands, spark, ticks, marks);

    var cursor = h('div', { 'class': 'mt-tl-cursor', 'data-testid': 'timeline-cursor' },
      h('div', { 'class': 'mt-tl-cursor-line' }),
      h('div', { 'class': 'mt-tl-cursor-dot' }),
      h('div', { 'class': 'mt-tl-cursor-bubble u-tnum' }, clockAt(index)));

    var edgeStart = h('div', { 'class': 'mt-tl-edge mt-tl-edge--start' });
    var edgeEnd = h('div', { 'class': 'mt-tl-edge mt-tl-edge--end' });

    /* the hover preview: a faint tick and a clock, drawn on this surface
       only. It never touches the index. */
    var ghostClock = h('span', { 'class': 'mt-tl-ghost-clock u-tnum' }, '');
    var ghost = h('div', {
      'class': 'mt-tl-ghost',
      'data-testid': 'timeline-ghost',
      'aria-hidden': 'true',
      hidden: true
    }, h('span', { 'class': 'mt-tl-ghost-line' }), ghostClock);

    var clip = h('div', { 'class': 'mt-tl-clip' }, track, edgeStart, edgeEnd, ghost, cursor);

    var plot = h('div', {
      'class': 'mt-tl-plot',
      'data-testid': 'timeline-plot',
      tabindex: '0',
      role: 'slider',
      'aria-label': 'Match minute. ' + f.stage + ' Game ' + f.game + ', ' +
        f.radiant.name + ' against ' + f.dire.name,
      'aria-valuemin': '0',
      'aria-valuemax': String(last),
      'aria-valuenow': String(index),
      'aria-valuetext': ''
    }, clip);

    var live = h('div', { 'class': 'u-sr-only', 'aria-live': 'polite', 'aria-atomic': 'true' }, '');

    var root = h('div', { 'class': 'mt-tl', 'data-testid': 'match-timeline' }, head, plot, live);

    mount.appendChild(root);

    els = {
      root: root, plot: plot, clip: clip, track: track, cursor: cursor,
      bubble: cursor.lastChild, clock: clock, phase: phase,
      goldVal: goldVal, goldStat: goldStat, killsVal: killsVal, killsStat: killsStat,
      moment: moment, momentTime: momentTime, momentText: momentText,
      playBtn: playBtn, playGlyph: playGlyph, playWord: playWord, playClock: playClock,
      speedBtn: speedBtn, startBtn: startBtn, endBtn: endBtn,
      ghost: ghost, ghostClock: ghostClock,
      jumps: jumpsEl, jumpBtns: [], bands: bands, ticks: ticks, marks: marks,
      edgeStart: edgeStart, edgeEnd: edgeEnd, live: live, spark: spark,
      markEls: {}
    };

    renderBands();
    renderTicks();
    renderMarks();
    renderJumps();
    attachScrubSurface(plot, {
      keyboard: true,
      onPreview: function (frac, i) {
        if (frac === null) { ghost.hidden = true; return; }
        ghost.hidden = false;
        ghost.style.setProperty('--gx', String(frac));
        ghostClock.textContent = clockAt(i);
      }
    });
    measureHeight();
    render(snapshotState());
    /* Phase 4: the strip is now 140px and every sticky offset hangs off the
       measurement, so a stale number is a visible misalignment. Three passes
       settle it: the next frame (after this subtree is laid out), the next
       task (after the other mounts have run and m-summary has mirrored its
       jumps into the head), and the web font landing, which is the one thing
       that can change the head's height after everything else is final. */
    if (global.requestAnimationFrame) global.requestAnimationFrame(measureHeight);
    global.setTimeout(measureHeight, 0);
    if (document.fonts && document.fonts.ready && document.fonts.ready.then) {
      document.fonts.ready.then(measureHeight);
    }
  }

  /* the same gold advantage array the economy chart draws, in miniature,
     so the strip is a readable map of the game and not a bare ruler */
  function buildSpark() {
    var g = goldSeries();
    var W = 1000, H = 46, MID = H / 2;
    var node = svg('svg', {
      'class': 'mt-tl-spark', viewBox: '0 0 ' + W + ' ' + H,
      preserveAspectRatio: 'none', 'aria-hidden': 'true', focusable: 'false'
    });
    if (!g) {
      node.appendChild(svg('line', { x1: 0, y1: MID, x2: W, y2: MID, 'class': 'mt-tl-zero' }));
      return node;
    }
    var max = 1;
    for (var i = 0; i <= last && i < g.length; i++) max = Math.max(max, Math.abs(g[i]));
    var xs = function (i) { return (i / Math.max(1, last)) * W; };
    /* Shape only, never a measurement. The game ends 17,557 gold apart, so a
       linear 46px strip would flatten VISION's 4,794 peak into the zero line
       and the map would stop being a map. The amplitude is a signed square
       root; every number the strip prints comes from the array untouched,
       and the economy chart draws the same array on a linear scale. */
    var ys = function (v) {
      var t = Math.sqrt(Math.abs(v) / max);
      return MID - (v < 0 ? -t : t) * (MID - 3);
    };

    var up = [], dn = [];
    for (var n = 0; n <= last && n < g.length; n++) {
      up.push([xs(n), ys(Math.max(0, g[n]))]);
      dn.push([xs(n), ys(Math.min(0, g[n]))]);
    }
    function area(pts) {
      var d = Hub.svgPath(pts, false);
      return d + ' L ' + xs(last) + ' ' + MID + ' L 0 ' + MID + ' Z';
    }
    node.appendChild(svg('path', { d: area(up), fill: 'var(--spark-dire-fill)', stroke: 'none' }));
    node.appendChild(svg('path', { d: area(dn), fill: 'var(--spark-radiant-fill)', stroke: 'none' }));
    node.appendChild(svg('path', { d: Hub.svgPath(up.map(function (p, i) { return [xs(i), ys(g[i])]; }), false), fill: 'none', stroke: 'var(--color-rdy-white-25)', 'stroke-width': 1 }));
    node.appendChild(svg('line', { x1: 0, y1: MID, x2: W, y2: MID, 'class': 'mt-tl-zero' }));
    return node;
  }

  function renderBands() {
    if (!els) return;
    els.bands.textContent = '';
    var ph = opts.phases || DEFAULTS.phases;
    for (var i = 0; i < ph.length; i++) {
      var from = ph[i].from;
      var to = (ph[i].to === null || ph[i].to === undefined) ? last : Math.min(ph[i].to, last);
      if (to <= from) continue;
      els.bands.appendChild(h('div', {
        'class': 'mt-tl-band mt-tl-band--' + ph[i].id,
        style: 'left:' + pct(from) + '%;width:' + (pct(to) - pct(from)) + '%'
      }, h('span', { 'class': 'mt-tl-band-label' }, ph[i].label)));
    }
  }

  function renderTicks() {
    if (!els) return;
    els.ticks.textContent = '';
    for (var i = 0; i <= last; i += opts.tickEvery) {
      var major = i % opts.labelEvery === 0;
      els.ticks.appendChild(h('div', {
        'class': 'mt-tl-tick' + (major ? ' mt-tl-tick--major' : ''),
        style: 'left:' + pct(i) + '%'
      }));
      if (major && i > 0 && i < last - 2) {
        els.ticks.appendChild(h('div', {
          'class': 'mt-tl-tick-label u-tnum',
          style: 'left:' + pct(i) + '%'
        }, String(i)));
      }
    }
  }

  function renderMarks() {
    if (!els) return;
    els.marks.textContent = '';
    els.markEls = {};
    for (var i = 0; i < snaps.length; i++) {
      var s = snaps[i];
      var left = pct(s.index);
      var clk = s.seconds !== null && s.seconds !== undefined ? fmt.clock(s.seconds) : clockAt(s.index);
      var mark = h('div', {
        'class': 'mt-tl-mark mt-tl-mark--' + s.kind + (s.side ? ' mt-tl-mark--' + s.side : ''),
        style: 'left:' + left + '%',
        title: s.label ? (clk + '  ' + s.label) : clk,
        dataset: { snapId: s.id }
      });
      var label = h('div', {
        'class': 'mt-tl-mark-label',
        style: 'left:clamp(88px, ' + left + '%, calc(100% - 88px))'
      }, s.short || s.label || clk);
      els.marks.appendChild(mark);
      els.marks.appendChild(label);
      els.markEls[s.id] = { mark: mark, label: label };
    }
  }

  function measureHeight() {
    if (!els || !els.root || !document.documentElement) return;
    var wrap = els.root.closest ? els.root.closest('.m-timeline-wrap') : null;
    var hgt = Math.round((wrap || els.root).getBoundingClientRect().height);
    if (hgt > 0) document.documentElement.style.setProperty('--match-timeline-h', hgt + 'px');
    /* the magnet radius is measured in px, so it needs a px per index that
       is right before the first pointer event, not only after one */
    var w = els.plot.getBoundingClientRect().width;
    if (w > 0) { rectWidth = w; pxPerIndex = w / Math.max(1, last); }
  }

  var lastSpoken = '';
  var lastPlaying = null;
  var lastSpeed = null;

  var PLAY_D = 'M8 5v14l11-7z';
  var PAUSE_D = 'M7 5h3.5v14H7zm6.5 0H17v14h-3.5z';

  function paintTransport(st, r) {
    if (!els || !els.playBtn) return;
    els.playClock.textContent = r.clock;
    /* the progress affordance: one variable, no layout */
    els.playBtn.style.setProperty('--p', String(last > 0 ? clampIdx(st.index) / last : 0));

    if (st.playing !== lastPlaying) {
      lastPlaying = st.playing;
      els.playBtn.setAttribute('aria-pressed', st.playing ? 'true' : 'false');
      els.playBtn.setAttribute('aria-label', st.playing ? 'Pause the time lapse' : 'Play the match as a time lapse');
      els.playBtn.title = st.playing ? 'Pause the time lapse' : 'Play the match as a time lapse';
      els.playWord.textContent = st.playing ? 'Pause' : 'Play';
      els.playGlyph.textContent = '';
      els.playGlyph.appendChild(Hub.icon(st.playing ? PAUSE_D : PLAY_D));
    }

    if (st.speed !== lastSpeed) {
      lastSpeed = st.speed;
      els.speedBtn.textContent = st.speed + 'x';
      els.speedBtn.setAttribute('aria-label', 'Playback speed, ' + st.speed + 'x');
    }

    els.startBtn.disabled = st.index <= 0;
    els.endBtn.disabled = st.index >= last;
  }

  function render(st) {
    if (!els) return;
    var r = readout(st.index);

    /* the visual IS the state: one variable moves the whole cursor group */
    var frac = last > 0 ? clampIdx(st.position) / last : 0;
    els.cursor.style.setProperty('--x', String(frac));
    els.track.style.setProperty('--rubber', st.rubberPx.toFixed(2) + 'px');

    var overEnd = st.rubberPx > 0 ? Math.min(1, st.rubberPx / opts.rubberMax) : 0;
    var overStart = st.rubberPx < 0 ? Math.min(1, -st.rubberPx / opts.rubberMax) : 0;
    els.edgeEnd.style.setProperty('--edge', String(overEnd));
    els.edgeStart.style.setProperty('--edge', String(overStart));

    els.clock.textContent = r.clock;
    els.bubble.textContent = r.clock;
    /* keep the bubble inside the plot at both ends without re-measuring:
       rectWidth is the cached plot width, half the bubble is a constant */
    var half = 28, px = frac * rectWidth, off = 0;
    if (px < half) off = half - px;
    else if (px > rectWidth - half) off = (rectWidth - half) - px;
    els.bubble.style.transform = 'translateX(calc(-50% + ' + off.toFixed(1) + 'px))';
    els.phase.textContent = (r.isFinal ? 'Final' : (r.phase ? r.phase.label : ''));

    if (r.gold) {
      els.goldStat.hidden = false;
      els.goldVal.textContent = r.gold.value === 0 ? 'Level' : (r.gold.leaderTag + ' +' + fmt.num(r.gold.abs));
      els.goldVal.className = 'mt-tl-stat-value u-tnum' + (r.gold.side ? ' is-' + r.gold.side : '');
    } else {
      els.goldStat.hidden = true;
    }

    if (r.kills) {
      els.killsStat.hidden = false;
      els.killsVal.textContent = '';
      var pair = Hub.killsPair({ radiant: r.kills.radiant, dire: r.kills.dire }, facts().radiantKey, facts().direKey, { left: facts().radiantKey });
      if (pair) els.killsVal.appendChild(pair);
    } else {
      els.killsStat.hidden = true;
    }

    var shown = st.captured || r.moment;
    if (shown) {
      els.momentTime.textContent = shown.seconds !== null && shown.seconds !== undefined ? fmt.clock(shown.seconds) : fmt.clockFromMinutes(shown.index);
      els.momentText.textContent = shown.label || '';
      els.moment.classList.toggle('is-captured', !!st.captured);
    } else {
      els.momentTime.textContent = '';
      els.momentText.textContent = '';
      els.moment.classList.remove('is-captured');
    }

    els.root.classList.toggle('is-captured', !!st.captured);
    els.root.classList.toggle('is-playing', !!st.playing);
    paintJumps(st);
    paintTransport(st, r);

    for (var id in els.markEls) {
      if (!els.markEls.hasOwnProperty(id)) continue;
      var m = els.markEls[id];
      var s = snapIds[id];
      var isCap = !!(st.captured && st.captured.id === id);
      var isAt = s && s.index === st.index;
      var near = !isCap && s && Math.abs(st.position - s.index) * pxPerIndex <= magnetRadius() * 2.2;
      m.mark.classList.toggle('is-captured', isCap);
      m.mark.classList.toggle('is-at', !!isAt);
      m.mark.classList.toggle('is-near', !!near);
      m.label.classList.toggle('is-on', isCap);
    }

    els.plot.setAttribute('aria-valuenow', String(st.index));
    var text = 'Minute ' + st.index + ' of ' + last +
      (r.gold ? ', ' + (r.gold.value === 0 ? 'gold level' : Hub.teamName(r.gold.leaderKey) + ' ahead by ' + fmt.num(r.gold.abs) + ' gold') : '') +
      (r.kills ? ', kills ' + Hub.killsPairText({ radiant: r.kills.radiant, dire: r.kills.dire }, facts().radiantKey, facts().direKey, { left: facts().radiantKey }) : '') +
      (r.isFinal ? ', the final reading' : '') +
      (st.playing ? ', playing' : '');
    els.plot.setAttribute('aria-valuetext', text);
    if (st.state === 'idle' && text !== lastSpoken) {
      lastSpoken = text;
      els.live.textContent = text;
    }
  }

  /* ------------------------------------------------------------
     5. The banner
     ------------------------------------------------------------ */

  function teamBlock(side, f) {
    var t = side === 'radiant' ? f.radiant : f.dire;
    var key = t.key || (side === 'radiant' ? f.radiantKey : f.direKey);
    var won = f.winnerKey ? f.winnerKey === key : null;
    var crest = h('div', { 'class': 'm-bn-crest' }, Hub.teamCrest(key, 'lg'));
    var alias = t.nameNote ? h('span', { 'class': 'm-bn-alias' }, t.nameNote) : null;

    var teamHref = Hub.link.team(rdyTeamId(key));
    var label = t.name || Hub.teamName(key);
    var names = h('div', { 'class': 'm-bn-names' },
      h('div', { 'class': 'm-bn-name' },
        teamHref ? Hub.extLink(teamHref, { 'class': 'm-bn-name-link' }, label) : label),
      h('div', { 'class': 'm-bn-sub' },
        h('span', { 'class': 'chip chip--' + side }, side === 'radiant' ? 'Radiant' : 'Dire'),
        won === true ? h('span', { 'class': 'chip chip--gold' }, 'Winner') : null,
        alias));

    var cls = 'm-bn-team m-bn-team--' + side + (won === false ? ' m-bn-team--lost' : '');
    var block = side === 'radiant'
      ? h('div', { 'class': cls, 'data-testid': 'home-team', dataset: { teamId: key } }, crest, names)
      : h('div', { 'class': cls, 'data-testid': 'away-team', dataset: { teamId: key } }, names, crest);
    return block;
  }

  function fact(label, value) {
    if (value === null || value === undefined || value === '') return null;
    return h('div', { 'class': 'm-bn-fact' },
      h('span', { 'class': 'm-bn-fact-label' }, label),
      h('span', { 'class': 'm-bn-fact-value' }, value));
  }

  function buildBanner(mount) {
    var f = facts();
    var winnerName = f.seriesWinnerKey ? Hub.teamName(f.seriesWinnerKey) : null;

    /* COMPACT: the crest row below is dropped in compact, so the winner tag
       it carried moves up here, where it is one chip beside the stage. */
    var bannerWinner = f.winnerKey ? Hub.teamName(f.winnerKey) : null;

    var chips = h('div', { 'class': 'm-bn-chips' },
      h('span', { 'class': 'chip chip--gold' }, f.stage),
      h('span', { 'class': 'chip chip--outline' }, fmt.bo(f.bo)),
      h('span', { 'class': 'chip chip--outline' }, 'Game ' + f.game),
      h('span', { 'class': 'chip' }, 'Final'),
      bannerWinner
        ? h('span', { 'class': 'chip chip--gold m-bn-winchip', 'data-testid': 'winner-tag' },
            'Winner ' + bannerWinner)
        : null);

    /* M-07: the page's <h1> is the match itself, and it is the first and only
       heading of its level in document order. NO NARRATIVE RULE, 2026-09-11:
       with the write up gone this is the page's whole subject line, and it is
       one template over the record, winner first, kills then duration. */
    var winKey = f.winnerKey || (f.winner === 'dire' ? f.direKey : f.radiantKey);
    var loseKey = winKey === f.direKey ? f.radiantKey : f.direKey;
    var winKills = f.killScore ? f.killScore[winKey === f.direKey ? 'dire' : 'radiant'] : null;
    var loseKills = f.killScore ? f.killScore[winKey === f.direKey ? 'radiant' : 'dire'] : null;
    var title = h('h1', { 'class': 'm-bn-title' },
      f.stage + ' Game ' + f.game + ': ' + Hub.teamName(winKey) +
      (winKills !== null && loseKills !== null
        ? ' ' + winKills + ' : ' + loseKills + ' ' : ' ') +
      Hub.teamName(loseKey) + (f.duration ? ', ' + f.duration : ''));

    var centre = h('div', { 'class': 'm-bn-centre' });
    if (f.killScore) {
      centre.appendChild(h('div', { 'class': 'm-bn-score', 'data-testid': 'score' },
        Hub.killsPair(f.killScore, f.radiantKey, f.direKey, { left: f.radiantKey })));
    }
    if (f.duration) centre.appendChild(h('div', { 'class': 'm-bn-duration' }, f.duration));

    var row = h('div', { 'class': 'm-bn-row' },
      teamBlock('radiant', f), centre, teamBlock('dire', f));

    var factPairs = [
      ['Series', f.seriesScore && winnerName ? winnerName + ' ' + f.seriesScore : null],
      ['Date', f.dateLabel],
      ['Venue', f.venue],
      ['Mode', f.gameMode],
      ['Patch', f.patch],
      ['Match', f.matchId ? String(f.matchId) : null]
    ];

    var facts_ = h('div', { 'class': 'm-bn-facts u-when-detailed' },
      factPairs.map(function (pair) { return fact(pair[0], pair[1]); }));

    /* COMPACT: the same six readings as ONE muted line. Nothing is dropped and
       nothing is typed: the line is templated over the pairs the grid uses. */
    var factLineBits = [];
    factPairs.forEach(function (pair) {
      if (pair[1] === null || pair[1] === undefined || pair[1] === '') return;
      factLineBits.push(h('span', { 'class': 'm-bn-factbit' },
        h('span', { 'class': 'm-bn-factbit-label' }, pair[0]),
        h('span', { 'class': 'm-bn-factbit-value u-tnum' }, String(pair[1]))));
    });
    /* COMP-3, 2026-09-12: a team's nameNote lived only in the crest row, which
       compact drops, and it was the one reading the compact page could not
       reach at all. It joins the fact line, labelled with the team's own tag,
       templated over the record so a second note would print too. */
    [ f.radiant, f.dire ].forEach(function (t) {
      if (!t || !t.nameNote) return;
      factLineBits.push(h('span', { 'class': 'm-bn-factbit' },
        h('span', { 'class': 'm-bn-factbit-label' }, t.tag || t.name),
        h('span', { 'class': 'm-bn-factbit-value' }, String(t.nameNote))));
    });

    var factLine = h('p', {
      'class': 'm-bn-factline u-when-compact u-dim',
      'data-testid': 'match-factline'
    }, factLineBits);

    var ser = (MATCH().series || {});
    var seriesHref = Hub.link.series(ser.seriesRdyId ||
      (global.GAME_INDEX && global.GAME_INDEX.seriesRdyId) || null);
    var links = h('div', { 'class': 'm-bn-links' },
      h('a', { 'class': 'btn btn-ghost btn-sm', href: 'TI2026_Hub_Prototype_rdy_gg.html' }, 'Back to the Hub'),
      seriesHref ? Hub.extLink(seriesHref, { 'class': 'btn btn-ghost btn-sm' }, 'Series on rdy.gg') : null,
      Hub.extLink('https://www.twitch.tv/dota2ti', { 'class': 'btn btn-primary btn-sm' }, 'Watch on Twitch'));

    /* COMPACT: the crest row repeats the two teams the series header already
       draws, and the h1 above already carries the winner, the kill score and
       the duration, so it is the block that goes. DETAILED brings it back. */
    row.classList.add('u-when-detailed');

    mount.appendChild(h('div', { 'class': 'm-bn', 'data-testid': 'match-overview' },
      h('div', { 'class': 'm-bn-inner' },
        chips, title, row, factLine,
        h('div', { 'class': 'm-bn-foot' }, facts_, links))));
  }

  /* ------------------------------------------------------------
     6. Boot
     ------------------------------------------------------------ */

  function init(o) {
    opts = {};
    var k;
    for (k in DEFAULTS) if (DEFAULTS.hasOwnProperty(k)) opts[k] = DEFAULTS[k];
    if (o) for (k in o) if (o.hasOwnProperty(k) && o[k] !== undefined) opts[k] = o[k];

    if (!opts.raf) opts.raf = function (fn) { return global.requestAnimationFrame(fn); };
    if (!opts.caf) opts.caf = function (id) { return global.cancelAnimationFrame(id); };

    if (opts.reducedMotion === null && global.matchMedia) {
      opts.reducedMotion = global.matchMedia('(prefers-reduced-motion: reduce)');
    }

    last = (o && typeof o.last === 'number') ? o.last : resolveLast();
    if (!(last > 0)) last = DEFAULTS.last;

    /* the phases are in the data, with the same boundaries the economy
       chart bands and the phase tiles use */
    if (!(o && o.phases) && G5().phases && G5().phases.length) {
      opts.phases = G5().phases.map(function (p) {
        return { id: p.key, label: p.label, from: p.from, to: p.to };
      });
    }

    var start = (typeof opts.startIndex === 'number') ? clampIdx(opts.startIndex) : last;
    /* a fresh init is a fresh frame state: drop a pending return, a pending
       tick and a pending flush, so swapping the frame clock strands none */
    if (returnRaf && opts.caf) { opts.caf(returnRaf); }
    returnRaf = 0;
    stopTimer();
    playing = false;
    speedIdx = 0;
    frameQueued = false;
    position = start;
    index = start;
    captured = null;
    mode = 'idle';
    if (opts.seedSnapPoints !== false) seedSnapPoints();
    schedule();
    return MatchTimeline;
  }

  /* ------------------------------------------------------------
     6b. reset: the map switcher swapped window.G5
     ------------------------------------------------------------
     Every reader of the old game must be dropped before the new one is
     rendered, or a stale subscriber paints game 5's numbers onto game 2.
     reset drops the wiring (subscribers, highlight subscribers, snap points,
     mirrored jumps, the memoised series, the built strip) and then runs
     init against whatever window.G5 now is. It does NOT rebuild the DOM:
     Hub.remountAll() re-runs m-timeline and m-banner like every other
     mount, which is what rebuilds the strip and the banner. Call order is
     therefore: set window.G5, reset, Hub.remountAll. */
  function reset(o) {
    o = o || {};
    subs = [];
    hlSubs = [];
    if (highlighted !== null) {
      highlighted = null;
      if (document.body) document.body.classList.remove('has-hl');
    }
    snaps = [];
    snapIds = {};
    pendingJumps = null;
    els = null;
    lastSpoken = '';
    lastPlaying = null;
    lastSpeed = null;
    cache = {};
    if (o.last === undefined) o.last = resolveLast();
    if (o.startIndex === undefined) o.startIndex = o.last;
    init(o);
    return MatchTimeline;
  }

  var MatchTimeline = {
    version: '1.0.0',
    init: init,
    reset: reset,

    /* state */
    get index() { return index; },
    get position() { return position; },
    get fraction() { return last > 0 ? position / last : 0; },
    get state() { return mode; },
    get captured() { return captured; },
    get last() { return last; },
    get playing() { return playing; },
    get speedValue() { return speedValue(); },
    get highlighted() { return highlighted; },
    get options() { return opts; },
    get snapPoints() { return snaps.slice(); },
    getState: snapshotState,

    /* moves */
    set: set,
    setFraction: setFraction,
    step: step,
    pin: pin,
    unpin: unpin,
    togglePin: togglePin,

    /* play, the time lapse */
    play: play,
    pause: pause,
    toggle: toggle,
    speed: speed,

    /* wiring */
    subscribe: subscribe,
    attachScrubSurface: attachScrubSurface,
    attachJumpSurface: attachJumpSurface,
    addSnapPoints: addSnapPoints,
    clearSnapPoints: clearSnapPoints,
    snapAtOrBefore: snapAtOrBefore,
    nearestSnap: nearestSnap,
    highlightPlayer: highlightPlayer,
    onHighlight: onHighlight,
    quietLive: quietLive,
    gainSide: gainSide,
    mirrorJumps: mirrorJumps,

    /* derived readings, all from the arrays */
    readout: readout,
    goldAt: goldAt,
    killsAt: killsAt,
    clockAt: clockAt,
    phaseAt: phaseAt,
    goldSeries: goldSeries,
    killSeries: killSeries,
    facts: facts,
    sides: sides,

    /* test and data hooks */
    measure: measureHeight,
    secondsAt: secondsAt,
    seedSnapPoints: seedSnapPoints,
    refresh: function () {
      cache = {};
      last = resolveLast();
      seedSnapPoints();
      renderBands(); renderTicks(); renderMarks();
      if (els && els.spark && els.spark.parentNode) {
        var next = buildSpark();
        els.spark.parentNode.replaceChild(next, els.spark);
        els.spark = next;
      }
      set(clampIdx(index));
      return last;
    }
  };

  global.MatchTimeline = MatchTimeline;

  /* Every component receives { TI2026, G5, Timeline, Hub }. hub/core.js
     only knows about TI2026, GF5 and Hub, and it is not ours to edit, so
     the context is widened here, once, for everybody. */
  var coreRegister = Hub.register;
  Hub.register = function (mountId, fn) {
    if (typeof fn !== 'function') return coreRegister.call(Hub, mountId, fn);
    return coreRegister.call(Hub, mountId, function (mount, ctx) {
      ctx = ctx || {};
      ctx.G5 = global.G5 || {};
      ctx.Timeline = MatchTimeline;
      ctx.Hub = Hub;
      return fn(mount, ctx);
    });
  };

  init();

  Hub.register('m-timeline', function (mount) {
    buildStrip(mount);
    subscribe(render);
  });

  Hub.register('m-banner', function (mount) {
    buildBanner(mount);
  });

  /* the strip height feeds every sticky offset on the page */
  if (global.ResizeObserver) {
    global.addEventListener('load', function () {
      var wrap = document.querySelector('.m-timeline-wrap');
      if (!wrap) return;
      var ro = new global.ResizeObserver(function () { measureHeight(); });
      ro.observe(wrap);
      measureHeight();
    });
  } else {
    global.addEventListener('load', measureHeight);
  }

  /* ------------------------------------------------------------
     M-13: reserve every image's box before it decodes.
     Hub.heroImg / itemIcon / teamCrest / avatar live in hub/core.js, which
     this page may not edit, so the intrinsic size is stamped here, once per
     image, from the asset family. CSS still sizes the rendered box; the
     attributes only give the browser an aspect ratio to hold while the file
     is in flight, which matters because 848 of them are loading="lazy".
     ------------------------------------------------------------ */
  var IMG_BOX = [
    ['hero-portrait', 256, 144],
    ['mt-it-img', 88, 64],
    ['item-icon', 88, 64],
    ['team-logo', 128, 128],
    ['monogram', 128, 128],
    ['avatar', 128, 128]
  ];

  function reserveImage(img) {
    if (!img || img.nodeName !== 'IMG' || img.hasAttribute('width')) return;
    var cls = ' ' + (img.getAttribute('class') || '') + ' ';
    for (var i = 0; i < IMG_BOX.length; i++) {
      if (cls.indexOf(' ' + IMG_BOX[i][0]) > -1 || cls.indexOf(IMG_BOX[i][0]) > -1) {
        img.setAttribute('width', String(IMG_BOX[i][1]));
        img.setAttribute('height', String(IMG_BOX[i][2]));
        return;
      }
    }
  }

  function reserveTree(node) {
    if (!node || node.nodeType !== 1) return;
    if (node.nodeName === 'IMG') { reserveImage(node); return; }
    if (!node.querySelectorAll) return;
    var imgs = node.querySelectorAll('img:not([width])');
    for (var i = 0; i < imgs.length; i++) reserveImage(imgs[i]);
  }

  global.addEventListener('load', function () {
    var page = document.querySelector('.match-page') || document.body;
    reserveTree(page);
    /* modules rebuild rows as the index moves, so new images are stamped too */
    if (!global.MutationObserver) return;
    var mo = new global.MutationObserver(function (records) {
      for (var r = 0; r < records.length; r++) {
        var added = records[r].addedNodes;
        for (var a = 0; a < added.length; a++) reserveTree(added[a]);
      }
    });
    mo.observe(page, { childList: true, subtree: true });
  });

  /* Escape stops the time lapse from anywhere on the page */
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && playing) { pause(); }
  });

})(window);
