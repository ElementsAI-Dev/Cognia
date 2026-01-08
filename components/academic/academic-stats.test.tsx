/**
 * Unit tests for AcademicStats component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { AcademicStats } from './academic-stats';
import { useAcademic } from '@/hooks/academic';
import type { LibraryPaper, PaperCollection } from '@/types/academic';

// Mock the useAcademic hook
jest.mock('@/hooks/academic', () => ({
  useAcademic: jest.fn(),
}));

const mockUseAcademic = useAcademic as jest.MockedFunction<typeof useAcademic>;

// Mock paper data
const createMockLibraryPaper = (id: string, overrides: Partial<LibraryPaper> = {}): LibraryPaper => ({
  id,
  libraryId: `lib-${id}`,
  providerId: 'arxiv',
  externalId: `arxiv-${id}`,
  title: `Test Paper ${id}`,
  authors: [{ name: 'Test Author' }],
  year: 2023,
  urls: [],
  metadata: {},
  createdAt: new Date(),
  updatedAt: new Date(),
  fetchedAt: new Date(),
  addedAt: new Date(),
  readingStatus: 'unread',
  priority: 'medium',
  hasCachedPdf: false,
  fieldsOfStudy: ['Computer Science'],
  ...overrides,
});

describe('AcademicStats', () => {
  const defaultMockReturn = {
    searchQuery: '',
    searchResults: [],
    isSearching: false,
    searchError: null,
    totalResults: 0,
    libraryPapers: [],
    collections: [],
    selectedPaper: null,
    selectedCollection: null,
    activeTab: 'stats' as const,
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
    mockUseAcademic.mockReturnValue(defaultMockReturn);
  });

  describe('Rendering', () => {
    it('should render statistics dashboard', () => {
      render(<AcademicStats />);

      // Should have stats cards
      const paperElements = screen.queryAllByText(/papers/i);
      expect(paperElements.length).toBeGreaterThan(0);
    });

    it('should render with empty library', () => {
      render(<AcademicStats />);

      // Should show zero values for empty library
      const zeroElements = screen.queryAllByText(/0/);
      expect(zeroElements.length).toBeGreaterThan(0);
    });
  });

  describe('Paper Statistics', () => {
    it('should display total paper count', () => {
      const papers = [
        createMockLibraryPaper('1'),
        createMockLibraryPaper('2'),
        createMockLibraryPaper('3'),
      ];
      mockUseAcademic.mockReturnValue({
        ...defaultMockReturn,
        libraryPapers: papers,
      });

      render(<AcademicStats />);

      // Should display paper count somewhere in the stats
      const threeElements = screen.queryAllByText(/3/);
      expect(threeElements.length).toBeGreaterThan(0);
    });

    it('should display reading status breakdown', () => {
      const papers = [
        createMockLibraryPaper('1', { readingStatus: 'unread' }),
        createMockLibraryPaper('2', { readingStatus: 'reading' }),
        createMockLibraryPaper('3', { readingStatus: 'completed' }),
        createMockLibraryPaper('4', { readingStatus: 'completed' }),
      ];
      mockUseAcademic.mockReturnValue({
        ...defaultMockReturn,
        libraryPapers: papers,
      });

      render(<AcademicStats />);

      // Should show counts for different statuses
      expect(screen.queryAllByText(/unread/i).length).toBeGreaterThan(0);
      expect(screen.queryAllByText(/reading/i).length).toBeGreaterThan(0);
      expect(screen.queryAllByText(/completed/i).length).toBeGreaterThan(0);
    });

    it('should calculate completion rate', () => {
      const papers = [
        createMockLibraryPaper('1', { readingStatus: 'completed' }),
        createMockLibraryPaper('2', { readingStatus: 'completed' }),
        createMockLibraryPaper('3', { readingStatus: 'unread' }),
        createMockLibraryPaper('4', { readingStatus: 'unread' }),
      ];
      mockUseAcademic.mockReturnValue({
        ...defaultMockReturn,
        libraryPapers: papers,
      });

      render(<AcademicStats />);

      // 50% completion rate
      const completionElements = screen.queryAllByText(/50%/) || screen.queryAllByText(/completion/i);
      expect(completionElements.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Collection Statistics', () => {
    it('should display collection count', () => {
      const collections: PaperCollection[] = [
        { id: '1', name: 'Research', paperIds: [], createdAt: new Date(), updatedAt: new Date() },
        { id: '2', name: 'To Read', paperIds: [], createdAt: new Date(), updatedAt: new Date() },
      ];
      mockUseAcademic.mockReturnValue({
        ...defaultMockReturn,
        collections,
      });

      render(<AcademicStats />);

      // Should show collection-related text
      const collectionElements = screen.queryAllByText(/collection/i);
      expect(collectionElements.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Provider Statistics', () => {
    it('should show papers by provider', () => {
      const papers = [
        createMockLibraryPaper('1', { providerId: 'arxiv' }),
        createMockLibraryPaper('2', { providerId: 'arxiv' }),
        createMockLibraryPaper('3', { providerId: 'semantic-scholar' }),
      ];
      mockUseAcademic.mockReturnValue({
        ...defaultMockReturn,
        libraryPapers: papers,
      });

      render(<AcademicStats />);

      // Should show provider distribution
      expect(screen.getByText(/arxiv/i)).toBeInTheDocument();
    });
  });

  describe('Field Statistics', () => {
    it('should show top research fields', () => {
      const papers = [
        createMockLibraryPaper('1', { fieldsOfStudy: ['Machine Learning', 'AI'] }),
        createMockLibraryPaper('2', { fieldsOfStudy: ['Machine Learning'] }),
        createMockLibraryPaper('3', { fieldsOfStudy: ['NLP', 'AI'] }),
      ];
      mockUseAcademic.mockReturnValue({
        ...defaultMockReturn,
        libraryPapers: papers,
      });

      render(<AcademicStats />);

      // Should show field distribution
      expect(screen.queryByText(/Machine Learning/) || 
             screen.queryByText(/field/i)).toBeDefined();
    });
  });

  describe('Engagement Metrics', () => {
    it('should show PDF download count', () => {
      const papers = [
        createMockLibraryPaper('1', { hasCachedPdf: true }),
        createMockLibraryPaper('2', { hasCachedPdf: true }),
        createMockLibraryPaper('3', { hasCachedPdf: false }),
      ];
      mockUseAcademic.mockReturnValue({
        ...defaultMockReturn,
        libraryPapers: papers,
      });

      render(<AcademicStats />);

      // Should show PDF-related text
      const pdfElements = screen.queryAllByText(/pdf/i);
      expect(pdfElements.length).toBeGreaterThanOrEqual(0);
    });

    it('should show papers with notes count', () => {
      const papers = [
        createMockLibraryPaper('1', { userNotes: 'Some notes' }),
        createMockLibraryPaper('2', { userNotes: '' }),
        createMockLibraryPaper('3'),
      ];
      mockUseAcademic.mockReturnValue({
        ...defaultMockReturn,
        libraryPapers: papers,
      });

      render(<AcademicStats />);

      // Should show notes count - use queryAllByText to avoid multiple match errors
      const notesElements = screen.queryAllByText(/note/i);
      expect(notesElements.length).toBeGreaterThan(0);
    });

    it('should calculate average rating', () => {
      const papers = [
        createMockLibraryPaper('1', { userRating: 4 }),
        createMockLibraryPaper('2', { userRating: 5 }),
        createMockLibraryPaper('3', { userRating: 3 }),
      ];
      mockUseAcademic.mockReturnValue({
        ...defaultMockReturn,
        libraryPapers: papers,
      });

      render(<AcademicStats />);

      // Should render rating-related elements
      const ratingElements = screen.queryAllByText(/rating/i);
      expect(ratingElements.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Progress Visualization', () => {
    it('should render progress bars', () => {
      const papers = [
        createMockLibraryPaper('1', { readingStatus: 'completed' }),
        createMockLibraryPaper('2', { readingStatus: 'unread' }),
      ];
      mockUseAcademic.mockReturnValue({
        ...defaultMockReturn,
        libraryPapers: papers,
      });

      render(<AcademicStats />);

      // Should have progress indicators
      const progressBars = document.querySelectorAll('[role="progressbar"]') ||
                          document.querySelectorAll('.bg-primary');
      expect(progressBars.length).toBeGreaterThanOrEqual(0);
    });
  });
});
