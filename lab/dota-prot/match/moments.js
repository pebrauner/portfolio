/* match/moments.js
   TI 2026 Match Analysis, the fights and objectives list.
   Mount: m-moments.

   G5.teamfights and G5.objectives merged into one list, sorted by the second
   they happened, grouped by the same three phases the economy chart bands use.

   Principle 1 in one line: every bar on this list is the SAME array,
   G5.series.goldAdvantage, read at that moment's index, on one shared scale.
   A fight's own gold number is printed as text beside it and is never drawn on
   that bar, because they measure different things (the shape doc calls this
   out: goldSwing, swingWindow and the dossier's three minute swing are three
   different numbers).

   Clicking a moment pins the master timeline at its index, so the strip, the
   economy chart, the scoreboard, the item tracks and the sidebar summary all
   move to the same reading. As the index moves, the moment nearest to it is
   marked, so scrubbing anywhere on the page walks this list.

   NO NARRATIVE RULE, 2026-09-11. No row carries prose. A fight headline is one
   template over the winner side (the sign of the fight's own gold delta), the
   two death counts and the swing; an objective headline is the same kind of
   template over the record. The one card lifted above the ladder is the
   BIGGEST SWING, argmax of abs(swingWindow.value) among the fights, and that
   rule is printed under the card, not implied by a gold chip.
*/
(function () {
  'use strict';

  if (!window.Hub) { return; }

  var h = Hub.h;
  var F = Hub.fmt;

  /* The 'majors' filter is a rule, so the rule is printed where the reader
     meets the label: as the button's title and aria-label, and as a line in
     the legend. Contract 12.3 rule H. */
  var MINOR_TOWER_TIER = 2;
  var MAJOR_RULE = 'Fights and majors: every teamfight, plus every objective '
    + 'that is not a tower of tier ' + MINOR_TOWER_TIER + ' or below.';

  var DEFAULTS = {
    /* moments-wall: 28 of the 35 rows were objectives and most of those were
       near identical tier 1 and tier 2 tower lines, so the list opened as an
       undifferentiated 3,000px ladder. It now opens on the 'majors' filter,
       whose rule is MAJOR_RULE below; the tower runs are one click away. */
    filter: 'majors',     /* 'majors', 'all', 'fights', 'objectives' */
    maxDeadPortraits: 6,  /* portraits shown before the text line carries the rest */
    featuredId: null,     /* null means: whichever fight the record flags as featured */
    groupByPhase: true
  };

  /* type -> the label a reader sees, and the snap kind the strip already uses */
  var TYPE_LABEL = {
    tower: 'Tower',
    barracks: 'Barracks',
    ancient: 'Ancient',
    roshan: 'Roshan',
    aegis: 'Aegis',
    tormentor: 'Tormentor',
    courier: 'Courier',
    firstblood: 'First blood',
    fight: 'Teamfight'
  };
  var TYPE_KIND = {
    tower: 'tower',
    barracks: 'rax',
    ancient: 'ancient',
    roshan: 'roshan',
    aegis: 'roshan',
    tormentor: 'tormentor',
    courier: 'courier',
    firstblood: 'firstblood'
  };

  /* one full stop at the end of a sentence, never two */
  function endStop(text) {
    var t = String(text == null ? '' : text).replace(/\s+$/, '');
    return /[.!?]$/.test(t) ? t : t + '.';
  }

  function resolveOptions(over) {
    var o = {}, k;
    for (k in DEFAULTS) { if (DEFAULTS.hasOwnProperty(k)) o[k] = DEFAULTS[k]; }
    if (over) { for (k in over) { if (over.hasOwnProperty(k)) o[k] = over[k]; } }
    return o;
  }

  Hub.register('m-moments', function (mount, ctx) {
    var G5 = ctx.G5 || {};
    var Timeline = ctx.Timeline;
    var match = G5.match || {};
    var series = G5.series || {};
    var gold = series.goldAdvantage || [];
    var last = (G5.minutes && typeof G5.minutes.last === 'number') ? G5.minutes.last : (gold.length - 1);
    var opts = resolveOptions(window.MatchMomentsOptions);

    var radiantKey = (match.radiant && match.radiant.key) || 'radiant';
    var direKey = (match.dire && match.dire.key) || 'dire';
    var teamName = {
      radiant: (match.radiant && match.radiant.name) || 'Radiant',
      dire: (match.dire && match.dire.name) || 'Dire'
    };
    var tag = {
      radiant: Hub.teamTag(radiantKey) || 'RAD',
      dire: Hub.teamTag(direKey) || 'DIR'
    };

    var root = h('section', { 'class': 'card mt-mo', 'data-testid': 'key-moments' });
    mount.appendChild(root);

    var fights = (G5.teamfights || []).slice();
    var objectives = (G5.objectives || []).slice();

    if (!fights.length && !objectives.length) {
      root.appendChild(h('div', { 'class': 'card-body u-dim' }, 'No moments in the record.'));
      return;
    }

    var clockAt = (G5.minutes && G5.minutes.clockAt) || [];
    function clockAtIndex(i) {
      return clockAt[i] || F.clockFromMinutes(i);
    }

    function idxOf(seconds) {
      var i = Math.round(seconds / 60);
      if (i < 0) i = 0;
      if (i > last) i = last;
      return i;
    }

    /* the one scale every bar on this list shares */
    var maxAbs = 1;
    for (var g = 0; g < gold.length; g++) {
      if (Math.abs(gold[g]) > maxAbs) maxAbs = Math.abs(gold[g]);
    }

    /* ---------- build one list of moments ---------- */

    var items = [];

    fights.forEach(function (tf) {
      items.push({
        id: tf.id,
        kind: 'fight',
        featured: !!tf.featured,
        type: 'fight',
        seconds: tf.startSeconds,
        clock: tf.startClock,
        index: idxOf(tf.startSeconds),
        side: tf.winnerSide || null,
        headline: tf.headline,
        tf: tf,
        obj: null
      });
    });

    objectives.forEach(function (o) {
      items.push({
        id: 'obj-' + o.seconds,
        kind: TYPE_KIND[o.type] || 'moment',
        featured: false,
        type: o.type,
        seconds: o.seconds,
        clock: o.clock,
        index: idxOf(o.seconds),
        /* moments-tower-side-inverted: colour by the side that GAINED it, the
           same rule the strip uses, so half the ladder is no longer coloured
           by the side it was done to. The owner is kept as a secondary mark. */
        side: (Timeline && Timeline.gainSide ? Timeline.gainSide(o) : (o.takenBy || o.side || null)),
        ownerSide: (o.takenBy ? (o.side || null) : null),
        headline: o.headline,
        tf: null,
        obj: o
      });
    });

    items.sort(function (a, b) {
      if (a.seconds !== b.seconds) return a.seconds - b.seconds;
      /* a fight that starts on the same second as an objective reads first */
      return (a.kind === 'fight' ? -1 : 1) - (b.kind === 'fight' ? -1 : 1);
    });

    if (opts.featuredId) {
      items.forEach(function (it) { it.featured = (it.id === opts.featuredId); });
    }

    var nFights = items.filter(function (i) { return i.kind === 'fight'; }).length;
    var nObjectives = items.length - nFights;

    /* ---------- header, with a filter that really filters ---------- */

    var segButtons = {};
    function segBtn(value, label, rule) {
      var attrs = {
        type: 'button',
        'class': 'm-seg-btn',
        'aria-pressed': value === opts.filter ? 'true' : 'false',
        'data-filter': value
      };
      if (rule) { attrs.title = rule; attrs['aria-label'] = rule; }
      var b = h('button', attrs, label);
      b.addEventListener('click', function () { setFilter(value); });
      segButtons[value] = b;
      return b;
    }

    /* COMP-1, 2026-09-12: the filter drives the grouped ladder and nothing
       else, so it is built here and mounted inside the ladder's own panel.
       In the compact default it is not on screen at all, because the short
       list it sat above never obeyed it. */
    var segEl = h('div', { 'class': 'm-seg', role: 'group', 'aria-label': 'Filter moments' },
      segBtn('majors', 'Fights and majors', MAJOR_RULE),
      segBtn('all', 'All'),
      segBtn('fights', 'Fights'),
      segBtn('objectives', 'Objectives'));

    root.appendChild(h('div', { 'class': 'card-header' },
      h('div', { 'class': 'titles' },
        h('h2', { 'class': 'title rdy-heading-5' }, 'Fights and objectives'),
        h('div', { 'class': 'subtitle' },
          nFights + ' teamfights and ' + nObjectives + ' objectives, in the order they happened.')
      )
    ));

    var body = h('div', { 'class': 'card-body stack' });
    root.appendChild(body);

    /* the legend says what the shared bar is, so no bar is read as a swing.
       COMPACT, 2026-09-12: it belongs to the full ladder, so it travels with
       it into the panel instead of sitting above a list that has no bars. */
    var legendEl = h('div', { 'class': 'm-legend mt-mo-legend' },
      h('span', { 'class': 'm-legend-item' },
        h('span', { 'class': 'm-swatch m-swatch--radiant' }), teamName.radiant + ' ahead'),
      h('span', { 'class': 'm-legend-item' },
        h('span', { 'class': 'm-swatch m-swatch--dire' }), teamName.dire + ' ahead'),
      h('span', { 'class': 'm-legend-item u-dim' },
        'Every row carries the same gold line with a dot at its own minute, on one scale up to ' + F.num(maxAbs) + ' gold. ' +
        'A fight is won by the side with the positive gold delta inside the fight window, which is the only thing "win" means here.'),
      h('span', { 'class': 'm-legend-item u-dim' }, MAJOR_RULE)
    );

    /* ---------- the items ---------- */

    var phases = (G5.phases || []).slice();
    var groups = [];
    if (opts.groupByPhase && phases.length) {
      phases.forEach(function (p) {
        groups.push({
          key: p.key,
          label: p.label,
          from: p.from, to: p.to,
          fromClock: p.fromClock, toClock: p.toClock,
          items: []
        });
      });
      items.forEach(function (it) {
        var target = groups[groups.length - 1];
        for (var i = 0; i < groups.length; i++) {
          if (it.index >= groups[i].from && (it.index < groups[i].to || i === groups.length - 1)) { target = groups[i]; break; }
        }
        target.items.push(it);
      });
    } else {
      groups.push({ key: 'all', label: 'All moments', items: items.slice() });
    }

    var rows = [];   /* {item, el, countsAs} */
    var playCards = [];

    /* moments-wall: the row that moves the gold line furthest sat 2,400px down
       a flat ladder. It is lifted out as a full width card at the top of the
       section. It is chosen, never typed: teamfights[].featured is the argmax
       of abs(swingWindow.value) and the build sets it. The ladder below still
       carries the same row in chronological order. */
    function featuredItems() {
      var out = [];
      items.forEach(function (it) { if (it.featured) out.push(it); });
      out.sort(function (a, b) { return a.seconds - b.seconds; });
      return out;
    }

    /* the rule, in words, printed under the card that the rule produced */
    function swingRule() {
      var feat = null;
      items.forEach(function (it) { if (it.featured && it.tf) feat = it; });
      if (!feat) return '';
      var w = feat.tf.swingWindow || {};
      if (typeof w.value !== 'number') return '';
      return 'Biggest swing: the fight with the largest absolute change in the gold line ' +
        'across its own window, minute ' + w.fromMinute + ' to minute ' + w.toMinute + ', ' +
        F.num(Math.abs(w.value)) + ' to ' + teamName[w.value > 0 ? 'dire' : 'radiant'] + '.';
    }

    /* moments-bar-useless: a scaled length in a 132px track put 28 of the 35
       rows between 1px and 12px, so every mid game row looked the same and the
       first blood row was 0px wide. A row now carries the SHAPE of the gold
       line with a dot at its own minute, so it reads as position in the game,
       not as a length. Same array, same scale, 60 by 18. */
    var SPARK_W = 60, SPARK_H = 18, SPARK_PAD = 2;
    var sparkPath = null;

    function buildSparkPath() {
      if (sparkPath) return sparkPath;
      var d = [];
      for (var i = 0; i < gold.length; i++) {
        var x = SPARK_PAD + (i / Math.max(1, gold.length - 1)) * (SPARK_W - SPARK_PAD * 2);
        var y = sparkY(gold[i]);
        d.push((i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1));
      }
      sparkPath = d.join(' ');
      return sparkPath;
    }

    function sparkY(v) {
      var mid = SPARK_H / 2;
      var amp = (SPARK_H - SPARK_PAD * 2) / 2;
      return mid - (Math.max(-maxAbs, Math.min(maxAbs, v || 0)) / maxAbs) * amp;
    }

    function goldBar(index) {
      var v = typeof gold[index] === 'number' ? gold[index] : 0;
      var side = v === 0 ? null : (v > 0 ? 'dire' : 'radiant');
      var x = SPARK_PAD + (index / Math.max(1, gold.length - 1)) * (SPARK_W - SPARK_PAD * 2);
      var ns = 'http://www.w3.org/2000/svg';
      function el(name, attrs) {
        var n = document.createElementNS(ns, name);
        for (var k in attrs) if (attrs.hasOwnProperty(k)) n.setAttribute(k, attrs[k]);
        return n;
      }
      var svg = el('svg', {
        'class': 'mt-mo-spark',
        viewBox: '0 0 ' + SPARK_W + ' ' + SPARK_H,
        width: SPARK_W, height: SPARK_H,
        'aria-hidden': 'true', focusable: 'false'
      });
      svg.appendChild(el('line', {
        'class': 'mt-mo-spark-zero',
        x1: 0, y1: SPARK_H / 2, x2: SPARK_W, y2: SPARK_H / 2
      }));
      svg.appendChild(el('path', { 'class': 'mt-mo-spark-line', d: buildSparkPath() }));
      var dot = el('circle', { 'class': 'mt-mo-spark-dot', cx: x.toFixed(1), cy: sparkY(v).toFixed(1), r: 2.6 });
      if (side) dot.setAttribute('data-side', side);
      svg.appendChild(dot);
      return svg;
    }

    function goldText(index) {
      var v = typeof gold[index] === 'number' ? gold[index] : null;
      if (v === null) return null;
      var side = v === 0 ? null : (v > 0 ? 'dire' : 'radiant');
      return h('span', {
        'class': 'mt-mo-goldval u-tnum' + (side ? ' is-' + side : '')
      }, v === 0 ? 'level' : (tag[side] + ' +' + F.num(Math.abs(v))));
    }

    function deadStrip(tf) {
      var dead = tf.deadHeroes || [];
      if (!dead.length) return null;
      var shown = dead.slice(0, opts.maxDeadPortraits);
      var pics = h('span', { 'class': 'mt-mo-dead-pics' });
      shown.forEach(function (d) {
        pics.appendChild(h('span', { 'class': 'mt-mo-dead' },
          Hub.heroImg(d.hero, { side: d.side, size: 'sm', alt: d.heroDisplay }),
          h('span', { 'class': 'mt-mo-dead-x', 'aria-hidden': 'true' })
        ));
      });
      var textParts = dead.map(function (d) {
        return d.heroDisplay + ' ' + d.clock;
      });
      return h('span', { 'class': 'mt-mo-dead-row' },
        h('span', { 'class': 'm-sub' }, 'Down'),
        pics,
        h('span', { 'class': 'mt-mo-dead-text u-dim u-tnum' }, textParts.join(', '))
      );
    }

    function fightMeta(tf) {
      var bits = [];
      var by = tf.byTeam || {};
      if (by.radiant && by.dire) {
        var pair = Hub.killsPair(
          { radiant: by.radiant.kills, dire: by.dire.kills },
          radiantKey, direKey, { left: radiantKey }
        );
        bits.push(h('span', { 'class': 'mt-mo-meta-item' },
          h('span', { 'class': 'm-sub' }, 'Kills in the fight'), pair));
      }
      if (typeof tf.goldSwing === 'number') {
        var who = tf.goldSwing === 0 ? null : (tf.goldSwing > 0 ? 'dire' : 'radiant');
        bits.push(h('span', { 'class': 'mt-mo-meta-item' },
          h('span', { 'class': 'm-sub' }, 'Gold in the fight'),
          h('span', { 'class': 'mt-mo-meta-value u-tnum' + (who ? ' is-' + who : '') },
            F.num(Math.abs(tf.goldSwing)) + (who ? ' to ' + teamName[who] : ''))));
      }
      var w = tf.swingWindow;
      if (w && typeof w.value === 'number') {
        var wWho = w.value === 0 ? null : (w.value > 0 ? 'dire' : 'radiant');
        bits.push(h('span', { 'class': 'mt-mo-meta-item' },
          h('span', { 'class': 'm-sub' }, 'Gold line, minute ' + w.fromMinute + ' to ' + w.toMinute),
          h('span', { 'class': 'mt-mo-meta-value u-tnum' + (wWho ? ' is-' + wWho : '') },
            F.num(Math.abs(w.value)) + (wWho ? ' to ' + teamName[wWho] : ''))));
      }
      return h('span', { 'class': 'mt-mo-meta' }, bits);
    }

    /* an objective is one short line, so the list stays readable at 28 of them.
       Everything a hover would say is in that line as plain text. */
    function objectiveMeta(o) {
      var bits = [];
      if (o.playerHandle) {
        bits.push((o.type === 'firstblood' ? 'killed by ' : 'taken by ') + o.playerHandle +
          (o.heroDisplay ? ', ' + o.heroDisplay : ''));
      }
      if (o.type === 'tower' && o.tier) {
        bits.push('tier ' + o.tier + (o.lane ? ', ' + o.lane + ' lane' : ''));
      }
      if (o.type === 'barracks' && o.rax) {
        bits.push(o.rax + ' barracks' + (o.lane ? ', ' + o.lane + ' lane' : ''));
      }
      if (o.type === 'roshan' && o.number) { bits.push('Roshan ' + o.number + ' of the game'); }
      return bits.length
        ? h('span', { 'class': 'mt-mo-line u-dim' }, bits.join('. '))
        : null;
    }

    function buildItem(it) {
      var sideCls = it.side ? ' is-' + it.side : '';
      var el = h('button', {
        type: 'button',
        'class': 'mt-mo-item mt-mo-item--' + it.kind + sideCls + (it.featured ? ' is-featured' : ''),
        'data-index': String(it.index),
        'data-moment-id': it.id,
        'data-testid': 'match-row',
        'aria-label': it.clock + '. ' + endStop(it.headline) + ' Go to this minute.'
      },
        h('span', { 'class': 'mt-mo-rail', 'aria-hidden': 'true' }),
        h('span', { 'class': 'mt-mo-time u-tnum' }, it.clock),
        h('span', { 'class': 'mt-mo-main' },
          /* a fight gets its own kind row above the headline, an objective
             keeps kind and headline on one line so 28 of them stay scannable */
          it.tf
            ? h('span', { 'class': 'mt-mo-kindrow' },
                h('span', { 'class': 'mt-mo-kind' }, TYPE_LABEL[it.type] || 'Moment'),
                it.featured ? h('span', { 'class': 'chip chip--gold' }, 'BIGGEST SWING') : null)
            : null,
          it.tf
            ? h('span', { 'class': 'mt-mo-headline' }, it.headline)
            : h('span', { 'class': 'mt-mo-titleline' },
                h('span', { 'class': 'mt-mo-kind' }, TYPE_LABEL[it.type] || 'Moment'),
                it.obj && it.obj.heroPortrait
                  ? Hub.heroImg(it.obj.hero, { side: it.obj.type === 'firstblood' ? it.obj.side : null, size: 'sm', alt: it.obj.heroDisplay })
                  : null,
                h('span', { 'class': 'mt-mo-headline' }, it.headline)),
          it.tf ? fightMeta(it.tf) : objectiveMeta(it.obj),
          it.tf ? deadStrip(it.tf) : null
        ),
        h('span', {
          'class': 'mt-mo-goldcol',
          title: 'Gold line at ' + clockAtIndex(it.index) + ', positive means ' + teamName.dire
        },
          goldBar(it.index),
          goldText(it.index)
        )
      );

      el.addEventListener('click', function () {
        if (Timeline) Timeline.set(it.index);
      });
      return el;
    }

    /* the hero cards, above the ladder */
    (function buildFeatured() {
      var feat = featuredItems();
      if (!feat.length) return;
      var wrap = h('div', { 'class': 'mt-mo-plays', 'data-testid': 'match-overview' });
      var rule = swingRule();
      /* COMPACT: the rule that PRODUCED this card is one click away beside the
         label it explains, instead of two always on lines above it. */
      wrap.appendChild(h('h3', { 'class': 'mt-mo-plays-title rdy-subh-5' },
        h('span', null, 'Biggest swing'),
        (rule && Hub.infoTip)
          ? Hub.infoTip(rule, { id: 'mt-mo-swingrule', label: 'How the biggest swing is chosen' })
          : null));
      if (rule && !Hub.infoTip) { wrap.appendChild(h('p', { 'class': 'mt-mo-plays-rule u-dim rdy-par-7' }, rule)); }
      var grid = h('div', { 'class': 'mt-mo-plays-grid' });
      feat.forEach(function (it) {
        var card = h('button', {
          type: 'button',
          'class': 'mt-mo-play' + (it.side ? ' is-' + it.side : '') + (it.featured ? ' is-featured' : ''),
          'data-index': String(it.index),
          'data-moment-id': 'play-' + it.id,
          'data-testid': 'card-match',
          'aria-label': it.clock + '. ' + endStop(it.headline) + ' Go to this minute.'
        },
          h('span', { 'class': 'mt-mo-play-top' },
            h('span', { 'class': 'mt-mo-time u-tnum' }, it.clock),
            it.featured ? h('span', { 'class': 'chip chip--gold' }, 'BIGGEST SWING') : null,
            goldText(it.index)
          ),
          h('span', { 'class': 'mt-mo-play-headline' }, it.headline),
          it.tf ? deadStrip(it.tf) : null,
          it.tf ? fightMeta(it.tf) : null
        );
        card.addEventListener('click', function () {
          if (Timeline) Timeline.set(it.index);
        });
        playCards.push({ item: it, el: card });
        grid.appendChild(card);
      });
      wrap.appendChild(grid);
      body.appendChild(wrap);
    }());

    /* ============================================================
       COMPACT, 2026-09-12. The default list is the moments that decide a
       game: every teamfight, plus first blood, Roshan, the Aegis, every
       barracks and the ancient. One line each, no portraits and no
       sparkline: the clock, the headline the record already carries, and
       the signed gold line at that minute. The full grouped ladder below
       is unchanged and one click away.

       DENS-2, 2026-09-12. Fifteen of those rows was still fifteen sentences,
       the loudest card left in the compact view. The list drops to the one
       fight the record flags as the biggest swing plus the objectives that
       end a game: every Roshan, every barracks and the ancient. The other
       twenty-seven, first blood and the six remaining teamfights among them,
       are in the same panel as before, behind a label that counts them.
       Nothing is filtered by hand: featured is the record's own argmax and
       the three types are read off it.
       ============================================================ */
    var COMPACT_TYPES = { roshan: 1, barracks: 1, ancient: 1 };
    function isCompactRow(it) {
      return (it.kind === 'fight' && it.featured) || COMPACT_TYPES[it.type] === 1;
    }

    var compactItems = items.filter(isCompactRow);
    var compactRows = [];

    function buildCompactRow(it) {
      var sideCls = it.side ? ' is-' + it.side : '';
      var el = h('button', {
        type: 'button',
        'class': 'mt-mo-crow' + sideCls + (it.featured ? ' is-featured' : ''),
        'data-index': String(it.index),
        'data-moment-id': it.id,
        'data-testid': 'match-row',
        'aria-label': it.clock + '. ' + endStop(it.headline) + ' Go to this minute.'
      },
        h('span', { 'class': 'mt-mo-crow-time u-tnum' }, it.clock),
        h('span', { 'class': 'mt-mo-crow-kind' }, TYPE_LABEL[it.type] || 'Moment'),
        h('span', { 'class': 'mt-mo-crow-headline u-truncate' }, it.headline),
        h('span', { 'class': 'mt-mo-crow-gold' }, goldText(it.index))
      );
      el.addEventListener('click', function () {
        if (Timeline) Timeline.set(it.index);
      });
      compactRows.push({ item: it, el: el });
      return el;
    }

    var compactList = h('div', {
      'class': 'mt-mo-clist',
      'data-testid': 'moments-compact'
    }, compactItems.map(buildCompactRow));

    /* COMP-6, 2026-09-12: the rule that picks these rows out of the record was
       a source comment and a legend line inside a panel the reader has not
       opened. It is now stated where the list is, behind one 'i', with both
       counts read off the arrays. */
    var COMPACT_RULE = compactItems.length + ' of ' + items.length +
      ': the fight the record flags as the biggest gold swing, plus every Roshan, ' +
      'every barracks and the ancient. ' +
      'The full ladder and its filter are in the panel below.';
    body.appendChild(h('div', { 'class': 'mt-mo-chead' },
      h('span', { 'class': 'mt-mo-chead-label' }, 'Fights and majors'),
      h('span', { 'class': 'mt-mo-chead-count u-tnum u-dim' },
        compactItems.length + ' of ' + items.length),
      Hub.infoTip
        ? Hub.infoTip(COMPACT_RULE, { id: 'mt-mo-crule', label: 'Which moments this list holds' })
        : null));
    body.appendChild(compactList);

    /* the full ladder, in its own panel. Built eagerly so the clock keeps
       painting it, hidden while the panel is closed. The filter rides with
       it, because it is the only thing the filter moves. */
    var fullWrap = h('div', { 'class': 'mt-mo-full' },
      h('div', { 'class': 'mt-mo-fullhead' }, segEl), legendEl);

    var allExp = Hub.expander({
      id: 'mt-mo-all',
      count: items.length,
      className: 'mt-mo-exp',
      label: function (n) { return 'Show all ' + n + ' fights and objectives'; },
      hideLabel: 'Show fewer',
      content: fullWrap
    });
    if (Hub.onUnmount) Hub.onUnmount(allExp.destroy);
    body.appendChild(allExp.root);

    /* the compact list and the full ladder are two readings of one record, so
       only one of them is on screen at a time */
    function syncList() { root.classList.toggle('is-all-open', allExp.isOpen()); }
    allExp.button.addEventListener('click', syncList);
    var stopMoDensity = Hub.density.subscribe(syncList);
    if (Hub.onUnmount) Hub.onUnmount(function () { stopMoDensity(); });
    syncList();

    groups.forEach(function (grp) {
      if (!grp.items.length) return;
      var countEl = h('span', { 'class': 'mt-mo-group-count u-tnum u-dim' }, String(grp.items.length));
      var head = h('div', { 'class': 'mt-mo-group-head' },
        h('h3', { 'class': 'mt-mo-group-title rdy-subh-5' }, grp.label),
        grp.fromClock ? h('span', { 'class': 'mt-mo-group-range u-dim u-tnum' }, grp.fromClock + ' to ' + grp.toClock) : null,
        countEl
      );
      var list = h('div', { 'class': 'mt-mo-list' });
      grp.items.forEach(function (it) {
        var el = buildItem(it);
        rows.push({ item: it, el: el, group: grp });
        list.appendChild(el);
      });
      var section = h('div', { 'class': 'mt-mo-group', 'data-phase': grp.key }, head, list);
      grp.countEl = countEl;
      grp.sectionEl = section;
      fullWrap.appendChild(section);
    });

    root.appendChild(h('div', { 'class': 'card-footer mt-mo-foot' },
      h('span', { 'class': 'u-dim rdy-par-7' },
        'Click a moment to move the whole page to that minute. It stays there until you move it again.')
    ));

    /* ---------- register the magnets, deduped against the seeded ids ---------- */

    if (Timeline && Timeline.addSnapPoints) {
      Timeline.addSnapPoints(items.map(function (it) {
        return {
          index: it.index,
          seconds: it.seconds,
          id: it.id,
          kind: it.featured ? 'swing' : it.kind,
          side: it.side,
          /* the clock is printed by the strip itself (renderMarks prefixes it)
             and by the readout, so neither field repeats it here */
          label: it.headline,
          short: (TYPE_LABEL[it.type] || 'Moment')
        };
      }));
    }

    /* ---------- filter ---------- */

    var filter = opts.filter;

    /* MAJOR_RULE in code: a major is a fight, or an objective that is not a
       tower of tier MINOR_TOWER_TIER or below. */
    function isMajor(it) {
      if (it.kind === 'fight') return true;
      if (it.type !== 'tower') return true;
      return !(it.obj && it.obj.tier && it.obj.tier <= MINOR_TOWER_TIER);
    }

    function passes(it) {
      if (filter === 'majors') return isMajor(it);
      if (filter === 'fights') return it.kind === 'fight';
      if (filter === 'objectives') return it.kind !== 'fight';
      return true;
    }

    function setFilter(value) {
      filter = value;
      var k;
      for (k in segButtons) {
        if (!segButtons.hasOwnProperty(k)) continue;
        segButtons[k].setAttribute('aria-pressed', k === value ? 'true' : 'false');
      }
      groups.forEach(function (grp) {
        var visible = 0;
        rows.forEach(function (r) {
          if (r.group !== grp) return;
          var on = passes(r.item);
          r.el.hidden = !on;
          if (on) visible++;
        });
        if (grp.countEl) grp.countEl.textContent = String(visible);
        if (grp.sectionEl) grp.sectionEl.hidden = visible === 0;
      });
      mark(Timeline ? Timeline.index : last);
    }

    /* ---------- the index drives the list ---------- */

    var lastNear = null;

    function mark(index) {
      var best = null, bestD = Infinity;
      for (var i = 0; i < rows.length; i++) {
        var r = rows[i];
        if (r.el.hidden) continue;
        var d = Math.abs(r.item.index - index);
        if (d < bestD) { bestD = d; best = r; }
      }
      for (var j = 0; j < rows.length; j++) {
        var row = rows[j];
        var isNear = row === best;
        row.el.classList.toggle('is-near', isNear);
        row.el.classList.toggle('is-at', row.item.index === index);
        if (isNear) { row.el.setAttribute('aria-current', 'true'); }
        else { row.el.removeAttribute('aria-current'); }
      }
      for (var k = 0; k < playCards.length; k++) {
        var pc = playCards[k];
        pc.el.classList.toggle('is-at', pc.item.index === index);
        pc.el.classList.toggle('is-near', !!best && best.item === pc.item);
      }
      /* COMPACT: the short list follows the clock on its own scale, because
         it holds fewer rows than the ladder and the nearest row differs */
      var cBest = null, cBestD = Infinity;
      for (var c = 0; c < compactRows.length; c++) {
        var cd = Math.abs(compactRows[c].item.index - index);
        if (cd < cBestD) { cBestD = cd; cBest = compactRows[c]; }
      }
      for (var n = 0; n < compactRows.length; n++) {
        var cr = compactRows[n];
        var cNear = cr === cBest;
        cr.el.classList.toggle('is-near', cNear);
        cr.el.classList.toggle('is-at', cr.item.index === index);
        if (cNear) { cr.el.setAttribute('aria-current', 'true'); }
        else { cr.el.removeAttribute('aria-current'); }
      }
      lastNear = best;
    }

    if (Timeline && Timeline.subscribe) {
      Timeline.subscribe(function (s) {
        mark(s.index);
      });
    } else {
      mark(last);
    }

    setFilter(filter);
    setTimeout(function () { root.classList.add('is-in'); }, 0);
  });
}());
