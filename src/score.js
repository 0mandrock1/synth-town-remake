'use strict';

// ============================================================
// ST.Score — score calculation and city tier thresholds
// ============================================================
ST.Score = (function() {
  console.log('[Score] initialized');

  const THRESHOLDS = [
    { min: 0,    name: 'Empty City',    decorations: 0 },
    { min: 50,   name: 'First Beat',    decorations: 1 },
    { min: 150,  name: 'Street Groove', decorations: 2 },
    { min: 300,  name: 'City Rhythm',   decorations: 3 },
    { min: 600,  name: 'Urban Pulse',   decorations: 4 },
    { min: 1000, name: 'Synth City',    decorations: 5 }
  ];

  return {
    THRESHOLDS: THRESHOLDS,

    calculate: function() {
      const buildings = ST.Buildings.getAll();
      const types     = new Set(buildings.map(function(b) { return b.type; }));
      let signCount   = 0;
      ST.Grid.forEachTile(function(tile) { if (tile.sign) signCount++; });
      return buildings.length * 10 + ST.Roads.count() * 2 +
             ST.Vehicles.count() * 15 + types.size * 20 + signCount * 10;
    },

    getThreshold: function() {
      const score = this.calculate();
      let current = THRESHOLDS[0];
      THRESHOLDS.forEach(function(t) { if (score >= t.min) current = t; });
      return current;
    }
  };
})();
