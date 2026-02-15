/**
 * Unified Context Budget Manager
 *
 * Single entry point for computing how tokens should be allocated across
 * the different segments of a prompt: system prompt, RAG context,
 * cross-session history, user messages, and response reserve.
 *
 * Consumers: chat-container, context-manager, agent-orchestrator, agent-team
 */

import { getModelContextLimits } from './model-limits';
import { estimateTokens } from '@/lib/context/context-fs';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface BudgetInput {
  /** Model identifier for automatic limit lookup */
  model: string;
  /** User-configured context limit percentage (0–100) */
  contextLimitPercent?: number;
  /** Pre-counted tokens for each segment (pass 0 if unused) */
  segments: {
    systemPrompt?: number;
    ragContext?: number;
    crossSessionHistory?: number;
    messages?: number;
    toolDescriptions?: number;
  };
}

export interface BudgetAllocation {
  /** Absolute hard cap from model spec */
  modelMaxTokens: number;
  /** Effective cap after user limit percent applied */
  effectiveMaxTokens: number;
  /** Tokens reserved for model response output */
  reserveTokens: number;
  /** Total tokens available for input (effective - reserve) */
  availableInputTokens: number;

  /** Per-segment token counts (echoed back from input) */
  segments: {
    systemPrompt: number;
    ragContext: number;
    crossSessionHistory: number;
    messages: number;
    toolDescriptions: number;
  };

  /** Sum of all segments */
  usedInputTokens: number;
  /** Remaining headroom (available - used) */
  remainingTokens: number;
  /** Utilization percentage 0–100 */
  utilizationPercent: number;
  /** Health status derived from utilization */
  status: 'healthy' | 'warning' | 'critical';
}

// ─── Core ────────────────────────────────────────────────────────────────────

/**
 * Compute a full budget allocation for the current prompt state.
 */
export function computeBudget(input: BudgetInput): BudgetAllocation {
  const limits = getModelContextLimits(input.model);
  const limitPercent = input.contextLimitPercent ?? 100;
  const effectiveMaxTokens = Math.round((limitPercent / 100) * limits.maxTokens);

  const reserveTokens = limits.reserveTokens;
  const availableInputTokens = Math.max(0, effectiveMaxTokens - reserveTokens);

  const segments = {
    systemPrompt: input.segments.systemPrompt ?? 0,
    ragContext: input.segments.ragContext ?? 0,
    crossSessionHistory: input.segments.crossSessionHistory ?? 0,
    messages: input.segments.messages ?? 0,
    toolDescriptions: input.segments.toolDescriptions ?? 0,
  };

  const usedInputTokens = Object.values(segments).reduce((a, b) => a + b, 0);
  const remainingTokens = Math.max(0, availableInputTokens - usedInputTokens);
  const utilizationPercent =
    availableInputTokens > 0
      ? Math.min(100, Math.round((usedInputTokens / availableInputTokens) * 100))
      : 0;

  let status: 'healthy' | 'warning' | 'critical';
  if (utilizationPercent >= 90) {
    status = 'critical';
  } else if (utilizationPercent >= 70) {
    status = 'warning';
  } else {
    status = 'healthy';
  }

  return {
    modelMaxTokens: limits.maxTokens,
    effectiveMaxTokens,
    reserveTokens,
    availableInputTokens,
    segments,
    usedInputTokens,
    remainingTokens,
    utilizationPercent,
    status,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * How many tokens can a particular segment still grow into
 * without pushing overall utilization past `maxUtilizationPercent`.
 */
export function segmentHeadroom(
  budget: BudgetAllocation,
  segment: keyof BudgetAllocation['segments'],
  maxUtilizationPercent: number = 90
): number {
  const capTokens = Math.round(
    (maxUtilizationPercent / 100) * budget.availableInputTokens
  );
  const otherSegments =
    budget.usedInputTokens - budget.segments[segment];
  return Math.max(0, capTokens - otherSegments);
}

/**
 * Quick check: is the budget in a state where compression is recommended?
 */
export function isCompressionRecommended(budget: BudgetAllocation): boolean {
  return budget.status === 'warning' || budget.status === 'critical';
}

/**
 * Estimate tokens for a raw text string (convenience re-export).
 */
export { estimateTokens };
