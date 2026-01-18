/**
 * Observability Integration for AI Chat
 * 
 * Integrates Langfuse and OpenTelemetry into the AI chat system
 * to provide comprehensive observability for chat sessions.
 */

import {
  createChatTrace,
  createGenerationWithErrorHandling,
} from './langfuse-client';
import {
  OpenTelemetryUtils,
  AISpanAttributes,
} from './tracing';
import type { CoreMessage } from 'ai';

/**
 * Observability configuration for chat
 */
export interface ChatObservabilityConfig {
  /** Enable Langfuse tracking */
  enableLangfuse?: boolean;
  /** Enable OpenTelemetry tracing */
  enableOpenTelemetry?: boolean;
  /** Session ID */
  sessionId: string;
  /** User ID */
  userId?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Chat observability manager
 */
export class ChatObservabilityManager {
  private sessionId: string;
  private userId?: string;
  private metadata?: Record<string, unknown>;
  private langfuseTrace: ReturnType<typeof createChatTrace> | null = null;
  private enableLangfuse: boolean;
  private enableOpenTelemetry: boolean;

  constructor(config: ChatObservabilityConfig) {
    this.sessionId = config.sessionId;
    this.userId = config.userId;
    this.metadata = config.metadata;
    this.enableLangfuse = config.enableLangfuse ?? true;
    this.enableOpenTelemetry = config.enableOpenTelemetry ?? true;
  }

  /**
   * Start a chat session
   */
  startChat() {
    if (this.enableLangfuse) {
      this.langfuseTrace = createChatTrace({
        sessionId: this.sessionId,
        userId: this.userId,
        metadata: this.metadata,
      });
    }
  }

  /**
   * Track a message generation
   */
  async trackGeneration(
    model: string,
    provider: string,
    messages: CoreMessage[],
    fn: () => Promise<{
      text: string;
      usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
    }>,
    options?: {
      temperature?: number;
      maxTokens?: number;
      topP?: number;
    }
  ) {
    const result = await OpenTelemetryUtils.trackAIGeneration(
      model,
      provider,
      fn,
      {
        sessionId: this.sessionId,
        userId: this.userId,
        temperature: options?.temperature,
        maxTokens: options?.maxTokens,
        attributes: {
          [AISpanAttributes.SESSION_ID]: this.sessionId,
          [AISpanAttributes.USER_ID]: this.userId,
          ...(options?.topP !== undefined && { topP: String(options.topP) }),
          ...this.metadata,
        },
      }
    );

    if (this.enableLangfuse && this.langfuseTrace) {
      await createGenerationWithErrorHandling(
        this.langfuseTrace,
        {
          name: 'chat-generation',
          model,
          modelParameters: {
            ...(options?.temperature !== undefined && { temperature: options.temperature }),
            ...(options?.maxTokens !== undefined && { maxTokens: options.maxTokens }),
            ...(options?.topP !== undefined && { topP: options.topP }),
          },
          input: messages,
          output: result.text,
          usage: result.usage,
          metadata: this.metadata,
        },
        async () => result
      );
    }

    return result;
  }

  /**
   * Track a streaming generation
   */
  trackStreamingGeneration(
    model: string,
    provider: string,
    messages: CoreMessage[],
    options?: {
      temperature?: number;
      maxTokens?: number;
      topP?: number;
    }
  ) {
    // For streaming, we create a generation that will be updated as chunks come in
    if (this.enableLangfuse && this.langfuseTrace) {
      const generation = this.langfuseTrace.generation({
        name: 'chat-streaming',
        model,
        modelParameters: {
          ...(options?.temperature !== undefined && { temperature: options.temperature }),
          ...(options?.maxTokens !== undefined && { maxTokens: options.maxTokens }),
          ...(options?.topP !== undefined && { topP: options.topP }),
        },
        input: messages,
        metadata: this.metadata,
      });

      return {
        updateChunk: (chunk: string) => {
          generation.update({
            output: chunk,
          });
        },
        end: (finalText: string, usage?: { promptTokens: number; completionTokens: number; totalTokens: number }) => {
          generation.update({
            output: finalText,
            usage: usage ? {
              input: usage.promptTokens,
              output: usage.completionTokens,
              total: usage.totalTokens,
              unit: 'TOKENS',
            } : undefined,
          });
          generation.end();
        },
      };
    }

    return null;
  }

  /**
   * End the chat session
   */
  async endChat() {
    // Langfuse traces are automatically flushed, no manual end needed
  }

  /**
   * Get trace URL
   */
  getTraceUrl(): string | null {
    if (this.langfuseTrace && this.langfuseTrace.getTraceUrl) {
      return this.langfuseTrace.getTraceUrl();
    }
    return null;
  }
}

/**
 * Create a chat observability manager
 */
export function createChatObservabilityManager(
  config: ChatObservabilityConfig
): ChatObservabilityManager {
  return new ChatObservabilityManager(config);
}
