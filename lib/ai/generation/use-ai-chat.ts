'use client';

/**
 * useAIChat - hook for AI chat functionality
 *
 * Features:
 * - Streaming and non-streaming chat capabilities
 * - Automatic memory injection into system prompts
 * - Multimodal (vision) content support
 * - Token usage and cost tracking
 * - onFinish/onStepFinish callbacks for observability
 * - Reasoning extraction support for thinking models
 * - API key rotation support
 * - Context compression for managing long conversations
 */

import { useCallback, useRef } from 'react';
import {
  generateText,
  streamText,
  type CoreMessage,
  type ImagePart,
  type TextPart,
  type ToolChoice,
  type ToolSet,
} from 'ai';
import { type ProviderName } from '../core/client';
import { getProxyProviderModel } from '../core/proxy-client';
import { loggers } from '@/lib/logger';

const log = loggers.ai;
import { useSettingsStore, useMemoryStore, useUsageStore, useSessionStore, useVectorStore } from '@/stores';
import { getNextApiKey } from '../infrastructure/api-key-rotation';
import {
  circuitBreakerRegistry,
  recordApiUsage,
  isProviderAvailable,
  calculateRequestCost,
} from '../infrastructure';
import { getPluginWorkflowIntegration } from '@/lib/plugin';
import {
  filterMessagesForContext,
  filterMessagesForContextAsync,
  mergeCompressionSettings,
  createFrozenSummary,
} from '../embedding/compression';
import { shouldPrioritizePrefixStability } from '../embedding/provider-cache-profile';
import type { UIMessage } from '@/types/core/message';
import {
  checkSafety,
  type SafetyCheckOptions,
  getSafetyWarningMessage,
} from '../core/middleware';
import {
  createChatObservabilityManager,
  type ChatObservabilityManager,
} from '../observability/chat-observability';
import { useChatObservabilityConfig } from '@/hooks/ai/use-chat-observability';
import {
  assertEmbeddingProviderRuntimeAvailable,
  isEmbeddingProviderConfigured,
  isTransformersRuntimeUnavailableError,
  resolveEmbeddingApiKey,
  type EmbeddingProvider,
} from '@/lib/vector/embedding';
import { buildCustomInstructionsSection } from '@/lib/ai/instructions/external-agent-instruction-stack';

export interface ChatUsageInfo {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cachedPromptTokens?: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
}

export interface ChatFinishResult {
  text: string;
  usage?: ChatUsageInfo;
  finishReason?: string;
  reasoning?: string;
}

export interface ChatStepResult {
  stepType: 'initial' | 'continue';
  text: string;
  usage?: ChatUsageInfo;
  toolCalls?: Array<{
    toolCallId: string;
    toolName: string;
    input?: unknown;
  }>;
  toolResults?: Array<{
    toolCallId: string;
    toolName: string;
    input?: unknown;
    output?: unknown;
  }>;
}

export interface ChatToolEvent {
  type: 'start' | 'update' | 'finish' | 'error';
  toolCallId: string;
  toolName: string;
  input?: unknown;
  output?: unknown;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
}

interface UseAIChatOptions {
  provider: ProviderName;
  model: string;
  onStreamStart?: () => void;
  onStreamEnd?: () => void;
  onError?: (error: Error) => void;
  onFinish?: (result: ChatFinishResult) => void;
  onStepFinish?: (step: ChatStepResult) => void;
  onToolEvent?: (event: ChatToolEvent) => void;
  extractReasoning?: boolean;
  reasoningTagName?: string;
}

// Multimodal content types
export interface VisionImageContent {
  type: 'image';
  image: string; // base64 data
  mimeType: string;
}

export interface VisionTextContent {
  type: 'text';
  text: string;
}

export interface VisionAudioContent {
  type: 'audio';
  audio: string; // base64 data
  mimeType: string;
  format: string; // Audio format like 'wav', 'mp3', etc.
}

export interface VisionVideoContent {
  type: 'video';
  video: string; // base64 data URL or URL
  mimeType: string;
}

export type MultimodalContent = VisionImageContent | VisionTextContent | VisionAudioContent | VisionVideoContent;

// Message with optional multimodal content
export interface MultimodalMessage {
  role: 'user' | 'assistant' | 'system';
  content: string | MultimodalContent[];
}

interface SendMessageOptions {
  messages: MultimodalMessage[];
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  sessionId?: string;
  messageId?: string;
  tools?: Record<string, unknown>;
  toolChoice?: 'auto' | 'none' | 'required' | { type: 'tool'; toolName: string };
  onToolEvent?: (event: ChatToolEvent) => void;
  // Per-request streaming override (undefined = use global setting)
  streaming?: boolean;
}

const computeStableHash = (input: string): string => {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
};

export function useAIChat({
  provider,
  model,
  onStreamStart,
  onStreamEnd,
  onError,
  onFinish,
  onStepFinish,
  onToolEvent,
  extractReasoning = false,
  reasoningTagName = 'think',
}: UseAIChatOptions) {
  const abortControllerRef = useRef<AbortController | null>(null);
  const reasoningRef = useRef<string>('');
  const observabilityManagerRef = useRef<ChatObservabilityManager | null>(null);
  const providerSettings = useSettingsStore((state) => state.providerSettings);
  const streamingEnabled = useSettingsStore((state) => state.streamResponses);
  const observabilityConfig = useChatObservabilityConfig();

  // Compression settings
  const compressionSettings = useSettingsStore((state) => state.compressionSettings);
  const chatPromptCacheAlignmentEnabled = useSettingsStore((state) => state.chatPromptCacheAlignmentEnabled);
  const getSession = useSessionStore((state) => state.getSession);
  const setFrozenSummary = useSessionStore((state) => state.setFrozenSummary);

  // Memory settings
  const getMemoriesForPrompt = useMemoryStore((state) => state.getMemoriesForPrompt);
  const detectMemoryFromText = useMemoryStore((state) => state.detectMemoryFromText);
  const createMemory = useMemoryStore((state) => state.createMemory);
  const memorySettings = useMemoryStore((state) => state.settings);

  // RAG settings
  const vectorSettings = useVectorStore((state) => state.settings);

  // Custom instructions settings
  const customInstructions = useSettingsStore((state) => state.customInstructions);
  const customInstructionsEnabled = useSettingsStore((state) => state.customInstructionsEnabled);
  const aboutUser = useSettingsStore((state) => state.aboutUser);
  const responsePreferences = useSettingsStore((state) => state.responsePreferences);

  // Usage tracking
  const addUsageRecord = useUsageStore((state) => state.addUsageRecord);

  // Safety mode settings
  const safetyModeSettings = useSettingsStore((state) => state.safetyModeSettings);

  const sendMessage = useCallback(
    async (
      options: SendMessageOptions,
      onChunk?: (chunk: string) => void
    ): Promise<string> => {
      // Handle 'auto' provider - this should be resolved before calling this hook
      if (provider === 'auto') {
        throw new Error('Auto provider should be resolved before calling sendMessage');
      }

      const settings = providerSettings[provider];
      if (!settings?.apiKey && provider !== 'ollama') {
        throw new Error(`API key not configured for ${provider}. Please add your API key in Settings.`);
      }

      if (!settings?.enabled) {
        throw new Error(`Provider ${provider} is disabled. Please enable it in Settings.`);
      }

      // Check circuit breaker - if provider is failing, reject early
      if (!isProviderAvailable(provider)) {
        throw new Error(`Provider ${provider} is temporarily unavailable due to repeated failures. Please try again later or switch providers.`);
      }

      // Check quota limits - if exceeded, reject early
      const quotaCheck = useUsageStore.getState().canMakeRequest(provider);
      if (!quotaCheck.allowed) {
        throw new Error(`Provider ${provider} quota exceeded: ${quotaCheck.reason}`);
      }

      // Get API key with rotation support
      let activeApiKey = settings?.apiKey || '';
      if (
        settings?.apiKeyRotationEnabled &&
        settings?.apiKeys &&
        settings.apiKeys.length > 1
      ) {
        // Use rotation to get the next API key
        const rotationResult = getNextApiKey(
          settings.apiKeys,
          settings.apiKeyRotationStrategy || 'round-robin',
          settings.currentKeyIndex || 0,
          settings.apiKeyUsageStats || {}
        );
        activeApiKey = rotationResult.apiKey;
        
        // Update the current key index in the store
        useSettingsStore.getState().updateProviderSettings(provider, {
          currentKeyIndex: rotationResult.index,
        });
      }

      const modelInstance = getProxyProviderModel(
        provider,
        model,
        activeApiKey,
        settings?.baseURL,
        true // Enable proxy support
      );

      abortControllerRef.current = new AbortController();

      const {
        messages,
        systemPrompt,
        temperature = 0.7,
        maxTokens,
        topP,
        frequencyPenalty,
        presencePenalty,
        sessionId,
        messageId,
        streaming,
        tools,
        toolChoice,
        onToolEvent: onRequestToolEvent,
      } = options;

      const handleToolEvent = onRequestToolEvent ?? onToolEvent;

      // Initialize observability manager for this session
      if (sessionId && !observabilityManagerRef.current && observabilityConfig.enabled) {
        observabilityManagerRef.current = createChatObservabilityManager({
          sessionId,
          userId: undefined, // TODO: Get from user store when available
          enableLangfuse: observabilityConfig.enableLangfuse,
          enableOpenTelemetry: observabilityConfig.enableOpenTelemetry,
          metadata: {
            provider,
            model,
          },
        });
        observabilityManagerRef.current.startChat();
      }

      // Apply safety mode checks if enabled
      if (safetyModeSettings.enabled) {
        const safetyOptions: SafetyCheckOptions = {
          mode: safetyModeSettings.mode,
          checkUserInput: safetyModeSettings.checkUserInput,
          checkSystemPrompt: safetyModeSettings.checkSystemPrompt,
          checkToolCalls: safetyModeSettings.checkToolCalls,
          blockDangerousCommands: safetyModeSettings.blockDangerousCommands,
          customBlockedPatterns: safetyModeSettings.customBlockedPatterns,
          customAllowedPatterns: safetyModeSettings.customAllowedPatterns,
        };

        // Check system prompt if enabled
        if (safetyModeSettings.checkSystemPrompt && systemPrompt) {
          const systemCheck = checkSafety(systemPrompt, safetyOptions);
          if (systemCheck.blocked) {
            const errorMsg = getSafetyWarningMessage(systemCheck);
            throw new Error(errorMsg || 'System prompt blocked by safety mode');
          }
        }

        // Check user messages if enabled
        if (safetyModeSettings.checkUserInput) {
          for (const message of messages) {
            if (message.role === 'user' && typeof message.content === 'string') {
              const userCheck = checkSafety(message.content, safetyOptions);
              if (userCheck.blocked) {
                const errorMsg = getSafetyWarningMessage(userCheck);
                throw new Error(errorMsg || 'User message blocked by safety mode');
              }
            }
          }
        }
      }

      // Determine effective streaming setting: per-request override > global setting
      const useStreaming = streaming !== undefined ? streaming : streamingEnabled;

      // Auto-detect memories from user messages using two-phase pipeline
      if (memorySettings.enabled && memorySettings.autoInfer) {
        const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user');
        if (lastUserMessage && typeof lastUserMessage.content === 'string') {
          if (memorySettings.enablePipeline) {
            // Use the new two-phase pipeline for better extraction (26% more accurate)
            const { extractMemoryCandidates } = await import('../memory/memory-pipeline');
            const conversationMessages = messages
              .filter(m => typeof m.content === 'string')
              .map(m => ({
                role: m.role as 'user' | 'assistant' | 'system',
                content: m.content as string,
              }));
            
            const candidates = extractMemoryCandidates({
              messages: conversationMessages,
              sessionId,
            }, {
              enablePipeline: true,
              recentMessageCount: memorySettings.pipelineRecentMessages || 5,
              enableSummary: memorySettings.enableRollingSummary || false,
              maxCandidates: 3,
              similarityThreshold: memorySettings.conflictThreshold || 0.7,
              topKSimilar: 3,
            });

            // Create memories from high-confidence candidates
            for (const candidate of candidates.filter(c => c.confidence >= 0.7)) {
              createMemory({
                type: candidate.type,
                content: candidate.content,
                source: 'inferred',
                sessionId,
              });
            }
          } else {
            // Fallback to simple detection
            const detectedMemory = detectMemoryFromText(lastUserMessage.content);
            if (detectedMemory) {
              createMemory(detectedMemory);
            }
          }
        }
      }

      // Build custom instructions section
      const customInstructionBlock = buildCustomInstructionsSection({
        customInstructionsEnabled,
        aboutUser,
        responsePreferences,
        customInstructions,
      });
      const customInstructionsSection = customInstructionBlock
        ? `\n\n${customInstructionBlock}`
        : '';

      // Inject memories into system prompt
      const memoriesSection = getMemoriesForPrompt();

      // RAG context retrieval - inject knowledge base context into system prompt
      // Uses the advanced RAGPipeline with hybrid search, reranking, query expansion etc.
      let ragContextSection = '';
      if (vectorSettings.enableRAGInChat) {
        const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user');
        if (lastUserMessage && typeof lastUserMessage.content === 'string') {
          try {
            const embeddingProvider = vectorSettings.embeddingProvider as EmbeddingProvider;
            const providerSettingsMap = providerSettings as Record<string, { apiKey?: string }>;

            if (isEmbeddingProviderConfigured(embeddingProvider, providerSettingsMap)) {
              assertEmbeddingProviderRuntimeAvailable(embeddingProvider);
              const embeddingApiKey = resolveEmbeddingApiKey(
                embeddingProvider,
                providerSettingsMap
              );
              const { createRAGRuntimeConfigFromVectorSettings, getSharedRAGRuntime } = await import('../rag');
              const runtimeConfig = createRAGRuntimeConfigFromVectorSettings(
                {
                  ...vectorSettings,
                  embeddingProvider,
                },
                embeddingApiKey
              );
              const runtime = getSharedRAGRuntime('chat:rag-injection', runtimeConfig);
              const ragResult = await runtime.retrieve(
                vectorSettings.defaultCollectionName || 'default',
                lastUserMessage.content
              );

              if (ragResult.formattedContext && ragResult.documents.length > 0) {
                const citationSection = ragResult.citations?.referenceList
                  ? `\n\nReferences:\n${ragResult.citations.referenceList}`
                  : '';
                ragContextSection = `\n\n[Knowledge Base Context]\nThe following information was retrieved from the knowledge base and may be relevant to the user's question. Use it to provide accurate answers when applicable:\n\n${ragResult.formattedContext}${citationSection}`;
                log.debug(`RAG injected ${ragResult.documents.length} chunks (${ragResult.totalTokensEstimate} tokens est.) [hybrid=${ragResult.searchMetadata.hybridSearchUsed}, rerank=${ragResult.searchMetadata.rerankingUsed}]`);
              }
            } else {
              log.warn(
                `RAG in chat skipped: embedding provider ${embeddingProvider} is not configured`
              );
            }
          } catch (ragError) {
            if (isTransformersRuntimeUnavailableError(ragError)) {
              throw ragError;
            }
            log.warn('RAG context retrieval failed, continuing without RAG context', { error: String(ragError) });
          }
        }
      }

      // Apply context compression if enabled
      // Get session compression overrides if available
      const session = sessionId ? getSession(sessionId) : undefined;
      const effectiveCompressionSettings = mergeCompressionSettings(
        compressionSettings,
        session?.compressionOverrides
      );

      // Build enhanced system prompt with prefix stability awareness
      // When prefix stability is important (vLLM, SGLang, OpenAI, Anthropic),
      // keep stable parts (base + instructions) in system prompt,
      // and inject dynamic parts (memories + RAG) as late system messages
      const prefixStable = effectiveCompressionSettings.prefixStabilityMode &&
        shouldPrioritizePrefixStability(provider as ProviderName);

      let stableSystemPrompt = systemPrompt || '';
      if (customInstructionsSection) {
        stableSystemPrompt += customInstructionsSection;
      }

      // Dynamic context sections — injected differently based on prefix stability
      let dynamicContextSection = '';
      if (memoriesSection) {
        if (prefixStable) {
          dynamicContextSection += memoriesSection;
        } else {
          stableSystemPrompt += memoriesSection;
        }
      }
      if (ragContextSection) {
        if (prefixStable) {
          dynamicContextSection += ragContextSection;
        } else {
          stableSystemPrompt += ragContextSection;
        }
      }

      // Only set system prompt if there's content
      const finalSystemPrompt = stableSystemPrompt.trim() || undefined;

      // Filter messages based on compression settings
      // Convert MultimodalMessage to UIMessage format for filtering
      const messagesAsUIMessage: UIMessage[] = messages.map((msg, idx) => ({
        id: `temp-${idx}`,
        role: msg.role,
        content: typeof msg.content === 'string' ? msg.content : msg.content.map(p => p.type === 'text' ? p.text : '[image]').join(' '),
        createdAt: new Date(),
      }));

      // Calculate max tokens for context (use model's max or default)
      const modelMaxTokens = maxTokens || 100000;

      // Use async compression with AI when enabled and provider is available
      let filteredUIMessages: UIMessage[];
      const shouldUseAsync = effectiveCompressionSettings.useAISummarization && activeApiKey && provider;

      // Get frozen summary for prefix stability (if available)
      const frozenSummary = session?.frozenSummary;

      if (shouldUseAsync && sessionId) {
        filteredUIMessages = await filterMessagesForContextAsync(
          messagesAsUIMessage,
          effectiveCompressionSettings,
          sessionId,
          modelMaxTokens,
          provider,
          model,
          frozenSummary
        );
      } else {
        filteredUIMessages = filterMessagesForContext(
          messagesAsUIMessage,
          effectiveCompressionSettings,
          modelMaxTokens,
          provider,
          model,
          frozenSummary
        );
      }

      // Log compression activity if messages were filtered
      if (filteredUIMessages.length < messages.length) {
        log.debug(`Compression filtered ${messages.length - filteredUIMessages.length} messages (${messages.length} → ${filteredUIMessages.length})`);
      }

      // Map back to original messages (preserve multimodal content)
      const filteredMessageIds = new Set(filteredUIMessages.map(m => m.id));
      const filteredMessages = messages.filter((_, idx) => filteredMessageIds.has(`temp-${idx}`));

      // Also include any summary messages that were created during compression
      const summaryUIMessages = filteredUIMessages.filter(m => m.compressionState?.isSummary);
      const summaryMessages: MultimodalMessage[] = filteredUIMessages
        .filter(m => m.compressionState?.isSummary)
        .map(m => ({
          role: 'system' as const,
          content: m.content,
        }));

      // Persist frozen summary lifecycle for prefix-stable providers.
      if (
        sessionId &&
        effectiveCompressionSettings.enabled &&
        effectiveCompressionSettings.prefixStabilityMode &&
        shouldPrioritizePrefixStability(provider as ProviderName)
      ) {
        const firstSummary = summaryUIMessages[0];
        if (firstSummary?.compressionState?.isSummary) {
          const isFrozenSummaryMessage = firstSummary.id.startsWith('frozen-summary-v');
          if (!isFrozenSummaryMessage) {
            const summarizedIds = firstSummary.compressionState.summarizedMessageIds ?? [];
            const summarizedMessages = messagesAsUIMessage.filter((msg) => summarizedIds.includes(msg.id));
            if (summarizedMessages.length > 0) {
              const nextFrozen = createFrozenSummary(
                firstSummary.content,
                summarizedMessages,
                session?.frozenSummary?.version
              );
              setFrozenSummary(sessionId, nextFrozen);
            }
          }
        } else if (session?.frozenSummary) {
          setFrozenSummary(sessionId, undefined);
        }
      }

      // Inject dynamic context as a late system message (prefix stability mode)
      // This keeps the system prompt stable for KV cache reuse
      const dynamicContextMessages: MultimodalMessage[] = [];
      if (prefixStable && dynamicContextSection.trim()) {
        dynamicContextMessages.push({
          role: 'system' as const,
          content: dynamicContextSection.trim(),
        });
      }

      // Combine: summary messages + filtered original messages + dynamic context at tail
      const finalMessages = [...summaryMessages, ...filteredMessages, ...dynamicContextMessages];

      // Convert MultimodalMessage to CoreMessage format
      const convertedMessages: CoreMessage[] = finalMessages.map((msg) => {
        if (typeof msg.content === 'string') {
          return {
            role: msg.role,
            content: msg.content,
          } as CoreMessage;
        }

        // Multimodal content - convert to AI SDK format
        // Note: AI SDK uses different part types for different media
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const parts: any[] = msg.content.map((part) => {
          if (part.type === 'text') {
            return { type: 'text', text: part.text } as TextPart;
          }
          if (part.type === 'image') {
            // Image part - AI SDK expects image as base64 string or URL
            return {
              type: 'image',
              image: part.image, // base64 string
              mimeType: part.mimeType,
            } as ImagePart;
          }
          if (part.type === 'audio') {
            // Audio part - OpenRouter uses input_audio format
            // For providers like OpenAI/OpenRouter
            return {
              type: 'file',
              data: part.audio,
              mimeType: part.mimeType,
            };
          }
          if (part.type === 'video') {
            // Video part - can be URL or base64 data URL
            return {
              type: 'file',
              data: part.video,
              mimeType: part.mimeType,
            };
          }
          return part;
        });

        return {
          role: msg.role,
          content: parts,
        } as CoreMessage;
      });

      const promptCacheSchemaVersion = 'chat-prompt-cache:v3';
      const stablePrefixSeed = [
        promptCacheSchemaVersion,
        provider,
        model,
        `prefixStabilityMode:${effectiveCompressionSettings.prefixStabilityMode ? '1' : '0'}`,
        `retainedThreshold:${effectiveCompressionSettings.retainedThreshold}`,
        `frozenSummaryVersion:${session?.frozenSummary?.version ?? 0}`,
        finalSystemPrompt ?? '',
        ...summaryMessages.map((message) => (typeof message.content === 'string' ? message.content : '')),
        tools ? Object.keys(tools).sort().join(',') : '',
      ].join('\n');
      const promptCacheKey = computeStableHash(stablePrefixSeed);
      const estimatedStableTokens = Math.ceil(stablePrefixSeed.length / 4);
      const anthropicCacheEnabled =
        chatPromptCacheAlignmentEnabled && provider === 'anthropic' && estimatedStableTokens >= 1024;
      const anthropicStableBlockCount = anthropicCacheEnabled ? Math.min(4, summaryMessages.length) : 0;
      const cacheAlignedMessages = convertedMessages.map((message, index) => {
        if (index >= anthropicStableBlockCount) {
          return message;
        }
        return {
          ...message,
          providerOptions: {
            ...((message as { providerOptions?: Record<string, unknown> }).providerOptions ?? {}),
            anthropic: { cacheControl: { type: 'ephemeral' } },
          },
        } as CoreMessage;
      });
      const providerOptions: Record<string, unknown> = {};
      if (chatPromptCacheAlignmentEnabled) {
        if (provider === 'openai') {
          providerOptions.openai = {
            promptCacheKey,
          };
        }
        if (anthropicCacheEnabled) {
          providerOptions.anthropic = {
            cacheControl: { type: 'ephemeral' },
          };
        }
      }

      // Build common options
      const commonOptions = {
        model: modelInstance,
        messages: cacheAlignedMessages,
        system: finalSystemPrompt,
        ...(tools ? { tools: tools as ToolSet } : {}),
        ...(toolChoice ? { toolChoice: toolChoice as ToolChoice<ToolSet> } : {}),
        ...(Object.keys(providerOptions).length > 0 ? { providerOptions } : {}),
        temperature,
        abortSignal: abortControllerRef.current.signal,
        ...(maxTokens && { maxTokens }),
        ...(topP !== undefined && { topP }),
        ...(frequencyPenalty !== undefined && { frequencyPenalty }),
        ...(presencePenalty !== undefined && { presencePenalty }),
      };

      // Helper function to extract and normalize usage info
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const normalizeUsage = (usage: any): ChatUsageInfo | undefined => {
        if (!usage) return undefined;
        const promptTokens = usage.promptTokens ?? usage.inputTokens ?? usage.prompt_tokens ?? 0;
        const completionTokens =
          usage.completionTokens ?? usage.outputTokens ?? usage.completion_tokens ?? 0;
        const promptTokensDetails = usage.promptTokensDetails ?? usage.prompt_tokens_details ?? {};
        const cachedPromptTokens =
          promptTokensDetails.cachedTokens ?? promptTokensDetails.cached_tokens ?? 0;
        const cacheReadTokens =
          usage.cacheReadInputTokens ?? usage.cache_read_input_tokens ?? 0;
        const cacheWriteTokens =
          usage.cacheCreationInputTokens ?? usage.cache_creation_input_tokens ?? 0;
        const totalTokens = usage.totalTokens ?? usage.total_tokens ?? promptTokens + completionTokens;
        return {
          promptTokens,
          completionTokens,
          totalTokens,
          cachedPromptTokens: cachedPromptTokens || undefined,
          cacheReadTokens: cacheReadTokens || undefined,
          cacheWriteTokens: cacheWriteTokens || undefined,
        };
      };

      // Track request timing
      const requestStartTime = Date.now();
      let firstTokenTime: number | undefined;

      // Helper function to record usage with latency and status
      const recordUsage = (
        usage: ChatUsageInfo | undefined,
        status: 'success' | 'error' | 'timeout' | 'cancelled' = 'success',
        errorMessage?: string
      ) => {
        if (usage?.cachedPromptTokens || usage?.cacheReadTokens || usage?.cacheWriteTokens) {
          log.debug('Prompt cache usage detected', {
            provider,
            model,
            cachedPromptTokens: usage.cachedPromptTokens ?? 0,
            cacheReadTokens: usage.cacheReadTokens ?? 0,
            cacheWriteTokens: usage.cacheWriteTokens ?? 0,
          });
        }
        if (sessionId && messageId && usage) {
          const latency = Date.now() - requestStartTime;
          addUsageRecord({
            sessionId,
            messageId,
            provider,
            model,
            tokens: {
              prompt: usage.promptTokens,
              completion: usage.completionTokens,
              total: usage.totalTokens,
            },
            latency,
            status,
            errorMessage,
            timeToFirstToken: firstTokenTime ? firstTokenTime - requestStartTime : undefined,
          });
        }
      };

      // Helper to extract reasoning from text (for models that use <think> tags)
      const extractReasoningFromText = (text: string): { content: string; reasoning: string } => {
        if (!extractReasoning) return { content: text, reasoning: '' };
        
        const openTag = `<${reasoningTagName}>`;
        const closeTag = `</${reasoningTagName}>`;
        const startIdx = text.indexOf(openTag);
        const endIdx = text.indexOf(closeTag);
        
        if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
          const reasoning = text.slice(startIdx + openTag.length, endIdx).trim();
          const content = (text.slice(0, startIdx) + text.slice(endIdx + closeTag.length)).trim();
          return { content, reasoning };
        }
        
        return { content: text, reasoning: '' };
      };

      // Helper to record API key usage for rotation tracking
      const recordApiKeyUsage = (success: boolean, errorMessage?: string) => {
        if (settings?.apiKeyRotationEnabled && settings?.apiKeys && settings.apiKeys.length > 1) {
          useSettingsStore.getState().recordApiKeyUsage(provider, activeApiKey, success, errorMessage);
        }
      };

      const safeParseToolInput = (input: unknown): unknown => {
        if (typeof input !== 'string') {
          return input;
        }

        try {
          return JSON.parse(input);
        } catch {
          return input;
        }
      };

      type StepToolCall = NonNullable<ChatStepResult['toolCalls']>[number];
      type StepToolResult = NonNullable<ChatStepResult['toolResults']>[number];
      type ActiveToolCall = {
        toolName: string;
        inputBuffer: string;
        input?: unknown;
        startedAt: Date;
      };

      const normalizeToolCall = (
        toolCall: { toolCallId?: string; toolName?: string; input?: unknown; args?: unknown } | undefined
      ): StepToolCall | undefined => {
        if (!toolCall?.toolCallId || !toolCall.toolName) {
          return undefined;
        }

        return {
          toolCallId: toolCall.toolCallId,
          toolName: toolCall.toolName,
          input: 'input' in toolCall ? toolCall.input : toolCall.args,
        };
      };

      const normalizeToolResult = (
        toolResult:
          | { toolCallId?: string; toolName?: string; input?: unknown; output?: unknown; result?: unknown }
          | undefined
      ): StepToolResult | undefined => {
        if (!toolResult?.toolCallId || !toolResult.toolName) {
          return undefined;
        }

        return {
          toolCallId: toolResult.toolCallId,
          toolName: toolResult.toolName,
          input: toolResult.input,
          output: 'output' in toolResult ? toolResult.output : toolResult.result,
        };
      };

      try {
        if (useStreaming && onChunk) {
          onStreamStart?.();
          reasoningRef.current = '';
          
          // Notify plugins of stream start
          const pluginIntegration = getPluginWorkflowIntegration();
          if (sessionId) {
            pluginIntegration.notifyStreamStart(sessionId);
          }

          // Start observability tracking for streaming
          const streamingTracker = observabilityManagerRef.current?.trackStreamingGeneration(
            model,
            provider,
            convertedMessages,
            { temperature, maxTokens, topP }
          );

          const result = await streamText(commonOptions as Parameters<typeof streamText>[0]);

          let fullText = '';
          let inReasoningBlock = false;
          const openTag = `<${reasoningTagName}>`;
          const closeTag = `</${reasoningTagName}>`;
          const activeToolCalls = new Map<string, ActiveToolCall>();
          const stepToolCalls: StepToolCall[] = [];
          const stepToolResults: StepToolResult[] = [];

          for await (const chunk of result.fullStream) {
            if (chunk.type === 'text-delta') {
              const textChunk = chunk.text;
              if (!firstTokenTime && textChunk.length > 0) {
                firstTokenTime = Date.now();
              }
              fullText += textChunk;

              if (extractReasoning) {
                if (fullText.includes(openTag) && !fullText.includes(closeTag)) {
                  inReasoningBlock = true;
                }
                if (fullText.includes(closeTag)) {
                  inReasoningBlock = false;
                }
              }

              if (!inReasoningBlock || !extractReasoning) {
                onChunk(textChunk);
                if (sessionId) {
                  pluginIntegration.notifyStreamChunk(sessionId, textChunk, fullText);
                }
              }
              continue;
            }

            if (chunk.type === 'tool-input-start') {
              activeToolCalls.set(chunk.id, {
                toolName: chunk.toolName,
                inputBuffer: '',
                startedAt: new Date(),
              });
              handleToolEvent?.({
                type: 'start',
                toolCallId: chunk.id,
                toolName: chunk.toolName,
                startedAt: activeToolCalls.get(chunk.id)?.startedAt,
              });
              continue;
            }

            if (chunk.type === 'tool-input-delta') {
              const tracked = activeToolCalls.get(chunk.id);
              if (tracked) {
                tracked.inputBuffer += chunk.delta;
                tracked.input = safeParseToolInput(tracked.inputBuffer);
                activeToolCalls.set(chunk.id, tracked);
                handleToolEvent?.({
                  type: 'update',
                  toolCallId: chunk.id,
                  toolName: tracked.toolName,
                  input: tracked.input,
                  startedAt: tracked.startedAt,
                });
              }
              continue;
            }

            if (chunk.type === 'tool-call') {
              const normalizedCall = normalizeToolCall({
                toolCallId: chunk.toolCallId,
                toolName: chunk.toolName,
                input: 'input' in chunk ? chunk.input : undefined,
                args: 'args' in chunk ? chunk.args : undefined,
              });
              if (!normalizedCall) {
                continue;
              }

              const tracked: ActiveToolCall = activeToolCalls.get(normalizedCall.toolCallId) ?? {
                toolName: normalizedCall.toolName,
                inputBuffer: '',
                startedAt: new Date(),
              };
              tracked.input = normalizedCall.input;
              activeToolCalls.set(normalizedCall.toolCallId, tracked);

              if (!stepToolCalls.find((item) => item.toolCallId === normalizedCall.toolCallId)) {
                stepToolCalls.push(normalizedCall);
              }

              handleToolEvent?.({
                type: 'update',
                toolCallId: normalizedCall.toolCallId,
                toolName: normalizedCall.toolName,
                input: normalizedCall.input,
                startedAt: tracked.startedAt,
              });
              continue;
            }

            if (chunk.type === 'tool-result') {
              const normalizedResult = normalizeToolResult({
                toolCallId: chunk.toolCallId,
                toolName: chunk.toolName,
                input: chunk.input,
                output: chunk.output,
              });
              if (!normalizedResult) {
                continue;
              }

              const tracked = activeToolCalls.get(normalizedResult.toolCallId);
              if (!stepToolResults.find((item) => item.toolCallId === normalizedResult.toolCallId)) {
                stepToolResults.push(normalizedResult);
              }

              handleToolEvent?.({
                type: 'finish',
                toolCallId: normalizedResult.toolCallId,
                toolName: normalizedResult.toolName,
                input: normalizedResult.input ?? tracked?.input,
                output: normalizedResult.output,
                startedAt: tracked?.startedAt,
                completedAt: new Date(),
              });
              activeToolCalls.delete(normalizedResult.toolCallId);
              continue;
            }

            if (chunk.type === 'tool-error') {
              const tracked = activeToolCalls.get(chunk.toolCallId);
              handleToolEvent?.({
                type: 'error',
                toolCallId: chunk.toolCallId,
                toolName: chunk.toolName,
                input: tracked?.input,
                error:
                  chunk.error instanceof Error
                    ? chunk.error.message
                    : typeof chunk.error === 'string'
                      ? chunk.error
                      : JSON.stringify(chunk.error),
                startedAt: tracked?.startedAt,
                completedAt: new Date(),
              });
              activeToolCalls.delete(chunk.toolCallId);
            }
          }

          // Extract reasoning from final text
          const { content: finalContent, reasoning } = extractReasoningFromText(fullText);
          reasoningRef.current = reasoning;
          
          // Notify plugins of stream end
          if (sessionId) {
            pluginIntegration.notifyStreamEnd(sessionId, finalContent);
          }

          // Record usage after streaming completes
          const rawUsage = await result.usage;
          const usage = normalizeUsage(rawUsage);
          recordUsage(usage);

          // End observability tracking for streaming
          streamingTracker?.end(finalContent, usage);
          
          // Notify plugins of token usage
          if (sessionId && usage) {
            pluginIntegration.notifyTokenUsage(sessionId, {
              prompt: usage.promptTokens,
              completion: usage.completionTokens,
              total: usage.totalTokens,
            });
          }

          // Call onStepFinish for streaming completion
          onStepFinish?.({
            stepType: 'initial',
            text: finalContent,
            usage,
            toolCalls: stepToolCalls,
            toolResults: stepToolResults,
          });

          // Call onFinish callback
          const finishReason = await result.finishReason;
          onFinish?.({
            text: finalContent,
            usage,
            finishReason,
            reasoning,
          });

          // Record successful API key usage
          recordApiKeyUsage(true);

          // Record circuit breaker success
          circuitBreakerRegistry.get(provider).recordSuccess();

          // Record quota usage
          if (usage) {
            const cost = calculateRequestCost(provider, model, usage.promptTokens, usage.completionTokens);
            recordApiUsage({
              providerId: provider,
              modelId: model,
              inputTokens: usage.promptTokens,
              outputTokens: usage.completionTokens,
              cost,
              success: true,
              latencyMs: Date.now() - requestStartTime,
            });
          }

          onStreamEnd?.();
          return extractReasoning ? finalContent : fullText;
        } else {
          // Track non-streaming generation with observability
          type NonStreamingResult = {
            text: string;
            usage?: ChatUsageInfo;
            finishReason?: string;
            toolCalls?: Array<{ toolCallId?: string; toolName?: string; input?: unknown; args?: unknown }>;
            toolResults?: Array<{
              toolCallId?: string;
              toolName?: string;
              input?: unknown;
              output?: unknown;
              result?: unknown;
            }>;
          };

          const generateWithObservability = async () => {
            const result = await generateText(commonOptions as Parameters<typeof generateText>[0]);
            const usage = normalizeUsage(result.usage);
            return {
              text: result.text,
              usage,
              finishReason: result.finishReason,
              toolCalls: result.toolCalls,
              toolResults: result.toolResults,
            } satisfies NonStreamingResult;
          };

          const result: NonStreamingResult = observabilityManagerRef.current
            ? await observabilityManagerRef.current.trackGeneration(
                model,
                provider,
                convertedMessages,
                generateWithObservability,
                { temperature, maxTokens, topP }
              )
            : await generateWithObservability();

          // Extract reasoning from result
          const { content: finalContent, reasoning } = extractReasoningFromText(result.text);
          reasoningRef.current = reasoning;

          // Record usage for non-streaming
          const usage = result.usage;
          recordUsage(usage);

          const toolCalls =
            result.toolCalls
              ?.map((toolCall: NonNullable<NonStreamingResult['toolCalls']>[number]) =>
                normalizeToolCall({
                  toolCallId: toolCall.toolCallId,
                  toolName: toolCall.toolName,
                  input: 'input' in toolCall ? toolCall.input : undefined,
                  args: 'args' in toolCall ? toolCall.args : undefined,
                })
              )
              .filter(
                (toolCall): toolCall is StepToolCall =>
                  !!toolCall
              ) ?? [];

          const toolResults =
            result.toolResults
              ?.map((toolResult: NonNullable<NonStreamingResult['toolResults']>[number]) =>
                normalizeToolResult({
                  toolCallId: toolResult.toolCallId,
                  toolName: toolResult.toolName,
                  input: toolResult.input,
                  output: 'output' in toolResult ? toolResult.output : undefined,
                  result: 'result' in toolResult ? toolResult.result : undefined,
                })
              )
              .filter(
                (toolResult): toolResult is StepToolResult =>
                  !!toolResult
              ) ?? [];

          for (const toolCall of toolCalls) {
            handleToolEvent?.({
              type: 'start',
              toolCallId: toolCall.toolCallId,
              toolName: toolCall.toolName,
              input: toolCall.input,
              startedAt: new Date(),
            });
            handleToolEvent?.({
              type: 'update',
              toolCallId: toolCall.toolCallId,
              toolName: toolCall.toolName,
              input: toolCall.input,
              startedAt: new Date(),
            });
          }

          for (const toolResult of toolResults) {
            handleToolEvent?.({
              type: 'finish',
              toolCallId: toolResult.toolCallId,
              toolName: toolResult.toolName,
              input: toolResult.input,
              output: toolResult.output,
              completedAt: new Date(),
            });
          }

          // Call onStepFinish
          onStepFinish?.({
            stepType: 'initial',
            text: finalContent,
            usage,
            toolCalls,
            toolResults,
          });

          // Call onFinish callback
          onFinish?.({
            text: finalContent,
            usage,
            finishReason: (result as { finishReason?: string }).finishReason,
            reasoning,
          });

          // Record successful API key usage
          recordApiKeyUsage(true);

          // Record circuit breaker success
          circuitBreakerRegistry.get(provider).recordSuccess();

          // Record quota usage
          if (usage) {
            const cost = calculateRequestCost(provider, model, usage.promptTokens, usage.completionTokens);
            recordApiUsage({
              providerId: provider,
              modelId: model,
              inputTokens: usage.promptTokens,
              outputTokens: usage.completionTokens,
              cost,
              success: true,
              latencyMs: Date.now() - requestStartTime,
            });
          }

          return extractReasoning ? finalContent : result.text;
        }
      } catch (error) {
        if ((error as Error).name === 'AbortError') {
          // Record cancelled usage
          recordUsage({ promptTokens: 0, completionTokens: 0, totalTokens: 0 }, 'cancelled');
          return '';
        }
        
        // Notify plugins of chat error
        const pluginIntegration = getPluginWorkflowIntegration();
        if (sessionId) {
          pluginIntegration.notifyChatError(sessionId, error as Error);
        }
        
        // Record failed API key usage
        recordApiKeyUsage(false, (error as Error).message);

        // Record circuit breaker failure
        circuitBreakerRegistry.get(provider).recordFailure(error as Error);

        // Determine error status type
        const errorMessage = (error as Error).message;
        const isTimeout = errorMessage.toLowerCase().includes('timeout') || 
                          errorMessage.toLowerCase().includes('timed out');
        const errorStatus = isTimeout ? 'timeout' : 'error';

        // Record failed usage to usage store
        recordUsage(
          { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
          errorStatus,
          errorMessage
        );

        // Record failed quota usage
        recordApiUsage({
          providerId: provider,
          modelId: model,
          inputTokens: 0,
          outputTokens: 0,
          cost: 0,
          success: false,
          latencyMs: Date.now() - requestStartTime,
        });
        
        onError?.(error as Error);
        throw error;
      }
    },
    [provider, model, providerSettings, streamingEnabled, onStreamStart, onStreamEnd, onError, onFinish, onStepFinish, onToolEvent, extractReasoning, reasoningTagName, getMemoriesForPrompt, detectMemoryFromText, createMemory, memorySettings, vectorSettings, customInstructions, customInstructionsEnabled, aboutUser, responsePreferences, addUsageRecord, compressionSettings, chatPromptCacheAlignmentEnabled, getSession, setFrozenSummary, safetyModeSettings, observabilityConfig]
  );

  // Get the last extracted reasoning
  const getLastReasoning = useCallback(() => {
    return reasoningRef.current;
  }, []);

  const stop = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  return { sendMessage, stop, getLastReasoning };
}
