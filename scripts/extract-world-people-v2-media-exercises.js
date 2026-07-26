// Extract the printed "Аудиозадание" material appended to the TRKI-2 film tracks.
// The Reader deliberately uses this data as a whole-exercise listening mode: it is
// not a replacement for either the five comprehension questions or the feature timeline.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUTPUT_PATH = path.join(ROOT, 'data', 'textbook', 'listening_speaking', 'media-exercises.json');
const SEGMENTS_PATH = path.join(ROOT, 'data', 'listening_speaking_segments.json');
const STRUCTURE_PATH = path.join(ROOT, 'data', 'textbook', 'listening_speaking', 'media-structure-audit.json');

const SOURCES = [
  {
    firstChapter: 15,
    chapterCount: 5,
    sourceChapterIdentifier: 'Тема 1.5 · ТРКИ-2 电影独白（Художественные фильмы — Монологи）',
    file: 'Тема 1.5 -- ТРКИ-2 电影独白（Художественные фильмы — Монологи）.md',
    sourceDescription: '原书清洁 Markdown：Тема 1.5 — ТРКИ-2 电影独白（Художественные фильмы — Монологи）'
  },
  {
    firstChapter: 20,
    chapterCount: 5,
    sourceChapterIdentifier: 'Тема 1.6 · ТРКИ-2 电影对话（Художественные фильмы — Диалоги）',
    file: 'Тема 1.6 -- ТРКИ-2 电影对话（Художественные фильмы — Диалоги）.md',
    sourceDescription: '原书清洁 Markdown：Тема 1.6 — ТРКИ-2 电影对话（Художественные фильмы — Диалоги）'
  }
];
const SOURCE_DIR = path.join(ROOT, '俄语资料库', 'В мире людей 听力口语 Markdown版', '章节');

function parseTask(body) {
  const lines = body.replace(/\r/g, '').trim().split('\n');
  const firstItem = lines.findIndex(line => /^\d+\.\s+/.test(line.trim()));
  if (firstItem < 0) {
    const paragraphs = body.trim().replace(/\r/g, '').split(/\n\s*\n/).map(value => value.trim()).filter(Boolean);
    return {
      prompt: paragraphs.shift() || '',
      items: paragraphs.length ? [{ number: null, text: paragraphs.join('\n\n') }] : []
    };
  }
  const promptLines = (firstItem >= 0 ? lines.slice(0, firstItem) : []).filter(Boolean);
  const itemLines = lines.slice(firstItem);
  const items = [];
  let current = null;

  itemLines.forEach(line => {
    const match = line.trim().match(/^(\d+)\.\s+(.+)$/);
    if (match) {
      current = { number: Number(match[1]), text: match[2].trim() };
      items.push(current);
    } else if (current && line.trim()) {
      current.text += ' ' + line.trim();
    }
  });

  return { prompt: promptLines.join(' ').trim(), items: items };
}

function parseSections(markdown) {
  const headings = Array.from(markdown.matchAll(/^## (.+)$/gm));
  return headings.map((heading, index) => {
    const start = heading.index + heading[0].length;
    const end = index + 1 < headings.length ? headings[index + 1].index : markdown.length;
    const body = markdown.slice(start, end);
    const tasks = Array.from(body.matchAll(/^### Аудиозадание[^\n]*\n([\s\S]*?)(?=^### |^---$|(?![\s\S]))/gm)).map(match => parseTask(match[1]));
    return { title: heading[1].trim(), tasks: tasks };
  });
}

const segments = JSON.parse(fs.readFileSync(SEGMENTS_PATH, 'utf8'));
const structure = JSON.parse(fs.readFileSync(STRUCTURE_PATH, 'utf8')).tracks || {};
const chapters = {};

Object.values(structure).filter(track => track.chapter >= 15 && track.chapter <= 24).forEach(track => {
  chapters[String(track.chapter)] = {
    chapter: track.chapter,
    index: track.chapter,
    title: '',
    prompt: '',
    items: [],
    tasks: [],
    exerciseStartSeconds: track.exerciseStartSeconds,
    sourceStatus: 'unavailable',
    unavailableReason: '原书清洁源中未找到可用的 Аудиозадание 题面。'
  };
});

SOURCES.forEach(source => {
  const sourcePath = path.join(SOURCE_DIR, source.file);
  const sections = parseSections(fs.readFileSync(sourcePath, 'utf8'));
  sections.slice(0, source.chapterCount).forEach((section, sectionIndex) => {
    const chapter = source.firstChapter + sectionIndex;
    const segment = segments[chapter];
    const track = structure[String(Number(segment.mp3))];
    if (!segment || !track || track.chapter !== chapter) {
      throw new Error('Media audit does not match extracted chapter ' + chapter);
    }
    const primary = section.tasks[0];
    if (!primary || !primary.prompt || !primary.items.length) return;
    chapters[String(chapter)] = {
      chapter: chapter,
      index: chapter,
      title: section.title,
      prompt: primary.prompt,
      items: primary.items,
      tasks: section.tasks,
      exerciseStartSeconds: track.exerciseStartSeconds,
      sourceChapterIdentifier: source.sourceChapterIdentifier,
      sourceStatus: 'verified-cleaned-source',
      available: true,
      sourcePages: segment.sourcePages || [],
      sourceFile: '俄语资料库/В мире людей 听力口语 Markdown版/章节/' + source.file,
      sourceDescription: source.sourceDescription
    };
  });
});

const expectedChapters = Object.values(structure).map(track => track.chapter).sort((a, b) => a - b);
const actualChapters = Object.keys(chapters).map(Number).sort((a, b) => a - b);
if (JSON.stringify(actualChapters) !== JSON.stringify(expectedChapters)) {
  throw new Error('Extracted exercise chapters do not match media audit: ' + actualChapters.join(', '));
}

fs.writeFileSync(OUTPUT_PATH, JSON.stringify({
  source: 'world-people-v2-clean-markdown',
  purpose: 'Original Аудиозадание text appended to the TRKI-2 feature-film tracks.',
  chapters: chapters
}, null, 2) + '\n', 'utf8');
console.log('Generated ' + OUTPUT_PATH + ' for ' + actualChapters.length + ' film chapters.');
