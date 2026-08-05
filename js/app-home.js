(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.V1Home = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const BOOK_LABELS = {
    reading_speaking: 'В мире людей · 阅读口语', listening_speaking: 'В мире людей · 听力口语',
    writing_speaking: 'В мире людей · 写作口语', zlatoust_grammar: 'В мире людей · 语法词汇', russian_b2: '俄语 B2 全模块'
  };
  function readObject(storage, key, fallback) { try { const value = JSON.parse(storage.getItem(key) || ''); return value && typeof value === 'object' ? value : fallback; } catch (_error) { return fallback; } }
  function dueCount(storage, now) { const records = readObject(storage, 'vocabulary-review-records', {}); return Object.keys(records).filter(key => { const item = records[key] || {}; return !item.nextReview || new Date(item.nextReview).getTime() <= (now || Date.now()); }).length; }
  function pendingB2Exercises(progress, inventories, dashboard) {
    if (!dashboard || typeof dashboard.objectiveExerciseProgress !== 'function') return 0;
    return dashboard.objectiveExerciseProgress(inventories, progress, 'russian_b2').pending;
  }
  function getLastRead(storage) {
    return Object.keys(storage).filter(key => key.indexOf('rr_lastread_') === 0).map(key => readObject(storage, key, null)).filter(Boolean).sort((a, b) => new Date(b.updatedAt || b.savedAt || 0) - new Date(a.updatedAt || a.savedAt || 0))[0] || null;
  }
  function setText(documentRef, id, value) { const node = documentRef.getElementById(id); if (node) node.textContent = value; }
  function applyLastRead(documentRef, record) {
    if (!record) return;
    const book = record.bookId || record.book || record.id || 'reading_speaking';
    const chapter = Number.isFinite(Number(record.chapter)) ? Number(record.chapter) : (Number.isFinite(Number(record.ch)) ? Number(record.ch) : 0);
    const href = 'reader.html?book=' + encodeURIComponent(book) + '&ch=' + chapter;
    setText(documentRef, 'continue-heading', BOOK_LABELS[book] || '上次阅读的教材'); setText(documentRef, 'continueMeta', '上次学习到第 ' + (chapter + 1) + ' 节'); setText(documentRef, 'readerSummary', '继续上次阅读');
    const link = documentRef.getElementById('continueLink'), readerLink = documentRef.getElementById('homeReaderLink');
    if (link) { link.href = href; link.textContent = '继续'; } if (readerLink) readerLink.href = href;
  }
  async function loadB2Inventories(fetchImpl, dashboard) {
    const manifest = await fetchImpl('data/textbook/russian_b2/book.json').then(response => response.json());
    const grammar = (manifest.modules || []).find(module => module.id === 'grammar');
    if (!grammar) return [];
    const paths = dashboard.getDashboardChapterPaths(grammar, { chapters: grammar.chapters });
    const chapters = await Promise.all(paths.map(path => fetchImpl(path).then(response => response.json())));
    return chapters.map(chapter => dashboard.chapterInventory(chapter)).filter(Boolean);
  }
  async function init(options) {
    const settings = options || {}, storage = settings.storage || localStorage, documentRef = settings.document || document, dashboard = settings.dashboard || root.RussianB2Dashboard;
    setText(documentRef, 'homeGreeting', (new Date().getHours() < 6 ? '夜深了，按自己的节奏学习' : new Date().getHours() < 12 ? '早上好，继续你的俄语' : new Date().getHours() < 18 ? '下午好，继续你的俄语' : '晚上好，继续你的俄语'));
    applyLastRead(documentRef, getLastRead(storage));
    const due = dueCount(storage); setText(documentRef, 'vocabularySummary', due ? '今天待复习 ' + due + ' 个词汇' : '暂时没有到期词汇');
    try { const inventories = await loadB2Inventories(settings.fetch || fetch, dashboard); const pending = pendingB2Exercises(readObject(storage, 'rr_b2_progress_v1', {}), inventories, dashboard); setText(documentRef, 'b2Summary', pending ? 'B2 语法待完成 ' + pending + ' 道练习' : 'B2 语法练习已完成'); }
    catch (_error) { setText(documentRef, 'b2Summary', 'B2 进度暂不可用'); }
  }
  return { applyLastRead, dueCount, getLastRead, init, loadB2Inventories, pendingB2Exercises, readObject };
});

if (typeof document !== 'undefined') V1Home.init({ document, storage: localStorage }).catch(function() {});
