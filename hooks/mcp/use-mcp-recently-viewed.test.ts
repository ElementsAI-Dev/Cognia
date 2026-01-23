/**
 * Tests for useMcpRecentlyViewed hook
 */

import { renderHook, act } from '@testing-library/react';
import { useMcpRecentlyViewed } from './use-mcp-recently-viewed';
import { useMcpMarketplaceStore } from '@/stores/mcp';
import type { McpMarketplaceItem } from '@/types/mcp/mcp-marketplace';

// Mock the MCP marketplace store
jest.mock('@/stores/mcp', () => ({
  useMcpMarketplaceStore: jest.fn(),
}));

const mockUseMcpMarketplaceStore = useMcpMarketplaceStore as jest.MockedFunction<typeof useMcpMarketplaceStore>;

describe('useMcpRecentlyViewed', () => {
  const mockItem1: McpMarketplaceItem = {
    mcpId: 'test-mcp-1',
    name: 'Test MCP Server 1',
    author: 'Test Author 1',
    description: 'A test MCP server 1',
    githubUrl: 'https://github.com/test/mcp1',
    githubStars: 100,
    downloadCount: 1000,
    tags: ['test'],
    source: 'cline',
    verified: false,
    requiresApiKey: false,
    remote: false,
  };

  const mockItem2: McpMarketplaceItem = {
    mcpId: 'test-mcp-2',
    name: 'Test MCP Server 2',
    author: 'Test Author 2',
    description: 'A test MCP server 2',
    githubUrl: 'https://github.com/test/mcp2',
    githubStars: 200,
    downloadCount: 2000,
    tags: ['database'],
    source: 'smithery',
    verified: true,
    requiresApiKey: true,
    remote: true,
  };

  const createMockStore = (overrides: Record<string, unknown> = {}) => ({
    addToRecentlyViewed: jest.fn(),
    getRecentlyViewedItems: jest.fn().mockReturnValue([]),
    clearRecentlyViewed: jest.fn(),
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    it('should initialize with default values', () => {
      mockUseMcpMarketplaceStore.mockReturnValue(createMockStore());

      const { result } = renderHook(() => useMcpRecentlyViewed());

      expect(result.current.recentlyViewedItems).toEqual([]);
      expect(typeof result.current.addToRecentlyViewed).toBe('function');
      expect(typeof result.current.clearRecentlyViewed).toBe('function');
      expect(typeof result.current.isRecentlyViewed).toBe('function');
    });

    it('should use custom maxItems option', () => {
      const mockGetRecentlyViewedItems = jest.fn().mockReturnValue([mockItem1, mockItem2]);
      mockUseMcpMarketplaceStore.mockReturnValue(createMockStore({
        getRecentlyViewedItems: mockGetRecentlyViewedItems,
      }));

      const { result } = renderHook(() => useMcpRecentlyViewed({ maxItems: 10 }));

      expect(result.current.recentlyViewedItems).toEqual([mockItem1, mockItem2]);
      expect(mockGetRecentlyViewedItems).toHaveBeenCalled();
    });
  });

  describe('recentlyViewedItems', () => {
    it('should limit items to maxItems', () => {
      const mockGetRecentlyViewedItems = jest.fn().mockReturnValue([mockItem1, mockItem2, mockItem1, mockItem2]);
      mockUseMcpMarketplaceStore.mockReturnValue(createMockStore({
        getRecentlyViewedItems: mockGetRecentlyViewedItems,
      }));

      const { result } = renderHook(() => useMcpRecentlyViewed({ maxItems: 3 }));

      expect(result.current.recentlyViewedItems).toHaveLength(3);
      expect(result.current.recentlyViewedItems).toEqual([mockItem1, mockItem2, mockItem1]);
    });

    it('should use default maxItems when not specified', () => {
      const mockGetRecentlyViewedItems = jest.fn().mockReturnValue([mockItem1, mockItem2, mockItem1, mockItem2, mockItem1]);
      mockUseMcpMarketplaceStore.mockReturnValue(createMockStore({
        getRecentlyViewedItems: mockGetRecentlyViewedItems,
      }));

      const { result } = renderHook(() => useMcpRecentlyViewed());

      expect(result.current.recentlyViewedItems).toHaveLength(5); // Default maxItems is 5
    });

    it('should handle empty recently viewed items', () => {
      const mockGetRecentlyViewedItems = jest.fn().mockReturnValue([]);
      mockUseMcpMarketplaceStore.mockReturnValue(createMockStore({
        getRecentlyViewedItems: mockGetRecentlyViewedItems,
      }));

      const { result } = renderHook(() => useMcpRecentlyViewed());

      expect(result.current.recentlyViewedItems).toEqual([]);
    });

    it('should update when store items change', () => {
      const mockGetRecentlyViewedItems = jest.fn()
        .mockReturnValueOnce([mockItem1])
        .mockReturnValueOnce([mockItem1, mockItem2]);
      
      mockUseMcpMarketplaceStore.mockReturnValue(createMockStore({
        getRecentlyViewedItems: mockGetRecentlyViewedItems,
        addToRecentlyViewed: jest.fn(),
        clearRecentlyViewed: jest.fn(),
      }));

      const { result, rerender } = renderHook(() => useMcpRecentlyViewed());

      expect(result.current.recentlyViewedItems).toEqual([mockItem1]);

      rerender();

      expect(result.current.recentlyViewedItems).toEqual([mockItem1, mockItem2]);
    });
  });

  describe('addToRecentlyViewed', () => {
    it('should call store addToRecentlyViewed with mcpId', () => {
      const mockAddToRecentlyViewed = jest.fn();
      mockUseMcpMarketplaceStore.mockReturnValue(createMockStore({
        addToRecentlyViewed: mockAddToRecentlyViewed,
      }));

      const { result } = renderHook(() => useMcpRecentlyViewed());

      act(() => {
        result.current.addToRecentlyViewed('test-mcp-id');
      });

      expect(mockAddToRecentlyViewed).toHaveBeenCalledWith('test-mcp-id');
    });

    it('should handle different mcpId values', () => {
      const mockAddToRecentlyViewed = jest.fn();
      mockUseMcpMarketplaceStore.mockReturnValue(createMockStore({
        addToRecentlyViewed: mockAddToRecentlyViewed,
      }));

      const { result } = renderHook(() => useMcpRecentlyViewed());

      const testIds = ['mcp-1', 'mcp-2', 'server-abc', 'another-id'];

      testIds.forEach(id => {
        act(() => {
          result.current.addToRecentlyViewed(id);
        });
      });

      expect(mockAddToRecentlyViewed).toHaveBeenCalledTimes(testIds.length);
      testIds.forEach(id => {
        expect(mockAddToRecentlyViewed).toHaveBeenCalledWith(id);
      });
    });

    it('should handle empty string mcpId', () => {
      const mockAddToRecentlyViewed = jest.fn();
      mockUseMcpMarketplaceStore.mockReturnValue(createMockStore({
        addToRecentlyViewed: mockAddToRecentlyViewed,
      }));

      const { result } = renderHook(() => useMcpRecentlyViewed());

      act(() => {
        result.current.addToRecentlyViewed('');
      });

      expect(mockAddToRecentlyViewed).toHaveBeenCalledWith('');
    });
  });

  describe('clearRecentlyViewed', () => {
    it('should call store clearRecentlyViewed', () => {
      const mockClearRecentlyViewed = jest.fn();
      mockUseMcpMarketplaceStore.mockReturnValue(createMockStore({
        clearRecentlyViewed: mockClearRecentlyViewed,
      }));

      const { result } = renderHook(() => useMcpRecentlyViewed());

      act(() => {
        result.current.clearRecentlyViewed();
      });

      expect(mockClearRecentlyViewed).toHaveBeenCalled();
    });

    it('should handle multiple clear calls', () => {
      const mockClearRecentlyViewed = jest.fn();
      mockUseMcpMarketplaceStore.mockReturnValue(createMockStore({
        clearRecentlyViewed: mockClearRecentlyViewed,
      }));

      const { result } = renderHook(() => useMcpRecentlyViewed());

      act(() => {
        result.current.clearRecentlyViewed();
        result.current.clearRecentlyViewed();
        result.current.clearRecentlyViewed();
      });

      expect(mockClearRecentlyViewed).toHaveBeenCalledTimes(3);
    });
  });

  describe('isRecentlyViewed', () => {
    it('should return true for recently viewed items', () => {
      const mockGetRecentlyViewedItems = jest.fn().mockReturnValue([mockItem1, mockItem2]);
      mockUseMcpMarketplaceStore.mockReturnValue(createMockStore({
        getRecentlyViewedItems: mockGetRecentlyViewedItems,
      }));

      const { result } = renderHook(() => useMcpRecentlyViewed());

      expect(result.current.isRecentlyViewed('test-mcp-1')).toBe(true);
      expect(result.current.isRecentlyViewed('test-mcp-2')).toBe(true);
    });

    it('should return false for items not recently viewed', () => {
      const mockGetRecentlyViewedItems = jest.fn().mockReturnValue([mockItem1]);
      mockUseMcpMarketplaceStore.mockReturnValue(createMockStore({
        getRecentlyViewedItems: mockGetRecentlyViewedItems,
      }));

      const { result } = renderHook(() => useMcpRecentlyViewed());

      expect(result.current.isRecentlyViewed('test-mcp-2')).toBe(false);
      expect(result.current.isRecentlyViewed('non-existent')).toBe(false);
    });

    it('should return false for empty recently viewed list', () => {
      const mockGetRecentlyViewedItems = jest.fn().mockReturnValue([]);
      mockUseMcpMarketplaceStore.mockReturnValue(createMockStore({
        getRecentlyViewedItems: mockGetRecentlyViewedItems,
      }));

      const { result } = renderHook(() => useMcpRecentlyViewed());

      expect(result.current.isRecentlyViewed('test-mcp-1')).toBe(false);
    });

    it('should handle duplicate items correctly', () => {
      const mockGetRecentlyViewedItems = jest.fn().mockReturnValue([mockItem1, mockItem2, mockItem1]);
      mockUseMcpMarketplaceStore.mockReturnValue(createMockStore({
        getRecentlyViewedItems: mockGetRecentlyViewedItems,
      }));

      const { result } = renderHook(() => useMcpRecentlyViewed());

      expect(result.current.isRecentlyViewed('test-mcp-1')).toBe(true);
      expect(result.current.isRecentlyViewed('test-mcp-2')).toBe(true);
    });

    it('should update isRecentlyViewed when recentlyViewedItems changes', () => {
      const mockGetRecentlyViewedItems = jest.fn();
      mockGetRecentlyViewedItems.mockReturnValue([mockItem1]);
      
      mockUseMcpMarketplaceStore.mockReturnValue(createMockStore({
        getRecentlyViewedItems: mockGetRecentlyViewedItems,
      }));

      const { result, rerender } = renderHook(() => useMcpRecentlyViewed());

      expect(result.current.isRecentlyViewed('test-mcp-1')).toBe(true);
      expect(result.current.isRecentlyViewed('test-mcp-2')).toBe(false);

      // Change mock to return different items
      mockGetRecentlyViewedItems.mockReturnValue([mockItem2]);
      rerender();

      expect(result.current.isRecentlyViewed('test-mcp-1')).toBe(false);
      expect(result.current.isRecentlyViewed('test-mcp-2')).toBe(true);
    });
  });

  describe('maxItems behavior', () => {
    it('should respect custom maxItems limit', () => {
      const items = [mockItem1, mockItem2, mockItem1, mockItem2, mockItem1, mockItem2];
      const mockGetRecentlyViewedItems = jest.fn().mockReturnValue(items);
      mockUseMcpMarketplaceStore.mockReturnValue(createMockStore({
        getRecentlyViewedItems: mockGetRecentlyViewedItems,
      }));

      const { result } = renderHook(() => useMcpRecentlyViewed({ maxItems: 2 }));

      expect(result.current.recentlyViewedItems).toHaveLength(2);
      expect(result.current.recentlyViewedItems).toEqual([mockItem1, mockItem2]);
    });

    it('should handle maxItems of 0', () => {
      const items = [mockItem1, mockItem2];
      const mockGetRecentlyViewedItems = jest.fn().mockReturnValue(items);
      mockUseMcpMarketplaceStore.mockReturnValue(createMockStore({
        getRecentlyViewedItems: mockGetRecentlyViewedItems,
      }));

      const { result } = renderHook(() => useMcpRecentlyViewed({ maxItems: 0 }));

      expect(result.current.recentlyViewedItems).toHaveLength(0);
    });

    it('should handle maxItems larger than available items', () => {
      const items = [mockItem1, mockItem2];
      const mockGetRecentlyViewedItems = jest.fn().mockReturnValue(items);
      mockUseMcpMarketplaceStore.mockReturnValue(createMockStore({
        getRecentlyViewedItems: mockGetRecentlyViewedItems,
      }));

      const { result } = renderHook(() => useMcpRecentlyViewed({ maxItems: 10 }));

      expect(result.current.recentlyViewedItems).toHaveLength(2);
      expect(result.current.recentlyViewedItems).toEqual([mockItem1, mockItem2]);
    });
  });

  describe('edge cases', () => {
    it('should handle undefined store methods gracefully', () => {
      mockUseMcpMarketplaceStore.mockReturnValue({
        addToRecentlyViewed: jest.fn(),
        getRecentlyViewedItems: jest.fn().mockReturnValue([]),
        clearRecentlyViewed: jest.fn(),
      } as unknown);

      const { result } = renderHook(() => useMcpRecentlyViewed());

      expect(() => {
        act(() => {
          result.current.addToRecentlyViewed('test');
        });
      }).not.toThrow();

      expect(() => {
        act(() => {
          result.current.clearRecentlyViewed();
        });
      }).not.toThrow();

      expect(() => {
        result.current.isRecentlyViewed('test');
      }).not.toThrow();
    });

    it('should handle null/undefined mcpId parameters', () => {
      const mockAddToRecentlyViewed = jest.fn();
      mockUseMcpMarketplaceStore.mockReturnValue(createMockStore({
        addToRecentlyViewed: mockAddToRecentlyViewed,
      }));

      const { result } = renderHook(() => useMcpRecentlyViewed());

      act(() => {
        result.current.addToRecentlyViewed(null as unknown as string);
        result.current.addToRecentlyViewed(undefined as unknown as string);
      });

      expect(mockAddToRecentlyViewed).toHaveBeenCalledWith(null);
      expect(mockAddToRecentlyViewed).toHaveBeenCalledWith(undefined);
    });

    it('should handle isRecentlyViewed with null/undefined parameters', () => {
      const mockGetRecentlyViewedItems = jest.fn().mockReturnValue([mockItem1]);
      mockUseMcpMarketplaceStore.mockReturnValue(createMockStore({
        getRecentlyViewedItems: mockGetRecentlyViewedItems,
      }));

      const { result } = renderHook(() => useMcpRecentlyViewed());

      expect(() => {
        const _isRecent1 = result.current.isRecentlyViewed(null as unknown as string);
        const _isRecent2 = result.current.isRecentlyViewed(undefined as unknown as string);
        expect(_isRecent1).toBe(false);
        expect(_isRecent2).toBe(false);
      }).not.toThrow();
    });
  });
});
