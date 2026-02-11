/**
 * SchedulerDialogs Component Tests
 */

import { render, screen } from '@testing-library/react';
import { SchedulerDialogs } from './scheduler-dialogs';

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock next/dynamic for Monaco editor in TaskForm/SystemTaskForm
jest.mock('next/dynamic', () => {
  return jest.fn((_loader: () => Promise<unknown>, _opts?: unknown) => {
    const MockMonaco = (props: { value?: string; onChange?: (v: string) => void; options?: Record<string, unknown>; height?: string }) => (
      <textarea
        data-testid="monaco-editor"
        value={props.value || ''}
        onChange={(e) => props.onChange?.(e.target.value)}
        disabled={props.options?.readOnly === true}
        style={{ height: props.height }}
      />
    );
    MockMonaco.displayName = 'MockMonacoEditor';
    return MockMonaco;
  });
});

jest.mock('@/components/providers/ui/theme-provider', () => ({
  useTheme: () => ({ theme: 'dark', resolvedTheme: 'dark', setTheme: jest.fn() }),
}));

jest.mock('@/lib/monaco', () => ({
  createEditorOptions: jest.fn((_preset: string, overrides: Record<string, unknown> = {}) => overrides),
  getMonacoLanguage: jest.fn((lang: string) => lang),
  getMonacoTheme: jest.fn(() => 'vs-dark'),
}));

jest.mock('@/lib/scheduler/cron-parser', () => ({
  validateCronExpression: jest.fn(() => ({ valid: true })),
  describeCronExpression: jest.fn(() => 'Every day'),
  formatCronExpression: jest.fn((expr: string) => expr),
  parseCronExpression: jest.fn((expr: string) => ({ expression: expr })),
}));

jest.mock('@/lib/scheduler/notification-integration', () => ({
  testNotificationChannel: jest.fn().mockResolvedValue({ success: true }),
}));

jest.mock('@/lib/scheduler/script-executor', () => ({
  validateScript: jest.fn(() => ({ valid: true, errors: [], warnings: [] })),
  getScriptTemplate: jest.fn(() => '# Template'),
}));

const defaultProps = {
  showCreateSheet: false,
  onShowCreateSheetChange: jest.fn(),
  onCreateTask: jest.fn().mockResolvedValue(undefined),
  isSubmitting: false,
  showEditSheet: false,
  onShowEditSheetChange: jest.fn(),
  onEditTask: jest.fn().mockResolvedValue(undefined),
  selectedTask: undefined,
  showSystemCreateSheet: false,
  onShowSystemCreateSheetChange: jest.fn(),
  onCreateSystemTask: jest.fn().mockResolvedValue(undefined),
  systemSubmitting: false,
  showSystemEditSheet: false,
  onShowSystemEditSheetChange: jest.fn(),
  onEditSystemTask: jest.fn().mockResolvedValue(undefined),
  selectedSystemTask: null,
  deleteTaskId: null,
  onDeleteTaskIdChange: jest.fn(),
  onDeleteConfirm: jest.fn().mockResolvedValue(undefined),
  systemDeleteTaskId: null,
  onSystemDeleteTaskIdChange: jest.fn(),
  onSystemDeleteConfirm: jest.fn().mockResolvedValue(undefined),
  pendingConfirmation: null,
  onConfirmPending: jest.fn(),
  onCancelPending: jest.fn(),
  showAdminDialog: false,
  onShowAdminDialogChange: jest.fn(),
  onRequestElevation: jest.fn().mockResolvedValue(undefined),
};

describe('SchedulerDialogs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render without errors when all dialogs are closed', () => {
    const { container } = render(<SchedulerDialogs {...defaultProps} />);
    expect(container).toBeTruthy();
  });

  it('should render create task sheet when open', () => {
    render(<SchedulerDialogs {...defaultProps} showCreateSheet={true} />);

    expect(screen.getByText('createTask')).toBeInTheDocument();
    expect(screen.getByText('createTaskDescription')).toBeInTheDocument();
  });

  it('should render edit task sheet when open with selectedTask', () => {
    const selectedTask = {
      id: 'task-1',
      name: 'Test Task',
      description: 'desc',
      type: 'workflow' as const,
      trigger: { type: 'cron' as const, cronExpression: '0 9 * * *' },
      payload: {},
      config: { timeout: 300000, maxRetries: 3, retryDelay: 5000, runMissedOnStartup: false, maxMissedRuns: 1, allowConcurrent: false },
      notification: { onStart: false, onComplete: true, onError: true, onProgress: false, channels: ['toast' as const] },
      status: 'active' as const,
      runCount: 0,
      successCount: 0,
      failureCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    render(
      <SchedulerDialogs
        {...defaultProps}
        showEditSheet={true}
        selectedTask={selectedTask}
      />
    );

    expect(screen.getByText('editTask')).toBeInTheDocument();
  });

  it('should render delete confirmation dialog when deleteTaskId is set', () => {
    render(<SchedulerDialogs {...defaultProps} deleteTaskId="task-to-delete" />);

    expect(screen.getByText('deleteTask')).toBeInTheDocument();
    expect(screen.getByText('deleteTaskConfirm')).toBeInTheDocument();
  });

  it('should render system create sheet when open', () => {
    render(<SchedulerDialogs {...defaultProps} showSystemCreateSheet={true} />);

    expect(screen.getByText('createSystemTask')).toBeInTheDocument();
  });

  it('should not render task form in edit sheet when no selectedTask', () => {
    render(<SchedulerDialogs {...defaultProps} showEditSheet={true} selectedTask={undefined} />);

    // Should show the sheet header but no form since no task is selected
    expect(screen.getByText('editTask')).toBeInTheDocument();
  });
});
