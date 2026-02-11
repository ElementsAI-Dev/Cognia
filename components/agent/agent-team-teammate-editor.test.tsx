/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { AgentTeamTeammateEditor } from './agent-team-teammate-editor';

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

jest.mock('@/lib/utils', () => ({
  cn: (...args: (string | boolean | undefined | null)[]) => args.filter(Boolean).join(' '),
}));

const mockTeammate = {
  id: 'tm-1',
  name: 'Research Agent',
  description: 'Handles research tasks',
  specialization: 'research',
  role: 'member' as const,
  status: 'idle' as const,
  progress: 0,
  provider: 'openai',
  model: 'gpt-4',
  lastActivity: null,
  tokenUsage: { totalTokens: 150, promptTokens: 100, completionTokens: 50 },
  taskIds: ['task-1'],
  messageIds: [],
  config: {
    specialization: 'research',
    provider: 'openai',
    model: 'gpt-4',
  },
};

const mockTasks: Record<string, { id: string; title: string; status: string; assignedTo: string }> = {
  'task-1': { id: 'task-1', title: 'Research AI trends', status: 'pending', assignedTo: 'tm-1' },
};

const mockStore = {
  teammates: { 'tm-1': mockTeammate },
  updateTeammate: jest.fn(),
  tasks: mockTasks,
  messages: {},
  getUnreadMessages: jest.fn(() => []),
};

jest.mock('@/stores/agent/agent-team-store', () => ({
  useAgentTeamStore: (selector: (s: typeof mockStore) => unknown) => selector(mockStore),
}));

jest.mock('@/types/agent/agent-team', () => ({
  TEAMMATE_STATUS_CONFIG: {
    idle: { label: 'Idle', icon: 'Circle', color: '' },
    executing: { label: 'Executing', icon: 'Play', color: '' },
    completed: { label: 'Completed', icon: 'CheckCircle', color: '' },
    planning: { label: 'Planning', icon: 'Brain', color: '' },
    paused: { label: 'Paused', icon: 'Pause', color: '' },
    failed: { label: 'Failed', icon: 'XCircle', color: '' },
    cancelled: { label: 'Cancelled', icon: 'Ban', color: '' },
    shutdown: { label: 'Shutdown', icon: 'Power', color: '' },
    awaiting_approval: { label: 'Awaiting', icon: 'Lock', color: '' },
  },
  TASK_STATUS_CONFIG: {
    pending: { label: 'Pending', icon: 'Circle', color: '' },
    in_progress: { label: 'In Progress', icon: 'Play', color: '' },
    completed: { label: 'Completed', icon: 'CheckCircle', color: '' },
    failed: { label: 'Failed', icon: 'XCircle', color: '' },
    blocked: { label: 'Blocked', icon: 'Lock', color: '' },
    cancelled: { label: 'Cancelled', icon: 'Ban', color: '' },
  },
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick} {...rest}>{children}</button>
  ),
}));

jest.mock('@/components/ui/input', () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}));

jest.mock('@/components/ui/label', () => ({
  Label: ({ children }: { children: React.ReactNode }) => <label>{children}</label>,
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

jest.mock('@/components/ui/progress', () => ({
  Progress: ({ value }: { value: number }) => <div data-testid="progress" data-value={value} />,
}));

jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/ui/separator', () => ({
  Separator: () => <hr />,
}));

jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card" className={className}>{children}</div>
  ),
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/ui/collapsible', () => ({
  Collapsible: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CollapsibleContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CollapsibleTrigger: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
}));

jest.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

jest.mock('lucide-react', () => {
  const icon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} />;
  return {
    User: icon, Settings2: icon, Activity: icon, MessageSquare: icon,
    Clock: icon, Cpu: icon, ChevronDown: icon, ChevronRight: icon,
    X: icon, Check: icon, Edit: icon,
  };
});

describe('AgentTeamTeammateEditor', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders teammate name and status', () => {
    render(<AgentTeamTeammateEditor teammateId="tm-1" onClose={mockOnClose} />);
    expect(screen.getByText('Research Agent')).toBeInTheDocument();
  });

  it('shows null state for non-existent teammate', () => {
    const { container } = render(
      <AgentTeamTeammateEditor teammateId="non-existent" onClose={mockOnClose} />
    );
    expect(container.textContent).toContain('Teammate not found');
  });

  it('renders token usage', () => {
    render(<AgentTeamTeammateEditor teammateId="tm-1" onClose={mockOnClose} />);
    expect(screen.getByText('150')).toBeInTheDocument();
  });
});
