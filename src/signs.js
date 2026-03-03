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
    roundabout:   {},
    waypoint:     {},   // VR-M1: route sequencing marker — vehicles learn a loop
    speedUp:      {},   // VR-N2: 2× speed zone (green fast lane)
    slowDown:     {}    // VR-N2: 0.5× speed zone (orange brake zone)
  };

  const DIR_CLOCKWISE = { N:'E', E:'S', S:'W', W:'N' };

  // VR-V3: per-route colour for waypoint drawing (up to 3 concurrent routes)
  const ROUTE_COLORS = { A: '#ef5350', B: '#42a5f5', C: '#66bb6a' };

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

    // VR-M1: return the next available sequence number for a route (1-based)
    nextWaypointSeq: function(routeId) {
      let maxSeq = 0;
      ST.Grid.forEachTile(function(tile) {
        if (!tile.sign || tile.sign.type !== 'waypoint') return;
        const p = tile.sign.params || {};
        if (p.routeId === routeId && (p.seq || 0) > maxSeq) maxSeq = p.seq;
      });
      return maxSeq + 1;
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

      // waypoint / speedUp / slowDown are read directly by ST.Vehicles — no action here
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
        const ARROWS = { N:'\u2191', S:'\u2193', E:'\u2192', W:'\u2190' };
        const dir = (sign.params && sign.params.dir) || 'E';
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(ARROWS[dir] || '\u2192', cx, cy - TILE / 4);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';

      } else if (sign.type === 'roundabout') {
        ctx.strokeStyle = 'rgba(100,181,246,0.8)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cx, cy - TILE / 4, 5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.lineWidth = 1;

      } else if (sign.type === 'waypoint') {
        // VR-V3: coloured filled circle with route ID letter + seq number
        const p       = sign.params || {};
        const routeId = p.routeId || 'A';
        const seq     = p.seq || 1;
        const color   = ROUTE_COLORS[routeId] || '#ef5350';
        // outer ring
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cx, cy - TILE / 4, 7, 0, Math.PI * 2);
        ctx.stroke();
        // filled circle
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(cx, cy - TILE / 4, 5, 0, Math.PI * 2);
        ctx.fill();
        // seq label
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 6px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(seq > 9 ? seq : seq, cx, cy - TILE / 4);
        ctx.lineWidth = 1;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';

      } else if (sign.type === 'speedUp') {
        // VR-V4: green double-arrow fast lane
        ctx.fillStyle = '#66bb6a';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('\u21d1\u21d1', cx, cy - TILE / 4);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';

      } else if (sign.type === 'slowDown') {
        // VR-V5: orange double-arrow brake zone
        ctx.fillStyle = '#ffa726';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('\u21d3\u21d3', cx, cy - TILE / 4);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
      }
    }
  };
})();
