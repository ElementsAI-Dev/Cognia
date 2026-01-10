'use client';

/**
 * DesignerToolbar - Toolbar for the web page designer
 * Includes viewport controls, zoom, mode switching, and AI editing
 */

import { useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import {
  Monitor,
  Tablet,
  Smartphone,
  Maximize,
  ZoomIn,
  ZoomOut,
  Undo2,
  Redo2,
  Eye,
  Pencil,
  Code2,
  Sparkles,
  RotateCcw,
  Download,
  Copy,
  Layers,
  PanelRight,
  FileCode,
  History,
  MessageSquare,
  Grid3X3,
  Lightbulb,
  Layout,
} from 'lucide-react';
import { AISuggestionsPanel } from '../ai/ai-suggestions-panel';
import { ExportOptionsPanel } from '../panels/export-options-panel';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useDesignerStore } from '@/stores/designer';
import type { ViewportSize, DesignerMode } from '@/types/designer';

interface DesignerToolbarProps {
  className?: string;
  onAIEdit?: () => void;
  onExport?: () => void;
  onOpenInCanvas?: () => void;
  showAIChatPanel?: boolean;
  onToggleAIChat?: () => void;
  showGridOverlay?: boolean;
  onToggleGridOverlay?: () => void;
  onOpenTemplates?: () => void;
}

export function DesignerToolbar({ className, onAIEdit, onExport: _onExport, onOpenInCanvas, showAIChatPanel, onToggleAIChat, showGridOverlay, onToggleGridOverlay, onOpenTemplates }: DesignerToolbarProps) {
  const t = useTranslations('designer');
  const [showSuggestionsPanel, setShowSuggestionsPanel] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const mode = useDesignerStore((state) => state.mode);
  const setMode = useDesignerStore((state) => state.setMode);
  const viewport = useDesignerStore((state) => state.viewport);
  const setViewport = useDesignerStore((state) => state.setViewport);
  const zoom = useDesignerStore((state) => state.zoom);
  const setZoom = useDesignerStore((state) => state.setZoom);
  const undo = useDesignerStore((state) => state.undo);
  const redo = useDesignerStore((state) => state.redo);
  const history = useDesignerStore((state) => state.history);
  const historyIndex = useDesignerStore((state) => state.historyIndex);
  const showElementTree = useDesignerStore((state) => state.showElementTree);
  const showStylePanel = useDesignerStore((state) => state.showStylePanel);
  const showHistoryPanel = useDesignerStore((state) => state.showHistoryPanel);
  const toggleElementTree = useDesignerStore((state) => state.toggleElementTree);
  const toggleStylePanel = useDesignerStore((state) => state.toggleStylePanel);
  const toggleHistoryPanel = useDesignerStore((state) => state.toggleHistoryPanel);
  const code = useDesignerStore((state) => state.code);
  const reset = useDesignerStore((state) => state.reset);

  const canUndo = historyIndex >= 0;
  const canRedo = historyIndex < history.length - 1;

  const handleCopyCode = useCallback(async () => {
    await navigator.clipboard.writeText(code);
  }, [code]);

  const viewportButtons: { value: ViewportSize; icon: React.ReactNode; label: string }[] = [
    { value: 'mobile', icon: <Smartphone className="h-4 w-4" />, label: t('mobile') },
    { value: 'tablet', icon: <Tablet className="h-4 w-4" />, label: t('tablet') },
    { value: 'desktop', icon: <Monitor className="h-4 w-4" />, label: t('desktop') },
    { value: 'full', icon: <Maximize className="h-4 w-4" />, label: t('fullWidth') },
  ];

  const modeButtons: { value: DesignerMode; icon: React.ReactNode; label: string }[] = [
    { value: 'preview', icon: <Eye className="h-4 w-4" />, label: t('previewMode') },
    { value: 'design', icon: <Pencil className="h-4 w-4" />, label: t('design') },
    { value: 'code', icon: <Code2 className="h-4 w-4" />, label: t('code') },
  ];

  return (
    <TooltipProvider>
      <div
        className={cn(
          'flex items-center gap-1 border-b bg-background px-2 py-1.5',
          className
        )}
      >
        {/* Mode switcher */}
        <ButtonGroup className="border rounded-md p-0.5">
          {modeButtons.map((btn) => (
            <Tooltip key={btn.value}>
              <TooltipTrigger asChild>
                <Button
                  variant={mode === btn.value ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-7 px-2.5"
                  onClick={() => setMode(btn.value)}
                >
                  {btn.icon}
                  <span className="ml-1.5 text-xs hidden sm:inline">{btn.label}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>{btn.label}</TooltipContent>
            </Tooltip>
          ))}
        </ButtonGroup>

        <Separator orientation="vertical" className="mx-1 h-6" />

        {/* Viewport controls */}
        <div className="flex items-center gap-0.5">
          {viewportButtons.map((btn) => (
            <Tooltip key={btn.value}>
              <TooltipTrigger asChild>
                <Button
                  variant={viewport === btn.value ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setViewport(btn.value)}
                >
                  {btn.icon}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{btn.label}</TooltipContent>
            </Tooltip>
          ))}
        </div>

        <Separator orientation="vertical" className="mx-1 h-6" />

        {/* Zoom controls */}
        <div className="flex items-center gap-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setZoom(zoom - 10)}
                disabled={zoom <= 25}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('zoomOut')}</TooltipContent>
          </Tooltip>

          <span className="min-w-12 text-center text-xs text-muted-foreground">
            {zoom}%
          </span>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setZoom(zoom + 10)}
                disabled={zoom >= 200}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('zoomIn')}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setZoom(100)}
                disabled={zoom === 100}
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('resetZoom')}</TooltipContent>
          </Tooltip>
        </div>

        <Separator orientation="vertical" className="mx-1 h-6" />

        {/* Undo/Redo */}
        <div className="flex items-center gap-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={undo}
                disabled={!canUndo}
              >
                <Undo2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('undo')}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={redo}
                disabled={!canRedo}
              >
                <Redo2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('redo')}</TooltipContent>
          </Tooltip>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Panel toggles */}
        <div className="flex items-center gap-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={showElementTree ? 'secondary' : 'ghost'}
                size="icon"
                className="h-7 w-7"
                onClick={toggleElementTree}
              >
                <Layers className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('elementTree')}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={showStylePanel ? 'secondary' : 'ghost'}
                size="icon"
                className="h-7 w-7"
                onClick={toggleStylePanel}
              >
                <PanelRight className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('stylePanel')}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={showHistoryPanel ? 'secondary' : 'ghost'}
                size="icon"
                className="h-7 w-7"
                onClick={toggleHistoryPanel}
              >
                <History className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('versionHistory')}</TooltipContent>
          </Tooltip>

          {/* Grid overlay toggle */}
          {onToggleGridOverlay && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={showGridOverlay ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-7 w-7"
                  onClick={onToggleGridOverlay}
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('gridOverlay') || 'Grid Overlay'}</TooltipContent>
            </Tooltip>
          )}
        </div>

        <Separator orientation="vertical" className="mx-1 h-6" />

        {/* AI Edit button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="default"
              size="sm"
              className="h-7 gap-1.5"
              onClick={onAIEdit}
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span className="text-xs">{t('aiEdit')}</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('editWithAI')}</TooltipContent>
        </Tooltip>

        {/* AI Suggestions Panel */}
        <Popover open={showSuggestionsPanel} onOpenChange={setShowSuggestionsPanel}>
          <PopoverTrigger asChild>
            <Button
              variant={showSuggestionsPanel ? 'secondary' : 'outline'}
              size="sm"
              className="h-7 gap-1.5"
            >
              <Lightbulb className="h-3.5 w-3.5" />
              <span className="text-xs">{t('suggestions') || 'Tips'}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end" side="bottom">
            <AISuggestionsPanel
              code={code}
              onCodeChange={(newCode) => {
                // Update through store
                const { setCode } = useDesignerStore.getState();
                setCode(newCode);
              }}
              onClose={() => setShowSuggestionsPanel(false)}
            />
          </PopoverContent>
        </Popover>

        {/* AI Chat button */}
        {onToggleAIChat && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={showAIChatPanel ? 'secondary' : 'outline'}
                size="sm"
                className="h-7 gap-1.5"
                onClick={onToggleAIChat}
              >
                <MessageSquare className="h-3.5 w-3.5" />
                <span className="text-xs">{t('aiChat') || 'AI Chat'}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('aiChatTooltip') || 'Open AI conversation'}</TooltipContent>
          </Tooltip>
        )}

        {/* Canvas button */}
        {onOpenInCanvas && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-7 gap-1.5"
                onClick={onOpenInCanvas}
              >
                <FileCode className="h-3.5 w-3.5" />
                <span className="text-xs">{t('editCode')}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('openInCanvas')}</TooltipContent>
          </Tooltip>
        )}

        {/* Export Dialog */}
        <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 gap-1.5">
              <Download className="h-3.5 w-3.5" />
              <span className="text-xs">{t('export')}</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t('exportOptions') || 'Export Options'}</DialogTitle>
              <DialogDescription>
                {t('exportDescription') || 'Choose export format and options'}
              </DialogDescription>
            </DialogHeader>
            <ExportOptionsPanel onExport={() => setShowExportDialog(false)} />
          </DialogContent>
        </Dialog>

        {/* More actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 px-2">
              <span className="text-xs">{t('more')}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onOpenTemplates && (
              <DropdownMenuItem onClick={onOpenTemplates}>
                <Layout className="h-4 w-4 mr-2" />
                {t('templates') || 'Templates'}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={handleCopyCode}>
              <Copy className="h-4 w-4 mr-2" />
              {t('copyCode')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={reset} className="text-destructive">
              <RotateCcw className="h-4 w-4 mr-2" />
              {t('reset')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </TooltipProvider>
  );
}

export default DesignerToolbar;
