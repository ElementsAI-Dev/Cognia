/**
 * AI Conversation - Conversation state management and streaming
 * Extends the existing continueDesignConversation from ai.ts with:
 * - Conversation state management
 * - Streaming support
 * - Message history tracking
 * 
 * Note: Basic conversation logic is in ai.ts (continueDesignConversation)
 * This module adds stateful conversation management and streaming.
 */

import { streamText } from 'ai';
import { nanoid } from 'nanoid';
import { getProviderModel } from '@/lib/ai/core/client';
import {
  cleanAICodeResponse,
  continueDesignConversation as continueDesignConversationBase,
  type DesignerAIConfig,
} from './ai';

export interface AIConversationMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  codeDiff?: CodeDiff;
  codeSnapshot?: string;
  tokenCount?: number;
}

export interface CodeDiff {
  type: 'insert' | 'delete' | 'replace' | 'none';
  summary: string;
  linesChanged: number;
}

export interface AIConversation {
  id: string;
  designerId: string;
  messages: AIConversationMessage[];
  currentCode: string;
  createdAt: Date;
  updatedAt: Date;
  metadata: {
    model: string;
    provider: string;
    totalTokens: number;
  };
}

export interface ConversationStreamUpdate {
  type: 'text' | 'code' | 'complete' | 'error';
  content: string;
  codeDiff?: CodeDiff;
}

const CONVERSATION_SYSTEM_PROMPT = `You are an expert React developer and UI/UX designer working collaboratively with a developer.

Your role is to:
1. Understand the current component code and conversation context
2. Make focused, incremental improvements based on user requests
3. Explain your changes clearly and concisely
4. Return the COMPLETE modified code when changes are needed

Rules:
- Always preserve the component structure (export default function App())
- Use Tailwind CSS for all styling
- Ensure valid JSX that can be rendered
- Only use useState, useEffect from 'react' - no external dependencies
- Be conversational and helpful, explaining your reasoning
- If the user's request is unclear, ask for clarification

When providing code changes:
1. Wrap the complete modified component in a code block
2. Briefly explain what you changed and why
3. Suggest follow-up improvements if relevant`;

/**
 * Create a new conversation
 */
export function createConversation(
  designerId: string,
  initialCode: string,
  config: DesignerAIConfig
): AIConversation {
  return {
    id: nanoid(),
    designerId,
    messages: [],
    currentCode: initialCode,
    createdAt: new Date(),
    updatedAt: new Date(),
    metadata: {
      model: config.model,
      provider: config.provider,
      totalTokens: 0,
    },
  };
}

/**
 * Add a user message to the conversation
 */
export function addUserMessage(
  conversation: AIConversation,
  content: string
): AIConversation {
  const message: AIConversationMessage = {
    id: nanoid(),
    role: 'user',
    content,
    timestamp: new Date(),
  };

  return {
    ...conversation,
    messages: [...conversation.messages, message],
    updatedAt: new Date(),
  };
}

/**
 * Build the prompt context from conversation history
 */
function buildConversationContext(
  conversation: AIConversation,
  maxMessages: number = 10
): string {
  const recentMessages = conversation.messages.slice(-maxMessages);
  
  const context = recentMessages
    .map((msg) => {
      const role = msg.role === 'user' ? 'User' : 'Assistant';
      return `${role}: ${msg.content}`;
    })
    .join('\n\n');

  return context;
}

/**
 * Calculate a simple code diff summary
 */
function calculateCodeDiff(oldCode: string, newCode: string): CodeDiff {
  if (oldCode === newCode) {
    return { type: 'none', summary: 'No changes', linesChanged: 0 };
  }

  const oldLines = oldCode.split('\n');
  const newLines = newCode.split('\n');
  const lineDiff = Math.abs(newLines.length - oldLines.length);

  if (newLines.length > oldLines.length) {
    return {
      type: 'insert',
      summary: `Added ${lineDiff} line(s)`,
      linesChanged: lineDiff,
    };
  } else if (newLines.length < oldLines.length) {
    return {
      type: 'delete',
      summary: `Removed ${lineDiff} line(s)`,
      linesChanged: lineDiff,
    };
  }

  // Count changed lines
  let changedLines = 0;
  for (let i = 0; i < oldLines.length; i++) {
    if (oldLines[i] !== newLines[i]) {
      changedLines++;
    }
  }

  return {
    type: 'replace',
    summary: `Modified ${changedLines} line(s)`,
    linesChanged: changedLines,
  };
}

/**
 * Extract code from AI response
 */
function extractCodeFromResponse(text: string): string | null {
  const codeMatch = text.match(/```(?:jsx?|tsx?)?\n([\s\S]*?)\n```/);
  if (codeMatch) {
    return cleanAICodeResponse(codeMatch[1]);
  }
  return null;
}

/**
 * Continue the conversation with a new message (non-streaming)
 * Delegates to ai.ts continueDesignConversation and wraps with state management
 */
export async function continueConversation(
  conversation: AIConversation,
  userMessage: string,
  config: DesignerAIConfig
): Promise<{
  success: boolean;
  conversation?: AIConversation;
  response?: string;
  code?: string;
  codeDiff?: CodeDiff;
  error?: string;
}> {
  // Convert to base format (filter out system messages as they're not supported)
  const baseHistory = conversation.messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({
      id: m.id,
      role: m.role as 'user' | 'assistant',
      content: m.content,
      timestamp: m.timestamp,
      codeSnapshot: m.codeSnapshot,
    }));

  // Use existing ai.ts function
  const result = await continueDesignConversationBase(
    conversation.currentCode,
    baseHistory,
    userMessage,
    config
  );

  if (!result.success) {
    return { success: false, error: result.error };
  }

  // Add user message
  let updatedConversation = addUserMessage(conversation, userMessage);

  // Calculate diff if code was changed
  let codeDiff: CodeDiff | undefined;
  let newCode = updatedConversation.currentCode;

  if (result.code) {
    codeDiff = calculateCodeDiff(updatedConversation.currentCode, result.code);
    newCode = result.code;
  }

  // Add assistant message
  const assistantMessage: AIConversationMessage = {
    id: nanoid(),
    role: 'assistant',
    content: result.response || '',
    timestamp: new Date(),
    codeDiff,
    codeSnapshot: result.code,
  };

  updatedConversation = {
    ...updatedConversation,
    messages: [...updatedConversation.messages, assistantMessage],
    currentCode: newCode,
    updatedAt: new Date(),
  };

  return {
    success: true,
    conversation: updatedConversation,
    response: result.response,
    code: result.code,
    codeDiff,
  };
}

/**
 * Stream conversation response
 */
export async function* streamConversation(
  conversation: AIConversation,
  userMessage: string,
  config: DesignerAIConfig
): AsyncGenerator<ConversationStreamUpdate> {
  if (!config.apiKey && config.provider !== 'ollama') {
    yield {
      type: 'error',
      content: `No API key configured for ${config.provider}`,
    };
    return;
  }

  try {
    const model = getProviderModel(
      config.provider,
      config.model,
      config.apiKey || '',
      config.baseURL
    );

    // Build context
    const historyContext = buildConversationContext(
      addUserMessage(conversation, userMessage)
    );

    const prompt = `Current component code:
\`\`\`tsx
${conversation.currentCode}
\`\`\`

Conversation history:
${historyContext}

User: ${userMessage}

Respond helpfully. If code changes are needed, provide the complete updated component wrapped in a code block.`;

    const stream = streamText({
      model,
      system: CONVERSATION_SYSTEM_PROMPT,
      prompt,
      temperature: 0.7,
    });

    let fullText = '';

    for await (const chunk of (await stream).textStream) {
      fullText += chunk;
      yield { type: 'text', content: chunk };
    }

    // Extract code after stream completes
    const extractedCode = extractCodeFromResponse(fullText);
    
    if (extractedCode) {
      const codeDiff = calculateCodeDiff(conversation.currentCode, extractedCode);
      yield {
        type: 'code',
        content: extractedCode,
        codeDiff,
      };
    }

    yield { type: 'complete', content: fullText };
  } catch (error) {
    yield {
      type: 'error',
      content: error instanceof Error ? error.message : 'Stream failed',
    };
  }
}

/**
 * Get conversation summary
 */
export function getConversationSummary(conversation: AIConversation): {
  messageCount: number;
  userMessages: number;
  assistantMessages: number;
  codeChanges: number;
  totalTokens: number;
  duration: number;
} {
  const userMessages = conversation.messages.filter((m) => m.role === 'user').length;
  const assistantMessages = conversation.messages.filter((m) => m.role === 'assistant').length;
  const codeChanges = conversation.messages.filter(
    (m) => m.codeDiff && m.codeDiff.type !== 'none'
  ).length;

  const duration = conversation.updatedAt.getTime() - conversation.createdAt.getTime();

  return {
    messageCount: conversation.messages.length,
    userMessages,
    assistantMessages,
    codeChanges,
    totalTokens: conversation.metadata.totalTokens,
    duration,
  };
}

/**
 * Clear conversation history while keeping current code
 */
export function clearConversationHistory(
  conversation: AIConversation
): AIConversation {
  return {
    ...conversation,
    messages: [],
    updatedAt: new Date(),
    metadata: {
      ...conversation.metadata,
      totalTokens: 0,
    },
  };
}

const aiConversationAPI = {
  createConversation,
  addUserMessage,
  continueConversation,
  streamConversation,
  getConversationSummary,
  clearConversationHistory,
};

export default aiConversationAPI;
