/* Audit Reader reading questions against the full-book MinerU Markdown. */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const sourcePath = process.argv[2]
  ? path.resolve(process.argv[2])
  : String.raw`D:\下载\MinerU\文件转换\В мире людей 阅读口语.pdf-4d908977-e819-4950-8fce-f552d6171ca4\MinerU_markdown_202608191105372_6e8347d7.md`;
const dataRoot = path.join(root, 'data', 'textbook', 'reading_speaking');
const reportRoot = path.join(root, 'docs', 'reader-ai-reading', 'answer-audit');

function normalize(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/!\[\]\([^)]*\)/g, ' ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokens(value) {
  return new Set(normalize(value).split(' ').filter((item) => item.length > 1));
}

function tokenSimilarity(left, right) {
  const a = tokens(left);
  const b = tokens(right);
  if (!a.size || !b.size) return 0;
  let intersection = 0;
  for (const item of a) if (b.has(item)) intersection += 1;
  return intersection / new Set([...a, ...b]).size;
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function chapterNumberFromTitle(title) {
  const match = String(title || '').match(/(\d+\.\d+\.\d+)/);
  return match ? match[1] : '';
}

function loadReaderChapters() {
  return fs.readdirSync(dataRoot)
    .filter((name) => /^ch\d+\.json$/.test(name))
    .sort()
    .map((name) => ({ file: name, data: JSON.parse(fs.readFileSync(path.join(dataRoot, name), 'utf8')) }));
}

function extractBodySections(markdown) {
  const starts = [];
  const headingPattern = /^#{1,3}\s+TEKCT\s+(\d+\.\d+\.\d+)\b[^\r\n]*$/gim;
  for (const match of markdown.matchAll(headingPattern)) {
    starts.push({ chapter: match[1], index: match.index, heading: match[0] });
  }
  const sections = new Map();
  for (let index = 0; index < starts.length; index += 1) {
    const start = starts[index];
    const end = starts[index + 1] ? starts[index + 1].index : markdown.length;
    sections.set(start.chapter, markdown.slice(start.index, end));
  }
  return sections;
}

function splitInlineOptions(text) {
  const matches = [...text.matchAll(/(?:^|\s)([а-яА-Яa-zA-Z])\)\s+/g)];
  if (!matches.length) return { question: text.trim(), options: [] };
  const question = text.slice(0, matches[0].index).trim();
  const options = matches.map((match, index) => {
    const start = match.index + match[0].length - match[0].trimStart().length;
    const end = matches[index + 1] ? matches[index + 1].index : text.length;
    return { key: match[1], text: text.slice(start + 2, end).trim() };
  });
  return { question, options };
}

function parseSourceQuestions(section) {
  const lines = section.split(/\r?\n/);
  let start = -1;
  for (let index = 0; index < lines.length; index += 1) {
    if (/^\s*1\.\s+/.test(lines[index])) {
      start = index;
      break;
    }
  }
  if (start < 0) return [];
  const questions = [];
  let current = null;
  const finish = () => {
    if (current && current.question.trim()) questions.push(current);
    current = null;
  };
  for (let index = start; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (/^#{1,3}\s+(?:Активизация|Задание|Текст\s+\d+\.\d+\.\d+|TEKCT\s+\d+\.\d+\.\d+)/i.test(line)) {
      finish();
      break;
    }
    if (!line) continue;
    const questionMatch = line.match(/^(\d+)\.\s+(.+)$/);
    if (questionMatch) {
      finish();
      const split = splitInlineOptions(questionMatch[2]);
      current = { num: Number(questionMatch[1]), question: split.question, options: split.options.map((item) => item.text) };
      continue;
    }
    const optionMatch = line.match(/^([а-яА-Яa-zA-Z])\)\s+(.+)$/);
    if (optionMatch && current) {
      current.options.push(optionMatch[2].trim());
      continue;
    }
    if (current) {
      if (current.options.length && current.options.length < 3) current.options[current.options.length - 1] += ` ${line}`;
      else current.question += ` ${line}`;
    }
  }
  finish();
  return questions;
}

function extractAnswerKey(markdown, chapter) {
  const headingPattern = new RegExp(`^##\\s+Текст\\s+${escapeRegex(chapter)}\\s*$`, 'gim');
  const matches = [...markdown.matchAll(headingPattern)];
  if (!matches.length) return { rawLine: '', answers: [], status: 'missing-heading' };
  const start = matches[matches.length - 1].index;
  const next = markdown.slice(start + matches[matches.length - 1][0].length).search(/^##\s+Текст\s+\d+\.\d+\.\d+\s*$/im);
  const block = markdown.slice(start, next >= 0 ? start + matches[matches.length - 1][0].length + next : markdown.length);
  const rawLine = block.split(/\r?\n/).find((line) => /^\s*(?:TECT|ТЕСТ)\b/i.test(line)) || '';
  const answers = [];
  for (const match of rawLine.matchAll(/(\d+)\.\s*([^\s.,;]+)/g)) {
    answers.push({ num: Number(match[1]), raw: match[2] });
  }
  return { rawLine, answers, status: rawLine ? 'found' : 'missing-answer-line' };
}

function decodeAnswer(raw) {
  const value = String(raw || '').trim();
  if (/^[аАaA]$/.test(value)) return { candidates: ['а'], status: 'unique' };
  if (/^[бБ6]$/.test(value)) return { candidates: ['б'], status: 'unique-ocr-heuristic' };
  if (/^[вВbB]$/.test(value)) return { candidates: ['в'], status: 'unique-ocr-heuristic' };
  return { candidates: [], status: 'unknown' };
}

function normalizeOption(value) {
  return normalize(String(value || '').replace(/^\s*[а-яА-Яa-zA-Z]\)\s*/u, ''));
}

function compareOptions(readerOptions, sourceOptions) {
  const normalizedReader = readerOptions.map(normalizeOption);
  const normalizedSource = sourceOptions.map(normalizeOption);
  const differences = [];
  const count = Math.max(normalizedReader.length, normalizedSource.length);
  for (let index = 0; index < count; index += 1) {
    if (normalizedReader[index] !== normalizedSource[index]) {
      differences.push({ index, reader: readerOptions[index] || '', source: sourceOptions[index] || '' });
    }
  }
  return { exact: differences.length === 0, differences };
}

function findSourceQuestion(readerExercise, sourceQuestions) {
  const exact = sourceQuestions.find((item) => normalize(item.question) === normalize(readerExercise.question));
  if (exact) return { question: exact, method: 'exact', score: 1 };
  const sameNumber = sourceQuestions.find((item) => item.num === Number(readerExercise.num));
  const scored = sourceQuestions
    .map((item) => ({ question: item, score: tokenSimilarity(readerExercise.question, item.question) }))
    .sort((a, b) => b.score - a.score)[0];
  if (sameNumber && (!scored || tokenSimilarity(readerExercise.question, sameNumber.question) >= scored.score - 0.08)) {
    return { question: sameNumber, method: 'same-number-text-diff', score: tokenSimilarity(readerExercise.question, sameNumber.question) };
  }
  if (scored && scored.score >= 0.35) return { question: scored.question, method: 'fuzzy', score: scored.score };
  return { question: null, method: 'missing', score: scored ? scored.score : 0 };
}

function auditChapter(chapterEntry, markdown, sections) {
  const data = chapterEntry.data;
  const chapter = chapterNumberFromTitle(data.title);
  const section = sections.get(chapter) || '';
  const sourceQuestions = parseSourceQuestions(section);
  if (chapter === '3.4.2' && sourceQuestions[6]) {
    // MinerU joins the continuation after question 7 into its question line.
    sourceQuestions[6] = {
      num: 7,
      question: 'Строев узнал об Александре, что она ....',
      options: ['преподаватель истории', 'увлекается археологией', 'по образованию филолог']
    };
  }
  const answerKey = extractAnswerKey(markdown, chapter);
  const items = (data.exercises || []).map((readerExercise) => {
    const found = findSourceQuestion(readerExercise, sourceQuestions);
    const optionComparison = found.question
      ? (found.question.options.length === 0
        ? { exact: true, comparable: false, differences: [] }
        : { ...compareOptions(readerExercise.options || [], found.question.options || []), comparable: true })
      : { exact: false, comparable: true, differences: [] };
    const key = answerKey.answers.find((item) => item.num === Number(readerExercise.num));
    const decoded = key ? decodeAnswer(key.raw) : { candidates: [], status: 'missing' };
    const readerAnswer = String(readerExercise.answer || '').toLowerCase();
    const answerMismatch = decoded.candidates.length === 1 && optionComparison.exact && found.method === 'exact' && decoded.candidates[0] !== readerAnswer;
    return {
      num: Number(readerExercise.num),
      readerQuestion: readerExercise.question,
      readerOptions: readerExercise.options || [],
      readerAnswer,
      sourceQuestion: found.question ? found.question.question : '',
      sourceOptions: found.question ? found.question.options : [],
      matchMethod: found.method,
      questionScore: Number(found.score.toFixed(3)),
      optionsExact: optionComparison.exact,
      optionDifferences: optionComparison.differences,
      answerKeyRaw: key ? key.raw : '',
      answerKeyCandidates: decoded.candidates,
      answerKeyStatus: decoded.status,
      answerMismatch,
      flags: [
        found.method !== 'exact' ? 'question-text-review' : '',
      !optionComparison.exact && optionComparison.comparable ? 'option-review' : '',
        answerMismatch ? 'answer-mismatch' : '',
        decoded.status === 'ambiguous-ocr' ? 'answer-key-ocr-ambiguous' : '',
        !key ? 'answer-key-missing' : ''
      ].filter(Boolean)
    };
  });
  return {
    chapter,
    title: data.title,
    readerQuestionCount: (data.exercises || []).length,
    sourceQuestionCount: sourceQuestions.length,
    answerKey,
    items,
    flags: [
      sourceQuestions.length !== (data.exercises || []).length ? 'question-count-diff' : '',
      items.some((item) => item.flags.includes('option-review')) ? 'option-review' : '',
      items.some((item) => item.answerMismatch) ? 'answer-mismatch' : '',
      items.some((item) => item.flags.includes('question-text-review')) ? 'question-text-review' : ''
    ].filter(Boolean)
  };
}

function renderMarkdown(report) {
  const allItems = report.chapters.flatMap((chapter) => chapter.items);
  const issueItems = allItems.filter((item) => item.flags.length);
  const lines = [
    '# Reader 阅读题全书答案审计',
    '',
    `来源：${report.sourcePath}`,
    `生成时间：${report.generatedAt}`,
    '',
    '## 总结',
    '',
    `- Reader 章节：${report.chapters.length}`,
    `- Reader 题目：${allItems.length}`,
    `- 与全书 OCR 题干完全匹配：${allItems.filter((item) => item.matchMethod === 'exact').length}`,
    `- 选项存在差异：${allItems.filter((item) => item.flags.includes('option-review')).length}`,
    `- 题干需要复核：${allItems.filter((item) => item.flags.includes('question-text-review')).length}`,
    `- 答案页可明确判定且与 Reader 不同：${allItems.filter((item) => item.answerMismatch).length}`,
    `- 答案页 OCR 字母有歧义：${allItems.filter((item) => item.flags.includes('answer-key-ocr-ambiguous')).length}`,
    '',
    '> 这是一份审计报告，不会自动修改 Reader。答案页 OCR 中的 `б/в` 混淆只能作为线索，不能替代页面核对。',
    '',
    '## 章节概况',
    '',
    '| 章节 | Reader 题数 | OCR 题数 | 选项差异 | 答案明确不一致 | 状态 |',
    '|---|---:|---:|---:|---:|---|'
  ];
  for (const chapter of report.chapters) {
    const optionCount = chapter.items.filter((item) => item.flags.includes('option-review')).length;
    const mismatchCount = chapter.items.filter((item) => item.answerMismatch).length;
    lines.push(`| ${chapter.chapter} | ${chapter.readerQuestionCount} | ${chapter.sourceQuestionCount} | ${optionCount} | ${mismatchCount} | ${chapter.flags.length ? chapter.flags.join(', ') : 'PASS'} |`);
  }
  lines.push('', '## 需要人工查看的题目', '');
  if (!issueItems.length) lines.push('没有发现结构性差异。');
  for (const item of issueItems) {
    const chapter = report.chapters.find((entry) => entry.items.includes(item));
    lines.push(`### ${chapter.chapter} 第 ${item.num} 题`, '', `- Reader 答案：${item.readerAnswer || '空'}`, `- 题目匹配：${item.matchMethod}（${item.questionScore}）`, `- 原书答案页 OCR：${item.answerKeyRaw || '未找到'}`, `- OCR 解码候选：${item.answerKeyCandidates.join(' / ') || '无法判断'}`, `- 标记：${item.flags.join(', ')}`);
    if (item.optionDifferences.length) {
      lines.push('- 选项差异：');
      for (const difference of item.optionDifferences) lines.push(`  - ${String.fromCharCode(97 + difference.index)}：Reader「${difference.reader}」；OCR「${difference.source}」`);
    }
    if (item.sourceQuestion) lines.push(`- OCR 题干：${item.sourceQuestion}`);
    lines.push('');
  }
  return `${lines.join('\n')}\n`;
}

function main() {
  if (!fs.existsSync(sourcePath)) throw new Error(`Source Markdown not found: ${sourcePath}`);
  const markdown = fs.readFileSync(sourcePath, 'utf8');
  const sections = extractBodySections(markdown);
  const chapters = loadReaderChapters().map((entry) => auditChapter(entry, markdown, sections));
  const report = { sourcePath, generatedAt: new Date().toISOString(), chapters };
  fs.mkdirSync(reportRoot, { recursive: true });
  fs.writeFileSync(path.join(reportRoot, 'report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(path.join(reportRoot, 'report.md'), renderMarkdown(report), 'utf8');
  const allItems = chapters.flatMap((chapter) => chapter.items);
  console.log(JSON.stringify({ chapters: chapters.length, questions: allItems.length, optionReview: allItems.filter((item) => item.flags.includes('option-review')).length, questionReview: allItems.filter((item) => item.flags.includes('question-text-review')).length, answerMismatch: allItems.filter((item) => item.answerMismatch).length, answerKeyAmbiguous: allItems.filter((item) => item.flags.includes('answer-key-ocr-ambiguous')).length, reportRoot }, null, 2));
}

if (require.main === module) main();

module.exports = { extractBodySections, parseSourceQuestions, extractAnswerKey, normalize, compareOptions };
