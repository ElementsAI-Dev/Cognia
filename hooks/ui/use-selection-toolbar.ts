'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  SelectionAction,
  ToolbarState,
  SelectionPayload,
  SelectionMode,
  TextType,
  getLanguageName,
  SelectionConfig as ToolbarConfig,
} from '@/types';
import { useSelectionStore } from '@/stores/context';
import { useSettingsStore } from '@/stores/settings';
import { useAIChat } from '@/lib/ai/generation/use-ai-chat';
import { detectLanguage } from '@/lib/ai/generation/translate';
import type { ProviderName } from '@/lib/ai/core/client';
import type { SelectionConfig as NativeSelectionConfig } from '@/lib/native/selection';
import { isTauri } from '@/lib/native/utils';
import { loggers } from '@/lib/logger';

const log = loggers.native;

const initialState: ToolbarState = {
  isVisible: false,
  selectedText: '',
  position: { x: 0, y: 0 },
  isLoading: false,
  activeAction: null,
  result: null,
  error: null,
  streamingResult: null,
  isStreaming: false,
  showMoreMenu: false,
  selectionMode: 'auto',
  textType: null,
  selections: [],
  isMultiSelectMode: false,
  references: [],
};

// System prompt for selection toolbar actions
const SELECTION_SYSTEM_PROMPT = `You are a helpful assistant that processes selected text. Be concise and accurate. Follow the user's instructions precisely.`;

// Prompts for different actions
const ACTION_PROMPTS: Record<SelectionAction, (text: string, targetLang?: string) => string> = {
  explain: (text) => `Please explain the following text in a clear and concise way:\n\n"${text}"`,
  translate: (text, targetLang = 'zh-CN') =>
    `Translate the following text to ${getLanguageName(targetLang)}. Only provide the translation, no explanations:\n\n"${text}"`,
  summarize: (text) => `Summarize the following text in 1-2 sentences:\n\n"${text}"`,
  extract: (text) =>
    `Extract the key points from the following text as a bullet list:\n\n"${text}"`,
  define: (text) => `Provide a clear definition for the following term or phrase:\n\n"${text}"`,
  rewrite: (text) =>
    `Rewrite the following text to improve clarity and flow while maintaining the original meaning:\n\n"${text}"`,
  grammar: (text) =>
    `Check the following text for grammar and spelling errors. List any issues found and provide the corrected version:\n\n"${text}"`,
  copy: () => '',
  'send-to-chat': () => '',
  search: () => '',
  'code-explain': (text) =>
    `Explain the following code in detail, including what it does and how it works:\n\n\`\`\`\n${text}\n\`\`\``,
  'code-optimize': (text) =>
    `Optimize the following code for better performance and readability. Provide the improved version with explanations:\n\n\`\`\`\n${text}\n\`\`\``,
  'tone-formal': (text) =>
    `Rewrite the following text in a more formal, professional tone:\n\n"${text}"`,
  'tone-casual': (text) =>
    `Rewrite the following text in a more casual, conversational tone:\n\n"${text}"`,
  expand: (text) => `Expand on the following text with more details and context:\n\n"${text}"`,
  shorten: (text) => `Shorten the following text while keeping the essential meaning:\n\n"${text}"`,
  'knowledge-map': (text) =>
    `Analyze the following text and generate a knowledge map with key concepts and their relationships:\n\n"${text}"`,
};

const toNativeConfig = (config: ToolbarConfig): NativeSelectionConfig => ({
  enabled: config.enabled,
  trigger_mode: config.triggerMode,
  min_text_length: config.minTextLength,
  max_text_length: config.maxTextLength,
  delay_ms: config.delayMs,
  target_language: config.targetLanguage,
  excluded_apps: config.excludedApps,
});

// Cooldown period after hiding to prevent immediate re-show (prevents flashing)
const HIDE_COOLDOWN_MS = 300;

export function useSelectionToolbar() {
  const [state, setState] = useState<ToolbarState>(initialState);
  const store = useSelectionStore();

  // Track when toolbar was last hidden to prevent immediate re-show (flashing)
  const lastHideTimeRef = useRef<number>(0);

  // Get config from store
  const config = store.config;

  // Get AI settings from settings store
  const defaultProvider = useSettingsStore((s) => s.defaultProvider);
  const providerSettings = useSettingsStore((s) => s.providerSettings);

  // Resolve provider and model (handle 'auto')
  const provider = useMemo(() => {
    if (defaultProvider === 'auto') {
      // Find first enabled provider
      const providers: ProviderName[] = ['openai', 'anthropic', 'google', 'deepseek', 'groq'];
      for (const p of providers) {
        if (providerSettings[p]?.enabled && providerSettings[p]?.apiKey) {
          return p;
        }
      }
      return 'openai'; // fallback
    }
    return defaultProvider as ProviderName;
  }, [defaultProvider, providerSettings]);

  const model = useMemo(() => {
    // Get model from provider settings or use defaults
    const currentProviderSettings = providerSettings[provider];
    if (currentProviderSettings?.defaultModel) {
      return currentProviderSettings.defaultModel;
    }
    // Default models per provider
    const defaults: Record<string, string> = {
      openai: 'gpt-4o-mini',
      anthropic: 'claude-3-haiku-20240307',
      google: 'gemini-1.5-flash',
      deepseek: 'deepseek-chat',
      groq: 'llama-3.1-8b-instant',
    };
    return defaults[provider] || 'gpt-4o-mini';
  }, [providerSettings, provider]);

  // Use the existing AI chat hook
  const { sendMessage, stop } = useAIChat({
    provider,
    model,
    onStreamStart: () => {
      setState((prev) => ({ ...prev, isStreaming: true }));
    },
    onStreamEnd: () => {
      setState((prev) => ({ ...prev, isStreaming: false }));
    },
    onError: (error) => {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        isStreaming: false,
        error: error.message,
      }));
    },
    onFinish: (result) => {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        isStreaming: false,
        result: result.text,
      }));
    },
  });

  // Sync selection config to the native side and keep the service running
  useEffect(() => {
    if (typeof window === 'undefined' || !isTauri()) {
      return;
    }

    const syncConfig = async () => {
      try {
        const [{ updateConfig, startSelectionService, stopSelectionService }, { invoke }] =
          await Promise.all([import('@/lib/native/selection'), import('@tauri-apps/api/core')]);

        await updateConfig(toNativeConfig({ ...config, enabled: store.isEnabled }));
        await invoke('selection_set_auto_hide_timeout', { timeout_ms: config.autoHideDelay ?? 0 });

        if (store.isEnabled) {
          await startSelectionService();
        } else {
          await stopSelectionService();
        }
      } catch (error) {
        log.error('Failed to sync selection config', error as Error);
      }
    };

    syncConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- config object is destructured into individual deps
  }, [
    store.isEnabled,
    config.enabled,
    config.triggerMode,
    config.minTextLength,
    config.maxTextLength,
    config.delayMs,
    config.targetLanguage,
    config.excludedApps,
    config.autoHideDelay,
  ]);

  // Listen for selection events from Tauri
  useEffect(() => {
    if (typeof window === 'undefined' || !isTauri()) {
      return;
    }

    let unlistenShow: (() => void) | undefined;
    let unlistenHide: (() => void) | undefined;

    const setupListeners = async () => {
      const { listen } = await import('@tauri-apps/api/event');

      unlistenShow = await listen<SelectionPayload>('selection-toolbar-show', (event) => {
        // Check if we're in cooldown period after a recent hide
        // This prevents the "flash" issue where toolbar hides then immediately re-shows
        const timeSinceHide = Date.now() - lastHideTimeRef.current;
        if (timeSinceHide < HIDE_COOLDOWN_MS) {
          log.debug(
            `SelectionToolbar: Ignoring show event during cooldown (${timeSinceHide}ms since hide)`
          );
          return;
        }

        setState((prev) => ({
          ...prev,
          isVisible: true,
          selectedText: event.payload.text,
          position: { x: event.payload.x, y: event.payload.y },
          result: null,
          streamingResult: null,
          error: null,
          activeAction: null,
          isLoading: false,
          isStreaming: false,
          textType: event.payload.textType || null,
        }));
      });

      unlistenHide = await listen('selection-toolbar-hide', () => {
        setState(initialState);
      });
    };

    setupListeners();

    return () => {
      unlistenShow?.();
      unlistenHide?.();
    };
  }, []);

  // Execute an action on the selected text using the shared AI infrastructure
  const executeAction = useCallback(
    async (action: SelectionAction) => {
      if (!state.selectedText) return;

      // Cancel any ongoing request
      stop();

      const promptFn = ACTION_PROMPTS[action];
      if (!promptFn) {
        setState((prev) => ({
          ...prev,
          error: `Unknown action: ${action}`,
        }));
        return;
      }

      const prompt = promptFn(state.selectedText, config.targetLanguage);
      if (!prompt) {
        setState((prev) => ({
          ...prev,
          error: `No prompt for action: ${action}`,
        }));
        return;
      }

      setState((prev) => ({
        ...prev,
        isLoading: true,
        isStreaming: config.enableStreaming,
        activeAction: action,
        result: null,
        streamingResult: config.enableStreaming ? '' : null,
        error: null,
      }));

      try {
        // Use the shared AI chat infrastructure
        const result = await sendMessage(
          {
            messages: [{ role: 'user', content: prompt }],
            systemPrompt: SELECTION_SYSTEM_PROMPT,
            temperature: 0.7,
            maxTokens: 2000,
          },
          config.enableStreaming
            ? (chunk) => {
                setState((prev) => ({
                  ...prev,
                  streamingResult: (prev.streamingResult || '') + chunk,
                }));
              }
            : undefined
        );

        // Add to history
        if (result) {
          store.addToHistory({
            text: state.selectedText,
            action,
            result,
            sourceApp: store.sourceApp || undefined,
            textType: state.textType || undefined,
          });
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          return;
        }

        setState((prev) => ({
          ...prev,
          isLoading: false,
          isStreaming: false,
          error: error instanceof Error ? error.message : 'An error occurred',
        }));
      }
    },
    [
      state.selectedText,
      state.textType,
      config.targetLanguage,
      config.enableStreaming,
      store,
      sendMessage,
      stop,
    ]
  );

  // Retry the last action
  const retryAction = useCallback(() => {
    if (state.activeAction) {
      executeAction(state.activeAction);
    }
  }, [state.activeAction, executeAction]);

  // Copy result to clipboard
  const copyResult = useCallback(async () => {
    const textToCopy = state.result || state.streamingResult;
    if (textToCopy) {
      await navigator.clipboard.writeText(textToCopy);
    }
  }, [state.result, state.streamingResult]);

  // Clear result
  const clearResult = useCallback(() => {
    // Cancel any ongoing request
    stop();

    setState((prev) => ({
      ...prev,
      result: null,
      streamingResult: null,
      error: null,
      activeAction: null,
      isLoading: false,
      isStreaming: false,
    }));
  }, [stop]);

  // Hide toolbar
  const hideToolbar = useCallback(async () => {
    // Cancel any ongoing request
    stop();

    // Record hide time to enable cooldown (prevents flash on immediate re-show)
    lastHideTimeRef.current = Date.now();

    setState(initialState);

    if (isTauri()) {
      const { invoke } = await import('@tauri-apps/api/core');
      try {
        await invoke('selection_hide_toolbar');
      } catch (e) {
        log.error('Failed to hide toolbar', e as Error);
      }
    }
  }, [stop]);

  // Show toolbar manually
  const showToolbar = useCallback(
    async (text: string, x: number, y: number, options?: { textType?: TextType }) => {
      setState((prev) => ({
        ...prev,
        isVisible: true,
        selectedText: text,
        position: { x, y },
        result: null,
        streamingResult: null,
        error: null,
        activeAction: null,
        isLoading: false,
        isStreaming: false,
        textType: options?.textType || null,
      }));

      if (isTauri()) {
        const { invoke } = await import('@tauri-apps/api/core');
        try {
          await invoke('selection_show_toolbar', { x, y, text });
        } catch (e) {
          log.error('Failed to show toolbar', e as Error);
        }
      }
    },
    []
  );

  // Set selection mode
  const setSelectionMode = useCallback(
    (mode: SelectionMode) => {
      setState((prev) => ({
        ...prev,
        selectionMode: mode,
      }));
      store.setSelectionMode(mode);
    },
    [store]
  );

  // Provide feedback
  const provideFeedback = useCallback(
    (positive: boolean) => {
      if (state.activeAction) {
        store.setFeedback(`${state.activeAction}-${Date.now()}`, positive);
      }
    },
    [state.activeAction, store]
  );

  // Send result to chat
  const sendResultToChat = useCallback(async () => {
    const textToSend = state.result || state.streamingResult;
    if (!textToSend) return;

    if (isTauri()) {
      const { emit } = await import('@tauri-apps/api/event');
      await emit('selection-send-to-chat', {
        text: state.selectedText,
        result: textToSend,
        action: state.activeAction,
      });
    }
    hideToolbar();
  }, [state.result, state.streamingResult, state.selectedText, state.activeAction, hideToolbar]);

  // Detect source language of selected text
  const detectSourceLanguage = useCallback(
    async (text: string) => {
      if (!text || text.length < 3) return null;

      try {
        const apiKey = providerSettings[provider]?.apiKey || '';
        const modelName = model;

        const result = await detectLanguage(text, {
          provider,
          model: modelName,
          apiKey,
        });

        return result?.code || null;
      } catch (error) {
        log.error('Failed to detect language', error as Error);
        return null;
      }
    },
    [provider, model, providerSettings]
  );

  // Update target language in config
  const updateTargetLanguage = useCallback(
    (lang: string) => {
      store.updateConfig({ targetLanguage: lang });
    },
    [store]
  );

  return {
    state,
    config,
    executeAction,
    retryAction,
    copyResult,
    clearResult,
    hideToolbar,
    showToolbar,
    setSelectionMode,
    provideFeedback,
    sendResultToChat,
    stop, // Expose stop for external cancellation
    // Translation-specific
    detectSourceLanguage,
    updateTargetLanguage,
  };
}
