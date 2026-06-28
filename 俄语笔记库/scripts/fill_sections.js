const fs = require('fs');
const path = require('path');

const baseDir = path.resolve(__dirname, '..', 'B2口语素材');

function classifyNote(ru, zh, extra) {
  const wordCount = ru.trim().split(/\s+/).length;

  // 表达技巧: meta-language about speaking/expressing
  if (zh.includes('技巧') || zh.includes('说法') || zh.includes('表达方式')) {
    return '表达技巧';
  }

  // 词汇小灶: single vocabulary items
  if (wordCount <= 1) return '词汇小灶';
  if (wordCount === 2 && extra) return '词汇小灶';

  // 核心句型: short functional utterances
  if (wordCount <= 6) return '核心句型';

  // 场景对话: longer conversational sentences
  return '场景对话';
}

let updated = 0;
const byChapter = {};
const byCategory = {};

function walk(d) {
  for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
    if (entry.isDirectory()) walk(path.join(d, entry.name));
    else if (entry.name.endsWith('.md') && !entry.name.includes('章节索引')) {
      const filePath = path.join(d, entry.name);
      let raw = fs.readFileSync(filePath, 'utf8');

      const fmMatch = raw.match(/^---\n([\s\S]*?)\n---/);
      if (!fmMatch) continue;
      const fm = fmMatch[1];

      // Skip if already has section
      if (/^section:/m.test(fm)) continue;

      const ruMatch = fm.match(/^ru: "(.+)"$/m);
      const zhMatch = fm.match(/^zh: "(.+)"$/m);
      const extraMatch = fm.match(/^extra: "(.+)"$/m);
      const tagsMatch = fm.match(/^tags: \[(.+)\]$/m);
      if (!ruMatch || !zhMatch) continue;

      const ru = ruMatch[1];
      const zh = zhMatch[1];
      const extra = extraMatch ? extraMatch[1] : '';

      const section = classifyNote(ru, zh, extra);

      // Track stats
      const chMatch = fm.match(/^chapter: "(.+)"$/m);
      const chapter = chMatch ? chMatch[1] : '未知';
      if (!byChapter[chapter]) byChapter[chapter] = {};
      byChapter[chapter][section] = (byChapter[chapter][section] || 0) + 1;
      byCategory[section] = (byCategory[section] || 0) + 1;

      // Insert section line after ru/zh/extra lines
      let newFm = fm;
      // Add section after extra if exists, otherwise after zh
      if (extraMatch) {
        newFm = newFm.replace(
          /(^extra: ".+"$)/m,
          '$1\nsection: "' + section + '"'
        );
      } else {
        newFm = newFm.replace(
          /(^zh: ".+"$)/m,
          '$1\nsection: "' + section + '"'
        );
      }

      // Update tags: ensure tags[0] matches section
      if (tagsMatch) {
        const oldTags = tagsMatch[1];
        const tagParts = oldTags.split(',').map(t => t.trim().replace(/"/g, ''));
        // Replace first tag with new section name
        tagParts[0] = section;
        const newTags = '[' + tagParts.map(t => '"' + t + '"').join(', ') + ']';
        newFm = newFm.replace(/^tags: \[.+\]$/m, 'tags: ' + newTags);
      }

      raw = raw.replace(fm, newFm);
      fs.writeFileSync(filePath, raw, 'utf8');
      updated++;
    }
  }
}
walk(baseDir);

console.log(`=== 补全 section 完成 ===`);
console.log(`更新笔记: ${updated} 条\n`);
console.log('=== 按分类统计 ===');
for (const [cat, count] of Object.entries(byCategory).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${cat}: ${count}`);
}
console.log('\n=== 各章节补全数 ===');
for (const [ch, cats] of Object.entries(byChapter).sort((a, b) => {
  const sumA = Object.values(a[1]).reduce((x, y) => x + y, 0);
  const sumB = Object.values(b[1]).reduce((x, y) => x + y, 0);
  return sumB - sumA;
})) {
  const total = Object.values(cats).reduce((x, y) => x + y, 0);
  const detail = Object.entries(cats).map(([k, v]) => `${k}:${v}`).join(' ');
  console.log(`  ${ch}: ${total} (${detail})`);
}
