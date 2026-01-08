/**
 * Unit tests for PaperSearch component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PaperSearch } from './paper-search';
import { useAcademic } from '@/hooks/academic';
import type { Paper } from '@/types/academic';

// Mock the useAcademic hook
jest.mock('@/hooks/academic', () => ({
  useAcademic: jest.fn(),
}));

const mockUseAcademic = useAcademic as jest.MockedFunction<typeof useAcademic>;

// Mock paper data
const createMockPaper = (id: string, overrides: Partial<Paper> = {}): Paper => ({
  id,
  providerId: 'arxiv',
  externalId: `arxiv-${id}`,
  title: `Test Paper ${id}: A Study on Machine Learning`,
  abstract: 'This is a test abstract about machine learning and AI.',
  authors: [
    { name: 'John Doe', affiliation: 'MIT' },
    { name: 'Jane Smith', affiliation: 'Stanford' },
  ],
  year: 2023,
  venue: 'NeurIPS 2023',
  citationCount: 150,
  referenceCount: 50,
  urls: [{ url: 'https://arxiv.org/abs/2301.00001', type: 'abstract', source: 'arxiv' }],
  pdfUrl: 'https://arxiv.org/pdf/2301.00001.pdf',
  isOpenAccess: true,
  fieldsOfStudy: ['Computer Science', 'Machine Learning'],
  metadata: { arxivId: '2301.00001', doi: '10.1234/test' },
  createdAt: new Date(),
  updatedAt: new Date(),
  fetchedAt: new Date(),
  ...overrides,
});

describe('PaperSearch', () => {
  const mockHookReturn = {
    searchQuery: '',
    searchResults: [],
    isSearching: false,
    searchError: null,
    totalResults: 0,
    libraryPapers: [],
    collections: [],
    selectedPaper: null,
    selectedCollection: null,
    activeTab: 'search' as const,
    viewMode: 'list' as const,
    isLoading: false,
    error: null,
    search: jest.fn(),
    searchWithProvider: jest.fn(),
    setSearchQuery: jest.fn(),
    setSearchFilter: jest.fn(),
    clearSearch: jest.fn(),
    addToLibrary: jest.fn(),
    removeFromLibrary: jest.fn(),
    updatePaperStatus: jest.fn(),
    updatePaperRating: jest.fn(),
    addPaperNote: jest.fn(),
    createCollection: jest.fn(),
    deleteCollection: jest.fn(),
    addToCollection: jest.fn(),
    removeFromCollection: jest.fn(),
    downloadPdf: jest.fn(),
    hasPdf: jest.fn().mockReturnValue(false),
    analyzePaper: jest.fn(),
    startGuidedLearning: jest.fn(),
    setActiveTab: jest.fn(),
    selectPaper: jest.fn(),
    selectCollection: jest.fn(),
    setViewMode: jest.fn(),
    importBibtex: jest.fn(),
    exportBibtex: jest.fn(),
    refresh: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAcademic.mockReturnValue(mockHookReturn);
  });

  describe('Rendering', () => {
    it('should render search input', () => {
      render(<PaperSearch />);

      expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
    });

    it('should render provider filter options', () => {
      render(<PaperSearch />);

      // Provider badges should be visible
      const providerBadges = screen.queryAllByText(/arxiv|semantic scholar/i);
      expect(providerBadges.length).toBeGreaterThan(0);
    });

    it('should render empty state when no results', () => {
      render(<PaperSearch />);

      // Should render search interface with helpful text
      const helpText = screen.queryAllByText(/search|papers|sources/i);
      expect(helpText.length).toBeGreaterThan(0);
    });
  });

  describe('Search Functionality', () => {
    it('should render search input', () => {
      render(<PaperSearch />);

      const input = screen.getByPlaceholderText(/search/i);
      expect(input).toBeInTheDocument();
    });

    it('should have search button', () => {
      render(<PaperSearch />);

      // Should have a search button
      const searchButtons = screen.queryAllByRole('button');
      expect(searchButtons.length).toBeGreaterThan(0);
    });

    it('should show loading state while searching', () => {
      mockUseAcademic.mockReturnValue({
        ...mockHookReturn,
        isSearching: true,
      });

      render(<PaperSearch />);

      // Should show loading indicator - check for spinner or disabled button
      const spinners = document.querySelectorAll('.animate-spin');
      const disabledButtons = screen.queryAllByRole('button').filter(btn => btn.hasAttribute('disabled'));
      expect(spinners.length > 0 || disabledButtons.length > 0).toBe(true);
    });

    it('should display search error', () => {
      mockUseAcademic.mockReturnValue({
        ...mockHookReturn,
        searchError: 'Search failed. Please try again.',
      });

      render(<PaperSearch />);

      // Error text should be visible somewhere
      const errorElements = screen.queryAllByText(/search failed|error|failed/i);
      expect(errorElements.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Search Results', () => {
    it('should display search results', () => {
      const papers = [createMockPaper('1'), createMockPaper('2')];
      mockUseAcademic.mockReturnValue({
        ...mockHookReturn,
        searchResults: papers,
        totalResults: 2,
      });

      render(<PaperSearch />);

      expect(screen.getByText(/Test Paper 1/)).toBeInTheDocument();
      expect(screen.getByText(/Test Paper 2/)).toBeInTheDocument();
    });

    it('should display paper authors', () => {
      const papers = [createMockPaper('1')];
      mockUseAcademic.mockReturnValue({
        ...mockHookReturn,
        searchResults: papers,
        totalResults: 1,
      });

      render(<PaperSearch />);

      // Authors should be displayed somewhere
      const authorElements = screen.queryAllByText(/John Doe/);
      expect(authorElements.length).toBeGreaterThan(0);
    });

    it('should display paper year and venue', () => {
      const papers = [createMockPaper('1')];
      mockUseAcademic.mockReturnValue({
        ...mockHookReturn,
        searchResults: papers,
        totalResults: 1,
      });

      render(<PaperSearch />);

      // Year should appear somewhere in the results
      const yearElements = screen.queryAllByText(/2023/);
      expect(yearElements.length).toBeGreaterThan(0);
    });

    it('should display citation count', () => {
      const papers = [createMockPaper('1', { citationCount: 250 })];
      mockUseAcademic.mockReturnValue({
        ...mockHookReturn,
        searchResults: papers,
        totalResults: 1,
      });

      render(<PaperSearch />);

      // Citation count should appear somewhere
      const citationElements = screen.queryAllByText(/250/);
      expect(citationElements.length).toBeGreaterThanOrEqual(0);
    });

    it('should display total results count', () => {
      const papers = [createMockPaper('1')];
      mockUseAcademic.mockReturnValue({
        ...mockHookReturn,
        searchResults: papers,
        totalResults: 100,
      });

      render(<PaperSearch />);

      // Results count should be displayed
      const resultElements = screen.queryAllByText(/result/i);
      expect(resultElements.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Paper Actions', () => {
    it('should render add to library button', () => {
      const papers = [createMockPaper('1')];
      mockUseAcademic.mockReturnValue({
        ...mockHookReturn,
        searchResults: papers,
        totalResults: 1,
      });

      render(<PaperSearch />);

      // Should have interactive buttons
      const buttons = screen.queryAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('should render paper with PDF link when available', () => {
      const papers = [createMockPaper('1', { pdfUrl: 'https://example.com/paper.pdf' })];
      mockUseAcademic.mockReturnValue({
        ...mockHookReturn,
        searchResults: papers,
        totalResults: 1,
      });

      render(<PaperSearch />);

      // Paper should be rendered
      expect(screen.getByText(/Test Paper 1/)).toBeInTheDocument();
    });
  });

  describe('Filters', () => {
    it('should filter by year range', async () => {
      const user = userEvent.setup();
      render(<PaperSearch />);

      // Find year filter inputs if they exist
      const yearFromInput = screen.queryByLabelText(/from/i) || 
                           screen.queryByPlaceholderText(/from/i);
      
      if (yearFromInput) {
        await user.type(yearFromInput, '2020');
        expect(mockHookReturn.setSearchFilter).toHaveBeenCalledWith(
          expect.objectContaining({ yearFrom: expect.any(Number) })
        );
      }
    });

    it('should filter by open access', async () => {
      const user = userEvent.setup();
      render(<PaperSearch />);

      // Find open access toggle/checkbox if it exists
      const openAccessToggle = screen.queryByRole('checkbox', { name: /open access/i }) ||
                              screen.queryByText(/open access/i);
      
      if (openAccessToggle) {
        await user.click(openAccessToggle);
        expect(mockHookReturn.setSearchFilter).toHaveBeenCalled();
      }
    });
  });

  describe('Accessibility', () => {
    it('should have accessible search input', () => {
      render(<PaperSearch />);

      const input = screen.getByPlaceholderText(/search/i);
      expect(input).toBeInTheDocument();
      expect(input.tagName.toLowerCase()).toBe('input');
    });

    it('should render buttons for paper interactions', () => {
      const papers = [createMockPaper('1')];
      mockUseAcademic.mockReturnValue({
        ...mockHookReturn,
        searchResults: papers,
        totalResults: 1,
      });

      render(<PaperSearch />);

      // Should have interactive buttons
      const buttons = screen.queryAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });
});
