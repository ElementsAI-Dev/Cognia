'use client';

/**
 * MonacoSandpackEditor - Monaco editor that syncs with Sandpack
 * Provides minimap support and file tabs for multi-file editing
 */

import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useSandpack, useActiveCode } from '@codesandbox/sandpack-react';
import Editor, { loader, type OnMount } from '@monaco-editor/react';

// Monaco editor instance type extracted from OnMount callback
type MonacoEditor = Parameters<OnMount>[0];
type _Monaco = Parameters<OnMount>[1];
import { useResizeObserver } from '@/hooks/use-resize-observer';
import { Loader2, X, FileCode, FileJson, FileText, AlertCircle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

// Monaco CDN providers with fallback
const MONACO_CDN_PROVIDERS = [
  {
    name: 'jsdelivr',
    url: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs',
  },
  {
    name: 'cdnjs',
    url: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs',
  },
  {
    name: 'unpkg',
    url: 'https://unpkg.com/monaco-editor@0.45.0/min/vs',
  },
];

// Storage key for caching successful CDN
const MONACO_CDN_CACHE_KEY = 'cognia-monaco-cdn';

// Track which CDN is currently configured
let currentCDNIndex = 0;
let monacoConfigured = false;

/**
 * Get cached CDN index from localStorage
 */
function getCachedCDNIndex(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const cached = localStorage.getItem(MONACO_CDN_CACHE_KEY);
    if (cached) {
      const index = parseInt(cached, 10);
      if (index >= 0 && index < MONACO_CDN_PROVIDERS.length) {
        return index;
      }
    }
  } catch {
    // localStorage might be unavailable
  }
  return 0;
}

/**
 * Cache successful CDN index in localStorage
 */
function cacheCDNIndex(index: number): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(MONACO_CDN_CACHE_KEY, index.toString());
  } catch {
    // localStorage might be unavailable
  }
}

/**
 * Configure Monaco loader with CDN fallback
 * Returns the CDN index that was successfully configured, or -1 if all failed
 */
async function configureMonacoWithFallback(startIndex = 0): Promise<number> {
  if (typeof window === 'undefined') return -1;

  // Try each CDN until one works
  for (let i = startIndex; i < MONACO_CDN_PROVIDERS.length; i++) {
    const provider = MONACO_CDN_PROVIDERS[i];

    try {
      // Test if the CDN is accessible
      const testUrl = `${provider.url}/loader.js`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(testUrl, {
        method: 'HEAD',
        signal: controller.signal,
        mode: 'no-cors', // Allow checking without CORS issues
      });

      clearTimeout(timeoutId);

      // For no-cors, response.ok might be false but type 'opaque' means success
      if (response.ok || response.type === 'opaque') {
        loader.config({
          paths: { vs: provider.url },
        });
        currentCDNIndex = i;
        monacoConfigured = true;
        cacheCDNIndex(i);
        console.log(`[Monaco] Using CDN: ${provider.name}`);
        return i;
      }
    } catch (error) {
      console.warn(`[Monaco] CDN ${provider.name} failed:`, error);
      continue;
    }
  }

  // All CDNs failed
  console.error('[Monaco] All CDNs failed');
  return -1;
}

// Initialize Monaco configuration on client side with cached CDN
if (typeof window !== 'undefined' && !monacoConfigured) {
  const cachedIndex = getCachedCDNIndex();
  currentCDNIndex = cachedIndex;
  configureMonacoWithFallback(cachedIndex);
}

interface MonacoSandpackEditorProps {
  readOnly?: boolean;
}

// Get file icon based on extension
function getFileIcon(filename: string) {
  if (filename.endsWith('.json')) return <FileJson className="h-3.5 w-3.5" />;
  if (filename.endsWith('.css')) return <FileText className="h-3.5 w-3.5" />;
  return <FileCode className="h-3.5 w-3.5" />;
}

// Get display name from path
function getDisplayName(path: string) {
  return path.split('/').pop() || path;
}

export function MonacoSandpackEditor({ readOnly = false }: MonacoSandpackEditorProps) {
  const { sandpack } = useSandpack();
  const { code, updateCode } = useActiveCode();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const editorRef = useRef<MonacoEditor | null>(null);

  // Use ResizeObserver for proper layout sync
  const { ref: containerRef, size: _size } = useResizeObserver<HTMLDivElement>({
    debounceMs: 100,
    onResize: () => {
      // Trigger Monaco layout update when container resizes
      if (editorRef.current) {
        requestAnimationFrame(() => {
          editorRef.current?.layout();
        });
      }
    },
  });

  // Get all visible files for tabs
  const visibleFiles = Object.keys(sandpack.files).filter(
    (file) => !sandpack.files[file].hidden
  );
  const activeFile = sandpack.activeFile;

  // Handle file selection
  const handleFileSelect = useCallback((file: string) => {
    sandpack.setActiveFile(file);
  }, [sandpack]);

  const handleEditorChange = useCallback((value: string | undefined) => {
    if (value !== undefined) {
      updateCode(value);
    }
  }, [updateCode]);

  // Get language from active file
  const language = useMemo(() => {
    if (activeFile.endsWith('.tsx')) return 'typescript';
    if (activeFile.endsWith('.ts')) return 'typescript';
    if (activeFile.endsWith('.jsx')) return 'javascript';
    if (activeFile.endsWith('.js')) return 'javascript';
    if (activeFile.endsWith('.css')) return 'css';
    if (activeFile.endsWith('.html')) return 'html';
    if (activeFile.endsWith('.json')) return 'json';
    if (activeFile.endsWith('.vue')) return 'html';
    return 'javascript';
  }, [activeFile]);

  // Detect theme based on document class
  const [theme, setTheme] = useState<'vs-dark' | 'light'>('vs-dark');
  
  useEffect(() => {
    const checkTheme = () => {
      const isDark = document.documentElement.classList.contains('dark') ||
        window.matchMedia('(prefers-color-scheme: dark)').matches;
      setTheme(isDark ? 'vs-dark' : 'light');
    };
    
    checkTheme();
    
    // Listen for theme changes
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', checkTheme);
    
    return () => {
      observer.disconnect();
      mediaQuery.removeEventListener('change', checkTheme);
    };
  }, []);

  const handleEditorMount: OnMount = useCallback((editor) => {
    editorRef.current = editor;
    setIsLoading(false);
    setError(null);
  }, []);

  // Handle Monaco validation/initialization errors
  const handleEditorValidation = useCallback((markers: unknown[]) => {
    // Just log validation markers, don't treat as fatal error
    if (markers && markers.length > 0) {
      console.debug('Monaco validation markers:', markers.length);
    }
  }, []);

  // Retry loading Monaco with next CDN
  const handleRetry = useCallback(async () => {
    setError(null);
    setIsLoading(true);
    currentCDNIndex++;
    const result = await configureMonacoWithFallback(currentCDNIndex);
    if (result === -1) {
      setError('Failed to load editor from all CDN providers');
    }
  }, []);

  return (
    <div className="h-full w-full flex flex-col">
      {/* File tabs */}
      <div className="shrink-0 border-b bg-muted/30">
        <ScrollArea className="w-full">
          <div className="flex items-center gap-0.5 px-1 py-1">
            {visibleFiles.map((file) => (
              <Button
                key={file}
                variant="ghost"
                size="sm"
                className={cn(
                  'h-7 px-2 gap-1.5 text-xs font-normal rounded-sm',
                  activeFile === file
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
                onClick={() => handleFileSelect(file)}
              >
                {getFileIcon(file)}
                <span className="max-w-[100px] truncate">{getDisplayName(file)}</span>
                {activeFile === file && (
                  <X className="h-3 w-3 opacity-50 hover:opacity-100" />
                )}
              </Button>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>

      {/* Editor */}
      <div ref={containerRef} className="flex-1 min-h-0 relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background z-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background z-10 gap-3">
            <AlertCircle className="h-6 w-6 text-destructive" />
            <p className="text-sm text-muted-foreground text-center max-w-xs">{error}</p>
            <Button variant="outline" size="sm" onClick={handleRetry}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Another CDN
            </Button>
          </div>
        )}
        <Editor
        height="100%"
        language={language}
        theme={theme}
        value={code}
        onChange={handleEditorChange}
        onMount={handleEditorMount}
        onValidate={handleEditorValidation}
        loading={
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        }
        options={{
          minimap: { 
            enabled: true, 
            scale: 1,
            showSlider: 'mouseover',
            renderCharacters: false,
          },
          fontSize: 13,
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          wordWrap: 'on',
          automaticLayout: true,
          tabSize: 2,
          readOnly,
          padding: { top: 8, bottom: 8 },
          scrollbar: {
            vertical: 'auto',
            horizontal: 'auto',
            verticalScrollbarSize: 10,
            horizontalScrollbarSize: 10,
          },
          smoothScrolling: true,
          cursorSmoothCaretAnimation: 'on',
          folding: true,
          foldingHighlight: true,
          showFoldingControls: 'mouseover',
          bracketPairColorization: { enabled: true },
          guides: {
            bracketPairs: true,
            indentation: true,
          },
        }}
      />
      </div>
    </div>
  );
}

export default MonacoSandpackEditor;
