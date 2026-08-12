'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const transfer = require('../js/app-file-transfer');

test('web export keeps Blob download and revokes its temporary URL', async () => {
  const actions = [];
  const document = {
    createElement(tag) {
      assert.equal(tag, 'a');
      return { click() { actions.push({ href: this.href, download: this.download }); } };
    }
  };
  const urlApi = {
    createObjectURL(blob) { assert.equal(blob.type, transfer.MIME_TYPE); return 'blob:test'; },
    revokeObjectURL(url) { actions.push({ revoked: url }); }
  };
  const result = await transfer.exportText({
    runtime: 'web-server', document, urlApi, text: '{"ok":true}', fileName: 'archive.json'
  });
  assert.deepEqual(result, { cancelled: false, fileName: 'archive.json', shared: false });
  assert.deepEqual(actions, [
    { href: 'blob:test', download: 'archive.json' },
    { revoked: 'blob:test' }
  ]);
});

test('Android export writes only to app cache then opens the system share sheet', async () => {
  const calls = [];
  const capacitor = { Plugins: {
    Filesystem: { async writeFile(options) { calls.push(['write', options]); return { uri: 'content://cache/archive.json' }; } },
    Share: { async share(options) { calls.push(['share', options]); } }
  } };
  const result = await transfer.exportText({
    runtime: 'android', capacitor, text: '{"ok":true}', fileName: 'archive.json'
  });
  assert.equal(result.shared, true);
  assert.equal(calls[0][1].directory, 'CACHE');
  assert.equal(calls[0][1].recursive, true);
  assert.equal(calls[1][1].url, 'content://cache/archive.json');
  assert.equal(JSON.parse(Buffer.from(calls[0][1].data, 'base64').toString('utf8')).ok, true);
});

test('Android import uses the system picker and reads a moved-file URI through Filesystem', async () => {
  const capacitor = { Plugins: {
    FilePicker: { async pickFiles() { return { files: [{ name: 'archive.json', size: 10, mimeType: transfer.MIME_TYPE, path: 'content://picked/archive.json' }] }; } },
    Filesystem: { async readFile(options) {
      assert.equal(options.path, 'content://picked/archive.json');
      return { data: Buffer.from('{"schema":"test"}').toString('base64') };
    } }
  } };
  const result = await transfer.importText({ runtime: 'android', capacitor });
  assert.equal(result.cancelled, false);
  assert.equal(result.text, '{"schema":"test"}');
});

test('file cancellation is harmless and common file failures have readable messages', async () => {
  const cancelled = await transfer.importText({
    runtime: 'android',
    capacitor: { Plugins: { FilePicker: { async pickFiles() { throw new Error('User cancelled picker'); } } } }
  });
  assert.equal(cancelled.cancelled, true);
  const emptySelection = await transfer.importText({
    runtime: 'android',
    capacitor: { Plugins: { FilePicker: { async pickFiles() { return { files: [] }; } } } }
  });
  assert.equal(emptySelection.cancelled, true);
  assert.match(transfer.friendlyError(new Error('ENOENT file not found'), '读取学习档案').message, /移动或删除/);
  assert.match(transfer.friendlyError(new Error('Quota exceeded: no space'), '导出学习档案').message, /空间不足/);
  assert.match(transfer.friendlyError(new Error('permission denied'), '读取学习档案').message, /权限/);
});

test('imports reject non-JSON and implausibly large files before reading them', async () => {
  assert.throws(() => transfer.validatePickedFile({ name: 'notes.txt', type: 'text/plain', size: 10 }), /JSON/);
  assert.throws(() => transfer.validatePickedFile({ name: 'archive.json', type: transfer.MIME_TYPE, size: transfer.MAX_IMPORT_BYTES + 1 }), /512 MB/);
  const result = await transfer.importText({
    runtime: 'web-server',
    file: { name: 'archive.json', type: transfer.MIME_TYPE, size: 2, async text() { return '{}'; } }
  });
  assert.equal(result.text, '{}');
});

test('missing Android plugins fail explicitly instead of pretending an export succeeded', async () => {
  await assert.rejects(
    transfer.exportText({ runtime: 'android', capacitor: { Plugins: {} }, text: '{}', fileName: 'archive.json' }),
    /插件尚未安装/
  );
  await assert.rejects(transfer.importText({ runtime: 'android', capacitor: { Plugins: {} } }), /插件尚未安装/);
});

test('profile page loads the unified archive and exposes separate quick, complete and import actions', () => {
  const root = path.resolve(__dirname, '..');
  const html = fs.readFileSync(path.join(root, 'profile.html'), 'utf8');
  const page = fs.readFileSync(path.join(root, 'js', 'app-profile-page.js'), 'utf8');
  for (const script of ['js/app-runtime.js', 'js/app-archive.js', 'js/app-file-transfer.js', 'js/app-profile-page.js']) {
    assert.ok(html.includes('src="' + script + '"'), script);
  }
  assert.match(page, /id="exportQuick"/);
  assert.match(page, /id="exportComplete"/);
  assert.match(page, /id="importArchive"/);
  assert.match(page, /importLearningArchive\(storage, indexedDb/);
});
