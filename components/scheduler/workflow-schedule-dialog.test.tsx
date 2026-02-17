/**
 * WorkflowScheduleDialog Component Tests
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WorkflowScheduleDialog } from './workflow-schedule-dialog';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string, params?: Record<string, string>) => {
    if (params) return `${key}: ${JSON.stringify(params)}`;
    return key;
  },
}));

// Mock useScheduler hook
const mockCreateTask = jest.fn();
jest.mock('@/hooks/scheduler', () => ({
  useScheduler: () => ({
    createTask: mockCreateTask,
  }),
}));

describe('WorkflowScheduleDialog', () => {
  const defaultProps = {
    workflowId: 'workflow-123',
    workflowName: 'Test Workflow',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateTask.mockResolvedValue({ id: 'task-123' });
  });

  it('should render trigger button', () => {
    render(<WorkflowScheduleDialog {...defaultProps} />);
    expect(screen.getByText('scheduleWorkflow')).toBeInTheDocument();
  });

  it('should render custom trigger', () => {
    render(
      <WorkflowScheduleDialog
        {...defaultProps}
        trigger={<button data-testid="custom-trigger">Custom</button>}
      />
    );
    expect(screen.getByTestId('custom-trigger')).toBeInTheDocument();
  });

  it('should open dialog when trigger is clicked', () => {
    render(<WorkflowScheduleDialog {...defaultProps} />);
    
    fireEvent.click(screen.getByText('scheduleWorkflow'));
    
    expect(screen.getAllByText('scheduleWorkflow').length).toBeGreaterThan(1);
  });

  it('should render task name input with default value', () => {
    render(<WorkflowScheduleDialog {...defaultProps} />);
    fireEvent.click(screen.getByText('scheduleWorkflow'));
    
    expect(screen.getByLabelText('taskName')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test Workflow - Scheduled')).toBeInTheDocument();
  });

  it('should render trigger type tabs', () => {
    render(<WorkflowScheduleDialog {...defaultProps} />);
    fireEvent.click(screen.getByText('scheduleWorkflow'));
    
    expect(screen.getByText('triggers.cron')).toBeInTheDocument();
    expect(screen.getByText('triggers.interval')).toBeInTheDocument();
    expect(screen.getByText('triggers.once')).toBeInTheDocument();
  });

  it('should show cron configuration by default', () => {
    render(<WorkflowScheduleDialog {...defaultProps} />);
    fireEvent.click(screen.getByText('scheduleWorkflow'));
    
    expect(screen.getByText('cronPresets')).toBeInTheDocument();
    expect(screen.getByText('cronExpression')).toBeInTheDocument();
  });

  it('should show interval trigger tab', () => {
    render(<WorkflowScheduleDialog {...defaultProps} />);
    fireEvent.click(screen.getByText('scheduleWorkflow'));
    
    // Check that interval tab exists
    expect(screen.getByText('triggers.interval')).toBeInTheDocument();
  });

  it('should show once trigger tab', () => {
    render(<WorkflowScheduleDialog {...defaultProps} />);
    fireEvent.click(screen.getByText('scheduleWorkflow'));
    
    // Check that once tab exists
    expect(screen.getByText('triggers.once')).toBeInTheDocument();
  });

  it('should render notification settings', () => {
    render(<WorkflowScheduleDialog {...defaultProps} />);
    fireEvent.click(screen.getByText('scheduleWorkflow'));
    
    expect(screen.getByText('notificationSettings.title')).toBeInTheDocument();
    expect(screen.getByText('notificationSettings.onComplete')).toBeInTheDocument();
    expect(screen.getByText('notificationSettings.onError')).toBeInTheDocument();
  });

  it('should close dialog when cancel button is clicked', () => {
    render(<WorkflowScheduleDialog {...defaultProps} />);
    fireEvent.click(screen.getByText('scheduleWorkflow'));
    
    fireEvent.click(screen.getByText('cancel'));
    
    // Dialog title should only appear once (in the closed state as the trigger)
    expect(screen.queryByText('cronPresets')).not.toBeInTheDocument();
  });

  it('should call createTask with cron trigger', async () => {
    render(<WorkflowScheduleDialog {...defaultProps} />);
    fireEvent.click(screen.getByText('scheduleWorkflow'));
    
    fireEvent.click(screen.getByText('schedule'));
    
    await waitFor(() => {
      expect(mockCreateTask).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Test Workflow - Scheduled',
          type: 'workflow',
          trigger: {
            type: 'cron',
            cronExpression: '0 9 * * *',
            timezone: 'UTC',
          },
          payload: {
            workflowId: 'workflow-123',
            input: {},
          },
        })
      );
    });
  });

  it('should have cron configuration visible by default', () => {
    render(<WorkflowScheduleDialog {...defaultProps} />);
    fireEvent.click(screen.getByText('scheduleWorkflow'));
    
    // Cron configuration should be visible by default
    expect(screen.getByText('cronPresets')).toBeInTheDocument();
    expect(screen.getByText('cronExpression')).toBeInTheDocument();
  });

  it('should have trigger type selector', () => {
    render(<WorkflowScheduleDialog {...defaultProps} />);
    fireEvent.click(screen.getByText('scheduleWorkflow'));
    
    // Check that trigger type label exists
    expect(screen.getByText('triggerType')).toBeInTheDocument();
  });

  it('should call onScheduled callback after task creation', async () => {
    const mockOnScheduled = jest.fn();
    render(<WorkflowScheduleDialog {...defaultProps} onScheduled={mockOnScheduled} />);
    
    fireEvent.click(screen.getByText('scheduleWorkflow'));
    fireEvent.click(screen.getByText('schedule'));
    
    await waitFor(() => {
      expect(mockOnScheduled).toHaveBeenCalledWith('task-123');
    });
  });

  it('should close dialog after successful submission', async () => {
    render(<WorkflowScheduleDialog {...defaultProps} />);
    
    fireEvent.click(screen.getByText('scheduleWorkflow'));
    fireEvent.click(screen.getByText('schedule'));
    
    await waitFor(() => {
      expect(screen.queryByText('cronPresets')).not.toBeInTheDocument();
    });
  });

  it('should disable submit button when task name is empty', async () => {
    render(<WorkflowScheduleDialog {...defaultProps} />);
    fireEvent.click(screen.getByText('scheduleWorkflow'));
    
    const nameInput = screen.getByLabelText('taskName');
    await userEvent.clear(nameInput);
    
    const submitButton = screen.getByText('schedule').closest('button');
    expect(submitButton).toBeDisabled();
  });

  it('should show scheduling text when submitting', async () => {
    mockCreateTask.mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve({ id: 'task-123' }), 100)));
    
    render(<WorkflowScheduleDialog {...defaultProps} />);
    fireEvent.click(screen.getByText('scheduleWorkflow'));
    fireEvent.click(screen.getByText('schedule'));
    
    expect(screen.getByText('scheduling')).toBeInTheDocument();
  });

  it('should toggle notification complete setting', () => {
    render(<WorkflowScheduleDialog {...defaultProps} />);
    fireEvent.click(screen.getByText('scheduleWorkflow'));
    
    const switches = screen.getAllByRole('switch');
    expect(switches[0]).toBeInTheDocument();
    
    fireEvent.click(switches[0]);
  });

  it('should allow changing cron expression', async () => {
    render(<WorkflowScheduleDialog {...defaultProps} />);
    fireEvent.click(screen.getByText('scheduleWorkflow'));
    
    const cronInput = screen.getByLabelText('cronExpression');
    await userEvent.clear(cronInput);
    await userEvent.type(cronInput, '0 0 * * *');
    
    fireEvent.click(screen.getByText('schedule'));
    
    await waitFor(() => {
        expect(mockCreateTask).toHaveBeenCalledWith(
          expect.objectContaining({
            trigger: {
              type: 'cron',
              cronExpression: '0 0 * * *',
              timezone: 'UTC',
            },
          })
        );
      });
  });

  it('should render timezone configuration for cron trigger', () => {
    render(<WorkflowScheduleDialog {...defaultProps} />);
    fireEvent.click(screen.getByText('scheduleWorkflow'));

    expect(screen.getByText('timezone')).toBeInTheDocument();
  });

  it('should not call onScheduled when createTask returns null', async () => {
    mockCreateTask.mockResolvedValue(null);
    const mockOnScheduled = jest.fn();
    
    render(<WorkflowScheduleDialog {...defaultProps} onScheduled={mockOnScheduled} />);
    fireEvent.click(screen.getByText('scheduleWorkflow'));
    fireEvent.click(screen.getByText('schedule'));
    
    await waitFor(() => {
      expect(mockCreateTask).toHaveBeenCalled();
    });
    
    expect(mockOnScheduled).not.toHaveBeenCalled();
  });

  it('should include notification settings in task', async () => {
    render(<WorkflowScheduleDialog {...defaultProps} />);
    fireEvent.click(screen.getByText('scheduleWorkflow'));
    
    // Toggle notification settings
    const switches = screen.getAllByRole('switch');
    fireEvent.click(switches[0]); // Toggle onComplete
    
    fireEvent.click(screen.getByText('schedule'));
    
    await waitFor(() => {
      expect(mockCreateTask).toHaveBeenCalledWith(
        expect.objectContaining({
          notification: expect.objectContaining({
            onStart: false,
            onComplete: false, // Toggled off
            onError: true,
            onProgress: false,
            channels: ['toast'],
          }),
        })
      );
    });
  });

  it('should have all trigger type tabs', () => {
    render(<WorkflowScheduleDialog {...defaultProps} />);
    fireEvent.click(screen.getByText('scheduleWorkflow'));
    
    // Check all trigger tabs exist
    expect(screen.getByText('triggers.cron')).toBeInTheDocument();
    expect(screen.getByText('triggers.interval')).toBeInTheDocument();
    expect(screen.getByText('triggers.once')).toBeInTheDocument();
  });
});
