# Synth Town

A browser-based city builder where the city is a musical sequencer.
Buildings are oscillators. Roads are routes. Vehicles are playheads.

---

## How it works

1. **Start Audio** — click the overlay button to unlock the Web Audio API.
2. **Place roads** — draw a route on the grid.
3. **Place buildings** — each building type has a distinct waveform and a random pentatonic note.
4. **Add vehicles** — cars, bicycles, and buses drive the roads and trigger nearby buildings.
5. **Hit Play** (or press **Space**) to start the sequencer.

Building types:
| Type     | Shape       | Waveform | Character        |
|----------|-------------|----------|------------------|
| Sine     | Dome roof   | sine     | Smooth, warm     |
| Square   | Flat + pipe | square   | Harsh, buzzy     |
| Triangle | Spike       | triangle | Hollow, clear    |
| Sawtooth | Steps       | sawtooth | Bright, buzzy    |
| Pulse    | Antenna     | square   | Thin, percussive |

Keyboard shortcuts:
- `Space` — play / pause
- `Ctrl+Z` — undo
- `Ctrl+Y` / `Ctrl+Shift+Z` — redo

Transport bar:
- **BPM** slider — tempo (60–180)
- **Vol** slider — master volume
- **MIDI** button — export city as `.mid` (one track per vehicle type)

Effects presets (toolbar): Dry · Room · Echo · Space

Save / Load: stores to `localStorage`. Share URL encodes state into the address bar hash.

---

## Deploy

No build step. The project is a static site — serve `index.html` and the `src/` + `styles/` folders.

### Local

```bash
# Python 3
python -m http.server 8080

# Node (npx)
npx serve .

# Any static file server works
```

Open `http://localhost:8080` in a modern browser (Chrome/Firefox/Edge with Web Audio API support).

### GitHub Pages

1. Push the repository to GitHub.
2. Go to **Settings → Pages**.
3. Set source to **Deploy from a branch**, select `main`, folder `/` (root).
4. The site is live at `https://<user>.github.io/<repo>/`.

### Netlify / Vercel / Cloudflare Pages

Drag-and-drop the repository folder onto the platform's dashboard, or connect the GitHub repo.
No build command needed. Publish directory: `/` (root).

### Nginx

```nginx
server {
    listen 80;
    root /var/www/synth-town;
    index index.html;
    location / { try_files $uri $uri/ =404; }
}
```

Copy `index.html`, `src/`, and `styles/` into the web root.

---

## Transport bar

| Control | Description |
|---------|-------------|
| ▶ Play / ▌▌ Pause | Start / stop vehicles (also `Space`) |
| BPM slider | Tempo 60–180. Delay time re-syncs automatically |
| Vol slider | Master volume |
| ⚡ DJ Booth | Reverses all vehicles (unlocks at 300 pts) |
| ♩+ Chord Mode | Adds a perfect fifth to every note (unlocks at 600 pts) |
| ◇ Beat Grid | Sweeping playhead line overlay |
| MIDI | Export city as `.mid` |
| ◉ Color-Blind | ✓/✗ glyphs + ring flash instead of color-only signals |

## File layout

```
index.html          entry point
src/
  config.js         constants (grid, BPM, limits, colors)
  audio.js          Web Audio API, 8-voice pool, BPM quantization, drone
  grid.js           2D tile map (20×15)
  buildings.js      oscillator buildings, CRUD, per-type filter envelope
  roads.js          road tiles, auto-connect
  vehicles.js       playhead movement, trigger logic, chord mode
  signs.js          traffic light, one-way, roundabout
  effects.js        compressor, delay (BPM-synced), reverb, presets
  score.js          score formula (with harmony bonus), tier thresholds
  unlocks.js        score-gated feature gates
  history.js        undo/redo command stack
  state.js          save/load (localStorage + URL hash)
  midi.js           .mid file export
  renderer.js       canvas draw loop, particles, screen shake, beat grid
  game.js           RAF loop, beat clock, tier events, bass drop
  ui/
    defs.js         toolbar/building/vehicle/sign static definitions
    onboarding.js   5-step first-run hint flow
    piano.js        note picker widget
    toolbar.js      left sidebar builder
    coach.js        step-by-step tour popovers
  ui.js             canvas input, transport, property panel
styles/
  main.css          all styles (responsive: tablet ≤1024px, mobile ≤600px)
tests/
  runner.html       browser test runner
  test_stage_*.js   per-stage tests
docs/
  architecture.md   module map, APIs, data flow, audio chain
  plan.md           game design plan — mechanics, content, roadmap
```

## Browser requirements

- Web Audio API (all modern browsers)
- ES2020+ (no transpilation)
- No external dependencies beyond Google Fonts CDN
