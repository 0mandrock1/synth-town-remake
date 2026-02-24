# КОНТРАКТЫ МЕЖДУ ЭТАПАМИ

## Принцип
Сигнатуры зафиксированных API менять НЕЛЬЗЯ — только расширять (append-only).
Перед началом этапа N — убедись что API этапов 1..(N-1) существуют и работают.

---

## Этап 1 СОЗДАЁТ:

```javascript
// === ST.Config ===
ST.Config.TILE           // number: 32
ST.Config.GRID_W         // number: 20
ST.Config.GRID_H         // number: 15
ST.Config.BPM_DEFAULT    // number: 120
ST.Config.BPM_MIN        // number: 60
ST.Config.BPM_MAX        // number: 180
ST.Config.MAX_VEHICLES   // number: 8
ST.Config.MAX_VOICES     // number: 8
ST.Config.DEV            // boolean: false
ST.Config.COLORS         // Object: {bg, grid, road, roadLine, ui, border, text, accent}

// === ST.Grid ===
ST.Grid.init()                          // void — создать пустую сетку
ST.Grid.getTile(x, y)                   // {type, roadDir, building}|null
ST.Grid.setTile(x, y, data)             // void — Object.assign в тайл
ST.Grid.getNeighbors(x, y)              // {tile, x, y, dir}[] — N,S,E,W
ST.Grid.isInBounds(x, y)                // boolean
ST.Grid.forEachTile(callback)           // void — callback(tile, x, y)

// === ST.Audio ===
ST.Audio.init()                          // void — создать AudioContext (user gesture!)
ST.Audio.trigger(params)                 // void — {waveform, pitch, decay, velocity?}
ST.Audio.setBPM(bpm)                     // void
ST.Audio.getBPM()                        // number
ST.Audio.isReady()                       // boolean
ST.Audio.getContext()                     // AudioContext|null
ST.Audio.getMasterGain()                 // GainNode|null
ST.Audio.onTrigger                       // function|null — callback для UI

// === ST.Renderer ===
ST.Renderer.init(canvasElement)          // void
ST.Renderer.drawFrame()                  // void — полная перерисовка
ST.Renderer.markDirty(x, y)             // void

// === ST.Game ===
ST.Game.init()                           // void — bootstrap
ST.Game.start()                          // void — play
ST.Game.stop()                           // void — stop
ST.Game.isPlaying()                      // boolean
```

---

## Этап 2 ПОТРЕБЛЯЕТ: Config, Grid, Audio, Renderer. СОЗДАЁТ:

```javascript
// === ST.Buildings ===
ST.Buildings.TYPES                       // Object — {sine, square, triangle, sawtooth, pulse}
ST.Buildings.create(type, x, y)          // Building|null (null если занято)
ST.Buildings.remove(x, y)               // void
ST.Buildings.draw(ctx, building)         // void
ST.Buildings.getAt(x, y)                // Building|null
ST.Buildings.getProperties(building)     // {pitch, decay, waveform, color, level}
ST.Buildings.setProperty(b, key, val)    // void
ST.Buildings.count()                     // number
ST.Buildings.getAll()                    // Building[]

// === ST.Roads ===
ST.Roads.place(x, y)                    // boolean — true если размещено
ST.Roads.remove(x, y)                   // void
ST.Roads.autoConnect(x, y)              // void — пересчитать shape
ST.Roads.getNextTile(x, y, dir)         // {x, y, dir}|null
ST.Roads.draw(ctx, x, y, tile)          // void
ST.Roads.count()                         // number

// === ST.UI ===
ST.UI.init()                             // void
ST.UI.setTool(toolName)                  // void
ST.UI.getTool()                          // string
ST.UI.showProperties(building)           // void
ST.UI.hideProperties()                   // void
ST.UI.updateTransport(bpm, playing)      // void
```

---

## Этап 3 ПОТРЕБЛЯЕТ: всё выше. СОЗДАЁТ:

```javascript
// === ST.Vehicles ===
ST.Vehicles.TYPES                        // Object — {car, bicycle, bus}
ST.Vehicles.spawn(type, x, y)           // Vehicle|null
ST.Vehicles.remove(vehicle)              // void
ST.Vehicles.update(dt)                   // void — обновить все
ST.Vehicles.draw(ctx)                    // void — отрисовать все
ST.Vehicles.getAll()                     // Vehicle[]
ST.Vehicles.count()                      // number

// === ST.Signs ===
ST.Signs.TYPES                           // Object — {trafficLight, oneWay, roundabout}
ST.Signs.place(type, x, y, params)       // boolean
ST.Signs.remove(x, y)                   // void
ST.Signs.evaluate(vehicle, x, y)         // {action, direction}|null
ST.Signs.draw(ctx, x, y, sign)          // void
```

---

## Этап 4 ПОТРЕБЛЯЕТ: всё выше. СОЗДАЁТ:

```javascript
// === ST.Score ===
ST.Score.calculate()                     // number
ST.Score.getThreshold()                  // {min, name, decorations}
ST.Score.THRESHOLDS                      // Array

// === ST.Unlocks ===
ST.Unlocks.check()                       // Unlock[]|null — новые
ST.Unlocks.isUnlocked(id)               // boolean
ST.Unlocks.getAll()                      // Unlock[]
```

---

## Этап 5 ПОТРЕБЛЯЕТ: всё выше. СОЗДАЁТ:

```javascript
// === ST.Effects ===
ST.Effects.init()                        // void
ST.Effects.getCompressor()               // DynamicsCompressorNode
ST.Effects.getDelay()                    // DelayNode
ST.Effects.getReverb()                   // ConvolverNode
ST.Effects.setDelayTime(seconds)         // void
ST.Effects.setDelayFeedback(value)       // void — 0..0.8
```

Расширяет ST.Audio.trigger: добавляет filterType, filterCutoff, sendDelay, sendReverb в params.

---

## Этап 7 ПОТРЕБЛЯЕТ: всё выше. СОЗДАЁТ:

```javascript
// === ST.State ===
ST.State.serialize()                     // string (base64)
ST.State.deserialize(encoded)            // boolean
ST.State.save(slot)                      // boolean
ST.State.load(slot)                      // boolean
ST.State.exportURL()                     // void — пишет в location.hash
ST.State.importURL()                     // boolean — читает из location.hash
```

---

## Этап 9 ПОТРЕБЛЯЕТ: всё выше. СОЗДАЁТ:

```javascript
// === ST.MIDI ===
ST.MIDI.export()                         // boolean — собирает .mid и инициирует download
ST.MIDI.exportBlob()                     // Blob|null — вернуть MIDI blob без скачивания
ST.MIDI.buildTracks()                    // Array — собрать MIDI-события по текущему состоянию
ST.MIDI.noteFromPitch(hz)                // number — MIDI note number (0..127)
```
