// ingest_vocab.js — Parse 俄语词汇表.md and generate Obsidian markdown files
// Usage: node scripts/ingest_vocab.js "E:\Desktop\俄语词汇表.md"

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SRC = process.argv[2] || 'E:\\Desktop\\俄语词汇表.md';
const VOCAB_DIR = path.join(__dirname, '..', '俄语笔记库', '词汇');

const TYPE_DIR = {
  noun: '名词',
  verb: '动词',
  adj: '形容词',
  adv: '副词',
};

// Ensure subdirectories exist
Object.values(TYPE_DIR).forEach(d => {
  const full = path.join(VOCAB_DIR, d);
  if (!fs.existsSync(full)) fs.mkdirSync(full, { recursive: true });
});

// ---- POS detection ----

// Known neuter nouns that end in -о/-е (not adverbs)
const NEUTER_NOUNS = new Set([
  'стекло', 'ребро', 'колесо', 'письмо', 'окно', 'вино',
  'лето', 'место', 'золото', 'болото', 'тело', 'дело', 'лицо',
  'чудовище', 'вещество', 'существо', 'яйцо', 'кольцо', 'крыльцо',
  'серебро', 'добро', 'зерно', 'пятно', 'благо', 'пенсне',
  'кино', 'метро', 'пальто', 'радио', 'такси',
]);

function detectPOS(baseForm, note) {
  const w = baseForm.trim();

  // Phrases (multi-word)
  if (/\s/.test(w)) return 'phrase';

  // Verb endings (check first — most distinctive)
  if (/[аеиоуыэюя]ть(?:ся)?$/.test(w)) return 'verb';
  if (/[аеиоуыэюя]ти(?:сь)?$/.test(w)) return 'verb';
  if (/[аеиоуыэюя]чь(?:ся)?$/.test(w)) return 'verb';
  if (/[аеиоуыэюя]сти(?:сь)?$/.test(w)) return 'verb';

  // Adjective endings (clear markers)
  if (/[ыио]й$/.test(w)) return 'adj';
  if (/[ыио]йся$/.test(w)) return 'adj';

  // ---- Words ending in -о or -е: adverb vs neuter noun ----
  if (/[ое]$/.test(w)) {
    // Strong neuter noun patterns
    if (/(?:ни|ти|ств|и|ь)[её]$/.test(w)) return 'noun';  // -ние, -тие, -ство, -ие, -ье
    if (/ств[оа]$/.test(w)) return 'noun';                   // -ство
    if (NEUTER_NOUNS.has(w.toLowerCase())) return 'noun';

    // Adverb patterns:
    // -ски, -чески, -ически (практически, логически)
    if (/(?:ск|ческ|ическ)и$/.test(w)) return 'adv';
    // -ому (по-новому)
    if (/ому$/.test(w)) return 'adv';
    // -о/-е after soft/hard consonants from adjectives: -но, -то, -ко, -во, -чно, -жно, -шо, etc.
    // These are adverbial endings from adjectives (аккуратно, вредно, чётко, etc.)
    if (/[бвгджзклмнпрстфхцчшщ][ао]$/.test(w)) return 'adv';
    if (/[бвгджзклмнпрстфхцчшщ]е$/.test(w)) return 'adv';
    // -о after vowel (неосознанно, постоянно)
    if (/[аеиоуыэюя]о$/.test(w)) return 'adv';
    // -ее (comparative adverbs: скорее, быстрее)
    if (/ее$/.test(w)) return 'adv';
    // -же, -ше, -ще (тоже, больше, ещё)
    if (/[жшщ]е$/.test(w)) return 'adv';

    // Remaining -о/-е: conservative default to noun
    return 'noun';
  }

  // Words ending in -и (could be adverb like практически, or plural noun)
  if (/и$/.test(w)) {
    if (/ски$/.test(w)) return 'adv';
    if (/чески$/.test(w)) return 'adv';
    return 'noun'; // conservative: plural or indeclinable
  }

  // Ends in consonant, -а, -я, -ь → nouns
  if (/[ая]$/.test(w)) return 'noun';
  if (/[бвгджзклмнпрстфхцчшщ]$/.test(w)) return 'noun';
  if (/[йь]$/.test(w)) return 'noun';

  // Fallback
  return 'noun';
}

// Map internal type to directory name
function getDirName(posType) {
  if (posType === 'noun') return '名词';
  if (posType === 'verb') return '动词';
  if (posType === 'adj' || posType === 'adj_short') return '形容词';
  if (posType === 'adv' || posType === 'gerund') return '副词';
  if (posType === 'phrase') return '.'; // put phrases directly in 词汇/
  return '名词';
}

function getTypeName(posType) {
  if (posType === 'noun') return 'noun';
  if (posType === 'verb') return 'verb';
  if (posType === 'adj' || posType === 'adj_short') return 'adj';
  if (posType === 'adv') return 'adv';
  if (posType === 'gerund') return 'gerund';
  if (posType === 'phrase') return 'phrase';
  return 'noun';
}

function inferGender(baseForm) {
  const w = baseForm.trim();
  if (/[бвгджзклмнпрстфхцчшщй]$/.test(w)) return 'masculine';
  if (/[ая]$/.test(w)) return 'feminine';
  if (/[ое]$/.test(w)) return 'neuter';
  if (/ь$/.test(w)) return 'feminine'; // most -ь nouns are feminine, imperfect but reasonable default
  return '';
}

function inferAspect(baseForm) {
  const w = baseForm.trim();
  // Perfective verbs often have prefixes and no -ыва-/-ива-/-ва- infix
  if (/^(?:по|с|на|за|вы|при|про|от|раз|об|у|из|до|пере|вз|о)/.test(w) && !/(?:ыва|ива|ва)ть/.test(w)) {
    return 'сов.';
  }
  return 'несов.';
}

function inferPair(baseForm, aspect) {
  // Basic imperfective → perfective mapping: strip -ыва-/-ива-, add prefix
  if (aspect === 'несов.') {
    let pair = baseForm
      .replace(/ывать$/, 'ать')
      .replace(/ивать$/, 'ить')
      .replace(/евать$/, 'евать'); // complex, just provide placeholder
    if (pair !== baseForm) return pair;
  }
  return '';
}

function makeFrontmatter(baseForm, meaning, posType) {
  const typeName = getTypeName(posType);
  const lines = [];
  lines.push('---');
  lines.push(`word: "${baseForm}"`);
  lines.push(`type: ${typeName}`);
  lines.push(`meaning: "${meaning}"`);
  lines.push('mastery: 1');
  lines.push('tags: []');

  if (posType === 'verb') {
    const aspect = inferAspect(baseForm);
    lines.push(`aspect: "${aspect}"`);
    const pair = inferPair(baseForm, aspect);
    lines.push(`pair: "${pair}"`);
    lines.push('case_gov: ""');
    lines.push('conj_pattern: ""');
  }

  if (posType === 'noun') {
    const gender = inferGender(baseForm);
    lines.push(`gender: "${gender}"`);
    lines.push(`animate: false`);
    lines.push('plural_gen: ""');
  }

  if (posType === 'adj' || posType === 'adj_short') {
    lines.push('short_form: ""');
    lines.push('comparative: ""');
  }

  if (posType === 'gerund') {
    lines.push('from_verb: ""');
  }

  lines.push('examples:');
  lines.push('  - ru: ""');
  lines.push('    zh: ""');
  const date = new Date().toISOString().split('T')[0];
  lines.push(`created: ${date}`);
  lines.push('---');
  lines.push('');
  lines.push(`# ${baseForm}`);
  lines.push('');
  lines.push('## 释义');
  lines.push('');
  lines.push(meaning);
  lines.push('');
  lines.push('## 例句');
  lines.push('');
  lines.push('| 俄语 | 中文 |');
  lines.push('|------|------|');
  lines.push('| | |');
  lines.push('');
  lines.push('## 变位/变格/接格');
  lines.push('- ');
  lines.push('');
  lines.push('## 相关词');
  lines.push('- [[]]');
  lines.push('');

  return lines.join('\n');
}

// ---- Parse the markdown file ----

const raw = fs.readFileSync(SRC, 'utf-8').replace(/\r\n/g, '\n');

// Split into lines and extract table rows
const lines = raw.split('\n');
const entries = [];

let inTable = false;
for (const line of lines) {
  const trimmed = line.trim();
  // Detect table rows: start with | and have exactly 3 cells
  if (/^\|.*\|.*\|.*\|$/.test(trimmed)) {
    const cells = trimmed.split('|').filter(s => s.trim() !== '');
    if (cells.length === 3) {
      const [original, base, meaning] = cells.map(s => s.trim());
      // Skip header rows
      if (original === '原词 (笔记内容)' || original === '原词' || original === '---') continue;
      if (original && base && meaning) {
        entries.push({ original, base, meaning });
      }
    }
  }
}

console.log(`Parsed ${entries.length} vocabulary entries.`);

// Deduplicate by base form
const seen = new Set();
const unique = [];
for (const e of entries) {
  if (!seen.has(e.base)) {
    seen.add(e.base);
    unique.push(e);
  } else {
    console.log(`  [skip duplicate] ${e.base}`);
  }
}
console.log(`Unique entries: ${unique.length}`);

// Generate files
let created = 0;
let skipped = 0;
const stats = { noun: 0, verb: 0, adj: 0, adv: 0, gerund: 0, phrase: 0 };

for (const entry of unique) {
  const posType = detectPOS(entry.base, entry.meaning);
  const dirName = getDirName(posType);
  const dirPath = path.join(VOCAB_DIR, dirName);

  // Sanitize filename: replace problematic chars
  let fname = entry.base.replace(/[/\\:*?"<>|]/g, '_');
  // For phrases, use a short hash
  if (posType === 'phrase') {
    const hash = crypto.createHash('md5').update(entry.base).digest('hex').slice(0, 8);
    fname = fname.slice(0, 30) + '-' + hash;
  }
  const fpath = path.join(dirPath, fname + '.md');

  if (fs.existsSync(fpath)) {
    console.log(`  [skip exists] ${fname}`);
    skipped++;
    continue;
  }

  const content = makeFrontmatter(entry.base, entry.meaning, posType);
  fs.writeFileSync(fpath, content, 'utf-8');
  stats[posType] = (stats[posType] || 0) + 1;
  created++;
}

console.log(`\nDone. Created: ${created}, Skipped: ${skipped}`);
console.log(`Breakdown: noun=${stats.noun}, verb=${stats.verb}, adj=${stats.adj}, adv=${stats.adv}, gerund=${stats.gerund}, phrase=${stats.phrase}`);
