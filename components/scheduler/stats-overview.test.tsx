/**
 * StatsOverview Component Tests
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { StatsOverview } from './stats-overview';
import type { ScheduledTask, TaskExecution, TaskStatistics } from '@/types/scheduler';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

const createMockStatistics = (overrides: Partial<TaskStatistics> = {}): TaskStatistics => ({
  totalTasks: 10,
  activeTasks: 6,
  pausedTasks: 2,
  upcomingExecutions: 3,
  successfulExecutions: 45,
  failedExecutions: 5,
  totalExecutions: 50,
  averageDuration: 3000,
  ...overrides,
});

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

describe('StatsOverview', () => {
  const mockOnSelectTask = jest.fn();

  const defaultProps = {
    statistics: createMockStatistics(),
    activeTasks: [createMockTask({ id: 'active-1', status: 'active' })],
    pausedTasks: [createMockTask({ id: 'paused-1', status: 'paused' })],
    upcomingTasks: [] as ScheduledTask[],
    recentExecutions: [] as TaskExecution[],
    schedulerStatus: 'running',
    onSelectTask: mockOnSelectTask,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render nothing when statistics is null', () => {
    const { container } = render(
      <StatsOverview {...defaultProps} statistics={null} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('should render all stat cards', () => {
    render(<StatsOverview {...defaultProps} />);

    expect(screen.getByText('totalTasks')).toBeInTheDocument();
    expect(screen.getByText('activeTasks')).toBeInTheDocument();
    expect(screen.getByText('pausedTasks')).toBeInTheDocument();
    expect(screen.getByText('totalExecutions')).toBeInTheDocument();
    expect(screen.getByText('successRate')).toBeInTheDocument();
  });

  it('should display correct total tasks count', () => {
    render(<StatsOverview {...defaultProps} />);

    expect(screen.getByText('10')).toBeInTheDocument();
  });

  it('should display active tasks count', () => {
    const props = {
      ...defaultProps,
      activeTasks: [
        createMockTask({ id: 'a1', status: 'active' }),
        createMockTask({ id: 'a2', status: 'active' }),
        createMockTask({ id: 'a3', status: 'active' }),
      ],
    };
    render(<StatsOverview {...props} />);

    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('should display paused tasks count', () => {
    const props = {
      ...defaultProps,
      pausedTasks: [
        createMockTask({ id: 'p1', status: 'paused' }),
        createMockTask({ id: 'p2', status: 'paused' }),
      ],
    };
    render(<StatsOverview {...props} />);

    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('should display total executions', () => {
    render(<StatsOverview {...defaultProps} />);

    expect(screen.getByText('50')).toBeInTheDocument();
  });

  it('should calculate and display success rate', () => {
    render(<StatsOverview {...defaultProps} />);

    // 45 / 50 = 90%
    expect(screen.getByText('90%')).toBeInTheDocument();
  });

  it('should display 0% success rate when no executions', () => {
    const stats = createMockStatistics({
      successfulExecutions: 0,
      failedExecutions: 0,
      totalExecutions: 0,
    });
    render(<StatsOverview {...defaultProps} statistics={stats} />);

    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('should display success and failure counts in success rate card', () => {
    render(<StatsOverview {...defaultProps} />);

    expect(screen.getByText('45')).toBeInTheDocument(); // successful
    expect(screen.getByText('5')).toBeInTheDocument();  // failed
  });

  it('should show upcoming tasks section', () => {
    render(<StatsOverview {...defaultProps} />);

    expect(screen.getByText('upcomingTasks')).toBeInTheDocument();
  });

  it('should show empty state for upcoming tasks', () => {
    render(<StatsOverview {...defaultProps} upcomingTasks={[]} />);

    expect(screen.getByText('noUpcomingTasks')).toBeInTheDocument();
  });

  it('should render upcoming tasks list', () => {
    const futureDate = new Date();
    futureDate.setHours(futureDate.getHours() + 2);
    const upcomingTasks = [
      createMockTask({ id: 'up-1', name: 'Upcoming Task 1', nextRunAt: futureDate }),
      createMockTask({ id: 'up-2', name: 'Upcoming Task 2', nextRunAt: futureDate }),
    ];
    render(<StatsOverview {...defaultProps} upcomingTasks={upcomingTasks} />);

    expect(screen.getByText('Upcoming Task 1')).toBeInTheDocument();
    expect(screen.getByText('Upcoming Task 2')).toBeInTheDocument();
  });

  it('should call onSelectTask when upcoming task is clicked', () => {
    const futureDate = new Date();
    futureDate.setHours(futureDate.getHours() + 2);
    const upcomingTasks = [
      createMockTask({ id: 'up-1', name: 'Upcoming Task 1', nextRunAt: futureDate }),
    ];
    render(<StatsOverview {...defaultProps} upcomingTasks={upcomingTasks} />);

    fireEvent.click(screen.getByText('Upcoming Task 1'));
    expect(mockOnSelectTask).toHaveBeenCalledWith('up-1');
  });

  it('should show recent executions section', () => {
    render(<StatsOverview {...defaultProps} />);

    expect(screen.getByText('recentExecutions')).toBeInTheDocument();
  });

  it('should show empty state for recent executions', () => {
    render(<StatsOverview {...defaultProps} recentExecutions={[]} />);

    expect(screen.getByText('noRecentExecutions')).toBeInTheDocument();
  });

  it('should render recent executions list', () => {
    const executions = [
      createMockExecution({ id: 'e1', taskName: 'Exec Task 1', status: 'completed' }),
      createMockExecution({ id: 'e2', taskName: 'Exec Task 2', status: 'failed' }),
    ];
    render(<StatsOverview {...defaultProps} recentExecutions={executions} />);

    expect(screen.getByText('Exec Task 1')).toBeInTheDocument();
    expect(screen.getByText('Exec Task 2')).toBeInTheDocument();
  });

  it('should format execution duration', () => {
    const executions = [
      createMockExecution({ id: 'e1', duration: 5000 }), // 5.0s
    ];
    render(<StatsOverview {...defaultProps} recentExecutions={executions} />);

    expect(screen.getByText('5.0s')).toBeInTheDocument();
  });

  it('should format duration in milliseconds', () => {
    const executions = [
      createMockExecution({ id: 'e1', duration: 500 }),
    ];
    render(<StatsOverview {...defaultProps} recentExecutions={executions} />);

    expect(screen.getByText('500ms')).toBeInTheDocument();
  });

  it('should format duration in minutes', () => {
    const executions = [
      createMockExecution({ id: 'e1', duration: 125000 }), // 2m 5s
    ];
    render(<StatsOverview {...defaultProps} recentExecutions={executions} />);

    expect(screen.getByText('2m 5s')).toBeInTheDocument();
  });

  it('should show badge count for upcoming tasks', () => {
    const futureDate = new Date();
    futureDate.setHours(futureDate.getHours() + 1);
    const upcomingTasks = [
      createMockTask({ id: 'up-1', name: 'Up 1', nextRunAt: futureDate }),
      createMockTask({ id: 'up-2', name: 'Up 2', nextRunAt: futureDate }),
      createMockTask({ id: 'up-3', name: 'Up 3', nextRunAt: futureDate }),
    ];
    render(<StatsOverview {...defaultProps} upcomingTasks={upcomingTasks} />);

    // Badge count should show 3
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('should limit upcoming tasks display to 5', () => {
    const futureDate = new Date();
    futureDate.setHours(futureDate.getHours() + 1);
    const upcomingTasks = Array.from({ length: 8 }, (_, i) =>
      createMockTask({ id: `up-${i}`, name: `Task ${i + 1}`, nextRunAt: futureDate })
    );
    render(<StatsOverview {...defaultProps} upcomingTasks={upcomingTasks} />);

    // Only first 5 should be displayed
    expect(screen.getByText('Task 1')).toBeInTheDocument();
    expect(screen.getByText('Task 5')).toBeInTheDocument();
    expect(screen.queryByText('Task 6')).not.toBeInTheDocument();
  });

  it('should apply green color for high success rate', () => {
    const stats = createMockStatistics({
      successfulExecutions: 95,
      failedExecutions: 5,
      totalExecutions: 100,
    });
    const { container } = render(<StatsOverview {...defaultProps} statistics={stats} />);

    // Success rate >= 90 should have green text
    const greenText = container.querySelector('.text-green-500');
    expect(greenText).toBeInTheDocument();
  });

  it('should render SVG ring progress indicator', () => {
    const { container } = render(<StatsOverview {...defaultProps} />);

    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('should show status dot for upcoming task', () => {
    const futureDate = new Date();
    futureDate.setHours(futureDate.getHours() + 1);
    const upcomingTasks = [
      createMockTask({ id: 'up-1', name: 'Active Upcoming', status: 'active', nextRunAt: futureDate }),
    ];
    const { container } = render(<StatsOverview {...defaultProps} upcomingTasks={upcomingTasks} />);

    // Active task should have a green status dot
    const dots = container.querySelectorAll('.bg-green-500');
    expect(dots.length).toBeGreaterThan(0);
  });
});
