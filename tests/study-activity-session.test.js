'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const Session = require('../js/study-activity-session');

test('activity timing counts only visible non-idle intervals', () => {
  assert.equal(Session.shouldCount({ visible: true, now: 1000, lastInteractionAt: 0, idleMs: 1200 }), true);
  assert.equal(Session.shouldCount({ visible: false, now: 1000, lastInteractionAt: 0, idleMs: 1200 }), false);
  assert.equal(Session.shouldCount({ visible: true, now: 1300, lastInteractionAt: 0, idleMs: 1200 }), false);
});

test('activity context identity separates reader, B2, and chapters', () => {
  assert.notEqual(Session.contextKey({ module: 'reader', bookId: 'book', chapterId: '1' }), Session.contextKey({ module: 'b2', bookId: 'book', chapterId: '1' }));
  assert.notEqual(Session.contextKey({ module: 'reader', bookId: 'book', chapterId: '1' }), Session.contextKey({ module: 'reader', bookId: 'book', chapterId: '2' }));
});

test('context switches finish the old module without attributing its time to the new one', async () => {
  const originalNow = Date.now;
  let now = 1000;
  Date.now = () => now;
  const records = new Map();
  let nextId = 1;
  const store = {
    async startSession(input) { const record = { ...input, id: 's' + nextId++, durationSec: 0 }; records.set(record.id, record); return record; },
    async checkpoint(id, patch) { const record = { ...records.get(id), ...patch }; records.set(id, record); return record; },
    async finishSession(id, patch) { const record = { ...records.get(id), ...patch, ended: true }; records.set(id, record); return record; }
  };
  const documentRef = { visibilityState: 'visible', addEventListener() {}, removeEventListener() {} };
  const windowRef = { addEventListener() {}, removeEventListener() {} };
  const tracker = Session.mount({ store, document: documentRef, window: windowRef, context: { module: 'reader', bookId: 'book', chapterId: '1' } });
  try {
    for (let index = 0; index < 3; index += 1) { now += 5000; tracker.tick(); }
    tracker.setContext({ module: 'b2', bookId: 'russian_b2', chapterId: '2' });
    for (let index = 0; index < 3; index += 1) { now += 5000; tracker.tick(); }
    await tracker.destroy();
  } finally {
    Date.now = originalNow;
  }
  const values = [...records.values()];
  assert.equal(values.length, 2);
  assert.equal(values.find(record => record.module === 'reader').durationSec, 15);
  assert.equal(values.find(record => record.module === 'b2').durationSec, 15);
  assert.equal(values.every(record => record.ended), true);
});
