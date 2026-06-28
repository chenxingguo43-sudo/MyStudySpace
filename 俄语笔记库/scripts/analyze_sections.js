const fs = require('fs');
const path = require('path');

const baseDir = path.resolve(__dirname, '..', 'B2口语素材');
const results = { noExtra: [], withExtra: [], vocabLike: [], sentenceLike: [] };

function walk(d) {
  for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
    if (entry.isDirectory()) walk(path.join(d, entry.name));
    else if (entry.name.endsWith('.md') && !entry.name.includes('章节索引')) {
      const raw = fs.readFileSync(path.join(d, entry.name), 'utf8');
      const fmMatch = raw.match(/^---\n([\s\S]*?)\n---/);
      if (!fmMatch) continue;
      const fm = fmMatch[1];
      if (/^section:/m.test(fm)) continue; // has section, skip

      const ruMatch = fm.match(/^ru: "(.+)"$/m);
      const zhMatch = fm.match(/^zh: "(.+)"$/m);
      const extraMatch = fm.match(/^extra: "(.+)"$/m);
      const chapterMatch = fm.match(/^chapter: "(.+)"$/m);
      const ru = ruMatch ? ruMatch[1] : '';
      const zh = zhMatch ? zhMatch[1] : '';
      const extra = extraMatch ? extraMatch[1] : '';
      const chapter = chapterMatch ? chapterMatch[1] : path.basename(d);

      const wordCount = ru.split(/\s+/).length;

      const info = {
        chapter: chapter.replace(/^[一二三四五六七八九十]+_/, ''),
        ru: ru.slice(0, 80),
        zh: zh.slice(0, 40),
        extra: extra ? extra.slice(0, 60) : '',
        wordCount,
        file: entry.name
      };

      if (extra) results.withExtra.push(info);
      else results.noExtra.push(info);

      if (wordCount <= 3) results.vocabLike.push(info);
      else results.sentenceLike.push(info);
    }
  }
}
walk(baseDir);

console.log(`=== 无 section 笔记分析 ===`);
console.log(`总数: ${results.noExtra.length + results.withExtra.length}`);
console.log(`有 extra 字段: ${results.withExtra.length} (可能是词汇)`)
console.log(`无 extra 字段: ${results.noExtra.length} (可能是句型/对话)`);
console.log(`单词数 ≤3: ${results.vocabLike.length} (可能是词汇)`);
console.log(`单词数 >3: ${results.sentenceLike.length} (可能是句型/对话)`);

// Show samples from each category
console.log(`\n=== 词汇型（≤3词）样本 ===`);
for (const s of results.vocabLike.slice(0, 10)) {
  console.log(`  [${s.chapter}] ru="${s.ru}" zh="${s.zh}" extra="${s.extra}"`);
}

console.log(`\n=== 句型型（>3词）样本 ===`);
for (const s of results.sentenceLike.slice(0, 10)) {
  console.log(`  [${s.chapter}] ru="${s.ru}" zh="${s.zh}" extra="${s.extra}"`);
}

// Breakdown by chapter
console.log(`\n=== 缺失数按章节 ===`);
const byChapter = {};
for (const s of [...results.vocabLike, ...results.sentenceLike]) {
  const ch = s.chapter;
  if (!byChapter[ch]) byChapter[ch] = { total: 0, vocab: 0, sentence: 0 };
  byChapter[ch].total++;
  if (s.wordCount <= 3) byChapter[ch].vocab++;
  else byChapter[ch].sentence++;
}
for (const [ch, stats] of Object.entries(byChapter).sort((a,b) => b[1].total - a[1].total)) {
  console.log(`  ${ch}: ${stats.total} (词汇:${stats.vocab} 句型:${stats.sentence})`);
}
