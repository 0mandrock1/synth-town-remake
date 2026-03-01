'use strict';

// ============================================================
// ST.Game — game loop, play/stop control, score/unlock polling
// Also owns building flash decay (SRP: vehicles only move).
// ============================================================
ST.Game = (function() {
  console.log('[Game] initialized');

  let _playing    = false;
  let _rafId      = null;
  let _lastTime   = 0;
  let _frameCount = 0;
  let _fpsTimer   = 0;
  let _scoreTimer = 0;
  let _beatPhase  = 0;   // QW-A1: 0.0..1.0 within current beat
  let _lastTier   = null; // CLR-M4: track tier for auto-effect progression
  let _beatDot    = null; // QW-U4: beat pulse DOM element

  function _loop(timestamp) {
    const dt = Math.min((timestamp - _lastTime) / 1000, 0.1);
    _lastTime = timestamp;

    if (ST.Config.DEV) {
      _frameCount++;
      _fpsTimer += dt;
      if (_fpsTimer >= 1) {
        const fps = document.getElementById('fps-display');
        if (fps) fps.textContent = _frameCount + ' fps';
        _frameCount = 0;
        _fpsTimer   = 0;
      }
    }

    // QW-A1: advance beat phase for quantized scheduling
    if (_playing) {
      const beatsPerSec = ST.Audio.getBPM() / 60;
      const prevPhase = _beatPhase;
      _beatPhase = (_beatPhase + dt * beatsPerSec) % 1.0;
      // QW-U4: pulse the beat dot on each beat boundary crossing
      if (_beatDot && prevPhase > _beatPhase) {
        _beatDot.classList.add('st-pulse');
        setTimeout(function() { if (_beatDot) _beatDot.classList.remove('st-pulse'); }, 80);
      }
    }

    // Building flash decay + JD-U2 particle emit on first frame of flash
    ST.Buildings.getAll().forEach(function(b) {
      if (b.flash > 0) {
        if (b.flash >= 0.95 && ST.Renderer.emitParticles) {
          ST.Renderer.emitParticles(b.x, b.y, b.color, 5);
        }
        b.flash = Math.max(0, b.flash - dt / 0.15);
      }
      if (b.placementFlash > 0) b.placementFlash = Math.max(0, b.placementFlash - dt / 0.3);
    });

    if (ST.Renderer.updateParticles) ST.Renderer.updateParticles(dt);

    _scoreTimer += dt;
    if (_scoreTimer >= 1.0) {
      _scoreTimer = 0;
      const scoreEl = document.getElementById('score-display');
      if (scoreEl) {
        const score = ST.Score.calculate();
        const threshold = ST.Score.getThreshold();
        scoreEl.textContent = score + ' \u2014 ' + threshold.name;
        // CLR-M4: auto-apply audio preset on tier change (manual preset wins)
        if (_lastTier !== threshold.name) {
          _lastTier = threshold.name;
          if (ST.Effects.getCompressor()) {
            const tierPresets = {
              'First Beat':    'room',
              'Street Groove': 'echo',
              'City Rhythm':   'echo',
              'Urban Pulse':   'space',
              'Synth City':    'space'
            };
            const p = tierPresets[threshold.name];
            if (p) ST.Effects.setPresetAuto(p);
          }
        }
      }
      const newUnlocks = ST.Unlocks.check();
      if (newUnlocks) ST.UI.onUnlock(newUnlocks);
    }

    ST.Vehicles.update(dt);
    ST.Renderer.drawFrame();

    if (_playing) _rafId = requestAnimationFrame(_loop);
  }

  return {
    init: function() {
      ST.Grid.init();
      ST.Renderer.init(document.getElementById('game'));
      ST.UI.init();
      _beatDot = document.getElementById('beat-dot'); // QW-U4
      if (!ST.State.importURL()) {
        ST.Renderer.drawFrame();
      }
    },

    start: function() {
      if (_playing) return;
      _playing  = true;
      _lastTime = performance.now();
      _rafId    = requestAnimationFrame(_loop);
      ST.UI.updateTransport(ST.Audio.getBPM(), true);
    },

    stop: function() {
      if (!_playing) return;
      _playing = false;
      if (_rafId) { cancelAnimationFrame(_rafId); _rafId = null; }
      ST.Renderer.drawFrame();
      ST.UI.updateTransport(ST.Audio.getBPM(), false);
    },

    isPlaying:    function() { return _playing; },
    getBeatPhase: function() { return _beatPhase; }  // QW-A1
  };
})();

// ============================================================
// Boot — entry point
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
  ST.Game.init();
});
