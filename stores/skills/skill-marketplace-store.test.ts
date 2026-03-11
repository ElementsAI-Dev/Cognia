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
import { promoteSkillToNative } from '@/lib/skills/skill-actions';
import { isNativeSkillAvailable } from '@/lib/native/skill';

jest.mock('zustand', () => jest.requireActual('zustand'));
jest.mock('zustand/middleware', () => jest.requireActual('zustand/middleware'));

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
  toHyphenCase: jest.fn((value: string) =>
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-+/g, '-')
  ),
  inferCategoryFromContent: jest.fn(() => 'development'),
  extractTagsFromContent: jest.fn(() => ['auto-tag']),
}));

jest.mock('@/lib/skills/skill-actions', () => ({
  promoteSkillToNative: jest.fn(),
  buildNativeLinkedSkillUpdate: jest.fn((_skill, installed, error) => ({
    source: 'imported',
    nativeSkillId: installed.id,
    nativeDirectory: installed.directory,
    syncOrigin: 'native',
    lastSyncError: error ?? null,
  })),
}));

jest.mock('@/lib/native/skill', () => ({
  isNativeSkillAvailable: jest.fn(() => false),
}));

// Mock skill store
const mockImportSkill = jest.fn<any, any[]>(() => ({ id: 'installed-skill-id', metadata: { name: 'test' } }));
const mockUpdateSkill = jest.fn();
const mockGetAllSkills = jest.fn<any[], []>(() => []);
jest.mock('./skill-store', () => ({
  useSkillStore: {
    getState: () => ({
      createSkill: jest.fn(() => ({ id: 'test-skill-id' })),
      updateSkill: mockUpdateSkill,
      getAllSkills: mockGetAllSkills,
      importSkill: mockImportSkill,
    }),
  },
}));

// Get mocked functions
const mockMarketplace = jest.requireMock('@/lib/skills/marketplace');
const mockParser = jest.requireMock('@/lib/skills/parser');
const mockPromoteSkillToNative = jest.mocked(promoteSkillToNative);
const mockIsNativeSkillAvailable = jest.mocked(isNativeSkillAvailable);

describe('Skill Marketplace Store', () => {
  beforeEach(() => {
    // Reset store state completely
    useSkillMarketplaceStore.setState({
      items: [],
      filters: DEFAULT_SKILLS_MARKETPLACE_FILTERS,
      isLoading: false,
      error: null,
      errorCategory: null,
      lastSearched: null,
      lastDiagnostic: null,
      currentPage: 1,
      totalPages: 1,
      totalItems: 0,
      selectedItem: null,
      selectedDetail: null,
      isLoadingDetail: false,
      installingItems: new Map(),
      installErrors: new Map(),
      installRetryMetadata: new Map(),
      apiKey: null,
      favorites: new Set(),
      searchHistory: [],
      viewMode: 'grid',
    });
    jest.clearAllMocks();
    mockGetAllSkills.mockReturnValue([]);
    mockIsNativeSkillAvailable.mockReturnValue(false);
    mockPromoteSkillToNative.mockResolvedValue({
      outcome: 'success',
      directory: 'parsed-skill',
      error: null,
    } as Awaited<ReturnType<typeof promoteSkillToNative>>);
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

      expect(result.current.error).toBe('i18n:marketplace.errors.auth');
      expect(result.current.errorCategory).toBe('auth');
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
      expect(result.current.lastDiagnostic?.operation).toBe('search');
      expect(result.current.lastDiagnostic?.outcome).toBe('success');
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

      expect(result.current.error).toBe('i18n:marketplace.errors.unknown');
      expect(result.current.errorCategory).toBe('unknown');
    });

    it('dispatches page navigation search using canonical state', async () => {
      mockMarketplace.searchSkillsMarketplace.mockResolvedValue({
        success: true,
        data: [{ id: '1', name: 'Test Skill', description: 'Test' }],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 3 },
      });

      const { result } = renderHook(() => useSkillMarketplaceStore());

      act(() => {
        result.current.setApiKey('test-key');
        result.current.setFilters({ query: 'test' });
      });

      await act(async () => {
        await result.current.searchSkills();
      });

      mockMarketplace.searchSkillsMarketplace.mockResolvedValue({
        success: true,
        data: [{ id: '2', name: 'Test Skill 2', description: 'Test 2' }],
        pagination: { page: 2, limit: 20, total: 2, totalPages: 3 },
      });

      await act(async () => {
        result.current.setCurrentPage(2);
        await Promise.resolve();
      });

      expect(mockMarketplace.searchSkillsMarketplace).toHaveBeenLastCalledWith(
        'test',
        expect.objectContaining({ page: 2, sortBy: 'stars' })
      );
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

    it('prefers canonical marketplace identity and migrates legacy-name linkage', () => {
      const mockItem: SkillsMarketplaceItem = {
        id: 'owner/repo/legacy-skill',
        name: 'Legacy Skill',
        description: 'legacy',
        author: 'owner',
        repository: 'owner/repo',
        directory: 'skills/legacy-skill',
        stars: 10,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-02',
      };

      mockGetAllSkills.mockReturnValue([
        {
          id: 'legacy-id',
          metadata: { name: 'legacy-skill', description: 'legacy' },
          source: 'marketplace',
          canonicalId: 'frontend:legacy-skill',
          nativeSkillId: undefined,
          nativeDirectory: undefined,
        },
      ]);

      const { result } = renderHook(() => useSkillMarketplaceStore());
      const installed = result.current.isItemInstalled(mockItem.id, mockItem);

      expect(installed).toBe(true);
      expect(mockUpdateSkill).toHaveBeenCalledWith(
        'legacy-id',
        expect.objectContaining({
          marketplaceSkillId: mockItem.id,
        })
      );
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

    it('marks install as retryable error when desktop native promotion partially fails', async () => {
      const mockItem: SkillsMarketplaceItem = {
        id: 'desktop/skill',
        name: 'Desktop Skill',
        description: 'Desktop skill',
        author: 'desktop-author',
        repository: 'desktop/repo',
        directory: 'skills/desktop',
        stars: 120,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-02',
      };

      mockIsNativeSkillAvailable.mockReturnValue(true);
      mockMarketplace.downloadSkillContent.mockResolvedValueOnce({
        skillmd: '---\\nname: desktop-skill\\ndescription: desktop\\n---\\nDesktop content',
        resources: [],
      });
      mockPromoteSkillToNative.mockResolvedValueOnce({
        outcome: 'partial',
        directory: 'desktop-skill',
        error: 'i18n:nativePromotionPartial',
        retryable: true,
      } as Awaited<ReturnType<typeof promoteSkillToNative>>);

      const { result } = renderHook(() => useSkillMarketplaceStore());
      act(() => {
        result.current.setApiKey('desktop-key');
      });

      await act(async () => {
        const installed = await result.current.installSkill(mockItem);
        expect(installed).toBe(false);
      });

      expect(result.current.getInstallStatus('desktop/skill')).toBe('error');
      expect(result.current.installErrors.get('desktop/skill')).toBe('i18n:nativePromotionPartial');
      expect(result.current.installRetryMetadata.get('desktop/skill')).toBeDefined();
    });

    it('retries native promotion using stored retry metadata', async () => {
      const mockItem: SkillsMarketplaceItem = {
        id: 'retry/skill',
        name: 'Retry Skill',
        description: 'Retry skill',
        author: 'retry-author',
        repository: 'retry/repo',
        directory: 'skills/retry',
        stars: 42,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-02',
      };

      const existingSkill = {
        id: 'installed-skill-id',
        metadata: { name: 'retry-skill', description: 'retry' },
      };

      mockIsNativeSkillAvailable.mockReturnValue(true);
      mockMarketplace.downloadSkillContent.mockResolvedValueOnce({
        skillmd: '---\\nname: retry-skill\\ndescription: retry\\n---\\nretry content',
        resources: [],
      });
      mockPromoteSkillToNative
        .mockResolvedValueOnce({
          outcome: 'partial',
          directory: 'retry-skill',
          error: 'i18n:nativePromotionPartial',
          retryable: true,
        } as Awaited<ReturnType<typeof promoteSkillToNative>>)
        .mockResolvedValueOnce({
          outcome: 'success',
          directory: 'retry-skill',
          error: null,
          data: {
            id: 'local:retry-skill',
            directory: 'retry-skill',
          },
        } as Awaited<ReturnType<typeof promoteSkillToNative>>);

      mockImportSkill.mockReturnValue(existingSkill as never);

      const { result } = renderHook(() => useSkillMarketplaceStore());
      act(() => {
        result.current.setApiKey('retry-key');
      });

      await act(async () => {
        await result.current.installSkill(mockItem);
      });

      expect(result.current.getInstallStatus('retry/skill')).toBe('error');
      mockGetAllSkills.mockReturnValue([existingSkill]);

      await act(async () => {
        const installed = await result.current.installSkill(mockItem);
        expect(installed).toBe(true);
      });

      expect(result.current.getInstallStatus('retry/skill')).toBe('installed');
      expect(result.current.installRetryMetadata.get('retry/skill')).toBeUndefined();
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
