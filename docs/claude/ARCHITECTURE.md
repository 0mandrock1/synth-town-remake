# АРХИТЕКТУРА

## Файловая стратегия
Один файл `index.html`. Код через namespace `ST` и IIFE-модули.

## Порядок в файле (НАРУШАТЬ НЕЛЬЗЯ)

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

  // === Порядок модулей (зависимости сверху вниз) ===
  // 1. ST.Config
  // 2. ST.Audio
  // 3. ST.Grid
  // 4. ST.Buildings       (этап 2+)
  // 5. ST.Roads           (этап 2+)
  // 6. ST.Vehicles        (этап 3+)
  // 7. ST.Signs           (этап 3+)
  // 8. ST.Effects         (этап 5+)
  // 9. ST.Score           (этап 4+)
  // 10. ST.Unlocks        (этап 4+)
  // 11. ST.UI
  // 12. ST.State          (этап 7+)
  // 13. ST.Renderer
  // 14. ST.Game
  // === BOOT ===
  // document.addEventListener('DOMContentLoaded', () => ST.Game.init());
  </script>
</body>
</html>
```

## Карта зависимостей
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

**Циклические зависимости ЗАПРЕЩЕНЫ.** Обратная связь — через callback:
```javascript
ST.Audio.onTrigger = null; // UI подпишется: ST.Audio.onTrigger = fn
```

## Правила размера

| Единица      | Лимит     | При превышении                                    |
|-------------|-----------|--------------------------------------------------|
| Модуль      | 200 строк | Разбить: `ST.Audio.Effects`, `ST.Audio.VoicePool` |
| Функция     | 40 строк  | Извлечь helper-функции                            |
| Вложенность | 3 уровня  | Early return, extract fn                          |

## Naming Convention

| Что               | Стиль              | Пример                    |
|-------------------|---------------------|---------------------------|
| Модули            | `ST.PascalCase`     | `ST.Audio`, `ST.Grid`     |
| Публичные методы  | `camelCase`         | `getTile`, `autoConnect`  |
| Приватные (IIFE)  | `_camelCase`        | `_calcRoadShape`          |
| Константы         | `UPPER_SNAKE_CASE`  | `MAX_VOICES`, `TILE`      |
| DOM id            | `kebab-case`        | `btn-play`, `slider-bpm`  |
| CSS классы        | `st-kebab-case`     | `st-toolbar`, `st-active` |

## Правила доступа
- Модули общаются ТОЛЬКО через публичные API (`return { ... }`)
- Прямой доступ к внутренним `_` переменным другого модуля **запрещён**
- Мутабельное общее состояние — только через `ST.State`
- `ST.Config` — read-only
