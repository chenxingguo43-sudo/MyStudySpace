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
    var line = lines[i];
    var trimmed = line.trim();

    // Skip callout markers
    if (trimmed.match(/^>\s*\[!(?:note|info|warning|tip)\]/)) continue;
    // Skip wiki links and source labels
    if (trimmed.match(/^来源:/) || trimmed.match(/^\*\*来源/)) continue;
    // Remove blockquote prefix
    line = line.replace(/^>\s*/, '');
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

// ─── Get section/topic info from §0 ───
function getField(content, regex) {
  var match = content.match(regex);
  return match ? match[1].trim() : '';
}

// ─── Categorize subsection ───
function isVocabSubsection(title) { return title.match(/1\.1|词汇准备/); }
function isWritingSubsection(title) { return title.match(/[Пп]исьм|сообщение|жалоб|благодарност|эссе|аргументац|претенз|перефразир|рекомендац|резюме|аннотац|заявлен|объявлен|характеристик/) && !title.match(/[Гг]оворен.*[Пп]исьм|[Пп]исьм.*[Гг]оворен/); }
function isSpeakingSubsection(title) { return title.match(/[Гг]оворен|диалог|интенци|дискусси|бесед|обсужден/) && !title.match(/[Гг]оворен.*[Пп]исьм|[Пп]исьм.*[Гг]оворен/); }
function isMixedSubsection(title) { return title.match(/[Гг]оворен.*[Пп]исьм|[Пп]исьм.*[Гг]оворен/); }

// ─── Parse vocabulary prep ───
function parseVocabPrep(content) {
  var prep = [];
  var text = content;

  // "解释词语" items
  var explainPart = text.match(/(?:解释词语|Объясните значение)[\s\S]*?(?=составьте|Передайте|\(|$)/i);
  if (explainPart) {
    var items = extractListItems(explainPart[0]);
    items.forEach(function(item) { prep.push({ word: item, task: '解释并造句' }); });
  }

  // Table with pair matching
  var tables = parseTable(text);
  tables.forEach(function(row) {
    if (row['Word'] || row['#']) {
      prep.push({ word: row['Word'] || row['#'] || '', option: row['Option'] || '', task: '近义词配对' });
    }
  });

  // "Передайте смысл" items
  var rephrasePart = text.match(/Передайте смысл другими словами:?\s*\n([\s\S]*?)(?=\n\s*(?:###|##|$))/i);
  if (rephrasePart) {
    var nums = extractNumberedItems(rephrasePart[1]);
    nums.forEach(function(item) { prep.push({ sentence: item, task: '改写句子' }); });
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

// ─── Parse reading material from §1.2 content ───
function parseReadingMaterial(subContent) {
  var clean = cleanContent(subContent);

  // The reading text is the Russian paragraph before "На основе прочитанного..."
  var taskStart = clean.search(/На основе прочитанного|Прочитайте текст|Задания?:/i);
  if (taskStart < 0) return null;

  var readingPart = clean.slice(0, taskStart).trim();
  // Remove the "Прочитайте текст и выполните задание к нему." instruction
  readingPart = readingPart.replace(/^Прочитайте текст и выполните задание к нему\.?\s*/i, '').trim();

  if (readingPart.length < 50) return null;

  return {
    text: readingPart,
    sourcePage: null,
    note: readingPart.match(/опрос|исследовани|данны|респондент|мониторинг/i) ? '调查类文本' :
          readingPart.match(/объявлен|фирм|ваканси|работ/i) ? '招聘/广告类文本' : '信息类文本'
  };
}

// ─── Parse writing tasks from subsections ───
function parseWritingTasks(subsections) {
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
      var trimmed = block.trim();
      if (!trimmed || trimmed.length < 10) return;

      // Skip pure reading text blocks
      if (trimmed.match(/^(?:Почти|Большинство|В каких|Исследование|В столице|По данным|Согласно)/)) return;

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
        type: taskType,
        title: taskTitle,
        prompt: trimmed,
        requirements: requirements.length > 0 ? requirements : undefined,
        time: timeLimit,
        sourcePage: sourcePage
      });
    });
  });

  return tasks;
}

function splitTaskBlocks(content) {
  // Split by lettered markers а), б), в), г) or key task-starting words
  var parts = content.split(/\n(?=[а-г]\)\s|[a-d]\)\s|(?:\d+\.\s)?(?:Напишите|Составьте|Проведите|Сравните|Согласитесь|Вы\s|Прочитайте|Передайте|На\s+основе))/);
  return parts.filter(function(p) { return p.trim().length > 0; });
}

function detectTaskType(content, sectionTitle) {
  var text = (content + ' ' + sectionTitle).toLowerCase();
  if (text.includes('эссе')) return 'эссе';
  if (text.includes('жалоб') && text.includes('благодарност')) return 'жалоба / благодарность';
  if (text.includes('жалоб') || text.includes('претенз')) return 'жалоба';
  if (text.includes('благодарност')) return 'благодарность';
  if (text.includes('сообщен')) return 'сообщение';
  if (text.includes('рекомендац') || text.includes('рекоменд')) return 'рекомендация';
  if (text.includes('резюме')) return 'резюме';
  if (text.includes('аннотац')) return 'аннотация';
  if (text.includes('заявлен')) return 'заявление';
  if (text.includes('аргумент') || text.includes('опроверг') || text.includes('согласитесь')) return 'аргументация';
  if (text.includes('письм') || text.includes('напишите')) return 'письмо';
  if (text.includes('перефраз') || text.includes('перифраз')) return 'перефразирование';
  return 'задание';
}

function detectTaskTitle(content, sectionTitle, index) {
  var text = (content + ' ' + sectionTitle).toLowerCase();
  if (text.includes('эссе')) return '议论文（эссе）';
  if (text.includes('жалоб') && text.includes('благодарност')) return '投诉信 / 感谢信';
  if (text.includes('жалоб') || text.includes('претенз')) return '投诉信（жалоба）';
  if (text.includes('благодарност')) return '感谢信（благодарность）';
  if (text.includes('сообщен')) return '信息性 сообщение';
  if (text.includes('рекомендац') || text.includes('рекоменд')) return '推荐信（рекомендация）';
  if (text.includes('резюме')) return '简历（резюме）';
  if (text.includes('аннотац')) return '摘要（аннотация）';
  if (text.includes('заявлен')) return '申请书（заявление）';
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
function parseSpeakingTasks(subsections) {
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
        type: 'диалог',
        title: extractDialogueTitle(clean, title),
        prompt: clean,
        replica: replica || undefined,
        sourcePage: detectSourcePage(sub.content)
      });
    }

    if (hasIntents && !hasDialogue) {
      tasks.push({
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

// ─── Topic ordering ───
function getTopicOrder(filename) {
  var match = filename.match(/Тема\s+(\d+)\.(\d+)/);
  if (!match) return null;
  return { section: parseInt(match[1], 10), topic: parseInt(match[2], 10) };
}

// ─── Parse a single file ───
function parseMarkdownFile(filePath) {
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

  // Vocab prep
  var vocabSub = subsections.find(function(s) { return isVocabSubsection(s.title); });
  var vocabularyPrep = vocabSub ? parseVocabPrep(vocabSub.content) : [];

  // Reading material from first writing subsection (usually §1.2)
  var readingMaterial = null;
  var firstWritingSub = subsections.find(function(s) { return isWritingSubsection(s.title) && s.title.match(/1\.2|сообщение/); });
  if (firstWritingSub) readingMaterial = parseReadingMaterial(firstWritingSub.content);

  // Writing tasks
  var writingTasks = parseWritingTasks(subsections);

  // Speaking tasks
  var speakingTasks = parseSpeakingTasks(subsections);

  // Study support
  var studySupport = parseStudySupport(sections);

  return {
    id: '',
    index: 0,
    format: 'writing-speaking',
    title: frontmatter.title || topicName || path.basename(filePath, '.md'),
    section: sectionName,
    sourcePages: frontmatter.source_pages || [],
    status: frontmatter.status || 'generated',
    reviewStatus: frontmatter.needs_review ? 'needs_review' : 'reviewed',
    readingMaterial: readingMaterial,
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
function main() {
  if (!fs.existsSync(SOURCE_DIR)) {
    console.error('Source directory not found:', SOURCE_DIR);
    process.exit(1);
  }

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  var files = fs.readdirSync(SOURCE_DIR)
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
    var filePath = path.join(SOURCE_DIR, file);
    console.log('[' + (index + 1) + '/' + files.length + '] ' + file);

    try {
      var data = parseMarkdownFile(filePath);
      var order = getTopicOrder(file);
      data.id = 'ws-t' + order.section + '.' + order.topic;
      data.index = index;

      var chapterFile = 'ch' + String(index).padStart(4, '0') + '.json';
      fs.writeFileSync(path.join(OUTPUT_DIR, chapterFile), JSON.stringify(data, null, 2), 'utf8');

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
  console.log('Output: ' + OUTPUT_DIR);
}

main();
