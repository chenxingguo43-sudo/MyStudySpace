const fs = require('node:fs');
const path = require('node:path');
const https = require('node:https');
const crypto = require('node:crypto');
const Core = require('../../js/russian-dictionary/core');

const ROOT = path.resolve(__dirname, '..', '..');
const API = 'https://ru.wiktionary.org/w/api.php';
const OUTPUT = path.join(ROOT, 'data', 'dictionary', 'wiktionary-ru.json');
const MANIFEST = path.join(ROOT, 'data', 'dictionary', 'manifest.json');

function cleanDefinition(value) {
  let text = String(value || '').replace(/\{\{пример[\s\S]*$/i, '').trim();
  text = text.replace(/\{\{t:=\|[^|{}]*\|([^{}]*)\}\}/gi, '$1');
  text = text.replace(/\[\[[^\]|]+\|([^\]]+)\]\]/g, '$1').replace(/\[\[([^\]]+)\]\]/g, '$1');
  text = text.replace(/\{\{(?:помета|разг\.|устар\.)\|([^{}|]+)[^{}]*\}\}/gi, '($1)');
  text = text.replace(/\{\{[^{}]*\}\}/g, '').replace(/<[^>]+>/g, '').replace(/'{2,}/g, '');
  return text.replace(/\s+/g, ' ').replace(/\s+([,.;:])/g, '$1').trim();
}

function extractRussianDefinitions(wikitext) {
  const source = String(wikitext || '');
  const russianAt = source.search(/^=\s*\{\{-ru-\}\}\s*=/m);
  if (russianAt < 0) return [];
  const afterRussian = source.slice(russianAt);
  const nextLanguage = afterRussian.slice(1).search(/^=\s*\{\{-[a-z-]+-\}\}\s*=/m);
  const russian = nextLanguage < 0 ? afterRussian : afterRussian.slice(0, nextLanguage + 1);
  const meaningAt = russian.search(/^====\s*Значение\s*====/m);
  if (meaningAt < 0) return [];
  const afterMeaning = russian.slice(meaningAt).replace(/^====[^\n]*\n?/, '');
  const nextSection = afterMeaning.search(/^====/m);
  const block = nextSection < 0 ? afterMeaning : afterMeaning.slice(0, nextSection);
  return [...new Set(block.split(/\r?\n/)
    .filter(line => /^#(?![:*])/.test(line))
    .map(line => cleanDefinition(line.replace(/^#\s*/, '')))
    .filter(text => text.length >= 3 && !/^[-—]$/.test(text)))];
}

function requestJson(params, attempt = 0) {
  const url = new URL(API);
  url.search = new URLSearchParams(params);
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'MyStudySpaceDictionary/1.0 (local learning project)' } }, response => {
      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => {
        if ((response.statusCode === 429 || response.statusCode >= 500) && attempt < 4) {
          const waitMs = Math.max(1500, Number(response.headers['retry-after'] || 0) * 1000);
          return setTimeout(() => requestJson(params, attempt + 1).then(resolve, reject), waitMs);
        }
        if (response.statusCode !== 200) return reject(new Error(`Wiktionary API failed (${response.statusCode})`));
        try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); } catch (error) { reject(error); }
      });
    }).on('error', error => {
      if (attempt < 4) return setTimeout(() => requestJson(params, attempt + 1).then(resolve, reject), 1500 * (attempt + 1));
      reject(error);
    });
  });
}

async function buildWiktionarySupplement() {
  const report = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'dictionary', 'coverage-report.json'), 'utf8'));
  const morphology = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'dictionary', 'corpus-morphology.json'), 'utf8'));
  const candidates = new Set();
  const unresolvedForms = new Set(report.structuredTextbooks.unresolved || []);
  (report.wholeReader.topUnresolved || []).forEach(item => unresolvedForms.add(item.form));
  for (const form of unresolvedForms) {
    const lemmas = morphology[form] && morphology[form].lemmas || [];
    (lemmas.length ? lemmas : [form]).forEach(lemma => candidates.add(Core.normalizeRussian(lemma)));
  }
  const words = [...candidates].filter(Boolean).sort((a, b) => a.localeCompare(b, 'ru'));
  let output = {};
  try { output = JSON.parse(fs.readFileSync(OUTPUT, 'utf8')); } catch (_error) {}
  for (let at = 0; at < words.length; at += 20) {
    if (at) await new Promise(resolve => setTimeout(resolve, 350));
    const batch = words.slice(at, at + 20);
    const data = await requestJson({
      action: 'query', prop: 'revisions', rvprop: 'ids|content', rvslots: 'main',
      formatversion: '2', format: 'json', titles: batch.join('|')
    });
    for (const page of data.query && data.query.pages || []) {
      if (page.missing || !page.revisions || !page.revisions[0]) continue;
      const revision = page.revisions[0];
      const definitionsRu = extractRussianDefinitions(revision.slots && revision.slots.main && revision.slots.main.content);
      const lemma = Core.normalizeRussian(page.title);
      if (!lemma || !definitionsRu.length) continue;
      output[lemma] = {
        definitionsRu: definitionsRu.slice(0, 6),
        source: 'Русский Викисловарь · CC BY-SA 4.0',
        page: `https://ru.wiktionary.org/wiki/${encodeURIComponent(page.title)}`,
        revisionId: revision.revid
      };
    }
  }
  fs.writeFileSync(OUTPUT, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
  let manifest = {};
  try { manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8')); } catch (_error) {}
  manifest.wiktionaryRu = {
    license: 'CC-BY-SA-4.0', api: API, entryCount: Object.keys(output).length,
    output: 'data/dictionary/wiktionary-ru.json',
    sha256: crypto.createHash('sha256').update(fs.readFileSync(OUTPUT)).digest('hex')
  };
  fs.writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  return output;
}

if (require.main === module) buildWiktionarySupplement()
  .then(output => console.log(`Built Russian Wiktionary supplement with ${Object.keys(output).length} entries.`))
  .catch(error => { console.error(error); process.exitCode = 1; });

module.exports = { cleanDefinition, extractRussianDefinitions, buildWiktionarySupplement };
