const test = require('node:test');
const assert = require('node:assert/strict');
const { buildStaticAudit } = require('../../scripts/audit-world-people-v2-media');

test('full В мире людей v2 media acceptance audit preserves verified mappings and unavailable TRKI-3', () => {
  const report = buildStaticAudit();
  assert.equal(report.summary.chapters, 63);
  assert.equal(report.summary.verified, 30);
  assert.equal(report.summary.playlists, 5);
  assert.equal(report.summary.unavailable, 28);
  assert.equal(report.summary.staticFailed, 0, report.checks.filter(check => !check.passed).map(check => check.detail).join('\n'));
  assert.equal(report.checks.find(check => check.id === 'rejected-mp3-audit').passed, true);
  assert.equal(report.chapters.find(chapter => chapter.chapterFile === 'ch0024.json').mediaExercise.status, 'verified-cleaned-source');
  assert.equal(report.chapters.find(chapter => chapter.chapterFile === 'ch0030.json').mediaStatus, 'playlist');
  assert.equal(report.chapters.find(chapter => chapter.chapterFile === 'ch0035.json').mediaStatus, 'unavailable');
});
