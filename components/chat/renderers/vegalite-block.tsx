'use client';

/**
 * VegaLiteBlock - Renders VegaLite charts in chat messages
 * Features:
 * - Uses react-vega (VegaEmbed) for proper React lifecycle management
 * - Native Vega view export (PNG/SVG) via view.toImageURL()
 * - Fullscreen view dialog
 * - Copy spec JSON
 * - Toggle source view
 * - Accessibility support
 * - Theme auto-detection with dark mode listener
 */

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { VegaEmbed } from 'react-vega';
import type { View } from 'vega';
import type { VisualizationSpec } from 'vega-embed';
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
import { useCopy } from '@/hooks/ui';
import { generateDiagramFilename } from '@/lib/export/diagram-export';
import { toast } from 'sonner';
import { LoadingAnimation } from './loading-animation';

interface VegaLiteBlockProps {
  content: string;
  className?: string;
}

export function VegaLiteBlock({ content, className }: VegaLiteBlockProps) {
  const t = useTranslations('renderer');
  const tToasts = useTranslations('toasts');
  const viewRef = useRef<View | null>(null);
  const fullscreenViewRef = useRef<View | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSource, setShowSource] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const { copy, isCopying } = useCopy({ toastMessage: tToasts('vegaLiteCopied') });

  // Parse spec once with memoization
  const { spec, parseError } = useMemo(() => {
    try {
      const parsed = JSON.parse(content) as VisualizationSpec;
      return { spec: parsed, parseError: null };
    } catch (err) {
      return {
        spec: null,
        parseError: err instanceof Error ? err.message : 'Invalid JSON',
      };
    }
  }, [content]);

  // Detect dark mode and listen for changes
  useEffect(() => {
    const checkDarkMode = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };

    checkDarkMode();

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          checkDarkMode();
        }
      });
    });

    observer.observe(document.documentElement, { attributes: true });

    return () => observer.disconnect();
  }, []);

  // Update error state based on parse result
  useEffect(() => {
    if (parseError) {
      setError(parseError);
      setIsLoading(false);
    } else {
      setError(null);
    }
  }, [parseError]);

  // Handle view creation - store reference for export
  const handleNewView = useCallback((view: View) => {
    viewRef.current = view;
    setIsLoading(false);
    setError(null);
  }, []);

  const handleFullscreenNewView = useCallback((view: View) => {
    fullscreenViewRef.current = view;
  }, []);

  // Handle Vega errors
  const handleError = useCallback((err: unknown) => {
    const message = err instanceof Error ? err.message : 'Failed to render chart';
    setError(message);
    setIsLoading(false);
  }, []);

  const handleCopy = useCallback(async () => {
    try {
      const formatted = JSON.stringify(JSON.parse(content), null, 2);
      await copy(formatted);
    } catch {
      await copy(content);
    }
  }, [copy, content]);

  // Native Vega export using view.toImageURL()
  const handleExport = useCallback(
    async (format: 'png' | 'svg') => {
      const view = isFullscreen ? fullscreenViewRef.current : viewRef.current;
      if (!view) {
        toast.error(tToasts('exportFailed', { error: 'Chart not ready' }));
        return;
      }

      setIsExporting(true);
      try {
        const filename = generateDiagramFilename(content, 'vegalite');
        const scaleFactor = format === 'png' ? 2 : 1;

        // Use Vega's native export API
        const url = await view.toImageURL(format, scaleFactor);

        // Download the file
        const link = document.createElement('a');
        link.href = url;
        link.download = `${filename}.${format}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast.success(tToasts('exported', { format: format.toUpperCase() }));
      } catch (err) {
        toast.error(
          tToasts('exportFailed', {
            error: err instanceof Error ? err.message : 'Unknown error',
          })
        );
      } finally {
        setIsExporting(false);
      }
    },
    [content, isFullscreen, tToasts]
  );

  const handleRetry = useCallback(() => {
    setIsLoading(true);
    setError(null);
    // Force re-render by toggling a key (handled via error state reset)
  }, []);

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

        {/* Rendered chart using react-vega */}
        <div className="flex items-center justify-center overflow-auto p-4">
          {spec && (
            <VegaEmbed
              spec={spec}
              options={{
                actions: false,
                renderer: 'svg',
                theme: isDark ? 'dark' : undefined,
              }}
              onEmbed={(result) => handleNewView(result.view)}
              onError={handleError}
            />
          )}
        </div>
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
            {/* Large chart in fullscreen */}
            <div className="flex items-center justify-center p-4">
              {spec && (
                <VegaEmbed
                  spec={spec}
                  options={{
                    actions: false,
                    renderer: 'svg',
                    theme: isDark ? 'dark' : undefined,
                  }}
                  onEmbed={(result) => handleFullscreenNewView(result.view)}
                />
              )}
            </div>

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
