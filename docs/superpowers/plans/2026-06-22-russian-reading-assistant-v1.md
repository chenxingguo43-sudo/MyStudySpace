# Russian Reading Assistant v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local Obsidian plugin for `D:\MyStudySpace\俄语资料库` that captures selected Russian words into `词汇/未归档/` and toggles `ZH:` translation visibility.

**Architecture:** No-build local Obsidian community plugin at `.obsidian/plugins/russian-reading-assistant/`. Pure text parsing and file-format logic in `helpers.js` (testable with Node). Obsidian-specific editor commands, vault writes, and mode toggles in `main.js`.

**Tech Stack:** Obsidian plugin API, plain CommonJS JavaScript, Markdown files, CSS snippet-style plugin stylesheet, Node built-in `assert` for tests.

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `.obsidian/plugins/russian-reading-assistant/manifest.json` | Create | Plugin metadata |
| `.obsidian/plugins/russian-reading-assistant/helpers.js` | Create | Pure functions: word extraction, filename normalization, frontmatter/body generation, duplicate context checks |
| `.obsidian/plugins/russian-reading-assistant/main.js` | Create | Obsidian plugin class: command registration, editor selection handling, mark insertion, vault file create/update, bilingual mode commands |
| `.obsidian/plugins/russian-reading-assistant/styles.css` | Create | `ru-new-word` highlight style and `ru-zh-hidden-line` hiding |
| `.obsidian/plugins/russian-reading-assistant/tests/helpers.test.js` | Create | Node tests for helper functions |
| `.obsidian/community-plugins.json` | Modify | Add `russian-reading-assistant` to enabled plugins list |

---

### Task 1: Create Plugin Skeleton

**Files:**
- Create: `D:\MyStudySpace\俄语资料库\.obsidian\plugins\russian-reading-assistant\manifest.json`
- Create: `D:\MyStudySpace\俄语资料库\.obsidian\plugins\russian-reading-assistant\main.js`
- Create: `D:\MyStudySpace\俄语资料库\.obsidian\plugins\russian-reading-assistant\styles.css`

- [ ] **Step 1: Create plugin directory**

```powershell
New-Item -ItemType Directory -Force -Path 'D:\MyStudySpace\俄语资料库\.obsidian\plugins\russian-reading-assistant'
```

Expected: directory exists.

- [ ] **Step 2: Create `manifest.json`**

```json
{
  "id": "russian-reading-assistant",
  "name": "Russian Reading Assistant",
  "version": "0.1.0",
  "minAppVersion": "1.4.0",
  "description": "Fast Russian word capture and RU/ZH reading mode toggles for the local Russian materials vault.",
  "author": "local",
  "isDesktopOnly": false
}
```

- [ ] **Step 3: Create initial `main.js`**

```javascript
'use strict';

const obsidian = require('obsidian');

class RussianReadingAssistant extends obsidian.Plugin {
  async onload() {
    this.addCommand({
      id: 'capture-selected-russian-word',
      name: 'Capture Selected Russian Word to Inbox',
      editorCallback: async (editor, view) => {
        new obsidian.Notice('Russian Reading Assistant skeleton loaded');
      },
    });

    this.addCommand({
      id: 'enter-immersion-mode',
      name: 'Enter Russian Immersion Mode',
      callback: () => {
        document.body.classList.add('ru-hide-zh');
        new obsidian.Notice('Immersion mode: ZH hidden');
      },
    });

    this.addCommand({
      id: 'enter-intensive-mode',
      name: 'Enter Russian Intensive Mode',
      callback: () => {
        document.body.classList.remove('ru-hide-zh');
        new obsidian.Notice('Intensive mode: ZH visible');
      },
    });
  }
}

module.exports = RussianReadingAssistant;
```

- [ ] **Step 4: Create initial `styles.css`**

```css
mark.ru-new-word {
  background: rgba(245, 190, 80, 0.22);
  border-bottom: 1px solid rgba(245, 190, 80, 0.55);
  color: inherit;
  border-radius: 3px;
  padding: 0 2px;
}

.cm-html-embed mark.ru-new-word,
.markdown-preview-view mark.ru-new-word {
  background: rgba(245, 190, 80, 0.22);
}

.ru-zh-hidden-line {
  display: none !important;
}
```

- [ ] **Step 5: Syntax check**

```powershell
node --check 'D:\MyStudySpace\俄语资料库\.obsidian\plugins\russian-reading-assistant\main.js'
```

Expected: no output and exit code 0.

- [ ] **Step 6: Commit**

```powershell
cd D:\MyStudySpace
git add "俄语资料库/.obsidian/plugins/russian-reading-assistant/manifest.json" "俄语资料库/.obsidian/plugins/russian-reading-assistant/main.js" "俄语资料库/.obsidian/plugins/russian-reading-assistant/styles.css"
git commit -m "feat(russian-reader): add plugin skeleton with 3 commands"
```

---

### Task 2: Add Pure Helper Functions and Tests

**Files:**
- Create: `D:\MyStudySpace\俄语资料库\.obsidian\plugins\russian-reading-assistant\helpers.js`
- Create: `D:\MyStudySpace\俄语资料库\.obsidian\plugins\russian-reading-assistant\tests\helpers.test.js`

- [ ] **Step 1: Create failing helper tests**

```javascript
'use strict';

const assert = require('assert');
const {
  extractRussianSelectionParts,
  normalizeRussianWord,
  buildInboxPath,
  getCurrentLineText,
  buildNewWordNote,
  mergeWordNote,
} = require('../helpers');

function test(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

test('extracts word and keeps punctuation outside mark', () => {
  assert.deepStrictEqual(extractRussianSelectionParts('«Муромчане,»'), {
    leading: '«',
    word: 'Муромчане',
    trailing: ',»',
  });
});

test('normalizes Russian word for file names', () => {
  assert.strictEqual(normalizeRussianWord('Муромчане,'), 'муромчане');
  assert.strictEqual(normalizeRussianWord('ГОРДЯТСЯ'), 'гордятся');
});

test('rejects non-Russian selections', () => {
  assert.strictEqual(normalizeRussianWord('hello'), '');
  assert.strictEqual(normalizeRussianWord('中文'), '');
});

test('builds inbox path', () => {
  assert.strictEqual(buildInboxPath('Муромчане,'), '词汇/未归档/муромчане.md');
});

test('gets current line context', () => {
  const editor = {
    getCursor: () => ({ line: 2 }),
    getLine: (line) => ['a', 'b', 'RU: Муромчане гордятся.'][line],
  };
  assert.strictEqual(getCurrentLineText(editor), 'RU: Муромчане гордятся.');
});

test('builds new inbox word note', () => {
  const note = buildNewWordNote({
    word: 'Муромчане',
    normalized: 'муромчане',
    date: '2026-06-22',
    sourcePath: '学习单元/text.md',
    sourceName: 'text',
    contextLine: 'RU: Муромчане гордятся.',
  });
  assert.match(note, /word: "Муромчане"/);
  assert.match(note, /normalized: "муромчане"/);
  assert.match(note, /count: 1/);
  assert.match(note, /> RU: Муромчане гордятся\./);
});

test('merges note count and deduplicates sources', () => {
  const existing = buildNewWordNote({
    word: 'Муромчане',
    normalized: 'муромчане',
    date: '2026-06-22',
    sourcePath: '学习单元/text.md',
    sourceName: 'text',
    contextLine: 'RU: Муромчане гордятся.',
  });
  const merged = mergeWordNote(existing, {
    date: '2026-06-22',
    sourcePath: '学习单元/text.md',
    sourceName: 'text',
    contextLine: 'RU: Другие муромчане читают.',
  });
  assert.match(merged, /count: 2/);
  assert.strictEqual((merged.match(/学习单元\/text\.md/g) || []).length, 1);
  assert.match(merged, /> RU: Другие муромчане читают\./);
});
```

- [ ] **Step 2: Run tests and verify failure**

```powershell
node 'D:\MyStudySpace\俄语资料库\.obsidian\plugins\russian-reading-assistant\tests\helpers.test.js'
```

Expected: FAIL because `helpers.js` does not exist.

- [ ] **Step 3: Create `helpers.js`**

```javascript
'use strict';

const CYRILLIC_WORD_RE = /[А-Яа-яЁё]+(?:-[А-Яа-яЁё]+)?/u;

function formatDate(date = new Date()) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

function extractRussianSelectionParts(selection) {
  const text = selection || '';
  const match = text.match(CYRILLIC_WORD_RE);
  if (!match) return { leading: text, word: '', trailing: '' };
  return {
    leading: text.slice(0, match.index),
    word: match[0],
    trailing: text.slice(match.index + match[0].length),
  };
}

function normalizeRussianWord(selection) {
  const { word } = extractRussianSelectionParts(selection);
  return word.toLocaleLowerCase('ru-RU');
}

function buildInboxPath(selection) {
  const normalized = normalizeRussianWord(selection);
  return `词汇/未归档/${normalized}.md`;
}

function getCurrentLineText(editor) {
  const cursor = editor.getCursor();
  return editor.getLine(cursor.line).trim();
}

function quoteYaml(value) {
  return `"${String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function buildFrontmatter(fields) {
  const lines = ['---'];
  for (const [key, value] of Object.entries(fields)) {
    if (Array.isArray(value)) {
      lines.push(`${key}:`);
      for (const item of value) lines.push(`  - ${quoteYaml(item)}`);
    } else if (value === null || value === undefined || value === '') {
      lines.push(`${key}:`);
    } else if (typeof value === 'number') {
      lines.push(`${key}: ${value}`);
    } else {
      lines.push(`${key}: ${quoteYaml(value)}`);
    }
  }
  lines.push('---');
  return lines.join('\n');
}

function buildContextBlock({ date, sourceName, contextLine }) {
  return [
    `### ${date}｜${sourceName}`,
    '',
    `> ${contextLine}`,
    '',
  ].join('\n');
}

function buildNewWordNote({ word, normalized, date, sourcePath, sourceName, contextLine }) {
  const frontmatter = buildFrontmatter({
    word,
    normalized,
    lemma: '',
    status: '未归档',
    created: date,
    updated: date,
    count: 1,
    encounter_dates: [date],
    sources: [sourcePath],
  });
  return [
    frontmatter,
    '',
    `# ${word}`,
    '',
    '## 上下文',
    '',
    buildContextBlock({ date, sourceName, contextLine }),
  ].join('\n');
}

function parseCount(content) {
  const match = content.match(/^count:\s*(\d+)/m);
  return match ? Number(match[1]) : 1;
}

function replaceScalar(content, key, value) {
  const line = `${key}: ${typeof value === 'number' ? value : quoteYaml(value)}`;
  const re = new RegExp(`^${key}:.*$`, 'm');
  return re.test(content) ? content.replace(re, line) : content.replace(/^---\n/, `---\n${line}\n`);
}

function appendYamlListItem(content, key, value) {
  const quoted = quoteYaml(value);
  if (content.includes(`  - ${quoted}`)) return content;
  const re = new RegExp(`^${key}:\\n((?:  - .+\\n)*)`, 'm');
  if (re.test(content)) {
    return content.replace(re, (match) => `${match}  - ${quoted}\n`);
  }
  return content.replace(/^---\n/, `---\n${key}:\n  - ${quoted}\n`);
}

function mergeWordNote(existingContent, { date, sourcePath, sourceName, contextLine }) {
  let content = existingContent;
  content = replaceScalar(content, 'updated', date);
  content = replaceScalar(content, 'count', parseCount(content) + 1);
  content = appendYamlListItem(content, 'encounter_dates', date);
  content = appendYamlListItem(content, 'sources', sourcePath);
  const block = buildContextBlock({ date, sourceName, contextLine });
  return content.endsWith('\n') ? `${content}${block}` : `${content}\n\n${block}`;
}

module.exports = {
  formatDate,
  extractRussianSelectionParts,
  normalizeRussianWord,
  buildInboxPath,
  getCurrentLineText,
  buildNewWordNote,
  mergeWordNote,
};
```

- [ ] **Step 4: Run helper tests**

```powershell
node 'D:\MyStudySpace\俄语资料库\.obsidian\plugins\russian-reading-assistant\tests\helpers.test.js'
```

Expected: every test prints `PASS`.

- [ ] **Step 5: Commit**

```powershell
cd D:\MyStudySpace
git add "俄语资料库/.obsidian/plugins/russian-reading-assistant/helpers.js" "俄语资料库/.obsidian/plugins/russian-reading-assistant/tests/helpers.test.js"
git commit -m "feat(russian-reader): add helpers with passing tests"
```

---

### Task 3: Implement Fast Word Capture

**Files:**
- Modify: `D:\MyStudySpace\俄语资料库\.obsidian\plugins\russian-reading-assistant\main.js`
- Modify: `D:\MyStudySpace\俄语资料库\.obsidian\community-plugins.json`

- [ ] **Step 1: Replace `main.js` with capture implementation**

```javascript
'use strict';

const obsidian = require('obsidian');
const {
  formatDate,
  extractRussianSelectionParts,
  normalizeRussianWord,
  buildInboxPath,
  getCurrentLineText,
  buildNewWordNote,
  mergeWordNote,
} = require('./helpers');

class RussianReadingAssistant extends obsidian.Plugin {
  async onload() {
    this.addCommand({
      id: 'capture-selected-russian-word',
      name: 'Capture Selected Russian Word to Inbox',
      editorCallback: async (editor, view) => {
        await this.captureSelectedWord(editor, view);
      },
    });

    this.addCommand({
      id: 'enter-immersion-mode',
      name: 'Enter Russian Immersion Mode',
      callback: () => this.enterImmersionMode(),
    });

    this.addCommand({
      id: 'enter-intensive-mode',
      name: 'Enter Russian Intensive Mode',
      callback: () => this.enterIntensiveMode(),
    });
  }

  async captureSelectedWord(editor, view) {
    const selection = editor.getSelection();
    if (!selection || !selection.trim()) {
      new obsidian.Notice('请先选中一个俄语词');
      return;
    }

    const parts = extractRussianSelectionParts(selection);
    const normalized = normalizeRussianWord(selection);
    if (!normalized) {
      new obsidian.Notice('没有检测到俄语词');
      return;
    }

    if (selection.includes('<mark class="ru-new-word">') || selection.includes('</mark>')) {
      new obsidian.Notice('这个词已经标记过');
      return;
    }

    const marked = `${parts.leading}<mark class="ru-new-word">${parts.word}</mark>${parts.trailing}`;
    editor.replaceSelection(marked);

    const sourceFile = view?.file;
    const sourcePath = sourceFile?.path || '';
    const sourceName = sourceFile?.basename || '当前笔记';
    const contextLine = getCurrentLineText(editor).replace(/<mark class="ru-new-word">(.+?)<\/mark>/g, '$1');
    const date = formatDate();
    const inboxPath = obsidian.normalizePath(buildInboxPath(parts.word));

    await this.ensureFolder('词汇/未归档');
    await this.createOrUpdateInboxNote({
      inboxPath,
      word: parts.word,
      normalized,
      date,
      sourcePath,
      sourceName,
      contextLine,
    });

    new obsidian.Notice(`已捕获生词：${parts.word}`);
  }

  async ensureFolder(path) {
    if (this.app.vault.getAbstractFileByPath(path)) return;
    await this.app.vault.createFolder(path);
  }

  async createOrUpdateInboxNote(payload) {
    const existing = this.app.vault.getAbstractFileByPath(payload.inboxPath);
    if (existing instanceof obsidian.TFile) {
      const current = await this.app.vault.read(existing);
      const next = mergeWordNote(current, payload);
      await this.app.vault.modify(existing, next);
      return;
    }

    const content = buildNewWordNote(payload);
    await this.app.vault.create(payload.inboxPath, content);
  }

  enterImmersionMode() {
    document.body.classList.add('ru-hide-zh');
    new obsidian.Notice('沉浸模式：中文译文已隐藏');
  }

  enterIntensiveMode() {
    document.body.classList.remove('ru-hide-zh');
    new obsidian.Notice('精读模式：中文译文已显示');
  }
}

module.exports = RussianReadingAssistant;
```

- [ ] **Step 2: Syntax check**

```powershell
node --check 'D:\MyStudySpace\俄语资料库\.obsidian\plugins\russian-reading-assistant\main.js'
```

Expected: no output and exit code 0.

- [ ] **Step 3: Enable plugin**

Modify `D:\MyStudySpace\俄语资料库\.obsidian\community-plugins.json` to:

```json
[
  "dataview",
  "templater-obsidian",
  "obsidian-style-settings",
  "russian-reading-assistant"
]
```

- [ ] **Step 4: Commit**

```powershell
cd D:\MyStudySpace
git add "俄语资料库/.obsidian/plugins/russian-reading-assistant/main.js" "俄语资料库/.obsidian/community-plugins.json"
git commit -m "feat(russian-reader): implement word capture with vault write"
```

- [ ] **Step 5: Manual verification in Obsidian**

1. Reload Obsidian (Ctrl+P → "Reload app without saving")
2. Open a note in `俄语资料库`
3. Add test text: `RU: Муромчане гордятся своими знаменитыми земляками.`
4. Select `Муромчане`, run command "Capture Selected Russian Word to Inbox"
5. Verify: `<mark class="ru-new-word">Муромчане</mark>` inserted in editor
6. Verify: file `词汇/未归档/муромчане.md` created with correct frontmatter

---

### Task 4: Prevent Same-Position Duplicate Marking

**Files:**
- Modify: `D:\MyStudySpace\俄语资料库\.obsidian\plugins\russian-reading-assistant\main.js`

- [ ] **Step 1: Add line-level duplicate detection**

Replace the existing duplicate check in `captureSelectedWord` (the `if (selection.includes(...))` block) with:

```javascript
    const cursor = editor.getCursor();
    const currentLine = editor.getLine(cursor.line);
    const alreadyMarked = new RegExp(
      `<mark class="ru-new-word">${parts.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}</mark>`
    ).test(currentLine);
    if (alreadyMarked) {
      new obsidian.Notice('这个词已经标记过');
      return;
    }
```

- [ ] **Step 2: Syntax check**

```powershell
node --check 'D:\MyStudySpace\俄语资料库\.obsidian\plugins\russian-reading-assistant\main.js'
```

Expected: no output and exit code 0.

- [ ] **Step 3: Commit**

```powershell
cd D:\MyStudySpace
git add "俄语资料库/.obsidian/plugins/russian-reading-assistant/main.js"
git commit -m "fix(russian-reader): line-level duplicate mark detection"
```

- [ ] **Step 4: Manual duplicate test**

1. In the test note, select the already highlighted `Муромчане`
2. Run "Capture Selected Russian Word to Inbox"
3. Expected: Notice says `这个词已经标记过`, no nested `<mark>`, file count unchanged

---

### Task 5: Implement RU/ZH Mode with MutationObserver

**Files:**
- Modify: `D:\MyStudySpace\俄语资料库\.obsidian\plugins\russian-reading-assistant\main.js`

- [ ] **Step 1: Add MutationObserver-based ZH hiding**

Add these methods to the `RussianReadingAssistant` class (after `createOrUpdateInboxNote`):

```javascript
  hideZhLines() {
    document.body.classList.add('ru-hide-zh');
    this.updateZhLineVisibility(true);
    if (this.zhObserver) return;
    this.zhObserver = new MutationObserver(() =>
      this.updateZhLineVisibility(document.body.classList.contains('ru-hide-zh'))
    );
    this.zhObserver.observe(document.body, { childList: true, subtree: true });
    this.register(() => this.zhObserver?.disconnect());
  }

  showZhLines() {
    document.body.classList.remove('ru-hide-zh');
    this.updateZhLineVisibility(false);
  }

  updateZhLineVisibility(hidden) {
    const paragraphs = document.querySelectorAll(
      '.markdown-preview-view p, .markdown-source-view .cm-line'
    );
    for (const el of paragraphs) {
      const text = el.textContent.trim();
      if (text.startsWith('ZH:')) {
        el.classList.toggle('ru-zh-hidden-line', hidden);
      }
    }
  }
```

Replace the mode methods:

```javascript
  enterImmersionMode() {
    this.hideZhLines();
    new obsidian.Notice('沉浸模式：中文译文已隐藏');
  }

  enterIntensiveMode() {
    this.showZhLines();
    new obsidian.Notice('精读模式：中文译文已显示');
  }
```

- [ ] **Step 2: Syntax check**

```powershell
node --check 'D:\MyStudySpace\俄语资料库\.obsidian\plugins\russian-reading-assistant\main.js'
```

Expected: no output and exit code 0.

- [ ] **Step 3: Commit**

```powershell
cd D:\MyStudySpace
git add "俄语资料库/.obsidian/plugins/russian-reading-assistant/main.js"
git commit -m "feat(russian-reader): MutationObserver-based ZH line hiding"
```

- [ ] **Step 4: Manual mode test**

1. Open a note with `RU:` / `ZH:` line pairs
2. Run "Enter Russian Immersion Mode"
3. Expected: all `ZH:` lines disappear globally
4. Switch to a different note with `ZH:` lines — they should also be hidden
5. Run "Enter Russian Intensive Mode"
6. Expected: all `ZH:` lines reappear

---

### Task 6: Final Verification

**Files:**
- Verify all plugin files. No new feature files.

- [ ] **Step 1: Run Node tests**

```powershell
node 'D:\MyStudySpace\俄语资料库\.obsidian\plugins\russian-reading-assistant\tests\helpers.test.js'
```

Expected: all tests print `PASS`.

- [ ] **Step 2: Syntax check all JS files**

```powershell
node --check 'D:\MyStudySpace\俄语资料库\.obsidian\plugins\russian-reading-assistant\main.js'
node --check 'D:\MyStudySpace\俄语资料库\.obsidian\plugins\russian-reading-assistant\helpers.js'
```

Expected: no output and exit code 0 for both.

- [ ] **Step 3: Verify file structure**

```powershell
Get-ChildItem -Recurse 'D:\MyStudySpace\俄语资料库\.obsidian\plugins\russian-reading-assistant\' | Select-Object Name, Length
```

Expected output:
```
manifest.json
helpers.js
main.js
styles.css
tests/
  helpers.test.js
```

- [ ] **Step 4: Commit final state**

```powershell
cd D:\MyStudySpace
git add "俄语资料库/.obsidian/plugins/russian-reading-assistant/"
git commit -m "chore(russian-reader): final verification pass"
```

- [ ] **Step 5: Manual acceptance checklist**

Verify each item in Obsidian:

- [ ] Selecting a Russian word and running capture inserts `<mark class="ru-new-word">word</mark>`
- [ ] Selecting non-Russian text shows notice and does not modify note
- [ ] Selecting a word with punctuation leaves punctuation outside `<mark>`
- [ ] `词汇/未归档/<normalized>.md` is created with correct frontmatter
- [ ] Re-marking the same already-marked line is skipped
- [ ] Marking the same word in a new line increments count
- [ ] Immersion mode hides `ZH:` lines globally
- [ ] Intensive mode shows `ZH:` lines
- [ ] Switching notes while in immersion mode keeps `ZH:` lines hidden

---

## Self-Review

- **Spec coverage:** All confirmed v1 requirements covered: 3 commands, word capture to inbox, `<mark>` annotation, duplicate detection, `ZH:` hiding with MutationObserver. No gaps.
- **Placeholder scan:** No TBD, TODO, or deferred requirements. All code blocks are complete.
- **Type consistency:** Helper function names (`extractRussianSelectionParts`, `normalizeRussianWord`, `buildInboxPath`, `getCurrentLineText`, `buildNewWordNote`, `mergeWordNote`) are consistent between `helpers.js` exports, test imports, and `main.js` imports. CSS class names (`ru-new-word`, `ru-zh-hidden-line`) consistent between `styles.css` and `main.js`.
