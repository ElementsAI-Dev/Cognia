/**
 * Unit tests for SmartCollections component
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SmartCollections } from './smart-collections';
import { useAcademic } from '@/hooks/academic';
import type { LibraryPaper, PaperCollection } from '@/types/learning/academic';

jest.mock('@/hooks/academic', () => ({
  useAcademic: jest.fn(),
}));

const mockUseAcademic = useAcademic as jest.MockedFunction<typeof useAcademic>;

const createMockLibraryPaper = (
  id: string,
  overrides: Partial<LibraryPaper> = {}
): LibraryPaper => ({
  id,
  providerId: 'arxiv',
  externalId: `arxiv-${id}`,
  title: `Paper ${id}`,
  abstract: 'Test abstract',
  authors: [{ name: 'Author' }],
  year: 2023,
  citationCount: 100,
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
  fieldsOfStudy: ['Machine Learning'],
  isOpenAccess: true,
  ...overrides,
});

describe('SmartCollections', () => {
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
      render(<SmartCollections />);
      expect(screen.getByText('Smart Collections')).toBeInTheDocument();
    });

    it('should render smart rules section', () => {
      render(<SmartCollections />);
      expect(screen.getByText('Smart Rules')).toBeInTheDocument();
    });

    it('should render detected topics section', () => {
      mockUseAcademic.mockReturnValue({
        ...defaultMockReturn,
        libraryPapers: [createMockLibraryPaper('1')],
      } as ReturnType<typeof useAcademic>);
      render(<SmartCollections />);
      expect(screen.getByText('Detected Topics')).toBeInTheDocument();
    });
  });

  describe('Smart Rules', () => {
    it('should display recent papers rule', () => {
      render(<SmartCollections />);
      expect(screen.getByText(/Recent Papers/i)).toBeInTheDocument();
    });

    it('should display highly cited rule', () => {
      render(<SmartCollections />);
      expect(screen.getByText(/Highly Cited/i)).toBeInTheDocument();
    });

    it('should toggle rule when switch clicked', async () => {
      const user = userEvent.setup();
      render(<SmartCollections />);

      const switches = screen.getAllByRole('switch');
      await user.click(switches[0]);
    });
  });

  describe('Topic Detection', () => {
    it('should detect topics from library papers', () => {
      mockUseAcademic.mockReturnValue({
        ...defaultMockReturn,
        libraryPapers: [
          createMockLibraryPaper('1', { fieldsOfStudy: ['Machine Learning'] }),
          createMockLibraryPaper('2', { fieldsOfStudy: ['Machine Learning'] }),
        ],
      } as ReturnType<typeof useAcademic>);

      render(<SmartCollections />);
      expect(screen.getByText('Machine Learning')).toBeInTheDocument();
    });
  });

  describe('Generate Collections', () => {
    it('should show generate button', () => {
      render(<SmartCollections />);
      expect(screen.getByText('Generate Collections')).toBeInTheDocument();
    });

    it('should create collections when generated', async () => {
      const mockCreate = jest.fn();
      mockUseAcademic.mockReturnValue({
        ...defaultMockReturn,
        libraryPapers: [createMockLibraryPaper('1')],
        createCollection: mockCreate,
      } as ReturnType<typeof useAcademic>);

      const user = userEvent.setup();
      render(<SmartCollections />);

      await user.click(screen.getByText('Generate Collections'));

      await waitFor(() => {
        expect(mockCreate).toHaveBeenCalled();
      });
    });
  });

  describe('Progress', () => {
    it('should show progress during generation', async () => {
      mockUseAcademic.mockReturnValue({
        ...defaultMockReturn,
        libraryPapers: [createMockLibraryPaper('1')],
      } as ReturnType<typeof useAcademic>);

      const user = userEvent.setup();
      render(<SmartCollections />);

      await user.click(screen.getByText('Generate Collections'));

      // Generation should trigger, button should still be visible
      expect(screen.getByText('Generate Collections')).toBeInTheDocument();
    });
  });
});
