/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { WorkflowIndicator, type WorkflowStatus } from './workflow-indicator';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      ready: 'Ready',
      running: 'Running',
      paused: 'Paused',
      completed: 'Completed',
      failed: 'Failed',
    };
    return translations[key] || key;
  },
}));

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick} {...props}>{children}</button>
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => (
    <span data-testid="badge">{children}</span>
  ),
}));

jest.mock('@/components/ui/progress', () => ({
  Progress: ({ value }: { value: number }) => (
    <div data-testid="progress" data-value={value} role="progressbar" />
  ),
}));

describe('WorkflowIndicator', () => {
  const defaultProps = {
    name: 'Test Workflow',
    status: 'idle' as WorkflowStatus,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with workflow name', () => {
    render(<WorkflowIndicator {...defaultProps} />);
    expect(screen.getByText('Test Workflow')).toBeInTheDocument();
  });

  it('renders with default icon', () => {
    render(<WorkflowIndicator {...defaultProps} />);
    expect(screen.getByText('🔄')).toBeInTheDocument();
  });

  it('renders with custom icon', () => {
    render(<WorkflowIndicator {...defaultProps} icon="🚀" />);
    expect(screen.getByText('🚀')).toBeInTheDocument();
  });

  it('displays idle status', () => {
    render(<WorkflowIndicator {...defaultProps} status="idle" />);
    expect(screen.getByText('Ready')).toBeInTheDocument();
  });

  it('displays running status', () => {
    render(<WorkflowIndicator {...defaultProps} status="running" />);
    expect(screen.getByText('Running')).toBeInTheDocument();
  });

  it('displays paused status', () => {
    render(<WorkflowIndicator {...defaultProps} status="paused" />);
    expect(screen.getByText('Paused')).toBeInTheDocument();
  });

  it('displays completed status', () => {
    render(<WorkflowIndicator {...defaultProps} status="completed" />);
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });

  it('displays failed status', () => {
    render(<WorkflowIndicator {...defaultProps} status="failed" />);
    expect(screen.getByText('Failed')).toBeInTheDocument();
  });

  it('shows progress bar when running with progress', () => {
    render(<WorkflowIndicator {...defaultProps} status="running" progress={50} />);
    expect(screen.getByTestId('progress')).toBeInTheDocument();
    expect(screen.getByTestId('progress')).toHaveAttribute('data-value', '50');
  });

  it('shows current step when running', () => {
    render(
      <WorkflowIndicator
        {...defaultProps}
        status="running"
        currentStep="Processing data..."
      />
    );
    expect(screen.getByText('Processing data...')).toBeInTheDocument();
  });

  it('shows progress when paused', () => {
    render(
      <WorkflowIndicator
        {...defaultProps}
        status="paused"
        progress={75}
        currentStep="Waiting for input"
      />
    );
    expect(screen.getByText('Waiting for input')).toBeInTheDocument();
    expect(screen.getByTestId('progress')).toHaveAttribute('data-value', '75');
  });

  it('calls onCancel when cancel button is clicked', () => {
    const onCancel = jest.fn();
    render(<WorkflowIndicator {...defaultProps} onCancel={onCancel} />);
    
    const cancelButton = screen.getByRole('button');
    fireEvent.click(cancelButton);
    
    expect(onCancel).toHaveBeenCalled();
  });

  it('shows pause button when running', () => {
    const onPause = jest.fn();
    render(
      <WorkflowIndicator
        {...defaultProps}
        status="running"
        onPause={onPause}
        onCancel={jest.fn()}
      />
    );
    
    const buttons = screen.getAllByRole('button');
    // First button should be pause
    fireEvent.click(buttons[0]);
    expect(onPause).toHaveBeenCalled();
  });

  it('shows resume button when paused', () => {
    const onResume = jest.fn();
    render(
      <WorkflowIndicator
        {...defaultProps}
        status="paused"
        onResume={onResume}
        onCancel={jest.fn()}
      />
    );
    
    const buttons = screen.getAllByRole('button');
    // First button should be resume
    fireEvent.click(buttons[0]);
    expect(onResume).toHaveBeenCalled();
  });

  it('does not show pause button when not running', () => {
    const onPause = jest.fn();
    render(
      <WorkflowIndicator
        {...defaultProps}
        status="idle"
        onPause={onPause}
        onCancel={jest.fn()}
      />
    );
    
    // Only cancel button should be present
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(1);
  });

  it('applies custom className', () => {
    const { container } = render(
      <WorkflowIndicator {...defaultProps} className="custom-class" />
    );
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('does not show progress when idle', () => {
    render(<WorkflowIndicator {...defaultProps} status="idle" progress={50} />);
    expect(screen.queryByTestId('progress')).not.toBeInTheDocument();
  });

  it('does not show progress when completed', () => {
    render(<WorkflowIndicator {...defaultProps} status="completed" progress={100} />);
    expect(screen.queryByTestId('progress')).not.toBeInTheDocument();
  });

  it('does not show cancel button when onCancel is not provided', () => {
    render(<WorkflowIndicator {...defaultProps} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
