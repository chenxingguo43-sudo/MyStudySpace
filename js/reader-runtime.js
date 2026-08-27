(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.ReaderRuntime = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const RUNTIMES = ['web-server', 'static-web'];

  function validRuntime(value) {
    return RUNTIMES.indexOf(value) >= 0 ? value : '';
  }

  function getRuntime(options) {
    options = options || {};
    const explicit = validRuntime(options.runtime);
    if (explicit) return explicit;
    const locationRef = options.location || (typeof location !== 'undefined' ? location : null);
    const hostname = String(locationRef && locationRef.hostname || '').toLowerCase();
    if (hostname.endsWith('.github.io')) return 'static-web';
    return locationRef && locationRef.protocol === 'file:' ? 'static-web' : 'web-server';
  }

  function normalizeChapterIndex(value) {
    const index = Number(value);
    if (!Number.isInteger(index) || index < 0) throw new TypeError('chapter index must be a non-negative integer');
    return index;
  }

  function createReaderRuntime(options) {
    options = options || {};
    const runtime = getRuntime(options);
    const fetchImpl = options.fetch || (typeof fetch === 'function' ? fetch.bind(globalThis) : null);
    const storage = options.storage || (typeof localStorage !== 'undefined' ? localStorage : null);
    const locationRef = options.location || (typeof location !== 'undefined' ? location : null);

    function requireFetch() {
      if (!fetchImpl) throw new Error('fetch is unavailable');
      return fetchImpl;
    }

    function fetchJson(url, init) {
      return requireFetch()(url, init).then(function (response) {
        if (!response || !response.ok) throw new Error(`Request failed: ${url}`);
        return response.json();
      });
    }

    function loadStaticCatalogue() {
      const requests = [
        fetchJson('data/novel/index.json', { cache: 'no-store' }).catch(function () { return { books: [] }; }),
        fetchJson('data/textbook/index.json', { cache: 'no-store' }).catch(function () { return { books: [] }; })
      ];
      return Promise.all(requests).then(function (catalogues) {
        return {
          books: catalogues.reduce(function (books, catalogue) {
            return books.concat(Array.isArray(catalogue.books) ? catalogue.books : []);
          }, [])
        };
      });
    }

    function loadCatalogue() {
      if (runtime === 'static-web') return loadStaticCatalogue();
      return fetchJson('/api/novel/index', { cache: 'no-store' }).catch(function () {
        return loadStaticCatalogue();
      });
    }

    function loadChapter(book, chapterIndex) {
      if (!book || !book.id) return Promise.reject(new TypeError('book is required'));
      const index = normalizeChapterIndex(chapterIndex);
      const directory = book.dir || book.id;
      const dataRoot = book.kind === 'textbook' ? 'data/textbook' : 'data/novel';
      const staticUrl = `${dataRoot}/${directory}/ch${String(index).padStart(4, '0')}.json`;
      if (runtime === 'static-web' || book.isB2Module) return fetchJson(staticUrl, { cache: 'no-store' });
      return fetchJson(`/api/novel/${encodeURIComponent(book.id)}/${index}`, { cache: 'no-store' })
        .catch(function () { return fetchJson(staticUrl, { cache: 'no-store' }); });
    }

    function lookupDictionary(term, lookupOptions) {
      if (runtime !== 'web-server') return Promise.resolve({ enabled: false, found: false, reason: 'offline-runtime' });
      const params = new URLSearchParams({
        term: String(term || '').trim(),
        includeContext: lookupOptions && lookupOptions.includeContext ? '1' : '0',
        context: lookupOptions && lookupOptions.includeContext ? String(lookupOptions.context || '').slice(0, 500) : ''
      });
      return fetchJson(`/api/dictionary/lookup?${params.toString()}`).then(function (result) {
        return Object.assign({ enabled: true }, result);
      });
    }

    function readVocabularyRecords() {
      if (!storage) return {};
      try {
        const records = JSON.parse(storage.getItem('vocabulary-review-records') || '{}');
        return records && typeof records === 'object' && !Array.isArray(records) ? records : {};
      } catch (_error) {
        return {};
      }
    }

    function saveVocabulary(keyOrEntry, record) {
      if (!storage) throw new Error('storage is unavailable');
      const entry = typeof keyOrEntry === 'string' ? Object.assign({}, record || {}, { id: keyOrEntry }) : Object.assign({}, keyOrEntry || {});
      const key = String(entry.id || entry.canonicalKey || entry.lemma || entry.word || '').trim().toLowerCase();
      if (!key) throw new TypeError('vocabulary key is required');
      const records = readVocabularyRecords();
      delete entry.id;
      records[key] = Object.assign({}, records[key] || {}, entry);
      storage.setItem('vocabulary-review-records', JSON.stringify(records));
      return records[key];
    }

    function loadVocabularyExtras() {
      if (runtime !== 'web-server') return Promise.resolve([]);
      return fetchJson('/api/novel-vocab-list').then(function (items) {
        return Array.isArray(items) ? items : [];
      }).catch(function () { return []; });
    }

    function syncStudyStats(summary) {
      if (runtime !== 'web-server') return Promise.resolve({ sent: false, reason: 'disabled-runtime' });
      return fetchJson('/api/vocab-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(summary || {})
      }).then(function () { return { sent: true }; });
    }

    function syncVocabularyEntry(entry) {
      if (runtime !== 'web-server') return Promise.resolve({ sent: false, reason: 'disabled-runtime' });
      return fetchJson('/api/novel-vocab', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry || {})
      }).then(function () { return { sent: true }; });
    }

    function resolveMedia(packId, logicalPath) {
      return { status: 'missing', packId: String(packId || ''), logicalPath: String(logicalPath || ''), url: '' };
    }

    function navigate(relativeUrl) {
      const target = String(relativeUrl || '');
      if (!target || /^(?:https?:|javascript:|data:)/i.test(target)) throw new Error('Reader navigation requires a relative URL');
      if (locationRef && typeof locationRef.assign === 'function') locationRef.assign(target);
      else if (locationRef) locationRef.href = target;
      return target;
    }

    return {
      getRuntime: function () { return runtime; },
      canUseOnlineDictionary: function () { return runtime === 'web-server'; },
      loadCatalogue,
      loadChapter,
      lookupDictionary,
      readVocabularyRecords,
      saveVocabulary,
      loadVocabularyExtras,
      syncStudyStats,
      syncVocabularyEntry,
      resolveMedia,
      navigate
    };
  }

  return { RUNTIMES, createReaderRuntime, getRuntime };
});
