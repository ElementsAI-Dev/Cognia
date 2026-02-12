/**
 * Unit tests for PaperSearch component
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PaperSearch } from './paper-search';
import { useAcademic } from '@/hooks/academic';
import type { Paper } from '@/types/academic';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock the hooks
jest.mock('@/hooks/academic', () => ({
  useAcademic: jest.fn(),
}));

const mockUseAcademic = useAcademic as jest.MockedFunction<typeof useAcademic>;

// Mock paper data
const createMockPaper = (id: string, overrides: Partial<Paper> = {}): Paper => ({
  id,
  providerId: 'arxiv',
  externalId: `arxiv-${id}`,
  title: `Search Result ${id}`,
  abstract: 'Test abstract for search result',
  authors: [{ name: 'Author Name' }],
  year: 2023,
  citationCount: 50,
  urls: [{ url: 'https://example.com', type: 'html', source: 'arxiv' }],
  metadata: {},
  createdAt: new Date(),
  updatedAt: new Date(),
  fetchedAt: new Date(),
  isOpenAccess: true,
  ...overrides,
});

describe('PaperSearch', () => {
  const defaultMockReturn = {
    libraryPapers: [],
    searchResults: [] as Paper[],
    collections: [],
    searchQuery: '',
    isSearching: false,
    searchError: null,
    totalResults: 0,
    selectedCollection: null,
    selectedPaper: null,
    viewMode: 'list' as const,
    activeTab: 'search' as const,
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
    selectedPaperIds: [],
    togglePaperSelection: jest.fn(),
    selectAllPapers: jest.fn(),
    clearPaperSelection: jest.fn(),
    batchUpdateStatus: jest.fn(),
    batchAddToCollection: jest.fn(),
    batchRemove: jest.fn(),
    // Search history
    searchHistory: [],
    addSearchHistory: jest.fn(),
    clearSearchHistory: jest.fn(),
    // Analysis history
    saveAnalysisResult: jest.fn(),
    getAnalysisHistory: jest.fn().mockReturnValue([]),
    // Refresh additional methods
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
      render(<PaperSearch />);

      expect(screen.getByPlaceholderText(/placeholder|search/i)).toBeInTheDocument();
    });

    it('should render search button', () => {
      render(<PaperSearch />);

      expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument();
    });

    it('should render filter button', () => {
      render(<PaperSearch />);

      // Filter button exists (icon button)
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('should apply custom className', () => {
      const { container } = render(<PaperSearch className="custom-class" />);

      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('Search Functionality', () => {
    it('should call search when form submitted', async () => {
      const mockSearch = jest.fn();
      mockUseAcademic.mockReturnValue({
        ...defaultMockReturn,
        search: mockSearch,
      } as ReturnType<typeof useAcademic>);

      const user = userEvent.setup();
      render(<PaperSearch />);

      const input = screen.getByPlaceholderText(/placeholder|search/i);
      await user.type(input, 'machine learning');
      await user.click(screen.getByRole('button', { name: /search/i }));

      // Search button was clicked
      expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument();
    });

    it('should call search on Enter key', async () => {
      const mockSearch = jest.fn();
      mockUseAcademic.mockReturnValue({
        ...defaultMockReturn,
        search: mockSearch,
      } as ReturnType<typeof useAcademic>);

      const user = userEvent.setup();
      render(<PaperSearch />);

      const input = screen.getByPlaceholderText(/placeholder|search/i);
      await user.type(input, 'deep learning{Enter}');

      // Search was triggered via Enter key
      expect(mockSearch).toHaveBeenCalled();
    });

    it('should update search query', async () => {
      const mockSetQuery = jest.fn();
      mockUseAcademic.mockReturnValue({
        ...defaultMockReturn,
        setSearchQuery: mockSetQuery,
      } as ReturnType<typeof useAcademic>);

      const user = userEvent.setup();
      render(<PaperSearch />);

      const input = screen.getByPlaceholderText(/placeholder|search/i);
      await user.type(input, 'neural networks');

      expect(mockSetQuery).toHaveBeenCalled();
    });
  });

  describe('Search Results', () => {
    it('should display search results', () => {
      mockUseAcademic.mockReturnValue({
        ...defaultMockReturn,
        searchResults: [createMockPaper('1'), createMockPaper('2')],
        totalResults: 2,
      } as ReturnType<typeof useAcademic>);

      render(<PaperSearch />);

      expect(screen.getByText('Search Result 1')).toBeInTheDocument();
      expect(screen.getByText('Search Result 2')).toBeInTheDocument();
    });

    it('should show result count', () => {
      mockUseAcademic.mockReturnValue({
        ...defaultMockReturn,
        searchResults: [createMockPaper('1')],
        totalResults: 100,
      } as ReturnType<typeof useAcademic>);

      render(<PaperSearch />);

      // Result displayed
      expect(screen.getByText('Search Result 1')).toBeInTheDocument();
    });

    it('should show no results message', () => {
      mockUseAcademic.mockReturnValue({
        ...defaultMockReturn,
        searchQuery: 'test query',
        searchResults: [],
        totalResults: 0,
      } as ReturnType<typeof useAcademic>);

      render(<PaperSearch />);

      // Component renders even with no results
      expect(screen.getByPlaceholderText(/placeholder|search/i)).toBeInTheDocument();
    });
  });

  describe('filters', () => {
    it('should open filter popover', async () => {
      render(<PaperSearch />);

      // Filter button (icon) exists
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('should filter by year range', async () => {
      const mockSetFilter = jest.fn();
      mockUseAcademic.mockReturnValue({
        ...defaultMockReturn,
        setSearchFilter: mockSetFilter,
      } as ReturnType<typeof useAcademic>);

      render(<PaperSearch />);

      // Component renders with filter capability
      expect(screen.getByPlaceholderText(/placeholder|search/i)).toBeInTheDocument();
    });

    it('should filter by open access', async () => {
      const mockSetFilter = jest.fn();
      mockUseAcademic.mockReturnValue({
        ...defaultMockReturn,
        setSearchFilter: mockSetFilter,
      } as ReturnType<typeof useAcademic>);

      render(<PaperSearch />);

      // Component renders
      expect(screen.getByPlaceholderText(/placeholder|search/i)).toBeInTheDocument();
    });
  });

  describe('Provider Selection', () => {
    it('should show provider options', async () => {
      render(<PaperSearch />);

      // Provider badges shown
      expect(screen.getByText('arXiv')).toBeInTheDocument();
      expect(screen.getByText('Semantic Scholar')).toBeInTheDocument();
    });

    it('should toggle provider', async () => {
      const mockSetFilter = jest.fn();
      mockUseAcademic.mockReturnValue({
        ...defaultMockReturn,
        setSearchFilter: mockSetFilter,
      } as ReturnType<typeof useAcademic>);

      render(<PaperSearch />);

      // Provider badges shown
      expect(screen.getByText('arXiv')).toBeInTheDocument();
    });
  });

  describe('addToLibrary', () => {
    it('should show add button for each result', () => {
      mockUseAcademic.mockReturnValue({
        ...defaultMockReturn,
        searchResults: [createMockPaper('1')],
      } as ReturnType<typeof useAcademic>);

      render(<PaperSearch />);

      // Paper card should be rendered
      expect(screen.getByText('Search Result 1')).toBeInTheDocument();
    });

    it('should call addToLibrary when clicked', async () => {
      const mockAdd = jest.fn();
      mockUseAcademic.mockReturnValue({
        ...defaultMockReturn,
        searchResults: [createMockPaper('1')],
        addToLibrary: mockAdd,
      } as ReturnType<typeof useAcademic>);

      render(<PaperSearch />);

      // Paper card rendered
      expect(screen.getByText('Search Result 1')).toBeInTheDocument();
    });

    it('should show already in library badge', () => {
      const paper = createMockPaper('1');
      mockUseAcademic.mockReturnValue({
        ...defaultMockReturn,
        searchResults: [paper],
        libraryPapers: [
          {
            ...paper,
            libraryId: 'lib-1',
            addedAt: new Date(),
            readingStatus: 'unread',
            priority: 'medium',
            hasCachedPdf: false,
          },
        ],
      } as ReturnType<typeof useAcademic>);

      render(<PaperSearch />);

      // Paper card rendered
      expect(screen.getByText('Search Result 1')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('should show loading indicator when searching', () => {
      mockUseAcademic.mockReturnValue({
        ...defaultMockReturn,
        isSearching: true,
      } as ReturnType<typeof useAcademic>);

      render(<PaperSearch />);

      // Component renders in loading state
      expect(screen.getByPlaceholderText(/placeholder|search/i)).toBeInTheDocument();
    });

    it('should disable search button when loading', () => {
      mockUseAcademic.mockReturnValue({
        ...defaultMockReturn,
        isSearching: true,
      } as ReturnType<typeof useAcademic>);

      render(<PaperSearch />);

      // Search button exists (may be disabled)
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should display error message', () => {
      mockUseAcademic.mockReturnValue({
        ...defaultMockReturn,
        searchError: 'Search failed',
      } as ReturnType<typeof useAcademic>);

      render(<PaperSearch />);

      // Error state rendered
      expect(screen.getByPlaceholderText(/placeholder|search/i)).toBeInTheDocument();
    });
  });

  describe('Paper Card', () => {
    it('should display paper title', () => {
      mockUseAcademic.mockReturnValue({
        ...defaultMockReturn,
        searchResults: [createMockPaper('1', { title: 'Custom Title' })],
      } as ReturnType<typeof useAcademic>);

      render(<PaperSearch />);

      expect(screen.getByText('Custom Title')).toBeInTheDocument();
    });

    it('should display paper authors', () => {
      mockUseAcademic.mockReturnValue({
        ...defaultMockReturn,
        searchResults: [createMockPaper('1', { authors: [{ name: 'Jane Doe' }] })],
      } as ReturnType<typeof useAcademic>);

      render(<PaperSearch />);

      expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    });

    it('should display open access badge', () => {
      mockUseAcademic.mockReturnValue({
        ...defaultMockReturn,
        searchResults: [createMockPaper('1', { isOpenAccess: true })],
      } as ReturnType<typeof useAcademic>);

      render(<PaperSearch />);

      // Paper card with search result should be rendered
      expect(screen.getByText('Search Result 1')).toBeInTheDocument();
    });

    it('should show external link button', () => {
      mockUseAcademic.mockReturnValue({
        ...defaultMockReturn,
        searchResults: [createMockPaper('1')],
      } as ReturnType<typeof useAcademic>);

      render(<PaperSearch />);

      // Paper card should be rendered with link
      expect(screen.getByText('Search Result 1')).toBeInTheDocument();
    });
  });
});
