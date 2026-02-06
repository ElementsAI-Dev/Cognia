/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { AgentSteps } from './agent-steps';

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
    expect(screen.getByText(/1 \/ 3/)).toBeInTheDocument();
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
    expect(screen.getByText(/0 \/ 0/)).toBeInTheDocument();
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

describe('AgentSteps', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsAgentRunning.mockReturnValue(false);
    mockToolExecutions.mockReturnValue([]);
  });

  it('renders empty state when steps array is empty', () => {
    render(<AgentSteps steps={[]} />);
    // Component still renders container with 0/0 progress
    expect(screen.getByText(/0 \/ 0/)).toBeInTheDocument();
  });

  it('renders when there are steps', () => {
    const steps = [
      { id: 'step-1', name: 'TestStep', status: 'running' as const, description: 'Running step' },
    ];
    render(<AgentSteps steps={steps} />);
    expect(screen.getByText('TestStep')).toBeInTheDocument();
  });

  it('renders completed steps', () => {
    const steps = [
      {
        id: 'step-1',
        name: 'WebSearch',
        status: 'completed' as const,
        description: 'Search completed',
      },
    ];
    render(<AgentSteps steps={steps} />);
    expect(screen.getByText('WebSearch')).toBeInTheDocument();
  });

  it('renders multiple steps with different statuses', () => {
    const steps = [
      { id: 'step-1', name: 'FileRead', status: 'pending' as const, description: 'Pending' },
      { id: 'step-2', name: 'CodeExecute', status: 'running' as const, description: 'Running' },
      { id: 'step-3', name: 'WebSearch', status: 'completed' as const, description: 'Done' },
      { id: 'step-4', name: 'ApiCall', status: 'error' as const, description: 'Failed' },
    ];
    render(<AgentSteps steps={steps} />);
    expect(screen.getByText('FileRead')).toBeInTheDocument();
    expect(screen.getByText('CodeExecute')).toBeInTheDocument();
    expect(screen.getByText('WebSearch')).toBeInTheDocument();
    expect(screen.getByText('ApiCall')).toBeInTheDocument();
  });

  it('displays progress based on completed steps', () => {
    const steps = [
      { id: 'step-1', name: 'step1', status: 'completed' as const, description: '' },
      { id: 'step-2', name: 'step2', status: 'completed' as const, description: '' },
      { id: 'step-3', name: 'step3', status: 'running' as const, description: '' },
      { id: 'step-4', name: 'step4', status: 'pending' as const, description: '' },
    ];
    render(<AgentSteps steps={steps} />);
    // Component shows "X / Y" format with translated "steps" text
    expect(screen.getByText(/2 \/ 4/)).toBeInTheDocument();
  });
});
