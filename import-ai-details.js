/**
 * Import AI-generated word details from desktop files into B2单词表 markdown files.
 * Only updates files that still have placeholder content (待AI补充 / 待补充).
 * Skips files that already have real content.
 */
const fs = require('fs');
const path = require('path');

const B2_ROOT = 'D:/MyStudySpace/俄语笔记库/词汇/B2单词表';
const DESKTOP_DIR = 'E:/Desktop/剩余俄语单词补充';

// ===== STEP 1: Parse source files =====

function unescapeMDJson(text) {
  // The .md files have JSON "double-escaped" for safe markdown embedding.
  // Characters like _, ., (, ), [, ], *, ", {, } got backslash-prefixed.
  // We need to keep valid JSON escapes (\" \\ \/ \b \f \n \r \t \uXXXX)
  // but strip markdown-added backslashes from everything else.
  return text.replace(/\\(.)/g, (match, char) => {
    // Keep backslash ONLY for JSON escape sequences that could appear
    // inside string values: \\ \/ \b \f \n \r \t \uXXXX
    // \" is structural (markdown-escaped), NOT a JSON string-content escape
    if ('\\/bfnrtu'.includes(char)) {
      return match;
    }
    // Markdown-added backslash (including \"): remove it
    return char;
  });
}

function extractJSONFromMD(content) {
  const results = [];
  const lines = content.split('\n');

  // Find first \[ and last \]
  let startLine = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === '\\[') { startLine = i; break; }
  }
  if (startLine === -1) return results;

  let endLine = -1;
  for (let i = lines.length - 1; i > startLine; i--) {
    if (lines[i].trim() === '\\]') { endLine = i; break; }
  }
  if (endLine === -1) return results;

  // Extract raw block and unescape
  const block = lines.slice(startLine + 1, endLine).join('\n');
  const unescaped = unescapeMDJson(block);

  // Split into individual objects by finding },\n{ at the top level
  // Track brace/bracket depth to distinguish inner vs outer separators
  const objects = splitTopLevelObjects(unescaped);
  for (const objStr of objects) {
    try {
      const parsed = JSON.parse(objStr);
      if (parsed && parsed.word) results.push(parsed);
    } catch (e) {
      // Try to fix common AI JSON issues: unclosed arrays, trailing commas
      let fixed = objStr
        .replace(/,\s*\]/g, ']')       // trailing comma before ]
        .replace(/,\s*\}/g, '}');      // trailing comma before }
      // Auto-close unclosed arrays at end of object
      fixed = autoCloseJSON(fixed);
      try {
        const parsed = JSON.parse(fixed);
        if (parsed && parsed.word) results.push(parsed);
      } catch (e2) {
        // Skip this object
      }
    }
  }

  return results;
}

function splitTopLevelObjects(text) {
  // Split a series of {...}, {...}, {...} into individual objects
  // by tracking brace depth (including those inside strings)
  const objects = [];
  let depth = 0;
  let inString = false;
  let escape = false;
  let objStart = -1;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (escape) { escape = false; continue; }
    if (ch === '\\') { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;

    if (ch === '{') {
      if (depth === 0) objStart = i;
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0 && objStart >= 0) {
        objects.push(text.substring(objStart, i + 1));
        objStart = -1;
      }
    }
  }

  // Handle incomplete last object
  if (depth > 0 && objStart >= 0) {
    const incomplete = text.substring(objStart);
    // Try to auto-close
    const closed = autoCloseJSON(incomplete);
    if (closed !== incomplete) {
      try {
        JSON.parse(closed);
        objects.push(closed);
      } catch (e) { /* skip */ }
    }
  }

  return objects;
}

function autoCloseJSON(text) {
  // Count unclosed brackets and add closing ones
  let result = text;
  let inString = false, escape = false;
  const stack = [];

  for (let i = 0; i < result.length; i++) {
    const ch = result[i];
    if (escape) { escape = false; continue; }
    if (ch === '\\') { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;

    if (ch === '{' || ch === '[') {
      stack.push(ch === '{' ? '}' : ']');
    } else if (ch === '}' || ch === ']') {
      if (stack.length > 0 && stack[stack.length - 1] === ch) {
        stack.pop();
      }
    }
  }

  // Add missing closing brackets in reverse order
  while (stack.length > 0) {
    result += stack.pop();
  }
  return result;
}

function extractJSONFromText(content) {
  // For the Gemini .txt file - find JSON arrays using bracket depth tracking
  const results = [];
  // First, try to find ```json code blocks
  const codeBlockRe = /```(?:json)?\s*\n([\s\S]*?)```/g;
  let match;
  while ((match = codeBlockRe.exec(content)) !== null) {
    try {
      const parsed = JSON.parse(match[1].trim());
      if (Array.isArray(parsed)) results.push(...parsed);
      else results.push(parsed);
    } catch (e) {
      // Try bracket matching within the code block
      extractArraysByBracket(match[1], results);
    }
  }

  // If no code blocks found, try bracket matching on entire content
  if (results.length === 0) {
    extractArraysByBracket(content, results);
  }

  return results;
}

function extractArraysByBracket(text, results) {
  // Find top-level [...] arrays using bracket depth
  let depth = 0;
  let start = -1;
  let inString = false;
  let escape = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (escape) { escape = false; continue; }
    if (ch === '\\') { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }

    if (!inString) {
      if (ch === '[') {
        if (depth === 0) start = i;
        depth++;
      } else if (ch === ']') {
        depth--;
        if (depth === 0 && start >= 0) {
          const candidate = text.substring(start, i + 1);
          if (candidate.includes('"word"') && candidate.includes('"definition_ru"')) {
            try {
              const parsed = JSON.parse(candidate);
              if (Array.isArray(parsed)) results.push(...parsed);
            } catch (e) {
              // skip malformed
            }
          }
          start = -1;
        }
      }
    }
  }
}

function getAllEntries() {
  const files = fs.readdirSync(DESKTOP_DIR).filter(f => f.endsWith('.md') || f.endsWith('.txt'));
  const allEntries = [];

  for (const file of files) {
    const filePath = path.join(DESKTOP_DIR, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    console.log(`  Reading: ${file} (${(content.length / 1024).toFixed(1)} KB)`);

    let entries;
    if (file.endsWith('.md')) {
      entries = extractJSONFromMD(content);
    } else {
      entries = extractJSONFromText(content);
    }

    // Filter: only keep objects with a real word field
    const valid = entries.filter(e => {
      if (!e || typeof e !== 'object') return false;
      if (!e.word || typeof e.word !== 'string') return false;
      // Skip the template example word
      if (e.word === '例词') return false;
      // Must have actual definition content
      if (!e.definition_ru || e.definition_ru.length < 10) return false;
      return true;
    });

    console.log(`    Found ${valid.length} valid entries (${entries.length} total JSON objects)`);
    allEntries.push(...valid);
  }

  return allEntries;
}

// ===== STEP 2: Find markdown file for a word =====

function findMarkdownFile(word) {
  // Search all subdirectories of B2_ROOT
  const dirs = fs.readdirSync(B2_ROOT, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

  for (const dir of dirs) {
    const filePath = path.join(B2_ROOT, dir, `${word}.md`);
    if (fs.existsSync(filePath)) return filePath;
  }
  return null;
}

// ===== STEP 3: Check if file needs update =====

function needsUpdate(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  return content.includes('待AI补充') || content.includes('待补充');
}

// ===== STEP 4: Build replacement content =====

function buildCollocationsTable(collocations) {
  if (!collocations || collocations.length === 0) {
    return '| 搭配 | 例句 | 翻译 |\n|------|------|------|\n| （待补充） | （待补充） | （待补充） |';
  }
  let table = '| 搭配 | 例句 | 翻译 |\n|------|------|------|\n';
  for (const c of collocations) {
    const phrase = c.phrase || '';
    const ru = (c.ru || '').replace(/\|/g, '\\|');
    const zh = (c.zh || '').replace(/\|/g, '\\|');
    table += `| ${phrase} | ${ru} | ${zh} |\n`;
  }
  return table;
}

function buildSynonymsTable(synonyms) {
  if (!synonyms || synonyms.length === 0) {
    return '| 词 | 区别 |\n|---|---|\n| （待补充） | （待补充） |';
  }
  let table = '| 词 | 区别 |\n|---|---|\n';
  for (const s of synonyms) {
    const word = (s.word || '').replace(/\|/g, '\\|');
    const diff = (s.diff || '').replace(/\|/g, '\\|');
    table += `| **${word}** | ${diff} |\n`;
  }
  return table;
}

function buildAntonymsList(antonyms) {
  if (!antonyms || antonyms.length === 0) {
    return '- **（待补充）** — （待补充）';
  }
  return antonyms.map(a => `- **${a}**`).join('\n');
}

function buildConfusableList(confusable) {
  if (!confusable || confusable.length === 0) {
    return '- （待补充）';
  }
  return confusable.map(c => `- ${c}`).join('\n');
}

function buildSpecialUsageList(special_usage) {
  if (!special_usage || special_usage.length === 0) {
    return '- （待补充）';
  }
  return special_usage.map(s => `- ${s}`).join('\n');
}

function replaceSection(content, sectionHeader, newContent) {
  // Find the section header and replace content until next section or end
  const headerPattern = `## ${sectionHeader}`;
  const headerIndex = content.indexOf(headerPattern);
  if (headerIndex === -1) return content; // Section doesn't exist

  // Find the start of content (after the header line)
  let contentStart = content.indexOf('\n', headerIndex);
  if (contentStart === -1) contentStart = headerIndex + headerPattern.length;
  else contentStart += 1;

  // Find the next section header (## ) or end of file
  const nextSectionMatch = content.substring(contentStart).match(/\n## /);
  let contentEnd;
  if (nextSectionMatch) {
    contentEnd = contentStart + nextSectionMatch.index;
  } else {
    contentEnd = content.length;
  }

  // Trim trailing newlines from the old content area
  while (contentEnd > contentStart && content[contentEnd - 1] === '\n') {
    contentEnd--;
  }

  // Build replacement with proper spacing
  const replacement = headerPattern + '\n' + newContent.trimEnd();

  return content.substring(0, headerIndex) + replacement + '\n\n' + content.substring(contentEnd + 1);
}

function updateMarkdownFile(filePath, entry) {
  let content = fs.readFileSync(filePath, 'utf-8');
  let modified = false;

  // 📝 详细释义
  if (content.includes('## 📝 详细释义') &&
      (content.includes('待AI补充') || content.includes('待补充'))) {
    const defRu = entry.definition_ru || '';
    const defZh = entry.definition_zh || '';
    const newSection = `**俄语解释：** ${defRu}\n\n**中文解释：** ${defZh}`;
    content = replaceSection(content, '📝 详细释义', newSection);
    modified = true;
  }

  // ✍️ 补充搭配
  if (content.includes('## ✍️ 补充搭配') && content.includes('待补充')) {
    const newSection = buildCollocationsTable(entry.collocations);
    content = replaceSection(content, '✍️ 补充搭配', newSection);
    modified = true;
  }

  // 🎯 近义词辨析
  if (content.includes('## 🎯 近义词辨析') && content.includes('待补充')) {
    const newSection = buildSynonymsTable(entry.synonyms);
    content = replaceSection(content, '🎯 近义词辨析', newSection);
    modified = true;
  }

  // ⚡ 反义词
  if (content.includes('## ⚡ 反义词') && content.includes('待补充')) {
    const newSection = buildAntonymsList(entry.antonyms);
    content = replaceSection(content, '⚡ 反义词', newSection);
    modified = true;
  }

  // ⚠️ 易混淆词
  if (content.includes('## ⚠️ 易混淆词') && content.includes('待补充')) {
    const newSection = buildConfusableList(entry.confusable);
    content = replaceSection(content, '⚠️ 易混淆词', newSection);
    modified = true;
  }

  // 💡 特殊用法
  if (content.includes('## 💡 特殊用法') && content.includes('待补充')) {
    const newSection = buildSpecialUsageList(entry.special_usage);
    content = replaceSection(content, '💡 特殊用法', newSection);
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf-8');
  }
  return modified;
}

// ===== MAIN =====

console.log('=== Step 1: Extract entries from desktop files ===');
const entries = getAllEntries();
console.log(`\nTotal valid entries: ${entries.length}`);

// Deduplicate by word (keep first occurrence)
const seen = new Map();
const deduped = [];
for (const e of entries) {
  const key = e.word.toLowerCase();
  if (!seen.has(key)) {
    seen.set(key, e);
    deduped.push(e);
  }
}
console.log(`After dedup: ${deduped.length} unique words`);

console.log('\n=== Step 2: Import into B2单词表 ===');
let imported = 0;
let skippedNoFile = 0;
let skippedAlreadyDone = 0;
let skippedNoPlaceholder = 0;
const importedWords = [];
const notFoundWords = [];
const alreadyDoneWords = [];

for (const entry of deduped) {
  const mdPath = findMarkdownFile(entry.word);

  if (!mdPath) {
    skippedNoFile++;
    notFoundWords.push(entry.word);
    continue;
  }

  if (!needsUpdate(mdPath)) {
    skippedAlreadyDone++;
    alreadyDoneWords.push(entry.word);
    continue;
  }

  const updated = updateMarkdownFile(mdPath, entry);
  if (updated) {
    imported++;
    importedWords.push(entry.word);
  } else {
    skippedNoPlaceholder++;
  }
}

console.log(`\n=== Results ===`);
console.log(`✅ Imported: ${imported}`);
console.log(`⏭️  Skipped (already done): ${skippedAlreadyDone}`);
console.log(`⏭️  Skipped (no markdown file found): ${skippedNoFile}`);
console.log(`⏭️  Skipped (no placeholder sections): ${skippedNoPlaceholder}`);

if (importedWords.length > 0) {
  console.log(`\nImported words (${importedWords.length}):`);
  // Show first 20
  console.log(importedWords.slice(0, 20).join(', '));
  if (importedWords.length > 20) console.log(`... and ${importedWords.length - 20} more`);
}

if (notFoundWords.length > 0) {
  console.log(`\n⚠️  Words not found in B2单词表 (${notFoundWords.length}):`);
  console.log(notFoundWords.slice(0, 20).join(', '));
  if (notFoundWords.length > 20) console.log(`... and ${notFoundWords.length - 20} more`);
}

// Count remaining after import
function countRemaining() {
  let count = 0;
  const dirs = fs.readdirSync(B2_ROOT, { withFileTypes: true }).filter(d => d.isDirectory());
  for (const dir of dirs) {
    const files = fs.readdirSync(path.join(B2_ROOT, dir.name)).filter(f => f.endsWith('.md'));
    for (const f of files) {
      const content = fs.readFileSync(path.join(B2_ROOT, dir.name, f), 'utf-8');
      if (content.includes('待AI补充')) count++;
    }
  }
  return count;
}
const remaining = countRemaining();
console.log(`\n📊 Remaining files with placeholders: ${remaining}`);
