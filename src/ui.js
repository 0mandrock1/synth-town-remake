'use strict';

// ============================================================
// ST.UI — canvas events, transport bar, property panel, public API
// Depends on: ST._UI.DEFS, ST._UI.createOnboarding,
//             ST._UI.buildPianoPicker, ST._UI.createToolbar
// ============================================================
ST.UI = (function() {
  console.log('[UI] initialized');

  // --- shared state ---
  let _tool             = 'road';
  let _selectedBuilding = null;
  let _hoverTile        = null;

  // QW-U3: hover preview hum
  let _hoverOsc  = null;
  let _hoverGain = null;
  let _hoverPitch = 0;

  function _startHoverHum(waveform, pitch) {
    if (!ST.Audio.isReady()) return;
    if (_hoverOsc && _hoverPitch === pitch) return; // already humming same note
    _stopHoverHum();
    const ctx = ST.Audio.getContext();
    _hoverPitch = pitch;
    _hoverOsc  = ctx.createOscillator();
    _hoverGain = ctx.createGain();
    _hoverOsc.type = waveform;
    _hoverOsc.frequency.value = pitch;
    _hoverGain.gain.setValueAtTime(0.001, ctx.currentTime);
    _hoverGain.gain.linearRampToValueAtTime(0.025, ctx.currentTime + 0.05);
    _hoverOsc.connect(_hoverGain);
    _hoverGain.connect(ST.Audio.getMasterGain());
    _hoverOsc.start();
  }

  function _stopHoverHum() {
    if (_hoverGain && _hoverOsc) {
      const ctx = ST.Audio.getContext();
      if (ctx) {
        _hoverGain.gain.setTargetAtTime(0, ctx.currentTime, 0.02);
        try { _hoverOsc.stop(ctx.currentTime + 0.1); } catch(e) { /* already stopped */ }
      }
    }
    _hoverOsc  = null;
    _hoverGain = null;
    _hoverPitch = 0;
  }

  // --- tooltip system (exposed on ST._UI for toolbar/defs to use) ---
  function _showTooltip(e, text) {
    const tip = document.getElementById('st-tooltip');
    if (!tip) return;
    const parts = text.split('\n');
    tip.innerHTML = '<strong>' + parts[0] + '</strong>' +
      (parts.length > 1 ? '<br>' + parts.slice(1).join('<br>') : '');
    tip.style.display = 'block';
    _moveTooltip(e);
  }

  function _moveTooltip(e) {
    const tip = document.getElementById('st-tooltip');
    if (!tip || tip.style.display === 'none') return;
    const x = Math.min(e.clientX + 14, window.innerWidth - 226);
    tip.style.left = x + 'px';
    tip.style.top  = Math.max(4, e.clientY - tip.offsetHeight - 8) + 'px';
  }

  function _hideTooltip() {
    const tip = document.getElementById('st-tooltip');
    if (tip) tip.style.display = 'none';
  }

  function _addTooltip(id, text) {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('mouseenter', function(e) { _showTooltip(e, text); });
    el.addEventListener('mouseleave', _hideTooltip);
    el.addEventListener('mousemove',  _moveTooltip);
  }

  // Make tooltip helpers available to toolbar and other sub-modules
  ST._UI.showTooltip = _showTooltip;
  ST._UI.moveTooltip = _moveTooltip;
  ST._UI.hideTooltip = _hideTooltip;

  const _onboarding = ST._UI.createOnboarding();

  const _toolbar = ST._UI.createToolbar({
    onSetTool:      function(toolName) { ST.UI.setTool(toolName); },
    onShowToast:    function(msg) { ST._UI.showToast(msg); },
    onPresetChange: function() { _toolbar.updateEffectBtns(); }
  });

  // --- audio feedback click ---
  function _playCFeedback() {
    if (ST.Audio.isReady()) {
      ST.Audio.trigger({ waveform: 'triangle', pitch: 900, decay: 0.05,
                         velocity: 0.1, sendDelay: 0, sendReverb: 0 });
    }
  }

  // QW-M2: immediate score display refresh
  function _refreshScore() {
    const scoreEl = document.getElementById('score-display');
    if (scoreEl) {
      scoreEl.textContent = ST.Score.calculate() + ' \u2014 ' + ST.Score.getThreshold().name;
    }
  }

  // QW-U2: confirmation sounds for removal
  function _playRemoveSound(isBuilding) {
    if (!ST.Audio.isReady()) return;
    if (isBuilding) {
      ST.Audio.trigger({ waveform: 'sine', pitch: 440, decay: 0.2, velocity: 0.15, sendDelay: 0, sendReverb: 0 });
      setTimeout(function() {
        ST.Audio.trigger({ waveform: 'sine', pitch: 220, decay: 0.15, velocity: 0.08, sendDelay: 0, sendReverb: 0 });
      }, 80);
    } else {
      ST.Audio.trigger({ waveform: 'sawtooth', pitch: 80, decay: 0.08, velocity: 0.1, sendDelay: 0, sendReverb: 0 });
    }
  }

  // --- remove tool: handles sign / road / building with undo ---
  function _handleRemoveTool(gx, gy, tile) {
    if (!tile) return;
    if (tile.sign) {
      const s = { type: tile.sign.type, params: Object.assign({}, tile.sign.params) };
      ST.Signs.remove(gx, gy);
      ST.History.push({
        undo: function() { ST.Signs.place(s.type, gx, gy, s.params); },
        redo: function() { ST.Signs.remove(gx, gy); }
      });
    } else if (tile.type === 'road') {
      const savedSign = tile.sign ? { type: tile.sign.type, params: Object.assign({}, tile.sign.params) } : null;
      ST.Roads.remove(gx, gy);
      _playRemoveSound(false);
      ST.Vehicles.getAll().forEach(function(v) {
        if ((v.x === gx && v.y === gy) || (v.nextX === gx && v.nextY === gy)) ST.Vehicles.remove(v);
      });
      ST.History.push({
        undo: function() {
          ST.Roads.place(gx, gy);
          if (savedSign) ST.Signs.place(savedSign.type, gx, gy, savedSign.params);
        },
        redo: function() {
          ST.Roads.remove(gx, gy);
          ST.Vehicles.getAll().forEach(function(v) {
            if ((v.x === gx && v.y === gy) || (v.nextX === gx && v.nextY === gy)) ST.Vehicles.remove(v);
          });
        }
      });
    } else if (tile.type === 'building') {
      const b = tile.building;
      const snap = { type: b.type, x: gx, y: gy, pitch: b.pitch, level: b.level };
      if (_selectedBuilding && _selectedBuilding.x === gx && _selectedBuilding.y === gy) ST.UI.hideProperties();
      _playRemoveSound(true);
      ST.Buildings.remove(gx, gy);
      ST.History.push({
        undo: function() {
          const nb = ST.Buildings.create(snap.type, snap.x, snap.y);
          if (nb) { ST.Buildings.setProperty(nb, 'pitch', snap.pitch); ST.Buildings.setProperty(nb, 'level', snap.level); }
        },
        redo: function() {
          if (_selectedBuilding && _selectedBuilding.x === snap.x && _selectedBuilding.y === snap.y) ST.UI.hideProperties();
          ST.Buildings.remove(snap.x, snap.y);
        }
      });
    }
  }

  // --- canvas event handler ---
  function _onCanvasAction(e) {
    const canvas = document.getElementById('game');
    const rect   = canvas.getBoundingClientRect();
    const scaleX = (ST.Config.GRID_W * ST.Config.TILE) / rect.width;
    const scaleY = (ST.Config.GRID_H * ST.Config.TILE) / rect.height;
    const gx = Math.floor((e.clientX - rect.left) * scaleX / ST.Config.TILE);
    const gy = Math.floor((e.clientY - rect.top)  * scaleY / ST.Config.TILE);
    if (!ST.Grid.isInBounds(gx, gy)) return;

    if (_tool === 'road') {
      const ok = ST.Roads.place(gx, gy);
      if (ok) {
        _playCFeedback();
        _refreshScore();
        ST.History.push({ undo: function() { ST.Roads.remove(gx, gy); }, redo: function() { ST.Roads.place(gx, gy); } });
        if (_onboarding.getStep() === 1) _onboarding.advance(2);
      }

    } else if (_tool === 'select') {
      const b = ST.Buildings.getAt(gx, gy);
      if (b) { ST.UI.showProperties(b); } else { ST.UI.hideProperties(); }

    } else if (_tool === 'remove') {
      _handleRemoveTool(gx, gy, ST.Grid.getTile(gx, gy));

    } else if (ST.Vehicles.TYPES[_tool]) {
      const tile = ST.Grid.getTile(gx, gy);
      if (tile && tile.type === 'road') {
        let v = ST.Vehicles.spawn(_tool, gx, gy);
        if (v) {
          _refreshScore();
          const vType = _tool;
          ST.History.push({ undo: function() { ST.Vehicles.remove(v); }, redo: function() { v = ST.Vehicles.spawn(vType, gx, gy); } });
        }
      }

    } else if (ST.Signs.TYPES[_tool]) {
      const tile = ST.Grid.getTile(gx, gy);
      if (tile && tile.type === 'road') {
        const params = _tool === 'oneWay' ? { dir: 'E' } : {};
        ST.Signs.place(_tool, gx, gy, params);
        const signType = _tool;
        const sp = Object.assign({}, params);
        ST.History.push({ undo: function() { ST.Signs.remove(gx, gy); }, redo: function() { ST.Signs.place(signType, gx, gy, sp); } });
      }

    } else if (ST.Buildings.TYPES[_tool]) {
      const b = ST.Buildings.create(_tool, gx, gy);
      if (b) {
        _refreshScore();
        // Preview the building's own sound immediately
        if (ST.Audio.isReady()) {
          ST.Audio.trigger({ waveform: b.waveform, pitch: b.pitch, decay: 0.4, velocity: 0.7, sendDelay: 0, sendReverb: 0 });
        }
        // Auto-open property panel so player can adjust the note
        _selectedBuilding = b;
        _buildPropertiesPanel(b);
        const snap = { type: _tool, x: gx, y: gy, pitch: b.pitch };
        ST.History.push({
          undo: function() {
            if (_selectedBuilding && _selectedBuilding.x === snap.x && _selectedBuilding.y === snap.y) ST.UI.hideProperties();
            ST.Buildings.remove(snap.x, snap.y);
          },
          redo: function() {
            const nb = ST.Buildings.create(snap.type, snap.x, snap.y);
            if (nb) ST.Buildings.setProperty(nb, 'pitch', snap.pitch);
          }
        });
        if (_onboarding.getStep() === 2) _onboarding.advance(3);
      }
    }

    if (!ST.Game.isPlaying()) ST.Renderer.drawFrame();
  }

  function _setupCanvas() {
    const canvas = document.getElementById('game');
    let _mouseDown = false;

    canvas.addEventListener('mousedown', function(e) { _mouseDown = true; _onCanvasAction(e); });
    canvas.addEventListener('mousemove', function(e) {
      const rect = canvas.getBoundingClientRect();
      _hoverTile = {
        x: Math.floor((e.clientX - rect.left) / rect.width  * ST.Config.GRID_W),
        y: Math.floor((e.clientY - rect.top)  / rect.height * ST.Config.GRID_H)
      };
      if (_mouseDown && (_tool === 'road' || _tool === 'remove')) _onCanvasAction(e);
      // QW-U3: hover hum — play a quiet note preview for building tools
      const def = ST.Buildings.TYPES[_tool];
      if (def && ST.Grid.isInBounds(_hoverTile.x, _hoverTile.y)) {
        const tile = ST.Grid.getTile(_hoverTile.x, _hoverTile.y);
        if (tile && tile.type === 'empty') {
          _startHoverHum(def.waveform, def.pitchDefault);
        } else {
          _stopHoverHum();
        }
      } else {
        _stopHoverHum();
      }
      if (!ST.Game.isPlaying()) ST.Renderer.drawFrame();
    });
    canvas.addEventListener('mouseup',    function() { _mouseDown = false; });
    canvas.addEventListener('mouseleave', function() {
      _mouseDown = false;
      _hoverTile = null;
      _stopHoverHum();
      if (!ST.Game.isPlaying()) ST.Renderer.drawFrame();
    });
  }

  function _setupTransport() {
    const overlay    = document.getElementById('audio-overlay');
    const startBtn   = document.getElementById('btn-start-audio');
    const playBtn    = document.getElementById('btn-play');
    const bpmSlider  = document.getElementById('slider-bpm');
    const bpmDisplay = document.getElementById('bpm-display');
    const volSlider  = document.getElementById('slider-vol');

    if (startBtn) startBtn.addEventListener('click', function() {
      ST.Audio.init();
      ST.Effects.init();
      if (overlay) overlay.style.display = 'none';
      _onboarding.advance(1);
    });
    if (playBtn) {
      playBtn.title = 'Play / Pause  [Space]';
      playBtn.addEventListener('click', function() {
        ST.Game.isPlaying() ? ST.Game.stop() : ST.Game.start();
      });
    }
    if (bpmSlider) {
      bpmSlider.value = ST.Audio.getBPM();
      bpmSlider.addEventListener('input', function() {
        ST.Audio.setBPM(parseInt(this.value, 10));
        if (bpmDisplay) bpmDisplay.textContent = ST.Audio.getBPM();
      });
    }
    if (bpmDisplay) bpmDisplay.textContent = ST.Audio.getBPM();
    if (volSlider) {
      volSlider.addEventListener('input', function() {
        const gain = ST.Audio.getMasterGain();
        if (gain) gain.gain.value = parseInt(this.value, 10) / 100;
      });
    }
    const midiBtn = document.getElementById('btn-export-midi');
    if (midiBtn) midiBtn.addEventListener('click', function() { ST.MIDI.export(); });
  }

  function _setupKeyboard() {
    document.addEventListener('keydown', function(e) {
      const overlay = document.getElementById('audio-overlay');
      if (overlay && overlay.style.display !== 'none') return;
      const tag = document.activeElement && document.activeElement.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if (e.code === 'Space') {
        e.preventDefault();
        ST.Game.isPlaying() ? ST.Game.stop() : ST.Game.start();
      } else if (e.ctrlKey && !e.shiftKey && e.code === 'KeyZ') {
        e.preventDefault();
        if (ST.History.undo()) {
          ST._UI.showToast('Undo', 1200);
          if (!ST.Game.isPlaying()) ST.Renderer.drawFrame();
        }
      } else if ((e.ctrlKey && e.code === 'KeyY') || (e.ctrlKey && e.shiftKey && e.code === 'KeyZ')) {
        e.preventDefault();
        if (ST.History.redo()) {
          ST._UI.showToast('Redo', 1200);
          if (!ST.Game.isPlaying()) ST.Renderer.drawFrame();
        }
      }
    });
  }

  // --- property panel ---
  function _buildPropertiesPanel(building) {
    const panel = document.getElementById('properties');
    const app   = document.getElementById('app');
    if (!panel) return;

    const props = ST.Buildings.getProperties(building);
    panel.innerHTML = '';

    const header = document.createElement('div');
    header.className = 'st-props-header';
    const dot = document.createElement('span');
    dot.className = 'st-color-dot';
    dot.style.background = props.color;
    const title = document.createElement('span');
    title.className = 'st-props-title';
    title.textContent = building.type.charAt(0).toUpperCase() + building.type.slice(1) + ' Wave';
    const closeBtn = document.createElement('button');
    closeBtn.className = 'st-props-close';
    closeBtn.textContent = '\u00d7';
    closeBtn.addEventListener('click', function() { ST.UI.hideProperties(); });
    header.appendChild(dot);
    header.appendChild(title);
    header.appendChild(closeBtn);
    panel.appendChild(header);

    const body = document.createElement('div');
    body.className = 'st-props-body';

    function _addRow(labelText, content) {
      const row = document.createElement('div');
      row.className = 'st-props-row';
      const lbl = document.createElement('div');
      lbl.className = 'st-props-label';
      lbl.textContent = labelText;
      row.appendChild(lbl);
      row.appendChild(content);
      body.appendChild(row);
    }

    const picker = ST._UI.buildPianoPicker(building, props.color);
    _addRow('Note', picker.pianoEl);
    _addRow('', picker.hzEl);

    const decayEl = document.createElement('div');
    decayEl.className = 'st-props-value';
    decayEl.textContent = props.decay + 's';
    _addRow('Decay', decayEl);

    // QW-M1: level control with audio resolution on upgrade
    const levelWrap = document.createElement('div');
    levelWrap.className = 'st-props-value';
    const levelDown = document.createElement('button');
    levelDown.className = 'st-props-btn';
    levelDown.textContent = '\u2212';
    const levelNum = document.createElement('span');
    levelNum.textContent = ' Lv ' + props.level + ' ';
    const levelUp = document.createElement('button');
    levelUp.className = 'st-props-btn';
    levelUp.textContent = '+';
    levelWrap.appendChild(levelDown);
    levelWrap.appendChild(levelNum);
    levelWrap.appendChild(levelUp);

    levelUp.addEventListener('click', function() {
      const newLevel = Math.min(8, (building.level || 1) + 1);
      if (newLevel === building.level) return;
      ST.Buildings.setProperty(building, 'level', newLevel);
      levelNum.textContent = ' Lv ' + newLevel + ' ';
      if (ST.Audio.isReady()) {
        const resolveNote = building.pitch * Math.pow(2, (newLevel - 1) / 12);
        ST.Audio.trigger({ waveform: building.waveform, pitch: resolveNote,
          attack: 0.05, decay: 0.4, velocity: 0.5, sendReverb: 0.3 });
      }
      if (ST.Renderer && ST.Renderer.markShake) ST.Renderer.markShake(2.0);
      if (!ST.Game.isPlaying()) ST.Renderer.drawFrame();
    });
    levelDown.addEventListener('click', function() {
      const newLevel = Math.max(1, (building.level || 1) - 1);
      if (newLevel === building.level) return;
      ST.Buildings.setProperty(building, 'level', newLevel);
      levelNum.textContent = ' Lv ' + newLevel + ' ';
      if (!ST.Game.isPlaying()) ST.Renderer.drawFrame();
    });
    _addRow('Level', levelWrap);

    panel.appendChild(body);
    if (app) app.style.gridTemplateColumns = '200px 1fr 220px';
  }

  // --- public API ---
  return {
    init: function() {
      _toolbar.build();
      _setupCanvas();
      _setupTransport();
      _setupKeyboard();
      _toolbar.updateToolBtns(_tool);
      ST.Audio.onTrigger = function() { _onboarding.onTrigger(); };
      // Tooltips for transport controls
      _addTooltip('btn-play',      'Play / Stop\nStarts the city simulation\nVehicles move and trigger building notes');
      _addTooltip('slider-bpm',    'BPM — Beats per Minute\nSets playback speed and delay echo timing\n60–180 BPM');
      _addTooltip('beat-dot',      'Beat Indicator\nPulses on every beat at the current BPM');
      _addTooltip('slider-vol',    'Master Volume\nOverall output level');
      _addTooltip('score-display', 'City Score\nBuildings ×10, roads ×2, vehicles ×15\nHarmonious neighbours earn bonus points (up to +200)');
      _addTooltip('btn-export-midi', 'Export MIDI\nDownload your city composition as a .mid file');
    },

    setTool: function(toolName) {
      _tool = toolName;
      _stopHoverHum();
      _toolbar.updateToolBtns(_tool);
      const canvas = document.getElementById('game');
      if (canvas) canvas.style.cursor = toolName === 'select' ? 'pointer' : 'crosshair';
    },

    getTool:        function() { return _tool; },
    getHoverTile:   function() { return _hoverTile; },
    refreshToolbar: function() { _toolbar.build(); _toolbar.updateToolBtns(_tool); },

    showProperties: function(building) {
      _selectedBuilding = building;
      _buildPropertiesPanel(building);
    },

    hideProperties: function() {
      _selectedBuilding = null;
      const panel = document.getElementById('properties');
      const app   = document.getElementById('app');
      if (panel) panel.innerHTML = '';
      if (app) app.style.gridTemplateColumns = '200px 1fr 0px';
    },

    updateTransport: function(bpm, playing) {
      const bpmDisplay = document.getElementById('bpm-display');
      const bpmSlider  = document.getElementById('slider-bpm');
      const playBtn    = document.getElementById('btn-play');
      if (bpmDisplay) bpmDisplay.textContent = bpm;
      if (bpmSlider)  bpmSlider.value = bpm;
      if (playBtn) {
        playBtn.innerHTML = playing ? '&#9646;&#9646;' : '&#9654;';
        playBtn.classList.toggle('st-active', playing);
      }
    },

    onUnlock: function(ids) {
      // JD-U3: chord stab + shake on unlock
      if (ST.Audio.isReady()) {
        [261.63, 329.63, 392.00].forEach(function(hz) {
          ST.Audio.trigger({ waveform: 'triangle', pitch: hz,
            attack: 0.02, decay: 0.5, velocity: 0.4, sendReverb: 0.25 });
        });
      }
      if (ST.Renderer && ST.Renderer.markShake) ST.Renderer.markShake(1.5);
      _toolbar.build();
      _toolbar.updateToolBtns(_tool);
      ST._UI.showToast('\u2605 Unlocked: ' + ids.join(', '), 3500);
    }
  };
})();
