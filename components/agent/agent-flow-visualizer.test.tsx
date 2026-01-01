import { render, screen, act } from '@testing-library/react';
import { AgentFlowVisualizer } from './agent-flow-visualizer';
import type { BackgroundAgent } from '@/types/background-agent';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock useSubAgent hook
jest.mock('@/hooks', () => ({
  useSubAgent: () => ({
    subAgents: [],
    activeSubAgents: [],
    isExecuting: false,
    progress: 0,
    executeOne: jest.fn(),
    executeAll: jest.fn(),
    cancelAll: jest.fn(),
    clearCompleted: jest.fn(),
    createSubAgent: jest.fn(),
  }),
}));

const mockAgent = {
  id: 'agent-1',
  name: 'Test Agent',
  description: 'Test agent description',
  task: 'Test task',
  status: 'running',
  progress: 50,
  steps: [
    {
      id: 'step-1',
      stepNumber: 1,
      type: 'tool_call',
      title: 'Step 1',
      description: 'First step',
      status: 'completed',
      duration: 1000,
    },
    {
      id: 'step-2',
      stepNumber: 2,
      type: 'tool_call',
      title: 'Step 2',
      description: 'Second step',
      status: 'running',
    },
  ],
  subAgents: [],
  logs: [],
  createdAt: new Date(),
  startedAt: new Date(),
  sessionId: 'session-1',
  config: {},
  executionState: {},
  notifications: [],
  result: null,
} as unknown as BackgroundAgent;

describe('AgentFlowVisualizer', () => {
  it('renders without crashing', async () => {
    await act(async () => {
      render(<AgentFlowVisualizer agent={mockAgent} />);
    });
  });

  it('displays agent name', async () => {
    await act(async () => {
      render(<AgentFlowVisualizer agent={mockAgent} />);
    });
    expect(screen.getByText('Test Agent')).toBeInTheDocument();
  });

  it('displays agent description', async () => {
    await act(async () => {
      render(<AgentFlowVisualizer agent={mockAgent} />);
    });
    expect(screen.getByText('Test agent description')).toBeInTheDocument();
  });

  it('accepts className prop', async () => {
    const { container } = await act(async () => {
      return render(<AgentFlowVisualizer agent={mockAgent} className="custom-class" />);
    });
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('accepts callback props', async () => {
    const mockSubAgentClick = jest.fn();
    const mockStepClick = jest.fn();
    await act(async () => {
      render(
        <AgentFlowVisualizer
          agent={mockAgent}
          onSubAgentClick={mockSubAgentClick}
          onStepClick={mockStepClick}
        />
      );
    });
  });
});
