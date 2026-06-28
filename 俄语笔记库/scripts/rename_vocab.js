const fs = require('fs');
const path = require('path');

const dir = path.resolve(__dirname, '..', '词汇');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));

let renamed = 0;
for (const oldName of files) {
  // Extract word from oldName: "агент-8bb40b96.md" → "агент"
  const word = oldName.replace(/-\w{8}\.md$/, '');
  const newName = `${word}.md`;
  const oldPath = path.join(dir, oldName);
  const newPath = path.join(dir, newName);
  if (oldName !== newName) {
    if (fs.existsSync(newPath)) {
      console.log(`  SKIP (target exists): ${oldName} → ${newName}`);
    } else {
      fs.renameSync(oldPath, newPath);
      console.log(`  ${oldName} → ${newName}`);
      renamed++;
    }
  }
}
console.log(`\nRenamed: ${renamed} / ${files.length}`);
