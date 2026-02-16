'use client';

/**
 * Feature flags for plugin management page optimization
 * Allows gradual rollout and easy rollback of new features
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Feature flags interface
export interface PluginFeatureFlags {
  /** Use new sidebar layout instead of tabs */
  useNewLayout: boolean;
  /** Enable animations and transitions */
  enableAnimations: boolean;
  /** Enable gesture support on mobile */
  enableGestures: boolean;
  /** Enable virtual scrolling for long lists */
  enableVirtualScroll: boolean;
  /** Show experimental features */
  showExperimental: boolean;
}

// Default feature flags
const DEFAULT_FLAGS: PluginFeatureFlags = {
  useNewLayout: true,
  enableAnimations: true,
  enableGestures: false,
  enableVirtualScroll: false,
  showExperimental: false,
};

// Feature flags store with persistence
interface FeatureFlagsStore extends PluginFeatureFlags {
  /** Set a specific flag */
  setFlag: <K extends keyof PluginFeatureFlags>(
    key: K,
    value: PluginFeatureFlags[K]
  ) => void;
  /** Set multiple flags at once */
  setFlags: (flags: Partial<PluginFeatureFlags>) => void;
  /** Reset all flags to defaults */
  resetFlags: () => void;
  /** Get all flags */
  getFlags: () => PluginFeatureFlags;
}

export const usePluginFeatureFlags = create<FeatureFlagsStore>()(
  persist(
    (set, get) => ({
      ...DEFAULT_FLAGS,

      setFlag: (key, value) => {
        set({ [key]: value });
      },

      setFlags: (flags) => {
        set(flags);
      },

      resetFlags: () => {
        set(DEFAULT_FLAGS);
      },

      getFlags: () => {
        const state = get();
        return {
          useNewLayout: state.useNewLayout,
          enableAnimations: state.enableAnimations,
          enableGestures: state.enableGestures,
          enableVirtualScroll: state.enableVirtualScroll,
          showExperimental: state.showExperimental,
        };
      },
    }),
    {
      name: 'plugin-feature-flags',
      version: 1,
    }
  )
);

// Utility functions for checking flags
export const isFeatureEnabled = (flag: keyof PluginFeatureFlags): boolean => {
  return usePluginFeatureFlags.getState()[flag];
};

export const getFeatureFlags = (): PluginFeatureFlags => {
  return usePluginFeatureFlags.getState().getFlags();
};

export const setFeatureFlag = <K extends keyof PluginFeatureFlags>(
  key: K,
  value: PluginFeatureFlags[K]
): void => {
  usePluginFeatureFlags.getState().setFlag(key, value);
};

// Feature flag constants for external use
export const FEATURE_FLAGS = {
  NEW_LAYOUT: 'useNewLayout' as const,
  ANIMATIONS: 'enableAnimations' as const,
  GESTURES: 'enableGestures' as const,
  VIRTUAL_SCROLL: 'enableVirtualScroll' as const,
  EXPERIMENTAL: 'showExperimental' as const,
};

// Hook for components that need to react to flag changes
export function useFeatureFlag(flag: keyof PluginFeatureFlags): boolean {
  return usePluginFeatureFlags((state) => state[flag]);
}

// Hook for all flags
export function useAllFeatureFlags(): PluginFeatureFlags {
  return usePluginFeatureFlags((state) => state.getFlags());
}

export default usePluginFeatureFlags;
