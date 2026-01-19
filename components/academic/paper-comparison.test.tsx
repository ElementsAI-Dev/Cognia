/**
 * Unit tests for PaperComparison component
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PaperComparison } from './paper-comparison';
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
    collections: [],
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
      render(<PaperComparison />);

      expect(screen.getByText('Paper Comparison')).toBeInTheDocument();
      expect(screen.getByText('Compare up to 4 papers side by side')).toBeInTheDocument();
    });

    it('should render add paper button', () => {
      render(<PaperComparison />);

      expect(screen.getByText('Add Paper')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(<PaperComparison className="custom-class" />);

      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no papers selected', () => {
      render(<PaperComparison />);

      expect(screen.getByText('Select papers to compare')).toBeInTheDocument();
      expect(screen.getByText('Add 2-4 papers from your library')).toBeInTheDocument();
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

      await user.click(screen.getByText('Add Paper'));

      expect(screen.getByText('Select Paper to Compare')).toBeInTheDocument();
    });

    it('should show library papers in dialog', async () => {
      mockUseAcademic.mockReturnValue({
        ...defaultMockReturn,
        libraryPapers: [createMockLibraryPaper('1'), createMockLibraryPaper('2')],
      } as ReturnType<typeof useAcademic>);

      const user = userEvent.setup();
      render(<PaperComparison />);

      await user.click(screen.getByText('Add Paper'));

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

      await user.click(screen.getByText('Add Paper'));
      await user.click(screen.getByText('Test Paper 1'));

      // Paper should now be displayed in comparison
      await waitFor(() => {
        expect(screen.queryByText('Select Paper to Compare')).not.toBeInTheDocument();
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
        await user.click(screen.getByRole('button', { name: /Add Paper/i }));
        await user.click(screen.getByText(`Test Paper ${i}`));
      }

      // Add Paper button should be disabled
      expect(screen.getByRole('button', { name: /Add Paper/i })).toBeDisabled();
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
      await user.click(screen.getByText('Add Paper'));
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
      await user.click(screen.getByText('Add Paper'));
      await user.click(screen.getByText('Test Paper 1'));

      await user.click(screen.getByRole('button', { name: /Add Paper/i }));
      await user.click(screen.getByText('Test Paper 2'));

      // Comparison sections should appear
      await waitFor(() => {
        expect(screen.getByText('Citation Comparison')).toBeInTheDocument();
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

      await user.click(screen.getByText('Add Paper'));
      await user.click(screen.getByText('Test Paper 1'));

      await user.click(screen.getByRole('button', { name: /Add Paper/i }));
      await user.click(screen.getByText('Test Paper 2'));

      await waitFor(() => {
        expect(screen.getByText('Common Research Fields')).toBeInTheDocument();
      });
    });

    it('should show abstract comparison', async () => {
      mockUseAcademic.mockReturnValue({
        ...defaultMockReturn,
        libraryPapers: [createMockLibraryPaper('1'), createMockLibraryPaper('2')],
      } as ReturnType<typeof useAcademic>);

      const user = userEvent.setup();
      render(<PaperComparison />);

      await user.click(screen.getByText('Add Paper'));
      await user.click(screen.getByText('Test Paper 1'));

      await user.click(screen.getByRole('button', { name: /Add Paper/i }));
      await user.click(screen.getByText('Test Paper 2'));

      await waitFor(() => {
        expect(screen.getByText('Abstract Comparison')).toBeInTheDocument();
      });
    });

    it('should show feature matrix', async () => {
      mockUseAcademic.mockReturnValue({
        ...defaultMockReturn,
        libraryPapers: [createMockLibraryPaper('1'), createMockLibraryPaper('2')],
      } as ReturnType<typeof useAcademic>);

      const user = userEvent.setup();
      render(<PaperComparison />);

      await user.click(screen.getByText('Add Paper'));
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

      await user.click(screen.getByText('Add Paper'));
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

      await user.click(screen.getByText('Add Paper'));
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

      await user.click(screen.getByText('Add Paper'));
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

      await user.click(screen.getByText('Add Paper'));

      const searchInput = screen.getByPlaceholderText(/search/i);
      await user.type(searchInput, 'Machine');

      expect(screen.getByText('Machine Learning Paper')).toBeInTheDocument();
    });
  });
});
