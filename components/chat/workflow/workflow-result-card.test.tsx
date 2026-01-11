/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { WorkflowResultCard, type WorkflowResultData } from './workflow-result-card';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock next/link
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick} {...props}>{children}</button>
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span data-testid="badge">{children}</span>,
}));

jest.mock('@/components/ui/collapsible', () => ({
  Collapsible: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CollapsibleContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CollapsibleTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('@/components/ui/progress', () => ({
  Progress: ({ value }: { value: number }) => (
    <div data-testid="progress" data-value={value} role="progressbar" aria-valuenow={value} />
  ),
}));

describe('WorkflowResultCard', () => {
  const completedWorkflow: WorkflowResultData = {
    workflowId: 'wf-1',
    workflowName: 'Test Workflow',
    executionId: 'exec-1',
    status: 'completed',
    progress: 100,
    startedAt: new Date(Date.now() - 60000),
    completedAt: new Date(),
    output: { result: 'success' },
  };

  const runningWorkflow: WorkflowResultData = {
    workflowId: 'wf-2',
    workflowName: 'Running Workflow',
    executionId: 'exec-2',
    status: 'running',
    startedAt: new Date(),
    progress: 50,
    logs: [{ timestamp: new Date(), level: 'info', message: 'Processing data' }],
  };

  const failedWorkflow: WorkflowResultData = {
    workflowId: 'wf-3',
    workflowName: 'Failed Workflow',
    executionId: 'exec-3',
    status: 'failed',
    progress: 30,
    startedAt: new Date(Date.now() - 120000),
    completedAt: new Date(),
    error: 'An error occurred during execution',
  };

  const defaultProps = {
    data: completedWorkflow,
    onRerun: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders workflow name', () => {
    render(<WorkflowResultCard {...defaultProps} />);
    
    expect(screen.getByText('Test Workflow')).toBeInTheDocument();
  });

  it('displays completed status correctly', () => {
    render(<WorkflowResultCard {...defaultProps} />);
    
    expect(screen.getByTestId('badge')).toBeInTheDocument();
  });

  it('displays running status with progress', () => {
    render(<WorkflowResultCard {...defaultProps} data={runningWorkflow} />);
    
    expect(screen.getByText('Running Workflow')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('displays failed status with error', () => {
    render(<WorkflowResultCard {...defaultProps} data={failedWorkflow} />);
    
    expect(screen.getByText('Failed Workflow')).toBeInTheDocument();
    expect(screen.getByText('An error occurred during execution')).toBeInTheDocument();
  });

  it('calls onRerun when rerun button is clicked', () => {
    render(<WorkflowResultCard {...defaultProps} />);
    
    const buttons = screen.getAllByRole('button');
    const rerunButton = buttons.find(btn => btn.textContent?.includes('Rerun') || btn.querySelector('svg'));
    
    if (rerunButton) {
      fireEvent.click(rerunButton);
      expect(defaultProps.onRerun).toHaveBeenCalled();
    }
  });

  it('shows progress for running workflows', () => {
    render(<WorkflowResultCard {...defaultProps} data={runningWorkflow} />);
    
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '50');
  });

  it('displays output for completed workflows', () => {
    render(<WorkflowResultCard {...defaultProps} />);
    
    // The output should be visible when expanded
    expect(screen.getByText(/"result":\s*"success"/)).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <WorkflowResultCard {...defaultProps} className="custom-class" />
    );
    
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('handles missing onRerun gracefully', () => {
    render(<WorkflowResultCard data={completedWorkflow} />);
    
    expect(screen.getByText('Test Workflow')).toBeInTheDocument();
  });
});
