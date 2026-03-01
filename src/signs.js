'use strict';

// ============================================================
// ST.Signs — sign placement, traffic logic, and canvas drawing
// ============================================================
ST.Signs = (function() {
  console.log('[Signs] initialized');

  let _signCount = 0; // SR-A2: cached counter for O(1) score calculation

  const TYPES = {
    trafficLight: { period: 2.0 },
    oneWay:       { defaultDir: 'E' },
    roundabout:   {}
  };

  const DIR_CLOCKWISE = { N:'E', E:'S', S:'W', W:'N' };

  return {
    TYPES: TYPES,

    place: function(type, x, y, params) {
      const tile = ST.Grid.getTile(x, y);
      if (!tile || tile.type !== 'road') return false;
      if (!TYPES[type]) return false;
      const hadSign = !!tile.sign;
      const sign = { type: type, x: x, y: y, params: params || {} };
      ST.Grid.setTile(x, y, { sign: sign });
      if (!hadSign) _signCount++;
      return true;
    },

    remove: function(x, y) {
      const tile = ST.Grid.getTile(x, y);
      if (tile && tile.sign) _signCount--;
      ST.Grid.setTile(x, y, { sign: null });
    },

    evaluate: function(vehicle, x, y) {
      const tile = ST.Grid.getTile(x, y);
      if (!tile || !tile.sign) return null;
      const sign = tile.sign;

      if (sign.type === 'trafficLight') {
        const period = TYPES.trafficLight.period;
        const phase  = Math.floor(Date.now() / (period * 1000)) % 2;
        if (phase === 0) return { action: 'stop', duration: period };
        return null;
      }

      if (sign.type === 'oneWay') {
        const dir = (sign.params && sign.params.dir) || TYPES.oneWay.defaultDir;
        return { action: 'force', direction: dir };
      }

      if (sign.type === 'roundabout') {
        return { action: 'force', direction: DIR_CLOCKWISE[vehicle.dir] || vehicle.dir };
      }

      return null;
    },

    count: function() { return _signCount; }, // SR-A2

    draw: function(ctx, x, y, sign) {
      const { TILE } = ST.Config;
      const px = x * TILE;
      const py = y * TILE;
      const cx = px + TILE / 2;
      const cy = py + TILE / 2;

      if (sign.type === 'trafficLight') {
        const isRed = Math.floor(Date.now() / (TYPES.trafficLight.period * 1000)) % 2 === 0;
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(cx - 5, cy - TILE / 3 - 5, 10, 10);
        ctx.fillStyle = isRed ? '#ef5350' : '#66bb6a';
        ctx.beginPath();
        ctx.arc(cx, cy - TILE / 3, 3.5, 0, Math.PI * 2);
        ctx.fill();

      } else if (sign.type === 'oneWay') {
        const ARROWS = { N:'↑', S:'↓', E:'→', W:'←' };
        const dir = (sign.params && sign.params.dir) || 'E';
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(ARROWS[dir] || '→', cx, cy - TILE / 4);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';

      } else if (sign.type === 'roundabout') {
        ctx.strokeStyle = 'rgba(100,181,246,0.8)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cx, cy - TILE / 4, 5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.lineWidth = 1;
      }
    }
  };
})();
