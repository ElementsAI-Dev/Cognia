'use client';

/**
 * FlowChatControls - Control toolbar for flow chat canvas
 * Provides zoom, layout, export, and view controls
 */

import { memo, useCallback } from 'react';
import { useReactFlow, Panel } from '@xyflow/react';
import { useTranslations } from 'next-intl';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  LayoutGrid,
  Download,
  Image,
  Grid3X3,
  Map,
  ArrowDownUp,
  ArrowLeftRight,
  List,
  GitBranch,
  RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type {
  FlowLayoutDirection,
  ChatViewMode,
  FlowChatCanvasState,
} from '@/types/chat/flow-chat';

interface FlowChatControlsProps {
  viewMode: ChatViewMode;
  canvasState: FlowChatCanvasState;
  onViewModeChange: (mode: ChatViewMode) => void;
  onLayoutChange: (direction: FlowLayoutDirection) => void;
  onAutoLayout: () => void;
  onCanvasStateChange: (updates: Partial<FlowChatCanvasState>) => void;
  onExport: (format: 'png' | 'svg' | 'json') => void;
  className?: string;
}

function FlowChatControlsComponent({
  viewMode,
  canvasState,
  onViewModeChange,
  onLayoutChange,
  onAutoLayout,
  onCanvasStateChange,
  onExport,
  className,
}: FlowChatControlsProps) {
  const t = useTranslations('flowChat');
  const { zoomIn, zoomOut, fitView, getZoom } = useReactFlow();

  const handleZoomIn = useCallback(() => {
    zoomIn({ duration: 200 });
  }, [zoomIn]);

  const handleZoomOut = useCallback(() => {
    zoomOut({ duration: 200 });
  }, [zoomOut]);

  const handleFitView = useCallback(() => {
    fitView({ padding: 0.2, duration: 300 });
  }, [fitView]);

  const handleToggleMinimap = useCallback(() => {
    onCanvasStateChange({ showMinimap: !canvasState.showMinimap });
  }, [canvasState.showMinimap, onCanvasStateChange]);

  const handleToggleGrid = useCallback(() => {
    onCanvasStateChange({ showGrid: !canvasState.showGrid });
  }, [canvasState.showGrid, onCanvasStateChange]);

  const handleToggleSnapToGrid = useCallback(() => {
    onCanvasStateChange({ snapToGrid: !canvasState.snapToGrid });
  }, [canvasState.snapToGrid, onCanvasStateChange]);

  const currentZoom = Math.round(getZoom() * 100);

  return (
    <Panel
      position="top-right"
      className={cn(
        'flex items-center gap-1 p-1.5 bg-background/90 supports-[backdrop-filter]:bg-background/80 backdrop-blur-md border rounded-lg shadow-sm',
        className
      )}
    >
      {/* View mode toggle */}
      <div className="flex items-center border rounded-md">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-8 w-8 rounded-r-none"
              onClick={() => onViewModeChange('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('viewList')}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={viewMode === 'flow' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-8 w-8 rounded-l-none"
              onClick={() => onViewModeChange('flow')}
            >
              <GitBranch className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('viewFlow')}</TooltipContent>
        </Tooltip>
      </div>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Zoom controls */}
      <div className="flex items-center gap-0.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleZoomOut}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('zoomOut')}</TooltipContent>
        </Tooltip>

        <span className="text-xs w-12 text-center tabular-nums">
          {currentZoom}%
        </span>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleZoomIn}
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
              className="h-8 w-8"
              onClick={handleFitView}
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('fitView')}</TooltipContent>
        </Tooltip>
      </div>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Layout controls */}
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>{t('layout')}</TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel>{t('layoutDirection')}</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => onLayoutChange('TB')}>
            <ArrowDownUp className="h-4 w-4 mr-2" />
            {t('layoutTB')}
            {canvasState.layoutDirection === 'TB' && (
              <span className="ml-auto">✓</span>
            )}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onLayoutChange('LR')}>
            <ArrowLeftRight className="h-4 w-4 mr-2" />
            {t('layoutLR')}
            {canvasState.layoutDirection === 'LR' && (
              <span className="ml-auto">✓</span>
            )}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onAutoLayout}>
            <RotateCcw className="h-4 w-4 mr-2" />
            {t('autoLayout')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* View options */}
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Grid3X3 className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>{t('viewOptions')}</TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuCheckboxItem
            checked={canvasState.showGrid}
            onCheckedChange={handleToggleGrid}
          >
            <Grid3X3 className="h-4 w-4 mr-2" />
            {t('showGrid')}
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={canvasState.snapToGrid}
            onCheckedChange={handleToggleSnapToGrid}
          >
            <LayoutGrid className="h-4 w-4 mr-2" />
            {t('snapToGrid')}
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={canvasState.showMinimap}
            onCheckedChange={handleToggleMinimap}
          >
            <Map className="h-4 w-4 mr-2" />
            {t('showMinimap')}
          </DropdownMenuCheckboxItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Export */}
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Download className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>{t('export')}</TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem onClick={() => onExport('png')}>
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image className="h-4 w-4 mr-2" />
            PNG
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onExport('svg')}>
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image className="h-4 w-4 mr-2" />
            SVG
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => onExport('json')}>
            <Download className="h-4 w-4 mr-2" />
            JSON
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </Panel>
  );
}

export const FlowChatControls = memo(FlowChatControlsComponent);
export default FlowChatControls;
