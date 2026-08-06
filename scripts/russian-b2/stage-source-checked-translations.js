#!/usr/bin/env node
'use strict';

// Imports only one-to-one textbook translation pairs into a rebuild staging unit.
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const SOURCE_FILE = path.join(
  ROOT,
  '俄语资料库',
  'В мире людей 听力口语 Markdown版',
  '翻译',
  'Тема 1.7 -- ТРКИ-2 采访（Интервью） -- 中文对照.md'
);
const UNITS_DIR = path.join(ROOT, 'data', 'textbook', 'listening_speaking', 'rebuild', 'units');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function normalize(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[—–]/g, '-')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

function splitRussian(value, splitEllipses) {
  return String(value || '')
    .replace(/\.\.\./g, '…')
    .split(splitEllipses ? /(?<=[.!?…])\s+(?=[А-ЯЁ«])/u : /(?<=[.!?])\s+(?=[А-ЯЁ«])/u)
    .map(item => item.replace(/…/g, '...').trim())
    .filter(Boolean);
}

function splitChinese(value, splitEllipses) {
  return String(value || '')
    .split(splitEllipses ? /(?<=[。！？]|……)\s*/u : /(?<=[。！？])\s*/u)
    .map(item => item.trim())
    .filter(Boolean);
}

function stripSpeaker(value, chinese) {
  // Dialogue source blocks may repeat a bold speaker label before every turn.
  // Remove every such label before matching the textbook sentences.
  const withoutBoldLabels = String(value || '').replace(/\*\*[^*\r\n]+:\*\*\s*/gmu, '');
  return withoutBoldLabels.replace(chinese ? /^[^：\n]+：\s*/u : /^[^:\n]+:\s*/u, '');
}

function cleanTranslation(value) {
  return String(value || '')
    .replace(/^\*\*[^*\r\n]+[:：]\*\*\s*/u, '')
    .replace(/^\*+\s*/u, '')
    .trim();
}

function splitSourceBlocks(value) {
  return String(value || '').split(/\n\s*\n/u).map(item => item.trim()).filter(Boolean);
}

function parallelBlockPairs(rawRussian, rawChinese) {
  const russianBlocks = splitSourceBlocks(rawRussian);
  const chineseBlocks = splitSourceBlocks(rawChinese);
  if (!russianBlocks.length || russianBlocks.length !== chineseBlocks.length) return [];
  const pairs = [];
  for (let index = 0; index < russianBlocks.length; index += 1) {
    const russianBlock = stripSpeaker(russianBlocks[index], false);
    const chineseBlock = stripSpeaker(chineseBlocks[index], true);
    const variants = [
      [splitRussian(russianBlock, false), splitChinese(chineseBlock, false)],
      [splitRussian(russianBlock, true), splitChinese(chineseBlock, true)],
      [splitRussian(russianBlock, true), splitChinese(chineseBlock, false)],
      [splitRussian(russianBlock, false), splitChinese(chineseBlock, true)]
    ];
    const accepted = variants.find(([russian, chinese]) => russian.length && russian.length === chinese.length);
    if (!accepted) return [];
    pairs.push({ russian: accepted[0], chinese: accepted[1], rawRussian: russianBlock, rawChinese: chineseBlock });
  }
  return pairs;
}

function readPairs(sourceFile) {
  const text = fs.readFileSync(sourceFile, 'utf8');
  const pattern = /\*\*俄语原文：\*\*\s*([\s\S]*?)\s*\*\*中文翻译：\*\*\s*([\s\S]*?)(?=\n---|\n###|\n####|\n\*\*俄语原文：\*\*|$)/g;
  const pairs = [];
  let match;
  while ((match = pattern.exec(text))) {
    const blocks = parallelBlockPairs(match[1], match[2]);
    if (blocks.length) {
      pairs.push(...blocks);
      continue;
    }
    const rawRussian = stripSpeaker(match[1], false);
    const rawChinese = stripSpeaker(match[2], true);
    const russian = splitRussian(rawRussian, false);
    const chinese = splitChinese(rawChinese, false);
    if (russian.length && russian.length === chinese.length) {
      pairs.push({ russian, chinese, rawRussian, rawChinese });
    } else if (rawRussian && rawChinese) {
      pairs.push({ russian: [], chinese: [], rawRussian, rawChinese });
    }
  }
  return pairs;
}

function buildMapping(unit, sourceFile) {
  const candidates = new Map();
  for (const pair of readPairs(sourceFile)) {
    pair.russian.forEach((russian, index) => {
      const key = normalize(russian);
      if (!key || !pair.chinese[index]) return;
      const existing = candidates.get(key) || new Set();
      existing.add(cleanTranslation(pair.chinese[index]));
      candidates.set(key, existing);
    });
    const expected = normalize(pair.rawRussian);
    const chinese = splitChinese(pair.rawChinese, false);
    for (let start = 0; start < unit.segments.length; start += 1) {
      let joined = '';
      for (let end = start; end < unit.segments.length; end += 1) {
        joined += (joined ? ' ' : '') + unit.segments[end].text;
        if (normalize(joined) !== expected) continue;
        if (chinese.length === end - start + 1) {
          chinese.forEach((translation, offset) => {
            const key = normalize(unit.segments[start + offset].text);
            const existing = candidates.get(key) || new Set();
            existing.add(cleanTranslation(translation));
            candidates.set(key, existing);
          });
        }
        break;
      }
    }
  }
  const missing = [];
  const ambiguous = [];
  const translations = new Map();
  for (const segment of unit.segments || []) {
    const options = [...(candidates.get(normalize(segment.text)) || [])];
    if (!options.length) missing.push(segment.segmentId);
    else if (options.length > 1) ambiguous.push({ segmentId: segment.segmentId, options });
    else translations.set(segment.segmentId, options[0]);
  }
  return { translations, missing, ambiguous };
}

function main() {
  const index = String(process.argv[2] || '').padStart(4, '0');
  const dryRun = process.argv.includes('--dry-run');
  const allowMissing = process.argv.includes('--allow-missing');
  const sourceArg = process.argv.slice(3).find(value => !value.startsWith('--'));
  const sourceFile = sourceArg ? path.resolve(ROOT, sourceArg) : SOURCE_FILE;
  if (!/^\d{4}$/.test(index)) throw new Error('Usage: stage-source-checked-translations.js <chapter number> [translation-source-path] [--dry-run]');
  if (!fs.existsSync(sourceFile)) throw new Error('translation source file does not exist: ' + sourceFile);
  const unitPath = path.join(UNITS_DIR, `ch${index}.learning.json`);
  const unit = readJson(unitPath);
  const result = buildMapping(unit, sourceFile);
  if (result.ambiguous.length || (result.missing.length && !allowMissing)) {
    throw new Error(JSON.stringify({ missing: result.missing, ambiguous: result.ambiguous }, null, 2));
  }
  if (!dryRun) {
    unit.segments = unit.segments.map(segment => result.translations.has(segment.segmentId)
      ? { ...segment, translation: result.translations.get(segment.segmentId) }
      : segment);
    if (!result.missing.length) {
      unit.learningSupport = {
        status: 'source-checked',
        sourceFile: path.relative(ROOT, sourceFile).replace(/\\/g, '/'),
        translationSourceStatus: 'needs_review'
      };
    }
    fs.writeFileSync(unitPath, JSON.stringify(unit, null, 2) + '\n', 'utf8');
  }
  console.log(JSON.stringify({ chapter: `ch${index}`, translated: result.translations.size, missing: result.missing, dryRun }, null, 2));
}

try {
  main();
} catch (error) {
  console.error('ERROR: ' + error.message);
  process.exitCode = 1;
}
