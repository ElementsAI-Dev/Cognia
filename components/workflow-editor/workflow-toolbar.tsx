'use client';

/**
 * WorkflowToolbar - Toolbar for workflow editor actions
 */

import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import {
  Save,
  Undo2,
  Redo2,
  Play,
  Pause,
  Square,
  LayoutGrid,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Download,
  Upload,
  FileJson,
  Copy,
  Trash2,
  Settings,
  MoreHorizontal,
  CheckCircle,
  AlertTriangle,
  PanelLeft,
  PanelRight,
  Map,
} from 'lucide-react';
import { useWorkflowEditorStore } from '@/stores/workflow-editor-store';

interface WorkflowToolbarProps {
  onFitView?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onExport?: () => void;
  onImport?: () => void;
  className?: string;
}

export function WorkflowToolbar({
  onFitView,
  onZoomIn,
  onZoomOut,
  onExport,
  onImport,
  className,
}: WorkflowToolbarProps) {
  const t = useTranslations('workflowEditor');

  const {
    currentWorkflow,
    isDirty,
    isExecuting,
    selectedNodes,
    history,
    historyIndex,
    validationErrors,
    showNodePalette,
    showConfigPanel,
    showMinimap,
    saveWorkflow,
    undo,
    redo,
    autoLayout,
    alignNodes,
    deleteNodes,
    validate,
    startExecution,
    pauseExecution,
    cancelExecution,
    toggleNodePalette,
    toggleConfigPanel,
    toggleMinimap,
  } = useWorkflowEditorStore();

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;
  const hasSelection = selectedNodes.length > 0;
  const hasErrors = validationErrors.some((e) => e.severity === 'error');
  const hasWarnings = validationErrors.some((e) => e.severity === 'warning');

  const handleRun = () => {
    const errors = validate();
    if (errors.some((e) => e.severity === 'error')) {
      return;
    }
    startExecution({});
  };

  const handleDeleteSelection = () => {
    if (hasSelection) {
      deleteNodes(selectedNodes);
    }
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div
        className={cn(
          'flex items-center gap-1 p-2 border-b bg-background',
          className
        )}
      >
        {/* File operations */}
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={saveWorkflow}
                disabled={!isDirty}
              >
                <Save className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('save')}</TooltipContent>
          </Tooltip>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <FileJson className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={onExport}>
                <Download className="h-4 w-4 mr-2" />
                {t('exportWorkflow')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onImport}>
                <Upload className="h-4 w-4 mr-2" />
                {t('importWorkflow')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* History */}
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
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
                className="h-8 w-8"
                onClick={redo}
                disabled={!canRedo}
              >
                <Redo2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('redo')}</TooltipContent>
          </Tooltip>
        </div>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Selection actions */}
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleDeleteSelection}
                disabled={!hasSelection}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('delete')}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                disabled={!hasSelection}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('duplicate')}</TooltipContent>
          </Tooltip>
        </div>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Layout */}
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={autoLayout}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('autoLayout')}</TooltipContent>
          </Tooltip>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                disabled={selectedNodes.length < 2}
              >
                <AlignCenter className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => alignNodes('left')}>
                <AlignLeft className="h-4 w-4 mr-2" />
                {t('alignLeft')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => alignNodes('center')}>
                <AlignCenter className="h-4 w-4 mr-2" />
                {t('alignCenter')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => alignNodes('right')}>
                <AlignRight className="h-4 w-4 mr-2" />
                {t('alignRight')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => alignNodes('top')}>
                <AlignStartVertical className="h-4 w-4 mr-2" />
                {t('alignTop')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => alignNodes('middle')}>
                <AlignCenterVertical className="h-4 w-4 mr-2" />
                {t('alignMiddle')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => alignNodes('bottom')}>
                <AlignEndVertical className="h-4 w-4 mr-2" />
                {t('alignBottom')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Zoom */}
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onZoomOut}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('zoomOut')}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onZoomIn}
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
                onClick={onFitView}
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('fitView')}</TooltipContent>
          </Tooltip>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Validation status */}
        {currentWorkflow && (
          <div className="flex items-center gap-2 mr-2">
            {hasErrors ? (
              <div className="flex items-center gap-1 text-destructive text-sm">
                <AlertTriangle className="h-4 w-4" />
                <span>{validationErrors.filter((e) => e.severity === 'error').length} error(s)</span>
              </div>
            ) : hasWarnings ? (
              <div className="flex items-center gap-1 text-yellow-600 dark:text-yellow-500 text-sm">
                <AlertTriangle className="h-4 w-4" />
                <span>{validationErrors.filter((e) => e.severity === 'warning').length} warning(s)</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-green-600 dark:text-green-500 text-sm">
                <CheckCircle className="h-4 w-4" />
                <span>{t('valid')}</span>
              </div>
            )}
          </div>
        )}

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Execution controls */}
        <div className="flex items-center gap-1">
          {!isExecuting ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="default"
                  size="sm"
                  className="h-8 gap-1"
                  onClick={handleRun}
                  disabled={!currentWorkflow || hasErrors}
                >
                  <Play className="h-4 w-4" />
                  {t('run')}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('runWorkflow')}</TooltipContent>
            </Tooltip>
          ) : (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={pauseExecution}
                  >
                    <Pause className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('pause')}</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="destructive"
                    size="icon"
                    className="h-8 w-8"
                    onClick={cancelExecution}
                  >
                    <Square className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('stop')}</TooltipContent>
              </Tooltip>
            </>
          )}
        </div>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* View toggles */}
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={showNodePalette ? 'secondary' : 'ghost'}
                size="icon"
                className="h-8 w-8"
                onClick={toggleNodePalette}
              >
                <PanelLeft className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('togglePalette')}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={showConfigPanel ? 'secondary' : 'ghost'}
                size="icon"
                className="h-8 w-8"
                onClick={toggleConfigPanel}
              >
                <PanelRight className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('toggleConfig')}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={showMinimap ? 'secondary' : 'ghost'}
                size="icon"
                className="h-8 w-8"
                onClick={toggleMinimap}
              >
                <Map className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('toggleMinimap')}</TooltipContent>
          </Tooltip>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Settings className="h-4 w-4 mr-2" />
                {t('workflowSettings')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </TooltipProvider>
  );
}

export default WorkflowToolbar;
