'use strict';

// ============================================================
// ST.Grid — 2D tile map, bounds checking, neighbour queries
// ============================================================
ST.Grid = (function() {
  console.log('[Grid] initialized');

  let _tiles = null;

  function _makeTile() {
    return { type: 'empty', roadDir: null, building: null, sign: null };
  }

  return {
    init: function() {
      _tiles = [];
      for (let y = 0; y < ST.Config.GRID_H; y++) {
        _tiles[y] = [];
        for (let x = 0; x < ST.Config.GRID_W; x++) {
          _tiles[y][x] = _makeTile();
        }
      }
    },

    getTile: function(x, y) {
      if (!this.isInBounds(x, y)) return null;
      return _tiles[y][x];
    },

    setTile: function(x, y, data) {
      if (!this.isInBounds(x, y)) return;
      Object.assign(_tiles[y][x], data);
    },

    getNeighbors: function(x, y) {
      const DIRS = [
        { dx: 0, dy: -1, dir: 'N' },
        { dx: 0, dy: 1,  dir: 'S' },
        { dx: 1, dy: 0,  dir: 'E' },
        { dx: -1, dy: 0, dir: 'W' }
      ];
      const result = [];
      DIRS.forEach(function(d) {
        const nx = x + d.dx;
        const ny = y + d.dy;
        if (ST.Grid.isInBounds(nx, ny)) {
          result.push({ tile: _tiles[ny][nx], x: nx, y: ny, dir: d.dir });
        }
      });
      return result;
    },

    isInBounds: function(x, y) {
      return x >= 0 && x < ST.Config.GRID_W && y >= 0 && y < ST.Config.GRID_H;
    },

    forEachTile: function(callback) {
      for (let y = 0; y < ST.Config.GRID_H; y++) {
        for (let x = 0; x < ST.Config.GRID_W; x++) {
          callback(_tiles[y][x], x, y);
        }
      }
    }
  };
})();
