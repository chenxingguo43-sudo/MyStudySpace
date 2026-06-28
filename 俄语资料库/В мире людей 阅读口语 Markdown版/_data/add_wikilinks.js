// Add wikilinks between Tier 1 cards in the same manifest group
const fs = require('fs');
const path = require('path');

const BATCH = 'D:/MyStudySpace/俄语资料库/В мире людей 阅读口语 Markdown版/卡片草稿/manifest_batch_2026-06-20';

// Tier 1 manifest groups with their card filenames (no .md)
const GROUPS = {
  'vml-2-1-1': [
    'vml-2-1-1-article-new-capital',
    'vml-2-1-1-theme-capital-as-argument',
    'vml-2-1-1-vocab-nagruzka',
    'vml-2-1-1-vocab-klaster',
    'vml-2-1-1-task-evidence-first-answer',
  ],
  'vml-3-beginning': [
    'vml-3-beginning-article-literary-reading',
    'vml-3-beginning-theme-dream-image',
    'vml-3-beginning-theme-east-west-bridge',
    'vml-3-beginning-vocab-most',
    'vml-3-beginning-vocab-provintsial',
    'vml-3-beginning-task-literary-speaking',
  ],
  'vml-3-ending': [
    'vml-3-ending-article-literary-reading',
    'vml-3-ending-theme-freedom',
    'vml-3-ending-vocab-neobkhodimost',
    'vml-3-ending-vocab-svyazi',
    'vml-3-ending-task-abstract-noun-discussion',
    'vml-3-ending-task-heritage-reading',
  ],
};

// Map: basename → subfolder
const nameToFolder = {};
for (const dir of ['article', 'theme', 'vocabulary', 'task']) {
  const dirPath = path.join(BATCH, dir);
  if (!fs.existsSync(dirPath)) continue;
  for (const f of fs.readdirSync(dirPath)) {
    if (f.endsWith('.md')) {
      nameToFolder[path.basename(f, '.md')] = dir;
    }
  }
}

const indexNote = 'Tier1 卡片索引';

let updated = 0;

for (const [groupId, cards] of Object.entries(GROUPS)) {
  for (const cardName of cards) {
    const folder = nameToFolder[cardName];
    if (!folder) { console.log('MISSING: ' + cardName); continue; }

    const filePath = path.join(BATCH, folder, cardName + '.md');
    let content = fs.readFileSync(filePath, 'utf8');

    // Check if wikilinks section already exists
    if (content.includes('## Related Cards')) {
      console.log('SKIP (has links): ' + cardName);
      continue;
    }

    // Build wikilinks to sibling cards (not self) within the group
    const siblings = cards.filter(n => n !== cardName);

    // Also add link to index
    const linkSection = '\n## Related Cards\n\n' +
      siblings.map(n => `- [[${n}]]`).join('\n') +
      `\n- [[${indexNote}|📋 返回索引]]\n\n## Source\n` +
      '\n- [[card_generation_manifest_2026-06-20|卡片生成 Manifest]]\n';

    // Insert before existing "## Source" section
    if (content.includes('\n## Source\n')) {
      content = content.replace(/\n## Source\n/, linkSection);
      fs.writeFileSync(filePath, content, 'utf8');
      updated++;
      console.log('LINKED: ' + cardName + ' → ' + siblings.length + ' siblings');
    } else if (content.includes('\n## Source')) {
      content = content.replace(/\n## Source/, linkSection);
      fs.writeFileSync(filePath, content, 'utf8');
      updated++;
      console.log('LINKED: ' + cardName + ' → ' + siblings.length + ' siblings');
    } else {
      // Append at end
      content = content.trimEnd() + '\n' + linkSection;
      fs.writeFileSync(filePath, content, 'utf8');
      updated++;
      console.log('LINKED (append): ' + cardName);
    }
  }
}

console.log('\nTotal cards linked: ' + updated);
