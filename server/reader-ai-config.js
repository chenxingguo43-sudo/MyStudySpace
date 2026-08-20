'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

const CONFIG_VERSION = 1;
const PROVIDER_FORMATS = new Set(['responses', 'chat_completions', 'anthropic_messages']);
const PROVIDER_VENDORS = new Set(['openai', 'anthropic', 'deepseek', 'custom']);

function cleanText(value, max = 500) {
  return String(value == null ? '' : value).trim().slice(0, max);
}

function providerId(value) {
  const id = cleanText(value, 80);
  if (!/^[a-zA-Z0-9_-]{3,80}$/.test(id)) throw new TypeError('invalid_provider_id');
  return id;
}

function numberOrZero(value) {
  const result = Number(value);
  return Number.isFinite(result) && result >= 0 ? result : 0;
}

function normalizeProvider(value = {}) {
  const format = cleanText(value.format, 40).toLowerCase();
  const vendor = cleanText(value.vendor || 'custom', 30).toLowerCase();
  if (!PROVIDER_FORMATS.has(format)) throw new TypeError('invalid_provider_format');
  if (!PROVIDER_VENDORS.has(vendor)) throw new TypeError('invalid_provider_vendor');
  let baseUrl;
  try { baseUrl = new URL(cleanText(value.baseUrl, 2000)); }
  catch (_error) { throw new TypeError('invalid_provider_url'); }
  if (!['http:', 'https:'].includes(baseUrl.protocol) || baseUrl.username || baseUrl.password || baseUrl.search || baseUrl.hash) {
    throw new TypeError('invalid_provider_url');
  }
  const model = cleanText(value.model, 300);
  const name = cleanText(value.name, 120);
  if (!model || !name) throw new TypeError('provider_name_and_model_required');
  return {
    id: value.id ? providerId(value.id) : 'provider-' + crypto.randomUUID(),
    name,
    vendor,
    format,
    baseUrl: baseUrl.toString().replace(/\/$/, ''),
    model,
    pricing: {
      currency: cleanText(value.pricing && value.pricing.currency || 'CNY', 12).toUpperCase(),
      multiplier: numberOrZero(value.pricing && value.pricing.multiplier) || 1,
      inputPerMillion: numberOrZero(value.pricing && value.pricing.inputPerMillion),
      cachedInputPerMillion: numberOrZero(value.pricing && value.pricing.cachedInputPerMillion),
      outputPerMillion: numberOrZero(value.pricing && value.pricing.outputPerMillion)
    }
  };
}

function defaultConfig() {
  return { version: CONFIG_VERSION, providers: [], assignments: { dictionary: 'environment', grammar: 'environment' } };
}

function readConfig(configPath) {
  if (!fs.existsSync(configPath)) return defaultConfig();
  try {
    const parsed = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const providers = (Array.isArray(parsed.providers) ? parsed.providers : []).map(normalizeProvider);
    const ids = new Set(providers.map(item => item.id));
    const assignments = parsed.assignments || {};
    return {
      version: CONFIG_VERSION,
      providers,
      assignments: {
        dictionary: ids.has(assignments.dictionary) ? assignments.dictionary : 'environment',
        grammar: ids.has(assignments.grammar) ? assignments.grammar : 'environment'
      }
    };
  } catch (_error) {
    return defaultConfig();
  }
}

function writeConfig(configPath, config) {
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  const temporaryPath = configPath + '.tmp-' + crypto.randomUUID();
  fs.writeFileSync(temporaryPath, JSON.stringify(config, null, 2), { encoding: 'utf8', mode: 0o600, flag: 'wx' });
  fs.renameSync(temporaryPath, configPath);
}

function powershellExecutable(environment) {
  const systemRoot = cleanText(environment.SystemRoot || environment.SYSTEMROOT, 500);
  return systemRoot ? path.join(systemRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe') : 'powershell.exe';
}

function encodedPowerShell(script) {
  return Buffer.from(script, 'utf16le').toString('base64');
}

function runPowerShell(script, input, environment = process.env) {
  return new Promise((resolve, reject) => {
    const child = spawn(powershellExecutable(environment), ['-NoProfile', '-NonInteractive', '-EncodedCommand', encodedPowerShell(script)], {
      windowsHide: true, stdio: ['pipe', 'pipe', 'pipe']
    });
    let stdout = '';
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', chunk => { if (stdout.length < 20000) stdout += chunk; });
    child.stderr.resume();
    child.once('error', () => reject(new Error('windows_secret_store_unavailable')));
    child.once('close', code => code === 0 ? resolve(stdout.trim()) : reject(new Error('windows_secret_store_failed')));
    child.stdin.end(String(input || ''), 'utf8');
  });
}

function createWindowsSecretStore(options = {}) {
  const directory = path.resolve(options.directory);
  const environment = options.environment || process.env;
  const protectScript = "Add-Type -AssemblyName System.Security;$value=[Console]::In.ReadToEnd();$bytes=[Text.Encoding]::UTF8.GetBytes($value);$protected=[Security.Cryptography.ProtectedData]::Protect($bytes,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser);[Console]::Out.Write([Convert]::ToBase64String($protected))";
  const unprotectScript = "Add-Type -AssemblyName System.Security;$value=[Console]::In.ReadToEnd();$bytes=[Convert]::FromBase64String($value);$plain=[Security.Cryptography.ProtectedData]::Unprotect($bytes,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser);[Console]::Out.Write([Text.Encoding]::UTF8.GetString($plain))";
  const secretPath = id => path.join(directory, providerId(id) + '.dpapi');
  return {
    has(id) { return fs.existsSync(secretPath(id)); },
    async set(id, secret) {
      const value = cleanText(secret, 8000);
      if (!value) throw new TypeError('api_key_required');
      const protectedValue = await runPowerShell(protectScript, value, environment);
      fs.mkdirSync(directory, { recursive: true });
      fs.writeFileSync(secretPath(id), protectedValue, { encoding: 'ascii', mode: 0o600 });
    },
    async get(id) {
      const file = secretPath(id);
      if (!fs.existsSync(file)) return '';
      return runPowerShell(unprotectScript, fs.readFileSync(file, 'ascii'), environment);
    },
    remove(id) {
      const file = secretPath(id);
      if (fs.existsSync(file)) fs.unlinkSync(file);
    }
  };
}

function environmentProvider(environment) {
  const baseUrl = cleanText(environment.BELYE_NOCHI_AI_BASE_URL, 2000);
  const model = cleanText(environment.BELYE_NOCHI_AI_MODEL, 300);
  const secretConfigured = Boolean(cleanText(environment.BELYE_NOCHI_AI_API_KEY, 8000));
  return {
    id: 'environment', name: '当前终端配置', vendor: 'custom',
    format: cleanText(environment.BELYE_NOCHI_AI_API_FORMAT || 'chat_completions', 40),
    baseUrl, model, pricing: { currency: 'CNY', multiplier: 1, inputPerMillion: 0, cachedInputPerMillion: 0, outputPerMillion: 0 },
    secretConfigured, readOnly: true, configured: Boolean(baseUrl && model && secretConfigured)
  };
}

function createReaderAiConfig(options = {}) {
  const environment = options.environment || process.env;
  const dataDirectory = path.resolve(options.dataDirectory);
  const configPath = options.configPath || path.join(dataDirectory, 'reader-ai-config.json');
  const secretStore = options.secretStore || createWindowsSecretStore({
    directory: options.secretDirectory || path.join(dataDirectory, 'reader-ai-secrets'), environment
  });
  let config = readConfig(configPath);

  function publicState() {
    const envProvider = environmentProvider(environment);
    return {
      providers: [envProvider].concat(config.providers.map(item => ({
        ...item, secretConfigured: secretStore.has(item.id), configured: secretStore.has(item.id), readOnly: false
      }))),
      assignments: { ...config.assignments },
      secureStorage: process.platform === 'win32' ? 'windows-dpapi-current-user' : 'unavailable'
    };
  }

  async function upsert(value, apiKey) {
    const provider = normalizeProvider(value);
    const index = config.providers.findIndex(item => item.id === provider.id);
    if (index >= 0) config.providers[index] = provider;
    else config.providers.push(provider);
    if (cleanText(apiKey, 8000)) await secretStore.set(provider.id, apiKey);
    if (!secretStore.has(provider.id)) throw new TypeError('api_key_required');
    writeConfig(configPath, config);
    return provider;
  }

  function setAssignments(value = {}) {
    const ids = new Set(['environment'].concat(config.providers.map(item => item.id)));
    const dictionary = cleanText(value.dictionary, 80);
    const grammar = cleanText(value.grammar, 80);
    if (!ids.has(dictionary) || !ids.has(grammar)) throw new TypeError('invalid_provider_assignment');
    config.assignments = { dictionary, grammar };
    writeConfig(configPath, config);
    return { ...config.assignments };
  }

  function remove(id) {
    id = providerId(id);
    config.providers = config.providers.filter(item => item.id !== id);
    ['dictionary', 'grammar'].forEach(kind => { if (config.assignments[kind] === id) config.assignments[kind] = 'environment'; });
    secretStore.remove(id);
    writeConfig(configPath, config);
  }

  async function resolve(requestType) {
    const id = config.assignments[requestType] || 'environment';
    if (id === 'environment') return { ...environmentProvider(environment), apiKey: cleanText(environment.BELYE_NOCHI_AI_API_KEY, 8000) };
    const provider = config.providers.find(item => item.id === id);
    if (!provider) return { ...environmentProvider(environment), apiKey: cleanText(environment.BELYE_NOCHI_AI_API_KEY, 8000) };
    return { ...provider, apiKey: await secretStore.get(provider.id), configured: secretStore.has(provider.id) };
  }

  return { publicState, upsert, setAssignments, remove, resolve, configPath };
}

module.exports = {
  CONFIG_VERSION,
  createReaderAiConfig,
  createWindowsSecretStore,
  environmentProvider,
  normalizeProvider
};
