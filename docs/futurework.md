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

| Priority | Item | File | Effort |
|----------|------|------|--------|
| 🔴 P0 | BPM-quantized vehicle triggers | audio | Low |
| 🔴 P0 | Placement sound on building drop | ux | Low |
| 🔴 P0 | Merge/upgrade audio resolution sound | ux | Low |
| 🟠 P1 | Ambient city drone (city "hum") | audio | Medium |
| 🟠 P1 | Scale-aware pitch assignment on placement | mechanics | Medium |
| 🟠 P1 | Score tier unlocks audio preset progression | mechanics | Medium |
| 🟡 P2 | AudioNode object pooling | audio | Medium |
| 🟡 P2 | Screen shake + particle burst on merge | ux | Medium |
| 🟡 P2 | Off-beat indicator (visual metronome) | ux | Low |
| 🟢 P3 | Chord progression engine | audio | High |
| 🟢 P3 | "Bass Drop" musical milestone event | mechanics | High |
| 🟢 P3 | Per-building filter envelope modulation | audio | High |

---

## Quality Gate Assessment (Current State)

| Gate | Status | Notes |
|------|--------|-------|
| First musical pattern within 60–90s | ⚠️ Marginal | Achievable but not guided by audio reward |
| 3 building types distinguishable by sound | ✅ Pass | Sine/Square/Triangle clearly distinct |
| Car/Bicycle/Bus audibly distinct | ✅ Pass | Attack/decay differences audible |

The first gate is the most fragile — a new player can place buildings and roads within 60s but may not *understand they have created music* because the feedback loop is unclear.
