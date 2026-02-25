/**
 * Tests for computeEstimatedCost
 * Covers the new cost estimation function added to arena stats
 */

import { computeEstimatedCost } from './stats';

describe('computeEstimatedCost', () => {
  it('should compute cost for known model (openai:gpt-4o)', () => {
    // gpt-4o: input=$2.5/1M, output=$10/1M
    const cost = computeEstimatedCost('openai', 'gpt-4o', 1000, 500);
    // Expected: (1000 * 2.5 + 500 * 10) / 1_000_000 = (2500 + 5000) / 1_000_000 = 0.0075
    expect(cost).toBeCloseTo(0.0075, 6);
  });

  it('should compute cost for openai:gpt-4o-mini', () => {
    // gpt-4o-mini: input=$0.15/1M, output=$0.6/1M
    const cost = computeEstimatedCost('openai', 'gpt-4o-mini', 10000, 5000);
    // Expected: (10000 * 0.15 + 5000 * 0.6) / 1_000_000 = (1500 + 3000) / 1_000_000 = 0.0045
    expect(cost).toBeCloseTo(0.0045, 6);
  });

  it('should compute cost for anthropic:claude-sonnet-4-20250514', () => {
    // claude-sonnet-4: input=$3/1M, output=$15/1M
    const cost = computeEstimatedCost('anthropic', 'claude-sonnet-4-20250514', 2000, 1000);
    // Expected: (2000 * 3 + 1000 * 15) / 1_000_000 = (6000 + 15000) / 1_000_000 = 0.021
    expect(cost).toBeCloseTo(0.021, 6);
  });

  it('should compute cost for deepseek:deepseek-chat', () => {
    // deepseek-chat: input=$0.27/1M, output=$1.1/1M
    const cost = computeEstimatedCost('deepseek', 'deepseek-chat', 5000, 3000);
    // Expected: (5000 * 0.27 + 3000 * 1.1) / 1_000_000 = (1350 + 3300) / 1_000_000 = 0.00465
    expect(cost).toBeCloseTo(0.00465, 6);
  });

  it('should return undefined for unknown model', () => {
    const cost = computeEstimatedCost('unknown-provider', 'unknown-model', 1000, 500);
    expect(cost).toBeUndefined();
  });

  it('should return undefined for unknown provider with known model name', () => {
    const cost = computeEstimatedCost('wrong-provider', 'gpt-4o', 1000, 500);
    expect(cost).toBeUndefined();
  });

  it('should return 0 for zero tokens', () => {
    const cost = computeEstimatedCost('openai', 'gpt-4o', 0, 0);
    expect(cost).toBe(0);
  });

  it('should handle large token counts', () => {
    // 1M input tokens, 500K output tokens with gpt-4o
    const cost = computeEstimatedCost('openai', 'gpt-4o', 1_000_000, 500_000);
    // Expected: (1_000_000 * 2.5 + 500_000 * 10) / 1_000_000 = 2.5 + 5.0 = 7.5
    expect(cost).toBeCloseTo(7.5, 4);
  });

  it('should handle output-only tokens', () => {
    const cost = computeEstimatedCost('openai', 'gpt-4o', 0, 1000);
    // Expected: (0 + 1000 * 10) / 1_000_000 = 0.01
    expect(cost).toBeCloseTo(0.01, 6);
  });

  it('should handle input-only tokens', () => {
    const cost = computeEstimatedCost('openai', 'gpt-4o', 1000, 0);
    // Expected: (1000 * 2.5 + 0) / 1_000_000 = 0.0025
    expect(cost).toBeCloseTo(0.0025, 6);
  });
});
