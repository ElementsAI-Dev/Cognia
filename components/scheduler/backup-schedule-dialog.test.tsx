/**
 * BackupScheduleDialog Component Tests
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BackupScheduleDialog } from './backup-schedule-dialog';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock useScheduler hook
const mockCreateTask = jest.fn();
jest.mock('@/hooks/scheduler', () => ({
  useScheduler: () => ({
    createTask: mockCreateTask,
  }),
}));

describe('BackupScheduleDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateTask.mockResolvedValue({ id: 'task-123' });
  });

  it('should render trigger button', () => {
    render(<BackupScheduleDialog />);
    expect(screen.getByText('backup.schedule')).toBeInTheDocument();
  });

  it('should render custom trigger', () => {
    render(
      <BackupScheduleDialog
        trigger={<button data-testid="custom-trigger">Custom</button>}
      />
    );
    expect(screen.getByTestId('custom-trigger')).toBeInTheDocument();
  });

  it('should open dialog when trigger is clicked', () => {
    render(<BackupScheduleDialog />);
    
    fireEvent.click(screen.getByText('backup.schedule'));
    
    expect(screen.getByText('backup.scheduleTitle')).toBeInTheDocument();
    expect(screen.getByText('backup.scheduleDescription')).toBeInTheDocument();
  });

  it('should render task name input', () => {
    render(<BackupScheduleDialog />);
    fireEvent.click(screen.getByText('backup.schedule'));
    
    expect(screen.getByLabelText('taskName')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Scheduled Backup')).toBeInTheDocument();
  });

  it('should render schedule frequency selector', () => {
    render(<BackupScheduleDialog />);
    fireEvent.click(screen.getByText('backup.schedule'));
    
    expect(screen.getByText('backup.scheduleFrequency')).toBeInTheDocument();
  });

  it('should render backup type selector', () => {
    render(<BackupScheduleDialog />);
    fireEvent.click(screen.getByText('backup.schedule'));
    
    expect(screen.getByText('backup.type')).toBeInTheDocument();
  });

  it('should render destination selector', () => {
    render(<BackupScheduleDialog />);
    fireEvent.click(screen.getByText('backup.schedule'));
    
    expect(screen.getByText('backup.destination')).toBeInTheDocument();
  });

  it('should render backup options when full backup is selected', () => {
    render(<BackupScheduleDialog />);
    fireEvent.click(screen.getByText('backup.schedule'));
    
    expect(screen.getByText('backup.includeOptions')).toBeInTheDocument();
    expect(screen.getByLabelText('backup.options.sessions')).toBeInTheDocument();
    expect(screen.getByLabelText('backup.options.settings')).toBeInTheDocument();
    expect(screen.getByLabelText('backup.options.artifacts')).toBeInTheDocument();
    expect(screen.getByLabelText('backup.options.indexedDB')).toBeInTheDocument();
  });

  it('should render notification settings', () => {
    render(<BackupScheduleDialog />);
    fireEvent.click(screen.getByText('backup.schedule'));
    
    expect(screen.getByText('notificationSettings.title')).toBeInTheDocument();
    expect(screen.getByText('notificationSettings.onComplete')).toBeInTheDocument();
    expect(screen.getByText('notificationSettings.onError')).toBeInTheDocument();
  });

  it('should close dialog when cancel button is clicked', () => {
    render(<BackupScheduleDialog />);
    fireEvent.click(screen.getByText('backup.schedule'));
    
    fireEvent.click(screen.getByText('cancel'));
    
    expect(screen.queryByText('backup.scheduleTitle')).not.toBeInTheDocument();
  });

  it('should call createTask when form is submitted', async () => {
    const mockOnScheduled = jest.fn();
    render(<BackupScheduleDialog onScheduled={mockOnScheduled} />);
    
    fireEvent.click(screen.getByText('backup.schedule'));
    fireEvent.click(screen.getByText('schedule'));
    
    await waitFor(() => {
      expect(mockCreateTask).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Scheduled Backup',
          type: 'backup',
          trigger: expect.objectContaining({
            type: 'cron',
            cronExpression: '0 2 * * *',
          }),
        })
      );
    });
  });

  it('should call onScheduled callback after task creation', async () => {
    const mockOnScheduled = jest.fn();
    render(<BackupScheduleDialog onScheduled={mockOnScheduled} />);
    
    fireEvent.click(screen.getByText('backup.schedule'));
    fireEvent.click(screen.getByText('schedule'));
    
    await waitFor(() => {
      expect(mockOnScheduled).toHaveBeenCalledWith('task-123');
    });
  });

  it('should close dialog after successful submission', async () => {
    render(<BackupScheduleDialog />);
    
    fireEvent.click(screen.getByText('backup.schedule'));
    fireEvent.click(screen.getByText('schedule'));
    
    await waitFor(() => {
      expect(screen.queryByText('backup.scheduleTitle')).not.toBeInTheDocument();
    });
  });

  it('should disable submit button when task name is empty', async () => {
    render(<BackupScheduleDialog />);
    fireEvent.click(screen.getByText('backup.schedule'));
    
    const nameInput = screen.getByLabelText('taskName');
    await userEvent.clear(nameInput);
    
    const submitButton = screen.getByText('schedule').closest('button');
    expect(submitButton).toBeDisabled();
  });

  it('should show scheduling text when submitting', async () => {
    mockCreateTask.mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve({ id: 'task-123' }), 100)));
    
    render(<BackupScheduleDialog />);
    fireEvent.click(screen.getByText('backup.schedule'));
    fireEvent.click(screen.getByText('schedule'));
    
    expect(screen.getByText('scheduling')).toBeInTheDocument();
  });

  it('should toggle backup options', async () => {
    render(<BackupScheduleDialog />);
    fireEvent.click(screen.getByText('backup.schedule'));
    
    const sessionsCheckbox = screen.getByLabelText('backup.options.sessions');
    expect(sessionsCheckbox).toBeChecked();
    
    fireEvent.click(sessionsCheckbox);
    expect(sessionsCheckbox).not.toBeChecked();
  });

  it('should toggle notification settings', () => {
    render(<BackupScheduleDialog />);
    fireEvent.click(screen.getByText('backup.schedule'));
    
    // Find notification switches by their container text
    const switches = screen.getAllByRole('switch');
    expect(switches.length).toBeGreaterThan(0);
    
    // Toggle a switch
    fireEvent.click(switches[0]);
  });

  it('should allow changing cron expression', async () => {
    render(<BackupScheduleDialog />);
    fireEvent.click(screen.getByText('backup.schedule'));
    
    const cronInput = screen.getByPlaceholderText('0 2 * * *');
    await userEvent.clear(cronInput);
    await userEvent.type(cronInput, '0 3 * * *');
    
    fireEvent.click(screen.getByText('schedule'));
    
    await waitFor(() => {
      expect(mockCreateTask).toHaveBeenCalledWith(
        expect.objectContaining({
          trigger: expect.objectContaining({
            cronExpression: '0 3 * * *',
          }),
        })
      );
    });
  });

  it('should not call onScheduled when createTask returns null', async () => {
    mockCreateTask.mockResolvedValue(null);
    const mockOnScheduled = jest.fn();
    
    render(<BackupScheduleDialog onScheduled={mockOnScheduled} />);
    fireEvent.click(screen.getByText('backup.schedule'));
    fireEvent.click(screen.getByText('schedule'));
    
    await waitFor(() => {
      expect(mockCreateTask).toHaveBeenCalled();
    });
    
    expect(mockOnScheduled).not.toHaveBeenCalled();
  });

  it('should include backup options in payload', async () => {
    render(<BackupScheduleDialog />);
    fireEvent.click(screen.getByText('backup.schedule'));
    
    // Uncheck some options
    const artifactsCheckbox = screen.getByLabelText('backup.options.artifacts');
    fireEvent.click(artifactsCheckbox);
    
    fireEvent.click(screen.getByText('schedule'));
    
    await waitFor(() => {
      expect(mockCreateTask).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            options: expect.objectContaining({
              includeSessions: true,
              includeSettings: true,
              includeArtifacts: false,
              includeIndexedDB: true,
            }),
          }),
        })
      );
    });
  });

  it('should render destination hint for cloud targets', () => {
    render(<BackupScheduleDialog />);
    fireEvent.click(screen.getByText('backup.schedule'));
    expect(screen.getByText('backup.destinationHint')).toBeInTheDocument();
  });
});
