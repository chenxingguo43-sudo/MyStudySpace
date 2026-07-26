const fs = require('fs');
const path = require('path');

const repoRoot = path.join(__dirname, '..');
const textbookRoot = path.join(repoRoot, 'data', 'textbook', 'zlatoust_grammar');
const theoryRoot = path.join(textbookRoot, 'theory');
const chapter = JSON.parse(fs.readFileSync(path.join(textbookRoot, 'ch0003.json'), 'utf8'));

const sectionSources = {
  '4.1': { printed: [111, 112], pdf: [113, 114] },
  '4.2': { printed: [113], pdf: [115] },
  '4.3': { printed: [114], pdf: [116] },
  '4.4': { printed: [115], pdf: [117] }
};

const ruleCatalog = {
  'gl4-4.1-i-simultaneous': { sectionId: '4.1', titleZh: 'и连接并列动作的同时发生', sourceText: '4.1 第 1 条第 1 项：и 可表达动作同时性。' },
  'gl4-4.1-i-sequential': { sectionId: '4.1', titleZh: 'и连接并列动作的先后发生', sourceText: '4.1 第 1 条第 2 项：и 可表达动作依次发生。' },
  'gl4-4.1-i-cause-consequence': { sectionId: '4.1', titleZh: 'и连接因果结果', sourceText: '4.1 第 1 条第 3 项：и 可表达因果关系。' },
  'gl4-4.1-i-explanatory-eto': { sectionId: '4.1', titleZh: 'и引出含это的说明或补充', sourceText: '4.1 第 1 条第 4 项：第二分句含 это 并说明或补充第一分句时用 и。' },
  'gl4-4.1-a-comparison': { sectionId: '4.1', titleZh: 'а对照不相似现象', sourceText: '4.1 第 2 条第 1 项：а 对照两个不相似的现象。' },
  'gl4-4.1-a-sharp-contrast': { sectionId: '4.1', titleZh: 'а强烈对立', sourceText: '4.1 第 2 条第 2 项：а 强烈对立两个现象。' },
  'gl4-4.1-a-attached-parallel': { sectionId: '4.1', titleZh: 'а追加平行进行的动作', sourceText: '4.1 第 2 条第 3a 项：а 可作追加，表示动作平行。' },
  'gl4-4.1-a-attached-sequence': { sectionId: '4.1', titleZh: 'а追加先后发生的动作', sourceText: '4.1 第 2 条第 3b 项：а 可作追加，表示动作依次发生。' },
  'gl4-4.1-no-noncorrespondence': { sectionId: '4.1', titleZh: 'но表示事实或预期不相符', sourceText: '4.1 第 3 条第 1 项：но 的第二分句表达与第一分句不相符的意思。' },
  'gl4-4.1-no-compensation': { sectionId: '4.1', titleZh: 'но表示补偿意味', sourceText: '4.1 第 3 条第 2 项：но 可表达补偿意味。' },
  'gl4-4.1-no-synonym-a': { sectionId: '4.1', titleZh: 'но在事实互不相符时近似а', sourceText: '4.1 第 3 条第 3 项：事实互不相符时 но 可与 а 同义。' },
  'gl4-4.1-odnako-restrictive-bookish': { sectionId: '4.1', titleZh: 'однако的限制性和书面附加色彩', sourceText: '4.1 第 4 条第 1 项：однако 表示限制和附加色彩，通常用于书面语体。' },
  'gl4-4.1-zato-strong-compensation': { sectionId: '4.1', titleZh: 'зато强化对不足的补偿', sourceText: '4.1 第 4 条第 2 项：зато 补偿第一分句所说正面品质的不足，补偿义比 но 更鲜明。' },
  'gl4-4.1-da-but-or-and': { sectionId: '4.1', titleZh: 'да近似но或и', sourceText: '4.1 第 5 条：да 的意义接近 но 或 и，常见于谚语和口语。' },
  'gl4-4.1-repeated-conjunction-inventory': { sectionId: '4.1', titleZh: '重复连词的列举', sourceText: '4.1 第 5 条后：并列复句还可使用 и…и、ни…ни、либо…либо、не то…не то 等重复连词。' },
  'gl4-4.1-to-to-alternation': { sectionId: '4.1', titleZh: 'то…то表示交替', sourceText: '4.1 第 6 条：то…то 用于动作、现象或特征交替。' },
  'gl4-4.1-libo-libo-exclusive': { sectionId: '4.1', titleZh: 'либо…либо表示互相排斥', sourceText: '4.1 第 7 条：либо…либо 用于相互排斥关系。' },
  'gl4-4.1-ni-ni-enumeration': { sectionId: '4.1', titleZh: 'ни…ни表示列举', sourceText: '4.1 第 8 条：ни…ни 表达列举关系。' },
  'gl4-4.1-kak-tak-i-comparison': { sectionId: '4.1', titleZh: 'как…так и表示对照', sourceText: '4.1 第 9 条：как…так и 表达对照关系。' },
  'gl4-4.2-kakoi-correlative-comparison': { sectionId: '4.2', titleZh: 'какой与тот/такой构成比较', sourceText: '4.2 第 1 条第 1 项：какой 用于把人、事件或现象与相似对象比较，常同 тот、такой 及 быть、встречаться、случаться连用。' },
  'gl4-4.2-kakoi-class-properties': { sectionId: '4.2', titleZh: 'какой指同类对象的全部属性', sourceText: '4.2 第 1 条第 2 项：какой 指明某对象具有或不具有同类对象的全部特征、属性或品质。' },
  'gl4-4.2-kotoryi-distinguishing': { sectionId: '4.2', titleZh: 'который标出具体对象的区别性特征', sourceText: '4.2 第 2 条第 1 项：который 以最一般的定指意义标出具体人或物的区别性特征。' },
  'gl4-4.2-kotoryi-additional': { sectionId: '4.2', titleZh: 'который补充说明人或物', sourceText: '4.2 第 2 条第 2 项：который 可补充有关人或物的信息。' },
  'gl4-4.2-chei-possession-agreement': { sectionId: '4.2', titleZh: 'чей表达所属并与从句中的所指词一致', sourceText: '4.2 第 3 条：чей 增加所属意义；它不与主句被修饰词一致，而与从句中的被修饰词在性、数、格上一致。' },
  'gl4-4.3-kogda-simultaneous': { sectionId: '4.3', titleZh: 'когда表示两个未完成体动作平行发生', sourceText: '4.3 第 1 条第 1 项：когда 对照平行发生的两个动作，主从句动词都用未完成体。' },
  'gl4-4.3-poka-limited-simultaneous': { sectionId: '4.3', titleZh: 'пока限制主句动作持续时间', sourceText: '4.3 第 1 条第 2 项：пока 表示主句动作受从句主要动作发生期间限制，二者均用未完成体。' },
  'gl4-4.3-kogda-sequential-perfective': { sectionId: '4.3', titleZh: 'когда表示从句动作完成后主句动作发生', sourceText: '4.3 第 2 条第 1 项：когда 后，从句动作先发生、主句动作后发生，二者用完成体。' },
  'gl4-4.3-poka-ne-until-perfective': { sectionId: '4.3', titleZh: 'пока не表示主句持续至从句完成', sourceText: '4.3 第 2 条第 2 项：пока не 表示主句动作先发生并持续到从句动作到来；主句未完成体、从句完成体。' },
  'gl4-4.4-raz-logical-ground': { sectionId: '4.4', titleZh: 'раз作为逻辑论据，近义если', sourceText: '4.4 第 1 条第 1 项：раз 引出的从句是主句观点的逻辑依据，近义 если，属书面语体。' },
  'gl4-4.4-raz-condition-cause-colloquial': { sectionId: '4.4', titleZh: 'раз兼具条件和原因，近义так как', sourceText: '4.4 第 1 条第 2 项：раз 的条件义可增加原因义，近义 так как，但属口语。' },
  'gl4-4.4-raz-real-single-event': { sectionId: '4.4', titleZh: 'раз只用于真实且一次性事件', sourceText: '4.4 注意项：раз 只描述真实（非假设）且一次性（非反复）事件。' }
};

function exercisePage(number) {
  const ranges = [[1, 4, 57, 55], [5, 12, 58, 56], [13, 18, 59, 57], [19, 24, 60, 58], [25, 30, 61, 59], [31, 37, 62, 60], [38, 46, 63, 61], [47, 55, 64, 62], [56, 61, 65, 63], [62, 68, 66, 64], [69, 75, 67, 65], [76, 80, 68, 66], [81, 89, 69, 67], [90, 96, 70, 68], [97, 102, 71, 69]];
  const range = ranges.find(([first, last]) => number >= first && number <= last);
  if (!range) throw new Error(`No Chapter 4 page for exercise ${number}`);
  return { pdfPage: range[2], printedPage: range[3] };
}

function sourceFor(sectionIds) {
  const printed = new Set();
  const pdf = new Set();
  sectionIds.forEach(sectionId => {
    (sectionSources[sectionId]?.printed || []).forEach(page => printed.add(page));
    (sectionSources[sectionId]?.pdf || []).forEach(page => pdf.add(page));
  });
  return { printed: [...printed].sort((a, b) => a - b), pdf: [...pdf].sort((a, b) => a - b) };
}

const assignments = new Map();
function put(number, status, sectionIds, ruleIds, evidence, exerciseSectionId, candidateRuleIds = []) {
  if (assignments.has(number)) throw new Error(`Duplicate Chapter 4 assignment: ${number}`);
  assignments.set(number, { status, sectionIds, ruleIds, candidateRuleIds, evidence, exerciseSectionId });
}
function mapped(number, sectionIds, ruleIds, evidence, exerciseSectionId) { put(number, 'mapped', sectionIds, ruleIds, evidence, exerciseSectionId); }
function sourceOnly(number, sectionIds, evidence, exerciseSectionId) { put(number, 'source-exercise-only', sectionIds, [], evidence, exerciseSectionId); }
function range(first, last, callback) { for (let n = first; n <= last; n += 1) callback(n); }

mapped(1, ['4.1'], ['gl4-4.1-i-cause-consequence'], 'общественные отношения воздействуют, и под их влиянием формируются свойства：第二分句是第一分句影响的结果。', '4.1');
mapped(2, ['4.1'], ['gl4-4.1-zato-strong-compensation'], 'зарплата небольшая, зато молодёжь приобретает опыт：后句明确补偿前句的不足。', '4.1');
mapped(3, ['4.1'], ['gl4-4.1-odnako-restrictive-bookish'], '情况尚未完全明朗，однако 预备结果已知：限制性附加。', '4.1');
mapped(4, ['4.1'], ['gl4-4.1-no-synonym-a'], '世界多样，但所有人同样哭笑：相互不相符的事实可由 но 连接。', '4.1');
mapped(5, ['4.1'], ['gl4-4.1-a-sharp-contrast'], '形成黑土耗时数百年，而人类几十年耗尽：强烈对比。', '4.1');
mapped(6, ['4.1'], ['gl4-4.1-zato-strong-compensation'], '冬日早黑，зато 初夏有白夜：第二分句补偿第一分句的不足。', '4.1');
mapped(7, ['4.1'], ['gl4-4.1-a-comparison'], '海洋湿润空气，而草原热气降低湿度：对照不相似现象。', '4.1');
mapped(8, ['4.1'], ['gl4-4.1-zato-strong-compensation'], '未成为学者，зато 没让父母愁：补偿意义。', '4.1');
mapped(9, ['4.1'], ['gl4-4.1-da-but-or-and'], 'да я не дипломат：да 在此近义 но。', '4.1');
mapped(10, ['4.1'], ['gl4-4.1-no-noncorrespondence'], '游戏晚宴结束，但客人未散：事实不相符。', '4.1');
mapped(11, ['4.1'], ['gl4-4.1-da-but-or-and'], 'легли спать，да не спится：да 近义 но。', '4.1');
mapped(12, ['4.1'], ['gl4-4.1-a-attached-parallel'], '卡什坦卡寻找主人，而天渐黑：a 追加同时展开的情形。', '4.1');
mapped(13, ['4.1'], ['gl4-4.1-a-attached-sequence'], '灯亮起，而娜塔莉仍未到：a 连接后续情形。', '4.1');
mapped(14, ['4.1'], ['gl4-4.1-da-but-or-and'], '想抓公鸡，да 不在：да 近义 но。', '4.1');
mapped(15, ['4.1'], ['gl4-4.1-no-noncorrespondence'], '通常在现实中生活，但有时想进童话：不相符意义。', '4.1');
mapped(16, ['4.1'], ['gl4-4.1-i-sequential'], '冬天进入树林，и 随即闪亮：动作依次发生。', '4.1');
mapped(17, ['4.1'], ['gl4-4.1-i-cause-consequence'], '闻到气味，и 想起童年：前一感受触发后一结果。', '4.1');
mapped(18, ['4.1'], ['gl4-4.1-da-but-or-and'], '安静黑暗，да 孤灯摇晃：да 在此近义 но。', '4.1');
mapped(19, ['4.1'], ['gl4-4.1-repeated-conjunction-inventory'], 'и…и 是原书列明的重复连词。', '4.1');
mapped(20, ['4.1'], ['gl4-4.1-ni-ni-enumeration'], 'ни…ни 列举太阳和风都不能造成条件。', '4.1');
mapped(21, ['4.1'], ['gl4-4.1-to-to-alternation'], 'то…то 表达若有若无的交替感受。', '4.1');
mapped(22, ['4.1'], ['gl4-4.1-repeated-conjunction-inventory'], 'или…или 属重复连词选择结构；原书在重复连词清单后以“и другие”保留该同类结构。', '4.1');
mapped(23, ['4.1'], ['gl4-4.1-repeated-conjunction-inventory'], 'не то…не то 是原书列明的重复连词。', '4.1');
mapped(24, ['4.1'], ['gl4-4.1-libo-libo-exclusive'], 'либо…либо 表示在病与堵车之间的互相排斥选择。', '4.1');

range(25, 37, n => sourceOnly(n, ['4.2'], '练习标题为宾语从句，但现有理论 4.2 只说明 союзные слова какой、который、чей，未提供宾语从句所需连接词、陈述或疑问间接引语规则。', '4.2'));

const relativeAssignments = {
  38: ['gl4-4.2-kotoryi-distinguishing', '人口超过百万的城市：которого 标出具体城市。'],
  39: ['gl4-4.2-kotoryi-additional', 'исчезали государства，народ которых…：который 关系词补充从属信息。'],
  40: ['gl4-4.2-chei-possession-agreement', 'гладиаторы，чьи доспехи…：чей 表达所属。'],
  41: ['gl4-4.2-chei-possession-agreement', 'Лажечников，чьи произведения…：чей 将作品归属该作家。'],
  42: ['gl4-4.2-kotoryi-additional', 'Бажов，в сказках которого…：который 从句补充有关人物的信息。'],
  43: ['gl4-4.2-kakoi-correlative-comparison', 'сад такой чудесный，какого…：такой/какой 的比较关系。'],
  44: ['gl4-4.2-kotoryi-distinguishing', 'улица，которая вела к башне：который 标出具体街道的区别性特征。'],
  45: ['gl4-4.2-kakoi-correlative-comparison', 'зима была такая，какая…：такой/какой 比较。'],
  46: ['gl4-4.2-kakoi-class-properties', 'настроение，какое бывает только весной：какой 指同类对象的特征。'],
  47: ['gl4-4.2-kakoi-class-properties', 'дней，какие часто встречаются：какой 指一类日子的典型属性。'],
  49: ['gl4-4.2-kotoryi-distinguishing', 'Дикое поле，на которое не распространялась власть：который 标出具体地域。'],
  50: ['gl4-4.2-kotoryi-additional', 'округ，площадь которого…：который 从句补充该区域资料。'],
  51: ['gl4-4.2-kotoryi-distinguishing', 'мальчик，который не может учиться：который 标出具体人的特征。']
};
for (const [number, [ruleId, reason]] of Object.entries(relativeAssignments)) mapped(Number(number), ['4.2'], [ruleId], reason, '4.3');
sourceOnly(48, ['4.2'], '正确项 что 不是原书 4.2 所列 какой、который、чей；不能由相邻关系词规则虚构依据。', '4.3');
range(52, 55, n => sourceOnly(n, ['4.2'], '正确项为 где／куда／откуда 一类地点关系词；4.2 没有这些词的独立规则，故显式保留 source-exercise-only。', '4.3'));

mapped(56, ['4.3'], ['gl4-4.3-poka-ne-until-perfective'], '大教堂一直被认为最高，пока не 竖起钟楼：主句状态持续到从句完成事件。', '4.4');
range(57, 61, n => sourceOnly(n, ['4.3'], '正确项为 после того как、как только 或 по мере того как；4.3 只明确说明 когда、пока、пока не，不能把未写出的连接词当作同一规则。', '4.4'));
sourceOnly(62, ['4.4'], '正确项 отчего/原因关系不等于 4.4 明确说明的 раз；不从同属原因语义倒推原书规则。', '4.4');
sourceOnly(63, ['4.4'], '正确项 хотя 是让步关系；4.4 仅说明 раз，原书没有让步连接词的独立理论。', '4.4');
sourceOnly(64, ['4.4'], '正确项 если 是假设条件；4.4 只说明 раз 的真实、一次性事件约束，不能直接扩展到 если。', '4.4');
sourceOnly(65, ['4.4'], '正确项 благодаря тому что 是原因关系；4.4 未说明该连接词。', '4.4');
range(66, 70, n => sourceOnly(n, ['4.3'], '题目考查地点、目的、原因或让步连接词；4.3 只提供时间连接词的明确条件。', '4.4'));
sourceOnly(71, ['4.4'], '正确项 если бы 表示假设条件；4.4 的 раз 只用于真实、一次性事件。', '4.4');
range(72, 75, n => sourceOnly(n, ['4.3'], '题目正确项不是 4.3 明确规定的 когда、пока、пока не 时间关系，因而无独立理论依据。', '4.4'));
sourceOnly(76, ['4.4'], '正确项 если 表示条件；4.4 只针对 раз 的语体、条件/原因语义及真实一次性约束，不能将其泛化为所有 если。', '4.4');
sourceOnly(77, ['4.4'], '正确项 если 表示条件；原书没有“при + 名词”与条件从句互换的独立规则。', '4.4');
mapped(78, ['4.3'], ['gl4-4.3-kogda-simultaneous'], 'При переходе… принимаются меры → Когда осуществляется переход… принимаются меры：主从句均为未完成体，表达同步情形。', '4.4');
range(79, 80, n => sourceOnly(n, ['4.3'], '正确项 хотя 或 поскольку 不属于 4.3 列出的时间连接词；不以功能近似替代原书规则。', '4.4'));
range(81, 86, n => sourceOnly(n, ['4.2'], '练习要求把直接引语改成间接引语；4.2 仅说明关系词，未提供直接—间接引语转换规则。PDF-126 模型答案仅作为原书答案来源保留。', 'direct-to-indirect-speech'));
range(87, 102, n => sourceOnly(n, ['4.4'], '原书练习 §4.5 要求识别加粗结构的语义问句；理论区没有独立 4.5 标题或对应语义规则。不得从正确选项反向虚构规则。', '4.5'));

if (assignments.size !== chapter.exercises.length) {
  const missing = chapter.exercises.map(exercise => exercise.printedNumber).filter(number => !assignments.has(number));
  throw new Error(`Missing Chapter 4 assignments: ${missing.join(', ')}`);
}

const exercises = {};
for (const exercise of chapter.exercises) {
  const assignment = assignments.get(exercise.printedNumber);
  const source = sourceFor(assignment.sectionIds);
  const page = exercisePage(exercise.printedNumber);
  const ruleReason = assignment.ruleIds.concat(assignment.candidateRuleIds).map(ruleId => ruleCatalog[ruleId].sourceText).join(' ');
  exercises[exercise.id] = {
    exerciseId: exercise.id,
    printedNumber: exercise.printedNumber,
    chapterId: 'gl4',
    exerciseSectionId: assignment.exerciseSectionId,
    sectionIds: assignment.sectionIds,
    ruleIds: assignment.ruleIds,
    candidateRuleIds: assignment.candidateRuleIds,
    status: assignment.status,
    exercisePrintedPage: page.printedPage,
    exercisePdfPage: page.pdfPage,
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
  chapterId: 'gl4',
  sourceBook: 'zlatoust-grammar-lexika-v1',
  status: 'review',
  mappingBasis: '逐题视觉核对 PDF 057-071（印刷页 55-69）、PDF 126 原书答案表及 cleaned-source/chapter-04.md。理论区未独立说明的宾语从句、地点/原因/让步/目的连接词、直接间接引语转换及 §4.5 语义问句都保持 source-exercise-only。',
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
  chapterId: 'gl4',
  status: 'review',
  summary: {
    accounted: chapter.exercises.length,
    mapped: countByStatus('mapped'),
    needsReview: countByStatus('needs-review'),
    sourceExerciseOnly: countByStatus('source-exercise-only'),
    pdfAnswerKeyMismatches: 9,
    transformedOpenResponsesVerified: 6,
    questionOrOptionMismatches: 0,
    questionPageMetadataCorrections: 102,
    sourceMetadataMismatches: 1
  },
  reviewCases: Object.values(exercises).filter(entry => entry.status !== 'mapped').map(entry => ({
    exerciseId: entry.exerciseId,
    printedNumber: entry.printedNumber,
    exerciseSectionId: entry.exerciseSectionId,
    status: entry.status,
    sectionIds: entry.sectionIds,
    candidateRuleIds: entry.candidateRuleIds,
    reason: entry.mappingReason
  })),
  pdfAudit: {
    questionPages: { pdfPages: [57, 71], printedPages: [55, 69] },
    answerKey: { pdfPage: 126, printedPage: 124, heading: 'Ключи к четвёртой главе' },
    ledger: 'quality-reports/chapter-04-data-repair.json'
  },
  explicitUnsupportedScope: {
    exerciseSection: '4.5',
    exerciseIds: Array.from({ length: 16 }, (_, index) => `GL4-Q${String(index + 87).padStart(3, '0')}`),
    reason: 'Chapter 4 theory has no independent §4.5 heading. These semantic-question exercises remain source-exercise-only and must not be promoted from their answer options.'
  }
};

fs.writeFileSync(path.join(theoryRoot, 'mappings', 'chapter-04-exercise-to-rules.json'), `${JSON.stringify(output, null, 2)}\n`, 'utf8');
fs.writeFileSync(path.join(theoryRoot, 'mappings', 'chapter-04-section-to-exercises.json'), `${JSON.stringify({ schemaVersion: 1, chapterId: 'gl4', status: 'review', accountedExerciseCount: chapter.exercises.length, sections: sectionToExercises }, null, 2)}\n`, 'utf8');
fs.writeFileSync(path.join(theoryRoot, 'mappings', 'chapter-04-mapping-review.json'), `${JSON.stringify(review, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ accounted: chapter.exercises.length, mapped: countByStatus('mapped'), needsReview: countByStatus('needs-review'), sourceExerciseOnly: countByStatus('source-exercise-only') }, null, 2));
