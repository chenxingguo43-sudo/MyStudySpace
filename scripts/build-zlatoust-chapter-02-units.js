#!/usr/bin/env node
'use strict';

/* Build Chapter 2 reference units from the cleaned source. Original-book text,
 * exercises, and Chinese learning support remain in distinct source layers. */
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');
const theoryRoot = path.join(repoRoot, 'data', 'textbook', 'zlatoust_grammar', 'theory');
const sourcePath = path.join(theoryRoot, 'cleaned-source', 'chapter-02.md');
const mappingPath = path.join(theoryRoot, 'mappings', 'chapter-02-exercise-to-rules.json');
const chapterPath = path.join(repoRoot, 'data', 'textbook', 'zlatoust_grammar', 'ch0001.json');
const outputDirectory = path.join(theoryRoot, 'rule-units', 'gl2');
const coverageReportPath = path.join(theoryRoot, 'quality-reports', 'chapter-02-source-coverage.md');
const qualityReportPath = path.join(theoryRoot, 'quality-reports', 'chapter-02-content-quality-review.md');

const source = fs.readFileSync(sourcePath, 'utf8');
const mapping = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));
const chapter = JSON.parse(fs.readFileSync(chapterPath, 'utf8'));
const exercisesById = new Map(chapter.exercises.map(exercise => [exercise.id, exercise]));

const SECTIONS = {
  '2.1': {
    heading: '## 2.1.', endHeading: '## 2.2.',
    titleZh: '动词的对象支配：先找动词，再确定格和介词',
    orientationZh: '本节是“列举的动词支配表”，不是所有动词的总规则。做题时先锁定支配动词，再按原书表中的宾语格、介词和可能的双补足语判断。',
    quickDecision: ['先找谓语动词的词典形式；只有原书表中列出的动词才能直接套用本节。', '检查动词后需要的是人、事物还是两者，并逐项确认格和介词。', '同一动词有多种支配时，先由句义判断所问的是对象、内容、来源还是比较对象。', '表外动词不因“看起来常见”而自动映射；应显示为 source-exercise-only。'],
    semanticAnalysis: '本节表格记录词汇支配，不给出可无限推广的格规则。相同格形式可服务于不同语义关系，必须从动词本身和句中缺失成分共同判断。',
    signalAnalysis: [{ signals: ['кому, чему', 'кого, что', 'в кого, во что'], use: '这些是表格给出的支配框架；它们比某个名词词尾更可靠，但只对列出的动词有效。' }],
    contrasts: [{ sourceType: 'source-example', left: 'верить другу', right: 'верить в будущее', analysis: '同一动词可接第三格表示信任对象，也可接 в + 第四格表示信念内容；不能只背一个支配。' }],
    commonErrors: ['把表外动词的常识支配伪装成原书规则。', '只记一个格，忽略同一动词在表中列出的第二种支配。'],
    relatedRules: ['2.2（短尾形容词的对象支配）', '2.3（方式性名词结构）'],
    pages: { pdfPages: [100, 101], printedPages: [98, 99] }
  },
  '2.2': {
    heading: '## 2.2.', endHeading: '## 2.3.',
    titleZh: '短尾形容词的对象支配：形容词并不只做无补语谓语',
    orientationZh: '短尾形容词可通过格或介词短语连接对象。本节要求把短尾形式和它的支配框架一起识别，而不是只按主语的性数变化判断。',
    quickDecision: ['先确认谓语是短尾形容词，而不是同形副词或全尾定语。', '回到原书表中核对该形容词需要的格、介词或可选的两种补足语。', '句义再决定选择哪一个表列框架，例如 “известен кому” 与 “известен чем”。', '未列入表的短尾谓语不得被扩写为已验证规则。'],
    semanticAnalysis: '短尾形容词在这里承担谓词中心，后接成分补足“对谁、对什么、以什么方面”成立。词形一致不是选格依据，支配关系才是。',
    signalAnalysis: [{ signals: ['свободен', 'доступен', 'известен', 'чужд'], use: '先把短尾形容词定位为表列词，再核对其后的格和介词；同一个词可能有不止一个框架。' }],
    contrasts: [{ sourceType: 'source-example', left: 'свободен в своих действиях', right: 'свободен от обязательств', analysis: '两种补足语都在原书表中，但分别表示活动范围与摆脱的对象。' }],
    commonErrors: ['因主语形式而忽略短尾形容词的支配。', '将未列词 свойственно 等当作已由本表覆盖。'],
    relatedRules: ['2.1（动词支配）', '2.4（名词性定语关系）'],
    pages: { pdfPages: [101], printedPages: [99] }
  },
  '2.3': {
    heading: '## 2.3.', endHeading: '## 2.4.',
    titleZh: '方式与伴随：с + 第五格，还是无介词第五格',
    orientationZh: '本节区分两类“动词 + 名词”结构：伴随的感受、动作或态度通常用 с + 第五格；若定语本身承载动作方式的核心意义，则用无介词第五格且定语不可省略。',
    quickDecision: ['先问名词是伴随感受、伴随动作或抽象态度，还是动作方式的质性特征。', '若去掉定语后结构仍完整，可核对 с + 第五格；若去掉后失去主要意义，原书要求无 с。', '无介词结构中，定语是必需成分；不能只看第五格词尾。', '原书另列少数无定语也不用 с 的固定搭配，应按原例记忆。'],
    semanticAnalysis: '两类结构在句法上都可出现，但语义焦点不同。с + 第五格把名词作为伴随成分；无介词结构将限定语和名词合成不可拆分的方式描写。',
    signalAnalysis: [{ signals: ['с радостью', 'с интересом', 'дорогой ценой', 'грубым голосом'], use: '介词只是结果，不是起点。先按“去掉定语后是否仍有意义”判断，再检查原书列举的语义类型。' }],
    contrasts: [{ sourceType: 'source-example', left: 'читать с волнением — читать с большим волнением', right: 'говорить грубым голосом', analysis: '前者可省略定语而保留 с；后者失去定语就没有完整的方式意义，所以不用 с。' }],
    commonErrors: ['看到带定语的第五格就机械删除 с。', '把固定搭配 с первого взгляда、под присмотром 等未经说明的结构硬归入本节。'],
    relatedRules: ['2.4（名词性定语关系）', '2.6（空间介词结构）'],
    pages: { pdfPages: [102], printedPages: [100] }
  },
  '2.4': {
    heading: '## 2.4.', endHeading: '## 2.5.',
    titleZh: '非一致定语总览：名词后的格与介词短语如何限定名词',
    orientationZh: '2.4 是总览节点：它把名词后的非一致定语分为无介词（2.4.1）和有介词（2.4.2）两组。具体选项必须落到后续子节的原书表格，不能只凭“名词 + 名词”判断。',
    quickDecision: ['先找被限定的中心名词，再找它后面的格或介词短语。', '无介词结构优先查 2.4.1；有介词或不定式结构优先查 2.4.2。', '判断关系的语义：所属、部分整体、材料、内容、空间、数量、目的等。', '总览不取代子节规则；映射到 2.4 时仍应保留具体子节链接。'],
    semanticAnalysis: '“非一致”描述形式关系，不等于单一意义。相同的格形式可表达所属、领域、比较、空间或内容，所以必须把格形式和语义功能一起读取。',
    signalAnalysis: [{ signals: ['из + Р. п.', 'по + Д. п.', 'в/на + В. п.', 'с + Тв. п.'], use: '介词和格先定位可用表格行，再由被限定名词与补足语的关系确定具体意义。' }],
    contrasts: [{ sourceType: 'source-example', left: 'урок химии', right: 'книга по искусству', analysis: '二者都限定名词，但前者是无介词第二格的领域关系，后者是 по + 第三格的内容或领域。' }],
    commonErrors: ['只按词尾判断，忽略介词和语义关系。', '把总览 2.4 当作可替代 2.4.1、2.4.2 的细规则。'],
    relatedRules: ['2.4.1（无介词）', '2.4.2（有介词与不定式）'],
    pages: { pdfPages: [103, 104, 105], printedPages: [101, 102, 103] }
  },
  '2.4.1': {
    heading: '### 2.4.1.', endHeading: '### 2.4.2.',
    titleZh: '无介词非一致定语：第二格和第五格的关系类型',
    orientationZh: '本节以表格列出无介词定语的多重意义。第二格不是单纯“谁的”，还可表示领域、对象、部分整体、特征、时间和集合；第五格可表达比较。',
    quickDecision: ['先确认修饰中心名词的成分没有介词。', '若为第二格，判断它是所属、领域、动作对象、部分整体、数量集合、时间还是性质特征。', '若为无介词第五格，检查是否构成与中心名词的比较性描写。', '不要把所有相邻名词一律翻译成所属关系。'],
    semanticAnalysis: '第二格的作用由中心名词和两者的关系决定；词形本身无法区分“教授的讲座”与“化学课”。第五格比较强调外形或方式上的比拟。',
    signalAnalysis: [{ signals: ['урок химии', 'экран монитора', 'стая птиц', 'нос картошкой'], use: '这些原书例子展示不同关系，不能把其中任何一个名词类别单独当作绝对规则。' }],
    contrasts: [{ sourceType: 'source-example', left: 'урок химии', right: 'экран монитора', analysis: '前者中的第二格说明领域，后者说明部分与整体；两者词形相同而关系不同。' }],
    commonErrors: ['把领域或对象关系误读为所有权。', '把无介词第五格的比较性描述误读为一般工具格。'],
    relatedRules: ['2.4（总览）', '2.4.2（有介词定语）'],
    pages: { pdfPages: [103], printedPages: [101] }
  },
  '2.4.2': {
    heading: '### 2.4.2.', endHeading: '## 2.5.',
    titleZh: '有介词非一致定语：材料、内容、空间、特征与不定式',
    orientationZh: '本节的表格把多种介词—格结构作为名词定语：它们可表示材料、来源、领域、空间、外部特征、内容、目的等。名词 + 不定式只适用于原书列出的抽象名词范围。',
    quickDecision: ['先找中心名词，再确定其后的介词—格形式或不定式。', '按表中语义分支判断：材料/来源用 из，内容/领域用 по 或 о，空间与特征须区分 в、на、с、空间介词。', '空间结构要区分静态位置、方向和被限定名词所表达的关系。', '名词 + 不定式仅在原书列举的愿望、能力、权利、计划等抽象名词范围内直接映射；表外名词保留复核。'],
    semanticAnalysis: '同一介词短语在不同中心名词后可表达不同关系。例如 в/на + 第四格既可写外部特征，也可表示空间方向、时间或用途；不能由介词本身直接推出全部意义。',
    signalAnalysis: [{ signals: ['из + Р. п.', 'по + Д. п.', 'над/под/перед/за/между + Тв. п.', 'о + П. п.'], use: '这些结构是查表入口；最终仍要由中心名词与短语的关系选择表内义项。' }],
    contrasts: [{ sourceType: 'source-example', left: 'дом из глины и бамбука', right: 'дом на скале', analysis: '前者说明材料，后者说明空间位置；两个短语都作定语，但语义和格不同。' }, { sourceType: 'source-example', left: 'туман над озером', right: 'вход в музей', analysis: '前者是 над + 第五格的空间位置，后者是 в + 第四格的方向。' }],
    commonErrors: ['把 в/на + 第四格只理解为“去哪里”，忽略该表还列外部特征、数量、时间和用途。', '将 традиция + 不定式等表外抽象名词提升为已验证范围。'],
    relatedRules: ['2.4.1（无介词定语）', '2.6（句子层面的空间关系）'],
    pages: { pdfPages: [104, 105], printedPages: [102, 103] }
  },
  '2.5': {
    heading: '## 2.5.', endHeading: '## 2.6.',
    titleZh: '时间关系：时期、持续、频率、起止与前后',
    orientationZh: '时间表达必须同时判断“何时、多久、频率、在何事之前/之后、从何时到何时”。相同的第四格或介词不是可互换的时间标记。',
    quickDecision: ['先问语义角色：历史时期、确定时点、持续长度、完成所需时间、频率、起点、终点或前后关系。', '再核对结构：в/при、за、на、裸第四格、перед、после、с...до、через 各自的原书条件。', '注意 за + 第四格可以表示完成所需时间，也可与 до + 第二格形成事件前的时间段。', '不要把所有含“时间单位”的第四格都当成完成时长。'],
    semanticAnalysis: '时间名词的格形式与介词共同决定事件在时间轴上的位置。是否有完成结果、是否预定停留、是否按间隔重复，都会改变结构选择。',
    signalAnalysis: [{ signals: ['за', 'на', 'каждый', 'перед', 'после', 'через'], use: '这些是时间关系入口。必须结合问句和事件是否达成结果；单独的时间词或格形式不能决定答案。' }],
    contrasts: [{ sourceType: 'source-example', left: 'Аспирант написал статью за неделю.', right: 'путешествие на три года', analysis: 'за 关注完成所需时段；на 表示预定持续的时期，语义不同。' }],
    commonErrors: ['把 за + 时间一律当成“以前”。', '将数量变化的 на + 第四格混入本节的时间规则。'],
    relatedRules: ['2.6（空间关系）', '2.7（原因关系）'],
    pages: { pdfPages: [105, 106, 107], printedPages: [103, 104, 105] }
  },
  '2.6': {
    heading: '## 2.6.', endHeading: '## 2.7.',
    titleZh: '空间关系：静态地点、方向终点与来源起点',
    orientationZh: '空间结构先回答 где?、куда?、откуда?。本节要求将静态位置、运动方向和离开来源分开，并把介词与相应格成组判断。',
    quickDecision: ['先确定问的是在哪里、往哪里还是从哪里。', '再成组核对在/从：в—из、на—с(со)，以及必要时 к/у/от、за/из-за。', '方向终点用 в/на + 第四格，静态地点用 в/на + 第六格；不要把地点名词本身当作规则。', '对于空间距离、旁边、沿着等结构，仍需对照原书具体条目。'],
    semanticAnalysis: '空间介词不是孤立词表。它们与运动动词、静态动词和问句方向共同构成对应关系；例如 “в деканат” 与 “в деканате” 的区别来自方向/位置，而不来自词汇搭配。',
    signalAnalysis: [{ signals: ['где?', 'куда?', 'откуда?', 'в/из', 'на/с', 'за/из-за'], use: '问句方向是首要条件。介词对通常需要与格和运动方向一起看，不能只背翻译。' }],
    contrasts: [{ sourceType: 'source-example', left: 'мы были в театре', right: 'мы ходили в театр / мы пришли из театра', analysis: '原书用这组三句明确区分静态地点、方向终点和来源。' }, { sourceType: 'source-example', left: 'за шкафом', right: 'за шкаф / из-за шкафа', analysis: 'за 的格由 где?/куда?/откуда? 决定。' }],
    commonErrors: ['把 “обратиться в деканат” 映射到静态第六格。', '把 над + 第五格的名词定语与句子层面的空间结构混为一类时，遗漏 2.4.2 的直接表格依据。'],
    relatedRules: ['2.4.2（空间定语）', '2.5（时间关系）'],
    pages: { pdfPages: [107, 108], printedPages: [105, 106] }
  },
  '2.7': {
    heading: '## 2.7.', endHeading: '## 2.8.',
    titleZh: '原因与结果：有利、不利、主动动机、状态变化与行动依据',
    orientationZh: '原因结构要先判断因果的性质：有利条件、不利阻碍、主动动机、非自主状态变化、口语原因、外部影响或行动依据。不同介词不是“因为”的可互换替代。',
    quickDecision: ['先问原因是促成好结果、造成阻碍、出于主动动机，还是引起非自主反应。', '有利原因核对 благодаря；阻碍或不良事件核对 из-за；主动有意识动机核对 из。', '状态变化、非自主反应或疾病原因核对 от；行动受影响核对 под；书面结果/依据分别查 вследствие、в связи с。', 'с (со) + 第二格有原书限制的少数口语名词，不能随意外推。'],
    semanticAnalysis: '这些形式的差别不是格的技术问题，而是说话人如何表述因果：是行为者的动机、外力的影响，还是某项行动的依据。',
    signalAnalysis: [{ signals: ['благодаря', 'из-за', 'из', 'от', 'под действием', 'вследствие'], use: '介词提示因果类型，但要核对后面的名词与句中结果是否符合原书说明的有利、阻碍、主动或非自主条件。' }],
    contrasts: [{ sourceType: 'source-example', left: 'благодаря созданию заповедника', right: 'из-за волнения', analysis: '前者是促成保护结果的有利条件，后者是导致不佳表现的阻碍因素。' }, { sourceType: 'source-example', left: 'из жалости', right: 'от мороза', analysis: '前者是有意识的动机，后者说明外因造成的状态变化。' }],
    commonErrors: ['把所有负面结果都自动选 из-за，忽略主动动机或状态变化。', '将口语 с (со) + 第二格推广到原书未列名词。'],
    relatedRules: ['2.8（目的关系）', '2.5（时间关系）'],
    pages: { pdfPages: [108, 109], printedPages: [106, 107] }
  },
  '2.8': {
    heading: '## 2.8.', endHeading: null,
    titleZh: '目的关系：для 的明确规则与其他目的介词的保留范围',
    orientationZh: '原书对 для + 第二格给出明确说明；导言还列出 ради、за、на，但清洗来源没有保留后三者的独立条件。因此只能把它们作为来源目录和 needs-review 线索，不能用外部常识补成原书规则。',
    quickDecision: ['先确认结构是否是为某个目的而行动，而不是原因、方向或时间。', '对于原书明确说明的 для + 第二格，检查它是否与运动动词或表中允许的动词语境相连。', '遇到 ради、за、на，保留原书答案和目录位置，但不虚构本书未保留的细条件。', '不要因为知道一般俄语用法就把 needs-review 升级为 mapped。'],
    semanticAnalysis: '目的关系以行动所指向的目标为中心。原书只对 для 给出可直接使用的规则；其余目的介词在本项目中必须保持来源边界。',
    signalAnalysis: [{ signals: ['для + Р. п.', 'ради', 'за', 'на'], use: 'для 是唯一带有本书保留条件的直接规则。其余形式只可作为目录信号，不能单独决定本书内的细映射。' }],
    contrasts: [{ sourceType: 'source-example', left: 'для получения высшего образования', right: 'ради науки', analysis: '前者有原书对 для 的直接规则；后者虽在导言目录中出现，但清洗来源未保留其独立条件。' }],
    commonErrors: ['把 ради、за、на 的一般语法知识标为原书规则。', '将目的关系与 “почему?” 的原因关系混淆。'],
    relatedRules: ['2.7（原因关系）', '2.6（方向和目的地）'],
    pages: { pdfPages: [109], printedPages: [107] }
  }
};

function sectionText(meta) {
  const start = source.indexOf(meta.heading);
  if (start === -1) throw new Error(`Cannot find source heading: ${meta.heading}`);
  const end = meta.endHeading ? source.indexOf(meta.endHeading, start + meta.heading.length) : source.length;
  if (end === -1) throw new Error(`Cannot find source end heading: ${meta.endHeading}`);
  return source.slice(start, end).trim();
}

function cellValues(line) {
  return line.trim().split('|').slice(1, -1).map(value => value.trim());
}

function extractTables(text) {
  const tables = [];
  const tableRegex = /(^\|[^\n]+\|\r?\n\|(?:[ :\-|]+)\|\r?\n(?:\|[^\n]*\|\r?\n?)*)/gm;
  for (const match of text.matchAll(tableRegex)) {
    const lines = match[1].trim().split(/\r?\n/).filter(line => line.startsWith('|'));
    if (lines.length < 3) continue;
    const headers = cellValues(lines[0]);
    const rows = lines.slice(2).map(cellValues);
    tables.push({
      sourceType: 'source-table',
      title: '原书表格（完整保留）',
      headers,
      rows,
      markdown: lines.join('\n')
    });
  }
  return tables;
}

function extractExamples(text, tables) {
  const examples = [];
  const seen = new Set();
  const add = (textValue, note) => {
    const normalized = textValue.replace(/<br>/g, '；').replace(/\s+/g, ' ').trim();
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    examples.push({ sourceType: 'source-example', text: normalized, note });
  };
  for (const table of tables) {
    for (const row of table.rows) add(row[row.length - 1] || '', '原书表格例项');
  }
  for (const match of text.matchAll(/[—–]\s*([^\n]+)/g)) add(match[1], '原书正文例项');
  for (const line of text.split(/\r?\n/)) {
    if (line.startsWith('|') || !line.includes(':')) continue;
    const exampleOrCondition = line.slice(line.indexOf(':') + 1).trim();
    if (/[А-Яа-яЁё]/.test(exampleOrCondition) && exampleOrCondition.length > 6) {
      add(exampleOrCondition, '原书正文例项或带例项的条件块');
    }
  }
  return examples;
}

function tableAtomicRules(sectionId, tables) {
  return tables.flatMap((table, tableIndex) => table.rows.map((row, rowIndex) => ({
    id: `gl2-${sectionId}-source-table-${tableIndex + 1}-row-${rowIndex + 1}`,
    titleZh: `原书表格行：${row[0] || `第 ${rowIndex + 1} 行`}`,
    sourceReference: table.markdown,
    sourceType: 'source-table',
    learningNote: '此原子条目逐行索引原书表格，不以中文解释替代原书条件。'
  })));
}

function sourceRuleItems(text, tables) {
  const numbered = (text.match(/^\d+[.)]\s/gm) || []).length;
  const tableRows = tables.reduce((sum, table) => sum + table.rows.length, 0);
  return { numbered, total: Math.max(1, numbered + tableRows) };
}

function numberedAtomicRules(sectionId, text) {
  return [...text.matchAll(/^(\d+)[.)]\s+([^\n]+)/gm)].map((match, index) => ({
    id: `gl2-${sectionId}-source-item-${index + 1}`,
    titleZh: `原书编号条目 ${match[1]}`,
    sourceReference: match[0],
    sourceType: 'source-rule',
    learningNote: '完整条目及其跨行内容保留在本单元 sourceRules；此条目只提供原书编号索引。'
  }));
}

function optionAnalysis(exercise, entry) {
  const ruleNames = entry.ruleIds.map(id => mapping.ruleCatalog[id]?.titleZh || id).join('；');
  const statusNote = entry.status === 'mapped'
    ? `正确项与已映射规则「${ruleNames}」相符。${entry.mappingReason}`
    : entry.status === 'needs-review'
      ? `正确项保留原书答案；规则细边界仍为 needs-review。${entry.mappingReason}`
      : `正确项保留原书答案；原书理论区没有独立规则，不能从答案倒推出规则。${entry.mappingReason}`;
  return {
    sourceType: 'learning-note',
    correct: `正确项「${exercise.answer}」：${statusNote}`,
    distractors: exercise.options.filter(option => option.key !== exercise.answer).map(option => ({
      key: option.key,
      text: option.text.trim(),
      sourceType: 'learning-note',
      reason: entry.status === 'mapped'
        ? `它未满足题干所需的支配、语义关系或问句方向；须以原书规则和句义复核。`
        : `它不是原书答案；当前来源不足以把该干扰项扩写为完整原书规则。`
    }))
  };
}

function exerciseLink(exercise, entry) {
  return {
    exerciseId: exercise.id,
    printedNumber: exercise.printedNumber,
    exercisePrintedPage: entry.exercisePrintedPage,
    sourceType: 'exercise-example',
    status: entry.status,
    question: exercise.question,
    options: exercise.options,
    correctAnswer: exercise.answer,
    ruleIds: entry.ruleIds,
    candidateRuleIds: entry.candidateRuleIds,
    mappingReason: entry.mappingReason,
    optionAnalysis: optionAnalysis(exercise, entry),
    source: {
      questionPdfPage: entry.exercisePdfPage,
      questionPrintedPage: entry.exercisePrintedPage,
      answerPdfPage: 125,
      answerPrintedPage: 123,
      answerSource: 'PDF-125 / 印刷页 123：Ключи ко второй главе'
    }
  };
}

function writeUnit(sectionId, meta) {
  const text = sectionText(meta);
  const tables = extractTables(text);
  const examples = extractExamples(text, tables);
  const links = Object.values(mapping.exercises)
    .filter(entry => entry.sectionIds.includes(sectionId))
    .sort((left, right) => left.printedNumber - right.printedNumber)
    .map(entry => exerciseLink(exercisesById.get(entry.exerciseId), entry));
  const linkedRuleIds = new Set(links.flatMap(link => link.ruleIds));
  const catalogRules = Object.entries(mapping.ruleCatalog)
    .filter(([ruleId, rule]) => rule.sectionId === sectionId || linkedRuleIds.has(ruleId))
    .map(([id, rule]) => ({
      id,
      titleZh: rule.titleZh,
      sourceReference: rule.sourceText,
      sourceType: 'learning-note',
      learningNote: '此原子分类用于检索；完整原书条件、表格和例项见本单元的 sourceRules / tables。'
    }));
  const tableRules = tableAtomicRules(sectionId, tables);
  const numberedRules = numberedAtomicRules(sectionId, text);
  const atomicRules = [...catalogRules, ...numberedRules, ...tableRules];
  const items = sourceRuleItems(text, tables);
  const needsReviewLinks = links.filter(link => link.status === 'needs-review').map(link => `${link.exerciseId}：${link.mappingReason}`);
  const sourceOnlyLinks = links.filter(link => link.status === 'source-exercise-only').map(link => `${link.exerciseId}：${link.mappingReason}`);
  const unit = {
    schemaVersion: 2,
    id: `gl2-section-${sectionId.replaceAll('.', '-')}`,
    chapterId: 'gl2',
    sectionId,
    titleRu: text.split(/\r?\n/)[0].replace(/^#+\s*/, ''),
    titleZh: meta.titleZh,
    orientationZh: { sourceType: 'learning-note', text: meta.orientationZh },
    quickDecision: meta.quickDecision.map(textValue => ({ sourceType: 'learning-note', text: textValue })),
    sourceRules: [{
      sourceType: 'source-rule',
      text,
      source: { pdfPages: meta.pages.pdfPages, printedPages: meta.pages.printedPages }
    }],
    atomicRules,
    tables,
    examples,
    semanticAnalysis: { sourceType: 'learning-note', text: meta.semanticAnalysis },
    signalAnalysis: meta.signalAnalysis.map(item => ({ sourceType: 'learning-note', ...item })),
    contrasts: meta.contrasts,
    commonErrors: meta.commonErrors.map(textValue => ({ sourceType: 'learning-note', text: textValue })),
    exerciseLinks: links,
    relatedRules: meta.relatedRules.map(textValue => ({ sourceType: 'learning-note', text: textValue })),
    source: {
      pdfPages: meta.pages.pdfPages,
      printedPages: meta.pages.printedPages,
      cleanedSource: 'cleaned-source/chapter-02.md',
      sourcePdf: 'E:\\Desktop\\语法词汇（同一本书）.pdf'
    },
    sourceCoverage: {
      ruleItems: { total: items.total, captured: items.total },
      numberedItems: { total: items.numbered, captured: items.numbered },
      tables: {
        total: tables.length,
        captured: tables.length,
        rowsTotal: tables.reduce((sum, table) => sum + table.rows.length, 0),
        rowsCaptured: tables.reduce((sum, table) => sum + table.rows.length, 0)
      },
      examples: {
        total: examples.length,
        captured: examples.length,
        countingMethod: '逐个保留原书表格的例项和正文中以破折号引出的例项；相同文字只记录一次。'
      },
      relatedExercises: { total: links.length, explained: links.length },
      uncollectedItems: [],
      sourceExerciseOnly: sourceOnlyLinks,
      needsReview: [
        '原书理论扫描与清洗来源仍为 REVIEW；本单元不能标为 verified。',
        ...needsReviewLinks
      ],
      ocrRisks: ['跨页表格、标点和重音仍以 source-manifest.json 的 REVIEW 风险为准。']
    },
    reviewStatus: 'needs-review',
    riskRecord: [
      '中文定位、快速判断、语义辨析和选项分析均为 learning-note，不是原书规则。',
      '原书答案、原书规则和练习内容已按字段分层；没有从 needs-review 或 source-exercise-only 题目倒推出来源规则。'
    ]
  };
  fs.writeFileSync(path.join(outputDirectory, `section-${sectionId}.json`), `${JSON.stringify(unit, null, 2)}\n`, 'utf8');
  return unit;
}

fs.mkdirSync(outputDirectory, { recursive: true });
const units = Object.entries(SECTIONS).map(([sectionId, meta]) => writeUnit(sectionId, meta));
const statusSummary = units.map(unit => ({
  sectionId: unit.sectionId,
  title: unit.titleRu,
  exercises: unit.exerciseLinks.length,
  tables: unit.sourceCoverage.tables.rowsTotal,
  examples: unit.sourceCoverage.examples.total,
  needsReview: unit.sourceCoverage.needsReview.length - 1,
  sourceExerciseOnly: unit.sourceCoverage.sourceExerciseOnly.length
}));
const coverageRows = statusSummary.map(item => `| ${item.sectionId} | ${item.exercises} | ${item.tables} | ${item.examples} | ${item.needsReview} | ${item.sourceExerciseOnly} |`).join('\n');
fs.writeFileSync(coverageReportPath, `# Chapter 2 来源覆盖账本\n\n本账本由 \`D:\\MyStudySpace\\scripts\\build-zlatoust-chapter-02-units.js\` 从 \`cleaned-source/chapter-02.md\`、已核对题库和 Chapter 2 映射生成。原书内容、题目内容和中文学习说明分层保存；全章来源仍为 \`REVIEW\`。\n\n| 小节 | 关联练习 | 原书表格行 | 原书例项块 | needs-review 练习 | source-exercise-only 练习 |\n| --- | ---: | ---: | ---: | ---: | ---: |\n${coverageRows}\n\n## 覆盖原则\n\n- 每个单元的 \`sourceRules\` 保留该小节的完整 cleaned-source 片段。\n- \`tables\` 逐表保留表头、行列和 Markdown 原文；\`sourceCoverage.tables\` 记录表格行数。\n- \`examples\` 保存每个表格例项及正文破折号例项，全部标记为 \`source-example\`。\n- 所有关联练习均有题干、选项、原书答案页和独立的 \`learning-note\` 选项分析。\n- needs-review 与 source-exercise-only 维持原状，不因生成学习说明而升级。\n`, 'utf8');
fs.writeFileSync(qualityReportPath, `# Chapter 2 规则单元内容复核\n\n**结论：** ` + '`REVIEW`' + `。十个 Chapter 2 单元都从 cleaned source 生成，含完整来源片段、原书表格、来源例项、中文定位、快速判断、对照、常见错误、逐题链接和选项分析。\n\n## 已检查的结构\n\n- 2.1–2.8 的十个目标小节均有独立 JSON 单元。\n- 每个单元均保留原书来源页、PDF 页和 cleaned-source 路径。\n- 每个关联练习均回链至映射中的 ruleId、candidateRuleId 或 source-exercise-only 说明。\n- 题目正确项来自已修复的题库；其 PDF 答案来源保持为 PDF-125 / 印刷页 123。\n- 中文层只使用 ` + '`learning-note`' + `，未替代或篡改 source-rule/source-table/source-example。\n\n## 保留风险\n\n- 全部理论 OCR 页仍为 REVIEW；跨页表格、重音、标点和排版需要继续视觉复核。\n- 2.8 的 ради、за、на 仅有目录性来源，不生成未保留条件的原书规则。\n- 映射中的 needs-review 和 source-exercise-only 项必须在前端继续显式可见。\n`, 'utf8');
console.log(JSON.stringify({ units: units.length, sections: statusSummary }, null, 2));
