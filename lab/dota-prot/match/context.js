/* ============================================================
   match/context.js
   #m-h2h  : head to head, the games these two teams played before the
             grand final.
   #m-form : recent games, one column a team.

   PHASE 4, item 6. Both mounts read window.SERIES_CONTEXT, which is a
   snapshot of OpenDota's team match endpoint and NOT a live feed. That
   endpoint lists GAMES, not series, so nothing here is a series record
   and every card says so in its own caption, in the file's own words:
   SERIES_CONTEXT.caveats is printed, never paraphrased.

   Rows link to https://www.opendota.com/matches/<id>. rdy.gg's own match
   ids for these older games are not in this repo, so an rdy.gg result
   link would have to be guessed and is not built. Team, player, hero and
   tournament links are rdy.gg's, through Hub.link.

   No narrative: a row is a date, a league, the teams, the kill score
   where the endpoint published one, and the duration. Nothing is
   summarised, nothing is called a streak, and a null prints as nothing.

   Owns: .mt-cx-* only. Reads no clock, so it never touches MatchTimeline.
   ============================================================ */
(function (global) {
  'use strict';

  var Hub = global.Hub;
  if (!Hub || typeof Hub.register !== 'function') return;

  var h = Hub.h;
  var fmt = Hub.fmt;

  /* ---- 9. options with defaults ---- */
  var DEFAULTS = {
    leftKey: 'vision',        /* the fixed left team, so five rows compare */
    rightKey: 'spirit',
    showCaveats: true,        /* print SERIES_CONTEXT.caveats under the rows */
    showSources: true,        /* print the source urls */
    linkTournament: true,     /* league name links to the rdy.gg tournament */
    h2hTestid: 'card-h2h',
    formTestid: 'card-form'
  };

  var RDY_DOTA = 'https://rdy.gg/en/dota2';
  var OPENDOTA_MATCH = 'https://www.opendota.com/matches/';

  function opts() {
    var o = {}, u = global.MatchContextOptions || {};
    for (var k in DEFAULTS) {
      if (Object.prototype.hasOwnProperty.call(DEFAULTS, k)) {
        o[k] = Object.prototype.hasOwnProperty.call(u, k) ? u[k] : DEFAULTS[k];
      }
    }
    return o;
  }

  /* ------------------------------------------------------------
     link builders. Hub.link carries hero, player, team, tournament and
     match. Hub.link.series may be added by the shell pass; when it is
     not there the series route is rdy.gg's finished match route, which
     is what Hub.link.match already builds. Every fallback rebuilds the
     documented pattern rather than dropping the link.
     ------------------------------------------------------------ */
  function linkTeam(id) {
    if (id === null || id === undefined || id === '') return null;
    if (Hub.link && typeof Hub.link.team === 'function') return Hub.link.team(id);
    return RDY_DOTA + '/teams/' + id;
  }

  function linkTournament(id) {
    if (id === null || id === undefined || id === '') return null;
    if (Hub.link && typeof Hub.link.tournament === 'function') return Hub.link.tournament(id);
    return RDY_DOTA + '/tournaments/' + id;
  }

  function linkSeries(id) {
    if (id === null || id === undefined || id === '') return null;
    if (Hub.link && typeof Hub.link.series === 'function') return Hub.link.series(id);
    if (Hub.link && typeof Hub.link.match === 'function') return Hub.link.match(id);
    return RDY_DOTA + '/results/' + id;
  }

  /* ------------------------------------------------------------
     the record, read at call time so a re-mount picks up whatever the
     page currently holds
     ------------------------------------------------------------ */
  function ctxData(ctx) {
    var SC = global.SERIES_CONTEXT || null;
    var G = (ctx && ctx.G5) || global.G5 || null;
    var IDX = global.GAME_INDEX || null;
    return { SC: SC, G: G, IDX: IDX };
  }

  /* team display, from the match record when it is loaded, else from
     SERIES_CONTEXT's own team block */
  function teamInfo(key, d) {
    var out = { key: key, name: key, rdyTeamId: null, hasCrest: false };
    var sc = d.SC && d.SC.teams && d.SC.teams[key];
    if (sc) {
      out.name = sc.name || key;
      out.rdyTeamId = (sc.rdyTeamId === undefined) ? null : sc.rdyTeamId;
    }
    var m = d.G && d.G.match;
    if (m) {
      ['radiant', 'dire'].forEach(function (side) {
        if (m[side] && m[side].key === key) {
          out.name = m[side].displayName || out.name;
          out.hasCrest = true;
          if (out.rdyTeamId === null && m[side].rdyTeamId !== undefined) out.rdyTeamId = m[side].rdyTeamId;
        }
      });
    }
    return out;
  }

  function initials(name) {
    var words = String(name || '').replace(/[^A-Za-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean);
    if (!words.length) return '?';
    if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
    return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
  }

  function crest(key, name, d) {
    var known = d.SC && d.SC.teams && d.SC.teams[key];
    if (known && typeof Hub.teamCrest === 'function') {
      var node = Hub.teamCrest(key, 'sm');
      if (node) return node;
    }
    return h('span', { 'class': 'mt-cx-mono', 'aria-hidden': 'true', title: name }, initials(name));
  }

  function teamName(name, rdyTeamId, extraCls) {
    var href = linkTeam(rdyTeamId);
    return Hub.extLink(href, {
      'class': 'mt-cx-tname' + (href ? ' mt-cx-link' : '') + (extraCls ? ' ' + extraCls : ''),
      'data-team-id': (rdyTeamId === null || rdyTeamId === undefined) ? null : String(rdyTeamId),
      title: href ? name + ' on rdy.gg' : name
    }, name);
  }

  /* ------------------------------------------------------------
     the shared row: date and league on the left, the bodies in the
     middle, a small right hand meta column. One anchor, whole area.
     Tier and BO chips are drawn only when the data carries them; this
     snapshot carries neither, so neither is drawn.
     ------------------------------------------------------------ */
  function rowShell(matchId, kids, label) {
    var href = matchId ? OPENDOTA_MATCH + matchId : null;
    var attrs = {
      'class': 'mt-cx-row',
      'data-testid': 'match-row',
      'data-match-id': matchId ? String(matchId) : null,
      title: label || null
    };
    return Hub.extLink(href, attrs, kids);
  }

  /* The whole row is already one anchor to OpenDota, so the league name
     inside it stays plain text: an anchor cannot nest, and a span styled
     to look like a link that does not navigate is worse than no link.
     The tournament link lives once in the card header instead. */
  function whenCell(row, d, o) {
    return h('span', { 'class': 'mt-cx-when' },
      h('span', { 'class': 'mt-cx-date u-tnum', title: fmt.date(row.date, 'weekday') }, fmt.date(row.date, 'short')),
      h('span', { 'class': 'mt-cx-league', title: row.leagueName || null }, row.leagueName || ''));
  }

  /* the one tournament link a card carries, drawn only when every row in
     it belongs to the league this match was played in */
  function tournamentAction(rows, d, o) {
    if (!o.linkTournament || !rows.length) return null;
    for (var i = 0; i < rows.length; i++) { if (!leagueMatches(rows[i], d)) return null; }
    var href = linkTournament(seriesIds(d).tournamentRdyId);
    if (!href) return null;
    return Hub.extLink(href, { 'class': 'btn btn-ghost btn-sm mt-cx-serieslink' },
      (d.G && d.G.match && d.G.match.league) || 'Tournament');
  }

  function leagueMatches(row, d) {
    var m = d.G && d.G.match;
    if (!m) return false;
    if (row.leagueId !== undefined && row.leagueId !== null) return row.leagueId === m.leagueId;
    if (row.leagueName) return row.leagueName === m.league;
    return false;
  }

  function seriesIds(d) {
    var m = d.G && d.G.match;
    var s = (m && m.series) || {};
    var idx = d.IDX || {};
    return {
      seriesRdyId: s.seriesRdyId !== undefined ? s.seriesRdyId : (idx.seriesRdyId === undefined ? null : idx.seriesRdyId),
      tournamentRdyId: s.tournamentRdyId !== undefined ? s.tournamentRdyId : (idx.tournamentRdyId === undefined ? null : idx.tournamentRdyId)
    };
  }

  function durationCell(seconds) {
    if (seconds === null || seconds === undefined) return h('span', { 'class': 'mt-cx-dur' }, '');
    return h('span', { 'class': 'mt-cx-dur u-tnum', title: 'Game length' }, fmt.clock(seconds));
  }

  /* ------------------------------------------------------------
     head to head
     ------------------------------------------------------------ */
  function h2hRow(row, d, o) {
    var left = teamInfo(o.leftKey, d);
    var right = teamInfo(o.rightKey, d);

    var scoreLeft = null, scoreRight = null;
    if (row.kills && typeof row.kills.radiant === 'number' && typeof row.kills.dire === 'number') {
      scoreLeft = row.radiantKey === o.leftKey ? row.kills.radiant : row.kills.dire;
      scoreRight = row.radiantKey === o.rightKey ? row.kills.radiant : row.kills.dire;
    }

    function side(info, score, isLeft) {
      var won = row.winnerKey === info.key;
      return h('span', { 'class': 'mt-cx-side' + (isLeft ? '' : ' mt-cx-side--right') + (won ? ' is-winner' : ' is-loser') },
        crest(info.key, info.name, d),
        h('span', { 'class': 'mt-cx-tname u-truncate', title: info.name }, info.name));
    }

    var scoreNode = (scoreLeft === null)
      ? h('span', { 'class': 'mt-cx-score is-unknown' }, '')
      : h('span', { 'class': 'mt-cx-score u-tnum' },
        h('b', { 'class': row.winnerKey === o.leftKey ? 'is-winner' : 'is-loser' }, String(scoreLeft)),
        h('i', null, ':'),
        h('b', { 'class': row.winnerKey === o.rightKey ? 'is-winner' : 'is-loser' }, String(scoreRight)));

    var label = fmt.date(row.date) + ', ' + (row.leagueName || '') + '. ' +
      (scoreLeft === null
        ? 'No kill score published.'
        : left.name + ' ' + scoreLeft + ' to ' + scoreRight + ' ' + right.name + '.') +
      ' Opens this game on OpenDota.';

    return rowShell(row.matchId, [
      whenCell(row, d, o),
      h('span', { 'class': 'mt-cx-bodies' },
        side(left, scoreLeft, true),
        scoreNode,
        side(right, scoreRight, false)),
      durationCell(row.durationSeconds)
    ], label);
  }

  /* ------------------------------------------------------------
     recent form
     ------------------------------------------------------------ */
  function formRow(row, teamKey, d, o) {
    var oppKey = null;
    if (d.SC && d.SC.teams) {
      for (var k in d.SC.teams) {
        if (!Object.prototype.hasOwnProperty.call(d.SC.teams, k)) continue;
        if (d.SC.teams[k].openDotaId === row.opponentOpenDotaId) oppKey = k;
      }
    }
    var oppName = row.opponentName || '';

    var wl = h('span', {
      'class': 'mt-cx-wl ' + (row.won ? 'is-w' : 'is-l'),
      title: row.won ? 'Won this game' : 'Lost this game'
    }, row.won ? 'W' : 'L');

    var label = fmt.date(row.date) + ', ' + (row.leagueName || '') + ', against ' + oppName + ', ' +
      (row.won ? 'won' : 'lost') + '. Opens this game on OpenDota.';

    return rowShell(row.matchId, [
      whenCell(row, d, o),
      h('span', { 'class': 'mt-cx-bodies mt-cx-bodies--form' },
        h('span', { 'class': 'mt-cx-side' },
          crest(oppKey, oppName, d),
          h('span', { 'class': 'mt-cx-tname u-truncate', title: oppName }, oppName)),
        wl),
      durationCell(row.durationSeconds)
    ], label);
  }

  /* ------------------------------------------------------------
     the shared footer: the file's own caveats and its own sources.
     Printed, not paraphrased.
     ------------------------------------------------------------ */
  /* COMPACT, 2026-09-12: the lead sentence and the caveats are the rules
     these rows are read under, not the rows. They go behind one 'i' beside
     the source line, which stays: a source is a credit, not a detail. */
  function footer(d, o, lead) {
    var kids = [];
    var ruleBits = [];
    if (lead) ruleBits.push(lead);

    if (o.showCaveats && d.SC && d.SC.caveats && d.SC.caveats.length) {
      d.SC.caveats.forEach(function (c) { ruleBits.push(c); });
    }

    if (ruleBits.length && Hub.infoTip) {
      kids.push(h('p', { 'class': 'mt-cx-ruleline' },
        h('span', { 'class': 'm-sub' }, 'How to read these rows'),
        Hub.infoTip(ruleBits.join(' '), { label: 'How to read these rows' })));
      return h('div', { 'class': 'mt-cx-foot' }, kids, sourceLine(d, o));
    }

    if (lead) kids.push(h('p', { 'class': 'mt-cx-lead' }, lead));

    if (o.showCaveats && d.SC && d.SC.caveats && d.SC.caveats.length) {
      var ul = h('ul', { 'class': 'mt-cx-notes' });
      d.SC.caveats.forEach(function (c) { ul.appendChild(h('li', null, c)); });
      kids.push(ul);
    }

    var src = sourceLine(d, o);
    if (src) kids.push(src);

    return h('div', { 'class': 'mt-cx-foot' }, kids);
  }

  function sourceLine(d, o) {
    if (!(o.showSources && d.SC && d.SC.sources && d.SC.sources.length)) return null;
    var row = h('p', { 'class': 'mt-cx-sources' }, h('span', { 'class': 'm-sub' }, 'Source'));
    d.SC.sources.forEach(function (src, i) {
      var isUrl = /^https?:\/\//i.test(src);
      row.appendChild(h('span', { 'class': 'mt-cx-sep', 'aria-hidden': 'true' }, i === 0 ? ' ' : ', '));
      row.appendChild(isUrl
        ? Hub.extLink(src, { 'class': 'mt-cx-link' }, src.replace(/^https?:\/\//i, ''))
        : h('span', { 'class': 'mt-cx-srctext' }, src));
    });
    return row;
  }

  function emptyState(d, what) {
    /* the empty state copy is the file's own caveats, so an empty list
       can never read as a page bug */
    var kids = [h('p', { 'class': 'mt-cx-emptylead' },
      'The snapshot publishes no ' + what + ' before the grand final.')];
    if (d.SC && d.SC.caveats && d.SC.caveats.length) {
      var ul = h('ul', { 'class': 'mt-cx-notes' });
      d.SC.caveats.forEach(function (c) { ul.appendChild(h('li', null, c)); });
      kids.push(ul);
    }
    return h('div', { 'class': 'mt-cx-empty' }, kids);
  }

  function cardShell(mount, testid, title, subtitle, action) {
    var header = h('div', { 'class': 'card-header' },
      h('div', { 'class': 'titles' },
        h('h2', { 'class': 'title' }, title),
        h('div', { 'class': 'subtitle' }, subtitle)),
      action ? h('div', { 'class': 'action' }, action) : null);
    var body = h('div', { 'class': 'card-body mt-cx-body' });
    var card = h('section', { 'class': 'card mt-cx', 'data-testid': testid }, header, body);
    mount.textContent = '';
    mount.appendChild(card);
    return body;
  }

  /* ============================================================
     #m-h2h
     ============================================================ */
  Hub.register('m-h2h', function (mount, ctx) {
    var d = ctxData(ctx);
    var o = opts();
    if (!d.SC) { mount.textContent = ''; return; }

    var left = teamInfo(o.leftKey, d);
    var right = teamInfo(o.rightKey, d);
    var rows = d.SC.headToHead || [];
    var unit = d.SC.unit || 'game';
    var seriesHref = linkSeries(seriesIds(d).seriesRdyId);

    var action = h('div', { 'class': 'cluster mt-cx-actions' },
      tournamentAction(rows, d, o),
      seriesHref
        ? Hub.extLink(seriesHref, { 'class': 'btn btn-ghost btn-sm mt-cx-serieslink' }, 'This series on rdy.gg')
        : null);

    var body = cardShell(mount, o.h2hTestid, 'Head to head',
      'Games between these teams before the grand final, newest first.', action);

    var teamLine = h('p', { 'class': 'mt-cx-teamline' },
      teamName(left.name, left.rdyTeamId), h('span', { 'class': 'mt-cx-vs' }, ' against '),
      teamName(right.name, right.rdyTeamId));
    body.appendChild(teamLine);

    if (!rows.length) {
      body.appendChild(emptyState(d, 'meetings'));
      return;
    }

    var list = h('div', { 'class': 'mt-cx-rows', role: 'list' });
    rows.forEach(function (r) {
      var row = h2hRow(r, d, o);
      row.setAttribute('role', 'listitem');
      list.appendChild(row);
    });
    body.appendChild(list);

    var lead = rows.length + ' ' + unit + (rows.length === 1 ? '' : 's') +
      ', the most recent before ' + fmt.date(d.SC.asOfDate) +
      '. Each row opens that game on OpenDota, which is where these rows come from; ' +
      'rdy.gg result ids for games this old are not in this prototype.';
    body.appendChild(footer(d, o, lead));
  });

  /* ============================================================
     #m-form
     ============================================================ */
  Hub.register('m-form', function (mount, ctx) {
    var d = ctxData(ctx);
    var o = opts();
    if (!d.SC) { mount.textContent = ''; return; }

    var recent = d.SC.recent || {};
    var allRows = (recent[o.rightKey] || []).concat(recent[o.leftKey] || []);

    var body = cardShell(mount, o.formTestid, 'Recent games',
      'The most recent games each team played before the grand final, newest first. ' +
      'The five grand final games are excluded.',
      tournamentAction(allRows, d, o));

    var cols = h('div', { 'class': 'mt-cx-cols' });
    var any = false;

    [o.rightKey, o.leftKey].forEach(function (key) {
      var info = teamInfo(key, d);
      var rows = recent[key] || [];
      if (rows.length) any = true;

      var col = h('div', { 'class': 'mt-cx-col', 'data-team-id': info.rdyTeamId === null ? null : String(info.rdyTeamId) },
        h('h3', { 'class': 'mt-cx-coltitle' },
          crest(key, info.name, d),
          h('span', null, 'Recent games, '),
          teamName(info.name, info.rdyTeamId)));

      if (!rows.length) {
        col.appendChild(emptyState(d, 'games'));
      } else {
        var list = h('div', { 'class': 'mt-cx-rows', role: 'list' });
        var won = 0;
        rows.forEach(function (r) {
          if (r.won) won++;
          var row = formRow(r, key, d, o);
          row.setAttribute('role', 'listitem');
          list.appendChild(row);
        });
        col.appendChild(list);
        col.appendChild(h('p', { 'class': 'mt-cx-tally u-tnum' },
          won + ' won, ' + (rows.length - won) + ' lost, over these ' + rows.length + ' games.'));
      }

      cols.appendChild(col);
    });

    body.appendChild(cols);

    var lead = any
      ? 'Rows are games. A team can show a win on a map inside a series it lost, so this is not a series record.'
      : null;
    body.appendChild(footer(d, o, lead));
  });

  global.MatchContext = { defaults: DEFAULTS, version: '1.0.0' };

}(window));
