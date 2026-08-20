'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createReaderAiConfig, normalizeProvider } = require('../server/reader-ai-config');
const { createReaderAiRoutingProvider, estimateCost } = require('../server/reader-ai-routing-provider');

function memorySecrets() {
  const values = new Map();
  return {
    has(id) { return values.has(id); },
    async set(id, value) { values.set(id, value); },
    async get(id) { return values.get(id) || ''; },
    remove(id) { values.delete(id); }
  };
}

test('provider config persists without exposing or writing the API key', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'reader-ai-config-'));
  const configPath = path.join(directory, 'reader-ai-config.json');
  const secrets = memorySecrets();
  const environment = {
    BELYE_NOCHI_AI_BASE_URL: 'https://env.example/v1', BELYE_NOCHI_AI_MODEL: 'env-model',
    BELYE_NOCHI_AI_API_FORMAT: 'responses', BELYE_NOCHI_AI_API_KEY: 'env-secret'
  };
  try {
    const config = createReaderAiConfig({ dataDirectory: directory, configPath, secretStore: secrets, environment });
    await config.upsert({
      id: 'deepseek-cheap', name: '便宜查词', vendor: 'deepseek', format: 'chat_completions',
      baseUrl: 'https://api.deepseek.example/v1', model: 'deepseek-chat',
      pricing: { currency: 'CNY', multiplier: 0.7, inputPerMillion: 2, outputPerMillion: 8 }
    }, 'provider-secret');
    config.setAssignments({ dictionary: 'deepseek-cheap', grammar: 'environment' });
    const publicState = config.publicState();
    assert.equal(publicState.providers[1].secretConfigured, true);
    assert.equal(JSON.stringify(publicState).includes('provider-secret'), false);
    assert.equal(fs.readFileSync(configPath, 'utf8').includes('provider-secret'), false);
    const selected = await config.resolve('dictionary');
    assert.equal(selected.apiKey, 'provider-secret');
    assert.equal(selected.model, 'deepseek-chat');
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});

test('provider validation rejects credentials embedded in the URL', () => {
  assert.throws(() => normalizeProvider({
    id: 'bad-provider', name: 'bad', vendor: 'custom', format: 'responses',
    baseUrl: 'https://user:secret@example.com', model: 'model'
  }), /invalid_provider_url/);
});

test('cost estimate separates cached input and applies channel multiplier', () => {
  const result = estimateCost(
    { inputTokens: 4614, cachedInputTokens: 3840, outputTokens: 231 },
    { currency: 'CNY', multiplier: 0.14, inputPerMillion: 10, cachedInputPerMillion: 1, outputPerMillion: 30 }
  );
  assert.equal(result.currency, 'CNY');
  assert.equal(result.multiplier, 0.14);
  assert.ok(Math.abs(result.amount - 0.0025914) < 1e-10);
});

test('task router uses the assigned provider and returns a price snapshot', async () => {
  const answer = {
    contextMeaning: '音乐', morphology: '工具格单数', collocations: ['интересоваться музыкой'],
    examples: [{ ru: 'Я люблю музыку.', zh: '我喜欢音乐。' }], confusions: ['музыкальный 是形容词']
  };
  const provider = createReaderAiRoutingProvider({
    config: { resolve: async () => ({
      id: 'cheap-dictionary', name: '便宜查词', configured: true, apiKey: 'test-key',
      baseUrl: 'https://mock.invalid/v1', model: 'mock-model', format: 'responses',
      pricing: { currency: 'CNY', multiplier: 0.1, inputPerMillion: 10, cachedInputPerMillion: 1, outputPerMillion: 20 }
    }) },
    fetchImpl: async () => ({ ok: true, json: async () => ({
      output_text: JSON.stringify(answer), usage: { input_tokens: 100, output_tokens: 50, total_tokens: 150 }
    }) })
  });
  const result = await provider.analyze({ requestType: 'dictionary', input: { target: 'музыкой' }, learningContext: [] });
  assert.equal(result.providerId, 'cheap-dictionary');
  assert.equal(result.usage.estimatedCost.currency, 'CNY');
  assert.ok(result.usage.estimatedCost.amount > 0);
});

test('reading analysis reuses the configured strong grammar-model route', async () => {
  let resolvedType = '';
  const answer = {
    conclusion: 'B 与原文一致。',
    evidence: [{ quoteRu: 'собираются обучать', quoteZh: '计划培训', explanation: '表示计划。' }],
    correctMapping: [{ sourceRu: 'собираются обучать', optionKey: 'б', optionRu: 'планируется обучение', explanation: '同义改写。' }],
    optionAnalysis: [
      { key: 'а', status: 'wrong', conflictTerms: ['открылись'], reason: '已经发生。' },
      { key: 'б', status: 'correct', conflictTerms: [], reason: '计划状态一致。' }
    ],
    userMistake: { selectedKey: 'а', explanation: '忽略了时间状态。', nextCheck: '检查计划与事实。' },
    readingSkill: ['时间状态'],
    transferQuestion: { prompt: '选择计划状态。', options: ['A. ...', 'B. ...'] }
  };
  const provider = createReaderAiRoutingProvider({
    config: { resolve: async type => {
      resolvedType = type;
      return { id: 'strong-grammar', name: '强模型', configured: true, apiKey: 'test-key', baseUrl: 'https://mock.invalid/v1', model: 'mock-model', format: 'responses', pricing: {} };
    } },
    fetchImpl: async () => ({ ok: true, json: async () => ({ output_text: JSON.stringify(answer), usage: {} }) })
  });
  await provider.analyze({ requestType: 'reading', input: { evidence: { anchorQuoteRu: 'собираются обучать' } }, learningContext: [] });
  assert.equal(resolvedType, 'grammar');
});
