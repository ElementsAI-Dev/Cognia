/**
 * Unit tests for Citation Network utilities
 */

import {
  fetchCitationsFromSemanticScholar,
  fetchReferencesFromSemanticScholar,
  buildCitationNetwork,
  buildCitationGraph,
  findCommonCitations,
  findCommonReferences,
  type CitationNetwork,
  type CitationNode,
} from './citation-network';
import type { Paper } from '@/types/learning/academic';

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock proxyFetch to delegate to global.fetch
jest.mock('@/lib/network/proxy-fetch', () => ({
  proxyFetch: (...args: unknown[]) => (global.fetch as jest.MockedFunction<typeof fetch>)(...args as Parameters<typeof fetch>),
}));

// Mock paper data
const createMockPaper = (id: string, overrides: Partial<Paper> = {}): Paper => ({
  id,
  providerId: 'semantic-scholar',
  externalId: `ss-${id}`,
  title: `Test Paper ${id}`,
  abstract: 'Test abstract',
  authors: [{ name: 'Test Author' }],
  year: 2023,
  urls: [],
  metadata: { corpusId: id },
  createdAt: new Date(),
  updatedAt: new Date(),
  fetchedAt: new Date(),
  citationCount: 100,
  referenceCount: 50,
  ...overrides,
});

const createMockCitationNode = (id: string): CitationNode => ({
  paperId: id,
  title: `Citing Paper ${id}`,
  authors: ['Author A', 'Author B'],
  year: 2023,
  citationCount: 50,
  isInfluential: false,
  venue: 'Test Conference',
});

const createMockCitationNetwork = (paperId: string): CitationNetwork => ({
  paperId,
  paperTitle: `Paper ${paperId}`,
  citations: [
    createMockCitationNode('cite-1'),
    createMockCitationNode('cite-2'),
  ],
  references: [
    { ...createMockCitationNode('ref-1'), title: 'Reference 1' },
    { ...createMockCitationNode('ref-2'), title: 'Reference 2' },
  ],
  citationCount: 2,
  referenceCount: 2,
  influentialCitationCount: 0,
});

describe('Citation Network', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  describe('fetchCitationsFromSemanticScholar', () => {
    it('should fetch citations successfully', async () => {
      const mockResponse = {
        data: [
          {
            citingPaper: {
              paperId: 'cite-1',
              title: 'Citing Paper 1',
              authors: [{ name: 'Author A' }],
              year: 2023,
              citationCount: 10,
              isInfluential: false,
            },
          },
          {
            citingPaper: {
              paperId: 'cite-2',
              title: 'Citing Paper 2',
              authors: [{ name: 'Author B' }],
              year: 2022,
              citationCount: 20,
              isInfluential: true,
            },
          },
        ],
        total: 100,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await fetchCitationsFromSemanticScholar('paper-123', 10, 0);

      expect(result.citations.length).toBe(2);
      expect(result.total).toBe(100);
      expect(result.citations[0].paperId).toBe('cite-1');
      expect(result.citations[1].isInfluential).toBe(true);
    });

    it('should handle API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Not Found',
      });

      const result = await fetchCitationsFromSemanticScholar('invalid-id');

      expect(result.citations).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should handle network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await fetchCitationsFromSemanticScholar('paper-123');

      expect(result.citations).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('fetchReferencesFromSemanticScholar', () => {
    it('should fetch references successfully', async () => {
      const mockResponse = {
        data: [
          {
            citedPaper: {
              paperId: 'ref-1',
              title: 'Reference Paper 1',
              authors: [{ name: 'Author X' }],
              year: 2020,
            },
          },
        ],
        total: 50,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await fetchReferencesFromSemanticScholar('paper-123', 10, 0);

      expect(result.references.length).toBe(1);
      expect(result.total).toBe(50);
      expect(result.references[0].paperId).toBe('ref-1');
    });

    it('should handle empty response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      });

      const result = await fetchReferencesFromSemanticScholar('paper-123');

      expect(result.references).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('buildCitationNetwork', () => {
    it('should build network for paper with corpus ID', async () => {
      const paper = createMockPaper('paper-1', {
        metadata: { corpusId: 'corpus-123' },
      });

      // Mock both citations and references API calls
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            data: [{ citingPaper: { paperId: 'cite-1', title: 'Citing' } }],
            total: 1,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            data: [{ citedPaper: { paperId: 'ref-1', title: 'Reference' } }],
            total: 1,
          }),
        });

      const network = await buildCitationNetwork(paper);

      expect(network.paperId).toBe('paper-1');
      expect(network.citations.length).toBe(1);
      expect(network.references.length).toBe(1);
    });

    it('should use DOI when corpus ID is not available', async () => {
      const paper = createMockPaper('paper-1', {
        metadata: { doi: '10.1234/test' },
      });

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: [], total: 0 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: [], total: 0 }),
        });

      await buildCitationNetwork(paper);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('DOI:10.1234/test'),
        expect.any(Object)
      );
    });

    it('should return empty network when no identifier available', async () => {
      // Create paper with no usable identifiers (empty externalId, no corpusId/doi/arxivId)
      const paper = createMockPaper('paper-1', { 
        metadata: {},
        externalId: '',
      });

      const network = await buildCitationNetwork(paper);

      expect(network.citations).toEqual([]);
      expect(network.references).toEqual([]);
    });
  });

  describe('buildCitationGraph', () => {
    it('should build graph from network', () => {
      const network = createMockCitationNetwork('paper-1');

      const graph = buildCitationGraph(network);

      expect(graph.nodes.length).toBe(5); // 1 source + 2 citations + 2 references
      expect(graph.edges.length).toBe(4);
      
      const sourceNode = graph.nodes.find(n => n.type === 'source');
      expect(sourceNode).toBeDefined();
      expect(sourceNode?.id).toBe('paper-1');
    });

    it('should respect maxNodes option', () => {
      const network = createMockCitationNetwork('paper-1');

      const graph = buildCitationGraph(network, { maxNodes: 3 });

      expect(graph.nodes.length).toBeLessThanOrEqual(3);
    });

    it('should filter by citation/reference type', () => {
      const network = createMockCitationNetwork('paper-1');

      const citationsOnly = buildCitationGraph(network, {
        includeCitations: true,
        includeReferences: false,
      });

      expect(citationsOnly.nodes.filter(n => n.type === 'reference').length).toBe(0);
      expect(citationsOnly.nodes.filter(n => n.type === 'citation').length).toBeGreaterThan(0);

      const referencesOnly = buildCitationGraph(network, {
        includeCitations: false,
        includeReferences: true,
      });

      expect(referencesOnly.nodes.filter(n => n.type === 'citation').length).toBe(0);
      expect(referencesOnly.nodes.filter(n => n.type === 'reference').length).toBeGreaterThan(0);
    });

    it('should not add duplicate nodes', () => {
      const network: CitationNetwork = {
        paperId: 'paper-1',
        paperTitle: 'Paper 1',
        citations: [
          createMockCitationNode('shared-id'),
        ],
        references: [
          { ...createMockCitationNode('shared-id'), title: 'Same Paper' },
        ],
        citationCount: 1,
        referenceCount: 1,
        influentialCitationCount: 0,
      };

      const graph = buildCitationGraph(network);

      const sharedNodes = graph.nodes.filter(n => n.id === 'shared-id');
      expect(sharedNodes.length).toBe(1);
    });
  });

  describe('findCommonCitations', () => {
    it('should find citations common to all networks', () => {
      const network1: CitationNetwork = {
        ...createMockCitationNetwork('paper-1'),
        citations: [
          createMockCitationNode('common'),
          createMockCitationNode('unique-1'),
        ],
      };

      const network2: CitationNetwork = {
        ...createMockCitationNetwork('paper-2'),
        citations: [
          createMockCitationNode('common'),
          createMockCitationNode('unique-2'),
        ],
      };

      const common = findCommonCitations([network1, network2]);

      expect(common.length).toBe(1);
      expect(common[0].paperId).toBe('common');
    });

    it('should return empty for single network', () => {
      const network = createMockCitationNetwork('paper-1');

      const common = findCommonCitations([network]);

      expect(common).toEqual([]);
    });

    it('should return empty when no common citations', () => {
      const network1: CitationNetwork = {
        ...createMockCitationNetwork('paper-1'),
        citations: [createMockCitationNode('unique-1')],
      };

      const network2: CitationNetwork = {
        ...createMockCitationNetwork('paper-2'),
        citations: [createMockCitationNode('unique-2')],
      };

      const common = findCommonCitations([network1, network2]);

      expect(common).toEqual([]);
    });
  });

  describe('findCommonReferences', () => {
    it('should find references common to all networks', () => {
      const network1: CitationNetwork = {
        ...createMockCitationNetwork('paper-1'),
        references: [
          createMockCitationNode('common-ref'),
          createMockCitationNode('unique-ref-1'),
        ],
      };

      const network2: CitationNetwork = {
        ...createMockCitationNetwork('paper-2'),
        references: [
          createMockCitationNode('common-ref'),
          createMockCitationNode('unique-ref-2'),
        ],
      };

      const common = findCommonReferences([network1, network2]);

      expect(common.length).toBe(1);
      expect(common[0].paperId).toBe('common-ref');
    });
  });
});
