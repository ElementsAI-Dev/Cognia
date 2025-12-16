'use client';

/**
 * useAIChat - hook for AI chat functionality
 * Provides streaming and non-streaming chat capabilities
 * Automatically injects memory into system prompts
 * Supports multimodal (vision) content
 * Tracks token usage and costs
 */

import { useCallback, useRef } from 'react';
import { generateText, streamText, type CoreMessage, type ImagePart, type TextPart } from 'ai';
import { getProviderModel, type ProviderName } from './client';
import { useSettingsStore, useMemoryStore, useUsageStore } from '@/stores';

interface UseAIChatOptions {
  provider: ProviderName;
  model: string;
  onStreamStart?: () => void;
  onStreamEnd?: () => void;
  onError?: (error: Error) => void;
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

export type MultimodalContent = VisionImageContent | VisionTextContent;

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
  sessionId?: string;
  messageId?: string;
}

export function useAIChat({
  provider,
  model,
  onStreamStart,
  onStreamEnd,
  onError,
}: UseAIChatOptions) {
  const abortControllerRef = useRef<AbortController | null>(null);
  const providerSettings = useSettingsStore((state) => state.providerSettings);
  const streamingEnabled = useSettingsStore((state) => state.streamResponses);

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

      const modelInstance = getProviderModel(
        provider,
        model,
        settings?.apiKey || '',
        settings?.baseURL
      );

      abortControllerRef.current = new AbortController();

      const { messages, systemPrompt, temperature = 0.7, maxTokens, sessionId, messageId } = options;

      // Auto-detect memories from user messages
      if (memorySettings.enabled && memorySettings.autoInfer) {
        const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user');
        if (lastUserMessage && typeof lastUserMessage.content === 'string') {
          const detectedMemory = detectMemoryFromText(lastUserMessage.content);
          if (detectedMemory) {
            createMemory(detectedMemory);
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

      // Convert MultimodalMessage to CoreMessage format
      const convertedMessages: CoreMessage[] = messages.map((msg) => {
        if (typeof msg.content === 'string') {
          return {
            role: msg.role,
            content: msg.content,
          } as CoreMessage;
        }

        // Multimodal content - convert to AI SDK format
        const parts: (TextPart | ImagePart)[] = msg.content.map((part) => {
          if (part.type === 'text') {
            return { type: 'text', text: part.text } as TextPart;
          }
          // Image part - AI SDK expects image as base64 string or URL
          return {
            type: 'image',
            image: part.image, // base64 string
            mimeType: part.mimeType,
          } as ImagePart;
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
      };

      // Helper function to record usage
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const recordUsage = (usage: any) => {
        if (sessionId && messageId && usage) {
          const promptTokens = usage.promptTokens ?? usage.inputTokens ?? 0;
          const completionTokens = usage.completionTokens ?? usage.outputTokens ?? 0;
          addUsageRecord({
            sessionId,
            messageId,
            provider,
            model,
            tokens: {
              prompt: promptTokens,
              completion: completionTokens,
              total: promptTokens + completionTokens,
            },
          });
        }
      };

      try {
        if (streamingEnabled && onChunk) {
          onStreamStart?.();

          const result = await streamText(commonOptions);

          let fullText = '';
          for await (const chunk of result.textStream) {
            fullText += chunk;
            onChunk(chunk);
          }

          // Record usage after streaming completes
          const usage = await result.usage;
          if (usage) {
            recordUsage(usage);
          }

          onStreamEnd?.();
          return fullText;
        } else {
          const result = await generateText(commonOptions);

          // Record usage for non-streaming
          if (result.usage) {
            recordUsage(result.usage);
          }

          return result.text;
        }
      } catch (error) {
        if ((error as Error).name === 'AbortError') {
          return '';
        }
        onError?.(error as Error);
        throw error;
      }
    },
    [provider, model, providerSettings, streamingEnabled, onStreamStart, onStreamEnd, onError, getMemoriesForPrompt, detectMemoryFromText, createMemory, memorySettings, customInstructions, customInstructionsEnabled, aboutUser, responsePreferences, addUsageRecord]
  );

  const stop = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  return { sendMessage, stop };
}
