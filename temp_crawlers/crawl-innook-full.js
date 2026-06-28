// crawl-innook-full.js — 用邀请码进入 innook.cn，完整爬取所有场景、音乐、配置数据
const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, 'innook-full');
const INVITE_CODE = '326076';

(async () => {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:/Users/梅子/AppData/Local/ms-playwright/chromium-1223/chrome-win64/chrome.exe'
  });
  const page = await browser.newPage();

  // 捕获所有网络请求
  const networkLog = [];
  page.on('response', async resp => {
    const url = resp.url();
    const ct = resp.headers()['content-type'] || '';
    const entry = { url: url.substring(0, 400), status: resp.status(), ct: ct.substring(0, 60) };
    // 保存 API 响应
    if (ct.includes('json') || url.includes('api') || url.includes('scenes') || url.includes('music')) {
      try {
        const text = await resp.text();
        entry.body = text.substring(0, 5000);
        const safeName = url.replace(/[^a-zA-Z0-9]/g, '_').slice(-80);
        fs.writeFileSync(path.join(OUTPUT_DIR, 'api_' + safeName + '.txt'), text);
      } catch(e) {}
    }
    // 保存图片资源 URL
    if (ct.includes('image') || ct.includes('video') || url.match(/\.(jpg|mp4|png|svg|webp)/)) {
      entry.media = true;
    }
    networkLog.push(entry);
  });

  console.log('1. Loading innook.cn...');
  try {
    await page.goto('https://www.innook.cn/', { waitUntil: 'networkidle', timeout: 20000 });
  } catch(e) {
    console.log('   Timeout, continuing...');
  }
  await page.waitForTimeout(3000);

  // 截图邀请码页面
  await page.screenshot({ path: path.join(OUTPUT_DIR, 'step1-invite.png') });

  console.log('2. Entering invite code:', INVITE_CODE);
  const input = await page.$('input[maxlength="6"]');
  if (input) {
    await input.fill(INVITE_CODE);
    await page.waitForTimeout(1000);
    // 点击提交按钮
    const submitBtn = await page.$('button[type="submit"]');
    if (submitBtn) {
      await submitBtn.click();
      console.log('   Clicked submit');
    }
    await page.waitForTimeout(5000);
  }

  // 截图场景选择页面
  await page.screenshot({ path: path.join(OUTPUT_DIR, 'step2-after-code.png'), fullPage: true });

  // 获取完整渲染后的 HTML
  const html = await page.evaluate(() => document.documentElement.outerHTML);
  fs.writeFileSync(path.join(OUTPUT_DIR, 'step2-rendered.html'), html);
  console.log('   HTML size:', html.length);

  // 提取所有场景卡片信息
  const scenes = await page.evaluate(() => {
    const cards = document.querySelectorAll('[class*="scene"], [class*="card"], [data-scene]');
    return [...cards].map(card => ({
      text: card.innerText,
      classes: card.className,
      dataAttrs: Object.fromEntries([...card.attributes].filter(a => a.name.startsWith('data-')).map(a => [a.name, a.value])),
      images: [...card.querySelectorAll('img')].map(img => img.src),
    }));
  });
  fs.writeFileSync(path.join(OUTPUT_DIR, 'scenes-data.json'), JSON.stringify(scenes, null, 2));
  console.log('   Scene cards found:', scenes.length);

  // 提取所有图片 URL
  const allImages = await page.evaluate(() => {
    return [...document.querySelectorAll('img')].map(img => ({
      src: img.src,
      alt: img.alt,
      classes: img.className,
    }));
  });
  fs.writeFileSync(path.join(OUTPUT_DIR, 'all-images.json'), JSON.stringify(allImages, null, 2));
  console.log('   Images found:', allImages.length);

  // 提取所有视频 URL
  const allVideos = await page.evaluate(() => {
    return [...document.querySelectorAll('video, video source')].map(v => ({
      src: v.src,
      tag: v.tagName,
    }));
  });
  fs.writeFileSync(path.join(OUTPUT_DIR, 'all-videos.json'), JSON.stringify(allVideos, null, 2));
  console.log('   Videos found:', allVideos.length);

  // 提取所有音频 URL
  const allAudio = await page.evaluate(() => {
    return [...document.querySelectorAll('audio, audio source')].map(a => ({
      src: a.src,
      tag: a.tagName,
      loop: a.loop,
    }));
  });
  fs.writeFileSync(path.join(OUTPUT_DIR, 'all-audio.json'), JSON.stringify(allAudio, null, 2));
  console.log('   Audio found:', allAudio.length);

  // 提取 CSS 变量（设计系统）
  const cssVars = await page.evaluate(() => {
    const vars = {};
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
  fs.writeFileSync(path.join(OUTPUT_DIR, 'css-variables.json'), JSON.stringify(cssVars, null, 2));
  console.log('   CSS variables:', Object.keys(cssVars).length);

  // 提取液态玻璃效果的完整 CSS 规则
  const glassRules = await page.evaluate(() => {
    const rules = [];
    for (const sheet of document.styleSheets) {
      try {
        for (const rule of sheet.cssRules) {
          if (rule.cssText && (
            rule.cssText.includes('liquid-glass') ||
            rule.cssText.includes('glass-control') ||
            rule.cssText.includes('backdrop-filter') ||
            rule.cssText.includes('ink-warm') ||
            rule.cssText.includes('ink-soft')
          )) {
            rules.push(rule.cssText);
          }
        }
      } catch(e) {}
    }
    return rules;
  });
  fs.writeFileSync(path.join(OUTPUT_DIR, 'glass-rules.json'), JSON.stringify(glassRules, null, 2));
  console.log('   Glass CSS rules:', glassRules.length);

  // 尝试点击"进入自习室"按钮
  const enterBtn = await page.$('text=进入自习室');
  if (enterBtn) {
    console.log('3. Clicking "进入自习室"...');
    await enterBtn.click();
    await page.waitForTimeout(5000);
    await page.screenshot({ path: path.join(OUTPUT_DIR, 'step3-main-app.png'), fullPage: true });
    const mainHTML = await page.evaluate(() => document.documentElement.outerHTML);
    fs.writeFileSync(path.join(OUTPUT_DIR, 'step3-rendered.html'), mainHTML);
    console.log('   Main app HTML size:', mainHTML.length);
  }

  // 保存网络日志
  fs.writeFileSync(path.join(OUTPUT_DIR, 'network-log.json'), JSON.stringify(networkLog, null, 2));
  console.log('\nNetwork requests:', networkLog.length);

  // 保存所有媒体 URL
  const mediaURLs = networkLog.filter(r => r.media).map(r => r.url);
  fs.writeFileSync(path.join(OUTPUT_DIR, 'media-urls.json'), JSON.stringify(mediaURLs, null, 2));
  console.log('Media URLs:', mediaURLs.length);

  console.log('\nDone! Output in:', OUTPUT_DIR);
  await browser.close();
})();
