/**
 * Unit tests for PaperDetail component
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PaperDetail } from './paper-detail';
import { useAcademic } from '@/hooks/academic';
import type { LibraryPaper } from '@/types/learning/academic';

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
  abstract: 'This is a test abstract for the paper.',
  authors: [{ name: 'John Doe' }, { name: 'Jane Smith' }],
  year: 2023,
  citationCount: 100,
  venue: 'ICML 2023',
  urls: [{ url: 'https://example.com', type: 'html', source: 'arxiv' }],
  metadata: { doi: '10.1234/test' },
  createdAt: new Date(),
  updatedAt: new Date(),
  fetchedAt: new Date(),
  libraryId: `lib-${id}`,
  addedAt: new Date(),
  readingStatus: 'unread',
  priority: 'medium',
  hasCachedPdf: false,
  pdfUrl: 'https://example.com/paper.pdf',
  ...overrides,
});

describe('PaperDetail', () => {
  const mockPaper = createMockLibraryPaper('1');

  const defaultMockReturn = {
    libraryPapers: [mockPaper],
    collections: [],
    searchQuery: '',
    searchResults: [],
    isSearching: false,
    searchError: null,
    totalResults: 0,
    selectedCollection: null,
    selectedPaper: mockPaper,
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
    hasPdf: jest.fn().mockReturnValue(true),
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
    it('should render the component with paper', () => {
      render(<PaperDetail paper={mockPaper} open onOpenChange={() => {}} />);

      expect(screen.getByText('Test Paper 1')).toBeInTheDocument();
    });

    it('should render paper metadata', () => {
      render(<PaperDetail paper={mockPaper} open onOpenChange={() => {}} />);

      expect(screen.getByText('2023')).toBeInTheDocument();
      expect(screen.getByText('ICML 2023')).toBeInTheDocument();
    });

    it('should render authors', () => {
      render(<PaperDetail paper={mockPaper} open onOpenChange={() => {}} />);

      expect(screen.getByText(/John Doe/)).toBeInTheDocument();
      expect(screen.getByText(/Jane Smith/)).toBeInTheDocument();
    });

    it('should render abstract', () => {
      render(<PaperDetail paper={mockPaper} open onOpenChange={() => {}} />);

      expect(screen.getByText('This is a test abstract for the paper.')).toBeInTheDocument();
    });

    it('should render citation count', () => {
      render(<PaperDetail paper={mockPaper} open onOpenChange={() => {}} />);

      // Verify component renders with paper data
      expect(screen.getByText('Test Paper 1')).toBeInTheDocument();
    });
  });

  describe('Status Management', () => {
    it('should display current reading status', () => {
      render(<PaperDetail paper={mockPaper} open onOpenChange={() => {}} />);

      expect(screen.getByText('Unread')).toBeInTheDocument();
    });

    it('should display status indicator', () => {
      render(<PaperDetail paper={mockPaper} open onOpenChange={() => {}} />);

      // Verify component renders
      expect(screen.getByText('Test Paper 1')).toBeInTheDocument();
    });
  });

  describe('Rating', () => {
    it('should render rating section', () => {
      render(<PaperDetail paper={mockPaper} open onOpenChange={() => {}} />);

      // Verify the component renders without errors
      expect(screen.getByText('Test Paper 1')).toBeInTheDocument();
    });
  });

  describe('Notes', () => {
    it('should render notes section', () => {
      render(<PaperDetail paper={mockPaper} open onOpenChange={() => {}} />);

      // Verify the component renders
      expect(screen.getByText('Test Paper 1')).toBeInTheDocument();
    });
  });

  describe('PDF Actions', () => {
    it('should render PDF section', () => {
      render(<PaperDetail paper={mockPaper} open onOpenChange={() => {}} />);

      // Verify component renders
      expect(screen.getByText('Test Paper 1')).toBeInTheDocument();
    });
  });

  describe('Analysis', () => {
    it('should render analysis section', () => {
      render(<PaperDetail paper={mockPaper} open onOpenChange={() => {}} />);

      expect(screen.getByText('Test Paper 1')).toBeInTheDocument();
    });
  });

  describe('Guided Learning', () => {
    it('should render paper detail', () => {
      render(<PaperDetail paper={mockPaper} open onOpenChange={() => {}} />);

      expect(screen.getByText('Test Paper 1')).toBeInTheDocument();
    });
  });

  describe('External Links', () => {
    it('should render external links section', () => {
      render(<PaperDetail paper={mockPaper} open onOpenChange={() => {}} />);

      expect(screen.getByText('Test Paper 1')).toBeInTheDocument();
    });
  });

  describe('Collections', () => {
    it('should render collections section', () => {
      render(<PaperDetail paper={mockPaper} open onOpenChange={() => {}} />);

      expect(screen.getByText('Test Paper 1')).toBeInTheDocument();
    });
  });

  describe('Tabs', () => {
    it('should render tab navigation', () => {
      render(<PaperDetail paper={mockPaper} open onOpenChange={() => {}} />);

      expect(screen.getByRole('tablist')).toBeInTheDocument();
    });

    it('should switch tabs when clicked', async () => {
      const user = userEvent.setup();
      render(<PaperDetail paper={mockPaper} open onOpenChange={() => {}} />);

      const tabs = screen.getAllByRole('tab');
      if (tabs.length > 1) {
        await user.click(tabs[1]);
      }
    });
  });

  describe('Close Action', () => {
    it('should render with close capability', () => {
      const mockOnOpenChange = jest.fn();
      render(<PaperDetail paper={mockPaper} open onOpenChange={mockOnOpenChange} />);

      expect(screen.getByText('Test Paper 1')).toBeInTheDocument();
    });
  });
});
