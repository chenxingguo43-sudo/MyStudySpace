'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const Schema = require('../js/learning-event-schema');
const { createLearningStore } = require('../server/learning-store');
const { createReaderAiStore } = require('../server/reader-ai-store');
const { createReaderAiApi } = require('../server/reader-ai-api');
const { ReaderAiProviderError } = require('../server/reader-ai-provider');

const grammarAnswer = {
  answerReason: '动词要求工具格。',
  optionReasons: [{ key: 'A', reason: '工具格正确。' }, { key: 'B', reason: '与格不符合支配关系。' }],
  knowledgePoints: ['动词支配工具格'],
  pitfall: '不要只根据中文介词选择格。',
  transferQuestion: { prompt: 'Я увлекаюсь ...', options: ['A. спортом', 'B. спорту'] }
};

const readingAnswer = {
  conclusion: 'B 保留了原文中的计划状态。',
  evidence: [{ quoteRu: 'собираются обучать', quoteZh: '打算培训', explanation: '表示计划中的动作。' }],
  correctMapping: [{ sourceRu: 'собираются обучать', optionKey: 'б', optionRu: 'планируется организовать обучение', explanation: '两者都表示计划培训。' }],
  optionAnalysis: [
    { key: 'а', status: 'wrong', conflictTerms: ['открылись'], reason: '把计划改成已经发生。' },
    { key: 'б', status: 'correct', conflictTerms: [], reason: '保留了计划状态。' },
    { key: 'в', status: 'wrong', conflictTerms: ['работает'], reason: '把计划改成正在运营。' }
  ],
  userMistake: { selectedKey: 'а', explanation: '被表面词汇相似吸引。', nextCheck: '先检查时间状态。' },
  readingSkill: ['计划与事实'],
  transferQuestion: { prompt: '选择计划状态。', options: ['A. ...', 'B. ...'] }
};

function mockLearningEvent() {
  return {
    schema: Schema.EVENT_SCHEMA,
    schemaVersion: Schema.EVENT_SCHEMA_VERSION,
    eventId: '11111111-1111-4111-8111-111111111111',
    learnerId: '22222222-2222-4222-8222-222222222222',
    deviceId: '33333333-3333-4333-8333-333333333333',
    eventType: 'vocabulary_entry_added',
    occurredAt: '2026-08-17T08:00:00.000+08:00',
    recordedAt: '2026-08-17T00:00:00.100Z',
    receivedAt: null,
    source: { module: 'reader', contentId: 'MOCK-Q1', location: {} },
    subject: { surfaceForm: 'музыкой', lexemeKey: 'ru:музыка|noun', unresolvedLexemeId: null, senseId: 'sense-music', reviewUnitId: null },
    context: { meaningSnapshot: '音乐' },
    evidence: { kind: 'learner_confirmed', strength: 'strong', quality: 'accepted' },
    payload: { addMethod: 'reader_save_button', initialSenseId: 'sense-music', lookupEventId: null },
    correctsEventId: null
  };
}

async function setup(provider) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'white-night-reader-ai-api-'));
  const databasePath = path.join(directory, 'white-night-learning.sqlite3');
  const learningStore = createLearningStore({ databasePath });
  learningStore.ingestBatch({
    schema: Schema.BATCH_SCHEMA,
    schemaVersion: Schema.BATCH_SCHEMA_VERSION,
    batchId: '44444444-4444-4444-8444-444444444444',
    deviceId: '33333333-3333-4333-8333-333333333333',
    events: [mockLearningEvent()]
  });
  const aiStore = createReaderAiStore({ databasePath: learningStore.databasePath });
  const handler = createReaderAiApi({ store: aiStore, provider });
  const server = http.createServer((req, res) => {
    const urlPath = new URL(req.url, 'http://localhost').pathname;
    if (!handler(req, res, urlPath)) { res.writeHead(404); res.end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  return {
    aiStore,
    baseUrl: 'http://127.0.0.1:' + address.port,
    databasePath,
    async close() {
      await new Promise(resolve => server.close(resolve));
      aiStore.close();
      learningStore.close();
      fs.rmSync(directory, { recursive: true, force: true });
    }
  };
}

async function post(baseUrl, pathName, body) {
  const response = await fetch(baseUrl + pathName, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
  });
  return { status: response.status, body: await response.json() };
}

async function get(baseUrl, pathName) {
  const response = await fetch(baseUrl + pathName);
  return { status: response.status, body: await response.json() };
}

function grammarRequest(clientRequestId) {
  return {
    clientRequestId,
    requestType: 'grammar',
    templateVersion: 'reader-ai-v1',
    source: { kind: 'reader-question', id: 'MOCK-Q1' },
    input: {
      questionId: 'MOCK-Q1', question: 'Я интересуюсь ...',
      options: [{ key: 'A', text: 'музыкой' }, { key: 'B', text: 'музыке' }],
      userAnswer: 'B', correctAnswer: 'A', objectiveEvidence: { sourceExplanation: '工具格支配。' }
    }
  };
}

function readingRequest(clientRequestId) {
  return {
    clientRequestId,
    requestType: 'reading',
    templateVersion: 'reader-ai-reading-v2',
    source: { kind: 'reader-reading-question', id: 'RS-Q1' },
    input: {
      questionId: 'RS-Q1', question: 'В целях решения проблемы ...', questionZh: '为了解决问题……',
      options: [{ key: 'а', text: 'открылись курсы' }, { key: 'б', text: 'планируется обучение' }, { key: 'в', text: 'работает школа' }],
      userAnswer: 'а', correctAnswer: 'б',
      evidence: { anchorQuoteRu: 'Этим профессиям собираются обучать людей.', paragraphRu: 'Этим профессиям собираются обучать людей.', paragraphZh: '计划培训这些人。' }
    }
  };
}

test('grammar flow reads only relevant learning records, saves result, deduplicates, and accepts feedback', async () => {
  let receivedContext;
  let calls = 0;
  const state = await setup({ analyze: async request => {
    calls += 1;
    receivedContext = request.learningContext;
    return { model: 'mock-russian-tutor', answer: grammarAnswer, usage: { inputTokens: 240, outputTokens: 160, totalTokens: 400 } };
  }});
  try {
    const request = grammarRequest('reader-ai:api-grammar-001');
    const first = await post(state.baseUrl, '/api/reader-ai/analyze', request);
    assert.equal(first.status, 200);
    assert.equal(first.body.answer.answerReason, grammarAnswer.answerReason);
    assert.deepEqual(first.body.usage, { inputTokens: 240, cachedInputTokens: 0, outputTokens: 160, reasoningTokens: 0, totalTokens: 400, estimatedCost: null });
    assert.equal(receivedContext.length, 1);
    assert.equal(receivedContext[0].eventType, 'vocabulary_entry_added');
    const duplicate = await post(state.baseUrl, '/api/reader-ai/analyze', request);
    assert.equal(duplicate.body.cached, true);
    assert.equal(calls, 1);
    const feedback = await post(state.baseUrl, '/api/reader-ai/feedback', { interactionId: first.body.interactionId, feedback: 'incorrect' });
    assert.equal(feedback.body.feedback, 'incorrect');
  } finally { await state.close(); }
});

test('capabilities endpoint advertises the reading request type for launcher health checks', async () => {
  const state = await setup({ analyze: async () => ({ model: 'mock', answer: grammarAnswer }) });
  try {
    const result = await get(state.baseUrl, '/api/reader-ai/capabilities');
    assert.equal(result.status, 200);
    assert.deepEqual(result.body.requestTypes, ['grammar', 'reading', 'dictionary']);
  } finally { await state.close(); }
});

test('dictionary flow marks missing local entry as provisional and prompt copy has no fake model or answer', async () => {
  const dictionaryAnswer = {
    contextMeaning: '在此处表示“音乐”。', morphology: '工具格单数。',
    collocations: ['интересоваться музыкой'], examples: [{ ru: 'Она любит музыку.', zh: '她喜欢音乐。' }],
    confusions: ['музыкальный 是形容词。']
  };
  const state = await setup({ analyze: async () => ({ model: 'mock-russian-tutor', answer: dictionaryAnswer }) });
  try {
    const request = {
      clientRequestId: 'reader-ai:api-dictionary-001', requestType: 'dictionary', templateVersion: 'reader-ai-v1',
      source: { kind: 'reader-lookup', id: 'MOCK-Q1' }, lexemeKey: '',
      input: { target: 'неизвестно', analysisKind: 'word', localDictionaryFound: false, localDictionary: {} }
    };
    const result = await post(state.baseUrl, '/api/reader-ai/analyze', request);
    assert.equal(result.body.answer.provisional, true);
    const copied = await post(state.baseUrl, '/api/reader-ai/prompt-copy', { ...request, clientRequestId: 'reader-ai:api-copy-001' });
    assert.equal(copied.body.deliveryMode, 'prompt_copy');
    assert.equal(copied.body.answer, null);
    assert.equal(copied.body.model, '');
  } finally { await state.close(); }
});

test('reading flow stores source evidence and validates every option without touching learning FSRS', async () => {
  let received;
  const state = await setup({ analyze: async request => {
    received = request;
    return { model: 'mock-reading-tutor', answer: readingAnswer, usage: { inputTokens: 300, outputTokens: 220, totalTokens: 520 } };
  }});
  try {
    const result = await post(state.baseUrl, '/api/reader-ai/analyze', readingRequest('reader-ai:api-reading-001'));
    assert.equal(result.status, 200);
    assert.equal(result.body.requestType, 'reading');
    assert.equal(result.body.answer.userMistake.selectedKey, 'а');
    assert.equal(received.input.evidence.anchorQuoteRu, 'Этим профессиям собираются обучать людей.');
    assert.equal(state.aiStore.get(result.body.interactionId).requestType, 'reading');
  } finally { await state.close(); }
});

test('failed request can retry with the same id and database keeps the successful recovery', async () => {
  let calls = 0;
  const state = await setup({ analyze: async () => {
    calls += 1;
    if (calls === 1) throw new ReaderAiProviderError('network_error', '模拟断网', 502);
    return { model: 'mock-russian-tutor', answer: grammarAnswer };
  }});
  try {
    const request = grammarRequest('reader-ai:api-retry-001');
    const failed = await post(state.baseUrl, '/api/reader-ai/analyze', request);
    assert.equal(failed.status, 502);
    const recovered = await post(state.baseUrl, '/api/reader-ai/analyze', request);
    assert.equal(recovered.status, 200);
    const stored = state.aiStore.get(recovered.body.interactionId);
    assert.equal(stored.attemptCount, 2);
    assert.equal(stored.status, 'completed');
  } finally { await state.close(); }
});

test('in-flight request can be cancelled without affecting the HTTP server', async () => {
  let startedResolve;
  const started = new Promise(resolve => { startedResolve = resolve; });
  const state = await setup({ analyze: request => new Promise((_resolve, reject) => {
    startedResolve();
    request.signal.addEventListener('abort', () => reject(new ReaderAiProviderError('cancelled', '请求已取消', 499)), { once: true });
  }) });
  try {
    const request = grammarRequest('reader-ai:api-cancel-001');
    const pending = post(state.baseUrl, '/api/reader-ai/analyze', request);
    await started;
    const cancelled = await post(state.baseUrl, '/api/reader-ai/cancel', { clientRequestId: request.clientRequestId });
    assert.equal(cancelled.body.cancelled, true);
    const result = await pending;
    assert.equal(result.status, 499);
    assert.equal(result.body.status, 'cancelled');
    const invalid = await post(state.baseUrl, '/api/reader-ai/analyze', { clientRequestId: 'bad', requestType: 'grammar', input: {} });
    assert.equal(invalid.status, 400);
  } finally { await state.close(); }
});
