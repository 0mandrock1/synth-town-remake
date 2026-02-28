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

## File layout

```
index.html          entry point
src/
  config.js         constants (grid size, BPM, limits)
  audio.js          Web Audio API wrapper, voice stealing
  grid.js           2D tile map
  buildings.js      oscillator buildings (CRUD + draw)
  roads.js          road placement and auto-connect
  vehicles.js       playhead movement and audio trigger
  signs.js          traffic signs (traffic light, one-way, roundabout)
  effects.js        compressor, delay, reverb, presets
  score.js          city score and tier thresholds
  unlocks.js        score-gated feature unlocks
  history.js        undo / redo command stack
  midi.js           .mid file export (Stage 9)
  state.js          save / load / URL share
  renderer.js       canvas draw loop
  game.js           RAF game loop, boot
  ui/
    defs.js         toolbar definitions
    onboarding.js   first-run flow + toast helper
    piano.js        note picker widget
    toolbar.js      left toolbar builder
  ui.js             canvas events, transport, property panel
styles/
  main.css          all styles
tests/
  runner.html       browser test runner
  test_stage_*.js   stage-by-stage tests
```

## Browser requirements

- Web Audio API (all modern browsers)
- ES2020+ (no transpilation)
- No external dependencies beyond Google Fonts CDN
