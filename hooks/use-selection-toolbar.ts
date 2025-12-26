"use client";

import { useState, useCallback, useEffect } from "react";
import { SelectionAction, ToolbarState, SelectionPayload } from "@/components/selection-toolbar/types";

const initialState: ToolbarState = {
  isVisible: false,
  selectedText: "",
  position: { x: 0, y: 0 },
  isLoading: false,
  activeAction: null,
  result: null,
  error: null,
};

export function useSelectionToolbar() {
  const [state, setState] = useState<ToolbarState>(initialState);

  // Listen for selection events from Tauri
  useEffect(() => {
    if (typeof window === "undefined" || !window.__TAURI__) {
      return;
    }

    let unlisten: (() => void) | undefined;

    const setupListener = async () => {
      const { listen } = await import("@tauri-apps/api/event");
      
      unlisten = await listen<SelectionPayload>("selection-toolbar-show", (event) => {
        setState((prev) => ({
          ...prev,
          isVisible: true,
          selectedText: event.payload.text,
          position: { x: event.payload.x, y: event.payload.y },
          result: null,
          error: null,
          activeAction: null,
        }));
      });
    };

    setupListener();

    return () => {
      unlisten?.();
    };
  }, []);

  // Execute an action on the selected text
  const executeAction = useCallback(
    async (action: SelectionAction) => {
      if (!state.selectedText) return;

      setState((prev) => ({
        ...prev,
        isLoading: true,
        activeAction: action,
        result: null,
        error: null,
      }));

      try {
        let result: string;

        switch (action) {
          case "explain":
            result = await explainText(state.selectedText);
            break;
          case "translate":
            result = await translateText(state.selectedText);
            break;
          case "extract":
            result = await extractKeyPoints(state.selectedText);
            break;
          case "summarize":
            result = await summarizeText(state.selectedText);
            break;
          default:
            throw new Error(`Unknown action: ${action}`);
        }

        setState((prev) => ({
          ...prev,
          isLoading: false,
          result,
        }));
      } catch (error) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : "An error occurred",
        }));
      }
    },
    [state.selectedText]
  );

  // Copy result to clipboard
  const copyResult = useCallback(async () => {
    if (state.result) {
      await navigator.clipboard.writeText(state.result);
    }
  }, [state.result]);

  // Clear result
  const clearResult = useCallback(() => {
    setState((prev) => ({
      ...prev,
      result: null,
      error: null,
      activeAction: null,
    }));
  }, []);

  // Hide toolbar
  const hideToolbar = useCallback(async () => {
    setState(initialState);

    if (typeof window !== "undefined" && window.__TAURI__) {
      const { invoke } = await import("@tauri-apps/api/core");
      try {
        await invoke("selection_hide_toolbar");
      } catch (e) {
        console.error("Failed to hide toolbar:", e);
      }
    }
  }, []);

  // Show toolbar manually
  const showToolbar = useCallback(
    async (text: string, x: number, y: number) => {
      setState((prev) => ({
        ...prev,
        isVisible: true,
        selectedText: text,
        position: { x, y },
        result: null,
        error: null,
        activeAction: null,
      }));

      if (typeof window !== "undefined" && window.__TAURI__) {
        const { invoke } = await import("@tauri-apps/api/core");
        try {
          await invoke("selection_show_toolbar", { x, y, text });
        } catch (e) {
          console.error("Failed to show toolbar:", e);
        }
      }
    },
    []
  );

  return {
    state,
    executeAction,
    copyResult,
    clearResult,
    hideToolbar,
    showToolbar,
  };
}

// AI action implementations
async function explainText(text: string): Promise<string> {
  // Use the AI provider to explain the text
  const response = await callAI(
    `Please explain the following text in a clear and concise way:\n\n"${text}"`
  );
  return response;
}

async function translateText(text: string): Promise<string> {
  // Detect language and translate
  const response = await callAI(
    `Translate the following text to Chinese (Simplified). Only provide the translation, no explanations:\n\n"${text}"`
  );
  return response;
}

async function extractKeyPoints(text: string): Promise<string> {
  const response = await callAI(
    `Extract the key points from the following text as a bullet list:\n\n"${text}"`
  );
  return response;
}

async function summarizeText(text: string): Promise<string> {
  const response = await callAI(
    `Summarize the following text in 1-2 sentences:\n\n"${text}"`
  );
  return response;
}

async function callAI(prompt: string): Promise<string> {
  // This is a placeholder - in production, this would use the actual AI provider
  // For now, we'll use a simple fetch to a local endpoint or return a mock response
  
  if (typeof window !== "undefined" && window.__TAURI__) {
    // In Tauri, we can use the existing AI infrastructure
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      // Try to use the existing chat infrastructure
      // This would need to be connected to the actual AI provider
      const result = await invoke<string>("selection_ai_process", { prompt });
      return result;
    } catch {
      // Fallback to a simple response for now
      return `[AI Response for: "${prompt.slice(0, 50)}..."]`;
    }
  }

  // Browser fallback
  return `[AI Response for: "${prompt.slice(0, 50)}..."]`;
}
