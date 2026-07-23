/**
 * Import salad_russian beidanci_jingjian.db into dictionary format.
 * Outputs: data/dictionary/salad-vocab.json
 *
 * In reader.html lookup pipeline, insert this BEFORE FreeDict to get clean
 * Chinese definitions for common Russian words.
 */

var initSqlJs = require('sql.js');
var fs = require('fs');
var path = require('path');

var DB_PATH = 'D:/tmp/salad_russian/beidanci_jingjian.db';
var OUTPUT = path.join(__dirname, '..', 'data', 'dictionary', 'salad-vocab.json');

async function main() {
  var SQL = await initSqlJs();
  var buf = fs.readFileSync(DB_PATH);
  var db = new SQL.Database(buf);

  var rows = db.exec("SELECT english, chinese FROM t_words");
  db.close();

  var lookup = {};
  var total = rows[0].values.length;
  var skipped = 0;

  for (var i = 0; i < total; i++) {
    var word = (rows[0].values[i][0] || '').trim();
    var def = (rows[0].values[i][1] || '').trim();

    // Skip empty or non-Russian entries
    if (!word || !def) { skipped++; continue; }
    // Must contain Cyrillic
    if (!/[а-яёА-ЯЁ]/.test(word)) { skipped++; continue; }

    var key = word.toLowerCase()
      // Normalize stress marks
      .replace(/['́]/g, '́')
      // Remove leading/trailing noise chars
      .replace(/^[^а-яё]+/, '')
      .replace(/[^а-яё]+$/, '')
      .normalize('NFC');

    if (!key || key.length < 2) { skipped++; continue; }

    // Clean up definition: remove HTML tags
    var cleanDef = def
      .replace(/<br>/gi, '；')
      .replace(/<[^>]+>/g, '')
      .replace(/\n+/g, ' ')
      .replace(/\\n/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanDef) { skipped++; continue; }

    if (!lookup[key]) {
      lookup[key] = cleanDef;
    }
  }

  console.log('Total raw entries: ' + total);
  console.log('Skipped: ' + skipped);
  console.log('Unique clean entries: ' + Object.keys(lookup).length);

  // Sort for deterministic output
  var sorted = {};
  Object.keys(lookup).sort().forEach(function(k) { sorted[k] = lookup[k]; });

  fs.writeFileSync(OUTPUT, JSON.stringify(sorted, null, 2), 'utf-8');
  console.log('Written to ' + OUTPUT);
  console.log('File size: ' + (fs.statSync(OUTPUT).size / 1024).toFixed(0) + ' KB');

  // Show some samples
  var keys = Object.keys(sorted);
  var samples = ['неожиданно', 'обожать', 'связанный', 'всякий', 'какой-то', 'пользоваться','прекрасно'];
  console.log('\n=== Sample entries ===');
  samples.forEach(function(w) {
    console.log(w + ' → ' + (sorted[w] || '(not found)'));
  });
}

main().catch(function(e) { console.error(e); process.exit(1); });
