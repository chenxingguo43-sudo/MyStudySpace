(function(root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.VocabularySessionScheduler = api;
})(typeof window !== 'undefined' ? window : globalThis, function() {
  'use strict';

  function uniqueIds(ids) {
    var seen = {};
    return (Array.isArray(ids) ? ids : []).filter(function(id) {
      if (typeof id !== 'string' || !id || seen[id]) return false;
      seen[id] = true;
      return true;
    });
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function getLocalDateKey(date, timeZone) {
    var parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timeZone || 'Asia/Shanghai',
      year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(date || new Date());
    var map = {};
    parts.forEach(function(part) { map[part.type] = part.value; });
    return map.year + '-' + map.month + '-' + map.day;
  }

  function addDays(dateKey, days) {
    var parts = String(dateKey).split('-').map(Number);
    var date = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2] + days));
    return date.toISOString().slice(0, 10);
  }

  function normalizeSkillProfile(value) {
    var profile = value && typeof value === 'object' ? value : {};
    return {
      attempts: Number(profile.attempts || 0),
      successes: Number(profile.successes || 0),
      failures: Number(profile.failures || 0),
      streak: Number(profile.streak || 0),
      successfulDates: Array.isArray(profile.successfulDates) ? profile.successfulDates.slice(-8) : [],
      lastSeen: profile.lastSeen || null,
      lastSuccess: profile.lastSuccess || null,
      nextDue: profile.nextDue || null,
      stable: !!profile.stable,
      lastResponseMs: Number(profile.lastResponseMs || 0),
      replayed: !!profile.replayed
    };
  }

  function recordSkillAttempt(previous, outcome, options) {
    options = options || {};
    var today = options.today || getLocalDateKey();
    var profile = normalizeSkillProfile(previous);
    var success = outcome === 'known' || outcome === 'fuzzy';
    profile.attempts += 1;
    profile.lastSeen = options.reviewedAt || new Date().toISOString();
    profile.lastResponseMs = Math.max(0, Number(options.responseMs || 0));
    profile.replayed = !!options.replayed;

    if (success) {
      profile.successes += 1;
      profile.streak += 1;
      profile.lastSuccess = profile.lastSeen;
      if (profile.successfulDates.indexOf(today) < 0) profile.successfulDates.push(today);
      profile.successfulDates = profile.successfulDates.slice(-8);
      var firstDate = profile.successfulDates[0];
      var spanDays = firstDate ? Math.round((Date.parse(today + 'T00:00:00Z') - Date.parse(firstDate + 'T00:00:00Z')) / 86400000) : 0;
      profile.stable = profile.successfulDates.length >= 3 && spanDays >= 7;
      var intervals = outcome === 'fuzzy' ? [1, 1, 3, 7, 14] : [1, 3, 7, 14, 30, 60];
      var intervalIndex = Math.min(Math.max(0, profile.successfulDates.length - 1), intervals.length - 1);
      profile.nextDue = addDays(today, intervals[intervalIndex]);
    } else {
      profile.failures += 1;
      profile.streak = 0;
      profile.stable = false;
      profile.nextDue = addDays(today, 1);
    }
    return profile;
  }

  function normalizeExtras(value) {
    var extras = value && typeof value === 'object' ? value : {};
    return {
      fav: Array.isArray(extras.fav) ? extras.fav.filter(Boolean) : [],
      skip: Array.isArray(extras.skip) ? extras.skip.filter(Boolean) : [],
      report: Array.isArray(extras.report) ? extras.report.filter(Boolean) : []
    };
  }

  function normalizePartOfSpeech(value) {
    var aliases = { adj: 'adjective', adjective: 'adjective', adv: 'adverb', adverb: 'adverb' };
    var normalized = String(value || '').trim().toLowerCase();
    return aliases[normalized] || normalized;
  }

  function isFunctionWord(value) {
    return ['particle', 'pronoun', 'numeral', 'preposition', 'conjunction', 'interjection'].indexOf(normalizePartOfSpeech(value)) >= 0;
  }

  function scheduleLongTerm(previous, rating, options) {
    options = options || {};
    var today = options.today || getLocalDateKey();
    var record = Object.assign({
      state: 'new', mastery: 1, interval: 0, easeFactor: 2.5,
      nextReview: null, reps: 0, lapses: 0, lastReview: null, firstSeen: null, history: []
    }, previous || {});
    var hadFailure = !!options.hadFailure;
    record.reps = (record.reps || 0) + 1;
    record.history = Array.isArray(record.history) ? record.history : [];
    record.history.push({ date: today, rating: rating });
    if (record.history.length > 40) record.history = record.history.slice(-40);
    record.lastReview = options.lastReview || new Date().toISOString();
    if (!record.firstSeen) record.firstSeen = record.lastReview;

    if (rating === 'unknown' || rating === 1) {
      record.state = 'relearning';
      record.mastery = 1;
      record.lapses = (record.lapses || 0) + 1;
      record.interval = 1;
      record.easeFactor = Math.max(1.3, Number(record.easeFactor || 2.5) - 0.2);
    } else if (rating === 'fuzzy' || rating === 3) {
      record.state = hadFailure ? 'relearning' : 'review';
      record.mastery = 3;
      record.interval = Math.max(1, Math.round(Math.max(1, Number(record.interval || 1)) * 1.2));
      record.easeFactor = Math.max(1.3, Number(record.easeFactor || 2.5) - 0.1);
    } else if (hadFailure) {
      // A later correct answer must never turn an earlier lapse into a long interval.
      record.state = 'relearning';
      record.mastery = 5;
      record.interval = 1;
      record.easeFactor = Math.max(1.3, Number(record.easeFactor || 2.5) - 0.1);
    } else {
      record.state = 'review';
      record.mastery = 5;
      var interval = Number(record.interval || 0);
      record.interval = interval <= 0 ? 1 : (interval <= 1 ? 3 : Math.round(interval * Number(record.easeFactor || 2.5)));
      record.easeFactor = Math.min(3, Number(record.easeFactor || 2.5) + 0.05);
    }
    record.nextReview = addDays(today, record.interval);
    return record;
  }

  function BrushSession(ids, options) {
    options = options || {};
    this.ids = uniqueIds(ids);
    this.mainQueue = this.ids.slice();
    this.retryQueue = [];
    this.known = {};
    this.retryCounts = {};
    this.excluded = {};
    this.seenCount = 0;
    this.currentId = null;
    this.retryDelay = Math.max(2, Number(options.retryDelay || 8));
    this.normalRetryDelays = Array.isArray(options.normalRetryDelays) ? options.normalRetryDelays.slice() : [12, 24];
    this.priorityRetryDelays = Array.isArray(options.priorityRetryDelays) ? options.priorityRetryDelays.slice() : [8, 16];
    this.maxFailures = Math.max(1, Number(options.maxFailures || 3));
    this.priority = {};
    uniqueIds(options.priorityIds).forEach(function(id) { this.priority[id] = true; }, this);
    this.onePass = 0;
    this.afterRetry = 0;
    this.totalRetries = 0;
    this.deferred = {};
  }

  BrushSession.prototype.next = function() {
    if (this.currentId) return this.currentId;
    var index = this.retryQueue.findIndex(function(item) { return item.readyAfterSeen <= this.seenCount && !this.excluded[item.id]; }, this);
    var item = index >= 0 ? this.retryQueue.splice(index, 1)[0] : null;
    var id = item && !this.known[item.id] ? item.id : null;
    while (!id && this.mainQueue.length) {
      var candidate = this.mainQueue.shift();
      if (!this.known[candidate] && !this.excluded[candidate]) id = candidate;
    }
    if (!id && this.retryQueue.length) {
      // The main queue is empty: do not strand a retry merely because no other cards remain.
      this.retryQueue.sort(function(a, b) { return a.readyAfterSeen - b.readyAfterSeen; });
      var forced = this.retryQueue.shift();
      if (forced && !this.known[forced.id] && !this.excluded[forced.id]) id = forced.id;
    }
    if (!id) return null;
    this.currentId = id;
    this.seenCount += 1;
    return id;
  };

  BrushSession.prototype.rate = function(id, rating) {
    if (!id || id !== this.currentId || this.known[id] || this.deferred[id]) return { ignored: true };
    var retries = this.retryCounts[id] || 0;
    this.currentId = null;
    if (rating === 'known') {
      this.known[id] = true;
      if (retries > 0) this.afterRetry += 1;
      else this.onePass += 1;
      return { graduated: true, retried: retries > 0 };
    }
    this.retryCounts[id] = retries + 1;
    this.totalRetries += 1;
    if (this.retryCounts[id] >= this.maxFailures) {
      this.deferred[id] = true;
      return { graduated: false, difficult: true, deferred: true, retried: true };
    }
    var delays = this.priority[id] ? this.priorityRetryDelays : this.normalRetryDelays;
    var delay = Number(delays[Math.min(retries, delays.length - 1)] || this.retryDelay);
    var retryAfterSeen = this.seenCount + Math.max(2, delay);
    this.retryQueue.push({ id: id, readyAfterSeen: retryAfterSeen });
    this.retryQueue.sort(function(a, b) { return a.readyAfterSeen - b.readyAfterSeen; });
    return { graduated: false, retryAfterSeen: retryAfterSeen, retried: true };
  };

  BrushSession.prototype.done = function() {
    var activeTotal = this.ids.length - Object.keys(this.excluded).length;
    var completed = Object.keys(this.known).filter(function(id) { return !this.excluded[id]; }, this).length +
      Object.keys(this.deferred).filter(function(id) { return !this.excluded[id]; }, this).length;
    return activeTotal > 0 && completed === activeTotal && !this.currentId;
  };

  BrushSession.prototype.discard = function(id) {
    if (!id || this.ids.indexOf(id) < 0 || this.known[id]) return false;
    this.excluded[id] = true;
    this.mainQueue = this.mainQueue.filter(function(candidate) { return candidate !== id; });
    this.retryQueue = this.retryQueue.filter(function(item) { return item.id !== id; });
    if (this.currentId === id) this.currentId = null;
    return true;
  };

  BrushSession.prototype.stats = function() {
    var activeTotal = this.ids.length - Object.keys(this.excluded).length;
    var known = Object.keys(this.known).filter(function(id) { return !this.excluded[id]; }, this).length;
    var difficult = Object.keys(this.deferred).filter(function(id) { return !this.excluded[id]; }, this).length;
    return {
      total: activeTotal,
      known: known,
      difficult: difficult,
      completed: known + difficult,
      queued: this.retryQueue.length,
      unseen: this.mainQueue.length,
      seen: this.seenCount,
      onePass: this.onePass,
      afterRetry: this.afterRetry,
      totalRetries: this.totalRetries,
      progress: activeTotal ? Math.round((known + difficult) / activeTotal * 100) : 0
    };
  };

  BrushSession.prototype.snapshot = function() {
    return clone({
      mainQueue: this.mainQueue, retryQueue: this.retryQueue, known: this.known,
      retryCounts: this.retryCounts, excluded: this.excluded, deferred: this.deferred, seenCount: this.seenCount, currentId: this.currentId,
      onePass: this.onePass, afterRetry: this.afterRetry, totalRetries: this.totalRetries
    });
  };

  BrushSession.prototype.restore = function(snapshot) {
    if (!snapshot || typeof snapshot !== 'object') return false;
    this.mainQueue = clone(snapshot.mainQueue || []);
    this.retryQueue = clone(snapshot.retryQueue || []);
    this.known = clone(snapshot.known || {});
    this.retryCounts = clone(snapshot.retryCounts || {});
    this.excluded = clone(snapshot.excluded || {});
    this.deferred = clone(snapshot.deferred || {});
    this.seenCount = Number(snapshot.seenCount || 0);
    this.currentId = snapshot.currentId || null;
    this.onePass = Number(snapshot.onePass || 0);
    this.afterRetry = Number(snapshot.afterRetry || 0);
    this.totalRetries = Number(snapshot.totalRetries || 0);
    return true;
  };

  function ReviewSession(ids, options) {
    options = options || {};
    this.ids = uniqueIds(ids);
    this.mainQueue = this.ids.slice();
    this.delayedQueue = [];
    this.cards = {};
    this.currentId = null;
    this.seenCount = 0;
    this.leechThreshold = Number(options.leechThreshold || 3);
  }

  ReviewSession.prototype._card = function(id) {
    if (!this.cards[id]) this.cards[id] = { id: id, failCount: 0, fuzzyCount: 0, goodStreak: 0, passed: false, difficult: false };
    return this.cards[id];
  };

  ReviewSession.prototype._enqueue = function(card, delay, reason) {
    card.readyAfterSeen = this.seenCount + delay;
    this.delayedQueue.push({ id: card.id, readyAfterSeen: card.readyAfterSeen, reason: reason });
    this.delayedQueue.sort(function(a, b) { return a.readyAfterSeen - b.readyAfterSeen; });
  };

  ReviewSession.prototype.next = function() {
    if (this.currentId) return this.currentId;
    var index = this.delayedQueue.findIndex(function(item) { return item.readyAfterSeen <= this.seenCount; }, this);
    var item = index >= 0 ? this.delayedQueue.splice(index, 1)[0] : null;
    var id = item ? item.id : null;
    while (!id && this.mainQueue.length) {
      var candidate = this.mainQueue.shift();
      var card = this._card(candidate);
      if (!card.passed && !card.difficult) id = candidate;
    }
    if (!id && this.delayedQueue.length) id = this.delayedQueue.shift().id;
    if (!id) return null;
    this.currentId = id;
    this.seenCount += 1;
    return id;
  };

  ReviewSession.prototype.rate = function(id, rating) {
    if (!id || id !== this.currentId) return { ignored: true };
    var card = this._card(id);
    this.currentId = null;
    if (rating === 'unknown') {
      card.failCount += 1;
      card.goodStreak = 0;
      if (card.failCount >= this.leechThreshold) {
        card.difficult = true;
        return { graduated: false, difficult: true, reason: 'difficult' };
      }
      this._enqueue(card, Math.min(2 + card.failCount, 6), 'unknown');
      return { graduated: false, requeued: true, reason: 'unknown' };
    }
    if (rating === 'fuzzy') {
      card.fuzzyCount += 1;
      card.goodStreak = 0;
      this._enqueue(card, Math.min(5 + card.fuzzyCount * 2, 12), 'fuzzy');
      return { graduated: false, requeued: true, reason: 'fuzzy' };
    }
    card.goodStreak += 1;
    if ((card.failCount > 0 || card.fuzzyCount > 0) && card.goodStreak < 2) {
      this._enqueue(card, 6, 'confirmation');
      return { graduated: false, requeued: true, reason: 'confirmation' };
    }
    card.passed = true;
    return { graduated: true, hadFailure: card.failCount > 0 || card.fuzzyCount > 0 };
  };

  ReviewSession.prototype.stats = function() {
    var cards = Object.keys(this.cards).map(function(id) { return this.cards[id]; }, this);
    var passed = cards.filter(function(card) { return card.passed; }).length;
    var difficult = cards.filter(function(card) { return card.difficult && !card.passed; }).length;
    return {
      total: this.ids.length,
      passed: passed,
      difficult: difficult,
      queued: this.delayedQueue.length,
      seen: this.seenCount,
      progress: this.ids.length ? Math.round((passed + difficult) / this.ids.length * 100) : 0
    };
  };

  return {
    BrushSession: BrushSession,
    ReviewSession: ReviewSession,
    getLocalDateKey: getLocalDateKey,
    normalizeExtras: normalizeExtras,
    normalizePartOfSpeech: normalizePartOfSpeech,
    isFunctionWord: isFunctionWord,
    normalizeSkillProfile: normalizeSkillProfile,
    recordSkillAttempt: recordSkillAttempt,
    scheduleLongTerm: scheduleLongTerm
  };
});
