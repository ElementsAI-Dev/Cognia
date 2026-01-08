/**
 * Tests for Academic Search Tool
 */

import {
  academicSearchTool,
  formatAcademicResultsForAI,
} from './academic-search-tool';

describe('Academic Search Tool', () => {
  describe('academicSearchTool', () => {
    it('should have correct tool definition', () => {
      expect(academicSearchTool.name).toBe('academic_search');
      expect(academicSearchTool.description).toContain('Search academic databases');
      expect(academicSearchTool.parameters).toBeDefined();
    });

    it('should have execute function', () => {
      expect(typeof academicSearchTool.execute).toBe('function');
    });
  });

  describe('formatAcademicResultsForAI', () => {
    it('should format empty results', () => {
      const result = {
        success: true,
        query: 'test query',
        papers: [],
        totalResults: 0,
        providerResults: {},
        searchTime: 100,
      };

      const formatted = formatAcademicResultsForAI(result);

      expect(formatted).toContain('No academic papers found');
      expect(formatted).toContain('test query');
    });

    it('should format results with papers', () => {
      const result = {
        success: true,
        query: 'machine learning',
        papers: [
          {
            id: '1',
            providerId: 'arxiv' as const,
            externalId: '2301.00001',
            title: 'Test Paper Title',
            abstract: 'Test abstract content',
            authors: [{ name: 'John Doe', affiliation: '' }],
            year: 2023,
            citationCount: 50,
            isOpenAccess: true,
            pdfUrl: 'https://arxiv.org/pdf/2301.00001.pdf',
            urls: [],
            metadata: {},
            createdAt: new Date(),
            updatedAt: new Date(),
            fetchedAt: new Date(),
          },
        ],
        totalResults: 1,
        providerResults: { arxiv: { count: 1, success: true } },
        searchTime: 500,
      };

      const formatted = formatAcademicResultsForAI(result);

      expect(formatted).toContain('Academic Search Results');
      expect(formatted).toContain('machine learning');
      expect(formatted).toContain('Test Paper Title');
      expect(formatted).toContain('John Doe');
      expect(formatted).toContain('2023');
    });
  });
});
