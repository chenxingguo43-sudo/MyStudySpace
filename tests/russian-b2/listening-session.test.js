const test = require('node:test');
const assert = require('node:assert/strict');
const Session = require('../../js/russian-b2/listening-session');

const unit = {
  id: 'dialogues',
  title: '任务 1-2',
  questions: [
    { id: 'L-Q1', answer: 'А', evidence: { pages: [104], quote: 'Привет!' } },
    { id: 'L-Q2', answer: 'Б', evidence: { pages: [105], quote: 'Как дела?' } }
  ]
};

test('listening settings reject unsupported values and preserve learning preferences', () => {
  assert.deepEqual(Session.normalizeSettings({
    playbackRate: 1.15,
    sentencePauseMs: 1000,
    autoAdvance: true,
    subtitleMode: 'always',
    replayWrongEvidence: false,
    abLoop: false,
    abBeforeSeconds: 0.15,
    abAfterSeconds: 0.15
  }), {
    playbackRate: 1.15,
    sentencePauseMs: 1000,
    autoAdvance: true,
    subtitleMode: 'always',
    replayWrongEvidence: false,
    abLoop: false,
    abBeforeSeconds: 0.15,
    abAfterSeconds: 0.15
  });
  assert.equal(Session.normalizeSettings({ playbackRate: 3 }).playbackRate, 1);
});

test('draft answers remain unscored until the whole listening group is submitted', () => {
  const started = Session.createDraft('dialogues', null, '2026-07-26T08:00:00.000Z');
  const answered = Session.selectAnswer(started, 'L-Q1', 'Б', '2026-07-26T08:01:00.000Z');
  assert.equal(answered.status, 'in_progress');
  assert.deepEqual(answered.answers, { 'L-Q1': 'Б' });

  const attempt = Session.scoreDraft(unit, answered, '2026-07-26T08:02:00.000Z');
  assert.equal(attempt.total, 2);
  assert.equal(attempt.correct, 0);
  assert.equal(attempt.wrong, 1);
  assert.equal(attempt.unanswered, 1);
  assert.equal(attempt.answers[0].result, 'wrong');
  assert.equal(attempt.answers[1].result, 'unanswered');
});

test('submitting extends legacy listening progress without discarding wrong-answer history', () => {
  let draft = Session.createDraft('dialogues', null, '2026-07-26T08:00:00.000Z');
  draft = Session.selectAnswer(draft, 'L-Q1', 'Б', '2026-07-26T08:00:30.000Z');
  draft = Session.selectAnswer(draft, 'L-Q2', 'Б', '2026-07-26T08:00:40.000Z');
  const first = Session.scoreDraft(unit, draft, '2026-07-26T08:01:00.000Z');
  const progress = Session.applyAttempt({}, unit, first);
  assert.equal(progress['L-Q1'].everWrong, true);
  assert.equal(progress['L-Q1'].reviewStatus, 'pending');
  assert.equal(progress['L-Q2'].lastResult, 'correct');

  let retryDraft = Session.createDraft('dialogues', null, '2026-07-27T08:00:00.000Z');
  retryDraft = Session.selectAnswer(retryDraft, 'L-Q1', 'А', '2026-07-27T08:00:30.000Z');
  retryDraft = Session.selectAnswer(retryDraft, 'L-Q2', 'Б', '2026-07-27T08:00:40.000Z');
  const retry = Session.scoreDraft(unit, retryDraft, '2026-07-27T08:01:00.000Z');
  const mastered = Session.applyAttempt(progress, unit, retry);
  assert.equal(mastered['L-Q1'].everWrong, true);
  assert.equal(mastered['L-Q1'].reviewStatus, 'mastered');
  assert.equal(mastered['L-Q1'].history.length, 2);
});

test('review scheduling advances known items and resets lapses to today', () => {
  const pending = Session.normalizeProgressRecord({ moduleId: 'listening', everWrong: true, reviewStatus: 'pending' });
  const known = Session.advanceReview(pending, true, '2026-07-26T09:00:00.000Z');
  assert.equal(known.reviewStep, 1);
  assert.equal(known.nextReviewAt, '2026-07-27');
  const lapsed = Session.advanceReview(known, false, '2026-07-28T09:00:00.000Z');
  assert.equal(lapsed.reviewStep, 0);
  assert.equal(lapsed.nextReviewAt, '2026-07-28');
  assert.equal(lapsed.reviewStatus, 'pending');
});

