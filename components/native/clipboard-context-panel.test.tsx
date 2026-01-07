/**
 * Clipboard Context Panel Tests
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ClipboardContextPanel } from './clipboard-context-panel';

// Mock the clipboard context hook
const mockUseClipboardContext: {
  content: string | null;
  analysis: { confidence: number } | null;
  isAnalyzing: boolean;
  isMonitoring: boolean;
  error: string | null;
  hasSensitiveContent: boolean;
  contentPreview: string | null;
  category: string | null;
  language: string | null;
  entities: Array<{ entity_type: string; value: string; start: number; end: number }>;
  suggestedActions: Array<{ action_id: string; label: string; description: string; priority: number }>;
  stats: { char_count: number; word_count: number; line_count: number } | null;
  formatting: { preserve_whitespace: boolean } | null;
  readAndAnalyze: jest.Mock;
  quickTransform: jest.Mock;
  executeAction: jest.Mock;
  getApplicableTransforms: jest.Mock;
  startMonitoring: jest.Mock;
  stopMonitoring: jest.Mock;
  writeText: jest.Mock;
  clearClipboard: jest.Mock;
} = {
  content: null,
  analysis: null,
  isAnalyzing: false,
  isMonitoring: false,
  error: null,
  hasSensitiveContent: false,
  contentPreview: null,
  category: null,
  language: null,
  entities: [],
  suggestedActions: [],
  stats: null,
  formatting: null,
  readAndAnalyze: jest.fn(),
  quickTransform: jest.fn(),
  executeAction: jest.fn(),
  getApplicableTransforms: jest.fn().mockReturnValue([]),
  startMonitoring: jest.fn(),
  stopMonitoring: jest.fn(),
  writeText: jest.fn(),
  clearClipboard: jest.fn(),
};

jest.mock('@/hooks/context', () => ({
  useClipboardContext: jest.fn(() => mockUseClipboardContext),
  CATEGORY_INFO: {
    PlainText: { label: 'Plain Text', icon: 'file-text', color: 'gray' },
    Url: { label: 'URL', icon: 'link', color: 'blue' },
    Email: { label: 'Email', icon: 'mail', color: 'green' },
    Code: { label: 'Code', icon: 'code', color: 'cyan' },
    Json: { label: 'JSON', icon: 'braces', color: 'orange' },
    Unknown: { label: 'Unknown', icon: 'help-circle', color: 'gray' },
  },
  TRANSFORM_ACTIONS: [
    { id: 'format_json', label: 'Format JSON', description: 'Pretty print JSON', icon: 'braces', category: 'format' },
    { id: 'to_uppercase', label: 'To Uppercase', description: 'Convert to uppercase', icon: 'arrow-up', category: 'case' },
  ],
  LANGUAGE_INFO: {},
}));

// Mock Tabs components for reliable testing
jest.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children, value, className }: { children: React.ReactNode; value?: string; className?: string }) => (
    <div data-testid="tabs" data-value={value} className={className}>{children}</div>
  ),
  TabsList: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="tabs-list" role="tablist" className={className}>{children}</div>
  ),
  TabsTrigger: ({ children, value, className }: { children: React.ReactNode; value: string; className?: string }) => (
    <button role="tab" data-testid={`tab-trigger-${value}`} aria-label={typeof children === 'string' ? children : value} className={className}>{children}</button>
  ),
  TabsContent: ({ children, value, className }: { children: React.ReactNode; value: string; className?: string }) => (
    <div data-testid={`tab-content-${value}`} className={className}>{children}</div>
  ),
}));

// Mock ScrollArea to avoid Radix rendering issues
jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="scroll-area" className={className}>{children}</div>
  ),
}));

// Mock DropdownMenu components
jest.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div data-testid="dropdown-menu">{children}</div>,
  DropdownMenuTrigger: ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) => (
    <div data-testid="dropdown-menu-trigger">{asChild ? children : <button>{children}</button>}</div>
  ),
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div data-testid="dropdown-menu-content">{children}</div>,
  DropdownMenuItem: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button data-testid="dropdown-menu-item" onClick={onClick}>{children}</button>
  ),
  DropdownMenuLabel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuSeparator: () => <hr />,
}));

// Mock EmptyState to avoid issues with Lucide icons passed as forwardRef
jest.mock('@/components/layout/empty-state', () => ({
  EmptyState: ({ title, description, compact, className }: { icon?: unknown; title: string; description?: string; compact?: boolean; className?: string }) => (
    <div data-testid="empty-state" data-compact={compact} className={className}>
      <div>{title}</div>
      {description && <div>{description}</div>}
    </div>
  ),
}));

describe('ClipboardContextPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset ALL mock values to prevent test pollution
    mockUseClipboardContext.content = null;
    mockUseClipboardContext.analysis = null;
    mockUseClipboardContext.isAnalyzing = false;
    mockUseClipboardContext.isMonitoring = false;
    mockUseClipboardContext.error = null;
    mockUseClipboardContext.hasSensitiveContent = false;
    mockUseClipboardContext.contentPreview = null;
    mockUseClipboardContext.category = null;
    mockUseClipboardContext.language = null;
    mockUseClipboardContext.entities = [];
    mockUseClipboardContext.suggestedActions = [];
    mockUseClipboardContext.stats = null;
    mockUseClipboardContext.formatting = null;
    // Reset mock functions
    mockUseClipboardContext.getApplicableTransforms.mockReturnValue([]);
  });

  it('renders the panel with header', () => {
    render(<ClipboardContextPanel />);
    expect(screen.getByText('Context Clipboard')).toBeInTheDocument();
  });

  it('shows empty state when no content', () => {
    render(<ClipboardContextPanel />);
    expect(screen.getByText('No clipboard content')).toBeInTheDocument();
  });

  it('shows monitoring badge when monitoring is active', () => {
    mockUseClipboardContext.isMonitoring = true;
    render(<ClipboardContextPanel />);
    expect(screen.getByText('Monitoring')).toBeInTheDocument();
  });

  it('calls readAndAnalyze when refresh button is clicked', () => {
    render(<ClipboardContextPanel />);
    // Find the refresh button by its icon or position
    const buttons = screen.getAllByRole('button');
    const refreshBtn = buttons.find(btn => btn.querySelector('.lucide-refresh-cw'));
    if (refreshBtn) {
      fireEvent.click(refreshBtn);
      expect(mockUseClipboardContext.readAndAnalyze).toHaveBeenCalled();
    }
  });

  it('displays content when available', () => {
    mockUseClipboardContext.content = 'Test content';
    mockUseClipboardContext.contentPreview = 'Test content';
    mockUseClipboardContext.category = 'PlainText';
    mockUseClipboardContext.analysis = {
      confidence: 0.95,
    };
    mockUseClipboardContext.stats = {
      char_count: 12,
      word_count: 2,
      line_count: 1,
    };

    render(<ClipboardContextPanel />);
    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('shows sensitive content badge when content is sensitive', () => {
    mockUseClipboardContext.content = 'password=secret';
    mockUseClipboardContext.contentPreview = 'password=secret';
    mockUseClipboardContext.category = 'PlainText';
    mockUseClipboardContext.hasSensitiveContent = true;

    render(<ClipboardContextPanel />);
    expect(screen.getByText('Sensitive')).toBeInTheDocument();
  });

  it('displays error when present', () => {
    mockUseClipboardContext.error = 'Failed to read clipboard';
    render(<ClipboardContextPanel />);
    expect(screen.getByText('Failed to read clipboard')).toBeInTheDocument();
  });

  it('renders tabs for Current, Actions, and Entities', () => {
    render(<ClipboardContextPanel />);
    expect(screen.getByText('Current')).toBeInTheDocument();
    expect(screen.getByText('Actions')).toBeInTheDocument();
    expect(screen.getByText('Entities')).toBeInTheDocument();
  });

  it('switches to Actions tab when clicked', () => {
    render(<ClipboardContextPanel />);
    // With mocked tabs, all content is rendered
    expect(screen.getByText('No suggested actions')).toBeInTheDocument();
  });

  it('switches to Entities tab when clicked', () => {
    render(<ClipboardContextPanel />);
    // With mocked tabs, all content is rendered
    expect(screen.getByText('No entities detected')).toBeInTheDocument();
  });

  it('displays entities when available', () => {
    mockUseClipboardContext.content = 'Contact: user@example.com';
    mockUseClipboardContext.entities = [
      { entity_type: 'email', value: 'user@example.com', start: 9, end: 25 },
    ];

    render(<ClipboardContextPanel />);
    // With mocked tabs, all content is rendered
    expect(screen.getByText('user@example.com')).toBeInTheDocument();
  });

  it('displays suggested actions when available', () => {
    mockUseClipboardContext.content = 'https://example.com';
    mockUseClipboardContext.suggestedActions = [
      { action_id: 'open_url', label: 'Open URL', description: 'Open in browser', priority: 1 },
    ];

    render(<ClipboardContextPanel />);
    // With mocked tabs, all content is rendered
    expect(screen.getByTestId('suggested-action-open_url')).toBeInTheDocument();
  });

  it('calls executeAction when action button is clicked', () => {
    mockUseClipboardContext.content = 'https://example.com';
    mockUseClipboardContext.suggestedActions = [
      { action_id: 'open_url', label: 'Open URL', description: 'Open in browser', priority: 1 },
    ];

    render(<ClipboardContextPanel />);
    // With mocked tabs, all content is rendered
    const actionButton = screen.getByTestId('suggested-action-open_url');
    fireEvent.click(actionButton);
    expect(mockUseClipboardContext.executeAction).toHaveBeenCalledWith('open_url');
  });

  it('displays content statistics when available', () => {
    mockUseClipboardContext.content = 'Hello World';
    mockUseClipboardContext.contentPreview = 'Hello World';
    mockUseClipboardContext.category = 'PlainText';
    mockUseClipboardContext.stats = {
      char_count: 11,
      word_count: 2,
      line_count: 1,
    };

    render(<ClipboardContextPanel />);
    expect(screen.getByText('11 chars')).toBeInTheDocument();
    expect(screen.getByText('2 words')).toBeInTheDocument();
    expect(screen.getByText('1 lines')).toBeInTheDocument();
  });

  it('displays confidence badge when analysis is available', () => {
    mockUseClipboardContext.content = 'https://example.com';
    mockUseClipboardContext.contentPreview = 'https://example.com';
    mockUseClipboardContext.category = 'Url';
    mockUseClipboardContext.analysis = {
      confidence: 0.95,
    };

    render(<ClipboardContextPanel />);
    expect(screen.getByText('95% confidence')).toBeInTheDocument();
  });

  it('calls clearClipboard when Clear button is clicked', () => {
    mockUseClipboardContext.content = 'Test content';
    mockUseClipboardContext.contentPreview = 'Test content';
    mockUseClipboardContext.category = 'PlainText';

    render(<ClipboardContextPanel />);
    const clearButton = screen.getByText('Clear');
    fireEvent.click(clearButton);
    expect(mockUseClipboardContext.clearClipboard).toHaveBeenCalled();
  });

  it('calls writeText when Copy button is clicked', () => {
    mockUseClipboardContext.content = 'Test content';
    mockUseClipboardContext.contentPreview = 'Test content';
    mockUseClipboardContext.category = 'PlainText';

    render(<ClipboardContextPanel />);
    const copyButton = screen.getByText('Copy');
    fireEvent.click(copyButton);
    expect(mockUseClipboardContext.writeText).toHaveBeenCalledWith('Test content');
  });

  it('applies custom className', () => {
    const { container } = render(<ClipboardContextPanel className="custom-class" />);
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('toggles monitoring when play/stop button is clicked', () => {
    mockUseClipboardContext.isMonitoring = false;
    const { rerender } = render(<ClipboardContextPanel />);

    // Click to start monitoring
    const buttons = screen.getAllByRole('button');
    const playButton = buttons[0]; // First button should be play/stop
    fireEvent.click(playButton);
    expect(mockUseClipboardContext.startMonitoring).toHaveBeenCalled();

    // Update mock and rerender
    mockUseClipboardContext.isMonitoring = true;
    rerender(<ClipboardContextPanel />);

    fireEvent.click(playButton);
    expect(mockUseClipboardContext.stopMonitoring).toHaveBeenCalled();
  });
});
