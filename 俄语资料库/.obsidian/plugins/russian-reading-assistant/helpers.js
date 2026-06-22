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
  // Handle inline empty array: sources: []
  if (content.includes(`${key}: []`)) {
    return content.replace(`${key}: []`, `${key}:\n  - ${quoted}`);
  }
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
