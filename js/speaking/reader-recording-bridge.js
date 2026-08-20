(function(root) {
  'use strict';

  var store = root.WhiteNightSpeakingRecordingStore.createRecordingStore({
    databaseName: 'white_night_speaking_v2'
  });
  var sessions = Object.create(null);
  var objectUrls = Object.create(null);

  function contextFor(taskId) {
    return 'reader-speaking:' + String(taskId);
  }

  function htmlEscape(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function findRoot(taskId) {
    var nodes = document.querySelectorAll('[data-speaking-task]');
    for (var i = 0; i < nodes.length; i++) {
      if (nodes[i].getAttribute('data-speaking-task') === String(taskId)) return nodes[i];
    }
    if (root.currentSpeakingData && String(root.currentSpeakingData.id) === String(taskId)) {
      var speakingPage = document.querySelector('.speaking-practice');
      var controls = speakingPage && speakingPage.querySelector('.speaking-recording-controls');
      var section = controls && (controls.closest ? controls.closest('section') : controls.parentElement);
      if (section) {
        section.setAttribute('data-speaking-task', String(taskId));
        section.classList.add('wn-speaking-recorder');
        return section;
      }
      return speakingPage;
    }
    return null;
  }

  function setStatus(taskId, message, isError) {
    var rootNode = findRoot(taskId);
    if (!rootNode) return;
    var status = rootNode.querySelector('.wn-speaking-status') || rootNode.querySelector('#speaking-recording-status');
    if (status) {
      status.textContent = message;
      status.classList.toggle('is-error', !!isError);
    }
  }

  function errorMessage(error) {
    var messages = {
      PERMISSION_DENIED: '没有取得麦克风权限，请允许后再试。',
      NO_MICROPHONE: '没有找到可用麦克风。',
      MICROPHONE_BUSY: '麦克风当前被其他程序占用。',
      UNSUPPORTED: '当前浏览器不支持网页录音。',
      EMPTY_RECORDING: '录音内容为空，请再说一次。'
    };
    return messages[error && error.code] || (error && error.message) || '录音失败，请稍后再试。';
  }

  function syncControls(taskId, state) {
    var rootNode = findRoot(taskId);
    if (!rootNode) return;
    var start = rootNode.querySelector('[data-speaking-start]') || rootNode.querySelector('#start-speaking-recording');
    var stop = rootNode.querySelector('[data-speaking-stop]') || rootNode.querySelector('#stop-speaking-recording');
    var busy = ['preparing', 'starting', 'recording', 'stopping'].indexOf(state.phase) >= 0;
    if (start) start.disabled = busy;
    if (stop) stop.disabled = state.phase !== 'recording';
  }

  function createSession(taskId) {
    var adapter = root.WhiteNightMediaRecorderAdapter.createMediaRecorderAdapter();
    var session = root.WhiteNightRecordingSession.createRecordingSession({
      adapter: adapter,
      store: store,
      onChange: function(state) {
        syncControls(taskId, state);
        if (state.phase === 'preparing' || state.phase === 'starting') setStatus(taskId, '正在准备麦克风…');
        else if (state.phase === 'recording') setStatus(taskId, '正在录音，结束后会保存到本机。');
        else if (state.phase === 'stopping') setStatus(taskId, '正在保存录音…');
        else if (state.phase === 'failed') setStatus(taskId, errorMessage(state.error), true);
      },
      onZoneChange: function() {
        if (root.navigator && typeof root.navigator.vibrate === 'function') root.navigator.vibrate(12);
      }
    });
    sessions[String(taskId)] = { session: session, adapter: adapter };
    return sessions[String(taskId)];
  }

  function getSession(taskId) {
    return sessions[String(taskId)] || createSession(taskId);
  }

  function revokeUrls(taskId) {
    var key = String(taskId);
    (objectUrls[key] || []).forEach(function(url) {
      try { URL.revokeObjectURL(url); } catch (error) {}
    });
    objectUrls[key] = [];
  }

  function renderRecordings(taskId, records) {
    var rootNode = findRoot(taskId);
    if (!rootNode) return;
    var list = rootNode.querySelector('.wn-speaking-recordings');
    if (!list) {
      list = document.createElement('div');
      list.className = 'wn-speaking-recordings';
      rootNode.appendChild(list);
    }
    revokeUrls(taskId);
    list.innerHTML = '';
    if (!records.length) {
      list.innerHTML = '<p class="wn-speaking-empty">本题还没有本地录音。</p>';
      return;
    }
    var urls = objectUrls[String(taskId)];
    records.forEach(function(record) {
      var item = document.createElement('article');
      item.className = 'wn-speaking-recording';
      item.setAttribute('data-recording-id', record.id);
      var date = new Date(record.createdAt);
      var label = record.disposition === 'transcription_pending' ? '待转写' : '已保存';
      var seconds = (Number(record.durationMs || 0) / 1000).toFixed(1);
      item.innerHTML = '<div><strong>' + htmlEscape(label) + '</strong><small>' +
        htmlEscape(isNaN(date.getTime()) ? record.createdAt : date.toLocaleString()) +
        ' · ' + htmlEscape(seconds) + ' 秒</small></div>' +
        '<button type="button" class="wn-speaking-delete" title="删除这条录音">删除</button>';
      var audio = document.createElement('audio');
      audio.controls = true;
      audio.preload = 'none';
      audio.className = 'wn-speaking-audio';
      var url = URL.createObjectURL(record.blob);
      urls.push(url);
      audio.src = url;
      item.insertBefore(audio, item.querySelector('.wn-speaking-delete'));
      item.querySelector('.wn-speaking-delete').addEventListener('click', function() {
        remove(taskId, record.id);
      });
      list.appendChild(item);
    });
  }

  function refresh(taskId) {
    return store.list({ limit: 100 }).then(function(records) {
      var context = contextFor(taskId);
      renderRecordings(taskId, records.filter(function(record) { return record.context === context; }));
      return records;
    }).catch(function(error) {
      setStatus(taskId, '本机录音库暂时不可用：' + errorMessage(error), true);
      return [];
    });
  }

  function mount(taskId) {
    getSession(taskId);
    syncControls(taskId, getSession(taskId).session.getState());
    return refresh(taskId);
  }

  async function start(taskId) {
    var key = String(taskId);
    var entry = getSession(key);
    if (entry.session.getState().phase === 'recording') return;
    try {
      await entry.session.start({
        sessionId: contextFor(key),
        context: contextFor(key)
      });
    } catch (error) {
      setStatus(key, errorMessage(error), true);
    }
  }

  async function stop(taskId, zone) {
    var key = String(taskId);
    var entry = getSession(key);
    try {
      var record = await entry.session.finish(zone || 'send');
      if (!record) {
        setStatus(key, '录音已取消，没有保存。');
        return null;
      }
      setStatus(key, record.disposition === 'transcription_pending' ? '录音已保存，等待转写服务。' : '录音已保存到本机。');
      await refresh(key);
      return record;
    } catch (error) {
      setStatus(key, errorMessage(error), true);
      return null;
    }
  }

  function remove(taskId, recordingId) {
    return store.remove(recordingId).then(function() {
      setStatus(taskId, '录音已从本机删除。');
      return refresh(taskId);
    }).catch(function(error) {
      setStatus(taskId, '删除失败：' + errorMessage(error), true);
    });
  }

  root.WhiteNightReaderSpeaking = {
    mount: mount,
    refresh: refresh,
    start: start,
    stop: stop,
    cancel: function(taskId) { return stop(taskId, 'cancel'); },
    transcribe: function(taskId) { return stop(taskId, 'transcribe'); },
    remove: remove
  };
})(typeof window !== 'undefined' ? window : globalThis);
