# 俄语 B2 全模块阅读器完整整理 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 覆盖原 PDF 全部 190 页，先完成 P1–P6 其余 31 张丰富语法知识卡和 P6 全部 50 题，再完成阅读、写作、会话、听力、真题、复习、同步与完整模拟并合并主项目。

**Architecture:** 保留 `reader.html` 作为统一入口，把新增模块放在 `js/russian-b2/` 下，通过 `window.RussianB2App` 注册模块适配器。规范数据保存在 `俄语资料库/俄语B2·原书复刻与学习版/规范数据/`，构建器生成 `data/textbook/russian_b2/` 的可发布文件；共享存储、复习、同步和 AI 走稳定 ID，不依赖章节下标。

**Tech Stack:** 原生 HTML/CSS/JavaScript、Node.js CommonJS、`node:test`、现有静态服务器、浏览器 `localStorage`/IndexedDB、GitHub Gist、`edge-tts` 7.2.8、可选 OpenAI Responses/Transcription API。

## Global Constraints

- 原 PDF 为 190 页；最终逐页台账必须达到 190/190 有状态、有映射或有明确处置原因。
- P1–P6 共 32 张知识卡；`p2-time-cause` 已完成，其余 31 张必须达到相同内容与交互标准。
- P6 必须从当前 18 道独立题恢复为 50/50；9–26、37–50 必须保留原材料上下文。
- 语法书规则、B2 原书考点、学习讲解和补充例句必须使用不同来源标签。
- `reviewStatus !== "approved"` 的丰富知识卡不得构建到正式数据。
- 不在知识卡中复制原题答案或逐题解析。
- 阅读、写作、会话、听力和真题保持原书顺序，同时允许按题型或主题导航。
- 缺失原音视频时使用明确标注的重建媒体，不得冒充原配媒体。
- 除 AI 和 Gist 外，教材、TTS、做题、草稿、录音与本地进度可离线使用。
- OpenAI 密钥只从服务端 `OPENAI_API_KEY` 读取；不得进入浏览器、导出文件或 Git。
- 不修改或提交 `cloudsync-config.js`；提交前逐次检查暂存列表。
- 每个任务使用 TDD：先失败、再最小实现、再完整回归、再提交。

---

## Planned File Boundaries

- `scripts/russian-b2/lib/full-book-contracts.js`：整书 manifest、单元、页码台账和来源状态校验。
- `scripts/russian-b2/build-full-book.js`：唯一总构建入口，按模块调用子构建器并写发布清单。
- `scripts/russian-b2/build-study-cards.js`：从卡片索引构建全部 `approved` 知识卡。
- `scripts/russian-b2/build-p6-context.js`：恢复 P6 上下文题组。
- `scripts/russian-b2/build-reading.js`、`build-writing.js`、`build-speaking.js`、`build-listening.js`、`build-exam.js`：模块规范数据到阅读器数据的单向构建器。
- `js/russian-b2/core.js`：模块注册、稳定存储、IndexedDB 大文件、导入导出和降级状态。
- `js/russian-b2/grammar.js`、`reading.js`、`writing.js`、`speaking.js`、`listening.js`、`exam.js`、`dashboard.js`：模块专用交互。
- `server/russian-b2-ai.js`：写作反馈、口语反馈和转写的服务端适配器。
- `server/russian-b2-sync.js`：Gist 同步、冲突合并和密钥隔离。
- `data/textbook/russian_b2/book.json`：生成后的整书模块清单。
- `data/textbook/russian_b2/modules/<module>/`：各模块发布数据。
- `data/textbook/russian_b2/study-cards/index.json`：32 张知识卡发布索引。
- `俄语资料库/俄语B2·原书复刻与学习版/规范数据/全书覆盖/pdf-page-ledger.json`：190 页来源台账。

---

### Task 1: 固定基线并建立整书契约

**Files:**
- Create: `scripts/russian-b2/lib/full-book-contracts.js`
- Create: `scripts/russian-b2/build-full-book.js`
- Create: `tests/russian-b2/full-book-contracts.test.js`
- Create: `俄语资料库/俄语B2·原书复刻与学习版/规范数据/全书覆盖/pdf-page-ledger.json`
- Create: `俄语资料库/俄语B2·原书复刻与学习版/规范数据/full-book-manifest.json`
- Modify: `package.json`

**Interfaces:**
- Produces: `validateFullBookManifest(manifest): string[]`
- Produces: `validatePageLedger(ledger, { strict }): string[]`
- Produces: `assertStableIds(items, kind): string[]`

- [ ] **Step 1: 记录工作区归属与新鲜基线**

Run:

```powershell
git status --short --branch
npm run test:russian-b2
```

Expected: 记录现有非本目标改动；B2 测试退出码为 0。若测试失败，先记录为基线问题，不把失败归因于新任务。

- [ ] **Step 2: 写失败的 190 页契约测试**

```js
test('full book ledger accounts for PDF pages 1 through 190', () => {
  const pages = ledger.pages.map(item => item.pdfPage);
  assert.deepEqual(pages, Array.from({ length: 190 }, (_, i) => i + 1));
  assert.deepEqual(validatePageLedger(ledger, { strict: false }), []);
});
```

Run: `node --test tests/russian-b2/full-book-contracts.test.js`
Expected: FAIL，提示模块或 `validatePageLedger` 不存在。

- [ ] **Step 3: 实现最小契约**

```js
const PAGE_STATES = new Set(['unmapped', 'mapped', 'reconstructed-media', 'excluded-with-reason']);
function validatePageLedger(ledger, { strict = false } = {}) {
  const errors = [];
  const expected = Array.from({ length: 190 }, (_, i) => i + 1);
  if (JSON.stringify(ledger.pages.map(p => p.pdfPage)) !== JSON.stringify(expected)) errors.push('ledger must cover PDF pages 1-190 exactly once');
  ledger.pages.forEach(page => {
    if (!PAGE_STATES.has(page.status)) errors.push(`PDF-${page.pdfPage}: invalid status`);
    if (strict && page.status === 'unmapped') errors.push(`PDF-${page.pdfPage}: remains unmapped`);
    if (page.status === 'excluded-with-reason' && !page.reason) errors.push(`PDF-${page.pdfPage}: exclusion reason required`);
  });
  return errors;
}
```

生成 1–190 的初始台账，状态为 `unmapped`；这不是发布通过状态，最终严格校验会拒绝它。

- [ ] **Step 4: 增加总验证命令**

在 `package.json` 增加：

```json
"verify:russian-b2": "node scripts/russian-b2/build-full-book.js --check && npm run test:russian-b2"
```

此时 `build-full-book.js` 只调用契约校验并在缺少构建器时返回清楚错误。

```js
function buildFullBook({ root, write = false, strict = false }) {
  const manifest = readJson(path.join(root, ...MANIFEST_PATH));
  const ledger = readJson(path.join(root, ...LEDGER_PATH));
  const errors = [...validateFullBookManifest(manifest), ...validatePageLedger(ledger, { strict })];
  if (errors.length) throw new Error(errors.join('\n'));
  return { manifest, ledger, modules: [] };
}
```

- [ ] **Step 5: 验证并提交**

Run: `node --test tests/russian-b2/full-book-contracts.test.js`
Expected: PASS。

Commit:

```powershell
git add package.json scripts/russian-b2/build-full-book.js scripts/russian-b2/lib/full-book-contracts.js tests/russian-b2/full-book-contracts.test.js "俄语资料库/俄语B2·原书复刻与学习版/规范数据/全书覆盖/pdf-page-ledger.json" "俄语资料库/俄语B2·原书复刻与学习版/规范数据/full-book-manifest.json"
git commit -m "test: define full B2 book contracts"
```

### Task 2: 去除 P2 知识卡硬编码并建立 32 卡索引

**Files:**
- Create: `俄语资料库/俄语B2·原书复刻与学习版/规范数据/语法书映射/index.json`
- Create: `data/textbook/russian_b2/study-cards/index.json`
- Modify: `scripts/russian-b2/lib/study-cards.js`
- Modify: `scripts/russian-b2/build-study-cards.js`
- Modify: `scripts/russian-b2/build-six-part-book.js`
- Modify: `reader.html`
- Modify: `tests/russian-b2/study-cards.test.js`
- Modify: `tests/russian-b2/reader-static.test.js`

**Interfaces:**
- Produces: `loadStudyCardIndex(root): StudyCardIndex`
- Produces: `buildStudyCards({ root, write }): { cards, outputPaths, indexPath }`
- Consumes: `knowledgePoint.studyCardId`

- [ ] **Step 1: 写失败测试，要求索引包含 32 个稳定 ID**

```js
assert.equal(index.cards.length, 32);
assert.equal(new Set(index.cards.map(card => card.id)).size, 32);
assert.equal(index.cards.find(card => card.knowledgePointId === 'p2-time-cause').status, 'approved');
```

同时将 `reader-static.test.js` 改为拒绝 `showStudyCard('p2','p2-time-cause')` 这类硬编码，并要求读取 `point.studyCardId`。

Run: `node --test tests/russian-b2/study-cards.test.js tests/russian-b2/reader-static.test.js`
Expected: FAIL，索引不存在且阅读器仍硬编码 P2。

- [ ] **Step 2: 写入 32 个知识点索引**

索引按 `part-study-navigation.json` 的顺序列出全部 ID；`p2-time-cause` 为 `approved`，其余为 `planned`。每项包含 `id`、`partId`、`knowledgePointId`、`source`、`status`。

- [ ] **Step 3: 泛化构建器**

```js
const approved = index.cards.filter(entry => entry.status === 'approved');
const cards = approved.map(entry => readJson(path.join(cardDir, entry.source)));
for (const card of cards) validateCardAgainstPart(card, parts, grammarRoot);
writeJson(outputIndex, { cards: cards.map(card => ({ id: card.id, partId: card.partId, knowledgePointId: card.knowledgePointId })) });
```

不要继续使用单一 `CARD_RELATIVE_PATH` 或固定读取 `08 前置词.md`；根据每个 source 的 `file` 加载所需语法书文件并缓存。

CLI 同时支持重复 `--part p1 --part p2` 和 `--check`；`--check` 调用 `write: false`，不得改生成文件。

- [ ] **Step 4: 泛化阅读器入口**

在六部分构建数据中给有卡片的知识点写入 `studyCardId`。`renderKnowledgePointNav()` 使用：

```js
if (point.studyCardId) {
  studyCards += renderStudyCardButton(partId, point.studyCardId, point);
}
```

删除对 `p2-time-cause` 的标题与 ID 判断。

- [ ] **Step 5: 验证并提交**

Run:

```powershell
npm run build:russian-b2-study-cards
node --test tests/russian-b2/study-cards.test.js tests/russian-b2/reader-static.test.js
npm run test:russian-b2
```

Expected: 所有命令退出 0，当前只发布已批准的 P2 样板，其他 31 项仍不显示按钮。

Commit: `git commit -m "refactor: generalize B2 study card registry"`

### Task 3: 完成 P1 六张丰富知识卡

**Files:**
- Create: `俄语资料库/俄语B2·原书复刻与学习版/规范数据/语法书映射/cards/p1-subject-predicate.json`
- Create: `俄语资料库/俄语B2·原书复刻与学习版/规范数据/语法书映射/cards/p1-perfective-once.json`
- Create: `俄语资料库/俄语B2·原书复刻与学习版/规范数据/语法书映射/cards/p1-imperfective-process.json`
- Create: `俄语资料库/俄语B2·原书复刻与学习版/规范数据/语法书映射/cards/p1-imperative-aspect.json`
- Create: `俄语资料库/俄语B2·原书复刻与学习版/规范数据/语法书映射/cards/p1-infinitive-negation.json`
- Create: `俄语资料库/俄语B2·原书复刻与学习版/规范数据/语法书映射/cards/p1-motion-return.json`
- Modify: `俄语资料库/俄语B2·原书复刻与学习版/规范数据/语法书映射/index.json`
- Create: `docs/superpowers/acceptance/2026-07-17-b2-rich-cards-p1.md`
- Test: `tests/russian-b2/study-cards.test.js`

**Interfaces:**
- Consumes: Task 2 的通用卡片索引与 `validateStudyCard()`。
- Produces: 六张 `reviewStatus: "approved"` 卡和六个阅读器入口。

- [ ] **Step 1: 为 P1 写覆盖失败测试**

```js
const p1Ids = ['p1-subject-predicate','p1-perfective-once','p1-imperfective-process','p1-imperative-aspect','p1-infinitive-negation','p1-motion-return'];
assert.deepEqual(cards.filter(c => c.partId === 'p1').map(c => c.id), p1Ids);
```

Run: `node --test tests/russian-b2/study-cards.test.js`
Expected: FAIL，P1 卡尚未批准。

- [ ] **Step 2: 逐卡建立来源证据**

每张卡从《新编俄语语法》具体文件/小节和对应 B2 原书题页建立来源。使用 P2 样板完整字段：`quickReference`、`lessons`、`relatedExtensions`、`checks`、`rules`、`examples`、`comparisons`、`pitfalls`、`sources`、`reviewStatus`。

- [ ] **Step 3: 完成内容五项审核**

逐条核对规则、形式变化、俄语例句、中文翻译和使用边界；运行：

```powershell
node scripts/russian-b2/build-study-cards.js --part p1 --check
```

Expected: 六张卡全部通过，任何 `pending-review`、缺来源或题号不匹配都会失败。

- [ ] **Step 4: 浏览器验收首、中、末三卡**

验收 `p1-subject-predicate`、`p1-imperative-aspect`、`p1-motion-return`：锚点、即时检查、综合自测、重复作答、原题入口和移动端无溢出。

- [ ] **Step 5: 写验收记录并提交**

Run: `npm run test:russian-b2`
Expected: exit 0。

Commit: `git commit -m "feat: publish rich P1 grammar cards"`

### Task 4: 完成 P2 剩余七张丰富知识卡

**Files:**
- Create seven files under `俄语资料库/俄语B2·原书复刻与学习版/规范数据/语法书映射/cards/` for:
  - `p2-adjective-case`
  - `p2-verb-case-1`
  - `p2-verb-case-2`
  - `p2-verb-objects`
  - `p2-lexical-phrases`
  - `p2-prepositional-phrases`
  - `p2-nonconcordant-attribute`
- Modify: `俄语资料库/俄语B2·原书复刻与学习版/规范数据/语法书映射/index.json`
- Create: `docs/superpowers/acceptance/2026-07-17-b2-rich-cards-p2.md`
- Test: `tests/russian-b2/study-cards.test.js`

**Interfaces:** Produces P2 的 8/8 丰富知识卡；保留现有 `p2-time-cause` 文件和掌握记录键。

- [ ] **Step 1: 写 P2 8/8 覆盖失败测试**

断言 P2 索引严格等于导航中的八个知识点 ID，并且所有卡 `reviewStatus === 'approved'`。

- [ ] **Step 2: 依据名词、形容词、动词支配与前置词章节编写七卡**

固定使用 P2 样板的一屏“上简下详”结构；单题知识点 `p2-nonconcordant-attribute` 仍须讲清规则、边界和迁移用法，但不得人为堆入无关语法。

- [ ] **Step 3: 运行内容和来源校验**

Run: `node scripts/russian-b2/build-study-cards.js --part p2 --check`
Expected: 八张卡通过；已完成样板内容哈希不发生无意变化。

- [ ] **Step 4: 验收支配格、固定搭配和单题卡三种密度**

检查桌面与 390px：长表格可读，来源折叠可打开，卡底练习范围准确。

- [ ] **Step 5: 提交**

Commit: `git commit -m "feat: complete rich P2 grammar cards"`

### Task 5: 完成 P3 与 P4 十张丰富知识卡

**Files:**
- Create under `俄语资料库/俄语B2·原书复刻与学习版/规范数据/语法书映射/cards/`:
  - P3: `p3-active-participles`、`p3-passive-participles`、`p3-gerund-meanings`、`p3-gerund-subject`
  - P4: `p4-connectors`、`p4-relative-pronouns`、`p4-time-concession-purpose`、`p4-gerund-infinitive-purpose`、`p4-cause-and-particles`、`p4-direct-indirect`
- Modify: card index
- Create: `docs/superpowers/acceptance/2026-07-17-b2-rich-cards-p3-p4.md`
- Test: `tests/russian-b2/study-cards.test.js`

**Interfaces:** Produces P3 4/4 与 P4 6/6 approved cards。

- [ ] **Step 1: 写 P3/P4 完整 ID 集合失败测试**
- [ ] **Step 2: 先完成 P3，重点核对形动词一致、副动词逻辑关系和共同主体限制**
- [ ] **Step 3: 再完成 P4，重点核对关系词格、从句逻辑和直接/间接引语转换**
- [ ] **Step 4: 运行 `node scripts/russian-b2/build-study-cards.js --part p3 --part p4 --check`**

Expected: 10 张卡来源、形式、即时检查和综合自测全部通过。

- [ ] **Step 5: 浏览器抽查每部分首末卡并提交**

Commit: `git commit -m "feat: publish rich P3 and P4 grammar cards"`

### Task 6: 完成 P5 与 P6 八张丰富知识卡并全量验收 32/32

**Files:**
- Create under `俄语资料库/俄语B2·原书复刻与学习版/规范数据/语法书映射/cards/`:
  - P5: `p5-derivation`、`p5-indefinite-pronouns`、`p5-prefix-verbs-1`、`p5-prefix-verbs-2`、`p5-impersonal-dative`、`p5-modal-infinitive`
  - P6: `p6-predicate-case`、`p6-journalistic-collocations`
- Modify: card index
- Create: `docs/superpowers/acceptance/2026-07-17-b2-rich-cards-p5-p6.md`
- Create: `docs/superpowers/acceptance/2026-07-17-b2-rich-cards-all.md`
- Test: `tests/russian-b2/study-cards.test.js`

**Interfaces:** Produces 32/32 approved cards and zero planned cards。

- [ ] **Step 1: 写最终 32/32 发布门禁**

```js
assert.equal(index.cards.length, 32);
assert.equal(index.cards.filter(c => c.status === 'approved').length, 32);
assert.equal(buildStudyCards({ root, write: false }).cards.length, 32);
```

- [ ] **Step 2: 完成 P5 六卡并审核构词、近义词、前缀动词和无人称结构**
- [ ] **Step 3: 完成 P6 两卡并区分正式语体规律与非绝对倾向**
- [ ] **Step 4: 运行全量构建、测试和浏览器巡检**

Run:

```powershell
npm run build:russian-b2-study-cards
npm run test:russian-b2
```

Expected: 32 个生成文件，测试 exit 0；P1–P6 每个知识点均显示学习卡入口。

- [ ] **Step 5: 提交**

Commit: `git commit -m "feat: complete all rich B2 grammar cards"`

### Task 7: 恢复 P6 的 32 道上下文题

**Files:**
- Create: `scripts/russian-b2/build-p6-context.js`
- Create: `tests/russian-b2/build-p6-context.test.js`
- Create: `俄语资料库/俄语B2·原书复刻与学习版/规范数据/语法词汇/p6-context-q009-q026.json`
- Create: `俄语资料库/俄语B2·原书复刻与学习版/规范数据/语法词汇/p6-context-q037-q050.json`
- Modify: `scripts/russian-b2/build-six-part-book.js`
- Modify: `scripts/russian-b2/lib/contracts.js`
- Modify: `reader.html`
- Create: `docs/superpowers/acceptance/2026-07-17-b2-p6-context.md`

**Interfaces:**
- Produces: `contextGroups: Array<{ id, title, materialBlocks, exerciseIds, sourcePages }>`
- Adds to each contextual exercise: `contextGroupId`

- [ ] **Step 1: 写失败测试，要求 P6 题号 1–50 完整**

```js
const p6 = buildSixPartBook({ root, write: false }).parts.find(part => part.id === 'p6');
assert.deepEqual(p6.exercises.map(q => q.printedNumber), Array.from({ length: 50 }, (_, i) => i + 1));
assert.deepEqual(p6.contextGroups.map(g => g.exerciseIds.length), [18, 14]);
```

- [ ] **Step 2: 从 Markdown 导入材料和题目，再逐页核对 PDF 66–72**

9–26 保留人物简介、脑循环和儿童实验材料；37–50 保留申请书与解释信版式。答案、解析和译文不得由模型猜补。

- [ ] **Step 3: 实现上下文构建与契约**

```js
function validateContextGroup(group, exercises) {
  if (!group.materialBlocks.length) return ['context material is required'];
  if (!group.exerciseIds.every(id => exercises.has(id))) return ['context exercise id is missing'];
  return [];
}
```

- [ ] **Step 4: 阅读器按材料分组渲染**

`renderQuizChapter()` 遇到 `contextGroups` 时先渲染材料，再连续渲染该组题；独立题入口继续可用，进度仍保存到 `russian_b2:p6`。

- [ ] **Step 5: 验证并提交**

Run: `node --test tests/russian-b2/build-p6-context.test.js && npm run test:russian-b2`
Expected: P6 50/50，测试 exit 0。

Commit: `git commit -m "feat: restore contextual P6 grammar tasks"`

### Task 8: 建立整书模块运行时和数据清单

**Files:**
- Create: `js/russian-b2/core.js`
- Create: `tests/russian-b2/runtime-core.test.js`
- Create: `scripts/russian-b2/build-full-book.js`
- Create: `data/textbook/russian_b2/book.json`
- Modify: `data/textbook/index.json`
- Modify: `reader.html`

**Interfaces:**
- Produces: `window.RussianB2App.registerModule(id, adapter)`
- Produces: `openModule(id)`, `loadJson(path)`, `loadState(scope)`, `saveState(scope, value)`
- Module adapter: `{ id, renderHome(ctx), openUnit(ctx, unitId) }`

- [ ] **Step 1: 写模块注册和稳定存储失败测试**

```js
app.registerModule('reading', adapter);
assert.equal(app.getModule('reading'), adapter);
assert.equal(app.key('writing', 'draft-01'), 'russian_b2:writing:draft-01');
```

- [ ] **Step 2: 实现 UMD 风格核心**

```js
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object') module.exports = api;
  root.RussianB2App = api;
})(typeof window !== 'undefined' ? window : globalThis, function () { /* registry + storage */ });
```

- [ ] **Step 3: 把书籍元数据升级为 `format: "b2-full"`**

`book.json` 列出 `grammar`、`reading`、`writing`、`listening`、`speaking`、`exam` 和 `review`；语法模块继续引用现有六部分数据。

- [ ] **Step 4: reader.html 加载核心并显示学习概览壳层**

书架点击 B2 时进入 `RussianB2App.showHome()`；其他教材路径不变。

- [ ] **Step 5: 验证并提交**

Run: `node --test tests/russian-b2/runtime-core.test.js && npm run test:russian-b2`
Expected: 原语法入口、错题本和其他教材无回归。

Commit: `git commit -m "feat: add full-book B2 module runtime"`

### Task 9: 完成阅读 10 篇

**Files:**
- Create: `scripts/russian-b2/build-reading.js`
- Create: `tests/russian-b2/reading.test.js`
- Create: `俄语资料库/俄语B2·原书复刻与学习版/规范数据/阅读/index.json`
- Create: `俄语资料库/俄语B2·原书复刻与学习版/规范数据/阅读/text-01.json` through `text-10.json`
- Create: `js/russian-b2/reading.js`
- Create: `data/textbook/russian_b2/modules/reading/index.json` and generated units
- Create: `docs/superpowers/acceptance/2026-07-17-b2-reading.md`

**Interfaces:** `ReadingUnit = { id, title, paragraphs, structure, reusableExpressions, questions, retelling }`。

- [ ] **Step 1: 写 10 篇、原书顺序和题号完整测试**
- [ ] **Step 2: 从 `章节/02-阅读.md` 导入正文和问题，逐篇核对 PDF 与答案区**
- [ ] **Step 3: 为每段写来源明确的翻译、主旨和长难句拆解**
- [ ] **Step 4: 实现学习/考试模式、题型标签、证据句和复述入口**
- [ ] **Step 5: 验收 Текст 1、5、10 与 390px 布局**

Run: `node --test tests/russian-b2/reading.test.js && npm run test:russian-b2`
Expected: 10/10 篇、所有题有答案与证据，测试 exit 0。

Commit: `git commit -m "feat: publish B2 reading module"`

### Task 10: 完成写作规范数据、编辑器和 AI 反馈

**Files:**
- Create: `scripts/russian-b2/build-writing.js`
- Create: `tests/russian-b2/writing.test.js`
- Create: `俄语资料库/俄语B2·原书复刻与学习版/规范数据/写作/index.json`
- Create: `俄语资料库/俄语B2·原书复刻与学习版/规范数据/写作/recommendation-letter.json`, `application.json`, `invitation.json`, `autobiography.json`, `receipt.json`, `certificate.json`, `thank-you-letter.json`, `congratulation-letter.json`, `announcement.json`, `complaint.json`, `explanatory-note.json`, `internship-report.json`, and `introduction-letter.json`
- Create: `js/russian-b2/writing.js`
- Create: `server/russian-b2-ai.js`
- Create: `tests/russian-b2/ai-server.test.js`
- Modify: `server.js`
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `docs/superpowers/acceptance/2026-07-17-b2-writing.md`

**Interfaces:**
- `POST /api/russian-b2/feedback` body `{ kind: 'writing'|'speaking', taskId, rubric, submission }`
- Returns `{ feedback, suggestedRevision, rubricScores, model, createdAt }`
- Uses `OPENAI_API_KEY` and `OPENAI_MODEL`; no browser key.

- [ ] **Step 1: 写全部写作类型和草稿持久化失败测试**
- [ ] **Step 2: 导入并核对格式、范文、任务要求和必要原书版式**
- [ ] **Step 3: 实现提纲、编辑器、自动保存、本地格式检查和范文解锁**
- [ ] **Step 4: 实现服务端 AI 适配器与复制提示降级**

Run: `npm install openai`。

服务端使用 OpenAI SDK Responses API；缺少密钥时返回 `503 { code: 'AI_NOT_CONFIGURED' }`，前端转为复制提示。密钥来自 `OPENAI_API_KEY`，模型来自 `OPENAI_MODEL`；代码不硬编码账号不可用的模型。官方要求 API 密钥留在服务端并通过环境变量管理：[API key safety](https://help.openai.com/en/articles/5112595-best-practices-for-api)。

- [ ] **Step 5: 验收推荐信、公文、投诉信和实习报告**

Run: `node --test tests/russian-b2/writing.test.js tests/russian-b2/ai-server.test.js && npm run test:russian-b2`。

Commit: `git commit -m "feat: add B2 writing workbench"`

### Task 11: 完成会话渐进训练、录音和转写

**Files:**
- Create: `scripts/russian-b2/build-speaking.js`
- Create: `tests/russian-b2/speaking.test.js`
- Create: `俄语资料库/俄语B2·原书复刻与学习版/规范数据/会话/index.json`
- Create: `俄语资料库/俄语B2·原书复刻与学习版/规范数据/会话/negative-dialogue.json`, `attitude-dialogue.json`, `intonation.json`, `video-description.json`, `editorial-phone-call.json`, and `examiner-discussion.json`
- Create: `js/russian-b2/speaking.js`
- Modify: `server/russian-b2-ai.js`
- Create: `docs/superpowers/acceptance/2026-07-17-b2-speaking.md`

**Interfaces:**
- IndexedDB store `russian_b2_recordings`, key `{ taskId, attemptId }`
- `POST /api/russian-b2/transcribe` accepts recorded audio and returns `{ text, model }`

- [ ] **Step 1: 写六题型、三录音保留和收藏保护失败测试**
- [ ] **Step 2: 导入原书任务、参考答案和功能表达，建立句型替换→短答→完整录音步骤**
- [ ] **Step 3: 实现准备计时、MediaRecorder、回听和 IndexedDB 轮换**
- [ ] **Step 4: 接入转写、任务覆盖检查、AI 反馈和手工转写降级**
- [ ] **Step 5: 验收对话、视频描述、电话咨询和辩论**

Run: `node --test tests/russian-b2/speaking.test.js tests/russian-b2/ai-server.test.js && npm run test:russian-b2`。

Commit: `git commit -m "feat: add B2 speaking practice studio"`

### Task 12: 修复听力稿、生成 TTS 并完成精听

**Files:**
- Create: `scripts/russian-b2/build-listening.js`
- Create: `scripts/russian-b2/generate-tts.py`
- Create: `requirements-russian-b2.txt`
- Create: `tests/russian-b2/listening.test.js`
- Create: `俄语资料库/俄语B2·原书复刻与学习版/规范数据/听力/index.json`
- Create: `俄语资料库/俄语B2·原书复刻与学习版/规范数据/听力/dialogues.json`, `advertisements.json`, `film.json`, `news.json`, and `interview.json`
- Create: `js/russian-b2/listening.js`
- Create: `data/textbook/russian_b2/media/listening/`
- Create: `docs/superpowers/acceptance/2026-07-17-b2-listening.md`

**Interfaces:**
- `ListeningUnit = { id, mode, transcriptSegments, questions, evidence, media }`
- `media.provenance` is `original` or `reconstructed-tts`; video tasks cannot use `original` without an actual file.

- [ ] **Step 1: 写五类材料、来源状态和逐句时间轴失败测试**
- [ ] **Step 2: 核对对话与广告完整稿，修复电影、新闻、采访残缺稿**
- [ ] **Step 3: 实现 `generate-tts.py`**

在 `requirements-russian-b2.txt` 固定 `edge-tts==7.2.8`。生成 MP3 和 WebVTT 字幕；对话角色使用不同俄语声音，广告、新闻、采访使用固定体裁声音。语速配置写入 manifest，实际调速由播放器完成。

- [ ] **Step 4: 实现学习/考试模式、答案证据、听写与跟读**
- [ ] **Step 5: 验证媒体 MIME、离线播放和 TTS 失败降级**

Run:

```powershell
python -m pip install -r requirements-russian-b2.txt
python scripts/russian-b2/generate-tts.py --check
node --test tests/russian-b2/listening.test.js tests/russian-b2/server-mime.test.js
npm run test:russian-b2
```

Expected: 五类数据通过；所有正式音频有来源标签与字幕；测试 exit 0。

Commit: `git commit -m "feat: publish reconstructed B2 listening module"`

### Task 13: 完成真题分模块练习与完整模拟

**Files:**
- Create: `scripts/russian-b2/build-exam.js`
- Create: `tests/russian-b2/exam.test.js`
- Create: `俄语资料库/俄语B2·原书复刻与学习版/规范数据/真题/index.json`
- Create: `俄语资料库/俄语B2·原书复刻与学习版/规范数据/真题/grammar-lexicon.json`, `reading.json`, `writing.json`, `listening.json`, `speaking.json`, and `exam-instructions.json`
- Create: `js/russian-b2/exam.js`
- Create: `docs/superpowers/acceptance/2026-07-17-b2-exam.md`

**Interfaces:**
- `ExamAttempt = { id, startedAt, remainingMs, interrupted, sections, completedAt }`
- Objective, self-assessment and AI estimates remain separate fields.

- [ ] **Step 1: 写考试顺序、计时、续做和成绩隔离失败测试**
- [ ] **Step 2: 从 06a–06f 导入全部真题、指令、答案、范文和任务**
- [ ] **Step 3: 实现分模块练习，复用各专项 renderer**
- [ ] **Step 4: 实现完整考试状态机；恢复后设置 `interrupted: true`**
- [ ] **Step 5: 实现分项成绩报告并验收完整流程**

Run: `node --test tests/russian-b2/exam.test.js && npm run test:russian-b2`。

Commit: `git commit -m "feat: add B2 exam and mock-test mode"`

### Task 14: 完成学习概览、复习中心、导出与 Gist 同步

**Files:**
- Create: `js/russian-b2/dashboard.js`
- Create: `server/russian-b2-sync.js`
- Create: `tests/russian-b2/dashboard-sync.test.js`
- Modify: `server.js`
- Modify: `js/russian-b2/core.js`
- Create: `docs/superpowers/acceptance/2026-07-17-b2-dashboard-sync.md`

**Interfaces:**
- `exportArchive(): RussianB2Archive`
- `mergeArchive(local, remote): { merged, conflicts }`
- Gist payload excludes recordings and secrets.
- Server reads `RUSSIAN_B2_GIST_ID` and `GITHUB_TOKEN`; it never imports `cloudsync-config.js`.

- [ ] **Step 1: 写模块进度聚合、复习分类和冲突保留失败测试**
- [ ] **Step 2: 实现六模块学习概览和统一复习中心**
- [ ] **Step 3: 实现导出/导入与稳定 ID 合并**
- [ ] **Step 4: 实现 Gist 同步；草稿分叉保留两份，录音只同步元数据**
- [ ] **Step 5: 验收离线、网络失败、冲突和存储不足降级**

Run: `node --test tests/russian-b2/dashboard-sync.test.js && npm run test:russian-b2`。

Commit: `git commit -m "feat: add B2 dashboard review and sync"`

### Task 15: 完成 190 页台账、总构建和最终验收

**Files:**
- Modify: `scripts/russian-b2/build-full-book.js`
- Modify: `俄语资料库/俄语B2·原书复刻与学习版/规范数据/全书覆盖/pdf-page-ledger.json`
- Create: `tests/russian-b2/full-book-acceptance.test.js`
- Create: `docs/superpowers/acceptance/2026-07-17-russian-b2-full-reader.md`
- Modify: `data/textbook/russian_b2/book.json` and generated module indexes

**Interfaces:** `buildFullBook({ root, write, strict }): FullBookBuildResult`。

- [ ] **Step 1: 写最终严格失败测试**

```js
assert.deepEqual(validatePageLedger(ledger, { strict: true }), []);
assert.equal(cards.filter(c => c.status === 'approved').length, 32);
assert.equal(p6.exercises.length, 50);
assert.deepEqual(book.modules.map(m => m.id), ['grammar','reading','writing','listening','speaking','exam','review']);
```

- [ ] **Step 2: 完成 190 页逐页映射**

每页记录 PDF 页、印刷页、模块、规范数据 ID、内容类型、媒体状态和审核状态。任何 `unmapped`、空 reason 或不存在的单元 ID 都使严格构建失败。

- [ ] **Step 3: 运行总构建和全部自动化**

Run:

```powershell
node scripts/russian-b2/build-full-book.js --strict
npm run verify:russian-b2
```

Expected: exit 0；190/190 页、32/32 卡、P6 50/50、全部模块通过。

- [ ] **Step 4: 浏览器完整验收**

电脑、平板和 390px 手机依次验证：书架→学习概览→六模块→做题/草稿/录音/精听→复习→同步→模拟→导出→恢复。验证离线模式、AI 未配置、TTS 失败和 Gist 冲突降级。

- [ ] **Step 5: 安全合并主项目**

先检查主工作区用户改动和敏感文件；只合并本分支已提交内容。合并后在 `D:\MyStudySpace` 重跑：

```powershell
npm ci
npm run verify:russian-b2
node server.js
```

Expected: 验证通过，`http://localhost:3000/reader.html` 可完成整书学习闭环。

- [ ] **Step 6: 记录最终提交**

Commit: `git commit -m "docs: record full B2 reader acceptance"`

不要提交 `cloudsync-config.js`、真实 API 密钥、Gist token、浏览器录音或临时页图。
