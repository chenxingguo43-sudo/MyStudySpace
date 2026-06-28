const fs = require('fs');
const path = require('path');

const b2Dir = path.resolve(__dirname, '..', 'B2口语素材');

// Map: oldDirName → newDirName
// chapter frontmatter uses format "X、名称" (no underscore)
// directory uses format "X_X、名称"
const chineseNums = ['一','二','三','四','五','六','七','八','九','十','十一','十二','十三'];

const dirMap = {};  // oldDirName → newDirName
const chMap = {};   // oldChapterValue → newChapterValue

for (const num of chineseNums) {
  const oldDirPrefix = num + '_' + num + '、';
  const oldChPrefix = num + '、';

  // Find matching directory
  const entries = fs.readdirSync(b2Dir, { withFileTypes: true });
  for (const e of entries) {
    if (e.isDirectory() && e.name.startsWith(oldDirPrefix)) {
      const newName = e.name.replace(oldDirPrefix, '');
      dirMap[e.name] = newName;
      chMap[oldChPrefix + newName] = newName;
      break;
    }
  }
}

console.log('=== 目录重命名 ===');
for (const [oldName, newName] of Object.entries(dirMap)) {
  const oldPath = path.join(b2Dir, oldName);
  const newPath = path.join(b2Dir, newName);
  if (fs.existsSync(newPath)) {
    console.log(`  SKIP (exists): ${oldName} → ${newName}`);
  } else {
    fs.renameSync(oldPath, newPath);
    console.log(`  OK: ${oldName} → ${newName}`);
  }
}

// Build reverse map for chapter field updates
const oldToNew = {};
for (const [oldCh, newCh] of Object.entries(chMap)) {
  oldToNew[oldCh] = newCh;
}

// ── Update ALL markdown files in B2口语素材 ──
console.log('\n=== 更新 frontmatter chapter 字段 + wikilinks ===');
let noteUpdated = 0;
let linkUpdated = 0;

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
    } else if (entry.name.endsWith('.md')) {
      let raw = fs.readFileSync(fullPath, 'utf8');
      let changed = false;

      // Update chapter: "X、名称" → "名称"
      for (const [oldCh, newCh] of Object.entries(oldToNew)) {
        const pattern = 'chapter: "' + oldCh + '"';
        const replacement = 'chapter: "' + newCh + '"';
        if (raw.includes(pattern)) {
          raw = raw.replace(pattern, replacement);
          changed = true;
          noteUpdated++;
        }
      }

      // Update [[wikilinks]] that reference old directory names
      // Pattern: [[oldDirName/...]] or [[oldDirName|...]]
      for (const [oldDir, newDir] of Object.entries(dirMap)) {
        // Escape special chars for regex
        const escOld = oldDir.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const linkRegex = new RegExp('\\[\\[' + escOld + '\\/', 'g');
        const replacement = '[[' + newDir + '/';
        const matches = raw.match(linkRegex);
        if (matches) {
          raw = raw.replace(linkRegex, replacement);
          changed = true;
          linkUpdated += matches.length;
        }
      }

      if (changed) {
        fs.writeFileSync(fullPath, raw, 'utf8');
      }
    }
  }
}
walk(b2Dir);

console.log(`  chapter 字段更新: ${noteUpdated}`);
console.log(`  wikilink 引用更新: ${linkUpdated}`);

// Update health check script path references (if any)
console.log('\n=== 完成 ===');
