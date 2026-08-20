(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.ReaderAiClient = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  var TEMPLATE_VERSION = 'reader-ai-v1';

  function text(value, max) {
    return String(value == null ? '' : value).trim().slice(0, max || 12000);
  }

  function createId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return 'reader-ai:' + crypto.randomUUID();
    return 'reader-ai:' + Date.now().toString(36) + ':' + Math.random().toString(36).slice(2);
  }

  function optionValue(option, index) {
    if (option && typeof option === 'object') return {
      key: text(option.key || option.label || index + 1, 30),
      text: text(option.text || option.value || option.label, 3000)
    };
    var raw = text(option, 3000);
    var match = raw.match(/^([^\s)）]+)[)）]\s*(.*)$/);
    return { key: match ? text(match[1], 30) : String(index + 1), text: match ? text(match[2], 3000) : raw };
  }

  function grammarRequest(exercise, record, objectiveEvidence) {
    exercise = exercise || {};
    record = record || {};
    return {
      requestType: 'grammar',
      templateVersion: TEMPLATE_VERSION,
      source: { kind: 'reader-question', id: text(exercise.id || exercise.questionId, 200) },
      lexemeKey: '',
      input: {
        questionId: text(exercise.id || exercise.questionId, 200),
        question: text(exercise.question || exercise.prompt, 12000),
        options: (Array.isArray(exercise.options) ? exercise.options : []).slice(0, 20).map(optionValue),
        userAnswer: text(record.selected || record.selectedAnswer || record.response, 3000),
        correctAnswer: text(exercise.answer || exercise.sourceAnswer || record.correctAnswer, 3000),
        objectiveEvidence: objectiveEvidence || {
          sourceExplanation: text(exercise.sourceExplanation, 12000),
          referenceExplanation: text(exercise.referenceExplanation, 12000),
          pitfalls: Array.isArray(exercise.pitfalls) ? exercise.pitfalls.slice(0, 12).map(function (item) { return text(item, 2000); }) : [],
          questionPages: Array.isArray(exercise.questionPages) ? exercise.questionPages.slice(0, 20) : [],
          answerPages: Array.isArray(exercise.answerPages) ? exercise.answerPages.slice(0, 20) : []
        }
      }
    };
  }

  function readingRequest(exercise, record, evidence) {
    exercise = exercise || {};
    record = record || {};
    evidence = evidence || {};
    return {
      requestType: 'reading',
      templateVersion: 'reader-ai-reading-v2',
      source: { kind: 'reader-reading-question', id: text(exercise.id || exercise.questionId, 200) },
      lexemeKey: '',
      input: {
        questionId: text(exercise.id || exercise.questionId, 200),
        question: text(exercise.question || exercise.prompt, 12000),
        questionZh: text(exercise.zhQuestion, 12000),
        options: (Array.isArray(exercise.options) ? exercise.options : []).slice(0, 20).map(optionValue),
        optionTranslations: (Array.isArray(exercise.zhOptions) ? exercise.zhOptions : []).slice(0, 20).map(function (item, index) {
          return { key: optionValue(exercise.options && exercise.options[index], index).key, text: text(item, 3000) };
        }),
        userAnswer: text(record.selected || record.selectedAnswer || record.response, 3000),
        correctAnswer: text(exercise.answer || exercise.sourceAnswer || record.correctAnswer, 3000),
        evidence: {
          anchorQuoteRu: text(evidence.anchorQuoteRu || (exercise.sourceAnchor && exercise.sourceAnchor.quote), 12000),
          paragraphIndex: typeof evidence.paragraphIndex === 'number' ? evidence.paragraphIndex : null,
          paragraphRu: text(evidence.paragraphRu, 20000),
          paragraphZh: text(evidence.paragraphZh, 20000),
          adjacentRu: text(evidence.adjacentRu, 20000),
          adjacentZh: text(evidence.adjacentZh, 20000)
        }
      }
    };
  }

  function analysisKind(target) {
    var value = text(target, 12000);
    if (/\s/.test(value)) return /[.!?。！？]\s*$/.test(value) || value.split(/\s+/).length > 7 ? 'sentence' : 'phrase';
    return 'word';
  }

  function dictionaryRequest(target, context, localDictionary) {
    context = context || {};
    localDictionary = localDictionary || {};
    var lexemeKey = text(localDictionary.lexemeKey, 300);
    return {
      requestType: 'dictionary',
      templateVersion: TEMPLATE_VERSION,
      source: { kind: 'reader-lookup', id: text(context.taskId || context.questionId || context.sourceId, 200) },
      lexemeKey: lexemeKey,
      input: {
        target: text(target, 12000),
        analysisKind: analysisKind(target),
        sentenceRu: text(context.sentenceRu, 12000),
        sentenceZh: text(context.sentenceZh, 12000),
        localDictionaryFound: localDictionary.found === true,
        localDictionary: {
          lemma: text(localDictionary.lemma, 500),
          partOfSpeech: text(localDictionary.partOfSpeech, 500),
          meaning: text(localDictionary.meaning, 5000),
          reliability: text(localDictionary.reliability, 200),
          lexemeKey: lexemeKey
        }
      }
    };
  }

  function createClient(options) {
    options = options || {};
    var fetchImpl = options.fetchImpl || (typeof fetch !== 'undefined' ? fetch.bind(globalThis) : null);
    var basePath = options.basePath || '/api/reader-ai';
    if (!fetchImpl) throw new TypeError('fetch is required');

    function post(path, body, signal, keepalive) {
      return fetchImpl(basePath + path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: signal,
        keepalive: Boolean(keepalive)
      }).then(function (response) {
        return response.json().catch(function () { return { ok: false, code: 'invalid_server_response', message: '本机服务返回了无法识别的内容。' }; })
          .then(function (payload) {
            if (!response.ok || !payload.ok) {
              var error = new Error(payload.message || 'AI 解析暂时不可用。');
              error.code = payload.code || 'request_failed';
              error.status = response.status;
              error.payload = payload;
              throw error;
            }
            return payload;
          });
      });
    }

    function start(request) {
      var clientRequestId = request.clientRequestId || createId();
      var body = Object.assign({}, request, { clientRequestId: clientRequestId });
      var controller = new AbortController();
      return {
        clientRequestId: clientRequestId,
        promise: post('/analyze', body, controller.signal, false),
        cancel: function () {
          controller.abort();
          return post('/cancel', { clientRequestId: clientRequestId }, undefined, true).catch(function () { return { ok: false }; });
        }
      };
    }

    return {
      start: start,
      recordPromptCopy: function (request) {
        var body = Object.assign({}, request, { clientRequestId: request.clientRequestId || createId(), deliveryMode: 'prompt_copy' });
        return post('/prompt-copy', body, undefined, true);
      },
      feedback: function (interactionId, value) {
        return post('/feedback', { interactionId: interactionId, feedback: value });
      }
    };
  }

  return {
    TEMPLATE_VERSION: TEMPLATE_VERSION,
    analysisKind: analysisKind,
    createClient: createClient,
    dictionaryRequest: dictionaryRequest,
    grammarRequest: grammarRequest,
    readingRequest: readingRequest
  };
});
