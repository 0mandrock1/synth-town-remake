# Architecture

## Overview

Single-page app. No build step. All code lives in `index.html` (entry point) + `src/` + `styles/`.

```
index.html          entry, module load order, HTML layout
src/
  config.js         ST.Config   — constants
  audio.js          ST.Audio    — Web Audio API, voice pool, drone
  grid.js           ST.Grid     — 2D tile map (20×15)
  buildings.js      ST.Buildings — oscillator buildings, CRUD, draw
  roads.js          ST.Roads    — road tiles, auto-connect
  vehicles.js       ST.Vehicles  — playhead movement, trigger logic
  signs.js          ST.Signs    — traffic light, one-way, roundabout
  effects.js        ST.Effects  — compressor, delay, reverb, presets
  score.js          ST.Score    — score formula, tier thresholds
  unlocks.js        ST.Unlocks  — score-gated feature gates
  history.js        ST.History  — undo/redo command stack
  state.js          ST.State    — save/load (localStorage + URL hash)
  midi.js           ST.MIDI     — .mid file export
  renderer.js       ST.Renderer — canvas draw loop, particles, shake
  game.js           ST.Game     — RAF loop, beat clock, events
  ui/
    defs.js         ST._UI.DEFS     — toolbar/building/vehicle/sign defs
    onboarding.js   ST._UI.Onboarding — first-run hint flow
    piano.js        ST._UI.createPiano — note picker widget
    toolbar.js      ST._UI.buildToolbar — left sidebar builder
    coach.js        ST._UI.createCoachMarks — step-by-step tour
  ui.js             ST.UI — canvas input, transport, property panel
styles/
  main.css          all styles
tests/
  runner.html       browser test runner
  test_stage_*.js   per-stage tests
```

## Module load order (strict)

```
ST.Config → ST.Audio → ST.Grid → ST.Buildings → ST.Roads → ST.Vehicles
→ ST.Signs → ST.Effects → ST.Score → ST.Unlocks → ST.History
→ ST._UI.DEFS → ST._UI.Onboarding → ST._UI.createPiano
→ ST._UI.buildToolbar → ST._UI.createCoachMarks
→ ST.UI → ST.State → ST.MIDI → ST.Renderer → ST.Game → boot
```

No circular deps. Back-communication uses callbacks set to `null` by default:

```js
ST.Audio.onTrigger = null;   // set by UI to detect first vehicle trigger
```

## HTML layout

```html
<div id="app">
  <aside id="toolbar">         <!-- 200px left, icon strip at ≤1024px, drawer at ≤600px -->
  <div id="toolbar-backdrop">  <!-- mobile drawer backdrop -->
  <main><canvas id="game">     <!-- fills remaining width -->
  <aside id="properties">      <!-- 220px right (desktop) / bottom sheet (mobile) -->
  <footer id="transport">      <!-- 64px bottom -->
</div>
```

## Naming conventions

| What | Style | Example |
|------|-------|---------|
| Modules | `ST.PascalCase` | `ST.Audio`, `ST.Grid` |
| Public methods | `camelCase` | `getTile`, `autoConnect` |
| Private (IIFE) | `_camelCase` | `_calcRoadShape` |
| Constants | `UPPER_SNAKE_CASE` | `MAX_VOICES`, `TILE` |
| DOM ids | `kebab-case` | `btn-play`, `slider-bpm` |
| CSS classes | `st-kebab-case` | `st-toolbar`, `st-active` |

## Data flow

```
User click/touch → ST.UI._onCanvasAction
  → ST.Roads.place / ST.Buildings.create / ST.Vehicles.spawn / ST.Signs.place
  → ST.History.push (undo stack)
  → ST.Score.calculate → ST.Unlocks.check → ST.Game.celebrateTierUp (if new tier)

RAF loop (ST.Game._loop):
  → ST.Vehicles.update(dt)          — move vehicles, call _triggerNearby
      → ST.Audio.trigger(params)    — schedule oscillator at next 16th-note boundary
  → ST.Score.calculate              — every 1s
  → ST.Audio.updateDrone            — every 5s
  → ST.Renderer.drawFrame           — every frame
      → roads, buildings, vehicles, signs, particles, beat grid, harmonic districts
```

## Game objects

### Building
```js
{
  type: 'sine'|'square'|'triangle'|'sawtooth'|'pulse',
  x, y,          // grid tile coords
  pitch,         // Hz — C major pentatonic, scale-aware on placement
  level,         // 1–8, affects overtone layers (audio) and height (visual)
  decay,         // envelope release time (seconds)
  flash,         // 0.0–1.0, decays per frame, drives glow + particles
  placementFlash // 0.0–1.0, bounce animation on first place
}
```

### Vehicle
```js
{
  type: 'car'|'bicycle'|'bus',
  x, y,      // current tile
  dir,       // 'N'|'S'|'E'|'W'
  progress,  // 0.0–1.0 interpolation between tiles
  trail      // last 12 positions [{x,y}], shown on Shift+hover
}
```

### Tile (ST.Grid)
```js
{
  type: 'empty'|'road'|'building',
  roadDir: 'NSEW' (string of active directions),
  building: <Building>|null,
  sign: <Sign>|null
}
```

## Score formula

```
score = buildings×10 + roads×2 + vehicles×15 + uniqueTypes×20 + signs×10
      + harmonyBonus (max 200)

harmonyBonus: +15 per octave pair, +10 fifth, +8 fourth, +5 third
              — only for buildings within 2 tiles of each other
```

### Tiers

| Score | Name | Effect |
|-------|------|--------|
| 0 | Empty City | Dry (no effects) |
| 50 | First Beat | Reverb on; First Groove phrase plays |
| 150 | Street Groove | Delay on |
| 300 | City Rhythm | DJ Booth (btn-remix) unlocked |
| 600 | Urban Pulse | Chord Mode (btn-chord) unlocked |
| 1000 | Synth City | Bass Drop event (one-time) |

## Audio chain

```
OscillatorNode → BiquadFilterNode (per-building type) → GainNode (envelope)
  → masterGain → AudioContext.destination
  → delayInput (send) → delay → masterGain
  → reverbInput (send) → convolver → masterGain

Drone: separate OscillatorNode → droneGain → masterGain
```

Voice pool: `MAX_VOICES = 8` pre-allocated slots. Oscillators run continuously
at `gain=0` when idle (no GC pressure). Trigger = `cancelScheduledValues`
+ reschedule envelope on the slot with lowest `busyUntil`.

Triggers are quantized to the next 16th-note boundary via `AudioContext.currentTime`
+ beat phase from `ST.Game.getBeatPhase()`.

## Key limits (ST.Config)

| Constant | Value |
|----------|-------|
| GRID_W | 20 |
| GRID_H | 15 |
| TILE | 32 px |
| MAX_VEHICLES | 8 |
| MAX_VOICES | 8 |
| MAX_BUILDINGS | 50 |
| MAX_ROADS | 200 |
| BPM range | 60–180 |

## State serialization

`ST.State.serialize()` → JSON → base64 → `window.location.hash`.
Stores: buildings (type/x/y/pitch/level/decay), roads (x/y), vehicles (type/x/y/dir),
signs (type/x/y/params), BPM, volume, effects preset.

## Undo/Redo

`ST.History.push({ do: fn, undo: fn })` — command pattern.
`Ctrl+Z` = undo, `Ctrl+Y` / `Ctrl+Shift+Z` = redo.

## Renderer features

- `ST.Renderer.markShake(intensity)` — canvas translate shake (0–8px)
- `ST.Renderer.emitParticles(tileX, tileY, color, count)` — burst particles
- `setGridOverlay(bool)` — beat-grid playhead sweep line
- `setColorBlind(bool)` — ✓/✗ glyphs + ring flash instead of color-only signals
- Harmonic District detection: golden dashed outline on 3×3 clusters with ≥2 harmonic pairs

## Transport bar buttons

| Button | ID | Default | Unlock |
|--------|-----|---------|--------|
| Play/Pause | btn-play | visible | — |
| Beat dot | beat-dot | visible | — |
| BPM slider | slider-bpm | visible | — |
| Vol slider | slider-vol | visible | — |
| DJ Booth (remix) | btn-remix | locked | City Rhythm (300) |
| Chord Mode | btn-chord | locked | Urban Pulse (600) |
| Beat Grid | btn-grid | visible | — |
| MIDI export | btn-export-midi | visible | — |
| Color-Blind | btn-colorblind | visible | — |
| Toolbar toggle | btn-toolbar-toggle | mobile only | — |
