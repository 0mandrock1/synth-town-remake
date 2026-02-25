'use strict';

// ============================================================
// ST.Unlocks — score-gated feature unlocking
// ============================================================
ST.Unlocks = (function() {
  console.log('[Unlocks] initialized');

  const _ALWAYS = ['select','road','remove','sine','square','triangle','sawtooth','pulse','car'];
  const _GATED  = [
    { id: 'bicycle',      score: 50  },
    { id: 'trafficLight', score: 100 },
    { id: 'bus',          score: 150 },
    { id: 'oneWay',       score: 200 },
    { id: 'roundabout',   score: 300 }
  ];

  let _prevScore = 0;

  return {
    isUnlocked: function(id) {
      if (_ALWAYS.indexOf(id) !== -1) return true;
      const gated = _GATED.filter(function(g) { return g.id === id; })[0];
      if (!gated) return true;
      return ST.Score.calculate() >= gated.score;
    },

    check: function() {
      const score = ST.Score.calculate();
      const fresh = _GATED.filter(function(g) {
        return score >= g.score && _prevScore < g.score;
      });
      _prevScore = score;
      return fresh.length > 0 ? fresh.map(function(g) { return g.id; }) : null;
    },

    getAll: function() {
      const score = ST.Score.calculate();
      return _ALWAYS.concat(
        _GATED.filter(function(g) { return score >= g.score; })
              .map(function(g) { return g.id; })
      );
    }
  };
})();
