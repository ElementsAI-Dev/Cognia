/**
 * Efficiency Score Calculation
 *
 * Pure business logic for computing efficiency metrics.
 */

import type { EfficiencyData } from '@/types/observability';

/**
 * Calculate efficiency scores from raw metrics
 */
export function calculateEfficiencyScores(metrics: {
  costPerKToken: number;
  averageLatency: number;
  errorRate: number;
  tokensPerDollar: number;
  totalRequests: number;
}): EfficiencyData {
  // Cost efficiency: lower cost per token = higher score
  // Assume $0.01/K tokens is excellent, $0.10/K is poor
  const costEfficiency = Math.max(0, Math.min(100, 100 - (metrics.costPerKToken / 0.1) * 100));

  // Token efficiency: more tokens per dollar = higher score
  // Assume 100K tokens/$ is excellent, 10K is poor
  const tokenEfficiency = Math.max(0, Math.min(100, (metrics.tokensPerDollar / 100000) * 100));

  // Latency score: lower latency = higher score
  // Assume 500ms is excellent, 5000ms is poor
  const latencyScore = Math.max(0, Math.min(100, 100 - (metrics.averageLatency / 5000) * 100));

  // Error score: lower error rate = higher score
  const errorScore = Math.max(0, Math.min(100, (1 - metrics.errorRate) * 100));

  // Utilization score: based on request volume (placeholder logic)
  const utilizationScore = Math.min(100, (metrics.totalRequests / 100) * 100);

  return {
    costEfficiency,
    tokenEfficiency,
    latencyScore,
    errorScore,
    utilizationScore,
  };
}
