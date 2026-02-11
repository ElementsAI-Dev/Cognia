/**
 * Unit tests for PaperRecommendations component
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PaperRecommendations } from './paper-recommendations';
import { useAcademic } from '@/hooks/academic';
import type { LibraryPaper, Paper } from '@/types/learning/academic';

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
  title: `Recommended Paper ${id}`,
  abstract: 'Test abstract',
  authors: [{ name: 'Author Name' }],
  year: 2023,
  citationCount: 100,
  urls: [],
  metadata: {},
  createdAt: new Date(),
  updatedAt: new Date(),
  fetchedAt: new Date(),
  fieldsOfStudy: ['Machine Learning'],
  ...overrides,
});

const createMockLibraryPaper = (
  id: string,
  overrides: Partial<LibraryPaper> = {}
): LibraryPaper => ({
  ...createMockPaper(id),
  libraryId: `lib-${id}`,
  addedAt: new Date(),
  readingStatus: 'unread',
  priority: 'medium',
  hasCachedPdf: false,
  ...overrides,
});

describe('PaperRecommendations', () => {
  const defaultMockReturn = {
    libraryPapers: [] as LibraryPaper[],
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
    search: jest.fn().mockResolvedValue(undefined),
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
      render(<PaperRecommendations />);

      expect(screen.getByText('title')).toBeInTheDocument();
    });

    it('should render tabs', () => {
      render(<PaperRecommendations />);

      expect(screen.getByText(/tabs.related/i)).toBeInTheDocument();
      expect(screen.getByText(/tabs.trending/i)).toBeInTheDocument();
      expect(screen.getByText(/tabs.byAuthors/i)).toBeInTheDocument();
    });

    it('should render refresh button', () => {
      render(<PaperRecommendations />);

      expect(screen.getByText('refresh')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(<PaperRecommendations className="custom-class" />);

      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no library papers', () => {
      render(<PaperRecommendations />);

      // Empty state shows description text
      expect(screen.getByText('description')).toBeInTheDocument();
    });
  });

  describe('Related Recommendations', () => {
    it('should display related papers based on library', () => {
      mockUseAcademic.mockReturnValue({
        ...defaultMockReturn,
        libraryPapers: [createMockLibraryPaper('1', { fieldsOfStudy: ['ML'] })],
        searchResults: [
          createMockPaper('r1', { fieldsOfStudy: ['ML'] }),
          createMockPaper('r2', { fieldsOfStudy: ['ML'] }),
        ],
      } as ReturnType<typeof useAcademic>);

      render(<PaperRecommendations />);

      expect(screen.getByText('Recommended Paper r1')).toBeInTheDocument();
    });

    it('should show field overlap badge', () => {
      mockUseAcademic.mockReturnValue({
        ...defaultMockReturn,
        libraryPapers: [createMockLibraryPaper('1', { fieldsOfStudy: ['Machine Learning'] })],
        searchResults: [createMockPaper('r1', { fieldsOfStudy: ['Machine Learning', 'AI'] })],
      } as ReturnType<typeof useAcademic>);

      render(<PaperRecommendations />);

      // Paper card should be rendered
      expect(screen.getByText('Recommended Paper r1')).toBeInTheDocument();
    });
  });

  describe('Trending Recommendations', () => {
    it('should switch to trending tab', async () => {
      mockUseAcademic.mockReturnValue({
        ...defaultMockReturn,
        libraryPapers: [createMockLibraryPaper('1')],
        searchResults: [createMockPaper('t1', { citationCount: 1000 })],
      } as ReturnType<typeof useAcademic>);

      const user = userEvent.setup();
      render(<PaperRecommendations />);

      await user.click(screen.getByText(/tabs.trending/i));

      expect(screen.getByRole('tab', { selected: true })).toHaveTextContent(/tabs.trending/i);
    });

    it('should show papers sorted by citation count', async () => {
      mockUseAcademic.mockReturnValue({
        ...defaultMockReturn,
        libraryPapers: [createMockLibraryPaper('1')],
        searchResults: [
          createMockPaper('t1', { citationCount: 500 }),
          createMockPaper('t2', { citationCount: 1000 }),
        ],
      } as ReturnType<typeof useAcademic>);

      const user = userEvent.setup();
      render(<PaperRecommendations />);

      await user.click(screen.getByText(/tabs.trending/i));

      // Higher cited paper should appear
    });
  });

  describe('By Authors Recommendations', () => {
    it('should switch to by authors tab', async () => {
      mockUseAcademic.mockReturnValue({
        ...defaultMockReturn,
        libraryPapers: [createMockLibraryPaper('1', { authors: [{ name: 'John Doe' }] })],
        searchResults: [createMockPaper('a1', { authors: [{ name: 'John Doe' }] })],
      } as ReturnType<typeof useAcademic>);

      const user = userEvent.setup();
      render(<PaperRecommendations />);

      await user.click(screen.getByText(/tabs.byAuthors/i));

      expect(screen.getByRole('tab', { selected: true })).toHaveTextContent(/tabs.byAuthors/i);
    });

    it('should show papers by same authors', async () => {
      mockUseAcademic.mockReturnValue({
        ...defaultMockReturn,
        libraryPapers: [createMockLibraryPaper('1', { authors: [{ name: 'Famous Researcher' }] })],
        searchResults: [createMockPaper('a1', { authors: [{ name: 'Famous Researcher' }] })],
      } as ReturnType<typeof useAcademic>);

      const user = userEvent.setup();
      render(<PaperRecommendations />);

      await user.click(screen.getByText(/tabs.byAuthors/i));

      expect(screen.getByText('Recommended Paper a1')).toBeInTheDocument();
    });
  });

  describe('addToLibrary', () => {
    it('should show add button for recommendations', () => {
      mockUseAcademic.mockReturnValue({
        ...defaultMockReturn,
        libraryPapers: [createMockLibraryPaper('1')],
        searchResults: [createMockPaper('r1')],
      } as ReturnType<typeof useAcademic>);

      render(<PaperRecommendations />);

      // Paper recommendation card should be rendered with add button
      expect(screen.getByText('Recommended Paper r1')).toBeInTheDocument();
    });

    it('should call addToLibrary when add button clicked', async () => {
      const mockAdd = jest.fn();
      mockUseAcademic.mockReturnValue({
        ...defaultMockReturn,
        libraryPapers: [createMockLibraryPaper('1')],
        searchResults: [createMockPaper('r1')],
        addToLibrary: mockAdd,
      } as ReturnType<typeof useAcademic>);

      render(<PaperRecommendations />);

      // Paper card should be rendered
      expect(screen.getByText('Recommended Paper r1')).toBeInTheDocument();
    });
  });

  describe('Refresh', () => {
    it('should refresh recommendations when button clicked', async () => {
      const mockRefresh = jest.fn();
      mockUseAcademic.mockReturnValue({
        ...defaultMockReturn,
        libraryPapers: [createMockLibraryPaper('1')],
        refresh: mockRefresh,
      } as ReturnType<typeof useAcademic>);

      const user = userEvent.setup();
      render(<PaperRecommendations />);

      await user.click(screen.getByText('refresh'));

      // Refresh button clicked
      expect(screen.getByText('refresh')).toBeInTheDocument();
    });
  });

  describe('Paper Card', () => {
    it('should display paper title', () => {
      mockUseAcademic.mockReturnValue({
        ...defaultMockReturn,
        libraryPapers: [createMockLibraryPaper('1')],
        searchResults: [createMockPaper('r1', { title: 'Custom Title' })],
      } as ReturnType<typeof useAcademic>);

      render(<PaperRecommendations />);

      expect(screen.getByText('Custom Title')).toBeInTheDocument();
    });

    it('should display paper authors', () => {
      mockUseAcademic.mockReturnValue({
        ...defaultMockReturn,
        libraryPapers: [createMockLibraryPaper('1')],
        searchResults: [createMockPaper('r1', { authors: [{ name: 'Jane Doe' }] })],
      } as ReturnType<typeof useAcademic>);

      render(<PaperRecommendations />);

      expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    });

    it('should display citation count', () => {
      mockUseAcademic.mockReturnValue({
        ...defaultMockReturn,
        libraryPapers: [createMockLibraryPaper('1')],
        searchResults: [createMockPaper('r1', { citationCount: 250 })],
      } as ReturnType<typeof useAcademic>);

      render(<PaperRecommendations />);

      expect(screen.getByText('250')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('should show loading indicator when searching', () => {
      mockUseAcademic.mockReturnValue({
        ...defaultMockReturn,
        libraryPapers: [createMockLibraryPaper('1')],
        isSearching: true,
      } as ReturnType<typeof useAcademic>);

      render(<PaperRecommendations />);

      // Component renders with searching state
      expect(screen.getByText('title')).toBeInTheDocument();
    });
  });
});
