"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export interface ClipboardContent {
  text: string;
  timestamp: number;
  type: "text" | "html" | "image" | "unknown";
  preview?: string;
  analysis?: ClipboardAnalysis;
}

export interface ClipboardAnalysis {
  category: string;
  isCode: boolean;
  isUrl: boolean;
  isEmail: boolean;
  language?: string;
  wordCount: number;
  charCount: number;
  suggestedActions: string[];
}

export interface UseClipboardMonitorOptions {
  enabled?: boolean;
  pollInterval?: number;
  maxHistorySize?: number;
  onClipboardChange?: (content: ClipboardContent) => void;
}

export function useClipboardMonitor(options: UseClipboardMonitorOptions = {}) {
  const {
    enabled = true,
    pollInterval = 1000,
    maxHistorySize = 50,
    onClipboardChange,
  } = options;

  const [isMonitoring, setIsMonitoring] = useState(false);
  const [currentContent, setCurrentContent] = useState<ClipboardContent | null>(null);
  const [history, setHistory] = useState<ClipboardContent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const lastContentRef = useRef<string>("");
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Analyze clipboard content
  const analyzeContent = useCallback((text: string): ClipboardAnalysis => {
    const isUrl = /^https?:\/\/[^\s]+$/.test(text) || text.startsWith("www.");
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text);
    
    // Code detection heuristics
    const codeIndicators = [
      /^(import|export|const|let|var|function|class|interface|type)\s/m,
      /^(def|async|await|return|if|for|while)\s/m,
      /[{}\[\]();]/,
      /=>/,
      /::/,
      /^\s*(\/\/|#|\/\*)/m,
    ];
    const isCode = codeIndicators.some((regex) => regex.test(text));

    // Detect programming language
    let language: string | undefined;
    if (isCode) {
      if (/^(import|export|const|let|var|function|class)\s/m.test(text) || /=>/m.test(text)) {
        language = text.includes("interface ") || text.includes(": ") ? "typescript" : "javascript";
      } else if (/^(def |async def |class |import )/m.test(text)) {
        language = "python";
      } else if (/^(fn |pub fn |struct |impl |use )/m.test(text)) {
        language = "rust";
      } else if (/^(func |package |import )/m.test(text)) {
        language = "go";
      }
    }

    // Determine category
    let category = "text";
    if (isUrl) category = "url";
    else if (isEmail) category = "email";
    else if (isCode) category = "code";
    else if (text.length < 50 && !text.includes("\n")) category = "short-text";
    else if (text.split("\n").length > 5) category = "long-text";

    // Suggested actions based on content
    const suggestedActions: string[] = [];
    if (isUrl) {
      suggestedActions.push("open", "summarize-page", "extract-content");
    } else if (isEmail) {
      suggestedActions.push("compose", "search-contact");
    } else if (isCode) {
      suggestedActions.push("explain-code", "optimize", "convert");
    } else {
      suggestedActions.push("translate", "summarize", "explain");
      if (text.length > 100) {
        suggestedActions.push("extract-key-points");
      }
    }

    return {
      category,
      isCode,
      isUrl,
      isEmail,
      language,
      wordCount: text.split(/\s+/).filter(Boolean).length,
      charCount: text.length,
      suggestedActions,
    };
  }, []);

  // Check clipboard content
  const checkClipboard = useCallback(async () => {
    if (!enabled) return;

    try {
      // Check if we're in Tauri environment
      if (typeof window !== "undefined" && window.__TAURI__) {
        const { invoke } = await import("@tauri-apps/api/core");
        
        try {
          const text = await invoke<string>("clipboard_read_text");
          
          if (text && text !== lastContentRef.current) {
            lastContentRef.current = text;
            
            const analysis = analyzeContent(text);
            const content: ClipboardContent = {
              text,
              timestamp: Date.now(),
              type: "text",
              preview: text.length > 100 ? text.slice(0, 100) + "..." : text,
              analysis,
            };

            setCurrentContent(content);
            setHistory((prev) => {
              const newHistory = [content, ...prev].slice(0, maxHistorySize);
              return newHistory;
            });

            onClipboardChange?.(content);
          }
        } catch {
          // Clipboard might be empty or contain non-text content
        }
      } else {
        // Web fallback using Clipboard API
        try {
          const text = await navigator.clipboard.readText();
          
          if (text && text !== lastContentRef.current) {
            lastContentRef.current = text;
            
            const analysis = analyzeContent(text);
            const content: ClipboardContent = {
              text,
              timestamp: Date.now(),
              type: "text",
              preview: text.length > 100 ? text.slice(0, 100) + "..." : text,
              analysis,
            };

            setCurrentContent(content);
            setHistory((prev) => {
              const newHistory = [content, ...prev].slice(0, maxHistorySize);
              return newHistory;
            });

            onClipboardChange?.(content);
          }
        } catch {
          // Permission denied or clipboard empty
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to read clipboard");
    }
  }, [enabled, maxHistorySize, analyzeContent, onClipboardChange]);

  // Start monitoring
  const startMonitoring = useCallback(() => {
    if (intervalRef.current) return;
    
    setIsMonitoring(true);
    checkClipboard(); // Check immediately
    intervalRef.current = setInterval(checkClipboard, pollInterval);
  }, [checkClipboard, pollInterval]);

  // Stop monitoring
  const stopMonitoring = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsMonitoring(false);
  }, []);

  // Clear history
  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  // Copy to clipboard
  const copyToClipboard = useCallback(async (text: string) => {
    try {
      if (typeof window !== "undefined" && window.__TAURI__) {
        const { invoke } = await import("@tauri-apps/api/core");
        await invoke("clipboard_write_text", { text });
      } else {
        await navigator.clipboard.writeText(text);
      }
      lastContentRef.current = text; // Prevent re-triggering
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to write to clipboard");
    }
  }, []);

  // Auto-start/stop based on enabled prop
  useEffect(() => {
    if (enabled) {
      startMonitoring();
    } else {
      stopMonitoring();
    }

    return () => {
      stopMonitoring();
    };
  }, [enabled, startMonitoring, stopMonitoring]);

  return {
    isMonitoring,
    currentContent,
    history,
    error,
    startMonitoring,
    stopMonitoring,
    clearHistory,
    copyToClipboard,
    checkClipboard,
  };
}
