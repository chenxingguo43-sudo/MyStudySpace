const fs = require('fs');
const path = require('path');

const BATCH = 'D:/MyStudySpace/俄语资料库/В мире людей 阅读口语 Markdown版/卡片草稿/manifest_batch_2026-06-20';

const GROUPS = {
  'vml-1-1-1': [
    'vml-1-1-1-article-murom',
    'vml-1-1-1-theme-city-memory',
  ],
  'vml-1-1-2': [
    'vml-1-1-2-article-stolby',
    'vml-1-1-2-theme-nature-identity',
    'vml-1-1-2-vocab-zapovednik',
  ],
  'vml-1-4-1': [
    'vml-1-4-1-article-baikonur',
    'vml-1-4-1-theme-team-engineering',
    'vml-1-4-1-vocab-raketostroenie',
    'vml-1-4-1-vocab-vzaimodeistvovat',
  ],
  'vml-1-4-2': [
    'vml-1-4-2-article-head-transplant',
    'vml-1-4-2-theme-science-boundaries',
    'vml-1-4-2-vocab-belletristika',
  ],
};

const nameToFolder = {};
for (const dir of ['article', 'theme', 'vocabulary', 'task']) {
  const dirPath = path.join(BATCH, dir);
  if (!fs.existsSync(dirPath)) continue;
  for (const f of fs.readdirSync(dirPath)) {
    if (f.endsWith('.md')) nameToFolder[path.basename(f, '.md')] = dir;
  }
}

const indexNote = 'Tier2 卡片索引';
let updated = 0;

for (const [groupId, cards] of Object.entries(GROUPS)) {
  for (const cardName of cards) {
    const folder = nameToFolder[cardName];
    if (!folder) { console.log('MISSING: ' + cardName); continue; }
    const filePath = path.join(BATCH, folder, cardName + '.md');
    let content = fs.readFileSync(filePath, 'utf8');
    if (content.includes('## Related Cards')) { console.log('SKIP: ' + cardName); continue; }
    const siblings = cards.filter(n => n !== cardName);
    const linkSection = '\n## Related Cards\n\n' +
      siblings.map(n => '  - [[ ' + n + ']]').join('\n') +
      '\n  - [[ ' + indexNote + '|📋 Tier2 索引]]\n' +
      '\n## Source\n' +
      '\n- [[card_generation_manifest_2026-06-20|卡片生成 Manifest]]\n';
    if (content.includes('\n## Source\n')) {
      content = content.replace(/\n## Source\n/, linkSection);
    } else if (content.includes('\n## Source')) {
      content = content.replace(/\n## Source/, linkSection);
    } else {
      content = content.trimEnd() + '\n' + linkSection;
    }
    fs.writeFileSync(filePath, content, 'utf8');
    updated++;
    console.log('LINKED: ' + cardName);
  }
}

// Also add cross-links between Tier1 and Tier2 indices
const t1idx = path.join(BATCH, 'Tier1 卡片索引.md');
const t2idx = path.join(BATCH, 'Tier2 卡片索引.md');

if (fs.existsSync(t1idx)) {
  let c = fs.readFileSync(t1idx, 'utf8');
  if (!c.includes('Tier2 卡片索引')) {
    c = c.replace('## 相关链接', '## 相关链接\n\n- [[Tier2 卡片索引|📋 Tier 2 卡片索引（待复核）]]');
    fs.writeFileSync(t1idx, c, 'utf8');
    console.log('CROSS-LINKED: Tier1 → Tier2');
  }
}
if (fs.existsSync(t2idx)) {
  let c = fs.readFileSync(t2idx, 'utf8');
  if (!c.includes('互链')) {
    c = c.replace('## 相关链接', '## 相关链接\n\n互链：[[Tier1 卡片索引|→ Tier 1]] · [[Tier2 卡片索引|Tier 2（本页）]]');
    fs.writeFileSync(t2idx, c, 'utf8');
    console.log('CROSS-LINKED: Tier2 → Tier1');
  }
}

console.log('\nTotal cards linked: ' + updated);
