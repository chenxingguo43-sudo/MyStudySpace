'use strict';

const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');

const STORE_SCHEMA_VERSION = 2;
const ALLOWED_STATUSES = new Set(['pending', 'completed', 'failed', 'cancelled']);

function iso(now) {
  const value = typeof now === 'function' ? now() : new Date();
  return (value instanceof Date ? value : new Date(value)).toISOString();
}

function redact(value, depth = 0) {
  if (depth > 8) return '[truncated]';
  if (value == null || typeof value === 'boolean' || typeof value === 'number') return value;
  if (typeof value === 'string') {
    return value
      .replace(/(bearer\s+)[a-z0-9._~+/=-]+/ig, '$1[redacted]')
      .replace(/\b(sk-[a-z0-9_-]{8,})\b/ig, '[redacted]')
      .slice(0, 12000);
  }
  if (Array.isArray(value)) return value.slice(0, 100).map(item => redact(item, depth + 1));
  if (typeof value === 'object') {
    const result = {};
    Object.entries(value).slice(0, 100).forEach(([key, item]) => {
      if (/api.?key|authorization|password|secret|token/i.test(key)) result[key] = '[redacted]';
      else result[key] = redact(item, depth + 1);
    });
    return result;
  }
  return String(value).slice(0, 12000);
}

function parseJson(value, fallback = null) {
  try { return value ? JSON.parse(value) : fallback; } catch (_error) { return fallback; }
}

function safeUsage(value) {
  if (!value || typeof value !== 'object') return null;
  const result = {
    inputTokens: Math.max(0, Number(value.inputTokens) || 0),
    cachedInputTokens: Math.max(0, Number(value.cachedInputTokens) || 0),
    outputTokens: Math.max(0, Number(value.outputTokens) || 0),
    reasoningTokens: Math.max(0, Number(value.reasoningTokens) || 0),
    totalTokens: Math.max(0, Number(value.totalTokens) || 0),
    estimatedCost: value.estimatedCost && Number(value.estimatedCost.amount) > 0 ? {
      amount: Number(value.estimatedCost.amount),
      currency: String(value.estimatedCost.currency || 'CNY').slice(0, 12),
      multiplier: Math.max(0, Number(value.estimatedCost.multiplier) || 1)
    } : null
  };
  return result.totalTokens || result.inputTokens || result.outputTokens ? result : null;
}

function rowValue(row) {
  if (!row) return null;
  return {
    interactionId: row.interaction_id,
    clientRequestId: row.client_request_id,
    requestType: row.request_type,
    deliveryMode: row.delivery_mode || 'direct',
    status: row.status,
    input: parseJson(row.redacted_input_json, {}),
    answer: parseJson(row.response_json, null),
    model: row.model || '',
    templateVersion: row.template_version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    sourceKind: row.source_kind || '',
    sourceId: row.source_id || '',
    lexemeKey: row.lexeme_key || '',
    errorCode: row.error_code || '',
    errorMessage: row.error_message || '',
    feedback: row.feedback || '',
    feedbackAt: row.feedback_at || '',
    usage: parseJson(row.usage_json, null),
    attemptCount: Number(row.attempt_count || 1)
  };
}

function createReaderAiStore(options = {}) {
  if (!options.databasePath) throw new TypeError('databasePath is required');
  const now = options.now || (() => new Date());
  const database = new DatabaseSync(options.databasePath);
  database.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = FULL;
    PRAGMA foreign_keys = ON;
    PRAGMA busy_timeout = 5000;

    CREATE TABLE IF NOT EXISTS reader_ai_interactions (
      interaction_id TEXT PRIMARY KEY,
      client_request_id TEXT NOT NULL UNIQUE,
      request_type TEXT NOT NULL CHECK (request_type IN ('grammar', 'reading', 'dictionary')),
      delivery_mode TEXT NOT NULL DEFAULT 'direct' CHECK (delivery_mode IN ('direct', 'prompt_copy')),
      status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
      redacted_input_json TEXT NOT NULL CHECK (json_valid(redacted_input_json)),
      response_json TEXT CHECK (response_json IS NULL OR json_valid(response_json)),
      model TEXT NOT NULL DEFAULT '',
      template_version TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      source_kind TEXT NOT NULL DEFAULT '',
      source_id TEXT NOT NULL DEFAULT '',
      lexeme_key TEXT NOT NULL DEFAULT '',
      error_code TEXT NOT NULL DEFAULT '',
      error_message TEXT NOT NULL DEFAULT '',
      feedback TEXT NOT NULL DEFAULT '' CHECK (feedback IN ('', 'helpful', 'incorrect')),
      feedback_at TEXT,
      usage_json TEXT CHECK (usage_json IS NULL OR json_valid(usage_json)),
      attempt_count INTEGER NOT NULL DEFAULT 1 CHECK (attempt_count > 0)
    );

    CREATE INDEX IF NOT EXISTS reader_ai_source_idx ON reader_ai_interactions(source_kind, source_id);
    CREATE INDEX IF NOT EXISTS reader_ai_lexeme_idx ON reader_ai_interactions(lexeme_key);
    CREATE INDEX IF NOT EXISTS reader_ai_created_idx ON reader_ai_interactions(created_at);

    CREATE TABLE IF NOT EXISTS reader_ai_schema (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `);
  const interactionColumns = database.prepare('PRAGMA table_info(reader_ai_interactions)').all();
  const interactionSqlRow = database.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'reader_ai_interactions'").get();
  if (interactionSqlRow && interactionSqlRow.sql && !/request_type[\s\S]*reading/i.test(interactionSqlRow.sql)) {
    database.exec(`
      DROP INDEX IF EXISTS reader_ai_source_idx;
      DROP INDEX IF EXISTS reader_ai_lexeme_idx;
      DROP INDEX IF EXISTS reader_ai_created_idx;
      ALTER TABLE reader_ai_interactions RENAME TO reader_ai_interactions_legacy;
      CREATE TABLE reader_ai_interactions (
        interaction_id TEXT PRIMARY KEY,
        client_request_id TEXT NOT NULL UNIQUE,
        request_type TEXT NOT NULL CHECK (request_type IN ('grammar', 'reading', 'dictionary')),
        delivery_mode TEXT NOT NULL DEFAULT 'direct' CHECK (delivery_mode IN ('direct', 'prompt_copy')),
        status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
        redacted_input_json TEXT NOT NULL CHECK (json_valid(redacted_input_json)),
        response_json TEXT CHECK (response_json IS NULL OR json_valid(response_json)),
        model TEXT NOT NULL DEFAULT '',
        template_version TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        source_kind TEXT NOT NULL DEFAULT '',
        source_id TEXT NOT NULL DEFAULT '',
        lexeme_key TEXT NOT NULL DEFAULT '',
        error_code TEXT NOT NULL DEFAULT '',
        error_message TEXT NOT NULL DEFAULT '',
        feedback TEXT NOT NULL DEFAULT '' CHECK (feedback IN ('', 'helpful', 'incorrect')),
        feedback_at TEXT,
        usage_json TEXT CHECK (usage_json IS NULL OR json_valid(usage_json)),
        attempt_count INTEGER NOT NULL DEFAULT 1 CHECK (attempt_count > 0)
      );
      INSERT INTO reader_ai_interactions (
        interaction_id, client_request_id, request_type, delivery_mode, status, redacted_input_json,
        response_json, model, template_version, created_at, updated_at, source_kind, source_id,
        lexeme_key, error_code, error_message, feedback, feedback_at, usage_json, attempt_count
      ) SELECT interaction_id, client_request_id, request_type, delivery_mode, status, redacted_input_json,
        response_json, model, template_version, created_at, updated_at, source_kind, source_id,
        lexeme_key, error_code, error_message, feedback, feedback_at, usage_json, attempt_count
        FROM reader_ai_interactions_legacy;
      DROP TABLE reader_ai_interactions_legacy;
    `);
  }
  if (!interactionColumns.some(column => column.name === 'delivery_mode')) {
    database.exec("ALTER TABLE reader_ai_interactions ADD COLUMN delivery_mode TEXT NOT NULL DEFAULT 'direct'");
  }
  if (!interactionColumns.some(column => column.name === 'usage_json')) {
    database.exec('ALTER TABLE reader_ai_interactions ADD COLUMN usage_json TEXT');
  }
  database.prepare('INSERT OR IGNORE INTO reader_ai_schema(version, applied_at) VALUES (?, ?)').run(STORE_SCHEMA_VERSION, iso(now));

  const findByClient = database.prepare('SELECT * FROM reader_ai_interactions WHERE client_request_id = ?');
  const findById = database.prepare('SELECT * FROM reader_ai_interactions WHERE interaction_id = ?');
  const insert = database.prepare(`
    INSERT INTO reader_ai_interactions (
      interaction_id, client_request_id, request_type, status, redacted_input_json,
      template_version, created_at, updated_at, source_kind, source_id, lexeme_key, delivery_mode
    ) VALUES (?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const retry = database.prepare(`
    UPDATE reader_ai_interactions
    SET status = 'pending', response_json = NULL, model = '', usage_json = NULL, updated_at = ?, delivery_mode = ?,
        error_code = '', error_message = '', attempt_count = attempt_count + 1,
        redacted_input_json = ?, template_version = ?, source_kind = ?, source_id = ?, lexeme_key = ?
    WHERE client_request_id = ? AND status IN ('failed', 'cancelled')
  `);
  const finish = database.prepare(`
    UPDATE reader_ai_interactions
    SET status = ?, response_json = ?, model = ?, usage_json = ?, updated_at = ?, error_code = ?, error_message = ?
    WHERE interaction_id = ?
  `);
  const setFeedback = database.prepare(`
    UPDATE reader_ai_interactions SET feedback = ?, feedback_at = ?, updated_at = ? WHERE interaction_id = ?
  `);
  const findContextByLexeme = database.prepare(`
    SELECT event_json FROM learning_events WHERE lexeme_key = ? ORDER BY occurred_at DESC LIMIT ?
  `);
  const findContextBySource = database.prepare(`
    SELECT event_json FROM learning_events WHERE instr(event_json, ?) > 0 ORDER BY occurred_at DESC LIMIT ?
  `);

  function beginRequest(request) {
    const existing = rowValue(findByClient.get(request.clientRequestId));
    if (existing && existing.status === 'completed') return { interaction: existing, duplicate: true };
    const timestamp = iso(now);
    const inputJson = JSON.stringify(redact(request.input || {}));
    const source = request.source || {};
    if (existing) {
      if (existing.status === 'pending') return { interaction: existing, duplicate: true };
      retry.run(timestamp, request.deliveryMode || 'direct', inputJson, request.templateVersion, source.kind || '', source.id || '', request.lexemeKey || '', request.clientRequestId);
      return { interaction: rowValue(findByClient.get(request.clientRequestId)), duplicate: false };
    }
    const interactionId = crypto.randomUUID();
    insert.run(interactionId, request.clientRequestId, request.requestType, inputJson, request.templateVersion,
      timestamp, timestamp, source.kind || '', source.id || '', request.lexemeKey || '', request.deliveryMode || 'direct');
    return { interaction: rowValue(findById.get(interactionId)), duplicate: false };
  }

  function complete(interactionId, answer, model, usage) {
    const normalizedUsage = safeUsage(usage);
    finish.run('completed', JSON.stringify(redact(answer)), String(model || ''), normalizedUsage ? JSON.stringify(normalizedUsage) : null, iso(now), '', '', interactionId);
    return rowValue(findById.get(interactionId));
  }

  function fail(interactionId, status, code, message) {
    if (!ALLOWED_STATUSES.has(status) || status === 'completed') throw new TypeError('invalid failure status');
    finish.run(status, null, '', null, iso(now), String(code || 'ai_error'), String(message || '').slice(0, 500), interactionId);
    return rowValue(findById.get(interactionId));
  }

  function feedback(interactionId, value) {
    if (!['helpful', 'incorrect'].includes(value)) throw new TypeError('invalid feedback');
    const timestamp = iso(now);
    setFeedback.run(value, timestamp, timestamp, interactionId);
    return rowValue(findById.get(interactionId));
  }

  function learningContext(query = {}, limit = 5) {
    const count = Math.max(1, Math.min(10, Number(limit) || 5));
    let rows = [];
    if (query.lexemeKey) rows = findContextByLexeme.all(query.lexemeKey, count);
    else if (query.sourceId) rows = findContextBySource.all(String(query.sourceId).slice(0, 200), count);
    return rows.map(row => redact(parseJson(row.event_json, {}))).map(event => ({
      eventType: event.eventType || '',
      occurredAt: event.occurredAt || '',
      sourceModule: event.sourceModule || '',
      subject: event.subject || {},
      context: event.context || {},
      evidence: event.evidence || {},
      payload: event.payload || {}
    }));
  }

  return {
    databasePath: options.databasePath,
    beginRequest,
    complete,
    fail,
    feedback,
    learningContext,
    getByClientRequestId(clientRequestId) { return rowValue(findByClient.get(clientRequestId)); },
    get(interactionId) { return rowValue(findById.get(interactionId)); },
    close() { database.close(); }
  };
}

module.exports = { STORE_SCHEMA_VERSION, createReaderAiStore, redact, safeUsage };
