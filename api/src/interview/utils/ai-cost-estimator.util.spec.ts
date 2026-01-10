import {
  estimateClaudeCost,
  formatCost,
  calculateCost,
  type CostEstimate,
} from './ai-cost-estimator.util';

describe('AI Cost Estimator Utility', () => {
  describe('estimateClaudeCost', () => {
    describe('Opus 4.5 models', () => {
      it('should calculate cost for claude-opus-4-5', () => {
        const result = estimateClaudeCost('claude-opus-4-5', {
          inputTokens: 10_000,
          outputTokens: 2_000,
        });

        expect(result.inputCost).toBeCloseTo(0.05, 6); // 10k / 1M * $5
        expect(result.outputCost).toBeCloseTo(0.05, 6); // 2k / 1M * $25
        expect(result.totalCost).toBeCloseTo(0.1, 6);
        expect(result.model).toBe('claude-opus-4-5');
      });

      it('should handle claude-opus-4.5 format', () => {
        const result = estimateClaudeCost('claude-opus-4.5', {
          inputTokens: 20_000,
          outputTokens: 5_000,
        });

        expect(result.inputCost).toBeCloseTo(0.1, 6); // 20k / 1M * $5
        expect(result.outputCost).toBeCloseTo(0.125, 6); // 5k / 1M * $25
        expect(result.totalCost).toBeCloseTo(0.225, 6);
      });
    });

    describe('Opus 4.1 and 4 models', () => {
      it('should calculate cost for claude-opus-4-1', () => {
        const result = estimateClaudeCost('claude-opus-4-1', {
          inputTokens: 10_000,
          outputTokens: 2_000,
        });

        expect(result.inputCost).toBeCloseTo(0.15, 6); // 10k / 1M * $15
        expect(result.outputCost).toBeCloseTo(0.15, 6); // 2k / 1M * $75
        expect(result.totalCost).toBeCloseTo(0.3, 6);
      });

      it('should calculate cost for claude-opus-4', () => {
        const result = estimateClaudeCost('claude-opus-4', {
          inputTokens: 10_000,
          outputTokens: 2_000,
        });

        expect(result.inputCost).toBeCloseTo(0.15, 6);
        expect(result.outputCost).toBeCloseTo(0.15, 6);
        expect(result.totalCost).toBeCloseTo(0.3, 6);
      });

      it('should handle claude-opus-4.1 format', () => {
        const result = estimateClaudeCost('claude-opus-4.1', {
          inputTokens: 10_000,
          outputTokens: 2_000,
        });

        expect(result.totalCost).toBeCloseTo(0.3, 6);
      });
    });

    describe('Opus 3 models (deprecated)', () => {
      it('should calculate cost for claude-opus-3', () => {
        const result = estimateClaudeCost('claude-opus-3', {
          inputTokens: 10_000,
          outputTokens: 2_000,
        });

        expect(result.inputCost).toBeCloseTo(0.15, 6); // 10k / 1M * $15
        expect(result.outputCost).toBeCloseTo(0.15, 6); // 2k / 1M * $75
        expect(result.totalCost).toBeCloseTo(0.3, 6);
      });
    });

    describe('Sonnet models', () => {
      it('should calculate cost for claude-sonnet-4-5', () => {
        const result = estimateClaudeCost('claude-sonnet-4-5', {
          inputTokens: 100_000,
          outputTokens: 10_000,
        });

        expect(result.inputCost).toBeCloseTo(0.3, 6); // 100k / 1M * $3
        expect(result.outputCost).toBeCloseTo(0.15, 6); // 10k / 1M * $15
        expect(result.totalCost).toBeCloseTo(0.45, 6);
      });

      it('should calculate cost for claude-sonnet-4', () => {
        const result = estimateClaudeCost('claude-sonnet-4', {
          inputTokens: 100_000,
          outputTokens: 10_000,
        });

        expect(result.totalCost).toBeCloseTo(0.45, 6);
      });

      it('should calculate cost for claude-sonnet-3-7 (deprecated)', () => {
        const result = estimateClaudeCost('claude-sonnet-3-7', {
          inputTokens: 100_000,
          outputTokens: 10_000,
        });

        expect(result.totalCost).toBeCloseTo(0.45, 6);
      });

      it('should handle claude-sonnet-4.5 format', () => {
        const result = estimateClaudeCost('claude-sonnet-4.5', {
          inputTokens: 100_000,
          outputTokens: 10_000,
        });

        expect(result.totalCost).toBeCloseTo(0.45, 6);
      });

      it('should handle claude-sonnet-3.7 format', () => {
        const result = estimateClaudeCost('claude-sonnet-3.7', {
          inputTokens: 100_000,
          outputTokens: 10_000,
        });

        expect(result.totalCost).toBeCloseTo(0.45, 6);
      });
    });

    describe('Haiku 4.5 models', () => {
      it('should calculate cost for claude-haiku-4-5', () => {
        const result = estimateClaudeCost('claude-haiku-4-5', {
          inputTokens: 100_000,
          outputTokens: 10_000,
        });

        expect(result.inputCost).toBeCloseTo(0.1, 6); // 100k / 1M * $1
        expect(result.outputCost).toBeCloseTo(0.05, 6); // 10k / 1M * $5
        expect(result.totalCost).toBeCloseTo(0.15, 6);
      });

      it('should handle claude-haiku-4.5 format', () => {
        const result = estimateClaudeCost('claude-haiku-4.5', {
          inputTokens: 100_000,
          outputTokens: 10_000,
        });

        expect(result.totalCost).toBeCloseTo(0.15, 6);
      });
    });

    describe('Haiku 3.5 models', () => {
      it('should calculate cost for claude-haiku-3-5', () => {
        const result = estimateClaudeCost('claude-haiku-3-5', {
          inputTokens: 100_000,
          outputTokens: 10_000,
        });

        expect(result.inputCost).toBeCloseTo(0.08, 6); // 100k / 1M * $0.80
        expect(result.outputCost).toBeCloseTo(0.04, 6); // 10k / 1M * $4
        expect(result.totalCost).toBeCloseTo(0.12, 6);
      });

      it('should handle claude-haiku-3.5 format', () => {
        const result = estimateClaudeCost('claude-haiku-3.5', {
          inputTokens: 100_000,
          outputTokens: 10_000,
        });

        expect(result.totalCost).toBeCloseTo(0.12, 6);
      });
    });

    describe('Haiku 3 models (deprecated)', () => {
      it('should calculate cost for claude-haiku-3', () => {
        const result = estimateClaudeCost('claude-haiku-3', {
          inputTokens: 100_000,
          outputTokens: 10_000,
        });

        expect(result.inputCost).toBeCloseTo(0.025, 6); // 100k / 1M * $0.25
        expect(result.outputCost).toBeCloseTo(0.0125, 6); // 10k / 1M * $1.25
        expect(result.totalCost).toBeCloseTo(0.0375, 6);
      });
    });

    describe('Generic fallbacks', () => {
      it('should fallback to Opus pricing for generic opus model', () => {
        const result = estimateClaudeCost('claude-opus', {
          inputTokens: 10_000,
          outputTokens: 2_000,
        });

        expect(result.inputCost).toBeCloseTo(0.15, 6); // Default Opus pricing
        expect(result.outputCost).toBeCloseTo(0.15, 6);
        expect(result.totalCost).toBeCloseTo(0.3, 6);
      });

      it('should fallback to Sonnet pricing for generic sonnet model', () => {
        const result = estimateClaudeCost('claude-sonnet', {
          inputTokens: 100_000,
          outputTokens: 10_000,
        });

        expect(result.totalCost).toBeCloseTo(0.45, 6); // Default Sonnet pricing
      });

      it('should fallback to Haiku pricing for generic haiku model', () => {
        const result = estimateClaudeCost('claude-haiku', {
          inputTokens: 100_000,
          outputTokens: 10_000,
        });

        expect(result.totalCost).toBeCloseTo(0.12, 6); // Default Haiku 3.5 pricing
      });

      it('should use default Haiku 3.5 pricing for unknown model', () => {
        const result = estimateClaudeCost('unknown-model', {
          inputTokens: 100_000,
          outputTokens: 10_000,
        });

        expect(result.totalCost).toBeCloseTo(0.12, 6); // Default to Haiku 3.5
      });
    });

    describe('Case insensitivity', () => {
      it('should handle uppercase model names', () => {
        const result = estimateClaudeCost('CLAUDE-OPUS-4-5', {
          inputTokens: 10_000,
          outputTokens: 2_000,
        });

        expect(result.totalCost).toBeCloseTo(0.1, 6);
      });

      it('should handle mixed case model names', () => {
        const result = estimateClaudeCost('Claude-Haiku-3.5', {
          inputTokens: 100_000,
          outputTokens: 10_000,
        });

        expect(result.totalCost).toBeCloseTo(0.12, 6);
      });
    });

    describe('Edge cases', () => {
      it('should handle zero tokens', () => {
        const result = estimateClaudeCost('claude-haiku-3-5', {
          inputTokens: 0,
          outputTokens: 0,
        });

        expect(result.inputCost).toBe(0);
        expect(result.outputCost).toBe(0);
        expect(result.totalCost).toBe(0);
      });

      it('should handle only input tokens', () => {
        const result = estimateClaudeCost('claude-haiku-3-5', {
          inputTokens: 50_000,
          outputTokens: 0,
        });

        expect(result.inputCost).toBeCloseTo(0.04, 6);
        expect(result.outputCost).toBe(0);
        expect(result.totalCost).toBeCloseTo(0.04, 6);
      });

      it('should handle only output tokens', () => {
        const result = estimateClaudeCost('claude-haiku-3-5', {
          inputTokens: 0,
          outputTokens: 5_000,
        });

        expect(result.inputCost).toBe(0);
        expect(result.outputCost).toBeCloseTo(0.02, 6);
        expect(result.totalCost).toBeCloseTo(0.02, 6);
      });

      it('should handle large token counts', () => {
        const result = estimateClaudeCost('claude-opus-4-5', {
          inputTokens: 1_000_000, // 1M tokens
          outputTokens: 500_000, // 500k tokens
        });

        expect(result.inputCost).toBeCloseTo(5, 6); // 1M / 1M * $5
        expect(result.outputCost).toBeCloseTo(12.5, 6); // 500k / 1M * $25
        expect(result.totalCost).toBeCloseTo(17.5, 6);
      });
    });

    describe('Return structure', () => {
      it('should return all required fields', () => {
        const result = estimateClaudeCost('claude-haiku-3-5', {
          inputTokens: 10_000,
          outputTokens: 2_000,
        });

        expect(result).toHaveProperty('inputCost');
        expect(result).toHaveProperty('outputCost');
        expect(result).toHaveProperty('totalCost');
        expect(result).toHaveProperty('inputTokens');
        expect(result).toHaveProperty('outputTokens');
        expect(result).toHaveProperty('model');
      });

      it('should preserve original token counts', () => {
        const result = estimateClaudeCost('claude-haiku-3-5', {
          inputTokens: 12_345,
          outputTokens: 6_789,
        });

        expect(result.inputTokens).toBe(12_345);
        expect(result.outputTokens).toBe(6_789);
      });

      it('should preserve original model name', () => {
        const modelName = 'claude-opus-4-5';
        const result = estimateClaudeCost(modelName, {
          inputTokens: 1_000,
          outputTokens: 500,
        });

        expect(result.model).toBe(modelName);
      });
    });

    describe('Real-world scenarios', () => {
      it('should estimate cost for typical feedback generation (Haiku 3.5)', () => {
        // Typical feedback: 20k input, 3k output
        const result = estimateClaudeCost('claude-haiku-3-5', {
          inputTokens: 20_000,
          outputTokens: 3_000,
        });

        expect(result.totalCost).toBeCloseTo(0.028, 3); // ~$0.028
      });

      it('should estimate cost for long interview (Haiku 3.5)', () => {
        // Long interview: 30k input, 4k output
        const result = estimateClaudeCost('claude-haiku-3-5', {
          inputTokens: 30_000,
          outputTokens: 4_000,
        });

        expect(result.totalCost).toBeCloseTo(0.04, 3); // ~$0.04
      });

      it('should estimate cost for feedback with Opus 4.5', () => {
        // Same scenario with Opus for comparison
        const result = estimateClaudeCost('claude-opus-4-5', {
          inputTokens: 20_000,
          outputTokens: 3_000,
        });

        expect(result.totalCost).toBeCloseTo(0.175, 3); // ~$0.175
      });
    });
  });

  describe('formatCost', () => {
    it('should format cost with 4 decimal places', () => {
      const estimate: CostEstimate = {
        inputCost: 0.05,
        outputCost: 0.05,
        totalCost: 0.1,
        inputTokens: 10_000,
        outputTokens: 2_000,
        model: 'claude-opus-4-5',
      };

      expect(formatCost(estimate)).toBe('$0.1000');
    });

    it('should format small costs correctly', () => {
      const estimate: CostEstimate = {
        inputCost: 0.008,
        outputCost: 0.004,
        totalCost: 0.012,
        inputTokens: 10_000,
        outputTokens: 1_000,
        model: 'claude-haiku-3-5',
      };

      expect(formatCost(estimate)).toBe('$0.0120');
    });

    it('should format large costs correctly', () => {
      const estimate: CostEstimate = {
        inputCost: 5.0,
        outputCost: 12.5,
        totalCost: 17.5,
        inputTokens: 1_000_000,
        outputTokens: 500_000,
        model: 'claude-opus-4-5',
      };

      expect(formatCost(estimate)).toBe('$17.5000');
    });

    it('should format zero cost correctly', () => {
      const estimate: CostEstimate = {
        inputCost: 0,
        outputCost: 0,
        totalCost: 0,
        inputTokens: 0,
        outputTokens: 0,
        model: 'claude-haiku-3-5',
      };

      expect(formatCost(estimate)).toBe('$0.0000');
    });
  });

  describe('calculateCost', () => {
    it('should calculate and return total cost', () => {
      const cost = calculateCost('claude-haiku-3-5', 100_000, 10_000);
      expect(cost).toBeCloseTo(0.12, 6);
    });

    it('should handle different models', () => {
      const haikuCost = calculateCost('claude-haiku-3-5', 10_000, 2_000);
      const opusCost = calculateCost('claude-opus-4-5', 10_000, 2_000);

      expect(haikuCost).toBeLessThan(opusCost);
      expect(haikuCost).toBeCloseTo(0.016, 3);
      expect(opusCost).toBeCloseTo(0.1, 3);
    });

    it('should be a convenience wrapper for estimateClaudeCost', () => {
      const modelName = 'claude-sonnet-4-5';
      const inputTokens = 50_000;
      const outputTokens = 5_000;

      const directCost = calculateCost(modelName, inputTokens, outputTokens);
      const estimateCost = estimateClaudeCost(modelName, {
        inputTokens,
        outputTokens,
      }).totalCost;

      expect(directCost).toBe(estimateCost);
    });
  });
});
