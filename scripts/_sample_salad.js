var initSqlJs = require('sql.js');
var fs = require('fs');

async function main() {
  var SQL = await initSqlJs();

  // Check beidanci_jingjian.db (vocab for learning)
  var buf = fs.readFileSync('D:/tmp/salad_russian/beidanci_jingjian.db');
  var db = new SQL.Database(buf);
  console.log('=== beidanci_jingjian.db (背单词精简) ===');
  var r = db.exec("SELECT english, chinese FROM t_words LIMIT 30");
  r[0].values.forEach(function(v) { console.log(v[0] + ' → ' + v[1]); });
  console.log('Total:', db.exec("SELECT COUNT(*) FROM t_words")[0].values[0][0]);
  db.close();

  // Check dictionarybendiv2.db (full dictionary)
  buf = fs.readFileSync('D:/tmp/salad_russian/dictionarybendiv2.db');
  db = new SQL.Database(buf);
  console.log('\n=== dictionarybendiv2.db (本地字典V2) ===');
  r = db.exec("SELECT english, chinese FROM t_words LIMIT 20");
  r[0].values.forEach(function(v) { console.log(v[0] + ' → ' + v[1]); });
  console.log('Total:', db.exec("SELECT COUNT(*) FROM t_words")[0].values[0][0]);
  db.close();

  // Check bendiV2buchong.db (supplementary)
  buf = fs.readFileSync('D:/tmp/salad_russian/bendiV2buchong.db');
  db = new SQL.Database(buf);
  console.log('\n=== bendiV2buchong.db (本地V2补充) ===');
  r = db.exec("SELECT english, chinese FROM t_words LIMIT 15");
  r[0].values.forEach(function(v) { console.log(v[0] + ' → ' + v[1]); });
  console.log('Total:', db.exec("SELECT COUNT(*) FROM t_words")[0].values[0][0]);
  db.close();
}

main().catch(function(e) { console.error(e); });
