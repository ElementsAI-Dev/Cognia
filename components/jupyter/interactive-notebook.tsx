'use client';

/**
 * InteractiveNotebook - Jupyter notebook with kernel integration
 *
 * Enhanced version of JupyterRenderer with:
 * - Real code execution via kernel
 * - Variable inspection
 * - Kernel status display
 * - Auto-execution support
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Play, PlayCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertCircle } from 'lucide-react';
import { JupyterRenderer } from '@/components/artifacts/jupyter-renderer';
import { RendererErrorBoundary } from '@/components/chat/renderers/renderer-error-boundary';
import { KernelStatus } from './kernel-status';
import { VariableInspector } from './variable-inspector';
import { useJupyterKernel } from '@/hooks/jupyter';
import { useVirtualEnv } from '@/hooks/sandbox';
import { useJupyterStore } from '@/stores/jupyter';
import { loggers } from '@/lib/logger';
import {
  buildNotebookWorkspaceSnapshotInput,
  getInteractiveNotebookSurfaceId,
  syncNotebookContentWithSessionCells,
} from '@/lib/jupyter/workspace';
import { isExecutionSuccessful, formatExecutionError, formatExecutionTime } from '@/types/jupyter';
import type { VirtualEnvInfo } from '@/types/system/environment';

interface InteractiveNotebookProps {
  content: string;
  onContentChange?: (content: string) => void;
  chatSessionId?: string;
  autoConnect?: boolean;
  showVariables?: boolean;
  className?: string;
}

export function InteractiveNotebook({
  content,
  onContentChange,
  chatSessionId,
  autoConnect = false,
  showVariables = true,
  className,
}: InteractiveNotebookProps) {
  const t = useTranslations('jupyter');
  const [selectedEnvPath, setSelectedEnvPath] = useState<string | null>(null);
  const [isRunningAll, setIsRunningAll] = useState(false);
  const lastSyncedContentRef = useRef<string | null>(null);
  const lastCachedVarsSessionIdRef = useRef<string | null>(null);
  const lastRestoreAttemptRef = useRef<string | null>(null);
  const surfaceId = getInteractiveNotebookSurfaceId(chatSessionId);

  const {
    activeSession,
    activeKernel,
    isExecuting,
    variables,
    variablesLoading,
    error,
    isCreatingSession,
    createSession,
    setActiveSession,
    executeCell,
    restartKernel,
    interruptKernel,
    refreshVariables,
    getCachedVariables,
    inspectVariable,
    getSessionForChat,
    mapChatToSession,
    restoreSession,
    clearError,
  } = useJupyterKernel();

  const activeSessionId = activeSession?.id ?? null;
  const sessionCells = useJupyterStore(
    useCallback(
      (state) => {
        if (!activeSessionId) return [];
        return state.cells.get(activeSessionId) || [];
      },
      [activeSessionId]
    )
  );
  const workspace = useJupyterStore(
    useCallback((state) => state.workspaces[surfaceId] ?? null, [surfaceId])
  );
  const upsertWorkspace = useJupyterStore((state) => state.upsertWorkspace);

  const { environments, refreshEnvironments } = useVirtualEnv();

  useEffect(() => {
    if (!showVariables) return;
    if (!activeSession) return;

    if (lastCachedVarsSessionIdRef.current === activeSession.id) return;
    lastCachedVarsSessionIdRef.current = activeSession.id;

    getCachedVariables(activeSession.id);
  }, [activeSession, getCachedVariables, showVariables]);

  useEffect(() => {
    if (selectedEnvPath || !workspace?.selectedEnvPath) return;
    setSelectedEnvPath(workspace.selectedEnvPath);
  }, [selectedEnvPath, workspace?.selectedEnvPath]);

  // Auto-connect to existing session for chat
  useEffect(() => {
    if (!autoConnect) return;

    if (chatSessionId) {
      const existingSession = getSessionForChat(chatSessionId);
      if (existingSession) {
        setActiveSession(existingSession.id);
        return;
      }
    }

    if (!workspace?.sessionId) return;
    if (lastRestoreAttemptRef.current === workspace.sessionId) return;

    lastRestoreAttemptRef.current = workspace.sessionId;
    void restoreSession(workspace.sessionId, surfaceId);
  }, [chatSessionId, autoConnect, getSessionForChat, restoreSession, setActiveSession, surfaceId, workspace?.sessionId]);

  // Load environments on mount
  useEffect(() => {
    refreshEnvironments();
  }, [refreshEnvironments]);

  // Connect to kernel
  const handleConnect = useCallback(async () => {
    if (!selectedEnvPath) return;

    clearError();
    const session = await createSession({
      name: `Notebook-${Date.now()}`,
      envPath: selectedEnvPath,
      autoInstallKernel: true,
    });

    if (session && chatSessionId) {
      mapChatToSession(chatSessionId, session.id, selectedEnvPath);
    }
  }, [selectedEnvPath, chatSessionId, createSession, mapChatToSession, clearError]);

  // Execute a single cell
  const handleCellExecute = useCallback(
    async (cellIndex: number, source: string) => {
      if (!activeSession) {
        return;
      }

      const result = await executeCell(cellIndex, source, activeSession.id);

      // Refresh variables after execution
      if (result && isExecutionSuccessful(result)) {
        refreshVariables(activeSession.id);
      }
      if (result && !isExecutionSuccessful(result) && result.error) {
        console.warn(`Cell ${cellIndex} failed (${formatExecutionTime(result.executionTimeMs)}):`, formatExecutionError(result.error));
      }

      return result;
    },
    [activeSession, executeCell, refreshVariables]
  );

  // Run all cells
  const handleRunAll = useCallback(async () => {
    if (!activeSession || !content) return;

    setIsRunningAll(true);
    try {
      // Parse notebook and extract code cells
      const notebook = JSON.parse(content);
      const codeCells = (
        notebook.cells as Array<{ cell_type: string; source: string | string[] }> | undefined
      )
        ?.map((cell, index) => ({ cell, index }))
        ?.filter(({ cell }) => cell.cell_type === 'code')
        ?.map(({ cell, index }) => ({
          index,
          source: Array.isArray(cell.source) ? cell.source.join('') : cell.source,
        }));

      if (codeCells && codeCells.length > 0) {
        for (const item of codeCells) {
          const result = await executeCell(item.index, item.source, activeSession.id);
          if (!result || !isExecutionSuccessful(result)) break;
        }
        refreshVariables(activeSession.id);
      }
    } catch (err) {
      console.error('Failed to run all cells:', err);
    } finally {
      setIsRunningAll(false);
    }
  }, [activeSession, content, executeCell, refreshVariables]);

  useEffect(() => {
    if (!activeSessionId || !onContentChange) return;
    if (!content) return;
    if (!sessionCells.length) return;

    const nextContent = syncNotebookContentWithSessionCells(content, sessionCells);

    if (nextContent === content) return;
    if (lastSyncedContentRef.current === nextContent) return;

    lastSyncedContentRef.current = nextContent;
    onContentChange(nextContent);
  }, [activeSessionId, content, onContentChange, sessionCells]);

  useEffect(() => {
    if (!content) return;

    upsertWorkspace(
      buildNotebookWorkspaceSnapshotInput({
        surfaceId,
        notebookContent: content,
        selectedEnvPath,
        activeSession,
        activeKernel,
        isDirty: false,
        recoveryStatus: workspace?.recoveryStatus ?? 'ready',
        recoveryError: error,
        lastExecutedAt: activeSession ? new Date().toISOString() : workspace?.lastExecutedAt ?? null,
      })
    );
  }, [
    surfaceId,
    content,
    selectedEnvPath,
    activeSession,
    activeKernel,
    workspace?.recoveryStatus,
    workspace?.lastExecutedAt,
    error,
    upsertWorkspace,
  ]);

  // Handle variable inspection
  const handleInspectVariable = useCallback(
    async (variableName: string) => {
      if (!activeSession) return;
      const result = await inspectVariable(variableName, activeSession.id);
      if (result) {
        loggers.ai.debug('Variable inspection', { result });
      }
    },
    [activeSession, inspectVariable]
  );

  return (
    <RendererErrorBoundary rendererName="InteractiveNotebook">
    <div className={cn('flex flex-col h-full', className)}>
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b bg-muted/30">
        {/* Environment selector */}
        {!activeSession && (
          <Select value={selectedEnvPath || ''} onValueChange={setSelectedEnvPath}>
            <SelectTrigger className="w-[200px] h-8 text-xs">
              <SelectValue placeholder={t('selectEnvironment')} />
            </SelectTrigger>
            <SelectContent>
              {environments.map((env: VirtualEnvInfo) => (
                <SelectItem key={env.id} value={env.path} className="text-xs">
                  {env.name} ({env.pythonVersion || 'Python'})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Connect button */}
        {!activeSession && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  onClick={handleConnect}
                  disabled={!selectedEnvPath || isCreatingSession}
                  className="h-8"
                >
                  {isCreatingSession ? (
                    <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                  ) : (
                    <Play className="h-3 w-3 mr-1.5" />
                  )}
                  {t('connect')}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('connectKernel')}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {/* Kernel status */}
        {activeSession && (
          <KernelStatus
            kernel={activeKernel}
            isConnecting={isCreatingSession}
            onRestart={() => restartKernel(activeSession.id)}
            onInterrupt={() => interruptKernel(activeSession.id)}
          />
        )}

        <div className="flex-1" />

        {/* Run all button */}
        {activeSession && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRunAll}
                  disabled={isExecuting || isRunningAll}
                  className="h-8"
                >
                  {isRunningAll ? (
                    <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                  ) : (
                    <PlayCircle className="h-3 w-3 mr-1.5" />
                  )}
                  {t('runAll')}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('runAll')}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      {/* Error display */}
      {error && (
        <Alert variant="destructive" className="mx-4 my-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!error && workspace?.recoveryStatus === 'needs_reconnect' && !activeSession && (
        <Alert className="mx-4 my-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{t('sessionReconnectRequired')}</AlertDescription>
        </Alert>
      )}

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Notebook */}
        <div className="flex-1 overflow-hidden">
          <JupyterRenderer
            content={content}
            onCellExecute={activeSession ? handleCellExecute : undefined}
            onNotebookChange={onContentChange}
            showToolbar={true}
          />
        </div>

        {/* Variables panel */}
        {showVariables && activeSession && (
          <div className="w-[280px] border-l overflow-hidden">
            <VariableInspector
              variables={variables}
              isLoading={variablesLoading}
              onRefresh={() => refreshVariables(activeSession.id)}
              onInspect={handleInspectVariable}
            />
          </div>
        )}
      </div>
    </div>
    </RendererErrorBoundary>
  );
}

