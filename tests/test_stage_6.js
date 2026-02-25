/**
 * SYNTH TOWN — Автотесты Этапа 6 (UX Polish)
 * Подключение: добавь в index.html перед </body>:
 *   <script src="tests/test_helpers.js"></script>
 *   <script src="tests/test_stage_6.js"></script>
 */
(function() {
  'use strict';

  if (typeof ST === 'undefined') {
    console.error('[TEST] ST namespace not found.');
    return;
  }

  STTest.suite('STAGE 6 — UX Polish', function() {

    // ============================================================
    // T6.1 — ST.UI.getHoverTile exists and returns null initially
    // ============================================================
    STTest.test('T6.1 ST.UI.getHoverTile() exists and returns null initially', function() {
      STTest.assertType(ST.UI.getHoverTile, 'function', 'getHoverTile is a function');
      const h = ST.UI.getHoverTile();
      STTest.assert(h === null || (typeof h === 'object'), 'getHoverTile returns null or object');
    });

    // ============================================================
    // T6.2 — #onboard-hint element exists in toolbar
    // ============================================================
    STTest.test('T6.2 #onboard-hint element exists in toolbar', function() {
      const hint = document.getElementById('onboard-hint');
      STTest.assertTruthy(hint, '#onboard-hint exists');
      STTest.assert(
        document.getElementById('toolbar').contains(hint),
        '#onboard-hint is inside #toolbar'
      );
    });

    // ============================================================
    // T6.3 — Renderer.drawFrame() does not throw
    // ============================================================
    STTest.test('T6.3 Renderer.drawFrame() does not throw', function() {
      let threw = false;
      try { ST.Renderer.drawFrame(); } catch(e) { threw = true; }
      STTest.assert(!threw, 'drawFrame runs without error');
    });

    // ============================================================
    // T6.4 — Renderer.drawFrame() does not throw with score > 0
    // ============================================================
    STTest.test('T6.4 drawFrame does not throw when buildings/roads exist', function() {
      ST.Roads.place(1, 1);
      ST.Buildings.create('sine', 2, 1);
      let threw = false;
      try { ST.Renderer.drawFrame(); } catch(e) { threw = true; }
      STTest.assert(!threw, 'drawFrame ok with city content');
      ST.Buildings.remove(2, 1);
      ST.Roads.remove(1, 1);
    });

    // ============================================================
    // T6.5 — Decorations: threshold.decorations is a non-negative number
    // ============================================================
    STTest.test('T6.5 Score.getThreshold().decorations is a number >= 0', function() {
      const t = ST.Score.getThreshold();
      STTest.assertType(t.decorations, 'number', 'decorations is a number');
      STTest.assert(t.decorations >= 0, 'decorations >= 0');
    });

    // ============================================================
    // T6.6 — Effect preset buttons not affected by tool change
    // ============================================================
    STTest.test('T6.6 Effect preset active state survives tool change', function() {
      ST.Effects.setPreset('echo');
      const echoBtn = document.querySelector('[data-preset="echo"]');
      if (echoBtn) echoBtn.click();
      ST.UI.setTool('road');
      const btn = document.querySelector('[data-preset="echo"]');
      STTest.assertTruthy(btn, 'echo preset btn exists');
      STTest.assert(btn.classList.contains('st-active'), 'echo preset still active after tool change');
      ST.Effects.setPreset('dry');
      const dryBtn = document.querySelector('[data-preset="dry"]');
      if (dryBtn) dryBtn.click();
    });

    // ============================================================
    // T6.7 — Canvas cursor changes per tool
    // ============================================================
    STTest.test('T6.7 Canvas cursor is pointer for select, crosshair for others', function() {
      const canvas = document.getElementById('game');
      ST.UI.setTool('select');
      STTest.assertEqual(canvas.style.cursor, 'pointer', 'cursor is pointer for select');
      ST.UI.setTool('road');
      STTest.assertEqual(canvas.style.cursor, 'crosshair', 'cursor is crosshair for road');
    });

    // ============================================================
    // T6.8 — Placement gives immediate feedback (road and building)
    // ============================================================
    STTest.test('T6.8 Road and building placement works correctly', function() {
      const roadsBeforeR = ST.Roads.count();
      ST.Roads.place(3, 3);
      STTest.assertEqual(ST.Roads.count(), roadsBeforeR + 1, 'road placed at 3,3');

      const bldBefore = ST.Buildings.count();
      ST.Buildings.create('triangle', 4, 3);
      STTest.assertEqual(ST.Buildings.count(), bldBefore + 1, 'building placed at 4,3');

      ST.Buildings.remove(4, 3);
      ST.Roads.remove(3, 3);
    });

    // ============================================================
    // T6.9 — First-loop readiness: road + building + vehicle can coexist
    // ============================================================
    STTest.test('T6.9 First-loop: road, building, and vehicle can be placed', function() {
      ST.Roads.place(5, 5);
      ST.Roads.place(6, 5);
      const b = ST.Buildings.create('square', 5, 4);
      const v = ST.Vehicles.spawn('car', 5, 5);
      STTest.assertTruthy(b, 'building placed adjacent to road');
      STTest.assertTruthy(v, 'vehicle spawned on road');
      // Clean up
      ST.Vehicles.remove(v);
      ST.Buildings.remove(5, 4);
      ST.Roads.remove(6, 5);
      ST.Roads.remove(5, 5);
    });

    // ============================================================
    // T6.10 — All previous API contracts still intact
    // ============================================================
    STTest.test('T6.10 Stage 1-5 contracts still intact', function() {
      STTest.assertType(ST.Audio.trigger,    'function', 'Audio.trigger');
      STTest.assertType(ST.Grid.getTile,     'function', 'Grid.getTile');
      STTest.assertType(ST.Buildings.create, 'function', 'Buildings.create');
      STTest.assertType(ST.Roads.place,      'function', 'Roads.place');
      STTest.assertType(ST.Vehicles.spawn,   'function', 'Vehicles.spawn');
      STTest.assertType(ST.Signs.place,      'function', 'Signs.place');
      STTest.assertType(ST.Score.calculate,  'function', 'Score.calculate');
      STTest.assertType(ST.Unlocks.check,    'function', 'Unlocks.check');
      STTest.assertType(ST.Effects.init,     'function', 'Effects.init');
      STTest.assertType(ST.Effects.setPreset,'function', 'Effects.setPreset');
      STTest.assertType(ST.UI.getHoverTile,  'function', 'UI.getHoverTile');
    });

  });

  STTest.run();
})();
