const fs = require('node:fs');
const test = require('node:test');
const assert = require('node:assert/strict');

const reader = fs.readFileSync('reader.html', 'utf8');
const quantityPage = require('../../data/textbook/zlatoust_grammar/theory/learning-pages/gl1/section-1.2.json');
const gl1Mappings = require('../../data/textbook/zlatoust_grammar/theory/mappings/exercise-to-rules.json').exercises;
const gl1Explanations = require('../../data/textbook/zlatoust_grammar/theory/explanations/gl1/gl1-q001-q013.json').explanations;
const learningPageRenderer = reader.match(/function renderZlatoustLearningPage\(page, unit, chapterIndex\) \{[\s\S]*?\n\}/)[0];

test('quantity agreement exposes its singular/plural decision table before the stages', () => {
  assert.equal(quantityPage.summaryPlacement, 'before-stages');
  assert.equal(quantityPage.summaryTableHeaders.imperfective, '单数倾向');
  assert.equal(quantityPage.summaryTableHeaders.perfective, '复数倾向');
  assert.match(quantityPage.summaryIntro, /指人不是自动选复数/);
  assert.match(quantityPage.summaryIntro, /静态结果仍可偏向单数/);
  assert.match(learningPageRenderer, /page\.summaryPlacement === 'before-stages'/);
  assert.ok(learningPageRenderer.indexOf('summaryBeforeStages +') < learningPageRenderer.indexOf("(page.stages || []).map(function(stage)"));
});

test('learning-page summary tables support topic-specific column labels', () => {
  assert.match(reader, /var headers = page\.summaryTableHeaders \|\| \{\}/);
  assert.match(reader, /headers\.imperfective \|\| '未完成体视角'/);
  assert.match(reader, /headers\.perfective \|\| '完成体视角'/);
});

test('GL1 Q012 and Q013 expose form, syntax, and agreement as separate learning axes', () => {
  const q12 = gl1Mappings['GL1-Q012'];
  const q13 = gl1Mappings['GL1-Q013'];
  assert.deepEqual(q12.focusAxes, [
    '形式对立：形容词长形 / 短形',
    '句法功能：定语 / 状态谓语',
    '一致关系：女性自然性别'
  ]);
  assert.match(q13.focusAxes[0], /被动分词长形 \/ 短形/);
  assert.match(q13.focusAxes[1], /定语 \/ 被动谓语/);
  assert.match(reader, /function renderZlatoustFocusAxes\(mapping\)/);
  assert.match(reader, /renderZlatoustFocusAxes\(mapping\)/);
});

test('GL1 Q012 and Q013 explanations do not turn the local answer into an absolute predicate rule', () => {
  const q12 = gl1Explanations.find(item => item.exerciseId === 'GL1-Q012');
  const q13 = gl1Explanations.find(item => item.exerciseId === 'GL1-Q013');
  assert.match(q12.memoryRule, /不要把它简化成“谓语一律用短形”/);
  assert.match(q12.distractors[0].reason, /不是断言长形容词永远不能作谓语/);
  assert.match(q13.memoryRule, /不能简化成“谓语一律用短形”/);
});

test('dictionary cards share one bottom action bar across hit, miss, phrase, and online states', () => {
  assert.match(reader, /function renderDictionaryActionBar\(options\)/);
  assert.match(reader, /function renderMissingDictionaryCard\(word, loadIncomplete\)/);
  assert.match(reader, /renderMissingDictionaryCard\(clean, loadIncomplete\)/);
  assert.match(reader, /renderPhraseDetail[\s\S]*renderDictionaryActionBar\(\{ aiAction: 'copyPhraseAnalysisPrompt\(\)'/);
  assert.match(reader, /renderDetailPanel[\s\S]*renderDictionaryActionBar\(\{ aiId: 'dpAiBtn', allowOnline: true \}\)/);
  assert.match(reader, /加入生词本/);
  assert.match(reader, /一键联网查询/);
});

test('word, phrase, grammar, Zlatoust, and reading-speaking AI actions share one prompt builder', () => {
  assert.match(reader, /function buildReaderAiPrompt\(kind, payload\)/);
  assert.match(reader, /kind === 'word'/);
  assert.match(reader, /kind === 'phrase'/);
  assert.match(reader, /kind === 'exercise'/);
  assert.match(reader, /kind === 'reading-speaking'/);
  assert.match(reader, /renderZlatoustStaticExplanation[\s\S]*renderExerciseAiAction\(exercise\.id, 'exercise'\)/);
  assert.match(reader, /renderZlatoustQuizExplanation[\s\S]*renderExerciseAiAction\(exercise\.id, 'exercise'\)/);
  assert.match(reader, /renderQuizExplanation[\s\S]*renderExerciseAiAction\(exercise\.id, 'exercise'\)/);
  assert.match(reader, /renderReadingSpeakingExplanationContent[\s\S]*renderExerciseAiAction\(exId, 'reading-speaking'\)/);
});

test('tablet portrait dictionary isolates its own scrolling instead of leaking to the page', () => {
  const tabletPortrait = reader.match(/@media \(min-width: 761px\) and \(max-width: 1366px\) and \(orientation: portrait\) \{([\s\S]*?)@media \(min-width: 900px\)/);
  assert.ok(tabletPortrait);
  assert.match(tabletPortrait[1], /#detailPanel \{[^}]*overflow-y: auto;[^}]*overscroll-behavior: contain;[^}]*-webkit-overflow-scrolling: touch;/);
  assert.match(tabletPortrait[1], /\.dictionary-drawer-handle \{[^}]*width: 100%;[^}]*height: 42px;[^}]*touch-action: none;/);
  assert.match(tabletPortrait[1], /html\.dictionary-sheet-open body \{ overflow: hidden; overscroll-behavior: none; \}/);
});
