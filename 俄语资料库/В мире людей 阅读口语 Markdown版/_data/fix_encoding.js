// Fix mojibake card files by regenerating from correct sources
const fs = require('fs');
const path = require('path');

const PROJECT = 'D:/MyStudySpace/俄语资料库/В мире людей 阅读口语 Markdown版';
const BATCH = path.join(PROJECT, '卡片草稿/manifest_batch_2026-06-20');
const MANIFEST_JSON = path.join(PROJECT, '卡片草稿/card_generation_manifest_2026-06-20.json');

// The 29 cards we need to fix (from the batch report)
const CARDS = {
  article: [
    { file: 'vml-1-1-1-article-murom.md', manifest_id: 'vml-1-1-1', title_ru: 'Текст 1.1.1 — Достопримечательности Мурома', title_zh: '穆罗姆的名胜古迹', pages: '2-6' },
    { file: 'vml-1-1-2-article-stolby.md', manifest_id: 'vml-1-1-2', title_ru: 'Текст 1.1.2 — Красноярские Столбы — заповедник скалолазов', title_zh: '克拉斯诺亚尔斯克石柱——攀岩者自然保护区', pages: '7-12' },
    { file: 'vml-1-4-1-article-baikonur.md', manifest_id: 'vml-1-4-1', title_ru: 'Текст 1.4.1 — Отец Байконура', title_zh: '拜科努尔之父', pages: '27-30' },
    { file: 'vml-1-4-2-article-head-transplant.md', manifest_id: 'vml-1-4-2', title_ru: 'Текст 1.4.2 — Первый в мире биопротез', title_zh: '世界首个生物假体', pages: '31-32' },
    { file: 'vml-2-1-1-article-new-capital.md', manifest_id: 'vml-2-1-1', title_ru: 'Текст 2.1.1 — Новая российская столица как национальный проект', title_zh: '新俄罗斯首都作为国家项目', pages: '56' },
    { file: 'vml-3-beginning-article-literary-reading.md', manifest_id: 'vml-3-beginning', title_ru: 'Раздел 3 — Литературные отрывки (начало)', title_zh: '第三部分——文学选段（前半）', pages: '99-118' },
    { file: 'vml-3-ending-article-literary-reading.md', manifest_id: 'vml-3-ending', title_ru: 'Раздел 3 — Литературные отрывки (завершение)', title_zh: '第三部分——文学选段（后半）', pages: '119-138' },
  ],
  theme: [
    { file: 'vml-1-1-1-theme-city-memory.md', manifest_id: 'vml-1-1-1' },
    { file: 'vml-1-1-2-theme-nature-identity.md', manifest_id: 'vml-1-1-2' },
    { file: 'vml-1-4-1-theme-team-engineering.md', manifest_id: 'vml-1-4-1' },
    { file: 'vml-1-4-2-theme-science-boundaries.md', manifest_id: 'vml-1-4-2' },
    { file: 'vml-2-1-1-theme-capital-as-argument.md', manifest_id: 'vml-2-1-1' },
    { file: 'vml-3-beginning-theme-dream-image.md', manifest_id: 'vml-3-beginning' },
    { file: 'vml-3-beginning-theme-east-west-bridge.md', manifest_id: 'vml-3-beginning' },
    { file: 'vml-3-ending-theme-freedom.md', manifest_id: 'vml-3-ending' },
  ],
  vocabulary: [
    { file: 'vml-1-1-2-vocab-zapovednik.md', manifest_id: 'vml-1-1-2' },
    { file: 'vml-1-4-1-vocab-raketostroenie.md', manifest_id: 'vml-1-4-1' },
    { file: 'vml-1-4-1-vocab-vzaimodeistvovat.md', manifest_id: 'vml-1-4-1' },
    { file: 'vml-1-4-2-vocab-belletristika.md', manifest_id: 'vml-1-4-2' },
    { file: 'vml-2-1-1-vocab-klaster.md', manifest_id: 'vml-2-1-1' },
    { file: 'vml-2-1-1-vocab-nagruzka.md', manifest_id: 'vml-2-1-1' },
    { file: 'vml-3-beginning-vocab-most.md', manifest_id: 'vml-3-beginning' },
    { file: 'vml-3-beginning-vocab-provintsial.md', manifest_id: 'vml-3-beginning' },
    { file: 'vml-3-ending-vocab-neobkhodimost.md', manifest_id: 'vml-3-ending' },
    { file: 'vml-3-ending-vocab-svyazi.md', manifest_id: 'vml-3-ending' },
  ],
  task: [
    { file: 'vml-2-1-1-task-evidence-first-answer.md', manifest_id: 'vml-2-1-1' },
    { file: 'vml-3-beginning-task-literary-speaking.md', manifest_id: 'vml-3-beginning' },
    { file: 'vml-3-ending-task-abstract-noun-discussion.md', manifest_id: 'vml-3-ending' },
    { file: 'vml-3-ending-task-heritage-reading.md', manifest_id: 'vml-3-ending' },
  ],
};

function fixEncoding(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  if (!raw.includes('source_project: "袙')) return null; // already fixed?skip
  try {
    const buf = Buffer.from(raw, 'utf8');
    const fixed = buf.toString('latin1');
    if (fixed.includes('章节/') || fixed.includes('В мире')) {
      fs.writeFileSync(filePath, '﻿' + fixed, 'utf8');
      return true;
    }
  } catch(e) {}
  return false;
}

let fixed = 0;
let skipped = 0;
for (const type of Object.keys(CARDS)) {
  for (const card of CARDS[type]) {
    const fp = path.join(BATCH, type, card.file);
    if (!fs.existsSync(fp)) { console.log('MISSING: ' + fp); skipped++; continue; }
    const result = fixEncoding(fp);
    if (result === true) { fixed++; console.log('FIXED: ' + fp); }
    else if (result === null) { skipped++; console.log('SKIP (clean): ' + fp); }
    else { console.log('FAIL: ' + fp); skipped++; }
  }
}
console.log(`\nFixed: ${fixed}, Skipped: ${skipped}`);
