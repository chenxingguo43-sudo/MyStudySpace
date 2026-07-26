#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { spawn } = require('node:child_process');

const ROOT = path.join(__dirname, '..');
const BOOK_DIR = path.join(ROOT, 'data', 'textbook', 'listening_speaking');
const MOCK_DIR = path.join(ROOT, 'data', 'textbook', 'listening_speaking_mock');
const REPORT_PATH = path.join(BOOK_DIR, 'final-media-acceptance-report.json');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function chapterName(index) {
  return 'ch' + String(index).padStart(4, '0');
}

function addCheck(checks, id, passed, detail) {
  checks.push({ id, passed: Boolean(passed), detail });
}

function expectedMedia(index) {
  if (index <= 29) return { files: [String(index + 1).padStart(2, '0') + '.mp4'], playlist: false };
  if (index <= 34) {
    const first = 31 + (index - 30) * 5;
    return { files: Array.from({ length: 5 }, (_, offset) => String(first + offset).padStart(2, '0') + '.mp4'), playlist: true };
  }
  return null;
}

function mediaUrl(base, file) {
  return '/data/textbook/' + base + '/' + String(file || '').replace(/^\/+/, '');
}

function auditChapter(index, context) {
  const name = chapterName(index);
  const chapter = readJson(path.join(BOOK_DIR, name + '.json'));
  const errors = [];
  const media = chapter.media || {};
  const expected = expectedMedia(index);
  const segments = Array.isArray(chapter.transcriptSegments) ? chapter.transcriptSegments : [];
  const timedSegments = segments.filter(segment => Number(segment.endTime) > Number(segment.startTime));
  const untimedSegments = segments.filter(segment => !timedSegments.includes(segment));
  const files = [];

  function fail(message) { errors.push(message); }

  if (expected) {
    if (media.status !== 'verified') fail('媒体状态不是 verified');
    if (media.kind !== (index >= 15 && index <= 24 ? 'video' : 'audio')) fail('媒体类型与章节类别不一致');
    if (expected.playlist) {
      if (!Array.isArray(media.playlist) || media.playlist.length !== 5) fail('五段新闻缺少完整 playlist');
      const playlistFiles = (media.playlist || []).map(item => path.basename(item.file || ''));
      if (JSON.stringify(playlistFiles) !== JSON.stringify(expected.files)) fail('playlist 文件映射不正确');
      (media.playlist || []).forEach(item => files.push(item.file));
    } else {
      if (path.basename(media.file || '') !== expected.files[0]) fail('媒体文件映射不正确');
      files.push(media.file);
    }
    files.forEach(file => {
      if (!file || !fs.existsSync(path.join(BOOK_DIR, file))) fail('媒体文件缺失：' + String(file));
    });
  } else {
    if (media.status !== 'source-mismatch' || media.provenance !== 'unavailable') fail('ТРКИ-3 章节必须保持 unavailable/source-mismatch');
    if (media.file || (media.playlist && media.playlist.length)) fail('ТРКИ-3 章节不应绑定可播放媒体');
    if (!/^media\/\d{2}\.mp3$/.test(media.rejectedFile || '')) fail('缺少被拒绝旧 mp3 的可追溯记录');
  }

  const lastByPlaylist = new Map();
  segments.forEach((segment, segmentIndex) => {
    const start = Number(segment.startTime);
    const end = Number(segment.endTime);
    const timed = Number.isFinite(start) && Number.isFinite(end) && end > start;
    if (!timed) {
      if (start !== 0 || end !== 0) fail('无可靠时间轴句含有非零时间：segment ' + segmentIndex);
      return;
    }
    const playlistIndex = Number(segment.playlistIndex) || 0;
    if (expected && expected.playlist && (playlistIndex < 0 || playlistIndex >= 5)) fail('playlistIndex 越界：segment ' + segmentIndex);
    if (!expected || !expected.playlist) {
      if (playlistIndex !== 0) fail('非 playlist 章节含有非零 playlistIndex：segment ' + segmentIndex);
    }
    const previous = lastByPlaylist.get(playlistIndex);
    if (previous && (start < previous.start || end < previous.end)) fail('时间轴不单调：segment ' + segmentIndex);
    lastByPlaylist.set(playlistIndex, { start, end });
  });

  if (index >= 15 && index <= 24) {
    const track = context.structure[String(index + 1)];
    const exercise = chapter.mediaExercise;
    if (!track) fail('电影结构审计缺少对应轨道');
    if (!chapter.mediaStructure || !track || chapter.mediaStructure.featureEndSeconds !== track.featureEndSeconds || chapter.mediaStructure.exerciseStartSeconds !== track.exerciseStartSeconds) fail('mediaStructure 与结构审计不一致');
    if (!exercise || exercise.sourceStatus !== 'verified-cleaned-source' || exercise.exerciseStartSeconds !== track.exerciseStartSeconds) fail('mediaExercise 与结构审计不一致');
    timedSegments.forEach((segment, segmentIndex) => {
      if (track && Number(segment.endTime) > Number(track.featureEndSeconds)) fail('正片时间轴越过 featureEndSeconds：segment ' + segmentIndex);
    });
    const exerciseTimed = [].concat(exercise && exercise.segments || [], exercise && exercise.timelineSegments || []).filter(item => Number(item.endTime) > Number(item.startTime));
    exerciseTimed.forEach((segment, segmentIndex) => {
      if (track && Number(segment.startTime) < Number(track.exerciseStartSeconds)) fail('片尾练习时间早于 exerciseStartSeconds：segment ' + segmentIndex);
    });
  } else if (chapter.mediaStructure || chapter.mediaExercise) {
    fail('非电影章节不应包含电影结构或片尾听辨数据');
  }

  return {
    chapterId: chapter.id,
    chapterFile: name + '.json',
    title: chapter.title,
    mediaStatus: expected ? (expected.playlist ? 'playlist' : 'verified') : 'unavailable',
    mediaKind: media.kind || null,
    mediaFiles: expected ? files : [],
    jumpableSegments: timedSegments.length,
    totalTranscriptSegments: segments.length,
    untimedSegments: untimedSegments.length,
    mediaExercise: index >= 15 && index <= 24 ? {
      status: chapter.mediaExercise && chapter.mediaExercise.sourceStatus || 'unavailable',
      exerciseStartSeconds: chapter.mediaExercise && chapter.mediaExercise.exerciseStartSeconds || null,
      timedSegments: 0,
      playback: 'whole-program-only'
    } : null,
    knownMissingReason: expected ? null : media.reason || 'ТРКИ-3 暂无已核验的配套媒体',
    staticRegression: errors.length ? 'failed' : 'passed',
    browserRegression: 'not-run',
    errors
  };
}

function buildStaticAudit() {
  const structureAudit = readJson(path.join(BOOK_DIR, 'media-structure-audit.json'));
  const rejectedAudit = readJson(path.join(BOOK_DIR, 'media-audit.json'));
  const checks = [];
  const context = { structure: structureAudit.tracks || {} };
  const chapters = Array.from({ length: 63 }, (_, index) => auditChapter(index, context));
  addCheck(checks, 'rejected-mp3-audit', rejectedAudit.status === 'rejected' && /media\/01\.mp3-media\/78\.mp3/.test(rejectedAudit.fileRange || '') && Array.isArray(rejectedAudit.evidence) && rejectedAudit.evidence.length > 0, '旧错误 mp3 集合保持 rejected，并带有来源不匹配证据。');
  addCheck(checks, 'film-structure-audit', Object.keys(context.structure).length === 10 && Object.values(context.structure).every(track => Number(track.exerciseStartSeconds) >= Number(track.featureEndSeconds)), '10 个电影轨道均有 feature/end 与 exercise/start 边界。');
  chapters.forEach(chapter => addCheck(checks, 'chapter-' + chapter.chapterFile, chapter.staticRegression === 'passed', chapter.errors.length ? chapter.errors.join('；') : '媒体、时间轴和状态静态检查通过。'));
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    scope: 'В мире людей. Выпуск 2 · 听力口语模块基础媒体与状态验收',
    summary: {
      chapters: chapters.length,
      verified: chapters.filter(chapter => chapter.mediaStatus === 'verified').length,
      playlists: chapters.filter(chapter => chapter.mediaStatus === 'playlist').length,
      unavailable: chapters.filter(chapter => chapter.mediaStatus === 'unavailable').length,
      staticPassed: chapters.filter(chapter => chapter.staticRegression === 'passed').length,
      staticFailed: chapters.filter(chapter => chapter.staticRegression === 'failed').length
    },
    checks,
    chapters,
    serverDelivery: { status: 'not-run', checkedUrls: [], errors: [] },
    browserRegression: { status: 'not-run', desktop: [], mobile: [] }
  };
}

function request(port, urlPath, headers) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, path: urlPath, headers: headers || {} }, response => {
      response.resume();
      response.on('end', () => resolve({ statusCode: response.statusCode, contentType: response.headers['content-type'], acceptRanges: response.headers['accept-ranges'] }));
    });
    req.on('error', reject);
    req.end();
  });
}

function startServer(port) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['server.js'], { cwd: ROOT, env: Object.assign({}, process.env, { PORT: String(port) }), stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    const timeout = setTimeout(() => { child.kill(); reject(new Error('媒体验收服务器启动超时')); }, 5000);
    child.stdout.on('data', chunk => {
      output += String(chunk);
      if (output.includes('Server running')) { clearTimeout(timeout); resolve(child); }
    });
    child.stderr.on('data', chunk => { output += String(chunk); });
    child.on('exit', code => { if (!output.includes('Server running')) { clearTimeout(timeout); reject(new Error('媒体验收服务器未启动：' + code + ' ' + output)); } });
  });
}

async function verifyServerDelivery(report, port) {
  const urls = [];
  report.chapters.forEach(chapter => chapter.mediaFiles.forEach(file => urls.push(mediaUrl('listening_speaking', file))));
  const mock = readJson(path.join(MOCK_DIR, 'ch0000.json'));
  (mock.media.playlist || []).forEach(item => urls.push(mediaUrl('listening_speaking_mock', item.file)));
  const server = await startServer(port);
  try {
    for (const urlPath of urls) {
      const response = await request(port, urlPath, { Range: 'bytes=0-0' });
      report.serverDelivery.checkedUrls.push({ url: urlPath, statusCode: response.statusCode, contentType: response.contentType, acceptRanges: response.acceptRanges });
      if (response.statusCode !== 206 || response.contentType !== 'video/mp4' || response.acceptRanges !== 'bytes') report.serverDelivery.errors.push(urlPath + ' 返回了不正确的 Range/MIME 响应');
    }
    const fullResponse = await request(port, urls[0]);
    if (fullResponse.statusCode !== 200 || fullResponse.contentType !== 'video/mp4') report.serverDelivery.errors.push(urls[0] + ' 未能返回完整 MP4 响应');
  } finally {
    server.kill();
  }
  report.serverDelivery.status = report.serverDelivery.errors.length ? 'failed' : 'passed';
}

function applyBrowserResults(report, desktopIds, mobileIds) {
  report.browserRegression = {
    status: desktopIds.length || mobileIds.length ? 'recorded-manual-browser-validation' : 'not-run',
    desktop: desktopIds.map(id => ({ id, status: 'passed' })),
    mobile: mobileIds.map(id => ({ id, status: 'passed' }))
  };
  const checked = new Set(desktopIds.concat(mobileIds).filter(id => /^ch\d{4}$/.test(id)));
  report.chapters.forEach(chapter => { if (checked.has(chapter.chapterFile.slice(0, -5))) chapter.browserRegression = 'passed'; });
}

async function runCli() {
  const report = buildStaticAudit();
  const desktop = (process.argv.find(arg => arg.startsWith('--browser=')) || '').slice('--browser='.length).split(',').filter(Boolean);
  const mobile = (process.argv.find(arg => arg.startsWith('--mobile=')) || '').slice('--mobile='.length).split(',').filter(Boolean);
  if (!process.argv.includes('--skip-server')) await verifyServerDelivery(report, Number(process.env.MEDIA_ACCEPTANCE_PORT) || 3187);
  applyBrowserResults(report, desktop, mobile);
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2) + '\n', 'utf8');
  const failed = report.checks.filter(check => !check.passed).length + (report.serverDelivery.status === 'failed' ? 1 : 0);
  console.log('Wrote ' + path.relative(ROOT, REPORT_PATH) + ' (' + report.summary.staticPassed + '/' + report.summary.chapters + ' static chapters passed; server ' + report.serverDelivery.status + ').');
  if (failed) process.exitCode = 1;
}

if (require.main === module) runCli().catch(error => { console.error(error.stack || error.message); process.exitCode = 1; });

module.exports = { buildStaticAudit, verifyServerDelivery };
