'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { performance } = require('node:perf_hooks');
const {
  createOpenAiCompatibleProvider,
  validateSpeaking
} = require('../server/reader-ai-provider');

const CASES_PATH = path.join(__dirname, '..', 'tests', 'fixtures', 'speaking-llm-benchmark.json');
const CASES = JSON.parse(fs.readFileSync(CASES_PATH, 'utf8'));

function sentenceCount(value) {
  return String(value || '').split(/[.!?。！？]+/).map(item => item.trim()).filter(Boolean).length;
}

function offlineAnswer(testCase) {
  const common = {
    subtitleZh: '',
    clarification: { needed: false, questionZh: '' },
    correction: { type: 'none', originalRu: '', naturalRu: '', explanationZh: '' },
    scaffold: { keywords: [], sentenceFrame: '', fullSuggestion: '' }
  };
  if (testCase.id === 'dual-asr-clarification-01') {
    return {
      ...common,
      replyRu: 'Я хочу продолжить разговор о музее.',
      questionRu: 'Какое слово вы хотели сказать в конце?',
      clarification: { needed: true, questionZh: '最后一个词我没有听清，可以再说一次吗？' },
      ttsSegments: [
        { role: 'reply', textRu: 'Я хочу продолжить разговор о музее.' },
        { role: 'question', textRu: 'Какое слово вы хотели сказать в конце?' }
      ]
    };
  }
  if (testCase.id === 'chinese-scaffold-01') {
    return {
      ...common,
      replyRu: 'В кафе можно сказать: «Я хочу горячий чай».',
      questionRu: 'Попробуете сказать эту фразу сами?',
      scaffold: {
        keywords: ['горячий чай'],
        sentenceFrame: 'Я хочу + напиток.',
        fullSuggestion: 'Я хочу горячий чай, пожалуйста.'
      },
      ttsSegments: [
        { role: 'reply', textRu: 'В кафе можно сказать: «Я хочу горячий чай».' },
        { role: 'question', textRu: 'Попробуете сказать эту фразу сами?' }
      ]
    };
  }
  if (testCase.id === 'b2-guided-task-01') {
    return {
      ...common,
      replyRu: 'Начните с причины и приведите один пример. Можно использовать слова «общество» и «опыт».',
      questionRu: 'Какая причина кажется вам самой важной?',
      scaffold: {
        keywords: ['общество', 'опыт'],
        sentenceFrame: 'Я считаю, что ..., потому что ...',
        fullSuggestion: 'Я считаю, что волонтёрская работа полезна, потому что она даёт опыт.'
      },
      ttsSegments: [
        { role: 'reply', textRu: 'Начните с причины и приведите один пример.' },
        { role: 'question', textRu: 'Какая причина кажется вам самой важной?' }
      ]
    };
  }
  if (testCase.id === 'deferred-correction-01') {
    return {
      ...common,
      replyRu: 'Понятно. Расскажите, какие путешествия вам особенно запомнились?',
      questionRu: 'Куда вы хотели бы поехать ещё раз?',
      correction: {
        type: 'recast',
        originalRu: 'интересуюсь путешествия',
        naturalRu: 'интересуюсь путешествиями',
        explanationZh: 'интересоваться 后面通常使用工具格。'
      },
      ttsSegments: [
        { role: 'reply', textRu: 'Понятно. Расскажите, какие путешествия вам особенно запомнились?' },
        { role: 'question', textRu: 'Куда вы хотели бы поехать ещё раз?' }
      ]
    };
  }
  return {
    ...common,
    replyRu: 'Звучит интересно. Расскажите об этом подробнее.',
    questionRu: 'Что вам понравилось больше всего?',
    ttsSegments: [
      { role: 'reply', textRu: 'Звучит интересно. Расскажите об этом подробнее.' },
      { role: 'question', textRu: 'Что вам понравилось больше всего?' }
    ]
  };
}

function scoreCase(testCase, answer) {
  const errors = [];
  let normalized;
  try {
    normalized = validateSpeaking(answer);
  } catch (error) {
    return { passed: false, errors: [error.message], metrics: null, answer: answer || null };
  }
  const expectations = testCase.expectations || {};
  const replySentences = sentenceCount(normalized.replyRu);
  const correctionCount = normalized.correction.type === 'none' ? 0 : 1;
  if (expectations.mustContainCyrillic && !/[А-Яа-яЁё]/.test(normalized.replyRu)) errors.push('replyRu 缺少俄语西里尔字母');
  if (expectations.mustAskQuestion && !normalized.questionRu) errors.push('缺少推动用户继续说的 questionRu');
  if (expectations.mustAskClarification === true && !normalized.clarification.needed) errors.push('不确定语料没有触发澄清');
  if (expectations.mustAskClarification === false && normalized.clarification.needed) errors.push('确定语料不应主动增加澄清');
  if (expectations.mustOfferScaffold && !(
    normalized.scaffold.keywords.length || normalized.scaffold.sentenceFrame || normalized.scaffold.fullSuggestion
  )) errors.push('需要支架的案例没有提供 scaffold');
  if (Number.isFinite(expectations.maxReplySentences) && replySentences > expectations.maxReplySentences) {
    errors.push('replyRu 超过 ' + expectations.maxReplySentences + ' 句');
  }
  if (Number.isFinite(expectations.maxCorrections) && correctionCount > expectations.maxCorrections) {
    errors.push('纠错数量超过 ' + expectations.maxCorrections + ' 条');
  }
  return {
    passed: errors.length === 0,
    errors,
    metrics: {
      replySentences,
      correctionCount,
      clarification: normalized.clarification.needed,
      scaffold: Boolean(normalized.scaffold.keywords.length || normalized.scaffold.sentenceFrame || normalized.scaffold.fullSuggestion),
      ttsSegments: normalized.ttsSegments.length
    },
    answer: normalized
  };
}

async function runBenchmark(options = {}) {
  const cases = options.cases || CASES;
  const analyze = options.analyze || (async testCase => ({ answer: offlineAnswer(testCase), model: 'offline-contract-fixture', usage: null }));
  const candidateId = options.candidateId || 'offline-contract-fixture';
  const startedAt = performance.now();
  const results = [];
  for (const testCase of cases) {
    const caseStartedAt = performance.now();
    try {
      const response = await analyze(testCase);
      const scored = scoreCase(testCase, response && response.answer);
      results.push({
        id: testCase.id,
        title: testCase.title,
        passed: scored.passed,
        errors: scored.errors,
        metrics: scored.metrics,
        answer: scored.answer,
        model: response && response.model || candidateId,
        usage: response && response.usage || null,
        latencyMs: Math.round(performance.now() - caseStartedAt)
      });
    } catch (error) {
      results.push({
        id: testCase.id,
        title: testCase.title,
        passed: false,
        errors: [error && error.message || '候选模型调用失败'],
        metrics: null,
        answer: null,
        model: candidateId,
        usage: null,
        latencyMs: Math.round(performance.now() - caseStartedAt)
      });
    }
  }
  const passed = results.filter(item => item.passed).length;
  return {
    benchmark: 'white-night-speaking-llm-v1',
    candidateId,
    caseCount: results.length,
    passed,
    failed: results.length - passed,
    allPassed: passed === results.length,
    elapsedMs: Math.round(performance.now() - startedAt),
    results
  };
}

function envValue(environment, name) {
  return String(environment[name] || '').trim();
}

function liveAnalyzer(environment) {
  const baseUrl = envValue(environment, 'BELYE_NOCHI_SPEAKING_LLM_BASE_URL');
  const apiKey = envValue(environment, 'BELYE_NOCHI_SPEAKING_LLM_API_KEY');
  const model = envValue(environment, 'BELYE_NOCHI_SPEAKING_LLM_MODEL');
  if (!baseUrl || !apiKey || !model) return null;
  const provider = createOpenAiCompatibleProvider({
    baseUrl,
    apiKey,
    model,
    format: envValue(environment, 'BELYE_NOCHI_SPEAKING_LLM_API_FORMAT') || 'chat_completions',
    timeoutMs: Number(environment.BELYE_NOCHI_SPEAKING_LLM_TIMEOUT_MS) || 30000
  });
  return async testCase => provider.analyze({
    requestType: 'speaking',
    input: testCase.input,
    learningContext: [],
    signal: new AbortController().signal
  });
}

async function main() {
  const useOffline = process.argv.includes('--offline');
  const analyzer = useOffline ? null : liveAnalyzer(process.env);
  const report = await runBenchmark({
    analyze: analyzer || undefined,
    candidateId: analyzer ? envValue(process.env, 'BELYE_NOCHI_SPEAKING_LLM_MODEL') : 'offline-contract-fixture'
  });
  process.stdout.write(JSON.stringify(report, null, 2) + '\n');
  if (!report.allPassed) process.exitCode = 1;
}

if (require.main === module) main().catch(error => {
  process.stderr.write((error && error.stack || error) + '\n');
  process.exitCode = 1;
});

module.exports = {
  CASES,
  offlineAnswer,
  scoreCase,
  runBenchmark,
  liveAnalyzer
};
