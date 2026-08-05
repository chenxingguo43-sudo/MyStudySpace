const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const chapterDir = path.join(root, 'data', 'textbook', 'reading_speaking');
const headings = ['【学习辅助·原文定位】', '【正确项】', '【排除项】', '【关键词】', '【原文逐句拆解】', '【题干与选项核对】', '【进一步辨析】', '【一句话复盘】'];

function meaningfulWords(value) {
  const stopWords = new Set(['и', 'а', 'но', 'не', 'на', 'в', 'во', 'с', 'со', 'к', 'по', 'за', 'от', 'до', 'из', 'о', 'об', 'для', 'что', 'как', 'это', 'его', 'её', 'их', 'он', 'она', 'они', 'мы', 'вы', 'я', 'у', 'же', 'ли', 'бы', 'то']);
  return (String(value || '').toLowerCase().match(/[а-яё-]+/g) || [])
    .filter((word) => word.length > 3 && !stopWords.has(word))
    .filter((word, index, words) => words.indexOf(word) === index)
    .slice(0, 4);
}

function requiredSectionsPresent(value) {
  return headings.every((heading) => String(value || '').includes(heading));
}

let enriched = 0;
for (const file of fs.readdirSync(chapterDir).filter((name) => /^ch\d+\.json$/.test(name)).sort()) {
  const filePath = path.join(chapterDir, file);
  const chapter = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  for (const exercise of chapter.exercises || []) {
    if (requiredSectionsPresent(exercise.detailed_explanation)) continue;
    const anchor = exercise.sourceAnchor;
    const correctOption = (exercise.options || []).find((option) => option.startsWith(`${exercise.answer})`));
    if (!anchor || !correctOption) throw new Error(`${file}#${exercise.num}: missing source anchor or correct option`);
    const paragraph = chapter.original[anchor.paragraphIndex] || '';
    const translation = (chapter.translated || [])[anchor.paragraphIndex] || '本段对应中文译文暂未提供，请以俄文原句为准。';
    const rejected = (exercise.options || []).filter((option) => option !== correctOption);
    const keyWords = meaningfulWords(`${exercise.question} ${correctOption} ${anchor.quote}`);
    const question = exercise.question || '';
    exercise.detailed_explanation = [
      `【学习辅助·原文定位】第${anchor.paragraphIndex}段：«${anchor.quote}»。`,
      `【正确项】${correctOption}。题干“${question}”要求回到文章确认信息；在三个选项中，只有这一项与定位句所说的对象、时间、范围或因果关系一致。`,
      `【排除项】${rejected.map((option) => `${option}：定位句没有给出这一说法，或它改变了原文的关键信息`).join('；')}。做题时不要用课外常识替代文章本身。`,
      `【关键词】${keyWords.length ? keyWords.join('；') : '先圈出题干和定位句中重复出现的名词、动词与限定词'}。对应段落译意：${translation}`,
      `【原文逐句拆解】这句原文的核心信息是“${anchor.quote}”。先找句子的主体是谁，再看它做了什么、处在什么时间或条件下；这些信息共同限定了正确答案，不能只抓其中一个词。`,
      `【题干与选项核对】题干问的是“${question}”。正确项“${correctOption}”没有新增文章外的信息；另外两个选项则在对象、程度、时间、地点、类别或因果关系上至少有一处与原文不一致。`,
      `【进一步辨析】阅读选择题不要求把每个俄语词单独翻译出来，而是要核对整句话表达的关系。遇到绝对词、比较级、时间词或范围词时，必须逐一回到定位句确认。`,
      `【一句话复盘】抓住«${anchor.quote}»，选择与这句原文含义一致的“${correctOption}”。`
    ].join('\n\n');
    enriched++;
  }
  fs.writeFileSync(filePath, `${JSON.stringify(chapter, null, 2)}\n`, 'utf8');
}

console.log(`Enriched ${enriched} reading-speaking explanations to the full learning format.`);
