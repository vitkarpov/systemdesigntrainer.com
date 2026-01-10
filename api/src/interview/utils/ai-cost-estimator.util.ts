/**
 * AI Cost Estimator Utility
 *
 * Estimates the cost of Claude API calls based on token usage and model pricing.
 * This is a pure utility function with no dependencies.
 *
 * Pricing source: https://platform.claude.com/docs/en/about-claude/pricing
 * Last updated: January 2026
 */

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface CostEstimate {
  inputCost: number;
  outputCost: number;
  totalCost: number;
  inputTokens: number;
  outputTokens: number;
  model: string;
}

/**
 * Estimates the cost of a Claude API call in USD
 *
 * @param modelName - The Claude model name (e.g., 'claude-opus-4-5', 'claude-haiku-3.5')
 * @param usage - Token usage with inputTokens and outputTokens
 * @returns Cost estimate breakdown
 */
export function estimateClaudeCost(
  modelName: string,
  usage: TokenUsage,
): CostEstimate {
  const { inputTokens, outputTokens } = usage;
  const modelLower = modelName.toLowerCase();

  const { inputCostPerMTok, outputCostPerMTok } = getModelPricing(modelLower);

  const inputCost = (inputTokens / 1_000_000) * inputCostPerMTok;
  const outputCost = (outputTokens / 1_000_000) * outputCostPerMTok;
  const totalCost = inputCost + outputCost;

  return {
    inputCost,
    outputCost,
    totalCost,
    inputTokens,
    outputTokens,
    model: modelName,
  };
}

/**
 * Gets pricing per million tokens for a given model
 *
 * @param modelName - The Claude model name (lowercase)
 * @returns Input and output cost per million tokens
 */
function getModelPricing(modelName: string): {
  inputCostPerMTok: number;
  outputCostPerMTok: number;
} {
  // Opus models
  if (modelName.includes('opus-4-5') || modelName.includes('opus-4.5')) {
    return { inputCostPerMTok: 5, outputCostPerMTok: 25 };
  }
  if (
    modelName.includes('opus-4-1') ||
    modelName.includes('opus-4.1') ||
    modelName.includes('opus-4')
  ) {
    return { inputCostPerMTok: 15, outputCostPerMTok: 75 };
  }
  if (modelName.includes('opus-3')) {
    // Deprecated
    return { inputCostPerMTok: 15, outputCostPerMTok: 75 };
  }

  // Sonnet models
  if (
    modelName.includes('sonnet-4-5') ||
    modelName.includes('sonnet-4.5') ||
    modelName.includes('sonnet-4') ||
    modelName.includes('sonnet-3-7') ||
    modelName.includes('sonnet-3.7')
  ) {
    return { inputCostPerMTok: 3, outputCostPerMTok: 15 };
  }

  // Haiku models
  if (modelName.includes('haiku-4-5') || modelName.includes('haiku-4.5')) {
    return { inputCostPerMTok: 1, outputCostPerMTok: 5 };
  }
  if (modelName.includes('haiku-3-5') || modelName.includes('haiku-3.5')) {
    return { inputCostPerMTok: 0.8, outputCostPerMTok: 4.0 };
  }
  if (modelName.includes('haiku-3')) {
    // Deprecated
    return { inputCostPerMTok: 0.25, outputCostPerMTok: 1.25 };
  }

  // Generic fallbacks (if model name doesn't include specific version)
  if (modelName.includes('opus')) {
    return { inputCostPerMTok: 15, outputCostPerMTok: 75 };
  }
  if (modelName.includes('sonnet')) {
    return { inputCostPerMTok: 3, outputCostPerMTok: 15 };
  }
  if (modelName.includes('haiku')) {
    return { inputCostPerMTok: 0.8, outputCostPerMTok: 4.0 };
  }

  // Default to Haiku 3.5 pricing (most cost-effective)
  return { inputCostPerMTok: 0.8, outputCostPerMTok: 4.0 };
}

/**
 * Formats a cost estimate as a readable string
 *
 * @param estimate - The cost estimate
 * @returns Formatted cost string (e.g., "$0.0234")
 */
export function formatCost(estimate: CostEstimate): string {
  return `$${estimate.totalCost.toFixed(4)}`;
}

/**
 * Calculates estimated cost for a given number of tokens at a specific model's pricing
 *
 * @param modelName - The Claude model name
 * @param inputTokens - Number of input tokens
 * @param outputTokens - Number of output tokens
 * @returns Total estimated cost in USD
 */
export function calculateCost(
  modelName: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const estimate = estimateClaudeCost(modelName, { inputTokens, outputTokens });
  return estimate.totalCost;
}
