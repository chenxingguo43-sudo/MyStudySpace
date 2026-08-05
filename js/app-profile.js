(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.V1ProfileStore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const PROFILE_KEY = 'v1_local_profile';
  const CHECKINS_KEY = 'v1_daily_checkins';
  const MAX_AVATAR_SOURCE_BYTES = 10 * 1024 * 1024;
  const MAX_AVATAR_DATA_BYTES = 256 * 1024;
  const MAX_AVATAR_DIMENSION = 512;
  const SUPPORTED_AVATAR_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
  function localDate(date) { const value = date || new Date(); return value.getFullYear() + '-' + String(value.getMonth() + 1).padStart(2, '0') + '-' + String(value.getDate()).padStart(2, '0'); }
  function parse(storage, key, fallback) { try { const value = JSON.parse(storage.getItem(key) || ''); return value && typeof value === 'object' ? value : fallback; } catch (_error) { return fallback; } }
  function profile(storage) { return Object.assign({ version: 1, nickname: '', localId: '', avatar: null }, parse(storage, PROFILE_KEY, {})); }
  function saveProfile(storage, value) { const saved = Object.assign({ version: 1 }, value, { updatedAt: new Date().toISOString() }); storage.setItem(PROFILE_KEY, JSON.stringify(saved)); return saved; }
  function checkins(storage) { const raw = parse(storage, CHECKINS_KEY, { dates: [] }); return Array.from(new Set(Array.isArray(raw.dates) ? raw.dates.filter(value => /^\d{4}-\d{2}-\d{2}$/.test(value)) : [])).sort(); }
  function saveCheckins(storage, dates) { const saved = { version: 1, dates: Array.from(new Set(dates)).sort(), updatedAt: new Date().toISOString() }; storage.setItem(CHECKINS_KEY, JSON.stringify(saved)); return saved; }
  function previousLocalDate(key) { const parts = String(key).split('-').map(Number); const date = new Date(parts[0], parts[1] - 1, parts[2], 12); date.setDate(date.getDate() - 1); return localDate(date); }
  function streak(dates, today) {
    const set = new Set(dates), current = today || localDate(), yesterday = previousLocalDate(current);
    let cursor = set.has(current) ? current : (set.has(yesterday) ? yesterday : ''), total = 0;
    while (cursor && set.has(cursor)) { total += 1; cursor = previousLocalDate(cursor); }
    return total;
  }
  function checkIn(storage, date) { const key = date || localDate(); const dates = checkins(storage); if (dates.includes(key)) return { changed: false, dates, streak: streak(dates, key) }; dates.push(key); saveCheckins(storage, dates); return { changed: true, dates: dates.sort(), streak: streak(dates, key) }; }
  function archive(storage) { return { schema: 'belye-nochi-profile/v1', exportedAt: new Date().toISOString(), profile: profile(storage), checkins: { version: 1, dates: checkins(storage) } }; }
  function restore(storage, value) { if (!value || value.schema !== 'belye-nochi-profile/v1' || !value.profile || !value.checkins) throw new Error('不是白夜俄语本地资料备份'); saveProfile(storage, value.profile); saveCheckins(storage, value.checkins.dates || []); return { profile: profile(storage), dates: checkins(storage) }; }
  function validateAvatarFile(file) {
    if (!file || !SUPPORTED_AVATAR_TYPES.has(String(file.type || '').toLowerCase())) throw new Error('请选择 JPEG、PNG 或 WebP 图片');
    if (!Number.isFinite(file.size) || file.size <= 0) throw new Error('头像文件为空或无法读取');
    if (file.size > MAX_AVATAR_SOURCE_BYTES) throw new Error('原始头像不能超过 10 MB');
    return true;
  }
  function centerCrop(width, height) {
    if (!(width > 0) || !(height > 0)) throw new Error('图片尺寸无效');
    const side = Math.min(width, height);
    return { sx: (width - side) / 2, sy: (height - side) / 2, side, output: Math.min(side, MAX_AVATAR_DIMENSION) };
  }
  function dataUrlBytes(dataUrl) {
    const payload = String(dataUrl || '').split(',')[1] || '';
    return Math.ceil(payload.length * 3 / 4);
  }
  async function decodeAvatar(file) {
    if (typeof createImageBitmap === 'function') return createImageBitmap(file);
    return new Promise(function(resolve, reject) {
      const url = URL.createObjectURL(file), image = new Image();
      image.onload = function() { URL.revokeObjectURL(url); resolve(image); };
      image.onerror = function() { URL.revokeObjectURL(url); reject(new Error('图片解码失败，请换一张图片')); };
      image.src = url;
    });
  }
  async function processAvatarFile(file) {
    validateAvatarFile(file);
    let image;
    try { image = await decodeAvatar(file); } catch (error) { throw new Error(error && error.message || '图片解码失败，请换一张图片'); }
    const width = image.width || image.naturalWidth, height = image.height || image.naturalHeight;
    const crop = centerCrop(width, height), canvas = document.createElement('canvas'), context = canvas.getContext('2d');
    if (!context) { if (image.close) image.close(); throw new Error('当前浏览器无法处理头像图片'); }
    let dimension = crop.output, result = '';
    for (let scaleAttempt = 0; scaleAttempt < 4 && !result; scaleAttempt += 1) {
      canvas.width = dimension; canvas.height = dimension;
      context.fillStyle = '#0c1d31'; context.fillRect(0, 0, dimension, dimension);
      context.drawImage(image, crop.sx, crop.sy, crop.side, crop.side, 0, 0, dimension, dimension);
      for (let quality = 0.86; quality >= 0.5; quality -= 0.08) {
        const candidate = canvas.toDataURL('image/jpeg', quality);
        if (dataUrlBytes(candidate) <= MAX_AVATAR_DATA_BYTES) { result = candidate; break; }
      }
      dimension = Math.max(256, Math.round(dimension * 0.8));
    }
    if (image.close) image.close();
    if (!result) throw new Error('头像压缩后仍然过大，请换一张图片');
    return result;
  }
  async function saveEditedProfile(storage, edit, avatarProcessor) {
    const current = profile(storage), settings = edit || {};
    let avatar = current.avatar;
    if (settings.file) avatar = { kind: 'data-url', dataUrl: await (avatarProcessor || processAvatarFile)(settings.file) };
    else if (settings.shouldRemoveAvatar) avatar = null;
    const next = { nickname: String(settings.nickname || '').trim(), localId: String(settings.localId || '').trim(), avatar };
    try { return saveProfile(storage, next); }
    catch (_error) { throw new Error('本机存储空间不足，资料未保存'); }
  }
  return {
    CHECKINS_KEY, PROFILE_KEY, MAX_AVATAR_DATA_BYTES, MAX_AVATAR_DIMENSION, MAX_AVATAR_SOURCE_BYTES,
    archive, centerCrop, checkIn, checkins, dataUrlBytes, localDate, previousLocalDate, processAvatarFile,
    profile, restore, saveCheckins, saveEditedProfile, saveProfile, streak, validateAvatarFile
  };
});
