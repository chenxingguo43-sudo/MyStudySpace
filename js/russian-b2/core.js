(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.RussianB2App = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  function createRussianB2App({ storage = globalThis.localStorage } = {}) {
    const modules = new Map();
    const read = key => storage instanceof Map ? storage.get(key) : storage.getItem(key);
    const write = (key, value) => storage instanceof Map ? storage.set(key, value) : storage.setItem(key, value);
    return {
      registerModule(id, adapter) { modules.set(id, adapter); },
      getModule(id) { return modules.get(id); },
      key(scope, id) { return `russian_b2:${scope}:${id}`; },
      loadState(scope, id) { const value = read(this.key(scope, id)); return value ? JSON.parse(value) : null; },
      saveState(scope, id, value) { write(this.key(scope, id), JSON.stringify(value)); }
    };
  }
  return { createRussianB2App };
});
