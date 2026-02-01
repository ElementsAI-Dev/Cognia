/**
 * TaskDetails Component Tests
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { TaskDetails } from './task-details';
import type { ScheduledTask, TaskExecution } from '@/types/scheduler';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock cron-parser
jest.mock('@/lib/scheduler/cron-parser', () => ({
  describeCronExpression: jest.fn((expr) => `Cron: ${expr}`),
}));

const createMockTask = (overrides: Partial<ScheduledTask> = {}): ScheduledTask => ({
  id: 'task-1',
  name: 'Test Task',
  description: 'Test description',
  type: 'workflow',
  trigger: { type: 'cron', cronExpression: '0 9 * * *' },
  payload: { key: 'value' },
  config: {
    timeout: 300000,
    maxRetries: 3,
    retryDelay: 5000,
    runMissedOnStartup: false,
    maxMissedRuns: 1,
    allowConcurrent: false,
  },
  notification: {
    onStart: false,
    onComplete: true,
    onError: true,
    onProgress: false,
    channels: ['toast', 'desktop'],
  },
  status: 'active',
  runCount: 10,
  successCount: 8,
  failureCount: 2,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-15'),
  ...overrides,
});

const createMockExecution = (overrides: Partial<TaskExecution> = {}): TaskExecution => ({
  id: 'exec-1',
  taskId: 'task-1',
  taskName: 'Test Task',
  taskType: 'workflow',
  status: 'completed',
  retryAttempt: 0,
  duration: 5000,
  startedAt: new Date('2024-01-15T10:00:00'),
  completedAt: new Date('2024-01-15T10:00:05'),
  logs: [],
  ...overrides,
});

describe('TaskDetails', () => {
  const mockOnPause = jest.fn();
  const mockOnResume = jest.fn();
  const mockOnRunNow = jest.fn();
  const mockOnDelete = jest.fn();
  const mockOnEdit = jest.fn();

  const defaultProps = {
    task: createMockTask(),
    executions: [] as TaskExecution[],
    onPause: mockOnPause,
    onResume: mockOnResume,
    onRunNow: mockOnRunNow,
    onDelete: mockOnDelete,
    onEdit: mockOnEdit,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render task name and description', () => {
    render(<TaskDetails {...defaultProps} />);
    
    expect(screen.getByText('Test Task')).toBeInTheDocument();
    expect(screen.getByText('Test description')).toBeInTheDocument();
  });

  it('should render task status badge', () => {
    render(<TaskDetails {...defaultProps} />);
    expect(screen.getByText('active')).toBeInTheDocument();
  });

  it('should render action buttons', () => {
    render(<TaskDetails {...defaultProps} />);
    
    expect(screen.getByText('runNow')).toBeInTheDocument();
    expect(screen.getByText('pause')).toBeInTheDocument();
    expect(screen.getByText('edit')).toBeInTheDocument();
    expect(screen.getByText('delete')).toBeInTheDocument();
  });

  it('should show resume button when paused', () => {
    const pausedTask = createMockTask({ status: 'paused' });
    render(<TaskDetails {...defaultProps} task={pausedTask} />);
    
    expect(screen.getByText('resume')).toBeInTheDocument();
    expect(screen.queryByText('pause')).not.toBeInTheDocument();
  });

  it('should call onRunNow when run now button is clicked', () => {
    render(<TaskDetails {...defaultProps} />);
    
    fireEvent.click(screen.getByText('runNow'));
    expect(mockOnRunNow).toHaveBeenCalledTimes(1);
  });

  it('should call onPause when pause button is clicked', () => {
    render(<TaskDetails {...defaultProps} />);
    
    fireEvent.click(screen.getByText('pause'));
    expect(mockOnPause).toHaveBeenCalledTimes(1);
  });

  it('should call onResume when resume button is clicked', () => {
    const pausedTask = createMockTask({ status: 'paused' });
    render(<TaskDetails {...defaultProps} task={pausedTask} />);
    
    fireEvent.click(screen.getByText('resume'));
    expect(mockOnResume).toHaveBeenCalledTimes(1);
  });

  it('should call onEdit when edit button is clicked', () => {
    render(<TaskDetails {...defaultProps} />);
    
    fireEvent.click(screen.getByText('edit'));
    expect(mockOnEdit).toHaveBeenCalledTimes(1);
  });

  it('should call onDelete when delete button is clicked', () => {
    render(<TaskDetails {...defaultProps} />);
    
    fireEvent.click(screen.getByText('delete'));
    expect(mockOnDelete).toHaveBeenCalledTimes(1);
  });

  it('should disable run now button when loading', () => {
    render(<TaskDetails {...defaultProps} isLoading={true} />);
    
    const runNowButton = screen.getByText('runNow').closest('button');
    expect(runNowButton).toBeDisabled();
  });

  it('should display trigger type', () => {
    render(<TaskDetails {...defaultProps} />);
    
    expect(screen.getByText('cron')).toBeInTheDocument();
  });

  it('should describe interval trigger', () => {
    const task = createMockTask({
      trigger: { type: 'interval', intervalMs: 300000 },
    });
    render(<TaskDetails {...defaultProps} task={task} />);
    
    expect(screen.getByText('Every 5 minutes')).toBeInTheDocument();
  });

  it('should describe once trigger', () => {
    const runAt = new Date('2024-06-01T10:00:00');
    const task = createMockTask({
      trigger: { type: 'once', runAt },
    });
    render(<TaskDetails {...defaultProps} task={task} />);
    
    expect(screen.getByText(/Once at/)).toBeInTheDocument();
  });

  it('should describe event trigger', () => {
    const task = createMockTask({
      trigger: { type: 'event', eventType: 'message.created' },
    });
    render(<TaskDetails {...defaultProps} task={task} />);
    
    expect(screen.getByText('On event: message.created')).toBeInTheDocument();
  });

  it('should display statistics', () => {
    render(<TaskDetails {...defaultProps} />);
    
    expect(screen.getByText('10')).toBeInTheDocument(); // Total runs
    expect(screen.getByText('8')).toBeInTheDocument(); // Successful
    expect(screen.getByText('2')).toBeInTheDocument(); // Failed
  });

  it('should display success rate', () => {
    render(<TaskDetails {...defaultProps} />);
    
    expect(screen.getByText('80%')).toBeInTheDocument();
  });

  it('should not display success rate when no executions', () => {
    const task = createMockTask({ successCount: 0, failureCount: 0 });
    render(<TaskDetails {...defaultProps} task={task} />);
    
    expect(screen.queryByText('%')).not.toBeInTheDocument();
  });

  it('should display last error when present', () => {
    const task = createMockTask({ lastError: 'Connection timeout' });
    render(<TaskDetails {...defaultProps} task={task} />);
    
    expect(screen.getByText('Connection timeout')).toBeInTheDocument();
  });

  it('should have executions tab', () => {
    const executions = [
      createMockExecution({ id: 'exec-1', status: 'completed' }),
    ];
    render(<TaskDetails {...defaultProps} executions={executions} />);
    
    // Verify the executions tab exists
    const executionsTab = screen.getByRole('tab', { name: /executions/i });
    expect(executionsTab).toBeInTheDocument();
  });

  it('should have config tab', () => {
    render(<TaskDetails {...defaultProps} />);
    
    // Verify the config tab exists
    const configTab = screen.getByRole('tab', { name: /config/i });
    expect(configTab).toBeInTheDocument();
  });

  it('should have overview tab selected by default', () => {
    render(<TaskDetails {...defaultProps} />);
    
    // Overview tab should be selected by default
    const overviewTab = screen.getByRole('tab', { name: /overview/i });
    expect(overviewTab).toHaveAttribute('data-state', 'active');
  });

  it('should display timezone when set', () => {
    const task = createMockTask({
      trigger: { type: 'cron', cronExpression: '0 9 * * *', timezone: 'Asia/Shanghai' },
    });
    render(<TaskDetails {...defaultProps} task={task} />);
    
    expect(screen.getByText('Asia/Shanghai')).toBeInTheDocument();
  });
});
