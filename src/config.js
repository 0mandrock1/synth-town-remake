'use strict';

// ============================================================
// ST.Config — global constants and configuration
// ============================================================
ST.Config = (function() {
  console.log('[Config] initialized');
  return {
    TILE: 32,
    GRID_W: 20,
    GRID_H: 15,
    BPM_DEFAULT: 120,
    BPM_MIN: 60,
    BPM_MAX: 180,
    MAX_VEHICLES: 8,
    MAX_VOICES: 8,
    MAX_BUILDINGS: 50,
    MAX_ROADS: 200,
    DEV: false,
    COLORS: {
      bg: '#0a0a12',
      grid: 'rgba(255,255,255,0.05)',
      road: '#1a1a2e',
      roadLine: 'rgba(255,255,255,0.4)',
      ui: '#12122a',
      border: 'rgba(255,255,255,0.1)',
      text: '#e0e0e0',
      accent: '#64b5f6'
    }
  };
})();
