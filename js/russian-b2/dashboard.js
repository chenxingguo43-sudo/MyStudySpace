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
    'russian_b2_exam_writing_drafts_v1'
  ];
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
  return { ARCHIVE_SCHEMA, ARCHIVE_KEYS, createArchive, validateArchive, mergeArchive };
});
