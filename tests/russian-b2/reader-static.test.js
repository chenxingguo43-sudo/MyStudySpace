const fs = require('node:fs');
const test = require('node:test');
const assert = require('node:assert/strict');

const reader = fs.readFileSync('reader.html', 'utf8');

test('reader resolves textbook paths from metadata instead of a B2-specific branch', () => {
  assert.match(reader, /function getBookDataDir\(bookId\)/);
  assert.doesNotMatch(reader, /bookId === 'russian_b2'/);
  assert.match(reader, /data\/textbook/);
});

test('reader plays reconstructed listening media with captions while retaining provenance', () => {
  assert.match(reader, /function renderListeningPractice\(data, scrollPosition\)/);
  assert.match(reader, /<audio controls>/);
  assert.match(reader, /kind="subtitles"/);
  assert.match(reader, /data\.media\.provenance/);
});

test('listening opens in exam mode and keeps transcript behind an intensive-listening action', () => {
  assert.match(reader, /LISTENING_PROGRESS_KEY/);
  assert.match(reader, /function answerListeningQuestion\(questionId, selected\)/);
  assert.match(reader, /function toggleListeningAnswer\(questionId\)/);
  assert.match(reader, /function openListeningIntensive\(\)/);
  assert.match(reader, /精听这段材料/);
  assert.match(reader, /\(data\.questions \|\| \[\]\)\.map\(renderListeningQuestion\)/);
  const renderBody = reader.match(/function renderListeningPractice\(data, scrollPosition\) \{([\s\S]*?)\n\}/);
  assert.ok(renderBody);
  assert.match(renderBody[1], /listeningViewMode === 'intensive'/);
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

test('knowledge-point navigation uses generated study-card IDs instead of a P2 hardcode', () => {
  assert.match(reader, /b2-knowledge-study-card/);
  assert.match(reader, /打开学习卡/);
  assert.match(reader, /对应练习导航/);
  assert.match(reader, /point\.studyCardId/);
  assert.doesNotMatch(reader, /partId === 'p2' && point\.id === 'p2-time-cause'/);
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

test('reader renders retained P6 source materials before their linked question ranges', () => {
  assert.match(reader, /function renderQuizContextGroups\(groups\)/);
  assert.match(reader, /group\.materials/);
  assert.match(reader, /contextGroupByExercise/);
  assert.match(reader, /renderQuizContextGroup\(contextGroupByExercise\[exercise\.id\]\)/);
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

test('reader gives reading practice its own answer-reveal flow', () => {
  assert.match(reader, /function renderReadingPracticeChapter\(data(?:, scrollPosition)?\)/);
  assert.match(reader, /function answerReadingQuestion\(questionId, selected\)/);
  assert.match(reader, /function toggleReadingAnswer\(questionId\)/);
  assert.match(reader, /reading-practice/);
  const answerBody = reader.match(/function answerReadingQuestion\(questionId, selected\) \{([\s\S]*?)\n\}/);
  assert.ok(answerBody);
  assert.doesNotMatch(answerBody[1], /toggleReadingAnswer\(/);
});

test('mock exams separate answer controls from lookup after an assisted unlock', () => {
  assert.match(reader, /function renderExamLookupOption/);
  assert.match(reader, /dictionaryController\.setExamPolicy\(\{ mode: 'exam'/);
  assert.match(reader, /lookupAssisted !== true/);
});

test('reading interactions preserve scroll position and display source pages', () => {
  assert.match(reader, /function rerenderReadingPracticePreservingScroll\(\)/);
  const answerBody = reader.match(/function answerReadingQuestion\(questionId, selected\) \{([\s\S]*?)\n\}/);
  const revealBody = reader.match(/function toggleReadingAnswer\(questionId\) \{([\s\S]*?)\n\}/);
  assert.ok(answerBody && revealBody);
  assert.match(answerBody[1], /rerenderReadingPracticePreservingScroll\(\)/);
  assert.match(revealBody[1], /rerenderReadingPracticePreservingScroll\(\)/);
  assert.match(reader, /data\.sourcePages/);
  assert.match(reader, /原书原文页/);
});

test('textbook chapter titles come from metadata beyond quiz-first chapters', () => {
  assert.match(reader, /curBook\.chapterTitles \? curBook\.chapterTitles\[i\]/);
  assert.doesNotMatch(reader, /isQuizFirstBook\(curBook\) && curBook\.chapterTitles/);
});

test('reader provides a locally persisted writing workbench without browser-held credentials', () => {
  assert.match(reader, /function renderWritingWorkbench\(data(?:, scrollPosition)?\)/);
  assert.match(reader, /function saveWritingDraft\(taskId, value\)/);
  assert.match(reader, /russian_b2_writing_drafts_v1/);
  assert.match(reader, /function copyWritingFeedbackPrompt\(taskId\)/);
  assert.match(reader, /writing-workbench/);
  assert.doesNotMatch(reader, /OPENAI_API_KEY/);
});

test('writing workbench reproduces structured source materials before learning support', () => {
  assert.match(reader, /function renderWritingMaterial\(material, taskId, index\)/);
  assert.match(reader, /data\.task\.instructionsRu/);
  assert.match(reader, /data\.materials/);
  assert.match(reader, /data\.rubric/);
  assert.match(reader, /support\.usefulPatterns/);
  assert.match(reader, /原书材料/);
  assert.match(reader, /评分自查/);
});

test('writing workbench keeps immutable draft versions and records model unlocks', () => {
  assert.match(reader, /russian_b2_writing_versions_v1/);
  assert.match(reader, /function saveWritingVersion/);
  assert.match(reader, /function restoreWritingVersion/);
  assert.match(reader, /保存当前版本/);
  assert.match(reader, /function recordWritingModelUnlock/);
});

test('writing workbench omits unavailable time limits instead of showing dash-minute badges', () => {
  assert.match(reader, /function renderWritingMetadata/);
  assert.match(reader, /if \(task\.readingMinutes\)/);
  assert.match(reader, /if \(task\.writingMinutes\)/);
});

test('unified B2 modules use module-scoped chapter cache keys', () => {
  assert.match(reader, /function getChapterCacheBookId\(book\)/);
  assert.match(reader, /book\.id \+ ':' \+ book\.moduleId/);
  const chapterBody = reader.match(/function goChapter\(idx(?:, restoreState)?\) \{([\s\S]*?)\n\}/);
  assert.ok(chapterBody);
  assert.match(chapterBody[1], /cacheGet\(cacheBookId, idx\)/);
  assert.match(chapterBody[1], /cachePut\(cacheBookId, idx, data\)/);
  const fetchBody = reader.match(/function fetchChapter\(bookId, idx\) \{([\s\S]*?)\n\}/);
  assert.ok(fetchBody);
  assert.match(fetchBody[1], /book\.isB2Module/);
  assert.match(fetchBody[1], /dataDir \+ '\/' \+ directory/);
});

test('interactive B2 workbenches are never marked complete merely by scrolling', () => {
  assert.match(reader, /function shouldUseScrollCompletion\(\)/);
  assert.match(reader, /reading-practice/);
  assert.match(reader, /writing-workbench/);
  assert.match(reader, /curBook\.format !== 'speaking-practice'/);
  assert.match(reader, /curBook\.format !== 'listening-practice'/);
  assert.match(reader, /if \(!shouldUseScrollCompletion\(\)\) return;/);
});

test('reader gives source-indexed exam chapters a distinct, non-fabricated exam view', () => {
  assert.match(reader, /data\.format === 'exam-practice'/);
  assert.match(reader, /renderExamPracticeChapter/);
  assert.match(reader, /source-indexed/);
});

test('reader gives source-verified exam questions their own answer and progress flow', () => {
  assert.match(reader, /EXAM_PROGRESS_KEY/);
  assert.match(reader, /russian_b2_exam_progress_v1/);
  assert.match(reader, /function answerExamQuestion\(questionId, selected\)/);
  assert.match(reader, /function toggleExamAnswer\(questionId\)/);
  assert.match(reader, /source-verified/);
  assert.match(reader, /data\.questions/);
});

test('reader gives source-verified exam writing tasks local drafts without browser credentials', () => {
  assert.match(reader, /EXAM_WRITING_DRAFTS_KEY/);
  assert.match(reader, /russian_b2_exam_writing_drafts_v1/);
  assert.match(reader, /function saveExamWritingDraft\(taskId, value\)/);
  assert.match(reader, /function renderExamWritingTask\(task\)/);
  assert.doesNotMatch(reader, /exam.*OPENAI_API_KEY/i);
});

test('reader exposes a scoped B2 archive export and merge-only import flow', () => {
  assert.match(reader, /js\/russian-b2\/dashboard\.js/);
  assert.match(reader, /function exportB2LearningArchive\(\)/);
  assert.match(reader, /function importB2LearningArchive\(event\)/);
  assert.match(reader, /RussianB2Dashboard\.createArchive/);
  assert.match(reader, /RussianB2Dashboard\.validateArchive/);
  assert.match(reader, /RussianB2Dashboard\.mergeArchive/);
  assert.match(reader, /学习记录备份/);
});

test('B2 last-read stores an update time and manual completion never infers completion from drafts', () => {
  assert.match(reader, /updatedAt:\s*new Date\(\)\.toISOString\(\)/);
  assert.match(reader, /var WRITING_COMPLETED_KEY = 'russian_b2_writing_completed_v1'/);
  assert.match(reader, /var SPEAKING_COMPLETED_KEY = 'russian_b2_speaking_completed_v1'/);
  assert.match(reader, /var EXAM_COMPLETED_KEY = 'russian_b2_exam_completed_v1'/);
  assert.match(reader, /function toggleManualCompletion\(storageKey, taskId\)/);
  assert.match(reader, /标记完成/);
  assert.doesNotMatch(reader, /value\.trim\(\).*completed/);

  const writingBody = reader.match(/function renderWritingWorkbench\(data, scrollPosition\) \{([\s\S]*?)\n\}/);
  const speakingBody = reader.match(/function renderSpeakingPractice\(data, scrollPosition\) \{([\s\S]*?)\n\}/);
  const examWritingBody = reader.match(/function renderExamWritingTask\(task\) \{([\s\S]*?)\n\}/);
  assert.ok(writingBody && speakingBody && examWritingBody);
  assert.match(reader, /function renderManualCompletionButton\(storageKey, taskId\)[\s\S]*?toggleManualCompletion/);
  assert.match(writingBody[1], /renderManualCompletionButton\(WRITING_COMPLETED_KEY,/);
  assert.match(speakingBody[1], /renderManualCompletionButton\(SPEAKING_COMPLETED_KEY,/);
  assert.match(examWritingBody[1], /renderManualCompletionButton\(EXAM_COMPLETED_KEY,/);
});

test('dashboard loaders use current chapter JSON as the only progress denominator', () => {
  assert.match(reader, /function loadB2DashboardInventories\(manifest\)/);
  assert.match(reader, /RussianB2Dashboard\.chapterInventory/);
  assert.match(reader, /RussianB2Dashboard\.getDashboardChapterPaths/);
  assert.match(reader, /module\.id === 'grammar'/);
  assert.match(reader, /function continueB2Learning\(\)/);
  assert.match(reader, /restoreLastRead\(lastRead\)/);
});

test('B2 continuation persists and forwards active question, listening mode, and scroll restore state', () => {
  const saveBody = reader.match(/function saveLastRead\([^)]*\) \{([\s\S]*?)\n\}/);
  const restoreBody = reader.match(/function restoreLastRead\(lastRead\) \{([\s\S]*?)\n\}/);
  assert.ok(saveBody && restoreBody);
  assert.match(saveBody[1], /activeQuestionId/);
  assert.match(saveBody[1], /viewMode/);
  assert.match(restoreBody[1], /goChapter\(lastRead\.chapter, lastRead\)/);
  assert.match(reader, /function goChapter\(idx, restoreState\)/);
  assert.match(reader, /function renderChapter\(data, restoreState\)/);
  assert.match(reader, /pendingQuizJumpId = restoreState\.activeQuestionId/);
  assert.match(reader, /renderListeningPractice\(data, scrollPosition, restoreState\)/);
  assert.match(reader, /function restorePendingQuizQuestion\(pendingJump, restoreState\)/);
  assert.match(reader, /restorePendingQuizQuestion\(pendingJump, arguments\[2\]\)/);
});

test('saved grammar scroll suppresses the async question jump while a question-only restore still jumps', () => {
  const helper = reader.match(/function restorePendingQuizQuestion\(pendingJump, restoreState\) \{([\s\S]*?)\n\}/);
  assert.ok(helper);

  function createHarness() {
    const scheduled = [], jumped = [];
    const build = new Function('setTimeout', 'jumpToQuizExercise', helper[0] + '\nreturn restorePendingQuizQuestion;');
    return {
      scheduled,
      jumped,
      restore: build(callback => scheduled.push(callback), questionId => jumped.push(questionId))
    };
  }

  const exactScroll = createHarness();
  const scheduledWithScroll = exactScroll.restore('P3-Q017', { activeQuestionId: 'P3-Q017', scroll: 640 });
  exactScroll.scheduled.forEach(callback => callback());
  assert.equal(scheduledWithScroll, false);
  assert.deepEqual(exactScroll.jumped, []);

  const questionOnly = createHarness();
  const scheduledWithoutScroll = questionOnly.restore('P3-Q017', { activeQuestionId: 'P3-Q017' });
  assert.equal(scheduledWithoutScroll, true);
  assert.equal(questionOnly.scheduled.length, 1);
  questionOnly.scheduled[0]();
  assert.deepEqual(questionOnly.jumped, ['P3-Q017']);
});

test('reader renders approved reading learning support separately from original questions', () => {
  assert.match(reader, /function renderReadingLearningSupport\(data\)/);
  assert.match(reader, /学习辅助·逐段译文/);
  assert.match(reader, /学习辅助·文章结构/);
  assert.match(reader, /学习辅助·可复用表达/);
  assert.match(reader, /data\.translationStatus === 'learning-support-approved'/);
});
