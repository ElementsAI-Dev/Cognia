/**
 * ScriptTaskEditor Component Tests
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { ScriptTaskEditor } from './script-task-editor';
import type { ExecuteScriptAction } from '@/types/scheduler';

jest.mock('@/lib/scheduler/script-executor', () => ({
  validateScript: jest.fn(() => ({ valid: true, errors: [], warnings: [] })),
  getScriptTemplate: jest.fn((lang: string) => `# Template for ${lang}`),
}));

import { validateScript, getScriptTemplate } from '@/lib/scheduler/script-executor';

describe('ScriptTaskEditor', () => {
  const defaultAction: ExecuteScriptAction = {
    type: 'execute_script',
    language: 'python',
    code: '',
    use_sandbox: true,
    timeout_secs: 300,
    memory_mb: 512,
  };

  const defaultProps = {
    value: defaultAction,
    onChange: jest.fn(),
    onTest: jest.fn(),
    disabled: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (validateScript as jest.Mock).mockReturnValue({
      valid: true,
      errors: [],
      warnings: [],
    });
    (getScriptTemplate as jest.Mock).mockImplementation(
      (lang: string) => `# Template for ${lang}`
    );
  });

  describe('rendering', () => {
    it('should render language selector', () => {
      render(<ScriptTaskEditor {...defaultProps} />);

      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('should render code textarea', () => {
      render(<ScriptTaskEditor {...defaultProps} />);

      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('should render sandbox toggle', () => {
      render(<ScriptTaskEditor {...defaultProps} />);

      expect(screen.getByRole('switch')).toBeInTheDocument();
    });

    it('should render test button when onTest provided', () => {
      render(<ScriptTaskEditor {...defaultProps} />);

      expect(screen.getByRole('button', { name: /test/i })).toBeInTheDocument();
    });

    it('should not render test button when onTest not provided', () => {
      render(<ScriptTaskEditor {...defaultProps} onTest={undefined} />);

      expect(screen.queryByRole('button', { name: /test/i })).not.toBeInTheDocument();
    });

    it('should render advanced settings trigger', () => {
      render(<ScriptTaskEditor {...defaultProps} />);

      expect(screen.getByText(/Advanced/i)).toBeInTheDocument();
    });
  });

  describe('language selection', () => {
    it('should display selected language', () => {
      render(<ScriptTaskEditor {...defaultProps} />);

      expect(screen.getByRole('combobox')).toHaveTextContent(/python/i);
    });

    it('should call onChange when language changes', () => {
      render(<ScriptTaskEditor {...defaultProps} />);

      const combobox = screen.getByRole('combobox');
      fireEvent.click(combobox);

      const option = screen.getByRole('option', { name: /javascript/i });
      fireEvent.click(option);

      expect(defaultProps.onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          language: 'javascript',
        })
      );
    });

    it('should get template for new language when code is empty', () => {
      render(<ScriptTaskEditor {...defaultProps} />);

      const combobox = screen.getByRole('combobox');
      fireEvent.click(combobox);

      const option = screen.getByRole('option', { name: /javascript/i });
      fireEvent.click(option);

      expect(getScriptTemplate).toHaveBeenCalledWith('javascript');
    });
  });

  describe('code editing', () => {
    it('should display code value', () => {
      const actionWithCode = {
        ...defaultAction,
        code: 'print("Hello")',
      };

      render(<ScriptTaskEditor {...defaultProps} value={actionWithCode} />);

      expect(screen.getByRole('textbox')).toHaveValue('print("Hello")');
    });

    it('should call onChange when code changes', () => {
      render(<ScriptTaskEditor {...defaultProps} />);

      const textarea = screen.getByRole('textbox');
      fireEvent.change(textarea, { target: { value: 'new code' } });

      expect(defaultProps.onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'new code',
        })
      );
    });

    it('should validate code on change', () => {
      render(<ScriptTaskEditor {...defaultProps} />);

      const textarea = screen.getByRole('textbox');
      fireEvent.change(textarea, { target: { value: 'print(1)' } });

      expect(validateScript).toHaveBeenCalledWith('python', 'print(1)');
    });

    it('should display validation errors', () => {
      (validateScript as jest.Mock).mockReturnValue({
        valid: false,
        errors: ['Dangerous pattern detected'],
        warnings: [],
      });

      render(<ScriptTaskEditor {...defaultProps} />);

      const textarea = screen.getByRole('textbox');
      fireEvent.change(textarea, { target: { value: 'rm -rf /' } });

      expect(screen.getByText('Dangerous pattern detected')).toBeInTheDocument();
    });

    it('should display validation warnings', () => {
      (validateScript as jest.Mock).mockReturnValue({
        valid: true,
        errors: [],
        warnings: ['Uses network access'],
      });

      render(<ScriptTaskEditor {...defaultProps} />);

      const textarea = screen.getByRole('textbox');
      fireEvent.change(textarea, { target: { value: 'import requests' } });

      expect(screen.getByText('Uses network access')).toBeInTheDocument();
    });
  });

  describe('sandbox toggle', () => {
    it('should be checked when use_sandbox is true', () => {
      render(<ScriptTaskEditor {...defaultProps} />);

      expect(screen.getByRole('switch')).toBeChecked();
    });

    it('should be unchecked when use_sandbox is false', () => {
      const actionNoSandbox = {
        ...defaultAction,
        use_sandbox: false,
      };

      render(<ScriptTaskEditor {...defaultProps} value={actionNoSandbox} />);

      expect(screen.getByRole('switch')).not.toBeChecked();
    });

    it('should call onChange when toggled', () => {
      render(<ScriptTaskEditor {...defaultProps} />);

      const toggle = screen.getByRole('switch');
      fireEvent.click(toggle);

      expect(defaultProps.onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          use_sandbox: false,
        })
      );
    });
  });

  describe('test button', () => {
    it('should be disabled when code is empty', () => {
      render(<ScriptTaskEditor {...defaultProps} />);

      const testButton = screen.getByRole('button', { name: /test/i });
      expect(testButton).toBeDisabled();
    });

    it('should be enabled when code has content', () => {
      const actionWithCode = {
        ...defaultAction,
        code: 'print(1)',
      };

      render(<ScriptTaskEditor {...defaultProps} value={actionWithCode} />);

      const testButton = screen.getByRole('button', { name: /test/i });
      expect(testButton).not.toBeDisabled();
    });

    it('should call onTest when clicked', () => {
      const actionWithCode = {
        ...defaultAction,
        code: 'print(1)',
      };

      render(<ScriptTaskEditor {...defaultProps} value={actionWithCode} />);

      const testButton = screen.getByRole('button', { name: /test/i });
      fireEvent.click(testButton);

      expect(defaultProps.onTest).toHaveBeenCalled();
    });
  });

  describe('advanced settings', () => {
    it('should expand when clicked', () => {
      render(<ScriptTaskEditor {...defaultProps} />);

      const advancedButton = screen.getByText(/Advanced/i);
      fireEvent.click(advancedButton);

      // Should show timeout and memory text
      expect(screen.getByText(/Timeout/i)).toBeInTheDocument();
      expect(screen.getByText(/Memory/i)).toBeInTheDocument();
    });

    it('should display timeout input after expand', () => {
      render(<ScriptTaskEditor {...defaultProps} />);

      const advancedButton = screen.getByText(/Advanced/i);
      fireEvent.click(advancedButton);

      // Find number inputs - timeout and memory
      const numberInputs = screen.getAllByRole('spinbutton');
      expect(numberInputs.length).toBeGreaterThanOrEqual(2);
    });

    it('should display memory input after expand', () => {
      render(<ScriptTaskEditor {...defaultProps} />);

      const advancedButton = screen.getByText(/Advanced/i);
      fireEvent.click(advancedButton);

      // Should have memory limit text
      expect(screen.getByText(/Memory Limit/i)).toBeInTheDocument();
    });

    it('should have number inputs with correct values', () => {
      render(<ScriptTaskEditor {...defaultProps} />);

      const advancedButton = screen.getByText(/Advanced/i);
      fireEvent.click(advancedButton);

      const numberInputs = screen.getAllByRole('spinbutton');
      // Should have timeout (300) and memory (512) inputs
      expect(numberInputs.some((input) => (input as HTMLInputElement).value === '300')).toBe(
        true
      );
      expect(numberInputs.some((input) => (input as HTMLInputElement).value === '512')).toBe(
        true
      );
    });

    it('should call onChange when number inputs change', () => {
      render(<ScriptTaskEditor {...defaultProps} />);

      const advancedButton = screen.getByText(/Advanced/i);
      fireEvent.click(advancedButton);

      const numberInputs = screen.getAllByRole('spinbutton');
      fireEvent.change(numberInputs[0], { target: { value: '600' } });

      expect(defaultProps.onChange).toHaveBeenCalled();
    });
  });

  describe('disabled state', () => {
    it('should disable all inputs when disabled', () => {
      render(<ScriptTaskEditor {...defaultProps} disabled={true} />);

      expect(screen.getByRole('combobox')).toBeDisabled();
      expect(screen.getByRole('textbox')).toBeDisabled();
      expect(screen.getByRole('switch')).toBeDisabled();
    });

    it('should disable test button when disabled', () => {
      const actionWithCode = {
        ...defaultAction,
        code: 'print(1)',
      };

      render(
        <ScriptTaskEditor {...defaultProps} value={actionWithCode} disabled={true} />
      );

      const testButton = screen.getByRole('button', { name: /test/i });
      expect(testButton).toBeDisabled();
    });
  });
});
