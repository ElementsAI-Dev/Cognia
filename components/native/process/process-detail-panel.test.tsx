/**
 * ProcessDetailPanel Tests
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { ProcessDetailPanel } from './process-detail-panel';
import { useProcessDetail } from '@/hooks/native/use-process-detail';
import { useProcessStore } from '@/stores/agent/process-store';

// Mock dependencies
jest.mock('@/hooks/native/use-process-detail');
jest.mock('@/stores/agent/process-store');
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) => {
    if (params) {
      return `${key}(${JSON.stringify(params)})`;
    }
    return key;
  },
}));

const mockUseProcessDetail = useProcessDetail as jest.MockedFunction<typeof useProcessDetail>;
const mockUseProcessStore = useProcessStore as jest.MockedFunction<typeof useProcessStore>;

const mockProcess = {
  pid: 1234,
  name: 'node',
  status: 'running',
  memoryBytes: 104857600,
  cpuPercent: 12.5,
  user: 'admin',
  exePath: '/usr/bin/node',
  cwd: '/home/admin/project',
  parentPid: 1,
  startTime: Math.floor(Date.now() / 1000) - 3600,
  cmdLine: ['node', 'server.js', '--port', '3000'],
};

const mockChildren = [
  { pid: 2345, name: 'worker-1', status: 'running', memoryBytes: 52428800, cpuPercent: 5.0 },
  { pid: 3456, name: 'worker-2', status: 'sleeping', memoryBytes: 31457280, cpuPercent: 0.5 },
];

const defaultDetailReturn = {
  process: mockProcess,
  isLoading: false,
  error: null,
  isFound: true,
  lastRefresh: new Date(),
  refresh: jest.fn(),
  children: mockChildren,
  childrenLoading: false,
  refreshChildren: jest.fn(),
} as unknown as ReturnType<typeof useProcessDetail>;

const defaultProps = {
  pid: 1234,
  onBack: jest.fn(),
  onTerminate: jest.fn(),
  onNavigateToProcess: jest.fn(),
};

describe('ProcessDetailPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseProcessDetail.mockReturnValue(defaultDetailReturn);
    (mockUseProcessStore as unknown as jest.Mock).mockImplementation((selector: (state: { trackedProcesses: Map<number, unknown> }) => unknown) =>
      selector({ trackedProcesses: new Map() })
    );
  });

  it('renders process name and PID in header', () => {
    render(<ProcessDetailPanel {...defaultProps} />);
    const nameElements = screen.getAllByText('node');
    expect(nameElements.length).toBeGreaterThanOrEqual(1);
    const pidElements = screen.getAllByText(/1234/);
    expect(pidElements.length).toBeGreaterThanOrEqual(1);
  });

  it('renders not found state when process is not found', () => {
    mockUseProcessDetail.mockReturnValue({
      ...defaultDetailReturn,
      process: null,
      isFound: false,
    });

    render(<ProcessDetailPanel {...defaultProps} />);
    expect(screen.getByText('notFound')).toBeInTheDocument();
  });

  it('renders process status badge', () => {
    render(<ProcessDetailPanel {...defaultProps} />);
    const runningElements = screen.getAllByText('running');
    expect(runningElements.length).toBeGreaterThanOrEqual(1);
  });

  it('displays memory usage', () => {
    render(<ProcessDetailPanel {...defaultProps} />);
    expect(screen.getByText('memory')).toBeInTheDocument();
    expect(screen.getByText(/100/)).toBeInTheDocument();
  });

  it('displays CPU usage', () => {
    render(<ProcessDetailPanel {...defaultProps} />);
    expect(screen.getByText('12.5%')).toBeInTheDocument();
  });

  it('displays process information fields', () => {
    render(<ProcessDetailPanel {...defaultProps} />);
    expect(screen.getByText('processName')).toBeInTheDocument();
    expect(screen.getByText('user')).toBeInTheDocument();
    expect(screen.getByText('parentPid')).toBeInTheDocument();
    expect(screen.getByText('startTime')).toBeInTheDocument();
    expect(screen.getByText('uptime')).toBeInTheDocument();
  });

  it('displays executable path and working directory', () => {
    render(<ProcessDetailPanel {...defaultProps} />);
    expect(screen.getByText('executablePath')).toBeInTheDocument();
    expect(screen.getByText('/usr/bin/node')).toBeInTheDocument();
    expect(screen.getByText('workingDirectory')).toBeInTheDocument();
    expect(screen.getByText('/home/admin/project')).toBeInTheDocument();
  });

  it('displays command line arguments', () => {
    render(<ProcessDetailPanel {...defaultProps} />);
    expect(screen.getByText('commandLine')).toBeInTheDocument();
    expect(screen.getByText('node server.js --port 3000')).toBeInTheDocument();
  });

  it('displays child processes', () => {
    render(<ProcessDetailPanel {...defaultProps} />);
    expect(screen.getByText(/childProcesses/)).toBeInTheDocument();
    expect(screen.getByText('worker-1')).toBeInTheDocument();
    expect(screen.getByText('worker-2')).toBeInTheDocument();
    expect(screen.getByText('2345')).toBeInTheDocument();
    expect(screen.getByText('3456')).toBeInTheDocument();
  });

  it('shows no child processes message when empty', () => {
    mockUseProcessDetail.mockReturnValue({
      ...defaultDetailReturn,
      children: [],
    });

    render(<ProcessDetailPanel {...defaultProps} />);
    expect(screen.getByText('noChildProcesses')).toBeInTheDocument();
  });

  it('calls onBack when back button is clicked', () => {
    render(<ProcessDetailPanel {...defaultProps} />);

    const backButtons = screen.getAllByRole('button');
    const backButton = backButtons.find(
      (btn) => btn.querySelector('.lucide-arrow-left')
    );

    if (backButton) {
      fireEvent.click(backButton);
      expect(defaultProps.onBack).toHaveBeenCalled();
    }
  });

  it('calls onTerminate when terminate button is clicked', () => {
    render(<ProcessDetailPanel {...defaultProps} />);

    const terminateButton = screen.getByText('terminate');
    fireEvent.click(terminateButton);

    expect(defaultProps.onTerminate).toHaveBeenCalledWith(1234, false);
  });

  it('calls onTerminate with force when force kill button is clicked', () => {
    render(<ProcessDetailPanel {...defaultProps} />);

    const forceKillButton = screen.getByText('forceKill');
    fireEvent.click(forceKillButton);

    expect(defaultProps.onTerminate).toHaveBeenCalledWith(1234, true);
  });

  it('calls refresh when refresh button is clicked', () => {
    render(<ProcessDetailPanel {...defaultProps} />);

    const allButtons = screen.getAllByRole('button');
    const refreshButton = allButtons.find(
      (btn) => btn.querySelector('.lucide-refresh-cw')
    );

    if (refreshButton) {
      fireEvent.click(refreshButton);
      expect(defaultDetailReturn.refresh).toHaveBeenCalled();
      expect(defaultDetailReturn.refreshChildren).toHaveBeenCalled();
    }
  });

  it('navigates to parent process when parent PID is clicked', () => {
    render(<ProcessDetailPanel {...defaultProps} />);

    const parentLink = screen.getByText('1');
    fireEvent.click(parentLink);

    expect(defaultProps.onNavigateToProcess).toHaveBeenCalledWith(1);
  });

  it('navigates to child process when child row is clicked', () => {
    render(<ProcessDetailPanel {...defaultProps} />);

    const childRow = screen.getByText('worker-1').closest('tr');
    if (childRow) {
      fireEvent.click(childRow);
      expect(defaultProps.onNavigateToProcess).toHaveBeenCalledWith(2345);
    }
  });

  it('shows agent tracking info when process is tracked', () => {
    const trackedProcesses = new Map([
      [1234, {
        pid: 1234,
        program: 'node',
        agentName: 'TestAgent',
        agentId: 'agent-123',
        startedAt: Date.now(),
      }],
    ]);

    (mockUseProcessStore as unknown as jest.Mock).mockImplementation((selector: (state: { trackedProcesses: Map<number, unknown> }) => unknown) =>
      selector({ trackedProcesses })
    );

    render(<ProcessDetailPanel {...defaultProps} />);
    expect(screen.getByText('agentInfo')).toBeInTheDocument();
    expect(screen.getByText('TestAgent')).toBeInTheDocument();
    expect(screen.getByText('agent-123')).toBeInTheDocument();
  });

  it('shows error message when error exists', () => {
    mockUseProcessDetail.mockReturnValue({
      ...defaultDetailReturn,
      error: 'Failed to fetch process details',
    });

    render(<ProcessDetailPanel {...defaultProps} />);
    expect(screen.getByText('Failed to fetch process details')).toBeInTheDocument();
  });

  it('displays last updated time', () => {
    render(<ProcessDetailPanel {...defaultProps} />);
    expect(screen.getByText(/lastUpdated/)).toBeInTheDocument();
  });

  it('shows user in header subtitle', () => {
    render(<ProcessDetailPanel {...defaultProps} />);
    const adminElements = screen.getAllByText(/admin/);
    expect(adminElements.length).toBeGreaterThanOrEqual(1);
  });
});
