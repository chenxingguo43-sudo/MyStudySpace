/* Add conservative paragraph-level locators for reviewed reading analyses. */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const dataRoot = path.join(root, 'data', 'textbook', 'reading_speaking');

// A few reviewed analyses quote two adjacent OCR fragments or use a slightly
// different version of a sentence. These anchors use the exact sentence that
// is present in the restored Reader source, without changing the analysis.
const LOCATOR_OVERRIDES = {
  '2.1.2': {
    4: { paragraphIndex: 7, quote: '20 июля — день торта: шоу и мастер-классы от известных шеф-поваров и кондитеров; мастер-классы по приготовлению полезных тортов без выпечки; конкурс авторских арт-фартуков.' }
  },
  '3.1.1': {
    4: { paragraphIndex: 6, quote: 'Наш орёл затем и двуглавый, чтобы одна его башка смотрела на Запад, а вторая — на Восток.' },
    6: { paragraphIndex: 15, quote: 'Они покажут другим странам, что жить по-китайски лучше и разумнее.' }
  },
  '3.2.1': {
    5: { paragraphIndex: 22, quote: 'Я винодел, — сказал старик, как только усадил меня в кожаное кресло, — и потому причисляю себя к служителям искусства.' },
    6: { paragraphIndex: 24, quote: 'Не всё же вам писать и писать. Обучил бы вас, как вот обучаю этому Любу.' },
    7: { paragraphIndex: 22, quote: 'Виноделие — одно из самых древних искусств.' }
  }
};

const CONFUSABLES = {
  a: 'а', c: 'с', e: 'е', i: 'и', k: 'к', m: 'м', o: 'о', p: 'р', t: 'т', x: 'х', y: 'у',
  A: 'А', C: 'С', E: 'Е', I: 'И', K: 'К', M: 'М', O: 'О', P: 'Р', T: 'Т', X: 'Х', Y: 'У'
};

function normalize(value) {
  return String(value || '').replace(/[*_`]/g, ' ').replace(/ё/gi, 'е')
    .replace(/[aAceEiIkKmMoOpPtTxXyY]/g, letter => CONFUSABLES[letter] || letter)
    .toLowerCase().replace(/[^а-яё0-9]+/gi, ' ').replace(/\s+/g, ' ').trim();
}

function tokens(value) { return normalize(value).split(/\s+/).filter(Boolean); }

function containsSequence(haystack, needle) {
  if (!needle.length || needle.length > haystack.length) return false;
  for (let start = 0; start <= haystack.length - needle.length; start += 1) {
    if (needle.every((token, index) => haystack[start + index] === token)) return true;
  }
  return false;
}

function orderedMatchScore(haystack, needle) {
  if (!needle.length) return 0;
  let cursor = 0; let matched = 0;
  for (const token of needle) {
    const index = haystack.indexOf(token, cursor);
    if (index < 0) continue;
    matched += 1; cursor = index + 1;
  }
  return matched / needle.length;
}

function cleanEvidence(value) {
  return String(value || '').replace(/第\s*\d+\s*段(?:（俄语原文）)?\s*[:：]?/g, '')
    .replace(/（[^）]*[\u4e00-\u9fff][^）]*）/g, '\n').replace(/\([^)]*[\u4e00-\u9fff][^)]*\)/g, '\n')
    .replace(/[“”«»]/g, '').trim();
}

function evidenceCandidates(exercise) {
  const values = [];
  const items = exercise.answerAnalysis && exercise.answerAnalysis.evidenceItems || [];
  items.forEach(item => values.push(item.quoteRu));
  const raw = exercise.answerAnalysis && exercise.answerAnalysis.evidence && exercise.answerAnalysis.evidence.ru || '';
  raw.split(/\r?\n/).forEach(line => values.push(line));
  const seen = new Set();
  return values.flatMap(value => cleanEvidence(value).split(/\.{3}|…|。|；|;|\r?\n/g))
    .map(value => value.trim()).filter(value => {
      const ts = tokens(value); const key = ts.join(' ');
      if (ts.length < 4 || seen.has(key) || !/[а-яё]/i.test(value)) return false;
      seen.add(key); return true;
    }).map(rawValue => ({ raw: rawValue, tokens: tokens(rawValue) }));
}

function existingLocator(exercise, original) {
  const anchors = Array.isArray(exercise.evidenceAnchors) ? exercise.evidenceAnchors : [];
  if (anchors.length) return anchors.map(anchor => {
    const paragraph = original[anchor.paragraphIndex] || '';
    const exact = containsSequence(tokens(paragraph), tokens(anchor.quote));
    return { ...anchor, locatorLevel: exact ? 'exact' : 'paragraph' };
  });
  const legacy = exercise.sourceAnchor;
  if (legacy && typeof legacy.paragraphIndex === 'number' && legacy.quote) {
    const paragraph = original[legacy.paragraphIndex] || '';
    const level = containsSequence(tokens(paragraph), tokens(legacy.quote)) ? 'exact' : 'paragraph';
    return [{ id: `q${exercise.num}-legacy-locator`, paragraphIndex: legacy.paragraphIndex, quote: legacy.quote, role: '支持正确答案', locatorLevel: level }];
  }
  return [];
}

function deriveLocator(exercise, original) {
  const candidates = evidenceCandidates(exercise);
  const paragraphs = original.map((value, paragraphIndex) => ({ paragraphIndex, tokens: tokens(value) }));
  let best = null;
  for (const candidate of candidates) {
    for (const paragraph of paragraphs) {
      const exact = containsSequence(paragraph.tokens, candidate.tokens);
      const score = exact ? 1 : orderedMatchScore(paragraph.tokens, candidate.tokens);
      if (!best || score > best.score) best = { candidate, paragraph, score, exact };
    }
  }
  if (!best || best.candidate.tokens.length < 4 || best.score < 0.68) return [];
  const competing = candidates.flatMap(candidate => paragraphs.map(paragraph => ({
    candidate, paragraph, score: containsSequence(paragraph.tokens, candidate.tokens) ? 1 : orderedMatchScore(paragraph.tokens, candidate.tokens)
  }))).filter(item => item !== best).sort((a, b) => b.score - a.score)[0];
  if (competing && competing.score >= best.score - 0.08 && competing.paragraph.paragraphIndex !== best.paragraph.paragraphIndex) return [];
  return [{
    id: `q${exercise.num}-paragraph-locator`,
    paragraphIndex: best.paragraph.paragraphIndex,
    quote: best.candidate.raw,
    role: '支持正确答案',
    locatorLevel: best.exact ? 'exact' : 'paragraph'
  }];
}

function updateLocatorNote(answerAnalysis, level) {
  const generatedNotes = [
    '已定位到相关原文段落，但句子存在 OCR 或版本差异，请核对原句。',
    '暂时没有可靠的原文定位，需要人工核对对应段落。'
  ];
  const notes = String(answerAnalysis.nextCheck || '').split('；')
    .map(item => item.trim()).filter(item => item && !generatedNotes.includes(item));
  if (level === 'paragraph') notes.push(generatedNotes[0]);
  if (level === 'unavailable') notes.push(generatedNotes[1]);
  answerAnalysis.nextCheck = notes.join('；');
}

function locatorOverride(chapter, exercise) {
  const chapterId = String(chapter.title || '').match(/(\d+\.\d+\.\d+)/);
  const override = chapterId && LOCATOR_OVERRIDES[chapterId[1]] && LOCATOR_OVERRIDES[chapterId[1]][exercise.num];
  if (!override) return [];
  const paragraph = (chapter.original || [])[override.paragraphIndex] || '';
  if (!containsSequence(tokens(paragraph), tokens(override.quote))) return [];
  return [{ id: `q${exercise.num}-exact-locator`, ...override, role: '支持正确答案', locatorLevel: 'exact' }];
}

function enrichChapter(chapter) {
  let exact = 0; let paragraph = 0; let unavailable = 0;
  for (const exercise of chapter.exercises || []) {
    const override = locatorOverride(chapter, exercise);
    const anchors = override.length ? override : (existingLocator(exercise, chapter.original || []).length
      ? existingLocator(exercise, chapter.original || [])
      : deriveLocator(exercise, chapter.original || []));
    exercise.evidenceAnchors = anchors;
    const level = anchors.length ? (anchors.some(anchor => anchor.locatorLevel === 'exact') ? 'exact' : 'paragraph') : 'unavailable';
    if (level === 'exact') exact += 1;
    else if (level === 'paragraph') paragraph += 1;
    else unavailable += 1;
    if (exercise.answerAnalysis) {
      exercise.answerAnalysis.locatorStatus = level;
      updateLocatorNote(exercise.answerAnalysis, level);
    }
  }
  return { exact, paragraph, unavailable };
}

function main() {
  const dryRun = process.argv.includes('--dry-run');
  const results = [];
  for (const file of fs.readdirSync(dataRoot).filter(name => /^ch\d+\.json$/.test(name)).sort()) {
    const filePath = path.join(dataRoot, file);
    const chapter = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const stats = enrichChapter(chapter);
    results.push({ file, title: chapter.title, ...stats });
    if (!dryRun) fs.writeFileSync(filePath, `${JSON.stringify(chapter, null, 2)}\n`, 'utf8');
  }
  console.log(JSON.stringify({ dryRun, results }, null, 2));
}

if (require.main === module) main();

module.exports = { normalize, tokens, evidenceCandidates, deriveLocator, updateLocatorNote, locatorOverride, enrichChapter };
