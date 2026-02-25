'use strict';

// ============================================================
// ST._UI.createToolbar — builds and maintains the left toolbar.
// Factory receives callbacks to decouple from ST.UI internals.
//
// callbacks: {
//   onSetTool(toolName)  — called when a tool button is clicked
//   onShowToast(msg)     — called to display a feedback toast
//   onPresetChange()     — called after an effect preset changes
// }
// ============================================================
ST._UI = ST._UI || {};

ST._UI.createToolbar = function(callbacks) {
  const { TOOL_DEFS, BUILDING_DEFS, VEHICLE_DEFS, SIGN_DEFS, PRESET_LABELS } = ST._UI.DEFS;

  function _makeSection(toolbar, label) {
    const el = document.createElement('div');
    el.className = 'st-toolbar-section';
    el.textContent = label;
    toolbar.appendChild(el);
  }

  function _makeToolBtn(toolbar, def) {
    const btn = document.createElement('button');
    btn.className  = 'st-tool-btn';
    btn.dataset.tool = def.tool;
    if (!ST.Unlocks.isUnlocked(def.tool)) {
      btn.classList.add('st-locked');
      btn.title = 'Locked \u2014 raise your score to unlock';
    }
    if (def.dot) {
      const dot = document.createElement('span');
      dot.className = 'st-color-dot';
      dot.style.background = def.dot;
      btn.appendChild(dot);
    }
    btn.appendChild(document.createTextNode(def.label));
    btn.addEventListener('click', function() { callbacks.onSetTool(def.tool); });
    toolbar.appendChild(btn);
  }

  function _makeActionBtn(toolbar, label, onClick) {
    const btn = document.createElement('button');
    btn.className = 'st-tool-btn';
    btn.appendChild(document.createTextNode(label));
    btn.addEventListener('click', onClick);
    toolbar.appendChild(btn);
  }

  function build() {
    const toolbar = document.getElementById('toolbar');
    toolbar.innerHTML = '';

    // Onboarding hint (hidden until first audio start)
    const hint = document.createElement('div');
    hint.id = 'onboard-hint';
    hint.style.display = 'none';
    toolbar.appendChild(hint);

    _makeSection(toolbar, 'Tools');
    TOOL_DEFS.forEach(function(def) { _makeToolBtn(toolbar, def); });

    _makeSection(toolbar, 'Buildings');
    BUILDING_DEFS.forEach(function(def) { _makeToolBtn(toolbar, def); });

    _makeSection(toolbar, 'Vehicles');
    VEHICLE_DEFS.forEach(function(def) { _makeToolBtn(toolbar, def); });

    _makeSection(toolbar, 'Signs');
    SIGN_DEFS.forEach(function(def) { _makeToolBtn(toolbar, def); });

    _makeSection(toolbar, 'Effects');
    const currentPreset = ST.Effects.getPreset();
    Object.keys(PRESET_LABELS).forEach(function(name) {
      const btn = document.createElement('button');
      btn.className    = 'st-tool-btn';
      btn.dataset.preset = name;
      if (name === currentPreset) btn.classList.add('st-active');
      btn.appendChild(document.createTextNode(PRESET_LABELS[name]));
      btn.addEventListener('click', function() {
        ST.Effects.setPreset(name);
        callbacks.onPresetChange();
      });
      toolbar.appendChild(btn);
    });

    _makeSection(toolbar, 'Save / Load');
    _makeActionBtn(toolbar, 'Save', function() {
      callbacks.onShowToast(ST.State.save(0) ? 'Saved!' : 'Save failed.');
    });
    _makeActionBtn(toolbar, 'Load', function() {
      callbacks.onShowToast(ST.State.load(0) ? 'Loaded!' : 'Nothing saved yet.');
    });
    _makeActionBtn(toolbar, 'Share URL', function() {
      ST.State.exportURL();
      if (navigator.clipboard) navigator.clipboard.writeText(location.href).catch(function() {});
      callbacks.onShowToast('URL ready \u2014 copy from address bar.');
    });
  }

  function updateToolBtns(tool) {
    document.querySelectorAll('[data-tool]').forEach(function(btn) {
      btn.classList.toggle('st-active', btn.dataset.tool === tool);
    });
  }

  function updateEffectBtns() {
    const preset = ST.Effects.getPreset();
    document.querySelectorAll('[data-preset]').forEach(function(btn) {
      btn.classList.toggle('st-active', btn.dataset.preset === preset);
    });
  }

  return { build: build, updateToolBtns: updateToolBtns, updateEffectBtns: updateEffectBtns };
};
