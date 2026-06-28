const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // Block external requests (CDN) so they don't hang
  console.log('Enabling request interception...');
  await page.setRequestInterception(true);
  page.on('request', request => {
    const url = request.url();
    if (url.includes('localhost') || url.includes('127.0.0.1')) {
      request.continue();
    } else {
      request.abort();
    }
  });
  console.log('OK');

  // Main page
  console.log('Loading index.html...');
  await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded', timeout: 10000 });
  console.log('  loaded, taking screenshot...');
  await page.screenshot({ path: path.join(__dirname, 'screenshot_main.png') });
  console.log('  -> screenshot_main.png saved');

  // Pomodoro page
  console.log('Loading pomodoro.html...');
  await page.goto('http://localhost:3000/pomodoro.html', { waitUntil: 'domcontentloaded', timeout: 10000 });
  console.log('  loaded, taking screenshot...');
  await page.screenshot({ path: path.join(__dirname, 'screenshot_pomodoro.png') });
  console.log('  -> screenshot_pomodoro.png saved');

  await browser.close();
  console.log('Done');
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
