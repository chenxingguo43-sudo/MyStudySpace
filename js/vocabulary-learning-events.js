(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.BelyeNochiVocabularyLearningEvents = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const POS_ALIASES = Object.freeze({
    adj: 'adjective', adv: 'adverb',
    '名词': 'noun', '专有名词': 'noun', 'proper noun': 'noun',
    '动词': 'verb', '形容词': 'adjective', '副词': 'adverb',
    '代词': 'pronoun', '数词': 'numeral', '前置词': 'preposition',
    '连词': 'conjunction', '语气词': 'particle', '小品词': 'particle',
    '感叹词': 'interjection', '状态词': 'predicative', '其他': 'other'
  });
  const FORMAL_PARTS_OF_SPEECH = new Set([
    'noun', 'verb', 'adjective', 'adverb', 'pronoun', 'numeral',
    'preposition', 'conjunction', 'particle', 'interjection', 'predicative', 'other'
  ]);
  const MODE_SKILLS = Object.freeze({
    visual: 'meaning_recognition',
    audio: 'listening_recognition',
    output: 'form_recall'
  });
  const RAW_RESULTS = new Set(['unknown', 'fuzzy', 'known']);

  function cleanText(value, maxLength) {
    return String(value || '').replace(/\s+/g, ' ').trim().slice(0, maxLength || 500);
  }

  function normalizeLemma(value) {
    const lemma = String(value || '')
      .normalize('NFD')
      .replace(/[\u0300\u0301]/g, '')
      .normalize('NFC')
      .trim()
      .replace(/\s+/g, ' ')
      .toLowerCase();
    return /^[а-яё]+(?:[- ][а-яё]+)*$/i.test(lemma) ? lemma : '';
  }

  function normalizePartOfSpeech(value) {
    const raw = cleanText(value, 40).toLowerCase();
    const normalized = POS_ALIASES[raw] || raw;
    return FORMAL_PARTS_OF_SPEECH.has(normalized) ? normalized : '';
  }

  function resolveFormalIdentity(word) {
    const value = word && typeof word === 'object' ? word : {};
    const lemma = normalizeLemma(value.lemma || value.word);
    const partOfSpeech = normalizePartOfSpeech(value.partOfSpeech || value.type);
    if (!lemma || !partOfSpeech) return null;
    const lexemeKey = `ru:${lemma}|${partOfSpeech}`;
    return {
      identityKey: lexemeKey,
      lexemeKey,
      lemma,
      partOfSpeech,
      surfaceForm: cleanText(value.word || lemma, 120)
    };
  }

  function localDateKey(date, timeZone) {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timeZone || 'Asia/Shanghai',
      year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(date);
    const values = {};
    parts.forEach(part => { values[part.type] = part.value; });
    return `${values.year}-${values.month}-${values.day}`;
  }

  function reviewPrompt(word, mode) {
    if (mode === 'output') return { kind: 'meaning', value: cleanText(word.meaning, 500) };
    if (mode === 'audio') return { kind: 'audio', value: cleanText(word.word, 120) };
    return { kind: 'word', value: cleanText(word.word, 120) };
  }

  function reviewAnswer(word, mode, rawResult) {
    return {
      learnerRating: rawResult,
      referenceKind: mode === 'output' ? 'word' : 'meaning',
      referenceValue: cleanText(mode === 'output' ? word.word : word.meaning, 500)
    };
  }

  function createRecorder(options) {
    const settings = options || {};
    const store = settings.store;
    if (!store || typeof store.ensureReviewIdentity !== 'function' || typeof store.recordEvents !== 'function') {
      throw new TypeError('learning event store is required');
    }
    const syncClient = settings.syncClient || null;
    const projectionClient = settings.projectionClient || null;
    const now = settings.now || function () { return new Date(); };
    const timeZone = settings.timeZone || 'Asia/Shanghai';

    function currentDate() {
      const value = now();
      const date = value instanceof Date ? value : new Date(value);
      if (Number.isNaN(date.getTime())) throw new TypeError('now must return a valid date');
      return date;
    }

    async function recordReview(input) {
      const value = input || {};
      const word = value.word && typeof value.word === 'object' ? value.word : {};
      const formal = resolveFormalIdentity(word);
      if (!formal) return { skipped: true, reason: 'formal_identity_unavailable' };
      const mode = MODE_SKILLS[value.mode] ? value.mode : 'visual';
      const skill = MODE_SKILLS[mode];
      const rawResult = RAW_RESULTS.has(value.rawResult) ? value.rawResult : '';
      if (!rawResult) throw new TypeError('review rawResult must be unknown, fuzzy, or known');
      if (typeof value.answerRevealedBeforeResponse !== 'boolean') {
        throw new TypeError('answerRevealedBeforeResponse must be boolean');
      }

      const preferredIdentity = value.learningIdentity || word.learningIdentity || null;
      const identity = await store.ensureReviewIdentity(formal.identityKey, skill, preferredIdentity);
      const occurredAt = value.occurredAt ? new Date(value.occurredAt) : currentDate();
      if (Number.isNaN(occurredAt.getTime())) throw new TypeError('occurredAt must be a valid date');
      const occurredAtIso = occurredAt.toISOString();
      const localDate = value.localDate || localDateKey(occurredAt, timeZone);
      const previousAttempts = await store.reviewAttempts(identity.reviewUnitId, '');
      const sameDayAttemptIndex = previousAttempts.filter(function (event) {
        return event.context && event.context.localDate === localDate;
      }).length + 1;
      const previous = previousAttempts[previousAttempts.length - 1];
      const elapsedDays = previous
        ? Math.max(0, (occurredAt.getTime() - Date.parse(previous.occurredAt)) / 86400000)
        : 0;
      const source = {
        module: 'vocabulary',
        contentId: cleanText(word.id || formal.lexemeKey, 240),
        location: { mode, source: cleanText(word.source, 80) }
      };
      const subject = {
        surfaceForm: formal.surfaceForm,
        lexemeKey: formal.lexemeKey,
        unresolvedLexemeId: null,
        senseId: identity.senseId,
        reviewUnitId: identity.reviewUnitId
      };
      const events = [];
      const shouldAdd = Boolean(value.isNew) && !(await store.vocabularyAdditionActive(identity.senseId));
      if (shouldAdd) {
        events.push({
          eventType: 'vocabulary_entry_added',
          occurredAt: occurredAtIso,
          source,
          subject: { ...subject, reviewUnitId: null },
          context: { localDate, legacyWordId: cleanText(word.id, 1000) },
          evidence: { kind: 'learner_confirmed', strength: 'strong', quality: 'accepted' },
          payload: {
            addMethod: cleanText(value.addMethod || 'vocabulary_first_review', 80),
            initialSenseId: identity.senseId,
            lookupEventId: null
          }
        });
      }
      events.push({
        eventType: 'review_attempt_completed',
        occurredAt: occurredAtIso,
        source,
        subject,
        context: {
          localDate,
          skill,
          legacyWordId: cleanText(word.id, 1000),
          legacySessionKind: cleanText(value.sessionKind, 80)
        },
        evidence: { kind: 'learner_confirmed', strength: 'strong', quality: 'accepted' },
        payload: {
          testMode: mode,
          questionSnapshot: value.questionSnapshot || reviewPrompt(word, mode),
          answerSnapshot: value.answerSnapshot || reviewAnswer(word, mode, rawResult),
          rawResult,
          answerRevealedBeforeResponse: value.answerRevealedBeforeResponse,
          hintType: cleanText(value.hintType, 80),
          responseMs: Math.max(0, Math.round(Number(value.responseMs || 0))),
          sameDayAttemptIndex,
          elapsedDays: Number(elapsedDays.toFixed(6))
        }
      });

      const savedEvents = await store.recordEvents(events);
      if (projectionClient && typeof projectionClient.rebuild === 'function') {
        try { await projectionClient.rebuild(); } catch (_projectionError) {}
      }
      if (syncClient && typeof syncClient.kick === 'function') syncClient.kick();
      return {
        skipped: false,
        identity: {
          lexemeKey: formal.lexemeKey,
          senseId: identity.senseId,
          reviewUnitId: identity.reviewUnitId,
          skill
        },
        events: savedEvents,
        added: shouldAdd,
        reviewEvent: savedEvents[savedEvents.length - 1]
      };
    }

    async function recordUndo(input) {
      const value = input || {};
      const originals = (Array.isArray(value.events) ? value.events : []).filter(function (event) {
        return event && event.eventId && (event.eventType === 'vocabulary_entry_added' || event.eventType === 'review_attempt_completed');
      });
      if (!originals.length) return { skipped: true, reason: 'no_learning_events' };
      const occurredAt = currentDate().toISOString();
      const corrections = originals.map(function (event) {
        return {
          eventType: 'evidence_corrected',
          occurredAt,
          source: event.source,
          subject: event.subject,
          context: {
            localDate: localDateKey(new Date(occurredAt), timeZone),
            action: 'undo',
            correctedEventType: event.eventType
          },
          evidence: { kind: 'learner_confirmed', strength: 'strong', quality: 'accepted' },
          payload: {
            correctedFields: ['evidence.quality'],
            oldValueSummary: 'accepted',
            newValue: 'excluded',
            reason: cleanText(value.reason || 'vocabulary_rating_undone', 240)
          },
          correctsEventId: event.eventId
        };
      });
      const savedEvents = await store.recordEvents(corrections);
      if (projectionClient && typeof projectionClient.rebuild === 'function') {
        try { await projectionClient.rebuild(); } catch (_projectionError) {}
      }
      if (syncClient && typeof syncClient.kick === 'function') syncClient.kick();
      return { skipped: false, events: savedEvents };
    }

    return { recordReview, recordUndo };
  }

  return {
    FORMAL_PARTS_OF_SPEECH,
    MODE_SKILLS,
    createRecorder,
    localDateKey,
    normalizeLemma,
    normalizePartOfSpeech,
    resolveFormalIdentity
  };
});
