(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.RussianDictionaryCore = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  const WORD_RE = /[А-Яа-яЁё][А-Яа-яЁё\u0300-\u036f]*(?:-[А-Яа-яЁё][А-Яа-яЁё\u0300-\u036f]*)*/gu;

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, char => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[char]);
  }

  function normalizeRussian(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/Ё/g, 'Е')
      .replace(/ё/g, 'е')
      .toLowerCase()
      .replace(/[^а-я-]/g, '');
  }

  function tokenizeRussian(value) {
    const text = String(value || '');
    const result = [];
    let cursor = 0;

    for (const match of text.matchAll(WORD_RE)) {
      if (match.index > cursor) {
        result.push({ type: 'text', value: text.slice(cursor, match.index) });
      }
      result.push({
        type: 'word',
        value: match[0],
        normalized: normalizeRussian(match[0])
      });
      cursor = match.index + match[0].length;
    }

    if (cursor < text.length) result.push({ type: 'text', value: text.slice(cursor) });
    return result;
  }

  function normalizeContext(value = {}) {
    return {
      bookId: String(value.bookId || ''),
      moduleId: String(value.moduleId || ''),
      taskId: String(value.taskId || ''),
      regionType: String(value.regionType || ''),
      sentenceRu: String(value.sentenceRu || ''),
      sentenceZh: String(value.sentenceZh || ''),
      sourceLabel: String(value.sourceLabel || ''),
      sourcePages: Array.isArray(value.sourcePages) ? value.sourcePages.slice() : []
    };
  }

  function renderRussianText(value, context = {}) {
    const encodedContext = escapeHtml(JSON.stringify(normalizeContext(context)));
    return tokenizeRussian(value).map(token => {
      if (token.type === 'text') return escapeHtml(token.value);
      const word = escapeHtml(token.value);
      return `<span class="ru-word" data-word="${word}" data-lookup-context="${encodedContext}">${word}</span>`;
    }).join('');
  }

  function lemmaCandidates(value) {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') return [value];
    if (value && Array.isArray(value.lemmas)) return value.lemmas;
    if (value && typeof value.lemma === 'string') return [value.lemma];
    return [];
  }

  function resolveLemma(form, {
    morphology = {},
    functionForms = {},
    lookupLemma = () => null
  } = {}) {
    const normalized = normalizeRussian(form);
    const reviewed = lemmaCandidates(functionForms[normalized]);
    const analyzed = lemmaCandidates(morphology[normalized]);
    const candidates = [...new Set([...reviewed, ...analyzed, normalized].filter(Boolean))];

    for (const lemma of candidates) {
      const entry = lookupLemma(lemma);
      if (!entry) continue;
      return {
        form,
        normalized,
        lemma,
        entry,
        reliability: reviewed.includes(lemma)
          ? 'reviewed-function-form'
          : lemma === normalized ? 'dictionary-exact' : 'morphology-map',
        alternatives: candidates.filter(item => item !== lemma)
      };
    }

    return {
      form,
      normalized,
      lemma: candidates[0] || normalized,
      entry: null,
      reliability: candidates.length > 1 ? 'morphology-guess' : 'not-found',
      alternatives: candidates.slice(1)
    };
  }

  return {
    escapeHtml,
    normalizeRussian,
    tokenizeRussian,
    renderRussianText,
    normalizeContext,
    resolveLemma
  };
});
