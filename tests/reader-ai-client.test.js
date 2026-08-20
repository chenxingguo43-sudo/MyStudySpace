'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const Client = require('../js/reader-ai-client');

test('grammar request carries question, choices, answers, and objective evidence', () => {
  const request = Client.grammarRequest({
    id: 'MOCK-Q1', question: 'Я интересуюсь ...',
    options: [{ key: 'A', text: 'музыкой' }, { key: 'B', text: 'музыке' }],
    answer: 'A', sourceExplanation: '动词支配工具格。', pitfalls: ['注意格位']
  }, { selected: 'B' });
  assert.equal(request.input.userAnswer, 'B');
  assert.equal(request.input.correctAnswer, 'A');
  assert.equal(request.input.options.length, 2);
  assert.equal(request.input.objectiveEvidence.sourceExplanation, '动词支配工具格。');
});

test('dictionary request supports word, phrase, selected text, and full sentence', () => {
  assert.equal(Client.dictionaryRequest('музыкой', {}, {}).input.analysisKind, 'word');
  assert.equal(Client.dictionaryRequest('интересоваться музыкой', {}, {}).input.analysisKind, 'phrase');
  assert.equal(Client.dictionaryRequest('Я давно интересуюсь русской музыкой.', {}, {}).input.analysisKind, 'sentence');
  const request = Client.dictionaryRequest('музыкой', { sentenceRu: 'Я интересуюсь музыкой.' }, {
    found: true, lemma: 'музыка', partOfSpeech: 'noun', meaning: '音乐', lexemeKey: 'ru:музыка|noun'
  });
  assert.equal(request.lexemeKey, 'ru:музыка|noun');
  assert.equal(request.input.localDictionary.meaning, '音乐');
});

test('reading request carries source evidence, translations, and Cyrillic option keys', () => {
  const request = Client.readingRequest({
    id: 'RS-Q1', question: 'В целях решения проблемы ... .', zhQuestion: '为了解决问题……',
    options: ['а) открылись курсы', 'б) планируется организовать их обучение', 'в) работает школа'],
    zhOptions: ['课程已经开设', '计划组织培训', '学校正在运营'], answer: 'б',
    sourceAnchor: { quote: 'Этим профессиям собираются обучать людей.' }
  }, { selected: 'а' }, {
    paragraphIndex: 1, paragraphRu: 'Этим профессиям собираются обучать людей.', paragraphZh: '计划培训这些人。'
  });
  assert.equal(request.requestType, 'reading');
  assert.deepEqual(request.input.options.map(item => item.key), ['а', 'б', 'в']);
  assert.equal(request.input.correctAnswer, 'б');
  assert.equal(request.input.evidence.anchorQuoteRu, 'Этим профессиям собираются обучать людей.');
  assert.equal(request.input.optionTranslations[1].text, '计划组织培训');
});

test('client supports direct request, copy logging, feedback, and local cancellation', async () => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, body: JSON.parse(options.body) });
    return { ok: true, status: 200, json: async () => ({ ok: true, interactionId: 'mock-interaction', answer: {} }) };
  };
  const client = Client.createClient({ fetchImpl, basePath: '/mock-ai' });
  const request = Client.grammarRequest({ id: 'MOCK-Q1', question: 'Q', answer: 'A' }, { selected: 'B' });
  const operation = client.start(request);
  await operation.promise;
  await client.recordPromptCopy(request);
  await client.feedback('mock-interaction', 'helpful');
  assert.deepEqual(calls.map(call => call.url), ['/mock-ai/analyze', '/mock-ai/prompt-copy', '/mock-ai/feedback']);
  assert.equal(calls[1].body.deliveryMode, 'prompt_copy');
});

test('Node or AI endpoint outage rejects only the AI request', async () => {
  const client = Client.createClient({ fetchImpl: async () => { throw new Error('offline'); } });
  const operation = client.start(Client.dictionaryRequest('музыкой', {}, {}));
  await assert.rejects(operation.promise, /offline/);
  assert.equal(Client.dictionaryRequest('музыкой', {}, {}).input.target, 'музыкой');
});
