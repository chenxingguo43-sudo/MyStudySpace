'use strict';

const { ReaderAiProviderError, TEMPLATE_VERSION } = require('./reader-ai-provider');

const MAX_BODY_BYTES = 256 * 1024;

function sendJson(res, statusCode, payload) {
  if (res.writableEnded) return;
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(payload));
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.setEncoding('utf8');
    req.on('data', chunk => {
      body += chunk;
      if (Buffer.byteLength(body, 'utf8') > MAX_BODY_BYTES) {
        const error = new Error('request_too_large');
        error.statusCode = 413;
        reject(error);
        req.destroy();
      }
    });
    req.on('end', () => {
      try { resolve(JSON.parse(body || '{}')); }
      catch (_error) {
        const error = new Error('invalid_json');
        error.statusCode = 400;
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

function string(value, max) {
  return String(value == null ? '' : value).trim().slice(0, max);
}

function validRequest(body) {
  const requestType = string(body.requestType, 30);
  const clientRequestId = string(body.clientRequestId, 120);
  if (!['grammar', 'reading', 'dictionary'].includes(requestType)) throw Object.assign(new Error('invalid_request_type'), { statusCode: 400 });
  if (!/^[a-zA-Z0-9:_-]{8,120}$/.test(clientRequestId)) throw Object.assign(new Error('invalid_client_request_id'), { statusCode: 400 });
  if (!body.input || typeof body.input !== 'object' || Array.isArray(body.input)) throw Object.assign(new Error('invalid_input'), { statusCode: 400 });
  const serialized = JSON.stringify(body.input);
  if (serialized.length > 200000) throw Object.assign(new Error('input_too_large'), { statusCode: 413 });
  return {
    clientRequestId,
    requestType,
    input: body.input,
    source: {
      kind: string(body.source && body.source.kind, 80),
      id: string(body.source && body.source.id, 200)
    },
    lexemeKey: string(body.lexemeKey, 300),
    deliveryMode: body.deliveryMode === 'prompt_copy' ? 'prompt_copy' : 'direct',
    templateVersion: string(body.templateVersion || TEMPLATE_VERSION, 100)
  };
}

function publicInteraction(interaction, cached) {
  return {
    ok: interaction.status === 'completed',
    interactionId: interaction.interactionId,
    clientRequestId: interaction.clientRequestId,
    requestType: interaction.requestType,
    deliveryMode: interaction.deliveryMode,
    status: interaction.status,
    answer: interaction.answer,
    model: interaction.model,
    templateVersion: interaction.templateVersion,
    createdAt: interaction.createdAt,
    cached: Boolean(cached),
    feedback: interaction.feedback || '',
    usage: interaction.usage || null
  };
}

function createReaderAiApi(options = {}) {
  if (!options.store || !options.provider) throw new TypeError('store and provider are required');
  const store = options.store;
  const provider = options.provider;
  const active = new Map();

  async function analyze(req, res) {
    let interaction;
    try {
      const request = validRequest(await readJson(req));
      const started = store.beginRequest(request);
      interaction = started.interaction;
      if (started.duplicate && interaction.status === 'completed') {
        sendJson(res, 200, publicInteraction(interaction, true));
        return;
      }
      if (started.duplicate && interaction.status === 'pending') {
        sendJson(res, 409, { ok: false, code: 'request_in_progress', interactionId: interaction.interactionId });
        return;
      }

      const controller = new AbortController();
      active.set(request.clientRequestId, { controller, interactionId: interaction.interactionId });
      const onAborted = () => controller.abort();
      req.once('aborted', onAborted);
      const learningContext = store.learningContext({ lexemeKey: request.lexemeKey, sourceId: request.source.id }, 5);
      try {
        const result = await provider.analyze({
          requestType: request.requestType,
          input: request.input,
          learningContext,
          signal: controller.signal
        });
        let answer = result.answer;
        if (request.requestType === 'grammar' || request.requestType === 'reading') {
          const correct = String(request.input.correctAnswer || '');
          const expectedWrong = (Array.isArray(request.input.options) ? request.input.options : [])
            .map(option => String(option && option.key || '')).filter(key => key && key !== correct);
          const explained = new Set((request.requestType === 'reading' ? answer.optionAnalysis : answer.optionReasons || []).map(item => String(item.key || '')));
          if (expectedWrong.some(key => !explained.has(key))) {
            throw new ReaderAiProviderError('invalid_response', 'AI 没有解释所有错误选项');
          }
          if (request.requestType === 'reading' && !answer.optionAnalysis.some(item => String(item.key || '') === correct)) {
            throw new ReaderAiProviderError('invalid_response', 'AI 没有解释正确选项');
          }
        }
        if (request.requestType === 'dictionary') {
          answer = { ...answer, provisional: request.input.localDictionaryFound !== true };
        }
        interaction = store.complete(interaction.interactionId, answer, result.model, result.usage);
        sendJson(res, 200, publicInteraction(interaction, false));
      } finally {
        req.removeListener('aborted', onAborted);
        active.delete(request.clientRequestId);
      }
    } catch (error) {
      const code = error instanceof ReaderAiProviderError ? error.code : error.message || 'reader_ai_error';
      const statusCode = error.statusCode || 500;
      if (interaction && interaction.status === 'pending') {
        const status = code === 'cancelled' ? 'cancelled' : 'failed';
        interaction = store.fail(interaction.interactionId, status, code, error.message);
      }
      sendJson(res, statusCode, {
        ok: false,
        code,
        status: interaction ? interaction.status : 'failed',
        interactionId: interaction ? interaction.interactionId : '',
        message: code === 'not_configured' ? 'AI 服务尚未配置，本地学习功能不受影响。'
          : code === 'timeout' ? 'AI 请求超时，请重试。'
            : code === 'cancelled' ? '请求已取消。' : 'AI 解析暂时不可用，请稍后重试。'
      });
    }
  }

  async function recordPromptCopy(req, res) {
    try {
      const request = validRequest(await readJson(req));
      request.deliveryMode = 'prompt_copy';
      const started = store.beginRequest(request);
      const interaction = started.interaction.status === 'completed'
        ? started.interaction
        : store.complete(started.interaction.interactionId, null, '');
      sendJson(res, 200, publicInteraction(interaction, started.duplicate));
    } catch (error) {
      sendJson(res, error.statusCode || 400, { ok: false, code: error.message || 'prompt_copy_record_failed' });
    }
  }

  async function cancel(req, res) {
    try {
      const body = await readJson(req);
      const clientRequestId = string(body.clientRequestId, 120);
      const running = active.get(clientRequestId);
      if (running) running.controller.abort();
      const interaction = store.getByClientRequestId(clientRequestId);
      if (interaction && interaction.status === 'pending') store.fail(interaction.interactionId, 'cancelled', 'cancelled', '请求已取消');
      sendJson(res, 200, { ok: true, cancelled: Boolean(running || interaction) });
    } catch (error) {
      sendJson(res, error.statusCode || 400, { ok: false, code: error.message || 'cancel_failed' });
    }
  }

  async function feedback(req, res) {
    try {
      const body = await readJson(req);
      const interactionId = string(body.interactionId, 120);
      const value = string(body.feedback, 30);
      const interaction = store.feedback(interactionId, value);
      if (!interaction) return sendJson(res, 404, { ok: false, code: 'not_found' });
      sendJson(res, 200, { ok: true, interactionId, feedback: interaction.feedback });
    } catch (error) {
      sendJson(res, error.statusCode || 400, { ok: false, code: error.message || 'feedback_failed' });
    }
  }

  return function handleReaderAiApi(req, res, urlPath) {
    if (req.method === 'GET' && urlPath === '/api/reader-ai/capabilities') {
      sendJson(res, 200, { ok: true, requestTypes: ['grammar', 'reading', 'dictionary'], templateVersion: TEMPLATE_VERSION });
      return true;
    }
    if (req.method === 'POST' && urlPath === '/api/reader-ai/analyze') { analyze(req, res); return true; }
    if (req.method === 'POST' && urlPath === '/api/reader-ai/prompt-copy') { recordPromptCopy(req, res); return true; }
    if (req.method === 'POST' && urlPath === '/api/reader-ai/cancel') { cancel(req, res); return true; }
    if (req.method === 'POST' && urlPath === '/api/reader-ai/feedback') { feedback(req, res); return true; }
    return false;
  };
}

module.exports = { createReaderAiApi, readJson, validRequest };
