'use strict';

// ============================================================
// ST._UI.createCoachMarks — contextual tour popover system
// TT-3: six-step coach mark factory, persisted with localStorage
// ============================================================
ST._UI = ST._UI || {};

ST._UI.createCoachMarks = function() {
  const STEPS = [
    {
      targetId: null,
      title: 'Welcome to Synth Town',
      text: 'Your city is a synthesizer. Buildings make sounds, vehicles trigger them.',
      position: 'center'
    },
    {
      targetId: 'toolbar',
      title: 'Pick the Road Tool',
      text: 'Select Road and click the grid to lay roads. Vehicles drive on roads.',
      position: 'right'
    },
    {
      targetId: 'toolbar',
      title: 'Place a Building',
      text: 'Each building type plays a different waveform. Hover to preview the sound.',
      position: 'right'
    },
    {
      targetId: 'btn-play',
      title: 'Press Play',
      text: 'Vehicles will start moving and trigger nearby buildings \u2014 music emerges!',
      position: 'top'
    },
    {
      targetId: 'slider-bpm',
      title: 'Control the Tempo',
      text: 'Drag BPM to change the groove speed. Watch the beat-dot pulse in sync.',
      position: 'top'
    },
    {
      targetId: 'score-display',
      title: 'Grow Your City',
      text: 'Score rises as vehicles trigger buildings. Unlock new tools as you progress.',
      position: 'top'
    }
  ];

  let _step = 0;
  let _active = false;
  const _el = document.getElementById('st-coach');
  const _arrow = document.getElementById('st-coach-arrow');

  // Guard: if DOM not present, return no-op API
  if (!_el) {
    return { start: function() {}, isActive: function() { return false; }, advanceTo: function() {} };
  }

  function _position(step) {
    // TT-5: on mobile the toolbar is hidden — fall back to center
    const isMobile = window.innerWidth < 600;
    let s = step;
    if (isMobile && s.targetId === 'toolbar') {
      s = Object.assign({}, s, { targetId: null, position: 'center' });
    }

    if (!s.targetId || s.position === 'center') {
      _el.style.left = '50%';
      _el.style.top  = '40%';
      _el.style.transform = 'translate(-50%, -50%)';
      _arrow.style.display = 'none';
      return;
    }

    _el.style.transform = '';
    _arrow.style.display = 'block';
    _arrow.className = '';

    const target = document.getElementById(s.targetId);
    if (!target) return;
    const tr = target.getBoundingClientRect();
    const margin = 12;

    if (s.position === 'right') {
      _el.style.left = (tr.right + margin) + 'px';
      _el.style.top  = Math.max(8, tr.top) + 'px';
      _arrow.classList.add('st-arrow-left');
      _arrow.style.top    = '20px';
      _arrow.style.left   = '';
      _arrow.style.bottom = '';
      _arrow.style.right  = '';
    } else if (s.position === 'top') {
      const elW = _el.offsetWidth || 260;
      const cx  = tr.left + tr.width / 2;
      _el.style.left = Math.max(8, Math.min(window.innerWidth - elW - 8, cx - elW / 2)) + 'px';
      _el.style.top  = (tr.top - _el.offsetHeight - margin - 12) + 'px';
      _arrow.classList.add('st-arrow-bottom');
      _arrow.style.left   = (elW / 2 - 6) + 'px';
      _arrow.style.top    = '';
      _arrow.style.bottom = '';
      _arrow.style.right  = '';
    }
  }

  function _show(stepIdx) {
    const step = STEPS[stepIdx];
    if (!step) { _dismiss(); return; }
    document.getElementById('st-coach-step').textContent =
      'Step ' + (stepIdx + 1) + ' of ' + STEPS.length;
    document.getElementById('st-coach-title').textContent = step.title;
    document.getElementById('st-coach-text').textContent  = step.text;
    const nextBtn = document.getElementById('st-coach-next');
    nextBtn.textContent = stepIdx < STEPS.length - 1
      ? 'Got it (' + (stepIdx + 1) + '/' + STEPS.length + ')'
      : "Let's go!";
    _el.hidden = false;
    // Position after paint so offsetWidth/Height are accurate
    requestAnimationFrame(function() {
      _position(step);
      nextBtn.focus();
    });
  }

  function _dismiss() {
    _el.hidden = true;
    _active = false;
    document.removeEventListener('keydown', _onKeyDown);
    try { localStorage.setItem('st_tour_done', '1'); } catch(e) {}
  }

  function _onKeyDown(e) {
    if (e.key === 'Escape') _dismiss();
  }

  document.getElementById('st-coach-next').addEventListener('click', function() {
    _step++;
    if (_step >= STEPS.length) { _dismiss(); return; }
    _show(_step);
  });

  document.getElementById('st-coach-skip').addEventListener('click', _dismiss);

  return {
    start: function() {
      try { if (localStorage.getItem('st_tour_done')) return; } catch(e) {}
      _active = true;
      _step   = 0;
      document.addEventListener('keydown', _onKeyDown);
      _show(0);
    },
    isActive: function() { return _active; },
    /** Jump forward to the step with matching title (never go back). */
    advanceTo: function(stepTitle) {
      if (!_active) return;
      const idx = STEPS.findIndex(function(s) { return s.title === stepTitle; });
      if (idx !== -1 && idx > _step) {
        _step = idx;
        _show(_step);
      }
    }
  };
};
