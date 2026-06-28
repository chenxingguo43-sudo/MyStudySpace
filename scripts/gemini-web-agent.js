#!/usr/bin/env node
/**
 * Gemini Web Agent — Windows Edition
 *
 * 连接 Chrome CDP (端口 9222)，操控 Gemini Web：
 *   1. 找到/创建 Gemini 标签页
 *   2. 发送 batch 翻译 prompt
 *   3. 等待响应完成
 *   4. 提取文本并保存
 *
 * 用法:
 *   node scripts/gemini-web-agent.js < prompt.txt
 *   node scripts/gemini-web-agent.js "переведите слова..."
 *   node scripts/gemini-web-agent.js --file data/gemini-translate-prompt.txt
 *   node scripts/gemini-web-agent.js --smoke
 *   node scripts/gemini-web-agent.js --pro --file prompt.txt    # Pro Extended 模式
 */

const { chromium } = require('playwright-core');

// ── Config ──
const CDP_URL           = 'http://127.0.0.1:9222';
const GEMINI_URL        = 'https://gemini.google.com/app';
const RESPONSE_TIMEOUT  = 600_000; // 10 min
const POLL_INTERVAL     = 3_000;   // 3s
const MAX_RETRIES       = 2;
const INIT_TIMEOUT      = 30_000;   // 30s for initial page load
let   _preSendTextLen   = 0;        // tracked in sendPrompt, checked in waitForResponse

// ── CLI ──
const args = process.argv.slice(2);
const isSmoke = args.includes('--smoke');
const isPro    = args.includes('--pro');
const fileIdx = args.indexOf('--file');
let prompt = '';

if (isSmoke) {
  // Smoke test — no prompt needed
  run('');
} else if (fileIdx >= 0) {
  const fs = require('fs');
  prompt = fs.readFileSync(args[fileIdx + 1], 'utf8');
  run(prompt);
} else if (args.length > 0 && !args[0].startsWith('--')) {
  prompt = args.join(' ');
  run(prompt);
} else {
  // Read from stdin
  let chunks = [];
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', c => chunks.push(c));
  process.stdin.on('end', () => {
    prompt = Buffer.concat(chunks).toString('utf8');
    run(prompt);
  });
  process.stdin.on('error', () => {
    console.error('[gemini] No stdin input. Use --smoke for test, --file for batch, or pipe text.');
    process.exit(1);
  });
  // If nothing piped in 1 second, treat as error
  setTimeout(() => {
    if (chunks.length === 0) {
      console.error('[gemini] No input. Usage: node scripts/gemini-web-agent.js --smoke | --file <path> | "prompt text"');
      process.exit(1);
    }
  }, 1000);
}

// ── Main ──
async function run(prompt) {
  const tStart = Date.now();
  let browser, page;
  const hasPrompt = prompt && prompt.trim().length > 0;

  try {
    // 1. Connect to Chrome via CDP
    console.error('[gemini] Connecting to Chrome CDP...');
    browser = await chromium.connectOverCDP(CDP_URL);
    console.error('[gemini] Connected. Contexts:', browser.contexts().length);

    // 2. Find or create Gemini tab
    page = await findOrCreateGeminiTab(browser);

    if (!hasPrompt) {
      console.error('[gemini] Smoke test OK — Gemini tab ready');
      console.log('SMOKE_OK');
      process.exit(0);
    }

    // 3. Switch model if needed
    if (isPro) {
      console.error('[gemini] Switching to Pro Extended...');
      await ensureProExtended(page);
    }

    // 4. Send prompt
    console.error(`[gemini] Sending prompt (${prompt.length} chars)...`);
    await sendPrompt(page, prompt);

    // 5. Wait for response
    console.error('[gemini] Waiting for response...');
    const response = await waitForResponse(page, tStart);

    // 6. Output
    console.log(response);
    console.error(`[gemini] Done. Response: ${response.length} chars, elapsed: ${((Date.now()-tStart)/1000).toFixed(0)}s`);
    process.exit(0);

  } catch (e) {
    console.error(`[gemini] ERROR: ${e.message}`);
    process.exit(1);
  } finally {
    if (browser) {
      try { await browser.close(); } catch(e) {}
    }
  }
}

// ── Activate Gemini Pro Extended Thinking ──
// 适配中文 Gemini UI (2026-06):
//   "打开模式选择器" → "思考等级" → "扩展"
//   选择器: gem-menu-item
async function ensureProExtended(page) {
  // 1. Check current state
  const label = page.locator('button[aria-label*="打开模式选择器"], button[aria-label*="开启模式挑选器"], button[aria-label*="Open model selector"]').first();
  let current = '';
  try { current = (await label.getAttribute('aria-label')) || ''; } catch(e) {}
  if (current.includes('扩展') || current.includes('延长') || current.includes('Extended')) {
    console.error('[gemini] Pro Extended already active, skipping');
    return;
  }

  // 2. Open model selector
  console.error('[gemini] Opening model selector...');
  await label.click();
  await page.waitForTimeout(1500);

  // 3. Click "思考等级" / "Thinking" to expand submenu
  let items = await page.evaluate(() =>
    [...document.querySelectorAll('gem-menu-item')].map((el, i) => ({ i, text: el.innerText?.trim() }))
  );
  let thinkingIdx = -1;
  for (const it of items) {
    if (it.text && (it.text.includes('思考等级') || it.text.includes('思考程度') || it.text.includes('Thinking'))) {
      thinkingIdx = it.i; break;
    }
  }
  if (thinkingIdx >= 0) {
    console.error('[gemini] Expanding thinking level submenu...');
    await page.locator('gem-menu-item').nth(thinkingIdx).click();
    await page.waitForTimeout(1500);
  } else {
    console.error('[gemini] Warning: thinking level item not found');
    await page.keyboard.press('Escape');
    return;
  }

  // 4. Click "扩展" / "Extended" (NOT "标准")
  items = await page.evaluate(() =>
    [...document.querySelectorAll('gem-menu-item')].map((el, i) => ({ i, text: el.innerText?.trim() }))
  );
  let extendedIdx = -1;
  for (const it of items) {
    if (it.text && (it.text.includes('扩展') || it.text.includes('延长') || it.text.includes('Extended')) && !it.text.includes('标准')) {
      extendedIdx = it.i; break;
    }
  }
  if (extendedIdx >= 0) {
    console.error('[gemini] Selecting Extended thinking...');
    await page.locator('gem-menu-item').nth(extendedIdx).click();
    await page.waitForTimeout(1000);
  } else {
    console.error('[gemini] Warning: extended option not found in submenu');
  }

  // 5. Close menu and verify
  await page.keyboard.press('Escape');
  await page.waitForTimeout(1000);
  try {
    const verify = (await label.getAttribute('aria-label')) || '';
    console.error('[gemini] Pro Extended activated:', verify?.substring(0, 60));
  } catch(e) {}
}

// ── Find or create Gemini tab ──
async function findOrCreateGeminiTab(browser) {
  // connectOverCDP 下已有 contexts，直接用第一个 context 的 pages
  const contexts = browser.contexts();
  console.error(`[gemini] Found ${contexts.length} browser context(s)`);

  for (const ctx of contexts) {
    try {
      const pages = ctx.pages();
      console.error(`[gemini] Context has ${pages.length} page(s)`);
      for (const pg of pages) {
        try {
          const url = pg.url();
          console.error(`[gemini]   Page: ${url.substring(0, 100)}`);
          if (url.includes('gemini.google.com') && !url.includes('about:blank')) {
            console.error('[gemini] Using existing Gemini tab');
            return pg;
          }
        } catch(e) {}
      }
    } catch(e) {}
  }

  // No Gemini tab found — try to reuse first context's blank/new page
  console.error('[gemini] Creating new Gemini tab...');
  const ctx = contexts[0] || browser;
  const page = await ctx.newPage();
  try {
    await page.goto(GEMINI_URL, { waitUntil: 'domcontentloaded', timeout: INIT_TIMEOUT });
  } catch(e) {
    console.error('[gemini] Goto error (may already be navigating):', e.message);
  }
  await page.waitForTimeout(5000);
  return page;
}

// ── Send prompt into the Gemini input ──
async function sendPrompt(page, text) {
  // Wait for editor to appear
  const editorSelector = '[role="textbox"], div[contenteditable="true"], .ql-editor, [aria-label*="输入"]';
  await page.waitForSelector(editorSelector, { timeout: 10000 });

  // For large text, use clipboard paste
  if (text.length > 5000) {
    console.error('[gemini] Large text — using clipboard paste...');
    await page.click(editorSelector);
    await page.waitForTimeout(500);

    // Type a comma to trigger Angular change detection, then delete
    await page.keyboard.type(',');
    await page.waitForTimeout(200);
    await page.keyboard.press('Backspace');

    // Set clipboard content
    await page.evaluate((t) => navigator.clipboard.writeText(t), text);
    await page.waitForTimeout(300);

    // Paste
    await page.keyboard.press('Control+v');
    await page.waitForTimeout(1000);
  } else {
    await page.fill(editorSelector, text);
    await page.waitForTimeout(500);
  }

  // Wait for send button
  await page.waitForTimeout(500);
  const sendSelector = 'button[aria-label*="发送"], button[aria-label*="Send"]';
  try {
    await page.waitForSelector(sendSelector, { timeout: 5000 });
  } catch(e) {
    // Try pressing Enter if no send button
    console.error('[gemini] Send button not found, pressing Enter...');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(2000);
    return;
  }

  // Snapshot current body text length before sending
  _preSendTextLen = await page.evaluate(() => document.body.innerText?.length || 0);
  console.error(`[gemini] Pre-send text length: ${_preSendTextLen}`);

  await page.click(sendSelector);
  console.error('[gemini] Prompt sent, waiting for generation...');

  // After sending, the prompt appears in conversation history — re-snapshot
  await page.waitForTimeout(3000);
  _preSendTextLen = await page.evaluate(() => document.body.innerText?.length || 0);
  console.error(`[gemini] Post-send text baseline: ${_preSendTextLen}`);
}

// ── Wait for response completion ──
async function waitForResponse(page, tStart) {
  const deadline = tStart + RESPONSE_TIMEOUT;

  while (Date.now() < deadline) {
    await page.waitForTimeout(POLL_INTERVAL);

    // Check that body text has grown significantly (new Gemini response appeared)
    const curLen = await page.evaluate(() => document.body.innerText?.length || 0);
    const hasNewContent = curLen > _preSendTextLen + 200;

    // Check for completion markers
    const copyBtn = await page.$('button[aria-label*="复制"], button[aria-label*="Copy"]');
    const thumbsUp = await page.$('button[aria-label*="Good response"], button[aria-label*="好"]');

    if ((copyBtn || thumbsUp) && hasNewContent) {
      console.error('[gemini] Response completion detected, stabilizing...');
      // Wait for streaming to finish — text should be stable
      let lastLen = curLen;
      for (let s = 0; s < 6; s++) {
        await page.waitForTimeout(2000);
        const newLen = await page.evaluate(() => document.body.innerText?.length || 0);
        if (newLen === lastLen) {
          console.error('[gemini] Text stabilized, extracting');
          await page.waitForTimeout(500);
          return extractResponse(page);
        }
        console.error(`[gemini] Still streaming... ${lastLen} → ${newLen}`);
        lastLen = newLen;
      }
      console.error('[gemini] Stabilize timeout, extracting current state');
      return extractResponse(page);
    }

    // Check if input editor is re-enabled with new content
    const editor = await page.$('[role="textbox"][aria-disabled="false"]');
    if (editor && hasNewContent) {
      console.error('[gemini] Editor re-enabled, stabilizing...');
      let lastLen = curLen;
      for (let s = 0; s < 4; s++) {
        await page.waitForTimeout(1500);
        const newLen = await page.evaluate(() => document.body.innerText?.length || 0);
        if (newLen === lastLen) break;
        lastLen = newLen;
      }
      await page.waitForTimeout(500);
      return extractResponse(page);
    }

    // Timeout check
    const elapsed = Date.now() - tStart;
    if (elapsed > 30000 && elapsed % 10000 < POLL_INTERVAL) {
      console.error(`[gemini] Still waiting... ${(elapsed/1000).toFixed(0)}s elapsed`);
    }
  }

  // Timeout — try to extract whatever we have
  console.error('[gemini] Timeout reached, extracting partial response...');
  return extractResponse(page);
}

// ── Extract response text from the page ──
async function extractResponse(page) {
  try {
    const text = await page.evaluate(() => {
      const body = document.body.innerText || '';

      // Look for the LAST model response — starts after "Gemini 说" and ends before "Flash"
      const geminiSayIdx = body.lastIndexOf('Gemini 说');
      if (geminiSayIdx < 0) return body;

      const afterSay = body.substring(geminiSayIdx + 7); // skip "Gemini 说"
      const flashIdx = afterSay.lastIndexOf('\nFlash');
      const response = flashIdx > 0 ? afterSay.substring(0, flashIdx).trim() : afterSay.trim();

      return response;
    });

    return text || '';
  } catch(e) {
    console.error('[gemini] Extract error:', e.message);
    return '';
  }
}

// Export for use as a module
module.exports = { findOrCreateGeminiTab, sendPrompt, waitForResponse, extractResponse };
