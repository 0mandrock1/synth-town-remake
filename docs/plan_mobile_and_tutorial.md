# Synth Town — Mobile Responsiveness & Tutorial Popups Plan

> Date: 2026-03-02
> Status: Planning (not yet implemented)
> Builds on: Stages 1–9 complete; Wave 1–8 audio/UX improvements applied

---

## Part 1 — Mobile Responsiveness

### 1.1 Current State

The layout is a fixed desktop grid defined in `styles/main.css`:

```css
#app {
  grid-template-columns: 200px 1fr 0px;
  grid-template-rows: 1fr 64px;
}
```

No breakpoints exist. On screens narrower than ~700px:
- The 200px toolbar compresses the canvas to almost nothing.
- The transport bar overflows — BPM slider, volume, and all buttons don't fit in one row.
- Touch events are not handled on the canvas (`src/game.js` only registers `mousedown`, `mousemove`, `mouseup`, `contextmenu`).
- No pinch-zoom or scroll support.

### 1.2 Target Experience

| Screen size | Expected experience |
|-------------|-------------------|
| Desktop ≥ 1024px | Unchanged — sidebar + canvas + transport |
| Tablet 600–1024px | Toolbar collapses to icon strip; transport compresses |
| Mobile < 600px | Toolbar as bottom drawer; transport as 2-row bar; canvas full-width |

### 1.3 Implementation Plan

#### MB-1: CSS Breakpoints

Add two responsive breakpoints in `styles/main.css`.

**Tablet (≤ 1024px):** Narrow toolbar to icon width.

```css
@media (max-width: 1024px) {
  #app {
    grid-template-columns: 48px 1fr 0px;
  }
  #toolbar {
    padding: 4px;
    align-items: center;
  }
  .st-tool-btn {
    justify-content: center;
    padding: 8px;
    width: 36px;
    height: 36px;
  }
  /* Hide text labels, keep color dot only */
  .st-tool-btn > span:not(.st-color-dot),
  .st-tool-btn > text {
    display: none;
  }
  .st-toolbar-section { display: none; }
}
```

Note: button text nodes are direct text children — requires wrapping them in `<span class="st-btn-label">` in `toolbar.js:_makeToolBtn` to allow hiding.

**Mobile (≤ 600px):** Toolbar slides in as an overlay drawer from the left.

```css
@media (max-width: 600px) {
  #app {
    grid-template-columns: 0 1fr 0px;
    grid-template-rows: 1fr auto;
  }
  #toolbar {
    position: fixed;
    left: 0; top: 0; bottom: 0;
    width: 220px;
    transform: translateX(-100%);
    transition: transform 0.25s ease;
    z-index: 50;
  }
  #toolbar.st-open {
    transform: translateX(0);
  }
  /* Backdrop */
  #toolbar-backdrop {
    display: none;
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.5);
    z-index: 49;
  }
  #toolbar.st-open + #toolbar-backdrop {
    display: block;
  }
}
```

Add a hamburger toggle button `<button id="btn-toolbar-toggle">` in the transport bar (visible only on mobile via CSS `display: none` on wider screens).

#### MB-2: Transport Bar on Mobile

The transport bar has ~10 controls in a single row — impossible at < 600px wide.

**Solution:** Two-row transport on mobile.

```css
@media (max-width: 600px) {
  #transport {
    flex-wrap: wrap;
    height: auto;
    padding: 8px;
    gap: 8px;
  }
  #transport > * { flex-shrink: 0; }
  /* Row 1: play, BPM, vol */
  /* Row 2: feature buttons (grid, remix, chord, colorblind, MIDI) */
  #btn-grid, #btn-remix, #btn-chord, #btn-colorblind, #btn-export-midi {
    order: 10; /* push to second row */
  }
}
```

Alternatively, group feature buttons into a `<div class="st-transport-extras">` container that wraps naturally.

#### MB-3: Canvas Touch Events

Canvas in `src/game.js` uses `mousedown` / `mousemove` / `mouseup`. These fire late on mobile (300ms delay) and don't support multi-touch.

**Changes to `src/game.js`:**

```js
// Add alongside existing mouse listeners
_canvas.addEventListener('touchstart', function(e) {
  e.preventDefault();
  const t = e.touches[0];
  _handlePointerDown(t.clientX, t.clientY, 0 /* primary button */);
}, { passive: false });

_canvas.addEventListener('touchmove', function(e) {
  e.preventDefault();
  const t = e.touches[0];
  _handlePointerMove(t.clientX, t.clientY);
}, { passive: false });

_canvas.addEventListener('touchend', function(e) {
  e.preventDefault();
  _handlePointerUp();
}, { passive: false });
```

Refactor: extract `_handlePointerDown(clientX, clientY, button)`, `_handlePointerMove`, `_handlePointerUp` from the current mouse handlers, then call them from both mouse and touch listeners.

**Two-finger pinch for zoom (optional, P2):**

Track two simultaneous touches; calculate distance change; apply a `_zoom` factor to `ST.Config.TILE` and reinitialize renderer. Zoom level persisted in `ST.State`.

#### MB-4: Properties Panel on Mobile

On desktop the properties panel slides in as a right column (`grid-template-columns: 200px 1fr 220px`). On mobile it should overlay as a bottom sheet.

```css
@media (max-width: 600px) {
  #properties {
    position: fixed;
    bottom: 0; left: 0; right: 0;
    max-height: 55vh;
    border-left: none;
    border-top: 1px solid rgba(255,255,255,0.1);
    border-radius: 12px 12px 0 0;
    transform: translateY(100%);
    transition: transform 0.3s ease;
    z-index: 60;
  }
  #properties.st-visible {
    transform: translateY(0);
  }
}
```

The `.st-visible` class is already applied by `ST.UI.showProperties()` / `hideProperties()` — the JS logic stays unchanged; only CSS changes are needed.

Add a drag handle bar at the top of `#properties` (a decorative `<div class="st-drag-handle">`) for discoverability.

#### MB-5: Viewport Meta

Already present in `index.html`:

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0">
```

Ensure `user-scalable=no` is NOT set — pinch zoom for accessibility must remain enabled per WCAG 1.4.4.

#### MB-6: Font and Button Size

Current `.st-tool-btn` padding `7px 10px` is adequate but touch targets should be at least 44×44px per WCAG 2.5.8.

```css
@media (max-width: 600px) {
  .st-tool-btn { min-height: 44px; }
  #transport button { min-width: 44px; min-height: 44px; }
}
```

### 1.4 Files Changed

| File | Changes |
|------|---------|
| `styles/main.css` | Two media query blocks; properties overlay; transport wrap |
| `src/game.js` | Touch event listeners; refactor to `_handlePointerDown/Move/Up` |
| `src/ui/toolbar.js` | Wrap button text in `<span class="st-btn-label">` |
| `index.html` | `<button id="btn-toolbar-toggle">` in transport; `#toolbar-backdrop` div |

### 1.5 Testing Targets

- Chrome DevTools: 375×667 (iPhone SE), 768×1024 (iPad), 1280×800 (desktop)
- Safari on iOS: touch events, safe-area insets (`env(safe-area-inset-*)`)
- Firefox Android: flex-wrap behaviour

---

## Part 2 — Tutorial Popup Tooltips (Всплывашки)

### 2.1 Current State

The onboarding system (`src/ui/onboarding.js`) shows text hints in `#onboard-hint` at the top of the toolbar. It has 5 steps:

1. "Click a road tile, then a building"
2. "Place a vehicle on a road"
3. "Press Play ▶"
4. (vehicle triggers building) "Your city makes music!"
5. "Explore and grow your city"

These hints appear only in the sidebar — invisible on mobile or when the toolbar is collapsed. There is no visual pointer to the relevant UI element.

### 2.2 Design: Coach-Mark Popover System

A **coach mark** is a contextual popover that:
- Appears anchored to a specific DOM element (or canvas region)
- Has a directional arrow pointing at the target
- Has a title, body text, and a "Got it" / dismiss button
- Dims the rest of the UI with a semi-transparent overlay
- Advances through a sequence of steps

```
┌─────────────────────┐
│ ▲                   │
│  Step 2 of 5        │
│  ─────────────────  │
│  Place a vehicle    │
│  on a road tile.    │
│                     │
│  [ Got it (2/5) ]   │
└─────────────────────┘
```

### 2.3 Implementation Plan

#### TT-1: Popover DOM Structure

Add to `index.html` (before `</body>`):

```html
<div id="st-coach" role="dialog" aria-modal="false" aria-labelledby="st-coach-title" hidden>
  <div id="st-coach-arrow"></div>
  <div id="st-coach-body">
    <p id="st-coach-step"></p>
    <h3 id="st-coach-title"></h3>
    <p id="st-coach-text"></p>
    <div id="st-coach-actions">
      <button id="st-coach-skip">Skip tour</button>
      <button id="st-coach-next">Got it</button>
    </div>
  </div>
</div>
```

`aria-modal="false"` — the popover is not blocking, the player can still interact with the city while it shows.

#### TT-2: CSS Styles

```css
#st-coach {
  position: fixed;
  z-index: 200;
  background: #1a1a3a;
  border: 1px solid #64b5f6;
  border-radius: 8px;
  padding: 14px 16px;
  max-width: 260px;
  box-shadow: 0 4px 24px rgba(0,0,0,0.6);
  color: #e0e0e0;
}
#st-coach[hidden] { display: none; }
#st-coach-arrow {
  position: absolute;
  width: 12px; height: 12px;
  background: #1a1a3a;
  border: 1px solid #64b5f6;
  transform: rotate(45deg);
}
/* Arrow placement classes added by JS: .st-arrow-top, .st-arrow-bottom, etc. */
.st-arrow-top    { top: -7px; border-bottom: none; border-right: none; }
.st-arrow-bottom { bottom: -7px; border-top: none; border-left: none; }
.st-arrow-left   { left: -7px; border-right: none; border-bottom: none; transform: rotate(45deg); }
.st-arrow-right  { right: -7px; border-left: none; border-top: none; }
#st-coach-step { font-size: 10px; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 4px; }
#st-coach-title { font-size: 13px; font-weight: 600; margin-bottom: 6px; color: #64b5f6; }
#st-coach-text { font-size: 12px; line-height: 1.5; margin-bottom: 12px; }
#st-coach-actions { display: flex; gap: 8px; justify-content: flex-end; }
#st-coach-skip { background: none; border: none; color: rgba(255,255,255,0.4); font-size: 11px; cursor: pointer; padding: 4px; }
#st-coach-next { background: #64b5f6; color: #0a0a12; border: none; border-radius: 4px; padding: 6px 12px; font-size: 12px; font-weight: 600; cursor: pointer; }
#st-coach-next:hover { background: #90caf9; }
```

#### TT-3: `ST._UI.coachMarks` Module

Create `src/ui/coach.js` (new file, loaded in `index.html` before `src/ui.js`).

```js
'use strict';
ST._UI = ST._UI || {};

ST._UI.createCoachMarks = function() {
  const STEPS = [
    {
      targetId: null,          // null = center screen (intro)
      title: 'Welcome to Synth Town',
      text: 'Your city is a synthesizer. Buildings make sounds, vehicles trigger them.',
      position: 'center'
    },
    {
      targetId: 'toolbar',     // point at toolbar
      title: 'Pick a Road',
      text: 'Select the Road tool and click the grid to lay roads. Vehicles drive on roads.',
      position: 'right'
    },
    {
      targetId: 'toolbar',
      title: 'Place a Building',
      text: 'Each building type plays a different waveform. Sine = warm, Square = punchy.',
      position: 'right'
    },
    {
      targetId: 'btn-play',
      title: 'Press Play',
      text: 'Vehicles will start moving and trigger nearby buildings — your city makes music!',
      position: 'top'
    },
    {
      targetId: 'slider-bpm',
      title: 'Control the Tempo',
      text: 'Drag the BPM slider to speed up or slow down the groove.',
      position: 'top'
    },
    {
      targetId: 'score-display',
      title: 'Grow Your City',
      text: 'Score goes up as vehicles trigger buildings. Unlock new tools as you progress.',
      position: 'top'
    }
  ];

  let _step = 0;
  let _active = false;
  const _el = document.getElementById('st-coach');
  const _arrow = document.getElementById('st-coach-arrow');

  function _position(step) {
    if (!step.targetId || step.position === 'center') {
      // Center of viewport
      _el.style.left = '50%';
      _el.style.top  = '40%';
      _el.style.transform = 'translate(-50%, -50%)';
      _arrow.style.display = 'none';
      return;
    }
    _el.style.transform = '';
    _arrow.style.display = 'block';
    _arrow.className = '';

    const target = document.getElementById(step.targetId);
    if (!target) return;
    const tr = target.getBoundingClientRect();
    const margin = 12;

    if (step.position === 'right') {
      _el.style.left = (tr.right + margin) + 'px';
      _el.style.top  = Math.max(8, tr.top) + 'px';
      _arrow.classList.add('st-arrow-left');
      _arrow.style.top = '20px'; _arrow.style.left = '';
    } else if (step.position === 'top') {
      const elW = _el.offsetWidth || 260;
      const cx = tr.left + tr.width / 2;
      _el.style.left = Math.max(8, cx - elW / 2) + 'px';
      _el.style.top  = (tr.top - _el.offsetHeight - margin - 12) + 'px';
      _arrow.classList.add('st-arrow-bottom');
      _arrow.style.left = (elW / 2 - 6) + 'px'; _arrow.style.top = '';
    }
  }

  function _show(stepIdx) {
    const step = STEPS[stepIdx];
    if (!step) { _dismiss(); return; }
    document.getElementById('st-coach-step').textContent = 'Step ' + (stepIdx + 1) + ' of ' + STEPS.length;
    document.getElementById('st-coach-title').textContent = step.title;
    document.getElementById('st-coach-text').textContent = step.text;
    document.getElementById('st-coach-next').textContent =
      stepIdx < STEPS.length - 1 ? 'Got it (' + (stepIdx + 1) + '/' + STEPS.length + ')' : 'Let\'s go!';
    _el.hidden = false;
    // Reposition after render
    requestAnimationFrame(function() { _position(step); });
  }

  function _dismiss() {
    _el.hidden = true;
    _active = false;
    // Persist: do not show again
    try { localStorage.setItem('st_tour_done', '1'); } catch(e) {}
  }

  document.getElementById('st-coach-next').addEventListener('click', function() {
    _step++;
    if (_step >= STEPS.length) { _dismiss(); return; }
    _show(_step);
  });

  document.getElementById('st-coach-skip').addEventListener('click', _dismiss);

  return {
    start: function() {
      try { if (localStorage.getItem('st_tour_done')) return; } catch(e) {}
      _active = true;
      _step = 0;
      _show(0);
    },
    isActive: function() { return _active; },
    advanceTo: function(stepTitle) {
      // Called by game events to jump to a specific step
      const idx = STEPS.findIndex(function(s) { return s.title === stepTitle; });
      if (idx !== -1 && idx > _step) { _step = idx; _show(_step); }
    }
  };
};
```

#### TT-4: Integration Points

**Init:** In `src/ui.js`, after audio is started:

```js
// After ST.Audio.init() succeeds in _onAudioStart:
if (ST._UI.createCoachMarks) {
  ST.UI._coachMarks = ST._UI.createCoachMarks();
  ST.UI._coachMarks.start();
}
```

**Contextual advancement:** Coach marks can advance automatically when key actions occur:

| Event | Advance to |
|-------|-----------|
| First road placed | "Place a Building" step |
| First building placed | "Press Play" step |
| First vehicle placed | automatically if play not pressed |
| Play pressed | "Control the Tempo" step |
| Score > 0 | "Grow Your City" step |

Wire these in `src/ui.js` `_onCanvasAction()` using `ST.UI._coachMarks.advanceTo()`.

#### TT-5: Mobile Considerations for Coach Marks

On mobile (width < 600px), position `'right'` of toolbar won't work (toolbar is hidden). Use position `'bottom'` to anchor above the transport bar instead.

In `_position()`, detect mobile:

```js
const isMobile = window.innerWidth < 600;
if (isMobile && step.targetId === 'toolbar') {
  // Fall back to center positioning on mobile
  step = Object.assign({}, step, { position: 'center' });
}
```

Also ensure touch events on `#st-coach-next` are handled (native `<button>` handles this automatically).

#### TT-6: Accessibility

- `role="dialog"` + `aria-labelledby="st-coach-title"` already in the markup
- `aria-modal="false"` — does not steal focus, user can interact behind it
- Focus moves to `#st-coach-next` when popover opens (`_el.querySelector('button:last-child').focus()`)
- Escape key dismisses: add `keydown` listener on document while `_active`
- `aria-live="polite"` on `#st-coach-text` for screen-reader announcement of step changes

### 2.4 Files Changed

| File | Changes |
|------|---------|
| `index.html` | `<div id="st-coach">` markup; `<script src="src/ui/coach.js">` |
| `src/ui/coach.js` | New file — `ST._UI.createCoachMarks()` factory |
| `src/ui.js` | Call `createCoachMarks().start()` after audio init; wire `advanceTo()` on build events |
| `styles/main.css` | `#st-coach`, `#st-coach-arrow`, `#st-coach-*` styles |

### 2.5 Tour Content (Final Step List)

| # | Target element | Title | Text |
|---|---------------|-------|------|
| 1 | — (center) | Welcome to Synth Town | Your city is a synthesizer. Buildings make sounds, vehicles trigger them. |
| 2 | `#toolbar` | Pick the Road Tool | Select Road and click the grid to lay roads. Vehicles drive on roads. |
| 3 | `#toolbar` | Place a Building | Each building type plays a different waveform. Hover to preview the sound. |
| 4 | `#btn-play` | Press Play | Vehicles will start moving and trigger nearby buildings — music emerges! |
| 5 | `#slider-bpm` | Control the Tempo | Drag BPM to change the groove speed. Watch the beat-dot pulse in sync. |
| 6 | `#score-display` | Grow Your City | Score rises as vehicles trigger buildings. Unlock new tools as you progress. |

---

## Priority Matrix

| Priority | Item | Effort | Depends on |
|----------|------|--------|-----------|
| 🔴 P0 | MB-3: Canvas touch events | Low | game.js refactor |
| 🔴 P0 | MB-1: Tablet CSS breakpoint (icon strip) | Low | toolbar.js label wrap |
| 🟠 P1 | MB-2: Mobile transport wrap | Low | CSS only |
| 🟠 P1 | MB-4: Properties bottom sheet on mobile | Low | CSS only |
| 🟠 P1 | TT-1/2/3: Coach mark system | Medium | coach.js new file |
| 🟠 P1 | TT-4: Integration with build events | Low | coach.js done |
| 🟡 P2 | MB-6: 44px touch targets | Low | CSS only |
| 🟡 P2 | MB-5: Toolbar drawer on mobile | Medium | CSS + JS toggle button |
| 🟢 P3 | MB-7: Pinch-zoom on canvas | High | tile size refactor |
| 🟢 P3 | TT-5: Mobile popover repositioning | Low | coach.js |
| 🟢 P3 | iOS safe-area insets | Low | CSS env() |

---

## Notes on Sequencing

1. **Start with MB-3 (touch events)** — without touch support the entire game is unplayable on mobile; everything else is polish.
2. **MB-1 + MB-2** are pure CSS changes — low risk, do them together.
3. **TT-1/2/3** (coach marks) are independent of mobile layout — can be developed in parallel.
4. **TT-4 integration** should happen after `coach.js` is stable.
5. **MB-5 (drawer)** and **MB-4 (bottom sheet)** require coordinated JS + CSS — do after MB-1/2 are verified.
