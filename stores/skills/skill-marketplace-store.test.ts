/**
 * Skills Marketplace Store Tests
 */

import { act, renderHook } from '@testing-library/react';
import { useSkillMarketplaceStore } from './skill-marketplace-store';
import {
  DEFAULT_SKILLS_MARKETPLACE_FILTERS,
  type SkillsMarketplaceItem,
} from '@/types/skill/skill-marketplace';
import {
  selectSkillMarketplaceItems,
  selectSkillMarketplaceLoading,
  selectSkillMarketplaceError,
  selectSkillMarketplaceApiKey,
} from './skill-marketplace-store';

// Mock the marketplace API
jest.mock('@/lib/skills/marketplace', () => ({
  searchSkillsMarketplace: jest.fn(),
  aiSearchSkillsMarketplace: jest.fn(),
  fetchSkillDetail: jest.fn(),
  downloadSkillContent: jest.fn(),
  filterSkillsLocally: jest.fn((items) => items),
  getUniqueSkillTags: jest.fn(() => []),
  getUniqueSkillCategories: jest.fn(() => []),
}));

// Mock parser
jest.mock('@/lib/skills/parser', () => ({
  parseSkillMd: jest.fn((content: string) => ({
    metadata: { name: 'parsed-skill', description: 'Parsed description' },
    content: content.replace(/^---\s*\n[\s\S]*?\n---\s*\n?/, ''),
  })),
  inferCategoryFromContent: jest.fn(() => 'development'),
  extractTagsFromContent: jest.fn(() => ['auto-tag']),
}));

// Mock skill store
const mockImportSkill = jest.fn(() => ({ id: 'installed-skill-id', metadata: { name: 'test' } }));
jest.mock('./skill-store', () => ({
  useSkillStore: {
    getState: () => ({
      createSkill: jest.fn(() => ({ id: 'test-skill-id' })),
      updateSkill: jest.fn(),
      getAllSkills: jest.fn(() => []),
      importSkill: mockImportSkill,
    }),
  },
}));

// Get mocked functions
const mockMarketplace = jest.requireMock('@/lib/skills/marketplace');
const mockParser = jest.requireMock('@/lib/skills/parser');

describe('Skill Marketplace Store', () => {
  beforeEach(() => {
    // Reset store state completely
    useSkillMarketplaceStore.setState({
      items: [],
      filters: DEFAULT_SKILLS_MARKETPLACE_FILTERS,
      isLoading: false,
      error: null,
      lastSearched: null,
      currentPage: 1,
      totalPages: 1,
      totalItems: 0,
      selectedItem: null,
      selectedDetail: null,
      isLoadingDetail: false,
      installingItems: new Map(),
      installErrors: new Map(),
      apiKey: null,
      favorites: new Set(),
      searchHistory: [],
      viewMode: 'grid',
    });
    jest.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should have correct initial values', () => {
      const { result } = renderHook(() => useSkillMarketplaceStore());

      expect(result.current.items).toEqual([]);
      expect(result.current.filters).toEqual(DEFAULT_SKILLS_MARKETPLACE_FILTERS);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.currentPage).toBe(1);
      expect(result.current.viewMode).toBe('grid');
    });
  });

  describe('API Key Management', () => {
    it('should set API key', () => {
      const { result } = renderHook(() => useSkillMarketplaceStore());

      act(() => {
        result.current.setApiKey('test-api-key');
      });

      expect(result.current.apiKey).toBe('test-api-key');
      expect(result.current.hasApiKey()).toBe(true);
    });

    it('should clear API key', () => {
      const { result } = renderHook(() => useSkillMarketplaceStore());

      act(() => {
        result.current.setApiKey('test-api-key');
      });

      act(() => {
        result.current.setApiKey(null);
      });

      expect(result.current.apiKey).toBeNull();
      expect(result.current.hasApiKey()).toBe(false);
    });
  });

  describe('Filter Management', () => {
    it('should update filters', () => {
      const { result } = renderHook(() => useSkillMarketplaceStore());

      act(() => {
        result.current.setFilters({ sortBy: 'recent', limit: 50 });
      });

      expect(result.current.filters.sortBy).toBe('recent');
      expect(result.current.filters.limit).toBe(50);
      expect(result.current.currentPage).toBe(1);
    });

    it('should reset filters', () => {
      const { result } = renderHook(() => useSkillMarketplaceStore());

      act(() => {
        result.current.setFilters({ sortBy: 'recent', query: 'test' });
      });

      act(() => {
        result.current.resetFilters();
      });

      expect(result.current.filters).toEqual(DEFAULT_SKILLS_MARKETPLACE_FILTERS);
    });
  });

  describe('Search', () => {
    it('should require API key for search', async () => {
      const { result } = renderHook(() => useSkillMarketplaceStore());

      await act(async () => {
        result.current.setFilters({ query: 'test' });
        await result.current.searchSkills('test');
      });

      expect(result.current.error).toBe('API key is required. Configure it in settings.');
    });

    it('should clear items for empty query', async () => {
      const { result } = renderHook(() => useSkillMarketplaceStore());

      act(() => {
        result.current.setApiKey('test-key');
      });

      await act(async () => {
        await result.current.searchSkills('');
      });

      expect(result.current.items).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it('should perform search successfully', async () => {
      const mockItems = [
        { id: '1', name: 'Test Skill', description: 'Test' },
      ];

      mockMarketplace.searchSkillsMarketplace.mockResolvedValueOnce({
        success: true,
        data: mockItems,
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      });

      const { result } = renderHook(() => useSkillMarketplaceStore());

      act(() => {
        result.current.setApiKey('test-key');
      });

      await act(async () => {
        await result.current.searchSkills('test');
      });

      expect(result.current.items).toEqual(mockItems);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle search error', async () => {
      mockMarketplace.searchSkillsMarketplace.mockResolvedValueOnce({
        success: false,
        data: [],
        error: { message: 'Search failed' },
      });

      const { result } = renderHook(() => useSkillMarketplaceStore());

      act(() => {
        result.current.setApiKey('test-key');
      });

      await act(async () => {
        await result.current.searchSkills('test');
      });

      expect(result.current.error).toBe('Search failed');
    });
  });

  describe('Favorites', () => {
    it('should toggle favorite', () => {
      const { result } = renderHook(() => useSkillMarketplaceStore());

      act(() => {
        result.current.toggleFavorite('skill-1');
      });

      expect(result.current.isFavorite('skill-1')).toBe(true);
      expect(result.current.getFavoritesCount()).toBe(1);

      act(() => {
        result.current.toggleFavorite('skill-1');
      });

      expect(result.current.isFavorite('skill-1')).toBe(false);
      expect(result.current.getFavoritesCount()).toBe(0);
    });
  });

  describe('Search History', () => {
    it('should add to search history', () => {
      const { result } = renderHook(() => useSkillMarketplaceStore());

      act(() => {
        result.current.addToSearchHistory('react');
        result.current.addToSearchHistory('vue');
      });

      expect(result.current.searchHistory).toEqual(['vue', 'react']);
    });

    it('should not add empty queries', () => {
      const { result } = renderHook(() => useSkillMarketplaceStore());

      act(() => {
        result.current.addToSearchHistory('');
        result.current.addToSearchHistory('   ');
      });

      expect(result.current.searchHistory).toEqual([]);
    });

    it('should avoid duplicates and move to front', () => {
      const { result } = renderHook(() => useSkillMarketplaceStore());

      act(() => {
        result.current.addToSearchHistory('react');
        result.current.addToSearchHistory('vue');
        result.current.addToSearchHistory('react');
      });

      expect(result.current.searchHistory).toEqual(['react', 'vue']);
    });

    it('should limit history to 10 items', () => {
      const { result } = renderHook(() => useSkillMarketplaceStore());

      act(() => {
        for (let i = 0; i < 15; i++) {
          result.current.addToSearchHistory(`query-${i}`);
        }
      });

      expect(result.current.searchHistory).toHaveLength(10);
      expect(result.current.searchHistory[0]).toBe('query-14');
    });

    it('should clear search history', () => {
      const { result } = renderHook(() => useSkillMarketplaceStore());

      act(() => {
        result.current.addToSearchHistory('test');
        result.current.clearSearchHistory();
      });

      expect(result.current.searchHistory).toEqual([]);
    });
  });

  describe('View Mode', () => {
    it('should set view mode', () => {
      const { result } = renderHook(() => useSkillMarketplaceStore());

      act(() => {
        result.current.setViewMode('list');
      });

      expect(result.current.viewMode).toBe('list');

      act(() => {
        result.current.setViewMode('grid');
      });

      expect(result.current.viewMode).toBe('grid');
    });
  });

  describe('Item Selection', () => {
    it('should select and clear item', () => {
      const { result } = renderHook(() => useSkillMarketplaceStore());
      const mockItem = { id: '1', name: 'Test' } as unknown as SkillsMarketplaceItem;

      act(() => {
        result.current.selectItem(mockItem);
      });

      expect(result.current.selectedItem).toEqual(mockItem);

      act(() => {
        result.current.selectItem(null);
      });

      expect(result.current.selectedItem).toBeNull();
    });
  });

  describe('Installation Status', () => {
    it('should return not_installed for unknown items', () => {
      const { result } = renderHook(() => useSkillMarketplaceStore());

      expect(result.current.getInstallStatus('unknown-id')).toBe('not_installed');
    });
  });

  describe('Install Skill', () => {
    it('should install skill with parsed content and resources', async () => {
      const mockItem: SkillsMarketplaceItem = {
        id: 'test/skill',
        name: 'Test Skill',
        description: 'A test skill',
        author: 'test-author',
        repository: 'test/skill-repo',
        directory: 'skills/test',
        stars: 100,
        tags: ['existing-tag'],
        version: '1.2.0',
        license: 'MIT',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-02',
      };

      mockMarketplace.downloadSkillContent.mockResolvedValueOnce({
        skillmd: '---\nname: Test Skill\ndescription: A test skill\n---\nSkill content here',
        resources: [
          { name: 'helper.py', path: 'scripts/helper.py', content: 'print("hello")' },
        ],
      });

      const { result } = renderHook(() => useSkillMarketplaceStore());

      act(() => {
        result.current.setApiKey('test-key');
      });

      await act(async () => {
        await result.current.installSkill(mockItem);
      });

      // downloadSkillContent should be called with id and apiKey
      expect(mockMarketplace.downloadSkillContent).toHaveBeenCalledWith('test/skill', 'test-key');

      // parseSkillMd should be called with the skillmd content
      expect(mockParser.parseSkillMd).toHaveBeenCalled();

      // importSkill should be called with proper metadata
      expect(mockImportSkill).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({ name: 'parsed-skill' }),
          source: 'marketplace',
          version: '1.2.0',
          author: 'test-author',
          license: 'MIT',
        })
      );
    });

    it('should handle download failure', async () => {
      const mockItem: SkillsMarketplaceItem = {
        id: 'fail/skill',
        name: 'Fail Skill',
        description: 'Will fail',
        author: 'test',
        repository: 'fail/repo',
        directory: 'skills/fail',
        stars: 0,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-02',
      };

      mockMarketplace.downloadSkillContent.mockResolvedValueOnce(null);

      const { result } = renderHook(() => useSkillMarketplaceStore());

      act(() => {
        result.current.setApiKey('test-key');
      });

      await act(async () => {
        await result.current.installSkill(mockItem);
      });

      // Should have an install error for this item
      expect(result.current.installErrors.get('fail/skill')).toBeDefined();
    });
  });

  describe('Selectors', () => {
    it('should export selectors', () => {
      const state = useSkillMarketplaceStore.getState();

      expect(selectSkillMarketplaceItems(state)).toEqual([]);
      expect(selectSkillMarketplaceLoading(state)).toBe(false);
      expect(selectSkillMarketplaceError(state)).toBeNull();
      expect(selectSkillMarketplaceApiKey(state)).toBeNull();
    });
  });
});
