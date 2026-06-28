const fs = require('fs');
const path = require('path');

const PROJECT = 'D:/MyStudySpace/俄语资料库/В мире людей 阅读口语 Markdown版';
const BATCH = path.join(PROJECT, '卡片草稿/full_batch_2026-06-20');
const OLD_BATCH = path.join(PROJECT, '卡片草稿/manifest_batch_2026-06-20');

// Group: manifest_id -> { folder, basename }[]
const groups = {};
for (const dir of ['article', 'theme', 'vocabulary', 'task']) {
  const dirPath = path.join(BATCH, dir);
  if (!fs.existsSync(dirPath)) continue;
  for (const f of fs.readdirSync(dirPath)) {
    if (!f.endsWith('.md')) continue;
    const fp = path.join(dirPath, f);
    const content = fs.readFileSync(fp, 'utf8');
    const m = content.match(/manifest_id:\s*"([^"]+)"/);
    if (!m) continue;
    const mid = m[1];
    if (!groups[mid]) groups[mid] = [];
    groups[mid].push({ folder: dir, basename: path.basename(f, '.md'), path: fp });
  }
}

// Build chapter-friendly labels for each manifest_id
const CHAPTER_LABELS = {
  'full-00-sample': '样章 — Голос камня + Милости не просим',
  'full-01-preface-extra': '前言 — Люди истосковались по игрушкам',
  'full-02-section1-extra': '第1章 — Феминистка + Музей + Плата за кровь',
  'full-03-section2-beginning-extra': '第2章前半 — Отчёт + Промтуризм',
  'full-04-section2-ending': '第2章后半 — Деловые документы + Спорт + Космос + Марафон',
  'full-05-section2-test': '第2章测试 — Лексико-грамматический тест',
  'full-06-section3-beginning-extra': '第3章前半 — Алые паруса + Автобиография + Встреча',
  'full-07-section3-ending-extra': '第3章后半 — Попытка к бегству + Лавр',
  'full-08-section3-keys': '第3章测试 — Ключи + Тест',
};

// Read card title from file
function getCardTitle(fp) {
  const content = fs.readFileSync(fp, 'utf8');
  const m = content.match(/^# (.+)$/m);
  return m ? m[1].replace(/^Vocabulary —|^Theme —|^Task —|^# /, '').trim() : path.basename(fp, '.md');
}

function getCardType(fp) {
  const content = fs.readFileSync(fp, 'utf8');
  const t = content.match(/card_subtype:\s*"(\w+)"/);
  return t ? t[1] : 'card';
}

// Add wikilinks to each card
let linked = 0;
for (const [mid, cards] of Object.entries(groups)) {
  for (const card of cards) {
    let content = fs.readFileSync(card.path, 'utf8');
    if (content.includes('## Related Cards')) continue;

    const siblings = cards.filter(c => c.basename !== card.basename);

    let linkSection = '\n## Related Cards\n\n';
    for (const s of siblings) {
      linkSection += `- [[${s.basename}]]\n`;
    }
    linkSection += `\n- [[Full 卡片索引|📋 返回索引]]\n\n`;

    // Insert before ## Source or at end
    if (content.includes('\n## Source')) {
      content = content.replace(/\n## Source/, linkSection + '## Source');
    } else {
      content = content.trimEnd() + '\n' + linkSection;
    }

    fs.writeFileSync(card.path, content, 'utf8');
    linked++;
  }
}

console.log(`Cards linked: ${linked}`);

// Build master index
const indexLines = [];
indexLines.push('# Full 卡片索引 — 全批次 83 张');
indexLines.push('');
indexLines.push('> Agent C 全量生成 · 2026-06-20 · ');
indexLines.push('> 两批合并：manifest_batch (29) + full_batch (54) = 83 张');
indexLines.push('');
indexLines.push('---');
indexLines.push('');

for (const [mid, cards] of Object.entries(groups)) {
  const label = CHAPTER_LABELS[mid] || mid;
  indexLines.push(`## ${mid} · ${label}`);
  indexLines.push('');
  const types = {};
  for (const c of cards) types[c.folder] = (types[c.folder] || 0) + 1;
  const typeStr = Object.entries(types).map(([t,n]) => `${n} ${t}`).join(' · ');
  indexLines.push(`> ${typeStr} · ${cards.length} cards`);
  indexLines.push('');
  indexLines.push('| 类型 | 卡片 |');
  indexLines.push('|---|---|');
  for (const c of cards) {
    const type = c.folder;
    const emoji = { article: '📖', theme: '💡', vocabulary: '📝', task: '✅' }[type] || '📄';
    const title = getCardTitle(c.path);
    indexLines.push(`| ${emoji} ${type} | [[${c.basename}\\|${title}]] |`);
  }
  indexLines.push('');
  indexLines.push('---');
  indexLines.push('');
}

// Cross-links
indexLines.push('## 旧批次链接');
indexLines.push('');
indexLines.push('- [[Tier1 卡片索引|Tier 1 (17张)]]');
indexLines.push('- [[Tier2 卡片索引|Tier 2 (12张，已复核)]]');
indexLines.push('');
indexLines.push('## 相关文档');
indexLines.push('');
indexLines.push('- [[card_generation_manifest_full_2026-06-20|全量生成 Manifest]]');
indexLines.push('- [[translation_manifest_2026-06-20|翻译清单]]');
indexLines.push('- [[batch_report|本批次统计报告]]');

const indexPath = path.join(BATCH, 'Full 卡片索引.md');
fs.writeFileSync(indexPath, indexLines.join('\n'), 'utf8');
console.log('Index created: ' + indexPath);

// Cross-link old batch indices
const t1 = path.join(OLD_BATCH, 'Tier1 卡片索引.md');
if (fs.existsSync(t1)) {
  let c = fs.readFileSync(t1, 'utf8');
  if (!c.includes('Full 卡片索引')) {
    c = c.replace('## 相关链接', '## 相关链接\n\n- [[Full 卡片索引|📋 全批次索引 (83张)]]');
    fs.writeFileSync(t1, c, 'utf8');
    console.log('Cross-linked: Tier1 → Full Index');
  }
}
const t2 = path.join(OLD_BATCH, 'Tier2 卡片索引.md');
if (fs.existsSync(t2)) {
  let c = fs.readFileSync(t2, 'utf8');
  if (!c.includes('Full 卡片索引')) {
    c = c.replace('## 相关链接', '## 相关链接\n\n- [[Full 卡片索引|📋 全批次索引 (83张)]]');
    fs.writeFileSync(t2, c, 'utf8');
    console.log('Cross-linked: Tier2 → Full Index');
  }
}

console.log('Done.');
