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
  // AC-U3: label icon-only octave nav buttons for screen readers
  btnPrev.setAttribute('aria-label', 'Previous octave');
  octLabel.className = 'st-piano-oct-label';
  // AC-U3: live region so octave changes are announced
  octLabel.setAttribute('aria-live', 'polite');
  btnNext.className  = 'st-oct-btn';
  btnNext.textContent = '\u203a';
  btnNext.setAttribute('aria-label', 'Next octave');
  nav.appendChild(btnPrev);
  nav.appendChild(octLabel);
  nav.appendChild(btnNext);
  wrap.appendChild(nav);

  const keysEl = document.createElement('div');
  keysEl.className = 'st-piano-keys';
  // AC-U3: group role + label so AT announces it as a pitch selector
  keysEl.setAttribute('role', 'group');
  keysEl.setAttribute('aria-label', 'Select pitch');
  wrap.appendChild(keysEl);

  const hzEl = document.createElement('div');
  hzEl.className = 'st-props-value';
  // AC-U3: live region so pitch value changes are announced by screen readers
  hzEl.setAttribute('aria-live', 'polite');

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

  // AC-U3: shared helper to make a piano key div keyboard/AT accessible
  function _makeKey(className, midi, isActive, leftPx) {
    const key  = document.createElement('div');
    const ni   = ((midi % 12) + 12) % 12;
    const oct  = Math.floor(midi / 12) - 1;
    const name = NOTES[ni] + oct;
    key.className  = className;
    key.style.left = leftPx + 'px';
    // role=button + tabindex makes div keys focusable and actionable via keyboard
    key.setAttribute('role', 'button');
    key.setAttribute('tabindex', '0');
    key.setAttribute('aria-label', name + (isActive ? ' (selected)' : ''));
    key.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    if (isActive) { key.style.background = color; if (className === 'st-black-key') key.style.opacity = '0.85'; }
    function _act(e) { e.stopPropagation(); _pickNote(midi); }
    key.addEventListener('click', _act);
    // Activate on Enter or Space for keyboard users
    key.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); _act(e); }
    });
    return key;
  }

  function _buildKeys() {
    keysEl.innerHTML = '';
    const activeMidi = hzToMidi(building.pitch);

    WHITE_IDX.forEach(function(ni, i) {
      const midi = (octave[0] + 1) * 12 + ni;
      keysEl.appendChild(_makeKey('st-white-key', midi, midi === activeMidi, i * WK));
    });

    BLACK_IDX.forEach(function(ni, i) {
      const midi = (octave[0] + 1) * 12 + ni;
      keysEl.appendChild(_makeKey('st-black-key', midi, midi === activeMidi, BLACK_OFFSETS[i]));
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
