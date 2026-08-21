(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.V1LearningArchive = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const ARCHIVE_SCHEMA = 'belye-nochi-learning-archive';
  const ARCHIVE_VERSION = 1;
  const LOCAL_STORAGE_MODULE = 'localStorage';
  const RECORDINGS_MODULE = 'recordings';
  const RECORDING_DATABASE = 'russian_b2_recordings';
  const RECORDING_DATABASE_VERSION = 1;
  const RECORDING_STORE = 'attempts';
  const EXACT_KEYS = Object.freeze([
    'rr_world_people_resume_v1', 'rr_b2_progress_v1', 'rr_b2_quiz_settings_v1',
    'russian_b2_study_card_progress_v1', 'rr_knowledge_card_resume_v1', 'rr_zlatoust_learning_v1', 'rr_b2_reading_progress_v1',
    'russian_b2_writing_drafts_v1', 'rr_ws_drafts_v1', 'russian_b2_writing_versions_v1',
    'russian_b2_writing_model_unlocks_v1', 'russian_b2_writing_completed_v1',
    'russian_b2_speaking_notes_v1', 'russian_b2_speaking_completed_v1',
    'russian_b2_listening_progress_v1', 'rr_listening_drafts_v1', 'rr_listening_attempts_v1',
    'rr_listening_settings_v1', 'rr_listening_quality_v1', 'russian_b2_exam_progress_v1',
    'russian_b2_exam_writing_drafts_v1', 'russian_b2_exam_completed_v1',
    'rr_reading_speaking_progress_v1', 'vocabulary-review-records', 'vocabulary-extras',
    'vocabulary-settings', 'vocabulary-custom-bgs-v1', 'v1_local_profile', 'v1_daily_checkins',
    'rr_vocabulary_aliases_v2', 'rr_vocabulary_migration_v2', 'rr_dictionary_missing_v1',
    'rr_dictionary_provisional_v1', 'zlatoust_grammar_progress_answer_repair_v1',
    'zlatoust_grammar_progress_answer_repair_v1_backup'
  ]);
  const KEY_PREFIXES = Object.freeze([
    'rr_state_', 'rr_stats_', 'rr_lastread_', 'rr_bookmarks_', 'rr_vocabulary_backup_v2_'
  ]);
  const exactKeySet = new Set(EXACT_KEYS);

  function isPlainObject(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
  }

  function isAllowedKey(key) {
    return typeof key === 'string' && (exactKeySet.has(key) || KEY_PREFIXES.some(prefix => key.startsWith(prefix)));
  }

  function storageKeys(storage) {
    const keys = [];
    for (let index = 0; index < Number(storage.length || 0); index += 1) {
      const key = storage.key(index);
      if (typeof key === 'string') keys.push(key);
    }
    return keys;
  }

  function listAllowedKeys(storage) {
    return storageKeys(storage).filter(isAllowedKey).sort();
  }

  function parseJson(raw, label) {
    try { return JSON.parse(raw); }
    catch (_error) { throw new Error(label + ' 不是有效 JSON'); }
  }

  function createArchive(storage, options) {
    if (!storage || typeof storage.getItem !== 'function') throw new TypeError('storage is required');
    const settings = options || {};
    const exportedAt = settings.now || new Date().toISOString();
    const records = {};
    const warnings = [];
    listAllowedKeys(storage).forEach(function (key) {
      try {
        const raw = storage.getItem(key);
        if (raw === null) return;
        parseJson(raw, key);
        records[key] = { value: raw };
      } catch (error) {
        warnings.push({ key, message: error && error.message || String(error) });
      }
    });
    return {
      schema: ARCHIVE_SCHEMA,
      version: ARCHIVE_VERSION,
      exportedAt,
      modules: { [LOCAL_STORAGE_MODULE]: { records } },
      warnings
    };
  }

  function parseArchive(input) {
    if (typeof input !== 'string') return input;
    try { return JSON.parse(input); }
    catch (_error) { throw new Error('学习档案不是有效 JSON'); }
  }

  function validateArchive(archive) {
    const errors = [];
    if (!isPlainObject(archive)) return ['学习档案必须是对象'];
    if (archive.schema !== ARCHIVE_SCHEMA) errors.push('不支持的学习档案类型');
    if (archive.version !== ARCHIVE_VERSION) errors.push('不支持的学习档案版本: ' + String(archive.version));
    if (typeof archive.exportedAt !== 'string' || Number.isNaN(Date.parse(archive.exportedAt))) errors.push('导出时间无效');
    if (!isPlainObject(archive.modules)) return errors.concat(['学习档案模块无效']);
    Object.keys(archive.modules).forEach(function (moduleName) {
      if (moduleName !== LOCAL_STORAGE_MODULE && moduleName !== RECORDINGS_MODULE) errors.push('未知学习档案模块: ' + moduleName);
    });
    const module = archive.modules[LOCAL_STORAGE_MODULE];
    if (!isPlainObject(module) || !isPlainObject(module.records)) return errors.concat(['localStorage 模块无效']);
    Object.entries(module.records).forEach(function (entry) {
      const key = entry[0], record = entry[1];
      if (!isAllowedKey(key)) errors.push('不允许导入的 localStorage 键: ' + key);
      if (!isPlainObject(record) || typeof record.value !== 'string') {
        errors.push('localStorage 记录无效: ' + key);
        return;
      }
      try { JSON.parse(record.value); }
      catch (_error) { errors.push('localStorage 记录不是有效 JSON: ' + key); }
    });
    if (Object.prototype.hasOwnProperty.call(archive.modules, RECORDINGS_MODULE)) {
      errors.push.apply(errors, validateRecordingsModule(archive.modules[RECORDINGS_MODULE]));
    }
    return errors;
  }

  function validateRecordingsModule(module) {
    const errors = [];
    if (!isPlainObject(module)) return ['录音模块无效'];
    if (module.database !== RECORDING_DATABASE) errors.push('不支持的录音数据库: ' + String(module.database));
    if (module.version !== RECORDING_DATABASE_VERSION) errors.push('不支持的录音数据库版本: ' + String(module.version));
    if (!isPlainObject(module.stores)) return errors.concat(['录音对象仓库无效']);
    Object.keys(module.stores).forEach(function (storeName) {
      if (storeName !== RECORDING_STORE) errors.push('未知录音对象仓库: ' + storeName);
    });
    const store = module.stores[RECORDING_STORE];
    if (!isPlainObject(store) || store.keyPath !== 'id' || !Array.isArray(store.records)) return errors.concat(['attempts 录音仓库无效']);
    const ids = new Set();
    store.records.forEach(function (record, index) {
      const label = '录音记录 #' + (index + 1);
      if (!isPlainObject(record) || typeof record.id !== 'string' || !record.id || typeof record.taskId !== 'string' || !record.taskId) {
        errors.push(label + ' 元数据无效');
        return;
      }
      if (ids.has(record.id)) errors.push('录音 ID 重复: ' + record.id);
      ids.add(record.id);
      if (typeof record.createdAt !== 'string' || Number.isNaN(Date.parse(record.createdAt))) errors.push(label + ' 创建时间无效');
      if (typeof record.mimeType !== 'string' || !record.mimeType) errors.push(label + ' MIME 类型无效');
      const audio = record.audio;
      if (!isPlainObject(audio) || audio.encoding !== 'base64' || typeof audio.data !== 'string' || !Number.isInteger(audio.size) || audio.size < 0) {
        errors.push(label + ' 音频数据无效');
      } else if (!isCanonicalBase64(audio.data)) {
        errors.push(label + ' Base64 音频损坏');
      } else if (base64ToBytes(audio.data).byteLength !== audio.size) {
        errors.push(label + ' 音频大小不匹配');
      }
    });
    return errors;
  }

  function recordTimestamp(value) {
    if (!isPlainObject(value)) return 0;
    const candidates = ['updatedAt', 'lastAnsweredAt', 'answeredAt', 'lastReviewedAt', 'createdAt'];
    for (const key of candidates) {
      const timestamp = Date.parse(value[key]);
      if (!Number.isNaN(timestamp)) return timestamp;
    }
    return 0;
  }

  function stableJson(value) {
    if (Array.isArray(value)) return '[' + value.map(stableJson).join(',') + ']';
    if (isPlainObject(value)) return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + stableJson(value[key])).join(',') + '}';
    return JSON.stringify(value);
  }

  function mergeValues(localValue, importedValue) {
    if (isPlainObject(localValue) && isPlainObject(importedValue)) {
      const localTime = recordTimestamp(localValue), importedTime = recordTimestamp(importedValue);
      if (localTime && importedTime && localTime !== importedTime) return importedTime > localTime ? importedValue : localValue;
      const merged = Object.assign({}, localValue);
      Object.keys(importedValue).forEach(function (key) {
        merged[key] = Object.prototype.hasOwnProperty.call(localValue, key)
          ? mergeValues(localValue[key], importedValue[key])
          : importedValue[key];
      });
      return merged;
    }
    if (Array.isArray(localValue) && Array.isArray(importedValue)) {
      const seen = new Set();
      return localValue.concat(importedValue).filter(function (item) {
        const identity = stableJson(item);
        if (seen.has(identity)) return false;
        seen.add(identity);
        return true;
      });
    }
    return importedValue;
  }

  function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    if (typeof Buffer !== 'undefined') return Buffer.from(bytes).toString('base64');
    let binary = '';
    const chunkSize = 0x8000;
    for (let offset = 0; offset < bytes.length; offset += chunkSize) {
      binary += String.fromCharCode.apply(null, bytes.subarray(offset, offset + chunkSize));
    }
    return btoa(binary);
  }

  function base64ToBytes(value) {
    if (typeof Buffer !== 'undefined') return new Uint8Array(Buffer.from(value, 'base64'));
    const binary = atob(value), bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return bytes;
  }

  function isCanonicalBase64(value) {
    if (typeof value !== 'string' || value.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(value)) return false;
    try {
      return arrayBufferToBase64(base64ToBytes(value)).replace(/=+$/, '') === value.replace(/=+$/, '');
    } catch (_error) { return false; }
  }

  async function serializeRecordingAttempt(attempt) {
    if (!isPlainObject(attempt) || !(attempt.blob instanceof Blob)) throw new Error('录音记录缺少 Blob: ' + String(attempt && attempt.id || 'unknown'));
    const metadata = Object.assign({}, attempt);
    delete metadata.blob;
    const buffer = await attempt.blob.arrayBuffer();
    metadata.mimeType = metadata.mimeType || attempt.blob.type || 'audio/webm';
    metadata.audio = { encoding: 'base64', size: attempt.blob.size, data: arrayBufferToBase64(buffer) };
    return metadata;
  }

  function deserializeRecordingAttempt(record) {
    const attempt = Object.assign({}, record);
    delete attempt.audio;
    const bytes = base64ToBytes(record.audio.data);
    if (bytes.byteLength !== record.audio.size) throw new Error('录音数据大小不匹配: ' + record.id);
    attempt.blob = new Blob([bytes], { type: record.mimeType });
    return attempt;
  }

  function openRecordingDatabase(indexedDb) {
    return new Promise(function (resolve, reject) {
      if (!indexedDb || typeof indexedDb.open !== 'function') { reject(new Error('当前环境不支持 IndexedDB')); return; }
      const request = indexedDb.open(RECORDING_DATABASE, RECORDING_DATABASE_VERSION);
      request.onupgradeneeded = function () {
        if (!request.result.objectStoreNames.contains(RECORDING_STORE)) request.result.createObjectStore(RECORDING_STORE, { keyPath: 'id' });
      };
      request.onsuccess = function () { resolve(request.result); };
      request.onerror = function () { reject(request.error || new Error('无法打开录音数据库')); };
    });
  }

  async function readRecordingAttempts(indexedDb) {
    const database = await openRecordingDatabase(indexedDb);
    return new Promise(function (resolve, reject) {
      const transaction = database.transaction(RECORDING_STORE, 'readonly');
      const request = transaction.objectStore(RECORDING_STORE).getAll();
      request.onsuccess = function () { resolve(Array.isArray(request.result) ? request.result : []); };
      request.onerror = function () { reject(request.error || new Error('读取录音失败')); };
      transaction.onerror = function () { reject(transaction.error || new Error('读取录音事务失败')); };
      transaction.oncomplete = function () { database.close(); };
      transaction.onabort = function () { database.close(); };
    });
  }

  async function replaceRecordingAttempts(indexedDb, attempts) {
    const database = await openRecordingDatabase(indexedDb);
    return new Promise(function (resolve, reject) {
      const transaction = database.transaction(RECORDING_STORE, 'readwrite');
      const store = transaction.objectStore(RECORDING_STORE);
      transaction.oncomplete = function () { database.close(); resolve(attempts.length); };
      transaction.onerror = function () { database.close(); reject(transaction.error || new Error('写入录音事务失败')); };
      transaction.onabort = function () { database.close(); reject(transaction.error || new Error('录音导入已回滚')); };
      try {
        store.clear();
        attempts.forEach(function (attempt) { store.put(attempt); });
      } catch (error) {
        try { transaction.abort(); } catch (_abortError) {}
        reject(error);
      }
    });
  }

  function mergeRecordingAttempts(localAttempts, importedAttempts) {
    const merged = new Map();
    localAttempts.forEach(function (attempt) { merged.set(attempt.id, attempt); });
    importedAttempts.forEach(function (attempt) {
      const local = merged.get(attempt.id);
      if (!local) { merged.set(attempt.id, attempt); return; }
      const localTime = Date.parse(local.createdAt) || 0, importedTime = Date.parse(attempt.createdAt) || 0;
      if (importedTime > localTime) merged.set(attempt.id, attempt);
    });
    return Array.from(merged.values()).sort(function (left, right) { return String(left.id).localeCompare(String(right.id)); });
  }

  async function createCompleteArchive(storage, options) {
    const settings = options || {};
    const result = createArchive(storage, settings);
    const attempts = await readRecordingAttempts(settings.indexedDB || (typeof indexedDB !== 'undefined' ? indexedDB : null));
    const records = [];
    for (const attempt of attempts) records.push(await serializeRecordingAttempt(attempt));
    result.modules[RECORDINGS_MODULE] = {
      database: RECORDING_DATABASE,
      version: RECORDING_DATABASE_VERSION,
      stores: { [RECORDING_STORE]: { keyPath: 'id', records } }
    };
    return result;
  }

  async function importRecordings(indexedDb, module, options) {
    const errors = validateRecordingsModule(module);
    if (errors.length) throw new Error('录音档案校验失败：' + errors.join('；'));
    const mode = options && options.mode || 'merge';
    if (mode !== 'merge' && mode !== 'replace') throw new Error('不支持的录音导入方式: ' + mode);
    const imported = module.stores[RECORDING_STORE].records.map(deserializeRecordingAttempt);
    const local = mode === 'merge' ? await readRecordingAttempts(indexedDb) : [];
    const next = mode === 'merge' ? mergeRecordingAttempts(local, imported) : imported;
    try { await replaceRecordingAttempts(indexedDb, next); }
    catch (error) {
      const failure = new Error('录音导入失败，IndexedDB 事务已回滚: ' + (error && error.message || String(error)));
      failure.cause = error;
      throw failure;
    }
    return { mode, imported: imported.length, total: next.length };
  }

  function captureLocalRecords(storage, records) {
    const snapshot = new Map();
    Object.keys(records).forEach(function (key) { snapshot.set(key, storage.getItem(key)); });
    return snapshot;
  }

  function restoreLocalRecords(storage, snapshot) {
    const errors = [];
    Array.from(snapshot.keys()).reverse().forEach(function (key) {
      try {
        const value = snapshot.get(key);
        if (value === null) storage.removeItem(key);
        else storage.setItem(key, value);
      } catch (error) { errors.push({ key, message: error && error.message || String(error) }); }
    });
    return errors;
  }

  async function importLearningArchive(storage, indexedDb, input, options) {
    const archive = parseArchive(input);
    const errors = validateArchive(archive);
    if (errors.length) throw new Error('学习档案校验失败：' + errors.join('；'));
    const mode = options && options.mode || 'merge';
    const localRecords = archive.modules[LOCAL_STORAGE_MODULE].records;
    const localSnapshot = captureLocalRecords(storage, localRecords);
    const localResult = importArchive(storage, archive, { mode });
    try {
      const recordingResult = archive.modules[RECORDINGS_MODULE]
        ? await importRecordings(indexedDb, archive.modules[RECORDINGS_MODULE], { mode })
        : null;
      return { localStorage: localResult, recordings: recordingResult };
    } catch (error) {
      const rollbackErrors = restoreLocalRecords(storage, localSnapshot);
      const failure = new Error('完整学习档案导入失败，本机学习记录已恢复: ' + (error && error.message || String(error)));
      failure.cause = error;
      failure.rollbackErrors = rollbackErrors;
      throw failure;
    }
  }

  function prepareWrites(storage, records, mode) {
    return Object.keys(records).sort().map(function (key) {
      const importedRaw = records[key].value;
      if (mode === 'replace') return { key, value: importedRaw };
      const localRaw = storage.getItem(key);
      if (localRaw === null) return { key, value: importedRaw };
      let localValue;
      try { localValue = JSON.parse(localRaw); }
      catch (_error) { throw new Error('本机数据损坏，无法合并: ' + key); }
      return { key, value: JSON.stringify(mergeValues(localValue, JSON.parse(importedRaw))) };
    });
  }

  function importArchive(storage, input, options) {
    if (!storage || typeof storage.getItem !== 'function' || typeof storage.setItem !== 'function') throw new TypeError('storage is required');
    const archive = parseArchive(input);
    const errors = validateArchive(archive);
    if (errors.length) throw new Error('学习档案校验失败：' + errors.join('；'));
    const mode = options && options.mode || 'merge';
    if (mode !== 'merge' && mode !== 'replace') throw new Error('不支持的导入方式: ' + mode);
    const records = archive.modules[LOCAL_STORAGE_MODULE].records;
    const writes = prepareWrites(storage, records, mode);
    const previous = new Map();
    const changed = [];
    try {
      writes.forEach(function (write) {
        previous.set(write.key, storage.getItem(write.key));
        storage.setItem(write.key, write.value);
        changed.push(write.key);
      });
    } catch (error) {
      const rollbackErrors = [];
      Array.from(previous.keys()).reverse().forEach(function (key) {
        try {
          const oldValue = previous.get(key);
          if (oldValue === null) storage.removeItem(key);
          else storage.setItem(key, oldValue);
        } catch (rollbackError) {
          rollbackErrors.push({ key, message: rollbackError && rollbackError.message || String(rollbackError) });
        }
      });
      const failure = new Error('学习档案导入失败，本轮修改已回滚: ' + (error && error.message || String(error)));
      failure.rollbackErrors = rollbackErrors;
      throw failure;
    }
    return { mode, imported: writes.length, keys: changed };
  }

  function summarizeArchive(input) {
    const archive = parseArchive(input);
    const errors = validateArchive(archive);
    if (errors.length) return { valid: false, errors, modules: {}, totalRecords: 0 };
    const records = archive.modules[LOCAL_STORAGE_MODULE].records;
    const modules = { [LOCAL_STORAGE_MODULE]: Object.keys(records).length };
    if (archive.modules[RECORDINGS_MODULE]) modules[RECORDINGS_MODULE] = archive.modules[RECORDINGS_MODULE].stores[RECORDING_STORE].records.length;
    return { valid: true, errors: [], modules, totalRecords: Object.values(modules).reduce((total, count) => total + count, 0) };
  }

  return {
    ARCHIVE_SCHEMA, ARCHIVE_VERSION, EXACT_KEYS, KEY_PREFIXES,
    RECORDING_DATABASE, RECORDING_DATABASE_VERSION, RECORDING_STORE,
    createArchive, createCompleteArchive, deserializeRecordingAttempt, importArchive, importLearningArchive, importRecordings,
    isAllowedKey, listAllowedKeys, mergeRecordingAttempts, mergeValues, parseArchive,
    readRecordingAttempts, replaceRecordingAttempts, serializeRecordingAttempt,
    summarizeArchive, validateArchive, validateRecordingsModule
  };
});
