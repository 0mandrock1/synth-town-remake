'use strict';

// ============================================================
// ST._UI.DEFS — static tool/building/vehicle/sign definitions
// Loaded before src/ui.js; staged under ST._UI namespace.
// ============================================================
ST._UI = ST._UI || {};

ST._UI.DEFS = {
  TOOL_DEFS: [
    { tool: 'select', label: 'Select', dot: null },
    { tool: 'road',   label: 'Road',   dot: '#888' },
    { tool: 'remove', label: 'Remove', dot: '#ef5350' }
  ],
  BUILDING_DEFS: [
    { tool: 'sine',     label: 'Sine Wave', dot: '#64b5f6' },
    { tool: 'square',   label: 'Square',    dot: '#ef5350' },
    { tool: 'triangle', label: 'Triangle',  dot: '#66bb6a' },
    { tool: 'sawtooth', label: 'Sawtooth',  dot: '#ffa726' },
    { tool: 'pulse',    label: 'Pulse',     dot: '#ab47bc' }
  ],
  VEHICLE_DEFS: [
    { tool: 'car',     label: 'Car',     dot: '#dce0e8' },
    { tool: 'bicycle', label: 'Bicycle', dot: '#64b5f6' },
    { tool: 'bus',     label: 'Bus',     dot: '#ffa726' }
  ],
  SIGN_DEFS: [
    { tool: 'trafficLight', label: 'Traffic Light', dot: '#ef5350' },
    { tool: 'oneWay',       label: 'One Way',       dot: '#fff' },
    { tool: 'roundabout',   label: 'Roundabout',    dot: '#64b5f6' }
  ],
  PRESET_LABELS: { dry: 'Dry', room: 'Room', echo: 'Echo', space: 'Space' }
};
