/* ============================================================
   match/items.js
   #m-items : ten purchase tracks on the same minute scale as the
   master strip.

   Owned at index i is the data rule, never a guess:
     seconds <= secondsAt[i] && (consumedAt === null || consumedAt > secondsAt[i])

   Owns: .mt-it-* only. Reads MatchTimeline, never keeps its own index.
   ============================================================ */
(function (global) {
  'use strict';

  var Hub = global.Hub;
  if (!Hub || typeof Hub.register !== 'function') return;

  var h = Hub.h;
  var fmt = Hub.fmt;

  /* ---- 9. options with defaults ---- */
  var DEFAULTS = {
    iconW: 26,           /* completed item icon width in px */
    iconH: 19,
    compW: 13,           /* component and recipe icon width */
    compH: 10,
    consW: 6,            /* consumable dot, only when the filter is on */
    packing: 0.7,        /* minimum gap between two icons, as a share of the width.
                            0.55 left adjacent laning buys shingled up to 46 percent;
                            0.7 caps the overlap at 30 percent. */
    narrowAt: 560,       /* track widths under this drop to the small icon set */
    iconWNarrow: 21,
    iconHNarrow: 15,
    compWNarrow: 11,
    compHNarrow: 8,
    showConsumables: false,
    storySnapId: 'item-lotus',
    tickEvery: 5,
    labelEvery: 10
  };

  function clamp01(v) { return v < 0 ? 0 : (v > 1 ? 1 : v); }
  function reducedMotion() {
    return !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  Hub.register('m-items', function (mount, ctx) {
    var G5 = ctx.G5 || {};
    var T = ctx.Timeline;
    if (!T || !G5.players || !G5.minutes) return;

    var opts = {};
    var userOpts = (global.MatchItemsOptions || {});
    for (var k in DEFAULTS) {
      if (Object.prototype.hasOwnProperty.call(DEFAULTS, k)) {
        opts[k] = Object.prototype.hasOwnProperty.call(userOpts, k) ? userOpts[k] : DEFAULTS[k];
      }
    }

    var M = G5.minutes;
    var LAST = M.last;
    var SEC = M.secondsAt;
    var radiantKey = G5.match.radiant.key;
    var direKey = G5.match.dire.key;

    function fOf(seconds) {
      var mins = Math.max(0, seconds) / 60;
      return clamp01(Math.min(mins, LAST) / LAST);
    }
    function indexOwned(seconds) {
      if (seconds <= 0) return 0;
      return Math.max(0, Math.min(LAST, Math.ceil(seconds / 60)));
    }

    /* ============================================================
       1. The story item registers its own magnet
       ============================================================ */
    var story = null;
    for (var pi = 0; pi < G5.players.length && !story; pi++) {
      var tl = G5.players[pi].items.timeline;
      for (var ti = 0; ti < tl.length; ti++) {
        if (tl[ti].storyItem) { story = { player: G5.players[pi], entry: tl[ti] }; break; }
      }
    }
    if (story) {
      T.addSnapPoints([{
        seconds: story.entry.seconds,
        index: Math.min(LAST, story.entry.minute),
        id: opts.storySnapId,
        kind: 'story',
        side: story.player.side,
        label: story.player.handle + ' buys the ' + story.entry.display + ' at ' + story.entry.clock,
        short: story.entry.display,
        priority: 9
      }]);
    }

    /* ============================================================
       2. DOM
       ============================================================ */

    var consBtn = h('button', {
      type: 'button', 'class': 'chip-filter mt-it-consbtn',
      'aria-pressed': opts.showConsumables ? 'true' : 'false',
      onclick: function () {
        opts.showConsumables = !opts.showConsumables;
        consBtn.setAttribute('aria-pressed', opts.showConsumables ? 'true' : 'false');
        frame.classList.toggle('is-cons', opts.showConsumables);
        layout();
      }
    }, 'Consumables');

    var clockChip = h('span', { 'class': 'mt-it-clock u-tnum' }, '');

    var legend = h('div', { 'class': 'm-legend mt-it-legend' },
      h('span', { 'class': 'm-legend-item' }, h('span', { 'class': 'mt-it-key mt-it-key--owned' }), 'Bought by the clock'),
      h('span', { 'class': 'm-legend-item' }, h('span', { 'class': 'mt-it-key mt-it-key--future' }), 'Bought later'),
      h('span', { 'class': 'm-legend-item' }, h('span', { 'class': 'mt-it-key mt-it-key--spent' }), 'Folded into a later item'),
      h('span', { 'class': 'm-legend-item' }, h('span', { 'class': 'mt-it-key mt-it-key--final' }), 'In the final six'),
      h('span', { 'class': 'm-legend-item' }, h('span', { 'class': 'mt-it-key mt-it-key--story' }), 'Story item'),
      h('span', { 'class': 'm-legend-item mt-it-legend-note' }, 'Big lane: completed items. Small lane: components and recipes, dimmed once a later item swallows them. The chip at the end of each row counts consumables, which are kept off the track.'));

    /* the detail strip: hover information that is also there without a pointer */
    var dIcon = h('span', { 'class': 'mt-it-detail-icon' });
    var dName = h('span', { 'class': 'mt-it-detail-name' }, '');
    var dMeta = h('span', { 'class': 'mt-it-detail-meta u-tnum' }, '');
    var dNote = h('span', { 'class': 'mt-it-detail-note' }, '');
    var detail = h('div', { 'class': 'mt-it-detail', 'data-testid': 'items-detail' },
      dIcon,
      h('span', { 'class': 'mt-it-detail-text' },
        h('span', { 'class': 'mt-it-detail-line' }, dName, dMeta),
        dNote));

    /* ruler: the scrub surface, exactly the width of every track below it */
    var ruler = h('div', {
      'class': 'mt-it-ruler',
      tabindex: '0',
      role: 'slider',
      'aria-label': 'Item timeline, drag to move the match clock',
      'aria-valuemin': '0',
      'aria-valuemax': String(LAST),
      'aria-valuenow': String(T.index),
      'aria-valuetext': ''
    });
    (function buildRuler() {
      var bands = h('div', { 'class': 'mt-it-bands' });
      (G5.phases || []).forEach(function (p) {
        bands.appendChild(h('div', {
          'class': 'mt-it-band mt-it-band--' + p.key,
          style: 'left:' + (p.from / LAST * 100) + '%; width:' + ((Math.min(p.to, LAST) - p.from) / LAST * 100) + '%'
        }, h('span', { 'class': 'mt-it-band-label' }, p.label)));
      });
      ruler.appendChild(bands);
      var ticks = h('div', { 'class': 'mt-it-rticks' });
      for (var t = 0; t <= LAST; t += opts.tickEvery) {
        var major = t % opts.labelEvery === 0;
        ticks.appendChild(h('span', {
          'class': 'mt-it-rtick' + (major ? ' mt-it-rtick--major' : ''),
          style: 'left:' + (t / LAST * 100) + '%'
        }));
        if (major && t > 0 && t < LAST - 2) {
          ticks.appendChild(h('span', {
            'class': 'mt-it-rlabel u-tnum', style: 'left:' + (t / LAST * 100) + '%'
          }, String(t)));
        }
      }
      ruler.appendChild(ticks);
    })();

    var rulerMarks = h('div', { 'class': 'mt-it-rmarks' });
    ruler.appendChild(rulerMarks);

    var head = h('div', { 'class': 'mt-it-row mt-it-head' },
      h('div', { 'class': 'mt-it-name mt-it-headname' }, h('span', { 'class': 'm-sub' }, 'Player'), clockChip),
      h('div', { 'class': 'mt-it-track mt-it-headtrack' }, ruler),
      h('div', { 'class': 'mt-it-end' }, h('span', { 'class': 'm-sub' }, 'At clock')));

    var rowsWrap = h('div', { 'class': 'mt-it-rows' });

    var cursor = h('div', { 'class': 'm-cursor mt-it-cursor', style: '--x: 1' },
      h('div', { 'class': 'm-cursor-line' }));
    var cursorLayer = h('div', { 'class': 'mt-it-cursorlayer' }, cursor);

    var frame = h('div', { 'class': 'mt-it-frame' + (opts.showConsumables ? ' is-cons' : '') },
      head, rowsWrap, cursorLayer);

    var card = h('section', { 'class': 'card mt-it', 'data-testid': 'match-items' },
      h('div', { 'class': 'card-header mt-it-header' },
        h('div', { 'class': 'titles' },
          h('h2', { 'class': 'title' }, 'Purchases'),
          h('div', { 'class': 'subtitle' }, 'Every buy on the match clock. Items in full colour are the ones held at the minute the timeline is on.')),
        h('div', { 'class': 'action' }, consBtn)),
      h('div', { 'class': 'card-body mt-it-body' }, legend, detail, frame));

    mount.textContent = '';
    mount.appendChild(card);

    /* ============================================================
       3. Rows
       ============================================================ */

    var rows = [];

    /* the real inventory at the whistle, so the track can mark it */
    var finalSets = {};
    G5.players.forEach(function (p) {
      var set = {};
      (p.items.final || []).forEach(function (it) { if (it) set[it] = true; });
      finalSets[p.key] = set;
    });

    G5.players.forEach(function (p, n) {
      var sideCls = p.side === 'radiant' ? 'radiant' : 'dire';

      var portrait = p.portrait
        ? h('img', { 'class': 'hero-portrait hero-portrait-sm hero-portrait--' + sideCls, src: p.portrait, alt: '', loading: 'lazy' })
        : Hub.heroImg(p.hero, { side: sideCls, size: 'sm', alt: '' });

      var countItems = h('b', { 'class': 'u-tnum' }, '0');
      var countCons = h('b', { 'class': 'u-tnum' }, '0');

      var nameCell = h('div', { 'class': 'mt-it-name' },
        portrait,
        h('span', { 'class': 'mt-it-who' },
          h('span', { 'class': 'mt-it-handle u-truncate' }, p.handle),
          h('span', { 'class': 'mt-it-hero u-truncate' }, p.heroDisplay)));

      var mainLane = h('div', { 'class': 'mt-it-lane mt-it-lane--main' });
      var compLane = h('div', { 'class': 'mt-it-lane mt-it-lane--comp' });
      var consLane = h('div', { 'class': 'mt-it-lane mt-it-lane--cons' });
      var tickLane = h('div', { 'class': 'mt-it-lane mt-it-lane--ticks' });

      var track = h('div', { 'class': 'mt-it-track' }, mainLane, compLane, consLane, tickLane);

      var endCell = h('div', { 'class': 'mt-it-end' },
        h('span', { 'class': 'mt-it-count' }, countItems, h('i', null, 'buys')),
        h('span', { 'class': 'mt-it-count mt-it-count--cons' }, countCons, h('i', null, 'cons.')));

      var row = h('div', {
        'class': 'mt-it-row mt-it-prow m-hl is-' + sideCls,
        dataset: { playerKey: p.key, playerId: p.rdyPlayerId === null ? '' : String(p.rdyPlayerId) },
        'data-testid': 'player-card',
        onmouseenter: function () { T.highlightPlayer(p.key); },
        onmouseleave: function () { T.highlightPlayer(null); }
      }, nameCell, track, endCell);

      /* ---- the entries, split into the three lanes ---- */
      var mainItems = [], compItems = [], consItems = [];
      var icons = [];

      p.items.timeline.forEach(function (e) {
        var lane = e.consumable ? 'cons' : ((e.consumedAt !== null || e.recipe) ? 'comp' : 'main');
        var w = lane === 'main' ? opts.iconW : (lane === 'comp' ? opts.compW : opts.consW);
        var el;
        var label = e.display + ', ' + p.handle + ', bought ' + e.clock + ', ' + fmt.num(e.cost) + ' gold';

        if (lane === 'cons') {
          el = h('span', { 'class': 'mt-it-dot', title: label });
        } else {
          var inner = e.icon
            ? h('img', { 'class': 'mt-it-img', src: e.icon, alt: '', loading: 'lazy' })
            : h('span', { 'class': 'mt-it-chip' }, (e.display || e.item).replace(/[^A-Za-z]/g, '').slice(0, 2).toUpperCase());
          el = h('button', {
            type: 'button',
            tabindex: '-1',
            'class': 'mt-it-item mt-it-item--' + lane +
              (e.storyItem ? ' is-story' : '') +
              (e.usedOnPickup ? ' is-used' : '') +
              (lane === 'main' && finalSets[p.key][e.item] ? ' is-final6' : '') +
              (lane === 'main' && p.items.neutral === e.item ? ' is-neutral' : ''),
            'aria-label': label,
            title: label,
            onclick: function () { T.togglePin(indexOwned(e.seconds)); showDetail(p, e); },
            onmouseenter: function () { showDetail(p, e); },
            onmouseleave: function () { resetDetail(); },
            onfocus: function () { showDetail(p, e); }
          }, inner);
        }

        var rec = {
          el: el, f: fOf(e.seconds), entry: e,
          from: indexOwned(e.seconds),
          to: e.consumedAt === null ? Infinity : indexOwned(e.consumedAt),
          status: ''
        };
        if (lane === 'main') { mainItems.push(rec); mainLane.appendChild(el); }
        else if (lane === 'comp') { compItems.push(rec); compLane.appendChild(el); }
        else { consItems.push(rec); consLane.appendChild(el); }
        if (lane !== 'cons') icons.push(rec);

        tickLane.appendChild(h('span', {
          'class': 'mt-it-tick mt-it-tick--' + lane + (e.storyItem ? ' is-story' : ''),
          style: 'left:' + (rec.f * 100) + '%'
        }));
      });

      /* cumulative counts, one pass, so the chips read the same arrays */
      var heldAt = [], consAt = [];
      for (var i = 0; i <= LAST; i++) {
        var cut = SEC[i], held = 0, cn = 0;
        for (var a = 0; a < icons.length; a++) {
          var e2 = icons[a].entry;
          if (e2.seconds <= cut && (e2.consumedAt === null || e2.consumedAt > cut) && !e2.recipe && !e2.usedOnPickup) held++;
        }
        for (var b = 0; b < consItems.length; b++) { if (consItems[b].entry.seconds <= cut) cn++; }
        heldAt.push(held); consAt.push(cn);
      }

      row.style.setProperty('--mt-it-i', String(n));
      rowsWrap.appendChild(row);

      rows.push({
        player: p, row: row, track: track,
        main: mainItems, comp: compItems, cons: consItems, icons: icons,
        heldAt: heldAt, consAt: consAt,
        countItems: countItems, countCons: countCons,
        endCell: endCell
      });
    });

    /* ============================================================
       items-keyboard-unreachable: a roving tabindex per track.
       330 buy buttons carried tabindex -1, so a keyboard reader could move
       the clock and never read a single purchase. Each track is now one tab
       stop; Left and Right walk the buys in that row, Up and Down move to the
       same position in the row above or below, Home and End jump to the first
       and last buy. The focused buy fills the detail card, which is the same
       reading a mouse gets from the tooltip.
       ============================================================ */
    (function rovingTabindex() {
      rows.forEach(function (r, ri) {
        var buys = r.main.concat(r.comp).filter(function (rec) { return rec.el.nodeName === 'BUTTON'; });
        buys.sort(function (a, b) { return a.entry.seconds - b.entry.seconds; });
        r.buys = buys;
        r.focusAt = 0;
        if (buys.length) buys[0].el.setAttribute('tabindex', '0');

        function focusAt(i) {
          if (!buys.length) return;
          var j = i < 0 ? 0 : (i >= buys.length ? buys.length - 1 : i);
          buys[r.focusAt] && buys[r.focusAt].el.setAttribute('tabindex', '-1');
          r.focusAt = j;
          buys[j].el.setAttribute('tabindex', '0');
          buys[j].el.focus();
        }
        r.focusAt_ = focusAt;

        r.track.addEventListener('keydown', function (e) {
          if (e.altKey || e.ctrlKey || e.metaKey) return;
          var k = e.key;
          if (k === 'ArrowRight') { e.preventDefault(); focusAt(r.focusAt + 1); }
          else if (k === 'ArrowLeft') { e.preventDefault(); focusAt(r.focusAt - 1); }
          else if (k === 'Home') { e.preventDefault(); focusAt(0); }
          else if (k === 'End') { e.preventDefault(); focusAt(buys.length - 1); }
          else if (k === 'ArrowDown' || k === 'ArrowUp') {
            var next = rows[ri + (k === 'ArrowDown' ? 1 : -1)];
            if (!next || !next.buys || !next.buys.length) return;
            e.preventDefault();
            var want = Math.min(r.focusAt, next.buys.length - 1);
            next.focusAt_(want);
          }
        });

        r.track.addEventListener('focusin', function (e) {
          for (var i = 0; i < buys.length; i++) {
            if (buys[i].el === e.target) {
              buys[r.focusAt] && buys[r.focusAt].el.setAttribute('tabindex', '-1');
              r.focusAt = i;
              buys[i].el.setAttribute('tabindex', '0');
              return;
            }
          }
        });
      });
    }());

    /* ---- ruler magnets, drawn from the timeline's own snap points ---- */
    (function drawMarks() {
      var pts = T.snapPoints;
      rulerMarks.textContent = '';
      for (var i = 0; i < pts.length; i++) {
        var s = pts[i];
        rulerMarks.appendChild(h('span', {
          'class': 'mt-it-rmark mt-it-rmark--' + s.kind + (s.side ? ' is-' + s.side : ''),
          style: 'left:' + (s.index / LAST * 100) + '%',
          dataset: { snapId: s.id },
          title: s.label || s.short
        }));
      }
    })();

    /* ============================================================
       4. The detail strip
       ============================================================ */

    function setDetailIcon(entry) {
      dIcon.textContent = '';
      if (entry && entry.icon) {
        dIcon.appendChild(h('img', { 'class': 'mt-it-img', src: entry.icon, alt: '' }));
      } else if (entry) {
        dIcon.appendChild(h('span', { 'class': 'mt-it-chip' }, (entry.display || entry.item).replace(/[^A-Za-z]/g, '').slice(0, 2).toUpperCase()));
      }
    }

    function displayOf(p, itemKey) {
      if (!itemKey) return null;
      var tl = p.items.timeline;
      for (var i = 0; i < tl.length; i++) { if (tl[i].item === itemKey) return tl[i].display; }
      return itemKey.replace(/_/g, ' ');
    }

    /* The purchase log says what was bought and what a later purchase
       swallowed. It does not say what was sold, so nothing here claims a
       slot: at the final reading items.final is the real inventory and the
       wording says so, before that the wording stays with the buy. */
    function statusWord(p, entry, i) {
      var cut = SEC[i];
      if (entry.seconds > cut) return 'bought later, at ' + entry.clock;
      if (entry.consumedAt !== null && entry.consumedAt <= cut) {
        var into = displayOf(p, entry.consumedBy);
        return into ? 'folded into the ' + into : 'folded into a later item';
      }
      if (entry.usedOnPickup) return 'used on pickup, no slot';
      if (entry.consumable) return 'consumable';
      if (i >= LAST) {
        if (finalSets[p.key][entry.item]) return 'in the final six';
        if (p.items.neutral === entry.item) return 'the final neutral';
        return 'gone by the end, sold or replaced';
      }
      return 'bought by ' + M.clockAt[i] + ', not folded into a later item';
    }

    var detailPinned = null;

    function showDetail(p, entry) {
      detailPinned = { p: p, entry: entry };
      paintDetail(T.index);
    }
    function resetDetail() {
      detailPinned = null;
      paintDetail(T.index);
    }
    function paintDetail(i) {
      var d = detailPinned || (story ? { p: story.player, entry: story.entry } : null);
      if (!d) { detail.hidden = true; return; }
      detail.hidden = false;
      setDetailIcon(d.entry);
      dName.textContent = d.entry.display;
      dMeta.textContent = d.p.handle + ' (' + d.p.heroDisplay + ') at ' + d.entry.clock + ', ' +
        fmt.num(d.entry.cost) + ' gold, ' + statusWord(d.p, d.entry, i);
      dNote.textContent = d.entry.storyNote || '';
      detail.classList.toggle('is-story', !!d.entry.storyItem);
    }

    /* ============================================================
       5. Layout: one pass per width change, never per frame
       ============================================================ */

    var geom = { trackW: 0, iconW: opts.iconW, compW: opts.compW };

    function place(list, trackW, w) {
      if (!list.length) return;
      var gap = Math.max(3, Math.round(w * opts.packing));
      var xs = new Array(list.length);
      var i;
      for (i = 0; i < list.length; i++) {
        var want = list[i].f * trackW - w / 2;
        if (i > 0 && want < xs[i - 1] + gap) want = xs[i - 1] + gap;
        xs[i] = want;
      }
      var maxLeft = trackW - w;
      if (xs[list.length - 1] > maxLeft) {
        xs[list.length - 1] = maxLeft;
        for (i = list.length - 2; i >= 0; i--) { if (xs[i] > xs[i + 1] - gap) xs[i] = xs[i + 1] - gap; }
      }
      if (xs[0] < 0) {
        xs[0] = 0;
        for (i = 1; i < list.length; i++) { if (xs[i] < xs[i - 1] + gap) xs[i] = xs[i - 1] + gap; }
      }
      for (i = 0; i < list.length; i++) { list[i].el.style.left = Math.round(xs[i] * 10) / 10 + 'px'; }
    }

    function layout() {
      if (!rows.length) return;
      var trackW = rows[0].track.clientWidth;
      if (!trackW) return;
      var narrow = trackW < opts.narrowAt;
      var iw = narrow ? opts.iconWNarrow : opts.iconW;
      var ih = narrow ? opts.iconHNarrow : opts.iconH;
      var cw = narrow ? opts.compWNarrow : opts.compW;
      var ch = narrow ? opts.compHNarrow : opts.compH;
      frame.style.setProperty('--mt-it-iw', iw + 'px');
      frame.style.setProperty('--mt-it-ih', ih + 'px');
      frame.style.setProperty('--mt-it-cw', cw + 'px');
      frame.style.setProperty('--mt-it-ch', ch + 'px');
      geom = { trackW: trackW, iconW: iw, compW: cw };
      for (var r = 0; r < rows.length; r++) {
        place(rows[r].main, trackW, iw);
        place(rows[r].comp, trackW, cw);
        if (opts.showConsumables) place(rows[r].cons, trackW, opts.consW);
      }
    }

    /* ============================================================
       6. The subscriber
       ============================================================ */

    var lastPaint = -1;
    var lastCaptured = null;

    function apply(st) {
      cursor.style.setProperty('--x', String(clamp01(st.position / st.last)));
      frame.classList.toggle('is-pinned', st.pinned !== null);

      var capId = st.captured ? st.captured.id : null;
      if (capId !== lastCaptured) {
        var prev = lastCaptured && rulerMarks.querySelector('[data-snap-id="' + lastCaptured + '"]');
        if (prev) prev.classList.remove('is-captured');
        var next = capId && rulerMarks.querySelector('[data-snap-id="' + capId + '"]');
        if (next) next.classList.add('is-captured');
        lastCaptured = capId;
      }

      var i = st.index;
      if (i === lastPaint) return;
      lastPaint = i;

      var cut = SEC[i];
      for (var r = 0; r < rows.length; r++) {
        var row = rows[r];
        for (var a = 0; a < row.icons.length; a++) {
          var rec = row.icons[a];
          var s = rec.entry.seconds > cut ? 'future'
            : ((rec.entry.consumedAt !== null && rec.entry.consumedAt <= cut) ? 'spent' : 'owned');
          if (s !== rec.status) {
            rec.el.classList.remove('is-future', 'is-spent', 'is-owned');
            rec.el.classList.add('is-' + s);
            rec.status = s;
          }
        }
        for (var c = 0; c < row.cons.length; c++) {
          var cr = row.cons[c];
          var cs = cr.entry.seconds > cut ? 'future' : 'owned';
          if (cs !== cr.status) {
            cr.el.classList.remove('is-future', 'is-owned');
            cr.el.classList.add('is-' + cs);
            cr.status = cs;
          }
        }
        row.countItems.textContent = String(row.heldAt[i]);
        row.countCons.textContent = String(row.consAt[i]);
        row.endCell.setAttribute('title', row.player.handle + ': ' + row.heldAt[i] +
          ' purchases by ' + M.clockAt[i] + ' that no later item has swallowed, plus ' +
          row.consAt[i] + ' consumables.');
      }

      var isFinal = i >= LAST;
      clockChip.textContent = isFinal ? 'Final build ' + M.clockAt[i] : 'Held at ' + M.clockAt[i];
      clockChip.classList.toggle('is-final', isFinal);
      ruler.setAttribute('aria-valuenow', String(i));
      ruler.setAttribute('aria-valuetext', (isFinal ? 'Final build at ' : 'Items held at ') + M.clockAt[i]);
      paintDetail(i);
    }

    /* ============================================================
       7. Wiring
       ============================================================ */

    T.attachScrubSurface(ruler, { hover: true, tap: true, keyboard: true });
    T.onHighlight(function (key) {
      for (var r = 0; r < rows.length; r++) {
        rows[r].row.classList.toggle('is-hl', !!key && rows[r].player.key === key);
      }
    });
    T.subscribe(apply);

    layout();
    paintDetail(T.index);

    if (!reducedMotion()) frame.classList.add('is-entering');

    /* M-08: the lanes are laid out in pixels against the measured track, so a
       missed relayout leaves icons drawn past the column. The debounce cancels
       and reschedules rather than early returning, so a frame that never fires
       cannot strand the guard, and both the observer and the window event are
       wired, so one missing does not lose the pass. */
    var raf = 0, lastW = rows.length ? rows[0].track.clientWidth : 0;
    function onResize() {
      if (raf) global.cancelAnimationFrame(raf);
      raf = global.requestAnimationFrame(function () {
        raf = 0;
        var w = rows.length ? rows[0].track.clientWidth : 0;
        if (Math.abs(w - lastW) < 2) return;
        lastW = w;
        layout();
      });
    }
    if (global.ResizeObserver) {
      new global.ResizeObserver(onResize).observe(frame);
    }
    global.addEventListener('resize', onResize);
    /* one deferred pass: fonts and lazy portraits can change the track width */
    global.setTimeout(layout, 120);
  });

}(window));
