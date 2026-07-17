const fs = require('node:fs');
const path = require('node:path');
const { extractQuestionDrafts } = require('./audit-markdown-source');

const SOURCE_ROOT = path.join(path.resolve(__dirname, '..', '..', '..', '..'), '俄语资料库', '俄语B2 全模块 Markdown版', '_data', 'grammar_clean');
const OPTION_KEYS = ['А', 'Б', 'В', 'Г'];
const pad = number => String(number).padStart(3, '0');

const MATERIAL_GROUPS = [
  {
    id: 'p6-context-reading-materials',
    title: '人物简介与短文材料',
    sourcePages: [67, 68, 71],
    materials: [
      { id: 'p6-famous-russians', title: '题 9–14：人物词典简介', body: '根据《著名俄罗斯人：传记词典-参考书》的简介作答。原书以各题句子保留该简介的可见语境。', sourcePages: [67, 71] },
      { id: 'p6-brain-circulation', title: '题 15–19：脑部血液循环短文', body: '根据关于头部穴位、针灸与血液循环的短文作答。原书在本题组中保留了关键语境句。', sourcePages: [67, 68, 71] },
      { id: 'p6-children-experiment', title: '题 20–26：儿童实验短文', body: '根据关于中国儿童计算机实验的短文作答；题干涉及哈尔滨、互联网、儿童学习与实验结果。', sourcePages: [68, 71] }
    ],
    exerciseIds: Array.from({ length: 18 }, (_, index) => `P6-Q${pad(index + 9)}`)
  },
  {
    id: 'p6-context-official-documents',
    title: '公文格式材料',
    sourcePages: [69, 70, 74, 75],
    materials: [
      {
        id: 'p6-application', title: '题 37–42：申请书（Заявление）', sourcePages: [69, 70, 74],
        body: '致“阿斯坦卡”商店经理\n彼得·亚当斯\n\n申请\n\n由于在贵店所购的电熨斗不能正常工作并且无法修理，本人申请更换。\n\n彼得·亚当斯\n2022 年 8 月 5 日'
      },
      {
        id: 'p6-explanatory-note', title: '题 43–50：解释信（Объяснительная записка）', sourcePages: [70, 74, 75],
        body: '致尊敬的医学系系主任\n学生安娜·伊万诺娃\n\n解释信\n\n今年 5 月我在市立医院住院一周，即 5 月 15–22 日，为了治疗肺炎。医院证明附后。\n\n2022 年 5 月 25 日\n安娜·伊万诺娃'
      }
    ],
    exerciseIds: Array.from({ length: 14 }, (_, index) => `P6-Q${pad(index + 37)}`)
  }
];

const READING_ANSWERS = {
  9: ['В', 'сведения 是主语，представлены 是谓语。', '该手册介绍 500 位俄罗斯名人的信息。'],
  10: ['А', 'уделяться-уделиться кому-чему。', '不仅关注著名政治家、学者和文化人士，也关注哲学家。'],
  11: ['Б', 'базироваться на чём 表示“以……为基础”。', '该手册以俄罗斯国内历史学家和评论家最新研究数据为基础。'],
  12: ['Г', 'адресован кому-чему，表示“面向、针对”。', '该书面向广大读者。'],
  13: ['Б', 'может быть использована 表示“可以作为”。', '它还可以作为中学生补充查询文献。'],
  14: ['Г', 'выходить-выйти в свет 表示“出版、问世”。', '该手册在教育出版社出版，印数 4 万册。'],
  15: ['Б', 'располагаться-расположиться 表示“位于”。', '脑部的活跃穴位位于耳廓上方两厘米的地方。'],
  16: ['Б', 'считать кого-что каким。', '针灸被认为是加速脑部血液循环的有效方法。'],
  17: ['А', 'массируя 是副动词。', '按摩这个穴位，可以使思维更清晰。'],
  18: ['А', '主语是 отток，因此用 ускоряется。', '同时，废血的流出加快。'],
  19: ['Б', 'обогащённая 是被动形动词作定语。', '富氧血更积极地流向大脑。'],
  20: ['Б', 'поддержанный 是 поддержать 的被动形动词。', '中国政府支持的实验在哈尔滨进行。'],
  21: ['Б', 'доступ в Интернет 是固定结构。', '建筑的墙体里装入了联网的计算机。'],
  22: ['Б', 'интересоваться чем。', '该区的孩子对电脑屏幕鲜艳的画面感兴趣。'],
  23: ['А', 'обращаться-обратиться с чем 表示“使用”。', '孩子们学会了使用计算机。'],
  24: ['А', 'рисуя 是副动词。', '他们画画的时候，会比速度。'],
  25: ['А', 'обучать-обучить кого。', '最有能力的孩子教会了落后的孩子。'],
  26: ['Г', 'дать 要求第四格。', '在中国不同城市进行了该实验，并取得了同样的结果。']
};

const DOCUMENT_EXERCISES = [
  [37, '… магазина «Астек»', ['Директору', 'Господину директору', 'Господин директор', 'Уважаемому директору'], 'А', 'Директору 用第三格，表示写给经理。', '致“阿斯坦卡”商店经理。'],
  [38, '…', ['Питер Адамс', 'г. Питера Адамса', 'Питера Адамса', 'Господина П. Адамса'], 'В', 'Питера Адамса 用第二格，即声明是由彼得·亚当斯写的。', '彼得·亚当斯。'],
  [39, '… обменять купленный в Вашем магазине утюг', ['Убедительно прошу', 'Прошу Вас', 'Очень прошу', 'Прошу'], 'Б', 'Прошу Вас 是书面请求的标准表达。', '我请求您更换在贵店购买的电熨斗。'],
  [40, '… он не работает и не может быть отремонтирован', ['в связи с тем, что', 'из-за того, что', 'потому, что', 'вследствие того, что'], 'А', 'в связи с тем, что 表示“由于、因为”，适合书面语。', '由于它不能工作且无法修理。'],
  [41, '…', ['Питер Адамс', 'С уважением П. П. Адамс', 'От Питера Адамса', 'Спасибо. Питер Адамс.'], 'А', '签名写姓名，使用第一格。', '彼得·亚当斯。'],
  [42, '…', ['5 августа 2022 года', 'август, 5. 2022 – 08–15', 'август, 2022, 5', '5, август, 2022 год'], 'А', '日期写作：5 августа 2022 года。', '2022 年 8 月 5 日。'],
  [43, '…', ['Уважаемому господину декану', 'Господину декану', 'Уважаемому декану', 'Декану медицинского факультета'], 'Г', 'Декану 用第三格，表示写给系主任；这里不使用 Уважаемому。', '致医学系系主任。'],
  [44, '…', ['госпожи студентки', 'от госпожи студентки', 'от госпожи', 'студентки Анны Ивановой'], 'Г', 'студентки 用第二格，即 Объяснительная записка студентки Анны Ивановой。', '学生安娜·伊万诺娃。'],
  [45, '… этого года я находилась в городской больнице №5', ['Май', 'В мае', 'На май', 'От мая'], 'Б', 'в мае 表示“在五月”。', '今年五月我在市立第五医院。'],
  [46, '…', ['на неделю', 'в течение недели', 'за неделю', 'Г неделю'], 'Б', 'в течение недели 表示“一周的过程中”。', '住院一周。'],
  [47, '…', ['от 15 до 22 мая', 'по 15 по 22 мая', 'с 15 по 22 мая', 'с 15 по 21 мая'], 'В', 'с 15 по 22 мая 包括 22 日，共 8 天。', '即 5 月 15 日至 22 日。'],
  [48, '…', ['для лечения пневмонии', 'от лечения пневмонии', 'по лечению пневмонии', 'в лечении пневмонии'], 'А', 'для лечения пневмонии 表示“为了治疗肺炎”。', '为了治疗肺炎。'],
  [49, '…', ['май, 25, 2022 г.', '25 мая 2022 г.', '2022, май, 25', '25, май, 2022 г.'], 'Б', '日期写作：25 мая 2022 г.。', '2022 年 5 月 25 日。'],
  [50, '…', ['Анна', 'С приветом Анна Иванова', 'Анна Иванова', 'С дружеским приветом Анна Иванова'], 'В', 'Анна Иванова 是姓名，使用第一格。', '安娜·伊万诺娃。']
];

function cleanOptions(exercise) {
  return {
    ...exercise,
    options: exercise.options.map(option => ({ ...option, text: option.text.replace(/\s*##[\s\S]*$/, '').trim() }))
  };
}
function sourceEvidence(pages) { return 'PDF-' + pages.map(page => String(page).padStart(3, '0')).join(' / PDF-'); }
function makeExercise(number, question, options, answer, sourceExplanation, translation, questionPages, answerPages) {
  return {
    id: `P6-Q${pad(number)}`,
    printedNumber: number,
    type: 'single-choice', question,
    options: options.map((text, index) => ({ key: OPTION_KEYS[index], text })),
    answer, sourceAnswer: answer, sourceEvidence: sourceEvidence([...questionPages, ...answerPages]),
    sourceExplanation: `原书解析：${sourceExplanation}；译文：${translation}`,
    referenceExplanation: '参考解析（AI，待复核）：先识别材料中的语法结构或公文格式，再结合语境判断。',
    pitfalls: ['先保留材料语境，再判断固定结构、格或书面格式。'],
    questionPages, answerPages, reviewStatus: 'verified'
  };
}
function buildP6ContextUnits({ sourceRoot = SOURCE_ROOT } = {}) {
  const questions = new Map(extractQuestionDrafts(fs.readFileSync(path.join(sourceRoot, 'P6_questions.md'), 'utf8')).map(item => [item.printedNumber, cleanOptions(item)]));
  const readingExercises = Array.from({ length: 18 }, (_, index) => index + 9).map(number => {
    const question = questions.get(number);
    if (!question || !READING_ANSWERS[number]) throw new Error(`P6 context question ${number} is missing after PDF verification`);
    const [answer, explanation, translation] = READING_ANSWERS[number];
    return makeExercise(number, question.question, question.options.map(option => option.text), answer, explanation, translation, [number <= 16 ? 67 : 68], [71]);
  });
  const documentExercises = DOCUMENT_EXERCISES.map(([number, question, options, answer, explanation, translation]) =>
    makeExercise(number, question, options, answer, explanation, translation, [number <= 42 ? 69 : 70], [74, 75])
  );
  return { contextGroups: MATERIAL_GROUPS, exercises: [...readingExercises, ...documentExercises] };
}

function buildP6ContextUnit(options) {
  const result = buildP6ContextUnits(options);
  return {
    id: 'p6-context-q009-q050',
    chapterIndex: 30,
    part: 6,
    title: '材料与公文语境题（9–26、37–50）',
    module: '语法词汇',
    format: 'quiz-first',
    sourcePages: { questions: [67, 68, 69, 70], rules: [71, 74, 75], answers: [71, 74, 75] },
    contextGroups: result.contextGroups,
    exercises: result.exercises
  };
}

function publishP6ContextUnit({ outputPath, ...options }) {
  const unit = buildP6ContextUnit(options);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(unit, null, 2) + '\n', 'utf8');
  return unit;
}

module.exports = { buildP6ContextUnits, buildP6ContextUnit, publishP6ContextUnit, MATERIAL_GROUPS };
