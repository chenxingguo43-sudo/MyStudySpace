const { test, expect } = require('@playwright/test');

test.use({ channel: 'chrome' });
const baseUrl = process.env.READER_TEST_BASE_URL || 'http://localhost:3000';

for (const width of [1280, 390]) {
  test(`accepted B2 grammar explanation renders and expands at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto(baseUrl + '/reader.html');
    await page.waitForFunction(() => typeof renderB2GrammarExplanation === 'function');
    const expected = await page.evaluate(async () => {
      const chapter = await fetch('/data/textbook/russian_b2/ch0000.json').then(r => r.json());
      const exercise = chapter.exercises.find(e => e.id === 'P1-Q005');
      curBook = { id: 'russian_b2', chapters: 6, moduleId: 'grammar', isB2Module: true };
      curCh = 0;
      curView = 'reading';
      syncReaderShellState();
      const record = { selected: exercise.answer, submitted: true, explanationOpen: true };
      currentQuizData = chapter;
      currentQuizExercises = chapter.exercises;
      saveQuizRecord(exercise.id, record);
      renderQuizChapter(Object.assign({}, chapter, { exercises: [exercise], knowledgePoints: [] }), 0);
      return { conclusion: exercise.answerAnalysis.conclusion, reason: exercise.answerAnalysis.distractors[0].reason };
    });
    const item = page.locator('[data-question-id="P1-Q005"]');
    await expect(item.locator('.rs-analysis-quick')).toContainText(expected.conclusion);
    await expect(item).toContainText('非教材原文');
    const details = item.locator('.rs-analysis-expanded');
    await expect(details).not.toHaveAttribute('open', '');
    await details.locator('summary').click();
    await expect(details).toHaveAttribute('open', '');
    await expect(details).toContainText(expected.reason);
    await expect.poll(() => page.evaluate(() => getQuizRecord('P1-Q005').analysisExpanded)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await item.locator('.rs-analysis-quick').scrollIntoViewIfNeeded();
    await page.screenshot({ path: `test-results/b2-grammar-generated-${width}.png` });
  });
}

test('unavailable or mismatched B2 generated explanations retain the original fallback', async ({ page }) => {
  await page.goto(baseUrl + '/reader.html');
  await page.waitForFunction(() => typeof renderB2GrammarExplanation === 'function');
  const outputs = await page.evaluate(async () => {
    const chapter = await fetch('/data/textbook/russian_b2/ch0000.json').then(r => r.json());
    const exercise = chapter.exercises.find(e => e.id === 'P1-Q005');
    curBook = { id: 'russian_b2', moduleId: 'grammar', isB2Module: true };
    const absent = renderQuizExplanation(Object.assign({}, exercise, { answerAnalysis: null }));
    const mismatched = JSON.parse(JSON.stringify(exercise));
    mismatched.answerAnalysis.correctOption.key = 'invalid';
    const mismatch = renderQuizExplanation(mismatched);
    return [absent, mismatch];
  });
  for (const html of outputs) {
    expect(html).toContain('原书答案');
    expect(html).not.toContain('rs-analysis-quick');
  }
});
