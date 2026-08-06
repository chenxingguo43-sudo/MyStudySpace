/**
 * convert-writing-speaking.js
 * 将《В мире людей 写作口语 Markdown版》→ 19 个 JSON
 * 输出到 data/textbook/writing_speaking/ch0000.json ~ ch0018.json
 *
 * 用法: node scripts/convert-writing-speaking.js
 */

const fs = require('fs');
const path = require('path');

const SOURCE_DIR = path.join(__dirname, '..', '俄语资料库', 'В мире людей 写作口语 Markdown版', '学习单元');
const OUTPUT_DIR = path.join(__dirname, '..', 'data', 'textbook', 'writing_speaking');
const VOCABULARY_INDEX_PATH = path.join(__dirname, '..', 'data', 'vocabulary.json');

var vocabularyReferenceIndex = null;

function normalizeVocabularyKey(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\*|=|[«»"'`]/g, '')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function vocabularyLookupCandidates(value) {
  var normalized = normalizeVocabularyKey(value);
  if (!normalized) return [];
  var candidates = [normalized];
  normalized.split(/[\s/—–-]+/).forEach(function(part) {
    if (part.length >= 3) candidates.push(part);
  });
  return candidates.filter(function(candidate, index) {
    return candidates.indexOf(candidate) === index;
  });
}

function loadVocabularyReferenceIndex() {
  if (vocabularyReferenceIndex) return vocabularyReferenceIndex;
  var entries = [];
  try {
    var data = JSON.parse(fs.readFileSync(VOCABULARY_INDEX_PATH, 'utf8'));
    entries = Array.isArray(data) ? data.filter(function(item) {
      return item && item.word && item.source === 'vocab';
    }) : [];
  } catch (error) {
    entries = [];
  }
  vocabularyReferenceIndex = entries;
  return vocabularyReferenceIndex;
}

function compactVocabularyReference(entry) {
  if (!entry) return null;
  var usableExamples = (entry.examples || []).filter(function(example) {
    return example && example.ru && example.ru.length <= 360 && (!example.zh || example.zh.length <= 280);
  }).slice(0, 2).map(function(example) {
    return { ru: example.ru, zh: example.zh || '' };
  });
  var collocations = (entry.collocations || []).filter(function(item) {
    return item && item.phrase && (!item.ru || item.ru.length <= 260) && (!item.zh || item.zh.length <= 180);
  }).slice(0, 4).map(function(item) {
    return { phrase: item.phrase, ru: item.ru || '', zh: item.zh || '' };
  });
  return {
    word: entry.word,
    meaning: entry.meaning || '',
    type: entry.type || '',
    gender: entry.gender || '',
    aspect: entry.aspect || '',
    pair: entry.pair || '',
    caseGov: entry.case_gov || '',
    grammarTable: entry.grammarTable || '',
    detailZh: (entry.detailZh || '').slice(0, 600),
    collocations: collocations,
    examples: usableExamples,
    sourceKind: 'project_dictionary',
    reviewStatus: 'needs_review'
  };
}

function findVocabularyReference(value) {
  var candidates = vocabularyLookupCandidates(value);
  if (!candidates.length) return null;
  var entries = loadVocabularyReferenceIndex();
  var normalizedValue = normalizeVocabularyKey(value);
  var exact = entries.filter(function(entry) {
    var entryKey = normalizeVocabularyKey(entry.word);
    return entryKey === candidates[0];
  });
  if (exact.length) {
    exact.sort(function(a, b) {
      return ((b.detailZh ? 2 : 0) + (b.collocations || []).length) - ((a.detailZh ? 2 : 0) + (a.collocations || []).length);
    });
    return compactVocabularyReference(exact[0]);
  }

  // A multi-word phrase must have a phrase-level dictionary entry. Matching
  // just one token would turn "микроволновая печь" into the unrelated gloss
  // for "печь" and is worse than showing a review-needed blank.
  if (/\s/.test(normalizedValue)) return null;
  var fuzzy = entries.filter(function(entry) {
    var entryKey = normalizeVocabularyKey(entry.word);
    return candidates.some(function(candidate) {
      if (candidate.length < 6 || entryKey.length < 6) return false;
      return candidate.slice(0, 6) === entryKey.slice(0, 6);
    });
  });
  if (!fuzzy.length) return null;
  fuzzy.sort(function(a, b) {
    return ((b.detailZh ? 2 : 0) + (b.collocations || []).length) - ((a.detailZh ? 2 : 0) + (a.collocations || []).length);
  });
  return compactVocabularyReference(fuzzy[0]);
}

// ─── YAML frontmatter parser ───
function parseFrontmatter(text) {
  var result = {};
  var lines = text.split(/\r?\n/);
  var inArray = false, arrayKey = '';

  for (var i = 0; i < lines.length; i++) {
    var trimmed = lines[i].trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    if (inArray) {
      var arrMatch = trimmed.match(/^-\s*(.+)$/);
      if (arrMatch) {
        if (!result[arrayKey]) result[arrayKey] = [];
        result[arrayKey].push(arrMatch[1].trim());
        continue;
      } else {
        inArray = false; arrayKey = '';
      }
    }

    var kv = trimmed.match(/^(\w+):\s*(.*)$/);
    if (kv) {
      var key = kv[1], value = kv[2].trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (value === 'true') { result[key] = true; continue; }
      if (value === 'false') { result[key] = false; continue; }
      // Handle inline array: [val1, val2, ...]
      if (value.startsWith('[') && value.endsWith(']')) {
        var inner = value.slice(1, -1).trim();
        if (inner) {
          result[key] = inner.split(',').map(function(s) {
            var v = s.trim();
            var num = parseInt(v, 10);
            return isNaN(num) ? v : num;
          });
        } else {
          result[key] = [];
        }
        continue;
      }
      if (value === '') { inArray = true; arrayKey = key; result[key] = []; continue; }
      result[key] = value;
    }
  }

  if (result.source_pages && Array.isArray(result.source_pages)) {
    result.source_pages = result.source_pages.map(function(v) {
      var num = parseInt(v, 10); return isNaN(num) ? v : num;
    });
  }
  return result;
}

function splitFrontmatterAndBody(content) {
  var match = content.match(/^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n([\s\S]*)$/);
  if (!match) return { frontmatter: {}, body: content };
  return { frontmatter: parseFrontmatter(match[1]), body: match[2] };
}

// ─── Strip callout markers and other formatting ───
function stripCalloutMarkers(text) {
  return text.split(/\r?\n/).map(function(line) {
    // Remove callout marker lines entirely
    if (line.match(/^>\s*\[!(?:note|info|warning|tip)\]/)) return '';
    // Remove blockquote prefix from remaining lines
    return line.replace(/^>\s*/, '');
  }).join('\n');
}

// ─── Clean content: remove callout markers, frontmatter, empty header lines ───
function cleanContent(text) {
  var lines = text.split(/\r?\n/);
  var result = [];
  var skipNext = false;

  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].replace(/^>\s*/, '');
    var trimmed = line.trim();

    // Skip callout markers
    if (trimmed.match(/^(?:>\s*)?\[!(?:note|info|warning|tip)\]/)) continue;
    // Skip wiki links and source labels
    if (trimmed.match(/^来源:/) || trimmed.match(/^\*\*来源/)) continue;
    // Remove wiki links
    line = line.replace(/\[\[page_\d+\]\]/g, '');

    if (line.trim() || (i > 0 && result.length > 0 && result[result.length - 1] === '')) {
      result.push(line);
    }
  }

  // Trim leading/trailing blank lines
  while (result.length > 0 && !result[0].trim()) result.shift();
  while (result.length > 0 && !result[result.length - 1].trim()) result.pop();

  return result.join('\n').trim();
}

// ─── Split body into sections by ## headers ───
function splitIntoSections(body) {
  var sections = [];
  var lines = body.split(/\r?\n/);
  var currentTitle = '', currentLines = [], sectionIndex = -1;

  for (var i = 0; i < lines.length; i++) {
    var h2Match = lines[i].match(/^##\s+(.+)$/);
    if (h2Match) {
      if (currentTitle) sections.push({ title: currentTitle, content: currentLines.join('\n'), index: sectionIndex });
      currentTitle = h2Match[1].trim();
      currentLines = [];
      var numMatch = currentTitle.match(/^(\d+)\./);
      sectionIndex = numMatch ? parseInt(numMatch[1], 10) : -1;
    } else {
      currentLines.push(lines[i]);
    }
  }
  if (currentTitle) sections.push({ title: currentTitle, content: currentLines.join('\n'), index: sectionIndex });
  return sections;
}

// ─── Split §1 into subsections by ### headers ───
function splitIntoSubsections(content) {
  var subsections = [];
  var lines = content.split(/\r?\n/);
  var currentTitle = '', currentLines = [];

  for (var i = 0; i < lines.length; i++) {
    var h3Match = lines[i].match(/^###\s+(.+)$/);
    if (h3Match) {
      if (currentTitle) subsections.push({ title: currentTitle, content: currentLines.join('\n') });
      currentTitle = h3Match[1].trim();
      currentLines = [];
    } else {
      currentLines.push(lines[i]);
    }
  }
  if (currentTitle) subsections.push({ title: currentTitle, content: currentLines.join('\n') });
  return subsections;
}

// ─── Extract list items from content ───
function extractListItems(content) {
  var items = [];
  var lines = content.split(/\r?\n/);
  for (var i = 0; i < lines.length; i++) {
    var match = lines[i].match(/^[-*]\s+(.+)$/);
    if (match) {
      var val = match[1].trim();
      if (val && !val.match(/^\[!(?:note|info|warning)\]/)) items.push(val);
    }
  }
  return items;
}

// ─── Extract numbered list items ───
function extractNumberedItems(content) {
  var items = [];
  var lines = content.split(/\r?\n/);
  for (var i = 0; i < lines.length; i++) {
    var match = lines[i].match(/^\d+\.\s+(.+)$/);
    if (match) items.push(match[1].trim());
  }
  return items;
}

// ─── Parse table into array of objects ───
function parseTable(content) {
  var lines = content.split(/\r?\n/);
  var headerIdx = -1, sepIdx = -1;

  for (var i = 0; i < lines.length; i++) {
    if (headerIdx < 0 && lines[i].match(/^\|.*\|$/)) headerIdx = i;
    else if (headerIdx >= 0 && lines[i].match(/^\|[\s\-:|]+\|$/)) { sepIdx = i; break; }
    else if (headerIdx >= 0 && !lines[i].match(/^\|.*\|$/)) { headerIdx = -1; }
  }

  if (headerIdx < 0 || sepIdx < 0) return [];

  var headers = lines[headerIdx].split('|').filter(Boolean).map(function(h) { return h.trim(); });
  var rows = [];

  for (var j = sepIdx + 1; j < lines.length; j++) {
    if (!lines[j].match(/^\|.*\|$/)) break;
    var cells = lines[j].split('|').filter(Boolean).map(function(c) { return c.trim(); });
    if (cells.length === 0) continue;
    var row = {};
    headers.forEach(function(h, idx) { row[h] = cells[idx] || ''; });
    rows.push(row);
  }
  return rows;
}

// Parse every Markdown table in a subsection. Vocabulary preparation often
// contains separate synonym and antonym tables; the old parser stopped after
// the first one and, for Chinese/Russian headers, sometimes kept only "#".
function parseTables(content) {
  var lines = content.split(/\r?\n/);
  var tables = [];
  for (var i = 0; i < lines.length - 1; i++) {
    if (!/^\|.*\|$/.test(lines[i]) || !/^\|[\s\-:|]+\|$/.test(lines[i + 1])) continue;
    var headers = lines[i].split('|').filter(Boolean).map(function(h) { return h.trim(); });
    var rows = [];
    for (var j = i + 2; j < lines.length && /^\|.*\|$/.test(lines[j]); j++) {
      var cells = lines[j].split('|').filter(Boolean).map(function(c) { return c.trim(); });
      var row = {};
      headers.forEach(function(header, index) { row[header] = cells[index] || ''; });
      rows.push(row);
    }
    tables.push(rows);
    i = j - 1;
  }
  return tables;
}

// ─── Get section/topic info from §0 ───
function getField(content, regex) {
  var match = content.match(regex);
  return match ? match[1].trim() : '';
}

// ─── Categorize subsection ───
function isVocabSubsection(title) { return title.match(/1\.1|词汇准备/); }
function isVocabRephraseSubsection(title) { return /意义转述|改写|Перефраз|Передайте смысл/i.test(title || ''); }
function isWritingSubsection(title) {
  return /[Пп]исьм|сообщение|жалоб|благодарност|эссе|аргументац|претенз|перефразир|рекомендац|резюме|аннотац|заявлен|объявлен|характеристик|写作/.test(title) && !isMixedSubsection(title);
}
function isSpeakingSubsection(title) {
  return /[Гг]оворен|диалог|интенци|дискусси|бесед|обсужден|口语/.test(title) && !isMixedSubsection(title);
}
function isMixedSubsection(title) {
  return /(?:[Гг]оворен|口语).*(?:[Пп]исьм|写作|эссе)|(?:[Пп]исьм|写作|эссе).*(?:[Гг]оворен|口语)/.test(title);
}
function isInputMaterialSubsection(title) {
  return /输入材料|核心输入材料|Входной текст|Чтение:|Чтение —/.test(title) && !/обсуждени/i.test(title);
}

// ─── Parse vocabulary prep ───
function parseVocabPrep(content) {
  var prep = [];
  var text = content;

  // "解释词语" items
  var explainPart = text.match(/(?:解释(?:下列)?词语(?:和词组)?|Объясните значение)[\s\S]*?(?=\n#{1,4}\s|составьте|Передайте|$)/i);
  if (explainPart) {
    var items = extractListItems(explainPart[0]);
    items.forEach(function(item) { prep.push({ word: item, task: '解释并造句' }); });
  }

  // All synonym/antonym tables. Prefer the lexical column and never expose
  // the numeric row marker as if it were a word.
  parseTables(text).forEach(function(rows) {
    rows.forEach(function(row) {
      var word = row.Word || row['Слово'] || row['词语'] || '';
      var option = row.Option || row['Вариант'] || row['Antonym option'] || row['Вариант антонима'] || row['选项'] || '';
      if (word && /[А-Яа-яЁё]/.test(word)) {
        prep.push({ word: word, option: option, task: /антоним|反义/i.test(Object.keys(row).join(' ')) ? '反义词配对' : '近义词配对' });
      }
    });
  });

  // "Передайте смысл" items
  var rephrasePart = text.match(/Передайте\s+смысл(?:\s+(?:другими|предложенными)\s+словами)?\s*:?\s*\n([\s\S]*?)(?=\n\s*(?:###|##|$))/i);
  if (rephrasePart) {
    var nums = extractNumberedItems(rephrasePart[1]);
    nums.forEach(function(item) { prep.push({ sentence: item, task: '改写句子' }); });
  }

  // Verb-family tasks are a meaningful part of lexical preparation. Keep the
  // original group together so learners can compare prefixes and aspect pairs.
  var aspectPart = text.match(/(?:Определите видовые пары|Образуйте парные глаголы)[\s\S]*?(?=\n#{1,4}\s|$)/i);
  if (aspectPart) {
    aspectPart[0].split(/\r?\n/).forEach(function(line) {
      var group = line.match(/^\s*[а-яёa-z]\)\s*(.+)$/i);
      if (group && /[А-Яа-яЁё]/.test(group[1])) {
        prep.push({ word: group[1].trim(), task: '动词体与前缀辨析', kind: 'verb-family' });
      }
    });
  }

  // Also extract any remaining bullet items that look like vocabulary words
  if (prep.length === 0) {
    var bullets = extractListItems(text);
    bullets.forEach(function(item) {
      // Check if it looks like a Russian word
      if (item.match(/^[А-Яа-яЁё]/)) {
        prep.push({ word: item, task: '解释并造句' });
      }
    });
  }

  return prep;
}

function parseVocabularyExamples(sections) {
  var examples = [];
  sections.filter(function(section) { return section.index === 10; }).forEach(function(section) {
    cleanContent(section.content).split(/\r?\n/).forEach(function(line) {
      var match = line.match(/^[-*]\s+\*\*(.+?)\*\*\s*[:：]\s*(.+)$/);
      if (!match) return;
      examples.push({
        word: match[1].trim(),
        sentence: match[2].trim(),
        sourceKind: 'source_example',
        reviewStatus: 'needs_review'
      });
    });
  });
  return examples;
}

function parseCardSuggestions(sections) {
  var suggestions = [];
  sections.filter(function(section) { return section.index === 11; }).forEach(function(section) {
    cleanContent(section.content).split(/\r?\n/).forEach(function(line) {
      var match = line.match(/^[-*]\s*([^:：]+)\s*[:：]\s*(.+)$/);
      if (!match) return;
      suggestions.push({
        title: match[1].trim(),
        text: match[2].trim(),
        sourceKind: 'generated_study_support',
        reviewStatus: 'needs_review'
      });
    });
  });
  return suggestions.filter(function(item, index) {
    return suggestions.findIndex(function(candidate) {
      return candidate.title === item.title && candidate.text === item.text;
    }) === index;
  });
}

function vocabularyKeysOverlap(left, right) {
  var leftKeys = vocabularyLookupCandidates(left);
  var rightKeys = vocabularyLookupCandidates(right);
  return leftKeys.some(function(leftKey) {
    return rightKeys.some(function(rightKey) {
      if (leftKey === rightKey) return true;
      if (leftKey.length < 5 || rightKey.length < 5) return false;
      return leftKey.slice(0, Math.max(4, leftKey.length - 2)) === rightKey.slice(0, Math.max(4, rightKey.length - 2));
    });
  });
}

function attachVocabularyStudyData(items, vocabularyExamples) {
  var enriched = items.map(function(item) {
    var lookupValue = item.word || '';
    var relatedExamples = lookupValue ? vocabularyExamples.filter(function(example) {
      return vocabularyKeysOverlap(lookupValue, example.word);
    }) : [];
    return Object.assign({}, item, {
      sourceExamples: relatedExamples,
      dictionary: lookupValue && item.kind !== 'verb-family' ? findVocabularyReference(lookupValue) : null
    });
  });
  vocabularyExamples.forEach(function(example) {
    var alreadyRepresented = enriched.some(function(item) {
      return item.word && vocabularyKeysOverlap(item.word, example.word);
    });
    if (alreadyRepresented) return;
    enriched.push({
      word: example.word,
      task: '本主题词汇',
      sourceExamples: [example],
      dictionary: findVocabularyReference(example.word)
    });
  });
  return enriched;
}

function parseInputMaterials(subsections) {
  var materials = [];
  subsections.forEach(function(sub, index) {
    if (!isInputMaterialSubsection(sub.title || '')) return;
    var text = cleanContent(sub.content);
    if (text.length < 50) return;
    var sourcePage = detectSourcePage(sub.content);
    materials.push({
      id: 'input-' + (sourcePage || 'unknown') + '-' + (index + 1),
      title: sub.title,
      text: text,
      sourcePage: sourcePage || null,
      sourceKind: 'original_book'
    });
  });
  return materials;
}

function hasExplicitWritingInstruction(text) {
  return /Напишите|Написать|Составьте\s+(?:информационное сообщение|письменное сообщение|сообщение|письмо|факс|заявление|объявление|резюме|аннотацию)|Оформите|Тема\s+эссе|эссе\s+(?:на\s+)?(?:одну\s+из\s+)?тем/iu.test(text);
}

function hasWrittenArgumentInstruction(text) {
  return /(?:Согласитесь|Опровергните|Сравните|Согласны ли вы)[\s\S]{0,500}(?:Обоснуйте|аргумент|свою точку зрения|конкретн(?:ые|ыми) пример)/iu.test(text);
}

function isOralOnlyBlock(text) {
  return /Позвоните|Расспросите|Проведите\s+беседу|Обсудите|Побеседуйте|Поговорите|Убедите|Диалог|Монолог/iu.test(text) && !hasExplicitWritingInstruction(text);
}

function buildTaskId(chapterId, sourcePage, ordinal) {
  return chapterId + '-w-p' + (sourcePage || 'unknown') + '-' + String(ordinal).padStart(2, '0');
}

function getRelatedInputMaterialIds(inputMaterials, sourcePage) {
  var candidates = inputMaterials.filter(function(material) {
    return material.sourcePage && sourcePage && material.sourcePage <= sourcePage;
  });
  if (!candidates.length) return [];
  return [candidates[candidates.length - 1].id];
}

// ─── Parse writing tasks from subsections ───
function parseWritingTasks(subsections, chapterId, inputMaterials) {
  var tasks = [];

  subsections.forEach(function(sub) {
    var title = sub.title || '';
    if (!isWritingSubsection(title) && !isMixedSubsection(title)) {
      // Only process if it's explicitly writing or mixed
      if (!title.match(/[Пп]исьм|сообщение|жалоб|благодарност|эссе|аргументац|претенз|задан/)) return;
    }

    var clean = cleanContent(sub.content);
    if (!clean || clean.length < 10) return;

    // Split into individual tasks
    var taskBlocks = splitTaskBlocks(clean);

    taskBlocks.forEach(function(block) {
      var trimmed = block.trim().replace(/^来源:\s*(?:,\s*)?/gim, '').trim();
      if (!trimmed || trimmed.length < 10) return;

      // Skip pure reading text blocks
      if (trimmed.match(/^(?:Почти|Большинство|В каких|Исследование|В столице|По данным|Согласно)/)) return;
      if (/^(?:来源:\s*)?Прочитайте\s+/iu.test(trimmed) && !hasExplicitWritingInstruction(trimmed)) return;
      if (isMixedSubsection(title) && !hasExplicitWritingInstruction(trimmed) && !hasWrittenArgumentInstruction(trimmed)) return;
      if (isOralOnlyBlock(trimmed)) return;
      if (!isWritingSubsection(title) && !hasExplicitWritingInstruction(trimmed) && !hasWrittenArgumentInstruction(trimmed)) return;
      if (!hasExplicitWritingInstruction(trimmed) && !hasWrittenArgumentInstruction(trimmed)) return;

      var taskType = detectTaskType(trimmed, title);
      var taskTitle = detectTaskTitle(trimmed, title, tasks.length);
      var timeLimit = detectTimeLimit(trimmed);
      var sourcePage = detectSourcePage(sub.content);

      // Extract requirements from bullet lists within the block
      var requirements = [];
      var reqMatch = trimmed.match(/При этом:?\s*\n([\s\S]*?)(?=\n\s*(?:Время|$))/);
      if (reqMatch) {
        requirements = extractListItems(reqMatch[1]);
      }

      tasks.push({
        taskId: buildTaskId(chapterId, sourcePage, tasks.length + 1),
        type: taskType,
        title: taskTitle,
        prompt: trimmed,
        requirements: requirements.length > 0 ? requirements : undefined,
        time: timeLimit,
        sourcePage: sourcePage,
        inputMaterialIds: getRelatedInputMaterialIds(inputMaterials, sourcePage),
        sourceKind: 'original_book',
        reviewStatus: 'needs_review'
      });
    });
  });

  return tasks;
}

function splitTaskBlocks(content) {
  var markers = /^(?:[\u0430\u0431\u0432\u0433a-d]\)|#{0,4}\s*Задание\s+\d+:|(?:\d+\.\s)?(?:Напишите|Составьте|Проведите|Сравните|Согласитесь|Прочитайте|Передайте|На\s+основе))/gmi;
  var matches = [], match;
  while ((match = markers.exec(content))) matches.push({ index: match.index, token: match[0] });
  if (!matches.length) return [content];

  var prefix = content.slice(0, matches[0].index).trim();
  var letteredFirst = /^[\u0430\u0431\u0432\u0433a-d]\)/i.test(matches[0].token);
  var parts = [];
  for (var i = 0; i < matches.length; i++) {
    var block = content.slice(matches[i].index, i + 1 < matches.length ? matches[i + 1].index : content.length).trim();
    if (letteredFirst && prefix) block = prefix + '\n' + block;
    else if (i === 0 && prefix) block = prefix + '\n' + block;
    if (block) parts.push(block);
  }
  return parts;
}

function detectTaskType(content, sectionTitle) {
  var contentText = content.toLowerCase();
  var text = (content + ' ' + sectionTitle).toLowerCase();
  if (content.match(/согласитесь|согласны ли вы|опровергните|сравните|приведите свои аргументы|скажите,?\s+в\s+каком\s+городе/i)) return 'аргументация';
  if (contentText.includes('жалоб') || contentText.includes('претенз')) return 'жалоба';
  if (contentText.includes('благодарност')) return 'благодарность';
  if (contentText.includes('эссе')) return 'эссе';
  if (text.includes('эссе')) return 'эссе';
  if (text.includes('сообщен')) return 'сообщение';
  if (text.includes('рекомендац') || text.includes('рекоменд')) return 'рекомендация';
  if (text.includes('резюме')) return 'резюме';
  if (text.includes('аннотац')) return 'аннотация';
  if (text.includes('заявлен')) return 'заявление';
  if (text.includes('объявлен')) return 'объявление';
  if (text.includes('аргумент') || text.includes('опроверг') || text.includes('согласитесь')) return 'аргументация';
  if (text.includes('письм') || text.includes('напишите')) return 'письмо';
  if (text.includes('перефраз') || text.includes('перифраз')) return 'перефразирование';
  return 'задание';
}

function detectTaskTitle(content, sectionTitle, index) {
  var contentText = content.toLowerCase();
  var text = (content + ' ' + sectionTitle).toLowerCase();
  if (content.match(/согласитесь|согласны ли вы|опровергните|сравните|приведите свои аргументы|скажите,?\s+в\s+каком\s+городе/i)) return '论证与反驳（аргументация）';
  if (contentText.includes('жалоб') || contentText.includes('претенз')) return '投诉信（жалоба）';
  if (contentText.includes('благодарност')) return '感谢信（благодарность）';
  if (contentText.includes('эссе')) return '议论文（эссе）';
  if (text.includes('эссе')) return '议论文（эссе）';
  if (text.includes('сообщен')) return '信息性 сообщение';
  if (text.includes('рекомендац') || text.includes('рекоменд')) return '推荐信（рекомендация）';
  if (text.includes('резюме')) return '简历（резюме）';
  if (text.includes('аннотац')) return '摘要（аннотация）';
  if (text.includes('заявлен')) return '申请书（заявление）';
  if (text.includes('объявлен')) return '公告/启事（объявление）';
  if (text.includes('перефраз') || text.includes('перифраз')) return '改写（перефразирование）';
  if (text.includes('аргумент') || text.includes('опроверг')) return '论证与反驳（аргументация）';
  return sectionTitle || ('写作任务 ' + (index + 1));
}

function detectTimeLimit(content) {
  var match = content.match(/(?:Время выполнения|время)[^.]*?(\d+)\s*(?:минут|мин)/i);
  if (match) return match[1] + ' 分钟';
  var match2 = content.match(/(\d+)\s*минут(?:\s*[×x]\s*(\d+))?/i);
  if (match2) return match2[1] + ' 分钟' + (match2[2] ? ' × ' + match2[2] : '');
  return null;
}

function detectSourcePage(subContent) {
  var match = subContent.match(/\[\[page_(\d+)\]\]/);
  return match ? parseInt(match[1], 10) : null;
}

// ─── Parse speaking tasks from subsections ───
function buildSpeakingId(chapterId, sourcePage, ordinal) {
  return chapterId + '-s-p' + (sourcePage || 'unknown') + '-' + String(ordinal).padStart(2, '0');
}

function parseSpeakingTasks(subsections, chapterId) {
  var tasks = [];

  subsections.forEach(function(sub) {
    var title = sub.title || '';
    // Process speaking and mixed subsections
    if (!isSpeakingSubsection(title) && !isMixedSubsection(title)) {
      // Also check for speaking-related headers
      if (!title.match(/[Гг]оворен|диалог|интенци|дискусси|бесед/)) return;
    }

    var clean = cleanContent(sub.content);
    if (!clean || clean.length < 10) return;

    // Look for specific task types within
    var hasDialogue = clean.match(/[Дд]иалог|[Оо]бсуждаете|[Рр]азговариваете|[Рр]асспросите|реплик|согласитесь|не согласитесь/);
    var hasIntents = clean.match(/интенци|определите.*интенци/);
    var hasExpressions = clean.match(/[Вв]ыражения|прочитайте предложенные/);

    if (hasDialogue) {
      // Extract dialogue scenario
      var replica = '';
      var repMatch = clean.match(/[Рр]еплика:?\s*\n\s*[—–-]\s*(.+?)(?:\n|$)/);
      if (repMatch) replica = repMatch[1].trim();

      tasks.push({
        speakingId: buildSpeakingId(chapterId, detectSourcePage(sub.content), tasks.length + 1),
        type: 'диалог',
        title: extractDialogueTitle(clean, title),
        prompt: clean,
        replica: replica || undefined,
        sourcePage: detectSourcePage(sub.content)
      });
    }

    if (hasIntents && !hasDialogue) {
      tasks.push({
        speakingId: buildSpeakingId(chapterId, detectSourcePage(sub.content), tasks.length + 1),
        type: 'интенции',
        title: 'интенции 识别',
        prompt: clean,
        expressions: extractListItems(clean).filter(function(e) { return e.match(/[А-Яа-яЁё]/); }),
        sourcePage: detectSourcePage(sub.content)
      });
    }

    // If nothing specific matched but it's a speaking section
    if (tasks.length === 0) {
      tasks.push({
        speakingId: buildSpeakingId(chapterId, detectSourcePage(sub.content), tasks.length + 1),
        type: 'диалог',
        title: title || '口语任务',
        prompt: clean,
        sourcePage: detectSourcePage(sub.content)
      });
    }
  });

  return tasks;
}

function extractDialogueTitle(content, sectionTitle) {
  if (content.match(/согласитесь|согласи|не согласит|согласие|несогласие/i)) return '对话：同意 / 不同意';
  if (content.match(/отказ|откаж/i)) return '对话：拒绝 / 犹豫';
  if (content.match(/убеди|возрази|возражен|убежден/i)) return '对话：劝说 / 反驳';
  if (content.match(/расспрос|расспросит|позвоните|расспрос/i)) return '对话：详细询问';
  if (content.match(/обсужда|дискусси/i)) return '对话：讨论';
  return sectionTitle || '对话练习';
}

// ─── Parse study support sections (§2-§9) ───
function parseStudySupport(sections) {
  var support = {
    scoringRisks: [],
    expressions: [],
    outputFrameworks: [],
    modelAnswers: {},
    extraPrompts: []
  };

  sections.forEach(function(section) {
    var idx = section.index;
    var content = section.content;
    var clean = cleanContent(content);

    // §5 可复用表达
    if (idx === 5) {
      // Parse by ### categories
      var cats = clean.split(/\n(?=#{1,3}\s)/);
      cats.forEach(function(cat) {
        var lines = cat.split(/\r?\n/);
        var catName = '';
        for (var i = 0; i < lines.length; i++) {
          var headerMatch = lines[i].match(/^#{1,3}\s+(.+)$/);
          if (headerMatch) { catName = headerMatch[1].trim(); continue; }
          var bulletMatch = lines[i].match(/^[-*]\s+(.+)$/);
          if (bulletMatch) {
            var val = bulletMatch[1].trim();
            // Try ru — zh split
            var dashIdx = val.search(/[—–-]\s/);
            if (dashIdx > 0) {
              support.expressions.push({
                ru: val.slice(0, dashIdx).trim(),
                zh: val.slice(dashIdx + 1).replace(/^[—–-]\s*/, '').trim(),
                category: catName || '通用'
              });
            } else {
              support.expressions.push({ ru: val, zh: '', category: catName || '通用' });
            }
          }
        }
      });

      // Fallback: extract bullet items from whole section
      if (support.expressions.length === 0) {
        var bullets = extractListItems(content);
        bullets.forEach(function(b) {
          var dashIdx = b.search(/[—–-]\s/);
          if (dashIdx > 0) {
            support.expressions.push({
              ru: b.slice(0, dashIdx).trim(),
              zh: b.slice(dashIdx + 1).replace(/^[—–-]\s*/, '').trim(),
              category: '通用'
            });
          }
        });
      }
    }

    // §6 输出框架
    if (idx === 6) {
      var frames = clean.split(/\n(?=#{1,3}\s)/);
      frames.forEach(function(frame) {
        var lines = frame.split(/\r?\n/);
        var frameName = '';
        var steps = [];
        for (var i = 0; i < lines.length; i++) {
          var hm = lines[i].match(/^#{1,3}\s+(.+)$/);
          if (hm) { frameName = hm[1].trim(); continue; }
          var nm = lines[i].match(/^\d+\.\s+(.+)$/);
          if (nm) steps.push(nm[1].trim());
        }
        if (steps.length > 0) {
          support.outputFrameworks.push({ for: frameName || '写作框架', steps: steps });
        }
      });
    }

    // §7 范文
    if (idx === 7) {
      var parts = clean.split(/\n(?=#{1,3}\s)/);
      parts.forEach(function(part) {
        var lines = part.split(/\r?\n/);
        var header = lines[0].replace(/^#{1,3}\s*/, '').trim();
        if (!header || header.match(/^[!]/)) return;
        var textLines = [];
        for (var i = 1; i < lines.length; i++) {
          var t = lines[i].trim();
          if (t && !t.startsWith('#') && !t.startsWith('>')) textLines.push(t);
        }
        if (textLines.length > 0) {
          var key = header.includes('сообщен') ? 'сообщение' :
                    header.includes('эссе') ? 'эссе_intro' :
                    header.includes('жалоб') ? 'жалоба' :
                    header.includes('диалог') ? 'диалог' :
                    header.includes('рекомендац') ? 'рекомендация' :
                    header.toLowerCase().replace(/[:\s]+/g, '_').replace(/[^a-zа-яё_]/g, '');
          support.modelAnswers[key] = textLines.join('\n').trim();
        }
      });
    }

    // §8 评分风险
    if (idx === 8) {
      support.scoringRisks = extractListItems(content);
    }

    // §9 追问/变体
    if (idx === 9) {
      var spMatch = clean.match(/###\s*口语追问\s*\n([\s\S]*?)(?=###|$)/);
      var wrMatch = clean.match(/###\s*写作变体\s*\n([\s\S]*?)(?=###|$)/);
      if (spMatch) support.extraPrompts = extractListItems(spMatch[1]);
      if (wrMatch) support.extraPrompts = support.extraPrompts.concat(extractListItems(wrMatch[1]));
      if (support.extraPrompts.length === 0) support.extraPrompts = extractListItems(content);
    }
  });

  return support;
}

function supportMatchesTask(label, task) {
  var text = (label || '').toLowerCase();
  var type = (task.type || '').toLowerCase();
  if (type.indexOf('эссе') >= 0) return /эссе|аргумент|позици|мнение/.test(text);
  if (type.indexOf('жалоб') >= 0) return /жалоб|претенз/.test(text);
  if (type.indexOf('рекомендац') >= 0) return /рекомендац/.test(text);
  if (type.indexOf('сообщен') >= 0) return /сообщен|информацион|факс|делов/.test(text);
  if (type.indexOf('заявлен') >= 0) return /заявлен/.test(text);
  if (type.indexOf('письм') >= 0) return /письм|благодарност/.test(text);
  if (type.indexOf('перефраз') >= 0) return /перефраз/.test(text);
  return false;
}

function addTaskLinksToStudySupport(support, writingTasks) {
  function taskIdsFor(label) {
    return writingTasks.filter(function(task) { return supportMatchesTask(label, task); }).map(function(task) { return task.taskId; });
  }

  support.expressions = support.expressions.map(function(expression) {
    return Object.assign({}, expression, {
      appliesToTaskIds: taskIdsFor((expression.category || '') + ' ' + (expression.ru || '')),
      sourceKind: 'generated_study_support'
    });
  });
  support.outputFrameworks = support.outputFrameworks.map(function(framework) {
    return Object.assign({}, framework, {
      appliesToTaskIds: taskIdsFor(framework.for || ''),
      sourceKind: 'generated_study_support'
    });
  });
  support.scoringRisks = support.scoringRisks.map(function(risk) {
    return {
      text: risk,
      appliesToTaskIds: taskIdsFor(risk),
      sourceKind: 'generated_study_support'
    };
  });
  support.modelAnswers = Object.keys(support.modelAnswers).map(function(key) {
    var text = support.modelAnswers[key];
    return {
      id: 'model-' + key,
      title: key.replace(/_/g, ' '),
      text: text,
      appliesToTaskIds: taskIdsFor(key + ' ' + text.slice(0, 140)),
      sourceKind: 'generated_study_support'
    };
  });
  support.label = '学习辅助 · AI 生成 · 未经人工核对';
  return support;
}

// ─── Topic ordering ───
function getTopicOrder(filename) {
  var match = filename.match(/Тема\s+(\d+)\.(\d+)/);
  if (!match) return null;
  return { section: parseInt(match[1], 10), topic: parseInt(match[2], 10) };
}

// ─── Parse a single file ───
function parseMarkdownFile(filePath, chapterId) {
  var content = fs.readFileSync(filePath, 'utf8');
  var parsed = splitFrontmatterAndBody(content);
  var frontmatter = parsed.frontmatter;
  var sections = splitIntoSections(parsed.body);

  var section0 = sections.find(function(s) { return s.index === 0; });
  var section1 = sections.find(function(s) { return s.index === 1; });

  var sectionName = section0 ? getField(section0.content, /Раздел:\s*(.+)$/m) : '';
  var topicName = section0 ? getField(section0.content, /Тема:\s*(.+)$/m) : '';

  // §1 subsections
  var subsections = section1 ? splitIntoSubsections(section1.content) : [];

  // Vocabulary preparation is often split into a word list and a separate
  // "meaning transfer" subsection. Both belong to the same pre-writing phase.
  var vocabSubsections = subsections.filter(function(s) {
    return isVocabSubsection(s.title) || isVocabRephraseSubsection(s.title);
  });
  var rawVocabularyPrep = [];
  vocabSubsections.forEach(function(subsection) {
    rawVocabularyPrep = rawVocabularyPrep.concat(parseVocabPrep(subsection.content));
  });
  var vocabularyExamples = parseVocabularyExamples(sections);
  var vocabularyPrep = attachVocabularyStudyData(rawVocabularyPrep, vocabularyExamples);
  var cardSuggestions = parseCardSuggestions(sections);

  var inputMaterials = parseInputMaterials(subsections);

  // Writing tasks
  var writingTasks = parseWritingTasks(subsections, chapterId, inputMaterials);

  // Speaking tasks
  var speakingTasks = parseSpeakingTasks(subsections, chapterId);

  // Study support
  var studySupport = addTaskLinksToStudySupport(parseStudySupport(sections), writingTasks);
  studySupport.vocabularyExamples = vocabularyExamples;
  studySupport.cardSuggestions = cardSuggestions;

  return {
    id: '',
    index: 0,
    format: 'writing-speaking',
    title: frontmatter.title || topicName || path.basename(filePath, '.md'),
    section: sectionName,
    sourcePages: frontmatter.source_pages || [],
    status: frontmatter.status || 'generated',
    reviewStatus: frontmatter.needs_review ? 'needs_review' : 'reviewed',
    readingMaterial: inputMaterials[0] || null,
    inputMaterials: inputMaterials,
    vocabularyPrep: vocabularyPrep,
    writingTasks: writingTasks,
    speakingTasks: speakingTasks,
    grammarTest: {
      hasAnswers: false,
      note: '语法测试页未录入'
    },
    studySupport: studySupport,
    sourceLabel: '原书内容 · OCR 来源 · 未经人工核对'
  };
}

// ─── Main ───
function buildWritingSpeaking(sourceDir, outputDir) {
  var sourcePath = sourceDir || SOURCE_DIR;
  var outputPath = outputDir || OUTPUT_DIR;
  if (!fs.existsSync(sourcePath)) throw new Error('Source directory not found: ' + sourcePath);
  if (!fs.existsSync(outputPath)) fs.mkdirSync(outputPath, { recursive: true });

  var files = fs.readdirSync(sourcePath)
    .filter(function(f) { return f.endsWith('.md'); })
    .filter(function(f) { return !f.includes('Методический комментарий') && !f.includes('附录'); });

  files.sort(function(a, b) {
    var oA = getTopicOrder(a), oB = getTopicOrder(b);
    if (!oA || !oB) return a.localeCompare(b);
    if (oA.section !== oB.section) return oA.section - oB.section;
    return oA.topic - oB.topic;
  });

  console.log('Found ' + files.length + ' topic files\n');

  var results = [];
  files.forEach(function(file, index) {
    var filePath = path.join(sourcePath, file);
    console.log('[' + (index + 1) + '/' + files.length + '] ' + file);

    try {
      var order = getTopicOrder(file);
      var chapterId = 'ws-t' + order.section + '.' + order.topic;
      var data = parseMarkdownFile(filePath, chapterId);
      data.id = chapterId;
      data.index = index;

      var chapterFile = 'ch' + String(index).padStart(4, '0') + '.json';
      fs.writeFileSync(path.join(outputPath, chapterFile), JSON.stringify(data, null, 2), 'utf8');

      console.log('  → ' + chapterFile + '  section=' + data.section);
      console.log('    vocabPrep=' + data.vocabularyPrep.length +
        '  writingTasks=' + data.writingTasks.length +
        '  speakingTasks=' + data.speakingTasks.length +
        '  expressions=' + data.studySupport.expressions.length +
        '  frameworks=' + data.studySupport.outputFrameworks.length +
        '  risks=' + data.studySupport.scoringRisks.length +
        '  prompts=' + data.studySupport.extraPrompts.length +
        '  modelAnswers=' + Object.keys(data.studySupport.modelAnswers).length);

      // Show first writing task prompt preview
      if (data.writingTasks.length > 0) {
        var preview = data.writingTasks[0].prompt.slice(0, 80).replace(/\n/g, ' ');
        console.log('    task[0]: ' + preview + (data.writingTasks[0].prompt.length > 80 ? '...' : ''));
      }

      results.push({ success: true, file: file });
    } catch (err) {
      console.error('  ✗ ERROR: ' + err.message);
      console.error(err.stack);
      results.push({ success: false, file: file, error: err.message });
    }
  });

  var succeeded = results.filter(function(r) { return r.success; }).length;
  var failed = results.filter(function(r) { return !r.success; }).length;
  console.log('\n═══════════════════════════════');
  console.log('Done: ' + succeeded + ' success, ' + failed + ' failed');
  console.log('Output: ' + outputPath);
  return results;
}

if (require.main === module) buildWritingSpeaking();

module.exports = {
  buildWritingSpeaking: buildWritingSpeaking,
  parseMarkdownFile: parseMarkdownFile,
  parseWritingTasks: parseWritingTasks,
  splitTaskBlocks: splitTaskBlocks
};
