'use strict';

// ============================================================
// ST._UI.DEFS — static tool/building/vehicle/sign definitions
// Loaded before src/ui.js; staged under ST._UI namespace.
// ============================================================
ST._UI = ST._UI || {};

ST._UI.DEFS = {
  TOOL_DEFS: [
    { tool: 'select', label: 'Select', dot: null,
      tooltip: 'Select Tool\nClick a building to open its properties\nChange pitch, level, and decay' },
    { tool: 'road',   label: 'Road',   dot: '#888',
      tooltip: 'Road Tool\nDraw tiles where vehicles travel\nConnect roads to buildings to trigger notes' },
    { tool: 'remove', label: 'Remove', dot: '#ef5350',
      tooltip: 'Remove Tool\nClick any tile to delete it\nBuilding: descending sound · Road: whoosh' }
  ],
  BUILDING_DEFS: [
    { tool: 'sine',     label: 'Sine Wave', dot: '#64b5f6',
      tooltip: 'Sine Wave building\nWarm, pure tone · C4 (261 Hz)\nLong decay (1.2 s) — sustained note' },
    { tool: 'square',   label: 'Square',    dot: '#ef5350',
      tooltip: 'Square Wave building\nHollow, buzzy tone · G3 (196 Hz)\nShort decay (0.3 s) — punchy' },
    { tool: 'triangle', label: 'Triangle',  dot: '#66bb6a',
      tooltip: 'Triangle Wave building\nSoft, flute-like tone · E4 (330 Hz)\nMedium decay (0.8 s) — airy' },
    { tool: 'sawtooth', label: 'Sawtooth',  dot: '#ffa726',
      tooltip: 'Sawtooth Wave building\nBright, synth-bass tone · A3 (220 Hz)\nMedium decay (0.5 s) — edgy' },
    { tool: 'pulse',    label: 'Pulse',     dot: '#ab47bc',
      tooltip: 'Pulse Wave building\nSharp, high synth tone · C5 (523 Hz)\nVery short decay (0.15 s) — percussive' },
    { tool: 'arp',      label: 'Arpeggio',  dot: '#4dd0e1',
      tooltip: 'Arpeggio building\nEach vehicle pass plays the next step in a chord pattern\nRandom pattern assigned on placement (Major, Minor, Pentatonic…)\nShuffle button in properties to re-roll the pattern' }
  ],
  VEHICLE_DEFS: [
    { tool: 'car',     label: 'Car',     dot: '#dce0e8',
      tooltip: 'Car\nNeutral lowpass filter (3 kHz) — full, balanced tone\nMedium speed (1×) · decay 0.2 s · instant attack' },
    { tool: 'bicycle', label: 'Bicycle', dot: '#64b5f6',
      tooltip: 'Bicycle\nBright bandpass filter (2.2 kHz) — crisp midrange focus\nSlower (0.8×) · decay 0.12 s · near-instant attack\nUnlocks at 50 pts' },
    { tool: 'bus',     label: 'Bus',     dot: '#ffa726',
      tooltip: 'Bus\nWarm lowpass filter (800 Hz) — deep, muffled bass\nFaster (1.2×) · long decay (0.45 s) · soft attack\nUnlocks at 150 pts' },
    { tool: 'tram',    label: 'Tram',    dot: '#81c784',
      tooltip: 'Tram\nDeep lowpass filter (600 Hz) — very warm, sustained tone\nSlow (0.5×) · long decay (0.7 s) · triggers 2-tile radius\nBuildings 2 tiles away also sound — great for dense districts\nUnlocks at 250 pts' },
    { tool: 'drone',   label: 'Drone',   dot: '#ce93d8',
      tooltip: 'Drone\nHighpass filter (1.5 kHz) — bright, airy flyover\nFast (1.8×) · very short decay (0.06 s)\nFlies in straight lines — no road needed, bounces at edges\nPlace on any empty or road tile\nUnlocks at 400 pts' }
  ],
  SIGN_DEFS: [
    { tool: 'trafficLight', label: 'Traffic Light', dot: '#ef5350',
      tooltip: 'Traffic Light\nStops vehicles for ~2 seconds\nCreates rhythmic gaps and syncopation\nUnlocks at 100 pts' },
    { tool: 'oneWay',       label: 'One Way',       dot: '#fff',
      tooltip: 'One Way Sign\nForces vehicles to go East (default)\nGood for building predictable, looping routes\nUnlocks at 200 pts' },
    { tool: 'roundabout',   label: 'Roundabout',    dot: '#64b5f6',
      tooltip: 'Roundabout\nVehicles always turn clockwise\nCreates tight circular orbital routes\nUnlocks at 300 pts' },
    { tool: 'waypoint',     label: 'Waypoint',      dot: '#ef5350',
      tooltip: 'Route Waypoint\nVehicles that touch this sign follow its numbered sequence\nPlace 1 \u2192 2 \u2192 3 on road tiles — vehicles loop between them\nRoutes are colour-coded (A=red, B=blue, C=green)\nUnlocks at 100 pts' },
    { tool: 'speedUp',      label: 'Speed+',        dot: '#66bb6a',
      tooltip: 'Speed Lane\nVehicles on this tile move at 2\u00d7 speed\nShorter note durations — faster, snappier musical phrases\nUnlocks at 200 pts' },
    { tool: 'slowDown',     label: 'Speed\u2212',   dot: '#ffa726',
      tooltip: 'Slow Zone\nVehicles on this tile move at 0.5\u00d7 speed\nLonger, more sustained notes — great for atmospheric pads\nUnlocks at 200 pts' }
  ],
  PRESET_LABELS: { dry: 'Dry', room: 'Room', echo: 'Echo', space: 'Space' },
  PRESET_TOOLTIPS: {
    dry:   'Dry — No effects\nRaw oscillator signal only\nZero coloration',
    room:  'Room Reverb\nSmall room acoustics\nGentle warmth and early reflections',
    echo:  'Echo\nRhythmic delay locked to BPM ÷ 2\nCall-and-response feel',
    space: 'Space\nWide reverb + echo combined\nBig, cosmic, pad-like soundscape'
  }
};
