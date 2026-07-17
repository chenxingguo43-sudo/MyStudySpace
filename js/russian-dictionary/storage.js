(function (root, factory) {
  const Core = typeof module === 'object' && module.exports
    ? require('./core')
    : root.RussianDictionaryCore;
  const api = factory(Core);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.RussianDictionaryStorage = api;
})(typeof window !== 'undefined' ? window : globalThis, function (Core) {
  const SAVED_KEY = 'vocabulary-review-records';
  const MISSING_KEY = 'rr_dictionary_missing_v1';
  const PROVISIONAL_KEY = 'rr_dictionary_provisional_v1';

  function createDictionaryStorage({ storage, now = () => new Date().toISOString() } = {}) {
    if (!storage) throw new TypeError('storage is required');

    function getRaw(key) {
      return typeof storage.getItem === 'function' ? storage.getItem(key) : storage.get(key);
    }

    function setRaw(key, value) {
      if (typeof storage.setItem === 'function') storage.setItem(key, value);
      else storage.set(key, value);
    }

    function removeRaw(key) {
      if (typeof storage.removeItem === 'function') storage.removeItem(key);
      else storage.delete(key);
    }

    function readObject(key) {
      try {
        const value = JSON.parse(getRaw(key) || '{}');
        return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
      } catch (_error) {
        return {};
      }
    }

    function writeObject(key, value) {
      setRaw(key, JSON.stringify(value));
      return value;
    }

    function normalizedKey(value) {
      return Core.normalizeRussian(value);
    }

    function sourceIdentity(source) {
      return [source.bookId, source.moduleId, source.taskId, source.sentenceRu]
        .map(value => String(value || ''))
        .join('|');
    }

    function mergeSavedWord(input = {}) {
      const key = normalizedKey(input.lemma || input.form);
      if (!key) throw new TypeError('a Russian form or lemma is required');
      const records = readObject(SAVED_KEY);
      const previous = records[key] && typeof records[key] === 'object' ? records[key] : {};
      const context = Core.normalizeContext(input.context || {});
      const sources = Array.isArray(previous.sources) ? previous.sources.slice() : [];
      const hasContext = Object.values(context).some(value => Array.isArray(value) ? value.length : Boolean(value));

      if (hasContext && !sources.some(source => sourceIdentity(source) === sourceIdentity(context))) {
        sources.push(context);
      }

      const forms = [...new Set([
        ...(Array.isArray(previous.forms) ? previous.forms : []),
        String(input.form || '').trim()
      ].filter(Boolean))];
      const createdAt = previous.createdAt || now();
      records[key] = {
        ...previous,
        word: previous.word || key,
        lemma: key,
        forms,
        meaning: input.meaning || previous.meaning || '',
        partOfSpeech: input.partOfSpeech || previous.partOfSpeech || '',
        reliability: input.reliability || previous.reliability || '',
        sources,
        createdAt,
        updatedAt: now()
      };
      writeObject(SAVED_KEY, records);
      return records[key];
    }

    function recordMissing(input = {}) {
      const key = normalizedKey(input.form);
      if (!key) throw new TypeError('a missing Russian form is required');
      const records = readObject(MISSING_KEY);
      const previous = records[key] && typeof records[key] === 'object' ? records[key] : {};
      const context = Core.normalizeContext(input.context || {});
      const contexts = Array.isArray(previous.contexts) ? previous.contexts.slice() : [];
      if (!contexts.some(item => sourceIdentity(item) === sourceIdentity(context))) contexts.push(context);

      records[key] = {
        form: input.form,
        normalizedForm: key,
        lemmaCandidates: [...new Set(input.lemmaCandidates || previous.lemmaCandidates || [])],
        failureStage: input.failureStage || previous.failureStage || 'definition-resolution',
        occurrences: Number(previous.occurrences || 0) + 1,
        contexts,
        firstSeenAt: previous.firstSeenAt || now(),
        lastSeenAt: now()
      };
      writeObject(MISSING_KEY, records);
      return records[key];
    }

    function saveProvisional(input = {}) {
      const key = normalizedKey(input.lemma || input.form);
      if (!key) throw new TypeError('a provisional Russian form or lemma is required');
      const records = readObject(PROVISIONAL_KEY);
      records[key] = {
        form: input.form || key,
        lemma: input.lemma || key,
        provider: String(input.provider || ''),
        sourceUrl: String(input.sourceUrl || ''),
        queriedAt: input.queriedAt || now(),
        meaningRu: String(input.meaningRu || ''),
        meaningZh: String(input.meaningZh || ''),
        context: Core.normalizeContext(input.context || {}),
        reviewStatus: 'provisional'
      };
      writeObject(PROVISIONAL_KEY, records);
      return records[key];
    }

    function getProvisional(value) {
      return readObject(PROVISIONAL_KEY)[normalizedKey(value)] || null;
    }

    function markReviewed(value, formalEntry = {}) {
      const key = normalizedKey(value);
      const provisional = getProvisional(key);
      if (!provisional) return null;
      const reviewed = mergeSavedWord({
        form: provisional.form,
        lemma: key,
        meaning: formalEntry.meaning || provisional.meaningZh,
        partOfSpeech: formalEntry.partOfSpeech || '',
        reliability: 'personally-reviewed',
        context: provisional.context
      });
      const records = readObject(PROVISIONAL_KEY);
      delete records[key];
      if (Object.keys(records).length) writeObject(PROVISIONAL_KEY, records);
      else removeRaw(PROVISIONAL_KEY);
      reviewed.reviewedAt = now();
      reviewed.reviewSourceUrl = provisional.sourceUrl;
      const saved = readObject(SAVED_KEY);
      saved[key] = reviewed;
      writeObject(SAVED_KEY, saved);
      return reviewed;
    }

    return {
      mergeSavedWord,
      recordMissing,
      saveProvisional,
      getProvisional,
      markReviewed,
      keys: { saved: SAVED_KEY, missing: MISSING_KEY, provisional: PROVISIONAL_KEY }
    };
  }

  return { createDictionaryStorage };
});
