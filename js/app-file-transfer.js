(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.V1ArchiveFileTransfer = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const MIME_TYPE = 'application/json';
  const MAX_IMPORT_BYTES = 512 * 1024 * 1024;

  function archiveFileName(complete, now) {
    const date = (now || new Date()).toISOString().slice(0, 10);
    return 'belye-nochi-' + (complete ? 'complete' : 'quick') + '-' + date + '.json';
  }

  function plugin(capacitor, name) {
    return capacitor && capacitor.Plugins && capacitor.Plugins[name];
  }

  function isCancelled(error) {
    const text = String(error && (error.code || error.message) || error || '').toLowerCase();
    return /cancel|canceled|cancelled|user.*dismiss|pick.*cancel/.test(text);
  }

  function friendlyError(error, action) {
    if (isCancelled(error)) return { cancelled: true, message: '已取消' };
    const text = String(error && error.message || error || '');
    if (/quota|space|storage.*full|disk.*full|no space/i.test(text)) return { cancelled: false, message: '设备存储空间不足，无法' + action };
    if (/not found|does not exist|enoent|moved/i.test(text)) return { cancelled: false, message: '文件已被移动或删除，请重新选择' };
    if (/permission|denied|unauthorized/i.test(text)) return { cancelled: false, message: '没有文件访问权限，请重新选择文件' };
    return { cancelled: false, message: action + '失败：' + (text || '未知错误') };
  }

  function bytesToBase64(bytes) {
    if (typeof Buffer !== 'undefined') return Buffer.from(bytes).toString('base64');
    let binary = '';
    for (let offset = 0; offset < bytes.length; offset += 0x8000) {
      binary += String.fromCharCode.apply(null, bytes.subarray(offset, offset + 0x8000));
    }
    return btoa(binary);
  }

  function base64ToText(value) {
    if (typeof Buffer !== 'undefined') return Buffer.from(value, 'base64').toString('utf8');
    const binary = atob(value), bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return new TextDecoder().decode(bytes);
  }

  function textToBase64(value) {
    return bytesToBase64(new TextEncoder().encode(value));
  }

  function webDownload(documentRef, urlApi, text, fileName) {
    const blob = new Blob([text], { type: MIME_TYPE });
    const url = urlApi.createObjectURL(blob);
    const link = documentRef.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    urlApi.revokeObjectURL(url);
    return { cancelled: false, fileName, shared: false };
  }

  async function androidShare(capacitor, text, fileName) {
    const filesystem = plugin(capacitor, 'Filesystem'), share = plugin(capacitor, 'Share');
    if (!filesystem || typeof filesystem.writeFile !== 'function' || !share || typeof share.share !== 'function') {
      throw new Error('Android 文件与分享插件尚未安装');
    }
    const written = await filesystem.writeFile({
      path: 'exports/' + fileName,
      data: textToBase64(text),
      directory: 'CACHE',
      recursive: true
    });
    if (!written || !written.uri) throw new Error('导出文件没有可分享地址');
    await share.share({ title: '白夜俄语学习档案', url: written.uri, dialogTitle: '保存或分享学习档案' });
    return { cancelled: false, fileName, shared: true, uri: written.uri };
  }

  async function exportText(options) {
    const settings = options || {}, text = String(settings.text || ''), fileName = settings.fileName;
    if (!text || !fileName) throw new Error('导出内容或文件名为空');
    try {
      if (settings.runtime === 'android') return await androidShare(settings.capacitor, text, fileName);
      return webDownload(settings.document, settings.urlApi || URL, text, fileName);
    } catch (error) {
      const result = friendlyError(error, '导出学习档案');
      if (result.cancelled) return result;
      throw new Error(result.message);
    }
  }

  function validatePickedFile(file) {
    if (!file) throw new Error('没有选择文件');
    if (Number.isFinite(file.size) && file.size > MAX_IMPORT_BYTES) throw new Error('档案超过 512 MB，请确认选择的是白夜俄语学习档案');
    const name = String(file.name || file.path || '').toLowerCase();
    const type = String(file.mimeType || file.type || '').toLowerCase();
    if (name && !name.endsWith('.json') && type !== MIME_TYPE) throw new Error('请选择 JSON 格式的白夜俄语学习档案');
    return file;
  }

  async function readWebFile(file) {
    validatePickedFile(file);
    if (typeof file.text === 'function') return file.text();
    throw new Error('当前浏览器无法读取所选文件');
  }

  async function pickAndroidFile(capacitor) {
    const picker = plugin(capacitor, 'FilePicker'), filesystem = plugin(capacitor, 'Filesystem');
    if (!picker || typeof picker.pickFiles !== 'function') throw new Error('Android 文件选择插件尚未安装');
    const result = await picker.pickFiles({ types: [MIME_TYPE], multiple: false, readData: false });
    const selected = result && result.files && result.files[0];
    if (!selected) {
      const cancelled = new Error('User cancelled file picker');
      cancelled.code = 'CANCELED';
      throw cancelled;
    }
    const file = validatePickedFile(selected);
    if (typeof file.data === 'string' && file.data) return base64ToText(file.data);
    if (!filesystem || typeof filesystem.readFile !== 'function') throw new Error('Android 文件读取插件尚未安装');
    const path = file.path || file.uri;
    if (!path) throw new Error('所选文件没有可读取地址');
    const read = await filesystem.readFile({ path });
    if (!read || typeof read.data !== 'string') throw new Error('所选文件内容为空');
    return base64ToText(read.data);
  }

  async function importText(options) {
    const settings = options || {};
    try {
      if (settings.runtime === 'android') return { cancelled: false, text: await pickAndroidFile(settings.capacitor) };
      if (!settings.file) return { cancelled: true, message: '已取消' };
      return { cancelled: false, text: await readWebFile(settings.file) };
    } catch (error) {
      const result = friendlyError(error, '读取学习档案');
      if (result.cancelled) return result;
      throw new Error(result.message);
    }
  }

  return {
    MAX_IMPORT_BYTES, MIME_TYPE, archiveFileName, exportText, friendlyError,
    importText, isCancelled, readWebFile, validatePickedFile
  };
});
