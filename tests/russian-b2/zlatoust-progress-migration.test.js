const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const migration = require('../../js/zlatoust-progress-migration.js');

function createStorage(initial) {
  const values = new Map(Object.entries(initial || {}));
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    dump(key) { return JSON.parse(values.get(key)); }
  };
}

test('Zlatoust answer repair corrects historical result without erasing history', () => {
  const progress = {
    'zlatoust_grammar:gl1': {
      'GL1-Q001': { selected: 'А', submitted: true, attempts: 3, wrong: true, everWrong: true, lastResult: 'wrong', lastAnsweredAt: '2026-01-01', extra: 'keep' },
      'GL1-Q005': { selected: 'А', submitted: true, attempts: 2, wrong: false, everWrong: true, lastResult: 'correct' },
      'GL1-Q006': { selected: 'open-response', submitted: true, wrong: false, lastResult: 'recorded', response: 'text' },
      'GL1-Q019': { selected: 'Б', submitted: false, wrong: false, lastResult: '' }
    },
    'russian_b2:p1': { 'P1-Q003': { selected: 'Б', submitted: true, wrong: true } }
  };
  const storage = createStorage();
  const result = migration.migrate(progress, storage);
  const records = result.progress['zlatoust_grammar:gl1'];

  assert.equal(result.migrated, true);
  assert.equal(records['GL1-Q001'].wrong, false);
  assert.equal(records['GL1-Q001'].lastResult, 'correct');
  assert.equal(records['GL1-Q001'].attempts, 3);
  assert.equal(records['GL1-Q001'].everWrong, true);
  assert.equal(records['GL1-Q001'].extra, 'keep');
  assert.equal(records['GL1-Q005'].wrong, true);
  assert.equal(records['GL1-Q005'].lastResult, 'wrong');
  assert.equal(records['GL1-Q006'].lastResult, 'recorded');
  assert.equal(records['GL1-Q019'].submitted, false);
  assert.deepEqual(result.progress.russian_b2, undefined);
  assert.equal(result.progress['russian_b2:p1']['P1-Q003'].wrong, true);

  const backup = storage.dump(migration.BACKUP_KEY);
  assert.equal(backup.records['zlatoust_grammar:gl1']['GL1-Q001'].wrong, true);
  assert.equal(backup.records['russian_b2:p1'], undefined);
  assert.equal(storage.dump(migration.VERSION).correctedRecords, 2);
});

test('Zlatoust answer repair is idempotent and creates the backup only once', () => {
  const storage = createStorage();
  const progress = { 'zlatoust_grammar:gl2': { 'GL2-Q010': { selected: 'В', submitted: true, wrong: true, everWrong: true } } };
  const first = migration.migrate(progress, storage);
  const backup = storage.getItem(migration.BACKUP_KEY);
  const second = migration.migrate(first.progress, storage);

  assert.equal(first.migrated, true);
  assert.equal(second.migrated, false);
  assert.equal(storage.getItem(migration.BACKUP_KEY), backup);
  assert.equal(second.progress['zlatoust_grammar:gl2']['GL2-Q010'].wrong, false);
});

test('Zlatoust answer repair leaves malformed or unrelated storage untouched', () => {
  const storage = createStorage();
  const unrelated = { 'russian_b2:p1': { 'P1-Q003': { selected: 'Б', submitted: true } } };
  const result = migration.migrate(unrelated, storage);
  const malformed = migration.migrate(null, storage);

  assert.equal(result.migrated, false);
  assert.equal(result.progress, unrelated);
  assert.equal(malformed.migrated, false);
  assert.equal(malformed.progress, null);
  assert.equal(storage.getItem(migration.BACKUP_KEY), null);
  assert.equal(Object.keys(migration.ANSWER_REPAIRS).length, 88);
});

test('reader loads the Zlatoust migration before its inline progress functions run', () => {
  const reader = fs.readFileSync('reader.html', 'utf8');
  const scriptIndex = reader.indexOf('js/zlatoust-progress-migration.js');
  const inlineIndex = reader.indexOf('function getB2Progress()');

  assert.ok(scriptIndex >= 0 && scriptIndex < inlineIndex);
  assert.match(reader, /ZlatoustProgressMigration\.migrate\(progress, localStorage\)/);
});
