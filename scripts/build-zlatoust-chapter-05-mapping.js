const fs = require('fs');
const path = require('path');

const repoRoot = path.join(__dirname, '..');
const textbookRoot = path.join(repoRoot, 'data', 'textbook', 'zlatoust_grammar');
const theoryRoot = path.join(textbookRoot, 'theory');
const chapter = JSON.parse(fs.readFileSync(path.join(textbookRoot, 'ch0004.json'), 'utf8'));
const source = fs.readFileSync(path.join(theoryRoot, 'cleaned-source', 'chapter-05.md'), 'utf8');

if (chapter.exercises.length !== 139) throw new Error(`Expected 139 Chapter 5 exercises, found ${chapter.exercises.length}`);

const sectionSources = {
  '5.1': { printed: [115, 116], pdf: [117, 118] },
  '5.2': { printed: [116, 117], pdf: [118, 119] },
  '5.lexical': { printed: [117, 118, 119, 120, 121, 122], pdf: [119, 120, 121, 122, 123, 124] }
};

function parseLexicalRows(markdown) {
  const rows = [];
  const lines = markdown.split(/\r?\n/);
  let currentPdfPage = null;
  let currentPrintedPage = null;
  let inTable = false;
  for (const line of lines) {
    const page = line.match(/^--- PDF-(\d{3}) \/ 印刷页 (\d+) ---$/);
    if (page) {
      currentPdfPage = Number(page[1]);
      currentPrintedPage = Number(page[2]);
      inTable = false;
      continue;
    }
    if (line === '| Слово | Значение | Словосочетания |') {
      inTable = true;
      continue;
    }
    if (inTable && line === '| ---- | ---- | ---- |') continue;
    if (!inTable) continue;
    if (!line.startsWith('|')) {
      inTable = false;
      continue;
    }
    const cells = line.slice(1, -1).split('|').map(cell => cell.trim());
    if (cells.length !== 3 || !cells[0]) throw new Error(`Cannot parse lexical source-table row: ${line}`);
    rows.push({ word: cells[0], meaning: cells[1], collocations: cells[2], markdown: line, pdfPage: currentPdfPage, printedPage: currentPrintedPage });
  }
  return rows;
}

const lexicalRows = parseLexicalRows(source);
if (!lexicalRows.length) throw new Error('No lexical table rows found in cleaned Chapter 5 source');
const lexicalRuleByWord = new Map();
const ruleCatalog = {
  'gl5-5.1-chto-ni-to-repetition': { sectionId: '5.1', titleZh: 'что ни…, то…表示反复出现', sourceText: '5.1 第 1 条：что ни…, то… 表示反复的动作或现象，并可与 каждый 同义。' },
  'gl5-5.1-kak-ne-necessity': { sectionId: '5.1', titleZh: 'как (было) не + 不定式表示必要或不得不', sourceText: '5.1 第 2 条：как (было) не + инфинитив 表示必要或被迫，近义 нельзя/невозможно не + инфинитив。' },
  'gl5-5.1-gde-tam-emotional-negation': { sectionId: '5.1', titleZh: 'где там表达带感情色彩的否定', sourceText: '5.1 第 3 条：где там + 名词/形容词/动词/副词表达感情色彩强的否定；与 какой там 接近。' },
  'gl5-5.1-ne-pronoun-a-emphatic': { sectionId: '5.1', titleZh: 'не + 不定代词/副词 + а 突出肯定并形成对照', sourceText: '5.1 第 4 条：не + 不定代词（副词）+ а 同时表达对照和肯定。' },
  'gl5-5.1-ne-x-tak-alternative': { sectionId: '5.1', titleZh: 'не…, так…表示不可避免的替代', sourceText: '5.1 第 5 条：не…, так… 表示不可避免的替代性行动。' },
  'gl5-5.1-x-est-x-acceptance': { sectionId: '5.1', titleZh: 'кто/что есть кто/что 表示对不可改变事实的接受', sourceText: '5.1 第 6 条：кто есть кто / что есть что 表示无条件接受不能改变的事实，近义 это。' },
  'gl5-5.1-nom-instr-a-contrast': { sectionId: '5.1', titleZh: '同一名词主格—工具格 + а 的对照', sourceText: '5.1 第 7 条前半：同一名词主格和工具格与 а 构成对照/对比。' },
  'gl5-5.1-nom-instr-no-insufficiency': { sectionId: '5.1', titleZh: '同一名词主格—工具格 + но 提示第一项不足', sourceText: '5.1 第 7 条后半：与 но 连用时强调第一项不足，并提出第二项的必要性。' },
  'gl5-5.1-tozhe-mne-negative-evaluation': { sectionId: '5.1', titleZh: 'тоже мне…给出否定评价', sourceText: '5.1 第 8 条：тоже мне + 名词/形容词/动词/副词对人、现象或事件作否定评价。' },
  'gl5-5.1-a-tuda-zhe-disapproval': { sectionId: '5.1', titleZh: 'а туда же 表示不赞成主体行动', sourceText: '5.1 第 9 条：а + туда же 对主体的行为作不赞成评价。' },
  'gl5-5.1-imperative-forced-action': { sectionId: '5.1', titleZh: '对照复句中单数命令式表示被迫行动', sourceText: '5.1 第 10 条：表达被迫行动的对照复句中，可用单数命令式替代人称动词谓语。' },
  'gl5-5.1-ne-forms-no-possibility': { sectionId: '5.1', titleZh: 'нечего/некого/негде 等与不定式表示因缺失而不可能', sourceText: '5.1 第 11 条：инфинитив + 间接格 некого/нечего 或 негде/некуда/некогда/незачем，表示因没有对象、地点、时间或目的而无法行动。' },
  'gl5-5.2-to-speaker-unknown': { sectionId: '5.2', titleZh: '-то：说话人未知', sourceText: '5.2 第 1 项：-то 表示有关人/物的信息对说话人未知。' },
  'gl5-5.2-nibud-indifferent': { sectionId: '5.2', titleZh: '-нибудь：具体身份无关紧要', sourceText: '5.2 第 2 项：-нибудь 表示有关人/物的信息对说话人无关紧要。' },
  'gl5-5.2-libo-bookish-nibud': { sectionId: '5.2', titleZh: '-либо：近义-​​нибудь的书面形式', sourceText: '5.2 第 3 项：-либо 与 -нибудь 同义，但具有书面语色彩。' },
  'gl5-5.2-koe-speaker-known': { sectionId: '5.2', titleZh: 'кое-：说话人知道、听话人不知道', sourceText: '5.2 第 4a 项：кое- 表示说话人知道而听话人不知道的人或物。' },
  'gl5-5.2-koe-some-places': { sectionId: '5.2', titleZh: 'кое-地点副词表示某些地点', sourceText: '5.2 注意 2：кое-где/кое-откуда等可表示某些地点。' },
  'gl5-5.2-koe-kogda-sometimes': { sectionId: '5.2', titleZh: 'кое-когда表示有时', sourceText: '5.2 注意 3：кое-когда 可表示“有时、偶尔”。' },
  'gl5-5.2-kogda-to-past': { sectionId: '5.2', titleZh: 'когда-то表示过去很久以前', sourceText: '5.2 注意 4：когда-то 表示“很久以前、在过去”。' },
  'gl5-5.2-koe-preposition-placement': { sectionId: '5.2', titleZh: 'кое-形式中的介词位置', sourceText: '5.2 注意 5：带介词时通常为 кое у кого、кое в чём；口语中也可为 от кое-чего、для кое-кого。' }
};

lexicalRows.forEach((row, index) => {
  const id = `gl5-5.lexical-row-${String(index + 1).padStart(3, '0')}`;
  if (lexicalRuleByWord.has(row.word)) throw new Error(`Duplicate lexical source word: ${row.word}`);
  lexicalRuleByWord.set(row.word, id);
  ruleCatalog[id] = {
    sectionId: '5.lexical',
    titleZh: `词汇辨析：${row.word}`,
    sourceText: `${row.word}: ${row.meaning}; ${row.collocations}`,
    sourcePdfPage: row.pdfPage,
    sourcePrintedPage: row.printedPage
  };
});

function lexicalRule(word) {
  const id = lexicalRuleByWord.get(word);
  if (!id) throw new Error(`Missing lexical table rule for ${word}`);
  return id;
}

const lexicalAssignments = new Map([
  [1, 'общество'], [2, 'традиция'], [3, 'дипломат'], [5, 'предоставление (от глагола предоставить)'], [6, 'выборы'], [7, 'фактор'], [9, 'падение'], [11, 'предмет'],
  [15, 'обязанность'], [16, 'опечатка'], [18, 'мировой'], [19, 'классический'], [21, 'общительный'], [22, 'психический'], [23, 'кожный'], [24, 'обидчивый'],
  [25, 'духовный'], [27, 'типичный'], [29, 'рыбный'], [31, 'твёрдый'], [32, 'каменистый'], [33, 'горный'], [34, 'костяной'], [41, 'всякий'],
  [42, 'любой'], [45, 'каждый'], [106, 'эффективный'], [108, 'особо'], [112, 'экономичный'], [113, 'вместе']
]);

const particleAssignments = new Map([
  [37, 'gl5-5.2-nibud-indifferent'], [38, 'gl5-5.2-nibud-indifferent'], [43, 'gl5-5.2-koe-speaker-known'], [46, 'gl5-5.2-koe-speaker-known'],
  [47, 'gl5-5.2-nibud-indifferent'], [48, 'gl5-5.2-koe-speaker-known'], [49, 'gl5-5.2-koe-speaker-known'], [50, 'gl5-5.2-to-speaker-unknown'],
  [51, 'gl5-5.2-to-speaker-unknown'], [52, 'gl5-5.2-nibud-indifferent'], [53, 'gl5-5.2-nibud-indifferent'], [54, 'gl5-5.2-koe-speaker-known'],
  [55, 'gl5-5.2-nibud-indifferent'], [56, 'gl5-5.2-to-speaker-unknown'], [57, 'gl5-5.2-koe-speaker-known'], [58, 'gl5-5.2-koe-speaker-known'],
  [59, 'gl5-5.2-libo-bookish-nibud'], [60, 'gl5-5.2-to-speaker-unknown'], [61, 'gl5-5.2-koe-speaker-known'], [114, 'gl5-5.2-kogda-to-past'],
  [115, 'gl5-5.2-nibud-indifferent'], [116, 'gl5-5.2-koe-some-places'], [117, 'gl5-5.2-to-speaker-unknown']
]);

const stylisticAssignments = new Map([
  [118, 'gl5-5.1-nom-instr-a-contrast'], [119, 'gl5-5.1-chto-ni-to-repetition'], [120, 'gl5-5.1-chto-ni-to-repetition'],
  [121, 'gl5-5.1-gde-tam-emotional-negation'], [122, 'gl5-5.1-kak-ne-necessity'], [123, 'gl5-5.1-gde-tam-emotional-negation'],
  [124, 'gl5-5.1-x-est-x-acceptance'], [125, 'gl5-5.1-nom-instr-no-insufficiency'], [126, 'gl5-5.1-ne-x-tak-alternative'],
  [127, 'gl5-5.1-ne-pronoun-a-emphatic'], [128, 'gl5-5.1-a-tuda-zhe-disapproval'], [129, 'gl5-5.1-nom-instr-no-insufficiency'],
  [130, 'gl5-5.1-gde-tam-emotional-negation'], [131, 'gl5-5.1-tozhe-mne-negative-evaluation'], [132, 'gl5-5.1-tozhe-mne-negative-evaluation'],
  [133, 'gl5-5.1-x-est-x-acceptance'], [134, 'gl5-5.1-imperative-forced-action'], [135, 'gl5-5.1-ne-forms-no-possibility'],
  [136, 'gl5-5.1-ne-pronoun-a-emphatic'], [137, 'gl5-5.1-a-tuda-zhe-disapproval'], [138, 'gl5-5.1-imperative-forced-action'],
  [139, 'gl5-5.1-ne-forms-no-possibility']
]);

function sourceForSection(sectionId) {
  return sectionSources[sectionId];
}

function mappedEntry(exercise, sectionId, ruleId, reason) {
  const theory = sourceForSection(sectionId);
  return {
    exerciseId: exercise.id,
    printedNumber: exercise.printedNumber,
    chapterId: 'gl5',
    exerciseSectionId: sectionId,
    sectionIds: [sectionId],
    ruleIds: [ruleId],
    candidateRuleIds: [],
    status: 'mapped',
    exercisePrintedPage: exercise.questionPages[0] - 2,
    exercisePdfPage: exercise.questionPages[0],
    theoryPrintedPages: theory.printed,
    theoryPdfPages: theory.pdf,
    mappingReason: reason,
    reviewStatus: 'source-and-pdf-checked'
  };
}

function sourceOnlyEntry(exercise, exerciseSectionId, sectionId, reason) {
  const theory = sourceForSection(sectionId);
  return {
    exerciseId: exercise.id,
    printedNumber: exercise.printedNumber,
    chapterId: 'gl5',
    exerciseSectionId,
    sectionIds: [sectionId],
    ruleIds: [],
    candidateRuleIds: [],
    status: 'source-exercise-only',
    exercisePrintedPage: exercise.questionPages[0] - 2,
    exercisePdfPage: exercise.questionPages[0],
    theoryPrintedPages: theory.printed,
    theoryPdfPages: theory.pdf,
    mappingReason: reason,
    reviewStatus: 'source-checked-no-independent-rule'
  };
}

const exercises = {};
for (const exercise of chapter.exercises) {
  const number = exercise.printedNumber;
  if (lexicalAssignments.has(number)) {
    const word = lexicalAssignments.get(number);
    exercises[exercise.id] = mappedEntry(exercise, '5.lexical', lexicalRule(word), `题干与原书词汇评论中的「${word}」条目直接对应；释义和原书搭配可区分正确项，不能由答案字母反推。`);
  } else if (particleAssignments.has(number)) {
    const ruleId = particleAssignments.get(number);
    exercises[exercise.id] = mappedEntry(exercise, '5.2', ruleId, `题干中的不定代词/副词形式由原书 5.2 的「${ruleCatalog[ruleId].titleZh}」直接说明；语境决定信息未知、无关紧要或仅说话人已知。`);
  } else if (stylisticAssignments.has(number)) {
    const ruleId = stylisticAssignments.get(number);
    exercises[exercise.id] = mappedEntry(exercise, '5.1', ruleId, `题干直接使用原书 5.1 所列的「${ruleCatalog[ruleId].titleZh}」构式；正确项按该构式的语义功能解释。`);
  } else {
    exercises[exercise.id] = sourceOnlyEntry(
      exercise,
      number <= 36 || number === 39 || number === 40 || number === 44 || (number >= 62 && number <= 117) ? 'lexical-exercise-not-in-commentary' : 'exercise-not-directly-covered',
      '5.lexical',
      '原书有该练习，但第 5 章理论词汇表未收录该词义、搭配或构词辨析；不能从 PDF 正确项反向编造独立原书规则。'
    );
  }
}

const statusCounts = Object.values(exercises).reduce((counts, entry) => {
  counts[entry.status] += 1;
  return counts;
}, { mapped: 0, 'needs-review': 0, 'source-exercise-only': 0 });

const sections = {};
for (const sectionId of Object.keys(sectionSources)) {
  const ids = Object.values(exercises).filter(entry => entry.sectionIds.includes(sectionId)).map(entry => entry.exerciseId);
  sections[sectionId] = {
    exerciseIds: ids,
    mappedIds: ids.filter(id => exercises[id].status === 'mapped'),
    needsReviewIds: ids.filter(id => exercises[id].status === 'needs-review'),
    sourceExerciseOnlyIds: ids.filter(id => exercises[id].status === 'source-exercise-only')
  };
}

const mapping = {
  schemaVersion: 1,
  chapterId: 'gl5',
  sourceBook: 'zlatoust-grammar-lexika-v1',
  status: 'review',
  mappingBasis: '逐题视觉核对 PDF 072–090（印刷页 70–88）、PDF 127 原书答案表和 cleaned-source/chapter-05.md。只有题面、答案和原书理论/词汇表三者直接相符时才标记 mapped；其余练习保留 source-exercise-only。',
  statusDefinitions: {
    mapped: '原书理论或词汇评论有直接或足够明确的规则依据。',
    'needs-review': '主要范围已确定，但原书条件不足以无风险固定细边界。',
    'source-exercise-only': '原书有练习，但理论区没有对应的独立规则或词汇条目。'
  },
  ruleCatalog,
  exercises
};

const reverse = { schemaVersion: 1, chapterId: 'gl5', status: 'review', accountedExerciseCount: chapter.exercises.length, sections };
const review = {
  schemaVersion: 1,
  chapterId: 'gl5',
  status: 'review',
  summary: {
    accounted: chapter.exercises.length,
    mapped: statusCounts.mapped,
    needsReview: statusCounts['needs-review'],
    sourceExerciseOnly: statusCounts['source-exercise-only'],
    pdfAnswerKeyMismatches: 17,
    questionPageMetadataCorrections: 139,
    questionOrOptionMismatches: 0
  },
  mappingDecisions: {
    '5.1': 'GL5-Q118–Q139 are directly supported by the eleven conversational/emotive constructions in 5.1.',
    '5.2': 'Only exercises whose tested form actually contains -то, -нибудь, -либо or кое- are mapped to 5.2; lexical items like несколько or некоторые remain source-exercise-only unless a direct table row exists.',
    '5.lexical': 'Every source-table row is represented by a separate atomic rule. Only exercise vocabulary directly present in a source row is mapped; the rest are explicit source-exercise-only cases.'
  },
  sourceExerciseOnly: Object.values(exercises).filter(entry => entry.status === 'source-exercise-only').map(entry => ({ exerciseId: entry.exerciseId, nearestSectionId: entry.sectionIds[0], reason: entry.mappingReason })),
  importIntegrity: {
    answerKeySource: { pdfPage: 127, printedPage: 125, heading: 'Ключи к пятой главе' },
    answerKeyMismatchExerciseIds: ['GL5-Q005', 'GL5-Q009', 'GL5-Q012', 'GL5-Q017', 'GL5-Q023', 'GL5-Q024', 'GL5-Q036', 'GL5-Q038', 'GL5-Q039', 'GL5-Q059', 'GL5-Q060', 'GL5-Q064', 'GL5-Q067', 'GL5-Q075', 'GL5-Q078', 'GL5-Q082', 'GL5-Q131'],
    questionOrOptionMismatches: [],
    note: 'All question stems and option sets were visually checked against PDF-072–090. The answer key and page metadata were repaired without changing exercise IDs.'
  }
};

const mappingsDir = path.join(theoryRoot, 'mappings');
fs.writeFileSync(path.join(mappingsDir, 'chapter-05-exercise-to-rules.json'), `${JSON.stringify(mapping, null, 2)}\n`, 'utf8');
fs.writeFileSync(path.join(mappingsDir, 'chapter-05-section-to-exercises.json'), `${JSON.stringify(reverse, null, 2)}\n`, 'utf8');
fs.writeFileSync(path.join(mappingsDir, 'chapter-05-mapping-review.json'), `${JSON.stringify(review, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ statusCounts, lexicalRows: lexicalRows.length, files: ['chapter-05-exercise-to-rules.json', 'chapter-05-section-to-exercises.json', 'chapter-05-mapping-review.json'] }, null, 2));
