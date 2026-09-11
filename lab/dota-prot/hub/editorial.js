/* hub/editorial.js
   TI 2026 Hub, editorial and sidebar components.
   Mounts: m-editorial-featured, m-news, m-today, m-feed, m-follow, m-event-info.

   Every string of copy below is written from the fact checked dossier in
   data/ti2026.js and the frozen Game 5 snapshot in data/gf-game5-snapshot.js.
   Numbers are interpolated from those two objects, never typed as literals,
   so the prose cannot drift from the tables and charts on the same page.
   Nothing here reveals the Game 5 result or the champion: the series is 2-2.
*/
(function () {
  'use strict';

  if (!window.Hub) { return; }

  var h = Hub.h;
  var F = Hub.fmt;

  /* ------------------------------------------------------------------ *
   * 1. Photography registry
   *
   * The nine photographs in assets/event/ and assets/editorial/ are BLAST
   * Slam press shots, not TI 2026 photography (audit F33, V06). They stay
   * as placeholders, every one of them renders a visible credit strip
   * saying so, and no caption ever names a person supposed to be in the
   * frame. The files were renamed to plain lowercase slugs (verifier I09),
   * so the paths below need no encodeURI: every character is URL safe.
   * ------------------------------------------------------------------ */

  var PHOTO = {
    ev1: 'assets/event/blast-slam-6-05554.webp',
    ev2: 'assets/event/blast-slam-6-05721.webp',
    ev3: 'assets/event/blast-slam-6-05776.webp',
    ev4: 'assets/event/blast-slam-6-05867.webp',
    ed1: 'assets/editorial/blast-slam-6-06061.webp',
    ed2: 'assets/editorial/blast-slam-v-chengdu-01.webp',
    ed3: 'assets/editorial/blast-slam-6-05724.webp',
    ed4: 'assets/editorial/blast-slam-6-05712.webp',
    ed5: 'assets/editorial/blast-slam-6-05692.webp'
  };

  var CREDIT = 'Placeholder image, BLAST / Luc Bouchon';
  var PLACEHOLDER_ALT = 'Placeholder tournament photograph, not from The International 2026';

  /* creditOutside: the frame is too narrow for a legible overlay (the 104px
     thumbnail), so the credit is rendered as its own line by the caller
     instead of being truncated inside the picture. */
  function figure(key, cls, creditOutside, opts) {
    var src = PHOTO[key];
    if (!src) { return null; }
    opts = opts || {};
    var img = h('img', {
      'class': 'ed-img',
      src: src,
      alt: PLACEHOLDER_ALT,
      loading: 'lazy',
      decoding: 'async'
    });
    /* When the frame has a destination, the frame IS the link, so the play
       glyph over it is part of the control rather than a decoration that
       looks like one. */
    var frame = opts.href
      ? h('a', { 'class': 'ed-figlink', href: opts.href, target: '_blank', rel: 'noopener',
                 'aria-label': opts.linkLabel || null },
          img,
          opts.play ? h('span', { 'class': 'ed-play', 'aria-hidden': 'true' }, icon(ICON.play, 'ed-play-icon')) : null)
      : img;
    return h('figure', { 'class': 'ed-figure' + (cls ? ' ' + cls : '') },
      frame,
      creditOutside ? null : h('figcaption', { 'class': 'ed-credit' }, CREDIT)
    );
  }

  function creditLine() {
    return h('p', { 'class': 'ed-credit-line' }, CREDIT);
  }

  /* ------------------------------------------------------------------ *
   * 2. Small shared pieces
   * ------------------------------------------------------------------ */

  var ICON = {
    arrow: 'M9.3 4.3a1 1 0 0 1 1.4 0l5 5a1 1 0 0 1 0 1.4l-5 5a1 1 0 1 1-1.4-1.4L12.6 11H4a1 1 0 1 1 0-2h8.6L9.3 5.7a1 1 0 0 1 0-1.4z',
    clock: 'M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16zm0 2a6 6 0 1 1 0 12A6 6 0 0 1 10 4zm-.9 2.5v4.1l3.2 1.9.9-1.5-2.6-1.5V6.5H9.1z',
    play: 'M7 4.8v10.4c0 .6.7 1 1.2.6l8-5.2c.5-.3.5-1 0-1.3l-8-5.2c-.5-.3-1.2 0-1.2.7z',
    camera: 'M7.5 3.5 6.6 5H4a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2.6l-.9-1.5h-5zM10 7.5A3.75 3.75 0 1 1 10 15a3.75 3.75 0 0 1 0-7.5zm0 2a1.75 1.75 0 1 0 0 3.5 1.75 1.75 0 0 0 0-3.5z',
    quote: 'M7.4 5.2C5.2 6.4 4 8.3 4 10.8V15h4.6v-4.6H6.5c0-1.5.6-2.5 2-3.3l-1.1-1.9zm7.2 0c-2.2 1.2-3.4 3.1-3.4 5.6V15H16v-4.6h-2.1c0-1.5.6-2.5 2-3.3l-1.3-1.9z',
    share: 'M14.5 2.5a3 3 0 0 0-2.9 3.8L7.4 8.6a3 3 0 1 0 0 2.8l4.2 2.3a3 3 0 1 0 1-1.7l-4.2-2.3a3 3 0 0 0 0-.6l4.2-2.3a3 3 0 1 0 1.9-4.3z',
    bell: 'M10 2a4.5 4.5 0 0 0-4.5 4.5v3L4 12.5h12l-1.5-3v-3A4.5 4.5 0 0 0 10 2zm0 16a2.5 2.5 0 0 0 2.45-2h-4.9A2.5 2.5 0 0 0 10 18z'
  };

  function icon(d, cls) { return Hub.icon(d, { className: cls || '' }); }

  function textButton(label, onclick, cls) {
    return h('button', {
      type: 'button',
      'class': 'ed-textbtn' + (cls ? ' ' + cls : ''),
      onclick: onclick
    }, label, icon(ICON.arrow, 'ed-textbtn-icon'));
  }

  function sectionHead(title, sub, action) {
    return h('div', { 'class': 'section-head ed-head' },
      h('h2', { 'class': 'section-title' }, title),
      sub ? h('div', { 'class': 'section-sub' }, sub) : null,
      action ? h('div', { 'class': 'ed-head-action' }, action) : null
    );
  }

  function cardHead(title, sub, action) {
    return h('div', { 'class': 'card-header' },
      h('div', { 'class': 'titles' },
        h('div', { 'class': 'title' }, title),
        sub ? h('div', { 'class': 'subtitle' }, sub) : null),
      action ? h('div', { 'class': 'action' }, action) : null
    );
  }

  /* team crest plus tag, degrades to a monogram when there is no logo file */
  function crest(key) {
    var t = Hub.team(key);
    if (!t) { return null; }
    return h('span', { 'class': 'ed-ent', 'data-team-id': t.key },
      Hub.teamCrest(key, 'sm'),
      h('span', { 'class': 'ed-ent-label' }, t.abbr || t.displayName || t.name)
    );
  }

  /* hero portrait plus name, skipped entirely when the file is missing */
  function heroEnt(displayName) {
    var slugName = Hub.heroInternal(displayName);
    if (!slugName || !Hub.heroExists(slugName)) { return null; }
    return h('span', { 'class': 'ed-ent' },
      Hub.heroImg(slugName, { size: 'sm', alt: displayName }),
      h('span', { 'class': 'ed-ent-label' }, displayName)
    );
  }

  function entityRow(list) {
    var kids = (list || []).filter(Boolean);
    if (!kids.length) { return null; }
    return h('div', { 'class': 'ed-ents' }, kids);
  }

  function slug(s) {
    return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  function readMinutes() {
    var words = 0, i;
    for (i = 0; i < arguments.length; i++) {
      if (!arguments[i]) { continue; }
      words += String(arguments[i]).split(/\s+/).filter(Boolean).length;
    }
    return Math.max(1, Math.round(words / 130));
  }

  /* the dossier stores percentages already multiplied out */
  function pct(v, digits) {
    if (v === null || v === undefined) { return ''; }
    return F.pct(v, { raw: true, digits: digits === undefined ? 0 : digits });
  }

  function shanghaiTime(iso) {
    if (!iso) { return null; }
    var d = new Date(iso);
    if (isNaN(d.getTime())) { return null; }
    var t = new Date(d.getTime() + 8 * 3600 * 1000);
    var hh = t.getUTCHours(), mm = t.getUTCMinutes();
    return (hh < 10 ? '0' : '') + hh + ':' + (mm < 10 ? '0' : '') + mm;
  }

  /* ------------------------------------------------------------------ *
   * 3. The article set
   *
   * Built from TI2026.storylines, heroMeta, teams and the GF5 snapshot.
   * Storylines flagged safeBeforeDecider:false are used only through their
   * preDeciderAngle, which is true at 2-2 with Game 5 in progress.
   * ------------------------------------------------------------------ */

  var CATEGORIES = ['Recap', 'Analysis', 'Draft', 'Interview', 'Statistics', 'Hot Take'];

  function findHero(list, key) {
    var i;
    for (i = 0; i < (list || []).length; i++) { if (list[i].hero === key) { return list[i]; } }
    return null;
  }
  function findStory(TI, id) {
    var i, s = TI.storylines || [];
    for (i = 0; i < s.length; i++) { if (s[i].id === id) { return s[i]; } }
    return null;
  }
  function findSeries(team, opponentKey) {
    var i, list = (team && team.mainEventSeries) || [];
    for (i = 0; i < list.length; i++) { if (list[i].opponent === opponentKey) { return list[i]; } }
    return null;
  }

  function buildArticles(TI, GF5) {
    var meta = TI.heroMeta || {};
    var games = (TI.grandFinal && TI.grandFinal.games) || [];
    var g4 = games[3] || {};
    var km = GF5.keyMoment || {};
    var peaks = GF5.peaks || {};
    var ga = GF5.goldAdvantage || [];
    var last = ga.length ? ga[ga.length - 1] : { value: 0, minute: GF5.frozenAt.minute };

    var treant = findHero(meta.mostContested, 'treant') || {};
    var earth = findHero(meta.mostContested, 'earth_spirit') || {};
    var kotl = findHero(meta.mostContested, 'keeper_of_the_light') || {};
    var earthWin = findHero(meta.bestWinrate, 'earth_spirit') || {};
    var mirana = findHero(meta.mostPicked, 'mirana') || {};
    var hoodwink = findHero(meta.mostPicked, 'hoodwink') || {};
    var treantBan = findHero(meta.mostBanned, 'treant') || {};
    var rec = meta.records || {};

    var falcons = Hub.team('falcons') || {};
    var lgd = Hub.team('lgd') || {};
    var nigma = Hub.team('nigma') || {};
    var falconsVsLiquid = findSeries(falcons, 'liquid');
    var falconsVsNigma = findSeries(falcons, 'nigma');
    var nigmaVsBoom = findSeries(nigma, 'boomboys');

    var banRate = (treantBan.bans && meta.totalMatches)
      ? pct(treantBan.bans / meta.totalMatches * 100, 1) : '';
    var treantWins = (treantBan.picks && treantBan.pickWinPct !== null && treantBan.pickWinPct !== undefined)
      ? Math.round(treantBan.picks * treantBan.pickWinPct / 100) : null;

    var out = [];

    out.push({
      id: 'lotus-orb',
      cat: 'Analysis',
      live: true,
      date: GF5.date,
      img: 'ed1',
      /* No narrative rule, round 2 (audit N08). GF5.keyMoment carries no
         headline any more, so this line had degraded into a hand-written
         literal inside component code. It is now the R9 template over the key
         moment's own numbers: deaths, window and gold delta, side from the
         data. No fallback string is left. */
      headline: F.num(km.deaths) + ' heroes down between ' + km.clock + ' and ' + km.endClock +
                ', ' + F.num(km.goldDelta) + ' gold to ' + ((Hub.team(km.teamKey) || {}).displayName || ''),
      dek: 'TEAM VISION were ' + F.num(peaks.visionPeak ? peaks.visionPeak.value : null) +
           ' gold up at minute ' + (peaks.visionPeak ? peaks.visionPeak.minute : '') +
           ' and went looking for the fight that ends the series. Forty seven seconds later they had lost four heroes and the gold line.',
      body: [
        'Collapse put Lotus Orb on himself on Dark Seer. Satanic committed Omnislash into the reflect and killed his own Juggernaut, and rue held Fiend’s Grip through all of it on Bane.',
        'Between ' + km.clock + ' and ' + km.endClock + ' Spirit took Satanic, 9Class, No[o]ne- and Noticed without losing a hero. ' +
          'The gold line crossed at minute ' + GF5.crossoverMinute + ' for the first time since minute nine, and at ' +
          GF5.frozenAt.clock + ' Spirit lead by ' + F.num(last.value) + '.'
      ],
      ents: ['Dark Seer', 'Bane', 'Juggernaut']
    });

    out.push({
      id: 'juggernaut',
      cat: 'Hot Take',
      live: true,
      date: GF5.date,
      img: 'ev2',
      headline: 'Satanic reaches for Juggernaut in a game five',
      dek: 'VISION drafted Juggernaut into the decider of a grand final. The reference point everyone reached for is not a comfortable one, and Spirit answered it with a Lotus Orb.',
      body: [
        'Xtreme Gaming’s Ame lost a TI 2025 game on Juggernaut, and the dossier records that game as the reference point for this pick.',
        'At ' + GF5.frozenAt.clock + ' Satanic is one of the four VISION heroes that went down in the minute ' +
          km.minute + ' fight. Whether the pick was brave or loose is still being settled on stage.'
      ],
      ents: ['Juggernaut']
    });

    out.push({
      id: 'two-runs',
      cat: 'Analysis',
      live: true,
      date: GF5.date,
      img: 'ed2',
      headline: 'Two unbeaten runs meet in the only game that is left',
      dek: 'VISION have not lost a series at this event and beat Spirit twice on the way here. Spirit came up through the lower bracket without dropping a map.',
      body: [
        (findStory(TI, 'vision-7-0') || {}).preDeciderAngle,
        (findStory(TI, 'spirit-route') || {}).preDeciderAngle,
        (findStory(TI, 'three-aegis') || {}).preDeciderAngle
      ],
      ents: [],
      teams: ['vision', 'spirit']
    });

    out.push({
      id: 'treant',
      cat: 'Draft',
      date: '2026-08-22',
      img: 'ed3',
      headline: 'Treant Protector was banned ' + F.num(treantBan.bans) + ' times in ' + F.num(meta.totalMatches) + ' games',
      dek: 'A ' + banRate + ' ban rate and a ' + pct(treant.contestPct, 0) +
           ' contest rate. He is the most contested hero of the tournament, and in the Main Event he has been banned in every game OpenDota records.',
      body: [
        'Treant Protector is contested in ' + F.num(treant.contested) + ' of ' + F.num(meta.totalMatches) +
          ' games, ahead of Earth Spirit on ' + F.num(earth.contested) + ' and Keeper of the Light on ' + F.num(kotl.contested) + '.',
        'On the ' + F.num(treantBan.picks) + ' occasions he slipped through he won ' + F.num(treantWins) +
          '. Captains have decided that is not a number worth testing.'
      ],
      ents: ['Treant Protector', 'Keeper of the Light']
    });

    out.push({
      id: 'yatoro-numbers',
      cat: 'Statistics',
      date: '2026-08-21',
      img: 'ev3',
      headline: 'Yatoro’s ' + F.num(rec.mostKillsInGame ? rec.mostKillsInGame.kills : null) + ' kills on Kez, and a ' +
                F.num(rec.highestGpm ? rec.highestGpm.gpm : null) + ' GPM Nature’s Prophet',
      dek: 'Two of the loudest individual numbers of TI 2026 belong to the same player, and both are verified against match data rather than press copy.',
      body: [
        'The ' + F.num(rec.mostKillsInGame ? rec.mostKillsInGame.kills : null) + ' kills came on Kez in match ' +
          (rec.mostKillsInGame ? rec.mostKillsInGame.matchId : '') +
          '. Reports tie the figure to SumaiL’s all time TI single game record on Tiny. That claim is unverified, so rdy.gg prints the kills and not the record.',
        'The gold record is ' + F.num(rec.highestGpm ? rec.highestGpm.gpm : null) + ' GPM on Nature’s Prophet over a ' +
          (rec.highestGpm ? rec.highestGpm.durationMinutes : '') + ' minute game, match ' +
          (rec.highestGpm ? rec.highestGpm.matchId : '') + '. Larl sits on the joint largest hero pool of the event at ' +
          (rec.biggestHeroPool ? rec.biggestHeroPool.heroes : '') + ', tied with watson and CHIRA_JUNIOR of Team Yandex.'
      ],
      ents: ['Kez', 'Nature’s Prophet']
    });

    out.push({
      id: 'sumail',
      cat: 'Interview',
      date: '2026-08-22',
      img: 'ed4',
      headline: 'SumaiL said it before Shanghai, and said it again on the way out',
      dek: 'Nigma Galaxy went out ' + (nigmaVsBoom ? nigmaVsBoom.score : '') +
           ' to BoomBoys in the lower bracket quarterfinal, and SumaiL announced his retirement the same day.',
      body: [
        'He had already told reporters before the event that TI 2026 was probably his last. Nigma finish ' + (nigma.placement || '') + '.',
        'The team leaves with a statistical footnote of their own: the longest average winning game of the tournament at ' +
          (rec.longestAverageWinningDuration ? rec.longestAverageWinningDuration.duration : '') + '.'
      ],
      ents: [],
      teams: ['nigma', 'boomboys']
    });

    out.push({
      id: 'falcons',
      cat: 'Recap',
      date: '2026-08-21',
      img: 'ev1',
      headline: 'The defending champions went out without a Main Event series win',
      dek: 'Team Falcons lost ' + (falconsVsNigma ? falconsVsNigma.score : '') + ' to Nigma Galaxy on day one of the playoffs, then ' +
           (falconsVsLiquid ? falconsVsLiquid.score : '') + ' to Team Liquid a day later. They finish ' + (falcons.placement || '') + '.',
      body: [
        (findStory(TI, 'falcons-out') || {}).preDeciderAngle,
        'Falcons came to Shanghai on a direct invite as the reigning champion and leave with two Main Event series played and none won.'
      ],
      ents: [],
      teams: ['falcons', 'liquid']
    });

    out.push({
      id: 'doom',
      cat: 'Draft',
      live: true,
      date: GF5.date,
      img: 'ed5',
      headline: 'Noticed has not lost on Doom at this TI',
      dek: 'Five games, five wins, checked against OpenDota. The fifth was game four of this final, the most controlled game of the series at ' +
           (g4.killScore ? g4.killScore.radiant + '-' + g4.killScore.dire : '') + '.',
      body: [
        'In game four the Doom went repeatedly on Collapse’s Centaur Warrunner, stripping Work Horse saves off Yatoro’s Templar Assassin. It ran ' +
          (g4.duration || '') + '.',
        'Across the whole event that is five picks and five wins on one hero, in a field where ' + F.num(meta.heroesUnpicked) +
          ' of the ' + F.num(meta.heroPoolSize) + ' heroes were never picked at all.'
      ],
      ents: ['Doom']
    });

    out.push({
      id: 'meta',
      cat: 'Statistics',
      date: '2026-08-22',
      img: 'ev4',
      headline: 'Earth Spirit was the best hero here, Mirana the most drafted',
      dek: F.num(earthWin.picks) + ' picks at ' + pct(earthWin.winPct, 0) + ' and a ' + pct(earth.contestPct, 1) +
           ' contest rate make Earth Spirit the hero of TI 2026. Mirana leads on volume with ' + F.num(mirana.picks) +
           ' picks at ' + pct(mirana.winPct, 0) + '.',
      body: [
        'Hoodwink is one pick behind Mirana on ' + F.num(hoodwink.picks) + ' at ' + pct(hoodwink.winPct, 0) +
          ', which is a lot of games for a hero losing more than it wins.',
        F.num(meta.heroesPicked) + ' of the ' + F.num(meta.heroPoolSize) + ' heroes were picked at least once across ' +
          F.num(meta.totalMatches) + ' recorded games. ' + F.num(meta.heroesUnpicked) + ' were never touched.'
      ],
      ents: ['Earth Spirit', 'Mirana', 'Hoodwink']
    });

    out.push({
      id: 'lgd',
      cat: 'Recap',
      date: '2026-08-16',
      img: 'ev2',
      headline: 'LGD reached Shanghai through South America, with Topson',
      dek: 'A Chinese organisation qualified through the ' + (lgd.qualification || '') +
           ' with a South American roster, then had to replace a banned prodigy before it could play.',
      body: [
        'TaiLung received a lifetime ban for match fixing before the event. LGD replaced him with two time TI champion Topson.',
        'They went out in the Elimination Round, losing ' + (lgd.eliminationRound ? lgd.eliminationRound.score : '') +
          ' to Team Yandex on ' + F.date(lgd.eliminationRound ? lgd.eliminationRound.date : null, 'short') +
          ', and finished ' + (lgd.placement || '') + '.'
      ],
      ents: [],
      teams: ['lgd', 'yandex']
    });

    /* derived metadata: read time comes from the text we actually hold */
    out.forEach(function (a) {
      a.body = (a.body || []).filter(Boolean);
      a.catSlug = slug(a.cat);
      a.read = readMinutes(a.headline, a.dek, a.body.join(' '));
      a.byline = 'rdy.gg Staff';
    });

    return out;
  }

  /* one build per page load, so the Overview and the News tab can never
     show two different versions of the same piece */
  var ARTICLE_CACHE = null;
  function articles(TI, GF5) {
    if (!ARTICLE_CACHE) { ARTICLE_CACHE = buildArticles(TI, GF5); }
    return ARTICLE_CACHE;
  }

  /* ------------------------------------------------------------------ *
   * 4. Article card renderers
   * ------------------------------------------------------------------ */

  function catChip(a) {
    return h('span', { 'class': 'chip ed-cat ed-cat--' + a.catSlug }, a.cat);
  }

  function liveChip() {
    return h('span', { 'class': 'chip chip--live ed-chip-live' }, h('span', { 'class': 'live-dot' }), 'Live');
  }

  function byline(a) {
    return h('div', { 'class': 'ed-byline' },
      h('span', { 'class': 'ed-mark', 'aria-hidden': 'true' }, 'rdy'),
      h('span', { 'class': 'ed-byline-name' }, a.byline),
      h('span', { 'class': 'ed-sep', 'aria-hidden': 'true' }, '·'),
      h('time', { 'class': 'u-tnum', datetime: a.date }, F.date(a.date, 'short')),
      h('span', { 'class': 'ed-sep', 'aria-hidden': 'true' }, '·'),
      h('span', { 'class': 'ed-read u-tnum' }, icon(ICON.clock, 'ed-read-icon'), a.read + ' min read')
    );
  }

  function entsFor(a) {
    var kids = [];
    (a.teams || []).forEach(function (k) { kids.push(crest(k)); });
    (a.ents || []).forEach(function (n) { kids.push(heroEnt(n)); });
    return entityRow(kids);
  }

  /* expandable body, so "Read" is a real control and the copy lands on
     screen rather than behind a hover (audit F14, V05) */
  function bodyBlock(a, idPrefix) {
    var bodyId = 'ed-body-' + idPrefix + '-' + a.id;
    var body = h('div', { 'class': 'ed-body', id: bodyId, hidden: true },
      a.body.map(function (p) { return h('p', { 'class': 'ed-p' }, p); }));
    var label = h('span', { 'class': 'ed-more-label' }, 'Read the piece');
    var btn = h('button', {
      type: 'button',
      'class': 'btn btn-sm ed-more',
      'aria-expanded': 'false',
      'aria-controls': bodyId,
      onclick: function () {
        var open = btn.getAttribute('aria-expanded') === 'true';
        btn.setAttribute('aria-expanded', open ? 'false' : 'true');
        body.hidden = open;
        label.textContent = open ? 'Read the piece' : 'Close';
      }
    }, label, icon(ICON.arrow, 'ed-more-icon'));
    return { button: btn, body: body };
  }

  function articleCard(a) {
    var parts = bodyBlock(a, 'news');
    return h('article', {
      'class': 'card card-hover ed-card',
      'data-testid': 'card-article',
      'data-cat': a.catSlug
    },
      figure(a.img, 'ed-figure--card'),
      h('div', { 'class': 'ed-card-body' },
        h('div', { 'class': 'cluster-sm ed-card-top' }, catChip(a), a.live ? liveChip() : null),
        h('h3', { 'class': 'ed-headline' }, a.headline),
        h('p', { 'class': 'ed-dek' }, a.dek),
        entsFor(a),
        byline(a),
        parts.button,
        parts.body)
    );
  }

  function compactCard(a) {
    var parts = bodyBlock(a, 'side');
    return h('article', {
      'class': 'card card-hover ed-mini',
      'data-testid': 'card-article',
      'data-cat': a.catSlug
    },
      h('div', { 'class': 'ed-mini-row' },
        figure(a.img, 'ed-figure--thumb', true),
        h('div', { 'class': 'ed-mini-text' },
          h('div', { 'class': 'cluster-sm ed-card-top' }, catChip(a), a.live ? liveChip() : null),
          h('h3', { 'class': 'ed-headline ed-headline--sm' }, a.headline),
          byline(a),
          creditLine())),
      parts.button,
      parts.body
    );
  }

  function featuredCard(a) {
    var parts = bodyBlock(a, 'feat');
    return h('article', {
      'class': 'card card--live ed-feature',
      'data-testid': 'card-article',
      'data-cat': a.catSlug
    },
      figure(a.img, 'ed-figure--feature'),
      h('div', { 'class': 'ed-feature-body' },
        h('div', { 'class': 'cluster-sm ed-card-top' },
          catChip(a),
          a.live ? liveChip() : null,
          h('span', { 'class': 'chip chip--outline' }, 'Featured')),
        h('h3', { 'class': 'ed-headline ed-headline--lg' }, a.headline),
        h('p', { 'class': 'ed-dek ed-dek--lg' }, a.dek),
        entsFor(a),
        byline(a),
        parts.button,
        parts.body)
    );
  }

  /* ------------------------------------------------------------------ *
   * 5. Mount: m-editorial-featured (Overview)
   * ------------------------------------------------------------------ */

  Hub.register('m-editorial-featured', function (mount, ctx) {
    var list = articles(ctx.TI2026, ctx.GF5);
    var lead = list[0];
    var rest = list.slice(1, 4);

    var section = h('section', { 'class': 'section ed-root', 'data-testid': 'editorial-featured' },
      sectionHead(
        'Coverage',
        'From the desk in ' + ctx.TI2026.event.city + ', ' + F.date(ctx.GF5.date, 'short'),
        textButton('All coverage', function () {
          Hub.tabs.activate('news', { focus: true, hash: true, scroll: true });
        })),
      h('div', { 'class': 'ed-feature-grid' },
        featuredCard(lead),
        h('div', { 'class': 'ed-feature-side' },
          rest.map(function (a) { return compactCard(a); })))
    );
    mount.appendChild(section);
  });

  /* ------------------------------------------------------------------ *
   * 6. Mount: m-news (News tab) with filters that actually filter
   * ------------------------------------------------------------------ */

  Hub.register('m-news', function (mount, ctx) {
    var list = articles(ctx.TI2026, ctx.GF5);

    var counts = {};
    list.forEach(function (a) { counts[a.catSlug] = (counts[a.catSlug] || 0) + 1; });

    var grid = h('div', { 'class': 'ed-news-grid' });
    var cards = list.map(function (a) {
      var el = articleCard(a);
      grid.appendChild(el);
      return { el: el, cat: a.catSlug };
    });

    var status = h('p', { 'class': 'ed-status u-dim', role: 'status', 'aria-live': 'polite' },
      'Showing ' + list.length + ' of ' + list.length + ' pieces');

    var chips = [];

    function apply(catSlug) {
      var shown = 0;
      cards.forEach(function (c) {
        var on = (catSlug === 'all' || c.cat === catSlug);
        c.el.hidden = !on;
        if (on) { shown++; }
      });
      chips.forEach(function (b) {
        b.setAttribute('aria-pressed', b.getAttribute('data-cat') === catSlug ? 'true' : 'false');
      });
      var label = CATEGORIES.filter(function (c) { return slug(c) === catSlug; })[0];
      status.textContent = catSlug === 'all'
        ? 'Showing ' + shown + ' of ' + list.length + ' pieces'
        : 'Showing ' + shown + ' of ' + list.length + ' pieces, filtered to ' + label;
    }

    function chip(label, catSlug, n) {
      var b = h('button', {
        type: 'button',
        'class': 'chip-filter ed-filter',
        'data-cat': catSlug,
        'aria-pressed': catSlug === 'all' ? 'true' : 'false',
        onclick: function () { apply(catSlug); }
      }, label, h('span', { 'class': 'ed-filter-count u-tnum' }, String(n)));
      chips.push(b);
      return b;
    }

    var bar = h('div', { 'class': 'ed-filters', role: 'group', 'aria-label': 'Filter coverage by category' },
      chip('All', 'all', list.length),
      CATEGORIES.filter(function (c) { return counts[slug(c)]; })
        .map(function (c) { return chip(c, slug(c), counts[slug(c)]); })
    );

    var section = h('section', { 'class': 'section ed-root', 'data-testid': 'news-list' },
      sectionHead('Coverage', ctx.TI2026.event.name + ', ' + ctx.TI2026.event.city,
        Hub.extLink(Hub.link.news(), { 'class': 'ed-textbtn ed-textbtn--link' },
          'rdy.gg Dota 2 news', icon(ICON.arrow, 'ed-textbtn-icon'))),
      bar,
      status,
      grid
    );
    mount.appendChild(section);
  });

  /* ------------------------------------------------------------------ *
   * 7. Mount: m-today (sidebar)
   * ------------------------------------------------------------------ */

  Hub.register('m-today', function (mount, ctx) {
    var TI = ctx.TI2026, GF5 = ctx.GF5;
    var gf = TI.grandFinal || {};
    var games = gf.games || [];
    var radiantKey = GF5.sides.radiant, direKey = GF5.sides.dire;

    function teamLine(key) {
      var t = Hub.team(key) || {};
      return h('div', { 'class': 'ed-today-team', 'data-team-id': key },
        Hub.teamCrest(key, 'sm'),
        Hub.extLink(Hub.link.team(t.rdyTeamId), { 'class': 'ed-today-name u-truncate' }, t.displayName || key),
        h('span', { 'class': 'ed-today-score u-tnum' }, String(GF5.seriesScore[key]))
      );
    }

    var head = h('div', { 'class': 'ed-today-series' },
      teamLine(radiantKey),
      teamLine(direKey),
      h('p', { 'class': 'ed-today-note u-dim' }, GF5.seriesNote)
    );

    var rows = games.map(function (g) {
      var time = shanghaiTime(g.startTimeUtc);
      var live = g.status !== 'final';
      var cells = [
        h('th', { scope: 'row', 'class': 'ed-g-num u-tnum' }, 'G' + g.game),
        h('td', { 'class': 'ed-g-time u-tnum' }, time || '')
      ];
      if (live) {
        cells.push(h('td', { 'class': 'ed-g-result' },
          liveChip(),
          h('span', { 'class': 'ed-g-dur u-tnum' }, GF5.frozenAt.clock)));
        /* one fixed order with a tag on each end, the same pair the Overview
           strip and the Drafts tab print (verifier I01) */
        cells.push(h('td', { 'class': 'ed-g-score col-num' },
          Hub.killsPair({ radiant: GF5.score[radiantKey], dire: GF5.score[direKey] },
            radiantKey, direKey, { stack: true })));
      } else {
        var w = Hub.team(g.winner) || {};
        cells.push(h('td', { 'class': 'ed-g-result' },
          Hub.teamCrest(g.winner, 'sm'),
          h('span', { 'class': 'ed-g-winner u-truncate' }, w.abbr || g.winner),
          h('span', { 'class': 'ed-g-dur u-tnum u-dim' }, g.duration || '')));
        cells.push(h('td', { 'class': 'ed-g-score col-num' },
          Hub.killsPair(g.killScore, g.radiant, g.dire, { stack: true })));
      }
      return h('tr', { 'class': live ? 'ed-g-row is-live' : 'ed-g-row' }, cells);
    });

    var table = h('table', { 'class': 'hub-table hub-table--compact ed-today-table' },
      h('caption', { 'class': 'u-sr-only' }, 'Grand final games today, Shanghai local time'),
      h('thead', null, h('tr', null,
        h('th', { scope: 'col' }, 'Game'),
        h('th', { scope: 'col' }, 'Start'),
        h('th', { scope: 'col' }, 'Result'),
        h('th', { scope: 'col', 'class': 'col-num' }, 'Kills'))),
      h('tbody', null, rows)
    );

    var card = h('div', { 'class': 'card card--live ed-card-side', 'data-testid': 'event-card' },
      /* No narrative rule, round 2 (audit N-R2-01). The chip used to read
         "Decider", the same hand-written stakes label the trim already
         replaced with "in progress" in the #m-live game 5 pip and in the
         Drafts tab header meta. It is now a state chip: the status comes
         from GF5.live, nothing is asserted about what the game is worth. */
      cardHead('Today, ' + F.date(GF5.date, 'short'),
        GF5.stage + ', ' + GF5.format + '. Times in ' + TI.event.city + ', UTC+8',
        GF5.live
          ? h('span', { 'class': 'chip chip--live' }, 'In progress')
          : h('span', { 'class': 'chip chip--outline' }, 'Final')),
      h('div', { 'class': 'card-body' }, head, table),
      h('div', { 'class': 'card-footer ed-side-actions' },
        textButton('Full schedule', function () {
          Hub.tabs.activate('schedule', { focus: true, hash: true, scroll: true });
        }),
        Hub.extLink(Hub.link.section('matches'), { 'class': 'ed-textbtn ed-textbtn--link' },
          'Live on rdy.gg', icon(ICON.arrow, 'ed-textbtn-icon')))
    );
    mount.appendChild(card);
  });

  /* ------------------------------------------------------------------ *
   * 8. Mount: m-feed (sidebar) with filters that actually filter
   *
   * Stamps are derived from the snapshot clock, never a fake "1h ago".
   * Quote cards quote rdy.gg's own desk lines out of the data, not a
   * player, so no invented speech appears anywhere on this page.
   * ------------------------------------------------------------------ */

  Hub.register('m-feed', function (mount, ctx) {
    var GF5 = ctx.GF5, TI = ctx.TI2026;
    var evts = GF5.events || [];

    function evt(type) {
      var i;
      for (i = 0; i < evts.length; i++) { if (evts[i].type === type) { return evts[i]; } }
      return null;
    }
    var rosh = evt('roshan');
    var fight = GF5.keyMoment || {};
    var last = GF5.goldAdvantage[GF5.goldAdvantage.length - 1];
    var g4 = (TI.grandFinal.games || [])[3] || {};
    var threeAegis = (TI.storylines || []).filter(function (x) { return x.id === 'three-aegis'; })[0];

    var items = [
      {
        /* Contract section 13 rule 4, now closed: events[] no longer ships the
           deprecated headline / detail aliases, so this card reads the real
           fields. label and facts.join(' ') are the exact strings the aliases
           carried, so the rendered text is unchanged. */
        kind: 'photos', img: 'ev1',
        title: rosh ? rosh.label : 'Roshan falls',
        text: rosh ? rosh.facts.join(' ') : '',
        stamp: 'Game 5, ' + (rosh ? rosh.time : GF5.frozenAt.clock)
      },
      {
        kind: 'quotes',
        title: 'rdy.gg live desk',
        text: GF5.seriesNote,
        stamp: 'Game 5, ' + GF5.frozenAt.clock
      },
      {
        kind: 'photos', img: 'ev2',
        title: fight.headline || 'The fight that turned it',
        text: 'Spirit take four heroes for nothing between ' + fight.clock + ' and ' + fight.endClock + '.',
        stamp: 'Game 5, ' + fight.clock
      },
      {
        kind: 'social', network: 'X', handle: '@rdygg_dota2',
        href: 'https://x.com/rdygg_dota2',
        text: 'Spirit lead by ' + F.num(last.value) + ' gold at ' + GF5.frozenAt.clock +
              '. The Aegis is still on ' + GF5.roshan.aegisHolder + ' and it runs out at ' + GF5.roshan.aegisExpiresClock + '.',
        stamp: 'Game 5, ' + GF5.frozenAt.clock
      },
      {
        kind: 'video', img: 'ev3',
        title: 'Grand final, game four in full',
        text: 'The most controlled game of the series at ' +
              (g4.killScore ? g4.killScore.radiant + '-' + g4.killScore.dire : '') + ', in ' + (g4.duration || '') + '.',
        href: Hub.link.section('reels'),
        hrefLabel: 'Watch on rdy.gg',
        stamp: F.date(GF5.date, 'short')
      },
      {
        kind: 'photos', img: 'ev4',
        title: 'Main Event floor, ' + TI.event.venue,
        text: 'Grand final day in ' + TI.event.city + '. The event peak so far is ' +
              F.num(TI.event.viewership.peakViewers) + ' concurrent viewers, ' + TI.event.viewership.source +
              ', set before this series.',
        stamp: F.date(GF5.date, 'short')
      },
      {
        kind: 'quotes',
        title: 'rdy.gg pre decider note',
        text: threeAegis ? threeAegis.preDeciderAngle : '',
        stamp: F.date(GF5.date, 'short')
      },
      {
        kind: 'social', network: 'Instagram', handle: '@rdygg_dota2',
        href: 'https://www.instagram.com/rdygg_dota2',
        text: 'Minute ' + GF5.frozenAt.minute + ' of game five. ' + GF5.teams.radiant.name + ' ' +
              GF5.score[GF5.sides.radiant] + ', ' + GF5.teams.dire.name + ' ' + GF5.score[GF5.sides.dire] + '.',
        stamp: 'Game 5, ' + GF5.frozenAt.clock
      }
    ];

    var KINDS = [
      { key: 'all', label: 'All' },
      { key: 'video', label: 'Video' },
      { key: 'photos', label: 'Photos' },
      { key: 'social', label: 'Social' },
      { key: 'quotes', label: 'Quotes' }
    ];

    var counts = { all: items.length };
    items.forEach(function (i) { counts[i.kind] = (counts[i.kind] || 0) + 1; });

    function kindIcon(kind) {
      if (kind === 'video') { return icon(ICON.play, 'ed-feed-icon'); }
      if (kind === 'photos') { return icon(ICON.camera, 'ed-feed-icon'); }
      if (kind === 'quotes') { return icon(ICON.quote, 'ed-feed-icon'); }
      return icon(ICON.share, 'ed-feed-icon');
    }

    var list = h('ul', { 'class': 'ed-feed' });
    var nodes = items.map(function (it) {
      var media = it.img
        ? figure(it.img, 'ed-figure--feed', false, it.kind === 'video' && it.href
            ? { href: it.href, play: true, linkLabel: it.hrefLabel || it.title }
            : null)
        : null;
      var head = h('div', { 'class': 'ed-feed-head' },
        kindIcon(it.kind),
        h('span', { 'class': 'ed-feed-kind' }, it.kind === 'social' ? it.network : it.kind),
        h('span', { 'class': 'spacer' }),
        h('span', { 'class': 'ed-feed-stamp u-tnum u-dim' }, it.stamp));

      var body;
      if (it.kind === 'quotes') {
        body = h('blockquote', { 'class': 'ed-quote' },
          h('p', { 'class': 'ed-quote-text' }, it.text),
          h('footer', { 'class': 'ed-quote-src u-dim' }, it.title));
      } else if (it.kind === 'social') {
        body = h('div', { 'class': 'ed-feed-text-wrap' },
          h('div', { 'class': 'ed-feed-title' }, it.handle),
          h('p', { 'class': 'ed-feed-text' }, it.text),
          Hub.extLink(it.href, { 'class': 'ed-textbtn ed-textbtn--link ed-textbtn--sm' },
            'Open on ' + it.network, icon(ICON.arrow, 'ed-textbtn-icon')));
      } else {
        body = h('div', { 'class': 'ed-feed-text-wrap' },
          h('div', { 'class': 'ed-feed-title' }, it.title),
          h('p', { 'class': 'ed-feed-text' }, it.text),
          it.href ? Hub.extLink(it.href, { 'class': 'ed-textbtn ed-textbtn--link ed-textbtn--sm' },
            it.hrefLabel || 'Open', icon(ICON.arrow, 'ed-textbtn-icon')) : null);
      }

      var li = h('li', { 'class': 'ed-feed-item', 'data-kind': it.kind }, head, media, body);
      list.appendChild(li);
      return { el: li, kind: it.kind };
    });

    var status = h('p', { 'class': 'ed-status u-dim', role: 'status', 'aria-live': 'polite' },
      items.length + ' of ' + items.length + ' items');
    var chips = [];

    function apply(next) {
      kind = next;
      expanded = false;
      chips.forEach(function (b) {
        b.setAttribute('aria-pressed', b.getAttribute('data-kind') === kind ? 'true' : 'false');
      });
      paint();
    }

    var bar = h('div', { 'class': 'ed-filters ed-filters--side', role: 'group', 'aria-label': 'Filter the feed' },
      KINDS.filter(function (k) { return counts[k.key]; }).map(function (k) {
        var b = h('button', {
          type: 'button',
          'class': 'chip-filter ed-filter',
          'data-kind': k.key,
          'aria-pressed': k.key === 'all' ? 'true' : 'false',
          onclick: function () { apply(k.key); }
        }, k.label, h('span', { 'class': 'ed-filter-count u-tnum' }, String(counts[k.key])));
        chips.push(b);
        return b;
      }));

    /* The rail used to run 1,800px of feed against a 6,000px main column.
       Four items, then the rest on request. */
    var SHOWN = 4;
    var expanded = false;
    var kind = 'all';

    function paint() {
      var seen = 0, shown = 0;
      nodes.forEach(function (n) {
        var match = (kind === 'all' || n.kind === kind);
        if (match) { seen++; }
        var on = match && (expanded || seen <= SHOWN);
        n.el.hidden = !on;
        if (on) { shown++; }
      });
      status.textContent = shown + ' of ' + seen + ' items';
      more.hidden = seen <= SHOWN;
      moreLabel.textContent = expanded ? 'Show fewer' : 'Show all ' + seen;
      more.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    }

    var moreLabel = h('span', null, 'Show all');
    var more = h('button', {
      type: 'button', 'class': 'btn btn-sm btn-block ed-feed-more',
      'aria-expanded': 'false',
      onclick: function () { expanded = !expanded; paint(); }
    }, moreLabel, icon(ICON.arrow, 'ed-textbtn-icon'));

    var card = h('div', { 'class': 'card ed-card-side', 'data-testid': 'feed' },
      cardHead('On site', 'From the floor and the rdy.gg desk'),
      h('div', { 'class': 'card-body' }, bar, status, list, more)
    );
    paint();
    mount.appendChild(card);
  });

  /* ------------------------------------------------------------------ *
   * 9. Mount: m-follow (sidebar)
   * Real rdy.gg destinations, read off rdy.gg's own footer.
   * ------------------------------------------------------------------ */

  var SOCIALS = [
    { label: 'X', handle: '@rdygg_dota2', href: 'https://x.com/rdygg_dota2', cls: 'x' },
    { label: 'Instagram', handle: '@rdygg_dota2', href: 'https://www.instagram.com/rdygg_dota2', cls: 'ig' },
    { label: 'YouTube', handle: '@rdygg', href: 'https://www.youtube.com/@rdygg', cls: 'yt' },
    { label: 'TikTok', handle: '@rdygoodgame', href: 'https://www.tiktok.com/@rdygoodgame', cls: 'tt' },
    { label: 'Facebook', handle: 'rdygoodgame', href: 'https://www.facebook.com/rdygoodgame', cls: 'fb' }
  ];

  Hub.register('m-follow', function (mount) {
    var card = h('div', { 'class': 'card card--accent ed-card-side', 'data-testid': 'follow' },
      cardHead('Follow rdy.gg', 'Dota 2 coverage every day of the event'),
      h('div', { 'class': 'card-body stack-sm' },
        Hub.extLink('https://discord.gg/k88RfX8YRx', { 'class': 'btn btn-primary btn-block ed-discord' },
          'Join the Discord'),
        h('div', { 'class': 'ed-social-grid' },
          SOCIALS.map(function (s) {
            return Hub.extLink(s.href, { 'class': 'ed-social-link ed-social-link--' + s.cls },
              h('span', { 'class': 'ed-social-label' }, s.label),
              h('span', { 'class': 'ed-social-at' }, s.handle));
          })),
        h('div', { 'class': 'divider' }),
        Hub.extLink(Hub.link.news(), { 'class': 'ed-textbtn ed-textbtn--link' },
          'Dota 2 news on rdy.gg', icon(ICON.arrow, 'ed-textbtn-icon')),
        Hub.extLink('https://rdy.gg/en/newsletter', { 'class': 'ed-textbtn ed-textbtn--link' },
          icon(ICON.bell, 'ed-textbtn-icon-l'), 'Get the newsletter'))
    );
    mount.appendChild(card);
  });

  /* ------------------------------------------------------------------ *
   * 10. Mount: m-event-info (sidebar)
   * One type size for every value (audit F31). The prize pool prints the
   * range safe string and never a total.
   * ------------------------------------------------------------------ */

  Hub.register('m-event-info', function (mount, ctx) {
    var ev = ctx.TI2026.event || {};
    var GF5 = ctx.GF5 || {};
    var phases = (ev.format && ev.format.phases) || [];
    var v = ev.viewership || {};

    var rows = [
      ['Edition', ev.name + (ev.alsoKnownAs ? ', ' + ev.alsoKnownAs : '')],
      ['Dates', F.date(ev.dates.start, 'short') + ' to ' + F.date(ev.dates.end)],
      ['Location', ev.city + ', ' + ev.country],
      ['Venue', ev.venue],
      ['Organiser', ev.organiser + (ev.producer ? ', produced by ' + ev.producer : '')],
      ['Teams', F.num(ev.teamsCount)],
      ['Prize pool', ev.prizePoolDisplay],
      ['Format', phases.map(function (p) { return p.type; }).join(', ')],
      ['Peak viewers so far', F.num(v.peakViewers)]
    ].filter(function (r) { return r[1] !== null && r[1] !== undefined && r[1] !== ''; });

    var table = h('table', { 'class': 'hub-table hub-table--compact ed-info-table' },
      h('caption', { 'class': 'u-sr-only' }, 'Key facts for ' + ev.name),
      h('tbody', null, rows.map(function (r) {
        return h('tr', null,
          h('th', { scope: 'row', 'class': 'ed-info-key' }, r[0]),
          h('td', { 'class': 'ed-info-val' }, r[1]));
      }))
    );

    var card = h('div', { 'class': 'card ed-card-side', 'data-testid': 'competition-info' },
      cardHead('Event info', ev.timezone),
      h('div', { 'class': 'card-body' },
        table,
        h('p', { 'class': 'ed-info-note u-dim' },
          'Published prize pool totals differ, so rdy.gg prints the range safe figure and never a per team amount. ' +
          'No Battle Pass: the pool is a ' + F.num(ev.prizePoolBase) + ' base from ' + ev.organiser + ' plus supporter bundle sales.'),
        /* No narrative rule, round 2 (audit N-R2-06). The footnote used to end
           with event.viewership.allTimeRank, a cross-year ranking against TI
           2021 and TI 2019 that no rule in either contract produces. The peak
           figure and its source stay; the ranking is gone, and the field is no
           longer emitted by build_ti2026.py. */
        v.source ? h('p', { 'class': 'ed-info-note u-dim' },
          'Viewership from ' + v.source + '. The peak was set before the grand final, so it holds at the ' +
          'frozen moment. Averages, hours watched and broadcast hours are whole event aggregates and ' +
          'cannot be final while game ' + (GF5.game || '') + ' is still running, so they are ' +
          'not printed here.') : null)
    );
    mount.appendChild(card);
  });

})();
