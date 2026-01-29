/**
 * Skills Marketplace API Tests
 */

import {
  searchSkillsMarketplace,
  aiSearchSkillsMarketplace,
  filterSkillsLocally,
  getUniqueSkillTags,
  getUniqueSkillCategories,
} from './marketplace';
import type { SkillsMarketplaceItem, SkillsMarketplaceFilters } from '@/types/skill/skill-marketplace';

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('Skills Marketplace API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('searchSkillsMarketplace', () => {
    it('should return error when query is empty', async () => {
      const result = await searchSkillsMarketplace('');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('MISSING_QUERY');
    });

    it('should return error when API key is missing', async () => {
      const result = await searchSkillsMarketplace('test query');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('MISSING_API_KEY');
    });

    it('should return results on successful search', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            {
              id: 'test/skill',
              name: 'Test Skill',
              description: 'A test skill',
              author: 'test',
              repository: 'test/skill-repo',
              directory: 'skills/test',
              stars: 100,
              createdAt: '2024-01-01',
              updatedAt: '2024-01-02',
            },
          ],
          pagination: {
            page: 1,
            limit: 20,
            total: 1,
            totalPages: 1,
          },
        }),
      });

      const result = await searchSkillsMarketplace('test', { apiKey: 'sk_test_key' });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].name).toBe('Test Skill');
    });

    it('should handle 401 unauthorized error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      });

      const result = await searchSkillsMarketplace('test', { apiKey: 'invalid_key' });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_API_KEY');
    });
  });

  describe('aiSearchSkillsMarketplace', () => {
    it('should return error when query is empty', async () => {
      const result = await aiSearchSkillsMarketplace('');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('MISSING_QUERY');
    });

    it('should return error when API key is missing', async () => {
      const result = await aiSearchSkillsMarketplace('how to build a web scraper');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('MISSING_API_KEY');
    });

    it('should return results on successful AI search', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            {
              id: 'web/scraper',
              name: 'Web Scraper',
              description: 'Build web scrapers',
              author: 'developer',
              repository: 'dev/scraper',
              directory: 'skills/scraper',
              stars: 500,
              createdAt: '2024-01-01',
              updatedAt: '2024-01-02',
            },
          ],
        }),
      });

      const result = await aiSearchSkillsMarketplace('how to build a web scraper', 'sk_test_key');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].name).toBe('Web Scraper');
    });
  });

  describe('filterSkillsLocally', () => {
    const mockItems: SkillsMarketplaceItem[] = [
      {
        id: '1',
        name: 'React Skills',
        description: 'React development skills',
        author: 'dev1',
        repository: 'dev1/react',
        directory: 'skills/react',
        stars: 1000,
        tags: ['react', 'frontend'],
        category: 'development',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-10',
      },
      {
        id: '2',
        name: 'Python Data',
        description: 'Python data analysis',
        author: 'dev2',
        repository: 'dev2/python',
        directory: 'skills/python',
        stars: 500,
        tags: ['python', 'data'],
        category: 'data',
        createdAt: '2024-01-05',
        updatedAt: '2024-01-15',
      },
      {
        id: '3',
        name: 'Node.js API',
        description: 'Build APIs with Node.js',
        author: 'dev3',
        repository: 'dev3/node',
        directory: 'skills/node',
        stars: 800,
        tags: ['nodejs', 'backend'],
        category: 'development',
        createdAt: '2024-01-03',
        updatedAt: '2024-01-12',
      },
    ];

    it('should filter by query', () => {
      const filters: Partial<SkillsMarketplaceFilters> = { query: 'react' };
      const result = filterSkillsLocally(mockItems, filters);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('React Skills');
    });

    it('should filter by category', () => {
      const filters: Partial<SkillsMarketplaceFilters> = { category: 'development' };
      const result = filterSkillsLocally(mockItems, filters);

      expect(result).toHaveLength(2);
    });

    it('should filter by tags', () => {
      const filters: Partial<SkillsMarketplaceFilters> = { tags: ['python'] };
      const result = filterSkillsLocally(mockItems, filters);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Python Data');
    });

    it('should sort by stars', () => {
      const filters: Partial<SkillsMarketplaceFilters> = { sortBy: 'stars' };
      const result = filterSkillsLocally(mockItems, filters);

      expect(result[0].name).toBe('React Skills');
      expect(result[1].name).toBe('Node.js API');
      expect(result[2].name).toBe('Python Data');
    });

    it('should sort by recent', () => {
      const filters: Partial<SkillsMarketplaceFilters> = { sortBy: 'recent' };
      const result = filterSkillsLocally(mockItems, filters);

      expect(result[0].name).toBe('Python Data');
      expect(result[1].name).toBe('Node.js API');
      expect(result[2].name).toBe('React Skills');
    });
  });

  describe('getUniqueSkillTags', () => {
    it('should return unique sorted tags', () => {
      const items: SkillsMarketplaceItem[] = [
        {
          id: '1',
          name: 'Skill 1',
          description: '',
          author: '',
          repository: '',
          directory: '',
          stars: 0,
          tags: ['react', 'frontend'],
          createdAt: '',
          updatedAt: '',
        },
        {
          id: '2',
          name: 'Skill 2',
          description: '',
          author: '',
          repository: '',
          directory: '',
          stars: 0,
          tags: ['react', 'backend'],
          createdAt: '',
          updatedAt: '',
        },
      ];

      const result = getUniqueSkillTags(items);

      expect(result).toEqual(['backend', 'frontend', 'react']);
    });
  });

  describe('getUniqueSkillCategories', () => {
    it('should return unique sorted categories', () => {
      const items: SkillsMarketplaceItem[] = [
        {
          id: '1',
          name: 'Skill 1',
          description: '',
          author: '',
          repository: '',
          directory: '',
          stars: 0,
          category: 'development',
          createdAt: '',
          updatedAt: '',
        },
        {
          id: '2',
          name: 'Skill 2',
          description: '',
          author: '',
          repository: '',
          directory: '',
          stars: 0,
          category: 'data',
          createdAt: '',
          updatedAt: '',
        },
        {
          id: '3',
          name: 'Skill 3',
          description: '',
          author: '',
          repository: '',
          directory: '',
          stars: 0,
          category: 'development',
          createdAt: '',
          updatedAt: '',
        },
      ];

      const result = getUniqueSkillCategories(items);

      expect(result).toEqual(['data', 'development']);
    });
  });
});
