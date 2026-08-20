const fs = require('node:fs');
const test = require('node:test');
const assert = require('node:assert/strict');

const reader = fs.readFileSync('reader.html', 'utf8');
const professionPage = require('../../data/textbook/zlatoust_grammar/theory/learning-pages/gl1/section-1.1.json');
const quantityPage = require('../../data/textbook/zlatoust_grammar/theory/learning-pages/gl1/section-1.2.json');
const aspectPage = require('../../data/textbook/zlatoust_grammar/theory/learning-pages/gl1/section-1.4.1.json');
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

test('GL1 section 1.1 gives its judgment table plain-language column labels', () => {
  assert.deepEqual(professionPage.summaryTableHeaders, {
    question: '先判断什么',
    imperfective: '如果是名称或修饰词',
    perfective: '如果是动作或状态',
    boundary: '最容易错在哪里'
  });
  assert.match(professionPage.summaryTable[0].imperfective, /职业名称本身|形容词|代词/);
  assert.match(professionPage.summaryTable[0].perfective, /动词|短形容词|短分词/);
});

test('cross-stage transfer choices keep Russian words in one inline sentence flow', () => {
  const transferRule = reader.match(/\.zlatoust-transfer \.zlatoust-learning-check-option > span \{([^}]*)\}/);
  const transferTranslationRule = reader.match(/\.zlatoust-transfer \.zlatoust-learning-check-option small \{([^}]*)\}/);
  assert.ok(transferRule && transferTranslationRule);
  assert.match(transferRule[1], /display:\s*block/);
  assert.doesNotMatch(transferRule[1], /display:\s*grid/);
  assert.match(transferTranslationRule[1], /display:\s*block/);
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

test('Zlatoust rich learning stages keep the full teaching explanation and worked examples visible', () => {
  const stageBody = reader.match(/function renderZlatoustLearningStage\(page, stage\) \{([\s\S]*?)\n\}/);
  assert.ok(stageBody);
  const body = stageBody[1];
  const example = body.indexOf('zlatoust-teaching-example');
  const explanation = body.indexOf('zlatoust-teacher-copy');
  const workedExamples = body.indexOf('renderZlatoustStageExamples(stage, false)');
  const signals = body.indexOf('renderZlatoustStageSignals(stage)');
  const errors = body.indexOf('zlatoust-teaching-errors');
  const checks = body.indexOf('zlatoust-teaching-checks');
  const evidence = body.indexOf('zlatoust-stage-evidence');
  assert.ok(example >= 0 && example < explanation && explanation < workedExamples);
  assert.ok(workedExamples < signals && signals < errors && errors < checks && checks < evidence);
  assert.match(body, /explanation\.map\(function\(paragraph\)/);
  assert.doesNotMatch(body, /explanation\.slice\(1\)/);
  assert.doesNotMatch(body, /zlatoust-teaching-conclusion|zlatoust-teaching-steps/);
});

test('Zlatoust cards opt into the teaching layout through their data version', () => {
  assert.match(reader, /function hasZlatoustTeachingLayout\(page, stage\)/);
  assert.match(reader, /page\.teachingLayoutVersion === 2/);
  assert.equal(professionPage.teachingLayoutVersion, 2);
  assert.equal(aspectPage.teachingLayoutVersion, 2);
  const stageBody = reader.match(/function renderZlatoustLearningStage\(page, stage\) \{([\s\S]*?)\n\}/);
  assert.ok(stageBody);
  assert.match(stageBody[1], /if \(!hasZlatoustTeachingLayout\(page, stage\)\) return renderZlatoustLegacyLearningStage\(page, stage\);/);
});

test('Zlatoust rich learning stages fold source proof but keep formal exercises separate', () => {
  const stageBody = reader.match(/function renderZlatoustLearningStage\(page, stage\) \{([\s\S]*?)\n\}/);
  assert.ok(stageBody);
  const body = stageBody[1];
  const evidenceStart = body.indexOf('<details class="zlatoust-stage-evidence">');
  assert.ok(evidenceStart >= 0);
  const visible = body.slice(0, evidenceStart);
  const folded = body.slice(evidenceStart);
  assert.match(visible, /renderZlatoustStageExamples\(stage, false\)/);
  assert.match(visible, /renderZlatoustStageSignals\(stage\)/);
  assert.match(visible, /renderZlatoustStageContrasts\(stage\)/);
  assert.doesNotMatch(visible, /renderZlatoustStageSourceRule\(stage\.sourceRule\)/);
  assert.match(folded, /renderZlatoustStageSourceRule\(stage\.sourceRule\)/);
  assert.match(folded, /renderZlatoustStageSourceEvidence\(stage\.sourceEvidence\)/);
  assert.match(folded, /renderZlatoustStageExampleSources\(stage\)/);
  assert.doesNotMatch(folded, /renderZlatoustStageExercises\(stage\)/);
  assert.doesNotMatch(folded, /renderZlatoustStageExamples\(stage\)/);
  assert.doesNotMatch(folded, /renderZlatoustStageSignals\(stage\)/);
  assert.match(body, /<details class=\"zlatoust-stage-evidence\">/);
  assert.doesNotMatch(body, /<details class=\"zlatoust-stage-evidence\" open/);
  assert.match(body, /<details class=\"zlatoust-stage-practice\"><summary>原书正式题：/);
  assert.ok(body.indexOf('zlatoust-teaching-checks') < body.indexOf('zlatoust-stage-practice'));
  assert.ok(body.indexOf('zlatoust-stage-practice') < body.indexOf('zlatoust-stage-evidence'));
});

test('Zlatoust teaching examples keep analysis visible but move source page references into evidence', () => {
  assert.match(reader, /function renderZlatoustStageExamples\(stage, showSource\)/);
  assert.match(reader, /showSource !== false && zlatoustSourcePages\(item\.source\)/);
  assert.match(reader, /function renderZlatoustStageExampleSources\(stage\)/);
  const stageBody = reader.match(/function renderZlatoustLearningStage\(page, stage\) \{([\s\S]*?)\n\}/);
  assert.ok(stageBody);
  assert.match(stageBody[1], /renderZlatoustStageExamples\(stage, false\)/);
});

test('Zlatoust section 1.1 keeps the opening example visually close to the legacy reading flow', () => {
  const exampleRule = reader.match(/\.zlatoust-teaching-example \{([^}]*)\}/);
  const exampleTextRule = reader.match(/\.zlatoust-teaching-example \.ru \{([^}]*)\}/);
  assert.ok(exampleRule && exampleTextRule);
  assert.match(exampleRule[1], /padding:\s*14px 16px/);
  assert.doesNotMatch(exampleRule[1], /border-radius:\s*12px/);
  assert.match(exampleTextRule[1], /font-size:\s*18px/);
});

test('Zlatoust teacher explanation uses the same available width as the opening example', () => {
  const teacherParagraphRule = reader.match(/\.zlatoust-teacher-copy p \{([^}]*)\}/);
  assert.ok(teacherParagraphRule);
  assert.match(teacherParagraphRule[1], /max-width:\s*100%/);
  assert.doesNotMatch(teacherParagraphRule[1], /max-width:\s*68ch/);
});

test('Zlatoust learning pages widen at 1200px without affecting iPad landscape', () => {
  assert.match(reader, /\.main-container\.zlatoust-learning-page \{ --zlatoust-reading-width: 760px; max-width: 1180px; \}/);
  const wideDesktop = reader.match(/@media \(min-width: 1200px\) \{([\s\S]*?)\n\}/);
  assert.ok(wideDesktop);
  assert.match(wideDesktop[1], /\.main-container\.zlatoust-learning-page \{ --zlatoust-reading-width: 960px; max-width: 1280px; \}/);
  assert.doesNotMatch(reader, /@media \(min-width: 1100px\)[\s\S]*?--zlatoust-reading-width:/);
});

test('Zlatoust learning pages replace the fixed sidebar with a folded table of contents on tablets', () => {
  const tablet = reader.match(/@media \(max-width: 1024px\) \{([\s\S]*?)\n\}/);
  assert.ok(tablet);
  assert.match(tablet[1], /\.zlatoust-learning-layout \{ display: block; \}/);
  assert.match(tablet[1], /\.zlatoust-learning-toc \{ display: none; \}/);
  assert.match(tablet[1], /\.zlatoust-learning-mobile-toc \{ display: block; \}/);
  assert.match(reader, /\.zlatoust-learning-mobile-toc summary::after \{ content: '展开';/);
  assert.match(reader, /\.zlatoust-learning-mobile-toc\[open\] summary::after \{ content: '收起';/);
  assert.match(reader, /\.zlatoust-learning-mobile-toc ol \{ display: grid; grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/);
});

test('GL1 samples use the same tree-map contract with topic-specific roots', () => {
  assert.equal(professionPage.mindMapMode, 'retrieval');
  assert.deepEqual(professionPage.mindMap.map(node => node.id), ['stage-title', 'stage-attribute', 'stage-compound', 'stage-predicate']);
  assert.ok(professionPage.mindMap.every(node => node.recognize && node.rule && node.example && node.trap));
  assert.equal(aspectPage.mindMapMode, 'retrieval');
  assert.deepEqual(aspectPage.mindMapRootLines, ['先看', '时态']);
  assert.deepEqual(aspectPage.mindMap.map(node => node.id), ['stage-fact', 'stage-process', 'stage-repeat', 'stage-order', 'stage-result']);
  assert.ok(aspectPage.mindMap.every(node => node.recognize && node.rule && node.example && node.trap));
  assert.match(aspectPage.mindMap[4].label, /仅过去时/);
  assert.ok(aspectPage.stages.every(stage => stage.teacherExplanation.length >= 5));
  const mindMapBody = reader.match(/function renderZlatoustLearningMindMap\(page\) \{([\s\S]*?)\n\}/);
  assert.ok(mindMapBody);
  assert.match(mindMapBody[1], /scrollToZlatoustStage/);
  assert.match(mindMapBody[1], /page\.mindMapMode === 'retrieval'/);
  assert.match(mindMapBody[1], /key: 'recognize'/);
  assert.match(mindMapBody[1], /key: 'trap'/);
  assert.match(mindMapBody[1], /page\.mindMapRootLines/);
  assert.match(mindMapBody[1], /var mmWrapText = function/);
  assert.match(mindMapBody[1], /<tspan/);
  assert.doesNotMatch(mindMapBody[1], /mmTrunc/);
  const mindMapSvgRule = reader.match(/\.zlatoust-mindmap-svg \{([^}]*)\}/);
  assert.ok(mindMapSvgRule);
  assert.match(mindMapSvgRule[1], /width:\s*1100px/);
  assert.match(mindMapSvgRule[1], /min-width:\s*1100px/);
});

test('Zlatoust cards without the teaching version or complete teaching fields keep the legacy renderer', () => {
  assert.match(reader, /function hasZlatoustTeachingLayout\(page, stage\)/);
  assert.match(reader, /function renderZlatoustLegacyLearningStage\(page, stage\)/);
  const stageBody = reader.match(/function renderZlatoustLearningStage\(page, stage\) \{([\s\S]*?)\n\}/);
  assert.ok(stageBody);
  assert.match(stageBody[1], /if \(!hasZlatoustTeachingLayout\(page, stage\)\) return renderZlatoustLegacyLearningStage\(page, stage\);/);
});

test('Zlatoust learning pages suppress the generic chapter-completion banner while reading stage explanations', () => {
  const completionPolicy = reader.match(/function shouldUseScrollCompletion\(\) \{([\s\S]*?)\n\}/);
  assert.ok(completionPolicy);
  assert.match(completionPolicy[1], /document\.querySelector\('\.zlatoust-learning-page'\)/);
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
