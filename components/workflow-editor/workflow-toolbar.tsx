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
} from 'lucide-react';
import { useWorkflowEditorStore } from '@/stores/workflow-editor-store';
import { VersionHistoryPanel, ImportExportDialog } from './version-history-panel';
import { ExecutionStatisticsPanel } from './execution-statistics-panel';
import { VariableManagerPanel } from './variable-manager-panel';
import { KeyboardShortcutsPanel } from './keyboard-shortcuts-panel';
import { WorkflowSettingsPanel } from './workflow-settings-panel';
import { WorkflowInputTestPanel } from './workflow-input-test-panel';
import { DebugToolbar } from './debug-toolbar';
import { NodeSearchPanel } from './node-search-panel';

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
  className,
}: WorkflowToolbarProps) {
  const t = useTranslations('workflowEditor');
  const [importExportOpen, setImportExportOpen] = useState(false);

  const {
    currentWorkflow,
    isDirty,
    isExecuting,
    executionState,
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
    resumeExecution,
    cancelExecution,
    toggleNodePalette,
    toggleConfigPanel,
    toggleMinimap,
  } = useWorkflowEditorStore();

  const isPaused = executionState?.status === 'paused';

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

  const handleDuplicateSelection = () => {
    if (hasSelection) {
      selectedNodes.forEach((nodeId) => {
        useWorkflowEditorStore.getState().duplicateNode(nodeId);
      });
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
