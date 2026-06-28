// crawl-innook-css.js — 精确爬取 innook.cn 玻璃面板的计算样式
const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');
const OUTPUT = path.join(__dirname, 'innook-css-data');

(async () => {
  fs.mkdirSync(OUTPUT, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:/Users/梅子/AppData/Local/ms-playwright/chromium-1223/chrome-win64/chrome.exe'
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  console.log('Loading innook.cn...');
  try { await page.goto('https://www.innook.cn/', { waitUntil: 'networkidle', timeout: 20000 }); } catch(e) {}
  await page.waitForTimeout(3000);

  // 输入邀请码
  const input = await page.$('input[maxlength="6"]');
  if (input) {
    await input.fill('326076');
    await page.waitForTimeout(500);
    const btn = await page.$('button[type="submit"]');
    if (btn) await btn.click();
    await page.waitForTimeout(5000);
    console.log('Invite code entered');
  }

  // 截图
  await page.screenshot({ path: path.join(OUTPUT, 'innook-full.png'), fullPage: true });

  // 1. 精确提取 liquid-glass 的计算样式
  const glassStyles = await page.evaluate(() => {
    const results = [];
    document.querySelectorAll('.liquid-glass').forEach((el, i) => {
      const cs = getComputedStyle(el);
      const before = getComputedStyle(el, '::before');
      results.push({
        index: i,
        tag: el.tagName,
        classes: el.className.substring(0, 200),
        // 核心玻璃属性
        background: cs.background,
        backgroundColor: cs.backgroundColor,
        backdropFilter: cs.backdropFilter || cs.webkitBackdropFilter || 'none',
        boxShadow: cs.boxShadow,
        borderRadius: cs.borderRadius,
        border: cs.border,
        overflow: cs.overflow,
        // 伪元素
        beforeContent: before.content,
        beforeBackground: before.background,
        beforeMask: before.mask || before.webkitMask || 'none',
        beforePadding: before.padding,
        beforePosition: before.position,
        beforeInset: before.inset,
      });
    });
    return results;
  });
  fs.writeFileSync(path.join(OUTPUT, 'glass-styles.json'), JSON.stringify(glassStyles, null, 2));
  console.log('Glass elements:', glassStyles.length);

  // 2. 提取 glass-control 的计算样式
  const controlStyles = await page.evaluate(() => {
    const results = [];
    document.querySelectorAll('.glass-control').forEach((el, i) => {
      const cs = getComputedStyle(el);
      const hover = getComputedStyle(el, ':hover');
      results.push({
        index: i,
        tag: el.tagName,
        classes: el.className.substring(0, 200),
        background: cs.backgroundColor,
        hoverBackground: hover.backgroundColor,
        borderRadius: cs.borderRadius,
        padding: cs.padding,
        border: cs.border,
        color: cs.color,
      });
    });
    return results;
  });
  fs.writeFileSync(path.join(OUTPUT, 'control-styles.json'), JSON.stringify(controlStyles, null, 2));
  console.log('Control elements:', controlStyles.length);

  // 3. 提取 Dock 区域的精确样式
  const dockStyles = await page.evaluate(() => {
    const dock = document.querySelector('[class*="study-controls"], [class*="dock"], [class*="bottom"]');
    if (!dock) return null;
    const cs = getComputedStyle(dock);
    return {
      classes: dock.className,
      background: cs.backgroundColor,
      backdropFilter: cs.backdropFilter || cs.webkitBackdropFilter,
      borderRadius: cs.borderRadius,
      padding: cs.padding,
      position: cs.position,
      bottom: cs.bottom,
      left: cs.left,
      width: cs.width,
      maxWidth: cs.maxWidth,
      display: cs.display,
      gridTemplateColumns: cs.gridTemplateColumns,
      gap: cs.gap,
      boxShadow: cs.boxShadow,
      border: cs.border,
    };
  });
  fs.writeFileSync(path.join(OUTPUT, 'dock-styles.json'), JSON.stringify(dockStyles, null, 2));
  console.log('Dock styles:', dockStyles ? 'found' : 'not found');

  // 4. 提取所有 CSS 变量
  const allVars = await page.evaluate(() => {
    const vars = {};
    for (const sheet of document.styleSheets) {
      try {
        for (const rule of sheet.cssRules) {
          if (rule.selectorText === ':root' || rule.selectorText === '*') {
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
  fs.writeFileSync(path.join(OUTPUT, 'css-variables.json'), JSON.stringify(allVars, null, 2));
  console.log('CSS variables:', Object.keys(allVars).length);

  // 5. 提取完整的 liquid-glass CSS 规则
  const glassRules = await page.evaluate(() => {
    const rules = [];
    for (const sheet of document.styleSheets) {
      try {
        for (const rule of sheet.cssRules) {
          if (rule.cssText && (
            rule.cssText.includes('liquid-glass') ||
            rule.cssText.includes('glass-control')
          )) {
            rules.push(rule.cssText.substring(0, 800));
          }
        }
      } catch(e) {}
    }
    return rules;
  });
  fs.writeFileSync(path.join(OUTPUT, 'glass-rules.json'), JSON.stringify(glassRules, null, 2));
  console.log('Glass CSS rules:', glassRules.length);

  // 6. 提取场景面板的布局信息
  const layoutInfo = await page.evaluate(() => {
    const panels = document.querySelectorAll('[class*="setup"], [class*="scene"], [class*="panel"], [class*="modal"]');
    return [...panels].map(p => {
      const cs = getComputedStyle(p);
      return {
        classes: p.className.substring(0, 150),
        position: cs.position,
        display: cs.display,
        gridTemplateColumns: cs.gridTemplateColumns,
        width: cs.width,
        maxWidth: cs.maxWidth,
        padding: cs.padding,
        borderRadius: cs.borderRadius,
        gap: cs.gap,
        backdropFilter: cs.backdropFilter || cs.webkitBackdropFilter,
      };
    });
  });
  fs.writeFileSync(path.join(OUTPUT, 'layout-info.json'), JSON.stringify(layoutInfo, null, 2));
  console.log('Layout panels:', layoutInfo.length);

  // 7. 提取背景层信息
  const bgLayers = await page.evaluate(() => {
    const bg = document.querySelectorAll('.background-media, [class*="bg-overlay"], [class*="gradient"]');
    return [...bg].map(el => {
      const cs = getComputedStyle(el);
      return {
        classes: el.className,
        tag: el.tagName,
        position: cs.position,
        zIndex: cs.zIndex,
        opacity: cs.opacity,
        background: cs.background?.substring(0, 200),
        backdropFilter: cs.backdropFilter || cs.webkitBackdropFilter,
      };
    });
  });
  fs.writeFileSync(path.join(OUTPUT, 'bg-layers.json'), JSON.stringify(bgLayers, null, 2));
  console.log('Background layers:', bgLayers.length);

  // 8. 完整 CSS 提取（从样式表）
  const fullCSS = await page.evaluate(() => {
    let css = '';
    for (const sheet of document.styleSheets) {
      try {
        for (const rule of sheet.cssRules) {
          css += rule.cssText + '\n';
        }
      } catch(e) {}
    }
    return css;
  });
  fs.writeFileSync(path.join(OUTPUT, 'full.css'), fullCSS);
  console.log('Full CSS size:', fullCSS.length);

  console.log('\nDone! All data in:', OUTPUT);
  await browser.close();
})();
