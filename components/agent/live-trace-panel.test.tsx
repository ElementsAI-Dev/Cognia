/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { LiveTracePanel } from './live-trace-panel';

jest.mock('@/lib/utils', () => ({
  cn: (...args: (string | boolean | undefined | null)[]) => args.filter(Boolean).join(' '),
}));

jest.mock('@/lib/agent-trace/cost-estimator', () => ({
  formatCost: (cost: number) => `$${cost.toFixed(4)}`,
}));

jest.mock('@/lib/agent', () => ({
  LIVE_TRACE_EVENT_ICONS: {},
  LIVE_TRACE_EVENT_COLORS: {},
  formatDuration: (value: number) => `${value}ms`,
  formatTokens: (value: number) => `${value}`,
}));

const mockStore = {
  activeSessions: {
    'session-1': {
      sessionId: 'session-1',
      startedAt: Date.UTC(2026, 2, 14, 13, 0, 0),
      currentStep: 2,
      status: 'error' as const,
      events: [
        {
          id: 'evt-1',
          sessionId: 'session-1',
          eventType: 'tool_call_result' as const,
          timestamp: Date.UTC(2026, 2, 14, 13, 1, 0),
          toolName: 'code_edit',
          success: false,
          error: 'edit failed',
          responsePreview: 'preview text',
        },
      ],
      tokenUsage: {
        promptTokens: 10,
        completionTokens: 5,
        totalTokens: 15,
      },
      totalCost: 0.25,
      files: new Set<string>(),
      toolCalls: 1,
      toolSuccesses: 0,
      toolFailures: 1,
      lastEventAt: Date.UTC(2026, 2, 14, 13, 1, 0),
      lastEventType: 'tool_call_result' as const,
      lastError: 'edit failed',
      lastResponsePreview: 'preview text',
      correlation: {
        traceId: 'trace-1',
        turnId: 'turn-1',
      },
    },
  },
};

jest.mock('@/stores/agent-trace', () => ({
  useAgentTraceStore: (selector: (state: typeof mockStore) => unknown) => selector(mockStore),
}));

jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card" className={className}>{children}</div>
  ),
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3>,
  CardContent: ({ children, className }: { children: React.ReactNode; className?: string }) => <div className={className}>{children}</div>,
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
  };
});

describe('LiveTracePanel', () => {
  it('renders session details', () => {
    render(<LiveTracePanel sessionId="session-1" />);
    expect(screen.getByTestId('card')).toBeInTheDocument();
    expect(screen.getByText('Live Trace')).toBeInTheDocument();
    expect(screen.getByText('error')).toBeInTheDocument();
  });

  it('shows latest outcome diagnostics and correlation identifiers', () => {
    render(<LiveTracePanel sessionId="session-1" />);

    expect(screen.getByText(/Latest outcome/i)).toBeInTheDocument();
    expect(screen.getAllByText(/edit failed/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/preview text/i)).toBeInTheDocument();
    expect(screen.getByText(/trace-1/i)).toBeInTheDocument();
    expect(screen.getByText(/turn-1/i)).toBeInTheDocument();
  });

  it('shows empty state for unknown session', () => {
    render(<LiveTracePanel sessionId="missing-session" />);
    expect(screen.getByText('No active session')).toBeInTheDocument();
  });
});
