(function(root) {
  'use strict';

  var VERSION = 'zlatoust_grammar_progress_answer_repair_v1';
  var BACKUP_KEY = VERSION + '_backup';
  var CHAPTER_KEYS = ['zlatoust_grammar:gl1', 'zlatoust_grammar:gl2', 'zlatoust_grammar:gl3', 'zlatoust_grammar:gl4', 'zlatoust_grammar:gl5'];

  // Generated from theory/quality-reports/chapter-01-data-repair.json through chapter-05-data-repair.json.
  // Keep this map scoped to answer-key corrections; the ledgers retain the complete source provenance.
  var ANSWER_REPAIRS = {
    'GL1-Q001':'А','GL1-Q005':'Б','GL1-Q006':'Б','GL1-Q019':'Б','GL1-Q023':'Б','GL1-Q025':'А','GL1-Q030':'В','GL1-Q031':'Г','GL1-Q034':'Г','GL1-Q036':'А','GL1-Q037':'Г','GL1-Q038':'А','GL1-Q039':'Б','GL1-Q042':'А','GL1-Q044':'А','GL1-Q045':'А','GL1-Q046':'А','GL1-Q047':'А','GL1-Q048':'Б','GL1-Q050':'Б','GL1-Q052':'Б','GL1-Q053':'Б','GL1-Q056':'Б','GL1-Q059':'Б','GL1-Q061':'А','GL1-Q068':'Б','GL1-Q069':'Б','GL1-Q075':'Б','GL1-Q077':'Б','GL1-Q078':'Б','GL1-Q087':'А','GL1-Q088':'Б','GL1-Q095':'Г',
    'GL2-Q010':'В','GL2-Q015':'В','GL2-Q017':'В','GL2-Q020':'В','GL2-Q036':'В','GL2-Q041':'В','GL2-Q043':'В','GL2-Q046':'В','GL2-Q051':'В','GL2-Q065':'В','GL2-Q087':'В','GL2-Q088':'Б','GL2-Q094':'В','GL2-Q113':'В','GL2-Q115':'В','GL2-Q129':'В','GL2-Q137':'В','GL2-Q150':'Б',
    'GL3-Q014':'В','GL3-Q017':'В','GL3-Q022':'В','GL3-Q034':'В','GL3-Q039':'А','GL3-Q048':'В','GL3-Q054':'В','GL3-Q057':'В','GL3-Q060':'В','GL3-Q084':'Б','GL3-Q094':'В',
    'GL4-Q006':'В','GL4-Q021':'В','GL4-Q026':'В','GL4-Q035':'В','GL4-Q038':'В','GL4-Q051':'В','GL4-Q055':'В','GL4-Q056':'В','GL4-Q063':'В',
    'GL5-Q005':'В','GL5-Q009':'В','GL5-Q012':'В','GL5-Q017':'В','GL5-Q023':'Б','GL5-Q024':'Г','GL5-Q036':'В','GL5-Q038':'В','GL5-Q039':'В','GL5-Q059':'В','GL5-Q060':'В','GL5-Q064':'В','GL5-Q067':'В','GL5-Q075':'В','GL5-Q078':'В','GL5-Q082':'Б','GL5-Q131':'В'
  };

  function isRecord(value) {
    return value && typeof value === 'object' && !Array.isArray(value);
  }
  function copy(value) {
    return JSON.parse(JSON.stringify(value));
  }
  function isSubmittedChoice(record) {
    return record && record.submitted === true && typeof record.selected === 'string' && record.selected && record.selected !== 'open-response';
  }
  function scopedSnapshot(progress) {
    var snapshot = {};
    CHAPTER_KEYS.forEach(function(key) {
      if (isRecord(progress[key])) snapshot[key] = copy(progress[key]);
    });
    return snapshot;
  }
  function hasRepairableRecord(progress) {
    return CHAPTER_KEYS.some(function(key) {
      var records = progress[key];
      return isRecord(records) && Object.keys(records).some(function(exerciseId) {
        return ANSWER_REPAIRS[exerciseId] && isSubmittedChoice(records[exerciseId]);
      });
    });
  }

  function migrate(progress, storage) {
    if (!isRecord(progress) || !storage || storage.getItem(VERSION)) return { progress: progress, migrated: false };
    if (!hasRepairableRecord(progress)) return { progress: progress, migrated: false };

    var original = progress;
    var working;
    try { working = copy(progress); }
    catch (e) { return { progress: original, migrated: false }; }

    var changed = 0;
    CHAPTER_KEYS.forEach(function(key) {
      var records = working[key];
      if (!isRecord(records)) return;
      Object.keys(records).forEach(function(exerciseId) {
        var record = records[exerciseId], correctedAnswer = ANSWER_REPAIRS[exerciseId];
        if (!correctedAnswer || !isSubmittedChoice(record)) return;
        var wrong = record.selected !== correctedAnswer;
        if (record.wrong !== wrong || record.lastResult !== (wrong ? 'wrong' : 'correct')) changed += 1;
        record.wrong = wrong;
        record.lastResult = wrong ? 'wrong' : 'correct';
      });
    });

    var backup = { version: VERSION, createdAt: new Date().toISOString(), records: scopedSnapshot(original) };
    try {
      storage.setItem(BACKUP_KEY, JSON.stringify(backup));
      storage.setItem('rr_b2_progress_v1', JSON.stringify(working));
      storage.setItem(VERSION, JSON.stringify({ version: VERSION, migratedAt: new Date().toISOString(), correctedRecords: changed }));
    } catch (e) {
      return { progress: original, migrated: false };
    }
    return { progress: working, migrated: true, correctedRecords: changed };
  }

  var api = { VERSION: VERSION, BACKUP_KEY: BACKUP_KEY, ANSWER_REPAIRS: ANSWER_REPAIRS, migrate: migrate };
  root.ZlatoustProgressMigration = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
