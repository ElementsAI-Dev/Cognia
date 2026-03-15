import { applyCellsToNotebook } from './notebook-utils';
import { serializeNotebook } from './parser';
import type {
  ExecutableCell,
  JupyterSession,
  KernelInfo,
  NotebookFileInfo,
  NotebookWorkspaceRecoveryStatus,
  NotebookWorkspaceSnapshotInput,
} from '@/types/jupyter';
import type { JupyterNotebook } from '@/types';

export const NOTEBOOK_PAGE_WORKSPACE_SURFACE_ID = 'notebook-page';
export const DEFAULT_INTERACTIVE_NOTEBOOK_SURFACE_ID = 'interactive-notebook';

interface BuildNotebookWorkspaceSnapshotInputArgs {
  surfaceId: string;
  notebookContent: string;
  selectedEnvPath: string | null;
  filePath?: string | null;
  isDirty?: boolean;
  activeSession?: Pick<JupyterSession, 'id' | 'envPath'> | null;
  activeKernel?: Pick<KernelInfo, 'id'> | null;
  fileInfo?: NotebookFileInfo | null;
  recoveryStatus?: NotebookWorkspaceRecoveryStatus;
  recoveryError?: string | null;
  lastSavedAt?: string | null;
  lastExecutedAt?: string | null;
}

export function getInteractiveNotebookSurfaceId(chatSessionId?: string): string {
  return chatSessionId
    ? `chat:${chatSessionId}`
    : DEFAULT_INTERACTIVE_NOTEBOOK_SURFACE_ID;
}

export function buildNotebookWorkspaceSnapshotInput({
  surfaceId,
  notebookContent,
  selectedEnvPath,
  filePath = null,
  isDirty = false,
  activeSession,
  activeKernel,
  fileInfo = null,
  recoveryStatus = 'ready',
  recoveryError = null,
  lastSavedAt = null,
  lastExecutedAt = null,
}: BuildNotebookWorkspaceSnapshotInputArgs): NotebookWorkspaceSnapshotInput {
  return {
    surfaceId,
    sessionId: activeSession?.id ?? null,
    kernelId: activeKernel?.id ?? null,
    selectedEnvPath: selectedEnvPath ?? activeSession?.envPath ?? null,
    filePath,
    notebookContent,
    isDirty,
    recoveryStatus,
    recoveryError,
    lastSavedAt,
    lastExecutedAt,
    fileInfo,
  };
}

export function syncNotebookContentWithSessionCells(
  content: string,
  sessionCells: ExecutableCell[]
): string {
  if (!content || sessionCells.length === 0) {
    return content;
  }

  try {
    const notebook = JSON.parse(content) as JupyterNotebook;
    return serializeNotebook(applyCellsToNotebook(notebook, sessionCells));
  } catch {
    return content;
  }
}
