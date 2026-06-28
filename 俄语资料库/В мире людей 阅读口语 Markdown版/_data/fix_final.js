// Final fix: match corrupted text fragments against correct source files and replace whole sentences
const fs = require('fs');
const path = require('path');

const PROJECT = 'D:/MyStudySpace/俄语资料库/В мире людей 阅读口语 Markdown版';
const BATCH = path.join(PROJECT, '卡片草稿/manifest_batch_2026-06-20');
const MANIFEST_FILE = path.join(PROJECT, '卡片草稿/card_generation_manifest_2026-06-20.json');

const manifest = JSON.parse(fs.readFileSync(MANIFEST_FILE, 'utf8'));

const idMap = {};
for (const item of manifest.included) {
  idMap[item.id] = {
    source_file: item.source_file,
    translation_file: item.translation_file,
  };
}

// Read all source files
const sourceCache = {};
const translationCache = {};

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

// Extract all sentences from a text
function extractSentences(text) {
  // Split on periods, question marks, exclamation, and Chinese punctuation
  return text.split(/(?<=[.!?…。！？\n>])/).map(s => s.trim()).filter(s => s.length > 4);
}

// Find best match for a corrupted fragment in source texts
function findBestMatch(fragment, sentences) {
  // Clean the fragment: keep Russian/Cyrillic/Chinese chars, remove artifacts
  const clean = fragment.replace(/�\?/g, '').replace(/\s+/g, ' ').trim();
  if (clean.length < 5) return null;
  
  // Try exact substring match first (with cleaned text)
  for (const s of sentences) {
    const sClean = s.replace(/\s+/g, ' ').trim();
    if (sClean.includes(clean)) return s;
  }
  
  // Try word overlap
  const words = clean.split(/\s+/).filter(w => w.length > 2);
  if (words.length < 2) return null;
  
  let best = null, bestScore = 0;
  for (const s of sentences) {
    const sClean = s.replace(/\s+/g, ' ').trim();
    let score = 0;
    for (const w of words) {
      if (sClean.includes(w)) score++;
    }
    if (score > bestScore && score >= words.length * 0.6) {
      bestScore = score;
      best = s;
    }
  }
  return bestScore >= 2 ? best : null;
}

function fixCard(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  if (!content.includes('�?')) return { file: path.basename(filePath), fixed: 0, remaining: 0 };

  const idMatch = content.match(/manifest_id:\s*"([^"]+)"/);
  if (!idMatch) return { file: path.basename(filePath), fixed: 0, remaining: 99 };
  const mid = idMatch[1];
  const info = idMap[mid];
  if (!info) return { file: path.basename(filePath), fixed: 0, remaining: 99 };

  // Load source and translation
  const sfPath = path.join(PROJECT, info.source_file);
  const tfPath = path.join(PROJECT, info.translation_file);
  
  if (!sourceCache[sfPath]) {
    sourceCache[sfPath] = fs.existsSync(sfPath) ? extractSentences(fs.readFileSync(sfPath, 'utf8')) : [];
  }
  if (!translationCache[tfPath]) {
    translationCache[tfPath] = fs.existsSync(tfPath) ? extractSentences(fs.readFileSync(tfPath, 'utf8')) : [];
  }
  
  const srcSentences = sourceCache[sfPath];
  const trSentences = translationCache[tfPath];
  const allSentences = [...srcSentences, ...trSentences];

  // Find corrupted lines
  let lines = content.split('\n');
  let fixedCount = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.includes('�?')) continue;
    
    // Extract the meaningful part (remove markdown markers)
    let cleanLine = line.replace(/^[#>*\s`|]+/, '').replace(/[`*_#>|]+$/g, '').trim();
    
    const match = findBestMatch(cleanLine, allSentences);
    if (match) {
      // Preserve any markdown prefix/suffix
      const prefix = line.match(/^([#>*\s`|]+)/);
      const suffix = line.match(/([`*_#>|]+)$/);
      const newLine = (prefix ? prefix[1] : '') + match.trim() + (suffix ? suffix[1] : '');
      lines[i] = newLine;
      fixedCount++;
    }
  }
  
  content = lines.join('\n');
  
  // Quick cleanup: common artifacts that the fuzzy match might have missed
  content = content.replace(/Markdown�\?/g, 'Markdown版');
  content = content.replace(/翻译�\?/g, '翻译版');
  content = content.replace(/章节�\?/g, '章节/');
  content = content.replace(/»�\?/g, '»');
  
  const remaining = (content.match(/�\?/g) || []).length;
  
  // Write back even if not perfect — it's better than before
  fs.writeFileSync(filePath, content, 'utf8');
  
  return { file: path.basename(filePath), fixed: fixedCount, remaining };
}

const cards = findCards(BATCH);
let totalFixed = 0, totalRemaining = 0;

for (const card of cards) {
  const result = fixCard(card);
  totalFixed += result.fixed;
  totalRemaining += result.remaining;
  if (result.remaining === 0) console.log('CLEAN: ' + result.file);
  else console.log('PARTIAL(' + result.remaining + '): ' + result.file);
}

console.log('\n=== SUMMARY ===');
console.log('Total sentences fixed: ' + totalFixed);
console.log('Total artifacts remaining: ' + totalRemaining + ' across ' + cards.length + ' cards');
