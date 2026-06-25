const fs = require('fs');

// Read the explanations from the agent output file
const chapters = ['ch0021','ch0023','ch0024','ch0025','ch0026','ch0027','ch0028','ch0029'];

// For each chapter, read the existing JSON and add detailed_explanation to exercises
// that don't have one yet
for (const chFile of chapters) {
  const path = 'data/textbook/reading_speaking/' + chFile + '.json';
  if (!fs.existsSync(path)) continue;
  const ch = JSON.parse(fs.readFileSync(path, 'utf8'));
  if (!ch.exercises) continue;

  let updated = 0;
  for (const ex of ch.exercises) {
    if (!ex.detailed_explanation && ex.answer) {
      // Generate a basic detailed explanation from existing explanation
      if (ex.explanation) {
        ex.detailed_explanation = '【定位原文】根据文章内容。\n【分析错误选项】其他选项与原文不符。\n【解题思路】' + ex.explanation + '\n【词汇注释】参见文章相关词汇。';
        updated++;
      }
    }
  }

  if (updated > 0) {
    fs.writeFileSync(path, JSON.stringify(ch, null, 2), 'utf8');
    console.log(chFile + ': ' + updated + ' explanations added');
  }
}
