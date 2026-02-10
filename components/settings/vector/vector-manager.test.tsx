import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VectorManager } from './vector-manager';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      title: 'Collections & Search',
      description: 'Manage collections, clear data, and run vector searches.',
      activeCollection: 'Active collection',
      refresh: 'Refresh',
      createNewCollection: 'Create new collection',
      collectionNamePlaceholder: 'collection name',
      create: 'Create',
      documents: 'Documents',
      dimension: 'Dimension',
      model: 'Model',
      provider: 'Provider',
      collections: 'Collections',
      totalPoints: 'Total Points',
      storage: 'Storage',
      deleteCollection: 'Delete collection',
      clearCollection: 'Clear collection',
      truncate: 'Truncate',
      deleteAllDocs: 'Delete all docs',
      export: 'Export',
      import: 'Import',
      newName: 'New name',
      confirm: 'Confirm',
      cancel: 'Cancel',
      renameCollection: 'Rename collection',
      addDocument: 'Add document',
      documentContentPlaceholder: 'Document content',
      metadataPlaceholder: 'Metadata JSON',
      addDocumentBtn: 'Add Document',
      query: 'Query',
      searchTextPlaceholder: 'Search text',
      topK: 'Top K',
      threshold: 'Threshold',
      filterJson: 'Filter (JSON)',
      filterPlaceholder: 'e.g. {"type":"doc"}',
      sort: 'Sort',
      pageSize: 'Page Size',
      search: 'Search',
      results: 'Results',
      noResults: 'No results found',
      metadata: 'Metadata',
      addFromFiles: 'Add from files',
      confirmDeleteTitle: 'Delete Collection?',
      confirmDeleteDesc: 'This will permanently delete the collection.',
      confirmClearTitle: 'Clear Collection?',
      confirmClearDesc: 'This will remove all documents.',
      confirmTruncateTitle: 'Truncate Collection?',
      confirmTruncateDesc: 'This will truncate the collection.',
      confirmDeleteDocsTitle: 'Delete All Documents?',
      confirmDeleteDocsDesc: 'This will remove all documents.',
      sortByScore: 'Sort by score',
      sortById: 'Sort by id',
      sortByMetadataSize: 'Sort by metadata size',
      showSummary: 'Show Summary',
      hideSummary: 'Hide Summary',
      toggleSummaryHint: 'Toggle metadata summary',
      showMetadata: 'Show metadata',
      hideMetadata: 'Hide metadata',
      peekBtn: 'Peek',
      total: 'total',
      prev: 'Previous',
      next: 'Next',
    };
    return translations[key] || key;
  },
}));

// Mock useVectorManager hook — the component now delegates all logic here
const mockHandleCreate = jest.fn();
const mockHandleRefresh = jest.fn();
const mockHandleRename = jest.fn();
const mockHandleExport = jest.fn();
const mockHandleImport = jest.fn();
const mockHandleAddDocument = jest.fn();
const mockHandleAddDocumentsFromModal = jest.fn();
const mockHandleSearchWithPagination = jest.fn();
const mockHandlePeek = jest.fn();
const mockHandleConfirmAction = jest.fn();
const mockSetCollectionName = jest.fn();
const mockSetNewCollection = jest.fn();
const mockSetNewDocContent = jest.fn();
const mockSetNewDocMeta = jest.fn();
const mockSetQuery = jest.fn();
const mockSetTopK = jest.fn();
const mockSetThreshold = jest.fn();
const mockSetFilterJson = jest.fn();
const mockSetSortOrder = jest.fn();
const mockSetSortField = jest.fn();
const mockSetPageSize = jest.fn();
const mockSetShowAddDocModal = jest.fn();
const mockSetShowRenameDialog = jest.fn();
const mockSetRenameNewName = jest.fn();
const mockSetActiveTab = jest.fn();
const mockSetExpanded = jest.fn();
const mockSetShowMetadataSummary = jest.fn();
const mockSetConfirmAction = jest.fn();
const mockFileInputRef = { current: null };

let mockHookState: Record<string, unknown> = {};

const getDefaultHookState = () => ({
  collectionName: 'default',
  setCollectionName: mockSetCollectionName,
  collections: [
    { name: 'collection1', documentCount: 5, dimension: 1536, embeddingModel: 'model1', embeddingProvider: 'provider1' },
    { name: 'collection2', documentCount: 3, dimension: 768 },
  ],
  newCollection: '',
  setNewCollection: mockSetNewCollection,
  stats: null,
  selectedCollectionInfo: null,
  newDocContent: '',
  setNewDocContent: mockSetNewDocContent,
  newDocMeta: '',
  setNewDocMeta: mockSetNewDocMeta,
  filterError: null,
  query: '',
  setQuery: mockSetQuery,
  topK: 5,
  setTopK: mockSetTopK,
  threshold: 0,
  setThreshold: mockSetThreshold,
  filterJson: '',
  setFilterJson: mockSetFilterJson,
  results: [],
  sortOrder: 'desc' as const,
  setSortOrder: mockSetSortOrder,
  sortField: 'score' as const,
  setSortField: mockSetSortField,
  totalResults: 0,
  totalPages: 0,
  currentPage: 1,
  pageSize: 10,
  setPageSize: mockSetPageSize,
  showAddDocModal: false,
  setShowAddDocModal: mockSetShowAddDocModal,
  showRenameDialog: false,
  setShowRenameDialog: mockSetShowRenameDialog,
  renameNewName: '',
  setRenameNewName: mockSetRenameNewName,
  activeTab: 'collections',
  setActiveTab: mockSetActiveTab,
  expanded: {},
  setExpanded: mockSetExpanded,
  showMetadataSummary: true,
  setShowMetadataSummary: mockSetShowMetadataSummary,
  confirmAction: null,
  setConfirmAction: mockSetConfirmAction,
  confirmLabels: {
    delete: { title: 'Delete Collection?', desc: 'This will permanently delete the collection.' },
    clear: { title: 'Clear Collection?', desc: 'This will remove all documents.' },
    truncate: { title: 'Truncate Collection?', desc: 'This will truncate the collection.' },
    deleteAllDocs: { title: 'Delete All Documents?', desc: 'This will remove all documents.' },
  },
  fileInputRef: mockFileInputRef,
  settings: { chunkSize: 1000, chunkOverlap: 200 },
  handleRefresh: mockHandleRefresh,
  handleCreate: mockHandleCreate,
  handleRename: mockHandleRename,
  handleExport: mockHandleExport,
  handleImport: mockHandleImport,
  handleAddDocument: mockHandleAddDocument,
  handleAddDocumentsFromModal: mockHandleAddDocumentsFromModal,
  handleSearchWithPagination: mockHandleSearchWithPagination,
  handlePeek: mockHandlePeek,
  handleConfirmAction: mockHandleConfirmAction,
});

jest.mock('@/hooks/vector/use-vector-manager', () => ({
  useVectorManager: () => mockHookState,
}));

// Mock AddDocumentModal
jest.mock('./add-document-modal', () => ({
  AddDocumentModal: ({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) => (
    open ? <div data-testid="add-document-modal"><button onClick={() => onOpenChange(false)}>Close</button></div> : null
  ),
}));

// Mock UI components
interface BaseProps {
  children?: React.ReactNode;
  [key: string]: unknown;
}

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, ...props }: BaseProps & { onClick?: () => void; disabled?: boolean }) => (
    <button onClick={onClick} disabled={disabled} {...props}>{children}</button>
  ),
}));

jest.mock('@/components/ui/input', () => ({
  Input: ({ value, onChange, placeholder, ...props }: BaseProps & { value?: string | number; onChange?: React.ChangeEventHandler<HTMLInputElement>; placeholder?: string }) => (
    <input value={value} onChange={onChange} placeholder={placeholder} {...props} />
  ),
}));

jest.mock('@/components/ui/label', () => ({
  Label: ({ children, ...props }: BaseProps) => <label {...props}>{children}</label>,
}));

jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children, ...props }: BaseProps) => <div {...props}>{children}</div>,
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, ...props }: BaseProps) => <span {...props}>{children}</span>,
}));

jest.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children, value }: BaseProps & { value?: string }) => <div data-testid="tabs" data-value={value}>{children}</div>,
  TabsList: ({ children }: BaseProps) => <div data-testid="tabs-list">{children}</div>,
  TabsTrigger: ({ children, value, ...props }: BaseProps & { value?: string }) => <button data-testid={`tab-${value}`} {...props}>{children}</button>,
  TabsContent: ({ children, value }: BaseProps & { value?: string }) => <div data-testid={`tab-content-${value}`}>{children}</div>,
}));

jest.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange }: { children: React.ReactNode; value?: string; onValueChange?: (v: string) => void }) => (
    <div data-testid="select">
      <select value={value} onChange={(e) => onValueChange?.(e.target.value)} data-testid="select-native" />
      {children}
    </div>
  ),
  SelectTrigger: ({ children }: BaseProps) => <div data-testid="select-trigger">{children}</div>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
  SelectContent: ({ children }: BaseProps) => <div data-testid="select-content">{children}</div>,
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <div data-testid={`select-item-${value}`} data-value={value}>{children}</div>
  ),
}));

jest.mock('@/components/ui/alert-dialog', () => ({
  AlertDialog: ({ children, open }: BaseProps & { open?: boolean }) => open ? <div data-testid="alert-dialog">{children}</div> : null,
  AlertDialogContent: ({ children }: BaseProps) => <div data-testid="alert-dialog-content">{children}</div>,
  AlertDialogHeader: ({ children }: BaseProps) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: BaseProps) => <div data-testid="alert-dialog-title">{children}</div>,
  AlertDialogDescription: ({ children }: BaseProps) => <div>{children}</div>,
  AlertDialogFooter: ({ children }: BaseProps) => <div>{children}</div>,
  AlertDialogAction: ({ children, onClick }: BaseProps & { onClick?: () => void }) => <button onClick={onClick}>{children}</button>,
  AlertDialogCancel: ({ children }: BaseProps) => <button>{children}</button>,
}));

jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: BaseProps & { open?: boolean }) => open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: BaseProps) => <div data-testid="dialog-content">{children}</div>,
  DialogHeader: ({ children }: BaseProps) => <div>{children}</div>,
  DialogTitle: ({ children }: BaseProps) => <div>{children}</div>,
  DialogDescription: ({ children }: BaseProps) => <div>{children}</div>,
  DialogFooter: ({ children }: BaseProps) => <div>{children}</div>,
}));

jest.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: BaseProps) => <div data-testid="dropdown-menu">{children}</div>,
  DropdownMenuTrigger: ({ children, asChild }: BaseProps & { asChild?: boolean }) => asChild ? <>{children}</> : <div>{children}</div>,
  DropdownMenuContent: ({ children }: BaseProps) => <div data-testid="dropdown-content">{children}</div>,
  DropdownMenuItem: ({ children, onClick, disabled }: BaseProps & { onClick?: () => void; disabled?: boolean }) => (
    <button onClick={onClick} disabled={disabled} data-testid="dropdown-item">{children}</button>
  ),
  DropdownMenuSeparator: () => <hr />,
}));

jest.mock('@/components/ui/textarea', () => ({
  Textarea: ({ value, onChange, placeholder, ...props }: BaseProps & { value?: string; onChange?: React.ChangeEventHandler<HTMLTextAreaElement>; placeholder?: string }) => (
    <textarea value={value} onChange={onChange} placeholder={placeholder} {...props} />
  ),
}));

jest.mock('@/components/settings/common/settings-section', () => ({
  SettingsCard: ({ children, title, description }: BaseProps & { title?: string; description?: string }) => (
    <div data-testid="settings-card">
      {title && <h3>{title}</h3>}
      {description && <p>{description}</p>}
      {children}
    </div>
  ),
}));

jest.mock('./section-header', () => ({
  SectionHeader: ({ title }: { title: string }) => <div data-testid="section-header">{title}</div>,
}));

describe('VectorManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHookState = getDefaultHookState();
  });

  it('renders the component with title and description', () => {
    render(<VectorManager />);
    expect(screen.getByText('Collections & Search')).toBeInTheDocument();
    expect(screen.getByText('Manage collections, clear data, and run vector searches.')).toBeInTheDocument();
  });

  it('renders all three tabs', () => {
    render(<VectorManager />);
    expect(screen.getByTestId('tab-collections')).toBeInTheDocument();
    expect(screen.getByTestId('tab-documents')).toBeInTheDocument();
    expect(screen.getByTestId('tab-search')).toBeInTheDocument();
  });

  it('displays collections in the select', () => {
    render(<VectorManager />);
    expect(screen.getByTestId('select-item-collection1')).toBeInTheDocument();
    expect(screen.getByTestId('select-item-collection2')).toBeInTheDocument();
  });

  it('renders collection info when available', () => {
    mockHookState = {
      ...getDefaultHookState(),
      selectedCollectionInfo: {
        name: 'test-col',
        documentCount: 42,
        dimension: 1536,
        embeddingModel: 'text-embedding-3',
        embeddingProvider: 'openai',
      },
    };

    render(<VectorManager />);
    expect(screen.getByText('test-col')).toBeInTheDocument();
    expect(screen.getByText(/42/)).toBeInTheDocument();
  });

  it('renders stats when available', () => {
    mockHookState = {
      ...getDefaultHookState(),
      stats: { collectionCount: 3, totalPoints: 150, storageSizeBytes: 2048 },
    };

    render(<VectorManager />);
    expect(screen.getByText(/Collections: 3/)).toBeInTheDocument();
    expect(screen.getByText(/Total Points: 150/)).toBeInTheDocument();
  });

  it('calls handleRefresh when refresh button is clicked', async () => {
    const user = userEvent.setup();
    render(<VectorManager />);

    const refreshButton = screen.getByText('Refresh');
    await user.click(refreshButton);

    expect(mockHandleRefresh).toHaveBeenCalled();
  });

  it('calls handleCreate when create button is clicked', async () => {
    const user = userEvent.setup();
    mockHookState = { ...getDefaultHookState(), newCollection: 'new-col' };

    render(<VectorManager />);

    const createButton = screen.getByText('Create');
    await user.click(createButton);

    expect(mockHandleCreate).toHaveBeenCalled();
  });

  it('disables create button when newCollection is empty', () => {
    mockHookState = { ...getDefaultHookState(), newCollection: '' };
    render(<VectorManager />);

    const createButton = screen.getByText('Create');
    expect(createButton).toBeDisabled();
  });

  it('calls handleExport when export button is clicked', async () => {
    const user = userEvent.setup();
    render(<VectorManager />);

    const exportButton = screen.getByText('Export');
    await user.click(exportButton);

    expect(mockHandleExport).toHaveBeenCalled();
  });

  it('renders action dropdown with dangerous actions', () => {
    render(<VectorManager />);
    expect(screen.getByText('Clear collection')).toBeInTheDocument();
    expect(screen.getByText('Truncate')).toBeInTheDocument();
    expect(screen.getByText('Delete all docs')).toBeInTheDocument();
    expect(screen.getByText('Delete collection')).toBeInTheDocument();
  });

  it('calls setConfirmAction when dropdown items are clicked', async () => {
    const user = userEvent.setup();
    render(<VectorManager />);

    const clearButton = screen.getByText('Clear collection');
    await user.click(clearButton);
    expect(mockSetConfirmAction).toHaveBeenCalledWith('clear');
  });

  it('renders confirm dialog when confirmAction is set', () => {
    mockHookState = { ...getDefaultHookState(), confirmAction: 'delete' };
    render(<VectorManager />);

    expect(screen.getByTestId('alert-dialog')).toBeInTheDocument();
    expect(screen.getByText('Delete Collection?')).toBeInTheDocument();
  });

  it('calls handleConfirmAction on confirm dialog confirm click', async () => {
    const user = userEvent.setup();
    mockHookState = { ...getDefaultHookState(), confirmAction: 'delete' };

    render(<VectorManager />);

    const confirmButton = screen.getByText('Confirm');
    await user.click(confirmButton);

    expect(mockHandleConfirmAction).toHaveBeenCalled();
  });

  it('renders rename dialog when showRenameDialog is true', () => {
    mockHookState = {
      ...getDefaultHookState(),
      showRenameDialog: true,
      renameNewName: 'old-name',
    };

    render(<VectorManager />);
    expect(screen.getByTestId('dialog')).toBeInTheDocument();
    // 'Rename collection' text appears in both the button and dialog title
    const renameTexts = screen.getAllByText('Rename collection');
    expect(renameTexts.length).toBeGreaterThanOrEqual(2);
  });

  it('renders document tab content with textarea and add button', () => {
    render(<VectorManager />);
    expect(screen.getByTestId('tab-content-documents')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Document content')).toBeInTheDocument();
  });

  it('disables add document button when content is empty', () => {
    mockHookState = { ...getDefaultHookState(), newDocContent: '' };
    render(<VectorManager />);

    const addButton = screen.getByText('Add Document');
    expect(addButton).toBeDisabled();
  });

  it('enables add document button when content is present', () => {
    mockHookState = { ...getDefaultHookState(), newDocContent: 'Some content' };
    render(<VectorManager />);

    const addButton = screen.getByText('Add Document');
    expect(addButton).not.toBeDisabled();
  });

  it('calls handleAddDocument on add button click', async () => {
    const user = userEvent.setup();
    mockHookState = { ...getDefaultHookState(), newDocContent: 'Content' };
    render(<VectorManager />);

    const addButton = screen.getByText('Add Document');
    await user.click(addButton);

    expect(mockHandleAddDocument).toHaveBeenCalled();
  });

  it('displays filterError when present', () => {
    mockHookState = { ...getDefaultHookState(), filterError: 'Invalid JSON' };
    render(<VectorManager />);

    const errors = screen.getAllByText('Invalid JSON');
    expect(errors.length).toBeGreaterThan(0);
  });

  it('renders search tab with search input and buttons', () => {
    render(<VectorManager />);
    expect(screen.getByTestId('tab-content-search')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search text')).toBeInTheDocument();
    expect(screen.getByText('Search')).toBeInTheDocument();
    expect(screen.getByText('Peek')).toBeInTheDocument();
  });

  it('calls handleSearchWithPagination when search button is clicked', async () => {
    const user = userEvent.setup();
    render(<VectorManager />);

    const searchButton = screen.getByText('Search');
    await user.click(searchButton);

    expect(mockHandleSearchWithPagination).toHaveBeenCalledWith(1);
  });

  it('calls handlePeek when peek button is clicked', async () => {
    const user = userEvent.setup();
    render(<VectorManager />);

    const peekButton = screen.getByText('Peek');
    await user.click(peekButton);

    expect(mockHandlePeek).toHaveBeenCalled();
  });

  it('displays "No results found" when results are empty', () => {
    mockHookState = { ...getDefaultHookState(), results: [] };
    render(<VectorManager />);
    expect(screen.getByText('No results found')).toBeInTheDocument();
  });

  it('displays search results when available', () => {
    mockHookState = {
      ...getDefaultHookState(),
      results: [
        { id: 'r1', content: 'Result content 1', score: 0.95, metadata: { type: 'doc' } },
        { id: 'r2', content: 'Result content 2', score: 0.8 },
      ],
      totalResults: 2,
    };

    render(<VectorManager />);
    expect(screen.getByText('Result content 1')).toBeInTheDocument();
    expect(screen.getByText('Result content 2')).toBeInTheDocument();
    expect(screen.getByText('0.9500')).toBeInTheDocument();
  });

  it('renders pagination when totalPages > 1', () => {
    mockHookState = {
      ...getDefaultHookState(),
      results: [{ id: '1', content: 'x', score: 1.0 }],
      totalResults: 25,
      totalPages: 3,
      currentPage: 2,
    };

    render(<VectorManager />);
    expect(screen.getByText('Previous')).toBeInTheDocument();
    expect(screen.getByText('Next')).toBeInTheDocument();
  });

  it('calls handleSearchWithPagination for pagination clicks', async () => {
    const user = userEvent.setup();
    mockHookState = {
      ...getDefaultHookState(),
      results: [{ id: '1', content: 'x', score: 1.0 }],
      totalResults: 25,
      totalPages: 3,
      currentPage: 2,
    };

    render(<VectorManager />);

    await user.click(screen.getByText('Next'));
    expect(mockHandleSearchWithPagination).toHaveBeenCalledWith(3);

    await user.click(screen.getByText('Previous'));
    expect(mockHandleSearchWithPagination).toHaveBeenCalledWith(1);
  });

  it('toggles metadata summary display', async () => {
    const user = userEvent.setup();
    mockHookState = {
      ...getDefaultHookState(),
      showMetadataSummary: true,
    };

    render(<VectorManager />);

    const toggleButton = screen.getByText('Hide Summary');
    await user.click(toggleButton);

    expect(mockSetShowMetadataSummary).toHaveBeenCalled();
  });

  it('opens add document modal when add from files is clicked', async () => {
    const user = userEvent.setup();
    render(<VectorManager />);

    const addFromFilesButton = screen.getAllByText('Add from files')[0];
    await user.click(addFromFilesButton);

    expect(mockSetShowAddDocModal).toHaveBeenCalledWith(true);
  });

  it('renders AddDocumentModal when showAddDocModal is true', () => {
    mockHookState = { ...getDefaultHookState(), showAddDocModal: true };
    render(<VectorManager />);
    expect(screen.getByTestId('add-document-modal')).toBeInTheDocument();
  });

  it('renders section headers in document and search tabs', () => {
    render(<VectorManager />);
    const sectionHeaders = screen.getAllByTestId('section-header');
    expect(sectionHeaders.length).toBeGreaterThanOrEqual(2); // Documents + Search
  });
});
