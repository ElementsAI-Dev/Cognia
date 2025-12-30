'use client';

/**
 * VegaLiteBlock - Renders VegaLite charts in chat messages
 * Features:
 * - Fullscreen view dialog
 * - Copy spec JSON
 * - Export as PNG/SVG
 * - Toggle source view
 * - Accessibility support
 * - Theme auto-detection
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { 
  AlertCircle, 
  Copy, 
  Check, 
  Maximize2, 
  Code2, 
  Download,
  ImageIcon,
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
import { useCopy } from '@/hooks/use-copy';
import { exportDiagram, generateDiagramFilename } from '@/lib/export/diagram-export';
import { toast } from 'sonner';
import { LoadingAnimation } from './loading-animation';

interface VegaLiteBlockProps {
  content: string;
  className?: string;
}

export function VegaLiteBlock({ content, className }: VegaLiteBlockProps) {
  const t = useTranslations('renderer');
  const tToasts = useTranslations('toasts');
  const containerRef = useRef<HTMLDivElement>(null);
  const fullscreenRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSource, setShowSource] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const { copy, isCopying } = useCopy({ toastMessage: tToasts('vegaLiteCopied') });

  const renderChart = useCallback(async (container: HTMLDivElement | null, spec: object) => {
    if (!container) return;

    const vegaEmbed = (await import('vega-embed')).default;
    const isDark = document.documentElement.classList.contains('dark');
    
    await vegaEmbed(container, spec as never, {
      actions: false,
      renderer: 'svg',
      theme: isDark ? 'dark' : undefined,
    });
  }, []);

  const doRender = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const spec = JSON.parse(content);
      
      if (containerRef.current) {
        await renderChart(containerRef.current, spec);
        setIsLoading(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to render chart');
      setIsLoading(false);
    }
  }, [content, renderChart]);

  useEffect(() => {
    let mounted = true;

    const render = async () => {
      if (mounted) {
        await doRender();
      }
    };

    render();

    return () => {
      mounted = false;
    };
  }, [doRender]);

  useEffect(() => {
    if (isFullscreen && fullscreenRef.current) {
      try {
        const spec = JSON.parse(content);
        renderChart(fullscreenRef.current, spec);
      } catch {
        // Error already handled in main render
      }
    }
  }, [isFullscreen, content, renderChart]);

  const handleCopy = useCallback(async () => {
    // Format JSON for better readability
    try {
      const spec = JSON.parse(content);
      await copy(JSON.stringify(spec, null, 2));
    } catch {
      await copy(content);
    }
  }, [copy, content]);

  const handleExport = useCallback(async (format: 'png' | 'svg') => {
    const element = isFullscreen ? fullscreenRef.current : containerRef.current;
    if (!element) return;

    setIsExporting(true);
    try {
      const filename = generateDiagramFilename(content, 'vegalite');
      const isDark = document.documentElement.classList.contains('dark');
      await exportDiagram(element, filename, {
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
  }, [content, isFullscreen, tToasts]);

  const handleRetry = useCallback(() => {
    doRender();
  }, [doRender]);

  // Format content for display
  const formattedContent = (() => {
    try {
      return JSON.stringify(JSON.parse(content), null, 2);
    } catch {
      return content;
    }
  })();

  if (isLoading) {
    return (
      <LoadingAnimation
        variant="wave"
        size="md"
        text={t('renderingChart')}
        className={cn('my-4', className)}
      />
    );
  }

  if (error) {
    return (
      <div 
        className={cn('flex flex-col gap-2 p-4 rounded-lg bg-destructive/10 border border-destructive/20', className)}
        role="alert"
        aria-label={t('vegaLiteError')}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-4 w-4" aria-hidden="true" />
            <span className="text-sm font-medium">{t('vegaLiteError')}</span>
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
                  aria-label={t('copySpec')}
                >
                  {isCopying ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('copySpec')}</TooltipContent>
            </Tooltip>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">{error}</p>
        <pre className="mt-2 p-2 rounded bg-muted text-xs overflow-auto max-h-40">
          <code>{formattedContent}</code>
        </pre>
      </div>
    );
  }

  return (
    <>
      <div 
        className={cn('group relative rounded-lg border bg-card overflow-hidden my-4', className)}
        role="figure"
        aria-label={t('vegaLiteChart')}
      >
        {/* Action buttons */}
        <div className="absolute top-2 right-2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10 bg-background/80 backdrop-blur-sm rounded-lg p-0.5">
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
                aria-label={t('copySpec')}
              >
                {isCopying ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('copySpec')}</TooltipContent>
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
                <ImageIcon className="h-4 w-4 mr-2" />
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
          <pre className="m-2 p-3 rounded-lg bg-muted/50 border text-xs overflow-auto font-mono max-h-40">
            <code>{formattedContent}</code>
          </pre>
        )}

        {/* Rendered chart */}
        <div
          ref={containerRef}
          className="flex items-center justify-center overflow-auto p-4"
        />
      </div>

      {/* Fullscreen dialog */}
      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>{t('vegaLiteChart')}</span>
              <div className="flex items-center gap-1 ml-auto">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={handleCopy}
                      disabled={isCopying}
                      aria-label={t('copySpec')}
                    >
                      {isCopying ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t('copySpec')}</TooltipContent>
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
                      <ImageIcon className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t('exportPng')}</TooltipContent>
                </Tooltip>
              </div>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Large chart */}
            <div
              ref={fullscreenRef}
              className="flex items-center justify-center p-4"
            />
            
            {/* Spec JSON */}
            <details className="group">
              <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2">
                <Code2 className="h-4 w-4" />
                <span>{t('showSpec')}</span>
              </summary>
              <pre className="mt-2 p-4 rounded-lg bg-muted text-sm overflow-auto font-mono max-h-60">
                <code>{formattedContent}</code>
              </pre>
            </details>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
