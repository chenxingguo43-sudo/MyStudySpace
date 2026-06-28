# 背单词工具调度算法改造计划书

日期：2026-06-01

## 目标

当前背单词工具的核心问题是：用户点击“不认识 / 模糊 / 认识”后，系统都会立即跳到下一张，并且主要只是更新掌握状态。这不符合真实背单词软件的学习逻辑。

本次改造目标是把它升级为：

1. 当场学习时，不认识的词会在几张卡后重新出现，直到真正按“认识”才算本轮通过。
2. 长期复习时，已经通过的词按照间隔复习算法安排明天、后天或更久之后再出现。
3. 统计面板能显示今日学习负担、回炉词、困难词、明日预计复习量。
4. 保持当前单页应用复杂度可控，不直接引入完整 FSRS。

## 参考资料

- Anki Manual: Deck Options, learning steps, relearning steps, graduating interval, FSRS desired retention  
  https://docs.ankiweb.net/deck-options.html
- Anki Manual: Studying, Again / Hard / Good / Easy 学习按钮逻辑  
  https://docs.ankiweb.net/studying.html
- SuperMemo SM-2 Algorithm: easiness factor, repetition quality, interval scheduling  
  https://www.super-memory.com/english/ol/sm2.htm
- FSRS Algorithm: difficulty, stability, retrievability, desired retention  
  https://github.com/open-spaced-repetition/fsrs4anki/wiki/The-Algorithm
- ts-fsrs: JavaScript / TypeScript FSRS scheduler implementation  
  https://open-spaced-repetition.github.io/ts-fsrs/
- Cepeda et al. spacing effect research summary  
  https://pubmed.ncbi.nlm.nih.gov/19076480/

## 总体策略

不建议当前版本直接实现完整 FSRS。

推荐方案是：

1. 当日学习层：实现 Anki 式 learning queue，也就是“回炉队列”。
2. 长期复习层：保留当前 SM-2 风格的 interval / easeFactor / nextReview 字段。
3. 数据结构提前兼容 FSRS，后续如果需要，可以平滑迁移到 difficulty / stability / retrievability 模型。

这样做的好处是：

- 立刻解决“不认识也跳过”的体验问题。
- 不需要重写整个 `vocabulary.html`。
- 不破坏已有 localStorage 数据。
- 后续仍然可以升级到 FSRS 或接入 `ts-fsrs`。

## 当前问题

当前逻辑大致是：

```js
rate(score) {
  saveRecord(w.id, score);
  currentPos++;
  renderCard();
}
```

这会导致：

1. 正面时按左 / 下 / 右会直接评分，而不是先翻面。
2. “不认识”也会进入下一张，用户没有被迫重新回忆。
3. “模糊”和“认识”的差异主要体现在长期 interval 上，当场学习体验差异不足。
4. 统计里的“掌握”容易虚高。

## 新交互规则

### 正面状态

卡片正面只显示俄语词或题目。

按键规则：

- 空格：翻到背面。
- 左：翻到背面，不评分。
- 下：翻到背面，不评分。
- 右：翻到背面，不评分。

原因：用户必须先看到答案后，才能判断自己是否真正认识。

### 背面状态

卡片背面显示中文释义、例句、extra 信息。

按键规则：

- 左：不认识，加入回炉队列。
- 下：模糊，加入稍后回炉队列。
- 右：认识，本轮通过，安排长期复习。

按钮文案建议：

```text
不认识
2-4 张后再来

模糊
5-8 张后再来

认识
本轮通过
```

## 当日学习队列算法

新增 session 层状态。它只管理当前学习会话，不直接等同于长期复习记录。

```js
sessionState = {
  queue: [],
  delayed: [],
  passed: [],
  seenCount: 0,
  stats: {
    know: 0,
    fuzzy: 0,
    dunno: 0,
    returned: 0,
    difficult: 0
  }
};
```

每张卡的当场状态：

```js
sessionCard = {
  id: string,
  state: 'new' | 'learning' | 'passed',
  failCount: 0,
  fuzzyCount: 0,
  goodStreak: 0,
  readyAfterSeen: 0,
  lastSessionRating: null
};
```

### 评分规则

#### 不认识

```text
failCount += 1
goodStreak = 0
state = learning
delay = min(2 + failCount, 6)
readyAfterSeen = seenCount + delay
不算通过
```

解释：

- 第一次不认识：约 3 张后回来。
- 第二次不认识：约 4 张后回来。
- 多次不认识：最多 6 张后回来，避免拖太久。

#### 模糊

```text
fuzzyCount += 1
goodStreak = 0
state = learning
delay = min(5 + fuzzyCount * 2, 12)
readyAfterSeen = seenCount + delay
不算完全通过
```

解释：

- 模糊比“不认识”间隔更长。
- 它代表用户有印象，但还没有稳定掌握。

#### 认识

```text
goodStreak += 1

如果 failCount > 0 或 fuzzyCount > 0：
  第一次认识只算确认
  6 张后再出现一次
  第二次认识才算本轮通过

如果 failCount === 0 且 fuzzyCount === 0：
  直接本轮通过
```

解释：

- 完全没错过的新词，按“认识”可以直接通过。
- 曾经点过“不认识 / 模糊”的词，需要至少一次二次确认。
- 这样可以防止用户刚看完答案后立刻点“认识”，造成虚假掌握。

### 取下一张卡

```text
1. 优先取 readyAfterSeen <= seenCount 的回炉卡。
2. 如果没有到期回炉卡，取主队列下一张。
3. 如果主队列空了，但还有未到时间的回炉卡，取最早的一张。
4. 如果两者都空，本轮结束。
```

可以给 delay 加轻微随机扰动：

```text
实际 delay = delay + random(-1, 1)
最低不能小于 2
```

这样可以避免用户机械记住卡片顺序。

## 长期复习算法

长期复习继续使用 SM-2 风格字段，不在这一版直接实现完整 FSRS。

推荐记录结构：

```js
record = {
  state: 'new' | 'learning' | 'review' | 'relearning',
  mastery: 1 | 3 | 5,
  interval: 0,
  easeFactor: 2.5,
  nextReview: null,
  reps: 0,
  lapses: 0,
  lastReview: null,
  firstSeen: null,
  history: []
};
```

### 新卡本轮通过

```text
interval = 1
nextReview = 明天
state = review
```

### 到期复习时按“认识”

```text
如果 interval <= 1：
  interval = 3
否则：
  interval = round(interval * easeFactor)

easeFactor 保持不变或 +0.05
nextReview = today + interval
```

### 到期复习时按“模糊”

```text
interval = max(1, round(interval * 1.2))
easeFactor = max(1.3, easeFactor - 0.1)
nextReview = today + interval
```

### 到期复习时按“不认识”

```text
state = relearning
lapses += 1
interval = 1
easeFactor = max(1.3, easeFactor - 0.2)
nextReview = 明天
同时进入当日回炉队列
```

## 一天刷 200 到 300 个名词的安排

如果用户一天想刷完 200 到 300 个名词，不建议做成一个超大连续 deck。

推荐做“分组冲刺模式”。

### Day 1

```text
总目标：300 个名词
分组：6 组，每组 50 个
每组内部使用回炉队列
```

每组规则：

- 认识：本轮通过，明天复习。
- 模糊：5 到 8 张后回炉。
- 不认识：2 到 4 张后回炉。
- 曾经错过的词，需要连续或二次确认“认识”后才通过。

每组结束显示：

```text
本组 50
通过 43
回炉后通过 6
仍困难 1
明日预计复习 +50
```

### Day 2

Day 2 的主要任务是复习 Day 1 的 300 个词。

```text
认识：3 天后再来
模糊：明天或后天再来
不认识：当天回炉，明天继续
```

如果 Day 1 学了 300 个新词，Day 2 的预计复习量大概率接近 300。这个数字应该明确显示给用户，不要隐藏。

### Day 3

Day 3 主要复习 Day 2 中“不认识 / 模糊”的词。

### Day 5 左右

Day 2 按“认识”的那批词会大规模回来。

因此需要新增“未来复习负担”统计，帮助用户决定今天是否还要继续加新词。

## 统计指标

新增统计建议：

```text
今日新学
今日复习
本轮已通过
回炉中
困难词
平均通过尝试次数
今日不认识率
今日模糊率
明日预计复习
未来 3 天预计复习
```

顶部统计条建议：

```text
本轮 18/50
已通过 12
回炉中 5
困难 1
明日预计 +12
```

结束页建议：

```text
本组完成
新学 50
通过 43
回炉后通过 6
仍困难 1
明日预计复习 +50
```

## UI 改造

卡片顶部新增状态 chip：

```text
新卡
回炉第 2 次
2 张后再来
明天复习
困难词
```

按钮区域保留三按钮，不增加复杂选择。

建议文案：

```text
不认识
2-4 张后再来

模糊
5-8 张后再来

认识
本轮通过
```

正面状态下按钮可以变成弱提示：

```text
先看答案
空格 / 任意方向键翻面
```

背面状态下再显示评分按钮。

## Claude 实施边界

请 Claude 遵守以下边界：

1. 不要重写整个 `vocabulary.html`。
2. 不要改 `data/vocabulary.json` 数据结构。
3. 保留已有 localStorage key。
4. 对旧记录做兼容迁移。
5. 新增独立 scheduler 函数，不要把所有逻辑继续塞进 `rate()`。
6. 保持现有筛选、收藏、跳过、导入导出、仪表盘同步功能可用。

建议新增函数：

```js
createSessionDeck()
getNextCard()
rateSessionCard(card, rating)
insertDelayed(card, delay, reason)
scheduleLongTerm(card, rating)
getProjectedDueCounts()
getSessionCardStatus(card)
```

## 验收标准

必须通过以下手测：

1. 正面按左 / 下 / 右，只翻面，不进入下一张。
2. 背面按“不认识”，当前卡不会被标记为掌握。
3. 背面按“不认识”，该卡会在 2 到 4 张后重新出现。
4. 背面按“模糊”，该卡会在 5 到 8 张后重新出现。
5. 曾经点过“不认识 / 模糊”的卡，第一次按“认识”不直接长期毕业，至少需要二次确认。
6. 从未错过的卡，按“认识”后本轮通过，并安排明天复习。
7. 本轮结束页能显示通过数、回炉数、困难数、明日预计复习数。
8. 今日新卡上限仍然有效。
9. 收藏、跳过、报错、筛选功能仍然可用。
10. 仪表盘同步仍然不会报错。

## 后续升级方向

等这一版稳定后，可以再考虑：

1. 接入 `ts-fsrs`，使用完整 FSRS scheduler。
2. 增加目标留存率设置，例如 85%、90%、93%。
3. 增加复习负担预测图。
4. 在 Obsidian 仪表盘里展示词汇学习曲线。
5. 增加“困难词自动导出到 Obsidian 笔记”的功能。

## 最终建议

这一版最重要的不是把算法做得最复杂，而是先把学习行为做对：

> 点“不认识”不等于过关。  
> 点“模糊”不等于掌握。  
> 只有真正再次回忆成功，才算本轮通过。

先实现当日回炉队列，再逐步优化长期复习算法。
