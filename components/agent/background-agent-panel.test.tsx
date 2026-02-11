import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { BackgroundAgentPanel } from './background-agent-panel';

// Mock lucide-react icons
jest.mock('lucide-react', () => {
  const icon = (name: string) =>
    function MockIcon(props: Record<string, unknown>) {
      return <svg data-testid={`icon-${name}`} {...props} />;
    };
  return {
    X: icon('X'),
    Play: icon('Play'),
    Pause: icon('Pause'),
    StopCircle: icon('StopCircle'),
    Trash2: icon('Trash2'),
    Bell: icon('Bell'),
    BellOff: icon('BellOff'),
    Bot: icon('Bot'),
    Terminal: icon('Terminal'),
    BarChart3: icon('BarChart3'),
    Search: icon('Search'),
    Download: icon('Download'),
    Filter: icon('Filter'),
    CheckSquare: icon('CheckSquare'),
  };
});

// Mock langfuse to avoid dynamic import issues in Jest
jest.mock('langfuse', () => ({
  Langfuse: jest.fn().mockImplementation(() => ({
    trace: jest.fn(),
    span: jest.fn(),
    generation: jest.fn(),
    score: jest.fn(),
    flush: jest.fn(),
    shutdown: jest.fn(),
  })),
}));

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

jest.mock('@/hooks/agent/use-background-agent', () => ({
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

// Mock AgentCard sub-component
jest.mock('./background-agent-card', () => ({
  AgentCard: ({ agent }: { agent: { name: string } }) => (
    <div data-testid="agent-card">{agent.name}</div>
  ),
}));

// Mock background-agent-sub-components
jest.mock('./background-agent-sub-components', () => ({
  AgentLogsViewer: ({ logs }: { logs: unknown[] }) => (
    <div data-testid="agent-logs">{logs?.length ?? 0} logs</div>
  ),
  PerformanceStatsCard: () => <div data-testid="performance-stats" />,
  ResultPreview: () => <div data-testid="result-preview" />,
}));

// Mock Sheet UI components
jest.mock('@/components/ui/sheet', () => ({
  Sheet: ({ children, open }: { children: React.ReactNode; open?: boolean }) =>
    open !== false ? <div data-testid="sheet">{children}</div> : null,
  SheetContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="sheet-content">{children}</div>
  ),
  SheetHeader: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="sheet-header">{children}</div>
  ),
  SheetTitle: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="sheet-title">{children}</div>
  ),
}));

// Mock DropdownMenu UI components
jest.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuSeparator: () => <hr />,
  DropdownMenuCheckboxItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock Checkbox
jest.mock('@/components/ui/checkbox', () => ({
  Checkbox: (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input type="checkbox" {...props} />
  ),
}));

// Mock Input
jest.mock('@/components/ui/input', () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}));

// Mock Tabs
jest.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children, defaultValue: _dv, ...props }: { children: React.ReactNode; defaultValue?: string; [key: string]: unknown }) => (
    <div data-testid="tabs" {...props}>{children}</div>
  ),
  TabsList: ({ children }: { children: React.ReactNode }) => <div data-testid="tabs-list">{children}</div>,
  TabsTrigger: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <button data-testid={`tab-${value}`}>{children}</button>
  ),
  TabsContent: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <div data-testid={`tab-content-${value}`}>{children}</div>
  ),
}));

// Mock Tooltip
jest.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock Button
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string; size?: string }) => (
    <button onClick={onClick} disabled={disabled} className={className} {...props}>{children}</button>
  ),
}));

// Mock Badge
jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className }: { children: React.ReactNode; className?: string; variant?: string }) => (
    <span className={className}>{children}</span>
  ),
}));

// Mock ScrollArea
jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
}));

describe('BackgroundAgentPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders when panel is open', async () => {
    await act(async () => {
      render(<BackgroundAgentPanel />);
    });
    expect(screen.getByText('backgroundAgents')).toBeInTheDocument();
  });

  it('displays running agents count in badge', async () => {
    await act(async () => {
      render(<BackgroundAgentPanel />);
    });
    expect(screen.getByText('nRunning')).toBeInTheDocument();
  });

  it('displays queue status', async () => {
    await act(async () => {
      render(<BackgroundAgentPanel />);
    });
    expect(screen.getByText('queueStatus')).toBeInTheDocument();
  });

  it('has tabs for All, Running, and Completed', async () => {
    await act(async () => {
      render(<BackgroundAgentPanel />);
    });
    // Tab labels use i18n keys
    expect(screen.getByText('allTab')).toBeInTheDocument();
    expect(screen.getByText('runningTab')).toBeInTheDocument();
    expect(screen.getByText('completedTab')).toBeInTheDocument();
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
    expect(screen.getByText('pauseQueue')).toBeInTheDocument();
  });
});

describe('BackgroundAgentPanel - Agent Selection', () => {
  it('shows placeholder when no agent is selected', async () => {
    await act(async () => {
      render(<BackgroundAgentPanel />);
    });
    expect(screen.getByText('selectAgentDetails')).toBeInTheDocument();
  });
});
