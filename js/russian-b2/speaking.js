(function(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.RussianB2Speaking = api;
})(typeof window !== 'undefined' ? window : globalThis, function() {
  const DATABASE = 'russian_b2_recordings';
  const STORE = 'attempts';
  function attemptId(taskId) { return `${taskId}:${Date.now()}`; }
  function recordingMetadata(taskId, blob) { return { id: attemptId(taskId), taskId, createdAt: new Date().toISOString(), mimeType: blob.type || 'audio/webm' }; }
  return { DATABASE, STORE, attemptId, recordingMetadata };
});
