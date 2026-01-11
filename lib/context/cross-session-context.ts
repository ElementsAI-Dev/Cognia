/**
 * Cross-Session Context Service
 *
 * Provides functionality to build compressed context from recent chat sessions
 * for injection into new conversations. This helps maintain continuity across
 * multiple chat sessions.
 */

import { db, type DBSummary } from '@/lib/db/schema';
import { messageRepository } from '@/lib/db/repositories/message-repository';
import type { UIMessage } from '@/types/core/message';
import type { Session } from '@/types/core/session';
import type {
  ChatHistoryContextSettings,
  SessionContextSummary,
  HistoryContextResult,
  BuildHistoryContextOptions,
  HistoryContextCompressionLevel,
} from '@/types/core/chat-history-context';
import { DEFAULT_CHAT_HISTORY_CONTEXT_SETTINGS } from '@/types/core/chat-history-context';
import { estimateTokens } from './context-fs';
import { extractTopicsSimple } from '@/lib/ai/generation/summarizer';

/**
 * Try to get an existing summary from the summary store for a session
 * This avoids regenerating summaries if one already exists
 */
async function getExistingSummary(sessionId: string): Promise<DBSummary | null> {
  try {
    const summaries = await db.summaries
      .where('sessionId')
      .equals(sessionId)
      .toArray();
    
    if (summaries.length > 0) {
      // Return the most recent summary
      return summaries.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )[0];
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Token limits per compression level
 */
const COMPRESSION_TOKEN_LIMITS: Record<HistoryContextCompressionLevel, number> = {
  minimal: 50,
  moderate: 150,
  detailed: 300,
};

/**
 * Get recent sessions sorted by updatedAt
 */
export async function getRecentSessions(
  count: number,
  options?: {
    excludeSessionId?: string;
    projectId?: string;
    sameProjectOnly?: boolean;
    excludeEmpty?: boolean;
    minMessages?: number;
  }
): Promise<Session[]> {
  try {
    let sessions = await db.sessions
      .orderBy('updatedAt')
      .reverse()
      .limit(count + 10) // Get extra to filter
      .toArray();

    // Filter out excluded session
    if (options?.excludeSessionId) {
      sessions = sessions.filter((s) => s.id !== options.excludeSessionId);
    }

    // Filter by project if required
    // Note: projectId is stored in session but not in DBSession interface
    if (options?.sameProjectOnly && options?.projectId) {
      sessions = sessions.filter((s) => (s as unknown as { projectId?: string }).projectId === options.projectId);
    }

    // Filter out empty sessions
    if (options?.excludeEmpty) {
      sessions = sessions.filter((s) => (s.messageCount || 0) > 0);
    }

    // Filter by minimum messages
    const minMsgs = options?.minMessages ?? 0;
    if (minMsgs > 0) {
      sessions = sessions.filter(
        (s) => (s.messageCount || 0) >= minMsgs
      );
    }

    // Convert DB dates to Date objects and limit to requested count
    return sessions.slice(0, count).map((s) => ({
      ...s,
      createdAt: new Date(s.createdAt),
      updatedAt: new Date(s.updatedAt),
    })) as Session[];
  } catch (error) {
    console.error('Failed to get recent sessions:', error);
    return [];
  }
}

/**
 * Extract key topics from messages using the shared summarizer utility
 * Reuses extractTopicsSimple from summarizer.ts to avoid code duplication
 */
function extractTopics(messages: UIMessage[]): string[] {
  // Use the shared topic extraction utility
  const conversationTopics = extractTopicsSimple(messages);
  
  // Convert ConversationTopic[] to string[] (topic names)
  return conversationTopics.map((t) => t.name).slice(0, 5);
}

/**
 * Generate a compressed summary of messages based on compression level
 */
function generateSessionSummary(
  messages: UIMessage[],
  compressionLevel: HistoryContextCompressionLevel,
  maxTokens: number
): string {
  if (messages.length === 0) return '';

  const userMessages = messages.filter((m) => m.role === 'user');
  const assistantMessages = messages.filter((m) => m.role === 'assistant');

  const parts: string[] = [];

  switch (compressionLevel) {
    case 'minimal': {
      // Just first user message topic
      if (userMessages.length > 0) {
        const firstContent = userMessages[0].content;
        if (typeof firstContent === 'string') {
          const firstLine = firstContent.split('\n')[0].slice(0, 100);
          parts.push(`Topic: ${firstLine}${firstContent.length > 100 ? '...' : ''}`);
        }
      }
      break;
    }

    case 'moderate': {
      // First user message + brief exchange summary
      if (userMessages.length > 0) {
        const firstContent = userMessages[0].content;
        if (typeof firstContent === 'string') {
          const firstPart = firstContent.slice(0, 150);
          parts.push(`Initial: ${firstPart}${firstContent.length > 150 ? '...' : ''}`);
        }
      }
      // Add exchange count
      parts.push(`${userMessages.length} user messages, ${assistantMessages.length} responses`);
      break;
    }

    case 'detailed': {
      // More comprehensive summary
      // First message
      if (userMessages.length > 0) {
        const firstContent = userMessages[0].content;
        if (typeof firstContent === 'string') {
          parts.push(`Started with: ${firstContent.slice(0, 200)}${firstContent.length > 200 ? '...' : ''}`);
        }
      }

      // Key exchanges (sample middle messages)
      const midPoint = Math.floor(userMessages.length / 2);
      if (midPoint > 0 && userMessages[midPoint]) {
        const midContent = userMessages[midPoint].content;
        if (typeof midContent === 'string') {
          parts.push(`Later discussed: ${midContent.slice(0, 100)}${midContent.length > 100 ? '...' : ''}`);
        }
      }

      // Last message if different from first
      if (userMessages.length > 1) {
        const lastContent = userMessages[userMessages.length - 1].content;
        if (typeof lastContent === 'string') {
          parts.push(`Ended with: ${lastContent.slice(0, 100)}${lastContent.length > 100 ? '...' : ''}`);
        }
      }

      parts.push(`Total: ${messages.length} messages`);
      break;
    }
  }

  // Join and truncate to token budget
  let summary = parts.join('. ');
  const charLimit = maxTokens * 4; // Rough char to token ratio

  if (summary.length > charLimit) {
    summary = summary.slice(0, charLimit - 3) + '...';
  }

  return summary;
}

/**
 * Build a context summary for a single session
 * First checks for an existing summary in the summary store to avoid regeneration
 */
export async function buildSessionContextSummary(
  session: Session,
  compressionLevel: HistoryContextCompressionLevel,
  maxTokens: number
): Promise<SessionContextSummary> {
  // Try to use an existing summary from the summary store
  const existingSummary = await getExistingSummary(session.id);
  
  if (existingSummary && existingSummary.summary) {
    // Use cached summary, truncate if needed
    let cachedSummary = existingSummary.summary;
    const charLimit = maxTokens * 4;
    if (cachedSummary.length > charLimit) {
      cachedSummary = cachedSummary.slice(0, charLimit - 3) + '...';
    }
    
    // Parse topics if available
    let topics: string[] = [];
    if (existingSummary.topics) {
      try {
        topics = JSON.parse(existingSummary.topics);
      } catch {
        topics = [];
      }
    }
    
    return {
      sessionId: session.id,
      title: session.title || 'Untitled',
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      messageCount: existingSummary.messageCount || session.messageCount || 0,
      summary: cachedSummary,
      topics,
      mode: session.mode,
      projectId: session.projectId,
    };
  }

  // No cached summary, generate one from messages
  const messages = await messageRepository.getBySessionId(session.id);

  // Generate summary
  const summary = generateSessionSummary(messages, compressionLevel, maxTokens);

  // Extract topics using shared utility
  const topics = extractTopics(messages);

  return {
    sessionId: session.id,
    title: session.title || 'Untitled',
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    messageCount: messages.length,
    summary,
    topics,
    mode: session.mode,
    projectId: session.projectId,
  };
}

/**
 * Format session summaries into a context prompt string
 */
function formatContextPrompt(
  summaries: SessionContextSummary[],
  settings: ChatHistoryContextSettings
): string {
  if (summaries.length === 0) return '';

  const lines: string[] = [
    '## Recent Conversation Context',
    '',
    'The following is a summary of recent conversations to provide continuity:',
    '',
  ];

  for (let i = 0; i < summaries.length; i++) {
    const s = summaries[i];
    const sessionNum = i + 1;

    if (settings.includeSessionTitles) {
      lines.push(`### ${sessionNum}. ${s.title}`);
    } else {
      lines.push(`### Conversation ${sessionNum}`);
    }

    if (settings.includeTimestamps) {
      lines.push(`*${s.updatedAt.toLocaleDateString()}*`);
    }

    if (s.topics.length > 0) {
      lines.push(`Topics: ${s.topics.join(', ')}`);
    }

    lines.push(s.summary);
    lines.push('');
  }

  lines.push('---');
  lines.push('');

  return lines.join('\n');
}

/**
 * Build compressed history context from recent sessions
 */
export async function buildHistoryContext(
  settings: ChatHistoryContextSettings = DEFAULT_CHAT_HISTORY_CONTEXT_SETTINGS,
  options?: BuildHistoryContextOptions
): Promise<HistoryContextResult> {
  if (!settings.enabled) {
    return {
      success: true,
      contextText: '',
      sessionCount: 0,
      tokenCount: 0,
      summaries: [],
    };
  }

  try {
    const effectiveSettings = {
      ...settings,
      ...options?.settingsOverride,
    };

    // Get recent sessions
    const sessions = await getRecentSessions(effectiveSettings.recentSessionCount, {
      excludeSessionId: options?.excludeSessionId,
      projectId: options?.projectId,
      sameProjectOnly: effectiveSettings.sameProjectOnly,
      excludeEmpty: effectiveSettings.excludeEmptySessions,
      minMessages: effectiveSettings.minMessagesThreshold,
    });

    if (sessions.length === 0) {
      return {
        success: true,
        contextText: '',
        sessionCount: 0,
        tokenCount: 0,
        summaries: [],
      };
    }

    // Calculate token budget per session
    const tokensPerSession = Math.floor(
      effectiveSettings.maxTokenBudget / sessions.length
    );
    const compressionTokenLimit = Math.min(
      tokensPerSession,
      COMPRESSION_TOKEN_LIMITS[effectiveSettings.compressionLevel]
    );

    // Build summaries for each session
    const summaries: SessionContextSummary[] = [];
    for (const session of sessions) {
      const summary = await buildSessionContextSummary(
        session,
        effectiveSettings.compressionLevel,
        compressionTokenLimit
      );
      summaries.push(summary);
    }

    // Format into context prompt
    const contextText = formatContextPrompt(summaries, effectiveSettings);
    const tokenCount = estimateTokens(contextText);

    // Trim if over budget
    let finalContextText = contextText;
    if (tokenCount > effectiveSettings.maxTokenBudget) {
      // Simple truncation - could be smarter
      const charLimit = effectiveSettings.maxTokenBudget * 4;
      finalContextText = contextText.slice(0, charLimit) + '\n\n[Context truncated]';
    }

    return {
      success: true,
      contextText: finalContextText,
      sessionCount: summaries.length,
      tokenCount: estimateTokens(finalContextText),
      summaries,
    };
  } catch (error) {
    console.error('Failed to build history context:', error);
    return {
      success: false,
      contextText: '',
      sessionCount: 0,
      tokenCount: 0,
      summaries: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Quick check if history context should be built
 * (Avoids full build if not needed)
 */
export async function shouldBuildHistoryContext(
  settings: ChatHistoryContextSettings,
  excludeSessionId?: string
): Promise<boolean> {
  if (!settings.enabled) return false;

  try {
    const sessions = await getRecentSessions(1, {
      excludeSessionId,
      excludeEmpty: settings.excludeEmptySessions,
      minMessages: settings.minMessagesThreshold,
    });

    return sessions.length > 0;
  } catch {
    return false;
  }
}
