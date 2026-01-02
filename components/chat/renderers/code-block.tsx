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
} from 'lucide-react';
import { useArtifactStore } from '@/stores';
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
import { useCopy } from '@/hooks/ui';

interface CodeBlockProps {
  code: string;
  language?: string;
  className?: string;
  showLineNumbers?: boolean;
  highlightLines?: number[];
  filename?: string;
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
}: CodeBlockProps) {
  const t = useTranslations('renderer');
  const tToasts = useTranslations('toasts');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [wordWrap, setWordWrap] = useState(false);
  const [localShowLineNumbers, setLocalShowLineNumbers] = useState(showLineNumbers);
  const codeRef = useRef<HTMLPreElement>(null);
  const { copy, isCopying } = useCopy({ toastMessage: tToasts('codeCopied') });

  // Canvas integration
  const createCanvasDocument = useArtifactStore((state) => state.createCanvasDocument);
  const setActiveCanvas = useArtifactStore((state) => state.setActiveCanvas);
  const openPanel = useArtifactStore((state) => state.openPanel);

  // Check if this is a web language that can be opened in Canvas
  const canOpenInCanvas = language && WEB_LANGUAGES.includes(language.toLowerCase());

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

  const isHighlighted = useCallback((lineNumber: number) => {
    return highlightLines.includes(lineNumber);
  }, [highlightLines]);

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
          </div>
          
          {/* Action buttons */}
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
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
            )}
          </div>
        </div>

        {/* Code content */}
        {renderCode(false)}
      </div>

      {/* Fullscreen dialog */}
      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>{language || 'Code'}</span>
              {filename && <span className="text-muted-foreground font-normal">— {filename}</span>}
              <div className="flex items-center gap-1 ml-auto">
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
