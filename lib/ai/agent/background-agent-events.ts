/**
 * Background Agent Event System
 * Provides a centralized event bus for background agent lifecycle events
 */

import type {
  BackgroundAgent,
  BackgroundAgentLog,
  BackgroundAgentStep,
  BackgroundAgentNotification,
  BackgroundAgentResult,
} from '@/types/agent/background-agent';
import type { SubAgent, SubAgentResult } from '@/types/agent/sub-agent';
import type { ToolCall } from './agent-executor';
import { loggers } from '@/lib/logger';

const log = loggers.agent;

/**
 * Event types for background agent system
 */
export type BackgroundAgentEventType =
  | 'agent:created'
  | 'agent:queued'
  | 'agent:started'
  | 'agent:progress'
  | 'agent:step'
  | 'agent:paused'
  | 'agent:resumed'
  | 'agent:completed'
  | 'agent:failed'
  | 'agent:cancelled'
  | 'agent:timeout'
  | 'agent:log'
  | 'agent:notification'
  | 'agent:checkpoint'
  | 'agent:health_warning'
  | 'subagent:created'
  | 'subagent:started'
  | 'subagent:completed'
  | 'subagent:failed'
  | 'tool:called'
  | 'tool:result'
  | 'queue:paused'
  | 'queue:resumed'
  | 'queue:updated'
  | 'manager:shutdown';

/**
 * Event payload types
 */
export interface BackgroundAgentEventPayloads {
  'agent:created': { agent: BackgroundAgent };
  'agent:queued': { agent: BackgroundAgent; position: number };
  'agent:started': { agent: BackgroundAgent };
  'agent:progress': { agent: BackgroundAgent; progress: number; phase: string };
  'agent:step': { agent: BackgroundAgent; step: BackgroundAgentStep };
  'agent:paused': { agent: BackgroundAgent; checkpoint?: AgentCheckpoint };
  'agent:resumed': { agent: BackgroundAgent; fromCheckpoint: boolean };
  'agent:completed': { agent: BackgroundAgent; result: BackgroundAgentResult };
  'agent:failed': { agent: BackgroundAgent; error: string };
  'agent:cancelled': { agent: BackgroundAgent };
  'agent:timeout': { agent: BackgroundAgent; duration: number };
  'agent:log': { agent: BackgroundAgent; log: BackgroundAgentLog };
  'agent:notification': { agent: BackgroundAgent; notification: BackgroundAgentNotification };
  'agent:checkpoint': { agent: BackgroundAgent; checkpoint: AgentCheckpoint };
  'agent:health_warning': { agent: BackgroundAgent; warning: HealthWarning };
  'subagent:created': { agent: BackgroundAgent; subAgent: SubAgent };
  'subagent:started': { agent: BackgroundAgent; subAgent: SubAgent };
  'subagent:completed': { agent: BackgroundAgent; subAgent: SubAgent; result: SubAgentResult };
  'subagent:failed': { agent: BackgroundAgent; subAgent: SubAgent; error: string };
  'tool:called': { agent: BackgroundAgent; toolCall: ToolCall };
  'tool:result': { agent: BackgroundAgent; toolCall: ToolCall };
  'queue:paused': { reason?: string };
  'queue:resumed': Record<string, never>;
  'queue:updated': { queueLength: number; running: number; maxConcurrent: number };
  'manager:shutdown': {
    completedAgents: string[];
    cancelledAgents: string[];
    savedCheckpoints: string[];
    duration: number;
  };
}

/**
 * Checkpoint data for pause/resume
 */
export interface AgentCheckpoint {
  id: string;
  agentId: string;
  timestamp: Date;
  currentStep: number;
  currentPhase: 'planning' | 'executing' | 'summarizing';
  completedSubAgents: string[];
  pendingSubAgents: string[];
  accumulatedContext: Record<string, unknown>;
  partialResults: Record<string, unknown>;
  conversationHistory: Array<{ role: string; content: string }>;
}

/**
 * Health warning types
 */
export interface HealthWarning {
  type: 'stalled' | 'slow_progress' | 'high_retry_count' | 'memory_pressure';
  message: string;
  timestamp: Date;
  metrics?: Record<string, number>;
}

/**
 * Execution statistics for performance monitoring
 */
export interface ExecutionStatistics {
  agentId: string;
  totalDuration: number;
  planningDuration: number;
  executionDuration: number;
  aggregationDuration: number;
  totalSteps: number;
  completedSteps: number;
  failedSteps: number;
  totalSubAgents: number;
  completedSubAgents: number;
  failedSubAgents: number;
  totalToolCalls: number;
  successfulToolCalls: number;
  failedToolCalls: number;
  retryCount: number;
  tokenUsage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  averageStepDuration: number;
  peakMemoryUsage?: number;
}

/**
 * Event listener type
 */
export type BackgroundAgentEventListener<T extends BackgroundAgentEventType> = (
  payload: BackgroundAgentEventPayloads[T]
) => void;

/**
 * Background Agent Event Emitter
 */
export class BackgroundAgentEventEmitter {
  private listeners: Map<BackgroundAgentEventType, Set<BackgroundAgentEventListener<BackgroundAgentEventType>>> = new Map();
  private wildcardListeners: Set<(event: BackgroundAgentEventType, payload: unknown) => void> = new Set();

  /**
   * Subscribe to a specific event type
   */
  on<T extends BackgroundAgentEventType>(
    event: T,
    listener: BackgroundAgentEventListener<T>
  ): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener as BackgroundAgentEventListener<BackgroundAgentEventType>);

    // Return unsubscribe function
    return () => {
      this.off(event, listener);
    };
  }

  /**
   * Subscribe to all events (wildcard)
   */
  onAll(listener: (event: BackgroundAgentEventType, payload: unknown) => void): () => void {
    this.wildcardListeners.add(listener);
    return () => {
      this.wildcardListeners.delete(listener);
    };
  }

  /**
   * Unsubscribe from an event
   */
  off<T extends BackgroundAgentEventType>(
    event: T,
    listener: BackgroundAgentEventListener<T>
  ): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.delete(listener as BackgroundAgentEventListener<BackgroundAgentEventType>);
    }
  }

  /**
   * Emit an event
   */
  emit<T extends BackgroundAgentEventType>(
    event: T,
    payload: BackgroundAgentEventPayloads[T]
  ): void {
    // Notify specific listeners
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.forEach((listener) => {
        try {
          listener(payload);
        } catch (error) {
          log.error(`Error in event listener for ${event}`, error as Error, { event });
        }
      });
    }

    // Notify wildcard listeners
    this.wildcardListeners.forEach((listener) => {
      try {
        listener(event, payload);
      } catch (error) {
        log.error(`Error in wildcard event listener for ${event}`, error as Error, { event });
      }
    });
  }

  /**
   * Wait for a specific event (returns a promise)
   */
  once<T extends BackgroundAgentEventType>(
    event: T,
    timeout?: number
  ): Promise<BackgroundAgentEventPayloads[T]> {
    return new Promise((resolve, reject) => {
      let timeoutId: ReturnType<typeof setTimeout> | null = null;

      const unsubscribe = this.on(event, (payload) => {
        if (timeoutId) clearTimeout(timeoutId);
        unsubscribe();
        resolve(payload);
      });

      if (timeout) {
        timeoutId = setTimeout(() => {
          unsubscribe();
          reject(new Error(`Timeout waiting for event: ${event}`));
        }, timeout);
      }
    });
  }

  /**
   * Remove all listeners for an event or all events
   */
  removeAllListeners(event?: BackgroundAgentEventType): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
      this.wildcardListeners.clear();
    }
  }

  /**
   * Get listener count for an event
   */
  listenerCount(event: BackgroundAgentEventType): number {
    return this.listeners.get(event)?.size ?? 0;
  }
}

// Global event emitter instance
let globalEventEmitter: BackgroundAgentEventEmitter | null = null;

/**
 * Get the global background agent event emitter
 */
export function getBackgroundAgentEventEmitter(): BackgroundAgentEventEmitter {
  if (!globalEventEmitter) {
    globalEventEmitter = new BackgroundAgentEventEmitter();
  }
  return globalEventEmitter;
}

/**
 * Create a new event emitter instance
 */
export function createBackgroundAgentEventEmitter(): BackgroundAgentEventEmitter {
  return new BackgroundAgentEventEmitter();
}
