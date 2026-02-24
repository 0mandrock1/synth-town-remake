# ИНСТРУКЦИИ ДЛЯ CLAUDE CODE

Контекст: проект — ремейк `https://synth.town`.

## Workflow
1. Работай СТРОГО по одному этапу за сессию
2. Перед началом — прочитай `prompts/claude-code/CONTRACTS.md`, секцию "ПОТРЕБЛЯЕТ API" текущего этапа
3. Убедись что API предыдущих этапов существуют и работают
4. Проверь `prompts/claude-code/INSPIRATION_DELTA.md` и зафиксируй 2-3 принципа текущей реализации
5. Реализуй MUST -> подключи тесты -> SHOULD -> тесты -> коммит
6. Не переходи к следующему этапу пока тесты не зелёные

## Code Style
- Vanilla JS (ES2020+). Никакого TypeScript
- JSDoc для типизации: `/** @param {number} x */`
- `const` по умолчанию, `let` при переприсваивании, `var` — никогда
- `'use strict';` в начале `<script>`
- Одинарные кавычки, точка с запятой обязательна
- Без trailing comma в последнем элементе

## Отладка
- В начале модуля: `console.log('[MODULE_NAME] initialized')`
- При trigger: `console.log('[AUDIO] trigger:', waveform, pitch)`
- Dev mode: `ST.Config.DEV = true` → FPS counter
- Для UX-проверки: `console.log('[ONBOARDING] step:', stepName)`

## Когда рефакторить
- Модуль > 200 строк → разбить на суб-модули
- Функция > 40 строк → извлечь helpers
- Вложенность > 3 уровней → early return, extract fn
- Copy-paste > 2 раз → извлечь общую функцию

## Чего НЕ делать
- Не добавлять библиотеки (React, Tone.js, etc.)
- Не создавать отдельные .js/.css файлы — всё inline в index.html
- Не использовать `eval`, `innerHTML` для user input
- Не менять сигнатуры API предыдущих этапов — только расширять
- Не оптимизировать до этапа 8

## Как запускать тесты
```html
<!-- Добавь перед закрывающим </script> в index.html: -->
<!-- Для этапа 1: -->
<script src="tests/test_stage_1.js"></script>

<!-- Или открой tests/runner.html с параметром ?stage=1 -->
```

Тесты автоматически выводят результаты в консоль и в DOM (если есть `#test-results`).

Формат вывода:
```
[TEST] STAGE 1 — Starting 7 tests...
  ✅ T1.1 Canvas exists and has context
  ✅ T1.2 Grid initialized 20x15
  ❌ T1.3 Building placement — expected building at (5,5), got null
  ...
[TEST] STAGE 1 — 6/7 passed
```

## Коммиты
Формат: `[STAGE N] краткое описание`
Примеры:
- `[STAGE 1] Grid, audio engine, basic car movement`
- `[STAGE 2] 5 building types, road autoconnect, property panel`

## Мини-чек перед merge
- Есть первый playable loop за 60-90 секунд.
- У зданий читается соответствие форма -> waveform.
- У транспорта слышно различие по envelope/динамике.
