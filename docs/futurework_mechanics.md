# Synth Town — Game Mechanics Improvement Plan

> Part of the [Future Work Overview](./futurework.md)

---

## 1. Current State Analysis

### 1.1 The Dopamine Loop — Broken

The Dopamine Loop in a hyper-casual game typically follows: **Action → Immediate Reward → Anticipation → Next Action**. In Synth Town's current state:

```
Build road → [silent] → Place building → [silent] → Spawn vehicle → [sounds happen eventually]
```

The reward is deferred and indirect. The player does not know if what they built is "good" until vehicles have been moving for several seconds. There is no immediate positive confirmation.

Compare to a functioning loop:
```
Build road → [click sound] → Place building → [waveform-specific ping]
→ Spawn vehicle → [immediate nearby trigger] → City sounds musical → Build more
```

### 1.2 The Economy — Missing

**Finding:** There is no resource economy. Buildings, roads, and vehicles are free and unlimited (up to caps).

This removes the core tension of a city-builder. The player has no reason to make trade-offs. Musical creativity is completely decoupled from city growth — you can fill the grid with identical sine buildings and get a high score just as easily as building a thoughtful musical composition.

**Score formula analysis:**
```
score = buildings×10 + roads×2 + vehicles×15 + uniqueTypes×20 + signs×10
```

- `uniqueTypes×20` is the only mechanics-level incentive for diversity
- A player who places 5 different building types gets +100 score — meaningful but not compelling
- There is no per-building "yield" that varies with musical decisions (pitch, level)

### 1.3 The Complexity Curve — ADSR Model

In synthesizer terms, a great game should feel like:
- **Attack:** Instant feedback on first interaction — fast and satisfying
- **Decay:** Initial complexity peaks quickly — the player discovers the core loop
- **Sustain:** Mid-game options keep engagement — vehicles, signs, effects
- **Release:** End-game goals provide closure — score tiers, MIDI export

**Current ADSR mapping:**

| Phase | Designed | Actual |
|-------|----------|--------|
| Attack (0–60s) | Place road + building | ✅ works, but silent |
| Decay (1–5 min) | Discover vehicle triggers | ⚠️ discovery is accidental |
| Sustain (5–20 min) | Effects, signs, score tiers | ⚠️ tiers don't change audio |
| Release (20+ min) | Synth City, MIDI export | ❌ no "finale" moment |

### 1.4 Musical Creativity vs. Town Growth — Disconnected

The game has two parallel systems that do not communicate:

| Musical Creativity | Town Growth |
|--------------------|-------------|
| Piano pitch picker | Building count |
| Effects preset | Road network |
| Waveform type | Vehicle count |
| Note decay/level | Score tier |

A player can reach "Synth City" tier by placing 50 identical buildings at random pitches. Conversely, crafting a perfect pentatonic melody on 5 buildings earns far less score. **Musical quality is not rewarded.**

---

## 2. Quick Wins (P0 — hours) — ✅ IMPLEMENTED 2026-03-01

### QW-M1: Merge-to-Upgrade Audio Resolution ✅

**Problem:** Upgrading a building's level via the properties panel is silent and invisible from the grid.

**Current behavior:** `ST.Buildings.setProperty(b, 'level', newLevel)` updates the integer. The building becomes taller visually (on next frame). No sound.

**Solution:** When level increases, trigger a chord-stab that rises in pitch relative to the new level:

```js
// In ST.UI property panel — level increment handler
const resolveNote = b.pitch * Math.pow(2, (newLevel - 1) / 12); // semitone up per level
ST.Audio.trigger({
  waveform: b.waveform,
  pitch: resolveNote,
  attack: 0.05,
  decay: 0.4,
  velocity: 0.5,
  sendReverb: 0.3
});
b.flash = 1.5; // extra-bright flash on level up
```

**Result:** The merge/upgrade moment becomes the most satisfying interaction in the game.

### QW-M2: Score Display Reactivity ✅

**Problem:** Score is updated every 1.0 second regardless of what happened. It feels stale.

**Solution:** Update the score display immediately when a building/road/vehicle is placed. Keep the 1.0s polling for unlock checks, but decouple it from the visual counter. Add a CSS animation (`scale: 1.05 → 1.0`) on score change.

### QW-M3: Vehicle Spawn Proximity Trigger ✅

**Problem:** Spawning a vehicle does not produce sound until the vehicle happens to pass a building (which may be several tiles away and take seconds).

**Solution:** On vehicle spawn, immediately trigger all building neighbors of the spawn tile. This creates an instant "engine start" sound confirming the vehicle is live.

---

## 3. Core Loop Refinements (P1 — days) — Partial, 2026-03-01

### CLR-M1: Musical Score Component ✅

**Problem:** Score formula does not reward musical quality — only quantity.

**Proposed addition:** A **Harmony Bonus** that rewards musical decisions:

```
harmonyBonus = 0
for each building pair within 2 tiles of each other:
  ratio = higher.pitch / lower.pitch
  if ratio is within 2% of 2/1 (octave):   harmonyBonus += 15
  if ratio is within 2% of 3/2 (fifth):    harmonyBonus += 10
  if ratio is within 2% of 4/3 (fourth):   harmonyBonus += 8
  if ratio is within 2% of 5/4 (third):    harmonyBonus += 5

score += min(harmonyBonus, 200)  // cap at 200 bonus points
```

This is computed only during the 1.0s score poll (not every frame). Players discover that placing harmonically related buildings near each other is mechanically rewarded.

**Score display:** Show harmony bonus separately: `"450 pts — City Rhythm (+40 harmony)"`

### CLR-M2: Route Quality Indicator

**Problem:** There is no feedback about whether a vehicle's route is "good" musically or spatially.

**Design:** Each vehicle gets a **Route Score** — the number of distinct buildings it passes per minute.

- Displayed as a small colored dot on the vehicle (green = >4 buildings/min, yellow = 2–4, red = <2)
- The global score adds `vehicleRouteScore × 2` for all active vehicles
- This rewards compact, dense road networks that give vehicles many building encounters

### CLR-M3: Building Level Ties to Musical Range ✅

**Problem:** `level` property (1–8) affects building height visually but has no audio meaning.

**Design:** Make level shift the pitch octave:

```
level 1–2: play at assigned pitch (base octave)
level 3–4: also add an octave-above ghost at -12dB
level 5–6: also add a fifth above at -8dB
level 7–8: chord stab — root + fifth + octave (a power chord)
```

This is a pure audio enhancement with no formula changes. As players upgrade buildings, the soundscape naturally evolves from melody to harmony to chords. **Level becomes the game's "arrangement complexity" axis.**

### CLR-M4: Score Tier Audio Evolution ✅

**Problem:** Score tier names promise sonic evolution ("Street Groove", "Urban Pulse") that never arrives.

**Design:** Each tier transition changes one audio parameter globally:

| Tier | Score | Audio Change |
|------|-------|-------------|
| Empty City | 0 | Dry (no effects) |
| First Beat | 50 | Master reverb enabled at 0.1 |
| Street Groove | 150 | Delay enabled at 0.2, reverb 0.2 |
| City Rhythm | 300 | BPM lock to nearest integer, delay 0.35 |
| Urban Pulse | 600 | Compressor ratio increased to 8:1 |
| Synth City | 1000 | Bass Drop event (see audio plan), effects maxed |

These are automatic — the player does not manually choose the effect preset. The city "mixes itself" as it grows.

Note: This must be optional or overridable by the manual preset selector (manual always wins).

---

## 4. Pacing & Economy Design (P2)

### PE-M1: Tempo Stamina System

**Problem:** BPM slider changes are free and have no in-game consequences.

**Design:** BPM slider has a "groove momentum" — fast changes penalize the score temporarily by reducing vehicle speed for 5 seconds (vehicles "lose their groove"). This makes BPM feel like a creative decision, not a preference toggle.

**Implementation:** Track `_lastBpmChange` timestamp in `ST.Audio.setBPM()`. If changed more than once in 3 seconds, set a `_bpmStress` flag (0.0–1.0) that reduces vehicle speed multiplier.

### PE-M2: Congestion Penalty

**Problem:** Vehicles can stack infinitely on short road loops, drowning out the music with repeated triggers.

**Design:** If more than 2 vehicles occupy tiles within 3 cells of each other, a "congestion" state reduces master gain by 20% and shows a visual indicator. Incentivizes spreading vehicles across the road network.

### PE-M3: "Compose Mode" Toggle (Stage 10 Candidate)

A toggle in the transport bar that pauses vehicle movement but keeps the beat clock running. In Compose Mode:
- Clicking any building plays it immediately at the next beat boundary
- The player can audition arrangements before committing to a road layout
- When Compose Mode ends, vehicles resume and the "live" performance begins

This is the clearest implementation of the "sequencer" core metaphor — the player composes first, then sets the city in motion.

---

## 5. Musical Milestones Roadmap (P3)

### MM-M1: "First Groove" Achievement (Score = 50)

- Triggers when the player first reaches "First Beat" tier
- Plays a 4-beat musical phrase using the player's own buildings (a preview of what their city sounds like)
- Toast: "Your city found its first groove!"
- Unlocks: Bicycle + Effects panel

### MM-M2: "Harmonic District" Achievement ✅ (visual only)

- Triggers when 3+ buildings within a 3×3 tile area are harmonically related (fifth or octave ratio)
- The district glows with a golden dashed outline

**Implemented (visual):** `_detectHarmonicDistricts()` in `renderer.js` scans every 3×3 sub-grid every 60 frames; if ≥2 harmonic pairs (octave or fifth ratio) found, stores district bounds. `_drawHarmonicDistricts()` draws gold dashed outlines with blue glow. Score bonus and beat-pulse sync not yet implemented.

### MM-M3: "DJ Booth" Achievement (Score = 600)

- Unlocks a special "remix" toolbar button
- Clicking it randomizes all vehicle directions simultaneously (creates a musical "fill" or "break")
- Then locks vehicles to their new routes for 8 beats before releasing them
- This is the "drop" interaction — a mechanical way to create musical variation

### MM-M4: "The City Plays Itself" — Synth City Finale

- Triggered once on reaching 1000 pts for the first time
- For 16 beats, vehicle speed doubles, all effects max out, buildings flash in sequence
- A one-time MIDI preview is exported and a "Download Your City's Song" button appears
- The game never auto-plays this twice — it's a reward for reaching the top tier
