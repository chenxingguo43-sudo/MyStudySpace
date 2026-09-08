const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const cardPath = 'data/textbook/zlatoust_grammar/theory/learning-pages/gl1/section-1.1.json';
const aspectCardPath = 'data/textbook/zlatoust_grammar/theory/learning-pages/gl1/section-1.4.1.json';
const cannotCardPath = 'data/textbook/zlatoust_grammar/theory/learning-pages/gl1/section-1.4.5.json';
const negativeInfinitiveCardPath = 'data/textbook/zlatoust_grammar/theory/learning-pages/gl1/section-1.4.6.json';
const forbiddenGerundCardPath = 'data/textbook/zlatoust_grammar/theory/learning-pages/gl3/section-3.1.2.json';

function loadCard() {
  return JSON.parse(fs.readFileSync(cardPath, 'utf8'));
}

function loadStageOne() {
  const card = loadCard();
  return card.stages.find((stage) => stage.id === 'stage-title');
}

function loadStageTwo() {
  const card = loadCard();
  return card.stages.find((stage) => stage.id === 'stage-attribute');
}

function loadStageThree() {
  const card = loadCard();
  return card.stages.find((stage) => stage.id === 'stage-compound');
}

function loadStageFour() {
  const card = loadCard();
  return card.stages.find((stage) => stage.id === 'stage-predicate');
}

function loadAspectFactStage() {
  const card = JSON.parse(fs.readFileSync(aspectCardPath, 'utf8'));
  return card.stages.find((stage) => stage.id === 'stage-fact');
}

function loadForbiddenGerundCard() {
  return JSON.parse(fs.readFileSync(forbiddenGerundCardPath, 'utf8'));
}

function loadCannotCard() {
  return JSON.parse(fs.readFileSync(cannotCardPath, 'utf8'));
}

function loadNegativeInfinitiveCard() {
  return JSON.parse(fs.readFileSync(negativeInfinitiveCardPath, 'utf8'));
}

test('GL1 section 1.1 defines four complete branches for the shared retrieval map', () => {
  const card = loadCard();
  assert.equal(card.teachingLayoutVersion, 2);
  assert.equal(card.mindMapMode, 'retrieval');
  assert.equal(card.mindMapQuestion, '空格里的词在句子里做什么？');
  assert.deepEqual(
    card.mindMap.map((branch) => branch.id),
    ['stage-title', 'stage-attribute', 'stage-compound', 'stage-predicate']
  );
  for (const branch of card.mindMap) {
    assert.ok(branch.label && branch.recognize && branch.rule && branch.example && branch.trap);
  }
  assert.match(card.mindMap[1].rule, /正式语体用阳性/);
  assert.match(card.mindMap[2].example, /Q001/);
  assert.match(card.mindMap[3].trap, /动词看的是这个人/);
});

test('GL1 section 1.4.1 explains general and concrete facts through speaker focus before signal words', () => {
  const stage = loadAspectFactStage();
  const teachingText = stage.teacherExplanation.join('\n');
  assert.equal(stage.teacherExplanation.length, 9);
  assert.match(teachingText, /动词体不是给动作贴.*客观标签/);
  assert.match(teachingText, /一般事实.*“你有没有过/);
  assert.match(teachingText, /具体事实.*潜台词.*办成了吗/);
  assert.match(teachingText, /один раз.*一次不等于目标结果/s);
  assert.match(teachingText, /наконец.*自动钥匙/s);
  assert.match(teachingText, /先.*遮住信号词.*再用.*核对/s);
  assert.doesNotMatch(teachingText, /只要出现.*几乎一定|信号词.*自动决定/);
  assert.ok(stage.commonErrors.some((error) => /один раз.*一次只说明经历/.test(error)));
  assert.ok(stage.commonErrors.some((error) => /наконец.*等待的目标/.test(error)));
});

test('GL1 section 1.1 signal guidance uses plain labels and complete positive and negative examples', () => {
  const card = loadCard();
  for (const stage of card.stages) {
    assert.equal(stage.signalLabels.title, '看到这些形式时，先这样判断');
    assert.equal(stage.signalLabels.valid, '可以这样判断');
    assert.equal(stage.signalLabels.fails, '遇到这种情况，不能套这条规则');
    for (const signal of stage.signals) {
      assert.match(signal.validWhen, /例如|比如/);
      assert.match(signal.validWhen, /[А-Яа-яЁё]+/);
      assert.match(signal.failsWhen, /例如|比如/);
      assert.match(signal.failsWhen, /[А-Яа-яЁё]+/);
    }
  }
});

test('GL1 section 1.1 stage 1 keeps its source evidence and exercise contract', () => {
  const stage = loadStageOne();
  assert.deepEqual(stage.exerciseIds, ['GL1-Q005', 'GL1-Q006', 'GL1-Q007']);
  assert.equal(stage.sourceRule.ru, 'Для определённых профессий, должностей, учёных и воинских званий применяются существительные только мужского рода и при лицах женского пола.');
  assert.equal(stage.sourceRule.zh, '某些职业、职务、学术和军衔名称只用阳性名词，指女性时也如此。');
  assert.deepEqual(stage.sourceRule.source, { printedPages: [91], pdfPages: [93] });
  assert.equal(stage.sourceEvidence.ru, 'Для определённых профессий, должностей, учёных и воинских званий применяются существительные только мужского рода: физик, химик, биолог, директор, администратор, профессор; они употребляются и при лицах женского пола: адвокат Петрова, мастер спорта Егорова, кандидат технических наук Степанова.');
  assert.equal(stage.sourceEvidence.zh, '某些职业、职务、学术和军衔名称只用阳性名词：物理学家、化学家、生物学家、主任、管理员、教授；它们也用于女性：女律师彼得罗娃、女子运动健将叶戈罗娃、女技术科学副博士斯捷潘诺娃。');
  assert.deepEqual(stage.sourceEvidence.source, { printedPages: [91], pdfPages: [93] });
  assert.deepEqual(stage.sourceExamples.map(({ ru, zh, source }) => ({ ru, zh, source })), [
    { ru: 'адвокат Петрова; мастер спорта Егорова.', zh: '律师彼得罗娃；运动健将叶戈罗娃。', source: { printedPages: [91], pdfPages: [93] } },
    { ru: 'кандидат технических наук Степанова.', zh: '技术科学副博士斯捷潘诺娃。', source: { printedPages: [91], pdfPages: [93] } }
  ]);
  assert.deepEqual(stage.checks.map(({ id, answer, retry }) => ({ id, answer, retryAnswer: retry.answer })), [
    { id: 'title-check-1', answer: 'Б', retryAnswer: 'Б' },
    { id: 'title-check-2', answer: 'А', retryAnswer: 'А' }
  ]);
});

test('GL1 section 1.1 stage 1 teaches the rule in plain language before asking for abstraction', () => {
  const stage = loadStageOne();
  const teachingText = [stage.question, stage.entry.prompt, ...stage.teacherExplanation,
    ...stage.sourceExamples.map((example) => example.analysis),
    ...stage.contrasts.map((contrast) => contrast.analysis), ...stage.commonErrors,
    ...stage.checks.flatMap((check) => Object.values(check.feedback))].join('\n');
  assert.match(stage.question, /先看.*(职业|职称)名称本身/);
  assert.match(stage.entry.prompt, /女性姓氏.*阳性形式.*姓名和上下文.*职业词/s);
  assert.match(stage.teacherExplanation.join('\n'), /учитель.*учительница.*физик.*директор/s);
  assert.match(stage.teacherExplanation.join('\n'), /Петрова.*Егорова.*Степанова.*姓氏/s);
  assert.match(stage.teacherExplanation.join('\n'), /физик.*химик.*биолог.*директор.*администратор.*профессор/s);
  assert.match(stage.teacherExplanation.join('\n'), /职业名称.*形容词.*代词.*动词.*职业名称本身/s);
  assert.match(stage.teacherExplanation.join('\n'), /адвокатка.*доктор наук Иванова/s);
  assert.match(stage.contrasts[0].analysis, /第一步.*第二步/s);
  assert.ok(stage.commonErrors.every((error) => error.includes('纠正：')));
  assert.match(stage.checks[0].feedback.review, /分流题.*选择的是.*形容词.*下一阶段/s);
  assert.doesNotMatch(teachingText, /永远|全部判定|绝对错误/);
});

test('GL1 section 1.1 stage 2 keeps its source evidence and exercise contract', () => {
  const stage = loadStageTwo();
  assert.deepEqual(stage.exerciseIds, ['GL1-Q001', 'GL1-Q002', 'GL1-Q003', 'GL1-Q004']);
  assert.equal(stage.sourceRule.ru, 'Женская форма прилагательных и местоимений с существительными мужского рода носит разговорный характер; в официальной речи употребляется мужская форма.');
  assert.equal(stage.sourceRule.zh, '女性形式的定语、代词与阳性职业名词搭配有口语色彩；正式语体使用阳性形式。');
  assert.deepEqual(stage.sourceRule.source, { printedPages: [91], pdfPages: [93] });
  assert.equal(stage.sourceEvidence.ru, 'Согласование прилагательных, местоимений в форме женского рода с существительными мужского рода носит разговорный характер: молодая директор Смелякова, наш майор Гордеева. В официальной речи: молодой директор Смелякова, наш майор Гордеева.');
  assert.equal(stage.sourceEvidence.zh, '女性形式的形容词、代词与阳性名词的一致有口语特点：年轻的女主任斯梅利亚科娃、我们的女少校戈尔杰耶娃。正式语体：年轻的主任斯梅利亚科娃、我们的少校戈尔杰耶娃。');
  assert.deepEqual(stage.sourceEvidence.source, { printedPages: [91], pdfPages: [93] });
  assert.deepEqual(stage.sourceExamples.map(({ ru, zh, source }) => ({ ru, zh, source })), [
    { ru: 'молодая директор Смелякова — разговорная речь; молодой директор Смелякова — официальная речь.', zh: '年轻的女主任斯梅利亚科娃为口语；年轻的主任斯梅利亚科娃为正式语体。', source: { printedPages: [91], pdfPages: [93] } },
    { ru: 'наш майор Гордеева.', zh: '我们的少校戈尔杰耶娃。', source: { printedPages: [91], pdfPages: [93] } }
  ]);
  assert.deepEqual(stage.checks.map(({ id, answer, retry }) => ({ id, answer, retryAnswer: retry.answer })), [
    { id: 'attribute-check-1', answer: 'А', retryAnswer: 'А' },
    { id: 'attribute-check-2', answer: 'А', retryAnswer: 'А' }
  ]);
});

test('GL1 section 1.1 stage 2 explains attribute agreement as a word-class and register decision', () => {
  const stage = loadStageTwo();
  const teachingText = [stage.question, stage.entry.prompt, ...stage.teacherExplanation,
    ...stage.sourceExamples.map((example) => example.analysis),
    ...stage.contrasts.map((contrast) => contrast.analysis), ...stage.commonErrors,
    ...stage.checks.flatMap((check) => Object.values(check.feedback))].join('\n');
  assert.match(stage.question, /(什么样的|形容词).*(谁的|代词).*再看.*(正式表达|正式语体)/s);
  assert.match(stage.entry.prompt, /同一位女性.*变化的是.*修饰词/s);
  assert.match(stage.teacherExplanation.join('\n'), /定语.*什么样的.*代词.*谁的.*语体.*日常口语.*新闻.*公文.*考试/s);
  assert.match(stage.teacherExplanation.join('\n'), /同一位女性.*молодая директор.*молодой директор.*说话场合/s);
  assert.match(stage.teacherExplanation.join('\n'), /молодой директор Смелякова начала.*молодой.*начала/s);
  assert.match(stage.contrasts[0].analysis, /左边.*口语.*右边.*正式语体/s);
  assert.ok(stage.commonErrors.every((error) => error.includes('纠正：')));
  assert.match(stage.checks[0].feedback.correct, /先看.*形容词.*正式新闻.*阳性/s);
  assert.doesNotMatch(teachingText, /永远|全部判定|绝对错误|一律错误/);
});

test('GL1 section 1.1 stage 3 keeps its source evidence and exercise contract', () => {
  const stage = loadStageThree();
  assert.deepEqual(stage.exerciseIds, []);
  assert.equal(stage.sourceRule.ru, 'Если название должности или звания образовано сочетанием прилагательного и существительного, о женщинах употребляется только мужской род и в разговорной, и в официальной речи.');
  assert.equal(stage.sourceRule.zh, '若职务或军衔由形容词和名词组成，指女性时口语和正式语体都只用阳性。');
  assert.deepEqual(stage.sourceRule.source, { printedPages: [91], pdfPages: [93] });
  assert.equal(stage.sourceEvidence.ru, 'Если название должности или звания образовано сочетанием прилагательного и существительного (главный технолог, старший бухгалтер, младший лейтенант), то и в разговорной, и в официальной речи о женщинах правильно употреблять только форму мужского рода: научный сотрудник Зорина.');
  assert.equal(stage.sourceEvidence.zh, '如果职务或军衔由形容词和名词组成（总工艺师、高级会计、初级中尉），那么无论口语或正式语体，谈到女性都正确地只用阳性形式：科研人员佐琳娜。');
  assert.deepEqual(stage.sourceEvidence.source, { printedPages: [91], pdfPages: [93] });
  assert.deepEqual(stage.sourceExamples.map(({ ru, zh, source }) => ({ ru, zh, source })), [
    { ru: 'научный сотрудник Зорина.', zh: '科研人员佐琳娜。', source: { printedPages: [91], pdfPages: [93] } },
    { ru: 'главный технолог; старший бухгалтер; младший лейтенант.', zh: '总工艺师；高级会计；初级中尉。', source: { printedPages: [91], pdfPages: [93] } }
  ]);
  assert.deepEqual(stage.checks.map(({ id, answer, retry }) => ({ id, answer, retryAnswer: retry.answer })), [
    { id: 'compound-check-1', answer: 'А', retryAnswer: 'А' },
    { id: 'compound-check-2', answer: 'А', retryAnswer: 'А' }
  ]);
});

test('GL1 section 1.1 stage 3 explains compound titles as one fixed naming unit', () => {
  const stage = loadStageThree();
  const teachingText = [stage.question, stage.entry.prompt, ...stage.teacherExplanation,
    ...stage.sourceExamples.map((example) => example.analysis),
    ...stage.contrasts.map((contrast) => contrast.analysis), ...stage.commonErrors,
    ...stage.checks.flatMap((check) => Object.values(check.feedback))].join('\n');
  assert.match(stage.question, /两个词.*合在一起.*完整的岗位或军衔名称/s);
  assert.match(stage.entry.prompt, /научный сотрудник.*整体.*阳性/s);
  assert.match(stage.teacherExplanation.join('\n'), /两个词合起来.*完整岗位.*职称或军衔.*复合职称/s);
  assert.match(stage.teacherExplanation.join('\n'), /научный.*сотрудник.*главный.*технолог.*старший.*бухгалтер.*младший.*лейтенант/s);
  assert.match(stage.teacherExplanation.join('\n'), /普通修饰词.*молодая директор.*научный сотрудник.*岗位名称本身/s);
  assert.match(stage.contrasts[0].analysis, /左边.*固定职称.*右边.*普通(定语|修饰词)/s);
  assert.ok(stage.commonErrors.every((error) => error.includes('纠正：')));
  assert.match(stage.checks[0].feedback.correct, /先认出.*复合职称.*两个部分.*阳性/s);
  assert.doesNotMatch(teachingText, /永远|全部判定|绝对错误|一律错误/);
});

test('GL1 section 1.1 stage 4 keeps its source evidence and exercise contract', () => {
  const stage = loadStageFour();
  assert.deepEqual(stage.exerciseIds, ['GL1-Q008', 'GL1-Q009', 'GL1-Q010', 'GL1-Q011', 'GL1-Q012', 'GL1-Q013']);
  assert.equal(stage.sourceRule.ru, 'При существительном мужского рода, называющем лицо женского пола, глагол, краткое прилагательное и краткое причастие употребляются в женском роде.');
  assert.equal(stage.sourceRule.zh, '阳性名词指女性时，谓语、短形容词和短分词用阴性。');
  assert.deepEqual(stage.sourceRule.source, { printedPages: [91], pdfPages: [93] });
  assert.equal(stage.sourceEvidence.ru, 'При существительном мужского рода, называющем лицо женского пола, глагол употребляется в форме женского рода: Доцент Марусева начала занятие. Краткое прилагательное: Инженер Федотова больна. Краткое причастие: Депутат Игнатова оповещена о времени и месте встречи.');
  assert.equal(stage.sourceEvidence.zh, '阳性名词指女性时，动词用阴性：副教授马鲁谢娃开始上课。短形容词：工程师费多托娃生病。短分词：议员伊格纳托娃已被通知会议时间和地点。');
  assert.deepEqual(stage.sourceEvidence.source, { printedPages: [91], pdfPages: [93] });
  assert.deepEqual(stage.sourceExamples.map(({ ru, zh, source }) => ({ ru, zh, source })), [
    { ru: 'Доцент Марусева начала занятие; Инженер Федотова больна.', zh: '副教授马鲁谢娃开始上课；工程师费多托娃生病。', source: { printedPages: [91], pdfPages: [93] } },
    { ru: 'Депутат Игнатова оповещена о времени и месте встречи с избирателями.', zh: '议员伊格纳托娃已被通知与选民会面的时间和地点。', source: { printedPages: [91], pdfPages: [93] } }
  ]);
  assert.deepEqual(stage.checks.map(({ id, answer, retry }) => ({ id, answer, retryAnswer: retry.answer })), [
    { id: 'predicate-check-1', answer: 'Б', retryAnswer: 'Б' },
    { id: 'predicate-check-2', answer: 'А', retryAnswer: 'Б' }
  ]);
});

test('GL1 section 1.1 stage 4 separates predicates and short forms from profession-name attributes', () => {
  const stage = loadStageFour();
  const teachingText = [stage.question, stage.entry.prompt, ...stage.teacherExplanation,
    ...stage.sourceExamples.map((example) => example.analysis),
    ...stage.contrasts.map((contrast) => contrast.analysis), ...stage.commonErrors,
    ...stage.checks.flatMap((check) => Object.values(check.feedback))].join('\n');
  assert.match(stage.question, /做了什么.*怎么样.*被怎样处理/s);
  assert.match(stage.entry.prompt, /职业名称.*阳性.*动作、状态或结果.*阴性/s);
  assert.match(stage.teacherExplanation.join('\n'), /过去时谓语.*她做了什么.*短形容词.*她.*怎么样.*短被动分词.*她被/s);
  assert.match(stage.teacherExplanation.join('\n'), /молодой директор Смелякова начала.*директор.*молодой.*начала/s);
  assert.match(stage.contrasts[0].analysis, /左边.*定语.*右边.*谓语/s);
  assert.ok(stage.commonErrors.every((error) => error.includes('纠正：')));
  assert.match(stage.checks[0].feedback.correct, /先认出.*过去时谓语.*女性.*阴性/s);
  assert.match(stage.checks[1].feedback.correct, /先认出.*短形容词.*女性.*阴性/s);
  assert.match(stage.checks[0].feedback.misconception, /воспитал/);
  assert.doesNotMatch(stage.checks[0].feedback.misconception, /воспитали/);
  assert.doesNotMatch(teachingText, /永远|全部判定|绝对错误|一律错误/);
});

test('GL3 section 3.1.2 starts with the two-actor check before formal terminology', () => {
  const card = loadForbiddenGerundCard();
  assert.match(card.titleZh, /先看两件事是谁做的/);
  assert.match(card.problem, /谁做前面的动作.*谁做主句里的动作/s);
  assert.doesNotMatch(card.problem, /\bP\b|\bAdp\b|逻辑主体|行动责任/);
  assert.match(card.scopeNote, /副动词.*деепричастие.*动名副词/s);
  assert.equal(card.entryGate.title, '先填两行：两件事是不是同一个人或东西做的');
  assert.deepEqual(card.summaryTableHeaders, {
    question: '先检查什么',
    imperfective: '具体怎么问',
    perfective: '什么时候不能压缩',
    boundary: '最容易错在哪里'
  });
  assert.equal(card.teachingNarrativeVersion, 1);
  const opening = card.teachingNarrative.sections[0];
  assert.equal(opening.id, 'lesson-start');
  assert.match(card.teachingNarrative.quickAnswer, /同一个人或东西做的.*才可能/s);
  assert.deepEqual(opening.blocks.find(block => block.type === 'worksheet').prompts, [
    '谁做前面的动作？',
    '谁做主句里的动作？'
  ]);
});

test('GL1 section 1.4.5 keeps its accepted narrative and exercise contracts as the production version', () => {
  const card = loadCannotCard();
  assert.equal(card.teachingNarrativeVersion, 1);
  assert.deepEqual(card.stages.map(stage => stage.id), ['stage-prohibition', 'stage-impossibility']);
  assert.deepEqual(card.stages.flatMap(stage => stage.checks.map(check => check.id)), [
    'prohibition-check-1',
    'prohibition-check-2',
    'impossibility-check-1',
    'impossibility-check-2'
  ]);
  assert.deepEqual(card.stages.flatMap(stage => stage.exerciseIds), [
    'GL1-Q072',
    'GL1-Q096',
    'GL1-Q073',
    'GL1-Q097'
  ]);
  assert.deepEqual(card.mindMap.map(node => node.id), ['stage-prohibition', 'stage-impossibility']);
  assert.equal(card.reviewStatus, 'needs-review');
});

test('GL1 section 1.4.5 production narrative teaches the source of restriction before aspect labels', () => {
  const card = loadCannotCard();
  const preview = card.teachingNarrative;
  assert.equal(card.teachingNarrativeVersion, 1);
  assert.match(preview.quickAnswer, /谁或什么在阻止.*规则.*未完成体.*故障.*完成体/s);
  assert.deepEqual(preview.mindMapTargets, {
    'stage-prohibition': 'lesson-cannot-prohibition',
    'stage-impossibility': 'lesson-cannot-impossibility'
  });
  assert.deepEqual(preview.sections.map(section => section.id), [
    'lesson-cannot-start',
    'lesson-cannot-meaning',
    'lesson-cannot-prohibition',
    'lesson-cannot-impossibility',
    'lesson-cannot-procedure'
  ]);
  const openingText = JSON.stringify(preview.sections[0]);
  assert.match(openingText, /宿舍规定.*未完成体/s);
  assert.match(openingText, /灯泡烧了.*完成体/s);
  assert.match(openingText, /原书例句：有人在立规矩/);
  assert.match(openingText, /原书例句：现实条件让结果做不到/);
});

test('GL1 section 1.4.5 production narrative interleaves the original contrasts, checks, and misconceptions', () => {
  const card = loadCannotCard();
  const preview = card.teachingNarrative;
  const expected = [
    ['lesson-cannot-prohibition', 'stage-prohibition', 'prohibition-check-1'],
    ['lesson-cannot-impossibility', 'stage-impossibility', 'impossibility-check-1']
  ];
  for (const [sectionId, stageId, checkId] of expected) {
    const blocks = preview.sections.find(section => section.id === sectionId).blocks;
    const contrastIndex = blocks.findIndex(block => block.type === 'stageContrast' && block.stageId === stageId);
    const checkIndex = blocks.findIndex(block => block.type === 'stageCheck' && block.checkId === checkId);
    const errorsIndex = blocks.findIndex(block => block.type === 'stageErrors' && block.stageId === stageId);
    assert.ok(contrastIndex > 0 && contrastIndex < checkIndex && checkIndex < errorsIndex);
  }
  const procedure = JSON.stringify(preview.sections.find(section => section.id === 'lesson-cannot-procedure'));
  assert.match(procedure, /找来源、说含义、再选体/);
  assert.match(procedure, /信号词不是答案/);
  assert.match(procedure, /"sourceType":"learning-note"/);
});

test('GL1 section 1.4.6 keeps its accepted five-stage card and formal-practice contract', () => {
  const card = loadNegativeInfinitiveCard();
  assert.equal(card.teachingNarrativeVersion, 1);
  assert.deepEqual(card.stages.map(stage => stage.id), [
    'stage-dependent',
    'stage-independent-impossibility',
    'stage-independent-suggestion',
    'stage-moch',
    'stage-advice'
  ]);
  assert.equal(card.stages.flatMap(stage => stage.checks).length, 10);
  assert.equal(new Set(card.stages.flatMap(stage => stage.exerciseIds)).size, 18);
  assert.equal(card.reviewStatus, 'needs-review');
  assert.ok(card.riskRecord.some(item => /GL1-Q078.*待复核/.test(item)));
  assert.ok(card.riskRecord.some(item => /GL1-Q076.*source-exercise-only/.test(item)));
});

test('GL1 section 1.4.6 production narrative starts with sentence structure instead of a negation shortcut', () => {
  const card = loadNegativeInfinitiveCard();
  const preview = card.teachingNarrative;
  assert.equal(card.teachingNarrativeVersion, 1);
  assert.match(preview.quickAnswer, /先找.*句子骨架.*意思确定后.*选体/s);
  assert.doesNotMatch(preview.quickAnswer, /看到 не 一律/);
  assert.deepEqual(preview.sections.map(section => section.id), [
    'lesson-negative-start',
    'lesson-negative-frame',
    'lesson-negative-dependent',
    'lesson-negative-impossibility',
    'lesson-negative-suggestion',
    'lesson-negative-moch',
    'lesson-negative-advice',
    'lesson-negative-procedure'
  ]);
  const opening = JSON.stringify(preview.sections[0]);
  assert.match(opening, /решили.*не брать.*从属否定.*未完成体/s);
  assert.match(opening, /Мне не поднять.*箱子太重.*完成体/s);
  assert.match(opening, /原书例句：有人作出“不做”的决定/);
  assert.match(opening, /原书例句：没有人决定，是真的做不到/);
});

test('GL1 section 1.4.6 production narrative links all five mind-map branches into plain-language lessons', () => {
  const card = loadNegativeInfinitiveCard();
  const preview = card.teachingNarrative;
  assert.deepEqual(preview.mindMapTargets, {
    'stage-dependent': 'lesson-negative-dependent',
    'stage-independent-impossibility': 'lesson-negative-impossibility',
    'stage-independent-suggestion': 'lesson-negative-suggestion',
    'stage-moch': 'lesson-negative-moch',
    'stage-advice': 'lesson-negative-advice'
  });
  const narrativeTargets = new Set(preview.sections.map(section => section.id));
  assert.ok(Object.values(preview.mindMapTargets).every(target => narrativeTargets.has(target)));
  const frame = JSON.stringify(preview.sections.find(section => section.id === 'lesson-negative-frame'));
  assert.match(frame, /“有限动词”只是那个已经变过形、可以自己作谓语的词/);
  assert.match(frame, /没有支配词，不等于直接选完成体/);
});

test('GL1 section 1.4.6 production narrative interleaves one original check per branch and leaves five for review', () => {
  const card = loadNegativeInfinitiveCard();
  const preview = card.teachingNarrative;
  const expected = [
    ['lesson-negative-dependent', 'stage-dependent', 'dependent-check-1'],
    ['lesson-negative-impossibility', 'stage-independent-impossibility', 'impossibility-check-1'],
    ['lesson-negative-suggestion', 'stage-independent-suggestion', 'suggestion-check-1'],
    ['lesson-negative-moch', 'stage-moch', 'moch-check-1'],
    ['lesson-negative-advice', 'stage-advice', 'advice-check-1']
  ];
  const inlineIds = [];
  for (const [sectionId, stageId, checkId] of expected) {
    const blocks = preview.sections.find(section => section.id === sectionId).blocks;
    const contrastIndex = blocks.findIndex(block => block.type === 'stageContrast' && block.stageId === stageId);
    const checkIndex = blocks.findIndex(block => block.type === 'stageCheck' && block.checkId === checkId);
    const errorsIndex = blocks.findIndex(block => block.type === 'stageErrors' && block.stageId === stageId);
    assert.ok(contrastIndex > 0 && contrastIndex < checkIndex && checkIndex < errorsIndex);
    inlineIds.push(checkId);
  }
  const allIds = card.stages.flatMap(stage => stage.checks.map(check => check.id));
  assert.equal(allIds.filter(id => !inlineIds.includes(id)).length, 5);
});

test('GL1 section 1.4.6 production narrative keeps permission, failure risk, and source boundaries separate', () => {
  const card = loadNegativeInfinitiveCard();
  const preview = card.teachingNarrative;
  const moch = JSON.stringify(preview.sections.find(section => section.id === 'lesson-negative-moch'));
  const procedure = JSON.stringify(preview.sections.find(section => section.id === 'lesson-negative-procedure'));
  assert.match(moch, /можешь не убирать.*许可或无需.*未完成体/s);
  assert.match(moch, /может завтра не прийти/);
  assert.match(moch, /担心结果无法实现/);
  assert.match(moch, /完成体 прийти/);
  assert.match(moch, /“不用做也可以”.*未完成体.*“想完成但可能完不成”.*完成体/s);
  assert.match(procedure, /GL1-Q076.*不属于原书本节已明示的五条规则/s);
  assert.match(procedure, /GL1-Q078.*保留待复核/s);
  assert.match(procedure, /"sourceType":"learning-note"/);
});

test('GL3 section 3.1.2 shows a valid compression before the invalid two-actor example', () => {
  const card = loadForbiddenGerundCard();
  const stage = card.stages.find(item => item.id === 'stage-two-subjects');
  const teaching = stage.teacherExplanation.join('\n');
  assert.match(stage.entry.ru, /Пообещав помочь нам, брат/);
  assert.match(teaching, /Если брат пообещал.*Пообещав помочь нам, брат/s);
  assert.match(teaching, /человечество.*источник.*两个答案不同/s);
  assert.match(teaching, /因果关系.*不能.*同一个做事者/s);
  assert.match(stage.question, /谁做前面的动作.*谁做主句里的动作/s);
  assert.doesNotMatch(stage.question, /附加动作|逻辑主体|\bAdp\b/);
  const blocks = card.teachingNarrative.sections.find(section => section.id === 'lesson-compression').blocks;
  const narrativeText = JSON.stringify(blocks);
  assert.ok(narrativeText.indexOf('Если брат пообещал помочь нам') < narrativeText.indexOf('Пообещав помочь нам, брат'));
  assert.ok(narrativeText.indexOf('Пообещав помочь нам, брат') < narrativeText.indexOf('Если человечество овладеет'));
  assert.ok(narrativeText.indexOf('Если человечество овладеет') < narrativeText.indexOf('Обладев солнечной энергией'));
  assert.match(narrativeText, /这里还没有副动词/);
});

test('GL3 section 3.1.2 explains state and passive failures through concrete actors', () => {
  const card = loadForbiddenGerundCard();
  const impersonal = card.stages.find(item => item.id === 'stage-impersonal');
  const passive = card.stages.find(item => item.id === 'stage-passive');
  assert.match(impersonal.entry.ru, /Когда я сидел на палубе, смеркалось/);
  assert.match(impersonal.teacherExplanation.join('\n'), /谁坐在甲板上.*谁让天色变黑.*没有答案/s);
  assert.match(impersonal.teacherExplanation.join('\n'), /Идя на экзамен.*同一个人/s);
  assert.match(passive.teacherExplanation.join('\n'), /Библиотекарь выдал книги.*Книги выданы библиотекарем/s);
  assert.match(passive.teacherExplanation.join('\n'), /任务合力.*挂错/s);
  const stateText = JSON.stringify(card.teachingNarrative.sections.find(section => section.id === 'lesson-state'));
  const passiveText = JSON.stringify(card.teachingNarrative.sections.find(section => section.id === 'lesson-passive'));
  assert.ok(stateText.indexOf('Когда я сидел на палубе, смеркалось') < stateText.indexOf('Смеркалось, сидя на палубе'));
  assert.match(stateText, /谁让天色变黑.*没有答案/s);
  assert.match(stateText, /Идя на экзамен.*参加考试的人/s);
  assert.ok(passiveText.indexOf('Библиотекарь выдал книги') < passiveText.indexOf('Книги выданы библиотекарем'));
  assert.ok(passiveText.indexOf('Закончив обсуждение, комиссия приняла решение') < passiveText.indexOf('Закончив обсуждение, решение было принято комиссией'));
});

test('GL3 section 3.1.2 interleaves each explanation with its original contrast and check', () => {
  const card = loadForbiddenGerundCard();
  const expected = [
    ['lesson-compression', 'stage-two-subjects', 'forbidden-two-subjects-1'],
    ['lesson-state', 'stage-impersonal', 'forbidden-impersonal-1'],
    ['lesson-passive', 'stage-passive', 'forbidden-passive-1'],
    ['lesson-procedure', 'stage-rewrite', 'forbidden-rewrite-1']
  ];
  const inlineIds = [];
  for (const [sectionId, stageId, checkId] of expected) {
    const blocks = card.teachingNarrative.sections.find(section => section.id === sectionId).blocks;
    const contrastIndex = blocks.findIndex(block => block.type === 'stageContrast' && block.stageId === stageId);
    const checkIndex = blocks.findIndex(block => block.type === 'stageCheck' && block.checkId === checkId);
    const errorsIndex = blocks.findIndex(block => block.type === 'stageErrors' && block.stageId === stageId);
    assert.ok(contrastIndex > 0, `${sectionId} needs teaching before its contrast`);
    assert.ok(contrastIndex < checkIndex && checkIndex < errorsIndex, `${sectionId} must flow contrast -> check -> misconception`);
    inlineIds.push(checkId);
  }
  assert.deepEqual(inlineIds.sort(), card.stages.filter(stage => stage.id !== 'stage-review').flatMap(stage => stage.checks.map(check => check.id)).sort());
});

test('GL3 section 3.1.2 preserves its retrieval mind map and links every branch into the narrative', () => {
  const card = loadForbiddenGerundCard();
  assert.equal(card.mindMapMode, 'retrieval');
  assert.equal(card.teachingNarrative.mindMapPlacement, 'after-first-section');
  assert.deepEqual(card.mindMap.map(node => [node.id, node.narrativeTargetId]), [
    ['stage-two-subjects', 'lesson-compression'],
    ['stage-impersonal', 'lesson-state'],
    ['stage-passive', 'lesson-passive'],
    ['stage-rewrite', 'lesson-procedure'],
    ['stage-review', 'zlatoust-evidence']
  ]);
  const narrativeTargets = new Set(card.teachingNarrative.sections.map(section => section.id));
  narrativeTargets.add('zlatoust-evidence');
  assert.ok(card.mindMap.every(node => narrativeTargets.has(node.narrativeTargetId)));
});

test('GL3 section 3.1.2 preserves its source and formal-practice risk boundary', () => {
  const card = loadForbiddenGerundCard();
  assert.equal(card.reviewStatus, 'needs-review');
  assert.ok(card.stages.every(stage => stage.exerciseIds.length === 0));
  assert.match(card.stages.find(stage => stage.id === 'stage-passive').sourceRule.ru, /не употребляется в пассивных конструкциях/);
  assert.match(card.stages.find(stage => stage.id === 'stage-review').sourceEvidence.ru, /строится двадцать два новых города, обеспечивая/);
  assert.ok(card.riskRecord.some(item => /GL3-Q039.*不进入正式练习/.test(item)));
  assert.deepEqual(card.transferTasks.map(task => task.id), [
    'forbidden-transfer-context',
    'forbidden-transfer-rewrite',
    'forbidden-transfer-explain',
    'forbidden-transfer-boundary'
  ]);
});
