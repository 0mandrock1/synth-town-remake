'use strict';

// ============================================================
// ST.Audio — AudioContext management, trigger, BPM
// ============================================================
ST.Audio = (function() {
  console.log('[Audio] initialized');

  let _ctx = null;
  let _masterGain = null;
  let _bpm = ST.Config.BPM_DEFAULT;

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

      const osc = _ctx.createOscillator();
      const env = _ctx.createGain();
      osc.type = waveform;
      osc.frequency.value = pitch;

      if (attack > 0) {
        env.gain.setValueAtTime(0.001, now);
        env.gain.linearRampToValueAtTime(0.4 * velocity, now + attack);
      } else {
        env.gain.setValueAtTime(0.4 * velocity, now);
      }
      env.gain.exponentialRampToValueAtTime(0.001, now + attack + decay);

      _connectWithFilter(osc, env, filterType, filterCutoff);
      env.connect(_masterGain);
      _addSends(env, sendDelay, sendReverb);

      osc.start(now);
      osc.stop(now + attack + decay + 0.05);

      if (typeof ST.Audio.onTrigger === 'function') ST.Audio.onTrigger(params);
      if (ST.Config.DEV) console.log('[Audio] trigger:', waveform, pitch);
    },

    setBPM: function(bpm) {
      _bpm = Math.max(ST.Config.BPM_MIN, Math.min(ST.Config.BPM_MAX, bpm));
    },

    getBPM:        function() { return _bpm; },
    isReady:       function() { return _ctx !== null && _ctx.state !== 'suspended'; },
    getContext:    function() { return _ctx; },
    getMasterGain: function() { return _masterGain; }
  };
})();
