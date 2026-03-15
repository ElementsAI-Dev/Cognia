/**
 * @jest-environment jsdom
 */

import { render, screen, waitFor } from '@testing-library/react';

jest.mock('next/link', () => {
  return function MockLink({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) {
    return <a href={href}>{children}</a>;
  };
});

jest.mock('next/navigation', () => ({
  useSearchParams: () => ({
    get: jest.fn(() => null),
  }),
}));

jest.mock('next-intl', () => ({
  NextIntlClientProvider: ({ children }: { children: React.ReactNode }) => children,
  useTranslations: () => (key: string) => key,
}));

jest.mock('@/components/jupyter', () => ({
  InteractiveNotebook: () => <div data-testid="interactive-notebook" />,
  KernelStatus: () => <div data-testid="kernel-status" />,
  VariableInspector: () => <div data-testid="variable-inspector" />,
}));

jest.mock('@/components/ui/resizable', () => ({
  ResizablePanelGroup: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="resizable-group">{children}</div>
  ),
  ResizablePanel: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="resizable-panel">{children}</div>
  ),
  ResizableHandle: () => <div data-testid="resizable-handle" />,
}));

const mockRestoreSession = jest.fn();
const mockUseJupyterStore = jest.fn();

jest.mock('@/hooks/jupyter', () => ({
  useJupyterKernel: () => ({
    sessions: [],
    kernels: [],
    activeSession: undefined,
    activeKernel: null,
    isExecuting: false,
    executingCellIndex: null,
    lastResult: null,
    variables: [],
    variablesLoading: false,
    isCreatingSession: false,
    isLoadingSessions: false,
    error: null,
    createSession: jest.fn(),
    deleteSession: jest.fn(),
    setActiveSession: jest.fn(),
    refreshSessions: jest.fn(),
    restoreSession: mockRestoreSession,
    restartKernel: jest.fn(),
    interruptKernel: jest.fn(),
    execute: jest.fn(),
    quickExecute: jest.fn(),
    refreshVariables: jest.fn(),
    inspectVariable: jest.fn(),
    prepareNotebookEnvironment: jest.fn(),
    checkKernelAvailable: jest.fn(),
    ensureKernel: jest.fn(),
    shutdownAll: jest.fn(),
    cleanup: jest.fn(),
    clearError: jest.fn(),
    updateSession: jest.fn(),
    clearVariables: jest.fn(),
    clearExecutionHistory: jest.fn(),
    getNotebookInfo: jest.fn(),
    unmapChatSession: jest.fn(),
  }),
}));

jest.mock('@/hooks/sandbox', () => ({
  useVirtualEnv: () => ({
    environments: [{ name: 'Python 3.10', path: '/envs/python', pythonVersion: '3.10.0' }],
    refreshEnvironments: jest.fn(),
  }),
}));

jest.mock('@/stores/jupyter', () => ({
  useExecutionState: () => ({
    isExecuting: false,
    executingCellIndex: null,
    lastResult: null,
  }),
  useJupyterSessionForChat: () => null,
  useJupyterStore: (selector: (state: unknown) => unknown) => mockUseJupyterStore(selector),
}));

jest.mock('@/lib/utils', () => ({
  cn: (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(' '),
  isTauri: () => true,
}));

const NotebookPage = require('./page').default as typeof import('./page').default;

describe('NotebookPage workspace restoration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const workspace = {
      surfaceId: 'notebook-page',
      sessionId: 'session-restore-1',
      kernelId: 'kernel-1',
      selectedEnvPath: '/envs/python',
      filePath: 'C:/notebooks/restored.ipynb',
      notebookContent: '{"cells":[],"metadata":{},"nbformat":4,"nbformat_minor":5}',
      isDirty: true,
      recoveryStatus: 'ready',
      recoveryError: null,
      lastSavedAt: null,
      lastExecutedAt: null,
      updatedAt: '2026-03-14T10:00:00.000Z',
      createdAt: '2026-03-14T10:00:00.000Z',
      hasInlineContent: true,
      contentSizeBytes: 64,
      fileInfo: null,
    };

    mockUseJupyterStore.mockImplementation((selector: (state: unknown) => unknown) =>
      selector({
        workspaces: {
          'notebook-page': workspace,
        },
        upsertWorkspace: jest.fn(),
      })
    );
  });

  it('restores persisted workspace metadata and attempts session recovery', async () => {
    render(<NotebookPage />);

    await waitFor(() => {
      expect(mockRestoreSession).toHaveBeenCalledWith('session-restore-1', 'notebook-page');
    });

    await waitFor(() => {
      expect(screen.getByText('restored.ipynb')).toBeInTheDocument();
    });

    expect(screen.getByText('unsavedChanges')).toBeInTheDocument();
  });

  it('shows reconnect guidance for restored workspaces that lost their session', async () => {
    mockUseJupyterStore.mockImplementation((selector: (state: unknown) => unknown) =>
      selector({
        workspaces: {
          'notebook-page': {
            surfaceId: 'notebook-page',
            sessionId: 'session-restore-1',
            kernelId: null,
            selectedEnvPath: '/envs/python',
            filePath: 'C:/notebooks/restored.ipynb',
            notebookContent: '{"cells":[],"metadata":{},"nbformat":4,"nbformat_minor":5}',
            isDirty: false,
            recoveryStatus: 'needs_reconnect',
            recoveryError: 'Kernel died',
            lastSavedAt: '2026-03-14T10:30:00.000Z',
            lastExecutedAt: null,
            updatedAt: '2026-03-14T10:31:00.000Z',
            createdAt: '2026-03-14T10:00:00.000Z',
            hasInlineContent: true,
            contentSizeBytes: 64,
            fileInfo: null,
          },
        },
        upsertWorkspace: jest.fn(),
      })
    );

    render(<NotebookPage />);

    await waitFor(() => {
      expect(screen.getByText('reconnectRequired')).toBeInTheDocument();
    });
    expect(screen.getByText('saved')).toBeInTheDocument();
  });
});
