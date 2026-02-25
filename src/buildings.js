'use strict';

// ============================================================
// ST.Buildings — building data, CRUD, and canvas drawing
// ============================================================
ST.Buildings = (function() {
  console.log('[Buildings] initialized');

  const TYPES = {
    sine:     { waveform: 'sine',     color: '#64b5f6', decay: 1.2,  pitchDefault: 261.63, widthRatio: 0.80, minH: 0.4, maxH: 1.5 },
    square:   { waveform: 'square',   color: '#ef5350', decay: 0.3,  pitchDefault: 196.00, widthRatio: 0.90, minH: 0.3, maxH: 1.2 },
    triangle: { waveform: 'triangle', color: '#66bb6a', decay: 0.8,  pitchDefault: 329.63, widthRatio: 0.60, minH: 0.6, maxH: 2.0 },
    sawtooth: { waveform: 'sawtooth', color: '#ffa726', decay: 0.5,  pitchDefault: 220.00, widthRatio: 0.90, minH: 0.4, maxH: 1.4 },
    pulse:    { waveform: 'square',   color: '#ab47bc', decay: 0.15, pitchDefault: 523.25, widthRatio: 0.30, minH: 0.8, maxH: 2.5 }
  };

  const _buildings = [];

  // --- shape-specific roof decorations ---

  function _drawSine(ctx, bx, by, bw, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(bx + bw / 2, by, bw / 2, Math.PI, 0);
    ctx.fill();
  }

  function _drawSquare(ctx, bx, by, bw, color) {
    ctx.fillStyle = color;
    const chimneyW = Math.max(3, Math.round(bw * 0.15));
    ctx.fillRect(bx + bw * 0.65, by - 7, chimneyW, 7);
  }

  function _drawTriangle(ctx, bx, by, bw, bh, color) {
    ctx.fillStyle = color;
    const spikeH = Math.round(bh * 0.55);
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(bx + bw / 2, by - spikeH);
    ctx.lineTo(bx + bw, by);
    ctx.fill();
  }

  function _drawSawtooth(ctx, bx, by, bw, color) {
    ctx.fillStyle = color;
    const stepW = Math.round(bw / 3);
    ctx.fillRect(bx,             by - 7, stepW, 7);
    ctx.fillRect(bx + stepW,     by - 4, stepW, 4);
    ctx.fillRect(bx + stepW * 2, by - 2, stepW, 2);
  }

  function _drawPulse(ctx, bx, by, bw, color) {
    const cx = bx + bw / 2;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx, by);
    ctx.lineTo(cx, by - 12);
    ctx.stroke();
    ctx.lineWidth = 1;
    ctx.fillStyle = 'rgba(171,71,188,0.5)';
    ctx.beginPath();
    ctx.arc(cx, by - 12, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  return {
    TYPES: TYPES,

    create: function(type, x, y) {
      const tile = ST.Grid.getTile(x, y);
      if (!tile || tile.type !== 'empty') return null;
      if (_buildings.length >= ST.Config.MAX_BUILDINGS) return null;
      const def = TYPES[type];
      if (!def) return null;
      const building = {
        type: type, x: x, y: y,
        waveform: def.waveform, color: def.color,
        pitch: def.pitchDefault, decay: def.decay, level: 1, flash: 0
      };
      _buildings.push(building);
      ST.Grid.setTile(x, y, { type: 'building', building: building });
      return building;
    },

    remove: function(x, y) {
      const tile = ST.Grid.getTile(x, y);
      if (!tile || tile.type !== 'building') return;
      const idx = _buildings.indexOf(tile.building);
      if (idx !== -1) _buildings.splice(idx, 1);
      ST.Grid.setTile(x, y, { type: 'empty', building: null });
    },

    draw: function(ctx, b) {
      const { TILE } = ST.Config;
      const def = TYPES[b.type];
      if (!def) return;
      const t  = (b.level - 1) / 7;
      const bw = Math.round(def.widthRatio * TILE);
      const bh = Math.round((def.minH + t * (def.maxH - def.minH)) * TILE);
      const bx = b.x * TILE + Math.round((TILE - bw) / 2);
      const by = b.y * TILE + TILE - 2;

      if (b.flash > 0) {
        ctx.save();
        ctx.shadowColor = b.color;
        ctx.shadowBlur  = 4 + b.flash * 16;
      }

      ctx.fillStyle = b.color;
      ctx.fillRect(bx, by - bh, bw, bh);

      if (b.type === 'sine')     _drawSine(ctx, bx, by - bh, bw, b.color);
      if (b.type === 'square')   _drawSquare(ctx, bx, by - bh, bw, b.color);
      if (b.type === 'triangle') _drawTriangle(ctx, bx, by - bh, bw, bh, b.color);
      if (b.type === 'sawtooth') _drawSawtooth(ctx, bx, by - bh, bw, b.color);
      if (b.type === 'pulse')    _drawPulse(ctx, bx, by - bh, bw, b.color);

      if (b.flash > 0) ctx.restore();
    },

    getAt: function(x, y) {
      const tile = ST.Grid.getTile(x, y);
      if (!tile || tile.type !== 'building') return null;
      return tile.building;
    },

    getProperties: function(b) {
      return { pitch: b.pitch, decay: b.decay, waveform: b.waveform, color: b.color, level: b.level };
    },

    setProperty: function(b, key, val) { b[key] = val; },

    count:  function() { return _buildings.length; },
    getAll: function() { return _buildings.slice(); }
  };
})();
