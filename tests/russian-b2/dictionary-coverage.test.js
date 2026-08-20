const test = require('node:test');
const assert = require('node:assert/strict');
const {
  auditCoverage,
  createRuntimeAuditTools
} = require('../../scripts/russian-dictionary/audit-coverage');
const { splitMeanings, buildReport } = require('../../scripts/russian-dictionary/audit-freedict-quality');
const reviewedLexical = require('../../data/dictionary/reviewed-lexical-entries.json');
const reviewedFunctions = require('../../data/dictionary/reviewed-function-entries.json');

test('reports distinct textbook coverage separately from weighted whole-reader coverage', () => {
  const report = auditCoverage({
    textbookDocuments: ['Я знаю тех людей.'],
    novelDocuments: ['Он он он редкость.'],
    resolve: form => ({ я: true, знаю: true, тех: true, людей: true, он: true })[form] || false,
    functionForms: new Set(['я', 'тех', 'он'])
  });
  assert.equal(report.functionWords.rate, 1);
  assert.equal(report.structuredTextbooks.distinctRate, 1);
  assert.equal(report.wholeReader.occurrenceRate, 7 / 8);
});

test('keeps unresolved definitions separate from excluded proper names', () => {
  const report = auditCoverage({
    textbookDocuments: ['Анна знает редкость.'], novelDocuments: [],
    resolve: form => form === 'знает',
    functionForms: new Set(),
    classify: form => form === 'анна' ? 'proper-name' : 'included'
  });
  assert.equal(report.exclusions['proper-name'], 1);
  assert.deepEqual(report.structuredTextbooks.unresolved, ['редкость']);
});

test('uses only learner-facing Chinese entries for the Reader runtime coverage contract', () => {
  const tools = createRuntimeAuditTools({
    morphology: {
      словом: { classification: 'lexical', lemmas: ['слово'], tags: ['NOUN'] }
    },
    reviewedLexical: {
      словарь: { meaning: '词典' }
    },
    unified: {
      слово: { meaning: '词；话语' },
      english: { meaning: 'English only' }
    },
    lexicalEvidence: new Set(['english'])
  });

  assert.equal(tools.resolve('словом').resolved, true);
  assert.equal(tools.resolve('словарь').resolved, true);
  assert.equal(tools.resolve('english').resolved, false);
  assert.equal(tools.dictionaryContract.requiresChineseMeaning, true);
});

test('separates missing definitions, missing morphology, transliterations, and source noise', () => {
  const tools = createRuntimeAuditTools({
    morphology: {
      редкости: { classification: 'lexical', lemmas: ['редкость'], tags: ['NOUN'] }
    },
    unified: {}
  });
  const report = auditCoverage({
    textbookDocuments: ['Редкости усмехнулся бррр.'],
    novelDocuments: ['Фэн Фэн.'],
    resolve: tools.resolve,
    classify: tools.classify,
    classifyMissing: tools.classifyMissing,
    functionForms: tools.functionForms,
    dictionaryContract: tools.dictionaryContract
  });

  assert.equal(report.schemaVersion, 2);
  assert.deepEqual(report.missingClassification.addDefinition[0].lemmaCandidates, ['редкость']);
  assert.equal(report.missingClassification.addMorphology[0].form, 'усмехнулся');
  assert.equal(report.missingClassification.properNameOrTransliteration[0].form, 'фэн');
  assert.equal(report.missingClassification.sourceNoise[0].form, 'бррр');
  assert.equal(report.missingClassification.counts.properNameOrTransliteration.occurrences, 2);
});

test('does not treat a confirmed corrupted or transliterated fragment as a missing function word', () => {
  const tools = createRuntimeAuditTools({
    morphology: {
      ин: { classification: 'function-word', lemmas: ['ин'], tags: ['PRCL'] }
    },
    excludedAmbiguousForms: new Set(['ин'])
  });
  const report = auditCoverage({
    textbookDocuments: ['Повреждённый OCR ин.'],
    novelDocuments: ['Имя Ин.'],
    resolve: tools.resolve,
    classify: tools.classify,
    functionForms: tools.functionForms
  });

  assert.equal(report.functionWords.total, 0);
  assert.equal(report.exclusions['ambiguous-nonlexical'], 2);
});

test('excludes case-question, aspect-pair, and numeric-range teaching notation', () => {
  const tools = createRuntimeAuditTools();
  const report = auditCoverage({
    textbookDocuments: ['кому-чему читать-прочитать восемь-двенадцать бизнес-сообщество'],
    resolve: tools.resolve,
    classify: tools.classify,
    functionForms: tools.functionForms
  });

  assert.equal(report.exclusions['grammar-notation'], 3);
  assert.deepEqual(report.structuredTextbooks.unresolved, ['бизнес-сообщество']);
});

test('reviewed textbook batch keeps definitions on lemmas and forms on canonical mappings', () => {
  assert.match(reviewedLexical['деточка'].meaning, /孩子/);
  assert.match(reviewedLexical['голубец'].meaning, /门廊|阳台/);
  assert.equal(reviewedLexical['пришибла'].lemma, 'пришибить');
  assert.equal(reviewedLexical['принялся'].lemma, 'приняться');
  assert.equal(reviewedLexical['усмехнулся'].lemma, 'усмехнуться');
  assert.equal(Object.hasOwn(reviewedLexical['усмехнулся'], 'meaning'), false);
  assert.match(reviewedLexical['плоть'].meaning, /肉体|血肉/);
  assert.equal(reviewedLexical['плоти'].lemma, 'плоть');
});

test('second reviewed batch resolves textbook terminology, clitics, and shared Reader words', () => {
  assert.match(reviewedLexical['деепричастный'].meaning, /副动词/);
  assert.equal(reviewedLexical['патриаршие'].lemma, 'патриарший');
  assert.equal(reviewedLexical['душа-то'].lemma, 'душа');
  assert.equal(reviewedLexical['веселья'].lemma, 'веселье');
  assert.equal(reviewedLexical['причинно-следственные'].lemma, 'причинно-следственный');
  assert.match(reviewedFunctions['аж'].meaning, /甚至/);
  assert.match(reviewedFunctions['вообще-то'].meaning, /其实/);
  assert.equal(Object.hasOwn(reviewedLexical, 'чао'), false);
});

test('third reviewed batch keeps ordinary compounds and their inflected forms canonical', () => {
  assert.match(reviewedLexical['пораженец'].meaning, /失败主义/);
  assert.equal(reviewedLexical['братья-близнецы'].lemma, 'брат-близнец');
  assert.equal(reviewedLexical['коррективы'].lemma, 'корректива');
  assert.equal(reviewedLexical['пресс-службе'].lemma, 'пресс-служба');
  assert.match(reviewedLexical['быстро-быстро'].meaning, /飞快/);
});

test('fourth reviewed batch keeps textbook terms canonical and excludes contextual names', () => {
  assert.match(reviewedLexical['авторалли'].meaning, /汽车拉力赛/);
  assert.equal(reviewedLexical['продавца-консультанта'].lemma, 'продавец-консультант');
  assert.equal(reviewedLexical['девушка-слесарь'].lemma, 'девушка-слесарь');
  assert.notEqual(reviewedLexical['девушка-слесарь'].lemma, 'девушка-слесарить');
  assert.equal(reviewedLexical['официально-делового'].lemma, 'официально-деловой');
  assert.equal(Object.hasOwn(reviewedLexical, 'эгля'), false);
  assert.equal(Object.hasOwn(reviewedLexical, 'слоник'), false);
  assert.equal(Object.hasOwn(reviewedLexical, 'попович'), false);
  assert.equal(Object.hasOwn(reviewedLexical, 'разг'), false);
});

test('classifies corpus-specific names and editorial abbreviations before morphology guesses', () => {
  const tools = createRuntimeAuditTools({
    morphology: {
      эгля: { classification: 'lexical', lemmas: ['эголь'] },
      разг: { classification: 'lexical', lemmas: ['разгнуть'] }
    },
    explicitFormClassifications: {
      эгля: 'proper-name-context',
      разг: 'editorial-abbreviation'
    }
  });
  const report = auditCoverage({
    textbookDocuments: ['Эгля. разг.'],
    resolve: tools.resolve,
    classify: tools.classify,
    functionForms: tools.functionForms
  });

  assert.equal(report.exclusions['proper-name-context'], 1);
  assert.equal(report.exclusions['editorial-abbreviation'], 1);
  assert.deepEqual(report.structuredTextbooks.unresolved, []);
});

test('keeps confirmed textbook proper names and vocal filler out of ordinary dictionary gaps', () => {
  const tools = createRuntimeAuditTools({
    explicitFormClassifications: {
      акрополь: 'proper-name-context',
      макова: 'proper-name-context',
      'а-а-а': 'source-noise-context'
    }
  });
  const report = auditCoverage({
    textbookDocuments: ['Акрополь Макова а-а-а'],
    resolve: tools.resolve,
    classify: tools.classify,
    functionForms: tools.functionForms
  });
  assert.equal(report.exclusions['proper-name-context'], 2);
  assert.equal(report.exclusions['source-noise-context'], 1);
  assert.deepEqual(report.structuredTextbooks.unresolved, []);
});

test('fifth reviewed batch resolves ordinary textbook vocabulary without promoting ambiguous names', () => {
  assert.match(reviewedLexical['киборг'].meaning, /生化人/);
  assert.equal(reviewedLexical['загремел'].lemma, 'загреметь');
  assert.equal(reviewedLexical['собаки-космонавты'].lemma, 'собака-космонавт');
  assert.equal(reviewedLexical['весельем'].lemma, 'веселье');
  assert.match(reviewedLexical['количественно-именной'].meaning, /数量/);
  assert.equal(Object.hasOwn(reviewedLexical, 'акрополь'), false);
  assert.equal(Object.hasOwn(reviewedLexical, 'ивановской'), false);
  assert.equal(Object.hasOwn(reviewedLexical, 'снаута'), false);
});

test('separates unusable FreeDict definitions from entries that still have usable meanings', () => {
  assert.deepEqual(splitMeanings(['期颐'], ['期颐']), {
    blocked: ['期颐'], usable: []
  });
  assert.deepEqual(splitMeanings(['问题', '动问'], ['动问']), {
    blocked: ['动问'], usable: ['问题']
  });
});

test('FreeDict quality report follows the learner-facing dictionary priority', () => {
  const report = buildReport();
  assert.equal(report.schemaVersion, 2);
  assert.ok(Array.isArray(report.blocked));
  assert.ok(Array.isArray(report.needsReview));
  assert.equal(report.blocked.some(entry => entry.lemma === 'столетний'), false);
  assert.equal(report.needsReview.some(entry => entry.lemma === 'вопрос'), false);
});
