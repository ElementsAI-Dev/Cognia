/**
 * TaskDetails Component Tests
 * Updated for redesigned TaskDetails with hero section, metrics bar, and timeline
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
  getNextCronTimes: jest.fn(() => []),
  matchesCronExpression: jest.fn(() => false),
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

    // Buttons have text in hidden spans + tooltip content, getAllByText returns all matches
    expect(screen.getAllByText('runNow').length).toBeGreaterThan(0);
    expect(screen.getAllByText('pause').length).toBeGreaterThan(0);
    expect(screen.getAllByText('edit').length).toBeGreaterThan(0);
    expect(screen.getAllByText('delete').length).toBeGreaterThan(0);
  });

  it('should show resume button when paused', () => {
    const pausedTask = createMockTask({ status: 'paused' });
    render(<TaskDetails {...defaultProps} task={pausedTask} />);

    expect(screen.getAllByText('resume').length).toBeGreaterThan(0);
    expect(screen.queryByText('pause')).not.toBeInTheDocument();
  });

  it('should call onRunNow when run now button is clicked', () => {
    render(<TaskDetails {...defaultProps} />);

    // Click the first button containing runNow text
    const runNowSpan = screen.getAllByText('runNow')[0];
    fireEvent.click(runNowSpan.closest('button')!);
    expect(mockOnRunNow).toHaveBeenCalledTimes(1);
  });

  it('should call onPause when pause button is clicked', () => {
    render(<TaskDetails {...defaultProps} />);

    const pauseSpan = screen.getAllByText('pause')[0];
    fireEvent.click(pauseSpan.closest('button')!);
    expect(mockOnPause).toHaveBeenCalledTimes(1);
  });

  it('should call onResume when resume button is clicked', () => {
    const pausedTask = createMockTask({ status: 'paused' });
    render(<TaskDetails {...defaultProps} task={pausedTask} />);

    const resumeSpan = screen.getAllByText('resume')[0];
    fireEvent.click(resumeSpan.closest('button')!);
    expect(mockOnResume).toHaveBeenCalledTimes(1);
  });

  it('should call onEdit when edit button is clicked', () => {
    render(<TaskDetails {...defaultProps} />);

    const editSpan = screen.getAllByText('edit')[0];
    fireEvent.click(editSpan.closest('button')!);
    expect(mockOnEdit).toHaveBeenCalledTimes(1);
  });

  it('should call onDelete when delete button is clicked', () => {
    const { container } = render(<TaskDetails {...defaultProps} />);

    // Delete button is icon-only with text-destructive class
    const deleteButton = container.querySelector('button.text-destructive');
    expect(deleteButton).toBeInTheDocument();
    fireEvent.click(deleteButton!);
    expect(mockOnDelete).toHaveBeenCalledTimes(1);
  });

  it('should disable run now button when loading', () => {
    render(<TaskDetails {...defaultProps} isLoading={true} />);

    const runNowSpan = screen.getAllByText('runNow')[0];
    const runNowButton = runNowSpan.closest('button');
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

  it('should display metrics in hero header', () => {
    render(<TaskDetails {...defaultProps} />);

    // Metrics bar shows run count, success count, failure count
    expect(screen.getByText('10')).toBeInTheDocument(); // Total runs
    expect(screen.getByText('8')).toBeInTheDocument(); // Successful
    expect(screen.getByText('2')).toBeInTheDocument(); // Failed
  });

  it('should display success rate with progress bar', () => {
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
