/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ExecutionStatisticsPanel } from './execution-statistics-panel';

// Mock date-fns
jest.mock('date-fns', () => ({
  formatDistanceToNow: () => '5 minutes ago',
}));

// Mock store functions
const mockClearExecutionRecords = jest.fn();
const mockGetWorkflowStatistics = jest.fn(() => ({
  totalExecutions: 10,
  successfulExecutions: 8,
  failedExecutions: 2,
  cancelledExecutions: 0,
  successRate: 80,
  averageDuration: 5000,
  minDuration: 1000,
  maxDuration: 10000,
  lastExecutedAt: new Date(),
  executionHistory: [
    { id: '1', status: 'completed', startedAt: new Date(), duration: 5000 },
    { id: '2', status: 'failed', startedAt: new Date(), duration: 3000, errorMessage: 'Test error' },
    { id: '3', status: 'completed', startedAt: new Date(), duration: 4000 },
  ],
}));

// Mock workflow editor store
jest.mock('@/stores/workflow', () => ({
  useWorkflowEditorStore: () => ({
    currentWorkflow: { id: 'workflow-1', name: 'Test Workflow' },
    getWorkflowStatistics: mockGetWorkflowStatistics,
    clearExecutionRecords: mockClearExecutionRecords,
  }),
}));

// Mock UI components
jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, className }: { children: React.ReactNode; variant?: string; className?: string }) => (
    <span data-testid="badge" data-variant={variant} className={className}>{children}</span>
  ),
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, title, variant, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string; size?: string }) => (
    <button onClick={onClick} disabled={disabled} title={title} data-variant={variant} {...props}>
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/progress', () => ({
  Progress: ({ value, className }: { value: number; className?: string }) => (
    <div data-testid="progress" data-value={value} className={className} role="progressbar" />
  ),
}));

jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="scroll-area" className={className}>{children}</div>
  ),
}));

jest.mock('@/components/ui/separator', () => ({
  Separator: () => <hr data-testid="separator" />,
}));

jest.mock('@/components/ui/sheet', () => ({
  Sheet: ({ children }: { children: React.ReactNode }) => <div data-testid="sheet">{children}</div>,
  SheetContent: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="sheet-content" className={className}>{children}</div>
  ),
  SheetDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  SheetHeader: ({ children }: { children: React.ReactNode }) => <div data-testid="sheet-header">{children}</div>,
  SheetTitle: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <h2 data-testid="sheet-title" className={className}>{children}</h2>
  ),
  SheetTrigger: ({ children, asChild: _asChild }: { children: React.ReactNode; asChild?: boolean }) => (
    <div data-testid="sheet-trigger">{children}</div>
  ),
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  BarChart3: () => <span data-testid="chart-icon">Chart</span>,
  CheckCircle: () => <span data-testid="check-icon">Check</span>,
  XCircle: () => <span data-testid="x-icon">X</span>,
  Clock: () => <span data-testid="clock-icon">Clock</span>,
  TrendingUp: () => <span data-testid="trending-icon">Trending</span>,
  Trash2: () => <span data-testid="trash-icon">Trash</span>,
  Activity: () => <span data-testid="activity-icon">Activity</span>,
}));

describe('ExecutionStatisticsPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<ExecutionStatisticsPanel />);
    expect(screen.getByTestId('sheet')).toBeInTheDocument();
  });

  it('renders trigger button with chart icon', () => {
    render(<ExecutionStatisticsPanel />);
    expect(screen.getByTestId('chart-icon')).toBeInTheDocument();
  });

  it('displays sheet title', () => {
    render(<ExecutionStatisticsPanel />);
    expect(screen.getByText('Execution Statistics')).toBeInTheDocument();
  });

  it('displays success rate', () => {
    render(<ExecutionStatisticsPanel />);
    expect(screen.getByText('80.0%')).toBeInTheDocument();
  });

  it('displays success rate label', () => {
    render(<ExecutionStatisticsPanel />);
    expect(screen.getByText('Success Rate')).toBeInTheDocument();
  });

  it('displays total executions', () => {
    render(<ExecutionStatisticsPanel />);
    expect(screen.getByText('10')).toBeInTheDocument();
  });

  it('displays average duration', () => {
    render(<ExecutionStatisticsPanel />);
    expect(screen.getByText('5.00s')).toBeInTheDocument();
  });

  it('displays min duration', () => {
    render(<ExecutionStatisticsPanel />);
    expect(screen.getByText('1.00s')).toBeInTheDocument();
  });

  it('displays max duration', () => {
    render(<ExecutionStatisticsPanel />);
    expect(screen.getByText('10.00s')).toBeInTheDocument();
  });

  it('displays execution breakdown badges', () => {
    render(<ExecutionStatisticsPanel />);
    expect(screen.getByText('8 Success')).toBeInTheDocument();
    expect(screen.getByText('2 Failed')).toBeInTheDocument();
  });

  it('displays recent executions header', () => {
    render(<ExecutionStatisticsPanel />);
    expect(screen.getByText('Recent Executions')).toBeInTheDocument();
  });

  it('displays last executed time', () => {
    render(<ExecutionStatisticsPanel />);
    expect(screen.getByText(/Last:/)).toBeInTheDocument();
  });

  it('displays execution history items', () => {
    render(<ExecutionStatisticsPanel />);
    // Check and X icons for completed/failed executions
    const checkIcons = screen.getAllByTestId('check-icon');
    expect(checkIcons.length).toBeGreaterThan(0);
  });

  it('displays error message for failed executions', () => {
    render(<ExecutionStatisticsPanel />);
    expect(screen.getByText('Test error')).toBeInTheDocument();
  });

  it('calls clearExecutionRecords when clear button is clicked', () => {
    render(<ExecutionStatisticsPanel />);
    
    const clearButton = screen.getByText('Clear History').closest('button');
    if (clearButton) {
      fireEvent.click(clearButton);
      expect(mockClearExecutionRecords).toHaveBeenCalledWith('workflow-1');
    }
  });

  it('renders progress bar for success rate', () => {
    render(<ExecutionStatisticsPanel />);
    const progress = screen.getByTestId('progress');
    expect(progress).toHaveAttribute('data-value', '80');
  });

  it('displays successful and failed counts in progress section', () => {
    render(<ExecutionStatisticsPanel />);
    expect(screen.getByText('8 successful')).toBeInTheDocument();
    expect(screen.getByText('2 failed')).toBeInTheDocument();
  });
});

describe('ExecutionStatisticsPanel with no data', () => {
  beforeEach(() => {
    mockGetWorkflowStatistics.mockReturnValue({
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      cancelledExecutions: 0,
      successRate: 0,
      averageDuration: 0,
      minDuration: 0,
      maxDuration: 0,
      lastExecutedAt: null as unknown as Date,
      executionHistory: [],
    });
  });

  afterEach(() => {
    mockGetWorkflowStatistics.mockReturnValue({
      totalExecutions: 10,
      successfulExecutions: 8,
      failedExecutions: 2,
      cancelledExecutions: 0,
      successRate: 80,
      averageDuration: 5000,
      minDuration: 1000,
      maxDuration: 10000,
      lastExecutedAt: new Date(),
      executionHistory: [],
    });
  });

  it('displays empty state message', () => {
    render(<ExecutionStatisticsPanel />);
    expect(screen.getByText('No execution data yet')).toBeInTheDocument();
  });

  it('displays hint to run workflow', () => {
    render(<ExecutionStatisticsPanel />);
    expect(screen.getByText('Run the workflow to see statistics')).toBeInTheDocument();
  });

  it('shows activity icon in empty state', () => {
    render(<ExecutionStatisticsPanel />);
    const activityIcons = screen.getAllByTestId('activity-icon');
    expect(activityIcons.length).toBeGreaterThan(0);
  });
});

describe('ExecutionStatisticsPanel duration formatting', () => {
  it('formats milliseconds correctly', () => {
    mockGetWorkflowStatistics.mockReturnValue({
      totalExecutions: 1,
      successfulExecutions: 1,
      failedExecutions: 0,
      cancelledExecutions: 0,
      successRate: 100,
      averageDuration: 500,
      minDuration: 100,
      maxDuration: 900,
      lastExecutedAt: new Date(),
      executionHistory: [],
    });
    
    render(<ExecutionStatisticsPanel />);
    expect(screen.getByText('500ms')).toBeInTheDocument();
  });

  it('formats minutes correctly', () => {
    mockGetWorkflowStatistics.mockReturnValue({
      totalExecutions: 1,
      successfulExecutions: 1,
      failedExecutions: 0,
      cancelledExecutions: 0,
      successRate: 100,
      averageDuration: 125000,
      minDuration: 60000,
      maxDuration: 180000,
      lastExecutedAt: new Date(),
      executionHistory: [],
    });
    
    render(<ExecutionStatisticsPanel />);
    expect(screen.getByText('2m 5s')).toBeInTheDocument();
  });
});
