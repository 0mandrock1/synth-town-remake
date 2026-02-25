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
      if (ok) { _playCFeedback(); if (_onboarding.getStep() === 1) _onboarding.advance(2); }

    } else if (_tool === 'select') {
      const b = ST.Buildings.getAt(gx, gy);
      if (b) { ST.UI.showProperties(b); } else { ST.UI.hideProperties(); }

    } else if (_tool === 'remove') {
      const tile = ST.Grid.getTile(gx, gy);
      if (tile && tile.sign) {
        ST.Signs.remove(gx, gy);
      } else if (tile && tile.type === 'road') {
        ST.Roads.remove(gx, gy);
        ST.Vehicles.getAll().forEach(function(v) {
          if ((v.x === gx && v.y === gy) || (v.nextX === gx && v.nextY === gy)) {
            ST.Vehicles.remove(v);
          }
        });
      } else if (tile && tile.type === 'building') {
        if (_selectedBuilding && _selectedBuilding.x === gx && _selectedBuilding.y === gy) {
          ST.UI.hideProperties();
        }
        ST.Buildings.remove(gx, gy);
      }

    } else if (ST.Vehicles.TYPES[_tool]) {
      const tile = ST.Grid.getTile(gx, gy);
      if (tile && tile.type === 'road') ST.Vehicles.spawn(_tool, gx, gy);

    } else if (ST.Signs.TYPES[_tool]) {
      const tile = ST.Grid.getTile(gx, gy);
      if (tile && tile.type === 'road') {
        const params = _tool === 'oneWay' ? { dir: 'E' } : {};
        ST.Signs.place(_tool, gx, gy, params);
      }

    } else if (ST.Buildings.TYPES[_tool]) {
      const b = ST.Buildings.create(_tool, gx, gy);
      if (b) { _playCFeedback(); if (_onboarding.getStep() === 2) _onboarding.advance(3); }
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
      if (!ST.Game.isPlaying()) ST.Renderer.drawFrame();
    });
    canvas.addEventListener('mouseup',    function() { _mouseDown = false; });
    canvas.addEventListener('mouseleave', function() {
      _mouseDown = false;
      _hoverTile = null;
      if (!ST.Game.isPlaying()) ST.Renderer.drawFrame();
    });
  }

  function _setupTransport() {
    const overlay    = document.getElementById('audio-overlay');
    const startBtn   = document.getElementById('btn-start-audio');
    const playBtn    = document.getElementById('btn-play');
    const bpmSlider  = document.getElementById('slider-bpm');
    const bpmDisplay = document.getElementById('bpm-display');

    if (startBtn) startBtn.addEventListener('click', function() {
      ST.Audio.init();
      ST.Effects.init();
      if (overlay) overlay.style.display = 'none';
      _onboarding.advance(1);
    });
    if (playBtn) playBtn.addEventListener('click', function() {
      ST.Game.isPlaying() ? ST.Game.stop() : ST.Game.start();
    });
    if (bpmSlider) {
      bpmSlider.value = ST.Audio.getBPM();
      bpmSlider.addEventListener('input', function() {
        ST.Audio.setBPM(parseInt(this.value, 10));
        if (bpmDisplay) bpmDisplay.textContent = ST.Audio.getBPM();
      });
    }
    if (bpmDisplay) bpmDisplay.textContent = ST.Audio.getBPM();
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

    const levelEl = document.createElement('div');
    levelEl.className = 'st-props-value';
    levelEl.textContent = 'Lv ' + props.level;
    _addRow('Level', levelEl);

    panel.appendChild(body);
    if (app) app.style.gridTemplateColumns = '200px 1fr 220px';
  }

  // --- public API ---
  return {
    init: function() {
      _toolbar.build();
      _setupCanvas();
      _setupTransport();
      _toolbar.updateToolBtns(_tool);
      ST.Audio.onTrigger = function() {
        if (_onboarding.getStep() === 3) _onboarding.advance(4);
      };
    },

    setTool: function(toolName) {
      _tool = toolName;
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
      _toolbar.build();
      _toolbar.updateToolBtns(_tool);
      ST._UI.showToast('\uD83D\uDD13 Unlocked: ' + ids.join(', '), 3100);
    }
  };
})();
