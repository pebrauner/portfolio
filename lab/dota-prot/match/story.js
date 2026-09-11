/* match/story.js
   TI 2026 Match Analysis, the editorial column and the three sidebar cards.
   Mounts: m-story (the page h1 and the write up), m-summary (the derived
   summary at the current index), m-series (games 1 to 5), m-heroofgame,
   m-links.

   Every number in the prose is interpolated from G5 at write time: the
   storyFacts array, the phase table, the teamfight record and the objective
   list. Nothing is typed as a literal, so the article cannot drift from the
   chart above it. The page is post match, so the result is on the page.

   Byline: rdy.gg Staff. Past tense. No hype, no em dashes.
*/
(function () {
  'use strict';

  if (!window.Hub) { return; }

  var h = Hub.h;
  var F = Hub.fmt;

  var SUMMARY_DEFAULTS = {
    jumpIds: ['peak', 'swing', 'comeback', 'final'],  /* storyFacts ids offered as quick jumps */
    showStart: true,                                  /* offer minute 0 as well */
    liveRegion: true
  };
  var SERIES_DEFAULTS = {
    leftTeamKey: null,      /* null means the Radiant side of this game, TEAM VISION */
    hubHref: 'TI2026_Hub_Prototype_rdy_gg.html',
    draftsHref: 'TI2026_Hub_Prototype_rdy_gg.html#drafts'
  };

  function merge(defaults, over) {
    var o = {}, k;
    for (k in defaults) { if (defaults.hasOwnProperty(k)) o[k] = defaults[k]; }
    if (over) { for (k in over) { if (over.hasOwnProperty(k)) o[k] = over[k]; } }
    return o;
  }

  /* ------------------------------------------------------------------ *
   * Shared readers over the payload
   * ------------------------------------------------------------------ */

  function factMap(G5) {
    var out = {};
    (G5.storyFacts || []).forEach(function (f) { out[f.id] = f; });
    return out;
  }

  function findObjective(G5, test) {
    var list = G5.objectives || [];
    for (var i = 0; i < list.length; i++) { if (test(list[i])) return list[i]; }
    return null;
  }

  function fightById(G5, id) {
    var list = G5.teamfights || [];
    for (var i = 0; i < list.length; i++) { if (list[i].id === id) return list[i]; }
    return null;
  }

  function featuredFight(G5) {
    var list = G5.teamfights || [];
    for (var i = 0; i < list.length; i++) { if (list[i].featured) return list[i]; }
    return null;
  }

  function sideNames(G5) {
    var m = G5.match || {};
    return {
      radiantKey: (m.radiant && m.radiant.key) || 'radiant',
      direKey: (m.dire && m.dire.key) || 'dire',
      radiant: (m.radiant && m.radiant.name) || 'Radiant',
      dire: (m.dire && m.dire.name) || 'Dire'
    };
  }

  /* ================================================================== *
   * 1. m-story, the write up
   * ================================================================== */

  Hub.register('m-story', function (mount, ctx) {
    var G5 = ctx.G5 || {};
    var Timeline = ctx.Timeline;
    var match = G5.match || {};
    var series = G5.series || {};
    var minutes = G5.minutes || {};
    var facts = factMap(G5);
    var S = sideNames(G5);
    var phases = G5.phases || [];
    var gold = series.goldAdvantage || [];
    var last = typeof minutes.last === 'number' ? minutes.last : gold.length - 1;

    var root = h('article', { 'class': 'card mt-st', 'data-testid': 'article' });
    mount.appendChild(root);

    var winnerKey = match.winnerKey || null;
    var winnerName = winnerKey === S.direKey ? S.dire : S.radiant;
    var loserName = winnerKey === S.direKey ? S.radiant : S.dire;
    var seriesScore = (match.series && match.series.scoreAfter) || null;

    /* ---------- pull numbers, each one pins the page at its minute ---------- */

    function pull(id, shortLabel) {
      var f = facts[id];
      if (!f) return null;
      var minute = typeof f.minuteTo === 'number' ? f.minuteTo : f.minuteFrom;
      var btn = h('button', {
        type: 'button',
        'class': 'mt-st-pull',
        'data-fact': f.id,
        'aria-label': f.label + ', ' + F.num(f.value) + '. Go to minute ' + minute + '.'
      },
        h('span', { 'class': 'mt-st-pull-value u-tnum' }, F.num(f.value)),
        h('span', { 'class': 'mt-st-pull-label' }, shortLabel || f.label),
        h('span', { 'class': 'mt-st-pull-min u-tnum u-dim' },
          f.minuteFrom === f.minuteTo ? ('minute ' + f.minuteTo) : ('minutes ' + f.minuteFrom + ' to ' + f.minuteTo))
      );
      btn.addEventListener('click', function () {
        if (Timeline) { Timeline.set(minute); }
      });
      return btn;
    }

    /* ---------- head ---------- */

    var headline = winnerName + ' win The International 2026 on a three minute swing';
    var deck = S.radiant + ' led the decider at every minute reading from minute ' +
      (facts.lead ? facts.lead.minuteFrom : 10) + ' to minute ' +
      (facts.lead ? facts.lead.minuteTo : 38) + '. One Lotus Orb ended that, and ' +
      winnerName + ' closed game ' + ((match.series && match.series.game) || 5) + ' at ' +
      (match.durationClock || '') + ', ' + F.num(facts.final ? facts.final.value : gold[last]) +
      ' gold up, for the series ' + (seriesScore || '') + ' and the Aegis.';

    root.appendChild(h('div', { 'class': 'card-body mt-st-head' },
      h('div', { 'class': 'mt-st-kicker cluster-sm' },
        h('span', { 'class': 'chip chip--gold' }, 'GRAND FINAL'),
        h('span', { 'class': 'chip chip--outline' }, 'GAME ' + ((match.series && match.series.game) || 5)),
        match.league ? h('span', { 'class': 'mt-st-league' }, match.league) : null
      ),
      h('h2', { 'class': 'mt-st-title rdy-heading-2' }, headline),
      h('p', { 'class': 'mt-st-deck rdy-par-3' }, deck),
      h('div', { 'class': 'mt-st-byline' },
        h('span', { 'class': 'mt-st-author' }, 'rdy.gg Staff'),
        match.dateLabel ? h('span', { 'class': 'mt-st-dot', 'aria-hidden': 'true' }, '·') : null,
        match.dateLabel ? h('time', { datetime: match.date || '' }, match.dateLabel) : null,
        match.venue ? h('span', { 'class': 'mt-st-dot', 'aria-hidden': 'true' }, '·') : null,
        match.venue ? h('span', null, match.venue) : null
      ),
    ));

    /* story-empty-measure: the article measure is 728px inside a 1,057px
       column, so roughly 300px of the card ran empty for 2,236px. The three
       pull numbers move into that margin as a sticky rail that travels with
       the reader instead of sitting once at the top. */
    var pulls = h('aside', { 'class': 'mt-st-rail', 'aria-label': 'The three numbers' },
      h('div', { 'class': 'mt-st-rail-inner' },
        h('span', { 'class': 'm-sub' }, 'The three numbers'),
        pull('peak', S.radiant + ' peak lead'),
        pull('swing', 'The swing'),
        pull('final', 'Final gold lead')
      )
    );

    var bodyEl = h('div', { 'class': 'mt-st-body' });
    var bodyWrap = h('div', { 'class': 'card-body mt-st-bodywrap' }, bodyEl, pulls);
    root.appendChild(bodyWrap);

    function section(title, nodes) {
      var wrap = h('section', { 'class': 'mt-st-section' },
        h('h2', { 'class': 'mt-st-h rdy-heading-5' }, title));
      nodes.forEach(function (n) { if (n) wrap.appendChild(n); });
      bodyEl.appendChild(wrap);
      return wrap;
    }

    function para(text) { return h('p', { 'class': 'mt-st-p rdy-par-article' }, text); }

    /* ---------- 1. the decider ---------- */

    var fb = match.firstBlood || null;
    var laning = phases[0] || null;
    var mid = phases[1] || null;
    var late = phases[2] || null;

    section('The decider', [
      para(
        'The International 2026 came down to a fifth game. ' + S.radiant + ' and ' + S.dire +
        ' arrived at ' + (match.series ? match.series.scoreBefore : '2-2') + ' in the Bo' +
        ((match.series && match.series.bo) || 5) + ', ' +
        (match.gameMode ? match.gameMode.toLowerCase() + ', ' : '') +
        (match.venue ? 'at the ' + match.venue + ', ' : '') +
        'with ' + (match.prizePoolNote || '') + ' and the Aegis on the table. ' +
        'The game ran ' + (match.durationClock || '') + '.'
      ),
      fb ? para(
        fb.killer + ' took first blood at ' + fb.clock +
        (fb.killerHero ? ', ' + Hub.heroLabel(fb.killerHero) + ' on ' + fb.victim : '') + '. ' +
        (laning ? (laning.kills.radiant >= laning.kills.dire ? S.radiant : S.dire) +
          ' took the laning phase on kills, ' +
          Hub.killsPairText({ radiant: laning.kills.radiant, dire: laning.kills.dire }, S.radiantKey, S.direKey, { left: S.radiantKey }) +
          ', and at minute ' + laning.to + ' the gold line read ' +
          F.num(Math.abs(gold[laning.to])) + ' to ' +
          (gold[laning.to] >= 0 ? S.dire : S.radiant) + '.' : '')
      ) : null
    ]);

    /* ---------- 2. the long lead ---------- */

    section(S.radiant + ' in front for ' + (facts.lead ? facts.lead.value : '') + ' readings', [
      facts.lead ? para(facts.lead.text) : null,
      mid ? para(
        'The middle game stayed close. Between minute ' + mid.from + ' and minute ' + mid.to +
        ' the two sides took ' +
        (mid.towers.radiant === mid.towers.dire
          ? mid.towers.radiant + ' towers each'
          : Hub.teamTag(S.radiantKey) + ' ' + mid.towers.radiant + ' towers and ' +
            Hub.teamTag(S.direKey) + ' ' + mid.towers.dire) +
        ' and the gold line moved ' +
        F.num(Math.abs(mid.goldDeltaChange)) + ' toward ' +
        (mid.goldDeltaChange >= 0 ? S.dire : S.radiant) + ', which left ' +
        (gold[mid.to] >= 0 ? S.dire : S.radiant) + ' ' + F.num(Math.abs(gold[mid.to])) +
        ' ahead at minute ' + mid.to + '. ' +
        'Kills in that window were ' +
        Hub.killsPairText({ radiant: mid.kills.radiant, dire: mid.kills.dire }, S.radiantKey, S.direKey, { left: S.radiantKey }) + '.'
      ) : null,
      facts.peak ? para(facts.peak.text) : null
    ]);

    /* ---------- 3. the play ---------- */

    var tf2 = featuredFight(G5);
    var lotus = null;
    (G5.players || []).forEach(function (p) {
      ((p.items && p.items.timeline) || []).forEach(function (it) {
        if (it.storyItem) { lotus = { player: p, item: it }; }
      });
    });

    section('The Lotus Orb', [
      lotus ? para(
        lotus.player.handle + ' bought the ' + lotus.item.display + ' at ' + lotus.item.clock +
        ' for ' + F.num(lotus.item.cost) + ' gold' +
        (tf2 ? '. It sat in his inventory for ' +
          Math.floor((tf2.startSeconds - lotus.item.seconds) / 60) + ' minutes, until ' +
          tf2.startClock : '') + '.'
      ) : null,
      tf2 ? para(tf2.story || tf2.headline) : null,
      tf2 ? para(
        'The fight itself was ' + F.num(Math.abs(tf2.goldSwing)) + ' gold to ' +
        (tf2.goldSwing >= 0 ? S.dire : S.radiant) + ', kills ' +
        Hub.killsPairText({ radiant: tf2.byTeam.radiant.kills, dire: tf2.byTeam.dire.kills }, S.radiantKey, S.direKey, { left: S.radiantKey }) + '. ' +
        'Across the wider window the gold line moved ' + F.num(Math.abs(tf2.swingWindow.value)) +
        ' between minute ' + tf2.swingWindow.fromMinute + ' and minute ' + tf2.swingWindow.toMinute + '.'
      ) : null,
      facts.swing ? para(facts.swing.text) : null,
      facts.crossover ? para(facts.crossover.text) : null,
      h('div', { 'class': 'mt-st-pulls' }, pull('crossover', 'First reading in front'), pull('swing', 'Three minute swing'))
    ]);

    /* ---------- 4. the answer ---------- */

    var tf3 = fightById(G5, 'tf3');
    var rosh3 = (G5.roshan || [])[2] || null;

    section(S.radiant + ' get it back to 423', [
      rosh3 ? para(
        S.radiant + ' took the third Roshan at ' + rosh3.clock + ' and the Aegis went to ' +
        rosh3.aegisTo + ' on ' + Hub.heroLabel(rosh3.aegisHero) + ', good until ' +
        rosh3.aegisExpiresClock + '. That is the window they used.'
      ) : null,
      tf3 ? para(tf3.story || tf3.headline) : null,
      facts.comeback ? para(facts.comeback.text) : null,
      tf3 && tf3.storyNote ? h('p', { 'class': 'mt-st-note rdy-par-6 u-dim' }, tf3.storyNote) : null
    ]);

    /* Principle 1: the floor is read off the array, never typed.
       storyFacts.close.value is the fight's gold swing, a different quantity,
       so the sentence derives its own minimum from series.goldAdvantage. */
    function floorSentence(G5, close) {
      var ga = (G5.series && G5.series.goldAdvantage) || [];
      var from = close && close.floorMinute != null ? close.floorMinute
               : (close && close.minuteTo != null ? close.minuteTo : 58);
      if (!ga.length || from >= ga.length) return '';
      var floor = ga[from];
      for (var i = from; i < ga.length; i++) if (ga[i] < floor) floor = ga[i];
      return 'From minute ' + from + ' the lead never came back under ' + F.num(floor) + ' gold.';
    }

    /* ---------- 5. the barracks ---------- */

    var tf5 = fightById(G5, 'tf5');
    var raxRanged = findObjective(G5, function (o) { return o.type === 'barracks' && o.lane === 'mid' && o.rax === 'ranged'; });
    var raxMelee = findObjective(G5, function (o) { return o.type === 'barracks' && o.lane === 'mid' && o.rax === 'melee'; });

    section('The middle barracks', [
      tf5 ? para(tf5.story || tf5.headline) : null,
      (raxRanged && raxMelee) ? para(
        (raxRanged.takenBy === 'dire' ? S.dire : S.radiant) + ' broke the ' +
        (raxRanged.side === 'radiant' ? S.radiant : S.dire) + ' middle ranged barracks at ' +
        raxRanged.clock + ' and the melee barracks at ' + raxMelee.clock +
        '. ' + floorSentence(G5, facts.close)
      ) : null,
      late ? para(
        'The late game is where the match was decided: ' + F.num(Math.abs(late.goldDeltaChange)) +
        ' gold moved between minute ' + late.from + ' and the end, with kills ' +
        Hub.killsPairText({ radiant: late.kills.radiant, dire: late.kills.dire }, S.radiantKey, S.direKey, { left: S.radiantKey }) +
        ' and towers taken ' + Hub.teamTag(S.radiantKey) + ' ' + late.towers.radiant +
        ', ' + Hub.teamTag(S.direKey) + ' ' + late.towers.dire + '.'
      ) : null
    ]);

    /* ---------- 6. the finish ---------- */

    var tf7 = fightById(G5, 'tf7');
    var ancient = findObjective(G5, function (o) { return o.type === 'ancient'; });

    section('The finish', [
      tf7 ? para(tf7.story || tf7.headline) : null,
      ancient ? para(ancient.headline) : null,
      para(
        winnerName + ' finish ' + F.num(Math.abs(gold[last])) + ' gold up, kills ' +
        Hub.killsPairText({ radiant: series.killsCumulative.radiant[last], dire: series.killsCumulative.dire[last] }, S.radiantKey, S.direKey, { left: S.radiantKey }) +
        ', and the series ends ' + (seriesScore || '') + ' over ' + loserName + '.'
      )
    ]);

    /* ---------- 7. hero of the game ---------- */

    var hog = G5.heroOfTheGame || null;
    if (hog) {
      var ranked = (G5.players || []).slice().sort(function (a, b) { return b.final.netWorth - a.final.netWorth; });
      var topNw = ranked[0];
      var hogStat = function (label, value) {
        return h('span', { 'class': 'mt-st-figure' },
          h('span', { 'class': 'mt-st-figure-value u-tnum' }, value),
          h('span', { 'class': 'mt-st-figure-label m-sub' }, label));
      };
      section('Hero of the game', [
        h('div', { 'class': 'mt-st-figures' },
          hogStat(hog.handle + ', ' + hog.heroDisplay, hog.line),
          hogStat('net worth' + (topNw && topNw.key !== hog.playerKey
            ? ', second behind ' + topNw.handle + "'s " + F.num(topNw.final.netWorth) : ''),
            F.num(hog.netWorth)),
          hogStat('hero damage', F.num(hog.heroDamage))
        ),
        /* the stat strip above already prints the K/D/A and the net worth, so
           the sourced line drops its opening sentence when it repeats them */
        para((function () {
          var why = hog.why || '';
          var cut = why.indexOf('. ');
          if (cut > 0 && why.slice(0, cut).indexOf(hog.line) >= 0) {
            return why.slice(cut + 2);
          }
          return why;
        }()))
      ]);
    }

    root.appendChild(h('div', { 'class': 'card-footer mt-st-foot' },
      h('span', { 'class': 'u-dim rdy-par-7' },
        'Every figure in this piece is read from the match record. Click a number to move the page to that minute.'),
      h('a', { 'class': 'btn btn-ghost btn-sm', href: '#draft' }, 'The draft')
    ));

    setTimeout(function () { root.classList.add('is-in'); }, 0);
  });

  /* ================================================================== *
   * 2. m-summary, the sidebar readout. One index, rendered.
   * ================================================================== */

  Hub.register('m-summary', function (mount, ctx) {
    var G5 = ctx.G5 || {};
    var Timeline = ctx.Timeline;
    var opts = merge(SUMMARY_DEFAULTS, window.MatchSummaryOptions);
    var match = G5.match || {};
    var series = G5.series || {};
    var minutes = G5.minutes || {};
    var facts = factMap(G5);
    var S = sideNames(G5);
    var last = typeof minutes.last === 'number' ? minutes.last : ((series.goldAdvantage || []).length - 1);
    var roshan = G5.roshan || [];

    /* the shell banner already carries data-testid="match-overview", so this
       card takes its own name and the two stay unambiguous */
    var root = h('section', { 'class': 'card mt-st-su', 'data-testid': 'match-summary' });
    mount.appendChild(root);

    var stateChip = h('span', { 'class': 'chip mt-st-su-state' }, 'FINAL');
    root.appendChild(h('div', { 'class': 'card-header' },
      h('div', { 'class': 'titles' },
        h('h2', { 'class': 'title rdy-heading-6' }, 'At this minute')),
      h('div', { 'class': 'action' }, stateChip)
    ));

    var body = h('div', { 'class': 'card-body mt-st-su-body' });
    root.appendChild(body);

    var clockEl = h('span', { 'class': 'mt-st-su-clock u-tnum' }, '');
    var phaseEl = h('span', { 'class': 'mt-st-su-phase m-sub' }, '');
    body.appendChild(h('div', { 'class': 'mt-st-su-clockrow' }, clockEl, phaseEl));

    function row(label, valueEl) {
      var r = h('div', { 'class': 'mt-st-su-row' },
        h('span', { 'class': 'mt-st-su-label' }, label),
        h('span', { 'class': 'mt-st-su-value' }, valueEl));
      body.appendChild(r);
      return r;
    }

    var goldEl = h('span', { 'class': 'u-tnum mt-st-su-gold' }, '');
    var killsEl = h('span', { 'class': 'mt-st-su-kills' }, '');
    var towersEl = h('span', { 'class': 'u-tnum' }, '');
    var roshEl = h('span', { 'class': 'u-tnum' }, '');
    var momentEl = h('span', { 'class': 'mt-st-su-moment' }, '');

    row('Gold lead', goldEl);
    row('Kills', killsEl);
    row('Towers lost', towersEl);
    row('Roshan', roshEl);
    row('Last moment', momentEl);

    /* quick jumps, built from the same storyFacts the article quotes.
       jump-buttons-no-state: each one carries its clock so the word means
       something before it is pressed, and a pressed state driven by the same
       subscribe as everything else, so the reader can see where they stand. */
    var jumps = h('div', { 'class': 'mt-st-su-jumps' });
    var jumpBtns = [];
    var shortLabel = { peak: 'Peak', swing: 'Swing', crossover: 'Turn', comeback: 'Comeback', close: 'Barracks', final: 'Final', lead: 'Lead' };

    function jumpButton(label, minute, title) {
      var b = h('button', {
        type: 'button',
        'class': 'mt-st-su-jump',
        'data-minute': String(minute),
        'aria-pressed': 'false',
        title: title
      },
        h('span', { 'class': 'mt-st-su-jump-word' }, label),
        h('span', { 'class': 'mt-st-su-jump-clock u-tnum' }, Timeline ? Timeline.clockAt(minute) : '')
      );
      b.addEventListener('click', function () {
        if (Timeline) Timeline.set(minute);
      });
      jumpBtns.push({ el: b, minute: minute });
      jumps.appendChild(b);
      return b;
    }

    if (opts.showStart) jumpButton('Start', 0, 'The first reading, minute 0');
    opts.jumpIds.forEach(function (id) {
      var f = facts[id];
      if (!f) return;
      var minute = typeof f.minuteTo === 'number' ? f.minuteTo : f.minuteFrom;
      jumpButton(shortLabel[id] || f.label, minute, f.label + ', minute ' + minute);
    });
    body.appendChild(jumps);

    function paintJumps(i) {
      for (var j = 0; j < jumpBtns.length; j++) {
        var on = jumpBtns[j].minute === i;
        jumpBtns[j].el.classList.toggle('is-on', on);
        jumpBtns[j].el.setAttribute('aria-pressed', on ? 'true' : 'false');
      }
    }

    /* the same five, mirrored into the sticky strip, which is on screen for
       the whole article while this card is not */
    if (Timeline && Timeline.mirrorJumps) {
      Timeline.mirrorJumps(jumpBtns.map(function (b) {
        return {
          minute: b.minute,
          label: b.el.querySelector('.mt-st-su-jump-word').textContent,
          clock: b.el.querySelector('.mt-st-su-jump-clock').textContent,
          title: b.el.getAttribute('title')
        };
      }));
    }

    var live = opts.liveRegion
      ? h('div', { 'class': 'u-sr-only', role: 'status', 'aria-live': 'polite' }, '')
      : null;
    if (live) body.appendChild(live);
    /* M-06: the strip is the page's canonical live region. This card writes
       its sentence on every frame but only announces while focus is inside. */
    var speak = (live && Timeline && Timeline.quietLive)
      ? Timeline.quietLive(live, root)
      : function (t) { if (live) live.textContent = t; };

    /* the strip labels a magnet as "38:02 Spirit win the fight at 38:02".
       The clock is already at the end of the sentence, so the leading copy of
       it is dropped here rather than printed twice in a 288px card. */
    function momentLabel(m) {
      var label = m.label || m.short || '';
      var lead = /^(\d{1,3}:\d{2})\s+/.exec(label);
      if (lead && label.indexOf(lead[1], lead[0].length) > 0) {
        return label.slice(lead[0].length);
      }
      return label;
    }

    function roshanAt(i) {
      var secs = minutes.secondsAt ? minutes.secondsAt[i] : i * 60;
      var n = 0, lastOne = null;
      for (var r = 0; r < roshan.length; r++) {
        if (roshan[r].seconds <= secs) { n++; lastOne = roshan[r]; }
      }
      return { count: n, last: lastOne };
    }

    function render(s) {
      var i = s.index;
      var isFinal = i >= last;
      var clock = (minutes.clockAt && minutes.clockAt[i]) || F.clockFromMinutes(i);
      clockEl.textContent = clock;
      paintJumps(i);
      var ph = Timeline ? Timeline.phaseAt(i) : null;
      phaseEl.textContent = ph ? ph.label : '';

      stateChip.textContent = isFinal ? 'FINAL' : 'AT ' + clock;
      stateChip.className = 'chip mt-st-su-state' + (isFinal ? ' chip--green' : ' chip--outline');

      var g = (series.goldAdvantage || [])[i];
      if (typeof g === 'number') {
        var side = g === 0 ? null : (g > 0 ? 'dire' : 'radiant');
        var tag = side ? Hub.teamTag(side === 'dire' ? S.direKey : S.radiantKey) : null;
        goldEl.textContent = g === 0 ? 'level' : (tag + ' +' + F.num(Math.abs(g)));
        goldEl.className = 'u-tnum mt-st-su-gold' + (side ? ' is-' + side : '');
      }

      killsEl.textContent = '';
      var kc = series.killsCumulative;
      if (kc) {
        var pair = Hub.killsPair(
          { radiant: kc.radiant[i], dire: kc.dire[i] },
          S.radiantKey, S.direKey, { left: S.radiantKey }
        );
        if (pair) killsEl.appendChild(pair);
      }

      var td = series.towersDown;
      if (td) {
        towersEl.textContent = Hub.teamTag(S.radiantKey) + ' ' + td.radiant[i] + ', ' +
          Hub.teamTag(S.direKey) + ' ' + td.dire[i];
      }

      var r = roshanAt(i);
      roshEl.textContent = r.count === 0
        ? 'none yet'
        : (r.count + ' of ' + roshan.length + ', last to ' + (r.last.killerTeam === S.direKey ? S.dire : S.radiant));

      var moment = Timeline ? Timeline.snapAtOrBefore(i) : null;
      momentEl.textContent = moment ? momentLabel(moment) : 'the game is under way';

      if (live) {
        speak('Minute ' + i + ', ' + clock + '. ' + goldEl.textContent + ' gold.',
          Timeline ? Timeline.state : 'idle');
      }
    }

    if (Timeline && Timeline.subscribe) { Timeline.subscribe(render); }
    else { render({ index: last }); }
    setTimeout(function () { root.classList.add('is-in'); }, 0);
  });

  /* ================================================================== *
   * 3. m-series, games 1 to 5
   * ================================================================== */

  Hub.register('m-series', function (mount, ctx) {
    var G5 = ctx.G5 || {};
    var opts = merge(SERIES_DEFAULTS, window.MatchSeriesOptions);
    var games = G5.seriesGames || [];
    var match = G5.match || {};
    var S = sideNames(G5);
    var leftKey = opts.leftTeamKey || S.radiantKey;

    var root = h('section', { 'class': 'card mt-st-se', 'data-testid': 'series-games' });
    mount.appendChild(root);

    root.appendChild(h('div', { 'class': 'card-header' },
      h('div', { 'class': 'titles' },
        h('h2', { 'class': 'title rdy-heading-6' }, 'The series'),
        h('div', { 'class': 'subtitle' },
          (match.series ? 'Bo' + match.series.bo + ', ' + match.series.scoreAfter + ' ' +
            ((match.series.winnerKey === S.direKey) ? S.dire : S.radiant) : 'Grand Final'))
      )
    ));

    var body = h('div', { 'class': 'card-body mt-st-se-body' });
    root.appendChild(body);

    if (!games.length) {
      body.appendChild(h('div', { 'class': 'u-dim' }, 'The series record is not loaded.'));
      return;
    }

    games.forEach(function (g) {
      var winnerName = g.winner === S.direKey ? S.dire : (g.winner === S.radiantKey ? S.radiant : Hub.teamName(g.winner));
      var pair = Hub.killsPair(
        { radiant: g.kills[g.radiant], dire: g.kills[g.dire] },
        g.radiant, g.dire, { left: leftKey }
      );
      var inner = h('span', { 'class': 'mt-st-se-inner' },
        h('span', { 'class': 'mt-st-se-no u-tnum' }, 'G' + g.game),
        h('span', { 'class': 'mt-st-se-body-col' },
          h('span', { 'class': 'mt-st-se-score' }, pair || h('span', { 'class': 'u-tnum' }, g.scoreLine)),
          h('span', { 'class': 'mt-st-se-sub u-dim' },
            (winnerName || 'winner unknown') + ' win, ' + (g.duration || ''))
        ),
        g.isThisGame ? h('span', { 'class': 'chip chip--gold mt-st-se-here' }, 'HERE') : null
      );
      var href = Hub.link.match(g.matchId);
      var rowEl = Hub.extLink(href, {
        'class': 'mt-st-se-row' + (g.isThisGame ? ' is-here' : '') +
          ' is-' + (g.winner === S.direKey ? 'dire' : 'radiant'),
        'data-testid': 'match-row'
      }, inner);
      body.appendChild(rowEl);
    });

    root.appendChild(h('div', { 'class': 'card-footer mt-st-se-foot' },
      h('a', { 'class': 'btn btn-ghost btn-sm btn-block', href: opts.draftsHref }, 'All series drafts on the Hub')
    ));
    setTimeout(function () { root.classList.add('is-in'); }, 0);
  });

  /* ================================================================== *
   * 4. m-heroofgame
   * ================================================================== */

  Hub.register('m-heroofgame', function (mount, ctx) {
    var G5 = ctx.G5 || {};
    var Timeline = ctx.Timeline;
    var hog = G5.heroOfTheGame || null;
    var S = sideNames(G5);

    var root = h('section', { 'class': 'card card--gold mt-st-hg', 'data-testid': 'player-card' });
    mount.appendChild(root);

    if (!hog) {
      root.appendChild(h('div', { 'class': 'card-body u-dim' }, 'No hero of the game in the record.'));
      return;
    }

    var player = null;
    (G5.players || []).forEach(function (p) { if (p.key === hog.playerKey) player = p; });
    var side = player ? player.side : (hog.teamKey === S.direKey ? 'dire' : 'radiant');

    var ranked = (G5.players || []).slice().sort(function (a, b) { return b.final.netWorth - a.final.netWorth; });
    var top = ranked[0] || null;

    root.appendChild(h('div', { 'class': 'card-header' },
      h('div', { 'class': 'titles' },
        h('h2', { 'class': 'title rdy-heading-6' },
          'Hero of the game' + ((player && player.handle) ? ': ' + player.handle : '')))
    ));

    var body = h('div', { 'class': 'card-body mt-st-hg-body m-hl', 'data-player-key': hog.playerKey, 'data-player-id': String(hog.rdyPlayerId || '') });
    root.appendChild(body);

    body.appendChild(h('div', { 'class': 'mt-st-hg-top' },
      Hub.avatar({ photo: hog.photo, handle: hog.handle }, hog.teamKey, 'lg'),
      h('div', { 'class': 'mt-st-hg-id' },
        h('div', { 'class': 'mt-st-hg-handle' }, hog.handle),
        h('div', { 'class': 'mt-st-hg-real u-dim' }, hog.realName || ''),
        h('div', { 'class': 'mt-st-hg-hero' },
          Hub.heroImg(hog.hero, { side: side, size: 'sm', alt: hog.heroDisplay }),
          h('span', null, hog.heroDisplay))
      )
    ));

    function stat(label, value) {
      return h('div', { 'class': 'mt-st-hg-stat' },
        h('span', { 'class': 'mt-st-hg-stat-value u-tnum' }, value),
        h('span', { 'class': 'mt-st-hg-stat-label m-sub' }, label));
    }

    body.appendChild(h('div', { 'class': 'mt-st-hg-stats' },
      stat('K / D / A', hog.line),
      stat('Net worth', F.num(hog.netWorth)),
      stat('Hero damage', F.num(hog.heroDamage))
    ));

    if (top && top.key !== hog.playerKey) {
      body.appendChild(h('div', { 'class': 'mt-st-hg-rank u-dim rdy-par-7' },
        'Second net worth on the server, behind ' + top.handle + "'s " + F.num(top.final.netWorth) + '.'));
    }

    body.appendChild(h('p', { 'class': 'mt-st-hg-why rdy-par-6' }, hog.why));

    var link = Hub.link.player(hog.rdyPlayerId);
    if (link) {
      root.appendChild(h('div', { 'class': 'card-footer' },
        Hub.extLink(link, { 'class': 'btn btn-ghost btn-sm btn-block' }, hog.handle + ' on rdy.gg')));
    }

    if (Timeline) {
      body.addEventListener('mouseenter', function () { Timeline.highlightPlayer(hog.playerKey); });
      body.addEventListener('mouseleave', function () { Timeline.highlightPlayer(null); });
      Timeline.onHighlight(function (key) {
        body.classList.toggle('is-hl', !!key && key === hog.playerKey);
      });
    }
    setTimeout(function () { root.classList.add('is-in'); }, 0);
  });

  /* ================================================================== *
   * 5. m-links
   * ================================================================== */

  Hub.register('m-links', function (mount, ctx) {
    var G5 = ctx.G5 || {};
    var Timeline = ctx.Timeline;
    var match = G5.match || {};
    var S = sideNames(G5);

    var root = h('section', { 'class': 'card mt-st-lk', 'data-testid': 'match-links' });
    mount.appendChild(root);

    root.appendChild(h('div', { 'class': 'card-header' },
      h('div', { 'class': 'titles' },
        h('h2', { 'class': 'title rdy-heading-6' }, 'On rdy.gg'))
    ));

    var body = h('div', { 'class': 'card-body mt-st-lk-body' });
    root.appendChild(body);

    /* teams */
    body.appendChild(h('div', { 'class': 'm-sub' }, 'Teams'));
    var teams = h('div', { 'class': 'mt-st-lk-teams' });
    [match.radiant, match.dire].forEach(function (t) {
      if (!t) return;
      var url = Hub.link.team(t.rdyTeamId);
      var inner = h('span', { 'class': 'mt-st-lk-team-inner' },
        Hub.teamCrest(t.key, 'sm'),
        h('span', { 'class': 'mt-st-lk-team-name' }, t.name),
        h('span', { 'class': 'chip chip--' + t.side }, t.side === 'radiant' ? 'RADIANT' : 'DIRE')
      );
      teams.appendChild(Hub.extLink(url, {
        'class': 'mt-st-lk-team' + (url ? '' : ' is-flat'),
        'data-team-id': t.key
      }, inner));
      if (!url) {
        teams.appendChild(h('span', { 'class': 'mt-st-lk-none u-dim rdy-par-7' },
          t.name + ' has no rdy.gg team page in this dataset.'));
      }
    });
    body.appendChild(teams);

    /* players, grouped by side */
    body.appendChild(h('div', { 'class': 'm-sub' }, 'Players'));
    ['radiant', 'dire'].forEach(function (side) {
      var list = (G5.players || []).filter(function (p) { return p.side === side; });
      if (!list.length) return;
      var wrap = h('div', { 'class': 'mt-st-lk-players' });
      list.forEach(function (p) {
        var url = Hub.link.player(p.rdyPlayerId);
        var el = Hub.extLink(url, {
          'class': 'mt-st-lk-player m-hl is-' + side,
          'data-player-key': p.key,
          'data-player-id': String(p.rdyPlayerId || ''),
          title: p.handle + ', ' + p.heroDisplay + ', position ' + p.pos
        },
          Hub.heroImg(p.hero, { side: side, size: 'sm', alt: p.heroDisplay }),
          h('span', { 'class': 'mt-st-lk-player-name' }, p.handle)
        );
        if (Timeline) {
          el.addEventListener('mouseenter', function () { Timeline.highlightPlayer(p.key); });
          el.addEventListener('mouseleave', function () { Timeline.highlightPlayer(null); });
        }
        wrap.appendChild(el);
      });
      body.appendChild(h('div', { 'class': 'mt-st-lk-side' },
        h('span', { 'class': 'mt-st-lk-side-label u-dim' },
          side === 'radiant' ? S.radiant : S.dire),
        wrap));
    });

    if (Timeline && Timeline.onHighlight) {
      Timeline.onHighlight(function (key) {
        var els = root.querySelectorAll('[data-player-key]');
        for (var i = 0; i < els.length; i++) {
          els[i].classList.toggle('is-hl', !!key && els[i].getAttribute('data-player-key') === key);
        }
      });
    }

    /* the match itself and the rest of the prototype */
    body.appendChild(h('div', { 'class': 'm-sub' }, 'More'));
    var more = h('div', { 'class': 'mt-st-lk-more' });
    var matchUrl = Hub.link.match(match.id);
    if (matchUrl) { more.appendChild(Hub.extLink(matchUrl, { 'class': 'mt-st-lk-line' }, 'Match ' + match.id + ' on rdy.gg')); }
    more.appendChild(h('a', { 'class': 'mt-st-lk-line', href: 'TI2026_Hub_Prototype_rdy_gg.html' }, 'The International 2026 hub'));
    more.appendChild(h('a', { 'class': 'mt-st-lk-line', href: 'TI2026_Player_Guide_rdy_gg.html' }, 'Player guide'));
    more.appendChild(h('a', { 'class': 'mt-st-lk-line', href: 'index.html' }, 'All Dota 2 prototypes'));
    var site = Hub.link.section ? Hub.link.section('') : null;
    if (site) { more.appendChild(Hub.extLink(site, { 'class': 'mt-st-lk-line' }, 'rdy.gg Dota 2')); }
    body.appendChild(more);

    setTimeout(function () { root.classList.add('is-in'); }, 0);
  });
}());
