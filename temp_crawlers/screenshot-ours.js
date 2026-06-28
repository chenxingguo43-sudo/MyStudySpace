// screenshot-ours.js — 截图我们的 pomodoro.html
const { chromium } = require('playwright-core');
const path = require('path');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:/Users/梅子/AppData/Local/ms-playwright/chromium-1223/chrome-win64/chrome.exe'
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.goto('http://localhost:3000/pomodoro.html', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(3000);

  // 截图主界面
  await page.screenshot({ path: path.join(__dirname, 'ours-main.png') });
  console.log('Saved: ours-main.png');

  // 点击场景按钮，截图场景面板
  await page.click('#nav-scene');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(__dirname, 'ours-scene.png') });
  console.log('Saved: ours-scene.png');

  await browser.close();
})();
