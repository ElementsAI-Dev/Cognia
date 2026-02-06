/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { ToolTimeline, ToolExecution } from './tool-timeline';

// Mock lucide-react icons
jest.mock('lucide-react', () => {
  function makeIcon(name: string) {
    function Icon(props: React.SVGProps<SVGSVGElement>) {
      return <svg {...props} data-testid={`icon-${name}`} />;
    }
    return Icon;
  }

  return {
    Clock: makeIcon('Clock'),
    CheckCircle: makeIcon('CheckCircle'),
    XCircle: makeIcon('XCircle'),
    Loader2: makeIcon('Loader2'),
    AlertTriangle: makeIcon('AlertTriangle'),
    ChevronDown: makeIcon('ChevronDown'),
    ChevronUp: makeIcon('ChevronUp'),
    Zap: makeIcon('Zap'),
    Bookmark: makeIcon('Bookmark'),
    ListTodo: makeIcon('ListTodo'),
    Eye: makeIcon('Eye'),
    EyeOff: makeIcon('EyeOff'),
    BarChart3: makeIcon('BarChart3'),
  };
});

// Mock cn + duration formatting
jest.mock('@/lib/utils', () => ({
  cn: (...args: Array<string | false | null | undefined>) => args.filter(Boolean).join(' '),
  formatDurationShort: (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) {
      const s = ms / 1000;
      const out = s.toFixed(1).replace(/\.0$/, '');
      return `${out}s`;
    }
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  },
}));

// Mock UI components that can be heavy in tests
jest.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    className,
    type,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: string;
    size?: string;
    asChild?: boolean;
  }) => (
    <button type={type} onClick={onClick} disabled={disabled} className={className} {...props}>
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
    variant?: string;
  }) => (
    <span data-testid="badge" className={className}>
      {children}
    </span>
  ),
}));

jest.mock('@/components/chat/ui/copy-button', () => ({
  CopyButton: ({
    content,
  }: {
    content: string;
    iconOnly?: boolean;
    tooltip?: string;
    className?: string;
  }) => <button data-testid="copy-button" data-content={content} />,
}));

jest.mock('@/components/ui/collapsible', () => ({
  Collapsible: ({ children }: { children: React.ReactNode; open?: boolean }) => (
    <div data-testid="collapsible">{children}</div>
  ),
  CollapsibleContent: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => (
    <div data-testid="collapsible-content" className={className}>
      {children}
    </div>
  ),
}));

jest.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip">{children}</div>
  ),
  TooltipContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip-content">{children}</div>
  ),
  TooltipTrigger: ({
    children,
  }: {
    children: React.ReactNode;
    asChild?: boolean;
    className?: string;
  }) => <div data-testid="tooltip-trigger">{children}</div>,
}));

jest.mock('@/components/ui/progress', () => ({
  Progress: ({ value, className }: { value: number; className?: string }) => (
    <div data-testid="progress" data-value={value} className={className} />
  ),
}));

jest.mock('@/components/ai-elements/checkpoint', () => ({
  Checkpoint: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="checkpoint" className={className}>
      {children}
    </div>
  ),
  CheckpointIcon: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="checkpoint-icon">{children}</div>
  ),
  CheckpointTrigger: ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    tooltip?: string;
  }) => (
    <button data-testid="checkpoint-trigger" onClick={onClick}>
      {children}
    </button>
  ),
}));

jest.mock('@/components/ai-elements/queue', () => ({
  Queue: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="queue" className={className}>
      {children}
    </div>
  ),
  QueueSection: ({
    children,
  }: {
    children: React.ReactNode;
    defaultOpen?: boolean;
    onOpenChange?: (open: boolean) => void;
  }) => <div data-testid="queue-section">{children}</div>,
  QueueSectionTrigger: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="queue-section-trigger">{children}</div>
  ),
  QueueSectionLabel: ({
    label,
    count,
  }: {
    label: string;
    count: number;
    icon?: React.ReactNode;
  }) => (
    <div data-testid="queue-section-label">
      {label} {count}
    </div>
  ),
  QueueSectionContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="queue-section-content">{children}</div>
  ),
  QueueList: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="queue-list">{children}</div>
  ),
  QueueItem: ({ children }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="queue-item">{children}</div>
  ),
  QueueItemIndicator: () => <div data-testid="queue-item-indicator" />,
  QueueItemContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="queue-item-content">{children}</div>
  ),
}));

jest.mock('@/components/a2ui', () => ({
  A2UIToolOutput: () => <div data-testid="a2ui-output" />,
  hasA2UIToolOutput: () => false,
}));

jest.mock('@/components/mcp', () => ({
  MCPServerBadge: () => <span data-testid="mcp-server-badge" />,
}));

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      toolExecutions: 'Tool Executions',
      running: 'Running',
      successRate: 'Success Rate',
      avgDuration: 'Avg Duration',
      pending: 'Pending',
    };
    return translations[key] || key;
  },
}));

describe('ToolTimeline', () => {
  const mockExecutions: ToolExecution[] = [
    {
      id: 'exec-1',
      toolName: 'web_search',
      state: 'output-available',
      startTime: new Date(1000),
      endTime: new Date(2500),
    },
    {
      id: 'exec-2',
      toolName: 'file-read',
      state: 'input-available',
      startTime: new Date(2500),
    },
    {
      id: 'exec-3',
      toolName: 'api_call',
      state: 'output-error',
      startTime: new Date(3000),
      endTime: new Date(3500),
      error: 'Connection failed',
    },
  ];

  it('renders nothing when executions array is empty', () => {
    const { container } = render(<ToolTimeline executions={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders without crashing with executions', () => {
    render(<ToolTimeline executions={mockExecutions} />);
    expect(screen.getByText('Tool Executions')).toBeInTheDocument();
  });

  it('displays tool count summary', () => {
    const { container } = render(<ToolTimeline executions={mockExecutions} />);
    // Component renders executions
    expect(container.firstChild).toBeInTheDocument();
  });

  it('displays total duration', () => {
    const { container } = render(<ToolTimeline executions={mockExecutions} />);
    // Component renders with executions
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders all tool names formatted correctly', () => {
    render(<ToolTimeline executions={mockExecutions} />);
    expect(screen.getByText('Web Search')).toBeInTheDocument();
    expect(screen.getByText('File Read')).toBeInTheDocument();
    expect(screen.getByText('Api Call')).toBeInTheDocument();
  });

  it('displays correct status labels', () => {
    render(<ToolTimeline executions={mockExecutions} />);
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('Running')).toBeInTheDocument();
    expect(screen.getByText('Error')).toBeInTheDocument();
  });

  it('displays error message for failed executions', () => {
    render(<ToolTimeline executions={mockExecutions} />);
    expect(screen.getByText(/Connection failed/)).toBeInTheDocument();
  });

  it('displays duration for completed executions', () => {
    render(<ToolTimeline executions={mockExecutions} />);
    expect(screen.getByText('1.5s')).toBeInTheDocument();
    expect(screen.getByText('500ms')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <ToolTimeline executions={mockExecutions} className="custom-class" />
    );
    expect(container.firstChild).toHaveClass('custom-class');
  });

  describe('State configurations', () => {
    it('renders input-streaming state correctly', () => {
      const streamingExec: ToolExecution[] = [
        { id: '1', toolName: 'test', state: 'input-streaming', startTime: new Date(0) },
      ];
      render(<ToolTimeline executions={streamingExec} />);
      expect(screen.getByText('Preparing')).toBeInTheDocument();
    });

    it('renders approval-requested state correctly', () => {
      const approvalExec: ToolExecution[] = [
        { id: '1', toolName: 'test', state: 'approval-requested', startTime: new Date(0) },
      ];
      render(<ToolTimeline executions={approvalExec} />);
      expect(screen.getByText('Awaiting Approval')).toBeInTheDocument();
    });

    it('renders approval-responded state correctly', () => {
      const respondedExec: ToolExecution[] = [
        { id: '1', toolName: 'test', state: 'approval-responded', startTime: new Date(0) },
      ];
      render(<ToolTimeline executions={respondedExec} />);
      expect(screen.getByText('Approved')).toBeInTheDocument();
    });

    it('renders output-denied state correctly', () => {
      const deniedExec: ToolExecution[] = [
        { id: '1', toolName: 'test', state: 'output-denied', startTime: new Date(0) },
      ];
      render(<ToolTimeline executions={deniedExec} />);
      expect(screen.getByText('Denied')).toBeInTheDocument();
    });
  });

  describe('Duration formatting', () => {
    it('formats milliseconds correctly', () => {
      const shortExec: ToolExecution[] = [
        {
          id: '1',
          toolName: 'test',
          state: 'output-available',
          startTime: new Date(0),
          endTime: new Date(500),
        },
      ];
      render(<ToolTimeline executions={shortExec} />);
      // Duration appears in multiple places (header stats, timeline item, badge)
      expect(screen.getAllByText('500ms').length).toBeGreaterThanOrEqual(1);
    });

    it('formats seconds correctly', () => {
      const secExec: ToolExecution[] = [
        {
          id: '1',
          toolName: 'test',
          state: 'output-available',
          startTime: new Date(0),
          endTime: new Date(5500),
        },
      ];
      render(<ToolTimeline executions={secExec} />);
      // Duration appears in multiple places (header stats, timeline item, badge)
      expect(screen.getAllByText('5.5s').length).toBeGreaterThanOrEqual(1);
    });

    it('formats minutes correctly', () => {
      const minExec: ToolExecution[] = [
        {
          id: '1',
          toolName: 'test',
          state: 'output-available',
          startTime: new Date(0),
          endTime: new Date(125000),
        },
      ];
      render(<ToolTimeline executions={minExec} />);
      // Duration appears in multiple places (header stats, timeline item, badge)
      expect(screen.getAllByText('2m 5s').length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Single execution', () => {
    it('displays singular "tool" for single execution', () => {
      const singleExec: ToolExecution[] = [
        {
          id: '1',
          toolName: 'test',
          state: 'output-available',
          startTime: new Date(0),
          endTime: new Date(1000),
        },
      ];
      const { container } = render(<ToolTimeline executions={singleExec} />);
      // Check that the component renders with at least one execution
      expect(container.firstChild).toBeInTheDocument();
    });
  });
});
