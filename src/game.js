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

    // Building flash decay (belongs here, not in Vehicles.update)
    ST.Buildings.getAll().forEach(function(b) {
      if (b.flash > 0) b.flash = Math.max(0, b.flash - dt / 0.15);
    });

    _scoreTimer += dt;
    if (_scoreTimer >= 1.0) {
      _scoreTimer = 0;
      const scoreEl = document.getElementById('score-display');
      if (scoreEl) {
        const score = ST.Score.calculate();
        scoreEl.textContent = score + ' \u2014 ' + ST.Score.getThreshold().name;
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

    isPlaying: function() { return _playing; }
  };
})();

// ============================================================
// Boot — entry point
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
  ST.Game.init();
});
