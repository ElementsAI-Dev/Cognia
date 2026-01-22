'use client';

/**
 * MermaidBlock - Renders Mermaid diagrams in chat messages
 * Features:
 * - Fullscreen view dialog
 * - Split-view mode (code + preview)
 * - Standalone editor modal
 * - Copy source code
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
  Pencil,
  Columns,
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
import { exportDiagram, generateDiagramFilename } from '@/lib/export/diagram-export';
import { toast } from 'sonner';
import { LoadingAnimation } from './loading-animation';
import { MermaidEditorModal } from './mermaid-editor-modal';
import { MermaidEditor } from './mermaid-editor';

export type MermaidBlockViewMode = 'compact' | 'split';

interface MermaidBlockProps {
  content: string;
  className?: string;
  viewMode?: MermaidBlockViewMode;
  onContentChange?: (newContent: string) => void;
  editable?: boolean;
}

export function MermaidBlock({ 
  content, 
  className,
  viewMode: initialViewMode = 'compact',
  onContentChange,
  editable = true,
}: MermaidBlockProps) {
  const t = useTranslations('renderer');
  const tToasts = useTranslations('toasts');
  const containerRef = useRef<HTMLDivElement>(null);
  const fullscreenRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSource, setShowSource] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [viewMode, setViewMode] = useState<MermaidBlockViewMode>(initialViewMode);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [localContent, setLocalContent] = useState(content);
  const { copy, isCopying } = useCopy({ toastMessage: tToasts('mermaidCopied') });

  const renderMermaid = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const mermaid = (await import('mermaid')).default;
      const isDark = document.documentElement.classList.contains('dark');

      mermaid.initialize({
        startOnLoad: false,
        theme: isDark ? 'dark' : 'default',
        securityLevel: 'loose',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      });

      const id = `mermaid-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const { svg: renderedSvg } = await mermaid.render(id, content.trim());

      setSvg(renderedSvg);
      setIsLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to render diagram');
      setIsLoading(false);
    }
  }, [content]);

  useEffect(() => {
    let mounted = true;

    const doRender = async () => {
      if (mounted) {
        await renderMermaid();
      }
    };

    doRender();

    return () => {
      mounted = false;
    };
  }, [renderMermaid]);

  const handleCopy = useCallback(async () => {
    await copy(content);
  }, [copy, content]);

  const handleExport = useCallback(async (format: 'png' | 'svg') => {
    const element = isFullscreen ? fullscreenRef.current : containerRef.current;
    if (!element) return;

    setIsExporting(true);
    try {
      const filename = generateDiagramFilename(content, 'mermaid');
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
    renderMermaid();
  }, [renderMermaid]);

  const handleEditorSave = useCallback((newContent: string) => {
    setLocalContent(newContent);
    onContentChange?.(newContent);
  }, [onContentChange]);

  const toggleViewMode = useCallback(() => {
    setViewMode((prev) => (prev === 'compact' ? 'split' : 'compact'));
  }, []);

  // Sync local content with prop
  useEffect(() => {
    setLocalContent(content);
  }, [content]);

  if (isLoading) {
    return (
      <LoadingAnimation
        variant="ring"
        size="md"
        text={t('renderingDiagram')}
        className={cn('my-4', className)}
      />
    );
  }

  if (error) {
    return (
      <div 
        className={cn('flex flex-col gap-2 p-4 rounded-lg bg-destructive/10 border border-destructive/20', className)}
        role="alert"
        aria-label={t('mermaidError')}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-4 w-4" aria-hidden="true" />
            <span className="text-sm font-medium">{t('mermaidError')}</span>
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
                  aria-label={t('copySource')}
                >
                  {isCopying ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('copySource')}</TooltipContent>
            </Tooltip>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">{error}</p>
        <pre className="mt-2 p-2 rounded bg-muted text-xs overflow-auto max-h-40">
          <code>{content}</code>
        </pre>
      </div>
    );
  }

  return (
    <>
      <div 
        className={cn('group relative rounded-lg border bg-card overflow-hidden my-4', className)}
        role="figure"
        aria-label={t('mermaidDiagram')}
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
                aria-label={t('copySource')}
              >
                {isCopying ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('copySource')}</TooltipContent>
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
                onClick={toggleViewMode}
                aria-label={viewMode === 'compact' ? t('splitView') : t('compactView')}
              >
                <Columns className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{viewMode === 'compact' ? t('splitView') : t('compactView')}</TooltipContent>
          </Tooltip>

          {editable && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setIsEditorOpen(true)}
                  aria-label={t('editDiagram')}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('editDiagram')}</TooltipContent>
            </Tooltip>
          )}

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

        {/* Split view mode */}
        {viewMode === 'split' ? (
          <MermaidEditor
            initialCode={localContent}
            onChange={handleEditorSave}
            showToolbar={false}
            showTemplates={false}
            className="h-[400px] border-0 rounded-none"
            minHeight="400px"
            readOnly={!editable}
          />
        ) : (
          <>
            {/* Source code view */}
            {showSource && (
              <pre className="m-2 p-3 rounded-lg bg-muted/50 border text-xs overflow-auto font-mono max-h-40">
                <code>{content}</code>
              </pre>
            )}

            {/* Rendered diagram */}
            <div
              ref={containerRef}
              className="flex items-center justify-center overflow-auto p-4 [&_svg]:max-w-full"
              dangerouslySetInnerHTML={{ __html: svg }}
            />
          </>
        )}
      </div>

      {/* Fullscreen dialog */}
      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>{t('mermaidDiagram')}</span>
              <div className="flex items-center gap-1 ml-auto">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={handleCopy}
                      disabled={isCopying}
                      aria-label={t('copySource')}
                    >
                      {isCopying ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Copy source</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleExport('png')}
                      disabled={isExporting}
                      aria-label={t('exportPNG')}
                    >
                      <ImageIcon className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Export PNG</TooltipContent>
                </Tooltip>
              </div>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Large diagram */}
            <div
              ref={fullscreenRef}
              className="flex items-center justify-center p-4 [&_svg]:max-w-full"
              dangerouslySetInnerHTML={{ __html: svg }}
            />
            
            {/* Source code */}
            <details className="group">
              <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2">
                <Code2 className="h-4 w-4" />
                <span>View Source Code</span>
              </summary>
              <pre className="mt-2 p-4 rounded-lg bg-muted text-sm overflow-auto font-mono max-h-60">
                <code>{content}</code>
              </pre>
            </details>
          </div>
        </DialogContent>
      </Dialog>

      {/* Editor Modal */}
      {editable && (
        <MermaidEditorModal
          open={isEditorOpen}
          onOpenChange={setIsEditorOpen}
          initialCode={localContent}
          onSave={handleEditorSave}
          title={t('editMermaidDiagram')}
        />
      )}
    </>
  );
}
