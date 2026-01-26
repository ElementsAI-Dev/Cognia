'use client';

/**
 * MonacoSandpackEditor - Monaco editor integrated with Sandpack
 * Provides code editing with live preview synchronization
 * Optimized with preloading and lazy initialization
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDesignerStore } from '@/stores/designer';
import { useSettingsStore } from '@/stores';

interface MonacoSandpackEditorProps {
  className?: string;
  language?: string;
  readOnly?: boolean;
  onSave?: (code: string) => void;
}

const MONACO_CDN_URL = 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs';

export function MonacoSandpackEditor({
  className,
  language = 'typescript',
  readOnly = false,
  onSave,
}: MonacoSandpackEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const monacoEditorRef = useRef<unknown>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const preloadedRef = useRef(false);

  const code = useDesignerStore((state) => state.code);
  const setCode = useDesignerStore((state) => state.setCode);
  const parseCodeToElements = useDesignerStore((state) => state.parseCodeToElements);

  const theme = useSettingsStore((state) => state.theme);

  // Preload Monaco in background
  useEffect(() => {
    if (preloadedRef.current) return;
    preloadedRef.current = true;

    // Add preload hints for Monaco resources
    const preloadLinks = [
      { href: `${MONACO_CDN_URL}/loader.js`, as: 'script' },
      { href: `${MONACO_CDN_URL}/editor/editor.main.js`, as: 'script' },
      { href: `${MONACO_CDN_URL}/editor/editor.main.css`, as: 'style' },
    ];

    preloadLinks.forEach(({ href, as }) => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = href;
      link.as = as;
      if (as === 'style') {
        link.crossOrigin = 'anonymous';
      }
      document.head.appendChild(link);
    });
  }, []);

  // Initialize Monaco editor with progress tracking
  const initMonaco = useCallback(async () => {
    try {
      setLoadingProgress(10);
      
      // Dynamically import Monaco
      // @ts-expect-error - monaco-editor types handled by stub in browser builds
      const monaco = await import('monaco-editor');
      
      setLoadingProgress(50);
      
      if (!editorRef.current) return;

      // Create editor with optimized settings
      const editor = monaco.editor.create(editorRef.current, {
        value: code,
        language: language === 'typescript' ? 'typescript' : 'html',
        theme: theme === 'dark' ? 'vs-dark' : 'vs',
        minimap: { enabled: false },
        fontSize: 13,
        lineNumbers: 'on',
        wordWrap: 'on',
        automaticLayout: true,
        scrollBeyondLastLine: false,
        readOnly,
        tabSize: 2,
        insertSpaces: true,
        formatOnPaste: true,
        formatOnType: true,
        renderWhitespace: 'none',
        folding: true,
        foldingStrategy: 'indentation',
        smoothScrolling: true,
        cursorBlinking: 'smooth',
        cursorSmoothCaretAnimation: 'on',
      });

      setLoadingProgress(80);

      monacoEditorRef.current = editor;

      // Listen for changes
      editor.onDidChangeModelContent(() => {
        const newCode = editor.getValue();
        setCode(newCode, false);
      });

      // Save shortcut
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
        const currentCode = editor.getValue();
        parseCodeToElements(currentCode);
        onSave?.(currentCode);
      });

      setLoadingProgress(100);
      setIsLoading(false);
    } catch (err) {
      console.error('Failed to load Monaco editor:', err);
      setError('Failed to load code editor');
      setIsLoading(false);
    }
  }, [code, language, theme, readOnly, setCode, parseCodeToElements, onSave]);

  // Initialize Monaco editor
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      if (!mounted) return;
      await initMonaco();
    };

    init();

    return () => {
      mounted = false;
      if (monacoEditorRef.current) {
        (monacoEditorRef.current as { dispose: () => void }).dispose();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update editor value when code changes externally
  useEffect(() => {
    if (monacoEditorRef.current) {
      const editor = monacoEditorRef.current as { getValue: () => string; setValue: (v: string) => void };
      if (editor.getValue() !== code) {
        editor.setValue(code);
      }
    }
  }, [code]);

  // Update theme
  useEffect(() => {
    if (monacoEditorRef.current) {
      // @ts-expect-error - monaco-editor types handled by stub in browser builds
      import('monaco-editor').then((monaco) => {
        monaco.editor.setTheme(theme === 'dark' ? 'vs-dark' : 'vs');
      });
    }
  }, [theme]);

  if (error) {
    return (
      <div className={cn('flex items-center justify-center h-full bg-muted/30', className)}>
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className={cn('relative h-full', className)}>
      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background z-10 gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          {loadingProgress > 0 && (
            <div className="w-32 h-1 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${loadingProgress}%` }}
              />
            </div>
          )}
        </div>
      )}
      <div ref={editorRef} className="h-full w-full" />
    </div>
  );
}

export default MonacoSandpackEditor;
