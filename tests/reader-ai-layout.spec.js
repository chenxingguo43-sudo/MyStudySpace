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

test('two-layer reading pilot keeps the reason visible and details collapsed', async ({ page }) => {
  for (const viewport of [{ width: 1280, height: 800 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await page.goto(readerBaseUrl + '/reader.html');
    await page.waitForFunction(() => typeof renderReadingStructuredExplanation === 'function');
    await page.evaluate(async () => {
      const chapter = await fetch('/data/textbook/reading_speaking/ch0000.json').then(response => response.json());
      const answer = chapter.exercises[0].answerAnalysis;
      document.body.innerHTML = '<main style="max-width:760px;margin:0 auto;padding:16px">' +
        renderReadingStructuredExplanation(answer, 'rs-pilot-q1') + '</main>';
    });

    await expect(page.locator('.rs-analysis-quick')).toContainText('любители старины');
    await expect(page.locator('.rs-analysis-quick')).toContainText('поклонников старины');
    await expect(page.locator('.rs-analysis-expanded')).not.toHaveAttribute('open', '');
    await expect(page.locator('.rs-analysis-expanded-content')).not.toBeVisible();
    await page.locator('.rs-analysis-expanded > summary').click();
    await expect(page.locator('.rs-analysis-expanded-content')).toBeVisible();
    await expect(page.locator('.rs-analysis-expanded-content')).toContainText('科学史专家');
    await expect(page.locator('.rs-analysis-expanded-content')).toContainText('艺术爱好者');
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
  }
});

test('two-layer grammar pilot keeps the sentence logic visible and boundary collapsed', async ({ page }) => {
  for (const viewport of [{ width: 1280, height: 800 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await page.goto(readerBaseUrl + '/reader.html');
    await page.waitForFunction(() => typeof renderZlatoustStaticExplanation === 'function');
    await page.evaluate(async () => {
      const [chapter, explanationDocument, mappings] = await Promise.all([
        fetch('/data/textbook/zlatoust_grammar/ch0000.json').then(response => response.json()),
        fetch('/data/textbook/zlatoust_grammar/theory/explanations/gl1/gl1-q001-q013.json').then(response => response.json()),
        fetch('/data/textbook/zlatoust_grammar/theory/mappings/exercise-to-rules.json').then(response => response.json())
      ]);
      const exercise = chapter.exercises.find(item => item.id === 'GL1-Q008');
      const explanation = explanationDocument.explanations.find(item => item.exerciseId === 'GL1-Q008');
      const mapping = mappings.exercises['GL1-Q008'];
      const state = {
        staticExplanationAuthorLabels: { 'GL1-Q008': explanationDocument.authorLabel },
        exerciseToRules: mappings
      };
      curBook = { id: 'zlatoust_grammar' };
      currentQuizData = { id: 'gl1' };
      const pilotRecord = getQuizRecord('GL1-Q008');
      pilotRecord.analysisExpanded = false;
      saveQuizRecord('GL1-Q008', pilotRecord);
      window.__grammarPilot = { exercise, explanation, mapping, state };
      document.body.innerHTML = '<main style="max-width:760px;margin:0 auto;padding:16px">' +
        renderZlatoustStaticExplanation(exercise, explanation, state, exercise.answer, exercise.options.find(item => item.key === exercise.answer), mapping) + '</main>';
    });

    await expect(page.locator('.zlatoust-two-layer-answer')).toContainText('воспитал');
    await expect(page.locator('.zlatoust-two-layer-answer')).toContainText('她培养了');
    await expect(page.locator('.zlatoust-two-layer-skeleton')).toContainText('Татьяна Тарасова воспитала');
    await expect(page.locator('.zlatoust-analysis-expanded')).not.toHaveAttribute('open', '');
    await expect(page.locator('.zlatoust-analysis-expanded .rs-analysis-expanded-content')).not.toBeVisible();
    await page.locator('.zlatoust-analysis-expanded > summary').click();
    await expect(page.locator('.zlatoust-analysis-expanded .rs-analysis-expanded-content')).toBeVisible();
    await expect(page.locator('.zlatoust-analysis-expanded')).toContainText('为什么 А：воспитал 不对');
    await expect(page.locator('.zlatoust-analysis-expanded')).toContainText('известный тренер');
    await expect(page.locator('.zlatoust-two-layer-source')).toContainText('印刷页 91');
    await page.evaluate(() => {
      const { exercise, explanation, state, mapping } = window.__grammarPilot;
      document.querySelector('main').innerHTML = renderZlatoustStaticExplanation(
        exercise, explanation, state, exercise.answer,
        exercise.options.find(item => item.key === exercise.answer), mapping
      );
    });
    await expect(page.locator('.zlatoust-analysis-expanded')).toHaveAttribute('open', '');
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
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

test('reading source locator separates context and core evidence highlights', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(readerBaseUrl + '/reader.html');
  await page.waitForFunction(() => typeof locateReadingSpeakingSource === 'function');

  const counts = await page.evaluate(async () => {
    const chapter = await fetch('/data/textbook/reading_speaking/ch0001.json').then(response => response.json());
    const exercise = { ...chapter.exercises[3], _exId: 'layout-context-q4' };
    _currentRSExercises = [exercise];
    document.body.innerHTML = '<div class="para-block"><p class="rs-source-paragraph" id="rs-source-p-5">' +
      renderRuText(chapter.original[5]) + '</p></div>';
    document.body.insertAdjacentHTML('beforeend', '<div id="toast"></div>');
    locateReadingSpeakingSource('layout-context-q4');
    return {
      context: document.querySelectorAll('.rs-source-context-word-highlight').length,
      core: document.querySelectorAll('.rs-source-word-highlight').length,
      paragraph: document.querySelectorAll('.rs-source-paragraph-highlight').length,
      contextParagraph: document.querySelectorAll('.rs-source-context-highlight').length
    };
  });

  expect(counts.context).toBeGreaterThan(counts.core);
  expect(counts.core).toBeGreaterThan(0);
  expect(counts.paragraph).toBe(1);
  expect(counts.contextParagraph).toBe(1);
});
