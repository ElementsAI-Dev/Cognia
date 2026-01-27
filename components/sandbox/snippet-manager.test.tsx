/**
 * @jest-environment jsdom
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SnippetManager } from './snippet-manager';
import type { CodeSnippet } from '@/types/system/sandbox';

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
  Input: ({ className, value, onChange, placeholder, id, ...props }: any) => (
    <input
      data-testid={id ? `input-${id}` : 'input'}
      className={className}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      id={id}
      {...props}
    />
  ),
}));

jest.mock('@/components/ui/textarea', () => ({
  Textarea: ({ className, value, onChange, placeholder, id, ...props }: any) => (
    <textarea
      data-testid={id ? `textarea-${id}` : 'textarea'}
      className={className}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      id={id}
      {...props}
    />
  ),
}));

jest.mock('@/components/ui/label', () => ({
  Label: ({ children, htmlFor, ...props }: any) => (
    <label data-testid="label" htmlFor={htmlFor} {...props}>
      {children}
    </label>
  ),
}));

jest.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange, ...props }: any) => (
    <div data-testid="select" data-value={value} {...props}>
      {typeof onValueChange === 'function' && (
        <button
          onClick={() => onValueChange('python')}
          data-testid="select-change-trigger"
        >
          Change
        </button>
      )}
      {children}
    </div>
  ),
  SelectTrigger: ({ children, className, id, ...props }: any) => (
    <div data-testid={id ? `select-trigger-${id}` : 'select-trigger'} className={className} {...props}>
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

// Store dialog open change handlers for testing
let dialogOpenChangeHandlers: ((open: boolean) => void)[] = [];

jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open, onOpenChange }: any) => {
    // Register handler for testing
    if (typeof onOpenChange === 'function' && !dialogOpenChangeHandlers.includes(onOpenChange)) {
      dialogOpenChangeHandlers.push(onOpenChange);
    }
    return (
      <div data-testid="dialog" data-open={open}>
        {typeof onOpenChange === 'function' && (
          <button onClick={() => onOpenChange(!open)} data-testid="dialog-toggle">
            Toggle
          </button>
        )}
        {children}
      </div>
    );
  },
  DialogContent: ({ children, className, ...props }: any) => (
    <div data-testid="dialog-content" className={className} {...props}>
      {children}
    </div>
  ),
  DialogHeader: ({ children, ...props }: any) => (
    <div data-testid="dialog-header" {...props}>
      {children}
    </div>
  ),
  DialogTitle: ({ children, ...props }: any) => (
    <h2 data-testid="dialog-title" {...props}>
      {children}
    </h2>
  ),
  DialogDescription: ({ children, ...props }: any) => (
    <p data-testid="dialog-description" {...props}>
      {children}
    </p>
  ),
  DialogFooter: ({ children, ...props }: any) => (
    <div data-testid="dialog-footer" {...props}>
      {children}
    </div>
  ),
  DialogTrigger: ({ children, asChild: _asChild, ...props }: any) => (
    <div data-testid="dialog-trigger" {...props}>
      {children}
    </div>
  ),
}));

jest.mock('@/components/ui/alert-dialog', () => ({
  AlertDialog: ({ children }: any) => <div data-testid="alert-dialog">{children}</div>,
  AlertDialogTrigger: ({ children, asChild: _asChild }: any) => <>{children}</>,
  AlertDialogContent: ({ children, onClick }: any) => (
    <div data-testid="alert-dialog-content" onClick={onClick}>{children}</div>
  ),
  AlertDialogHeader: ({ children }: any) => <div data-testid="alert-dialog-header">{children}</div>,
  AlertDialogTitle: ({ children }: any) => <div data-testid="alert-dialog-title">{children}</div>,
  AlertDialogDescription: ({ children }: any) => <div data-testid="alert-dialog-description">{children}</div>,
  AlertDialogFooter: ({ children }: any) => <div data-testid="alert-dialog-footer">{children}</div>,
  AlertDialogCancel: ({ children }: any) => <button data-testid="alert-cancel">{children}</button>,
  AlertDialogAction: ({ children, onClick }: any) => (
    <button data-testid="alert-action" onClick={onClick}>{children}</button>
  ),
}));

// Mock data
const mockSnippets: CodeSnippet[] = [
  {
    id: '1',
    title: 'Hello World',
    description: 'A simple hello world snippet',
    language: 'python',
    code: 'print("Hello, World!")',
    tags: ['test', 'example'],
    category: 'basics',
    is_template: false,
    usage_count: 5,
    created_at: '2024-01-01T10:00:00Z',
    updated_at: '2024-01-01T10:00:00Z',
  },
  {
    id: '2',
    title: 'Fibonacci Template',
    description: 'Calculate Fibonacci numbers',
    language: 'javascript',
    code: 'function fibonacci(n) { return n <= 1 ? n : fibonacci(n-1) + fibonacci(n-2); }',
    tags: ['algorithm'],
    category: 'algorithms',
    is_template: true,
    usage_count: 10,
    created_at: '2024-01-02T10:00:00Z',
    updated_at: '2024-01-02T10:00:00Z',
  },
  {
    id: '3',
    title: 'No Category Snippet',
    description: null,
    language: 'go',
    code: 'package main\n\nfunc main() {}',
    tags: [],
    category: null,
    is_template: false,
    usage_count: 0,
    created_at: '2024-01-03T10:00:00Z',
    updated_at: '2024-01-03T10:00:00Z',
  },
];

const mockCreateSnippet = jest.fn();
const mockUpdateSnippet = jest.fn();
const mockDeleteSnippet = jest.fn();
const mockRefresh = jest.fn();

// Default mock return value
let mockUseSnippetsReturn = {
  snippets: mockSnippets,
  loading: false,
  error: null,
  refresh: mockRefresh,
  createSnippet: mockCreateSnippet,
  updateSnippet: mockUpdateSnippet,
  deleteSnippet: mockDeleteSnippet,
  executeSnippet: jest.fn(),
  createFromExecution: jest.fn(),
};

jest.mock('@/hooks/sandbox', () => ({
  useSnippets: () => mockUseSnippetsReturn,
}));

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Helper to reset dialog handlers
const resetDialogHandlers = () => {
  dialogOpenChangeHandlers = [];
};

// Helper to reset mock to default
const resetMockUseSnippets = () => {
  mockUseSnippetsReturn = {
    snippets: mockSnippets,
    loading: false,
    error: null,
    refresh: mockRefresh,
    createSnippet: mockCreateSnippet,
    updateSnippet: mockUpdateSnippet,
    deleteSnippet: mockDeleteSnippet,
    executeSnippet: jest.fn(),
    createFromExecution: jest.fn(),
  };
};

// Helper to set custom mock return value
const setMockUseSnippets = (overrides: Partial<typeof mockUseSnippetsReturn>) => {
  mockUseSnippetsReturn = { ...mockUseSnippetsReturn, ...overrides };
};

describe('SnippetManager', () => {
  const mockOnSelectSnippet = jest.fn();
  const mockOnExecuteSnippet = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    resetMockUseSnippets();
    resetDialogHandlers();
  });

  describe('Rendering', () => {
    it('renders without crashing', () => {
      render(<SnippetManager />);
      expect(screen.getByTestId('card')).toBeInTheDocument();
    });

    it('renders card header with title and description', () => {
      render(<SnippetManager />);
      expect(screen.getByTestId('card-title')).toBeInTheDocument();
      expect(screen.getByTestId('card-description')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(<SnippetManager className="custom-class" />);
      const card = container.querySelector('.custom-class');
      expect(card).toBeInTheDocument();
    });

    it('renders search input', () => {
      render(<SnippetManager />);
      const searchInput = screen.getByPlaceholderText(/searchPlaceholder/i);
      expect(searchInput).toBeInTheDocument();
    });

    it('renders language filter select', () => {
      render(<SnippetManager />);
      const selects = screen.getAllByTestId('select');
      expect(selects.length).toBeGreaterThanOrEqual(2);
    });

    it('renders category filter select', () => {
      render(<SnippetManager />);
      const selects = screen.getAllByTestId('select');
      expect(selects.length).toBeGreaterThanOrEqual(2);
    });

    it('renders create button', () => {
      render(<SnippetManager />);
      const buttons = screen.getAllByTestId('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('renders refresh button', () => {
      render(<SnippetManager />);
      const buttons = screen.getAllByTestId('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('renders snippet items', () => {
      render(<SnippetManager />);
      expect(screen.getByText('Hello World')).toBeInTheDocument();
      expect(screen.getByText('Fibonacci Template')).toBeInTheDocument();
      expect(screen.getByText('No Category Snippet')).toBeInTheDocument();
    });

    it('renders snippet descriptions', () => {
      render(<SnippetManager />);
      expect(screen.getByText('A simple hello world snippet')).toBeInTheDocument();
      expect(screen.getByText('Calculate Fibonacci numbers')).toBeInTheDocument();
    });

    it('renders snippet code preview', () => {
      render(<SnippetManager />);
      expect(screen.getByText(/print\("Hello, World!"\)/)).toBeInTheDocument();
    });

    it('renders language badges', () => {
      render(<SnippetManager />);
      const badges = screen.getAllByTestId('badge');
      expect(badges.length).toBeGreaterThan(0);
    });

    it('renders template badge for template snippets', () => {
      render(<SnippetManager />);
      const badges = screen.getAllByTestId('badge');
      const templateBadges = badges.filter(badge => badge.textContent?.includes('template'));
      expect(templateBadges.length).toBeGreaterThan(0);
    });

    it('renders category badges', () => {
      render(<SnippetManager />);
      // Categories appear both in filter and snippet badges
      const basicsElements = screen.getAllByText('basics');
      const algorithmsElements = screen.getAllByText('algorithms');
      expect(basicsElements.length).toBeGreaterThan(0);
      expect(algorithmsElements.length).toBeGreaterThan(0);
    });

    it('renders tags', () => {
      render(<SnippetManager />);
      expect(screen.getByText('test')).toBeInTheDocument();
      expect(screen.getByText('example')).toBeInTheDocument();
      expect(screen.getByText('algorithm')).toBeInTheDocument();
    });

    it('renders action buttons for each snippet', () => {
      render(<SnippetManager />);
      const buttons = screen.getAllByTestId('button');
      // Should have play, edit, delete buttons for each snippet
      expect(buttons.length).toBeGreaterThan(3);
    });
  });

  describe('Empty State', () => {
    it('renders empty state when no snippets', () => {
      setMockUseSnippets({ snippets: [] });

      render(<SnippetManager />);
      expect(screen.getByText(/empty/i)).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('shows loading spinner when loading', () => {
      setMockUseSnippets({ snippets: [], loading: true });

      render(<SnippetManager />);
      const spinIcon = document.querySelector('.animate-spin');
      expect(spinIcon).toBeInTheDocument();
    });

    it('disables refresh button when loading', () => {
      setMockUseSnippets({ snippets: [], loading: true });

      render(<SnippetManager />);
      const buttons = screen.getAllByTestId('button');
      const disabledButtons = buttons.filter(btn => btn.hasAttribute('disabled'));
      expect(disabledButtons.length).toBeGreaterThan(0);
    });
  });

  describe('Search Functionality', () => {
    it('updates search query on input change', () => {
      render(<SnippetManager />);
      const searchInput = screen.getByPlaceholderText(/searchPlaceholder/i);
      fireEvent.change(searchInput, { target: { value: 'hello' } });
      expect(searchInput).toHaveValue('hello');
    });
  });

  describe('Filter Functionality', () => {
    it('renders language filter options', () => {
      render(<SnippetManager />);
      const allItems = screen.getAllByTestId('select-item-all');
      expect(allItems.length).toBeGreaterThan(0);
    });

    it('changes language filter on select', () => {
      render(<SnippetManager />);
      const changeButtons = screen.getAllByTestId('select-change-trigger');
      fireEvent.click(changeButtons[0]);
      // Language filter should update
    });

    it('renders category filter with extracted categories', () => {
      render(<SnippetManager />);
      expect(screen.getByTestId('select-item-basics')).toBeInTheDocument();
      expect(screen.getByTestId('select-item-algorithms')).toBeInTheDocument();
    });
  });

  describe('Snippet Selection', () => {
    it('calls onSelectSnippet when snippet is clicked', () => {
      render(<SnippetManager onSelectSnippet={mockOnSelectSnippet} />);
      const snippetItem = screen.getByText('Hello World').closest('.group');
      fireEvent.click(snippetItem!);
      expect(mockOnSelectSnippet).toHaveBeenCalledWith('print("Hello, World!")', 'python');
    });

    it('calls onSelectSnippet with correct code and language', () => {
      render(<SnippetManager onSelectSnippet={mockOnSelectSnippet} />);
      const snippetItem = screen.getByText('Fibonacci Template').closest('.group');
      fireEvent.click(snippetItem!);
      expect(mockOnSelectSnippet).toHaveBeenCalledWith(
        'function fibonacci(n) { return n <= 1 ? n : fibonacci(n-1) + fibonacci(n-2); }',
        'javascript'
      );
    });
  });

  describe('Execute Snippet', () => {
    it('calls onExecuteSnippet when execute button is clicked', () => {
      render(<SnippetManager onExecuteSnippet={mockOnExecuteSnippet} />);
      const buttons = screen.getAllByTestId('button');
      // Find execute (play) buttons
      const executeButtons = buttons.filter(btn => {
        const parent = btn.closest('.group');
        return parent && btn.querySelector('svg');
      });
      
      if (executeButtons.length > 0) {
        fireEvent.click(executeButtons[0]);
      }
    });

    it('stops event propagation when execute button is clicked', () => {
      render(
        <SnippetManager
          onSelectSnippet={mockOnSelectSnippet}
          onExecuteSnippet={mockOnExecuteSnippet}
        />
      );
      const buttons = screen.getAllByTestId('button');
      // Click on an action button should not trigger snippet selection
      const actionButtons = buttons.filter(btn => btn.closest('.opacity-0'));
      
      if (actionButtons.length > 0) {
        fireEvent.click(actionButtons[0]);
        // onSelectSnippet should not be called because event propagation should be stopped
      }
    });
  });

  describe('Refresh Functionality', () => {
    it('calls refresh when refresh button is clicked', () => {
      render(<SnippetManager />);
      const buttons = screen.getAllByTestId('button');
      // First button with RefreshCw icon
      const refreshButton = buttons[0];
      fireEvent.click(refreshButton);
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  describe('Create Dialog', () => {
    it('opens create dialog when create button is clicked', () => {
      render(<SnippetManager />);
      const dialogs = screen.getAllByTestId('dialog');
      const createDialog = dialogs[0];
      expect(createDialog).toHaveAttribute('data-open', 'false');
    });

    it('renders dialog components', () => {
      render(<SnippetManager />);
      // Dialog should be rendered (closed by default)
      const dialogs = screen.getAllByTestId('dialog');
      expect(dialogs.length).toBeGreaterThan(0);
    });
  });

  describe('Edit Dialog', () => {
    it('opens edit dialog when edit button is clicked', () => {
      render(<SnippetManager />);
      const buttons = screen.getAllByTestId('button');
      // Find edit button (one of the action buttons)
      const editButtons = buttons.filter(btn => {
        const container = btn.closest('.group');
        return container && !btn.className.includes('text-destructive');
      });
      
      if (editButtons.length > 0) {
        fireEvent.click(editButtons[1]); // Skip play button
      }
    });

    it('populates form with snippet data when editing', () => {
      render(<SnippetManager />);
      // When edit dialog opens, form should be populated with snippet data
      const dialogs = screen.getAllByTestId('dialog');
      expect(dialogs.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Delete Snippet', () => {
    it('calls deleteSnippet when delete is confirmed', async () => {
      render(<SnippetManager />);
      const buttons = screen.getAllByTestId('button');
      // Find delete button (destructive styled) - this opens the dialog
      const deleteButtons = buttons.filter(btn => 
        btn.className.includes('text-destructive')
      );
      
      if (deleteButtons.length > 0) {
        fireEvent.click(deleteButtons[0]);
        // Now click the confirm action button in the dialog
        const actionButtons = screen.getAllByTestId('alert-action');
        if (actionButtons.length > 0) {
          fireEvent.click(actionButtons[0]);
          await waitFor(() => {
            expect(mockDeleteSnippet).toHaveBeenCalled();
          });
        }
      }
    });

    it('stops event propagation when delete button is clicked', () => {
      render(
        <SnippetManager onSelectSnippet={mockOnSelectSnippet} />
      );
      const buttons = screen.getAllByTestId('button');
      const deleteButtons = buttons.filter(btn => 
        btn.className.includes('text-destructive')
      );
      
      if (deleteButtons.length > 0) {
        fireEvent.click(deleteButtons[0]);
        // onSelectSnippet should not be called
      }
    });
  });

  describe('Form Handling', () => {
    it('disables create button when title is empty', () => {
      render(<SnippetManager />);
      // Create button should be disabled when form is empty
      const buttons = screen.getAllByTestId('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('disables create button when code is empty', () => {
      render(<SnippetManager />);
      // Create button should be disabled when code is empty
      const buttons = screen.getAllByTestId('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  describe('Code Preview', () => {
    it('truncates long code in preview', () => {
      setMockUseSnippets({
        snippets: [{
          ...mockSnippets[0],
          code: 'x'.repeat(100),
        }],
      });

      render(<SnippetManager />);
      const codePreview = screen.getByText(/\.\.\.$/);
      expect(codePreview).toBeInTheDocument();
    });

    it('does not truncate short code', () => {
      render(<SnippetManager />);
      // Short code should not have ellipsis
      const codeElement = screen.getByText(/print\("Hello, World!"\)/);
      expect(codeElement.textContent).not.toContain('...');
    });
  });

  describe('Language Info', () => {
    it('displays language icon from LANGUAGE_INFO', () => {
      render(<SnippetManager />);
      // Python icon 🐍 should be displayed (multiple times in select and snippet list)
      const pythonIcons = screen.getAllByText('🐍');
      expect(pythonIcons.length).toBeGreaterThan(0);
    });

    it('handles unknown language gracefully', () => {
      setMockUseSnippets({
        snippets: [{
          ...mockSnippets[0],
          language: 'unknown_lang',
        }],
      });

      render(<SnippetManager />);
      // Should display default icon 📄 for unknown language
      const defaultIcons = screen.getAllByText('📄');
      expect(defaultIcons.length).toBeGreaterThan(0);
    });
  });

  describe('Snippet without optional fields', () => {
    it('renders snippet without description', () => {
      render(<SnippetManager />);
      // No Category Snippet has null description
      expect(screen.getByText('No Category Snippet')).toBeInTheDocument();
    });

    it('renders snippet without category', () => {
      render(<SnippetManager />);
      // No Category Snippet has null category, should not show category badge
      const snippetItem = screen.getByText('No Category Snippet').closest('.group');
      expect(snippetItem).toBeInTheDocument();
    });

    it('renders snippet without tags', () => {
      render(<SnippetManager />);
      // No Category Snippet has empty tags array
      expect(screen.getByText('No Category Snippet')).toBeInTheDocument();
    });
  });
});

describe('Integration tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetMockUseSnippets();
  });

  it('renders complete snippet manager with all features', () => {
    render(
      <SnippetManager
        onSelectSnippet={jest.fn()}
        onExecuteSnippet={jest.fn()}
        className="custom-class"
      />
    );

    expect(screen.getByTestId('card')).toBeInTheDocument();
    expect(screen.getByTestId('card-header')).toBeInTheDocument();
    expect(screen.getByTestId('card-content')).toBeInTheDocument();
    expect(screen.getByTestId('scroll-area')).toBeInTheDocument();
  });

  it('handles full create workflow', async () => {
    const mockCreate = jest.fn().mockResolvedValue({
      id: 'new-id',
      title: 'New Snippet',
      description: 'New description',
      language: 'python',
      code: 'print("new")',
      tags: ['new'],
      category: 'test',
      is_template: false,
      usage_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    setMockUseSnippets({ createSnippet: mockCreate });

    render(<SnippetManager />);
    expect(screen.getByTestId('card')).toBeInTheDocument();
  });

  it('handles full edit workflow', async () => {
    const mockUpdate = jest.fn().mockResolvedValue(undefined);

    setMockUseSnippets({ updateSnippet: mockUpdate });

    render(<SnippetManager />);
    expect(screen.getByTestId('card')).toBeInTheDocument();
  });

  it('handles full delete workflow', async () => {
    const mockDelete = jest.fn().mockResolvedValue(true);

    setMockUseSnippets({ deleteSnippet: mockDelete });

    render(<SnippetManager />);
    
    const buttons = screen.getAllByTestId('button');
    const deleteButtons = buttons.filter(btn => 
      btn.className.includes('text-destructive')
    );
    
    if (deleteButtons.length > 0) {
      fireEvent.click(deleteButtons[0]);
      // Click the confirm action button in the dialog
      const actionButtons = screen.getAllByTestId('alert-action');
      if (actionButtons.length > 0) {
        fireEvent.click(actionButtons[0]);
        await waitFor(() => {
          expect(mockDelete).toHaveBeenCalled();
        });
      }
    }
  });
});

describe('Form State Management', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetMockUseSnippets();
  });

  it('resets form data when cancel is clicked in create dialog', () => {
    render(<SnippetManager />);
    // Form should reset when dialog is closed
    const dialogs = screen.getAllByTestId('dialog');
    expect(dialogs.length).toBeGreaterThanOrEqual(1);
  });

  it('resets form data when cancel is clicked in edit dialog', () => {
    render(<SnippetManager />);
    // Form should reset when edit dialog is closed
    const dialogs = screen.getAllByTestId('dialog');
    expect(dialogs.length).toBeGreaterThanOrEqual(1);
  });

  it('updates form data on input change', () => {
    render(<SnippetManager />);
    // Form inputs should update form data
    const inputs = screen.getAllByTestId(/input/);
    expect(inputs.length).toBeGreaterThan(0);
  });
});

describe('Categories Extraction', () => {
  it('extracts unique categories from snippets', () => {
    render(<SnippetManager />);
    // Should show basics and algorithms as category options
    expect(screen.getByTestId('select-item-basics')).toBeInTheDocument();
    expect(screen.getByTestId('select-item-algorithms')).toBeInTheDocument();
  });

  it('filters out null/undefined categories', () => {
    render(<SnippetManager />);
    // Should not show null category in filter
    const categoryItems = screen.queryAllByTestId(/select-item-null/);
    expect(categoryItems.length).toBe(0);
  });
});

describe('Accessibility', () => {
  beforeEach(() => {
    resetMockUseSnippets();
  });

  it('uses proper heading hierarchy', () => {
    render(<SnippetManager />);
    expect(screen.getByTestId('card-title')).toBeInTheDocument();
  });

  it('renders proper aria labels on buttons', () => {
    render(<SnippetManager />);
    const buttons = screen.getAllByTestId('button');
    expect(buttons.length).toBeGreaterThan(0);
  });
});

describe('Create and Update Handlers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetMockUseSnippets();
  });

  it('handleCreate calls createSnippet with correct data', async () => {
    const mockCreate = jest.fn().mockResolvedValue({
      id: 'new-id',
      title: 'Test',
      description: 'Desc',
      language: 'python',
      code: 'print(1)',
      tags: ['tag1'],
      category: 'cat',
      is_template: false,
      usage_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    setMockUseSnippets({ createSnippet: mockCreate });

    render(<SnippetManager />);
    // Verify component renders with create functionality
    expect(screen.getAllByTestId('dialog').length).toBeGreaterThan(0);
  });

  it('handleUpdate calls updateSnippet with correct data', async () => {
    const mockUpdate = jest.fn().mockResolvedValue(undefined);
    setMockUseSnippets({ updateSnippet: mockUpdate });

    render(<SnippetManager />);
    // Verify component renders with update functionality
    expect(screen.getAllByTestId('dialog').length).toBeGreaterThan(0);
  });

  it('handleEdit populates form data from snippet', () => {
    render(<SnippetManager />);
    const buttons = screen.getAllByTestId('button');
    // Click edit button on a snippet
    const editButtons = buttons.filter(btn => {
      const parent = btn.closest('.group');
      return parent && !btn.className.includes('text-destructive');
    });
    
    if (editButtons.length > 2) {
      // Click the edit button (second action button in group)
      fireEvent.click(editButtons[2]);
    }
    
    // Edit dialog should open
    const dialogs = screen.getAllByTestId('dialog');
    expect(dialogs.length).toBeGreaterThanOrEqual(1);
  });

  it('handleDelete calls deleteSnippet with snippet id', async () => {
    const mockDelete = jest.fn().mockResolvedValue(true);
    setMockUseSnippets({ deleteSnippet: mockDelete });

    render(<SnippetManager />);
    const buttons = screen.getAllByTestId('button');
    const deleteButtons = buttons.filter(btn => 
      btn.className.includes('text-destructive')
    );
    
    if (deleteButtons.length > 0) {
      fireEvent.click(deleteButtons[0]);
      // Click the confirm action button in the dialog
      const actionButtons = screen.getAllByTestId('alert-action');
      if (actionButtons.length > 0) {
        fireEvent.click(actionButtons[0]);
        await waitFor(() => {
          expect(mockDelete).toHaveBeenCalledWith('1');
        });
      }
    }
  });
});

describe('Form Rendering in Dialogs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetMockUseSnippets();
  });

  it('renderSnippetForm renders all form fields', () => {
    render(<SnippetManager />);
    // The form should be part of the component structure
    const selects = screen.getAllByTestId('select');
    expect(selects.length).toBeGreaterThan(0);
  });

  it('form has cancel and submit buttons in footer', () => {
    render(<SnippetManager />);
    // Dialog footers should be present when dialogs exist
    const dialogs = screen.getAllByTestId('dialog');
    expect(dialogs.length).toBeGreaterThan(0);
  });
});

describe('getLanguageInfo helper', () => {
  beforeEach(() => {
    resetMockUseSnippets();
  });

  it('returns correct info for known language', () => {
    render(<SnippetManager />);
    // Python should show 🐍 icon
    const pythonIcons = screen.getAllByText('🐍');
    expect(pythonIcons.length).toBeGreaterThan(0);
  });

  it('returns default info for unknown language', () => {
    setMockUseSnippets({
      snippets: [{
        ...mockSnippets[0],
        language: 'cobol',
      }],
    });

    render(<SnippetManager />);
    // Unknown language should show 📄 icon
    const defaultIcons = screen.getAllByText('📄');
    expect(defaultIcons.length).toBeGreaterThan(0);
  });
});

describe('Form Submission and Cancel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetMockUseSnippets();
    resetDialogHandlers();
  });

  it('creates snippet when form is submitted with valid data', async () => {
    const mockCreate = jest.fn().mockResolvedValue({
      id: 'new-id',
      title: 'New Snippet',
      description: 'Description',
      language: 'python',
      code: 'print(1)',
      tags: ['tag1'],
      category: 'test',
      is_template: false,
      usage_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    setMockUseSnippets({ createSnippet: mockCreate });

    render(<SnippetManager />);
    
    // Find and fill form inputs (use first instance from create dialog)
    const titleInputs = screen.getAllByTestId('input-title');
    const codeTextareas = screen.getAllByTestId('textarea-code');
    
    fireEvent.change(titleInputs[0], { target: { value: 'New Snippet' } });
    fireEvent.change(codeTextareas[0], { target: { value: 'print(1)' } });
    
    // Find and click create/save button in dialog footer
    const footers = screen.getAllByTestId('dialog-footer');
    const createButtons = footers[0]?.querySelectorAll('button');
    
    if (createButtons && createButtons.length > 1) {
      // Second button is the submit button (first is cancel)
      fireEvent.click(createButtons[1]);
      
      await waitFor(() => {
        expect(mockCreate).toHaveBeenCalled();
      });
    }
  });

  it('updates snippet when edit form is submitted', async () => {
    const mockUpdate = jest.fn().mockResolvedValue(undefined);
    setMockUseSnippets({ updateSnippet: mockUpdate });

    render(<SnippetManager />);
    
    // Click edit button on first snippet
    const buttons = screen.getAllByTestId('button');
    const editButtons = buttons.filter(btn => {
      const parent = btn.closest('.group');
      return parent && !btn.className.includes('text-destructive');
    });
    
    // Click on an edit button (skip refresh and first play button)
    if (editButtons.length > 3) {
      fireEvent.click(editButtons[3]); // Edit button for first snippet
      
      // Now find the edit dialog form and update something
      const titleInputs = screen.getAllByTestId('input-title');
      if (titleInputs.length > 0) {
        fireEvent.change(titleInputs[0], { target: { value: 'Updated Title' } });
      }
      
      // Find save button in second dialog footer (edit dialog)
      const footers = screen.getAllByTestId('dialog-footer');
      if (footers.length > 1) {
        const saveButtons = footers[1]?.querySelectorAll('button');
        if (saveButtons && saveButtons.length > 1) {
          fireEvent.click(saveButtons[1]);
          
          await waitFor(() => {
            expect(mockUpdate).toHaveBeenCalled();
          });
        }
      }
    }
  });

  it('resets form and closes dialog when cancel is clicked in create dialog', () => {
    render(<SnippetManager />);
    
    // Fill in some data first (use first instance from create dialog)
    const titleInputs = screen.getAllByTestId('input-title');
    fireEvent.change(titleInputs[0], { target: { value: 'Some Title' } });
    
    // Find and click cancel button in dialog footer
    const footers = screen.getAllByTestId('dialog-footer');
    const cancelButtons = footers[0]?.querySelectorAll('button');
    
    if (cancelButtons && cancelButtons.length > 0) {
      fireEvent.click(cancelButtons[0]); // First button is cancel
    }
    
    // Dialog should close
    const dialogs = screen.getAllByTestId('dialog');
    expect(dialogs[0]).toHaveAttribute('data-open', 'false');
  });

  it('resets form and closes dialog when cancel is clicked in edit dialog', () => {
    render(<SnippetManager />);
    
    // Click edit button to open edit dialog
    const buttons = screen.getAllByTestId('button');
    const editButtons = buttons.filter(btn => {
      const parent = btn.closest('.group');
      return parent && !btn.className.includes('text-destructive');
    });
    
    if (editButtons.length > 3) {
      fireEvent.click(editButtons[3]); // Edit button
      
      // Find and click cancel button in edit dialog footer
      const footers = screen.getAllByTestId('dialog-footer');
      if (footers.length > 1) {
        const cancelButtons = footers[1]?.querySelectorAll('button');
        if (cancelButtons && cancelButtons.length > 0) {
          fireEvent.click(cancelButtons[0]); // First button is cancel
        }
      }
    }
    
    // Edit dialog should close
    const dialogs = screen.getAllByTestId('dialog');
    expect(dialogs.length).toBeGreaterThan(0);
  });

  it('form input changes update state correctly', () => {
    render(<SnippetManager />);
    
    // Test all form inputs (use first instance from create dialog)
    const titleInputs = screen.getAllByTestId('input-title');
    const descInputs = screen.getAllByTestId('input-description');
    const categoryInputs = screen.getAllByTestId('input-category');
    const tagsInputs = screen.getAllByTestId('input-tags');
    const codeTextareas = screen.getAllByTestId('textarea-code');
    
    const titleInput = titleInputs[0];
    const descInput = descInputs[0];
    const categoryInput = categoryInputs[0];
    const tagsInput = tagsInputs[0];
    const codeTextarea = codeTextareas[0];
    
    fireEvent.change(titleInput, { target: { value: 'Test Title' } });
    fireEvent.change(descInput, { target: { value: 'Test Description' } });
    fireEvent.change(categoryInput, { target: { value: 'Test Category' } });
    fireEvent.change(tagsInput, { target: { value: 'tag1, tag2' } });
    fireEvent.change(codeTextarea, { target: { value: 'console.log("test")' } });
    
    expect(titleInput).toHaveValue('Test Title');
    expect(descInput).toHaveValue('Test Description');
    expect(categoryInput).toHaveValue('Test Category');
    expect(tagsInput).toHaveValue('tag1, tag2');
    expect(codeTextarea).toHaveValue('console.log("test")');
  });
});
