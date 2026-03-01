'use strict';

// ============================================================
// ST.Renderer — canvas setup and full-frame redraw
// ============================================================
ST.Renderer = (function() {
  console.log('[Renderer] initialized');

  let _canvas = null;
  let _ctx    = null;

  // JD-U1: screen shake state
  let _shake = 0;

  // JD-U2: lightweight particle system
  const _particles = [];

  // AC-U1: beat grid playhead overlay
  let _gridOverlay = false;

  // MM-M2: harmonic district detection (updated every 60 frames)
  let _frameCounter = 0;
  const _harmonicDistricts = [];

  function _emitParticles(px, py, color, count) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 20 + Math.random() * 30;
      _particles.push({
        x: px, y: py, color: color,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.0, size: 2 + Math.random() * 2
      });
    }
  }

  function _updateParticles(dt) {
    for (let i = _particles.length - 1; i >= 0; i--) {
      const p = _particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt * 2.5;
      if (p.life <= 0) _particles.splice(i, 1);
    }
  }

  function _drawParticles(ctx) {
    if (_particles.length === 0) return;
    _particles.forEach(function(p) {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    });
    ctx.globalAlpha = 1.0;
  }

  // MM-M2: scan grid for 3×3 regions with 2+ harmonic pairs
  function _detectHarmonicDistricts() {
    _harmonicDistricts.length = 0;
    const { GRID_W, GRID_H } = ST.Config;
    for (let ax = 0; ax <= GRID_W - 3; ax++) {
      for (let ay = 0; ay <= GRID_H - 3; ay++) {
        const group = [];
        for (let dx = 0; dx < 3; dx++) {
          for (let dy = 0; dy < 3; dy++) {
            const b = ST.Buildings.getAt(ax + dx, ay + dy);
            if (b) group.push(b);
          }
        }
        if (group.length < 3) continue;
        let harmonicPairs = 0;
        for (let i = 0; i < group.length; i++) {
          for (let j = i + 1; j < group.length; j++) {
            let r = group[i].pitch > group[j].pitch
              ? group[i].pitch / group[j].pitch
              : group[j].pitch / group[i].pitch;
            while (r > 2.0) r /= 2;
            if (Math.abs(r - 2.0) < 0.06 || Math.abs(r - 1.0) < 0.06) harmonicPairs++;
            else if (Math.abs(r - 1.5) < 0.06) harmonicPairs++;
          }
        }
        if (harmonicPairs >= 2) {
          _harmonicDistricts.push({ x1: ax, y1: ay, x2: ax + 2, y2: ay + 2 });
        }
      }
    }
  }

  function _drawHarmonicDistricts(ctx) {
    if (_harmonicDistricts.length === 0) return;
    const { TILE } = ST.Config;
    ctx.save();
    ctx.strokeStyle = 'rgba(255,215,64,0.6)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 3]);
    ctx.shadowColor = '#ffd740';
    ctx.shadowBlur  = 10;
    _harmonicDistricts.forEach(function(d) {
      ctx.strokeRect(
        d.x1 * TILE - 2, d.y1 * TILE - 2,
        (d.x2 - d.x1 + 1) * TILE + 4,
        (d.y2 - d.y1 + 1) * TILE + 4
      );
    });
    ctx.setLineDash([]);
    ctx.restore();
  }

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

  // AC-U1: sweep a vertical playhead line across the canvas each beat
  function _drawBeatGrid(ctx) {
    if (!_gridOverlay) return;
    if (!ST.Game || !ST.Game.getBeatPhase) return;
    const { TILE, GRID_W, GRID_H } = ST.Config;
    const phase  = ST.Game.getBeatPhase();
    const lineX  = Math.round(phase * GRID_W * TILE);
    ctx.save();
    ctx.strokeStyle = 'rgba(100,181,246,0.45)';
    ctx.lineWidth   = 2;
    ctx.shadowColor = '#64b5f6';
    ctx.shadowBlur  = 8;
    ctx.beginPath();
    ctx.moveTo(lineX, 0);
    ctx.lineTo(lineX, GRID_H * TILE);
    ctx.stroke();
    ctx.restore();
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

    // JD-U2: called from game loop to advance particle state
    updateParticles: function(dt) { _updateParticles(dt); },

    // JD-U2: emit particles at canvas pixel position (from building tile coords)
    emitParticles: function(tileX, tileY, color, count) {
      const { TILE } = ST.Config;
      _emitParticles(tileX * TILE + TILE / 2, tileY * TILE + TILE / 2, color, count);
    },

    // JD-U1: add screen shake
    markShake: function(intensity) { _shake = Math.min(8, _shake + intensity); },

    // AC-U1: beat grid overlay toggle
    setGridOverlay: function(on) { _gridOverlay = on; },
    isGridOverlay:  function() { return _gridOverlay; },

    drawFrame: function() {
      const { GRID_W, GRID_H, TILE, COLORS } = ST.Config;
      _ctx.fillStyle = COLORS.bg;
      _ctx.fillRect(0, 0, GRID_W * TILE, GRID_H * TILE);

      // MM-M2: update harmonic district detection every 60 frames
      _frameCounter++;
      if (_frameCounter % 60 === 0) _detectHarmonicDistricts();

      // JD-U1: apply shake offset for this frame
      _ctx.save();
      if (_shake > 0) {
        _ctx.translate(
          (Math.random() - 0.5) * _shake,
          (Math.random() - 0.5) * _shake
        );
        _shake = Math.max(0, _shake - 0.5);
      }

      ST.Grid.forEachTile(function(tile, x, y) {
        if (tile.type === 'road') ST.Roads.draw(_ctx, x, y, tile);
      });

      _drawDecorations(_ctx);
      _drawHarmonicDistricts(_ctx); // MM-M2: golden glow before buildings

      ST.Grid.forEachTile(function(tile, x, y) {
        if (tile.sign) ST.Signs.draw(_ctx, x, y, tile.sign);
      });

      ST.Grid.forEachTile(function(tile, x, y) {
        if (tile.type === 'building' && tile.building) ST.Buildings.draw(_ctx, tile.building);
      });

      ST.Vehicles.draw(_ctx);
      _drawParticles(_ctx);   // JD-U2
      _drawBeatGrid(_ctx);    // AC-U1: beat grid playhead line
      _drawHoverPreview(_ctx);
      _drawGrid(_ctx);

      _ctx.restore();
    },

    // Public stub — reserved for future dirty-region optimisation.
    markDirty: function(x, y) {}  // eslint-disable-line no-unused-vars
  };
})();
