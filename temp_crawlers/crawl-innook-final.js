// crawl-innook-final.js — 等待 SPA 完全渲染后提取所有数据
const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');
const OUTPUT = path.join(__dirname, 'innook-final');

(async () => {
  fs.mkdirSync(OUTPUT, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:/Users/梅子/AppData/Local/ms-playwright/chromium-1223/chrome-win64/chrome.exe'
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  console.log('1. Loading innook.cn...');
  try { await page.goto('https://www.innook.cn/', { waitUntil: 'networkidle', timeout: 30000 }); } catch(e) {}
  await page.waitForTimeout(5000);

  // 输入邀请码
  const input = await page.$('input[maxlength="6"]');
  if (input) {
    console.log('2. Entering invite code...');
    await input.fill('326076');
    await page.waitForTimeout(1000);
    const btn = await page.$('button[type="submit"]');
    if (btn) await btn.click();
    // 等待更长时间让 React 渲染
    console.log('   Waiting for SPA to render...');
    await page.waitForTimeout(10000);
  }

  // 截图
  await page.screenshot({ path: path.join(OUTPUT, 'after-code.png'), fullPage: true });

  // 获取完整 HTML
  const html = await page.evaluate(() => document.documentElement.outerHTML);
  fs.writeFileSync(path.join(OUTPUT, 'full-rendered.html'), html);
  console.log('   HTML size:', html.length);

  // 如果 HTML 很短，说明 SPA 没渲染，再等
  if (html.length < 5000) {
    console.log('   HTML too short, waiting more...');
    await page.waitForTimeout(15000);
    const html2 = await page.evaluate(() => document.documentElement.outerHTML);
    fs.writeFileSync(path.join(OUTPUT, 'full-rendered-2.html'), html2);
    console.log('   HTML size after extra wait:', html2.length);
    await page.screenshot({ path: path.join(OUTPUT, 'after-extra-wait.png'), fullPage: true });
  }

  // 提取所有元素的精确布局
  const allElements = await page.evaluate(() => {
    const results = [];
    document.querySelectorAll('*').forEach(el => {
      const cs = getComputedStyle(el);
      const classes = el.className;
      if (typeof classes === 'string' && (
        classes.includes('liquid-glass') ||
        classes.includes('glass-control') ||
        classes.includes('dock') ||
        classes.includes('timer') ||
        classes.includes('goal') ||
        classes.includes('scene') ||
        classes.includes('music') ||
        classes.includes('header') ||
        classes.includes('nav') ||
        classes.includes('footer') ||
        classes.includes('focus') ||
        classes.includes('fab') ||
        classes.includes('setup') ||
        classes.includes('study') ||
        classes.includes('brand')
      )) {
        results.push({
          tag: el.tagName,
          classes: classes.substring(0, 300),
          text: el.innerText?.substring(0, 100),
          // 精确布局
          position: cs.position,
          display: cs.display,
          width: cs.width,
          height: cs.height,
          maxWidth: cs.maxWidth,
          padding: cs.padding,
          margin: cs.margin,
          borderRadius: cs.borderRadius,
          bottom: cs.bottom,
          left: cs.left,
          right: cs.right,
          top: cs.top,
          background: cs.backgroundColor,
          backdropFilter: cs.backdropFilter || cs.webkitBackdropFilter,
          boxShadow: cs.boxShadow,
          border: cs.border,
          gridTemplateColumns: cs.gridTemplateColumns,
          gridTemplateRows: cs.gridTemplateRows,
          gap: cs.gap,
          flexDirection: cs.flexDirection,
          alignItems: cs.alignItems,
          justifyContent: cs.justifyContent,
          overflow: cs.overflow,
          zIndex: cs.zIndex,
          opacity: cs.opacity,
          fontSize: cs.fontSize,
          fontFamily: cs.fontFamily,
          fontWeight: cs.fontWeight,
          color: cs.color,
          letterSpacing: cs.letterSpacing,
          textTransform: cs.textTransform,
        });
      }
    });
    return results;
  });
  fs.writeFileSync(path.join(OUTPUT, 'all-elements.json'), JSON.stringify(allElements, null, 2));
  console.log('   Elements found:', allElements.length);

  // 提取 ::before 伪元素样式
  const pseudoStyles = await page.evaluate(() => {
    const results = [];
    document.querySelectorAll('.liquid-glass, .glass-control').forEach((el, i) => {
      const before = getComputedStyle(el, '::before');
      results.push({
        index: i,
        tag: el.tagName,
        classes: el.className?.substring(0, 150),
        beforeContent: before.content,
        beforeBackground: before.background?.substring(0, 300),
        beforeMask: before.mask || before.webkitMask,
        beforePadding: before.padding,
        beforePosition: before.position,
        beforeInset: before.inset,
        beforeBorderRadius: before.borderRadius,
      });
    });
    return results;
  });
  fs.writeFileSync(path.join(OUTPUT, 'pseudo-styles.json'), JSON.stringify(pseudoStyles, null, 2));
  console.log('   Pseudo styles:', pseudoStyles.length);

  // 提取页面上所有文本内容
  const textContent = await page.evaluate(() => document.body.innerText);
  fs.writeFileSync(path.join(OUTPUT, 'text-content.txt'), textContent);
  console.log('   Text content length:', textContent.length);

  // 提取所有 data-screen 属性
  const screens = await page.evaluate(() => {
    return [...document.querySelectorAll('[data-screen]')].map(el => ({
      screen: el.dataset.screen,
      immersive: el.dataset.immersive,
      classes: el.className?.substring(0, 200),
    }));
  });
  fs.writeFileSync(path.join(OUTPUT, 'screens.json'), JSON.stringify(screens, null, 2));
  console.log('   Screens:', screens.length);

  console.log('\nDone!');
  await browser.close();
})();
