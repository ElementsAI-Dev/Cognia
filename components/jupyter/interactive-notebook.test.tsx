/**
 * InteractiveNotebook Component Tests
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';

// Mock the hooks
jest.mock('@/hooks/jupyter', () => ({
  useJupyterKernel: jest.fn(),
}));

jest.mock('@/hooks/sandbox', () => ({
  useVirtualEnv: jest.fn(),
}));

jest.mock('@/stores/jupyter', () => ({
  useJupyterStore: jest.fn(),
}));

// Mock child components
jest.mock('./kernel-status', () => ({
  KernelStatus: ({
    kernel: _kernel,
    onRestart,
    onInterrupt,
  }: {
    kernel: unknown;
    onRestart?: () => void;
    onInterrupt?: () => void;
  }) => (
    <div data-testid="kernel-status">
      <span>Kernel Status Mock</span>
      {onRestart && <button onClick={onRestart}>Restart</button>}
      {onInterrupt && <button onClick={onInterrupt}>Interrupt</button>}
    </div>
  ),
}));

jest.mock('./variable-inspector', () => ({
  VariableInspector: ({
    variables,
    onRefresh,
    onInspect,
  }: {
    variables: unknown[];
    onRefresh?: () => void;
    onInspect?: (name: string) => void;
  }) => (
    <div data-testid="variable-inspector">
      <span>Variables: {(variables as unknown[]).length}</span>
      {onRefresh && <button onClick={onRefresh}>Refresh Variables</button>}
      {onInspect && <button onClick={() => onInspect('test_var')}>Inspect</button>}
    </div>
  ),
}));

jest.mock('@/components/artifacts/jupyter-renderer', () => ({
  JupyterRenderer: ({
    content: _content,
    onCellExecute,
    onNotebookChange,
  }: {
    content: string;
    onCellExecute?: (index: number, source: string) => void;
    onNotebookChange?: (content: string) => void;
  }) => (
    <div data-testid="jupyter-renderer">
      <span>Notebook Content</span>
      {onCellExecute && (
        <button onClick={() => onCellExecute(0, 'print("test")')}>Execute Cell</button>
      )}
      {onNotebookChange && (
        <button onClick={() => onNotebookChange('updated content')}>Change Notebook</button>
      )}
    </div>
  ),
}));

import { useJupyterKernel } from '@/hooks/jupyter';
import { useVirtualEnv } from '@/hooks/sandbox';
import { useJupyterStore } from '@/stores/jupyter';

import { InteractiveNotebook } from './interactive-notebook';

const mockUseJupyterKernel = useJupyterKernel as jest.Mock;
const mockUseVirtualEnv = useVirtualEnv as jest.Mock;
const mockUseJupyterStore = useJupyterStore as unknown as jest.Mock;

// Messages for testing
const messages = {
  jupyter: {
    selectEnvironment: 'Select environment',
    connect: 'Connect',
    runAll: 'Run All',
    variables: 'Variables',
    noKernel: 'No kernel',
    connecting: 'Connecting...',
    interrupt: 'Interrupt',
    restart: 'Restart',
  },
};

const renderWithIntl = (ui: React.ReactElement) => {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>
  );
};

const sampleNotebook = JSON.stringify({
  cells: [
    {
      cell_type: 'code',
      source: 'print("Hello")',
      outputs: [],
      execution_count: null,
      metadata: {},
    },
  ],
  metadata: {
    kernelspec: { name: 'python3' },
  },
  nbformat: 4,
  nbformat_minor: 5,
});

const createMockKernelHook = (overrides = {}): unknown => ({
  activeSession: null,
  activeKernel: null,
  isExecuting: false,
  variables: [],
  variablesLoading: false,
  error: null,
  isCreatingSession: false,
  createSession: jest.fn().mockResolvedValue({ id: 'session-1' }),
  setActiveSession: jest.fn(),
  executeCell: jest.fn().mockResolvedValue({ success: true }),
  restartKernel: jest.fn(),
  interruptKernel: jest.fn(),
  refreshVariables: jest.fn(),
  getCachedVariables: jest.fn().mockResolvedValue([]),
  inspectVariable: jest.fn(),
  getSessionForChat: jest.fn().mockReturnValue(null),
  mapChatToSession: jest.fn(),
  clearError: jest.fn(),
  ...overrides,
});

const createMockVirtualEnvHook = (overrides = {}): unknown => ({
  environments: [
    { id: 'env-1', name: 'Python 3.10', path: '/path/to/env', pythonVersion: '3.10.0' },
    { id: 'env-2', name: 'Data Science', path: '/path/to/ds-env', pythonVersion: '3.9.0' },
  ],
  refreshEnvironments: jest.fn(),
  ...overrides,
});

describe('InteractiveNotebook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseJupyterKernel.mockReturnValue(createMockKernelHook());
    mockUseVirtualEnv.mockReturnValue(createMockVirtualEnvHook());
    mockUseJupyterStore.mockImplementation(
      (selector: (state: { cells: Map<string, unknown> }) => unknown) => {
        return selector({ cells: new Map() });
      }
    );
  });

  describe('initial rendering', () => {
    it('should render the notebook component', () => {
      renderWithIntl(<InteractiveNotebook content={sampleNotebook} />);

      expect(screen.getByTestId('jupyter-renderer')).toBeInTheDocument();
    });

    it('should render environment selector when no session is active', () => {
      renderWithIntl(<InteractiveNotebook content={sampleNotebook} />);

      expect(screen.getByText('Select environment')).toBeInTheDocument();
    });

    it('should render connect button when no session is active', () => {
      renderWithIntl(<InteractiveNotebook content={sampleNotebook} />);

      expect(screen.getByRole('button', { name: /connect/i })).toBeInTheDocument();
    });

    it('should load environments on mount', () => {
      const refreshEnvironments = jest.fn();
      mockUseVirtualEnv.mockReturnValue(createMockVirtualEnvHook({ refreshEnvironments }));

      renderWithIntl(<InteractiveNotebook content={sampleNotebook} />);

      expect(refreshEnvironments).toHaveBeenCalled();
    });
  });

  describe('environment selection', () => {
    it('should disable connect button when no environment is selected', () => {
      renderWithIntl(<InteractiveNotebook content={sampleNotebook} />);

      const connectButton = screen.getByRole('button', { name: /connect/i });
      expect(connectButton).toBeDisabled();
    });

    it('should render environment selector combobox', () => {
      renderWithIntl(<InteractiveNotebook content={sampleNotebook} />);

      // Environment selector should be present as a combobox
      const trigger = screen.getByRole('combobox');
      expect(trigger).toBeInTheDocument();
    });
  });

  describe('connecting to kernel', () => {
    it('should show loading state when creating session', () => {
      mockUseJupyterKernel.mockReturnValue(createMockKernelHook({ isCreatingSession: true }));

      renderWithIntl(<InteractiveNotebook content={sampleNotebook} />);

      const connectButton = screen.getByRole('button', { name: /connect/i });
      expect(connectButton).toBeDisabled();
      expect(connectButton.querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('should have createSession function available from hook', () => {
      const createSession = jest.fn().mockResolvedValue({ id: 'session-1' });
      mockUseJupyterKernel.mockReturnValue(createMockKernelHook({ createSession }));

      renderWithIntl(<InteractiveNotebook content={sampleNotebook} />);

      // Verify the component renders with the connect button
      const connectButton = screen.getByRole('button', { name: /connect/i });
      expect(connectButton).toBeInTheDocument();
      // Connect button is disabled until environment is selected
      expect(connectButton).toBeDisabled();
    });

    it('should render with chatSessionId prop', () => {
      const mapChatToSession = jest.fn();
      const createSession = jest.fn().mockResolvedValue({ id: 'session-1' });
      mockUseJupyterKernel.mockReturnValue(
        createMockKernelHook({ createSession, mapChatToSession })
      );

      renderWithIntl(<InteractiveNotebook content={sampleNotebook} chatSessionId="chat-123" />);

      // Component should render with environment selector
      expect(screen.getByRole('combobox')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /connect/i })).toBeInTheDocument();
    });
  });

  describe('active session state', () => {
    const activeSessionMock = {
      activeSession: { id: 'session-1', name: 'Test Session' },
      activeKernel: { id: 'kernel-1', status: 'idle' },
    };

    it('should hide environment selector when session is active', () => {
      mockUseJupyterKernel.mockReturnValue(createMockKernelHook(activeSessionMock));

      renderWithIntl(<InteractiveNotebook content={sampleNotebook} />);

      expect(screen.queryByText('Select environment')).not.toBeInTheDocument();
    });

    it('should show kernel status when session is active', () => {
      mockUseJupyterKernel.mockReturnValue(createMockKernelHook(activeSessionMock));

      renderWithIntl(<InteractiveNotebook content={sampleNotebook} />);

      expect(screen.getByTestId('kernel-status')).toBeInTheDocument();
    });

    it('should show run all button when session is active', () => {
      mockUseJupyterKernel.mockReturnValue(createMockKernelHook(activeSessionMock));

      renderWithIntl(<InteractiveNotebook content={sampleNotebook} />);

      expect(screen.getByRole('button', { name: /run all/i })).toBeInTheDocument();
    });

    it('should show variable inspector when showVariables is true', () => {
      mockUseJupyterKernel.mockReturnValue(createMockKernelHook(activeSessionMock));

      renderWithIntl(<InteractiveNotebook content={sampleNotebook} showVariables={true} />);

      expect(screen.getByTestId('variable-inspector')).toBeInTheDocument();
    });

    it('should hide variable inspector when showVariables is false', () => {
      mockUseJupyterKernel.mockReturnValue(createMockKernelHook(activeSessionMock));

      renderWithIntl(<InteractiveNotebook content={sampleNotebook} showVariables={false} />);

      expect(screen.queryByTestId('variable-inspector')).not.toBeInTheDocument();
    });
  });

  describe('cell execution', () => {
    const activeSessionMock = {
      activeSession: { id: 'session-1', name: 'Test Session' },
      activeKernel: { id: 'kernel-1', status: 'idle' },
    };

    it('should execute cell and refresh variables on success', async () => {
      const executeCell = jest.fn().mockResolvedValue({ success: true });
      const refreshVariables = jest.fn();
      mockUseJupyterKernel.mockReturnValue(
        createMockKernelHook({ ...activeSessionMock, executeCell, refreshVariables })
      );

      renderWithIntl(<InteractiveNotebook content={sampleNotebook} />);

      // Find and click the execute cell button in the mock renderer
      const executeButton = screen.getByRole('button', { name: 'Execute Cell' });
      fireEvent.click(executeButton);

      await waitFor(() => {
        expect(executeCell).toHaveBeenCalledWith(0, 'print("test")', 'session-1');
      });

      await waitFor(() => {
        expect(refreshVariables).toHaveBeenCalledWith('session-1');
      });
    });

    it('should not refresh variables on failed execution', async () => {
      const executeCell = jest.fn().mockResolvedValue({ success: false });
      const refreshVariables = jest.fn();
      mockUseJupyterKernel.mockReturnValue(
        createMockKernelHook({ ...activeSessionMock, executeCell, refreshVariables })
      );

      renderWithIntl(<InteractiveNotebook content={sampleNotebook} />);

      const executeButton = screen.getByRole('button', { name: 'Execute Cell' });
      fireEvent.click(executeButton);

      await waitFor(() => {
        expect(executeCell).toHaveBeenCalled();
      });

      // refreshVariables should not be called
      expect(refreshVariables).not.toHaveBeenCalled();
    });
  });

  describe('run all cells', () => {
    const activeSessionMock = {
      activeSession: { id: 'session-1', name: 'Test Session' },
      activeKernel: { id: 'kernel-1', status: 'idle' },
    };

    it('should disable run all button when executing', () => {
      mockUseJupyterKernel.mockReturnValue(
        createMockKernelHook({ ...activeSessionMock, isExecuting: true })
      );

      renderWithIntl(<InteractiveNotebook content={sampleNotebook} />);

      const runAllButton = screen.getByRole('button', { name: /run all/i });
      expect(runAllButton).toBeDisabled();
    });

    it('should execute all code cells when run all is clicked', async () => {
      const executeCell = jest.fn().mockResolvedValue({ success: true });
      const refreshVariables = jest.fn();
      mockUseJupyterKernel.mockReturnValue(
        createMockKernelHook({ ...activeSessionMock, executeCell, refreshVariables })
      );

      renderWithIntl(<InteractiveNotebook content={sampleNotebook} />);

      const runAllButton = screen.getByRole('button', { name: /run all/i });
      fireEvent.click(runAllButton);

      await waitFor(() => {
        expect(executeCell).toHaveBeenCalled();
      });
    });
  });

  describe('error handling', () => {
    it('should display error message when error exists', () => {
      mockUseJupyterKernel.mockReturnValue(createMockKernelHook({ error: 'Connection failed' }));

      renderWithIntl(<InteractiveNotebook content={sampleNotebook} />);

      expect(screen.getByText('Connection failed')).toBeInTheDocument();
    });

    it('should have clearError function available', () => {
      const clearError = jest.fn();
      mockUseJupyterKernel.mockReturnValue(createMockKernelHook({ clearError }));

      renderWithIntl(<InteractiveNotebook content={sampleNotebook} />);

      // Component renders with connect button
      expect(screen.getByRole('button', { name: /connect/i })).toBeInTheDocument();
    });
  });

  describe('auto-connect', () => {
    it('should auto-connect to existing session for chat when autoConnect is true', () => {
      const existingSession = { id: 'existing-session' };
      const setActiveSession = jest.fn();
      const getSessionForChat = jest.fn().mockReturnValue(existingSession);

      mockUseJupyterKernel.mockReturnValue(
        createMockKernelHook({ setActiveSession, getSessionForChat })
      );

      renderWithIntl(
        <InteractiveNotebook content={sampleNotebook} chatSessionId="chat-123" autoConnect={true} />
      );

      expect(getSessionForChat).toHaveBeenCalledWith('chat-123');
      expect(setActiveSession).toHaveBeenCalledWith('existing-session');
    });

    it('should not auto-connect when autoConnect is false', () => {
      const setActiveSession = jest.fn();
      const getSessionForChat = jest.fn().mockReturnValue({ id: 'existing-session' });

      mockUseJupyterKernel.mockReturnValue(
        createMockKernelHook({ setActiveSession, getSessionForChat })
      );

      renderWithIntl(
        <InteractiveNotebook
          content={sampleNotebook}
          chatSessionId="chat-123"
          autoConnect={false}
        />
      );

      expect(setActiveSession).not.toHaveBeenCalled();
    });
  });

  describe('kernel controls', () => {
    const activeSessionMock = {
      activeSession: { id: 'session-1', name: 'Test Session' },
      activeKernel: { id: 'kernel-1', status: 'idle' },
    };

    it('should call restartKernel when restart is triggered', () => {
      const restartKernel = jest.fn();
      mockUseJupyterKernel.mockReturnValue(
        createMockKernelHook({ ...activeSessionMock, restartKernel })
      );

      renderWithIntl(<InteractiveNotebook content={sampleNotebook} />);

      // The KernelStatus mock has a Restart button
      const restartButton = screen.getByRole('button', { name: 'Restart' });
      fireEvent.click(restartButton);

      expect(restartKernel).toHaveBeenCalledWith('session-1');
    });

    it('should call interruptKernel when interrupt is triggered', () => {
      const interruptKernel = jest.fn();
      mockUseJupyterKernel.mockReturnValue(
        createMockKernelHook({ ...activeSessionMock, interruptKernel })
      );

      renderWithIntl(<InteractiveNotebook content={sampleNotebook} />);

      // The KernelStatus mock has an Interrupt button
      const interruptButton = screen.getByRole('button', { name: 'Interrupt' });
      fireEvent.click(interruptButton);

      expect(interruptKernel).toHaveBeenCalledWith('session-1');
    });
  });

  describe('variable inspection', () => {
    const activeSessionMock = {
      activeSession: { id: 'session-1', name: 'Test Session' },
      activeKernel: { id: 'kernel-1', status: 'idle' },
      variables: [{ name: 'test_var', type: 'int', value: '42', size: null }],
    };

    it('should prefetch cached variables when session is active', async () => {
      const getCachedVariables = jest.fn().mockResolvedValue([]);
      mockUseJupyterKernel.mockReturnValue(
        createMockKernelHook({ ...activeSessionMock, getCachedVariables })
      );

      renderWithIntl(<InteractiveNotebook content={sampleNotebook} showVariables={true} />);

      await waitFor(() => {
        expect(getCachedVariables).toHaveBeenCalledWith('session-1');
      });
    });

    it('should refresh variables when refresh is triggered', () => {
      const refreshVariables = jest.fn();
      mockUseJupyterKernel.mockReturnValue(
        createMockKernelHook({ ...activeSessionMock, refreshVariables })
      );

      renderWithIntl(<InteractiveNotebook content={sampleNotebook} showVariables={true} />);

      const refreshButton = screen.getByRole('button', { name: 'Refresh Variables' });
      fireEvent.click(refreshButton);

      expect(refreshVariables).toHaveBeenCalledWith('session-1');
    });

    it('should call inspectVariable when inspect is triggered', async () => {
      const inspectVariable = jest.fn().mockResolvedValue({ value: 'detailed info' });
      mockUseJupyterKernel.mockReturnValue(
        createMockKernelHook({ ...activeSessionMock, inspectVariable })
      );

      renderWithIntl(<InteractiveNotebook content={sampleNotebook} showVariables={true} />);

      const inspectButton = screen.getByRole('button', { name: 'Inspect' });
      fireEvent.click(inspectButton);

      await waitFor(() => {
        expect(inspectVariable).toHaveBeenCalledWith('test_var', 'session-1');
      });
    });
  });

  describe('content changes', () => {
    it('should call onContentChange when notebook content changes', () => {
      const onContentChange = jest.fn();
      mockUseJupyterKernel.mockReturnValue(createMockKernelHook());

      renderWithIntl(
        <InteractiveNotebook content={sampleNotebook} onContentChange={onContentChange} />
      );

      // The JupyterRenderer mock has a Change Notebook button
      const changeButton = screen.getByRole('button', { name: 'Change Notebook' });
      fireEvent.click(changeButton);

      expect(onContentChange).toHaveBeenCalledWith('updated content');
    });

    it('should sync store cell outputs into notebook content', async () => {
      const onContentChange = jest.fn();
      const activeSessionMock = {
        activeSession: { id: 'session-1', name: 'Test Session' },
        activeKernel: { id: 'kernel-1', status: 'idle' },
      };

      mockUseJupyterKernel.mockReturnValue(createMockKernelHook(activeSessionMock));

      mockUseJupyterStore.mockImplementation(
        (selector: (state: { cells: Map<string, unknown> }) => unknown) => {
          const cells = new Map<string, unknown>();
          cells.set('session-1', [
            {
              id: 'c1',
              type: 'code',
              source: 'print("Hello")',
              executionState: 'success',
              executionCount: 1,
              outputs: [{ outputType: 'stream', name: 'stdout', text: 'ok' }],
              metadata: {},
            },
          ]);
          return selector({ cells });
        }
      );

      renderWithIntl(
        <InteractiveNotebook content={sampleNotebook} onContentChange={onContentChange} />
      );

      await waitFor(() => {
        expect(onContentChange).toHaveBeenCalled();
      });

      const updated = onContentChange.mock.calls[0]?.[0] as string;
      const parsed = JSON.parse(updated) as {
        cells: Array<{ outputs?: unknown[]; execution_count?: number | null }>;
      };
      expect(parsed.cells[0].execution_count).toBe(1);
      expect(parsed.cells[0].outputs).toBeDefined();

      const firstOutput = (parsed.cells[0].outputs ?? [])[0] as {
        output_type?: string;
        name?: string;
        text?: string;
      };
      expect(firstOutput.output_type).toBe('stream');
      expect(firstOutput.name).toBe('stdout');
      expect(firstOutput.text).toBe('ok');
    });
  });

  describe('custom className', () => {
    it('should apply custom className', () => {
      const { container } = renderWithIntl(
        <InteractiveNotebook content={sampleNotebook} className="custom-class" />
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });
  });
});
