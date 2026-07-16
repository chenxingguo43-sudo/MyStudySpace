const fs = require('node:fs');
const test = require('node:test');
const assert = require('node:assert/strict');

const reader = fs.readFileSync('reader.html', 'utf8');

test('reader resolves textbook paths from metadata instead of a B2-specific branch', () => {
  assert.match(reader, /function getBookDataDir\(bookId\)/);
  assert.doesNotMatch(reader, /bookId === 'russian_b2'/);
  assert.match(reader, /data\/textbook/);
});

test('reader shows the textbook badge from metadata', () => {
  assert.match(reader, /b\.kind === 'textbook'/);
  assert.doesNotMatch(reader, /b\.id === 'reading_speaking'/);
});

test('reader provides quiz-first interaction without auto-revealing answers', () => {
  assert.match(reader, /function renderQuizChapter\(data(?:, scrollPosition)?\)/);
  assert.match(reader, /function selectQuizOption\(questionId, key\)/);
  assert.match(reader, /function submitQuizQuestion\(questionId\)/);
  assert.match(reader, /function toggleQuizExplanation\(questionId\)/);
  assert.match(reader, /rr_b2_progress_v1/);
  assert.match(reader, /查看答案与解析/);
  const submitBody = reader.match(/function submitQuizQuestion\(questionId\) \{([\s\S]*?)\n\}/);
  assert.ok(submitBody);
  assert.doesNotMatch(submitBody[1], /toggleQuizExplanation\(/);
});

test('quiz shows verified source explanations inline and completion is not scroll-triggered', () => {
  assert.match(reader, /原书解析（已核对）/);
  assert.match(reader, /exercise\.sourceExplanation/);
  assert.doesNotMatch(reader, /function renderSourceViewer\(/);
  assert.doesNotMatch(reader, /function openQuizSourceViewer\(/);
  assert.doesNotMatch(reader, /查看原书页/);
  assert.match(reader, /function finishQuizChapter\(\)/);
  assert.doesNotMatch(reader, /renderQuizChapter[\s\S]{0,6000}markChapterDone\(/);
});

test('quiz interactions preserve the reader scroll position', () => {
  assert.match(reader, /function rerenderQuizChapterPreservingScroll\(\)/);
  const selectBody = reader.match(/function selectQuizOption\(questionId, key\) \{([\s\S]*?)\n\}/);
  const submitBody = reader.match(/function submitQuizQuestion\(questionId\) \{([\s\S]*?)\n\}/);
  const explanationBody = reader.match(/function toggleQuizExplanation\(questionId\) \{([\s\S]*?)\n\}/);
  assert.ok(selectBody && submitBody && explanationBody);
  assert.match(selectBody[1], /rerenderQuizChapterPreservingScroll\(\)/);
  assert.match(submitBody[1], /rerenderQuizChapterPreservingScroll\(\)/);
  assert.match(explanationBody[1], /rerenderQuizChapterPreservingScroll\(\)/);
});

test('B2 progress uses permanent unit identifiers and migrates the pilot once', () => {
  assert.match(reader, /function getQuizUnitKey\(\)/);
  assert.match(reader, /function migrateB2Progress\(progress\)/);
  assert.match(reader, /currentQuizData\.id/);
  assert.match(reader, /russian_b2:p2-q001-q010/);
  assert.doesNotMatch(reader, /var chapterKey = curBook\.id \+ ':' \+ curCh/);
});

test('B2 completion uses the permanent unit key instead of the chapter index', () => {
  assert.match(reader, /function getB2CompletionKey\(\)/);
  assert.match(reader, /function getB2CompletedUnits\(bookId\)/);
  const finishBody = reader.match(/function finishQuizChapter\(\) \{([\s\S]*?)\n\}/);
  assert.ok(finishBody);
  assert.match(finishBody[1], /getB2CompletionKey\(\)/);
  assert.doesNotMatch(finishBody[1], /readStats\[curBook\.id\]/);
});

test('quiz reader renders knowledge-point navigation and migrates old unit progress', () => {
  assert.match(reader, /function renderKnowledgePointNav\(points(?:, partId)?\)/);
  assert.match(reader, /function jumpToQuizExercise\(exerciseId\)/);
  assert.match(reader, /scrollIntoView/);
  assert.match(reader, /russian_b2:p2-q001-q010/);
  assert.match(reader, /russian_b2:p2/);
});

test('P2 distinguishes its available study card from exercise-only navigation', () => {
  assert.match(reader, /b2-knowledge-study-card/);
  assert.match(reader, /打开学习卡/);
  assert.match(reader, /对应练习导航/);
});

test('quiz supports single-click answers and retry history', () => {
  assert.match(reader, /function getQuizSettings\(\)/);
  assert.match(reader, /function submitQuizOption\(questionId, key\)/);
  assert.match(reader, /everWrong/);
  assert.match(reader, /function restartQuiz\(mode/);
});

test('reader provides a B2 wrong-answer book', () => {
  assert.match(reader, /function getWrongAnswerItems\(\)/);
  assert.match(reader, /function showWrongAnswerBook\(partFilter, pointFilter\)/);
  assert.match(reader, /function openWrongAnswerItem\(partId, exerciseId\)/);
  assert.match(reader, /var pendingQuizJumpId = '';/);
  assert.match(reader, /pendingQuizJumpId = exerciseId;/);
  assert.match(reader, /jumpToQuizExercise\(pendingJump\)/);
});

test('retrying a subset cannot mark the whole part complete', () => {
  const finishBody = reader.match(/function finishQuizChapter\(\) \{([\s\S]*?)\n\}/);
  assert.ok(finishBody);
  assert.match(finishBody[1], /currentQuizAllExercises/);
});

test('reader provides a source-labelled study card without duplicating answer analysis', () => {
  assert.match(reader, /function showStudyCard\(partId, pointId\)/);
  assert.match(reader, /function renderStudyCard\(card, point\)/);
  assert.match(reader, /function getStudyCardProgress\(partId, exerciseIds\)/);
  assert.match(reader, /function openStudyCardPractice\(partId, exerciseIds, wrongOnly\)/);
  assert.match(reader, /study-cards\//);
  const cardBody = reader.match(/function renderStudyCard\(card, point\) \{([\s\S]*?)\n\}/);
  assert.ok(cardBody);
  assert.doesNotMatch(cardBody[1], /sourceAnswer|sourceExplanation|referenceExplanation/);
});

test('reader renders the layered rich P2 card with anchored lessons and checks', () => {
  assert.match(reader, /function renderStudyQuickLayer\(card\)/);
  assert.match(reader, /function renderStudyLessons\(card\)/);
  assert.match(reader, /function renderStudyLesson\(lesson, index\)/);
  assert.match(reader, /function renderStudySourceDisclosure\(source\)/);
  assert.match(reader, /function renderStudyAnchorNav\(card\)/);
  assert.match(reader, /b2-study-quick/);
  assert.match(reader, /b2-study-lesson/);
  assert.match(reader, /b2-study-case-change/);
  assert.match(reader, /b2-study-source-disclosure/);
  assert.match(reader, /id=\"study-lesson-/);
  const cardBody = reader.match(/function renderStudyCard\(card, point\) \{([\s\S]*?)\n\}/);
  assert.ok(cardBody);
  assert.doesNotMatch(cardBody[1], /sourceAnswer|referenceExplanation|correctOption/);
});

test('reader stores study-card self-test mastery separately from B2 wrong answers', () => {
  assert.match(reader, /STUDY_CARD_PROGRESS_KEY/);
  assert.match(reader, /russian_b2_study_card_progress_v1/);
  assert.match(reader, /function loadStudyCardProgress\(\)/);
  assert.match(reader, /function saveStudyCardProgress\(progress\)/);
  assert.match(reader, /function recordStudyCardAttempt\(cardId, result\)/);
  assert.match(reader, /function renderStudyChecks\(card\)/);
  assert.match(reader, /function renderStudyCheck\(check, index\)/);
  assert.match(reader, /function answerStudyCheck\(cardId, checkId, selectedValue\)/);
  assert.match(reader, /再做本卡自测/);
  const progressBody = reader.match(/function recordStudyCardAttempt\(cardId, result\) \{([\s\S]*?)\n\}/);
  assert.ok(progressBody);
  assert.doesNotMatch(progressBody[1], /getB2Progress|everWrong|wrongAnswerBook/);
});
