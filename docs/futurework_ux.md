# Synth Town — UX & Visual Polish Improvement Plan

> Part of the [Future Work Overview](./futurework.md)

---

## 1. Current State Analysis

### 1.1 Tactile Feedback — WEAK

**Finding:** The game has almost no immediate sensory confirmation for player actions.

| Action | Audio Feedback | Visual Feedback |
|--------|---------------|-----------------|
| Place road | ✅ triangle click (900Hz, 0.1 vel) | ✅ road tile appears |
| Place building | ❌ silent | ✅ building appears |
| Remove tile | ❌ silent | ✅ tile disappears |
| Spawn vehicle | ❌ silent | ✅ vehicle appears |
| Level up building | ❌ silent | ✅ building gets taller |
| Vehicle triggers building | ✅ oscillator note | ✅ building flash glow |
| BPM change | ❌ silent | ✅ slider updates |
| Unlock new feature | ⚠️ toast only | ⚠️ toast only |

Road placement feedback exists but is barely audible (`velocity: 0.1` = 10% gain). Every other placement action is completely silent.

**The road click sound itself is wrong in concept** — it is a constant 900Hz triangle regardless of which road type is being placed. It provides no musical information about the tile being created.

### 1.2 "Instrument Feel" — MISSING

A musical instrument provides immediate, unambiguous physical feedback. Playing a key produces a sound in under 1ms. In Synth Town, the closest equivalent — clicking a building — produces no sound at all.

**Comparison:**
- Piano key → sound: 0ms latency ✅
- Synth Town building click → sound: 0ms (only when vehicle passes, could be 5+ seconds) ❌

The property panel's piano picker does play notes when selecting a pitch — this is the one place where the instrument metaphor works. It should be extended to all building interactions.

### 1.3 Hover Preview — PASSIVE

**Finding:** Hover preview shows a blue/red tint but communicates no audio information.

The hover state is an opportunity to "preview" what the placed building will sound like. Currently it shows only a spatial validity check.

### 1.4 Onboarding — INCOMPLETE FOR AUDIO

**Finding:** The 4-step onboarding covers mechanics (what to click) but not the musical goal (why to click).

Current steps inferred from `ui/onboarding.js`:
1. Step 0: "Click to start audio"
2. Step 1: (presumably: place a road)
3. Step 2: (presumably: place a building)
4. Step 3: (presumably: spawn a vehicle)

Missing: a step that explicitly says "listen to your city play" and draws attention to the building flash + sound connection.

---

## 2. Quick Wins (P0 — 1–4 hours each)

### QW-U1: Building Placement Sound + Visual Pop

**Problem:** Silent placement breaks the "instrument" metaphor.

**Solution:** On successful building create, play a waveform-specific confirmation note AND add a "pop" scale animation.

**Audio:** Already described in `futurework_audio.md:QW-A2`.

**Visual pop:** Add a temporary CSS transform to the canvas draw. In `ST.Buildings.draw()`, when `b.flash === 1.0` (the moment of first flash from `_triggerNearby` or from placement):

```js
// In ST.Buildings.create() — set a placement flash distinct from trigger flash
building.placementFlash = 1.0; // decays over 0.3s (faster than trigger flash)

// In ST.Buildings.draw() — scale effect on placement
if (b.placementFlash > 0) {
  const scale = 1 + b.placementFlash * 0.25; // up to 25% scale overshoot
  ctx.save();
  const cx = b.x * TILE + TILE / 2;
  const cy = b.y * TILE + TILE / 2;
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  ctx.translate(-cx, -cy);
  // ... draw building ...
  ctx.restore();
}
```

**Result:** Buildings "pop" into existence with a bounce. Combined with the placement note, every click feels like pressing a key on a synthesizer.

### QW-U2: Remove Tool Confirmation Sound

**Problem:** Removing a tile is silent. Players delete things they didn't intend to and get no feedback.

**Solution:** A descending pitch sweep (portamento down) when a building is removed. A short "whoosh" noise when a road is removed.

```js
// Building removal — descending sine
ST.Audio.trigger({ waveform: 'sine', pitch: 440, decay: 0.2, velocity: 0.15 });
// Follow with a second trigger at lower pitch (simulate portamento)
setTimeout(() => ST.Audio.trigger({ waveform: 'sine', pitch: 220, decay: 0.15, velocity: 0.08 }), 80);

// Road removal — noise burst (use sawtooth with short decay as approximation)
ST.Audio.trigger({ waveform: 'sawtooth', pitch: 80, decay: 0.08, velocity: 0.1 });
```

### QW-U3: Hover Preview Hum

**Problem:** Hovering over an empty tile with a building tool selected shows a color change but no audio preview.

**Solution:** When hovering over a valid placement tile with a building tool, play a very quiet, continuous hum at the pitch that would be assigned (using the scale-aware logic from `futurework_audio.md:CA-A3`, or fallback to building type's `pitchDefault`).

**Implementation constraint:** The hum must be an oscillator node connected to a gain that ramps to 0 when the hover ends. Do NOT use `ST.Audio.trigger()` (which creates a finite envelope). Instead maintain a dedicated hover oscillator:

```js
// In ST.UI — hover state
let _hoverOsc = null;
let _hoverGain = null;

function _startHoverHum(waveform, pitch) {
  if (!ST.Audio.isReady()) return;
  _stopHoverHum();
  const ctx = ST.Audio.getContext();
  _hoverOsc = ctx.createOscillator();
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
  if (_hoverGain) {
    const ctx = ST.Audio.getContext();
    _hoverGain.gain.setTargetAtTime(0, ctx.currentTime, 0.02);
    _hoverOsc.stop(ctx.currentTime + 0.1);
    _hoverOsc = null; _hoverGain = null;
  }
}
```

**Result:** The cursor becomes an audio probe. Players "hear" what a building will sound like before committing. This is the "instrument feel" the game promises.

### QW-U4: BPM Slider Beat-Pulse Indicator

**Problem:** The BPM slider is a static UI element with no relationship to the music playing.

**Solution:** Add a small visual metronome indicator next to the BPM display — a dot that pulses on beat 1, 2, 3, 4 in sync with `ST.Game.getBeatPhase()`. Color-coded: beat 1 = accent (blue), beats 2–4 = dim.

```css
#beat-dot {
  width: 8px; height: 8px;
  border-radius: 50%;
  background: var(--accent);
  transition: transform 0.05s, opacity 0.05s;
}
#beat-dot.pulse { transform: scale(1.8); opacity: 1.0; }
#beat-dot:not(.pulse) { transform: scale(1.0); opacity: 0.3; }
```

The class `pulse` is toggled by checking when `_beatPhase` crosses integer beat boundaries in `ST.Game._loop`.

---

## 3. Juice & Dopamine Enhancements (P1)

### JD-U1: Screen Shake on Musical Events

**Problem:** No physical "impact" feeling on key moments (vehicle triggers building, Bass Drop, level up).

**Solution:** A lightweight canvas translate-based shake. Store a `_shakeAmount` and `_shakeDecay` in `ST.Renderer`. On shake trigger, apply a random offset to `ctx.translate()` before drawing.

```js
// In ST.Renderer
let _shake = 0;

function applyShake(ctx) {
  if (_shake <= 0) return;
  const dx = (Math.random() - 0.5) * _shake;
  const dy = (Math.random() - 0.5) * _shake;
  ctx.translate(dx, dy);
  _shake = Math.max(0, _shake - 0.5);
}

// Public API
markShake: function(intensity) { _shake = Math.min(8, _shake + intensity); }
```

**Shake intensities:**
- Vehicle triggers building: `0.5` (subtle)
- Level up (merge): `2.0` (punchy)
- Bass Drop: `5.0` (full shake, 0.5s decay)
- Unlock new feature: `1.5`

### JD-U2: Particle Burst on Building Flash

**Problem:** The current flash is a glow (CSS `shadowBlur`) that appears and fades. It has no directionality or energy.

**Solution:** On `b.flash = 1.0`, emit 4–6 pixel particles that fly outward from the building in random directions, then fade over 0.4s.

```js
// Lightweight particle system — store in ST.Effects or ST.Renderer
const _particles = [];

function emitParticles(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 20 + Math.random() * 30; // px/s
    _particles.push({
      x: x, y: y, color: color,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1.0, size: 2 + Math.random() * 2
    });
  }
}

function updateAndDrawParticles(ctx, dt) {
  for (let i = _particles.length - 1; i >= 0; i--) {
    const p = _particles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt * 2.5;
    if (p.life <= 0) { _particles.splice(i, 1); continue; }
    ctx.globalAlpha = p.life;
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - p.size/2, p.y - p.size/2, p.size, p.size);
  }
  ctx.globalAlpha = 1.0;
}
```

**Triggered from:** `ST.Buildings.draw()` when `b.flash > 0.95` (first frame of flash). Particles use `b.color`.

### JD-U3: Unlock Celebration Animation

**Problem:** Feature unlocks only show a text toast. The toolbar button just appears.

**Solution:** When a new tool is unlocked:
1. The new toolbar button slides in from the left with a CSS animation
2. A chord stab plays (major triad at C4)
3. A golden ring particle burst plays at the button position
4. The toast includes the button's color dot: "🎵 Bicycle unlocked"

### JD-U4: Score Tier Transition Effect

**Problem:** Crossing a score threshold produces no celebration — the tier name just changes in the display.

**Solution:** On tier transition:
1. The score display flashes gold for 1 second
2. A "level up" ascending arpeggio plays (C4 → E4 → G4, 100ms apart)
3. The tier name slides in from the bottom with a CSS transition
4. If it's "Synth City" (max tier), the Bass Drop event fires (see mechanics plan)

---

## 4. Accessibility & Clarity (P2)

### AC-U1: Visual BPM Grid Overlay (Optional)

A toggle in the transport bar (disabled by default): **"Show Beat Grid"**

When enabled, a thin vertical line sweeps across the canvas from left to right, completing one sweep per beat. Buildings near the line "light up" slightly (subtle fill brightness increase) as the playhead approaches, giving a sequencer-style visual.

This is the most direct expression of the "city as sequencer" concept — a DAW-style playhead moving through the city.

### AC-U2: Building Type Legend

**Problem:** New players don't know what the 5 building types sound like without experimentation.

**Solution:** On first hover over a building toolbar button (before first placement), show a tooltip that auto-plays a 0.5s preview of the waveform at its default pitch. The tooltip includes:

- Waveform name and shape icon
- "Sounds like: [description]" (e.g., "Sine: warm, pure tone")
- A tiny animated waveform SVG

### AC-U3: Route Visualization Mode

**Problem:** Players can't see which roads a vehicle will travel. Road networks are opaque.

**Solution:** Holding Shift while hovering a vehicle shows the tiles it has visited (dashed blue trail) and arrows indicating preferred directions based on sign placement.

### AC-U4: Color-Blind Mode

The current palette (blue/red/green/orange/purple buildings) relies entirely on hue. Adding secondary shape-based differentiation for all game elements:

| Element | Color-Blind Addition |
|---------|---------------------|
| Hover: valid | Solid blue border + checkmark icon |
| Hover: invalid | Dashed red border + X icon |
| Building flash | Concentric rings outward (not just glow) |
| Score tiers | Icon badges next to tier name |

---

## 5. Onboarding Overhaul (P2)

### OB-U1: Revised 5-Step Onboarding

Replace the current 4-step flow with a musically-focused sequence:

**Step 0 — "Click to start"**
> (unchanged — Web Audio gesture requirement)

**Step 1 — "Draw a road"**
> "Roads are the rhythm track. Draw a few tiles."
> Highlight: road button glows. Click anywhere valid to advance.

**Step 2 — "Place a building"**
> "Buildings are instruments. Each shape makes a different sound."
> Highlight: sine building button glows. Place a building → play its note immediately.
> New: HEAR the placement note (QW-A2 must be implemented first).

**Step 3 — "Spawn a vehicle"**
> "Vehicles are your playheads. They drive through buildings and trigger notes."
> Highlight: car button glows. Spawn a car → it immediately triggers nearby buildings.
> New: HEAR the trigger sound within 2 seconds of spawn.

**Step 4 — "Listen to your city"**
> "You've built your first musical city! Each pass creates a groove."
> Show: 4-beat counter animating. Flash: all vehicles and buildings pulse on beat.
> New: This step can only advance once the player has HEARD a vehicle trigger a building.

**Step 5 — "Make it yours"**
> "Try the piano picker to change pitches. Add effects. Change the BPM."
> Highlight: properties panel (click a building with select tool).
> Advance: auto-dismisses after 10s.

### OB-U2: "First Musical Moment" Detection

The onboarding should track whether the player has experienced the core audio loop. This is detected when:
- At least 1 vehicle has triggered at least 1 building (i.e., `_triggerNearby()` was called once)
- The player has not dismissed the overlay

If this has NOT happened within 90 seconds of game start, show a gentle nudge: "Try connecting your road to a building tile, then add a vehicle nearby."

---

## 6. Mobile & Responsive (P3)

### MB-U1: Touch Event Support

Currently, building placement only works via `click` and `mousemove` events. On touch devices, `touchstart` and `touchmove` are not handled, making the game unplayable on mobile.

**Implementation:** Add `touchstart`/`touchmove` event listeners in `ST.UI.init()` that extract `touch.clientX/Y` and call the same `_onCanvasAction` handler.

### MB-U2: Responsive Grid Scaling

`ST.Config.TILE = 32` is fixed. On a 375px mobile screen, `20 × 32 = 640px` wide grid overflows. The game should scale TILE down proportionally: `TILE = Math.floor(Math.min(window.innerWidth, window.innerHeight * (GRID_W/GRID_H)) / GRID_W)`.

This requires `TILE` to no longer be a constant — it becomes a computed value in `ST.Config` that updates on window resize.

### MB-U3: Simplified Mobile Toolbar

On mobile viewports (<600px), collapse the toolbar from 200px wide vertical to a 48px tall horizontal strip at the bottom, showing only icons (no labels). The properties panel slides up from the bottom as a sheet overlay instead of a right sidebar.
