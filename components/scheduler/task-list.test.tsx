/**
 * TaskList Component Tests
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { TaskList } from './task-list';
import type { ScheduledTask } from '@/types/scheduler';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock scheduler store
jest.mock('@/stores/scheduler', () => ({
  useSchedulerStore: jest.fn(() => ({})),
}));

const createMockTask = (overrides: Partial<ScheduledTask> = {}): ScheduledTask => ({
  id: 'task-1',
  name: 'Test Task',
  description: 'Test description',
  type: 'workflow',
  trigger: { type: 'cron', cronExpression: '0 9 * * *' },
  payload: {},
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
    channels: ['toast'],
  },
  status: 'active',
  runCount: 10,
  successCount: 8,
  failureCount: 2,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-15'),
  ...overrides,
});

describe('TaskList', () => {
  const mockOnSelect = jest.fn();
  const mockOnPause = jest.fn();
  const mockOnResume = jest.fn();
  const mockOnRunNow = jest.fn();
  const mockOnDelete = jest.fn();

  const defaultProps = {
    tasks: [] as ScheduledTask[],
    selectedTaskId: null,
    onSelect: mockOnSelect,
    onPause: mockOnPause,
    onResume: mockOnResume,
    onRunNow: mockOnRunNow,
    onDelete: mockOnDelete,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render empty state when no tasks', () => {
    render(<TaskList {...defaultProps} />);
    expect(screen.getByText('noTasks')).toBeInTheDocument();
    expect(screen.getByText('noTasksDescription')).toBeInTheDocument();
  });

  it('should render list of tasks', () => {
    const tasks = [
      createMockTask({ id: 'task-1', name: 'Task 1' }),
      createMockTask({ id: 'task-2', name: 'Task 2' }),
    ];
    render(<TaskList {...defaultProps} tasks={tasks} />);
    
    expect(screen.getByText('Task 1')).toBeInTheDocument();
    expect(screen.getByText('Task 2')).toBeInTheDocument();
  });

  it('should show task description', () => {
    const tasks = [createMockTask({ description: 'My task description' })];
    render(<TaskList {...defaultProps} tasks={tasks} />);
    
    expect(screen.getByText('My task description')).toBeInTheDocument();
  });

  it('should display task status badge', () => {
    const tasks = [createMockTask({ status: 'active' })];
    render(<TaskList {...defaultProps} tasks={tasks} />);
    
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('should display paused status', () => {
    const tasks = [createMockTask({ status: 'paused' })];
    render(<TaskList {...defaultProps} tasks={tasks} />);
    
    expect(screen.getByText('Paused')).toBeInTheDocument();
  });

  it('should display disabled status', () => {
    const tasks = [createMockTask({ status: 'disabled' })];
    render(<TaskList {...defaultProps} tasks={tasks} />);
    
    expect(screen.getByText('Disabled')).toBeInTheDocument();
  });

  it('should display expired status', () => {
    const tasks = [createMockTask({ status: 'expired' })];
    render(<TaskList {...defaultProps} tasks={tasks} />);
    
    expect(screen.getByText('Expired')).toBeInTheDocument();
  });

  it('should call onSelect when task is clicked', () => {
    const tasks = [createMockTask({ id: 'task-123' })];
    render(<TaskList {...defaultProps} tasks={tasks} />);
    
    fireEvent.click(screen.getByText('Test Task'));
    expect(mockOnSelect).toHaveBeenCalledWith('task-123');
  });

  it('should highlight selected task', () => {
    const tasks = [createMockTask({ id: 'task-123' })];
    const { container } = render(
      <TaskList {...defaultProps} tasks={tasks} selectedTaskId="task-123" />
    );
    
    const card = container.querySelector('.ring-2');
    expect(card).toBeInTheDocument();
  });

  it('should display success and failure counts', () => {
    const tasks = [createMockTask({ successCount: 15, failureCount: 3 })];
    render(<TaskList {...defaultProps} tasks={tasks} />);
    
    expect(screen.getByText('15 ✓')).toBeInTheDocument();
    expect(screen.getByText('3 ✗')).toBeInTheDocument();
  });

  it('should sort active tasks first', () => {
    const tasks = [
      createMockTask({ id: 'task-1', name: 'Paused Task', status: 'paused' }),
      createMockTask({ id: 'task-2', name: 'Active Task', status: 'active' }),
    ];
    render(<TaskList {...defaultProps} tasks={tasks} />);
    
    // Get card titles by data-slot attribute
    const cardTitles = screen.getAllByText(/Task$/);
    // Active task should come first due to sorting
    expect(cardTitles[0].textContent).toBe('Active Task');
    expect(cardTitles[1].textContent).toBe('Paused Task');
  });

  it('should display task type icon', () => {
    const tasks = [createMockTask({ type: 'workflow' })];
    const { container } = render(<TaskList {...defaultProps} tasks={tasks} />);
    
    // Check that an icon is rendered
    const icon = container.querySelector('svg');
    expect(icon).toBeInTheDocument();
  });

  it('should format next run time for overdue tasks', () => {
    const pastDate = new Date();
    pastDate.setHours(pastDate.getHours() - 1);
    const tasks = [createMockTask({ nextRunAt: pastDate })];
    render(<TaskList {...defaultProps} tasks={tasks} />);
    
    expect(screen.getByText('overdue')).toBeInTheDocument();
  });

  it('should format next run time for upcoming tasks (less than minute)', () => {
    const futureDate = new Date();
    futureDate.setSeconds(futureDate.getSeconds() + 30);
    const tasks = [createMockTask({ nextRunAt: futureDate })];
    render(<TaskList {...defaultProps} tasks={tasks} />);
    
    expect(screen.getByText('lessThanMinute')).toBeInTheDocument();
  });

  it('should format next run time in minutes', () => {
    const futureDate = new Date();
    futureDate.setMinutes(futureDate.getMinutes() + 30);
    const tasks = [createMockTask({ nextRunAt: futureDate })];
    render(<TaskList {...defaultProps} tasks={tasks} />);
    
    // Check for minutes format (29-30 minutes depending on timing)
    expect(screen.getByText(/\d+ minutes?/)).toBeInTheDocument();
  });

  it('should format next run time in hours', () => {
    const futureDate = new Date();
    futureDate.setHours(futureDate.getHours() + 5);
    const tasks = [createMockTask({ nextRunAt: futureDate })];
    render(<TaskList {...defaultProps} tasks={tasks} />);
    
    // Check for hours format (4-5 hours depending on timing)
    expect(screen.getByText(/\d+ hours?/)).toBeInTheDocument();
  });

  it('should show no schedule when nextRunAt is undefined', () => {
    const tasks = [createMockTask({ nextRunAt: undefined })];
    render(<TaskList {...defaultProps} tasks={tasks} />);
    
    expect(screen.getByText('noSchedule')).toBeInTheDocument();
  });
});
