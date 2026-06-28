// crawl-innook-deep.js — 深度爬取 innook.cn：通过 Wayback Machine 获取 JS bundle，提取场景/音乐/功能数据
const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, 'innook-deep');

(async () => {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:/Users/梅子/AppData/Local/ms-playwright/chromium-1223/chrome-win64/chrome.exe'
  });
  const page = await browser.newPage();

  // 拦截所有 JS 请求并保存
  const jsBundles = [];
  page.on('response', async resp => {
    const url = resp.url();
    const ct = resp.headers()['content-type'] || '';
    if ((ct.includes('javascript') || url.endsWith('.js')) && url.includes('innook.cn')) {
      try {
        const body = await resp.text();
        jsBundles.push({ url, size: body.length });
        const fname = 'innook-bundle-' + jsBundles.length + '.js';
        fs.writeFileSync(path.join(OUTPUT_DIR, fname), body);
        console.log('Saved JS:', fname, 'size:', body.length);
      } catch(e) {}
    }
  });

  // 通过 Wayback Machine 加载（绕过 DNS 劫持）
  console.log('Loading via Wayback Machine...');
  try {
    await page.goto('https://web.archive.org/web/20260609051215/https://www.innook.cn/', {
      waitUntil: 'networkidle',
      timeout: 45000
    });
  } catch(e) {
    console.log('Timeout, continuing...');
  }

  await page.waitForTimeout(8000);

  // 获取渲染后的完整 DOM
  const html = await page.evaluate(() => document.documentElement.outerHTML);
  fs.writeFileSync(path.join(OUTPUT_DIR, 'rendered.html'), html);
  console.log('Rendered HTML size:', html.length);

  // 截图
  await page.screenshot({ path: path.join(OUTPUT_DIR, 'screenshot.png'), fullPage: true });

  // 获取所有 Tailwind 类名（分析设计系统）
  const classes = await page.evaluate(() => {
    const all = [...document.querySelectorAll('*')].flatMap(el => [...el.classList]);
    return [...new Set(all)].sort();
  });
  fs.writeFileSync(path.join(OUTPUT_DIR, 'tailwind-classes.json'), JSON.stringify(classes, null, 2));
  console.log('Unique classes:', classes.length);

  // 获取 CSS 变量（设计系统颜色）
  const cssVars = await page.evaluate(() => {
    const root = document.documentElement;
    const styles = getComputedStyle(root);
    const vars = {};
    for (const sheet of document.styleSheets) {
      try {
        for (const rule of sheet.cssRules) {
          if (rule.selectorText === ':root' || rule.selectorText === '*') {
            for (const prop of rule.style) {
              if (prop.startsWith('--')) {
                vars[prop] = rule.style.getPropertyValue(prop);
              }
            }
          }
        }
      } catch(e) {}
    }
    return vars;
  });
  fs.writeFileSync(path.join(OUTPUT_DIR, 'css-variables.json'), JSON.stringify(cssVars, null, 2));

  // 获取内联样式和关键元素的计算样式
  const computedStyles = await page.evaluate(() => {
    const elements = {
      body: document.body,
      bootScreen: document.querySelector('.boot-screen'),
      inviteForm: document.querySelector('form'),
      input: document.querySelector('input'),
      button: document.querySelector('button'),
    };
    const result = {};
    for (const [name, el] of Object.entries(elements)) {
      if (!el) continue;
      const cs = getComputedStyle(el);
      result[name] = {
        background: cs.background,
        color: cs.color,
        fontFamily: cs.fontFamily,
        fontSize: cs.fontSize,
        borderRadius: cs.borderRadius,
        backdropFilter: cs.backdropFilter,
        boxShadow: cs.boxShadow,
      };
    }
    return result;
  });
  fs.writeFileSync(path.join(OUTPUT_DIR, 'computed-styles.json'), JSON.stringify(computedStyles, null, 2));

  console.log('JS bundles captured:', jsBundles.length);
  console.log('Done! Output in:', OUTPUT_DIR);

  await browser.close();
})();
