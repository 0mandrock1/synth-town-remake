# SYNTH TOWN — MAIN PROMPT FOR CLAUDE CODE
> Версия: 2.2

Ремейк `https://synth.town`: браузерный city builder, где город = музыкальный секвенсор.
Здания = осцилляторы, дороги = маршруты, машины = playhead-ы.
Ограничение: один `index.html`, Web Audio API, без внешних зависимостей (кроме шрифтов CDN).

## Prompt Directory
- `PROMPTS_DIR = prompts/claude-code/`
- Все core-инструкции для Claude Code читать только из этой папки.

## Порядок чтения документации
1. `PROMPTS_DIR/CLAUDE_CODE.md`
2. `PROMPTS_DIR/ARCHITECTURE.md`
3. `PROMPTS_DIR/CONTRACTS.md` (текущий этап)
4. `PROMPTS_DIR/SPEC.md`
5. `PROMPTS_DIR/INSPIRATION_DELTA.md`
6. `stages/STAGE_*.md` (только активный этап)

## Рабочий цикл
1. Выбери один этап.
2. Реализуй MUST.
3. Подключи stage-тесты и добейся зелёного прогона.
4. Реализуй SHOULD.
5. Повтори тесты.
6. Коммит в формате `[STAGE N] краткое описание`.

## Критерии готовности (release minimum)
- 5 типов зданий с уникальным звуком.
- 3 типа транспорта.
- Road auto-connect.
- Play/Stop + BPM.
- Property panel.
- Score + unlocks.
- Delay/Reverb/Filter + компрессор.
- Share URL + localStorage.
- Тесты этапов проходят.

## Финальные приоритеты перед разработкой
- Игрок должен получить первый музыкальный цикл за 60-90 секунд после старта.
- Любое действие в городе должно менять звук немедленно и предсказуемо.
- Геометрия и звук связаны напрямую: форма здания и тип транспорта влияют на синтез.
- Прототип должен ощущаться как музыкальный инструмент, а не только city-builder.

## Где расширять вручную
- Иконки и графические правки: `assets/manual/icons/`
- Локальные патчи и ручные подложки: `assets/manual/overrides/`
- Референсы и эскизы: `assets/manual/references/`

## Дополнительно
- Архив полного исторического промпта: `PROMPTS_DIR/PROMPT_ARCHIVE.md`
