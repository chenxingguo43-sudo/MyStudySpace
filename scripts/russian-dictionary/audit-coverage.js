const fs = require('node:fs');
const path = require('node:path');
const Core = require('../../js/russian-dictionary/core');

const ROOT = path.resolve(__dirname, '..', '..');
const REPORT_PATH = path.join(ROOT, 'data', 'dictionary', 'coverage-report.json');

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

function auditCoverage({ textbookDocuments = [], novelDocuments = [], resolve = () => false, functionForms = new Set(), classify } = {}) {
  const exclusions = {};
  function classification(token) {
    if (functionForms.has(token.form)) return 'included';
    if (classify) return classify(token.form, token.original);
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
  const unresolvedFrequency = new Map();
  whole.filter(token => !resolvedValue(token.form)).forEach(token => {
    unresolvedFrequency.set(token.form, (unresolvedFrequency.get(token.form) || 0) + 1);
  });
  const presentFunctionWords = [...new Set(whole.map(token => token.form).filter(form => functionForms.has(form)))];
  const resolvedFunctionWords = presentFunctionWords.filter(resolvedValue);

  return {
    generatedAt: new Date().toISOString(),
    functionWords: {
      total: presentFunctionWords.length, resolved: resolvedFunctionWords.length,
      rate: rate(resolvedFunctionWords.length, presentFunctionWords.length),
      unresolved: presentFunctionWords.filter(form => !resolvedValue(form)).sort()
    },
    structuredTextbooks: {
      documents: textbookDocuments.length, occurrences: textbookTokens.length,
      distinct: distinct.length, resolvedDistinct: resolvedDistinct.length,
      distinctRate: rate(resolvedDistinct.length, distinct.length), unresolved: unresolvedDistinct
    },
    wholeReader: {
      documents: textbookDocuments.length + novelDocuments.length,
      occurrences: whole.length, resolvedOccurrences: wholeResolved,
      occurrenceRate: rate(wholeResolved, whole.length),
      topUnresolved: [...unresolvedFrequency.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ru'))
        .slice(0, 500).map(([form, occurrences]) => ({ form, occurrences }))
    },
    exclusions
  };
}

function normalize(value) { return Core.normalizeRussian(value); }

function loadRealAudit() {
  const textbookRoot = path.join(ROOT, 'data', 'textbook');
  const localNovel = path.join(ROOT, 'data', 'novel');
  const canonicalNovel = path.resolve(ROOT, '..', '..', 'data', 'novel');
  const novelRoot = fs.existsSync(localNovel) ? localNovel : canonicalNovel;
  const morphology = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'dictionary', 'corpus-morphology.json'), 'utf8'));
  const functionMap = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'dictionary', 'function-word-forms.json'), 'utf8'));
  const freeDict = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'dictionary', 'freedict-rus-zh.json'), 'utf8'));
  const markdownGlossary = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'dictionary', 'markdown-glossary.json'), 'utf8'));
  const reviewedFunctions = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'dictionary', 'reviewed-function-entries.json'), 'utf8'));
  const openRussian = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'dictionary', 'openrussian-en.json'), 'utf8'));
  const wiktionaryRu = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'dictionary', 'wiktionary-ru.json'), 'utf8'));
  const legacyRaw = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'morphology-map.json'), 'utf8'));
  const legacy = legacyRaw.map || legacyRaw;
  const external = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'external-vocab.json'), 'utf8'));
  const vocabulary = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'vocabulary.json'), 'utf8'));
  const reviewedLexical = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'dictionary', 'reviewed-lexical-entries.json'), 'utf8'));
  const definitions = new Set(Object.keys(freeDict).map(normalize));
  Object.keys(markdownGlossary).forEach(key => definitions.add(normalize(key)));
  Object.keys(reviewedFunctions).forEach(key => definitions.add(normalize(key)));
  Object.keys(reviewedLexical).forEach(key => definitions.add(normalize(key)));
  Object.keys(openRussian).forEach(key => definitions.add(normalize(key)));
  Object.keys(wiktionaryRu).forEach(key => definitions.add(normalize(key)));
  Object.keys(external).forEach(key => definitions.add(normalize(key)));
  vocabulary.forEach(entry => { if (entry && entry.word && entry.meaning) definitions.add(normalize(entry.word)); });
  const functionForms = new Set(Object.keys(functionMap));
  Object.entries(morphology).forEach(([form, item]) => {
    if (!form.includes('-') && item.classification === 'function-word' && (item.tags || []).some(tag => ['PREP', 'CONJ', 'PRCL', 'NPRO'].includes(tag))) functionForms.add(form);
  });
  function lemmaResolved(lemma) { return definitions.has(normalize(lemma)); }
  function resolver(form) {
    const candidates = [];
    (functionMap[form] || []).concat(morphology[form] && morphology[form].lemmas || [], legacy[form] || [], form).forEach(lemma => {
      lemma = normalize(lemma);
      if (lemma && !candidates.includes(lemma)) candidates.push(lemma);
    });
    if (candidates.some(lemmaResolved)) return true;
    if (form.includes('-')) {
      const parts = form.split('-').filter(Boolean);
      const clitics = new Set(['то', 'либо', 'нибудь', 'ка', 'де', 'таки']);
      if (parts.length === 2 && clitics.has(parts[1])) return resolver(parts[0]);
      if (parts.length >= 2 && parts[0].length === 1) return resolver(parts.slice(1).join('-'));
      if (parts.length >= 2 && parts.every(part => resolver(part))) return true;
    }
    return false;
  }
  function classifier(form, original) {
    if (original.length > 1 && original === original.toUpperCase()) return 'abbreviation';
    if (form.length === 1 && !functionForms.has(form)) return 'speaker-label';
    const item = morphology[form];
    const startsUppercase = original && original[0] === original[0].toUpperCase() && original[0] !== original[0].toLowerCase();
    if (item && (item.classification === 'proper-name' || (startsUppercase && (item.tags || []).some(tag => ['Name', 'Surn', 'Patr', 'Geox'].includes(tag))))) return 'proper-name';
    return 'included';
  }
  return auditCoverage({
    textbookDocuments: walkJson(textbookRoot), novelDocuments: walkJson(novelRoot),
    resolve: resolver, functionForms, classify: classifier
  });
}

if (require.main === module) {
  const report = loadRealAudit();
  fs.writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(`Function words: ${(report.functionWords.rate * 100).toFixed(2)}%`);
  console.log(`Structured textbook distinct: ${(report.structuredTextbooks.distinctRate * 100).toFixed(2)}%`);
  console.log(`Whole reader weighted: ${(report.wholeReader.occurrenceRate * 100).toFixed(2)}%`);
  if (process.argv.includes('--check')) {
    const failures = [];
    if (report.functionWords.rate !== 1) failures.push('function-word coverage below 100%');
    if (report.structuredTextbooks.distinctRate < 0.98) failures.push('structured-textbook distinct coverage below 98%');
    if (report.wholeReader.occurrenceRate < 0.98) failures.push('whole-reader weighted coverage below 98%');
    if (failures.length) { console.error(failures.join('\n')); process.exitCode = 1; }
  }
}

module.exports = { auditCoverage, loadRealAudit, walkJson };
