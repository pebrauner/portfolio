/* match/draft.js
   TI 2026 Match Analysis, the Captain's Mode draft stepper.
   Mount: m-draft. The section root carries id="draft" (the Hub links to it).

   One array is the whole truth here too: G5.draft is 24 steps in order, and
   everything on screen is that array read at one step index. The stepper owns
   its own index because the draft happens before minute 0, so it is not on the
   master minute timeline. Every other principle is the same: instant pointer
   tracking, snap to a real step, hover previews and leaving restores the
   committed step, a tap commits, arrows and Home and End on the keyboard, and
   an aria-live readout. No spring, because a step is a discrete thing and
   there is nothing to travel back over.

   Nothing is typed by hand. Phase labels, phase boundaries, the ban and pick
   counts, the lineups and the five notes all come from the payload.
*/
(function () {
  'use strict';

  if (!window.Hub) { return; }

  var h = Hub.h;

  /* Options with defaults, principle 9. Pass them to Hub.register's closure by
     editing DRAFT_OPTIONS, or read them from window.MatchDraftOptions if the
     page ever wants to override one without touching this file. */
  var DEFAULTS = {
    home: null,        /* committed step on mount. null means the last step, the full draft */
    first: 1,          /* the first real step */
    hoverScrub: true,  /* hovering the strip previews a step without committing */
    tap: true,         /* a press and release commits the step under the pointer */
    keyboard: true,    /* arrows, Shift arrows, Home, End on the strip */
    bigStep: 5,        /* how far Shift plus arrow moves */
    cellMinHeight: 46  /* the strip cell height, mirrored in draft.css */
  };

  function resolveOptions(over) {
    var o = {}, k;
    for (k in DEFAULTS) { if (DEFAULTS.hasOwnProperty(k)) o[k] = DEFAULTS[k]; }
    if (over) { for (k in over) { if (over.hasOwnProperty(k)) o[k] = over[k]; } }
    return o;
  }

  /* ------------------------------------------------------------------ *
   * Small helpers
   * ------------------------------------------------------------------ */

  function portraitOf(step) {
    return step.portrait || Hub.heroPortrait(step.hero) || null;
  }

  function sideOf(step) { return step.side === 'dire' ? 'dire' : 'radiant'; }

  function actionWord(step) { return step.type === 'ban' ? 'ban' : 'pick'; }

  /* "Team Spirit ban Morphling" / "TEAM VISION pick Rubick for 9Class" */
  function sentence(step, teamName) {
    var s = teamName + ' ' + actionWord(step) + ' ' + step.heroDisplay;
    if (step.type === 'pick' && step.playerHandle) {
      s += ' for ' + step.playerHandle + (step.pos ? ' (position ' + step.pos + ')' : '');
    }
    return s;
  }

  /* consecutive steps that share a phase label, for the band row */
  function phaseGroups(draft) {
    var out = [], cur = null;
    for (var i = 0; i < draft.length; i++) {
      var st = draft[i];
      if (!cur || cur.label !== st.phase) {
        cur = { label: st.phase, from: st.order, to: st.order, type: st.type };
        out.push(cur);
      } else {
        cur.to = st.order;
      }
    }
    return out;
  }

  /* the short band label: "Ban phase 1" is too long for a 7 cell band at 1024 */
  function shortPhase(label) {
    return label
      .replace('Ban phase ', 'Bans ')
      .replace('Pick phase ', 'Picks ');
  }

  /* ------------------------------------------------------------------ *
   * The local step scrub. Principles 2, 3, 4 (commit is a tap, there is no
   * magnet to capture because every step is itself a snap), 6, 7, 8.
   * ------------------------------------------------------------------ */

  function attachStepScrub(el, api, opts) {
    var down = false, travel = 0, sx = 0, sy = 0, pid = null;

    function stepFromX(clientX) {
      var r = el.getBoundingClientRect();
      if (!(r.width > 0)) { return api.committed(); }
      var t = (clientX - r.left) / r.width;
      if (t < 0) t = 0; if (t > 1) t = 1;
      var n = api.last - opts.first + 1;
      var s = opts.first + Math.floor(t * n);
      if (s > api.last) s = api.last;
      if (s < opts.first) s = opts.first;
      return s;
    }

    function onDown(e) {
      if (e.button !== undefined && e.button !== 0) return;
      down = true; travel = 0; sx = e.clientX; sy = e.clientY; pid = e.pointerId;
      try { el.setPointerCapture(pid); } catch (err) {}
      el.classList.add('is-scrubbing');
      api.preview(stepFromX(e.clientX));
      if (e.cancelable) e.preventDefault();
    }

    function onMove(e) {
      if (down) {
        travel = Math.max(travel, Math.abs(e.clientX - sx) + Math.abs(e.clientY - sy));
        api.preview(stepFromX(e.clientX));
      } else if (opts.hoverScrub) {
        api.preview(stepFromX(e.clientX));
      }
    }

    function onUp(e) {
      if (!down) return;
      down = false;
      try { el.releasePointerCapture(pid); } catch (err) {}
      el.classList.remove('is-scrubbing');
      /* a tap and a drag both commit: the step under the pointer is the step
         the reader is looking at, so there is nothing to spring back from */
      if (opts.tap || travel >= 4) { api.commit(stepFromX(e.clientX)); }
      else { api.restore(); }
    }

    function onCancel() {
      if (!down) return;
      down = false;
      el.classList.remove('is-scrubbing');
      api.restore();
    }

    function onLeave() { if (!down) api.restore(); }

    function onKey(e) {
      var big = e.shiftKey ? opts.bigStep : 1;
      var k = e.key;
      if (k === 'ArrowRight' || k === 'ArrowUp') { api.commit(api.committed() + big); }
      else if (k === 'ArrowLeft' || k === 'ArrowDown') { api.commit(api.committed() - big); }
      else if (k === 'Home') { api.commit(opts.first); }
      else if (k === 'End') { api.commit(api.last); }
      else if (k === 'PageUp') { api.commit(api.committed() + opts.bigStep); }
      else if (k === 'PageDown') { api.commit(api.committed() - opts.bigStep); }
      else return;
      e.preventDefault();
      e.stopPropagation();
    }

    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onCancel);
    el.addEventListener('pointerleave', onLeave);
    if (opts.keyboard !== false) { el.addEventListener('keydown', onKey); }
    el.addEventListener('blur', function () { api.restore(); });
  }

  /* ------------------------------------------------------------------ *
   * The component
   * ------------------------------------------------------------------ */

  Hub.register('m-draft', function (mount, ctx) {
    var G5 = ctx.G5 || {};
    var Timeline = ctx.Timeline;
    var draft = G5.draft || [];
    var lineups = G5.lineups || { radiant: [], dire: [] };
    var match = G5.match || {};
    var counts = G5.draftCounts || null;

    var root = h('section', {
      'class': 'card mt-dr',
      id: 'draft',
      'data-testid': 'draft-analysis'
    });
    mount.appendChild(root);

    if (!draft.length) {
      root.appendChild(h('div', { 'class': 'card-body u-dim' }, 'The draft is not in the record.'));
      return;
    }

    var opts = resolveOptions(window.MatchDraftOptions);
    var lastStep = draft[draft.length - 1].order;
    var committed = typeof opts.home === 'number' ? opts.home : lastStep;
    var showing = committed;

    var teamName = {
      radiant: (match.radiant && match.radiant.name) || 'Radiant',
      dire: (match.dire && match.dire.name) || 'Dire'
    };
    var teamKeyBySide = {
      radiant: (match.radiant && match.radiant.key) || 'radiant',
      dire: (match.dire && match.dire.key) || 'dire'
    };

    /* ---------- header ---------- */

    var subtitleBits = [];
    if (match.gameMode) subtitleBits.push(match.gameMode);
    if (counts) subtitleBits.push(counts.bans + ' bans and ' + counts.picks + ' picks in ' + counts.steps + ' steps');
    var firstStep = draft[0];
    if (firstStep) {
      subtitleBits.push(teamName[sideOf(firstStep)] + ' had the first ' + actionWord(firstStep));
    }

    root.appendChild(h('div', { 'class': 'card-header' },
      h('div', { 'class': 'titles' },
        h('h2', { 'class': 'title rdy-heading-5' }, 'Draft'),
        h('div', { 'class': 'subtitle' }, subtitleBits.join('. ') + '.')
      ),
      h('div', { 'class': 'action mt-dr-counter u-tnum' },
        h('span', { 'class': 'mt-dr-counter-now' }, String(committed)),
        h('span', { 'class': 'mt-dr-counter-sep' }, ' / '),
        h('span', null, String(lastStep))
      )
    ));

    var body = h('div', { 'class': 'card-body stack' });
    root.appendChild(body);

    var counterNow = root.querySelector('.mt-dr-counter-now');

    /* ---------- the step strip ---------- */

    var groups = phaseGroups(draft);
    /* the band row is the only grid that needs an explicit template, because
       a band spans named columns. It is written from the step count so a
       different draft length still lines up with the cells. */
    var bandRow = h('div', {
      'class': 'mt-dr-bands',
      'aria-hidden': 'true',
      style: { 'grid-template-columns': 'repeat(' + draft.length + ', minmax(0, 1fr))' }
    });
    groups.forEach(function (g) {
      bandRow.appendChild(h('div', {
        'class': 'mt-dr-band mt-dr-band--' + (g.type === 'ban' ? 'ban' : 'pick'),
        style: { 'grid-column': (g.from) + ' / ' + (g.to + 1) }
      }, h('span', { 'class': 'mt-dr-band-label' }, shortPhase(g.label))));
    });

    var cells = [];
    var track = h('div', {
      'class': 'mt-dr-track m-scrub',
      tabindex: '0',
      role: 'slider',
      'aria-label': 'Draft step',
      'aria-valuemin': String(opts.first),
      'aria-valuemax': String(lastStep),
      'aria-valuenow': String(committed)
    });

    draft.forEach(function (step) {
      var side = sideOf(step);
      var src = portraitOf(step);
      var cell = h('div', {
        'class': 'mt-dr-cell mt-dr-cell--' + side + ' mt-dr-cell--' + step.type,
        'data-step': String(step.order),
        'aria-hidden': 'true',
        title: step.order + '. ' + sentence(step, teamName[side])
      },
        src
          ? h('span', { 'class': 'mt-dr-cell-img', style: { 'background-image': 'url("' + src + '")' } })
          : h('span', { 'class': 'mt-dr-cell-img mt-dr-cell-img--none' }, step.heroDisplay.slice(0, 2)),
        h('span', { 'class': 'mt-dr-cell-bar' }),
        step.type === 'ban' ? h('span', { 'class': 'mt-dr-cell-slash' }) : null
      );
      cells.push(cell);
      track.appendChild(cell);
    });

    var nums = h('div', { 'class': 'mt-dr-nums u-tnum', 'aria-hidden': 'true' });
    draft.forEach(function (step) {
      nums.appendChild(h('span', { 'class': 'mt-dr-num', 'data-step': String(step.order) }, String(step.order)));
    });

    body.appendChild(h('div', { 'class': 'mt-dr-stepper' },
      bandRow,
      track,
      nums,
      h('div', { 'class': 'mt-dr-hint u-dim' },
        'Drag, hover or use the arrow keys to walk the draft. Home and End jump to the ends.')
    ));

    /* ---------- the detail card ---------- */

    var dPortrait = h('div', { 'class': 'mt-dr-detail-portrait' });
    var dAction = h('span', { 'class': 'chip mt-dr-action' }, 'PICK');
    var dStep = h('span', { 'class': 'mt-dr-detail-step u-tnum u-dim' }, '');
    var dPhase = h('span', { 'class': 'mt-dr-detail-phase m-sub' }, '');
    var dHero = h('div', { 'class': 'mt-dr-detail-hero rdy-heading-5' }, '');
    var dPlayer = h('div', { 'class': 'mt-dr-detail-player m-hl' });
    var dNote = h('p', { 'class': 'mt-dr-detail-note rdy-par-6' }, '');
    var dLive = h('div', { 'class': 'u-sr-only', role: 'status', 'aria-live': 'polite' }, '');
    /* M-06: silent unless focus is inside the draft stepper */
    var speak = (Timeline && Timeline.quietLive)
      ? Timeline.quietLive(dLive, root)
      : function (t) { dLive.textContent = t; };

    var detail = h('div', { 'class': 'mt-dr-detail' },
      dPortrait,
      h('div', { 'class': 'mt-dr-detail-main' },
        h('div', { 'class': 'mt-dr-detail-top cluster-sm' }, dAction, dPhase, dStep),
        dHero,
        dPlayer,
        dNote
      ),
      dLive
    );
    body.appendChild(detail);

    /* ---------- the two lineups ---------- */

    var pickRows = {};   /* order -> element */
    var banChips = {};   /* order -> element */

    function teamPanel(side) {
      var key = teamKeyBySide[side];
      var picks = draft.filter(function (s) { return s.type === 'pick' && sideOf(s) === side; });
      var bans = draft.filter(function (s) { return s.type === 'ban' && sideOf(s) === side; });
      var order = (lineups[side] || []).slice();

      /* the lineup order from the payload, with the draft step attached */
      var slots = order.length ? order.map(function (p) {
        var st = null;
        for (var i = 0; i < picks.length; i++) { if (picks[i].order === p.pickOrder) { st = picks[i]; break; } }
        return { p: p, step: st };
      }) : picks.map(function (st) {
        return { p: { playerKey: st.playerKey, handle: st.playerHandle, pos: st.pos, heroDisplay: st.heroDisplay, hero: st.hero, portrait: st.portrait }, step: st };
      });

      var pickList = h('ol', { 'class': 'mt-dr-picks' });
      slots.forEach(function (slot) {
        var st = slot.step;
        if (!st) { return; }
        /* M-05: keyboard parity with the ban chips, which are real buttons.
           The cell stays an <li> for the ordered lineup semantics and takes
           the button role, a tab stop, a name and an Enter / Space handler. */
        var pickLabel = 'Step ' + st.order + ', ' + st.phase + ': ' + teamName[side] +
          ' pick ' + st.heroDisplay +
          ((slot.p.handle || st.playerHandle) ? ' for ' + (slot.p.handle || st.playerHandle) : '') +
          (slot.p.pos ? ', position ' + slot.p.pos : '');
        var row = h('li', {
          'class': 'mt-dr-pick m-hl',
          role: 'button',
          tabindex: '0',
          'aria-label': pickLabel,
          title: pickLabel,
          'data-step': String(st.order),
          'data-player-key': slot.p.playerKey || '',
          'data-player-id': slot.p.playerKey || ''
        },
          h('span', { 'class': 'mt-dr-pick-step u-tnum' }, String(st.order)),
          Hub.heroImg(st.hero, { side: side, size: 'sm', alt: st.heroDisplay }),
          h('span', { 'class': 'mt-dr-pick-names' },
            h('span', { 'class': 'mt-dr-pick-hero' }, st.heroDisplay),
            h('span', { 'class': 'mt-dr-pick-player u-dim' },
              (slot.p.handle || st.playerHandle || '') + (slot.p.pos ? ', pos ' + slot.p.pos : ''))
          ),
          h('span', { 'class': 'mt-dr-pick-empty u-dim' }, 'not drafted yet')
        );
        row.addEventListener('click', function () { commit(st.order); });
        row.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
            e.preventDefault();
            commit(st.order);
          }
        });
        if (slot.p.playerKey && Timeline) {
          row.addEventListener('mouseenter', function () { Timeline.highlightPlayer(slot.p.playerKey); });
          row.addEventListener('mouseleave', function () { Timeline.highlightPlayer(null); });
        }
        pickRows[st.order] = row;
        pickList.appendChild(row);
      });

      var banWrap = h('div', { 'class': 'mt-dr-bans' });
      bans.forEach(function (st) {
        var chip = h('button', {
          type: 'button',
          'class': 'mt-dr-ban',
          'data-step': String(st.order),
          title: 'Step ' + st.order + ', ' + st.phase + ': ' + teamName[side] + ' ban ' + st.heroDisplay
        },
          Hub.heroImg(st.hero, { size: 'sm', alt: st.heroDisplay, className: 'mt-dr-ban-img' }),
          h('span', { 'class': 'mt-dr-ban-name' }, st.heroDisplay),
          h('span', { 'class': 'mt-dr-ban-step u-tnum u-dim' }, String(st.order))
        );
        chip.addEventListener('click', function () { commit(st.order); });
        banChips[st.order] = chip;
        banWrap.appendChild(chip);
      });

      return h('div', { 'class': 'mt-dr-team mt-dr-team--' + side, 'data-team-id': key },
        h('div', { 'class': 'mt-dr-team-head' },
          Hub.teamCrest(key, 'sm'),
          h('span', { 'class': 'mt-dr-team-name' }, teamName[side]),
          h('span', { 'class': 'chip chip--' + side }, side === 'radiant' ? 'RADIANT' : 'DIRE')
        ),
        h('div', { 'class': 'm-sub' }, 'Picks'),
        pickList,
        h('div', { 'class': 'm-sub' }, 'Bans'),
        banWrap
      );
    }

    body.appendChild(h('div', { 'class': 'mt-dr-teams' },
      teamPanel('radiant'),
      teamPanel('dire')
    ));

    /* ---------- the notes, five sourced lines in the payload ---------- */

    var noted = draft.filter(function (s) { return !!s.note; });
    var noteRows = {};
    if (noted.length) {
      var noteList = h('ul', { 'class': 'mt-dr-notes' });
      noted.forEach(function (st) {
        var side = sideOf(st);
        var row = h('li', { 'class': 'mt-dr-note', 'data-step': String(st.order) },
          h('button', {
            type: 'button',
            'class': 'mt-dr-note-btn',
            'aria-label': 'Go to draft step ' + st.order
          },
            h('span', { 'class': 'mt-dr-note-step u-tnum' }, String(st.order)),
            Hub.heroImg(st.hero, { side: side, size: 'sm', alt: st.heroDisplay }),
            h('span', { 'class': 'mt-dr-note-text rdy-par-6' }, st.note)
          )
        );
        row.querySelector('button').addEventListener('click', function () { commit(st.order); });
        noteRows[st.order] = row;
        noteList.appendChild(row);
      });
      body.appendChild(h('div', { 'class': 'mt-dr-notes-wrap' },
        h('div', { 'class': 'm-sub' }, 'Notable steps'),
        noteList
      ));
    }

    /* ---------- footer ---------- */

    root.appendChild(h('div', { 'class': 'card-footer mt-dr-foot' },
      h('span', { 'class': 'u-dim rdy-par-7' },
        'Draft order as played, from the match record. Step ' + opts.first + ' is the first ban.'),
      h('a', { 'class': 'btn btn-ghost btn-sm', href: 'TI2026_Hub_Prototype_rdy_gg.html#drafts' },
        'All series drafts')
    ));

    /* ------------------------------------------------------------------ *
     * State. The visual IS the state: one render pass writes classes and
     * text, it never rebuilds a subtree.
     * ------------------------------------------------------------------ */

    function stepAt(order) {
      for (var i = 0; i < draft.length; i++) { if (draft[i].order === order) return draft[i]; }
      return draft[draft.length - 1];
    }

    function render(order, isPreview) {
      var st = stepAt(order);
      var side = sideOf(st);
      var name = teamName[side];

      for (var i = 0; i < cells.length; i++) {
        var c = cells[i];
        var n = Number(c.getAttribute('data-step'));
        c.classList.toggle('is-done', n <= order);
        c.classList.toggle('is-current', n === order);
      }
      var numEls = nums.children;
      for (var j = 0; j < numEls.length; j++) {
        numEls[j].classList.toggle('is-current', Number(numEls[j].getAttribute('data-step')) === order);
      }

      track.setAttribute('aria-valuenow', String(order));
      track.setAttribute('aria-valuetext', 'Step ' + order + ' of ' + lastStep + ', ' + st.phase + ', ' + sentence(st, name));
      track.classList.toggle('is-preview', !!isPreview);
      counterNow.textContent = String(order);

      dAction.textContent = (st.type === 'ban' ? 'BAN' : 'PICK') + ' ' + (Hub.teamTag(teamKeyBySide[side]) || '');
      dAction.className = 'chip mt-dr-action chip--' + side + ' is-' + st.type;
      dPhase.textContent = st.phase;
      dStep.textContent = 'Step ' + order + ' of ' + lastStep;
      dHero.textContent = st.heroDisplay;

      dPortrait.textContent = '';
      dPortrait.appendChild(Hub.heroImg(st.hero, { side: side, size: 'lg', alt: st.heroDisplay }));
      dPortrait.classList.toggle('is-ban', st.type === 'ban');

      dPlayer.textContent = '';
      dPlayer.setAttribute('data-player-key', st.playerKey || '');
      if (st.type === 'pick' && st.playerHandle) {
        dPlayer.appendChild(h('span', { 'class': 'mt-dr-detail-for u-dim' }, 'for'));
        dPlayer.appendChild(h('span', { 'class': 'mt-dr-detail-handle' }, st.playerHandle));
        if (st.pos) dPlayer.appendChild(h('span', { 'class': 'mt-dr-detail-pos u-dim' }, 'position ' + st.pos));
        dPlayer.appendChild(h('span', { 'class': 'mt-dr-detail-team u-dim' }, name));
      } else {
        dPlayer.appendChild(h('span', { 'class': 'mt-dr-detail-team u-dim' }, name + ' ban'));
      }

      if (st.note) { dNote.textContent = st.note; dNote.hidden = false; }
      else { dNote.textContent = ''; dNote.hidden = true; }

      var k;
      for (k in pickRows) {
        if (!pickRows.hasOwnProperty(k)) continue;
        pickRows[k].classList.toggle('is-revealed', Number(k) <= order);
        pickRows[k].classList.toggle('is-current', Number(k) === order);
      }
      for (k in banChips) {
        if (!banChips.hasOwnProperty(k)) continue;
        banChips[k].classList.toggle('is-revealed', Number(k) <= order);
        banChips[k].classList.toggle('is-current', Number(k) === order);
      }
      for (k in noteRows) {
        if (!noteRows.hasOwnProperty(k)) continue;
        noteRows[k].classList.toggle('is-current', Number(k) === order);
      }

      speak('Step ' + order + ' of ' + lastStep + ', ' + sentence(st, name), 'idle');
    }

    function clamp(n) {
      if (!(n > opts.first)) return opts.first;
      if (n > lastStep) return lastStep;
      return Math.round(n);
    }

    function preview(order) {
      showing = clamp(order);
      render(showing, showing !== committed);
    }

    function commit(order) {
      committed = clamp(order);
      showing = committed;
      render(committed, false);
    }

    function restore() {
      showing = committed;
      render(committed, false);
    }

    attachStepScrub(track, {
      last: lastStep,
      committed: function () { return committed; },
      preview: preview,
      commit: commit,
      restore: restore
    }, opts);

    /* cross module highlight: a pick row lights up when another component
       hovers that player, and this component lights theirs */
    if (Timeline && Timeline.onHighlight) {
      Timeline.onHighlight(function (key) {
        var rows = root.querySelectorAll('[data-player-key]');
        for (var i = 0; i < rows.length; i++) {
          var el = rows[i];
          var own = el.getAttribute('data-player-key');
          el.classList.toggle('is-hl', !!key && own === key);
        }
      });
    }

    render(committed, false);
    setTimeout(function () { root.classList.add('is-in'); }, 0);
  });
}());
