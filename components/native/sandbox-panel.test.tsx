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

const mockExecutions = [
  {
    id: '1',
    session_id: null,
    language: 'python',
    code: 'print("hello")',
    stdin: null,
    stdout: 'hello',
    stderr: '',
    exit_code: 0,
    status: 'completed',
    runtime: 'docker',
    execution_time_ms: 10,
    memory_used_bytes: null,
    error: null,
    created_at: '2024-01-01',
    tags: [],
    is_favorite: false,
  },
];

const mockSnippets = [
  {
    id: 'snip-1',
    title: 'Hello',
    description: 'Say hello',
    language: 'python',
    code: 'print("hello")',
    tags: [],
    category: null,
    is_template: false,
    usage_count: 0,
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  },
];

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
  useExecutionHistory: () => ({
    executions: mockExecutions,
    loading: false,
    error: null,
    refresh: jest.fn(),
    deleteExecution: jest.fn(),
    toggleFavorite: jest.fn(),
    addTags: jest.fn(),
    removeTags: jest.fn(),
    clearHistory: jest.fn(),
  }),
  useSnippets: () => ({
    snippets: mockSnippets,
    loading: false,
    error: null,
    refresh: jest.fn(),
    createSnippet: jest.fn(),
    updateSnippet: jest.fn(),
    deleteSnippet: jest.fn(),
    executeSnippet: jest.fn(),
    createFromExecution: jest.fn(),
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
    // Find the main run button (the one with variant=default)
    const runButtons = screen.getAllByRole('button', { name: /run/i });
    const mainRunButton = runButtons.find(btn => btn.getAttribute('data-variant') === 'default');
    expect(mainRunButton).toBeInTheDocument();
  });

  it('disables run button when code is empty', () => {
    render(<SandboxPanel />);
    // Find the main run button (the one with variant=default)
    const runButtons = screen.getAllByRole('button', { name: /run/i });
    const mainRunButton = runButtons.find(btn => btn.getAttribute('data-variant') === 'default');
    expect(mainRunButton).toBeDisabled();
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

  it('renders recent runs and snippets sections', () => {
    render(<SandboxPanel />);

    expect(screen.getByText('Recent Runs')).toBeInTheDocument();
    expect(screen.getByText('Snippets')).toBeInTheDocument();
    expect(screen.getByText('Run again')).toBeInTheDocument();
    // There are multiple "Run" buttons, check that at least one exists
    const runButtons = screen.getAllByText('Run');
    expect(runButtons.length).toBeGreaterThan(0);
  });
});
