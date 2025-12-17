/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { AgentSteps, AgentStepsPanel } from './agent-steps';

// Mock the stores
const mockIsAgentRunning = jest.fn();
const mockToolExecutions = jest.fn();

jest.mock('@/stores', () => ({
  useAgentStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      isAgentRunning: mockIsAgentRunning(),
      toolExecutions: mockToolExecutions(),
    };
    return selector(state);
  },
}));

// Mock UI components
jest.mock('@/components/ui/progress', () => ({
  Progress: ({ value, className }: { value: number; className?: string }) => (
    <div data-testid="progress" data-value={value} className={className}>
      Progress: {value}%
    </div>
  ),
}));

describe('AgentSteps', () => {
  const mockSteps = [
    {
      id: 'step-1',
      name: 'Initialize',
      description: 'Setting up the environment',
      status: 'completed' as const,
      startedAt: new Date('2024-01-01T10:00:00'),
      completedAt: new Date('2024-01-01T10:00:02'),
    },
    {
      id: 'step-2',
      name: 'Process',
      description: 'Processing data',
      status: 'running' as const,
      startedAt: new Date('2024-01-01T10:00:02'),
    },
    {
      id: 'step-3',
      name: 'Finalize',
      status: 'pending' as const,
    },
  ];

  it('renders without crashing', () => {
    render(<AgentSteps steps={mockSteps} />);
    expect(screen.getByTestId('progress')).toBeInTheDocument();
  });

  it('displays correct progress', () => {
    render(<AgentSteps steps={mockSteps} />);
    // 1 completed out of 3 steps = 33.33...%
    const progress = screen.getByTestId('progress');
    expect(progress).toHaveAttribute('data-value', expect.stringContaining('33'));
  });

  it('displays step count correctly', () => {
    render(<AgentSteps steps={mockSteps} />);
    expect(screen.getByText('1 / 3 steps')).toBeInTheDocument();
  });

  it('renders all step names', () => {
    render(<AgentSteps steps={mockSteps} />);
    expect(screen.getByText('Initialize')).toBeInTheDocument();
    expect(screen.getByText('Process')).toBeInTheDocument();
    expect(screen.getByText('Finalize')).toBeInTheDocument();
  });

  it('renders step descriptions when provided', () => {
    render(<AgentSteps steps={mockSteps} />);
    expect(screen.getByText('Setting up the environment')).toBeInTheDocument();
    expect(screen.getByText('Processing data')).toBeInTheDocument();
  });

  it('shows completion time for completed steps', () => {
    render(<AgentSteps steps={mockSteps} />);
    // 2 seconds = 2.0s
    expect(screen.getByText(/Completed in 2\.0s/)).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<AgentSteps steps={mockSteps} className="custom-class" />);
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('handles empty steps array', () => {
    render(<AgentSteps steps={[]} />);
    expect(screen.getByText('0 / 0 steps')).toBeInTheDocument();
    const progress = screen.getByTestId('progress');
    expect(progress).toHaveAttribute('data-value', '0');
  });

  it('calculates 100% progress when all steps completed', () => {
    const completedSteps = [
      { id: 'step-1', name: 'Step 1', status: 'completed' as const },
      { id: 'step-2', name: 'Step 2', status: 'completed' as const },
    ];
    render(<AgentSteps steps={completedSteps} />);
    const progress = screen.getByTestId('progress');
    expect(progress).toHaveAttribute('data-value', '100');
  });

  describe('Step status icons', () => {
    it('renders pending status correctly', () => {
      const steps = [{ id: 'step-1', name: 'Pending Step', status: 'pending' as const }];
      render(<AgentSteps steps={steps} />);
      expect(screen.getByText('Pending Step')).toBeInTheDocument();
    });

    it('renders running status correctly', () => {
      const steps = [{ id: 'step-1', name: 'Running Step', status: 'running' as const }];
      render(<AgentSteps steps={steps} />);
      expect(screen.getByText('Running Step')).toBeInTheDocument();
    });

    it('renders completed status correctly', () => {
      const steps = [{ id: 'step-1', name: 'Completed Step', status: 'completed' as const }];
      render(<AgentSteps steps={steps} />);
      expect(screen.getByText('Completed Step')).toBeInTheDocument();
    });

    it('renders error status correctly', () => {
      const steps = [{ id: 'step-1', name: 'Error Step', status: 'error' as const }];
      render(<AgentSteps steps={steps} />);
      expect(screen.getByText('Error Step')).toBeInTheDocument();
    });
  });

  describe('Step numbering', () => {
    it('displays correct step numbers', () => {
      render(<AgentSteps steps={mockSteps} />);
      expect(screen.getByText('Step 1')).toBeInTheDocument();
      expect(screen.getByText('Step 2')).toBeInTheDocument();
      expect(screen.getByText('Step 3')).toBeInTheDocument();
    });
  });
});

describe('AgentStepsPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsAgentRunning.mockReturnValue(false);
    mockToolExecutions.mockReturnValue([]);
  });

  it('returns null when not running and no executions', () => {
    mockIsAgentRunning.mockReturnValue(false);
    mockToolExecutions.mockReturnValue([]);

    const { container } = render(<AgentStepsPanel />);
    expect(container.firstChild).toBeNull();
  });

  it('renders when agent is running', () => {
    mockIsAgentRunning.mockReturnValue(true);
    mockToolExecutions.mockReturnValue([]);

    render(<AgentStepsPanel />);
    expect(screen.getByText('Agent Execution')).toBeInTheDocument();
  });

  it('renders when there are tool executions', () => {
    mockIsAgentRunning.mockReturnValue(false);
    mockToolExecutions.mockReturnValue([
      {
        id: 'tool-1',
        toolName: 'web_search',
        status: 'completed',
        startedAt: new Date(),
        completedAt: new Date(),
      },
    ]);

    render(<AgentStepsPanel />);
    expect(screen.getByText('Agent Execution')).toBeInTheDocument();
    expect(screen.getByText('web_search')).toBeInTheDocument();
  });

  it('converts tool executions to AgentStep format', () => {
    mockIsAgentRunning.mockReturnValue(true);
    mockToolExecutions.mockReturnValue([
      {
        id: 'tool-1',
        toolName: 'file_read',
        status: 'pending',
      },
      {
        id: 'tool-2',
        toolName: 'code_execute',
        status: 'running',
      },
      {
        id: 'tool-3',
        toolName: 'web_search',
        status: 'completed',
      },
      {
        id: 'tool-4',
        toolName: 'api_call',
        status: 'error',
      },
    ]);

    render(<AgentStepsPanel />);
    expect(screen.getByText('file_read')).toBeInTheDocument();
    expect(screen.getByText('code_execute')).toBeInTheDocument();
    expect(screen.getByText('web_search')).toBeInTheDocument();
    expect(screen.getByText('api_call')).toBeInTheDocument();
  });

  it('displays progress based on tool executions', () => {
    mockIsAgentRunning.mockReturnValue(true);
    mockToolExecutions.mockReturnValue([
      { id: 'tool-1', toolName: 'step1', status: 'completed' },
      { id: 'tool-2', toolName: 'step2', status: 'completed' },
      { id: 'tool-3', toolName: 'step3', status: 'running' },
      { id: 'tool-4', toolName: 'step4', status: 'pending' },
    ]);

    render(<AgentStepsPanel />);
    expect(screen.getByText('2 / 4 steps')).toBeInTheDocument();
  });
});
