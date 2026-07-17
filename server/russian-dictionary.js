const VALID_TERM = /^[А-Яа-яЁё -]{1,80}$/u;

function createRussianDictionaryLookup({ fetchImpl = globalThis.fetch, timeoutMs = 7000, now = () => new Date().toISOString() } = {}) {
  if (typeof fetchImpl !== 'function') throw new TypeError('fetchImpl is required');
  return async function lookupRussianDictionary(term) {
    const clean = String(term || '').trim().replace(/\s+/g, ' ');
    if (!VALID_TERM.test(clean)) throw new TypeError('Invalid Russian dictionary term');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const params = new URLSearchParams({
      action: 'query', prop: 'extracts', explaintext: '1', redirects: '1', titles: clean,
      format: 'json', formatversion: '2', origin: '*'
    });
    try {
      const response = await fetchImpl(`https://ru.wiktionary.org/w/api.php?${params}`, {
        signal: controller.signal,
        headers: { 'User-Agent': 'MyStudySpace-RussianReader/1.0' }
      });
      if (!response || !response.ok) throw new Error(`Russian Wiktionary request failed (${response && response.status || 'network'})`);
      const data = await response.json();
      const pages = data && data.query && data.query.pages;
      const page = Array.isArray(pages) ? pages[0] : pages && Object.values(pages)[0];
      const extract = page && !page.missing ? String(page.extract || '').trim().slice(0, 12000) : '';
      return {
        found: Boolean(extract), term: clean, provider: 'Russian Wiktionary',
        sourceUrl: `https://ru.wiktionary.org/wiki/${encodeURIComponent(clean.replace(/ /g, '_'))}`,
        meaningRu: extract, meaningZh: '', queriedAt: now()
      };
    } finally {
      clearTimeout(timeout);
    }
  };
}

module.exports = { createRussianDictionaryLookup, VALID_TERM };
