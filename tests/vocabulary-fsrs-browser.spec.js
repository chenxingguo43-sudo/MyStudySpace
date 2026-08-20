'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { chromium } = require('playwright');

const baseUrl = process.env.BELYE_NOCHI_TEST_URL;
const outputDirectory = path.join(__dirname, '..', 'test-results', 'fsrs-phase3-browser');
const browserCandidates = [
  process.env.BELYE_NOCHI_TEST_BROWSER,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
].filter(Boolean);

test('desktop and mobile keep legacy scheduling while snapshotting takeover state', { skip: !baseUrl }, async () => {
  const executablePath = browserCandidates.find(candidate => fs.existsSync(candidate));
  assert.ok(executablePath, 'Chrome or Edge is required for browser acceptance');
  fs.mkdirSync(outputDirectory, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath });
  try {
    for (const viewport of [
      { name: 'desktop', width: 1440, height: 900, isMobile: false },
      { name: 'mobile', width: 390, height: 844, isMobile: true }
    ]) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        isMobile: viewport.isMobile,
        deviceScaleFactor: 1
      });
      await context.addInitScript(function () {
        localStorage.setItem('vocabulary-review-records', JSON.stringify({
          legacyFuture: {
            mastery: 5, interval: 30, easeFactor: 2.7,
            history: [{ date: '2026-08-01', rating: 5 }], nextReview: '2026-08-20'
          },
          legacyExpired: {
            mastery: 2, interval: 3, easeFactor: 2.1,
            history: [{ date: '2026-07-01', rating: 1 }], nextReview: '2026-07-02'
          }
        }));
      });
      const page = await context.newPage();
      const consoleErrors = [];
      const notFoundUrls = [];
      page.on('console', message => {
        if (message.type() === 'error') consoleErrors.push(message.text());
      });
      page.on('response', response => {
        if (response.status() === 404) notFoundUrls.push(response.url());
      });
      await page.goto(`${baseUrl}/vocabulary.html`, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForFunction(() => window.__belyeNochiLegacySnapshot && window.__belyeNochiLegacySnapshot.ok === true);
      const state = await page.evaluate(() => {
        const oldRecords = JSON.parse(localStorage.getItem('vocabulary-review-records'));
        const plan = window.__belyeNochiLegacyTransitionPlan;
        const body = document.body;
        return {
          channel: window.__belyeNochiVocabularySchedulingChannel,
          planCount: plan.legacyRecordCount,
          futureDate: plan.words.find(item => item.wordId === 'legacyFuture').calibrationDate,
          expiredDate: plan.words.find(item => item.wordId === 'legacyExpired').calibrationDate,
          oldMastery: oldRecords.legacyFuture.mastery,
          oldHistoryCount: oldRecords.legacyFuture.history.length,
          snapshotOk: window.__belyeNochiLegacySnapshot.ok,
          overflow: body.scrollWidth > document.documentElement.clientWidth + 1,
          cardAreaText: document.getElementById('cardArea').innerText.trim().length
        };
      });
      assert.equal(state.channel, 'legacy');
      assert.equal(state.planCount, 2);
      assert.equal(state.futureDate, '2026-08-20');
      assert.match(state.expiredDate, /^2026-(08|09)-\d{2}$/);
      assert.equal(state.oldMastery, 5);
      assert.equal(state.oldHistoryCount, 1);
      assert.equal(state.snapshotOk, true);
      assert.equal(state.overflow, false);
      assert.ok(state.cardAreaText > 0);
      assert.deepEqual(notFoundUrls.filter(url => url.startsWith(baseUrl)), []);
      assert.deepEqual(consoleErrors.filter(message => !/status of 404/i.test(message)), []);
      await page.screenshot({ path: path.join(outputDirectory, `${viewport.name}.png`), fullPage: true });
      await context.close();
    }
  } finally {
    await browser.close();
  }
});

test('the dormant Phase 4 route can switch a pending legacy word and roll back without data loss', { skip: !baseUrl }, async () => {
  const executablePath = browserCandidates.find(candidate => fs.existsSync(candidate));
  assert.ok(executablePath, 'Chrome or Edge is required for browser acceptance');
  const browser = await chromium.launch({ headless: true, executablePath });
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await context.addInitScript(function () {
      localStorage.setItem('vocabulary-review-records', JSON.stringify({
        legacy: { mastery: 5, interval: 60, easeFactor: 2.8, history: [], nextReview: '2026-07-01' }
      }));
      localStorage.setItem('vocabulary-scheduling-channel-v1', 'fsrs-phase4');
    });
    const page = await context.newPage();
    await page.goto(`${baseUrl}/vocabulary.html`, { waitUntil: 'networkidle', timeout: 30000 });
    const state = await page.evaluate(() => {
      const word = { id: 'legacy' };
      const switched = getActiveRecord(word);
      localStorage.removeItem('vocabulary-scheduling-channel-v1');
      vocabularySchedulingChannel = BelyeNochiVocabularyFsrsTransition.channel(localStorage);
      const rolledBack = getActiveRecord(word);
      return {
        switched,
        rolledBack,
        stored: JSON.parse(localStorage.getItem('vocabulary-review-records')).legacy
      };
    });
    assert.equal(state.switched.mastery, 0);
    assert.equal(state.switched.transitionStatus, 'legacy_pending_calibration');
    assert.match(state.switched.nextReview, /^2026-(08|09)-\d{2}$/);
    assert.equal(state.rolledBack.mastery, 5);
    assert.equal(state.stored.mastery, 5);
    assert.deepEqual(state.rolledBack, state.stored);
    await context.close();
  } finally {
    await browser.close();
  }
});

test('Phase 3.5 settings gate enables only after backup recovery and rolls back on desktop and mobile', { skip: !baseUrl }, async () => {
  const executablePath = browserCandidates.find(candidate => fs.existsSync(candidate));
  assert.ok(executablePath, 'Chrome or Edge is required for browser acceptance');
  const browser = await chromium.launch({ headless: true, executablePath });
  try {
    for (const viewport of [
      { name: 'phase35-desktop', width: 1440, height: 900, isMobile: false },
      { name: 'phase35-mobile', width: 390, height: 844, isMobile: true }
    ]) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        isMobile: viewport.isMobile,
        deviceScaleFactor: 1
      });
      await context.addInitScript(function () {
        localStorage.setItem('vocabulary-review-records', JSON.stringify({
          safeLegacy: {
            mastery: 5, interval: 30, easeFactor: 2.7,
            history: [{ date: '2026-08-01', rating: 5 }], nextReview: '2026-08-20'
          }
        }));
      });
      const page = await context.newPage();
      const consoleErrors = [];
      page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
      await page.goto(`${baseUrl}/vocabulary.html`, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForFunction(() => window.__belyeNochiLegacySnapshot && window.__belyeNochiLegacySnapshot.ok === true);
      await page.evaluate(() => showSettings());
      await page.waitForFunction(() => {
        const button = document.getElementById('schedulingAction');
        return button && !button.disabled && button.textContent !== '检查中...';
      });

      let action = await page.locator('#schedulingAction').textContent();
      if (action === '完成安全备份') {
        await page.locator('#schedulingAction').click();
        await page.waitForFunction(() => document.getElementById('schedulingAction').textContent === '启用 FSRS');
      }
      assert.equal(await page.locator('#schedulingAction').textContent(), '启用 FSRS');

      page.once('dialog', dialog => dialog.accept());
      await page.locator('#schedulingAction').click();
      await page.waitForFunction(() => localStorage.getItem('vocabulary-scheduling-channel-v1') === 'fsrs-phase4');
      await page.waitForFunction(() => document.getElementById('schedulingAction').textContent === '切回旧调度');
      const enabled = await page.evaluate(() => ({
        channel: window.__belyeNochiVocabularySchedulingChannel,
        stored: localStorage.getItem('vocabulary-review-records'),
        statusText: document.getElementById('schedulingStatus').innerText,
        bodyOverflow: document.body.scrollWidth > document.documentElement.clientWidth + 1,
        modalOverflow: document.querySelector('.modal-box').scrollWidth > document.querySelector('.modal-box').clientWidth + 1
      }));
      assert.equal(enabled.channel, 'fsrs-phase4');
      assert.equal(JSON.parse(enabled.stored).safeLegacy.mastery, 5);
      assert.match(enabled.statusText, /数据库 \d+ 条 · 待同步 0 条 · 最近备份 \d{4}-\d{2}-\d{2} · 本次未触发恢复/);
      assert.match(enabled.statusText, /已验证备份同时保存在第二位置/);
      assert.equal(enabled.bodyOverflow, false);
      assert.equal(enabled.modalOverflow, false);
      await page.screenshot({ path: path.join(outputDirectory, `${viewport.name}.png`), fullPage: true });

      await page.locator('#schedulingAction').click();
      await page.waitForFunction(() => !localStorage.getItem('vocabulary-scheduling-channel-v1'));
      const rolledBack = await page.evaluate(() => ({
        channel: window.__belyeNochiVocabularySchedulingChannel,
        record: JSON.parse(localStorage.getItem('vocabulary-review-records')).safeLegacy
      }));
      assert.equal(rolledBack.channel, 'legacy');
      assert.equal(rolledBack.record.mastery, 5);
      assert.equal(rolledBack.record.nextReview, '2026-08-20');
      assert.deepEqual(consoleErrors.filter(message => !/status of 404/i.test(message)), []);
      await context.close();
    }
  } finally {
    await browser.close();
  }
});
