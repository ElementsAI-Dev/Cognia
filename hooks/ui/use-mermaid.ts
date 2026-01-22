'use client';

/**
 * useMermaid - Hook for Mermaid diagram rendering
 * Provides shared rendering logic with debounce, theme detection, and error handling
 */

import { useState, useCallback, useEffect, useRef } from 'react';

export interface UseMermaidOptions {
  debounceMs?: number;
  autoRender?: boolean;
}

export interface UseMermaidResult {
  svg: string;
  error: string | null;
  isLoading: boolean;
  render: (code: string) => Promise<void>;
  reset: () => void;
}

export function useMermaid(
  initialCode?: string,
  options: UseMermaidOptions = {}
): UseMermaidResult {
  const { debounceMs = 300, autoRender = true } = options;

  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const renderIdRef = useRef(0);

  const render = useCallback(async (code: string) => {
    if (!code.trim()) {
      setSvg('');
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const currentRenderId = ++renderIdRef.current;

    try {
      const mermaid = (await import('mermaid')).default;
      const isDark = document.documentElement.classList.contains('dark');

      mermaid.initialize({
        startOnLoad: false,
        theme: isDark ? 'dark' : 'default',
        securityLevel: 'loose',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        flowchart: {
          useMaxWidth: true,
          htmlLabels: true,
          curve: 'basis',
        },
        sequence: {
          useMaxWidth: true,
          wrap: true,
        },
        gantt: {
          useMaxWidth: true,
        },
      });

      const id = `mermaid-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const { svg: renderedSvg } = await mermaid.render(id, code.trim());

      // Only update if this is the most recent render
      if (currentRenderId === renderIdRef.current) {
        setSvg(renderedSvg);
        setIsLoading(false);
      }
    } catch (err) {
      if (currentRenderId === renderIdRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to render diagram');
        setIsLoading(false);
      }
    }
  }, []);

  const debouncedRender = useCallback(
    (code: string): Promise<void> => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      setIsLoading(true);

      return new Promise((resolve) => {
        debounceTimerRef.current = setTimeout(() => {
          render(code).then(resolve);
        }, debounceMs);
      });
    },
    [render, debounceMs]
  );

  const reset = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    setSvg('');
    setError(null);
    setIsLoading(false);
    renderIdRef.current++;
  }, []);

  // Auto-render initial code
  useEffect(() => {
    if (autoRender && initialCode) {
      render(initialCode);
    }
  }, [autoRender, initialCode, render]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    svg,
    error,
    isLoading,
    render: debouncedRender,
    reset,
  };
}

export default useMermaid;
