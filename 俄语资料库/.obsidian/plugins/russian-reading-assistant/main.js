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

  onunload() {
    document.body.classList.remove('ru-hide-zh');
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

    const cursor = editor.getCursor();
    const currentLine = editor.getLine(cursor.line);
    const alreadyMarked = new RegExp(
      `<mark class="ru-new-word">${parts.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}</mark>`
    ).test(currentLine);
    if (alreadyMarked) {
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

  enterImmersionMode() {
    this.hideZhLines();
    new obsidian.Notice('沉浸模式：中文译文已隐藏');
  }

  enterIntensiveMode() {
    this.showZhLines();
    new obsidian.Notice('精读模式：中文译文已显示');
  }
}

module.exports = RussianReadingAssistant;
