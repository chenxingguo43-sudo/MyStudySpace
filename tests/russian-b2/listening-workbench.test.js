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

test('caption cues default to the active media item so playback can find later sentences', () => {
  const cues = Workbench.normalizeTimeline(Workbench.parseVtt('WEBVTT\n\n1\n00:00:00.000 --> 00:00:01.608\nПервая фраза.\n\n2\n00:00:01.608 --> 00:00:03.360\nВторая фраза.'));

  assert.equal(cues[0].playlistIndex, 0);
  assert.equal(cues[1].playlistIndex, 0);
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

test('caption cues only enable sentence controls when they match transcript rows', () => {
  assert.equal(Workbench.captionsMatchTranscriptRows({ transcriptSegments: [{ text: 'one' }, { text: 'two' }] }, [{}, {}]), true);
  assert.equal(Workbench.captionsMatchTranscriptRows({ transcriptSegments: [{ text: 'one' }] }, [{}, {}]), false);
});

test('listening workbench preserves untimed rows inside a partial timeline', () => {
  const segments = Workbench.normalizeDataSegments([
    { startTime: 0, endTime: 0, timingStatus: 'unmatched', text: 'Нет точного времени.' },
    { startTime: 8.2, endTime: 11.4, timingStatus: 'aligned', text: 'Надёжная фраза.' }
  ]);

  assert.equal(segments.length, 2);
  assert.equal(segments[0].timed, false);
  assert.equal(segments[1].timed, true);
});

test('only a fully aligned data timeline enables granular listening controls', () => {
  const complete = Workbench.getDataTimelineState({
    transcriptSegments: [
      { startTime: 0, endTime: 2, text: 'Первая фраза.', timingStatus: 'aligned' },
      { startTime: 2, endTime: 4, text: 'Вторая фраза.', timingStatus: 'aligned' }
    ]
  });
  const partial = Workbench.getDataTimelineState({
    transcriptSegments: [
      { startTime: 0, endTime: 2, text: 'Первая фраза.', timingStatus: 'aligned' },
      { startTime: 0, endTime: 0, text: 'Вторая фраза.', timingStatus: 'unmatched' }
    ]
  });

  assert.equal(complete.complete, true);
  assert.equal(partial.complete, false);
});

test('listening workbench validates playlist timelines independently', () => {
  const segments = Workbench.normalizeDataSegments([
    { playlistIndex: 0, startTime: 5, endTime: 12, text: 'Первая новость.' },
    { playlistIndex: 1, startTime: 3, endTime: 9, text: 'Вторая новость.' },
    { playlistIndex: 1, startTime: 10, endTime: 14, text: 'Продолжение.' }
  ]);

  assert.equal(segments.length, 3);
  assert.equal(segments[1].playlistIndex, 1);
});

test('unreliable timelines degrade to a readable full transcript', () => {
  assert.match(workbenchSource, /function getDataTimelineState\(data\)/);
  assert.match(workbenchSource, /sourceTimeline\.complete/);
  assert.match(workbenchSource, /逐句时间轴尚未完整核验/);
  assert.match(workbenchSource, /dataset\.timelineReady = timelineReady/);
  assert.match(workbenchSource, /仅支持整段播放/);
  assert.match(workbenchSource, /清晰文字稿/);
  assert.match(workbenchSource, /未匹配句子不会错误跳转/);
  assert.match(workbenchCss, /data-timeline-ready="true"\]\[data-subtitle-mode="intensive"/);
  assert.match(workbenchCss, /data-timeline-ready="false"\] \.lw-transcript-meta \{ display: none; \}/);
});

test('media exercise playback can seek to its audited starting point without a transcript timeline', () => {
  assert.match(workbenchSource, /var initialTime = Number\(current\.initialTime\)/);
  assert.match(workbenchSource, /audio\.currentTime = Math\.min\(initialTime/);
});

test('playback follows the active sentence inside the transcript without moving the reading page', () => {
  assert.match(workbenchSource, /function scrollTranscriptToActiveRow\(index\)/);
  assert.match(workbenchSource, /var transcript = document\.querySelector\('\.lw-transcript'\)/);
  assert.match(workbenchSource, /transcript\.scrollTo\(\{ top: targetTop, behavior: 'smooth' \}\)/);
  assert.match(workbenchSource, /setActive\(nextActive, \{ scroll: true \}\)/);
  assert.match(workbenchSource, /selectSegment\(nextIndex, true, 0, false\)/);
  assert.match(workbenchSource, /selectSegment\(index, true, settings\.abBeforeSeconds, false\)/);
});

test('transcript scroll target keeps the active row inside a safe viewport', () => {
  const target = Workbench.getTranscriptScrollTarget;
  assert.equal(typeof target, 'function');
  assert.equal(target({ clientHeight: 300, scrollHeight: 1200, scrollTop: 240 }, { top: 72, bottom: 126 }, 24), 189);
  assert.equal(target({ clientHeight: 300, scrollHeight: 1200, scrollTop: 240 }, { top: 8, bottom: 62 }, 24), 125);
  assert.equal(target({ clientHeight: 300, scrollHeight: 1200, scrollTop: 240 }, { top: 262, bottom: 326 }, 24), 384);
  assert.equal(target({ clientHeight: 300, scrollHeight: 420, scrollTop: 200 }, { top: 262, bottom: 326 }, 24), 120);
});

test('mobile listening keeps the transcript as a scrollable playback surface', () => {
  assert.match(workbenchCss, /@media \(max-width: 980px\) \{[\s\S]*?\.lw-transcript \{ max-height: min\(52dvh, 560px\); \}/);
  assert.match(workbenchCss, /@media \(max-width: 700px\) \{[\s\S]*?\.lw-transcript \{ max-height: min\(43dvh, 560px\); \}/);
});
