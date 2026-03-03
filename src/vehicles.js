'use strict';

// ============================================================
// ST.Vehicles — vehicle data, movement logic, and canvas drawing
// Note: building flash decay is handled by ST.Game._loop (SRP)
// ============================================================
ST.Vehicles = (function() {
  console.log('[Vehicles] initialized');

  // velocityMult: speed relative to BPM-base; triggerRadius: Manhattan tiles swept
  // ignoresRoads: vehicle moves in straight lines, bounces at map edges (drone)
  const TYPES = {
    car:     { velocityMult: 1.00, attack: 0,     decay: 0.20, color: '#dce0e8', size: 5,  triggerRadius: 1 },
    bicycle: { velocityMult: 0.80, attack: 0.005, decay: 0.12, color: '#64b5f6', size: 3,  triggerRadius: 1 },
    bus:     { velocityMult: 1.20, attack: 0.010, decay: 0.45, color: '#ffa726', size: 7,  triggerRadius: 1 },
    tram:    { velocityMult: 0.50, attack: 0.015, decay: 0.70, color: '#81c784', size: 10, triggerRadius: 2 },
    drone:   { velocityMult: 1.80, attack: 0,     decay: 0.06, color: '#ce93d8', size: 4,  triggerRadius: 1, ignoresRoads: true }
  };

  const DIR_DELTA    = { N:{dx:0,dy:-1}, S:{dx:0,dy:1}, E:{dx:1,dy:0}, W:{dx:-1,dy:0} };
  const DIR_OPPOSITE = { N:'S', S:'N', E:'W', W:'E' };
  const DIR_ANGLE    = { E:0, S:Math.PI/2, W:Math.PI, N:-Math.PI/2 };
  const _vehicles = [];
  let _speedMult = 1.0;   // FM-A2: bass drop doubles speed temporarily
  let _chordMode = false;  // FM-A1: add a fifth voice on every trigger

  // Standard random direction choice (no routing)
  function _chooseDir(x, y, currentDir) {
    const tile = ST.Grid.getTile(x, y);
    if (!tile) return null;
    const roadDir = tile.roadDir || '';
    const possible = ['N','S','E','W'].filter(function(d) { return roadDir.includes(d); });
    if (possible.length === 0) return null;
    const noUTurn = possible.filter(function(d) { return d !== DIR_OPPOSITE[currentDir]; });
    const choices = noUTurn.length > 0 ? noUTurn : possible;
    return choices[Math.floor(Math.random() * choices.length)];
  }

  // VR-M1: find the tile position of the next waypoint in vehicle's route sequence
  function _findNextWaypoint(vehicle) {
    const nextSeq = (vehicle.routeSeq || 0) + 1;
    let bestMatch = null;
    let wrapMatch = null;
    ST.Grid.forEachTile(function(tile, x, y) {
      if (!tile.sign || tile.sign.type !== 'waypoint') return;
      const p = tile.sign.params || {};
      if (p.routeId !== vehicle.routeId) return;
      if (p.seq === nextSeq && !bestMatch) bestMatch = { x: x, y: y };
      if (p.seq === 1      && !wrapMatch)  wrapMatch  = { x: x, y: y };
    });
    return bestMatch || wrapMatch;
  }

  // VR-M1: greedy Manhattan-distance direction toward next waypoint in sequence
  function _chooseDirWithRoute(x, y, currentDir, vehicle) {
    const target = vehicle.routeId ? _findNextWaypoint(vehicle) : null;
    const tile = ST.Grid.getTile(x, y);
    if (!tile) return null;
    const roadDir = tile.roadDir || '';
    const possible = ['N','S','E','W'].filter(function(d) { return roadDir.includes(d); });
    if (possible.length === 0) return null;
    const noUTurn = possible.filter(function(d) { return d !== DIR_OPPOSITE[currentDir]; });
    const choices = noUTurn.length > 0 ? noUTurn : possible;
    if (!target) return choices[Math.floor(Math.random() * choices.length)];
    // pick direction that minimises Manhattan distance to the waypoint
    let best = null;
    let bestDist = Infinity;
    choices.forEach(function(d) {
      const dd   = DIR_DELTA[d];
      const dist = Math.abs((x + dd.dx) - target.x) + Math.abs((y + dd.dy) - target.y);
      if (dist < bestDist) { bestDist = dist; best = d; }
    });
    return best || choices[Math.floor(Math.random() * choices.length)];
  }

  // VR-N1: collect tiles within Manhattan radius r of (x,y), excluding center
  function _getTilesInRadius(x, y, r) {
    const result = [];
    for (let dx = -r; dx <= r; dx++) {
      for (let dy = -r; dy <= r; dy++) {
        if (dx === 0 && dy === 0) continue;
        if (Math.abs(dx) + Math.abs(dy) > r) continue;
        const tile = ST.Grid.getTile(x + dx, y + dy);
        if (tile) result.push({ tile: tile, x: x + dx, y: y + dy });
      }
    }
    return result;
  }

  // CA-A2: per-vehicle timbral filter
  const VEHICLE_FILTER = {
    car:     { filterType: 'lowpass',  filterCutoff: 3000 },
    bicycle: { filterType: 'bandpass', filterCutoff: 2200 },
    bus:     { filterType: 'lowpass',  filterCutoff: 800  },
    tram:    { filterType: 'lowpass',  filterCutoff: 600  },
    drone:   { filterType: 'highpass', filterCutoff: 1500 }
  };

  function _triggerNearby(vehicle) {
    const typeDef = TYPES[vehicle.type];
    const fp      = VEHICLE_FILTER[vehicle.type] || {};
    const radius  = typeDef.triggerRadius || 1;
    // QW-A1: snap trigger to next 16th-note grid boundary
    let quantizedStart;
    if (ST.Audio.isReady() && ST.Game && ST.Game.getBeatPhase) {
      const ctx       = ST.Audio.getContext();
      const now       = ctx.currentTime;
      const beatDur   = 60 / ST.Audio.getBPM();
      const phase     = ST.Game.getBeatPhase();
      const gridDur   = beatDur / 4;
      const delay     = gridDur - (phase % 0.25) * beatDur;
      quantizedStart  = now + Math.min(delay, gridDur);
    }
    const neighbors = radius > 1
      ? _getTilesInRadius(vehicle.x, vehicle.y, radius)
      : ST.Grid.getNeighbors(vehicle.x, vehicle.y);
    neighbors.forEach(function(nb) {
      if (nb.tile.type !== 'building' || !nb.tile.building) return;
      const b     = nb.tile.building;
      const level = b.level || 1;
      // VR-N1: attenuate by distance for wide-radius tram
      const dist     = Math.abs(nb.x - vehicle.x) + Math.abs(nb.y - vehicle.y);
      const distMult = dist > 1 ? 0.6 : 1.0;
      const bDef    = ST.Buildings.TYPES[b.type] || {};
      const fType   = bDef.filterType   || fp.filterType;
      const fCutoff = bDef.filterCutoff || fp.filterCutoff;
      const fQ      = bDef.filterQ;
      ST.Audio.trigger({
        waveform: b.waveform, pitch: b.pitch,
        attack: typeDef.attack, decay: typeDef.decay,
        velocity: typeDef.velocityMult * distMult,
        filterType: fType, filterCutoff: fCutoff, filterQ: fQ,
        startTime: quantizedStart
      });
      // FM-A1: chord mode — add a fifth above at -6dB
      if (_chordMode) {
        ST.Audio.trigger({
          waveform: b.waveform, pitch: b.pitch * 1.5,
          attack: typeDef.attack, decay: typeDef.decay,
          velocity: typeDef.velocityMult * 0.5 * distMult,
          filterType: fType, filterCutoff: fCutoff, filterQ: fQ,
          startTime: quantizedStart
        });
      }
      // CLR-M3: higher level buildings add harmonic overtone layers
      if (level >= 3) {
        ST.Audio.trigger({
          waveform: b.waveform, pitch: b.pitch * 2,
          attack: typeDef.attack, decay: typeDef.decay,
          velocity: typeDef.velocityMult * 0.25,
          filterType: fType, filterCutoff: fCutoff, filterQ: fQ
        });
      }
      if (level >= 5) {
        ST.Audio.trigger({
          waveform: b.waveform, pitch: b.pitch * 1.5,
          attack: typeDef.attack, decay: typeDef.decay,
          velocity: typeDef.velocityMult * 0.30,
          filterType: fType, filterCutoff: fCutoff, filterQ: fQ
        });
      }
      if (level >= 7) {
        ST.Audio.trigger({
          waveform: b.waveform, pitch: b.pitch * 3,
          attack: typeDef.attack, decay: typeDef.decay,
          velocity: typeDef.velocityMult * 0.20,
          filterType: fType, filterCutoff: fCutoff, filterQ: fQ
        });
      }
      b.flash = 1.0;
      if (ST.Renderer && ST.Renderer.markShake) ST.Renderer.markShake(0.5);
    });
  }

  // VR-M2: drone advance — straight-line, bounces at map boundaries
  function _advanceDrone(vehicle) {
    const d  = DIR_DELTA[vehicle.dir];
    if (!d) return;
    const nx = vehicle.x + d.dx;
    const ny = vehicle.y + d.dy;
    if (ST.Grid.isInBounds(nx, ny)) {
      vehicle.nextX = nx;
      vehicle.nextY = ny;
    } else {
      // bounce: reverse direction
      vehicle.dir   = DIR_OPPOSITE[vehicle.dir];
      const d2      = DIR_DELTA[vehicle.dir];
      const bx      = vehicle.x + d2.dx;
      const by      = vehicle.y + d2.dy;
      vehicle.nextX = ST.Grid.isInBounds(bx, by) ? bx : vehicle.x;
      vehicle.nextY = ST.Grid.isInBounds(bx, by) ? by : vehicle.y;
    }
  }

  function _advance(vehicle) {
    // VR-M2: drone bypasses road/sign checks entirely
    if (TYPES[vehicle.type] && TYPES[vehicle.type].ignoresRoads) {
      _advanceDrone(vehicle);
      return;
    }

    const signResult = ST.Signs.evaluate(vehicle, vehicle.x, vehicle.y);
    if (signResult && signResult.action === 'stop') {
      vehicle.stopped   = true;
      vehicle.stopTimer = signResult.duration || 0.5;
      vehicle.nextX = vehicle.x;
      vehicle.nextY = vehicle.y;
      return;
    }

    // VR-M1: pick up waypoint routeId/seq when arriving on a waypoint tile
    const curTile = ST.Grid.getTile(vehicle.x, vehicle.y);
    if (curTile && curTile.sign && curTile.sign.type === 'waypoint') {
      const wp = curTile.sign.params || {};
      if (!vehicle.routeId) {
        vehicle.routeId  = wp.routeId || 'A';
        vehicle.routeSeq = wp.seq || 1;
      } else if (vehicle.routeId === (wp.routeId || 'A')) {
        vehicle.routeSeq = wp.seq || vehicle.routeSeq;
      }
    }

    const dir = (signResult && signResult.action === 'force')
      ? signResult.direction
      : _chooseDirWithRoute(vehicle.x, vehicle.y, vehicle.dir, vehicle);

    if (!dir) { vehicle.nextX = vehicle.x; vehicle.nextY = vehicle.y; return; }

    const d    = DIR_DELTA[dir];
    const nx   = vehicle.x + d.dx;
    const ny   = vehicle.y + d.dy;
    const tile = ST.Grid.getTile(nx, ny);

    if (!tile || tile.type !== 'road') {
      const rev     = DIR_OPPOSITE[dir];
      const rd      = DIR_DELTA[rev];
      const revTile = ST.Grid.getTile(vehicle.x + rd.dx, vehicle.y + rd.dy);
      if (revTile && revTile.type === 'road') {
        vehicle.dir   = rev;
        vehicle.nextX = vehicle.x + rd.dx;
        vehicle.nextY = vehicle.y + rd.dy;
      } else {
        vehicle.nextX = vehicle.x;
        vehicle.nextY = vehicle.y;
      }
      return;
    }

    vehicle.dir   = dir;
    vehicle.nextX = nx;
    vehicle.nextY = ny;
  }

  function _makeVehicle(type, x, y, startDir) {
    const d = DIR_DELTA[startDir] || DIR_DELTA['E'];
    return {
      type: type, x: x, y: y,
      dir: startDir, progress: 0,
      nextX: x + d.dx, nextY: y + d.dy,
      stopped: false, stopTimer: 0,
      routeId: null, routeSeq: 0,  // VR-M1: waypoint routing state
      localSpeedMult: 1.0,         // VR-N2: per-tile speed zone modifier
      trail: [{ x: x, y: y }]     // AC-U3: route trail (max 12 positions)
    };
  }

  return {
    TYPES: TYPES,

    spawn: function(type, x, y) {
      if (_vehicles.length >= ST.Config.MAX_VEHICLES) return null;
      if (!TYPES[type]) return null;
      const typeDef = TYPES[type];

      // VR-M2: drone can spawn on any non-building tile (road or empty)
      if (typeDef.ignoresRoads) {
        if (!ST.Grid.isInBounds(x, y)) return null;
        const t = ST.Grid.getTile(x, y);
        if (t && t.type === 'building') return null;
        const dirs     = ['N', 'S', 'E', 'W'];
        const startDir = dirs[Math.floor(Math.random() * dirs.length)];
        const vehicle  = _makeVehicle(type, x, y, startDir);
        if (!ST.Grid.isInBounds(vehicle.nextX, vehicle.nextY)) {
          vehicle.nextX = x;
          vehicle.nextY = y;
        }
        _vehicles.push(vehicle);
        _triggerNearby(vehicle);
        return vehicle;
      }

      const tile = ST.Grid.getTile(x, y);
      if (!tile || tile.type !== 'road') return null;
      const roadDir  = tile.roadDir || '';
      const dirs     = ['N','S','E','W'].filter(function(d) { return roadDir.includes(d); });
      const startDir = dirs.length > 0 ? dirs[Math.floor(Math.random() * dirs.length)] : 'E';
      const vehicle  = _makeVehicle(type, x, y, startDir);
      const nextTile = ST.Grid.getTile(vehicle.nextX, vehicle.nextY);
      if (!nextTile || nextTile.type !== 'road') {
        vehicle.nextX = x;
        vehicle.nextY = y;
      }
      _vehicles.push(vehicle);
      // QW-M3: immediate "engine start" sound — trigger adjacent buildings on spawn
      _triggerNearby(vehicle);
      return vehicle;
    },

    remove: function(vehicle) {
      const idx = _vehicles.indexOf(vehicle);
      if (idx !== -1) _vehicles.splice(idx, 1);
    },

    // VR-M1: detach vehicle from its route so it resumes free navigation
    clearRoute: function(vehicle) {
      vehicle.routeId  = null;
      vehicle.routeSeq = 0;
    },

    // dt: delta time in seconds. Flash decay is handled by ST.Game._loop.
    update: function(dt) {
      const baseBpmSpeed = (ST.Audio.getBPM() / 120) * 2.0 * _speedMult;

      _vehicles.forEach(function(vehicle) {
        // VR-N2: read speed multiplier from the current tile's speed-zone sign
        const curTile  = ST.Grid.getTile(vehicle.x, vehicle.y);
        const signType = curTile && curTile.sign ? curTile.sign.type : null;
        vehicle.localSpeedMult =
          signType === 'speedUp'  ? 2.0 :
          signType === 'slowDown' ? 0.5 : 1.0;

        if (vehicle.stopped) {
          vehicle.stopTimer -= dt;
          if (vehicle.stopTimer <= 0) {
            vehicle.stopped = false;
            _advance(vehicle);
          }
          return;
        }

        const typeDef = TYPES[vehicle.type] || TYPES.car;
        const speed   = baseBpmSpeed * typeDef.velocityMult * vehicle.localSpeedMult;
        vehicle.progress += dt * speed;

        while (vehicle.progress >= 1.0 && !vehicle.stopped) {
          vehicle.progress -= 1.0;
          vehicle.x = vehicle.nextX;
          vehicle.y = vehicle.nextY;
          // AC-U3: append new position to trail (max 12 entries)
          const last = vehicle.trail[vehicle.trail.length - 1];
          if (!last || last.x !== vehicle.x || last.y !== vehicle.y) {
            vehicle.trail.push({ x: vehicle.x, y: vehicle.y });
            if (vehicle.trail.length > 12) vehicle.trail.shift();
          }
          _triggerNearby(vehicle);
          _advance(vehicle);
          if (vehicle.nextX === vehicle.x && vehicle.nextY === vehicle.y) {
            vehicle.progress = 0;
            break;
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

        ctx.save();
        ctx.translate(px, py);
        ctx.fillStyle   = typeDef.color;
        ctx.strokeStyle = 'rgba(0,0,0,0.55)';
        ctx.lineWidth   = 1;

        if (vehicle.type === 'drone') {
          // VR-V2: drone — fixed-orientation diamond + corner propeller dots
          const ds = s * 1.4;
          ctx.beginPath();
          ctx.moveTo(0, -ds);
          ctx.lineTo(ds, 0);
          ctx.lineTo(0, ds);
          ctx.lineTo(-ds, 0);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = 'rgba(255,255,255,0.6)';
          [[-ds * 0.7, -ds * 0.7],[ds * 0.7, -ds * 0.7],[ds * 0.7, ds * 0.7],[-ds * 0.7, ds * 0.7]].forEach(function(pos) {
            ctx.beginPath();
            ctx.arc(pos[0], pos[1], 1.8, 0, Math.PI * 2);
            ctx.fill();
          });
        } else {
          // All road vehicles rotate with direction
          ctx.rotate(DIR_ANGLE[vehicle.dir] || 0);

          if (vehicle.type === 'bicycle') {
            ctx.beginPath();
            ctx.arc(0, 0, s, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
          } else if (vehicle.type === 'tram') {
            // VR-V1: tram — wide body with window strip
            ctx.fillRect(-s, -s * 0.55, s * 2, s * 1.1);
            ctx.strokeRect(-s, -s * 0.55, s * 2, s * 1.1);
            ctx.fillStyle = 'rgba(0,0,0,0.35)';
            ctx.fillRect(-s * 0.65, -s * 0.35, s * 0.5, s * 0.7);
            ctx.fillRect( s * 0.15, -s * 0.35, s * 0.5, s * 0.7);
          } else {
            ctx.fillRect(-s, -s * 0.6, s * 2, s * 1.2);
            ctx.strokeRect(-s, -s * 0.6, s * 2, s * 1.2);
          }
        }

        ctx.restore();
      });
    },

    getAll:       function() { return _vehicles.slice(); },
    count:        function() { return _vehicles.length; },
    // FM-A2: speed multiplier for bass drop event
    setSpeedMult: function(m) { _speedMult = m; },
    // FM-A1: chord mode toggle
    setChordMode: function(on) { _chordMode = on; },
    getChordMode: function() { return _chordMode; },
    // MM-M3: DJ Booth — reverse all vehicle directions for a musical "break"
    remix: function() {
      _vehicles.forEach(function(v) {
        const rev  = DIR_OPPOSITE[v.dir] || v.dir;
        const d    = DIR_DELTA[rev];
        const nx   = v.x + d.dx;
        const ny   = v.y + d.dy;
        const tile = ST.Grid.getTile(nx, ny);
        v.dir      = rev;
        if (TYPES[v.type] && TYPES[v.type].ignoresRoads) {
          v.nextX = ST.Grid.isInBounds(nx, ny) ? nx : v.x;
          v.nextY = ST.Grid.isInBounds(nx, ny) ? ny : v.y;
        } else {
          v.nextX = (tile && tile.type === 'road') ? nx : v.x;
          v.nextY = (tile && tile.type === 'road') ? ny : v.y;
        }
        v.progress = 0;
      });
    }
  };
})();
