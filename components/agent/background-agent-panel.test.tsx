import { render, screen, act } from '@testing-library/react';
import BackgroundAgentPanel from './background-agent-panel';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock useBackgroundAgent hook
const mockClosePanel = jest.fn();
const mockStartAgent = jest.fn();
const mockPauseAgent = jest.fn();
const mockResumeAgent = jest.fn();
const mockCancelAgent = jest.fn();
const mockDeleteAgent = jest.fn();
const mockSelectAgent = jest.fn();
const mockClearCompleted = jest.fn();
const mockCancelAll = jest.fn();
const mockPauseQueue = jest.fn();
const mockResumeQueue = jest.fn();
const mockMarkAllNotificationsRead = jest.fn();

const mockAgents = [
  {
    id: '1',
    name: 'Running Agent',
    task: 'Test task for running agent',
    status: 'running',
    progress: 50,
    steps: [],
    subAgents: [],
    logs: [],
    createdAt: new Date(),
    startedAt: new Date(),
  },
  {
    id: '2',
    name: 'Completed Agent',
    task: 'Test task for completed agent',
    status: 'completed',
    progress: 100,
    steps: [],
    subAgents: [],
    logs: [],
    createdAt: new Date(),
    startedAt: new Date(),
    completedAt: new Date(),
  },
];

jest.mock('@/hooks/ai/use-background-agent', () => ({
  useBackgroundAgent: () => ({
    agents: mockAgents,
    runningAgents: [mockAgents[0]],
    completedAgents: [mockAgents[1]],
    selectedAgent: null,
    isPanelOpen: true,
    unreadNotificationCount: 0,
    queueState: {
      items: 0,
      currentlyRunning: 1,
      maxConcurrent: 3,
      isPaused: false,
    },
    openPanel: jest.fn(),
    closePanel: mockClosePanel,
    startAgent: mockStartAgent,
    pauseAgent: mockPauseAgent,
    resumeAgent: mockResumeAgent,
    cancelAgent: mockCancelAgent,
    deleteAgent: mockDeleteAgent,
    selectAgent: mockSelectAgent,
    clearCompleted: mockClearCompleted,
    cancelAll: mockCancelAll,
    pauseQueue: mockPauseQueue,
    resumeQueue: mockResumeQueue,
    markAllNotificationsRead: mockMarkAllNotificationsRead,
  }),
}));

// Mock AgentFlowVisualizer
jest.mock('./agent-flow-visualizer', () => ({
  AgentFlowVisualizer: () => <div data-testid="agent-flow-visualizer">Flow Visualizer</div>,
}));

describe('BackgroundAgentPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders when panel is open', async () => {
    await act(async () => {
      render(<BackgroundAgentPanel />);
    });
    expect(screen.getByText('Background Agents')).toBeInTheDocument();
  });

  it('displays running agents count in badge', async () => {
    await act(async () => {
      render(<BackgroundAgentPanel />);
    });
    expect(screen.getByText('1 running')).toBeInTheDocument();
  });

  it('displays queue status', async () => {
    await act(async () => {
      render(<BackgroundAgentPanel />);
    });
    expect(screen.getByText(/Queue:/)).toBeInTheDocument();
  });

  it('has tabs for All, Running, and Completed', async () => {
    await act(async () => {
      render(<BackgroundAgentPanel />);
    });
    // Multiple elements may contain these texts, so use getAllByText
    expect(screen.getAllByText(/All/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Running/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Completed/).length).toBeGreaterThan(0);
  });

  it('displays agent cards', async () => {
    await act(async () => {
      render(<BackgroundAgentPanel />);
    });
    expect(screen.getByText('Running Agent')).toBeInTheDocument();
    expect(screen.getByText('Completed Agent')).toBeInTheDocument();
  });
});

describe('BackgroundAgentPanel - Queue Controls', () => {
  it('shows pause queue button when queue is running', async () => {
    await act(async () => {
      render(<BackgroundAgentPanel />);
    });
    expect(screen.getByText('Pause Queue')).toBeInTheDocument();
  });
});

describe('BackgroundAgentPanel - Agent Selection', () => {
  it('shows placeholder when no agent is selected', async () => {
    await act(async () => {
      render(<BackgroundAgentPanel />);
    });
    expect(screen.getByText('Select an agent to view details')).toBeInTheDocument();
  });
});
