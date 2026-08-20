'use strict';

const MAX_BODY_BYTES = 64 * 1024;

function sendJson(res, statusCode, payload) {
  if (res.writableEnded) return;
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(payload));
}

function isLoopback(req) {
  const address = String(req.socket && req.socket.remoteAddress || '');
  return address === '127.0.0.1' || address === '::1' || address === '::ffff:127.0.0.1';
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.setEncoding('utf8');
    req.on('data', chunk => {
      body += chunk;
      if (Buffer.byteLength(body, 'utf8') > MAX_BODY_BYTES) reject(Object.assign(new Error('request_too_large'), { statusCode: 413 }));
    });
    req.on('end', () => {
      try { resolve(JSON.parse(body || '{}')); }
      catch (_error) { reject(Object.assign(new Error('invalid_json'), { statusCode: 400 })); }
    });
    req.on('error', reject);
  });
}

function publicError(error) {
  const code = error && error.message || 'config_error';
  const messages = {
    invalid_provider_url: '服务地址格式不正确。',
    invalid_provider_format: '请选择正确的接口格式。',
    provider_name_and_model_required: '请填写配置名称和模型名。',
    api_key_required: '首次保存该配置时必须填写 API Key。',
    invalid_provider_assignment: '任务分配指向了不存在的配置。'
  };
  return { ok: false, code, message: messages[code] || 'AI 配置保存失败。' };
}

function createReaderAiConfigApi(options = {}) {
  if (!options.config) throw new TypeError('config is required');
  const config = options.config;
  return function handleReaderAiConfigApi(req, res, urlPath) {
    if (!urlPath.startsWith('/api/reader-ai/config')) return false;
    if (!isLoopback(req)) { sendJson(res, 403, { ok: false, code: 'loopback_only' }); return true; }
    if (req.method === 'GET' && urlPath === '/api/reader-ai/config') {
      sendJson(res, 200, { ok: true, ...config.publicState() });
      return true;
    }
    if (req.method === 'PUT' && urlPath === '/api/reader-ai/config/provider') {
      readJson(req).then(async body => {
        const provider = await config.upsert(body.provider || {}, body.apiKey || '');
        sendJson(res, 200, { ok: true, providerId: provider.id, ...config.publicState() });
      }).catch(error => sendJson(res, error.statusCode || 400, publicError(error)));
      return true;
    }
    if (req.method === 'PUT' && urlPath === '/api/reader-ai/config/assignments') {
      readJson(req).then(body => {
        config.setAssignments(body.assignments || {});
        sendJson(res, 200, { ok: true, ...config.publicState() });
      }).catch(error => sendJson(res, error.statusCode || 400, publicError(error)));
      return true;
    }
    if (req.method === 'POST' && urlPath === '/api/reader-ai/config/delete') {
      readJson(req).then(body => {
        config.remove(body.providerId);
        sendJson(res, 200, { ok: true, ...config.publicState() });
      }).catch(error => sendJson(res, error.statusCode || 400, publicError(error)));
      return true;
    }
    sendJson(res, 405, { ok: false, code: 'method_not_allowed' });
    return true;
  };
}

module.exports = { createReaderAiConfigApi, isLoopback };
