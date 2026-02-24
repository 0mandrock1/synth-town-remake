# Synth Town Remake

Документация и инструкции для разработки ремейка `https://synth.town` (браузерный city-builder/sequencer).

## Быстрый старт
1. Прочитай главный промпт: `prompts/claude-code/MAIN_PROMPT.md`.
2. Иди по порядку: `prompts/claude-code/CLAUDE_CODE.md` -> `prompts/claude-code/ARCHITECTURE.md` -> `prompts/claude-code/CONTRACTS.md` -> `prompts/claude-code/SPEC.md` -> `prompts/claude-code/INSPIRATION_DELTA.md`.
3. Выбери этап в `stages/STAGE_*.md`.
4. Запускай тесты из `tests/`.

## Структура репозитория
- `prompts/claude-code/` - основной промпт и core-инструкции для Claude Code.
- `docs/development/` - навигация по процессу разработки.
- `stages/` - этапы разработки и stage-шаблоны.
- `tests/` - test runner и stage-тесты.
- `assets/manual/` - ручные расширения (иконки, локальные overrides, референсы).

## Важные файлы
- Главный промпт: `prompts/claude-code/MAIN_PROMPT.md`
- Архив исходного большого промпта: `prompts/claude-code/PROMPT_ARCHIVE.md`
- Тест-раннер: `tests/runner.html`

## Ручные расширения
Если нужно дорисовать иконки, положить PNG/SVG или добавить нестандартные материалы руками, используй:
- `assets/manual/icons/`
- `assets/manual/overrides/`
- `assets/manual/references/`

Соглашение: ручные материалы не должны ломать контракты и тесты.
