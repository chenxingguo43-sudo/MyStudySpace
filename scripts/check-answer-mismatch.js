/**
 * Scan all JSON exercise files under 规范数据/ for answer-explanation mismatches.
 *
 * Pattern: answer/sourceAnswer points to option key X,
 * but sourceExplanation describes a word form matching option key Y.
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '俄语资料库', '俄语B2·原书复刻与学习版', '规范数据');

function findAllJsonFiles(dir) {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findAllJsonFiles(fullPath));
    } else if (entry.name.endsWith('.json')) {
      results.push(fullPath);
    }
  }
  return results;
}

function checkExercise(ex, filePath) {
  if (!ex.options || !ex.answer || !ex.sourceExplanation) return null;
  if (ex.type && ex.type !== 'single-choice') return null;

  const answerKey = ex.answer;
  const answerOption = ex.options.find(o => o.key === answerKey);
  if (!answerOption) return null;

  const answerText = answerOption.text.toLowerCase();

  // The explanation should mention the correct word form.
  // Check if the explanation contains the answer option's text.
  const expl = ex.sourceExplanation.toLowerCase();

  if (expl.includes(answerText)) return null; // OK — explanation mentions the answer word

  // Mismatch suspected: find which option's text IS in the explanation
  const matchingOptions = ex.options.filter(o => {
    if (o.key === answerKey) return false;
    return expl.includes(o.text.toLowerCase());
  });

  if (matchingOptions.length === 0) return null; // Can't determine — explanation doesn't mention any option text

  return {
    file: path.relative(DATA_DIR, filePath),
    id: ex.id,
    question: ex.question,
    currentAnswer: answerKey,
    currentAnswerText: answerOption.text,
    likelyCorrect: matchingOptions.map(o => `${o.key}: ${o.text}`),
    explanation: ex.sourceExplanation,
  };
}

function main() {
  const allFiles = findAllJsonFiles(DATA_DIR);
  const mismatches = [];

  for (const filePath of allFiles) {
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      const exercises = data.exercises || [];
      for (const ex of exercises) {
        const m = checkExercise(ex, filePath);
        if (m) mismatches.push(m);
      }
    } catch (e) {
      // skip non-exercise files
    }
  }

  console.log(`Scanned ${allFiles.length} JSON files.`);
  console.log(`Found ${mismatches.length} potential answer-explanation mismatches:\n`);

  for (const m of mismatches) {
    console.log('='.repeat(70));
    console.log(`File:   ${m.file}`);
    console.log(`ID:     ${m.id}`);
    console.log(`Q:      ${m.question}`);
    console.log(`Answer: ${m.currentAnswer} -> "${m.currentAnswerText}"`);
    console.log(`Likely: ${m.likelyCorrect.join(', ')}`);
    console.log(`Expl:   ${m.explanation}`);
    console.log('');
  }
}

main();
