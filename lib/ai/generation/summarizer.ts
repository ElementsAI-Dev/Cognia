/**
 * AI Summarizer - Generate summaries for chat conversations and agent executions
 * 
 * Provides functions to:
 * - Summarize chat messages using AI or fallback extraction
 * - Summarize agent execution processes
 * - Extract key points and topics from conversations
 * - AI-powered key point extraction and topic identification
 * - Multi-language support with auto-detection
 * - Incremental summarization for long conversations
 */

import { generateText } from 'ai';
import { nanoid } from 'nanoid';
import type { UIMessage, ToolInvocationPart } from '@/types/core/message';
import type {
  ChatSummaryOptions,
  ChatSummaryResult,
  AgentSummaryResult,
  KeyPoint,
  ConversationTopic,
  AgentStepSummary,
  GenerateChatSummaryInput,
  GenerateAgentSummaryInput,
  IncrementalSummaryInput,
  ConversationAnalysis,
  KeyPointCategory,
} from '@/types/learning/summary';
import {
  DEFAULT_CHAT_SUMMARY_OPTIONS,
  DEFAULT_AGENT_SUMMARY_OPTIONS,
} from '@/types/learning/summary';
import { getProviderModel, type ProviderName } from '../core/client';
import { countTokens } from '@/hooks/chat/use-token-count';
import {
  buildSummaryPrompt as buildEnhancedSummaryPrompt,
  buildKeyPointExtractionPrompt,
  buildTopicIdentificationPrompt,
  buildIncrementalSummaryPrompt,
  buildConversationAnalysisPrompt,
  detectConversationLanguage,
  SUMMARY_TEMPLATES,
} from '../prompts/summary-prompts';

/**
 * Filter messages based on summary options
 */
export function filterMessagesByOptions(
  messages: UIMessage[],
  options: ChatSummaryOptions
): UIMessage[] {
  const { scope, range, selectedIds } = options;

  switch (scope) {
    case 'all':
      return messages;

    case 'selected':
      if (!selectedIds || selectedIds.length === 0) return messages;
      return messages.filter(m => selectedIds.includes(m.id));

    case 'range': {
      if (!range) return messages;
      
      let startIndex = 0;
      let endIndex = messages.length;

      if (range.startIndex !== undefined) {
        startIndex = range.startIndex;
      } else if (range.startMessageId) {
        const idx = messages.findIndex(m => m.id === range.startMessageId);
        if (idx !== -1) startIndex = idx;
      }

      if (range.endIndex !== undefined) {
        endIndex = range.endIndex + 1;
      } else if (range.endMessageId) {
        const idx = messages.findIndex(m => m.id === range.endMessageId);
        if (idx !== -1) endIndex = idx + 1;
      }

      return messages.slice(startIndex, endIndex);
    }

    default:
      return messages;
  }
}

/**
 * Extract key points from messages (without AI)
 */
export function extractKeyPointsSimple(messages: UIMessage[]): KeyPoint[] {
  const keyPoints: KeyPoint[] = [];

  for (const msg of messages) {
    const content = msg.content.trim();
    if (content.length < 30) continue;

    // Extract questions as key points
    if (msg.role === 'user' && content.includes('?')) {
      const questions = content.match(/[^.!?]*\?/g) || [];
      questions.slice(0, 2).forEach(q => {
        keyPoints.push({
          id: nanoid(),
          content: q.trim(),
          sourceMessageId: msg.id,
          category: 'question',
          importance: 0.8,
        });
      });
    }

    // Extract code blocks as key points
    const codeBlocks = content.match(/```[\s\S]*?```/g) || [];
    if (codeBlocks.length > 0 && msg.role === 'assistant') {
      keyPoints.push({
        id: nanoid(),
        content: `Code example provided (${codeBlocks.length} block${codeBlocks.length > 1 ? 's' : ''})`,
        sourceMessageId: msg.id,
        category: 'code',
        importance: 0.7,
      });
    }

    // Extract tool calls as key points
    if (msg.parts) {
      const toolParts = msg.parts.filter(p => p.type === 'tool-invocation') as ToolInvocationPart[];
      toolParts.forEach(tool => {
        keyPoints.push({
          id: nanoid(),
          content: `Tool used: ${tool.toolName}`,
          sourceMessageId: msg.id,
          category: 'tool',
          importance: 0.6,
        });
      });
    }

    // Extract first meaningful sentence as key point for long messages
    if (content.length > 200 && msg.role === 'assistant') {
      const firstSentence = content.split(/[.!?]\s/)[0];
      if (firstSentence.length > 30 && firstSentence.length < 200) {
        keyPoints.push({
          id: nanoid(),
          content: firstSentence + '.',
          sourceMessageId: msg.id,
          category: 'summary',
          importance: 0.5,
        });
      }
    }
  }

  return keyPoints.slice(0, 20); // Limit to top 20 key points
}

/**
 * Extract topics from messages (without AI)
 */
export function extractTopicsSimple(messages: UIMessage[]): ConversationTopic[] {
  const topicMap = new Map<string, { messageIds: string[]; count: number }>();

  // Common topic keywords to detect
  const topicKeywords: Record<string, string[]> = {
    'code': ['code', 'function', 'class', 'method', 'variable', 'implement', 'bug', 'error'],
    'design': ['design', 'architecture', 'pattern', 'structure', 'layout', 'ui', 'ux'],
    'data': ['data', 'database', 'query', 'table', 'record', 'api', 'json'],
    'question': ['how', 'what', 'why', 'when', 'where', 'can you', 'could you'],
    'explanation': ['explain', 'understand', 'meaning', 'difference', 'between'],
    'troubleshooting': ['error', 'issue', 'problem', 'fix', 'solve', 'debug', 'not working'],
  };

  for (const msg of messages) {
    const contentLower = msg.content.toLowerCase();

    for (const [topic, keywords] of Object.entries(topicKeywords)) {
      const hasKeyword = keywords.some(kw => contentLower.includes(kw));
      if (hasKeyword) {
        const existing = topicMap.get(topic) || { messageIds: [], count: 0 };
        existing.messageIds.push(msg.id);
        existing.count++;
        topicMap.set(topic, existing);
      }
    }
  }

  // Convert to array and sort by relevance
  const topics: ConversationTopic[] = [];
  for (const [name, data] of topicMap.entries()) {
    if (data.count >= 2) { // Only include topics that appear multiple times
      topics.push({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        messageIds: data.messageIds,
        description: `Discussed in ${data.count} messages`,
        keywords: topicKeywords[name],
      });
    }
  }

  return topics.sort((a, b) => b.messageIds.length - a.messageIds.length).slice(0, 5);
}

/**
 * Generate a simple summary without AI
 */
export function generateSimpleChatSummary(
  messages: UIMessage[],
  options: ChatSummaryOptions
): string {
  const { format, includeCode, includeToolCalls } = options;

  if (messages.length === 0) return 'No messages to summarize.';

  const userMessages = messages.filter(m => m.role === 'user');
  const assistantMessages = messages.filter(m => m.role === 'assistant');

  // Count code blocks and tool calls
  let codeBlockCount = 0;
  let toolCallCount = 0;

  for (const msg of messages) {
    const codeMatches = msg.content.match(/```[\s\S]*?```/g);
    if (codeMatches) codeBlockCount += codeMatches.length;

    if (msg.parts) {
      toolCallCount += msg.parts.filter(p => p.type === 'tool-invocation').length;
    }
  }

  // Build summary based on format
  const lines: string[] = [];

  switch (format) {
    case 'brief':
      lines.push(`This conversation contains ${messages.length} messages between user and assistant.`);
      if (userMessages.length > 0) {
        const firstQuestion = userMessages[0].content.slice(0, 100);
        lines.push(`The discussion started with: "${firstQuestion}${userMessages[0].content.length > 100 ? '...' : ''}"`);
      }
      break;

    case 'bullets':
      lines.push('## Conversation Summary\n');
      lines.push(`- **Total messages**: ${messages.length}`);
      lines.push(`- **User messages**: ${userMessages.length}`);
      lines.push(`- **Assistant responses**: ${assistantMessages.length}`);
      if (includeCode && codeBlockCount > 0) {
        lines.push(`- **Code blocks**: ${codeBlockCount}`);
      }
      if (includeToolCalls && toolCallCount > 0) {
        lines.push(`- **Tool calls**: ${toolCallCount}`);
      }
      break;

    case 'structured':
    case 'detailed':
    default:
      lines.push('## Conversation Overview\n');
      lines.push(`This conversation contains **${messages.length} messages** exchanged between user and assistant.\n`);
      
      if (userMessages.length > 0) {
        lines.push('### Main Topics\n');
        const firstUserContent = userMessages[0].content;
        const preview = firstUserContent.length > 200 
          ? firstUserContent.slice(0, 200) + '...' 
          : firstUserContent;
        lines.push(`The conversation began with: "${preview}"\n`);
      }

      if (includeCode && codeBlockCount > 0) {
        lines.push(`### Code Examples\n`);
        lines.push(`${codeBlockCount} code block${codeBlockCount > 1 ? 's were' : ' was'} shared during this conversation.\n`);
      }

      if (includeToolCalls && toolCallCount > 0) {
        lines.push(`### Tool Usage\n`);
        lines.push(`${toolCallCount} tool${toolCallCount > 1 ? 's were' : ' was'} called during the conversation.\n`);
      }

      // Add last message preview
      if (assistantMessages.length > 0) {
        const lastResponse = assistantMessages[assistantMessages.length - 1].content;
        const lastPreview = lastResponse.length > 200 
          ? lastResponse.slice(0, 200) + '...' 
          : lastResponse;
        lines.push('### Latest Response\n');
        lines.push(`"${lastPreview}"`);
      }
      break;
  }

  return lines.join('\n');
}

/**
 * Build prompt for AI summarization
 */
function buildSummaryPrompt(
  messages: UIMessage[],
  options: ChatSummaryOptions,
  sessionTitle?: string
): string {
  const { format, includeCode, includeToolCalls, maxLength, language } = options;

  let formatInstructions = '';
  switch (format) {
    case 'brief':
      formatInstructions = 'Provide a brief 1-2 paragraph summary.';
      break;
    case 'bullets':
      formatInstructions = 'Provide a bullet-point summary with key takeaways.';
      break;
    case 'structured':
      formatInstructions = 'Provide a structured summary with sections: Overview, Key Topics, Conclusions.';
      break;
    case 'detailed':
    default:
      formatInstructions = 'Provide a detailed summary covering all important points discussed.';
  }

  const conversationText = messages.map(m => {
    const role = m.role === 'user' ? 'User' : m.role === 'assistant' ? 'Assistant' : 'System';
    let content = m.content;

    // Handle code blocks
    if (!includeCode) {
      content = content.replace(/```[\s\S]*?```/g, '[code block]');
    }

    // Handle tool calls
    if (includeToolCalls && m.parts) {
      const tools = m.parts
        .filter(p => p.type === 'tool-invocation')
        .map(p => (p as ToolInvocationPart).toolName);
      if (tools.length > 0) {
        content += `\n[Tools used: ${tools.join(', ')}]`;
      }
    }

    return `${role}: ${content}`;
  }).join('\n\n');

  return `Summarize the following conversation${sessionTitle ? ` titled "${sessionTitle}"` : ''}.

${formatInstructions}
${maxLength ? `Keep the summary under ${maxLength} characters.` : ''}
${language ? `Write the summary in ${language}.` : ''}

Conversation:
${conversationText}

Summary:`;
}

/**
 * Generate chat summary using AI
 */
export async function generateChatSummaryWithAI(
  input: GenerateChatSummaryInput,
  config: {
    provider: ProviderName;
    model: string;
    apiKey: string;
    baseURL?: string;
  }
): Promise<ChatSummaryResult> {
  const { messages, sessionTitle, options, onProgress } = input;
  const mergedOptions = { ...DEFAULT_CHAT_SUMMARY_OPTIONS, ...options };

  onProgress?.({ stage: 'analyzing', progress: 10, message: 'Analyzing messages...' });

  // Filter messages based on options
  const filteredMessages = filterMessagesByOptions(messages, mergedOptions);
  
  if (filteredMessages.length === 0) {
    return {
      success: false,
      summary: '',
      keyPoints: [],
      topics: [],
      messageCount: 0,
      sourceTokens: 0,
      summaryTokens: 0,
      compressionRatio: 1,
      generatedAt: new Date(),
      error: 'No messages to summarize',
    };
  }

  const sourceTokens = filteredMessages.reduce((sum, m) => sum + countTokens(m.content), 0);

  onProgress?.({ stage: 'extracting', progress: 30, message: 'Extracting key points...' });

  // Extract key points and topics
  const keyPoints = extractKeyPointsSimple(filteredMessages);
  const topics = extractTopicsSimple(filteredMessages);

  onProgress?.({ stage: 'summarizing', progress: 50, message: 'Generating summary...' });

  try {
    const modelInstance = getProviderModel(config.provider, config.model, config.apiKey, config.baseURL);
    const prompt = buildSummaryPrompt(filteredMessages, mergedOptions, sessionTitle);

    const result = await generateText({
      model: modelInstance,
      prompt,
      temperature: 0.3,
      maxOutputTokens: mergedOptions.maxLength ? Math.ceil(mergedOptions.maxLength / 4) : 1000,
    });

    const summary = result.text.trim();
    const summaryTokens = countTokens(summary);

    onProgress?.({ stage: 'complete', progress: 100, message: 'Summary complete!' });

    return {
      success: true,
      summary,
      keyPoints,
      topics,
      messageCount: filteredMessages.length,
      sourceTokens,
      summaryTokens,
      compressionRatio: sourceTokens > 0 ? summaryTokens / sourceTokens : 1,
      generatedAt: new Date(),
    };
  } catch (error) {
    // Fallback to simple summary on error
    const summary = generateSimpleChatSummary(filteredMessages, mergedOptions);
    const summaryTokens = countTokens(summary);

    return {
      success: true,
      summary,
      keyPoints,
      topics,
      messageCount: filteredMessages.length,
      sourceTokens,
      summaryTokens,
      compressionRatio: sourceTokens > 0 ? summaryTokens / sourceTokens : 1,
      generatedAt: new Date(),
      error: `AI summarization failed, using fallback: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Generate chat summary (without AI)
 */
export function generateChatSummary(input: GenerateChatSummaryInput): ChatSummaryResult {
  const { messages, options, onProgress } = input;
  const mergedOptions = { ...DEFAULT_CHAT_SUMMARY_OPTIONS, ...options };

  onProgress?.({ stage: 'analyzing', progress: 20, message: 'Analyzing messages...' });

  const filteredMessages = filterMessagesByOptions(messages, mergedOptions);
  
  if (filteredMessages.length === 0) {
    return {
      success: false,
      summary: '',
      keyPoints: [],
      topics: [],
      messageCount: 0,
      sourceTokens: 0,
      summaryTokens: 0,
      compressionRatio: 1,
      generatedAt: new Date(),
      error: 'No messages to summarize',
    };
  }

  const sourceTokens = filteredMessages.reduce((sum, m) => sum + countTokens(m.content), 0);

  onProgress?.({ stage: 'extracting', progress: 50, message: 'Extracting key information...' });

  const keyPoints = extractKeyPointsSimple(filteredMessages);
  const topics = extractTopicsSimple(filteredMessages);

  onProgress?.({ stage: 'summarizing', progress: 80, message: 'Building summary...' });

  const summary = generateSimpleChatSummary(filteredMessages, mergedOptions);
  const summaryTokens = countTokens(summary);

  onProgress?.({ stage: 'complete', progress: 100, message: 'Summary complete!' });

  return {
    success: true,
    summary,
    keyPoints,
    topics,
    messageCount: filteredMessages.length,
    sourceTokens,
    summaryTokens,
    compressionRatio: sourceTokens > 0 ? summaryTokens / sourceTokens : 1,
    generatedAt: new Date(),
  };
}

/**
 * Generate agent summary
 */
export function generateAgentSummary(input: GenerateAgentSummaryInput): AgentSummaryResult {
  const { agent, options, onProgress } = input;
  const mergedOptions = { ...DEFAULT_AGENT_SUMMARY_OPTIONS, ...options };

  onProgress?.({ stage: 'analyzing', progress: 20, message: 'Analyzing agent execution...' });

  // Extract step summaries
  const steps: AgentStepSummary[] = agent.steps.map(step => ({
    stepNumber: step.stepNumber,
    type: step.type,
    description: step.title,
    duration: step.duration,
    status: step.status,
    toolsUsed: step.toolCalls?.map(tc => tc.name),
    subAgentNames: step.subAgentId ? [step.subAgentId] : undefined,
  }));

  onProgress?.({ stage: 'extracting', progress: 50, message: 'Processing sub-agents...' });

  // Extract sub-agent summaries
  const subAgentSummaries = mergedOptions.includeSubAgents && agent.subAgents.length > 0
    ? agent.subAgents.map(sa => ({
        name: sa.name,
        task: sa.task,
        status: sa.status,
        result: sa.result?.finalResponse?.slice(0, 200),
      }))
    : undefined;

  // Calculate success rate
  const completedSubAgents = agent.subAgents.filter(sa => sa.status === 'completed').length;
  const subAgentSuccessRate = agent.subAgents.length > 0
    ? (completedSubAgents / agent.subAgents.length) * 100
    : undefined;

  // Collect all tools used
  const toolsUsed = new Set<string>();
  agent.steps.forEach(step => {
    step.toolCalls?.forEach(tc => toolsUsed.add(tc.name));
  });

  onProgress?.({ stage: 'summarizing', progress: 80, message: 'Building summary...' });

  // Calculate total duration
  const totalDuration = agent.completedAt && agent.startedAt
    ? agent.completedAt.getTime() - agent.startedAt.getTime()
    : agent.steps.reduce((sum, s) => sum + (s.duration || 0), 0);

  // Build summary text
  const summaryParts: string[] = [];
  
  summaryParts.push(`## Agent Execution Summary: ${agent.name}\n`);
  summaryParts.push(`**Task**: ${agent.task}\n`);
  summaryParts.push(`**Status**: ${agent.status}\n`);
  summaryParts.push(`**Duration**: ${formatDuration(totalDuration)}\n`);

  if (agent.subAgents.length > 0) {
    summaryParts.push(`\n### Sub-Agents (${completedSubAgents}/${agent.subAgents.length} completed)\n`);
    agent.subAgents.forEach(sa => {
      summaryParts.push(`- **${sa.name}**: ${sa.status} - ${sa.task.slice(0, 100)}${sa.task.length > 100 ? '...' : ''}`);
    });
  }

  if (mergedOptions.includeToolCalls && toolsUsed.size > 0) {
    summaryParts.push(`\n### Tools Used\n`);
    summaryParts.push(Array.from(toolsUsed).map(t => `- ${t}`).join('\n'));
  }

  if (mergedOptions.includeTiming && steps.length > 0) {
    summaryParts.push(`\n### Execution Steps (${steps.length} total)\n`);
    steps.slice(0, 10).forEach(step => {
      const duration = step.duration ? ` (${formatDuration(step.duration)})` : '';
      summaryParts.push(`${step.stepNumber}. [${step.status}] ${step.description}${duration}`);
    });
    if (steps.length > 10) {
      summaryParts.push(`... and ${steps.length - 10} more steps`);
    }
  }

  // Outcome
  const outcome = agent.result?.success
    ? agent.result.finalResponse?.slice(0, 500) || 'Completed successfully'
    : agent.error || 'Execution failed or incomplete';

  summaryParts.push(`\n### Outcome\n${outcome}`);

  onProgress?.({ stage: 'complete', progress: 100, message: 'Summary complete!' });

  return {
    success: true,
    agentName: agent.name,
    task: agent.task,
    summary: summaryParts.join('\n'),
    outcome,
    steps,
    subAgentSummaries,
    totalDuration,
    totalSteps: steps.length,
    subAgentSuccessRate,
    toolsUsed: Array.from(toolsUsed),
    generatedAt: new Date(),
  };
}

/**
 * Format duration in human readable format
 */
function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}

/**
 * Enhanced AI summary generation with style and template support
 */
export async function generateEnhancedChatSummary(
  input: GenerateChatSummaryInput,
  config: {
    provider: ProviderName;
    model: string;
    apiKey: string;
    baseURL?: string;
  }
): Promise<ChatSummaryResult> {
  const { messages, sessionTitle, options, onProgress } = input;
  const mergedOptions = { ...DEFAULT_CHAT_SUMMARY_OPTIONS, ...options };

  onProgress?.({ stage: 'analyzing', progress: 10, message: 'Analyzing messages...' });

  // Filter messages based on options
  const filteredMessages = filterMessagesByOptions(messages, mergedOptions);
  
  if (filteredMessages.length === 0) {
    return {
      success: false,
      summary: '',
      keyPoints: [],
      topics: [],
      messageCount: 0,
      sourceTokens: 0,
      summaryTokens: 0,
      compressionRatio: 1,
      generatedAt: new Date(),
      error: 'No messages to summarize',
    };
  }

  const sourceTokens = filteredMessages.reduce((sum, m) => sum + countTokens(m.content), 0);

  // Auto-detect language if enabled
  let language = mergedOptions.language;
  if (mergedOptions.autoDetectLanguage && !language) {
    language = detectConversationLanguage(filteredMessages);
  }

  onProgress?.({ stage: 'extracting', progress: 30, message: 'Extracting key points...' });

  // Extract key points (AI or simple based on options)
  let keyPoints: KeyPoint[];
  if (mergedOptions.aiKeyPoints) {
    keyPoints = await extractKeyPointsWithAI(filteredMessages, config, language);
  } else {
    keyPoints = extractKeyPointsSimple(filteredMessages);
  }

  // Extract topics (AI or simple based on options)
  let topics: ConversationTopic[];
  if (mergedOptions.aiTopics) {
    topics = await extractTopicsWithAI(filteredMessages, config, language);
  } else {
    topics = extractTopicsSimple(filteredMessages);
  }

  onProgress?.({ stage: 'summarizing', progress: 50, message: 'Generating summary...' });

  try {
    const modelInstance = getProviderModel(config.provider, config.model, config.apiKey, config.baseURL);
    
    // Use enhanced prompt builder with style and template support
    const prompt = buildEnhancedSummaryPrompt({
      messages: filteredMessages,
      format: mergedOptions.format,
      style: mergedOptions.style,
      language,
      maxLength: mergedOptions.maxLength,
      includeCode: mergedOptions.includeCode,
      includeToolCalls: mergedOptions.includeToolCalls,
      sessionTitle,
      customInstructions: mergedOptions.customInstructions,
    });

    const result = await generateText({
      model: modelInstance,
      prompt,
      temperature: 0.3,
      maxOutputTokens: mergedOptions.maxLength ? Math.ceil(mergedOptions.maxLength / 4) : 1500,
    });

    const summary = result.text.trim();
    const summaryTokens = countTokens(summary);

    onProgress?.({ stage: 'complete', progress: 100, message: 'Summary complete!' });

    return {
      success: true,
      summary,
      keyPoints,
      topics,
      messageCount: filteredMessages.length,
      sourceTokens,
      summaryTokens,
      compressionRatio: sourceTokens > 0 ? summaryTokens / sourceTokens : 1,
      generatedAt: new Date(),
    };
  } catch (error) {
    // Fallback to simple summary on error
    const summary = generateSimpleChatSummary(filteredMessages, mergedOptions);
    const summaryTokens = countTokens(summary);

    return {
      success: true,
      summary,
      keyPoints,
      topics,
      messageCount: filteredMessages.length,
      sourceTokens,
      summaryTokens,
      compressionRatio: sourceTokens > 0 ? summaryTokens / sourceTokens : 1,
      generatedAt: new Date(),
      error: `AI summarization failed, using fallback: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Extract key points using AI
 */
export async function extractKeyPointsWithAI(
  messages: UIMessage[],
  config: {
    provider: ProviderName;
    model: string;
    apiKey: string;
    baseURL?: string;
  },
  language?: string
): Promise<KeyPoint[]> {
  try {
    const modelInstance = getProviderModel(config.provider, config.model, config.apiKey, config.baseURL);
    
    const prompt = buildKeyPointExtractionPrompt({
      messages,
      maxPoints: 10,
      language,
    });

    const result = await generateText({
      model: modelInstance,
      prompt,
      temperature: 0.2,
      maxOutputTokens: 2000,
    });

    // Parse JSON response
    const jsonMatch = result.text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return extractKeyPointsSimple(messages);
    }

    const parsed = JSON.parse(jsonMatch[0]) as Array<{
      content: string;
      category: KeyPointCategory;
      importance: number;
      sourceRole?: string;
    }>;

    return parsed.map((kp, index) => ({
      id: nanoid(),
      content: kp.content,
      sourceMessageId: messages[Math.min(index, messages.length - 1)]?.id || '',
      category: kp.category,
      importance: kp.importance,
      sourceRole: kp.sourceRole as 'user' | 'assistant' | 'system' | undefined,
    }));
  } catch {
    // Fallback to simple extraction
    return extractKeyPointsSimple(messages);
  }
}

/**
 * Extract topics using AI
 */
export async function extractTopicsWithAI(
  messages: UIMessage[],
  config: {
    provider: ProviderName;
    model: string;
    apiKey: string;
    baseURL?: string;
  },
  language?: string
): Promise<ConversationTopic[]> {
  try {
    const modelInstance = getProviderModel(config.provider, config.model, config.apiKey, config.baseURL);
    
    const prompt = buildTopicIdentificationPrompt({
      messages,
      maxTopics: 5,
      language,
    });

    const result = await generateText({
      model: modelInstance,
      prompt,
      temperature: 0.2,
      maxOutputTokens: 1500,
    });

    // Parse JSON response
    const jsonMatch = result.text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return extractTopicsSimple(messages);
    }

    const parsed = JSON.parse(jsonMatch[0]) as Array<{
      name: string;
      description: string;
      keywords: string[];
      coverage: number;
    }>;

    return parsed.map(topic => ({
      name: topic.name,
      messageIds: [], // Would need additional analysis to map topics to messages
      description: topic.description,
      keywords: topic.keywords,
      coverage: topic.coverage,
    }));
  } catch {
    // Fallback to simple extraction
    return extractTopicsSimple(messages);
  }
}

/**
 * Generate incremental summary (building on previous summary)
 */
export async function generateIncrementalSummary(
  input: IncrementalSummaryInput,
  config: {
    provider: ProviderName;
    model: string;
    apiKey: string;
    baseURL?: string;
  }
): Promise<ChatSummaryResult> {
  const { previousSummary, newMessages, options, onProgress } = input;
  const mergedOptions = { ...DEFAULT_CHAT_SUMMARY_OPTIONS, ...options };

  onProgress?.({ stage: 'analyzing', progress: 10, message: 'Analyzing new messages...' });

  if (newMessages.length === 0) {
    return {
      success: true,
      summary: previousSummary.summary,
      keyPoints: previousSummary.keyPoints,
      topics: previousSummary.topics,
      messageCount: previousSummary.messageCount,
      sourceTokens: previousSummary.sourceTokens,
      summaryTokens: previousSummary.summaryTokens,
      compressionRatio: previousSummary.compressionRatio,
      generatedAt: new Date(),
    };
  }

  const newSourceTokens = newMessages.reduce((sum, m) => sum + countTokens(m.content), 0);
  const totalSourceTokens = previousSummary.sourceTokens + newSourceTokens;

  onProgress?.({ stage: 'summarizing', progress: 50, message: 'Updating summary...' });

  try {
    const modelInstance = getProviderModel(config.provider, config.model, config.apiKey, config.baseURL);
    
    const prompt = buildIncrementalSummaryPrompt({
      previousSummary: previousSummary.summary,
      newMessages,
      format: mergedOptions.format,
      style: mergedOptions.style,
      language: mergedOptions.language,
    });

    const result = await generateText({
      model: modelInstance,
      prompt,
      temperature: 0.3,
      maxOutputTokens: mergedOptions.maxLength ? Math.ceil(mergedOptions.maxLength / 4) : 1500,
    });

    const summary = result.text.trim();
    const summaryTokens = countTokens(summary);

    // Extract new key points and merge with existing
    const newKeyPoints = extractKeyPointsSimple(newMessages);
    const mergedKeyPoints = [...previousSummary.keyPoints, ...newKeyPoints].slice(0, 20);

    // Extract new topics and merge
    const newTopics = extractTopicsSimple(newMessages);
    const mergedTopics = mergeTopics(previousSummary.topics, newTopics);

    onProgress?.({ stage: 'complete', progress: 100, message: 'Summary updated!' });

    return {
      success: true,
      summary,
      keyPoints: mergedKeyPoints,
      topics: mergedTopics,
      messageCount: previousSummary.messageCount + newMessages.length,
      sourceTokens: totalSourceTokens,
      summaryTokens,
      compressionRatio: totalSourceTokens > 0 ? summaryTokens / totalSourceTokens : 1,
      generatedAt: new Date(),
    };
  } catch (error) {
    return {
      success: false,
      summary: previousSummary.summary,
      keyPoints: previousSummary.keyPoints,
      topics: previousSummary.topics,
      messageCount: previousSummary.messageCount,
      sourceTokens: totalSourceTokens,
      summaryTokens: previousSummary.summaryTokens,
      compressionRatio: previousSummary.compressionRatio,
      generatedAt: new Date(),
      error: `Incremental summary failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Merge topics from previous and new extraction
 */
function mergeTopics(existing: ConversationTopic[], newTopics: ConversationTopic[]): ConversationTopic[] {
  const topicMap = new Map<string, ConversationTopic>();
  
  // Add existing topics
  existing.forEach(t => topicMap.set(t.name.toLowerCase(), t));
  
  // Merge or add new topics
  newTopics.forEach(t => {
    const key = t.name.toLowerCase();
    const existingTopic = topicMap.get(key);
    if (existingTopic) {
      topicMap.set(key, {
        ...existingTopic,
        messageIds: [...new Set([...existingTopic.messageIds, ...t.messageIds])],
        keywords: [...new Set([...(existingTopic.keywords || []), ...(t.keywords || [])])],
      });
    } else {
      topicMap.set(key, t);
    }
  });
  
  return Array.from(topicMap.values()).slice(0, 10);
}

/**
 * Analyze conversation quality and characteristics
 */
export async function analyzeConversation(
  messages: UIMessage[],
  config: {
    provider: ProviderName;
    model: string;
    apiKey: string;
    baseURL?: string;
  },
  language?: string
): Promise<ConversationAnalysis> {
  const defaultAnalysis: ConversationAnalysis = {
    sentiment: {
      overall: 'neutral',
      userSentiment: 'neutral',
      assistantTone: 'helpful',
    },
    quality: {
      clarity: 0.7,
      completeness: 0.7,
      helpfulness: 0.7,
    },
    characteristics: {
      isQA: true,
      isTechnical: false,
      isCreative: false,
      isDebugSession: false,
      hasCodingContent: false,
    },
    suggestions: [],
  };

  if (messages.length < 2) {
    return defaultAnalysis;
  }

  try {
    const modelInstance = getProviderModel(config.provider, config.model, config.apiKey, config.baseURL);
    
    const prompt = buildConversationAnalysisPrompt({ messages, language });

    const result = await generateText({
      model: modelInstance,
      prompt,
      temperature: 0.2,
      maxOutputTokens: 1000,
    });

    // Parse JSON response
    const jsonMatch = result.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return defaultAnalysis;
    }

    return JSON.parse(jsonMatch[0]) as ConversationAnalysis;
  } catch {
    return defaultAnalysis;
  }
}

/**
 * Get summary template by name
 */
export function getSummaryTemplate(templateName: keyof typeof SUMMARY_TEMPLATES) {
  return SUMMARY_TEMPLATES[templateName];
}

/**
 * Export all template names
 */
export function getAvailableTemplates() {
  return Object.keys(SUMMARY_TEMPLATES) as Array<keyof typeof SUMMARY_TEMPLATES>;
}
