// Parse gemini-translate-result.txt → MERGE into external-vocab.json
var fs = require('fs');

// Load existing external vocab
var vocab = {};
try {
  vocab = JSON.parse(fs.readFileSync('data/external-vocab.json', 'utf8'));
} catch(e) { vocab = {}; }

var raw = fs.readFileSync('data/gemini-translate-result.txt', 'utf8');
var lines = raw.split('\n');
var skipped = 0, added = 0;

function norm(w) {
  return w.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')  // strip stress marks
    .replace(/ё/g, 'е').replace(/Ё/g, 'е');
}

// POS mapping
var posMap = {
  'сущ': 'noun',     'гл': 'verb',      'прил': 'adj',
  'нареч': 'adv',    'предл': 'prep',   'союз': 'conj',
  'част': 'particle','мест': 'pronoun', 'числит': 'numeral',
  'числ': 'numeral', 'межд': 'interjection', 'вводн': 'adv',
  'дееприч': 'adv',  'прич': 'adj',     'кратк': 'adj',
};

function hasChinese(t) { return /[一-鿿]/.test(t); }

function extractLemma(surface, annotation) {
  // Handle: "воины — 名词（复数） 战士们"
  // Handle: "королей (原词错作королева) — 名词..."
  // Handle: "Муромский (原词错作муромскый) — 专有名词..."

  // Extract the real lemma from annotation, or use surface
  if (annotation) {
    // annotation is like "(原词错作королева)"  — extract correct form
    var corr = annotation.match(/原词错作(\S+)/);
    if (corr) return { lemma: corr[1], isCorrected: true };
  }
  return { lemma: surface, isCorrected: false };
}

for (var i = 0; i < lines.length; i++) {
  var line = lines[i].trim();
  if (!line || line.length < 5) continue;
  if (/^\d+\s*[—–-]\s*\d+\s*$/.test(line)) continue;
  if (!hasChinese(line)) continue; // must have Chinese to be a translation line

  // Try multiple parse patterns
  var match;

  // Pattern 1: "воины — 名词（复数） 战士们、军人们"
  // Pattern 2: "королей (原词错作королева) — 名词..."
  // Pattern 3: "компании — 名词（单数第二格） 公司"
  // Pattern 4: "продаж — 名词（复数第二格） 销售、发售"

  // Match: <surface> (optional annotation) — <POS stuff> .? <meaning>
  match = line.match(/^(\S+?)\s+(?:\((原词错作\S+)\)\s+)?[—–-]\s+(.+)$/);
  if (!match) {
    // Try simpler: <surface> — <meaning> (no POS)
    match = line.match(/^(\S+)\s+[—–-]\s+(.+)$/);
    if (match && hasChinese(match[2])) {
      var lemma = norm(match[1]);
      if (!vocab[lemma]) {
        vocab[lemma] = { meaning: match[2].trim(), type: '' };
        added++;
      }
      continue;
    }
    if (line.length > 8 && hasChinese(line)) skipped++;
    continue;
  }

  var surface = match[1];
  var annotation = match[2] || '';
  var rest = match[3]; // "名词（复数） 战士们、军人们" or "сущ. 俄罗斯"

  // Extract lemma (correct for misspellings)
  var lemmaInfo = extractLemma(surface, annotation);
  var lemma = norm(lemmaInfo.lemma);

  // If surface is already the lemma (not corrected), normalize it too
  if (!lemmaInfo.isCorrected) lemma = norm(surface);

  // Skip if already have this lemma
  if (vocab[lemma]) continue;

  // Extract meaning: take everything after the last recognizable POS pattern
  // "名词（复数） 战士们、军人们" → meaning = "战士们、军人们"
  // "сущ. 俄罗斯" → meaning = "俄罗斯"

  var meaning = rest;

  // Strip leading POS info
  var posClean = meaning;

  // Try to find where actual meaning starts (after the POS descriptors)
  // Common patterns: "名词（...）", "гл.", "прил.", "сущ.", etc.
  var posPrefixes = [
    /^(名词|动词|形容词|副词|前置词|连词|语气词|代词|数词|感叹词|插入语|副动词|形动词|短尾形容词|短尾形动词|专有名词)[（(][^)）]*[)）]?\s*/,
    /^(сущ|гл|прил|нареч|предл|союз|част|мест|числит|числ|межд|вводн|дееприч|прич|кратк)\.[^а-яА-ЯёЁ]*\s*/,
    /^\((原词错作\S+)\)\s*/,
  ];

  for (var p = 0; p < posPrefixes.length; p++) {
    var m2 = posClean.match(posPrefixes[p]);
    if (m2) {
      meaning = posClean.substring(m2[0].length).trim();
      break;
    }
  }

  // If meaning still starts with Russian (didn't strip POS properly), try harder
  if (/^[а-яА-ЯёЁ]/.test(meaning) && meaning.length > 3) {
    // Looks like the whole rest is meaning (no POS prefix)
    // Try splitting on first space after Chinese-appearing content
    var chIdx = meaning.search(/[一-鿿]/);
    if (chIdx > 0) meaning = meaning.substring(chIdx);
  }

  if (!hasChinese(meaning) && hasChinese(rest)) {
    // POS stripping failed, use the original rest
    meaning = rest;
  }

  if (!meaning || !hasChinese(meaning)) {
    if (hasChinese(rest)) { meaning = rest; }
    else { skipped++; continue; }
  }

  // Extract POS type
  var posType = '';
  for (var key in posMap) {
    if (rest.indexOf(key) >= 0) { posType = posMap[key]; break; }
  }
  // Also check Chinese POS names
  var cnPos = {
    '名词': 'noun', '动词': 'verb', '形容词': 'adj', '副词': 'adv',
    '前置词': 'prep', '连词': 'conj', '语气词': 'particle',
    '代词': 'pronoun', '数词': 'numeral', '专有名词': 'noun',
  };
  for (var cn in cnPos) {
    if (rest.indexOf(cn) >= 0) { posType = cnPos[cn]; break; }
  }

  vocab[lemma] = { meaning: meaning, type: posType };
  added++;
}

// Save merged result
fs.writeFileSync('data/external-vocab.json', JSON.stringify(vocab, null, 2), 'utf8');
console.log('Existing entries:', Object.keys(vocab).length - added);
console.log('Added:', added);
console.log('Total external vocab:', Object.keys(vocab).length);
console.log('Skipped lines:', skipped);

// Show new additions
var keys = Object.keys(vocab);
var newKeys = keys.slice(Math.max(0, keys.length - added - 5));
console.log('\nNew entries sample:');
newKeys.slice(-10).forEach(function(k) {
  console.log('  ' + k + ' → ' + vocab[k].meaning + ' [' + vocab[k].type + ']');
});
