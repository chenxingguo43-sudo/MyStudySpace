// Build unified translation manifest — canonical mapping for Agent C
const fs = require('fs');
const path = require('path');

const PROJECT = 'D:/MyStudySpace/俄语资料库/В мире людей 阅读口语 Markdown版';

// Source chapters and their correct translation sources
const MAPPING = [
  // Part 1 — use repair versions
  { chapter: 'предисловие.md', translation: 'repair_2026-06-20/part1_front_and_section1/предисловие.zh.md', status: 'repaired_pass', risk: 'double-column OCR, proper names' },
  { chapter: '样章.md', translation: 'full_run_2026-06-20/part1_front_and_section1/样章.zh.md', status: 'PASS', risk: null },
  { chapter: 'раздел1-продолжение.md', translation: 'repair_2026-06-20/part1_front_and_section1/раздел1-продолжение.zh.md', status: 'repaired_pass', risk: 'aerospace terms, proper names' },
  // Part 2 — full_run is clean
  { chapter: 'раздел2-начало.md', translation: 'full_run_2026-06-20/part2_section2/раздел2-начало.zh.md', status: 'PASS', risk: null },
  { chapter: 'раздел2-завершение.md', translation: 'full_run_2026-06-20/part2_section2/раздел2-завершение.zh.md', status: 'PASS', risk: 'page 82-83 exercise fragments' },
  { chapter: 'раздел2-тест.md', translation: 'full_run_2026-06-20/part2_section2/раздел2-тест.zh.md', status: 'draft', risk: 'dense test material, Б/В labels' },
  // Part 3 — use repair versions (full_run has 16 MT failures)
  { chapter: 'раздел3-начало.md', translation: 'repair_2026-06-20/part3_section3/section3-beginning-zh-aligned.md', status: 'repaired_pass', risk: 'literary OCR, pages 99,117' },
  { chapter: 'раздел3-завершение.md', translation: 'repair_2026-06-20/part3_section3/section3-ending-zh-aligned.md', status: 'repaired_pass', risk: 'literary OCR, pages 125,130,134' },
  { chapter: 'раздел3-ключи-тест.md', translation: 'repair_2026-06-20/part3_section3/section3-keys-test-zh-aligned.md', status: 'repaired_pass', risk: 'test keys, unrecoverable matrix' },
  // Part 4 — preserved but not for cards
  { chapter: 'методический-комментарий.md', translation: 'full_run_2026-06-20/part4_commentary_appendix/методический-комментарий.zh-aligned.md', status: 'excluded', risk: 'methodology, not reading text' },
  { chapter: 'приложение-лексика.md', translation: 'full_run_2026-06-20/part4_commentary_appendix/приложение-лексика.zh-aligned.md', status: 'excluded', risk: 'AI appendix, not original text' },
];

// Mark old broken files
const BROKEN = [
  'full_run_2026-06-20/part3_section3/section3-beginning-zh-aligned.md',
  'full_run_2026-06-20/part3_section3/section3-ending-zh-aligned.md',
  'full_run_2026-06-20/part3_section3/section3-keys-test-zh-aligned.md',
  'full_run_2026-06-20/part1_front_and_section1/предисловие.zh.md',
  'full_run_2026-06-20/part1_front_and_section1/раздел1-продолжение.zh.md',
];

console.log('=== Marking broken files ===');
for (const rel of BROKEN) {
  const fp = path.join(PROJECT, '翻译版', rel);
  if (!fs.existsSync(fp)) { console.log('MISSING: ' + rel); continue; }
  let content = fs.readFileSync(fp, 'utf8');
  // Add deprecation warning at top after frontmatter
  if (content.includes('DEPRECATED')) {
    console.log('SKIP (already marked): ' + rel);
    continue;
  }
  // Insert after first --- closing
  const secondSep = content.indexOf('---', 4);
  if (secondSep === -1) { console.log('NO FRONTMATTER: ' + rel); continue; }
  const before = content.substring(0, secondSep + 3);
  const after = content.substring(secondSep + 3);
  const warning = '\n\n> [!danger] DEPRECATED\n> This file contains known translation failures (RuntimeError / MT failed / incomplete body).\n> Use the repaired version at `翻译版/repair_2026-06-20/` instead.\n> See `翻译版/translation_manifest_2026-06-20.json` for canonical sources.\n';
  content = before + warning + after;
  fs.writeFileSync(fp, content, 'utf8');
  console.log('DEPRECATED: ' + rel);
}

// Write manifest
const manifest = {
  generated_at: new Date().toISOString(),
  description: 'Unified translation manifest — canonical translation file for each chapter. Agent C must use this.',
  deprecated: BROKEN.map(f => '翻译版/' + f),
  deprecation_reason: 'known MT failures or incomplete body sections replaced by repair versions',
  chapters: MAPPING.map(m => ({
    chapter: m.chapter,
    translation_file: '翻译版/' + m.translation,
    status: m.status,
    risk: m.risk,
    usable_for_cards: m.status !== 'excluded',
  })),
};

const outPath = path.join(PROJECT, '翻译版/translation_manifest_2026-06-20.json');
fs.writeFileSync(outPath, JSON.stringify(manifest, null, 2), 'utf8');
console.log('\nManifest written: ' + outPath);
console.log('Chapters mapped: ' + manifest.chapters.length);
console.log('Usable for cards: ' + manifest.chapters.filter(c => c.usable_for_cards).length);
console.log('Deprecated files: ' + manifest.deprecated.length);
