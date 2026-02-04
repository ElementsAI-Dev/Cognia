/**
 * SystemTaskForm Component Tests
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SystemTaskForm } from './system-task-form';
import type { CreateSystemTaskInput } from '@/types/scheduler';

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

jest.mock('@/lib/scheduler/script-executor', () => ({
  validateScript: jest.fn(() => ({ valid: true, errors: [], warnings: [] })),
  getScriptTemplate: jest.fn(() => '# Template'),
}));

describe('SystemTaskForm', () => {
  const mockOnSubmit = jest.fn();
  const mockOnCancel = jest.fn();

  const defaultProps = {
    onSubmit: mockOnSubmit,
    onCancel: mockOnCancel,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render basic fields', () => {
    render(<SystemTaskForm {...defaultProps} />);

    expect(screen.getByText('systemTaskName')).toBeInTheDocument();
    expect(screen.getByText('systemTaskDescription')).toBeInTheDocument();
    expect(screen.getByText('systemTriggerType')).toBeInTheDocument();
    expect(screen.getByText('systemActionType')).toBeInTheDocument();
  });

  it('should render script editor by default', () => {
    render(<SystemTaskForm {...defaultProps} />);

    expect(screen.getByText('脚本语言 / Script Language')).toBeInTheDocument();
  });

  it('should disable submit when required fields are missing', () => {
    render(<SystemTaskForm {...defaultProps} />);

    const submitButton = screen.getByText('save').closest('button');
    expect(submitButton).toBeDisabled();
  });

  it('should submit script task configuration', async () => {
    mockOnSubmit.mockResolvedValue(undefined);
    render(<SystemTaskForm {...defaultProps} />);

    const nameInput = screen.getByPlaceholderText('taskNamePlaceholder');
    await userEvent.type(nameInput, 'System Task');

    const textareas = screen.getAllByRole('textbox');
    const scriptTextarea = textareas[textareas.length - 1];
    fireEvent.change(scriptTextarea, { target: { value: 'print("hello")' } });

    fireEvent.click(screen.getByText('save'));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'System Task',
          trigger: expect.objectContaining({ type: 'cron' }),
          action: expect.objectContaining({ type: 'execute_script' }),
          run_level: 'user',
        })
      );
    });
  });

  it('should populate initial values', () => {
    const initialValues: Partial<CreateSystemTaskInput> = {
      name: 'Existing System Task',
      description: 'Existing description',
      trigger: {
        type: 'interval',
        seconds: 120,
      },
      action: {
        type: 'run_command',
        command: 'echo',
        args: ['hello'],
      },
      run_level: 'administrator',
    };

    render(<SystemTaskForm {...defaultProps} initialValues={initialValues} />);

    expect(screen.getByDisplayValue('Existing System Task')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Existing description')).toBeInTheDocument();
  });
});
