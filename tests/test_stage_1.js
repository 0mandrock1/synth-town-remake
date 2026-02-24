/**
 * SYNTH TOWN — Автотесты Этапа 1 (Фундамент)
 * Подключение: добавь в index.html перед </body>:
 *   <script src="tests/test_helpers.js"></script>
 *   <script src="tests/test_stage_1.js"></script>
 */
(function() {
  'use strict';

  // Дождаться инициализации
  if (typeof ST === 'undefined') {
    console.error('[TEST] ST namespace not found. Load test after main script.');
    return;
  }

  STTest.suite('STAGE 1 — Foundation', function() {

    // ============================================================
    // T1.1 — Namespace и Config
    // ============================================================
    STTest.test('T1.1 ST namespace and Config exist', function() {
      STTest.assertType(ST, 'object', 'ST exists');
      STTest.assertType(ST.Config, 'object', 'ST.Config exists');
      STTest.assertEqual(ST.Config.TILE, 32, 'TILE = 32');
      STTest.assertEqual(ST.Config.GRID_W, 20, 'GRID_W = 20');
      STTest.assertEqual(ST.Config.GRID_H, 15, 'GRID_H = 15');
      STTest.assertEqual(ST.Config.BPM_DEFAULT, 120, 'BPM_DEFAULT = 120');
      STTest.assertType(ST.Config.COLORS, 'object', 'COLORS object exists');
      STTest.assertType(ST.Config.COLORS.bg, 'string', 'bg color is string');
    });

    // ============================================================
    // T1.2 — Canvas существует
    // ============================================================
    STTest.test('T1.2 Canvas element exists with valid context', function() {
      const canvas = document.getElementById('game');
      STTest.assertTruthy(canvas, 'Canvas element found');
      STTest.assertTruthy(canvas.getContext('2d'), '2D context available');
      STTest.assert(canvas.width > 0, 'Canvas has width');
      STTest.assert(canvas.height > 0, 'Canvas has height');
    });

    // ============================================================
    // T1.3 — Grid инициализирована
    // ============================================================
    STTest.test('T1.3 Grid module initialized correctly', function() {
      STTest.assertType(ST.Grid, 'object', 'ST.Grid exists');
      STTest.assertType(ST.Grid.init, 'function', 'Grid.init is function');
      STTest.assertType(ST.Grid.getTile, 'function', 'Grid.getTile is function');
      STTest.assertType(ST.Grid.setTile, 'function', 'Grid.setTile is function');
      STTest.assertType(ST.Grid.getNeighbors, 'function', 'Grid.getNeighbors is function');
      STTest.assertType(ST.Grid.isInBounds, 'function', 'Grid.isInBounds is function');
      STTest.assertType(ST.Grid.forEachTile, 'function', 'Grid.forEachTile is function');

      // Тайлы существуют
      const tile = ST.Grid.getTile(0, 0);
      STTest.assertTruthy(tile, 'Tile at (0,0) exists');
      STTest.assertEqual(tile.type, 'empty', 'Default tile type is empty');

      // Bounds check
      STTest.assert(ST.Grid.isInBounds(0, 0), '(0,0) is in bounds');
      STTest.assert(ST.Grid.isInBounds(19, 14), '(19,14) is in bounds');
      STTest.assert(!ST.Grid.isInBounds(-1, 0), '(-1,0) is out of bounds');
      STTest.assert(!ST.Grid.isInBounds(20, 0), '(20,0) is out of bounds');
      STTest.assert(!ST.Grid.isInBounds(0, 15), '(0,15) is out of bounds');
    });

    // ============================================================
    // T1.4 — Grid.getNeighbors
    // ============================================================
    STTest.test('T1.4 Grid.getNeighbors returns correct neighbors', function() {
      // Центральный тайл — 4 соседа
      const n1 = ST.Grid.getNeighbors(10, 7);
      STTest.assertEqual(n1.length, 4, 'Center tile has 4 neighbors');

      // Угловой тайл — 2 соседа
      const n2 = ST.Grid.getNeighbors(0, 0);
      STTest.assertEqual(n2.length, 2, 'Corner tile has 2 neighbors');

      // Краевой тайл — 3 соседа
      const n3 = ST.Grid.getNeighbors(10, 0);
      STTest.assertEqual(n3.length, 3, 'Edge tile has 3 neighbors');

      // Каждый сосед имеет dir
      n1.forEach(function(nb) {
        STTest.assertTruthy(nb.dir, 'Neighbor has dir');
        STTest.assertTruthy(nb.tile, 'Neighbor has tile');
        STTest.assertType(nb.x, 'number', 'Neighbor has x');
        STTest.assertType(nb.y, 'number', 'Neighbor has y');
      });
    });

    // ============================================================
    // T1.5 — Grid.setTile и getTile roundtrip
    // ============================================================
    STTest.test('T1.5 Grid setTile/getTile roundtrip', function() {
      // Сохраним исходное состояние
      const before = ST.Grid.getTile(15, 10);
      STTest.assertEqual(before.type, 'empty', 'Tile starts empty');

      // Поставить road
      ST.Grid.setTile(15, 10, { type: 'road' });
      const after = ST.Grid.getTile(15, 10);
      STTest.assertEqual(after.type, 'road', 'Tile is now road');

      // Восстановить
      ST.Grid.setTile(15, 10, { type: 'empty', building: null });
    });

    // ============================================================
    // T1.6 — Grid.forEachTile
    // ============================================================
    STTest.test('T1.6 Grid.forEachTile visits all tiles', function() {
      let count = 0;
      ST.Grid.forEachTile(function(tile, x, y) {
        count++;
        STTest.assertTruthy(tile, 'Tile exists at ' + x + ',' + y);
      });
      STTest.assertEqual(count, 20 * 15, 'Visited 300 tiles');
    });

    // ============================================================
    // T1.7 — Audio module API
    // ============================================================
    STTest.test('T1.7 Audio module has correct API', function() {
      STTest.assertType(ST.Audio, 'object', 'ST.Audio exists');
      STTest.assertType(ST.Audio.init, 'function', 'Audio.init');
      STTest.assertType(ST.Audio.trigger, 'function', 'Audio.trigger');
      STTest.assertType(ST.Audio.setBPM, 'function', 'Audio.setBPM');
      STTest.assertType(ST.Audio.getBPM, 'function', 'Audio.getBPM');
      STTest.assertType(ST.Audio.isReady, 'function', 'Audio.isReady');
      STTest.assertType(ST.Audio.getContext, 'function', 'Audio.getContext');
    });

    // ============================================================
    // T1.8 — Audio BPM control
    // ============================================================
    STTest.test('T1.8 Audio BPM set/get and clamping', function() {
      const originalBPM = ST.Audio.getBPM();

      ST.Audio.setBPM(120);
      STTest.assertEqual(ST.Audio.getBPM(), 120, 'BPM set to 120');

      ST.Audio.setBPM(90);
      STTest.assertEqual(ST.Audio.getBPM(), 90, 'BPM set to 90');

      // Clamping
      ST.Audio.setBPM(10);
      STTest.assertEqual(ST.Audio.getBPM(), ST.Config.BPM_MIN, 'BPM clamped to min');

      ST.Audio.setBPM(999);
      STTest.assertEqual(ST.Audio.getBPM(), ST.Config.BPM_MAX, 'BPM clamped to max');

      // Restore
      ST.Audio.setBPM(originalBPM);
    });

    // ============================================================
    // T1.9 — Renderer API
    // ============================================================
    STTest.test('T1.9 Renderer module has correct API', function() {
      STTest.assertType(ST.Renderer, 'object', 'ST.Renderer exists');
      STTest.assertType(ST.Renderer.init, 'function', 'Renderer.init');
      STTest.assertType(ST.Renderer.drawFrame, 'function', 'Renderer.drawFrame');
      STTest.assertType(ST.Renderer.markDirty, 'function', 'Renderer.markDirty');
    });

    // ============================================================
    // T1.10 — Game module API
    // ============================================================
    STTest.test('T1.10 Game module has correct API', function() {
      STTest.assertType(ST.Game, 'object', 'ST.Game exists');
      STTest.assertType(ST.Game.init, 'function', 'Game.init');
      STTest.assertType(ST.Game.start, 'function', 'Game.start');
      STTest.assertType(ST.Game.stop, 'function', 'Game.stop');
      STTest.assertType(ST.Game.isPlaying, 'function', 'Game.isPlaying');
    });

    // ============================================================
    // T1.11 — Building placement on grid
    // ============================================================
    STTest.test('T1.11 Can place building on empty tile', function() {
      // Размести здание на (3,3)
      ST.Grid.setTile(3, 3, {
        type: 'building',
        building: { waveform: 'sine', pitch: 440, decay: 1.2, color: '#64b5f6' }
      });

      const tile = ST.Grid.getTile(3, 3);
      STTest.assertEqual(tile.type, 'building', 'Tile type is building');
      STTest.assertTruthy(tile.building, 'Building object exists');
      STTest.assertEqual(tile.building.waveform, 'sine', 'Waveform is sine');
      STTest.assertEqual(tile.building.pitch, 440, 'Pitch is 440');

      // Cleanup
      ST.Grid.setTile(3, 3, { type: 'empty', building: null });
    });

    // ============================================================
    // T1.12 — Road placement on grid
    // ============================================================
    STTest.test('T1.12 Can place road tiles', function() {
      for (let i = 5; i <= 9; i++) {
        ST.Grid.setTile(5, i, { type: 'road' });
      }

      for (let i = 5; i <= 9; i++) {
        STTest.assertEqual(ST.Grid.getTile(5, i).type, 'road', 'Road at 5,' + i);
      }

      // Cleanup
      for (let i = 5; i <= 9; i++) {
        ST.Grid.setTile(5, i, { type: 'empty', building: null });
      }
    });

    // ============================================================
    // T1.13 — UI elements exist
    // ============================================================
    STTest.test('T1.13 Transport UI elements exist', function() {
      const toolbar = document.getElementById('toolbar');
      const transport = document.getElementById('transport');

      STTest.assertTruthy(toolbar, '#toolbar exists');
      STTest.assertTruthy(transport, '#transport exists');

      // Play button
      const playBtn = document.getElementById('btn-play') ||
                      transport.querySelector('button');
      STTest.assertTruthy(playBtn, 'Play button exists');

      // BPM slider
      const bpmSlider = document.getElementById('slider-bpm') ||
                        transport.querySelector('input[type="range"]');
      STTest.assertTruthy(bpmSlider, 'BPM slider exists');
    });

    // ============================================================
    // T1.14 — Audio trigger fires without error (requires init)
    // ============================================================
    STTest.test('T1.14 Audio.trigger does not throw when not initialized', function() {
      // Trigger без init — не должен бросить ошибку
      try {
        ST.Audio.trigger({ waveform: 'sine', pitch: 440, decay: 0.5 });
      } catch(e) {
        STTest.assert(false, 'trigger threw: ' + e.message);
      }
    });

  });

  // Auto-run
  STTest.run();
})();
