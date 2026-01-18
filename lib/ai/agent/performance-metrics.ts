/**
 * Performance Metrics - Collect and analyze agent execution performance
 * 
 * Features:
 * - Execution timing and duration tracking
 * - Token usage monitoring
 * - Tool call performance metrics
 * - Cache hit rate tracking
 * - Error and retry statistics
 */

import { nanoid } from 'nanoid';
import type { ToolCall } from './agent-executor';

export interface AgentMetrics {
  executionId: string;
  sessionId?: string;
  startTime: Date;
  endTime?: Date;
  totalDuration?: number;
  steps: StepMetrics[];
  toolCalls: ToolCallMetrics[];
  tokenUsage: TokenUsageMetrics;
  cacheStats: CacheMetrics;
  errorCount: number;
  retryCount: number;
  stopReason?: string;
}

export interface StepMetrics {
  stepNumber: number;
  startTime: Date;
  endTime: Date;
  duration: number;
  toolCallCount: number;
  tokenUsage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason?: 'stop' | 'tool-calls' | 'length' | 'content-filter' | 'error' | 'other';
}

export interface ToolCallMetrics {
  toolCallId: string;
  toolName: string;
  args: Record<string, unknown>;
  startTime: Date;
  endTime: Date;
  duration: number;
  success: boolean;
  cached: boolean;
  errorMessage?: string;
  retryCount?: number;
}

export interface TokenUsageMetrics {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCost?: number;
}

export interface CacheMetrics {
  hits: number;
  misses: number;
  hitRate: number;
  savedCalls: number;
}

export interface MetricsSummary {
  totalExecutions: number;
  averageDuration: number;
  averageSteps: number;
  averageToolCalls: number;
  totalTokens: number;
  averageTokensPerExecution: number;
  cacheHitRate: number;
  errorRate: number;
  retryRate: number;
}

class MetricsCollector {
  private metrics: Map<string, AgentMetrics> = new Map();
  private history: AgentMetrics[] = [];
  private maxHistorySize: number = 100;

  /**
   * Start tracking a new execution
   */
  startExecution(executionId?: string, sessionId?: string): string {
    const id = executionId || nanoid();
    
    const metrics: AgentMetrics = {
      executionId: id,
      sessionId,
      startTime: new Date(),
      steps: [],
      toolCalls: [],
      tokenUsage: {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
      },
      cacheStats: {
        hits: 0,
        misses: 0,
        hitRate: 0,
        savedCalls: 0,
      },
      errorCount: 0,
      retryCount: 0,
    };

    this.metrics.set(id, metrics);
    return id;
  }

  /**
   * Record step metrics
   */
  recordStep(
    executionId: string,
    stepNumber: number,
    stepStartTime: Date,
    stepEndTime: Date,
    toolCalls: ToolCall[],
    finishReason?: string
  ): void {
    const metrics = this.metrics.get(executionId);
    if (!metrics) return;

    const duration = stepEndTime.getTime() - stepStartTime.getTime();
    
    const stepMetrics: StepMetrics = {
      stepNumber,
      startTime: stepStartTime,
      endTime: stepEndTime,
      duration,
      toolCallCount: toolCalls.length,
      tokenUsage: {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
      },
      finishReason: finishReason as 'stop' | 'tool-calls' | 'length' | 'content-filter' | 'error' | 'other',
    };

    // Extract token usage from tool calls if available
    for (const toolCall of toolCalls) {
      if (toolCall.status === 'error') {
        metrics.errorCount++;
      }
    }

    metrics.steps.push(stepMetrics);
  }

  /**
   * Record token usage for a step
   */
  recordTokenUsage(
    executionId: string,
    stepNumber: number,
    promptTokens: number,
    completionTokens: number
  ): void {
    const metrics = this.metrics.get(executionId);
    if (!metrics) return;

    const step = metrics.steps.find(s => s.stepNumber === stepNumber);
    if (step) {
      step.tokenUsage = {
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
      };
    }

    metrics.tokenUsage.promptTokens += promptTokens;
    metrics.tokenUsage.completionTokens += completionTokens;
    metrics.tokenUsage.totalTokens += promptTokens + completionTokens;
  }

  /**
   * Record tool call metrics
   */
  recordToolCall(
    executionId: string,
    toolCallId: string,
    toolName: string,
    args: Record<string, unknown>,
    startTime: Date,
    endTime: Date,
    success: boolean,
    cached: boolean,
    errorMessage?: string,
    retryCount?: number
  ): void {
    const metrics = this.metrics.get(executionId);
    if (!metrics) return;

    const duration = endTime.getTime() - startTime.getTime();

    const toolCallMetrics: ToolCallMetrics = {
      toolCallId,
      toolName,
      args,
      startTime,
      endTime,
      duration,
      success,
      cached,
      errorMessage,
      retryCount,
    };

    metrics.toolCalls.push(toolCallMetrics);

    if (!success) {
      metrics.errorCount++;
    }

    if (cached) {
      metrics.cacheStats.hits++;
      metrics.cacheStats.savedCalls++;
    } else {
      metrics.cacheStats.misses++;
    }

    if (retryCount && retryCount > 0) {
      metrics.retryCount += retryCount;
    }

    // Update cache hit rate
    const total = metrics.cacheStats.hits + metrics.cacheStats.misses;
    metrics.cacheStats.hitRate = total > 0 ? metrics.cacheStats.hits / total : 0;
  }

  /**
   * End execution tracking
   */
  endExecution(executionId: string, stopReason?: string): AgentMetrics | null {
    const metrics = this.metrics.get(executionId);
    if (!metrics) return null;

    metrics.endTime = new Date();
    metrics.totalDuration = metrics.endTime.getTime() - metrics.startTime.getTime();
    metrics.stopReason = stopReason;

    // Add to history
    this.history.push({ ...metrics });
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }

    // Remove from active metrics
    this.metrics.delete(executionId);

    return metrics;
  }

  /**
   * Get metrics for a specific execution
   */
  getMetrics(executionId: string): AgentMetrics | null {
    return this.metrics.get(executionId) || null;
  }

  /**
   * Get all active executions
   */
  getActiveExecutions(): AgentMetrics[] {
    return Array.from(this.metrics.values());
  }

  /**
   * Get execution history
   */
  getHistory(limit?: number): AgentMetrics[] {
    if (limit) {
      return this.history.slice(-limit);
    }
    return [...this.history];
  }

  /**
   * Get summary statistics
   */
  getSummary(): MetricsSummary {
    const allMetrics = [...this.history, ...Array.from(this.metrics.values())];
    
    if (allMetrics.length === 0) {
      return {
        totalExecutions: 0,
        averageDuration: 0,
        averageSteps: 0,
        averageToolCalls: 0,
        totalTokens: 0,
        averageTokensPerExecution: 0,
        cacheHitRate: 0,
        errorRate: 0,
        retryRate: 0,
      };
    }

    const totalDuration = allMetrics.reduce((sum, m) => sum + (m.totalDuration || 0), 0);
    const totalSteps = allMetrics.reduce((sum, m) => sum + m.steps.length, 0);
    const totalToolCalls = allMetrics.reduce((sum, m) => sum + m.toolCalls.length, 0);
    const totalTokens = allMetrics.reduce((sum, m) => sum + m.tokenUsage.totalTokens, 0);
    const totalErrors = allMetrics.reduce((sum, m) => sum + m.errorCount, 0);
    const totalRetries = allMetrics.reduce((sum, m) => sum + m.retryCount, 0);
    const totalCacheHits = allMetrics.reduce((sum, m) => sum + m.cacheStats.hits, 0);
    const totalCacheMisses = allMetrics.reduce((sum, m) => sum + m.cacheStats.misses, 0);

    const totalCacheCalls = totalCacheHits + totalCacheMisses;

    return {
      totalExecutions: allMetrics.length,
      averageDuration: totalDuration / allMetrics.length,
      averageSteps: totalSteps / allMetrics.length,
      averageToolCalls: totalToolCalls / allMetrics.length,
      totalTokens,
      averageTokensPerExecution: totalTokens / allMetrics.length,
      cacheHitRate: totalCacheCalls > 0 ? totalCacheHits / totalCacheCalls : 0,
      errorRate: totalToolCalls > 0 ? totalErrors / totalToolCalls : 0,
      retryRate: totalToolCalls > 0 ? totalRetries / totalToolCalls : 0,
    };
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics.clear();
    this.history = [];
  }

  /**
   * Clear history only
   */
  clearHistory(): void {
    this.history = [];
  }
}

// Global metrics collector instance
export const globalMetricsCollector = new MetricsCollector();

export default MetricsCollector;
