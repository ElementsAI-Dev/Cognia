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
  Button: ({
    children,
    onClick,
    className,
    disabled,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { disabled?: boolean }) => (
    <button
      onClick={onClick}
      className={className}
      disabled={disabled}
      data-testid={className?.includes('h-9') ? 'touch-target-button' : ''}
      {...props}
    >
      {children}
    </button>
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
    // When no result and not executing, the run button should be visible
    expect(screen.getByText('run')).toBeInTheDocument();
  });

  it('renders when executing', () => {
    render(
      <CodeExecutionPanel result={null} isExecuting={true} language="python" {...mockHandlers} />
    );
    // Check for executing state indicators
    expect(screen.getByText('executingCode')).toBeInTheDocument();
    expect(screen.getByTestId('stop-icon')).toBeInTheDocument();
  });

  it('renders successful execution result', () => {
    const { container } = render(
      <CodeExecutionPanel
        result={mockSuccessResult}
        isExecuting={false}
        language="javascript"
        {...mockHandlers}
      />
    );
    expect(screen.getByText('executionSuccess')).toBeInTheDocument();
    // Output text is in a pre element
    const preElement = container.querySelector('pre');
    expect(preElement?.textContent).toContain('Hello World');
    // Stats are displayed as separate text nodes
    const statsText = container.textContent;
    expect(statsText).toContain('150');
    expect(statsText).toContain('exitCode');
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
      // The run button text is lowercase from translation mock
      const runButton = screen.getByText('run').closest('button');
      expect(runButton).toHaveClass('h-9');
    });
  });

  describe('Mobile Code Font Sizes', () => {
    it('applies responsive font sizes to stdout', () => {
      const { container } = render(
        <CodeExecutionPanel
          result={mockSuccessResult}
          isExecuting={false}
          language="javascript"
          {...mockHandlers}
        />
      );
      const stdoutPre = container.querySelector('pre');
      expect(stdoutPre).toHaveClass('text-xs');
      expect(stdoutPre).toHaveClass('sm:text-sm');
    });

    it('applies responsive font sizes to stderr', () => {
      const { container } = render(
        <CodeExecutionPanel
          result={mockErrorResult}
          isExecuting={false}
          language="javascript"
          {...mockHandlers}
        />
      );
      const stderrPre = container.querySelector('pre');
      expect(stderrPre).toHaveClass('text-xs');
      expect(stderrPre).toHaveClass('sm:text-sm');
    });
  });

  describe('Output Display', () => {
    it('shows execution stats', () => {
      const { container } = render(
        <CodeExecutionPanel
          result={mockSuccessResult}
          isExecuting={false}
          language="javascript"
          {...mockHandlers}
        />
      );
      // Check the stats container has execution info
      const statsText = container.textContent;
      expect(statsText).toContain('150');
      expect(statsText).toContain('ms');
      expect(statsText).toContain('exitCode');
    });

    it('handles multi-line output correctly', () => {
      const multiLineResult = {
        ...mockSuccessResult,
        stdout: 'Line 1\nLine 2\nLine 3',
      };
      const { container } = render(
        <CodeExecutionPanel
          result={multiLineResult}
          isExecuting={false}
          language="javascript"
          {...mockHandlers}
        />
      );
      // Multi-line content is in a pre element
      const preElement = container.querySelector('pre');
      expect(preElement?.textContent).toContain('Line 1');
      expect(preElement?.textContent).toContain('Line 2');
      expect(preElement?.textContent).toContain('Line 3');
    });
  });
});
