(function (root, factory) {
  const VocabularyEvents = typeof module === 'object' && module.exports
    ? require('./vocabulary-learning-events')
    : root.BelyeNochiVocabularyLearningEvents;
  const api = factory(VocabularyEvents);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.BelyeNochiReaderLearningEvents = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (VocabularyEvents) {
  'use strict';

  if (!VocabularyEvents) throw new Error('BelyeNochiVocabularyLearningEvents is required');

  const RELIABLE_MATCHES = new Set([
    'reviewed-function-form', 'morphology-map', 'dictionary-exact', 'personally-reviewed'
  ]);

  function cleanText(value, maxLength) {
    return String(value || '').replace(/\s+/g, ' ').trim().slice(0, maxLength || 500);
  }

  function normalizeSurface(value) {
    const surface = String(value || '')
      .normalize('NFD')
      .replace(/[\u0300\u0301]/g, '')
      .normalize('NFC')
      .trim()
      .toLowerCase();
    return /^[а-яё]+(?:-[а-яё]+)*$/i.test(surface) ? surface : '';
  }

  function uniqueCandidates(values) {
    const seen = new Set();
    return (Array.isArray(values) ? values : []).map(normalizeSurface).filter(function (value) {
      if (!value || seen.has(value)) return false;
      seen.add(value);
      return true;
    }).slice(0, 20);
  }

  function sourceFromContext(context) {
    const value = context && typeof context === 'object' ? context : {};
    const location = {
      bookId: cleanText(value.bookId, 120),
      moduleId: cleanText(value.moduleId, 120),
      taskId: cleanText(value.taskId, 120),
      regionType: cleanText(value.regionType, 80),
      sourceLabel: cleanText(value.sourceLabel, 160),
      sourcePages: Array.isArray(value.sourcePages) ? value.sourcePages.slice(0, 20) : []
    };
    return {
      module: 'reader',
      contentId: location.taskId || location.moduleId || location.bookId || 'reader',
      location
    };
  }

  function formalLemma(input) {
    const value = input || {};
    const raw = value.raw && typeof value.raw === 'object' ? value.raw : {};
    const display = cleanText(raw.lemma || raw.display, 120);
    return normalizeSurface(display) || normalizeSurface(value.lemma);
  }

  function resolveLookupIdentity(input) {
    const value = input || {};
    const surfaceForm = normalizeSurface(value.surfaceForm || value.queryForm);
    const candidates = uniqueCandidates([value.lemma].concat(value.lemmaCandidates || []));
    const partOfSpeech = value.partOfSpeech || value.type || '';
    const reliability = cleanText(value.reliability, 80);
    const formal = RELIABLE_MATCHES.has(reliability)
      ? VocabularyEvents.resolveFormalIdentity({
          word: surfaceForm,
          lemma: formalLemma(value),
          type: partOfSpeech
        })
      : null;
    return formal
      ? { kind: 'formal', formal, candidates }
      : { kind: 'unresolved', surfaceForm, candidates };
  }

  function createRecorder(options) {
    const settings = options || {};
    const store = settings.store;
    if (!store || typeof store.ensureReviewIdentity !== 'function' || typeof store.ensureUnresolvedIdentity !== 'function' || typeof store.recordEvent !== 'function') {
      throw new TypeError('learning event store is required');
    }
    const syncClient = settings.syncClient || null;
    const now = settings.now || function () { return new Date(); };
    const dedupeWindowMs = Math.max(1000, Number(settings.dedupeWindowMs || 15000));
    const recentLookups = new Map();

    function currentDate() {
      const value = now();
      const date = value instanceof Date ? value : new Date(value);
      if (Number.isNaN(date.getTime())) throw new TypeError('now must return a valid date');
      return date;
    }

    function kick() {
      if (syncClient && typeof syncClient.kick === 'function') syncClient.kick();
    }

    function unresolvedKey(identity, context) {
      const source = sourceFromContext(context);
      return [
        identity.surfaceForm,
        identity.candidates.join(','),
        source.contentId,
        source.location.taskId,
        cleanText(context && context.sentenceRu, 500)
      ].join('|');
    }

    async function subjectFor(input, context) {
      const identity = resolveLookupIdentity(input);
      if (identity.kind === 'formal') {
        return {
          identity,
          subject: {
            surfaceForm: identity.formal.surfaceForm,
            lexemeKey: identity.formal.lexemeKey,
            unresolvedLexemeId: null,
            senseId: null,
            reviewUnitId: null
          }
        };
      }
      if (!identity.surfaceForm) throw new TypeError('a Russian lookup form is required');
      const unresolved = await store.ensureUnresolvedIdentity(unresolvedKey(identity, context || {}));
      return {
        identity: { ...identity, unresolvedLexemeId: unresolved.unresolvedLexemeId },
        subject: {
          surfaceForm: identity.surfaceForm,
          lexemeKey: null,
          unresolvedLexemeId: unresolved.unresolvedLexemeId,
          senseId: null,
          reviewUnitId: null
        }
      };
    }

    function dedupeKey(eventType, subject, source, context) {
      return [
        eventType,
        subject.lexemeKey || subject.unresolvedLexemeId,
        source.contentId,
        JSON.stringify(source.location),
        cleanText(context.sentenceSnapshot, 500)
      ].join('|');
    }

    async function recordLookup(input) {
      const value = input || {};
      const succeeded = Boolean(value.succeeded);
      const contextInput = value.context && typeof value.context === 'object' ? value.context : {};
      const resolved = await subjectFor(value, contextInput);
      const source = sourceFromContext(contextInput);
      const eventType = succeeded ? 'dictionary_lookup_succeeded' : 'dictionary_lookup_missed';
      const eventContext = {
        sentenceSnapshot: cleanText(contextInput.sentenceRu, 500),
        translationSnapshot: cleanText(contextInput.sentenceZh, 500),
        meaningSnapshot: succeeded ? cleanText(value.meaning, 2000) : ''
      };
      const key = dedupeKey(eventType, resolved.subject, source, eventContext);
      const timestamp = currentDate();
      const recent = recentLookups.get(key);
      if (recent && timestamp.getTime() - recent.at < dedupeWindowMs) {
        return { skipped: true, reason: 'short_window_duplicate', event: recent.event, identity: resolved.identity };
      }
      const event = await store.recordEvent({
        eventType,
        occurredAt: timestamp.toISOString(),
        source,
        subject: resolved.subject,
        context: eventContext,
        evidence: { kind: 'objective', strength: 'neutral', quality: 'accepted' },
        payload: succeeded ? {
          queryForm: cleanText(value.queryForm || value.surfaceForm, 120),
          matchMethod: cleanText(value.reliability || 'dictionary-result', 80),
          displayedMeaning: cleanText(value.meaning, 2000),
          guessFirstMode: Boolean(value.guessFirstMode)
        } : {
          queryForm: cleanText(value.queryForm || value.surfaceForm, 120),
          failureCategory: cleanText(value.failureCategory || 'definition_not_found', 80),
          lemmaCandidates: resolved.identity.candidates
        }
      });
      recentLookups.set(key, { at: timestamp.getTime(), event });
      if (recentLookups.size > 100) {
        recentLookups.forEach(function (item, itemKey) {
          if (timestamp.getTime() - item.at >= dedupeWindowMs) recentLookups.delete(itemKey);
        });
      }
      kick();
      return { skipped: false, event, identity: resolved.identity };
    }

    async function recordVocabularyAddition(input) {
      const value = input || {};
      const contextInput = value.context && typeof value.context === 'object' ? value.context : {};
      const resolved = await subjectFor(value, contextInput);
      const source = sourceFromContext(contextInput);
      const lookupEvent = value.lookupEvent && value.lookupEvent.eventId ? value.lookupEvent : null;
      let subject = resolved.subject;
      let identityResult;
      let eventType;
      let payload;

      if (resolved.identity.kind === 'formal') {
        const identity = await store.ensureReviewIdentity(
          resolved.identity.formal.lexemeKey,
          'meaning_recognition',
          value.learningIdentity || null
        );
        if (await store.vocabularyAdditionActive(identity.senseId)) {
          return {
            skipped: true,
            reason: 'already_added',
            identity: {
              lexemeKey: resolved.identity.formal.lexemeKey,
              senseId: identity.senseId,
              reviewUnitId: identity.reviewUnitId,
              skill: 'meaning_recognition'
            }
          };
        }
        subject = { ...subject, senseId: identity.senseId };
        identityResult = {
          lexemeKey: resolved.identity.formal.lexemeKey,
          senseId: identity.senseId,
          reviewUnitId: identity.reviewUnitId,
          skill: 'meaning_recognition'
        };
        eventType = 'vocabulary_entry_added';
        payload = {
          addMethod: cleanText(value.addMethod || 'reader_save_button', 80),
          initialSenseId: identity.senseId,
          lookupEventId: lookupEvent ? lookupEvent.eventId : null
        };
      } else {
        identityResult = {
          unresolvedLexemeId: resolved.identity.unresolvedLexemeId,
          status: 'pending_resolution'
        };
        eventType = 'vocabulary_entry_pending_resolution';
        payload = {
          addMethod: cleanText(value.addMethod || 'reader_save_button', 80),
          lookupEventId: lookupEvent ? lookupEvent.eventId : null,
          lemmaCandidates: resolved.identity.candidates
        };
      }

      const event = await store.recordEvent({
        eventType,
        source,
        subject,
        context: {
          sentenceSnapshot: cleanText(contextInput.sentenceRu, 500),
          translationSnapshot: cleanText(contextInput.sentenceZh, 500),
          meaningSnapshot: cleanText(value.meaning, 2000)
        },
        evidence: { kind: 'learner_confirmed', strength: 'strong', quality: 'accepted' },
        payload
      });
      kick();
      return { skipped: false, event, identity: identityResult };
    }

    return { recordLookup, recordVocabularyAddition, resolveLookupIdentity };
  }

  return {
    RELIABLE_MATCHES,
    createRecorder,
    normalizeSurface,
    resolveLookupIdentity,
    sourceFromContext
  };
});
