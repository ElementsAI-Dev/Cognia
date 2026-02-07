'use client';

/**
 * WorkflowToolbar - Toolbar for workflow editor actions
 */

import { useState } from 'react';
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
  FileJson,
  Copy,
  Trash2,
  CheckCircle,
  AlertTriangle,
  PanelLeft,
  PanelRight,
  Map,
  Plus,
  Settings,
  MoreHorizontal,
  Zap,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useToolbarActions } from '@/hooks/workflow';
import { VersionHistoryPanel, ImportExportDialog } from '../panels/version-history-panel';
import { ExecutionStatisticsPanel } from '../execution/execution-statistics-panel';
import { WorkflowExecutionHistoryPanel } from '../execution/workflow-execution-history-panel';
import { VariableManagerPanel } from '../panels/variable-manager-panel';
import { KeyboardShortcutsPanel } from '../panels/keyboard-shortcuts-panel';
import { WorkflowSettingsPanel } from '../panels/workflow-settings-panel';
import { WorkflowInputTestPanel } from '../panels/workflow-input-test-panel';
import { WorkflowTriggerPanel } from '../panels/workflow-trigger-panel';
import { DebugToolbar } from '../debug/debug-toolbar';
import { NodeSearchPanel } from '../search/node-search-panel';

type MobilePanelType = 'palette' | 'config' | 'execution' | null;

interface WorkflowToolbarProps {
  onFitView?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onExport?: () => void;
  onImport?: () => void;
  className?: string;
  isMobile?: boolean;
  onOpenMobilePanel?: (panel: MobilePanelType) => void;
}

export function WorkflowToolbar({
  onFitView,
  onZoomIn,
  onZoomOut,
  className,
  isMobile = false,
  onOpenMobilePanel,
}: WorkflowToolbarProps) {
  const t = useTranslations('workflowEditor');
  const [importExportOpen, setImportExportOpen] = useState(false);

  // Use shared toolbar actions hook
  const {
    state,
    currentWorkflow,
    showNodePalette,
    showConfigPanel,
    showMinimap,
    selectedNodes,
    validationErrors,
    isExecuting,
    executionState,
    handleSave,
    handleRun,
    handleDeleteSelection,
    handleDuplicateSelection,
    handleAlign,
    handleDistribute,
    undo,
    redo,
    autoLayout,
    pauseExecution,
    resumeExecution,
    cancelExecution,
    toggleNodePalette,
    toggleConfigPanel,
    toggleMinimap,
  } = useToolbarActions();

  const isPaused = executionState?.status === 'paused';
  const hasErrors = validationErrors.some((e) => e.severity === 'error');
  const hasWarnings = validationErrors.some((e) => e.severity === 'warning');
  const { canUndo, canRedo, hasSelection, canSave } = state;

  // Mobile toolbar - simplified version
  if (isMobile) {
    return (
      <TooltipProvider delayDuration={300}>
        <div
          className={cn(
            'flex items-center gap-2 p-2 border-b bg-background',
            className
          )}
        >
          {/* Save button */}
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={handleSave}
            disabled={!canSave}
          >
            <Save className="h-4 w-4" />
          </Button>

          {/* Undo/Redo */}
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={undo}
              disabled={!canUndo}
            >
              <Undo2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={redo}
              disabled={!canRedo}
            >
              <Redo2 className="h-4 w-4" />
            </Button>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Validation status - compact */}
          {currentWorkflow && (
            <div className="flex items-center">
              {hasErrors ? (
                <AlertTriangle className="h-4 w-4 text-destructive" />
              ) : hasWarnings ? (
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
              ) : (
                <CheckCircle className="h-4 w-4 text-green-500" />
              )}
            </div>
          )}

          {/* Run button */}
          {!isExecuting && !isPaused ? (
            <Button
              variant="default"
              size="sm"
              className="h-9 gap-1"
              onClick={handleRun}
              disabled={!currentWorkflow || hasErrors}
            >
              <Play className="h-4 w-4" />
              <span className="hidden xs:inline">{t('run')}</span>
            </Button>
          ) : isPaused ? (
            <div className="flex items-center gap-1">
              <Button
                variant="default"
                size="icon"
                className="h-9 w-9"
                onClick={resumeExecution}
              >
                <Play className="h-4 w-4" />
              </Button>
              <Button
                variant="destructive"
                size="icon"
                className="h-9 w-9"
                onClick={cancelExecution}
              >
                <Square className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9"
                onClick={pauseExecution}
              >
                <Pause className="h-4 w-4" />
              </Button>
              <Button
                variant="destructive"
                size="icon"
                className="h-9 w-9"
                onClick={cancelExecution}
              >
                <Square className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* More menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => onOpenMobilePanel?.('palette')}>
                <Plus className="h-4 w-4 mr-2" />
                Add Node
              </DropdownMenuItem>
              {hasSelection && (
                <>
                  <DropdownMenuItem onClick={() => onOpenMobilePanel?.('config')}>
                    <Settings className="h-4 w-4 mr-2" />
                    Configure Node
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleDeleteSelection}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    {t('delete')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleDuplicateSelection}>
                    <Copy className="h-4 w-4 mr-2" />
                    {t('duplicate')}
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={autoLayout}>
                <LayoutGrid className="h-4 w-4 mr-2" />
                {t('autoLayout')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setImportExportOpen(true)}>
                <FileJson className="h-4 w-4 mr-2" />
                Import/Export
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onFitView}>
                <Maximize2 className="h-4 w-4 mr-2" />
                {t('fitView')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <ImportExportDialog
          open={importExportOpen}
          onOpenChange={setImportExportOpen}
        />
      </TooltipProvider>
    );
  }

  // Desktop toolbar - full version
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
                onClick={handleSave}
                disabled={!canSave}
              >
                <Save className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('save')}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setImportExportOpen(true)}
              >
                <FileJson className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Import/Export</TooltipContent>
          </Tooltip>

          <VersionHistoryPanel />
          <ExecutionStatisticsPanel />
          <WorkflowExecutionHistoryPanel />
          <WorkflowInputTestPanel />
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
                onClick={handleDuplicateSelection}
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
              <DropdownMenuItem onClick={() => handleAlign('left')}>
                <AlignLeft className="h-4 w-4 mr-2" />
                {t('alignLeft')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAlign('center')}>
                <AlignCenter className="h-4 w-4 mr-2" />
                {t('alignCenter')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAlign('right')}>
                <AlignRight className="h-4 w-4 mr-2" />
                {t('alignRight')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleAlign('top')}>
                <AlignStartVertical className="h-4 w-4 mr-2" />
                {t('alignTop')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAlign('middle')}>
                <AlignCenterVertical className="h-4 w-4 mr-2" />
                {t('alignMiddle')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAlign('bottom')}>
                <AlignEndVertical className="h-4 w-4 mr-2" />
                {t('alignBottom')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => handleDistribute('horizontal')}
                disabled={selectedNodes.length < 3}
              >
                <LayoutGrid className="h-4 w-4 mr-2" />
                {t('distributeHorizontal')}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleDistribute('vertical')}
                disabled={selectedNodes.length < 3}
              >
                <LayoutGrid className="h-4 w-4 mr-2" />
                {t('distributeVertical')}
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

        {/* Node search */}
        <NodeSearchPanel />

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

        {/* Debug toolbar */}
        <DebugToolbar />

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Execution controls */}
        <div className="flex items-center gap-1">
          {!isExecuting && !isPaused ? (
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
          ) : isPaused ? (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="default"
                    size="sm"
                    className="h-8 gap-1"
                    onClick={resumeExecution}
                  >
                    <Play className="h-4 w-4" />
                    {t('resume')}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('resumeWorkflow')}</TooltipContent>
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

          <VariableManagerPanel />
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" title="Triggers">
                <Zap className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent className="w-[400px] sm:w-[450px]">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Triggers
                </SheetTitle>
              </SheetHeader>
              <div className="mt-4 h-[calc(100%-60px)]">
                <WorkflowTriggerPanel />
              </div>
            </SheetContent>
          </Sheet>
          <WorkflowSettingsPanel />
          <KeyboardShortcutsPanel />
        </div>
      </div>

      <ImportExportDialog
        open={importExportOpen}
        onOpenChange={setImportExportOpen}
      />
    </TooltipProvider>
  );
}

export default WorkflowToolbar;
