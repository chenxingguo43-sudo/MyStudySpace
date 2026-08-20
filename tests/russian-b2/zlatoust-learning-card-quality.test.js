const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const cardPath = 'data/textbook/zlatoust_grammar/theory/learning-pages/gl1/section-1.1.json';
const aspectCardPath = 'data/textbook/zlatoust_grammar/theory/learning-pages/gl1/section-1.4.1.json';

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

test('GL1 section 1.1 keeps its original tree map with four clickable teaching branches', () => {
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
