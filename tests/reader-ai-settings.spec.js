const { test, expect } = require('@playwright/test');

test.use({ channel: 'chrome' });
const baseUrl = process.env.READER_TEST_BASE_URL || 'http://127.0.0.1:3112';

test('bookshelf AI settings safely configure and route providers', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(baseUrl + '/reader.html');
  await page.getByRole('button', { name: 'AI 服务' }).click();
  await expect(page.getByRole('heading', { name: 'AI 服务' })).toBeVisible();
  await page.locator('#readerAiNewProvider').click();
  const form = page.locator('#readerAiProviderForm');
  await form.locator('[name="name"]').fill('测试中转站');
  await form.locator('[name="vendor"]').selectOption('custom');
  await form.locator('[name="format"]').selectOption('responses');
  await form.locator('[name="model"]').fill('mock-model');
  await form.locator('[name="baseUrl"]').fill('https://mock.invalid/v1');
  await form.locator('[name="apiKey"]').fill('fixed-browser-test-secret');
  await form.locator('[name="multiplier"]').fill('0.07');
  await form.getByRole('button', { name: '保存配置' }).click();
  await expect(page.getByText('测试中转站', { exact: true })).toBeVisible();

  const option = { label: '测试中转站 · mock-model' };
  await page.locator('#readerAiDictionaryProvider').selectOption(option);
  await page.locator('#readerAiGrammarProvider').selectOption(option);
  await page.locator('#readerAiSaveAssignments').click();
  await expect(page.locator('#readerAiDictionaryProvider')).toHaveValue(/provider-/);
  const publicConfig = await page.evaluate(async () => (await fetch('/api/reader-ai/config')).json());
  expect(JSON.stringify(publicConfig)).not.toContain('fixed-browser-test-secret');
  expect(publicConfig.assignments.dictionary).toBe(publicConfig.assignments.grammar);
  await page.screenshot({ path: 'test-results/reader-ai-settings-desktop.png', fullPage: false });

  page.once('dialog', dialog => dialog.accept());
  await page.locator('#readerAiDeleteProvider').click();
  await expect(page.getByText('测试中转站', { exact: true })).toHaveCount(0);
});

test('AI settings fit a phone viewport without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(baseUrl + '/reader.html');
  await page.getByRole('button', { name: 'AI 服务' }).click();
  await expect(page.getByRole('heading', { name: 'AI 服务' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  const dialog = await page.locator('.reader-ai-settings-dialog').boundingBox();
  expect(dialog.x).toBeGreaterThanOrEqual(0);
  expect(dialog.x + dialog.width).toBeLessThanOrEqual(390);
  await page.screenshot({ path: 'test-results/reader-ai-settings-mobile.png', fullPage: false });
});
