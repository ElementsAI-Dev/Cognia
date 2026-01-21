/**
 * Hook for managing recently viewed MCP marketplace items
 * Extracts recently viewed logic from mcp-marketplace.tsx
 */

import { useMemo, useCallback } from 'react';
import { useMcpMarketplaceStore } from '@/stores/mcp';
import type { McpMarketplaceItem } from '@/types/mcp/mcp-marketplace';

export interface UseMcpRecentlyViewedOptions {
  maxItems?: number;
}

export interface UseMcpRecentlyViewedReturn {
  recentlyViewedItems: McpMarketplaceItem[];
  addToRecentlyViewed: (mcpId: string) => void;
  clearRecentlyViewed: () => void;
  isRecentlyViewed: (mcpId: string) => boolean;
}

export function useMcpRecentlyViewed(
  options: UseMcpRecentlyViewedOptions = {}
): UseMcpRecentlyViewedReturn {
  const { maxItems = 5 } = options;

  const {
    addToRecentlyViewed: storeAddToRecentlyViewed,
    getRecentlyViewedItems,
    clearRecentlyViewed: storeClearRecentlyViewed,
  } = useMcpMarketplaceStore();

  // Get recently viewed items (limited)
  const recentlyViewedItems = useMemo(
    () => getRecentlyViewedItems().slice(0, maxItems),
    [getRecentlyViewedItems, maxItems]
  );

  // Add to recently viewed
  const addToRecentlyViewed = useCallback(
    (mcpId: string) => {
      storeAddToRecentlyViewed(mcpId);
    },
    [storeAddToRecentlyViewed]
  );

  // Clear recently viewed
  const clearRecentlyViewed = useCallback(() => {
    storeClearRecentlyViewed();
  }, [storeClearRecentlyViewed]);

  // Check if an item is recently viewed
  const isRecentlyViewed = useCallback(
    (mcpId: string) => {
      return recentlyViewedItems.some((item) => item.mcpId === mcpId);
    },
    [recentlyViewedItems]
  );

  return {
    recentlyViewedItems,
    addToRecentlyViewed,
    clearRecentlyViewed,
    isRecentlyViewed,
  };
}
