'use strict';

// ============================================================
// ST.Vehicles — vehicle data, movement logic, and canvas drawing
// Note: building flash decay is handled by ST.Game._loop (SRP)
// ============================================================
ST.Vehicles = (function() {
  console.log('[Vehicles] initialized');

  const TYPES = {
    car:     { velocityMult: 1.00, attack: 0,     decay: 0.20, color: '#dce0e8', size: 5 },
    bicycle: { velocityMult: 0.80, attack: 0.005, decay: 0.12, color: '#64b5f6', size: 3 },
    bus:     { velocityMult: 1.20, attack: 0.010, decay: 0.45, color: '#ffa726', size: 7 }
  };

  const DIR_DELTA    = { N:{dx:0,dy:-1}, S:{dx:0,dy:1}, E:{dx:1,dy:0}, W:{dx:-1,dy:0} };
  const DIR_OPPOSITE = { N:'S', S:'N', E:'W', W:'E' };
  const DIR_ANGLE    = { E:0, S:Math.PI/2, W:Math.PI, N:-Math.PI/2 };
  const _vehicles = [];

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

  function _triggerNearby(vehicle) {
    const typeDef = TYPES[vehicle.type];
    ST.Grid.getNeighbors(vehicle.x, vehicle.y).forEach(function(nb) {
      if (nb.tile.type === 'building' && nb.tile.building) {
        const b = nb.tile.building;
        ST.Audio.trigger({
          waveform: b.waveform, pitch: b.pitch,
          attack: typeDef.attack, decay: typeDef.decay,
          velocity: typeDef.velocityMult
        });
        b.flash = 1.0;
      }
    });
  }

  function _advance(vehicle) {
    const signResult = ST.Signs.evaluate(vehicle, vehicle.x, vehicle.y);
    if (signResult && signResult.action === 'stop') {
      vehicle.stopped   = true;
      vehicle.stopTimer = signResult.duration || 0.5;
      vehicle.nextX = vehicle.x;
      vehicle.nextY = vehicle.y;
      return;
    }

    const dir = (signResult && signResult.action === 'force')
      ? signResult.direction
      : _chooseDir(vehicle.x, vehicle.y, vehicle.dir);

    if (!dir) { vehicle.nextX = vehicle.x; vehicle.nextY = vehicle.y; return; }

    const d  = DIR_DELTA[dir];
    const nx = vehicle.x + d.dx;
    const ny = vehicle.y + d.dy;
    const tile = ST.Grid.getTile(nx, ny);

    if (!tile || tile.type !== 'road') {
      const rev  = DIR_OPPOSITE[dir];
      const rd   = DIR_DELTA[rev];
      const revTile = ST.Grid.getTile(vehicle.x + rd.dx, vehicle.y + rd.dy);
      if (revTile && revTile.type === 'road') {
        vehicle.dir = rev;
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

  return {
    TYPES: TYPES,

    spawn: function(type, x, y) {
      if (_vehicles.length >= ST.Config.MAX_VEHICLES) return null;
      const tile = ST.Grid.getTile(x, y);
      if (!tile || tile.type !== 'road') return null;
      if (!TYPES[type]) return null;

      const roadDir = tile.roadDir || '';
      const dirs = ['N','S','E','W'].filter(function(d) { return roadDir.includes(d); });
      const startDir = dirs.length > 0 ? dirs[Math.floor(Math.random() * dirs.length)] : 'E';
      const d = DIR_DELTA[startDir] || DIR_DELTA['E'];

      const vehicle = {
        type: type, x: x, y: y,
        dir: startDir, progress: 0,
        nextX: x + d.dx, nextY: y + d.dy,
        stopped: false, stopTimer: 0
      };

      const nextTile = ST.Grid.getTile(vehicle.nextX, vehicle.nextY);
      if (!nextTile || nextTile.type !== 'road') {
        vehicle.nextX = x;
        vehicle.nextY = y;
      }

      _vehicles.push(vehicle);
      return vehicle;
    },

    remove: function(vehicle) {
      const idx = _vehicles.indexOf(vehicle);
      if (idx !== -1) _vehicles.splice(idx, 1);
    },

    // dt: delta time in seconds. Flash decay is handled by ST.Game._loop.
    update: function(dt) {
      const speed = (ST.Audio.getBPM() / 120) * 2.0;

      _vehicles.forEach(function(vehicle) {
        if (vehicle.stopped) {
          vehicle.stopTimer -= dt;
          if (vehicle.stopTimer <= 0) {
            vehicle.stopped = false;
            _advance(vehicle);
          }
          return;
        }

        vehicle.progress += dt * speed;

        while (vehicle.progress >= 1.0 && !vehicle.stopped) {
          vehicle.progress -= 1.0;
          vehicle.x = vehicle.nextX;
          vehicle.y = vehicle.nextY;
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
        ctx.rotate(DIR_ANGLE[vehicle.dir] || 0);
        ctx.fillStyle   = typeDef.color;
        ctx.strokeStyle = 'rgba(0,0,0,0.55)';
        ctx.lineWidth   = 1;

        if (vehicle.type === 'bicycle') {
          ctx.beginPath();
          ctx.arc(0, 0, s, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        } else {
          ctx.fillRect(-s, -s * 0.6, s * 2, s * 1.2);
          ctx.strokeRect(-s, -s * 0.6, s * 2, s * 1.2);
        }
        ctx.restore();
      });
    },

    getAll: function() { return _vehicles.slice(); },
    count:  function() { return _vehicles.length; }
  };
})();
