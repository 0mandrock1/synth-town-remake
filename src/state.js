'use strict';

// ============================================================
// ST.State — serialize/deserialize city state; save/load slots;
//            URL hash export/import
// ============================================================
ST.State = (function() {
  console.log('[State] initialized');

  const STATE_VERSION = 1;
  const SLOT_PREFIX   = 'synthtown_v1_slot_';

  function _buildSnapshot() {
    const roads     = [];
    const buildings = [];
    const signs     = [];
    ST.Grid.forEachTile(function(tile, x, y) {
      if (tile.type === 'road') {
        roads.push([x, y]);
        if (tile.sign) {
          signs.push({ type: tile.sign.type, x: x, y: y, params: tile.sign.params || {} });
        }
      }
      if (tile.type === 'building' && tile.building) {
        const b = tile.building;
        buildings.push({ type: b.type, x: x, y: y, pitch: b.pitch, level: b.level });
      }
    });
    const vehicles = ST.Vehicles.getAll().map(function(v) {
      return { type: v.type, x: v.x, y: v.y };
    });
    return {
      v:         STATE_VERSION,
      bpm:       ST.Audio.getBPM(),
      preset:    ST.Effects.getPreset(),
      roads:     roads,
      buildings: buildings,
      signs:     signs,
      vehicles:  vehicles
    };
  }

  function _applySnapshot(data) {
    if (!data || data.v !== STATE_VERSION) return false;

    if (ST.Game.isPlaying()) ST.Game.stop();

    // Clear vehicles first (safe to iterate over a copy)
    ST.Vehicles.getAll().forEach(function(v) { ST.Vehicles.remove(v); });

    // Clear grid (buildings before roads to avoid orphan references)
    ST.Grid.forEachTile(function(tile, x, y) {
      if (tile.type === 'building') ST.Buildings.remove(x, y);
      else if (tile.type === 'road') ST.Roads.remove(x, y);
    });

    // Restore
    (data.roads     || []).forEach(function(r)  { ST.Roads.place(r[0], r[1]); });
    (data.buildings || []).forEach(function(bd) {
      const b = ST.Buildings.create(bd.type, bd.x, bd.y);
      if (b && bd.pitch != null) ST.Buildings.setProperty(b, 'pitch', bd.pitch);
      if (b && bd.level != null) ST.Buildings.setProperty(b, 'level', bd.level);
    });
    (data.signs    || []).forEach(function(s)  { ST.Signs.place(s.type, s.x, s.y, s.params); });
    (data.vehicles || []).forEach(function(vd) { ST.Vehicles.spawn(vd.type, vd.x, vd.y); });

    // BUG FIX: use != null instead of falsy check (bpm=0 or preset='' would be skipped otherwise)
    if (data.bpm    != null) ST.Audio.setBPM(data.bpm);
    if (data.preset != null) ST.Effects.setPreset(data.preset);

    ST.Renderer.drawFrame();
    ST.UI.updateTransport(ST.Audio.getBPM(), false);
    ST.UI.refreshToolbar();
    return true;
  }

  return {
    serialize: function() {
      try { return btoa(JSON.stringify(_buildSnapshot())); }
      catch(e) { return null; }
    },

    deserialize: function(encoded) {
      try { return _applySnapshot(JSON.parse(atob(encoded))); }
      catch(e) { return false; }
    },

    save: function(slot) {
      try {
        const enc = this.serialize();
        if (!enc) return false;
        localStorage.setItem(SLOT_PREFIX + slot, enc);
        return true;
      } catch(e) { return false; }
    },

    load: function(slot) {
      try {
        const enc = localStorage.getItem(SLOT_PREFIX + slot);
        if (!enc) return false;
        return this.deserialize(enc);
      } catch(e) { return false; }
    },

    exportURL: function() {
      const enc = this.serialize();
      if (enc) location.hash = enc;
    },

    importURL: function() {
      const h = location.hash;
      if (!h || h.length <= 1) return false;
      return this.deserialize(h.slice(1));
    }
  };
})();
