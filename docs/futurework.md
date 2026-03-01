# Synth Town Remake — Future Work Overview

> **Creative Director & Lead Audio-Programmer Review**
> Date: 2026-03-01
> Codebase: Stages 1–7 complete, Stage 8–9 in progress

---

## Executive Summary

Synth Town Remake is a conceptually strong project — the core metaphor (buildings = oscillators, vehicles = playheads) is coherent and unique. However, a significant gap exists between the **narrative promise** (a playable synthesizer city) and the **felt experience** (a grid-based toy where music happens incidentally). The city does not *sound alive* — it only makes sounds when vehicles pass buildings, and those sounds carry no rhythmic intentionality.

The three critical deficits are:

1. **No quantization** — build actions and vehicle triggers are not snapped to the BPM grid. The result is rhythmically incoherent sound, not music.
2. **No sonic evolution** — the soundscape is identical whether the city has 2 buildings or 50. Score tiers name musical milestones ("Street Groove", "Urban Pulse") but do not change the audio.
3. **No feedback dopamine loop** — placing a building is silent; merging (upgrading) produces no resolution sound. The connection between player action and musical reward is broken.

---

## Document Index

| File | Focus |
|------|-------|
| [futurework_audio.md](./futurework_audio.md) | Quantization, voice architecture, sonic layering, effects |
| [futurework_mechanics.md](./futurework_mechanics.md) | Core loop, scoring economy, ADSR curve, musical milestones |
| [futurework_ux.md](./futurework_ux.md) | Tactile feedback, visual juice, onboarding, accessibility |

---

## Priority Matrix

| Priority | Item | File | Effort | Status |
|----------|------|------|--------|--------|
| 🔴 P0 | BPM-quantized vehicle triggers | audio | Low | ✅ Done (QW-A1) |
| 🔴 P0 | Placement sound on building drop | ux | Low | ✅ Done (QW-A2/U1) |
| 🔴 P0 | Merge/upgrade audio resolution sound | ux | Low | ✅ Done (QW-M1) |
| 🔴 P0 | Delay BPM re-sync on BPM change | audio | Low | ✅ Done (QW-A3) |
| 🔴 P0 | Vehicle spawn proximity trigger | ux | Low | ✅ Done (QW-M3) |
| 🔴 P0 | Remove tool confirmation sound | ux | Low | ✅ Done (QW-U2) |
| 🔴 P0 | Score display reactivity | mechanics | Low | ✅ Done (QW-M2) |
| 🔴 P0 | Hover preview hum | ux | Low | ✅ Done (QW-U3) |
| 🔴 P0 | BPM beat-pulse indicator | ux | Low | ✅ Done (QW-U4) |
| 🟠 P1 | Per-vehicle filter envelope (bus=warm, bicycle=bright) | audio | Low | ✅ Done (CA-A2) |
| 🟠 P1 | Scale-aware pitch assignment on placement | mechanics | Medium | ✅ Done (CA-A3) |
| 🟠 P1 | Score tier unlocks audio preset progression | mechanics | Medium | ✅ Done (CLR-M4) |
| 🟠 P1 | Harmony bonus in score formula | mechanics | Medium | ✅ Done (CLR-M1) |
| 🟠 P1 | Level ties to musical overtone range | audio | Medium | ✅ Done (CLR-M3) |
| 🟠 P1 | Screen shake + particle burst on merge | ux | Medium | ✅ Done (JD-U1/U2) |
| 🟠 P1 | Signs count cache (O(1) score) | audio | Low | ✅ Done (SR-A2) |
| 🟠 P1 | Async reverb impulse generation | audio | Medium | ✅ Done (SR-A1) |
| 🟠 P1 | Ambient city drone (city "hum") | audio | Medium | ✅ Done (CA-A1) |
| 🟡 P2 | AudioNode object pooling | audio | Medium | ✅ Done (SR-A3) |
| 🟡 P2 | Off-beat indicator (visual metronome) | ux | Low | ✅ Done (beat-dot) |
| 🟡 P2 | Score tier transition + arpeggio | ux | Low | ✅ Done (JD-U4) |
| 🟡 P2 | Unlock celebration (chord stab + shake) | ux | Low | ✅ Done (JD-U3) |
| 🟡 P2 | Onboarding 5-step musical flow | ux | Medium | ✅ Done (OB-U1/U2) |
| 🟡 P2 | Tooltip system for all UI elements | ux | Medium | ✅ Done |
| 🟢 P3 | Chord Mode toggle (fifth on every note) | audio | Medium | ✅ Done (FM-A1) |
| 🟢 P3 | "Bass Drop" musical milestone event | mechanics | High | ✅ Done (FM-A2) |
| 🟢 P3 | Key Change on Merge (level 5 → transpose +5st) | audio | Medium | ✅ Done (FM-A3) |
| 🟢 P3 | Beat Grid playhead overlay | ux | Low | ✅ Done (AC-U1) |
| 🟢 P3 | Harmonic District golden glow | mechanics | Medium | ✅ Done (MM-M2, visual) |
| 🟢 P3 | Per-building filter envelope modulation | audio | High | ⬜ Pending |

---

## Quality Gate Assessment

| Gate | Status | Notes |
|------|--------|-------|
| First musical pattern within 60–90s | ✅ Pass | Placement sound + hover hum + spawn trigger now guide the player |
| 3 building types distinguishable by sound | ✅ Pass | Sine/Square/Triangle clearly distinct |
| Car/Bicycle/Bus audibly distinct | ✅ Pass | Filter envelope now makes bus=warm, bicycle=bright, car=neutral |

## Implementation Progress

**Wave 1 (2026-03-01): All P0 + P1 priority items implemented**

Changes applied:
- `audio.js`: delay time syncs with BPM; quantized `startTime` parameter for triggers
- `vehicles.js`: per-vehicle filter (CA-A2), quantized trigger scheduling (QW-A1), spawn trigger (QW-M3), level-based overtone layers (CLR-M3)
- `buildings.js`: scale-aware pitch selection (CA-A3), placementFlash bounce animation (QW-U1)
- `ui.js`: hover hum oscillator (QW-U3), remove sounds (QW-U2), level-up controls + sound (QW-M1), immediate score refresh (QW-M2)
- `game.js`: beat phase clock (QW-A1), beat-dot pulse (QW-U4), tier auto-preset (CLR-M4), particle update loop (JD-U2)
- `renderer.js`: screen shake (JD-U1), particle burst system (JD-U2)
- `score.js`: harmony bonus formula (CLR-M1), cached sign count (SR-A2)
- `signs.js`: `count()` API + cached `_signCount` (SR-A2)
- `effects.js`: async impulse generation (SR-A1), `setPresetAuto()` + `isManualPreset()` (CLR-M4)
- `index.html` + `styles/main.css`: beat-dot element and styles, level-button styles

**Wave 3 (2026-03-01): P2 audio performance — AudioNode pool (SR-A3)**

Changes applied:
- `audio.js`: replaced per-trigger node creation with a pre-allocated pool of `MAX_VOICES` slots (osc + filter + gain + delay send + reverb send). Oscillators run continuously at gain=0 when idle. Sends connected lazily on first effect use. Eliminates GC pressure from oscillator creation/destruction.

**Wave 2 (2026-03-01): P1 remaining + P2 UX/audio items**

Changes applied:
- `audio.js`: ambient city drone oscillator (CA-A1) — C2 sub-bass, volume proportional to building count
- `game.js`: tier celebration arpeggio + gold flash + shake (JD-U4); drone update every frame
- `ui.js`: tooltip infrastructure `_showTooltip / _moveTooltip / _hideTooltip` exposed on `ST._UI`; transport element tooltips; unlock celebration chord stab + shake (JD-U3)
- `ui/defs.js`: tooltip text added to all tool, building, vehicle, sign defs; `PRESET_TOOLTIPS` map
- `ui/toolbar.js`: `_attachTip()` helper wired to all toolbar and preset buttons
- `ui/onboarding.js`: 5-step musical flow with `onTrigger()` method + 90s nudge timer (OB-U1/U2)
- `index.html`: `<div id="st-tooltip">` tooltip container
- `styles/main.css`: `#st-tooltip` styles; `.st-tier-flash` gold keyframe animation

**Wave 4 (2026-03-01): P3 — Chord Mode + Bass Drop**

Changes applied:
- `vehicles.js`: `_chordMode` flag adds a perfect fifth at -6dB on every trigger (FM-A1); `_speedMult` multiplier for tempo events (FM-A2); exposed `setChordMode()`, `getChordMode()`, `setSpeedMult()`
- `game.js`: `_bassDrop()` fires once at Synth City tier — ducks master gain, plays 40→80Hz sub-bass sweep over 2s, doubles vehicle speed for 4s, heavy screen shake (FM-A2); `_celebrateTierUp()` routes Synth City to bass drop; chord button unlocked in DOM at Urban Pulse+
- `ui.js`: chord button click handler — toggles chord mode, shows toast, updates `st-active` class
- `index.html`: `<button id="btn-chord">` in transport bar (locked by default)
- `styles/main.css`: `#btn-chord` + `#btn-chord.st-active` styles

**Wave 5 (2026-03-01): P3 — Key Change, Beat Grid, Harmonic District**

Changes applied:
- `buildings.js`: `transposePitches(semitones)` — multiplies all pitches by `2^(n/12)`, flashes all buildings (FM-A3)
- `ui.js`: level-up handler fires key change + shake + toast when building reaches level 5 (FM-A3); beat grid button wired + tooltip
- `renderer.js`: `_gridOverlay` flag + `_drawBeatGrid()` sweeping playhead line (AC-U1); `_detectHarmonicDistricts()` + `_drawHarmonicDistricts()` golden dashed glow (MM-M2); exposed `setGridOverlay()`, `isGridOverlay()`
- `index.html`: `<button id="btn-grid">` added to transport bar
- `styles/main.css`: `#btn-grid` styles
