// crawl-innook-api.js — 直接访问 innook.cn，捕获所有 API 请求和网络流量
const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, 'innook-api');

(async () => {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:/Users/梅子/AppData/Local/ms-playwright/chromium-1223/chrome-win64/chrome.exe'
  });
  const page = await browser.newPage();

  // 捕获所有网络请求
  const allRequests = [];
  page.on('request', req => {
    allRequests.push({
      url: req.url(),
      method: req.method(),
      type: req.resourceType(),
      headers: req.headers(),
    });
  });

  // 捕获所有响应
  const allResponses = [];
  page.on('response', async resp => {
    const url = resp.url();
    const ct = resp.headers()['content-type'] || '';
    let bodyPreview = '';
    try {
      if (ct.includes('json') || ct.includes('text')) {
        const text = await resp.text();
        bodyPreview = text.substring(0, 2000);
        // 保存 API 响应
        if (url.includes('api') || url.includes('innook') || ct.includes('json')) {
          const safeName = url.replace(/[^a-zA-Z0-9]/g, '_').slice(-60);
          fs.writeFileSync(path.join(OUTPUT_DIR, 'api_' + safeName + '.json'), text);
        }
      }
    } catch(e) {}
    allResponses.push({
      url,
      status: resp.status(),
      contentType: ct,
      bodyPreview,
    });
  });

  console.log('Navigating to innook.cn directly...');
  try {
    await page.goto('https://www.innook.cn/', {
      waitUntil: 'networkidle',
      timeout: 30000
    });
  } catch(e) {
    console.log('Timeout, continuing...');
  }

  await page.waitForTimeout(3000);

  // 截图邀请码页面
  await page.screenshot({ path: path.join(OUTPUT_DIR, 'invite-page.png'), fullPage: true });
  console.log('Invite page screenshot saved');

  // 获取邀请码页面 HTML
  const inviteHTML = await page.evaluate(() => document.documentElement.outerHTML);
  fs.writeFileSync(path.join(OUTPUT_DIR, 'invite-page.html'), inviteHTML);

  // 尝试输入邀请码（常见内测码）
  const input = await page.$('input');
  if (input) {
    console.log('Found invite code input, trying common codes...');
    // 尝试一些常见的内测码
    const codes = ['123456', '000000', '888888', '666666', '111111', 'innook', '202401', '202501'];
    for (const code of codes) {
      await input.fill(code);
      await page.waitForTimeout(500);
      // 检查是否有错误提示
      const error = await page.evaluate(() => {
        const el = document.querySelector('.text-rose-100\\/75, [class*="error"], [class*="rose"]');
        return el ? el.innerText : '';
      });
      if (error) {
        console.log(`Code ${code}: ${error}`);
      } else {
        console.log(`Code ${code}: no error - might work!`);
        // 尝试点击提交按钮
        const btn = await page.$('button[type="submit"]');
        if (btn) {
          await btn.click();
          await page.waitForTimeout(3000);
          // 检查是否进入了主界面
          const newHTML = await page.evaluate(() => document.documentElement.outerHTML);
          if (newHTML.length > inviteHTML.length + 100) {
            console.log('Entered main app!');
            fs.writeFileSync(path.join(OUTPUT_DIR, 'main-app.html'), newHTML);
            await page.screenshot({ path: path.join(OUTPUT_DIR, 'main-app.png'), fullPage: true });
            break;
          }
        }
      }
      await input.fill('');
    }
  }

  // 保存网络请求
  fs.writeFileSync(path.join(OUTPUT_DIR, 'all-requests.json'), JSON.stringify(allRequests, null, 2));
  fs.writeFileSync(path.join(OUTPUT_DIR, 'all-responses.json'), JSON.stringify(allResponses.map(r => ({
    url: r.url, status: r.status, contentType: r.contentType,
    bodyPreview: r.bodyPreview.substring(0, 500)
  })), null, 2));

  console.log('Total requests:', allRequests.length);
  console.log('Total responses:', allResponses.length);
  console.log('Done! Output in:', OUTPUT_DIR);

  await browser.close();
})();
