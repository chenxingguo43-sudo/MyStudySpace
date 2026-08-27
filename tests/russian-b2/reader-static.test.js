const fs = require('node:fs');
const test = require('node:test');
const assert = require('node:assert/strict');

const reader = fs.readFileSync('reader.html', 'utf8');
const readerRuntime = fs.readFileSync('js/reader-runtime.js', 'utf8');
const dictionaryRuntime = fs.readFileSync('js/russian-dictionary/runtime.js', 'utf8');

test('reader theme changes preserve Reader state and expose view metadata', () => {
  assert.doesNotMatch(reader, /document\.body\.className\s*=/);
  assert.match(reader, /body\.classList\.add\('theme-' \+ state\.theme/);
  assert.match(reader, /function syncReaderShellState\(\)/);
  assert.match(reader, /root\.dataset\.readerTheme\s*=\s*'white-night'/);
  assert.match(reader, /root\.dataset\.readingTheme\s*=\s*state\.theme/);
  assert.match(reader, /readerLayout\.classList\.contains\('rs-practice-mode'\)/);
  assert.match(reader, /root\.dataset\.readerView\s*=\s*resolveReaderShellView\(\)/);
  assert.match(reader, /curView = 'chapters'; curCh = -1; stopTimer\(\); syncReaderShellState\(\)/);
});

test('reader keeps its own navigation and shared dictionary states without an APP shell', () => {
  assert.doesNotMatch(reader, /AppShell|app-shell|app-runtime|app-home|profile\.html|data-reader-android-style/);
  assert.match(reader, /Reader 工具/);
  assert.match(reader, /reader-shelf-view/);
  assert.match(reader, /reader-chapters-view/);
  assert.match(reader, /reader-reading-layout/);
  assert.match(reader, /reader-reading-header/);
  assert.match(reader, /data-dictionary-state="closed"/);
  assert.match(reader, /setPanelState\('closed'\)/);
  assert.match(dictionaryRuntime, /setPanelState\('half'\)/);
  assert.match(dictionaryRuntime, /\['closed', 'half', 'full'\]/);
});

test('Reader retains every study workbench after APP removal', () => {
  assert.match(reader, /reader-workbench-index/);
  assert.match(reader, /reader-workbench--quiz/);
  assert.match(reader, /reader-workbench--reading-practice/);
  assert.match(reader, /reader-workbench--writing/);
  assert.match(reader, /reader-workbench--speaking/);
  assert.match(reader, /reader-workbench--listening/);
  assert.match(reader, /reader-workbench--exam/);
  assert.match(reader, /reader-workbench--writing-speaking/);
  assert.match(reader, /reader-workbench--reading-speaking/);
  assert.match(reader, /reader-workbench--knowledge/);
  assert.match(reader, /reader-workbench--review/);
  assert.match(reader, /reader-workbench--archive/);
});

test('Reader workbenches keep functional boundaries', () => {
  assert.match(reader, /function renderB2Dashboard[\s\S]*?completePrompt[\s\S]*?classList\.remove\('visible'\)/);

  const listeningStart = reader.indexOf('function renderListeningPractice(data, scrollPosition)');
  const listeningEnd = reader.indexOf('var EXAM_PROGRESS_KEY', listeningStart);
  const listeningRenderer = reader.slice(listeningStart, listeningEnd);
  assert.match(listeningRenderer, /RussianListeningWorkbench\.init/);
  assert.match(listeningRenderer, /data-timeline-ready="loading"/);
  assert.match(listeningRenderer, /listeningViewMode === 'intensive'/);

  const writingSpeakingStart = reader.indexOf('function renderWritingSpeakingChapter(data, scrollPosition, restoreState)');
  const writingSpeakingEnd = reader.indexOf('function getReadingSpeakingLayoutMode()', writingSpeakingStart);
  const writingSpeakingRenderer = reader.slice(writingSpeakingStart, writingSpeakingEnd);
  assert.doesNotMatch(writingSpeakingRenderer, /<textarea/);
  assert.doesNotMatch(writingSpeakingRenderer, /setInterval\(|writing-timer|ws-timer/);
});

test('reader resolves textbook paths from metadata instead of a B2-specific branch', () => {
  assert.match(reader, /function getBookDataDir\(bookId\)/);
  assert.doesNotMatch(reader, /bookId === 'russian_b2'/);
  assert.match(reader, /data\/textbook/);
});

test('reader loads the native listening workbench with captions and provenance', () => {
  assert.match(reader, /function renderListeningPractice\(data, scrollPosition\)/);
  assert.match(reader, /id=\"lwAudio\"/);
  assert.match(reader, /kind="subtitles"/);
  assert.match(reader, /data\.media\.provenance/);
  assert.match(reader, /js\/russian-b2\/listening-session\.js/);
  assert.match(reader, /js\/russian-b2\/listening-workbench\.js/);
  assert.match(reader, /css\/reader-listening-workbench\.css/);
});

test('listening uses exam intensive and review modes with whole-group submission', () => {
  assert.match(reader, /LISTENING_PROGRESS_KEY/);
  assert.match(reader, /function answerListeningQuestion\(questionId, selected\)/);
  assert.match(reader, /function submitListeningAttempt\(\)/);
  assert.match(reader, /function openListeningIntensive\(\)/);
  assert.match(reader, /function renderListeningReview\(data\)/);
  assert.match(reader, /整组提交前不显示对错/);
  assert.match(reader, /data\.transcriptSegments \|\| \[\]/);
  const renderBody = reader.match(/function renderListeningPractice\(data, scrollPosition\) \{([\s\S]*?)\n\}/);
  assert.ok(renderBody);
  assert.match(renderBody[1], /listeningViewMode === 'intensive'/);
  assert.match(renderBody[1], /listeningViewMode === 'review'/);
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

test('explicit B2 root links open the dashboard instead of rendering raw chapter data', () => {
  const startupStart = reader.indexOf('if (_jumpBook) {');
  const startupEnd = reader.indexOf('} else if (lr && lr.bookId', startupStart);
  const startup = reader.slice(startupStart, startupEnd);
  assert.match(startup, /target\.format === 'b2-full'/);
  assert.match(startup, /showB2Dashboard\(\)/);
  assert.match(startup, /else goChapter\(chIdx\)/);
});

test('quiz shows verified source explanations inline and completion is not scroll-triggered', () => {
  assert.match(reader, /原书解析（已核对）/);
  assert.match(reader, /exercise\.sourceExplanation/);
  assert.doesNotMatch(reader, /function renderSourceViewer\(/);
  assert.doesNotMatch(reader, /function openQuizSourceViewer\(/);
  assert.doesNotMatch(reader, /查看原书页/);
  assert.match(reader, /function finishQuizChapter\(\)/);
  // 滚动不自动完成：scroll 回调里不再有 chDone = true
  assert.match(reader, /function markChapterDone\(\)/);
  assert.match(reader, /onclick="markChapterDone\(\)"/);
  var scrollCb = reader.match(/addEventListener\('scroll'[\s\S]*?\n\}, \{ passive: true \}\)/);
  assert.ok(scrollCb);
  assert.doesNotMatch(scrollCb[0], /chDone\s*=\s*true/);
});

test('quiz interactions update only the active question without resetting the reader', () => {
  assert.match(reader, /function refreshQuizQuestion\(questionId, exercise, record\)/);
  const selectBody = reader.match(/function selectQuizOption\(questionId, key\) \{([\s\S]*?)\n\}/);
  const submitBody = reader.match(/function submitQuizQuestion\(questionId\) \{([\s\S]*?)\n\}/);
  const explanationBody = reader.match(/function toggleQuizExplanation\(questionId\) \{([\s\S]*?)\n\}/);
  assert.ok(selectBody && submitBody && explanationBody);
  assert.match(selectBody[1], /refreshQuizQuestion\(/);
  assert.match(submitBody[1], /refreshQuizQuestion\(/);
  assert.match(explanationBody[1], /panel\.innerHTML = renderQuizExplanation\(exercise\)/);
  assert.match(explanationBody[1], /panel\.hidden = false/);
  assert.match(explanationBody[1], /panel\.innerHTML = ''/);
  assert.doesNotMatch(selectBody[1], /renderQuizChapter\(/);
  assert.doesNotMatch(submitBody[1], /renderQuizChapter\(/);
  assert.doesNotMatch(explanationBody[1], /renderQuizChapter\(/);
});

test('listening answer selection updates only the selected question instead of rerendering the page', () => {
  const start = reader.indexOf('function answerListeningQuestion(questionId, selected)');
  const end = reader.indexOf('function toggleListeningAnswer', start);
  const body = reader.slice(start, end);
  assert.match(body, /updateListeningQuestionSelection\(questionId, selected\)/);
  assert.doesNotMatch(body, /rerenderListeningPreservingScroll\(\)/);
  assert.match(reader, /id="lwExamAnswered"/);
  assert.match(reader, /本音频未覆盖/);
});

test('listening evidence can present multiple independently playable source lines', () => {
  assert.match(reader, /function getListeningEvidenceItems\(evidence\)/);
  assert.match(reader, /lw-evidence-part-block/);
  assert.match(reader, /evidenceItems\.map/);
  assert.match(reader, /RussianListeningWorkbench\.focusEvidence/);
});

test('listening review displays the answer reasoning beside its playable source evidence', () => {
  assert.match(reader, /lw-evidence-reasoning/);
  assert.match(reader, /判断：/);
});

test('quiz explanations are rendered lazily and toggled without replacing the question', () => {
  const itemBody = reader.match(/function renderQuizItem\(exercise, record\) \{([\s\S]*?)\n\}/);
  const explanationBody = reader.match(/function toggleQuizExplanation\(questionId\) \{([\s\S]*?)\n\}/);
  assert.ok(itemBody && explanationBody);
  assert.match(itemBody[1], /record\.explanationOpen \? renderQuizExplanation\(exercise\) : ''/);
  assert.match(itemBody[1], /aria-expanded=/);
  assert.match(explanationBody[1], /item\.querySelector\('\.b2-explanation'\)/);
  assert.doesNotMatch(explanationBody[1], /target\.outerHTML/);
});

test('Zlatoust quiz chapters use a bounded virtual window without changing B2 module rendering', () => {
  assert.match(reader, /var ZLATOUST_VIRTUAL_MINIMUM_ITEMS = 20/);
  assert.match(reader, /function getZlatoustVirtualRange\(state, scrollTop\)/);
  assert.match(reader, /function renderZlatoustVirtualWindow\(state, range, preserveAnchor\)/);
  assert.match(reader, /function initializeZlatoustVirtualQuiz\(exercises, contextGroups, initialExerciseId\)/);
  assert.match(reader, /data-zlatoust-virtual-spacer="top"/);
  assert.match(reader, /data-zlatoust-virtual-items/);
  assert.match(reader, /ResizeObserver/);
  assert.match(reader, /requestAnimationFrame/);
  assert.match(reader, /ensureZlatoustVirtualExercise\(exerciseId, 'smooth'\)/);
  assert.match(reader, /scheduleZlatoustVirtualWindow\(\)/);
  assert.doesNotMatch(reader, /function renderZlatoustQuizPager\(/);
  assert.match(reader, /quizRestoreState = \{ activeQuestionId: initialZlatoustVirtualExerciseId \|\| currentQuizExercises\[0\]\.id, scroll: 0 \}/);
  assert.match(reader, /isWorldPeopleBook\(curBook\) && activeQuestionId\) record\.activeQuestionId = activeQuestionId/);
  const renderBody = reader.match(/function renderQuizChapter\(data, scrollPosition\) \{([\s\S]*?)\n\}/);
  assert.ok(renderBody);
  assert.match(renderBody[1], /isZlatoustGrammarBook\(curBook\)\) initializeZlatoustVirtualQuiz/);
  assert.doesNotMatch(renderBody[1], /zlatoust-quiz-pager/);
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

test('quiz supports two-click answers (select then confirm) and retry history', () => {
  assert.match(reader, /function getQuizSettings\(\)/);
  assert.match(reader, /function submitQuizOption\(questionId,\s*key/);
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
  assert.match(reader, /function answerReadingQuestion\(questionId,\s*selected,\s*evt/);
  assert.match(reader, /function toggleReadingAnswer\(questionId\)/);
  assert.match(reader, /reading-practice/);
  const answerBody = reader.match(/function answerReadingQuestion\(questionId,\s*selected,\s*evt[\s\S]*?\) \{([\s\S]*?)\n\}/);
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
  const answerBody = reader.match(/function answerReadingQuestion\(questionId,\s*selected,\s*evt[\s\S]*?\) \{([\s\S]*?)\n\}/);
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
  assert.match(fetchBody[1], /readerRuntime\.loadChapter\(book, idx\)/);
  assert.match(readerRuntime, /book\.isB2Module/);
  assert.match(readerRuntime, /const staticUrl = `\$\{dataRoot\}\/\$\{directory\}/);
});

test('last-read state preserves and restores the B2 module route', () => {
  const saveStart = reader.indexOf('function saveLastRead()');
  const saveEnd = reader.indexOf('\n}', saveStart);
  const saveBody = reader.slice(saveStart, saveEnd);
  assert.match(saveBody, /record\.moduleId\s*=\s*curBook\.moduleId/);
  assert.match(saveBody, /activeQuestionId/);
  assert.match(reader, /function restoreLastRead\(lastRead\)/);
  assert.match(reader, /lastRead\.moduleId\s*\|\|\s*'grammar'/);
  assert.match(reader, /function resumeModule\(index\)/);
  assert.match(reader, /catch\(function\(\) \{ resumeModule\(\{\}\); \}\)/);
  assert.match(reader, /restoreLastRead\(lr\)/);
});

test('B2 quiz and study-card pages use one navigation system', () => {
  const quizStart = reader.indexOf('function renderQuizChapter(data, scrollPosition)');
  const quizEnd = reader.indexOf('var READING_PROGRESS_KEY', quizStart);
  const quizBody = reader.slice(quizStart, quizEnd);
  assert.doesNotMatch(quizBody, /onclick="showShelf\(\)"[^>]*>← 书架/);

  const cardStart = reader.indexOf('function renderStudyCard(card, point)');
  const cardEnd = reader.indexOf('function showStudyCard', cardStart);
  const cardBody = reader.slice(cardStart, cardEnd);
  assert.doesNotMatch(cardBody, /onclick="goChapter\([^)]*\)"[^>]*>← 返回/);
});

test('interactive B2 workbenches are never marked complete merely by scrolling', () => {
  assert.match(reader, /function shouldUseScrollCompletion\(\)/);
  assert.match(reader, /reading-practice/);
  assert.match(reader, /writing-workbench/);
  assert.match(reader, /curBook\.format !== 'speaking-practice'/);
  assert.match(reader, /curBook\.format !== 'listening-practice'/);
  assert.match(reader, /!shouldUseScrollCompletion\(\)\)/);
  assert.match(reader, /completePrompt.*classList\.remove\('visible'\)/);
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

test('saved grammar scroll no longer suppresses the question jump — activeQuestionId always wins', () => {
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

  // 有 scroll 也跳（之前会跳过，现在统一跳）
  const withScroll = createHarness();
  const scheduledWithScroll = withScroll.restore('P3-Q017', { activeQuestionId: 'P3-Q017', scroll: 640 });
  withScroll.scheduled.forEach(callback => callback());
  assert.equal(scheduledWithScroll, true);
  assert.deepEqual(withScroll.jumped, ['P3-Q017']);

  // 无 scroll 当然也跳
  const questionOnly = createHarness();
  const scheduledWithoutScroll = questionOnly.restore('P3-Q017', { activeQuestionId: 'P3-Q017' });
  assert.equal(scheduledWithoutScroll, true);
  assert.equal(questionOnly.scheduled.length, 1);
  questionOnly.scheduled[0]();
  assert.deepEqual(questionOnly.jumped, ['P3-Q017']);
});

test('reader renders approved reading learning support separately from original questions', () => {
  assert.match(reader, /function renderReadingLearningSupport\(data\)/);
  assert.match(reader, /点击段落展开译文/);
  assert.match(reader, /文章结构/);
  assert.match(reader, /可复用表达/);
  assert.match(reader, /data\.translationStatus === 'learning-support-approved'/);
});

test('reading-speaking question stems and options both support dictionary lookup', () => {
  const renderBody = reader.match(/function renderReadingSpeakingExercise\(ex\) \{([\s\S]*?)\n\}/);
  assert.ok(renderBody);
  assert.match(renderBody[1], /exId \+ '-question'/);
  assert.match(renderBody[1], /'quiz-question'/);
  assert.match(renderBody[1], /renderRuText\(questionText, lookupContextWithSentence/);
  assert.match(renderBody[1], /renderRuText\(textPart, lookupContextWithSentence/);
  assert.match(renderBody[1], /'quiz-option', textPart, optionZh/);
  assert.match(reader, /<b>中文翻译<\/b>/);
});

test('reading-speaking explanations can locate and distinctly highlight source sentences', () => {
  assert.match(reader, /function renderReadingSpeakingExplanationContent\(ex, exId\)/);
  assert.match(reader, /renderReadingSpeakingExplanationContent\(ex, exId\)/);
  assert.match(reader, /function locateReadingSpeakingSource\(exId, evt\)/);
  assert.match(reader, /rs-source-locate/);
  assert.match(reader, /width: auto/);
  assert.doesNotMatch(reader, /rs-source-locate-hint/);
  assert.match(reader, /rs-source-word-highlight/);
  assert.match(reader, /background: #fde68a !important/);
  assert.match(reader, /sourceAnchor\.paragraphIndex/);
  assert.match(reader, /scrollIntoView\(\{ behavior: 'smooth', block: 'center' \}\)/);
});

test('reader bypasses stale chapter JSON caches during active study-content updates', () => {
  assert.match(reader, /fetch\(url, \{ cache: 'no-store' \}\)/);
  assert.match(reader, /fetch\(staticUrl, \{ cache: 'no-store' \}\)/);
});

test('Zlatoust 1.4.1 uses a separate integrated learning page without duplicating official progress', () => {
  assert.match(reader, /ZLATOUST_LEARNING_PROGRESS_KEY = 'rr_zlatoust_learning_v1'/);
  assert.match(reader, /learning-pages\/.*section-/);
  assert.match(reader, /function renderZlatoustLearningPage\(page, unit, chapterIndex\)/);
  assert.match(reader, /function renderZlatoustLearningStage\(page, stage\)/);
  assert.match(reader, /renderQuizItem\(exercise, getQuizRecord\(exercise\.id\)\)/);
  assert.match(reader, /function returnToZlatoustRoute\(\)/);
  assert.match(reader, /goChapter\(target\.chapterIndex, \{ scroll: target\.scroll \|\| 0 \}\)/);
  assert.match(reader, /ZLATOUST_KNOWLEDGE_POINT_SECTIONS = \{[\s\S]*?'gl1:gl1-4-1': '1\.4\.1'/);
  assert.match(reader, /function renderZlatoustLearningRoute\(page\)/);
  assert.match(reader, /function renderZlatoustTransferTasks\(sectionId, tasks\)/);
  assert.match(reader, /zlatoust-time-gate/);
  assert.match(reader, /四条防误解提醒/);
  assert.match(reader, /data-zlatoust-learning-route/);
  assert.match(reader, /function getZlatoustLearningStageState\(sectionId, stage, finalStage\)/);
  assert.match(reader, /function toggleZlatoustStageReview\(sectionId, stageId, checked\)/);
  assert.match(reader, /zlatoust-unit-map-root/);
  assert.doesNotMatch(reader, /function renderZlatoustChapterMindMap\(/);
  assert.match(reader, /function renderZlatoustExternalReference\(source, fallbackConclusion\)/);
  assert.match(reader, /来源核验（可选，不影响学习）/);
  assert.match(reader, /外部资料原页（可选核验，无需阅读英文）/);
  assert.doesNotMatch(reader, /<i>vs<\/i>/);
});

test('Zlatoust quiz explanations load rule-unit option analysis and retain provenance boundaries', () => {
  assert.match(reader, /function buildZlatoustOptionAnalysisIndex\(state, units\)/);
  const chapterLoadBody = reader.match(/function loadZlatoustChapterTheory\(chapterIndex\) \{([\s\S]*?)\n\}/);
  assert.ok(chapterLoadBody);
  assert.match(chapterLoadBody[1], /sectionIds/);
  assert.match(chapterLoadBody[1], /loadZlatoustRuleUnit\(sectionId\)/);
  assert.match(chapterLoadBody[1], /buildZlatoustOptionAnalysisIndex\(state, units\)/);
  assert.match(reader, /function renderZlatoustQuizExplanation\(exercise\)/);
  assert.match(reader, /optionAnalysisByExercise\[exercise\.id\]/);
  assert.match(reader, /showZlatoustRuleUnit\(/);
  assert.match(reader, /以下理由由本项目依据所列原书规则整理，不是教材逐题原文解析。/);
  assert.match(reader, /这题仍待复核。原书答案已保留；规则边界或题目条件尚未完全确认。以下学习说明仅作辅助，不替代最终定论。/);
  assert.match(reader, /原书仅有练习。未找到独立的原书理论页，不要把推测性的规则伪装成教材解析。/);
  const quizExplanationStart = reader.indexOf('function renderQuizExplanation(exercise)');
  const aiPromptStart = reader.indexOf('function copyExerciseAiPrompt(exerciseId, kind)');
  const quizExplanationBody = reader.slice(quizExplanationStart, aiPromptStart);
  assert.match(quizExplanationBody, /isZlatoustGrammarBook\(curBook\)\) return renderZlatoustQuizExplanation/);
  assert.match(quizExplanationBody, /renderExerciseAiAction\(exercise\.id, 'exercise'\)/);
});

test('Zlatoust quiz keeps source provenance clear and ignores empty option placeholders', () => {
  const referenceBody = reader.match(/function renderZlatoustExerciseReference\(exercise\) \{([\s\S]*?)\n\}/);
  const explanationBody = reader.match(/function getZlatoustStaticExplanation\(exercise, state, answerKey\) \{([\s\S]*?)\n\}/);
  const quizBody = reader.match(/function renderQuizItem\(exercise, record\) \{([\s\S]*?)\n\}/);
  const promptBody = reader.match(/function buildReaderExerciseAiPrompt\(exercise, record, title\) \{([\s\S]*?)\n\}/);
  assert.ok(referenceBody && explanationBody && quizBody && promptBody);
  assert.match(referenceBody[1], /原书未提供逐题解析/);
  assert.match(referenceBody[1], /不是教材原文/);
  assert.match(explanationBody[1], /String\(option\.text \|\| ''\)\.trim\(\)/);
  assert.match(quizBody[1], /String\(exercise\.options\[i\]\.text \|\| ''\)\.trim\(\)/);
  assert.match(promptBody[1], /filter\(function\(option\)/);
});

test('reader keeps appended film listening exercises separate from exam and intensive timelines', () => {
  assert.match(reader, /片尾听辨/);
  assert.match(reader, /function hasVerifiedListeningMediaExercise\(data\)/);
  assert.match(reader, /sourceStatus === 'verified-cleaned-source'/);
  assert.match(reader, /function renderListeningMediaExercise\(data\)/);
  assert.match(reader, /hasVerifiedListeningMediaExercise\(data\) \? '<button class="lw-mode/);
  assert.match(reader, /transcriptSegments: \[\]/);
  assert.match(reader, /initialTime: isMediaExercise/);
  assert.match(reader, /教材片尾听辨练习/);
  assert.match(reader, /整段播放，不提供伪造的逐句跳转/);
});

test('Zlatoust 1.1 maps both original knowledge cards to one complete agreement learning page', () => {
  assert.match(reader, /'1\.1': \{ stageCount: 4, exerciseCount: 13 \}/);
  assert.match(reader, /'gl1:gl1-1-1': '1\.1'/);
  assert.match(reader, /'gl1:gl1-1-2': '1\.1'/);
});

test('Zlatoust 1.2 maps its quantity-agreement card to a five-axis learning page', () => {
  assert.match(reader, /'1\.2': \{ stageCount: 5, exerciseCount: 6 \}/);
  assert.match(reader, /'gl1:gl1-2': '1\.2'/);
});

test('Zlatoust 1.3 maps its full-and-short-adjective card to a five-axis learning page', () => {
  assert.match(reader, /'1\.3': \{ stageCount: 5, exerciseCount: 18 \}/);
  assert.match(reader, /'gl1:gl1-3': '1\.3'/);
});

test('Zlatoust 1.5 remains an explicitly supplementary review page and reuses its original exercises', () => {
  assert.match(reader, /'1\.5-review': \{ chapterId: 'gl1', stageCount: 4, exerciseCount: 19, pageKind: 'supplementary' \}/);
  assert.match(reader, /'gl1:gl1-5': '1\.5-review'/);
  assert.match(reader, /教辅综合页（不计入原书 32 个理论小节）/);
  assert.match(reader, /原书题面依据/);
});

test('Zlatoust 2.1 loads a five-stage source-table learning page', () => {
  assert.match(reader, /'2\.1': \{ stageCount: 5, exerciseCount: 22 \}/);
  assert.match(reader, /var chapterNumber = getZlatoustChapterIndex\(page\.chapterId\) \+ 1/);
  assert.match(reader, /原书题面依据/);
});

test('Zlatoust 2.3 loads a five-stage instrumental decision learning page', () => {
  assert.match(reader, /'2\.3': \{ stageCount: 5, exerciseCount: 12 \}/);
});

test('Zlatoust 2.4.1 loads its five-stage bare-attribute learning page', () => {
  assert.match(reader, /'2\.4\.1': \{ stageCount: 5, exerciseCount: 7 \}/);
});

test('Zlatoust 2.4.2 loads its five-stage prepositional-attribute learning page', () => {
  assert.match(reader, /'2\.4\.2': \{ stageCount: 5, exerciseCount: 15 \}/);
});

test('Zlatoust 2.4 loads its independent relationship-routing overview', () => {
  assert.match(reader, /'2\.4': \{ stageCount: 5, exerciseCount: 21 \}/);
});

test('Zlatoust 2.5 loads its five-stage time-relation decision learning page', () => {
  assert.match(reader, /'2\.5': \{ stageCount: 5, exerciseCount: 24 \}/);
});

test('Zlatoust 2.6 loads its five-stage spatial-question learning page', () => {
  assert.match(reader, /'2\.6': \{ stageCount: 5, exerciseCount: 17 \}/);
  assert.match(reader, /page\.timeGate \|\| page\.entryGate/);
});

test('Zlatoust 2.7 loads its five-stage causal-nature learning page', () => {
  assert.match(reader, /'2\.7': \{ stageCount: 5, exerciseCount: 15 \}/);
});

test('Zlatoust 2.8 loads its five-stage purpose-and-evidence learning page', () => {
  assert.match(reader, /'2\.8': \{ stageCount: 5, exerciseCount: 4 \}/);
});

test('Zlatoust 3.1 is configured as a five-stage gerund subject-routing page', () => {
  assert.match(reader, /'3\.1': \{ stageCount: 5, exerciseCount: 35 \}/);
  assert.match(reader, /'3\.1\.1': \{ stageCount: 5, exerciseCount: 35 \}/);
  assert.match(reader, /'3\.1\.2': \{ stageCount: 5, exerciseCount: 0 \}/);
  assert.match(reader, /function renderZlatoustLearningMindMap\(page\)/);
});

test('Zlatoust 4.1 is configured as a five-stage clause-relation learning page', () => {
  assert.match(reader, /'4\.1': \{ stageCount: 5, exerciseCount: 24 \}/);
  assert.match(reader, /renderZlatoustLearningMindMap\(page\)/);
});

test('Zlatoust Chapter 5 routes all remaining theory cards to source-traceable learning pages', () => {
  assert.match(reader, /'5\.1': \{ stageCount: 4, exerciseCount: 22 \}/);
  assert.match(reader, /'5\.2': \{ stageCount: 4, exerciseCount: 23 \}/);
  assert.match(reader, /'5\.lexical': \{ stageCount: 5, exerciseCount: 30 \}/);
  const root = require('node:path').join(__dirname, '..', '..', 'data', 'textbook', 'zlatoust_grammar', 'theory', 'learning-pages', 'gl5');
  for (const file of ['section-5.1.json', 'section-5.2.json', 'section-5.lexical.json']) {
    const page = JSON.parse(fs.readFileSync(require('node:path').join(root, file), 'utf8'));
    assert.equal(page.reviewStatus, 'needs-review');
    assert.ok(page.entryGate && page.decisionAxes.length === page.stages.length);
    assert.ok(page.stages.every(stage => stage.checks.length >= 2 && stage.sourceExamples.length >= 2));
  }
});

test('Zlatoust 4.2 is configured as a five-stage relative-word learning page', () => {
  assert.match(reader, /'4\.2': \{ stageCount: 5, exerciseCount: 13 \}/);
});

test('Zlatoust 4.3 and 4.4 configure time and раз learning pages without invented formal practice', () => {
  assert.match(reader, /'4\.3': \{ stageCount: 5, exerciseCount: 2 \}/);
  assert.match(reader, /'4\.4': \{ stageCount: 5, exerciseCount: 0 \}/);
});

test('Zlatoust 1.4.2 is configured as its own negation learning page', () => {
  assert.match(reader, /'1\.4\.2': \{ stageCount: 3, exerciseCount: 3 \}/);
  assert.match(reader, /'gl1:gl1-4-2': '1\.4\.2'/);
  assert.match(reader, /function renderZlatoustLearningMindMap\(page\)/);
});

test('Zlatoust 1.4.3 is configured with two independent infinitive decision axes', () => {
  assert.match(reader, /'1\.4\.3': \{ stageCount: 4, exerciseCount: 6 \}/);
  assert.match(reader, /'gl1:gl1-4-3': '1\.4\.3'/);
  assert.match(reader, /zlatoust-unit-map-axes-2/);
});

test('Zlatoust 1.4.4 has an independent lexical-constraint learning card', () => {
  assert.match(reader, /'1\.4\.4': \{ stageCount: 4, exerciseCount: 13 \}/);
  assert.match(reader, /'gl1:gl1-4-4-lexical': '1\.4\.4'/);
  assert.match(reader, /page\.mindMapIntro \|\| '这张图只表示概念关系/);
});

test('Zlatoust 1.4.5 has an independent нельзя learning card', () => {
  assert.match(reader, /'1\.4\.5': \{ stageCount: 2, exerciseCount: 4 \}/);
  assert.match(reader, /'gl1:gl1-4-5-cannot': '1\.4\.5'/);
});

test('Zlatoust 1.4.6 has an independent negative-infinitive learning card', () => {
  assert.match(reader, /'1\.4\.6': \{ stageCount: 5, exerciseCount: 18 \}/);
  assert.match(reader, /'gl1:gl1-4-6-negative-infinitive': '1\.4\.6'/);
});

test('Zlatoust 1.4.7 has an independent imperative learning card', () => {
  assert.match(reader, /'1\.4\.7': \{ stageCount: 4, exerciseCount: 6 \}/);
  assert.match(reader, /'gl1:gl1-4-7-imperative': '1\.4\.7'/);
});

test('Zlatoust 1.4.8 has an independent negative-imperative learning card', () => {
  assert.match(reader, /'1\.4\.8': \{ stageCount: 3, exerciseCount: 6 \}/);
  assert.match(reader, /'gl1:gl1-4-8-negative-imperative': '1\.4\.8'/);
});

test('Zlatoust learning checks update only their own block and keep targeted feedback', () => {
  const answerBody = reader.match(/function answerZlatoustLearningCheck\(sectionId, stageId, checkId, optionKey, finalCheck\) \{([\s\S]*?)\n\}/);
  assert.ok(answerBody);
  assert.match(answerBody[1], /target\.outerHTML = renderZlatoustLearningCheck/);
  assert.doesNotMatch(answerBody[1], /renderQuizChapter\(/);
  assert.match(reader, /这次误判在这里/);
  assert.match(reader, /回看规则/);
  assert.match(reader, /最小对比/);
});

test('reader dispatches writing-speaking chapters to their own render function', () => {
  assert.match(reader, /data\.format === 'writing-speaking'/);
  assert.match(reader, /renderWritingSpeakingChapter\(data, scrollPosition, restoreState\)/);
});

test('writing-speaking render includes sections for reading, writing, speaking, and study support', () => {
  assert.match(reader, /function renderWritingSpeakingChapter\(data, scrollPosition, restoreState\)/);
  assert.match(reader, /📖 阅读材料/);
  assert.match(reader, /📝 词汇准备/);
  assert.match(reader, /✍️ 写作任务/);
  assert.match(reader, /🗣 口语任务/);
  assert.match(reader, /💬 可复用表达/);
  assert.match(reader, /📐 输出框架/);
  assert.match(reader, /⚠ 评分风险/);
  assert.match(reader, /💡 口语追问/);
});

test('writing-speaking records paper-writing stages without rendering an online composition field', () => {
  const activeStart = reader.indexOf('function renderWritingSpeakingChapter(data, scrollPosition, restoreState)');
  const activeEnd = reader.indexOf('/* ─── 折叠面板过渡动画 ─── */', activeStart);
  const activeRenderer = reader.slice(activeStart, activeEnd);
  assert.match(reader, /js\/russian-b2\/writing-session\.js/);
  assert.match(reader, /RussianB2WritingSession\.setStage/);
  assert.match(reader, /我已在纸上完成初稿/);
  assert.match(activeRenderer, /页面不提供作文输入框，也不启动考试计时/);
  assert.doesNotMatch(activeRenderer, /textarea|ws-draft-area|time-badge/);
});

test('Zlatoust learning checks expose clickable Russian with sentence context without selecting the answer', () => {
  const checkRenderer = reader.match(/function renderZlatoustLearningCheck\(sectionId, stageId, check, finalCheck\) \{([\s\S]*?)\n\}/);
  const retryRenderer = reader.match(/function renderZlatoustLearningRetry\(sectionId, stageId, check\) \{([\s\S]*?)\n\}/);
  assert.ok(checkRenderer && retryRenderer);
  assert.match(checkRenderer[1], /lookupContextWithSentence\('grammar'/);
  assert.match(checkRenderer[1], /zlatoustInteractiveText\(check\.prompt/);
  assert.match(checkRenderer[1], /zlatoustCheckOptionHtml/);
  assert.match(checkRenderer[1], /event\.target\.closest\(\\'\.ru-word\\'\)/);
  assert.match(retryRenderer[1], /zlatoustInteractiveText\(retry\.prompt/);
  assert.match(retryRenderer[1], /zlatoustCheckOptionHtml/);

  const page = JSON.parse(fs.readFileSync('data/textbook/zlatoust_grammar/theory/learning-pages/gl1/section-1.2.json', 'utf8'));
  const check = page.stages.flatMap(stage => stage.checks || []).find(item => item.id === 'collective-check-1');
  assert.equal(check.promptZh, '谈到新方案时，大多数人……：“它是必要的。”');
  assert.equal(check.options[0].zh, '会回答（单数）');
});

test('writing-speaking keeps vocabulary, Chinese study aids, and bilingual speaking tasks in the active workbench', () => {
  const activeStart = reader.indexOf('function renderWritingSpeakingChapter(data, scrollPosition, restoreState)');
  const activeEnd = reader.indexOf('/* ─── 折叠面板过渡动画 ─── */', activeStart);
  const activeRenderer = reader.slice(activeStart, activeEnd);
  assert.match(reader, /function renderWritingSpeakingVocabulary\(data\)/);
  assert.match(activeRenderer, /renderWritingSpeakingVocabulary\(data\)/);
  assert.match(reader, /ws-inline-translation/);
  assert.match(reader, /renderWritingTranslation\(taskTranslation && taskTranslation\.prompt, '中文'\)/);
  assert.match(reader, /renderWritingTranslation\(modelTranslation, '中文对照'\)/);
  assert.match(reader, /function getSpeakingTaskTranslation\(/);
  assert.match(activeRenderer, /renderWritingSpeakingSpeakingTask\(/);
});

test('writing-speaking makes task translation an inline reveal and removes nested step-four accordions', () => {
  const supportStart = reader.indexOf('function renderWritingSpeakingTaskSupport(task, support, translation)');
  const supportEnd = reader.indexOf('function renderWritingSpeakingComparison', supportStart);
  const taskSupport = reader.slice(supportStart, supportEnd);
  assert.match(taskSupport, /结构与表达工具板/);
  assert.match(taskSupport, /ws-structure-columns/);
  assert.match(taskSupport, /段落骨架/);
  assert.match(taskSupport, /可直接落笔/);
  assert.doesNotMatch(taskSupport, /ws-animated-collapse/);
  assert.doesNotMatch(taskSupport, /<details/);
  assert.doesNotMatch(reader, /展开中文任务翻译/);
});

test('writing-speaking vocabulary exposes its retained examples and project-dictionary details', () => {
  const vocabStart = reader.indexOf('function renderWritingSpeakingVocabulary(data)');
  const vocabEnd = reader.indexOf('function syncWritingSpeakingChapterCompletion', vocabStart);
  const vocabRenderer = reader.slice(vocabStart, vocabEnd);
  assert.match(reader, /function renderWritingVocabularyDetail/);
  assert.match(vocabRenderer, /item\.dictionary/);
  assert.match(reader, /item\.sourceExamples/);
  assert.match(reader, /ws-vocab-detail/);
  assert.match(vocabRenderer, /配对与卡片复盘/);
});

test('writing-speaking integrates recording buttons through existing MediaRecorder flow', () => {
  assert.match(reader, /🎤 录音练习/);
  assert.match(reader, /window\._wsSpeakTaskId/);
  assert.match(reader, /ws-start-rec-/);
  assert.match(reader, /ws-stop-rec-/);
});

test('writing-speaking chapters are never marked complete by scrolling', () => {
  assert.match(reader, /curBook\.format !== 'writing-speaking'/);
});

test('writing-speaking uses collapsible learning cards with source warnings', () => {
  assert.match(reader, /ws-chapter/);
  assert.match(reader, /ws-section-header/);
  assert.match(reader, /ws-task-badge/);
  assert.match(reader, /ws-reading-text/);
  assert.match(reader, /ws-vocab-grid/);
  assert.match(reader, /ws-expression-filter/);
  assert.match(reader, /ws-ai-warning/);
  assert.match(reader, /ws-bottom-nav/);
  assert.match(reader, /ws-framework/);
  assert.match(reader, /ws-model-answer/);
  assert.match(reader, /ws-risks/);
  assert.match(reader, /sourceLabel/);
});

test('writing-speaking breadcrumb displays current chapter title', () => {
  assert.match(reader, /var _currentWSData = null/);
  assert.match(reader, /_currentWSData && _currentWSData\.title/);
});

test('writing-speaking data files exist for all 19 chapters', () => {
  const path = require('node:path');
  for (let i = 0; i < 19; i++) {
    const chapterFile = path.join(__dirname, '..', '..', 'data', 'textbook', 'writing_speaking', 'ch' + String(i).padStart(4, '0') + '.json');
    assert.ok(fs.existsSync(chapterFile), 'Missing: ' + chapterFile);
    const data = JSON.parse(fs.readFileSync(chapterFile, 'utf8'));
    assert.equal(data.format, 'writing-speaking');
    assert.ok(data.title, 'Missing title in ch' + String(i).padStart(4, '0'));
    assert.ok(Array.isArray(data.sourcePages), 'sourcePages not array in ch' + String(i).padStart(4, '0'));
    assert.ok(Array.isArray(data.writingTasks), 'writingTasks not array in ch' + String(i).padStart(4, '0'));
    assert.ok(Array.isArray(data.speakingTasks), 'speakingTasks not array in ch' + String(i).padStart(4, '0'));
    assert.ok(data.studySupport && typeof data.studySupport === 'object', 'studySupport missing in ch' + String(i).padStart(4, '0'));
  }
});

test('writing-speaking bookshelf entry has correct metadata', () => {
  const indexPath = require('node:path').join(__dirname, '..', '..', 'data', 'textbook', 'index.json');
  const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
  const wsBook = index.books.find(b => b.id === 'writing_speaking');
  assert.ok(wsBook, 'writing_speaking not in bookshelf index');
  assert.equal(wsBook.format, 'writing-speaking');
  assert.equal(wsBook.chapters, 19);
  assert.equal(wsBook.dir, 'writing_speaking');
  assert.equal(wsBook.kind, 'textbook');
});

test('unavailable listening chapters omit playback controls and name the missing verified media', () => {
  const playerBody = reader.match(/function renderListeningPlayer\(data, mediaBase\) \{([\s\S]*?)\n\}/);
  assert.ok(playerBody);
  assert.match(playerBody[1], /media\.status === 'source-mismatch' \|\| !mediaUrl\) return ''/);
  assert.match(reader, /尚未找到正确配套媒体/);
});

test('listening mode switches preserve scroll and restore all supported listening modes', () => {
  const modeStart = reader.indexOf('function setListeningViewMode(mode)');
  const modeEnd = reader.indexOf('function openListeningIntensive()', modeStart);
  const modeBody = reader.slice(modeStart, modeEnd);
  assert.ok(modeStart >= 0 && modeEnd > modeStart);
  assert.match(modeBody, /var scrollPosition = window\.scrollY/);
  assert.match(modeBody, /renderListeningPractice\(currentListeningData, scrollPosition\)/);
  assert.match(reader, /\['exam', 'intensive', 'media-exercise', 'review', 'quality-review'\]/);
});
