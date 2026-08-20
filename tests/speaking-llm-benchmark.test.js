'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  CASES,
  offlineAnswer,
  scoreCase,
  runBenchmark
} = require('../scripts/run-speaking-llm-benchmark');
const { createOpenAiCompatibleProvider } = require('../server/reader-ai-provider');

test('speaking benchmark uses fixed synthetic cases and no personal records', () => {
  assert.equal(CASES.length, 5);
  CASES.forEach(item => {
    assert.ok(item.id);
    assert.ok(item.input.asrZh);
    assert.ok(item.input.asrRu);
    assert.deepEqual(item.input.learningContext, undefined);
  });
});

test('offline speaking candidate passes the hard contract checks', async () => {
  const report = await runBenchmark();
  assert.equal(report.caseCount, 5);
  assert.equal(report.failed, 0);
  assert.equal(report.allPassed, true);
});

test('speaking scorer catches missing clarification and oversized replies', () => {
  const testCase = CASES[0];
  const answer = offlineAnswer(testCase);
  answer.clarification = { needed: false, questionZh: '' };
  answer.replyRu = 'Это первое предложение. Это второе предложение. Это третье предложение.';
  const scored = scoreCase(testCase, answer);
  assert.equal(scored.passed, false);
  assert.match(scored.errors.join('\n'), /澄清|超过/);
});

test('OpenAI-compatible candidate receives the speaking contract without personal context', async () => {
  let request;
  const provider = createOpenAiCompatibleProvider({
    baseUrl: 'http://mock.local/v1',
    apiKey: 'test-only-key',
    model: 'mock-speaking-candidate',
    fetchImpl: async (_url, options) => {
      request = options;
      return { ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify(offlineAnswer(CASES[1])) } }] }) };
    }
  });
  const result = await provider.analyze({ requestType: 'speaking', input: CASES[1].input, learningContext: [] });
  assert.equal(result.answer.questionRu, 'Что вам понравилось больше всего?');
  const body = JSON.parse(request.body);
  assert.match(body.messages[0].content, /口语陪练/);
  assert.match(body.messages[1].content, /confirmedTranscript/);
  assert.doesNotMatch(body.messages[1].content, /test-only-key/);
});
