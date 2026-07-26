(function (root) {
  'use strict';

  var SETTINGS_KEY = 'rr_listening_settings_v1';
  var current = null;
  var audio = null;
  var segments = [];
  var activeIndex = -1;
  var loopIndex = -1;
  var boundaryPending = false;
  var boundaryTimer = null;

  function byId(id) { return document.getElementById(id); }
  function all(selector) { return Array.from(document.querySelectorAll(selector)); }
  function readJson(key, fallback) {
    try { var raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }
    catch (error) { return fallback; }
  }
  function writeJson(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); }
    catch (error) {}
  }
  function settingsApi() { return root.RussianListeningSession; }
  function getSettings() {
    var api = settingsApi();
    return api ? api.normalizeSettings(readJson(SETTINGS_KEY, {})) : readJson(SETTINGS_KEY, {});
  }
  function saveSettings(patch) {
    var next = Object.assign({}, getSettings(), patch || {});
    var api = settingsApi();
    if (api) next = api.normalizeSettings(next);
    writeJson(SETTINGS_KEY, next);
    applySettings(next);
    return next;
  }
  function formatTime(value) {
    var seconds = Number(value);
    if (!Number.isFinite(seconds) || seconds < 0) seconds = 0;
    var minutes = Math.floor(seconds / 60);
    return String(minutes).padStart(2, '0') + ':' + String(Math.floor(seconds % 60)).padStart(2, '0');
  }
  function parseVttTime(value) {
    var parts = String(value || '').trim().split(':').map(Number);
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return Number(value) || 0;
  }
  function parseVtt(text) {
    return String(text || '').replace(/^\uFEFF/, '').split(/\r?\n\r?\n+/).map(function (block) {
      var lines = block.trim().split(/\r?\n/);
      var timingIndex = lines.findIndex(function (line) { return line.indexOf('-->') !== -1; });
      if (timingIndex < 0) return null;
      var timing = lines[timingIndex].split('-->');
      var start = parseVttTime(timing[0]);
      var end = parseVttTime(String(timing[1] || '').trim().split(/\s+/)[0]);
      var cueText = lines.slice(timingIndex + 1).join(' ').replace(/<[^>]+>/g, '').trim();
      return end > start ? { start: start, end: end, text: cueText } : null;
    }).filter(Boolean);
  }
  function normalizeTimeline(list) {
    if (!list.length) return [];
    var valid = list.every(function (segment, index) {
      if (!Number.isFinite(segment.start) || !Number.isFinite(segment.end) || segment.end <= segment.start) return false;
      if (!index) return true;
      var previous = list[index - 1];
      if (segment.start < previous.start) return false;
      return segment.start >= previous.end - 0.25;
    });
    var distinctStarts = new Set(list.map(function (segment) { return segment.start.toFixed(2); })).size;
    if (!valid || (list.length > 2 && distinctStarts < Math.ceil(list.length * 0.6))) return [];
    return list;
  }
  function normalizeDataSegments(value) {
    var list = (Array.isArray(value) ? value : []).map(function (segment, index) {
      return {
        index: index,
        start: Number(segment.startTime),
        end: Number(segment.endTime),
        text: segment.text || '',
        displayLabel: segment.displayLabel || segment.speaker || ''
      };
    });
    return normalizeTimeline(list);
  }
  function clearBoundaryTimer() {
    if (boundaryTimer) clearTimeout(boundaryTimer);
    boundaryTimer = null;
    boundaryPending = false;
  }
  function timelineStatus(message, tone) {
    var node = byId('lwTimelineStatus');
    if (!node) return;
    node.textContent = message;
    node.dataset.tone = tone || 'muted';
  }
  function updateTimelineRows() {
    var timelineReady = segments.length > 0;
    var media = current && current.data && current.data.media || {};
    var mediaMismatch = media.status === 'source-mismatch';
    var workbench = document.querySelector('.lw-workbench');
    if (workbench) workbench.dataset.timelineReady = timelineReady ? 'true' : 'false';
    all('.lw-transcript-row').forEach(function (row, index) {
      var segment = segments[index];
      row.dataset.timelineReady = segment ? 'true' : 'false';
      var time = row.querySelector('.lw-transcript-time');
      if (time) time.textContent = segment ? formatTime(segment.start) : '--:--';
      var action = row.querySelector('.lw-transcript-play');
      if (action) action.disabled = !segment;
    });
    var controls = ['lwPrevSentence', 'lwNextSentence', 'lwLoopSentence'];
    controls.forEach(function (id) { var node = byId(id); if (node) node.disabled = !timelineReady; });
    var position = byId('lwSentencePosition');
    if (position && !timelineReady) position.textContent = mediaMismatch ? '等待正确音频' : '仅支持整段播放';
    var transcriptHint = byId('lwTranscriptHint');
    if (transcriptHint) transcriptHint.textContent = timelineReady
      ? '点击句子跳播，当前句会自动高亮'
      : mediaMismatch
      ? '教材原文已保留；正确配套音频重新绑定前不提供播放与时间轴'
      : '当前材料暂无逐句时间轴，可边听整段音频边阅读文字稿';
    timelineStatus(timelineReady
      ? '字幕时间轴已就绪，可逐句跳播。'
      : mediaMismatch
      ? '检测到音频与教材原文不一致，错误音频已停用。'
      : '当前材料没有可靠时间轴，已切换为整段播放与清晰文字稿。', timelineReady ? 'ready' : 'warning');
  }
  function setActive(index, options) {
    options = options || {};
    if (!segments.length) return;
    index = Math.max(0, Math.min(Number(index) || 0, segments.length - 1));
    activeIndex = index;
    all('.lw-transcript-row').forEach(function (row, rowIndex) {
      row.classList.toggle('is-active', rowIndex === index);
      row.classList.toggle('is-past', rowIndex < index);
      row.setAttribute('aria-current', rowIndex === index ? 'true' : 'false');
    });
    var label = byId('lwSentencePosition');
    if (label) label.textContent = '第 ' + (index + 1) + ' / ' + segments.length + ' 句';
    if (options.scroll) {
      var target = document.querySelector('.lw-transcript-row[data-segment-index="' + index + '"]');
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }
  function activeByTime(time) {
    if (!segments.length) return -1;
    for (var index = segments.length - 1; index >= 0; index--) {
      if (time >= segments[index].start) return index;
    }
    return 0;
  }
  function updatePlayerReadout() {
    if (!audio) return;
    var progress = byId('lwProgress');
    if (progress) progress.value = audio.duration ? String(audio.currentTime / audio.duration * 100) : '0';
    var time = byId('lwTime');
    if (time) time.textContent = formatTime(audio.currentTime) + ' / ' + formatTime(audio.duration);
    var play = byId('lwPlay');
    if (play) {
      play.textContent = audio.paused ? '▶' : 'Ⅱ';
      play.setAttribute('aria-label', audio.paused ? '播放' : '暂停');
      play.title = audio.paused ? '播放' : '暂停';
    }
  }
  function scheduleBoundary(index) {
    if (!audio || boundaryPending || index < 0 || !segments[index]) return;
    var settings = getSettings();
    var shouldLoop = loopIndex === index;
    if (!shouldLoop && !settings.autoAdvance) return;
    boundaryPending = true;
    audio.pause();
    var nextIndex = shouldLoop ? index : index + 1;
    if (nextIndex >= segments.length) { clearBoundaryTimer(); return; }
    boundaryTimer = setTimeout(function () {
      boundaryPending = false;
      boundaryTimer = null;
      selectSegment(nextIndex, true);
    }, settings.sentencePauseMs);
  }
  function handleTimeUpdate() {
    if (!audio) return;
    updatePlayerReadout();
    var nextActive = activeByTime(audio.currentTime);
    if (nextActive !== activeIndex) setActive(nextActive, { scroll: getSettings().autoAdvance });
    if (activeIndex >= 0 && segments[activeIndex] && audio.currentTime >= segments[activeIndex].end - 0.035) scheduleBoundary(activeIndex);
  }
  function applySettings(settings) {
    if (audio) audio.playbackRate = settings.playbackRate;
    var rate = byId('lwRate');
    var pause = byId('lwPause');
    var auto = byId('lwAutoAdvance');
    var subtitle = byId('lwSubtitleMode');
    if (rate) rate.value = String(settings.playbackRate);
    if (pause) pause.value = String(settings.sentencePauseMs);
    if (auto) auto.checked = settings.autoAdvance;
    if (subtitle) subtitle.value = settings.subtitleMode;
    var workbench = document.querySelector('.lw-workbench');
    if (workbench) workbench.dataset.subtitleMode = settings.subtitleMode;
  }
  function loadTimeline(data, captionsUrl) {
    var mediaMismatch = data && data.media && data.media.status === 'source-mismatch';
    var fallback = mediaMismatch ? [] : normalizeDataSegments(data && data.transcriptSegments);
    if (!captionsUrl) {
      segments = fallback;
      updateTimelineRows();
      if (segments.length) setActive(0);
      return Promise.resolve(segments);
    }
    return fetch(captionsUrl, { cache: 'no-store' }).then(function (response) {
      if (!response.ok) throw new Error('captions unavailable');
      return response.text();
    }).then(function (text) {
      var cues = normalizeTimeline(parseVtt(text));
      segments = cues.length ? cues : fallback;
      updateTimelineRows();
      if (segments.length) setActive(0);
      return segments;
    }).catch(function () {
      segments = fallback;
      updateTimelineRows();
      if (segments.length) setActive(0);
      return segments;
    });
  }
  function init(options) {
    destroy();
    current = options || {};
    audio = byId('lwAudio');
    if (!audio) return Promise.resolve([]);
    audio.addEventListener('loadedmetadata', updatePlayerReadout);
    audio.addEventListener('durationchange', updatePlayerReadout);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('play', updatePlayerReadout);
    audio.addEventListener('pause', updatePlayerReadout);
    audio.addEventListener('ended', updatePlayerReadout);
    applySettings(getSettings());
    updatePlayerReadout();
    return loadTimeline(current.data || {}, current.captionsUrl || '');
  }
  function destroy() {
    clearBoundaryTimer();
    if (audio) audio.pause();
    current = null;
    audio = null;
    segments = [];
    activeIndex = -1;
    loopIndex = -1;
  }
  function togglePlay() {
    if (!audio) return;
    clearBoundaryTimer();
    if (audio.paused) audio.play().catch(function () { timelineStatus('浏览器阻止了自动播放，请再次点击播放。', 'warning'); });
    else audio.pause();
  }
  function seek(percent) {
    if (!audio || !audio.duration) return;
    clearBoundaryTimer();
    audio.currentTime = Math.max(0, Math.min(100, Number(percent) || 0)) / 100 * audio.duration;
  }
  function selectSegment(index, play) {
    if (!audio || !segments[index]) return;
    clearBoundaryTimer();
    setActive(index, { scroll: true });
    audio.currentTime = segments[index].start;
    if (play) audio.play().catch(function () {});
  }
  function selectSegmentFromRow(index, event) {
    if (event && event.target && event.target.closest && event.target.closest('.ru-word')) return;
    selectSegment(index, true);
  }
  function moveSegment(direction) {
    if (!segments.length) return;
    selectSegment(Math.max(0, Math.min(segments.length - 1, activeIndex + Number(direction || 0))), false);
  }
  function toggleLoop() {
    if (!segments.length) return;
    loopIndex = loopIndex === activeIndex ? -1 : activeIndex;
    var button = byId('lwLoopSentence');
    if (button) {
      button.classList.toggle('is-active', loopIndex >= 0);
      button.setAttribute('aria-pressed', loopIndex >= 0 ? 'true' : 'false');
    }
    timelineStatus(loopIndex >= 0 ? '正在循环第 ' + (loopIndex + 1) + ' 句。' : '已关闭单句循环。', loopIndex >= 0 ? 'ready' : 'muted');
  }
  function updateSetting(name, value) {
    var patch = {};
    if (name === 'playbackRate') patch.playbackRate = Number(value);
    if (name === 'sentencePauseMs') patch.sentencePauseMs = Number(value);
    if (name === 'autoAdvance') patch.autoAdvance = value === true || value === 'true';
    if (name === 'subtitleMode') patch.subtitleMode = String(value);
    saveSettings(patch);
  }
  function toggleSettings() {
    var panel = byId('lwSettingsPanel');
    var button = byId('lwSettingsToggle');
    if (!panel) return;
    panel.hidden = !panel.hidden;
    if (button) button.setAttribute('aria-expanded', panel.hidden ? 'false' : 'true');
  }
  function focusEvidence(quote) {
    var normalized = String(quote || '').toLowerCase().replace(/\s+/g, ' ').trim();
    if (!normalized) return false;
    var rows = all('.lw-transcript-row');
    var index = rows.findIndex(function (row) {
      return String(row.textContent || '').toLowerCase().replace(/\s+/g, ' ').indexOf(normalized) !== -1 || normalized.indexOf(String(row.dataset.plainText || '').toLowerCase()) !== -1;
    });
    if (index < 0) return false;
    if (segments[index]) selectSegment(index, true);
    else rows[index].scrollIntoView({ behavior: 'smooth', block: 'center' });
    rows[index].classList.add('is-evidence');
    setTimeout(function () { rows[index].classList.remove('is-evidence'); }, 2200);
    return true;
  }

  root.RussianListeningWorkbench = {
    init: init,
    destroy: destroy,
    getSettings: getSettings,
    saveSettings: saveSettings,
    formatTime: formatTime,
    parseVtt: parseVtt,
    normalizeDataSegments: normalizeDataSegments,
    togglePlay: togglePlay,
    seek: seek,
    selectSegment: selectSegment,
    selectSegmentFromRow: selectSegmentFromRow,
    moveSegment: moveSegment,
    toggleLoop: toggleLoop,
    updateSetting: updateSetting,
    toggleSettings: toggleSettings,
    focusEvidence: focusEvidence
  };
})(typeof window !== 'undefined' ? window : globalThis);
