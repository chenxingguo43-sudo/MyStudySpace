(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.RussianListeningQuality = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  var STORAGE_KEY = 'rr_listening_quality_v1';
  var DUE_INTERVALS_DAYS = [1, 3, 7, 14, 30];

  function hash(value) {
    var input = String(value || ''), result = 2166136261;
    for (var index = 0; index < input.length; index++) {
      result ^= input.charCodeAt(index);
      result = Math.imul(result, 16777619);
    }
    return (result >>> 0).toString(36);
  }

  function normalizeText(value) {
    return String(value || '').toLowerCase().replace(/ё/g, 'е').replace(/[^\p{L}\p{N}-]+/gu, ' ').replace(/\s+/g, ' ').trim();
  }

  function tokens(value) {
    var normalized = normalizeText(value);
    return normalized ? normalized.split(' ') : [];
  }

  function makeSegmentId(details) {
    details = details || {};
    return 'lsq_' + hash([details.bookId || '', details.chapterId || '', details.source || 'feature', details.mediaFile || '', normalizeText(details.text)].join('|'));
  }

  function makeRecord(details, existing, now) {
    details = details || {};
    existing = existing && typeof existing === 'object' ? existing : {};
    var timestamp = now || new Date().toISOString();
    return Object.assign({
      id: makeSegmentId(details),
      bookId: String(details.bookId || ''),
      chapterId: String(details.chapterId || ''),
      segmentIndex: Number.isFinite(Number(details.segmentIndex)) ? Number(details.segmentIndex) : -1,
      text: String(details.text || ''),
      mediaFile: String(details.mediaFile || ''),
      playlistIndex: Number(details.playlistIndex) || 0,
      startTime: Number.isFinite(Number(details.startTime)) ? Number(details.startTime) : null,
      endTime: Number.isFinite(Number(details.endTime)) ? Number(details.endTime) : null,
      source: details.source === 'media-exercise' ? 'media-exercise' : 'feature',
      isMediaExercise: details.source === 'media-exercise',
      firstMarkedAt: '',
      lastReviewedAt: '',
      reviewCount: 0,
      status: 'unmarked',
      dictation: { lastInput: '', lastScore: null, attempts: 0, completed: false, lastAttemptAt: '', missingWords: [], extraWords: [] }
    }, existing, {
      id: existing.id || makeSegmentId(details),
      bookId: String(details.bookId || existing.bookId || ''),
      chapterId: String(details.chapterId || existing.chapterId || ''),
      segmentIndex: Number.isFinite(Number(details.segmentIndex)) ? Number(details.segmentIndex) : existing.segmentIndex,
      text: String(details.text || existing.text || ''),
      mediaFile: String(details.mediaFile || existing.mediaFile || ''),
      playlistIndex: Number.isFinite(Number(details.playlistIndex)) ? Number(details.playlistIndex) : Number(existing.playlistIndex) || 0,
      startTime: Number.isFinite(Number(details.startTime)) ? Number(details.startTime) : existing.startTime,
      endTime: Number.isFinite(Number(details.endTime)) ? Number(details.endTime) : existing.endTime,
      source: details.source === 'media-exercise' ? 'media-exercise' : (existing.source || 'feature'),
      isMediaExercise: details.source === 'media-exercise' || existing.isMediaExercise === true,
      dictation: Object.assign({ lastInput: '', lastScore: null, attempts: 0, completed: false, lastAttemptAt: '', missingWords: [], extraWords: [] }, existing.dictation || {})
    });
  }

  function compareDictation(expected, actual) {
    var expectedTokens = tokens(expected), actualTokens = tokens(actual), available = {};
    expectedTokens.forEach(function (word) { available[word] = (available[word] || 0) + 1; });
    var matched = 0, extra = [];
    actualTokens.forEach(function (word) {
      if (available[word] > 0) { available[word]--; matched++; }
      else extra.push(word);
    });
    var missing = [];
    Object.keys(available).forEach(function (word) {
      for (var count = 0; count < available[word]; count++) missing.push(word);
    });
    var score = expectedTokens.length || actualTokens.length ? Math.round((2 * matched / (expectedTokens.length + actualTokens.length)) * 100) : 0;
    return { score: score, matched: matched, expectedCount: expectedTokens.length, actualCount: actualTokens.length, missingWords: missing, extraWords: extra, completed: expectedTokens.length > 0 && !missing.length && !extra.length };
  }

  function markDifficult(records, details, now) {
    var id = makeSegmentId(details), record = makeRecord(details, records && records[id], now), timestamp = now || new Date().toISOString();
    if (record.status === 'difficult') record.status = 'unmarked';
    else {
      record.status = 'difficult';
      record.firstMarkedAt = record.firstMarkedAt || timestamp;
    }
    return Object.assign({}, records || {}, (function () { var patch = {}; patch[id] = record; return patch; })());
  }

  function recordDictation(records, details, input, now) {
    var id = makeSegmentId(details), timestamp = now || new Date().toISOString(), record = makeRecord(details, records && records[id], timestamp);
    var result = compareDictation(record.text, input);
    record.dictation = Object.assign({}, record.dictation, {
      lastInput: String(input || ''), lastScore: result.score, attempts: Number(record.dictation.attempts || 0) + 1,
      completed: result.completed, lastAttemptAt: timestamp, missingWords: result.missingWords, extraWords: result.extraWords
    });
    record.lastReviewedAt = timestamp;
    record.reviewCount = Number(record.reviewCount || 0) + 1;
    return { records: Object.assign({}, records || {}, (function () { var patch = {}; patch[id] = record; return patch; })()), record: record, result: result };
  }

  function markReviewed(records, id, status, now) {
    var old = records && records[id];
    if (!old) return records || {};
    var timestamp = now || new Date().toISOString(), record = makeRecord(old, old, timestamp);
    record.lastReviewedAt = timestamp;
    record.reviewCount = Number(record.reviewCount || 0) + 1;
    if (status) record.status = status;
    return Object.assign({}, records, (function () { var patch = {}; patch[id] = record; return patch; })());
  }

  function reviewPriority(record, now) {
    if (!record || record.status === 'mastered') return 0;
    if (record.status === 'difficult' && !record.reviewCount) return 1;
    if (record.dictation && Number(record.dictation.attempts || 0) > 0 && (!record.dictation.completed || Number(record.dictation.lastScore) < 80)) return 2;
    var reviewed = Date.parse(record.lastReviewedAt || record.firstMarkedAt || 0);
    if (!reviewed) return record.status === 'difficult' ? 3 : 0;
    var interval = DUE_INTERVALS_DAYS[Math.min(Math.max(Number(record.reviewCount || 1) - 1, 0), DUE_INTERVALS_DAYS.length - 1)] * 86400000;
    return Date.parse(now || new Date().toISOString()) - reviewed >= interval ? 3 : 0;
  }

  function getReviewQueue(records, now) {
    return Object.keys(records || {}).map(function (id) {
      var record = records[id], priority = reviewPriority(record, now);
      return priority ? { record: record, priority: priority } : null;
    }).filter(Boolean).sort(function (left, right) {
      return left.priority - right.priority || String(left.record.lastReviewedAt || left.record.firstMarkedAt).localeCompare(String(right.record.lastReviewedAt || right.record.firstMarkedAt));
    });
  }

  function read(storage) {
    try { return JSON.parse((storage || localStorage).getItem(STORAGE_KEY) || '{}') || {}; }
    catch (error) { return {}; }
  }
  function write(records, storage) {
    try { (storage || localStorage).setItem(STORAGE_KEY, JSON.stringify(records || {})); }
    catch (error) {}
    return records || {};
  }

  return { STORAGE_KEY: STORAGE_KEY, DUE_INTERVALS_DAYS: DUE_INTERVALS_DAYS, normalizeText: normalizeText, makeSegmentId: makeSegmentId, makeRecord: makeRecord, compareDictation: compareDictation, markDifficult: markDifficult, recordDictation: recordDictation, markReviewed: markReviewed, reviewPriority: reviewPriority, getReviewQueue: getReviewQueue, read: read, write: write };
});
