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
      tooltip: 'Pulse Wave building\nSharp, high synth tone · C5 (523 Hz)\nVery short decay (0.15 s) — percussive' }
  ],
  VEHICLE_DEFS: [
    { tool: 'car',     label: 'Car',     dot: '#dce0e8',
      tooltip: 'Car\nNeutral lowpass filter (3 kHz)\nMedium speed · clear, balanced note' },
    { tool: 'bicycle', label: 'Bicycle', dot: '#64b5f6',
      tooltip: 'Bicycle\nBright bandpass filter (2.2 kHz)\nSlower · crisp, focused note' },
    { tool: 'bus',     label: 'Bus',     dot: '#ffa726',
      tooltip: 'Bus\nWarm lowpass filter (800 Hz)\nFaster · deep, resonant note with long attack' }
  ],
  SIGN_DEFS: [
    { tool: 'trafficLight', label: 'Traffic Light', dot: '#ef5350',
      tooltip: 'Traffic Light\nStops vehicles for ~2 seconds\nCreates rhythmic gaps and syncopation' },
    { tool: 'oneWay',       label: 'One Way',       dot: '#fff',
      tooltip: 'One Way Sign\nForces vehicles to go East (default)\nGood for building predictable loops' },
    { tool: 'roundabout',   label: 'Roundabout',    dot: '#64b5f6',
      tooltip: 'Roundabout\nVehicles always turn clockwise\nCreates circular orbital routes' }
  ],
  PRESET_LABELS: { dry: 'Dry', room: 'Room', echo: 'Echo', space: 'Space' },
  PRESET_TOOLTIPS: {
    dry:   'Dry — No effects\nRaw oscillator signal only\nZero coloration',
    room:  'Room Reverb\nSmall room acoustics\nGentle warmth and early reflections',
    echo:  'Echo\nRhythmic delay locked to BPM ÷ 2\nCall-and-response feel',
    space: 'Space\nWide reverb + echo combined\nBig, cosmic, pad-like soundscape'
  }
};
