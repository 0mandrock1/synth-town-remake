'use strict';

// ============================================================
// ST._UI.buildPianoPicker — self-contained piano key widget
// for selecting a building's pitch via MIDI note.
// Returns { pianoEl: HTMLElement, hzEl: HTMLElement }
// ============================================================
ST._UI = ST._UI || {};

ST._UI.buildPianoPicker = function(building, color) {
  const NOTES         = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  const WHITE_IDX     = [0, 2, 4, 5, 7, 9, 11];
  const BLACK_IDX     = [1, 3, 6, 8, 10];
  const BLACK_OFFSETS = [19, 47, 103, 131, 159];
  const WK = 28;

  function hzToMidi(hz) { return Math.round(12 * Math.log2(hz / 440)) + 69; }
  function midiToHz(m)  { return 440 * Math.pow(2, (m - 69) / 12); }

  const initOct = Math.max(2, Math.min(6, Math.floor(hzToMidi(building.pitch) / 12) - 1));
  const octave  = [initOct];

  // --- DOM structure ---
  const wrap = document.createElement('div');
  wrap.className = 'st-piano-wrap';

  const nav = document.createElement('div');
  nav.className = 'st-piano-nav';
  const btnPrev  = document.createElement('button');
  const octLabel = document.createElement('span');
  const btnNext  = document.createElement('button');
  btnPrev.className  = 'st-oct-btn';
  btnPrev.textContent = '\u2039';
  octLabel.className = 'st-piano-oct-label';
  btnNext.className  = 'st-oct-btn';
  btnNext.textContent = '\u203a';
  nav.appendChild(btnPrev);
  nav.appendChild(octLabel);
  nav.appendChild(btnNext);
  wrap.appendChild(nav);

  const keysEl = document.createElement('div');
  keysEl.className = 'st-piano-keys';
  wrap.appendChild(keysEl);

  const hzEl = document.createElement('div');
  hzEl.className = 'st-props-value';

  // --- helpers ---
  function _updateHzEl() {
    const midi = hzToMidi(building.pitch);
    const ni   = ((midi % 12) + 12) % 12;
    const oct  = Math.floor(midi / 12) - 1;
    hzEl.textContent = NOTES[ni] + oct + '  (' + Math.round(building.pitch) + ' Hz)';
  }

  function _pickNote(midi) {
    const hz = midiToHz(midi);
    ST.Buildings.setProperty(building, 'pitch', hz);
    ST.Audio.trigger({ waveform: building.waveform, pitch: hz, decay: 0.3, velocity: 0.8 });
    _buildKeys();
    _updateHzEl();
  }

  function _buildKeys() {
    keysEl.innerHTML = '';
    const activeMidi = hzToMidi(building.pitch);

    WHITE_IDX.forEach(function(ni, i) {
      const midi = (octave[0] + 1) * 12 + ni;
      const key  = document.createElement('div');
      key.className  = 'st-white-key';
      key.style.left = (i * WK) + 'px';
      if (midi === activeMidi) key.style.background = color;
      key.addEventListener('click', function(e) { e.stopPropagation(); _pickNote(midi); });
      keysEl.appendChild(key);
    });

    BLACK_IDX.forEach(function(ni, i) {
      const midi = (octave[0] + 1) * 12 + ni;
      const key  = document.createElement('div');
      key.className  = 'st-black-key';
      key.style.left = BLACK_OFFSETS[i] + 'px';
      if (midi === activeMidi) { key.style.background = color; key.style.opacity = '0.85'; }
      key.addEventListener('click', function(e) { e.stopPropagation(); _pickNote(midi); });
      keysEl.appendChild(key);
    });
  }

  function _updateOctLabel() { octLabel.textContent = 'C' + octave[0]; }

  btnPrev.addEventListener('click', function() {
    octave[0] = Math.max(2, octave[0] - 1); _updateOctLabel(); _buildKeys();
  });
  btnNext.addEventListener('click', function() {
    octave[0] = Math.min(6, octave[0] + 1); _updateOctLabel(); _buildKeys();
  });

  _updateOctLabel();
  _buildKeys();
  _updateHzEl();

  return { pianoEl: wrap, hzEl: hzEl };
};
