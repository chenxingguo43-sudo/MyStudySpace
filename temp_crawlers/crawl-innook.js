// crawl-innook.js — 使用 Playwright 爬取 innook.cn 的完整渲染内容
const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, 'innook-data');

(async () => {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:/Users/梅子/AppData/Local/ms-playwright/chromium-1223/chrome-win64/chrome.exe'
  });
  const page = await browser.newPage();

  // 收集所有网络请求
  const requests = [];
  page.on('request', req => {
    requests.push({ url: req.url(), type: req.resourceType() });
  });

  // 收集所有 JS/CSS 内容
  const jsContents = [];
  const cssContents = [];
  page.on('response', async resp => {
    const url = resp.url();
    const type = resp.headers()['content-type'] || '';
    try {
      if (type.includes('javascript') || url.endsWith('.js')) {
        const body = await resp.text();
        jsContents.push({ url, size: body.length, snippet: body.substring(0, 500) });
        // 保存完整 JS
        const fname = 'js_' + url.replace(/[^a-zA-Z0-9]/g, '_').slice(-80) + '.js';
        fs.writeFileSync(path.join(OUTPUT_DIR, fname), body);
      }
      if (type.includes('css') || url.endsWith('.css')) {
        const body = await resp.text();
        cssContents.push({ url, size: body.length });
        const fname = 'css_' + url.replace(/[^a-zA-Z0-9]/g, '_').slice(-80) + '.css';
        fs.writeFileSync(path.join(OUTPUT_DIR, fname), body);
      }
    } catch(e) {}
  });

  console.log('Navigating to innook.cn...');
  try {
    await page.goto('https://www.innook.cn/', {
      waitUntil: 'networkidle',
      timeout: 30000
    });
  } catch(e) {
    console.log('Navigation timeout, continuing with partial data...');
  }

  // 等待 SPA 渲染
  await page.waitForTimeout(5000);

  // 截图
  await page.screenshot({ path: path.join(OUTPUT_DIR, 'full-page.png'), fullPage: true });
  console.log('Screenshot saved');

  // 获取渲染后的完整 DOM
  const renderedHTML = await page.evaluate(() => document.documentElement.outerHTML);
  fs.writeFileSync(path.join(OUTPUT_DIR, 'rendered.html'), renderedHTML);
  console.log('Rendered HTML saved, size:', renderedHTML.length);

  // 获取所有文本内容
  const textContent = await page.evaluate(() => document.body.innerText);
  fs.writeFileSync(path.join(OUTPUT_DIR, 'text-content.txt'), textContent);
  console.log('Text content saved');

  // 获取所有链接
  const links = await page.evaluate(() => {
    return [...document.querySelectorAll('a[href], button, [onclick], [role="button"]')].map(el => ({
      tag: el.tagName,
      text: el.innerText?.trim().substring(0, 100),
      href: el.href,
      onclick: el.getAttribute('onclick'),
      class: el.className,
    }));
  });
  fs.writeFileSync(path.join(OUTPUT_DIR, 'interactive-elements.json'), JSON.stringify(links, null, 2));
  console.log('Interactive elements:', links.length);

  // 获取所有图片
  const images = await page.evaluate(() => {
    return [...document.querySelectorAll('img[src], video[src], [style*="background-image"]')].map(el => {
      const style = el.getAttribute('style') || '';
      const bgMatch = style.match(/url\(['"]?([^'")\s]+)['"]?\)/);
      return {
        tag: el.tagName,
        src: el.src || (bgMatch ? bgMatch[1] : null),
        style: style.substring(0, 200),
      };
    });
  });
  fs.writeFileSync(path.join(OUTPUT_DIR, 'media-resources.json'), JSON.stringify(images, null, 2));
  console.log('Media resources:', images.length);

  // 保存网络请求
  fs.writeFileSync(path.join(OUTPUT_DIR, 'network-requests.json'), JSON.stringify(requests, null, 2));
  console.log('Network requests:', requests.length);

  // 保存 JS 内容摘要
  fs.writeFileSync(path.join(OUTPUT_DIR, 'js-summary.json'), JSON.stringify(jsContents, null, 2));
  console.log('JS files captured:', jsContents.length);

  // 尝试点击进入（如果有内测码输入框）
  const codeInput = await page.$('input[placeholder*="码"], input[type="text"], input[type="password"]');
  if (codeInput) {
    console.log('Found input field - there might be a code entry page');
    const placeholder = await codeInput.getAttribute('placeholder');
    console.log('Placeholder:', placeholder);
  }

  await browser.close();
  console.log('Done! Output in:', OUTPUT_DIR);
})();
