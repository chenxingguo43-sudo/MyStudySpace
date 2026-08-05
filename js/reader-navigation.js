(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.ReaderNavigation = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const CONTENT_VIEWS = new Set(['reading', 'study-card', 'zlatoust-rule']);

  function getBackTarget(state) {
    const view = state && state.curView || 'shelf';
    const book = state && state.curBook || null;
    if (CONTENT_VIEWS.has(view)) return book && book.id ? { action: 'chapters', bookId: book.id } : { action: 'shelf' };
    if (view === 'chapters') {
      if (book && (book.isB2Module || book.id === 'russian_b2')) return { action: 'b2-dashboard' };
      if (state && typeof state.isWorldPeopleBook === 'function' && state.isWorldPeopleBook(book)) return { action: 'world-people-dashboard' };
      return { action: 'shelf' };
    }
    if (view === 'reading-speaking-dashboard') return { action: 'world-people-dashboard' };
    if (view === 'world-people-dashboard' || view === 'b2-dashboard' || view === 'wrong-book') return { action: 'shelf' };
    return null;
  }

  function handleBack(options) {
    const settings = options || {};
    if (settings.closeTemporaryLayer && settings.closeTemporaryLayer()) return true;
    const target = getBackTarget(settings);
    if (!target) return false;
    if (settings.prepareToLeave && settings.prepareToLeave() === false) return true;
    if (target.action === 'chapters') settings.showChapters(target.bookId);
    else if (target.action === 'b2-dashboard') settings.showB2Dashboard();
    else if (target.action === 'world-people-dashboard') settings.showWorldPeopleDashboard();
    else settings.showShelf();
    return true;
  }

  return { CONTENT_VIEWS, getBackTarget, handleBack };
});
