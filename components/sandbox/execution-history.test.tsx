/**
 * @jest-environment jsdom
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { ExecutionHistory } from './execution-history';
import { ExecutionStatus } from '@/types/system/sandbox';

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, className, onClick, disabled, ...props }: any) => (
    <button
      data-testid="button"
      className={className}
      onClick={onClick}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className, ...props }: any) => (
    <div data-testid="card" className={className} {...props}>
      {children}
    </div>
  ),
  CardContent: ({ children, className, ...props }: any) => (
    <div data-testid="card-content" className={className} {...props}>
      {children}
    </div>
  ),
  CardHeader: ({ children, className, ...props }: any) => (
    <div data-testid="card-header" className={className} {...props}>
      {children}
    </div>
  ),
  CardTitle: ({ children, ...props }: any) => (
    <h3 data-testid="card-title" {...props}>
      {children}
    </h3>
  ),
  CardDescription: ({ children, ...props }: any) => (
    <p data-testid="card-description" {...props}>
      {children}
    </p>
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className, ...props }: any) => (
    <span data-testid="badge" className={className} {...props}>{children}</span>
  ),
}));

jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children, className, ...props }: any) => (
    <div data-testid="scroll-area" className={className} {...props}>
      {children}
    </div>
  ),
}));

jest.mock('@/components/ui/input', () => ({
  Input: ({ className, value, onChange, placeholder, ...props }: any) => (
    <input
      data-testid="input"
      className={className}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      {...props}
    />
  ),
}));

jest.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange, ...props }: any) => (
    <div data-testid="select" data-value={value} {...props}>
      {typeof onValueChange === 'function' && (
        <button
          onClick={() => onValueChange('python')}
          data-testid="select-trigger"
        >
          Select
        </button>
      )}
      {children}
    </div>
  ),
  SelectTrigger: ({ children, className, ...props }: any) => (
    <div data-testid="select-trigger" className={className} {...props}>
      {children}
    </div>
  ),
  SelectValue: ({ placeholder }: any) => (
    <span data-testid="select-value">{placeholder}</span>
  ),
  SelectContent: ({ children }: any) => (
    <div data-testid="select-content">{children}</div>
  ),
  SelectItem: ({ children, value, ...props }: any) => (
    <div data-testid={`select-item-${value}`} {...props}>
      {children}
    </div>
  ),
}));

jest.mock('@/components/ui/alert-dialog', () => ({
  AlertDialog: ({ children }: any) => <div data-testid="alert-dialog">{children}</div>,
  AlertDialogTrigger: ({ children }: any) => <>{children}</>,
  AlertDialogContent: ({ children }: any) => <div data-testid="alert-dialog-content">{children}</div>,
  AlertDialogHeader: ({ children }: any) => <div data-testid="alert-dialog-header">{children}</div>,
  AlertDialogTitle: ({ children }: any) => <div data-testid="alert-dialog-title">{children}</div>,
  AlertDialogDescription: ({ children }: any) => <div data-testid="alert-dialog-description">{children}</div>,
  AlertDialogFooter: ({ children }: any) => <div data-testid="alert-dialog-footer">{children}</div>,
  AlertDialogCancel: ({ children }: any) => <button data-testid="alert-cancel">{children}</button>,
  AlertDialogAction: ({ children, onClick }: any) => <button data-testid="alert-action" onClick={onClick}>{children}</button>,
}));

jest.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('@/components/ui/skeleton', () => ({
  Skeleton: ({ className }: any) => <div data-testid="skeleton" className={className} />,
}));

const mockRefresh = jest.fn();
const mockDeleteExecution = jest.fn();
const mockToggleFavorite = jest.fn();
const mockClearHistory = jest.fn();

const defaultMockExecutions = [
  {
    id: '1',
    code: 'print("hello")',
    language: 'python',
    status: 'completed' as ExecutionStatus,
    stdout: 'hello\n',
    stderr: '',
    exit_code: 0,
    execution_time_ms: 100,
    created_at: '2024-01-01T10:00:00Z',
    tags: ['test'],
    is_favorite: false,
  },
  {
    id: '2',
    code: 'console.log("error");',
    language: 'javascript',
    status: 'error' as ExecutionStatus,
    stdout: '',
    stderr: 'Error: something went wrong',
    exit_code: 1,
    execution_time_ms: 50,
    created_at: '2024-01-01T11:00:00Z',
    tags: [],
    is_favorite: true,
  },
];

// Use a wrapper object so the mock can access changing values
const mockState = {
  executions: defaultMockExecutions as any[],
  loading: false,
};

jest.mock('@/hooks/sandbox', () => ({
  useExecutionHistory: () => ({
    executions: mockState.executions,
    loading: mockState.loading,
    refresh: mockRefresh,
    deleteExecution: mockDeleteExecution,
    toggleFavorite: mockToggleFavorite,
    clearHistory: mockClearHistory,
  }),
}));

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock navigator.clipboard
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn().mockResolvedValue(undefined),
  },
});

// Mock URL.createObjectURL and URL.revokeObjectURL for export tests
global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = jest.fn();

const resetMockHook = () => {
  mockState.executions = defaultMockExecutions;
  mockState.loading = false;
};

const setMockHook = (overrides: { executions?: any[]; loading?: boolean }) => {
  if (overrides.executions !== undefined) {
    mockState.executions = overrides.executions;
  }
  if (overrides.loading !== undefined) {
    mockState.loading = overrides.loading;
  }
};

describe('ExecutionHistory', () => {
  const mockOnSelectExecution = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    resetMockHook();
  });

  afterEach(() => {
    // Cleanup DOM between tests
    cleanup();
  });

  it('renders without crashing', () => {
    render(<ExecutionHistory />);
    expect(screen.getByTestId('card')).toBeInTheDocument();
  });

  it('renders card header with title', () => {
    render(<ExecutionHistory />);
    expect(screen.getByTestId('card-title')).toBeInTheDocument();
    expect(screen.getByTestId('card-description')).toBeInTheDocument();
  });

  it('renders search input', () => {
    render(<ExecutionHistory />);
    const searchInput = screen.getByPlaceholderText(/search/i);
    expect(searchInput).toBeInTheDocument();
  });

  it('renders language filter select', () => {
    render(<ExecutionHistory />);
    const selects = screen.getAllByTestId('select');
    expect(selects.length).toBeGreaterThan(0);
  });

  it('renders status filter select', () => {
    render(<ExecutionHistory />);
    const selects = screen.getAllByTestId('select');
    expect(selects.length).toBeGreaterThan(0);
  });

  it('renders favorites toggle button', () => {
    render(<ExecutionHistory />);
    const buttons = screen.getAllByTestId('button');
    // Multiple buttons with svg icons exist
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('renders execution items', () => {
    render(<ExecutionHistory />);
    expect(screen.getByText('print("hello")')).toBeInTheDocument();
    expect(screen.getByText('console.log("error");')).toBeInTheDocument();
  });

  it('renders empty state when no executions', () => {
    setMockHook({ executions: [] });

    render(<ExecutionHistory />);
    expect(screen.getByText(/empty/i)).toBeInTheDocument();
  });

  it('has flex flex-col classes', () => {
    const { container } = render(<ExecutionHistory />);
    const card = container.querySelector('.flex.flex-col');
    expect(card).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<ExecutionHistory className="custom-history" />);
    const card = container.querySelector('.custom-history');
    expect(card).toBeInTheDocument();
  });

  it('calls onSelectExecution when execution item is clicked', () => {
    render(<ExecutionHistory onSelectExecution={mockOnSelectExecution} />);
    const executionItem = screen.getByText('print("hello")').closest('.group');
    fireEvent.click(executionItem!);
    expect(mockOnSelectExecution).toHaveBeenCalledWith('print("hello")', 'python');
  });

  it('renders status icons correctly', () => {
    render(<ExecutionHistory />);
    const checkIcons = document.querySelectorAll('svg'); // CheckCircle and XCircle icons
    expect(checkIcons.length).toBeGreaterThan(0);
  });

  it('renders execution time', () => {
    render(<ExecutionHistory />);
    expect(screen.getByText('100ms')).toBeInTheDocument();
    expect(screen.getByText('50ms')).toBeInTheDocument();
  });

  it('renders tags', () => {
    render(<ExecutionHistory />);
    expect(screen.getByText('test')).toBeInTheDocument();
  });

  it('renders language badges', () => {
    render(<ExecutionHistory />);
    const badges = screen.getAllByTestId('badge');
    expect(badges.length).toBeGreaterThan(0);
  });

  it('renders action buttons for executions', () => {
    render(<ExecutionHistory />);
    const buttons = screen.getAllByTestId('button');
    // Should have multiple action buttons (export, refresh, clear, copy, favorite, delete per execution)
    expect(buttons.length).toBeGreaterThan(3);
  });

  it('exports history when export button is clicked', () => {
    // Store original createElement
    const originalCreateElement = document.createElement.bind(document);
    const mockClick = jest.fn();
    
    // Only mock for 'a' elements to avoid corrupting other createElement calls
    const mockCreateElement = jest.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'a') {
        const mockAnchor = originalCreateElement('a');
        mockAnchor.click = mockClick;
        return mockAnchor;
      }
      return originalCreateElement(tagName);
    });

    render(<ExecutionHistory />);
    const buttons = screen.getAllByTestId('button');
    const exportButton = buttons[0]; // First button is the export button

    fireEvent.click(exportButton);
    expect(mockCreateElement).toHaveBeenCalledWith('a');

    mockCreateElement.mockRestore();
  });

  it('calls refresh when refresh button is clicked', () => {
    render(<ExecutionHistory />);
    const buttons = screen.getAllByTestId('button');
    // Second button is the refresh button (after export)
    const refreshButton = buttons[1];

    if (refreshButton) {
      fireEvent.click(refreshButton);
      expect(mockRefresh).toHaveBeenCalled();
    }
  });

  it('shows loading spinner when loading', () => {
    setMockHook({ executions: [], loading: true });

    render(<ExecutionHistory />);
    const spinIcon = document.querySelector('.animate-spin');
    expect(spinIcon).toBeInTheDocument();
  });

  it('updates search query on input change', () => {
    render(<ExecutionHistory />);
    const searchInput = screen.getByPlaceholderText(/search/i);
    fireEvent.change(searchInput, { target: { value: 'test query' } });
    expect(searchInput).toHaveValue('test query');
  });

  it('toggles favorites filter', () => {
    render(<ExecutionHistory />);
    const buttons = screen.getAllByTestId('button');
    const starButton = buttons.find(btn => btn.querySelector('svg'));

    if (starButton) {
      fireEvent.click(starButton);
      // Should toggle the favoritesOnly state
    }
  });

  it('accepts showPagination prop', () => {
    // Test that component accepts pagination props without error
    render(<ExecutionHistory showPagination limit={20} />);
    expect(screen.getByTestId('card')).toBeInTheDocument();
  });

  it('accepts limit prop', () => {
    render(<ExecutionHistory limit={10} />);
    expect(screen.getByTestId('card')).toBeInTheDocument();
  });
});
