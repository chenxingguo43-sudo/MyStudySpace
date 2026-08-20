const { test, expect } = require('@playwright/test');

test.use({ channel: 'chrome' });
const baseUrl = process.env.READER_TEST_BASE_URL || 'http://127.0.0.1:3186';

test('grammar and dictionary AI render in Reader while local dictionary survives AI outage', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(baseUrl + '/reader.html');
  await page.waitForFunction(() => window.ReaderAiClient && typeof renderReaderAiGrammarResult === 'function' && typeof renderReaderAiReadingResult === 'function');

  const result = await page.evaluate(async () => {
    const client = ReaderAiClient.createClient({});
    const grammar = ReaderAiClient.grammarRequest({
      id: 'PHASE25-GRAMMAR-1',
      prompt: 'Я интересуюсь ...',
      options: [{ key: 'A', text: 'музыкой' }, { key: 'B', text: 'музыке' }],
      answer: 'A'
    }, {
      selected: 'B',
      submitted: true,
      correct: false,
      objectiveEvidence: { sourceExplanation: 'интересоваться 要求工具格。' }
    });
    grammar.clientRequestId = 'reader-ai:browser-grammar-001';
    const grammarPayload = await client.start(grammar).promise;

    const dictionary = ReaderAiClient.dictionaryRequest('музыкой', {
      sentenceRu: 'Я интересуюсь музыкой.',
      sentenceZh: '我对音乐感兴趣。',
      taskId: 'PHASE25-DICTIONARY-1'
    }, {
      found: true,
      lemma: 'музыка',
      partOfSpeech: 'noun',
      meaning: '音乐',
      reliability: 'reviewed',
      lexemeKey: 'ru:музыка|noun'
    });
    dictionary.clientRequestId = 'reader-ai:browser-dictionary-001';
    const dictionaryPayload = await client.start(dictionary).promise;

    const grammarHost = document.createElement('section');
    grammarHost.id = 'phase25GrammarResult';
    grammarHost.innerHTML = renderReaderAiGrammarResult(grammarPayload);
    document.body.appendChild(grammarHost);
    const dictionaryHost = document.createElement('section');
    dictionaryHost.id = 'phase25DictionaryResult';
    dictionaryHost.innerHTML = renderReaderAiDictionaryResult(dictionaryPayload);
    document.body.appendChild(dictionaryHost);
    const readingHost = document.createElement('section');
    readingHost.id = 'phase25ReadingResult';
    readingHost.innerHTML = renderReaderAiReadingResult({
      status: 'completed', interactionId: 'mock-reading-interaction',
      answer: {
        conclusion: 'B 保留了原文的计划状态。',
        evidence: [{ quoteRu: 'Этим профессиям собираются обучать людей.', quoteZh: '打算培训这些人。', explanation: 'собираются 表示计划。' }],
        correctMapping: [{ sourceRu: 'собираются обучать', optionKey: 'б', optionRu: 'планируется организовать обучение', explanation: '两者表示同一计划动作。' }],
        optionAnalysis: [
          { key: 'а', status: 'wrong', conflictTerms: ['открылись'], reason: '把计划改成已经发生。' },
          { key: 'б', status: 'correct', conflictTerms: [], reason: '与原文相符。' },
          { key: 'в', status: 'wrong', conflictTerms: ['работает'], reason: '把计划改成正在运营。' }
        ],
        userMistake: { selectedKey: 'а', explanation: '表面词汇相似造成误选。', nextCheck: '先检查时间状态。' },
        readingSkill: ['计划与事实'],
        transferQuestion: { prompt: '选择计划状态。', options: ['A. ...', 'B. ...'] }
      }
    });
    document.body.appendChild(readingHost);

    await loadLocalLookupData();
    if (supplementalLookupPromise) await supplementalLookupPromise;
    const localBeforeOutage = lookupLocalChineseMeaning('мир');
    return {
      grammarStatus: grammarPayload.status,
      dictionaryStatus: dictionaryPayload.status,
      localMeaning: localBeforeOutage && localBeforeOutage.meaning
    };
  });

  expect(result.grammarStatus).toBe('completed');
  expect(result.dictionaryStatus).toBe('completed');
  expect(result.localMeaning).toBeTruthy();
  await expect(page.locator('#phase25GrammarResult')).toContainText('正确答案为什么成立');
  await expect(page.locator('#phase25GrammarResult')).toContainText('不改动原始答案');
  await expect(page.locator('#phase25DictionaryResult')).toContainText('当前语境中的意思');
  await expect(page.locator('#phase25ReadingResult')).toContainText('原文证据');
  await expect(page.locator('#phase25ReadingResult')).toContainText('собираются обучать');
  await expect(page.locator('#phase25ReadingResult')).toContainText('你这次为什么容易选错');

  await page.route('**/api/reader-ai/analyze', route => route.abort('connectionfailed'));
  const outage = await page.evaluate(async () => {
    const request = ReaderAiClient.dictionaryRequest('мир', {}, { found: true, lemma: 'мир', meaning: '世界' });
    request.clientRequestId = 'reader-ai:browser-outage-001';
    let aiFailed = false;
    try { await ReaderAiClient.createClient({}).start(request).promise; }
    catch (_error) { aiFailed = true; }
    const local = lookupLocalChineseMeaning('мир');
    return { aiFailed, localMeaning: local && local.meaning, pageStillLoaded: Boolean(document.body) };
  });

  expect(outage.aiFailed).toBe(true);
  expect(outage.localMeaning).toBe(result.localMeaning);
  expect(outage.pageStillLoaded).toBe(true);
});
