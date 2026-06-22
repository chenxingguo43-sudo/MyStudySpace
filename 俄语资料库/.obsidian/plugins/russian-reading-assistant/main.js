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
