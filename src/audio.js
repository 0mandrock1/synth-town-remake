'use strict';

// ============================================================
// ST.Audio — AudioContext management, trigger, BPM
// ============================================================
ST.Audio = (function() {
  console.log('[Audio] initialized');

  let _ctx = null;
  let _masterGain = null;
  let _bpm = ST.Config.BPM_DEFAULT;

  // SR-A3: pre-allocated voice pool — no new nodes after init
  const _pool = [];

  // CA-A1: ambient city drone oscillator
  let _droneOsc  = null;
  let _droneGain = null;

  function _initPool() {
    for (let i = 0; i < ST.Config.MAX_VOICES; i++) {
      const osc    = _ctx.createOscillator();
      const filter = _ctx.createBiquadFilter();
      const env    = _ctx.createGain();
      const dSend  = _ctx.createGain();
      const rSend  = _ctx.createGain();

      filter.type = 'allpass';
      filter.frequency.value = 20000;
      env.gain.setValueAtTime(0, _ctx.currentTime);
      dSend.gain.setValueAtTime(0, _ctx.currentTime);
      rSend.gain.setValueAtTime(0, _ctx.currentTime);

      osc.connect(filter);
      filter.connect(env);
      env.connect(_masterGain);
      env.connect(dSend);
      env.connect(rSend);

      osc.start();
      _pool.push({ osc, filter, env, dSend, rSend, busyUntil: 0, sendsConnected: false });
    }
  }

  function _connectSends(slot) {
    if (slot.sendsConnected || !ST.Effects) return;
    const di = ST.Effects.getDelayInput();
    const ri = ST.Effects.getReverbInput();
    if (di) slot.dSend.connect(di);
    if (ri) slot.rSend.connect(ri);
    slot.sendsConnected = true;
  }

  return {
    onTrigger: null,

    init: function() {
      if (_ctx) return;
      _ctx = new (window.AudioContext || window.webkitAudioContext)();
      _masterGain = _ctx.createGain();
      _masterGain.gain.value = 0.8;
      _masterGain.connect(_ctx.destination);
      _initPool();
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

      // SR-A3: find idle slot or steal earliest-finishing
      let slot = null;
      let minBusy = Infinity;
      for (let i = 0; i < _pool.length; i++) {
        if (_pool[i].busyUntil <= now) { slot = _pool[i]; break; }
        if (_pool[i].busyUntil < minBusy) { minBusy = _pool[i].busyUntil; slot = _pool[i]; }
      }

      // Kill any running envelope on stolen slot
      slot.env.gain.cancelScheduledValues(now);
      slot.env.gain.setValueAtTime(0.0001, now);
      slot.dSend.gain.cancelScheduledValues(now);
      slot.dSend.gain.setValueAtTime(0, now);
      slot.rSend.gain.cancelScheduledValues(now);
      slot.rSend.gain.setValueAtTime(0, now);

      // QW-A1: allow scheduling to a future beat boundary
      const startTime = (params.startTime && params.startTime > now) ? params.startTime : now;

      // Set oscillator params
      slot.osc.type = waveform;
      slot.osc.frequency.cancelScheduledValues(now);
      slot.osc.frequency.setValueAtTime(pitch, startTime);

      // Set filter (allpass = bypass when no filter requested)
      slot.filter.type = filterType || 'allpass';
      slot.filter.frequency.value = filterCutoff || 20000;

      // Schedule amplitude envelope
      if (attack > 0) {
        slot.env.gain.setValueAtTime(0.001, startTime);
        slot.env.gain.linearRampToValueAtTime(0.4 * velocity, startTime + attack);
      } else {
        slot.env.gain.setValueAtTime(0.4 * velocity, startTime);
      }
      slot.env.gain.exponentialRampToValueAtTime(0.001, startTime + attack + decay);
      slot.env.gain.setValueAtTime(0, startTime + attack + decay + 0.05);

      // Wire sends lazily on first use
      _connectSends(slot);
      slot.dSend.gain.setValueAtTime(sendDelay,  startTime);
      slot.dSend.gain.setValueAtTime(0, startTime + attack + decay + 0.05);
      slot.rSend.gain.setValueAtTime(sendReverb, startTime);
      slot.rSend.gain.setValueAtTime(0, startTime + attack + decay + 0.05);

      slot.busyUntil = startTime + attack + decay + 0.1;

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
