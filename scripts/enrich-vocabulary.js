#!/usr/bin/env node
/**
 * enrich-vocabulary.js — AI 批量补全词典字段
 *
 * 用法:
 *   node scripts/enrich-vocabulary.js --field examples   --batch 30 --limit 60
 *   node scripts/enrich-vocabulary.js --field theme      --batch 30 --limit 60
 *   node scripts/enrich-vocabulary.js --field grammar    --batch 20 --limit 40
 *   node scripts/enrich-vocabulary.js --field all        --batch 20 --limit 40
 *   node scripts/enrich-vocabulary.js --dry-run          # 只统计，不动文件
 *
 * AI 后端：通过 gemini-web-agent.js (Chrome CDP) 或 doubao-web-agent.js
 * 前置条件：需先启动 Chrome 调试实例
 *   powershell -File scripts/start-chrome-debug.ps1
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ── Config ──
const VOCAB_FILE = path.join(__dirname, '..', 'data', 'vocabulary.json');
const VAULT = path.join(__dirname, '..', '俄语笔记库');
const AGENT_SCRIPT = path.join(__dirname, 'gemini-web-agent.js');
const TMP_PROMPT = path.join(__dirname, '..', 'data', '.enrich-prompt-tmp.txt');
const TMP_RESULT = path.join(__dirname, '..', 'data', '.enrich-result-tmp.txt');

const THEMES = [
  '自然时空特征', '生活物品出行', '动作位移控制', '思维情感社交',
  '逻辑评估管理', '文化符号休闲', '社会人际', '宇宙地理科学',
  '创造改变生存', '人的品质态度', '科学艺术社会', '抽象概念',
];

// ── CLI ──
const args = process.argv.slice(2);
const getArg = (name, dflt) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : dflt;
};
const field = getArg('field', 'examples');
const batchSize = parseInt(getArg('batch', 30));
const limit = parseInt(getArg('limit', 999999));
const isDryRun = args.includes('--dry-run');
const useDoubao = args.includes('--doubao');
const agentScript = useDoubao ? path.join(__dirname, 'doubao-web-agent.js') : AGENT_SCRIPT;

// ── 读取词典 ──
const entries = JSON.parse(fs.readFileSync(VOCAB_FILE, 'utf-8'));

// ── 筛选待处理条目 ──
function isContentWord(e) {
  return ['noun', 'verb', 'adjective', 'adverb', 'pronoun', 'numeral',
          'preposition', 'conjunction', 'particle', 'interjection', 'vocab'].includes(e.type);
}

function findMissing(fld) {
  return entries
    .filter(isContentWord)
    .filter(e => {
      switch (fld) {
        case 'examples': return !e.examples || e.examples.length === 0;
        case 'theme': return !e.theme || e.theme === '';
        case 'case_gov': return e.type === 'verb' && (!e.case_gov || e.case_gov === '');
        case 'pair': return e.type === 'verb' && (!e.pair || e.pair === '');
        case 'gender': return e.type === 'noun' && (!e.gender || e.gender === '');
        case 'grammar':
          if (e.type === 'verb') return (!e.case_gov || e.case_gov === '') || (!e.pair || e.pair === '') || (!e.aspect || e.aspect === '');
          if (e.type === 'noun') return (!e.gender || e.gender === '');
          return false;
        default: return false;
      }
    });
}

// ── Batch prompt builders ──
function buildExamplesPrompt(batch) {
  let p = `你是俄语教学专家。为以下 ${batch.length} 个俄语单词各生成 2 个自然、地道的 B1-B2 难度场景例句。
返回一个 JSON 数组（严格 JSON，不含 markdown 代码块），格式：
[{"word":"原词","examples":[{"ru":"俄语句子","zh":"中文翻译"},{"ru":"俄语句子","zh":"中文翻译"}]}]

单词列表：
`;
  batch.forEach((e, i) => {
    p += `${i + 1}. ${e.word} (${e.type}) — ${e.meaning}`;
    if (e.case_gov) p += ` [接格: ${e.case_gov}]`;
    p += '\n';
  });
  p += '\n返回 JSON 数组，不要加 \`\`\`json 或任何 markdown。';
  return p;
}

function buildThemePrompt(batch) {
  let p = `你是一个俄语词汇分类专家。为以下 ${batch.length} 个俄语单词各归入最合适的一个主题类别。
可选主题：${THEMES.join('、')}
返回 JSON 数组： [{"word":"原词","theme":"主题名称"}]
不要返回未列出的主题名。

`;
  batch.forEach((e, i) => {
    p += `${i + 1}. ${e.word} (${e.type}) — ${e.meaning}\n`;
  });
  p += '\n返回 JSON 数组，不要加 markdown。';
  return p;
}

function buildGrammarPrompt(batch) {
  const verbs = batch.filter(e => e.type === 'verb');
  const nouns = batch.filter(e => e.type === 'noun');

  let p = `你是俄语语法专家。为以下单词补充语法信息。返回 JSON 数组（不含 markdown）：
[
`;
  verbs.forEach(e => {
    p += `  {"word":"${e.word}","pair":"完成体对偶词","aspect":"несов.或сов.","case_gov":"接格关系，如 на+что(Вин.)"},\n`;
  });
  nouns.forEach(e => {
    p += `  {"word":"${e.word}","gender":"masculine/feminine/neuter","animate":true或false},\n`;
  });
  p += ']\n';

  p += `\n单词原文：\n`;
  batch.forEach((e, i) => {
    p += `${i + 1}. ${e.word} — ${e.meaning}`;
    if (e.type === 'verb') p += ` [动词]`;
    if (e.type === 'noun') p += ` [名词]`;
    p += '\n';
  });
  p += '\n返回 JSON 数组，每项按上述格式填充实际值。';
  return p;
}

// ── AI 调用 ──
function callAgent(prompt) {
  fs.writeFileSync(TMP_PROMPT, prompt, 'utf-8');
  console.error(`  Prompt: ${prompt.length} chars → ${TMP_PROMPT}`);

  const cmd = `node "${agentScript}" --pro --file "${TMP_PROMPT}"`;
  console.error(`  Running: ${cmd.substring(0, 80)}...`);

  const t0 = Date.now();
  const result = execSync(cmd, {
    timeout: 600_000,
    encoding: 'utf-8',
    maxBuffer: 10 * 1024 * 1024,
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  console.error(`  Agent done in ${((Date.now() - t0) / 1000).toFixed(0)}s`);

  // 保存原始结果
  fs.writeFileSync(TMP_RESULT, result, 'utf-8');
  return result;
}

function cleanJson(text) {
  // 去掉 stderr 日志行（[gemini] ...）
  let t = text.replace(/^\[gemini\].*$/gm, '').trim();
  // 去掉可能的 markdown 代码块
  t = t.replace(/```json\s*/g, '').replace(/```\s*/g, '');
  // 提取最长的 JSON 数组
  const match = t.match(/\[[\s\S]*\]/);
  return match ? match[0] : t;
}

// ── 更新 .md 文件 ──
function updateMdFile(entry, updates) {
  if (!entry.file) return false;
  const mdPath = path.join(VAULT, entry.file);
  if (!fs.existsSync(mdPath)) {
    console.error(`    ⚠ File not found: ${mdPath}`);
    return false;
  }

  let src = fs.readFileSync(mdPath, 'utf-8');
  let changed = false;

  // 更新 examples
  if (updates.examples && Array.isArray(updates.examples) && updates.examples.length > 0) {
    const examplesYaml = updates.examples.map(ex =>
      `\n  - ru: "${ex.ru.replace(/"/g, '\\"')}"\n    zh: "${ex.zh.replace(/"/g, '\\"')}"`
    ).join('');
    if (/^examples:\s*\[?\s*$/m.test(src) || /^examples:\s*$/m.test(src)) {
      src = src.replace(/^examples:[\s\S]*?(?=^\w[\w-]*:|^---)/m, `examples:${examplesYaml}\n`);
    } else {
      // 在 frontmatter 中插入
      src = src.replace(/(\n)(\w[\w-]*:)/, `$1examples:${examplesYaml}$1$2`);
    }
    changed = true;
  }

  // 更新 theme
  if (updates.theme && updates.theme !== entry.theme) {
    if (/^theme:.*$/m.test(src)) {
      src = src.replace(/^theme:.*$/m, `theme: "${updates.theme}"`);
    } else {
      src = src.replace(/(\n)(\w[\w-]*:)/, `$1theme: "${updates.theme}"$1$2`);
    }
    changed = true;
  }

  // 更新 case_gov
  if (updates.case_gov && updates.case_gov !== entry.case_gov) {
    if (/^case_gov:.*$/m.test(src)) {
      src = src.replace(/^case_gov:.*$/m, `case_gov: "${updates.case_gov}"`);
    } else {
      src = src.replace(/(\n)(\w[\w-]*:)/, `$1case_gov: "${updates.case_gov}"$1$2`);
    }
    changed = true;
  }

  // 更新 pair
  if (updates.pair && updates.pair !== entry.pair) {
    if (/^pair:.*$/m.test(src)) {
      src = src.replace(/^pair:.*$/m, `pair: "${updates.pair}"`);
    } else {
      src = src.replace(/(\n)(\w[\w-]*:)/, `$1pair: "${updates.pair}"$1$2`);
    }
    changed = true;
  }

  // 更新 gender
  if (updates.gender && updates.gender !== entry.gender) {
    if (/^gender:.*$/m.test(src)) {
      src = src.replace(/^gender:.*$/m, `gender: "${updates.gender}"`);
    } else {
      src = src.replace(/(\n)(\w[\w-]*:)/, `$1gender: "${updates.gender}"$1$2`);
    }
    changed = true;
  }

  // 更新 aspect
  if (updates.aspect && updates.aspect !== entry.aspect) {
    if (/^aspect:.*$/m.test(src)) {
      src = src.replace(/^aspect:.*$/m, `aspect: "${updates.aspect}"`);
    } else {
      src = src.replace(/(\n)(\w[\w-]*:)/, `$1aspect: "${updates.aspect}"$1$2`);
    }
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(mdPath, src, 'utf-8');
    return true;
  }
  return false;
}

// ── 主流程 ──
async function main() {
  if (field === 'all') {
    // 按优先级处理所有缺失字段
    for (const f of ['examples', 'theme', 'case_gov', 'pair', 'gender']) {
      console.log(`\n=== Processing field: ${f} ===`);
      await processField(f);
    }
  } else {
    await processField(field);
  }

  console.log('\n✅ Enrichment complete. Run `node build-vocabulary.js` to rebuild vocabulary.json');
}

async function processField(fld) {
  const missing = findMissing(fld);
  console.log(`\n📊 ${fld}: ${missing.length} entries missing (limit: ${limit})`);

  if (isDryRun) return;

  const toProcess = missing.slice(0, Math.min(limit, missing.length));
  if (toProcess.length === 0) {
    console.log('  Nothing to process.');
    return;
  }

  let updated = 0;
  for (let i = 0; i < toProcess.length; i += batchSize) {
    const batch = toProcess.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(toProcess.length / batchSize);
    console.log(`\n--- Batch ${batchNum}/${totalBatches} (${batch.length} entries) ---`);

    let prompt;
    switch (fld) {
      case 'examples': prompt = buildExamplesPrompt(batch); break;
      case 'theme': prompt = buildThemePrompt(batch); break;
      case 'case_gov':
      case 'pair':
      case 'gender':
      case 'grammar': prompt = buildGrammarPrompt(batch); break;
      default: prompt = buildExamplesPrompt(batch);
    }

    try {
      const raw = callAgent(prompt);
      const jsonStr = cleanJson(raw);
      const results = JSON.parse(jsonStr);

      if (!Array.isArray(results)) {
        console.error(`  ❌ Response is not an array, skipping batch`);
        continue;
      }

      // 建立 word → result 映射
      const resultMap = {};
      for (const r of results) {
        if (r.word) resultMap[r.word.toLowerCase().trim()] = r;
      }

      for (const entry of batch) {
        const key = entry.word.toLowerCase().trim();
        const result = resultMap[key];
        if (!result) {
          console.error(`  ⚠ No result for: ${entry.word}`);
          continue;
        }

        const updates = {};
        switch (fld) {
          case 'examples':
            if (result.examples && Array.isArray(result.examples)) {
              updates.examples = result.examples;
            }
            break;
          case 'theme':
            if (result.theme && THEMES.some(t => result.theme.includes(t) || t.includes(result.theme))) {
              // 找到最匹配的主题
              const matched = THEMES.find(t => result.theme.includes(t) || t.includes(result.theme));
              updates.theme = matched || result.theme;
            }
            break;
          case 'case_gov':
            if (result.case_gov) updates.case_gov = result.case_gov;
            if (result.aspect) updates.aspect = result.aspect;
            if (result.pair) updates.pair = result.pair;
            break;
          case 'pair':
            if (result.pair) updates.pair = result.pair;
            if (result.aspect) updates.aspect = result.aspect;
            break;
          case 'gender':
            if (result.gender) updates.gender = result.gender;
            break;
          case 'grammar':
            if (result.case_gov) updates.case_gov = result.case_gov;
            if (result.pair) updates.pair = result.pair;
            if (result.aspect) updates.aspect = result.aspect;
            if (result.gender) updates.gender = result.gender;
            break;
        }

        if (Object.keys(updates).length > 0) {
          const ok = updateMdFile(entry, updates);
          if (ok) updated++;
          console.error(`    ${ok ? '✅' : '⚠️'} ${entry.word}: ${JSON.stringify(updates)}`);
        }
      }
    } catch (err) {
      console.error(`  ❌ Batch error: ${err.message}`);
      // 不中断，继续下一批
    }

    // 避免 Chrome CDP 连接过于频繁
    console.error('  Cooldown 3s...');
    await new Promise(r => setTimeout(r, 3000));
  }

  console.log(`\n📊 ${fld} done: ${updated}/${toProcess.length} updated`);
}

main();
