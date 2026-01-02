'use client';

/**
 * SandpackBlock - Interactive code playground renderer
 * Features:
 * - Live code editing
 * - Real-time preview
 * - Multiple file support
 * - Console output
 * - Customizable templates
 */

import { memo, useState, useCallback, lazy, Suspense } from 'react';
import { useTranslations } from 'next-intl';
import {
  Play,
  Maximize2,
  Copy,
  Check,
  Code,
  Eye,
  Terminal,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { useCopy } from '@/hooks/ui';
import { Skeleton } from '@/components/ui/skeleton';

// Lazy load Sandpack to reduce initial bundle size
const SandpackProvider = lazy(() =>
  import('@codesandbox/sandpack-react').then((mod) => ({ default: mod.SandpackProvider }))
);
const SandpackCodeEditor = lazy(() =>
  import('@codesandbox/sandpack-react').then((mod) => ({ default: mod.SandpackCodeEditor }))
);
const SandpackPreview = lazy(() =>
  import('@codesandbox/sandpack-react').then((mod) => ({ default: mod.SandpackPreview }))
);
const SandpackConsole = lazy(() =>
  import('@codesandbox/sandpack-react').then((mod) => ({ default: mod.SandpackConsole }))
);

export type SandpackTemplate =
  | 'react'
  | 'react-ts'
  | 'vanilla'
  | 'vanilla-ts'
  | 'vue'
  | 'vue-ts'
  | 'angular'
  | 'svelte'
  | 'solid'
  | 'static';

interface SandpackFile {
  code: string;
  hidden?: boolean;
  active?: boolean;
  readOnly?: boolean;
}

interface SandpackBlockProps {
  code: string;
  template?: SandpackTemplate;
  files?: Record<string, SandpackFile | string>;
  className?: string;
  showConsole?: boolean;
  showTabs?: boolean;
  autoRun?: boolean;
}

export const SandpackBlock = memo(function SandpackBlock({
  code,
  template = 'react',
  files: customFiles,
  className,
  showConsole = true,
  showTabs = true,
  autoRun = true,
}: SandpackBlockProps) {
  const _t = useTranslations('renderer');
  const tToasts = useTranslations('toasts');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeTab, setActiveTab] = useState<'code' | 'preview' | 'console'>('preview');
  const { copy, isCopying } = useCopy({ toastMessage: tToasts('codeCopied') });

  // Prepare files based on template
  const files = customFiles || getDefaultFiles(template, code);

  const handleCopy = useCallback(async () => {
    await copy(code);
  }, [copy, code]);

  const renderSandpack = useCallback(
    (inFullscreen = false) => (
      <Suspense
        fallback={
          <div className="flex flex-col gap-2 p-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        }
      >
        <SandpackProvider
          template={template}
          files={files}
          theme="dark"
          options={{
            autorun: autoRun,
            recompileMode: 'delayed',
            recompileDelay: 500,
          }}
        >
          <div className={cn('flex flex-col', inFullscreen ? 'h-full' : 'h-[400px]')}>
            {showTabs && (
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
                <TabsList className="w-full justify-start rounded-none border-b bg-muted/50">
                  <TabsTrigger value="preview" className="gap-1.5">
                    <Eye className="h-3.5 w-3.5" />
                    Preview
                  </TabsTrigger>
                  <TabsTrigger value="code" className="gap-1.5">
                    <Code className="h-3.5 w-3.5" />
                    Code
                  </TabsTrigger>
                  {showConsole && (
                    <TabsTrigger value="console" className="gap-1.5">
                      <Terminal className="h-3.5 w-3.5" />
                      Console
                    </TabsTrigger>
                  )}
                </TabsList>

                <TabsContent value="preview" className="flex-1 m-0">
                  <SandpackPreview
                    showOpenInCodeSandbox={false}
                    showRefreshButton={false}
                    style={{ height: inFullscreen ? 'calc(100% - 40px)' : '360px' }}
                  />
                </TabsContent>

                <TabsContent value="code" className="flex-1 m-0">
                  <SandpackCodeEditor
                    showTabs
                    showLineNumbers
                    showInlineErrors
                    wrapContent
                    style={{ height: inFullscreen ? 'calc(100% - 40px)' : '360px' }}
                  />
                </TabsContent>

                {showConsole && (
                  <TabsContent value="console" className="flex-1 m-0">
                    <SandpackConsole
                      style={{ height: inFullscreen ? 'calc(100% - 40px)' : '360px' }}
                    />
                  </TabsContent>
                )}
              </Tabs>
            )}

            {!showTabs && (
              <div className="flex flex-1">
                <div className="w-1/2 border-r">
                  <SandpackCodeEditor
                    showTabs
                    showLineNumbers
                    showInlineErrors
                    wrapContent
                    style={{ height: '100%' }}
                  />
                </div>
                <div className="w-1/2">
                  <SandpackPreview
                    showOpenInCodeSandbox={false}
                    showRefreshButton={false}
                    style={{ height: '100%' }}
                  />
                </div>
              </div>
            )}
          </div>
        </SandpackProvider>
      </Suspense>
    ),
    [template, files, autoRun, showTabs, showConsole, activeTab]
  );

  return (
    <>
      <div
        className={cn(
          'group rounded-lg border overflow-hidden my-4 bg-[#1e1e1e]',
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 bg-muted/80 border-b text-xs">
          <div className="flex items-center gap-2">
            <Code className="h-4 w-4 text-muted-foreground" />
            <span className="font-mono font-medium">Interactive Playground</span>
            <span className="text-muted-foreground">({template})</span>
          </div>

          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={handleCopy}
                  disabled={isCopying}
                >
                  {isCopying ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Copy code</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setIsFullscreen(true)}
                >
                  <Maximize2 className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Fullscreen</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Sandpack content */}
        {renderSandpack(false)}
      </div>

      {/* Fullscreen dialog */}
      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 overflow-hidden">
          <DialogHeader className="px-4 py-2 border-b">
            <DialogTitle className="flex items-center gap-2 text-sm">
              <Code className="h-4 w-4" />
              Interactive Playground ({template})
            </DialogTitle>
          </DialogHeader>
          <div className="h-[calc(95vh-60px)]">{renderSandpack(true)}</div>
        </DialogContent>
      </Dialog>
    </>
  );
});

/**
 * Get default files based on template
 */
function getDefaultFiles(
  template: SandpackTemplate,
  code: string
): Record<string, SandpackFile | string> {
  switch (template) {
    case 'react':
    case 'react-ts':
      return {
        '/App.js': code,
      };
    case 'vanilla':
    case 'vanilla-ts':
      return {
        '/index.js': code,
      };
    case 'vue':
    case 'vue-ts':
      return {
        '/src/App.vue': code,
      };
    case 'static':
      return {
        '/index.html': code,
      };
    default:
      return {
        '/App.js': code,
      };
  }
}

/**
 * Simple code playground without Sandpack (fallback)
 */
export const SimplePlayground = memo(function SimplePlayground({
  code,
  language,
  className,
}: {
  code: string;
  language?: string;
  className?: string;
}) {
  const [output, setOutput] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const handleRun = useCallback(() => {
    try {
      setError(null);
      // Simple eval for demo purposes - in production, use a proper sandbox
      const logs: string[] = [];
      const mockConsole = {
        log: (...args: unknown[]) => logs.push(args.map(String).join(' ')),
        error: (...args: unknown[]) => logs.push(`Error: ${args.map(String).join(' ')}`),
        warn: (...args: unknown[]) => logs.push(`Warning: ${args.map(String).join(' ')}`),
      };

      // Create a function that runs the code with mock console
      const fn = new Function('console', code);
      fn(mockConsole);

      setOutput(logs.join('\n'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  }, [code]);

  return (
    <div className={cn('rounded-lg border overflow-hidden my-4', className)}>
      <div className="flex items-center justify-between px-3 py-2 bg-muted/80 border-b text-xs">
        <span className="font-mono">{language || 'javascript'}</span>
        <Button variant="ghost" size="sm" onClick={handleRun}>
          <Play className="h-3 w-3 mr-1" />
          Run
        </Button>
      </div>
      <pre className="p-4 bg-muted/30 text-sm font-mono overflow-x-auto">
        <code>{code}</code>
      </pre>
      {(output || error) && (
        <div className="border-t p-4 bg-muted/20">
          <div className="text-xs text-muted-foreground mb-1">Output:</div>
          {error ? (
            <pre className="text-red-500 text-sm">{error}</pre>
          ) : (
            <pre className="text-sm whitespace-pre-wrap">{output}</pre>
          )}
        </div>
      )}
    </div>
  );
});

export default SandpackBlock;
