/* Import the reviewed answer-audit web outputs into Reader safely.
 * Evidence is validated against the refreshed input package. A locate anchor
 * is added only when the same quote exists in Reader's current original text.
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const dataRoot = path.join(root, 'data', 'textbook', 'reading_speaking');
const packageRoot = path.join(root, 'docs', 'reader-ai-reading', 'answer-audit', 'web-inputs-12');
const backupRoot = path.join(root, 'docs', 'reader-ai-reading', 'answer-audit', `reader-sync-backup-${new Date().toISOString().slice(0, 10)}`);

const packages = [
  ['01-1.4.2', 'ch0007.json'], ['02-1.5.1', 'ch0008.json'], ['03-1.5.2', 'ch0009.json'],
  ['04-2.5.1', 'ch0018.json'], ['05-3.1.2', 'ch0021.json'], ['06-3.2.2', 'ch0023.json'],
  ['07-3.3.1', 'ch0024.json'], ['08-3.3.2', 'ch0025.json'], ['09-3.4.1', 'ch0026.json'],
  ['10-3.4.2', 'ch0027.json'], ['11-3.5.1', 'ch0028.json'], ['12-3.5.2', 'ch0029.json']
];

function normalize(value) {
  return String(value || '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/[*_`]/g, '')
    .replace(/ё/g, 'е').replace(/Ё/g, 'Е')
    .replace(/\s+/g, ' ').trim();
}

function looseNormalize(value) {
  const confusables = {
    a: 'а', c: 'с', e: 'е', i: 'и', k: 'к', m: 'м', o: 'о', p: 'р', t: 'т', x: 'х', y: 'у',
    A: 'А', C: 'С', E: 'Е', I: 'И', K: 'К', M: 'М', O: 'О', P: 'Р', T: 'Т', X: 'Х', Y: 'У'
  };
  return normalize(value).replace(/[aAceEiIkKmMoOpPtTxXyY]/g, (letter) => confusables[letter] || letter)
    .toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
}

function splitQuestions(markdown) {
  const markers = [...markdown.matchAll(/^第\s*(\d+)\s*题\s*$/gm)];
  return markers.map((marker, index) => ({
    num: Number(marker[1]),
    body: markdown.slice(marker.index + marker[0].length, markers[index + 1] ? markers[index + 1].index : markdown.length)
  }));
}

function headingBody(body, heading, nextHeadings) {
  const lines = body.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim() === heading);
  if (start < 0) return '';
  const selected = [];
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (nextHeadings.some((item) => line === item)) break;
    selected.push(lines[index]);
  }
  return selected.join('\n').trim();
}

function extractQuotes(body) {
  return [
    ...body.matchAll(/«([^»\r\n]{8,})»/g),
    ...body.matchAll(/“([^”\r\n]{8,})”/g)
  ].map((match) => match[1].trim()).filter((quote) => /[А-Яа-яЁё]/.test(quote));
}

function sourceTextFromInput(input) {
  const start = input.indexOf('## 二、全书 MinerU Markdown 原文');
  const end = input.indexOf('## 三、Reader 题目与已确认答案');
  if (start < 0 || end < 0 || end <= start) throw new Error('input.md source section not found');
  return input.slice(start, end);
}

function parseOptionReasons(body) {
  const section = headingBody(body, '其他选项为什么错', ['易错提醒', '一句话复盘', '证据完整性检查']);
  const reasons = new Map();
  for (const match of section.matchAll(/^\s*[-*]?\s*([а-яА-Яa-zA-Z])\)\s*(.+)$/gim)) {
    reasons.set(match[1].toLowerCase(), match[2].trim());
  }
  return reasons;
}

function quoteMatchesSource(quote, source) {
  const direct = normalize(source).includes(normalize(quote)) || looseNormalize(source).includes(looseNormalize(quote));
  if (direct) return true;
  if (!quote.includes('...')) return false;
  let cursor = 0;
  const haystack = looseNormalize(source);
  for (const part of quote.split('...').map(looseNormalize).filter(Boolean)) {
    const found = haystack.indexOf(part, cursor);
    if (found < 0) return false;
    cursor = found + part.length;
  }
  return true;
}

function parseQuestionAnalysis(block, exercise, sourceText, readerOriginal) {
  const evidenceBody = headingBody(block.body, '原文证据', ['为什么正确答案是 а', '为什么正确答案是 б', '为什么正确答案是 в', '其他选项为什么错', '易错提醒', '一句话复盘']);
  const quoted = extractQuotes(evidenceBody);
  if (!quoted.length) throw new Error(`Question ${block.num}: no quoted Russian evidence`);
  const quotes = quoted.filter((quote) => quoteMatchesSource(quote, sourceText));
  const rejectedQuotes = quoted.filter((quote) => !quoteMatchesSource(quote, sourceText));
  if (!quotes.length) throw new Error(`Question ${block.num}: no quoted evidence could be verified against refreshed input`);
  const correctReason = headingBody(block.body, `为什么正确答案是 ${exercise.answer}`, ['其他选项为什么错', '易错提醒', '一句话复盘', '证据完整性检查']);
  const pitfall = headingBody(block.body, '易错提醒', ['一句话复盘', '证据完整性检查']);
  const review = headingBody(block.body, '一句话复盘', ['证据完整性检查']);
  if (!correctReason || !pitfall || !review) throw new Error(`Question ${block.num}: incomplete analysis sections`);
  const optionReasons = parseOptionReasons(block.body);
  const evidenceItems = quotes.map((quote, index) => ({
    id: `q${block.num}-evidence-${index + 1}`,
    paragraphIndex: -1,
    quoteRu: quote,
    quoteZh: '',
    role: '支持正确答案'
  }));
  const anchors = [];
  for (const item of evidenceItems) {
    const idx = item.quoteRu.includes('...') ? -1 : (readerOriginal || []).findIndex((paragraph) => normalize(paragraph).includes(normalize(item.quoteRu)) || looseNormalize(paragraph).includes(looseNormalize(item.quoteRu)));
    if (idx >= 0) {
      item.paragraphIndex = idx;
      anchors.push({ id: item.id, paragraphIndex: idx, quote: item.quoteRu, role: item.role });
    }
  }
  const options = (exercise.options || []).map((option) => {
    const match = String(option).match(/^\s*([а-яА-Яa-zA-Z])\)/);
    const key = match ? match[1].toLowerCase() : '';
    return { key, status: key === exercise.answer ? 'correct' : 'wrong', terms: [], reason: key === exercise.answer ? correctReason : (optionReasons.get(key) || '网页端解析未提供单独的该选项说明') };
  });
  return {
    analysis: {
      version: 'reading-evidence-v2',
      provenance: { kind: 'ai-generated', provider: 'ChatGPT', runId: 'answer-audit-web-inputs-12', reviewStatus: 'accepted-by-user' },
      conclusion: `正确答案是 ${exercise.answer}。${correctReason}`,
      correctReason,
      evidence: { ru: quotes.join('\n'), zh: '' },
      evidenceItems,
      mappings: [],
      options,
      pitfall,
      nextCheck: rejectedQuotes.length ? `网页端有 ${rejectedQuotes.length} 处俄语引文无法逐字匹配刷新后的 OCR，未作为 Reader 证据导入；需要人工复核。` : '',
      review
    },
    anchors,
    quoteCount: quotes.length,
    anchorCount: anchors.length,
    rejectedQuoteCount: rejectedQuotes.length
  };
}

function importPackage(packageName, chapterFile, dryRun = false) {
  const chapterPath = path.join(dataRoot, chapterFile);
  const inputPath = path.join(packageRoot, packageName, 'input.md');
  const analysisPath = path.join(packageRoot, packageName, 'output', 'analysis.md');
  const chapter = JSON.parse(fs.readFileSync(chapterPath, 'utf8'));
  const input = fs.readFileSync(inputPath, 'utf8');
  const analysis = fs.readFileSync(analysisPath, 'utf8');
  const sourceText = sourceTextFromInput(input);
  const blocks = splitQuestions(analysis);
  if (blocks.length !== chapter.exercises.length) throw new Error(`${packageName}: output ${blocks.length} questions, Reader ${chapter.exercises.length}`);
  let quotes = 0; let anchors = 0; let rejectedQuotes = 0;
  for (const block of blocks) {
    const exercise = chapter.exercises.find((item) => Number(item.num) === block.num);
    if (!exercise) throw new Error(`${packageName}: question ${block.num} not found`);
    const result = parseQuestionAnalysis(block, exercise, sourceText, chapter.original);
    exercise.answerAnalysis = result.analysis;
    exercise.evidenceAnchors = result.anchors;
    quotes += result.quoteCount; anchors += result.anchorCount; rejectedQuotes += result.rejectedQuoteCount;
  }
  if (!dryRun) fs.writeFileSync(chapterPath, `${JSON.stringify(chapter, null, 2)}\n`, 'utf8');
  return { packageName, chapterFile, questions: blocks.length, quotes, anchors, rejectedQuotes };
}

function main() {
  const dryRun = process.argv.includes('--dry-run');
  if (!dryRun) fs.mkdirSync(backupRoot, { recursive: true });
  const results = [];
  for (const [packageName, chapterFile] of packages) {
    try {
      if (!dryRun) fs.copyFileSync(path.join(dataRoot, chapterFile), path.join(backupRoot, chapterFile));
      results.push(importPackage(packageName, chapterFile, dryRun));
    } catch (error) {
      throw new Error(`${packageName}: ${error.message}`);
    }
  }
  console.log(JSON.stringify({ dryRun, backupRoot: dryRun ? null : backupRoot, results }, null, 2));
}

if (require.main === module) main();

module.exports = { normalize, looseNormalize, splitQuestions, sourceTextFromInput, parseQuestionAnalysis, importPackage };
