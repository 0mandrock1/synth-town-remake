'use strict';

// ============================================================
// ST._UI.createOnboarding — 5-step musical first-run flow.
// Also exposes showToast for general-purpose feedback toasts.
// ============================================================
ST._UI = ST._UI || {};

/**
 * Displays a self-removing toast notification.
 * @param {string} msg
 * @param {number} [duration=3000] — matches CSS animation duration
 */
ST._UI.showToast = function(msg, duration) {
  const t = document.createElement('div');
  t.className = 'st-unlock-toast';
  // AC-U3: role=status + aria-live so screen readers announce toast messages
  t.setAttribute('role', 'status');
  t.setAttribute('aria-live', 'polite');
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(function() { if (t.parentNode) t.parentNode.removeChild(t); }, duration || 3000);
};

/**
 * Creates a 5-step musical onboarding controller.
 * Returns { advance(step), getStep(), onTrigger() }.
 */
ST._UI.createOnboarding = function() {
  let _step       = 0;
  let _triggered  = false; // true once a vehicle has triggered a building
  let _nudgeTimer = null;

  function _clearPulse() {
    document.querySelectorAll('.st-onboard-pulse').forEach(function(el) {
      el.classList.remove('st-onboard-pulse');
    });
  }

  function _pulse(selector) {
    const el = typeof selector === 'string'
      ? document.querySelector(selector) : selector;
    if (el) el.classList.add('st-onboard-pulse');
  }

  function _hint(text) {
    const el = document.getElementById('onboard-hint');
    if (!el) return;
    // AC-U3: ensure the element has the live-region role set once
    if (!el.getAttribute('role')) {
      el.setAttribute('role', 'status');
      el.setAttribute('aria-live', 'polite');
    }
    el.style.display = '';
    el.textContent   = text;
  }

  function _hideHint() {
    const el = document.getElementById('onboard-hint');
    if (el) el.style.display = 'none';
  }

  // Nudge if player has not heard the audio loop within 90 s of starting
  function _startNudgeTimer() {
    if (_nudgeTimer) clearTimeout(_nudgeTimer);
    _nudgeTimer = setTimeout(function() {
      if (_step < 4 && !_triggered) {
        ST._UI.showToast(
          'Tip: place a road next to a building, spawn a vehicle \u2014 then press \u25ba',
          5500);
      }
    }, 90000);
  }

  function advance(nextStep) {
    if (_step >= 5) return;
    _step = nextStep;
    _clearPulse();

    if (nextStep === 1) {
      _hint('1 \u00b7 Draw a road \u2014 vehicles travel along roads');
      _pulse('[data-tool="road"]');
      _startNudgeTimer();

    } else if (nextStep === 2) {
      _hint('2 \u00b7 Place a building \u2014 each shape makes a different sound');
      _pulse('[data-tool="sine"]');

    } else if (nextStep === 3) {
      _hint('3 \u00b7 Spawn a vehicle near your building, then press \u25ba to start');
      _pulse('#btn-play');

    } else if (nextStep === 4) {
      _hint('4 \u00b7 Listen \u2014 every vehicle pass triggers a note. You\u2019ve built a musical city!');
      if (_nudgeTimer) { clearTimeout(_nudgeTimer); _nudgeTimer = null; }
      setTimeout(function() { if (_step === 4) advance(5); }, 6000);

    } else if (nextStep === 5) {
      _hideHint();
      ST._UI.showToast(
        'Your city is alive \u266a Hover a building tool to preview its sound',
        4500);
    }
  }

  return {
    advance:  advance,
    getStep:  function() { return _step; },
    // Called by ST.Audio.onTrigger each time a vehicle triggers a building
    onTrigger: function() {
      _triggered = true;
      if (_step === 3) advance(4);
    }
  };
};
