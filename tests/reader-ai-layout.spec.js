const { test, expect } = require('@playwright/test');

test.use({ channel: 'chrome' });
const readerBaseUrl = process.env.READER_TEST_BASE_URL || 'http://127.0.0.1:3109';

async function mountLongDictionaryPanel(page, state) {
  await page.goto(readerBaseUrl + '/reader.html');
  await page.evaluate(panelState => {
    document.body.innerHTML = '<div class="reader-layout" id="readerLayout">' +
      '<main class="reader-pane"><div style="height:2200px">Reader content</div></main>' +
      '<aside class="detail-panel" id="detailPanel" data-dictionary-state="' + panelState + '">' +
        '<div class="detail-panel-inner"><h2>词典</h2><div style="height:1800px">AI result</div></div>' +
      '</aside></div>';
  }, state);
}

test('desktop dictionary has its own stable viewport scroll slot', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await mountLongDictionaryPanel(page, 'full');
  const panel = page.locator('#detailPanel');
  const before = await panel.evaluate(element => ({
    height: element.clientHeight,
    scrollHeight: element.scrollHeight,
    top: element.getBoundingClientRect().top
  }));
  expect(before.top).toBe(48);
  expect(before.height).toBe(672);
  expect(before.scrollHeight).toBeGreaterThan(before.height);
  await panel.hover();
  await page.mouse.wheel(0, 500);
  await expect.poll(() => panel.evaluate(element => element.scrollTop)).toBeGreaterThan(0);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
});

test('phone dictionary remains scrollable without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mountLongDictionaryPanel(page, 'full');
  const panel = page.locator('#detailPanel');
  const dimensions = await panel.evaluate(element => ({
    clientHeight: element.clientHeight,
    scrollHeight: element.scrollHeight,
    right: element.getBoundingClientRect().right,
    width: element.getBoundingClientRect().width
  }));
  expect(dimensions.scrollHeight).toBeGreaterThan(dimensions.clientHeight);
  expect(dimensions.right).toBeLessThanOrEqual(390);
  expect(dimensions.width).toBeLessThanOrEqual(390);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});

test('reading evidence analysis is readable on desktop and phone widths', async ({ page }) => {
  for (const viewport of [{ width: 1280, height: 800 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await page.goto(readerBaseUrl + '/reader.html');
    await page.waitForFunction(() => typeof renderReadingStructuredExplanation === 'function' && typeof renderReaderAiReadingResult === 'function');
    await page.evaluate(async () => {
      const chapter = await fetch('/data/textbook/reading_speaking/ch0004.json').then(response => response.json());
      const answer = chapter.exercises[0].answerAnalysis;
      document.body.innerHTML = '<main style="max-width:760px;margin:0 auto;padding:16px">' +
        renderReadingStructuredExplanation(answer, 'rs-4-ex1') +
        renderReaderAiReadingResult({ interactionId: 'layout-reading', answer: {
          conclusion: answer.conclusion,
          evidence: [{ quoteRu: answer.evidence.ru, quoteZh: answer.evidence.zh, explanation: '原文明确表示行动仍处于计划阶段。' }],
          correctMapping: answer.mappings.map(item => ({ sourceRu: item.source, optionKey: 'б', optionRu: item.option, explanation: item.reason })),
          optionAnalysis: answer.options.map(item => ({ key: item.key, status: item.status, conflictTerms: item.terms, reason: item.reason })),
          userMistake: { selectedKey: 'а', explanation: answer.pitfall, nextCheck: answer.nextCheck },
          readingSkill: ['计划与已经发生', '实体关系'],
          transferQuestion: { prompt: '选择与计划状态一致的选项。', options: ['A. ...', 'B. ...'] }
        } }) + '</main>';
    });
    await expect(page.locator('body')).toContainText('собираются обучать');
    await expect(page.locator('body')).toContainText('下次先检查');
    await expect(page.locator('.rs-source-locate')).toContainText('定位原文');
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
    const blocks = page.locator('.rs-structured-analysis > section, .reader-ai-reading-panel');
    expect(await blocks.count()).toBeGreaterThan(4);
    for (let index = 0; index < await blocks.count(); index += 1) {
      const box = await blocks.nth(index).boundingBox();
      expect(box.width).toBeGreaterThan(100);
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
    }
  }
});

test('reading source locator highlights every reviewed evidence fragment', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(readerBaseUrl + '/reader.html');
  await page.waitForFunction(() => typeof locateReadingSpeakingSource === 'function');

  const expectedHighlightCount = await page.evaluate(async () => {
    const chapter = await fetch('/data/textbook/reading_speaking/ch0004.json').then(response => response.json());
    const exercise = { ...chapter.exercises[3], _exId: 'layout-q4' };
    _currentRSExercises = [exercise];
    const words = chapter.original[3].split(/\s+/).filter(Boolean);
    document.body.innerHTML = '<div class="para-block"><p class="rs-source-paragraph" id="rs-source-p-3">' +
      words.map(word => '<span class="ru-word">' + escapeHtml(word) + '</span> ').join('') + '</p></div>';
    locateReadingSpeakingSource('layout-q4');
    return exercise.evidenceAnchors.reduce((total, anchor) => total + anchor.quote.split(/\s+/).filter(token => {
      return /^[а-я-]+$/.test(normalizeReadingSpeakingSourceWord(token));
    }).length, 0);
  });

  await expect(page.locator('.rs-source-word-highlight')).toHaveCount(expectedHighlightCount);
  await expect(page.locator('.rs-source-paragraph-highlight')).toHaveCount(1);
});
