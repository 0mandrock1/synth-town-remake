'use strict';

// ============================================================
// ST.History — undo/redo command stack (max 50 entries)
// Commands must implement { undo: fn, redo: fn }.
// ============================================================
ST.History = (function() {
  console.log('[History] initialized');

  const _stack = [];
  let _cursor = -1;
  const MAX = 50;

  return {
    push: function(cmd) {
      _stack.splice(_cursor + 1);
      _stack.push(cmd);
      if (_stack.length > MAX) _stack.shift();
      else _cursor++;
    },

    undo: function() {
      if (_cursor < 0) return false;
      _stack[_cursor].undo();
      _cursor--;
      return true;
    },

    redo: function() {
      if (_cursor >= _stack.length - 1) return false;
      _cursor++;
      _stack[_cursor].redo();
      return true;
    },

    canUndo: function() { return _cursor >= 0; },
    canRedo: function() { return _cursor < _stack.length - 1; }
  };
})();
