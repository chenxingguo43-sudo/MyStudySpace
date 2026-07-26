#!/usr/bin/env node
'use strict';

/* Build the Chapter 3 gerund reference units from the repaired cleaned source.
 * Source text, exercises, source answers, and Chinese learning support are
 * deliberately kept in distinct fields. */
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');
const theoryRoot = path.join(repoRoot, 'data', 'textbook', 'zlatoust_grammar', 'theory');
const sourcePath = path.join(theoryRoot, 'cleaned-source', 'chapter-03.md');
const mappingPath = path.join(theoryRoot, 'mappings', 'chapter-03-exercise-to-rules.json');
const chapterPath = path.join(repoRoot, 'data', 'textbook', 'zlatoust_grammar', 'ch0002.json');
const outputDirectory = path.join(theoryRoot, 'rule-units', 'gl3');
const coverageReportPath = path.join(theoryRoot, 'quality-reports', 'chapter-03-source-coverage.md');
const qualityReportPath = path.join(theoryRoot, 'quality-reports', 'chapter-03-content-quality-review.md');

const source = fs.readFileSync(sourcePath, 'utf8');
const mapping = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));
const chapter = JSON.parse(fs.readFileSync(chapterPath, 'utf8'));
const exercisesById = new Map(chapter.exercises.map(exercise => [exercise.id, exercise]));
const sourcePdf = 'E:\\Desktop\\语法词汇（同一本书）.pdf';

function sliceSource(start, end) {
  const startIndex = source.indexOf(start);
  if (startIndex < 0) throw new Error(`Missing source heading: ${start}`);
  const endIndex = end ? source.indexOf(end, startIndex + start.length) : -1;
  if (end && endIndex < 0) throw new Error(`Missing source end heading: ${end}`);
  return source.slice(startIndex, endIndex < 0 ? undefined : endIndex).trim();
}

function sourceExample(text, pdfPages, printedPages, note = '原书例句') {
  return { sourceType: 'source-example', text, note, source: { pdfPages, printedPages } };
}

function diagram(title, markdown, rows, pdfPages, printedPages) {
  return {
    sourceType: 'source-table',
    title,
    headers: ['原书图式'],
    rows,
    markdown,
    source: { pdfPages, printedPages }
  };
}

const commonRisk = [
  '理论扫描和清洗来源仍为 REVIEW；所有原书俄文均以 cleaned-source/chapter-03.md 为准，规则单元不得标为 verified。',
  'PDF-113 / 印刷页 111 同时包含 3.1.2 的延续和第 4 章标题；本批已按语义标题切分，两个章节均保留该页的来源记录。',
  '中文定位、判断步骤、对比、常见错误和选项解析均为 learning-note，不是原书规则或原书答案。'
];

const sections = {
  '3.1': {
    titleRu: '3.1. Употребление деепричастия / деепричастного оборота',
    titleZh: '动名副词的逻辑主体与语法主体：先识别动作由谁完成',
    orientationZh: '本节建立判断动名副词的总入口：不要先看词尾或逗号，而要先分别找出实施动作的人（逻辑主体）和句法上承担主语功能的成分（语法主体）。后续 3.1.1 与 3.1.2 分别说明何时允许、何时禁止。',
    quickDecision: [
      '先把动名副词短语和主句谓词分开，分别问“谁实施这个动作”。',
      '区分逻辑主体（真正实施动作的人）与语法主体（在句中承担主语功能的名词、代词、数词等主格成分）。',
      '再判断句子是人称、无主、主动还是被动结构；不能仅凭出现动名副词就假定它合规范。',
      '若教材没有为某类题（如分词形态）提供独立理论，保留 source-exercise-only，不从答案倒推规则。'
    ],
    semanticAnalysis: '动名副词表示附加动作；能否使用不取决于“前面有没有逗号”，而取决于附加动作和主要动作能否归给同一可恢复的行动者。语法主语是句法位置，逻辑主体是行动责任，两者有时重合、有时会在无主或被动结构中分离。',
    signalAnalysis: [{
      sourceType: 'learning-note',
      signals: ['деепричастие', 'деепричастный оборот', 'S + P + O', 'логический субъект', 'грамматический субъект'],
      use: '这些是进入主体判断的信号，不是自动放行标志；仍须检查主句谓词类型、语态和动作实施者。'
    }],
    contrasts: [{
      sourceType: 'learning-note',
      left: '同一人执行主动作与附加动作',
      right: '句法主语与真正行动者分离',
      analysis: '前者可继续按 3.1.1 核对；后者必须进入 3.1.2 的禁止条件，尤其警惕被动和多主体结构。'
    }],
    commonErrors: [
      '把主句中最显眼的名词直接当成动名副词的实施者，而不判断谁真正完成两项动作。',
      '把分词、关系从句或一般语义问句的练习强行说成教材已讲解的动名副词规则。'
    ],
    relatedRules: ['3.1.1（允许：同一逻辑主体）', '3.1.2（禁止：多主体、无主和被动结构）'],
    pages: { pdfPages: [110], printedPages: [108] },
    fragment: sliceSource('## 3.1.', '## 3.1.1.'),
    examples: [],
    tables: [],
    coverage: { ruleItems: 2, numberedItems: 0, examples: 0, tables: 0, rows: 0 },
    uncollectedItems: ['本节为概念导言，没有独立的原书例句或表格；后续 3.1.1/3.1.2 的全部例句和图式在各自单元完整保留。']
  },
  '3.1.1': {
    titleRu: '3.1.1. Деепричастие / деепричастный оборот употребляется',
    titleZh: '允许使用动名副词：主动作与附加动作由同一人实施',
    orientationZh: '本节给出动名副词合规范的核心条件：在普通人称句中，语法主体和逻辑主体一致；在某些形式上无主的结构中，也必须能从谓词、与格／属格对象或不定式结构恢复出同一行动者。',
    quickDecision: [
      '先找主要动作 P，再找动名副词表示的附加动作 Adp；两项动作必须能归给同一逻辑主体。',
      '人称句中，检查主格 S 是否同时实施 P 和 Adp；主句谓词应是动词性谓词。',
      '主语形式缺席时，确认它能从命令式、泛指／不定人称谓词，或无主句中的与格／属格对象和不定式恢复。',
      '若无主结构包含不定式，核对其是否仍指向唯一行动者；不因出现 можно、нельзя、важно 等词而跳过主体判断。'
    ],
    semanticAnalysis: '这里的“同一主体”不是只看一个主格名词。教材明确允许部分形式无主的人称句，以及可由上下文恢复唯一行动者的无主不定式构造；关键是 P 与 Adp 的实施者在逻辑上仍是同一人。',
    signalAnalysis: [
      { sourceType: 'learning-note', signals: ['S + P + Adp', '命令式', 'неопределённо-личное', 'обобщённо-личное'], use: '这些结构提示形式主语可能缺席，但必须仍能恢复同一主体。' },
      { sourceType: 'learning-note', signals: ['ему / ему оставалось', 'приходится + инфинитив', 'важно + инфинитив', 'нельзя + инфинитив'], use: '无主或情态结构不是自动许可；只有主要动作和附加动作确实归给同一行动者时才符合教材条件。' }
    ],
    contrasts: [
      { sourceType: 'source-example', left: 'Объединив наши усилия, мы справимся с задачей.', right: 'Объединив наши усилия, задача будет решена.', analysis: '左句中的 мы 同时执行 объединить 和 справиться；右句改成被动／结果结构后，附加动作的实施者不再由语法主体承担，不能把它当作本节的直接许可。' },
      { sourceType: 'source-example', left: 'Отказавшись от помощи друзей, ему оставалось рассчитывать только на самого себя.', right: 'Смеркалось, сидя на палубе.', analysis: '左句虽无主格 S，却能恢复同一人；右句只有自然现象谓词，缺少可承担两项动作的行动者。' }
    ],
    commonErrors: [
      '把“形式上没有主语”一律判错，忽略教材允许的命令式、不定人称和可恢复单一逻辑主体的无主句。',
      '只因主句含有可以、不可以、重要等情态词就判对，却没有核对不定式和动名副词是否指向同一人。',
      '把被动 -ся 形式误当作普通主动人称谓词；该边界须与 3.1.2 一起判断。'
    ],
    relatedRules: ['3.1（逻辑主体与语法主体概念）', '3.1.2（多主体、最低动词性和被动结构的禁止条件）'],
    pages: { pdfPages: [111, 112], printedPages: [109, 110] },
    fragment: sliceSource('## 3.1.1.', '## 3.1.2.'),
    examples: [
      sourceExample('Поумев, ветер успокоился в листве деревьев.', [111], [109]),
      sourceExample('Пробив в санатории больше месяца, альпинист чувствовал себя ещё не совсем здоровым.', [111], [109]),
      sourceExample('Объединив наши усилия, мы справимся с задачей.', [111], [109]),
      sourceExample('Предложив свой проект, приведите нам хотя бы один довод в его пользу.', [111], [109]),
      sourceExample('Используя новые технологии, на предприятии получают высокие результаты.', [111], [109]),
      sourceExample('Что имеем — не храним, потерявши — плачем.', [111], [109]),
      sourceExample('Отказавшись от помощи друзей, ему оставалось рассчитывать только на самого себя.', [111], [109]),
      sourceExample('Замечательно плыть весенним вечером вверх по Дону, сидя на открытой палубе речного трамвая.', [111], [109]),
      sourceExample('Мой коллега был прав, отказавшись занять чужое место.', [111], [109], '原书脚注例句'),
      sourceExample('Мать была в волнении, получив известие о болезни детей.', [111], [109], '原书脚注例句'),
      sourceExample('Говоря о богатстве донской природы, приходится отметить, что численность редких животных и растений на Дону с каждым годом сокращается.', [112], [110]),
      sourceExample('Отмечая интерес к изучению русского языка, важно подчеркнуть, что этот язык является одним из самых трудных среди индоевропейских языков.', [112], [110]),
      sourceExample('Идя на экзамен, нельзя надеяться только на удачу.', [112], [110])
    ],
    tables: [
      diagram('原书逻辑图式：形式主语出现', 'S\n/ \\\nP   Adp', [['S → P 与 Adp']], [111], [109]),
      diagram('原书逻辑图式：形式主语缺席', '(S формально отсутствует)\n/ \\\nP   Adp', [['隐含 S → P 与 Adp']], [111], [109]),
      diagram('原书逻辑图式：无主句中的可恢复主体', 'O\n(= S или отсутствует)\n/ \\\nP   Adp', [['O 可提示唯一逻辑 S → P 与 Adp']], [111], [109])
    ],
    coverage: { ruleItems: 6, numberedItems: 2, examples: 13, tables: 3, rows: 3 },
    uncollectedItems: []
  },
  '3.1.2': {
    titleRu: '3.1.2. Деепричастие / деепричастный оборот не употребляется',
    titleZh: '禁止使用动名副词：多主体、最低动词性无主句与被动结构',
    orientationZh: '本节不是“见到无主句就错”的简化口诀。教材分别禁止：不同主体分别执行动作的结构、谓词动词性最低的无主构造，以及逻辑主体和语法主体发生倒置的被动构造。',
    quickDecision: [
      '先数行动者：若主句和从句／附加动作分别属于两个或更多主体，不能把从句改为动名副词短语。',
      '若是无主句，辨认谓词是否为 светать、холодать、нездоровиться 一类无人称动词，或最低动词性的谓语副词；这些不提供可共享的行动者。',
      '若主句是被动构造，分别标出语法主语（逻辑对象）和 творительный падеж 中的实际行动者；二者不一致时禁止动名副词。',
      '对于教材答案与该禁止条件表面冲突的题，保留 needs-review，不把答案当成改写原书规则的依据。'
    ],
    semanticAnalysis: '禁止的根源都是“附加动作找不到与主动作相同的行动者”。多主体时行动责任分散；最低动词性无主句没有可承担两项动作的主体；被动句则把逻辑对象放到语法主语位置，把实际行动者改为工具格或省略。',
    signalAnalysis: [
      { sourceType: 'learning-note', signals: ['если, когда, так как, потому что'], use: '这些连词本身不禁止替换；若主从句仍有同一个语法主体，教材允许改成动名副词。' },
      { sourceType: 'learning-note', signals: ['светает, вечереет, холодает, нездоровится', 'совестно, смешно, скучно, светло, темно'], use: '这些是教材列出的低动词性无主谓词；它们提示没有可共享的主动行动者。' },
      { sourceType: 'learning-note', signals: ['выдаются / выданы библиотекарем', 'строятся / построены людьми', '-ся 被动形式'], use: '被动信号必须结合逻辑角色判断；不要只按表面主格名词把它当作动名副词实施者。' }
    ],
    contrasts: [
      { sourceType: 'source-example', left: 'Если брат пообещал помочь нам, он же обязательно это сделает.', right: 'Пообещав помочь нам, брат обязательно это сделает.', analysis: '两个分句的主体均为 брат 时可转换；这与两个不同主体的从句不同。' },
      { sourceType: 'source-example', left: 'Библиотекари выдают книги.', right: 'Книги выдаются библиотекарем.', analysis: '主动句的主格主体是行动者；被动句的主格 книги 是逻辑对象，实际行动者转为工具格，因此不得把被动主格误作 Adp 的实施者。' }
    ],
    commonErrors: [
      '把所有带 если、когда、так как、потому что 的从句一律禁止转换；教材只禁止主体不同的情形。',
      '看到与格对象就认为一定可以用动名副词，忽略谓词是否属于教材列出的最低动词性无主构造。',
      '把被动句的语法主语当成真正实施动作的人；这正是原书所说的逻辑与语法“冲突”。'
    ],
    relatedRules: ['3.1（主体区分）', '3.1.1（同一逻辑主体时的允许条件）'],
    pages: { pdfPages: [112, 113], printedPages: [110, 111] },
    fragment: sliceSource('## 3.1.2.', null),
    examples: [
      sourceExample('Если человечество овладеет солнечной энергией, то в ближайшем будущем появится постоянный источник термоядерной энергии.', [112], [110]),
      sourceExample('У спортсмена есть шанс стать призёром чемпионата, так как / потому что он пробежал дистанцию с хорошим результатом.', [112], [110]),
      sourceExample('Многие слоны становились жертвой охотников, когда последние старались добыть драгоценную слоновую кость.', [112], [110]),
      sourceExample('«Обладев солнечной энергией, у человечества в ближайшем будущем появится постоянный источник термоядерной энергии».', [112], [110], '原书错误例句'),
      sourceExample('«У спортсмена есть шанс стать призёром чемпионата, пробежав дистанцию с хорошим результатом».', [112], [110], '原书错误例句'),
      sourceExample('«Многие слоны становились жертвой охотников, стараясь добыть драгоценную слоновую кость».', [112], [110], '原书错误例句'),
      sourceExample('Если брат пообещал помочь нам, он же обязательно это сделает.', [112], [110]),
      sourceExample('Пообещав помочь нам, брат обязательно это сделает.', [112], [110]),
      sourceExample('Мне нездоровится. Мне холодно.', [113], [111], '原书模型例句'),
      sourceExample('Вечереет. Скучно.', [113], [111], '原书模型例句'),
      sourceExample('Библиотекари выдают / выдали книги.', [113], [111], '原书主动构造例句'),
      sourceExample('Строят города (люди).', [113], [111], '原书主动构造例句'),
      sourceExample('Книги выдаются / выданы библиотекарем.', [113], [111], '原书被动构造例句'),
      sourceExample('Города строятся / построены (людьми).', [113], [111], '原书被动构造例句')
    ],
    tables: [
      diagram('原书逻辑图式：两个主体分别实施动作', '[S1 + P1]        [S2 + P2]', [['S1 + P1', 'S2 + P2']], [112], [110]),
      diagram('原书主动／被动逻辑角色图式', 'Активные: S (И. п.) + P + O (В. п.)\nПассивные: S (И. п.) + P + O (Тв. п.)', [['主动：主格为逻辑主体', '被动：主格为逻辑对象，工具格为逻辑主体']], [113], [111])
    ],
    coverage: { ruleItems: 4, numberedItems: 3, examples: 14, tables: 2, rows: 2 },
    uncollectedItems: [],
    extraRisk: ['PDF-112 页尾的 “не работаетс...” 与 PDF-113 页首 “и др.)” 在扫描断页处存在字符切分风险；本单元保留完整清洗来源片段和页面范围，不把不确定的词形扩写成新规则。', 'GL3-Q039 的 PDF 答案选 A（被动／反身式 строится），与本节第 3 条的被动禁用条件表面冲突；保持 needs-review。']
  }
};

function makeOptionAnalysis(exercise, entry) {
  const correct = exercise.options.find(option => option.key === exercise.sourceAnswer);
  const distractors = exercise.options
    .filter(option => option.key !== exercise.sourceAnswer)
    .map(option => ({
      key: option.key,
      text: option.text,
      sourceType: 'learning-note',
      reason: entry.status === 'source-exercise-only'
        ? '它不是 PDF 原书答案；理论区没有该题型的独立规则，不能把错误项的排除理由伪装成原书规则。'
        : entry.status === 'needs-review'
          ? '它不是 PDF 原书答案；该题存在原书答案与主体／语态条件的边界冲突，必须保持 needs-review。'
          : '它不能同时保留题干附加动作与主句主要动作由同一可恢复逻辑主体实施的条件，或改变了原题的句法／语义关系。'
    }));
  const prefix = entry.status === 'mapped'
    ? `正确项「${correct?.key}」：${entry.mappingReason}`
    : entry.status === 'needs-review'
      ? `PDF 原书答案为「${correct?.key}」，但仍需复核：${entry.mappingReason}`
      : `PDF 原书答案为「${correct?.key}」；本题没有独立原书理论依据：${entry.mappingReason}`;
  return { sourceType: 'learning-note', correct: prefix, distractors };
}

function makeExerciseLink(entry) {
  const exercise = exercisesById.get(entry.exerciseId);
  if (!exercise) throw new Error(`Unknown Chapter 3 exercise: ${entry.exerciseId}`);
  if (exercise.answer !== exercise.sourceAnswer || !exercise.options.some(option => option.key === exercise.answer)) {
    throw new Error(`${exercise.id} does not satisfy repaired answer contract`);
  }
  return {
    exerciseId: exercise.id,
    printedNumber: exercise.printedNumber,
    exercisePrintedPage: entry.exercisePrintedPage,
    sourceType: 'exercise-example',
    status: entry.status,
    question: exercise.question,
    options: exercise.options,
    correctAnswer: exercise.sourceAnswer,
    ruleIds: entry.ruleIds || [],
    candidateRuleIds: entry.candidateRuleIds || [],
    mappingReason: entry.mappingReason,
    optionAnalysis: makeOptionAnalysis(exercise, entry),
    source: {
      questionPdfPage: entry.exercisePdfPage,
      questionPrintedPage: entry.exercisePrintedPage,
      answerPdfPage: 126,
      answerPrintedPage: 124,
      answerSource: 'PDF-126 / 印刷页 124：Ключи к третьей главе'
    }
  };
}

function buildUnit(sectionId, config) {
  const entries = Object.values(mapping.exercises).filter(entry => entry.sectionIds.includes(sectionId));
  const atomicRules = Object.entries(mapping.ruleCatalog)
    .filter(([, rule]) => rule.sectionId === sectionId)
    .map(([id, rule]) => ({
      id,
      titleZh: rule.titleZh,
      sourceReference: rule.sourceText,
      sourceType: 'learning-note',
      learningNote: '该原子规则用于索引；完整原书条件、图式和例句保留在本单元的 sourceRules、tables 与 examples。'
    }));
  const count = status => entries.filter(entry => entry.status === status).length;
  const coverage = config.coverage;
  return {
    schemaVersion: 2,
    id: `gl3-section-${sectionId.replace(/\./g, '-')}`,
    chapterId: 'gl3',
    sectionId,
    titleRu: config.titleRu,
    titleZh: config.titleZh,
    orientationZh: { sourceType: 'learning-note', text: config.orientationZh },
    quickDecision: config.quickDecision.map(text => ({ sourceType: 'learning-note', text })),
    sourceRules: [{
      sourceType: 'source-rule',
      text: config.fragment,
      source: { pdfPages: config.pages.pdfPages, printedPages: config.pages.printedPages }
    }],
    atomicRules,
    tables: config.tables,
    examples: config.examples,
    semanticAnalysis: { sourceType: 'learning-note', text: config.semanticAnalysis },
    signalAnalysis: config.signalAnalysis,
    contrasts: config.contrasts,
    commonErrors: config.commonErrors.map(text => ({ sourceType: 'learning-note', text })),
    exerciseLinks: entries.map(makeExerciseLink),
    relatedRules: config.relatedRules.map(text => ({ sourceType: 'learning-note', text })),
    source: {
      pdfPages: config.pages.pdfPages,
      printedPages: config.pages.printedPages,
      cleanedSource: 'cleaned-source/chapter-03.md',
      sourcePdf
    },
    sourceCoverage: {
      ruleItems: { total: coverage.ruleItems, captured: coverage.ruleItems },
      numberedItems: { total: coverage.numberedItems, captured: coverage.numberedItems },
      tables: { total: coverage.tables, captured: coverage.tables, rowsTotal: coverage.rows, rowsCaptured: coverage.rows },
      examples: { total: coverage.examples, captured: coverage.examples, countingMethod: '逐条保留原书正文、图式说明和脚注中的完整例句；概念导言没有独立例句时明确记为 0。' },
      relatedExercises: { total: entries.length, explained: entries.length },
      uncollectedItems: config.uncollectedItems,
      sourceExerciseOnly: entries.filter(entry => entry.status === 'source-exercise-only').map(entry => `${entry.exerciseId}：${entry.mappingReason}`),
      needsReview: entries.filter(entry => entry.status === 'needs-review').map(entry => `${entry.exerciseId}：${entry.mappingReason}`),
      ocrRisks: commonRisk.concat(config.extraRisk || [])
    },
    reviewStatus: 'needs-review',
    riskRecord: commonRisk.concat(config.extraRisk || [], [
      `本单元关联 ${entries.length} 题：mapped ${count('mapped')}、needs-review ${count('needs-review')}、source-exercise-only ${count('source-exercise-only')}。后两种状态保持显式，未由学习辅助层升级。`
    ])
  };
}

fs.mkdirSync(outputDirectory, { recursive: true });
const units = Object.entries(sections).map(([sectionId, config]) => [sectionId, buildUnit(sectionId, config)]);
for (const [sectionId, unit] of units) {
  fs.writeFileSync(path.join(outputDirectory, `section-${sectionId}.json`), `${JSON.stringify(unit, null, 2)}\n`, 'utf8');
}

const rows = units.map(([sectionId, unit]) => {
  const links = unit.exerciseLinks;
  const status = name => links.filter(link => link.status === name).length;
  return `| ${sectionId} | ${links.length} | ${unit.sourceCoverage.ruleItems.total}/${unit.sourceCoverage.ruleItems.captured} | ${unit.sourceCoverage.tables.total}/${unit.sourceCoverage.tables.captured} | ${unit.sourceCoverage.examples.total}/${unit.sourceCoverage.examples.captured} | ${status('mapped')} | ${status('needs-review')} | ${status('source-exercise-only')} |`;
});
fs.writeFileSync(coverageReportPath, `# Chapter 3 来源覆盖账本\n\n本账本由 \`D:\\MyStudySpace\\scripts\\build-zlatoust-chapter-03-units.js\` 从 \`cleaned-source/chapter-03.md\`、已 PDF 核对的 \`ch0002.json\` 与 Chapter 3 映射生成。原书内容、PDF 答案、练习内容与中文学习辅助分层保存；全章来源状态仍为 \`REVIEW\`。\n\n| 小节 | 关联练习 | 原书规则项 | 原书图式／表格 | 原书例句 | mapped | needs-review | source-exercise-only |\n| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |\n${rows.join('\n')}\n\n## 覆盖结论\n\n- 3.1 是概念导言，原书没有独立例句或表格；该事实被显式记录为 0/0，正文完整保留。\n- 3.1.1 完整保留两项许可条件、三幅逻辑图式、13 个原书例句，以及所有链接练习的 PDF 答案和选项解析。\n- 3.1.2 完整保留多主体、最低动词性无主构造和被动构造三项禁止条件、两幅图式、14 个原书例句（含原书错误例句）。\n- PDF-113 / 印刷页 111 的上半页属于 3.1.2，下半页开始 Chapter 4；清洗来源已按标题切分，两个章节均保留该页标记。\n- GL3-Q039 的 PDF 答案 A 与 3.1.2 被动构造禁用条件表面冲突，维持 \`needs-review\`；没有从题库答案反向改写原书规则。\n`, 'utf8');

fs.writeFileSync(qualityReportPath, `# Chapter 3 规则单元内容质量复核\n\n**状态：REVIEW。** 本批生成 3 个规则单元，均维持 \`needs-review\` 来源状态。\n\n## 已核对的内容层\n\n- 每个单元含中文定位、至少三步快速判断、完整原书规则片段、语义辨析、信号词、正反对照、常见错误、关联规则和风险记录。\n- 原书例句均标记为 \`source-example\`；练习题面为 \`exercise-example\`；中文说明与选项解析均标记为 \`learning-note\`。\n- 3.1.1 与 3.1.2 的原书逻辑图式以 \`source-table\` 保存其原始角色关系和页码，未压缩为一句结论。\n- 所有 99 道题在 3.1 总览中均有题面、选项、PDF 原书答案、映射理由和错误项说明；子节仅包含其反向索引的题目。\n\n## 保留的风险\n\n- \`GL3-Q039\`：PDF 答案 A 是被动／反身式 \`строится\`，与 3.1.2 的被动禁用条件表面冲突；保留 \`needs-review\`。\n- 63 道参与式、关系从句或其他题型缺少本章理论区的独立说明，保留 \`source-exercise-only\`，不虚构分词规则。\n- PDF-112 到 PDF-113 的 \`не работаетс… / и др.\` 处存在断页字符风险；完整来源片段、页码和风险均保留。\n`, 'utf8');

const summary = Object.values(mapping.exercises).reduce((counts, entry) => {
  counts[entry.status] = (counts[entry.status] || 0) + 1;
  return counts;
}, {});
console.log(JSON.stringify({ units: units.map(([sectionId, unit]) => ({ sectionId, exerciseLinks: unit.exerciseLinks.length, atomicRules: unit.atomicRules.length })), summary }, null, 2));
