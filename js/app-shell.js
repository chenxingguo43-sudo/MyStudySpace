(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.AppShell = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  'use strict';

  const PAGES = Object.freeze({
    home: { href: 'index.html', label: '首页', icon: '⌂' },
    reader: { href: 'reader.html', label: 'Reader', icon: '▱' },
    vocabulary: { href: 'vocabulary.html', label: 'Vocabulary', icon: '☷' },
    my: { href: 'profile.html', label: '我的', icon: '◯' }
  });
  const STATE_PREFIX = 'v1_app_page_state:';

  function resolvePage(page) { return Object.prototype.hasOwnProperty.call(PAGES, page) ? page : 'home'; }
  function stateKey(page) { return STATE_PREFIX + resolvePage(page); }
  function isAndroidDocument(documentRef) {
    const marker = documentRef && documentRef.querySelector && documentRef.querySelector('meta[name="app-runtime"]');
    return Boolean(marker && marker.getAttribute('content') === 'android');
  }
  function readState(storage, page) {
    try { return JSON.parse(storage.getItem(stateKey(page)) || 'null'); } catch (_error) { return null; }
  }
  function writeState(storage, page, locationRef, scrollY) {
    const value = { href: locationRef ? locationRef.href : '', scrollY: Math.max(0, Number(scrollY) || 0), savedAt: Date.now() };
    try { storage.setItem(stateKey(page), JSON.stringify(value)); } catch (_error) { /* storage can be unavailable */ }
    return value;
  }
  function restoreScroll(windowRef, storage, page) {
    const state = readState(storage, page);
    if (!state || !Number.isFinite(state.scrollY) || state.scrollY <= 0) return false;
    windowRef.setTimeout(function () { windowRef.scrollTo(0, state.scrollY); }, 0);
    return true;
  }
  function mount(options) {
    const documentRef = options && options.document || root.document;
    const windowRef = options && options.window || root;
    const storage = options && options.storage || root.sessionStorage;
    const page = resolvePage(options && options.current);
    if (!documentRef || !isAndroidDocument(documentRef)) return { mounted: false, page };
    if (documentRef.querySelector('.app-shell-nav')) return { mounted: true, page };

    documentRef.documentElement.classList.add('app-shell-enabled');
    documentRef.body.classList.add('app-shell-enabled');
    const nav = documentRef.createElement('nav');
    nav.className = 'app-shell-nav';
    nav.setAttribute('aria-label', '主导航');
    nav.innerHTML = Object.keys(PAGES).map(function (key) {
      const item = PAGES[key];
      const current = key === page ? ' aria-current="page"' : '';
      return '<a class="app-shell-nav__item" data-app-page="' + key + '" href="' + item.href + '"' + current + '>' +
        '<span class="app-shell-nav__icon" aria-hidden="true">' + item.icon + '</span>' +
        '<span class="app-shell-nav__label">' + item.label + '</span></a>';
    }).join('');
    nav.addEventListener('click', function (event) {
      const link = event.target.closest('[data-app-page]');
      if (link) writeState(storage, page, windowRef.location, windowRef.scrollY);
    });
    documentRef.body.appendChild(nav);
    windowRef.addEventListener('pagehide', function () { writeState(storage, page, windowRef.location, windowRef.scrollY); }, { once: true });
    restoreScroll(windowRef, storage, page);
    bindAndroidBack(windowRef, page, storage);
    return { mounted: true, page, nav };
  }
  function bindAndroidBack(windowRef, page, storage) {
    const app = windowRef.Capacitor && windowRef.Capacitor.Plugins && windowRef.Capacitor.Plugins.App;
    if (!isAndroidDocument(windowRef.document) || !app || typeof app.addListener !== 'function' || windowRef.__v1AppShellBackBound) return false;
    windowRef.__v1AppShellBackBound = true;
    app.addListener('backButton', function () { handleAndroidBack(windowRef, page, storage, app); });
    return true;
  }
  function handleAndroidBack(windowRef, page, storage, app) {
    writeState(storage, page, windowRef.location, windowRef.scrollY);
    if (typeof windowRef.appShellHandleBack === 'function' && windowRef.appShellHandleBack() === true) return 'page';
    if (page === 'home') {
      if (app && typeof app.exitApp === 'function') { app.exitApp(); return 'exit'; }
      return 'home-root';
    }
    if (windowRef.history && windowRef.history.length > 1) { windowRef.history.back(); return 'history'; }
    return 'root';
  }
  return { PAGES, STATE_PREFIX, bindAndroidBack, handleAndroidBack, isAndroidDocument, mount, readState, resolvePage, restoreScroll, stateKey, writeState };
});
