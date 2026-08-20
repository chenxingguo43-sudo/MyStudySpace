const fs = require('node:fs');
const path = require('node:path');
const Core = require('../../js/russian-dictionary/core');
const { morphologyGuess: defaultMorphologyGuess } = require('../../data/russian-morphology');

const ROOT = path.resolve(__dirname, '..', '..');
const REPORT_PATH = path.join(ROOT, 'data', 'dictionary', 'coverage-report.json');
const MISSING_CATEGORIES = ['addDefinition', 'addMorphology', 'properNameOrTransliteration', 'sourceNoise', 'needsManualReview'];

function collectStrings(value, output = []) {
  if (typeof value === 'string') output.push(value);
  else if (Array.isArray(value)) value.forEach(item => collectStrings(item, output));
  else if (value && typeof value === 'object') Object.values(value).forEach(item => collectStrings(item, output));
  return output;
}

function walkJson(directory) {
  if (!directory || !fs.existsSync(directory)) return [];
  const result = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...walkJson(full));
    else if (entry.isFile() && entry.name.endsWith('.json')) {
      try { result.push(...collectStrings(JSON.parse(fs.readFileSync(full, 'utf8')))); } catch (_error) {}
    }
  }
  return result;
}

function tokenizeDocuments(documents) {
  return documents.flatMap(document => Core.tokenizeRussian(document)
    .filter(token => token.type === 'word')
    .map(token => ({ original: token.value, form: token.normalized })));
}

function rate(resolved, total) { return total ? resolved / total : 1; }
function frequencyMap(tokens) {
  const result = new Map();
  tokens.forEach(token => result.set(token.form, (result.get(token.form) || 0) + 1));
  return result;
}
function missingScope(textbookOccurrences, novelOccurrences) {
  if (textbookOccurrences && novelOccurrences) return 'both';
  return textbookOccurrences ? 'textbook' : 'novel';
}

function buildMissingClassification(unresolvedForms, textbookFrequency, novelFrequency, classifyMissing) {
  const groups = Object.fromEntries(MISSING_CATEGORIES.map(category => [category, []]));
  unresolvedForms.forEach(form => {
    const textbookOccurrences = textbookFrequency.get(form) || 0;
    const novelOccurrences = novelFrequency.get(form) || 0;
    const context = {
      occurrences: textbookOccurrences + novelOccurrences,
      textbookOccurrences,
      novelOccurrences,
      scope: missingScope(textbookOccurrences, novelOccurrences)
    };
    const described = classifyMissing ? classifyMissing(form, context) : null;
    const category = described && MISSING_CATEGORIES.includes(described.category) ? described.category : 'needsManualReview';
    const item = {
      form,
      ...context,
      lemmaCandidates: [],
      reason: '无法安全自动分类',
      recommendedAction: '人工核对原文和词形后再决定',
      ...(described || {})
    };
    delete item.category;
    groups[category].push(item);
  });
  const counts = {};
  const priorities = {
    textbookDefinitions: [],
    textbookMorphology: [],
    sharedDefinitions: [],
    sharedMorphology: [],
    novelDefinitions: []
  };
  MISSING_CATEGORIES.forEach(category => {
    groups[category].sort((a, b) => b.occurrences - a.occurrences || a.form.localeCompare(b.form, 'ru'));
    counts[category] = {
      distinctForms: groups[category].length,
      occurrences: groups[category].reduce((sum, item) => sum + item.occurrences, 0)
    };
  });
  priorities.textbookDefinitions = groups.addDefinition.filter(item => item.scope === 'textbook').slice(0, 100);
  priorities.textbookMorphology = groups.addMorphology.filter(item => item.scope === 'textbook').slice(0, 100);
  priorities.sharedDefinitions = groups.addDefinition.filter(item => item.scope === 'both').slice(0, 100);
  priorities.sharedMorphology = groups.addMorphology.filter(item => item.scope === 'both').slice(0, 100);
  priorities.novelDefinitions = groups.addDefinition.filter(item => item.scope === 'novel').slice(0, 100);
  MISSING_CATEGORIES.forEach(category => { groups[category] = groups[category].slice(0, 500); });
  return { counts, priorities, ...groups };
}

function auditCoverage({ textbookDocuments = [], novelDocuments = [], resolve = () => false, functionForms = new Set(), classify, classifyMissing, dictionaryContract } = {}) {
  const exclusions = {};
  function classification(token) {
    const classified = classify ? classify(token.form, token.original) : '';
    if (classified && classified !== 'included') return classified;
    if (functionForms.has(token.form)) return 'included';
    if (classified === 'included') return 'included';
    if (token.original.length > 1 && token.original === token.original.toUpperCase()) return 'abbreviation';
    if (token.form.length === 1) return 'speaker-label';
    return 'included';
  }
  function included(tokens) {
    return tokens.filter(token => {
      const kind = classification(token);
      if (!kind || kind === 'included') return true;
      exclusions[kind] = (exclusions[kind] || 0) + 1;
      return false;
    });
  }
  function resolvedValue(form) {
    const result = resolve(form);
    return typeof result === 'object' ? result.resolved === true : Boolean(result);
  }

  const textbookTokens = included(tokenizeDocuments(textbookDocuments));
  const novelTokens = included(tokenizeDocuments(novelDocuments));
  const distinct = [...new Set(textbookTokens.map(token => token.form))];
  const resolvedDistinct = distinct.filter(resolvedValue);
  const unresolvedDistinct = distinct.filter(form => !resolvedValue(form)).sort((a, b) => a.localeCompare(b, 'ru'));
  const whole = textbookTokens.concat(novelTokens);
  const wholeResolved = whole.filter(token => resolvedValue(token.form)).length;
  const textbookFrequency = frequencyMap(textbookTokens);
  const novelFrequency = frequencyMap(novelTokens);
  const unresolvedForms = [...new Set(whole.filter(token => !resolvedValue(token.form)).map(token => token.form))];
  const unresolvedFrequency = new Map(unresolvedForms.map(form => [form, (textbookFrequency.get(form) || 0) + (novelFrequency.get(form) || 0)]));
  const presentFunctionWords = [...new Set(whole.map(token => token.form).filter(form => functionForms.has(form)))];
  const resolvedFunctionWords = presentFunctionWords.filter(resolvedValue);

  return {
    schemaVersion: 2,
    generatedAt: new Date().toISOString(),
    dictionaryContract: dictionaryContract || null,
    functionWords: {
      total: presentFunctionWords.length,
      resolved: resolvedFunctionWords.length,
      rate: rate(resolvedFunctionWords.length, presentFunctionWords.length),
      unresolved: presentFunctionWords.filter(form => !resolvedValue(form)).sort()
    },
    structuredTextbooks: {
      documents: textbookDocuments.length,
      occurrences: textbookTokens.length,
      distinct: distinct.length,
      resolvedDistinct: resolvedDistinct.length,
      distinctRate: rate(resolvedDistinct.length, distinct.length),
      unresolved: unresolvedDistinct
    },
    wholeReader: {
      documents: textbookDocuments.length + novelDocuments.length,
      occurrences: whole.length,
      resolvedOccurrences: wholeResolved,
      occurrenceRate: rate(wholeResolved, whole.length),
      topUnresolved: [...unresolvedFrequency.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ru'))
        .slice(0, 500).map(([form, occurrences]) => ({ form, occurrences }))
    },
    missingClassification: buildMissingClassification(unresolvedForms, textbookFrequency, novelFrequency, classifyMissing),
    exclusions
  };
}

function normalize(value) { return Core.normalizeRussian(value); }
function hasChineseMeaning(entry) { return Boolean(entry && /[\u4e00-\u9fff]/.test(String(entry.meaning || ''))); }
function uniqueNormalized(values) {
  return [...new Set(values.flatMap(value => Array.isArray(value) ? value : [value]).map(normalize).filter(Boolean))];
}
function isProperNameMorphology(item) {
  const tags = item && Array.isArray(item.tags) ? item.tags : [];
  return Boolean(item && (item.classification === 'proper-name' || tags.some(tag => ['Name', 'Surn', 'Patr', 'Geox'].includes(tag))));
}
function isLikelySourceNoise(form) { return /(.)\1\1/u.test(form) || !/[аеёиоуыэюя]/u.test(form) || form.length < 2; }
function isGrammarNotation(form) {
  const parts = form.split('-').filter(Boolean);
  if (parts.length !== 2) return false;
  const questionWords = new Set(['кто', 'что', 'кого', 'чего', 'кому', 'чему', 'кем', 'чем', 'ком']);
  if (parts.every(part => questionWords.has(part))) return true;
  if (parts.every(part => /(?:ть|ться)$/u.test(part))) return true;
  const numberWords = new Set(['один', 'два', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять', 'десять', 'одиннадцать', 'двенадцать']);
  return parts.every(part => numberWords.has(part));
}
function isLikelyTransliteration(form) {
  if (/^(.{2,4})\1$/u.test(form)) return true;
  const roots = ['фэн', 'цыхан', 'чэнчэн', 'мэн', 'сюй', 'люй', 'чжао', 'цинцин', 'жобин', 'лян', 'юй', 'дун', 'чжугэ', 'сяоху'];
  return roots.some(root => form === root || new RegExp(`^${root}(?:а|у|ом|е|ы|и|ов|ев)$`, 'u').test(form));
}

function createRuntimeAuditTools({ morphology = {}, functionMap = {}, legacy = {}, reviewedFunctions = {}, reviewedLexical = {}, unified = {}, lexicalEvidence = new Set(), morphologyGuess = defaultMorphologyGuess, excludedAmbiguousForms = new Set(), explicitFormClassifications = {} } = {}) {
  const definitionEntries = new Map();
  [unified, reviewedFunctions, reviewedLexical].forEach(source => {
    Object.entries(source || {}).forEach(([key, entry]) => {
      if (hasChineseMeaning(entry)) definitionEntries.set(normalize(key), entry);
    });
  });
  const functionForms = new Set(Object.keys(functionMap || {}).map(normalize));
  Object.entries(morphology || {}).forEach(([form, item]) => {
    if (!form.includes('-') && item.classification === 'function-word' && (item.tags || []).some(tag => ['PREP', 'CONJ', 'PRCL', 'NPRO'].includes(tag))) functionForms.add(normalize(form));
  });

  function candidatesFor(form) {
    const key = normalize(form);
    const reviewed = reviewedLexical[key] || {};
    const corpus = morphology[key] || {};
    const legacyItem = legacy[key] || [];
    const morphologyCandidates = reviewed.lemma
      ? [reviewed.lemma]
      : (corpus.lemmas || []).concat(Array.isArray(legacyItem) ? legacyItem : (legacyItem.lemmas || []));
    return {
      key,
      corpus,
      mapped: uniqueNormalized((functionMap[key] || []).concat(morphologyCandidates)),
      all: uniqueNormalized((functionMap[key] || []).concat(morphologyCandidates, [key]))
    };
  }

  function resolve(form) {
    const candidates = candidatesFor(form);
    if (candidates.all.some(lemma => definitionEntries.has(lemma))) {
      return { resolved: true, lemmaCandidates: candidates.all };
    }
    const guessed = typeof morphologyGuess === 'function' ? uniqueNormalized(morphologyGuess(candidates.key)) : [];
    return {
      resolved: guessed.some(lemma => definitionEntries.has(lemma)),
      lemmaCandidates: uniqueNormalized(candidates.all.concat(guessed))
    };
  }
  function classify(form, original) {
    if (explicitFormClassifications[form]) return explicitFormClassifications[form];
    if (excludedAmbiguousForms.has(form)) return 'ambiguous-nonlexical';
    if (isGrammarNotation(form)) return 'grammar-notation';
    if (original.length > 1 && original === original.toUpperCase()) return 'abbreviation';
    if (form.length === 1 && !functionForms.has(form)) return 'speaker-label';
    const item = morphology[form];
    const startsUppercase = original && original[0] === original[0].toUpperCase() && original[0] !== original[0].toLowerCase();
    if (item && (item.classification === 'proper-name' || (startsUppercase && isProperNameMorphology(item)))) return 'proper-name';
    return 'included';
  }
  function classifyMissing(form) {
    const candidates = candidatesFor(form);
    const mappedLexical = candidates.mapped.filter(candidate => candidate !== form);
    if (isLikelySourceNoise(form)) {
      return { category: 'sourceNoise', lemmaCandidates: candidates.all, reason: '缺少正常俄语元音或包含异常重复字符', recommendedAction: '回查教材或小说原文，不补入词典' };
    }
    if (candidates.corpus.classification === 'proper-name' || isLikelyTransliteration(form)) {
      return { category: 'properNameOrTransliteration', lemmaCandidates: candidates.all, reason: '词形标记或字形更像专名、音译名', recommendedAction: '保留为专名候选，不加入普通词典' };
    }
    if (mappedLexical.length) {
      return { category: 'addDefinition', lemmaCandidates: mappedLexical, reason: '已有本地词形映射，但对应原形缺少中文释义', recommendedAction: `优先核对并补充原形 ${mappedLexical[0]} 的中文释义` };
    }
    if (lexicalEvidence.has(form)) {
      return { category: 'addDefinition', lemmaCandidates: [form], reason: '外语词典可确认这是词条，但统一词典没有可显示中文释义', recommendedAction: `人工核对后补充 ${form} 的中文释义` };
    }
    if (/^[а-яё-]{3,}$/u.test(form)) {
      return { category: 'addMorphology', lemmaCandidates: candidates.all, reason: '看起来是正常俄语词形，但本地词形库没有可靠原形映射', recommendedAction: '先补词形到原形映射，再决定是否缺释义' };
    }
    return { category: 'needsManualReview', lemmaCandidates: candidates.all, reason: '现有本地证据不足', recommendedAction: '人工核对原文和词形后再决定' };
  }

  return {
    resolve,
    classify,
    classifyMissing,
    functionForms,
    dictionaryContract: {
      source: 'reviewed entries + unified-dictionary',
      requiresChineseMeaning: true,
      unifiedEntryCount: Object.keys(unified).length,
      unifiedUsableEntryCount: Object.values(unified).filter(hasChineseMeaning).length,
      reviewedLexicalUsableEntryCount: Object.values(reviewedLexical).filter(hasChineseMeaning).length,
      reviewedFunctionUsableEntryCount: Object.values(reviewedFunctions).filter(hasChineseMeaning).length,
      resolverOrder: ['function-word-forms', 'reviewed-lexical lemma', 'corpus-morphology', 'legacy morphology', 'exact form']
    }
  };
}

function readJson(relativePath) { return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), 'utf8')); }
function loadRealAudit() {
  const textbookRoot = path.join(ROOT, 'data', 'textbook');
  const localNovel = path.join(ROOT, 'data', 'novel');
  const canonicalNovel = path.resolve(ROOT, '..', '..', 'data', 'novel');
  const novelRoot = fs.existsSync(localNovel) ? localNovel : canonicalNovel;
  const morphology = readJson('data/dictionary/corpus-morphology.json');
  const functionMap = readJson('data/dictionary/function-word-forms.json');
  const reviewedFunctions = readJson('data/dictionary/reviewed-function-entries.json');
  const reviewedLexical = readJson('data/dictionary/reviewed-lexical-entries.json');
  const unified = readJson('data/dictionary/unified-dictionary.json');
  const legacyRaw = readJson('data/morphology-map.json');
  const legacy = legacyRaw.map || legacyRaw;
  const openRussian = readJson('data/dictionary/openrussian-en.json');
  const wiktionaryRu = readJson('data/dictionary/wiktionary-ru.json');
  const lexicalEvidence = new Set(Object.keys(openRussian).concat(Object.keys(wiktionaryRu)).map(normalize));
  const tools = createRuntimeAuditTools({
    morphology,
    functionMap,
    legacy,
    reviewedFunctions,
    reviewedLexical,
    unified,
    lexicalEvidence,
    excludedAmbiguousForms: new Set(['ин', 'чао']),
    explicitFormClassifications: {
      'эгля': 'proper-name-context',
      'слоник': 'proper-name-context',
      'попович': 'proper-name-context',
      'разг': 'editorial-abbreviation',
      'акрополь': 'proper-name-context',
      'ивановской': 'proper-name-context',
      'макова': 'proper-name-context',
      'снаута': 'proper-name-context',
      'бэ': 'proper-name-context',
      'а-а-а': 'source-noise-context'
    }
  });
  return auditCoverage({ textbookDocuments: walkJson(textbookRoot), novelDocuments: walkJson(novelRoot), ...tools });
}

if (require.main === module) {
  const report = loadRealAudit();
  fs.writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(`Function words: ${(report.functionWords.rate * 100).toFixed(2)}%`);
  console.log(`Structured textbook distinct: ${(report.structuredTextbooks.distinctRate * 100).toFixed(2)}%`);
  console.log(`Whole reader weighted (observation): ${(report.wholeReader.occurrenceRate * 100).toFixed(2)}%`);
  if (process.argv.includes('--check')) {
    const failures = [];
    if (report.functionWords.rate !== 1) failures.push('function-word coverage below 100%');
    if (report.structuredTextbooks.distinctRate < 0.98) failures.push('structured-textbook distinct coverage below 98%');
    if (failures.length) { console.error(failures.join('\n')); process.exitCode = 1; }
  }
}

module.exports = { auditCoverage, buildMissingClassification, createRuntimeAuditTools, hasChineseMeaning, loadRealAudit, walkJson };
