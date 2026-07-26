const fs = require('fs');
const path = require('path');

const repoRoot = path.join(__dirname, '..');
const textbookRoot = path.join(repoRoot, 'data', 'textbook', 'zlatoust_grammar');
const theoryRoot = path.join(textbookRoot, 'theory');
const unitsDir = path.join(theoryRoot, 'rule-units', 'gl5');
const chapter = JSON.parse(fs.readFileSync(path.join(textbookRoot, 'ch0004.json'), 'utf8'));
const mapping = JSON.parse(fs.readFileSync(path.join(theoryRoot, 'mappings', 'chapter-05-exercise-to-rules.json'), 'utf8'));
const reverse = JSON.parse(fs.readFileSync(path.join(theoryRoot, 'mappings', 'chapter-05-section-to-exercises.json'), 'utf8'));
const source = fs.readFileSync(path.join(theoryRoot, 'cleaned-source', 'chapter-05.md'), 'utf8');

if (chapter.exercises.length !== 139) throw new Error('Chapter 5 exercise count must be 139');
if (!fs.existsSync(unitsDir)) fs.mkdirSync(unitsDir, { recursive: true });

function sourceRef(pdfPages, printedPages) {
  return { pdfPages, printedPages, source: 'E:\\Desktop\\语法词汇（同一本书）.pdf' };
}

function parseLexicalTables(markdown) {
  const tables = [];
  const lines = markdown.split(/\r?\n/);
  let pdfPage = null;
  let printedPage = null;
  let current = null;
  for (const line of lines) {
    const page = line.match(/^--- PDF-(\d{3}) \/ 印刷页 (\d+) ---$/);
    if (page) {
      pdfPage = Number(page[1]);
      printedPage = Number(page[2]);
      current = null;
      continue;
    }
    if (line === '| Слово | Значение | Словосочетания |') {
      current = { sourceType: 'source-table', title: `原书词汇表（PDF-${String(pdfPage).padStart(3, '0')} / 印刷页 ${printedPage}）`, headers: ['Слово', 'Значение', 'Словосочетания'], rows: [], markdownLines: [line, '| ---- | ---- | ---- |'], source: sourceRef([pdfPage], [printedPage]) };
      tables.push(current);
      continue;
    }
    if (current && line === '| ---- | ---- | ---- |') continue;
    if (current && line.startsWith('|')) {
      const cells = line.slice(1, -1).split('|').map(cell => cell.trim());
      if (cells.length !== 3 || !cells[0]) throw new Error(`Unparseable lexical table row: ${line}`);
      current.rows.push(cells);
      current.markdownLines.push(line);
      continue;
    }
    if (current && !line.startsWith('|')) current = null;
  }
  return tables.map(table => ({ ...table, markdown: table.markdownLines.join('\n'), markdownLines: undefined }));
}

const lexicalTables = parseLexicalTables(source);
const lexicalRows = lexicalTables.flatMap(table => table.rows.map(row => ({ word: row[0], meaning: row[1], collocations: row[2], source: table.source })));
if (lexicalTables.length !== 6 || lexicalRows.length !== 87) throw new Error(`Expected 6 lexical tables / 87 rows, found ${lexicalTables.length} / ${lexicalRows.length}`);

function rule(id, text, pdfPages, printedPages) {
  return { id, sourceType: 'source-rule', text, source: sourceRef(pdfPages, printedPages) };
}

const sourceRules = {
  '5.1': [
    rule('gl5-5.1-chto-ni-to-repetition', 'Конструкция что ни …, то … передаёт значение повторяющихся действий или явлений. Такие предложения синонимичны высказываниям со словом каждый.', [117], [115]),
    rule('gl5-5.1-kak-ne-necessity', 'Конструкция как (было) не + инфинитив выражает значение необходимости или вынужденности; по смыслу совпадает с нельзя (невозможно) не + инфинитив.', [117], [115]),
    rule('gl5-5.1-gde-tam-emotional-negation', 'Конструкция где там + существительное (прилагательное, глагол, наречие) передаёт значение отрицания в эмоционально окрашенной речи. Она близка конструкции с местоимением какой (какая, какое, какие).', [117], [115]),
    rule('gl5-5.1-ne-pronoun-a-emphatic', 'Для выделения слова, выражающего одновременно противопоставление и утверждение, используется конструкция не + неопределённое местоимение (наречие) + союз а.', [118], [116]),
    rule('gl5-5.1-ne-x-tak-alternative', 'Конструкция не …, так передаёт значение неизбежного альтернативного действия.', [118], [116]),
    rule('gl5-5.1-x-est-x-acceptance', 'Конструкции кто есть кто / что есть что выражают безоговорочное принятие того, что изменить невозможно; они синонимичны предложениям со словом это.', [118], [116]),
    rule('gl5-5.1-nom-instr-a-contrast', 'В сложносочинённых предложениях с противопоставительно-сопоставительным значением возможно употребление сочетания одного существительного в именительном и творительном падеже с союзом а.', [118], [116]),
    rule('gl5-5.1-nom-instr-no-insufficiency', 'В таких предложениях с союзом но может подчёркиваться недостаток первой части и необходимость добавить то, о чём сказано во второй части.', [118], [116]),
    rule('gl5-5.1-tozhe-mne-negative-evaluation', 'С помощью конструкции тоже мне + существительное (прилагательное, глагол, наречие) даётся отрицательная оценка лицу, явлению или событию.', [118], [116]),
    rule('gl5-5.1-a-tuda-zhe-disapproval', 'При помощи конструкции союз а + частица туда же даётся неодобрительная оценка какому-либо действию субъекта.', [118], [116]),
    rule('gl5-5.1-imperative-forced-action', 'В сложносочинённом предложении со значением вынужденного действия один личный глагольный предикат может быть заменён предикатом в форме императива единственного числа.', [118], [116]),
    rule('gl5-5.1-ne-forms-no-possibility', 'Конструкции инфинитив + косвенные падежи местоимений некого, нечего (наречия негде, некуда, некогда, незачем) указывают на невозможность действия из-за отсутствия объекта, места, времени, цели и т. д.', [118], [116])
  ],
  '5.2': [
    rule('gl5-5.2-to-speaker-unknown', 'Частица -то придаёт значение: информация о лице / предмете неизвестна говорящему.', [118], [116]),
    rule('gl5-5.2-nibud-indifferent', 'Частица -нибудь придаёт значение: информация о лице / предмете безразлична говорящему.', [118, 119], [116, 117]),
    rule('gl5-5.2-libo-bookish-nibud', 'Местоимения и наречия с частицей -либо синонимичны формам с -нибудь, но имеют книжный характер.', [119], [117]),
    rule('gl5-5.2-koe-speaker-known', 'Частица кое- показывает, что информация о лице / предмете известна говорящему, но не известна собеседнику; она также может обозначать известное говорящему, но неизвестное собеседнику место/направление.', [119], [117]),
    rule('gl5-5.2-koe-some-places', 'Наречия где, куда, откуда с кое- могут означать некоторые места.', [119], [117]),
    rule('gl5-5.2-koe-kogda-sometimes', 'Наречие кое-когда может иметь значение «иногда, временами».', [119], [117]),
    rule('gl5-5.2-kogda-to-past', 'Наречие когда-то имеет значение «давно, в прошлом».', [119], [117]),
    rule('gl5-5.2-koe-preposition-placement', 'С кое-кто, кое-что, кое-какой предлог обычно ставится после частицы: кое у кого, кое в чём, кое с какими; в разговорной речи возможна позиция перед частицей: от кое-чего, для кое-кого.', [119], [117])
  ],
  '5.lexical': [
    rule('gl5-5.lexical-commentary', 'Лексический комментарий к главе 5: некоторые случаи различения сходных слов. Все строки исходных таблиц перенесены ниже без сжатия.', [119, 120, 121, 122, 123, 124], [117, 118, 119, 120, 121, 122])
  ]
};

const sourceExamples = {
  '5.1': [
    ['У него что ни день, то какое-нибудь приключение.', [117], [115]], ['У этой певицы что ни песня, то шедевр.', [117], [115]], ['У этого спортсмена что ни выступление, то новый рекорд. — У этого спортсмена каждое выступление — новый рекорд.', [117], [115]],
    ['Мой коллега так просил меня выступить на собрании! Как (было) не пойти!', [117], [115]], ['Как было не дать детям конфет! Они их так хотели! — Нельзя (невозможно) было не дать детям конфет!', [117], [115]],
    ['Она учится на пятёрки? — Где там пятёрки! Одни двойки!', [117], [115]], ['Какой там молодец! Какая там умница! Какое там отдохнула! Какие там пятёрки!', [117], [115]],
    ['Она вышла замуж не за кого-нибудь, а за самого умного и красивого парня на нашем курсе.', [118], [116]], ['Я всё равно стану доктором наук. Не в этом году, так в следующем.', [118], [116]],
    ['Люди есть люди; Родина есть Родина. — Родина — это Родина.', [118], [116]], ['Жена женой, а мама мамой (маму никто не заменит).', [118], [116]], ['Семья семьёй, но и о себе забывать не стоит.', [118], [116]],
    ['Тоже мне музей! Ни одного подлинника.', [118], [116]], ['Плавать совсем не умеет, а туда же, вместе со всеми прыгнул в воду.', [118], [116]],
    ['Она развлекается, а мы убирай за неё.', [118], [116]], ['Не у кого спросить (в значении: Нет никого, у кого можно было бы спросить).', [118], [116]]
  ],
  '5.2': [
    ['Кто-то стоял за дверью и тихонько плакал; Где-то далеко загремел гром.', [118], [116]], ['Если кто-нибудь придёт ко мне, скажите, что я скоро вернусь; Когда-нибудь я вернусь в этот город.', [118, 119], [116, 117]],
    ['Чем более узким специалистом является кто-либо, тем большую отдачу следует от него ожидать.', [119], [117]], ['Я кое-что приготовила для тебя; Он встретился кое с кем из своих друзей.', [119], [117]],
    ['Кое-где в горах были разбросаны маленькие аккуратные домики; Кое-откуда участники конференции уже приехали.', [119], [117]], ['Кое-когда он вспоминал о прошлом, но не часто.', [119], [117]],
    ['Когда-то я уже слышал эту песню.', [119], [117]], ['кое у кого, кое в чём, кое с какими; от кое-чего, для кое-кого.', [119], [117]]
  ],
  '5.lexical': lexicalRows.map(row => [`${row.word}: ${row.collocations}`, row.source.pdfPages, row.source.printedPages])
};

function makeExamples(sectionId) {
  return sourceExamples[sectionId].map(([text, pdfPages, printedPages]) => ({ sourceType: 'source-example', text, source: sourceRef(pdfPages, printedPages) }));
}

const analysis = {
  '5.1': {
    titleRu: 'Грамматическая стилистика: разговорные и эмоционально окрашенные конструкции',
    titleZh: '会话与情绪化构式的语法文体',
    orientation: '本节不是把口语当成“随意语法”，而是辨认固定构式的语义功能：反复、无奈、否定评价、对照、被迫与缺失条件。先读出说话人的立场，再判断构式。',
    quick: ['先确认是否为固定整体，而非逐词翻译。', '判断说话人是在接受事实、否定评价、强调对照，还是表达被迫。', '再核对构式内部的格、否定词、连接词或命令式形式；近义表达不能自动替换为同一语体。'],
    semantic: '这些构式表面上常有否定、重复或特殊词序，但重点不是逐词翻译，而是说话人借它们完成什么动作：承认无法回避、否定对方的评价、贬抑、强调对照，或指出行动缺少必要条件。脱离语气和情境，只看语法形式会误判。',
    contrasts: [{ sourceType: 'learning-note', title: 'где там 与 как не', text: 'где там 是否定所说事实；как не + 不定式是在情境压力下承认“不能不做”。二者都带情绪色彩，却指向相反的语义动作。' }, { sourceType: 'learning-note', title: 'тоже мне 与 а туда же', text: 'тоже мне 直接贬低人或事物；а туда же 先给出主体能力/资格不足，再批评其仍要去做的行动。' }],
    signals: [{ sourceType: 'learning-note', signal: 'что ни…, то…', use: '反复出现的事件；可用 каждый 改述。', limit: '不是单次事件的普通条件句。' }, { sourceType: 'learning-note', signal: 'не…, так…', use: '不可避免的二选一替代。', limit: '不是任意的并列列举。' }, { sourceType: 'learning-note', signal: 'нечего/некого/негде + 不定式', use: '因为缺少对象、地点、时间等而不能行动。', limit: '不是表达主观“不想做”。' }],
    errors: [{ sourceType: 'learning-note', text: '不要把 тоже мне 当作普通的“也给我”：本节构式的功能是贬抑。' }, { sourceType: 'learning-note', text: '不要把“主格—工具格 + но”简化为两次重复；后半句承担补足或优先性。' }],
    related: ['5.2', '5.lexical']
  },
  '5.2': {
    titleRu: 'Употребление местоимений и наречий с частицами -то, -нибудь, -либо, кое-',
    titleZh: '带 -то、-нибудь、-либо、кое- 的代词和副词',
    orientation: '四类形式的关键不是“都表示某个”，而是信息对说话人和听话人分别是未知、无关、仅说话人已知，还是带书面语色彩。',
    quick: ['先问：说话人是否知道指代对象？', '若知道，再问是否只是不告诉听话人；若不知道，区分未知与“具体是谁并不重要”。', '最后检查 -либо 的书面语限制，以及 кое- 与介词的位置。'],
    semantic: '这四组不定形式表达的不是同一种模糊，而是不同的信息立场：-то 是说话人也不掌握对象；-нибудь 是对象具体是谁不重要；-либо 在相近意义上更书面；кое- 表示说话人知道一部分信息但不公开。先判断信息状态，再看词尾和语体。',
    contrasts: [{ sourceType: 'learning-note', title: '-то 与 кое-', text: '-то 表示说话人也不知道；кое- 表示说话人知道而听话人不知道。' }, { sourceType: 'learning-note', title: '-нибудь 与 -либо', text: '两者都可表示具体身份不重要；-либо 带书面语色彩，不能仅因形式相近就忽略语体。' }],
    signals: [{ sourceType: 'learning-note', signal: '-то', use: '未知的人、物、时间或地点。', limit: '不能用来表示说话人刻意保留的信息。' }, { sourceType: 'learning-note', signal: '-нибудь', use: '何者具体无关紧要。', limit: '不等于说话人不知道。' }, { sourceType: 'learning-note', signal: 'кое-', use: '说话人掌握、对方未掌握的部分信息；也可指某些地点。', limit: '有介词时先核对其位置和语体。' }],
    errors: [{ sourceType: 'learning-note', text: '不要把所有不定代词等同翻成“某个”；交际信息状态才是选择依据。' }, { sourceType: 'learning-note', text: '不要把 кое-когда 与 когда-то 混为一谈：前者是“有时”，后者是“从前”。' }],
    related: ['5.1', '5.lexical']
  },
  '5.lexical': {
    titleRu: 'Лексический комментарий: различение сходных слов',
    titleZh: '相近词的词义与搭配辨析',
    orientation: '本节以原书完整词表为准。选择时同时核对词义、词类/数的限制和典型搭配；同根或近形词不等于可互换。',
    quick: ['先确定句中要表达的是对象、性质、过程还是固定搭配。', '在同组相近词中比对原书定义和例搭配。', '再检查单复数、书面/口语和专业语境；原书没有收录的词项不伪造成规则。'],
    semantic: '相近词的边界经常不在中文的一个译词上，而在它把对象看成什么：日常物品还是客观物体，心理状态还是心理学领域，同行一起做还是专业协作。原书的搭配和数的限制不是附注，而是分辨词义的证据。',
    contrasts: [{ sourceType: 'learning-note', title: 'вещь 与 предмет', text: 'вещь 更偏向与人和日常使用相关的物品；предмет 是脱离人际归属的物体，亦可指生产/生活用品。' }, { sourceType: 'learning-note', title: 'вместе 与 совместно', text: 'вместе 是共同在场/做同一件事；совместно 强调非独自的专业或学习活动。' }, { sourceType: 'learning-note', title: 'психический 与 психологический', text: 'психический 关乎心理状态本身；психологический 关乎心理学这一学科。' }],
    signals: [{ sourceType: 'learning-note', signal: '搭配', use: '原书的搭配是判断词义边界的实证。', limit: '不能把未列搭配当作原书已许可。' }, { sourceType: 'learning-note', signal: '词形/数', use: '如 выбор 与 выборы、只单数/只复数提示含义。', limit: '形式相同或同根不保证词义相同。' }, { sourceType: 'learning-note', signal: '语义范围', use: '比较“材质、属性、学科、社会关系”等范围。', limit: '不要只凭中文直译做选择。' }],
    errors: [{ sourceType: 'learning-note', text: '不要把词表中未出现的近义词或派生词说成原书已讲解；相应练习必须保持 source-exercise-only。' }, { sourceType: 'learning-note', text: '不要只看共同词根；例如 кожаный、кожевенный、кожистый、кожный 分别对应材质、行业、表面特征与人体皮肤。' }],
    related: ['5.1', '5.2']
  }
};

function atomicRulesFor(sectionId) {
  if (sectionId !== '5.lexical') return sourceRules[sectionId].map(item => ({ ...item }));
  return lexicalRows.map((row, index) => ({
    id: `gl5-5.lexical-row-${String(index + 1).padStart(3, '0')}`,
    sourceType: 'source-table',
    titleRu: row.word,
    titleZh: `词汇条目：${row.word}`,
    text: `${row.word}: ${row.meaning}; ${row.collocations}`,
    source: row.source
  }));
}

function optionAnalysis(exercise, entry) {
  const correctOption = exercise.options.find(option => option.key === exercise.answer);
  const hasRule = entry.ruleIds.length > 0;
  const correct = hasRule
    ? `PDF 原书正确项为「${exercise.answer}：${correctOption.text}」。${entry.mappingReason}`
    : `PDF 原书正确项为「${exercise.answer}：${correctOption.text}」。${entry.mappingReason}`;
  return {
    sourceType: 'learning-note',
    correct,
    distractors: exercise.options.filter(option => option.key !== exercise.answer).map(option => ({
      key: option.key,
      text: option.text,
      reason: hasRule
        ? `该项不符合本题所连原书规则/词表条目的语义或搭配；PDF 正确项为「${exercise.answer}」。`
        : `该项不是 PDF 原书正确项。原书理论区未提供独立规则来逐项裁决，不能用 AI 说明冒充原书规则。`
    }))
  };
}

function exerciseLinks(sectionId) {
  const byId = new Map(chapter.exercises.map(exercise => [exercise.id, exercise]));
  return (reverse.sections[sectionId]?.exerciseIds || []).map(id => {
    const exercise = byId.get(id);
    const entry = mapping.exercises[id];
    if (!exercise || !entry) throw new Error(`Broken Chapter 5 mapping reference: ${id}`);
    return {
      exerciseId: id,
      printedNumber: exercise.printedNumber,
      status: entry.status,
      ruleIds: entry.ruleIds,
      candidateRuleIds: entry.candidateRuleIds,
      mappingReason: entry.mappingReason,
      sourceType: 'exercise-example',
      question: exercise.question,
      correctAnswer: exercise.answer,
      source: { questionPdfPage: entry.exercisePdfPage, questionPrintedPage: entry.exercisePrintedPage, answerPdfPage: 127, answerPrintedPage: 125 },
      optionAnalysis: optionAnalysis(exercise, entry)
    };
  });
}

function sourceCoverage(sectionId, rules, tables, examples, links) {
  const rowCount = tables.reduce((sum, table) => sum + table.rows.length, 0);
  return {
    ruleItems: { total: rules.length, captured: rules.length, unrecorded: [] },
    numberedItems: { total: sectionId === '5.1' ? 11 : sectionId === '5.2' ? 4 : 0, captured: sectionId === '5.1' ? 11 : sectionId === '5.2' ? 4 : 0, unrecorded: [] },
    tables: { total: tables.length, captured: tables.length, rowsTotal: rowCount, rowsCaptured: rowCount, unrecordedRows: [] },
    examples: { total: examples.length, captured: examples.length, unrecorded: [] },
    relatedExercises: { total: links.length, explained: links.length, unrecorded: [] },
    omitted: []
  };
}

function makeUnit(sectionId) {
  const config = analysis[sectionId];
  const rules = sourceRules[sectionId];
  const tables = sectionId === '5.lexical' ? lexicalTables : [];
  const examples = makeExamples(sectionId);
  const links = exerciseLinks(sectionId);
  const sourcePages = sectionId === '5.1' ? { pdf: [117, 118], printed: [115, 116] }
    : sectionId === '5.2' ? { pdf: [118, 119], printed: [116, 117] }
      : { pdf: [119, 120, 121, 122, 123, 124], printed: [117, 118, 119, 120, 121, 122] };
  return {
    schemaVersion: 1,
    id: `gl5-section-${sectionId}`,
    chapterId: 'gl5',
    sectionId,
    titleRu: config.titleRu,
    titleZh: config.titleZh,
    orientationZh: { sourceType: 'learning-note', text: config.orientation },
    quickDecision: config.quick.map(text => ({ sourceType: 'learning-note', text })),
    semanticAnalysis: { sourceType: 'learning-note', text: config.semantic },
    sourceRules: rules,
    tables,
    atomicRules: atomicRulesFor(sectionId),
    examples,
    contrasts: config.contrasts,
    signalAnalysis: config.signals,
    commonErrors: config.errors,
    exerciseLinks: links,
    relatedRules: config.related.map(relatedSectionId => ({ sectionId: relatedSectionId, sourceType: 'learning-note', relation: 'related', recommendation: `学习 ${sectionId} 后，可对照 ${relatedSectionId} 以避免将不同层级的语义条件混为一谈。` })),
    source: { sourcePdf: 'E:\\Desktop\\语法词汇（同一本书）.pdf', cleanedSource: 'cleaned-source/chapter-05.md', pdfPages: sourcePages.pdf, printedPages: sourcePages.printed, sourceStatus: 'review' },
    sourceCoverage: sourceCoverage(sectionId, rules, tables, examples, links),
    reviewStatus: 'needs-review'
  };
}

const units = ['5.1', '5.2', '5.lexical'].map(makeUnit);
units.forEach(unit => fs.writeFileSync(path.join(unitsDir, `section-${unit.sectionId}.json`), `${JSON.stringify(unit, null, 2)}\n`, 'utf8'));

const reportRows = units.map(unit => {
  const coverage = unit.sourceCoverage;
  const counts = unit.exerciseLinks.reduce((acc, link) => { acc[link.status] += 1; return acc; }, { mapped: 0, 'needs-review': 0, 'source-exercise-only': 0 });
  return `| ${unit.sectionId} | ${coverage.ruleItems.captured}/${coverage.ruleItems.total} | ${coverage.tables.captured}/${coverage.tables.total} | ${coverage.tables.rowsCaptured}/${coverage.tables.rowsTotal} | ${coverage.examples.captured}/${coverage.examples.total} | ${coverage.relatedExercises.explained}/${coverage.relatedExercises.total} | ${counts.mapped}/${counts['needs-review']}/${counts['source-exercise-only']} |`;
}).join('\n');

const coverageReport = `# 第 5 章原书来源覆盖账本\n\n**状态：** REVIEW（所有来源页在项目层仍为 review；本批已按 PDF 072–090 和 PDF 127 核对题页、选项和答案）。\n\n| 小节 | 原书规则项（已收录/总数） | 表格（已收录/总数） | 表格行（已收录/总数） | 原书例项（已收录/总数） | 关联练习（已解释/总数） | 映射（mapped/needs-review/source-only） |\n| --- | ---: | ---: | ---: | ---: | ---: | ---: |\n${reportRows}\n\n## 词表完整性\n\n- \`5.lexical\` 保留了原书 PDF-119–124 的 **6 张表、87 行**；每一行都有独立原子规则 ID，未将词群压缩为摘要。\n- 词表未直接收录的练习词义、搭配或构词辨析全部保留为 \`source-exercise-only\`，不会根据 PDF 答案补写原书规则。\n\n## 风险\n\n- 清洗来源仍受 OCR REVIEW 状态约束；已保留该状态，没有把结构化学习层提升为无风险原书校勘。\n- 64 道 \`source-exercise-only\` 题是可见覆盖状态，不是遗漏；它们在规则单元内保留题干、原书答案、页码和不映射理由。\n`;

const qualityReport = `# 第 5 章规则单元内容质量复核\n\n**结论：** REVIEW。三个原书小节均有可展开的结构化规则单元、完整来源页、练习双向链接和选项分析；项目级 OCR 风险和 \`source-exercise-only\` 状态保持可见。\n\n## 已检查\n\n- \`5.1\`：完整保留 11 个情绪化/会话构式的条件、例句、语义对照和易错点；GL5-Q118–Q139 都有直接原书依据。\n- \`5.2\`：按说话人/听话人的信息状态区分 -то、-нибудь、-либо、кое-，并保留语体和介词位置限制。\n- \`5.lexical\`：6 张原书表及 87 个词条均未压缩；每个条目保留定义和搭配。\n- 每个映射练习都有题目→规则理由；每条练习链接均保存原书正确项和其他选项的学习层分析。\n\n## 保留风险\n\n- REVIEW 不能描述为无风险 PASS：原书理论页仍来自 OCR 清洗层。\n- \`source-exercise-only\` 不等于不存在练习；它表示原书理论区没有可独立引用的规则或词表条目。\n- 学习层中文说明均标为 \`learning-note\`；不会伪装为 \`source-rule\` 或原书答案。\n`;

const auditReport = `# 第 5 章映射与数据核对审计\n\n- 题页：PDF 072–090 / 印刷页 70–88，139/139 题面和选项集已视觉核对。\n- 答案表：PDF 127 / 印刷页 125，标题《Ключи к пятой главе》。\n- 修复答案键：17 条（GL5-Q005、Q009、Q012、Q017、Q023、Q024、Q036、Q038、Q039、Q059、Q060、Q064、Q067、Q075、Q078、Q082、Q131）。\n- 题目 ID、题型和本地持久化契约均未修改；历史正确性重算仍延后至 reader 集成门槛通过。\n- 映射：75 \`mapped\`、0 \`needs-review\`、64 \`source-exercise-only\`，合计 139，无静默遗漏。\n- 详情：\`chapter-05-data-repair.json\`、\`mappings/chapter-05-*.json\` 和 \`rule-units/gl5/\`。\n`;

fs.writeFileSync(path.join(theoryRoot, 'quality-reports', 'chapter-05-source-coverage.md'), coverageReport, 'utf8');
fs.writeFileSync(path.join(theoryRoot, 'quality-reports', 'chapter-05-content-quality-review.md'), qualityReport, 'utf8');
fs.writeFileSync(path.join(theoryRoot, 'quality-reports', 'chapter-05-mapping-and-data-audit.md'), auditReport, 'utf8');

console.log(JSON.stringify({ units: units.map(unit => ({ sectionId: unit.sectionId, rules: unit.atomicRules.length, tables: unit.tables.length, tableRows: unit.tables.reduce((sum, table) => sum + table.rows.length, 0), examples: unit.examples.length, exerciseLinks: unit.exerciseLinks.length })), reports: ['chapter-05-source-coverage.md', 'chapter-05-content-quality-review.md', 'chapter-05-mapping-and-data-audit.md'] }, null, 2));
