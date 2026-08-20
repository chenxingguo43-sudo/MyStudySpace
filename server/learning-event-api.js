'use strict';

const EventSchema = require('../js/learning-event-schema');
const { LearningStoreError } = require('./learning-store');

const MAX_BODY_BYTES = 1024 * 1024;
const MAX_ARCHIVE_BODY_BYTES = 32 * 1024 * 1024;
const BATCH_PATH = '/api/learning-events/batch';
const HEALTH_PATH = '/api/learning-store/health';
const FSRS_PROJECTION_PATH = '/api/learning-projections/fsrs';
const FSRS_COMPARISON_PATH = '/api/learning-projections/fsrs/comparison';
const LEGACY_SNAPSHOT_PATH = '/api/learning-migrations/vocabulary-legacy-snapshot';
const ARCHIVE_EXPORT_PATH = '/api/learning-archive/v2/export';
const ARCHIVE_IMPORT_PATH = '/api/learning-archive/v2/import';
const SWITCH_READINESS_PATH = '/api/learning-switch/readiness';
const BACKUPS_PATH = '/api/learning-backups';
const BACKUP_CREATE_PATH = '/api/learning-backups/create';
const BACKUP_VERIFY_RESTORE_PATH = '/api/learning-backups/verify-restore';

function sendJson(response, statusCode, value, extraHeaders) {
  if (response.writableEnded) return;
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...extraHeaders
  });
  response.end(JSON.stringify(value));
}

function isLoopbackAddress(value) {
  const address = String(value || '').toLowerCase();
  if (address === '::1') return true;
  const ipv4 = address.startsWith('::ffff:') ? address.slice(7) : address;
  return /^127(?:\.\d{1,3}){3}$/.test(ipv4);
}

function isSameOrigin(request) {
  const origin = request.headers.origin;
  const host = request.headers.host;
  if (!origin || !host) return false;
  try {
    const expectedUrl = new URL(`http://${host}`);
    const hostname = expectedUrl.hostname.toLowerCase();
    const localHostname = hostname === 'localhost'
      || hostname === '[::1]'
      || /^127(?:\.\d{1,3}){3}$/.test(hostname);
    return localHostname && new URL(origin).origin === expectedUrl.origin;
  } catch (_error) {
    return false;
  }
}

function errorBody(code, message, details) {
  return { ok: false, error: { code, message, ...(details ? { details } : {}) } };
}

function createLearningEventApi(options) {
  const settings = options || {};
  const store = settings.store;
  if (!store || typeof store.ingestBatch !== 'function' || typeof store.health !== 'function'
      || typeof store.fsrsProjection !== 'function' || typeof store.recordProjectionComparison !== 'function'
      || typeof store.saveLegacyVocabularySnapshot !== 'function'
      || typeof store.exportArchiveV2 !== 'function' || typeof store.importArchiveV2 !== 'function'
      || typeof store.createBackup !== 'function' || typeof store.listBackups !== 'function'
      || typeof store.verifyRestore !== 'function' || typeof store.switchReadiness !== 'function') {
    throw new TypeError('learning store is required');
  }
  const bodyLimit = Number(settings.maxBodyBytes || MAX_BODY_BYTES);

  return function handleLearningEventApi(request, response, pathname) {
    if (pathname !== BATCH_PATH && pathname !== HEALTH_PATH
        && pathname !== FSRS_PROJECTION_PATH && pathname !== FSRS_COMPARISON_PATH
        && pathname !== LEGACY_SNAPSHOT_PATH && pathname !== ARCHIVE_EXPORT_PATH
        && pathname !== ARCHIVE_IMPORT_PATH && pathname !== SWITCH_READINESS_PATH
        && pathname !== BACKUPS_PATH && pathname !== BACKUP_CREATE_PATH
        && pathname !== BACKUP_VERIFY_RESTORE_PATH) return false;

    if (!isLoopbackAddress(request.socket && request.socket.remoteAddress)) {
      sendJson(response, 403, errorBody('LOOPBACK_ONLY', 'learning store is only available from this computer'));
      return true;
    }

    if (pathname === HEALTH_PATH || pathname === FSRS_PROJECTION_PATH || pathname === ARCHIVE_EXPORT_PATH
        || pathname === SWITCH_READINESS_PATH || pathname === BACKUPS_PATH) {
      if (request.method !== 'GET') {
        sendJson(response, 405, errorBody('METHOD_NOT_ALLOWED', 'method not allowed'), { Allow: 'GET' });
        return true;
      }
      try {
        const result = pathname === HEALTH_PATH ? store.health()
          : pathname === FSRS_PROJECTION_PATH ? { ok: true, ...store.fsrsProjection() }
            : pathname === ARCHIVE_EXPORT_PATH ? { ok: true, archive: store.exportArchiveV2() }
              : pathname === SWITCH_READINESS_PATH ? store.switchReadiness()
                : { ok: true, backups: store.listBackups() };
        sendJson(response, result.ok ? 200 : 503, result);
      } catch (_error) {
        sendJson(response, 503, errorBody('LEARNING_STORE_UNAVAILABLE', 'learning store is unavailable'));
      }
      return true;
    }

    if (request.method !== 'POST') {
      sendJson(response, 405, errorBody('METHOD_NOT_ALLOWED', 'method not allowed'), { Allow: 'POST' });
      return true;
    }
    if (!isSameOrigin(request)) {
      sendJson(response, 403, errorBody('SAME_ORIGIN_REQUIRED', 'request must come from this local web app'));
      return true;
    }
    const contentType = String(request.headers['content-type'] || '').split(';', 1)[0].trim().toLowerCase();
    if (contentType !== 'application/json') {
      sendJson(response, 415, errorBody('JSON_REQUIRED', 'Content-Type must be application/json'));
      return true;
    }

    const requestBodyLimit = pathname === ARCHIVE_IMPORT_PATH || pathname === LEGACY_SNAPSHOT_PATH
      ? Number(settings.maxArchiveBodyBytes || MAX_ARCHIVE_BODY_BYTES)
      : bodyLimit;
    let size = 0;
    let tooLarge = false;
    const chunks = [];
    request.on('data', function (chunk) {
      if (tooLarge) return;
      size += chunk.length;
      if (size > requestBodyLimit) {
        tooLarge = true;
        sendJson(response, 413, errorBody('REQUEST_TOO_LARGE', `request body exceeds ${requestBodyLimit} bytes`));
        return;
      }
      chunks.push(chunk);
    });
    request.on('end', async function () {
      if (tooLarge || response.writableEnded) return;
      let input;
      try {
        input = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      } catch (_error) {
        sendJson(response, 400, errorBody('INVALID_JSON', 'request body is not valid JSON'));
        return;
      }
      try {
        let result = pathname === FSRS_COMPARISON_PATH
          ? { ok: true, ...store.recordProjectionComparison(input) }
          : pathname === LEGACY_SNAPSHOT_PATH
            ? store.saveLegacyVocabularySnapshot(input)
            : pathname === ARCHIVE_IMPORT_PATH
              ? store.importArchiveV2(input)
              : pathname === BACKUP_CREATE_PATH
                ? { ok: true, backup: await store.createBackup({ kind: input && input.kind, reason: 'manual' }) }
                : pathname === BACKUP_VERIFY_RESTORE_PATH
                  ? await store.verifyRestore(input && input.backupId)
                  : store.ingestBatch(input);
        if (pathname === BATCH_PATH && typeof store.maybeCreateAutomaticBackups === 'function') {
          try {
            result = { ...result, backup: await store.maybeCreateAutomaticBackups() };
          } catch (backupError) {
            result = { ...result, backup: { ok: false, code: backupError.code || 'BACKUP_FAILED' } };
          }
        }
        sendJson(response, 200, result);
      } catch (error) {
        if (error instanceof LearningStoreError && error.code === 'BACKUP_NOT_FOUND') {
          sendJson(response, 404, errorBody(error.code, error.message));
          return;
        }
        if (error instanceof LearningStoreError && /^BACKUP_/.test(error.code || '')) {
          sendJson(response, 422, errorBody(error.code, error.message));
          return;
        }
        if (error instanceof LearningStoreError && /_ID_CONFLICT$/.test(error.code || '')) {
          sendJson(response, 409, errorBody(error.code, error.message));
          return;
        }
        if (error instanceof TypeError && error.code) {
          sendJson(response, 422, errorBody('BATCH_VALIDATION_FAILED', error.message, {
            validationCode: error.code,
            field: error.field || ''
          }));
          return;
        }
        if (error instanceof TypeError && pathname !== BATCH_PATH) {
          const code = pathname === FSRS_COMPARISON_PATH ? 'INVALID_PROJECTION_COMPARISON'
            : pathname === LEGACY_SNAPSHOT_PATH ? 'INVALID_LEGACY_SNAPSHOT'
              : 'INVALID_LEARNING_ARCHIVE';
          sendJson(response, 422, errorBody(code, error.message));
          return;
        }
        sendJson(response, 500, errorBody('LEARNING_STORE_FAILED', 'learning event batch could not be stored'));
      }
    });
    request.on('error', function () {
      sendJson(response, 400, errorBody('REQUEST_READ_FAILED', 'request body could not be read'));
    });
    return true;
  };
}

module.exports = {
  ARCHIVE_EXPORT_PATH,
  ARCHIVE_IMPORT_PATH,
  BACKUPS_PATH,
  BACKUP_CREATE_PATH,
  BACKUP_VERIFY_RESTORE_PATH,
  BATCH_PATH,
  FSRS_PROJECTION_PATH,
  FSRS_COMPARISON_PATH,
  HEALTH_PATH,
  LEGACY_SNAPSHOT_PATH,
  MAX_ARCHIVE_BODY_BYTES,
  MAX_BODY_BYTES,
  SWITCH_READINESS_PATH,
  createLearningEventApi,
  isLoopbackAddress,
  isSameOrigin
};
