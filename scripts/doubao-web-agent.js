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
  const expertBtn = page.locator('button:has-text("专家")').first();
  try {
    await expertBtn.click({ force: true, timeout: 5000 });
    await page.waitForTimeout(1500);
    console.error('[doubao] 专家 mode activated');
  } catch(e) {
    console.error('[doubao] Could not click 专家 button:', e.message);
  }
}

// ── Send prompt into doubao textarea ──
async function sendDoubaoPrompt(page, text) {
  // Doubao uses a textarea with placeholder "发消息..."
  const editor = page.locator('textarea[placeholder*="发消息"]').first();
  await editor.waitFor({ timeout: 10000 });

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
    // Use evaluate()+native setter to bypass pointer interception
    await page.evaluate((t) => {
      const ta = document.querySelector('textarea[placeholder*="发消息"]');
      if (ta) {
        ta.focus();
        const nativeSetter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
        nativeSetter.call(ta, t);
        ta.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }, text);
    await page.waitForTimeout(800);
  }

  // Send via Enter
  await page.keyboard.press('Enter');
  await page.waitForTimeout(2000);
  console.error('[doubao] Prompt sent');
}

// ── Wait for doubao response ──
async function waitForDoubaoResponse(page, tStart) {
  const deadline = tStart + RESPONSE_TIMEOUT;

  while (Date.now() < deadline) {
    await page.waitForTimeout(POLL_INTERVAL);

    // Check for "已完成思考" or Russian text = response done
    try {
      const hasResponse = await page.evaluate(() => {
        const body = document.body.innerText || '';
        return body.includes('已完成思考') || /[а-яА-ЯёЁ]/.test(body);
      });
      if (hasResponse) {
        // Wait a bit more for full rendering
        await page.waitForTimeout(5000);
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

      // Doubao expert mode output format:
      //   ... thinking process ... "已完成思考" ... actual response
      // Response is the main content block after thinking is done

      // Method 1: find "已完成思考" or similar completion markers
      const doneMarkers = ['已完成思考', '已完成', '回答'];
      let startIdx = -1;
      for (const marker of doneMarkers) {
        const idx = body.indexOf(marker);
        if (idx >= 0) { startIdx = idx; break; }
      }

      let response = '';
      if (startIdx >= 0) {
        // Get everything after the marker
        response = body.substring(startIdx).trim();
        // Remove the marker line itself
        const nl = response.indexOf('\n');
        if (nl > 0 && nl < 50) response = response.substring(nl).trim();
      } else {
        // Fallback: look for content after user's prompt
        const userIdx = body.lastIndexOf('你\n');
        if (userIdx >= 0) response = body.substring(userIdx).trim();
        else response = body;
      }

      // Remove footer suggestions (doubao suggests follow-up questions after the response)
      const suggestionIdx = response.indexOf('用俄语完成体');
      if (suggestionIdx < 0) {
        const extraFooter = ['AI 生成可能有误', '专家\n帮我写作', '新对话'];
        for (const f of extraFooter) {
          const fi = response.indexOf(f);
          if (fi > 50) response = response.substring(0, fi).trim();
        }
      } else if (suggestionIdx > 50) {
        response = response.substring(0, suggestionIdx).trim();
      }

      // Clean up leading thinking process noise
      const cleanMarkers = ['规划回答内容结构', '明确回答内容'];
      for (const cm of cleanMarkers) {
        const ci = response.indexOf(cm);
        if (ci >= 0 && ci < 100) {
          const nextNl = response.indexOf('\n', ci);
          if (nextNl > 0) response = response.substring(nextNl).trim();
        }
      }

      return response;
    });
  } catch(e) {
    console.error('[doubao] Extract error:', e.message);
    return '';
  }
}

module.exports = { switchToExpert, sendDoubaoPrompt, waitForDoubaoResponse, extractDoubaoResponse };
