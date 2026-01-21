/**
 * Hook for managing MCP marketplace favorites
 * Extracts favorites logic from mcp-marketplace.tsx
 */

import { useMemo, useCallback } from 'react';
import { useMcpMarketplaceStore } from '@/stores/mcp';

export interface UseMcpFavoritesReturn {
  showFavoritesOnly: boolean;
  favoritesCount: number;
  setShowFavoritesOnly: (show: boolean) => void;
  toggleFavorite: (mcpId: string) => void;
  isFavorite: (mcpId: string) => boolean;
}

export function useMcpFavorites(): UseMcpFavoritesReturn {
  const {
    showFavoritesOnly,
    setShowFavoritesOnly,
    toggleFavorite: storeToggleFavorite,
    isFavorite: storeIsFavorite,
    getFavoritesCount,
  } = useMcpMarketplaceStore();

  // Get favorites count
  const favoritesCount = useMemo(() => getFavoritesCount(), [getFavoritesCount]);

  // Toggle favorite
  const toggleFavorite = useCallback(
    (mcpId: string) => {
      storeToggleFavorite(mcpId);
    },
    [storeToggleFavorite]
  );

  // Check if an item is a favorite
  const isFavorite = useCallback(
    (mcpId: string) => {
      return storeIsFavorite(mcpId);
    },
    [storeIsFavorite]
  );

  return {
    showFavoritesOnly,
    favoritesCount,
    setShowFavoritesOnly,
    toggleFavorite,
    isFavorite,
  };
}
