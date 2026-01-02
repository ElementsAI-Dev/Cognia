'use client';

/**
 * MathBlock - Renders block-level LaTeX math expressions using KaTeX
 * Features:
 * - Fullscreen view dialog
 * - Copy LaTeX source
 * - Export as PNG/SVG
 * - Toggle source view
 * - Accessibility support
 */

import { useMemo, useState, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { 
  AlertCircle, 
  Copy, 
  Check, 
  Maximize2, 
  Code2, 
  Download,
  Image as ImageIcon,
  FileCode,
  RefreshCw,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useCopy } from '@/hooks/ui';
import { exportMath, generateMathFilename } from '@/lib/export/math-export';
import { toast } from 'sonner';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface MathBlockProps {
  content: string;
  className?: string;
  scale?: number;
}

export function MathBlock({ content, className, scale = 1 }: MathBlockProps) {
  const t = useTranslations('renderer');
  const tToasts = useTranslations('toasts');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSource, setShowSource] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const mathRef = useRef<HTMLDivElement>(null);
  const fullscreenMathRef = useRef<HTMLDivElement>(null);
  const { copy, isCopying } = useCopy({ toastMessage: tToasts('latexCopied') });

  const cleanContent = useMemo(() => {
    return content
      .replace(/^\$\$/, '')
      .replace(/\$\$$/, '')
      .replace(/^\\\[/, '')
      .replace(/\\\]$/, '')
      .trim();
  }, [content]);

  const result = useMemo(() => {
    try {
      const rendered = katex.renderToString(cleanContent, {
        displayMode: true,
        throwOnError: false,
        trust: true,
        strict: false,
        output: 'html',
      });

      return { html: rendered, error: null };
    } catch (err) {
      return { html: '', error: err instanceof Error ? err.message : 'Failed to render math' };
    }
  }, [cleanContent]);

  const handleCopy = useCallback(async () => {
    await copy(cleanContent);
  }, [copy, cleanContent]);

  const handleExport = useCallback(async (format: 'png' | 'svg') => {
    const element = isFullscreen ? fullscreenMathRef.current : mathRef.current;
    if (!element) return;

    setIsExporting(true);
    try {
      const filename = generateMathFilename(cleanContent);
      const isDark = document.documentElement.classList.contains('dark');
      await exportMath(element, filename, {
        format,
        scale: 2,
        backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
        padding: 20,
      });
      toast.success(tToasts('exported', { format: format.toUpperCase() }));
    } catch (err) {
      toast.error(tToasts('exportFailed', { error: err instanceof Error ? err.message : 'Unknown error' }));
    } finally {
      setIsExporting(false);
    }
  }, [cleanContent, isFullscreen, tToasts]);

  const handleRetry = useCallback(() => {
    // Force re-render by toggling a state
    setShowSource(false);
  }, []);

  if (result.error) {
    return (
      <div 
        className={cn('flex flex-col gap-2 p-4 rounded-lg bg-destructive/10 border border-destructive/20', className)}
        role="alert"
        aria-label={t('latexError')}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-4 w-4" aria-hidden="true" />
            <span className="text-sm font-medium">{t('latexError')}</span>
          </div>
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={handleRetry}
                  aria-label={t('retry')}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('retry')}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={handleCopy}
                  disabled={isCopying}
                  aria-label={t('copyLatex')}
                >
                  {isCopying ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('copyLatex')}</TooltipContent>
            </Tooltip>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">{result.error}</p>
        <pre className="mt-2 p-2 rounded bg-muted text-xs overflow-auto">
          <code>{cleanContent}</code>
        </pre>
      </div>
    );
  }

  const scaleStyle = scale !== 1 ? { fontSize: `${scale}em` } : undefined;

  return (
    <>
      <div 
        className={cn('group relative my-4 rounded-lg', className)}
        role="math"
        aria-label={t('mathExpression')}
      >
        {/* Action buttons */}
        <div className="absolute top-0 right-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10 bg-background/80 backdrop-blur-sm rounded-lg p-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setShowSource(!showSource)}
                aria-label={showSource ? t('hideSpec') : t('showSpec')}
                aria-pressed={showSource}
              >
                <Code2 className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{showSource ? t('hideSpec') : t('showSpec')}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleCopy}
                disabled={isCopying}
                aria-label={t('copyLatex')}
              >
                {isCopying ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('copyLatex')}</TooltipContent>
          </Tooltip>

          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    disabled={isExporting}
                    aria-label={t('exportOptions')}
                  >
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent>{t('exportOptions')}</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport('png')}>
                <ImageIcon className="h-4 w-4 mr-2" aria-hidden="true" />
                {t('exportPng')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('svg')}>
                <FileCode className="h-4 w-4 mr-2" />
                {t('exportSvg')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setIsFullscreen(true)}
                aria-label={t('viewFullscreen')}
              >
                <Maximize2 className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('viewFullscreen')}</TooltipContent>
          </Tooltip>
        </div>

        {/* Source code view */}
        {showSource && (
          <pre className="mb-2 p-3 rounded-lg bg-muted/50 border text-xs overflow-auto font-mono">
            <code>{cleanContent}</code>
          </pre>
        )}

        {/* Rendered math */}
        <div
          ref={mathRef}
          className="overflow-x-auto py-2 text-center katex-block"
          style={scaleStyle}
          dangerouslySetInnerHTML={{ __html: result.html }}
        />
      </div>

      {/* Fullscreen dialog */}
      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>{t('mathExpression')}</span>
              <div className="flex items-center gap-1 ml-auto">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={handleCopy}
                      disabled={isCopying}
                      aria-label={t('copyLatex')}
                    >
                      {isCopying ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t('copyLatex')}</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleExport('png')}
                      disabled={isExporting}
                      aria-label={t('exportPng')}
                    >
                      <ImageIcon className="h-3.5 w-3.5" aria-hidden="true" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t('exportPng')}</TooltipContent>
                </Tooltip>
              </div>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Large rendered math */}
            <div
              ref={fullscreenMathRef}
              className="flex items-center justify-center p-8 text-2xl katex-block"
              dangerouslySetInnerHTML={{ __html: result.html }}
            />
            
            {/* Source code */}
            <details className="group">
              <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2">
                <Code2 className="h-4 w-4" />
                <span>{t('copyLatex')}</span>
              </summary>
              <pre className="mt-2 p-4 rounded-lg bg-muted text-sm overflow-auto font-mono">
                <code>{cleanContent}</code>
              </pre>
            </details>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
