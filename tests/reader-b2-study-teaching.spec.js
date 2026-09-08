const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
test.use({ channel: 'chrome' });
const base = process.env.READER_TEST_BASE_URL || 'http://localhost:3000';
const root = path.resolve(__dirname, '..');
const navigation = JSON.parse(fs.readFileSync(path.join(root, '俄语资料库', '俄语B2·原书复刻与学习版', '规范数据', '语法词汇', 'part-study-navigation.json'), 'utf8'));
const p3QuestionHomes = navigation.parts.find(part => part.id === 'p3').knowledgePoints.flatMap(point =>
  (point.teachingMapping || []).map(mapping => ({
    cardId: point.id,
    questionId: mapping.exerciseId,
    sectionId: mapping.sectionId
  }))
);
const p3TeachingCards = [
  { title: '主动形动词的一致', quickTitle: '先把形动词还原成“哪个名词自己做什么”', sectionCount: 6, questionId: 'P3-Q001', sectionId: 'head-before-ending' },
  { title: '被动形动词的一致', quickTitle: '先还原成“谁对谁做了什么”', sectionCount: 7, questionId: 'P3-Q016', sectionId: 'current-or-regular-receiver' },
  { title: '副动词的时间、条件、原因与让步', quickTitle: '先把副动词展开成一句完整的话', sectionCount: 7, questionId: 'P3-Q024', sectionId: 'context-before-form' },
  { title: '副动词的主体一致', quickTitle: '先问两次“谁做”', sectionCount: 9, questionId: 'P3-Q045', sectionId: 'relative-time' }
];

async function enterP3(page) {
  await page.goto(base + '/reader.html?book=russian_b2');
  await page.waitForFunction(() => typeof b2BookManifest !== 'undefined' && b2BookManifest);
  await expect(page.getByText('P1–P6 连续练习、丰富知识卡与错题复习', { exact: true })).toBeVisible();
  await page.evaluate(() => openB2Module('grammar'));
  await page.locator('.b2-chapter-grid .b2-chapter-item').filter({ hasText: 'P3 形动词与副动词' }).click();
  await expect(page.getByRole('button', { name: /副动词的主体一致/ })).toBeVisible();
}

for (const width of [1280, 390]) {
  test(`opening the B2 knowledge card from its directory uses the accepted teaching version at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await enterP3(page);
    await page.getByRole('button', { name: /副动词的主体一致.*知识点学习卡/ }).click();
    await expect(page.locator('.b2-teaching')).toHaveCount(1);
    await expect(page.getByRole('heading', { name: '先问两次“谁做”' })).toBeVisible();
    await expect(page.locator('.b2-teaching-map .reader-mind-map-svg')).toBeVisible();
    await expect(page.locator('.b2-teaching-map text').filter({ hasText: /^识别要点$/ })).toHaveCount(9);
    await expect(page.locator('.b2-teaching-map text').filter({ hasText: /^核心规则$/ })).toHaveCount(9);
    await expect(page.locator('.b2-teaching-map text').filter({ hasText: /^例句$/ })).toHaveCount(9);
    await expect(page.locator('.b2-teaching-map text').filter({ hasText: /^易错陷阱$/ })).toHaveCount(9);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  });
}

for (const width of [1280, 390]) {
  test(`every P3 knowledge card uses its own retrieval teaching route at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    for (const card of p3TeachingCards) {
      await enterP3(page);
      await page.getByRole('button', { name: new RegExp(card.title + '.*知识点学习卡') }).click();
      await expect(page.locator('.b2-teaching')).toHaveCount(1);
      await expect(page.getByRole('heading', { name: card.quickTitle })).toBeVisible();
      await expect(page.locator('.b2-teaching-section')).toHaveCount(card.sectionCount);
      await expect(page.locator('.b2-teaching-map .reader-mind-map-svg')).toBeVisible();
      await expect(page.locator('.b2-teaching-map [data-teaching-jump]')).toHaveCount(card.sectionCount);
      const formalPractice = page.locator('.b2-teaching-formal');
      expect(await formalPractice.count()).toBeGreaterThan(0);
      expect(await formalPractice.evaluateAll(nodes => nodes.every(node => !node.open))).toBe(true);
      await formalPractice.first().locator('summary').click();
      await expect(formalPractice.first().locator('[data-question-id]').first()).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      await page.getByRole('button', { name: '返回练习' }).first().click();
      await expect(page.getByRole('button', { name: new RegExp(card.title) })).toBeVisible();
    }
  });
}

for (const width of [1280, 390]) {
  test(`P3 pilot teaches, answers and returns without losing history at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await enterP3(page);
    const old = {
      attempts: 5,
      lastScore: 2,
      bestScore: 3,
      answers: { 'review-1': { selected: true, correct: true } },
      answeredCheckIds: ['review-1'],
      lastStudiedAt: '2026-09-01',
      teachingV1: { answers: { 'v2-same-actor': { selected: 1, correct: false, at: '2026-09-02' } } }
    };
    await page.evaluate(old => {
      localStorage.setItem(STUDY_CARD_PROGRESS_KEY, JSON.stringify({ 'p3-gerund-subject': old }));
      const r = getQuizRecord('P3-Q045');
      Object.assign(r, { selected: 'А', submitted: true, attempts: 4, explanationOpen: true, lastResult: 'correct' });
      saveQuizRecord('P3-Q045', r);
      pendingQuizJumpId = 'P3-Q045';
      renderQuizChapter(Object.assign({}, currentQuizData, { exercises: currentQuizData.exercises.filter(e => e.id === 'P3-Q045') }), 0);
    }, old);
    const q45 = page.locator('[data-question-id="P3-Q045"]');
    await q45.locator('[data-teaching-open]').click();
    await expect(page.locator('#study-teaching-relative-time')).toBeFocused();
    await expect(page.locator('.b2-teaching-section')).toHaveCount(9);
    await expect(page.locator('.b2-teaching [data-question-id]')).toHaveCount(6);
    expect(await page.locator('.b2-teaching [data-question-id]').evaluateAll(ns => new Set(ns.map(n => n.dataset.questionId)).size)).toBe(6);
    await expect(page.getByRole('heading', { name: '本知识点思维导图' })).toBeVisible();
    await expect(page.locator('.b2-teaching-map .zlatoust-mindmap-svg')).toBeVisible();
    await expect(page.locator('.b2-teaching-map [data-teaching-jump]')).toHaveCount(9);
    await expect(page.locator('.b2-teaching-map text').filter({ hasText: /^识别要点$/ })).toHaveCount(9);
    await expect(page.locator('.b2-teaching-map text').filter({ hasText: /^核心规则$/ })).toHaveCount(9);
    await expect(page.locator('.b2-teaching-map text').filter({ hasText: /^例句$/ })).toHaveCount(9);
    await expect(page.locator('.b2-teaching-map text').filter({ hasText: /^易错陷阱$/ })).toHaveCount(9);
    await expect(page.locator('.b2-teaching-transfer article')).toHaveCount(3);
    await page.locator('.b2-teaching-map [data-teaching-jump="shared-actor"]').click();
    await expect(page.locator('#study-teaching-shared-actor')).toBeFocused();
    await page.locator('.b2-teaching-map').evaluate(node => node.scrollIntoView({ block: 'start' }));
    await page.locator('.b2-teaching-map .zlatoust-mindmap-wrap').evaluate(node => { node.scrollLeft = 0; });
    expect((await page.getByRole('heading', { name: '本知识点思维导图' }).boundingBox()).y).toBeGreaterThanOrEqual(60);
    await page.screenshot({ path: `test-results/b2-study-teaching-map-${width}.png` });

    const check = page.locator('[data-teaching-check="v3-shared-actor"]');
    await check.locator('[data-teaching-answer="1"]').click();
    await expect(check.locator('.b2-teaching-feedback')).toContainText('两个动作一人分');
    await expect(check.locator('[data-teaching-retry]')).toBeVisible();
    await check.locator('[data-teaching-answer="0"]').click();
    await expect(check.locator('.b2-teaching-feedback')).toContainText('войдя 和 поздоровался');
    await check.locator('[data-teaching-retry-answer="0"]').click();
    await expect(check.locator('.b2-teaching-retry-feedback')).toContainText('这次判断正确');
    await check.evaluate(node => node.scrollIntoView({ block: 'start' }));
    expect((await check.getByRole('heading', { name: '马上练一下' }).boundingBox()).y).toBeGreaterThanOrEqual(60);
    await page.screenshot({ path: `test-results/b2-study-teaching-feedback-${width}.png` });
    const transfer = page.locator('[data-teaching-transfer="v3-transfer-diagnose"]');
    await transfer.locator('[data-teaching-transfer-answer="0"]').click();
    const createTask = page.locator('[data-teaching-transfer="v3-transfer-create"] textarea');
    await createTask.fill('Прочитав письмо, Анна улыбнулась. 两件事都是安娜做。');
    await createTask.blur();
    const saved = await page.evaluate(() => loadStudyCardProgress()['p3-gerund-subject']);
    for (const key of Object.keys(old)) expect(saved[key]).toEqual(old[key]);
    expect(saved.teachingV2.answers['v3-shared-actor'].correct).toBe(true);
    expect(saved.teachingV2.retries['v3-shared-actor'].correct).toBe(true);
    expect(saved.teachingV2.transfers['v3-transfer-diagnose'].correct).toBe(true);
    expect(saved.teachingV2.transfers['v3-transfer-create'].text).toContain('Анна');
    await page.locator('.b2-teaching-return button').click();
    await expect(page.locator('.b2-teaching')).toHaveCount(0);
    await expect(q45).toBeVisible();
    expect(await page.evaluate(() => getQuizRecord('P3-Q045').attempts)).toBe(4);

    await q45.locator('[data-teaching-open]').click();
    const formal = page.locator('#study-teaching-implicit-person .b2-teaching-formal');
    await formal.locator('summary').click();
    const q47 = page.locator('[data-question-id="P3-Q047"]');
    const option = q47.locator('[role="radio"]').filter({ has: page.locator('.b2-option-radio', { hasText: 'Б.' }) });
    await option.locator('.b2-option-radio').click();
    await option.locator('.b2-option-radio').click();
    expect(await page.evaluate(() => getQuizRecord('P3-Q047').submitted)).toBe(true);
    await expect(page.locator('[data-teaching-stats]')).toContainText('已答 2');
    await q47.locator('.b2-explanation-toggle').click();
    await expect(q47.locator('.rs-analysis-quick')).toBeVisible();
    await q47.locator('[data-teaching-open]').click();
    await expect(page.locator('#study-teaching-implicit-person')).toBeFocused();
    await page.locator('.b2-teaching-return button').click();
    await expect(q47).toBeVisible();
    await page.locator('.b2-teaching-legacy > summary').click();
    await expect(page.locator('.b2-teaching-legacy [data-study-check-id]')).toHaveCount(7);
    await page.locator('.b2-teaching-legacy > summary').click();
    await page.evaluate(() => window.scrollTo(0, 0));
    expect((await page.locator('.zlatoust-learning-kicker').boundingBox()).y).toBeGreaterThanOrEqual(60);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.screenshot({ path: `test-results/b2-study-teaching-${width}.png` });
    await page.locator('#study-teaching-recoverable-impersonal').evaluate(node => node.scrollIntoView({ block: 'start' }));
    await page.screenshot({ path: `test-results/b2-study-teaching-detail-${width}.png` });
    await page.getByRole('button', { name: '返回刚才那道题', exact: true }).first().click();
    await expect(page.locator('.b2-teaching')).toHaveCount(0);
    expect(await page.evaluate(() => currentQuizExercises.map(e => e.id))).toEqual(['P3-Q045']);
    expect(errors).toEqual([]);
  });
}

test('representative formal questions open the mapped branch and return with their records intact', async ({ page }) => {
  for (const card of p3TeachingCards) {
    await enterP3(page);
    await page.evaluate(questionId => {
      const record = getQuizRecord(questionId);
      Object.assign(record, { selected: getQuizExercise(questionId).answer, submitted: true, attempts: 2, explanationOpen: true, lastResult: 'correct' });
      saveQuizRecord(questionId, record);
      pendingQuizJumpId = questionId;
      renderQuizChapter(Object.assign({}, currentQuizData, { exercises: currentQuizData.exercises.filter(exercise => exercise.id === questionId) }), 0);
    }, card.questionId);
    const question = page.locator(`[data-question-id="${card.questionId}"]`);
    await question.locator('[data-teaching-open]').click();
    await expect(page.locator(`#study-teaching-${card.sectionId}`)).toBeFocused();
    await page.getByRole('button', { name: '返回刚才那道题', exact: true }).first().click();
    await expect(question).toBeVisible();
    expect(await page.evaluate(questionId => getQuizRecord(questionId).attempts, card.questionId)).toBe(2);
  }
});

test('all 50 P3 questions open their mapped teaching branch and return to the same question list', async ({ page }) => {
  test.setTimeout(300000);
  await enterP3(page);
  expect(p3QuestionHomes).toHaveLength(50);
  expect(new Set(p3QuestionHomes.map(item => item.questionId)).size).toBe(50);
  await page.evaluate(() => {
    currentQuizData.exercises.forEach(exercise => {
      const record = getQuizRecord(exercise.id);
      Object.assign(record, { selected: exercise.answer, submitted: true, attempts: 1, lastResult: 'correct' });
      saveQuizRecord(exercise.id, record);
    });
    renderQuizChapter(currentQuizData, 0);
  });
  for (const home of p3QuestionHomes) {
    const question = page.locator(`[data-question-id="${home.questionId}"]`);
    await question.locator('.b2-explanation-toggle').click();
    await expect(question.locator('[data-teaching-open]')).toBeVisible();
    await question.locator('[data-teaching-open]').click();
    await expect(page.locator(`#study-teaching-${home.sectionId}`)).toBeFocused();
    await page.locator('.b2-teaching-return button').click();
    await expect(question).toBeVisible();
    expect(await page.evaluate(() => currentQuizExercises.length)).toBe(50);
  }
});
