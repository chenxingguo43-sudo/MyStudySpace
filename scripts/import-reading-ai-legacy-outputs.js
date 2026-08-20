/* Import the remaining reviewed web outputs whose older Markdown formats vary.
 * The importer never changes answers. It creates locate anchors only for
 * evidence that can be found in Reader's current Russian source paragraphs.
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const safety = require('./import-reading-answer-audit-web-inputs.js');

const root = path.resolve(__dirname, '..');
const dataRoot = path.join(root, 'data', 'textbook', 'reading_speaking');
const backupRoot = path.join(root, 'docs', 'reader-ai-reading', 'legacy-analysis-sync-backup-2026-08-20');

const packages = [
  ['01-1.1.1', 'ch0000.json', 'packages'], ['02-1.1.2', 'ch0001.json', 'packages'],
  ['03-1.2.1', 'ch0002.json', 'packages'], ['04-1.2.2', 'ch0003.json', 'packages'],
  ['06-1.3.2', 'ch0005.json', 'packages'], ['07-1.4.1', 'ch0006.json', 'packages'],
  ['11-2.1.1', 'ch0010.json', 'packages'], ['12-2.1.2', 'ch0011.json', 'packages'],
  ['13-2.2.1', 'ch0012.json', 'packages'], ['14-2.2.2', 'ch0013.json', 'packages'],
  ['15-2.3.1', 'ch0014.json', 'answer-audit/web-inputs-12'], ['16-2.3.2', 'ch0015.json', 'packages'],
  ['17-2.4.1', 'ch0016.json', 'packages'], ['20-2.5.2', 'ch0019.json', 'packages'],
  ['23-3.2.1', 'ch0022.json', 'answer-audit/web-inputs-12'],
  ['01-2.4.2', 'ch0017.json', 'reocr-batches/web-inputs-7'], ['02-3.1.1', 'ch0020.json', 'reocr-batches/web-inputs-7']
];

function outputPath(packageName, directory) {
  return path.join(root, 'docs', 'reader-ai-reading', directory, packageName, 'output', 'analysis.md');
}

function splitBlocks(markdown, expected) {
  const markers = [...markdown.matchAll(/(?:#{1,4}\s*)?(?:第\s*)?(\d+)\s*题\s*原文证据/gm)];
  const start = markers.findIndex((_, index) => markers.slice(index, index + expected)
    .every((marker, offset) => Number(marker[1]) === offset + 1));
  const selected = start >= 0 ? markers.slice(start, start + expected) : [];
  return selected.map((marker, index) => ({
    num: Number(marker[1]),
    body: `原文证据${markdown.slice(marker.index + marker[0].length, selected[index + 1] ? selected[index + 1].index : markdown.length)}`
  }));
}

function sliceByMarkers(body, start, ends) {
  const index = body.indexOf(start);
  if (index < 0) return '';
  const contentStart = index + start.length;
  let contentEnd = body.length;
  for (const end of ends) {
    const candidate = body.indexOf(end, contentStart);
    if (candidate >= 0 && candidate < contentEnd) contentEnd = candidate;
  }
  return body.slice(contentStart, contentEnd).trim();
}

function expectedAnswerMention(body, answer) {
  return new RegExp(`(?:正确答案(?:是)?|答案)\\s*[:：]?\\s*${answer}(?:\\)|\\s|$)`, 'i').test(body)
    || new RegExp(`为什么正确答案是\\s*${answer}`, 'i').test(body);
}

function extractEvidence(body) {
  const section = sliceByMarkers(body, '原文证据', ['为什么正确答案是', 'why正确答案是', '其他选项为什么错', '易错提醒', '一句话复盘']);
  const quoted = [...section.matchAll(/[«“]([^»”\r\n]{8,})[»”]/g)]
    .map((match) => match[1].trim()).filter((quote) => /[А-Яа-яЁё]/.test(quote));
  const paragraphQuotes = [...section.matchAll(/第\s*\d+\s*段(?:（俄语原文）)?\s*[:：]\s*([^\r\n]+?)(?=(?:第\s*\d+\s*段（中文翻译）|为什么正确答案是|why正确答案是|其他选项为什么错|易错提醒|一句话复盘|$))/g)]
    .map((match) => match[1].trim()).filter((quote) => /[А-Яа-яЁё]/.test(quote));
  return { section, quotes: [...new Set([...quoted, ...paragraphQuotes])] };
}

function parseReasons(body) {
  const section = sliceByMarkers(body, '其他选项为什么错', ['易错提醒', '一句话复盘', '证据完整性检查']);
  const reasons = new Map();
  const marker = /(?:^|\n|\s)([абвАБВ])(?:\)|：|:)(.*?)(?=(?:\s[абвАБВ](?:\)|：|:))|易错提醒|一句话复盘|证据完整性检查|$)/gs;
  for (const match of section.matchAll(marker)) reasons.set(match[1].toLowerCase(), match[2].trim());
  return { section, reasons };
}

function uiTokens(value) {
  return String(value || '').toLowerCase().replace(/ё/g, 'е').split(/\s+/)
    .map((word) => word.replace(/[^а-яa-z0-9-]/g, '')).filter(Boolean);
}

function paragraphContainsQuote(paragraph, quote) {
  const left = uiTokens(paragraph);
  const right = uiTokens(quote);
  if (!right.length) return false;
  for (let start = 0; start <= left.length - right.length; start += 1) {
    if (right.every((token, offset) => left[start + offset] === token)) return true;
  }
  return false;
}

function buildAnalysis(block, exercise, original) {
  const evidence = extractEvidence(block.body);
  const correctReason = sliceByMarkers(block.body, `为什么正确答案是 ${exercise.answer}`, ['其他选项为什么错', '易错提醒', '一句话复盘', '证据完整性检查'])
    || sliceByMarkers(block.body, `why正确答案是 ${exercise.answer}`, ['其他选项为什么错', '易错提醒', '一句话复盘', '证据完整性检查']);
  const pitfall = sliceByMarkers(block.body, '易错提醒', ['一句话复盘', '证据完整性检查']);
  const review = sliceByMarkers(block.body, '一句话复盘', ['证据完整性检查']);
  const reasons = parseReasons(block.body).reasons;
  const verifiedQuotes = evidence.quotes.filter((quote) => original.some((paragraph) => paragraphContainsQuote(paragraph, quote)));
  const anchors = verifiedQuotes.map((quote, index) => {
    const paragraphIndex = original.findIndex((paragraph) => paragraphContainsQuote(paragraph, quote));
    return { id: `q${block.num}-evidence-${index + 1}`, paragraphIndex, quote, role: '支持正确答案' };
  });
  const flags = [];
  if (!expectedAnswerMention(block.body, exercise.answer)) flags.push('网页端未能明确复述当前 Reader 的答案字母');
  if (!evidence.quotes.length) flags.push('网页端未提供可提取的俄语引文');
  if (!correctReason) flags.push('网页端缺少正确答案理由分段');
  if (!pitfall) flags.push('网页端缺少易错提醒');
  if (!review) flags.push('网页端缺少一句话复盘');
  if (!verifiedQuotes.length) flags.push('没有可在当前 Reader 原文定位的证据；保留网页端说明但不提供定位按钮');
  const options = (exercise.options || []).map((option) => {
    const match = String(option).match(/^\s*([абвАБВ])\)/);
    const key = match ? match[1].toLowerCase() : '';
    return {
      key,
      status: key === exercise.answer ? 'correct' : 'wrong',
      terms: [],
      reason: key === exercise.answer ? (correctReason || '网页端已根据原文说明正确项。') : (reasons.get(key) || '网页端未提供该选项的单独说明。')
    };
  });
  return {
    analysis: {
      version: 'reading-evidence-v2',
      provenance: { kind: 'ai-generated', provider: 'ChatGPT', runId: 'legacy-web-output-sync', reviewStatus: 'accepted-by-user' },
      conclusion: `正确答案是 ${exercise.answer}。${correctReason || ''}`.trim(),
      correctReason: correctReason || '网页端未按当前结构单独输出理由；请结合原文证据阅读。',
      evidence: { ru: evidence.quotes.join('\n'), zh: '' },
      evidenceItems: anchors.map((anchor) => ({ ...anchor, quoteRu: anchor.quote, quoteZh: '' })),
      mappings: [],
      options,
      pitfall: pitfall || '网页端未提供易错提醒。',
      nextCheck: flags.join('；'),
      review: review || '请回看本题原文证据。'
    },
    anchors,
    flags,
    sourceQuotes: evidence.quotes.length,
    anchorsFound: anchors.length
  };
}

function importOne(packageName, chapterFile, directory, dryRun) {
  const chapterPath = path.join(dataRoot, chapterFile);
  const chapter = JSON.parse(fs.readFileSync(chapterPath, 'utf8'));
  const output = fs.readFileSync(outputPath(packageName, directory), 'utf8');
  const blocks = splitBlocks(output, chapter.exercises.length);
  if (blocks.length !== chapter.exercises.length) throw new Error(`${packageName}: expected ${chapter.exercises.length} question blocks, found ${blocks.length}`);
  const seen = new Set();
  let flags = 0; let anchors = 0; let quotes = 0;
  for (const block of blocks) {
    if (seen.has(block.num)) throw new Error(`${packageName}: repeated question ${block.num}`);
    seen.add(block.num);
    const exercise = chapter.exercises.find((item) => Number(item.num) === block.num);
    if (!exercise) throw new Error(`${packageName}: question ${block.num} is not in Reader`);
    const parsed = buildAnalysis(block, exercise, chapter.original || []);
    exercise.answerAnalysis = parsed.analysis;
    exercise.evidenceAnchors = parsed.anchors;
    flags += parsed.flags.length; anchors += parsed.anchorsFound; quotes += parsed.sourceQuotes;
  }
  if (!dryRun) fs.writeFileSync(chapterPath, `${JSON.stringify(chapter, null, 2)}\n`, 'utf8');
  return { packageName, chapterFile, questions: blocks.length, quotes, anchors, flags };
}

function main() {
  const dryRun = process.argv.includes('--dry-run');
  if (!dryRun) fs.mkdirSync(backupRoot, { recursive: true });
  const results = [];
  for (const [packageName, chapterFile, directory] of packages) {
    try {
      if (!dryRun) fs.copyFileSync(path.join(dataRoot, chapterFile), path.join(backupRoot, chapterFile));
      results.push(importOne(packageName, chapterFile, directory, dryRun));
    } catch (error) {
      throw new Error(`${packageName}: ${error.message}`);
    }
  }
  console.log(JSON.stringify({ dryRun, backupRoot: dryRun ? null : backupRoot, results }, null, 2));
}

if (require.main === module) main();

module.exports = { splitBlocks, extractEvidence, paragraphContainsQuote, buildAnalysis, importOne };
