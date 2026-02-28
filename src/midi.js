'use strict';

// ============================================================
// ST.MIDI — export city composition as a standard .mid file.
// One tempo track + one note track per vehicle type (car/bicycle/bus).
// Buildings are sorted by position and evenly spaced across 2 bars.
// ============================================================
ST.MIDI = (function() {
  console.log('[MIDI] initialized');

  const PPQ  = 96; // pulses per quarter note
  const BARS = 2;

  // --- binary helpers ---

  function _varLen(n) {
    if (n < 0x80) return [n];
    const bytes = [];
    do { bytes.unshift(n & 0x7f); n >>>= 7; } while (n > 0);
    for (let i = 0; i < bytes.length - 1; i++) bytes[i] |= 0x80;
    return bytes;
  }

  function _u32(n) {
    return [(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff];
  }

  function _u16(n) { return [(n >> 8) & 0xff, n & 0xff]; }

  function _trackBytes(events) {
    const data = [];
    let last = 0;
    events.forEach(function(ev) {
      const delta = Math.max(0, ev.tick - last);
      last = ev.tick;
      _varLen(delta).forEach(function(b) { data.push(b); });
      if (ev.type === 'on') {
        data.push(0x90 | (ev.ch & 0x0f), ev.note, ev.vel);
      } else {
        data.push(0x80 | (ev.ch & 0x0f), ev.note, 0x00);
      }
    });
    data.push(0x00, 0xFF, 0x2F, 0x00); // end-of-track
    return data;
  }

  // --- public API ---

  /** Convert Hz to MIDI note number, clamped 0–127. */
  function noteFromPitch(hz) {
    if (hz <= 0) return 60;
    return Math.max(0, Math.min(127, Math.round(12 * Math.log2(hz / 440) + 69)));
  }

  /**
   * Build note-event arrays for each vehicle type.
   * Returns Array<{name, events}> or null if no buildings exist.
   */
  function buildTracks() {
    const buildings = ST.Buildings.getAll().slice().sort(function(a, b) {
      return (a.y * ST.Config.GRID_W + a.x) - (b.y * ST.Config.GRID_W + b.x);
    });
    if (buildings.length === 0) return null;

    const bpm         = ST.Audio.getBPM();
    const ticksPerBar = PPQ * 4;
    const spacing     = Math.max(PPQ / 4, Math.round(ticksPerBar / buildings.length));

    return Object.keys(ST.Vehicles.TYPES).map(function(vType, trackIdx) {
      const def    = ST.Vehicles.TYPES[vType];
      const events = [];

      for (let bar = 0; bar < BARS; bar++) {
        buildings.forEach(function(b, i) {
          const note      = noteFromPitch(b.pitch);
          const onTick    = bar * ticksPerBar + i * spacing;
          const decayTicks = Math.max(1, Math.round(def.decay * (bpm / 60) * PPQ));
          const offTick   = onTick + Math.min(decayTicks, spacing - 1);
          const vel       = Math.max(1, Math.min(127, Math.round(def.velocityMult * 90)));
          events.push({ tick: onTick,  type: 'on',  ch: trackIdx, note: note, vel: vel });
          events.push({ tick: offTick, type: 'off', ch: trackIdx, note: note });
        });
      }
      events.sort(function(a, b) { return a.tick - b.tick || (a.type === 'off' ? -1 : 1); });
      return { name: vType, events: events };
    });
  }

  /** Build and return a MIDI Blob, or null if there are no buildings. */
  function exportBlob() {
    const tracks = buildTracks();
    if (!tracks) return null;

    const bpm       = ST.Audio.getBPM();
    const us        = Math.round(60000000 / bpm); // microseconds per beat
    const nTracks   = 1 + tracks.length;

    // Tempo track (track 0)
    const tempoData = [
      0x00, 0xFF, 0x51, 0x03,
      (us >> 16) & 0xff, (us >> 8) & 0xff, us & 0xff,
      0x00, 0xFF, 0x2F, 0x00
    ];

    // MIDI header chunk
    const bytes = [
      0x4D, 0x54, 0x68, 0x64,  // "MThd"
      0x00, 0x00, 0x00, 0x06,  // header length = 6
      0x00, 0x01               // format 1 (multi-track)
    ].concat(_u16(nTracks)).concat(_u16(PPQ));

    // Write tempo track
    bytes.push(0x4D, 0x54, 0x72, 0x6B); // "MTrk"
    _u32(tempoData.length).forEach(function(b) { bytes.push(b); });
    tempoData.forEach(function(b) { bytes.push(b); });

    // Write one note track per vehicle type
    tracks.forEach(function(track) {
      const data = _trackBytes(track.events);
      bytes.push(0x4D, 0x54, 0x72, 0x6B); // "MTrk"
      _u32(data.length).forEach(function(b) { bytes.push(b); });
      data.forEach(function(b) { bytes.push(b); });
    });

    return new Blob([new Uint8Array(bytes)], { type: 'audio/midi' });
  }

  return {
    noteFromPitch: noteFromPitch,
    buildTracks:   buildTracks,
    exportBlob:    exportBlob,

    /** Generate and trigger download of synth-town.mid. Returns false if nothing to export. */
    export: function() {
      const blob = exportBlob();
      if (!blob) { ST._UI.showToast('Add buildings first.', 2000); return false; }
      const url = URL.createObjectURL(blob);
      const a   = document.createElement('a');
      a.href = url; a.download = 'synth-town.mid';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      ST._UI.showToast('Exported synth-town.mid', 2500);
      return true;
    }
  };
})();
