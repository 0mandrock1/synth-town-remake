'use strict';

// ============================================================
// ST._UI.createOnboarding — 4-step first-run onboarding flow.
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
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(function() { if (t.parentNode) t.parentNode.removeChild(t); }, duration || 3000);
};

/**
 * Creates an onboarding controller.
 * Returns { advance(step), getStep() }.
 */
ST._UI.createOnboarding = function() {
  let _step = 0;

  function _clearPulse() {
    document.querySelectorAll('.st-onboard-pulse').forEach(function(el) {
      el.classList.remove('st-onboard-pulse');
    });
  }

  function advance(nextStep) {
    if (_step >= 4) return;
    _step = nextStep;
    _clearPulse();

    const hint = document.getElementById('onboard-hint');
    if (!hint) return;

    if (nextStep === 1) {
      hint.style.display = '';
      hint.textContent = '1 \u00b7 Place a road tile';
      const b = document.querySelector('[data-tool="road"]');
      if (b) b.classList.add('st-onboard-pulse');

    } else if (nextStep === 2) {
      hint.textContent = '2 \u00b7 Place a building';
      const b = document.querySelector('[data-tool="sine"]');
      if (b) b.classList.add('st-onboard-pulse');

    } else if (nextStep === 3) {
      hint.textContent = '3 \u00b7 Place a vehicle & press \u25ba';
      const b = document.getElementById('btn-play');
      if (b) b.classList.add('st-onboard-pulse');

    } else if (nextStep === 4) {
      hint.style.display = 'none';
      ST._UI.showToast('Your city is alive \u266a', 3100);
    }
  }

  return {
    advance:  advance,
    getStep:  function() { return _step; }
  };
};
