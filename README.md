# Synth Town Remake

Документация и инструкции для разработки браузерного city-builder/sequencer.

## Быстрый старт
1. Прочитай главный промпт: `docs/claude/MAIN_PROMPT.md`.
2. Иди по порядку: `docs/claude/CLAUDE_CODE.md` -> `docs/claude/ARCHITECTURE.md` -> `docs/claude/CONTRACTS.md` -> `docs/claude/SPEC.md`.
3. Выбери этап в `stages/STAGE_*.md`.
4. Запускай тесты из `tests/`.

## Структура репозитория
- `docs/claude/` - основной промпт и core-инструкции для Claude Code.
- `docs/development/` - навигация по процессу разработки.
- `stages/` - этапы разработки и stage-шаблоны.
- `tests/` - test runner и stage-тесты.
- `assets/manual/` - ручные расширения (иконки, локальные overrides, референсы).

## Важные файлы
- Главный промпт: `docs/claude/MAIN_PROMPT.md`
- Архив исходного большого промпта: `docs/claude/PROMPT_ARCHIVE.md`
- Тест-раннер: `tests/runner.html`

## Ручные расширения
Если нужно дорисовать иконки, положить PNG/SVG или добавить нестандартные материалы руками, используй:
- `assets/manual/icons/`
- `assets/manual/overrides/`
- `assets/manual/references/`

Соглашение: ручные материалы не должны ломать контракты и тесты.
