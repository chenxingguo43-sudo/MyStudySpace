'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { DatabaseSync, backup: backupDatabase } = require('node:sqlite');
const EventSchema = require('../js/learning-event-schema');
const FsrsProjection = require('../js/vocabulary-fsrs-projection');
const VocabularyFsrsTransition = require('../js/vocabulary-fsrs-transition');

const DATABASE_FILE_NAME = 'white-night-learning.sqlite3';
const DATABASE_SCHEMA_VERSION = 2;
const ARCHIVE_SCHEMA = 'belye-nochi-learning-archive';
const ARCHIVE_VERSION = 2;
const VERIFIED_BACKUP_MANIFEST_SCHEMA = 'belye-nochi-verified-learning-backup';
const VERIFIED_BACKUP_MANIFEST_VERSION = 1;

class LearningStoreError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'LearningStoreError';
    this.code = code;
  }
}

function defaultDataDirectory(environment = process.env) {
  if (environment.BELYE_NOCHI_DATA_DIR) return path.resolve(environment.BELYE_NOCHI_DATA_DIR);
  if (environment.LOCALAPPDATA) return path.join(environment.LOCALAPPDATA, 'BelyeNochi', 'learning');
  return path.join(os.homedir(), '.belye-nochi', 'learning');
}

function defaultDatabasePath(environment = process.env) {
  return path.join(defaultDataDirectory(environment), DATABASE_FILE_NAME);
}

function defaultSecondaryBackupDirectory(environment = process.env) {
  if (environment.BELYE_NOCHI_SECONDARY_BACKUP_DIR) {
    return path.resolve(environment.BELYE_NOCHI_SECONDARY_BACKUP_DIR);
  }
  const desktopOnE = path.win32.resolve('E:\\Desktop');
  if (process.platform === 'win32' && fs.existsSync(desktopOnE)) {
    return path.join(desktopOnE, 'BelyeNochi-Backups');
  }
  const home = environment.USERPROFILE || os.homedir();
  return path.join(home, 'BelyeNochi-Backups');
}

function sha256(value) {
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex');
}

function fileSha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function atomicWriteJson(filePath, value) {
  const temporaryPath = `${filePath}.${crypto.randomUUID()}.tmp`;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  try {
    fs.writeFileSync(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
    fs.renameSync(temporaryPath, filePath);
  } finally {
    try { if (fs.existsSync(temporaryPath)) fs.unlinkSync(temporaryPath); } catch (_cleanupError) {}
  }
}

function sqliteIntegrity(filePath) {
  let candidate;
  try {
    candidate = new DatabaseSync(filePath, { readOnly: true });
    const rows = candidate.prepare('PRAGMA integrity_check').all();
    return rows.length > 0 && rows.every(row => row.integrity_check === 'ok');
  } finally {
    if (candidate) candidate.close();
  }
}

function inspectLearningDatabaseFile(filePath) {
  let candidate;
  try {
    candidate = new DatabaseSync(filePath, { readOnly: true });
    const integrity = candidate.prepare('PRAGMA integrity_check').all();
    if (integrity.length === 0 || integrity.some(row => row.integrity_check !== 'ok')) {
      throw new LearningStoreError('BACKUP_INTEGRITY_FAILED', 'backup SQLite integrity check failed');
    }
    const eventCount = Number(candidate.prepare('SELECT COUNT(*) AS count FROM learning_events').get().count);
    const checkpoint = candidate.prepare('SELECT * FROM projection_checkpoints WHERE projection_name = ?')
      .get(FsrsProjection.PROJECTION_NAME);
    if (!checkpoint) throw new LearningStoreError('BACKUP_CHECKPOINT_MISSING', 'backup FSRS checkpoint is missing');
    return {
      eventCount,
      sourceEventCount: Number(checkpoint.source_event_count),
      sourceHash: checkpoint.source_hash,
      stateHash: checkpoint.state_hash
    };
  } finally {
    if (candidate) candidate.close();
  }
}

function verifiedManifestPath(directory, fileName) {
  return path.resolve(directory, `${fileName}.verified.json`);
}

function verifiedBackupCandidate(directory, manifestFile) {
  const manifestPath = path.resolve(directory, manifestFile);
  if (path.dirname(manifestPath) !== directory || !manifestFile.endsWith('.sqlite3.verified.json')) return null;
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  if (manifest.schema !== VERIFIED_BACKUP_MANIFEST_SCHEMA
      || manifest.schemaVersion !== VERIFIED_BACKUP_MANIFEST_VERSION
      || path.basename(String(manifest.fileName || '')) !== manifest.fileName
      || !/^[0-9a-f]{64}$/.test(String(manifest.contentHash || ''))
      || !manifest.verifiedAt) return null;
  const backupPath = path.resolve(directory, manifest.fileName);
  if (path.dirname(backupPath) !== directory || !fs.existsSync(backupPath)) return null;
  if (fs.statSync(backupPath).size !== Number(manifest.sizeBytes) || fileSha256(backupPath) !== manifest.contentHash) return null;
  const inspection = inspectLearningDatabaseFile(backupPath);
  if (inspection.eventCount !== Number(manifest.database && manifest.database.eventCount)
      || inspection.sourceHash !== manifest.database.sourceHash
      || inspection.stateHash !== manifest.database.stateHash) return null;
  return { directory, backupPath, manifest, inspection };
}

function listVerifiedBackupCandidates(directories) {
  const candidates = [];
  Array.from(new Set(directories.map(directory => path.resolve(directory)))).forEach(directory => {
    if (!fs.existsSync(directory)) return;
    fs.readdirSync(directory).filter(name => name.endsWith('.sqlite3.verified.json')).forEach(name => {
      try {
        const candidate = verifiedBackupCandidate(directory, name);
        if (candidate) candidates.push(candidate);
      } catch (_error) {}
    });
  });
  return candidates.sort((left, right) => {
    return Date.parse(right.manifest.verifiedAt) - Date.parse(left.manifest.verifiedAt)
      || Date.parse(right.manifest.createdAt) - Date.parse(left.manifest.createdAt);
  });
}

function recoverCorruptDatabase(options) {
  const databasePath = options.databasePath;
  if (!fs.existsSync(databasePath) || fs.statSync(databasePath).size === 0) {
    return { performed: false, reason: 'new-database' };
  }
  try {
    if (sqliteIntegrity(databasePath)) return { performed: false, reason: 'healthy' };
  } catch (_error) {}

  const candidates = listVerifiedBackupCandidates(options.backupDirectories);
  if (candidates.length === 0) {
    throw new LearningStoreError(
      'CORRUPT_DATABASE_NO_VERIFIED_BACKUP',
      'learning database is corrupt and no verified backup is available; the original file was left untouched'
    );
  }

  const selected = candidates[0];
  const at = options.now().toISOString();
  const stamp = at.replace(/[-:.TZ]/g, '').slice(0, 14);
  const quarantineDirectory = path.join(path.dirname(databasePath), 'quarantine', `${stamp}-${crypto.randomUUID()}`);
  const moved = [];
  const temporaryPath = `${databasePath}.recovering-${crypto.randomUUID()}.tmp`;
  fs.mkdirSync(quarantineDirectory, { recursive: true });
  try {
    options.failpoint('before_database_quarantine', { databasePath, quarantineDirectory });
    [databasePath, `${databasePath}-wal`, `${databasePath}-shm`].forEach(source => {
      if (!fs.existsSync(source)) return;
      const target = path.join(quarantineDirectory, path.basename(source));
      fs.renameSync(source, target);
      moved.push({ source, target });
    });
    options.failpoint('after_database_quarantine', { databasePath, quarantineDirectory });
    fs.copyFileSync(selected.backupPath, temporaryPath, fs.constants.COPYFILE_EXCL);
    if (fileSha256(temporaryPath) !== selected.manifest.contentHash) {
      throw new LearningStoreError('DATABASE_RECOVERY_HASH_MISMATCH', 'recovered database hash does not match the verified backup');
    }
    inspectLearningDatabaseFile(temporaryPath);
    options.failpoint('before_database_recovery_replace', { databasePath, temporaryPath });
    fs.renameSync(temporaryPath, databasePath);
    return {
      performed: true,
      recoveredAt: at,
      backupId: selected.manifest.backupId,
      backupCreatedAt: selected.manifest.createdAt,
      backupVerifiedAt: selected.manifest.verifiedAt,
      recoveredEventCount: selected.inspection.eventCount,
      quarantineDirectory
    };
  } catch (error) {
    try { if (fs.existsSync(temporaryPath)) fs.unlinkSync(temporaryPath); } catch (_cleanupError) {}
    if (!fs.existsSync(databasePath)) {
      moved.slice().reverse().forEach(item => {
        try { if (fs.existsSync(item.target)) fs.renameSync(item.target, item.source); } catch (_rollbackError) {}
      });
    }
    if (error instanceof LearningStoreError) throw error;
    throw new LearningStoreError('DATABASE_RECOVERY_FAILED', `database recovery failed: ${error.message}`);
  }
}

function sourceEventForHash(event) {
  const value = { ...event };
  delete value.receivedAt;
  return value;
}

function eventContentHash(event) {
  return sha256(EventSchema.canonicalStringify(sourceEventForHash(event)));
}

function batchContentHash(batch, hashes) {
  return sha256(EventSchema.canonicalStringify({
    deviceId: batch.deviceId,
    events: batch.events.map(event => ({ eventId: event.eventId, contentHash: hashes.get(event.eventId) }))
  }));
}

function initializeSchema(database) {
  database.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = FULL;
    PRAGMA foreign_keys = ON;
    PRAGMA busy_timeout = 5000;

    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS learning_events (
      event_id TEXT PRIMARY KEY,
      schema_name TEXT NOT NULL,
      schema_version INTEGER NOT NULL,
      learner_id TEXT NOT NULL,
      device_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      occurred_at TEXT NOT NULL,
      recorded_at TEXT NOT NULL,
      received_at TEXT NOT NULL,
      source_module TEXT NOT NULL,
      lexeme_key TEXT,
      unresolved_lexeme_id TEXT,
      sense_id TEXT,
      review_unit_id TEXT,
      content_hash TEXT NOT NULL,
      event_json TEXT NOT NULL CHECK (json_valid(event_json))
    );

    CREATE INDEX IF NOT EXISTS learning_events_occurred_at_idx ON learning_events(occurred_at);
    CREATE INDEX IF NOT EXISTS learning_events_type_idx ON learning_events(event_type);
    CREATE INDEX IF NOT EXISTS learning_events_lexeme_idx ON learning_events(lexeme_key);
    CREATE INDEX IF NOT EXISTS learning_events_review_unit_idx ON learning_events(review_unit_id);

    CREATE TABLE IF NOT EXISTS ingest_batches (
      batch_id TEXT PRIMARY KEY,
      device_id TEXT NOT NULL,
      received_at TEXT NOT NULL,
      event_count INTEGER NOT NULL CHECK (event_count > 0),
      content_hash TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS projection_records (
      projection_key TEXT PRIMARY KEY,
      projection_type TEXT NOT NULL,
      projection_version INTEGER NOT NULL,
      state_json TEXT NOT NULL CHECK (json_valid(state_json)),
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS projection_checkpoints (
      projection_name TEXT PRIMARY KEY,
      projection_version INTEGER NOT NULL,
      source_event_count INTEGER NOT NULL,
      source_hash TEXT NOT NULL,
      state_hash TEXT NOT NULL DEFAULT '',
      rebuilt_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS migration_snapshots (
      snapshot_id TEXT PRIMARY KEY,
      source_name TEXT NOT NULL,
      record_count INTEGER NOT NULL,
      content_hash TEXT NOT NULL,
      snapshot_json TEXT NOT NULL CHECK (json_valid(snapshot_json)),
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS backup_catalog (
      backup_id TEXT PRIMARY KEY,
      file_name TEXT NOT NULL,
      content_hash TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      verified_at TEXT
    );
  `);
  const checkpointColumns = database.prepare('PRAGMA table_info(projection_checkpoints)').all();
  if (!checkpointColumns.some(column => column.name === 'state_hash')) {
    database.exec("ALTER TABLE projection_checkpoints ADD COLUMN state_hash TEXT NOT NULL DEFAULT ''");
  }
  const insertMigration = database.prepare('INSERT OR IGNORE INTO schema_migrations(version, applied_at) VALUES (?, ?)');
  const appliedAt = new Date().toISOString();
  for (let version = 1; version <= DATABASE_SCHEMA_VERSION; version += 1) insertMigration.run(version, appliedAt);
}

function createLearningStore(options = {}) {
  const databasePath = path.resolve(options.databasePath || defaultDatabasePath(options.environment));
  const now = options.now || (() => new Date());
  const failpoint = typeof options.failpoint === 'function' ? options.failpoint : function () {};
  const backupDirectory = path.resolve(options.backupDirectory || path.join(path.dirname(databasePath), 'backups'));
  const secondaryBackupDirectory = path.resolve(options.secondaryBackupDirectory
    || (options.databasePath
      ? path.join(path.dirname(databasePath), 'secondary-backups')
      : defaultSecondaryBackupDirectory(options.environment)));
  fs.mkdirSync(path.dirname(databasePath), { recursive: true });
  const recoveryStatus = options.autoRecoverCorruptDatabase === false
    ? { performed: false, reason: 'disabled' }
    : recoverCorruptDatabase({
        databasePath,
        backupDirectories: [secondaryBackupDirectory, backupDirectory],
        now() {
          const value = now();
          const date = value instanceof Date ? value : new Date(value);
          if (Number.isNaN(date.getTime())) throw new TypeError('now must return a valid date');
          return date;
        },
        failpoint
      });
  const database = new DatabaseSync(databasePath);
  initializeSchema(database);
  database.exec(`PRAGMA busy_timeout = ${Math.max(0, Math.round(Number(options.busyTimeoutMs ?? 5000)))}`);

  const findEvent = database.prepare('SELECT event_id, content_hash, event_json FROM learning_events WHERE event_id = ?');
  const insertEvent = database.prepare(`
    INSERT INTO learning_events (
      event_id, schema_name, schema_version, learner_id, device_id, event_type,
      occurred_at, recorded_at, received_at, source_module, lexeme_key,
      unresolved_lexeme_id, sense_id, review_unit_id, content_hash, event_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const findBatch = database.prepare('SELECT batch_id, content_hash, received_at FROM ingest_batches WHERE batch_id = ?');
  const insertBatch = database.prepare('INSERT INTO ingest_batches(batch_id, device_id, received_at, event_count, content_hash) VALUES (?, ?, ?, ?, ?)');
  const listEvents = database.prepare('SELECT event_json FROM learning_events ORDER BY occurred_at, recorded_at, event_id');
  const deleteFsrsProjections = database.prepare('DELETE FROM projection_records WHERE projection_type = ?');
  const insertProjection = database.prepare(`
    INSERT INTO projection_records(projection_key, projection_type, projection_version, state_json, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `);
  const upsertProjectionCheckpoint = database.prepare(`
    INSERT INTO projection_checkpoints(
      projection_name, projection_version, source_event_count, source_hash, state_hash, rebuilt_at
    ) VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(projection_name) DO UPDATE SET
      projection_version = excluded.projection_version,
      source_event_count = excluded.source_event_count,
      source_hash = excluded.source_hash,
      state_hash = excluded.state_hash,
      rebuilt_at = excluded.rebuilt_at
  `);
  const findProjectionCheckpoint = database.prepare('SELECT * FROM projection_checkpoints WHERE projection_name = ?');
  const listFsrsProjections = database.prepare('SELECT state_json FROM projection_records WHERE projection_type = ? ORDER BY projection_key');
  const findProjectionRecord = database.prepare('SELECT state_json FROM projection_records WHERE projection_key = ?');
  const upsertProjectionRecord = database.prepare(`
    INSERT INTO projection_records(projection_key, projection_type, projection_version, state_json, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(projection_key) DO UPDATE SET
      projection_type = excluded.projection_type,
      projection_version = excluded.projection_version,
      state_json = excluded.state_json,
      updated_at = excluded.updated_at
  `);
  const countDeviceDayEvents = database.prepare(`
    SELECT COUNT(*) AS count FROM learning_events
    WHERE device_id = ? AND json_extract(event_json, '$.context.localDate') = ?
  `);
  const listCalibrationDays = database.prepare(`
    SELECT state_json FROM projection_records
    WHERE projection_type = 'vocabularyFsrsCalibrationDay'
    ORDER BY projection_key
  `);
  const findMigrationSnapshot = database.prepare('SELECT * FROM migration_snapshots WHERE snapshot_id = ?');
  const listMigrationSnapshots = database.prepare('SELECT * FROM migration_snapshots ORDER BY created_at, snapshot_id');
  const insertMigrationSnapshot = database.prepare(`
    INSERT INTO migration_snapshots(snapshot_id, source_name, record_count, content_hash, snapshot_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const insertBackup = database.prepare(`
    INSERT INTO backup_catalog(backup_id, file_name, content_hash, size_bytes, created_at, verified_at)
    VALUES (?, ?, ?, ?, ?, NULL)
  `);
  const findBackup = database.prepare('SELECT * FROM backup_catalog WHERE backup_id = ?');
  const listBackupRows = database.prepare('SELECT * FROM backup_catalog ORDER BY created_at DESC, backup_id DESC');
  const verifyBackupRow = database.prepare('UPDATE backup_catalog SET verified_at = ? WHERE backup_id = ?');
  const deleteBackupRow = database.prepare('DELETE FROM backup_catalog WHERE backup_id = ?');
  const automaticBackups = options.automaticBackups !== false;
  let backupQueue = Promise.resolve();
  let lastBackupError = null;

  function currentTime() {
    const value = now();
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) throw new TypeError('now must return a valid date');
    return date.toISOString();
  }

  function publicRecoveryStatus() {
    return recoveryStatus.performed ? {
      performed: true,
      recoveredAt: recoveryStatus.recoveredAt,
      backupId: recoveryStatus.backupId,
      backupCreatedAt: recoveryStatus.backupCreatedAt,
      backupVerifiedAt: recoveryStatus.backupVerifiedAt,
      recoveredEventCount: recoveryStatus.recoveredEventCount
    } : { performed: false, reason: recoveryStatus.reason };
  }

  function publicBackup(row) {
    return {
      backupId: row.backup_id,
      kind: String(row.file_name).startsWith('weekly-') ? 'weekly' : 'daily',
      contentHash: row.content_hash,
      sizeBytes: Number(row.size_bytes),
      createdAt: row.created_at,
      verifiedAt: row.verified_at || null
    };
  }

  function backupPath(row) {
    const target = path.resolve(backupDirectory, String(row.file_name || ''));
    if (path.dirname(target) !== backupDirectory) {
      throw new LearningStoreError('INVALID_BACKUP_PATH', 'backup catalog contains an invalid file name');
    }
    return target;
  }

  function inspectDatabaseFile(filePath) {
    return inspectLearningDatabaseFile(filePath);
  }

  function verifiedManifest(row, inspection, verifiedAt) {
    return {
      schema: VERIFIED_BACKUP_MANIFEST_SCHEMA,
      schemaVersion: VERIFIED_BACKUP_MANIFEST_VERSION,
      backupId: row.backup_id,
      fileName: row.file_name,
      contentHash: row.content_hash,
      sizeBytes: Number(row.size_bytes),
      createdAt: row.created_at,
      verifiedAt,
      database: inspection
    };
  }

  function publishVerifiedBackup(row, inspection, verifiedAt) {
    const sourcePath = backupPath(row);
    const manifest = verifiedManifest(row, inspection, verifiedAt);
    fs.mkdirSync(secondaryBackupDirectory, { recursive: true });
    const secondaryPath = path.resolve(secondaryBackupDirectory, row.file_name);
    if (path.dirname(secondaryPath) !== secondaryBackupDirectory) {
      throw new LearningStoreError('INVALID_SECONDARY_BACKUP_PATH', 'secondary backup path is invalid');
    }
    if (!fs.existsSync(secondaryPath)) {
      const temporaryPath = `${secondaryPath}.${crypto.randomUUID()}.tmp`;
      try {
        fs.copyFileSync(sourcePath, temporaryPath, fs.constants.COPYFILE_EXCL);
        if (fileSha256(temporaryPath) !== row.content_hash) {
          throw new LearningStoreError('SECONDARY_BACKUP_HASH_MISMATCH', 'secondary backup copy hash does not match');
        }
        inspectDatabaseFile(temporaryPath);
        fs.renameSync(temporaryPath, secondaryPath);
      } finally {
        try { if (fs.existsSync(temporaryPath)) fs.unlinkSync(temporaryPath); } catch (_cleanupError) {}
      }
    } else if (fileSha256(secondaryPath) !== row.content_hash) {
      throw new LearningStoreError('SECONDARY_BACKUP_CONFLICT', 'secondary backup file exists with different content');
    }
    atomicWriteJson(verifiedManifestPath(secondaryBackupDirectory, row.file_name), manifest);
    atomicWriteJson(verifiedManifestPath(backupDirectory, row.file_name), manifest);
    return manifest;
  }

  function inspectBackupRow(row) {
    const filePath = backupPath(row);
    if (!fs.existsSync(filePath)) throw new LearningStoreError('BACKUP_FILE_MISSING', 'backup file is missing');
    const contentHash = fileSha256(filePath);
    if (contentHash !== row.content_hash) {
      throw new LearningStoreError('BACKUP_HASH_MISMATCH', 'backup file hash does not match the catalog');
    }
    return { ...inspectDatabaseFile(filePath), contentHash, sizeBytes: fs.statSync(filePath).size };
  }

  function pruneBackups(kind, keep) {
    const rows = listBackupRows.all().filter(row => String(row.file_name).startsWith(`${kind}-`));
    rows.slice(keep).forEach(function (row) {
      const target = backupPath(row);
      if (fs.existsSync(target)) fs.unlinkSync(target);
      const primaryManifest = verifiedManifestPath(backupDirectory, row.file_name);
      if (fs.existsSync(primaryManifest)) fs.unlinkSync(primaryManifest);
      const secondaryTarget = path.resolve(secondaryBackupDirectory, row.file_name);
      const secondaryManifest = verifiedManifestPath(secondaryBackupDirectory, row.file_name);
      if (path.dirname(secondaryTarget) === secondaryBackupDirectory && fs.existsSync(secondaryTarget)) fs.unlinkSync(secondaryTarget);
      if (fs.existsSync(secondaryManifest)) fs.unlinkSync(secondaryManifest);
      deleteBackupRow.run(row.backup_id);
    });
  }

  async function createBackupNow(input) {
    const value = input && typeof input === 'object' ? input : {};
    const kind = value.kind === 'weekly' ? 'weekly' : 'daily';
    const createdAt = currentTime();
    const backupId = crypto.randomUUID();
    const stamp = createdAt.replace(/[-:.TZ]/g, '').slice(0, 14);
    const fileName = `${kind}-${stamp}-${backupId}.sqlite3`;
    const finalPath = path.resolve(backupDirectory, fileName);
    const temporaryPath = `${finalPath}.tmp`;
    fs.mkdirSync(backupDirectory, { recursive: true });
    failpoint('before_backup', { backupId, kind });
    try {
      await backupDatabase(database, temporaryPath);
      failpoint('after_backup_temp', { backupId, kind, temporaryPath });
      inspectDatabaseFile(temporaryPath);
      const contentHash = fileSha256(temporaryPath);
      const sizeBytes = fs.statSync(temporaryPath).size;
      fs.renameSync(temporaryPath, finalPath);
      insertBackup.run(backupId, fileName, contentHash, sizeBytes, createdAt);
      pruneBackups('daily', 7);
      pruneBackups('weekly', 4);
      lastBackupError = null;
      return publicBackup(findBackup.get(backupId));
    } catch (error) {
      try { if (fs.existsSync(temporaryPath)) fs.unlinkSync(temporaryPath); } catch (_cleanupError) {}
      try { if (fs.existsSync(finalPath) && !findBackup.get(backupId)) fs.unlinkSync(finalPath); } catch (_cleanupError) {}
      lastBackupError = { code: error.code || 'BACKUP_FAILED', at: createdAt };
      throw error;
    }
  }

  function enqueueBackup(task) {
    const operation = backupQueue.then(task, task);
    backupQueue = operation.catch(function () {});
    return operation;
  }

  function createBackup(input) {
    return enqueueBackup(function () { return createBackupNow(input); });
  }

  function elapsedHours(from, to) {
    if (!from) return Infinity;
    return (Date.parse(to) - Date.parse(from)) / 3600000;
  }

  function maybeCreateAutomaticBackups() {
    if (!automaticBackups) return Promise.resolve({ ok: true, skipped: true, created: [] });
    return enqueueBackup(async function () {
      const at = currentTime();
      const rows = listBackupRows.all();
      const latestDaily = rows.find(row => String(row.file_name).startsWith('daily-'));
      const latestWeekly = rows.find(row => String(row.file_name).startsWith('weekly-'));
      const created = [];
      if (!latestDaily || elapsedHours(latestDaily.created_at, at) >= 24) {
        created.push(await createBackupNow({ kind: 'daily', reason: 'automatic' }));
      }
      if (!latestWeekly || elapsedHours(latestWeekly.created_at, at) >= 24 * 7) {
        created.push(await createBackupNow({ kind: 'weekly', reason: 'automatic' }));
      }
      return { ok: true, skipped: created.length === 0, created };
    });
  }

  function listBackups() {
    return listBackupRows.all().map(publicBackup);
  }

  function verifyBackup(backupId) {
    const row = findBackup.get(String(backupId || ''));
    if (!row) throw new LearningStoreError('BACKUP_NOT_FOUND', 'backup was not found');
    return { ok: true, backup: publicBackup(row), database: inspectBackupRow(row) };
  }

  function verifyRestore(backupId) {
    return enqueueBackup(async function () {
      const row = findBackup.get(String(backupId || ''));
      if (!row) throw new LearningStoreError('BACKUP_NOT_FOUND', 'backup was not found');
      const source = inspectBackupRow(row);
      fs.mkdirSync(backupDirectory, { recursive: true });
      const restorePath = path.join(backupDirectory, `.restore-${crypto.randomUUID()}.sqlite3.tmp`);
      let backupSource;
      try {
        backupSource = new DatabaseSync(backupPath(row), { readOnly: true });
        await backupDatabase(backupSource, restorePath);
        backupSource.close();
        backupSource = null;
        const restored = inspectDatabaseFile(restorePath);
        if (restored.eventCount !== source.eventCount || restored.sourceHash !== source.sourceHash
            || restored.stateHash !== source.stateHash) {
          throw new LearningStoreError('BACKUP_RESTORE_MISMATCH', 'restored database does not match the backup');
        }
        const verifiedAt = currentTime();
        publishVerifiedBackup(row, restored, verifiedAt);
        verifyBackupRow.run(verifiedAt, row.backup_id);
        return { ok: true, backup: publicBackup(findBackup.get(row.backup_id)), database: restored };
      } finally {
        if (backupSource) backupSource.close();
        try { if (fs.existsSync(restorePath)) fs.unlinkSync(restorePath); } catch (_cleanupError) {}
      }
    });
  }

  function switchReadiness() {
    const status = health();
    const checkpoint = checkpointValue();
    const snapshotCount = Number(database.prepare('SELECT COUNT(*) AS count FROM migration_snapshots WHERE source_name = ?')
      .get('vocabulary-review-records').count);
    const latest = listBackupRows.get();
    let backupCurrent = false;
    let backupReason = latest ? '最新备份尚未完成独立恢复验证' : '还没有数据库备份';
    if (latest && latest.verified_at) {
      try {
        const inspected = inspectBackupRow(latest);
        backupCurrent = Boolean(checkpoint && inspected.eventCount === status.eventCount
          && inspected.sourceHash === checkpoint.sourceHash && inspected.stateHash === checkpoint.stateHash);
        backupReason = backupCurrent ? '最新备份已恢复验证，且与当前数据一致' : '验证过的备份落后于当前数据，请重新备份';
      } catch (_error) {
        backupReason = '最新备份文件校验失败';
      }
    }
    let secondaryBackupCurrent = false;
    if (latest && latest.verified_at) {
      try {
        const candidate = verifiedBackupCandidate(
          secondaryBackupDirectory,
          `${latest.file_name}.verified.json`
        );
        secondaryBackupCurrent = Boolean(candidate && candidate.manifest.backupId === latest.backup_id);
      } catch (_error) {}
    }
    const checks = [
      { id: 'database', ok: status.ok, message: status.ok ? '数据库完整且可写' : '数据库当前不可写或完整性检查失败' },
      { id: 'projection', ok: Boolean(checkpoint), message: checkpoint ? 'FSRS 对照状态已生成' : 'FSRS 对照状态尚未生成' },
      { id: 'legacySnapshot', ok: snapshotCount > 0, message: snapshotCount > 0 ? '旧进度快照已保存' : '旧进度快照尚未保存' },
      { id: 'backupRestore', ok: backupCurrent, message: backupReason },
      { id: 'secondaryBackup', ok: secondaryBackupCurrent, message: secondaryBackupCurrent
        ? '已验证备份同时保存在第二位置'
        : '第二备份位置尚无当前已验证副本' },
      { id: 'parameters', ok: true, message: `固定参数集 ${FsrsProjection.PARAMETER_SET_ID}` }
    ];
    return {
      ok: true,
      ready: checks.every(check => check.ok),
      checks,
      eventCount: status.eventCount,
      sourceHash: checkpoint && checkpoint.sourceHash || null,
      stateHash: checkpoint && checkpoint.stateHash || null,
      latestBackup: latest ? publicBackup(latest) : null,
      secondaryBackupReady: secondaryBackupCurrent,
      recovery: publicRecoveryStatus(),
      lastBackupError
    };
  }

  function rebuildFsrsProjection(rebuiltAt) {
    const events = listEvents.all().map(row => JSON.parse(row.event_json));
    const result = FsrsProjection.buildProjection(events);
    const sourceHash = sha256(result.sourceCanonical);
    const stateHash = sha256(result.stateCanonical);
    deleteFsrsProjections.run(FsrsProjection.PROJECTION_TYPE);
    result.records.forEach(record => {
      insertProjection.run(
        record.projectionKey,
        record.projectionType,
        record.projectionVersion,
        EventSchema.canonicalStringify(record),
        rebuiltAt
      );
    });
    upsertProjectionCheckpoint.run(
      FsrsProjection.PROJECTION_NAME,
      FsrsProjection.PROJECTION_VERSION,
      result.sourceEventCount,
      sourceHash,
      stateHash,
      rebuiltAt
    );
    return {
      projectionName: FsrsProjection.PROJECTION_NAME,
      projectionVersion: FsrsProjection.PROJECTION_VERSION,
      parameterSetId: FsrsProjection.PARAMETER_SET_ID,
      sourceEventCount: result.sourceEventCount,
      effectiveReviewCount: result.effectiveReviewCount,
      reviewUnitCount: result.reviewUnitCount,
      sourceHash,
      stateHash,
      rebuiltAt
    };
  }

  function checkpointValue() {
    const row = findProjectionCheckpoint.get(FsrsProjection.PROJECTION_NAME);
    if (!row) return null;
    return {
      projectionName: row.projection_name,
      projectionVersion: row.projection_version,
      parameterSetId: FsrsProjection.PARAMETER_SET_ID,
      sourceEventCount: row.source_event_count,
      reviewUnitCount: Number(database.prepare('SELECT COUNT(*) AS count FROM projection_records WHERE projection_type = ?').get(FsrsProjection.PROJECTION_TYPE).count),
      sourceHash: row.source_hash,
      stateHash: row.state_hash,
      rebuiltAt: row.rebuilt_at
    };
  }

  function calibrationSummary() {
    const records = listCalibrationDays.all().map(row => JSON.parse(row.state_json));
    const days = Array.from(new Set(records.map(record => record.localDate))).sort();
    return {
      matchedLearningDays: days.length,
      targetLearningDays: 14,
      firstMatchedDate: days.length ? days[0] : null,
      latestMatchedDate: days.length ? days[days.length - 1] : null,
      complete: days.length >= 14
    };
  }

  function recordProjectionComparison(input) {
    const value = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
    const deviceId = String(value.deviceId || '').toLowerCase();
    const localDate = String(value.localDate || '');
    const comparedAt = String(value.comparedAt || '');
    const sourceHash = String(value.sourceHash || '').toLowerCase();
    const stateHash = String(value.stateHash || '').toLowerCase();
    const sourceEventCount = Number(value.sourceEventCount);
    if (!EventSchema.UUID_V4.test(deviceId)) throw new TypeError('comparison deviceId must be a UUIDv4');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(localDate) || Number.isNaN(Date.parse(`${localDate}T00:00:00Z`))) {
      throw new TypeError('comparison localDate must be YYYY-MM-DD');
    }
    if (Number.isNaN(Date.parse(comparedAt)) || !/(?:Z|[+-]\d{2}:\d{2})$/i.test(comparedAt)) {
      throw new TypeError('comparison comparedAt must include a timezone');
    }
    if (!/^[0-9a-f]{64}$/.test(sourceHash) || !/^[0-9a-f]{64}$/.test(stateHash)) {
      throw new TypeError('comparison hashes must be SHA-256 hex strings');
    }
    if (!Number.isInteger(sourceEventCount) || sourceEventCount < 0) throw new TypeError('comparison sourceEventCount must be a non-negative integer');

    const checkpoint = checkpointValue();
    const matched = Boolean(checkpoint
      && checkpoint.sourceEventCount === sourceEventCount
      && checkpoint.sourceHash === sourceHash
      && checkpoint.stateHash === stateHash);
    if (!matched) return { status: 'mismatch', matched: false, qualifiedLearningDay: false, calibration: calibrationSummary() };

    const learningEventCount = Number(countDeviceDayEvents.get(deviceId, localDate).count);
    if (!learningEventCount) {
      return { status: 'matched_without_learning', matched: true, qualifiedLearningDay: false, calibration: calibrationSummary() };
    }

    const projectionKey = `vocabularyFsrsCalibrationDay:${deviceId}:${localDate}`;
    const previousRow = findProjectionRecord.get(projectionKey);
    const previous = previousRow ? JSON.parse(previousRow.state_json) : null;
    const record = {
      projectionKey,
      projectionType: 'vocabularyFsrsCalibrationDay',
      projectionVersion: 1,
      localDate,
      firstMatchedAt: previous && previous.firstMatchedAt || comparedAt,
      lastMatchedAt: comparedAt,
      matchCount: Number(previous && previous.matchCount || 0) + 1,
      learningEventCount,
      sourceEventCount,
      sourceHash,
      stateHash
    };
    upsertProjectionRecord.run(
      projectionKey,
      record.projectionType,
      record.projectionVersion,
      EventSchema.canonicalStringify(record),
      comparedAt
    );
    return { status: 'matched_learning_day', matched: true, qualifiedLearningDay: true, calibration: calibrationSummary() };
  }

  function ingestBatch(input) {
    const batch = EventSchema.normalizeEventBatch(input);
    const hashes = new Map(batch.events.map(event => [event.eventId, eventContentHash(event)]));
    const batchHash = batchContentHash(batch, hashes);
    const committedAt = currentTime();
    const acceptedEventIds = [];
    const duplicateEventIds = [];
    let projectionCheckpoint;
    database.exec('BEGIN IMMEDIATE');
    try {
      const previousBatch = findBatch.get(batch.batchId);
      if (previousBatch) {
        if (previousBatch.content_hash !== batchHash) {
          throw new LearningStoreError('BATCH_ID_CONFLICT', 'batchId already exists with different content');
        }
        projectionCheckpoint = rebuildFsrsProjection(committedAt);
        database.exec('COMMIT');
        return {
          ok: true,
          batchId: batch.batchId,
          committedAt: previousBatch.received_at,
          acceptedEventIds: [],
          duplicateEventIds: batch.events.map(event => event.eventId),
          contentHash: batchHash,
          projectionCheckpoint
        };
      }

      for (const event of batch.events) {
        const previousEvent = findEvent.get(event.eventId);
        if (previousEvent && previousEvent.content_hash !== hashes.get(event.eventId)) {
          throw new LearningStoreError('EVENT_ID_CONFLICT', `eventId already exists with different content: ${event.eventId}`);
        }
        if (previousEvent) {
          duplicateEventIds.push(event.eventId);
          continue;
        }
        const storedEvent = { ...event, receivedAt: committedAt };
        insertEvent.run(
          event.eventId,
          event.schema,
          event.schemaVersion,
          event.learnerId,
          event.deviceId,
          event.eventType,
          event.occurredAt,
          event.recordedAt,
          committedAt,
          event.source.module,
          event.subject.lexemeKey,
          event.subject.unresolvedLexemeId,
          event.subject.senseId,
          event.subject.reviewUnitId,
          hashes.get(event.eventId),
          EventSchema.canonicalStringify(storedEvent)
        );
        acceptedEventIds.push(event.eventId);
      }
      failpoint('after_events_before_projection', { batchId: batch.batchId, acceptedEventIds: acceptedEventIds.slice() });
      insertBatch.run(batch.batchId, batch.deviceId, committedAt, batch.events.length, batchHash);
      projectionCheckpoint = rebuildFsrsProjection(committedAt);
      database.exec('COMMIT');
    } catch (error) {
      try { database.exec('ROLLBACK'); } catch (_rollbackError) {}
      throw error;
    }

    return {
      ok: true,
      batchId: batch.batchId,
      committedAt,
      acceptedEventIds,
      duplicateEventIds,
      contentHash: batchHash,
      projectionCheckpoint
    };
  }

  function saveLegacyVocabularySnapshot(input) {
    const plan = VocabularyFsrsTransition.validatePlan(input);
    const snapshotJson = EventSchema.canonicalStringify(plan);
    const contentHash = sha256(snapshotJson);
    const snapshotId = `legacy-vocabulary-${contentHash}`;
    const createdAt = currentTime();
    database.exec('BEGIN IMMEDIATE');
    try {
      const previous = findMigrationSnapshot.get(snapshotId);
      if (previous && previous.content_hash !== contentHash) {
        throw new LearningStoreError('SNAPSHOT_ID_CONFLICT', 'snapshotId already exists with different content');
      }
      if (!previous) {
        insertMigrationSnapshot.run(snapshotId, 'vocabulary-review-records', plan.legacyRecordCount, contentHash, snapshotJson, createdAt);
      }
      database.exec('COMMIT');
      return {
        ok: true,
        snapshotId,
        contentHash,
        recordCount: plan.legacyRecordCount,
        createdAt: previous ? previous.created_at : createdAt,
        duplicate: Boolean(previous)
      };
    } catch (error) {
      try { database.exec('ROLLBACK'); } catch (_rollbackError) {}
      throw error;
    }
  }

  function exportArchiveV2() {
    const events = listEvents.all().map(row => JSON.parse(row.event_json));
    const migrationSnapshots = listMigrationSnapshots.all().map(row => ({
      snapshotId: row.snapshot_id,
      sourceName: row.source_name,
      recordCount: row.record_count,
      contentHash: row.content_hash,
      createdAt: row.created_at,
      snapshot: JSON.parse(row.snapshot_json)
    }));
    const checkpoint = checkpointValue() || rebuildFsrsProjection(currentTime());
    const body = {
      schema: ARCHIVE_SCHEMA,
      version: ARCHIVE_VERSION,
      databaseSchemaVersion: DATABASE_SCHEMA_VERSION,
      exportedAt: currentTime(),
      events,
      migrationSnapshots,
      hashes: { sourceHash: checkpoint.sourceHash, stateHash: checkpoint.stateHash }
    };
    return { ...body, archiveHash: sha256(EventSchema.canonicalStringify(body)) };
  }

  function importArchiveV2(input) {
    const archive = input && typeof input === 'object' && !Array.isArray(input) ? input : null;
    if (!archive || archive.schema !== ARCHIVE_SCHEMA || archive.version !== ARCHIVE_VERSION) {
      throw new TypeError('unsupported learning archive');
    }
    const body = { ...archive };
    delete body.archiveHash;
    const expectedArchiveHash = sha256(EventSchema.canonicalStringify(body));
    if (archive.archiveHash !== expectedArchiveHash) throw new TypeError('learning archive hash does not match');
    if (!Array.isArray(archive.events) || !Array.isArray(archive.migrationSnapshots)) {
      throw new TypeError('learning archive events and migrationSnapshots must be arrays');
    }
    if (!archive.hashes || !/^[0-9a-f]{64}$/.test(String(archive.hashes.sourceHash || ''))
        || !/^[0-9a-f]{64}$/.test(String(archive.hashes.stateHash || ''))) {
      throw new TypeError('learning archive projection hashes are invalid');
    }
    const events = archive.events.map(event => EventSchema.normalizeLearningEvent(event));
    const snapshots = archive.migrationSnapshots.map(function (entry) {
      const plan = VocabularyFsrsTransition.validatePlan(entry && entry.snapshot);
      const snapshotJson = EventSchema.canonicalStringify(plan);
      const contentHash = sha256(snapshotJson);
      if (!entry || entry.contentHash !== contentHash || entry.recordCount !== plan.legacyRecordCount) {
        throw new TypeError('learning archive migration snapshot hash does not match');
      }
      return { ...entry, plan, snapshotJson, contentHash };
    });
    const importedEventIds = [];
    const duplicateEventIds = [];
    let projectionCheckpoint;
    database.exec('BEGIN IMMEDIATE');
    try {
      events.forEach(function (event) {
        const contentHash = eventContentHash(event);
        const previous = findEvent.get(event.eventId);
        if (previous && previous.content_hash !== contentHash) {
          throw new LearningStoreError('EVENT_ID_CONFLICT', `eventId already exists with different content: ${event.eventId}`);
        }
        if (previous) {
          duplicateEventIds.push(event.eventId);
          return;
        }
        const receivedAt = event.receivedAt || currentTime();
        const storedEvent = { ...event, receivedAt };
        insertEvent.run(
          event.eventId, event.schema, event.schemaVersion, event.learnerId, event.deviceId,
          event.eventType, event.occurredAt, event.recordedAt, receivedAt, event.source.module,
          event.subject.lexemeKey, event.subject.unresolvedLexemeId, event.subject.senseId,
          event.subject.reviewUnitId, contentHash, EventSchema.canonicalStringify(storedEvent)
        );
        importedEventIds.push(event.eventId);
      });
      snapshots.forEach(function (entry) {
        const previous = findMigrationSnapshot.get(entry.snapshotId);
        if (previous && previous.content_hash !== entry.contentHash) {
          throw new LearningStoreError('SNAPSHOT_ID_CONFLICT', 'snapshotId already exists with different content');
        }
        if (!previous) {
          insertMigrationSnapshot.run(
            entry.snapshotId,
            String(entry.sourceName || 'vocabulary-review-records'),
            entry.recordCount,
            entry.contentHash,
            entry.snapshotJson,
            String(entry.createdAt || currentTime())
          );
        }
      });
      failpoint('after_archive_import_before_projection', { importedEventIds: importedEventIds.slice() });
      projectionCheckpoint = rebuildFsrsProjection(currentTime());
      if (projectionCheckpoint.sourceHash !== archive.hashes.sourceHash
          || projectionCheckpoint.stateHash !== archive.hashes.stateHash) {
        throw new LearningStoreError('ARCHIVE_PROJECTION_MISMATCH', 'archive replay produced different projection hashes');
      }
      database.exec('COMMIT');
    } catch (error) {
      try { database.exec('ROLLBACK'); } catch (_rollbackError) {}
      throw error;
    }
    return {
      ok: true,
      archiveHash: expectedArchiveHash,
      importedEventIds,
      duplicateEventIds,
      projectionCheckpoint
    };
  }

  function health() {
    const integrity = database.prepare('PRAGMA integrity_check').get();
    let writable = false;
    try {
      database.exec('BEGIN IMMEDIATE');
      database.prepare('UPDATE schema_migrations SET applied_at = applied_at WHERE version = ?').run(DATABASE_SCHEMA_VERSION);
      database.exec('ROLLBACK');
      writable = true;
    } catch (_error) {
      try { database.exec('ROLLBACK'); } catch (_rollbackError) {}
    }
    const eventCount = Number(database.prepare('SELECT COUNT(*) AS count FROM learning_events').get().count);
    const pendingProjectionCount = Number(database.prepare('SELECT COUNT(*) AS count FROM projection_records WHERE projection_type = ?').get(FsrsProjection.PROJECTION_TYPE).count);
    const latest = database.prepare('SELECT MAX(received_at) AS received_at FROM learning_events').get();
    const latestBackup = database.prepare('SELECT MAX(COALESCE(verified_at, created_at)) AS backup_at FROM backup_catalog').get();
    const projectionCheckpoint = checkpointValue();
    return {
      ok: Boolean(integrity && integrity.integrity_check === 'ok' && writable),
      writable,
      schemaVersion: DATABASE_SCHEMA_VERSION,
      eventCount,
      projectionCount: pendingProjectionCount,
      latestCommitAt: latest && latest.received_at || null,
      latestBackupAt: latestBackup && latestBackup.backup_at || null,
      secondaryBackupReady: switchReadinessSecondaryStatus(),
      recovery: publicRecoveryStatus(),
      fsrsProjection: projectionCheckpoint && {
        projectionVersion: projectionCheckpoint.projectionVersion,
        sourceEventCount: projectionCheckpoint.sourceEventCount,
        reviewUnitCount: projectionCheckpoint.reviewUnitCount,
        rebuiltAt: projectionCheckpoint.rebuiltAt
      },
      fsrsCalibration: calibrationSummary()
    };
  }

  function switchReadinessSecondaryStatus() {
    const latest = listBackupRows.get();
    if (!latest || !latest.verified_at) return false;
    try {
      const candidate = verifiedBackupCandidate(secondaryBackupDirectory, `${latest.file_name}.verified.json`);
      return Boolean(candidate && candidate.manifest.backupId === latest.backup_id);
    } catch (_error) {
      return false;
    }
  }

  database.exec('BEGIN IMMEDIATE');
  try {
    rebuildFsrsProjection(currentTime());
    database.exec('COMMIT');
  } catch (error) {
    try { database.exec('ROLLBACK'); } catch (_rollbackError) {}
    throw error;
  }

  listBackupRows.all().filter(row => row.verified_at).forEach(row => {
    try {
      publishVerifiedBackup(row, inspectBackupRow(row), row.verified_at);
    } catch (error) {
      lastBackupError = { code: error.code || 'SECONDARY_BACKUP_FAILED', at: currentTime() };
    }
  });

  return {
    databasePath,
    backupDirectory,
    secondaryBackupDirectory,
    recoveryStatus,
    createBackup,
    exportArchiveV2,
    importArchiveV2,
    ingestBatch,
    listBackups,
    maybeCreateAutomaticBackups,
    saveLegacyVocabularySnapshot,
    switchReadiness,
    verifyBackup,
    verifyRestore,
    health,
    getEvent(eventId) {
      const row = findEvent.get(eventId);
      return row ? JSON.parse(row.event_json) : null;
    },
    fsrsProjection(at) {
      const asOf = at ? new Date(at) : now();
      const date = asOf instanceof Date ? asOf : new Date(asOf);
      if (Number.isNaN(date.getTime())) throw new TypeError('projection time must be a valid date');
      const records = listFsrsProjections.all(FsrsProjection.PROJECTION_TYPE).map(row => {
        return FsrsProjection.atTime(JSON.parse(row.state_json), date);
      });
      return { checkpoint: checkpointValue(), asOf: date.toISOString(), records };
    },
    recordProjectionComparison,
    rebuildFsrsProjection() {
      const rebuiltAt = currentTime();
      database.exec('BEGIN IMMEDIATE');
      try {
        const checkpoint = rebuildFsrsProjection(rebuiltAt);
        database.exec('COMMIT');
        return checkpoint;
      } catch (error) {
        try { database.exec('ROLLBACK'); } catch (_rollbackError) {}
        throw error;
      }
    },
    countEvents() { return Number(database.prepare('SELECT COUNT(*) AS count FROM learning_events').get().count); },
    close() { database.close(); }
  };
}

module.exports = {
  ARCHIVE_SCHEMA,
  ARCHIVE_VERSION,
  DATABASE_FILE_NAME,
  DATABASE_SCHEMA_VERSION,
  VERIFIED_BACKUP_MANIFEST_SCHEMA,
  VERIFIED_BACKUP_MANIFEST_VERSION,
  LearningStoreError,
  batchContentHash,
  createLearningStore,
  defaultDataDirectory,
  defaultDatabasePath,
  defaultSecondaryBackupDirectory,
  eventContentHash,
  fileSha256,
  initializeSchema,
  listVerifiedBackupCandidates,
  recoverCorruptDatabase
};
