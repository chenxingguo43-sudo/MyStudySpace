const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '..', '..');
const BASE = path.join(ROOT, '俄语资料库', '俄语B2·原书复刻与学习版', '规范数据', '语法词汇');
const FIXES = { 'P1-Q001':'В', 'P1-Q003':'Б', 'P1-Q011':'В', 'P1-Q013':'В', 'P1-Q059':'В', 'P3-Q008':'В', 'P4-Q035':'В', 'P6-Q034':'В' };
function write(file, value) { fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', 'utf8'); }
for (const name of fs.readdirSync(BASE).filter(name => /^p\d-q\d+.*\.json$/.test(name))) {
  const file = path.join(BASE, name), unit = JSON.parse(fs.readFileSync(file, 'utf8'));
  let changed = false;
  for (const exercise of unit.exercises || []) if (FIXES[exercise.id]) { exercise.answer = FIXES[exercise.id]; exercise.sourceAnswer = FIXES[exercise.id]; changed = true; }
  if (changed) write(file, unit);
}
for (const name of fs.readdirSync(BASE).filter(name => /^part-\d{2}-source-ledger\.json$/.test(name))) {
  const file = path.join(BASE, name), ledger = JSON.parse(fs.readFileSync(file, 'utf8'));
  let changed = false;
  for (const entry of ledger.entries || []) if (FIXES[entry.exerciseId]) { entry.answer = FIXES[entry.exerciseId]; changed = true; }
  if (changed) write(file, ledger);
}
