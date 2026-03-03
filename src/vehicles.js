'use strict';

// ============================================================
// ST.Vehicles — vehicle data, movement logic, and canvas drawing
// Note: building flash decay is handled by ST.Game._loop (SRP)
// ============================================================
ST.Vehicles = (function() {
  console.log('[Vehicles] initialized');

  const TYPES = {
    car:     { velocityMult: 1.00, attack: 0,     decay: 0.20, color: '#dce0e8', size: 5, triggerRadius: 1 },
    bicycle: { velocityMult: 0.80, attack: 0.005, decay: 0.12, color: '#64b5f6', size: 3, triggerRadius: 1 },
    bus:     { velocityMult: 1.20, attack: 0.010, decay: 0.45, color: '#ffa726', size: 7, triggerRadius: 1 },
    tram:    { velocityMult: 0.55, attack: 0.020, decay: 0.60, color: '#ffd740', size: 9, triggerRadius: 2 },
    drone:   { velocityMult: 0.70, attack: 0.008, decay: 0.18, color: '#ce93d8', size: 4, triggerRadius: 1, diagonal: true }
  };

  // CA-A2: per-vehicle timbral filter
  const VEHICLE_FILTER = {
    car:     { filterType: 'lowpass',  filterCutoff: 3000 },
    bicycle: { filterType: 'bandpass', filterCutoff: 2200 },
    bus:     { filterType: 'lowpass',  filterCutoff: 800  },
    tram:    { filterType: 'lowpass',  filterCutoff: 500  },
    drone:   { filterType: 'highpass', filterCutoff: 1800 }
  };

  const DIR_DELTA    = { N:{dx:0,dy:-1}, S:{dx:0,dy:1}, E:{dx:1,dy:0}, W:{dx:-1,dy:0} };
  const DIR_OPPOSITE = { N:'S', S:'N', E:'W', W:'E' };
  const DIR_ANGLE    = { E:0, S:Math.PI/2, W:Math.PI, N:-Math.PI/2 };

  // Diagonal movement for drone (bounces off grid edges)
  const DIAG_DELTA = { NE:{dx:1,dy:-1}, NW:{dx:-1,dy:-1}, SE:{dx:1,dy:1}, SW:{dx:-1,dy:1} };
  const DIAG_ANGLE = { NE:-Math.PI/4, NW:-3*Math.PI/4, SE:Math.PI/4, SW:3*Math.PI/4 };

  const _vehicles = [];
  let _speedMult = 1.0;
  let _chordMode = false;

  function _getQuantizedStart() {
    if (!ST.Audio.isReady() || !ST.Game || !ST.Game.getBeatPhase) return undefined;
    const ctx = ST.Audio.getContext();
    const now = ctx.currentTime;
    const beatDur = 60 / ST.Audio.getBPM();
    const phase = ST.Game.getBeatPhase();
    const gridDur = beatDur / 4;
    const phaseInGrid = (phase % 0.25) * beatDur;
    const delay = gridDur - phaseInGrid;
    return now + Math.min(delay, gridDur);
  }

  // Collect tiles within Manhattan radius (excluding origin)
  function _getTilesInRadius(cx, cy, radius) {
    const result = [];
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        if (dx === 0 && dy === 0) continue;
        if (Math.abs(dx) + Math.abs(dy) > radius) continue;
        const t = ST.Grid.getTile(cx + dx, cy + dy);
        if (t) result.push({ tile: t, x: cx + dx, y: cy + dy });
      }
    }
    return result;
  }

  function _fireTrigger(b, typeDef, fp, quantizedStart) {
    const level = b.level || 1;
    const bDef  = ST.Buildings.TYPES[b.type] || {};
    const fType   = bDef.filterType   || fp.filterType;
    const fCutoff = bDef.filterCutoff || fp.filterCutoff;
    const fQ      = bDef.filterQ;
    ST.Audio.trigger({
      waveform: b.waveform, pitch: b.pitch,
      attack: typeDef.attack, decay: typeDef.decay, velocity: typeDef.velocityMult,
      filterType: fType, filterCutoff: fCutoff, filterQ: fQ, startTime: quantizedStart
    });
    if (_chordMode) {
      ST.Audio.trigger({
        waveform: b.waveform, pitch: b.pitch * 1.5,
        attack: typeDef.attack, decay: typeDef.decay, velocity: typeDef.velocityMult * 0.5,
        filterType: fType, filterCutoff: fCutoff, filterQ: fQ, startTime: quantizedStart
      });
    }
    if (level >= 3) ST.Audio.trigger({ waveform: b.waveform, pitch: b.pitch * 2, attack: typeDef.attack, decay: typeDef.decay, velocity: typeDef.velocityMult * 0.25, filterType: fType, filterCutoff: fCutoff, filterQ: fQ });
    if (level >= 5) ST.Audio.trigger({ waveform: b.waveform, pitch: b.pitch * 1.5, attack: typeDef.attack, decay: typeDef.decay, velocity: typeDef.velocityMult * 0.30, filterType: fType, filterCutoff: fCutoff, filterQ: fQ });
    if (level >= 7) ST.Audio.trigger({ waveform: b.waveform, pitch: b.pitch * 3, attack: typeDef.attack, decay: typeDef.decay, velocity: typeDef.velocityMult * 0.20, filterType: fType, filterCutoff: fCutoff, filterQ: fQ });
    b.flash = 1.0;
    if (ST.Renderer && ST.Renderer.markShake) ST.Renderer.markShake(0.5);
  }

  function _triggerNearby(vehicle) {
    const typeDef = TYPES[vehicle.type];
    const radius  = typeDef.triggerRadius || 1;
    const fp = VEHICLE_FILTER[vehicle.type] || {};
    const quantizedStart = _getQuantizedStart();
    const tiles = _getTilesInRadius(vehicle.x, vehicle.y, radius);
    // Drone triggers buildings it flies directly over
    if (vehicle.type === 'drone') {
      const onTile = ST.Grid.getTile(vehicle.x, vehicle.y);
      if (onTile) tiles.push({ tile: onTile, x: vehicle.x, y: vehicle.y });
    }
    tiles.forEach(function(nb) {
      if (nb.tile.type === 'building' && nb.tile.building) {
        _fireTrigger(nb.tile.building, typeDef, fp, quantizedStart);
      }
    });
  }

  // --- Direction choosing ---

  function _chooseDirFree(x, y, currentDir) {
    const tile = ST.Grid.getTile(x, y);
    if (!tile) return null;
    const roadDir = tile.roadDir || '';
    const possible = ['N','S','E','W'].filter(function(d) { return roadDir.includes(d); });
    if (possible.length === 0) return null;
    const noUTurn = possible.filter(function(d) { return d !== DIR_OPPOSITE[currentDir]; });
    const choices = noUTurn.length > 0 ? noUTurn : possible;
    return choices[Math.floor(Math.random() * choices.length)];
  }

  // Route-following: greedy Manhattan-distance minimization
  function _chooseDirToward(x, y, currentDir, tx, ty) {
    const tile = ST.Grid.getTile(x, y);
    if (!tile) return null;
    const roadDir = tile.roadDir || '';
    const possible = ['N','S','E','W'].filter(function(d) { return roadDir.includes(d); });
    if (possible.length === 0) return null;
    const noUTurn = possible.filter(function(d) { return d !== DIR_OPPOSITE[currentDir]; });
    const choices = noUTurn.length > 0 ? noUTurn : possible;
    if (choices.length === 1) return choices[0];
    const oldDist = Math.abs(tx - x) + Math.abs(ty - y);
    let best = choices[0]; let bestGain = -Infinity;
    choices.forEach(function(d) {
      const dl = DIR_DELTA[d];
      const gain = oldDist - (Math.abs(tx - (x + dl.dx)) + Math.abs(ty - (y + dl.dy)));
      if (gain > bestGain) { bestGain = gain; best = d; }
    });
    return best;
  }

  // VR-M1: pick direction based on route waypoints or free-roam
  function _chooseDir(vehicle) {
    const x = vehicle.x, y = vehicle.y;
    if (vehicle.route && vehicle.route.length > 0) {
      const wp = vehicle.route[vehicle.routeIdx || 0];
      if (wp.x === x && wp.y === y) {
        vehicle.routeIdx = ((vehicle.routeIdx || 0) + 1) % vehicle.route.length;
      }
      const target = vehicle.route[vehicle.routeIdx || 0];
      if (target.x === x && target.y === y) return _chooseDirFree(x, y, vehicle.dir);
      return _chooseDirToward(x, y, vehicle.dir, target.x, target.y);
    }
    return _chooseDirFree(x, y, vehicle.dir);
  }

  // Drone: diagonal bounce movement, no road required
  function _advanceDrone(vehicle) {
    const { GRID_W, GRID_H } = ST.Config;
    const d = DIAG_DELTA[vehicle.droneDir || 'SE'];
    let ddx = d.dx, ddy = d.dy;
    let nx = vehicle.x + ddx;
    let ny = vehicle.y + ddy;
    if (nx < 0 || nx >= GRID_W) { ddx = -ddx; nx = vehicle.x + ddx; }
    if (ny < 0 || ny >= GRID_H) { ddy = -ddy; ny = vehicle.y + ddy; }
    vehicle.droneDir = Object.keys(DIAG_DELTA).find(function(k) {
      return DIAG_DELTA[k].dx === ddx && DIAG_DELTA[k].dy === ddy;
    }) || 'SE';
    vehicle.nextX = Math.max(0, Math.min(GRID_W - 1, nx));
    vehicle.nextY = Math.max(0, Math.min(GRID_H - 1, ny));
  }

  function _advance(vehicle) {
    if (vehicle.type === 'drone') { _advanceDrone(vehicle); return; }

    const signResult = ST.Signs.evaluate(vehicle, vehicle.x, vehicle.y);
    if (signResult && signResult.action === 'stop') {
      vehicle.stopped = true;
      vehicle.stopTimer = signResult.duration || 0.5;
      vehicle.nextX = vehicle.x; vehicle.nextY = vehicle.y;
      return;
    }
    const dir = (signResult && signResult.action === 'force')
      ? signResult.direction
      : _chooseDir(vehicle);
    if (!dir) { vehicle.nextX = vehicle.x; vehicle.nextY = vehicle.y; return; }

    const d  = DIR_DELTA[dir];
    const nx = vehicle.x + d.dx;
    const ny = vehicle.y + d.dy;
    const tile = ST.Grid.getTile(nx, ny);
    if (!tile || tile.type !== 'road') {
      const rev = DIR_OPPOSITE[dir];
      const rd  = DIR_DELTA[rev];
      const revTile = ST.Grid.getTile(vehicle.x + rd.dx, vehicle.y + rd.dy);
      if (revTile && revTile.type === 'road') {
        vehicle.dir = rev;
        vehicle.nextX = vehicle.x + rd.dx;
        vehicle.nextY = vehicle.y + rd.dy;
      } else {
        vehicle.nextX = vehicle.x; vehicle.nextY = vehicle.y;
      }
      return;
    }
    vehicle.dir = dir;
    vehicle.nextX = nx; vehicle.nextY = ny;
  }

  return {
    TYPES: TYPES,

    spawn: function(type, x, y) {
      if (_vehicles.length >= ST.Config.MAX_VEHICLES) return null;
      if (!TYPES[type]) return null;

      // Drone spawns on any tile and moves diagonally
      if (type === 'drone') {
        const diagKeys = Object.keys(DIAG_DELTA);
        const droneDir = diagKeys[Math.floor(Math.random() * diagKeys.length)];
        const dd = DIAG_DELTA[droneDir];
        const vehicle = {
          type: 'drone', x: x, y: y, dir: 'E', progress: 0,
          droneDir: droneDir,
          nextX: Math.max(0, Math.min(ST.Config.GRID_W - 1, x + dd.dx)),
          nextY: Math.max(0, Math.min(ST.Config.GRID_H - 1, y + dd.dy)),
          stopped: false, stopTimer: 0,
          trail: [{ x: x, y: y }],
          route: null, routeIdx: 0
        };
        _vehicles.push(vehicle);
        _triggerNearby(vehicle);
        return vehicle;
      }

      const tile = ST.Grid.getTile(x, y);
      if (!tile || tile.type !== 'road') return null;
      const roadDir = tile.roadDir || '';
      const dirs = ['N','S','E','W'].filter(function(d) { return roadDir.includes(d); });
      const startDir = dirs.length > 0 ? dirs[Math.floor(Math.random() * dirs.length)] : 'E';
      const d = DIR_DELTA[startDir] || DIR_DELTA['E'];
      const vehicle = {
        type: type, x: x, y: y, dir: startDir, progress: 0,
        nextX: x + d.dx, nextY: y + d.dy,
        stopped: false, stopTimer: 0,
        trail: [{ x: x, y: y }],
        route: null, routeIdx: 0
      };
      const nextTile = ST.Grid.getTile(vehicle.nextX, vehicle.nextY);
      if (!nextTile || nextTile.type !== 'road') { vehicle.nextX = x; vehicle.nextY = y; }
      _vehicles.push(vehicle);
      _triggerNearby(vehicle);
      return vehicle;
    },

    remove: function(vehicle) {
      const idx = _vehicles.indexOf(vehicle);
      if (idx !== -1) _vehicles.splice(idx, 1);
    },

    // VR-M1: assign waypoint route; null clears to free-roam
    setRoute: function(vehicle, route) {
      vehicle.route    = (route && route.length > 0) ? route.slice() : null;
      vehicle.routeIdx = 0;
    },

    update: function(dt) {
      // Per-vehicle speed: base × velocityMult (tram slow, bus fast, etc.)
      const baseSpeed = (ST.Audio.getBPM() / 120) * 2.0 * _speedMult;

      _vehicles.forEach(function(vehicle) {
        const typeDef = TYPES[vehicle.type];
        const vSpeed  = baseSpeed * (typeDef.velocityMult || 1.0);

        if (vehicle.stopped) {
          vehicle.stopTimer -= dt;
          if (vehicle.stopTimer <= 0) { vehicle.stopped = false; _advance(vehicle); }
          return;
        }

        vehicle.progress += dt * vSpeed;
        while (vehicle.progress >= 1.0 && !vehicle.stopped) {
          vehicle.progress -= 1.0;
          vehicle.x = vehicle.nextX; vehicle.y = vehicle.nextY;
          const last = vehicle.trail[vehicle.trail.length - 1];
          if (!last || last.x !== vehicle.x || last.y !== vehicle.y) {
            vehicle.trail.push({ x: vehicle.x, y: vehicle.y });
            if (vehicle.trail.length > 12) vehicle.trail.shift();
          }
          _triggerNearby(vehicle);
          _advance(vehicle);
          if (vehicle.nextX === vehicle.x && vehicle.nextY === vehicle.y) {
            vehicle.progress = 0; break;
          }
        }
      });
    },

    draw: function(ctx) {
      const { TILE } = ST.Config;
      _vehicles.forEach(function(vehicle) {
        const typeDef = TYPES[vehicle.type];
        const dx = vehicle.nextX - vehicle.x;
        const dy = vehicle.nextY - vehicle.y;
        const px = (vehicle.x + dx * vehicle.progress) * TILE + TILE / 2;
        const py = (vehicle.y + dy * vehicle.progress) * TILE + TILE / 2;
        const s  = typeDef.size;
        const angle = vehicle.type === 'drone'
          ? (DIAG_ANGLE[vehicle.droneDir] || 0)
          : (DIR_ANGLE[vehicle.dir] || 0);

        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(angle);
        ctx.fillStyle   = typeDef.color;
        ctx.strokeStyle = 'rgba(0,0,0,0.55)';
        ctx.lineWidth   = 1;

        if (vehicle.type === 'bicycle') {
          ctx.beginPath(); ctx.arc(0, 0, s, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        } else if (vehicle.type === 'drone') {
          ctx.beginPath();
          ctx.moveTo(0, -s); ctx.lineTo(s, 0); ctx.lineTo(0, s); ctx.lineTo(-s, 0);
          ctx.closePath(); ctx.fill(); ctx.stroke();
        } else if (vehicle.type === 'tram') {
          ctx.fillRect(-s, -s * 0.7, s * 2, s * 1.4);
          ctx.strokeRect(-s, -s * 0.7, s * 2, s * 1.4);
          ctx.fillStyle = 'rgba(0,0,0,0.3)';
          ctx.fillRect(-1, -s * 0.7, 2, s * 1.4);
        } else {
          ctx.fillRect(-s, -s * 0.6, s * 2, s * 1.2);
          ctx.strokeRect(-s, -s * 0.6, s * 2, s * 1.2);
        }

        // Route indicator: pink dot on vehicles with assigned route
        if (vehicle.route && vehicle.route.length > 0) {
          ctx.fillStyle = '#ff4081';
          ctx.beginPath(); ctx.arc(-s + 2, -s * 0.6, 2.5, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
      });
    },

    getAll:  function() { return _vehicles.slice(); },
    count:   function() { return _vehicles.length; },

    // VR-M1: find vehicle occupying a tile (for click-to-select)
    getAt: function(x, y) {
      return _vehicles.find(function(v) { return v.x === x && v.y === y; }) || null;
    },

    setSpeedMult: function(m) { _speedMult = m; },
    setChordMode: function(on) { _chordMode = on; },
    getChordMode: function() { return _chordMode; },

    remix: function() {
      _vehicles.forEach(function(v) {
        if (v.type === 'drone') {
          const keys = Object.keys(DIAG_DELTA);
          v.droneDir = keys[Math.floor(Math.random() * keys.length)];
          return;
        }
        const rev  = DIR_OPPOSITE[v.dir] || v.dir;
        const d    = DIR_DELTA[rev];
        const nx   = v.x + d.dx; const ny = v.y + d.dy;
        const tile = ST.Grid.getTile(nx, ny);
        v.dir   = rev;
        v.nextX = (tile && tile.type === 'road') ? nx : v.x;
        v.nextY = (tile && tile.type === 'road') ? ny : v.y;
        v.progress = 0;
      });
    }
  };
})();
