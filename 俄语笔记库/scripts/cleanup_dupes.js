const fs = require('fs');
const path = require('path');

const baseDir = path.resolve(__dirname, '..', 'B2口语素材');

// ── Helpers ──
function hasCorruptedEmoji(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return content.includes('�'); // U+FFFD replacement char
  } catch { return false; }
}

function readFrontmatter(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const m = raw.match(/^---\n([\s\S]*?)\n---/);
    return m ? m[1] : '';
  } catch { return ''; }
}

function isTemplatePlaceholder(filePath) {
  const fm = readFrontmatter(filePath);
  return fm.includes('ru: "俄语"') || fm.includes('ru: "俄语原文（带重音）"');
}

function filesIdentical(a, b) {
  try {
    return fs.readFileSync(a, 'utf8') === fs.readFileSync(b, 'utf8');
  } catch { return false; }
}

// Strip trailing -1 from filename stem (before .md)
function nameWithoutMinus1(filename) {
  return filename.replace(/-1\.md$/, '.md');
}

let deletedCount = 0;
let renamedCount = 0;
let fixedInPlace = 0;
let skippedCount = 0;

// ── Step 1: Find ALL -1.md files ──
function findAllMinus1(dir) {
  const results = [];
  function walk(d) {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      if (entry.isDirectory()) walk(path.join(d, entry.name));
      else if (entry.name.endsWith('-1.md')) results.push(path.join(d, entry.name));
    }
  }
  walk(dir);
  return results;
}

console.log('=== 清理脏数据 ===\n');

// ── Step 1: Process all -1.md files ──
const minus1Files = findAllMinus1(baseDir);
console.log(`发现 ${minus1Files.length} 个 -1.md 文件\n`);

for (const filePath of minus1Files) {
  const dir = path.dirname(filePath);
  const basename = path.basename(filePath);
  const originalName = nameWithoutMinus1(basename);
  const originalPath = path.join(dir, originalName);
  const originalExists = fs.existsSync(originalPath);

  // Case A: Template placeholders → delete
  if (isTemplatePlaceholder(filePath)) {
    fs.unlinkSync(filePath);
    console.log(`  🗑 模板占位: ${basename}`);
    deletedCount++;
    continue;
  }

  // Case B: No original exists → just rename
  if (!originalExists) {
    fs.renameSync(filePath, originalPath);
    console.log(`  ✏ 重命名(无原文件): ${basename} → ${originalName}`);
    renamedCount++;
    continue;
  }

  // Case C: Original has corrupted emoji → delete original, rename -1
  if (hasCorruptedEmoji(originalPath)) {
    fs.unlinkSync(originalPath);
    fs.renameSync(filePath, originalPath);
    console.log(`  🔧 修复emoji: ${path.basename(originalPath)}`);
    deletedCount++;
    renamedCount++;
    continue;
  }

  // Case D: Both exist, content identical → delete -1
  if (filesIdentical(filePath, originalPath)) {
    fs.unlinkSync(filePath);
    console.log(`  🗑 完全重复: ${basename}`);
    deletedCount++;
    continue;
  }

  // Case E: Both exist, content differs → keep file with more/better fields
  // Strategy: prefer the one with more section/extra fields filled in
  const fm1 = readFrontmatter(originalPath);
  const fm2 = readFrontmatter(filePath);
  const fields1 = (fm1.match(/^\w+:/gm) || []).length;
  const fields2 = (fm2.match(/^\w+:/gm) || []).length;
  const hasCorrupt1 = fm1.includes('�');
  const hasCorrupt2 = fm2.includes('�');

  if (hasCorrupt1 && !hasCorrupt2) {
    fs.unlinkSync(originalPath);
    fs.renameSync(filePath, originalPath);
    console.log(`  🔧 保留修正版: ${path.basename(originalPath)}`);
    deletedCount++;
    renamedCount++;
  } else if (fields2 > fields1) {
    fs.unlinkSync(originalPath);
    fs.renameSync(filePath, originalPath);
    console.log(`  🔧 保留丰富版: ${path.basename(originalPath)}`);
    deletedCount++;
    renamedCount++;
  } else {
    fs.unlinkSync(filePath);
    console.log(`  🗑 保留原版: ${basename}`);
    deletedCount++;
  }
}

// ── Step 2: Fix emoji-corrupted files WITHOUT -1 copies ──
function findAllEmojiCorrupted(dir) {
  const results = [];
  function walk(d) {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      if (entry.isDirectory()) walk(path.join(d, entry.name));
      else if (entry.name.endsWith('.md') && !entry.name.endsWith('-1.md')) {
        const p = path.join(d, entry.name);
        if (hasCorruptedEmoji(p)) results.push(p);
      }
    }
  }
  walk(dir);
  return results;
}

const remainingCorrupted = findAllEmojiCorrupted(baseDir);
for (const filePath of remainingCorrupted) {
  let content = fs.readFileSync(filePath, 'utf8');
  // Replace corrupted emoji in section and tags — the -1 corrected copies
  // show the intended section is "核心句型"
  content = content.replace(/"� 宠物日常（猫咪可乐）"/g, '"核心句型"');
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`  🔧 原地修复emoji: ${path.basename(filePath)}`);
  fixedInPlace++;
}

// ── Summary ──
console.log(`\n=== 完成 ===`);
console.log(`删除: ${deletedCount} | 重命名: ${renamedCount} | 原地修复: ${fixedInPlace} | 跳过: ${skippedCount}`);
