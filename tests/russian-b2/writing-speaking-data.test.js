const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const { parseMarkdownFile } = require('../../scripts/convert-writing-speaking');

const root = path.resolve(__dirname, '..', '..');
const sourceDir = path.join(root, '俄语资料库', 'В мире людей 写作口语 Markdown版', '学习单元');
const dataDir = path.join(root, 'data', 'textbook', 'writing_speaking');

function sourceFile(prefix) {
  return path.join(sourceDir, fs.readdirSync(sourceDir).find(name => name.startsWith(prefix)));
}

test('4.1 retains its formal message, essay, and source input as separate records', () => {
  const chapter = parseMarkdownFile(sourceFile('Тема 4.1'), 'ws-t4.1');
  assert.deepEqual(chapter.writingTasks.map(task => task.type), ['сообщение', 'эссе']);
  assert.match(chapter.writingTasks[0].prompt, /информационное сообщение делового характера/i);
  assert.match(chapter.writingTasks[1].prompt, /Самое полезное изобретение человечества/i);
  assert.equal(chapter.inputMaterials.length, 1);
  assert.equal(chapter.inputMaterials[0].sourcePage, 198);
  assert.deepEqual(chapter.writingTasks[0].inputMaterialIds, [chapter.inputMaterials[0].id]);
  assert.ok(chapter.vocabularyPrep.some(item => item.word === 'изобретение'));
  assert.ok(chapter.vocabularyPrep.some(item => item.word === 'легитимность' && item.option === 'д. легкомыслие'));
  assert.ok(chapter.vocabularyPrep.every(item => item.word !== '1'));
  assert.equal(chapter.vocabularyPrep.filter(item => item.task === '改写句子').length, 8);
  assert.ok(chapter.vocabularyPrep.some(item => item.kind === 'verb-family' && /затрачивать/.test(item.word)));
  const invention = chapter.vocabularyPrep.find(item => item.word === 'изобретение');
  assert.match(invention.dictionary.meaning, /发明/);
  assert.ok(invention.dictionary.collocations.length >= 1);
  assert.match(invention.sourceExamples[0].sentence, /изобретения/);
  assert.equal(chapter.studySupport.vocabularyExamples.length, 10);
  assert.ok(chapter.studySupport.cardSuggestions.some(item => item.title === '同义词卡'));
  assert.match(chapter.speakingTasks[0].speakingId, /^ws-t4\.1-s-p200-01$/);
});

test('writing tasks use stable IDs and never absorb oral-only instructions', () => {
  const chapter = parseMarkdownFile(sourceFile('Тема 1.1'), 'ws-t1.1');
  const ids = chapter.writingTasks.map(task => task.taskId);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.every(id => /^ws-t1\.1-w-p\d+-\d{2}$/.test(id)));
  assert.ok(chapter.writingTasks.every(task => !/Позвоните|Расспросите|Проведите беседу/i.test(task.prompt)));
  const gratitude = chapter.writingTasks.find(task => /благодарность/i.test(task.prompt));
  assert.match(gratitude.prompt, /Вы с друзьями ездили/i);
});

test('essay-only sections remain writing tasks while vocabulary drills do not become fake writing tasks', () => {
  const essayChapter = parseMarkdownFile(sourceFile('Тема 3.3'), 'ws-t3.3');
  const vocabularyChapter = parseMarkdownFile(sourceFile('Тема 3.4'), 'ws-t3.4');
  assert.equal(essayChapter.writingTasks.length, 1);
  assert.match(essayChapter.writingTasks[0].prompt, /Жить, чтобы работать/i);
  assert.ok(vocabularyChapter.writingTasks.every(task => !/Составьте пары синонимов/i.test(task.prompt)));
});

test('generated study support uses explicit task bindings', () => {
  const chapter = parseMarkdownFile(sourceFile('Тема 4.1'), 'ws-t4.1');
  const formalTask = chapter.writingTasks.find(task => task.type === 'сообщение');
  const essayTask = chapter.writingTasks.find(task => task.type === 'эссе');
  const formalFramework = chapter.studySupport.outputFrameworks.find(item => /Информационное сообщение/i.test(item.for));
  assert.deepEqual(formalFramework.appliesToTaskIds, [formalTask.taskId]);
  assert.ok(chapter.studySupport.outputFrameworks.every(item => Array.isArray(item.appliesToTaskIds)));
  assert.ok(chapter.studySupport.modelAnswers.every(item => Array.isArray(item.appliesToTaskIds)));
  assert.ok(chapter.studySupport.modelAnswers.some(item => item.appliesToTaskIds.includes(essayTask.taskId)));
});

test('translation caches expose stable Chinese maps for every writing and speaking task', () => {
  const chapter = JSON.parse(fs.readFileSync(path.join(dataDir, 'ch0013.json'), 'utf8'));
  const translation = JSON.parse(fs.readFileSync(path.join(dataDir, `${chapter.id}_zh.json`), 'utf8'));
  assert.equal(translation.taskTranslationContract, 'taskId-v1');
  assert.equal(translation.taskTranslationStatus, 'needs_review');
  assert.ok(chapter.writingTasks.every(task => typeof task.taskId === 'string' && translation.taskTranslationsById[task.taskId].prompt));
  assert.ok(chapter.speakingTasks.every(task => typeof task.speakingId === 'string' && translation.speakingTranslationsById[task.speakingId].prompt));
  assert.match(translation.taskTranslationsById['ws-t4.1-w-p199-01'].prompt, /正式信息通报/);
});

test('generated chapters retain source vocabulary examples even when the original vocab subsection is absent', () => {
  const inventionChapter = JSON.parse(fs.readFileSync(path.join(dataDir, 'ch0013.json'), 'utf8'));
  const equalityChapter = JSON.parse(fs.readFileSync(path.join(dataDir, 'ch0007.json'), 'utf8'));
  assert.ok(inventionChapter.vocabularyPrep.some(item => item.word === 'заколдованный круг' && item.task === '本主题词汇'));
  assert.equal(inventionChapter.studySupport.vocabularyExamples.length, 10);
  assert.ok(equalityChapter.vocabularyPrep.length >= 11);
  assert.ok(equalityChapter.vocabularyPrep.every(item => item.word || item.sentence));
});
