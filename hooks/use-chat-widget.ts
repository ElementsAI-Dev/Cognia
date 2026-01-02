/**
 * Chat Widget Hook - manages the floating AI chat assistant
 */

import { useCallback, useEffect, useRef } from 'react';
import { useChatWidgetStore } from '@/stores/chat';

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

  // Listen for Tauri events
  useEffect(() => {
    if (typeof window === 'undefined' || !window.__TAURI__) {
      return;
    }

    let unlistenShow: (() => void) | undefined;
    let unlistenHide: (() => void) | undefined;
    let unlistenSendText: (() => void) | undefined;
    let unlistenFocusInput: (() => void) | undefined;

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

      // Listen for selection toolbar "send to chat" action
      const unlistenSelectionSend = await listen<{ text: string; references?: unknown[] }>(
        'selection-send-to-chat',
        async (event) => {
          const { text } = event.payload;
          if (text) {
            // Show widget and set input
            show();
            setInputValue(text);
            setTimeout(() => {
              inputRef.current?.focus();
            }, 100);
          }
        }
      );

      // Store for cleanup
      (window as unknown as { __chatWidgetUnlistenSelection?: () => void }).__chatWidgetUnlistenSelection = unlistenSelectionSend;
    };

    setupListeners();

    return () => {
      unlistenShow?.();
      unlistenHide?.();
      unlistenSendText?.();
      unlistenFocusInput?.();
      // Cleanup selection listener
      const win = window as unknown as { __chatWidgetUnlistenSelection?: () => void };
      win.__chatWidgetUnlistenSelection?.();
    };
  }, [setVisible, setInputValue, options, show]);

  // Send message to AI
  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return;

      // Add user message
      addMessage({ role: 'user', content: text });
      setLoading(true);
      clearInput();

      // Create abort controller for this request
      abortControllerRef.current = new AbortController();

      try {
        // Build messages array for API
        const apiMessages = [
          { role: 'system' as const, content: config.systemPrompt },
          ...messages.map(m => ({ role: m.role, content: m.content })),
          { role: 'user' as const, content: text },
        ];

        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: apiMessages,
            provider: config.provider,
            model: config.model,
          }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        // Handle streaming response
        const reader = response.body?.getReader();
        if (!reader) throw new Error('No response body');

        const assistantMessageId = addMessage({ role: 'assistant', content: '' });
        const decoder = new TextDecoder();
        let fullContent = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          fullContent += chunk;

          // Update the assistant message with accumulated content
          useChatWidgetStore.getState().updateMessage(assistantMessageId, {
            content: fullContent,
          });
        }

        recordActivity();
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          // Request was cancelled
          return;
        }
        setError(err instanceof Error ? err.message : 'Failed to send message');
      } finally {
        setLoading(false);
        abortControllerRef.current = null;
      }
    },
    [isLoading, messages, config, addMessage, setLoading, clearInput, setError, recordActivity]
  );

  // Handle submit
  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      await sendMessage(inputValue);
    },
    [inputValue, sendMessage]
  );

  // Handle key down
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
      if (e.key === 'Escape') {
        hide();
      }
    },
    [handleSubmit, hide]
  );

  // Stop generation
  const stop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setLoading(false);
    }
  }, [setLoading]);

  // Tauri commands
  const tauriShow = useCallback(async () => {
    if (typeof window === 'undefined' || !window.__TAURI__) {
      show();
      return;
    }
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('chat_widget_show');
  }, [show]);

  const tauriHide = useCallback(async () => {
    if (typeof window === 'undefined' || !window.__TAURI__) {
      hide();
      return;
    }
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('chat_widget_hide');
  }, [hide]);

  const tauriToggle = useCallback(async () => {
    if (typeof window === 'undefined' || !window.__TAURI__) {
      toggle();
      return;
    }
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('chat_widget_toggle');
  }, [toggle]);

  const setPinned = useCallback(async (pinned: boolean) => {
    updateConfig({ pinned });
    if (typeof window === 'undefined' || !window.__TAURI__) {
      return;
    }
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('chat_widget_set_pinned', { pinned });
  }, [updateConfig]);

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
  };
}

export type UseChatWidgetReturn = ReturnType<typeof useChatWidget>;
