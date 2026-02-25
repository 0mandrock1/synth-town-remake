'use strict';

// ============================================================
// ST.Effects — compressor, delay, reverb chain; effect presets
// ============================================================
ST.Effects = (function() {
  console.log('[Effects] initialized');

  let _compressor    = null;
  let _delay         = null;
  let _delayFeedback = null;
  let _delayInput    = null;
  let _reverb        = null;
  let _reverbInput   = null;
  let _sendDelay     = 0;
  let _sendReverb    = 0;
  let _preset        = 'dry';

  const PRESETS = {
    dry:   { sendDelay: 0,    sendReverb: 0   },
    room:  { sendDelay: 0,    sendReverb: 0.3 },
    echo:  { sendDelay: 0.4,  sendReverb: 0   },
    space: { sendDelay: 0.25, sendReverb: 0.5 }
  };

  function _createImpulse(ctx, dur, decay) {
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
      }
    }
    return buf;
  }

  return {
    init: function() {
      if (_compressor) return;
      const ctx    = ST.Audio.getContext();
      const master = ST.Audio.getMasterGain();
      if (!ctx || !master) return;

      master.disconnect();
      _compressor = ctx.createDynamicsCompressor();
      _compressor.threshold.value = -24;
      _compressor.ratio.value     = 4;
      _compressor.knee.value      = 6;
      _compressor.attack.value    = 0.003;
      _compressor.release.value   = 0.25;
      master.connect(_compressor);
      _compressor.connect(ctx.destination);

      _delayInput = ctx.createGain();
      _delay = ctx.createDelay(2.0);
      _delay.delayTime.value = 60 / ST.Audio.getBPM() / 2;
      _delayFeedback = ctx.createGain();
      _delayFeedback.gain.value = 0.4;
      _delayInput.connect(_delay);
      _delay.connect(_delayFeedback);
      _delayFeedback.connect(_delay);
      _delay.connect(master);

      _reverbInput = ctx.createGain();
      _reverb = ctx.createConvolver();
      _reverb.buffer = _createImpulse(ctx, 2.0, 3);
      _reverbInput.connect(_reverb);
      _reverb.connect(master);

      console.log('[Effects] audio chain ready');
    },

    getCompressor:  function() { return _compressor; },
    getDelay:       function() { return _delay; },
    getReverb:      function() { return _reverb; },
    getDelayInput:  function() { return _delayInput; },
    getReverbInput: function() { return _reverbInput; },
    getSendDelay:   function() { return _sendDelay; },
    getSendReverb:  function() { return _sendReverb; },
    getPreset:      function() { return _preset; },

    setDelayTime: function(seconds) {
      if (_delay) _delay.delayTime.value = Math.max(0, Math.min(2, seconds));
    },

    setDelayFeedback: function(value) {
      if (_delayFeedback) _delayFeedback.gain.value = Math.max(0, Math.min(0.8, value));
    },

    setPreset: function(name) {
      const p = PRESETS[name];
      if (!p) return;
      _preset     = name;
      _sendDelay  = p.sendDelay;
      _sendReverb = p.sendReverb;
    },

    PRESETS: PRESETS
  };
})();
