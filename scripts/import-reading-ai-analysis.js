/* Import a reviewed Markdown reading analysis into one Reader chapter JSON. */
const fs = require('fs');
const path = require('path');

function splitQuestionBlocks(markdown) {
  const markers = [...markdown.matchAll(/^## 第 (\d+) 题\s*$/gm)];
  return markers.map((marker, index) => ({
    num: Number(marker[1]),
    body: markdown.slice(marker.index + marker[0].length, markers[index + 1] ? markers[index + 1].index : markdown.length)
  }));
}

function section(body, headingPrefix) {
  const lines = body.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim().startsWith(`### ${headingPrefix}`));
  if (start < 0) return '';
  const selected = [];
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (/^###\s+/.test(line) || /^---\s*$/.test(line)) break;
    selected.push(line);
  }
  return selected.join('\n').trim();
}

function parseEvidence(body, questionNum) {
  const raw = section(body, '原文证据');
  return raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line, index) => {
    const match = line.match(/^第\s*(\d+)\s*段：(.+)$/);
    if (!match) throw new Error(`Question ${questionNum}: invalid evidence line: ${line}`);
    let quoteRu = match[2].trim();
    let quoteZh = '';
    const zhStart = quoteRu.lastIndexOf('（');
    if (zhStart >= 0 && quoteRu.endsWith('）')) {
      quoteZh = quoteRu.slice(zhStart + 1, -1).trim();
      quoteRu = quoteRu.slice(0, zhStart).trim();
    }
    return {
      id: `q${questionNum}-evidence-${index + 1}`,
      paragraphIndex: Number(match[1]) - 1,
      quoteRu,
      quoteZh,
      role: '支持正确答案'
    };
  });
}

function parseOptionReasons(body) {
  return section(body, '其他选项为什么错').split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => {
    const match = line.match(/^-\s*([а-яА-Яa-zA-Z])：(.+)$/);
    if (!match) return null;
    return { key: match[1].toLowerCase(), reason: match[2].trim() };
  }).filter(Boolean);
}

function parseRunId(markdown) {
  const match = markdown.match(/run_id:\s*([\w-]+)/i);
  return match ? match[1] : '';
}

function validateEvidenceItems(chapter, questionNum, evidenceItems) {
  for (const item of evidenceItems) {
    const paragraph = chapter.original && chapter.original[item.paragraphIndex];
    if (typeof paragraph !== 'string') {
      throw new Error(`Question ${questionNum}: paragraph ${item.paragraphIndex + 1} does not exist`);
    }
    if (!paragraph.includes(item.quoteRu)) {
      throw new Error(`Question ${questionNum}: evidence quote not found in paragraph ${item.paragraphIndex + 1}`);
    }
  }
}

function importAnalysis(markdown, chapter) {
  const blocks = splitQuestionBlocks(markdown);
  const runId = parseRunId(markdown);
  if (blocks.length !== chapter.exercises.length) {
    throw new Error(`Question count mismatch: Markdown ${blocks.length}, chapter ${chapter.exercises.length}`);
  }
  for (const block of blocks) {
    const exercise = chapter.exercises.find((item) => Number(item.num) === block.num);
    if (!exercise) throw new Error(`Question ${block.num} not found in chapter`);
    const correctReason = section(block.body, `为什么正确答案是 ${exercise.answer}`);
    const evidenceItems = parseEvidence(block.body, block.num);
    validateEvidenceItems(chapter, block.num, evidenceItems);
    const wrongReasons = parseOptionReasons(block.body);
    const pitfall = section(block.body, '易错提醒');
    const review = section(block.body, '一句话复盘');
    if (!correctReason || !evidenceItems.length || wrongReasons.length !== exercise.options.length - 1 || !pitfall || !review) {
      throw new Error(`Question ${block.num}: incomplete analysis structure`);
    }
    const optionReasons = new Map(wrongReasons.map((item) => [item.key, item.reason]));
    exercise.answerAnalysis = {
      version: 'reading-evidence-v2',
      provenance: {
        kind: 'ai-generated',
        provider: 'Gemini Flash',
        runId,
        reviewStatus: 'accepted-by-user'
      },
      conclusion: `正确答案是 ${exercise.answer}。${correctReason}`,
      correctReason,
      evidence: {
        ru: evidenceItems.map((item) => item.quoteRu).join('\n'),
        zh: evidenceItems.map((item) => item.quoteZh).filter(Boolean).join('\n')
      },
      evidenceItems,
      mappings: [],
      options: exercise.options.map((option) => {
        const keyMatch = option.match(/^\s*([а-яА-Яa-zA-Z])\)/);
        const key = keyMatch ? keyMatch[1].toLowerCase() : '';
        return {
          key,
          status: key === exercise.answer ? 'correct' : 'wrong',
          terms: [],
          reason: key === exercise.answer ? correctReason : (optionReasons.get(key) || '')
        };
      }),
      pitfall,
      nextCheck: '',
      review
    };
    exercise.evidenceAnchors = evidenceItems.map((item) => ({
      id: item.id,
      paragraphIndex: item.paragraphIndex,
      quote: item.quoteRu,
      role: item.role
    }));
  }
  return chapter;
}

function main() {
  const sourcePath = process.argv[2];
  const chapterPath = process.argv[3];
  if (!sourcePath || !chapterPath) {
    throw new Error('Usage: node scripts/import-reading-ai-analysis.js <analysis.md> <chapter.json>');
  }
  const markdown = fs.readFileSync(path.resolve(sourcePath), 'utf8');
  const absoluteChapterPath = path.resolve(chapterPath);
  const chapter = JSON.parse(fs.readFileSync(absoluteChapterPath, 'utf8'));
  importAnalysis(markdown, chapter);
  fs.writeFileSync(absoluteChapterPath, `${JSON.stringify(chapter, null, 2)}\n`, 'utf8');
  console.log(`Imported ${chapter.exercises.length} reading analyses into ${absoluteChapterPath}`);
}

if (require.main === module) main();

module.exports = { importAnalysis, parseEvidence, splitQuestionBlocks, validateEvidenceItems };
