// Parse gemini-translate-result.txt → external-vocab.json
var fs = require('fs');

var raw = fs.readFileSync('data/gemini-translate-result.txt', 'utf8');
var lines = raw.split('\n');

var vocab = {};
var skipped = 0;

for (var i = 0; i < lines.length; i++) {
  var line = lines[i].trim();
  if (!line || /^\d+\s*[—–-]\s*\d+\s*$/.test(line)) continue; // skip headers like "1 — 50"

  // Parse: "россии (Россия) — сущ. 俄罗斯"
  // or:    "который — мест. 哪个 / 那一个"
  // or:    "лишь — част. 只 / 仅仅"

  var match = line.match(/^(\S+?)(?:\s+\((\S+?)\))?\s+[—–-]\s+(.+)$/);
  if (!match) {
    if (line.length > 5) skipped++;
    continue;
  }

  var surface = match[1].toLowerCase();
  var lemma = match[2] ? match[2].toLowerCase() : surface;
  var rest = match[3]; // "сущ. 俄罗斯" or "мест. 哪个 / 那一个"

  // Extract POS and meaning
  var posMatch = rest.match(/^(.+?)\.\s+(.+)/);
  if (!posMatch) {
    // No POS marker — the whole thing is meaning
    vocab[lemma] = { meaning: rest, type: '' };
    continue;
  }

  var posRaw = posMatch[1].trim();
  var meaning = posMatch[2].trim();

  // Map Russian POS abbreviations to English
  var posMap = {
    'сущ': 'noun',
    'гл': 'verb',
    'прил': 'adj',
    'нареч': 'adv',
    'предл': 'prep',
    'союз': 'conj',
    'част': 'particle',
    'мест': 'pronoun',
    'числит': 'numeral',
    'числ': 'numeral',
    'межд': 'interjection',
    'вводн': 'adv',
    'дееприч': 'adv',
    'прич': 'adj',
  };

  var posType = '';
  for (var key in posMap) {
    if (posRaw.indexOf(key) >= 0) { posType = posMap[key]; break; }
  }

  vocab[lemma] = {
    meaning: meaning,
    type: posType
  };
}

console.log('Parsed entries:', Object.keys(vocab).length);
console.log('Skipped lines:', skipped);

// Write
fs.writeFileSync('data/external-vocab.json', JSON.stringify(vocab, null, 2), 'utf8');
console.log('Written to data/external-vocab.json');

// Show samples
var keys = Object.keys(vocab).slice(0, 15);
keys.forEach(function(k) {
  console.log('  ' + k + ' → ' + vocab[k].meaning + ' [' + vocab[k].type + ']');
});
console.log('  ...');
