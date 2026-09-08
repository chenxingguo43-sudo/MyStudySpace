const { test, expect } = require('@playwright/test');

test.use({ channel: 'chrome' });
const baseUrl = process.env.READER_TEST_BASE_URL || 'http://localhost:3000';

test('B2 reading text 1 pilot renders layered explanations and source locator', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(baseUrl + '/reader.html');
  await page.waitForFunction(() => typeof renderReadingPracticeChapter === 'function' && typeof locateB2ReadingSource === 'function');
  await page.evaluate(async () => {
    localStorage.clear();
    const chapter = await fetch('/data/textbook/russian_b2/modules/reading/ch0000.json').then(response => response.json());
    curCh = 0;
    curBook = { id: 'russian_b2', chapters: 10, moduleId: 'reading', isB2Module: true };
    const progress = {};
    chapter.questions.forEach(question => {
      progress[question.id] = { selected: question.answer, answered: true, answerOpen: true, needsClassification: false };
    });
    saveReadingProgress(progress);
    renderReadingPracticeChapter(chapter, 0);
    setB2ReadingLayoutMode('practice');
  });

  await expect(page.locator('[data-question-id="reading-text-01-q02"] .rs-analysis-quick')).toContainText('答案：В');
  await expect(page.locator('[data-question-id="reading-text-01-q03"] .rs-analysis-quick')).toContainText('答案：В');
  await expect(page.locator('[data-question-id="reading-text-01-q02"] .rs-analysis-expanded')).not.toHaveAttribute('open', '');
  await page.locator('[data-question-id="reading-text-01-q02"] .rs-analysis-expanded > summary').click();
  await expect(page.locator('[data-question-id="reading-text-01-q02"] .rs-analysis-expanded-content')).toContainText('为什么不选');
  await expect(page.locator('[data-question-id="reading-text-01-q01"] .b2-option-row.correct')).toContainText('Б.имеют собственный предмет изучения');

  const counts = await page.evaluate(() => {
    locateB2ReadingSource('reading-text-01-q03');
    return {
      core: document.querySelectorAll('.rs-source-word-highlight').length,
      context: document.querySelectorAll('.rs-source-context-word-highlight').length,
      paragraph: document.querySelectorAll('.rs-source-paragraph-highlight').length,
      contextParagraph: document.querySelectorAll('.rs-source-context-highlight').length
    };
  });
  expect(counts.core).toBeGreaterThan(0);
  expect(counts.context).toBeGreaterThan(counts.core);
  expect(counts.paragraph).toBe(1);
  expect(counts.contextParagraph).toBe(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1280);
});

test('B2 reading pilot stays within a phone viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(baseUrl + '/reader.html');
  await page.waitForFunction(() => typeof renderB2ReadingAnalysis === 'function');
  const overflow = await page.evaluate(async () => {
    const chapter = await fetch('/data/textbook/russian_b2/modules/reading/ch0000.json').then(response => response.json());
    document.body.innerHTML = '<main style="max-width:760px;margin:0 auto;padding:16px">' + renderB2ReadingAnalysis(chapter.questions[1]) + '</main>';
    return document.documentElement.scrollWidth;
  });
  expect(overflow).toBeLessThanOrEqual(390);
});

test('B2 reading choices require a second click to submit', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(baseUrl + '/reader.html?two-click-pilot=1');
  await page.waitForFunction(() => typeof renderReadingPracticeChapter === 'function');
  await page.evaluate(async () => {
    localStorage.clear();
    const chapter = await fetch('/data/textbook/russian_b2/modules/reading/ch0000.json').then(response => response.json());
    curCh = 0;
    curBook = { id: 'russian_b2', chapters: 10, moduleId: 'reading', isB2Module: true };
    renderReadingPracticeChapter(chapter, 0);
    setB2ReadingLayoutMode('practice');
  });
  const question = page.locator('[data-question-id="reading-text-01-q02"]');
  const option = question.locator('.b2-option-row').nth(2);
  await option.click();
  await expect(question.locator('.b2-option-row.pending')).toHaveCount(1);
  await expect(question.locator('.b2-quiz-result')).toHaveCount(0);
  await expect(question).not.toContainText('回答正确');
  await option.click();
  await expect(question.locator('.b2-quiz-result')).toContainText('回答正确');
  await expect(question.locator('.b2-option-row.correct')).toHaveCount(1);
});
