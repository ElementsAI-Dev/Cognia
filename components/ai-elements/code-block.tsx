'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CopyButton } from '@/components/chat/ui/copy-button';
import { cn } from '@/lib/utils';
import {
  PanelRightOpen,
  Download,
  Play,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  BookmarkPlus,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useArtifactStore } from '@/stores';
import { ArtifactCreateButton } from '@/components/artifacts/artifact-create-button';
import { getArtifactTypeIcon } from '@/components/artifacts';
import {
  type ComponentProps,
  createContext,
  type HTMLAttributes,
  useContext,
  useEffect,
  useRef,
} from 'react';
import { type BundledLanguage, codeToHtml, type ShikiTransformer } from 'shiki';
import { useSandbox, useCodeExecution, useSnippets } from '@/hooks/sandbox';
import { isValidLanguage } from '@/types/system/sandbox';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

type CodeBlockProps = HTMLAttributes<HTMLDivElement> & {
  code: string;
  language: BundledLanguage;
  showLineNumbers?: boolean;
  showCanvasButton?: boolean;
  showExecuteButton?: boolean;
  title?: string;
};

type CodeBlockContextType = {
  code: string;
};

const CodeBlockContext = createContext<CodeBlockContextType>({
  code: '',
});

const lineNumberTransformer: ShikiTransformer = {
  name: 'line-numbers',
  line(node, line) {
    node.children.unshift({
      type: 'element',
      tagName: 'span',
      properties: {
        className: [
          'inline-block',
          'min-w-10',
          'mr-4',
          'text-right',
          'select-none',
          'text-muted-foreground',
        ],
      },
      children: [{ type: 'text', value: String(line) }],
    });
  },
};

export async function highlightCode(
  code: string,
  language: BundledLanguage,
  showLineNumbers = false
) {
  const transformers: ShikiTransformer[] = showLineNumbers ? [lineNumberTransformer] : [];

  return await Promise.all([
    codeToHtml(code, {
      lang: language,
      theme: 'one-light',
      transformers,
    }),
    codeToHtml(code, {
      lang: language,
      theme: 'one-dark-pro',
      transformers,
    }),
  ]);
}

export const CodeBlock = ({
  code,
  language,
  showLineNumbers = false,
  showCanvasButton = true,
  showExecuteButton = true,
  title,
  className,
  children,
  ...props
}: CodeBlockProps) => {
  const t = useTranslations('renderer');
  const [html, setHtml] = useState<string>('');
  const [darkHtml, setDarkHtml] = useState<string>('');
  const [showResult, setShowResult] = useState(false);
  const [savedAsSnippet, setSavedAsSnippet] = useState(false);
  const mounted = useRef(false);

  const createCanvasDocument = useArtifactStore((state) => state.createCanvasDocument);
  const openPanel = useArtifactStore((state) => state.openPanel);

  // Sandbox execution
  const { isAvailable: sandboxAvailable } = useSandbox();
  const { result, executing, error: execError, quickExecute, reset } = useCodeExecution();
  const { createSnippet } = useSnippets({});

  // Check if this language can be executed
  const langLower = language?.toLowerCase() || '';
  const canExecute = showExecuteButton && sandboxAvailable && isValidLanguage(langLower);

  const isSuccess = result?.status === 'completed' && result?.exit_code === 0;

  useEffect(() => {
    highlightCode(code, language, showLineNumbers).then(([light, dark]) => {
      if (!mounted.current) {
        setHtml(light);
        setDarkHtml(dark);
        mounted.current = true;
      }
    });

    return () => {
      mounted.current = false;
    };
  }, [code, language, showLineNumbers]);

  const handleOpenInCanvas = () => {
    createCanvasDocument({
      title: title || `Code - ${language}`,
      content: code,
      type: 'code',
      language: language as import('@/types').ArtifactLanguage,
    });
    openPanel('canvas');
  };

  const handleDownload = () => {
    const extensionMap: Record<string, string> = {
      javascript: 'js',
      typescript: 'ts',
      python: 'py',
      html: 'html',
      css: 'css',
      json: 'json',
      markdown: 'md',
      jsx: 'jsx',
      tsx: 'tsx',
      sql: 'sql',
      bash: 'sh',
      yaml: 'yaml',
      xml: 'xml',
    };
    const ext = extensionMap[language] || 'txt';
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `code.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExecute = useCallback(async () => {
    if (!canExecute) return;
    reset();
    setShowResult(true);
    await quickExecute(langLower, code);
  }, [canExecute, langLower, code, reset, quickExecute]);

  const handleSaveAsSnippet = useCallback(async () => {
    if (!language) return;
    try {
      await createSnippet({
        title: title || `${language} snippet`,
        description: `Saved on ${new Date().toLocaleDateString()}`,
        language: langLower,
        code,
        tags: ['saved'],
        is_template: false,
      });
      setSavedAsSnippet(true);
      setTimeout(() => setSavedAsSnippet(false), 2000);
    } catch {
      // Ignore error
    }
  }, [language, langLower, code, title, createSnippet]);

  return (
    <CodeBlockContext.Provider value={{ code }}>
      <div
        className={cn(
          'group relative w-full overflow-hidden rounded-md border bg-background text-foreground',
          className
        )}
        {...props}
      >
        {/* Language badge header */}
        <div className="flex items-center justify-between px-3 py-1.5 border-b bg-muted/30">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">{getArtifactTypeIcon('code', 'h-3.5 w-3.5')}</span>
            <Badge variant="secondary" className="text-xs font-mono">
              {language}
            </Badge>
            {title && <span className="text-xs text-muted-foreground truncate ml-2">{title}</span>}
            {canExecute && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                runnable
              </Badge>
            )}
          </div>
        </div>
        <div className="relative">
          <div
            className="overflow-auto dark:hidden [&>pre]:m-0 [&>pre]:bg-background! [&>pre]:p-4 [&>pre]:text-foreground! [&>pre]:text-sm [&_code]:font-mono [&_code]:text-sm"
            // biome-ignore lint/security/noDangerouslySetInnerHtml: "this is needed."
            dangerouslySetInnerHTML={{ __html: html }}
          />
          <div
            className="hidden overflow-auto dark:block [&>pre]:m-0 [&>pre]:bg-background! [&>pre]:p-4 [&>pre]:text-foreground! [&>pre]:text-sm [&_code]:font-mono [&_code]:text-sm"
            // biome-ignore lint/security/noDangerouslySetInnerHtml: "this is needed."
            dangerouslySetInnerHTML={{ __html: darkHtml }}
          />
          <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {/* Execute button */}
            {canExecute && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    className="shrink-0"
                    onClick={handleExecute}
                    disabled={executing}
                    size="icon"
                    variant="ghost"
                    title="Run code"
                  >
                    {executing ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Play size={14} className="text-green-500" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Run code</TooltipContent>
              </Tooltip>
            )}

            {/* Save as snippet button */}
            {sandboxAvailable && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    className="shrink-0"
                    onClick={handleSaveAsSnippet}
                    disabled={savedAsSnippet}
                    size="icon"
                    variant="ghost"
                    title="Save as snippet"
                  >
                    {savedAsSnippet ? (
                      <Check size={14} className="text-green-500" />
                    ) : (
                      <BookmarkPlus size={14} />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Save as snippet</TooltipContent>
              </Tooltip>
            )}

            {showCanvasButton && (
              <Button
                className="shrink-0"
                onClick={handleOpenInCanvas}
                size="icon"
                variant="ghost"
                title={t('openInCanvas')}
              >
                <PanelRightOpen size={14} />
              </Button>
            )}
            <Button
              className="shrink-0"
              onClick={handleDownload}
              size="icon"
              variant="ghost"
              title={t('downloadCode')}
            >
              <Download size={14} />
            </Button>
            <ArtifactCreateButton
              content={code}
              language={language}
              title={title}
              variant="icon"
              className="shrink-0"
            />
            {children}
          </div>
        </div>

        {/* Execution result inline */}
        {showResult && (result || execError) && (
          <div className="border-t bg-muted/30">
            <button
              className="w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-muted/50 transition-colors"
              onClick={() => setShowResult(!showResult)}
            >
              <div className="flex items-center gap-2">
                {isSuccess ? (
                  <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                ) : (
                  <XCircle className="h-3.5 w-3.5 text-red-500" />
                )}
                <span className="font-medium">Output</span>
                {result && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    <Clock className="h-2.5 w-2.5 mr-1" />
                    {result.execution_time_ms}ms
                  </Badge>
                )}
              </div>
              {showResult ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </button>
            {showResult && (
              <div className="px-3 pb-3 space-y-2">
                {execError && (
                  <pre className="text-xs text-destructive bg-destructive/10 p-2 rounded font-mono whitespace-pre-wrap">
                    {execError}
                  </pre>
                )}
                {result?.stdout && (
                  <pre className="text-xs bg-background p-2 rounded font-mono whitespace-pre-wrap overflow-x-auto">
                    {result.stdout}
                  </pre>
                )}
                {result?.stderr && (
                  <pre className="text-xs text-destructive bg-destructive/10 p-2 rounded font-mono whitespace-pre-wrap overflow-x-auto">
                    {result.stderr}
                  </pre>
                )}
                {result && !result.stdout && !result.stderr && !execError && (
                  <p className="text-xs text-muted-foreground italic">No output</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </CodeBlockContext.Provider>
  );
};

export type CodeBlockCopyButtonProps = Omit<ComponentProps<typeof CopyButton>, 'content'> & {
  onCopy?: () => void;
  onError?: (error: Error) => void;
  timeout?: number;
};

export const CodeBlockCopyButton = ({
  onCopy,
  onError,
  timeout = 2000,
  className,
  ...props
}: CodeBlockCopyButtonProps) => {
  const t = useTranslations('renderer');
  const { code } = useContext(CodeBlockContext);

  return (
    <CopyButton
      content={code}
      iconOnly
      tooltip={t('copyCode')}
      successDuration={timeout}
      onCopySuccess={onCopy}
      onCopyError={onError}
      className={cn('shrink-0', className)}
      {...props}
    />
  );
};
