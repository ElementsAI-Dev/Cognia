/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { LiveTracePanel } from './live-trace-panel';

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

jest.mock('@/lib/utils', () => ({
  cn: (...args: (string | boolean | undefined | null)[]) => args.filter(Boolean).join(' '),
}));

jest.mock('@/lib/agent-trace/cost-estimator', () => ({
  formatCost: (cost: number) => `$${cost.toFixed(4)}`,
}));

const mockEvents: Array<{ id: string; type: string; timestamp: number; data: Record<string, unknown> }> = [];
const mockStore = {
  activeSessions: {} as Record<string, { events: typeof mockEvents; startTime: number; totalTokens: number; totalCost: number; toolCalls: number; steps: number }>,
  getSessionEvents: jest.fn(() => mockEvents),
  getSessionStats: jest.fn(() => ({
    totalTokens: 0,
    totalCost: 0,
    toolCalls: 0,
    steps: 0,
    duration: 0,
  })),
};

jest.mock('@/stores/agent-trace', () => ({
  useAgentTraceStore: (selector: (s: typeof mockStore) => unknown) => selector(mockStore),
  AgentTraceEvent: {},
}));

jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card" className={className}>{children}</div>
  ),
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

jest.mock('lucide-react', () => {
  const icon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} />;
  return {
    Activity: icon, Zap: icon, Clock: icon, Coins: icon, Wrench: icon,
    CheckCircle2: icon, XCircle: icon, Play: icon, Pause: icon,
    AlertTriangle: icon, MessageSquare: icon, Brain: icon, ArrowRight: icon,
  };
});

describe('LiveTracePanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with session id', () => {
    render(<LiveTracePanel sessionId="test-session" />);
    expect(screen.getByTestId('card')).toBeInTheDocument();
  });

  it('shows empty state when no events', () => {
    mockStore.getSessionEvents.mockReturnValue([]);
    render(<LiveTracePanel sessionId="test-session" />);
    expect(screen.getByTestId('card')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<LiveTracePanel sessionId="test-session" className="custom" />);
    expect(screen.getByTestId('card')).toHaveClass('custom');
  });
});
