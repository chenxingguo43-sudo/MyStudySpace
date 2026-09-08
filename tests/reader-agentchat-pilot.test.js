'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildPrompt,
  parseJsonResponse,
  parseReceipt,
  validateAnalysis,
  validateResponse
} = require('../scripts/reader-agentchat-pilot');

function sampleInput() {
  return {
    question: {
      id: 'GL1-Q085',
      question: 'Смотри, не ... в горах.',
      options: [{ key: 'А', text: 'простуживайся' }, { key: 'Б', text: 'простудись' }],
      canonicalAnswer: 'Б',
      existingAnalysis: {
        conclusion: '旧解析',
        _source: {
          question: { printedPage: 14, pdfPage: 16 },
          answer: { printedPage: 123, pdfPage: 125 },
          rulePages: { printed: [98], pdf: [100] },
          rules: [{ sectionId: '1.4.8', ruleId: 'gl1-1.4.8-warning' }]
        }
      }
    },
    source: { chapterFile: 'data/private-source.json', knowledgePoint: { title: '否定命令式', rule: '警告用完成体' } }
  };
}

test('buildPrompt keeps local paths out and marks source as data', () => {
  const prompt = buildPrompt(sampleInput());
  assert.match(prompt, /<reader_input>/);
  assert.match(prompt, /GL1-Q085/);
  assert.doesNotMatch(prompt, /data\/private-source\.json/);
});

test('parseReceipt reads the AgentChat receipt JSON', () => {
  const receipt = parseReceipt('[receipt] AGENTCHAT_RUN {"run_id":"ac-test","provider_used":"Gemini","exit":0}');
  assert.equal(receipt.run_id, 'ac-test');
  assert.equal(receipt.provider_used, 'Gemini');
});

test('validateResponse rejects a response without a receipt', () => {
  const response = 'GL1-Q085 【完整句子】答案：Б【一句话结论】 【为什么选这个】 【逐步判断】 【选项对比】 【记忆方法】 【容易误判】 простудись';
  const result = validateResponse(sampleInput(), response, null);
  assert.equal(result.ok, false);
  assert.ok(result.failures.includes('receiptPresent'));
});

test('validateResponse accepts a spaced natural-language answer label', () => {
  const response = '【完整句子】Смотри, не простудись. 【一句话结论】正确答案选 Б（простудись）。【为什么选这个】警告坏结果。【逐步判断】1. 看 Смотри。2. 选完成体。【选项对比】А 不突出结果，Б 突出结果。【记忆方法】警告用完成体。【容易误判】не 不总是禁止。';
  const result = validateResponse(sampleInput(), response, { run_id: 'ac-test' });
  assert.equal(result.ok, true);
});

test('parseJsonResponse ignores harmless prose after a complete JSON object', () => {
  const result = parseJsonResponse('{"taskId":"ch0000:GL1-Q090","answerAnalysis":{}}\n要不要再练一道？');
  assert.equal(result.taskId, 'ch0000:GL1-Q090');
});

test('validateAnalysis rejects counterfactual teaching in a warning-only question', () => {
  const input = sampleInput();
  const source = input.question.existingAnalysis._source;
  const analysis = {
    completeSentence: { ru: 'Смотри, не простудись в горах.', zh: '小心，别在山里着凉。' },
    conclusion: '选 Б。这是眼前风险的警告。',
    decisionSteps: [{ step: 1, text: '先看警告语境。' }, { step: 2, text: '再看具体风险。' }],
    sentenceSkeleton: { ru: 'Смотри, не простудись.', zh: '当心，别着凉。' },
    correctOption: { key: 'Б', analysis: '完成体用于提醒避免具体坏结果。' },
    distractors: [{ key: 'А', reason: '未完成体可用于一般请求、建议或禁止，本题不是这一功能。' }],
    pitfall: '不要看到 не 就直接选未完成体。',
    memoryRule: '不要把未来警告误说成反事实条件。',
    nextCheck: '先判断是在劝阻一类行为，还是在警告具体风险。',
    _source: source
  };
  const result = validateAnalysis(input, analysis);
  assert.equal(result.ok, false);
  assert.ok(result.failures.includes('ruleBranchPreserved'));
});
