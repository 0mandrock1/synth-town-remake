# SYNTH TOWN — ПРОМПТ ДЛЯ CLAUDE CODE
> **Версия:** 2.0

Браузерный city builder где город = музыкальный секвенсор.
Здания = осцилляторы, дороги = маршруты, машины = playheadы.
Один файл `index.html`, Web Audio API, без внешних зависимостей (кроме шрифтов CDN).

**Целевое ощущение:** рисуешь город — город звучит. Каждое действие даёт мгновенную звуковую обратную связь. Визуал — neo-city с неоновыми glow. Звук — чистый, без клиппинга, с приятным ревербом.

---

## СТРУКТУРА ДОКУМЕНТАЦИИ

Читай файлы в этом порядке:

| Файл | Что внутри | Когда читать |
|------|-----------|-------------|
| `CLAUDE_CODE.md` | Мета-инструкции: workflow, code style, правила | **Всегда первым** |
| `ARCHITECTURE.md` | Namespace, модули, зависимости, лимиты | Перед началом любого этапа |
| `SPEC.md` | Числа: размеры, цвета, тайминги, звук, edge cases | При реализации визуала/звука |
| `CONTRACTS.md` | API каждого этапа: что создаёт, что потребляет | Перед началом каждого этапа |
| `stages/STAGE_N.md` | Детали этапа N: MoSCoW, код, описание | Только текущий этап |
| `tests/test_stage_N.js` | Автотесты этапа N (запускаемые в браузере) | После реализации этапа |
| `tests/runner.html` | Тест-раннер: подключи к index.html | Для запуска тестов |

---

## ПОРЯДОК РАБОТЫ

```
1. Прочитай CLAUDE_CODE.md
2. Прочитай ARCHITECTURE.md
3. Прочитай CONTRACTS.md — секция текущего этапа
4. Прочитай stages/STAGE_N.md
5. Реализуй MUST фичи
6. Подключи tests/test_stage_N.js → запусти → все зелёные
7. Реализуй SHOULD фичи
8. Перезапусти тесты
9. Коммит: [STAGE N] описание
10. Переходи к N+1
```

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
- [ ] Автотесты всех этапов проходят

### SHOULD
- [ ] Светофор + одностороннее
- [ ] Trigger flash + glow
- [ ] Декор по score-порогам
- [ ] Echo Tower, Reverb Park
- [ ] 5 слотов сохранений
- [ ] Material Icons

### COULD
- [ ] Круговое движение
- [ ] Конфетти при анлоке
- [ ] PNG export
- [ ] Portamento, sub-bass

### УБРАНО (нужен бэкенд)
- ~~Daily Challenge~~
- ~~Publish + likes/listens~~
- ~~Leaderboard~~
