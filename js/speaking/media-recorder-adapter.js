(function(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.WhiteNightMediaRecorderAdapter = api;
})(typeof window !== 'undefined' ? window : globalThis, function() {
  'use strict';

  const MIME_CANDIDATES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];

  function recordingError(code, message, cause) {
    const error = new Error(message);
    error.code = code;
    if (cause) error.cause = cause;
    return error;
  }

  function permissionError(error) {
    if (error && (error.name === 'NotAllowedError' || error.name === 'SecurityError')) return recordingError('PERMISSION_DENIED', '未取得麦克风权限', error);
    if (error && error.name === 'NotFoundError') return recordingError('NO_MICROPHONE', '没有找到可用麦克风', error);
    if (error && (error.name === 'NotReadableError' || error.name === 'AbortError')) return recordingError('MICROPHONE_BUSY', '麦克风当前不可用', error);
    return recordingError('PREPARE_FAILED', '无法准备麦克风', error);
  }

  function createMediaRecorderAdapter(environment) {
    const env = environment || {};
    const navigatorObject = env.navigator || (typeof navigator !== 'undefined' ? navigator : null);
    const Recorder = env.MediaRecorder || (typeof MediaRecorder !== 'undefined' ? MediaRecorder : null);
    const BlobConstructor = env.Blob || (typeof Blob !== 'undefined' ? Blob : null);
    const now = env.now || function() { return typeof performance !== 'undefined' ? performance.now() : Date.now(); };
    let stream = null;
    let recorder = null;
    let chunks = [];
    let startedAt = 0;
    let completion = null;
    let discarded = false;
    let permissionPrepared = false;

    function supportedMimeType() {
      if (!Recorder || typeof Recorder.isTypeSupported !== 'function') return '';
      return MIME_CANDIDATES.find(function(type) { return Recorder.isTypeSupported(type); }) || '';
    }

    function releaseStream() {
      if (stream && typeof stream.getTracks === 'function') {
        stream.getTracks().forEach(function(track) { try { track.stop(); } catch (error) {} });
      }
      stream = null;
    }

    async function acquireStream() {
      if (!navigatorObject || !navigatorObject.mediaDevices || typeof navigatorObject.mediaDevices.getUserMedia !== 'function' || !Recorder || !BlobConstructor) {
        throw recordingError('UNSUPPORTED', '当前环境不支持网页录音');
      }
      try {
        stream = await navigatorObject.mediaDevices.getUserMedia({ audio: true });
        permissionPrepared = true;
        return stream;
      } catch (error) {
        releaseStream();
        throw permissionError(error);
      }
    }

    async function prepare() {
      await acquireStream();
      releaseStream();
      return { state: 'granted' };
    }

    async function start() {
      if (recorder && recorder.state !== 'inactive') throw recordingError('ALREADY_RECORDING', '录音已经开始');
      await acquireStream();
      const mimeType = supportedMimeType();
      try { recorder = mimeType ? new Recorder(stream, { mimeType: mimeType }) : new Recorder(stream); }
      catch (error) { releaseStream(); throw recordingError('RECORDER_CREATE_FAILED', '无法创建录音器', error); }
      chunks = [];
      discarded = false;
      startedAt = now();
      completion = new Promise(function(resolve, reject) {
        recorder.ondataavailable = function(event) { if (event.data && event.data.size > 0) chunks.push(event.data); };
        recorder.onerror = function(event) { reject(recordingError('RECORDER_FAILED', '录音过程中发生错误', event.error || event)); };
        recorder.onstop = function() {
          const durationMs = Math.max(0, Math.round(now() - startedAt));
          const finalType = recorder.mimeType || mimeType || (chunks[0] && chunks[0].type) || 'audio/webm';
          const blob = discarded ? null : new BlobConstructor(chunks, { type: finalType });
          resolve({ blob: blob, durationMs: durationMs, mimeType: finalType, discarded: discarded });
        };
      });
      try { recorder.start(); }
      catch (error) { releaseStream(); recorder = null; throw recordingError('START_FAILED', '无法开始录音', error); }
      return { mimeType: recorder.mimeType || mimeType || 'audio/webm', startedAt: startedAt };
    }

    async function finish(discard) {
      if (!recorder || recorder.state === 'inactive') throw recordingError('NOT_RECORDING', '当前没有正在进行的录音');
      discarded = !!discard;
      try { recorder.stop(); }
      catch (error) { releaseStream(); recorder = null; throw recordingError('STOP_FAILED', '无法结束录音', error); }
      let result;
      try { result = await completion; }
      finally { releaseStream(); recorder = null; chunks = []; completion = null; }
      if (!discard && (!result.blob || result.blob.size <= 0)) throw recordingError('EMPTY_RECORDING', '录音文件为空');
      return result;
    }

    return {
      prepare: prepare,
      start: start,
      stop: function() { return finish(false); },
      cancel: function() {
        if (!recorder || recorder.state === 'inactive') { releaseStream(); return Promise.resolve(); }
        return finish(true).then(function() {});
      },
      dispose: async function() {
        if (recorder && recorder.state !== 'inactive') {
          try { await finish(true); } catch (error) { releaseStream(); recorder = null; }
        } else releaseStream();
      },
      isPrepared: function() { return permissionPrepared; },
      isRecording: function() { return !!recorder && recorder.state === 'recording'; },
      supportedMimeType: supportedMimeType
    };
  }

  return { MIME_CANDIDATES: MIME_CANDIDATES, createMediaRecorderAdapter: createMediaRecorderAdapter, recordingError: recordingError };
});


