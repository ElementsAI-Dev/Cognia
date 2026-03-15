/**
 * @jest-environment jsdom
 */
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const mockRouterPush = jest.fn();
const mockSearchParamGet = jest.fn(() => 'workflow-1');
const mockLoadWorkflow = jest.fn();
const mockSaveWorkflow = jest.fn();
const mockExecuteWorkflow = jest.fn();
const mockPauseExecution = jest.fn();
const mockResumeExecution = jest.fn();
const mockCancelExecution = jest.fn();
const mockValidate = jest.fn();

const mockWorkflow = {
  id: 'workflow-1',
  name: 'Test Workflow',
  description: 'Workflow description',
  icon: 'Workflow',
  category: 'custom',
  nodes: [],
  edges: [],
  inputs: {},
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

const mockWorkflowEditorState = {
  currentWorkflow: mockWorkflow,
  isExecuting: false,
  isDirty: true,
  editorLifecycleState: 'dirty',
  executionState: null,
  validationErrors: [],
  createWorkflow: jest.fn(),
  loadWorkflow: mockLoadWorkflow,
  saveWorkflow: mockSaveWorkflow,
  executeWorkflow: mockExecuteWorkflow,
  pauseExecution: mockPauseExecution,
  resumeExecution: mockResumeExecution,
  cancelExecution: mockCancelExecution,
  validate: mockValidate,
  exportWorkflow: jest.fn(),
  importWorkflow: jest.fn(),
};

const mockGetAll = jest.fn(async () => []);
const mockGetById = jest.fn(async () => mockWorkflow);

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockRouterPush }),
  useSearchParams: () => ({ get: mockSearchParamGet }),
}));

jest.mock('@/hooks/designer/use-workflow-editor', () => ({
  useWorkflowEditor: () => mockWorkflowEditorState,
}));

jest.mock('@/hooks/designer/use-workflow-execution', () => ({
  useWorkflowExecutionWithKeyboard: jest.fn(),
}));

jest.mock('@/lib/db/repositories', () => ({
  workflowRepository: {
    getAll: mockGetAll,
    getById: mockGetById,
    duplicate: jest.fn(),
    delete: jest.fn(),
    export: jest.fn(),
    import: jest.fn(),
  },
}));

jest.mock('@/components/workflow/editor', () => ({
  WorkflowEditorPanel: () => <div data-testid="workflow-editor-panel" />,
}));

jest.mock('@/components/workflow/marketplace/template-browser', () => ({
  TemplateBrowser: () => <div data-testid="template-browser" />,
}));

jest.mock('@/components/layout/feedback/empty-state', () => ({
  EmptyState: ({ title }: { title: string }) => <div>{title}</div>,
}));

jest.mock('@/components/scheduler', () => ({
  WorkflowScheduleDialog: ({ trigger }: { trigger: React.ReactNode }) => <div>{trigger}</div>,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/alert', () => ({
  Alert: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/ui/input-group', () => ({
  InputGroup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  InputGroupAddon: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  InputGroupInput: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}));

jest.mock('@/components/ui/card', () => ({
  Card: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <div onClick={onClick}>{children}</div>
  ),
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
  DropdownMenuSeparator: () => <hr />,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/ui/alert-dialog', () => ({
  AlertDialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogAction: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
  AlertDialogCancel: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
  AlertDialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/lib/workflow-editor/templates', () => ({
  workflowEditorTemplates: [],
  getTemplateCategories: () => [],
}));

jest.mock('@/lib/workflow-editor/converter', () => ({
  definitionToVisual: jest.fn(),
}));

jest.mock('@/lib/workflow-editor', () => ({
  getWorkflowExecutionControlsSummary: ({
    hasWorkflow,
    isExecuting,
    status,
    validationErrors,
  }: {
    hasWorkflow: boolean;
    isExecuting: boolean;
    status?: string;
    validationErrors: Array<{ severity?: string; blocking?: boolean }>;
  }) => {
    const hasBlockingErrors = validationErrors.some(
      (error) => error.blocking ?? (error.severity !== 'warning' && error.severity !== 'info')
    );
    return {
      canRun: hasWorkflow && !isExecuting && !hasBlockingErrors,
      canPause: isExecuting && status === 'running',
      canResume: isExecuting && status === 'paused',
      canCancel: isExecuting && Boolean(status) && status !== 'completed' && status !== 'failed',
      runReason: hasBlockingErrors ? 'Validation errors present' : undefined,
      runRecoveryHint: hasBlockingErrors ? 'Fix validation errors and retry' : undefined,
    };
  },
  getWorkflowLifecycleLabel: (state: string) => {
    if (state === 'saving') return 'Saving...';
    if (state === 'saveFailed') return 'Save failed';
    if (state === 'publishBlocked') return 'Publish blocked';
    if (state === 'readyToPublish') return 'Ready to publish';
    if (state === 'dirty') return 'Unsaved changes';
    return 'Saved';
  },
  getWorkflowValidationSummary: (validationErrors: Array<{ severity?: string; blocking?: boolean }>) => {
    const blockingErrors = validationErrors.filter(
      (error) => error.blocking ?? (error.severity !== 'warning' && error.severity !== 'info')
    );
    return {
      blockingCount: blockingErrors.length,
      hasBlockingErrors: blockingErrors.length > 0,
    };
  },
  isWorkflowEditorFeatureEnabled: () => true,
}));

jest.mock('@/lib/workflow-editor/workflow-error', () => ({
  createWorkflowErrorEnvelope: ({ stage, message }: { stage: string; message: string }) => ({
    stage,
    message,
  }),
  formatWorkflowErrorEnvelope: (error: { message: string }) => error.message,
}));

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

const WorkflowsPage = require('./page').default as typeof import('./page').default;

describe('WorkflowsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParamGet.mockReturnValue('workflow-1');
    mockGetById.mockResolvedValue(mockWorkflow);
    mockWorkflowEditorState.currentWorkflow = mockWorkflow;
    mockWorkflowEditorState.isExecuting = false;
    mockWorkflowEditorState.isDirty = true;
    mockWorkflowEditorState.editorLifecycleState = 'dirty';
    mockWorkflowEditorState.executionState = null;
    mockWorkflowEditorState.validationErrors = [];
    mockValidate.mockReturnValue([]);
    mockSaveWorkflow.mockResolvedValue(undefined);
  });

  it('disables the page run button when blocking validation errors exist', async () => {
    mockWorkflowEditorState.validationErrors = [
      { id: 'error-1', message: 'Blocking error', severity: 'error' } as never,
    ];

    render(<WorkflowsPage />);

    const runButton = await screen.findByTestId('workflow-page-run-button');
    expect(runButton).toBeDisabled();
  });

  it('shows recovery UI when saving fails', async () => {
    mockSaveWorkflow.mockRejectedValueOnce(new Error('Save exploded'));

    render(<WorkflowsPage />);

    const saveButton = await screen.findByTestId('workflow-page-save-button');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('Workflow Recovery Required')).toBeInTheDocument();
      expect(screen.getByText('Retry Save')).toBeInTheDocument();
    });
  });
});
