(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.RussianB2ReadingReview = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  const CATEGORY_LABELS = {
    location: '没找到原文',
    vocabulary: '词义不懂',
    logic: '逻辑判断错',
    uncertain: '不确定'
  };

  function normalizeRecord(record = {}) {
    return Object.assign({
      selected: '', answered: false, answerOpen: false, attempts: 0,
      history: [], everWrong: false, lastResult: '', lastAnsweredAt: '',
      reviewStatus: '', errorCategory: '', needsClassification: false
    }, record, { history: Array.isArray(record.history) ? record.history.slice() : [] });
  }

  function recordAttempt(record, question, selected, answeredAt) {
    const next = normalizeRecord(record);
    const correct = String(question.answer || '');
    const result = selected === correct ? 'correct' : 'wrong';
    const option = (question.options || []).find(item => item.label === selected) || {};
    const tagged = Object.prototype.hasOwnProperty.call(CATEGORY_LABELS, option.distractorTag) ? option.distractorTag : '';
    next.selected = selected;
    next.answered = true;
    next.answeredAt = answeredAt;
    next.attempts += 1;
    next.lastResult = result;
    next.lastAnsweredAt = answeredAt;
    next.everWrong = next.everWrong || result === 'wrong';
    next.reviewStatus = next.everWrong ? (result === 'wrong' ? 'pending' : 'mastered') : '';
    if (result === 'wrong' && tagged) next.errorCategory = tagged;
    next.needsClassification = result === 'wrong' && !tagged && !next.errorCategory;
    next.questionId = question.id || next.questionId || '';
    next.unitId = question.unitId || next.unitId || '';
    next.moduleId = question.moduleId || next.moduleId || 'reading';
    next.correctAnswer = correct;
    next.sourcePages = question.answerSource && (question.answerSource.pages || [question.answerSource.pdfPage].filter(Boolean)) || next.sourcePages || [];
    next.history.push({ selected, correct, result, answeredAt });
    return next;
  }

  function setErrorCategory(record, category) {
    const next = normalizeRecord(record);
    next.errorCategory = Object.prototype.hasOwnProperty.call(CATEGORY_LABELS, category) ? category : '';
    next.needsClassification = false;
    return next;
  }

  function prepareRetry(record) {
    const next = normalizeRecord(record);
    next.selected = '';
    next.answered = false;
    next.answerOpen = false;
    next.needsClassification = false;
    return next;
  }

  function getReviewItems(progress) {
    return Object.keys(progress || {}).map(questionId => normalizeRecord(progress[questionId]))
      .filter(record => record.everWrong)
      .map(record => Object.assign({ questionId: record.questionId || '' }, record, { status: record.reviewStatus || (record.lastResult === 'wrong' ? 'pending' : 'mastered') }))
      .sort((left, right) => String(right.lastAnsweredAt).localeCompare(String(left.lastAnsweredAt)));
  }

  return { CATEGORY_LABELS, normalizeRecord, recordAttempt, setErrorCategory, prepareRetry, getReviewItems };
});
