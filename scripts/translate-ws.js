/* eslint-disable */
// translate-ws.js — batch translate writing-speaking chapter data via AgentChat
// Usage: node scripts/translate-ws.js [startIdx] [endIdx]

var fs = require('fs');
var path = require('path');
var childProcess = require('child_process');

var BASE = path.resolve(__dirname, '..', 'data', 'textbook', 'writing_speaking');
var AGENTCHAT = path.resolve(process.env.HOME || process.env.USERPROFILE, '.claude', 'skills', 'agentchat', 'AgentChat-OneWeb', 'index.js');
var TIMEOUT = 600000; // 10 min per chapter

var startIdx = parseInt(process.argv[2], 10) || 1;
var endIdx = parseInt(process.argv[3], 10) || 18;

function sleep(ms) { return new Promise(function(r) { setTimeout(r, ms); }); }

function runAgentChat(prompt) {
  return new Promise(function(resolve, reject) {
    var child = childProcess.spawn('node', [AGENTCHAT, prompt], {
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: TIMEOUT,
    });
    var stdout = '', stderr = '';
    child.stdout.on('data', function(c) { stdout += c; });
    child.stderr.on('data', function(c) { stderr += c; });
    child.on('error', reject);
    child.on('close', function(code) {
      resolve({ stdout: stdout.trim(), stderr: stderr, code: code });
    });
  });
}

function buildTranslateTemplate(d) {
  var zh = {
    _comment: d.id + ' 中文翻译缓存',
    writingTasks: [],
    speakingTasks: [],
    studySupport: { modelAnswers: {}, outputFrameworks: [], scoringRisks: [] }
  };
  (d.writingTasks || []).forEach(function(t, i) { zh.writingTasks[i] = { prompt: 'TBD' }; });
  (d.speakingTasks || []).forEach(function(s, i) { zh.speakingTasks[i] = { prompt: 'TBD' }; });
  var models = (d.studySupport && d.studySupport.modelAnswers) || {};
  Object.keys(models).forEach(function(k) { zh.studySupport.modelAnswers[k] = 'TBD'; });
  var fws = (d.studySupport && d.studySupport.outputFrameworks) || [];
  fws.forEach(function(f, i) {
    zh.studySupport.outputFrameworks[i] = { for: 'TBD', steps: [] };
    (f.steps || []).forEach(function() { zh.studySupport.outputFrameworks[i].steps.push('TBD'); });
  });
  var risks = (d.studySupport && d.studySupport.scoringRisks) || [];
  risks.forEach(function(r, i) { zh.studySupport.scoringRisks[i] = 'TBD'; });
  return zh;
}

function buildBatchPrompt(d, zh) {
  var sections = [];

  // Writing task prompts
  (d.writingTasks || []).forEach(function(t, i) {
    if (!t.prompt) return;
    if (zh.writingTasks[i] && zh.writingTasks[i].prompt !== 'TBD') return;
    sections.push('[WT' + i + ']\n' + t.prompt);
  });

  // Speaking task prompts
  (d.speakingTasks || []).forEach(function(s, i) {
    if (!s.prompt) return;
    if (zh.speakingTasks[i] && zh.speakingTasks[i].prompt !== 'TBD') return;
    sections.push('[ST' + i + ']\n' + s.prompt.slice(0, 1000));
  });

  // Model answers
  var models = (d.studySupport && d.studySupport.modelAnswers) || {};
  Object.keys(models).forEach(function(k) {
    if (zh.studySupport.modelAnswers[k] !== 'TBD') return;
    sections.push('[MODEL:' + k + ']\n' + models[k].slice(0, 1500));
  });

  // Frameworks
  var fws = (d.studySupport && d.studySupport.outputFrameworks) || [];
  fws.forEach(function(f, i) {
    if (zh.studySupport.outputFrameworks[i] && zh.studySupport.outputFrameworks[i].for !== 'TBD') return;
    sections.push('[FW' + i + ']\n标题: ' + f.for);
    (f.steps || []).forEach(function(s, si) {
      sections.push('[FW' + i + '-STEP' + si + ']\n' + s);
    });
  });

  // Scoring risks
  var risks = (d.studySupport && d.studySupport.scoringRisks) || [];
  risks.forEach(function(r, i) {
    if (zh.studySupport.scoringRisks[i] !== 'TBD') return;
    sections.push('[RISK' + i + ']\n' + r);
  });

  if (!sections.length) return null;

  var header = 'Ты — профессиональный переводчик русского языка на китайский. Переведи следующие учебные материалы (русский → китайский). Сохраняй разметку [TAG]. Только перевод, без пояснений.\n\n';
  return header + sections.join('\n---\n');
}

function parseResponse(text, zh) {
  function extract(startTag, endTags) {
    var si = text.indexOf(startTag);
    if (si < 0) return '';
    si += startTag.length;
    var ei = text.length;
    for (var i = 0; i < endTags.length; i++) {
      var x = text.indexOf(endTags[i], si);
      if (x >= 0 && x < ei) ei = x;
    }
    return text.slice(si, ei).trim().replace(/\s+/g, ' ');
  }

  var allTags = [];
  for (var i = 0; i < 20; i++) { allTags.push('[WT' + i + ']'); allTags.push('[ST' + i + ']'); allTags.push('[FW' + i + ']'); allTags.push('[FW' + i + '-STEP'); allTags.push('[RISK' + i + ']'); }
  allTags.push('[MODEL:', '[MODEL:'); // partial match

  // Writing tasks
  for (var i = 0; i < zh.writingTasks.length; i++) {
    var t = extract('[WT' + i + ']', allTags);
    if (t) zh.writingTasks[i].prompt = t;
  }

  // Speaking tasks
  for (var i = 0; i < zh.speakingTasks.length; i++) {
    var t = extract('[ST' + i + ']', allTags);
    if (t) zh.speakingTasks[i].prompt = t;
  }

  // Model answers (use special handling since keys can contain special chars)
  var mStart = text.indexOf('[MODEL:');
  if (mStart >= 0) {
    var fwIdx = text.indexOf('[FW', mStart);
    if (fwIdx < 0) fwIdx = text.indexOf('[RISK', mStart);
    var mBlock = text.slice(mStart, fwIdx > 0 ? fwIdx : undefined);
    var modelKeys = Object.keys(zh.studySupport.modelAnswers);
    // Try to split by [MODEL: prefix
    modelKeys.forEach(function(k) {
      var escapedKey = k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      var re = new RegExp('\\[MODEL:' + escapedKey + '\\]');
      var mi = mBlock.search(re);
      if (mi >= 0) {
        var valStart = mi + ('[MODEL:' + k + ']').length;
        // Find next [MODEL: or end
        var nextM = mBlock.indexOf('[MODEL:', valStart);
        var val = mBlock.slice(valStart, nextM >= 0 ? nextM : undefined).trim().replace(/\s+/g, ' ');
        zh.studySupport.modelAnswers[k] = val;
      }
    });
  }

  // Frameworks
  for (var fi = 0; fi < zh.studySupport.outputFrameworks.length; fi++) {
    var ft = extract('[FW' + fi + ']', allTags);
    if (ft) {
      ft = ft.replace(/^标题[：:]\s*/, '').replace(/^[：:]\s*/, '');
      zh.studySupport.outputFrameworks[fi].for = ft;
    }
    for (var si = 0; si < zh.studySupport.outputFrameworks[fi].steps.length; si++) {
      var st = extract('[FW' + fi + '-STEP' + si + ']', allTags);
      if (st) zh.studySupport.outputFrameworks[fi].steps[si] = st;
    }
  }

  // Risks
  for (var ri = 0; ri < zh.studySupport.scoringRisks.length; ri++) {
    var r = extract('[RISK' + ri + ']', allTags);
    if (r) zh.studySupport.scoringRisks[ri] = r;
  }
}

async function translateChapter(chNum) {
  var num = String(chNum).padStart(4, '0');
  var srcPath = path.join(BASE, 'ch' + num + '.json');
  var d = JSON.parse(fs.readFileSync(srcPath, 'utf8'));
  var zhPath = path.join(BASE, d.id + '_zh.json');

  // Load existing if any
  var zh;
  try { zh = JSON.parse(fs.readFileSync(zhPath, 'utf8')); }
  catch (e) { zh = buildTranslateTemplate(d); }

  // Build batch
  var batch = buildBatchPrompt(d, zh);
  if (!batch) {
    console.log('ch' + num + ' (' + d.id + '): ✅ already complete, skipping');
    fs.writeFileSync(zhPath, JSON.stringify(zh, null, 2), 'utf8');
    return 'already_complete';
  }

  console.log('ch' + num + ' (' + d.id + '): translating (batch: ' + batch.length + ' chars)...');
  var result = await runAgentChat(batch);

  // Extract AI response: everything before [receipt]
  var text = result.stdout;
  var receiptIdx = text.indexOf('[receipt]');
  if (receiptIdx >= 0) text = text.slice(0, receiptIdx);

  if (text.length < 20) {
    console.log('  ⚠ Short response, retrying...');
    await sleep(2000);
    return translateChapter(chNum);
  }

  console.log('  Response: ' + text.length + ' chars — parsing...');
  parseResponse(text, zh);
  fs.writeFileSync(zhPath, JSON.stringify(zh, null, 2), 'utf8');

  // Count remaining
  var tbd = 0, done = 0;
  zh.writingTasks.forEach(function(t) { if (t.prompt === 'TBD') tbd++; else if (t.prompt) done++; });
  zh.speakingTasks.forEach(function(t) { if (t.prompt === 'TBD') tbd++; else if (t.prompt) done++; });
  Object.keys(zh.studySupport.modelAnswers).forEach(function(k) { if (zh.studySupport.modelAnswers[k] === 'TBD') tbd++; else done++; });
  zh.studySupport.outputFrameworks.forEach(function(f) { if (f.for === 'TBD') tbd++; else done++; f.steps.forEach(function(s) { if (s === 'TBD') tbd++; else done++; }); });
  zh.studySupport.scoringRisks.forEach(function(r) { if (r === 'TBD') tbd++; else done++; });

  console.log('  Saved: ' + done + ' done, ' + tbd + ' TBD');
  if (tbd > 0) {
    console.log('  ⚠ ' + tbd + ' items still TBD — will retry in next pass');
    // Save partial progress, retry once
    await sleep(1000);
    batch = buildBatchPrompt(d, zh);
    if (batch) {
      console.log('  Retrying...');
      result = await runAgentChat(batch);
      text = result.stdout;
      receiptIdx = text.indexOf('[receipt]');
      if (receiptIdx >= 0) text = text.slice(0, receiptIdx);
      if (text.length > 20) {
        parseResponse(text, zh);
        fs.writeFileSync(zhPath, JSON.stringify(zh, null, 2), 'utf8');
      }
    }
  }

  return tbd === 0 ? 'complete' : 'partial';
}

async function main() {
  var start = parseInt(process.argv[2], 10) || 1;
  var end = parseInt(process.argv[3], 10) || 18;
  console.log('Translating chapters ' + start + ' to ' + end + ' via AgentChat...\n');

  for (var i = start; i <= end; i++) {
    try {
      var status = await translateChapter(i);
      if (status !== 'already_complete') await sleep(3000);
    } catch (err) {
      console.log('ch' + i.toString().padStart(4, '0') + ': ❌ error — ' + err.message);
    }
  }

  console.log('\nDone.');
}

main().catch(function(e) { console.error(e); process.exit(1); });
