# 俄语词态还原引擎 — 设计文档

**日期**: 2026-06-26  
**状态**: 设计定案  
**项目**: 俄语学习舱 Reader（`reader.html`）

---

## 一、背景与目标

### 1.1 问题

用户在 iPad 上用 `reader.html` 阅读俄语小说。选中生词 → 弹窗查词，但当前 `localVocabLookup` 只做精确原形匹配——小说中出现的是变形词（如 `написанного`），词典里存的是原形（`написать`），导致大量查词返回"待补中文释义"。

用户被迫中断阅读：复制 → 粘贴到 Gemini/词典 → 等结果 → 回到 Safari。

### 1.2 目标

在 reader.html 中嵌入一套**词态还原引擎**，使得：
- 用户点击变形词 → 自动还原为原形 → 从本地词典中命中释义
- 本地词库与 morphology map 均进入内存后，查词链路完全同步（毫秒级）；首次加载期间走规则/原词兜底
- 首次使用体验：页面立即可用，映射表后台异步下载

### 1.3 灵感来源

英语 PDF 智能点读机（`catchase365-crypto.github.io/pdftext2`）的本地词态引擎——点击 `stopped` → 还原 `stop` → 弹出释义。本方案将其思想移植到俄语，应对俄语远为复杂的形态变化。

---

## 二、核心架构

```
┌─────────────────────────────────────────────────────────┐
│                    电脑端（一次性，离线预处理）             │
│                                                         │
│  vocabulary.json (6,147 词)                             │
│    ↓                                                    │
│  Python + pymorphy3（优先；兼容环境也可用 pymorphy2）      │
│    - 筛选 verb/noun/adj/adv 单体词 (~4,100)               │
│    - 分词性穷举常用变形（非全范式，只选阅读高频形式）        │
│    - ё/е 双写映射                                        │
│    - 同形冲突 → 数组值                                    │
│    ↓                                                    │
│  data/morphology-map.json                               │
│    - 约 81,000 条映射                                    │
│    - 原始体积 ~2.8MB，gzip 传输 ~700KB                     │
│    ↓                                                    │
│  data/morphology-version.json（版本号管理）                │
│    ↓                                                    │
│  push 到 GitHub Pages                                   │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│                  iPad Safari（每次使用）                   │
│                                                         │
│  首次打开：                                              │
│    页面立即可用（读小说、展开翻译）                         │
│    → 后台异步下载 morphology-map.json                     │
│    → 写入 IndexedDB + 构建内存字典 Object.create(null)     │
│    → 就绪后查词链路完全同步                                │
│                                                         │
│  之后打开：                                              │
│    → 从 IndexedDB 读取 → Object.create(null) 字典         │
│    → 瞬间就绪，零网络请求                                  │
│                                                         │
│  版本更新：                                              │
│    → 静默 fetch morphology-version.json                  │
│    → 版本号不一致 → 自动重新下载映射表 → 更新 IndexedDB     │
└─────────────────────────────────────────────────────────┘
```

### 2.1 查词链路（三级兜底，纯同步）

```
用户选中变形词（如 "написанного"）
  ↓ 去重音、小写、去标点
  ↓
第1级：查内存字典 dict[word]
  命中 → 拿到原形数组 → 逐原形查 localVocabLookup
    命中 → 出释义 ✅
    多个原形命中 → 显示高频义项为主，底部灰字标注备选
  未命中 ↓
  ↓
第2级：JS 轻量规则引擎（15-20 条高频词尾正则）
  命中 → 还原出候选原形 → 查 localVocabLookup
    命中 → 出释义 ✅
  未命中 ↓
  ↓
第3级：原词直接查 localVocabLookup
  命中 → 出释义 ✅
  未命中 → "暂未收录"
```

### 2.2 性能指标

| 指标 | 目标值 | 说明 |
|------|--------|------|
| 内存字典查询 | < 1ms (O(1)) | Object.create(null) 属性访问 |
| 规则引擎兜底 | < 5ms | 15-20 条正则，单次匹配 |
| 内存占用 | ~12-15MB | 8 万条字符串键值对 |
| 映射表下载 | ~700KB (gzip) | WiFi <1s, 4G ~2-3s |
| 首次 IndexedDB 写入 | < 2s | 异步，不阻塞页面 |

---

## 三、各组件设计

### 3.1 Python 预处理脚本

**输入**: `data/vocabulary.json`  
**输出**: `data/morphology-map.json`, `data/morphology-version.json`

**分词性生成策略**（非全范式，只选阅读高频形式）：

| 词性 | 生成形式 | 词典词数 | 每词约 | 映射估数 |
|------|---------|---------|--------|---------|
| 动词 | 现在时6人称 + 过去时4性数 + 命令式 + 常用形动词短尾 | 1,505 | ~30 | ~45,000 |
| 名词 | 6格×单复数 | 1,958 | ~12 | ~23,000 |
| 形容词 | 常用性数格组合 + 短尾 + 比较级 | 649 | ~20 | ~13,000 |
| **合计** | | **~4,100** | | **~81,000** |

**数据清洗规则**：

1. **Ё/Е 字符坍塌**：每条含 `ё` 的变形词，额外生成一条 `ё→е` 的映射。`"своё"` 同时映射为 `"своё"` 和 `"свое"`。
2. **同形冲突**：映射值为数组。`{"стали": ["сталь", "стать"]}`。数组按 pymorphy3 自带的 `.score`（形态学概率）降序排列，但前端查词时**不机械取 `lemmas[0]`**——而是遍历数组，取第一个在本地词库中命中中文释义的 lemma。`.score` 排序仅用于同分场景的 tie-break，实际显示优先级是"词库命中 > 形态概率"。
3. **体态独立性**：必须验证 pymorphy3 对 `сделал→сделать`（不误导为 `делать`）和 `пошёл→пойти`（不误导为 `идти`）的正确还原。
4. **反身动词**：验证 `-ся/-сь` 后缀被正确保留在还原结果中。
5. **去重**：同样原形产生的同一变形只留一条。

**输出格式**：

```json
{
  "version": 1,
  "generated": "2026-06-26",
  "count": 81000,
  "map": {
    "написанного": ["написать"],
    "написанной": ["написать"],
    "своего": ["своё"],
    "свое": ["своё"],
    "стали": ["сталь", "стать"]
  }
}
```

### 3.2 前端存储与字典构建（reader.html 修改）

**新增文件**: `data/russian-morphology.js`（轻量规则引擎，15-20 条正则）

**引入轻量库**: `idb-keyval`（~1KB），将 IndexedDB 的 `onsuccess`/`onerror` 事件回调封装为干净的 `await get()` / `await set()` 接口，避免手写 XMLHttpRequest 时代的遗留 API。

**reader.html 修改点**：

1. **新增全局状态**：

```javascript
var morphologyDict = null;      // Object.create(null) 字典，null = 未就绪
var morphologyVersion = 0;       // 当前加载的映射表版本
var morphologyReady = false;     // 就绪标志
```

2. **初始化函数（页面加载时调用）**：

```javascript
async function initMorphology() {
  // 1. 尝试获取远程版本号
  var remoteVersion = null;
  var versionFetchOk = true;
  try {
    var vr = await fetch('data/morphology-version.json');
    if (!vr.ok) throw new Error('version fetch failed');
    var v = await vr.json();
    remoteVersion = v.version;
  } catch(e) {
    versionFetchOk = false;
  }

  // 2. 尝试从 IndexedDB 加载
  var localData = null;
  try {
    localData = await readMorphologyFromIDB();
  } catch(e) {}

  // 3. 版本比对（仅当远程版本号获取成功时）
  if (versionFetchOk && localData && localData.version === remoteVersion) {
    buildDict(localData.map);
    return;
  }

  // 4. 版本文件获取失败 → 直接使用本地旧 map，不尝试下载大文件
  if (!versionFetchOk && localData) {
    buildDict(localData.map);
    return;
  }

  // 5. 需要下载新版本
  // 静默重试抑制：如果本次会话已下载失败过，不再重试
  var alreadyFailed = sessionStorage.getItem('morph_retry') === '1';
  if (alreadyFailed) {
    if (localData) buildDict(localData.map);
    return;
  }
  try {
    var resp = await fetch('data/morphology-map.json');
    var json = await resp.json();
    await writeMorphologyToIDB(json);
    buildDict(json.map);
  } catch(e) {
    sessionStorage.setItem('morph_retry', '1');
    // 下载失败但有本地旧版本 → 先用旧版本
    if (localData) buildDict(localData.map);
    // 否则保持 morphologyReady = false，降级到规则引擎
  }
}

function buildDict(mapData) {
  morphologyDict = Object.create(null);
  Object.assign(morphologyDict, mapData);
  morphologyReady = true;
}
```

3. **修改 autoLookup 函数**（三级兜底）：

```javascript
function autoLookup(word) {
  var clean = normalizeLookupWord(word);
  if (!clean) return;
  _lastLookupWord = clean;

  // 去重音已经在 normalizeLookupWord 里做了
  var preview = document.getElementById('dictPreview');
  preview.innerHTML = '<div class="dict-loading">⏳ 查询中...</div>';
  preview.style.display = 'block';

  var result = null;

  // 第1级：查内存映射表
  if (morphologyReady && morphologyDict[clean]) {
    var lemmas = morphologyDict[clean]; // 数组
    for (var i = 0; i < lemmas.length; i++) {
      var r = lookupLocalChineseMeaning(lemmas[i]);
      if (r && r.meaning !== '待补中文释义') {
        result = r;
        if (lemmas.length > 1) {
          result._alternatives = lemmas.filter(function(l) { return l !== lemmas[i]; });
          // 备选原形的视觉呈现：在 dictPreview 内使用 backdrop-filter: blur(8px) +
          // 半透明次级文本色的内嵌区块，不新增 DOM 结构，安静暗示"还有其他语法可能性"
        }
        break;
      }
    }
  }

  // 第2级：JS 规则引擎
  if (!result && typeof morphologyGuess === 'function') {
    var guesses = morphologyGuess(clean);
    for (var g = 0; g < guesses.length; g++) {
      var r = lookupLocalChineseMeaning(guesses[g]);
      if (r && r.meaning !== '待补中文释义') {
        result = r;
        result._guessed = true;
        break;
      }
    }
  }

  // 第3级：原词直查
  if (!result) {
    result = lookupLocalChineseMeaning(clean);
  }

  preview.innerHTML = renderLocalLookup(clean, result);
  updateSaveButton(clean);
}
```

4. **扩充词典加载**：移除 `loadLocalLookupData()` 中的 `w.source !== 'vocab'` 过滤，改为加载所有带 `meaning` 和 `type` 的单体词（verb/noun/adj/adv），覆盖约 4,100 个原形。

5. **renderLocalLookup 增补**：当 `result._alternatives` 存在时，在释义底部追加备选原形区块：

```javascript
// 在 renderLocalLookup 函数末尾、返回 HTML 之前
if (result._alternatives && result._alternatives.length) {
  html += '<div class="dict-alternatives">' +
    '<span class="dict-alt-label">也作：</span>' +
    result._alternatives.map(function(a) {
      return '<span class="dict-alt-word">' + escapeHtml(a) + '</span>';
    }).join('、') +
    '</div>';
}
```

CSS 新增：
```css
.dict-alternatives {
  margin-top: 8px; padding: 6px 10px;
  background: rgba(255,255,255,0.04); border-radius: 6px;
  backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
  font-size: 12px; color: var(--text-dim);
}
.dict-alt-label { color: var(--text-dim); }
.dict-alt-word { color: var(--text-secondary); }
```

视觉策略：使用微弱透明背景 + `backdrop-filter: blur(8px)` 的内嵌区块，半透明次级文本色，不增 DOM 层级，安静暗示"还有其他语法可能性"，维持阅读沉浸感。

**6. 词性归一化**：vocabulary.json 中存在两种命名习惯（`type: "adj"` 203条 与 `type: "adjective"` 202条；`type: "adv"` 153条 与 `type: "adverb"` 29条）。扩充词典加载时必须统一归一化——`adj` 和 `adjective` 都纳入，`adv` 和 `adverb` 都纳入——否则将漏掉 231 个词。

### 3.3 JS 规则引擎（降级兜底）

**文件**: `data/russian-morphology.js`  
**体积**: ~5KB（15-20 条正则规则）  
**定位**: 仅做轻量兜底，不做完整语法树

**覆盖规则示例**：

| 词尾模式 | 替换 | 词性倾向 | 示例 |
|---------|------|---------|------|
| `ого` / `его` | → `ий` / `ой` | adj/n gen | `хорошего→хороший` |
| `ому` / `ему` | → `ий` / `ой` | adj dat | `хорошему→хороший` |
| `ая` / `яя` | → `ий` / `ой` | adj f nom | `хорошая→хороший` |
| `ую` / `юю` | → `ий` / `ой` | adj f acc | `хорошую→хороший` |
| `ые` / `ие` | → `ий` / `ой` | adj pl | `хорошие→хороший` |
| `ешь` / `ишь` | → `еть` / `ить` | v 2sg | `видишь→видеть` |
| `ет` / `ит` | → `еть` / `ить` | v 3sg | `видит→видеть` |
| `ют` / `ут` / `ат` / `ят` | → `ять` / `ать` | v 3pl | `видят→видеть` |
| `л` / `ла` / `ло` / `ли` | → `ть` | v past | `видел→видеть` |
| `ющий` / `ущий` | → `ать` / `овать` | v act.pres | `читающий→читать` |
| `вший` | → `ть` | v act.past | `читавший→читать` |
| `нный` / `енный` | → `ать` / `ить` | v pass.past | `прочитанный→прочитать` |
| `ами` / `ями` | → / `я` | n inst pl | `книгами→книга` |
| `ах` / `ях` | → / `я` | n prep pl | `книгах→книга` |
| `ов` / `ев` | → | n gen pl | `столов→стол` |
| `ее` / `ей` (比较级) | → `ий` / `ой` | adj comp | `красивее→красивый` |

**函数签名**：

```javascript
function morphologyGuess(word) {
  // 返回候选原形数组，按置信度排序
  // 如果无法分析，返回空数组 []
}
```

**关键原则——长后缀优先**：规则遍历顺序必须按移除后缀的长度降序排列。例如 `ющий`（4字符）必须在 `щий`（3字符）之前处理，否则 `читающий` 可能被短规则截断为 `читаю` 而不是正确还原为 `читать`。同样，`вший` 先于 `ший`，`енный` 先于 `нный`。

### 3.4 版本管理

**文件**: `data/morphology-version.json`

```json
{
  "version": 1,
  "updated": "2026-06-26",
  "description": "B2核心词库 4,100 词形态映射表"
}
```

**逻辑**：
- 每次 Python 重新生成映射表 → `version` 递增
- 前端每次打开 → 静默 fetch `morphology-version.json`（几十字节）
- 与 IndexedDB 中存储的版本号比对
- 不一致 → 自动重新下载 → 重建内存字典
- 比对失败（无网/404）→ 继续使用本地缓存

---

## 四、异常处理

| 场景 | 处理方式 |
|------|---------|
| 首次打开，映射表下载中 | 页面立即可用；morphologyReady=false，查词走第2/3级兜底 |
| 首次打开，下载失败（无网） | morphologyReady=false，查词走第2/3级兜底 |
| IndexedDB 被 iOS 清理 | 容错重载：检测到空 → 自动 fetch 映射表 → 重新写入 |
| 映射表版本过期 | 静默版本比对 → 自动更新 |
| 同形冲突（一词多原形） | 主释义显示数组首个（高频词），底部灰字标注备选 |
| 映射表 + 规则引擎均未命中 | 原词直查词典；仍未命中 → "暂未收录" |
| 超长生僻词 | 规则引擎返回空数组，走第3级 |
| 版本文件 (morphology-version.json) fetch 失败 | 直接使用本地旧 map，不尝试下载大文件 |

---

## 四·B 验收测试矩阵

### 4B.1 金样例（形态还原正确性）

用于 Python 生成脚本完成后立即验证，也用于每次重新生成映射表后的回归检查。

**动词变形**：

| 输入（变形词） | 期望原形 | 备注 |
|------|------|------|
| `написанного` | `написать` | 过去被动形动词，-ого 格变 |
| `сделал` | `сделать` | 完成体过去时，体态独立性 |
| `пошёл` | `пойти` | 前缀异根过去时，不与 `идти` 混淆 |
| `видит` | `видеть` | 现在时 3sg，辅音交替 д→ж |
| `занимается` | `заниматься` | 反身动词，-ся 保留 |
| `занимаешься` | `заниматься` | 反身动词 2sg，-ся 保留 |
| `читающий` | `читать` | 现在主动形动词，长后缀规则 |
| `мог` | `мочь` | 过去时，辅音交替 г→ж |
| `шёл` | `идти` | 绝对异根过去时 |
| `беру` | `брать` | 现在时 1sg，辅音交替 |

**名词变形**：

| 输入 | 期望原形 | 备注 |
|------|------|------|
| `книге` | `книга` | 单数 prep格 |
| `столами` | `стол` | 复数 inst 格 |
| `людей` | `человек` | 绝对异根，复数 gen 格 |
| `отца` | `отец` | 隐现元音（fleeting vowel） |

**形容词变形**：

| 输入 | 期望原形 | 备注 |
|------|------|------|
| `хорошего` | `хороший` | gen 格，-ого 词尾 |
| `красивее` | `красивый` | 比较级 |
| `лучше` | `хороший` | 不规则比较级（异根） |

**Ё/Е 双向**：

| 输入 | 期望词库键 | 备注 |
|------|------|------|
| `свое` | 命中 `своё` | 小说中 ё 写成了 е |
| `все` | 命中 `всё` | 同上 |
| `моей` | 命中 `моё` | 格变 + ё→е |

**同形冲突**：

| 输入 | 期望映射值 | 备注 |
|------|------|------|
| `стали` | `["сталь", "стать"]` | 名词"钢" vs 动词"成为" |

### 4B.2 Python 生成脚本验证

| 检查项 | 验收标准 |
|------|---------|
| 词性覆盖 | verb/noun/adj/adv + adjective/adverb 共 5 类全部纳入，无遗漏 |
| ё/е 双写 | 扫描生成的 JSON，所有含 `ё` 的变形词均存在 `ё→е` 等价键 |
| .score 排序 | 所有多值映射数组中，值按 `parse().score` 降序排列 |
| 去重 | 同一 (变形词, 原形) 对不重复出现 |
| 体积 | 原始 JSON ≤ 3.5MB，gzip ≤ 800KB |

### 4B.3 前端查词链路验证

| 检查项 | 验收标准 |
|------|---------|
| 映射表命中 | Morphology map 在内存后，`dict[变形词]` 返回正确原形数组 |
| 词典匹配 | 遍历原形数组 → `localVocabLookup[lemma]` → 第一个有中文释义的命中 |
| JS 兜底 | Map 中无此变形 → `morphologyGuess()` 返回候选 → 命中词典 |
| 同形显示 | 多原形时，`result._alternatives` 存在且 UI 显示备选原形 |
| 词典未收录 | 三级全部未命中 → 显示"暂未收录" |

### 4B.4 iPad Safari 性能验证

| 检查项 | 验收标准 |
|------|---------|
| 首次冷启动 | 页面 3s 内可交互（读小说）；查词可用时长 ≤ 8s（映射表下载完毕） |
| 二次热启动 | 页面打开后查词立即就绪（从 IndexedDB → 内存字典，≤ 1s） |
| 查词延迟 | 单次点击到弹窗出释义 ≤ 100ms（Map O(1) 同步查词） |
| 内存占用 | 加载 morphology map 前后，Heap 增长 ≤ 20MB |
| 版本切换 | morphology-version.json 版本号+1 后，下次打开自动下载新 map |
| 存储清理恢复 | 手动清除 Safari 网站数据后，冷启动自动重新下载 map |

---

## 五、不在此版实现的内容

下列功能经讨论确认**暂不实施**：

1. **Reader → Obsidian Vault 自动导入**：读完一章自动生成生词笔记，非当前痛点。
2. **Vault → Reader 薄弱词高亮回传**：Obsidian 中 mastery≤2 的词在 Reader 中高亮，锦上添花，非紧迫需求。
3. **PDF 直接渲染**：继续使用预处理 JSON 章节，不做通用 PDF 解析。
4. **PWA 全屏模式**：reader.html 已部署 GitHub Pages，后续迭代考虑。
5. **Dynamic Island 风格悬浮胶囊**：一词多义的 UI 呈现先用简洁版弹窗内灰色小字标注。

---

## 六、文件清单

| 文件 | 类型 | 说明 |
|------|------|------|
| `scripts/generate-morphology.py` | 新增 | Python 预处理脚本 |
| `data/morphology-map.json` | 新增 | 映射表（由脚本生成，.gitignore 可选） |
| `data/morphology-version.json` | 新增 | 版本号文件 |
| `data/russian-morphology.js` | 新增 | JS 轻量规则引擎 |
| `reader.html` | 修改 | 集成映射表加载 + 三级兜底查词 + 扩词典加载 |

---

## 七、参考资料

- 英语 PDF 点读机参考：`catchase365-crypto.github.io/pdftext2`
- pymorphy3 文档：https://pypi.org/project/pymorphy3/
- pymorphy2 文档（兼容备选）：https://pymorphy2.readthedocs.io/
- 俄语形态学术语参考：https://en.wikipedia.org/wiki/Russian_grammar
