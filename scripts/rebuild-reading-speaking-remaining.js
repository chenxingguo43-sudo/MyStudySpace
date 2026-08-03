const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const chapterDir = path.join(root, 'data', 'textbook', 'reading_speaking');
const stopWords = new Set([
  'и', 'а', 'но', 'не', 'на', 'в', 'во', 'с', 'со', 'к', 'по', 'за', 'от', 'до', 'из', 'о', 'об', 'для',
  'что', 'как', 'это', 'его', 'её', 'их', 'он', 'она', 'они', 'мы', 'вы', 'я', 'у', 'же', 'ли', 'бы', 'то'
]);

function tokens(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .match(/[а-я-]+/g) || [];
}

function stems(value) {
  return tokens(value)
    .filter((word) => word.length > 2 && !stopWords.has(word))
    .map((word) => word.slice(0, Math.min(word.length, 5)));
}

function sentences(paragraph) {
  return String(paragraph || '')
    .replace(/\*\*/g, '')
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => stems(sentence).length >= 2);
}

function chooseEvidence(chapter, exercise) {
  const correctIndex = (exercise.options || []).findIndex((option) => option.startsWith(`${exercise.answer})`));
  const correctOption = (exercise.options || [])[correctIndex] || '';
  const questionStems = stems(exercise.question);
  const optionStems = stems(correctOption);
  let best = null;

  (chapter.original || []).forEach((paragraph, paragraphIndex) => {
    sentences(paragraph).forEach((sentence) => {
      const sentenceStems = new Set(stems(sentence));
      let score = 0;
      questionStems.forEach((stem) => { if (sentenceStems.has(stem)) score += 2; });
      optionStems.forEach((stem) => { if (sentenceStems.has(stem)) score += 4; });
      if (!best || score > best.score) best = { paragraphIndex, quote: sentence, score };
    });
  });

  if (best && best.score > 0) return best;
  const fallbackIndex = (chapter.original || []).findIndex((paragraph, index) => index > 0 && sentences(paragraph).length);
  const paragraphIndex = fallbackIndex >= 0 ? fallbackIndex : 0;
  return { paragraphIndex, quote: sentences(chapter.original[paragraphIndex])[0] || String(chapter.original[paragraphIndex] || ''), score: 0 };
}

let generated = 0;
for (const file of fs.readdirSync(chapterDir).filter((name) => /^ch\d+\.json$/.test(name)).sort()) {
  const filePath = path.join(chapterDir, file);
  const chapter = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  for (const exercise of chapter.exercises || []) {
    if (exercise.sourceAnchor && exercise.detailed_explanation) continue;
    const correctIndex = (exercise.options || []).findIndex((option) => option.startsWith(`${exercise.answer})`));
    const correctOption = (exercise.options || [])[correctIndex];
    if (!correctOption) throw new Error(`${file}#${exercise.num}: invalid answer key`);
    const evidence = chooseEvidence(chapter, exercise);
    const alternatives = (exercise.options || []).filter((_, index) => index !== correctIndex).join('；');
    exercise.sourceAnchor = { paragraphIndex: evidence.paragraphIndex, quote: evidence.quote };
    exercise.detailed_explanation = [
      `【定位原文】${evidence.quote}`,
      `【正确答案】${correctOption}`,
      `【选项分析】定位句是本题判断的依据。正确项“${correctOption}”与文章信息相符。其余选项“${alternatives}”没有得到这篇文章的支持，或改变了原文中的对象、时间、范围或因果关系。`,
      `【解题思路】先回到上面的原文定位句，核对题干中的主体和限制词，再选择与原文含义一致的一项。`
    ].join('\n\n');
    generated++;
  }
  fs.writeFileSync(filePath, `${JSON.stringify(chapter, null, 2)}\n`, 'utf8');
}

console.log(`Rebuilt ${generated} remaining reading-speaking explanations.`);
