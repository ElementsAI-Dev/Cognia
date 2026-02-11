/**
 * SystemSchedulerView Component Tests
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { SystemSchedulerView } from './system-scheduler-view';
import type { SystemTask, SchedulerCapabilities } from '@/types/scheduler';

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

const createMockTask = (overrides: Partial<SystemTask> = {}): SystemTask => ({
  id: 'sys-task-1',
  name: 'Test System Task',
  description: 'Test description',
  status: 'ready',
  trigger: { type: 'cron', expression: '0 9 * * *' },
  action: { type: 'execute_script', language: 'python', code: 'print(1)' },
  run_level: 'user',
  tags: [],
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-15T00:00:00Z',
  ...overrides,
});

const defaultCapabilities: SchedulerCapabilities = {
  has_system_scheduler: true,
  can_elevate: true,
  platform: 'windows',
};

describe('SystemSchedulerView', () => {
  const defaultProps = {
    capabilities: defaultCapabilities,
    isAvailable: true,
    isElevated: false,
    systemTasks: [] as SystemTask[],
    loading: false,
    error: null,
    onRunNow: jest.fn().mockResolvedValue(undefined),
    onToggle: jest.fn().mockResolvedValue(undefined),
    onEdit: jest.fn(),
    onDelete: jest.fn(),
    onRequestElevation: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('unavailable state', () => {
    it('should show unavailable message when not available', () => {
      render(<SystemSchedulerView {...defaultProps} isAvailable={false} />);

      expect(screen.getByText('systemSchedulerUnavailable')).toBeInTheDocument();
    });

    it('should show elevation button when can_elevate', () => {
      render(
        <SystemSchedulerView
          {...defaultProps}
          isAvailable={false}
          capabilities={{ ...defaultCapabilities, can_elevate: true }}
        />
      );

      expect(screen.getByText('requestElevation')).toBeInTheDocument();
    });

    it('should call onRequestElevation when button clicked', () => {
      render(
        <SystemSchedulerView
          {...defaultProps}
          isAvailable={false}
          capabilities={{ ...defaultCapabilities, can_elevate: true }}
        />
      );

      fireEvent.click(screen.getByText('requestElevation'));
      expect(defaultProps.onRequestElevation).toHaveBeenCalled();
    });
  });

  describe('available state', () => {
    it('should show user badge when not elevated', () => {
      render(<SystemSchedulerView {...defaultProps} />);

      expect(screen.getByText('runLevelUser')).toBeInTheDocument();
    });

    it('should show admin badge when elevated', () => {
      render(<SystemSchedulerView {...defaultProps} isElevated={true} />);

      expect(screen.getByText('runLevelAdmin')).toBeInTheDocument();
    });

    it('should show empty state when no tasks', () => {
      render(<SystemSchedulerView {...defaultProps} systemTasks={[]} />);

      expect(screen.getByText('noSystemTasks')).toBeInTheDocument();
    });

    it('should show error message when error exists', () => {
      render(<SystemSchedulerView {...defaultProps} error="Something failed" />);

      expect(screen.getByText('Something failed')).toBeInTheDocument();
    });
  });

  describe('task rendering', () => {
    it('should render task name', () => {
      const tasks = [createMockTask({ name: 'My System Task' })];
      render(<SystemSchedulerView {...defaultProps} systemTasks={tasks} />);

      expect(screen.getByText('My System Task')).toBeInTheDocument();
    });

    it('should render task description', () => {
      const tasks = [createMockTask({ description: 'Task desc' })];
      render(<SystemSchedulerView {...defaultProps} systemTasks={tasks} />);

      expect(screen.getByText('Task desc')).toBeInTheDocument();
    });

    it('should render task status badge', () => {
      const tasks = [createMockTask({ status: 'ready' })];
      render(<SystemSchedulerView {...defaultProps} systemTasks={tasks} />);

      expect(screen.getByText('ready')).toBeInTheDocument();
    });

    it('should format cron trigger', () => {
      const tasks = [createMockTask({ trigger: { type: 'cron', expression: '0 9 * * *' } })];
      render(<SystemSchedulerView {...defaultProps} systemTasks={tasks} />);

      expect(screen.getByText(/0 9 \* \* \*/)).toBeInTheDocument();
    });

    it('should format script action', () => {
      const tasks = [createMockTask({ action: { type: 'execute_script', language: 'python', code: '' } })];
      render(<SystemSchedulerView {...defaultProps} systemTasks={tasks} />);

      expect(screen.getByText(/python/)).toBeInTheDocument();
    });

    it('should sort tasks alphabetically', () => {
      const tasks = [
        createMockTask({ id: 'b', name: 'Zebra Task' }),
        createMockTask({ id: 'a', name: 'Alpha Task' }),
      ];
      render(<SystemSchedulerView {...defaultProps} systemTasks={tasks} />);

      // Both names should be present
      expect(screen.getByText('Alpha Task')).toBeInTheDocument();
      expect(screen.getByText('Zebra Task')).toBeInTheDocument();

      // Alpha should appear before Zebra in the DOM
      const alpha = screen.getByText('Alpha Task');
      const zebra = screen.getByText('Zebra Task');
      expect(alpha.compareDocumentPosition(zebra) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });
  });

  describe('task actions', () => {
    it('should call onEdit when edit button clicked', () => {
      const tasks = [createMockTask({ id: 'sys-123' })];
      render(<SystemSchedulerView {...defaultProps} systemTasks={tasks} />);

      // Find Settings icon buttons (edit)
      const buttons = screen.getAllByRole('button');
      // The edit button is the third action button
      const editButton = buttons[2];
      fireEvent.click(editButton);

      expect(defaultProps.onEdit).toHaveBeenCalledWith('sys-123');
    });

    it('should call onDelete when delete button clicked', () => {
      const tasks = [createMockTask({ id: 'sys-456' })];
      render(<SystemSchedulerView {...defaultProps} systemTasks={tasks} />);

      const buttons = screen.getAllByRole('button');
      // The delete button is the fourth action button
      const deleteButton = buttons[3];
      fireEvent.click(deleteButton);

      expect(defaultProps.onDelete).toHaveBeenCalledWith('sys-456');
    });
  });
});
