/**
 * Tests for MCP Marketplace API functions
 */

import {
  fetchMcpMarketplace,
  fetchClineMarketplace,
  fetchSmitheryMarketplace,
  fetchGlamaMarketplace,
  downloadMcpServer,
  filterMarketplaceItems,
  getUniqueTags,
  formatDownloadCount,
  formatStarCount,
} from './marketplace';
import type { McpMarketplaceItem, McpMarketplaceFilters } from '@/types/mcp-marketplace';

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Helper to create mock marketplace item
const createMockItem = (
  id: string,
  options: Partial<McpMarketplaceItem> = {}
): McpMarketplaceItem => ({
  mcpId: id,
  name: `Server ${id}`,
  author: 'test-author',
  description: `Description for ${id}`,
  githubUrl: `https://github.com/test/${id}`,
  githubStars: 100,
  downloadCount: 50,
  tags: ['test'],
  requiresApiKey: false,
  source: 'cline',
  ...options,
});

describe('MCP Marketplace API', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  describe('fetchClineMarketplace', () => {
    it('fetches Cline marketplace successfully', async () => {
      const mockData = [
        { mcpId: 'server-1', name: 'Server 1', author: 'author1', description: 'Desc', githubUrl: '', githubStars: 10, downloadCount: 5, tags: [] },
        { mcpId: 'server-2', name: 'Server 2', author: 'author2', description: 'Desc', githubUrl: '', githubStars: 20, downloadCount: 10, tags: [] },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockData),
      });

      const result = await fetchClineMarketplace();

      expect(result.items.length).toBe(2);
      expect(result.source).toBe('cline');
      expect(result.items[0].source).toBe('cline');
    });

    it('handles Cline API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Internal Server Error',
      });

      await expect(fetchClineMarketplace()).rejects.toThrow('Cline API error');
    });

    it('handles invalid response data', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ invalid: 'data' }),
      });

      await expect(fetchClineMarketplace()).rejects.toThrow('Invalid response');
    });
  });

  describe('fetchSmitheryMarketplace', () => {
    it('fetches Smithery marketplace successfully', async () => {
      const mockData = {
        servers: [
          { qualifiedName: 'user/server1', displayName: 'Server 1', description: 'Desc', verified: true, useCount: 100, remote: true, createdAt: '2024-01-01', homepage: 'https://example.com' },
        ],
        pagination: { currentPage: 1, pageSize: 10, totalPages: 1, totalCount: 1 },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockData),
      });

      const result = await fetchSmitheryMarketplace('test', 1, 10, 'api-key');

      expect(result.items.length).toBe(1);
      expect(result.source).toBe('smithery');
      expect(result.items[0].verified).toBe(true);
      expect(result.items[0].remote).toBe(true);
    });

    it('handles Smithery 401 error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      });

      await expect(fetchSmitheryMarketplace()).rejects.toThrow('API key required');
    });
  });

  describe('fetchGlamaMarketplace', () => {
    it('fetches Glama marketplace successfully', async () => {
      const mockData = {
        servers: [
          { id: 'server-1', name: 'Server 1', author: 'author', description: 'Desc', stars: 500, weeklyDownloads: 200, tags: ['ai'], official: true },
        ],
        total: 1,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockData),
      });

      const result = await fetchGlamaMarketplace('test', 1, 10);

      expect(result.items.length).toBe(1);
      expect(result.source).toBe('glama');
      expect(result.items[0].verified).toBe(true);
      expect(result.items[0].githubStars).toBe(500);
    });

    it('handles Glama API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Server Error',
      });

      await expect(fetchGlamaMarketplace()).rejects.toThrow('Glama API error');
    });
  });

  describe('fetchMcpMarketplace', () => {
    it('fetches from specific source', async () => {
      const mockData = [
        { mcpId: 'server-1', name: 'Server 1', author: 'author', description: 'Desc', githubUrl: '', githubStars: 10, downloadCount: 5, tags: [] },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockData),
      });

      const result = await fetchMcpMarketplace('cline');

      expect(result.source).toBe('cline');
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('fetches from all sources and aggregates results', async () => {
      // Mock Cline response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([
          { mcpId: 'cline-server', name: 'Cline Server', author: 'author', description: 'Desc', githubUrl: '', githubStars: 10, downloadCount: 5, tags: [] },
        ]),
      });

      // Mock Smithery response (will fail without API key)
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      });

      // Mock Glama response (will fail due to CORS in test)
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'CORS Error',
      });

      const result = await fetchMcpMarketplace('all');

      // Should still return Cline results even if others fail
      expect(result.items.length).toBeGreaterThanOrEqual(1);
      expect(result.source).toBe('all');
    });
  });

  describe('downloadMcpServer', () => {
    it('downloads server details successfully', async () => {
      const mockResponse = {
        mcpId: 'test-server',
        githubUrl: 'https://github.com/test/server',
        name: 'Test Server',
        author: 'test',
        description: 'A test server',
        readmeContent: '# README',
        requiresApiKey: false,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await downloadMcpServer('test-server');

      expect(result.mcpId).toBe('test-server');
      expect(result.githubUrl).toBe('https://github.com/test/server');
      expect(result.error).toBeUndefined();
    });

    it('returns error for empty mcpId', async () => {
      const result = await downloadMcpServer('');

      expect(result.error).toBe('MCP ID is required');
    });

    it('handles 404 error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      const result = await downloadMcpServer('nonexistent');

      expect(result.error).toBe('MCP server not found in marketplace.');
    });

    it('handles 500 error', async () => {
      // Mock multiple responses for retry mechanism
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
        });

      const result = await downloadMcpServer('test-server');

      expect(result.error).toBe('Internal server error. Please try again later.');
    });
  });

  describe('filterMarketplaceItems', () => {
    const mockItems: McpMarketplaceItem[] = [
      createMockItem('server-1', { name: 'Database Server', tags: ['database', 'sql'], source: 'cline', verified: true }),
      createMockItem('server-2', { name: 'API Gateway', tags: ['api', 'gateway'], source: 'smithery', remote: true }),
      createMockItem('server-3', { name: 'File System', tags: ['files'], source: 'glama', requiresApiKey: true }),
    ];

    it('filters by search query', () => {
      const filters: McpMarketplaceFilters = {
        search: 'database',
        tags: [],
        sortBy: 'popular',
        source: 'all',
      };

      const result = filterMarketplaceItems(mockItems, filters);

      expect(result.length).toBe(1);
      expect(result[0].name).toBe('Database Server');
    });

    it('filters by source', () => {
      const filters: McpMarketplaceFilters = {
        search: '',
        tags: [],
        sortBy: 'popular',
        source: 'smithery',
      };

      const result = filterMarketplaceItems(mockItems, filters);

      expect(result.length).toBe(1);
      expect(result[0].source).toBe('smithery');
    });

    it('filters by tags', () => {
      const filters: McpMarketplaceFilters = {
        search: '',
        tags: ['api'],
        sortBy: 'popular',
        source: 'all',
      };

      const result = filterMarketplaceItems(mockItems, filters);

      expect(result.length).toBe(1);
      expect(result[0].tags).toContain('api');
    });

    it('filters by requiresApiKey', () => {
      const filters: McpMarketplaceFilters = {
        search: '',
        tags: [],
        sortBy: 'popular',
        source: 'all',
        requiresApiKey: false,
      };

      const result = filterMarketplaceItems(mockItems, filters);

      expect(result.length).toBe(2);
      expect(result.every(item => !item.requiresApiKey)).toBe(true);
    });

    it('filters by verified status', () => {
      const filters: McpMarketplaceFilters = {
        search: '',
        tags: [],
        sortBy: 'popular',
        source: 'all',
        verified: true,
      };

      const result = filterMarketplaceItems(mockItems, filters);

      expect(result.length).toBe(1);
      expect(result[0].verified).toBe(true);
    });

    it('filters by remote status', () => {
      const filters: McpMarketplaceFilters = {
        search: '',
        tags: [],
        sortBy: 'popular',
        source: 'all',
        remote: true,
      };

      const result = filterMarketplaceItems(mockItems, filters);

      expect(result.length).toBe(1);
      expect(result[0].remote).toBe(true);
    });

    it('sorts by stars', () => {
      const items = [
        createMockItem('a', { githubStars: 100 }),
        createMockItem('b', { githubStars: 500 }),
        createMockItem('c', { githubStars: 200 }),
      ];

      const filters: McpMarketplaceFilters = {
        search: '',
        tags: [],
        sortBy: 'stars',
        source: 'all',
      };

      const result = filterMarketplaceItems(items, filters);

      expect(result[0].githubStars).toBe(500);
      expect(result[1].githubStars).toBe(200);
      expect(result[2].githubStars).toBe(100);
    });

    it('sorts by name', () => {
      const items = [
        createMockItem('a', { name: 'Zebra' }),
        createMockItem('b', { name: 'Apple' }),
        createMockItem('c', { name: 'Mango' }),
      ];

      const filters: McpMarketplaceFilters = {
        search: '',
        tags: [],
        sortBy: 'name',
        source: 'all',
      };

      const result = filterMarketplaceItems(items, filters);

      expect(result[0].name).toBe('Apple');
      expect(result[1].name).toBe('Mango');
      expect(result[2].name).toBe('Zebra');
    });
  });

  describe('getUniqueTags', () => {
    it('extracts unique tags from items', () => {
      const items: McpMarketplaceItem[] = [
        createMockItem('1', { tags: ['database', 'sql'] }),
        createMockItem('2', { tags: ['api', 'database'] }),
        createMockItem('3', { tags: ['files'] }),
      ];

      const result = getUniqueTags(items);

      expect(result).toEqual(['api', 'database', 'files', 'sql']);
    });

    it('returns empty array for empty items', () => {
      const result = getUniqueTags([]);
      expect(result).toEqual([]);
    });
  });

  describe('formatDownloadCount', () => {
    it('formats millions', () => {
      expect(formatDownloadCount(1500000)).toBe('1.5M');
      expect(formatDownloadCount(2000000)).toBe('2.0M');
    });

    it('formats thousands', () => {
      expect(formatDownloadCount(1500)).toBe('1.5K');
      expect(formatDownloadCount(10000)).toBe('10.0K');
    });

    it('returns raw number for small counts', () => {
      expect(formatDownloadCount(500)).toBe('500');
      expect(formatDownloadCount(0)).toBe('0');
    });
  });

  describe('formatStarCount', () => {
    it('formats millions', () => {
      expect(formatStarCount(1200000)).toBe('1.2M');
    });

    it('formats thousands', () => {
      expect(formatStarCount(5600)).toBe('5.6K');
    });

    it('returns raw number for small counts', () => {
      expect(formatStarCount(999)).toBe('999');
    });
  });
});
