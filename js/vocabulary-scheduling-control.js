(function (root, factory) {
  const transition = typeof module === 'object' && module.exports
    ? require('./vocabulary-fsrs-transition')
    : root.BelyeNochiVocabularyFsrsTransition;
  const eventSchema = typeof module === 'object' && module.exports
    ? require('./learning-event-schema')
    : root.BelyeNochiLearningEventSchema;
  const api = factory(transition, eventSchema, root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.BelyeNochiVocabularySchedulingControl = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (transition, eventSchema, environment) {
  'use strict';

  if (!transition) throw new Error('vocabulary FSRS transition is required');
  if (!eventSchema) throw new Error('learning event schema is required');

  const READINESS_ENDPOINT = '/api/learning-switch/readiness';
  const BACKUP_CREATE_ENDPOINT = '/api/learning-backups/create';
  const BACKUP_VERIFY_ENDPOINT = '/api/learning-backups/verify-restore';
  const ARCHIVE_EXPORT_ENDPOINT = '/api/learning-archive/v2/export';

  function hex(buffer) {
    return Array.from(new Uint8Array(buffer)).map(function (value) {
      return value.toString(16).padStart(2, '0');
    }).join('');
  }

  function check(id, ok, message) {
    return { id, ok: Boolean(ok), message };
  }

  function createControl(options) {
    const settings = options || {};
    const storage = settings.storage || environment.localStorage;
    const eventStore = settings.eventStore;
    const syncClient = settings.syncClient || null;
    const projectionClient = settings.projectionClient || null;
    const fetchImpl = settings.fetch || environment.fetch;
    const cryptoImpl = settings.crypto || environment.crypto;
    const confirmEnable = settings.confirmEnable || function () { return true; };
    const getLegacySnapshot = settings.getLegacySnapshot || function () { return null; };
    const onChannelChange = settings.onChannelChange || function () {};
    if (!storage || typeof storage.getItem !== 'function' || typeof storage.setItem !== 'function') {
      throw new TypeError('scheduling control storage is required');
    }
    if (!eventStore || typeof eventStore.stats !== 'function') throw new TypeError('learning event store is required');

    async function sha256(value) {
      if (!cryptoImpl || !cryptoImpl.subtle || typeof cryptoImpl.subtle.digest !== 'function') {
        throw new Error('浏览器不支持恢复校验');
      }
      return hex(await cryptoImpl.subtle.digest('SHA-256', new TextEncoder().encode(String(value))));
    }

    async function requestJson(url, requestOptions) {
      if (typeof fetchImpl !== 'function') throw new Error('本机数据库服务不可用');
      const response = await fetchImpl(url, requestOptions);
      const body = response && typeof response.json === 'function' ? await response.json() : null;
      if (!response || !response.ok || !body || body.ok !== true) {
        const error = new Error(body && body.error && body.error.message || '本机数据库服务不可用');
        error.code = body && body.error && body.error.code || 'LOCAL_SERVICE_UNAVAILABLE';
        throw error;
      }
      return body;
    }

    function selectedChannel() {
      return transition.channel(storage);
    }

    function disable(reason) {
      storage.removeItem(transition.CHANNEL_KEY);
      onChannelChange(transition.LEGACY_CHANNEL, reason || 'manual');
      return { ok: true, channel: transition.LEGACY_CHANNEL, reason: reason || 'manual' };
    }

    async function status(options) {
      const value = options || {};
      let projectionComparison = null;
      let service = null;
      let serviceError = null;
      if (value.refresh !== false) {
        if (syncClient && typeof syncClient.syncOnce === 'function') await syncClient.syncOnce();
        if (projectionClient && typeof projectionClient.compareServer === 'function') {
          try {
            const projection = await projectionClient.compareServer();
            projectionComparison = projection.checkpoint && projection.checkpoint.comparison || null;
          } catch (error) {
            projectionComparison = { status: 'projection_failed', matched: false };
          }
        }
      }
      const stats = await eventStore.stats();
      try { service = await requestJson(READINESS_ENDPOINT, { cache: 'no-store' }); }
      catch (error) { serviceError = error; }
      const snapshot = getLegacySnapshot();
      const checks = [
        check('pending', stats.pending === 0,
          stats.pending === 0 ? '浏览器记录已全部补交' : `还有 ${stats.pending} 条记录等待补交`),
        check('comparison', projectionComparison && projectionComparison.matched === true,
          projectionComparison && projectionComparison.matched === true ? '浏览器与数据库计算一致' : '浏览器与数据库尚未完成一致性核对'),
        check('legacySnapshot', snapshot && snapshot.ok === true,
          snapshot && snapshot.ok === true ? '旧进度快照已保存' : '旧进度快照尚未保存'),
        ...(service && Array.isArray(service.checks) ? service.checks : [
          check('service', false, serviceError ? '本机数据库服务不可用' : '数据库体检未完成')
        ])
      ];
      const ready = checks.every(item => item.ok);
      const channel = selectedChannel();
      let autoRolledBack = false;
      if (channel === transition.FSRS_CHANNEL && !ready) {
        disable('readiness_failed');
        autoRolledBack = true;
      }
      return {
        ok: true,
        ready,
        channel: autoRolledBack ? transition.LEGACY_CHANNEL : channel,
        autoRolledBack,
        checks,
        stats,
        service
      };
    }

    async function prepareBackup() {
      await status({ refresh: true });
      const created = await requestJson(BACKUP_CREATE_ENDPOINT, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: 'daily' })
      });
      await requestJson(BACKUP_VERIFY_ENDPOINT, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ backupId: created.backup.backupId })
      });
      return status({ refresh: true });
    }

    async function restoreBrowserLedger() {
      if (typeof eventStore.allEvents !== 'function' || typeof eventStore.recordEvents !== 'function'
          || typeof eventStore.acknowledge !== 'function') {
        throw new Error('浏览器事件账不支持恢复');
      }
      const result = await requestJson(ARCHIVE_EXPORT_ENDPOINT, { cache: 'no-store' });
      const archive = result.archive;
      if (!archive || !Array.isArray(archive.events) || !archive.archiveHash) {
        throw new Error('数据库恢复档案格式无效');
      }
      const body = { ...archive };
      delete body.archiveHash;
      const expectedHash = await sha256(eventSchema.canonicalStringify(body));
      if (expectedHash !== archive.archiveHash) throw new Error('数据库恢复档案校验失败');

      const serverById = new Map(archive.events.map(function (event) { return [event.eventId, event]; }));
      const localEvents = await eventStore.allEvents();
      localEvents.forEach(function (event) {
        const serverEvent = serverById.get(event.eventId);
        if (!serverEvent) return;
        const localSource = { ...event };
        const serverSource = { ...serverEvent };
        delete localSource.receivedAt;
        delete serverSource.receivedAt;
        if (eventSchema.canonicalStringify(localSource) !== eventSchema.canonicalStringify(serverSource)) {
          const error = new Error('同一事件编号在浏览器和数据库中的内容不同');
          error.code = 'RECOVERY_EVENT_CONFLICT';
          throw error;
        }
      });
      const localIds = new Set(localEvents.map(event => event.eventId));
      const missing = archive.events.filter(event => !localIds.has(event.eventId));
      if (missing.length) await eventStore.recordEvents(missing);

      const recovered = await eventStore.allEvents();
      const confirmedIds = recovered.filter(event => serverById.has(event.eventId)).map(event => event.eventId);
      if (confirmedIds.length) {
        await eventStore.acknowledge(confirmedIds, {
          batchId: cryptoImpl && typeof cryptoImpl.randomUUID === 'function'
            ? cryptoImpl.randomUUID()
            : '00000000-0000-4000-8000-000000000000',
          committedAt: archive.exportedAt,
          contentHash: archive.archiveHash
        });
      }
      const readiness = await status({ refresh: true });
      const comparison = readiness.checks.find(item => item.id === 'comparison');
      if (!comparison || !comparison.ok) throw new Error('恢复后浏览器与数据库仍不一致');
      return { ok: true, restoredEventCount: missing.length, readiness };
    }

    async function enable() {
      const readiness = await status({ refresh: true });
      if (!readiness.ready) {
        const error = new Error('切换条件尚未全部满足');
        error.code = 'SWITCH_NOT_READY';
        error.readiness = readiness;
        throw error;
      }
      if (!confirmEnable()) return { ok: false, cancelled: true, channel: transition.LEGACY_CHANNEL };
      storage.setItem(transition.CHANNEL_KEY, transition.FSRS_CHANNEL);
      onChannelChange(transition.FSRS_CHANNEL, 'manual');
      return { ok: true, channel: transition.FSRS_CHANNEL, readiness };
    }

    return { disable, enable, prepareBackup, restoreBrowserLedger, selectedChannel, status };
  }

  return {
    ARCHIVE_EXPORT_ENDPOINT,
    BACKUP_CREATE_ENDPOINT,
    BACKUP_VERIFY_ENDPOINT,
    READINESS_ENDPOINT,
    createControl
  };
});
