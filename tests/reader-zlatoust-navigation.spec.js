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
  await expect(page.locator('.zlatoust-learning-page')).toHaveCount(1);

  await page.getByRole('button', { name: '返回知识点卡片' }).first().click();
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
  await expect(page.locator('.zlatoust-unit-route-step')).toHaveCount(5);
  const secondReview = page.locator('.zlatoust-stage-review input').nth(1);
  await secondReview.check();
  await expect(page.locator('.zlatoust-unit-route-step').nth(1)).toHaveAttribute('data-stage-status', 'weak');
  await page.locator('.zlatoust-stage-review input').nth(1).uncheck();
  await expect(page.locator('.zlatoust-unit-route-step').nth(1)).toHaveAttribute('data-stage-status', 'unstarted');
  await expect(page.locator('.zlatoust-stage')).toHaveCount(5);
  await expect(page.locator('.zlatoust-unit-map-root')).toHaveCount(1);
  await expect(page.locator('.zlatoust-time-gate')).toHaveCount(1);
  await expect(page.locator('.zlatoust-unit-map-list button')).toHaveCount(5);
  await expect(page.locator('.zlatoust-axis-warnings li')).toHaveCount(4);
  const externalGuide = page.locator('.zlatoust-diagnostic .zlatoust-external-guide');
  await expect(externalGuide).toContainText('中文结论');
  await expect(externalGuide).toContainText('对本知识点有什么帮助');
  await expect(externalGuide).toContainText('适用边界');
  await expect(externalGuide.locator('summary')).toHaveText('来源核验（可选，不影响学习）');
  await expect(page.getByText('Yale Advanced Russian', { exact: false })).toHaveCount(0);
  await expect(page.locator('.zlatoust-stage-practice .b2-quiz-item')).toHaveCount(13);
  await expect(page.locator('.zlatoust-transfer-task')).toHaveCount(4);
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

  await page.locator('#stage-fact .zlatoust-stage-practice summary').click();
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

test('Zlatoust 1.5 is a supplementary cross-section review without a second official-record store', async ({ page }) => {
  await page.goto('http://127.0.0.1:3000/reader.html');
  await page.locator('button[onclick="showWorldPeopleDashboard()"]').click();
  await page.locator('.world-module-card', { hasText: '语法词汇' }).click();
  await page.locator('.chapter-grid .ch-item').nth(0).click();
  await page.locator('button[onclick*="gl1-5"]').click();

  await expect(page.locator('.zlatoust-learning-page')).toHaveCount(1);
  await expect(page.getByText('教辅综合页（不计入原书 32 个理论小节）')).toHaveCount(1);
  await expect(page.locator('.zlatoust-unit-route-step')).toHaveCount(4);
  await expect(page.locator('.zlatoust-stage-practice .b2-quiz-item')).toHaveCount(19);

  const formative = page.locator('[data-zlatoust-check="review-past-1"]');
  await formative.locator('.zlatoust-learning-check-option').nth(1).click();
  await expect(formative).toContainText('这次误判在这里');
  await formative.locator('.zlatoust-retry .zlatoust-learning-check-option').nth(1).click();
  await expect(formative.locator('.zlatoust-retry')).toContainText('这次判断正确');

  await page.locator('#stage-past-future .zlatoust-stage-practice summary').click();
  const official = page.locator('[data-question-id="GL1-Q089"]');
  const correct = official.getByRole('radio').nth(0);
  await correct.click();
  await correct.click();
  const stored = await page.evaluate(() => ({
    official: JSON.parse(localStorage.getItem('rr_b2_progress_v1'))['zlatoust_grammar:gl1']['GL1-Q089'],
    learning: JSON.parse(localStorage.getItem('rr_zlatoust_learning_v1')).units['1.5-review']
  }));
  expect(stored.official).toBeTruthy();
  expect(stored.learning.checks['review-past-1'].everWrong).toBe(true);
  expect(stored.learning.retries['review-past-1'].correct).toBe(true);
});

test('Zlatoust 2.1 uses one official record store and keeps object-government practice separate', async ({ page }) => {
  await page.goto('http://127.0.0.1:3000/reader.html');
  await page.locator('button[onclick="showWorldPeopleDashboard()"]').click();
  await page.locator('.world-module-card', { hasText: '语法词汇' }).click();
  await page.locator('.chapter-grid .ch-item').nth(1).click();
  await page.locator('.zlatoust-section-card', { hasText: '2.1' }).click();

  await expect(page.locator('.zlatoust-learning-page')).toHaveCount(1);
  await expect(page.getByText('第 2 章 · 知识点 2.1')).toHaveCount(1);
  await expect(page.locator('.zlatoust-unit-route-step')).toHaveCount(5);
  await expect(page.locator('.zlatoust-stage')).toHaveCount(5);
  await expect(page.locator('.zlatoust-stage-practice .b2-quiz-item')).toHaveCount(22);

  const formative = page.locator('[data-zlatoust-check="gov-gen-1"]');
  await formative.locator('.zlatoust-learning-check-option').filter({ hasText: 'Б' }).click();
  await expect(formative).toContainText('这次误判在这里');
  await expect(formative).toContainText('回看规则');
  await expect(formative).toContainText('最小对比');
  await formative.locator('.zlatoust-retry .zlatoust-learning-check-option').nth(1).click();
  await expect(formative.locator('.zlatoust-retry')).toContainText('这次判断正确');

  await page.locator('#stage-instrumental .zlatoust-stage-practice summary').click();
  const official = page.locator('[data-question-id="GL2-Q001"]');
  await expect(official).toHaveCount(1);
  const correct = official.getByRole('radio').first();
  await correct.click();
  await correct.click();
  const stored = await page.evaluate(() => ({
    official: JSON.parse(localStorage.getItem('rr_b2_progress_v1'))['zlatoust_grammar:gl2']['GL2-Q001'],
    learning: JSON.parse(localStorage.getItem('rr_zlatoust_learning_v1')).units['2.1']
  }));
  expect(stored.official).toBeTruthy();
  expect(stored.learning.checks['gov-gen-1'].everWrong).toBe(true);
  expect(stored.learning.retries['gov-gen-1'].correct).toBe(true);
  expect(stored.learning.checks['GL2-Q001']).toBeUndefined();
});

test('Zlatoust 2.2 opens from its chapter card and keeps source-only practice separate', async ({ page }) => {
  await page.goto('http://127.0.0.1:3000/reader.html');
  await page.locator('button[onclick="showWorldPeopleDashboard()"]').click();
  await page.locator('.world-module-card', { hasText: '语法词汇' }).click();
  await page.locator('.chapter-grid .ch-item').nth(1).click();
  await page.locator('.zlatoust-section-card', { hasText: '2.2' }).click();

  await expect(page.locator('.zlatoust-learning-page')).toHaveCount(1);
  await expect(page.getByText('第 2 章 · 知识点 2.2')).toHaveCount(1);
  await expect(page.locator('.zlatoust-unit-route-step')).toHaveCount(5);
  await expect(page.locator('.zlatoust-stage-practice .b2-quiz-item')).toHaveCount(11);
  const formative = page.locator('[data-zlatoust-check="adj-frame-1"]');
  await formative.locator('.zlatoust-learning-check-option').nth(1).click();
  await expect(formative).toContainText('这次误判在这里');
  await formative.locator('.zlatoust-retry .zlatoust-learning-check-option').first().click();
  await expect(formative.locator('.zlatoust-retry')).toContainText('这次判断正确');
  await expect(page.locator('[data-question-id="GL2-Q028"]')).toHaveCount(0);
  await page.locator('#stage-frames .zlatoust-stage-practice summary').click();
  const official = page.locator('[data-question-id="GL2-Q024"]');
  await official.getByRole('radio').nth(3).click();
  await official.getByRole('radio').nth(3).click();
  const stored = await page.evaluate(() => ({
    official: JSON.parse(localStorage.getItem('rr_b2_progress_v1'))['zlatoust_grammar:gl2']['GL2-Q024'],
    learning: JSON.parse(localStorage.getItem('rr_zlatoust_learning_v1')).units['2.2']
  }));
  expect(stored.official).toBeTruthy();
  expect(stored.learning.checks['adj-frame-1'].everWrong).toBe(true);
  expect(stored.learning.retries['adj-frame-1'].correct).toBe(true);
});

test('Zlatoust 2.2 remains operable at a 390px mobile viewport', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  try {
    await page.goto('http://127.0.0.1:3000/reader.html');
    await page.locator('button[onclick="showWorldPeopleDashboard()"]').click();
    await page.locator('.world-module-card', { hasText: '语法词汇' }).click();
    await page.locator('.chapter-grid .ch-item').nth(1).click();
    await page.locator('.zlatoust-section-card', { hasText: '2.2' }).click();
    const metrics = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth, labels: [...document.querySelectorAll('.zlatoust-stage-review input')].map(i => i.getAttribute('aria-label')) }));
    expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.width);
    expect(new Set(metrics.labels).size).toBe(5);
  } finally { await context.close(); }
});

test('Zlatoust 2.3 opens from its chapter card, separates review/source-only items, and keeps storage contracts', async ({ page }) => {
  await page.goto('http://127.0.0.1:3000/reader.html');
  await page.locator('button[onclick="showWorldPeopleDashboard()"]').click();
  await page.locator('.world-module-card', { hasText: '语法词汇' }).click();
  await page.locator('.chapter-grid .ch-item').nth(1).click();
  await page.locator('.zlatoust-section-card', { hasText: '2.3' }).click();

  await expect(page.locator('.zlatoust-learning-page')).toHaveCount(1);
  await expect(page.getByText('第 2 章 · 知识点 2.3')).toHaveCount(1);
  await expect(page.locator('.zlatoust-unit-route-step')).toHaveCount(5);
  await expect(page.locator('.zlatoust-stage-practice .b2-quiz-item')).toHaveCount(12);
  const formative = page.locator('[data-zlatoust-check="inst-quality-1"]');
  await formative.locator('.zlatoust-learning-check-option').nth(1).click();
  await expect(formative).toContainText('这次误判在这里');
  await formative.locator('.zlatoust-retry .zlatoust-learning-check-option').first().click();
  await expect(formative.locator('.zlatoust-retry')).toContainText('这次判断正确');
  await expect(page.locator('[data-question-id="GL2-Q036"]')).toHaveCount(0);
  await expect(page.locator('[data-question-id="GL2-Q039"]')).toHaveCount(0);
  await page.locator('#stage-quality .zlatoust-stage-practice summary').click();
  const official = page.locator('[data-question-id="GL2-Q041"]');
  await official.getByRole('radio').nth(2).click();
  await official.getByRole('radio').nth(2).click();
  const stored = await page.evaluate(() => ({
    official: JSON.parse(localStorage.getItem('rr_b2_progress_v1'))['zlatoust_grammar:gl2']['GL2-Q041'],
    learning: JSON.parse(localStorage.getItem('rr_zlatoust_learning_v1')).units['2.3']
  }));
  expect(stored.official).toBeTruthy();
  expect(stored.learning.checks['inst-quality-1'].everWrong).toBe(true);
  expect(stored.learning.retries['inst-quality-1'].correct).toBe(true);
});

test('Zlatoust 2.3 remains operable at a 390px mobile viewport', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  try {
    await page.goto('http://127.0.0.1:3000/reader.html');
    await page.locator('button[onclick="showWorldPeopleDashboard()"]').click();
    await page.locator('.world-module-card', { hasText: '语法词汇' }).click();
    await page.locator('.chapter-grid .ch-item').nth(1).click();
    await page.locator('.zlatoust-section-card', { hasText: '2.3' }).click();
    const metrics = await page.evaluate(() => ({
      width: innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      controls: [...document.querySelectorAll('.zlatoust-unit-map button')].map(button => { const box = button.getBoundingClientRect(); return { left: box.left, right: box.right }; }),
      labels: [...document.querySelectorAll('.zlatoust-stage-review input')].map(input => input.getAttribute('aria-label'))
    }));
    expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.width);
    expect(metrics.controls.every(box => box.left >= 0 && box.right <= metrics.width)).toBe(true);
    expect(new Set(metrics.labels).size).toBe(5);
  } finally { await context.close(); }
});

test('Zlatoust 2.4.1 opens from its chapter card and keeps bare-attribute practice separate', async ({ page }) => {
  await page.goto('http://127.0.0.1:3000/reader.html');
  await page.locator('button[onclick="showWorldPeopleDashboard()"]').click();
  await page.locator('.world-module-card', { hasText: '语法词汇' }).click();
  await page.locator('.chapter-grid .ch-item').nth(1).click();
  await page.locator('.zlatoust-section-card', { hasText: '2.4.1' }).click();

  await expect(page.locator('.zlatoust-learning-page')).toHaveCount(1);
  await expect(page.getByText('第 2 章 · 知识点 2.4.1')).toHaveCount(1);
  await expect(page.locator('.zlatoust-unit-route-step')).toHaveCount(5);
  await expect(page.locator('.zlatoust-stage-practice .b2-quiz-item')).toHaveCount(7);
  const formative = page.locator('[data-zlatoust-check="attr-whole-1"]');
  await formative.locator('.zlatoust-learning-check-option').nth(1).click();
  await expect(formative).toContainText('这次误判在这里');
  await formative.locator('.zlatoust-retry .zlatoust-learning-check-option').first().click();
  await expect(formative.locator('.zlatoust-retry')).toContainText('这次判断正确');
  await page.locator('#stage-whole .zlatoust-stage-practice summary').click();
  const official = page.locator('[data-question-id="GL2-Q065"]');
  await official.getByRole('radio').nth(2).click();
  await official.getByRole('radio').nth(2).click();
  const stored = await page.evaluate(() => ({
    official: JSON.parse(localStorage.getItem('rr_b2_progress_v1'))['zlatoust_grammar:gl2']['GL2-Q065'],
    learning: JSON.parse(localStorage.getItem('rr_zlatoust_learning_v1')).units['2.4.1']
  }));
  expect(stored.official).toBeTruthy();
  expect(stored.learning.checks['attr-whole-1'].everWrong).toBe(true);
  expect(stored.learning.retries['attr-whole-1'].correct).toBe(true);
});

test('Zlatoust 2.4.1 remains operable at a 390px mobile viewport', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  try {
    await page.goto('http://127.0.0.1:3000/reader.html');
    await page.locator('button[onclick="showWorldPeopleDashboard()"]').click();
    await page.locator('.world-module-card', { hasText: '语法词汇' }).click();
    await page.locator('.chapter-grid .ch-item').nth(1).click();
    await page.locator('.zlatoust-section-card', { hasText: '2.4.1' }).click();
    const metrics = await page.evaluate(() => ({
      width: innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      controls: [...document.querySelectorAll('.zlatoust-unit-map button')].map(button => { const box = button.getBoundingClientRect(); return { left: box.left, right: box.right }; }),
      labels: [...document.querySelectorAll('.zlatoust-stage-review input')].map(input => input.getAttribute('aria-label'))
    }));
    expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.width);
    expect(metrics.controls.every(box => box.left >= 0 && box.right <= metrics.width)).toBe(true);
    expect(new Set(metrics.labels).size).toBe(5);
  } finally { await context.close(); }
});

test('Zlatoust 2.4.2 opens from its chapter card and excludes its needs-review formal item', async ({ page }) => {
  await page.goto('http://127.0.0.1:3000/reader.html');
  await page.locator('button[onclick="showWorldPeopleDashboard()"]').click();
  await page.locator('.world-module-card', { hasText: '语法词汇' }).click();
  await page.locator('.chapter-grid .ch-item').nth(1).click();
  await page.locator('.zlatoust-section-card', { hasText: '2.4.2' }).click();
  await expect(page.locator('.zlatoust-learning-page')).toHaveCount(1);
  await expect(page.getByText('第 2 章 · 知识点 2.4.2')).toHaveCount(1);
  await expect(page.locator('.zlatoust-stage-practice .b2-quiz-item')).toHaveCount(15);
  const formative = page.locator('[data-zlatoust-check="prep-inf-1"]');
  await formative.locator('.zlatoust-learning-check-option').nth(1).click();
  await expect(formative).toContainText('这次误判在这里');
  await formative.locator('.zlatoust-retry .zlatoust-learning-check-option').first().click();
  await expect(formative.locator('.zlatoust-retry')).toContainText('这次判断正确');
  await expect(page.locator('[data-question-id="GL2-Q062"]')).toHaveCount(0);
  await page.locator('#stage-material .zlatoust-stage-practice summary').click();
  const official = page.locator('[data-question-id="GL2-Q050"]');
  await official.getByRole('radio').nth(3).click();
  await official.getByRole('radio').nth(3).click();
  const stored = await page.evaluate(() => ({ official: JSON.parse(localStorage.getItem('rr_b2_progress_v1'))['zlatoust_grammar:gl2']['GL2-Q050'], learning: JSON.parse(localStorage.getItem('rr_zlatoust_learning_v1')).units['2.4.2'] }));
  expect(stored.official).toBeTruthy();
  expect(stored.learning.checks['prep-inf-1'].everWrong).toBe(true);
  expect(stored.learning.retries['prep-inf-1'].correct).toBe(true);
});

test('Zlatoust 2.4.2 remains operable at a 390px mobile viewport', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  try {
    await page.goto('http://127.0.0.1:3000/reader.html');
    await page.locator('button[onclick="showWorldPeopleDashboard()"]').click();
    await page.locator('.world-module-card', { hasText: '语法词汇' }).click();
    await page.locator('.chapter-grid .ch-item').nth(1).click();
    await page.locator('.zlatoust-section-card', { hasText: '2.4.2' }).click();
    const metrics = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth, labels: [...document.querySelectorAll('.zlatoust-stage-review input')].map(input => input.getAttribute('aria-label')) }));
    expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.width);
    expect(new Set(metrics.labels).size).toBe(5);
  } finally { await context.close(); }
});

test('Zlatoust 2.4 opens its relationship-routing overview and preserves source boundaries', async ({ page }) => {
  await page.goto('http://127.0.0.1:3000/reader.html');
  await page.locator('button[onclick="showWorldPeopleDashboard()"]').click();
  await page.locator('.world-module-card', { hasText: '语法词汇' }).click();
  await page.locator('.chapter-grid .ch-item').nth(1).click();
  await page.locator('.zlatoust-section-card', { hasText: '2.4' }).first().click();
  await expect(page.locator('.zlatoust-learning-page')).toHaveCount(1);
  await expect(page.getByText('第 2 章 · 知识点 2.4')).toHaveCount(1);
  await expect(page.locator('.zlatoust-unit-route-step')).toHaveCount(5);
  await expect(page.locator('.zlatoust-stage-practice .b2-quiz-item')).toHaveCount(21);
  const formative = page.locator('[data-zlatoust-check="overview-bare-1"]');
  await formative.locator('.zlatoust-learning-check-option').nth(1).click();
  await expect(formative).toContainText('这次误判在这里');
  await formative.locator('.zlatoust-retry .zlatoust-learning-check-option').first().click();
  await expect(formative.locator('.zlatoust-retry')).toContainText('这次判断正确');
  await expect(page.locator('[data-question-id="GL2-Q062"]')).toHaveCount(0);
  await page.locator('#stage-bare .zlatoust-stage-practice summary').click();
  const official = page.locator('[data-question-id="GL2-Q065"]');
  await official.getByRole('radio').nth(2).click();
  await official.getByRole('radio').nth(2).click();
  const stored = await page.evaluate(() => ({ official: JSON.parse(localStorage.getItem('rr_b2_progress_v1'))['zlatoust_grammar:gl2']['GL2-Q065'], learning: JSON.parse(localStorage.getItem('rr_zlatoust_learning_v1')).units['2.4'] }));
  expect(stored.official).toBeTruthy();
  expect(stored.learning.checks['overview-bare-1'].everWrong).toBe(true);
  expect(stored.learning.retries['overview-bare-1'].correct).toBe(true);
});

test('Zlatoust 2.4 remains operable at a 390px mobile viewport', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  try {
    await page.goto('http://127.0.0.1:3000/reader.html');
    await page.locator('button[onclick="showWorldPeopleDashboard()"]').click();
    await page.locator('.world-module-card', { hasText: '语法词汇' }).click();
    await page.locator('.chapter-grid .ch-item').nth(1).click();
    await page.locator('.zlatoust-section-card', { hasText: '2.4' }).first().click();
    const metrics = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth, labels: [...document.querySelectorAll('.zlatoust-stage-review input')].map(input => input.getAttribute('aria-label')) }));
    expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.width);
    expect(new Set(metrics.labels).size).toBe(5);
  } finally { await context.close(); }
});

test('Zlatoust 2.5 opens its time-relation teaching page and keeps excluded formal items out', async ({ page }) => {
  await page.goto('http://127.0.0.1:3000/reader.html');
  await page.locator('button[onclick="showWorldPeopleDashboard()"]').click();
  await page.locator('.world-module-card', { hasText: '语法词汇' }).click();
  await page.locator('.chapter-grid .ch-item').nth(1).click();
  await page.locator('.zlatoust-section-card', { hasText: '2.5' }).click();
  await expect(page.locator('.zlatoust-learning-page')).toHaveCount(1);
  await expect(page.getByText('第 2 章 · 知识点 2.5')).toHaveCount(1);
  await expect(page.locator('.zlatoust-unit-route-step')).toHaveCount(5);
  await expect(page.locator('.zlatoust-stage-practice .b2-quiz-item')).toHaveCount(24);
  const formative = page.locator('[data-zlatoust-check="time-duration-1"]');
  await formative.locator('.zlatoust-learning-check-option').nth(1).click();
  await expect(formative).toContainText('这次误判在这里');
  await formative.locator('.zlatoust-retry .zlatoust-learning-check-option').first().click();
  await expect(formative.locator('.zlatoust-retry')).toContainText('这次判断正确');
  await expect(page.locator('[data-question-id="GL2-Q070"]')).toHaveCount(0);
  await expect(page.locator('[data-question-id="GL2-Q089"]')).toHaveCount(0);
  await expect(page.locator('[data-question-id="GL2-Q137"]')).toHaveCount(0);
  await page.locator('#stage-duration .zlatoust-stage-practice summary').click();
  const official = page.locator('[data-question-id="GL2-Q075"]');
  await official.getByRole('radio').first().click();
  await official.getByRole('radio').first().click();
  const stored = await page.evaluate(() => ({
    official: JSON.parse(localStorage.getItem('rr_b2_progress_v1'))['zlatoust_grammar:gl2']['GL2-Q075'],
    learning: JSON.parse(localStorage.getItem('rr_zlatoust_learning_v1')).units['2.5']
  }));
  expect(stored.official).toBeTruthy();
  expect(stored.learning.checks['time-duration-1'].everWrong).toBe(true);
  expect(stored.learning.retries['time-duration-1'].correct).toBe(true);
});

test('Zlatoust 2.5 remains operable at a 390px mobile viewport', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  try {
    await page.goto('http://127.0.0.1:3000/reader.html');
    await page.locator('button[onclick="showWorldPeopleDashboard()"]').click();
    await page.locator('.world-module-card', { hasText: '语法词汇' }).click();
    await page.locator('.chapter-grid .ch-item').nth(1).click();
    await page.locator('.zlatoust-section-card', { hasText: '2.5' }).click();
    const metrics = await page.evaluate(() => ({
      width: innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      controls: [...document.querySelectorAll('.zlatoust-unit-map button')].map(button => { const box = button.getBoundingClientRect(); return { left: box.left, right: box.right }; }),
      labels: [...document.querySelectorAll('.zlatoust-stage-review input')].map(input => input.getAttribute('aria-label'))
    }));
    expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.width);
    expect(metrics.controls.every(box => box.left >= 0 && box.right <= metrics.width)).toBe(true);
    expect(new Set(metrics.labels).size).toBe(5);
  } finally { await context.close(); }
});

test('Zlatoust 2.6 opens its spatial-question page and keeps source-only depth practice out', async ({ page }) => {
  await page.goto('http://127.0.0.1:3000/reader.html');
  await page.locator('button[onclick="showWorldPeopleDashboard()"]').click();
  await page.locator('.world-module-card', { hasText: '语法词汇' }).click();
  await page.locator('.chapter-grid .ch-item').nth(1).click();
  await page.locator('.zlatoust-section-card', { hasText: '2.6' }).click();
  await expect(page.locator('.zlatoust-learning-page')).toHaveCount(1);
  await expect(page.getByText('第 2 章 · 知识点 2.6')).toHaveCount(1);
  await expect(page.locator('.zlatoust-unit-route-step')).toHaveCount(5);
  await expect(page.locator('.zlatoust-stage-practice .b2-quiz-item')).toHaveCount(17);
  const formative = page.locator('[data-zlatoust-check="space-gate-1"]');
  await formative.locator('.zlatoust-learning-check-option').nth(1).click();
  await expect(formative).toContainText('这次误判在这里');
  await formative.locator('.zlatoust-retry .zlatoust-learning-check-option').first().click();
  await expect(formative.locator('.zlatoust-retry')).toContainText('这次判断正确');
  await expect(page.locator('[data-question-id="GL2-Q099"]')).toHaveCount(0);
  await page.locator('#stage-shape .zlatoust-stage-practice summary').click();
  const official = page.locator('[data-question-id="GL2-Q094"]');
  await official.getByRole('radio').first().click();
  await official.getByRole('radio').first().click();
  const stored = await page.evaluate(() => ({
    official: JSON.parse(localStorage.getItem('rr_b2_progress_v1'))['zlatoust_grammar:gl2']['GL2-Q094'],
    learning: JSON.parse(localStorage.getItem('rr_zlatoust_learning_v1')).units['2.6']
  }));
  expect(stored.official).toBeTruthy();
  expect(stored.learning.checks['space-gate-1'].everWrong).toBe(true);
  expect(stored.learning.retries['space-gate-1'].correct).toBe(true);
});

test('Zlatoust 2.6 remains operable at a 390px mobile viewport', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  try {
    await page.goto('http://127.0.0.1:3000/reader.html');
    await page.locator('button[onclick="showWorldPeopleDashboard()"]').click();
    await page.locator('.world-module-card', { hasText: '语法词汇' }).click();
    await page.locator('.chapter-grid .ch-item').nth(1).click();
    await page.locator('.zlatoust-section-card', { hasText: '2.6' }).click();
    const metrics = await page.evaluate(() => ({
      width: innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      controls: [...document.querySelectorAll('.zlatoust-unit-map button')].map(button => { const box = button.getBoundingClientRect(); return { left: box.left, right: box.right }; }),
      labels: [...document.querySelectorAll('.zlatoust-stage-review input')].map(input => input.getAttribute('aria-label'))
    }));
    expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.width);
    expect(metrics.controls.every(box => box.left >= 0 && box.right <= metrics.width)).toBe(true);
    expect(new Set(metrics.labels).size).toBe(5);
  } finally { await context.close(); }
});

test('Zlatoust 2.7 opens its causal-nature page and preserves formal progress', async ({ page }) => {
  await page.goto('http://127.0.0.1:3000/reader.html');
  await page.locator('button[onclick="showWorldPeopleDashboard()"]').click();
  await page.locator('.world-module-card', { hasText: '语法词汇' }).click();
  await page.locator('.chapter-grid .ch-item').nth(1).click();
  await page.locator('.zlatoust-section-card', { hasText: '2.7' }).click();
  await expect(page.locator('.zlatoust-learning-page')).toHaveCount(1);
  await expect(page.getByText('第 2 章 · 知识点 2.7')).toHaveCount(1);
  await expect(page.locator('.zlatoust-unit-route-step')).toHaveCount(5);
  await expect(page.locator('.zlatoust-stage-practice .b2-quiz-item')).toHaveCount(15);
  const formative = page.locator('[data-zlatoust-check="cause-valence-1"]');
  await formative.locator('.zlatoust-learning-check-option').nth(1).click();
  await expect(formative).toContainText('这次误判在这里');
  await formative.locator('.zlatoust-retry .zlatoust-learning-check-option').first().click();
  await expect(formative.locator('.zlatoust-retry')).toContainText('这次判断正确');
  await page.locator('#stage-valence .zlatoust-stage-practice summary').click();
  const official = page.locator('[data-question-id="GL2-Q112"]');
  await official.getByRole('radio').first().click();
  await official.getByRole('radio').first().click();
  const stored = await page.evaluate(() => ({ official: JSON.parse(localStorage.getItem('rr_b2_progress_v1'))['zlatoust_grammar:gl2']['GL2-Q112'], learning: JSON.parse(localStorage.getItem('rr_zlatoust_learning_v1')).units['2.7'] }));
  expect(stored.official).toBeTruthy();
  expect(stored.learning.checks['cause-valence-1'].everWrong).toBe(true);
  expect(stored.learning.retries['cause-valence-1'].correct).toBe(true);
});

test('Zlatoust 2.7 remains operable at a 390px mobile viewport', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  try {
    await page.goto('http://127.0.0.1:3000/reader.html');
    await page.locator('button[onclick="showWorldPeopleDashboard()"]').click();
    await page.locator('.world-module-card', { hasText: '语法词汇' }).click();
    await page.locator('.chapter-grid .ch-item').nth(1).click();
    await page.locator('.zlatoust-section-card', { hasText: '2.7' }).click();
    await expect(page.locator('.zlatoust-learning-page')).toHaveCount(1);
    const metrics = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth, controls: [...document.querySelectorAll('.zlatoust-unit-map button')].map(button => { const box = button.getBoundingClientRect(); return { left: box.left, right: box.right }; }), labels: [...document.querySelectorAll('.zlatoust-stage-review input')].map(input => input.getAttribute('aria-label')) }));
    expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.width);
    expect(metrics.controls.every(box => box.left >= 0 && box.right <= metrics.width)).toBe(true);
    expect(new Set(metrics.labels).size).toBe(5);
  } finally { await context.close(); }
});

test('Zlatoust 2.8 opens its purpose-and-evidence page and excludes needs-review formal items', async ({ page }) => {
  await page.goto('http://127.0.0.1:3000/reader.html');
  await page.locator('button[onclick="showWorldPeopleDashboard()"]').click();
  await page.locator('.world-module-card', { hasText: '语法词汇' }).click();
  await page.locator('.chapter-grid .ch-item').nth(1).click();
  await page.locator('.zlatoust-section-card', { hasText: '2.8' }).click();
  await expect(page.locator('.zlatoust-learning-page')).toHaveCount(1);
  await expect(page.getByText('第 2 章 · 知识点 2.8')).toHaveCount(1);
  await expect(page.locator('.zlatoust-unit-route-step')).toHaveCount(5);
  await expect(page.locator('.zlatoust-stage-practice .b2-quiz-item')).toHaveCount(4);
  const formative = page.locator('[data-zlatoust-check="goal-dlya-1"]');
  await formative.locator('.zlatoust-learning-check-option').nth(1).click();
  await expect(formative).toContainText('这次误判在这里');
  await formative.locator('.zlatoust-retry .zlatoust-learning-check-option').first().click();
  await expect(formative.locator('.zlatoust-retry')).toContainText('这次判断正确');
  await expect(page.locator('[data-question-id="GL2-Q124"]')).toHaveCount(0);
  await expect(page.locator('[data-question-id="GL2-Q136"]')).toHaveCount(0);
  await page.locator('#stage-dlya .zlatoust-stage-practice summary').click();
  const official = page.locator('[data-question-id="GL2-Q123"]');
  await official.getByRole('radio').first().click();
  await official.getByRole('radio').first().click();
  const stored = await page.evaluate(() => ({ official: JSON.parse(localStorage.getItem('rr_b2_progress_v1'))['zlatoust_grammar:gl2']['GL2-Q123'], learning: JSON.parse(localStorage.getItem('rr_zlatoust_learning_v1')).units['2.8'] }));
  expect(stored.official).toBeTruthy();
  expect(stored.learning.checks['goal-dlya-1'].everWrong).toBe(true);
  expect(stored.learning.retries['goal-dlya-1'].correct).toBe(true);
});

test('Zlatoust 2.8 remains operable at a 390px mobile viewport', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  try {
    await page.goto('http://127.0.0.1:3000/reader.html');
    await page.locator('button[onclick="showWorldPeopleDashboard()"]').click();
    await page.locator('.world-module-card', { hasText: '语法词汇' }).click();
    await page.locator('.chapter-grid .ch-item').nth(1).click();
    await page.locator('.zlatoust-section-card', { hasText: '2.8' }).click();
    const metrics = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth, controls: [...document.querySelectorAll('.zlatoust-unit-map button')].map(button => { const box = button.getBoundingClientRect(); return { left: box.left, right: box.right }; }), labels: [...document.querySelectorAll('.zlatoust-stage-review input')].map(input => input.getAttribute('aria-label')) }));
    expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.width);
    expect(metrics.controls.every(box => box.left >= 0 && box.right <= metrics.width)).toBe(true);
    expect(new Set(metrics.labels).size).toBe(5);
  } finally { await context.close(); }
});

test('Zlatoust 3.1 opens its gerund subject-routing page and keeps Q039 outside formal practice', async ({ page }) => {
  await page.goto('http://127.0.0.1:3000/reader.html');
  await page.locator('button[onclick="showWorldPeopleDashboard()"]').click();
  await page.locator('.world-module-card', { hasText: '语法词汇' }).click();
  await page.locator('.chapter-grid .ch-item').nth(2).click();
  await page.locator('.zlatoust-section-card', { hasText: '3.1' }).first().click();

  await expect(page.locator('.zlatoust-learning-page')).toHaveCount(1);
  await expect(page.locator('.zlatoust-unit-route-step')).toHaveCount(5);
  await expect(page.locator('.zlatoust-stage')).toHaveCount(5);
  await expect(page.locator('.zlatoust-stage-practice .b2-quiz-item')).toHaveCount(35);
  await expect(page.locator('[data-question-id="GL3-Q039"]')).toHaveCount(0);

  const formative = page.locator('[data-zlatoust-check="gerund-subject-1"]');
  await formative.locator('.zlatoust-learning-check-option').nth(1).click();
  await expect(formative).toContainText('这次误判在这里');
  await expect(formative).toContainText('回看规则');
  await formative.locator('.zlatoust-retry .zlatoust-learning-check-option').first().click();
  await expect(formative.locator('.zlatoust-retry')).toContainText('这次判断正确');

  await page.locator('#stage-personal .zlatoust-stage-practice summary').click();
  const official = page.locator('[data-question-id="GL3-Q040"]');
  await official.getByRole('radio').nth(1).click();
  await official.getByRole('radio').nth(1).click();
  const stored = await page.evaluate(() => ({
    official: JSON.parse(localStorage.getItem('rr_b2_progress_v1'))['zlatoust_grammar:gl3']['GL3-Q040'],
    learning: JSON.parse(localStorage.getItem('rr_zlatoust_learning_v1')).units['3.1']
  }));
  expect(stored.official).toBeTruthy();
  expect(stored.learning.checks['gerund-subject-1'].everWrong).toBe(true);
  expect(stored.learning.retries['gerund-subject-1'].correct).toBe(true);
  expect(stored.learning.checks['GL3-Q040']).toBeUndefined();
});

test('Zlatoust 3.1 remains operable at a 390px mobile viewport', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  try {
    await page.goto('http://127.0.0.1:3000/reader.html');
    await page.locator('button[onclick="showWorldPeopleDashboard()"]').click();
    await page.locator('.world-module-card', { hasText: '语法词汇' }).click();
    await page.locator('.chapter-grid .ch-item').nth(2).click();
    await page.locator('.zlatoust-section-card', { hasText: '3.1' }).first().click();
    await expect(page.locator('.zlatoust-learning-page')).toHaveCount(1);
    const metrics = await page.evaluate(() => ({
      width: innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      controls: [...document.querySelectorAll('.zlatoust-unit-map button')].map(button => {
        const box = button.getBoundingClientRect();
        return { left: box.left, right: box.right };
      }),
      labels: [...document.querySelectorAll('.zlatoust-stage-review input')].map(input => input.getAttribute('aria-label'))
    }));
    expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.width);
    expect(metrics.controls.every(box => box.left >= 0 && box.right <= metrics.width)).toBe(true);
    expect(new Set(metrics.labels).size).toBe(5);
  } finally { await context.close(); }
});

test('Zlatoust 3.1.1 opens its allowed-gerund page and reuses mapped official progress', async ({ page }) => {
  await page.goto('http://127.0.0.1:3000/reader.html');
  await page.locator('button[onclick="showWorldPeopleDashboard()"]').click();
  await page.locator('.world-module-card', { hasText: '语法词汇' }).click();
  await page.locator('.chapter-grid .ch-item').nth(2).click();
  await page.locator('.zlatoust-section-card', { hasText: '3.1.1' }).click();

  await expect(page.locator('.zlatoust-learning-page')).toHaveCount(1);
  await expect(page.locator('.zlatoust-unit-route-step')).toHaveCount(5);
  await expect(page.locator('.zlatoust-stage-practice .b2-quiz-item')).toHaveCount(35);
  await expect(page.locator('[data-question-id="GL3-Q039"]')).toHaveCount(0);
  const formative = page.locator('[data-zlatoust-check="allowed-explicit-1"]');
  await formative.locator('.zlatoust-learning-check-option').nth(1).click();
  await expect(formative).toContainText('这次误判在这里');
  await formative.locator('.zlatoust-retry .zlatoust-learning-check-option').first().click();
  await expect(formative.locator('.zlatoust-retry')).toContainText('这次判断正确');

  await page.locator('#stage-explicit .zlatoust-stage-practice summary').click();
  const official = page.locator('[data-question-id="GL3-Q040"]');
  await official.getByRole('radio').nth(1).click();
  await official.getByRole('radio').nth(1).click();
  const stored = await page.evaluate(() => ({
    official: JSON.parse(localStorage.getItem('rr_b2_progress_v1'))['zlatoust_grammar:gl3']['GL3-Q040'],
    learning: JSON.parse(localStorage.getItem('rr_zlatoust_learning_v1')).units['3.1.1']
  }));
  expect(stored.official).toBeTruthy();
  expect(stored.learning.checks['allowed-explicit-1'].everWrong).toBe(true);
  expect(stored.learning.retries['allowed-explicit-1'].correct).toBe(true);
});

test('Zlatoust 3.1.2 keeps its prohibition page formative-only and exposes Q039 as review evidence', async ({ page }) => {
  await page.goto('http://127.0.0.1:3000/reader.html');
  await page.locator('button[onclick="showWorldPeopleDashboard()"]').click();
  await page.locator('.world-module-card', { hasText: '语法词汇' }).click();
  await page.locator('.chapter-grid .ch-item').nth(2).click();
  await page.locator('.zlatoust-section-card', { hasText: '3.1.2' }).click();

  await expect(page.locator('.zlatoust-learning-page')).toHaveCount(1);
  await expect(page.locator('.zlatoust-unit-route-step')).toHaveCount(5);
  await expect(page.locator('.zlatoust-stage-practice .b2-quiz-item')).toHaveCount(0);
  await expect(page.getByText('GL3-Q039').first()).toBeVisible();
  await expect(page.locator('.zlatoust-learning-hero')).toContainText('来源状态 待复核');
  const formative = page.locator('[data-zlatoust-check="forbidden-two-subjects-1"]');
  await formative.locator('.zlatoust-learning-check-option').nth(1).click();
  await expect(formative).toContainText('这次误判在这里');
  await formative.locator('.zlatoust-retry .zlatoust-learning-check-option').first().click();
  await expect(formative.locator('.zlatoust-retry')).toContainText('这次判断正确');
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('rr_zlatoust_learning_v1')).units['3.1.2']);
  expect(stored.checks['forbidden-two-subjects-1'].everWrong).toBe(true);
  expect(stored.retries['forbidden-two-subjects-1'].correct).toBe(true);
});

test('Zlatoust 3.1.1 remains operable at a 390px mobile viewport', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  try {
    await page.goto('http://127.0.0.1:3000/reader.html');
    await page.locator('button[onclick="showWorldPeopleDashboard()"]').click();
    await page.locator('.world-module-card', { hasText: '语法词汇' }).click();
    await page.locator('.chapter-grid .ch-item').nth(2).click();
    await page.locator('.zlatoust-section-card', { hasText: '3.1.1' }).click();
    await expect(page.locator('.zlatoust-learning-page')).toHaveCount(1);
    const metrics = await page.evaluate(() => ({
      width: innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      controls: [...document.querySelectorAll('.zlatoust-unit-map button')].map(button => {
        const box = button.getBoundingClientRect();
        return { left: box.left, right: box.right };
      }),
      labels: [...document.querySelectorAll('.zlatoust-stage-review input')].map(input => input.getAttribute('aria-label'))
    }));
    expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.width);
    expect(metrics.controls.every(box => box.left >= 0 && box.right <= metrics.width)).toBe(true);
    expect(new Set(metrics.labels).size).toBe(5);
  } finally { await context.close(); }
});

test('Zlatoust 3.1.2 remains operable at a 390px mobile viewport', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  try {
    await page.goto('http://127.0.0.1:3000/reader.html');
    await page.locator('button[onclick="showWorldPeopleDashboard()"]').click();
    await page.locator('.world-module-card', { hasText: '语法词汇' }).click();
    await page.locator('.chapter-grid .ch-item').nth(2).click();
    await page.locator('.zlatoust-section-card', { hasText: '3.1.2' }).click();
    await expect(page.locator('.zlatoust-learning-page')).toHaveCount(1);
    const metrics = await page.evaluate(() => ({
      width: innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      controls: [...document.querySelectorAll('.zlatoust-unit-map button')].map(button => {
        const box = button.getBoundingClientRect();
        return { left: box.left, right: box.right };
      }),
      labels: [...document.querySelectorAll('.zlatoust-stage-review input')].map(input => input.getAttribute('aria-label'))
    }));
    expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.width);
    expect(metrics.controls.every(box => box.left >= 0 && box.right <= metrics.width)).toBe(true);
    expect(new Set(metrics.labels).size).toBe(5);
  } finally { await context.close(); }
});

test('Zlatoust 4.1 opens its clause-relation page and isolates formative storage', async ({ page }) => {
  await page.goto('http://127.0.0.1:3000/reader.html');
  await page.locator('button[onclick="showWorldPeopleDashboard()"]').click();
  await page.locator('.world-module-card', { hasText: '语法词汇' }).click();
  await page.locator('.chapter-grid .ch-item').nth(3).click();
  await page.locator('.zlatoust-section-card', { hasText: '4.1' }).click();

  await expect(page.locator('.zlatoust-learning-page')).toHaveCount(1);
  await expect(page.locator('.zlatoust-unit-route-step')).toHaveCount(5);
  await expect(page.locator('.zlatoust-stage')).toHaveCount(5);
  await expect(page.locator('.zlatoust-stage-practice .b2-quiz-item')).toHaveCount(24);
  await expect(page.locator('.zlatoust-unit-map-axes .zlatoust-time-gate')).toHaveCount(1);

  const formative = page.locator('[data-zlatoust-check="conjunction-link-1"]');
  await formative.locator('.zlatoust-learning-check-option').nth(1).click();
  await expect(formative).toContainText('这次误判在这里');
  await formative.locator('.zlatoust-retry .zlatoust-learning-check-option').first().click();
  await expect(formative.locator('.zlatoust-retry')).toContainText('这次判断正确');

  await page.locator('#stage-link .zlatoust-stage-practice summary').click();
  const official = page.locator('[data-question-id="GL4-Q001"]');
  await official.getByRole('radio').first().click();
  await official.getByRole('radio').first().click();
  const stored = await page.evaluate(() => ({
    official: JSON.parse(localStorage.getItem('rr_b2_progress_v1'))['zlatoust_grammar:gl4']['GL4-Q001'],
    learning: JSON.parse(localStorage.getItem('rr_zlatoust_learning_v1')).units['4.1']
  }));
  expect(stored.official).toBeTruthy();
  expect(stored.learning.checks['conjunction-link-1'].everWrong).toBe(true);
  expect(stored.learning.retries['conjunction-link-1'].correct).toBe(true);
  expect(stored.learning.checks['GL4-Q001']).toBeUndefined();
});

test('Zlatoust 4.1 remains operable at a 390px mobile viewport', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  try {
    await page.goto('http://127.0.0.1:3000/reader.html');
    await page.locator('button[onclick="showWorldPeopleDashboard()"]').click();
    await page.locator('.world-module-card', { hasText: '语法词汇' }).click();
    await page.locator('.chapter-grid .ch-item').nth(3).click();
    await page.locator('.zlatoust-section-card', { hasText: '4.1' }).click();
    await expect(page.locator('.zlatoust-learning-page')).toHaveCount(1);
    const metrics = await page.evaluate(() => ({
      width: innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      controls: [...document.querySelectorAll('.zlatoust-unit-map button')].map(button => {
        const box = button.getBoundingClientRect();
        return { left: box.left, right: box.right };
      }),
      labels: [...document.querySelectorAll('.zlatoust-stage-review input')].map(input => input.getAttribute('aria-label'))
    }));
    expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.width);
    expect(metrics.controls.every(box => box.left >= 0 && box.right <= metrics.width)).toBe(true);
    expect(new Set(metrics.labels).size).toBe(5);
  } finally { await context.close(); }
});

test('Zlatoust 4.2 opens its relative-word page and keeps formal progress separate', async ({ page }) => {
  await page.goto('http://127.0.0.1:3000/reader.html');
  await page.locator('button[onclick="showWorldPeopleDashboard()"]').click();
  await page.locator('.world-module-card', { hasText: '语法词汇' }).click();
  await page.locator('.chapter-grid .ch-item').nth(3).click();
  await page.locator('.zlatoust-section-card', { hasText: '4.2' }).click();

  await expect(page.locator('.zlatoust-learning-page')).toHaveCount(1);
  await expect(page.locator('.zlatoust-stage')).toHaveCount(5);
  await expect(page.locator('.zlatoust-stage-practice .b2-quiz-item')).toHaveCount(13);
  const formative = page.locator('[data-zlatoust-check="relative-route-1"]');
  await formative.locator('.zlatoust-learning-check-option').nth(1).click();
  await expect(formative).toContainText('这次误判在这里');
  await formative.locator('.zlatoust-retry .zlatoust-learning-check-option').first().click();
  await expect(formative.locator('.zlatoust-retry')).toContainText('这次判断正确');

  await page.locator('#stage-route .zlatoust-stage-practice summary').click();
  const official = page.locator('[data-question-id="GL4-Q038"]');
  await official.getByRole('radio').first().click();
  await official.getByRole('radio').first().click();
  const stored = await page.evaluate(() => ({
    official: JSON.parse(localStorage.getItem('rr_b2_progress_v1'))['zlatoust_grammar:gl4']['GL4-Q038'],
    learning: JSON.parse(localStorage.getItem('rr_zlatoust_learning_v1')).units['4.2']
  }));
  expect(stored.official).toBeTruthy();
  expect(stored.learning.checks['relative-route-1'].everWrong).toBe(true);
  expect(stored.learning.retries['relative-route-1'].correct).toBe(true);
  expect(stored.learning.checks['GL4-Q038']).toBeUndefined();
});

test('Zlatoust 4.2 remains operable at a 390px mobile viewport', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  try {
    await page.goto('http://127.0.0.1:3000/reader.html');
    await page.locator('button[onclick="showWorldPeopleDashboard()"]').click();
    await page.locator('.world-module-card', { hasText: '语法词汇' }).click();
    await page.locator('.chapter-grid .ch-item').nth(3).click();
    await page.locator('.zlatoust-section-card', { hasText: '4.2' }).click();
    await expect(page.locator('.zlatoust-learning-page')).toHaveCount(1);
    const metrics = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth, controls: [...document.querySelectorAll('.zlatoust-unit-map button')].map(button => { const box = button.getBoundingClientRect(); return { left: box.left, right: box.right }; }), labels: [...document.querySelectorAll('.zlatoust-stage-review input')].map(input => input.getAttribute('aria-label')) }));
    expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.width);
    expect(metrics.controls.every(box => box.left >= 0 && box.right <= metrics.width)).toBe(true);
    expect(new Set(metrics.labels).size).toBe(5);
  } finally { await context.close(); }
});

test('Zlatoust 4.3 and 4.4 preserve formal-practice boundaries', async ({ page }) => {
  await page.goto('http://127.0.0.1:3000/reader.html');
  await page.locator('button[onclick="showWorldPeopleDashboard()"]').click();
  await page.locator('.world-module-card', { hasText: '语法词汇' }).click();
  await page.locator('.chapter-grid .ch-item').nth(3).click();
  await page.locator('.zlatoust-section-card', { hasText: '4.3' }).click();
  await expect(page.locator('.zlatoust-learning-page')).toHaveCount(1);
  await expect(page.locator('.zlatoust-stage-practice .b2-quiz-item')).toHaveCount(2);
  const timeCheck = page.locator('[data-zlatoust-check="time-line-1"]');
  await timeCheck.locator('.zlatoust-learning-check-option').nth(1).click();
  await expect(timeCheck).toContainText('这次误判在这里');
  await timeCheck.locator('.zlatoust-retry .zlatoust-learning-check-option').first().click();
  await expect(timeCheck.locator('.zlatoust-retry')).toContainText('这次判断正确');

  await page.getByRole('button', { name: /返回知识点卡片/ }).first().click();
  await page.locator('.zlatoust-section-card', { hasText: '4.4' }).click();
  await expect(page.locator('.zlatoust-learning-page')).toHaveCount(1);
  await expect(page.locator('.zlatoust-stage-practice .b2-quiz-item')).toHaveCount(0);
  const razCheck = page.locator('[data-zlatoust-check="raz-route-1"]');
  await razCheck.locator('.zlatoust-learning-check-option').nth(1).click();
  await expect(razCheck).toContainText('这次误判在这里');
  await razCheck.locator('.zlatoust-retry .zlatoust-learning-check-option').first().click();
  await expect(razCheck.locator('.zlatoust-retry')).toContainText('这次判断正确');
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('rr_zlatoust_learning_v1')).units['4.4']);
  expect(stored.checks['raz-route-1'].everWrong).toBe(true);
  expect(stored.retries['raz-route-1'].correct).toBe(true);
});

test('Zlatoust 4.4 remains operable at a 390px mobile viewport', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  try {
    await page.goto('http://127.0.0.1:3000/reader.html');
    await page.locator('button[onclick="showWorldPeopleDashboard()"]').click();
    await page.locator('.world-module-card', { hasText: '语法词汇' }).click();
    await page.locator('.chapter-grid .ch-item').nth(3).click();
    await page.locator('.zlatoust-section-card', { hasText: '4.4' }).click();
    await expect(page.locator('.zlatoust-learning-page')).toHaveCount(1);
    const metrics = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth, controls: [...document.querySelectorAll('.zlatoust-unit-map button')].map(button => { const box = button.getBoundingClientRect(); return { left: box.left, right: box.right }; }), labels: [...document.querySelectorAll('.zlatoust-stage-review input')].map(input => input.getAttribute('aria-label')) }));
    expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.width);
    expect(metrics.controls.every(box => box.left >= 0 && box.right <= metrics.width)).toBe(true);
    expect(new Set(metrics.labels).size).toBe(5);
  } finally { await context.close(); }
});

test('Zlatoust 1.3 and 1.5 learning pages remain operable at a 390px mobile viewport', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  try {
    await page.goto('http://127.0.0.1:3000/reader.html');
    await page.locator('button[onclick="showWorldPeopleDashboard()"]').click();
    await page.locator('.world-module-card', { hasText: '语法词汇' }).click();
    await page.locator('.chapter-grid .ch-item').nth(0).click();

    await page.locator('button[onclick*="gl1-3"]').click();
    await expect(page.locator('.zlatoust-learning-page')).toHaveCount(1);
    const adjectiveMetrics = await page.evaluate(() => ({
      width: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      controls: [...document.querySelectorAll('.zlatoust-unit-map button')].map(button => {
        const box = button.getBoundingClientRect();
        return { left: box.left, right: box.right };
      }),
      labels: [...document.querySelectorAll('.zlatoust-stage-review input')].map(input => input.getAttribute('aria-label'))
    }));
    expect(adjectiveMetrics.scrollWidth).toBeLessThanOrEqual(adjectiveMetrics.width);
    expect(adjectiveMetrics.controls.every(box => box.left >= 0 && box.right <= adjectiveMetrics.width)).toBe(true);
    expect(new Set(adjectiveMetrics.labels).size).toBe(5);

    await page.getByRole('button', { name: '返回知识点卡片' }).first().click();
    await page.locator('button[onclick*="gl1-5"]').click();
    const reviewMetrics = await page.evaluate(() => ({
      width: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      controls: [...document.querySelectorAll('.zlatoust-unit-map button')].map(button => {
        const box = button.getBoundingClientRect();
        return { left: box.left, right: box.right };
      }),
      labels: [...document.querySelectorAll('.zlatoust-stage-review input')].map(input => input.getAttribute('aria-label'))
    }));
    expect(reviewMetrics.scrollWidth).toBeLessThanOrEqual(reviewMetrics.width);
    expect(reviewMetrics.controls.every(box => box.left >= 0 && box.right <= reviewMetrics.width)).toBe(true);
    expect(new Set(reviewMetrics.labels).size).toBe(4);
  } finally {
    await context.close();
  }
});

test('Zlatoust 2.1 remains operable at a 390px mobile viewport', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  try {
    await page.goto('http://127.0.0.1:3000/reader.html');
    await page.locator('button[onclick="showWorldPeopleDashboard()"]').click();
    await page.locator('.world-module-card', { hasText: '语法词汇' }).click();
    await page.locator('.chapter-grid .ch-item').nth(1).click();
    await page.locator('.zlatoust-section-card', { hasText: '2.1' }).click();
    await expect(page.locator('.zlatoust-learning-page')).toHaveCount(1);
    const metrics = await page.evaluate(() => ({
      width: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      controls: [...document.querySelectorAll('.zlatoust-unit-map button')].map(button => {
        const box = button.getBoundingClientRect();
        return { left: box.left, right: box.right };
      }),
      labels: [...document.querySelectorAll('.zlatoust-stage-review input')].map(input => input.getAttribute('aria-label'))
    }));
    expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.width);
    expect(metrics.controls.every(box => box.left >= 0 && box.right <= metrics.width)).toBe(true);
    expect(new Set(metrics.labels).size).toBe(5);
  } finally {
    await context.close();
  }
});

test('Zlatoust learning cards show semantic reasoning across later chapters', async ({ page }) => {
  await page.goto('http://127.0.0.1:3000/reader.html');
  await page.locator('.world-shelf-card', { hasText: 'В мире людей' }).getByRole('button', { name: '打开总仪表盘' }).click();
  await page.locator('.world-module-card', { hasText: 'В мире людей — 语法词汇' }).click();

  const chapters = page.locator('.chapter-grid .ch-item');
  await chapters.nth(3).click();
  await page.locator('.zlatoust-section-card', { hasText: '4.3' }).click();
  await expect(page.getByRole('region', { name: '本知识点思维导图' })).toHaveCount(1);
  await expect(page.getByText('时间线闸门', { exact: false })).toHaveCount(1);

  await page.getByRole('button', { name: '返回知识点卡片', exact: true }).first().click();
  await page.getByRole('button', { name: '目录', exact: true }).click();
  await page.locator('.chapter-grid .ch-item').nth(4).click();
  await page.locator('.zlatoust-section-card', { hasText: '5.2' }).click();
  await expect(page.getByRole('region', { name: '本知识点思维导图' })).toHaveCount(1);
  await expect(page.getByText('不同的信息立场', { exact: false })).toHaveCount(1);
});

test('Zlatoust Chapter 5 keeps formal practice isolated while formative checks retry in place', async ({ page }) => {
  await page.goto('http://127.0.0.1:3000/reader.html');
  await page.locator('button[onclick="showWorldPeopleDashboard()"]').click();
  await page.locator('.world-module-card', { hasText: '语法词汇' }).click();
  await page.locator('.chapter-grid .ch-item').nth(4).click();

  await page.locator('.zlatoust-section-card', { hasText: '5.1' }).click();
  await expect(page.locator('.zlatoust-stage')).toHaveCount(4);
  await expect(page.locator('.zlatoust-stage-practice .b2-quiz-item')).toHaveCount(22);
  const formative = page.locator('[data-zlatoust-check="style-recurrence-1"]');
  await formative.locator('.zlatoust-learning-check-option').nth(1).click();
  await expect(formative).toContainText('这次误判在这里');
  await formative.locator('.zlatoust-retry .zlatoust-learning-check-option').first().click();
  await expect(formative.locator('.zlatoust-retry')).toContainText('这次判断正确');

  await page.getByRole('button', { name: '返回知识点卡片', exact: true }).first().click();
  await page.locator('.zlatoust-section-card', { hasText: '5.2' }).click();
  await expect(page.locator('.zlatoust-stage')).toHaveCount(4);
  await expect(page.locator('.zlatoust-stage-practice .b2-quiz-item')).toHaveCount(23);
  await expect(page.getByText('不同的信息立场', { exact: false })).toHaveCount(1);

  await page.getByRole('button', { name: '返回知识点卡片', exact: true }).first().click();
  await page.getByRole('button', { name: '5.lexical' }).first().click();
  await expect(page.locator('.zlatoust-stage')).toHaveCount(5);
  await expect(page.locator('.zlatoust-stage-practice .b2-quiz-item')).toHaveCount(30);
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('rr_zlatoust_learning_v1')).units['5.1']);
  expect(stored.checks['style-recurrence-1'].everWrong).toBe(true);
  expect(stored.retries['style-recurrence-1'].correct).toBe(true);
});

test('Zlatoust Chapter 5 learning maps remain operable at a 390px mobile viewport', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  try {
    await page.goto('http://127.0.0.1:3000/reader.html');
    await page.locator('button[onclick="showWorldPeopleDashboard()"]').click();
    await page.locator('.world-module-card', { hasText: '语法词汇' }).click();
    await page.locator('.chapter-grid .ch-item').nth(4).click();
    for (const section of ['5.1', '5.2', '5.lexical']) {
      const card = section === '5.lexical'
        ? page.getByRole('button', { name: '5.lexical' }).first()
        : page.locator('.zlatoust-section-card', { hasText: section });
      await card.click();
      await expect(page.locator('.zlatoust-learning-page')).toHaveCount(1);
      const metrics = await page.evaluate(() => ({
        width: innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
        controls: [...document.querySelectorAll('.zlatoust-unit-map button')].map(button => {
          const box = button.getBoundingClientRect();
          return { left: box.left, right: box.right };
        }),
        labels: [...document.querySelectorAll('.zlatoust-stage-review input')].map(input => input.getAttribute('aria-label'))
      }));
      expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.width);
      expect(metrics.controls.every(box => box.left >= 0 && box.right <= metrics.width)).toBe(true);
      expect(new Set(metrics.labels).size).toBeGreaterThan(0);
      if (section !== '5.lexical') await page.getByRole('button', { name: '返回知识点卡片', exact: true }).first().click();
    }
  } finally {
    await context.close();
  }
});
