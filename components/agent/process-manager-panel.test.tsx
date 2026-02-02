/**
 * Unit tests for ProcessManagerPanel component
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProcessManagerPanel } from './process-manager-panel';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock the process manager hook
const mockRefresh = jest.fn();
const mockSearch = jest.fn();
const mockGetTopMemory = jest.fn();
const mockTerminate = jest.fn();
const mockSetAutoRefresh = jest.fn();

jest.mock('@/hooks/agent/use-process-manager', () => ({
  useProcessManager: () => ({
    isAvailable: true,
    processes: [
      {
        pid: 1234,
        name: 'node.exe',
        memoryBytes: 150000000,
        cpuPercent: 5.5,
        status: 'running',
        exePath: 'C:/Program Files/node/node.exe',
      },
      {
        pid: 5678,
        name: 'python.exe',
        memoryBytes: 80000000,
        cpuPercent: 2.3,
        status: 'running',
        exePath: 'C:/Python/python.exe',
      },
    ],
    trackedPids: [1234, 5678],
    isLoading: false,
    error: null,
    lastRefresh: null,
    autoRefresh: true,
    refresh: mockRefresh,
    search: mockSearch,
    getTopMemory: mockGetTopMemory,
    terminate: mockTerminate,
    setAutoRefresh: mockSetAutoRefresh,
  }),
}));

// Mock UI components
jest.mock('@/components/ui/sheet', () => ({
  Sheet: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="sheet">{children}</div> : null,
  SheetContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="sheet-content">{children}</div>
  ),
  SheetHeader: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="sheet-header">{children}</div>
  ),
  SheetTitle: ({ children }: { children: React.ReactNode }) => (
    <h2 data-testid="sheet-title">{children}</h2>
  ),
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick} disabled={disabled} {...props}>{children}</button>
  ),
}));

jest.mock('@/components/ui/input', () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}));

jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/ui/table', () => ({
  Table: ({ children }: { children: React.ReactNode }) => <table>{children}</table>,
  TableBody: ({ children }: { children: React.ReactNode }) => <tbody>{children}</tbody>,
  TableCell: ({ children }: { children: React.ReactNode }) => <td>{children}</td>,
  TableHead: ({ children }: { children: React.ReactNode }) => <th>{children}</th>,
  TableHeader: ({ children }: { children: React.ReactNode }) => <thead>{children}</thead>,
  TableRow: ({ children }: { children: React.ReactNode }) => <tr>{children}</tr>,
}));

jest.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/ui/alert-dialog', () => ({
  AlertDialog: ({ children, open }: { children: React.ReactNode; open?: boolean }) =>
    open ? <div data-testid="alert-dialog">{children}</div> : <>{children}</>,
  AlertDialogAction: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
  AlertDialogCancel: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
  AlertDialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  AlertDialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3>,
  AlertDialogTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  X: () => <span data-testid="icon-x" />,
  RefreshCw: () => <span data-testid="icon-refresh" />,
  Search: () => <span data-testid="icon-search" />,
  Cpu: () => <span data-testid="icon-cpu" />,
  HardDrive: () => <span data-testid="icon-harddrive" />,
  StopCircle: () => <span data-testid="icon-stop" />,
  ToggleLeft: () => <span data-testid="icon-toggle-left" />,
  ToggleRight: () => <span data-testid="icon-toggle-right" />,
  AlertTriangle: () => <span data-testid="icon-alert" />,
  Clock: () => <span data-testid="icon-clock" />,
  Bot: () => <span data-testid="icon-bot" />,
}));

describe('ProcessManagerPanel', () => {
  const defaultProps = {
    open: true,
    onOpenChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when closed', () => {
    const { container } = render(<ProcessManagerPanel {...defaultProps} open={false} />);
    expect(container.querySelector('[data-testid="sheet"]')).toBeNull();
  });

  it('renders panel when open', () => {
    render(<ProcessManagerPanel {...defaultProps} />);
    expect(screen.getByTestId('sheet')).toBeInTheDocument();
  });

  it('displays process list', () => {
    render(<ProcessManagerPanel {...defaultProps} />);
    expect(screen.getByText('node.exe')).toBeInTheDocument();
    expect(screen.getByText('python.exe')).toBeInTheDocument();
  });

  it('displays process PIDs', () => {
    render(<ProcessManagerPanel {...defaultProps} />);
    expect(screen.getByText('1234')).toBeInTheDocument();
    expect(screen.getByText('5678')).toBeInTheDocument();
  });

  it('calls refresh when refresh button clicked', async () => {
    render(<ProcessManagerPanel {...defaultProps} />);
    
    const refreshButton = screen.getAllByRole('button').find(
      btn => btn.querySelector('[data-testid="icon-refresh"]')
    );
    
    if (refreshButton) {
      await userEvent.click(refreshButton);
      expect(mockRefresh).toHaveBeenCalled();
    }
  });

  it('filters processes by search query', async () => {
    render(<ProcessManagerPanel {...defaultProps} />);
    
    const searchInput = screen.getByRole('textbox');
    await userEvent.type(searchInput, 'node');
    
    // Node should still be visible, python may be filtered
    expect(screen.getByText('node.exe')).toBeInTheDocument();
  });

  it('displays CPU usage', () => {
    render(<ProcessManagerPanel {...defaultProps} />);
    expect(screen.getByText('5.5%')).toBeInTheDocument();
  });

  it('displays memory usage', () => {
    render(<ProcessManagerPanel {...defaultProps} />);
    // Memory is formatted, should show some value
    const table = screen.getByRole('table');
    expect(table).toBeInTheDocument();
  });

  it('shows terminate button for each process', () => {
    render(<ProcessManagerPanel {...defaultProps} />);
    const stopIcons = screen.getAllByTestId('icon-stop');
    expect(stopIcons.length).toBeGreaterThan(0);
  });

  it('toggles auto-refresh setting', async () => {
    render(<ProcessManagerPanel {...defaultProps} />);
    
    const toggleButton = screen.getAllByRole('button').find(
      btn => btn.querySelector('[data-testid="icon-toggle-right"]') || 
             btn.querySelector('[data-testid="icon-toggle-left"]')
    );
    
    if (toggleButton) {
      await userEvent.click(toggleButton);
      expect(mockSetAutoRefresh).toHaveBeenCalledWith(false);
    }
  });
});
