# STAGE 1 — Foundation

## Цель
Собрать фундамент: `ST.Config`, `ST.Grid`, `ST.Audio`, `ST.Renderer`, `ST.Game`.

## MUST
- [ ] Инициализация canvas и сетки 20x15.
- [ ] Рабочий API `ST.Grid` из контрактов.
- [ ] Базовый API `ST.Audio` с безопасным вызовом `trigger()`.
- [ ] Запуск/остановка цикла игры.

## SHOULD
- [ ] Включаемый dev-лог и базовые диагностические сообщения.

## Тесты
- `tests/test_helpers.js`
- `tests/test_stage_1.js`
