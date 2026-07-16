const PILOT_ANSWERS = ['В', 'В', 'Б', 'А', 'Г', 'Г', 'А', 'А', 'А', 'Б'];
const OPTION_KEYS = ['А', 'Б', 'В', 'Г'];

function toSafeText(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function validateExercise(exercise) {
  const errors = [];
  if (!/^Q\d{3}$/.test(exercise.id || '')) errors.push('exercise.id must be QNNN');
  if (exercise.type !== 'single-choice') errors.push(`${exercise.id}: type must be single-choice`);
  if (!exercise.question) errors.push(`${exercise.id}: question is required`);
  if (!Array.isArray(exercise.options) || exercise.options.length !== 4) errors.push(`${exercise.id}: exactly four options are required`);
  if (Array.isArray(exercise.options) && exercise.options.map(option => option.key).join(',') !== OPTION_KEYS.join(',')) errors.push(`${exercise.id}: option keys must be А,Б,В,Г`);
  if (!OPTION_KEYS.includes(exercise.answer)) errors.push(`${exercise.id}: invalid answer`);
  if (exercise.answer !== exercise.sourceAnswer) errors.push(`${exercise.id}: answer must equal sourceAnswer`);
  if (!exercise.sourceEvidence) errors.push(`${exercise.id}: sourceEvidence is required`);
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

function assertPilotAnswerVector(chapter) {
  const actual = chapter.exercises.map(exercise => exercise.answer);
  if (actual.join('|') !== PILOT_ANSWERS.join('|')) throw new Error(`Pilot answers differ: ${actual.join(', ')}`);
}

module.exports = { PILOT_ANSWERS, validateExercise, validateChapter, assertPilotAnswerVector, toSafeText };
