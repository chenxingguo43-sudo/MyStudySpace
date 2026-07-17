const fs = require('node:fs');
const path = require('node:path');
const { publishP6ContextUnit } = require('./build-p6-context');

const DATA_DIRECTORY = ['俄语资料库', '俄语B2·原书复刻与学习版', '规范数据', '语法词汇'];
const readJson = filePath => JSON.parse(fs.readFileSync(filePath, 'utf8'));
const writeJson = (filePath, value) => fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + '\n', 'utf8');

function publishP6Context({ root }) {
  const dataDirectory = path.join(root, ...DATA_DIRECTORY);
  const contextSource = 'p6-context-q009-q050.json';
  publishP6ContextUnit({ outputPath: path.join(dataDirectory, contextSource) });
  const contextUnit = readJson(path.join(dataDirectory, contextSource));

  const ledgerPath = path.join(dataDirectory, 'part-06-source-ledger.json');
  const oldLedger = readJson(ledgerPath);
  const contextEntries = contextUnit.exercises.map(exercise => {
    const match = /^原书解析：(.*?)；译文：(.*)$/.exec(exercise.sourceExplanation);
    return {
      exerciseId: exercise.id,
      printedNumber: exercise.printedNumber,
      questionPages: exercise.questionPages,
      rulePages: exercise.answerPages,
      answerPages: exercise.answerPages,
      answer: exercise.answer,
      sourceExplanation: match[1],
      translation: match[2],
      status: 'verified'
    };
  });
  oldLedger.entries = [...oldLedger.entries.filter(entry => !contextEntries.some(item => item.exerciseId === entry.exerciseId)), ...contextEntries]
    .sort((left, right) => left.printedNumber - right.printedNumber);
  oldLedger.expectedRange = [1, 50];
  oldLedger.unresolved = [];
  writeJson(ledgerPath, oldLedger);

  const manifestPath = path.join(dataDirectory, 'index.json');
  const manifest = readJson(manifestPath);
  manifest.units = manifest.units.filter(unit => unit.id !== 'p6-context-q009-q050');
  const firstP6Index = manifest.units.findIndex(unit => unit.id === 'p6-q001-q028');
  manifest.units.splice(firstP6Index + 1, 0, {
    id: 'p6-context-q009-q050', chapterIndex: 30, source: contextSource, published: true
  });
  writeJson(manifestPath, manifest);

  const navigationPath = path.join(dataDirectory, 'part-study-navigation.json');
  const navigation = readJson(navigationPath);
  const p6 = navigation.parts.find(part => part.id === 'p6');
  p6.unitIds = ['p6-q001-q028', 'p6-context-q009-q050', 'p6-q029-q036'];
  p6.knowledgePoints = [
    { id: 'p6-predicate-case', title: '判断结构与工具格', questionRanges: [[1, 8]], rule: '按 являться、считаться、называться 等判断结构选择工具格或谓语形式。', pitfalls: '短尾比较级和工具格名词在句中承担的功能不同。', sourcePages: [66, 71] },
    { id: 'p6-context-texts', title: '材料语境中的谓语、形动词与支配', questionRanges: [[9, 26]], rule: '保留人物词典、脑部循环和儿童实验材料的语境，再判断谓语、形动词、副动词和固定支配。', pitfalls: '不能脱离材料中的指代、语体和句子主干孤立选择词形。', sourcePages: [67, 68, 71] },
    { id: 'p6-journalistic-collocations', title: '报刊语体的固定搭配', questionRanges: [[27, 36]], rule: '报刊文体偏好使用正式的动宾结构和固定表达。', pitfalls: '日常口语中的简单动词在报刊语体中常不是标准搭配。', sourcePages: [68, 69, 72] },
    { id: 'p6-official-documents', title: '申请书与解释信的公文格式', questionRanges: [[37, 50]], rule: '按收件人、署名、日期、书面请求和原因说明的规范格式完成公文。', pitfalls: '公文格式中的格、日期、称呼和书面连接词都不能按口语随意替换。', sourcePages: [69, 70, 74, 75] }
  ];
  writeJson(navigationPath, navigation);
  return { dataDirectory, contextSource };
}

if (require.main === module) publishP6Context({ root: path.resolve(__dirname, '..', '..') });

module.exports = { publishP6Context };
