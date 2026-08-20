'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  ReaderAiProviderError,
  createAnthropicProvider,
  createOpenAiCompatibleProvider,
  normalizeUsage,
  validateDictionary,
  validateGrammar,
  validateReading
} = require('../server/reader-ai-provider');

const grammarAnswer = {
  answerReason: '动词要求工具格。',
  optionReasons: [{ key: 'A', reason: '这是工具格。' }, { key: 'B', reason: '这是与格。' }],
  knowledgePoints: ['动词支配关系'],
  pitfall: '不要只看词尾。',
  transferQuestion: { prompt: '选择合适形式：Я интересуюсь ...', options: ['A. музыкой', 'B. музыке'] }
};

const dictionaryAnswer = {
  contextMeaning: '在此处表示“感兴趣”。',
  morphology: 'интересуюсь 是 интересоваться 的第一人称单数现在时。',
  collocations: ['интересоваться музыкой'],
  examples: [{ ru: 'Я интересуюсь музыкой.', zh: '我对音乐感兴趣。' }],
  confusions: ['интересный 表示“有趣的”，词性不同。']
};

const readingAnswer = {
  conclusion: 'B 保留了原文中的计划状态和培训对象。',
  evidence: [{ quoteRu: 'Этим профессиям собираются обучать людей.', quoteZh: '打算培训这些人。', explanation: 'собираются 表示计划中的动作。' }],
  correctMapping: [{ sourceRu: 'собираются обучать', optionKey: 'б', optionRu: 'планируется организовать обучение', explanation: '两者都表示计划进行培训。' }],
  optionAnalysis: [
    { key: 'а', status: 'wrong', conflictTerms: ['открылись'], reason: '把计划中的动作改成了已经发生。' },
    { key: 'б', status: 'correct', conflictTerms: [], reason: '与原文的计划状态和培训动作相符。' },
    { key: 'в', status: 'wrong', conflictTerms: ['работает школа'], reason: '把未来课程改成正在运营的学校。' }
  ],
  userMistake: { selectedKey: 'а', explanation: '表面词汇相似，但忽略了时间状态。', nextCheck: '先检查表示计划、可能或已发生的词。' },
  readingSkill: ['计划与事实状态'],
  transferQuestion: { prompt: '选择与原文计划状态一致的选项。', options: ['A. ...', 'B. ...'] }
};

function responseFor(answer) {
  return {
    ok: true,
    json: async () => ({ choices: [{ message: { content: JSON.stringify(answer) } }] })
  };
}

function responsesResponseFor(answer) {
  return { ok: true, json: async () => ({
    output_text: JSON.stringify(answer),
    usage: { input_tokens: 320, output_tokens: 180, total_tokens: 500, input_tokens_details: { cached_tokens: 64 }, output_tokens_details: { reasoning_tokens: 40 } }
  }) };
}

test('validates complete grammar and dictionary response contracts', () => {
  assert.deepEqual(validateGrammar(grammarAnswer), grammarAnswer);
  assert.deepEqual(validateDictionary(dictionaryAnswer), dictionaryAnswer);
  assert.throws(() => validateGrammar({ answerReason: '缺字段' }), /字段不完整/);
  assert.throws(() => validateDictionary({ contextMeaning: '缺字段' }), /字段不完整/);
});

test('validates the evidence-first reading response contract', () => {
  assert.deepEqual(validateReading(readingAnswer), readingAnswer);
  assert.throws(() => validateReading({ conclusion: '缺少证据' }), /阅读解析字段不完整/);
});

test('OpenAI-compatible adapter uses the reading prompt and parses evidence mappings', async () => {
  let request;
  const provider = createOpenAiCompatibleProvider({
    baseUrl: 'http://mock.local/v1', apiKey: 'test-only-key', model: 'mock-reading-tutor',
    fetchImpl: async (_url, options) => { request = options; return responseFor(readingAnswer); }
  });
  const result = await provider.analyze({ requestType: 'reading', input: {
    question: 'В целях решения проблемы ...', correctAnswer: 'б',
    options: [{ key: 'а', text: 'открылись курсы' }, { key: 'б', text: 'планируется обучение' }, { key: 'в', text: 'работает школа' }],
    evidence: { anchorQuoteRu: 'собираются обучать' }
  }, learningContext: [] });
  assert.equal(result.answer.userMistake.selectedKey, 'а');
  const body = JSON.parse(request.body);
  assert.match(body.messages[0].content, /阅读理解题/);
  assert.match(body.messages[1].content, /anchorQuoteRu/);
});

test('OpenAI-compatible adapter sends fixed mock input and parses structured output', async () => {
  let request;
  const provider = createOpenAiCompatibleProvider({
    baseUrl: 'http://mock.local/v1', apiKey: 'test-only-key', model: 'mock-russian-tutor',
    fetchImpl: async (_url, options) => { request = options; return responseFor(grammarAnswer); }
  });
  const result = await provider.analyze({ requestType: 'grammar', input: { question: 'Я интересуюсь ...' }, learningContext: [], signal: new AbortController().signal });
  assert.equal(result.model, 'mock-russian-tutor');
  assert.deepEqual(result.answer, grammarAnswer);
  const body = JSON.parse(request.body);
  assert.equal(body.response_format.type, 'json_object');
  assert.equal(request.headers.Authorization, 'Bearer test-only-key');
});

test('Responses adapter uses the native Responses endpoint and parses output_text', async () => {
  let url;
  let request;
  const provider = createOpenAiCompatibleProvider({
    baseUrl: 'http://mock.local', apiKey: 'test-only-key', model: 'gpt-5.6-terra', format: 'responses',
    fetchImpl: async (nextUrl, options) => { url = nextUrl; request = options; return responsesResponseFor(dictionaryAnswer); }
  });
  const result = await provider.analyze({ requestType: 'dictionary', input: { target: 'музыкой' }, learningContext: [], signal: new AbortController().signal });
  assert.equal(url, 'http://mock.local/responses');
  assert.deepEqual(result.answer, dictionaryAnswer);
  assert.deepEqual(result.usage, { inputTokens: 320, cachedInputTokens: 64, outputTokens: 180, reasoningTokens: 40, totalTokens: 500 });
  const body = JSON.parse(request.body);
  assert.equal(body.text.format.type, 'json_object');
  assert.equal(body.input[0].role, 'developer');
});

test('normalizes Chat Completions token usage', () => {
  assert.deepEqual(normalizeUsage({ usage: {
    prompt_tokens: 90, completion_tokens: 30, total_tokens: 120,
    prompt_tokens_details: { cached_tokens: 10 }, completion_tokens_details: { reasoning_tokens: 5 }
  } }, 'chat_completions'), {
    inputTokens: 90, cachedInputTokens: 10, outputTokens: 30, reasoningTokens: 5, totalTokens: 120
  });
});

test('Anthropic adapter uses Messages and normalizes its usage', async () => {
  let url;
  let request;
  const provider = createAnthropicProvider({
    baseUrl: 'https://api.anthropic.test/v1', apiKey: 'test-key', model: 'claude-test',
    fetchImpl: async (nextUrl, options) => {
      url = nextUrl; request = options;
      return {
        ok: true,
        json: async () => ({
          content: [{ type: 'text', text: JSON.stringify(grammarAnswer) }],
          usage: { input_tokens: 200, cache_read_input_tokens: 50, output_tokens: 80 }
        })
      };
    }
  });
  const result = await provider.analyze({ requestType: 'grammar', input: { question: 'mock' }, learningContext: [] });
  assert.equal(url, 'https://api.anthropic.test/v1/messages');
  assert.equal(request.headers['x-api-key'], 'test-key');
  assert.deepEqual(result.usage, { inputTokens: 200, cachedInputTokens: 50, outputTokens: 80, reasoningTokens: 0, totalTokens: 280 });
  assert.deepEqual(result.answer, grammarAnswer);
});

test('adapter rejects an unknown API format before making a request', () => {
  assert.throws(() => createOpenAiCompatibleProvider({
    baseUrl: 'http://mock.local', apiKey: 'test', model: 'mock', format: 'unsupported'
  }), error => error.code === 'invalid_configuration');
});

test('adapter reports missing configuration without making a request', async () => {
  const provider = createOpenAiCompatibleProvider({ environment: {}, fetchImpl: async () => { throw new Error('must not run'); } });
  await assert.rejects(() => provider.analyze({ requestType: 'grammar', input: {}, learningContext: [] }), error => {
    assert.equal(error.code, 'not_configured');
    assert.equal(error.statusCode, 503);
    return true;
  });
});

test('adapter distinguishes timeout, network failure, and invalid response', async () => {
  const timeoutProvider = createOpenAiCompatibleProvider({
    baseUrl: 'http://mock.local/v1', apiKey: 'test', model: 'mock', timeoutMs: 20,
    fetchImpl: (_url, options) => new Promise((_resolve, reject) => options.signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true }))
  });
  await assert.rejects(() => timeoutProvider.analyze({ requestType: 'grammar', input: {}, learningContext: [] }), error => error.code === 'timeout');

  const networkProvider = createOpenAiCompatibleProvider({
    baseUrl: 'http://mock.local/v1', apiKey: 'test', model: 'mock', fetchImpl: async () => { throw new Error('offline'); }
  });
  await assert.rejects(() => networkProvider.analyze({ requestType: 'dictionary', input: {}, learningContext: [] }), error => error.code === 'network_error');

  const invalidProvider = createOpenAiCompatibleProvider({
    baseUrl: 'http://mock.local/v1', apiKey: 'test', model: 'mock', fetchImpl: async () => responseFor({ contextMeaning: '只有一个字段' })
  });
  await assert.rejects(() => invalidProvider.analyze({ requestType: 'dictionary', input: {}, learningContext: [] }), error => {
    assert.ok(error instanceof ReaderAiProviderError);
    assert.equal(error.code, 'invalid_response');
    return true;
  });
});
