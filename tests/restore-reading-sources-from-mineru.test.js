'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { sectionFor, extractArticle } = require('../scripts/restore-reading-sources-from-mineru.js');

const source = String.raw`D:\下载\MinerU\文件转换\В мире людей 阅读口语.pdf-4d908977-e819-4950-8fce-f552d6171ca4\MinerU_markdown_202608191105372_6e8347d7.md`;

test('restored source extraction keeps only article prose before the multiple-choice questions', () => {
  const markdown = fs.readFileSync(source, 'utf8');
  const museum = extractArticle(sectionFor(markdown, '1.5.1'), '1.5.1');
  const diamond = extractArticle(sectionFor(markdown, '1.5.2'), '1.5.2');
  assert.ok(museum.length >= 8);
  assert.match(museum[0], /ДЕТИЩЕ ИВАНА ЦВЕТАЕВА/);
  assert.ok(museum.some((item) => item.includes('Сто лет назад музей именовался')));
  assert.ok(diamond.some((item) => item.includes('частью контрибуции')));
  assert.ok(diamond.some((item) => item.includes('Хосреву-мирзе')));
  assert.ok(!diamond.some((item) => /^1\.\s/.test(item)));
  assert.ok(!diamond.some((item) => item.includes('а) гибели российского посла')));
});

test('interleaved literary questions do not remove the continuation of the article', () => {
  const markdown = fs.readFileSync(source, 'utf8');
  const meeting = extractArticle(sectionFor(markdown, '3.2.1'), '3.2.1');
  const laurel = extractArticle(sectionFor(markdown, '3.4.2'), '3.4.2');
  assert.ok(meeting.some((item) => item.includes('На днях она уедет учиться')));
  assert.ok(laurel.some((item) => item.includes('Его диссертацией были довольны все')));
});

test('formal-letter extraction keeps both Russian letters and drops the mixed Chinese layer', () => {
  const markdown = fs.readFileSync(source, 'utf8');
  const letters = extractArticle(sectionFor(markdown, '2.4.2'), '2.4.2');
  assert.ok(letters.some((item) => item.includes('Гуманитарные науки')));
  assert.ok(letters.some((item) => item.includes('подтвердить Ваш приезд')));
  assert.ok(!letters.some((item) => /[\u3400-\u9fff]/u.test(item)));
});

test('Reader does not create a blank translation line for restored OCR source', () => {
  const reader = fs.readFileSync(require('node:path').join(__dirname, '..', 'reader.html'), 'utf8');
  assert.match(reader, /var translationHtml = trans\[i\] \? '<p class="cn-text">'/);
});
