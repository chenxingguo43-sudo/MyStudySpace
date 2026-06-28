#!/usr/bin/env node
// Build a conservative small-sample source-example match set for the sealed
// "В мире людей 阅读口语 Markdown版" corpus. This script is intentionally read-only
// toward the sealed corpus and writes only inside _data/source_examples/.

const fs = require('fs');
const path = require('path');

const BOOK_ROOT = path.resolve(__dirname, '..', '..');
const STUDY_ROOT = path.resolve(BOOK_ROOT, '..', '..');
const VOCAB_FILE = path.join(STUDY_ROOT, 'data', 'vocabulary.json');
const CHAPTER_DIR = path.join(BOOK_ROOT, '章节');
const OUT_JSON = path.join(__dirname, 'sample_matches.json');
const OUT_REPORT = path.join(__dirname, 'sample_report.md');

const MAX_WORDS = 50;
const MAX_EXAMPLES_PER_WORD = 3;
const MIN_SENTENCE_LEN = 35;
const MAX_SENTENCE_LEN = 260;

const EXCLUDED_FILES = new Set([
  'приложение-лексика.md',
]);

const STOPWORDS = new Set([
  'быть', 'есть', 'это', 'этот', 'эта', 'эти', 'как', 'так', 'что', 'чтобы',
  'если', 'или', 'для', 'при', 'над', 'под', 'без', 'его', 'она', 'они',
  'оно', 'уже', 'ещё', 'очень', 'можно', 'нужно', 'который', 'которая',
  'которые', 'которое', 'свой', 'своя', 'свои', 'один', 'два',
]);

const ALLOWED_VOCAB_SOURCES = new Set(['vocab']);
const ALLOWED_VOCAB_TYPES = new Set([
  'vocab', '高频词', 'noun', 'verb', 'adj', 'adv', 'particle', 'phrase',
]);

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function normalizeRu(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ё/g, 'е')
    .replace(/Ё/g, 'Е')
    .toLowerCase();
}

function ruTokens(text) {
  const normalized = normalizeRu(text);
  return normalized.match(/[а-я]+(?:-[а-я]+)*/g) || [];
}

function stemToken(token) {
  const t = normalizeRu(token);
  if (t.length < 5) return t;
  return t
    .replace(/(иями|ями|ами|его|ого|ему|ому|ыми|ими|ать|ять|ить|ешь|ете|ют|ут|ят|ит|ет|ой|ый|ий|ая|ое|ые|ую|юю|ом|ем|ах|ях|ов|ев|ей|ам|ям|ой|ей|а|я|ы|и|у|ю|е|о)$/u, '');
}

function isSingleRussianWord(word) {
  const normalized = normalizeRu(word).trim();
  return /^[а-я-]{4,}$/.test(normalized) && !STOPWORDS.has(normalized);
}

function cleanMarkdown(src) {
  let s = src.replace(/^---[\s\S]*?---\s*/m, '');
  s = s.replace(/```[\s\S]*?```/g, '\n');
  s = s.replace(/%%[\s\S]*?%%/g, '\n');
  s = s.replace(/<!--[\s\S]*?-->/g, '');
  return s;
}

function splitSentences(text) {
  const protectedText = text
    .replace(/\b([А-ЯЁ])\./g, '$1<dot>')
    .replace(/(\d)\.(\d)/g, '$1<dot>$2');
  return protectedText
    .split(/(?<=[.!?…])\s+(?=[—«"А-ЯЁ])/u)
    .map(s => s.replace(/<dot>/g, '.').trim())
    .filter(Boolean);
}

function lineLooksLikeExercise(line) {
  const t = line.trim();
  if (!t) return true;
  if (t.startsWith('>')) return true;
  if (t.startsWith('|')) return true;
  if (/^[-*]\s/.test(t)) return true;
  if (/^#{1,6}\s/.test(t)) return true;
  if (/^\d+\./.test(t)) return true;
  if (/^\*\*?(Задание|Выберите|Ваша задача|ТЕСТ)/i.test(t)) return true;
  if (/^\(?(а|б|в|г)\)/i.test(t)) return true;
  if (/ТРКИ-2|原书|返回索引|source pages|Качество OCR/i.test(t)) return true;
  return false;
}

function extractCorpusSentences() {
  const files = fs.readdirSync(CHAPTER_DIR)
    .filter(name => name.endsWith('.md') && !EXCLUDED_FILES.has(name))
    .sort();
  const sentences = [];

  for (const fileName of files) {
    const full = path.join(CHAPTER_DIR, fileName);
    const src = cleanMarkdown(fs.readFileSync(full, 'utf8'));
    let currentHeading = '';
    let currentPages = '';

    for (const rawLine of src.split(/\r?\n/)) {
      const line = rawLine.trim();
      const headingMatch = line.match(/^#{1,3}\s+(.+?)(?:\s+\^[-\w]+)?$/);
      if (headingMatch) {
        currentHeading = headingMatch[1].replace(/\s+\^[-\w]+$/, '').trim();
        continue;
      }
      const pageMatch = rawLine.match(/%%\s*pages?:\s*([^;%]+).*?%%/i);
      if (pageMatch) {
        currentPages = pageMatch[1].trim();
        continue;
      }
      if (lineLooksLikeExercise(line)) continue;
      if (!/[.!?…]/.test(line)) continue;

      for (const sentence of splitSentences(line)) {
        const clean = sentence
          .replace(/\*\*/g, '')
          .replace(/\[\[([^\]|]+)\|?([^\]]*)\]\]/g, (_, a, b) => b || a)
          .trim();
        if (clean.length < MIN_SENTENCE_LEN || clean.length > MAX_SENTENCE_LEN) continue;
        if (!/[а-яА-ЯёЁ]{4}/.test(clean)) continue;
        if (/Задание|Выберите|Прочитайте|Ваша задача|ТЕСТ/i.test(clean)) continue;
        sentences.push({
          sentence_id: `vmire-sample-${String(sentences.length + 1).padStart(4, '0')}`,
          ru: clean,
          source_file: `章节/${fileName}`,
          source_title: currentHeading || fileName.replace(/\.md$/, ''),
          page_or_location: currentPages || '',
          tokens: ruTokens(clean),
        });
      }
    }
  }

  return sentences;
}

function buildTokenIndex(sentences) {
  const index = new Map();
  for (const sentence of sentences) {
    const keys = new Set();
    for (const token of sentence.tokens) {
      if (token.length < 4 || STOPWORDS.has(token)) continue;
      keys.add(token);
    }
    for (const key of keys) {
      if (!index.has(key)) index.set(key, []);
      index.get(key).push(sentence);
    }
  }
  return index;
}

function chooseVocabEntries(vocab, tokenIndex) {
  const entries = [];
  const seenWords = new Set();
  for (const item of vocab) {
    if (!ALLOWED_VOCAB_SOURCES.has(String(item.source || ''))) continue;
    if (item.type && !ALLOWED_VOCAB_TYPES.has(String(item.type))) continue;
    const word = String(item.word || '').trim();
    const normalized = normalizeRu(word);
    if (!isSingleRussianWord(word)) continue;
    if (seenWords.has(normalized)) continue;
    seenWords.add(normalized);

    const direct = tokenIndex.get(normalized) || [];
    if (!direct.length) continue;
    const stem = stemToken(normalized);

    entries.push({
      id: item.id,
      word,
      normalized,
      stem,
      meaning: item.meaning || '',
      type: item.type || '',
      source: item.source || '',
      file: item.file || '',
      matchMode: 'exact',
      hits: direct,
    });

    if (entries.length >= MAX_WORDS) break;
  }
  return entries;
}

function hitToken(sentence, entry) {
  for (const token of sentence.tokens) {
    if (token === entry.normalized) return token;
  }
  for (const token of sentence.tokens) {
    if (stemToken(token) === entry.stem) return token;
  }
  return entry.normalized;
}

function highlight(text, token) {
  const normalizedToken = normalizeRu(token);
  const stem = stemToken(normalizedToken);
  return text.replace(/[А-Яа-яЁё]+(?:-[А-Яа-яЁё]+)*/g, raw => {
    const n = normalizeRu(raw);
    if (n === normalizedToken || stemToken(n) === stem) return `**${raw}**`;
    return raw;
  });
}

function buildMatches(entries) {
  return entries.map((entry, idx) => {
    const examples = [];
    const seen = new Set();
    for (const sentence of entry.hits) {
      if (seen.has(sentence.ru)) continue;
      seen.add(sentence.ru);
      const matchedForm = hitToken(sentence, entry);
      examples.push({
        sentence_id: sentence.sentence_id,
        ru: sentence.ru,
        highlighted_ru: highlight(sentence.ru, matchedForm),
        matched_word: entry.word,
        matched_form: matchedForm,
        match_mode: entry.matchMode,
        source_file: sentence.source_file,
        source_title: sentence.source_title,
        page_or_location: sentence.page_or_location,
        status: entry.matchMode === 'exact' ? 'candidate_high' : 'needs_review',
      });
      if (examples.length >= MAX_EXAMPLES_PER_WORD) break;
    }
    return {
      sample_id: `vmire-word-${String(idx + 1).padStart(3, '0')}`,
      vocab_id: entry.id,
      word: entry.word,
      normalized_word: entry.normalized,
      meaning: entry.meaning,
      type: entry.type,
      vocab_source: entry.source,
      vocab_file: entry.file,
      match_mode: entry.matchMode,
      examples,
    };
  });
}

function writeReport(matches, sentenceCount) {
  const matchedWords = matches.filter(m => m.examples.length).length;
  const exampleCount = matches.reduce((sum, m) => sum + m.examples.length, 0);
  const needsReview = matches.reduce((sum, m) => sum + m.examples.filter(e => e.status === 'needs_review').length, 0);

  const lines = [];
  lines.push('---');
  lines.push('title: "小样本真实例句匹配报告"');
  lines.push('type: "source-example-sample-report"');
  lines.push('book: "В мире людей 阅读口语"');
  lines.push(`generated_at: "${new Date().toISOString()}"`);
  lines.push('tags:');
  lines.push('  - 俄语/阅读');
  lines.push('  - 例句匹配');
  lines.push('---');
  lines.push('');
  lines.push('# 小样本真实例句匹配报告');
  lines.push('');
  lines.push('## 结果概览');
  lines.push('');
  lines.push(`- 读取正文候选句：${sentenceCount}`);
  lines.push(`- 小样本词条：${matches.length}`);
  lines.push(`- 有候选例句词条：${matchedWords}`);
  lines.push(`- 候选例句总数：${exampleCount}`);
  lines.push(`- 需要人工复核例句：${needsReview}`);
  lines.push('- 正式底稿：未修改');
  lines.push('- 页面接入：未修改');
  lines.push('- 排除范围：`приложение-лексика.md` / AI 词汇附表 167–186');
  lines.push('');
  lines.push('## 人工验收重点');
  lines.push('');
  lines.push('- 看加粗词是否真是当前词条的形态或合理词形。');
  lines.push('- 当前小样本采用 exact-only 匹配；未启用词干/词形扩展。');
  lines.push('- 如果例句太长、太像任务说明或语境不自然，后续全量匹配要加过滤规则。');
  lines.push('');
  lines.push('## 样本明细');
  lines.push('');

  for (const item of matches) {
    lines.push(`### ${item.word} (${item.meaning || '无释义'})`);
    lines.push('');
    lines.push(`- 词条来源：\`${item.vocab_file || item.vocab_id}\``);
    lines.push(`- 匹配模式：\`${item.match_mode}\``);
    if (!item.examples.length) {
      lines.push('- 候选例句：无');
      lines.push('');
      continue;
    }
    item.examples.forEach((ex, i) => {
      lines.push(`${i + 1}. ${ex.highlighted_ru}`);
      lines.push(`   - 来源：\`${ex.source_file}\` · ${ex.source_title}${ex.page_or_location ? ` · 页码 ${ex.page_or_location}` : ''}`);
      lines.push(`   - 匹配形态：\`${ex.matched_form}\` · 状态：\`${ex.status}\``);
    });
    lines.push('');
  }

  fs.writeFileSync(OUT_REPORT, lines.join('\n'), 'utf8');
}

function main() {
  if (!fs.existsSync(VOCAB_FILE)) {
    throw new Error(`Missing vocabulary file: ${VOCAB_FILE}`);
  }
  const vocab = readJson(VOCAB_FILE);
  const sentences = extractCorpusSentences();
  const tokenIndex = buildTokenIndex(sentences);
  const entries = chooseVocabEntries(vocab, tokenIndex);
  const matches = buildMatches(entries);

  const payload = {
    generated_at: new Date().toISOString(),
    book: 'В мире людей 阅读口语',
    mode: 'small_sample',
    corpus: {
      root: BOOK_ROOT,
      chapter_dir: CHAPTER_DIR,
      excluded_files: Array.from(EXCLUDED_FILES),
      sentence_candidates: sentences.length,
    },
    vocabulary: {
      file: VOCAB_FILE,
      max_words: MAX_WORDS,
      selected_words: matches.length,
    },
    matches,
  };

  fs.writeFileSync(OUT_JSON, JSON.stringify(payload, null, 2), 'utf8');
  writeReport(matches, sentences.length);

  const exampleCount = matches.reduce((sum, m) => sum + m.examples.length, 0);
  console.log(`Wrote ${OUT_JSON}`);
  console.log(`Wrote ${OUT_REPORT}`);
  console.log(`Selected words: ${matches.length}`);
  console.log(`Examples: ${exampleCount}`);
}

main();
