---
report: "卡片草稿合并分析"
date: "2026-06-21"
source: "卡片草稿/"
total_cards: 97
total_batches: 4
---

# 卡片草稿目录合并分析报告

## 1. 当前目录结构

```
卡片草稿/
├── card_generation_manifest_2026-06-20.json        (根级 manifest)
├── card_generation_manifest_2026-06-20.md           (根级 manifest 文档)
├── card_generation_manifest_full_2026-06-20.json    (全量 manifest)
│
├── agent_c_pilot_2026-06-20/          ← 第1批：初始试点 (8 张卡片)
│   ├── card_schema.md                 (schema 文档)
│   ├── card_generation_report.md      (生成报告)
│   ├── completion_report.md           (完成报告)
│   ├── article/     (1)
│   ├── vocabulary/  (4)
│   ├── theme/       (2)
│   └── task/        (1)
│
├── agent_c_pilot2_2026-06-20/         ← 第2批：试点改进版 (6 张卡片)
│   ├── card_schema_v2.md              (schema v2 文档)
│   ├── card_generation_report.md      (生成报告)
│   ├── completion_report.md           (完成报告)
│   ├── article/     (1)
│   ├── vocabulary/  (3)
│   ├── theme/       (1)
│   └── task/        (1)
│
├── manifest_batch_2026-06-20/         ← 第3批：manifest 驱动批量 (29 张卡片)
│   ├── Tier1 卡片索引.md
│   ├── Tier2 卡片索引.md
│   ├── completion_report.md
│   ├── manifest_batch_report.md
│   ├── skipped_items.md
│   ├── article/     (7)
│   ├── vocabulary/  (10)
│   ├── theme/       (8)
│   └── task/        (4)
│
└── full_batch_2026-06-20/             ← 第4批：全量生成 (54 张卡片)
    ├── Full 卡片索引.md
    ├── batch_report.md
    ├── completion_report.md
    ├── skipped_items.md
    ├── article/     (17)
    ├── vocabulary/  (25)
    ├── theme/       (6)
    └── task/        (6)
```

## 2. 每个批次的卡片清单

### 2.1 agent_c_pilot (初始试点) — 8 张

| 类型 | 文件名 | 词汇/主题 |
|------|--------|-----------|
| article | `vml-2-1-1-article-capital-project.md` | 新首都项目 |
| vocabulary | `vml-2-1-1-vocab-klaster.md` | кластер |
| vocabulary | `vml-2-1-1-vocab-nagruzka.md` | нагрузка |
| vocabulary | `vml-2-1-1-vocab-omolodit.md` | омолодить |
| vocabulary | `vml-2-1-1-vocab-perenos.md` | перенос |
| theme | `vml-2-1-1-theme-argument-map.md` | 论证地图 |
| theme | `vml-2-1-1-theme-location-criteria.md` | 选址标准 |
| task | `vml-2-1-1-task-evidence-scan.md` | 证据扫描 |

### 2.2 agent_c_pilot2 (试点改进版) — 6 张

| 类型 | 文件名 | 词汇/主题 |
|------|--------|-----------|
| article | `vml-2-1-1-article-capital-project.md` | 新首都项目 |
| vocabulary | `vml-2-1-1-vocab-klaster-real-zh.md` | кластер |
| vocabulary | `vml-2-1-1-vocab-nagruzka-real-zh.md` | нагрузка |
| vocabulary | `vml-2-1-1-vocab-omolodit-real-zh.md` | омолодить |
| theme | `vml-2-1-1-theme-argument-map-real-zh.md` | 论证地图 |
| task | `vml-2-1-1-task-evidence-scan-real-zh.md` | 证据扫描 |

> 注：pilot2 的卡片带 `-real-zh` 后缀，表示使用了真实中文翻译（而非 placeholder）。相比 pilot1 缺少 `vocab-perenos` 和 `theme-location-criteria`。

### 2.3 manifest_batch (manifest 批量) — 29 张

| 类型 | 文件名 | 词汇/主题 |
|------|--------|-----------|
| article | `vml-1-1-1-article-murom.md` | 穆罗姆 |
| article | `vml-1-1-2-article-stolby.md` | 石柱 |
| article | `vml-1-4-1-article-baikonur.md` | 拜科努尔 |
| article | `vml-1-4-2-article-head-transplant.md` | 头颅移植 |
| article | `vml-2-1-1-article-new-capital.md` | 新首都 |
| article | `vml-3-beginning-article-literary-reading.md` | 文学阅读 |
| article | `vml-3-ending-article-literary-reading.md` | 文学阅读(结尾) |
| vocabulary | `vml-1-1-2-vocab-zapovednik.md` | заповедник |
| vocabulary | `vml-1-4-1-vocab-raketostroenie.md` | ракетостроение |
| vocabulary | `vml-1-4-1-vocab-vzaimodeistvovat.md` | взаимодействовать |
| vocabulary | `vml-1-4-2-vocab-belletristika.md` | беллетристика |
| vocabulary | `vml-2-1-1-vocab-klaster.md` | кластер |
| vocabulary | `vml-2-1-1-vocab-nagruzka.md` | нагрузка |
| vocabulary | `vml-3-beginning-vocab-most.md` | мост |
| vocabulary | `vml-3-beginning-vocab-provintsial.md` | провинциал |
| vocabulary | `vml-3-ending-vocab-neobkhodimost.md` | необходимость |
| vocabulary | `vml-3-ending-vocab-svyazi.md` | связи |
| theme | `vml-1-1-1-theme-city-memory.md` | 城市记忆 |
| theme | `vml-1-1-2-theme-nature-identity.md` | 自然与身份 |
| theme | `vml-1-4-1-theme-team-engineering.md` | 团队工程 |
| theme | `vml-1-4-2-theme-science-boundaries.md` | 科学边界 |
| theme | `vml-2-1-1-theme-capital-as-argument.md` | 首都作为论据 |
| theme | `vml-3-beginning-theme-dream-image.md` | 梦境意象 |
| theme | `vml-3-beginning-theme-east-west-bridge.md` | 东西方桥梁 |
| theme | `vml-3-ending-theme-freedom.md` | 自由 |
| task | `vml-2-1-1-task-evidence-first-answer.md` | 证据优先答题 |
| task | `vml-3-beginning-task-literary-speaking.md` | 文学口语 |
| task | `vml-3-ending-task-abstract-noun-discussion.md` | 抽象名词讨论 |
| task | `vml-3-ending-task-heritage-reading.md` | 遗产阅读 |

### 2.4 full_batch (全量生成) — 54 张

| 类型 | 文件名 | 词汇/主题 |
|------|--------|-----------|
| article | `vml-1-2-1-article-igrushki.md` | 玩具 |
| article | `vml-1-2-2-article-golos-kamnya.md` | 石头之声 |
| article | `vml-1-3-1-article-milosti-ne-prosim.md` | 不乞求怜悯 |
| article | `vml-1-3-2-article-feministka.md` | 女权主义者 |
| article | `vml-1-5-1-article-tsvetaev-museum.md` | 茨维塔耶夫博物馆 |
| article | `vml-1-5-2-article-shah-diamond.md` | 沙赫钻石 |
| article | `vml-2-1-2-article-otchet-museum.md` | 博物馆报告 |
| article | `vml-2-2-1-article-prom-tourism.md` | 工业旅游 |
| article | `vml-2-2-2-article-delovye-dokumenty.md` | 商务文件 |
| article | `vml-2-3-1-article-sport-golos.md` | 体育好声音 |
| article | `vml-2-4-1-article-zveryo-v-kosmose.md` | 太空动物 |
| article | `vml-2-5-1-article-marafon-chtenia.md` | 阅读马拉松 |
| article | `vml-3-2-1-article-vstrecha.md` | 相遇 |
| article | `vml-3-2-2-article-avtobiografia.md` | 自传 |
| article | `vml-3-3-1-article-alye-parusa.md` | 红帆 |
| article | `vml-3-4-1-article-popytka-k-begstvu.md` | 逃跑尝试 |
| article | `vml-3-4-2-article-lavr.md` | 拉夫尔 |
| vocabulary | `vml-1-2-1-vocab-istoskovatsya.md` | истосковаться |
| vocabulary | `vml-1-2-1-vocab-na-podyome.md` | на подъёме |
| vocabulary | `vml-1-2-2-vocab-agalmatolit.md` | агальматолит |
| vocabulary | `vml-1-2-2-vocab-arzylan.md` | арзылан |
| vocabulary | `vml-1-3-1-vocab-porochny-krug.md` | порочный круг |
| vocabulary | `vml-1-3-1-vocab-sotsialny-lift.md` | социальный лифт |
| vocabulary | `vml-1-3-2-vocab-derzost.md` | дерзость |
| vocabulary | `vml-1-3-2-vocab-ne-ustupat.md` | не уступать |
| vocabulary | `vml-1-5-1-vocab-detishche.md` | детище |
| vocabulary | `vml-1-5-2-vocab-umilostivit.md` | умилостивить |
| vocabulary | `vml-2-1-2-vocab-ekskursia-sovershit.md` | совершить экскурсию |
| vocabulary | `vml-2-2-1-vocab-prom-turizm.md` | промышленный туризм |
| vocabulary | `vml-2-2-2-vocab-dokladnaya-zapiska.md` | докладная записка |
| vocabulary | `vml-2-3-1-vocab-zakhvatit-dukh.md` | захватить дух |
| vocabulary | `vml-2-4-1-vocab-nevredimy.md` | невредимый |
| vocabulary | `vml-2-test-vocab-blizhayshy.md` | ближайший |
| vocabulary | `vml-2-test-vocab-dostoyanie.md` | достояние |
| vocabulary | `vml-2-test-vocab-khranenie.md` | сохранение |
| vocabulary | `vml-2-test-vocab-nagruzka.md` | нагрузка (测试语境) |
| vocabulary | `vml-3-3-1-vocab-alye-parusa.md` | алый |
| vocabulary | `vml-3-4-1-vocab-osoznannaya-neobkhodimost.md` | осознанная необходимость |
| vocabulary | `vml-3-4-2-vocab-zhitie.md` | житие |
| vocabulary | `vml-3-keys-vocab-provintsial.md` | провинциал (答案) |
| vocabulary | `vml-3-keys-vocab-sinonimy.md` | синонимы |
| vocabulary | `vml-3-keys-vocab-toch-v-toch.md` | точь-в-точь |
| theme | `vml-1-2-1-theme-nostalgia-market.md` | 怀旧经济 |
| theme | `vml-1-2-2-theme-folk-art-identity.md` | 民间手工艺身份 |
| theme | `vml-1-3-1-theme-social-mobility.md` | 社会流动性 |
| theme | `vml-2-2-1-theme-industrial-tourism.md` | 工业旅游 |
| theme | `vml-2-sec2-theme-reading-types.md` | 阅读类型 |
| theme | `vml-3-beginning-theme-literary-reading-types.md` | 文学阅读类型 |
| task | `vml-1-2-1-task-vocab-activation.md` | 词汇激活 |
| task | `vml-1-2-2-task-comprehension-strategy.md` | 理解策略 |
| task | `vml-2-sec2-task-search-reading.md` | 搜索阅读 |
| task | `vml-2-test-task-frame.md` | 测试框架 |
| task | `vml-2-test-task-sinonimy.md` | 同义结构 |
| task | `vml-3-keys-task-test-frame.md` | 答案测试框架 |

## 3. 重复卡片清单

### 3.1 文件名完全重复 (exact duplicates)

以下卡片在多个批次中以**相同文件名**出现：

| 卡片 ID | 出现批次 | 保留建议 |
|---------|---------|---------|
| `vml-2-1-1-article-capital-project` | pilot, pilot2 | **pilot2** (有真实翻译) |
| `vml-2-1-1-vocab-klaster` | pilot, manifest | **manifest** (更新格式) |
| `vml-2-1-1-vocab-nagruzka` | pilot, manifest | **manifest** (更新格式) |
| `vml-2-1-1-vocab-omolodit` | pilot, pilot2(-real-zh) | **pilot2** (有真实翻译) |

### 3.2 同一词汇、不同来源 (context duplicates)

以下词汇在不同源文本中出现，属于**不同语境下的同一词条**，建议合并为一张卡片并注明多来源：

| 词汇 | 卡片 A | 卡片 B | 建议 |
|------|--------|--------|------|
| нагрузка | `manifest_batch/vocab/vml-2-1-1-vocab-nagruzka` (来源: 2.1.1 新首都) | `full_batch/vocab/vml-2-test-vocab-nagruzka` (来源: 2-тест 测试题) | 保留 manifest 版本，测试版作为补充例句合入 |
| провинциал | `manifest_batch/vocab/vml-3-beginning-vocab-provintsial` (来源: 3.1.2) | `full_batch/vocab/vml-3-keys-vocab-provintsial` (来源: 3-ключи 答案) | 两个来源不同，保留两张但标注区别 |

### 3.3 同一主题、不同卡片名 (semantic duplicates)

以下卡片覆盖**同一源文本**但使用了不同的卡片名：

| 源文本 | 卡片 A (pilot) | 卡片 B (manifest) | 建议 |
|--------|---------------|-------------------|------|
| 2.1.1 新首都 | `vml-2-1-1-article-capital-project` | `vml-2-1-1-article-new-capital` | 保留 **manifest** 版本 (更新格式+翻译) |
| 2.1.1 论证 | `vml-2-1-1-theme-argument-map` (pilot) | `vml-2-1-1-theme-capital-as-argument` (manifest) | 保留 **manifest** 版本 |
| 2.1.1 证据 | `vml-2-1-1-task-evidence-scan` (pilot/pilot2) | `vml-2-1-1-task-evidence-first-answer` (manifest) | 保留 **manifest** 版本 |

### 3.4 试点独有卡片 (无重复，直接保留)

以下卡片仅在 pilot 批次中存在，无重复：

| 批次 | 卡片 | 说明 |
|------|------|------|
| pilot | `vml-2-1-1-vocab-perenos.md` | перенос (仅 pilot 有) |
| pilot | `vml-2-1-1-theme-location-criteria.md` | 选址标准 (仅 pilot 有) |

## 4. 建议的合并后目录结构

```
卡片草稿/
├── _archive/                              ← 归档旧批次
│   ├── agent_c_pilot_2026-06-20/
│   ├── agent_c_pilot2_2026-06-20/
│   ├── manifest_batch_2026-06-20/
│   └── full_batch_2026-06-20/
│
├── _meta/                                 ← 元数据与报告
│   ├── card_generation_manifest_2026-06-20.json
│   ├── card_generation_manifest_2026-06-20.md
│   ├── card_generation_manifest_full_2026-06-20.json
│   ├── card_schema.md                     (最新版 schema)
│   └── reports/
│       ├── agent_c_pilot_report.md
│       ├── agent_c_pilot2_report.md
│       ├── manifest_batch_report.md
│       └── full_batch_report.md
│
├── 文章卡/                                ← 17 unique articles
│   ├── vml-1-1-1-article-murom.md              (manifest)
│   ├── vml-1-1-2-article-stolby.md             (manifest)
│   ├── vml-1-2-1-article-igrushki.md           (full)
│   ├── vml-1-2-2-article-golos-kamnya.md       (full)
│   ├── vml-1-3-1-article-milosti-ne-prosim.md  (full)
│   ├── vml-1-3-2-article-feministka.md         (full)
│   ├── vml-1-4-1-article-baikonur.md           (manifest)
│   ├── vml-1-4-2-article-head-transplant.md    (manifest)
│   ├── vml-1-5-1-article-tsvetaev-museum.md    (full)
│   ├── vml-1-5-2-article-shah-diamond.md       (full)
│   ├── vml-2-1-1-article-new-capital.md        (manifest, 覆盖 pilot 的 capital-project)
│   ├── vml-2-1-2-article-otchet-museum.md      (full)
│   ├── vml-2-2-1-article-prom-tourism.md       (full)
│   ├── vml-2-2-2-article-delovye-dokumenty.md  (full)
│   ├── vml-2-3-1-article-sport-golos.md        (full)
│   ├── vml-2-4-1-article-zveryo-v-kosmose.md   (full)
│   ├── vml-2-5-1-article-marafon-chtenia.md    (full)
│   ├── vml-3-2-1-article-vstrecha.md           (full)
│   ├── vml-3-2-2-article-avtobiografia.md      (full)
│   ├── vml-3-3-1-article-alye-parusa.md        (full)
│   ├── vml-3-4-1-article-popytka-k-begstvu.md  (full)
│   ├── vml-3-4-2-article-lavr.md               (full)
│   ├── vml-3-beginning-article-literary-reading.md  (manifest)
│   └── vml-3-ending-article-literary-reading.md     (manifest)
│
├── 词汇卡/                                ← 40 unique vocabulary
│   ├── vml-1-1-2-vocab-zapovednik.md           (manifest)
│   ├── vml-1-2-1-vocab-istoskovatsya.md        (full)
│   ├── vml-1-2-1-vocab-na-podyome.md           (full)
│   ├── vml-1-2-2-vocab-agalmatolit.md          (full)
│   ├── vml-1-2-2-vocab-arzylan.md              (full)
│   ├── vml-1-3-1-vocab-porochny-krug.md        (full)
│   ├── vml-1-3-1-vocab-sotsialny-lift.md       (full)
│   ├── vml-1-3-2-vocab-derzost.md              (full)
│   ├── vml-1-3-2-vocab-ne-ustupat.md           (full)
│   ├── vml-1-4-1-vocab-raketostroenie.md       (manifest)
│   ├── vml-1-4-1-vocab-vzaimodeistvovat.md     (manifest)
│   ├── vml-1-4-2-vocab-belletristika.md        (manifest)
│   ├── vml-1-5-1-vocab-detishche.md            (full)
│   ├── vml-1-5-2-vocab-umilostivit.md          (full)
│   ├── vml-2-1-1-vocab-klaster.md              (manifest, 覆盖 pilot)
│   ├── vml-2-1-1-vocab-nagruzka.md             (manifest, 覆盖 pilot)
│   ├── vml-2-1-1-vocab-perenos.md              (pilot, 独有)
│   ├── vml-2-1-1-vocab-omolodit.md             (pilot2-real-zh, 有真实翻译)
│   ├── vml-2-1-2-vocab-ekskursia-sovershit.md  (full)
│   ├── vml-2-2-1-vocab-prom-turizm.md          (full)
│   ├── vml-2-2-2-vocab-dokladnaya-zapiska.md   (full)
│   ├── vml-2-3-1-vocab-zakhvatit-dukh.md       (full)
│   ├── vml-2-4-1-vocab-nevredimy.md            (full)
│   ├── vml-2-test-vocab-blizhayshy.md          (full)
│   ├── vml-2-test-vocab-dostoyanie.md          (full)
│   ├── vml-2-test-vocab-khranenie.md           (full)
│   ├── vml-2-test-vocab-nagruzka.md            (full, 测试语境版本)
│   ├── vml-3-3-1-vocab-alye-parusa.md          (full)
│   ├── vml-3-4-1-vocab-osoznannaya-neobkhodimost.md (full)
│   ├── vml-3-4-2-vocab-zhitie.md               (full)
│   ├── vml-3-beginning-vocab-most.md           (manifest)
│   ├── vml-3-beginning-vocab-provintsial.md    (manifest)
│   ├── vml-3-ending-vocab-neobkhodimost.md     (manifest)
│   ├── vml-3-ending-vocab-svyazi.md            (manifest)
│   ├── vml-3-keys-vocab-provintsial.md         (full, 答案语境)
│   ├── vml-3-keys-vocab-sinonimy.md            (full)
│   └── vml-3-keys-vocab-toch-v-toch.md         (full)
│
├── 主题卡/                                ← 18 unique themes
│   ├── vml-1-1-1-theme-city-memory.md          (manifest)
│   ├── vml-1-1-2-theme-nature-identity.md      (manifest)
│   ├── vml-1-2-1-theme-nostalgia-market.md     (full)
│   ├── vml-1-2-2-theme-folk-art-identity.md    (full)
│   ├── vml-1-3-1-theme-social-mobility.md      (full)
│   ├── vml-1-4-1-theme-team-engineering.md     (manifest)
│   ├── vml-1-4-2-theme-science-boundaries.md   (manifest)
│   ├── vml-2-1-1-theme-capital-as-argument.md  (manifest, 覆盖 pilot 的 argument-map)
│   ├── vml-2-1-1-theme-location-criteria.md    (pilot, 独有)
│   ├── vml-2-2-1-theme-industrial-tourism.md   (full)
│   ├── vml-2-sec2-theme-reading-types.md       (full)
│   ├── vml-3-beginning-theme-dream-image.md    (manifest)
│   ├── vml-3-beginning-theme-east-west-bridge.md (manifest)
│   ├── vml-3-beginning-theme-literary-reading-types.md (full)
│   ├── vml-3-ending-theme-freedom.md           (manifest)
│   └── ...
│
├── 任务卡/                                ← 13 unique tasks
│   ├── vml-1-2-1-task-vocab-activation.md      (full)
│   ├── vml-1-2-2-task-comprehension-strategy.md (full)
│   ├── vml-2-1-1-task-evidence-first-answer.md (manifest, 覆盖 pilot 的 evidence-scan)
│   ├── vml-2-sec2-task-search-reading.md       (full)
│   ├── vml-2-test-task-frame.md                (full)
│   ├── vml-2-test-task-sinonimy.md             (full)
│   ├── vml-3-beginning-task-literary-speaking.md (manifest)
│   ├── vml-3-ending-task-abstract-noun-discussion.md (manifest)
│   ├── vml-3-ending-task-heritage-reading.md   (manifest)
│   └── vml-3-keys-task-test-frame.md           (full)
│
└── 索引/                                  ← 合并后的索引
    ├── Tier1 卡片索引.md
    ├── Tier2 卡片索引.md
    └── 全量卡片索引.md
```

## 5. 需要更新的 Wikilinks 清单

合并后，所有卡片的 wikilinks 中引用的文件名不变（因为保留的文件名不变）。但以下情况需要处理：

### 5.1 被覆盖卡片的 wikilinks 引用

以下旧文件名在合并后不再存在，需要将引用它们的 wikilinks 更新为新文件名：

| 旧文件名 (被覆盖) | 新文件名 (保留) | 引用方 |
|-------------------|----------------|--------|
| `vml-2-1-1-article-capital-project` | `vml-2-1-1-article-new-capital` | pilot/article, pilot2/article, pilot/theme(2), pilot/task |
| `vml-2-1-1-theme-argument-map` | `vml-2-1-1-theme-capital-as-argument` | pilot/article, pilot2/theme |
| `vml-2-1-1-task-evidence-scan` | `vml-2-1-1-task-evidence-first-answer` | pilot/article, pilot2/task |

### 5.2 索引文件中的 wikilinks

索引文件 (`Tier1 卡片索引.md`, `Tier2 卡片索引.md`, `Full 卡片索引.md`) 中的 wikilinks 指向的文件名在合并后仍然有效（因为保留的文件来自 manifest_batch 和 full_batch，索引也是这两个批次生成的）。

### 5.3 跨卡片引用的 wikilinks

所有卡片中的 `[[vml-...]]` 引用在合并后**无需修改**，因为：
- 被引用的卡片文件名保持不变
- 引用方的文件名保持不变
- 唯一需要处理的是 pilot 批次中引用 `capital-project`、`argument-map`、`evidence-scan` 的 wikilinks

### 5.4 索引引用的特殊 wikilinks

| 引用 | 出现位置 | 处理方式 |
|------|---------|---------|
| `[[Full 卡片索引\|📋 返回索引]]` | full_batch 的 54 张卡片 | 合并后改为 `[[全量卡片索引\|📋 返回索引]]` |
| `[[Tier1 卡片索引\|📋 返回索引]]` | manifest_batch 的 29 张卡片 | 合并后改为 `[[全量卡片索引\|📋 返回索引]]` |
| `[[Tier2 卡片索引\|📋 Tier2 索引]]` | manifest_batch 部分卡片 | 合并后改为 `[[全量卡片索引\|📋 返回索引]]` |
| `[[card_generation_manifest_2026-06-20\|卡片生成 Manifest]]` | manifest_batch 卡片 | 合并后改为 `_meta/` 路径或移除 |

## 6. 合并执行步骤 (待确认)

1. **创建归档目录** `_archive/`，将 4 个批次目录移入
2. **创建元数据目录** `_meta/`，移入 manifest 文件和报告
3. **按类型创建目录**：`文章卡/`, `词汇卡/`, `主题卡/`, `任务卡/`, `索引/`
4. **移动卡片**：按第 4 节的映射表，将保留版本移入对应类型目录
5. **重命名 pilot2 独有文件**：`vml-2-1-1-vocab-omolodit-real-zh.md` → `vml-2-1-1-vocab-omolodit.md`
6. **更新 wikilinks**：按第 5 节的清单批量替换
7. **合并索引**：将 Tier1/Tier2/Full 索引合并为统一的 `全量卡片索引.md`

## 7. 统计摘要

| 指标 | 数量 |
|------|------|
| 批次总数 | 4 |
| 卡片总数 (含重复) | 97 |
| 去重后唯一卡片数 | ~85 |
| 文件名精确重复 | 6 组 (涉及 4 张卡片) |
| 语义重复 (同源不同名) | 3 组 |
| 试点独有卡片 | 2 张 |
| 需更新 wikilinks 的文件 | ~10 个 |
