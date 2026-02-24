/**
 * SYNTH TOWN — Автотесты Этапа 3 (Vehicles & Signs)
 * Подключение: добавь в index.html перед </body>:
 *   <script src="tests/test_helpers.js"></script>
 *   <script src="tests/test_stage_3.js"></script>
 */
(function() {
  'use strict';

  if (typeof ST === 'undefined') {
    console.error('[TEST] ST namespace not found.');
    return;
  }

  STTest.suite('STAGE 3 — Vehicles & Signs', function() {

    // ============================================================
    // T3.1 — ST.Vehicles API
    // ============================================================
    STTest.test('T3.1 ST.Vehicles has correct API', function() {
      STTest.assertType(ST.Vehicles, 'object', 'ST.Vehicles exists');
      STTest.assertType(ST.Vehicles.TYPES,  'object',   'TYPES exists');
      STTest.assertType(ST.Vehicles.spawn,  'function', 'spawn');
      STTest.assertType(ST.Vehicles.remove, 'function', 'remove');
      STTest.assertType(ST.Vehicles.update, 'function', 'update');
      STTest.assertType(ST.Vehicles.draw,   'function', 'draw');
      STTest.assertType(ST.Vehicles.getAll, 'function', 'getAll');
      STTest.assertType(ST.Vehicles.count,  'function', 'count');
    });

    // ============================================================
    // T3.2 — TYPES has car, bicycle, bus
    // ============================================================
    STTest.test('T3.2 Vehicles.TYPES has car, bicycle, bus', function() {
      ['car', 'bicycle', 'bus'].forEach(function(t) {
        STTest.assertTruthy(ST.Vehicles.TYPES[t], 'TYPES.' + t + ' exists');
        STTest.assertType(ST.Vehicles.TYPES[t].decay,        'number', t + '.decay');
        STTest.assertType(ST.Vehicles.TYPES[t].velocityMult, 'number', t + '.velocityMult');
        STTest.assertType(ST.Vehicles.TYPES[t].color,        'string', t + '.color');
      });
    });

    // ============================================================
    // T3.3 — spawn creates vehicle on road tile
    // ============================================================
    STTest.test('T3.3 Vehicles.spawn creates vehicle on road tile', function() {
      ST.Roads.place(1, 1);
      const v = ST.Vehicles.spawn('car', 1, 1);
      STTest.assertTruthy(v, 'vehicle returned');
      STTest.assertEqual(v.type, 'car', 'type is car');
      STTest.assertEqual(v.x, 1, 'x = 1');
      STTest.assertEqual(v.y, 1, 'y = 1');
      STTest.assertType(v.progress, 'number', 'progress is number');
      STTest.assertType(v.dir,      'string', 'dir is string');
      STTest.assert(ST.Vehicles.count() >= 1, 'count >= 1');

      ST.Vehicles.remove(v);
      ST.Roads.remove(1, 1);
    });

    // ============================================================
    // T3.4 — spawn returns null on non-road tile
    // ============================================================
    STTest.test('T3.4 Vehicles.spawn returns null on non-road tile', function() {
      const v1 = ST.Vehicles.spawn('car', 0, 0);
      STTest.assertNull(v1, 'null on empty tile');

      ST.Buildings.create('sine', 2, 2);
      const v2 = ST.Vehicles.spawn('bicycle', 2, 2);
      STTest.assertNull(v2, 'null on building tile');
      ST.Buildings.remove(2, 2);

      const v3 = ST.Vehicles.spawn('bus', 0, 0);
      STTest.assertNull(v3, 'null for unknown type on empty tile');
    });

    // ============================================================
    // T3.5 — spawn respects MAX_VEHICLES
    // ============================================================
    STTest.test('T3.5 Vehicles.spawn respects MAX_VEHICLES limit', function() {
      const spawned = [];
      ST.Roads.place(15, 14);
      // Fill up to MAX_VEHICLES (or until spawn fails)
      for (let i = 0; i < ST.Config.MAX_VEHICLES + 1; i++) {
        const v = ST.Vehicles.spawn('car', 15, 14);
        if (v) spawned.push(v);
      }
      STTest.assert(spawned.length <= ST.Config.MAX_VEHICLES, 'cannot exceed MAX_VEHICLES');
      spawned.forEach(function(v) { ST.Vehicles.remove(v); });
      ST.Roads.remove(15, 14);
    });

    // ============================================================
    // T3.6 — remove removes vehicle
    // ============================================================
    STTest.test('T3.6 Vehicles.remove removes vehicle', function() {
      ST.Roads.place(3, 3);
      const before = ST.Vehicles.count();
      const v = ST.Vehicles.spawn('bicycle', 3, 3);
      STTest.assertEqual(ST.Vehicles.count(), before + 1, 'count +1');
      ST.Vehicles.remove(v);
      STTest.assertEqual(ST.Vehicles.count(), before, 'count back to original');
      ST.Roads.remove(3, 3);
    });

    // ============================================================
    // T3.7 — update advances vehicle progress
    // ============================================================
    STTest.test('T3.7 Vehicles.update advances vehicle progress', function() {
      ST.Roads.place(4, 4);
      ST.Roads.place(5, 4);
      const v = ST.Vehicles.spawn('car', 4, 4);
      STTest.assertTruthy(v, 'vehicle spawned');

      // If vehicle has a valid next tile, progress should advance
      if (v.nextX !== v.x || v.nextY !== v.y) {
        const progBefore = v.progress;
        ST.Vehicles.update(0.1);
        STTest.assert(v.progress !== progBefore || v.x !== 4 || v.y !== 4,
          'vehicle state changed after update');
      }

      ST.Vehicles.remove(v);
      ST.Roads.remove(4, 4);
      ST.Roads.remove(5, 4);
    });

    // ============================================================
    // T3.8 — vehicle triggers building on adjacent tile (flash)
    // ============================================================
    STTest.test('T3.8 Vehicle triggers building when passing adjacent tile', function() {
      // Setup: road (6,4)-(7,4), building at (7,3) (north of arrival tile)
      ST.Roads.place(6, 4);
      ST.Roads.place(7, 4);
      const b = ST.Buildings.create('sine', 7, 3);
      STTest.assertTruthy(b, 'building created');
      STTest.assertEqual(b.flash, 0, 'flash starts at 0');

      // Spawn car at (6,4) - should go east to (7,4)
      const v = ST.Vehicles.spawn('car', 6, 4);
      STTest.assertTruthy(v, 'vehicle spawned');

      if (v.nextX === 7 && v.nextY === 4) {
        // Update enough to arrive at (7,4): speed=2 tiles/sec, need progress>=1 → dt>=0.5
        ST.Vehicles.update(0.6);
        STTest.assert(b.flash > 0, 'building flash triggered when vehicle arrived');
      }

      ST.Vehicles.remove(v);
      ST.Buildings.remove(7, 3);
      ST.Roads.remove(6, 4);
      ST.Roads.remove(7, 4);
    });

    // ============================================================
    // T3.9 — ST.Signs API
    // ============================================================
    STTest.test('T3.9 ST.Signs has correct API', function() {
      STTest.assertType(ST.Signs, 'object', 'ST.Signs exists');
      STTest.assertType(ST.Signs.TYPES,    'object',   'TYPES exists');
      STTest.assertType(ST.Signs.place,    'function', 'place');
      STTest.assertType(ST.Signs.remove,   'function', 'remove');
      STTest.assertType(ST.Signs.evaluate, 'function', 'evaluate');
      STTest.assertType(ST.Signs.draw,     'function', 'draw');
    });

    // ============================================================
    // T3.10 — Signs.TYPES has required sign types
    // ============================================================
    STTest.test('T3.10 Signs.TYPES has trafficLight, oneWay, roundabout', function() {
      STTest.assertTruthy(ST.Signs.TYPES.trafficLight, 'trafficLight type exists');
      STTest.assertTruthy(ST.Signs.TYPES.oneWay,       'oneWay type exists');
      STTest.assertTruthy(ST.Signs.TYPES.roundabout,   'roundabout type exists');
    });

    // ============================================================
    // T3.11 — Signs.place on road tile
    // ============================================================
    STTest.test('T3.11 Signs.place returns true on road tile', function() {
      ST.Roads.place(8, 4);
      const ok = ST.Signs.place('trafficLight', 8, 4, {});
      STTest.assertEqual(ok, true, 'place returns true');
      const tile = ST.Grid.getTile(8, 4);
      STTest.assertTruthy(tile.sign, 'tile.sign is set');
      STTest.assertEqual(tile.sign.type, 'trafficLight', 'sign type correct');
      ST.Signs.remove(8, 4);
      ST.Roads.remove(8, 4);
    });

    // ============================================================
    // T3.12 — Signs.place returns false on non-road tile
    // ============================================================
    STTest.test('T3.12 Signs.place returns false on non-road tile', function() {
      const ok1 = ST.Signs.place('oneWay', 9, 9, {});
      STTest.assertEqual(ok1, false, 'false on empty tile');

      ST.Buildings.create('square', 10, 10);
      const ok2 = ST.Signs.place('trafficLight', 10, 10, {});
      STTest.assertEqual(ok2, false, 'false on building tile');
      ST.Buildings.remove(10, 10);
    });

    // ============================================================
    // T3.13 — Signs.remove clears sign
    // ============================================================
    STTest.test('T3.13 Signs.remove clears tile.sign', function() {
      ST.Roads.place(11, 4);
      ST.Signs.place('roundabout', 11, 4, {});
      STTest.assertTruthy(ST.Grid.getTile(11, 4).sign, 'sign set before remove');
      ST.Signs.remove(11, 4);
      STTest.assertNull(ST.Grid.getTile(11, 4).sign, 'sign null after remove');
      ST.Roads.remove(11, 4);
    });

    // ============================================================
    // T3.14 — Signs.evaluate returns correct result for oneWay
    // ============================================================
    STTest.test('T3.14 Signs.evaluate returns force for oneWay sign', function() {
      ST.Roads.place(12, 4);
      ST.Signs.place('oneWay', 12, 4, { dir: 'N' });
      const fakeVehicle = { type: 'car', dir: 'E', x: 12, y: 4 };
      const result = ST.Signs.evaluate(fakeVehicle, 12, 4);
      STTest.assertTruthy(result, 'evaluate returns result');
      STTest.assertEqual(result.action,    'force', 'action is force');
      STTest.assertEqual(result.direction, 'N',     'direction is N');
      ST.Signs.remove(12, 4);
      ST.Roads.remove(12, 4);
    });

    // ============================================================
    // T3.15 — Signs.evaluate returns null when no sign
    // ============================================================
    STTest.test('T3.15 Signs.evaluate returns null when no sign present', function() {
      ST.Roads.place(13, 4);
      const fakeVehicle = { type: 'car', dir: 'E', x: 13, y: 4 };
      const result = ST.Signs.evaluate(fakeVehicle, 13, 4);
      STTest.assertNull(result, 'null when no sign');
      ST.Roads.remove(13, 4);
    });

    // ============================================================
    // T3.16 — Toolbar has vehicle and sign buttons
    // ============================================================
    STTest.test('T3.16 Toolbar renders vehicle and sign buttons', function() {
      ['car', 'bicycle', 'bus'].forEach(function(t) {
        const btn = document.querySelector('[data-tool="' + t + '"]');
        STTest.assertTruthy(btn, 'button for vehicle "' + t + '" exists');
      });
      ['trafficLight', 'oneWay', 'roundabout'].forEach(function(t) {
        const btn = document.querySelector('[data-tool="' + t + '"]');
        STTest.assertTruthy(btn, 'button for sign "' + t + '" exists');
      });
    });

    // ============================================================
    // T3.17 — Flash animation decays over time
    // ============================================================
    STTest.test('T3.17 Building flash decays when Vehicles.update is called', function() {
      ST.Buildings.create('triangle', 14, 4);
      const b = ST.Buildings.getAt(14, 4);
      b.flash = 1.0;
      STTest.assertEqual(b.flash, 1.0, 'flash is 1.0 before update');
      ST.Vehicles.update(0.075); // half of 150ms decay
      STTest.assert(b.flash < 1.0, 'flash decays after update');
      STTest.assert(b.flash >= 0,  'flash >= 0');
      ST.Buildings.remove(14, 4);
    });

  });

  STTest.run();
})();
