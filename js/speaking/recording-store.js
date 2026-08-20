(function(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.WhiteNightSpeakingRecordingStore = api;
})(typeof window !== 'undefined' ? window : globalThis, function() {
  'use strict';

  const DEFAULT_DATABASE = 'white_night_speaking_v2';
  const DATABASE_VERSION = 1;
  const STORES = Object.freeze({
    recordings: 'recordings',
    sessions: 'sessions',
    turns: 'turns',
    outbox: 'outbox'
  });

  function storeError(code, message, cause) {
    const error = new Error(message);
    error.code = code;
    if (cause) error.cause = cause;
    return error;
  }

  function validateRecording(record) {
    if (!record || typeof record !== 'object') throw storeError('INVALID_RECORDING', '录音记录无效');
    if (!record.id || typeof record.id !== 'string') throw storeError('INVALID_RECORDING_ID', '录音记录缺少稳定 ID');
    if (!record.createdAt || Number.isNaN(Date.parse(record.createdAt))) throw storeError('INVALID_CREATED_AT', '录音记录缺少有效时间');
    if (!record.blob || typeof record.blob.size !== 'number' || record.blob.size <= 0) throw storeError('EMPTY_RECORDING', '录音文件为空');
    return Object.assign({}, record, {
      durationMs: Math.max(0, Number(record.durationMs) || 0),
      mimeType: record.mimeType || record.blob.type || 'application/octet-stream',
      size: record.blob.size,
      transcriptStatus: record.transcriptStatus || 'not_requested'
    });
  }

  function createMemoryRecordingStore(seed) {
    const records = new Map();
    (seed || []).forEach(function(record) {
      const valid = validateRecording(record);
      records.set(valid.id, valid);
    });
    return {
      save: async function(record) {
        const valid = validateRecording(record);
        records.set(valid.id, valid);
        return valid;
      },
      get: async function(id) { return records.get(id) || null; },
      list: async function(options) {
        const limit = Math.max(0, Number(options && options.limit) || records.size);
        return Array.from(records.values())
          .sort(function(a, b) { return b.createdAt.localeCompare(a.createdAt); })
          .slice(0, limit);
      },
      remove: async function(id) { return records.delete(id); },
      stats: async function() {
        const values = Array.from(records.values());
        return { count: values.length, bytes: values.reduce(function(total, item) { return total + item.size; }, 0) };
      },
      close: function() {},
      _records: records
    };
  }

  function createRecordingStore(options) {
    const settings = options || {};
    const indexedDb = settings.indexedDB || (typeof indexedDB !== 'undefined' ? indexedDB : null);
    const databaseName = settings.databaseName || DEFAULT_DATABASE;
    let openPromise = null;
    let database = null;

    function open() {
      if (database) return Promise.resolve(database);
      if (openPromise) return openPromise;
      if (!indexedDb) return Promise.reject(storeError('INDEXEDDB_UNAVAILABLE', '当前环境不支持 IndexedDB'));
      openPromise = new Promise(function(resolve, reject) {
        let request;
        try { request = indexedDb.open(databaseName, DATABASE_VERSION); }
        catch (error) { reject(storeError('OPEN_FAILED', '无法打开本地录音库', error)); return; }
        request.onupgradeneeded = function() {
          const db = request.result;
          if (!db.objectStoreNames.contains(STORES.recordings)) {
            const recordings = db.createObjectStore(STORES.recordings, { keyPath: 'id' });
            recordings.createIndex('createdAt', 'createdAt', { unique: false });
            recordings.createIndex('sessionId', 'sessionId', { unique: false });
          }
          [STORES.sessions, STORES.turns, STORES.outbox].forEach(function(name) {
            if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, { keyPath: 'id' });
          });
        };
        request.onsuccess = function() {
          database = request.result;
          database.onversionchange = function() { database.close(); database = null; openPromise = null; };
          resolve(database);
        };
        request.onerror = function() { reject(storeError('OPEN_FAILED', '无法打开本地录音库', request.error)); };
        request.onblocked = function() { reject(storeError('OPEN_BLOCKED', '本地录音库正在被其他页面占用')); };
      }).catch(function(error) { openPromise = null; throw error; });
      return openPromise;
    }

    function transaction(mode, operation) {
      return open().then(function(db) {
        return new Promise(function(resolve, reject) {
          let result;
          const tx = db.transaction(STORES.recordings, mode);
          const store = tx.objectStore(STORES.recordings);
          try { result = operation(store, resolve, reject); }
          catch (error) { reject(storeError('TRANSACTION_FAILED', '本地录音库操作失败', error)); return; }
          tx.oncomplete = function() { if (result !== undefined) resolve(result); };
          tx.onerror = function() { reject(storeError('TRANSACTION_FAILED', '本地录音库操作失败', tx.error)); };
          tx.onabort = function() { reject(storeError('TRANSACTION_ABORTED', '本地录音库操作已中止', tx.error)); };
        });
      });
    }

    return {
      open: open,
      save: function(record) {
        const valid = validateRecording(record);
        return transaction('readwrite', function(store) { store.put(valid); return valid; });
      },
      get: function(id) {
        return transaction('readonly', function(store, resolve, reject) {
          const request = store.get(id);
          request.onsuccess = function() { resolve(request.result || null); };
          request.onerror = function() { reject(storeError('READ_FAILED', '读取本地录音失败', request.error)); };
        });
      },
      list: function(options) {
        const limit = Math.max(0, Number(options && options.limit) || 100);
        return transaction('readonly', function(store, resolve, reject) {
          const request = store.getAll();
          request.onsuccess = function() {
            resolve((request.result || []).sort(function(a, b) { return b.createdAt.localeCompare(a.createdAt); }).slice(0, limit));
          };
          request.onerror = function() { reject(storeError('LIST_FAILED', '读取本地录音列表失败', request.error)); };
        });
      },
      remove: function(id) {
        return transaction('readwrite', function(store) { store.delete(id); return true; });
      },
      stats: function() {
        return this.list({ limit: Number.MAX_SAFE_INTEGER }).then(function(records) {
          return { count: records.length, bytes: records.reduce(function(total, item) { return total + (Number(item.size) || 0); }, 0) };
        });
      },
      close: function() {
        if (database) database.close();
        database = null;
        openPromise = null;
      }
    };
  }

  return {
    DEFAULT_DATABASE: DEFAULT_DATABASE,
    DATABASE_VERSION: DATABASE_VERSION,
    STORES: STORES,
    createRecordingStore: createRecordingStore,
    createMemoryRecordingStore: createMemoryRecordingStore,
    validateRecording: validateRecording
  };
});


