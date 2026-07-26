const fs = require('fs');
const path = require('path');

const repoRoot = path.join(__dirname, '..');
const textbookRoot = path.join(repoRoot, 'data', 'textbook', 'zlatoust_grammar');
const theoryRoot = path.join(textbookRoot, 'theory');
const chapter = JSON.parse(fs.readFileSync(path.join(textbookRoot, 'ch0002.json'), 'utf8'));

const sectionSources = {
  '3.1': { printed: [108], pdf: [110] },
  '3.1.1': { printed: [109, 110], pdf: [111, 112] },
  '3.1.2': { printed: [110, 111], pdf: [112, 113] }
};

const ruleCatalog = {
  'gl3-3.1-gerund-logical-grammatical-subject': {
    sectionId: '3.1',
    titleZh: '动名副词的逻辑主体与语法主体',
    sourceText: '3.1 要求先区分实施动作的逻辑主体与以主格等形式承担句法功能的语法主体。'
  },
  'gl3-3.1.1-shared-subject-personal': {
    sectionId: '3.1.1',
    titleZh: '人称句中主动作与附加动作同一主体',
    sourceText: '3.1.1 第 1 条：人称句中语法主体与逻辑主体一致，且主动作由动词表达时，动名副词可表达附加动作。'
  },
  'gl3-3.1.1-implicit-subject': {
    sectionId: '3.1.1',
    titleZh: '形式未出现但由谓语体现的同一主体',
    sourceText: '3.1.1 注意项：确定人称、不定人称和泛指人称句可形式上无主语，但主体能由谓语形式恢复时可使用动名副词。'
  },
  'gl3-3.1.1-impersonal-single-logical-subject': {
    sectionId: '3.1.1',
    titleZh: '无主句中可恢复的单一逻辑主体',
    sourceText: '3.1.1 第 2 条：无主句若主动作与附加动作按逻辑由同一人实施，动名副词符合规范；原书列出带不定式的 безличные глаголы、谓词副词和情态词。'
  },
  'gl3-3.1.1-secondary-action': {
    sectionId: '3.1.1',
    titleZh: '动名副词表示附加动作',
    sourceText: '3.1.1 规定动名副词／动名副词短语用于 обозначение добавочного действия；主动作与附加动作需由同一主体实施。'
  },
  'gl3-3.1.2-different-subjects-prohibited': {
    sectionId: '3.1.2',
    titleZh: '两个不同主体时不得使用动名副词',
    sourceText: '3.1.2 第 1 条：若两个或更多主体分别实施不同动作，动名副词／动名副词短语不可使用。'
  },
  'gl3-3.1.2-impersonal-predicate-prohibited': {
    sectionId: '3.1.2',
    titleZh: '特定无主谓词结构中不得使用动名副词',
    sourceText: '3.1.2 后续条目将带无主谓词的结构列为禁用范围；完整来源片段和风险保留在后续规则单元。'
  },
  'gl3-3.1.2-passive-construction-prohibited': {
    sectionId: '3.1.2',
    titleZh: '被动结构中不得使用动名副词',
    sourceText: '3.1.2 第 3 条：在被动结构中，逻辑主体与语法主体不一致；动名副词只在二者一致时才可使用，因此不得使用。'
  }
};

function exercisePage(number) {
  if (number <= 3) return 40;
  if (number <= 10) return 41;
  if (number <= 16) return 42;
  if (number <= 24) return 43;
  if (number <= 31) return 44;
  if (number <= 36) return 45;
  if (number <= 43) return 46;
  if (number <= 49) return 47;
  if (number <= 56) return 48;
  if (number <= 63) return 49;
  if (number <= 69) return 50;
  if (number <= 77) return 51;
  if (number <= 85) return 52;
  if (number <= 91) return 53;
  if (number <= 98) return 54;
  return 55;
}

const assignments = new Map();
function sourceFor(sectionIds) {
  const printed = new Set();
  const pdf = new Set();
  sectionIds.forEach(sectionId => {
    (sectionSources[sectionId]?.printed || []).forEach(page => printed.add(page));
    (sectionSources[sectionId]?.pdf || []).forEach(page => pdf.add(page));
  });
  return { printed: [...printed].sort((a, b) => a - b), pdf: [...pdf].sort((a, b) => a - b) };
}
function put(number, status, sectionIds, ruleIds, evidence, candidateRuleIds = []) {
  if (assignments.has(number)) throw new Error(`Duplicate Chapter 3 assignment: ${number}`);
  assignments.set(number, { status, sectionIds, ruleIds, candidateRuleIds, evidence });
}
function mapped(number, sectionIds, ruleIds, evidence) { put(number, 'mapped', sectionIds, ruleIds, evidence); }
function reviewed(number, sectionIds, candidateRuleIds, evidence) { put(number, 'needs-review', sectionIds, [], evidence, candidateRuleIds); }
function sourceOnly(number, sectionIds, evidence) { put(number, 'source-exercise-only', sectionIds, [], evidence); }
function range(first, last, callback) { for (let number = first; number <= last; number += 1) callback(number); }

range(1, 32, number => sourceOnly(number, ['3.1'], '题目考查主动／被动、现在／过去等参与式形式；当前理论区仅有动名副词规则，未提供参与式的独立说明。'));

mapped(33, ['3.1', '3.1.1'], ['gl3-3.1-gerund-logical-grammatical-subject', 'gl3-3.1.1-shared-subject-personal'], 'Оказываясь перед проблемой выбора，человек опирается...；同一人既面临选择又作出决定。');
mapped(34, ['3.1', '3.1.1'], ['gl3-3.1.1-impersonal-single-logical-subject'], 'взглянув на небо，можно увидеть...；原书允许在可恢复同一逻辑主体的情态无主结构中使用动名副词。');
mapped(35, ['3.1', '3.1.1'], ['gl3-3.1.1-shared-subject-personal'], 'Рассчитывая траекторию，сотрудники работали...；附加动作与主动作由同一明确主体实施。');
mapped(36, ['3.1', '3.1.1'], ['gl3-3.1.1-shared-subject-personal'], 'Находясь в командировке，Пётр Капица обменивался...；地点状态与主动作属于同一人物。');
mapped(37, ['3.1', '3.1.1'], ['gl3-3.1.1-implicit-subject'], 'Практически применяя теорию，в лаборатории приступили...；不定人称谓语恢复了实施两项动作的同一主体。');
mapped(38, ['3.1', '3.1.1'], ['gl3-3.1.1-impersonal-single-logical-subject'], 'Следуя решениям протокола，возможно приостановить...；对应原书的情态词 + 不定式无主结构。');
reviewed(39, ['3.1', '3.1.2'], ['gl3-3.1.2-passive-construction-prohibited'], 'PDF 答案 A 使用 строится 的被动／反身式构造；而 3.1.2 第 3 条明确说被动结构中逻辑主体与语法主体不一致，不得使用动名副词。原书答案与规则出现表面冲突，必须保留 needs-review，不能由答案反向改写规则。');
mapped(40, ['3.1', '3.1.1'], ['gl3-3.1.1-shared-subject-personal'], 'Получив ссуду，фермеры освоят...；两项动作由 фермеры 实施。');
mapped(41, ['3.1', '3.1.1'], ['gl3-3.1.1-shared-subject-personal'], 'борясь со стихией，люди выбились из сил；同一主体实施斗争并承受结果。');
mapped(42, ['3.1', '3.1.1'], ['gl3-3.1.1-shared-subject-personal'], 'реки，впадая в море，оказывают влияние...；河流是两个动作的共同主体。');
mapped(43, ['3.1', '3.1.1'], ['gl3-3.1.1-impersonal-single-logical-subject'], 'Гуляя...，можно набрести...；对应可恢复的同一逻辑主体。');
mapped(44, ['3.1', '3.1.1'], ['gl3-3.1.1-shared-subject-personal'], 'Являясь самым широким...，Кон привлекает...；Кон 是状态与主动作共同主体。');
mapped(45, ['3.1', '3.1.1'], ['gl3-3.1.1-shared-subject-personal'], 'Улавливая сигналы，животные предчувствуют...；动物实施感知与预感。');

range(46, 67, number => sourceOnly(number, ['3.1'], '题目要求参与式与定语从句的同义转换；当前理论区没有参与式时态、语态或关系从句转换的独立规则。'));

range(68, 85, number => mapped(number, ['3.1', '3.1.1'], ['gl3-3.1.1-shared-subject-personal', 'gl3-3.1.1-secondary-action'], '题目在动名副词与从句／名词性结构间转换；原书的直接依据是附加动作与主动作同一主体，具体同义关系仍由题面与答案共同核对。'));

sourceOnly(86, ['3.1'], 'узнанные 是参与式定语；当前理论区无参与式语义问句规则。');
sourceOnly(87, ['3.1'], 'не зарабатывая 位于含两个不同主体的条件复句中，题目考查语义问句而非原书说明的规范使用条件；不从答案倒推规则。');
sourceOnly(88, ['3.1'], 'несущимися 是参与式定语；当前理论区无参与式语义问句规则。');
sourceOnly(89, ['3.1'], 'наполненный 是参与式定语；当前理论区无参与式语义问句规则。');
mapped(90, ['3.1', '3.1.1'], ['gl3-3.1.1-shared-subject-personal', 'gl3-3.1.1-secondary-action'], 'мячики прыгали，отбрасывая тени；动名副词表示同一主体的附加动作。');
mapped(91, ['3.1', '3.1.1'], ['gl3-3.1.1-shared-subject-personal', 'gl3-3.1.1-secondary-action'], 'Он ушёл，кивая、подмигивая、зная...；所有附加动作与主句主体 он 一致。');
sourceOnly(92, ['3.1'], 'спрятанные 是参与式定语；当前理论区无参与式语义问句规则。');
mapped(93, ['3.1', '3.1.1'], ['gl3-3.1.1-shared-subject-personal', 'gl3-3.1.1-secondary-action'], 'кошка сидела，лениво позёвывая；同一主体的附加动作。');
sourceOnly(94, ['3.1'], 'пахнущем 是参与式定语；当前理论区无参与式语义问句规则。');
sourceOnly(95, ['3.1'], 'нашедшие 是参与式定语；当前理论区无参与式语义问句规则。');
sourceOnly(96, ['3.1'], 'анализирующие 是参与式定语；当前理论区无参与式语义问句规则。');
sourceOnly(97, ['3.1'], 'завёрнутые 是参与式定语；当前理论区无参与式语义问句规则。');
mapped(98, ['3.1', '3.1.1'], ['gl3-3.1.1-shared-subject-personal', 'gl3-3.1.1-secondary-action'], 'мама шла，толкая коляску；两项动作由 мама 实施。');
mapped(99, ['3.1', '3.1.1'], ['gl3-3.1.1-impersonal-single-logical-subject', 'gl3-3.1.1-secondary-action'], 'Неплохо провести отпуск，нежась、купаясь、выбираясь...；主动作不定式与附加动作指向同一隐含休假者，归入原书的单一逻辑主体范围。');

if (assignments.size !== chapter.exercises.length) {
  const missing = chapter.exercises.map(exercise => exercise.printedNumber).filter(number => !assignments.has(number));
  throw new Error(`Missing Chapter 3 assignments: ${missing.join(', ')}`);
}

const exercises = {};
for (const exercise of chapter.exercises) {
  const assignment = assignments.get(exercise.printedNumber);
  const source = sourceFor(assignment.sectionIds);
  const printedPage = exercisePage(exercise.printedNumber);
  const ruleReason = assignment.ruleIds.concat(assignment.candidateRuleIds).map(ruleId => ruleCatalog[ruleId].sourceText).join(' ');
  exercises[exercise.id] = {
    exerciseId: exercise.id,
    printedNumber: exercise.printedNumber,
    chapterId: 'gl3',
    sectionIds: assignment.sectionIds,
    ruleIds: assignment.ruleIds,
    candidateRuleIds: assignment.candidateRuleIds,
    status: assignment.status,
    exercisePrintedPage: printedPage,
    exercisePdfPage: printedPage + 2,
    theoryPrintedPages: source.printed,
    theoryPdfPages: source.pdf,
    mappingReason: `${assignment.evidence} ${ruleReason}`.trim(),
    reviewStatus: assignment.status === 'mapped' ? 'source-and-pdf-checked' : 'needs-review'
  };
}

const sectionToExercises = {};
for (const sectionId of Object.keys(sectionSources)) {
  const linked = Object.values(exercises).filter(entry => entry.sectionIds.includes(sectionId));
  sectionToExercises[sectionId] = {
    exerciseIds: linked.map(entry => entry.exerciseId),
    mappedIds: linked.filter(entry => entry.status === 'mapped').map(entry => entry.exerciseId),
    needsReviewIds: linked.filter(entry => entry.status === 'needs-review').map(entry => entry.exerciseId),
    sourceExerciseOnlyIds: linked.filter(entry => entry.status === 'source-exercise-only').map(entry => entry.exerciseId)
  };
}

const countByStatus = status => Object.values(exercises).filter(entry => entry.status === status).length;
const output = {
  schemaVersion: 1,
  chapterId: 'gl3',
  sourceBook: 'zlatoust-grammar-lexika-v1',
  status: 'review',
  mappingBasis: '逐题视觉核对 PDF 042-057（印刷页 40-55）、PDF 126 原书答案表及 cleaned-source/chapter-03.md。参与式及未被理论区独立说明的转换题保持 source-exercise-only。',
  statusDefinitions: {
    mapped: '原书理论中有直接或足够明确的规则依据。',
    'needs-review': '已确定主要理论范围，但原书条件不足以无风险确定细边界。',
    'source-exercise-only': '原书有练习，但理论区没有对应的独立规则说明。'
  },
  ruleCatalog,
  exercises
};
const review = {
  schemaVersion: 1,
  chapterId: 'gl3',
  status: 'review',
  summary: {
    accounted: chapter.exercises.length,
    mapped: countByStatus('mapped'),
    needsReview: countByStatus('needs-review'),
    sourceExerciseOnly: countByStatus('source-exercise-only'),
    pdfAnswerKeyMismatches: 11,
    questionOrOptionMismatches: 0,
    sourceMetadataMismatches: 1
  },
  reviewCases: Object.values(exercises).filter(entry => entry.status !== 'mapped').map(entry => ({
    exerciseId: entry.exerciseId,
    printedNumber: entry.printedNumber,
    status: entry.status,
    sectionIds: entry.sectionIds,
    candidateRuleIds: entry.candidateRuleIds,
    reason: entry.mappingReason
  })),
  pdfAudit: {
    questionPages: { pdfPages: [42, 57], printedPages: [40, 55] },
    answerKey: { pdfPage: 126, printedPage: 124, heading: 'Ключи к третьей главе' },
    ledger: 'quality-reports/chapter-03-data-repair.json'
  }
};

fs.writeFileSync(path.join(theoryRoot, 'mappings', 'chapter-03-exercise-to-rules.json'), `${JSON.stringify(output, null, 2)}\n`, 'utf8');
fs.writeFileSync(path.join(theoryRoot, 'mappings', 'chapter-03-section-to-exercises.json'), `${JSON.stringify({ schemaVersion: 1, chapterId: 'gl3', status: 'review', accountedExerciseCount: chapter.exercises.length, sections: sectionToExercises }, null, 2)}\n`, 'utf8');
fs.writeFileSync(path.join(theoryRoot, 'mappings', 'chapter-03-mapping-review.json'), `${JSON.stringify(review, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ accounted: chapter.exercises.length, mapped: countByStatus('mapped'), needsReview: countByStatus('needs-review'), sourceExerciseOnly: countByStatus('source-exercise-only') }, null, 2));
