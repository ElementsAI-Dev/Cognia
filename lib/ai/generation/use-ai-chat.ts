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
import { generateText, streamText, type CoreMessage, type ImagePart, type TextPart } from 'ai';
import { type ProviderName } from '../core/client';
import { getProxyProviderModel } from '../core/proxy-client';
import { useSettingsStore, useMemoryStore, useUsageStore, useSessionStore } from '@/stores';
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
  mergeCompressionSettings,
} from '../embedding/compression';
import type { UIMessage } from '@/types/message';

export interface ChatUsageInfo {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
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
}

interface UseAIChatOptions {
  provider: ProviderName;
  model: string;
  onStreamStart?: () => void;
  onStreamEnd?: () => void;
  onError?: (error: Error) => void;
  onFinish?: (result: ChatFinishResult) => void;
  onStepFinish?: (step: ChatStepResult) => void;
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
  // Per-request streaming override (undefined = use global setting)
  streaming?: boolean;
}

export function useAIChat({
  provider,
  model,
  onStreamStart,
  onStreamEnd,
  onError,
  onFinish,
  onStepFinish,
  extractReasoning = false,
  reasoningTagName = 'think',
}: UseAIChatOptions) {
  const abortControllerRef = useRef<AbortController | null>(null);
  const reasoningRef = useRef<string>('');
  const providerSettings = useSettingsStore((state) => state.providerSettings);
  const streamingEnabled = useSettingsStore((state) => state.streamResponses);

  // Compression settings
  const compressionSettings = useSettingsStore((state) => state.compressionSettings);
  const getSession = useSessionStore((state) => state.getSession);

  // Memory settings
  const getMemoriesForPrompt = useMemoryStore((state) => state.getMemoriesForPrompt);
  const detectMemoryFromText = useMemoryStore((state) => state.detectMemoryFromText);
  const createMemory = useMemoryStore((state) => state.createMemory);
  const memorySettings = useMemoryStore((state) => state.settings);

  // Custom instructions settings
  const customInstructions = useSettingsStore((state) => state.customInstructions);
  const customInstructionsEnabled = useSettingsStore((state) => state.customInstructionsEnabled);
  const aboutUser = useSettingsStore((state) => state.aboutUser);
  const responsePreferences = useSettingsStore((state) => state.responsePreferences);

  // Usage tracking
  const addUsageRecord = useUsageStore((state) => state.addUsageRecord);

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

      const { messages, systemPrompt, temperature = 0.7, maxTokens, topP, frequencyPenalty, presencePenalty, sessionId, messageId, streaming } = options;

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
      let customInstructionsSection = '';
      if (customInstructionsEnabled) {
        const parts: string[] = [];
        if (aboutUser) {
          parts.push(`[About the user]\n${aboutUser}`);
        }
        if (responsePreferences) {
          parts.push(`[Response preferences]\n${responsePreferences}`);
        }
        if (customInstructions) {
          parts.push(`[Additional instructions]\n${customInstructions}`);
        }
        if (parts.length > 0) {
          customInstructionsSection = `\n\n${parts.join('\n\n')}`;
        }
      }

      // Inject memories into system prompt
      const memoriesSection = getMemoriesForPrompt();

      // Build enhanced system prompt: base + custom instructions + memories
      let enhancedSystemPrompt = systemPrompt || '';
      if (customInstructionsSection) {
        enhancedSystemPrompt += customInstructionsSection;
      }
      if (memoriesSection) {
        enhancedSystemPrompt += memoriesSection;
      }
      // Only set system prompt if there's content
      const finalSystemPrompt = enhancedSystemPrompt.trim() || undefined;

      // Apply context compression if enabled
      // Get session compression overrides if available
      const session = sessionId ? getSession(sessionId) : undefined;
      const effectiveCompressionSettings = mergeCompressionSettings(
        compressionSettings,
        session?.compressionOverrides
      );

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

      // Apply compression filtering
      const filteredUIMessages = filterMessagesForContext(
        messagesAsUIMessage,
        effectiveCompressionSettings,
        modelMaxTokens,
        provider,
        model
      );

      // Log compression activity if messages were filtered
      if (filteredUIMessages.length < messages.length) {
        console.log(`[Compression] Filtered ${messages.length - filteredUIMessages.length} messages (${messages.length} → ${filteredUIMessages.length})`);
      }

      // Map back to original messages (preserve multimodal content)
      const filteredMessageIds = new Set(filteredUIMessages.map(m => m.id));
      const filteredMessages = messages.filter((_, idx) => filteredMessageIds.has(`temp-${idx}`));

      // Also include any summary messages that were created during compression
      const summaryMessages: MultimodalMessage[] = filteredUIMessages
        .filter(m => (m as { compressionState?: { isSummary?: boolean } }).compressionState?.isSummary)
        .map(m => ({
          role: 'system' as const,
          content: m.content,
        }));

      // Combine summary messages with filtered original messages
      const finalMessages = [...summaryMessages, ...filteredMessages];

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

      // Build common options
      const commonOptions = {
        model: modelInstance,
        messages: convertedMessages,
        system: finalSystemPrompt,
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
        const promptTokens = usage.promptTokens ?? usage.inputTokens ?? 0;
        const completionTokens = usage.completionTokens ?? usage.outputTokens ?? 0;
        return {
          promptTokens,
          completionTokens,
          totalTokens: promptTokens + completionTokens,
        };
      };

      // Helper function to record usage
      const recordUsage = (usage: ChatUsageInfo | undefined) => {
        if (sessionId && messageId && usage) {
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

      try {
        if (useStreaming && onChunk) {
          onStreamStart?.();
          reasoningRef.current = '';
          
          // Notify plugins of stream start
          const pluginIntegration = getPluginWorkflowIntegration();
          if (sessionId) {
            pluginIntegration.notifyStreamStart(sessionId);
          }

          const result = await streamText(commonOptions);

          let fullText = '';
          let inReasoningBlock = false;
          const openTag = `<${reasoningTagName}>`;
          const closeTag = `</${reasoningTagName}>`;

          for await (const chunk of result.textStream) {
            fullText += chunk;
            
            // Track reasoning blocks during streaming
            if (extractReasoning) {
              if (fullText.includes(openTag) && !fullText.includes(closeTag)) {
                inReasoningBlock = true;
              }
              if (fullText.includes(closeTag)) {
                inReasoningBlock = false;
              }
            }
            
            // Only send visible content chunks (exclude reasoning)
            if (!inReasoningBlock || !extractReasoning) {
              onChunk(chunk);
              // Notify plugins of stream chunk
              if (sessionId) {
                pluginIntegration.notifyStreamChunk(sessionId, chunk, fullText);
              }
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
              latencyMs: Date.now() - (abortControllerRef.current?.signal ? 0 : Date.now()),
            });
          }

          onStreamEnd?.();
          return extractReasoning ? finalContent : fullText;
        } else {
          const result = await generateText(commonOptions);

          // Extract reasoning from result
          const { content: finalContent, reasoning } = extractReasoningFromText(result.text);
          reasoningRef.current = reasoning;

          // Record usage for non-streaming
          const usage = normalizeUsage(result.usage);
          recordUsage(usage);

          // Call onStepFinish
          onStepFinish?.({
            stepType: 'initial',
            text: finalContent,
            usage,
          });

          // Call onFinish callback
          onFinish?.({
            text: finalContent,
            usage,
            finishReason: result.finishReason,
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
              latencyMs: Date.now() - (abortControllerRef.current?.signal ? 0 : Date.now()),
            });
          }

          return extractReasoning ? finalContent : result.text;
        }
      } catch (error) {
        if ((error as Error).name === 'AbortError') {
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

        // Record failed quota usage
        recordApiUsage({
          providerId: provider,
          modelId: model,
          inputTokens: 0,
          outputTokens: 0,
          cost: 0,
          success: false,
          latencyMs: Date.now() - (abortControllerRef.current?.signal ? 0 : Date.now()),
        });
        
        onError?.(error as Error);
        throw error;
      }
    },
    [provider, model, providerSettings, streamingEnabled, onStreamStart, onStreamEnd, onError, onFinish, onStepFinish, extractReasoning, reasoningTagName, getMemoriesForPrompt, detectMemoryFromText, createMemory, memorySettings, customInstructions, customInstructionsEnabled, aboutUser, responsePreferences, addUsageRecord, compressionSettings, getSession]
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
