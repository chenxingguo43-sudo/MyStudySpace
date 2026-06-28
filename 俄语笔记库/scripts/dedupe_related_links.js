const fs = require('fs');
const path = require('path');

const VAULT = path.resolve(__dirname, '..');
const TARGET_DIRS = ['B2口语素材'];
const WRITE = process.argv.includes('--write');

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.isFile() && entry.name.endsWith('.md')) out.push(full);
  }
  return out;
}

function rel(file) {
  return path.relative(VAULT, file).replace(/\\/g, '/');
}

function dedupeRelatedBlock(text) {
  const lines = text.split(/\r?\n/);
  const relatedIndex = lines.findIndex((line) => /^##\s+相关\s*$/.test(line));
  if (relatedIndex === -1) return { text, removed: 0 };

  let end = lines.length;
  for (let i = relatedIndex + 1; i < lines.length; i++) {
    if (/^##\s+/.test(lines[i])) {
      end = i;
      break;
    }
  }

  const seen = new Set();
  let removed = 0;
  const block = [];

  for (const line of lines.slice(relatedIndex + 1, end)) {
    const match = line.match(/^\s*-\s*(\[\[[^\]]+\]\])\s*$/);
    if (!match) {
      block.push(line);
      continue;
    }

    const key = match[1];
    if (seen.has(key)) {
      removed++;
      continue;
    }
    seen.add(key);
    block.push(line);
  }

  if (removed === 0) return { text, removed: 0 };
  const next = [...lines.slice(0, relatedIndex + 1), ...block, ...lines.slice(end)].join('\n');
  return { text: next, removed };
}

let changedFiles = 0;
let removedLinks = 0;
const samples = [];

for (const dirName of TARGET_DIRS) {
  const dir = path.join(VAULT, dirName);
  if (!fs.existsSync(dir)) continue;

  for (const file of walk(dir)) {
    const original = fs.readFileSync(file, 'utf8');
    const result = dedupeRelatedBlock(original);
    if (result.removed === 0) continue;

    changedFiles++;
    removedLinks += result.removed;
    if (samples.length < 20) samples.push(`${rel(file)} (${result.removed})`);
    if (WRITE) fs.writeFileSync(file, result.text, 'utf8');
  }
}

console.log(`[dedupe-related] ${WRITE ? '已写入' : '试运行'}：${changedFiles} 个文件，${removedLinks} 个重复链接`);
if (samples.length) {
  console.log('样本:');
  for (const item of samples) console.log(`  - ${item}`);
}
if (!WRITE && changedFiles > 0) {
  console.log('使用 node scripts/dedupe_related_links.js --write 应用修改。');
}
