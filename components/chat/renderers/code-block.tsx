'use client';

/**
 * CodeBlock - Renders code blocks with syntax highlighting and line numbers
 * Features:
 * - Copy to clipboard
 * - Download as file
 * - Fullscreen view
 * - Line numbers toggle
 * - Word wrap toggle
 * - Accessibility support
 * - Line highlighting
 * - Code execution (when sandbox available)
 * - Save as snippet
 */

import { useState, memo, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { 
  Copy, 
  Check, 
  Download, 
  Maximize2, 
  WrapText,
  Hash,
  PanelRight,
  Play,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  BookmarkPlus,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useArtifactStore } from '@/stores';
import { ChatDesignerPanel } from '@/components/chat/core/chat-designer-panel';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { useCopy } from '@/hooks/ui';
import { useSandbox, useCodeExecution, useSnippets } from '@/hooks/sandbox';
import { isValidLanguage } from '@/types/system/sandbox';

interface CodeBlockProps {
  code: string;
  language?: string;
  className?: string;
  showLineNumbers?: boolean;
  highlightLines?: number[];
  filename?: string;
  showExecuteButton?: boolean;
}

// Languages that can be opened in Canvas for live preview
const WEB_LANGUAGES = ['html', 'jsx', 'tsx', 'javascript', 'typescript', 'css', 'svg', 'react'];

export const CodeBlock = memo(function CodeBlock({ 
  code, 
  language, 
  className,
  showLineNumbers = true,
  highlightLines = [],
  filename,
  showExecuteButton = true,
}: CodeBlockProps) {
  const t = useTranslations('renderer');
  const tToasts = useTranslations('toasts');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [wordWrap, setWordWrap] = useState(false);
  const [localShowLineNumbers, setLocalShowLineNumbers] = useState(showLineNumbers);
  const [showResult, setShowResult] = useState(false);
  const [savedAsSnippet, setSavedAsSnippet] = useState(false);
  const [showInlinePreview, setShowInlinePreview] = useState(false);
  const codeRef = useRef<HTMLPreElement>(null);
  const { copy, isCopying } = useCopy({ toastMessage: tToasts('codeCopied') });

  // Canvas integration
  const createCanvasDocument = useArtifactStore((state) => state.createCanvasDocument);
  const setActiveCanvas = useArtifactStore((state) => state.setActiveCanvas);
  const openPanel = useArtifactStore((state) => state.openPanel);

  // Sandbox execution
  const { isAvailable: sandboxAvailable } = useSandbox();
  const { result, executing, error: execError, quickExecute, reset } = useCodeExecution();
  const { createSnippet } = useSnippets({});

  // Check if this is a web language that can be opened in Canvas
  const canOpenInCanvas = language && WEB_LANGUAGES.includes(language.toLowerCase());

  // Check if this language can be executed
  const langLower = language?.toLowerCase() || '';
  const canExecute = showExecuteButton && sandboxAvailable && isValidLanguage(langLower);

  const lines = code.split('\n');

  const handleCopy = useCallback(async () => {
    await copy(code);
  }, [copy, code]);

  const handleDownload = useCallback(() => {
    const extension = getExtensionFromLanguage(language);
    const name = filename || `code${extension}`;
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [code, language, filename]);

  const handleOpenInCanvas = useCallback(() => {
    const docId = createCanvasDocument({
      title: filename || `${language || 'code'} snippet`,
      content: code,
      language: (language || 'javascript') as 'javascript' | 'typescript' | 'python' | 'html' | 'css' | 'json' | 'markdown' | 'jsx' | 'tsx' | 'sql' | 'bash' | 'yaml' | 'xml',
      type: 'code',
    });
    setActiveCanvas(docId);
    openPanel('canvas');
  }, [code, language, filename, createCanvasDocument, setActiveCanvas, openPanel]);

  const handleExecute = useCallback(async () => {
    if (!canExecute || !language) return;
    reset();
    setShowResult(true);
    await quickExecute(langLower, code);
  }, [canExecute, language, langLower, code, reset, quickExecute]);

  const handleSaveAsSnippet = useCallback(async () => {
    if (!language) return;
    try {
      await createSnippet({
        title: filename || `${language} snippet`,
        description: `Saved from chat on ${new Date().toLocaleDateString()}`,
        language: langLower,
        code,
        tags: ['chat', 'saved'],
        is_template: false,
      });
      setSavedAsSnippet(true);
      setTimeout(() => setSavedAsSnippet(false), 2000);
    } catch {
      // Ignore error - snippet creation failed
    }
  }, [language, langLower, code, filename, createSnippet]);

  const isHighlighted = useCallback((lineNumber: number) => {
    return highlightLines.includes(lineNumber);
  }, [highlightLines]);

  const isSuccess = result?.status === 'completed' && result?.exit_code === 0;

  const renderCode = useCallback((inFullscreen = false) => (
    <pre 
      ref={inFullscreen ? undefined : codeRef}
      className={cn(
        'overflow-x-auto p-4 bg-muted/50 text-sm font-mono',
        wordWrap && 'whitespace-pre-wrap wrap-break-word',
        inFullscreen && 'max-h-[70vh]'
      )}
    >
      <code 
        className={language ? `language-${language}` : undefined}
        role="code"
        aria-label={`Code in ${language || 'plain text'}`}
      >
        {localShowLineNumbers ? (
          <table className="border-collapse w-full" role="presentation">
            <tbody>
              {lines.map((line, i) => (
                <tr 
                  key={i} 
                  className={cn(
                    'leading-relaxed',
                    isHighlighted(i + 1) && 'bg-primary/10'
                  )}
                >
                  <td 
                    className="pr-4 text-right text-muted-foreground select-none w-8 align-top border-r border-muted mr-2"
                    aria-hidden="true"
                  >
                    {i + 1}
                  </td>
                  <td className={cn('pl-4', wordWrap ? 'whitespace-pre-wrap' : 'whitespace-pre')}>
                    {line || ' '}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <span className={wordWrap ? 'whitespace-pre-wrap' : 'whitespace-pre'}>{code}</span>
        )}
      </code>
    </pre>
  ), [code, language, lines, localShowLineNumbers, wordWrap, isHighlighted]);

  return (
    <>
      <div 
        className={cn('group relative rounded-lg overflow-hidden my-3 border', className)}
        role="figure"
        aria-label={`Code block${language ? ` in ${language}` : ''}`}
      >
        {/* Header with language and actions */}
        <div className="flex items-center justify-between px-4 py-2 bg-muted/80 border-b text-xs">
          <div className="flex items-center gap-2 text-muted-foreground">
            {language && <span className="font-mono font-medium">{language}</span>}
            {filename && <span className="text-muted-foreground/60">{filename}</span>}
            {!language && !filename && <span className="font-mono">code</span>}
            {canExecute && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                runnable
              </Badge>
            )}
          </div>
          
          {/* Action buttons */}
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            {/* Execute button */}
            {canExecute && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={handleExecute}
                    disabled={executing}
                    aria-label="Run code"
                  >
                    {executing ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Play className="h-3 w-3 text-green-500" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Run code</TooltipContent>
              </Tooltip>
            )}

            {/* Save as snippet button */}
            {sandboxAvailable && language && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={handleSaveAsSnippet}
                    disabled={savedAsSnippet}
                    aria-label="Save as snippet"
                  >
                    {savedAsSnippet ? (
                      <Check className="h-3 w-3 text-green-500" />
                    ) : (
                      <BookmarkPlus className="h-3 w-3" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Save as snippet</TooltipContent>
              </Tooltip>
            )}

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setLocalShowLineNumbers(!localShowLineNumbers)}
                  aria-label={localShowLineNumbers ? 'Hide line numbers' : 'Show line numbers'}
                  aria-pressed={localShowLineNumbers}
                >
                  <Hash className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{localShowLineNumbers ? 'Hide lines' : 'Show lines'}</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setWordWrap(!wordWrap)}
                  aria-label={wordWrap ? 'Disable word wrap' : 'Enable word wrap'}
                  aria-pressed={wordWrap}
                >
                  <WrapText className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{wordWrap ? 'Unwrap' : 'Wrap'}</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={handleCopy}
                  disabled={isCopying}
                  aria-label={t('copyCode')}
                >
                  {isCopying ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Copy</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={handleDownload}
                  aria-label={t('downloadCode')}
                >
                  <Download className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Download</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setIsFullscreen(true)}
                  aria-label={t('viewFullscreen')}
                >
                  <Maximize2 className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Fullscreen</TooltipContent>
            </Tooltip>

            {canOpenInCanvas && (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => setShowInlinePreview(!showInlinePreview)}
                      aria-label={showInlinePreview ? "Hide preview" : "Show preview"}
                    >
                      {showInlinePreview ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{showInlinePreview ? 'Hide preview' : 'Live preview'}</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={handleOpenInCanvas}
                      aria-label="Open in Canvas"
                    >
                      <PanelRight className="h-3 w-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Open in Canvas</TooltipContent>
                </Tooltip>
              </>
            )}
          </div>
        </div>

        {/* Code content */}
        {renderCode(false)}

        {/* Inline Preview for web languages */}
        {showInlinePreview && canOpenInCanvas && (
          <div className="border-t">
            <ChatDesignerPanel
              code={code}
              onClose={() => setShowInlinePreview(false)}
              className="max-h-[300px]"
            />
          </div>
        )}

        {/* Execution result inline */}
        {showResult && (result || execError) && (
          <div className="border-t bg-muted/30">
            <button
              className="w-full flex items-center justify-between px-4 py-2 text-xs hover:bg-muted/50 transition-colors"
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
              <div className="px-4 pb-3 space-y-2">
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

      {/* Fullscreen dialog */}
      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>{language || 'Code'}</span>
              {filename && <span className="text-muted-foreground font-normal">— {filename}</span>}
              <div className="flex items-center gap-1 ml-auto">
                {canExecute && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={handleExecute}
                        disabled={executing}
                        aria-label="Run code"
                      >
                        {executing ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Play className="h-3.5 w-3.5 text-green-500" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Run code</TooltipContent>
                  </Tooltip>
                )}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setLocalShowLineNumbers(!localShowLineNumbers)}
                      aria-label={localShowLineNumbers ? 'Hide line numbers' : 'Show line numbers'}
                    >
                      <Hash className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{localShowLineNumbers ? 'Hide lines' : 'Show lines'}</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setWordWrap(!wordWrap)}
                      aria-label={wordWrap ? 'Disable word wrap' : 'Enable word wrap'}
                    >
                      <WrapText className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{wordWrap ? 'Unwrap' : 'Wrap'}</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={handleCopy}
                      disabled={isCopying}
                      aria-label={t('copyCode')}
                    >
                      {isCopying ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Copy</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={handleDownload}
                      aria-label={t('downloadCode')}
                    >
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Download</TooltipContent>
                </Tooltip>
              </div>
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-auto rounded-lg border">
            {renderCode(true)}
          </div>
          
          <div className="text-xs text-muted-foreground pt-2">
            {lines.length} line{lines.length !== 1 ? 's' : ''} • {code.length} character{code.length !== 1 ? 's' : ''}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
});

/**
 * Get file extension from language name
 */
function getExtensionFromLanguage(language?: string): string {
  if (!language) return '.txt';
  
  const extensions: Record<string, string> = {
    javascript: '.js',
    typescript: '.ts',
    jsx: '.jsx',
    tsx: '.tsx',
    python: '.py',
    java: '.java',
    c: '.c',
    cpp: '.cpp',
    csharp: '.cs',
    go: '.go',
    rust: '.rs',
    ruby: '.rb',
    php: '.php',
    swift: '.swift',
    kotlin: '.kt',
    scala: '.scala',
    html: '.html',
    css: '.css',
    scss: '.scss',
    sass: '.sass',
    less: '.less',
    json: '.json',
    yaml: '.yaml',
    yml: '.yml',
    xml: '.xml',
    markdown: '.md',
    md: '.md',
    sql: '.sql',
    bash: '.sh',
    shell: '.sh',
    sh: '.sh',
    powershell: '.ps1',
    dockerfile: '.dockerfile',
    makefile: 'Makefile',
    graphql: '.graphql',
    vue: '.vue',
    svelte: '.svelte',
    r: '.r',
    matlab: '.m',
    lua: '.lua',
    perl: '.pl',
    haskell: '.hs',
    elixir: '.ex',
    erlang: '.erl',
    clojure: '.clj',
    dart: '.dart',
    zig: '.zig',
    nim: '.nim',
    ocaml: '.ml',
    fsharp: '.fs',
    toml: '.toml',
    ini: '.ini',
    env: '.env',
  };

  return extensions[language.toLowerCase()] || `.${language.toLowerCase()}`;
}

