'use strict';

const TEMPLATE_VERSION = 'reader-ai-v1';

class ReaderAiProviderError extends Error {
  constructor(code, message, statusCode = 502) {
    super(message);
    this.name = 'ReaderAiProviderError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

function text(value, max = 12000) {
  return String(value == null ? '' : value).trim().slice(0, max);
}

function stringList(values, max = 8) {
  return (Array.isArray(values) ? values : []).slice(0, max).map(item => text(item, 1000)).filter(Boolean);
}

function validateGrammar(answer) {
  if (!answer || typeof answer !== 'object') throw new ReaderAiProviderError('invalid_response', 'AI 返回内容不是对象');
  const result = {
    answerReason: text(answer.answerReason),
    optionReasons: (Array.isArray(answer.optionReasons) ? answer.optionReasons : []).slice(0, 12).map(item => ({
      key: text(item && item.key, 30), reason: text(item && item.reason, 2000)
    })).filter(item => item.key && item.reason),
    knowledgePoints: stringList(answer.knowledgePoints),
    pitfall: text(answer.pitfall, 2000),
    transferQuestion: {
      prompt: text(answer.transferQuestion && answer.transferQuestion.prompt, 3000),
      options: stringList(answer.transferQuestion && answer.transferQuestion.options, 8)
    }
  };
  if (!result.answerReason || !result.optionReasons.length || !result.knowledgePoints.length || !result.pitfall || !result.transferQuestion.prompt) {
    throw new ReaderAiProviderError('invalid_response', 'AI 返回的语法解析字段不完整');
  }
  return result;
}

function validateReading(answer) {
  if (!answer || typeof answer !== 'object') throw new ReaderAiProviderError('invalid_response', 'AI 返回内容不是对象');
  const result = {
    conclusion: text(answer.conclusion, 2000),
    evidence: (Array.isArray(answer.evidence) ? answer.evidence : []).slice(0, 8).map(item => ({
      quoteRu: text(item && item.quoteRu, 4000),
      quoteZh: text(item && item.quoteZh, 4000),
      explanation: text(item && item.explanation, 2000)
    })).filter(item => item.quoteRu && item.explanation),
    correctMapping: (Array.isArray(answer.correctMapping) ? answer.correctMapping : []).slice(0, 8).map(item => ({
      sourceRu: text(item && item.sourceRu, 2000),
      optionKey: text(item && item.optionKey, 30),
      optionRu: text(item && item.optionRu, 2000),
      explanation: text(item && item.explanation, 2000)
    })).filter(item => item.sourceRu && item.optionKey && item.explanation),
    optionAnalysis: (Array.isArray(answer.optionAnalysis) ? answer.optionAnalysis : []).slice(0, 12).map(item => ({
      key: text(item && item.key, 30),
      status: text(item && item.status, 30),
      conflictTerms: stringList(item && item.conflictTerms, 6),
      reason: text(item && item.reason, 2500)
    })).filter(item => item.key && item.reason),
    userMistake: {
      selectedKey: text(answer.userMistake && answer.userMistake.selectedKey, 30),
      explanation: text(answer.userMistake && answer.userMistake.explanation, 2500),
      nextCheck: text(answer.userMistake && answer.userMistake.nextCheck, 2000)
    },
    readingSkill: stringList(answer.readingSkill, 6),
    transferQuestion: {
      prompt: text(answer.transferQuestion && answer.transferQuestion.prompt, 3000),
      options: stringList(answer.transferQuestion && answer.transferQuestion.options, 8)
    }
  };
  if (!result.conclusion || !result.evidence.length || !result.correctMapping.length || !result.optionAnalysis.length ||
      !result.userMistake.explanation || !result.userMistake.nextCheck || !result.transferQuestion.prompt) {
    throw new ReaderAiProviderError('invalid_response', 'AI 返回的阅读解析字段不完整');
  }
  return result;
}

function validateDictionary(answer) {
  if (!answer || typeof answer !== 'object') throw new ReaderAiProviderError('invalid_response', 'AI 返回内容不是对象');
  const result = {
    contextMeaning: text(answer.contextMeaning, 2000),
    morphology: text(answer.morphology, 2000),
    collocations: stringList(answer.collocations),
    examples: (Array.isArray(answer.examples) ? answer.examples : []).slice(0, 6).map(item => ({
      ru: text(item && item.ru, 1000), zh: text(item && item.zh, 1000)
    })).filter(item => item.ru || item.zh),
    confusions: stringList(answer.confusions)
  };
  if (!result.contextMeaning || !result.morphology || !result.collocations.length || !result.examples.length || !result.confusions.length) {
    throw new ReaderAiProviderError('invalid_response', 'AI 返回的语境查词字段不完整');
  }
  return result;
}

function validateSpeaking(answer) {
  if (!answer || typeof answer !== 'object') throw new ReaderAiProviderError('invalid_response', 'AI 返回内容不是对象');
  const correction = answer.correction && typeof answer.correction === 'object' ? answer.correction : {};
  const clarification = answer.clarification && typeof answer.clarification === 'object' ? answer.clarification : {};
  const scaffold = answer.scaffold && typeof answer.scaffold === 'object' ? answer.scaffold : {};
  const result = {
    replyRu: text(answer.replyRu, 1200),
    subtitleZh: text(answer.subtitleZh, 1200),
    questionRu: text(answer.questionRu, 600),
    clarification: {
      needed: clarification.needed === true,
      questionZh: text(clarification.questionZh, 600)
    },
    correction: {
      type: ['none', 'recast', 'explain'].includes(text(correction.type, 30)) ? text(correction.type, 30) : 'none',
      originalRu: text(correction.originalRu, 600),
      naturalRu: text(correction.naturalRu, 600),
      explanationZh: text(correction.explanationZh, 1000)
    },
    scaffold: {
      keywords: stringList(scaffold.keywords, 8),
      sentenceFrame: text(scaffold.sentenceFrame, 800),
      fullSuggestion: text(scaffold.fullSuggestion, 1000)
    },
    ttsSegments: (Array.isArray(answer.ttsSegments) ? answer.ttsSegments : []).slice(0, 6).map(item => ({
      role: ['reply', 'question'].includes(text(item && item.role, 30)) ? text(item.role, 30) : 'reply',
      textRu: text(item && item.textRu, 1200)
    })).filter(item => item.textRu)
  };
  if (!result.replyRu || !result.questionRu || !result.ttsSegments.length) {
    throw new ReaderAiProviderError('invalid_response', 'AI 返回的口语陪练字段不完整');
  }
  if (result.clarification.needed && !result.clarification.questionZh) {
    throw new ReaderAiProviderError('invalid_response', 'AI 返回的澄清问题字段不完整');
  }
  if (result.correction.type !== 'none' && (!result.correction.naturalRu || !result.correction.explanationZh)) {
    throw new ReaderAiProviderError('invalid_response', 'AI 返回的纠错字段不完整');
  }
  return result;
}

function responseSchema(requestType) {
  if (requestType === 'reading') {
    return '{"conclusion":"一句话结论","evidence":[{"quoteRu":"给定原文短句","quoteZh":"中文翻译","explanation":"这条证据说明什么"}],"correctMapping":[{"sourceRu":"原文短语","optionKey":"б","optionRu":"正确选项","explanation":"二者如何同义对应"}],"optionAnalysis":[{"key":"а","status":"wrong","conflictTerms":["冲突词"],"reason":"该选项具体改变了原文什么"}],"userMistake":{"selectedKey":"а","explanation":"用户为什么容易选它","nextCheck":"下次做题先检查什么"},"readingSkill":["本题考查的阅读判断轴"],"transferQuestion":{"prompt":"不泄露答案的迁移题","options":["A. ...","B. ..."]}}';
  }
  if (requestType === 'grammar') {
    return '{"answerReason":"正确答案原因","optionReasons":[{"key":"A","reason":"该选项原因"}],"knowledgePoints":["知识点"],"pitfall":"易错提醒","transferQuestion":{"prompt":"不泄露答案的迁移题","options":["A. ...","B. ..."]}}';
  }
  if (requestType === 'speaking') {
    return '{"replyRu":"一到两句俄语回复","subtitleZh":"必要时的中文支架","questionRu":"推动用户继续说的俄语问题","clarification":{"needed":false,"questionZh":"不确定时用中文澄清"},"correction":{"type":"none","originalRu":"","naturalRu":"","explanationZh":""},"scaffold":{"keywords":["关键词"],"sentenceFrame":"句型框架","fullSuggestion":"完整建议"},"ttsSegments":[{"role":"reply","textRu":"俄语回复"},{"role":"question","textRu":"俄语问题"}]}';
  }
  return '{"contextMeaning":"当前语境词义","morphology":"词形和语法作用","collocations":["搭配"],"examples":[{"ru":"俄语例句","zh":"中文"}],"confusions":["易混词及区别"]}';
}

function systemPrompt(requestType) {
  const common = '你是白夜俄语 Reader 内的俄语导师。只依据给定材料回答；区分客观材料与推断；不修改学习成绩或复习排程。必须只返回一个 JSON 对象，不要 Markdown。';
  if (requestType === 'reading') return common + '这是阅读理解题，不是语法题。必须先使用给定原文证据，再解释正确项的同义改写；逐项指出错误选项具体改变的词语、时间状态、对象、范围或逻辑；结合用户答案说明其误判原因。禁止使用“没有给出这一说法”“至少一处不一致”等空泛套话；证据不足时必须明确说明。不要强行生成语法知识点。最后出一道不公布答案的迁移题。';
  if (requestType === 'grammar') return common + '解释正确答案、逐项说明其他选项、提炼知识点和易错点，最后出一道不公布答案的迁移题。';
  if (requestType === 'speaking') return common + '这是白夜俄语口语陪练。回复以一到两句自然俄语为主，并提出一个简短俄语问题推动用户继续说。用户用中文求助时可以给一句中文支架，但要尽快回到俄语。只在确实影响理解时澄清，不要静默猜测；纠错集中为最多一个高价值的 recast 或 explain，不要打断交流。输出必须符合给定 JSON 结构，并把可朗读内容拆到 ttsSegments。';
  return common + '本地词典字段优先且不可改写。你只补充当前语境义、词形、搭配、例句和易混词；资料不足时明确说明。';
}

function parseChatCompletionsPayload(payload) {
  const content = payload && payload.choices && payload.choices[0] && payload.choices[0].message && payload.choices[0].message.content;
  if (typeof content !== 'string') throw new ReaderAiProviderError('invalid_response', '模型响应缺少 message.content');
  try { return JSON.parse(content); }
  catch (_error) { throw new ReaderAiProviderError('invalid_response', '模型没有返回合法 JSON'); }
}

function parseResponsesPayload(payload) {
  const content = typeof (payload && payload.output_text) === 'string'
    ? payload.output_text
    : (Array.isArray(payload && payload.output) ? payload.output
      .flatMap(item => Array.isArray(item && item.content) ? item.content : [])
      .map(item => item && item.text).find(value => typeof value === 'string') : '');
  if (typeof content !== 'string' || !content.trim()) throw new ReaderAiProviderError('invalid_response', '模型响应缺少 output_text');
  try { return JSON.parse(content); }
  catch (_error) { throw new ReaderAiProviderError('invalid_response', '模型没有返回合法 JSON'); }
}

function parseAnthropicPayload(payload) {
  const content = (Array.isArray(payload && payload.content) ? payload.content : [])
    .map(item => item && item.text).find(value => typeof value === 'string');
  if (!content) throw new ReaderAiProviderError('invalid_response', '模型响应缺少 content.text');
  try { return JSON.parse(content); }
  catch (_error) { throw new ReaderAiProviderError('invalid_response', '模型没有返回合法 JSON'); }
}

function normalizeUsage(payload, format) {
  const usage = payload && payload.usage;
  if (!usage || typeof usage !== 'object') return null;
  const responses = format === 'responses';
  const anthropic = format === 'anthropic_messages';
  const inputTokens = Number(responses || anthropic ? usage.input_tokens : usage.prompt_tokens) || 0;
  const outputTokens = Number(responses || anthropic ? usage.output_tokens : usage.completion_tokens) || 0;
  const inputDetails = responses ? usage.input_tokens_details : usage.prompt_tokens_details;
  const outputDetails = responses ? usage.output_tokens_details : usage.completion_tokens_details;
  return {
    inputTokens,
    cachedInputTokens: Number(anthropic ? usage.cache_read_input_tokens : inputDetails && inputDetails.cached_tokens) || 0,
    outputTokens,
    reasoningTokens: Number(outputDetails && outputDetails.reasoning_tokens) || 0,
    totalTokens: Number(usage.total_tokens) || inputTokens + outputTokens
  };
}

function createAnthropicProvider(options = {}) {
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const baseUrl = text(options.baseUrl, 2000).replace(/\/$/, '');
  const apiKey = text(options.apiKey, 4000);
  const model = text(options.model, 300);
  const timeoutMs = Math.max(100, Number(options.timeoutMs) || 30000);
  async function analyze(request) {
    if (!baseUrl || !apiKey || !model) throw new ReaderAiProviderError('not_configured', 'AI 服务尚未配置', 503);
    const linked = combineSignals(request.signal, timeoutMs);
    try {
      const response = await fetchImpl(baseUrl + '/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model,
          max_tokens: 1800,
          temperature: 0.2,
          system: systemPrompt(request.requestType),
          messages: [{
            role: 'user',
            content: JSON.stringify({ input: request.input, relevantLearningRecords: request.learningContext, requiredJson: responseSchema(request.requestType) })
          }]
        }),
        signal: linked.signal
      });
      if (!response.ok) throw new ReaderAiProviderError('provider_http_error', '模型服务返回 HTTP ' + response.status, response.status === 429 ? 429 : 502);
      const payload = await response.json().catch(() => { throw new ReaderAiProviderError('invalid_response', '模型服务返回了非法 JSON'); });
      const answer = parseAnthropicPayload(payload);
      return {
        model,
        usage: normalizeUsage(payload, 'anthropic_messages'),
        answer: request.requestType === 'grammar' ? validateGrammar(answer) : request.requestType === 'reading' ? validateReading(answer) : request.requestType === 'speaking' ? validateSpeaking(answer) : validateDictionary(answer)
      };
    } catch (error) {
      if (error instanceof ReaderAiProviderError) throw error;
      if (linked.signal.aborted) {
        const parentCancelled = request.signal && request.signal.aborted;
        throw new ReaderAiProviderError(parentCancelled ? 'cancelled' : 'timeout', parentCancelled ? '请求已取消' : 'AI 请求超时', parentCancelled ? 499 : 504);
      }
      throw new ReaderAiProviderError('network_error', '无法连接 AI 服务', 502);
    } finally { linked.cleanup(); }
  }
  return { analyze, model, format: 'anthropic_messages', templateVersion: TEMPLATE_VERSION };
}

function apiFormat(value) {
  const normalized = text(value || 'chat_completions', 80).toLowerCase().replace(/[ -]/g, '_');
  if (['chat', 'chat_completions', 'chatcompletion'].includes(normalized)) return 'chat_completions';
  if (['responses', 'response'].includes(normalized)) return 'responses';
  throw new ReaderAiProviderError('invalid_configuration', 'AI 接口格式必须是 chat_completions 或 responses', 503);
}

function providerRequest(request, model, format) {
  const userInput = JSON.stringify({ input: request.input, relevantLearningRecords: request.learningContext, requiredJson: responseSchema(request.requestType) });
  if (format === 'responses') {
    return {
      path: '/responses',
      body: {
        model,
        temperature: 0.2,
        input: [
          { role: 'developer', content: [{ type: 'input_text', text: systemPrompt(request.requestType) }] },
          { role: 'user', content: [{ type: 'input_text', text: userInput }] }
        ],
        text: { format: { type: 'json_object' } }
      },
      parse: parseResponsesPayload
    };
  }
  return {
    path: '/chat/completions',
    body: {
      model,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt(request.requestType) },
        { role: 'user', content: userInput }
      ]
    },
    parse: parseChatCompletionsPayload
  };
}

function combineSignals(parent, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error('timeout')), timeoutMs);
  const onAbort = () => controller.abort(parent.reason);
  if (parent) {
    if (parent.aborted) onAbort();
    else parent.addEventListener('abort', onAbort, { once: true });
  }
  return {
    signal: controller.signal,
    cleanup() {
      clearTimeout(timer);
      if (parent) parent.removeEventListener('abort', onAbort);
    }
  };
}

function createOpenAiCompatibleProvider(options = {}) {
  const environment = options.environment || process.env;
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const baseUrl = text(options.baseUrl || environment.BELYE_NOCHI_AI_BASE_URL, 2000).replace(/\/$/, '');
  const apiKey = text(options.apiKey || environment.BELYE_NOCHI_AI_API_KEY, 4000);
  const model = text(options.model || environment.BELYE_NOCHI_AI_MODEL, 300);
  const format = apiFormat(options.format || environment.BELYE_NOCHI_AI_API_FORMAT);
  const timeoutMs = Math.max(100, Number(options.timeoutMs || environment.BELYE_NOCHI_AI_TIMEOUT_MS) || 30000);

  async function analyze(request) {
    if (!baseUrl || !apiKey || !model) {
      throw new ReaderAiProviderError('not_configured', 'AI 服务尚未配置', 503);
    }
    const linked = combineSignals(request.signal, timeoutMs);
    try {
      const outgoing = providerRequest(request, model, format);
      const response = await fetchImpl(baseUrl + outgoing.path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + apiKey },
        body: JSON.stringify(outgoing.body),
        signal: linked.signal
      });
      if (!response.ok) throw new ReaderAiProviderError('provider_http_error', '模型服务返回 HTTP ' + response.status, response.status === 429 ? 429 : 502);
      const payload = await response.json().catch(() => { throw new ReaderAiProviderError('invalid_response', '模型服务返回了非法 JSON'); });
      const answer = outgoing.parse(payload);
      return {
        model,
        usage: normalizeUsage(payload, format),
        answer: request.requestType === 'grammar' ? validateGrammar(answer) : request.requestType === 'reading' ? validateReading(answer) : request.requestType === 'speaking' ? validateSpeaking(answer) : validateDictionary(answer)
      };
    } catch (error) {
      if (error instanceof ReaderAiProviderError) throw error;
      if (linked.signal.aborted) {
        const parentCancelled = request.signal && request.signal.aborted;
        throw new ReaderAiProviderError(parentCancelled ? 'cancelled' : 'timeout', parentCancelled ? '请求已取消' : 'AI 请求超时', parentCancelled ? 499 : 504);
      }
      throw new ReaderAiProviderError('network_error', '无法连接 AI 服务', 502);
    } finally {
      linked.cleanup();
    }
  }

  return { analyze, model, format, templateVersion: TEMPLATE_VERSION };
}

module.exports = {
  TEMPLATE_VERSION,
  ReaderAiProviderError,
  createAnthropicProvider,
  createOpenAiCompatibleProvider,
  apiFormat,
  parseResponsesPayload,
  parseAnthropicPayload,
  normalizeUsage,
  validateSpeaking,
  providerRequest,
  validateDictionary,
  validateGrammar,
  validateReading
};
