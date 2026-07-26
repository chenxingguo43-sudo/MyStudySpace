const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
require('../../js/russian-b2/listening-workbench');
const Workbench = globalThis.RussianListeningWorkbench;
const workbenchSource = fs.readFileSync('js/russian-b2/listening-workbench.js', 'utf8');
const workbenchCss = fs.readFileSync('css/reader-listening-workbench.css', 'utf8');

test('listening workbench accepts a monotonic sentence timeline', () => {
  const segments = Workbench.normalizeDataSegments([
    { startTime: 0, endTime: 4.2, text: 'Первая фраза.' },
    { startTime: 4.2, endTime: 8.5, text: 'Вторая фраза.' },
    { startTime: 8.4, endTime: 12, text: 'Третья фраза.' }
  ]);

  assert.equal(segments.length, 3);
  assert.equal(segments[1].start, 4.2);
});

test('listening workbench parses normal VTT spacing around the cue arrow', () => {
  const cues = Workbench.parseVtt('WEBVTT\n\n1\n00:00:00.000 --> 00:00:01.608\nПривет!');

  assert.deepEqual(cues, [{ start: 0, end: 1.608, text: 'Привет!' }]);
});

test('listening workbench keeps unknown media durations readable', () => {
  assert.equal(Workbench.formatTime(Infinity), '00:00');
  assert.equal(Workbench.formatTime(Number.NaN), '00:00');
  assert.equal(Workbench.formatTime(22.8), '00:22');
});

test('listening workbench rejects overlapping fallback timestamps', () => {
  const segments = Workbench.normalizeDataSegments([
    { startTime: 0, endTime: 21, text: 'Первая фраза.' },
    { startTime: 17, endTime: 21, text: 'Вторая фраза.' },
    { startTime: 17, endTime: 21, text: 'Третья фраза.' }
  ]);

  assert.deepEqual(segments, []);
});

test('listening workbench rejects repeated tail timestamps', () => {
  const segments = Workbench.normalizeDataSegments([
    { startTime: 0, endTime: 40, text: 'Начало.' },
    { startTime: 40, endTime: 58, text: 'Продолжение.' },
    { startTime: 58, endTime: 61, text: 'Фраза один.' },
    { startTime: 58, endTime: 61, text: 'Фраза два.' }
  ]);

  assert.deepEqual(segments, []);
});

test('unreliable timelines degrade to a readable full transcript', () => {
  assert.match(workbenchSource, /dataset\.timelineReady = timelineReady/);
  assert.match(workbenchSource, /仅支持整段播放/);
  assert.match(workbenchSource, /清晰文字稿/);
  assert.match(workbenchCss, /data-timeline-ready="true"\]\[data-subtitle-mode="intensive"/);
  assert.match(workbenchCss, /data-timeline-ready="false"\] \.lw-transcript-meta \{ display: none; \}/);
});
