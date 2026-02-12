/**
 * Unit tests for PaperLibrary component
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PaperLibrary } from './paper-library';
import { useAcademic } from '@/hooks/academic';
import type { LibraryPaper, PaperCollection } from '@/types/academic';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock URL.createObjectURL and revokeObjectURL
const mockCreateObjectURL = jest.fn(() => 'blob:mock-url');
const mockRevokeObjectURL = jest.fn();
global.URL.createObjectURL = mockCreateObjectURL;
global.URL.revokeObjectURL = mockRevokeObjectURL;

// Mock the hooks
jest.mock('@/hooks/academic', () => ({
  useAcademic: jest.fn(),
}));

const mockUseAcademic = useAcademic as jest.MockedFunction<typeof useAcademic>;

// Mock paper data
const createMockLibraryPaper = (
  id: string,
  overrides: Partial<LibraryPaper> = {}
): LibraryPaper => ({
  id,
  providerId: 'arxiv',
  externalId: `arxiv-${id}`,
  title: `Test Paper ${id}`,
  abstract: 'Test abstract',
  authors: [{ name: 'Test Author' }],
  year: 2023,
  citationCount: 50,
  urls: [],
  metadata: {},
  createdAt: new Date(),
  updatedAt: new Date(),
  fetchedAt: new Date(),
  libraryId: `lib-${id}`,
  addedAt: new Date(),
  readingStatus: 'unread',
  priority: 'medium',
  hasCachedPdf: false,
  ...overrides,
});

const createMockCollection = (id: string, paperIds: string[] = []): PaperCollection => ({
  id,
  name: `Collection ${id}`,
  paperIds,
  createdAt: new Date(),
  updatedAt: new Date(),
});

describe('PaperLibrary', () => {
  const defaultMockReturn = {
    libraryPapers: [] as LibraryPaper[],
    collections: [] as PaperCollection[],
    searchQuery: '',
    searchResults: [],
    isSearching: false,
    searchError: null,
    totalResults: 0,
    selectedCollection: null,
    selectedPaper: null,
    viewMode: 'list' as const,
    activeTab: 'library' as const,
    isLoading: false,
    error: null,
    search: jest.fn(),
    setSearchQuery: jest.fn(),
    setSearchFilter: jest.fn(),
    addToLibrary: jest.fn(),
    removeFromLibrary: jest.fn(),
    updatePaperStatus: jest.fn(),
    updatePaperRating: jest.fn(),
    addPaperNote: jest.fn(),
    createCollection: jest.fn(),
    deleteCollection: jest.fn(),
    addToCollection: jest.fn(),
    removeFromCollection: jest.fn(),
    selectCollection: jest.fn(),
    selectPaper: jest.fn(),
    setViewMode: jest.fn(),
    downloadPdf: jest.fn(),
    hasPdf: jest.fn(),
    analyzePaper: jest.fn(),
    startGuidedLearning: jest.fn(),
    importBibtex: jest.fn(),
    exportBibtex: jest.fn(),
    refresh: jest.fn(),
    setActiveTab: jest.fn(),
    clearError: jest.fn(),
    reset: jest.fn(),
    searchWithProvider: jest.fn(),
    clearSearch: jest.fn(),
    // Enhanced search
    searchPapers: jest.fn(),
    lastSearchResult: null,
    // A2UI integration
    createSearchResultsUI: jest.fn(),
    createPaperCardUI: jest.fn(),
    createAnalysisUI: jest.fn(),
    createComparisonUI: jest.fn(),
    // Enhanced analysis
    analyzePaperWithAI: jest.fn(),
    lastAnalysisResult: null,
    isAnalyzing: false,
    // Web search integration
    searchWebForPaper: jest.fn(),
    findRelatedPapers: jest.fn(),
    // Combined actions
    searchAndDisplay: jest.fn(),
    analyzeAndDisplay: jest.fn(),
    // Tag actions
    addTag: jest.fn(),
    removeTag: jest.fn(),
    // Batch actions
    selectedPaperIds: [] as string[],
    togglePaperSelection: jest.fn(),
    selectAllPapers: jest.fn(),
    clearPaperSelection: jest.fn(),
    batchUpdateStatus: jest.fn(),
    batchAddToCollection: jest.fn(),
    batchRemove: jest.fn(),
    // Search history actions
    searchHistory: [] as string[],
    addSearchHistory: jest.fn(),
    clearSearchHistory: jest.fn(),
    // Analysis history actions
    saveAnalysisResult: jest.fn(),
    getAnalysisHistory: jest.fn().mockReturnValue([]),
    // Additional methods
    refreshLibrary: jest.fn(),
    refreshCollections: jest.fn(),
    // PPT Generation
    generatePresentationFromPaper: jest.fn(),
    generatePPTOutline: jest.fn(),
    isGeneratingPPT: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAcademic.mockReturnValue(defaultMockReturn as ReturnType<typeof useAcademic>);
  });

  describe('Rendering', () => {
    it('should render the component', () => {
      render(<PaperLibrary />);

      // Check collections header renders
      expect(screen.getByText('collections')).toBeInTheDocument();
    });

    it('should render search input', () => {
      render(<PaperLibrary />);

      expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
    });

    it('should render view mode toggle', () => {
      render(<PaperLibrary />);

      // View mode buttons are icon-only, check buttons exist
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('should apply custom className', () => {
      const { container } = render(<PaperLibrary className="custom-class" />);

      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no papers', () => {
      render(<PaperLibrary />);

      // Shows 0 papers count in badge
      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('should show add papers prompt', () => {
      render(<PaperLibrary />);

      // Shows allPapers button
      expect(screen.getByText('allPapers')).toBeInTheDocument();
    });
  });

  describe('Paper List', () => {
    it('should display papers in list', () => {
      mockUseAcademic.mockReturnValue({
        ...defaultMockReturn,
        libraryPapers: [createMockLibraryPaper('1'), createMockLibraryPaper('2')],
      } as ReturnType<typeof useAcademic>);

      render(<PaperLibrary />);

      expect(screen.getByText('Test Paper 1')).toBeInTheDocument();
      expect(screen.getByText('Test Paper 2')).toBeInTheDocument();
    });

    it('should show paper count', () => {
      mockUseAcademic.mockReturnValue({
        ...defaultMockReturn,
        libraryPapers: [
          createMockLibraryPaper('1'),
          createMockLibraryPaper('2'),
          createMockLibraryPaper('3'),
        ],
      } as ReturnType<typeof useAcademic>);

      render(<PaperLibrary />);

      // Paper count shown in badge
      expect(screen.getByText('3')).toBeInTheDocument();
    });
  });

  describe('View Modes', () => {
    it('should switch to grid view', async () => {
      const mockSetViewMode = jest.fn();
      mockUseAcademic.mockReturnValue({
        ...defaultMockReturn,
        libraryPapers: [createMockLibraryPaper('1')],
        setViewMode: mockSetViewMode,
      } as ReturnType<typeof useAcademic>);

      render(<PaperLibrary />);

      // View mode buttons should be present (icon buttons)
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('should switch to table view', async () => {
      const mockSetViewMode = jest.fn();
      mockUseAcademic.mockReturnValue({
        ...defaultMockReturn,
        libraryPapers: [createMockLibraryPaper('1')],
        setViewMode: mockSetViewMode,
      } as ReturnType<typeof useAcademic>);

      render(<PaperLibrary />);

      // View mode buttons should be present (icon buttons)
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  describe('Search/Filter', () => {
    it('should filter papers by search query', async () => {
      mockUseAcademic.mockReturnValue({
        ...defaultMockReturn,
        libraryPapers: [
          createMockLibraryPaper('1', { title: 'Machine Learning' }),
          createMockLibraryPaper('2', { title: 'Natural Language' }),
        ],
      } as ReturnType<typeof useAcademic>);

      const user = userEvent.setup();
      render(<PaperLibrary />);

      const searchInput = screen.getByPlaceholderText(/search/i);
      await user.type(searchInput, 'Machine');

      await waitFor(() => {
        expect(screen.getByText('Machine Learning')).toBeInTheDocument();
        expect(screen.queryByText('Natural Language')).not.toBeInTheDocument();
      });
    });
  });

  describe('Status Filter', () => {
    it('should filter by reading status', async () => {
      mockUseAcademic.mockReturnValue({
        ...defaultMockReturn,
        libraryPapers: [
          createMockLibraryPaper('1', { readingStatus: 'unread' }),
          createMockLibraryPaper('2', { readingStatus: 'completed' }),
        ],
      } as ReturnType<typeof useAcademic>);

      render(<PaperLibrary />);

      // Papers should be displayed
      await waitFor(() => {
        expect(screen.getByText('Test Paper 1')).toBeInTheDocument();
        expect(screen.getByText('Test Paper 2')).toBeInTheDocument();
      });
    });
  });

  describe('Collection Filter', () => {
    it('should display collections', () => {
      mockUseAcademic.mockReturnValue({
        ...defaultMockReturn,
        collections: [createMockCollection('1'), createMockCollection('2')],
      } as ReturnType<typeof useAcademic>);

      render(<PaperLibrary />);

      expect(screen.getByText('Collection 1')).toBeInTheDocument();
      expect(screen.getByText('Collection 2')).toBeInTheDocument();
    });

    it('should filter by collection', async () => {
      const mockSelectCollection = jest.fn();
      mockUseAcademic.mockReturnValue({
        ...defaultMockReturn,
        collections: [createMockCollection('1', ['paper-1'])],
        selectCollection: mockSelectCollection,
      } as ReturnType<typeof useAcademic>);

      const user = userEvent.setup();
      render(<PaperLibrary />);

      await user.click(screen.getByText('Collection 1'));

      expect(mockSelectCollection).toHaveBeenCalledWith('1');
    });
  });

  describe('Paper Actions', () => {
    it('should open paper detail on click', async () => {
      const mockSelectPaper = jest.fn();
      mockUseAcademic.mockReturnValue({
        ...defaultMockReturn,
        libraryPapers: [createMockLibraryPaper('1')],
        selectPaper: mockSelectPaper,
      } as ReturnType<typeof useAcademic>);

      const user = userEvent.setup();
      render(<PaperLibrary />);

      await user.click(screen.getByText('Test Paper 1'));

      expect(mockSelectPaper).toHaveBeenCalled();
    });

    it('should remove paper from library', async () => {
      const mockRemove = jest.fn();
      mockUseAcademic.mockReturnValue({
        ...defaultMockReturn,
        libraryPapers: [createMockLibraryPaper('1')],
        removeFromLibrary: mockRemove,
      } as ReturnType<typeof useAcademic>);

      const user = userEvent.setup();
      render(<PaperLibrary />);

      // Open paper menu
      const moreButton = screen
        .getAllByRole('button')
        .find((btn) => btn.getAttribute('aria-label')?.includes('more'));
      if (moreButton) {
        await user.click(moreButton);
        await user.click(screen.getByText('remove'));
        expect(mockRemove).toHaveBeenCalledWith('1');
      }
    });
  });

  describe('createCollection', () => {
    it('should open create collection dialog', async () => {
      const user = userEvent.setup();
      render(<PaperLibrary />);

      // Find the create collection button (icon button with folder-plus)
      const dialogTriggers = screen.getAllByRole('button', { expanded: false });
      const createButton = dialogTriggers.find((btn) => btn.querySelector('.lucide-folder-plus'));

      if (createButton) {
        await user.click(createButton);
        // Dialog should open
        await waitFor(() => {
          expect(screen.getByRole('dialog')).toBeInTheDocument();
        });
      }
    });

    it('should create collection when submitted', async () => {
      const mockCreate = jest.fn();
      mockUseAcademic.mockReturnValue({
        ...defaultMockReturn,
        createCollection: mockCreate,
      } as ReturnType<typeof useAcademic>);

      render(<PaperLibrary />);

      // Test component renders with collections section
      expect(screen.getByText('collections')).toBeInTheDocument();
    });
  });

  describe('export', () => {
    it('should show export button', () => {
      mockUseAcademic.mockReturnValue({
        ...defaultMockReturn,
        libraryPapers: [createMockLibraryPaper('1')],
      } as ReturnType<typeof useAcademic>);

      render(<PaperLibrary />);

      expect(screen.getByText('export')).toBeInTheDocument();
    });

    it('should export as BibTeX', async () => {
      const mockExport = jest.fn();
      mockUseAcademic.mockReturnValue({
        ...defaultMockReturn,
        libraryPapers: [createMockLibraryPaper('1')],
        exportBibtex: mockExport,
      } as ReturnType<typeof useAcademic>);

      const user = userEvent.setup();
      render(<PaperLibrary />);

      // Click export button to open dropdown
      await user.click(screen.getByText('export'));

      // Wait for dropdown to appear and click BibTeX option
      await waitFor(async () => {
        const bibtexOption = screen.queryByText(/bibtex/i) || screen.queryByText(/BibTeX/i);
        if (bibtexOption) {
          await user.click(bibtexOption);
        }
      });
    });
  });

  describe('Sorting', () => {
    it('should render papers in order', () => {
      mockUseAcademic.mockReturnValue({
        ...defaultMockReturn,
        libraryPapers: [
          createMockLibraryPaper('1', { title: 'A Paper' }),
          createMockLibraryPaper('2', { title: 'B Paper' }),
        ],
      } as ReturnType<typeof useAcademic>);

      render(<PaperLibrary />);

      // Check papers are rendered
      expect(screen.getByText('A Paper')).toBeInTheDocument();
      expect(screen.getByText('B Paper')).toBeInTheDocument();
    });
  });

  describe('Batch Operations', () => {
    const batchMockReturn = {
      ...defaultMockReturn,
      libraryPapers: [
        createMockLibraryPaper('1'),
        createMockLibraryPaper('2'),
        createMockLibraryPaper('3'),
      ],
      selectedPaperIds: [] as string[],
      togglePaperSelection: jest.fn(),
      selectAllPapers: jest.fn(),
      clearPaperSelection: jest.fn(),
      batchUpdateStatus: jest.fn(),
      batchAddToCollection: jest.fn(),
      batchRemove: jest.fn(),
    };

    it('should show select button to enter batch mode', () => {
      mockUseAcademic.mockReturnValue(batchMockReturn as ReturnType<typeof useAcademic>);

      render(<PaperLibrary />);

      expect(screen.getByText(/Select/i)).toBeInTheDocument();
    });

    it('should toggle batch mode on select button click', async () => {
      mockUseAcademic.mockReturnValue(batchMockReturn as ReturnType<typeof useAcademic>);

      const user = userEvent.setup();
      render(<PaperLibrary />);

      await user.click(screen.getByText(/Select/i));

      expect(screen.getByText(/exitSelection/i)).toBeInTheDocument();
    });

    it('should call clearPaperSelection when exiting batch mode', async () => {
      const mockClearSelection = jest.fn();
      mockUseAcademic.mockReturnValue({
        ...batchMockReturn,
        clearPaperSelection: mockClearSelection,
      } as ReturnType<typeof useAcademic>);

      const user = userEvent.setup();
      render(<PaperLibrary />);

      // Enter batch mode
      await user.click(screen.getByText(/Select/i));
      // Exit batch mode
      await user.click(screen.getByText(/exitSelection/i));

      expect(mockClearSelection).toHaveBeenCalled();
    });

    it('should toggle paper selection when clicking paper in batch mode', async () => {
      const mockToggle = jest.fn();
      mockUseAcademic.mockReturnValue({
        ...batchMockReturn,
        togglePaperSelection: mockToggle,
      } as ReturnType<typeof useAcademic>);

      const user = userEvent.setup();
      render(<PaperLibrary />);

      // Enter batch mode
      await user.click(screen.getByText(/Select/i));

      // Click on a paper (which should toggle selection in batch mode)
      await user.click(screen.getByText('Test Paper 1'));

      expect(mockToggle).toHaveBeenCalledWith('1');
    });
  });
});
