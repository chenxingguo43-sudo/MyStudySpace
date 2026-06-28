// crawl-innook-resources.js — 捕获 innook.cn 加载的所有资源（图片/视频/音频/CSS/JS）
const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, 'innook-resources');

(async () => {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:/Users/梅子/AppData/Local/ms-playwright/chromium-1223/chrome-win64/chrome.exe'
  });
  const page = await browser.newPage();

  // 捕获所有资源 URL
  const resources = [];
  page.on('response', async resp => {
    const url = resp.url();
    const ct = resp.headers()['content-type'] || '';
    const status = resp.status();
    resources.push({ url: url.substring(0, 300), status, contentType: ct.substring(0, 60) });
  });

  console.log('Loading innook.cn...');
  try {
    await page.goto('https://www.innook.cn/', { waitUntil: 'domcontentloaded', timeout: 15000 });
  } catch(e) {
    console.log('Timeout, continuing...');
  }

  // 等待加载
  await page.waitForTimeout(5000);

  // 获取渲染后的 DOM
  const html = await page.evaluate(() => document.documentElement.outerHTML);
  fs.writeFileSync(path.join(OUTPUT_DIR, 'rendered.html'), html);

  // 提取所有媒体 URL
  const mediaURLs = await page.evaluate(() => {
    const urls = new Set();
    // img src
    document.querySelectorAll('img[src]').forEach(el => urls.add(el.src));
    // video src
    document.querySelectorAll('video[src]').forEach(el => urls.add(el.src));
    // audio src
    document.querySelectorAll('audio[src]').forEach(el => urls.add(el.src));
    // source src
    document.querySelectorAll('source[src]').forEach(el => urls.add(el.src));
    // background-image
    document.querySelectorAll('*').forEach(el => {
      const bg = getComputedStyle(el).backgroundImage;
      if (bg && bg !== 'none') {
        const match = bg.match(/url\(["']?([^"')]+)["']?\)/);
        if (match) urls.add(match[1]);
      }
    });
    // link href (CSS, fonts)
    document.querySelectorAll('link[href]').forEach(el => urls.add(el.href));
    return [...urls];
  });
  fs.writeFileSync(path.join(OUTPUT_DIR, 'media-urls.json'), JSON.stringify(mediaURLs, null, 2));
  console.log('Media URLs found:', mediaURLs.length);

  // 提取 CSS 变量（设计系统）
  const designSystem = await page.evaluate(() => {
    const root = document.documentElement;
    const cs = getComputedStyle(root);
    const vars = {};
    // 遍历所有样式表提取 CSS 变量
    for (const sheet of document.styleSheets) {
      try {
        for (const rule of sheet.cssRules) {
          if (rule.style) {
            for (let i = 0; i < rule.style.length; i++) {
              const prop = rule.style[i];
              if (prop.startsWith('--')) {
                vars[prop] = rule.style.getPropertyValue(prop).trim();
              }
            }
          }
        }
      } catch(e) {}
    }
    return vars;
  });
  fs.writeFileSync(path.join(OUTPUT_DIR, 'design-system.json'), JSON.stringify(designSystem, null, 2));
  console.log('CSS variables found:', Object.keys(designSystem).length);

  // 提取液态玻璃效果的完整 CSS
  const liquidGlassCSS = await page.evaluate(() => {
    const rules = [];
    for (const sheet of document.styleSheets) {
      try {
        for (const rule of sheet.cssRules) {
          if (rule.selectorText && rule.selectorText.includes('liquid-glass')) {
            rules.push({ selector: rule.selectorText, css: rule.cssText });
          }
        }
      } catch(e) {}
    }
    return rules;
  });
  fs.writeFileSync(path.join(OUTPUT_DIR, 'liquid-glass-rules.json'), JSON.stringify(liquidGlassCSS, null, 2));

  // 保存网络请求
  fs.writeFileSync(path.join(OUTPUT_DIR, 'network.json'), JSON.stringify(resources, null, 2));
  console.log('Network requests:', resources.length);

  // 提取 innook 媒体库的所有 COS 资源
  const cosResources = resources.filter(r => r.url.includes('cos.ap-guangzhou'));
  fs.writeFileSync(path.join(OUTPUT_DIR, 'cos-resources.json'), JSON.stringify(cosResources, null, 2));
  console.log('COS resources:', cosResources.length);

  console.log('Done! Output in:', OUTPUT_DIR);
  await browser.close();
})();
