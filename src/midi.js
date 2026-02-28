'use strict';

// ============================================================
// ST.MIDI — export/import city composition as .mid file.
// Export: one tempo track + one note track per vehicle type.
// Import: parse .mid → reconstruct building pitches + BPM.
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

  // --- import parser ---

  /**
   * Parse a MIDI ArrayBuffer → { bpm, pitches[] } or null on error.
   * Handles format 0 (single track) and format 1 (multi-track).
   * For Synth Town exports (format 1), bar-1 notes map 1-to-1 to buildings.
   */
  function _parseMidi(arrayBuffer) {
    const u8 = new Uint8Array(arrayBuffer);
    if (u8.length < 14) return null;
    if (u8[0] !== 0x4D || u8[1] !== 0x54 || u8[2] !== 0x68 || u8[3] !== 0x64) return null;

    const format  = (u8[8] << 8)  | u8[9];
    const nTracks = (u8[10] << 8) | u8[11];
    const ppq     = (u8[12] << 8) | u8[13];

    let pos = 14;
    let bpm = 120;
    const notesByTrack = [];

    for (let t = 0; t < nTracks; t++) {
      if (pos + 8 > u8.length) break;
      if (u8[pos] !== 0x4D || u8[pos+1] !== 0x54 || u8[pos+2] !== 0x72 || u8[pos+3] !== 0x6B) break;
      const trackLen = (u8[pos+4] << 24) | (u8[pos+5] << 16) | (u8[pos+6] << 8) | u8[pos+7];
      pos += 8;
      const trackEnd = pos + trackLen;
      const notes = [];
      let curPos = pos;
      let tick = 0;
      let lastStatus = 0;

      while (curPos < trackEnd) {
        // variable-length delta time
        let delta = 0, b;
        do { b = u8[curPos++]; delta = (delta << 7) | (b & 0x7f); } while ((b & 0x80) && curPos < trackEnd);
        tick += delta;
        if (curPos >= trackEnd) break;

        const byte0 = u8[curPos];
        if (byte0 === 0xFF) {                         // meta event
          curPos++;
          if (curPos >= trackEnd) break;
          const mType = u8[curPos++];
          let mLen = 0;
          do { b = u8[curPos++]; mLen = (mLen << 7) | (b & 0x7f); } while ((b & 0x80) && curPos < trackEnd);
          if (mType === 0x51 && mLen === 3 && curPos + 2 < u8.length) {
            const us = (u8[curPos] << 16) | (u8[curPos+1] << 8) | u8[curPos+2];
            if (us > 0) bpm = Math.round(60000000 / us);
          }
          curPos += mLen;
          lastStatus = 0;
        } else if (byte0 === 0xF0 || byte0 === 0xF7) { // sysex
          curPos++;
          let sLen = 0;
          do { b = u8[curPos++]; sLen = (sLen << 7) | (b & 0x7f); } while ((b & 0x80) && curPos < trackEnd);
          curPos += sLen;
          lastStatus = 0;
        } else {                                        // MIDI event
          let status;
          if (byte0 & 0x80) { status = byte0; lastStatus = byte0; curPos++; }
          else               { status = lastStatus; }
          const type = status & 0xF0;
          if (type === 0x90 && curPos + 1 < trackEnd) {
            const note = u8[curPos++];
            const vel  = u8[curPos++];
            if (vel > 0) notes.push({ tick, note });
          } else if (type === 0x80 && curPos + 1 < trackEnd) {
            curPos += 2;
          } else if ((type === 0xA0 || type === 0xB0 || type === 0xE0) && curPos + 1 < trackEnd) {
            curPos += 2;
          } else if ((type === 0xC0 || type === 0xD0) && curPos < trackEnd) {
            curPos += 1;
          } else {
            break;
          }
        }
      }

      notesByTrack.push(notes);
      pos = trackEnd;
    }

    // format 0 → notes in track 0; format 1 → notes start at track 1 (track 0 is tempo)
    const noteTrack = notesByTrack[format === 0 ? 0 : 1] || [];

    // Prefer bar-1 events (avoids duplicates from BARS=2 loop in our export)
    const ticksPerBar = ppq * 4;
    let chosen = noteTrack.filter(function(n) { return n.tick < ticksPerBar; });
    if (chosen.length === 0) {
      // Fallback for external MIDIs: unique note values in first-occurrence order
      const seen = new Set();
      chosen = noteTrack.filter(function(n) {
        if (seen.has(n.note)) return false;
        seen.add(n.note);
        return true;
      });
    }

    const pitches = chosen.map(function(n) { return 440 * Math.pow(2, (n.note - 69) / 12); });
    return { bpm, pitches };
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
    },

    /**
     * Open a file picker, parse the chosen .mid file, and rebuild buildings.
     * Replaces all existing buildings; roads/vehicles/signs are preserved.
     * Also restores BPM from the MIDI tempo track.
     */
    import: function() {
      const input = document.createElement('input');
      input.type   = 'file';
      input.accept = '.mid,.midi';
      input.addEventListener('change', function() {
        const file = input.files && input.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(e) {
          const result = _parseMidi(e.target.result);
          if (!result || result.pitches.length === 0) {
            ST._UI.showToast('Could not read MIDI file.', 2500);
            return;
          }
          const msg = 'Import MIDI? Replaces all buildings (' + result.pitches.length + ' notes found).';
          if (!confirm(msg)) return;

          // Remove all existing buildings
          ST.Buildings.getAll().forEach(function(b) { ST.Buildings.remove(b.x, b.y); });

          // Place new buildings at empty tiles in reading order
          const pitches = result.pitches.slice(0, ST.Config.MAX_BUILDINGS);
          const types   = Object.keys(ST.Buildings.TYPES);
          let placed = 0;
          let pIdx   = 0;
          outer: for (let gy = 0; gy < ST.Config.GRID_H; gy++) {
            for (let gx = 0; gx < ST.Config.GRID_W; gx++) {
              if (pIdx >= pitches.length) break outer;
              const tile = ST.Grid.getTile(gx, gy);
              if (!tile || tile.type !== 'empty') continue;
              const b = ST.Buildings.create(types[pIdx % types.length], gx, gy);
              if (b) { ST.Buildings.setProperty(b, 'pitch', pitches[pIdx]); placed++; }
              pIdx++;
            }
          }

          // Restore BPM (clamped to slider range)
          const newBPM = Math.max(ST.Config.BPM_MIN, Math.min(ST.Config.BPM_MAX, result.bpm));
          ST.Audio.setBPM(newBPM);
          const bpmSlider  = document.getElementById('slider-bpm');
          const bpmDisplay = document.getElementById('bpm-display');
          if (bpmSlider)  bpmSlider.value = newBPM;
          if (bpmDisplay) bpmDisplay.textContent = newBPM;

          if (!ST.Game.isPlaying()) ST.Renderer.drawFrame();
          ST._UI.showToast('Imported ' + placed + ' buildings, ' + newBPM + ' BPM', 3000);
        };
        reader.onerror = function() { ST._UI.showToast('Failed to read file.', 2500); };
        reader.readAsArrayBuffer(file);
      });
      document.body.appendChild(input);
      input.click();
      document.body.removeChild(input);
    }
  };
})();
