# Synth Town — Audio Engineering Improvement Plan

> Part of the [Future Work Overview](./futurework.md)

---

## 1. Current State Analysis

### 1.1 Rhythmic Alignment — FAIL

**Finding:** Build and vehicle-trigger actions are NOT quantized to the BPM grid.

Vehicle movement is continuous (`progress += dt * speed`), which means a vehicle arrives at a building tile at a floating-point time dictated by frame timing — not by musical beats. The result is that the city generates sounds *at* notes (correct pitches) but *not on* beats (incorrect timing).

```js
// vehicles.js:116 — speed is BPM-linked, but progress is float-interpolated
const speed = (ST.Audio.getBPM() / 120) * 2.0;
vehicle.progress += dt * speed;
// _triggerNearby() fires at an arbitrary sub-beat moment
```

**Impact:** The city sounds like random arpeggios rather than a groove. No musical phrases form. This is the single largest disconnect between the game's promise and its feel.

### 1.2 Sonic Layering — PARTIAL

**Finding:** The audio chain has good bones (compressor → delay → reverb sends), but the city does not sound "bigger" as it grows.

- 5 waveform types = 5 oscillator timbres ✅
- Voice stealing at 8 voices enforced ✅
- No continuous ambient layer — city is silent between vehicle passes ❌
- Score tier names ("Street Groove", "Urban Pulse") imply sonic growth but audio is flat ❌
- Effects preset is a single global switch, not influenced by city density ❌

### 1.3 Harmonic Progress — WEAK

**Finding:** C major pentatonic scale prevents dissonance, but there is no melodic intention.

- Pitch is assigned randomly on placement (`_randomPitch()` from PENTATONIC_HZ) ❌
- No awareness of neighbor pitches — adjacent buildings may clash rhythmically ❌
- Merging (level upgrade) produces no pitch resolution, no harmonic reward ❌
- No chord or scale progression logic exists ❌

### 1.4 Audio Latency / Performance

**Finding:** Multiple performance risks identified.

| Issue | Location | Risk |
|-------|----------|------|
| Reverb impulse generated synchronously | `effects.js:_createImpulse()` | Stutter on first gesture (~2s × 44100 samples) |
| New OscillatorNode + GainNode per trigger | `audio.js:trigger()` | GC pressure at high voice rates |
| `Score.calculate()` calls `forEachTile` | `score.js:calculate()` | O(300) per second, avoidable |
| `drawFrame()` iterates grid 4 times | `renderer.js:drawFrame()` | Redundant passes on static tiles |

---

## 2. Quick Wins (P0 — 1–2 hours each) — ✅ IMPLEMENTED 2026-03-01

### QW-A1: BPM-Quantized Trigger Scheduling ✅

**Problem:** Triggers fire at arbitrary float times.

**Solution:** Accumulate a beat phase counter in the game loop. When a vehicle crosses a tile, schedule the trigger at the *next beat boundary* using `AudioContext.currentTime`.

```js
// In ST.Game._loop — add a beat clock
let _beatPhase = 0;
const beatsPerSec = ST.Audio.getBPM() / 60;
_beatPhase = (_beatPhase + dt * beatsPerSec) % 1.0;
// Expose: ST.Game.getBeatPhase() for vehicles to read

// In _triggerNearby — schedule to next 16th note
const ctx = ST.Audio.getContext();
const now = ctx.currentTime;
const beatDur = 60 / ST.Audio.getBPM();
const phase = ST.Game.getBeatPhase();
// Snap to next 16th note grid (4 per beat)
const subdivision = 4;
const gridDur = beatDur / subdivision;
const phaseInGrid = (phase % (1 / subdivision)) * beatDur;
const delay = gridDur - phaseInGrid;
// Pass `startTime: now + delay` to ST.Audio.trigger()
```

**Result:** City sounds rhythmically locked. Grooves emerge.

### QW-A2: Building Placement Confirmation Sound ✅

**Problem:** Placing a building is silent (only roads play `_playCFeedback()`).

**Solution:** Add a waveform-specific "placement ping" in `ST.UI._onCanvasAction` when the building tool succeeds.

```js
// After ST.Buildings.create() returns non-null
const def = ST.Buildings.TYPES[_tool];
ST.Audio.trigger({
  waveform: def.waveform,
  pitch: building.pitch,
  attack: 0.01,
  decay: 0.12,
  velocity: 0.25,
  sendDelay: 0,
  sendReverb: 0.1
});
```

**Result:** Immediate audio confirmation of every creative act. Each building type sounds distinct on placement.

### QW-A3: Delay Time BPM Re-Sync on BPM Change ✅

**Problem:** `Effects.init()` sets `delayTime = 60 / BPM / 2` once at startup. BPM slider changes are not reflected in delay time.

**Affected code:** `effects.js` — `setDelayTime` exists but is never called when BPM changes.

**Solution:** Call `ST.Effects.setDelayTime(60 / bpm / 2)` inside `ST.Audio.setBPM()`.

```js
// audio.js — setBPM
setBPM: function(bpm) {
  _bpm = Math.max(ST.Config.BPM_MIN, Math.min(ST.Config.BPM_MAX, bpm));
  if (ST.Effects && ST.Effects.getDelay()) {
    ST.Effects.setDelayTime(60 / _bpm / 2);
  }
}
```

**Result:** BPM slider becomes a real-time groove control that affects echo timing.

---

## 3. Core Architecture Improvements (P1 — half-day each) — ✅ IMPLEMENTED 2026-03-01

### CA-A1: Ambient City Drone Layer ✅

**Problem:** The city is silent between vehicle passes. This breaks immersion — a real synth city would hum.

**Design:** Add a continuous low-level drone that reflects city density. As buildings accumulate, the drone gains complexity.

```
City density → drone architecture:
  0–10 buildings: silence
  11–20 buildings: single sine sub-bass (root note C2)
  21–35 buildings: + filtered noise pad (HPF @ 200Hz)
  36–50 buildings: + slowly-modulated sawtooth (LFO @ 0.1Hz)

The drone gain is `buildingCount / MAX_BUILDINGS * 0.08` (max 8% of master)
```

**Implementation in `ST.Audio`:**
- Add `_droneOsc`, `_droneLFO`, `_droneGain` to audio module
- `updateDrone(buildingCount)` called from `ST.Game._loop` every 5 seconds (not every frame)
- Drone parameters smoothed via `setTargetAtTime()` to avoid clicks

**Result:** The city "breathes". Players feel the world is alive even when vehicles are sparse.

### CA-A2: Per-Type Filter Envelope Modulation ✅

**Problem:** Each building type sounds the same volume/brightness regardless of the vehicle that triggers it. The bus (heaviest vehicle) should make buildings sound "bigger".

**Design:** Vehicle type modifies the trigger filter envelope:

| Vehicle | Filter Type | Cutoff | Q |
|---------|-------------|--------|---|
| Car | lowpass | 3000 Hz | 1.0 |
| Bicycle | bandpass | 2200 Hz | 2.0 |
| Bus | lowpass | 800 Hz | 0.5 (warm, fat) |

Pass `filterType`, `filterCutoff`, `filterQ` in `_triggerNearby()` based on vehicle type.

This is already scaffolded: `ST.Audio.trigger()` accepts `filterType` and `filterCutoff` today.

**Result:** Bus sounds like a wall of bass; bicycle sounds like a bright ping. Vehicles become timbral instruments, not just speed modifiers.

### CA-A3: Scale-Aware Pitch Assignment on Placement ✅

**Problem:** `_randomPitch()` picks randomly from PENTATONIC_HZ. Adjacent buildings create no harmonic relationship.

**Design:** On placement, analyze the 4 cardinal neighbors' pitches. Choose the pentatonic note that forms the strongest interval:

```
Priority order of intervals (in pentatonic):
  1. Unison/Octave (ratio 2:1) — if neighbor is in same pitch class
  2. Perfect fifth (ratio 3:2)
  3. Minor third (ratio 6:5)
  4. Random fallback

Cap: no more than 2 consecutive identical pitches in any direction.
```

This is purely deterministic — no chord theory needed, just ratio math on Hz values.

**Result:** Cities naturally develop melodic phrases along road corridors.

---

## 4. Scalability Refactors (P2 — 1 day)

### SR-A1: Async Impulse Response Generation ✅

**Problem:** `_createImpulse(ctx, 2.0, 3)` in `effects.js` allocates `2 × sampleRate × 2` floats synchronously (≈176,400 floats at 44,100 Hz). On slow devices this blocks the main thread during `Effects.init()`.

**Solution:** Use `OfflineAudioContext` to generate the impulse response off-thread:

```js
function _createImpulseAsync(ctx, dur, decay, callback) {
  const offCtx = new OfflineAudioContext(2, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
  // Generate in offline context, then callback with buffer
  offCtx.startRendering().then(function(renderedBuffer) {
    callback(renderedBuffer);
  });
}
```

Until the buffer is ready, reverb operates dry. This prevents the startup stutter.

### SR-A2: Score Counter Cache ✅

**Problem:** `ST.Score.calculate()` is called every 1.0 second by `ST.Game._loop` AND on every `Unlocks.check()` call. It iterates all buildings + full tile grid each call.

```js
// score.js — this runs O(GRID_W × GRID_H) = O(300) each call for sign count
ST.Grid.forEachTile(function(tile) { if (tile.sign) signCount++; });
```

**Solution:** Cache sign count in `ST.Signs` as an incrementing/decrementing counter (similar to how `ST.Buildings.count()` and `ST.Roads.count()` already work). Expose `ST.Signs.count()`. Then `Score.calculate()` becomes O(1).

### SR-A3: Voice Node Pre-Allocation (Object Pool) ✅

**Problem:** `ST.Audio.trigger()` calls `_ctx.createOscillator()` and `_ctx.createGain()` on every trigger event. Web Audio nodes are not cheap to create — GC pressure increases with rapid vehicle-building interactions.

**Solution:** Pre-allocate a pool of `MAX_VOICES` oscillator/gain node pairs. Reset parameters and reconnect rather than destroy/create. This is the standard Web Audio performance pattern.

Note: Oscillator nodes cannot be restarted after `.stop()`, so the pool must use a "borrow/recycle" pattern where `stop()` is replaced by gain envelope fade-out.

**Implemented:** Each pool slot is `{ osc, filter, env, dSend, rSend, busyUntil, sendsConnected }`. All oscillators start on `init()` and run forever at `env.gain = 0` when idle. On trigger: `cancelScheduledValues` → set params → schedule envelope. Filter defaults to `allpass` (bypass). Send gains wired lazily on first use.

---

## 5. Feature Roadmap — Musical Milestones (P3)

### FM-A1: Chord Mode (Score ≥ 400)

When the player reaches "Urban Pulse" tier, unlock Chord Mode toggle in transport bar. In Chord Mode:
- When a vehicle triggers a building, also trigger its **fifth** (pitch × 1.5) at -6dB
- The city shifts from monophonic to harmonic

### FM-A2: Bass Drop Event

**Trigger:** Player reaches "Synth City" tier (1000 pts) for the first time.

**Event sequence:**
1. All vehicles stop (0.5s)
2. Master gain ducks to 20% over 1.5s (`setTargetAtTime`)
3. A sub-bass oscillator sweeps from 40Hz → 80Hz over 2s
4. Master gain returns to 100% over 0.5s
5. All vehicles resume at double speed for 4 seconds ("drop" feel)
6. Toast: "🔊 Synth City — Bass Drop!"

### FM-A3: Key Change on Merge

**Trigger:** Player upgrades a building to level 5 (set via property panel → level slider).

**Event:** Transpose all building pitches by a perfect fourth (+5 semitones) using a `setValueAtTime` on each building's pitch. This is a harmonic "resolution" moment — the city modulates to a new key.

Visual: All buildings flash white simultaneously.

### FM-A4: Generative Melody Mode (Stage 10 Candidate)

An opt-in "Auto-Compose" mode where the game places vehicles on an optimal route to create a pentatonic melody, ordered by building x-position (left to right = low to high). The player can then edit the route manually. This bridges the gap between "city builder" and "sequencer" in the most explicit way.
