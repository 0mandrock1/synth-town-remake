'use strict';

// ============================================================
// ST.Renderer — canvas setup and full-frame redraw
// ============================================================
ST.Renderer = (function() {
  console.log('[Renderer] initialized');

  let _canvas = null;
  let _ctx    = null;

  function _drawDecorations(ctx) {
    const deco = ST.Score.getThreshold().decorations;
    if (deco === 0) return;
    const { TILE } = ST.Config;
    ST.Grid.forEachTile(function(tile, x, y) {
      if (tile.type !== 'empty') return;
      if ((x * 7 + y * 13) % 31 >= deco * 2) return;
      const cx = x * TILE + TILE / 2;
      const cy = y * TILE + TILE * 0.75;
      ctx.fillStyle = '#2d5a27';
      ctx.fillRect(cx - 1, cy - 2, 2, 7);
      ctx.fillStyle = '#4caf50';
      ctx.beginPath();
      ctx.arc(cx, cy - 8, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#388e3c';
      ctx.beginPath();
      ctx.arc(cx - 2, cy - 12, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx + 2, cy - 11, 3, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function _drawHoverPreview(ctx) {
    const hover = ST.UI.getHoverTile();
    if (!hover || !ST.Grid.isInBounds(hover.x, hover.y)) return;
    const tool = ST.UI.getTool();
    if (tool === 'select') return;
    const tile    = ST.Grid.getTile(hover.x, hover.y);
    const { TILE } = ST.Config;
    const px = hover.x * TILE;
    const py = hover.y * TILE;

    let valid = false;
    if      (tool === 'road'                   && tile && tile.type === 'empty') valid = true;
    else if (tool === 'remove'                  && tile && tile.type !== 'empty') valid = true;
    else if (ST.Buildings.TYPES[tool]           && tile && tile.type === 'empty') valid = true;
    else if (ST.Vehicles.TYPES[tool]            && tile && tile.type === 'road')  valid = true;
    else if (ST.Signs.TYPES[tool]               && tile && tile.type === 'road')  valid = true;

    const col = valid ? 'rgba(100,181,246,' : 'rgba(239,83,80,';
    ctx.fillStyle   = col + '0.15)';
    ctx.fillRect(px, py, TILE, TILE);
    ctx.strokeStyle = col + '0.55)';
    ctx.lineWidth   = 1.5;
    ctx.strokeRect(px + 0.75, py + 0.75, TILE - 1.5, TILE - 1.5);
  }

  function _drawGrid(ctx) {
    const { TILE, GRID_W, GRID_H, COLORS } = ST.Config;
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth   = 1;
    for (let x = 0; x <= GRID_W; x++) {
      ctx.beginPath();
      ctx.moveTo(x * TILE + 0.5, 0);
      ctx.lineTo(x * TILE + 0.5, GRID_H * TILE);
      ctx.stroke();
    }
    for (let y = 0; y <= GRID_H; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * TILE + 0.5);
      ctx.lineTo(GRID_W * TILE, y * TILE + 0.5);
      ctx.stroke();
    }
  }

  return {
    init: function(canvasElement) {
      _canvas = canvasElement;
      const dpr = window.devicePixelRatio || 1;
      const W   = ST.Config.GRID_W * ST.Config.TILE;
      const H   = ST.Config.GRID_H * ST.Config.TILE;
      _canvas.width        = W * dpr;
      _canvas.height       = H * dpr;
      _canvas.style.width  = W + 'px';
      _canvas.style.height = H + 'px';
      _ctx = _canvas.getContext('2d');
      _ctx.scale(dpr, dpr);
    },

    drawFrame: function() {
      const { GRID_W, GRID_H, TILE, COLORS } = ST.Config;
      _ctx.fillStyle = COLORS.bg;
      _ctx.fillRect(0, 0, GRID_W * TILE, GRID_H * TILE);

      ST.Grid.forEachTile(function(tile, x, y) {
        if (tile.type === 'road') ST.Roads.draw(_ctx, x, y, tile);
      });

      _drawDecorations(_ctx);

      ST.Grid.forEachTile(function(tile, x, y) {
        if (tile.sign) ST.Signs.draw(_ctx, x, y, tile.sign);
      });

      ST.Grid.forEachTile(function(tile, x, y) {
        if (tile.type === 'building' && tile.building) ST.Buildings.draw(_ctx, tile.building);
      });

      ST.Vehicles.draw(_ctx);
      _drawHoverPreview(_ctx);
      _drawGrid(_ctx);
    },

    // Public stub — reserved for future dirty-region optimisation.
    markDirty: function(x, y) {}  // eslint-disable-line no-unused-vars
  };
})();
