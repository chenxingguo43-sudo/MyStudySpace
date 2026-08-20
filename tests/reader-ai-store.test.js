'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { createLearningStore } = require('../server/learning-store');
const { createReaderAiStore, redact } = require('../server/reader-ai-store');

function setup() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'white-night-reader-ai-'));
  const databasePath = path.join(directory, 'white-night-learning.sqlite3');
  const learningStore = createLearningStore({ databasePath });
  const store = createReaderAiStore({ databasePath: learningStore.databasePath });
  const state = {
    databasePath, learningStore, store,
    close() {
      this.store.close();
      this.learningStore.close();
      fs.rmSync(directory, { recursive: true, force: true });
    }
  };
  return state;
}

function request(overrides = {}) {
  return {
    clientRequestId: 'reader-ai:fixed-request-001',
    requestType: 'grammar',
    deliveryMode: 'direct',
    templateVersion: 'reader-ai-v1',
    source: { kind: 'reader-question', id: 'MOCK-Q1' },
    lexemeKey: '',
    input: { question: 'Я интересуюсь ...', apiKey: 'must-not-be-stored' },
    ...overrides
  };
}

test('AI store uses the same SQLite path and redacts sensitive input', () => {
  const state = setup();
  try {
    assert.equal(state.store.databasePath, state.learningStore.databasePath);
    const started = state.store.beginRequest(request());
    assert.equal(started.interaction.status, 'pending');
    assert.equal(started.interaction.input.apiKey, '[redacted]');
    const completed = state.store.complete(started.interaction.interactionId, { answerReason: '模拟回答' }, 'mock-model', { inputTokens: 100, outputTokens: 50, totalTokens: 150 });
    assert.equal(completed.status, 'completed');
    assert.equal(completed.model, 'mock-model');
    assert.deepEqual(completed.answer, { answerReason: '模拟回答' });
    assert.deepEqual(completed.usage, { inputTokens: 100, cachedInputTokens: 0, outputTokens: 50, reasoningTokens: 0, totalTokens: 150, estimatedCost: null });
  } finally { state.close(); }
});

test('completed duplicate is reused while failed request can retry with an incremented attempt', () => {
  const state = setup();
  try {
    const first = state.store.beginRequest(request());
    state.store.fail(first.interaction.interactionId, 'failed', 'network_error', '模拟断网');
    const retry = state.store.beginRequest(request());
    assert.equal(retry.duplicate, false);
    assert.equal(retry.interaction.status, 'pending');
    assert.equal(retry.interaction.attemptCount, 2);
    state.store.complete(retry.interaction.interactionId, { answerReason: '恢复后成功' }, 'mock-model');
    const duplicate = state.store.beginRequest(request());
    assert.equal(duplicate.duplicate, true);
    assert.equal(duplicate.interaction.attemptCount, 2);
  } finally { state.close(); }
});

test('prompt copy, feedback, and completed answer survive database reopen', () => {
  const state = setup();
  let interactionId;
  try {
    const copied = state.store.beginRequest(request({ clientRequestId: 'reader-ai:fixed-copy-001', deliveryMode: 'prompt_copy' }));
    interactionId = copied.interaction.interactionId;
    state.store.complete(interactionId, null, '');
    state.store.feedback(interactionId, 'helpful');
    state.store.close();
    state.store = createReaderAiStore({ databasePath: state.databasePath });
    const restored = state.store.get(interactionId);
    assert.equal(restored.deliveryMode, 'prompt_copy');
    assert.equal(restored.answer, null);
    assert.equal(restored.model, '');
    assert.equal(restored.feedback, 'helpful');
  } finally { state.close(); }
});

test('redaction removes secrets from nested input and authorization text', () => {
  const value = redact({ nested: { token: 'secret-token' }, header: 'Bearer abcdefghijklmnop', prompt: 'safe text' });
  assert.equal(value.nested.token, '[redacted]');
  assert.equal(value.header, 'Bearer [redacted]');
  assert.equal(value.prompt, 'safe text');
});

test('migrates an existing AI table to reading requests without losing old rows', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'white-night-reader-ai-migration-'));
  const databasePath = path.join(directory, 'white-night-learning.sqlite3');
  const database = new DatabaseSync(databasePath);
  database.exec(`
    CREATE TABLE learning_events (event_json TEXT NOT NULL, lexeme_key TEXT, occurred_at TEXT);
    CREATE TABLE reader_ai_interactions (
      interaction_id TEXT PRIMARY KEY, client_request_id TEXT NOT NULL UNIQUE,
      request_type TEXT NOT NULL CHECK (request_type IN ('grammar', 'dictionary')),
      delivery_mode TEXT NOT NULL DEFAULT 'direct', status TEXT NOT NULL,
      redacted_input_json TEXT NOT NULL, response_json TEXT, model TEXT NOT NULL DEFAULT '',
      template_version TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
      source_kind TEXT NOT NULL DEFAULT '', source_id TEXT NOT NULL DEFAULT '', lexeme_key TEXT NOT NULL DEFAULT '',
      error_code TEXT NOT NULL DEFAULT '', error_message TEXT NOT NULL DEFAULT '', feedback TEXT NOT NULL DEFAULT '',
      feedback_at TEXT, usage_json TEXT, attempt_count INTEGER NOT NULL DEFAULT 1
    );
    INSERT INTO reader_ai_interactions (interaction_id, client_request_id, request_type, status, redacted_input_json, template_version, created_at, updated_at)
      VALUES ('legacy-1', 'reader-ai:legacy-1', 'grammar', 'completed', '{}', 'reader-ai-v1', '2026-08-17', '2026-08-17');
  `);
  database.close();
  const store = createReaderAiStore({ databasePath });
  try {
    assert.equal(store.get('legacy-1').clientRequestId, 'reader-ai:legacy-1');
    const started = store.beginRequest({
      clientRequestId: 'reader-ai:reading-migration-1', requestType: 'reading', templateVersion: 'reader-ai-reading-v2',
      source: { kind: 'reader-reading-question', id: 'RS-Q1' }, input: { evidence: { anchorQuoteRu: 'mock' } }
    });
    assert.equal(started.interaction.requestType, 'reading');
  } finally {
    store.close();
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
