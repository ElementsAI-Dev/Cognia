'use client';

/**
 * DesignerToolbar - Toolbar for the web page designer
 * Includes viewport controls, zoom, mode switching, and AI editing
 */

import { useCallback } from 'react';
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
} from 'lucide-react';
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
import { useDesignerStore } from '@/stores/designer-store';
import type { ViewportSize, DesignerMode } from '@/types/designer';

interface DesignerToolbarProps {
  className?: string;
  onAIEdit?: () => void;
  onExport?: () => void;
  onOpenInCanvas?: () => void;
}

export function DesignerToolbar({ className, onAIEdit, onExport, onOpenInCanvas }: DesignerToolbarProps) {
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
    { value: 'mobile', icon: <Smartphone className="h-4 w-4" />, label: 'Mobile' },
    { value: 'tablet', icon: <Tablet className="h-4 w-4" />, label: 'Tablet' },
    { value: 'desktop', icon: <Monitor className="h-4 w-4" />, label: 'Desktop' },
    { value: 'full', icon: <Maximize className="h-4 w-4" />, label: 'Full Width' },
  ];

  const modeButtons: { value: DesignerMode; icon: React.ReactNode; label: string }[] = [
    { value: 'preview', icon: <Eye className="h-4 w-4" />, label: 'Preview' },
    { value: 'design', icon: <Pencil className="h-4 w-4" />, label: 'Design' },
    { value: 'code', icon: <Code2 className="h-4 w-4" />, label: 'Code' },
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
            <TooltipContent>Zoom Out</TooltipContent>
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
            <TooltipContent>Zoom In</TooltipContent>
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
            <TooltipContent>Reset Zoom</TooltipContent>
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
            <TooltipContent>Undo</TooltipContent>
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
            <TooltipContent>Redo</TooltipContent>
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
            <TooltipContent>Element Tree</TooltipContent>
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
            <TooltipContent>Style Panel</TooltipContent>
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
            <TooltipContent>Version History</TooltipContent>
          </Tooltip>
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
              <span className="text-xs">AI Edit</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Edit with AI</TooltipContent>
        </Tooltip>

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
                <span className="text-xs">Edit Code</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Open in Canvas for detailed editing</TooltipContent>
          </Tooltip>
        )}

        {/* More actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 px-2">
              <span className="text-xs">More</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleCopyCode}>
              <Copy className="h-4 w-4 mr-2" />
              Copy Code
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </DropdownMenuItem>
            <DropdownMenuItem onClick={reset} className="text-destructive">
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </TooltipProvider>
  );
}

export default DesignerToolbar;
