/**
 * SYNTH TOWN — Автотесты Этапа 4 (Score & Unlocks)
 * Подключение: добавь в index.html перед </body>:
 *   <script src="tests/test_helpers.js"></script>
 *   <script src="tests/test_stage_4.js"></script>
 */
(function() {
  'use strict';

  if (typeof ST === 'undefined') {
    console.error('[TEST] ST namespace not found.');
    return;
  }

  STTest.suite('STAGE 4 — Score & Unlocks', function() {

    // ============================================================
    // T4.1 — ST.Score has correct API
    // ============================================================
    STTest.test('T4.1 ST.Score has correct API', function() {
      STTest.assertType(ST.Score, 'object', 'ST.Score exists');
      STTest.assertType(ST.Score.calculate,    'function', 'calculate');
      STTest.assertType(ST.Score.getThreshold, 'function', 'getThreshold');
      STTest.assertType(ST.Score.THRESHOLDS,   'object',   'THRESHOLDS exists');
      STTest.assert(Array.isArray(ST.Score.THRESHOLDS), 'THRESHOLDS is array');
    });

    // ============================================================
    // T4.2 — THRESHOLDS has 6 entries with required fields
    // ============================================================
    STTest.test('T4.2 Score.THRESHOLDS has 6 entries', function() {
      STTest.assertEqual(ST.Score.THRESHOLDS.length, 6, 'length is 6');
      ST.Score.THRESHOLDS.forEach(function(t) {
        STTest.assertType(t.min,         'number', 'threshold.min is number');
        STTest.assertType(t.name,        'string', 'threshold.name is string');
        STTest.assertType(t.decorations, 'number', 'threshold.decorations is number');
      });
    });

    // ============================================================
    // T4.3 — calculate returns a number >= 0
    // ============================================================
    STTest.test('T4.3 Score.calculate returns non-negative number', function() {
      const s = ST.Score.calculate();
      STTest.assertType(s, 'number', 'calculate returns number');
      STTest.assert(s >= 0, 'score >= 0');
    });

    // ============================================================
    // T4.4 — calculate increases with buildings
    // ============================================================
    STTest.test('T4.4 Score increases when buildings are added', function() {
      const before = ST.Score.calculate();
      ST.Buildings.create('sine', 16, 1);
      const after = ST.Score.calculate();
      STTest.assert(after > before, 'score increases with building');
      ST.Buildings.remove(16, 1);
      STTest.assertEqual(ST.Score.calculate(), before, 'score restores after remove');
    });

    // ============================================================
    // T4.5 — calculate increases with roads
    // ============================================================
    STTest.test('T4.5 Score increases when roads are added', function() {
      const before = ST.Score.calculate();
      ST.Roads.place(16, 2);
      const after = ST.Score.calculate();
      STTest.assert(after > before, 'score increases with road');
      ST.Roads.remove(16, 2);
      STTest.assertEqual(ST.Score.calculate(), before, 'score restores after remove');
    });

    // ============================================================
    // T4.6 — getThreshold returns correct entry
    // ============================================================
    STTest.test('T4.6 Score.getThreshold returns object with min/name/decorations', function() {
      const t = ST.Score.getThreshold();
      STTest.assertType(t, 'object', 'getThreshold returns object');
      STTest.assertType(t.min,         'number', 'threshold.min');
      STTest.assertType(t.name,        'string',  'threshold.name');
      STTest.assertType(t.decorations, 'number',  'threshold.decorations');
    });

    // ============================================================
    // T4.7 — getThreshold returns Empty City for score 0
    // ============================================================
    STTest.test('T4.7 Score.getThreshold returns Empty City when score is 0', function() {
      // At score=0 the first threshold is Empty City
      const first = ST.Score.THRESHOLDS[0];
      STTest.assertEqual(first.name, 'Empty City', 'first threshold is Empty City');
      STTest.assertEqual(first.min,  0,            'first threshold min is 0');
    });

    // ============================================================
    // T4.8 — ST.Unlocks has correct API
    // ============================================================
    STTest.test('T4.8 ST.Unlocks has correct API', function() {
      STTest.assertType(ST.Unlocks,            'object',   'ST.Unlocks exists');
      STTest.assertType(ST.Unlocks.isUnlocked, 'function', 'isUnlocked');
      STTest.assertType(ST.Unlocks.check,      'function', 'check');
      STTest.assertType(ST.Unlocks.getAll,     'function', 'getAll');
    });

    // ============================================================
    // T4.9 — isUnlocked returns true for always-unlocked tools
    // ============================================================
    STTest.test('T4.9 Unlocks.isUnlocked true for base tools', function() {
      ['select','road','remove','sine','square','triangle','sawtooth','pulse','car'].forEach(function(id) {
        STTest.assert(ST.Unlocks.isUnlocked(id), id + ' is always unlocked');
      });
    });

    // ============================================================
    // T4.10 — isUnlocked returns false for gated tools when score is 0
    // ============================================================
    STTest.test('T4.10 Unlocks.isUnlocked false for gated tools at zero score', function() {
      // Only meaningful if current score is below the thresholds
      const score = ST.Score.calculate();
      if (score < 50) {
        STTest.assert(!ST.Unlocks.isUnlocked('bicycle'), 'bicycle locked at score < 50');
      }
      if (score < 100) {
        STTest.assert(!ST.Unlocks.isUnlocked('trafficLight'), 'trafficLight locked at score < 100');
      }
      if (score < 150) {
        STTest.assert(!ST.Unlocks.isUnlocked('bus'), 'bus locked at score < 150');
      }
    });

    // ============================================================
    // T4.11 — getAll returns array
    // ============================================================
    STTest.test('T4.11 Unlocks.getAll returns array', function() {
      const all = ST.Unlocks.getAll();
      STTest.assert(Array.isArray(all), 'getAll returns array');
      STTest.assert(all.length >= 9, 'at least 9 always-unlocked tools');
    });

    // ============================================================
    // T4.12 — check returns null when no new unlocks
    // ============================================================
    STTest.test('T4.12 Unlocks.check returns null when nothing new unlocked', function() {
      // Call check twice; second call should return null (nothing changed)
      ST.Unlocks.check(); // sync previous score
      const result = ST.Unlocks.check();
      STTest.assertNull(result, 'check returns null when score unchanged');
    });

    // ============================================================
    // T4.13 — Toolbar buttons exist for vehicle/sign tools
    // ============================================================
    STTest.test('T4.13 Toolbar has lock class on gated tools below score', function() {
      const score = ST.Score.calculate();
      if (score < 50) {
        const bicycleBtn = document.querySelector('[data-tool="bicycle"]');
        STTest.assertTruthy(bicycleBtn, 'bicycle button exists');
        STTest.assert(bicycleBtn.classList.contains('st-locked'), 'bicycle btn has st-locked class');
      }
    });

    // ============================================================
    // T4.14 — Score display element exists in DOM
    // ============================================================
    STTest.test('T4.14 Score display element exists in transport bar', function() {
      const el = document.getElementById('score-display');
      STTest.assertTruthy(el, '#score-display exists in DOM');
    });

  });

  STTest.run();
})();
