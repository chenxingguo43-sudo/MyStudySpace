(function(global) {
  'use strict';

  var state = null;
  var editingId = '';
  var endpoint = '/api/reader-ai/config';

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function(ch) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch];
    });
  }

  async function request(path, options) {
    var response = await fetch(endpoint + path, Object.assign({
      cache: 'no-store', headers: { 'Content-Type': 'application/json' }
    }, options || {}));
    var payload = await response.json().catch(function() { return {}; });
    if (!response.ok || payload.ok === false) {
      var error = new Error(payload.message || 'AI 配置操作失败');
      error.code = payload.code || 'config_error';
      throw error;
    }
    return payload;
  }

  function providerById(id) {
    return state && state.providers.find(function(item) { return item.id === id; });
  }

  function providerOptions(selected) {
    return (state.providers || []).map(function(item) {
      var label = item.name + (item.model ? ' · ' + item.model : '') + (item.configured ? '' : '（未配置）');
      return '<option value="' + escapeHtml(item.id) + '"' + (item.id === selected ? ' selected' : '') + '>' + escapeHtml(label) + '</option>';
    }).join('');
  }

  function providerCards() {
    return (state.providers || []).map(function(item) {
      var active = state.assignments.dictionary === item.id || state.assignments.grammar === item.id;
      return '<button type="button" class="reader-ai-provider-row' + (item.id === editingId ? ' is-selected' : '') + '" data-provider-id="' + escapeHtml(item.id) + '">' +
        '<span><strong>' + escapeHtml(item.name) + '</strong><small>' + escapeHtml(item.model || '尚未填写模型') + '</small></span>' +
        '<span class="reader-ai-provider-state ' + (item.configured ? 'is-ready' : '') + '">' + (active ? '使用中 · ' : '') + (item.configured ? '已配置' : '未配置') + '</span></button>';
    }).join('');
  }

  function emptyProvider() {
    return {
      id: '', name: '', vendor: 'custom', format: 'responses', baseUrl: '', model: '',
      pricing: { currency: 'CNY', multiplier: 1, inputPerMillion: 0, cachedInputPerMillion: 0, outputPerMillion: 0 }
    };
  }

  function formHtml() {
    var item = providerById(editingId) || emptyProvider();
    var pricing = item.pricing || {};
    var readOnly = item.readOnly;
    if (readOnly) {
      return '<section class="reader-ai-config-form"><div class="reader-ai-config-form-head"><div><h3>' + escapeHtml(item.name) + '</h3><p>由当前 Node 终端环境变量提供</p></div><span class="reader-ai-provider-state' + (item.configured ? ' is-ready' : '') + '">' + (item.configured ? '已连接' : '未完整配置') + '</span></div>' +
        '<dl class="reader-ai-env-summary"><div><dt>接口</dt><dd>' + escapeHtml(item.baseUrl || '未填写') + '</dd></div><div><dt>格式</dt><dd>' + escapeHtml(item.format) + '</dd></div><div><dt>模型</dt><dd>' + escapeHtml(item.model || '未填写') + '</dd></div></dl></section>';
    }
    return '<form class="reader-ai-config-form" id="readerAiProviderForm"><div class="reader-ai-config-form-head"><div><h3>' + (item.id ? '编辑 AI 服务' : '新增 AI 服务') + '</h3><p>密钥保存到 Windows 当前用户加密区</p></div></div>' +
      '<input type="hidden" name="id" value="' + escapeHtml(item.id) + '">' +
      '<div class="reader-ai-config-grid">' +
        '<label>配置名称<input name="name" required maxlength="120" value="' + escapeHtml(item.name) + '" placeholder="例如：便宜查词"></label>' +
        '<label>供应商<select name="vendor"><option value="openai">OpenAI</option><option value="anthropic">Anthropic</option><option value="deepseek">DeepSeek</option><option value="custom">自定义中转站</option></select></label>' +
        '<label>接口格式<select name="format"><option value="responses">OpenAI Responses</option><option value="chat_completions">OpenAI Chat Completions</option><option value="anthropic_messages">Anthropic Messages</option></select></label>' +
        '<label>模型名称<input name="model" required maxlength="300" value="' + escapeHtml(item.model) + '" placeholder="例如：gpt-5.6-terra"></label>' +
        '<label class="reader-ai-config-wide">API 地址<input name="baseUrl" type="url" required value="' + escapeHtml(item.baseUrl) + '" placeholder="https://api.example.com/v1"></label>' +
        '<label class="reader-ai-config-wide">API Key<input name="apiKey" type="password" autocomplete="new-password" placeholder="' + (item.secretConfigured ? '已保存；留空表示不更换' : '首次保存必须填写') + '"></label>' +
      '</div>' +
      '<fieldset class="reader-ai-price-fields"><legend>费用估算（每百万 token）</legend><div class="reader-ai-config-grid reader-ai-price-grid">' +
        '<label>普通输入<input name="inputPerMillion" type="number" min="0" step="0.000001" value="' + Number(pricing.inputPerMillion || 0) + '"></label>' +
        '<label>缓存输入<input name="cachedInputPerMillion" type="number" min="0" step="0.000001" value="' + Number(pricing.cachedInputPerMillion || 0) + '"></label>' +
        '<label>输出<input name="outputPerMillion" type="number" min="0" step="0.000001" value="' + Number(pricing.outputPerMillion || 0) + '"></label>' +
        '<label>渠道倍率<input name="multiplier" type="number" min="0" step="0.01" value="' + Number(pricing.multiplier || 1) + '"></label>' +
        '<label>币种<select name="currency"><option value="CNY">人民币 CNY</option><option value="USD">美元 USD</option></select></label>' +
      '</div></fieldset>' +
      '<div class="reader-ai-config-actions"><button type="submit" class="reader-ai-config-primary">保存配置</button>' +
        (item.id ? '<button type="button" class="reader-ai-config-danger" id="readerAiDeleteProvider">删除</button>' : '') + '</div></form>';
  }

  function render() {
    var overlay = document.getElementById('readerAiSettingsOverlay');
    if (!overlay || !state) return;
    overlay.querySelector('#readerAiSettingsBody').innerHTML =
      '<section class="reader-ai-routing"><div><label>查词与语境分析<select id="readerAiDictionaryProvider">' + providerOptions(state.assignments.dictionary) + '</select></label></div>' +
      '<div><label>语法题解析<select id="readerAiGrammarProvider">' + providerOptions(state.assignments.grammar) + '</select></label></div>' +
      '<button type="button" class="reader-ai-config-primary" id="readerAiSaveAssignments">保存任务分配</button></section>' +
      '<div class="reader-ai-settings-workspace"><aside class="reader-ai-provider-list"><div class="reader-ai-provider-list-head"><h3>服务配置</h3><button type="button" id="readerAiNewProvider" title="新增 AI 服务" aria-label="新增 AI 服务">＋</button></div>' + providerCards() + '</aside>' +
      '<div id="readerAiConfigFormHost">' + formHtml() + '</div></div>';
    bind();
  }

  function setSelectValues() {
    var item = providerById(editingId);
    if (!item || item.readOnly) return;
    var form = document.getElementById('readerAiProviderForm');
    if (!form) return;
    form.elements.vendor.value = item.vendor;
    form.elements.format.value = item.format;
    form.elements.currency.value = item.pricing && item.pricing.currency || 'CNY';
  }

  function applyVendorPreset(form) {
    var vendor = form.elements.vendor.value;
    if (vendor === 'openai') { form.elements.format.value = 'responses'; if (!form.elements.baseUrl.value) form.elements.baseUrl.value = 'https://api.openai.com/v1'; }
    if (vendor === 'anthropic') { form.elements.format.value = 'anthropic_messages'; if (!form.elements.baseUrl.value) form.elements.baseUrl.value = 'https://api.anthropic.com/v1'; }
    if (vendor === 'deepseek') { form.elements.format.value = 'chat_completions'; if (!form.elements.baseUrl.value) form.elements.baseUrl.value = 'https://api.deepseek.com'; }
  }

  function notify(message) {
    if (typeof global.toast === 'function') global.toast(message);
  }

  function bind() {
    document.querySelectorAll('.reader-ai-provider-row').forEach(function(button) {
      button.addEventListener('click', function() { editingId = button.dataset.providerId; render(); setSelectValues(); });
    });
    var newButton = document.getElementById('readerAiNewProvider');
    if (newButton) newButton.addEventListener('click', function() { editingId = ''; render(); });
    var assignmentButton = document.getElementById('readerAiSaveAssignments');
    if (assignmentButton) assignmentButton.addEventListener('click', async function() {
      try {
        state = await request('/assignments', { method: 'PUT', body: JSON.stringify({ assignments: {
          dictionary: document.getElementById('readerAiDictionaryProvider').value,
          grammar: document.getElementById('readerAiGrammarProvider').value
        } }) });
        notify('AI 任务分配已保存'); render(); setSelectValues();
      } catch (error) { notify(error.message); }
    });
    var form = document.getElementById('readerAiProviderForm');
    if (form) {
      setSelectValues();
      form.elements.vendor.addEventListener('change', function() { applyVendorPreset(form); });
      form.addEventListener('submit', async function(event) {
        event.preventDefault();
        var values = new FormData(form);
        var provider = {
          id: values.get('id') || undefined, name: values.get('name'), vendor: values.get('vendor'),
          format: values.get('format'), baseUrl: values.get('baseUrl'), model: values.get('model'),
          pricing: {
            currency: values.get('currency'), multiplier: Number(values.get('multiplier')),
            inputPerMillion: Number(values.get('inputPerMillion')), cachedInputPerMillion: Number(values.get('cachedInputPerMillion')),
            outputPerMillion: Number(values.get('outputPerMillion'))
          }
        };
        try {
          var result = await request('/provider', { method: 'PUT', body: JSON.stringify({ provider: provider, apiKey: values.get('apiKey') || '' }) });
          state = result; editingId = result.providerId; notify('AI 服务已安全保存'); render(); setSelectValues();
        } catch (error) { notify(error.message); }
      });
    }
    var deleteButton = document.getElementById('readerAiDeleteProvider');
    if (deleteButton) deleteButton.addEventListener('click', async function() {
      if (!global.confirm('删除这项 AI 服务配置？学习记录不会删除。')) return;
      try {
        state = await request('/delete', { method: 'POST', body: JSON.stringify({ providerId: editingId }) });
        editingId = 'environment'; notify('AI 服务配置已删除'); render();
      } catch (error) { notify(error.message); }
    });
  }

  function ensureOverlay() {
    var overlay = document.getElementById('readerAiSettingsOverlay');
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.className = 'reader-ai-settings-overlay';
    overlay.id = 'readerAiSettingsOverlay';
    overlay.innerHTML = '<section class="reader-ai-settings-dialog" role="dialog" aria-modal="true" aria-labelledby="readerAiSettingsTitle">' +
      '<header><div><span>Reader</span><h2 id="readerAiSettingsTitle">AI 服务</h2></div><button type="button" id="readerAiSettingsClose" aria-label="关闭" title="关闭">×</button></header>' +
      '<div class="reader-ai-settings-body" id="readerAiSettingsBody"><div class="loading"><div class="spinner"></div><div>读取安全配置...</div></div></div></section>';
    document.body.appendChild(overlay);
    overlay.querySelector('#readerAiSettingsClose').addEventListener('click', close);
    overlay.addEventListener('click', function(event) { if (event.target === overlay) close(); });
    return overlay;
  }

  async function open() {
    var overlay = ensureOverlay();
    overlay.classList.add('visible');
    try {
      state = await request('', { method: 'GET' });
      editingId = state.assignments.dictionary || 'environment';
      render(); setSelectValues();
    } catch (error) {
      overlay.querySelector('#readerAiSettingsBody').innerHTML = '<div class="reader-ai-settings-error">' + escapeHtml(error.message) + '<button type="button" onclick="ReaderAiSettings.open()">重试</button></div>';
    }
  }

  function close() {
    var overlay = document.getElementById('readerAiSettingsOverlay');
    if (overlay) overlay.classList.remove('visible');
  }

  global.ReaderAiSettings = { open: open, close: close };
})(window);
