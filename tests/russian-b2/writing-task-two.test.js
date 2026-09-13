const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

test('task two keeps the entire OCR instruction, including decision requirements', () => {
  const root = path.resolve(__dirname, '../..');
  const source = fs.readFileSync(path.join(root, '俄语资料库/俄语B2 全模块 Markdown版/原始OCR/MinerU_full_output.md'), 'utf8');
  const task = source.split(/\r?\n/).find(line => line.startsWith('Задание 2. На основе предложенной рекламной информации'));
  assert.ok(task);
  const reader = fs.readFileSync(path.join(root, 'reader.html'), 'utf8');
  assert.ok(reader.includes(task.trim()), 'display must retain both source sentences verbatim');
});
