var initSqlJs = require('sql.js');
var fs = require('fs');
var path = require('path');

var dir = 'D:/tmp/salad_russian';
var files = ['beidanci_jingjian.db','bendiV2buchong.db','dictionarybendiv2.db','previewlistv2.db'];

async function main() {
  var SQL = await initSqlJs();

  for (var f of files) {
    var filePath = path.join(dir, f);
    if (!fs.existsSync(filePath)) { console.log('=== ' + f + ' NOT FOUND ===\n'); continue; }

    var buf = fs.readFileSync(filePath);
    var db = new SQL.Database(buf);

    console.log('=== ' + f + ' (' + (buf.length/1024).toFixed(0) + ' KB) ===');

    var tables = db.exec("SELECT name FROM sqlite_master WHERE type='table'");
    if (tables.length > 0) {
      var tableNames = tables[0].values.map(function(r) { return r[0]; });

      for (var tn of tableNames) {
        var colInfo = db.exec('PRAGMA table_info(' + tn + ')');
        var cols = colInfo[0].values.map(function(r) { return r[1]; });
        var countResult = db.exec('SELECT COUNT(*) FROM ' + tn);
        var count = countResult[0].values[0][0];

        console.log('  ' + tn + ' (' + count + ' rows): ' + cols.join(', '));

        if (count > 0 && count <= 5) {
          var rows = db.exec('SELECT * FROM ' + tn + ' LIMIT 3');
          rows.forEach(function(rowSet) {
            rowSet.values.forEach(function(v) {
              console.log('    ' + JSON.stringify(v).slice(0, 300));
            });
          });
        }
      }
    }
    db.close();
    console.log('');
  }
}

main().catch(function(e) { console.error(e); });
