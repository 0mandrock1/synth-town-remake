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
  let _bassDropFired = false; // FM-A2: fires only once on reaching Synth City

  // FM-A2: Bass Drop — fires once when player reaches Synth City tier (1000 pts)
  function _bassDrop() {
    if (_bassDropFired) return;
    _bassDropFired = true;

    const ctx = ST.Audio.getContext();
    if (!ctx || !ST.Audio.isReady()) return;

    // Pause vehicles briefly for dramatic effect
    ST.Vehicles.setSpeedMult(0);

    // Duck master gain to ~15% over 0.5s
    const master = ST.Audio.getMasterGain();
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setTargetAtTime(0.15, ctx.currentTime, 0.2);

    // Sub-bass sweep 40 → 80 Hz (temporary one-off osc, not from pool)
    const sweepOsc  = ctx.createOscillator();
    const sweepGain = ctx.createGain();
    sweepOsc.type = 'sine';
    sweepOsc.frequency.setValueAtTime(40, ctx.currentTime + 0.5);
    sweepOsc.frequency.linearRampToValueAtTime(80, ctx.currentTime + 2.5);
    sweepGain.gain.setValueAtTime(0, ctx.currentTime);
    sweepGain.gain.linearRampToValueAtTime(0.7, ctx.currentTime + 0.6);
    sweepGain.gain.setTargetAtTime(0, ctx.currentTime + 2.3, 0.25);
    sweepOsc.connect(sweepGain);
    sweepGain.connect(master);
    sweepOsc.start(ctx.currentTime + 0.5);
    sweepOsc.stop(ctx.currentTime + 3.2);

    // Return master gain to full after 2s
    master.gain.setTargetAtTime(0.8, ctx.currentTime + 2.0, 0.25);

    // Resume vehicles at double speed for 4s, then normal
    setTimeout(function() {
      ST.Vehicles.setSpeedMult(2.0);
      setTimeout(function() { ST.Vehicles.setSpeedMult(1.0); }, 4000);
    }, 500);

    // Heavy shake
    if (ST.Renderer.markShake) ST.Renderer.markShake(5.0);

    // Toast + score flash
    if (ST._UI) ST._UI.showToast('\uD83D\uDD0A Synth City \u2014 Bass Drop!', 5500);
    const scoreEl = document.getElementById('score-display');
    if (scoreEl) {
      scoreEl.classList.add('st-tier-flash');
      setTimeout(function() { scoreEl.classList.remove('st-tier-flash'); }, 1400);
    }
  }

  // JD-U4: ascending arpeggio + golden flash on score tier change
  function _celebrateTierUp(name) {
    if (name === 'Synth City') {
      _bassDrop();
      return;
    }
    if (ST.Audio.isReady()) {
      [261.63, 329.63, 392.00].forEach(function(hz, i) {
        setTimeout(function() {
          ST.Audio.trigger({ waveform: 'sine', pitch: hz,
            attack: 0.02, decay: 0.35, velocity: 0.5, sendReverb: 0.3 });
        }, i * 110);
      });
    }
    if (ST.Renderer.markShake) ST.Renderer.markShake(1.5);
    const scoreEl = document.getElementById('score-display');
    if (scoreEl) {
      scoreEl.classList.add('st-tier-flash');
      setTimeout(function() { scoreEl.classList.remove('st-tier-flash'); }, 1400);
    }
    if (ST._UI) ST._UI.showToast('\u2605 ' + name, 3500);
  }

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
        // CLR-M4 + JD-U4: on tier change — celebrate and auto-apply audio preset
        if (_lastTier !== threshold.name) {
          const isFirstLoad = _lastTier === null;
          _lastTier = threshold.name;
          if (!isFirstLoad) _celebrateTierUp(threshold.name);
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
          // FM-A1: unlock chord mode button at Urban Pulse+
          const chordTiers = ['Urban Pulse', 'Synth City'];
          const chordBtn = document.getElementById('btn-chord');
          if (chordBtn && chordTiers.indexOf(threshold.name) !== -1) {
            chordBtn.classList.remove('st-locked');
          }
        }
      }
      // CA-A1: update ambient drone volume
      if (ST.Audio.updateDrone) ST.Audio.updateDrone(ST.Buildings.count());
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
