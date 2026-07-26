(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.RussianListeningSession = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  var REVIEW_INTERVALS = [0, 1, 2, 4, 7, 15, 30];
  var DEFAULT_SETTINGS = {
    playbackRate: 1,
    sentencePauseMs: 500,
    autoAdvance: false,
    subtitleMode: 'intensive',
    replayWrongEvidence: true,
    abLoop: false,
    abBeforeSeconds: 0.15,
    abAfterSeconds: 0.15
  };

  function clone(value) {
    return JSON.parse(JSON.stringify(value == null ? null : value));
  }

  function isoNow(now) {
    return (now instanceof Date ? now : new Date(now || Date.now())).toISOString();
  }

  function dateKey(value) {
    var date = value instanceof Date ? value : new Date(value || Date.now());
    return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
  }

  function addDays(value, days) {
    var date = value instanceof Date ? new Date(value.getTime()) : new Date(value || Date.now());
    date.setDate(date.getDate() + Number(days || 0));
    return dateKey(date);
  }

  function normalizeSettings(value) {
    value = value && typeof value === 'object' ? value : {};
    var rate = Number(value.playbackRate);
    var pause = Number(value.sentencePauseMs);
    var abBefore = Number(value.abBeforeSeconds);
    var abAfter = Number(value.abAfterSeconds);
    var subtitleMode = ['hidden', 'intensive', 'always'].indexOf(value.subtitleMode) !== -1 ? value.subtitleMode : DEFAULT_SETTINGS.subtitleMode;
    return {
      playbackRate: [0.75, 0.85, 1, 1.15, 1.25].indexOf(rate) !== -1 ? rate : DEFAULT_SETTINGS.playbackRate,
      sentencePauseMs: [0, 500, 1000, 2000].indexOf(pause) !== -1 ? pause : DEFAULT_SETTINGS.sentencePauseMs,
      autoAdvance: value.autoAdvance === true,
      subtitleMode: subtitleMode,
      replayWrongEvidence: value.replayWrongEvidence !== false,
      abLoop: value.abLoop === true,
      abBeforeSeconds: [0, 0.15, 0.3, 0.5].indexOf(abBefore) !== -1 ? abBefore : DEFAULT_SETTINGS.abBeforeSeconds,
      abAfterSeconds: [0, 0.15, 0.3, 0.5].indexOf(abAfter) !== -1 ? abAfter : DEFAULT_SETTINGS.abAfterSeconds
    };
  }

  function createDraft(unitId, previous, now) {
    previous = previous && typeof previous === 'object' ? previous : {};
    return {
      unitId: String(unitId || previous.unitId || ''),
      status: 'in_progress',
      startedAt: previous.startedAt || isoNow(now),
      updatedAt: isoNow(now),
      answers: Object.assign({}, previous.answers || {})
    };
  }

  function selectAnswer(draft, questionId, selected, now) {
    var next = createDraft(draft && draft.unitId, draft, now);
    next.answers[String(questionId || '')] = String(selected || '');
    next.updatedAt = isoNow(now);
    return next;
  }

  function scoreDraft(unit, draft, now) {
    var questions = Array.isArray(unit && unit.questions) ? unit.questions : [];
    var answers = draft && draft.answers || {};
    var submittedAt = isoNow(now);
    var rows = questions.map(function (question, index) {
      var selected = String(answers[question.id] || '');
      var correct = String(question.answer || '');
      return {
        index: index + 1,
        questionId: question.id,
        selected: selected,
        correct: correct,
        result: !selected ? 'unanswered' : selected === correct ? 'correct' : 'wrong',
        evidence: clone(question.evidence || null)
      };
    });
    var correctCount = rows.filter(function (row) { return row.result === 'correct'; }).length;
    var wrongCount = rows.filter(function (row) { return row.result === 'wrong'; }).length;
    var unansweredCount = rows.filter(function (row) { return row.result === 'unanswered'; }).length;
    return {
      id: 'listening-attempt-' + Date.parse(submittedAt).toString(36) + '-' + Math.random().toString(36).slice(2, 7),
      module: 'listening',
      unitId: unit && unit.id || draft && draft.unitId || '',
      title: unit && unit.title || '',
      startedAt: draft && draft.startedAt || submittedAt,
      submittedAt: submittedAt,
      total: rows.length,
      correct: correctCount,
      wrong: wrongCount,
      unanswered: unansweredCount,
      accuracy: rows.length ? Math.round(correctCount / rows.length * 100) : 0,
      answers: rows
    };
  }

  function normalizeProgressRecord(record) {
    record = record && typeof record === 'object' ? record : {};
    return Object.assign({
      selected: '', answered: false, answerOpen: false, attempts: 0,
      everWrong: false, lastResult: '', lastAnsweredAt: '', history: [],
      reviewStatus: '', reviewStep: 0, reviewCount: 0, nextReviewAt: ''
    }, record, { history: Array.isArray(record.history) ? record.history.slice() : [] });
  }

  function applyAttempt(progress, unit, attempt) {
    var next = Object.assign({}, progress || {});
    var questionMap = {};
    (unit && unit.questions || []).forEach(function (question) { questionMap[question.id] = question; });
    (attempt && attempt.answers || []).forEach(function (answer) {
      var old = normalizeProgressRecord(next[answer.questionId]);
      var wasWrong = answer.result === 'wrong';
      var record = Object.assign({}, old, {
        questionId: answer.questionId,
        unitId: attempt.unitId,
        moduleId: 'listening',
        selected: answer.selected,
        answered: answer.result !== 'unanswered',
        answerOpen: false,
        attempts: old.attempts + 1,
        everWrong: old.everWrong || wasWrong,
        lastResult: answer.result,
        lastAnsweredAt: attempt.submittedAt,
        correctAnswer: answer.correct,
        evidence: clone(answer.evidence),
        sourcePages: clone((questionMap[answer.questionId] && questionMap[answer.questionId].evidence && questionMap[answer.questionId].evidence.pages) || [])
      });
      if (wasWrong) {
        record.reviewStatus = 'pending';
        record.reviewStep = 0;
        record.nextReviewAt = dateKey(attempt.submittedAt);
      } else if (answer.result === 'correct' && record.everWrong) {
        record.reviewStatus = 'mastered';
      }
      record.history.push({ selected: answer.selected, correct: answer.correct, result: answer.result, answeredAt: attempt.submittedAt });
      record.history = record.history.slice(-50);
      next[answer.questionId] = record;
    });
    return next;
  }

  function advanceReview(record, known, now) {
    var next = normalizeProgressRecord(record);
    if (known) {
      next.reviewStep = Math.min(next.reviewStep + 1, REVIEW_INTERVALS.length - 1);
      next.reviewCount += 1;
      next.reviewStatus = next.reviewStep >= REVIEW_INTERVALS.length - 1 ? 'mastered' : 'scheduled';
      next.nextReviewAt = addDays(now, REVIEW_INTERVALS[next.reviewStep]);
    } else {
      next.reviewStep = 0;
      next.reviewStatus = 'pending';
      next.nextReviewAt = dateKey(now);
    }
    next.lastReviewedAt = isoNow(now);
    return next;
  }

  function getReviewItems(progress, now) {
    var today = dateKey(now);
    return Object.keys(progress || {}).map(function (questionId) {
      return Object.assign({ questionId: questionId }, normalizeProgressRecord(progress[questionId]));
    }).filter(function (record) {
      return record.moduleId === 'listening' && record.everWrong;
    }).sort(function (left, right) {
      var leftDue = !left.nextReviewAt || left.nextReviewAt <= today ? 1 : 0;
      var rightDue = !right.nextReviewAt || right.nextReviewAt <= today ? 1 : 0;
      return rightDue - leftDue || String(left.nextReviewAt).localeCompare(String(right.nextReviewAt)) || String(right.lastAnsweredAt).localeCompare(String(left.lastAnsweredAt));
    });
  }

  return {
    REVIEW_INTERVALS: REVIEW_INTERVALS,
    DEFAULT_SETTINGS: DEFAULT_SETTINGS,
    normalizeSettings: normalizeSettings,
    createDraft: createDraft,
    selectAnswer: selectAnswer,
    scoreDraft: scoreDraft,
    normalizeProgressRecord: normalizeProgressRecord,
    applyAttempt: applyAttempt,
    advanceReview: advanceReview,
    getReviewItems: getReviewItems,
    dateKey: dateKey
  };
});
