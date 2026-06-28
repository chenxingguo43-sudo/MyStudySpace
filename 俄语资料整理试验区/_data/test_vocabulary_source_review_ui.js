const { chromium } = require('playwright');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1365, height: 900 } });
    await page.goto('http://localhost:3000/vocabulary.html', { waitUntil: 'networkidle' });
    await page.waitForFunction(
      () => Array.isArray(window.allWords)
        && window.allWords.length > 0
        && window.coordLexemeIndex
        && window.coordSentences
        && typeof window.lookupSourceExamples === 'function',
      null,
      { timeout: 25000 }
    );

    await page.evaluate(() => {
      const target = '\u043d\u0430\u0433\u0440\u0430\u0434\u0430';
      const word = window.allWords.find((item) => (
        item.word || ''
      ).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() === target);
      if (!word) throw new Error('target word not found');
      window.deck = [{ id: word.id }];
      window.currentPos = 0;
      window.delayedQueue = [];
      window.flipped = false;
      window.renderCard();
      window.flipCard();
    });

    await page.waitForTimeout(500);
    await page.evaluate(() => {
      const toggles = Array.from(document.querySelectorAll('.fold-toggle'));
      toggles[toggles.length - 1].click();
    });
    await page.waitForTimeout(900);

    const state = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.source-ex-item'));
      return {
        itemCount: items.length,
        highlightedCount: document.querySelectorAll('.source-ex-hit').length,
        actionGroups: document.querySelectorAll('.source-ex-review-actions').length,
        firstActions: Array.from(document.querySelectorAll('.source-ex-review-btn')).map((btn) => btn.dataset.review),
      };
    });

    assert(state.itemCount > 0, 'expected at least one source example');
    assert(state.highlightedCount > 0, 'expected matched word highlight in source examples');
    assert(state.actionGroups === state.itemCount, 'expected one review action group per source example');
    ['good', 'mismatch', 'long', 'translation'].forEach((status) => {
      assert(state.firstActions.includes(status), `expected review button: ${status}`);
    });

    await page.click('.source-ex-review-btn[data-review="mismatch"]');
    const persisted = await page.evaluate(() => {
      const key = 'vocabSourceExampleReviews:v1';
      const saved = JSON.parse(localStorage.getItem(key) || '{}');
      const active = document.querySelector('.source-ex-review-btn.active');
      return {
        savedCount: Object.keys(saved).length,
        activeReview: active && active.dataset.review,
      };
    });
    assert(persisted.savedCount > 0, 'expected review choice to be saved');
    assert(persisted.activeReview === 'mismatch', 'expected clicked review button to become active');
  } finally {
    await browser.close();
  }
})();
