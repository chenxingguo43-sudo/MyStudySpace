(function(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.RussianB2Dashboard = api;
})(typeof window !== 'undefined' ? window : globalThis, function() {
  const ARCHIVE_SCHEMA = 'russian-b2-learning-archive/v1';
  const ARCHIVE_KEYS = [
    'rr_b2_progress_v1',
    'russian_b2_study_card_progress_v1',
    'rr_b2_reading_progress_v1',
    'russian_b2_writing_drafts_v1',
    'russian_b2_speaking_notes_v1',
    'russian_b2_exam_progress_v1',
    'russian_b2_exam_writing_drafts_v1',
    'russian_b2_listening_progress_v1',
    'russian_b2_writing_completed_v1',
    'russian_b2_speaking_completed_v1',
    'russian_b2_exam_completed_v1'
  ];
  function safeObject(value) {
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  }
  function parseableTimestamp(value) {
    return typeof value === 'string' && !Number.isNaN(Date.parse(value)) ? value : undefined;
  }
  function recordTimestamp(record) {
    const safe = safeObject(record);
    return parseableTimestamp(safe.updatedAt) || parseableTimestamp(safe.answeredAt) || parseableTimestamp(safe.lastAnsweredAt);
  }
  function latestTimestamp(values) {
    return values.reduce((latest, value) => {
      const timestamp = recordTimestamp(value);
      return timestamp && (!latest || Date.parse(timestamp) > Date.parse(latest)) ? timestamp : latest;
    }, undefined);
  }
  function progressEntry(moduleId, total, completed, options = {}) {
    const safeTotal = Math.max(0, Number.isFinite(total) ? total : 0);
    const safeCompleted = Math.min(safeTotal, Math.max(0, Number.isFinite(completed) ? completed : 0));
    const available = options.progressAvailable !== false;
    return {
      moduleId,
      progressAvailable: available,
      total: safeTotal,
      completed: safeCompleted,
      percent: available && safeTotal ? Math.round(safeCompleted / safeTotal * 100) : null,
      summary: options.summary || (safeTotal ? `${safeCompleted}/${safeTotal}` : '暂无可统计进度'),
      secondaryLabel: options.secondaryLabel || '',
      lastActivityAt: options.lastActivityAt
    };
  }
  function inventoryFor(inventories, moduleId) {
    return Object.prototype.hasOwnProperty.call(inventories, moduleId) && Array.isArray(inventories[moduleId]) ? inventories[moduleId] : null;
  }
  function objectiveModule(moduleId, inventory, records, grammar) {
    const store = safeObject(records);
    const complete = item => {
      const ids = Array.isArray(item.questionIds) ? item.questionIds : [];
      const itemRecords = grammar ? safeObject(store['russian_b2:' + item.id]) : store;
      return ids.every(id => safeObject(itemRecords[id])[grammar ? 'submitted' : 'answered'] === true);
    };
    const allRecords = grammar
      ? Object.values(store).flatMap(value => Object.values(safeObject(value)))
      : Object.values(store);
    return { total: inventory.length, completed: inventory.filter(complete).length, lastActivityAt: latestTimestamp(allRecords) };
  }
  function manualModule(inventory, records, drafts, label) {
    const store = safeObject(records);
    const tasks = inventory.flatMap(item => Array.isArray(item.taskIds) ? item.taskIds : []);
    const completed = tasks.filter(id => {
      const record = safeObject(store[id]);
      return record.completed === true && parseableTimestamp(record.updatedAt);
    }).length;
    const draftCount = Object.keys(safeObject(drafts)).length;
    return {
      total: tasks.length,
      completed,
      secondaryLabel: draftCount ? `${label} ${draftCount}` : '',
      lastActivityAt: latestTimestamp(Object.values(store).concat(Object.values(safeObject(drafts))))
    };
  }
  function examModule(inventory, objectiveRecords, manualRecords) {
    const objectives = safeObject(objectiveRecords), manuals = safeObject(manualRecords);
    const complete = chapter => {
      const questions = Array.isArray(chapter.questionIds) ? chapter.questionIds : [];
      const tasks = Array.isArray(chapter.taskIds) ? chapter.taskIds : [];
      return questions.every(id => safeObject(objectives[id]).answered === true) &&
        tasks.every(id => safeObject(manuals[chapter.id + ':' + id]).completed === true);
    };
    return {
      total: inventory.length,
      completed: inventory.filter(complete).length,
      lastActivityAt: latestTimestamp(Object.values(objectives).concat(Object.values(manuals)))
    };
  }
  function buildDashboardProgress({ manifest, inventories, records, lastRead } = {}) {
    const modules = {};
    const manifestModules = Array.isArray(safeObject(manifest).modules) ? manifest.modules.map(safeObject) : [];
    const availableModules = new Set(manifestModules.map(module => module.id).filter(id => typeof id === 'string'));
    const resumableModules = new Set(manifestModules
      .filter(module => module.status === undefined || module.status === 'available')
      .map(module => module.id).filter(id => typeof id === 'string'));
    const safeInventories = safeObject(inventories), safeRecords = safeObject(records);
    availableModules.forEach(moduleId => {
      if (moduleId === 'review') { modules[moduleId] = progressEntry(moduleId, 0, 0); return; }
      const inventory = inventoryFor(safeInventories, moduleId);
      if (!inventory) {
        modules[moduleId] = progressEntry(moduleId, 0, 0, { progressAvailable: false, secondaryLabel: '进度暂不可用' });
        return;
      }
      let progress;
      if (moduleId === 'grammar') progress = objectiveModule(moduleId, inventory, safeRecords.grammar, true);
      else if (moduleId === 'reading' || moduleId === 'listening') progress = objectiveModule(moduleId, inventory, safeRecords[moduleId], false);
      else if (moduleId === 'writing') progress = manualModule(inventory, safeRecords.writingCompleted || safeRecords.writing, safeRecords.writingDrafts, '草稿');
      else if (moduleId === 'speaking') progress = manualModule(inventory, safeRecords.speakingCompleted || safeRecords.speaking, safeRecords.speakingNotes, '笔记');
      else if (moduleId === 'exam') progress = examModule(inventory, safeRecords.exam, safeRecords.examCompleted);
      else progress = { total: 0, completed: 0 };
      modules[moduleId] = progressEntry(moduleId, progress.total, progress.completed, progress);
    });
    const last = safeObject(lastRead);
    const validLastRead = last.bookId === 'russian_b2' && resumableModules.has(last.moduleId) &&
      typeof last.chapter === 'number' && Number.isFinite(last.chapter) && last.chapter >= 0 && parseableTimestamp(last.updatedAt);
    const continueLearning = validLastRead ? {
      moduleId: last.moduleId, chapter: last.chapter, activeQuestionId: last.activeQuestionId,
      scroll: last.scroll, viewMode: last.viewMode, updatedAt: last.updatedAt
    } : undefined;
    return { continueLearning, modules };
  }
  function createArchive(values = {}, { now = new Date().toISOString() } = {}) {
    const records = {};
    ARCHIVE_KEYS.forEach(key => {
      if (Object.prototype.hasOwnProperty.call(values, key)) records[key] = { updatedAt: now, value: values[key] };
    });
    return { schema: ARCHIVE_SCHEMA, exportedAt: now, records };
  }
  function validateArchive(archive) {
    const errors = [];
    if (!archive || archive.schema !== ARCHIVE_SCHEMA) errors.push('archive schema is invalid');
    if (!archive || !archive.records || typeof archive.records !== 'object' || Array.isArray(archive.records)) errors.push('archive records are invalid');
    if (errors.length) return errors;
    Object.entries(archive.records).forEach(([key, record]) => {
      if (!ARCHIVE_KEYS.includes(key)) errors.push(`unrecognized archive key: ${key}`);
      if (!record || typeof record !== 'object' || !record.updatedAt || !Object.prototype.hasOwnProperty.call(record, 'value')) errors.push(`invalid archive record: ${key}`);
    });
    return errors;
  }
  function mergeArchive(local = {}, remote = {}) {
    const merged = { records: { ...(local.records || {}) } };
    const conflicts = [];
    Object.entries(remote.records || {}).forEach(([id, remoteRecord]) => {
      const localRecord = merged.records[id];
      if (!localRecord) { merged.records[id] = remoteRecord; return; }
      const localTime = Date.parse(localRecord.updatedAt || 0) || 0;
      const remoteTime = Date.parse(remoteRecord.updatedAt || 0) || 0;
      if (remoteTime > localTime) merged.records[id] = remoteRecord;
      else if (remoteTime === localTime && JSON.stringify(localRecord) !== JSON.stringify(remoteRecord)) conflicts.push({ id, local: localRecord, remote: remoteRecord });
    });
    return { merged, conflicts };
  }
  return { ARCHIVE_SCHEMA, ARCHIVE_KEYS, createArchive, validateArchive, mergeArchive, safeObject, buildDashboardProgress };
});
