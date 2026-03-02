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
  const { TOOL_DEFS, BUILDING_DEFS, VEHICLE_DEFS, SIGN_DEFS, PRESET_LABELS, PRESET_TOOLTIPS } = ST._UI.DEFS;

  function _attachTip(btn, text) {
    if (!text) return;
    btn.addEventListener('mouseenter', function(e) { if (ST._UI.showTooltip) ST._UI.showTooltip(e, text); });
    btn.addEventListener('mouseleave', function()  { if (ST._UI.hideTooltip) ST._UI.hideTooltip(); });
    btn.addEventListener('mousemove',  function(e) { if (ST._UI.moveTooltip) ST._UI.moveTooltip(e); });
  }

  function _makeSection(toolbar, label) {
    const el = document.createElement('div');
    el.className = 'st-toolbar-section';
    // AC-U3: section label is decorative grouping, not a focusable landmark
    el.setAttribute('aria-hidden', 'true');
    el.textContent = label;
    toolbar.appendChild(el);
  }

  function _makeToolBtn(toolbar, def) {
    const btn = document.createElement('button');
    btn.className  = 'st-tool-btn';
    btn.dataset.tool = def.tool;
    // AC-U3: aria-pressed marks the currently active tool
    btn.setAttribute('aria-pressed', 'false');
    if (!ST.Unlocks.isUnlocked(def.tool)) {
      btn.classList.add('st-locked');
      btn.title = 'Locked \u2014 raise your score to unlock';
      // AC-U3: communicate locked state to screen readers
      btn.setAttribute('aria-disabled', 'true');
    }
    if (def.dot) {
      const dot = document.createElement('span');
      dot.className = 'st-color-dot';
      dot.style.background = def.dot;
      // AC-U3: color dot is decorative — hide from AT
      dot.setAttribute('aria-hidden', 'true');
      btn.appendChild(dot);
    }
    btn.appendChild(document.createTextNode(def.label));
    btn.addEventListener('click', function() { callbacks.onSetTool(def.tool); });
    _attachTip(btn, def.tooltip);
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
      const isActive = (name === currentPreset);
      if (isActive) btn.classList.add('st-active');
      // AC-U3: aria-pressed reflects the active effects preset
      btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      btn.appendChild(document.createTextNode(PRESET_LABELS[name]));
      btn.addEventListener('click', function() {
        ST.Effects.setPreset(name);
        callbacks.onPresetChange();
      });
      _attachTip(btn, PRESET_TOOLTIPS && PRESET_TOOLTIPS[name]);
      toolbar.appendChild(btn);
    });

    _makeSection(toolbar, 'Save / Load (Browser)');
    _makeActionBtn(toolbar, 'Save to Browser', function() {
      callbacks.onShowToast(ST.State.save(0) ? 'Saved to browser storage!' : 'Save failed.');
    });
    _makeActionBtn(toolbar, 'Load from Browser', function() {
      callbacks.onShowToast(ST.State.load(0) ? 'Loaded!' : 'Nothing saved yet.');
    });
    _makeActionBtn(toolbar, 'Share URL', function() {
      ST.State.exportURL();
      if (navigator.clipboard) navigator.clipboard.writeText(location.href).catch(function() {});
      callbacks.onShowToast('URL ready \u2014 copy from address bar.');
    });

    _makeSection(toolbar, 'MIDI');
    _makeActionBtn(toolbar, 'Import MIDI', function() { ST.MIDI.import(); });
  }

  function updateToolBtns(tool) {
    document.querySelectorAll('[data-tool]').forEach(function(btn) {
      const isActive = btn.dataset.tool === tool;
      btn.classList.toggle('st-active', isActive);
      // AC-U3: keep aria-pressed in sync with active tool
      btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
  }

  function updateEffectBtns() {
    const preset = ST.Effects.getPreset();
    document.querySelectorAll('[data-preset]').forEach(function(btn) {
      const isActive = btn.dataset.preset === preset;
      btn.classList.toggle('st-active', isActive);
      // AC-U3: keep aria-pressed in sync with active preset
      btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
  }

  return { build: build, updateToolBtns: updateToolBtns, updateEffectBtns: updateEffectBtns };
};
