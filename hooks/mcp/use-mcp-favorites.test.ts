/**
 * Tests for useMcpFavorites hook
 */

import { renderHook, act } from '@testing-library/react';
import { useMcpFavorites } from './use-mcp-favorites';
import { useMcpMarketplaceStore } from '@/stores/mcp';

// Mock the MCP marketplace store
jest.mock('@/stores/mcp', () => ({
  useMcpMarketplaceStore: jest.fn(),
}));

const mockUseMcpMarketplaceStore = useMcpMarketplaceStore as jest.MockedFunction<typeof useMcpMarketplaceStore>;

describe('useMcpFavorites', () => {
  const mockToggleFavorite = jest.fn();
  const mockIsFavorite = jest.fn();
  const mockGetFavoritesCount = jest.fn();
  const mockSetShowFavoritesOnly = jest.fn();

  const createMockStore = (overrides: Record<string, unknown> = {}) => ({
    showFavoritesOnly: false,
    setShowFavoritesOnly: mockSetShowFavoritesOnly,
    toggleFavorite: mockToggleFavorite,
    isFavorite: mockIsFavorite,
    getFavoritesCount: mockGetFavoritesCount,
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetFavoritesCount.mockReturnValue(0);
    mockIsFavorite.mockReturnValue(false);
  });

  describe('initial state', () => {
    it('should return initial favorites state', () => {
      mockUseMcpMarketplaceStore.mockReturnValue(createMockStore());

      const { result } = renderHook(() => useMcpFavorites());

      expect(result.current.showFavoritesOnly).toBe(false);
      expect(result.current.favoritesCount).toBe(0);
      expect(typeof result.current.setShowFavoritesOnly).toBe('function');
      expect(typeof result.current.toggleFavorite).toBe('function');
      expect(typeof result.current.isFavorite).toBe('function');
    });

    it('should use store values correctly', () => {
      mockUseMcpMarketplaceStore.mockReturnValue(createMockStore({
        showFavoritesOnly: true,
      }));
      mockGetFavoritesCount.mockReturnValue(5);

      const { result } = renderHook(() => useMcpFavorites());

      expect(result.current.showFavoritesOnly).toBe(true);
      expect(result.current.favoritesCount).toBe(5);
    });
  });

  describe('favoritesCount', () => {
    it('should compute favorites count from store', () => {
      mockGetFavoritesCount.mockReturnValue(3);
      mockUseMcpMarketplaceStore.mockReturnValue(createMockStore());

      const { result } = renderHook(() => useMcpFavorites());

      expect(result.current.favoritesCount).toBe(3);
      expect(mockGetFavoritesCount).toHaveBeenCalled();
    });

    it('should update when store count changes', () => {
      const mockGetFavoritesCount = jest.fn()
        .mockReturnValueOnce(1)
        .mockReturnValueOnce(10);
      
      mockUseMcpMarketplaceStore.mockReturnValue(createMockStore({
        getFavoritesCount: mockGetFavoritesCount,
      }));

      const { result, rerender } = renderHook(() => useMcpFavorites());

      expect(result.current.favoritesCount).toBe(1);

      mockGetFavoritesCount.mockReturnValue(10);
      rerender();

      expect(result.current.favoritesCount).toBe(10);
    });
  });

  describe('setShowFavoritesOnly', () => {
    it('should call store setShowFavoritesOnly', () => {
      mockUseMcpMarketplaceStore.mockReturnValue(createMockStore());

      const { result } = renderHook(() => useMcpFavorites());

      act(() => {
        result.current.setShowFavoritesOnly(true);
      });

      expect(mockSetShowFavoritesOnly).toHaveBeenCalledWith(true);
    });

    it('should pass boolean parameter correctly', () => {
      mockUseMcpMarketplaceStore.mockReturnValue(createMockStore());

      const { result } = renderHook(() => useMcpFavorites());

      act(() => {
        result.current.setShowFavoritesOnly(false);
      });

      expect(mockSetShowFavoritesOnly).toHaveBeenCalledWith(false);
    });
  });

  describe('toggleFavorite', () => {
    it('should call store toggleFavorite with mcpId', () => {
      mockUseMcpMarketplaceStore.mockReturnValue(createMockStore());

      const { result } = renderHook(() => useMcpFavorites());

      act(() => {
        result.current.toggleFavorite('test-mcp-id');
      });

      expect(mockToggleFavorite).toHaveBeenCalledWith('test-mcp-id');
    });

    it('should handle different mcpId values', () => {
      mockUseMcpMarketplaceStore.mockReturnValue(createMockStore());

      const { result } = renderHook(() => useMcpFavorites());

      const testIds = ['mcp-1', 'mcp-2', 'server-abc', 'another-id'];

      testIds.forEach(id => {
        act(() => {
          result.current.toggleFavorite(id);
        });
      });

      expect(mockToggleFavorite).toHaveBeenCalledTimes(testIds.length);
      testIds.forEach(id => {
        expect(mockToggleFavorite).toHaveBeenCalledWith(id);
      });
    });

    it('should handle empty string mcpId', () => {
      mockUseMcpMarketplaceStore.mockReturnValue(createMockStore());

      const { result } = renderHook(() => useMcpFavorites());

      act(() => {
        result.current.toggleFavorite('');
      });

      expect(mockToggleFavorite).toHaveBeenCalledWith('');
    });
  });

  describe('isFavorite', () => {
    it('should call store isFavorite with mcpId', () => {
      mockIsFavorite.mockReturnValue(true);
      mockUseMcpMarketplaceStore.mockReturnValue(createMockStore());

      const { result } = renderHook(() => useMcpFavorites());

      const isFav = result.current.isFavorite('test-mcp-id');

      expect(mockIsFavorite).toHaveBeenCalledWith('test-mcp-id');
      expect(isFav).toBe(true);
    });

    it('should return false when not favorite', () => {
      mockIsFavorite.mockReturnValue(false);
      mockUseMcpMarketplaceStore.mockReturnValue(createMockStore());

      const { result } = renderHook(() => useMcpFavorites());

      const isFav = result.current.isFavorite('test-mcp-id');

      expect(isFav).toBe(false);
    });

    it('should handle multiple calls with different IDs', () => {
      mockIsFavorite.mockImplementation((id: string) => id === 'favorite-id');
      mockUseMcpMarketplaceStore.mockReturnValue(createMockStore());

      const { result } = renderHook(() => useMcpFavorites());

      expect(result.current.isFavorite('favorite-id')).toBe(true);
      expect(result.current.isFavorite('other-id')).toBe(false);
      expect(result.current.isFavorite('favorite-id')).toBe(true);

      expect(mockIsFavorite).toHaveBeenCalledTimes(3);
    });
  });

  describe('store integration', () => {
    it('should use all store methods correctly', () => {
      const storeMethods = {
        showFavoritesOnly: true,
        setShowFavoritesOnly: mockSetShowFavoritesOnly,
        toggleFavorite: mockToggleFavorite,
        isFavorite: mockIsFavorite,
        getFavoritesCount: mockGetFavoritesCount,
      };
      mockUseMcpMarketplaceStore.mockReturnValue(storeMethods);
      mockGetFavoritesCount.mockReturnValue(7);

      const { result } = renderHook(() => useMcpFavorites());

      // Test all returned properties
      expect(result.current.showFavoritesOnly).toBe(true);
      expect(result.current.favoritesCount).toBe(7);

      // Test all methods
      act(() => {
        result.current.setShowFavoritesOnly(false);
        result.current.toggleFavorite('test-id');
        result.current.isFavorite('test-id');
      });

      expect(mockSetShowFavoritesOnly).toHaveBeenCalledWith(false);
      expect(mockToggleFavorite).toHaveBeenCalledWith('test-id');
      expect(mockIsFavorite).toHaveBeenCalledWith('test-id');
    });

    it('should handle store method changes on re-render', () => {
      const newMockToggleFavorite = jest.fn();
      const newMockIsFavorite = jest.fn();
      const newMockGetFavoritesCount = jest.fn();

      mockUseMcpMarketplaceStore.mockReturnValue(createMockStore());

      const { result, rerender } = renderHook(() => useMcpFavorites());

      // Initial render
      act(() => {
        result.current.toggleFavorite('initial-id');
      });

      expect(mockToggleFavorite).toHaveBeenCalledWith('initial-id');

      // Re-render with new store methods
      mockUseMcpMarketplaceStore.mockReturnValue(createMockStore({
        toggleFavorite: newMockToggleFavorite,
        isFavorite: newMockIsFavorite,
        getFavoritesCount: newMockGetFavoritesCount,
      }));

      rerender();

      act(() => {
        result.current.toggleFavorite('new-id');
      });

      expect(newMockToggleFavorite).toHaveBeenCalledWith('new-id');
    });
  });

  describe('edge cases', () => {
    it('should handle undefined store methods gracefully', () => {
      mockUseMcpMarketplaceStore.mockReturnValue({
        showFavoritesOnly: false,
        setShowFavoritesOnly: jest.fn(),
        toggleFavorite: jest.fn(),
        isFavorite: jest.fn().mockReturnValue(false),
        getFavoritesCount: jest.fn().mockReturnValue(0),
      } as unknown);

      const { result } = renderHook(() => useMcpFavorites());

      expect(() => {
        act(() => {
          result.current.setShowFavoritesOnly(true);
        });
      }).not.toThrow();

      expect(() => {
        act(() => {
          result.current.toggleFavorite('test');
        });
      }).not.toThrow();

      expect(() => {
        result.current.isFavorite('test');
      }).not.toThrow();
    });

    it('should handle null/undefined mcpId parameters', () => {
      mockUseMcpMarketplaceStore.mockReturnValue(createMockStore());

      const { result } = renderHook(() => useMcpFavorites());

      act(() => {
        result.current.toggleFavorite(null as unknown as string);
        result.current.toggleFavorite(undefined as unknown as string);
      });

      expect(mockToggleFavorite).toHaveBeenCalledWith(null);
      expect(mockToggleFavorite).toHaveBeenCalledWith(undefined);
    });
  });
});
