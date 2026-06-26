#!/usr/bin/env node
/**
 * Doubao Web Agent — Windows Edition
 *
 * 连接 Chrome CDP (端口 9222)，操控豆包网页版：
 *   1. 找到/创建豆包标签页
 *   2. 切换到专家模式
 *   3. 发送 prompt
 *   4. 等待响应完成
 *   5. 提取文本
 *
 * 用法:
 *   node scripts/doubao-web-agent.js --file prompt.txt
 *   node scripts/doubao-web-agent.js "переведите слова..."
 *   node scripts/doubao-web-agent.js --smoke
 *   node scripts/doubao-web-agent.js --expert --file prompt.txt  # 专家模式
 */

const { chromium } = require('playwright-core');

// ── Config ──
const CDP_URL           = 'http://127.0.0.1:9222';
const DOUBAO_URL        = 'https://www.doubao.com/chat/';
const RESPONSE_TIMEOUT  = 600_000;
const POLL_INTERVAL     = 3_000;

// ── CLI ──
const args = process.argv.slice(2);
const isSmoke  = args.includes('--smoke');
const isExpert = args.includes('--expert');
const fileIdx  = args.indexOf('--file');
let prompt = '';

if (isSmoke) {
  run('');
} else if (fileIdx >= 0) {
  prompt = require('fs').readFileSync(args[fileIdx + 1], 'utf8');
  run(prompt);
} else if (args.length > 0 && !args[0].startsWith('--')) {
  prompt = args.join(' ');
  run(prompt);
} else {
  let chunks = [];
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', c => chunks.push(c));
  process.stdin.on('end', () => { prompt = Buffer.concat(chunks).toString('utf8'); run(prompt); });
  process.stdin.on('error', () => { console.error('[doubao] No input'); process.exit(1); });
  setTimeout(() => { if (chunks.length === 0) { console.error('[doubao] Usage: --smoke | --file <path> | "text"'); process.exit(1); } }, 1000);
}

// ── Main ──
async function run(prompt) {
  const tStart = Date.now();
  let browser = null;
  const hasPrompt = prompt && prompt.trim().length > 0;

  try {
    console.error('[doubao] Connecting to Chrome CDP...');
    browser = await chromium.connectOverCDP(CDP_URL);
    console.error('[doubao] Connected.');

    // Find or create doubao tab
    let page = null;
    const pages = browser.contexts()[0].pages();
    for (const p of pages) {
      const url = await p.url();
      if (url.includes('doubao.com')) { page = p; break; }
    }
    if (!page) {
      page = await browser.contexts()[0].newPage();
      await page.goto(DOUBAO_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(5000);
    }
    console.error('[doubao] Page:', (await page.url()).substring(0, 80));

    if (!hasPrompt) {
      console.error('[doubao] Smoke test OK');
      console.log('SMOKE_OK');
      process.exit(0);
    }

    // Switch to expert mode if requested
    if (isExpert) {
      console.error('[doubao] Switching to 专家 mode...');
      await switchToExpert(page);
    }

    // Send prompt
    console.error(`[doubao] Sending (${prompt.length} chars)...`);
    await sendDoubaoPrompt(page, prompt);

    // Wait for response
    console.error('[doubao] Waiting for response...');
    const response = await waitForDoubaoResponse(page, tStart);

    // Output
    console.log(response);
    console.error(`[doubao] Done. ${response.length} chars, ${((Date.now()-tStart)/1000).toFixed(0)}s`);
    process.exit(0);

  } catch (e) {
    console.error(`[doubao] ERROR: ${e.message}`);
    process.exit(1);
  }
}

// ── Switch to expert mode ──
async function switchToExpert(page) {
  // Click the 专家 button
  const expertBtn = page.locator('button:has-text("专家")').first();
  try {
    await expertBtn.click({ timeout: 5000 });
    await page.waitForTimeout(1500);
    console.error('[doubao] 专家 mode activated');

    // Verify: the expert button should now have active styling
    const cls = await expertBtn.getAttribute('class');
    console.error('[doubao] Expert btn class:', cls?.substring(0, 60));
  } catch(e) {
    console.error('[doubao] Could not click 专家 button:', e.message);
  }
}

// ── Send prompt into doubao textarea ──
async function sendDoubaoPrompt(page, text) {
  // Doubao uses a textarea with placeholder "发消息..."
  const editor = page.locator('textarea[placeholder*="发消息"]').first();
  await editor.waitFor({ timeout: 10000 });
  await editor.click();
  await page.waitForTimeout(500);

  if (text.length > 5000) {
    // Clipboard paste for large text
    console.error('[doubao] Large text — clipboard paste...');
    await page.keyboard.type(',');
    await page.waitForTimeout(200);
    await page.keyboard.press('Backspace');
    await page.evaluate((t) => navigator.clipboard.writeText(t), text);
    await page.waitForTimeout(300);
    await page.keyboard.press('Control+v');
    await page.waitForTimeout(1000);
  } else {
    await editor.fill(text);
    await page.waitForTimeout(500);
  }

  // Click send — doubao's send button appears as a submit button near the textarea
  // Or press Enter
  await page.waitForTimeout(500);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(2000);
  console.error('[doubao] Prompt sent');
}

// ── Wait for doubao response ──
async function waitForDoubaoResponse(page, tStart) {
  const deadline = tStart + RESPONSE_TIMEOUT;

  while (Date.now() < deadline) {
    await page.waitForTimeout(POLL_INTERVAL);

    // Check if textarea is enabled again (means response done)
    const editor = page.locator('textarea[placeholder*="发消息"]').first();
    try {
      const isDisabled = await editor.isDisabled();
      if (!isDisabled) {
        await page.waitForTimeout(2000); // let final chars render
        return extractDoubaoResponse(page);
      }
    } catch(e) {}

    const elapsed = Date.now() - tStart;
    if (elapsed > 30000 && elapsed % 15000 < POLL_INTERVAL) {
      console.error(`[doubao] Still waiting... ${(elapsed/1000).toFixed(0)}s`);
    }
  }

  console.error('[doubao] Timeout — extracting partial...');
  return extractDoubaoResponse(page);
}

// ── Extract doubao response ──
async function extractDoubaoResponse(page) {
  try {
    return await page.evaluate(() => {
      const body = document.body.innerText || '';

      // Doubao format: user message → assistant reply
      // Find the last "豆包" (or model name) before the response
      // Responses typically come after the user prompt

      // Method: the response is the large text block between the user's message
      // and the next user message or the page footer

      // Look for AI-generated content markers
      const aiHint = body.indexOf('AI 生成可能有误');
      const userMsgIdx = body.lastIndexOf('你\n');
      if (userMsgIdx < 0) return body;

      const afterUser = body.substring(userMsgIdx);
      const lines = afterUser.split('\n');
      // First line after user message is usually the prompt text
      // Skip user's own message text, then everything after is the response
      const userEnd = afterUser.indexOf('\n\n');
      if (userEnd < 0) return afterUser;

      let response = afterUser.substring(userEnd).trim();
      // Remove footer
      const footerIdx = response.indexOf('AI 生成可能有误');
      if (footerIdx > 0) response = response.substring(0, footerIdx).trim();

      return response;
    });
  } catch(e) {
    console.error('[doubao] Extract error:', e.message);
    return '';
  }
}

module.exports = { switchToExpert, sendDoubaoPrompt, waitForDoubaoResponse, extractDoubaoResponse };
