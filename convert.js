/**
 * 俄语知识库.html → Obsidian Markdown 批量转换脚本
 * 用法：node convert.js
 * 输出：俄语笔记库/B2口语素材/
 */
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const SRC = path.join(__dirname, '俄语知识库.html');
const OUT = path.join(__dirname, '俄语笔记库', 'B2口语素材');
const TODAY = new Date().toISOString().slice(0, 10);

// ─── 禁用 Templater 自动触发 ───
const TEMPLATER_CFG = path.join(__dirname, '俄语笔记库', '.obsidian', 'plugins', 'templater-obsidian', 'data.json');
let templaterBackup = null;
try {
  templaterBackup = fs.readFileSync(TEMPLATER_CFG, 'utf-8');
  const cfg = JSON.parse(templaterBackup);
  cfg.trigger_on_file_creation = false;
  cfg.enable_folder_templates = false;
  fs.writeFileSync(TEMPLATER_CFG, JSON.stringify(cfg, null, 2), 'utf-8');
  console.log('🔒 已临时禁用 Templater 自动模板');
} catch (e) { console.log('⚠ 无法修改 Templater 配置，请手动关闭再跑:', e.message); }

// ─── 辅助函数 ───
function sanitizeFilename(str, maxLen) {
  return str
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen || 50);
}

function hash8(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(16).slice(0, 8).padStart(8, '0');
}

function chapterDir(name) {
  const m = name.match(/^([一二三四五六七八九十]+)、/);
  const num = m ? m[1] : '';
  const cleaned = name.replace(/[\\/:*?"<>|]/g, '').slice(0, 30);
  return num ? `${num}_${cleaned}` : cleaned;
}

function tagFromChapter(name) {
  const parts = [];
  if (name.includes('日常起居')) parts.push('日常起居');
  if (name.includes('学习')) parts.push('学习');
  if (name.includes('饮食') || name.includes('健康')) parts.push('饮食健康');
  if (name.includes('情绪')) parts.push('情绪表达');
  if (name.includes('天气') || name.includes('季节')) parts.push('天气季节');
  if (name.includes('家庭') || name.includes('朋友') || name.includes('人际')) parts.push('人际关系');
  if (name.includes('宠物')) parts.push('宠物');
  if (name.includes('旅行') || name.includes('出行')) parts.push('旅行出行');
  if (name.includes('工作') || name.includes('兼职') || name.includes('职业')) parts.push('工作职业');
  if (name.includes('问候') || name.includes('寒暄')) parts.push('问候寒暄');
  if (name.includes('兴趣') || name.includes('文化') || name.includes('科技')) parts.push('兴趣文化');
  parts.push('B2', '口语');
  return parts;
}

// ─── 读取并解析 ───
console.log('📖 读取文件...');
const html = fs.readFileSync(SRC, 'utf-8');
const $ = cheerio.load(html, { decodeEntities: true });

// 移除 CSS 和 JS
$('style, script').remove();
// 跳过非数据表格
$('table.quick-ref').remove();
$('#oral-detail-table').remove();

const tables = $('table');
console.log(`📊 找到 ${tables.length} 个表格`);

// ─── 遍历 DOM，追踪上下文 ───
let currentChapter = '';
let currentSection = '';
let totalFiles = 0;
let skippedTables = 0;
const fileIndex = {}; // 追踪同名文件

// 获取 body 内所有 h2.section-title, h3, h4, table 元素，按文档顺序
const elements = $('body').find('h2.section-title, h3, h4, table').toArray();

for (const el of elements) {
  const tag = el.tagName.toLowerCase();
  const $el = $(el);

  if (tag === 'h2') {
    currentChapter = $el.text().replace(/遮俄|遮中|重置本章/g, '').trim();
    currentSection = '';
  } else if (tag === 'h3') {
    currentSection = $el.text().replace(/^[📝💬🆕✨🎯🔍⏰📈🔴🟡🟢📋🔄📊\s]+/, '').trim();
  } else if (tag === 'h4') {
    currentSection = $el.text().replace(/^[📈\s]+/, '').trim();
  } else if (tag === 'table') {
    if (!currentChapter) { skippedTables++; continue; }

    const rows = $el.find('tr').toArray();
    if (rows.length < 2) { skippedTables++; continue; }

    // 检测列数（从第一行 td）
    let colCount = 0;
    for (const row of rows) {
      const tds = $(row).find('td');
      if (tds.length > 0) { colCount = tds.length; break; }
    }
    if (colCount < 2 || colCount > 4) { skippedTables++; continue; }

    const dir = path.join(OUT, chapterDir(currentChapter));
    fs.mkdirSync(dir, { recursive: true });

    for (const row of rows) {
      const tds = $(row).find('td');
      if (tds.length < 2) continue; // 跳过 th 行或空行

      const ru = $(tds[0]).text().trim();
      const zh = $(tds[1]).text().trim();
      if (!ru || !zh) continue;
      if (ru === zh) continue; // 跳过相同的（可能是导航表）

      // 如果是导航链接表，跳过
      if (ru.includes('<a ') || zh.includes('<a ')) continue;

      const extra = colCount >= 3 ? $(tds[2]).text().trim() : '';

      // 生成文件名：俄语前50字符 + 8位哈希
      const base = sanitizeFilename(ru, 50);
      const h = hash8(ru + zh);
      let fname = `${base}-${h}.md`;

      // 冲突处理
      const key = path.join(dir, fname);
      if (fileIndex[key]) {
        fname = `${base}-${h}-${fileIndex[key]}.md`;
        fileIndex[key]++;
      } else {
        fileIndex[key] = 1;
      }

      // 构建 YAML frontmatter
      const tags = tagFromChapter(currentChapter);
      if (currentSection) tags.unshift(currentSection);

      const yaml = [
        '---',
        `ru: "${ru.replace(/"/g, '\\"')}"`,
        `zh: "${zh.replace(/"/g, '\\"')}"`,
        `chapter: "${currentChapter}"`,
        currentSection ? `section: "${currentSection}"` : null,
        extra ? `extra: "${extra.replace(/"/g, '\\"')}"` : null,
        `tags: [${tags.map(t => `"${t}"`).join(', ')}]`,
        `mastery: 1`,
        `created: ${TODAY}`,
        '---',
        '',
        `**Ru:** ${ru}`,
        '',
        `**Zh:** ${zh}`,
        extra ? `\n**Extra:** ${extra}\n` : '',
      ].filter(Boolean).join('\n');

      fs.writeFileSync(path.join(dir, fname), yaml + '\n', 'utf-8');
      totalFiles++;
    }
  }
}

// ─── 恢复 Templater 配置 ───
try {
  if (templaterBackup) {
    fs.writeFileSync(TEMPLATER_CFG, templaterBackup, 'utf-8');
    console.log('🔓 已恢复 Templater 配置');
  }
} catch (e) { console.log('⚠ 无法恢复 Templater 配置:', e.message); }

// ─── 统计 ───
const dirs = fs.readdirSync(OUT, { withFileTypes: true }).filter(d => d.isDirectory());
console.log(`\n✅ 完成！`);
console.log(`  生成笔记：${totalFiles} 个`);
console.log(`  跳过表格：${skippedTables} 个`);
console.log(`  输出目录：${OUT}/`);
console.log(`  章节数：${dirs.length}`);
for (const d of dirs) {
  const count = fs.readdirSync(path.join(OUT, d.name)).length;
  console.log(`    ${d.name}/ (${count} 个文件)`);
}
