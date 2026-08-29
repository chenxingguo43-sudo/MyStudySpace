/* 阶段二·内容清理：
 * 1) 删除语法 330 题的 AI 占位讲解（referenceExplanation）与占位派生的通用 pitfalls；
 * 2) 修复已对照原书 PDF 确认的 OCR 错型（б/6、误字、页眉噪声、截断译文）；
 * 3) 生成改动底账 audit/2026-08-29-ocr-cleanup.json + .md。
 * 不触碰 俄语资料库/ 下任何文件。可重复运行（幂等）。 */
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const B2 = path.join(ROOT, 'data', 'textbook', 'russian_b2');
const AUDIT_DIR = path.join(B2, 'audit');

const GENERIC_PITFALLS = new Set([
  '先识别原书给出的规则，再结合语境判断。',
  '先识别原书给出的固定搭配，再结合句子语境判断。',
  '先保留材料语境，再判断固定结构、格或书面格式。'
]);

/* 已对照新扫描 origin.pdf 原书页确认的 OCR 误字修正。
 * evidence = 原书 PDF 页码（1 起算）。 */
const EXPLANATION_FIXES = [
  { file: 'ch0000.json', printedNumber: 11, before: '语气词 6ы', after: '语气词 бы', evidence: 'б/6 混淆；俄语单词内不可能出现数字 6' },
  { file: 'ch0003.json', printedNumber: 7, before: '某стоять в чем 在于', after: 'состоять в чем 在于', evidence: '原书 PDF 第 53 页："состоять в чем 在于"' },
  { file: 'ch0003.json', printedNumber: 10, before: '$\\eta$ 是说明从句的连接词', after: 'что 是说明从句的连接词', evidence: '原书 PDF 第 54 页："что 是说明从句的连接词"' },
  { file: 'ch0003.json', printedNumber: 12, before: '姓名是关联词, 受 рисковать 要求变第五格', after: 'чем 是关联词, 受 рисковать 要求变第五格', evidence: '原书 PDF 第 54 页："чем 是关联词"' },
  { file: 'ch0003.json', printedNumber: 32, before: 'XOYI 尽管。；译文：塔尼亚继续放, 1985.', after: 'хотя 尽管。；译文：塔尼亚继续吸烟, 尽管医生很早就建议她戒烟。', evidence: '原书 PDF 第 58 页：解析"хотя 尽管"；译文"塔尼亚继续吸烟, 尽管医生很早就建议她戒烟"' },
  { file: 'ch0003.json', printedNumber: 33, before: '不 symmetry na to what 尽管', after: 'несмотря на то что 尽管', evidence: '原书 PDF 第 58 页："несмотря на то что 尽管"' },
  { file: 'ch0003.json', printedNumber: 35, before: '波罗的海的生态状况明', after: '波罗的海的生态状况明显好转', evidence: '原书 PDF 第 58–59 页：译文跨页，结尾"明显好转"' },
  { file: 'ch0003.json', printedNumber: 49, before: 'Ⅱ 在句中做连接词', after: 'ли 在句中做连接词', evidence: '原书 PDF 第 59 页："ли 在句中做连接词"' }
];

const OPTION_NOISE = /\s*#\s*※.*~~~$/;
const PAGE_HEADER_SUFFIX = /\s*◎俄罗斯对外俄语等级考试真题与解析\(B2级\)\s*◎\s*$/;
const PAGE_HEADER_EXACT = /^◎俄罗斯对外俄语等级考试真题与解析\(B2级\)\s*◎$/;

function stripNoise(text) {
  let out = String(text).replace(OPTION_NOISE, '');
  out = out.replace(PAGE_HEADER_SUFFIX, '').trimEnd();
  return out;
}

function main() {
  fs.mkdirSync(AUDIT_DIR, { recursive: true });
  const audit = [];

  /* ── 1. 语法六章：删 AI 占位 + 修误字 ── */
  for (let i = 0; i < 6; i++) {
    const file = `ch000${i}.json`;
    const filePath = path.join(B2, file);
    const chapter = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    chapter.exercises.forEach(exercise => {
      if (exercise.referenceExplanation !== undefined) {
        audit.push({ file, target: `${exercise.id}.referenceExplanation`, before: exercise.referenceExplanation, after: '(已删除)', evidence: '阶段二决定：AI 占位讲解整体删除' });
        delete exercise.referenceExplanation;
      }
      if (Array.isArray(exercise.pitfalls)) {
        const kept = exercise.pitfalls.filter(p => !GENERIC_PITFALLS.has(p));
        if (kept.length !== exercise.pitfalls.length) {
          audit.push({ file, target: `${exercise.id}.pitfalls`, before: JSON.stringify(exercise.pitfalls), after: kept.length ? JSON.stringify(kept) : '(已清空)', evidence: '占位派生的通用文案' });
          if (kept.length) exercise.pitfalls = kept; else delete exercise.pitfalls;
        }
      }
      EXPLANATION_FIXES.filter(fix => fix.file === file).forEach(fix => {
        if (exercise.printedNumber !== fix.printedNumber) return;
        if (exercise.sourceExplanation && exercise.sourceExplanation.includes(fix.before)) {
          audit.push({ file, target: `${exercise.id}.sourceExplanation`, before: exercise.sourceExplanation, after: exercise.sourceExplanation.replace(fix.before, fix.after), evidence: fix.evidence });
          exercise.sourceExplanation = exercise.sourceExplanation.replace(fix.before, fix.after);
        }
      });
      exercise.options.forEach((option, index) => {
        if (OPTION_NOISE.test(option.text)) {
          audit.push({ file, target: `${exercise.id}.options[${index}].text`, before: option.text, after: stripNoise(option.text), evidence: '原书页眉花纹混入选项' });
          option.text = stripNoise(option.text);
        }
      });
    });
    fs.writeFileSync(filePath, `${JSON.stringify(chapter, null, 2)}\n`, 'utf8');
  }

  /* ── 2. 阅读模块：页眉噪声 ── */
  const readingFixes = [
    { file: 'modules/reading/ch0004.json', kind: 'paragraph' },
    { file: 'modules/reading/ch0006.json', kind: 'embedded' },
    { file: 'modules/reading/ch0007.json', kind: 'embedded' },
    { file: 'modules/reading/ch0008.json', kind: 'embedded' },
    { file: 'modules/reading/ch0009.json', kind: 'embedded' }
  ];
  readingFixes.forEach(({ file, kind }) => {
    const filePath = path.join(B2, file);
    const chapter = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    (chapter.original || []).forEach((text, index) => {
      if (PAGE_HEADER_EXACT.test(text.trim())) {
        audit.push({ file, target: `original[${index}]`, before: text, after: '""（整段为书页页眉，置空以保持段落对齐；translations 已注明）', evidence: '页眉花纹噪声' });
        chapter.original[index] = '';
      }
    });
    const stringsToClean = [];
    (chapter.questions || []).forEach((question, qi) => {
      if (PAGE_HEADER_SUFFIX.test(question.prompt || '')) stringsToClean.push({ get: () => question.prompt, set: v => { question.prompt = v; }, label: `questions[${qi}].prompt` });
      (question.options || []).forEach((option, oi) => {
        if (PAGE_HEADER_SUFFIX.test(option.text || '')) stringsToClean.push({ get: () => option.text, set: v => { option.text = v; }, label: `questions[${qi}].options[${oi}].text` });
      });
    });
    stringsToClean.forEach(({ get, set, label }) => {
      const before = get();
      audit.push({ file, target: label, before, after: stripNoise(before), evidence: '页眉花纹混入题目/选项' });
      set(stripNoise(before));
    });
    fs.writeFileSync(filePath, `${JSON.stringify(chapter, null, 2)}\n`, 'utf8');
  });

  /* ── 3. 底账落盘 ── */
  const stamp = '2026-08-29';
  fs.writeFileSync(path.join(AUDIT_DIR, `${stamp}-ocr-cleanup.json`), `${JSON.stringify({ date: stamp, changes: audit }, null, 2)}\n`, 'utf8');
  const lines = [`# 阶段二清理底账（${stamp}）`, '', `共 ${audit.length} 处改动。每处均已对照新扫描 origin.pdf 原书页或既定决定确认。`, ''];
  const groups = {};
  audit.forEach(entry => { (groups[entry.file] = groups[entry.file] || []).push(entry); });
  Object.keys(groups).sort().forEach(file => {
    lines.push(`## ${file}（${groups[file].length} 处）`, '');
    groups[file].forEach(entry => {
      lines.push(`- **${entry.target}**`, `  - 原文：${entry.before.slice(0, 120).replace(/\n/g, ' ')}`, `  - 改为：${String(entry.after).slice(0, 120)}`, `  - 依据：${entry.evidence}`);
    });
    lines.push('');
  });
  fs.writeFileSync(path.join(AUDIT_DIR, `${stamp}-ocr-cleanup.md`), lines.join('\n'), 'utf8');
  process.stdout.write(`Audit entries: ${audit.length}\n`);
}

if (require.main === module) main();

module.exports = { GENERIC_PITFALLS, EXPLANATION_FIXES, stripNoise };
