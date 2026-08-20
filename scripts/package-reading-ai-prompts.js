/* Package each reading article as a self-contained web-AI work folder. */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const readingRoot = path.join(root, 'docs', 'reader-ai-reading');
const inputRoot = path.join(readingRoot, 'inputs');
const packageRoot = path.join(readingRoot, 'packages');
const promptSource = path.join(readingRoot, 'PROMPT-reading-evidence-v1.md');

function packagePrompt(entry) {
  const warning = entry.sourceCoverage === 'ready'
    ? '这篇文章的原文和翻译已通过基础完整性检查。'
    : `这篇文章暂不能作为最终解析材料：${(entry.coverageWarnings || []).join('；')}。请先补回完整原文，再处理题目。`;
  return `# ${entry.chapter} 阅读题专用提示词

你正在处理同目录的 **input.md**，它是文章《${entry.title}》的唯一事实材料。

## 先看这一条

${warning}

## 处理要求

- 只处理 **input.md** 中已有的阅读题，不要新增题目。
- “已确认正确答案”是固定答案，不能改动；证据不足时写“证据不足”。
- 先定位原文，再解释为什么正确答案成立，再逐项解释其他选项为什么错。
- 原文证据必须逐字引用，并标明段落编号；需要时列出多个句子或多个段落。
- 每个错误选项都要指出具体改变了什么：时间、对象、数量、范围、程度、可能性、因果或事实状态。
- 禁止使用“回到文章确认”“只有一个选项符合”“语法上可以接上”等空泛句子。
- 使用简体中文说明，保留关键俄语短语并附中文含义。

## 每题固定格式

~~~markdown
### 第 N 题

#### 原文证据
- 第 X 段：逐字引用
- 第 X 段：如有第二个必要片段，继续列出

#### 为什么正确答案是 X
说明正确项与全部证据之间的具体对应关系。

#### 其他选项为什么错
- A：说明它改变了原文哪一项信息。
- B：说明它改变了原文哪一项信息。
- C：说明它改变了原文哪一项信息。

#### 易错提醒
指出最容易把哪个词或哪种事实状态看错。

#### 一句话复盘
用一句准确、具体的话总结判断依据。
~~~

最后追加“证据完整性检查”：逐题说明证据是否完整、是否需要多个片段、是否存在证据不足。
`;
}

function packageReadme(entry) {
  const warning = entry.sourceCoverage === 'ready'
    ? '状态：可以交给网页端 AI。'
    : `状态：暂缓最终解析。原因：${(entry.coverageWarnings || []).join('；')}。`;
  return `# ${entry.chapter} · ${entry.title}

${warning}

## 使用顺序

1. 把本目录的 **input.md** 拖入网页端 AI。
2. 打开本目录的 **prompt.md**，完整复制后发送。
3. AI 返回后，把完整回答保存到 **output/analysis.md**。
4. 先人工检查原文引用和每个错误选项，再交给 Reader 导入器。

题目数量：${entry.exerciseCount}
输入文件：**input.md**
提示词文件：**prompt.md**
返回结果：**output/analysis.md**
`;
}

function main() {
  const manifest = JSON.parse(fs.readFileSync(path.join(inputRoot, 'manifest.json'), 'utf8'));
  const canonicalPrompt = fs.readFileSync(promptSource, 'utf8').trim();
  fs.mkdirSync(packageRoot, { recursive: true });
  const packaged = [];

  for (const entry of manifest) {
    const stem = path.basename(entry.inputFile, '.md');
    const destination = path.join(packageRoot, stem);
    const outputDirectory = path.join(destination, 'output');
    fs.mkdirSync(outputDirectory, { recursive: true });
    fs.copyFileSync(path.join(inputRoot, entry.inputFile), path.join(destination, 'input.md'));
    fs.writeFileSync(path.join(destination, 'prompt.md'), packagePrompt(entry), 'utf8');
    fs.writeFileSync(path.join(destination, 'README.md'), packageReadme(entry), 'utf8');
    fs.writeFileSync(path.join(outputDirectory, 'README.md'), '# AI 返回结果\n\n把网页端 AI 的完整返回内容保存为本目录的 `analysis.md`。\n', 'utf8');
    packaged.push({
      chapter: entry.chapter,
      title: entry.title,
      directory: `packages/${stem}`,
      inputFile: 'input.md',
      promptFile: 'prompt.md',
      outputFile: 'output/analysis.md',
      exerciseCount: entry.exerciseCount,
      sourceCoverage: entry.sourceCoverage,
      coverageWarnings: entry.coverageWarnings || [],
      canonicalPromptVersion: 'reading-evidence-v1',
      canonicalPromptBytes: Buffer.byteLength(canonicalPrompt, 'utf8')
    });
  }

  fs.writeFileSync(path.join(packageRoot, 'manifest.json'), `${JSON.stringify(packaged, null, 2)}\n`, 'utf8');
  console.log(`Packaged ${packaged.length} reading work folders.`);
}

if (require.main === module) main();

module.exports = { packagePrompt, packageReadme };
