const fs = require('node:fs');
const path = require('node:path');

const VAULT = ['俄语资料库', '俄语B2·原书复刻与学习版'];
const DATA = [...VAULT, '规范数据', '语法词汇'];

function samePages(left, right) {
  return JSON.stringify(left || []) === JSON.stringify(right || []);
}

function verifySourceLedger({ ledger, units }) {
  const errors = [], entries = (ledger && ledger.entries) || [], byExercise = new Map(), printedNumbers = new Set();
  entries.forEach(entry => {
    const label = entry.exerciseId || 'unknown exercise';
    if (!/^P2-Q\d{3}$/.test(entry.exerciseId || '')) errors.push(label + ': exerciseId must be P2-Qnnn');
    if (!Number.isInteger(entry.printedNumber) || entry.printedNumber < 1) errors.push(label + ': printedNumber is required');
    if (printedNumbers.has(entry.printedNumber)) errors.push(label + ': printedNumber must be unique');
    printedNumbers.add(entry.printedNumber);
    ['questionPages', 'rulePages', 'answerPages'].forEach(field => {
      if (!Array.isArray(entry[field]) || !entry[field].length) errors.push(label + ': ' + field + ' is required');
    });
    if (!entry.answer) errors.push(label + ': answer is required');
    if (!entry.sourceExplanation) errors.push(label + ': sourceExplanation is required');
    if (!entry.translation) errors.push(label + ': translation is required');
    if (entry.status !== 'verified') errors.push(label + ': status must be verified');
    byExercise.set(entry.exerciseId, entry);
  });
  (units || []).forEach(unit => (unit.exercises || []).forEach(exercise => {
    const entry = byExercise.get(exercise.id);
    if (!entry) { errors.push(exercise.id + ': missing verified source-ledger entry'); return; }
    if (entry.printedNumber !== exercise.printedNumber) errors.push(exercise.id + ': printedNumber differs from source ledger');
    if (entry.answer !== exercise.answer || entry.answer !== exercise.sourceAnswer) errors.push(exercise.id + ': answer differs from source ledger');
    const sourceExplanation = '原书解析：' + entry.sourceExplanation + '；译文：' + entry.translation;
    if (exercise.sourceExplanation !== sourceExplanation) errors.push(exercise.id + ': sourceExplanation differs from source ledger');
    if (!samePages(exercise.questionPages, entry.questionPages)) errors.push(exercise.id + ': questionPages differ from source ledger');
    if (!samePages(exercise.answerPages, entry.answerPages)) errors.push(exercise.id + ': answerPages differ from source ledger');
  }));
  return errors;
}

function loadJson(filePath) { return JSON.parse(fs.readFileSync(filePath, 'utf8')); }
function loadPublishedUnits(root) {
  const base = path.join(root, ...DATA), manifest = loadJson(path.join(base, 'index.json'));
  return manifest.units.filter(entry => entry.published).map(entry => loadJson(path.join(base, entry.source)));
}

if (require.main === module) {
  const root = path.resolve(__dirname, '..', '..');
  const base = path.join(root, ...DATA);
  const errors = verifySourceLedger({ ledger: loadJson(path.join(base, 'part-02-source-ledger.json')), units: loadPublishedUnits(root) });
  if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
  else console.log('Source ledger verified.');
}

module.exports = { verifySourceLedger };
