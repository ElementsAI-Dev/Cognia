/**
 * Context Compression Utilities
 *
 * Implements compression strategies for managing chat context:
 * - summary: Summarize older messages using AI
 * - sliding-window: Keep only the most recent N messages
 * - selective: Keep important messages and summarize others
 * - hybrid: Combination of sliding window + summary
 */

import type { UIMessage } from '@/types/message';
import type {
  CompressionSettings,
  CompressionStrategy,
  CompressionResult,
  CompressionHistoryEntry,
  ContextState,
  SessionCompressionOverrides,
} from '@/types/compression';
import { DEFAULT_COMPRESSION_SETTINGS } from '@/types/compression';
import { calculateTokenBreakdown, countTokens } from '@/hooks/use-token-count';
import { nanoid } from 'nanoid';

/**
 * Merge global settings with per-session overrides
 */
export function mergeCompressionSettings(
  globalSettings: CompressionSettings,
  sessionOverrides?: SessionCompressionOverrides
): CompressionSettings {
  if (!sessionOverrides) return globalSettings;

  return {
    ...globalSettings,
    enabled: sessionOverrides.compressionEnabled ?? globalSettings.enabled,
    strategy: sessionOverrides.compressionStrategy ?? globalSettings.strategy,
    trigger: sessionOverrides.compressionTrigger ?? globalSettings.trigger,
    tokenThreshold: sessionOverrides.tokenThreshold ?? globalSettings.tokenThreshold,
    messageCountThreshold: sessionOverrides.messageCountThreshold ?? globalSettings.messageCountThreshold,
    preserveRecentMessages: sessionOverrides.preserveRecentMessages ?? globalSettings.preserveRecentMessages,
  };
}

/**
 * Calculate context state for compression decision making
 */
export function calculateContextState(
  messages: UIMessage[],
  maxTokens: number,
  provider?: string,
  model?: string
): ContextState {
  const breakdown = calculateTokenBreakdown(messages, { provider, model });
  const utilizationPercent = maxTokens > 0
    ? Math.round((breakdown.totalTokens / maxTokens) * 100)
    : 0;

  let status: 'healthy' | 'warning' | 'danger';
  if (utilizationPercent >= 90) {
    status = 'danger';
  } else if (utilizationPercent >= 70) {
    status = 'warning';
  } else {
    status = 'healthy';
  }

  // Determine if compression is recommended
  const compressionRecommended = utilizationPercent >= 70;

  // Recommend strategy based on context state
  let recommendedStrategy: CompressionStrategy | undefined;
  if (compressionRecommended) {
    if (utilizationPercent >= 90) {
      // Critical - use aggressive sliding window
      recommendedStrategy = 'sliding-window';
    } else if (messages.length > 50) {
      // Many messages - use hybrid
      recommendedStrategy = 'hybrid';
    } else {
      // Moderate - use summary
      recommendedStrategy = 'summary';
    }
  }

  return {
    totalTokens: breakdown.totalTokens,
    maxTokens,
    utilizationPercent,
    messageCount: messages.length,
    status,
    compressionRecommended,
    recommendedStrategy,
  };
}

/**
 * Check if compression should be triggered
 */
export function shouldTriggerCompression(
  settings: CompressionSettings,
  contextState: ContextState
): boolean {
  if (!settings.enabled) return false;
  if (settings.trigger === 'manual') return false;

  if (settings.trigger === 'token-threshold') {
    return contextState.utilizationPercent >= settings.tokenThreshold;
  }

  if (settings.trigger === 'message-count') {
    return contextState.messageCount >= settings.messageCountThreshold;
  }

  return false;
}

/**
 * Sliding window compression: Keep only the most recent messages
 */
export function applySlidingWindow(
  messages: UIMessage[],
  settings: CompressionSettings
): { filteredMessages: UIMessage[]; compressedIds: string[] } {
  const { preserveRecentMessages, preserveSystemMessages } = settings;

  // Get system messages if they should be preserved
  const systemMessages = preserveSystemMessages
    ? messages.filter(m => m.role === 'system')
    : [];

  // Get non-system messages
  const nonSystemMessages = messages.filter(m => m.role !== 'system');

  // Take only the most recent messages
  const recentMessages = nonSystemMessages.slice(-preserveRecentMessages);

  // Get compressed message IDs
  const recentIds = new Set(recentMessages.map(m => m.id));
  const systemIds = new Set(systemMessages.map(m => m.id));
  const compressedIds = messages
    .filter(m => !recentIds.has(m.id) && !systemIds.has(m.id))
    .map(m => m.id);

  // Combine system messages with recent messages
  const filteredMessages = [...systemMessages, ...recentMessages];

  return { filteredMessages, compressedIds };
}

/**
 * Selective compression: Keep important messages
 */
export function applySelectiveCompression(
  messages: UIMessage[],
  settings: CompressionSettings
): { filteredMessages: UIMessage[]; compressedIds: string[] } {
  const { preserveRecentMessages, preserveSystemMessages } = settings;

  // Define importance criteria
  const isImportantMessage = (msg: UIMessage): boolean => {
    // System messages are always important if preservation is enabled
    if (msg.role === 'system' && preserveSystemMessages) return true;

    // Check for important content patterns
    const content = msg.content.toLowerCase();

    // Code blocks are important
    if (content.includes('```')) return true;

    // Messages with tool calls are important
    if ((msg as { toolInvocations?: unknown[] }).toolInvocations?.length) return true;

    // Messages with artifacts are important
    if (content.includes('artifact') || content.includes('<artifact')) return true;

    // Questions and key responses (heuristic)
    if (msg.role === 'user' && content.endsWith('?')) return true;

    // Messages with structured data
    if (content.includes('{') && content.includes('}')) return true;

    return false;
  };

  // Separate messages
  const importantMessages: UIMessage[] = [];
  const regularMessages: UIMessage[] = [];

  messages.forEach(msg => {
    if (isImportantMessage(msg)) {
      importantMessages.push(msg);
    } else {
      regularMessages.push(msg);
    }
  });

  // Keep all important messages and recent regular messages
  const recentRegular = regularMessages.slice(-Math.max(3, preserveRecentMessages - importantMessages.length));

  // Combine and sort by original order
  const allIds = messages.map(m => m.id);
  const filteredMessages = [...importantMessages, ...recentRegular].sort(
    (a, b) => allIds.indexOf(a.id) - allIds.indexOf(b.id)
  );

  const filteredIds = new Set(filteredMessages.map(m => m.id));
  const compressedIds = messages.filter(m => !filteredIds.has(m.id)).map(m => m.id);

  return { filteredMessages, compressedIds };
}

/**
 * Generate a summary of messages using a simple extraction approach
 * This is a fallback when AI summarization is not available
 */
export function generateSimpleSummary(messages: UIMessage[]): string {
  if (messages.length === 0) return '';

  // Extract key points from each message
  const keyPoints: string[] = [];

  messages.forEach((msg, index) => {
    const role = msg.role === 'user' ? 'User' : 'Assistant';
    const content = msg.content.trim();

    // Skip very short messages
    if (content.length < 20) return;

    // Extract first sentence or significant chunk
    const firstSentence = content.split(/[.!?]\s/)[0];
    const summary = firstSentence.length > 150
      ? firstSentence.substring(0, 147) + '...'
      : firstSentence;

    if (index < 3 || index >= messages.length - 2) {
      // Keep more detail for first and last few messages
      keyPoints.push(`${role}: ${summary}`);
    }
  });

  return `[Conversation Summary (${messages.length} messages)]\n${keyPoints.join('\n')}`;
}

/**
 * Create a summary message from compressed messages
 */
export function createSummaryMessage(
  compressedMessages: UIMessage[],
  summaryText?: string
): UIMessage {
  const summary = summaryText || generateSimpleSummary(compressedMessages);
  const now = new Date();

  return {
    id: nanoid(),
    role: 'system',
    content: summary,
    createdAt: now,
    // @ts-expect-error compressionState is a custom extension
    compressionState: {
      isSummary: true,
      summarizedMessageIds: compressedMessages.map(m => m.id),
      originalMessageCount: compressedMessages.length,
      originalTokenCount: compressedMessages.reduce((sum, m) => sum + countTokens(m.content), 0),
      compressedAt: now,
      strategyUsed: 'summary',
    },
  };
}

/**
 * Hybrid compression: Sliding window for recent + summary for older
 */
export function applyHybridCompression(
  messages: UIMessage[],
  settings: CompressionSettings,
  _summaryGenerator?: (msgs: UIMessage[]) => Promise<string>
): { filteredMessages: UIMessage[]; compressedIds: string[]; needsSummary: boolean; messagesToSummarize: UIMessage[] } {
  const { preserveRecentMessages, preserveSystemMessages } = settings;

  // Separate system messages
  const systemMessages = preserveSystemMessages
    ? messages.filter(m => m.role === 'system')
    : [];
  const nonSystemMessages = messages.filter(m => m.role !== 'system');

  if (nonSystemMessages.length <= preserveRecentMessages) {
    // Not enough messages to compress
    return {
      filteredMessages: messages,
      compressedIds: [],
      needsSummary: false,
      messagesToSummarize: [],
    };
  }

  // Split into older and recent
  const splitIndex = nonSystemMessages.length - preserveRecentMessages;
  const olderMessages = nonSystemMessages.slice(0, splitIndex);
  const recentMessages = nonSystemMessages.slice(splitIndex);

  // Compressed IDs are the older messages
  const compressedIds = olderMessages.map(m => m.id);

  return {
    filteredMessages: [...systemMessages, ...recentMessages],
    compressedIds,
    needsSummary: olderMessages.length > 0,
    messagesToSummarize: olderMessages,
  };
}

/**
 * Apply compression to messages based on strategy
 */
export async function compressMessages(
  messages: UIMessage[],
  settings: CompressionSettings,
  summaryGenerator?: (msgs: UIMessage[]) => Promise<string>
): Promise<CompressionResult> {
  const tokensBefore = messages.reduce((sum, m) => sum + countTokens(m.content), 0);

  try {
    let filteredMessages: UIMessage[];
    let compressedIds: string[];
    let summaryText: string | undefined;

    switch (settings.strategy) {
      case 'sliding-window': {
        const result = applySlidingWindow(messages, settings);
        filteredMessages = result.filteredMessages;
        compressedIds = result.compressedIds;
        break;
      }

      case 'selective': {
        const result = applySelectiveCompression(messages, settings);
        filteredMessages = result.filteredMessages;
        compressedIds = result.compressedIds;
        break;
      }

      case 'summary': {
        // For summary strategy, summarize older messages
        const { preserveRecentMessages, preserveSystemMessages } = settings;
        const systemMessages = preserveSystemMessages
          ? messages.filter(m => m.role === 'system')
          : [];
        const nonSystemMessages = messages.filter(m => m.role !== 'system');

        if (nonSystemMessages.length <= preserveRecentMessages) {
          return {
            success: true,
            messagesCompressed: 0,
            tokensBefore,
            tokensAfter: tokensBefore,
            compressionRatio: 1,
            compressedMessageIds: [],
          };
        }

        const splitIndex = nonSystemMessages.length - preserveRecentMessages;
        const olderMessages = nonSystemMessages.slice(0, splitIndex);
        const recentMessages = nonSystemMessages.slice(splitIndex);

        // Generate summary
        if (summaryGenerator) {
          try {
            summaryText = await summaryGenerator(olderMessages);
          } catch (error) {
            console.warn('AI summarization failed, using simple summary:', error);
            summaryText = generateSimpleSummary(olderMessages);
          }
        } else {
          summaryText = generateSimpleSummary(olderMessages);
        }

        // Create summary message
        const summaryMessage = createSummaryMessage(olderMessages, summaryText);

        filteredMessages = [...systemMessages, summaryMessage, ...recentMessages];
        compressedIds = olderMessages.map(m => m.id);
        break;
      }

      case 'hybrid':
      default: {
        const result = applyHybridCompression(messages, settings);
        filteredMessages = result.filteredMessages;
        compressedIds = result.compressedIds;

        if (result.needsSummary && result.messagesToSummarize.length > 0) {
          // Generate summary for older messages
          if (summaryGenerator) {
            try {
              summaryText = await summaryGenerator(result.messagesToSummarize);
            } catch (error) {
              console.warn('AI summarization failed, using simple summary:', error);
              summaryText = generateSimpleSummary(result.messagesToSummarize);
            }
          } else {
            summaryText = generateSimpleSummary(result.messagesToSummarize);
          }

          // Insert summary message at the beginning (after system messages)
          const summaryMessage = createSummaryMessage(result.messagesToSummarize, summaryText);
          const systemMessages = filteredMessages.filter(m => m.role === 'system');
          const nonSystemFiltered = filteredMessages.filter(m => m.role !== 'system');
          filteredMessages = [...systemMessages, summaryMessage, ...nonSystemFiltered];
        }
        break;
      }
    }

    const tokensAfter = filteredMessages.reduce((sum, m) => sum + countTokens(m.content), 0);
    const compressionRatio = tokensBefore > 0 ? tokensAfter / tokensBefore : 1;

    return {
      success: true,
      summaryText,
      messagesCompressed: compressedIds.length,
      tokensBefore,
      tokensAfter,
      compressionRatio,
      compressedMessageIds: compressedIds,
    };
  } catch (error) {
    return {
      success: false,
      messagesCompressed: 0,
      tokensBefore,
      tokensAfter: tokensBefore,
      compressionRatio: 1,
      compressedMessageIds: [],
      error: error instanceof Error ? error.message : 'Unknown compression error',
    };
  }
}

/**
 * Filter messages for context based on settings (without AI summarization)
 * This is the main entry point for simple message filtering
 */
export function filterMessagesForContext(
  messages: UIMessage[],
  settings: CompressionSettings,
  maxTokens?: number,
  provider?: string,
  model?: string
): UIMessage[] {
  if (!settings.enabled) return messages;

  // Calculate context state if max tokens provided
  if (maxTokens) {
    const contextState = calculateContextState(messages, maxTokens, provider, model);
    if (!shouldTriggerCompression(settings, contextState)) {
      return messages;
    }
  }

  // Apply appropriate strategy
  switch (settings.strategy) {
    case 'sliding-window': {
      const result = applySlidingWindow(messages, settings);
      return result.filteredMessages;
    }

    case 'selective': {
      const result = applySelectiveCompression(messages, settings);
      return result.filteredMessages;
    }

    case 'summary':
    case 'hybrid':
    default: {
      // For summary and hybrid without AI, fall back to hybrid without summary
      const result = applyHybridCompression(messages, settings);
      if (result.needsSummary && result.messagesToSummarize.length > 0) {
        // Add simple summary
        const summaryMessage = createSummaryMessage(result.messagesToSummarize);
        const systemMessages = result.filteredMessages.filter(m => m.role === 'system');
        const nonSystemFiltered = result.filteredMessages.filter(m => m.role !== 'system');
        return [...systemMessages, summaryMessage, ...nonSystemFiltered];
      }
      return result.filteredMessages;
    }
  }
}

/**
 * Create compression history entry for undo support
 */
export function createCompressionHistoryEntry(
  sessionId: string,
  strategy: CompressionStrategy,
  compressedMessages: UIMessage[],
  summaryMessageId: string,
  tokensBefore: number,
  tokensAfter: number
): CompressionHistoryEntry {
  return {
    id: nanoid(),
    sessionId,
    timestamp: new Date(),
    strategy,
    compressedMessages: compressedMessages.map(m => ({
      id: m.id,
      role: m.role,
      content: m.content,
      createdAt: m.createdAt || new Date(),
    })),
    summaryMessageId,
    tokensBefore,
    tokensAfter,
  };
}

/**
 * Get effective compression settings for a session
 */
export function getEffectiveCompressionSettings(
  globalSettings: CompressionSettings,
  sessionOverrides?: SessionCompressionOverrides
): CompressionSettings {
  return mergeCompressionSettings(globalSettings, sessionOverrides);
}

export { DEFAULT_COMPRESSION_SETTINGS };
