# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Synth Town Remake is a browser-based city builder where the city is a musical sequencer. Buildings are oscillators, roads are routes, vehicles are playheads. The entire game lives in a **single `index.html`** file — no build tools, no external JS libraries (only Google Fonts CDN), Vanilla JS + Web Audio API only.

## Prompt Reading Order

Before starting any stage, read these files in order:

1. `prompts/claude-code/CLAUDE_CODE.md` — workflow rules and code style
2. `prompts/claude-code/ARCHITECTURE.md` — module layout and naming conventions
3. `prompts/claude-code/CONTRACTS.md` — inter-stage API contracts (append-only, never break)
4. `prompts/claude-code/SPEC.md` — visual/audio specifications and limits
5. `prompts/claude-code/INSPIRATION_DELTA.md` — design principles
6. `stages/STAGE_N.md` — the active stage only

## Running Tests

Tests run in a browser by injecting scripts into `index.html` via an iframe:

- Open `tests/runner.html` in a browser and click the stage button (e.g., "Stage 1")
- Or manually inject into `index.html` before `</script>`:

```html
<script src="tests/test_helpers.js"></script>
<script src="tests/test_stage_1.js"></script>
```

Results appear in the browser console. Format:
```
[TEST] STAGE 1 — Starting 7 tests...
  ✅ T1.1 Canvas exists and has context
  ❌ T1.3 Building placement — expected building at (5,5), got null
[TEST] STAGE 1 — 6/7 passed
```

## Development Workflow

1. One stage per session
2. Implement MUST items → run tests → implement SHOULD items → run tests → commit
3. Never move to the next stage until current stage tests are green
4. Commit format: `[STAGE N] brief description`

## Architecture

### Single-file module system

All code is inline in `index.html` under the `ST` namespace, using IIFE modules. Module order in the file is strict (dependency order top-to-bottom):

```
ST.Config → ST.Audio → ST.Grid → ST.Buildings → ST.Roads → ST.Vehicles
→ ST.Signs → ST.Effects → ST.Score → ST.Unlocks → ST.UI → ST.State
→ ST.Renderer → ST.Game → boot
```

No circular dependencies. Back-communication uses callbacks:
```javascript
ST.Audio.onTrigger = null; // UI subscribes: ST.Audio.onTrigger = fn
```

### HTML layout structure
```html
<div id="app">
  <aside id="toolbar"></aside>       <!-- 200px left -->
  <main><canvas id="game"></canvas></main>
  <aside id="properties"></aside>    <!-- 220px right, shown on building click -->
  <footer id="transport"></footer>   <!-- 64px bottom -->
</div>
```

### Naming conventions

| What | Style | Example |
|------|-------|---------|
| Modules | `ST.PascalCase` | `ST.Audio`, `ST.Grid` |
| Public methods | `camelCase` | `getTile`, `autoConnect` |
| Private (IIFE) | `_camelCase` | `_calcRoadShape` |
| Constants | `UPPER_SNAKE_CASE` | `MAX_VOICES`, `TILE` |
| DOM ids | `kebab-case` | `btn-play`, `slider-bpm` |
| CSS classes | `st-kebab-case` | `st-toolbar`, `st-active` |

### Size limits

| Unit | Limit | Action |
|------|-------|--------|
| Module | 200 lines | Split into sub-modules (e.g., `ST.Audio.Effects`) |
| Function | 40 lines | Extract helpers |
| Nesting depth | 3 levels | Early return, extract fn |

## Code Style

- Vanilla JS ES2020+, no TypeScript
- JSDoc for types: `/** @param {number} x */`
- `const` by default, `let` only if reassigned, never `var`
- `'use strict';` at top of `<script>`
- Single quotes, semicolons required
- No trailing comma on last element

## Key Constraints

- **No separate .js/.css files** — everything inline in `index.html`
- **No libraries** — no React, Tone.js, etc.
- **No `eval`** or `innerHTML` for user input
- **API contracts are append-only** — never change signatures from previous stages
- **No optimization until Stage 8**
- AudioContext MUST be created on user gesture (show "Click to start" overlay)

## Stage Overview

| Stage | Module | Description |
|-------|--------|-------------|
| 1 | Config, Grid, Audio, Renderer, Game | Foundation |
| 2 | Buildings, Roads, UI | 5 building types, road auto-connect |
| 3 | Vehicles, Signs | 3 vehicle types, traffic signs |
| 4 | Score, Unlocks | Scoring and unlock system |
| 5 | Effects | Delay, Reverb, Filter, Compressor |
| 6 | — | UX polish and visual details |
| 7 | State | Save/load, URL share (localStorage + base64) |
| 8 | — | Optimization and stabilization |
| 9 | MIDI | Export composition as `.mid` file |

## Quality Gate (Release Minimum)

The build is not ready unless all three hold simultaneously:
1. Player builds their first musical pattern within 60–90 seconds of starting.
2. Player can distinguish at least 3 building types by shape and sound alone.
3. Player can hear the difference between `car`, `bicycle`, and `bus` on the same route.
