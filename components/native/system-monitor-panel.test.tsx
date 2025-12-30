import { render, screen } from '@testing-library/react';
import { SystemMonitorPanel } from './system-monitor-panel';

// Mock the awareness hook
const mockFetchSystemState = jest.fn();
const mockSystemState = {
  cpu_usage: 45.5,
  memory_usage: 65.2,
  memory_total: 16000000000,
  memory_available: 5568000000,
  disk_usage: 72.3,
  disk_total: 500000000000,
  disk_available: 138500000000,
  battery_level: 85,
  is_charging: true,
  power_mode: 'Balanced',
  uptime_seconds: 86400,
  process_count: 256,
  network_connected: true,
};

jest.mock('@/hooks/use-awareness', () => ({
  useAwareness: () => ({
    systemState: mockSystemState,
    isLoading: false,
    fetchSystemState: mockFetchSystemState,
  }),
}));

describe('SystemMonitorPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the panel with title', () => {
    render(<SystemMonitorPanel />);
    expect(screen.getByText('System Monitor')).toBeInTheDocument();
  });

  it('displays CPU usage', () => {
    render(<SystemMonitorPanel />);
    expect(screen.getByText('CPU')).toBeInTheDocument();
    expect(screen.getByText('45.5%')).toBeInTheDocument();
  });

  it('displays memory usage', () => {
    render(<SystemMonitorPanel />);
    expect(screen.getByText('Memory')).toBeInTheDocument();
    expect(screen.getByText('65.2%')).toBeInTheDocument();
  });

  it('displays disk usage', () => {
    render(<SystemMonitorPanel />);
    expect(screen.getByText('Disk')).toBeInTheDocument();
    expect(screen.getByText('72.3%')).toBeInTheDocument();
  });

  it('displays battery information when available', () => {
    render(<SystemMonitorPanel />);
    expect(screen.getByText('Battery')).toBeInTheDocument();
    expect(screen.getByText('85%')).toBeInTheDocument();
    expect(screen.getByText('Charging')).toBeInTheDocument();
  });

  it('displays system info', () => {
    render(<SystemMonitorPanel />);
    expect(screen.getByText('System Info')).toBeInTheDocument();
    expect(screen.getByText('Uptime')).toBeInTheDocument();
    expect(screen.getByText('1d 0h 0m')).toBeInTheDocument();
    expect(screen.getByText('Processes')).toBeInTheDocument();
    expect(screen.getByText('256')).toBeInTheDocument();
    expect(screen.getByText('Network')).toBeInTheDocument();
    expect(screen.getByText('Connected')).toBeInTheDocument();
    expect(screen.getByText('Power Mode')).toBeInTheDocument();
    expect(screen.getByText('Balanced')).toBeInTheDocument();
  });

  it('renders refresh button', () => {
    render(<SystemMonitorPanel />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<SystemMonitorPanel className="custom-class" />);
    expect(container.firstChild).toHaveClass('custom-class');
  });
});
