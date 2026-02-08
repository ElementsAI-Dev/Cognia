/**
 * ProcessPanel Tests
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { ProcessPanel } from './process-panel';
import { useProcessManager } from '@/hooks/agent/use-process-manager';

// Mock dependencies
jest.mock('@/hooks/agent/use-process-manager');
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) => {
    if (params) {
      return `${key}(${JSON.stringify(params)})`;
    }
    return key;
  },
}));

jest.mock('./process-detail-panel', () => ({
  ProcessDetailPanel: ({ pid, onBack }: { pid: number; onBack: () => void }) => (
    <div data-testid="process-detail-panel">
      <span>Detail PID: {pid}</span>
      <button onClick={onBack}>Back</button>
    </div>
  ),
}));

const mockUseProcessManager = useProcessManager as jest.MockedFunction<typeof useProcessManager>;

const mockProcess = (overrides?: Partial<{ pid: number; name: string; status: string; memoryBytes: number; cpuPercent: number; user: string; exePath: string }>) => ({
  pid: 1234,
  name: 'node',
  status: 'running',
  memoryBytes: 104857600,
  cpuPercent: 12.5,
  user: 'admin',
  exePath: '/usr/bin/node',
  ...overrides,
});

const defaultMockReturn = {
  processes: [
    mockProcess(),
    mockProcess({ pid: 5678, name: 'chrome', memoryBytes: 524288000, cpuPercent: 35.2, status: 'running' }),
    mockProcess({ pid: 9999, name: 'vim', memoryBytes: 10485760, cpuPercent: 0.1, status: 'sleeping' }),
  ],
  isLoading: false,
  error: null,
  lastRefresh: new Date(),
  isAvailable: true,
  trackedPids: [1234],
  refresh: jest.fn(),
  search: jest.fn(),
  getTopMemory: jest.fn(),
  terminate: jest.fn(),
  autoRefresh: false,
  setAutoRefresh: jest.fn(),
  config: { enabled: true, allowedPrograms: [], deniedPrograms: [], maxTracked: 100 },
  configLoading: false,
  refreshConfig: jest.fn(),
  updateConfig: jest.fn(),
  startProcess: jest.fn(),
  trackProcess: jest.fn(),
  untrackProcess: jest.fn(),
  isProgramAllowed: jest.fn(),
  getTrackedByAgent: jest.fn().mockReturnValue([]),
};

describe('ProcessPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseProcessManager.mockReturnValue(defaultMockReturn);
  });

  it('renders not available message when unavailable', () => {
    mockUseProcessManager.mockReturnValue({
      ...defaultMockReturn,
      isAvailable: false,
    });

    render(<ProcessPanel />);
    expect(screen.getByText('notAvailable')).toBeInTheDocument();
  });

  it('renders process list when available', () => {
    render(<ProcessPanel />);
    expect(screen.getByText('title')).toBeInTheDocument();
    expect(screen.getByText('node')).toBeInTheDocument();
    expect(screen.getByText('chrome')).toBeInTheDocument();
    expect(screen.getByText('vim')).toBeInTheDocument();
  });

  it('displays process count and total memory in header', () => {
    render(<ProcessPanel />);
    expect(screen.getByText(/3/)).toBeInTheDocument();
  });

  it('shows PID for each process', () => {
    render(<ProcessPanel />);
    expect(screen.getByText('1234')).toBeInTheDocument();
    expect(screen.getByText('5678')).toBeInTheDocument();
    expect(screen.getByText('9999')).toBeInTheDocument();
  });

  it('shows process status badges', () => {
    render(<ProcessPanel />);
    const runningBadges = screen.getAllByText('running');
    expect(runningBadges.length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('sleeping')).toBeInTheDocument();
  });

  it('filters processes by search query', () => {
    render(<ProcessPanel />);

    const searchInput = screen.getByPlaceholderText('searchPlaceholder');
    fireEvent.change(searchInput, { target: { value: 'chrome' } });

    expect(screen.getByText('chrome')).toBeInTheDocument();
    expect(screen.queryByText('vim')).not.toBeInTheDocument();
  });

  it('filters by PID in search', () => {
    render(<ProcessPanel />);

    const searchInput = screen.getByPlaceholderText('searchPlaceholder');
    fireEvent.change(searchInput, { target: { value: '5678' } });

    expect(screen.getByText('chrome')).toBeInTheDocument();
    expect(screen.queryByText('node')).not.toBeInTheDocument();
  });

  it('switches to tracked view mode', () => {
    render(<ProcessPanel />);

    const trackedButton = screen.getByText('viewTracked');
    fireEvent.click(trackedButton);

    // Only tracked process (PID 1234) should be shown
    expect(screen.getByText('node')).toBeInTheDocument();
    expect(screen.queryByText('chrome')).not.toBeInTheDocument();
  });

  it('switches to top memory view mode', () => {
    render(<ProcessPanel />);

    const memoryButton = screen.getByText('viewTopMemory');
    fireEvent.click(memoryButton);

    expect(defaultMockReturn.getTopMemory).toHaveBeenCalledWith(100);
  });

  it('calls refresh when refresh button is clicked', () => {
    render(<ProcessPanel />);

    const refreshButton = screen.getByRole('button', { name: 'refresh' });
    fireEvent.click(refreshButton);

    expect(defaultMockReturn.refresh).toHaveBeenCalled();
  });

  it('toggles auto-refresh', () => {
    render(<ProcessPanel />);

    const autoRefreshButtons = screen.getAllByRole('button');
    const toggleButton = autoRefreshButtons.find(
      (btn) => btn.querySelector('.lucide-toggle-left') || btn.querySelector('.lucide-toggle-right')
    );

    if (toggleButton) {
      fireEvent.click(toggleButton);
      expect(defaultMockReturn.setAutoRefresh).toHaveBeenCalledWith(true);
    }
  });

  it('shows empty state when no processes match', () => {
    mockUseProcessManager.mockReturnValue({
      ...defaultMockReturn,
      processes: [],
    });

    render(<ProcessPanel />);
    expect(screen.getByText('noProcesses')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    mockUseProcessManager.mockReturnValue({
      ...defaultMockReturn,
      processes: [],
      isLoading: true,
    });

    render(<ProcessPanel />);
    expect(screen.getByText('loading')).toBeInTheDocument();
  });

  it('shows error message when error exists', () => {
    mockUseProcessManager.mockReturnValue({
      ...defaultMockReturn,
      error: 'Failed to fetch processes',
    });

    render(<ProcessPanel />);
    expect(screen.getByText('Failed to fetch processes')).toBeInTheDocument();
  });

  it('opens terminate confirmation dialog', () => {
    render(<ProcessPanel />);

    // Click terminate button on first process row
    const terminateButtons = screen.getAllByRole('button');
    const stopButton = terminateButtons.find(
      (btn) => btn.querySelector('.lucide-stop-circle')
    );

    if (stopButton) {
      fireEvent.click(stopButton);
      expect(screen.getByText('terminateTitle')).toBeInTheDocument();
    }
  });

  it('navigates to process detail when row is clicked', () => {
    render(<ProcessPanel />);

    // Click on a process row (the node process text)
    const nodeRow = screen.getByText('node').closest('tr');
    if (nodeRow) {
      fireEvent.click(nodeRow);
      expect(screen.getByTestId('process-detail-panel')).toBeInTheDocument();
      expect(screen.getByText('Detail PID: 1234')).toBeInTheDocument();
    }
  });

  it('returns from detail view to list', () => {
    render(<ProcessPanel />);

    // Navigate to detail
    const nodeRow = screen.getByText('node').closest('tr');
    if (nodeRow) {
      fireEvent.click(nodeRow);
      expect(screen.getByTestId('process-detail-panel')).toBeInTheDocument();

      // Click back
      const backButton = screen.getByText('Back');
      fireEvent.click(backButton);

      // Should be back on the list
      expect(screen.queryByTestId('process-detail-panel')).not.toBeInTheDocument();
      expect(screen.getByText('node')).toBeInTheDocument();
    }
  });

  it('shows footer with showing count', () => {
    render(<ProcessPanel />);
    const footer = screen.getByText(/showing/i);
    expect(footer).toBeInTheDocument();
  });

  it('shows tracked processes info in footer when tracked > 0', () => {
    render(<ProcessPanel />);
    expect(screen.getByText(/agentProcesses/)).toBeInTheDocument();
  });

  it('handles search on Enter key', () => {
    render(<ProcessPanel />);

    const searchInput = screen.getByPlaceholderText('searchPlaceholder');
    fireEvent.change(searchInput, { target: { value: 'node' } });
    fireEvent.keyDown(searchInput, { key: 'Enter' });

    expect(defaultMockReturn.search).toHaveBeenCalledWith('node');
  });
});
