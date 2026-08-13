const fs = require('node:fs');
const path = require('node:path');
const Core = require('../../js/russian-dictionary/core');
const { walkJson } = require('./audit-coverage');

const ROOT = path.resolve(__dirname, '..', '..');
const DICTIONARY_DIR = path.join(ROOT, 'data', 'dictionary');
const REPORT_PATH = path.join(DICTIONARY_DIR, 'freedict-quality-report.json');

function splitMeanings(meanings, deprecatedMeanings) {
  const blocked = [];
  const usable = [];
  for (const meaning of meanings || []) {
    const text = String(meaning || '').trim();
    if (!text) continue;
    (deprecatedMeanings.includes(text) ? blocked : usable).push(text);
  }
  return { blocked, usable };
}

function textbookForms() {
  return [...new Set(walkJson(path.join(ROOT, 'data', 'textbook'))
    .flatMap(text => Core.tokenizeRussian(text))
    .filter(token => token.type === 'word')
    .map(token => token.normalized)
    .filter(Boolean))];
}

function hasMeaning(entry) {
  if (typeof entry === 'string') return Boolean(entry.trim());
  if (Array.isArray(entry)) return entry.length > 0;
  return Boolean(entry && (entry.meaning || (Array.isArray(entry.meanings) && entry.meanings.length)));
}

function buildPreferredLookup() {
  const preferred = new Set();
  const addEntries = entries => Object.entries(entries || {}).forEach(([key, entry]) => {
    if (hasMeaning(entry)) preferred.add(Core.normalizeRussian(key));
  });

  addEntries(JSON.parse(fs.readFileSync(path.join(DICTIONARY_DIR, 'reviewed-lexical-entries.json'), 'utf8')));
  addEntries(JSON.parse(fs.readFileSync(path.join(DICTIONARY_DIR, 'reviewed-function-entries.json'), 'utf8')));
  addEntries(JSON.parse(fs.readFileSync(path.join(DICTIONARY_DIR, 'markdown-glossary.json'), 'utf8')));
  addEntries(JSON.parse(fs.readFileSync(path.join(DICTIONARY_DIR, 'salad-vocab.json'), 'utf8')));
  addEntries(JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'external-vocab.json'), 'utf8')));

  const localVocab = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'vocabulary.json'), 'utf8'));
  for (const entry of Array.isArray(localVocab) ? localVocab : []) {
    if (entry && entry.word && hasMeaning(entry)) preferred.add(Core.normalizeRussian(entry.word));
  }
  return preferred;
}

function buildReport() {
  const rules = JSON.parse(fs.readFileSync(path.join(DICTIONARY_DIR, 'freedict-quality-rules.json'), 'utf8'));
  const freeDict = JSON.parse(fs.readFileSync(path.join(DICTIONARY_DIR, 'freedict-rus-zh.json'), 'utf8'));
  const morphology = JSON.parse(fs.readFileSync(path.join(DICTIONARY_DIR, 'corpus-morphology.json'), 'utf8'));
  const preferredLookup = buildPreferredLookup();
  const findings = new Map();

  for (const form of textbookForms()) {
    const lemmas = [...new Set((morphology[form] && morphology[form].lemmas || []).concat(form)
      .map(Core.normalizeRussian).filter(Boolean))];
    for (const lemma of lemmas) {
      if (preferredLookup.has(lemma)) break;
      const entry = freeDict[lemma];
      if (!entry) continue;
      const meanings = splitMeanings(entry.meanings, rules.deprecatedMeanings);
      if (!meanings.blocked.length) continue;
      const existing = findings.get(lemma) || {
        lemma,
        forms: [],
        blockedMeanings: meanings.blocked,
        usableMeanings: meanings.usable,
        source: entry.source
      };
      existing.forms.push(form);
      findings.set(lemma, existing);
      break;
    }
  }

  const entries = [...findings.values()].map(entry => ({
    ...entry,
    forms: [...new Set(entry.forms)].sort((a, b) => a.localeCompare(b, 'ru'))
  })).sort((a, b) => a.lemma.localeCompare(b.lemma, 'ru'));

  return {
    schemaVersion: 2,
    generatedAt: new Date().toISOString(),
    scope: 'data/textbook 中实际出现、且网页会落到 FreeDict 的俄语词元',
    deprecatedMeanings: rules.deprecatedMeanings,
    blocked: entries.filter(entry => entry.usableMeanings.length === 0),
    needsReview: entries.filter(entry => entry.usableMeanings.length > 0)
  };
}

if (require.main === module) {
  const report = buildReport();
  fs.writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(`Blocked: ${report.blocked.length}; needs review: ${report.needsReview.length}.`);
}

module.exports = { splitMeanings, buildPreferredLookup, buildReport };
