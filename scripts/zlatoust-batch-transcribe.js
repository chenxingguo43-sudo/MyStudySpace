#!/usr/bin/env node
/**
 * Zlatoust Batch Transcriber
 *
 * Feeds PDF page images to Gemini Flash in batches of 5, extracts raw
 * transcriptions, and caches results to disk. Resumes from last completed
 * batch on re-run.
 *
 * Usage:
 *   node scripts/zlatoust-batch-transcribe.js
 */

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');

// ── Config ──
const CDP_URL           = 'http://127.0.0.1:9222';
const GEMINI_URL        = 'https://gemini.google.com/app';
const PAGES_DIR         = 'D:/MyStudySpace/_zlatoust_pages';
const OUTPUT_DIR        = 'D:/MyStudySpace/_zlatoust_transcriptions';
const BATCH_SIZE        = 5;
const RESPONSE_TIMEOUT  = 300_000; // 5 min per batch
const POLL_INTERVAL     = 5_000;   // check every 5s
const MAX_RETRIES       = 2;

// ── Prompt template ──
const TRANSCRIPTION_PROMPT = `Транскрибируй эти страницы из учебника РКИ B2-C1 (Златоуст, "Учебно-тренировочные тесты по русскому языку как иностранному. Выпуск 1. Грамматика. Лексика").

Для каждого упражнения выдай строго в этом формате:

Номер: (printed exercise number)
Тип: single-choice
Вопрос: (exact Russian text, preserve … for blank)
А) ...
Б) ...
В) ...
Г) ...

Перед каждой новой страницей вставь строку: --- PAGE N ---
N — это номер печатной страницы (printed page number) если он виден на странице.

Верни ТОЛЬКО размеченный текст. Без введения, без комментариев, без "вот результат".`;

// ── Helpers ──
function log(msg) { console.error(`[zlatoust] ${msg}`); }

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function findOrCreateGeminiTab(browser) {
  const contexts = browser.contexts();
  log(`Found ${contexts.length} browser context(s)`);
  for (const ctx of contexts) {
    const pages = ctx.pages();
    for (const p of pages) {
      try {
        const url = p.url();
        if (url.startsWith('https://gemini.google.com/')) {
          log(`Found existing Gemini tab: ${url}`);
          return p;
        }
      } catch (e) { /* page closed */ }
    }
  }
  const ctx = contexts[0];
  const page = await ctx.newPage();
  log('Creating new Gemini tab...');
  await page.goto(GEMINI_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await sleep(3000);
  return page;
}

async function ensureFlashModel(page) {
  // Click model selector
  const selector = page.locator('button[aria-label*="打开模式选择器"], button[aria-label*="Open model selector"]').first();
  try {
    const label = await selector.getAttribute('aria-label');
    if (label && (label.includes('Flash') || label.includes('flash'))) {
      log('Flash model already active');
      return;
    }
  } catch (e) {}

  log('Opening model selector...');
  await selector.click();
  await sleep(1500);

  // Click "3.6 Flash" option
  const flashOption = page.locator('gem-menu-item').filter({ hasText: '3.6 Flash' }).first();
  try {
    await flashOption.click({ timeout: 5000 });
    log('Selected 3.6 Flash');
    await sleep(1000);
    await page.keyboard.press('Escape'); // close menu
    await sleep(500);
  } catch (e) {
    log('Warning: could not select Flash model, continuing with current');
    await page.keyboard.press('Escape');
  }
}

async function startNewChat(page) {
  // Click "New chat" link in sidebar
  try {
    const newChatLink = page.getByRole('link', { name: '发起新对话' });
    await newChatLink.click({ timeout: 5000 });
    log('Started new chat');
    await sleep(3000);
    await ensureFlashModel(page);
  } catch (e) {
    log('Warning: could not start new chat, continuing');
  }
}

async function sendBatch(page, imagePaths) {
  log(`Sending ${imagePaths.length} images...`);

  // Click upload button (may need to click twice — once to open menu, once on menu item)
  const uploadBtn = page.getByRole('button', { name: '上传和工具' });
  await uploadBtn.click();
  await sleep(1500);

  // Click "Upload file" via test-id
  const uploadMenuItem = page.locator('[data-test-id="local-images-files-uploader-button"]').first();
  await uploadMenuItem.click();
  const fileChooser = await page.waitForEvent('filechooser', { timeout: 15000 });

  await fileChooser.setFiles(imagePaths);
  await sleep(2000);

  // Type prompt
  const textbox = page.getByRole('textbox', { name: '为 Gemini 输入提示' });
  await textbox.fill(TRANSCRIPTION_PROMPT);
  await sleep(500);

  // Click send
  const sendBtn = page.getByRole('button', { name: '发送' });
  await sendBtn.click();
  log('Sent batch, waiting for response...');
}

async function waitForResponse(page, startTime) {
  const deadline = startTime + RESPONSE_TIMEOUT;

  while (Date.now() < deadline) {
    await sleep(POLL_INTERVAL);

    // Check for response content
    try {
      const contents = await page.evaluate(() => {
        const msgs = document.querySelectorAll('.response-content');
        if (!msgs.length) return null;
        const el = msgs[msgs.length - 1];
        const text = el.innerText;
        // Response is complete if it has substantial content and the send button is visible again
        const sendBtns = document.querySelectorAll('button[aria-label="发送"]');
        const canSendAgain = sendBtns.length > 0;
        return { text, canSendAgain, length: text.length };
      });

      if (contents && contents.canSendAgain && contents.length > 500) {
        // Strip "Gemini 说" header
        const cleanText = contents.text.replace(/^Gemini 说\n\n/, '');
        log(`Response received: ${cleanText.length} chars`);
        return cleanText;
      }
    } catch (e) {
      // Page might be navigating
    }

    const elapsed = Math.round((Date.now() - startTime) / 1000);
    if (elapsed % 30 === 0) log(`Still waiting... ${elapsed}s elapsed`);
  }

  throw new Error('Response timeout');
}

async function processBatch(page, imagePaths, batchIndex) {
  const startTime = Date.now();

  // Remove uploaded images from previous batch by starting new chat
  await startNewChat(page);

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await sendBatch(page, imagePaths);
      const response = await waitForResponse(page, startTime);
      return response;
    } catch (e) {
      log(`Attempt ${attempt}/${MAX_RETRIES} failed: ${e.message}`);
      if (attempt < MAX_RETRIES) {
        log('Starting new chat and retrying...');
        await startNewChat(page);
      } else {
        throw e;
      }
    }
  }
}

// ── Main ──
async function main() {
  const allPages = fs.readdirSync(PAGES_DIR)
    .filter(f => f.match(/^p\d{3}\.jpg$/))
    .sort()
    .map(f => ({ name: f, path: path.join(PAGES_DIR, f) }));

  log(`Found ${allPages.length} page images`);

  // Determine which pages are already transcribed
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const transcribedPages = new Set();
  const existingFiles = fs.readdirSync(OUTPUT_DIR).filter(f => f.endsWith('.txt'));
  existingFiles.forEach(f => {
    const match = f.match(/batch_(\d+)/);
    if (match) transcribedPages.add(parseInt(match[1]));
  });

  // Group pages into batches
  const batches = [];
  let currentBatch = [];
  for (const page of allPages) {
    const pageNum = parseInt(page.name.match(/p(\d+)\.jpg/)[1]);
    if (transcribedPages.has(pageNum)) continue;
    currentBatch.push(page);
    if (currentBatch.length >= BATCH_SIZE) {
      batches.push(currentBatch);
      currentBatch = [];
    }
  }
  if (currentBatch.length > 0) batches.push(currentBatch);

  if (batches.length === 0) {
    log('All pages already transcribed!');
    return;
  }
  log(`${batches.length} batches remaining (${batches.reduce((sum, b) => sum + b.length, 0)} pages)`);

  // Connect to Chrome
  log('Connecting to Chrome CDP...');
  const browser = await chromium.connectOverCDP(CDP_URL);
  log('Connected');

  try {
    const page = await findOrCreateGeminiTab(browser);
    await ensureFlashModel(page);

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      const pageNums = batch.map(p => p.name.replace(/p(\d+)\.jpg/, '$1')).join(',');
      log(`\n========== Batch ${i + 1}/${batches.length} (pages ${pageNums}) ==========`);

      try {
        const imagePaths = batch.map(p => p.path);
        const response = await processBatch(page, imagePaths, i);

        // Save result
        const firstPage = batch[0].name.replace(/p(\d+)\.jpg/, '$1');
        const lastPage = batch[batch.length - 1].name.replace(/p(\d+)\.jpg/, '$1');
        const outFile = path.join(OUTPUT_DIR, `batch_p${firstPage}-${lastPage}.txt`);
        fs.writeFileSync(outFile, response, 'utf8');
        log(`Saved ${outFile} (${response.length} chars)`);

        // Small pause between batches to avoid rate limiting
        await sleep(3000);
      } catch (e) {
        log(`ERROR on batch ${i + 1}: ${e.message}`);
        log('Saving progress and exiting...');
        break;
      }
    }
  } finally {
    await browser.close();
    log('Done');
  }

  // Print summary
  const savedFiles = fs.readdirSync(OUTPUT_DIR).filter(f => f.endsWith('.txt'));
  log(`\nSummary: ${savedFiles.length} batch files saved to ${OUTPUT_DIR}`);
  let totalExercises = 0;
  savedFiles.forEach(f => {
    const content = fs.readFileSync(path.join(OUTPUT_DIR, f), 'utf8');
    const count = (content.match(/Номер: \d+/g) || []).length;
    totalExercises += count;
    log(`  ${f}: ${count} exercises`);
  });
  log(`Total exercises transcribed: ${totalExercises}`);
}

main().catch(e => { log(`FATAL: ${e.message}`); process.exit(1); });
