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
      // SR-A2: use cached sign count instead of iterating the whole grid
      const signCount = ST.Signs.count ? ST.Signs.count() : 0;

      // CLR-M1: harmony bonus — reward harmonically adjacent buildings
      let harmonyBonus = 0;
      for (let i = 0; i < buildings.length; i++) {
        for (let j = i + 1; j < buildings.length; j++) {
          const b1 = buildings[i]; const b2 = buildings[j];
          if (Math.abs(b1.x - b2.x) + Math.abs(b1.y - b2.y) > 2) continue;
          let r = b1.pitch > b2.pitch ? b1.pitch / b2.pitch : b2.pitch / b1.pitch;
          while (r > 2.0) r /= 2;
          if (Math.abs(r - 2.0) < 0.05 || Math.abs(r - 1.0) < 0.05) harmonyBonus += 15;
          else if (Math.abs(r - 1.5) < 0.05)  harmonyBonus += 10;
          else if (Math.abs(r - 4 / 3) < 0.05) harmonyBonus += 8;
          else if (Math.abs(r - 5 / 4) < 0.05) harmonyBonus += 5;
        }
      }

      return buildings.length * 10 + ST.Roads.count() * 2 +
             ST.Vehicles.count() * 15 + types.size * 20 + signCount * 10 +
             Math.min(harmonyBonus, 200);
    },

    getThreshold: function() {
      const score = this.calculate();
      let current = THRESHOLDS[0];
      THRESHOLDS.forEach(function(t) { if (score >= t.min) current = t; });
      return current;
    }
  };
})();
