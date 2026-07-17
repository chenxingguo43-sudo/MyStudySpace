const PILOT_ANSWERS = ['В', 'В', 'Б', 'А', 'Г', 'Г', 'А', 'А', 'А', 'Б'];
const OPTION_KEYS = ['А', 'Б', 'В', 'Г'];

function toSafeText(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function validateExercise(exercise) {
  const errors = [];
  if (!/^(?:Q\d{3}|P\d+-Q\d{3})$/.test(exercise.id || '')) errors.push('exercise.id must be QNNN or Pn-Qnnn');
  if (exercise.type !== 'single-choice') errors.push(`${exercise.id}: type must be single-choice`);
  if (!exercise.question) errors.push(`${exercise.id}: question is required`);
  if (!Array.isArray(exercise.options) || exercise.options.length < 2 || exercise.options.length > 4) errors.push(`${exercise.id}: two to four options are required`);
  const optionKeys = Array.isArray(exercise.options) ? exercise.options.map(option => option.key) : [];
  if (optionKeys.join(',') !== OPTION_KEYS.slice(0, optionKeys.length).join(',')) errors.push(`${exercise.id}: option keys must be a leading sequence of А,Б,В,Г`);
  if (!optionKeys.includes(exercise.answer)) errors.push(`${exercise.id}: invalid answer`);
  if (exercise.answer !== exercise.sourceAnswer) errors.push(`${exercise.id}: answer must equal sourceAnswer`);
  if (!exercise.sourceEvidence) errors.push(`${exercise.id}: sourceEvidence is required`);
  if (!exercise.sourceExplanation) errors.push(`${exercise.id}: sourceExplanation is required`);
  if (!String(exercise.referenceExplanation || '').includes('参考解析（AI，待复核）')) errors.push(`${exercise.id}: referenceExplanation needs 参考解析（AI，待复核） label`);
  if (!Array.isArray(exercise.questionPages) || !exercise.questionPages.length) errors.push(`${exercise.id}: questionPages is required`);
  if (!Array.isArray(exercise.answerPages) || !exercise.answerPages.length) errors.push(`${exercise.id}: answerPages is required`);
  if (!['verified', 'needs_review'].includes(exercise.reviewStatus)) errors.push(`${exercise.id}: invalid reviewStatus`);
  return errors;
}

function validateChapter(chapter) {
  const errors = [];
  if (!Number.isInteger(chapter.index) || chapter.index < 0) errors.push('chapter.index must be a non-negative integer');
  if (!chapter.title || !chapter.module) errors.push('chapter title and module are required');
  if (chapter.format !== 'quiz-first') errors.push('chapter.format must be quiz-first');
  if (!chapter.sourcePages || !chapter.sourcePages.questions?.length || !chapter.sourcePages.answers?.length) errors.push('chapter sourcePages questions and answers are required');
  if (!Array.isArray(chapter.exercises) || !chapter.exercises.length) errors.push('chapter exercises are required');
  (chapter.exercises || []).forEach(exercise => errors.push(...validateExercise(exercise)));
  return errors;
}

function validateUnit(unit) {
  const errors = [];
  if (!/^[a-z0-9-]+$/.test(unit.id || '')) errors.push('unit.id must be a stable slug');
  if (!Number.isInteger(unit.chapterIndex) || unit.chapterIndex < 0) errors.push('unit.chapterIndex must be non-negative');
  if (!Number.isInteger(unit.part) || unit.part < 1) errors.push('unit.part must be positive');
  errors.push(...validateChapter({
    index: unit.chapterIndex,
    title: unit.title,
    module: unit.module,
    format: unit.format,
    sourcePages: unit.sourcePages,
    exercises: unit.exercises
  }));
  (unit.exercises || []).forEach(exercise => {
    if (!/^P\d+-Q\d{3}$/.test(exercise.id || '')) errors.push(`${exercise.id}: exercise id must be Pn-Qnnn`);
    if (!Number.isInteger(exercise.printedNumber) || exercise.printedNumber < 1) errors.push(`${exercise.id}: printedNumber is required`);
  });
  return errors;
}

function validateUnitManifest(manifest) {
  const errors = [], chapterIndexes = new Set(), unitIds = new Set();
  (manifest.units || []).forEach(unit => {
    errors.push(...validateUnit(unit));
    if (chapterIndexes.has(unit.chapterIndex)) errors.push(`${unit.id}: chapterIndex must be unique`);
    if (unitIds.has(unit.id)) errors.push(`${unit.id}: unit.id must be unique`);
    chapterIndexes.add(unit.chapterIndex); unitIds.add(unit.id);
  });
  return errors;
}

function assertPilotAnswerVector(chapter) {
  const actual = chapter.exercises.map(exercise => exercise.answer);
  if (actual.join('|') !== PILOT_ANSWERS.join('|')) throw new Error(`Pilot answers differ: ${actual.join(', ')}`);
}

function getStudyPointExerciseIds(point, part, byExercise) {
  if (Array.isArray(point.exerciseIds)) return point.exerciseIds;
  return (point.questionRanges || []).flatMap(range => {
    if (!Array.isArray(range) || range.length !== 2 || !Number.isInteger(range[0]) || !Number.isInteger(range[1]) || range[0] > range[1]) return [];
    const ids = [];
    for (let number = range[0]; number <= range[1]; number++) {
      const id = `P${part}-Q${String(number).padStart(3, '0')}`;
      if (byExercise.has(id)) ids.push(id);
    }
    return ids;
  });
}

function validateStudyNavigation({ navigation, units }) {
  const errors = [];
  const byUnit = new Map((units || []).map(unit => [unit.id, unit]));
  const byExercise = new Map((units || []).flatMap(unit =>
    (unit.exercises || []).map(exercise => [exercise.id, { exercise, unit }])
  ));
  const seenParts = new Set();
  const seenExercises = new Set();
  (navigation && navigation.parts || []).forEach(part => {
    if (seenParts.has(part.id)) errors.push(`${part.id}: part id must be unique`);
    seenParts.add(part.id);
    (part.unitIds || []).forEach(unitId => {
      const unit = byUnit.get(unitId);
      if (!unit || unit.part !== part.part) errors.push(`${part.id}: unit ${unitId} is not in part ${part.part}`);
    });
    (part.knowledgePoints || []).forEach(point => {
      const exerciseIds = getStudyPointExerciseIds(point, part.part, byExercise);
      if (!exerciseIds.length) errors.push(`${point.id}: exerciseIds or questionRanges is required`);
      exerciseIds.forEach(exerciseId => {
        const found = byExercise.get(exerciseId);
        if (!found || found.unit.part !== part.part) errors.push(`${point.id}: exercise ${exerciseId} is not in part ${part.part}`);
        else if (seenExercises.has(exerciseId)) errors.push(`${point.id}: exercise ${exerciseId} is repeated in navigation`);
        else seenExercises.add(exerciseId);
      });
      if (!point.rule) errors.push(`${point.id}: rule is required`);
      if (!Array.isArray(point.sourcePages) || !point.sourcePages.length) errors.push(`${point.id}: sourcePages is required`);
    });
  });
  return errors;
}

module.exports = { PILOT_ANSWERS, validateExercise, validateChapter, validateUnit, validateUnitManifest, validateStudyNavigation, getStudyPointExerciseIds, assertPilotAnswerVector, toSafeText };
