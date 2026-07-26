const { test, expect } = require('@playwright/test');

const PROGRESS_KEY = 'rr_b2_progress_v1';
const MIGRATION_KEY = 'zlatoust_grammar_progress_answer_repair_v1';
const BACKUP_KEY = MIGRATION_KEY + '_backup';

test('reader migrates historical Zlatoust answers once and keeps the weak-rule view usable', async ({ page }) => {
  await page.addInitScript(({ progressKey, migrationKey, backupKey }) => {
    if (sessionStorage.getItem('zlatoust-migration-test-seeded')) return;
    sessionStorage.setItem('zlatoust-migration-test-seeded', 'true');
    localStorage.removeItem(migrationKey);
    localStorage.removeItem(backupKey);
    localStorage.setItem(progressKey, JSON.stringify({
      'zlatoust_grammar:gl1': {
        'GL1-Q001': { selected: 'А', submitted: true, attempts: 3, wrong: true, everWrong: true, lastResult: 'wrong', lastAnsweredAt: '2026-07-01T00:00:00.000Z' },
        'GL1-Q005': { selected: 'А', submitted: true, attempts: 2, wrong: false, everWrong: true, lastResult: 'correct', lastAnsweredAt: '2026-07-02T00:00:00.000Z' },
        'GL1-Q006': { selected: 'open-response', submitted: true, wrong: false, everWrong: false, lastResult: 'recorded', response: '保留这条开放作答' }
      },
      'russian_b2:p1': { 'P1-Q004': { selected: 'Б', submitted: true, wrong: true, everWrong: true } }
    }));
  }, { progressKey: PROGRESS_KEY, migrationKey: MIGRATION_KEY, backupKey: BACKUP_KEY });

  await page.goto('http://127.0.0.1:3000/reader.html');
  const firstPass = await page.evaluate(({ progressKey, migrationKey, backupKey }) => {
    window.getB2Progress();
    return {
      progress: JSON.parse(localStorage.getItem(progressKey)),
      backup: JSON.parse(localStorage.getItem(backupKey)),
      marker: JSON.parse(localStorage.getItem(migrationKey))
    };
  }, { progressKey: PROGRESS_KEY, migrationKey: MIGRATION_KEY, backupKey: BACKUP_KEY });

  expect(firstPass.progress['zlatoust_grammar:gl1']['GL1-Q001']).toMatchObject({ wrong: false, lastResult: 'correct', attempts: 3, everWrong: true });
  expect(firstPass.progress['zlatoust_grammar:gl1']['GL1-Q005']).toMatchObject({ wrong: true, lastResult: 'wrong', attempts: 2, everWrong: true });
  expect(firstPass.progress['zlatoust_grammar:gl1']['GL1-Q006']).toMatchObject({ lastResult: 'recorded', response: '保留这条开放作答' });
  expect(firstPass.progress['russian_b2:p1']['P1-Q004'].wrong).toBe(true);
  expect(firstPass.backup.records['zlatoust_grammar:gl1']['GL1-Q001'].wrong).toBe(true);
  expect(firstPass.backup.records['russian_b2:p1']).toBeUndefined();
  expect(firstPass.marker.correctedRecords).toBe(2);

  const backupBeforeRefresh = JSON.stringify(firstPass.backup);
  await page.reload();
  const secondPass = await page.evaluate(({ progressKey, migrationKey, backupKey }) => ({
    progress: JSON.parse(localStorage.getItem(progressKey)),
    backup: localStorage.getItem(backupKey),
    marker: JSON.parse(localStorage.getItem(migrationKey))
  }), { progressKey: PROGRESS_KEY, migrationKey: MIGRATION_KEY, backupKey: BACKUP_KEY });
  expect(secondPass.progress['zlatoust_grammar:gl1']['GL1-Q005'].wrong).toBe(true);
  expect(secondPass.backup).toBe(backupBeforeRefresh);
  expect(secondPass.marker.correctedRecords).toBe(2);

  await page.locator('.world-shelf-card', { hasText: 'В мире людей' }).getByRole('button', { name: '打开总仪表盘' }).click();
  await page.locator('.world-module-card', { hasText: 'В мире людей — 语法词汇' }).click();
  await page.locator('.chapter-grid .ch-item').nth(0).click();
  await expect(page.locator('.zlatoust-weak-panel')).toHaveCount(1);
  await expect(page.locator('.zlatoust-weak-panel')).toContainText('当前错');
});

test('Zlatoust option clicks update the active question without rebuilding the whole chapter', async ({ page }) => {
  await page.goto('http://127.0.0.1:3000/reader.html');
  await page.locator('.world-shelf-card', { hasText: 'В мире людей' }).getByRole('button', { name: '打开总仪表盘' }).click();
  await page.locator('.world-module-card', { hasText: 'В мире людей — 语法词汇' }).click();
  await page.locator('.chapter-grid .ch-item').nth(0).click();

  await expect(page.locator('.b2-quiz-page')).toHaveCount(1);
  await page.evaluate(() => { window.__quizPageBeforeAnswer = document.querySelector('.b2-quiz-page'); });

  const firstChoice = page.locator('[data-question-id="GL1-Q001"] .b2-option-row[aria-label="选择 А"]');
  await expect(firstChoice).toHaveCount(1);
  await firstChoice.evaluate((element) => element.click());
  await expect(page.locator('[data-question-id="GL1-Q001"] .b2-option-row[aria-label="再次点击确认选择 А"]')).toHaveCount(1);
  expect(await page.evaluate(() => document.querySelector('.b2-quiz-page') === window.__quizPageBeforeAnswer)).toBe(true);

  const confirmChoice = page.locator('[data-question-id="GL1-Q001"] .b2-option-row[aria-label="再次点击确认选择 А"]');
  await confirmChoice.evaluate((element) => element.click());
  await expect(page.locator('[data-question-id="GL1-Q001"] .b2-result .is-correct')).toHaveCount(1);
  expect(await page.evaluate(() => document.querySelector('.b2-quiz-page') === window.__quizPageBeforeAnswer)).toBe(true);
});
