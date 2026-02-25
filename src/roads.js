'use strict';

// ============================================================
// ST.Roads — road placement, auto-connect, and canvas drawing
// ============================================================
ST.Roads = (function() {
  console.log('[Roads] initialized');

  const DIR_DELTA = { N:{dx:0,dy:-1}, S:{dx:0,dy:1}, E:{dx:1,dy:0}, W:{dx:-1,dy:0} };
  let _count = 0;

  function _recalcDir(x, y) {
    const tile = ST.Grid.getTile(x, y);
    if (!tile || tile.type !== 'road') return;
    let dir = '';
    ST.Grid.getNeighbors(x, y).forEach(function(nb) {
      if (nb.tile.type === 'road') dir += nb.dir;
    });
    ST.Grid.setTile(x, y, { roadDir: dir });
  }

  return {
    place: function(x, y) {
      const tile = ST.Grid.getTile(x, y);
      if (!tile || tile.type !== 'empty') return false;
      if (_count >= ST.Config.MAX_ROADS) return false;
      ST.Grid.setTile(x, y, { type: 'road', roadDir: '' });
      _count++;
      this.autoConnect(x, y);
      return true;
    },

    remove: function(x, y) {
      const tile = ST.Grid.getTile(x, y);
      if (!tile || tile.type !== 'road') return;
      ST.Grid.setTile(x, y, { type: 'empty', roadDir: null, building: null, sign: null });
      _count--;
      ST.Grid.getNeighbors(x, y).forEach(function(nb) {
        if (nb.tile.type === 'road') _recalcDir(nb.x, nb.y);
      });
    },

    autoConnect: function(x, y) {
      _recalcDir(x, y);
      ST.Grid.getNeighbors(x, y).forEach(function(nb) {
        if (nb.tile.type === 'road') _recalcDir(nb.x, nb.y);
      });
    },

    getNextTile: function(x, y, dir) {
      const d = DIR_DELTA[dir];
      if (!d) return null;
      const nx = x + d.dx;
      const ny = y + d.dy;
      const tile = ST.Grid.getTile(nx, ny);
      if (!tile || tile.type !== 'road') return null;
      return { x: nx, y: ny, dir: dir };
    },

    draw: function(ctx, x, y, tile) {
      const { TILE, COLORS } = ST.Config;
      const px = x * TILE;
      const py = y * TILE;
      ctx.fillStyle = COLORS.road;
      ctx.fillRect(px, py, TILE, TILE);

      const dir      = tile.roadDir || '';
      const hasN     = dir.includes('N');
      const hasS     = dir.includes('S');
      const hasE     = dir.includes('E');
      const hasW     = dir.includes('W');
      const isolated = !hasN && !hasS && !hasE && !hasW;
      const cx = px + TILE / 2;
      const cy = py + TILE / 2;

      ctx.strokeStyle = COLORS.roadLine;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);

      if (hasN || hasS || isolated) {
        ctx.beginPath();
        ctx.moveTo(cx, hasN ? py : cy);
        ctx.lineTo(cx, hasS ? py + TILE : cy);
        ctx.stroke();
      }
      if (hasE || hasW || isolated) {
        ctx.beginPath();
        ctx.moveTo(hasW ? px : cx, cy);
        ctx.lineTo(hasE ? px + TILE : cx, cy);
        ctx.stroke();
      }
      ctx.setLineDash([]);
    },

    count: function() { return _count; }
  };
})();
