const fs = require('fs');
const path = require('path');

const baseDir = path.resolve(__dirname, '..', 'B2口语素材');

// Step 1: Scan all files, parse stem (before -XXXXXXXX) and detect collisions
const files = [];
function scan(d) {
  for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
    if (entry.isDirectory()) scan(path.join(d, entry.name));
    else if (entry.name.endsWith('.md') && !entry.name.includes('章节索引') && !entry.name.includes('总索引')) {
      const basename = entry.name;
      // Match: "stem-XXXXXXXX.md" where X is 8 hex chars
      const m = basename.match(/^(.+)-[0-9a-fA-F]{8}\.md$/);
      if (m) {
        const stem = m[1]; // e.g. "考前冲刺（2周倒计时）"
        const cleanName = stem + '.md';
        files.push({
          dir: d,
          oldName: basename,
          newName: cleanName,
          stem: stem
        });
      }
    }
  }
}
scan(baseDir);
console.log(`总文件: ${files.length}`);

// Step 2: Detect collisions (same cleanName in same directory)
const byClean = {};
for (const f of files) {
  const key = f.dir + '::' + f.newName;
  if (!byClean[key]) byClean[key] = [];
  byClean[key].push(f);
}

const collisions = Object.entries(byClean).filter(([k, v]) => v.length > 1);
if (collisions.length > 0) {
  console.log(`\n⚠ 发现 ${collisions.length} 个重名冲突:`);
  for (const [key, items] of collisions) {
    console.log(`  ${key}:`);
    for (const f of items) {
      console.log(`    - ${f.oldName}`);
    }
  }
  console.log('\n冲突文件保留 hash，其余重命名。');
} else {
  console.log('✅ 无重名冲突');
}

// Step 3: Rename (skip collisions)
let renamed = 0;
let skipped = 0;
const collisionSet = new Set();
for (const [key, items] of collisions) {
  for (const f of items) collisionSet.add(f.oldName);
}

for (const f of files) {
  if (collisionSet.has(f.oldName)) {
    skipped++;
    continue;
  }
  const oldPath = path.join(f.dir, f.oldName);
  const newPath = path.join(f.dir, f.newName);
  if (oldPath === newPath) continue;
  if (fs.existsSync(newPath)) {
    console.log(`  ⚠ 目标已存在，跳过: ${f.newName}`);
    skipped++;
    continue;
  }
  fs.renameSync(oldPath, newPath);
  renamed++;
}

console.log(`\n重命名: ${renamed} | 跳过: ${skipped}`);
