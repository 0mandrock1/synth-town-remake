/**
 * SYNTH TOWN — Автотесты Этапа 7 (State & Share)
 * Подключение: добавь в index.html перед </body>:
 *   <script src="tests/test_helpers.js"></script>
 *   <script src="tests/test_stage_7.js"></script>
 */
(function() {
  'use strict';

  if (typeof ST === 'undefined') {
    console.error('[TEST] ST namespace not found.');
    return;
  }

  STTest.suite('STAGE 7 — State & Share', function() {

    // ============================================================
    // T7.1 — ST.State has correct API
    // ============================================================
    STTest.test('T7.1 ST.State has correct API', function() {
      STTest.assertType(ST.State,              'object',   'ST.State exists');
      STTest.assertType(ST.State.serialize,    'function', 'serialize');
      STTest.assertType(ST.State.deserialize,  'function', 'deserialize');
      STTest.assertType(ST.State.save,         'function', 'save');
      STTest.assertType(ST.State.load,         'function', 'load');
      STTest.assertType(ST.State.exportURL,    'function', 'exportURL');
      STTest.assertType(ST.State.importURL,    'function', 'importURL');
    });

    // ============================================================
    // T7.2 — serialize() returns a non-empty string
    // ============================================================
    STTest.test('T7.2 serialize() returns a non-empty string', function() {
      const s = ST.State.serialize();
      STTest.assertType(s, 'string', 'serialize returns string');
      STTest.assert(s.length > 0, 'serialized string is non-empty');
    });

    // ============================================================
    // T7.3 — Round-trip: serialize then deserialize restores state
    // ============================================================
    STTest.test('T7.3 serialize/deserialize round-trip', function() {
      // Set up a known state
      ST.Roads.place(10, 5);
      ST.Roads.place(11, 5);
      ST.Buildings.create('triangle', 10, 4);
      const roadsBefore = ST.Roads.count();
      const bldBefore   = ST.Buildings.count();

      const encoded = ST.State.serialize();
      STTest.assertType(encoded, 'string', 'serialize produces string');

      // Clear and restore
      ST.Buildings.remove(10, 4);
      ST.Roads.remove(11, 5);
      ST.Roads.remove(10, 5);
      STTest.assert(ST.Roads.count() < roadsBefore, 'state was cleared');

      const ok = ST.State.deserialize(encoded);
      STTest.assert(ok === true, 'deserialize returns true');
      STTest.assertEqual(ST.Roads.count(),     roadsBefore, 'roads restored');
      STTest.assertEqual(ST.Buildings.count(), bldBefore,   'buildings restored');

      // Clean up
      ST.Buildings.remove(10, 4);
      ST.Roads.remove(11, 5);
      ST.Roads.remove(10, 5);
    });

    // ============================================================
    // T7.4 — Pitch is preserved through round-trip
    // ============================================================
    STTest.test('T7.4 Building pitch preserved through round-trip', function() {
      ST.Roads.place(12, 7);
      const b = ST.Buildings.create('sine', 12, 6);
      STTest.assertTruthy(b, 'building created');
      ST.Buildings.setProperty(b, 'pitch', 329.63);

      const encoded = ST.State.serialize();
      ST.Buildings.remove(12, 6);
      ST.Roads.remove(12, 7);

      ST.State.deserialize(encoded);
      const restored = ST.Buildings.getAt(12, 6);
      STTest.assertTruthy(restored, 'building restored at (12,6)');
      STTest.assertInRange(restored.pitch, 329, 330, 'pitch preserved');

      ST.Buildings.remove(12, 6);
      ST.Roads.remove(12, 7);
    });

    // ============================================================
    // T7.5 — deserialize with garbage input returns false
    // ============================================================
    STTest.test('T7.5 deserialize with invalid data returns false', function() {
      STTest.assert(ST.State.deserialize('not-base64!!!') === false, 'garbage returns false');
      STTest.assert(ST.State.deserialize('') === false, 'empty string returns false');
      // Valid base64 but wrong version
      const bad = btoa(JSON.stringify({ v: 99, roads: [], buildings: [], signs: [], vehicles: [] }));
      STTest.assert(ST.State.deserialize(bad) === false, 'wrong version returns false');
    });

    // ============================================================
    // T7.6 — save/load with localStorage
    // ============================================================
    STTest.test('T7.6 save/load round-trip via localStorage', function() {
      const hasLS = (function() { try { localStorage.setItem('_t', '1'); localStorage.removeItem('_t'); return true; } catch(e) { return false; } })();
      if (!hasLS) { STTest.assert(true, 'localStorage unavailable — skipped'); return; }

      ST.Roads.place(14, 8);
      const b = ST.Buildings.create('square', 14, 7);
      STTest.assertTruthy(b, 'building for save test');
      const roadsCount = ST.Roads.count();
      const bldCount   = ST.Buildings.count();

      const saved = ST.State.save(0);
      STTest.assert(saved === true, 'save(0) returns true');

      // wipe state
      ST.Buildings.remove(14, 7);
      ST.Roads.remove(14, 8);

      const loaded = ST.State.load(0);
      STTest.assert(loaded === true, 'load(0) returns true');
      STTest.assertEqual(ST.Roads.count(),     roadsCount, 'roads count restored');
      STTest.assertEqual(ST.Buildings.count(), bldCount,   'buildings count restored');

      // clean up
      ST.Buildings.remove(14, 7);
      ST.Roads.remove(14, 8);
    });

    // ============================================================
    // T7.7 — load from empty slot returns false
    // ============================================================
    STTest.test('T7.7 load from non-existent slot returns false', function() {
      const hasLS = (function() { try { localStorage.setItem('_t', '1'); localStorage.removeItem('_t'); return true; } catch(e) { return false; } })();
      if (!hasLS) { STTest.assert(true, 'localStorage unavailable — skipped'); return; }
      localStorage.removeItem('synthtown_v1_slot_9');
      const result = ST.State.load(9);
      STTest.assert(result === false, 'load from empty slot returns false');
    });

    // ============================================================
    // T7.8 — exportURL writes non-empty hash
    // ============================================================
    STTest.test('T7.8 exportURL writes hash to location', function() {
      ST.State.exportURL();
      STTest.assert(location.hash.length > 1, 'location.hash set after exportURL');
      // Clean up
      location.hash = '';
    });

    // ============================================================
    // T7.9 — importURL reads the hash set by exportURL
    // ============================================================
    STTest.test('T7.9 importURL round-trip via location.hash', function() {
      ST.Roads.place(15, 9);
      ST.Buildings.create('sawtooth', 15, 8);
      const rc = ST.Roads.count();
      const bc = ST.Buildings.count();

      ST.State.exportURL();
      const hashSet = location.hash.length > 1;
      STTest.assert(hashSet, 'hash was set');

      ST.Buildings.remove(15, 8);
      ST.Roads.remove(15, 9);

      const ok = ST.State.importURL();
      STTest.assert(ok === true, 'importURL returns true');
      STTest.assertEqual(ST.Roads.count(),     rc, 'roads restored from URL');
      STTest.assertEqual(ST.Buildings.count(), bc, 'buildings restored from URL');

      // clean up
      ST.Buildings.remove(15, 8);
      ST.Roads.remove(15, 9);
      location.hash = '';
    });

    // ============================================================
    // T7.10 — importURL with no hash returns false
    // ============================================================
    STTest.test('T7.10 importURL with no hash returns false', function() {
      location.hash = '';
      const result = ST.State.importURL();
      STTest.assert(result === false, 'importURL with no hash returns false');
    });

    // ============================================================
    // T7.11 — BPM preserved through round-trip
    // ============================================================
    STTest.test('T7.11 BPM preserved through serialize/deserialize', function() {
      ST.Audio.setBPM(140);
      const encoded = ST.State.serialize();
      ST.Audio.setBPM(120);
      ST.State.deserialize(encoded);
      STTest.assertEqual(ST.Audio.getBPM(), 140, 'BPM restored to 140');
      ST.Audio.setBPM(120); // restore
    });

    // ============================================================
    // T7.12 — Effects preset preserved through round-trip
    // ============================================================
    STTest.test('T7.12 Effects preset preserved through round-trip', function() {
      ST.Effects.setPreset('echo');
      const encoded = ST.State.serialize();
      ST.Effects.setPreset('dry');
      ST.State.deserialize(encoded);
      STTest.assertEqual(ST.Effects.getPreset(), 'echo', 'preset restored to echo');
      ST.Effects.setPreset('dry'); // restore
    });

    // ============================================================
    // T7.13 — Save/Load/Share buttons exist in toolbar
    // ============================================================
    STTest.test('T7.13 Save/Load/Share buttons exist in toolbar', function() {
      const toolbar = document.getElementById('toolbar');
      STTest.assertTruthy(toolbar, '#toolbar exists');
      const btns = toolbar.querySelectorAll('.st-tool-btn');
      const labels = Array.from(btns).map(function(b) { return b.textContent.trim(); });
      STTest.assert(labels.indexOf('Save') !== -1,      'Save button in toolbar');
      STTest.assert(labels.indexOf('Load') !== -1,      'Load button in toolbar');
      STTest.assert(labels.some(function(l) { return l.includes('Share'); }), 'Share button in toolbar');
    });

    // ============================================================
    // T7.14 — All previous API contracts intact
    // ============================================================
    STTest.test('T7.14 Stage 1-6 contracts intact', function() {
      STTest.assertType(ST.Audio.trigger,       'function', 'Audio.trigger');
      STTest.assertType(ST.Grid.getTile,        'function', 'Grid.getTile');
      STTest.assertType(ST.Buildings.create,    'function', 'Buildings.create');
      STTest.assertType(ST.Roads.place,         'function', 'Roads.place');
      STTest.assertType(ST.Vehicles.spawn,      'function', 'Vehicles.spawn');
      STTest.assertType(ST.Signs.place,         'function', 'Signs.place');
      STTest.assertType(ST.Score.calculate,     'function', 'Score.calculate');
      STTest.assertType(ST.Unlocks.check,       'function', 'Unlocks.check');
      STTest.assertType(ST.Effects.init,        'function', 'Effects.init');
      STTest.assertType(ST.UI.getHoverTile,     'function', 'UI.getHoverTile');
      STTest.assertType(ST.UI.refreshToolbar,   'function', 'UI.refreshToolbar');
    });

  });

  STTest.run();
})();
