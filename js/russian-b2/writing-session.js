(function(global) {
  'use strict';

  var STORAGE_KEY = 'rr_ws_learning_progress_v1';
  var STAGES = ['planned', 'paperDraft', 'revised'];

  function safeRecords(value) {
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  }

  function getRecords(storage) {
    var target = storage || global.localStorage;
    try { return safeRecords(JSON.parse(target.getItem(STORAGE_KEY) || '{}')); }
    catch (error) { return {}; }
  }

  function saveRecords(records, storage) {
    try { (storage || global.localStorage).setItem(STORAGE_KEY, JSON.stringify(safeRecords(records))); }
    catch (error) {}
  }

  function getTaskRecord(taskId, storage) {
    return getRecords(storage)[taskId] || {};
  }

  function setStage(taskId, stage, checked, storage, now) {
    if (STAGES.indexOf(stage) < 0) return getTaskRecord(taskId, storage);
    var records = getRecords(storage);
    var record = Object.assign({}, records[taskId] || {});
    if (checked) record[stage] = true;
    else delete record[stage];
    record.updatedAt = (now || new Date()).toISOString();
    records[taskId] = record;
    saveRecords(records, storage);
    return record;
  }

  function getStageCount(taskId, storage) {
    var record = getTaskRecord(taskId, storage);
    return STAGES.filter(function(stage) { return record[stage] === true; }).length;
  }

  function isTaskComplete(taskId, storage) {
    return getStageCount(taskId, storage) === STAGES.length;
  }

  function getChapterSummary(tasks, storage) {
    var list = Array.isArray(tasks) ? tasks : [];
    var completed = list.filter(function(task) { return task && task.taskId && isTaskComplete(task.taskId, storage); }).length;
    return { total: list.length, completed: completed, isComplete: list.length > 0 && completed === list.length };
  }

  global.RussianB2WritingSession = {
    STORAGE_KEY: STORAGE_KEY,
    STAGES: STAGES.slice(),
    getRecords: getRecords,
    getTaskRecord: getTaskRecord,
    setStage: setStage,
    getStageCount: getStageCount,
    isTaskComplete: isTaskComplete,
    getChapterSummary: getChapterSummary
  };
})(window);
