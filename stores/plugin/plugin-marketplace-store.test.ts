/**
 * Plugin Marketplace Store Tests
 * Validates Record-based state (favorites, installProgress, userReviews)
 */

import { act } from '@testing-library/react';
import {
  usePluginMarketplaceStore,
  selectFavoriteCount,
  selectIsInstalling,
  selectInstallStage,
} from './plugin-marketplace-store';

describe('usePluginMarketplaceStore', () => {
  beforeEach(() => {
    act(() => {
      usePluginMarketplaceStore.getState().reset();
    });
  });

  // ===========================================================================
  // Favorites (Record<string, true>)
  // ===========================================================================

  describe('favorites', () => {
    it('should start with empty favorites', () => {
      const state = usePluginMarketplaceStore.getState();
      expect(state.favorites).toEqual({});
      expect(state.getFavoriteIds()).toEqual([]);
    });

    it('should add a favorite', () => {
      act(() => {
        usePluginMarketplaceStore.getState().toggleFavorite('plugin-a');
      });
      const state = usePluginMarketplaceStore.getState();
      expect(state.favorites).toEqual({ 'plugin-a': true });
      expect(state.isFavorite('plugin-a')).toBe(true);
      expect(state.getFavoriteIds()).toEqual(['plugin-a']);
    });

    it('should remove a favorite on second toggle', () => {
      act(() => {
        usePluginMarketplaceStore.getState().toggleFavorite('plugin-a');
        usePluginMarketplaceStore.getState().toggleFavorite('plugin-a');
      });
      const state = usePluginMarketplaceStore.getState();
      expect(state.isFavorite('plugin-a')).toBe(false);
      expect(state.getFavoriteIds()).toEqual([]);
    });

    it('should track multiple favorites', () => {
      act(() => {
        usePluginMarketplaceStore.getState().toggleFavorite('a');
        usePluginMarketplaceStore.getState().toggleFavorite('b');
        usePluginMarketplaceStore.getState().toggleFavorite('c');
      });
      const ids = usePluginMarketplaceStore.getState().getFavoriteIds();
      expect(ids).toHaveLength(3);
      expect(ids).toContain('a');
      expect(ids).toContain('b');
      expect(ids).toContain('c');
    });
  });

  // ===========================================================================
  // Recently Viewed
  // ===========================================================================

  describe('recentlyViewed', () => {
    it('should add recently viewed plugin', () => {
      act(() => {
        usePluginMarketplaceStore.getState().addRecentlyViewed('plugin-1');
      });
      expect(usePluginMarketplaceStore.getState().recentlyViewed).toEqual(['plugin-1']);
    });

    it('should move duplicate to front', () => {
      act(() => {
        usePluginMarketplaceStore.getState().addRecentlyViewed('a');
        usePluginMarketplaceStore.getState().addRecentlyViewed('b');
        usePluginMarketplaceStore.getState().addRecentlyViewed('a');
      });
      expect(usePluginMarketplaceStore.getState().recentlyViewed).toEqual(['a', 'b']);
    });

    it('should limit to 20 items', () => {
      act(() => {
        for (let i = 0; i < 25; i++) {
          usePluginMarketplaceStore.getState().addRecentlyViewed(`p-${i}`);
        }
      });
      expect(usePluginMarketplaceStore.getState().recentlyViewed).toHaveLength(20);
      expect(usePluginMarketplaceStore.getState().recentlyViewed[0]).toBe('p-24');
    });

    it('should clear recently viewed', () => {
      act(() => {
        usePluginMarketplaceStore.getState().addRecentlyViewed('a');
        usePluginMarketplaceStore.getState().clearRecentlyViewed();
      });
      expect(usePluginMarketplaceStore.getState().recentlyViewed).toEqual([]);
    });
  });

  // ===========================================================================
  // Install Progress (Record<string, InstallProgressInfo>)
  // ===========================================================================

  describe('installProgress', () => {
    it('should set install progress', () => {
      act(() => {
        usePluginMarketplaceStore.getState().setInstallProgress('p1', {
          pluginId: 'p1',
          stage: 'downloading',
          progress: 50,
          message: 'Downloading...',
        });
      });
      const progress = usePluginMarketplaceStore.getState().getInstallProgress('p1');
      expect(progress).toBeDefined();
      expect(progress?.stage).toBe('downloading');
      expect(progress?.progress).toBe(50);
    });

    it('should clear install progress', () => {
      act(() => {
        usePluginMarketplaceStore.getState().setInstallProgress('p1', {
          pluginId: 'p1',
          stage: 'complete',
          progress: 100,
          message: 'Done',
        });
        usePluginMarketplaceStore.getState().clearInstallProgress('p1');
      });
      expect(usePluginMarketplaceStore.getState().getInstallProgress('p1')).toBeUndefined();
    });

    it('should report isInstalling correctly', () => {
      act(() => {
        usePluginMarketplaceStore.getState().setInstallProgress('p1', {
          pluginId: 'p1',
          stage: 'installing',
          progress: 60,
          message: 'Installing...',
        });
      });
      expect(usePluginMarketplaceStore.getState().isInstalling('p1')).toBe(true);

      act(() => {
        usePluginMarketplaceStore.getState().setInstallProgress('p1', {
          pluginId: 'p1',
          stage: 'complete',
          progress: 100,
          message: 'Done',
        });
      });
      expect(usePluginMarketplaceStore.getState().isInstalling('p1')).toBe(false);
    });

    it('should return false for unknown plugin', () => {
      expect(usePluginMarketplaceStore.getState().isInstalling('unknown')).toBe(false);
    });
  });

  // ===========================================================================
  // User Reviews (Record<string, UserReview>)
  // ===========================================================================

  describe('userReviews', () => {
    it('should submit a review', () => {
      act(() => {
        usePluginMarketplaceStore.getState().submitReview('p1', 5, 'Great plugin!');
      });
      const review = usePluginMarketplaceStore.getState().getUserReview('p1');
      expect(review).toBeDefined();
      expect(review?.rating).toBe(5);
      expect(review?.content).toBe('Great plugin!');
      expect(review?.pluginId).toBe('p1');
    });

    it('should overwrite review for same plugin', () => {
      act(() => {
        usePluginMarketplaceStore.getState().submitReview('p1', 3, 'OK');
        usePluginMarketplaceStore.getState().submitReview('p1', 5, 'Updated');
      });
      const review = usePluginMarketplaceStore.getState().getUserReview('p1');
      expect(review?.rating).toBe(5);
      expect(review?.content).toBe('Updated');
    });

    it('should return undefined for unreviewed plugin', () => {
      expect(usePluginMarketplaceStore.getState().getUserReview('none')).toBeUndefined();
    });
  });

  // ===========================================================================
  // Search History
  // ===========================================================================

  describe('searchHistory', () => {
    it('should add search query', () => {
      act(() => {
        usePluginMarketplaceStore.getState().addSearchHistory('react');
      });
      expect(usePluginMarketplaceStore.getState().searchHistory).toEqual(['react']);
    });

    it('should ignore empty queries', () => {
      act(() => {
        usePluginMarketplaceStore.getState().addSearchHistory('   ');
      });
      expect(usePluginMarketplaceStore.getState().searchHistory).toEqual([]);
    });

    it('should deduplicate and move to front', () => {
      act(() => {
        usePluginMarketplaceStore.getState().addSearchHistory('a');
        usePluginMarketplaceStore.getState().addSearchHistory('b');
        usePluginMarketplaceStore.getState().addSearchHistory('a');
      });
      expect(usePluginMarketplaceStore.getState().searchHistory).toEqual(['a', 'b']);
    });

    it('should limit to 50 items', () => {
      act(() => {
        for (let i = 0; i < 55; i++) {
          usePluginMarketplaceStore.getState().addSearchHistory(`q-${i}`);
        }
      });
      expect(usePluginMarketplaceStore.getState().searchHistory).toHaveLength(50);
    });

    it('should clear search history', () => {
      act(() => {
        usePluginMarketplaceStore.getState().addSearchHistory('test');
        usePluginMarketplaceStore.getState().clearSearchHistory();
      });
      expect(usePluginMarketplaceStore.getState().searchHistory).toEqual([]);
    });
  });

  // ===========================================================================
  // View Mode
  // ===========================================================================

  describe('viewMode', () => {
    it('should default to grid', () => {
      expect(usePluginMarketplaceStore.getState().viewMode).toBe('grid');
    });

    it('should switch to list', () => {
      act(() => {
        usePluginMarketplaceStore.getState().setViewMode('list');
      });
      expect(usePluginMarketplaceStore.getState().viewMode).toBe('list');
    });
  });

  // ===========================================================================
  // Reset
  // ===========================================================================

  describe('reset', () => {
    it('should reset all state', () => {
      act(() => {
        usePluginMarketplaceStore.getState().toggleFavorite('x');
        usePluginMarketplaceStore.getState().addRecentlyViewed('y');
        usePluginMarketplaceStore.getState().addSearchHistory('z');
        usePluginMarketplaceStore.getState().setViewMode('list');
        usePluginMarketplaceStore.getState().submitReview('p', 5, 'good');
        usePluginMarketplaceStore.getState().setInstallProgress('p', {
          pluginId: 'p',
          stage: 'downloading',
          progress: 10,
          message: 'msg',
        });
      });

      act(() => {
        usePluginMarketplaceStore.getState().reset();
      });

      const state = usePluginMarketplaceStore.getState();
      expect(state.favorites).toEqual({});
      expect(state.recentlyViewed).toEqual([]);
      expect(state.searchHistory).toEqual([]);
      expect(state.viewMode).toBe('grid');
      expect(state.userReviews).toEqual({});
      expect(state.installProgress).toEqual({});
    });
  });

  // ===========================================================================
  // Selectors
  // ===========================================================================

  describe('selectors', () => {
    it('selectFavoriteCount should return correct count', () => {
      act(() => {
        usePluginMarketplaceStore.getState().toggleFavorite('a');
        usePluginMarketplaceStore.getState().toggleFavorite('b');
      });
      const state = usePluginMarketplaceStore.getState();
      expect(selectFavoriteCount(state)).toBe(2);
    });

    it('selectIsInstalling should return correct value', () => {
      act(() => {
        usePluginMarketplaceStore.getState().setInstallProgress('p1', {
          pluginId: 'p1',
          stage: 'installing',
          progress: 50,
          message: 'Installing...',
        });
      });
      const state = usePluginMarketplaceStore.getState();
      expect(selectIsInstalling('p1')(state)).toBe(true);
      expect(selectIsInstalling('p2')(state)).toBe(false);
    });

    it('selectInstallStage should return stage or idle', () => {
      act(() => {
        usePluginMarketplaceStore.getState().setInstallProgress('p1', {
          pluginId: 'p1',
          stage: 'downloading',
          progress: 30,
          message: 'Downloading...',
        });
      });
      const state = usePluginMarketplaceStore.getState();
      expect(selectInstallStage('p1')(state)).toBe('downloading');
      expect(selectInstallStage('unknown')(state)).toBe('idle');
    });
  });
});
