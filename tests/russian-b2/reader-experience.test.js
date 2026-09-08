const fs = require('node:fs');
const test = require('node:test');
const assert = require('node:assert/strict');

const reader = fs.readFileSync('reader.html', 'utf8');
const mindMapRenderer = fs.readFileSync('js/reader-mind-map.js', 'utf8');
const professionPage = require('../../data/textbook/zlatoust_grammar/theory/learning-pages/gl1/section-1.1.json');
const quantityPage = require('../../data/textbook/zlatoust_grammar/theory/learning-pages/gl1/section-1.2.json');
const aspectPage = require('../../data/textbook/zlatoust_grammar/theory/learning-pages/gl1/section-1.4.1.json');
const cannotPage = require('../../data/textbook/zlatoust_grammar/theory/learning-pages/gl1/section-1.4.5.json');
const forbiddenGerundPage = require('../../data/textbook/zlatoust_grammar/theory/learning-pages/gl3/section-3.1.2.json');
const gl1Mappings = require('../../data/textbook/zlatoust_grammar/theory/mappings/exercise-to-rules.json').exercises;
const gl1Explanations = require('../../data/textbook/zlatoust_grammar/theory/explanations/gl1/gl1-q001-q013.json').explanations;
const learningPageRenderer = reader.match(/function renderZlatoustLearningPage\(page, unit, chapterIndex\) \{[\s\S]*?\n\}/)[0];
function sliceFunction(source, startName, endName) {
  const start = source.indexOf(`function ${startName}`);
  const end = source.indexOf(`function ${endName}`, start + 1);
  return source.slice(start, end >= 0 ? end : source.length);
}
const learningPageRoot = 'data/textbook/zlatoust_grammar/theory/learning-pages';
const allLearningPages = fs.readdirSync(learningPageRoot).flatMap((chapter) => {
  const chapterPath = `${learningPageRoot}/${chapter}`;
  if (!fs.statSync(chapterPath).isDirectory()) return [];
  return fs.readdirSync(chapterPath)
    .filter((name) => name.endsWith('.json'))
    .map((name) => JSON.parse(fs.readFileSync(`${chapterPath}/${name}`, 'utf8')));
});

test('quantity agreement exposes its singular/plural decision table before the stages', () => {
  assert.equal(quantityPage.summaryPlacement, 'before-stages');
  assert.equal(quantityPage.summaryTableHeaders.imperfective, '单数倾向');
  assert.equal(quantityPage.summaryTableHeaders.perfective, '复数倾向');
  assert.match(quantityPage.summaryIntro, /指人不是自动选复数/);
  assert.match(quantityPage.summaryIntro, /静态结果仍可偏向单数/);
  assert.match(learningPageRenderer, /page\.summaryPlacement === 'before-stages'/);
  assert.ok(learningPageRenderer.indexOf('summaryBeforeStages +') < learningPageRenderer.indexOf('lesson + summaryAfterStages'));
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
  assert.match(q12.memoryRule, /先判断空格是在“说明主语的状态”/);
  assert.match(q12.distractors[0].reason, /长形通常要贴着名词作定语/);
  assert.match(q12.distractors[0].reason, /不能按题目给出的完整句结构/);
  assert.match(q13.memoryRule, /贴着名词作定语/);
  assert.match(q13.memoryRule, /说明主语的状态/);
});

test('Zlatoust learning pages use the shared narrative and retrieval map path', () => {
  assert.match(reader, /function renderZlatoustTeachingNarrative\(page\)/);
  assert.match(reader, /function renderZlatoustLearningMindMap\(page\)/);
  assert.match(reader, /ReaderMindMap\.renderRetrievalMap/);
  assert.match(reader, /var lesson = renderZlatoustTeachingNarrative\(page\) \+ renderZlatoustNarrativeSupport\(page\)/);
  assert.match(reader, /var overview = ''/);
  assert.equal(professionPage.teachingLayoutVersion, 2);
  assert.equal(aspectPage.teachingLayoutVersion, 2);
  assert.doesNotMatch(reader, /renderZlatoustLearningRoute|renderZlatoustLegacyLearningStage|hasZlatoustTeachingLayout/);
});

test('Zlatoust uses custom narratives when available and can adapt existing teaching cards', () => {
  assert.equal(forbiddenGerundPage.teachingNarrativeVersion, 1);
  assert.ok(forbiddenGerundPage.teachingNarrative.sections.length >= 6);
  assert.equal(professionPage.teachingNarrativeVersion, undefined);
  assert.equal(aspectPage.teachingNarrativeVersion, undefined);
  assert.match(reader, /function buildZlatoustAutomaticNarrative\(page\)/);
  assert.match(reader, /page\.teachingLayoutVersion !== 2/);
  assert.match(reader, /function getZlatoustTeachingPage\(page\)/);
  assert.match(reader, /page\.teachingNarrativeVersion === 1 && page\.teachingNarrative \? page\.teachingNarrative : buildZlatoustAutomaticNarrative\(page\)/);
  assert.match(reader, /function renderZlatoustTeachingNarrative\(page\)/);
  assert.match(reader, /page\.teachingNarrativeVersion === 1 && page\.teachingNarrative/);
  assert.match(learningPageRenderer, /renderZlatoustTeachingNarrative\(page\) \+ renderZlatoustNarrativeSupport\(page\)/);
  assert.match(reader, /renderZlatoustLearningMindMap\(page\)/);
});

test('Zlatoust accepted narratives are production defaults without a comparison switch', () => {
  assert.equal(cannotPage.teachingNarrativeVersion, 1);
  assert.ok(cannotPage.teachingNarrative.sections.length >= 5);
  assert.equal(cannotPage.teachingNarrativePreviewVersion, undefined);
  assert.equal(cannotPage.teachingNarrativePreview, undefined);
  assert.doesNotMatch(reader, /zlatoustTeachingPreviewSectionId/);
  assert.doesNotMatch(reader, /setZlatoustTeachingVariant/);
  assert.doesNotMatch(reader, /aria-label="知识点卡片版本"/);
  assert.doesNotMatch(reader, />原版卡片<\/button>/);
  assert.doesNotMatch(reader, />新版讲解<\/button>/);
  assert.match(reader, /function getZlatoustTeachingPage\(page\)/);
  assert.match(reader, /teachingNarrative: narrative/);
  assert.match(reader, /mindMap: \(page\.mindMap \|\| \[\]\)\.map/);
});

test('all 32 Zlatoust knowledge cards enter the production narrative route', () => {
  assert.equal(allLearningPages.length, 32);
  for (const page of allLearningPages) {
    assert.ok(
      page.teachingNarrativeVersion === 1 || page.teachingLayoutVersion === 2,
      `${page.sectionId} lacks a production narrative or an automatic-narrative source layout`
    );
    assert.ok(Array.isArray(page.stages) && page.stages.length > 0, `${page.sectionId} lacks stages`);
    assert.ok(Array.isArray(page.mindMap) && page.mindMap.length > 0, `${page.sectionId} lacks its mind map`);
    assert.equal(page.teachingNarrativePreviewVersion, undefined, `${page.sectionId} still has a preview version`);
    assert.equal(page.teachingNarrativePreview, undefined, `${page.sectionId} still has preview data`);
  }
});

test('Zlatoust narrative decision tables support topic-specific headers', () => {
  assert.deepEqual(cannotPage.teachingNarrative.decisionHeaders, {
    situation: '“不能”来自哪里',
    result: '怎么选'
  });
  const narrativeRenderer = reader.match(/function renderZlatoustTeachingNarrative\(page\) \{([\s\S]*?)\n\}/);
  assert.ok(narrativeRenderer);
  assert.match(narrativeRenderer[1], /var decisionHeaders = narrative\.decisionHeaders \|\| \{\}/);
  assert.match(narrativeRenderer[1], /decisionHeaders\.situation \|\| '检查结果'/);
  assert.match(narrativeRenderer[1], /decisionHeaders\.result \|\| '能否使用这种压缩'/);
});

test('Zlatoust continuous narratives can retain the original mind-map component after the quick lesson', () => {
  assert.equal(forbiddenGerundPage.teachingNarrative.mindMapPlacement, 'after-first-section');
  const narrativeRenderer = reader.match(/function renderZlatoustTeachingNarrative\(page\) \{([\s\S]*?)\n\}/);
  assert.ok(narrativeRenderer);
  assert.match(narrativeRenderer[1], /sectionHtml \+ mapAfter/);
  assert.match(narrativeRenderer[1], /renderZlatoustLearningMindMap\(page\)/);
  assert.match(narrativeRenderer[1], /id="zlatoust-narrative-mindmap"/);
  assert.match(reader, /narrative\.mindMapPlacement === 'after-first-section'.*本知识点思维导图/s);
  assert.match(reader, /targetForNode: function\(node\) \{ return node\.narrativeTargetId \|\| node\.id \|\| ''; \}/);
  assert.match(reader, /data-zlatoust-mind-map-target/);
  assert.match(reader, /class=\"zlatoust-unit-map zlatoust-unit-map-retrieval\"/);
  assert.match(reader, /\.zlatoust-mindmap-wrap/);
  assert.match(reader, /\.zlatoust-mindmap-svg/);
  assert.doesNotMatch(reader, /mindMapWalkthrough|zlatoust-retrieval-example|mm-part-|mm-trap/);
});

test('Zlatoust continuous narratives can interleave existing contrasts, checks, and misconceptions', () => {
  const blockRenderer = reader.match(/function renderZlatoustNarrativeBlock\(page, block, sectionId, index\) \{([\s\S]*?)\n\}/);
  assert.ok(blockRenderer);
  assert.match(blockRenderer[1], /block\.type === 'stageContrast'/);
  assert.match(blockRenderer[1], /renderZlatoustContrastCards\(contrastStage\.contrasts\)/);
  assert.match(blockRenderer[1], /block\.type === 'stageCheck'/);
  assert.match(blockRenderer[1], /renderZlatoustLearningCheck\(page\.sectionId, checkStage\.id, check, false\)/);
  assert.match(blockRenderer[1], /block\.type === 'stageErrors'/);
  assert.match(blockRenderer[1], /renderZlatoustCommonErrors\(errors\)/);
});

test('Zlatoust narrative support does not duplicate inline checks and keeps source evidence last', () => {
  const support = reader.match(/function renderZlatoustNarrativeSupport\(page\) \{([\s\S]*?)\n\}/);
  assert.ok(support);
  const body = support[1].slice(support[1].lastIndexOf('return practice +'));
  const formal = body.indexOf('zlatoust-stage-practice');
  const evidence = body.indexOf('zlatoust-narrative-evidence');
  assert.ok(formal >= 0 && formal < evidence);
  assert.match(body, /evidence \+ review \+ '<\/div><\/details>'/);
  assert.match(support[1], /stage\.id !== 'stage-review'/);
  assert.match(support[1], /inlineCheckIds\.indexOf\(check\.id\) === -1/);
  assert.match(support[1], /renderZlatoustLearningCheck\(page\.sectionId, stage\.id, check, false\)/);
  assert.match(body, /allExerciseIds\.length/);
  assert.match(support[1], /var formalPractice = coreStages\.filter/);
  assert.match(support[1], /renderZlatoustStageExercises\(stage\)/);
  assert.match(body, /formalPractice \|\|/);
  assert.match(support[1], /renderZlatoustStageSourceRule\(stage\.sourceRule\)/);
  assert.match(support[1], /renderZlatoustStageSourceEvidence\(stage\.sourceEvidence\)/);
});

test('Zlatoust narrative support keeps formal exercises before folded source proof', () => {
  const support = reader.match(/function renderZlatoustNarrativeSupport\(page\) \{([\s\S]*?)\n\}/);
  assert.ok(support);
  const body = support[1].slice(support[1].lastIndexOf('return practice +'));
  const formal = body.indexOf('zlatoust-stage-practice');
  const evidence = body.indexOf('zlatoust-narrative-evidence');
  assert.ok(formal >= 0 && formal < evidence);
  assert.match(support[1], /renderZlatoustStageExercises\(stage\)/);
  assert.match(support[1], /formalPractice[\s\S]*renderZlatoustStageExercises\(stage\)/);
  assert.match(support[1], /renderZlatoustStageSourceRule\(stage\.sourceRule\)/);
  assert.match(support[1], /renderZlatoustStageSourceEvidence\(stage\.sourceEvidence\)/);
  assert.match(support[1], /renderZlatoustStageExampleSources\(stage\)/);
  assert.match(body, /<details class=\"zlatoust-stage-evidence zlatoust-narrative-evidence\"/);
  assert.doesNotMatch(body, /renderZlatoustLearningStage|renderZlatoustLegacyLearningStage/);
});

test('Zlatoust teaching examples keep analysis visible but move source page references into evidence', () => {
  assert.match(reader, /function renderZlatoustStageExamples\(stage, showSource\)/);
  assert.match(reader, /showSource !== false && zlatoustSourcePages\(item\.source\)/);
  assert.match(reader, /function renderZlatoustStageExampleSources\(stage\)/);
  const support = reader.match(/function renderZlatoustNarrativeSupport\(page\) \{([\s\S]*?)\n\}/);
  assert.ok(support);
  assert.match(support[1], /renderZlatoustStageExampleSources\(stage\)/);
  assert.doesNotMatch(support[1], /renderZlatoustStageExamples\(stage, false\)/);
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

test('GL1 samples use the same retrieval-map data contract with topic-specific roots', () => {
  assert.equal(professionPage.mindMapMode, 'retrieval');
  assert.deepEqual(professionPage.mindMap.map(node => node.id), ['stage-title', 'stage-attribute', 'stage-compound', 'stage-predicate']);
  assert.ok(professionPage.mindMap.every(node => node.recognize && node.rule && node.example && node.trap));
  assert.equal(aspectPage.mindMapMode, 'retrieval');
  assert.deepEqual(aspectPage.mindMapRootLines, ['先看', '时态']);
  assert.deepEqual(aspectPage.mindMap.map(node => node.id), ['stage-fact', 'stage-process', 'stage-repeat', 'stage-order', 'stage-result']);
  assert.ok(aspectPage.mindMap.every(node => node.recognize && node.rule && node.example && node.trap));
  assert.match(aspectPage.mindMap[4].label, /仅过去时/);
  assert.ok(aspectPage.stages.every(stage => stage.teacherExplanation.length >= 5));
  const mindMapBody = sliceFunction(reader, 'renderZlatoustLearningMindMap(page)', 'renderZlatoustLearningToc(page, mobile)');
  assert.match(mindMapBody, /page\.mindMapMode/);
  assert.match(mindMapBody, /Array\.isArray\(page\.mindMap\)/);
  assert.match(mindMapBody, /ReaderMindMap\.renderRetrievalMap/);
  assert.match(mindMapBody, /page\.mindMapRootLines/);
  assert.match(mindMapBody, /data-zlatoust-mind-map-target/);
  assert.match(mindMapRenderer, /key: 'recognize'/);
  assert.match(mindMapRenderer, /key: 'trap'/);
  assert.match(mindMapRenderer, /function wrapText/);
  assert.match(mindMapRenderer, /<tspan/);
  assert.doesNotMatch(mindMapRenderer, /mmTrunc/);
  assert.match(reader, /js\/reader-mind-map\.js[\s\S]*js\/russian-b2\/study-teaching\.js/);
  const mindMapSvgRule = reader.match(/\.zlatoust-mindmap-svg \{([^}]*)\}/);
  assert.ok(mindMapSvgRule);
  assert.match(mindMapSvgRule[1], /width:\s*1100px/);
  assert.match(mindMapSvgRule[1], /min-width:\s*1100px/);
});

test('Zlatoust learning pages no longer expose the legacy route or stage renderer', () => {
  assert.doesNotMatch(reader, /function hasZlatoustTeachingLayout/);
  assert.doesNotMatch(reader, /function renderZlatoustLegacyLearningStage/);
  assert.doesNotMatch(reader, /function renderZlatoustLearningStage/);
  assert.doesNotMatch(reader, /function renderZlatoustLearningRoute/);
  assert.doesNotMatch(reader, /zlatoust-unit-route|zlatoust-stage-review/);
});

test('Zlatoust learning-page data no longer carries the legacy mind-map walkthrough', () => {
  assert.equal(allLearningPages.length, 32);
  assert.ok(allLearningPages.every(page => !Object.prototype.hasOwnProperty.call(page, 'mindMapWalkthrough')));
  const builder = fs.readFileSync('scripts/build-world-people-grammar-kb.js', 'utf8');
  assert.doesNotMatch(builder, /mindMapWalkthrough/);
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
