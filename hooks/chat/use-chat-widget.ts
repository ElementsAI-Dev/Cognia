/**
 * Chat Widget Hook - manages the floating AI chat assistant
 */

import { useCallback, useEffect, useRef } from 'react';
import { streamText, type CoreMessage } from 'ai';
import { useChatWidgetStore } from '@/stores/chat';
import { useSettingsStore } from '@/stores';
import { isTauri } from '@/lib/native/utils';
import { getProxyProviderModel } from '@/lib/ai/core/proxy-client';
import type { ProviderName } from '@/types';

interface UseChatWidgetOptions {
  onShow?: () => void;
  onHide?: () => void;
  onMessage?: (message: string) => void;
}

export function useChatWidget(options: UseChatWidgetOptions = {}) {
  const {
    isVisible,
    isLoading,
    isStreaming,
    error,
    messages,
    inputValue,
    config,
    sessionId,
    show,
    hide,
    toggle,
    setVisible,
    addMessage,
    clearMessages,
    setInputValue,
    clearInput,
    setLoading,
    setError,
    updateConfig,
    newSession,
    recordActivity,
  } = useChatWidgetStore();

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const deleteMessage = useChatWidgetStore((state) => state.deleteMessage);
  const deleteMessagesAfter = useChatWidgetStore((state) => state.deleteMessagesAfter);
  const sendQuickMessage = useChatWidgetStore((state) => state.sendQuickMessage);
  const providerSettings = useSettingsStore((state) => state.providerSettings);

  // History navigation state
  const historyIndexRef = useRef<number>(-1);
  const tempInputRef = useRef<string>('');

  // Listen for Tauri events
  useEffect(() => {
    if (typeof window === 'undefined' || !isTauri()) {
      return;
    }

    let unlistenShow: (() => void) | undefined;
    let unlistenHide: (() => void) | undefined;
    let unlistenSendText: (() => void) | undefined;
    let unlistenFocusInput: (() => void) | undefined;
    let unlistenConfigChanged: (() => void) | undefined;

    const setupListeners = async () => {
      const { listen } = await import('@tauri-apps/api/event');

      unlistenShow = await listen('chat-widget-shown', () => {
        setVisible(true);
        options.onShow?.();
        setTimeout(() => {
          inputRef.current?.focus();
        }, 100);
      });

      unlistenHide = await listen('chat-widget-hidden', () => {
        setVisible(false);
        options.onHide?.();
      });

      unlistenSendText = await listen<{ text: string }>('chat-widget-send-text', (event) => {
        setInputValue(event.payload.text);
        options.onMessage?.(event.payload.text);
        setTimeout(() => {
          inputRef.current?.focus();
        }, 100);
      });

      unlistenFocusInput = await listen('chat-widget-focus-input', () => {
        inputRef.current?.focus();
      });

      // Persist window size/position updates coming from Rust
      unlistenConfigChanged = await listen<{
        width: number;
        height: number;
        x: number | null;
        y: number | null;
        rememberPosition: boolean;
        startMinimized: boolean;
        opacity: number;
        shortcut: string;
        pinned: boolean;
        backgroundColor: string;
      }>('chat-widget-config-changed', (event) => {
        updateConfig({
          width: event.payload.width,
          height: event.payload.height,
          x: event.payload.x,
          y: event.payload.y,
          rememberPosition: event.payload.rememberPosition,
          startMinimized: event.payload.startMinimized,
          opacity: event.payload.opacity,
          shortcut: event.payload.shortcut,
          pinned: event.payload.pinned,
          backgroundColor: event.payload.backgroundColor,
        });
      });

      // Listen for selection toolbar "send to chat" action
      const unlistenSelectionSend = await listen<{ text: string; references?: unknown[] }>(
        'selection-send-to-chat',
        async (event) => {
          const { text } = event.payload;
          if (text) {
            // Show Tauri widget window and set input
            const { invoke } = await import('@tauri-apps/api/core');
            await invoke('chat_widget_show');
            setInputValue(text);
            setTimeout(() => {
              inputRef.current?.focus();
            }, 100);
          }
        }
      );

      // Listen for bubble "new session" action
      const unlistenBubbleNewSession = await listen('bubble-new-session', () => {
        newSession();
      });

      // Listen for bubble "open settings" action
      const unlistenBubbleOpenSettings = await listen('bubble-open-settings', async () => {
        // Emit event to open settings panel in the chat widget
        const { emit: emitLocal } = await import('@tauri-apps/api/event');
        await emitLocal('chat-widget-open-settings', {});
      });

      // Store for cleanup
      const cleanupFns = {
        selection: unlistenSelectionSend,
        bubbleNewSession: unlistenBubbleNewSession,
        bubbleOpenSettings: unlistenBubbleOpenSettings,
      };
      (window as unknown as { __chatWidgetCleanup?: typeof cleanupFns }).__chatWidgetCleanup =
        cleanupFns;
    };

    setupListeners();

    return () => {
      unlistenShow?.();
      unlistenHide?.();
      unlistenSendText?.();
      unlistenFocusInput?.();
      unlistenConfigChanged?.();
      // Cleanup all bubble and selection listeners
      const win = window as unknown as {
        __chatWidgetCleanup?: {
          selection: () => void;
          bubbleNewSession: () => void;
          bubbleOpenSettings: () => void;
        };
      };
      win.__chatWidgetCleanup?.selection?.();
      win.__chatWidgetCleanup?.bubbleNewSession?.();
      win.__chatWidgetCleanup?.bubbleOpenSettings?.();
    };
  }, [setVisible, setInputValue, updateConfig, options, newSession]);

  // In the dedicated chat-widget window, persist size/position changes so they survive app restart.
  useEffect(() => {
    if (typeof window === 'undefined' || !isTauri()) return;
    if (window.location?.pathname !== '/chat-widget') return;

    let unlistenResize: (() => void) | undefined;
    let unlistenMove: (() => void) | undefined;
    let unlistenScale: (() => void) | undefined;

    const setup = async () => {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      const appWindow = getCurrentWindow();

      const syncSize = async () => {
        const [size, scale] = await Promise.all([appWindow.innerSize(), appWindow.scaleFactor()]);
        updateConfig({
          width: size.width / scale,
          height: size.height / scale,
        });
      };

      unlistenResize = await appWindow.onResized(syncSize);
      unlistenMove = await appWindow.onMoved((event) => {
        updateConfig({
          x: event.payload.x,
          y: event.payload.y,
        });
      });
      unlistenScale = await appWindow.onScaleChanged(syncSize);

      // Initial sync
      await syncSize();
      const pos = await appWindow.outerPosition();
      updateConfig({ x: pos.x, y: pos.y });
    };

    setup();

    return () => {
      unlistenResize?.();
      unlistenMove?.();
      unlistenScale?.();
    };
  }, [updateConfig]);

  // Emit loading state to bubble
  const emitLoadingState = useCallback(async (loading: boolean) => {
    if (typeof window === 'undefined' || !isTauri()) return;
    try {
      const { emit } = await import('@tauri-apps/api/event');
      await emit('bubble-loading-state', loading);
    } catch {
      // ignore
    }
  }, []);

  // Emit unread count to bubble (when chat is hidden)
  const emitUnreadCount = useCallback(async (count: number) => {
    if (typeof window === 'undefined' || !isTauri()) return;
    try {
      const { emit } = await import('@tauri-apps/api/event');
      await emit('bubble-unread-count', count);
    } catch {
      // ignore
    }
  }, []);

  // Send message to AI
  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return;

      // Add user message
      addMessage({ role: 'user', content: text });
      setLoading(true);
      emitLoadingState(true);
      clearInput();

      // Create abort controller for this request
      abortControllerRef.current = new AbortController();

      try {
        // Get API key from settings store
        const provider = config.provider as ProviderName;
        const settings = providerSettings[provider];
        const apiKey = settings?.apiKey || '';
        const baseURL = settings?.baseURL;

        if (!apiKey && provider !== 'ollama') {
          throw new Error(`API key not configured for ${provider}. Please add your API key in Settings.`);
        }

        // Build messages array
        const apiMessages: CoreMessage[] = [
          { role: 'system' as const, content: config.systemPrompt },
          ...messages.map((m) => ({ role: m.role as 'user' | 'assistant' | 'system', content: m.content })),
          { role: 'user' as const, content: text },
        ];

        // Get the AI model via proxy-aware client (works in static export)
        const aiModel = getProxyProviderModel(provider, config.model, apiKey, baseURL);

        const assistantMessageId = addMessage({
          role: 'assistant',
          content: '',
          isStreaming: true,
        });
        let fullContent = '';

        try {
          // Stream directly using Vercel AI SDK (no API route needed)
          const result = streamText({
            model: aiModel,
            messages: apiMessages,
            abortSignal: abortControllerRef.current.signal,
          });

          for await (const chunk of result.textStream) {
            fullContent += chunk;
            useChatWidgetStore.getState().updateMessage(assistantMessageId, {
              content: fullContent,
              isStreaming: true,
            });
          }
        } finally {
          // Mark streaming as complete
          useChatWidgetStore.getState().updateMessage(assistantMessageId, {
            isStreaming: false,
          });
        }

        recordActivity();

        // If chat widget is not visible, increment unread count and play notification sound
        if (!useChatWidgetStore.getState().isVisible) {
          emitUnreadCount(1);
          // Play notification sound for new message when widget is hidden
          import('@/lib/native/sound')
            .then(({ playNotificationSound }) => {
              playNotificationSound();
            })
            .catch(() => {
              // Ignore sound errors
            });
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          // Request was cancelled
          emitLoadingState(false);
          return;
        }
        setError(err instanceof Error ? err.message : 'Failed to send message');
      } finally {
        setLoading(false);
        emitLoadingState(false);
        abortControllerRef.current = null;
      }
    },
    [
      isLoading,
      messages,
      config,
      providerSettings,
      addMessage,
      setLoading,
      clearInput,
      setError,
      recordActivity,
      emitLoadingState,
      emitUnreadCount,
    ]
  );

  // Handle submit
  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      await sendMessage(inputValue);
    },
    [inputValue, sendMessage]
  );

  // Get user messages for history navigation
  const userMessages = messages.filter((m) => m.role === 'user');

  // Handle key down with history navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        historyIndexRef.current = -1;
        tempInputRef.current = '';
        handleSubmit();
        return;
      }

      if (e.key === 'Escape') {
        hide();
        return;
      }

      // History navigation with up/down arrows
      if (e.key === 'ArrowUp' && userMessages.length > 0) {
        const textarea = e.target as HTMLTextAreaElement;
        const cursorAtStart = textarea.selectionStart === 0 && textarea.selectionEnd === 0;

        if (cursorAtStart || !inputValue) {
          e.preventDefault();

          // Save current input if starting navigation
          if (historyIndexRef.current === -1) {
            tempInputRef.current = inputValue;
          }

          // Navigate to previous message
          const newIndex = Math.min(historyIndexRef.current + 1, userMessages.length - 1);
          if (newIndex !== historyIndexRef.current) {
            historyIndexRef.current = newIndex;
            const historyMessage = userMessages[userMessages.length - 1 - newIndex];
            setInputValue(historyMessage.content);
          }
        }
      }

      if (e.key === 'ArrowDown' && historyIndexRef.current >= 0) {
        const textarea = e.target as HTMLTextAreaElement;
        const cursorAtEnd = textarea.selectionStart === inputValue.length;

        if (cursorAtEnd) {
          e.preventDefault();

          const newIndex = historyIndexRef.current - 1;
          if (newIndex >= 0) {
            historyIndexRef.current = newIndex;
            const historyMessage = userMessages[userMessages.length - 1 - newIndex];
            setInputValue(historyMessage.content);
          } else {
            // Return to original input
            historyIndexRef.current = -1;
            setInputValue(tempInputRef.current);
            tempInputRef.current = '';
          }
        }
      }
    },
    [handleSubmit, hide, inputValue, setInputValue, userMessages]
  );

  // Stop generation
  const stop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setLoading(false);
    }
  }, [setLoading]);

  // Regenerate last assistant response
  const regenerate = useCallback(
    async (messageId: string) => {
      // Find the message to regenerate and the previous user message
      const messageIndex = messages.findIndex((m) => m.id === messageId);
      if (messageIndex === -1) return;

      // Find the previous user message
      let userMessageIndex = messageIndex - 1;
      while (userMessageIndex >= 0 && messages[userMessageIndex].role !== 'user') {
        userMessageIndex--;
      }

      if (userMessageIndex < 0) return;

      const userMessage = messages[userMessageIndex];

      // Delete the assistant message
      deleteMessage(messageId);

      // Resend the user message
      await sendMessage(userMessage.content);
    },
    [messages, deleteMessage, sendMessage]
  );

  // Tauri commands
  const tauriShow = useCallback(async () => {
    if (typeof window === 'undefined' || !isTauri()) {
      show();
      return;
    }
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('chat_widget_show');
  }, [show]);

  const tauriHide = useCallback(async () => {
    if (typeof window === 'undefined' || !isTauri()) {
      hide();
      return;
    }
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('chat_widget_hide');
  }, [hide]);

  const tauriToggle = useCallback(async () => {
    if (typeof window === 'undefined' || !isTauri()) {
      toggle();
      return;
    }
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('chat_widget_toggle');
  }, [toggle]);

  const setPinned = useCallback(
    async (pinned: boolean) => {
      updateConfig({ pinned });
      if (typeof window === 'undefined' || !isTauri()) {
        return;
      }
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('chat_widget_set_pinned', { pinned });
    },
    [updateConfig]
  );

  // Open main window (expand to full chat)
  const openMainWindow = useCallback(async (hideWidget = true) => {
    if (typeof window === 'undefined' || !isTauri()) {
      return;
    }
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('chat_widget_open_main', { hideWidget });
    } catch (err) {
      console.error('[ChatWidget] Failed to open main window:', err);
    }
  }, []);

  return {
    // State
    isVisible,
    isLoading,
    isStreaming,
    error,
    messages,
    inputValue,
    config,
    sessionId,
    inputRef,

    // Actions
    show: tauriShow,
    hide: tauriHide,
    toggle: tauriToggle,
    setInputValue,
    handleSubmit,
    handleKeyDown,
    clearMessages,
    newSession,
    updateConfig,
    setPinned,
    stop,
    regenerate,
    openMainWindow,
    deleteMessagesAfter,
    sendQuickMessage,
  };
}

export type UseChatWidgetReturn = ReturnType<typeof useChatWidget>;
