/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { CodeExecutionPanel } from './code-execution-panel';

const mockSuccessResult = {
  success: true,
  stdout: 'Hello World\nOutput line 2',
  stderr: '',
  exitCode: 0,
  executionTime: 150,
  language: 'javascript',
  isSimulated: false,
};

const mockErrorResult = {
  success: false,
  stdout: '',
  stderr: 'Error: Something went wrong',
  exitCode: 1,
  executionTime: 50,
  language: 'python',
  isSimulated: false,
};

const mockHandlers = {
  onExecute: jest.fn(),
  onCancel: jest.fn(),
  onClear: jest.fn(),
};

// Mock hooks
jest.mock('@/hooks/ui', () => ({
  useCopy: () => ({
    copy: jest.fn().mockResolvedValue(true),
    isCopying: false,
  }),
}));

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, className, disabled, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { disabled?: boolean }) => (
    <button onClick={onClick} className={className} disabled={disabled} data-testid={className?.includes('h-9') ? 'touch-target-button' : ''} {...props}>{children}</button>
  ),
}));

jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

jest.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      codeExecution: 'Code Execution',
      executing: 'Executing',
      readyToRun: 'Ready to run',
      executionSuccess: 'executionSuccess',
      executionFailed: 'executionFailed',
      simulated: 'simulated',
      copyOutput: 'copyOutput',
      run: 'run',
      stop: 'stop',
      output: 'output',
      errors: 'errors',
      noOutput: 'noOutput',
      executingCode: 'executingCode',
      exitCode: 'exitCode',
      lines: 'lines',
    };
    return translations[key] || key;
  },
}));

jest.mock('lucide-react', () => ({
  Play: () => <span data-testid="play-icon">▶</span>,
  Square: () => <span data-testid="stop-icon">⏹</span>,
  CheckCircle2: () => <span data-testid="check-icon">✓</span>,
  XCircle: () => <span data-testid="x-icon">✗</span>,
  Clock: () => <span data-testid="clock-icon">🕐</span>,
  Terminal: () => <span data-testid="terminal-icon">💻</span>,
  AlertTriangle: () => <span data-testid="alert-icon">⚠</span>,
  Copy: () => <span data-testid="copy-icon">📋</span>,
  X: () => <span data-testid="x-close-icon">✕</span>,
  Loader2: () => <span data-testid="loader-icon">⟳</span>,
}));

describe('CodeExecutionPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders when not executing and no result', () => {
    render(
      <CodeExecutionPanel
        result={null}
        isExecuting={false}
        language="javascript"
        {...mockHandlers}
      />
    );
    expect(screen.getByText('Code Execution')).toBeInTheDocument();
    expect(screen.getByText('javascript')).toBeInTheDocument();
    expect(screen.getByText('readyToRun')).toBeInTheDocument();
  });

  it('renders when executing', () => {
    render(
      <CodeExecutionPanel
        result={null}
        isExecuting={true}
        language="python"
        {...mockHandlers}
      />
    );
    expect(screen.getByText('executing')).toBeInTheDocument();
    expect(screen.getByTestId('stop-icon')).toBeInTheDocument();
  });

  it('renders successful execution result', () => {
    render(
      <CodeExecutionPanel
        result={mockSuccessResult}
        isExecuting={false}
        language="javascript"
        {...mockHandlers}
      />
    );
    expect(screen.getByText('executionSuccess')).toBeInTheDocument();
    expect(screen.getByText('Hello World')).toBeInTheDocument();
    expect(screen.getByText('150ms')).toBeInTheDocument();
    expect(screen.getByText('exitCode: 0')).toBeInTheDocument();
  });

  it('renders error result', () => {
    render(
      <CodeExecutionPanel
        result={mockErrorResult}
        isExecuting={false}
        language="python"
        {...mockHandlers}
      />
    );
    expect(screen.getByText('executionFailed')).toBeInTheDocument();
    expect(screen.getByText('Error: Something went wrong')).toBeInTheDocument();
  });

  it('calls onExecute when clicking run button', () => {
    render(
      <CodeExecutionPanel
        result={null}
        isExecuting={false}
        language="javascript"
        {...mockHandlers}
      />
    );
    const runButton = screen.getByText('run');
    fireEvent.click(runButton);
    expect(mockHandlers.onExecute).toHaveBeenCalled();
  });

  it('calls onCancel when executing and clicking stop button', () => {
    render(
      <CodeExecutionPanel
        result={null}
        isExecuting={true}
        language="javascript"
        {...mockHandlers}
      />
    );
    const stopButton = screen.getByText('stop');
    fireEvent.click(stopButton);
    expect(mockHandlers.onCancel).toHaveBeenCalled();
  });

  it('calls onClear when clicking clear button', () => {
    render(
      <CodeExecutionPanel
        result={mockSuccessResult}
        isExecuting={false}
        language="javascript"
        {...mockHandlers}
      />
    );
    const clearButton = screen.getByTestId('x-close-icon')?.closest('button');
    if (clearButton) fireEvent.click(clearButton);
    expect(mockHandlers.onClear).toHaveBeenCalled();
  });

  it('displays "No output" message for successful execution with no output', () => {
    const noOutputResult = { ...mockSuccessResult, stdout: '', stderr: '' };
    render(
      <CodeExecutionPanel
        result={noOutputResult}
        isExecuting={false}
        language="javascript"
        {...mockHandlers}
      />
    );
    expect(screen.getByText('noOutput')).toBeInTheDocument();
  });

  it('shows simulated badge for simulated results', () => {
    const simulatedResult = { ...mockSuccessResult, isSimulated: true };
    render(
      <CodeExecutionPanel
        result={simulatedResult}
        isExecuting={false}
        language="javascript"
        {...mockHandlers}
      />
    );
    expect(screen.getByText('simulated')).toBeInTheDocument();
  });

  describe('Touch Target Accessibility', () => {
    it('renders icon buttons with h-9 w-9 for touch targets', () => {
      render(
        <CodeExecutionPanel
          result={mockSuccessResult}
          isExecuting={false}
          language="javascript"
          {...mockHandlers}
        />
      );
      const touchTargetButtons = screen.getAllByTestId('touch-target-button');
      expect(touchTargetButtons.length).toBeGreaterThan(0);
    });

    it('renders Run/Stop buttons with h-9 height', () => {
      render(
        <CodeExecutionPanel
          result={null}
          isExecuting={false}
          language="javascript"
          {...mockHandlers}
        />
      );
      const runButton = screen.getByText('Run').closest('button');
      expect(runButton).toHaveClass('h-9');
    });
  });

  describe('Mobile Code Font Sizes', () => {
    it('applies responsive font sizes to stdout', () => {
      render(
        <CodeExecutionPanel
          result={mockSuccessResult}
          isExecuting={false}
          language="javascript"
          {...mockHandlers}
        />
      );
      const stdoutPre = screen.getByText('Hello World').closest('pre');
      expect(stdoutPre).toHaveClass('text-xs');
      expect(stdoutPre).toHaveClass('sm:text-sm');
    });

    it('applies responsive font sizes to stderr', () => {
      render(
        <CodeExecutionPanel
          result={mockErrorResult}
          isExecuting={false}
          language="javascript"
          {...mockHandlers}
        />
      );
      const stderrPre = screen.getByText('Error: Something went wrong').closest('pre');
      expect(stderrPre).toHaveClass('text-xs');
      expect(stderrPre).toHaveClass('sm:text-sm');
    });
  });

  describe('Output Display', () => {
    it('shows execution stats', () => {
      render(
        <CodeExecutionPanel
          result={mockSuccessResult}
          isExecuting={false}
          language="javascript"
          {...mockHandlers}
        />
      );
      expect(screen.getByText('150ms')).toBeInTheDocument();
      expect(screen.getByText('Exit code: 0')).toBeInTheDocument();
    });

    it('handles multi-line output correctly', () => {
      const multiLineResult = {
        ...mockSuccessResult,
        stdout: 'Line 1\nLine 2\nLine 3',
      };
      render(
        <CodeExecutionPanel
          result={multiLineResult}
          isExecuting={false}
          language="javascript"
          {...mockHandlers}
        />
      );
      expect(screen.getByText('Line 1')).toBeInTheDocument();
      expect(screen.getByText('Line 2')).toBeInTheDocument();
      expect(screen.getByText('Line 3')).toBeInTheDocument();
    });
  });
});
