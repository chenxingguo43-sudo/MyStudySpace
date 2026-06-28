---
title: "Agent A full practical exact source-example matching report"
type: "source-example-batch-report"
generated_at: "2026-06-19T22:04:59.238Z"
tags:
  - source-example-matching
  - exact-only
---

# Agent A Full Practical Exact Source-Example Matching Report

## Summary

- Scope target: full practical exact-token set
- Generated matched entries: 97
- Generated examples: 124
- Candidate-high examples: 124
- Needs-review examples: 0
- Corpus sentence candidates: 433
- Vocabulary entries considered after filtering/deduplication: 597
- Exact-match candidates available: 97
- Unmatched filtered vocabulary entries: 500
- Matching method: `exact-token` only; no stemming, fuzzy matching, or morphology expansion.
- Excluded as real examples: appendix vocabulary file and pages `167-186`.
- Additional conservative source exclusions: full test/key/method-commentary files; exercise/test/key headings inside mixed chapter files.

## Cross-Chapter Coverage

| Source file | Matched entries | Examples |
|---|---:|---:|
| `章节/предисловие.md` | 9 | 11 |
| `章节/раздел1-продолжение.md` | 8 | 12 |
| `章节/раздел2-завершение.md` | 16 | 20 |
| `章节/раздел2-начало.md` | 43 | 56 |
| `章节/раздел3-завершение.md` | 5 | 5 |
| `章节/раздел3-начало.md` | 2 | 3 |
| `章节/样章.md` | 14 | 17 |

## Review Notes

- All emitted matches are exact normalized Russian token matches. Accents in vocabulary headwords are ignored for matching only.
- `candidate_high` means the exact matched form appears as a standalone token in a non-excluded source sentence.
- Items from OCR-risk page markers are downgraded to `needs_review` if selected.
- The AI appendix is used only as one vocabulary seed source, never as source-example evidence.

## Matched Entries

### vmire-batch-0001. расширять (扩展, 扩大)

- Vocabulary source: `章节/приложение-лексика.md` (project_ai_appendix_vocabulary_only)
- Status: `candidate_high`; method: `exact`
1. Москву надо не **расширять**, а расселять.
   - Source: `章节/раздел2-начало.md`; Текст 2.1.1 — Новая российская столица как национальный проект; page 56
   - Matched form: `расширять`; confidence: `candidate_high`

### vmire-batch-0002. расселять (疏散, 分散安置)

- Vocabulary source: `章节/приложение-лексика.md` (project_ai_appendix_vocabulary_only)
- Status: `candidate_high`; method: `exact`
1. Москву надо не расширять, а **расселять**.
   - Source: `章节/раздел2-начало.md`; Текст 2.1.1 — Новая российская столица как национальный проект; page 56
   - Matched form: `расселять`; confidence: `candidate_high`

### vmire-batch-0003. высказал (表达, 说出, 发表)

- Vocabulary source: `章节/приложение-лексика.md` (project_ai_appendix_vocabulary_only)
- Status: `candidate_high`; method: `exact`
1. Такое мнение **высказал** на Красноярском экономическом форуме миллиардер, владелец компании «Русал» Олег Дерипаска. «Каждый раз, подлетая к Москве, я задумываюсь: что эти люди там делают?
   - Source: `章节/раздел2-начало.md`; Текст 2.1.1 — Новая российская столица как национальный проект; page 56
   - Matched form: `высказал`; confidence: `candidate_high`

### vmire-batch-0004. Красноярском (克拉斯诺亚尔斯克的)

- Vocabulary source: `章节/приложение-лексика.md` (project_ai_appendix_vocabulary_only)
- Status: `candidate_high`; method: `exact`
1. Такое мнение высказал на **Красноярском** экономическом форуме миллиардер, владелец компании «Русал» Олег Дерипаска. «Каждый раз, подлетая к Москве, я задумываюсь: что эти люди там делают?
   - Source: `章节/раздел2-начало.md`; Текст 2.1.1 — Новая российская столица как национальный проект; page 56
   - Matched form: `Красноярском`; confidence: `candidate_high`

### vmire-batch-0005. экономическом (经济的)

- Vocabulary source: `章节/приложение-лексика.md` (project_ai_appendix_vocabulary_only)
- Status: `candidate_high`; method: `exact`
1. Такое мнение высказал на Красноярском **экономическом** форуме миллиардер, владелец компании «Русал» Олег Дерипаска. «Каждый раз, подлетая к Москве, я задумываюсь: что эти люди там делают?
   - Source: `章节/раздел2-начало.md`; Текст 2.1.1 — Новая российская столица как национальный проект; page 56
   - Matched form: `экономическом`; confidence: `candidate_high`

### vmire-batch-0006. форуме (论坛)

- Vocabulary source: `章节/приложение-лексика.md` (project_ai_appendix_vocabulary_only)
- Status: `candidate_high`; method: `exact`
1. Ранее, на **форуме** в Давосе, олигарх заявил, что российским властям стоит подумать о переносе столицы страны из Москвы в Сибирь, если они хотят успешно развивать этот регион.
   - Source: `章节/раздел2-начало.md`; Текст 2.1.1 — Новая российская столица как национальный проект; page 56
   - Matched form: `форуме`; confidence: `candidate_high`
2. Такое мнение высказал на Красноярском экономическом **форуме** миллиардер, владелец компании «Русал» Олег Дерипаска. «Каждый раз, подлетая к Москве, я задумываюсь: что эти люди там делают?
   - Source: `章节/раздел2-начало.md`; Текст 2.1.1 — Новая российская столица как национальный проект; page 56
   - Matched form: `форуме`; confidence: `candidate_high`

### vmire-batch-0007. подлетая (飞近, 接近)

- Vocabulary source: `章节/приложение-лексика.md` (project_ai_appendix_vocabulary_only)
- Status: `candidate_high`; method: `exact`
1. Такое мнение высказал на Красноярском экономическом форуме миллиардер, владелец компании «Русал» Олег Дерипаска. «Каждый раз, **подлетая** к Москве, я задумываюсь: что эти люди там делают?
   - Source: `章节/раздел2-начало.md`; Текст 2.1.1 — Новая российская столица как национальный проект; page 56
   - Matched form: `подлетая`; confidence: `candidate_high`

### vmire-batch-0008. задумываюсь (思索, 思考, 琢磨)

- Vocabulary source: `章节/приложение-лексика.md` (project_ai_appendix_vocabulary_only)
- Status: `candidate_high`; method: `exact`
1. Такое мнение высказал на Красноярском экономическом форуме миллиардер, владелец компании «Русал» Олег Дерипаска. «Каждый раз, подлетая к Москве, я **задумываюсь**: что эти люди там делают?
   - Source: `章节/раздел2-начало.md`; Текст 2.1.1 — Новая российская столица как национальный проект; page 56
   - Matched form: `задумываюсь`; confidence: `candidate_high`

### vmire-batch-0009. нагрузка (负担, 负荷)

- Vocabulary source: `章节/приложение-лексика.md` (project_ai_appendix_vocabulary_only)
- Status: `candidate_high`; method: `exact`
1. Какая **нагрузка** на нашу экономику» — пояснил он свою мысль.
   - Source: `章节/раздел2-начало.md`; Текст 2.1.1 — Новая российская столица как национальный проект; page 56
   - Matched form: `нагрузка`; confidence: `candidate_high`

### vmire-batch-0010. экономику (经济)

- Vocabulary source: `章节/приложение-лексика.md` (project_ai_appendix_vocabulary_only)
- Status: `candidate_high`; method: `exact`
1. Какая нагрузка на нашу **экономику**» — пояснил он свою мысль.
   - Source: `章节/раздел2-начало.md`; Текст 2.1.1 — Новая российская столица как национальный проект; page 56
   - Matched form: `экономику`; confidence: `candidate_high`

### vmire-batch-0011. пояснил (解释, 说明)

- Vocabulary source: `章节/приложение-лексика.md` (project_ai_appendix_vocabulary_only)
- Status: `candidate_high`; method: `exact`
1. Какая нагрузка на нашу экономику» — **пояснил** он свою мысль.
   - Source: `章节/раздел2-начало.md`; Текст 2.1.1 — Новая российская столица как национальный проект; page 56
   - Matched form: `пояснил`; confidence: `candidate_high`

### vmire-batch-0012. Ранее (此前, 早先, 之前)

- Vocabulary source: `章节/приложение-лексика.md` (project_ai_appendix_vocabulary_only)
- Status: `candidate_high`; method: `exact`
1. **Ранее**, на форуме в Давосе, олигарх заявил, что российским властям стоит подумать о переносе столицы страны из Москвы в Сибирь, если они хотят успешно развивать этот регион.
   - Source: `章节/раздел2-начало.md`; Текст 2.1.1 — Новая российская столица как национальный проект; page 56
   - Matched form: `Ранее`; confidence: `candidate_high`

### vmire-batch-0013. Давосе (达沃斯)

- Vocabulary source: `章节/приложение-лексика.md` (project_ai_appendix_vocabulary_only)
- Status: `candidate_high`; method: `exact`
1. Ранее, на форуме в **Давосе**, олигарх заявил, что российским властям стоит подумать о переносе столицы страны из Москвы в Сибирь, если они хотят успешно развивать этот регион.
   - Source: `章节/раздел2-начало.md`; Текст 2.1.1 — Новая российская столица как национальный проект; page 56
   - Matched form: `Давосе`; confidence: `candidate_high`

### vmire-batch-0014. олигарх (寡头)

- Vocabulary source: `章节/приложение-лексика.md` (project_ai_appendix_vocabulary_only)
- Status: `candidate_high`; method: `exact`
1. Ранее, на форуме в Давосе, **олигарх** заявил, что российским властям стоит подумать о переносе столицы страны из Москвы в Сибирь, если они хотят успешно развивать этот регион.
   - Source: `章节/раздел2-начало.md`; Текст 2.1.1 — Новая российская столица как национальный проект; page 56
   - Matched form: `олигарх`; confidence: `candidate_high`

### vmire-batch-0015. заявил (声明, 宣称, 表示)

- Vocabulary source: `章节/приложение-лексика.md` (project_ai_appendix_vocabulary_only)
- Status: `candidate_high`; method: `exact`
1. Поначалу Переслегиным хотели закончить концерт, но композитор **заявил**: «Нет!» По мнению Переслегина, Прокофьев мог спасти репутацию оркестра и после провала его симфонии.
   - Source: `章节/раздел3-завершение.md`; Текст 3.5.2 — Альтист Данилов; page 135
   - Matched form: `заявил`; confidence: `candidate_high`
2. Ранее, на форуме в Давосе, олигарх **заявил**, что российским властям стоит подумать о переносе столицы страны из Москвы в Сибирь, если они хотят успешно развивать этот регион.
   - Source: `章节/раздел2-начало.md`; Текст 2.1.1 — Новая российская столица как национальный проект; page 56
   - Matched form: `заявил`; confidence: `candidate_high`

### vmire-batch-0016. российским (俄罗斯的)

- Vocabulary source: `章节/приложение-лексика.md` (project_ai_appendix_vocabulary_only)
- Status: `candidate_high`; method: `exact`
1. Ранее, на форуме в Давосе, олигарх заявил, что **российским** властям стоит подумать о переносе столицы страны из Москвы в Сибирь, если они хотят успешно развивать этот регион.
   - Source: `章节/раздел2-начало.md`; Текст 2.1.1 — Новая российская столица как национальный проект; page 56
   - Matched form: `российским`; confidence: `candidate_high`

### vmire-batch-0017. властям (当局, 权力)

- Vocabulary source: `章节/приложение-лексика.md` (project_ai_appendix_vocabulary_only)
- Status: `candidate_high`; method: `exact`
1. Ранее, на форуме в Давосе, олигарх заявил, что российским **властям** стоит подумать о переносе столицы страны из Москвы в Сибирь, если они хотят успешно развивать этот регион.
   - Source: `章节/раздел2-начало.md`; Текст 2.1.1 — Новая российская столица как национальный проект; page 56
   - Matched form: `властям`; confidence: `candidate_high`

### vmire-batch-0018. стоит (应当, 值得, 应该)

- Vocabulary source: `章节/приложение-лексика.md` (project_ai_appendix_vocabulary_only)
- Status: `candidate_high`; method: `exact`
1. Ранее, на форуме в Давосе, олигарх заявил, что российским властям **стоит** подумать о переносе столицы страны из Москвы в Сибирь, если они хотят успешно развивать этот регион.
   - Source: `章节/раздел2-начало.md`; Текст 2.1.1 — Новая российская столица как национальный проект; page 56
   - Matched form: `стоит`; confidence: `candidate_high`

### vmire-batch-0019. подумать (考虑, 思考)

- Vocabulary source: `章节/приложение-лексика.md` (project_ai_appendix_vocabulary_only)
- Status: `candidate_high`; method: `exact`
1. Ранее, на форуме в Давосе, олигарх заявил, что российским властям стоит **подумать** о переносе столицы страны из Москвы в Сибирь, если они хотят успешно развивать этот регион.
   - Source: `章节/раздел2-начало.md`; Текст 2.1.1 — Новая российская столица как национальный проект; page 56
   - Matched form: `подумать`; confidence: `candidate_high`
2. Кто бы мог **подумать**, что через столько лет я сам буду руководить выпуском таких клоунов!
   - Source: `章节/предисловие.md`; Текст 1.2.1 — «Люди истосковались по красивым, добрым игрушкам»; page 14-16
   - Matched form: `подумать`; confidence: `candidate_high`

### vmire-batch-0020. переносе (迁移, 转移, 搬迁)

- Vocabulary source: `章节/приложение-лексика.md` (project_ai_appendix_vocabulary_only)
- Status: `candidate_high`; method: `exact`
1. Ранее, на форуме в Давосе, олигарх заявил, что российским властям стоит подумать о **переносе** столицы страны из Москвы в Сибирь, если они хотят успешно развивать этот регион.
   - Source: `章节/раздел2-начало.md`; Текст 2.1.1 — Новая российская столица как национальный проект; page 56
   - Matched form: `переносе`; confidence: `candidate_high`

### vmire-batch-0021. столицы (首都)

- Vocabulary source: `章节/приложение-лексика.md` (project_ai_appendix_vocabulary_only)
- Status: `candidate_high`; method: `exact`
1. До него о необходимости переноса **столицы** на восток говорили, в частности, писатель и политик Эдуард Лимонов и нынешний министр обороны Сергей Шойгу.
   - Source: `章节/раздел2-начало.md`; Текст 2.1.1 — Новая российская столица как национальный проект; page 56
   - Matched form: `столицы`; confidence: `candidate_high`
2. Ранее, на форуме в Давосе, олигарх заявил, что российским властям стоит подумать о переносе **столицы** страны из Москвы в Сибирь, если они хотят успешно развивать этот регион.
   - Source: `章节/раздел2-начало.md`; Текст 2.1.1 — Новая российская столица как национальный проект; page 56
   - Matched form: `столицы`; confidence: `candidate_high`

### vmire-batch-0022. Сибирь (西伯利亚)

- Vocabulary source: `章节/приложение-лексика.md` (project_ai_appendix_vocabulary_only)
- Status: `candidate_high`; method: `exact`
1. Ранее, на форуме в Давосе, олигарх заявил, что российским властям стоит подумать о переносе столицы страны из Москвы в **Сибирь**, если они хотят успешно развивать этот регион.
   - Source: `章节/раздел2-начало.md`; Текст 2.1.1 — Новая российская столица как национальный проект; page 56
   - Matched form: `Сибирь`; confidence: `candidate_high`
2. Россия даст Сибири столицу, а **Сибирь** России — динамику развития лет на двести вперёд.
   - Source: `章节/раздел2-начало.md`; Текст 2.1.1 — Новая российская столица как национальный проект; page 56
   - Matched form: `Сибирь`; confidence: `candidate_high`

### vmire-batch-0023. успешно (成功地, 顺利地)

- Vocabulary source: `章节/приложение-лексика.md` (project_ai_appendix_vocabulary_only)
- Status: `candidate_high`; method: `exact`
1. Ранее, на форуме в Давосе, олигарх заявил, что российским властям стоит подумать о переносе столицы страны из Москвы в Сибирь, если они хотят **успешно** развивать этот регион.
   - Source: `章节/раздел2-начало.md`; Текст 2.1.1 — Новая российская столица как национальный проект; page 56
   - Matched form: `успешно`; confidence: `candidate_high`

### vmire-batch-0024. развивать (发展, 开发, 培养)

- Vocabulary source: `章节/приложение-лексика.md` (project_ai_appendix_vocabulary_only)
- Status: `candidate_high`; method: `exact`
1. Ранее, на форуме в Давосе, олигарх заявил, что российским властям стоит подумать о переносе столицы страны из Москвы в Сибирь, если они хотят успешно **развивать** этот регион.
   - Source: `章节/раздел2-начало.md`; Текст 2.1.1 — Новая российская столица как национальный проект; page 56
   - Matched form: `развивать`; confidence: `candidate_high`
2. В качестве успешного примера такой тактики Дерипаска назвал Олимпиаду в Сочи. «Чтобы **развивать** юг России, было принято решение провести там Олимпиаду. <…> Страна напряглась, и на юге появился новый кластер», — цитировали СМИ его слова.
   - Source: `章节/раздел2-начало.md`; Текст 2.1.1 — Новая российская столица как национальный проект; page 56
   - Matched form: `развивать`; confidence: `candidate_high`

### vmire-batch-0025. регион (地区, 区域)

- Vocabulary source: `章节/приложение-лексика.md` (project_ai_appendix_vocabulary_only)
- Status: `candidate_high`; method: `exact`
1. Ранее, на форуме в Давосе, олигарх заявил, что российским властям стоит подумать о переносе столицы страны из Москвы в Сибирь, если они хотят успешно развивать этот **регион**.
   - Source: `章节/раздел2-начало.md`; Текст 2.1.1 — Новая российская столица как национальный проект; page 56
   - Matched form: `регион`; confidence: `candidate_high`

### vmire-batch-0026. качестве (质量, 身份, 作为)

- Vocabulary source: `章节/приложение-лексика.md` (project_ai_appendix_vocabulary_only)
- Status: `candidate_high`; method: `exact`
1. Допущено УМО по направлениям педагогического образования Минобрнауки РФ в **качестве** учебного пособия.
   - Source: `章节/предисловие.md`; Выходные данные; page 1-3
   - Matched form: `качестве`; confidence: `candidate_high`
2. Но бесплатное обучение мы можем предложить только зарегистрированным в **качестве** безработных, а это лица с московской регистрацией», — сообщил замглавы департамента труда и соцзащиты населения Андрей Бесштанько.
   - Source: `章节/样章.md`; Текст 1.3.1 — Милости не просим; page 20
   - Matched form: `качестве`; confidence: `candidate_high`

### vmire-batch-0027. успешного (成功的)

- Vocabulary source: `章节/приложение-лексика.md` (project_ai_appendix_vocabulary_only)
- Status: `candidate_high`; method: `exact`
1. После **успешного** полёта Белка и Стрелка прожили долгую жизнь в Институте авиационной и космической медицины.
   - Source: `章节/раздел2-завершение.md`; Текст 2.4.1 — Зверьё в космосе; page 72
   - Matched form: `успешного`; confidence: `candidate_high`
2. В качестве **успешного** примера такой тактики Дерипаска назвал Олимпиаду в Сочи. «Чтобы развивать юг России, было принято решение провести там Олимпиаду. <…> Страна напряглась, и на юге появился новый кластер», — цитировали СМИ его слова.
   - Source: `章节/раздел2-начало.md`; Текст 2.1.1 — Новая российская столица как национальный проект; page 56
   - Matched form: `успешного`; confidence: `candidate_high`

### vmire-batch-0028. примера (例子, 范例)

- Vocabulary source: `章节/приложение-лексика.md` (project_ai_appendix_vocabulary_only)
- Status: `candidate_high`; method: `exact`
1. В качестве успешного **примера** такой тактики Дерипаска назвал Олимпиаду в Сочи. «Чтобы развивать юг России, было принято решение провести там Олимпиаду. <…> Страна напряглась, и на юге появился новый кластер», — цитировали СМИ его слова.
   - Source: `章节/раздел2-начало.md`; Текст 2.1.1 — Новая российская столица как национальный проект; page 56
   - Matched form: `примера`; confidence: `candidate_high`

### vmire-batch-0029. тактики (策略, 战术)

- Vocabulary source: `章节/приложение-лексика.md` (project_ai_appendix_vocabulary_only)
- Status: `candidate_high`; method: `exact`
1. В качестве успешного примера такой **тактики** Дерипаска назвал Олимпиаду в Сочи. «Чтобы развивать юг России, было принято решение провести там Олимпиаду. <…> Страна напряглась, и на юге появился новый кластер», — цитировали СМИ его слова.
   - Source: `章节/раздел2-начало.md`; Текст 2.1.1 — Новая российская столица как национальный проект; page 56
   - Matched form: `тактики`; confidence: `candidate_high`

### vmire-batch-0030. назвал (称作, 命名)

- Vocabulary source: `章节/приложение-лексика.md` (project_ai_appendix_vocabulary_only)
- Status: `candidate_high`; method: `exact`
1. В качестве успешного примера такой тактики Дерипаска **назвал** Олимпиаду в Сочи. «Чтобы развивать юг России, было принято решение провести там Олимпиаду. <…> Страна напряглась, и на юге появился новый кластер», — цитировали СМИ его слова.
   - Source: `章节/раздел2-начало.md`; Текст 2.1.1 — Новая российская столица как национальный проект; page 56
   - Matched form: `назвал`; confidence: `candidate_high`

### vmire-batch-0031. Олимпиаду (奥运)

- Vocabulary source: `章节/приложение-лексика.md` (project_ai_appendix_vocabulary_only)
- Status: `candidate_high`; method: `exact`
1. В качестве успешного примера такой тактики Дерипаска назвал **Олимпиаду** в Сочи. «Чтобы развивать юг России, было принято решение провести там **Олимпиаду**. <…> Страна напряглась, и на юге появился новый кластер», — цитировали СМИ его слова.
   - Source: `章节/раздел2-начало.md`; Текст 2.1.1 — Новая российская столица как национальный проект; page 56
   - Matched form: `Олимпиаду`; confidence: `candidate_high`

### vmire-batch-0032. принято (被接受, 被通过)

- Vocabulary source: `章节/приложение-лексика.md` (project_ai_appendix_vocabulary_only)
- Status: `candidate_high`; method: `exact`
1. С тех пор с 1851 года **принято** отсчитывать историю российской школы скалолазания, зарождение которой тесно связано со Столбами.
   - Source: `章节/предисловие.md`; Текст 1.1.2 — Красноярские Столбы — заповедник скалолазов; page 11-13
   - Matched form: `принято`; confidence: `candidate_high`
2. В качестве успешного примера такой тактики Дерипаска назвал Олимпиаду в Сочи. «Чтобы развивать юг России, было **принято** решение провести там Олимпиаду. <…> Страна напряглась, и на юге появился новый кластер», — цитировали СМИ его слова.
   - Source: `章节/раздел2-начало.md`; Текст 2.1.1 — Новая российская столица как национальный проект; page 56
   - Matched form: `принято`; confidence: `candidate_high`

### vmire-batch-0033. решение (决定, 决议)

- Vocabulary source: `章节/приложение-лексика.md` (project_ai_appendix_vocabulary_only)
- Status: `candidate_high`; method: `exact`
1. Это пусть и временное, но всё же **решение** квартирного вопроса.
   - Source: `章节/样章.md`; Текст 1.3.1 — Милости не просим; page 20
   - Matched form: `решение`; confidence: `candidate_high`
2. В качестве успешного примера такой тактики Дерипаска назвал Олимпиаду в Сочи. «Чтобы развивать юг России, было принято **решение** провести там Олимпиаду. <…> Страна напряглась, и на юге появился новый кластер», — цитировали СМИ его слова.
   - Source: `章节/раздел2-начало.md`; Текст 2.1.1 — Новая российская столица как национальный проект; page 56
   - Matched form: `решение`; confidence: `candidate_high`

### vmire-batch-0034. провести (举办, 进行)

- Vocabulary source: `章节/приложение-лексика.md` (project_ai_appendix_vocabulary_only)
- Status: `candidate_high`; method: `exact`
1. Но стоило попроситься самой сесть за верстак и попробовать **провести** хоть одну линию, как стало понятно: нет, вся эта лёгкость обманчива.
   - Source: `章节/样章.md`; Текст 1.2.2 — Голос камня; page 17
   - Matched form: `провести`; confidence: `candidate_high`
2. В качестве успешного примера такой тактики Дерипаска назвал Олимпиаду в Сочи. «Чтобы развивать юг России, было принято решение **провести** там Олимпиаду. <…> Страна напряглась, и на юге появился новый кластер», — цитировали СМИ его слова.
   - Source: `章节/раздел2-начало.md`; Текст 2.1.1 — Новая российская столица как национальный проект; page 56
   - Matched form: `провести`; confidence: `candidate_high`

### vmire-batch-0035. напряглась (集中力量, 紧张起来)

- Vocabulary source: `章节/приложение-лексика.md` (project_ai_appendix_vocabulary_only)
- Status: `candidate_high`; method: `exact`
1. В качестве успешного примера такой тактики Дерипаска назвал Олимпиаду в Сочи. «Чтобы развивать юг России, было принято решение провести там Олимпиаду. <…> Страна **напряглась**, и на юге появился новый кластер», — цитировали СМИ его слова.
   - Source: `章节/раздел2-начало.md`; Текст 2.1.1 — Новая российская столица как национальный проект; page 56
   - Matched form: `напряглась`; confidence: `candidate_high`

### vmire-batch-0036. место (地方, 地点)

- Vocabulary source: `章节/приложение-лексика.md` (project_ai_appendix_vocabulary_only)
- Status: `candidate_high`; method: `exact`
1. Легко догадаться, что далеко не все чиновники готовы будут столь круто изменить свою жизнь и переехать на новое **место** работы. <…> И это хорошо.
   - Source: `章节/раздел2-начало.md`; Текст 2.1.1 — Новая российская столица как национальный проект; page 56
   - Matched form: `место`; confidence: `candidate_high`

### vmire-batch-0037. работы (工作)

- Vocabulary source: `章节/приложение-лексика.md` (project_ai_appendix_vocabulary_only)
- Status: `candidate_high`; method: `exact`
1. Легко догадаться, что далеко не все чиновники готовы будут столь круто изменить свою жизнь и переехать на новое место **работы**. <…> И это хорошо.
   - Source: `章节/раздел2-начало.md`; Текст 2.1.1 — Новая российская столица как национальный проект; page 56
   - Matched form: `работы`; confidence: `candidate_high`
2. Группе Бармина поручили одну из самых ответственных частей **работы** — создание стартовых комплексов для баллистических ракет.
   - Source: `章节/раздел1-продолжение.md`; Текст 1.4.1 — Отец Байконура; page 26
   - Matched form: `работы`; confidence: `candidate_high`

### vmire-batch-0038. Появится (出现, 产生)

- Vocabulary source: `章节/приложение-лексика.md` (project_ai_appendix_vocabulary_only)
- Status: `candidate_high`; method: `exact`
1. **Появится** шанс омолодить управляющий класс страны. <…> Богатство России Сибирью прирастать будет, был уверен Михайло Ломоносов.
   - Source: `章节/раздел2-начало.md`; Текст 2.1.1 — Новая российская столица как национальный проект; page 56
   - Matched form: `Появится`; confidence: `candidate_high`

### vmire-batch-0039. шанс (机会, 可能性)

- Vocabulary source: `章节/приложение-лексика.md` (project_ai_appendix_vocabulary_only)
- Status: `candidate_high`; method: `exact`
1. Появится **шанс** омолодить управляющий класс страны. <…> Богатство России Сибирью прирастать будет, был уверен Михайло Ломоносов.
   - Source: `章节/раздел2-начало.md`; Текст 2.1.1 — Новая российская столица как национальный проект; page 56
   - Matched form: `шанс`; confidence: `candidate_high`

### vmire-batch-0040. омолодить (使…年轻化, 更新)

- Vocabulary source: `章节/приложение-лексика.md` (project_ai_appendix_vocabulary_only)
- Status: `candidate_high`; method: `exact`
1. Появится шанс **омолодить** управляющий класс страны. <…> Богатство России Сибирью прирастать будет, был уверен Михайло Ломоносов.
   - Source: `章节/раздел2-начало.md`; Текст 2.1.1 — Новая российская столица как национальный проект; page 56
   - Matched form: `омолодить`; confidence: `candidate_high`

### vmire-batch-0041. будет (将, 会)

- Vocabulary source: `章节/приложение-лексика.md` (project_ai_appendix_vocabulary_only)
- Status: `candidate_high`; method: `exact`
1. Появится шанс омолодить управляющий класс страны. <…> Богатство России Сибирью прирастать **будет**, был уверен Михайло Ломоносов.
   - Source: `章节/раздел2-начало.md`; Текст 2.1.1 — Новая российская столица как национальный проект; page 56
   - Matched form: `будет`; confidence: `candidate_high`
2. Там можно **будет** освоить самые востребованные рабочие профессии, причём совершенно бесплатно.
   - Source: `章节/样章.md`; Текст 1.3.1 — Милости не просим; page 20
   - Matched form: `будет`; confidence: `candidate_high`

### vmire-batch-0042. уверен (确信的, 有信心的)

- Vocabulary source: `章节/приложение-лексика.md` (project_ai_appendix_vocabulary_only)
- Status: `candidate_high`; method: `exact`
1. Появится шанс омолодить управляющий класс страны. <…> Богатство России Сибирью прирастать будет, был **уверен** Михайло Ломоносов.
   - Source: `章节/раздел2-начало.md`; Текст 2.1.1 — Новая российская столица как национальный проект; page 56
   - Matched form: `уверен`; confidence: `candidate_high`
2. **Уверен**, что состоявшиеся переговоры поспособствуют укреплению и дальнейшему развитию доверительных партнёрских отношений.
   - Source: `章节/раздел2-завершение.md`; Письмо-благодарность; page 80-82
   - Matched form: `Уверен`; confidence: `candidate_high`

### vmire-batch-0043. Россия (俄罗斯)

- Vocabulary source: `章节/приложение-лексика.md` (project_ai_appendix_vocabulary_only)
- Status: `candidate_high`; method: `exact`
1. Организаторами проекта выступили телеканал «**Россия** К», музей-усадьба «Ясная Поляна» и компания Google.
   - Source: `章节/раздел2-завершение.md`; Текст 2.5.1 — Марафон чтения: «Война и мир»; page 77
   - Matched form: `Россия`; confidence: `candidate_high`
2. **Россия** даст Сибири столицу, а Сибирь России — динамику развития лет на двести вперёд.
   - Source: `章节/раздел2-начало.md`; Текст 2.1.1 — Новая российская столица как национальный проект; page 56
   - Matched form: `Россия`; confidence: `candidate_high`

### vmire-batch-0044. даст (给, 给予)

- Vocabulary source: `章节/приложение-лексика.md` (project_ai_appendix_vocabulary_only)
- Status: `candidate_high`; method: `exact`
1. Россия **даст** Сибири столицу, а Сибирь России — динамику развития лет на двести вперёд.
   - Source: `章节/раздел2-начало.md`; Текст 2.1.1 — Новая российская столица как национальный проект; page 56
   - Matched form: `даст`; confidence: `candidate_high`

### vmire-batch-0045. двести (二百)

- Vocabulary source: `章节/приложение-лексика.md` (project_ai_appendix_vocabulary_only)
- Status: `candidate_high`; method: `exact`
1. Россия даст Сибири столицу, а Сибирь России — динамику развития лет на **двести** вперёд.
   - Source: `章节/раздел2-начало.md`; Текст 2.1.1 — Новая российская столица как национальный проект; page 56
   - Matched form: `двести`; confidence: `candidate_high`

### vmire-batch-0046. вперёд (向前, 未来)

- Vocabulary source: `章节/приложение-лексика.md` (project_ai_appendix_vocabulary_only)
- Status: `candidate_high`; method: `exact`
1. Его эксперименты долгое время считались спорными, однако сегодня, спустя десятилетия, становится ясно: учёный заглянул далеко **вперёд**.
   - Source: `章节/раздел1-продолжение.md`; Текст 1.4.2 — Пересадка головы: от фантастики к реальности; page 29
   - Matched form: `вперёд`; confidence: `candidate_high`
2. Россия даст Сибири столицу, а Сибирь России — динамику развития лет на двести **вперёд**.
   - Source: `章节/раздел2-начало.md`; Текст 2.1.1 — Новая российская столица как национальный проект; page 56
   - Matched form: `вперёд`; confidence: `candidate_high`

### vmire-batch-0047. соверши́ть (完成，实现，犯(错误))

- Vocabulary source: `词汇/动词/совершить.md` (vocabulary_json:vocab)
- Status: `candidate_high`; method: `exact`
1. Забавно, что прорыв в скалолазании первые из них смогли **совершить** лишь после того, как поступились своими принципами.
   - Source: `章节/предисловие.md`; Текст 1.1.2 — Красноярские Столбы — заповедник скалолазов; page 11-13
   - Matched form: `совершить`; confidence: `candidate_high`

### vmire-batch-0048. начина́ть (开始)

- Vocabulary source: `词汇/动词/начинать.md` (vocabulary_json:vocab)
- Status: `candidate_high`; method: `exact`
1. Русский император принял дары и согласился не **начинать** военных действий.
   - Source: `章节/раздел1-продолжение.md`; Текст 1.5.2 — Плата за пролитую кровь; page 35
   - Matched form: `начинать`; confidence: `candidate_high`

### vmire-batch-0049. осуществи́ть (实现，实行)

- Vocabulary source: `词汇/动词/осуществить.md` (vocabulary_json:vocab)
- Status: `candidate_high`; method: `exact`
1. На основании ст. 26.1, ст. 23.1 Закона о защите прав потребителей, требую в течение 10 дней с даты получения настоящей претензии **осуществить** возврат оплаченной мною суммы в полном размере, а также выплатить неустойку в связи с нарушением срока поставки (в размере 0,5% суммы предварительной оплаты).
   - Source: `章节/раздел2-завершение.md`; Претензия; page 70-71
   - Matched form: `осуществить`; confidence: `candidate_high`

### vmire-batch-0050. осо́бенно (特别，非常)

- Vocabulary source: `词汇/副词/осо́бенно.md` (vocabulary_json:vocab)
- Status: `candidate_high`; method: `exact`
1. **Особенно** ребятам понравился зал «Боевой славы», посвящённый Великой Отечественной войне.
   - Source: `章节/раздел2-начало.md`; Текст 2.1.2 — Отчёт об экскурсии в музей; page 59
   - Matched form: `Особенно`; confidence: `candidate_high`

### vmire-batch-0051. спасти́ (拯救，挽救)

- Vocabulary source: `词汇/动词/спасти.md` (vocabulary_json:vocab)
- Status: `candidate_high`; method: `exact`
1. Поначалу Переслегиным хотели закончить концерт, но композитор заявил: «Нет!» По мнению Переслегина, Прокофьев мог **спасти** репутацию оркестра и после провала его симфонии.
   - Source: `章节/раздел3-завершение.md`; Текст 3.5.2 — Альтист Данилов; page 135
   - Matched form: `спасти`; confidence: `candidate_high`

### vmire-batch-0052. взгляд (目光，观点，看法)

- Vocabulary source: `词汇/名词/взгляд.md` (vocabulary_json:vocab)
- Status: `candidate_high`; method: `exact`
1. Та же хаотичная, на первый **взгляд** беспорядочная застройка: рядом с европейским каменным особняком — японский деревянный домик с раздвижными бумажными стенами, а через дорогу — буддийский храм с загнутыми краями крыши.
   - Source: `章节/раздел3-начало.md`; Текст 3.1.1 — Алмазная колесница; page 100
   - Matched form: `взгляд`; confidence: `candidate_high`

### vmire-batch-0053. вы́резать (刻出，剪下，切除)

- Vocabulary source: `词汇/动词/вырезать.md` (vocabulary_json:vocab)
- Status: `candidate_high`; method: `exact`
1. Не человек выбирает, что **вырезать** из агальматолита, а он сам говорит ему, чем он хочет стать.
   - Source: `章节/样章.md`; Текст 1.2.2 — Голос камня; page 17
   - Matched form: `вырезать`; confidence: `candidate_high`
2. Чтобы за час **вырезать** из агальматолита хотя бы простой кубик, нужны годы тренировок.
   - Source: `章节/样章.md`; Текст 1.2.2 — Голос камня; page 17
   - Matched form: `вырезать`; confidence: `candidate_high`

### vmire-batch-0054. духи́ (香水 / дух (精神, 灵魂) 的复数)

- Vocabulary source: `词汇/名词/духи.md` (vocabulary_json:vocab)
- Status: `candidate_high`; method: `exact`
1. В музее воссоздан фрагмент интерьера купеческой лавки, где «продаются» изысканные кружева, перчатки, **духи**, фарфор и прочее.
   - Source: `章节/предисловие.md`; Текст 1.1.1 — Достопримечательности Мурома; page 8-10
   - Matched form: `духи`; confidence: `candidate_high`

### vmire-batch-0055. спо́рить (争论；辩论)

- Vocabulary source: `词汇/动词/спорить.md` (vocabulary_json:vocab)
- Status: `candidate_high`; method: `exact`
1. Может быть, многим подобная приверженность женщины к чисто мужской профессии покажется слишком экстравагантной, однако вряд ли кто-то будет **спорить** с тем, что Людмила Ивановна по натуре своей — победительница, а потому смогла дать достойные ответы на самые трудные вопросы судьбы.
   - Source: `章节/раздел1-продолжение.md`; Текст 1.3.2 — Я феминистка с юности; page 23
   - Matched form: `спорить`; confidence: `candidate_high`

### vmire-batch-0056. предоста́вить (提供，给予，交给)

- Vocabulary source: `词汇/动词/предоставить.md` (vocabulary_json:vocab)
- Status: `candidate_high`; method: `exact`
1. Прошу **предоставить** мне отпуск без сохранения содержания продолжительностью 1 (один) календарный день 25.12.20...
   - Source: `章节/раздел2-завершение.md`; Заявление; page 70-71
   - Matched form: `предоставить`; confidence: `candidate_high`

### vmire-batch-0057. компле́кс (综合体，建筑群，全套)

- Vocabulary source: `词汇/名词/комплекс.md` (vocabulary_json:vocab)
- Status: `candidate_high`; method: `exact`
1. Речь идёт о проекте, который в 2009 году запустило пивоваренное предприятие — производственный **комплекс** АО «САН ИнБев».
   - Source: `章节/раздел2-начало.md`; Текст 2.2.1 — Туристы поехали по цехам; page 61
   - Matched form: `комплекс`; confidence: `candidate_high`
2. Учебный **комплекс** «В мире людей» адресован иностранцам, изучающим русский язык.
   - Source: `章节/предисловие.md`; Предисловие; page 5-6
   - Matched form: `комплекс`; confidence: `candidate_high`

### vmire-batch-0058. ча́сто (经常)

- Vocabulary source: `词汇/副词/часто.md` (vocabulary_json:vocab)
- Status: `candidate_high`; method: `exact`
1. Нет, вот к ним заходят **часто** и охотно.
   - Source: `章节/раздел3-завершение.md`; Текст 3.5.1 — Шестой дозор; page 131
   - Matched form: `часто`; confidence: `candidate_high`

### vmire-batch-0059. па́рус (帆)

- Vocabulary source: `词汇/名词/парус.md` (vocabulary_json:vocab)
- Status: `candidate_high`; method: `exact`
1. Однажды утром в морской дали под солнцем сверкнёт алый **парус**.
   - Source: `章节/раздел3-начало.md`; Текст 3.3.1 — Алые паруса; page 116
   - Matched form: `парус`; confidence: `candidate_high`

### vmire-batch-0060. держа́ть (拿，保持，遵守)

- Vocabulary source: `词汇/动词/держать.md` (vocabulary_json:vocab)
- Status: `candidate_high`; method: `exact`
1. Каждый камень следует долго **держать** в руках, рассматривать — и тогда он сам подскажет, что из него нужно сделать.
   - Source: `章节/样章.md`; Текст 1.2.2 — Голос камня; page 17
   - Matched form: `держать`; confidence: `candidate_high`

### vmire-batch-0061. материа́л (材料，资料，素材)

- Vocabulary source: `词汇/名词/материал.md` (vocabulary_json:vocab)
- Status: `candidate_high`; method: `exact`
1. Главное, что ни тот, ни другой **материал** не пахнет и абсолютно не токсичен.
   - Source: `章节/предисловие.md`; Текст 1.2.1 — «Люди истосковались по красивым, добрым игрушкам»; page 14-16
   - Matched form: `материал`; confidence: `candidate_high`

### vmire-batch-0062. постепе́нно (逐渐地)

- Vocabulary source: `词汇/副词/постепенно.md` (vocabulary_json:vocab)
- Status: `candidate_high`; method: `exact`
1. Так девушка-слесарь с Московского автозавода, куда устроилась Люда на свою первую работу, **постепенно** превратилась в инженера-подполковника танковых войск.
   - Source: `章节/раздел1-продолжение.md`; Текст 1.3.2 — Я феминистка с юности; page 23
   - Matched form: `постепенно`; confidence: `candidate_high`

### vmire-batch-0063. благо (财富，幸福，利益)

- Vocabulary source: `词汇/名词/благо.md` (vocabulary_json:vocab)
- Status: `candidate_high`; method: `exact`
1. Андрей Аршавин в любви к пению никогда замечен не был, **благо** у героя Евро есть и другие таланты.
   - Source: `章节/раздел2-завершение.md`; Текст 2.3.1 — Спортивный «Голос»; page 67
   - Matched form: `благо`; confidence: `candidate_high`

### vmire-batch-0064. поли́тик (政治家)

- Vocabulary source: `词汇/名词/политик.md` (vocabulary_json:vocab)
- Status: `candidate_high`; method: `exact`
1. До него о необходимости переноса столицы на восток говорили, в частности, писатель и **политик** Эдуард Лимонов и нынешний министр обороны Сергей Шойгу.
   - Source: `章节/раздел2-начало.md`; Текст 2.1.1 — Новая российская столица как национальный проект; page 56
   - Matched form: `политик`; confidence: `candidate_high`

### vmire-batch-0065. ведь (毕竟，要知道（语气词/连词）)

- Vocabulary source: `词汇/功能词/ведь.md` (vocabulary_json:vocab)
- Status: `candidate_high`; method: `exact`
1. — А как же, — сказал Вадим. — **Ведь** что такое свобода?
   - Source: `章节/раздел3-завершение.md`; Текст 3.4.1 — Попытка к бегству; page 122
   - Matched form: `Ведь`; confidence: `candidate_high`
2. Ты пустила яхту поплавать, а она сбежала — **ведь** так?
   - Source: `章节/раздел3-начало.md`; Текст 3.3.1 — Алые паруса; page 116
   - Matched form: `ведь`; confidence: `candidate_high`

### vmire-batch-0066. затя́гивать (拖延，勒紧，吸引(卷入))

- Vocabulary source: `词汇/动词/затягивать.md` (vocabulary_json:vocab)
- Status: `candidate_high`; method: `exact`
1. Причём **затягивать** с обработкой нельзя — агальматолит мягок и податлив только в первое время после того, как извлечён из земли.
   - Source: `章节/样章.md`; Текст 1.2.2 — Голос камня; page 17
   - Matched form: `затягивать`; confidence: `candidate_high`

### vmire-batch-0067. мно́жество (许多，大量)

- Vocabulary source: `词汇/名词/мно́жество.md` (vocabulary_json:vocab)
- Status: `candidate_high`; method: `exact`
1. В здании, где располагается фабрика, **множество** офисов. «Кукольники» занимают комнаты на двух этажах.
   - Source: `章节/предисловие.md`; Текст 1.2.1 — «Люди истосковались по красивым, добрым игрушкам»; page 14-16
   - Matched form: `множество`; confidence: `candidate_high`

### vmire-batch-0068. заво́д (工厂，制造厂)

- Vocabulary source: `词汇/名词/завод.md` (vocabulary_json:vocab)
- Status: `candidate_high`; method: `exact`
1. В самом начале войны **завод** «Котлоаппарат», как и многие другие заводы, был переведён на производство военной продукции.
   - Source: `章节/раздел1-продолжение.md`; Текст 1.4.1 — Отец Байконура; page 26
   - Matched form: `завод`; confidence: `candidate_high`
2. За всё время работы экскурсионной программы **завод** посетило около 5 тысяч человек, говорит Сокольская.
   - Source: `章节/раздел2-начало.md`; Текст 2.2.1 — Туристы поехали по цехам; page 61
   - Matched form: `завод`; confidence: `candidate_high`

### vmire-batch-0069. вклад (贡献；存款)

- Vocabulary source: `词汇/名词/вклад.md` (vocabulary_json:vocab)
- Status: `candidate_high`; method: `exact`
1. Благодаря высокому уровню Вашего профессионализма нам совместно удаётся выполнять такую важную миссию — вносить свой **вклад** в успешное развитие машиностроения страны!
   - Source: `章节/раздел2-завершение.md`; Письмо-поздравление; page 70-71
   - Matched form: `вклад`; confidence: `candidate_high`

### vmire-batch-0070. проце́сс (过程，进程)

- Vocabulary source: `词汇/名词/процесс.md` (vocabulary_json:vocab)
- Status: `candidate_high`; method: `exact`
1. **Процесс**, похоже, принимает лавинообразный характер.
   - Source: `章节/раздел2-начало.md`; Текст 2.2.1 — Туристы поехали по цехам; page 61
   - Matched form: `Процесс`; confidence: `candidate_high`

### vmire-batch-0071. ре́дкий (不罕见地，常常)

- Vocabulary source: `词汇/形容词/редкий.md` (vocabulary_json:vocab)
- Status: `candidate_high`; method: `exact`
1. Элен Киллоран была ирландкой — случай для московского Ночного Дозора **редкий**.
   - Source: `章节/раздел3-завершение.md`; Текст 3.5.1 — Шестой дозор; page 131
   - Matched form: `редкий`; confidence: `candidate_high`

### vmire-batch-0072. рассма́тривать (审视，考虑，审查)

- Vocabulary source: `词汇/动词/рассматривать.md` (vocabulary_json:vocab)
- Status: `candidate_high`; method: `exact`
1. Каждый камень следует долго держать в руках, **рассматривать** — и тогда он сам подскажет, что из него нужно сделать.
   - Source: `章节/样章.md`; Текст 1.2.2 — Голос камня; page 17
   - Matched form: `рассматривать`; confidence: `candidate_high`

### vmire-batch-0073. о́бувь (鞋类)

- Vocabulary source: `词汇/名词/обувь.md` (vocabulary_json:vocab)
- Status: `candidate_high`; method: `exact`
1. Поэтому, когда в 1894 году первая в России женщина-альпинистка Александра Качалова, обутая в тривиальные лыковые лапти, сумела взойти на Слоник (так называется одна из скал), столбисты были поражены, а когда оправились от первого изумления, быстро освоили новую **обувь** — резиновые калоши.
   - Source: `章节/предисловие.md`; Текст 1.1.2 — Красноярские Столбы — заповедник скалолазов; page 11-13
   - Matched form: `обувь`; confidence: `candidate_high`

### vmire-batch-0074. кровь (血，血液)

- Vocabulary source: `词汇/名词/кровь.md` (vocabulary_json:vocab)
- Status: `candidate_high`; method: `exact`
1. Так камень стал своеобразной платой за пролитую **кровь**.
   - Source: `章节/раздел1-продолжение.md`; Текст 1.5.2 — Плата за пролитую кровь; page 35
   - Matched form: `кровь`; confidence: `candidate_high`
2. В артериальную магистраль между донором и реципиентом можно вмонтировать датчик, который позволит постоянно и строго дозированно поставлять в **кровь** иммунодепрессивные препараты для защиты головы-трансплантата от развития реакции отторжения, а в венозную магистраль — специальный фильтр для очистки крови.
   - Source: `章节/раздел1-продолжение.md`; Текст 1.4.2 — Пересадка головы: от фантастики к реальности; page 29
   - Matched form: `кровь`; confidence: `candidate_high`

### vmire-batch-0075. вы́бор (选择)

- Vocabulary source: `词汇/名词/выбор.md` (vocabulary_json:vocab)
- Status: `candidate_high`; method: `exact`
1. **Выбор** четвероногих космонавтов не был случайным.
   - Source: `章节/раздел2-завершение.md`; Текст 2.4.1 — Зверьё в космосе; page 72
   - Matched form: `Выбор`; confidence: `candidate_high`

### vmire-batch-0076. разви́тие (发展；发育)

- Vocabulary source: `词汇/名词/развитие.md` (vocabulary_json:vocab)
- Status: `candidate_high`; method: `exact`
1. Почти в каждой профильной региональной программе есть ссылка на его **развитие**, а также на **развитие** близкого агротуризма.
   - Source: `章节/раздел2-начало.md`; Текст 2.2.1 — Туристы поехали по цехам; page 61
   - Matched form: `развитие`; confidence: `candidate_high`
2. Благодаря высокому уровню Вашего профессионализма нам совместно удаётся выполнять такую важную миссию — вносить свой вклад в успешное **развитие** машиностроения страны!
   - Source: `章节/раздел2-завершение.md`; Письмо-поздравление; page 70-71
   - Matched form: `развитие`; confidence: `candidate_high`

### vmire-batch-0077. сформи́ровать (形成，塑造，组建)

- Vocabulary source: `词汇/动词/сформировать.md` (vocabulary_json:vocab)
- Status: `candidate_high`; method: `exact`
1. И очень важно **сформировать** систему социальных лифтов.
   - Source: `章节/样章.md`; Текст 1.3.1 — Милости не просим; page 20
   - Matched form: `сформировать`; confidence: `candidate_high`

### vmire-batch-0078. отли́чие (区别，不同，卓越)

- Vocabulary source: `词汇/名词/отличие.md` (vocabulary_json:vocab)
- Status: `candidate_high`; method: `exact`
1. Сибиряки гордились тем, что, в **отличие** от жителей европейской части России, не были лапотниками — никогда не носили лапти, только сапоги.
   - Source: `章节/предисловие.md`; Текст 1.1.2 — Красноярские Столбы — заповедник скалолазов; page 11-13
   - Matched form: `отличие`; confidence: `candidate_high`
2. …В **отличие** от большинства других знаменитых конструкторов космической техники — Сергея Королёва, Валентина Глушко, Михаила Тихонравова, Юрия Победоносцева, которые начали изучать вопросы реактивного движения ещё в 20–30-е годы ХХ века, Владимир Бармин пришёл в ракетостроение относительно поздно — лишь в годы войны.
   - Source: `章节/раздел1-продолжение.md`; Текст 1.4.1 — Отец Байконура; page 26
   - Matched form: `отличие`; confidence: `candidate_high`

### vmire-batch-0079. прое́кт (项目，计划，草案)

- Vocabulary source: `词汇/名词/проект.md` (vocabulary_json:vocab)
- Status: `candidate_high`; method: `exact`
1. …И наконец, начали работы над стартовым комплексом первой в мире межконтинентальной баллистической ракеты Р-7, эскизный **проект** которой был закончен в 1954 году.
   - Source: `章节/раздел1-продолжение.md`; Текст 1.4.1 — Отец Байконура; page 26
   - Matched form: `проект`; confidence: `candidate_high`
2. **Проект** оказался настолько популярным, что на некоторые экскурсии просто невозможно было попасть.
   - Source: `章节/раздел2-начало.md`; Текст 2.2.1 — Туристы поехали по цехам; page 61
   - Matched form: `Проект`; confidence: `candidate_high`

### vmire-batch-0080. кома́нда (团队；命令)

- Vocabulary source: `词汇/名词/команда.md` (vocabulary_json:vocab)
- Status: `candidate_high`; method: `exact`
1. В 2014 году они снялись в клипе группы «Руки вверх» на песню «**Команда** молодости нашей».
   - Source: `章节/раздел2-завершение.md`; Текст 2.3.1 — Спортивный «Голос»; page 67
   - Matched form: `Команда`; confidence: `candidate_high`

### vmire-batch-0081. неподалёку (在不远处，附近)

- Vocabulary source: `词汇/副词/неподалёку.md` (vocabulary_json:vocab)
- Status: `candidate_high`; method: `exact`
1. Практически все жители села, расположенного **неподалёку** от месторождения, владеют искусством резьбы.
   - Source: `章节/样章.md`; Текст 1.2.2 — Голос камня; page 17
   - Matched form: `неподалёку`; confidence: `candidate_high`

### vmire-batch-0082. це́нность (价值，珍贵物品)

- Vocabulary source: `词汇/名词/ценность.md` (vocabulary_json:vocab)
- Status: `candidate_high`; method: `exact`
1. Она не столь велика (около 1800 экспонатов), но имеет высокую историческую и художественную **ценность**.
   - Source: `章节/предисловие.md`; Текст 1.1.1 — Достопримечательности Мурома; page 8-10
   - Matched form: `ценность`; confidence: `candidate_high`

### vmire-batch-0083. спу́тник (伴侣，旅伴，卫星)

- Vocabulary source: `词汇/名词/спутник.md` (vocabulary_json:vocab)
- Status: `candidate_high`; method: `exact`
1. Именно этой ракете предстояло вывести на орбиту сперва первый искусственный **спутник** Земли, а затем и первого космонавта.
   - Source: `章节/раздел1-продолжение.md`; Текст 1.4.1 — Отец Байконура; page 26
   - Matched form: `спутник`; confidence: `candidate_high`

### vmire-batch-0084. кора́бль (船，舰)

- Vocabulary source: `词汇/名词/корабль.md` (vocabulary_json:vocab)
- Status: `candidate_high`; method: `exact`
1. За это время **корабль** совершил 17 витков вокруг Земли.
   - Source: `章节/раздел2-завершение.md`; Текст 2.4.1 — Зверьё в космосе; page 72
   - Matched form: `корабль`; confidence: `candidate_high`

### vmire-batch-0085. практи́чески (实际上，几乎)

- Vocabulary source: `词汇/副词/практически.md` (vocabulary_json:vocab)
- Status: `candidate_high`; method: `exact`
1. **Практически** все жители села, расположенного неподалёку от месторождения, владеют искусством резьбы.
   - Source: `章节/样章.md`; Текст 1.2.2 — Голос камня; page 17
   - Matched form: `Практически`; confidence: `candidate_high`

### vmire-batch-0086. о́тпуск (假期，休假)

- Vocabulary source: `词汇/名词/отпуск.md` (vocabulary_json:vocab)
- Status: `candidate_high`; method: `exact`
1. Прошу предоставить мне **отпуск** без сохранения содержания продолжительностью 1 (один) календарный день 25.12.20...
   - Source: `章节/раздел2-завершение.md`; Заявление; page 70-71
   - Matched form: `отпуск`; confidence: `candidate_high`

### vmire-batch-0087. пусть (让，愿，哪怕（语气词）)

- Vocabulary source: `词汇/功能词/пусть.md` (vocabulary_json:vocab)
- Status: `candidate_high`; method: `exact`
1. Это **пусть** и временное, но всё же решение квартирного вопроса.
   - Source: `章节/样章.md`; Текст 1.3.1 — Милости не просим; page 20
   - Matched form: `пусть`; confidence: `candidate_high`

### vmire-batch-0088. перегово́ры (谈判，交涉 (只用复数))

- Vocabulary source: `词汇/名词/переговоры.md` (vocabulary_json:vocab)
- Status: `candidate_high`; method: `exact`
1. Уверен, что состоявшиеся **переговоры** поспособствуют укреплению и дальнейшему развитию доверительных партнёрских отношений.
   - Source: `章节/раздел2-завершение.md`; Письмо-благодарность; page 80-82
   - Matched form: `переговоры`; confidence: `candidate_high`

### vmire-batch-0089. минера́л (矿物)

- Vocabulary source: `词汇/名词/минерал.md` (vocabulary_json:vocab)
- Status: `candidate_high`; method: `exact`
1. Владимир Салчак любит пересказывать тувинскую легенду о том, как появился этот уникальный **минерал**.
   - Source: `章节/样章.md`; Текст 1.2.2 — Голос камня; page 17
   - Matched form: `минерал`; confidence: `candidate_high`

### vmire-batch-0090. проведе́ние (举行，进行，引导)

- Vocabulary source: `词汇/名词/проведение.md` (vocabulary_json:vocab)
- Status: `candidate_high`; method: `exact`
1. Цель командировки: участие в международной выставке «Технопром-20...», презентация продукции компании, **проведение** переговоров с потенциальными партнёрами.
   - Source: `章节/раздел2-завершение.md`; Отчёт; page 80-82
   - Matched form: `проведение`; confidence: `candidate_high`

### vmire-batch-0091. о́бщество (社会；协会；公司)

- Vocabulary source: `词汇/名词/общество.md` (vocabulary_json:vocab)
- Status: `candidate_high`; method: `exact`
1. Нужно сделать всё возможное, чтобы вернуть их в **общество**, а главное, не дать им опуститься до уровня попрошаек.
   - Source: `章节/样章.md`; Текст 1.3.1 — Милости не просим; page 20
   - Matched form: `общество`; confidence: `candidate_high`

### vmire-batch-0092. срок (期限)

- Vocabulary source: `词汇/名词/срок.md` (vocabulary_json:vocab)
- Status: `candidate_high`; method: `exact`
1. Согласно информации о доставке, размещённой на сайте, **срок** поставки телефона — 15 дней, однако на сегодняшний день — 30.05.20...
   - Source: `章节/раздел2-завершение.md`; Претензия; page 70-71
   - Matched form: `срок`; confidence: `candidate_high`
2. Комова как грамотного, квалифицированного работника, добросовестно и в **срок** выполняющего свои служебные обязанности.
   - Source: `章节/раздел2-завершение.md`; Служебная записка; page 64-66
   - Matched form: `срок`; confidence: `candidate_high`

### vmire-batch-0093. свет (光；世界)

- Vocabulary source: `词汇/名词/свет.md` (vocabulary_json:vocab)
- Status: `candidate_high`; method: `exact`
1. Кажется, что мастер просто помогает птице появиться на **свет**, и сделать это легко и просто.
   - Source: `章节/样章.md`; Текст 1.2.2 — Голос камня; page 17
   - Matched form: `свет`; confidence: `candidate_high`

### vmire-batch-0094. тече́ние (水流；流派；过程)

- Vocabulary source: `词汇/名词/течение.md` (vocabulary_json:vocab)
- Status: `candidate_high`; method: `exact`
1. Чтение шло непрерывно в **течение** 60 часов.
   - Source: `章节/раздел2-завершение.md`; Текст 2.5.1 — Марафон чтения: «Война и мир»; page 77
   - Matched form: `течение`; confidence: `candidate_high`
2. На основании ст. 26.1, ст. 23.1 Закона о защите прав потребителей, требую в **течение** 10 дней с даты получения настоящей претензии осуществить возврат оплаченной мною суммы в полном размере, а также выплатить неустойку в связи с нарушением срока поставки (в размере 0,5% суммы предварительной оплаты).
   - Source: `章节/раздел2-завершение.md`; Претензия; page 70-71
   - Matched form: `течение`; confidence: `candidate_high`

### vmire-batch-0095. просто́й (简单的，普通的)

- Vocabulary source: `词汇/形容词/простой.md` (vocabulary_json:vocab)
- Status: `candidate_high`; method: `exact`
1. Чтобы за час вырезать из агальматолита хотя бы **простой** кубик, нужны годы тренировок.
   - Source: `章节/样章.md`; Текст 1.2.2 — Голос камня; page 17
   - Matched form: `простой`; confidence: `candidate_high`

### vmire-batch-0096. форма́т (格式；形式)

- Vocabulary source: `词汇/名词/формат.md` (vocabulary_json:vocab)
- Status: `candidate_high`; method: `exact`
1. Тексты писем восстановлены консервативно — оригинальный **формат** с реквизитами и бланками сохранён.
   - Source: `章节/раздел2-завершение.md`; Текст 2.4.2 — Информационные письма; page 75-76
   - Matched form: `формат`; confidence: `candidate_high`

### vmire-batch-0097. живо́й (活的，生动的，有生命的)

- Vocabulary source: `词汇/形容词/живой.md` (vocabulary_json:vocab)
- Status: `candidate_high`; method: `exact`
1. На своё тридцатилетие он сделал себе и друзьям необычный подарок — «**живой**» концерт.
   - Source: `章节/раздел2-завершение.md`; Текст 2.3.1 — Спортивный «Голос»; page 67
   - Matched form: `живой`; confidence: `candidate_high`
2. Талантливый юноша, проявлявший **живой** интерес к теплотехнике, в 1926 году он поступил на механический факультет Московского механико-машиностроительного института (впоследствии переименованного в МВТУ имени Н.Э.
   - Source: `章节/раздел1-продолжение.md`; Текст 1.4.1 — Отец Байконура; page 26
   - Matched form: `живой`; confidence: `candidate_high`
