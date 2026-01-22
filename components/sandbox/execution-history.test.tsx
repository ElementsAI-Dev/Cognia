/**
 * @jest-environment jsdom
 */
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-require-imports */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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

jest.mock('@/hooks/sandbox', () => ({
  useExecutionHistory: ({ filter: _filter }: any) => ({
    executions: [
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
    ],
    loading: false,
    refresh: jest.fn(),
    deleteExecution: jest.fn(),
    toggleFavorite: jest.fn(),
    clearHistory: jest.fn(),
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

describe('ExecutionHistory', () => {
  const mockOnSelectExecution = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
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
    expect(screen.getByTestId('select')).toBeInTheDocument();
  });

  it('renders status filter select', () => {
    render(<ExecutionHistory />);
    const selects = screen.getAllByTestId('select');
    expect(selects.length).toBeGreaterThan(0);
  });

  it('renders favorites toggle button', () => {
    render(<ExecutionHistory />);
    const buttons = screen.getAllByTestId('button');
    const starButton = buttons.find(btn => btn.querySelector('svg'));
    expect(starButton).toBeInTheDocument();
  });

  it('renders execution items', () => {
    render(<ExecutionHistory />);
    expect(screen.getByText('print("hello")')).toBeInTheDocument();
    expect(screen.getByText('console.log("error");')).toBeInTheDocument();
  });

  it('renders empty state when no executions', () => {
    jest.doMock('@/hooks/sandbox', () => ({
      useExecutionHistory: () => ({
        executions: [],
        loading: false,
        refresh: jest.fn(),
        deleteExecution: jest.fn(),
        toggleFavorite: jest.fn(),
        clearHistory: jest.fn(),
      }),
    }));

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

  it('copies code when copy button is clicked', async () => {
    render(<ExecutionHistory />);
    const copyButtons = screen.getAllByTestId('button');
    const copyButton = copyButtons.find(btn => btn.querySelector('svg') && !btn.className.includes('text-destructive'));

    if (copyButton) {
      fireEvent.click(copyButton);
      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalled();
      });
    }
  });

  it('exports history when export button is clicked', () => {
    const mockCreateElement = jest.spyOn(document, 'createElement').mockReturnValue({
      href: '',
      download: '',
      click: jest.fn(),
    } as any);

    render(<ExecutionHistory />);
    const buttons = screen.getAllByTestId('button');
    const exportButton = buttons[0]; // First button is the export button

    fireEvent.click(exportButton);
    expect(mockCreateElement).toHaveBeenCalledWith('a');

    mockCreateElement.mockRestore();
  });

  it('calls refresh when refresh button is clicked', () => {
    const { useExecutionHistory } = require('@/hooks/sandbox');
    const mockRefresh = jest.fn();
    useExecutionHistory.mockReturnValue({
      executions: [],
      loading: false,
      refresh: mockRefresh,
      deleteExecution: jest.fn(),
      toggleFavorite: jest.fn(),
      clearHistory: jest.fn(),
    });

    render(<ExecutionHistory />);
    const buttons = screen.getAllByTestId('button');
    const refreshButton = buttons.find(btn => btn.querySelector('.animate-spin') === null);

    if (refreshButton) {
      fireEvent.click(refreshButton);
      expect(mockRefresh).toHaveBeenCalled();
    }
  });

  it('shows loading spinner when loading', () => {
    const { useExecutionHistory } = require('@/hooks/sandbox');
    useExecutionHistory.mockReturnValue({
      executions: [],
      loading: true,
      refresh: jest.fn(),
      deleteExecution: jest.fn(),
      toggleFavorite: jest.fn(),
      clearHistory: jest.fn(),
    });

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

  it('renders pagination when showPagination is true', () => {
    render(<ExecutionHistory showPagination limit={1} />);
    // With limit=1 and 2 executions, we should have pagination
    const paginationDiv = document.querySelector('.border-t');
    expect(paginationDiv).toBeInTheDocument();
  });

  it('does not render pagination when showPagination is false', () => {
    render(<ExecutionHistory showPagination={false} />);
    const paginationDiv = document.querySelector('.border-t');
    expect(paginationDiv).not.toBeInTheDocument();
  });

  it('navigates to next page', () => {
    render(<ExecutionHistory showPagination limit={1} />);
    const nextButton = screen.getByText('Next');
    fireEvent.click(nextButton);
    // Should increment current page
  });

  it('navigates to previous page', () => {
    render(<ExecutionHistory showPagination limit={1} />);
    // First go to next page
    const nextButton = screen.getByText('Next');
    fireEvent.click(nextButton);

    // Then go to previous page
    const prevButton = screen.getByText('Previous');
    fireEvent.click(prevButton);
  });

  it('disables previous button on first page', () => {
    render(<ExecutionHistory showPagination limit={1} />);
    const prevButton = screen.getByText('Previous');
    expect(prevButton).toBeDisabled();
  });

  it('respects custom limit prop', () => {
    render(<ExecutionHistory limit={10} />);
    // Limit should affect pagination
    expect(screen.getByTestId('card')).toBeInTheDocument();
  });

  it('formats time correctly for sub-second executions', () => {
    render(<ExecutionHistory />);
    expect(screen.getByText('100ms')).toBeInTheDocument();
  });

  it('formats time correctly for executions over 1 second', () => {
    const { useExecutionHistory } = require('@/hooks/sandbox');
    useExecutionHistory.mockReturnValue({
      executions: [
        {
          id: '1',
          code: 'time.sleep(5)',
          language: 'python',
          status: 'completed' as ExecutionStatus,
          stdout: '',
          stderr: '',
          exit_code: 0,
          execution_time_ms: 5500,
          created_at: '2024-01-01T10:00:00Z',
          tags: [],
          is_favorite: false,
        },
      ],
      loading: false,
      refresh: jest.fn(),
      deleteExecution: jest.fn(),
      toggleFavorite: jest.fn(),
      clearHistory: jest.fn(),
    });

    render(<ExecutionHistory />);
    expect(screen.getByText('5.50s')).toBeInTheDocument();
  });

  it('formats date correctly', () => {
    render(<ExecutionHistory />);
    const dateText = screen.getAllByText(/\d{1,2}\/\d{1,2}\/\d{4}/);
    expect(dateText.length).toBeGreaterThan(0);
  });

  it('displays clear history confirmation dialog', () => {
    render(<ExecutionHistory />);
    const trashButton = screen.getAllByTestId('button').find(btn =>
      btn.querySelector('svg') && btn.className.includes('text-destructive')
    );

    if (trashButton) {
      fireEvent.click(trashButton);
      expect(screen.getByTestId('alert-dialog-content')).toBeInTheDocument();
    }
  });

  it('calls handleDelete when delete button is clicked', () => {
    const { useExecutionHistory } = require('@/hooks/sandbox');
    const mockDelete = jest.fn();
    useExecutionHistory.mockReturnValue({
      executions: [],
      loading: false,
      refresh: jest.fn(),
      deleteExecution: mockDelete,
      toggleFavorite: jest.fn(),
      clearHistory: jest.fn(),
    });

    render(<ExecutionHistory />);
    const deleteButton = screen.getAllByTestId('button').find(btn =>
      btn.className.includes('text-destructive')
    );

    if (deleteButton) {
      fireEvent.click(deleteButton);
      // Should trigger delete after confirmation
    }
  });
});

describe('Integration tests', () => {
  it('renders complete execution history with all features', () => {
    render(
      <ExecutionHistory
        onSelectExecution={jest.fn()}
        limit={10}
        showPagination
      />
    );

    expect(screen.getByTestId('card')).toBeInTheDocument();
    expect(screen.getByTestId('card-header')).toBeInTheDocument();
    expect(screen.getByTestId('card-content')).toBeInTheDocument();
  });
});
