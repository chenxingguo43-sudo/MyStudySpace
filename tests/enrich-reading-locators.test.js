'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { deriveLocator, updateLocatorNote, locatorOverride, enrichChapter } = require('../scripts/enrich-reading-locators');

test('creates an exact locator when the reviewed evidence is in the Reader paragraph', () => {
  const locator = deriveLocator({
    num: 1,
    answerAnalysis: { evidence: { ru: 'В музее хранятся редкие картины известных художников.' } }
  }, ['Заголовок', 'В музее хранятся редкие картины известных художников.']);
  assert.equal(locator.length, 1);
  assert.equal(locator[0].paragraphIndex, 1);
  assert.equal(locator[0].locatorLevel, 'exact');
});

test('creates a paragraph locator for a stable partial match with an OCR difference', () => {
  const locator = deriveLocator({
    num: 2,
    answerAnalysis: { evidence: { ru: 'Музей хранит редкие картины известных художников.' } }
  }, ['Музей хранит редкие картини известных художников и скульптуры.']);
  assert.equal(locator.length, 1);
  assert.equal(locator[0].paragraphIndex, 0);
  assert.equal(locator[0].locatorLevel, 'paragraph');
});

test('does not invent a locator when the Reader source is another text version', () => {
  const locator = deriveLocator({
    num: 3,
    answerAnalysis: { evidence: { ru: 'В музее собрана богатая коллекция живописи.' } }
  }, ['В городе открыли новый выставочный центр.']);
  assert.deepEqual(locator, []);
});

test('preserves a legacy source anchor and marks its supported locator level', () => {
  const chapter = {
    original: ['Владимир родился здесь и учился в Петербурге.'],
    exercises: [{
      num: 1,
      sourceAnchor: { paragraphIndex: 0, quote: 'родился здесь и учился' },
      answerAnalysis: { evidence: { ru: '' }, nextCheck: '' }
    }]
  };
  const stats = enrichChapter(chapter);
  assert.equal(stats.exact, 1);
  assert.equal(chapter.exercises[0].evidenceAnchors[0].locatorLevel, 'exact');
  assert.equal(chapter.exercises[0].answerAnalysis.locatorStatus, 'exact');
});

test('removes a stale unavailable note after exact source matching is restored', () => {
  const answerAnalysis = { nextCheck: '暂时没有可靠的原文定位，需要人工核对对应段落。；保留的人工备注' };
  updateLocatorNote(answerAnalysis, 'exact');
  assert.equal(answerAnalysis.nextCheck, '保留的人工备注');
});

test('splits mixed-language evidence into independently locatable Russian fragments', () => {
  const chapter = {
    original: ['Ландшафтные дизайнеры из 5 стран украсят городские площадки.', '20 июля — день торта: конкурс авторских арт-фартуков.'],
    exercises: [{
      num: 3,
      answerAnalysis: { evidence: { ru: 'Ландшафтные дизайнеры из 5 стран украсят городские площадки.（来自 5 个国家。）第 8 段：конкурс авторских арт-фартуков。' } }
    }]
  };
  const stats = enrichChapter(chapter);
  assert.equal(stats.exact, 1);
  assert.equal(chapter.exercises[0].evidenceAnchors[0].paragraphIndex, 0);
});

test('uses reviewed exact-sentence overrides for known adjacent-fragment OCR cases', () => {
  const chapter = {
    title: 'Текст 3.2.1 — Встреча',
    original: [
      'title',
      '— Я винодел, как только усадил меня в кресло, — и потому причисляю себя к служителям искусства. Виноделие — одно из самых древних искусств.',
      'other',
      '— Э-хе-хе! Если бы вы были помоложе, я бы уговорил вас заняться этим делом. Не всё же вам писать и писать. Обучил бы вас, как вот обучаю этому Любу.'
    ],
    exercises: [{ num: 7, answerAnalysis: { evidence: { ru: '' } } }]
  };
  const anchor = locatorOverride(chapter, chapter.exercises[0]);
  assert.equal(anchor.length, 0, 'fixture intentionally uses non-source paragraph indexes');
  chapter.original[22] = chapter.original[1];
  chapter.original[24] = chapter.original[3];
  const anchored = locatorOverride(chapter, chapter.exercises[0]);
  assert.equal(anchored[0].locatorLevel, 'exact');
});
