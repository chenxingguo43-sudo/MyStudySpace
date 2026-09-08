#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

function readJson(file, fallback = null) {
  if (!fs.existsSync(file)) return fallback;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJsonAtomic(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
  fs.renameSync(temporary, file);
}

function findProvider(desktopConfig, requestedModel, requestedProviderId = null) {
  const requested = requestedModel.toLowerCase();
  const candidates = Object.entries(desktopConfig.provider || {})
    .map(([id, provider]) => {
      const modelEntry = Object.entries(provider.models || {})
        .find(([key, value]) => String(value?.id || key).toLowerCase() === requested);
      return modelEntry ? { id, provider, modelKey: modelEntry[1]?.id || modelEntry[0] } : null;
    })
    .filter(Boolean)
    .filter((item) => item.provider.enabled !== false && item.provider.options?.baseURL)
    .filter((item) => !requestedProviderId || item.id === requestedProviderId)
    .sort((left, right) => {
      const leftUser = left.id.startsWith('builtin:') ? 0 : 1;
      const rightUser = right.id.startsWith('builtin:') ? 0 : 1;
      return rightUser - leftUser;
    });
  if (!candidates.length) {
    const providerHint = requestedProviderId ? ` from provider ${requestedProviderId}` : '';
    throw new Error(`No enabled Z Code provider exposes ${requestedModel}${providerHint}`);
  }
  return candidates[0];
}

function configure(options = {}) {
  const home = options.home || os.homedir();
  const requestedModel = options.model || 'glm-5.3-flash';
  const requestedProviderId = options.provider || null;
  const desktopFile = options.desktopFile || path.join(home, '.zcode', 'v2', 'config.json');
  const cliFile = options.cliFile || path.join(home, '.zcode', 'cli', 'config.json');
  const desktopConfig = readJson(desktopFile);
  if (!desktopConfig) throw new Error(`Missing Z Code desktop config: ${desktopFile}`);
  const selected = findProvider(desktopConfig, requestedModel, requestedProviderId);
  const current = readJson(cliFile, {});
  const next = {
    ...current,
    provider: {
      ...(current.provider || {}),
      [selected.id]: selected.provider
    },
    model: `${selected.id}/${selected.modelKey}`
  };
  writeJsonAtomic(cliFile, next);
  return {
    cliFile,
    providerId: selected.id,
    providerName: selected.provider.name || selected.id,
    model: selected.modelKey,
    preservedExistingConfig: Boolean(Object.keys(current).length)
  };
}

function parseArgs(argv) {
  const out = {};
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--model' && argv[index + 1]) out.model = argv[++index];
    else if (argv[index] === '--provider' && argv[index + 1]) out.provider = argv[++index];
  }
  return out;
}

if (require.main === module) {
  try {
    process.stdout.write(`${JSON.stringify(configure(parseArgs(process.argv.slice(2))), null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`ERROR: ${error.message}\n`);
    process.exitCode = 1;
  }
}

module.exports = { configure, findProvider };
