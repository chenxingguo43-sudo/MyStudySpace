const fs = require('fs');
const path = require('path');

const repoRoot = path.join(__dirname, '..');
const textbookRoot = path.join(repoRoot, 'data', 'textbook', 'zlatoust_grammar');
const projectRoot = path.join(textbookRoot, 'theory');
const failures = [];
const warnings = [];

function fail(message) {
  failures.push(message);
}

function warn(message) {
  warnings.push(message);
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    fail(`Cannot parse ${path.relative(repoRoot, file)}: ${error.message}`);
    return null;
  }
}

function requireFile(file) {
  if (!fs.existsSync(file)) {
    fail(`Missing ${path.relative(repoRoot, file)}`);
    return false;
  }
  return true;
}

const requiredFiles = [
  'README.md',
  'NEXT_SESSION.md',
  'full-book-index.md',
  'ARCHIVE_SEAL.md',
  'source-manifest.json',
  'section-index.json',
  'coverage-map.json',
  '_automation/goal_state.json',
  '_harness/WORKFLOW.md',
  '_harness/CONTENT_CONTRACT.md',
  'mappings/README.md',
  'mappings/section-to-exercises.json',
  'mappings/exercise-to-rules.json',
  'mappings/mapping-review.json',
  'mappings/chapter-02-section-to-exercises.json',
  'mappings/chapter-02-exercise-to-rules.json',
  'mappings/chapter-02-mapping-review.json',
  'mappings/chapter-03-section-to-exercises.json',
  'mappings/chapter-03-exercise-to-rules.json',
  'mappings/chapter-03-mapping-review.json',
  'mappings/chapter-04-section-to-exercises.json',
  'mappings/chapter-04-exercise-to-rules.json',
  'mappings/chapter-04-mapping-review.json',
  'mappings/chapter-05-section-to-exercises.json',
  'mappings/chapter-05-exercise-to-rules.json',
  'mappings/chapter-05-mapping-review.json',
  'rule-units/README.md',
  'learning-pages/README.md',
  'learning-pages/gl1/section-1.1.json',
  'learning-pages/gl1/section-1.2.json',
  'learning-pages/gl1/section-1.3.json',
  'learning-pages/gl1/section-1.4.1.json',
  'learning-pages/gl1/section-1.4.2.json',
  'learning-pages/gl1/section-1.4.3.json',
  'learning-pages/gl1/section-1.4.4.json',
  'learning-pages/gl1/section-1.4.5.json',
  'learning-pages/gl1/section-1.4.6.json',
  'learning-pages/gl1/section-1.4.7.json',
  'learning-pages/gl1/section-1.4.8.json',
  'learning-pages/gl1/section-1.5-review.json',
  'learning-pages/gl2/section-2.1.json',
  'learning-pages/gl3/section-3.1.json',
  'learning-pages/gl3/section-3.1.1.json',
  'learning-pages/gl3/section-3.1.2.json',
  'learning-pages/gl4/section-4.1.json',
  'learning-pages/gl4/section-4.2.json',
  'learning-pages/gl4/section-4.3.json',
  'learning-pages/gl4/section-4.4.json',
  'learning-pages/gl5/section-5.1.json',
  'learning-pages/gl5/section-5.2.json',
  'learning-pages/gl5/section-5.lexical.json',
  'quality-reports/integrated-learning-sample-1.4.6.md',
  'quality-reports/integrated-learning-sample-1.4.7.md',
  'quality-reports/integrated-learning-sample-1.4.8.md',
  'quality-reports/integrated-learning-sample-1.1.md',
  'quality-reports/integrated-learning-sample-1.2.md',
  'quality-reports/integrated-learning-sample-1.3.md',
  'quality-reports/integrated-learning-supplementary-1.5.md',
  'quality-reports/integrated-learning-sample-2.1.md',
  'quality-reports/integrated-learning-sample-3.1.md',
  'quality-reports/integrated-learning-sample-3.1.1.md',
  'quality-reports/integrated-learning-sample-3.1.2.md',
  'quality-reports/integrated-learning-sample-4.1.md',
  'quality-reports/integrated-learning-sample-4.2.md',
  'quality-reports/integrated-learning-sample-4.3.md',
  'quality-reports/integrated-learning-sample-4.4.md',
  'quality-reports/integrated-learning-sample-5.1.md',
  'quality-reports/integrated-learning-sample-5.2.md',
  'quality-reports/integrated-learning-sample-5.lexical.md',
  'quality-reports/baseline.md',
  'quality-reports/coverage-report.md',
  'quality-reports/bidirectional-mapping-report.md',
  'quality-reports/content-quality-report.md',
  'quality-reports/data-quality-report.md',
  'quality-reports/localstorage-compatibility-regression-report.md',
  'quality-reports/chapter-01-data-repair.json',
  'quality-reports/chapter-01-source-coverage.md',
  'quality-reports/chapter-01-content-quality-review.md',
  'quality-reports/chapter-02-data-repair.json',
  'quality-reports/chapter-02-source-coverage.md',
  'quality-reports/chapter-02-content-quality-review.md',
  'quality-reports/chapter-03-data-repair.json',
  'quality-reports/chapter-03-mapping-and-data-audit.md',
  'quality-reports/chapter-03-source-coverage.md',
  'quality-reports/chapter-03-content-quality-review.md',
  'quality-reports/chapter-04-data-repair.json',
  'quality-reports/chapter-04-source-coverage.md',
  'quality-reports/chapter-04-content-quality-review.md',
  'quality-reports/chapter-05-data-repair.json',
  'quality-reports/chapter-05-mapping-and-data-audit.md',
  'quality-reports/chapter-05-source-coverage.md',
  'quality-reports/chapter-05-content-quality-review.md',
  'quality-reports/sample-1.4-coverage.md',
  'quality-reports/sample-1.4-quality-review.md'
];

requiredFiles.forEach(file => requireFile(path.join(projectRoot, file)));

const manifest = readJson(path.join(projectRoot, 'source-manifest.json'));
const sectionIndex = readJson(path.join(projectRoot, 'section-index.json'));
const coverage = readJson(path.join(projectRoot, 'coverage-map.json'));
const goalState = readJson(path.join(projectRoot, '_automation', 'goal_state.json'));
const sectionToExercises = readJson(path.join(projectRoot, 'mappings', 'section-to-exercises.json'));
const exerciseToRules = readJson(path.join(projectRoot, 'mappings', 'exercise-to-rules.json'));
const mappingReview = readJson(path.join(projectRoot, 'mappings', 'mapping-review.json'));
const chapterTwoSectionToExercises = readJson(path.join(projectRoot, 'mappings', 'chapter-02-section-to-exercises.json'));
const chapterTwoExerciseToRules = readJson(path.join(projectRoot, 'mappings', 'chapter-02-exercise-to-rules.json'));
const chapterTwoMappingReview = readJson(path.join(projectRoot, 'mappings', 'chapter-02-mapping-review.json'));
const chapterTwoRepairLedger = readJson(path.join(projectRoot, 'quality-reports', 'chapter-02-data-repair.json'));
const chapterThreeSectionToExercises = readJson(path.join(projectRoot, 'mappings', 'chapter-03-section-to-exercises.json'));
const chapterThreeExerciseToRules = readJson(path.join(projectRoot, 'mappings', 'chapter-03-exercise-to-rules.json'));
const chapterThreeMappingReview = readJson(path.join(projectRoot, 'mappings', 'chapter-03-mapping-review.json'));
const chapterThreeRepairLedger = readJson(path.join(projectRoot, 'quality-reports', 'chapter-03-data-repair.json'));
const chapterFourSectionToExercises = readJson(path.join(projectRoot, 'mappings', 'chapter-04-section-to-exercises.json'));
const chapterFourExerciseToRules = readJson(path.join(projectRoot, 'mappings', 'chapter-04-exercise-to-rules.json'));
const chapterFourMappingReview = readJson(path.join(projectRoot, 'mappings', 'chapter-04-mapping-review.json'));
const chapterFourRepairLedger = readJson(path.join(projectRoot, 'quality-reports', 'chapter-04-data-repair.json'));
const chapterFiveSectionToExercises = readJson(path.join(projectRoot, 'mappings', 'chapter-05-section-to-exercises.json'));
const chapterFiveExerciseToRules = readJson(path.join(projectRoot, 'mappings', 'chapter-05-exercise-to-rules.json'));
const chapterFiveMappingReview = readJson(path.join(projectRoot, 'mappings', 'chapter-05-mapping-review.json'));
const chapterFiveRepairLedger = readJson(path.join(projectRoot, 'quality-reports', 'chapter-05-data-repair.json'));
const aspectSectionIds = ['1.4.1', '1.4.2', '1.4.3', '1.4.4', '1.4.5', '1.4.6', '1.4.7', '1.4.8'];
const chapterOneGeneralSectionIds = ['1.1', '1.2', '1.3', '1.4'];
const chapterTwoSectionIds = ['2.1', '2.2', '2.3', '2.4', '2.4.1', '2.4.2', '2.5', '2.6', '2.7', '2.8'];
const chapterThreeSectionIds = ['3.1', '3.1.1', '3.1.2'];
const chapterFourSectionIds = ['4.1', '4.2', '4.3', '4.4'];
const chapterFiveSectionIds = ['5.1', '5.2', '5.lexical'];
const agreementLearningPage = readJson(path.join(projectRoot, 'learning-pages', 'gl1', 'section-1.1.json'));
const quantityLearningPage = readJson(path.join(projectRoot, 'learning-pages', 'gl1', 'section-1.2.json'));
const adjectiveLearningPage = readJson(path.join(projectRoot, 'learning-pages', 'gl1', 'section-1.3.json'));
const aspectLearningPage = readJson(path.join(projectRoot, 'learning-pages', 'gl1', 'section-1.4.1.json'));
const negationLearningPage = readJson(path.join(projectRoot, 'learning-pages', 'gl1', 'section-1.4.2.json'));
const infinitiveLearningPage = readJson(path.join(projectRoot, 'learning-pages', 'gl1', 'section-1.4.3.json'));
const lexicalInfinitiveLearningPage = readJson(path.join(projectRoot, 'learning-pages', 'gl1', 'section-1.4.4.json'));
const cannotLearningPage = readJson(path.join(projectRoot, 'learning-pages', 'gl1', 'section-1.4.5.json'));
const negativeInfinitiveLearningPage = readJson(path.join(projectRoot, 'learning-pages', 'gl1', 'section-1.4.6.json'));
const imperativeLearningPage = readJson(path.join(projectRoot, 'learning-pages', 'gl1', 'section-1.4.7.json'));
const negativeImperativeLearningPage = readJson(path.join(projectRoot, 'learning-pages', 'gl1', 'section-1.4.8.json'));
const supplementaryAspectReviewPage = readJson(path.join(projectRoot, 'learning-pages', 'gl1', 'section-1.5-review.json'));
const objectGovernmentLearningPage = readJson(path.join(projectRoot, 'learning-pages', 'gl2', 'section-2.1.json'));
const instrumentalLearningPage = readJson(path.join(projectRoot, 'learning-pages', 'gl2', 'section-2.3.json'));
const bareAttributeLearningPage = readJson(path.join(projectRoot, 'learning-pages', 'gl2', 'section-2.4.1.json'));
const prepositionalAttributeLearningPage = readJson(path.join(projectRoot, 'learning-pages', 'gl2', 'section-2.4.2.json'));
const attributeOverviewLearningPage = readJson(path.join(projectRoot, 'learning-pages', 'gl2', 'section-2.4.json'));
const timeRelationsLearningPage = readJson(path.join(projectRoot, 'learning-pages', 'gl2', 'section-2.5.json'));
const spatialRelationsLearningPage = readJson(path.join(projectRoot, 'learning-pages', 'gl2', 'section-2.6.json'));
const causalRelationsLearningPage = readJson(path.join(projectRoot, 'learning-pages', 'gl2', 'section-2.7.json'));
const goalRelationsLearningPage = readJson(path.join(projectRoot, 'learning-pages', 'gl2', 'section-2.8.json'));
const gerundOverviewLearningPage = readJson(path.join(projectRoot, 'learning-pages', 'gl3', 'section-3.1.json'));
const gerundAllowedLearningPage = readJson(path.join(projectRoot, 'learning-pages', 'gl3', 'section-3.1.1.json'));
const gerundForbiddenLearningPage = readJson(path.join(projectRoot, 'learning-pages', 'gl3', 'section-3.1.2.json'));
const conjunctionLearningPage = readJson(path.join(projectRoot, 'learning-pages', 'gl4', 'section-4.1.json'));
const relativeWordLearningPage = readJson(path.join(projectRoot, 'learning-pages', 'gl4', 'section-4.2.json'));
const timeConjunctionLearningPage = readJson(path.join(projectRoot, 'learning-pages', 'gl4', 'section-4.3.json'));
const razLearningPage = readJson(path.join(projectRoot, 'learning-pages', 'gl4', 'section-4.4.json'));
const chapterFiveStyleLearningPage = readJson(path.join(projectRoot, 'learning-pages', 'gl5', 'section-5.1.json'));
const chapterFiveIndefiniteLearningPage = readJson(path.join(projectRoot, 'learning-pages', 'gl5', 'section-5.2.json'));
const chapterFiveLexicalLearningPage = readJson(path.join(projectRoot, 'learning-pages', 'gl5', 'section-5.lexical.json'));

if (manifest) {
  if (manifest.scope?.pdfPages?.[0] !== 93 || manifest.scope?.pdfPages?.[1] !== 124) {
    fail('Source manifest must cover PDF pages 93-124');
  }
  for (const batch of manifest.rawOcrBatches || []) {
    requireFile(path.join(projectRoot, batch.file));
    if (batch.status !== 'review' && batch.status !== 'pass') warn(`Unexpected source status for ${batch.file}`);
  }
}

if (sectionIndex) {
  const sections = sectionIndex.sections || [];
  const ids = sections.map(section => section.id);
  if (sections.length !== 32) fail(`Expected 32 theory sections, found ${sections.length}`);
  if (new Set(ids).size !== ids.length) fail('Duplicate theory section IDs');
  sections.forEach(section => {
    if (!section.chapterId || !section.sourceStart?.pdfPage) fail(`Incomplete section index entry: ${section.id}`);
  });
}

const exerciseIds = new Set();
const chapterCounts = [];
for (let index = 0; index < 5; index += 1) {
  const file = path.join(textbookRoot, `ch${String(index).padStart(4, '0')}.json`);
  const chapter = readJson(file);
  if (!chapter) continue;
  const exercises = chapter.exercises || [];
  chapterCounts.push(exercises.length);
  exercises.forEach(exercise => {
    if (exerciseIds.has(exercise.id)) fail(`Duplicate exercise ID: ${exercise.id}`);
    exerciseIds.add(exercise.id);
  });
}

if (exerciseIds.size !== 597) fail(`Expected 597 unique exercises, found ${exerciseIds.size}`);

if (coverage) {
  const declaredTotal = (coverage.chapters || []).reduce((sum, chapter) => sum + chapter.exerciseCount, 0);
  if (coverage.exerciseTotal !== 597 || declaredTotal !== 597) fail('Coverage map exercise totals must equal 597');
  const actualCounts = chapterCounts.join(',');
  const declaredCounts = (coverage.chapters || []).map(chapter => chapter.exerciseCount).join(',');
  if (actualCounts !== declaredCounts) fail(`Coverage chapter counts differ: actual ${actualCounts}, declared ${declaredCounts}`);
  if (coverage.validatedExerciseMappingCount < 597) warn(`Exercise mapping incomplete: ${coverage.validatedExerciseMappingCount}/597 validated`);
}

if (sectionToExercises && exerciseToRules && mappingReview) {
  const mappedEntries = Object.entries(exerciseToRules.exercises || {});
  const mappedIds = mappedEntries.map(([id]) => id);
  const mappedIdSet = new Set(mappedIds);
  const chapterOneIds = [...exerciseIds].filter(id => id.startsWith('GL1-'));
  const allowedStatuses = new Set(['mapped', 'needs-review', 'source-exercise-only']);
  const ruleIds = new Set(Object.keys(exerciseToRules.ruleCatalog || {}));

  if (mappedIds.length !== mappedIdSet.size) fail('Duplicate exercise IDs in exercise-to-rules mapping');
  if (mappedIds.length !== 107) fail(`Expected 107 Chapter 1 mapping entries, found ${mappedIds.length}`);

  chapterOneIds.forEach(id => {
    if (!mappedIdSet.has(id)) fail(`Chapter 1 exercise missing from mapping: ${id}`);
  });
  mappedIds.forEach(id => {
    if (!exerciseIds.has(id)) fail(`Unknown exercise ID in mapping: ${id}`);
  });

  const statusCounts = {'mapped': 0, 'needs-review': 0, 'source-exercise-only': 0};
  mappedEntries.forEach(([id, entry]) => {
    if (entry.exerciseId !== id || entry.chapterId !== 'gl1') fail(`Invalid Chapter 1 mapping identity: ${id}`);
    if (!allowedStatuses.has(entry.status)) {
      fail(`Invalid mapping status for ${id}: ${entry.status}`);
      return;
    }
    statusCounts[entry.status] += 1;
    if (!Array.isArray(entry.sectionIds) || !entry.sectionIds.length) {
      fail(`Mapping has no theory section for ${id}`);
    }
    if (!entry.exercisePrintedPage || !entry.exercisePdfPage || !entry.theoryPrintedPages?.length || !entry.theoryPdfPages?.length || !entry.mappingReason || !entry.reviewStatus) {
      fail(`Chapter 1 mapping lacks traceability or rationale: ${id}`);
    }
    if (entry.exercisePdfPage !== entry.exercisePrintedPage + 2) fail(`Chapter 1 exercise PDF page is not the printed-page offset: ${id}`);
    if (JSON.stringify(entry.theoryPdfPages || []) !== JSON.stringify((entry.theoryPrintedPages || []).map(page => page + 2))) fail(`Chapter 1 theory PDF pages are not the printed-page offset: ${id}`);
    const assignedRules = entry.ruleIds || [];
    const candidateRules = entry.candidateRuleIds || [];
    [...assignedRules, ...candidateRules].forEach(ruleId => {
      if (!ruleIds.has(ruleId)) fail(`Unknown rule ID for ${id}: ${ruleId}`);
    });
    if (entry.status === 'mapped' && !assignedRules.length) {
      fail(`Mapped exercise has no rule IDs: ${id}`);
    }
    if (entry.status === 'needs-review' && !candidateRules.length) fail(`Needs-review Chapter 1 exercise has no candidate rule: ${id}`);
    if (entry.status === 'source-exercise-only' && (assignedRules.length || candidateRules.length)) fail(`Source-only Chapter 1 exercise must not fabricate a rule: ${id}`);
  });

  const sectionIds = new Set();
  Object.values(sectionToExercises.sections || {}).forEach(section => {
    (section.exerciseIds || []).forEach(id => {
      sectionIds.add(id);
      if (!mappedIdSet.has(id)) fail(`Section mapping references unknown mapped exercise: ${id}`);
    });
  });
  mappedIds.forEach(id => {
    if (!sectionIds.has(id)) fail(`Exercise missing from section-to-exercises mapping: ${id}`);
  });

  const reviewSummary = mappingReview.summary || {};
  if (reviewSummary.accounted !== mappedIds.length) fail('Mapping review accounted count differs from exercise mapping');
  Object.entries(statusCounts).forEach(([status, count]) => {
    const summaryKey = status === 'needs-review' ? 'needsReview' : status === 'source-exercise-only' ? 'sourceExerciseOnly' : status;
    if (reviewSummary[summaryKey] !== count) fail(`Mapping review count differs for ${status}`);
  });
  if ((coverage?.validatedExerciseMappingCount || 0) < mappedIds.length) {
    fail(`Coverage validated mapping count is smaller than the completed Chapter 1 mapping: ${coverage?.validatedExerciseMappingCount} vs ${mappedIds.length}`);
  }
  if (statusCounts['needs-review'] || statusCounts['source-exercise-only']) {
    warn(`Chapter 1 mapping is complete with review cases: ${statusCounts['needs-review']} needs-review, ${statusCounts['source-exercise-only']} source-exercise-only`);
  }

  const chapterOneUnitDirectory = path.join(projectRoot, 'rule-units', 'gl1');
  const linkedExerciseIds = new Set();
  for (const file of fs.readdirSync(chapterOneUnitDirectory).filter(file => file.endsWith('.json'))) {
    const unit = readJson(path.join(chapterOneUnitDirectory, file));
    for (const link of unit?.exerciseLinks || []) {
      const entry = exerciseToRules.exercises?.[link.exerciseId];
      if (!entry) { fail(`Chapter 1 unit link has no formal mapping: ${link.exerciseId}`); continue; }
      linkedExerciseIds.add(link.exerciseId);
      if (link.exercisePrintedPage !== entry.exercisePrintedPage || link.source?.questionPrintedPage !== entry.exercisePrintedPage || link.source?.questionPdfPage !== entry.exercisePdfPage) fail(`Chapter 1 unit source page differs from formal mapping: ${link.exerciseId}`);
      if (link.mappingReason !== entry.mappingReason || link.status !== entry.status) fail(`Chapter 1 unit link differs from formal rationale/status: ${link.exerciseId}`);
    }
  }
  if (linkedExerciseIds.size !== 107) fail(`Expected 107 Chapter 1 rule-unit links, found ${linkedExerciseIds.size}`);
}

if (chapterTwoSectionToExercises && chapterTwoExerciseToRules && chapterTwoMappingReview && chapterTwoRepairLedger) {
  const chapter = readJson(path.join(textbookRoot, 'ch0001.json'));
  const exercisesById = new Map((chapter?.exercises || []).map(exercise => [exercise.id, exercise]));
  const expectedIds = [...exercisesById.keys()];
  const entries = Object.entries(chapterTwoExerciseToRules.exercises || {});
  const mappedIds = entries.map(([id]) => id);
  const allowedStatuses = new Set(['mapped', 'needs-review', 'source-exercise-only']);
  const ruleIds = new Set(Object.keys(chapterTwoExerciseToRules.ruleCatalog || {}));
  const actualStatusCounts = { mapped: 0, 'needs-review': 0, 'source-exercise-only': 0 };

  if (chapterTwoExerciseToRules.chapterId !== 'gl2') fail('Chapter 2 exercise-to-rules file must declare gl2');
  if (chapterTwoSectionToExercises.chapterId !== 'gl2') fail('Chapter 2 section-to-exercises file must declare gl2');
  if (chapterTwoMappingReview.chapterId !== 'gl2') fail('Chapter 2 mapping review must declare gl2');
  if (entries.length !== expectedIds.length) fail(`Expected ${expectedIds.length} Chapter 2 mapping entries, found ${entries.length}`);
  if (new Set(mappedIds).size !== mappedIds.length) fail('Duplicate exercise IDs in Chapter 2 mapping');

  expectedIds.forEach(id => {
    if (!mappedIds.includes(id)) fail(`Chapter 2 exercise missing from mapping: ${id}`);
  });

  entries.forEach(([id, entry]) => {
    if (!exercisesById.has(id)) fail(`Unknown Chapter 2 exercise ID in mapping: ${id}`);
    if (entry.exerciseId !== id || entry.chapterId !== 'gl2') fail(`Invalid Chapter 2 mapping identity: ${id}`);
    if (!allowedStatuses.has(entry.status)) fail(`Invalid Chapter 2 mapping status for ${id}: ${entry.status}`);
    else actualStatusCounts[entry.status] += 1;
    if (!Array.isArray(entry.sectionIds) || !entry.sectionIds.length) fail(`Chapter 2 mapping has no section IDs: ${id}`);
    if (!entry.exercisePrintedPage || !entry.exercisePdfPage || !entry.theoryPrintedPages?.length || !entry.theoryPdfPages?.length) fail(`Chapter 2 mapping lacks page traceability: ${id}`);
    if (!entry.mappingReason) fail(`Chapter 2 mapping lacks reason: ${id}`);
    const assigned = entry.ruleIds || [];
    const candidates = entry.candidateRuleIds || [];
    [...assigned, ...candidates].forEach(ruleId => {
      if (!ruleIds.has(ruleId)) fail(`Unknown Chapter 2 rule ID for ${id}: ${ruleId}`);
    });
    if (entry.status === 'mapped' && !assigned.length) fail(`Mapped Chapter 2 exercise has no rule ID: ${id}`);
    if (entry.status === 'needs-review' && !candidates.length) fail(`Needs-review Chapter 2 exercise has no candidate rule: ${id}`);
    if (entry.status === 'source-exercise-only' && (assigned.length || candidates.length)) fail(`Source-only Chapter 2 exercise must not assign a rule: ${id}`);
  });

  const reverseSections = chapterTwoSectionToExercises.sections || {};
  entries.forEach(([id, entry]) => {
    entry.sectionIds.forEach(sectionId => {
      const section = reverseSections[sectionId];
      if (!section?.exerciseIds?.includes(id)) fail(`Chapter 2 reverse mapping omits ${id} from ${sectionId}`);
    });
  });
  Object.entries(reverseSections).forEach(([sectionId, section]) => {
    (section.exerciseIds || []).forEach(id => {
      const entry = chapterTwoExerciseToRules.exercises?.[id];
      if (!entry || !entry.sectionIds.includes(sectionId)) fail(`Chapter 2 reverse mapping has stale ${id} in ${sectionId}`);
    });
  });

  const reviewSummary = chapterTwoMappingReview.summary || {};
  if (reviewSummary.accounted !== entries.length) fail('Chapter 2 review accounted count differs from mapping');
  if (reviewSummary.mapped !== actualStatusCounts.mapped || reviewSummary.needsReview !== actualStatusCounts['needs-review'] || reviewSummary.sourceExerciseOnly !== actualStatusCounts['source-exercise-only']) fail('Chapter 2 review status counts differ from mapping');
  if (reviewSummary.pdfAnswerKeyMismatches !== 18 || chapterTwoRepairLedger?.summary?.answerKeyMismatches !== 18) fail('Chapter 2 answer repair ledger must retain all 18 PDF-key mismatches');
  if (chapterTwoRepairLedger?.answerCorrections?.length !== 18) fail('Chapter 2 repair ledger must contain 18 answer corrections');
  if (!chapter?.sourcePages?.questions?.includes(40)) fail('Chapter 2 question source pages must include printed page 40 for GL2-Q149–Q150');
  const completedChapterOneMappings = Object.keys(exerciseToRules?.exercises || {}).length;
  if ((coverage?.validatedExerciseMappingCount || 0) < completedChapterOneMappings + entries.length) fail(`Coverage validated mapping count is smaller than completed Chapters 1 and 2: ${coverage?.validatedExerciseMappingCount} vs ${completedChapterOneMappings + entries.length}`);

  for (const exercise of exercisesById.values()) {
    if (exercise.answer !== exercise.sourceAnswer || !exercise.options.some(option => option.key === exercise.answer)) fail(`${exercise.id} violates repaired Chapter 2 answer contract`);
  }
}

const expectedCleanedPages = {
  'chapter-01.md': ['093', '094', '095', '096', '097', '098', '099'],
  'chapter-02.md': ['100', '101', '102', '103', '104', '105', '106', '107', '108', '109'],
  // PDF-113 contains the last part of 3.1.2 before the Chapter 4 heading.
  'chapter-03.md': ['110', '111', '112', '113'],
  'chapter-04.md': ['113', '114', '115', '116', '117'],
  'chapter-05.md': ['117', '118', '119', '120', '121', '122', '123', '124']
};

for (const [file, expectedPages] of Object.entries(expectedCleanedPages)) {
  const fullPath = path.join(projectRoot, 'cleaned-source', file);
  if (!requireFile(fullPath)) continue;
  const source = fs.readFileSync(fullPath, 'utf8');
  const pages = [...new Set([...source.matchAll(/^--- PDF-(\d{3})/gm)].map(match => match[1]))];
  if (pages.join(',') !== expectedPages.join(',')) fail(`${file} page markers differ: ${pages.join(',')}`);
  const cyrillicCount = (source.match(/[А-Яа-яЁё]/g) || []).length;
  if (cyrillicCount < 100) fail(`${file} does not contain enough Cyrillic source text`);
}

if (goalState) {
  const expectedRoot = path.resolve(projectRoot).toLowerCase();
  const declaredRoot = path.resolve(goalState.project_root || '').toLowerCase();
  if (expectedRoot !== declaredRoot) fail(`Goal-state root mismatch: ${goalState.project_root}`);
  if (!['in_progress', 'review'].includes(goalState.stages?.range_map)) warn('Expected range_map stage to be in_progress or review');
}

const finalReportChecks = [
  ['full-book-index.md', ['597/597', '32/32', '381 / 14 / 202']],
  ['quality-reports/bidirectional-mapping-report.md', ['597/597', 'GL1-Q076', 'GL3-Q039']],
  ['quality-reports/content-quality-report.md', ['32/32', '87']],
  ['quality-reports/data-quality-report.md', ['597', 'GL1-Q061']],
  ['quality-reports/localstorage-compatibility-regression-report.md', ['rr_b2_progress_v1', 'everWrong']],
  ['ARCHIVE_SEAL.md', ['sealed_with_known_risks', 'REVIEW', 'GL1-Q076', 'GL3-Q039']]
];
for (const [file, markers] of finalReportChecks) {
  const fullPath = path.join(projectRoot, file);
  if (!fs.existsSync(fullPath)) continue;
  const contents = fs.readFileSync(fullPath, 'utf8');
  markers.forEach(marker => { if (!contents.includes(marker)) fail(`Final evidence file ${file} omits ${marker}`); });
}

if (sectionIndex && sectionIndex.sections) {
  const section148 = sectionIndex.sections.find(section => section.id === '1.4.8');
  if (!section148 || section148.sourceStart?.pdfPage !== 100 || section148.sourceStart?.printedPage !== 98) {
    fail('Section 1.4.8 must retain its visually checked PDF-100 / printed-page-98 source location');
  }
}

if (exerciseToRules && sectionToExercises) {
  const chapter = readJson(path.join(textbookRoot, 'ch0000.json'));
  const exercisesById = new Map((chapter?.exercises || []).map(exercise => [exercise.id, exercise]));
  const allowedSourceTypes = new Set(['source-rule', 'source-table', 'source-example', 'exercise-example', 'learning-note', 'external-note']);
  for (const sectionId of aspectSectionIds) {
    const unitPath = path.join(projectRoot, 'rule-units', 'gl1', `section-${sectionId}.json`);
    if (!requireFile(unitPath)) continue;
    const unit = readJson(unitPath);
    if (!unit) continue;
    if (unit.chapterId !== 'gl1' || unit.sectionId !== sectionId || !unit.id) fail(`Invalid 1.4 sample identity in ${path.basename(unitPath)}`);
    if (!unit.orientationZh?.text || !Array.isArray(unit.quickDecision) || unit.quickDecision.length < 3) fail(`${sectionId} sample lacks a usable orientation or quick decision`);
    if (!Array.isArray(unit.sourceRules) || !unit.sourceRules.length || unit.sourceRules.some(item => item.sourceType !== 'source-rule' || !item.text)) fail(`${sectionId} sample lacks complete source-rule content`);
    if (!Array.isArray(unit.tables) || !unit.tables.length || unit.tables.some(table => table.sourceType !== 'source-table' || !table.headers?.length || !table.rows?.length || !table.markdown)) fail(`${sectionId} sample lacks a complete source table`);
    if (!Array.isArray(unit.atomicRules) || !unit.atomicRules.length) fail(`${sectionId} sample lacks atomic rule units`);
    const expectedRuleIds = Object.entries(exerciseToRules.ruleCatalog || {}).filter(([, rule]) => rule.sectionId === sectionId).map(([id]) => id).sort();
    const actualRuleIds = unit.atomicRules.map(rule => rule.id).sort();
    if (expectedRuleIds.join(',') !== actualRuleIds.join(',')) fail(`${sectionId} atomic rule IDs differ from the rule catalog`);
    if (!Array.isArray(unit.examples) || !unit.examples.length || unit.examples.some(example => example.sourceType !== 'source-example')) fail(`${sectionId} sample lacks source examples`);
    if (!Array.isArray(unit.contrasts) || !unit.contrasts.length || !Array.isArray(unit.commonErrors) || !unit.commonErrors.length || !Array.isArray(unit.signalAnalysis) || !unit.signalAnalysis.length) fail(`${sectionId} sample lacks required analysis layers`);
    if (unit.reviewStatus !== 'needs-review') fail(`${sectionId} source-review state must remain visible`);
    const expectedExercises = (sectionToExercises.sections?.[sectionId]?.exerciseIds || []).slice().sort();
    const linkedExercises = (unit.exerciseLinks || []).map(link => link.exerciseId).sort();
    if (expectedExercises.join(',') !== linkedExercises.join(',')) fail(`${sectionId} exercise links differ from section-to-exercises mapping`);
    for (const link of unit.exerciseLinks || []) {
      const exercise = exercisesById.get(link.exerciseId);
      if (!exercise) fail(`${sectionId} links unknown exercise ${link.exerciseId}`);
      else if (exercise.type === 'single-choice' && (exercise.answer !== exercise.sourceAnswer || !exercise.options.some(option => option.key === exercise.answer))) fail(`${link.exerciseId} violates repaired answer contract`);
      if (!allowedSourceTypes.has(link.sourceType) || !link.optionAnalysis?.sourceType || !allowedSourceTypes.has(link.optionAnalysis.sourceType)) fail(`${link.exerciseId} has an invalid source-type label`);
      if (link.status === 'mapped' && (!link.ruleIds?.length || !link.mappingReason)) fail(`${link.exerciseId} lacks a mapped-rule explanation`);
      if (link.status === 'source-exercise-only' && link.ruleIds?.length) fail(`${link.exerciseId} must not fabricate a rule ID`);
    }
    const coverage = unit.sourceCoverage;
    if (!coverage || coverage.ruleItems?.total !== coverage.ruleItems?.captured || coverage.tables?.total !== coverage.tables?.captured || coverage.tables?.rowsTotal !== coverage.tables?.rowsCaptured || coverage.examples?.total !== coverage.examples?.captured || coverage.relatedExercises?.total !== coverage.relatedExercises?.explained) fail(`${sectionId} source coverage ledger is incomplete`);
  }
}

if (exerciseToRules && sectionToExercises) {
  const chapter = readJson(path.join(textbookRoot, 'ch0000.json'));
  const exercisesById = new Map((chapter?.exercises || []).map(exercise => [exercise.id, exercise]));
  const knownRuleIds = new Set(Object.keys(exerciseToRules.ruleCatalog || {}));
  const allowedSourceTypes = new Set(['source-rule', 'source-table', 'source-example', 'exercise-example', 'learning-note', 'external-note']);
  for (const sectionId of chapterOneGeneralSectionIds) {
    const unitPath = path.join(projectRoot, 'rule-units', 'gl1', `section-${sectionId}.json`);
    if (!requireFile(unitPath)) continue;
    const unit = readJson(unitPath);
    if (!unit) continue;
    if (unit.chapterId !== 'gl1' || unit.sectionId !== sectionId || !unit.id) fail(`Invalid Chapter 1 general unit identity in ${path.basename(unitPath)}`);
    if (!unit.orientationZh?.text || unit.orientationZh.sourceType !== 'learning-note' || !Array.isArray(unit.quickDecision) || unit.quickDecision.length < 3 || unit.quickDecision.some(item => item.sourceType !== 'learning-note' || !item.text)) fail(`${sectionId} general unit lacks usable Chinese orientation or quick decision`);
    if (!Array.isArray(unit.sourceRules) || !unit.sourceRules.length || unit.sourceRules.some(item => item.sourceType !== 'source-rule' || !item.text || !item.source?.pdfPages?.length || !item.source?.printedPages?.length)) fail(`${sectionId} general unit lacks complete source-rule content`);
    if (unit.source?.cleanedSource !== 'cleaned-source/chapter-01.md' || !unit.source?.pdfPages?.length || !unit.source?.printedPages?.length) fail(`${sectionId} general unit lacks Chapter 1 source traceability`);
    if (!Array.isArray(unit.atomicRules) || !unit.atomicRules.length || unit.atomicRules.some(rule => !rule.id || !knownRuleIds.has(rule.id) || !allowedSourceTypes.has(rule.sourceType))) fail(`${sectionId} general unit lacks valid atomic rules`);
    const expectedAtomicIds = Object.entries(exerciseToRules.ruleCatalog || {}).filter(([, rule]) => rule.sectionId === sectionId).map(([id]) => id).sort();
    const actualAtomicIds = unit.atomicRules.map(rule => rule.id).sort();
    if (expectedAtomicIds.join(',') !== actualAtomicIds.join(',')) fail(`${sectionId} general atomic rule IDs differ from the Chapter 1 rule catalog`);
    if (!Array.isArray(unit.tables) || unit.tables.some(table => table.sourceType !== 'source-table' || !table.headers?.length || !table.rows?.length || !table.markdown)) fail(`${sectionId} general unit has an invalid source table`);
    const sourceCoverage = unit.sourceCoverage;
    if (!sourceCoverage || sourceCoverage.ruleItems?.total !== sourceCoverage.ruleItems?.captured || sourceCoverage.numberedItems?.total !== sourceCoverage.numberedItems?.captured || sourceCoverage.tables?.total !== sourceCoverage.tables?.captured || sourceCoverage.tables?.rowsTotal !== sourceCoverage.tables?.rowsCaptured || sourceCoverage.examples?.total !== sourceCoverage.examples?.captured || sourceCoverage.relatedExercises?.total !== sourceCoverage.relatedExercises?.explained || !Array.isArray(sourceCoverage.omitted) || sourceCoverage.omitted.length) fail(`${sectionId} general source coverage ledger is incomplete`);
    if (unit.tables.length !== sourceCoverage.tables.total) fail(`${sectionId} general table count differs from source coverage ledger`);
    if (!Array.isArray(unit.examples) || unit.examples.length !== sourceCoverage.examples.total || unit.examples.some(example => example.sourceType !== 'source-example' || !example.text)) fail(`${sectionId} general source examples differ from coverage ledger`);
    if (!Array.isArray(unit.contrasts) || !unit.contrasts.length || !Array.isArray(unit.commonErrors) || !unit.commonErrors.length || !Array.isArray(unit.signalAnalysis) || !unit.signalAnalysis.length) fail(`${sectionId} general unit lacks required analysis layers`);
    if (unit.reviewStatus !== 'needs-review') fail(`${sectionId} general source-review state must remain visible`);
    const expectedExerciseIds = (sectionToExercises.sections?.[sectionId]?.exerciseIds || []).slice().sort();
    const linkedExerciseIds = (unit.exerciseLinks || []).map(link => link.exerciseId).sort();
    if (expectedExerciseIds.join(',') !== linkedExerciseIds.join(',')) fail(`${sectionId} general exercise links differ from section mapping`);
    for (const link of unit.exerciseLinks || []) {
      const exercise = exercisesById.get(link.exerciseId);
      const entry = exerciseToRules.exercises?.[link.exerciseId];
      if (!exercise || !entry) { fail(`${sectionId} general unit links an unknown exercise ${link.exerciseId}`); continue; }
      if (link.status !== entry.status || JSON.stringify(link.ruleIds || []) !== JSON.stringify(entry.ruleIds || []) || !link.mappingReason) fail(`${link.exerciseId} general unit link differs from Chapter 1 mapping`);
      if (link.status === 'mapped' && (!link.ruleIds?.length || !link.ruleIds.some(ruleId => actualAtomicIds.includes(ruleId)))) fail(`${link.exerciseId} general unit lacks a local atomic mapped rule`);
      if (link.status === 'source-exercise-only' && (link.ruleIds?.length || link.candidateRuleIds?.length)) fail(`${link.exerciseId} general unit must not fabricate a rule ID`);
      if (exercise.answer !== exercise.sourceAnswer || !exercise.options.some(option => option.key === exercise.answer)) fail(`${link.exerciseId} violates repaired Chapter 1 answer contract in general unit`);
      if (link.sourceType !== 'exercise-example' || link.optionAnalysis?.sourceType !== 'learning-note' || !link.optionAnalysis.correct || !Array.isArray(link.optionAnalysis.distractors) || link.optionAnalysis.distractors.length !== exercise.options.length - 1) fail(`${link.exerciseId} general unit lacks complete option analysis`);
    }
  }
  const chapterOneCoverageReport = fs.readFileSync(path.join(projectRoot, 'quality-reports', 'chapter-01-source-coverage.md'), 'utf8');
  const chapterOneQualityReport = fs.readFileSync(path.join(projectRoot, 'quality-reports', 'chapter-01-content-quality-review.md'), 'utf8');
  chapterOneGeneralSectionIds.forEach(sectionId => { if (!chapterOneCoverageReport.includes(`| ${sectionId} |`)) fail(`Chapter 1 source coverage report omits ${sectionId}`); });
  if (!chapterOneQualityReport.includes('REVIEW') || !chapterOneQualityReport.includes('source-exercise-only')) fail('Chapter 1 general reports must keep review/source-only risks visible');
}

if (sectionIndex?.sections) {
  for (const section of sectionIndex.sections) {
    const unitPath = path.join(projectRoot, 'rule-units', section.chapterId, `section-${section.id}.json`);
    if (!requireFile(unitPath)) continue;
    const unit = readJson(unitPath);
    if (unit && (unit.chapterId !== section.chapterId || unit.sectionId !== section.id)) fail(`Theory section unit identity differs from section index: ${section.id}`);
  }
}

if (chapterTwoExerciseToRules && chapterTwoSectionToExercises) {
  const chapter = readJson(path.join(textbookRoot, 'ch0001.json'));
  const exercisesById = new Map((chapter?.exercises || []).map(exercise => [exercise.id, exercise]));
  const allowedSourceTypes = new Set(['source-rule', 'source-table', 'source-example', 'exercise-example', 'learning-note', 'external-note']);
  const knownRuleIds = new Set(Object.keys(chapterTwoExerciseToRules.ruleCatalog || {}));
  for (const sectionId of chapterTwoSectionIds) {
    const unitPath = path.join(projectRoot, 'rule-units', 'gl2', `section-${sectionId}.json`);
    if (!requireFile(unitPath)) continue;
    const unit = readJson(unitPath);
    if (!unit) continue;
    if (unit.chapterId !== 'gl2' || unit.sectionId !== sectionId || !unit.id) fail(`Invalid Chapter 2 unit identity in ${path.basename(unitPath)}`);
    if (!unit.orientationZh?.text || unit.orientationZh.sourceType !== 'learning-note' || !Array.isArray(unit.quickDecision) || unit.quickDecision.length < 3 || unit.quickDecision.some(item => item.sourceType !== 'learning-note' || !item.text)) fail(`${sectionId} unit lacks a usable Chinese orientation or quick decision`);
    if (!Array.isArray(unit.sourceRules) || !unit.sourceRules.length || unit.sourceRules.some(item => item.sourceType !== 'source-rule' || !item.text || !item.source?.pdfPages?.length || !item.source?.printedPages?.length)) fail(`${sectionId} unit lacks complete source-rule content`);
    if (unit.source?.cleanedSource !== 'cleaned-source/chapter-02.md' || !unit.source?.pdfPages?.length || !unit.source?.printedPages?.length) fail(`${sectionId} unit lacks Chapter 2 source traceability`);
    if (!Array.isArray(unit.atomicRules) || !unit.atomicRules.length || unit.atomicRules.some(rule => !rule.id || !allowedSourceTypes.has(rule.sourceType))) fail(`${sectionId} unit lacks valid atomic rule units`);
    const atomicRuleIds = new Set(unit.atomicRules.map(rule => rule.id));
    if (!Array.isArray(unit.tables)) fail(`${sectionId} unit lacks a tables array`);
    const coverage = unit.sourceCoverage;
    const coveredTables = coverage?.tables;
    if (!coverage || coverage.ruleItems?.total !== coverage.ruleItems?.captured || coverage.numberedItems?.total !== coverage.numberedItems?.captured || coveredTables?.total !== coveredTables?.captured || coveredTables?.rowsTotal !== coveredTables?.rowsCaptured || coverage.examples?.total !== coverage.examples?.captured || coverage.relatedExercises?.total !== coverage.relatedExercises?.explained) fail(`${sectionId} source coverage ledger is incomplete`);
    if (coveredTables && unit.tables.length !== coveredTables.total) fail(`${sectionId} table count differs from source coverage ledger`);
    if (unit.tables.some(table => table.sourceType !== 'source-table' || !table.headers?.length || !table.rows?.length || !table.markdown)) fail(`${sectionId} unit has an incomplete source table`);
    if (!Array.isArray(unit.examples) || !unit.examples.length || unit.examples.length !== coverage?.examples?.total || unit.examples.some(example => example.sourceType !== 'source-example' || !example.text)) fail(`${sectionId} unit lacks complete source examples`);
    if (!Array.isArray(unit.contrasts) || !unit.contrasts.length || !Array.isArray(unit.commonErrors) || !unit.commonErrors.length || !Array.isArray(unit.signalAnalysis) || !unit.signalAnalysis.length) fail(`${sectionId} unit lacks required analysis layers`);
    if (unit.reviewStatus !== 'needs-review') fail(`${sectionId} source-review state must remain visible`);
    const expectedExercises = (chapterTwoSectionToExercises.sections?.[sectionId]?.exerciseIds || []).slice().sort();
    const linkedExercises = (unit.exerciseLinks || []).map(link => link.exerciseId).sort();
    if (expectedExercises.join(',') !== linkedExercises.join(',')) fail(`${sectionId} exercise links differ from Chapter 2 section mapping`);
    for (const link of unit.exerciseLinks || []) {
      const exercise = exercisesById.get(link.exerciseId);
      const entry = chapterTwoExerciseToRules.exercises?.[link.exerciseId];
      if (!exercise || !entry) {
        fail(`${sectionId} links unknown Chapter 2 exercise ${link.exerciseId}`);
        continue;
      }
      if (exercise.answer !== exercise.sourceAnswer || !exercise.options.some(option => option.key === exercise.answer)) fail(`${link.exerciseId} violates repaired Chapter 2 answer contract in unit`);
      if (link.status !== entry.status || JSON.stringify(link.ruleIds || []) !== JSON.stringify(entry.ruleIds || []) || JSON.stringify(link.candidateRuleIds || []) !== JSON.stringify(entry.candidateRuleIds || []) || !link.mappingReason) fail(`${link.exerciseId} unit link differs from Chapter 2 mapping`);
      if (link.status === 'mapped' && (!link.ruleIds?.length || link.ruleIds.some(ruleId => !knownRuleIds.has(ruleId) || !atomicRuleIds.has(ruleId)))) fail(`${link.exerciseId} lacks a linked atomic mapped rule`);
      if (link.status === 'needs-review' && (!link.candidateRuleIds?.length || link.candidateRuleIds.some(ruleId => !knownRuleIds.has(ruleId)))) fail(`${link.exerciseId} lacks a valid review candidate`);
      if (link.status === 'source-exercise-only' && (link.ruleIds?.length || link.candidateRuleIds?.length)) fail(`${link.exerciseId} must not fabricate a Chapter 2 rule ID`);
      if (link.sourceType !== 'exercise-example' || link.optionAnalysis?.sourceType !== 'learning-note' || !Array.isArray(link.optionAnalysis?.distractors) || link.optionAnalysis.distractors.length !== exercise.options.length - 1 || !link.optionAnalysis.correct) fail(`${link.exerciseId} lacks a complete option analysis`);
    }
  }
  const chapterTwoCoverageReport = fs.readFileSync(path.join(projectRoot, 'quality-reports', 'chapter-02-source-coverage.md'), 'utf8');
  const chapterTwoQualityReport = fs.readFileSync(path.join(projectRoot, 'quality-reports', 'chapter-02-content-quality-review.md'), 'utf8');
  chapterTwoSectionIds.forEach(sectionId => {
    if (!chapterTwoCoverageReport.includes(`| ${sectionId} |`)) fail(`Chapter 2 source coverage report omits ${sectionId}`);
  });
  if (!chapterTwoQualityReport.includes('REVIEW') || !chapterTwoQualityReport.includes('needs-review') || !chapterTwoQualityReport.includes('source-exercise-only')) fail('Chapter 2 quality report must keep its review risks visible');
}

if (chapterThreeExerciseToRules && chapterThreeSectionToExercises && chapterThreeMappingReview && chapterThreeRepairLedger) {
  const chapter = readJson(path.join(textbookRoot, 'ch0002.json'));
  const exercisesById = new Map((chapter?.exercises || []).map(exercise => [exercise.id, exercise]));
  const expectedIds = [...exercisesById.keys()];
  const entries = Object.entries(chapterThreeExerciseToRules.exercises || {});
  const mappedIds = entries.map(([id]) => id);
  const allowedStatuses = new Set(['mapped', 'needs-review', 'source-exercise-only']);
  const knownRuleIds = new Set(Object.keys(chapterThreeExerciseToRules.ruleCatalog || {}));
  const statusCounts = { mapped: 0, 'needs-review': 0, 'source-exercise-only': 0 };

  if (chapterThreeExerciseToRules.chapterId !== 'gl3') fail('Chapter 3 exercise-to-rules file must declare gl3');
  if (chapterThreeSectionToExercises.chapterId !== 'gl3') fail('Chapter 3 section-to-exercises file must declare gl3');
  if (chapterThreeMappingReview.chapterId !== 'gl3') fail('Chapter 3 mapping review must declare gl3');
  if (entries.length !== expectedIds.length) fail(`Expected ${expectedIds.length} Chapter 3 mapping entries, found ${entries.length}`);
  if (new Set(mappedIds).size !== mappedIds.length) fail('Duplicate exercise IDs in Chapter 3 mapping');
  expectedIds.forEach(id => {
    if (!mappedIds.includes(id)) fail(`Chapter 3 exercise missing from mapping: ${id}`);
  });

  entries.forEach(([id, entry]) => {
    if (!exercisesById.has(id)) fail(`Unknown Chapter 3 exercise ID in mapping: ${id}`);
    if (entry.exerciseId !== id || entry.chapterId !== 'gl3') fail(`Invalid Chapter 3 mapping identity: ${id}`);
    if (!allowedStatuses.has(entry.status)) fail(`Invalid Chapter 3 mapping status for ${id}: ${entry.status}`);
    else statusCounts[entry.status] += 1;
    if (!Array.isArray(entry.sectionIds) || !entry.sectionIds.length) fail(`Chapter 3 mapping has no section IDs: ${id}`);
    if (!entry.exercisePrintedPage || !entry.exercisePdfPage || !entry.theoryPrintedPages?.length || !entry.theoryPdfPages?.length) fail(`Chapter 3 mapping lacks page traceability: ${id}`);
    if (!entry.mappingReason) fail(`Chapter 3 mapping lacks reason: ${id}`);
    const assigned = entry.ruleIds || [];
    const candidates = entry.candidateRuleIds || [];
    [...assigned, ...candidates].forEach(ruleId => {
      if (!knownRuleIds.has(ruleId)) fail(`Unknown Chapter 3 rule ID for ${id}: ${ruleId}`);
    });
    if (entry.status === 'mapped' && !assigned.length) fail(`Mapped Chapter 3 exercise has no rule ID: ${id}`);
    if (entry.status === 'needs-review' && !candidates.length) fail(`Needs-review Chapter 3 exercise has no candidate rule: ${id}`);
    if (entry.status === 'source-exercise-only' && (assigned.length || candidates.length)) fail(`Source-only Chapter 3 exercise must not assign a rule: ${id}`);
  });

  if (statusCounts.mapped !== 35 || statusCounts['needs-review'] !== 1 || statusCounts['source-exercise-only'] !== 63) fail(`Unexpected Chapter 3 status split: ${JSON.stringify(statusCounts)}`);
  const q039 = chapterThreeExerciseToRules.exercises?.['GL3-Q039'];
  if (q039?.status !== 'needs-review' || !q039.sectionIds?.includes('3.1.2') || !q039.candidateRuleIds?.includes('gl3-3.1.2-passive-construction-prohibited')) fail('GL3-Q039 must retain the passive-construction source/answer conflict as needs-review');
  const q099 = chapterThreeExerciseToRules.exercises?.['GL3-Q099'];
  if (q099?.exercisePrintedPage !== 55 || q099?.exercisePdfPage !== 57 || !chapter?.sourcePages?.questions?.includes(55)) fail('GL3-Q099 must retain printed page 55 / PDF-057 metadata');

  const reverseSections = chapterThreeSectionToExercises.sections || {};
  entries.forEach(([id, entry]) => {
    entry.sectionIds.forEach(sectionId => {
      if (!reverseSections[sectionId]?.exerciseIds?.includes(id)) fail(`Chapter 3 reverse mapping omits ${id} from ${sectionId}`);
    });
  });
  Object.entries(reverseSections).forEach(([sectionId, section]) => {
    (section.exerciseIds || []).forEach(id => {
      const entry = chapterThreeExerciseToRules.exercises?.[id];
      if (!entry || !entry.sectionIds.includes(sectionId)) fail(`Chapter 3 reverse mapping has stale ${id} in ${sectionId}`);
    });
  });

  const reviewSummary = chapterThreeMappingReview.summary || {};
  if (reviewSummary.accounted !== entries.length || reviewSummary.mapped !== statusCounts.mapped || reviewSummary.needsReview !== statusCounts['needs-review'] || reviewSummary.sourceExerciseOnly !== statusCounts['source-exercise-only']) fail('Chapter 3 review status counts differ from mapping');
  if (reviewSummary.pdfAnswerKeyMismatches !== 11 || chapterThreeRepairLedger?.summary?.answerKeyMismatches !== 11 || chapterThreeRepairLedger?.answerCorrections?.length !== 11) fail('Chapter 3 answer repair ledger must retain all 11 PDF-key mismatches');
  if (chapterThreeRepairLedger?.summary?.questionOrOptionMismatches !== 0 || chapterThreeRepairLedger?.summary?.questionPageMetadataCorrections !== 99 || !chapterThreeRepairLedger?.sourceMetadataCorrection?.repaired?.questions?.includes(55)) fail('Chapter 3 PDF question-page repair ledger is incomplete');
  for (const exercise of exercisesById.values()) {
    if (exercise.answer !== exercise.sourceAnswer || !exercise.options.some(option => option.key === exercise.answer)) fail(`${exercise.id} violates repaired Chapter 3 answer contract`);
  }

  const chapterOneCount = Object.keys(exerciseToRules?.exercises || {}).length;
  const chapterTwoCount = Object.keys(chapterTwoExerciseToRules?.exercises || {}).length;
  if ((coverage?.validatedExerciseMappingCount || 0) < chapterOneCount + chapterTwoCount + entries.length) fail(`Coverage validated mapping count is below completed Chapters 1-3: ${coverage?.validatedExerciseMappingCount} vs ${chapterOneCount + chapterTwoCount + entries.length}`);

  const allowedSourceTypes = new Set(['source-rule', 'source-table', 'source-example', 'exercise-example', 'learning-note', 'external-note']);
  for (const sectionId of chapterThreeSectionIds) {
    const unitPath = path.join(projectRoot, 'rule-units', 'gl3', `section-${sectionId}.json`);
    if (!requireFile(unitPath)) continue;
    const unit = readJson(unitPath);
    if (!unit) continue;
    if (unit.chapterId !== 'gl3' || unit.sectionId !== sectionId || !unit.id) fail(`Invalid Chapter 3 unit identity in ${path.basename(unitPath)}`);
    if (!unit.orientationZh?.text || unit.orientationZh.sourceType !== 'learning-note' || !Array.isArray(unit.quickDecision) || unit.quickDecision.length < 3 || unit.quickDecision.some(item => item.sourceType !== 'learning-note' || !item.text)) fail(`${sectionId} unit lacks a usable Chinese orientation or quick decision`);
    if (!Array.isArray(unit.sourceRules) || !unit.sourceRules.length || unit.sourceRules.some(item => item.sourceType !== 'source-rule' || !item.text || !item.source?.pdfPages?.length || !item.source?.printedPages?.length)) fail(`${sectionId} unit lacks complete source-rule content`);
    if (unit.source?.cleanedSource !== 'cleaned-source/chapter-03.md' || !unit.source?.pdfPages?.length || !unit.source?.printedPages?.length) fail(`${sectionId} unit lacks Chapter 3 source traceability`);
    if (!Array.isArray(unit.atomicRules) || !unit.atomicRules.length || unit.atomicRules.some(rule => !rule.id || !allowedSourceTypes.has(rule.sourceType) || !knownRuleIds.has(rule.id))) fail(`${sectionId} unit lacks valid atomic rule units`);
    const expectedAtomicIds = Object.entries(chapterThreeExerciseToRules.ruleCatalog || {}).filter(([, rule]) => rule.sectionId === sectionId).map(([id]) => id).sort();
    const actualAtomicIds = unit.atomicRules.map(rule => rule.id).sort();
    if (expectedAtomicIds.join(',') !== actualAtomicIds.join(',')) fail(`${sectionId} atomic rule IDs differ from Chapter 3 rule catalog`);
    if (!Array.isArray(unit.tables) || unit.tables.some(table => table.sourceType !== 'source-table' || !table.headers?.length || !table.rows?.length || !table.markdown)) fail(`${sectionId} unit has an incomplete source diagram/table`);
    const sourceCoverage = unit.sourceCoverage;
    if (!sourceCoverage || sourceCoverage.ruleItems?.total !== sourceCoverage.ruleItems?.captured || sourceCoverage.numberedItems?.total !== sourceCoverage.numberedItems?.captured || sourceCoverage.tables?.total !== sourceCoverage.tables?.captured || sourceCoverage.tables?.rowsTotal !== sourceCoverage.tables?.rowsCaptured || sourceCoverage.examples?.total !== sourceCoverage.examples?.captured || sourceCoverage.relatedExercises?.total !== sourceCoverage.relatedExercises?.explained) fail(`${sectionId} source coverage ledger is incomplete`);
    if (unit.tables.length !== sourceCoverage.tables.total) fail(`${sectionId} table/diagram count differs from source coverage ledger`);
    if (!Array.isArray(unit.examples) || unit.examples.length !== sourceCoverage.examples.total || unit.examples.some(example => example.sourceType !== 'source-example' || !example.text)) fail(`${sectionId} source examples differ from coverage ledger`);
    if (!Array.isArray(unit.contrasts) || !unit.contrasts.length || !Array.isArray(unit.commonErrors) || !unit.commonErrors.length || !Array.isArray(unit.signalAnalysis) || !unit.signalAnalysis.length) fail(`${sectionId} unit lacks required analysis layers`);
    if (unit.reviewStatus !== 'needs-review') fail(`${sectionId} source-review state must remain visible`);
    const expectedExercises = (reverseSections[sectionId]?.exerciseIds || []).slice().sort();
    const linkedExercises = (unit.exerciseLinks || []).map(link => link.exerciseId).sort();
    if (expectedExercises.join(',') !== linkedExercises.join(',')) fail(`${sectionId} exercise links differ from Chapter 3 section mapping`);
    for (const link of unit.exerciseLinks || []) {
      const exercise = exercisesById.get(link.exerciseId);
      const entry = chapterThreeExerciseToRules.exercises?.[link.exerciseId];
      if (!exercise || !entry) {
        fail(`${sectionId} links unknown Chapter 3 exercise ${link.exerciseId}`);
        continue;
      }
      if (exercise.answer !== exercise.sourceAnswer || !exercise.options.some(option => option.key === exercise.answer)) fail(`${link.exerciseId} violates repaired Chapter 3 answer contract in unit`);
      if (link.status !== entry.status || JSON.stringify(link.ruleIds || []) !== JSON.stringify(entry.ruleIds || []) || JSON.stringify(link.candidateRuleIds || []) !== JSON.stringify(entry.candidateRuleIds || []) || !link.mappingReason) fail(`${link.exerciseId} unit link differs from Chapter 3 mapping`);
      const requiresLocalAtomicRule = sectionId !== '3.1';
      if (link.status === 'mapped' && (!link.ruleIds?.length || link.ruleIds.some(ruleId => !knownRuleIds.has(ruleId)) || (requiresLocalAtomicRule && !link.ruleIds.some(ruleId => actualAtomicIds.includes(ruleId))))) fail(`${link.exerciseId} lacks a linked atomic mapped rule`);
      if (link.status === 'needs-review' && (!link.candidateRuleIds?.length || link.candidateRuleIds.some(ruleId => !knownRuleIds.has(ruleId)) || (requiresLocalAtomicRule && !link.candidateRuleIds.some(ruleId => actualAtomicIds.includes(ruleId))))) fail(`${link.exerciseId} lacks a valid Chapter 3 review candidate`);
      if (link.status === 'source-exercise-only' && (link.ruleIds?.length || link.candidateRuleIds?.length)) fail(`${link.exerciseId} must not fabricate a Chapter 3 rule ID`);
      if (link.sourceType !== 'exercise-example' || link.optionAnalysis?.sourceType !== 'learning-note' || !Array.isArray(link.optionAnalysis?.distractors) || link.optionAnalysis.distractors.length !== exercise.options.length - 1 || !link.optionAnalysis.correct) fail(`${link.exerciseId} lacks a complete option analysis`);
    }
  }
  const chapterThreeCoverageReport = fs.readFileSync(path.join(projectRoot, 'quality-reports', 'chapter-03-source-coverage.md'), 'utf8');
  const chapterThreeQualityReport = fs.readFileSync(path.join(projectRoot, 'quality-reports', 'chapter-03-content-quality-review.md'), 'utf8');
  chapterThreeSectionIds.forEach(sectionId => {
    if (!chapterThreeCoverageReport.includes(`| ${sectionId} |`)) fail(`Chapter 3 source coverage report omits ${sectionId}`);
  });
  if (!chapterThreeCoverageReport.includes('GL3-Q039') || !chapterThreeQualityReport.includes('REVIEW') || !chapterThreeQualityReport.includes('needs-review') || !chapterThreeQualityReport.includes('source-exercise-only')) fail('Chapter 3 reports must keep source and mapping risks visible');
}

if (chapterFourExerciseToRules && chapterFourSectionToExercises && chapterFourMappingReview && chapterFourRepairLedger) {
  const chapter = readJson(path.join(textbookRoot, 'ch0003.json'));
  const exercisesById = new Map((chapter?.exercises || []).map(exercise => [exercise.id, exercise]));
  const entries = Object.entries(chapterFourExerciseToRules.exercises || {});
  const expectedIds = [...exercisesById.keys()];
  const knownRuleIds = new Set(Object.keys(chapterFourExerciseToRules.ruleCatalog || {}));
  const allowedStatuses = new Set(['mapped', 'needs-review', 'source-exercise-only']);
  const allowedSourceTypes = new Set(['source-rule', 'source-table', 'source-example', 'exercise-example', 'learning-note', 'external-note']);
  const statusCounts = { mapped: 0, 'needs-review': 0, 'source-exercise-only': 0 };

  if (chapterFourExerciseToRules.chapterId !== 'gl4') fail('Chapter 4 exercise-to-rules file must declare gl4');
  if (chapterFourSectionToExercises.chapterId !== 'gl4') fail('Chapter 4 section-to-exercises file must declare gl4');
  if (chapterFourMappingReview.chapterId !== 'gl4') fail('Chapter 4 mapping review must declare gl4');
  if (entries.length !== expectedIds.length) fail(`Expected ${expectedIds.length} Chapter 4 mapping entries, found ${entries.length}`);
  if (new Set(entries.map(([id]) => id)).size !== entries.length) fail('Duplicate exercise IDs in Chapter 4 mapping');
  expectedIds.forEach(id => { if (!chapterFourExerciseToRules.exercises?.[id]) fail(`Chapter 4 exercise missing from mapping: ${id}`); });

  for (const [id, entry] of entries) {
    if (!exercisesById.has(id)) fail(`Unknown Chapter 4 exercise ID in mapping: ${id}`);
    if (entry.exerciseId !== id || entry.chapterId !== 'gl4') fail(`Invalid Chapter 4 mapping identity: ${id}`);
    if (!allowedStatuses.has(entry.status)) fail(`Invalid Chapter 4 mapping status for ${id}`);
    else statusCounts[entry.status] += 1;
    if (!entry.exerciseSectionId || !Array.isArray(entry.sectionIds) || !entry.sectionIds.length) fail(`Chapter 4 mapping has no explicit exercise/theory section: ${id}`);
    if (!entry.exercisePrintedPage || !entry.exercisePdfPage || !entry.theoryPrintedPages?.length || !entry.theoryPdfPages?.length || !entry.mappingReason) fail(`Chapter 4 mapping lacks traceability or rationale: ${id}`);
    [...(entry.ruleIds || []), ...(entry.candidateRuleIds || [])].forEach(ruleId => { if (!knownRuleIds.has(ruleId)) fail(`Unknown Chapter 4 rule ID for ${id}: ${ruleId}`); });
    if (entry.status === 'mapped' && !(entry.ruleIds || []).length) fail(`Mapped Chapter 4 exercise has no rule ID: ${id}`);
    if (entry.status === 'needs-review' && !(entry.candidateRuleIds || []).length) fail(`Needs-review Chapter 4 exercise has no candidate rule: ${id}`);
    if (entry.status === 'source-exercise-only' && ((entry.ruleIds || []).length || (entry.candidateRuleIds || []).length)) fail(`Source-only Chapter 4 exercise must not fabricate a rule: ${id}`);
  }
  if (statusCounts.mapped !== 39 || statusCounts['needs-review'] !== 0 || statusCounts['source-exercise-only'] !== 63) fail(`Unexpected Chapter 4 status split: ${JSON.stringify(statusCounts)}`);

  const q056 = chapterFourExerciseToRules.exercises?.['GL4-Q056'];
  const q078 = chapterFourExerciseToRules.exercises?.['GL4-Q078'];
  const q081 = chapterFourExerciseToRules.exercises?.['GL4-Q081'];
  const q087 = chapterFourExerciseToRules.exercises?.['GL4-Q087'];
  if (q056?.status !== 'mapped' || !q056.ruleIds?.includes('gl4-4.3-poka-ne-until-perfective')) fail('GL4-Q056 must retain the direct пока не mapping');
  if (q078?.status !== 'mapped' || !q078.ruleIds?.includes('gl4-4.3-kogda-simultaneous')) fail('GL4-Q078 must retain the direct когда + simultaneous-action mapping');
  if (q081?.status !== 'source-exercise-only' || q081.exerciseSectionId !== 'direct-to-indirect-speech') fail('GL4-Q081 must retain the unsupported direct-to-indirect-speech status');
  if (q087?.status !== 'source-exercise-only' || q087.exerciseSectionId !== '4.5') fail('GL4-Q087 must retain the unsupported §4.5 status');

  const reverseSections = chapterFourSectionToExercises.sections || {};
  for (const [id, entry] of entries) {
    for (const sectionId of entry.sectionIds || []) {
      if (!reverseSections[sectionId]?.exerciseIds?.includes(id)) fail(`Chapter 4 reverse mapping omits ${id} from ${sectionId}`);
    }
  }
  for (const [sectionId, section] of Object.entries(reverseSections)) {
    for (const id of section.exerciseIds || []) {
      if (!chapterFourExerciseToRules.exercises?.[id]?.sectionIds?.includes(sectionId)) fail(`Chapter 4 reverse mapping has stale ${id} in ${sectionId}`);
    }
  }
  const summary = chapterFourMappingReview.summary || {};
  if (summary.accounted !== entries.length || summary.mapped !== statusCounts.mapped || summary.needsReview !== statusCounts['needs-review'] || summary.sourceExerciseOnly !== statusCounts['source-exercise-only']) fail('Chapter 4 review status counts differ from mapping');
  if (summary.pdfAnswerKeyMismatches !== 9 || summary.transformedOpenResponsesVerified !== 6 || summary.questionPageMetadataCorrections !== 102 || summary.questionOrOptionMismatches !== 0) fail('Chapter 4 mapping review does not retain PDF audit totals');

  const repairedQuestions = chapter?.sourcePages?.questions || [];
  const expectedQuestionRange = Array.from({ length: 15 }, (_, index) => index + 55);
  if (JSON.stringify(repairedQuestions) !== JSON.stringify(expectedQuestionRange)) fail('Chapter 4 source page range must cover printed pages 55-69');
  if (chapterFourRepairLedger?.summary?.answerKeyMismatches !== 9 || chapterFourRepairLedger?.summary?.transformedOpenResponsesVerified !== 6 || chapterFourRepairLedger?.summary?.questionPageMetadataCorrections !== 102 || chapterFourRepairLedger?.answerCorrections?.length !== 9 || chapterFourRepairLedger?.transformedKeyVerifications?.length !== 6 || chapterFourRepairLedger?.questionPageCorrections?.length !== 102) fail('Chapter 4 PDF repair ledger is incomplete');
  for (const exercise of exercisesById.values()) {
    const entry = chapterFourExerciseToRules.exercises?.[exercise.id];
    if (!entry || exercise.questionPages?.[0] !== entry.exercisePdfPage || exercise.answerPages?.[0] !== 126 || !exercise.sourceEvidence?.includes(`PDF-${String(entry.exercisePdfPage).padStart(3, '0')}`)) fail(`${exercise.id} lacks repaired Chapter 4 source metadata`);
    if (exercise.type === 'open-response') {
      if (exercise.answer !== '' || exercise.sourceAnswer !== '' || exercise.options?.length !== 0) fail(`${exercise.id} violates retained Chapter 4 open-response contract`);
    } else if (exercise.answer !== exercise.sourceAnswer || !exercise.options.some(option => option.key === exercise.answer)) {
      fail(`${exercise.id} violates repaired Chapter 4 answer contract`);
    }
  }
  if (exercisesById.get('GL4-Q097')?.questionPages?.[0] !== 71 || exercisesById.get('GL4-Q102')?.questionPages?.[0] !== 71) fail('GL4-Q097–Q102 must retain PDF-071 source metadata');

  for (const sectionId of chapterFourSectionIds) {
    const unitPath = path.join(projectRoot, 'rule-units', 'gl4', `section-${sectionId}.json`);
    if (!requireFile(unitPath)) continue;
    const unit = readJson(unitPath);
    if (!unit) continue;
    if (unit.chapterId !== 'gl4' || unit.sectionId !== sectionId || !unit.id) fail(`Invalid Chapter 4 unit identity in ${path.basename(unitPath)}`);
    if (!unit.orientationZh?.text || unit.orientationZh.sourceType !== 'learning-note' || !Array.isArray(unit.quickDecision) || unit.quickDecision.length < 3 || unit.quickDecision.some(item => item.sourceType !== 'learning-note' || !item.text)) fail(`${sectionId} unit lacks usable Chinese orientation or quick decision`);
    if (!Array.isArray(unit.sourceRules) || !unit.sourceRules.length || unit.sourceRules.some(item => item.sourceType !== 'source-rule' || !item.text || !item.source?.pdfPages?.length || !item.source?.printedPages?.length)) fail(`${sectionId} unit lacks complete source-rule content`);
    if (unit.source?.cleanedSource !== 'cleaned-source/chapter-04.md' || !unit.source?.pdfPages?.length || !unit.source?.printedPages?.length) fail(`${sectionId} unit lacks Chapter 4 source traceability`);
    if (!Array.isArray(unit.atomicRules) || !unit.atomicRules.length || unit.atomicRules.some(rule => !rule.id || !knownRuleIds.has(rule.id) || !allowedSourceTypes.has(rule.sourceType))) fail(`${sectionId} unit lacks valid atomic rules`);
    const expectedAtomicIds = Object.entries(chapterFourExerciseToRules.ruleCatalog || {}).filter(([, rule]) => rule.sectionId === sectionId).map(([id]) => id).sort();
    const actualAtomicIds = unit.atomicRules.map(rule => rule.id).sort();
    if (expectedAtomicIds.join(',') !== actualAtomicIds.join(',')) fail(`${sectionId} atomic rule IDs differ from Chapter 4 rule catalog`);
    if (!Array.isArray(unit.tables) || unit.tables.some(table => table.sourceType !== 'source-table' || !table.headers?.length || !table.rows?.length || !table.markdown)) fail(`${sectionId} unit has an invalid source table`);
    const sourceCoverage = unit.sourceCoverage;
    if (!sourceCoverage || sourceCoverage.ruleItems?.total !== sourceCoverage.ruleItems?.captured || sourceCoverage.numberedItems?.total !== sourceCoverage.numberedItems?.captured || sourceCoverage.tables?.total !== sourceCoverage.tables?.captured || sourceCoverage.tables?.rowsTotal !== sourceCoverage.tables?.rowsCaptured || sourceCoverage.examples?.total !== sourceCoverage.examples?.captured || sourceCoverage.relatedExercises?.total !== sourceCoverage.relatedExercises?.explained || !Array.isArray(sourceCoverage.omitted) || sourceCoverage.omitted.length) fail(`${sectionId} source coverage ledger is incomplete`);
    if (unit.tables.length !== sourceCoverage.tables.total) fail(`${sectionId} table count differs from source coverage ledger`);
    if (!Array.isArray(unit.examples) || unit.examples.length !== sourceCoverage.examples.total || unit.examples.some(example => example.sourceType !== 'source-example' || !example.text)) fail(`${sectionId} unit source examples differ from coverage ledger`);
    if (!Array.isArray(unit.contrasts) || !unit.contrasts.length || !Array.isArray(unit.commonErrors) || !unit.commonErrors.length || !Array.isArray(unit.signalAnalysis) || !unit.signalAnalysis.length) fail(`${sectionId} unit lacks required analysis layers`);
    if (unit.reviewStatus !== 'needs-review') fail(`${sectionId} source-review state must remain visible`);
    const expectedExerciseIds = (reverseSections[sectionId]?.exerciseIds || []).slice().sort();
    const linkedExerciseIds = (unit.exerciseLinks || []).map(link => link.exerciseId).sort();
    if (expectedExerciseIds.join(',') !== linkedExerciseIds.join(',')) fail(`${sectionId} exercise links differ from Chapter 4 section mapping`);
    for (const link of unit.exerciseLinks || []) {
      const exercise = exercisesById.get(link.exerciseId);
      const entry = chapterFourExerciseToRules.exercises?.[link.exerciseId];
      if (!exercise || !entry) { fail(`${sectionId} links unknown Chapter 4 exercise ${link.exerciseId}`); continue; }
      if (link.status !== entry.status || JSON.stringify(link.ruleIds || []) !== JSON.stringify(entry.ruleIds || []) || JSON.stringify(link.candidateRuleIds || []) !== JSON.stringify(entry.candidateRuleIds || []) || !link.mappingReason) fail(`${link.exerciseId} unit link differs from Chapter 4 mapping`);
      if (link.status === 'mapped' && (!link.ruleIds?.length || !link.ruleIds.some(ruleId => actualAtomicIds.includes(ruleId)))) fail(`${link.exerciseId} lacks a linked local atomic mapped rule`);
      if (link.status === 'source-exercise-only' && (link.ruleIds?.length || link.candidateRuleIds?.length)) fail(`${link.exerciseId} must not fabricate a Chapter 4 rule ID`);
      const expectedDistractors = exercise.type === 'open-response' ? 0 : exercise.options.length - 1;
      if (link.sourceType !== 'exercise-example' || link.optionAnalysis?.sourceType !== 'learning-note' || !link.optionAnalysis.correct || !Array.isArray(link.optionAnalysis.distractors) || link.optionAnalysis.distractors.length !== expectedDistractors) fail(`${link.exerciseId} lacks a complete option/open-response analysis`);
    }
  }
  const chapterFourCoverageReport = fs.readFileSync(path.join(projectRoot, 'quality-reports', 'chapter-04-source-coverage.md'), 'utf8');
  const chapterFourQualityReport = fs.readFileSync(path.join(projectRoot, 'quality-reports', 'chapter-04-content-quality-review.md'), 'utf8');
  chapterFourSectionIds.forEach(sectionId => { if (!chapterFourCoverageReport.includes(`| ${sectionId} |`)) fail(`Chapter 4 source coverage report omits ${sectionId}`); });
  if (!chapterFourCoverageReport.includes('§4.5') || !chapterFourCoverageReport.includes('source-exercise-only') || !chapterFourQualityReport.includes('REVIEW') || !chapterFourQualityReport.includes('needs-review') || !chapterFourQualityReport.includes('source-exercise-only')) fail('Chapter 4 reports must keep source and mapping risks visible');

  const chapterOneCount = Object.keys(exerciseToRules?.exercises || {}).length;
  const chapterTwoCount = Object.keys(chapterTwoExerciseToRules?.exercises || {}).length;
  const chapterThreeCount = Object.keys(chapterThreeExerciseToRules?.exercises || {}).length;
  if ((coverage?.validatedExerciseMappingCount || 0) < chapterOneCount + chapterTwoCount + chapterThreeCount + entries.length) fail(`Coverage validated mapping count is below completed Chapters 1-4: ${coverage?.validatedExerciseMappingCount} vs ${chapterOneCount + chapterTwoCount + chapterThreeCount + entries.length}`);
}

if (chapterFiveExerciseToRules && chapterFiveSectionToExercises && chapterFiveMappingReview && chapterFiveRepairLedger) {
  const chapter = readJson(path.join(textbookRoot, 'ch0004.json'));
  const exercisesById = new Map((chapter?.exercises || []).map(exercise => [exercise.id, exercise]));
  const entries = Object.entries(chapterFiveExerciseToRules.exercises || {});
  const expectedIds = [...exercisesById.keys()];
  const knownRuleIds = new Set(Object.keys(chapterFiveExerciseToRules.ruleCatalog || {}));
  const allowedStatuses = new Set(['mapped', 'needs-review', 'source-exercise-only']);
  const allowedSourceTypes = new Set(['source-rule', 'source-table', 'source-example', 'exercise-example', 'learning-note', 'external-note']);
  const statusCounts = { mapped: 0, 'needs-review': 0, 'source-exercise-only': 0 };

  if (chapterFiveExerciseToRules.chapterId !== 'gl5') fail('Chapter 5 exercise-to-rules file must declare gl5');
  if (chapterFiveSectionToExercises.chapterId !== 'gl5') fail('Chapter 5 section-to-exercises file must declare gl5');
  if (chapterFiveMappingReview.chapterId !== 'gl5') fail('Chapter 5 mapping review must declare gl5');
  if (entries.length !== expectedIds.length) fail(`Expected ${expectedIds.length} Chapter 5 mapping entries, found ${entries.length}`);
  if (new Set(entries.map(([id]) => id)).size !== entries.length) fail('Duplicate exercise IDs in Chapter 5 mapping');
  expectedIds.forEach(id => { if (!chapterFiveExerciseToRules.exercises?.[id]) fail(`Chapter 5 exercise missing from mapping: ${id}`); });

  for (const [id, entry] of entries) {
    if (!exercisesById.has(id)) fail(`Unknown Chapter 5 exercise ID in mapping: ${id}`);
    if (entry.exerciseId !== id || entry.chapterId !== 'gl5') fail(`Invalid Chapter 5 mapping identity: ${id}`);
    if (!allowedStatuses.has(entry.status)) fail(`Invalid Chapter 5 mapping status for ${id}`);
    else statusCounts[entry.status] += 1;
    if (!entry.exerciseSectionId || !Array.isArray(entry.sectionIds) || !entry.sectionIds.length) fail(`Chapter 5 mapping has no explicit exercise/theory section: ${id}`);
    if (!entry.exercisePrintedPage || !entry.exercisePdfPage || !entry.theoryPrintedPages?.length || !entry.theoryPdfPages?.length || !entry.mappingReason) fail(`Chapter 5 mapping lacks traceability or rationale: ${id}`);
    [...(entry.ruleIds || []), ...(entry.candidateRuleIds || [])].forEach(ruleId => { if (!knownRuleIds.has(ruleId)) fail(`Unknown Chapter 5 rule ID for ${id}: ${ruleId}`); });
    if (entry.status === 'mapped' && !(entry.ruleIds || []).length) fail(`Mapped Chapter 5 exercise has no rule ID: ${id}`);
    if (entry.status === 'needs-review' && !(entry.candidateRuleIds || []).length) fail(`Needs-review Chapter 5 exercise has no candidate rule: ${id}`);
    if (entry.status === 'source-exercise-only' && ((entry.ruleIds || []).length || (entry.candidateRuleIds || []).length)) fail(`Source-only Chapter 5 exercise must not fabricate a rule: ${id}`);
  }
  if (statusCounts.mapped !== 75 || statusCounts['needs-review'] !== 0 || statusCounts['source-exercise-only'] !== 64) fail(`Unexpected Chapter 5 status split: ${JSON.stringify(statusCounts)}`);

  const q005 = chapterFiveExerciseToRules.exercises?.['GL5-Q005'];
  const q059 = chapterFiveExerciseToRules.exercises?.['GL5-Q059'];
  const q118 = chapterFiveExerciseToRules.exercises?.['GL5-Q118'];
  const q135 = chapterFiveExerciseToRules.exercises?.['GL5-Q135'];
  const q139 = chapterFiveExerciseToRules.exercises?.['GL5-Q139'];
  if (q005?.status !== 'mapped' || !q005.ruleIds?.includes('gl5-5.lexical-row-065')) fail('GL5-Q005 must retain the direct предоставление lexical mapping');
  if (q059?.status !== 'mapped' || !q059.ruleIds?.includes('gl5-5.2-libo-bookish-nibud')) fail('GL5-Q059 must retain the -либо bookish mapping');
  if (q118?.status !== 'mapped' || !q118.ruleIds?.includes('gl5-5.1-nom-instr-a-contrast')) fail('GL5-Q118 must retain the дружба дружбой mapping');
  if (q135?.status !== 'mapped' || !q135.ruleIds?.includes('gl5-5.1-ne-forms-no-possibility')) fail('GL5-Q135 must retain the не с кем + infinitive mapping');
  if (q139?.status !== 'mapped' || q139.ruleIds?.length !== 1 || q139.ruleIds?.[0] !== 'gl5-5.1-ne-forms-no-possibility') fail('GL5-Q139 must retain its independently checked PDF answer and source-linked mapping');

  const reverseSections = chapterFiveSectionToExercises.sections || {};
  for (const [id, entry] of entries) {
    for (const sectionId of entry.sectionIds || []) {
      if (!reverseSections[sectionId]?.exerciseIds?.includes(id)) fail(`Chapter 5 reverse mapping omits ${id} from ${sectionId}`);
    }
  }
  for (const [sectionId, section] of Object.entries(reverseSections)) {
    for (const id of section.exerciseIds || []) {
      if (!chapterFiveExerciseToRules.exercises?.[id]?.sectionIds?.includes(sectionId)) fail(`Chapter 5 reverse mapping has stale ${id} in ${sectionId}`);
    }
  }
  const summary = chapterFiveMappingReview.summary || {};
  if (summary.accounted !== entries.length || summary.mapped !== statusCounts.mapped || summary.needsReview !== statusCounts['needs-review'] || summary.sourceExerciseOnly !== statusCounts['source-exercise-only']) fail('Chapter 5 review status counts differ from mapping');
  if (summary.pdfAnswerKeyMismatches !== 17 || summary.questionPageMetadataCorrections !== 139 || summary.questionOrOptionMismatches !== 0) fail('Chapter 5 mapping review does not retain PDF audit totals');

  const expectedQuestionRange = Array.from({ length: 19 }, (_, index) => index + 70);
  if (JSON.stringify(chapter?.sourcePages?.questions || []) !== JSON.stringify(expectedQuestionRange)) fail('Chapter 5 source page range must cover printed pages 70-88');
  if (chapterFiveRepairLedger?.summary?.answerKeyMismatches !== 17 || chapterFiveRepairLedger?.summary?.questionPageMetadataCorrections !== 139 || chapterFiveRepairLedger?.summary?.questionOrOptionMismatches !== 0 || chapterFiveRepairLedger?.answerCorrections?.length !== 17 || chapterFiveRepairLedger?.questionPageCorrections?.length !== 139) fail('Chapter 5 PDF repair ledger is incomplete');
  for (const exercise of exercisesById.values()) {
    const entry = chapterFiveExerciseToRules.exercises?.[exercise.id];
    if (!entry || exercise.questionPages?.[0] !== entry.exercisePdfPage || exercise.answerPages?.[0] !== 127 || !exercise.sourceEvidence?.includes(`PDF-${String(entry.exercisePdfPage).padStart(3, '0')}`)) fail(`${exercise.id} lacks repaired Chapter 5 source metadata`);
    if (exercise.answer !== exercise.sourceAnswer || !exercise.options.some(option => option.key === exercise.answer)) fail(`${exercise.id} violates repaired Chapter 5 answer contract`);
  }

  for (const sectionId of chapterFiveSectionIds) {
    const unitPath = path.join(projectRoot, 'rule-units', 'gl5', `section-${sectionId}.json`);
    if (!requireFile(unitPath)) continue;
    const unit = readJson(unitPath);
    if (!unit) continue;
    if (unit.chapterId !== 'gl5' || unit.sectionId !== sectionId || !unit.id) fail(`Invalid Chapter 5 unit identity in ${path.basename(unitPath)}`);
    if (!unit.orientationZh?.text || unit.orientationZh.sourceType !== 'learning-note' || !Array.isArray(unit.quickDecision) || unit.quickDecision.length < 3 || unit.quickDecision.some(item => item.sourceType !== 'learning-note' || !item.text)) fail(`${sectionId} unit lacks usable Chinese orientation or quick decision`);
    if (!Array.isArray(unit.sourceRules) || !unit.sourceRules.length || unit.sourceRules.some(item => item.sourceType !== 'source-rule' || !item.text || !item.source?.pdfPages?.length || !item.source?.printedPages?.length)) fail(`${sectionId} unit lacks complete source-rule content`);
    if (unit.source?.cleanedSource !== 'cleaned-source/chapter-05.md' || !unit.source?.pdfPages?.length || !unit.source?.printedPages?.length) fail(`${sectionId} unit lacks Chapter 5 source traceability`);
    if (!Array.isArray(unit.atomicRules) || !unit.atomicRules.length || unit.atomicRules.some(rule => !rule.id || !knownRuleIds.has(rule.id) || !allowedSourceTypes.has(rule.sourceType))) fail(`${sectionId} unit lacks valid atomic rules`);
    const expectedAtomicIds = Object.entries(chapterFiveExerciseToRules.ruleCatalog || {}).filter(([, rule]) => rule.sectionId === sectionId).map(([id]) => id).sort();
    const actualAtomicIds = unit.atomicRules.map(rule => rule.id).sort();
    if (expectedAtomicIds.join(',') !== actualAtomicIds.join(',')) fail(`${sectionId} atomic rule IDs differ from Chapter 5 rule catalog`);
    if (!Array.isArray(unit.tables) || unit.tables.some(table => table.sourceType !== 'source-table' || !table.headers?.length || !table.rows?.length || !table.markdown)) fail(`${sectionId} unit has an invalid source table`);
    const sourceCoverage = unit.sourceCoverage;
    if (!sourceCoverage || sourceCoverage.ruleItems?.total !== sourceCoverage.ruleItems?.captured || sourceCoverage.numberedItems?.total !== sourceCoverage.numberedItems?.captured || sourceCoverage.tables?.total !== sourceCoverage.tables?.captured || sourceCoverage.tables?.rowsTotal !== sourceCoverage.tables?.rowsCaptured || sourceCoverage.examples?.total !== sourceCoverage.examples?.captured || sourceCoverage.relatedExercises?.total !== sourceCoverage.relatedExercises?.explained || !Array.isArray(sourceCoverage.omitted) || sourceCoverage.omitted.length) fail(`${sectionId} source coverage ledger is incomplete`);
    if (unit.tables.length !== sourceCoverage.tables.total) fail(`${sectionId} table count differs from source coverage ledger`);
    if (!Array.isArray(unit.examples) || unit.examples.length !== sourceCoverage.examples.total || unit.examples.some(example => example.sourceType !== 'source-example' || !example.text)) fail(`${sectionId} unit source examples differ from coverage ledger`);
    if (!Array.isArray(unit.contrasts) || !unit.contrasts.length || !Array.isArray(unit.commonErrors) || !unit.commonErrors.length || !Array.isArray(unit.signalAnalysis) || !unit.signalAnalysis.length) fail(`${sectionId} unit lacks required analysis layers`);
    if (unit.reviewStatus !== 'needs-review') fail(`${sectionId} source-review state must remain visible`);
    const expectedExerciseIds = (reverseSections[sectionId]?.exerciseIds || []).slice().sort();
    const linkedExerciseIds = (unit.exerciseLinks || []).map(link => link.exerciseId).sort();
    if (expectedExerciseIds.join(',') !== linkedExerciseIds.join(',')) fail(`${sectionId} exercise links differ from Chapter 5 section mapping`);
    for (const link of unit.exerciseLinks || []) {
      const exercise = exercisesById.get(link.exerciseId);
      const entry = chapterFiveExerciseToRules.exercises?.[link.exerciseId];
      if (!exercise || !entry) { fail(`${sectionId} links unknown Chapter 5 exercise ${link.exerciseId}`); continue; }
      if (link.status !== entry.status || JSON.stringify(link.ruleIds || []) !== JSON.stringify(entry.ruleIds || []) || JSON.stringify(link.candidateRuleIds || []) !== JSON.stringify(entry.candidateRuleIds || []) || !link.mappingReason) fail(`${link.exerciseId} unit link differs from Chapter 5 mapping`);
      if (link.status === 'mapped' && (!link.ruleIds?.length || !link.ruleIds.some(ruleId => actualAtomicIds.includes(ruleId)))) fail(`${link.exerciseId} lacks a linked local atomic mapped rule`);
      if (link.status === 'source-exercise-only' && (link.ruleIds?.length || link.candidateRuleIds?.length)) fail(`${link.exerciseId} must not fabricate a Chapter 5 rule ID`);
      if (link.sourceType !== 'exercise-example' || link.optionAnalysis?.sourceType !== 'learning-note' || !link.optionAnalysis.correct || !Array.isArray(link.optionAnalysis.distractors) || link.optionAnalysis.distractors.length !== exercise.options.length - 1) fail(`${link.exerciseId} lacks a complete option analysis`);
    }
  }
  const lexicalUnit = readJson(path.join(projectRoot, 'rule-units', 'gl5', 'section-5.lexical.json'));
  if (lexicalUnit && (lexicalUnit.tables?.length !== 6 || lexicalUnit.atomicRules?.length !== 87 || lexicalUnit.examples?.length !== 87 || lexicalUnit.sourceCoverage?.tables?.rowsTotal !== 87 || lexicalUnit.sourceCoverage?.tables?.rowsCaptured !== 87)) fail('Chapter 5 lexical tables/rows are incomplete or compressed');
  const chapterFiveCoverageReport = fs.readFileSync(path.join(projectRoot, 'quality-reports', 'chapter-05-source-coverage.md'), 'utf8');
  const chapterFiveQualityReport = fs.readFileSync(path.join(projectRoot, 'quality-reports', 'chapter-05-content-quality-review.md'), 'utf8');
  chapterFiveSectionIds.forEach(sectionId => { if (!chapterFiveCoverageReport.includes(`| ${sectionId} |`)) fail(`Chapter 5 source coverage report omits ${sectionId}`); });
  if (!chapterFiveCoverageReport.includes('87') || !chapterFiveCoverageReport.includes('source-exercise-only') || !chapterFiveQualityReport.includes('REVIEW') || !chapterFiveQualityReport.includes('source-exercise-only')) fail('Chapter 5 reports must keep source and mapping risks visible');

  const chapterOneCount = Object.keys(exerciseToRules?.exercises || {}).length;
  const chapterTwoCount = Object.keys(chapterTwoExerciseToRules?.exercises || {}).length;
  const chapterThreeCount = Object.keys(chapterThreeExerciseToRules?.exercises || {}).length;
  const chapterFourCount = Object.keys(chapterFourExerciseToRules?.exercises || {}).length;
  if (coverage?.validatedExerciseMappingCount !== chapterOneCount + chapterTwoCount + chapterThreeCount + chapterFourCount + entries.length) fail(`Coverage validated mapping count differs from completed Chapters 1-5: ${coverage?.validatedExerciseMappingCount} vs ${chapterOneCount + chapterTwoCount + chapterThreeCount + chapterFourCount + entries.length}`);
}

if (agreementLearningPage && sectionToExercises) {
  const allowedSourceTypes = new Set(['source-rule', 'source-table', 'source-example', 'exercise-example', 'learning-note', 'external-note']);
  const stages = agreementLearningPage.stages || [];
  const expectedStageIds = ['stage-title', 'stage-attribute', 'stage-compound', 'stage-predicate'];
  const actualStageIds = stages.map(stage => stage.id);
  if (agreementLearningPage.sectionId !== '1.1' || agreementLearningPage.chapterId !== 'gl1') fail('1.1 learning page has an invalid identity');
  if (actualStageIds.join(',') !== expectedStageIds.join(',')) fail(`1.1 learning stages must preserve the four agreement decision branches: ${actualStageIds.join(',')}`);
  if ((agreementLearningPage.mindMap || []).map(node => node.id).join(',') !== expectedStageIds.join(',')) fail('1.1 learning map must preserve title, register, compound-title and predicate branches');
  if (!agreementLearningPage.problem || !agreementLearningPage.scopeNote || !agreementLearningPage.mindMapIntro || (agreementLearningPage.objectives || []).length < 3) fail('1.1 learning page lacks the teaching problem, scope, objectives or map guidance');
  const exerciseIds = [];
  let checkCount = 0;
  for (const stage of stages) {
    if (!stage.title || !stage.question || !stage.entry?.ru || !stage.entry?.prompt) fail(`${stage.id} lacks a real context entry or teaching question`);
    if ((stage.teacherExplanation || []).length < 3 || stage.teacherExplanation.some(paragraph => paragraph.length < 35)) fail(`${stage.id} teacher explanation is too thin`);
    if (stage.sourceRule?.sourceType !== 'learning-note' || !stage.sourceRule.ru || !stage.sourceRule.zh || !stage.sourceEvidence?.ru || stage.sourceEvidence.sourceType !== 'source-rule' || !stage.sourceEvidence.source?.pdfPages?.length || !stage.sourceEvidence.source?.printedPages?.length) fail(`${stage.id} lacks separated learning notes and traceable source evidence`);
    if ((stage.sourceExamples || []).length < 2 || stage.sourceExamples.some(example => example.sourceType !== 'source-example' || !example.ru || !example.zh || !example.analysis || !example.source?.pdfPages?.length || !example.source?.printedPages?.length)) fail(`${stage.id} lacks complete page-traceable source-example analysis`);
    if ((stage.contrasts || []).length < 2 || stage.contrasts.some(contrast => !contrast.left || !contrast.right || !contrast.analysis)) fail(`${stage.id} lacks minimum contrasts`);
    if ((stage.signals || []).length < 2 || stage.signals.some(signal => !signal.words?.length || !signal.validWhen || !signal.failsWhen)) fail(`${stage.id} lacks signal-word boundaries`);
    if ((stage.commonErrors || []).length < 3) fail(`${stage.id} lacks common-error explanations`);
    if ((stage.checks || []).length < 2) fail(`${stage.id} lacks two formative checks`);
    for (const check of stage.checks || []) {
      checkCount += 1;
      if (!check.id || !check.prompt || !check.answer || !check.options?.some(option => option.key === check.answer)) fail(`${stage.id} has an invalid formative check`);
      if (!check.feedback?.correct || !check.feedback?.misconception || !check.feedback?.review || !check.feedback?.contrast) fail(`${check.id} lacks targeted wrong-answer feedback`);
      if (!check.retry || !check.retry.prompt || !check.retry.answer || !check.retry.options?.some(option => option.key === check.retry.answer)) fail(`${check.id} has no valid retry question`);
    }
    exerciseIds.push(...(stage.exerciseIds || []));
  }
  if (checkCount !== 8) fail(`1.1 learning page must contain 8 stage checks, found ${checkCount}`);
  const expectedExerciseIds = (sectionToExercises.sections?.['1.1']?.exerciseIds || []).slice().sort();
  if (new Set(exerciseIds).size !== exerciseIds.length || exerciseIds.slice().sort().join(',') !== expectedExerciseIds.join(',')) fail('1.1 learning page must embed all 13 mapped exercise IDs exactly once');
  const transferIds = (agreementLearningPage.transferTasks || []).map(task => task.id);
  if (!agreementLearningPage.finalCheck?.answer || !agreementLearningPage.finalCheck.options?.some(option => option.key === agreementLearningPage.finalCheck.answer) || transferIds.length !== 4 || !['transfer-context', 'transfer-rewrite', 'transfer-explain', 'transfer-boundary'].every(id => transferIds.includes(id))) fail('1.1 learning page lacks required transfer assessment');
  if ((agreementLearningPage.summaryTable || []).length !== 4 || agreementLearningPage.reviewStatus !== 'needs-review' || !(agreementLearningPage.riskRecord || []).some(risk => risk.includes('OCR'))) fail('1.1 learning page must preserve summary and OCR risk');
  for (const source of agreementLearningPage.sources || []) if (!allowedSourceTypes.has(source.sourceType)) fail(`Invalid 1.1 learning source type: ${source.sourceType}`);
}

if (quantityLearningPage && sectionToExercises) {
  const allowedSourceTypes = new Set(['source-rule', 'source-table', 'source-example', 'exercise-example', 'learning-note', 'external-note']);
  const stages = quantityLearningPage.stages || [];
  const expectedStageIds = ['stage-collective', 'stage-measure', 'stage-preposed', 'stage-distance', 'stage-action'];
  const actualStageIds = stages.map(stage => stage.id);
  if (quantityLearningPage.sectionId !== '1.2' || quantityLearningPage.chapterId !== 'gl1') fail('1.2 learning page has an invalid identity');
  if (actualStageIds.join(',') !== expectedStageIds.join(',')) fail(`1.2 learning stages must preserve the quantity, position and action decision axes: ${actualStageIds.join(',')}`);
  if ((quantityLearningPage.mindMap || []).map(node => node.id).join(',') !== expectedStageIds.join(',')) fail('1.2 learning map must preserve collective, measure, position, distance and action axes');
  if (!quantityLearningPage.problem || !quantityLearningPage.scopeNote || !quantityLearningPage.mindMapIntro || (quantityLearningPage.objectives || []).length < 3) fail('1.2 learning page lacks the teaching problem, scope, objectives or map guidance');
  const exerciseIds = [];
  let checkCount = 0;
  for (const stage of stages) {
    if (!stage.title || !stage.question || !stage.entry?.ru || !stage.entry?.prompt) fail(`${stage.id} lacks a real context entry or teaching question`);
    if ((stage.teacherExplanation || []).length < 3 || stage.teacherExplanation.some(paragraph => paragraph.length < 35)) fail(`${stage.id} teacher explanation is too thin`);
    if (stage.sourceRule?.sourceType !== 'learning-note' || !stage.sourceRule.ru || !stage.sourceRule.zh || !stage.sourceEvidence?.ru || stage.sourceEvidence.sourceType !== 'source-rule' || !stage.sourceEvidence.source?.pdfPages?.length || !stage.sourceEvidence.source?.printedPages?.length) fail(`${stage.id} lacks separated learning notes and traceable source evidence`);
    if ((stage.sourceExamples || []).length < 2 || stage.sourceExamples.some(example => example.sourceType !== 'source-example' || !example.ru || /\.\.\./.test(example.ru) || !example.zh || !example.analysis || !example.source?.pdfPages?.length || !example.source?.printedPages?.length)) fail(`${stage.id} lacks complete unabridged page-traceable source-example analysis`);
    if ((stage.contrasts || []).length < 2 || stage.contrasts.some(contrast => !contrast.left || !contrast.right || !contrast.analysis)) fail(`${stage.id} lacks minimum contrasts`);
    if ((stage.signals || []).length < 2 || stage.signals.some(signal => !signal.words?.length || !signal.validWhen || !signal.failsWhen)) fail(`${stage.id} lacks signal-word boundaries`);
    if ((stage.commonErrors || []).length < 3) fail(`${stage.id} lacks common-error explanations`);
    if ((stage.checks || []).length < 2) fail(`${stage.id} lacks two formative checks`);
    for (const check of stage.checks || []) {
      checkCount += 1;
      if (!check.id || !check.prompt || !check.answer || !check.options?.some(option => option.key === check.answer)) fail(`${stage.id} has an invalid formative check`);
      if (!check.feedback?.correct || !check.feedback?.misconception || !check.feedback?.review || !check.feedback?.contrast) fail(`${check.id} lacks targeted wrong-answer feedback`);
      if (!check.retry || !check.retry.prompt || !check.retry.answer || !check.retry.options?.some(option => option.key === check.retry.answer)) fail(`${check.id} has no valid retry question`);
    }
    exerciseIds.push(...(stage.exerciseIds || []));
  }
  if (checkCount !== 10) fail(`1.2 learning page must contain 10 stage checks, found ${checkCount}`);
  const expectedExerciseIds = (sectionToExercises.sections?.['1.2']?.exerciseIds || []).slice().sort();
  if (new Set(exerciseIds).size !== exerciseIds.length || exerciseIds.slice().sort().join(',') !== expectedExerciseIds.join(',')) fail('1.2 learning page must embed all 6 mapped exercise IDs exactly once');
  const transferIds = (quantityLearningPage.transferTasks || []).map(task => task.id);
  if (!quantityLearningPage.finalCheck?.answer || !quantityLearningPage.finalCheck.options?.some(option => option.key === quantityLearningPage.finalCheck.answer) || transferIds.length !== 4 || !['transfer-context', 'transfer-rewrite', 'transfer-explain', 'transfer-boundary'].every(id => transferIds.includes(id))) fail('1.2 learning page lacks required transfer assessment');
  if ((quantityLearningPage.summaryTable || []).length !== 4 || quantityLearningPage.reviewStatus !== 'needs-review' || !(quantityLearningPage.riskRecord || []).some(risk => risk.includes('OCR'))) fail('1.2 learning page must preserve summary and OCR risk');
  for (const source of quantityLearningPage.sources || []) if (!allowedSourceTypes.has(source.sourceType)) fail(`Invalid 1.2 learning source type: ${source.sourceType}`);
}

if (adjectiveLearningPage && sectionToExercises) {
  const stages = adjectiveLearningPage.stages || [];
  const expectedStageIds = ['stage-position', 'stage-meaning', 'stage-short-required', 'stage-opposites', 'stage-instrumental'];
  const exerciseIds = [];
  let checkCount = 0;
  if (adjectiveLearningPage.sectionId !== '1.3' || adjectiveLearningPage.chapterId !== 'gl1') fail('1.3 learning page has an invalid identity');
  if (stages.map(stage => stage.id).join(',') !== expectedStageIds.join(',') || (adjectiveLearningPage.mindMap || []).map(node => node.id).join(',') !== expectedStageIds.join(',')) fail('1.3 learning page must preserve its five syntax-and-meaning axes');
  if (!adjectiveLearningPage.problem || !adjectiveLearningPage.scopeNote || !adjectiveLearningPage.mindMapIntro || (adjectiveLearningPage.objectives || []).length < 3) fail('1.3 learning page lacks teaching guidance');
  for (const stage of stages) {
    if (!stage.title || !stage.question || !stage.entry?.ru || !stage.entry?.prompt || (stage.teacherExplanation || []).length < 3 || stage.teacherExplanation.some(text => text.length < 35)) fail(`${stage.id} lacks a complete teaching entry`);
    if (stage.sourceRule?.sourceType !== 'learning-note' || !stage.sourceRule?.ru || !stage.sourceRule?.zh || stage.sourceEvidence?.sourceType !== 'source-rule' || !stage.sourceEvidence?.ru || !stage.sourceEvidence?.source?.printedPages?.length || !stage.sourceEvidence?.source?.pdfPages?.length) fail(`${stage.id} lacks separated traceable source evidence`);
    if ((stage.sourceExamples || []).length < 2 || stage.sourceExamples.some(example => example.sourceType !== 'source-example' || !example.ru || /\.\.\./.test(example.ru) || !example.zh || !example.analysis || !example.source?.printedPages?.length || !example.source?.pdfPages?.length)) fail(`${stage.id} lacks complete unabridged source examples`);
    if ((stage.contrasts || []).length < 2 || (stage.signals || []).length < 2 || (stage.commonErrors || []).length < 3) fail(`${stage.id} lacks boundaries or contrasts`);
    for (const check of stage.checks || []) { checkCount += 1; if (!check.id || !check.answer || !check.options?.some(option => option.key === check.answer) || !check.feedback?.correct || !check.feedback?.misconception || !check.feedback?.review || !check.feedback?.contrast || !check.retry?.answer || !check.retry?.options?.some(option => option.key === check.retry.answer)) fail(`${check.id || stage.id} lacks actionable retry feedback`); }
    exerciseIds.push(...(stage.exerciseIds || []));
  }
  if (checkCount !== 10) fail(`1.3 learning page must contain 10 stage checks, found ${checkCount}`);
  const expectedExerciseIds = (sectionToExercises.sections?.['1.3']?.exerciseIds || []).slice().sort();
  if (new Set(exerciseIds).size !== exerciseIds.length || exerciseIds.slice().sort().join(',') !== expectedExerciseIds.join(',')) fail('1.3 learning page must embed all 18 mapped exercise IDs exactly once');
  const transferIds = (adjectiveLearningPage.transferTasks || []).map(task => task.id);
  if (!adjectiveLearningPage.finalCheck?.answer || !adjectiveLearningPage.finalCheck.options?.some(option => option.key === adjectiveLearningPage.finalCheck.answer) || transferIds.length !== 4 || !['transfer-context', 'transfer-rewrite', 'transfer-explain', 'transfer-boundary'].every(id => transferIds.includes(id))) fail('1.3 learning page lacks required transfer assessment');
  if ((adjectiveLearningPage.summaryTable || []).length !== 4 || adjectiveLearningPage.reviewStatus !== 'needs-review' || !(adjectiveLearningPage.riskRecord || []).some(risk => risk.includes('OCR'))) fail('1.3 learning page must preserve summary and OCR risk');
}

if (aspectLearningPage && sectionToExercises) {
  const expectedStageIds = ['stage-fact', 'stage-process', 'stage-repeat', 'stage-order', 'stage-result'];
  const allowedSourceTypes = new Set(['source-rule', 'source-table', 'source-example', 'exercise-example', 'learning-note', 'external-note']);
  const stages = aspectLearningPage.stages || [];
  const actualStageIds = stages.map(stage => stage.id);
  if (aspectLearningPage.sectionId !== '1.4.1' || aspectLearningPage.chapterId !== 'gl1') fail('1.4.1 learning page has an invalid identity');
  if (actualStageIds.join(',') !== expectedStageIds.join(',')) fail(`1.4.1 learning stages must preserve the confirmed five-stage order: ${actualStageIds.join(',')}`);
  if ((aspectLearningPage.decisionAxes || []).map(axis => axis.id).join(',') !== expectedStageIds.join(',') || (aspectLearningPage.timeGate?.items || []).length !== 3 || (aspectLearningPage.crossAxisWarnings || []).length !== 4) fail('1.4.1 learning map must contain the time gate, five decision axes and four cross-axis warnings');
  if (!aspectLearningPage.problem || !aspectLearningPage.scopeNote || (aspectLearningPage.objectives || []).length < 3) fail('1.4.1 learning page lacks the teaching problem, scope or objectives');
  const exerciseIds = [];
  let checkCount = 0;
  for (const stage of stages) {
    if (!stage.title || !stage.question || !stage.entry?.ru || !stage.entry?.prompt) fail(`${stage.id} lacks a real context entry or teaching question`);
    if ((stage.teacherExplanation || []).length < 3 || stage.teacherExplanation.some(paragraph => paragraph.length < 35)) fail(`${stage.id} teacher explanation is too thin`);
    if (stage.sourceRule?.sourceType !== 'learning-note' || !stage.sourceRule.ru || !stage.sourceRule.zh || !stage.sourceEvidence?.ru || stage.sourceEvidence.sourceType !== 'source-rule' || !stage.sourceEvidence.source?.pdfPages?.length || !stage.sourceEvidence.source?.printedPages?.length) fail(`${stage.id} lacks separated learning notes and traceable source evidence`);
    if ((stage.sourceExamples || []).length < 3 || stage.sourceExamples.some(example => example.sourceType !== 'source-example' || !example.ru || !example.zh || !example.analysis || !example.source?.pdfPages?.length || !example.source?.printedPages?.length)) fail(`${stage.id} lacks complete page-traceable source-example analysis`);
    if ((stage.contrasts || []).length < 2 || stage.contrasts.some(contrast => !contrast.left || !contrast.right || !contrast.analysis)) fail(`${stage.id} lacks minimum contrasts`);
    if ((stage.signals || []).length < 2 || stage.signals.some(signal => !signal.words?.length || !signal.validWhen || !signal.failsWhen)) fail(`${stage.id} lacks signal-word boundaries`);
    if ((stage.commonErrors || []).length < 3) fail(`${stage.id} lacks common-error explanations`);
    if ((stage.checks || []).length < 2) fail(`${stage.id} lacks two formative checks`);
    for (const check of stage.checks || []) {
      checkCount += 1;
      if (!check.id || !check.prompt || !check.answer || !check.options?.some(option => option.key === check.answer)) fail(`${stage.id} has an invalid formative check`);
      if (!check.feedback?.correct || !check.feedback?.misconception || !check.feedback?.review || !check.feedback?.contrast) fail(`${check.id} lacks targeted wrong-answer feedback`);
      if (!check.retry || !check.retry.prompt || !check.retry.answer || !check.retry.options?.some(option => option.key === check.retry.answer)) fail(`${check.id} has no valid retry question`);
    }
    exerciseIds.push(...(stage.exerciseIds || []));
  }
  if (checkCount !== 10) fail(`1.4.1 learning page must contain 10 stage checks, found ${checkCount}`);
  const expectedExerciseIds = (sectionToExercises.sections?.['1.4.1']?.exerciseIds || []).slice().sort();
  const actualExerciseIds = exerciseIds.slice().sort();
  if (new Set(exerciseIds).size !== exerciseIds.length || actualExerciseIds.join(',') !== expectedExerciseIds.join(',')) fail('1.4.1 learning page must embed all 13 mapped exercise IDs exactly once');
  const finalCheck = aspectLearningPage.finalCheck;
  if (!finalCheck?.id || !finalCheck.answer || !finalCheck.options?.some(option => option.key === finalCheck.answer) || !finalCheck.feedback?.misconception) fail('1.4.1 learning page lacks the final integrated check');
  const transferTasks = aspectLearningPage.transferTasks || [];
  if (transferTasks.length !== 4 || !transferTasks.some(task => task.id === 'transfer-past') || !transferTasks.some(task => task.id === 'transfer-future') || !transferTasks.some(task => task.id === 'transfer-rewrite') || !transferTasks.some(task => task.id === 'transfer-explain')) fail('1.4.1 learning page lacks the required past, future, rewrite and explanation transfer tasks');
  if ((aspectLearningPage.summaryTable || []).length !== 5) fail('1.4.1 learning page summary table must preserve all five oppositions');
  if (aspectLearningPage.reviewStatus !== 'needs-review' || !(aspectLearningPage.riskRecord || []).some(risk => risk.includes('OCR'))) fail('1.4.1 learning page must preserve source REVIEW risk');
  for (const source of aspectLearningPage.sources || []) if (!allowedSourceTypes.has(source.sourceType)) fail(`Invalid 1.4.1 learning source type: ${source.sourceType}`);
  const externalReferences = [aspectLearningPage.diagnostic?.source]
    .concat(stages.map(stage => stage.externalNote?.source))
    .concat((aspectLearningPage.sources || []).filter(source => source.sourceType === 'external-note'))
    .filter(Boolean);
  for (const source of externalReferences) {
    if (!source.label || /Yale Advanced Russian|Russian For Everyone/.test(source.label)) fail('1.4.1 external references must use learner-readable Chinese titles');
    if (!source.conclusion || !source.relevance || !source.boundary) fail(`1.4.1 external reference lacks Chinese conclusion, relevance or boundary: ${source.label || 'unknown'}`);
    if (source.originalLanguage !== '英文' || !source.url) fail(`1.4.1 external reference must retain an optional English verification URL: ${source.label || 'unknown'}`);
  }
}

if (negationLearningPage && sectionToExercises) {
  const allowedSourceTypes = new Set(['source-rule', 'source-table', 'source-example', 'exercise-example', 'learning-note', 'external-note']);
  const stages = negationLearningPage.stages || [];
  const expectedStageIds = ['stage-fact', 'stage-result', 'stage-categorical'];
  const actualStageIds = stages.map(stage => stage.id);
  if (negationLearningPage.sectionId !== '1.4.2' || negationLearningPage.chapterId !== 'gl1') fail('1.4.2 learning page has an invalid identity');
  if (actualStageIds.join(',') !== expectedStageIds.join(',')) fail(`1.4.2 learning stages must preserve the confirmed three-stage order: ${actualStageIds.join(',')}`);
  if ((negationLearningPage.mindMap || []).map(node => node.id).join(',') !== expectedStageIds.join(',')) fail('1.4.2 learning map must preserve the negation decision branches');
  if (!negationLearningPage.problem || !negationLearningPage.scopeNote || (negationLearningPage.objectives || []).length < 3) fail('1.4.2 learning page lacks the teaching problem, scope or objectives');
  const exerciseIds = [];
  let checkCount = 0;
  for (const stage of stages) {
    if (!stage.title || !stage.question || !stage.entry?.ru || !stage.entry?.prompt) fail(`${stage.id} lacks a real context entry or teaching question`);
    if ((stage.teacherExplanation || []).length < 3 || stage.teacherExplanation.some(paragraph => paragraph.length < 35)) fail(`${stage.id} teacher explanation is too thin`);
    if (stage.sourceRule?.sourceType !== 'learning-note' || !stage.sourceRule.ru || !stage.sourceRule.zh || !stage.sourceEvidence?.ru || stage.sourceEvidence.sourceType !== 'source-rule' || !stage.sourceEvidence.source?.pdfPages?.length || !stage.sourceEvidence.source?.printedPages?.length) fail(`${stage.id} lacks separated learning notes and traceable source evidence`);
    if ((stage.sourceExamples || []).length < 2 || stage.sourceExamples.some(example => example.sourceType !== 'source-example' || !example.ru || !example.zh || !example.analysis || !example.source?.pdfPages?.length || !example.source?.printedPages?.length)) fail(`${stage.id} lacks complete page-traceable source-example analysis`);
    if ((stage.contrasts || []).length < 2 || stage.contrasts.some(contrast => !contrast.left || !contrast.right || !contrast.analysis)) fail(`${stage.id} lacks minimum contrasts`);
    if ((stage.signals || []).length < 2 || stage.signals.some(signal => !signal.words?.length || !signal.validWhen || !signal.failsWhen)) fail(`${stage.id} lacks signal-word boundaries`);
    if ((stage.commonErrors || []).length < 3) fail(`${stage.id} lacks common-error explanations`);
    if ((stage.checks || []).length < 2) fail(`${stage.id} lacks two formative checks`);
    for (const check of stage.checks || []) {
      checkCount += 1;
      if (!check.id || !check.prompt || !check.answer || !check.options?.some(option => option.key === check.answer)) fail(`${stage.id} has an invalid formative check`);
      if (!check.feedback?.correct || !check.feedback?.misconception || !check.feedback?.review || !check.feedback?.contrast) fail(`${check.id} lacks targeted wrong-answer feedback`);
      if (!check.retry || !check.retry.prompt || !check.retry.answer || !check.retry.options?.some(option => option.key === check.retry.answer)) fail(`${check.id} has no valid retry question`);
    }
    exerciseIds.push(...(stage.exerciseIds || []));
  }
  if (checkCount !== 6) fail(`1.4.2 learning page must contain 6 stage checks, found ${checkCount}`);
  const expectedExerciseIds = (sectionToExercises.sections?.['1.4.2']?.exerciseIds || []).slice().sort();
  const actualExerciseIds = exerciseIds.slice().sort();
  if (new Set(exerciseIds).size !== exerciseIds.length || actualExerciseIds.join(',') !== expectedExerciseIds.join(',')) fail('1.4.2 learning page must embed all 3 mapped exercise IDs exactly once');
  const finalCheck = negationLearningPage.finalCheck;
  if (!finalCheck?.id || !finalCheck.answer || !finalCheck.options?.some(option => option.key === finalCheck.answer) || !finalCheck.feedback?.misconception) fail('1.4.2 learning page lacks the final integrated check');
  const transferTasks = negationLearningPage.transferTasks || [];
  if (transferTasks.length !== 4 || !transferTasks.some(task => task.id === 'transfer-past') || !transferTasks.some(task => task.id === 'transfer-future') || !transferTasks.some(task => task.id === 'transfer-rewrite') || !transferTasks.some(task => task.id === 'transfer-explain')) fail('1.4.2 learning page lacks the required past, future, rewrite and explanation transfer tasks');
  if ((negationLearningPage.summaryTable || []).length !== 3) fail('1.4.2 learning page summary table must preserve all three negation branches');
  if (negationLearningPage.reviewStatus !== 'needs-review' || !(negationLearningPage.riskRecord || []).some(risk => risk.includes('OCR'))) fail('1.4.2 learning page must preserve source REVIEW risk');
  for (const source of negationLearningPage.sources || []) if (!allowedSourceTypes.has(source.sourceType)) fail(`Invalid 1.4.2 learning source type: ${source.sourceType}`);
}

if (infinitiveLearningPage && sectionToExercises) {
  const allowedSourceTypes = new Set(['source-rule', 'source-table', 'source-example', 'exercise-example', 'learning-note', 'external-note']);
  const stages = infinitiveLearningPage.stages || [];
  const expectedStageIds = ['stage-process', 'stage-result', 'stage-repeat', 'stage-single'];
  const actualStageIds = stages.map(stage => stage.id);
  if (infinitiveLearningPage.sectionId !== '1.4.3' || infinitiveLearningPage.chapterId !== 'gl1') fail('1.4.3 learning page has an invalid identity');
  if (actualStageIds.join(',') !== expectedStageIds.join(',')) fail(`1.4.3 learning stages must preserve the confirmed four-stage order: ${actualStageIds.join(',')}`);
  if ((infinitiveLearningPage.decisionAxes || []).map(axis => axis.id).join(',') !== 'stage-process,stage-repeat') fail('1.4.3 learning map must preserve the process/result and repeat/single axes');
  if (!infinitiveLearningPage.problem || !infinitiveLearningPage.scopeNote || (infinitiveLearningPage.objectives || []).length < 3) fail('1.4.3 learning page lacks the teaching problem, scope or objectives');
  const exerciseIds = [];
  let checkCount = 0;
  for (const stage of stages) {
    if (!stage.title || !stage.question || !stage.entry?.ru || !stage.entry?.prompt) fail(`${stage.id} lacks a real context entry or teaching question`);
    if ((stage.teacherExplanation || []).length < 3 || stage.teacherExplanation.some(paragraph => paragraph.length < 35)) fail(`${stage.id} teacher explanation is too thin`);
    if (stage.sourceRule?.sourceType !== 'learning-note' || !stage.sourceRule.ru || !stage.sourceRule.zh || !stage.sourceEvidence?.ru || stage.sourceEvidence.sourceType !== 'source-rule' || !stage.sourceEvidence.source?.pdfPages?.length || !stage.sourceEvidence.source?.printedPages?.length) fail(`${stage.id} lacks separated learning notes and traceable source evidence`);
    if ((stage.sourceExamples || []).length < 2 || stage.sourceExamples.some(example => example.sourceType !== 'source-example' || !example.ru || !example.zh || !example.analysis || !example.source?.pdfPages?.length || !example.source?.printedPages?.length)) fail(`${stage.id} lacks complete page-traceable source-example analysis`);
    if ((stage.contrasts || []).length < 2 || stage.contrasts.some(contrast => !contrast.left || !contrast.right || !contrast.analysis)) fail(`${stage.id} lacks minimum contrasts`);
    if ((stage.signals || []).length < 2 || stage.signals.some(signal => !signal.words?.length || !signal.validWhen || !signal.failsWhen)) fail(`${stage.id} lacks signal-word boundaries`);
    if ((stage.commonErrors || []).length < 3) fail(`${stage.id} lacks common-error explanations`);
    if ((stage.checks || []).length < 2) fail(`${stage.id} lacks two formative checks`);
    for (const check of stage.checks || []) {
      checkCount += 1;
      if (!check.id || !check.prompt || !check.answer || !check.options?.some(option => option.key === check.answer)) fail(`${stage.id} has an invalid formative check`);
      if (!check.feedback?.correct || !check.feedback?.misconception || !check.feedback?.review || !check.feedback?.contrast) fail(`${check.id} lacks targeted wrong-answer feedback`);
      if (!check.retry || !check.retry.prompt || !check.retry.answer || !check.retry.options?.some(option => option.key === check.retry.answer)) fail(`${check.id} has no valid retry question`);
    }
    exerciseIds.push(...(stage.exerciseIds || []));
  }
  if (checkCount !== 8) fail(`1.4.3 learning page must contain 8 stage checks, found ${checkCount}`);
  const expectedExerciseIds = (sectionToExercises.sections?.['1.4.3']?.exerciseIds || []).slice().sort();
  const actualExerciseIds = exerciseIds.slice().sort();
  if (new Set(exerciseIds).size !== exerciseIds.length || actualExerciseIds.join(',') !== expectedExerciseIds.join(',')) fail('1.4.3 learning page must embed all 6 mapped exercise IDs exactly once');
  const finalCheck = infinitiveLearningPage.finalCheck;
  if (!finalCheck?.id || !finalCheck.answer || !finalCheck.options?.some(option => option.key === finalCheck.answer) || !finalCheck.feedback?.misconception) fail('1.4.3 learning page lacks the final integrated check');
  const transferTasks = infinitiveLearningPage.transferTasks || [];
  if (transferTasks.length !== 4 || !transferTasks.some(task => task.id === 'transfer-context') || !transferTasks.some(task => task.id === 'transfer-rewrite') || !transferTasks.some(task => task.id === 'transfer-explain') || !transferTasks.some(task => task.id === 'transfer-boundary')) fail('1.4.3 learning page lacks the required context, rewrite, explanation and boundary transfer tasks');
  if ((infinitiveLearningPage.summaryTable || []).length !== 3) fail('1.4.3 learning page summary table must preserve the two axes and lexical boundary');
  if (infinitiveLearningPage.reviewStatus !== 'needs-review' || !(infinitiveLearningPage.riskRecord || []).some(risk => risk.includes('OCR'))) fail('1.4.3 learning page must preserve source REVIEW risk');
  for (const source of infinitiveLearningPage.sources || []) if (!allowedSourceTypes.has(source.sourceType)) fail(`Invalid 1.4.3 learning source type: ${source.sourceType}`);
}

if (lexicalInfinitiveLearningPage && sectionToExercises) {
  const allowedSourceTypes = new Set(['source-rule', 'source-table', 'source-example', 'exercise-example', 'learning-note', 'external-note']);
  const stages = lexicalInfinitiveLearningPage.stages || [];
  const expectedStageIds = ['stage-phase', 'stage-habit', 'stage-negative', 'stage-perfective'];
  const actualStageIds = stages.map(stage => stage.id);
  if (lexicalInfinitiveLearningPage.sectionId !== '1.4.4' || lexicalInfinitiveLearningPage.chapterId !== 'gl1') fail('1.4.4 learning page has an invalid identity');
  if (actualStageIds.join(',') !== expectedStageIds.join(',')) fail(`1.4.4 learning stages must preserve the confirmed four-group order: ${actualStageIds.join(',')}`);
  if (!lexicalInfinitiveLearningPage.problem || !lexicalInfinitiveLearningPage.scopeNote || !lexicalInfinitiveLearningPage.mindMapIntro || (lexicalInfinitiveLearningPage.objectives || []).length < 3) fail('1.4.4 learning page lacks the teaching problem, lexical boundary, map guidance or objectives');
  const exerciseIds = [];
  let checkCount = 0;
  for (const stage of stages) {
    if (!stage.title || !stage.question || !stage.entry?.ru || !stage.entry?.prompt) fail(`${stage.id} lacks a real context entry or teaching question`);
    if ((stage.teacherExplanation || []).length < 3 || stage.teacherExplanation.some(paragraph => paragraph.length < 35)) fail(`${stage.id} teacher explanation is too thin`);
    if (stage.sourceRule?.sourceType !== 'learning-note' || !stage.sourceRule.ru || !stage.sourceRule.zh || !stage.sourceEvidence?.ru || stage.sourceEvidence.sourceType !== 'source-rule' || !stage.sourceEvidence.source?.pdfPages?.length || !stage.sourceEvidence.source?.printedPages?.length) fail(`${stage.id} lacks separated learning notes and traceable source evidence`);
    if ((stage.sourceExamples || []).length < 2 || stage.sourceExamples.some(example => example.sourceType !== 'source-example' || !example.ru || !example.zh || !example.analysis || !example.source?.pdfPages?.length || !example.source?.printedPages?.length)) fail(`${stage.id} lacks complete page-traceable source-example analysis`);
    if ((stage.contrasts || []).length < 2 || stage.contrasts.some(contrast => !contrast.left || !contrast.right || !contrast.analysis)) fail(`${stage.id} lacks minimum contrasts`);
    if ((stage.signals || []).length < 2 || stage.signals.some(signal => !signal.words?.length || !signal.validWhen || !signal.failsWhen)) fail(`${stage.id} lacks signal-word boundaries`);
    if ((stage.commonErrors || []).length < 3) fail(`${stage.id} lacks common-error explanations`);
    if ((stage.checks || []).length < 2) fail(`${stage.id} lacks two formative checks`);
    for (const check of stage.checks || []) {
      checkCount += 1;
      if (!check.id || !check.prompt || !check.answer || !check.options?.some(option => option.key === check.answer)) fail(`${stage.id} has an invalid formative check`);
      if (!check.feedback?.correct || !check.feedback?.misconception || !check.feedback?.review || !check.feedback?.contrast) fail(`${check.id} lacks targeted wrong-answer feedback`);
      if (!check.retry || !check.retry.prompt || !check.retry.answer || !check.retry.options?.some(option => option.key === check.retry.answer)) fail(`${check.id} has no valid retry question`);
    }
    exerciseIds.push(...(stage.exerciseIds || []));
  }
  if (checkCount !== 8) fail(`1.4.4 learning page must contain 8 stage checks, found ${checkCount}`);
  const expectedExerciseIds = (sectionToExercises.sections?.['1.4.4']?.exerciseIds || []).slice().sort();
  const actualExerciseIds = exerciseIds.slice().sort();
  if (new Set(exerciseIds).size !== exerciseIds.length || actualExerciseIds.join(',') !== expectedExerciseIds.join(',')) fail('1.4.4 learning page must embed all 13 mapped exercise IDs exactly once');
  const finalCheck = lexicalInfinitiveLearningPage.finalCheck;
  if (!finalCheck?.id || !finalCheck.answer || !finalCheck.options?.some(option => option.key === finalCheck.answer) || !finalCheck.feedback?.misconception) fail('1.4.4 learning page lacks the final integrated check');
  const transferTasks = lexicalInfinitiveLearningPage.transferTasks || [];
  if (transferTasks.length !== 4 || !transferTasks.some(task => task.id === 'transfer-lookup') || !transferTasks.some(task => task.id === 'transfer-context') || !transferTasks.some(task => task.id === 'transfer-rewrite') || !transferTasks.some(task => task.id === 'transfer-explain')) fail('1.4.4 learning page lacks the required lookup, context, rewrite and explanation transfer tasks');
  if ((lexicalInfinitiveLearningPage.summaryTable || []).length !== 4) fail('1.4.4 learning page summary table must preserve the lexical-group boundary');
  if (lexicalInfinitiveLearningPage.reviewStatus !== 'needs-review' || !(lexicalInfinitiveLearningPage.riskRecord || []).some(risk => risk.includes('OCR'))) fail('1.4.4 learning page must preserve source REVIEW risk');
  for (const source of lexicalInfinitiveLearningPage.sources || []) if (!allowedSourceTypes.has(source.sourceType)) fail(`Invalid 1.4.4 learning source type: ${source.sourceType}`);
}

if (cannotLearningPage && sectionToExercises) {
  const stages = cannotLearningPage.stages || [];
  const expectedStageIds = ['stage-prohibition', 'stage-impossibility'];
  const exerciseIds = [];
  let checkCount = 0;
  if (cannotLearningPage.sectionId !== '1.4.5' || cannotLearningPage.chapterId !== 'gl1') fail('1.4.5 learning page has an invalid identity');
  if (stages.map(stage => stage.id).join(',') !== expectedStageIds.join(',')) fail('1.4.5 learning page must preserve the prohibition/impossibility order');
  if (!cannotLearningPage.problem || !cannotLearningPage.scopeNote || !cannotLearningPage.mindMapIntro || (cannotLearningPage.mindMap || []).map(item => item.id).join(',') !== expectedStageIds.join(',')) fail('1.4.5 learning page lacks a bounded two-branch decision map');
  for (const stage of stages) {
    if (!stage.title || !stage.question || !stage.entry?.ru || !stage.entry?.prompt || (stage.teacherExplanation || []).length < 3) fail(`${stage.id} lacks a complete teaching entry`);
    if (stage.sourceRule?.sourceType !== 'learning-note' || stage.sourceEvidence?.sourceType !== 'source-rule' || !stage.sourceEvidence?.source?.printedPages?.length || !stage.sourceEvidence?.source?.pdfPages?.length) fail(`${stage.id} lacks source separation and page traceability`);
    if ((stage.sourceExamples || []).length < 2 || stage.sourceExamples.some(example => example.sourceType !== 'source-example' || !example.source?.printedPages?.length || !example.source?.pdfPages?.length)) fail(`${stage.id} lacks traceable source examples`);
    if ((stage.contrasts || []).length < 2 || (stage.signals || []).length < 2 || (stage.commonErrors || []).length < 3) fail(`${stage.id} lacks boundaries or minimum contrasts`);
    for (const check of stage.checks || []) {
      checkCount += 1;
      if (!check.id || !check.answer || !check.options?.some(option => option.key === check.answer) || !check.feedback?.correct || !check.feedback?.misconception || !check.feedback?.review || !check.feedback?.contrast || !check.retry?.answer || !check.retry?.options?.some(option => option.key === check.retry.answer)) fail(`${check.id || stage.id} lacks actionable retry feedback`);
    }
    exerciseIds.push(...(stage.exerciseIds || []));
  }
  if (checkCount !== 4) fail(`1.4.5 learning page must contain 4 stage checks, found ${checkCount}`);
  const expectedExerciseIds = (sectionToExercises.sections?.['1.4.5']?.exerciseIds || []).slice().sort();
  if (new Set(exerciseIds).size !== exerciseIds.length || exerciseIds.slice().sort().join(',') !== expectedExerciseIds.join(',')) fail('1.4.5 learning page must embed all 4 mapped exercise IDs exactly once');
  const transferIds = (cannotLearningPage.transferTasks || []).map(task => task.id);
  if (!cannotLearningPage.finalCheck?.answer || !cannotLearningPage.finalCheck.options?.some(option => option.key === cannotLearningPage.finalCheck.answer) || transferIds.length !== 4 || !['transfer-context', 'transfer-rewrite', 'transfer-explain', 'transfer-boundary'].every(id => transferIds.includes(id))) fail('1.4.5 learning page lacks required transfer assessment');
  if ((cannotLearningPage.summaryTable || []).length !== 3 || cannotLearningPage.reviewStatus !== 'needs-review' || !(cannotLearningPage.riskRecord || []).some(risk => risk.includes('OCR'))) fail('1.4.5 learning page must preserve summary and OCR risk');
}

if (negativeInfinitiveLearningPage && sectionToExercises) {
  const allowedSourceTypes = new Set(['source-rule', 'source-table', 'source-example', 'exercise-example', 'learning-note', 'external-note']);
  const stages = negativeInfinitiveLearningPage.stages || [];
  const expectedStageIds = ['stage-dependent', 'stage-independent-impossibility', 'stage-independent-suggestion', 'stage-moch', 'stage-advice'];
  const exerciseIds = [];
  let checkCount = 0;
  if (negativeInfinitiveLearningPage.sectionId !== '1.4.6' || negativeInfinitiveLearningPage.chapterId !== 'gl1') fail('1.4.6 learning page has an invalid identity');
  if (stages.map(stage => stage.id).join(',') !== expectedStageIds.join(',')) fail('1.4.6 learning page must preserve the confirmed five-framework order');
  if (!negativeInfinitiveLearningPage.problem || !negativeInfinitiveLearningPage.scopeNote || !negativeInfinitiveLearningPage.mindMapIntro || (negativeInfinitiveLearningPage.mindMap || []).map(item => item.id).join(',') !== expectedStageIds.join(',')) fail('1.4.6 learning page lacks a framework-first decision map');
  for (const stage of stages) {
    if (!stage.title || !stage.question || !stage.entry?.ru || !stage.entry?.prompt || (stage.teacherExplanation || []).length < 3) fail(`${stage.id} lacks a complete teaching entry`);
    if (stage.sourceRule?.sourceType !== 'learning-note' || !stage.sourceRule?.ru || !stage.sourceRule?.zh || stage.sourceEvidence?.sourceType !== 'source-rule' || !stage.sourceEvidence?.ru || !stage.sourceEvidence?.source?.printedPages?.length || !stage.sourceEvidence?.source?.pdfPages?.length) fail(`${stage.id} lacks source separation and page traceability`);
    if ((stage.sourceExamples || []).length < 2 || stage.sourceExamples.some(example => example.sourceType !== 'source-example' || !example.ru || !example.zh || !example.analysis || !example.source?.printedPages?.length || !example.source?.pdfPages?.length)) fail(`${stage.id} lacks traceable source examples`);
    if ((stage.contrasts || []).length < 2 || (stage.signals || []).length < 2 || (stage.commonErrors || []).length < 3) fail(`${stage.id} lacks boundaries or minimum contrasts`);
    for (const check of stage.checks || []) {
      checkCount += 1;
      if (!check.id || !check.answer || !check.options?.some(option => option.key === check.answer) || !check.feedback?.correct || !check.feedback?.misconception || !check.feedback?.review || !check.feedback?.contrast || !check.retry?.answer || !check.retry?.options?.some(option => option.key === check.retry.answer)) fail(`${check.id || stage.id} lacks actionable retry feedback`);
    }
    exerciseIds.push(...(stage.exerciseIds || []));
  }
  if (checkCount !== 10) fail(`1.4.6 learning page must contain 10 stage checks, found ${checkCount}`);
  const expectedExerciseIds = (sectionToExercises.sections?.['1.4.6']?.mappedIds || []).slice().sort();
  if (new Set(exerciseIds).size !== exerciseIds.length || exerciseIds.slice().sort().join(',') !== expectedExerciseIds.join(',')) fail('1.4.6 learning page must embed all 18 mapped exercise IDs exactly once and exclude source-exercise-only GL1-Q076');
  const transferIds = (negativeInfinitiveLearningPage.transferTasks || []).map(task => task.id);
  if (!negativeInfinitiveLearningPage.finalCheck?.answer || !negativeInfinitiveLearningPage.finalCheck.options?.some(option => option.key === negativeInfinitiveLearningPage.finalCheck.answer) || transferIds.length !== 4 || !['transfer-context', 'transfer-rewrite', 'transfer-explain', 'transfer-boundary'].every(id => transferIds.includes(id))) fail('1.4.6 learning page lacks required transfer assessment');
  if ((negativeInfinitiveLearningPage.summaryTable || []).length !== 4 || negativeInfinitiveLearningPage.reviewStatus !== 'needs-review' || !(negativeInfinitiveLearningPage.riskRecord || []).some(risk => risk.includes('OCR')) || !(negativeInfinitiveLearningPage.riskRecord || []).some(risk => risk.includes('GL1-Q078')) || !(negativeInfinitiveLearningPage.riskRecord || []).some(risk => risk.includes('GL1-Q076'))) fail('1.4.6 learning page must preserve both OCR and source-exercise boundary risks');
  for (const source of negativeInfinitiveLearningPage.sources || []) if (!allowedSourceTypes.has(source.sourceType)) fail(`Invalid 1.4.6 learning source type: ${source.sourceType}`);
}

if (imperativeLearningPage && sectionToExercises) {
  const stages = imperativeLearningPage.stages || [];
  const expectedStageIds = ['stage-routine', 'stage-task', 'stage-prompt', 'stage-invitation'];
  const exerciseIds = [];
  let checkCount = 0;
  if (imperativeLearningPage.sectionId !== '1.4.7' || imperativeLearningPage.chapterId !== 'gl1') fail('1.4.7 learning page has an invalid identity');
  if (stages.map(stage => stage.id).join(',') !== expectedStageIds.join(',')) fail('1.4.7 learning page must preserve the four imperative decision stages');
  if (!imperativeLearningPage.problem || !imperativeLearningPage.scopeNote || !imperativeLearningPage.mindMapIntro || (imperativeLearningPage.mindMap || []).map(item => item.id).join(',') !== expectedStageIds.join(',')) fail('1.4.7 learning page lacks an interaction-first decision map');
  for (const stage of stages) {
    if (!stage.title || !stage.question || !stage.entry?.ru || !stage.entry?.prompt || (stage.teacherExplanation || []).length < 3) fail(`${stage.id} lacks a complete teaching entry`);
    if (stage.sourceRule?.sourceType !== 'learning-note' || !stage.sourceRule?.ru || !stage.sourceRule?.zh || stage.sourceEvidence?.sourceType !== 'source-rule' || !stage.sourceEvidence?.ru || !stage.sourceEvidence?.source?.printedPages?.length || !stage.sourceEvidence?.source?.pdfPages?.length) fail(`${stage.id} lacks source separation and page traceability`);
    if ((stage.sourceExamples || []).length < 2 || stage.sourceExamples.some(example => example.sourceType !== 'source-example' || !example.ru || !example.zh || !example.analysis || !example.source?.printedPages?.length || !example.source?.pdfPages?.length)) fail(`${stage.id} lacks traceable source examples`);
    if ((stage.contrasts || []).length < 2 || (stage.signals || []).length < 2 || (stage.commonErrors || []).length < 3) fail(`${stage.id} lacks boundaries or minimum contrasts`);
    for (const check of stage.checks || []) {
      checkCount += 1;
      if (!check.id || !check.answer || !check.options?.some(option => option.key === check.answer) || !check.feedback?.correct || !check.feedback?.misconception || !check.feedback?.review || !check.feedback?.contrast || !check.retry?.answer || !check.retry?.options?.some(option => option.key === check.retry.answer)) fail(`${check.id || stage.id} lacks actionable retry feedback`);
    }
    exerciseIds.push(...(stage.exerciseIds || []));
  }
  if (checkCount !== 8) fail(`1.4.7 learning page must contain 8 stage checks, found ${checkCount}`);
  const expectedExerciseIds = (sectionToExercises.sections?.['1.4.7']?.mappedIds || []).slice().sort();
  if (new Set(exerciseIds).size !== exerciseIds.length || exerciseIds.slice().sort().join(',') !== expectedExerciseIds.join(',')) fail('1.4.7 learning page must embed all 6 mapped exercise IDs exactly once');
  const transferIds = (imperativeLearningPage.transferTasks || []).map(task => task.id);
  if (!imperativeLearningPage.finalCheck?.answer || !imperativeLearningPage.finalCheck.options?.some(option => option.key === imperativeLearningPage.finalCheck.answer) || transferIds.length !== 4 || !['transfer-context', 'transfer-rewrite', 'transfer-explain', 'transfer-boundary'].every(id => transferIds.includes(id))) fail('1.4.7 learning page lacks required transfer assessment');
  if ((imperativeLearningPage.summaryTable || []).length !== 4 || imperativeLearningPage.reviewStatus !== 'needs-review' || !(imperativeLearningPage.riskRecord || []).some(risk => risk.includes('OCR'))) fail('1.4.7 learning page must preserve source OCR risk');
}

if (negativeImperativeLearningPage && sectionToExercises) {
  const stages = negativeImperativeLearningPage.stages || [];
  const expectedStageIds = ['stage-prohibition', 'stage-warning', 'stage-counterfactual'];
  const exerciseIds = [];
  let checkCount = 0;
  if (negativeImperativeLearningPage.sectionId !== '1.4.8' || negativeImperativeLearningPage.chapterId !== 'gl1') fail('1.4.8 learning page has an invalid identity');
  if (stages.map(stage => stage.id).join(',') !== expectedStageIds.join(',')) fail('1.4.8 learning page must preserve prohibition, warning and counterfactual order');
  if (!negativeImperativeLearningPage.problem || !negativeImperativeLearningPage.scopeNote || !negativeImperativeLearningPage.mindMapIntro || (negativeImperativeLearningPage.mindMap || []).map(item => item.id).join(',') !== expectedStageIds.join(',')) fail('1.4.8 learning page lacks a three-branch decision map');
  for (const stage of stages) {
    if (!stage.title || !stage.question || !stage.entry?.ru || !stage.entry?.prompt || (stage.teacherExplanation || []).length < 3) fail(`${stage.id} lacks a complete teaching entry`);
    if (stage.sourceRule?.sourceType !== 'learning-note' || !stage.sourceRule?.ru || !stage.sourceRule?.zh || stage.sourceEvidence?.sourceType !== 'source-rule' || !stage.sourceEvidence?.ru || !stage.sourceEvidence?.source?.printedPages?.length || !stage.sourceEvidence?.source?.pdfPages?.length) fail(`${stage.id} lacks source separation and page traceability`);
    if ((stage.sourceExamples || []).length < 2 || stage.sourceExamples.some(example => example.sourceType !== 'source-example' || !example.ru || !example.zh || !example.analysis || !example.source?.printedPages?.length || !example.source?.pdfPages?.length)) fail(`${stage.id} lacks traceable source examples`);
    if ((stage.contrasts || []).length < 2 || (stage.signals || []).length < 2 || (stage.commonErrors || []).length < 3) fail(`${stage.id} lacks boundaries or minimum contrasts`);
    for (const check of stage.checks || []) {
      checkCount += 1;
      if (!check.id || !check.answer || !check.options?.some(option => option.key === check.answer) || !check.feedback?.correct || !check.feedback?.misconception || !check.feedback?.review || !check.feedback?.contrast || !check.retry?.answer || !check.retry?.options?.some(option => option.key === check.retry.answer)) fail(`${check.id || stage.id} lacks actionable retry feedback`);
    }
    exerciseIds.push(...(stage.exerciseIds || []));
  }
  if (checkCount !== 6) fail(`1.4.8 learning page must contain 6 stage checks, found ${checkCount}`);
  const expectedExerciseIds = (sectionToExercises.sections?.['1.4.8']?.mappedIds || []).slice().sort();
  if (new Set(exerciseIds).size !== exerciseIds.length || exerciseIds.slice().sort().join(',') !== expectedExerciseIds.join(',')) fail('1.4.8 learning page must embed all 6 mapped exercise IDs exactly once');
  const transferIds = (negativeImperativeLearningPage.transferTasks || []).map(task => task.id);
  if (!negativeImperativeLearningPage.finalCheck?.answer || !negativeImperativeLearningPage.finalCheck.options?.some(option => option.key === negativeImperativeLearningPage.finalCheck.answer) || transferIds.length !== 4 || !['transfer-context', 'transfer-rewrite', 'transfer-explain', 'transfer-boundary'].every(id => transferIds.includes(id))) fail('1.4.8 learning page lacks required transfer assessment');
  if ((negativeImperativeLearningPage.summaryTable || []).length !== 4 || negativeImperativeLearningPage.reviewStatus !== 'needs-review' || !(negativeImperativeLearningPage.riskRecord || []).some(risk => risk.includes('OCR'))) fail('1.4.8 learning page must preserve OCR risk');
}

if (supplementaryAspectReviewPage) {
  const stages = supplementaryAspectReviewPage.stages || [];
  const expectedStageIds = ['stage-past-future', 'stage-negative', 'stage-imperative', 'stage-negative-imperative'];
  const expectedExerciseIds = Array.from({ length: 19 }, (_, index) => `GL1-Q${String(index + 89).padStart(3, '0')}`);
  const exerciseIds = stages.flatMap(stage => stage.exerciseIds || []);
  const transferIds = (supplementaryAspectReviewPage.transferTasks || []).map(task => task.id);
  if (supplementaryAspectReviewPage.pageKind !== 'supplementary' || supplementaryAspectReviewPage.sectionId !== '1.5-review' || supplementaryAspectReviewPage.chapterId !== 'gl1') fail('1.5 review must remain a supplementary Chapter 1 page, not an original theory section');
  if (stages.map(stage => stage.id).join(',') !== expectedStageIds.join(',') || (supplementaryAspectReviewPage.mindMap || []).map(item => item.id).join(',') !== expectedStageIds.join(',')) fail('1.5 review must retain its four diagnostic routes');
  for (const stage of stages) {
    if (!stage.title || !stage.question || !stage.entry?.ru || !stage.entry?.prompt || (stage.teacherExplanation || []).length < 3) fail(`${stage.id} lacks complete review teaching guidance`);
    if (stage.sourceRule?.sourceType !== 'learning-note' || stage.sourceEvidence?.sourceType !== 'exercise-example' || !stage.sourceEvidence?.source?.printedPages?.length || !stage.sourceEvidence?.source?.pdfPages?.length) fail(`${stage.id} must distinguish supplementary guidance from original exercise evidence`);
    if ((stage.sourceExamples || []).length < 2 || stage.sourceExamples.some(example => example.sourceType !== 'exercise-example' || !example.source?.printedPages?.length || !example.source?.pdfPages?.length)) fail(`${stage.id} lacks traceable original exercise excerpts`);
    for (const check of stage.checks || []) if (!check.answer || !check.options?.some(option => option.key === check.answer) || !check.feedback?.misconception || !check.feedback?.review || !check.feedback?.contrast || !check.retry?.answer || !check.retry?.options?.some(option => option.key === check.retry.answer)) fail(`${check.id || stage.id} lacks actionable supplementary feedback and retry`);
  }
  if (new Set(exerciseIds).size !== exerciseIds.length || exerciseIds.join(',') !== expectedExerciseIds.join(',')) fail('1.5 review must reuse GL1-Q089-GL1-Q107 exactly once');
  if (!supplementaryAspectReviewPage.finalCheck?.answer || transferIds.length !== 4 || !['transfer-context', 'transfer-rewrite', 'transfer-explain', 'transfer-boundary'].every(id => transferIds.includes(id))) fail('1.5 review lacks its required transfer assessment');
  if (supplementaryAspectReviewPage.reviewStatus !== 'needs-review' || !(supplementaryAspectReviewPage.riskRecord || []).some(risk => risk.includes('OCR'))) fail('1.5 review must preserve its OCR review risk');
}

if (objectGovernmentLearningPage && chapterTwoSectionToExercises) {
  const stages = objectGovernmentLearningPage.stages || [];
  const expectedStageIds = ['stage-genitive', 'stage-dative', 'stage-na-acc', 'stage-instrumental', 'stage-frames'];
  const exerciseIds = stages.flatMap(stage => stage.exerciseIds || []);
  const expectedExerciseIds = (chapterTwoSectionToExercises.sections?.['2.1']?.mappedIds || []).slice().sort();
  const transferIds = (objectGovernmentLearningPage.transferTasks || []).map(task => task.id);
  if (objectGovernmentLearningPage.sectionId !== '2.1' || objectGovernmentLearningPage.chapterId !== 'gl2') fail('2.1 learning page has an invalid identity');
  if (stages.map(stage => stage.id).join(',') !== expectedStageIds.join(',') || (objectGovernmentLearningPage.mindMap || []).map(item => item.id).join(',') !== expectedStageIds.join(',')) fail('2.1 learning page must preserve its five object-government decision routes');
  for (const stage of stages) {
    if (!stage.title || !stage.question || !stage.entry?.ru || !stage.entry?.prompt || (stage.teacherExplanation || []).length < 3) fail(`${stage.id} lacks complete object-government teaching guidance`);
    if (stage.sourceRule?.sourceType !== 'learning-note' || stage.sourceEvidence?.sourceType !== 'source-table' || !stage.sourceEvidence?.ru || !stage.sourceEvidence?.source?.printedPages?.length || !stage.sourceEvidence?.source?.pdfPages?.length) fail(`${stage.id} lacks separated traceable original table evidence`);
    if ((stage.sourceExamples || []).length < 2 || stage.sourceExamples.some(example => example.sourceType !== 'source-example' || !example.ru || !example.zh || !example.analysis || !example.source?.printedPages?.length || !example.source?.pdfPages?.length)) fail(`${stage.id} lacks traceable table examples`);
    if ((stage.contrasts || []).length < 2 || (stage.signals || []).length < 2 || (stage.commonErrors || []).length < 3) fail(`${stage.id} lacks object-government boundaries`);
    for (const check of stage.checks || []) if (!check.id || !check.answer || !check.options?.some(option => option.key === check.answer) || !check.feedback?.correct || !check.feedback?.misconception || !check.feedback?.review || !check.feedback?.contrast || !check.retry?.answer || !check.retry?.options?.some(option => option.key === check.retry.answer)) fail(`${check.id || stage.id} lacks actionable object-government feedback and retry`);
  }
  if (new Set(exerciseIds).size !== exerciseIds.length || exerciseIds.slice().sort().join(',') !== expectedExerciseIds.join(',')) fail('2.1 learning page must embed all 22 mapped exercise IDs exactly once and exclude source-exercise-only items');
  if (!objectGovernmentLearningPage.finalCheck?.answer || transferIds.length !== 4 || !['transfer-context', 'transfer-rewrite', 'transfer-explain', 'transfer-boundary'].every(id => transferIds.includes(id))) fail('2.1 learning page lacks required transfer assessment');
  if ((objectGovernmentLearningPage.summaryTable || []).length !== 5 || objectGovernmentLearningPage.reviewStatus !== 'needs-review' || !(objectGovernmentLearningPage.riskRecord || []).some(risk => risk.includes('OCR')) || !(objectGovernmentLearningPage.riskRecord || []).some(risk => risk.includes('GL2-Q003')) || !(objectGovernmentLearningPage.riskRecord || []).some(risk => risk.includes('GL2-Q007')) || !(objectGovernmentLearningPage.riskRecord || []).some(risk => risk.includes('GL2-Q142'))) fail('2.1 learning page must preserve summary, OCR, and source-exercise-only boundaries');
}

if (instrumentalLearningPage && chapterTwoSectionToExercises) {
  const stages = instrumentalLearningPage.stages || [];
  const expectedStageIds = ['stage-feeling', 'stage-accompany', 'stage-quality', 'stage-test', 'stage-boundary'];
  const exerciseIds = stages.flatMap(stage => stage.exerciseIds || []);
  const expectedExerciseIds = (chapterTwoSectionToExercises.sections?.['2.3']?.mappedIds || []).slice().sort();
  const transferIds = (instrumentalLearningPage.transferTasks || []).map(task => task.id);
  if (instrumentalLearningPage.sectionId !== '2.3' || instrumentalLearningPage.chapterId !== 'gl2') fail('2.3 learning page has an invalid identity');
  if (stages.map(stage => stage.id).join(',') !== expectedStageIds.join(',') || (instrumentalLearningPage.mindMap || []).map(item => item.id).join(',') !== expectedStageIds.join(',')) fail('2.3 learning page must preserve its five instrumental decision axes');
  for (const stage of stages) {
    if (!stage.title || !stage.question || !stage.entry?.ru || !stage.entry?.prompt || (stage.teacherExplanation || []).length < 3) fail(`${stage.id} lacks complete instrumental teaching guidance`);
    if (stage.sourceRule?.sourceType !== 'source-rule' || !stage.sourceRule?.ru || !stage.sourceRule?.source?.printedPages?.length || !stage.sourceRule?.source?.pdfPages?.length) fail(`${stage.id} lacks traceable original instrumental rule evidence`);
    if (stage.sourceEvidence?.sourceType !== 'source-example' || !stage.sourceEvidence?.ru || !stage.sourceEvidence?.source?.printedPages?.length || !stage.sourceEvidence?.source?.pdfPages?.length) fail(`${stage.id} lacks traceable original instrumental examples`);
    if (!stage.sourceExamples?.length || !stage.contrasts?.length || !stage.signals?.length || !stage.commonErrors?.length) fail(`${stage.id} lacks instrumental analysis layers`);
    for (const check of stage.checks || []) if (!check.id || !check.answer || !check.options?.some(option => option.key === check.answer) || !check.feedback?.correct || !check.feedback?.misconception || !check.feedback?.review || !check.feedback?.contrast || !check.retry?.answer || !check.retry?.options?.some(option => option.key === check.retry.answer)) fail(`${check.id || stage.id} lacks actionable instrumental feedback and retry`);
  }
  if (new Set(exerciseIds).size !== exerciseIds.length || exerciseIds.slice().sort().join(',') !== expectedExerciseIds.join(',')) fail('2.3 learning page must embed all 12 mapped exercise IDs exactly once and exclude review/source-only items');
  if (!instrumentalLearningPage.finalCheck?.answer || transferIds.length !== 4 || !['transfer-context', 'transfer-rewrite', 'transfer-explain', 'transfer-boundary'].every(id => transferIds.includes(id))) fail('2.3 learning page lacks required transfer assessment');
  const risk = instrumentalLearningPage.riskRecord || [];
  if ((instrumentalLearningPage.summaryTable || []).length !== 5 || instrumentalLearningPage.reviewStatus !== 'needs-review' || !risk.some(item => item.includes('OCR')) || !risk.some(item => item.includes('GL2-Q036')) || !risk.some(item => item.includes('GL2-Q039')) || !risk.some(item => item.includes('GL2-Q045')) || !risk.some(item => item.includes('GL2-Q046')) || !risk.some(item => item.includes('GL2-Q139'))) fail('2.3 learning page must preserve summary, OCR, review, and source-exercise-only boundaries');
}

if (bareAttributeLearningPage && chapterTwoSectionToExercises) {
  const stages = bareAttributeLearningPage.stages || [];
  const expectedStageIds = ['stage-gate', 'stage-sphere', 'stage-whole', 'stage-quality', 'stage-comparison'];
  const exerciseIds = stages.flatMap(stage => stage.exerciseIds || []);
  const expectedExerciseIds = (chapterTwoSectionToExercises.sections?.['2.4.1']?.mappedIds || []).slice().sort();
  const transferIds = (bareAttributeLearningPage.transferTasks || []).map(task => task.id);
  if (bareAttributeLearningPage.sectionId !== '2.4.1' || bareAttributeLearningPage.chapterId !== 'gl2') fail('2.4.1 learning page has an invalid identity');
  if (stages.map(stage => stage.id).join(',') !== expectedStageIds.join(',') || (bareAttributeLearningPage.mindMap || []).map(item => item.id).join(',') !== expectedStageIds.join(',')) fail('2.4.1 learning page must preserve its five bare-attribute decision axes');
  for (const stage of stages) {
    if (!stage.title || !stage.question || !stage.entry?.ru || !stage.entry?.prompt || (stage.teacherExplanation || []).length < 3) fail(`${stage.id} lacks complete bare-attribute teaching guidance`);
    if (!['source-table', 'source-rule'].includes(stage.sourceRule?.sourceType) || !stage.sourceRule?.ru || !stage.sourceRule?.source?.printedPages?.length || !stage.sourceRule?.source?.pdfPages?.length) fail(`${stage.id} lacks traceable original bare-attribute rule evidence`);
    if (!['source-table', 'source-example'].includes(stage.sourceEvidence?.sourceType) || !stage.sourceEvidence?.ru || !stage.sourceEvidence?.source?.printedPages?.length || !stage.sourceEvidence?.source?.pdfPages?.length) fail(`${stage.id} lacks traceable original bare-attribute examples`);
    if (!stage.sourceExamples?.length || !stage.contrasts?.length || !stage.signals?.length || !stage.commonErrors?.length) fail(`${stage.id} lacks bare-attribute analysis layers`);
    for (const check of stage.checks || []) if (!check.id || !check.answer || !check.options?.some(option => option.key === check.answer) || !check.feedback?.correct || !check.feedback?.misconception || !check.feedback?.review || !check.feedback?.contrast || !check.retry?.answer || !check.retry?.options?.some(option => option.key === check.retry.answer)) fail(`${check.id || stage.id} lacks actionable bare-attribute feedback and retry`);
  }
  if (new Set(exerciseIds).size !== exerciseIds.length || exerciseIds.slice().sort().join(',') !== expectedExerciseIds.join(',')) fail('2.4.1 learning page must embed all 7 mapped exercise IDs exactly once');
  if (!bareAttributeLearningPage.finalCheck?.answer || transferIds.length !== 4 || !['transfer-context', 'transfer-rewrite', 'transfer-explain', 'transfer-boundary'].every(id => transferIds.includes(id))) fail('2.4.1 learning page lacks required transfer assessment');
  if ((bareAttributeLearningPage.summaryTable || []).length !== 5 || bareAttributeLearningPage.reviewStatus !== 'needs-review' || !(bareAttributeLearningPage.riskRecord || []).some(item => item.includes('OCR'))) fail('2.4.1 learning page must preserve summary and OCR review risk');
}

if (prepositionalAttributeLearningPage && chapterTwoSectionToExercises) {
  const stages = prepositionalAttributeLearningPage.stages || [];
  const expectedStageIds = ['stage-material', 'stage-acc', 'stage-feature-space', 'stage-infinitive', 'stage-boundary'];
  const exerciseIds = stages.flatMap(stage => stage.exerciseIds || []);
  const expectedExerciseIds = (chapterTwoSectionToExercises.sections?.['2.4.2']?.mappedIds || []).slice().sort();
  const transferIds = (prepositionalAttributeLearningPage.transferTasks || []).map(task => task.id);
  if (prepositionalAttributeLearningPage.sectionId !== '2.4.2' || prepositionalAttributeLearningPage.chapterId !== 'gl2') fail('2.4.2 learning page has an invalid identity');
  if (stages.map(stage => stage.id).join(',') !== expectedStageIds.join(',') || (prepositionalAttributeLearningPage.mindMap || []).map(item => item.id).join(',') !== expectedStageIds.join(',')) fail('2.4.2 learning page must preserve its five prepositional-attribute decision axes');
  for (const stage of stages) {
    if (!stage.title || !stage.question || !stage.entry?.ru || !stage.entry?.prompt || (stage.teacherExplanation || []).length < 3) fail(`${stage.id} lacks complete prepositional-attribute teaching guidance`);
    if (!['source-table', 'source-rule'].includes(stage.sourceRule?.sourceType) || !stage.sourceRule?.ru || !stage.sourceRule?.source?.printedPages?.length || !stage.sourceRule?.source?.pdfPages?.length) fail(`${stage.id} lacks traceable original prepositional-attribute rule evidence`);
    if (!['source-table', 'source-example', 'exercise-example'].includes(stage.sourceEvidence?.sourceType) || !stage.sourceEvidence?.ru || !stage.sourceEvidence?.source?.printedPages?.length || !stage.sourceEvidence?.source?.pdfPages?.length) fail(`${stage.id} lacks traceable original prepositional-attribute examples`);
    if (!stage.sourceExamples?.length || !stage.contrasts?.length || !stage.signals?.length || !stage.commonErrors?.length) fail(`${stage.id} lacks prepositional-attribute analysis layers`);
    for (const check of stage.checks || []) if (!check.id || !check.answer || !check.options?.some(option => option.key === check.answer) || !check.feedback?.correct || !check.feedback?.misconception || !check.feedback?.review || !check.feedback?.contrast || !check.retry?.answer || !check.retry?.options?.some(option => option.key === check.retry.answer)) fail(`${check.id || stage.id} lacks actionable prepositional-attribute feedback and retry`);
  }
  if (new Set(exerciseIds).size !== exerciseIds.length || exerciseIds.slice().sort().join(',') !== expectedExerciseIds.join(',')) fail('2.4.2 learning page must embed all 15 mapped exercise IDs exactly once and exclude needs-review items');
  if (!prepositionalAttributeLearningPage.finalCheck?.answer || transferIds.length !== 4 || !['transfer-context', 'transfer-rewrite', 'transfer-explain', 'transfer-boundary'].every(id => transferIds.includes(id))) fail('2.4.2 learning page lacks required transfer assessment');
  if ((prepositionalAttributeLearningPage.summaryTable || []).length !== 5 || prepositionalAttributeLearningPage.reviewStatus !== 'needs-review' || !(prepositionalAttributeLearningPage.riskRecord || []).some(item => item.includes('OCR')) || !(prepositionalAttributeLearningPage.riskRecord || []).some(item => item.includes('GL2-Q062'))) fail('2.4.2 learning page must preserve summary, OCR, and needs-review boundary');
}

if (attributeOverviewLearningPage && chapterTwoSectionToExercises) {
  const stages = attributeOverviewLearningPage.stages || [];
  const expectedStageIds = ['stage-head', 'stage-bare', 'stage-prep', 'stage-inf', 'stage-boundary'];
  const exerciseIds = stages.flatMap(stage => stage.exerciseIds || []);
  const expectedExerciseIds = (chapterTwoSectionToExercises.sections?.['2.4']?.mappedIds || []).slice().sort();
  if (attributeOverviewLearningPage.sectionId !== '2.4' || attributeOverviewLearningPage.chapterId !== 'gl2') fail('2.4 learning page has an invalid identity');
  if (stages.map(stage => stage.id).join(',') !== expectedStageIds.join(',') || (attributeOverviewLearningPage.mindMap || []).map(item => item.id).join(',') !== expectedStageIds.join(',')) fail('2.4 learning page must preserve its five relationship-routing axes');
  for (const stage of stages) {
    if (!stage.entry?.ru || !stage.entry?.prompt || (stage.teacherExplanation || []).length < 3 || !stage.sourceRule?.source?.printedPages?.length || !stage.sourceEvidence?.source?.pdfPages?.length || !stage.sourceExamples?.length || !stage.contrasts?.length || !stage.signals?.length || !stage.commonErrors?.length) fail(`${stage.id} lacks complete overview teaching layers`);
    for (const check of stage.checks || []) if (!check.feedback?.correct || !check.feedback?.misconception || !check.feedback?.review || !check.feedback?.contrast || !check.retry?.answer) fail(`${check.id || stage.id} lacks overview feedback and retry`);
  }
  if (new Set(exerciseIds).size !== exerciseIds.length || exerciseIds.slice().sort().join(',') !== expectedExerciseIds.join(',')) fail('2.4 learning page must embed all 21 mapped exercise IDs exactly once and exclude GL2-Q062');
  if ((attributeOverviewLearningPage.transferTasks || []).length !== 4 || attributeOverviewLearningPage.reviewStatus !== 'needs-review' || !(attributeOverviewLearningPage.riskRecord || []).some(item => item.includes('GL2-Q062'))) fail('2.4 learning page must preserve transfer and needs-review boundary');
}

if (timeRelationsLearningPage && chapterTwoSectionToExercises) {
  const stages = timeRelationsLearningPage.stages || [];
  const expectedStageIds = ['stage-period', 'stage-frequency', 'stage-duration', 'stage-sequence', 'stage-boundary'];
  const exerciseIds = stages.flatMap(stage => stage.exerciseIds || []);
  const expectedExerciseIds = (chapterTwoSectionToExercises.sections?.['2.5']?.mappedIds || []).slice().sort();
  const transferIds = (timeRelationsLearningPage.transferTasks || []).map(task => task.id);
  const excludedIds = ['GL2-Q070', 'GL2-Q089', 'GL2-Q137'];
  if (timeRelationsLearningPage.sectionId !== '2.5' || timeRelationsLearningPage.chapterId !== 'gl2') fail('2.5 learning page has an invalid identity');
  if (stages.map(stage => stage.id).join(',') !== expectedStageIds.join(',') || (timeRelationsLearningPage.mindMap || []).map(item => item.id).join(',') !== expectedStageIds.join(',')) fail('2.5 learning page must preserve its five time-relation decision axes');
  for (const stage of stages) {
    if (!stage.title || !stage.question || !stage.entry?.ru || !stage.entry?.prompt || (stage.teacherExplanation || []).length < 3) fail(`${stage.id} lacks complete time-relation teaching guidance`);
    if (stage.sourceRule?.sourceType !== 'source-rule' || !stage.sourceRule?.ru || !stage.sourceRule?.source?.printedPages?.length || !stage.sourceRule?.source?.pdfPages?.length) fail(`${stage.id} lacks traceable original time-relation rule evidence`);
    if (!['source-example', 'source-table', 'exercise-example'].includes(stage.sourceEvidence?.sourceType) || !stage.sourceEvidence?.ru || !stage.sourceEvidence?.source?.printedPages?.length || !stage.sourceEvidence?.source?.pdfPages?.length) fail(`${stage.id} lacks traceable original time-relation examples`);
    if (!stage.sourceExamples?.length || !stage.contrasts?.length || !stage.signals?.length || !stage.commonErrors?.length) fail(`${stage.id} lacks time-relation analysis layers`);
    for (const check of stage.checks || []) if (!check.id || !check.answer || !check.options?.some(option => option.key === check.answer) || !check.feedback?.correct || !check.feedback?.misconception || !check.feedback?.review || !check.feedback?.contrast || !check.retry?.answer || !check.retry?.options?.some(option => option.key === check.retry.answer)) fail(`${check.id || stage.id} lacks actionable time-relation feedback and retry`);
  }
  if (new Set(exerciseIds).size !== exerciseIds.length || exerciseIds.slice().sort().join(',') !== expectedExerciseIds.join(',')) fail('2.5 learning page must embed all 24 mapped exercise IDs exactly once');
  if (excludedIds.some(id => exerciseIds.includes(id))) fail('2.5 learning page must exclude GL2-Q070, GL2-Q089, and GL2-Q137 from formal practice');
  if (!timeRelationsLearningPage.finalCheck?.answer || transferIds.length !== 4 || !['transfer-context', 'transfer-rewrite', 'transfer-explain', 'transfer-boundary'].every(id => transferIds.includes(id))) fail('2.5 learning page lacks required transfer assessment');
  const risk = timeRelationsLearningPage.riskRecord || [];
  if ((timeRelationsLearningPage.summaryTable || []).length !== 5 || timeRelationsLearningPage.reviewStatus !== 'needs-review' || !risk.some(item => item.includes('OCR')) || !risk.some(item => item.includes('GL2-Q070')) || !risk.some(item => item.includes('GL2-Q089')) || !risk.some(item => item.includes('GL2-Q137'))) fail('2.5 learning page must preserve summary, OCR, and excluded-formal-item boundaries');
}

if (spatialRelationsLearningPage && chapterTwoSectionToExercises) {
  const stages = spatialRelationsLearningPage.stages || [];
  const expectedStageIds = ['stage-gate', 'stage-pairs', 'stage-person', 'stage-shape', 'stage-boundary'];
  const exerciseIds = stages.flatMap(stage => stage.exerciseIds || []);
  const expectedExerciseIds = (chapterTwoSectionToExercises.sections?.['2.6']?.mappedIds || []).slice().sort();
  const transferIds = (spatialRelationsLearningPage.transferTasks || []).map(task => task.id);
  if (spatialRelationsLearningPage.sectionId !== '2.6' || spatialRelationsLearningPage.chapterId !== 'gl2') fail('2.6 learning page has an invalid identity');
  if (stages.map(stage => stage.id).join(',') !== expectedStageIds.join(',') || (spatialRelationsLearningPage.decisionAxes || []).map(axis => axis.id).join(',') !== expectedStageIds.join(',')) fail('2.6 learning page must preserve its five spatial decision axes');
  if (!spatialRelationsLearningPage.entryGate?.items?.length || !spatialRelationsLearningPage.mindMapDescription) fail('2.6 learning page must use a space-question gate instead of a flat rule list');
  for (const stage of stages) {
    if (!stage.title || !stage.question || !stage.entry?.ru || !stage.entry?.prompt || (stage.teacherExplanation || []).length < 3) fail(`${stage.id} lacks complete spatial teaching guidance`);
    if (stage.sourceRule?.sourceType !== 'source-rule' || !stage.sourceRule?.ru || !stage.sourceRule?.source?.printedPages?.length || !stage.sourceRule?.source?.pdfPages?.length) fail(`${stage.id} lacks traceable original spatial rule evidence`);
    if (!['source-example', 'source-table', 'exercise-example'].includes(stage.sourceEvidence?.sourceType) || !stage.sourceEvidence?.ru || !stage.sourceEvidence?.source?.printedPages?.length || !stage.sourceEvidence?.source?.pdfPages?.length) fail(`${stage.id} lacks traceable original spatial examples`);
    if (!stage.sourceExamples?.length || !stage.sourceExamples.some(example => ['source-example', 'source-table'].includes(example.sourceType) && example.source?.printedPages?.length && example.source?.pdfPages?.length) || !stage.contrasts?.length || !stage.signals?.length || !stage.commonErrors?.length) fail(`${stage.id} lacks separated spatial analysis layers`);
    for (const check of stage.checks || []) if (!check.id || !check.answer || !check.options?.some(option => option.key === check.answer) || !check.feedback?.correct || !check.feedback?.misconception || !check.feedback?.review || !check.feedback?.contrast || !check.retry?.answer || !check.retry?.options?.some(option => option.key === check.retry.answer)) fail(`${check.id || stage.id} lacks actionable spatial feedback and retry`);
  }
  if (new Set(exerciseIds).size !== exerciseIds.length || exerciseIds.slice().sort().join(',') !== expectedExerciseIds.join(',')) fail('2.6 learning page must embed all 17 mapped exercise IDs exactly once');
  if (exerciseIds.includes('GL2-Q099')) fail('2.6 learning page must exclude GL2-Q099 from formal practice');
  if (!spatialRelationsLearningPage.finalCheck?.answer || transferIds.length !== 4 || !['transfer-context', 'transfer-rewrite', 'transfer-explain', 'transfer-boundary'].every(id => transferIds.includes(id))) fail('2.6 learning page lacks required transfer assessment');
  const risk = spatialRelationsLearningPage.riskRecord || [];
  if ((spatialRelationsLearningPage.summaryTable || []).length !== 5 || spatialRelationsLearningPage.reviewStatus !== 'needs-review' || !risk.some(item => item.includes('OCR')) || !risk.some(item => item.includes('GL2-Q099')) || !risk.some(item => item.includes('2.4.2'))) fail('2.6 learning page must preserve summary, OCR, source-only, and cross-section boundaries');
}

if (causalRelationsLearningPage && chapterTwoSectionToExercises) {
  const stages = causalRelationsLearningPage.stages || [];
  const expectedStageIds = ['stage-valence', 'stage-agency', 'stage-condition', 'stage-result', 'stage-boundary'];
  const exerciseIds = stages.flatMap(stage => stage.exerciseIds || []);
  const expectedExerciseIds = (chapterTwoSectionToExercises.sections?.['2.7']?.mappedIds || []).slice().sort();
  const transferIds = (causalRelationsLearningPage.transferTasks || []).map(task => task.id);
  if (causalRelationsLearningPage.sectionId !== '2.7' || causalRelationsLearningPage.chapterId !== 'gl2') fail('2.7 learning page has an invalid identity');
  if (stages.map(stage => stage.id).join(',') !== expectedStageIds.join(',') || (causalRelationsLearningPage.decisionAxes || []).map(axis => axis.id).join(',') !== expectedStageIds.join(',')) fail('2.7 learning page must preserve its five causal decision axes');
  if (!causalRelationsLearningPage.entryGate?.items?.length || !causalRelationsLearningPage.mindMapDescription) fail('2.7 learning page must use a cause-nature gate instead of a flat preposition list');
  for (const stage of stages) {
    if (!stage.title || !stage.question || !stage.entry?.ru || !stage.entry?.prompt || (stage.teacherExplanation || []).length < 3) fail(`${stage.id} lacks complete causal teaching guidance`);
    if (stage.sourceRule?.sourceType !== 'source-rule' || !stage.sourceRule?.ru || !stage.sourceRule?.source?.printedPages?.length || !stage.sourceRule?.source?.pdfPages?.length) fail(`${stage.id} lacks traceable original causal rule evidence`);
    if (!['source-example', 'source-table', 'exercise-example'].includes(stage.sourceEvidence?.sourceType) || !stage.sourceEvidence?.ru || !stage.sourceEvidence?.source?.printedPages?.length || !stage.sourceEvidence?.source?.pdfPages?.length) fail(`${stage.id} lacks traceable original causal examples`);
    if (!stage.sourceExamples?.length || !stage.sourceExamples.some(example => example.sourceType === 'source-example' && example.source?.printedPages?.length && example.source?.pdfPages?.length) || !stage.contrasts?.length || !stage.signals?.length || !stage.commonErrors?.length) fail(`${stage.id} lacks separated causal analysis layers`);
    for (const check of stage.checks || []) if (!check.id || !check.answer || !check.options?.some(option => option.key === check.answer) || !check.feedback?.correct || !check.feedback?.misconception || !check.feedback?.review || !check.feedback?.contrast || !check.retry?.answer || !check.retry?.options?.some(option => option.key === check.retry.answer)) fail(`${check.id || stage.id} lacks actionable causal feedback and retry`);
  }
  if (new Set(exerciseIds).size !== exerciseIds.length || exerciseIds.slice().sort().join(',') !== expectedExerciseIds.join(',')) fail('2.7 learning page must embed all 15 mapped exercise IDs exactly once');
  if (!causalRelationsLearningPage.finalCheck?.answer || transferIds.length !== 4 || !['transfer-context', 'transfer-rewrite', 'transfer-explain', 'transfer-boundary'].every(id => transferIds.includes(id))) fail('2.7 learning page lacks required transfer assessment');
  const risk = causalRelationsLearningPage.riskRecord || [];
  if ((causalRelationsLearningPage.summaryTable || []).length !== 5 || causalRelationsLearningPage.reviewStatus !== 'needs-review' || !risk.some(item => item.includes('OCR')) || !risk.some(item => item.includes('с(со)'))) fail('2.7 learning page must preserve summary, OCR, and colloquial-boundary risks');
}

if (goalRelationsLearningPage && chapterTwoSectionToExercises) {
  const stages = goalRelationsLearningPage.stages || [];
  const expectedStageIds = ['stage-gate', 'stage-dlya', 'stage-verb', 'stage-contrast', 'stage-boundary'];
  const exerciseIds = stages.flatMap(stage => stage.exerciseIds || []);
  const expectedExerciseIds = (chapterTwoSectionToExercises.sections?.['2.8']?.mappedIds || []).slice().sort();
  const transferIds = (goalRelationsLearningPage.transferTasks || []).map(task => task.id);
  const excludedIds = ['GL2-Q124', 'GL2-Q125', 'GL2-Q126', 'GL2-Q127', 'GL2-Q129', 'GL2-Q130', 'GL2-Q131', 'GL2-Q132', 'GL2-Q134', 'GL2-Q136'];
  if (goalRelationsLearningPage.sectionId !== '2.8' || goalRelationsLearningPage.chapterId !== 'gl2') fail('2.8 learning page has an invalid identity');
  if (stages.map(stage => stage.id).join(',') !== expectedStageIds.join(',') || (goalRelationsLearningPage.decisionAxes || []).map(axis => axis.id).join(',') !== expectedStageIds.join(',')) fail('2.8 learning page must preserve its five goal-relation decision axes');
  if (!goalRelationsLearningPage.entryGate?.items?.length || !goalRelationsLearningPage.mindMapDescription) fail('2.8 learning page must use a purpose gate instead of a flat preposition list');
  for (const stage of stages) {
    if (!stage.title || !stage.question || !stage.entry?.ru || !stage.entry?.prompt || (stage.teacherExplanation || []).length < 3) fail(`${stage.id} lacks complete goal-relation teaching guidance`);
    if (stage.sourceRule?.sourceType !== 'source-rule' || !stage.sourceRule?.ru || !stage.sourceRule?.source?.printedPages?.length || !stage.sourceRule?.source?.pdfPages?.length) fail(`${stage.id} lacks traceable original goal-rule evidence`);
    if (!['source-example', 'source-table', 'exercise-example'].includes(stage.sourceEvidence?.sourceType) || !stage.sourceEvidence?.ru || !stage.sourceEvidence?.source?.printedPages?.length || !stage.sourceEvidence?.source?.pdfPages?.length) fail(`${stage.id} lacks traceable original goal examples`);
    if (!stage.sourceExamples?.length || !stage.sourceExamples.some(example => example.sourceType === 'source-example' && example.source?.printedPages?.length && example.source?.pdfPages?.length) || !stage.contrasts?.length || !stage.signals?.length || !stage.commonErrors?.length) fail(`${stage.id} lacks separated goal analysis layers`);
    for (const check of stage.checks || []) if (!check.id || !check.answer || !check.options?.some(option => option.key === check.answer) || !check.feedback?.correct || !check.feedback?.misconception || !check.feedback?.review || !check.feedback?.contrast || !check.retry?.answer || !check.retry?.options?.some(option => option.key === check.retry.answer)) fail(`${check.id || stage.id} lacks actionable goal feedback and retry`);
  }
  if (new Set(exerciseIds).size !== exerciseIds.length || exerciseIds.slice().sort().join(',') !== expectedExerciseIds.join(',')) fail('2.8 learning page must embed all 4 mapped exercise IDs exactly once');
  if (excludedIds.some(id => exerciseIds.includes(id))) fail('2.8 learning page must exclude all needs-review goal exercises from formal practice');
  if (!goalRelationsLearningPage.finalCheck?.answer || transferIds.length !== 4 || !['transfer-context', 'transfer-rewrite', 'transfer-explain', 'transfer-boundary'].every(id => transferIds.includes(id))) fail('2.8 learning page lacks required transfer assessment');
  const risk = goalRelationsLearningPage.riskRecord || [];
  if ((goalRelationsLearningPage.summaryTable || []).length !== 5 || goalRelationsLearningPage.reviewStatus !== 'needs-review' || !risk.some(item => item.includes('OCR')) || !risk.some(item => item.includes('GL2-Q124')) || !risk.some(item => item.includes('ради、за、на'))) fail('2.8 learning page must preserve summary, OCR, and needs-review boundaries');
}

if (gerundOverviewLearningPage && chapterThreeSectionToExercises) {
  const stages = gerundOverviewLearningPage.stages || [];
  const expectedStageIds = ['stage-subject', 'stage-personal', 'stage-implicit', 'stage-impersonal', 'stage-boundary'];
  const exerciseIds = stages.flatMap(stage => stage.exerciseIds || []);
  const expectedExerciseIds = (chapterThreeSectionToExercises.sections?.['3.1']?.mappedIds || []).slice().sort();
  const transferIds = (gerundOverviewLearningPage.transferTasks || []).map(task => task.id);
  if (gerundOverviewLearningPage.sectionId !== '3.1' || gerundOverviewLearningPage.chapterId !== 'gl3') fail('3.1 learning page has an invalid identity');
  if (stages.map(stage => stage.id).join(',') !== expectedStageIds.join(',') || (gerundOverviewLearningPage.decisionAxes || []).map(axis => axis.id).join(',') !== expectedStageIds.join(',')) fail('3.1 learning page must preserve its five subject-routing decision axes');
  if (!gerundOverviewLearningPage.entryGate?.items?.length || !gerundOverviewLearningPage.mindMapDescription) fail('3.1 learning page must use a subject-consistency gate instead of a flat gerund list');
  for (const stage of stages) {
    if (!stage.title || !stage.question || !stage.entry?.ru || !stage.entry?.prompt || (stage.teacherExplanation || []).length < 3) fail(`${stage.id} lacks complete gerund teaching guidance`);
    if (stage.sourceRule?.sourceType !== 'source-rule' || !stage.sourceRule?.ru || !stage.sourceRule?.source?.printedPages?.length || !stage.sourceRule?.source?.pdfPages?.length) fail(`${stage.id} lacks traceable original gerund-rule evidence`);
    if (!['source-example', 'source-table', 'exercise-example'].includes(stage.sourceEvidence?.sourceType) || !stage.sourceEvidence?.ru || !stage.sourceEvidence?.source?.printedPages?.length || !stage.sourceEvidence?.source?.pdfPages?.length) fail(`${stage.id} lacks traceable original gerund examples`);
    if (!stage.sourceExamples?.length || !stage.sourceExamples.some(example => example.sourceType === 'source-example' && example.source?.printedPages?.length && example.source?.pdfPages?.length) || !stage.contrasts?.length || !stage.signals?.length || !stage.commonErrors?.length) fail(`${stage.id} lacks separated gerund analysis layers`);
    for (const check of stage.checks || []) if (!check.id || !check.answer || !check.options?.some(option => option.key === check.answer) || !check.feedback?.correct || !check.feedback?.misconception || !check.feedback?.review || !check.feedback?.contrast || !check.retry?.answer || !check.retry?.options?.some(option => option.key === check.retry.answer)) fail(`${check.id || stage.id} lacks actionable gerund feedback and retry`);
  }
  if (new Set(exerciseIds).size !== exerciseIds.length || exerciseIds.slice().sort().join(',') !== expectedExerciseIds.join(',')) fail('3.1 learning page must embed all 35 mapped exercise IDs exactly once');
  if (exerciseIds.includes('GL3-Q039')) fail('3.1 learning page must exclude GL3-Q039 from formal practice while it remains needs-review');
  if (!gerundOverviewLearningPage.finalCheck?.answer || transferIds.length !== 4 || !['gerund-transfer-context', 'gerund-transfer-rewrite', 'gerund-transfer-explain', 'gerund-transfer-boundary'].every(id => transferIds.includes(id))) fail('3.1 learning page lacks required transfer assessment');
  const risk = gerundOverviewLearningPage.riskRecord || [];
  if ((gerundOverviewLearningPage.summaryTable || []).length !== 5 || gerundOverviewLearningPage.reviewStatus !== 'needs-review' || !risk.some(item => item.includes('OCR')) || !risk.some(item => item.includes('GL3-Q039')) || !risk.some(item => item.includes('source-exercise-only'))) fail('3.1 learning page must preserve summary, OCR, Q039, and source-only boundaries');
}

if (gerundAllowedLearningPage && chapterThreeSectionToExercises) {
  const stages = gerundAllowedLearningPage.stages || [];
  const expectedStageIds = ['stage-explicit', 'stage-personal', 'stage-impersonal', 'stage-predicate', 'stage-rewrite'];
  const exerciseIds = stages.flatMap(stage => stage.exerciseIds || []);
  const expectedExerciseIds = (chapterThreeSectionToExercises.sections?.['3.1.1']?.mappedIds || []).slice().sort();
  const transferIds = (gerundAllowedLearningPage.transferTasks || []).map(task => task.id);
  if (gerundAllowedLearningPage.sectionId !== '3.1.1' || gerundAllowedLearningPage.chapterId !== 'gl3') fail('3.1.1 learning page has an invalid identity');
  if (stages.map(stage => stage.id).join(',') !== expectedStageIds.join(',') || (gerundAllowedLearningPage.decisionAxes || []).map(axis => axis.id).join(',') !== expectedStageIds.join(',')) fail('3.1.1 learning page must preserve its five allowed-use decision axes');
  if (!gerundAllowedLearningPage.entryGate?.items?.length || !gerundAllowedLearningPage.mindMapDescription) fail('3.1.1 learning page must use a shared-subject entry gate');
  for (const stage of stages) {
    if (!stage.title || !stage.question || !stage.entry?.ru || !stage.entry?.prompt || (stage.teacherExplanation || []).length < 3) fail(`${stage.id} lacks complete allowed-gerund teaching guidance`);
    if (stage.sourceRule?.sourceType !== 'source-rule' || !stage.sourceRule?.ru || !stage.sourceRule?.source?.printedPages?.length || !stage.sourceRule?.source?.pdfPages?.length) fail(`${stage.id} lacks traceable allowed-gerund rule evidence`);
    if (!['source-rule', 'source-example', 'source-table', 'exercise-example'].includes(stage.sourceEvidence?.sourceType) || !stage.sourceEvidence?.ru || !stage.sourceEvidence?.source?.printedPages?.length || !stage.sourceEvidence?.source?.pdfPages?.length) fail(`${stage.id} lacks traceable allowed-gerund examples`);
    if (!stage.sourceExamples?.length || !stage.sourceExamples.some(example => example.source?.printedPages?.length && example.source?.pdfPages?.length) || !stage.contrasts?.length || !stage.signals?.length || !stage.commonErrors?.length) fail(`${stage.id} lacks separated allowed-gerund analysis layers`);
    for (const check of stage.checks || []) if (!check.id || !check.answer || !check.options?.some(option => option.key === check.answer) || !check.feedback?.correct || !check.feedback?.misconception || !check.feedback?.review || !check.feedback?.contrast || !check.retry?.answer || !check.retry?.options?.some(option => option.key === check.retry.answer)) fail(`${check.id || stage.id} lacks actionable allowed-gerund feedback and retry`);
  }
  if (new Set(exerciseIds).size !== exerciseIds.length || exerciseIds.slice().sort().join(',') !== expectedExerciseIds.join(',')) fail('3.1.1 learning page must embed all 35 mapped exercise IDs exactly once');
  if (exerciseIds.includes('GL3-Q039')) fail('3.1.1 learning page must exclude GL3-Q039 from formal practice');
  if (!gerundAllowedLearningPage.finalCheck?.answer || transferIds.length !== 4 || !['allowed-transfer-context', 'allowed-transfer-rewrite', 'allowed-transfer-explain', 'allowed-transfer-boundary'].every(id => transferIds.includes(id))) fail('3.1.1 learning page lacks required transfer assessment');
  const risk = gerundAllowedLearningPage.riskRecord || [];
  if ((gerundAllowedLearningPage.summaryTable || []).length !== 5 || gerundAllowedLearningPage.reviewStatus !== 'needs-review' || !risk.some(item => item.includes('OCR')) || !risk.some(item => item.includes('GL3-Q039')) || !risk.some(item => item.includes('source-exercise-only'))) fail('3.1.1 learning page must preserve summary, OCR, Q039, and source-only boundaries');
}

if (gerundForbiddenLearningPage && chapterThreeSectionToExercises) {
  const stages = gerundForbiddenLearningPage.stages || [];
  const expectedStageIds = ['stage-two-subjects', 'stage-impersonal', 'stage-passive', 'stage-rewrite', 'stage-review'];
  const exerciseIds = stages.flatMap(stage => stage.exerciseIds || []);
  const transferIds = (gerundForbiddenLearningPage.transferTasks || []).map(task => task.id);
  if (gerundForbiddenLearningPage.sectionId !== '3.1.2' || gerundForbiddenLearningPage.chapterId !== 'gl3') fail('3.1.2 learning page has an invalid identity');
  if (stages.map(stage => stage.id).join(',') !== expectedStageIds.join(',') || (gerundForbiddenLearningPage.decisionAxes || []).map(axis => axis.id).join(',') !== expectedStageIds.join(',')) fail('3.1.2 learning page must preserve its five prohibition decision axes');
  if (!gerundForbiddenLearningPage.entryGate?.items?.length || !gerundForbiddenLearningPage.mindMapDescription) fail('3.1.2 learning page must use a responsibility-break entry gate');
  for (const stage of stages) {
    if (!stage.title || !stage.question || !stage.entry?.ru || !stage.entry?.prompt || (stage.teacherExplanation || []).length < 3) fail(`${stage.id} lacks complete forbidden-gerund teaching guidance`);
    if (stage.sourceRule?.sourceType !== 'source-rule' || !stage.sourceRule?.ru || !stage.sourceRule?.source?.printedPages?.length || !stage.sourceRule?.source?.pdfPages?.length) fail(`${stage.id} lacks traceable forbidden-gerund rule evidence`);
    if (!['source-rule', 'source-example', 'source-table', 'exercise-example'].includes(stage.sourceEvidence?.sourceType) || !stage.sourceEvidence?.ru || !stage.sourceEvidence?.source?.printedPages?.length || !stage.sourceEvidence?.source?.pdfPages?.length) fail(`${stage.id} lacks traceable forbidden-gerund examples`);
    if (!stage.sourceExamples?.length || !stage.sourceExamples.some(example => example.source?.printedPages?.length && example.source?.pdfPages?.length) || !stage.contrasts?.length || !stage.signals?.length || !stage.commonErrors?.length) fail(`${stage.id} lacks separated forbidden-gerund analysis layers`);
    for (const check of stage.checks || []) if (!check.id || !check.answer || !check.options?.some(option => option.key === check.answer) || !check.feedback?.correct || !check.feedback?.misconception || !check.feedback?.review || !check.feedback?.contrast || !check.retry?.answer || !check.retry?.options?.some(option => option.key === check.retry.answer)) fail(`${check.id || stage.id} lacks actionable forbidden-gerund feedback and retry`);
  }
  if (exerciseIds.length !== 0 || (chapterThreeSectionToExercises.sections?.['3.1.2']?.mappedIds || []).length !== 0) fail('3.1.2 learning page must not invent formal practice when only Q039 is needs-review');
  if (!gerundForbiddenLearningPage.finalCheck?.answer || transferIds.length !== 4 || !['forbidden-transfer-context', 'forbidden-transfer-rewrite', 'forbidden-transfer-explain', 'forbidden-transfer-boundary'].every(id => transferIds.includes(id))) fail('3.1.2 learning page lacks required transfer assessment');
  const risk = gerundForbiddenLearningPage.riskRecord || [];
  if ((gerundForbiddenLearningPage.summaryTable || []).length !== 5 || gerundForbiddenLearningPage.reviewStatus !== 'needs-review' || !risk.some(item => item.includes('OCR')) || !risk.some(item => item.includes('GL3-Q039')) || !risk.some(item => item.includes('没有 mapped 正式题'))) fail('3.1.2 learning page must preserve summary, OCR, Q039, and zero-official-practice boundaries');
}

if (conjunctionLearningPage && chapterFourSectionToExercises) {
  const stages = conjunctionLearningPage.stages || [];
  const expectedStageIds = ['stage-link', 'stage-contrast', 'stage-compensation', 'stage-distribution', 'stage-inventory'];
  const exerciseIds = stages.flatMap(stage => stage.exerciseIds || []);
  const expectedExerciseIds = (chapterFourSectionToExercises.sections?.['4.1']?.mappedIds || []).slice().sort();
  const transferIds = (conjunctionLearningPage.transferTasks || []).map(task => task.id);
  if (conjunctionLearningPage.sectionId !== '4.1' || conjunctionLearningPage.chapterId !== 'gl4') fail('4.1 learning page has an invalid identity');
  if (stages.map(stage => stage.id).join(',') !== expectedStageIds.join(',') || (conjunctionLearningPage.decisionAxes || []).map(axis => axis.id).join(',') !== expectedStageIds.join(',')) fail('4.1 learning page must preserve its five clause-relation decision axes');
  if (!conjunctionLearningPage.entryGate?.items?.length || !conjunctionLearningPage.mindMapDescription) fail('4.1 learning page must use a clause-relation entry gate instead of a flat conjunction list');
  for (const stage of stages) {
    if (!stage.title || !stage.question || !stage.entry?.ru || !stage.entry?.prompt || (stage.teacherExplanation || []).length < 3) fail(`${stage.id} lacks complete conjunction teaching guidance`);
    if (stage.sourceRule?.sourceType !== 'source-rule' || !stage.sourceRule?.ru || !stage.sourceRule?.source?.printedPages?.length || !stage.sourceRule?.source?.pdfPages?.length) fail(`${stage.id} lacks traceable original conjunction-rule evidence`);
    if (!['source-rule', 'source-example', 'source-table', 'exercise-example'].includes(stage.sourceEvidence?.sourceType) || !stage.sourceEvidence?.ru || !stage.sourceEvidence?.source?.printedPages?.length || !stage.sourceEvidence?.source?.pdfPages?.length) fail(`${stage.id} lacks traceable original conjunction examples`);
    if ((stage.sourceExamples || []).length < 2 || !stage.sourceExamples.every(example => example.sourceType === 'source-example' && example.ru && example.zh && example.analysis && example.source?.printedPages?.length && example.source?.pdfPages?.length) || (stage.contrasts || []).length < 2 || !stage.signals?.length || (stage.commonErrors || []).length < 3) fail(`${stage.id} lacks separated conjunction-analysis layers`);
    for (const check of stage.checks || []) if (!check.id || !check.answer || !check.options?.some(option => option.key === check.answer) || !check.feedback?.correct || !check.feedback?.misconception || !check.feedback?.review || !check.feedback?.contrast || !check.retry?.answer || !check.retry?.options?.some(option => option.key === check.retry.answer)) fail(`${check.id || stage.id} lacks actionable conjunction feedback and retry`);
  }
  if (new Set(exerciseIds).size !== exerciseIds.length || exerciseIds.slice().sort().join(',') !== expectedExerciseIds.join(',')) fail('4.1 learning page must embed all 24 mapped exercise IDs exactly once');
  if (!conjunctionLearningPage.finalCheck?.answer || transferIds.length !== 4 || !['conjunction-transfer-context', 'conjunction-transfer-rewrite', 'conjunction-transfer-explain', 'conjunction-transfer-boundary'].every(id => transferIds.includes(id))) fail('4.1 learning page lacks required transfer assessment');
  const risk = conjunctionLearningPage.riskRecord || [];
  if ((conjunctionLearningPage.summaryTable || []).length !== 5 || conjunctionLearningPage.reviewStatus !== 'needs-review' || !risk.some(item => item.includes('OCR')) || !risk.some(item => item.includes('24 道 mapped')) || !risk.some(item => item.includes('rr_zlatoust_learning_v1'))) fail('4.1 learning page must preserve summary, OCR, mapped-exercise, and progress-storage boundaries');
}

if (relativeWordLearningPage && chapterFourSectionToExercises) {
  const stages = relativeWordLearningPage.stages || [];
  const expectedStageIds = ['stage-route', 'stage-kakoi-comparison', 'stage-kakoi-class', 'stage-kotoryi', 'stage-chei'];
  const exerciseIds = stages.flatMap(stage => stage.exerciseIds || []);
  const expectedExerciseIds = (chapterFourSectionToExercises.sections?.['4.2']?.mappedIds || []).slice().sort();
  const transferIds = (relativeWordLearningPage.transferTasks || []).map(task => task.id);
  if (relativeWordLearningPage.sectionId !== '4.2' || relativeWordLearningPage.chapterId !== 'gl4') fail('4.2 learning page has an invalid identity');
  if (stages.map(stage => stage.id).join(',') !== expectedStageIds.join(',') || (relativeWordLearningPage.decisionAxes || []).map(axis => axis.id).join(',') !== expectedStageIds.join(',')) fail('4.2 learning page must preserve its five relative-word decision axes');
  if (!relativeWordLearningPage.entryGate?.items?.length || !relativeWordLearningPage.mindMapDescription) fail('4.2 learning page must use a semantic relative-word entry gate instead of a flat word list');
  for (const stage of stages) {
    if (!stage.title || !stage.question || !stage.entry?.ru || !stage.entry?.prompt || (stage.teacherExplanation || []).length < 3) fail(`${stage.id} lacks complete relative-word teaching guidance`);
    if (stage.sourceRule?.sourceType !== 'source-rule' || !stage.sourceRule?.ru || !stage.sourceRule?.source?.printedPages?.length || !stage.sourceRule?.source?.pdfPages?.length) fail(`${stage.id} lacks traceable original relative-word rule evidence`);
    if (!['source-rule', 'source-example', 'source-table', 'exercise-example'].includes(stage.sourceEvidence?.sourceType) || !stage.sourceEvidence?.ru || !stage.sourceEvidence?.source?.printedPages?.length || !stage.sourceEvidence?.source?.pdfPages?.length) fail(`${stage.id} lacks traceable original relative-word examples`);
    if ((stage.sourceExamples || []).length < 2 || !stage.sourceExamples.every(example => example.sourceType === 'source-example' && example.ru && example.zh && example.analysis && example.source?.printedPages?.length && example.source?.pdfPages?.length) || (stage.contrasts || []).length < 2 || !stage.signals?.length || (stage.commonErrors || []).length < 3) fail(`${stage.id} lacks separated relative-word analysis layers`);
    for (const check of stage.checks || []) if (!check.id || !check.answer || !check.options?.some(option => option.key === check.answer) || !check.feedback?.correct || !check.feedback?.misconception || !check.feedback?.review || !check.feedback?.contrast || !check.retry?.answer || !check.retry?.options?.some(option => option.key === check.retry.answer)) fail(`${check.id || stage.id} lacks actionable relative-word feedback and retry`);
  }
  if (new Set(exerciseIds).size !== exerciseIds.length || exerciseIds.slice().sort().join(',') !== expectedExerciseIds.join(',')) fail('4.2 learning page must embed all 13 mapped exercise IDs exactly once');
  if (!relativeWordLearningPage.finalCheck?.answer || transferIds.length !== 4 || !['relative-transfer-context', 'relative-transfer-rewrite', 'relative-transfer-explain', 'relative-transfer-boundary'].every(id => transferIds.includes(id))) fail('4.2 learning page lacks required transfer assessment');
  const risk = relativeWordLearningPage.riskRecord || [];
  if ((relativeWordLearningPage.summaryTable || []).length !== 5 || relativeWordLearningPage.reviewStatus !== 'needs-review' || !risk.some(item => item.includes('OCR')) || !risk.some(item => item.includes('source-exercise-only')) || !risk.some(item => item.includes('rr_zlatoust_learning_v1'))) fail('4.2 learning page must preserve summary, OCR, source-only, and progress-storage boundaries');
}

function validateChapterFourTimeOrRazPage(page, sectionId, expectedStageIds, expectedExerciseIds, transferIds, zeroOfficial) {
  const stages = page.stages || [];
  const exerciseIds = stages.flatMap(stage => stage.exerciseIds || []);
  if (page.sectionId !== sectionId || page.chapterId !== 'gl4') fail(`${sectionId} learning page has an invalid identity`);
  if (stages.map(stage => stage.id).join(',') !== expectedStageIds.join(',') || (page.decisionAxes || []).map(axis => axis.id).join(',') !== expectedStageIds.join(',')) fail(`${sectionId} learning page must preserve its five decision axes`);
  if (!page.entryGate?.items?.length || !page.mindMapDescription) fail(`${sectionId} learning page must use an entry gate instead of a flat conjunction list`);
  for (const stage of stages) {
    if (!stage.title || !stage.question || !stage.entry?.ru || !stage.entry?.prompt || (stage.teacherExplanation || []).length < 3) fail(`${sectionId}:${stage.id} lacks complete teaching guidance`);
    if (stage.sourceRule?.sourceType !== 'source-rule' || !stage.sourceRule?.ru || !stage.sourceRule?.source?.printedPages?.length || !stage.sourceRule?.source?.pdfPages?.length) fail(`${sectionId}:${stage.id} lacks traceable source-rule evidence`);
    if (!['source-rule', 'source-example', 'source-table', 'exercise-example'].includes(stage.sourceEvidence?.sourceType) || !stage.sourceEvidence?.ru || !stage.sourceEvidence?.source?.printedPages?.length || !stage.sourceEvidence?.source?.pdfPages?.length) fail(`${sectionId}:${stage.id} lacks traceable source evidence`);
    if (!stage.sourceExamples?.some(example => example.sourceType === 'source-example' && example.source?.printedPages?.length && example.source?.pdfPages?.length) || !stage.contrasts?.length || !stage.signals?.length || (stage.commonErrors || []).length < 3) fail(`${sectionId}:${stage.id} lacks source/example/contrast/error layers`);
    for (const check of stage.checks || []) if (!check.id || !check.answer || !check.options?.some(option => option.key === check.answer) || !check.feedback?.correct || !check.feedback?.misconception || !check.feedback?.review || !check.feedback?.contrast || !check.retry?.answer || !check.retry?.options?.some(option => option.key === check.retry.answer)) fail(`${sectionId}:${check.id || stage.id} lacks actionable feedback and retry`);
  }
  if (new Set(exerciseIds).size !== exerciseIds.length || exerciseIds.slice().sort().join(',') !== expectedExerciseIds.slice().sort().join(',')) fail(`${sectionId} learning page must embed its mapped exercise IDs exactly once`);
  if (zeroOfficial && exerciseIds.length !== 0) fail(`${sectionId} learning page must not invent formal practice`);
  if (!page.finalCheck?.answer || (page.transferTasks || []).map(task => task.id).join(',') !== transferIds.join(',')) fail(`${sectionId} learning page lacks required transfer assessment`);
  const risk = page.riskRecord || [];
  if ((page.summaryTable || []).length !== 5 || page.reviewStatus !== 'needs-review' || !risk.some(item => item.includes('OCR')) || !risk.some(item => item.includes('rr_zlatoust_learning_v1'))) fail(`${sectionId} learning page must preserve summary, OCR, and learning-storage boundaries`);
}

if (timeConjunctionLearningPage && chapterFourSectionToExercises) validateChapterFourTimeOrRazPage(timeConjunctionLearningPage, '4.3', ['stage-line', 'stage-kogda-sync', 'stage-poka-sync', 'stage-kogda-sequence', 'stage-poka-ne'], (chapterFourSectionToExercises.sections?.['4.3']?.mappedIds || []).slice(), ['time-transfer-context', 'time-transfer-rewrite', 'time-transfer-explain', 'time-transfer-boundary'], false);
if (razLearningPage && chapterFourSectionToExercises) validateChapterFourTimeOrRazPage(razLearningPage, '4.4', ['stage-route', 'stage-ground', 'stage-cause', 'stage-reality', 'stage-once'], [], ['raz-transfer-context', 'raz-transfer-rewrite', 'raz-transfer-explain', 'raz-transfer-boundary'], true);

function validateChapterFiveLearningPage(page, sectionId, expectedStageIds, expectedTransferIds, extraRisk) {
  const expectedExerciseIds = (chapterFiveSectionToExercises.sections?.[sectionId]?.mappedIds || []).slice().sort();
  const stages = page.stages || [];
  const exerciseIds = stages.flatMap(stage => stage.exerciseIds || []);
  const transferIds = (page.transferTasks || []).map(task => task.id);
  if (page.sectionId !== sectionId || page.chapterId !== 'gl5') fail(`${sectionId} learning page has an invalid identity`);
  if (stages.map(stage => stage.id).join(',') !== expectedStageIds.join(',') || (page.decisionAxes || []).map(axis => axis.id).join(',') !== expectedStageIds.join(',')) fail(`${sectionId} learning page must preserve its declared semantic decision axes`);
  if (!page.entryGate?.items?.length || !page.mindMapDescription || !page.mindMapIntro) fail(`${sectionId} learning page lacks a separate learning route and decision-map entry gate`);
  for (const stage of stages) {
    if (!stage.title || !stage.question || !stage.entry?.ru || !stage.entry?.prompt || (stage.teacherExplanation || []).length < 3 || stage.teacherExplanation.some(item => item.length < 35)) fail(`${sectionId}:${stage.id} lacks a full context-to-teacher teaching entry`);
    if (!['source-rule', 'source-table'].includes(stage.sourceRule?.sourceType) || !stage.sourceRule?.ru || !stage.sourceRule?.zh || !stage.sourceRule?.source?.printedPages?.length || !stage.sourceRule?.source?.pdfPages?.length) fail(`${sectionId}:${stage.id} lacks traceable original rule/table evidence`);
    if (!['source-rule', 'source-table'].includes(stage.sourceEvidence?.sourceType) || !stage.sourceEvidence?.ru || !stage.sourceEvidence?.zh || !stage.sourceEvidence?.source?.printedPages?.length || !stage.sourceEvidence?.source?.pdfPages?.length) fail(`${sectionId}:${stage.id} lacks a second traceable original evidence layer`);
    if ((stage.sourceExamples || []).length < 2 || !stage.sourceExamples.every(item => item.sourceType === 'source-example' && item.ru && item.zh && item.analysis && item.source?.printedPages?.length && item.source?.pdfPages?.length)) fail(`${sectionId}:${stage.id} lacks complete page-traceable source examples`);
    if ((stage.contrasts || []).length < 2 || (stage.signals || []).length < 2 || (stage.commonErrors || []).length < 3) fail(`${sectionId}:${stage.id} lacks comparisons, decision boundaries, or error analysis`);
    if ((stage.checks || []).length < 2) fail(`${sectionId}:${stage.id} lacks immediate checks and real retries`);
    for (const check of stage.checks || []) {
      if (!check.id || !check.prompt || !check.answer || !check.options?.some(option => option.key === check.answer) || !check.feedback?.correct || !check.feedback?.misconception || !check.feedback?.review || !check.feedback?.contrast || !check.retry?.prompt || !check.retry?.answer || !check.retry?.options?.some(option => option.key === check.retry.answer)) fail(`${sectionId}:${check.id || stage.id} lacks targeted feedback or a valid same-type retry`);
    }
  }
  if (new Set(exerciseIds).size !== exerciseIds.length || exerciseIds.slice().sort().join(',') !== expectedExerciseIds.join(',')) fail(`${sectionId} learning page must embed every mapped formal exercise exactly once`);
  if (!page.finalCheck?.answer || !page.finalCheck.options?.some(option => option.key === page.finalCheck.answer) || transferIds.join(',') !== expectedTransferIds.join(',')) fail(`${sectionId} learning page lacks its final check or four transfer tasks`);
  const risk = page.riskRecord || [];
  if ((page.summaryTable || []).length !== expectedStageIds.length || page.reviewStatus !== 'needs-review' || !risk.some(item => item.includes('OCR')) || !risk.some(item => item.includes('rr_zlatoust_learning_v1')) || (extraRisk && !risk.some(item => item.includes(extraRisk)))) fail(`${sectionId} learning page must preserve its summary, OCR, storage, and source-boundary risk record`);
}

if (chapterFiveStyleLearningPage && chapterFiveSectionToExercises) validateChapterFiveLearningPage(chapterFiveStyleLearningPage, '5.1', ['stage-recurrence', 'stage-emphatic-choice', 'stage-acceptance', 'stage-evaluation-impossibility'], ['style-transfer-context', 'style-transfer-rewrite', 'style-transfer-explain', 'style-transfer-boundary']);
if (chapterFiveIndefiniteLearningPage && chapterFiveSectionToExercises) validateChapterFiveLearningPage(chapterFiveIndefiniteLearningPage, '5.2', ['stage-information', 'stage-open-choice', 'stage-place-time', 'stage-preposition'], ['indef-transfer-context', 'indef-transfer-rewrite', 'indef-transfer-explain', 'indef-transfer-boundary']);
if (chapterFiveLexicalLearningPage && chapterFiveSectionToExercises) validateChapterFiveLearningPage(chapterFiveLexicalLearningPage, '5.lexical', ['stage-object-collaboration', 'stage-choice-landscape', 'stage-quantifier-material', 'stage-social-mental', 'stage-terms-collocations'], ['lex-transfer-context', 'lex-transfer-rewrite', 'lex-transfer-explain', 'lex-transfer-boundary'], 'source-exercise-only');

const result = {
  status: failures.length ? 'FAIL' : 'REVIEW',
  projectRoot,
  exercises: exerciseIds.size,
  theorySections: sectionIndex?.sections?.length || 0,
  failures,
  warnings
};

console.log(JSON.stringify(result, null, 2));
if (failures.length) process.exitCode = 1;
