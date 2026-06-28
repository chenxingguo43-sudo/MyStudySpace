#!/usr/bin/env node
// quick-review.js — 终端快速背词（被动识别模式）
// 用法：node scripts/quick-review.js [数量] [--六级]

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const DATA_FILE = path.join(__dirname, '..', 'data', 'vocabulary.json');
const PROGRESS_FILE = path.join(__dirname, '..', '俄语笔记库', '词汇', 'quick-review-progress.json');

let words = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));

// Filter: vocab type only (exclude sentences, tips)
words = words.filter(w =>
  ['noun', 'verb', 'adj', 'adv', 'particle', '高频词'].includes(w.type || w.source)
);

// --六级 filter
if (process.argv.includes('--六级')) {
  words = words.filter(w => {
    const tags = w.tags || [];
    return tags.some(t => t === '六级');
  });
  console.log('🎯 六级词汇专项模式');
}

// Shuffle
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Load progress
let progress = {};
if (fs.existsSync(PROGRESS_FILE)) {
  progress = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8'));
}

// Filter out mastered words (known >= 3 times)
const mastered = new Set(
  Object.entries(progress)
    .filter(([_, v]) => (v.known || 0) >= 3)
    .map(([k]) => k)
);

let pool = words.filter(w => !mastered.has(w.word));
if (pool.length === 0) {
  pool = words; // all mastered? review all anyway
  console.log('🎉 全部已掌握！复习模式。');
}

shuffle(pool);

const count = Math.min(parseInt(process.argv[2]) || 20, pool.length);
const session = pool.slice(0, count);

// Stats
let known = 0, fuzzy = 0, unknown = 0;
let index = 0;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: true,
});

// Clear screen helpers
const CLEAR = '\x1B[2J\x1B[H';

function showCard() {
  if (index >= session.length) {
    showResults();
    return;
  }

  const card = session[index];
  const meaning = card.meaning || card.zh || '';
  const type = card.type || card.source || '';
  const typeLabel = { noun: '名', verb: '动', adj: '形', adv: '副', particle: '虚', '高频词': '高' }[type] || type;
  const p = progress[card.word] || { known: 0, fuzzy: 0, unknown: 0, seen: 0 };
  const tagStr = (card.tags || []).includes('六级') ? ' 🏷六级' : '';

  console.log(CLEAR);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`  📇 ${index + 1}/${session.length}   ✅${known}  🟡${fuzzy}  ❌${unknown}   已掌握${mastered.size}词`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log('');
  console.log(`       ${card.word}${tagStr}`);
  console.log(`       ${'─'.repeat(Math.max(20, card.word.length))}`);
  console.log(`       [${typeLabel}] 按 回车 查看释义...`);
  console.log('');

  // Wait for Enter
  process.stdin.once('data', (data) => {
    const ch = data.toString().trim().toLowerCase();

    if (ch === 'q') {
      saveAndExit();
      return;
    }

    // Show answer
    console.log(`       ✦ ${meaning}`);
    if (card.pair) console.log(`       体: ${card.pair}`);
    if (card.case_gov) console.log(`       接格: ${card.case_gov}`);
    if (card.examples && card.examples[0]) {
      console.log(`       例: ${card.examples[0].ru}`);
      console.log(`          ${card.examples[0].zh}`);
    }
    console.log('');
    console.log('   ← 不认识 | ↓ 模糊 | → 认识 | q 退出');
    console.log('');

    // Wait for rating
    process.stdin.once('data', (data2) => {
      const key = data2.toString().trim().toLowerCase();

      if (key === 'q') {
        saveAndExit();
        return;
      }

      // Arrow keys come as escape sequences
      const str = data2.toString();

      if (str === '[D' || key === 'a' || key === '1') {
        // Left arrow /不认识
        unknown++;
        if (!progress[card.word]) progress[card.word] = { known: 0, fuzzy: 0, unknown: 0, seen: 0 };
        progress[card.word].unknown++;
        progress[card.word].seen++;
        console.log('   ❌ 不认识 — 已记录');
      } else if (str === '[B' || key === 's' || key === '2') {
        // Down arrow /模糊
        fuzzy++;
        if (!progress[card.word]) progress[card.word] = { known: 0, fuzzy: 0, unknown: 0, seen: 0 };
        progress[card.word].fuzzy++;
        progress[card.word].seen++;
        console.log('   🟡 模糊 — 已记录');
      } else if (str === '[C' || key === 'd' || key === '3') {
        // Right arrow /认识
        known++;
        if (!progress[card.word]) progress[card.word] = { known: 0, fuzzy: 0, unknown: 0, seen: 0 };
        progress[card.word].known++;
        progress[card.word].seen++;
        console.log('   ✅ 认识 — 已记录');
      } else {
        // Default: treat as unknown
        unknown++;
        if (!progress[card.word]) progress[card.word] = { known: 0, fuzzy: 0, unknown: 0, seen: 0 };
        progress[card.word].unknown++;
        progress[card.word].seen++;
        console.log('   ❓ 未知按键，按不认识处理');
      }

      index++;
      // Save every 5 cards
      if (index % 5 === 0) saveProgress();
      setTimeout(showCard, 400);
    });
  });
}

function saveProgress() {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2), 'utf-8');
}

function saveAndExit() {
  saveProgress();
  showResults();
}

function showResults() {
  const total = known + fuzzy + unknown;
  const pct = total > 0 ? Math.round(known / total * 100) : 0;
  console.log(CLEAR);
  console.log('═══════════════════════════════════════════════════════');
  console.log('   📊 本轮结果');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`   ✅ 认识:  ${known}  (${total > 0 ? Math.round(known / total * 100) : 0}%)`);
  console.log(`   🟡 模糊:  ${fuzzy}  (${total > 0 ? Math.round(fuzzy / total * 100) : 0}%)`);
  console.log(`   ❌ 不认识: ${unknown}  (${total > 0 ? Math.round(unknown / total * 100) : 0}%)`);
  console.log(`   ─────────────────────`);
  console.log(`   总计: ${total}  已掌握: ${mastered.size + known}  剩余: ${words.length - mastered.size - known}`);
  console.log('');
  console.log('   下次运行继续从未掌握的单词开始。');
  console.log('   已保存进度到 quick-review-progress.json');
  console.log('═══════════════════════════════════════════════════════');
  process.exit(0);
}

console.log(CLEAR);
console.log('🃏 快速背词 — 被动识别模式');
console.log('');
console.log(`📦 词库: ${words.length} 词 | 已掌握: ${mastered.size} | 待学: ${words.length - mastered.size}`);
console.log(`📋 本轮: ${session.length} 词`);
console.log('');
console.log('操作: 回车=翻看释义 | ←=不认识 | ↓=模糊 | →=认识 | Q=退出');
console.log('');
console.log('按 回车 开始...');

process.stdin.once('data', () => {
  showCard();
});
