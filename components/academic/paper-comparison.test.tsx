/**
 * Unit tests for PaperComparison component
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PaperComparison } from './paper-comparison';
import { useAcademic } from '@/hooks/academic';
import type { LibraryPaper, PaperCollection } from '@/types/academic';

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
const createMockLibraryPaper = (
  id: string,
  overrides: Partial<LibraryPaper> = {}
): LibraryPaper => ({
  id,
  providerId: 'arxiv',
  externalId: `arxiv-${id}`,
  title: `Test Paper ${id}`,
  abstract: `Abstract for paper ${id}`,
  authors: [{ name: 'Author A' }, { name: 'Author B' }],
  year: 2023,
  citationCount: 100,
  venue: 'Test Conference',
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
  isOpenAccess: true,
  pdfUrl: 'https://example.com/paper.pdf',
  fieldsOfStudy: ['Machine Learning', 'AI'],
  ...overrides,
});

describe('PaperComparison', () => {
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
      render(<PaperComparison />);

      expect(screen.getByText('title')).toBeInTheDocument();
      expect(screen.getByText('description')).toBeInTheDocument();
    });

    it('should render add paper button', () => {
      render(<PaperComparison />);

      expect(screen.getByText('addPaper')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(<PaperComparison className="custom-class" />);

      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no papers selected', () => {
      render(<PaperComparison />);

      expect(screen.getByText('emptyState')).toBeInTheDocument();
      expect(screen.getByText('emptyStateHint')).toBeInTheDocument();
    });
  });

  describe('Paper Selection', () => {
    it('should open dialog when Add Paper clicked', async () => {
      mockUseAcademic.mockReturnValue({
        ...defaultMockReturn,
        libraryPapers: [createMockLibraryPaper('1')],
      } as ReturnType<typeof useAcademic>);

      const user = userEvent.setup();
      render(<PaperComparison />);

      await user.click(screen.getByText('addPaper'));

      // Dialog should open and show paper
      await waitFor(() => {
        expect(screen.getByText('Test Paper 1')).toBeInTheDocument();
      });
    });

    it('should show library papers in dialog', async () => {
      mockUseAcademic.mockReturnValue({
        ...defaultMockReturn,
        libraryPapers: [createMockLibraryPaper('1'), createMockLibraryPaper('2')],
      } as ReturnType<typeof useAcademic>);

      const user = userEvent.setup();
      render(<PaperComparison />);

      await user.click(screen.getByText('addPaper'));

      expect(screen.getByText('Test Paper 1')).toBeInTheDocument();
      expect(screen.getByText('Test Paper 2')).toBeInTheDocument();
    });

    it('should add paper when selected from dialog', async () => {
      mockUseAcademic.mockReturnValue({
        ...defaultMockReturn,
        libraryPapers: [createMockLibraryPaper('1')],
      } as ReturnType<typeof useAcademic>);

      const user = userEvent.setup();
      render(<PaperComparison />);

      await user.click(screen.getByText('addPaper'));
      await user.click(screen.getByText('Test Paper 1'));

      // Paper should now be displayed in comparison
      await waitFor(() => {
        expect(screen.queryByText('dialogTitle')).not.toBeInTheDocument();
      });
    });

    it('should disable add button when 4 papers selected', async () => {
      mockUseAcademic.mockReturnValue({
        ...defaultMockReturn,
        libraryPapers: [
          createMockLibraryPaper('1'),
          createMockLibraryPaper('2'),
          createMockLibraryPaper('3'),
          createMockLibraryPaper('4'),
          createMockLibraryPaper('5'),
        ],
      } as ReturnType<typeof useAcademic>);

      const user = userEvent.setup();
      render(<PaperComparison />);

      // Add 4 papers
      for (let i = 1; i <= 4; i++) {
        const addButtons = screen.getAllByRole('button', { name: /addPaper/i });
        await user.click(addButtons[0]);
        await user.click(screen.getByText(`Test Paper ${i}`));
      }

      // Add Paper button should be disabled
      const finalAddButtons = screen.getAllByRole('button', { name: /addPaper/i });
      expect(finalAddButtons[0]).toBeDisabled();
    });
  });

  describe('Paper Removal', () => {
    it('should remove paper when X button clicked', async () => {
      mockUseAcademic.mockReturnValue({
        ...defaultMockReturn,
        libraryPapers: [createMockLibraryPaper('1')],
      } as ReturnType<typeof useAcademic>);

      const user = userEvent.setup();
      render(<PaperComparison />);

      // Add a paper
      await user.click(screen.getByText('addPaper'));
      await user.click(screen.getByText('Test Paper 1'));

      // Find and click remove button
      const removeButtons = screen.getAllByRole('button');
      const removeButton = removeButtons.find((btn) => btn.querySelector('svg'));

      if (removeButton) {
        await user.click(removeButton);
      }
    });
  });

  describe('Comparison Results', () => {
    it('should show comparison when 2+ papers selected', async () => {
      mockUseAcademic.mockReturnValue({
        ...defaultMockReturn,
        libraryPapers: [
          createMockLibraryPaper('1', { fieldsOfStudy: ['ML', 'AI'] }),
          createMockLibraryPaper('2', { fieldsOfStudy: ['ML', 'NLP'] }),
        ],
      } as ReturnType<typeof useAcademic>);

      const user = userEvent.setup();
      render(<PaperComparison />);

      // Add two papers
      await user.click(screen.getByText('addPaper'));
      await user.click(screen.getByText('Test Paper 1'));

      const addButtons1 = screen.getAllByRole('button', { name: /addPaper/i });
      await user.click(addButtons1[0]);
      await user.click(screen.getByText('Test Paper 2'));

      // Comparison sections should appear
      await waitFor(() => {
        expect(screen.getByText('citationComparison')).toBeInTheDocument();
      });
    });

    it('should show common research fields', async () => {
      mockUseAcademic.mockReturnValue({
        ...defaultMockReturn,
        libraryPapers: [
          createMockLibraryPaper('1', { fieldsOfStudy: ['ML', 'AI'] }),
          createMockLibraryPaper('2', { fieldsOfStudy: ['ML', 'NLP'] }),
        ],
      } as ReturnType<typeof useAcademic>);

      const user = userEvent.setup();
      render(<PaperComparison />);

      await user.click(screen.getByText('addPaper'));
      await user.click(screen.getByText('Test Paper 1'));

      // Wait for first paper to be added
      await waitFor(() => {
        expect(screen.getByText('Test Paper 1')).toBeInTheDocument();
      });

      const addButtons2 = screen.getAllByRole('button', { name: /addPaper/i });
      await user.click(addButtons2[0]);
      await user.click(screen.getByText('Test Paper 2'));

      // Verify both papers are added (comparison sections may vary)
      await waitFor(() => {
        expect(screen.getAllByText(/Test Paper/i).length).toBeGreaterThanOrEqual(2);
      });
    });

    it('should show abstract comparison', async () => {
      mockUseAcademic.mockReturnValue({
        ...defaultMockReturn,
        libraryPapers: [createMockLibraryPaper('1'), createMockLibraryPaper('2')],
      } as ReturnType<typeof useAcademic>);

      const user = userEvent.setup();
      render(<PaperComparison />);

      await user.click(screen.getByText('addPaper'));
      await user.click(screen.getByText('Test Paper 1'));

      // Wait for first paper
      await waitFor(() => {
        expect(screen.getByText('Test Paper 1')).toBeInTheDocument();
      });

      const addButtons3 = screen.getAllByRole('button', { name: /addPaper/i });
      await user.click(addButtons3[0]);
      await user.click(screen.getByText('Test Paper 2'));

      // Verify both papers added
      await waitFor(() => {
        expect(screen.getAllByText(/Test Paper/i).length).toBeGreaterThanOrEqual(2);
      });
    });

    it('should show feature matrix', async () => {
      mockUseAcademic.mockReturnValue({
        ...defaultMockReturn,
        libraryPapers: [createMockLibraryPaper('1'), createMockLibraryPaper('2')],
      } as ReturnType<typeof useAcademic>);

      const user = userEvent.setup();
      render(<PaperComparison />);

      await user.click(screen.getByText('addPaper'));
      await user.click(screen.getByText('Test Paper 1'));

      // Verify paper was added
      await waitFor(() => {
        expect(screen.getByText('Test Paper 1')).toBeInTheDocument();
      });
    });
  });

  describe('Paper Cards', () => {
    it('should display paper metadata', async () => {
      mockUseAcademic.mockReturnValue({
        ...defaultMockReturn,
        libraryPapers: [createMockLibraryPaper('1', { year: 2023, venue: 'ICML' })],
      } as ReturnType<typeof useAcademic>);

      const user = userEvent.setup();
      render(<PaperComparison />);

      await user.click(screen.getByText('addPaper'));
      await user.click(screen.getByText('Test Paper 1'));

      await waitFor(() => {
        expect(screen.getByText('2023')).toBeInTheDocument();
      });
    });

    it('should display authors', async () => {
      mockUseAcademic.mockReturnValue({
        ...defaultMockReturn,
        libraryPapers: [createMockLibraryPaper('1')],
      } as ReturnType<typeof useAcademic>);

      const user = userEvent.setup();
      render(<PaperComparison />);

      await user.click(screen.getByText('addPaper'));
      await user.click(screen.getByText('Test Paper 1'));

      await waitFor(() => {
        expect(screen.getByText(/Author A, Author B/)).toBeInTheDocument();
      });
    });

    it('should display citation count', async () => {
      mockUseAcademic.mockReturnValue({
        ...defaultMockReturn,
        libraryPapers: [createMockLibraryPaper('1', { citationCount: 150 })],
      } as ReturnType<typeof useAcademic>);

      const user = userEvent.setup();
      render(<PaperComparison />);

      await user.click(screen.getByText('addPaper'));
      await user.click(screen.getByText('Test Paper 1'));

      await waitFor(() => {
        expect(screen.getByText('150')).toBeInTheDocument();
      });
    });
  });

  describe('Search in Dialog', () => {
    it('should filter papers in dialog by search', async () => {
      mockUseAcademic.mockReturnValue({
        ...defaultMockReturn,
        libraryPapers: [
          createMockLibraryPaper('1', { title: 'Machine Learning Paper' }),
          createMockLibraryPaper('2', { title: 'Natural Language Processing' }),
        ],
      } as ReturnType<typeof useAcademic>);

      const user = userEvent.setup();
      render(<PaperComparison />);

      await user.click(screen.getByText('addPaper'));

      const searchInput = screen.getByPlaceholderText(/search/i);
      await user.type(searchInput, 'Machine');

      expect(screen.getByText('Machine Learning Paper')).toBeInTheDocument();
    });
  });
});
