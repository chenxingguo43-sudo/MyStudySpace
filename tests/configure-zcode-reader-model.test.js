'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { configure, findProvider } = require('../scripts/configure-zcode-reader-model');

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value), 'utf8');
}

function desktopConfig() {
  return {
    provider: {
      'builtin:test': {
        name: 'Built in', kind: 'openai-compatible', enabled: true,
        options: { baseURL: 'https://builtin.invalid/v1', apiKey: 'builtin-secret' },
        models: { 'GLM-5.3-Flash': { id: 'GLM-5.3-Flash' } }
      },
      'user-provider': {
        name: 'User GLM', kind: 'openai-compatible', enabled: true,
        options: { baseURL: 'https://user.invalid/v1', apiKey: 'user-secret' },
        models: { 'glm-5.3-flash': { id: 'glm-5.3-flash', contextWindow: 200000 } }
      }
    }
  };
}

test('provider selection prefers an enabled user provider with the requested model', () => {
  const selected = findProvider(desktopConfig(), 'glm-5.3-flash');
  assert.equal(selected.id, 'user-provider');
  assert.equal(selected.modelKey, 'glm-5.3-flash');
});

test('provider selection can be pinned to the built-in free-plan provider', () => {
  const selected = findProvider(desktopConfig(), 'glm-5.3-flash', 'builtin:test');
  assert.equal(selected.id, 'builtin:test');
  assert.equal(selected.modelKey, 'GLM-5.3-Flash');
});

test('configuration preserves unrelated CLI settings and does not expose secrets in its report', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'zcode-config-'));
  const desktopFile = path.join(root, 'desktop.json');
  const cliFile = path.join(root, 'cli.json');
  writeJson(desktopFile, desktopConfig());
  writeJson(cliFile, { skills: { enabled: true }, plugins: { enabledPlugins: { sample: true } } });
  const report = configure({ desktopFile, cliFile, model: 'glm-5.3-flash' });
  const configured = JSON.parse(fs.readFileSync(cliFile, 'utf8'));
  assert.equal(configured.model, 'user-provider/glm-5.3-flash');
  assert.equal(configured.provider['user-provider'].options.apiKey, 'user-secret');
  assert.equal(configured.skills.enabled, true);
  assert.equal(configured.plugins.enabledPlugins.sample, true);
  assert.equal(JSON.stringify(report).includes('user-secret'), false);
});

test('configuration pins the requested provider instead of the custom relay', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'zcode-provider-pin-'));
  const desktopFile = path.join(root, 'desktop.json');
  const cliFile = path.join(root, 'cli.json');
  writeJson(desktopFile, desktopConfig());
  const report = configure({ desktopFile, cliFile, model: 'glm-5.3-flash', provider: 'builtin:test' });
  const configured = JSON.parse(fs.readFileSync(cliFile, 'utf8'));
  assert.equal(configured.model, 'builtin:test/GLM-5.3-Flash');
  assert.equal(report.providerId, 'builtin:test');
});
