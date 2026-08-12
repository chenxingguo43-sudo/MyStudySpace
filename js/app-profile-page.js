(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.V1ProfilePage = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  'use strict';

  function escapeHtml(value) { return String(value || '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]); }
  function mount(options) {
    const settings = options || {}, store = settings.store, storage = settings.storage, documentRef = settings.document || document;
    const page = documentRef.getElementById('profilePage');
    const dialog = documentRef.getElementById('profileDialog');
    const nicknameInput = documentRef.getElementById('nickname');
    const localIdInput = documentRef.getElementById('localId');
    const avatarFileInput = documentRef.getElementById('avatarFile');
    const removeAvatarButton = documentRef.getElementById('removeAvatar');
    const saveProfileButton = documentRef.getElementById('saveProfile');
    const cancelProfileButton = documentRef.getElementById('cancelProfile');
    const profileError = documentRef.getElementById('profileError');
    const restoreInput = documentRef.getElementById('restoreInput');
    const archive = settings.archive || root.V1LearningArchive;
    const transfer = settings.transfer || root.V1ArchiveFileTransfer;
    const indexedDb = settings.indexedDB || root.indexedDB;
    let shouldRemoveAvatar = false;

    function setError(message) { profileError.textContent = message || ''; profileError.hidden = !message; }
    function render() {
      const profile = store.profile(storage), dates = store.checkins(storage), today = store.localDate(), checked = dates.includes(today);
      const name = profile.nickname || '本地学习者', id = profile.localId || '未设置本地 ID';
      const avatar = profile.avatar && profile.avatar.dataUrl ? '<img alt="" src="' + escapeHtml(profile.avatar.dataUrl) + '">' : '◯';
      page.innerHTML = '<h1>我的</h1><p class="sub">学习档案</p><section class="identity"><span class="avatar" data-testid="profile-avatar">' + avatar + '</span><span><strong>' + escapeHtml(name) + '</strong><span>ID · ' + escapeHtml(id) + '<br>仅保存在此设备</span></span><button class="plain" id="editProfile" aria-label="编辑本地资料">⌕</button></section><section class="checkin"><span>连续学习<strong data-testid="streak-count">' + store.streak(dates, today) + ' 天</strong></span><button class="primary" id="checkin" ' + (checked ? 'disabled' : '') + '>' + (checked ? '今日已打卡' : '今日打卡') + '</button></section><section class="group"><h2>数据与内容</h2><button class="row" id="backup"><i>⇧</i><span><b>本地资料备份与恢复</b><small>导出或恢复头像、昵称、ID 与打卡记录</small></span><em class="arrow">›</em></button><button class="row" id="media"><i>♧</i><span><b>教材媒体</b><small>媒体包将在后续阶段导入</small></span><em class="arrow">›</em></button></section><section class="group"><h2>外观与存储</h2><button class="row" id="appearance"><i>Aa</i><span><b>外观设置</b><small>跟随系统外观</small></span><em class="arrow">›</em></button><button class="row" id="storage"><i>▱</i><span><b>存储占用</b><small id="storageNote">正在读取设备估算</small></span><em class="arrow">›</em></button></section><section class="group"><h2>关于</h2><button class="row" id="version"><i>i</i><span><b>App 与内容版本</b><small id="versionNote">正在读取内容版本</small></span><em class="arrow">›</em></button></section><section class="group danger"><button class="row" id="clear"><i>⌫</i><span><b>清除学习数据</b><small>统一清除范围将在学习档案阶段提供</small></span><em class="arrow">›</em></button></section>';
      bindRenderedControls(); updateFacts();
    }
    function openEditor() {
      const profile = store.profile(storage);
      nicknameInput.value = profile.nickname || ''; localIdInput.value = profile.localId || '';
      avatarFileInput.value = ''; shouldRemoveAvatar = false; setError(''); dialog.showModal();
    }
    function bindRenderedControls() {
      documentRef.getElementById('checkin').addEventListener('click', function() { store.checkIn(storage); render(); });
      documentRef.getElementById('editProfile').addEventListener('click', openEditor);
      const backup = documentRef.getElementById('backup');
      backup.outerHTML = '<button class="row" id="exportQuick"><i>\u2191</i><span><b>\u5feb\u901f\u5bfc\u51fa</b><small>\u5bfc\u51fa\u5b66\u4e60\u8bb0\u5f55\uff0c\u4e0d\u5305\u542b\u5f55\u97f3</small></span><em class="arrow">\u203a</em></button>' +
        '<button class="row" id="exportComplete"><i>\u21e7</i><span><b>\u5b8c\u6574\u5bfc\u51fa</b><small>\u5bfc\u51fa\u5b66\u4e60\u8bb0\u5f55\u548c\u672c\u673a\u5f55\u97f3</small></span><em class="arrow">\u203a</em></button>' +
        '<button class="row" id="importArchive"><i>\u2193</i><span><b>\u5bfc\u5165\u5b66\u4e60\u6863\u6848</b><small>\u9ed8\u8ba4\u4e0e\u672c\u673a\u8bb0\u5f55\u5408\u5e76</small></span><em class="arrow">\u203a</em></button>';
      documentRef.getElementById('exportQuick').addEventListener('click', function () { exportLearningArchive(false); });
      documentRef.getElementById('exportComplete').addEventListener('click', function () { exportLearningArchive(true); });
      documentRef.getElementById('importArchive').addEventListener('click', function () { restoreInput.click(); });
      documentRef.getElementById('media').addEventListener('click', function() { alert('教材媒体包会在后续媒体包阶段提供。'); });
      documentRef.getElementById('appearance').addEventListener('click', function() { alert('当前跟随系统外观。'); });
      documentRef.getElementById('clear').addEventListener('click', function() { alert('为避免遗漏或误删录音，统一清除学习数据会在 Phase 5 档案范围确定后启用。'); });
    }
    function updateFacts() {
      if (navigator.storage && navigator.storage.estimate) navigator.storage.estimate().then(result => { const node = documentRef.getElementById('storageNote'); if (node) node.textContent = '此设备已用 ' + Math.round((result.usage || 0) / 1024 / 1024 * 10) / 10 + ' MB'; });
      fetch('data/app-content-manifest.json').then(response => response.json()).then(result => { const node = documentRef.getElementById('versionNote'); if (node) node.textContent = '内容 ' + result.version; }).catch(function() {});
    }
    async function saveEditor(event) {
      event.preventDefault(); setError(''); saveProfileButton.disabled = true;
      try {
        await store.saveEditedProfile(storage, { nickname: nicknameInput.value, localId: localIdInput.value, file: avatarFileInput.files[0] || null, shouldRemoveAvatar });
        dialog.close(); render();
      } catch (error) { setError(error && error.message || '资料保存失败'); }
      finally { saveProfileButton.disabled = false; }
    }
    async function exportLearningArchive(complete) {
      if (!archive || !transfer) return alert('\u5b66\u4e60\u6863\u6848\u6a21\u5757\u672a\u6b63\u786e\u52a0\u8f7d');
      try {
        const value = complete
          ? await archive.createCompleteArchive(storage, { indexedDB: indexedDb })
          : archive.createArchive(storage);
        await transfer.exportText({
          runtime: root.Capacitor && root.Capacitor.isNativePlatform && root.Capacitor.isNativePlatform() ? 'android' : 'web-server',
          capacitor: root.Capacitor,
          document: documentRef,
          text: JSON.stringify(value, null, 2),
          fileName: transfer.archiveFileName(complete)
        });
      } catch (error) { alert(error && error.message || '\u5bfc\u51fa\u5b66\u4e60\u6863\u6848\u5931\u8d25'); }
    }
    function exportOrRestore() {
      if (confirm('确定要导出本地资料吗？选择“取消”可改为导入。')) {
        const link = documentRef.createElement('a'); link.href = URL.createObjectURL(new Blob([JSON.stringify(store.archive(storage), null, 2)], { type: 'application/json' })); link.download = 'belye-nochi-profile.json'; link.click(); URL.revokeObjectURL(link.href);
      } else restoreInput.click();
    }
    avatarFileInput.addEventListener('change', function() { if (avatarFileInput.files[0]) shouldRemoveAvatar = false; setError(''); });
    removeAvatarButton.addEventListener('click', function() { shouldRemoveAvatar = true; avatarFileInput.value = ''; setError('头像将在保存后移除'); });
    cancelProfileButton.addEventListener('click', function() { shouldRemoveAvatar = false; avatarFileInput.value = ''; setError(''); });
    saveProfileButton.addEventListener('click', saveEditor);
    restoreInput.addEventListener('change', async function(event) {
      event.stopImmediatePropagation();
      const file = restoreInput.files[0];
      if (!file || !archive || !transfer) return;
      try {
        const picked = await transfer.importText({ runtime: 'web-server', file });
        if (!picked.cancelled) await archive.importLearningArchive(storage, indexedDb, picked.text, { mode: 'merge' });
        restoreInput.value = '';
        render();
        alert('\u5b66\u4e60\u6863\u6848\u5df2\u5bfc\u5165\u5e76\u5408\u5e76');
      } catch (error) { alert(error && error.message || '\u5bfc\u5165\u5b66\u4e60\u6863\u6848\u5931\u8d25'); }
    });
    render();
    return { render, openEditor };
  }
  return { escapeHtml, mount };
});
