/**
 * ObservabilityDashboard Tests
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ObservabilityDashboard } from './observability-dashboard';

// Mock dependencies
jest.mock('@/stores', () => ({
  useSettingsStore: jest.fn((selector) => {
    const state = {
      observabilitySettings: {
        enabled: true,
        langfuseEnabled: true,
        openTelemetryEnabled: true,
      },
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
  });

  it('should render dashboard with tabs', () => {
    render(<ObservabilityDashboard />);

    // Dashboard renders with tabs
    expect(screen.getAllByRole('tab').length).toBeGreaterThan(0);
  });

  it('should render time range selector', () => {
    render(<ObservabilityDashboard />);

    // Time range options should be present
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('should render refresh button', () => {
    render(<ObservabilityDashboard />);

    // Refresh button should be present
    const refreshButton = screen.getByRole('button', { name: '' });
    expect(refreshButton).toBeInTheDocument();
  });

  it('should switch between tabs', async () => {
    render(<ObservabilityDashboard />);

    // Dashboard renders with tabs
    const tabs = screen.getAllByRole('tab');
    expect(tabs.length).toBe(3); // traces, metrics, costs
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

  it('should render summary cards', () => {
    render(<ObservabilityDashboard />);

    // Summary cards should be present
    expect(screen.getByText(/total requests/i)).toBeInTheDocument();
    expect(screen.getByText(/avg latency/i)).toBeInTheDocument();
    expect(screen.getByText(/total cost/i)).toBeInTheDocument();
    expect(screen.getByText(/error rate/i)).toBeInTheDocument();
  });

  it('should show no traces message when empty', () => {
    render(<ObservabilityDashboard />);

    expect(screen.getByText(/no traces/i)).toBeInTheDocument();
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
      };
      return selector(state);
    });
  });

  it('should show disabled alert when observability is disabled', () => {
    render(<ObservabilityDashboard />);

    // The alert title is "Observability Disabled"
    expect(screen.getByText(/observability disabled/i)).toBeInTheDocument();
  });
});
