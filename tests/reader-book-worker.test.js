'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { normalizeArtifactFile } = require('../scripts/reader-book-worker');

test('worker merges a version-2 teaching narrative into the protected legacy card', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'reader-v2-card-worker-'));
  const input = path.join(root, 'input.json');
  const artifact = path.join(root, 'artifact.json');
  fs.writeFileSync(input, JSON.stringify({
    taskType: 'knowledge-card',
    outputContract: { teachingNarrativeVersion: 2 },
    source: { knowledgePoint: { id: 'p1-card', title: '测试知识点', rule: '原规则', exerciseIds: ['Q1'] }, exercises: [] },
    legacyCard: {
      id: 'p1-card', partId: 'p1', knowledgePointId: 'p1-card', exerciseIds: ['Q1'], reviewStatus: 'approved',
      overview: '原讲解', decisionSteps: ['原步骤'], quickReference: {}, lessons: [{ id: 'old-lesson', title: '旧分支' }],
      rules: [{ structure: '原结构', meaning: '原规则', source: { kind: 'b2-original' } }], examples: [], comparisons: [], pitfalls: ['原陷阱'], checks: [], sources: [{ kind: 'b2-original' }]
    }
  }));
  fs.writeFileSync(artifact, JSON.stringify({ studyCard: { teachingNarrative: { version: 2, label: '新版教学层' } } }));
  const value = normalizeArtifactFile(input, artifact);
  assert.equal(value.studyCard.overview, '原讲解');
  assert.equal(value.studyCard.lessons[0].id, 'old-lesson');
  assert.deepEqual(value.studyCard.teachingNarrative, { version: 2, label: '新版教学层' });
});

test('worker normalizes equivalent agent option statuses without changing keys or answer', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'reader-worker-'));
  const input = path.join(root, 'input.json');
  const artifact = path.join(root, 'artifact.json');
  fs.writeFileSync(input, JSON.stringify({
    question: {
      canonicalAnswer: 'Б',
      existingAnalysis: {
        completeSentence: { ru: '权威俄语。', zh: '权威中文。' },
        _source: { answer: { printedPage: 10 } }
      }
    }
  }));
  fs.writeFileSync(artifact, JSON.stringify({
    answerAnalysis: {
      presentation: { defaultLayer: { completeSentence: { ru: 'Тест.' } } },
      completeSentence: { ru: '模型俄语。', zh: '模型中文。' },
      _source: { answer: { printedPage: 999 } },
      options: [
        { key: 'А', status: 'distractor', analysis: '错项' },
        { key: 'Б', status: 'canonical-correct', analysis: '正解' }
      ]
    }
  }));
  const value = normalizeArtifactFile(input, artifact);
  assert.deepEqual(value.answerAnalysis.options.map((item) => item.status), ['wrong', 'correct']);
  assert.equal(value.answerAnalysis.correctOption.key, 'Б');
  assert.deepEqual(value.answerAnalysis.distractors.map((item) => item.key), ['А']);
  assert.deepEqual(value.answerAnalysis.completeSentence, { ru: '权威俄语。', zh: '权威中文。' });
  assert.deepEqual(value.answerAnalysis._source, { answer: { printedPage: 10 } });
});

test('worker expands a compact teaching patch with protected source fields', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'reader-compact-worker-'));
  const input = path.join(root, 'input.json');
  const artifact = path.join(root, 'artifact.json');
  fs.writeFileSync(input, JSON.stringify({
    taskId: 'ch0000:GL1-Q014',
    source: { original: ['Большинство ...'] },
    question: {
      id: 'GL1-Q014',
      canonicalAnswer: 'А',
      options: [{ key: 'А', text: 'ответит' }, { key: 'Б', text: 'ответят' }],
      existingAnalysis: {
        completeSentence: { ru: '权威俄语。', zh: '权威中文。' },
        _source: { answer: { printedPage: 123 } }
      }
    }
  }));
  fs.writeFileSync(artifact, JSON.stringify({
    schema: 'reader-book-pipeline-artifact-v1',
    taskId: 'ch0000:GL1-Q014',
    inputHash: 'hash',
    answerAnalysisPatch: {
      conclusion: '结论',
      decisionSteps: ['先看主语。', '再选单数。'],
      sentenceSkeleton: { ru: 'Большинство ответит.', zh: '多数人会回答。' },
      correctOptionAnalysis: '正确原因',
      distractors: [{ key: 'Б', reason: '错误原因' }],
      mapping: { source: 'большинство', option: 'ответит', reason: '集合名词用单数' },
      pitfall: '易错点',
      memoryRule: '规则',
      nextCheck: '检查方法',
      evidenceRole: '题干中的集合名词'
    }
  }));
  const value = normalizeArtifactFile(input, artifact);
  assert.equal(value.answerAnalysisPatch, undefined);
  assert.deepEqual(value.answerAnalysis.completeSentence, { ru: '权威俄语。', zh: '权威中文。' });
  assert.deepEqual(value.answerAnalysis.options.map((item) => item.status), ['correct', 'wrong']);
  assert.equal(value.answerAnalysis.correctOption.key, 'А');
  assert.equal(value.answerAnalysis.mappings[0].option, 'ответит');
  assert.equal(value.answerAnalysis.evidence.ru, 'Большинство ...');
  assert.equal(value.answerAnalysis._source.answer.printedPage, 123);
  assert.equal(value.answerAnalysis.presentation.mode, 'two-layer');
});

test('worker keeps an explicitly repaired complete-sentence translation', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'reader-translation-repair-worker-'));
  const input = path.join(root, 'input.json');
  const artifact = path.join(root, 'artifact.json');
  fs.writeFileSync(input, JSON.stringify({
    taskId: 'ch0001:GL2-Q100',
    source: { original: ['Тридцать пять километров отделяют Танаис от Ростова-на-Дону.'] },
    question: {
      id: 'GL2-Q100', canonicalAnswer: 'А', options: [{ key: 'А', text: 'от Ростова-на-Дону' }, { key: 'Б', text: 'из Ростова-на-Дону' }],
      existingAnalysis: { completeSentence: { ru: 'Тридцать пять километров отделяют Танаис от Ростова-на-Дону.', zh: '旧的错误译文。' }, _source: {} }
    }
  }));
  fs.writeFileSync(artifact, JSON.stringify({
    answerAnalysisPatch: {
      completeSentence: { ru: 'Тридцать пять километров отделяют Танаис от Ростова-на-Дону.', zh: '三十五公里把塔奈斯与顿河畔罗斯托夫隔开。' },
      conclusion: '选 А。', decisionSteps: ['先看 отделять 的固定结构。'], sentenceSkeleton: { ru: 'Танаис отделяют от Ростова-на-Дону.', zh: '塔奈斯与罗斯托夫隔开。' },
      correctOptionAnalysis: 'от 接属格。', distractors: [{ key: 'Б', reason: 'из 表示来源，不表示隔开关系。' }],
      mapping: { source: 'отделять', option: 'от Ростова-на-Дону', reason: '固定结构。' }, pitfall: '不要按中文“从”选择。', memoryRule: 'отделять что от чего。', nextCheck: '检查 от + 属格。'
    }
  }));
  const value = normalizeArtifactFile(input, artifact);
  assert.deepEqual(value.answerAnalysis.completeSentence, { ru: 'Тридцать пять километров отделяют Танаис от Ростова-на-Дону.', zh: '三十五公里把塔奈斯与顿河畔罗斯托夫隔开。' });
});

test('worker normalizes legacy compact field shapes to Reader strings', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'reader-compact-legacy-worker-'));
  const input = path.join(root, 'input.json');
  const artifact = path.join(root, 'artifact.json');
  fs.writeFileSync(input, JSON.stringify({
    taskId: 'ch0000:GL1-Q014',
    source: { original: ['Большинство ...'] },
    question: {
      id: 'GL1-Q014',
      canonicalAnswer: 'А',
      options: [{ key: 'А' }, { key: 'Б' }],
      existingAnalysis: { completeSentence: { ru: '句子。', zh: '句子。' }, _source: {} }
    }
  }));
  fs.writeFileSync(artifact, JSON.stringify({
    answerAnalysisPatch: {
      conclusion: '结论',
      'causal decisionSteps': ['第一步。'],
      sentenceSkeleton: { ru: 'Большинство ответит.', zh: '多数人会回答。' },
      correctOptionAnalysis: { key: 'А', analysis: '正确原因' },
      distractors: [{ key: 'Б', reason: '错误原因' }],
      mapping: { source: 'большинство', option: 'ответит', reason: '规则' },
      pitfall: '易错点', memoryRule: '规则', nextCheck: '检查', evidenceRole: '证据'
    }
  }));
  const value = normalizeArtifactFile(input, artifact);
  assert.equal(value.answerAnalysis.correctOption.analysis, '正确原因');
  assert.equal(value.answerAnalysis.options[0].reason, '正确原因');
  assert.deepEqual(value.answerAnalysis.decisionSteps, [{ step: 1, text: '第一步。' }]);
});

test('worker accepts full-shape correctOption inside a grammar patch', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'reader-full-shape-patch-'));
  const input = path.join(root, 'input.json');
  const artifact = path.join(root, 'artifact.json');
  fs.writeFileSync(input, JSON.stringify({
    taskId: 'ch0000:GL1-Q028',
    source: { original: ['Русский язык так ..., что ...'] },
    question: {
      id: 'GL1-Q028', canonicalAnswer: 'Б',
      options: [{ key: 'А', text: 'богатый' }, { key: 'Б', text: 'богат' }],
      existingAnalysis: { completeSentence: { ru: 'Русский язык так богат, что ...', zh: '俄语如此丰富，以至于……' }, _source: {} }
    }
  }));
  fs.writeFileSync(artifact, JSON.stringify({
    answerAnalysisPatch: {
      conclusion: 'так 后面的谓语形容词必须使用短尾，因此这里选择 богат，而不是长尾 богатый。',
      decisionSteps: ['先找 так。'],
      sentenceSkeleton: { ru: 'Язык так богат, что ...', zh: '语言如此丰富，以至于……' },
      correctOption: { key: 'Б', analysis: 'богат 是阳性单数短尾，在 так ... что 结构里作谓语，符合原书要求的强制短尾形式。' },
      distractors: [{ key: 'А', reason: 'богатый 是长尾形式，不能放在 так 后充当这个程度结果结构的谓语。' }],
      pitfall: '不要把 такой 和 так 混为一谈。', memoryRule: 'так 后选短尾。', nextCheck: '先圈信号词。'
    }
  }));
  const value = normalizeArtifactFile(input, artifact);
  assert.match(value.answerAnalysis.correctOption.analysis, /^богат 是阳性单数短尾/);
  assert.equal(value.answerAnalysis.options[1].reason, value.answerAnalysis.correctOption.analysis);
});

test('worker uses a substantive conclusion for the redundant correct-option field when omitted', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'reader-conclusion-fallback-'));
  const input = path.join(root, 'input.json');
  const artifact = path.join(root, 'artifact.json');
  fs.writeFileSync(input, JSON.stringify({
    taskId: 'ch0000:GL1-Q028', source: { original: ['Русский язык так ..., что ...'] },
    question: {
      id: 'GL1-Q028', canonicalAnswer: 'Б', options: [{ key: 'А' }, { key: 'Б' }],
      existingAnalysis: { completeSentence: { ru: '句子。', zh: '句子。' }, _source: {} }
    }
  }));
  const conclusion = '先识别 так ... что 程度结果结构；так 后面的谓语形容词强制使用短尾，所以应选阳性单数短尾 богат。';
  fs.writeFileSync(artifact, JSON.stringify({ answerAnalysisPatch: {
    conclusion, decisionSteps: ['先找 так。'], sentenceSkeleton: { ru: 'Язык так богат.', zh: '语言如此丰富。' },
    distractors: [{ key: 'А', reason: '长尾不符合结构。' }], pitfall: '易错。', memoryRule: '规则。', nextCheck: '检查。'
  } }));
  const value = normalizeArtifactFile(input, artifact);
  assert.equal(value.answerAnalysis.correctOption.analysis, conclusion);
  assert.equal(value.answerAnalysis.options[1].reason, conclusion);
});
