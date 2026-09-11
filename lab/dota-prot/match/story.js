/* match/story.js
   TI 2026 Match Analysis, the three sidebar cards.
   Mounts: m-summary (the derived readout at the current index), m-series
   (games 1 to 5), m-topperformer, m-links.

   NO NARRATIVE RULE, 2026-09-11. There is no write up on this page. The
   m-story module, the byline and every hand written sentence are gone, and
   with them G5.storyFacts, G5.heroOfTheGame and the prose fields on the
   teamfights. What is left is read from the record or produced by a rule that
   the reader can see: G5.landmarks carries five stops, each with its own .rule
   sentence, and G5.topPerformer carries the argmax of a published points
   formula with the whole ten player ranking beside it.
*/
(function () {
  'use strict';

  if (!window.Hub) { return; }

  var h = Hub.h;
  var F = Hub.fmt;

  /* the same count wording the ward caption uses: one kill, two kills */
  function plural(n, one, many) { return n + ' ' + (Math.abs(n) === 1 ? one : many); }

  var SUMMARY_DEFAULTS = {
    /* null means: every stop in G5.landmarks, in minute order. Each one is the
       output of a rule and carries that rule as its own .rule sentence. */
    jumpIds: null,
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

  /* the five rule defined stops, in minute order */
  function landmarks(G5) {
    var list = (G5.landmarks || []).slice();
    list.sort(function (a, b) { return a.minute - b.minute; });
    return list;
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
   * 1. m-summary, the sidebar readout. One index, rendered.
   * ================================================================== */

  Hub.register('m-summary', function (mount, ctx) {
    var G5 = ctx.G5 || {};
    var Timeline = ctx.Timeline;
    var opts = merge(SUMMARY_DEFAULTS, window.MatchSummaryOptions);
    var match = G5.match || {};
    var series = G5.series || {};
    var minutes = G5.minutes || {};
    var stops = landmarks(G5);
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

    /* quick jumps, one per rule defined landmark. Nothing here is chosen: the
       five stops come from G5.landmarks, and each one carries the rule that
       produced it, printed as the button's title and its aria-label, so the
       reader can see why the stop exists before pressing it.
       jump-buttons-no-state: each one also carries its clock so the word means
       something before it is pressed, and a pressed state driven by the same
       subscribe as everything else. */
    var jumps = h('div', { 'class': 'mt-st-su-jumps' });
    var jumpBtns = [];

    function jumpButton(label, minute, rule) {
      var b = h('button', {
        type: 'button',
        'class': 'mt-st-su-jump',
        'data-minute': String(minute),
        'aria-pressed': 'false',
        'aria-label': rule + ' Go to minute ' + minute + '.',
        title: rule
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

    stops.forEach(function (f) {
      if (opts.jumpIds && opts.jumpIds.indexOf(f.id) === -1) return;
      jumpButton(f.label, f.minute, f.rule || (f.label + ', minute ' + f.minute + '.'));
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
       the whole page while this card is not. The rule travels with them. */
    if (Timeline && Timeline.mirrorJumps) {
      Timeline.mirrorJumps(jumpBtns.map(function (b) {
        return {
          minute: b.minute,
          label: b.el.querySelector('.mt-st-su-jump-word').textContent,
          clock: b.el.querySelector('.mt-st-su-jump-clock').textContent,
          title: b.el.getAttribute('title'),
          ariaLabel: b.el.getAttribute('aria-label')
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

    /* the strip labels a magnet as "62:44 Spirit win the fight at 62:44".
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
      momentEl.textContent = moment ? momentLabel(moment) : 'no moment at or before this reading';

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
   * 2. m-series, games 1 to 5
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
   * 3. m-topperformer
   *
   * NO NARRATIVE RULE C. Nobody picks a hero of the game. The card shows the
   * argmax of a published points formula over the ten final stat lines, the
   * formula itself, and the whole ranking, so the reader can recompute it from
   * the scoreboard on the same page.
   * ================================================================== */

  Hub.register('m-topperformer', function (mount, ctx) {
    var G5 = ctx.G5 || {};
    var Timeline = ctx.Timeline;
    var tp = G5.topPerformer || null;
    var S = sideNames(G5);

    var root = h('section', { 'class': 'card card--gold mt-st-hg', 'data-testid': 'player-card' });
    mount.appendChild(root);

    if (!tp) {
      root.appendChild(h('div', { 'class': 'card-body u-dim' }, 'No player ranking in the record.'));
      return;
    }

    var player = null;
    (G5.players || []).forEach(function (p) { if (p.key === tp.playerKey) player = p; });
    var side = player ? player.side : (tp.teamKey === S.direKey ? 'dire' : 'radiant');
    var ranking = tp.ranking || [];

    root.appendChild(h('div', { 'class': 'card-header' },
      h('div', { 'class': 'titles' },
        h('h2', { 'class': 'title rdy-heading-6' },
          'Top performer' + ((player && player.handle) ? ': ' + player.handle : '')),
        h('div', { 'class': 'subtitle' }, 'points = ' + tp.formula))
    ));

    var body = h('div', { 'class': 'card-body mt-st-hg-body m-hl', 'data-player-key': tp.playerKey, 'data-player-id': String(tp.rdyPlayerId || '') });
    root.appendChild(body);

    body.appendChild(h('div', { 'class': 'mt-st-hg-top' },
      Hub.avatar({ photo: tp.photo, handle: tp.handle }, tp.teamKey, 'lg'),
      h('div', { 'class': 'mt-st-hg-id' },
        h('div', { 'class': 'mt-st-hg-handle' }, tp.handle),
        h('div', { 'class': 'mt-st-hg-real u-dim' }, tp.realName || ''),
        h('div', { 'class': 'mt-st-hg-hero' },
          Hub.heroImg(tp.hero, { side: side, size: 'sm', alt: tp.heroDisplay }),
          h('span', null, tp.heroDisplay))
      )
    ));

    function stat(label, value) {
      return h('div', { 'class': 'mt-st-hg-stat' },
        h('span', { 'class': 'mt-st-hg-stat-value u-tnum' }, value),
        h('span', { 'class': 'mt-st-hg-stat-label m-sub' }, label));
    }

    body.appendChild(h('div', { 'class': 'mt-st-hg-stats' },
      stat('Points', (Math.round(tp.points * 10) / 10).toFixed(1)),
      stat('K / D / A', tp.line),
      stat('Net worth', F.num(tp.netWorth))
    ));

    /* the whole ranking, so the formula is checkable and not just asserted */
    if (ranking.length) {
      var listEl = h('ol', { 'class': 'mt-st-hg-rank-list' });
      ranking.forEach(function (r) {
        var rowEl = h('li', {
          'class': 'mt-st-hg-rank-row m-hl is-' + r.side + (r.playerKey === tp.playerKey ? ' is-top' : ''),
          'data-player-key': r.playerKey,
          title: r.handle + ', ' + r.heroDisplay + ': ' + plural(r.kills, 'kill', 'kills') + ', ' +
            plural(r.assists, 'assist', 'assists') + ', ' + plural(r.deaths, 'death', 'deaths') +
            ', ' + r.netWorthSharePct + '% of the net worth on the server'
        },
          h('span', { 'class': 'mt-st-hg-rank-no u-tnum u-dim' }, String(r.rank)),
          Hub.heroImg(r.hero, { side: r.side, size: 'sm', alt: r.heroDisplay }),
          h('span', { 'class': 'mt-st-hg-rank-name' }, r.handle),
          h('span', { 'class': 'mt-st-hg-rank-pts u-tnum' }, (Math.round(r.points * 10) / 10).toFixed(1))
        );
        if (Timeline) {
          rowEl.addEventListener('mouseenter', function () { Timeline.highlightPlayer(r.playerKey); });
          rowEl.addEventListener('mouseleave', function () { Timeline.highlightPlayer(null); });
        }
        listEl.appendChild(rowEl);
      });
      body.appendChild(h('div', { 'class': 'mt-st-hg-rank-wrap' },
        h('div', { 'class': 'm-sub' }, 'All ten, by the same formula'),
        listEl));
    }

    body.appendChild(h('p', { 'class': 'mt-st-hg-why rdy-par-6' }, tp.rule));

    var link = Hub.link.player(tp.rdyPlayerId);
    if (link) {
      root.appendChild(h('div', { 'class': 'card-footer' },
        Hub.extLink(link, { 'class': 'btn btn-ghost btn-sm btn-block' }, tp.handle + ' on rdy.gg')));
    }

    if (Timeline) {
      body.addEventListener('mouseenter', function () { Timeline.highlightPlayer(tp.playerKey); });
      body.addEventListener('mouseleave', function () { Timeline.highlightPlayer(null); });
      Timeline.onHighlight(function (key) {
        body.classList.toggle('is-hl', !!key && key === tp.playerKey);
        var els = body.querySelectorAll('[data-player-key]');
        for (var i = 0; i < els.length; i++) {
          els[i].classList.toggle('is-hl', !!key && els[i].getAttribute('data-player-key') === key);
        }
      });
    }
    setTimeout(function () { root.classList.add('is-in'); }, 0);
  });

  /* ================================================================== *
   * 4. m-links
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
