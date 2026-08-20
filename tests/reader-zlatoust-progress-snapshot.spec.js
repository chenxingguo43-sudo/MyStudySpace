const { test, expect } = require('@playwright/test');

test.use({ channel: 'chrome' });

async function installSavePicker(page) {
  await page.addInitScript(() => {
    window.__zlatoustSnapshotText = '';
    window.showSaveFilePicker = async () => ({
      createWritable: async () => ({
        write: async (value) => { window.__zlatoustSnapshotText = String(value); },
        close: async () => {}
      })
    });
  });
}

async function openWorldPeopleDashboard(page) {
  await page.goto('http://127.0.0.1:3000/reader.html');
  await page.locator('.world-shelf-card', { hasText: 'В мире людей' }).getByRole('button', { name: '打开总仪表盘' }).click();
  await expect(page.getByRole('heading', { name: 'В мире людей', exact: true })).toBeVisible();
}

async function exportAndCheck(page) {
  const grammar = page.locator('.world-module-card', { hasText: 'В мире людей — 语法词汇' });
  const exportButton = grammar.getByRole('button', { name: '导出进度快照' });
  await expect(exportButton).toBeVisible();
  await exportButton.click();
  await expect.poll(() => page.evaluate(() => window.__zlatoustSnapshotText.length)).toBeGreaterThan(1000);
  const markdown = await page.evaluate(() => window.__zlatoustSnapshotText);
  expect(markdown).toContain('card_count: 32');
  expect(markdown).toContain('## 第一章：一致与动词体');
  expect(markdown).toContain('## 第五章：语体与词汇');
  expect(markdown).toContain('1.4.1');
  await expect(exportButton).toBeEnabled();
  return grammar;
}

async function expectActionsInsideCard(grammar) {
  const metrics = await grammar.evaluate((card) => {
    const cardBox = card.getBoundingClientRect();
    const buttons = [...card.querySelectorAll('.world-module-actions button')].map((button) => {
      const box = button.getBoundingClientRect();
      return { left: box.left, right: box.right, top: box.top, bottom: box.bottom };
    });
    return {
      card: { left: cardBox.left, right: cardBox.right },
      buttons,
      pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth
    };
  });
  expect(metrics.buttons).toHaveLength(3);
  expect(metrics.pageOverflow).toBeLessThanOrEqual(1);
  for (const button of metrics.buttons) {
    expect(button.left).toBeGreaterThanOrEqual(metrics.card.left - 1);
    expect(button.right).toBeLessThanOrEqual(metrics.card.right + 1);
  }
}

test('desktop Reader exports a complete 32-card Obsidian progress snapshot', async ({ page }) => {
  await installSavePicker(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await openWorldPeopleDashboard(page);
  const grammar = await exportAndCheck(page);
  await expectActionsInsideCard(grammar);
  await grammar.screenshot({ path: 'test-results/zlatoust-progress-export-desktop.png' });
});

test('mobile Reader keeps the snapshot command inside the grammar card', async ({ page }) => {
  await installSavePicker(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await openWorldPeopleDashboard(page);
  const grammar = await exportAndCheck(page);
  await expectActionsInsideCard(grammar);
  await grammar.screenshot({ path: 'test-results/zlatoust-progress-export-mobile.png' });
});
