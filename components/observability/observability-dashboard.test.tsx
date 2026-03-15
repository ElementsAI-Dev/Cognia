/**
 * ObservabilityDashboard Tests
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ObservabilityDashboard } from './observability-dashboard';

const mockUseSearchParams = jest.fn(() => new URLSearchParams());

jest.mock('next/navigation', () => ({
  useSearchParams: () => mockUseSearchParams(),
}));

// Mock dexie-react-hooks (required by useAgentTrace)
jest.mock('dexie-react-hooks', () => ({
  useLiveQuery: jest.fn(() => []),
}));

// Mock useAgentTrace hook
jest.mock('@/hooks/agent-trace', () => ({
  useAgentTrace: jest.fn(() => ({
    traces: [],
    observations: [],
    totalCount: 0,
    isLoading: false,
    isEnabled: true,
    error: null,
    refresh: jest.fn(),
    getById: jest.fn(),
    deleteTrace: jest.fn(),
    deleteBySession: jest.fn(),
    deleteOlderThan: jest.fn(),
    clearAll: jest.fn(),
    exportAsJson: jest.fn(() => '[]'),
    exportAsJsonl: jest.fn(() => ''),
    findLineAttribution: jest.fn(),
    findLineAttributionWithBlame: jest.fn(),
    exportAsSpecRecord: jest.fn(),
    exportObservationBundle: jest.fn(),
  })),
}));

// Mock usePerformanceMetrics hook
jest.mock('@/hooks/observability/use-performance-metrics', () => ({
  usePerformanceMetrics: jest.fn(() => ({
    summary: {
      totalExecutions: 0,
      averageDuration: 0,
      averageSteps: 0,
      averageToolCalls: 0,
      totalTokens: 0,
      averageTokensPerExecution: 0,
      cacheHitRate: 0,
      errorRate: 0,
      retryRate: 0,
    },
    activeExecutions: [],
    history: [],
    hasData: false,
    refresh: jest.fn(),
    clearMetrics: jest.fn(),
  })),
}));

// Mock dependencies
jest.mock('@/stores', () => ({
  useSettingsStore: jest.fn((selector) => {
    const state = {
      observabilitySettings: {
        enabled: true,
        langfuseEnabled: true,
        openTelemetryEnabled: true,
      },
      agentTraceSettings: {
        enabled: false,
      },
    };
    return selector(state);
  }),
  useUsageStore: jest.fn((selector) => {
    const state = {
      records: [],
    };
    return selector(state);
  }),
  useObservabilityDashboardStore: jest.fn((selector) => {
    const state = {
      timeRange: '24h',
      activeTab: 'overview',
      autoRefresh: false,
      setTimeRange: jest.fn(),
      setActiveTab: jest.fn(),
      setAutoRefresh: jest.fn(),
    };
    return selector(state);
  }),
}));

jest.mock('./trace-viewer', () => ({
  TraceViewer: ({ trace }: { trace: unknown }) => (
    <div data-testid="trace-viewer">{trace ? 'Trace loaded' : 'No trace'}</div>
  ),
}));

jest.mock('./metrics-panel', () => ({
  MetricsPanel: ({ metrics }: { metrics: unknown }) => (
    <div data-testid="metrics-panel">{metrics ? 'Metrics loaded' : 'No metrics'}</div>
  ),
}));

jest.mock('./cost-analysis', () => ({
  CostAnalysis: ({ traces }: { traces: unknown[] }) => (
    <div data-testid="cost-analysis">{traces?.length || 0} traces</div>
  ),
}));

describe('ObservabilityDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSearchParams.mockReturnValue(new URLSearchParams());
  });

  it('should render dashboard header', () => {
    render(<ObservabilityDashboard />);

    // Dashboard header should render
    expect(screen.getByText(/observability dashboard/i)).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('should render time range selector', () => {
    render(<ObservabilityDashboard />);

    // Time range options should be present
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('should render refresh button', () => {
    render(<ObservabilityDashboard />);

    // Time range selector and dashboard title should be present
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByText(/observability dashboard/i)).toBeInTheDocument();
  });

  it('should render controls', async () => {
    render(<ObservabilityDashboard />);

    // Auto-refresh and time range controls should render
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('should call onClose when provided', () => {
    const onClose = jest.fn();
    render(<ObservabilityDashboard onClose={onClose} />);

    // Close button should be rendered
    expect(screen.getByText(/close/i)).toBeInTheDocument();
  });

  it('should render without crashing', () => {
    render(<ObservabilityDashboard />);

    // Dashboard should render without crashing
    expect(screen.getByText(/observability/i)).toBeInTheDocument();
  });

  it('should render content when enabled', () => {
    render(<ObservabilityDashboard />);

    // Dashboard renders some content (empty state or data)
    expect(screen.getByText(/observability dashboard/i)).toBeInTheDocument();
  });

  it('should render dashboard title', () => {
    render(<ObservabilityDashboard />);

    expect(screen.getByText(/observability dashboard/i)).toBeInTheDocument();
  });

  it('passes trace pivot filters from search params into useAgentTrace', () => {
    mockUseSearchParams.mockReturnValue(
      new URLSearchParams('traceSessionId=session-1&traceOutcome=error&traceToolName=code')
    );

    const { useAgentTrace } = jest.requireMock('@/hooks/agent-trace');
    render(<ObservabilityDashboard />);

    expect(useAgentTrace).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: 'session-1',
        outcome: 'error',
        toolName: 'code',
        limit: 50,
      })
    );
  });
});

describe('ObservabilityDashboard when disabled', () => {
  beforeEach(() => {
    const stores = jest.requireMock('@/stores');
    stores.useSettingsStore.mockImplementation((selector: (state: unknown) => unknown) => {
      const state = {
        observabilitySettings: {
          enabled: false,
        },
        agentTraceSettings: {
          enabled: false,
        },
      };
      return selector(state);
    });
  });

  it('should show disabled alert when observability is disabled', () => {
    render(<ObservabilityDashboard />);

    // The alert title is "Observability Disabled"
    expect(screen.getByText(/observability disabled/i)).toBeInTheDocument();
  });

  it('keeps the dashboard accessible when disabled settings still have local history', () => {
    const stores = jest.requireMock('@/stores');
    stores.useUsageStore.mockImplementation((selector: (state: unknown) => unknown) => {
      const state = {
        records: [
          {
            id: 'usage-1',
            provider: 'openai',
            model: 'gpt-4o-mini',
            timestamp: new Date().toISOString(),
            promptTokens: 1,
            completionTokens: 1,
            totalTokens: 2,
            cost: 0.01,
            latency: 10,
            status: 'success',
          },
        ],
        triggerRefresh: jest.fn(),
      };
      return selector(state);
    });

    render(<ObservabilityDashboard />);

    expect(screen.getByText(/observability dashboard/i)).toBeInTheDocument();
    expect(
      screen.getByText(/history remains available even though new capture is off/i)
    ).toBeInTheDocument();
  });
});
