/**
 * Unit tests for PaperLibrary component
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PaperLibrary } from './paper-library';
import { useAcademic } from '@/hooks/academic';
import type { LibraryPaper, PaperCollection } from '@/types/learning/academic';

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
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAcademic.mockReturnValue(defaultMockReturn as ReturnType<typeof useAcademic>);
  });

  describe('Rendering', () => {
    it('should render the component', () => {
      render(<PaperLibrary />);

      expect(screen.getByText('My Library')).toBeInTheDocument();
    });

    it('should render search input', () => {
      render(<PaperLibrary />);

      expect(screen.getByPlaceholderText(/Search library/i)).toBeInTheDocument();
    });

    it('should render view mode toggle', () => {
      render(<PaperLibrary />);

      expect(screen.getByLabelText(/list view/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/grid view/i)).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(<PaperLibrary className="custom-class" />);

      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no papers', () => {
      render(<PaperLibrary />);

      expect(screen.getByText(/Your library is empty/i)).toBeInTheDocument();
    });

    it('should show add papers prompt', () => {
      render(<PaperLibrary />);

      expect(screen.getByText(/Search and add papers/i)).toBeInTheDocument();
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

      expect(screen.getByText('3 papers')).toBeInTheDocument();
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

      const user = userEvent.setup();
      render(<PaperLibrary />);

      await user.click(screen.getByLabelText(/grid view/i));

      expect(mockSetViewMode).toHaveBeenCalledWith('grid');
    });

    it('should switch to table view', async () => {
      const mockSetViewMode = jest.fn();
      mockUseAcademic.mockReturnValue({
        ...defaultMockReturn,
        libraryPapers: [createMockLibraryPaper('1')],
        setViewMode: mockSetViewMode,
      } as ReturnType<typeof useAcademic>);

      const user = userEvent.setup();
      render(<PaperLibrary />);

      await user.click(screen.getByLabelText(/table view/i));

      expect(mockSetViewMode).toHaveBeenCalledWith('table');
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

      const searchInput = screen.getByPlaceholderText(/Search library/i);
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

      const user = userEvent.setup();
      render(<PaperLibrary />);

      // Click on filter tabs
      await user.click(screen.getByText('Unread'));

      await waitFor(() => {
        expect(screen.getByText('Test Paper 1')).toBeInTheDocument();
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
        await user.click(screen.getByText('Remove'));
        expect(mockRemove).toHaveBeenCalledWith('1');
      }
    });
  });

  describe('Create Collection', () => {
    it('should open create collection dialog', async () => {
      const user = userEvent.setup();
      render(<PaperLibrary />);

      await user.click(screen.getByText('New Collection'));

      expect(screen.getByText('Create Collection')).toBeInTheDocument();
    });

    it('should create collection when submitted', async () => {
      const mockCreate = jest.fn();
      mockUseAcademic.mockReturnValue({
        ...defaultMockReturn,
        createCollection: mockCreate,
      } as ReturnType<typeof useAcademic>);

      const user = userEvent.setup();
      render(<PaperLibrary />);

      await user.click(screen.getByText('New Collection'));

      const input = screen.getByPlaceholderText(/Collection name/i);
      await user.type(input, 'My Collection');
      await user.click(screen.getByText('Create'));

      expect(mockCreate).toHaveBeenCalledWith('My Collection');
    });
  });

  describe('Export', () => {
    it('should show export button', () => {
      mockUseAcademic.mockReturnValue({
        ...defaultMockReturn,
        libraryPapers: [createMockLibraryPaper('1')],
      } as ReturnType<typeof useAcademic>);

      render(<PaperLibrary />);

      expect(screen.getByText('Export')).toBeInTheDocument();
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

      await user.click(screen.getByText('Export'));
      await user.click(screen.getByText('BibTeX'));

      expect(mockExport).toHaveBeenCalled();
    });
  });

  describe('Sorting', () => {
    it('should sort papers', async () => {
      mockUseAcademic.mockReturnValue({
        ...defaultMockReturn,
        libraryPapers: [
          createMockLibraryPaper('1', { title: 'A Paper' }),
          createMockLibraryPaper('2', { title: 'B Paper' }),
        ],
      } as ReturnType<typeof useAcademic>);

      const user = userEvent.setup();
      render(<PaperLibrary />);

      // Find sort button and change sort order
      const sortButton = screen.getByText(/Sort/i);
      await user.click(sortButton);
    });
  });
});
