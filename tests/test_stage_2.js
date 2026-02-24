/**
 * SYNTH TOWN — Автотесты Этапа 2 (Buildings, Roads, UI)
 * Подключение: добавь в index.html перед </body>:
 *   <script src="tests/test_helpers.js"></script>
 *   <script src="tests/test_stage_2.js"></script>
 */
(function() {
  'use strict';

  if (typeof ST === 'undefined') {
    console.error('[TEST] ST namespace not found.');
    return;
  }

  STTest.suite('STAGE 2 — Buildings, Roads, UI', function() {

    // ============================================================
    // T2.1 — Buildings.TYPES has all 5 entries
    // ============================================================
    STTest.test('T2.1 Buildings.TYPES has all 5 types', function() {
      STTest.assertType(ST.Buildings, 'object', 'ST.Buildings exists');
      STTest.assertType(ST.Buildings.TYPES, 'object', 'TYPES exists');
      ['sine', 'square', 'triangle', 'sawtooth', 'pulse'].forEach(function(t) {
        STTest.assertTruthy(ST.Buildings.TYPES[t], 'TYPES.' + t + ' exists');
        STTest.assertType(ST.Buildings.TYPES[t].waveform,  'string', t + ' has waveform');
        STTest.assertType(ST.Buildings.TYPES[t].color,     'string', t + ' has color');
        STTest.assertType(ST.Buildings.TYPES[t].decay,     'number', t + ' has decay');
      });
    });

    // ============================================================
    // T2.2 — Buildings.create places on empty tile
    // ============================================================
    STTest.test('T2.2 Buildings.create places building on empty tile', function() {
      const b = ST.Buildings.create('sine', 2, 2);
      STTest.assertTruthy(b, 'building returned');
      STTest.assertEqual(b.type, 'sine', 'type is sine');
      STTest.assertEqual(b.x, 2, 'x = 2');
      STTest.assertEqual(b.y, 2, 'y = 2');
      STTest.assertType(b.pitch,    'number', 'pitch is number');
      STTest.assertType(b.decay,    'number', 'decay is number');
      STTest.assertType(b.waveform, 'string', 'waveform is string');
      STTest.assertEqual(b.level, 1, 'level starts at 1');

      const tile = ST.Grid.getTile(2, 2);
      STTest.assertEqual(tile.type, 'building', 'tile.type is building');
      STTest.assertEqual(tile.building, b, 'tile.building is the returned object');

      // cleanup
      ST.Buildings.remove(2, 2);
    });

    // ============================================================
    // T2.3 — Buildings.create returns null on occupied tile
    // ============================================================
    STTest.test('T2.3 Buildings.create returns null on occupied tile', function() {
      ST.Buildings.create('square', 3, 3);
      const b2 = ST.Buildings.create('triangle', 3, 3);
      STTest.assertNull(b2, 'second create returns null');
      ST.Buildings.remove(3, 3);

      // Also null on road tile
      ST.Roads.place(4, 4);
      const b3 = ST.Buildings.create('sine', 4, 4);
      STTest.assertNull(b3, 'returns null on road tile');
      ST.Roads.remove(4, 4);
    });

    // ============================================================
    // T2.4 — Buildings.getAt returns correct building
    // ============================================================
    STTest.test('T2.4 Buildings.getAt returns building or null', function() {
      const b = ST.Buildings.create('triangle', 5, 5);
      STTest.assertEqual(ST.Buildings.getAt(5, 5), b, 'getAt returns building');
      STTest.assertNull(ST.Buildings.getAt(6, 6), 'getAt returns null on empty tile');
      ST.Buildings.remove(5, 5);
    });

    // ============================================================
    // T2.5 — Buildings.remove clears tile
    // ============================================================
    STTest.test('T2.5 Buildings.remove clears tile and array', function() {
      const countBefore = ST.Buildings.count();
      ST.Buildings.create('sawtooth', 7, 7);
      STTest.assertEqual(ST.Buildings.count(), countBefore + 1, 'count increased');
      ST.Buildings.remove(7, 7);
      STTest.assertEqual(ST.Buildings.count(), countBefore, 'count back to original');
      STTest.assertEqual(ST.Grid.getTile(7, 7).type, 'empty', 'tile is empty after remove');
      STTest.assertNull(ST.Grid.getTile(7, 7).building, 'building is null after remove');
    });

    // ============================================================
    // T2.6 — Buildings.getProperties returns expected fields
    // ============================================================
    STTest.test('T2.6 Buildings.getProperties returns all required fields', function() {
      const b = ST.Buildings.create('pulse', 8, 8);
      const props = ST.Buildings.getProperties(b);
      STTest.assertType(props.pitch,    'number', 'props.pitch');
      STTest.assertType(props.decay,    'number', 'props.decay');
      STTest.assertType(props.waveform, 'string', 'props.waveform');
      STTest.assertType(props.color,    'string', 'props.color');
      STTest.assertType(props.level,    'number', 'props.level');
      ST.Buildings.remove(8, 8);
    });

    // ============================================================
    // T2.7 — Buildings.setProperty mutates building
    // ============================================================
    STTest.test('T2.7 Buildings.setProperty mutates building object', function() {
      const b = ST.Buildings.create('sine', 9, 9);
      const originalPitch = b.pitch;
      ST.Buildings.setProperty(b, 'pitch', 440);
      STTest.assertEqual(b.pitch, 440, 'pitch updated');
      STTest.assertEqual(ST.Grid.getTile(9, 9).building.pitch, 440, 'grid tile reflects change');
      ST.Buildings.setProperty(b, 'pitch', originalPitch);
      ST.Buildings.remove(9, 9);
    });

    // ============================================================
    // T2.8 — Buildings.count and getAll
    // ============================================================
    STTest.test('T2.8 Buildings.count and getAll work correctly', function() {
      const before = ST.Buildings.count();
      ST.Buildings.create('sine',     10, 2);
      ST.Buildings.create('square',   11, 2);
      ST.Buildings.create('triangle', 12, 2);
      STTest.assertEqual(ST.Buildings.count(), before + 3, 'count +3');
      const all = ST.Buildings.getAll();
      STTest.assert(all.length >= 3, 'getAll length >= 3');
      STTest.assert(Array.isArray(all), 'getAll returns array');
      ST.Buildings.remove(10, 2);
      ST.Buildings.remove(11, 2);
      ST.Buildings.remove(12, 2);
      STTest.assertEqual(ST.Buildings.count(), before, 'count back to original');
    });

    // ============================================================
    // T2.9 — Roads.place returns true on empty tile
    // ============================================================
    STTest.test('T2.9 Roads.place returns true on empty tile', function() {
      STTest.assertType(ST.Roads, 'object', 'ST.Roads exists');
      const ok = ST.Roads.place(1, 1);
      STTest.assertEqual(ok, true, 'place returns true');
      STTest.assertEqual(ST.Grid.getTile(1, 1).type, 'road', 'tile.type is road');
      ST.Roads.remove(1, 1);
    });

    // ============================================================
    // T2.10 — Roads.place returns false on occupied tile
    // ============================================================
    STTest.test('T2.10 Roads.place returns false on non-empty tile', function() {
      ST.Buildings.create('sine', 13, 2);
      const ok = ST.Roads.place(13, 2);
      STTest.assertEqual(ok, false, 'returns false on building tile');
      ST.Buildings.remove(13, 2);

      ST.Roads.place(14, 2);
      const ok2 = ST.Roads.place(14, 2);
      STTest.assertEqual(ok2, false, 'returns false on existing road');
      ST.Roads.remove(14, 2);
    });

    // ============================================================
    // T2.11 — Roads.autoConnect sets roadDir
    // ============================================================
    STTest.test('T2.11 Roads.autoConnect updates roadDir for neighbors', function() {
      // Place a horizontal strip: (1,6), (2,6), (3,6)
      ST.Roads.place(1, 6);
      ST.Roads.place(2, 6);
      ST.Roads.place(3, 6);

      // Center tile should connect E and W
      const center = ST.Grid.getTile(2, 6);
      STTest.assert(center.roadDir.includes('E'), 'center has E');
      STTest.assert(center.roadDir.includes('W'), 'center has W');

      // Left end connects only E
      const left = ST.Grid.getTile(1, 6);
      STTest.assert(left.roadDir.includes('E'), 'left has E');
      STTest.assert(!left.roadDir.includes('W'), 'left has no W');

      // Right end connects only W
      const right = ST.Grid.getTile(3, 6);
      STTest.assert(right.roadDir.includes('W'), 'right has W');
      STTest.assert(!right.roadDir.includes('E'), 'right has no E');

      ST.Roads.remove(1, 6);
      ST.Roads.remove(2, 6);
      ST.Roads.remove(3, 6);
    });

    // ============================================================
    // T2.12 — Roads.getNextTile
    // ============================================================
    STTest.test('T2.12 Roads.getNextTile returns adjacent road or null', function() {
      ST.Roads.place(5, 6);
      ST.Roads.place(6, 6);

      const next = ST.Roads.getNextTile(5, 6, 'E');
      STTest.assertTruthy(next, 'next tile found going E');
      STTest.assertEqual(next.x, 6, 'next.x = 6');
      STTest.assertEqual(next.y, 6, 'next.y = 6');
      STTest.assertEqual(next.dir, 'E', 'next.dir = E');

      const dead = ST.Roads.getNextTile(6, 6, 'E');
      STTest.assertNull(dead, 'null when no road in direction');

      ST.Roads.remove(5, 6);
      ST.Roads.remove(6, 6);
    });

    // ============================================================
    // T2.13 — Roads.remove clears tile and updates neighbors
    // ============================================================
    STTest.test('T2.13 Roads.remove clears tile and updates neighbors', function() {
      ST.Roads.place(10, 6);
      ST.Roads.place(11, 6);
      ST.Roads.remove(10, 6);

      STTest.assertEqual(ST.Grid.getTile(10, 6).type, 'empty', 'removed tile is empty');
      // Neighbor (11,6) should no longer have W direction
      const neighbor = ST.Grid.getTile(11, 6);
      STTest.assert(!neighbor.roadDir.includes('W'), 'neighbor W removed after disconnect');
      ST.Roads.remove(11, 6);
    });

    // ============================================================
    // T2.14 — Roads.count tracks correctly
    // ============================================================
    STTest.test('T2.14 Roads.count tracks road count', function() {
      const before = ST.Roads.count();
      ST.Roads.place(1, 8);
      ST.Roads.place(2, 8);
      STTest.assertEqual(ST.Roads.count(), before + 2, 'count +2');
      ST.Roads.remove(1, 8);
      STTest.assertEqual(ST.Roads.count(), before + 1, 'count +1 after remove');
      ST.Roads.remove(2, 8);
      STTest.assertEqual(ST.Roads.count(), before, 'count back to original');
    });

    // ============================================================
    // T2.15 — ST.UI has all required API methods
    // ============================================================
    STTest.test('T2.15 ST.UI has correct API', function() {
      STTest.assertType(ST.UI, 'object', 'ST.UI exists');
      STTest.assertType(ST.UI.init,            'function', 'UI.init');
      STTest.assertType(ST.UI.setTool,         'function', 'UI.setTool');
      STTest.assertType(ST.UI.getTool,         'function', 'UI.getTool');
      STTest.assertType(ST.UI.showProperties,  'function', 'UI.showProperties');
      STTest.assertType(ST.UI.hideProperties,  'function', 'UI.hideProperties');
      STTest.assertType(ST.UI.updateTransport, 'function', 'UI.updateTransport');
    });

    // ============================================================
    // T2.16 — ST.UI.setTool / getTool
    // ============================================================
    STTest.test('T2.16 UI.setTool and getTool work correctly', function() {
      const original = ST.UI.getTool();
      STTest.assertType(original, 'string', 'getTool returns string');

      ST.UI.setTool('road');
      STTest.assertEqual(ST.UI.getTool(), 'road', 'tool set to road');

      ST.UI.setTool('select');
      STTest.assertEqual(ST.UI.getTool(), 'select', 'tool set to select');

      ST.UI.setTool('sine');
      STTest.assertEqual(ST.UI.getTool(), 'sine', 'tool set to sine');

      // restore
      ST.UI.setTool(original);
    });

    // ============================================================
    // T2.17 — Toolbar tool buttons exist in DOM
    // ============================================================
    STTest.test('T2.17 Toolbar renders tool buttons', function() {
      const btns = document.querySelectorAll('.st-tool-btn');
      STTest.assert(btns.length >= 8, 'at least 8 tool buttons rendered (3 tools + 5 buildings)');

      const tools = ['road', 'select', 'remove', 'sine', 'square', 'triangle', 'sawtooth', 'pulse'];
      tools.forEach(function(t) {
        const btn = document.querySelector('[data-tool="' + t + '"]');
        STTest.assertTruthy(btn, 'button for tool "' + t + '" exists');
      });
    });

  });

  STTest.run();
})();
