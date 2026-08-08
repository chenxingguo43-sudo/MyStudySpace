(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.StudyActivityStore = api.createStore();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const environment = typeof globalThis !== 'undefined' ? globalThis : {};

  const DB_NAME = 'belye_nochi_activity';
  const DB_VERSION = 1;
  const STORE_NAME = 'records';
  const FALLBACK_KEY = 'belye-nochi-study-activity/v1';
  const MODULES = new Set(['reader', 'vocabulary', 'b2', 'legacy-focus']);
  const ACTIONS = new Set(['study', 'review', 'practice', 'submit', 'complete', 'focus']);

  function localDate(value = new Date(), timeZone = 'Asia/Shanghai') {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) throw new TypeError('invalid date');
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone, year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(date).reduce((result, part) => {
      if (part.type !== 'literal') result[part.type] = part.value;
      return result;
    }, {});
    return `${parts.year}-${parts.month}-${parts.day}`;
  }

  function iso(value = new Date()) {
    const result = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(result.getTime())) throw new TypeError('invalid timestamp');
    return result.toISOString();
  }

  function integer(value, fallback = 0) {
    const result = Number(value);
    return Number.isFinite(result) && result >= 0 ? Math.floor(result) : fallback;
  }

  function uniqueStrings(values) {
    return [...new Set((Array.isArray(values) ? values : []).map(value => String(value || '').trim()).filter(Boolean))];
  }

  function createId(prefix = 'act') {
    const random = environment.crypto && typeof environment.crypto.randomUUID === 'function'
      ? environment.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    return `${prefix}_${random}`;
  }

  function normalizeRecord(input = {}, defaults = {}) {
    const moduleName = String(input.module || defaults.module || 'reader');
    const action = String(input.action || defaults.action || 'study');
    if (!MODULES.has(moduleName)) throw new TypeError(`unsupported activity module: ${moduleName}`);
    if (!ACTIONS.has(action)) throw new TypeError(`unsupported activity action: ${action}`);
    const startedAt = input.startedAt ? iso(input.startedAt) : iso(defaults.startedAt || new Date());
    const endedAt = input.endedAt ? iso(input.endedAt) : '';
    if (endedAt && new Date(endedAt).getTime() < new Date(startedAt).getTime()) {
      throw new TypeError('endedAt must not be before startedAt');
    }
    const itemIds = uniqueStrings(input.content && input.content.itemIds || input.itemIds);
    return {
      id: String(input.id || createId()),
      schema: 'belye-nochi-study-activity/v1',
      schemaVersion: 1,
      kind: input.kind === 'event' ? 'event' : 'session',
      module: moduleName,
      submodule: String(input.submodule || defaults.submodule || ''),
      action,
      localDate: String(input.localDate || localDate(startedAt, input.timeZone || defaults.timeZone || 'Asia/Shanghai')),
      timeZone: String(input.timeZone || defaults.timeZone || 'Asia/Shanghai'),
      startedAt,
      endedAt,
      durationSec: integer(input.durationSec),
      completedCount: integer(input.completedCount),
      attemptCount: integer(input.attemptCount),
      content: {
        bookId: String(input.content && input.content.bookId || input.bookId || ''),
        chapterId: String(input.content && input.content.chapterId || input.chapterId || ''),
        unitId: String(input.content && input.content.unitId || input.unitId || ''),
        itemIds
      },
      capture: {
        mode: String(input.capture && input.capture.mode || 'live'),
        source: String(input.capture && input.capture.source || defaults.source || ''),
        sourceKey: String(input.capture && input.capture.sourceKey || ''),
        runtime: String(input.capture && input.capture.runtime || (environment.Capacitor ? 'android' : 'web')),
        policy: String(input.capture && input.capture.policy || 'active-visible-v1')
      },
      quality: {
        timePrecision: String(input.quality && input.quality.timePrecision || 'exact'),
        durationMode: String(input.quality && input.quality.durationMode || 'active')
      },
      idempotencyKey: String(input.idempotencyKey || ''),
      createdAt: input.createdAt ? iso(input.createdAt) : iso(defaults.createdAt || new Date()),
      updatedAt: input.updatedAt ? iso(input.updatedAt) : iso(defaults.updatedAt || new Date()),
      retractedAt: input.retractedAt ? iso(input.retractedAt) : '',
      retractReason: String(input.retractReason || '')
    };
  }

  function mergeRecord(previous, patch) {
    const merged = {
      ...previous,
      ...patch,
      content: { ...previous.content, ...(patch.content || {}) },
      capture: { ...previous.capture, ...(patch.capture || {}) },
      quality: { ...previous.quality, ...(patch.quality || {}) },
      updatedAt: iso()
    };
    return normalizeRecord(merged, merged);
  }

  function aggregateRecords(records, localDay) {
    const valid = (Array.isArray(records) ? records : []).filter(record =>
      record && !record.retractedAt && (!localDay || record.localDate === localDay)
    );
    const completed = new Set();
    const completedByModule = {};
    const result = {
      localDate: localDay || '', totalDurationSec: 0, attempts: 0,
      completedCount: 0, byModule: {}, sessions: valid.length
    };
    for (const record of valid) {
      result.totalDurationSec += integer(record.durationSec);
      result.attempts += integer(record.attemptCount);
      for (const itemId of record.content && record.content.itemIds || []) {
        if (record.completedCount > 0 || record.action === 'complete' || record.action === 'submit') {
          completed.add(itemId);
          if (!completedByModule[record.module]) completedByModule[record.module] = new Set();
          completedByModule[record.module].add(itemId);
        }
      }
      const moduleName = record.module || 'reader';
      const bucket = result.byModule[moduleName] || { durationSec: 0, attempts: 0, completedCount: 0 };
      bucket.durationSec += integer(record.durationSec);
      bucket.attempts += integer(record.attemptCount);
      result.byModule[moduleName] = bucket;
    }
    result.completedCount = completed.size;
    for (const [moduleName, bucket] of Object.entries(result.byModule)) {
      bucket.completedCount = completedByModule[moduleName] ? completedByModule[moduleName].size : 0;
    }
    return result;
  }

  function shiftLocalDate(day, offsetDays) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(day || ''));
    if (!match) throw new TypeError('invalid local date');
    const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + Number(offsetDays || 0)));
    return date.toISOString().slice(0, 10);
  }

  function memoryAdapter() {
    const records = new Map();
    return {
      async get(id) { return records.get(id) || null; },
      async put(record) { records.set(record.id, record); return record; },
      async all() { return [...records.values()]; }
    };
  }

  function localStorageAdapter(storage) {
    function read() {
      try { return JSON.parse(storage.getItem(FALLBACK_KEY) || '[]'); } catch (_error) { return []; }
    }
    function write(records) { storage.setItem(FALLBACK_KEY, JSON.stringify(records)); }
    return {
      async get(id) { return read().find(record => record.id === id) || null; },
      async put(record) { const records = read().filter(item => item.id !== record.id); records.push(record); write(records); return record; },
      async all() { return read(); }
    };
  }

  function indexedDbAdapter(indexedDb) {
    let databasePromise;
    function database() {
      if (databasePromise) return databasePromise;
      databasePromise = new Promise((resolve, reject) => {
        const request = indexedDb.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            const records = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            records.createIndex('localDate', 'localDate', { unique: false });
            records.createIndex('module', 'module', { unique: false });
          }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error || new Error('activity database unavailable'));
      });
      return databasePromise;
    }
    return {
      async get(id) { const db = await database(); return new Promise((resolve, reject) => { const request = db.transaction(STORE_NAME).objectStore(STORE_NAME).get(id); request.onsuccess = () => resolve(request.result || null); request.onerror = () => reject(request.error); }); },
      async put(record) { const db = await database(); return new Promise((resolve, reject) => { const request = db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).put(record); request.onsuccess = () => resolve(record); request.onerror = () => reject(request.error); }); },
      async all() { const db = await database(); return new Promise((resolve, reject) => { const request = db.transaction(STORE_NAME).objectStore(STORE_NAME).getAll(); request.onsuccess = () => resolve(request.result || []); request.onerror = () => reject(request.error); }); }
    };
  }

  function createStore(options = {}) {
    const storage = options.storage || (environment.localStorage && environment.localStorage.getItem ? environment.localStorage : null);
    const adapter = options.adapter || (environment.indexedDB ? indexedDbAdapter(environment.indexedDB) : storage ? localStorageAdapter(storage) : memoryAdapter());
    return {
      localDate,
      shiftLocalDate,
      async startSession(input = {}) { const record = normalizeRecord({ ...input, kind: 'session', endedAt: '' }); return adapter.put(record); },
      async checkpoint(sessionId, patch = {}) { const previous = await adapter.get(sessionId); if (!previous) throw new Error('activity session not found'); return adapter.put(mergeRecord(previous, patch)); },
      async finishSession(sessionId, patch = {}) { const previous = await adapter.get(sessionId); if (!previous) throw new Error('activity session not found'); return adapter.put(mergeRecord(previous, { ...patch, endedAt: patch.endedAt || iso() })); },
      async recordEvent(input = {}) { return adapter.put(normalizeRecord({ ...input, kind: 'event' })); },
      async appendLegacyEvent(input = {}) { return adapter.put(normalizeRecord({ ...input, kind: 'event', capture: { ...(input.capture || {}), mode: 'legacy' }, quality: { ...(input.quality || {}), timePrecision: input.quality && input.quality.timePrecision || 'date-only' } })); },
      async retract(id, reason = '') { const previous = await adapter.get(id); if (!previous) return null; return adapter.put(mergeRecord(previous, { retractedAt: iso(), retractReason: reason })); },
      async queryRange(startDate, endDate = startDate) { const records = await adapter.all(); return records.filter(record => record.localDate >= startDate && record.localDate <= endDate && !record.retractedAt).sort((a, b) => String(b.startedAt).localeCompare(String(a.startedAt))); },
      async aggregateDay(day = localDate()) { return aggregateRecords(await adapter.all(), day); },
      async aggregateRange(startDate, endDate = startDate) { return aggregateRecords(await this.queryRange(startDate, endDate)); }
    };
  }

  return { DB_NAME, FALLBACK_KEY, aggregateRecords, createStore, localDate, normalizeRecord, shiftLocalDate };
});
