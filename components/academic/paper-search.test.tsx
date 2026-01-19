/**
 * Unit tests for PaperSearch component
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PaperSearch } from './paper-search';
import { useAcademic } from '@/hooks/academic';
import type { Paper } from '@/types/learning/academic';

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
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAcademic.mockReturnValue(defaultMockReturn as ReturnType<typeof useAcademic>);
  });

  describe('Rendering', () => {
    it('should render the component', () => {
      render(<PaperSearch />);
      
      expect(screen.getByPlaceholderText(/Search papers/i)).toBeInTheDocument();
    });

    it('should render search button', () => {
      render(<PaperSearch />);
      
      expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument();
    });

    it('should render filter button', () => {
      render(<PaperSearch />);
      
      expect(screen.getByText('Filters')).toBeInTheDocument();
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
      
      const input = screen.getByPlaceholderText(/Search papers/i);
      await user.type(input, 'machine learning');
      await user.click(screen.getByRole('button', { name: /search/i }));
      
      expect(mockSearch).toHaveBeenCalledWith('machine learning');
    });

    it('should call search on Enter key', async () => {
      const mockSearch = jest.fn();
      mockUseAcademic.mockReturnValue({
        ...defaultMockReturn,
        search: mockSearch,
      } as ReturnType<typeof useAcademic>);
      
      const user = userEvent.setup();
      render(<PaperSearch />);
      
      const input = screen.getByPlaceholderText(/Search papers/i);
      await user.type(input, 'deep learning{Enter}');
      
      expect(mockSearch).toHaveBeenCalledWith('deep learning');
    });

    it('should update search query', async () => {
      const mockSetQuery = jest.fn();
      mockUseAcademic.mockReturnValue({
        ...defaultMockReturn,
        setSearchQuery: mockSetQuery,
      } as ReturnType<typeof useAcademic>);
      
      const user = userEvent.setup();
      render(<PaperSearch />);
      
      const input = screen.getByPlaceholderText(/Search papers/i);
      await user.type(input, 'neural networks');
      
      expect(mockSetQuery).toHaveBeenCalled();
    });
  });

  describe('Search Results', () => {
    it('should display search results', () => {
      mockUseAcademic.mockReturnValue({
        ...defaultMockReturn,
        searchResults: [
          createMockPaper('1'),
          createMockPaper('2'),
        ],
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
      
      expect(screen.getByText(/100 results/i)).toBeInTheDocument();
    });

    it('should show no results message', () => {
      mockUseAcademic.mockReturnValue({
        ...defaultMockReturn,
        searchQuery: 'test query',
        searchResults: [],
        totalResults: 0,
      } as ReturnType<typeof useAcademic>);
      
      render(<PaperSearch />);
      
      expect(screen.getByText(/No results found/i)).toBeInTheDocument();
    });
  });

  describe('Filters', () => {
    it('should open filter popover', async () => {
      const user = userEvent.setup();
      render(<PaperSearch />);
      
      await user.click(screen.getByText('Filters'));
      
      expect(screen.getByText('Year Range')).toBeInTheDocument();
    });

    it('should filter by year range', async () => {
      const mockSetFilter = jest.fn();
      mockUseAcademic.mockReturnValue({
        ...defaultMockReturn,
        setSearchFilter: mockSetFilter,
      } as ReturnType<typeof useAcademic>);
      
      const user = userEvent.setup();
      render(<PaperSearch />);
      
      await user.click(screen.getByText('Filters'));
      
      // Year filter inputs
      const yearFromInput = screen.getByLabelText(/From year/i);
      await user.clear(yearFromInput);
      await user.type(yearFromInput, '2020');
      
      expect(mockSetFilter).toHaveBeenCalled();
    });

    it('should filter by open access', async () => {
      const mockSetFilter = jest.fn();
      mockUseAcademic.mockReturnValue({
        ...defaultMockReturn,
        setSearchFilter: mockSetFilter,
      } as ReturnType<typeof useAcademic>);
      
      const user = userEvent.setup();
      render(<PaperSearch />);
      
      await user.click(screen.getByText('Filters'));
      await user.click(screen.getByText('Open Access Only'));
      
      expect(mockSetFilter).toHaveBeenCalled();
    });
  });

  describe('Provider Selection', () => {
    it('should show provider options', async () => {
      const user = userEvent.setup();
      render(<PaperSearch />);
      
      await user.click(screen.getByText('Filters'));
      
      expect(screen.getByText('arXiv')).toBeInTheDocument();
      expect(screen.getByText('Semantic Scholar')).toBeInTheDocument();
    });

    it('should toggle provider', async () => {
      const mockSetFilter = jest.fn();
      mockUseAcademic.mockReturnValue({
        ...defaultMockReturn,
        setSearchFilter: mockSetFilter,
      } as ReturnType<typeof useAcademic>);
      
      const user = userEvent.setup();
      render(<PaperSearch />);
      
      await user.click(screen.getByText('Filters'));
      await user.click(screen.getByLabelText('arXiv'));
      
      expect(mockSetFilter).toHaveBeenCalled();
    });
  });

  describe('Add to Library', () => {
    it('should show add button for each result', () => {
      mockUseAcademic.mockReturnValue({
        ...defaultMockReturn,
        searchResults: [createMockPaper('1')],
      } as ReturnType<typeof useAcademic>);
      
      render(<PaperSearch />);
      
      expect(screen.getByText('Add to Library')).toBeInTheDocument();
    });

    it('should call addToLibrary when clicked', async () => {
      const mockAdd = jest.fn();
      mockUseAcademic.mockReturnValue({
        ...defaultMockReturn,
        searchResults: [createMockPaper('1')],
        addToLibrary: mockAdd,
      } as ReturnType<typeof useAcademic>);
      
      const user = userEvent.setup();
      render(<PaperSearch />);
      
      await user.click(screen.getByText('Add to Library'));
      
      expect(mockAdd).toHaveBeenCalled();
    });

    it('should show already in library badge', () => {
      const paper = createMockPaper('1');
      mockUseAcademic.mockReturnValue({
        ...defaultMockReturn,
        searchResults: [paper],
        libraryPapers: [{ ...paper, libraryId: 'lib-1', addedAt: new Date(), readingStatus: 'unread', priority: 'medium', hasCachedPdf: false }],
      } as ReturnType<typeof useAcademic>);
      
      render(<PaperSearch />);
      
      expect(screen.getByText('In Library')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('should show loading indicator when searching', () => {
      mockUseAcademic.mockReturnValue({
        ...defaultMockReturn,
        isSearching: true,
      } as ReturnType<typeof useAcademic>);
      
      render(<PaperSearch />);
      
      expect(screen.getByText(/Searching/i)).toBeInTheDocument();
    });

    it('should disable search button when loading', () => {
      mockUseAcademic.mockReturnValue({
        ...defaultMockReturn,
        isSearching: true,
      } as ReturnType<typeof useAcademic>);
      
      render(<PaperSearch />);
      
      expect(screen.getByRole('button', { name: /search/i })).toBeDisabled();
    });
  });

  describe('Error Handling', () => {
    it('should display error message', () => {
      mockUseAcademic.mockReturnValue({
        ...defaultMockReturn,
        searchError: 'Search failed',
      } as ReturnType<typeof useAcademic>);
      
      render(<PaperSearch />);
      
      expect(screen.getByText('Search failed')).toBeInTheDocument();
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
      
      expect(screen.getByText('Open Access')).toBeInTheDocument();
    });

    it('should show external link button', () => {
      mockUseAcademic.mockReturnValue({
        ...defaultMockReturn,
        searchResults: [createMockPaper('1')],
      } as ReturnType<typeof useAcademic>);
      
      render(<PaperSearch />);
      
      expect(screen.getByLabelText(/View source/i)).toBeInTheDocument();
    });
  });
});
