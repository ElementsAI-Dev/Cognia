/**
 * TaskList Component Tests
 * Updated for redesigned TaskList with left status border, colored type icons, and hover actions
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

// Mock @tanstack/react-virtual for jsdom
jest.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: jest.fn(({ count }: { count: number }) => ({
    getVirtualItems: () =>
      Array.from({ length: count }, (_, i) => ({
        index: i,
        start: i * 76,
        size: 76,
        key: i,
      })),
    getTotalSize: () => count * 76,
    measureElement: jest.fn(),
  })),
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

  it('should show task type as fallback when no description', () => {
    const tasks = [createMockTask({ description: undefined, type: 'backup' })];
    render(<TaskList {...defaultProps} tasks={tasks} />);

    expect(screen.getByText('backup')).toBeInTheDocument();
  });

  it('should display task status label', () => {
    const tasks = [createMockTask({ status: 'active' })];
    render(<TaskList {...defaultProps} tasks={tasks} />);

    expect(screen.getByText('statuses.active')).toBeInTheDocument();
  });

  it('should display paused status', () => {
    const tasks = [createMockTask({ status: 'paused' })];
    render(<TaskList {...defaultProps} tasks={tasks} />);

    expect(screen.getByText('statuses.paused')).toBeInTheDocument();
  });

  it('should display disabled status', () => {
    const tasks = [createMockTask({ status: 'disabled' })];
    render(<TaskList {...defaultProps} tasks={tasks} />);

    expect(screen.getByText('statuses.disabled')).toBeInTheDocument();
  });

  it('should display expired status', () => {
    const tasks = [createMockTask({ status: 'expired' })];
    render(<TaskList {...defaultProps} tasks={tasks} />);

    expect(screen.getByText('statuses.expired')).toBeInTheDocument();
  });

  it('should apply left border color for active status', () => {
    const tasks = [createMockTask({ status: 'active' })];
    const { container } = render(<TaskList {...defaultProps} tasks={tasks} />);

    const taskButton = container.querySelector('.border-l-green-500');
    expect(taskButton).toBeInTheDocument();
  });

  it('should apply left border color for paused status', () => {
    const tasks = [createMockTask({ status: 'paused' })];
    const { container } = render(<TaskList {...defaultProps} tasks={tasks} />);

    const taskButton = container.querySelector('.border-l-yellow-500');
    expect(taskButton).toBeInTheDocument();
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

    const selectedButton = container.querySelector('.bg-accent\\/50');
    expect(selectedButton).toBeInTheDocument();
  });

  it('should display success count', () => {
    const tasks = [createMockTask({ successCount: 15, failureCount: 3 })];
    render(<TaskList {...defaultProps} tasks={tasks} />);

    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('should hide failure count when zero', () => {
    const tasks = [createMockTask({ successCount: 10, failureCount: 0 })];
    render(<TaskList {...defaultProps} tasks={tasks} />);

    expect(screen.getByText('10')).toBeInTheDocument();
    // failureCount 0 should not render XCircle + count
    const allTexts = screen.queryAllByText('0');
    // 0 should not appear as a failure count (only success is shown)
    expect(allTexts.length).toBe(0);
  });

  it('should preserve incoming task order', () => {
    const tasks = [
      createMockTask({ id: 'task-1', name: 'Paused Task', status: 'paused' }),
      createMockTask({ id: 'task-2', name: 'Active Task', status: 'active' }),
    ];
    render(<TaskList {...defaultProps} tasks={tasks} />);

    const cardTitles = screen.getAllByText(/Task$/);
    expect(cardTitles[0].textContent).toBe('Paused Task');
    expect(cardTitles[1].textContent).toBe('Active Task');
  });

  it('should render colored type icon for each task type', () => {
    const tasks = [createMockTask({ type: 'workflow' })];
    const { container } = render(<TaskList {...defaultProps} tasks={tasks} />);

    // Workflow type should have violet background
    const iconContainer = container.querySelector('.bg-violet-500\\/10');
    expect(iconContainer).toBeInTheDocument();
  });

  it('should render different icon colors for different types', () => {
    const tasks = [createMockTask({ type: 'backup' })];
    const { container } = render(<TaskList {...defaultProps} tasks={tasks} />);

    // Backup type should have orange background
    const iconContainer = container.querySelector('.bg-orange-500\\/10');
    expect(iconContainer).toBeInTheDocument();
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

  it('should format next run time in compact minutes', () => {
    const futureDate = new Date();
    futureDate.setMinutes(futureDate.getMinutes() + 30);
    const tasks = [createMockTask({ nextRunAt: futureDate })];
    render(<TaskList {...defaultProps} tasks={tasks} />);

    // New format is compact e.g. "30m" or "29m"
    expect(screen.getByText(/^\d+m$/)).toBeInTheDocument();
  });

  it('should format next run time in compact hours', () => {
    const futureDate = new Date();
    futureDate.setHours(futureDate.getHours() + 5);
    const tasks = [createMockTask({ nextRunAt: futureDate })];
    render(<TaskList {...defaultProps} tasks={tasks} />);

    // New format is compact e.g. "5h" or "4h"
    expect(screen.getByText(/^\d+h$/)).toBeInTheDocument();
  });

  it('should show no schedule when nextRunAt is undefined', () => {
    const tasks = [createMockTask({ nextRunAt: undefined })];
    render(<TaskList {...defaultProps} tasks={tasks} />);

    expect(screen.getByText('noSchedule')).toBeInTheDocument();
  });

  it('should render status dot with correct color', () => {
    const tasks = [createMockTask({ status: 'active' })];
    const { container } = render(<TaskList {...defaultProps} tasks={tasks} />);

    const statusDot = container.querySelector('.bg-green-500');
    expect(statusDot).toBeInTheDocument();
  });
});
