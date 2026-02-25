/**
 * SYNTH TOWN — Автотесты Этапа 5 (Effects)
 * Подключение: добавь в index.html перед </body>:
 *   <script src="tests/test_helpers.js"></script>
 *   <script src="tests/test_stage_5.js"></script>
 */
(function() {
  'use strict';

  if (typeof ST === 'undefined') {
    console.error('[TEST] ST namespace not found.');
    return;
  }

  STTest.suite('STAGE 5 — Effects', function() {

    // ============================================================
    // T5.1 — ST.Effects has correct API
    // ============================================================
    STTest.test('T5.1 ST.Effects has correct API', function() {
      STTest.assertType(ST.Effects, 'object', 'ST.Effects exists');
      STTest.assertType(ST.Effects.init,             'function', 'init');
      STTest.assertType(ST.Effects.getCompressor,    'function', 'getCompressor');
      STTest.assertType(ST.Effects.getDelay,         'function', 'getDelay');
      STTest.assertType(ST.Effects.getReverb,        'function', 'getReverb');
      STTest.assertType(ST.Effects.setDelayTime,     'function', 'setDelayTime');
      STTest.assertType(ST.Effects.setDelayFeedback, 'function', 'setDelayFeedback');
      STTest.assertType(ST.Effects.setPreset,        'function', 'setPreset');
      STTest.assertType(ST.Effects.getPreset,        'function', 'getPreset');
      STTest.assertType(ST.Effects.getSendDelay,     'function', 'getSendDelay');
      STTest.assertType(ST.Effects.getSendReverb,    'function', 'getSendReverb');
    });

    // ============================================================
    // T5.2 — ST.Effects.PRESETS structure
    // ============================================================
    STTest.test('T5.2 ST.Effects.PRESETS has correct entries', function() {
      STTest.assertType(ST.Effects.PRESETS, 'object', 'PRESETS exists');
      ['dry', 'room', 'echo', 'space'].forEach(function(name) {
        const p = ST.Effects.PRESETS[name];
        STTest.assertTruthy(p, name + ' preset exists');
        STTest.assertType(p.sendDelay,  'number', name + '.sendDelay is number');
        STTest.assertType(p.sendReverb, 'number', name + '.sendReverb is number');
        STTest.assertInRange(p.sendDelay,  0, 1, name + '.sendDelay in 0..1');
        STTest.assertInRange(p.sendReverb, 0, 1, name + '.sendReverb in 0..1');
      });
    });

    // ============================================================
    // T5.3 — Default preset is 'dry'
    // ============================================================
    STTest.test('T5.3 Default preset is dry (sendDelay=0, sendReverb=0)', function() {
      STTest.assertEqual(ST.Effects.getPreset(), 'dry', 'default preset is dry');
      STTest.assertEqual(ST.Effects.getSendDelay(),  0, 'sendDelay is 0 for dry');
      STTest.assertEqual(ST.Effects.getSendReverb(), 0, 'sendReverb is 0 for dry');
    });

    // ============================================================
    // T5.4 — setPreset() updates send values
    // ============================================================
    STTest.test('T5.4 setPreset() updates sendDelay and sendReverb', function() {
      ST.Effects.setPreset('echo');
      STTest.assertEqual(ST.Effects.getPreset(),    'echo', 'preset is echo');
      STTest.assertEqual(ST.Effects.getSendDelay(),  0.4,   'echo sendDelay is 0.4');
      STTest.assertEqual(ST.Effects.getSendReverb(), 0,     'echo sendReverb is 0');

      ST.Effects.setPreset('room');
      STTest.assertEqual(ST.Effects.getPreset(),    'room', 'preset is room');
      STTest.assertEqual(ST.Effects.getSendDelay(),  0,     'room sendDelay is 0');
      STTest.assertEqual(ST.Effects.getSendReverb(), 0.3,   'room sendReverb is 0.3');

      ST.Effects.setPreset('dry');
      STTest.assertEqual(ST.Effects.getSendDelay(),  0, 'restored to dry');
      STTest.assertEqual(ST.Effects.getSendReverb(), 0, 'restored to dry');
    });

    // ============================================================
    // T5.5 — setPreset() ignores unknown names
    // ============================================================
    STTest.test('T5.5 setPreset() ignores unknown preset name', function() {
      ST.Effects.setPreset('dry');
      ST.Effects.setPreset('nonexistent');
      STTest.assertEqual(ST.Effects.getPreset(), 'dry', 'preset unchanged after bad name');
    });

    // ============================================================
    // T5.6 — setDelayTime/setDelayFeedback are no-ops before init
    // ============================================================
    STTest.test('T5.6 setDelayTime and setDelayFeedback do not throw before init', function() {
      let threw = false;
      try {
        ST.Effects.setDelayTime(0.5);
        ST.Effects.setDelayFeedback(0.3);
      } catch(e) {
        threw = true;
      }
      STTest.assert(!threw, 'no error before init');
    });

    // ============================================================
    // T5.7 — getCompressor/getDelay/getReverb return null before init
    // ============================================================
    STTest.test('T5.7 Effect nodes are null before init()', function() {
      // If AudioContext hasn't been started, nodes should be null
      if (!ST.Audio.isReady()) {
        STTest.assertNull(ST.Effects.getCompressor(), 'compressor null before init');
        STTest.assertNull(ST.Effects.getDelay(),      'delay null before init');
        STTest.assertNull(ST.Effects.getReverb(),     'reverb null before init');
      }
    });

    // ============================================================
    // T5.8 — ST.Audio.trigger() accepts new params without error
    // ============================================================
    STTest.test('T5.8 ST.Audio.trigger() accepts filterType/sendDelay/sendReverb', function() {
      // trigger is a no-op when AudioContext not ready, so just check no throw
      let threw = false;
      try {
        ST.Audio.trigger({
          waveform: 'sine', pitch: 440, decay: 0.3,
          filterType: 'lowpass', filterCutoff: 1000,
          sendDelay: 0.3, sendReverb: 0.2
        });
      } catch(e) {
        threw = true;
      }
      STTest.assert(!threw, 'trigger with new params does not throw');
    });

    // ============================================================
    // T5.9 — Effects preset buttons exist in toolbar
    // ============================================================
    STTest.test('T5.9 Effects preset buttons exist in toolbar', function() {
      ['dry', 'room', 'echo', 'space'].forEach(function(name) {
        const btn = document.querySelector('[data-preset="' + name + '"]');
        STTest.assertTruthy(btn, name + ' preset button exists in DOM');
      });
    });

    // ============================================================
    // T5.10 — Active preset button reflects current preset
    // ============================================================
    STTest.test('T5.10 Active preset button reflects current preset', function() {
      ST.Effects.setPreset('dry');
      const dryBtn = document.querySelector('[data-preset="dry"]');
      STTest.assertTruthy(dryBtn, 'dry button exists');
      STTest.assert(dryBtn.classList.contains('st-active'), 'dry button is active');

      const roomBtn = document.querySelector('[data-preset="room"]');
      if (roomBtn) {
        roomBtn.click();
        STTest.assertEqual(ST.Effects.getPreset(), 'room', 'preset changed to room on click');
        STTest.assert(roomBtn.classList.contains('st-active'), 'room btn active after click');
        STTest.assert(!dryBtn.classList.contains('st-active'), 'dry btn not active after change');
      }
      // restore
      ST.Effects.setPreset('dry');
    });

    // ============================================================
    // T5.11 — All previous stage APIs still intact
    // ============================================================
    STTest.test('T5.11 Stage 1-4 contracts still intact', function() {
      STTest.assertType(ST.Audio.trigger,    'function', 'Audio.trigger');
      STTest.assertType(ST.Audio.isReady,    'function', 'Audio.isReady');
      STTest.assertType(ST.Grid.getTile,     'function', 'Grid.getTile');
      STTest.assertType(ST.Buildings.create, 'function', 'Buildings.create');
      STTest.assertType(ST.Roads.place,      'function', 'Roads.place');
      STTest.assertType(ST.Vehicles.spawn,   'function', 'Vehicles.spawn');
      STTest.assertType(ST.Signs.place,      'function', 'Signs.place');
      STTest.assertType(ST.Score.calculate,  'function', 'Score.calculate');
      STTest.assertType(ST.Unlocks.check,    'function', 'Unlocks.check');
    });

  });

  STTest.run();
})();
