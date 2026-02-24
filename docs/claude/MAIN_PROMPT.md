# SYNTH TOWN — MAIN PROMPT FOR CLAUDE CODE
> Версия: 2.1

Браузерный city builder, где город = музыкальный секвенсор.
Здания = осцилляторы, дороги = маршруты, машины = playhead-ы.
Ограничение: один `index.html`, Web Audio API, без внешних зависимостей (кроме шрифтов CDN).

## Порядок чтения документации
1. `docs/claude/CLAUDE_CODE.md`
2. `docs/claude/ARCHITECTURE.md`
3. `docs/claude/CONTRACTS.md` (текущий этап)
4. `docs/claude/SPEC.md`
5. `stages/STAGE_*.md` (только активный этап)

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

## Где расширять вручную
- Иконки и графические правки: `assets/manual/icons/`
- Локальные патчи и ручные подложки: `assets/manual/overrides/`
- Референсы и эскизы: `assets/manual/references/`

## Дополнительно
- Архив полного исторического промпта: `docs/claude/PROMPT_ARCHIVE.md`
