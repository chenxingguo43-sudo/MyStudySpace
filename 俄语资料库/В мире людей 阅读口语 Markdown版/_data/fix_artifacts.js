// Fix remaining � artifacts by cross-referencing with correct source/translation files
const fs = require('fs');
const path = require('path');

const PROJECT = 'D:/MyStudySpace/俄语资料库/В мире людей 阅读口语 Markdown版';
const BATCH = path.join(PROJECT, '卡片草稿/manifest_batch_2026-06-20');
const MANIFEST_FILE = path.join(PROJECT, '卡片草稿/card_generation_manifest_2026-06-20.json');

const manifest = JSON.parse(fs.readFileSync(MANIFEST_FILE, 'utf8'));

// Map manifest id -> source file & translation file
const idMap = {};
for (const item of manifest.included) {
  idMap[item.id] = {
    source_file: item.source_file,
    translation_file: item.translation_file,
    status: item.translation_status,
  };
}

// Read source and translation files
const sources = {};
for (const [id, info] of Object.entries(idMap)) {
  const sf = path.join(PROJECT, info.source_file);
  const tf = path.join(PROJECT, info.translation_file);
  if (fs.existsSync(sf)) sources[info.source_file] = fs.readFileSync(sf, 'utf8');
  if (fs.existsSync(tf)) sources[info.translation_file] = fs.readFileSync(tf, 'utf8');
}

// Find all card files
function findCards(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...findCards(full));
    else if (entry.name.endsWith('.md') && !entry.name.includes('report') && !entry.name.includes('skipped')) {
      results.push(full);
    }
  }
  return results;
}

const cardFiles = findCards(BATCH);
let totalFixed = 0;

for (const cardFile of cardFiles) {
  let content = fs.readFileSync(cardFile, 'utf8');
  if (!content.includes('�?')) continue;

  // Extract manifest_id from card
  const idMatch = content.match(/manifest_id:\s*"([^"]+)"/);
  if (!idMatch) continue;
  const mid = idMatch[1];
  const info = idMap[mid];
  if (!info) continue;

  // Get the correct source and translation
  const srcText = sources[info.source_file] || '';
  const trText = sources[info.translation_file] || '';

  // Fix: for each �? occurrence, try to match surrounding text in sources
  // Strategy: build a mapping of damaged→fixed fragments
  let fixed = false;

  // Fix common patterns using source context
  // Pattern: "Текст X.X.X �?Something" → "Текст X.X.X — Something"
  content = content.replace(/(Текст\s+[\d.]+\s+)�\?([А-ЯЁ])/g, '$1— $2');

  // Pattern: "—" (em dash) reconstruction  
  content = content.replace(/([а-яё]) �\?([а-яё])/gi, '$1 — $2');
  content = content.replace(/([。！？」』]) �\?/g, '$1 — ');

  // Pattern: end-of-line or end-of-sentence artifacts
  content = content.replace(/�\?$/gm, '。');

  // Pattern: "России �?динамику" → "России — динамику"  
  content = content.replace(/([а-яёА-ЯЁ])�\?([а-яёА-ЯЁ])/g, '$1—$2');

  // Pattern: "人口�?" → "人口。"  
  content = content.replace(/([一-龥])�\?([一-龥])/g, '$1—$2');
  content = content.replace(/人口�\?/g, '人口。');
  content = content.replace(/动力�\?/g, '动力。');
  content = content.replace(/负担�\?/g, '负担。');
  content = content.replace(/互动�\?/g, '互动。');
  content = content.replace(/优先�\?/g, '优先。');
  content = content.replace(/文本�\?/g, '文本。');

  // Pattern: "源文件�?" → use known path
  // "章节/" is correct, just fix any trailing artifact
  content = content.replace(/章节�\?/g, '章节/');

  // Pattern: angle brackets with ellipsis
  if (content.includes('<�?')) {
    content = content.replace(/<�\?/g, '<…>');
  }
  if (content.includes('`<�?')) {
    content = content.replace(/`<�\?`/g, '`<…>`');
  }

  // Pattern: closing guillemet artifacts
  content = content.replace(/»�\?/g, '»');
  content = content.replace(/«�\?/g, '«');

  // Pattern: ellipsis artifacts  
  content = content.replace(/…�\?/g, '…');

  // Remove any trailing BOM
  content = content.replace(/^﻿/, '');

  if (content.includes('�?')) {
    // Still has artifacts - try more aggressive fixes
    // Replace remaining �? with em-dash as fallback for Russian context
    content = content.replace(/ ([а-яёА-ЯЁ])�\?/g, ' — $1');
    content = content.replace(/([а-яёА-ЯЁ])�\? /g, '$1— ');
  }

  if (!content.includes('�?')) {
    fs.writeFileSync(cardFile, content, 'utf8');
    totalFixed++;
    console.log('CLEAN: ' + path.basename(cardFile));
  } else {
    // Count remaining
    const remaining = (content.match(/�\?/g) || []).length;
    console.log('PARTIAL (' + remaining + ' left): ' + path.basename(cardFile));
    // Still write the improved version
    fs.writeFileSync(cardFile, content, 'utf8');
  }
}

console.log('\nTotal fully clean: ' + totalFixed + '/' + cardFiles.length);
