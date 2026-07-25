(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.RussianDictionaryReview = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  const RELIABLE_RESULTS = new Set([
    'reviewed-function-form',
    'morphology-map',
    'dictionary-exact',
    'personally-reviewed'
  ]);
  const POS_ALIASES = {
    verb: 'verb', v: 'verb', infn: 'verb', prtf: 'verb', prts: 'verb', grnd: 'verb', '动词': 'verb', 'гл': 'verb',
    noun: 'noun', n: 'noun', '名词': 'noun', 'сущ': 'noun',
    adj: 'adjective', adjective: 'adjective', adjf: 'adjective', adjs: 'adjective', comp: 'adjective', '形容词': 'adjective', 'прил': 'adjective',
    adv: 'adverb', adverb: 'adverb', advb: 'adverb', '副词': 'adverb', 'нар': 'adverb',
    pronoun: 'pronoun', npro: 'pronoun', '代词': 'pronoun', 'мест': 'pronoun',
    numeral: 'numeral', numr: 'numeral', preposition: 'preposition', prep: 'preposition',
    conjunction: 'conjunction', conj: 'conjunction', particle: 'particle', prcl: 'particle',
    interjection: 'interjection', intj: 'interjection', predicative: 'predicative', pred: 'predicative'
  };
  const TRIVIAL_LEMMAS = new Set(['и', 'а', 'но', 'в', 'во', 'на', 'не', 'ни', 'к', 'ко', 'с', 'со', 'у', 'о', 'об', 'от', 'до', 'за', 'по', 'из']);

  function normalizePartOfSpeech(value) {
    return POS_ALIASES[String(value || '').trim().toLowerCase()] || '';
  }

  function createIdentity(resolution, normalizeRussian) {
    const normalizer = normalizeRussian || (value => String(value || '').trim().toLowerCase());
    if (!resolution || !RELIABLE_RESULTS.has(resolution.reliability)) return null;
    const lemma = normalizer(resolution.lemma);
    const entry = resolution.entry || {};
    const partOfSpeech = normalizePartOfSpeech(resolution.partOfSpeech || entry.partOfSpeech || entry.pos || entry.type);
    return lemma && partOfSpeech ? { key: `${lemma}|${partOfSpeech}`, lemma, partOfSpeech } : null;
  }

  function uniqueStrings(values) {
    return [...new Set(values.map(value => String(value || '').trim()).filter(Boolean))];
  }

  function dateValue(value) {
    const time = Date.parse(value || '');
    return Number.isFinite(time) ? time : null;
  }

  function conservativeNumber(left, right, fallback, comparison) {
    const values = [left, right].filter(value => Number.isFinite(Number(value))).map(Number);
    return values.length ? values.reduce((current, value) => comparison(current, value)) : fallback;
  }

  function chooseDate(left, right, comparison) {
    const values = [left, right].filter(value => dateValue(value) !== null);
    if (!values.length) return '';
    return values.reduce((best, value) => comparison(dateValue(best), dateValue(value)) ? best : value);
  }

  function contextIdentity(context) {
    return ['surfaceForm', 'sentenceRu', 'bookId', 'moduleId', 'taskId']
      .map(key => String(context && context[key] || ''))
      .join('|');
  }

  function contextsFor(record) {
    const values = [].concat(record && record.contexts || [], record && record.sources || []);
    const result = [];
    values.forEach(value => {
      if (!value || typeof value !== 'object') return;
      const context = Object.assign({}, value);
      if (!result.some(item => contextIdentity(item) === contextIdentity(context))) result.push(context);
    });
    return result;
  }

  function mergeRecords(left = {}, right = {}) {
    const merged = Object.assign({}, left, right);
    const mastery = conservativeNumber(left.mastery, right.mastery, undefined, Math.min);
    const count = conservativeNumber(left.count, right.count, undefined, Math.max);
    const intervals = [left.interval, right.interval].filter(value => Number(value) > 0).map(Number);
    if (mastery !== undefined) merged.mastery = mastery;
    if (count !== undefined) merged.count = count;
    if (intervals.length) merged.interval = Math.min(...intervals);
    const nextReview = chooseDate(left.nextReview, right.nextReview, (a, b) => a <= b);
    const createdAt = chooseDate(left.createdAt, right.createdAt, (a, b) => a <= b);
    const updatedAt = chooseDate(left.updatedAt, right.updatedAt, (a, b) => a >= b);
    if (nextReview) merged.nextReview = nextReview;
    if (createdAt) merged.createdAt = createdAt;
    if (updatedAt) merged.updatedAt = updatedAt;
    merged.forms = uniqueStrings([].concat(left.forms || [], right.forms || [], left.word || '', right.word || ''));
    merged.contexts = contextsFor(left).concat(contextsFor(right)).filter((context, index, values) =>
      values.findIndex(item => contextIdentity(item) === contextIdentity(context)) === index
    );
    delete merged.sources;
    return merged;
  }

  function transformRecords(records, resolver, normalizeRussian) {
    const input = records && typeof records === 'object' && !Array.isArray(records) ? records : {};
    const output = {};
    const aliases = {};
    let changed = false;
    Object.keys(input).forEach(oldKey => {
      const original = input[oldKey] && typeof input[oldKey] === 'object' ? input[oldKey] : {};
      const resolution = typeof resolver === 'function' ? resolver(original.word || oldKey, original) : null;
      const identity = createIdentity(resolution, normalizeRussian);
      if (!identity) {
        output[oldKey] = original;
        return;
      }
      const enriched = Object.assign({}, original, {
        word: original.word || oldKey,
        lemma: identity.lemma,
        partOfSpeech: identity.partOfSpeech,
        forms: uniqueStrings([].concat(original.forms || [], original.word || oldKey))
      });
      output[identity.key] = output[identity.key] ? mergeRecords(output[identity.key], enriched) : enriched;
      aliases[oldKey] = identity.key;
      changed = changed || oldKey !== identity.key;
    });
    return { records: output, aliases, changed };
  }

  function escapeRegExp(value) {
    return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function createContextCloze(record = {}) {
    const lemma = String(record.lemma || record.word || '').trim();
    if (!lemma || TRIVIAL_LEMMAS.has(lemma.toLowerCase())) return null;
    const contexts = contextsFor(record);
    for (let index = 0; index < contexts.length; index += 1) {
      const context = contexts[index];
      const answer = String(context.surfaceForm || '').trim();
      const sentence = String(context.sentenceRu || '').trim();
      if (!answer || sentence.length < 8 || sentence.length > 240) continue;
      const pattern = new RegExp(`(^|[^А-Яа-яЁё-])(${escapeRegExp(answer)})(?=$|[^А-Яа-яЁё-])`, 'giu');
      const matches = [...sentence.matchAll(pattern)];
      if (matches.length !== 1) continue;
      const prompt = sentence.replace(pattern, (_, prefix) => `${prefix}______`);
      return { prompt, answer, lemma, contextIndex: index };
    }
    return null;
  }

  return { RELIABLE_RESULTS, normalizePartOfSpeech, createIdentity, mergeRecords, transformRecords, createContextCloze };
});
