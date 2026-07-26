const { test, expect } = require('@playwright/test');

test('Zlatoust knowledge card returns to its own exercise directory', async ({ page }) => {
  await page.goto('http://127.0.0.1:3000/reader.html');

  const dashboard = page.locator('.world-shelf-card', { hasText: 'В мире людей' }).getByRole('button', { name: '打开总仪表盘' });
  await expect(dashboard).toHaveCount(1);
  await dashboard.click();

  await expect(page.getByRole('heading', { name: 'В мире людей', exact: true })).toHaveCount(1);
  await expect(page.locator('.world-module-card')).toHaveCount(4);

  const grammarModule = page.locator('.world-module-card', { hasText: 'В мире людей — 语法词汇' });
  await expect(grammarModule).toHaveCount(1);
  await grammarModule.click();

  const chapters = page.locator('.chapter-grid .ch-item');
  await expect(chapters).toHaveCount(5);
  await chapters.nth(0).click();

  const knowledgeCards = page.locator('button[onclick*="showStudyCard"]');
  await expect(knowledgeCards).not.toHaveCount(0);
  await knowledgeCards.nth(0).click();
  await expect(page.getByText('知识点卡加载失败')).toHaveCount(0);
  await expect(page.locator('.b2-study-card h1')).toHaveCount(1);

  await page.getByRole('button', { name: '返回练习' }).click();
  await expect(page.locator('.b2-quiz-page')).toHaveCount(1);
  await page.getByRole('button', { name: '目录', exact: true }).click();
  await expect(page.locator('.chapter-grid .ch-item')).toHaveCount(5);
});

test('world modules use the transparent four-button navigation', async ({ page }) => {
  await page.goto('http://127.0.0.1:3000/reader.html');
  await page.locator('.world-shelf-card', { hasText: 'В мире людей' }).getByRole('button', { name: '打开总仪表盘' }).click();
  await expect(page.locator('.world-module-card')).toHaveCount(4);
  await page.locator('.world-module-card', { hasText: 'В мире людей — 听力口语' }).click();
  await expect(page.getByText('63 章 · 已读 0 章 · 俄语→中文')).toHaveCount(1);
  await expect(page.locator('.listening-section')).toHaveCount(13);
  await expect(page.locator('.listening-entry')).toHaveCount(63);
  await expect(page.locator('.toolbar')).toHaveCount(0);
  await expect(page.locator('.b2-floating-navigation .fab-btn')).toHaveCount(4);
});

test('Zlatoust 1.4.1 opens as a five-stage integrated learning page', async ({ page }) => {
  await page.goto('http://127.0.0.1:3000/reader.html');
  await page.locator('.world-shelf-card', { hasText: 'В мире людей' }).getByRole('button', { name: '打开总仪表盘' }).click();
  await page.locator('.world-module-card', { hasText: 'В мире людей — 语法词汇' }).click();
  await page.locator('.chapter-grid .ch-item').nth(0).click();

  await expect(page.locator('.zlatoust-theory-nav')).toHaveCount(0);
  await expect(page.locator('.zlatoust-route-map')).toHaveCount(0);

  const aspectCard = page.locator('.b2-knowledge-study-card', { hasText: '§1.4.1' });
  await expect(aspectCard).toHaveCount(1);
  await aspectCard.click();
  expect(await page.evaluate(() => window.zlatoustTheoryState.lastRuleLoadError || '')).toBe('');
  await expect(page.locator('.zlatoust-learning-page')).toHaveCount(1);
  await expect(page.locator('.zlatoust-unit-route')).toHaveCount(1);
  await expect(page.locator('.zlatoust-unit-route-step')).toHaveCount(6);
  const secondReview = page.locator('.zlatoust-stage-review input').nth(1);
  await secondReview.check();
  await expect(page.locator('.zlatoust-unit-route-step').nth(1)).toHaveAttribute('data-stage-status', 'weak');
  await page.locator('.zlatoust-stage-review input').nth(1).uncheck();
  await expect(page.locator('.zlatoust-unit-route-step').nth(1)).toHaveAttribute('data-stage-status', 'unstarted');
  await expect(page.locator('.zlatoust-stage')).toHaveCount(5);
  await expect(page.locator('.zlatoust-unit-map-root')).toHaveCount(1);
  await expect(page.locator('.zlatoust-unit-map-list button')).toHaveCount(5);
  const externalGuide = page.locator('.zlatoust-diagnostic .zlatoust-external-guide');
  await expect(externalGuide).toContainText('中文结论');
  await expect(externalGuide).toContainText('对本知识点有什么帮助');
  await expect(externalGuide).toContainText('适用边界');
  await expect(externalGuide.locator('summary')).toHaveText('来源核验（可选，不影响学习）');
  await expect(page.getByText('Yale Advanced Russian', { exact: false })).toHaveCount(0);
  await expect(page.locator('.zlatoust-original-practice .b2-quiz-item')).toHaveCount(13);
  await expect(page.locator('.zlatoust-stage-source-rule')).toHaveCount(5);
  await expect(page.getByText('信号词的有效条件与失效边界')).toHaveCount(5);
});

test('Zlatoust 1.4.1 shares official answers and keeps formative checks separate', async ({ page }) => {
  await page.goto('http://127.0.0.1:3000/reader.html');
  await page.locator('.world-shelf-card', { hasText: 'В мире людей' }).getByRole('button', { name: '打开总仪表盘' }).click();
  await page.locator('.world-module-card', { hasText: 'В мире людей — 语法词汇' }).click();
  await page.locator('.chapter-grid .ch-item').nth(0).click();
  await page.locator('.b2-knowledge-study-card', { hasText: '§1.4.1' }).click();

  const firstCheck = page.locator('[data-zlatoust-check="fact-check-1"]');
  await firstCheck.locator('.zlatoust-learning-check-option').nth(1).click();
  await expect(firstCheck).toContainText('这次误判在这里');
  await expect(firstCheck).toContainText('回看规则');
  await expect(firstCheck).toContainText('最小对比');

  const official = page.locator('[data-question-id="GL1-Q089"]');
  const correct = official.getByRole('radio', { name: '选择 В' });
  await correct.click();
  await correct.click();
  await expect(official.locator('.b2-result')).toContainText('正确');

  const stored = await page.evaluate(() => ({
    official: JSON.parse(localStorage.getItem('rr_b2_progress_v1'))['zlatoust_grammar:gl1']['GL1-Q089'],
    learning: JSON.parse(localStorage.getItem('rr_zlatoust_learning_v1')).units['1.4.1'].checks['fact-check-1']
  }));
  expect(stored.official.lastResult).toBe('correct');
  expect(stored.learning.correct).toBe(false);
  expect(stored.learning.everWrong).toBe(true);
});

test('Zlatoust learning cards show semantic reasoning across later chapters', async ({ page }) => {
  await page.goto('http://127.0.0.1:3000/reader.html');
  await page.locator('.world-shelf-card', { hasText: 'В мире людей' }).getByRole('button', { name: '打开总仪表盘' }).click();
  await page.locator('.world-module-card', { hasText: 'В мире людей — 语法词汇' }).click();

  const chapters = page.locator('.chapter-grid .ch-item');
  await chapters.nth(3).click();
  await page.locator('.zlatoust-section-card', { hasText: '4.3' }).click();
  await expect(page.locator('summary', { hasText: '语义说明与判断依据' })).toHaveCount(1);
  await expect(page.getByText('两条时间线的关系', { exact: false })).toHaveCount(1);

  await page.getByRole('button', { name: '返回本章练习', exact: true }).click();
  await page.getByRole('button', { name: '目录', exact: true }).click();
  await page.locator('.chapter-grid .ch-item').nth(4).click();
  await page.locator('.zlatoust-section-card', { hasText: '5.2' }).click();
  await expect(page.locator('summary', { hasText: '语义说明与判断依据' })).toHaveCount(1);
  await expect(page.getByText('不同的信息立场', { exact: false })).toHaveCount(1);
});
