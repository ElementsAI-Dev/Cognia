/**
 * useSkillMarketplace Hook Tests
 */

import { renderHook, act } from '@testing-library/react';
import { useSkillMarketplace } from './use-skill-marketplace';
import type { SkillsMarketplaceItem } from '@/types/skill/skill-marketplace';

// Mock stores
const mockSearchSkills = jest.fn();
const mockAiSearch = jest.fn();
const mockInstallSkill = jest.fn();
const mockSetFilters = jest.fn();
const mockResetFilters = jest.fn();
const mockSelectItem = jest.fn();
const mockFetchItemDetail = jest.fn();
const mockSetApiKey = jest.fn();
const mockClearError = jest.fn();
const mockToggleFavorite = jest.fn();
const mockIsFavorite = jest.fn();
const mockAddToSearchHistory = jest.fn();
const mockClearSearchHistory = jest.fn();
const mockSetCurrentPage = jest.fn();
const mockSetViewMode = jest.fn();
const mockGetUniqueTags = jest.fn(() => []);
const mockGetUniqueCategories = jest.fn(() => []);
const mockGetInstallStatus = jest.fn(() => 'not_installed');
const mockGetFavoritesCount = jest.fn(() => 0);

jest.mock('@/stores/skills/skill-marketplace-store', () => ({
  useSkillMarketplaceStore: () => ({
    items: [],
    filters: { query: '', sortBy: 'stars', page: 1, limit: 20, useAiSearch: false },
    isLoading: false,
    error: null,
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    selectedItem: null,
    selectedDetail: null,
    isLoadingDetail: false,
    viewMode: 'grid',
    searchHistory: [],
    apiKey: 'test-api-key',
    favorites: new Set(),
    installingItems: new Map(),
    installErrors: new Map(),
    searchSkills: mockSearchSkills,
    aiSearch: mockAiSearch,
    installSkill: mockInstallSkill,
    setFilters: mockSetFilters,
    resetFilters: mockResetFilters,
    selectItem: mockSelectItem,
    fetchItemDetail: mockFetchItemDetail,
    setApiKey: mockSetApiKey,
    clearError: mockClearError,
    toggleFavorite: mockToggleFavorite,
    isFavorite: mockIsFavorite,
    addToSearchHistory: mockAddToSearchHistory,
    clearSearchHistory: mockClearSearchHistory,
    setCurrentPage: mockSetCurrentPage,
    setViewMode: mockSetViewMode,
    getUniqueTags: mockGetUniqueTags,
    getUniqueCategories: mockGetUniqueCategories,
    getInstallStatus: mockGetInstallStatus,
    getFavoritesCount: mockGetFavoritesCount,
  }),
}));

jest.mock('@/stores/skills/skill-store', () => ({
  useSkillStore: () => ({
    getAllSkills: jest.fn(() => []),
  }),
}));

describe('useSkillMarketplace Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should return initial state values', () => {
      const { result } = renderHook(() => useSkillMarketplace());

      expect(result.current.items).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.hasApiKey).toBe(true);
      expect(result.current.viewMode).toBe('grid');
    });
  });

  describe('Search Actions', () => {
    it('should call search', async () => {
      const { result } = renderHook(() => useSkillMarketplace());

      await act(async () => {
        await result.current.search('test query');
      });

      expect(mockSearchSkills).toHaveBeenCalledWith('test query');
    });

    it('should call AI search', async () => {
      const { result } = renderHook(() => useSkillMarketplace());

      await act(async () => {
        await result.current.aiSearch('semantic query');
      });

      expect(mockAiSearch).toHaveBeenCalledWith('semantic query');
    });
  });

  describe('Installation', () => {
    it('should call install for new item', async () => {
      mockInstallSkill.mockResolvedValueOnce(true);

      const { result } = renderHook(() => useSkillMarketplace());
      const mockItem: SkillsMarketplaceItem = {
        id: 'test/skill',
        name: 'Test Skill',
        description: 'A test skill',
        author: 'test',
        repository: 'test/repo',
        directory: 'skills/test',
        stars: 100,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-02',
      };

      await act(async () => {
        await result.current.install(mockItem);
      });

      expect(mockInstallSkill).toHaveBeenCalledWith(mockItem);
    });

    it('should check if item is installed', () => {
      const { result } = renderHook(() => useSkillMarketplace());
      const mockItem: SkillsMarketplaceItem = {
        id: 'test/skill',
        name: 'Test Skill',
        description: 'A test skill',
        author: 'test',
        repository: 'test/repo',
        directory: 'skills/test',
        stars: 100,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-02',
      };

      const isInstalled = result.current.isInstalled(mockItem);

      expect(isInstalled).toBe(false);
    });

    it('should get install status', () => {
      const { result } = renderHook(() => useSkillMarketplace());
      const mockItem: SkillsMarketplaceItem = {
        id: 'test/skill',
        name: 'Test Skill',
        description: 'A test skill',
        author: 'test',
        repository: 'test/repo',
        directory: 'skills/test',
        stars: 100,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-02',
      };

      const status = result.current.getInstallStatus(mockItem);

      expect(status).toBe('not_installed');
    });
  });

  describe('Filter Actions', () => {
    it('should call setFilters', () => {
      const { result } = renderHook(() => useSkillMarketplace());

      act(() => {
        result.current.setFilters({ sortBy: 'recent' });
      });

      expect(mockSetFilters).toHaveBeenCalledWith({ sortBy: 'recent' });
    });

    it('should call resetFilters', () => {
      const { result } = renderHook(() => useSkillMarketplace());

      act(() => {
        result.current.resetFilters();
      });

      expect(mockResetFilters).toHaveBeenCalled();
    });
  });

  describe('Selection Actions', () => {
    it('should call selectItem', () => {
      const { result } = renderHook(() => useSkillMarketplace());
      const mockItem = { id: 'test' } as SkillsMarketplaceItem;

      act(() => {
        result.current.selectItem(mockItem);
      });

      expect(mockSelectItem).toHaveBeenCalledWith(mockItem);
    });

    it('should call fetchItemDetail', async () => {
      const { result } = renderHook(() => useSkillMarketplace());

      await act(async () => {
        await result.current.fetchItemDetail('test-id');
      });

      expect(mockFetchItemDetail).toHaveBeenCalledWith('test-id');
    });
  });

  describe('API Key Management', () => {
    it('should call setApiKey', () => {
      const { result } = renderHook(() => useSkillMarketplace());

      act(() => {
        result.current.setApiKey('new-key');
      });

      expect(mockSetApiKey).toHaveBeenCalledWith('new-key');
    });
  });

  describe('Error Handling', () => {
    it('should call clearError', () => {
      const { result } = renderHook(() => useSkillMarketplace());

      act(() => {
        result.current.clearError();
      });

      expect(mockClearError).toHaveBeenCalled();
    });
  });

  describe('Favorites', () => {
    it('should call toggleFavorite', () => {
      const { result } = renderHook(() => useSkillMarketplace());

      act(() => {
        result.current.toggleFavorite('skill-id');
      });

      expect(mockToggleFavorite).toHaveBeenCalledWith('skill-id');
    });

    it('should call isFavorite', () => {
      const { result } = renderHook(() => useSkillMarketplace());

      result.current.isFavorite('skill-id');

      expect(mockIsFavorite).toHaveBeenCalledWith('skill-id');
    });

    it('should return favorites count', () => {
      const { result } = renderHook(() => useSkillMarketplace());

      expect(result.current.favoritesCount).toBe(0);
    });
  });

  describe('Search History', () => {
    it('should call addToSearchHistory', () => {
      const { result } = renderHook(() => useSkillMarketplace());

      act(() => {
        result.current.addToSearchHistory('react');
      });

      expect(mockAddToSearchHistory).toHaveBeenCalledWith('react');
    });

    it('should call clearSearchHistory', () => {
      const { result } = renderHook(() => useSkillMarketplace());

      act(() => {
        result.current.clearSearchHistory();
      });

      expect(mockClearSearchHistory).toHaveBeenCalled();
    });
  });

  describe('Pagination', () => {
    it('should call setCurrentPage', () => {
      const { result } = renderHook(() => useSkillMarketplace());

      act(() => {
        result.current.setCurrentPage(2);
      });

      expect(mockSetCurrentPage).toHaveBeenCalledWith(2);
    });
  });

  describe('View Mode', () => {
    it('should call setViewMode', () => {
      const { result } = renderHook(() => useSkillMarketplace());

      act(() => {
        result.current.setViewMode('list');
      });

      expect(mockSetViewMode).toHaveBeenCalledWith('list');
    });
  });

  describe('Computed Properties', () => {
    it('should return unique tags', () => {
      const { result } = renderHook(() => useSkillMarketplace());

      result.current.getUniqueTags();

      expect(mockGetUniqueTags).toHaveBeenCalled();
    });

    it('should return unique categories', () => {
      const { result } = renderHook(() => useSkillMarketplace());

      result.current.getUniqueCategories();

      expect(mockGetUniqueCategories).toHaveBeenCalled();
    });
  });
});
