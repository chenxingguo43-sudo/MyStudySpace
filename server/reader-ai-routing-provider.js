'use strict';

const {
  ReaderAiProviderError,
  createAnthropicProvider,
  createOpenAiCompatibleProvider
} = require('./reader-ai-provider');

function estimateCost(usage, pricing) {
  if (!usage || !pricing) return null;
  const input = Math.max(0, Number(usage.inputTokens || 0) - Number(usage.cachedInputTokens || 0));
  const cached = Math.max(0, Number(usage.cachedInputTokens || 0));
  const output = Math.max(0, Number(usage.outputTokens || 0));
  const multiplier = Math.max(0, Number(pricing.multiplier) || 1);
  const amount = multiplier * (
    input * (Number(pricing.inputPerMillion) || 0) +
    cached * (Number(pricing.cachedInputPerMillion) || 0) +
    output * (Number(pricing.outputPerMillion) || 0)
  ) / 1000000;
  if (!amount) return null;
  return { amount, currency: pricing.currency || 'CNY', multiplier };
}

function createReaderAiRoutingProvider(options = {}) {
  if (!options.config) throw new TypeError('config is required');
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  return {
    async analyze(request) {
      const routingType = request.requestType === 'reading' ? 'grammar' : request.requestType;
      const selected = await options.config.resolve(routingType);
      if (!selected || !selected.configured || !selected.apiKey) {
        throw new ReaderAiProviderError('not_configured', 'AI 服务尚未配置', 503);
      }
      const factory = selected.format === 'anthropic_messages' ? createAnthropicProvider : createOpenAiCompatibleProvider;
      const provider = factory({
        baseUrl: selected.baseUrl,
        apiKey: selected.apiKey,
        model: selected.model,
        format: selected.format,
        fetchImpl,
        timeoutMs: options.timeoutMs
      });
      const result = await provider.analyze(request);
      const cost = estimateCost(result.usage, selected.pricing);
      return {
        ...result,
        providerId: selected.id,
        providerName: selected.name,
        usage: result.usage ? { ...result.usage, estimatedCost: cost } : null
      };
    }
  };
}

module.exports = { createReaderAiRoutingProvider, estimateCost };
