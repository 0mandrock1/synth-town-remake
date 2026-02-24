# SYNTH TOWN — ПРОМПТ ДЛЯ CLAUDE CODE
> **Версия:** 0.1  
> **Changelog:**  
> - v0.1 — Элемент 1: Архитектурный манифест  
> - v0.2 — Элемент 2: Контракты между этапами  
> - v0.3 — Элемент 3: Спецификация ощущений (замена референса)  
> - v0.4 — Элемент 4: Self-contained этапы  
> - v0.5 — Элемент 5: Рабочие код-сниппеты (vanilla JS + JSDoc)  
> - v0.6 — Элемент 6: Тест-сценарии  
> - v0.7 — Элемент 7: Error handling и edge cases  
> - v0.8 — Элемент 8: Реалистичный scope (client-only)  
> - v0.9 — Элемент 9: Мета-инструкции для Claude Code  
> - v1.0 — Элемент 10: MoSCoW-приоритизация  

---

## ОБЗОР ПРОЕКТА
Браузерный city builder где город = музыкальный секвенсор.
Здания = осцилляторы, дороги = маршруты, машины = playheadы.
Один файл `index.html`, Web Audio API, без внешних зависимостей (кроме шрифтов CDN).

**Целевое ощущение:** пользователь рисует город — город звучит. Каждое действие даёт мгновенную звуковую обратную связь. Визуал — neo-city с неоновыми подсветками. Звук — чистый, без клиппинга, с приятным ревербом.

---

## ИНСТРУКЦИИ ДЛЯ CLAUDE CODE

### Workflow
1. Работай СТРОГО по одному этапу за сессию
2. Перед началом этапа — прочитай секцию "ПОТРЕБЛЯЕТ API" и убедись что эти функции существуют и работают
3. После этапа — выполни ВСЕ тест-сценарии из секции "ТЕСТЫ"
4. Не переходи к следующему этапу пока тесты не пройдены
5. Коммит-сообщение: `[STAGE N] краткое описание`

### Code Style
- Vanilla JS (ES2020+). Никакого TypeScript-синтаксиса
- JSDoc для типизации: `/** @param {number} x */`
- `const` по умолчанию, `let` только если переприсваивание необходимо, `var` — никогда
- Строгий режим: `'use strict';` в начале `<script>`
- Одинарные кавычки для строк
- Точка с запятой обязательна
- Без trailing comma в последнем элементе

### Отладка
- В начале каждого модуля: `console.log('[MODULE_NAME] initialized')`
- При trigger звука: `console.log('[AUDIO] trigger:', waveform, pitch)`
- FPS-счётчик в dev mode: `ST.Config.DEV = true`

### Когда рефакторить
- Модуль > 200 строк → разбить на суб-модули
- Функция > 40 строк → извлечь helpers
- Вложенность > 3 уровней → early return, extract fn
- Copy-paste > 2 раз → извлечь общую функцию

### Чего НЕ делать
- Не добавлять библиотеки/фреймворки (React, Tone.js, etc.)
- Не создавать отдельные файлы (всё в одном index.html)
- Не использовать `eval`, `innerHTML` для пользовательского ввода
- Не менять сигнатуры API предыдущих этапов — только расширять
- Не оптимизировать преждевременно — этап 8 для оптимизации

---

## АРХИТЕКТУРА

### Файловая стратегия
Один файл `index.html` с inline `<script>` и `<style>`.
Код организован через namespace-объект `ST` (SynthTown) и IIFE-модули.

**Порядок в файле (сверху вниз, нарушать НЕЛЬЗЯ):**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Synth Town</title>
  <link href="https://fonts.googleapis.com/icon?family=Material+Icons+Round" rel="stylesheet">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    /* === RESET === */
    /* === LAYOUT === */
    /* === TOOLBAR === */
    /* === PROPERTY PANEL === */
    /* === TRANSPORT BAR === */
    /* === MODALS & OVERLAYS === */
  </style>
</head>
<body>
  <div id="app">
    <aside id="toolbar"></aside>
    <main><canvas id="game"></canvas></main>
    <aside id="properties"></aside>
    <footer id="transport"></footer>
  </div>

  <script>
  'use strict';
  const ST = {};

  // Порядок модулей (зависимости сверху вниз):
  // 1. ST.Config
  // 2. ST.Audio
  // 3. ST.Grid
  // 4. ST.Buildings
  // 5. ST.Roads
  // 6. ST.Vehicles
  // 7. ST.Signs        (этап 3+)
  // 8. ST.Effects       (этап 5+)
  // 9. ST.Score         (этап 4+)
  // 10. ST.Unlocks      (этап 4+)
  // 11. ST.UI
  // 12. ST.State
  // 13. ST.Renderer
  // 14. ST.Game
  // BOOT: ST.Game.init()
  </script>
</body>
</html>
```

### Карта зависимостей
```
Config     ← (все модули читают, никто не пишет)
Audio      ← Buildings, Vehicles, Effects
Grid       ← Buildings, Roads, Vehicles, Renderer, Signs
Buildings  ← UI, Renderer, Game, Vehicles
Roads      ← UI, Renderer, Game, Vehicles
Vehicles   ← UI, Renderer, Game
Signs      ← Vehicles, UI, Renderer
Effects    ← Audio, UI
Score      ← Game, UI
Unlocks    ← Game, UI
UI         ← Game
State      ← Game
Renderer   ← Game
Game       ← boot
```

**Циклические зависимости ЗАПРЕЩЕНЫ.** Для обратной связи — callback:
```javascript
ST.Audio.onTrigger = null; // UI подпишется: ST.Audio.onTrigger = fn
```

### Правила размера
| Единица      | Лимит       | При превышении                                    |
|-------------|-------------|--------------------------------------------------|
| Модуль      | 200 строк   | Разбить: `ST.Audio.Effects`, `ST.Audio.VoicePool` |
| Функция     | 40 строк    | Извлечь helper-функции                            |
| Вложенность | 3 уровня    | Early return, extract fn                          |

### Naming Convention
- Модули: `ST.PascalCase`
- Публичные методы: `camelCase`
- Константы: `UPPER_SNAKE_CASE`
- DOM id: `kebab-case`
- CSS классы: `st-kebab-case`

---

## СПЕЦИФИКАЦИЯ ОЩУЩЕНИЙ

Конкретные числа и поведение. Claude Code проверяет кодом, не визуально.

### Визуал
| Параметр              | Значение                          |
|-----------------------|-----------------------------------|
| Canvas                | 640×480 рабочая область           |
| Тайл                  | 32×32 px                          |
| Сетка                 | 20×15 тайлов                      |
| Фон                   | `#0a0a12`                         |
| Линии сетки           | `rgba(255,255,255,0.05)`, 1px     |
| Дороги                | `#1a1a2e`, белый пунктир dashArray `[4,4]` |
| Toolbar слева         | 200px ширина, `#12122a`           |
| Property panel справа | 220px ширина, появляется при клике на здание |
| Transport bar снизу   | 64px высота                       |
| Шрифт UI              | Inter, fallback sans-serif        |

### Здания — размеры и визуал
| Тип       | Цвет основы | Ширина      | Высота (level 1–8)   | Крыша             |
|-----------|-------------|-------------|----------------------|-------------------|
| sine      | `#64b5f6`   | 0.8 тайла   | 0.4–1.5 тайла        | Полукруг (arc)    |
| square    | `#ef5350`   | 0.9 тайла   | 0.3–1.2 тайла        | Плоская + труба   |
| triangle  | `#66bb6a`   | 0.6 тайла   | 0.6–2.0 тайла        | Острый шпиль      |
| sawtooth  | `#ffa726`   | 0.9 тайла   | 0.4–1.4 тайла        | Ступенчатая (пила)|
| pulse     | `#ab47bc`   | 0.3 тайла   | 0.8–2.5 тайла        | Антенна + мигание |

### Trigger flash
- При срабатывании: `shadowBlur` 4→20→4
- Длительность: 150ms
- Easing: ease-out

### Звук
| Параметр             | Значение                  |
|---------------------|---------------------------|
| Waveforms           | sine, square, triangle, sawtooth |
| Pitch range         | C2 (65Hz) – C6 (1047Hz)  |
| Default decay       | sine 1.2s, square 0.3s, triangle 0.8s, sawtooth 0.5s, pulse 0.15s |
| Attack              | 0ms (мгновенный старт)    |
| Gain при trigger    | `0.4 × velocity`          |
| Gain envelope end   | exponentialRamp до 0.001   |
| Master compressor   | threshold -24dB, ratio 4:1 |

### Движение машин
| Параметр            | Значение                          |
|--------------------|-----------------------------------|
| Базовая скорость    | 2 тайла/сек при BPM 120          |
| Формула скорости    | `(bpm / 120) * baseSpeed * vehicleMultiplier` |
| Движение            | Линейная интерполяция между центрами тайлов |
| На перекрёстке      | Случайный выбор из доступных направлений (кроме разворота, если не тупик) |
| В тупике            | Разворот на 180°                  |
| Trigger расстояние  | Манхэттенское расстояние = 1 (машина на road, здание на соседнем тайле) |

### BPM
| Параметр     | Значение       |
|-------------|----------------|
| Default     | 120            |
| Range       | 60–180         |
| Step        | 1              |
| Влияние     | Скорость машин, delay time (если sync) |

---

## ERROR HANDLING И EDGE CASES

### AudioContext
```javascript
// AudioContext MUST be created on user gesture (click/tap)
// Показать overlay "Click to start" при первом заходе
// После клика: ST.Audio.init() создаёт ctx
// Если ctx.state === 'suspended' → ctx.resume()
```

### Canvas
- При window resize: НЕ масштабировать canvas, оставить фиксированный размер
- Если window < canvas: CSS `overflow: auto` на контейнере
- devicePixelRatio: учитывать для чёткости на retina (`canvas.width = W * dpr`)

### Лимиты
| Ресурс          | Лимит | При превышении                           |
|----------------|-------|------------------------------------------|
| Здания         | 50    | UI: кнопка серая + tooltip               |
| Машины         | 8     | UI: счётчик красный, кнопка Add серая     |
| Голоса (audio) | 8     | Voice stealing: убить самый старый        |
| Дорожные тайлы | 200   | Мягкий лимит: предупреждение в UI         |
| Частицы        | 100   | Object pool, переиспользование            |

### Graceful Degradation
- Web Audio API отсутствует → сообщение "Ваш браузер не поддерживает Web Audio"
- requestAnimationFrame нет → fallback `setTimeout(fn, 16)`
- localStorage недоступен → работать без автосейва, скрыть кнопки save/load

---

## КОНТРАКТЫ МЕЖДУ ЭТАПАМИ

### Принцип
Сигнатуры зафиксированных API менять НЕЛЬЗЯ — только расширять (append-only).

### Этап 1 СОЗДАЁТ:
```javascript
// ST.Config
ST.Config.TILE         // number: 32
ST.Config.GRID_W       // number: 20
ST.Config.GRID_H       // number: 15
ST.Config.COLORS       // Object: {bg, grid, road, ui, border, text, accent}
ST.Config.DEV          // boolean: false

// ST.Grid
ST.Grid.init()                        // void
ST.Grid.getTile(x, y)                 // {type, roadDir, building}|null
ST.Grid.setTile(x, y, data)           // void
ST.Grid.getNeighbors(x, y)            // {tile,x,y,dir}[]
ST.Grid.isInBounds(x, y)              // boolean
ST.Grid.forEachTile(callback)         // void — callback(tile, x, y)

// ST.Audio
ST.Audio.init()                        // void (call on user gesture!)
ST.Audio.trigger(params)               // void — {waveform, pitch, decay, velocity}
ST.Audio.setBPM(bpm)                   // void
ST.Audio.getBPM()                      // number
ST.Audio.isReady()                     // boolean
ST.Audio.getContext()                   // AudioContext|null

// ST.Renderer
ST.Renderer.init(canvasElement)        // void
ST.Renderer.drawFrame()                // void
ST.Renderer.markDirty(x, y)           // void

// ST.Game
ST.Game.init()                         // void
ST.Game.start()                        // void
ST.Game.stop()                         // void
ST.Game.isPlaying()                    // boolean
```

### Этап 2 ПОТРЕБЛЯЕТ: Config, Grid, Audio, Renderer. СОЗДАЁТ:
```javascript
// ST.Buildings
ST.Buildings.TYPES                     // Object — {sine, square, triangle, sawtooth, pulse}
ST.Buildings.create(type, x, y)        // Building|null
ST.Buildings.remove(x, y)             // void
ST.Buildings.draw(ctx, building)       // void
ST.Buildings.getAt(x, y)              // Building|null
ST.Buildings.getProperties(building)   // Object
ST.Buildings.setProperty(b, key, val)  // void

// ST.Roads
ST.Roads.place(x, y)                  // boolean
ST.Roads.remove(x, y)                 // void
ST.Roads.autoConnect(x, y)            // void
ST.Roads.getNextTile(x, y, dir)       // {x,y,dir}|null
ST.Roads.draw(ctx, x, y, tile)        // void

// ST.UI
ST.UI.init()                           // void
ST.UI.setTool(toolName)                // void
ST.UI.getTool()                        // string
ST.UI.showProperties(building)         // void
ST.UI.hideProperties()                 // void
ST.UI.updateTransport(bpm, playing)    // void
```

### Этап 3 ПОТРЕБЛЯЕТ: всё выше. СОЗДАЁТ:
```javascript
// ST.Vehicles
ST.Vehicles.TYPES                      // Object — {car, bicycle, bus}
ST.Vehicles.spawn(type, x, y)         // Vehicle|null
ST.Vehicles.remove(vehicle)            // void
ST.Vehicles.update(dt)                 // void
ST.Vehicles.draw(ctx)                  // void
ST.Vehicles.getAll()                   // Vehicle[]
ST.Vehicles.count()                    // number

// ST.Signs
ST.Signs.TYPES                         // Object — {trafficLight, oneWay, roundabout}
ST.Signs.place(type, x, y, params)     // boolean
ST.Signs.remove(x, y)                 // void
ST.Signs.evaluate(vehicle, x, y)       // {action, direction}|null
ST.Signs.draw(ctx, x, y, sign)        // void
```

### Этап 4+ РАСШИРЯЕТ (не ломает):
```javascript
// ST.Score
ST.Score.calculate()                   // number
ST.Score.getThreshold()                // {name, decorations}
ST.Score.THRESHOLDS                    // Array

// ST.Unlocks
ST.Unlocks.check()                     // Unlock[]|null
ST.Unlocks.isUnlocked(id)             // boolean
ST.Unlocks.getAll()                    // Unlock[]
```

---

## ЭТАП 1 — ФУНДАМЕНТ (MVP)

**Цель:** сетка + размещение одного здания + одна машина + звук при проезде  
**ПОТРЕБЛЯЕТ API:** нет (первый этап)  
**СОЗДАЁТ API:** Config, Grid, Audio, Renderer, Game

### Приоритеты (MoSCoW)
| Приоритет | Фича |
|-----------|-------|
| **MUST**  | Canvas с сеткой 20×15, тёмный фон |
| **MUST**  | Клик → размещение sine-здания |
| **MUST**  | Правый клик → удаление |
| **MUST**  | Размещение road-тайлов (без autoconnect) |
| **MUST**  | Одна машина (Car) по road-тайлам |
| **MUST**  | Звук при проезде мимо здания |
| **MUST**  | Play/Stop кнопка |
| **MUST**  | BPM slider 60–180 |
| **SHOULD** | Hover highlight тайла |
| **SHOULD** | Master volume slider |
| **SHOULD** | "Click to start" overlay для AudioContext |
| **COULD**  | Курсор по контексту |
| **COULD**  | Dev mode FPS counter |

### 1.1 ST.Config
```javascript
ST.Config = (function() {
  return {
    TILE: 32,
    GRID_W: 20,
    GRID_H: 15,
    BPM_DEFAULT: 120,
    BPM_MIN: 60,
    BPM_MAX: 180,
    MAX_VEHICLES: 8,
    MAX_VOICES: 8,
    DEV: false,
    COLORS: {
      bg: '#0a0a12',
      grid: 'rgba(255,255,255,0.05)',
      road: '#1a1a2e',
      roadLine: 'rgba(255,255,255,0.3)',
      ui: '#12122a',
      border: 'rgba(255,255,255,0.1)',
      text: '#e0e0e0',
      accent: '#64b5f6'
    }
  };
})();
```

### 1.2 ST.Grid
```javascript
ST.Grid = (function() {
  /** @type {Array<Array<Object>>} */
  let _tiles = [];

  function init() {
    _tiles = [];
    for (let y = 0; y < ST.Config.GRID_H; y++) {
      _tiles[y] = [];
      for (let x = 0; x < ST.Config.GRID_W; x++) {
        _tiles[y][x] = { type: 'empty', roadDir: [], building: null };
      }
    }
    console.log('[Grid] initialized', ST.Config.GRID_W + 'x' + ST.Config.GRID_H);
  }

  /** @param {number} x @param {number} y @returns {Object|null} */
  function getTile(x, y) {
    if (!isInBounds(x, y)) return null;
    return _tiles[y][x];
  }

  /** @param {number} x @param {number} y @param {Object} data */
  function setTile(x, y, data) {
    if (!isInBounds(x, y)) return;
    Object.assign(_tiles[y][x], data);
  }

  /** @param {number} x @param {number} y @returns {boolean} */
  function isInBounds(x, y) {
    return x >= 0 && x < ST.Config.GRID_W && y >= 0 && y < ST.Config.GRID_H;
  }

  /**
   * @param {number} x @param {number} y
   * @returns {Array<{tile:Object, x:number, y:number, dir:string}>}
   */
  function getNeighbors(x, y) {
    const dirs = [{x:0,y:-1,d:'N'},{x:0,y:1,d:'S'},{x:1,y:0,d:'E'},{x:-1,y:0,d:'W'}];
    return dirs.map(function(dir) {
      const t = getTile(x + dir.x, y + dir.y);
      return t ? { tile: t, x: x + dir.x, y: y + dir.y, dir: dir.d } : null;
    }).filter(Boolean);
  }

  /** @param {function} callback — (tile, x, y) */
  function forEachTile(callback) {
    for (let y = 0; y < ST.Config.GRID_H; y++) {
      for (let x = 0; x < ST.Config.GRID_W; x++) {
        callback(_tiles[y][x], x, y);
      }
    }
  }

  return { init, getTile, setTile, isInBounds, getNeighbors, forEachTile };
})();
```

### 1.3 ST.Audio
```javascript
ST.Audio = (function() {
  /** @type {AudioContext|null} */
  let _ctx = null;
  let _masterGain = null;
  let _bpm = 120;

  function init() {
    _ctx = new (window.AudioContext || window.webkitAudioContext)();
    _masterGain = _ctx.createGain();
    _masterGain.gain.value = 0.8;
    _masterGain.connect(_ctx.destination);
    if (_ctx.state === 'suspended') _ctx.resume();
    _bpm = ST.Config.BPM_DEFAULT;
    console.log('[Audio] initialized, sampleRate:', _ctx.sampleRate);
  }

  /**
   * @param {Object} params
   * @param {string} params.waveform — 'sine'|'square'|'triangle'|'sawtooth'
   * @param {number} params.pitch — Hz
   * @param {number} params.decay — seconds
   * @param {number} [params.velocity=0.8]
   */
  function trigger(params) {
    if (!_ctx) return;
    const now = _ctx.currentTime;
    const vel = params.velocity || 0.8;

    const osc = _ctx.createOscillator();
    const gain = _ctx.createGain();

    osc.type = params.waveform;
    osc.frequency.value = params.pitch;

    gain.gain.setValueAtTime(0.4 * vel, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + params.decay);

    osc.connect(gain);
    gain.connect(_masterGain);
    osc.start(now);
    osc.stop(now + params.decay + 0.05);

    osc.onended = function() { osc.disconnect(); gain.disconnect(); };

    console.log('[Audio] trigger:', params.waveform, Math.round(params.pitch) + 'Hz');
    if (ST.Audio.onTrigger) ST.Audio.onTrigger(params);
  }

  /** @param {number} bpm */
  function setBPM(bpm) {
    _bpm = Math.max(ST.Config.BPM_MIN, Math.min(ST.Config.BPM_MAX, bpm));
  }

  function getBPM() { return _bpm; }
  function isReady() { return _ctx !== null && _ctx.state === 'running'; }
  function getContext() { return _ctx; }
  function getMasterGain() { return _masterGain; }

  return {
    init, trigger, setBPM, getBPM, isReady, getContext, getMasterGain,
    onTrigger: null
  };
})();
```

### 1.4 Минимальный Car (inline в ST.Game, будет извлечён в этапе 3)
```javascript
// Внутри ST.Game:
let _car = null;

function _spawnCar(tileX, tileY) {
  _car = {
    x: tileX, y: tileY,
    targetX: tileX, targetY: tileY,
    dir: 'E', progress: 0,
    speed: 2 // тайлов/сек при BPM 120
  };
}

function _updateCar(dt) {
  if (!_car) return;
  const speedMult = ST.Audio.getBPM() / 120;
  _car.progress += _car.speed * speedMult * dt;

  if (_car.progress >= 1) {
    _car.progress = 0;
    _car.x = _car.targetX;
    _car.y = _car.targetY;

    // Trigger соседних зданий
    const neighbors = ST.Grid.getNeighbors(_car.x, _car.y);
    neighbors.forEach(function(n) {
      if (n.tile.building) {
        const b = n.tile.building;
        ST.Audio.trigger({
          waveform: b.waveform, pitch: b.pitch,
          decay: b.decay, velocity: 0.8
        });
      }
    });

    _chooseNextTile();
  }
}

function _chooseNextTile() {
  const neighbors = ST.Grid.getNeighbors(_car.x, _car.y);
  const roads = neighbors.filter(function(n) { return n.tile.type === 'road'; });
  if (roads.length === 0) return;

  const opposite = {N:'S', S:'N', E:'W', W:'E'};
  const forward = roads.filter(function(n) { return n.dir !== opposite[_car.dir]; });
  const choices = forward.length > 0 ? forward : roads;
  const pick = choices[Math.floor(Math.random() * choices.length)];

  _car.targetX = pick.x;
  _car.targetY = pick.y;
  _car.dir = pick.dir;
}
```

### ТЕСТЫ ЭТАПА 1

**T1.1 — Сетка:** Открой index.html. Canvas виден, фон `#0a0a12`, линии сетки видны.
```javascript
console.assert(document.getElementById('game').getContext('2d') !== null, 'Canvas OK');
```

**T1.2 — Здание:** Кликни на тайл (5,5). Здание появилось.
```javascript
console.assert(ST.Grid.getTile(5, 5).building !== null, 'Building placed');
```

**T1.3 — Дорога:** Поставь road на (5,6)–(5,10). Все тайлы type === 'road'.
```javascript
for (let i = 6; i <= 10; i++) {
  console.assert(ST.Grid.getTile(5, i).type === 'road', 'Road at 5,' + i);
}
```

**T1.4 — Машина:** Нажми Play. Машина движется по road-тайлам. Нет ошибок в консоли.

**T1.5 — Звук:** Машина проезжает мимо здания → в консоли `[Audio] trigger: sine XXXHz`. Звук слышен.

**T1.6 — BPM:** Slider на 60 → машина в 2× медленнее. На 180 → в 1.5× быстрее.

**T1.7 — Play/Stop:** Stop → машина стоит. Play → продолжает.

---

## ЭТАП 2 — ЗДАНИЯ И ЗВУК

**Цель:** 5 типов зданий, property panel, road autoconnect  
**ПОТРЕБЛЯЕТ API:** Config, Grid, Audio, Renderer, Game  
**СОЗДАЁТ API:** Buildings, Roads, UI

### Приоритеты (MoSCoW)
| Приоритет | Фича |
|-----------|-------|
| **MUST**  | 5 типов зданий (sine, square, triangle, sawtooth, pulse) |
| **MUST**  | Каждый тип — уникальный waveform + default decay |
| **MUST**  | Процедурная отрисовка (тело + крыша по типу) |
| **MUST**  | Toolbar: кнопки для каждого типа + road + eraser |
| **MUST**  | Road auto-connect (прямая/поворот/T/крест) |
| **SHOULD** | Property panel: pitch, decay, waveform |
| **SHOULD** | Trigger flash (glow 150ms) |
| **SHOULD** | Preview sound в property panel |
| **COULD**  | Building level (1–8) визуально |
| **COULD**  | Цветовая палитра (8 цветов) |

### 2.1 Building Types
```javascript
const TYPES = {
  sine: {
    waveform: 'sine', pitchDefault: 440, pitchRange: [220, 880],
    decay: 1.2, color: '#64b5f6', label: 'House', icon: 'home'
  },
  square: {
    waveform: 'square', pitchDefault: 220, pitchRange: [110, 440],
    decay: 0.3, color: '#ef5350', label: 'Factory', icon: 'factory'
  },
  triangle: {
    waveform: 'triangle', pitchDefault: 440, pitchRange: [330, 1320],
    decay: 0.8, color: '#66bb6a', label: 'Tower', icon: 'cell_tower'
  },
  sawtooth: {
    waveform: 'sawtooth', pitchDefault: 110, pitchRange: [55, 220],
    decay: 0.5, color: '#ffa726', label: 'Warehouse', icon: 'warehouse'
  },
  pulse: {
    waveform: 'square', pitchDefault: 880, pitchRange: [440, 1760],
    decay: 0.15, color: '#ab47bc', label: 'Antenna', icon: 'settings_input_antenna'
  }
};
```

### 2.2 Road Auto-Connect
Определение формы дороги по подключённым соседям:
- 0 соседей → `single`
- 1 сосед → `dead_end` (направление)
- 2 соседа, напротив → `straight` (H/V)
- 2 соседа, смежные → `turn` (NE/NW/SE/SW)
- 3 соседа → `t_junction` (какая сторона закрыта)
- 4 соседа → `cross`

### 2.3 Крыши по типу
```javascript
function _drawRoof(ctx, type, cx, top, w, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  switch (type) {
    case 'sine':     // Полукруг
      ctx.arc(cx, top, w / 2, Math.PI, 0);
      break;
    case 'square':   // Плоская + труба
      ctx.fillRect(cx - w / 2, top - 2, w, 2);
      ctx.fillRect(cx + w / 3, top - 10, 4, 10);
      break;
    case 'triangle': // Шпиль
      ctx.moveTo(cx - w / 2, top);
      ctx.lineTo(cx, top - w * 0.7);
      ctx.lineTo(cx + w / 2, top);
      break;
    case 'sawtooth': // Ступенчатая (3 ступени)
      for (let i = 0; i < 3; i++) {
        ctx.fillRect(cx - w/2 + (w/3)*i, top - (i+1)*3, w/3, (i+1)*3);
      }
      return;
    case 'pulse':    // Антенна + мигающий огонёк
      ctx.fillRect(cx - 1, top - 16, 2, 16);
      ctx.beginPath();
      ctx.arc(cx, top - 18, 3, 0, Math.PI * 2);
      ctx.fillStyle = Date.now() % 1000 < 500 ? color : '#fff';
      break;
  }
  ctx.fill();
}
```

### ТЕСТЫ ЭТАПА 2

**T2.1 — Toolbar:** Минимум 7 кнопок (5 зданий + road + eraser).
```javascript
console.assert(document.querySelectorAll('#toolbar button').length >= 7, 'Toolbar buttons');
```

**T2.2 — Разный звук:** Поставь каждый тип → машина проезжает → в консоли 5 разных waveform/pitch.

**T2.3 — Auto-connect:** Поставь дороги (5,5)→(6,5)→(6,6)→(5,6). Визуально: замкнутый квадрат с поворотами.

**T2.4 — Property panel:** Клик на здание → panel справа. Смени pitch → preview → звук другой.

**T2.5 — Flash:** Машина мимо здания → видимый glow 150ms.

---

## ЭТАП 3 — ТРАНСПОРТ И МЕХАНИКИ

**Цель:** 3 типа транспорта, 3 знака, полиритм  
**ПОТРЕБЛЯЕТ API:** Config, Grid, Audio, Buildings, Roads, UI, Renderer  
**СОЗДАЁТ API:** Vehicles, Signs

### Приоритеты (MoSCoW)
| Приоритет | Фича |
|-----------|-------|
| **MUST**  | Извлечь Car из Game → ST.Vehicles |
| **MUST**  | 3 типа: Car, Bicycle, Bus |
| **MUST**  | Счётчик машин, лимит 8 |
| **MUST**  | Кнопка Add Vehicle с выбором типа |
| **SHOULD** | Светофор (полиритм) |
| **SHOULD** | Одностороннее движение |
| **SHOULD** | Bus = аккорд (radius 2) |
| **COULD**  | Круговое движение |
| **COULD**  | Bicycle trigger за 1 тайл |

### 3.1 Vehicle Types
```javascript
const TYPES = {
  car: {
    label: 'Car', icon: 'directions_car', color: '#ffffff',
    speed: 2, velocity: 0.8, triggerRadius: 1, triggerMode: 'single'
  },
  bicycle: {
    label: 'Bicycle', icon: 'pedal_bike', color: '#80cbc4',
    speed: 4, velocity: 0.4, triggerRadius: 1, triggerMode: 'single'
  },
  bus: {
    label: 'Bus', icon: 'directions_bus', color: '#ffcc02',
    speed: 1.2, velocity: 1.0, triggerRadius: 2, triggerMode: 'chord'
  }
};
```

### 3.2 Sign Types
```javascript
const SIGN_TYPES = {
  trafficLight: {
    label: 'Traffic Light', icon: 'traffic',
    defaults: { redBeats: 4, greenBeats: 4 }
  },
  oneWay: {
    label: 'One Way', icon: 'arrow_forward',
    defaults: { direction: 'E' }
  },
  roundabout: {
    label: 'Roundabout', icon: 'rotate_right',
    defaults: { exitEvery: 3 }
  }
};
```

### ТЕСТЫ ЭТАПА 3

**T3.1:** Спавн Car + Bicycle + Bus → `ST.Vehicles.count() === 3`

**T3.2:** При BPM 120: Bicycle заметно быстрее Car, Bus заметно медленнее.

**T3.3:** Bus рядом с 3 зданиями → 3 trigger-а одновременно в консоли.

**T3.4:** Светофор → одна машина ждёт → фазовый сдвиг слышен.

**T3.5:** 8 машин → кнопка Add неактивна.

---

## ЭТАП 4 — ПРОГРЕССИЯ

**Цель:** скор, анлоки, декор  
**ПОТРЕБЛЯЕТ API:** всё выше  
**СОЗДАЁТ API:** Score, Unlocks

### Приоритеты (MoSCoW)
| Приоритет | Фича |
|-----------|-------|
| **MUST**  | City Score (complexity + variety + flow) |
| **MUST**  | 5 порогов: Хутор → Мегаполис |
| **MUST**  | 4 анлока (локальные условия) |
| **SHOULD** | Popup при анлоке |
| **SHOULD** | Декор при пороге |
| **SHOULD** | Progress bar |
| **COULD**  | Конфетти |

### 4.1 Скор
```javascript
function calculate() {
  const buildings = [];
  ST.Grid.forEachTile(function(tile) {
    if (tile.building) buildings.push(tile.building);
  });
  if (buildings.length === 0) return 0;

  const uniquePitches = new Set(buildings.map(b => b.pitch)).size;
  const uniqueWaves = new Set(buildings.map(b => b.waveform)).size;
  const deadEnds = _countDeadEnds();

  const complexity = Math.min(uniquePitches * 3, 30);
  const variety = Math.min(uniqueWaves * 5, 25);
  const flow = Math.max(0, 25 - deadEnds * 5);
  const size = Math.min(buildings.length * 2, 20);

  return Math.round(complexity + variety + flow + size);
}

const THRESHOLDS = [
  { min: 0,   name: 'Хутор',     decorations: [] },
  { min: 12,  name: 'Деревня',   decorations: ['tree'] },
  { min: 50,  name: 'Посёлок',   decorations: ['tree', 'lamp'] },
  { min: 200, name: 'Город',     decorations: ['tree', 'lamp', 'bench'] },
  { min: 500, name: 'Мегаполис', decorations: ['tree', 'lamp', 'bench', 'fountain'] }
];
```

### 4.2 Анлоки (client-only)
```javascript
const ALL = [
  { id: 'triangle',     condition: () => buildingCount() >= 5,
    reward: {type:'building', value:'triangle'}, msg: '5 зданий → Triangle Tower' },
  { id: 'bicycle',      condition: () => _hasClosedLoop(),
    reward: {type:'vehicle', value:'bicycle'},   msg: 'Замкнутый маршрут → Велосипед' },
  { id: 'bus',           condition: () => ST.Vehicles.count() >= 3,
    reward: {type:'vehicle', value:'bus'},        msg: '3 машины → Автобус' },
  { id: 'trafficLight', condition: () => roadCount() >= 10,
    reward: {type:'sign', value:'trafficLight'},  msg: '10 дорог → Светофор' }
];
```

### ТЕСТЫ ЭТАПА 4

**T4.1:** 3 разных здания + 5 дорог → `ST.Score.calculate() > 0`

**T4.2:** Score 50+ → `ST.Score.getThreshold().name === 'Посёлок'`

**T4.3:** 5 зданий → `ST.Unlocks.check()` возвращает unlock 'triangle'

**T4.4:** Декор: при пороге 'Деревня' видны деревья на пустых тайлах.

---

## ЭТАП 5 — ЭФФЕКТЫ

**Цель:** filter, delay, reverb  
**ПОТРЕБЛЯЕТ API:** всё выше  
**СОЗДАЁТ API:** ST.Effects

### Приоритеты (MoSCoW)
| Приоритет | Фича |
|-----------|-------|
| **MUST**  | Master compressor (-24dB, 4:1) |
| **MUST**  | LP/HP filter на зданиях |
| **MUST**  | Delay send (BPM sync) |
| **MUST**  | Convolution reverb (синтетический IR) |
| **SHOULD** | Echo Tower (здание-эффект) |
| **SHOULD** | Reverb Park (2×2, radius 3) |
| **SHOULD** | Voice pool (8, stealing) |
| **COULD**  | Portamento |
| **COULD**  | Sub-bass oscillator |

### 5.1 Reverb IR
```javascript
function _createReverb(ctx, duration) {
  const convolver = ctx.createConvolver();
  const rate = ctx.sampleRate;
  const length = Math.floor(rate * duration);
  const impulse = ctx.createBuffer(2, length, rate);
  for (let c = 0; c < 2; c++) {
    const data = impulse.getChannelData(c);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2);
    }
  }
  convolver.buffer = impulse;
  return convolver;
}
```

### ТЕСТЫ ЭТАПА 5

**T5.1 — No clipping:** 8 зданий + Bus → громко, но нет хрустов.

**T5.2 — Filter:** LP cutoff 500Hz → глуше. 8000Hz → ярче. Разница очевидна.

**T5.3 — Delay:** Delay send on → слышны повторы, затухающие.

**T5.4 — Reverb:** Reverb send on → "хвост" после decay. Off → сухой звук.

**T5.5 — Voice stealing:** 20 быстрых trigger-ов → max 8 одновременно, нет ошибок.

---

## ЭТАП 6 — ВИЗУАЛ И ПОЛИРОВКА

**Цель:** красиво, анимации, декор  
**ПОТРЕБЛЯЕТ API:** всё выше  
**РАСШИРЯЕТ:** Renderer, Buildings, Roads

### Приоритеты (MoSCoW)
| Приоритет | Фича |
|-----------|-------|
| **MUST**  | Neo-city aesthetic: glow, glassmorphism |
| **MUST**  | Плавное движение машин (lerp) |
| **MUST**  | Trigger flash + glow |
| **MUST**  | Анимированная дорожная разметка |
| **SHOULD** | Декор по score-порогам |
| **SHOULD** | Material Icons в toolbar |
| **COULD**  | Конфетти при анлоке |
| **COULD**  | Floating "+X" при score up |

### Визуальные константы
```javascript
// В ST.Config:
ANIM: {
  FLASH_DURATION: 150,    // ms
  DASH_SPEED: 30,         // px/sec
  PARTICLE_COUNT: 30,
  PARTICLE_LIFETIME: 2000 // ms
}
```

### ТЕСТЫ ЭТАПА 6

**T6.1:** Визуально: "не выглядит как программистский прототип". Градиенты, glow, glassmorphism.

**T6.2:** Машина двигается плавно, нет рывков при BPM 120.

**T6.3:** Пунктир на дорогах анимирован (медленно движется).

---

## ЭТАП 7 — СОХРАНЕНИЕ

**Цель:** localStorage + share URL  
**ПОТРЕБЛЯЕТ API:** всё выше  
**СОЗДАЁТ API:** State

### Приоритеты (MoSCoW)
| Приоритет | Фича |
|-----------|-------|
| **MUST**  | Serialize/deserialize JSON |
| **MUST**  | localStorage автосейв 30 сек |
| **MUST**  | "Восстановить город?" при загрузке |
| **MUST**  | Share URL через location.hash |
| **SHOULD** | 5 слотов |
| **SHOULD** | Кнопка "Копировать ссылку" |
| **COULD**  | PNG export |
| **COULD**  | Название города |

### 7.1 Сериализация
```javascript
function serialize() {
  const tiles = {};
  ST.Grid.forEachTile(function(tile, x, y) {
    if (tile.type === 'empty') return;
    const key = x + ',' + y;
    const data = { t: tile.type[0] };
    if (tile.building) {
      data.bt = tile.building.type;
      data.p = tile.building.pitch;
      data.d = tile.building.decay;
      data.l = tile.building.level;
    }
    tiles[key] = data;
  });
  const vehicles = ST.Vehicles.getAll().map(v => ({ t: v.type, x: v.x, y: v.y }));
  return btoa(JSON.stringify({ v: 1, bpm: ST.Audio.getBPM(), tiles, vehicles }));
}
```

### ТЕСТЫ ЭТАПА 7

**T7.1:** Save → reload → load → город тот же.

**T7.2:** `exportURL()` → открой URL в новой вкладке → город загружен.

**T7.3:** Построй → жди 30 сек → закрой → открой → "Восстановить?" → Да → OK.

**T7.4:** localStorage disabled → игра работает, save/load кнопки скрыты.

---

## ЭТАП 8 — ОПТИМИЗАЦИЯ

**Цель:** 60fps, нет аудио-артефактов  
**ПОТРЕБЛЯЕТ API:** всё выше  
**РАСШИРЯЕТ:** Renderer, Audio, Game

### Приоритеты (MoSCoW)
| Приоритет | Фича |
|-----------|-------|
| **MUST**  | Fixed-step loop (60 physics/sec + variable render) |
| **MUST**  | Offscreen canvas для grid/roads |
| **MUST**  | AudioNode cleanup |
| **MUST**  | dt cap 100ms |
| **SHOULD** | Dirty-rect rendering |
| **SHOULD** | Object pool для частиц |
| **SHOULD** | Debounce property panel 100ms |
| **COULD**  | Performance stats (DEV) |

### 8.1 Game Loop
```javascript
let _accumulator = 0;
let _lastTime = 0;
const FIXED_STEP = 1 / 60;

function _loop(timestamp) {
  if (!_playing) return;
  const dt = Math.min((timestamp - _lastTime) / 1000, 0.1);
  _lastTime = timestamp;
  _accumulator += dt;

  while (_accumulator >= FIXED_STEP) {
    _update(FIXED_STEP);
    _accumulator -= FIXED_STEP;
  }
  _render(_accumulator / FIXED_STEP);
  if (ST.Config.DEV) _updateStats(timestamp);
  requestAnimationFrame(_loop);
}
```

### ТЕСТЫ ЭТАПА 8

**T8.1:** 20 зданий + 5 машин → DevTools Performance → FPS > 55 стабильно.

**T8.2:** 2 мин работы → Heap snapshot delta < 5MB. AudioNode count стабилен.

**T8.3:** Вкладка в фоне 10 сек → возврат → нет "прыжка" машин.

**T8.4:** Быстрое размещение/удаление при играющих машинах → нет щелчков.

---

## ФИНАЛЬНЫЙ ЧЕКЛИСТ

### MUST (без этого не релиз)
- [ ] 5 типов зданий с уникальным звуком
- [ ] 3 типа транспорта (car, bicycle, bus)
- [ ] Road auto-connect
- [ ] Play/Stop, BPM slider
- [ ] Property panel (pitch, decay, filter)
- [ ] City Score с 5 порогами
- [ ] 4 blueprint анлока
- [ ] Filter, Delay, Reverb
- [ ] Master compressor
- [ ] Share URL (location.hash)
- [ ] localStorage автосейв
- [ ] 60fps, voice pool, no leaks

### SHOULD (сильно улучшает)
- [ ] Светофор + одностороннее
- [ ] Trigger flash + glow
- [ ] Декор по score-порогам
- [ ] Echo Tower, Reverb Park
- [ ] 5 слотов сохранений
- [ ] Popup при анлоке
- [ ] Material Icons

### COULD (cherry on top)
- [ ] Круговое движение
- [ ] Конфетти
- [ ] PNG export
- [ ] Portamento, sub-bass
- [ ] Dev stats overlay
- [ ] Название города

### УБРАНО ИЗ SCOPE (нужен бэкенд)
- ~~Daily Challenge с сабмитами~~
- ~~Publish + listens/likes~~
- ~~Leaderboard~~
- ~~Анлоки за "10 прослушиваний" / "1 лайк"~~
