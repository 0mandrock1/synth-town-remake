'use strict';

// ============================================================
// ST.Audio — AudioContext management, trigger, BPM
// ============================================================
ST.Audio = (function() {
  console.log('[Audio] initialized');

  let _ctx = null;
  let _masterGain = null;
  let _bpm = ST.Config.BPM_DEFAULT;
  const _voices = []; // { osc, env, endTime } for voice stealing

  // CA-A1: ambient city drone oscillator
  let _droneOsc  = null;
  let _droneGain = null;

  function _connectWithFilter(osc, env, filterType, filterCutoff) {
    if (filterType && filterCutoff) {
      const filter = _ctx.createBiquadFilter();
      filter.type = filterType;
      filter.frequency.value = filterCutoff;
      osc.connect(filter);
      filter.connect(env);
    } else {
      osc.connect(env);
    }
  }

  function _addSends(env, sendDelay, sendReverb) {
    if (sendDelay > 0 && ST.Effects && ST.Effects.getDelayInput()) {
      const ds = _ctx.createGain();
      ds.gain.value = sendDelay;
      env.connect(ds);
      ds.connect(ST.Effects.getDelayInput());
    }
    if (sendReverb > 0 && ST.Effects && ST.Effects.getReverbInput()) {
      const rs = _ctx.createGain();
      rs.gain.value = sendReverb;
      env.connect(rs);
      rs.connect(ST.Effects.getReverbInput());
    }
  }

  return {
    onTrigger: null,

    init: function() {
      if (_ctx) return;
      _ctx = new (window.AudioContext || window.webkitAudioContext)();
      _masterGain = _ctx.createGain();
      _masterGain.gain.value = 0.8;
      _masterGain.connect(_ctx.destination);
      console.log('[Audio] AudioContext created, state:', _ctx.state);
    },

    trigger: function(params) {
      if (!_ctx || _ctx.state === 'suspended') return;
      const waveform     = params.waveform     || 'sine';
      const pitch        = params.pitch        || 440;
      const decay        = params.decay        || 0.5;
      const velocity     = params.velocity     !== undefined ? params.velocity  : 1.0;
      const attack       = params.attack       || 0;
      const filterType   = params.filterType   || null;
      const filterCutoff = params.filterCutoff || null;
      const sendDelay    = params.sendDelay    !== undefined
        ? params.sendDelay  : (ST.Effects ? ST.Effects.getSendDelay()  : 0);
      const sendReverb   = params.sendReverb   !== undefined
        ? params.sendReverb : (ST.Effects ? ST.Effects.getSendReverb() : 0);
      const now = _ctx.currentTime;

      // Stage 8: prune finished voices, then steal oldest if at limit
      for (let i = _voices.length - 1; i >= 0; i--) {
        if (_voices[i].endTime <= now) _voices.splice(i, 1);
      }
      if (_voices.length >= ST.Config.MAX_VOICES) {
        const victim = _voices.shift();
        victim.env.gain.cancelScheduledValues(now);
        victim.env.gain.setValueAtTime(0.001, now);
        victim.osc.stop(now + 0.01);
      }

      // QW-A1: allow scheduling to a future beat boundary
      const startTime = (params.startTime && params.startTime > now) ? params.startTime : now;

      const osc = _ctx.createOscillator();
      const env = _ctx.createGain();
      osc.type = waveform;
      osc.frequency.value = pitch;

      if (attack > 0) {
        env.gain.setValueAtTime(0.001, startTime);
        env.gain.linearRampToValueAtTime(0.4 * velocity, startTime + attack);
      } else {
        env.gain.setValueAtTime(0.4 * velocity, startTime);
      }
      env.gain.exponentialRampToValueAtTime(0.001, startTime + attack + decay);

      _connectWithFilter(osc, env, filterType, filterCutoff);
      env.connect(_masterGain);
      _addSends(env, sendDelay, sendReverb);

      osc.start(startTime);
      osc.stop(startTime + attack + decay + 0.05);
      _voices.push({ osc: osc, env: env, endTime: startTime + attack + decay + 0.1 });

      if (typeof ST.Audio.onTrigger === 'function') ST.Audio.onTrigger(params);
      if (ST.Config.DEV) console.log('[Audio] trigger:', waveform, pitch);
    },

    setBPM: function(bpm) {
      _bpm = Math.max(ST.Config.BPM_MIN, Math.min(ST.Config.BPM_MAX, bpm));
      // QW-A3: keep delay time in sync with BPM for rhythmic echo
      if (ST.Effects && ST.Effects.getDelay()) {
        ST.Effects.setDelayTime(60 / _bpm / 2);
      }
    },

    getBPM:        function() { return _bpm; },
    isReady:       function() { return _ctx !== null && _ctx.state !== 'suspended'; },
    getContext:    function() { return _ctx; },
    getMasterGain: function() { return _masterGain; },

    // CA-A1: update ambient drone level proportional to building count
    updateDrone: function(buildingCount) {
      if (!_ctx || _ctx.state === 'suspended') return;
      if (buildingCount === 0) {
        if (_droneGain) _droneGain.gain.setTargetAtTime(0, _ctx.currentTime, 0.8);
        return;
      }
      if (!_droneOsc) {
        _droneOsc  = _ctx.createOscillator();
        _droneGain = _ctx.createGain();
        _droneOsc.type = 'sine';
        _droneOsc.frequency.value = 65.41; // C2 — deep city hum
        _droneGain.gain.setValueAtTime(0, _ctx.currentTime);
        _droneOsc.connect(_droneGain);
        _droneGain.connect(_masterGain);
        _droneOsc.start();
      }
      const target = Math.min(buildingCount * 0.003, 0.04); // caps at ~13 buildings
      _droneGain.gain.setTargetAtTime(target, _ctx.currentTime, 1.5);
    }
  };
})();
