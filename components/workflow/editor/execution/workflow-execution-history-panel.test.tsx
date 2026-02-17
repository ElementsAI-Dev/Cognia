import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { WorkflowExecutionHistoryPanel } from './workflow-execution-history-panel';

const mockGetExecutions = jest.fn();
const mockDeleteExecution = jest.fn();
const mockReplayExecution = jest.fn();
const mockStartExecution = jest.fn();
const mockToastError = jest.fn();
const mockToastSuccess = jest.fn();

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

jest.mock('@/lib/db/repositories', () => ({
  workflowRepository: {
    getExecutions: (...args: unknown[]) => mockGetExecutions(...args),
    deleteExecution: (...args: unknown[]) => mockDeleteExecution(...args),
  },
}));

jest.mock('sonner', () => ({
  toast: {
    error: (...args: unknown[]) => mockToastError(...args),
    success: (...args: unknown[]) => mockToastSuccess(...args),
  },
}));

jest.mock('@/stores/workflow', () => ({
  useWorkflowEditorStore: () => ({
    currentWorkflow: { id: 'wf-1' },
    startExecution: mockStartExecution,
    replayExecution: mockReplayExecution,
  }),
}));

jest.mock('@/components/ui/select', () => require('@/components/workflow/editor/panels/node-config/test-support/ui-mocks').selectMock);
jest.mock('@/components/ui/collapsible', () => ({
  Collapsible: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CollapsibleTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CollapsibleContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
jest.mock('@/components/ui/alert-dialog', () => ({
  AlertDialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogCancel: ({ children }: { children: React.ReactNode }) => <button type="button">{children}</button>,
  AlertDialogAction: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button type="button" onClick={onClick}>{children}</button>
  ),
}));

describe('WorkflowExecutionHistoryPanel', () => {
  const execution = {
    id: 'exec-1',
    workflowId: 'wf-1',
    status: 'completed',
    input: { a: 1 },
    output: { b: 2 },
    logs: [{ timestamp: new Date('2026-01-01T00:00:00.000Z'), level: 'info', message: 'ok' }],
    startedAt: new Date('2026-01-01T00:00:00.000Z'),
    completedAt: new Date('2026-01-01T00:00:02.000Z'),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetExecutions.mockResolvedValue([execution]);
    mockDeleteExecution.mockResolvedValue(true);
  });

  it('loads and displays executions', async () => {
    render(<WorkflowExecutionHistoryPanel workflowId="wf-1" />);

    await waitFor(() => expect(mockGetExecutions).toHaveBeenCalledWith('wf-1', 100));
    expect(await screen.findByText('completed')).toBeInTheDocument();
    expect(screen.getByText('executionHistory')).toBeInTheDocument();
  });

  it('reruns execution via replayExecution for persisted records', async () => {
    render(<WorkflowExecutionHistoryPanel workflowId="wf-1" />);
    const rerunButton = await screen.findByRole('button', { name: 'rerunWithSameInput' });

    fireEvent.click(rerunButton);
    expect(mockReplayExecution).toHaveBeenCalledWith('exec-1');
  });

  it('uses startExecution when execution id is empty', async () => {
    mockGetExecutions.mockResolvedValueOnce([{ ...execution, id: '' }]);
    render(<WorkflowExecutionHistoryPanel workflowId="wf-1" />);

    const rerunButton = await screen.findByRole('button', { name: 'rerunWithSameInput' });
    fireEvent.click(rerunButton);

    expect(mockStartExecution).toHaveBeenCalledWith({ a: 1 });
    expect(mockReplayExecution).not.toHaveBeenCalled();
  });

  it('deletes execution and handles repository errors', async () => {
    render(<WorkflowExecutionHistoryPanel workflowId="wf-1" />);
    await screen.findByText('completed');

    const deleteButtons = screen.getAllByRole('button', { name: 'deleteExecution' });
    fireEvent.click(deleteButtons[0]);
    fireEvent.click(deleteButtons[deleteButtons.length - 1]);
    await waitFor(() => expect(mockDeleteExecution).toHaveBeenCalledWith('exec-1'));

    mockGetExecutions.mockRejectedValueOnce(new Error('load fail'));
    render(<WorkflowExecutionHistoryPanel workflowId="wf-1" />);
    await waitFor(() => expect(mockToastError).toHaveBeenCalled());
  });
});
