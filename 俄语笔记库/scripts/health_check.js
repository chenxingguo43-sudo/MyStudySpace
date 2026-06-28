const fs = require('fs');
const path = require('path');

const VAULT = path.resolve(__dirname, '..');
const STANDARD_SECTIONS = new Set(['场景对话', '核心句型', '词汇小灶', '表达技巧', '素材更新']);
const SKIP_DIRS = new Set(['.obsidian', '.trash', '.stfolder', '.claude', '.claudian', 'raw']);
const SKIP_LINK_CHECK_FILES = new Set(['CLAUDE.md']);
const INDEX_RE = /(索引|总索引)\.md$/;

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) walk(path.join(dir, entry.name), out);
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      out.push(path.join(dir, entry.name));
    }
  }
  return out;
}

function rel(file) {
  return path.relative(VAULT, file).replace(/\\/g, '/');
}

function readText(file) {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch {
    return '';
  }
}

function parseFrontmatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;

  const fm = {};
  let currentListKey = null;

  for (const line of match[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
    if (kv) {
      currentListKey = kv[1];
      const raw = kv[2].trim();
      fm[currentListKey] = raw.replace(/^["']|["']$/g, '');
      continue;
    }

    const item = line.match(/^\s*-\s*(.+)$/);
    if (item && currentListKey) {
      if (!Array.isArray(fm[currentListKey])) fm[currentListKey] = [];
      fm[currentListKey].push(item[1].trim().replace(/^["']|["']$/g, ''));
    }
  }

  return fm;
}

function fileStemSet(files) {
  const stems = new Set();
  const relativePaths = new Set();

  for (const file of files) {
    const r = rel(file).replace(/\.md$/i, '');
    relativePaths.add(r);
    stems.add(path.basename(file, '.md'));
  }

  return { stems, relativePaths };
}

function collectLinks(text) {
  return [...text.matchAll(/\[\[([^\]|#]+)(?:[|#][^\]]*)?\]\]/g)].map((m) => m[1].trim());
}

function normalizeLinkTarget(link) {
  return link
    .replace(/\\/g, '/')
    .replace(/\/+$/g, '')
    .replace(/\.md$/i, '')
    .trim();
}

function countDuplicateRelatedLinks(text) {
  const lines = text.split(/\r?\n/);
  const relatedIndex = lines.findIndex((line) => /^##\s+相关\s*$/.test(line));
  if (relatedIndex === -1) return 0;

  let end = lines.length;
  for (let i = relatedIndex + 1; i < lines.length; i++) {
    if (/^##\s+/.test(lines[i])) {
      end = i;
      break;
    }
  }

  const seen = new Set();
  let duplicates = 0;
  for (const line of lines.slice(relatedIndex + 1, end)) {
    const match = line.match(/^\s*-\s*(\[\[[^\]]+\]\])\s*$/);
    if (!match) continue;
    if (seen.has(match[1])) duplicates++;
    seen.add(match[1]);
  }
  return duplicates;
}

function addIssue(issues, level, type, file, msg) {
  issues.push({ level, type, file: rel(file), msg });
}

function run({ json = false } = {}) {
  const files = walk(VAULT);
  const { stems, relativePaths } = fileStemSet(files);
  const issues = [];

  for (const file of files) {
    const r = rel(file);
    const text = readText(file);
    const fm = parseFrontmatter(text);

    if (!INDEX_RE.test(file) && !r.startsWith('wiki/')) {
      const size = fs.statSync(file).size;
      if (size === 0) addIssue(issues, 'error', 'empty_file', file, '空文件');
      else if (size < 30) addIssue(issues, 'warn', 'stub_file', file, `极短文件 (${size} bytes)`);
    }

    if (text.includes('\uFFFD')) {
      addIssue(issues, 'error', 'replacement_char', file, '包含损坏字符 U+FFFD');
    }

    if (r.startsWith('B2口语素材/') && !INDEX_RE.test(file)) {
      if (!fm) {
        addIssue(issues, 'error', 'no_frontmatter', file, '缺少 frontmatter');
      } else {
        for (const field of ['ru', 'zh', 'chapter', 'tags', 'mastery']) {
          if (!fm[field] || (Array.isArray(fm[field]) && fm[field].length === 0)) {
            addIssue(issues, 'warn', 'missing_field', file, `缺少字段: ${field}`);
          }
        }
        if (fm.section && !STANDARD_SECTIONS.has(fm.section)) {
          addIssue(issues, 'warn', 'nonstandard_section', file, `非标准 section: ${fm.section}`);
        }
        if (Array.isArray(fm.tags) && fm.tags.length < 3) {
          addIssue(issues, 'warn', 'short_tags', file, `tags 数组过短: ${fm.tags.length} 个元素`);
        }
      }
    }

    if (r.startsWith('词汇/') && !INDEX_RE.test(file) && !r.includes('vocab-review-protocol')) {
      if (!fm) {
        addIssue(issues, 'error', 'no_frontmatter', file, '缺少 frontmatter');
      } else {
        for (const field of ['word', 'type', 'meaning']) {
          if (!fm[field]) addIssue(issues, 'warn', 'missing_field', file, `缺少字段: ${field}`);
        }
      }
    }

    const duplicateRelatedLinks = countDuplicateRelatedLinks(text);
    if (duplicateRelatedLinks > 0) {
      addIssue(issues, 'warn', 'duplicate_related_links', file, `## 相关 中有 ${duplicateRelatedLinks} 个重复链接`);
    }

    if (SKIP_LINK_CHECK_FILES.has(r)) continue;

    for (const link of collectLinks(text)) {
      const clean = normalizeLinkTarget(link);
      const last = clean.split('/').pop();
      const isKnown = relativePaths.has(clean) || stems.has(last);
      const isTemplateBlank = clean === '';
      if (!isKnown && !isTemplateBlank) {
        addIssue(issues, 'warn', 'broken_link', file, `断链: [[${link}]]`);
      }
    }
  }

  issues.sort((a, b) => {
    const levelOrder = { error: 0, warn: 1 };
    return levelOrder[a.level] - levelOrder[b.level] || a.type.localeCompare(b.type) || a.file.localeCompare(b.file);
  });

  if (json) {
    console.log(JSON.stringify(issues, null, 2));
    return issues.some((issue) => issue.level === 'error') ? 1 : 0;
  }

  const errors = issues.filter((issue) => issue.level === 'error');
  const warns = issues.filter((issue) => issue.level === 'warn');
  const byType = issues.reduce((acc, issue) => {
    acc[issue.type] = (acc[issue.type] || 0) + 1;
    return acc;
  }, {});

  console.log('[Health] 俄语笔记库健康报告');
  console.log(`   总 Markdown: ${files.length}`);
  console.log(`   错误: ${errors.length} | 警告: ${warns.length}`);
  console.log('');

  if (issues.length === 0) {
    console.log('[OK] 一切正常！');
  } else {
    console.log('### 问题分类统计');
    for (const [type, count] of Object.entries(byType).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${type}: ${count}`);
    }
    console.log('');
    console.log('### 问题明细');
    for (const issue of issues.slice(0, 120)) {
      const tag = issue.level === 'error' ? '[ERR]' : '[WARN]';
      console.log(`  ${tag} [${issue.type}] ${issue.file}`);
      console.log(`     ${issue.msg}`);
    }
    if (issues.length > 120) {
      console.log(`  ... 还有 ${issues.length - 120} 条，使用 node scripts/health_check.js --json 查看全部。`);
    }
  }

  return errors.length > 0 ? 1 : 0;
}

if (require.main === module) {
  process.exitCode = run({ json: process.argv.includes('--json') });
}

module.exports = { run };
