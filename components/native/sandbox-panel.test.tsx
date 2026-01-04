import { render, screen } from '@testing-library/react';
import { SandboxPanel } from './sandbox-panel';

// Mock hooks
const mockRefreshStatus = jest.fn();
const mockQuickExecute = jest.fn();
const mockReset = jest.fn();

const mockLanguages = [
  { id: 'python', name: 'Python', extension: 'py', category: 'interpreted' },
  { id: 'javascript', name: 'JavaScript', extension: 'js', category: 'interpreted' },
  { id: 'typescript', name: 'TypeScript', extension: 'ts', category: 'compiled' },
];

const mockRuntimes = ['docker'];

jest.mock('@/hooks/sandbox', () => ({
  useSandbox: () => ({
    isAvailable: true,
    isLoading: false,
    languages: mockLanguages,
    runtimes: mockRuntimes,
    error: null,
    refreshStatus: mockRefreshStatus,
  }),
  useCodeExecution: () => ({
    result: null,
    executing: false,
    error: null,
    quickExecute: mockQuickExecute,
    reset: mockReset,
  }),
}));

describe('SandboxPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the panel with title', () => {
    render(<SandboxPanel />);
    expect(screen.getByText('Code Sandbox')).toBeInTheDocument();
  });

  it('renders language selector', () => {
    render(<SandboxPanel />);
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('renders code textarea', () => {
    render(<SandboxPanel />);
    expect(screen.getByPlaceholderText('Enter your code here...')).toBeInTheDocument();
  });

  it('renders run button', () => {
    render(<SandboxPanel />);
    expect(screen.getByRole('button', { name: /run/i })).toBeInTheDocument();
  });

  it('disables run button when code is empty', () => {
    render(<SandboxPanel />);
    const runButton = screen.getByRole('button', { name: /run/i });
    expect(runButton).toBeDisabled();
  });

  it('applies custom className', () => {
    const { container } = render(<SandboxPanel className="custom-class" />);
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('shows runtime badge when runtimes available', () => {
    render(<SandboxPanel />);
    expect(screen.getByText('docker')).toBeInTheDocument();
  });

  it('renders code section', () => {
    render(<SandboxPanel />);
    expect(screen.getByText('Code')).toBeInTheDocument();
  });
});
