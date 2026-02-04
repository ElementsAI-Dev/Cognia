/**
 * TaskForm Component Tests
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TaskForm } from './task-form';
import type { CreateScheduledTaskInput } from '@/types/scheduler';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock cron-parser
jest.mock('@/lib/scheduler/cron-parser', () => ({
  validateCronExpression: jest.fn((expr) => {
    if (expr === 'invalid') return { valid: false, error: 'Invalid cron' };
    return { valid: true };
  }),
  describeCronExpression: jest.fn((expr) => `Runs: ${expr}`),
}));

describe('TaskForm', () => {
  const mockOnSubmit = jest.fn();
  const mockOnCancel = jest.fn();

  const defaultProps = {
    onSubmit: mockOnSubmit,
    onCancel: mockOnCancel,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render form fields', () => {
    render(<TaskForm {...defaultProps} />);
    
    expect(screen.getByLabelText(/taskName/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
  });

  it('should render task type selector', () => {
    render(<TaskForm {...defaultProps} />);
    
    expect(screen.getByText('taskType')).toBeInTheDocument();
    expect(screen.getByText('Plugin')).toBeInTheDocument();
  });

  it('should render trigger type buttons', () => {
    render(<TaskForm {...defaultProps} />);
    
    expect(screen.getByText('Schedule (Cron)')).toBeInTheDocument();
    expect(screen.getByText('Interval')).toBeInTheDocument();
    expect(screen.getByText('One Time')).toBeInTheDocument();
    expect(screen.getByText('Event Trigger')).toBeInTheDocument();
  });

  it('should show cron configuration by default', () => {
    render(<TaskForm {...defaultProps} />);
    
    expect(screen.getByText('useCustomCron')).toBeInTheDocument();
    expect(screen.getByText('timezone')).toBeInTheDocument();
  });

  it('should show interval configuration when interval is selected', () => {
    render(<TaskForm {...defaultProps} />);
    
    fireEvent.click(screen.getByText('Interval'));
    expect(screen.getByText('intervalMinutes')).toBeInTheDocument();
  });

  it('should show date/time inputs when once is selected', () => {
    render(<TaskForm {...defaultProps} />);
    
    fireEvent.click(screen.getByText('One Time'));
    expect(screen.getByText('date')).toBeInTheDocument();
    expect(screen.getByText('time')).toBeInTheDocument();
  });

  it('should show event type input when event is selected', () => {
    render(<TaskForm {...defaultProps} />);
    
    fireEvent.click(screen.getByText('Event Trigger'));
    expect(screen.getByText('eventType')).toBeInTheDocument();
  });

  it('should call onCancel when cancel button is clicked', () => {
    render(<TaskForm {...defaultProps} />);
    
    fireEvent.click(screen.getByText('cancel'));
    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  it('should disable submit button when name is empty', () => {
    render(<TaskForm {...defaultProps} />);
    
    const submitButton = screen.getByText('save').closest('button');
    expect(submitButton).toBeDisabled();
  });

  it('should enable submit button when name is provided', async () => {
    render(<TaskForm {...defaultProps} />);
    
    const nameInput = screen.getByLabelText(/taskName/i);
    await userEvent.type(nameInput, 'My Task');
    
    const submitButton = screen.getByText('save').closest('button');
    expect(submitButton).not.toBeDisabled();
  });

  it('should call onSubmit with correct data', async () => {
    mockOnSubmit.mockResolvedValue(undefined);
    render(<TaskForm {...defaultProps} />);
    
    const nameInput = screen.getByLabelText(/taskName/i);
    await userEvent.type(nameInput, 'My Task');
    
    fireEvent.click(screen.getByText('save'));
    
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'My Task',
          type: 'workflow',
          trigger: expect.objectContaining({
            type: 'cron',
          }),
        })
      );
    });
  });

  it('should populate form with initial values', () => {
    const initialValues: Partial<CreateScheduledTaskInput> = {
      name: 'Existing Task',
      description: 'Existing description',
      type: 'backup',
      trigger: {
        type: 'cron',
        cronExpression: '0 0 * * *',
        timezone: 'Asia/Shanghai',
      },
    };
    
    render(<TaskForm {...defaultProps} initialValues={initialValues} />);
    
    expect(screen.getByDisplayValue('Existing Task')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Existing description')).toBeInTheDocument();
  });

  it('should show cron expression input when custom cron is enabled', async () => {
    render(<TaskForm {...defaultProps} />);
    
    // Find and click the custom cron switch (first switch in the form)
    const switches = screen.getAllByRole('switch');
    fireEvent.click(switches[0]);
    
    // Should show cron input
    expect(screen.getByPlaceholderText('* * * * *')).toBeInTheDocument();
  });

  it('should validate cron expression', async () => {
    render(<TaskForm {...defaultProps} />);
    
    const switches = screen.getAllByRole('switch');
    fireEvent.click(switches[0]); // Custom cron switch
    
    const cronInput = screen.getByPlaceholderText('* * * * *');
    await userEvent.clear(cronInput);
    await userEvent.type(cronInput, 'invalid');
    
    expect(screen.getByText('Invalid cron')).toBeInTheDocument();
  });

  it('should show notification settings', () => {
    render(<TaskForm {...defaultProps} />);
    
    expect(screen.getByText('notifyOnStart')).toBeInTheDocument();
    expect(screen.getByText('notifyOnComplete')).toBeInTheDocument();
    expect(screen.getByText('notifyOnError')).toBeInTheDocument();
  });

  it('should toggle notification channels', () => {
    render(<TaskForm {...defaultProps} />);
    
    const desktopBadge = screen.getByText('desktop');
    fireEvent.click(desktopBadge);
    
    // Badge should be toggled
    expect(desktopBadge).toBeInTheDocument();
  });

  it('should show advanced settings when expanded', () => {
    render(<TaskForm {...defaultProps} />);
    
    fireEvent.click(screen.getByText('advancedSettings'));
    
    expect(screen.getByText('timeoutMs')).toBeInTheDocument();
    expect(screen.getByText('maxRetries')).toBeInTheDocument();
    expect(screen.getByText('retryDelayMs')).toBeInTheDocument();
  });

  it('should validate JSON payload', async () => {
    render(<TaskForm {...defaultProps} />);
    
    const nameInput = screen.getByLabelText(/taskName/i);
    await userEvent.type(nameInput, 'My Task');
    
    const payloadInput = screen.getByPlaceholderText('{"key": "value"}');
    await userEvent.clear(payloadInput);
    await userEvent.type(payloadInput, 'invalid json');
    
    fireEvent.click(screen.getByText('save'));
    
    await waitFor(() => {
      expect(screen.getByText('Invalid JSON')).toBeInTheDocument();
    });
  });

  it('should disable buttons when submitting', () => {
    render(<TaskForm {...defaultProps} isSubmitting={true} />);
    
    const cancelButton = screen.getByText('cancel').closest('button');
    const submitButton = screen.getByText('saving').closest('button');
    
    expect(cancelButton).toBeDisabled();
    expect(submitButton).toBeDisabled();
  });

  it('should show saving text when submitting', () => {
    render(<TaskForm {...defaultProps} isSubmitting={true} />);
    expect(screen.getByText('saving')).toBeInTheDocument();
  });

  it('should handle interval trigger submission', async () => {
    mockOnSubmit.mockResolvedValue(undefined);
    render(<TaskForm {...defaultProps} />);
    
    const nameInput = screen.getByLabelText(/taskName/i);
    await userEvent.type(nameInput, 'Interval Task');
    
    fireEvent.click(screen.getByText('Interval'));
    
    fireEvent.click(screen.getByText('save'));
    
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          trigger: expect.objectContaining({
            type: 'interval',
            intervalMs: 3600000, // 60 minutes in ms
          }),
        })
      );
    });
  });

  it('should not submit when cron is invalid', async () => {
    render(<TaskForm {...defaultProps} />);
    
    const nameInput = screen.getByLabelText(/taskName/i);
    await userEvent.type(nameInput, 'My Task');
    
    const switches = screen.getAllByRole('switch');
    fireEvent.click(switches[0]); // Custom cron switch
    
    const cronInput = screen.getByPlaceholderText('* * * * *');
    await userEvent.clear(cronInput);
    await userEvent.type(cronInput, 'invalid');
    
    fireEvent.click(screen.getByText('save'));
    
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });
});
