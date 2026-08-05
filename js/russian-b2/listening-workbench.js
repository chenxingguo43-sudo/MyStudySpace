(function (root) {
  'use strict';

  var SETTINGS_KEY = 'rr_listening_settings_v1';
  var current = null;
  var audio = null;
  var segments = [];
  var activeIndex = -1;
  var loopIndex = -1;
  var abLoopIndex = -1;
  var playlist = [];
  var playlistIndex = 0;
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
      var start = Number(segment.startTime);
      var end = Number(segment.endTime);
      return {
        index: index,
        start: start,
        end: end,
        timed: Number.isFinite(start) && Number.isFinite(end) && end > start,
        playlistIndex: Number.isFinite(Number(segment.playlistIndex)) ? Number(segment.playlistIndex) : 0,
        text: segment.text || '',
        displayLabel: segment.displayLabel || segment.speaker || ''
      };
    });
    var timed = list.filter(function (segment) { return segment.timed; });
    if (!timed.length) return [];
    var valid = timed.every(function (segment, index) {
      var previous = null;
      for (var cursor = index - 1; cursor >= 0; cursor--) {
        if (timed[cursor].playlistIndex === segment.playlistIndex) {
          previous = timed[cursor];
          break;
        }
      }
      return !previous || (segment.start >= previous.start && segment.start >= previous.end - 0.25);
    });
    if (!valid) return [];
    var groups = new Map();
    timed.forEach(function (segment) {
      var group = groups.get(segment.playlistIndex) || [];
      group.push(segment);
      groups.set(segment.playlistIndex, group);
    });
    var distinctEnough = Array.from(groups.values()).every(function (group) {
      if (group.length <= 2) return true;
      return new Set(group.map(function (segment) { return segment.start.toFixed(2); })).size >= Math.ceil(group.length * 0.6);
    });
    return distinctEnough ? list : [];
  }
  function getDataTimelineState(data) {
    var source = Array.isArray(data && data.transcriptSegments) ? data.transcriptSegments : [];
    var normalized = normalizeDataSegments(source);
    var timedCount = normalized.filter(function (segment) { return segment.timed; }).length;
    return {
      hasSource: source.length > 0,
      hasTimed: timedCount > 0,
      complete: source.length > 0 && normalized.length === source.length && timedCount === source.length,
      segments: normalized
    };
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
    var timedCount = segments.filter(function (segment) { return segment.timed !== false; }).length;
    var timelineReady = timedCount > 0;
    var timelinePartial = timelineReady && timedCount < segments.length;
    var media = current && current.data && current.data.media || {};
    var mediaMismatch = media.status === 'source-mismatch';
    var sourceTimeline = getDataTimelineState(current && current.data);
    var timelineNeedsVerification = sourceTimeline.hasTimed && !sourceTimeline.complete;
    var workbench = document.querySelector('.lw-workbench');
    if (workbench) workbench.dataset.timelineReady = timelineReady ? 'true' : 'false';
    all('.lw-transcript-row').forEach(function (row, index) {
      var segment = segments[index];
      var segmentReady = segment && segment.timed !== false;
      row.dataset.timelineReady = segmentReady ? 'true' : 'false';
      row.setAttribute('tabindex', segmentReady ? '0' : '-1');
      row.setAttribute('aria-disabled', segmentReady ? 'false' : 'true');
      var time = row.querySelector('.lw-transcript-time');
      if (time) time.textContent = segmentReady ? formatTime(segment.start) : '--:--';
      var action = row.querySelector('.lw-transcript-play');
      if (action) action.disabled = !segmentReady;
      Array.from(row.querySelectorAll('.lw-dictation-control')).forEach(function (control) { control.disabled = !segmentReady; });
    });
    var controls = ['lwPrevSentence', 'lwNextSentence', 'lwLoopSentence', 'lwABLoop', 'lwABLoopControl'];
    controls.forEach(function (id) { var node = byId(id); if (node) node.disabled = !timelineReady; });
    var position = byId('lwSentencePosition');
    if (position && !timelineReady) position.textContent = mediaMismatch ? '等待正确音频' : timelineNeedsVerification ? '逐句时间轴待核验' : '仅支持整段播放';
    var transcriptHint = byId('lwTranscriptHint');
    if (transcriptHint) transcriptHint.textContent = timelineNeedsVerification
      ? '原文与整段媒体已保留；逐句时间轴尚未完整核验，因此不提供跳转、循环或听写。'
      : timelinePartial
      ? '可靠句子可点击跳播；显示“--:--”的句子保留原文，但暂不提供跳转'
      : timelineReady
      ? '点击句子跳播，当前句会自动高亮'
      : mediaMismatch
      ? '教材原文已保留；正确配套音频重新绑定前不提供播放与时间轴'
      : '当前材料暂无逐句时间轴，可边听整段音频边阅读文字稿';
    timelineStatus(timelineNeedsVerification
      ? '逐句时间轴尚未完整核验，已切换为整段播放，避免错误跳转。'
      : timelinePartial
      ? '部分句子已建立可靠时间轴，未匹配句子不会错误跳转。'
      : timelineReady
      ? '字幕时间轴已就绪，可逐句跳播。'
      : mediaMismatch
      ? '检测到音频与教材原文不一致，错误音频已停用。'
      : '当前材料没有可靠时间轴，已切换为整段播放与清晰文字稿。', timelineReady ? 'ready' : 'warning');
  }
  function setActive(index, options) {
    options = options || {};
    if (!segments.length || !segments[index] || segments[index].timed === false) return;
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
      if (segments[index].timed !== false && segments[index].playlistIndex === playlistIndex && time >= segments[index].start) return index;
    }
    return -1;
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
  function updatePlaylistButtons() {
    all('[data-lw-playlist-index]').forEach(function(button) {
      var index = Number(button.dataset.lwPlaylistIndex);
      button.classList.toggle('is-active', index === playlistIndex);
      button.setAttribute('aria-current', index === playlistIndex ? 'true' : 'false');
    });
  }
  function selectPlaylistItem(index, autoplay) {
    if (!audio || !playlist.length) return;
    index = Math.max(0, Math.min(playlist.length - 1, Number(index) || 0));
    playlistIndex = index;
    clearBoundaryTimer();
    audio.pause();
    audio.src = playlist[index].url;
    audio.load();
    updatePlaylistButtons();
    if (autoplay) audio.play().catch(function () { timelineStatus('请点击播放以继续下一段。', 'warning'); });
  }
  function scheduleBoundary(index) {
    if (!audio || boundaryPending || index < 0 || !segments[index] || segments[index].timed === false) return;
    var settings = getSettings();
    var shouldLoop = loopIndex === index;
    if (!shouldLoop && !settings.autoAdvance) return;
    boundaryPending = true;
    audio.pause();
    var nextIndex = shouldLoop ? index : findTimedIndex(index, 1);
    if (nextIndex >= segments.length) { clearBoundaryTimer(); return; }
    if (nextIndex < 0) { clearBoundaryTimer(); return; }
    boundaryTimer = setTimeout(function () {
      boundaryPending = false;
      boundaryTimer = null;
      selectSegment(nextIndex, true);
    }, settings.sentencePauseMs);
  }
  function scheduleABBoundary(index) {
    if (!audio || boundaryPending || index < 0 || !segments[index] || segments[index].timed === false) return;
    var settings = getSettings();
    boundaryPending = true;
    audio.pause();
    boundaryTimer = setTimeout(function () {
      boundaryPending = false;
      boundaryTimer = null;
      selectSegment(index, true, settings.abBeforeSeconds);
    }, settings.sentencePauseMs);
  }
  function handleTimeUpdate() {
    if (!audio) return;
    updatePlayerReadout();
    var nextActive = activeByTime(audio.currentTime);
    if (nextActive >= 0 && nextActive !== activeIndex) setActive(nextActive, { scroll: getSettings().autoAdvance });
    var abSegment = segments[abLoopIndex];
    if (abLoopIndex >= 0 && abSegment && abSegment.playlistIndex === playlistIndex) {
      if (activeIndex !== abLoopIndex) setActive(abLoopIndex, { scroll: false });
      if (audio.currentTime >= abSegment.end + getSettings().abAfterSeconds - 0.035) scheduleABBoundary(abLoopIndex);
      return;
    }
    if (activeIndex >= 0 && segments[activeIndex] && audio.currentTime >= segments[activeIndex].end - 0.035) scheduleBoundary(activeIndex);
  }
  function applySettings(settings) {
    if (audio) audio.playbackRate = settings.playbackRate;
    var rate = byId('lwRate');
    var pause = byId('lwPause');
    var auto = byId('lwAutoAdvance');
    var subtitle = byId('lwSubtitleMode');
    var abLoop = byId('lwABLoop');
    var abBefore = byId('lwABBefore');
    var abAfter = byId('lwABAfter');
    if (rate) rate.value = String(settings.playbackRate);
    if (pause) pause.value = String(settings.sentencePauseMs);
    if (auto) auto.checked = settings.autoAdvance;
    if (subtitle) subtitle.value = settings.subtitleMode;
    if (abLoop) abLoop.checked = settings.abLoop;
    if (abBefore) abBefore.value = String(settings.abBeforeSeconds);
    if (abAfter) abAfter.value = String(settings.abAfterSeconds);
    var workbench = document.querySelector('.lw-workbench');
    if (workbench) workbench.dataset.subtitleMode = settings.subtitleMode;
  }
  function loadTimeline(data, captionsUrl) {
    var mediaMismatch = data && data.media && data.media.status === 'source-mismatch';
    var sourceTimeline = getDataTimelineState(data);
    var fallback = mediaMismatch || !sourceTimeline.complete ? [] : sourceTimeline.segments;
    if (!captionsUrl) {
      segments = fallback;
      updateTimelineRows();
      if (segments.length) setActive(findTimedIndex(-1, 1));
      return Promise.resolve(segments);
    }
    return fetch(captionsUrl, { cache: 'no-store' }).then(function (response) {
      if (!response.ok) throw new Error('captions unavailable');
      return response.text();
    }).then(function (text) {
      var cues = normalizeTimeline(parseVtt(text));
      segments = cues.length ? cues : fallback;
      updateTimelineRows();
      if (segments.length) setActive(findTimedIndex(-1, 1));
      return segments;
    }).catch(function () {
      segments = fallback;
      updateTimelineRows();
      if (segments.length) setActive(findTimedIndex(-1, 1));
      return segments;
    });
  }
  function init(options) {
    destroy();
    current = options || {};
    audio = byId('lwAudio');
    if (!audio) return Promise.resolve([]);
    var initialTime = Number(current.initialTime);
    if (Number.isFinite(initialTime) && initialTime > 0) {
      audio.addEventListener('loadedmetadata', function () {
        audio.currentTime = Math.min(initialTime, Number.isFinite(audio.duration) ? audio.duration : initialTime);
        updatePlayerReadout();
      }, { once: true });
    }
    audio.addEventListener('loadedmetadata', updatePlayerReadout);
    audio.addEventListener('durationchange', updatePlayerReadout);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('play', updatePlayerReadout);
    audio.addEventListener('pause', updatePlayerReadout);
    audio.addEventListener('ended', function () {
      updatePlayerReadout();
      if (playlistIndex < playlist.length - 1) selectPlaylistItem(playlistIndex + 1, true);
    });
    playlist = Array.isArray(current.playlist) ? current.playlist.filter(function(item) { return item && item.url; }) : [];
    playlistIndex = 0;
    updatePlaylistButtons();
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
    abLoopIndex = -1;
    playlist = [];
    playlistIndex = 0;
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
  function selectSegment(index, play, beforeSeconds) {
    if (!audio || !segments[index] || segments[index].timed === false) return;
    clearBoundaryTimer();
    setActive(index, { scroll: true });
    if (playlist.length && segments[index].playlistIndex !== playlistIndex) {
      audio.addEventListener('loadedmetadata', function onPlaylistLoaded() {
        audio.currentTime = Math.max(0, segments[index].start - (Number(beforeSeconds) || 0));
        if (play) audio.play().catch(function () {});
      }, { once: true });
      selectPlaylistItem(segments[index].playlistIndex, false);
      return;
    }
    audio.currentTime = Math.max(0, segments[index].start - (Number(beforeSeconds) || 0));
    if (play) audio.play().catch(function () {});
  }
  function selectSegmentFromRow(index, event) {
    if (event && event.target && event.target.closest && event.target.closest('.ru-word')) return;
    selectSegment(index, true);
  }
  function moveSegment(direction) {
    if (!segments.length) return;
    var nextIndex = findTimedIndex(activeIndex, Number(direction || 0) < 0 ? -1 : 1);
    if (nextIndex >= 0) selectSegment(nextIndex, false);
  }

  function findTimedIndex(fromIndex, direction) {
    var step = direction < 0 ? -1 : 1;
    for (var index = fromIndex + step; index >= 0 && index < segments.length; index += step) {
      if (segments[index] && segments[index].timed !== false) return index;
    }
    return -1;
  }
  function toggleLoop() {
    if (!segments.length) return;
    loopIndex = loopIndex === activeIndex ? -1 : activeIndex;
    if (loopIndex >= 0) {
      abLoopIndex = -1;
      saveSettings({ abLoop: false });
    }
    var button = byId('lwLoopSentence');
    if (button) {
      button.classList.toggle('is-active', loopIndex >= 0);
      button.setAttribute('aria-pressed', loopIndex >= 0 ? 'true' : 'false');
    }
    timelineStatus(loopIndex >= 0 ? '正在循环第 ' + (loopIndex + 1) + ' 句。' : '已关闭单句循环。', loopIndex >= 0 ? 'ready' : 'muted');
  }
  function toggleABLoop() {
    if (!segments[activeIndex] || segments[activeIndex].timed === false) return;
    abLoopIndex = abLoopIndex === activeIndex || (getSettings().abLoop && abLoopIndex < 0) ? -1 : activeIndex;
    if (abLoopIndex >= 0) loopIndex = -1;
    var sentenceLoop = byId('lwLoopSentence');
    if (sentenceLoop) { sentenceLoop.classList.toggle('is-active', loopIndex >= 0); sentenceLoop.setAttribute('aria-pressed', loopIndex >= 0 ? 'true' : 'false'); }
    saveSettings({ abLoop: abLoopIndex >= 0 });
    var control = byId('lwABLoopControl');
    if (control) { control.classList.toggle('is-active', abLoopIndex >= 0); control.setAttribute('aria-pressed', abLoopIndex >= 0 ? 'true' : 'false'); }
    timelineStatus(abLoopIndex >= 0 ? '正在 A/B 循环当前句（含设置中的前后缓冲）。' : '已关闭 A/B 循环。', abLoopIndex >= 0 ? 'ready' : 'muted');
    if (abLoopIndex >= 0) selectSegment(abLoopIndex, true, getSettings().abBeforeSeconds);
  }
  function updateSetting(name, value) {
    var patch = {};
    if (name === 'playbackRate') patch.playbackRate = Number(value);
    if (name === 'sentencePauseMs') patch.sentencePauseMs = Number(value);
    if (name === 'autoAdvance') patch.autoAdvance = value === true || value === 'true';
    if (name === 'subtitleMode') patch.subtitleMode = String(value);
    if (name === 'abBeforeSeconds' || name === 'abAfterSeconds') patch[name] = Number(value);
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
    if (segments[index] && segments[index].timed !== false) selectSegment(index, true);
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
    getDataTimelineState: getDataTimelineState,
    togglePlay: togglePlay,
    seek: seek,
    selectSegment: selectSegment,
    selectSegmentFromRow: selectSegmentFromRow,
    moveSegment: moveSegment,
    toggleLoop: toggleLoop,
    toggleABLoop: toggleABLoop,
    selectPlaylistItem: selectPlaylistItem,
    updateSetting: updateSetting,
    toggleSettings: toggleSettings,
    focusEvidence: focusEvidence
  };
})(typeof window !== 'undefined' ? window : globalThis);
