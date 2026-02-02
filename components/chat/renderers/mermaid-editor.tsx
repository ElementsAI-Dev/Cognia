'use client';

/**
 * MermaidEditor - Modern Mermaid diagram editor with split view
 * Features:
 * - Monaco editor with Mermaid syntax highlighting
 * - Real-time preview with debounce
 * - Zoom and pan controls
 * - Export to PNG/SVG
 * - Diagram templates
 * - Full-screen mode
 */

import { useState, useCallback, useRef, useEffect, memo } from 'react';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import {
  AlertCircle,
  Copy,
  Check,
  Download,
  ImageIcon,
  FileCode,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ChevronDown,
  Columns,
  Eye,
  Code2,
  Move,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
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
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCopy, useMermaid } from '@/hooks/ui';
import { exportDiagram, generateDiagramFilename } from '@/lib/export/diagram/diagram-export';
import { toast } from 'sonner';
import { useSettingsStore } from '@/stores';
import { LoadingAnimation } from './loading-animation';
import { MERMAID_TEMPLATES, type MermaidTemplate } from './mermaid-templates';
import { createEditorOptions, getMonacoTheme, registerMermaidLanguage, MERMAID_LANGUAGE_ID } from '@/lib/monaco';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-muted/30">
      <LoadingAnimation variant="ring" size="sm" text="Loading editor..." />
    </div>
  ),
});

export type MermaidEditorViewMode = 'split' | 'code' | 'preview';

export interface MermaidEditorProps {
  initialCode?: string;
  onChange?: (code: string) => void;
  onSave?: (code: string) => void;
  className?: string;
  viewMode?: MermaidEditorViewMode;
  onViewModeChange?: (mode: MermaidEditorViewMode) => void;
  showToolbar?: boolean;
  showTemplates?: boolean;
  readOnly?: boolean;
  minHeight?: string;
}

export const MermaidEditor = memo(function MermaidEditor({
  initialCode = '',
  onChange,
  onSave,
  className,
  viewMode: controlledViewMode,
  onViewModeChange,
  showToolbar = true,
  showTemplates = true,
  readOnly = false,
  minHeight = '400px',
}: MermaidEditorProps) {
  const t = useTranslations('mermaidEditor');
  const tToasts = useTranslations('toasts');
  const theme = useSettingsStore((state) => state.theme);

  const [internalViewMode, setInternalViewMode] = useState<MermaidEditorViewMode>('split');
  const viewMode = controlledViewMode ?? internalViewMode;
  const setViewMode = onViewModeChange ?? setInternalViewMode;

  const [code, setCode] = useState(initialCode);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const previewRef = useRef<HTMLDivElement>(null);
  const panStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  const { copy, isCopying } = useCopy({ toastMessage: tToasts('mermaidCopied') });
  const { svg, error, isLoading, render } = useMermaid(initialCode, { debounceMs: 400 });

  const handleCodeChange = useCallback(
    (value: string | undefined) => {
      const newCode = value || '';
      setCode(newCode);
      onChange?.(newCode);
      render(newCode);
    },
    [onChange, render]
  );

  const handleCopy = useCallback(async () => {
    await copy(code);
  }, [copy, code]);

  const handleExport = useCallback(
    async (format: 'png' | 'svg') => {
      if (!previewRef.current) return;

      setIsExporting(true);
      try {
        const filename = generateDiagramFilename(code, 'mermaid');
        const isDark = document.documentElement.classList.contains('dark');
        await exportDiagram(previewRef.current, filename, {
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
    },
    [code, tToasts]
  );

  const handleZoomIn = useCallback(() => {
    setZoom((z) => Math.min(z + 0.25, 3));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((z) => Math.max(z - 0.25, 0.25));
  }, []);

  const handleResetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const handleTemplateSelect = useCallback(
    (template: MermaidTemplate) => {
      setCode(template.code);
      onChange?.(template.code);
      render(template.code);
    },
    [onChange, render]
  );

  const handleSave = useCallback(() => {
    onSave?.(code);
    toast.success(tToasts('saved'));
  }, [code, onSave, tToasts]);

  // Pan handling
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      setIsPanning(true);
      panStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        panX: pan.x,
        panY: pan.y,
      };
    },
    [pan]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isPanning) return;
      const dx = e.clientX - panStartRef.current.x;
      const dy = e.clientY - panStartRef.current.y;
      setPan({
        x: panStartRef.current.panX + dx,
        y: panStartRef.current.panY + dy,
      });
    },
    [isPanning]
  );

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  // Wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoom((z) => Math.min(Math.max(z + delta, 0.25), 3));
    }
  }, []);


  // Re-render when initialCode changes externally
  useEffect(() => {
    if (initialCode !== code) {
      setCode(initialCode);
      render(initialCode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCode]);

  const renderPreview = () => (
    <div
      className={cn(
        'relative flex-1 overflow-hidden bg-background border-l',
        viewMode === 'preview' && 'border-l-0'
      )}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
    >
      {/* Zoom controls */}
      <div className="absolute top-2 right-2 flex items-center gap-1 z-10 bg-background/80 backdrop-blur-sm rounded-lg p-1 border">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleZoomOut}>
              <ZoomOut className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('zoomOut')}</TooltipContent>
        </Tooltip>
        <span className="text-xs text-muted-foreground px-1 min-w-[3rem] text-center">
          {Math.round(zoom * 100)}%
        </span>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleZoomIn}>
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('zoomIn')}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleResetView}>
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('resetView')}</TooltipContent>
        </Tooltip>
      </div>

      {/* Pan indicator */}
      {isPanning && (
        <div className="absolute bottom-2 left-2 flex items-center gap-1 text-xs text-muted-foreground bg-background/80 backdrop-blur-sm rounded px-2 py-1 border">
          <Move className="h-3 w-3" />
          <span>Panning</span>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-20">
          <LoadingAnimation variant="ring" size="sm" text={t('rendering')} />
        </div>
      )}

      {/* Error state */}
      {error && !isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 z-20">
          <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-destructive/10 border border-destructive/20 max-w-md">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <span className="text-sm font-medium text-destructive">{t('renderError')}</span>
            <p className="text-xs text-muted-foreground text-center">{error}</p>
          </div>
        </div>
      )}

      {/* Rendered diagram */}
      <div
        ref={previewRef}
        className="h-full w-full flex items-center justify-center p-4"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: 'center center',
          transition: isPanning ? 'none' : 'transform 0.1s ease-out',
        }}
      >
        {svg && !error && (
          <div
            className="[&_svg]:max-w-full [&_svg]:h-auto"
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        )}
        {!svg && !error && !isLoading && (
          <div className="text-muted-foreground text-sm">{t('emptyPreview')}</div>
        )}
      </div>
    </div>
  );

  const renderEditor = () => (
    <div className={cn('flex-1 overflow-hidden', viewMode === 'code' && 'border-r-0')}>
      <MonacoEditor
        height="100%"
        language={MERMAID_LANGUAGE_ID}
        theme={getMonacoTheme(theme)}
        value={code}
        onChange={handleCodeChange}
        beforeMount={(monaco) => registerMermaidLanguage(monaco)}
        options={createEditorOptions('code', {
          minimap: { enabled: false },
          fontSize: 13,
          readOnly,
          padding: { top: 12, bottom: 12 },
          stickyScroll: { enabled: false },
          bracketPairColorization: { enabled: true },
        })}
      />
    </div>
  );

  return (
    <div className={cn('flex flex-col border rounded-lg overflow-hidden bg-background', className)} style={{ minHeight }}>
      {/* Toolbar */}
      {showToolbar && (
        <div className="flex items-center justify-between gap-2 px-3 py-2 border-b bg-muted/30">
          <div className="flex items-center gap-2">
            {/* View mode tabs */}
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as MermaidEditorViewMode)}>
              <TabsList className="h-8">
                <TabsTrigger value="split" className="text-xs px-2 gap-1">
                  <Columns className="h-3.5 w-3.5" />
                  {t('split')}
                </TabsTrigger>
                <TabsTrigger value="code" className="text-xs px-2 gap-1">
                  <Code2 className="h-3.5 w-3.5" />
                  {t('code')}
                </TabsTrigger>
                <TabsTrigger value="preview" className="text-xs px-2 gap-1">
                  <Eye className="h-3.5 w-3.5" />
                  {t('preview')}
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Templates dropdown */}
            {showTemplates && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 text-xs">
                    {t('templates')}
                    <ChevronDown className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-64 max-h-80 overflow-auto">
                  <DropdownMenuLabel>{t('selectTemplate')}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {MERMAID_TEMPLATES.map((template) => (
                    <DropdownMenuItem
                      key={template.id}
                      onClick={() => handleTemplateSelect(template)}
                      className="flex flex-col items-start gap-0.5"
                    >
                      <span className="font-medium">{template.name}</span>
                      <span className="text-xs text-muted-foreground">{template.description}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          <div className="flex items-center gap-1">
            {/* Refresh */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => render(code)}
                  disabled={isLoading}
                >
                  <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('refresh')}</TooltipContent>
            </Tooltip>

            {/* Copy */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleCopy}
                  disabled={isCopying}
                >
                  {isCopying ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('copyCode')}</TooltipContent>
            </Tooltip>

            {/* Export */}
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8" disabled={isExporting || !svg}>
                      <Download className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent>{t('export')}</TooltipContent>
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

            {/* Save (if onSave provided) */}
            {onSave && (
              <Button size="sm" className="h-8 text-xs" onClick={handleSave}>
                {t('save')}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Editor and Preview */}
      <div className="flex flex-1 overflow-hidden">
        {(viewMode === 'split' || viewMode === 'code') && renderEditor()}
        {(viewMode === 'split' || viewMode === 'preview') && renderPreview()}
      </div>
    </div>
  );
});

export default MermaidEditor;
