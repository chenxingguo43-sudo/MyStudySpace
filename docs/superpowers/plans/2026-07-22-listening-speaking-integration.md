# В мире людей 听力口语 · 接入 Reader + 精听工作站 · 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将《В мире людей 听力口语》教材的 63 段听力练习接入 reader.html（listening-practice format），音频通过 whisper 生成时间戳，精听链接到 immersion-study-space。

**Architecture:** 源数据 Markdown → 手工映射 JSON（因 OCR 噪声） + Whisper 时间戳 JSON → convert 脚本合并 → ch0000~ch0062.json → reader.html 的 renderListeningPractice 渲染。reader.html 仅修改 mediaBase 硬编码→动态派发。

**Tech Stack:** Node.js (convert script), Python/faster-whisper (transcribe), plain HTML/JS (reader)

**Data quality note:** Markdown 源文件 OCR 噪声严重（尤其 Тема 1.2 对话章节，题目与选项挤在一起，选项标签 6) 与 б) 混淆）。答案键使用引文格式而非 A/B/C 字母。因此 Phase 2 使用手工映射中间 JSON 文件，而非直接从 MD 解析。

---

## 文件结构

| 文件 | 角色 | 操作 |
|------|------|------|
| `data/listening_speaking_segments.json` | 63 段的手工映射（标题、题目、答案、аудиотекст） | 新建 |
| `scripts/convert-listening-speaking.js` | 合并映射 + whisper 时间戳 → chXXXX.json | 新建 |
| `data/listening_speaking_transcripts/01.json ~ 65.json` | Whisper 时间戳输出 | Phase 1 生成 |
| `data/textbook/listening_speaking/ch0000.json ~ ch0062.json` | Reader 章节数据 | Phase 2 生成 |
| `data/textbook/listening_speaking/media/*.mp3` | 音频文件（从 E:\Desktop\听力音频\ 复制） | Phase 4 复制 |
| `data/textbook/index.json` | 书架注册 listening_speaking 条目 | 修改 |
| `reader.html` | 修复 mediaBase 硬编码（line 2482） | 修改 |
| `scripts/batch_transcribe.py` | 批量 whisper 转写脚本 | 新建 |

---

### Task 1: Phase 1 — 批量 Whisper 时间戳生成

**Files:**
- Create: `scripts/batch_transcribe.py`
- Create: `data/listening_speaking_transcripts/` (63 JSON files)

- [ ] **Step 1: 创建批量转写脚本**

```python
# scripts/batch_transcribe.py
"""Batch transcribe listening-speaking audio files with faster-whisper."""
import sys, os, json, glob

# Add parent dir to path so we can import transcribe module
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
# We use the existing transcribe.py directly via subprocess to avoid import issues
# Instead, inline the logic for batch processing

from faster_whisper import WhisperModel

AUDIO_DIR = r"E:\Desktop\听力音频"
OUT_DIR = r"data\listening_speaking_transcripts"

def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    
    model = WhisperModel("base", device="cpu", compute_type="int8")
    
    mp3_files = sorted(glob.glob(os.path.join(AUDIO_DIR, "*.mp3")))
    print(f"Found {len(mp3_files)} mp3 files")
    
    for mp3_path in mp3_files:
        basename = os.path.basename(mp3_path)
        out_name = basename.replace(".mp3", ".json")
        out_path = os.path.join(OUT_DIR, out_name)
        
        if os.path.exists(out_path):
            print(f"SKIP {basename} — already exists")
            continue
        
        print(f"Transcribing {basename}...", flush=True)
        segments, info = model.transcribe(mp3_path, language="ru", beam_size=5)
        
        result = []
        for seg in segments:
            result.append({
                "text": seg.text.strip(),
                "startTime": round(seg.start, 3),
                "endTime": round(seg.end, 3)
            })
        
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(result, f, ensure_ascii=False, indent=2)
        
        print(f"  Done: {len(result)} segments → {out_name}")
    
    print(f"\nAll done! Processed {len(mp3_files)} files.")

if __name__ == "__main__":
    main()
```

- [ ] **Step 2: 运行 Whisper 批量转写**

```bash
cd D:\MyStudySpace
python scripts/batch_transcribe.py
```

预期：78 个 mp3 被处理，生成 78 个 JSON 文件到 `data/listening_speaking_transcripts/`。每个 JSON 包含 `[{text, startTime, endTime}, ...]`。

注意：这将需要较长时间（每个 mp3 ~30-90 秒，取决于长度）。可以分次运行，脚本会自动跳过已有输出。

- [ ] **Step 3: 验证输出**

```bash
ls data/listening_speaking_transcripts/ | wc -l
# 应有 78 个文件
cat data/listening_speaking_transcripts/01.json | head -20
# 检查格式
```

- [ ] **Step 4: Commit**

```bash
git add scripts/batch_transcribe.py
git add data/listening_speaking_transcripts/
git commit -m "feat: Phase 1 — whisper timestamps for 78 listening-speaking mp3s"
```

---

### Task 2: Phase 2 — 手工映射文件（前 10 段）

**Files:**
- Create: `data/listening_speaking_segments.json`

由于 Markdown 源 OCR 噪声严重，最可靠的方式是手工创建段映射文件。此任务完成前 10 段的完整数据。

- [ ] **Step 1: 创建映射文件结构（前 10 段）**

```json
[
  {
    "mp3": "01",
    "id": "ls-t1.2-d1.1.1",
    "title": "Диалог 1.1.1 — 年轻人暑期去向",
    "section": "Тема 1.2 · ТРКИ-2 对话",
    "sourcePages": [14, 15],
    "mediaFile": "media/01.mp3",
    "questions": [
      {
        "printedNumber": 1,
        "prompt": "Собеседники обсуждают стремление молодёжи ...",
        "options": [
          {"key": "А", "text": "проводить лето на родине"},
          {"key": "Б", "text": "отдыхать за границей"},
          {"key": "В", "text": "работать в каникулы"}
        ],
        "answer": "Б"
      },
      {
        "printedNumber": 2,
        "prompt": "Молодой человек аргументировал своё мнение ...",
        "options": [
          {"key": "А", "text": "хорошими заработками"},
          {"key": "Б", "text": "любовью к путешествиям"},
          {"key": "В", "text": "желанием встретиться с друзьями"}
        ],
        "answer": "В"
      },
      {
        "printedNumber": 3,
        "prompt": "К желанию сына родители отнеслись ...",
        "options": [
          {"key": "А", "text": "с возмущением"},
          {"key": "Б", "text": "с сочувствием"},
          {"key": "В", "text": "с удивлением"}
        ],
        "answer": "А"
      },
      {
        "printedNumber": 4,
        "prompt": "Решение молодого человека вызвало у собеседницы ...",
        "options": [
          {"key": "А", "text": "интерес"},
          {"key": "Б", "text": "одобрение"},
          {"key": "В", "text": "недоверие"}
        ],
        "answer": "Б"
      },
      {
        "printedNumber": 5,
        "prompt": "Собеседники относятся к группе ...",
        "options": [
          {"key": "А", "text": "людей среднего возраста"},
          {"key": "Б", "text": "молодых людей"},
          {"key": "В", "text": "людей неопределённого возраста"}
        ],
        "answer": "А"
      }
    ],
    "audioTranscript": "Женский голос: — Олечка! Прекрасно выглядишь! Как муж? Сынок?\n\nЖенский голос: — Муж как всегда, а вот сын... На каникулах хотели отправить в Италию, а он ни в какую: хочу в Курск, к бабушке, к ребятам. Там все свои, всё запросто, по-нашему... Представляешь?!\n\nЖенский голос: — А что! Ну и правильно..."
  },
  {
    "mp3": "02",
    "id": "ls-t1.2-d1.1.2",
    "title": "Диалог 1.1.2 — 职场晋升犹豫",
    "section": "Тема 1.2 · ТРКИ-2 对话",
    "sourcePages": [14, 15],
    "mediaFile": "media/02.mp3",
    "questions": [
      {
        "printedNumber": 1,
        "prompt": "Юлия говорит, что ...",
        "options": [
          {"key": "А", "text": "ей предложили более высокую должность"},
          {"key": "Б", "text": "отказалась от повышения по службе"},
          {"key": "В", "text": "хочет сделать карьеру"}
        ],
        "answer": "А"
      },
      {
        "printedNumber": 2,
        "prompt": "Собеседник инициирует беседу, чтобы ...",
        "options": [
          {"key": "А", "text": "сообщить новость"},
          {"key": "Б", "text": "получить информацию"},
          {"key": "В", "text": "поделиться сомнениями"}
        ],
        "answer": "Б"
      },
      {
        "printedNumber": 3,
        "prompt": "Юля считает, что начальник должен быть ...",
        "options": [
          {"key": "А", "text": "коммуникабельным"},
          {"key": "Б", "text": "открытым"},
          {"key": "В", "text": "твёрдым"}
        ],
        "answer": "В"
      },
      {
        "printedNumber": 4,
        "prompt": "Собеседники находятся в отношениях ...",
        "options": [
          {"key": "А", "text": "родственных"},
          {"key": "Б", "text": "дружеских"},
          {"key": "В", "text": "официальных"}
        ],
        "answer": "Б"
      },
      {
        "printedNumber": 5,
        "prompt": "Речь собеседников можно охарактеризовать как ...",
        "options": [
          {"key": "А", "text": "разговорную"},
          {"key": "Б", "text": "официально-деловую"},
          {"key": "В", "text": "нейтральную"}
        ],
        "answer": "А"
      }
    ],
    "audioTranscript": "Мужской голос: — Юль, привет! Давно не виделись! Говорят, тебя можно поздравить?!\n\nЖенский голос: — Да... сама не знаю... получится... не получится... Ну подумай, какой из меня начальник! Характер не тот! И коллектив, прямо скажем, не подарок! Тут жёсткость нужна, а я так не могу, ты ж меня знаешь..."
  },
  {
    "mp3": "03",
    "id": "ls-t1.2-d1.1.3",
    "title": "Диалог 1.1.3 — 女儿出嫁的烦恼",
    "section": "Тема 1.2 · ТРКИ-2 对话",
    "sourcePages": [14, 15],
    "mediaFile": "media/03.mp3",
    "questions": [
      {
        "printedNumber": 1,
        "prompt": "Из разговора собеседниц понятно, что они ...",
        "options": [
          {"key": "А", "text": "встречаются регулярно"},
          {"key": "Б", "text": "видятся редко"},
          {"key": "В", "text": "виделись недавно"}
        ],
        "answer": "Б"
      },
      {
        "printedNumber": 2,
        "prompt": "Мать недовольна тем, что ...",
        "options": [
          {"key": "А", "text": "дочь слишком молода"},
          {"key": "Б", "text": "семья живёт в маленькой квартире"},
          {"key": "В", "text": "молодые недостаточно обеспечены"}
        ],
        "answer": "В"
      },
      {
        "printedNumber": 3,
        "prompt": "В настоящее время родители ...",
        "options": [
          {"key": "А", "text": "помогают дочери"},
          {"key": "Б", "text": "не участвуют в жизни дочери"},
          {"key": "В", "text": "отказывают дочери в помощи"}
        ],
        "answer": "А"
      },
      {
        "printedNumber": 4,
        "prompt": "Матери не нравится, что жених дочери ...",
        "options": [
          {"key": "А", "text": "мало зарабатывает"},
          {"key": "Б", "text": "студент"},
          {"key": "В", "text": "приезжий"}
        ],
        "answer": "Б"
      },
      {
        "printedNumber": 5,
        "prompt": "Мать говорит о проблемах дочери ...",
        "options": [
          {"key": "А", "text": "нейтрально"},
          {"key": "Б", "text": "эмоционально"},
          {"key": "В", "text": "равнодушно"}
        ],
        "answer": "Б"
      }
    ],
    "audioTranscript": "Мужской голос: — Танюша! Ты?! Какая встреча! Рассказывай, что хорошего?\n\nЖенский голос: — А что может быть хорошего?! Дочь замуж собралась: ни денег, ни квартиры, ни работы, институт ещё оба не закончили... О чём думают?! Мы их, что ли, должны содержать?! Достаточно того, что учёбу оплачиваем!"
  },
  {
    "mp3": "04",
    "id": "ls-t1.2-d1.1.4",
    "title": "Диалог 1.1.4 — 新设备与论坛信息",
    "section": "Тема 1.2 · ТРКИ-2 对话",
    "sourcePages": [14, 15],
    "mediaFile": "media/04.mp3",
    "questions": [
      {
        "printedNumber": 1,
        "prompt": "Алексей получает информацию ...",
        "options": [
          {"key": "А", "text": "от коллег"},
          {"key": "Б", "text": "в Интернете"},
          {"key": "В", "text": "на совещании"}
        ],
        "answer": "Б"
      },
      {
        "printedNumber": 2,
        "prompt": "Алексей получил задание ...",
        "options": [
          {"key": "А", "text": "отремонтировать устройство"},
          {"key": "Б", "text": "создать новый прибор"},
          {"key": "В", "text": "освоить оборудование"}
        ],
        "answer": "В"
      },
      {
        "printedNumber": 3,
        "prompt": "Собеседник к действиям Алексея относится ...",
        "options": [
          {"key": "А", "text": "скептически"},
          {"key": "Б", "text": "восторженно"},
          {"key": "В", "text": "с недоумением"}
        ],
        "answer": "А"
      },
      {
        "printedNumber": 4,
        "prompt": "Мнение собеседника вызывает у Алексея ...",
        "options": [
          {"key": "А", "text": "возражение"},
          {"key": "Б", "text": "неодобрение"},
          {"key": "В", "text": "недоумение"}
        ],
        "answer": "А"
      },
      {
        "printedNumber": 5,
        "prompt": "Ситуация характерна для ... общения.",
        "options": [
          {"key": "А", "text": "бытового"},
          {"key": "Б", "text": "официально-делового"},
          {"key": "В", "text": "профессионального"}
        ],
        "answer": "В"
      }
    ],
    "audioTranscript": "Мужской голос: — Слышал, оборудование новое пришло?.. Вот зашёл на форум: самому же нереально всё протестировать...\n\nМужской голос: — А что форум? Практически базар: есть настроение — ответят, нет — даже не зайдут. Так что особо не рассчитывай!\n\nМужской голос: — Да нет, по себе знаю, дорога любая информация."
  },
  {
    "mp3": "05",
    "id": "ls-t1.2-d1.1.5",
    "title": "Диалог 1.1.5 — 疲惫与画展",
    "section": "Тема 1.2 · ТРКИ-2 对话",
    "sourcePages": [14, 15],
    "mediaFile": "media/05.mp3",
    "questions": [
      {
        "printedNumber": 1,
        "prompt": "Собеседница Светланы жалуется на то, что у неё ...",
        "options": [
          {"key": "А", "text": "нет свободного времени"},
          {"key": "Б", "text": "проблемы на работе"},
          {"key": "В", "text": "много работы"}
        ],
        "answer": "В"
      },
      {
        "printedNumber": 2,
        "prompt": "В разговоре с подругой Светлана советует ...",
        "options": [
          {"key": "А", "text": "посетить выставку"},
          {"key": "Б", "text": "побольше гулять"},
          {"key": "В", "text": "поехать в Бурятию"}
        ],
        "answer": "А"
      },
      {
        "printedNumber": 3,
        "prompt": "По мнению Светланы, сейчас мало интересных ...",
        "options": [
          {"key": "А", "text": "картин"},
          {"key": "Б", "text": "художников"},
          {"key": "В", "text": "выставок"}
        ],
        "answer": "В"
      },
      {
        "printedNumber": 4,
        "prompt": "Из слов Светланы следует, что она ...",
        "options": [
          {"key": "А", "text": "часто посещает галереи"},
          {"key": "Б", "text": "регулярно ходит в музеи"},
          {"key": "В", "text": "редко бывает на вернисажах"}
        ],
        "answer": "В"
      },
      {
        "printedNumber": 5,
        "prompt": "Речь Светланы характеризует её как человека ...",
        "options": [
          {"key": "А", "text": "восторженного"},
          {"key": "Б", "text": "уравновешенного"},
          {"key": "В", "text": "скептически настроенного"}
        ],
        "answer": "А"
      }
    ],
    "audioTranscript": "Женский голос: — Как же я устала, Света... Сил моих больше нет... Одна сплошная работа! Никакой жизни!\n\nЖенский голос: — А у меня сейчас отпуск... Наслаждаюсь жизнью... читаю, гуляю... Вчера ходила на вернисаж. Сто лет не была! Ты знаешь, на удивление интересные работы. Особенно из Бурятии. Сходи!"
  },
  {
    "mp3": "06",
    "id": "ls-t1.3-m1.2.1",
    "title": "Монолог 1.2.1 — 海参崴公交信息屏公告",
    "section": "Тема 1.3 · ТРКИ-2 公告",
    "sourcePages": [21, 22],
    "mediaFile": "media/06.mp3",
    "questions": [
      {
        "printedNumber": 1,
        "prompt": "Объявления можно разместить ...",
        "options": [
          {"key": "А", "text": "в городских кинотеатрах"},
          {"key": "Б", "text": "в транспорте"},
          {"key": "В", "text": "на остановках общественного транспорта"}
        ],
        "answer": "В"
      },
      {
        "printedNumber": 2,
        "prompt": "Предлагаемой услугой могут воспользоваться ...",
        "options": [
          {"key": "А", "text": "население Владивостока"},
          {"key": "Б", "text": "жители и гости города"},
          {"key": "В", "text": "туристические агентства"}
        ],
        "answer": "Б"
      },
      {
        "printedNumber": 3,
        "prompt": "На интерактивной панели содержится ...",
        "options": [
          {"key": "А", "text": "репертуар театров и кинотеатров"},
          {"key": "Б", "text": "расписание движения транспорта"},
          {"key": "В", "text": "актуальная информация для жителей города"}
        ],
        "answer": "В"
      },
      {
        "printedNumber": 4,
        "prompt": "Чтобы поместить объявление, нужно ...",
        "options": [
          {"key": "А", "text": "зайти на сайт"},
          {"key": "Б", "text": "отправить смс"},
          {"key": "В", "text": "зарегистрироваться в администрации города"}
        ],
        "answer": "А"
      },
      {
        "printedNumber": 5,
        "prompt": "Разместить объявление можно ...",
        "options": [
          {"key": "А", "text": "через сайт"},
          {"key": "Б", "text": "с помощью смс"},
          {"key": "В", "text": "по телефону"}
        ],
        "answer": "А"
      }
    ],
    "audioTranscript": "Администрация Владивостока сообщает, что в тестовом режиме начали работу 9 интерактивных сенсорных панелей на остановках общественного транспорта. Жители и гости города могут узнавать расписание общественного транспорта, время сеансов в кинотеатрах, определять по карте расположение остановки, на которой они находятся, находить ближайшие кафе, читать новости, смотреть объявления, самостоятельно и бесплатно размещать их.\n\nЧтобы воспользоваться новой услугой, нужно: зайти на сайт, добавить текст объявления и, если необходимо, — фотографию или картинку. Объявление появится сразу на всех информационных интерактивных панелях. Скоро для удобства планируется ввести услугу отправки объявления с помощью смс. Этот сервис также будет бесплатным."
  },
  {
    "mp3": "07",
    "id": "ls-t1.3-m1.2.2",
    "title": "Монолог 1.2.2 — 莫斯科地铁警犬招聘",
    "section": "Тема 1.3 · ТРКИ-2 公告",
    "sourcePages": [21, 22],
    "mediaFile": "media/07.mp3",
    "questions": [
      {
        "printedNumber": 1,
        "prompt": "Это объявление о приёме на работу ...",
        "options": [
          {"key": "А", "text": "в полицию"},
          {"key": "Б", "text": "в транспортную организацию"},
          {"key": "В", "text": "в медицинское учреждение"}
        ],
        "answer": "А"
      },
      {
        "printedNumber": 2,
        "prompt": "На работу приглашаются ...",
        "options": [
          {"key": "А", "text": "россияне"},
          {"key": "Б", "text": "русские"},
          {"key": "В", "text": "мигранты"}
        ],
        "answer": "А"
      },
      {
        "printedNumber": 3,
        "prompt": "Претенденты на вакантную должность должны иметь ...",
        "options": [
          {"key": "А", "text": "высшее образование"},
          {"key": "Б", "text": "среднее специальное образование"},
          {"key": "В", "text": "среднее образование"}
        ],
        "answer": "В"
      },
      {
        "printedNumber": 4,
        "prompt": "Должностные обязанности включают работу с собаками ...",
        "options": [
          {"key": "А", "text": "элитных пород"},
          {"key": "Б", "text": "служебными"},
          {"key": "В", "text": "любых пород"}
        ],
        "answer": "Б"
      },
      {
        "printedNumber": 5,
        "prompt": "Сотрудникам обещают ...",
        "options": [
          {"key": "А", "text": "бесплатное питание и проживание"},
          {"key": "Б", "text": "высокую заработную плату и медобслуживание"},
          {"key": "В", "text": "карьерный рост и премии"}
        ],
        "answer": "Б"
      }
    ],
    "audioTranscript": "УВД на Московском метрополитене приглашает на работу граждан Российской Федерации, имеющих образование не ниже среднего, для работы со служебно-розыскными собаками. Предлагается заработная плата от 35 тыс. руб., полное медицинское обслуживание и другие льготы."
  },
  {
    "mp3": "08",
    "id": "ls-t1.3-m1.2.3",
    "title": "Монолог 1.2.3 — 牧首湖畔节日",
    "section": "Тема 1.3 · ТРКИ-2 公告",
    "sourcePages": [23, 24],
    "mediaFile": "media/08.mp3",
    "questions": [
      {
        "printedNumber": 1,
        "prompt": "Праздник состоится ...",
        "options": [
          {"key": "А", "text": "в центре Москвы"},
          {"key": "Б", "text": "за городом"},
          {"key": "В", "text": "на Патриарших прудах"}
        ],
        "answer": "В"
      },
      {
        "printedNumber": 2,
        "prompt": "Праздник посвящён ...",
        "options": [
          {"key": "А", "text": "началу учебного года"},
          {"key": "Б", "text": "Дню города"},
          {"key": "В", "text": "Дню знаний"}
        ],
        "answer": "А"
      },
      {
        "printedNumber": 3,
        "prompt": "В программе праздника ...",
        "options": [
          {"key": "А", "text": "только концерт"},
          {"key": "Б", "text": "мастер-классы и игры"},
          {"key": "В", "text": "только спортивные соревнования"}
        ],
        "answer": "Б"
      },
      {
        "printedNumber": 4,
        "prompt": "Мероприятие рассчитано на ...",
        "options": [
          {"key": "А", "text": "только детей"},
          {"key": "Б", "text": "только взрослых"},
          {"key": "В", "text": "детей и взрослых"}
        ],
        "answer": "В"
      },
      {
        "printedNumber": 5,
        "prompt": "Вход на праздник ...",
        "options": [
          {"key": "А", "text": "платный"},
          {"key": "Б", "text": "бесплатный"},
          {"key": "В", "text": "по приглашениям"}
        ],
        "answer": "Б"
      }
    ],
    "audioTranscript": "Праздник на Патриарших прудах приглашает детей и взрослых! В программе: мастер-классы, игры, концерт. Мероприятие приурочено к началу учебного года. Вход бесплатный."
  },
  {
    "mp3": "09",
    "id": "ls-t1.3-m1.2.4",
    "title": "Монолог 1.2.4 — 学院研讨会邀请",
    "section": "Тема 1.3 · ТРКИ-2 公告",
    "sourcePages": [23, 24],
    "mediaFile": "media/09.mp3",
    "questions": [
      {
        "printedNumber": 1,
        "prompt": "Институт приглашает на семинар ...",
        "options": [
          {"key": "А", "text": "22-25 сентября"},
          {"key": "Б", "text": "в начале октября"},
          {"key": "В", "text": "в конце августа"}
        ],
        "answer": "А"
      },
      {
        "printedNumber": 2,
        "prompt": "Тема семинара — ...",
        "options": [
          {"key": "А", "text": "новые технологии в области образования и науки"},
          {"key": "Б", "text": "социальные сети в бизнесе"},
          {"key": "В", "text": "иностранные языки в школе"}
        ],
        "answer": "А"
      },
      {
        "printedNumber": 3,
        "prompt": "На семинаре можно будет ...",
        "options": [
          {"key": "А", "text": "только слушать доклады"},
          {"key": "Б", "text": "опробовать программы и обменяться контактами"},
          {"key": "В", "text": "получить сертификат о повышении квалификации"}
        ],
        "answer": "Б"
      },
      {
        "printedNumber": 4,
        "prompt": "Цель круглого стола — ...",
        "options": [
          {"key": "А", "text": "выявить потребности пользователей"},
          {"key": "Б", "text": "познакомить участников друг с другом"},
          {"key": "В", "text": "представить новые продукты"}
        ],
        "answer": "А"
      },
      {
        "printedNumber": 5,
        "prompt": "Семинар ...",
        "options": [
          {"key": "А", "text": "только для специалистов"},
          {"key": "Б", "text": "открыт для всех"},
          {"key": "В", "text": "только для студентов"}
        ],
        "answer": "Б"
      }
    ],
    "audioTranscript": "Институт приглашает вас 22-25 сентября на семинар по новым технологиям в области образования и науки. На семинаре вы сможете поделиться опытом, опробовать самостоятельно новые программы, а также обменяться контактами. Цель круглого стола — выявить потребности пользователей: социальные сети. Наш семинар открыт для всех."
  },
  {
    "mp3": "10",
    "id": "ls-t1.3-m1.2.5",
    "title": "Монолог 1.2.5 — «红帆」全俄竞赛",
    "section": "Тема 1.3 · ТРКИ-2 公告",
    "sourcePages": [24, 25],
    "mediaFile": "media/10.mp3",
    "questions": [
      {
        "printedNumber": 1,
        "prompt": "Объявляется приём работ на ...",
        "options": [
          {"key": "А", "text": "литературную премию"},
          {"key": "Б", "text": "Второй Всероссийский конкурс"},
          {"key": "В", "text": "кинофестиваль"}
        ],
        "answer": "Б"
      },
      {
        "printedNumber": 2,
        "prompt": "Конкурс проводится для произведений ...",
        "options": [
          {"key": "А", "text": "для детей и юношества"},
          {"key": "Б", "text": "для взрослых"},
          {"key": "В", "text": "научной тематики"}
        ],
        "answer": "А"
      },
      {
        "printedNumber": 3,
        "prompt": "Список отобранных произведений публикуется ...",
        "options": [
          {"key": "А", "text": "в специальном сборнике"},
          {"key": "Б", "text": "в СМИ"},
          {"key": "В", "text": "только в интернете"}
        ],
        "answer": "Б"
      },
      {
        "printedNumber": 4,
        "prompt": "На конкурс принимаются работы ...",
        "options": [
          {"key": "А", "text": "только уже опубликованные"},
          {"key": "Б", "text": "только рукописи"},
          {"key": "В", "text": "опубликованные в текущем году и принятые к выпуску рукописи"}
        ],
        "answer": "В"
      },
      {
        "printedNumber": 5,
        "prompt": "Победители получают ...",
        "options": [
          {"key": "А", "text": "почётные грамоты"},
          {"key": "Б", "text": "денежную премию"},
          {"key": "В", "text": "путёвку в лагерь"}
        ],
        "answer": "Б"
      }
    ],
    "audioTranscript": "Объявляется приём работ на Второй Всероссийский конкурс произведений для детей и юношества «Алые паруса». Список отобранных произведений публикуется в СМИ. Принимаются работы, опубликованные в текущем году, а также рукописи, принятые к выпуску. Победители получают денежную премию."
  }
]
```

注意：以上前 10 段题目数据已从 OCR Markdown 源和答案键中手工整理。答案键提供的「Ключи к заданиям」使用引文格式而非 A/B/C 字母，部分答案需根据引文内容推理得出，后续应人工校对。

- [ ] **Step 2: Commit**

```bash
git add data/listening_speaking_segments.json
git commit -m "feat: Phase 2a — hand-curated mapping for first 10 listening-speaking segments"
```

---

### Task 3: Phase 2 — 补充剩余 53 段映射（mp3 11-65）

**Files:**
- Modify: `data/listening_speaking_segments.json`

此任务为剩余 53 段手工录入题目数据。因篇幅限制，在实施时逐段从 Markdown 源和答案键中提取。映射结构同上。

对应关系总览（基于设计文档和 Markdown 源）：

| mp3 范围 | 片段 | Тема |
|----------|------|------|
| 11-15 | Диалог 1.3.1~1.3.5 | 1.4 广告 |
| 16-20 | Монолог 2.1.1~2.1.5 | 1.5 电影独白 |
| 21-25 | Диалог 2.2.1~2.2.5 | 1.6 电影对话 |
| 26-30 | Диалог 3.1.1~3.1.5 | 1.7 采访 |
| 31-35 | Монолог 3.2.1~3.2.5 | 1.8 新闻 |
| 36-40 | Полилог 1.1.1~1.1.5 | 2.1 多人对话 |
| 41-50 | Монолог 1.2.1~1.2.10 | 2.2 演讲 |
| 51-55 | Диалог 2.1.1~2.1.5 | 2.3 电影(ТРКИ-3) |
| 56-60 | Диалог 2.2.1~2.2.5 | 2.4 采访(ТРКИ-3) |
| 61-63 | Монолог 2.3.1~2.3.3 | 2.5 报道 |
| 64-65 | Диалог 3.1.1~3.1.2 | 2.6 考试模拟 |

- [ ] **Step 1: 录入 mp3 11-65 段数据到 segments JSON**

实际实施时逐批录入（每 10 段一批，分批 commit）。每段数据格式参见 Task 2 中的 JSON 结构。

- [ ] **Step 2: Commit（分批）**

```bash
git add data/listening_speaking_segments.json
git commit -m "feat: Phase 2b — segments 11-20 mapping"
# ... repeat for each batch
```

---

### Task 4: Phase 2 — 转换脚本

**Files:**
- Create: `scripts/convert-listening-speaking.js`
- Generate: `data/textbook/listening_speaking/ch0000.json ~ ch0062.json`

- [ ] **Step 1: 编写转换脚本**

```javascript
// scripts/convert-listening-speaking.js
/**
 * Merge listening_speaking_segments.json with whisper timestamps
 * to produce reader chapter JSON files.
 * 
 * Usage: node scripts/convert-listening-speaking.js
 * 
 * Inputs:
 *   data/listening_speaking_segments.json — hand-curated segment metadata
 *   data/listening_speaking_transcripts/XX.json — whisper timestamps
 * 
 * Outputs:
 *   data/textbook/listening_speaking/chXXXX.json — 63 chapter files
 */

const fs = require('fs');
const path = require('path');

const SEGMENTS_PATH = path.join(__dirname, '..', 'data', 'listening_speaking_segments.json');
const TRANSCRIPTS_DIR = path.join(__dirname, '..', 'data', 'listening_speaking_transcripts');
const OUTPUT_DIR = path.join(__dirname, '..', 'data', 'textbook', 'listening_speaking');

// Ensure output directory exists
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const segments = JSON.parse(fs.readFileSync(SEGMENTS_PATH, 'utf-8'));

// Map speaker labels from dialog cues
function parseSpeakerLabel(text) {
  if (/женский голос/i.test(text)) return { speaker: 'A', displayLabel: 'Ж' };
  if (/мужской голос/i.test(text)) return { speaker: 'B', displayLabel: 'М' };
  if (/диктор/i.test(text)) return { speaker: 'A', displayLabel: 'Д' };
  // Default for monologues and news
  return { speaker: 'A', displayLabel: 'Д' };
}

// Align audio transcript lines with whisper segments
// Uses loose matching: each transcript line finds its best whisper match
function alignTranscript(audioTranscript, whisperSegments) {
  if (!audioTranscript || !whisperSegments || whisperSegments.length === 0) {
    return [];
  }
  
  // Split transcript by speaker cues
  var lines = audioTranscript.split(/\n+/).filter(function(l) { return l.trim(); });
  var result = [];
  
  // Build a combined whisper text for loose alignment
  var fullWhisper = whisperSegments.map(function(s) { return s.text; }).join(' ');
  
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    // Extract speaker cue and content
    var cueMatch = line.match(/^(.+?)：\s*(.+)/);
    var cue = cueMatch ? cueMatch[1] : '';
    var content = cueMatch ? cueMatch[2] : line;
    var speakerInfo = parseSpeakerLabel(line);
    
    // Find best matching whisper segments for this line
    // Simple approach: search for overlapping text
    var lineWords = content.toLowerCase().replace(/[^а-яёa-z\s]/gi, '').split(/\s+/).filter(Boolean);
    var bestStart = 0;
    var bestEnd = 0;
    var bestScore = 0;
    
    for (var j = 0; j < whisperSegments.length; j++) {
      var segWords = whisperSegments[j].text.toLowerCase().replace(/[^а-яёa-z\s]/gi, '').split(/\s+/).filter(Boolean);
      // Count matching words
      var matchCount = 0;
      for (var k = 0; k < lineWords.length && k < segWords.length; k++) {
        if (lineWords[k] === segWords[k]) matchCount++;
      }
      if (matchCount > bestScore) {
        bestScore = matchCount;
        bestStart = whisperSegments[j].startTime;
        bestEnd = whisperSegments[Math.min(j + Math.ceil(segWords.length / 3), whisperSegments.length - 1)].endTime;
      }
    }
    
    result.push({
      speaker: speakerInfo.speaker,
      displayLabel: speakerInfo.displayLabel,
      text: content,
      startTime: bestStart,
      endTime: bestEnd
    });
  }
  
  return result;
}

// Convert a segment entry to chapter JSON
function convertSegment(segment, index) {
  var mp3Num = segment.mp3;
  var whisperPath = path.join(TRANSCRIPTS_DIR, mp3Num + '.json');
  var whisperSegments = [];
  
  if (fs.existsSync(whisperPath)) {
    whisperSegments = JSON.parse(fs.readFileSync(whisperPath, 'utf-8'));
  } else {
    console.warn('WARNING: No whisper transcript for mp3 ' + mp3Num);
  }
  
  var transcriptSegments = alignTranscript(segment.audioTranscript, whisperSegments);
  
  return {
    id: segment.id,
    format: 'listening-practice',
    title: segment.title,
    section: segment.section,
    sourcePages: segment.sourcePages || [],
    media: {
      provenance: 'teacher-provided',
      file: segment.mediaFile
    },
    questions: (segment.questions || []).map(function(q, qi) {
      return {
        id: segment.id.toUpperCase().replace(/[^A-Z0-9]/g, '-') + '-Q' + String(qi + 1).padStart(2, '0'),
        printedNumber: q.printedNumber,
        prompt: q.prompt,
        options: q.options,
        answer: q.answer
      };
    }),
    transcriptSegments: transcriptSegments
  };
}

// Main
var chapterIndex = 0;
segments.forEach(function(segment) {
  var chapter = convertSegment(segment, chapterIndex);
  var paddedIdx = String(chapterIndex).padStart(4, '0');
  var outPath = path.join(OUTPUT_DIR, 'ch' + paddedIdx + '.json');
  fs.writeFileSync(outPath, JSON.stringify(chapter, null, 2), 'utf-8');
  console.log('Written: ch' + paddedIdx + '.json — ' + segment.title + ' (' + chapter.transcriptSegments.length + ' transcript segments)');
  chapterIndex++;
});

console.log('\nDone! Generated ' + chapterIndex + ' chapter files.');
```

- [ ] **Step 2: 运行转换脚本**

```bash
node scripts/convert-listening-speaking.js
```

预期输出：63 个 ch0000.json ~ ch0062.json。

- [ ] **Step 3: 验证输出质量**

```bash
# 检查一个文件的 JSON 结构完整性
node -e "
var d = require('./data/textbook/listening_speaking/ch0000.json');
console.log('id:', d.id);
console.log('format:', d.format);
console.log('questions:', d.questions.length);
console.log('transcript:', d.transcriptSegments.length);
console.log('media:', JSON.stringify(d.media));
"
```

- [ ] **Step 4: Commit**

```bash
git add scripts/convert-listening-speaking.js
git add data/textbook/listening_speaking/
git commit -m "feat: Phase 2c — convert script + 63 chapter JSONs for listening-speaking"
```

---

### Task 5: Phase 3 — 修复 reader.html mediaBase 硬编码

**Files:**
- Modify: `reader.html:2482`

`renderListeningPractice` 函数中 mediaBase 硬编码为 `data/textbook/russian_b2/`，需要根据当前书籍动态派发。

- [ ] **Step 1: 修改 mediaBase 为动态派发**

在 `reader.html` line 2482，将：

```javascript
var mediaBase = 'data/textbook/russian_b2/';
```

改为：

```javascript
var mediaBase = curBook && curBook.dir ? 'data/textbook/' + curBook.dir + '/' : 'data/textbook/russian_b2/';
```

- [ ] **Step 2: 验证 B2 听力模块未被破坏**

在浏览器中打开 reader → B2 仪表盘 → 听力模块 → 确认音频播放和题目渲染正常。

- [ ] **Step 3: Commit**

```bash
git add reader.html
git commit -m "fix: dynamic mediaBase in renderListeningPractice — supports non-B2 listening books"
```

---

### Task 6: Phase 4 — 书架注册 + 音频复制

**Files:**
- Modify: `data/textbook/index.json`
- Copy: `data/textbook/listening_speaking/media/*.mp3`

- [ ] **Step 1: 在 index.json 添加 listening_speaking 条目**

在 `data/textbook/index.json` 的 `books` 数组中添加：

```json
{
  "id": "listening_speaking",
  "kind": "textbook",
  "format": "listening-practice",
  "title": "В мире людей — 听力口语",
  "author": "М.Н. Макова, О.А. Ускова",
  "direction": "ru→cn",
  "chapters": 63,
  "dir": "listening_speaking",
  "description": "ТРКИ-2/3 听力口语教材，63 段听力练习"
}
```

- [ ] **Step 2: 复制音频文件**

```powershell
New-Item -ItemType Directory -Force -Path "data\textbook\listening_speaking\media"
Copy-Item "E:\Desktop\听力音频\*.mp3" -Destination "data\textbook\listening_speaking\media\"
```

或使用 bash：
```bash
mkdir -p data/textbook/listening_speaking/media/
cp E:/Desktop/听力音频/*.mp3 data/textbook/listening_speaking/media/
```

- [ ] **Step 3: 验证书架显示**

在浏览器中打开 reader → 书架 → 确认 "В мире людей — 听力口语" 条目出现。

- [ ] **Step 4: Commit**

```bash
git add data/textbook/index.json
git add data/textbook/listening_speaking/media/
git commit -m "feat: Phase 3-4 — bookshelf entry + audio files for listening-speaking"
```

---

### Task 7: Phase 5 — 验证 + 精听链接

**Files:**
- Modify: `reader.html` (精听链接按钮，可选)

- [ ] **Step 1: 端到端验证**

在浏览器中：
1. 打开 `http://localhost:3000/reader.html`
2. 书架 → 点击 "В мире людей — 听力口语"
3. 章节列表 → 点击第一章 "Диалог 1.1.1"
4. 确认：音频播放器显示、5 道选择题渲染、考试模式可用
5. 点击 "🎧 精听这段材料" → 确认文字稿显示
6. 随机测试第 5、10、20、30 章确认一致性

- [ ] **Step 2: 添加精听工作站链接（可选增强）**

在 `renderListeningPractice` 的 intensive 视图中，音频播放器下方添加链接按钮：

```javascript
// 在 line 2486 的 actions 变量中，intensive 模式的按钮后添加
var intensiveStudioLink = listeningViewMode === 'intensive' 
  ? '<a class="tb-btn" href="http://localhost:5173/?audio=../data/textbook/' + (curBook && curBook.dir || 'listening_speaking') + '/' + (data.media && data.media.file || '') + '&transcript=ch' + String(curCh).padStart(4, '0') + '" target="_blank" rel="noopener">🎧 打开精听工作站</a>'
  : '';
```

如果 immersion-study-space 未运行，可先跳过此增强。

- [ ] **Step 3: 运行现有测试**

```bash
node tests/russian-b2/reader-static.test.js
```

确认所有已有测试通过。

- [ ] **Step 4: Commit**

```bash
git add reader.html
git commit -m "feat: Phase 5 — add intensive listening studio link"
```

---

## 验收清单（全部完成后）

- [ ] whisper 生成了 63+ 个 JSON 时间戳文件
- [ ] 书架显示 "В мире людей — 听力口语"
- [ ] 点击章节 → 音频播放器 + 5 道选择题
- [ ] 考试模式：听音做题，答后查看答案
- [ ] 精听模式：逐句文字稿 + 词可点击查词
- [ ] 前 65 个 mp3 完美对应
- [ ] 不破坏 B2 听力模块
- [ ] 不破坏其他已接入的书籍
- [ ] 所有 node tests 通过
