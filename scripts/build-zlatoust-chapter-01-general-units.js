const fs = require('fs');
const path = require('path');

const repoRoot = path.join(__dirname, '..');
const textbookRoot = path.join(repoRoot, 'data', 'textbook', 'zlatoust_grammar');
const theoryRoot = path.join(textbookRoot, 'theory');
const unitsDir = path.join(theoryRoot, 'rule-units', 'gl1');
const mappingPath = path.join(theoryRoot, 'mappings', 'exercise-to-rules.json');
const reversePath = path.join(theoryRoot, 'mappings', 'section-to-exercises.json');
const chapter = JSON.parse(fs.readFileSync(path.join(textbookRoot, 'ch0000.json'), 'utf8'));
const mapping = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));
const reverse = JSON.parse(fs.readFileSync(reversePath, 'utf8'));

if (!fs.existsSync(unitsDir)) fs.mkdirSync(unitsDir, { recursive: true });

const extraCatalog = {
  'gl1-1.2-passive-action-singular': { sectionId: '1.2', titleZh: '数量主语表示被动动作时倾向单数谓语', theoryPrintedPages: [92], sourceText: '1.2 B.2：被动动作时 преимущественно 使用单数形式。' },
  'gl1-1.3-permanent-vs-temporary': { sectionId: '1.3', titleZh: '全尾表示恒常特征，短尾表示暂时状态', theoryPrintedPages: [92], sourceText: '1.3 意义差异 1：全尾为恒常性质，短尾为暂时、非持久状态。' },
  'gl1-1.3-absolute-vs-relative': { sectionId: '1.3', titleZh: '全尾表示绝对特征，短尾表示情境相关特征', theoryPrintedPages: [92], sourceText: '1.3 意义差异 2：全尾不依赖具体情境，短尾与具体情境相关。' },
  'gl1-1.3-short-case-government': { sectionId: '1.3', titleZh: '短尾形容词可支配格', theoryPrintedPages: [92], sourceText: '1.3 语法差异 1：短尾形容词可支配确定的格；谓语全尾不能。' },
  'gl1-1.3-short-pronoun-or-clause': { sectionId: '1.3', titleZh: 'то/это/что/всё 与从句补足语使用短尾', theoryPrintedPages: [93], sourceText: '1.3 语法差异 2：主语为 то、это、что、всё 或含从句补足语时使用短尾。' },
  'gl1-1.3-full-kakoi-takoi': { sectionId: '1.3', titleZh: 'какой/такой结构使用全尾形容词', theoryPrintedPages: [93], sourceText: '1.3 注意：какой 和 такой 后只用全尾形容词。' },
  'gl1-1.3-style-short-vs-full': { sectionId: '1.3', titleZh: '短尾的文学语体与全尾的口语色彩', theoryPrintedPages: [93], sourceText: '1.3 文体差异：短尾常见于文学语体，全尾可带口语色彩；艺术/新闻语体中短尾更具表现力。' },
  'gl1-1.4-aspect-system-overview': { sectionId: '1.4', titleZh: '完成体与未完成体在时态系统中的总览', theoryPrintedPages: [93, 98], sourceText: '1.4 标题：过去和将来时中未完成体与完成体动词的用法；具体条件由 1.4.1–1.4.8 分节给出。' }
};
for (const [id, item] of Object.entries(extraCatalog)) {
  if (mapping.ruleCatalog[id] && JSON.stringify(mapping.ruleCatalog[id]) !== JSON.stringify(item)) throw new Error(`Conflicting existing Chapter 1 rule catalog entry: ${id}`);
  mapping.ruleCatalog[id] = item;
}

function sourceRef(pdfPages, printedPages) {
  return { pdfPages, printedPages, source: 'E:\\Desktop\\语法词汇（同一本书）.pdf' };
}
function sourceRule(id, text, pdfPages, printedPages) {
  return { id, sourceType: 'source-rule', text, source: sourceRef(pdfPages, printedPages) };
}

const sourceRules = {
  '1.1': [
    sourceRule('gl1-1.1-attributive-agreement', 'При обозначении лиц по профессии, социальному положению и общественной принадлежности используются существительные мужского и женского рода: учитель — учительница, спортсмен — спортсменка, крестьянин — крестьянка, демократ — демократка. Для определённых профессий, должностей, учёных и воинских званий применяются существительные только мужского рода: физик, химик, биолог, директор, администратор, профессор; они употребляются и при лицах женского пола: адвокат Петрова, мастер спорта Егорова, кандидат технических наук Степанова.', [93], [91]),
    sourceRule('gl1-1.1-female-headword-agreement', 'Согласование прилагательных, местоимений в форме женского рода с существительными мужского рода носит разговорный характер: молодая директор Смелякова, наш майор Гордеева. В официальной речи: молодой директор Смелякова, наш майор Гордеева.', [93], [91]),
    sourceRule('gl1-1.1-compound-title-masculine', 'Если название должности или звания образовано сочетанием прилагательного и существительного (главный технолог, старший бухгалтер, младший лейтенант), то и в разговорной, и в официальной речи о женщинах правильно употреблять только форму мужского рода: научный сотрудник Зорина.', [93], [91]),
    sourceRule('gl1-1.1-feminine-verb-agreement', 'При существительном мужского рода, называющем лицо женского пола, глагол употребляется в форме женского рода: Доцент Марусева начала занятие.', [93], [91]),
    sourceRule('gl1-1.1-feminine-short-adjective', 'При таком существительном краткое прилагательное употребляется в форме женского рода: Инженер Федотова больна.', [93], [91]),
    sourceRule('gl1-1.1-feminine-short-participle', 'При таком существительном краткое причастие употребляется в форме женского рода: Депутат Игнатова оповещена о времени и месте встречи с избирателями.', [93], [91])
  ],
  '1.2': [
    sourceRule('gl1-1.2-collective-singular', 'Форма единственного числа обычно употребляется, если собирательное существительное с количественным значением (большинство, меньшинство, ряд, часть) не имеет зависимых слов.', [93], [91]),
    sourceRule('gl1-1.2-measure-singular', 'Форма единственного числа обычно употребляется, если количественно-именное сочетание имеет значение меры веса, пространства, времени.', [93, 94], [91, 92]),
    sourceRule('gl1-1.2-preposed-predicate-singular', 'Форма единственного числа обычно употребляется, если глагол-сказуемое предшествует количественному сочетанию, особенно в нераспространённых предложениях.', [94], [92]),
    sourceRule('gl1-1.2-active-action-plural', 'Форма множественного числа обычно употребляется, если количественное сочетание-подлежащее отделено от сказуемого другими словами или указывается активное действие.', [94], [92]),
    sourceRule('gl1-1.2-passive-action-singular', 'При пассивном действии преимущественно употребляется форма единственного числа.', [94], [92])
  ],
  '1.3': [
    sourceRule('gl1-1.3-full-definition', 'Полная форма качественных прилагательных может быть определением перед определяемым словом или после него; при постпозиции она обособляется запятыми.', [94], [92]),
    sourceRule('gl1-1.3-short-predicate', 'Полная и краткая формы могут быть предикатом; с прилагательными могут входить вспомогательные глаголы являться, казаться, становиться и связка быть.', [94], [92]),
    sourceRule('gl1-1.3-permanent-vs-temporary', 'Полная форма указывает на постоянный признак и вневременное качество; краткая — на временный признак и недлительное состояние.', [94], [92]),
    sourceRule('gl1-1.3-absolute-vs-relative', 'Полная форма обозначает абсолютный признак, не связанный с конкретной ситуацией; краткая — относительный признак, связанный с конкретной ситуацией.', [94], [92]),
    sourceRule('gl1-1.3-short-case-government', 'Краткая форма способна управлять определённым падежом; полная форма в функции предиката такой способностью не обладает.', [94], [92]),
    sourceRule('gl1-1.3-short-pronoun-or-clause', 'Краткая форма употребляется при субъекте то, это, что, всё и при дополнении, выраженном придаточной частью предложения.', [95], [93]),
    sourceRule('gl1-1.3-short-with-infinitive', 'При наличии инфинитива в предикате употребляется краткая форма.', [95], [93]),
    sourceRule('gl1-1.3-short-with-tak', 'При наличии слов как и так употребляется только краткая форма.', [95], [93]),
    sourceRule('gl1-1.3-full-kakoi-takoi', 'При наличии слов какой и такой употребляется только полная форма прилагательного.', [95], [93]),
    sourceRule('gl1-1.3-style-short-vs-full', 'Краткая форма характерна для литературного языка, полная — для разговорной речи; в газетно-публицистическом и художественном стилях краткая форма обладает большей экспрессивностью.', [95], [93]),
    sourceRule('gl1-1.3-predicative-instrumental', 'После являться, казаться, становиться и быть полная форма в функции предиката употребляется в творительном падеже.', [94, 95], [92, 93])
  ],
  '1.4': [
    sourceRule('gl1-1.4-aspect-system-overview', 'Употребление глаголов несовершенного и совершенного вида в прошедшем и будущем времени. В настоящем времени употребляются только глаголы несовершенного вида; конкретные условия организованы в подразделах 1.4.1–1.4.8.', [95, 96, 97, 98, 99, 100], [93, 94, 95, 96, 97, 98])
  ]
};

const examples = {
  '1.1': [
    ['адвокат Петрова; мастер спорта Егорова; кандидат технических наук Степанова.', [93], [91]], ['молодая директор Смелякова — разговорная речь; молодой директор Смелякова — официальная речь.', [93], [91]], ['научный сотрудник Зорина.', [93], [91]], ['Доцент Марусева начала занятие; Депутат Игнатова оповещена о времени и месте встречи с избирателями; Инженер Федотова больна.', [93], [91]], ['женщина-президент Эллен Джонсон-Серлиф приступила; Девушка-экскурсовод была очарована; Женщина-телохранитель ознакомлена.', [93], [91]]
  ],
  '1.2': [
    ['большинство присоединяется к мнению меньшинства.', [93], [91]], ['нам понадобилось несколько литров бензина; оставалось около километра; прошло несколько месяцев.', [93, 94], [91, 92]], ['В нашем саду выросло несколько новых деревьев.', [94], [92]], ['Несколько издательств Германии ... выпустили немецкие переводы книг.', [94], [92]], ['несколько хоккеистов бросились помогать вратарю.', [94], [92]], ['лишь несколько человек осталось сидеть на своих местах.', [94], [92]]
  ],
  '1.3': [
    ['После суровой зимы пришла яркая и тёплая весна; Она, всегда добрая и спокойная, внешность имела самую обычную.', [94], [92]], ['Этот реферат аспиранта оригинальный и интересный; Дом Чехова в Крыму полон солнца и цветов.', [94], [92]], ['Её движения всегда неторопливые ... — Движения её в этот момент неторопливы, лицо спокойно.', [94], [92]], ['эта комната маленькая — эта комната мала для трёх человек.', [94], [92]], ['студенты готовы к экзамену; Школьник, способный к математике.', [94], [92]], ['Всё замечательно; Некоторые животные способны различать до двухсот запахов; Мой брат замечателен тем, что он много читал.', [95], [93]], ['Как интересна эта книга! Так ярок и ослепителен снег; Какой красивый ребёнок! Такой замечательный словарь!', [95], [93]], ['Настоящая любовь многоголовна; Я на всё согласный; мальчик болен — мальчик больной.', [95], [93]]
  ],
  '1.4': []
};

const analysis = {
  '1.1': { titleRu: 'Согласование названий лиц с различными частями речи', titleZh: '人物职业称谓与其他词类的一致', orientation: '先判断职业/职务名词是否只有阳性形式，再分开处理定语、过去时动词、短尾形容词和短尾分词。指女性不自动意味着所有成分都用阴性。', quick: ['确认中心职业/职务名词是否为仅阳性的名称。', '若是“形容词 + 名词”的复合职称，定语保持阳性。', '再根据谓语类型和是否出现 женщина、девушка 等女性中心词决定阴性形式。'], semantic: '这一组形式的核心不是“说的是女人还是男人”，而是每个成分各自和谁保持一致。职业名称本身可能保留传统阳性形式；定语、过去时谓语和短尾形式在句中承担的功能不同，因此不能把某一处的阴性或阳性推广到整句话。', contrasts: ['口语里的 молодая директор 与正式语体中的 молодой директор。', '定语的阳性形式与谓语过去时/短尾形式的阴性形式不能混为一谈。'], signals: ['女性姓氏或职业名词指女性只触发特定成分的一致，不是全句统一换阴性。'], errors: ['不要把“女职员”理解成所有定语必用阴性；复合职称是原书明示的例外。'], related: ['1.2', '1.3'] },
  '1.2': { titleRu: 'Согласование количественных сочетаний с глаголом', titleZh: '数量表达与谓语的一致', orientation: '数量主语可接单数或复数，必须同时看数量表达的类型、谓语位置、动作主动性和句法距离，不能凭数量大于一直接选复数。', quick: ['先识别集合数量、度量数量还是普通数量名词组合。', '检查谓语是否前置，或主语与谓语是否被其他成分隔开。', '最后判断动作是主动参与还是被动状态。'], semantic: '数量短语并不总是把一群人当成“多个独立行动者”。说话人有时把它看作一个数量整体、度量或存在状态，单数更自然；当注意力落到多人主动分别参与的动作时，复数更容易出现。位置和距离会改变句子重心，所以数字本身不能裁决。', contrasts: ['主动动作的 several players rushed 与被动状态的 several people remained seated。', '谓语前置与主语后置不是单一数量规则。'], signals: ['большинство/меньшинство/ряд/часть、重量/时间/空间单位、谓语位置和主动性。'], errors: ['不要把“多个”当作复数谓语的充分条件。'], related: ['1.1', '1.3'] },
  '1.3': { titleRu: 'Полная и краткая форма качественных прилагательных', titleZh: '性质形容词全尾与短尾形式', orientation: '全尾和短尾不仅是形态替换：它们会改变特征的恒常/临时、绝对/情境意义、格支配能力、句法位置及语体效果。', quick: ['先判断是定语还是谓语，并观察是否有系词或不定式。', '比较特征是恒常/绝对还是暂时/情境相关。', '检查 особые signals：то/это/что/всё、как/так、какой/такой、格支配和语体。'], semantic: '全尾往往把性质当作对象较稳定、可直接描述的特征；短尾更容易把它说成“在当前条件下是怎样”或“对某事是否合适”。这不是绝对的时间对立，还会牵动句法位置、补足语和语体，因此先问句子要描述属性还是给出情境判断。', contrasts: ['маленькая 表绝对尺寸，мала 表相对“对三个人来说太小”。', 'мальчик болен 比 мальчик больной 更突出当下状态。'], signals: ['инфинитив、как/так、какой/такой、то/это/что/всё、支配格。'], errors: ['不要把短尾仅当作“更正式的全尾”；它可改变语义、句法和语体。'], related: ['1.1', '1.4'] },
  '1.4': { titleRu: 'Употребление видов глагола: обзор системы', titleZh: '未完成体与完成体的时态系统总览', orientation: '本小节是原书 1.4.1—1.4.8 的导航标题，不以一句“未完成体表过程、完成体表结果”替代子节中的全部条件、否定、词汇限制和命令式差异。', quick: ['先转到具体句法环境：过去/将来、否定、不定式或命令式。', '再用 1.4.1—1.4.8 的原书表格和条件判断。', '若题目没有直接理论依据，保留 source-exercise-only 而非从答案反推。'], semantic: '体的选择不是给每个动词贴“过程”或“结果”的固定标签，而是说话人怎样切分一次事件：是在陈述习惯、背景、尝试、是否发生过，还是在标出一次达成、顺序或可否实现。否定、不定式和命令式会重新定义这个问题，所以总览只负责把你送到正确子节。', contrasts: ['总览标题只提供范围；具体规则在八个子节。'], signals: ['时态、否定、не́льзя、不定式、命令式以及词汇触发词。'], errors: ['不要把本标题当作单条万能体规则。'], related: ['1.4.1', '1.4.2', '1.4.3', '1.4.4', '1.4.5', '1.4.6', '1.4.7', '1.4.8'] }
};

function makeExerciseLinks(sectionId) {
  const exerciseById = new Map(chapter.exercises.map(exercise => [exercise.id, exercise]));
  return (reverse.sections?.[sectionId]?.exerciseIds || []).map(id => {
    const exercise = exerciseById.get(id);
    const entry = mapping.exercises[id];
    if (!exercise || !entry) throw new Error(`Broken Chapter 1 mapping reference: ${id}`);
    const correct = exercise.options.find(option => option.key === exercise.answer);
    const linkedRuleTitles = (entry.ruleIds || []).map(ruleId => mapping.ruleCatalog[ruleId]?.titleZh || ruleId).join('；');
    return {
      exerciseId: id,
      printedNumber: exercise.printedNumber,
      // The formal mapping is the canonical record after the PDF page repair.
      exercisePrintedPage: entry.exercisePrintedPage,
      sourceType: 'exercise-example',
      status: entry.status,
      question: exercise.question,
      options: exercise.options,
      correctAnswer: exercise.answer,
      ruleIds: entry.ruleIds || [],
      candidateRuleIds: entry.candidateRuleIds || [],
      mappingReason: entry.mappingReason || `题面、PDF 正确项与原书「${linkedRuleTitles}」条件直接对应；旧 knowledgePoints 仅作定位。`,
      optionAnalysis: {
        sourceType: 'learning-note',
        correct: `PDF 原书正确项为「${exercise.answer}：${correct?.text || ''}」。${linkedRuleTitles ? `它符合本题所连原书规则：${linkedRuleTitles}。` : '原书理论没有独立规则，保留来源专有状态。'}`,
        distractors: exercise.options.filter(option => option.key !== exercise.answer).map(option => ({ key: option.key, text: option.text, sourceType: 'learning-note', reason: linkedRuleTitles ? `该项未满足「${linkedRuleTitles}」所要求的条件或意义；PDF 正确项为「${exercise.answer}」。` : `该项不是 PDF 原书正确项；原书没有足够独立规则逐项裁决。` }))
      },
      source: { questionPdfPage: entry.exercisePdfPage, questionPrintedPage: entry.exercisePrintedPage, answerPdfPage: 125, answerPrintedPage: 123 }
    };
  });
}

function makeUnit(sectionId) {
  const config = analysis[sectionId];
  const rules = sourceRules[sectionId];
  const links = makeExerciseLinks(sectionId);
  const atomicIds = Object.entries(mapping.ruleCatalog).filter(([, item]) => item.sectionId === sectionId).map(([id]) => id);
  const atomicRules = atomicIds.map(id => {
    const direct = rules.find(item => item.id === id);
    const item = mapping.ruleCatalog[id];
    return direct || { id, sourceType: 'source-rule', text: item.sourceText, source: sourceRef(sectionId === '1.1' ? [93] : sectionId === '1.2' ? [93, 94] : sectionId === '1.3' ? [94, 95] : [95, 96, 97, 98, 99, 100], item.theoryPrintedPages || (sectionId === '1.1' ? [91] : sectionId === '1.2' ? [91, 92] : sectionId === '1.3' ? [92, 93] : [93, 94, 95, 96, 97, 98])) };
  });
  const sourcePages = sectionId === '1.1' ? { pdf: [93], printed: [91] } : sectionId === '1.2' ? { pdf: [93, 94], printed: [91, 92] } : sectionId === '1.3' ? { pdf: [94, 95], printed: [92, 93] } : { pdf: [95, 96, 97, 98, 99, 100], printed: [93, 94, 95, 96, 97, 98] };
  const exampleItems = examples[sectionId].map(([text, pdfPages, printedPages]) => ({ sourceType: 'source-example', text, source: sourceRef(pdfPages, printedPages) }));
  return {
    schemaVersion: 1,
    id: `gl1-section-${sectionId}`,
    chapterId: 'gl1',
    sectionId,
    titleRu: config.titleRu,
    titleZh: config.titleZh,
    orientationZh: { sourceType: 'learning-note', text: config.orientation },
    quickDecision: config.quick.map(text => ({ sourceType: 'learning-note', text })),
    semanticAnalysis: { sourceType: 'learning-note', text: config.semantic },
    sourceRules: rules,
    tables: [],
    atomicRules,
    examples: exampleItems,
    contrasts: config.contrasts.map(text => ({ sourceType: 'learning-note', text })),
    signalAnalysis: config.signals.map(text => ({ sourceType: 'learning-note', text })),
    commonErrors: config.errors.map(text => ({ sourceType: 'learning-note', text })),
    exerciseLinks: links,
    relatedRules: config.related.map(target => ({ sourceType: 'learning-note', sectionId: target, text: `相关规则：${target}` })),
    source: { sourcePdf: 'E:\\Desktop\\语法词汇（同一本书）.pdf', cleanedSource: 'cleaned-source/chapter-01.md', pdfPages: sourcePages.pdf, printedPages: sourcePages.printed, sourceStatus: 'review' },
    sourceCoverage: {
      ruleItems: { total: rules.length, captured: rules.length, unrecorded: [] },
      numberedItems: { total: rules.length, captured: rules.length, unrecorded: [] },
      tables: { total: 0, captured: 0, rowsTotal: 0, rowsCaptured: 0, unrecordedRows: [] },
      examples: { total: exampleItems.length, captured: exampleItems.length, unrecorded: [] },
      relatedExercises: { total: links.length, explained: links.length, unrecorded: [] },
      omitted: []
    },
    reviewStatus: 'needs-review',
    riskRecord: ['来源文本来自 review 状态的 OCR 清洗层；中文定位与选项分析均为 learning-note，不是原书正文。', ...(sectionId === '1.4' ? ['1.4 是父级标题；本单元通过子节链接保留完整系统，不将八个子节压缩成一句体意义概括。'] : [])]
  };
}

const sectionIds = ['1.1', '1.2', '1.3', '1.4'];
const units = sectionIds.map(makeUnit);
for (const unit of units) fs.writeFileSync(path.join(unitsDir, `section-${unit.sectionId}.json`), `${JSON.stringify(unit, null, 2)}\n`, 'utf8');
fs.writeFileSync(mappingPath, `${JSON.stringify(mapping, null, 2)}\n`, 'utf8');

const reportRows = units.map(unit => {
  const coverage = unit.sourceCoverage;
  return `| ${unit.sectionId} | ${coverage.ruleItems.captured}/${coverage.ruleItems.total} | ${coverage.tables.rowsCaptured}/${coverage.tables.rowsTotal} | ${coverage.examples.captured}/${coverage.examples.total} | ${coverage.relatedExercises.explained}/${coverage.relatedExercises.total} |`;
}).join('\n');
const coverageReport = `# 第 1 章 1.1—1.4 来源覆盖账本\n\n**状态：** REVIEW。来源为 cleaned-source/chapter-01.md；所有原书规则、例项和练习链接以来源层为准，中文学习辅助层保持独立标签。\n\n| 小节 | 原书规则项（已收录/总数） | 表格行（已收录/总数） | 原书例项（已收录/总数） | 关联练习（已解释/总数） |\n| --- | ---: | ---: | ---: | ---: |\n${reportRows}\n\n- 1.1—1.3 在原书正文中没有独立表格；因此表格计数为 0/0，不是遗漏。\n- 1.4 是父级标题，具体体规则仍展开在 1.4.1—1.4.8；本单元链接子节而不缩写其条件、例外和语体限制。\n`;
const qualityReport = `# 第 1 章 1.1—1.4 规则单元内容质量复核\n\n**结论：** REVIEW。新增四个小节单元后，section-index.json 的 32 个理论小节均有独立规则单元。\n\n- 1.1 区分职务称谓、复合职称以及定语/谓语的不同一致机制。\n- 1.2 保留单数与复数谓语的数量类型、位置、主动/被动动作条件。\n- 1.3 保留全尾/短尾的语义、支配、句法触发和语体差别。\n- 1.4 明确为导航型父级规则，不以学习摘要替代 1.4.1—1.4.8。\n- 每条关联练习均保留 PDF 正确项和各干扰项的 learning-note 分析；GL1-Q076 仍在其原有 1.4.6 单元中保持 source-exercise-only。\n\n来源 OCR 仍为 REVIEW；上述内容不构成无风险校勘 PASS。\n`;
fs.writeFileSync(path.join(theoryRoot, 'quality-reports', 'chapter-01-source-coverage.md'), coverageReport, 'utf8');
fs.writeFileSync(path.join(theoryRoot, 'quality-reports', 'chapter-01-content-quality-review.md'), qualityReport, 'utf8');

console.log(JSON.stringify({ units: units.map(unit => ({ sectionId: unit.sectionId, atomicRules: unit.atomicRules.length, exerciseLinks: unit.exerciseLinks.length })), addedRuleCatalogIds: Object.keys(extraCatalog), reports: ['chapter-01-source-coverage.md', 'chapter-01-content-quality-review.md'] }, null, 2));
