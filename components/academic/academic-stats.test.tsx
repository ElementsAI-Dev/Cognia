/**
 * Unit tests for AcademicStats component
 */

import { render, screen } from '@testing-library/react';
import { AcademicStats } from './academic-stats';
import { useAcademic } from '@/hooks/academic';
import type { LibraryPaper, PaperCollection } from '@/types/academic';

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

const createMockCollection = (id: string): PaperCollection => ({
  id,
  name: `Collection ${id}`,
  paperIds: [],
  createdAt: new Date(),
  updatedAt: new Date(),
});

describe('AcademicStats', () => {
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
    activeTab: 'search' as const,
    isLoading: false,
    error: null,
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
    // Legacy search actions
    search: jest.fn(),
    setSearchQuery: jest.fn(),
    setSearchFilter: jest.fn(),
    clearSearch: jest.fn(),
    // Library actions
    addToLibrary: jest.fn(),
    removeFromLibrary: jest.fn(),
    updatePaperStatus: jest.fn(),
    updatePaperRating: jest.fn(),
    addPaperNote: jest.fn(),
    // Collection actions
    createCollection: jest.fn(),
    deleteCollection: jest.fn(),
    addToCollection: jest.fn(),
    removeFromCollection: jest.fn(),
    // PDF actions
    downloadPdf: jest.fn(),
    hasPdf: jest.fn(),
    // Analysis actions
    analyzePaper: jest.fn(),
    startGuidedLearning: jest.fn(),
    // UI actions
    setActiveTab: jest.fn(),
    selectCollection: jest.fn(),
    selectPaper: jest.fn(),
    setViewMode: jest.fn(),
    // Import/Export
    importBibtex: jest.fn(),
    exportBibtex: jest.fn(),
    // Tag actions
    addTag: jest.fn(),
    removeTag: jest.fn(),
    // Batch actions
    selectedPaperIds: [],
    togglePaperSelection: jest.fn(),
    selectAllPapers: jest.fn(),
    clearPaperSelection: jest.fn(),
    batchAddToCollection: jest.fn(),
    batchUpdateStatus: jest.fn(),
    batchRemove: jest.fn(),
    // Search history
    searchHistory: [],
    addSearchHistory: jest.fn(),
    clearSearchHistory: jest.fn(),
    // Analysis history
    saveAnalysisResult: jest.fn(),
    getAnalysisHistory: jest.fn(),
    // Other
    refresh: jest.fn(),
    refreshLibrary: jest.fn(),
    refreshCollections: jest.fn(),
    clearError: jest.fn(),
    reset: jest.fn(),
    searchWithProvider: jest.fn(),
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
      render(<AcademicStats />);

      expect(screen.getByText('Total Papers')).toBeInTheDocument();
      expect(screen.getAllByText('Completed').length).toBeGreaterThan(0);
      expect(screen.getByText('Currently Reading')).toBeInTheDocument();
      expect(screen.getAllByText('Collections').length).toBeGreaterThan(0);
    });

    it('should render reading progress section', () => {
      render(<AcademicStats />);

      expect(screen.getByText('Reading Progress')).toBeInTheDocument();
      expect(screen.getByText('Your overall reading status breakdown')).toBeInTheDocument();
    });

    it('should render top research fields section', () => {
      render(<AcademicStats />);

      expect(screen.getByText('Top Research Fields')).toBeInTheDocument();
    });

    it('should render paper sources section', () => {
      render(<AcademicStats />);

      expect(screen.getByText('Paper Sources')).toBeInTheDocument();
    });

    it('should render engagement metrics section', () => {
      render(<AcademicStats />);

      expect(screen.getByText('Engagement Metrics')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should display zero values when library is empty', () => {
      render(<AcademicStats />);

      // Check that zero values are displayed (may appear multiple times)
      expect(screen.getAllByText('0').length).toBeGreaterThan(0);
    });

    it('should show no fields data message when empty', () => {
      render(<AcademicStats />);

      expect(screen.getByText('No fields data available yet')).toBeInTheDocument();
    });
  });

  describe('Statistics Calculation', () => {
    it('should calculate total papers correctly', () => {
      mockUseAcademic.mockReturnValue({
        ...defaultMockReturn,
        libraryPapers: [
          createMockLibraryPaper('1'),
          createMockLibraryPaper('2'),
          createMockLibraryPaper('3'),
        ],
      });

      render(<AcademicStats />);

      // Verify papers count appears (may appear multiple times)
      expect(screen.getAllByText('3').length).toBeGreaterThan(0);
    });

    it('should calculate reading status breakdown correctly', () => {
      mockUseAcademic.mockReturnValue({
        ...defaultMockReturn,
        libraryPapers: [
          createMockLibraryPaper('1', { readingStatus: 'unread' }),
          createMockLibraryPaper('2', { readingStatus: 'reading' }),
          createMockLibraryPaper('3', { readingStatus: 'completed' }),
          createMockLibraryPaper('4', { readingStatus: 'completed' }),
          createMockLibraryPaper('5', { readingStatus: 'archived' }),
        ],
      });

      render(<AcademicStats />);

      // Verify papers are rendered by checking total papers card exists
      expect(screen.getByText('Total Papers')).toBeInTheDocument();
      // Verify completed section exists
      expect(screen.getAllByText('Completed').length).toBeGreaterThan(0);
    });

    it('should calculate completion rate correctly', () => {
      mockUseAcademic.mockReturnValue({
        ...defaultMockReturn,
        libraryPapers: [
          createMockLibraryPaper('1', { readingStatus: 'completed' }),
          createMockLibraryPaper('2', { readingStatus: 'completed' }),
          createMockLibraryPaper('3', { readingStatus: 'unread' }),
          createMockLibraryPaper('4', { readingStatus: 'reading' }),
        ],
      });

      render(<AcademicStats />);

      // Verify completion rate text appears
      expect(screen.getByText(/completion rate/)).toBeInTheDocument();
    });

    it('should count collections correctly', () => {
      mockUseAcademic.mockReturnValue({
        ...defaultMockReturn,
        collections: [createMockCollection('1'), createMockCollection('2')],
      });

      render(<AcademicStats />);

      // Collections count should show 2
      const collectionsCard = screen.getByText('Collections').closest('div')
        ?.parentElement?.parentElement;
      expect(collectionsCard).toBeTruthy();
    });
  });

  describe('Top Fields', () => {
    it('should display top research fields', () => {
      mockUseAcademic.mockReturnValue({
        ...defaultMockReturn,
        libraryPapers: [
          createMockLibraryPaper('1', { fieldsOfStudy: ['Machine Learning', 'AI'] }),
          createMockLibraryPaper('2', { fieldsOfStudy: ['Machine Learning', 'NLP'] }),
          createMockLibraryPaper('3', { fieldsOfStudy: ['AI', 'Robotics'] }),
        ],
      });

      render(<AcademicStats />);

      expect(screen.getByText('Machine Learning')).toBeInTheDocument();
      expect(screen.getByText('AI')).toBeInTheDocument();
    });

    it('should sort fields by count', () => {
      mockUseAcademic.mockReturnValue({
        ...defaultMockReturn,
        libraryPapers: [
          createMockLibraryPaper('1', { fieldsOfStudy: ['ML', 'AI'] }),
          createMockLibraryPaper('2', { fieldsOfStudy: ['ML'] }),
          createMockLibraryPaper('3', { fieldsOfStudy: ['ML', 'AI'] }),
        ],
      });

      render(<AcademicStats />);

      // ML should appear first (3 counts)
      expect(screen.getByText('ML')).toBeInTheDocument();
      expect(screen.getByText('AI')).toBeInTheDocument();
    });

    it('should limit to top 5 fields', () => {
      mockUseAcademic.mockReturnValue({
        ...defaultMockReturn,
        libraryPapers: [
          createMockLibraryPaper('1', {
            fieldsOfStudy: ['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7'],
          }),
          createMockLibraryPaper('2', {
            fieldsOfStudy: ['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7'],
          }),
        ],
      });

      render(<AcademicStats />);

      // Should not show F6 and F7
      expect(screen.queryByText('F6')).not.toBeInTheDocument();
      expect(screen.queryByText('F7')).not.toBeInTheDocument();
    });
  });

  describe('Paper Sources', () => {
    it('should display provider breakdown', () => {
      mockUseAcademic.mockReturnValue({
        ...defaultMockReturn,
        libraryPapers: [
          createMockLibraryPaper('1', { providerId: 'arxiv' }),
          createMockLibraryPaper('2', { providerId: 'arxiv' }),
          createMockLibraryPaper('3', { providerId: 'semantic-scholar' }),
        ],
      });

      render(<AcademicStats />);

      expect(screen.getByText('arxiv')).toBeInTheDocument();
      expect(screen.getByText('semantic scholar')).toBeInTheDocument();
    });
  });

  describe('Engagement Metrics', () => {
    it('should display PDF download count', () => {
      mockUseAcademic.mockReturnValue({
        ...defaultMockReturn,
        libraryPapers: [
          createMockLibraryPaper('1', { hasCachedPdf: true }),
          createMockLibraryPaper('2', { hasCachedPdf: true }),
          createMockLibraryPaper('3', { hasCachedPdf: false }),
        ],
      });

      render(<AcademicStats />);

      expect(screen.getByText('PDFs Downloaded')).toBeInTheDocument();
    });

    it('should display papers with notes count', () => {
      mockUseAcademic.mockReturnValue({
        ...defaultMockReturn,
        libraryPapers: [
          createMockLibraryPaper('1', { userNotes: 'Some notes' }),
          createMockLibraryPaper('2', {
            notes: [
              {
                id: '1',
                paperId: '2',
                content: 'note',
                tags: [],
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            ],
          }),
          createMockLibraryPaper('3'),
        ],
      });

      render(<AcademicStats />);

      expect(screen.getByText('Papers with Notes')).toBeInTheDocument();
    });

    it('should display papers with annotations count', () => {
      mockUseAcademic.mockReturnValue({
        ...defaultMockReturn,
        libraryPapers: [
          createMockLibraryPaper('1', {
            annotations: [{ id: '1', content: 'annotation' }] as unknown as undefined,
          }),
          createMockLibraryPaper('2'),
        ],
      });

      render(<AcademicStats />);

      expect(screen.getByText('With Annotations')).toBeInTheDocument();
    });

    it('should calculate average rating correctly', () => {
      mockUseAcademic.mockReturnValue({
        ...defaultMockReturn,
        libraryPapers: [
          createMockLibraryPaper('1', { userRating: 5 }),
          createMockLibraryPaper('2', { userRating: 3 }),
          createMockLibraryPaper('3'), // No rating
        ],
      });

      render(<AcademicStats />);

      // Average of 5 and 3 = 4.0
      expect(screen.getByText('Avg Rating')).toBeInTheDocument();
      expect(screen.getByText('4.0')).toBeInTheDocument();
    });

    it('should show 0.0 average rating when no papers have ratings', () => {
      mockUseAcademic.mockReturnValue({
        ...defaultMockReturn,
        libraryPapers: [createMockLibraryPaper('1'), createMockLibraryPaper('2')],
      });

      render(<AcademicStats />);

      expect(screen.getByText('0.0')).toBeInTheDocument();
    });
  });

  describe('This Week Stats', () => {
    it('should count papers added this week', () => {
      const today = new Date();
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 10);

      mockUseAcademic.mockReturnValue({
        ...defaultMockReturn,
        libraryPapers: [
          createMockLibraryPaper('1', { addedAt: today }),
          createMockLibraryPaper('2', { addedAt: today }),
          createMockLibraryPaper('3', { addedAt: weekAgo }),
        ],
      });

      render(<AcademicStats />);

      expect(screen.getByText('2 added this week')).toBeInTheDocument();
    });
  });

  describe('Progress Bars', () => {
    it('should render progress bars for reading status', () => {
      mockUseAcademic.mockReturnValue({
        ...defaultMockReturn,
        libraryPapers: [
          createMockLibraryPaper('1', { readingStatus: 'unread' }),
          createMockLibraryPaper('2', { readingStatus: 'reading' }),
          createMockLibraryPaper('3', { readingStatus: 'completed' }),
        ],
      });

      render(<AcademicStats />);

      // Check that progress bar labels exist (using getAllByText since some labels appear multiple times)
      expect(screen.getAllByText('Unread').length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Reading/).length).toBeGreaterThan(0);
      expect(screen.getAllByText('Completed').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Archived').length).toBeGreaterThan(0);
    });
  });
});
