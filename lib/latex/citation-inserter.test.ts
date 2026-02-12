/**
 * Citation Inserter - Unit Tests
 */

import citationInserterApi, {
  generateCitationKey,
  generateBibTeX,
  formatCitation,
} from './citation-inserter';
import type { Paper } from '@/types/academic';

const mockPaper: Paper = {
  id: 'test-paper-1',
  providerId: 'semantic-scholar',
  externalId: 'ext-1',
  title: 'Deep Learning for Natural Language Processing',
  authors: [
    { name: 'John Smith' },
    { name: 'Jane Doe' },
  ],
  abstract: 'This paper presents a novel approach to NLP using deep learning.',
  year: 2023,
  venue: 'Conference on Machine Learning',
  citationCount: 100,
  urls: [],
  metadata: {},
  createdAt: new Date(),
  updatedAt: new Date(),
  fetchedAt: new Date(),
};

const _mockPaper2: Paper = {
  id: 'test-paper-2',
  providerId: 'semantic-scholar',
  externalId: 'ext-2',
  title: 'Attention Is All You Need',
  authors: [{ name: 'Ashish Vaswani' }],
  abstract: 'The dominant sequence transduction models are based on RNNs...',
  year: 2017,
  venue: 'NeurIPS',
  citationCount: 50000,
  urls: [],
  metadata: { doi: '10.5555/3295222.3295349' },
  createdAt: new Date(),
  updatedAt: new Date(),
  fetchedAt: new Date(),
};

describe('Citation Inserter', () => {
  describe('generateCitationKey', () => {
    it('should generate key from author and year', () => {
      const key = generateCitationKey(mockPaper);
      expect(key).toBeDefined();
      expect(key.length).toBeGreaterThan(0);
    });

    it('should handle papers without year', () => {
      const paperNoYear = { ...mockPaper, year: undefined };
      const key = generateCitationKey(paperNoYear);
      expect(key).toBeDefined();
    });

    it('should avoid collision with existing keys', () => {
      const key1 = generateCitationKey(mockPaper);
      const key2 = generateCitationKey(mockPaper, [key1]);
      expect(key2).not.toBe(key1);
    });

    it('should handle papers with no authors', () => {
      const paperNoAuthor = { ...mockPaper, authors: [] };
      const key = generateCitationKey(paperNoAuthor);
      expect(key).toBeDefined();
    });
  });

  describe('generateBibTeX', () => {
    it('should generate valid BibTeX entry', () => {
      const bibtex = generateBibTeX(mockPaper, 'smith2023deep');
      expect(bibtex).toContain('@');
      expect(bibtex).toContain('smith2023deep');
      expect(bibtex).toContain('title');
      expect(bibtex).toContain('author');
    });

    it('should include DOI when available', () => {
      const paperWithDOI = {
        ...mockPaper,
        metadata: { doi: '10.1234/test.123' },
      };
      const bibtex = generateBibTeX(paperWithDOI, 'testdoi');
      expect(bibtex).toContain('doi = {10.1234/test.123}');
    });

    it('should include year', () => {
      const bibtex = generateBibTeX(mockPaper, 'smith2023deep');
      expect(bibtex).toContain('2023');
    });
  });

  describe('formatCitation', () => {
    const mockEntry = {
      key: 'smith2023deep',
      paper: mockPaper,
      bibtex: '@article{smith2023deep}',
      formatted: {
        apa: 'Smith (2023)',
        mla: 'Smith',
        chicago: 'Smith',
        harvard: 'Smith',
        ieee: '[1]',
        simple: 'Smith 2023',
      },
    };

    it('should format APA style citation', () => {
      const citation = formatCitation(mockEntry, { style: 'apa', format: 'inline' });
      expect(citation).toBeDefined();
      expect(citation.length).toBeGreaterThan(0);
    });

    it('should format MLA style citation', () => {
      const citation = formatCitation(mockEntry, { style: 'mla', format: 'inline' });
      expect(citation).toBeDefined();
    });

    it('should format Chicago style citation', () => {
      const citation = formatCitation(mockEntry, { style: 'chicago', format: 'inline' });
      expect(citation).toBeDefined();
    });

    it('should format IEEE style citation', () => {
      const citation = formatCitation(mockEntry, { style: 'ieee', format: 'inline' });
      expect(citation).toBeDefined();
    });

    it('should format Harvard style citation', () => {
      const citation = formatCitation(mockEntry, { style: 'harvard', format: 'inline' });
      expect(citation).toBeDefined();
    });
  });

  describe('default export API', () => {
    it('should export all functions', () => {
      expect(citationInserterApi.generateCitationKey).toBeDefined();
      expect(citationInserterApi.generateBibTeX).toBeDefined();
      expect(citationInserterApi.formatCitation).toBeDefined();
      expect(citationInserterApi.formatMultipleCitations).toBeDefined();
      expect(citationInserterApi.extractCitationContext).toBeDefined();
      expect(citationInserterApi.getCitationSuggestions).toBeDefined();
      expect(citationInserterApi.createCitationLibrary).toBeDefined();
      expect(citationInserterApi.addToCitationLibrary).toBeDefined();
      expect(citationInserterApi.removeFromCitationLibrary).toBeDefined();
      expect(citationInserterApi.markCitationUsed).toBeDefined();
      expect(citationInserterApi.exportLibraryToBibTeX).toBeDefined();
    });

    it('should create and manage citation library', () => {
      const library = citationInserterApi.createCitationLibrary();
      expect(library).toBeDefined();
      expect(library.entries).toBeDefined();
      expect(library.collections).toBeDefined();
      expect(library.recentlyUsed).toBeDefined();
      expect(library.favorites).toBeDefined();
    });
  });
});
