"use client";

/**
 * useSelectionReceiver - Hook for receiving selected text from the selection toolbar
 * and integrating it with the main chat interface.
 */

import { useEffect, useCallback, useState } from "react";
import { isTauri } from "@/lib/native/utils";

export interface UseSelectionReceiverOptions {
  onTextReceived?: (text: string, action?: string) => void;
  onTranslateRequest?: (text: string) => void;
  onExplainRequest?: (text: string) => void;
  autoFocus?: boolean;
}

export interface UseSelectionReceiverReturn {
  pendingText: string | null;
  pendingAction: string | null;
  clearPending: () => void;
  formatPrompt: (text: string, action?: string) => string;
}

export function useSelectionReceiver(
  options: UseSelectionReceiverOptions = {}
): UseSelectionReceiverReturn {
  const { onTextReceived, onTranslateRequest, onExplainRequest, autoFocus = true } = options;
  const [pendingText, setPendingText] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  // Format text based on action
  const formatPrompt = useCallback(
    (text: string, action?: string): string => {
      switch (action) {
        case "translate":
          return `请将以下文本翻译成中文：\n\n"${text}"`;
        case "explain":
          return `请解释以下内容：\n\n"${text}"`;
        default:
          return text;
      }
    },
    []
  );

  // Clear pending text
  const clearPending = useCallback(() => {
    setPendingText(null);
    setPendingAction(null);
  }, []);

  // Handle received text
  const handleTextReceived = useCallback(
    async (text: string, action?: string) => {
      setPendingText(text);
      setPendingAction(action || null);

      // Focus the main window if in Tauri
      if (autoFocus && isTauri()) {
        await focusMainWindow();
      }

      onTextReceived?.(text, action);
    },
    [autoFocus, onTextReceived]
  );

  // Listen for selection events from Tauri
  useEffect(() => {
    if (!isTauri()) return;

    let unlistenSendToChat: (() => void) | undefined;
    let unlistenTranslate: (() => void) | undefined;
    let unlistenExplain: (() => void) | undefined;

    const setupListeners = async () => {
      const { listen } = await import("@tauri-apps/api/event");

      // Listen for "send to chat" events
      unlistenSendToChat = await listen<{ text: string }>(
        "selection-send-to-chat",
        (event) => {
          handleTextReceived(event.payload.text);
        }
      );

      // Listen for quick translate events
      unlistenTranslate = await listen<{ text: string }>(
        "selection-quick-translate",
        (event) => {
          handleTextReceived(event.payload.text, "translate");
          onTranslateRequest?.(event.payload.text);
        }
      );

      // Listen for quick explain events
      unlistenExplain = await listen<{ text: string }>(
        "selection-quick-explain",
        (event) => {
          handleTextReceived(event.payload.text, "explain");
          onExplainRequest?.(event.payload.text);
        }
      );
    };

    setupListeners();

    return () => {
      unlistenSendToChat?.();
      unlistenTranslate?.();
      unlistenExplain?.();
    };
  }, [handleTextReceived, onTranslateRequest, onExplainRequest]);

  return {
    pendingText,
    pendingAction,
    clearPending,
    formatPrompt,
  };
}

// Helper function to focus the main window
async function focusMainWindow() {
  if (!isTauri()) return;

  try {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    const mainWindow = getCurrentWindow();
    await mainWindow.setFocus();
    await mainWindow.unminimize();
  } catch (e) {
    console.error("Failed to focus main window:", e);
  }
}

export default useSelectionReceiver;
