/**
 * Observability Dashboard Store
 *
 * Persists dashboard UI preferences across navigation.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TimeRange, DashboardTab } from '@/types/observability';

interface ObservabilityDashboardState {
  timeRange: TimeRange;
  activeTab: DashboardTab;
  autoRefresh: boolean;
}

interface ObservabilityDashboardActions {
  setTimeRange: (timeRange: TimeRange) => void;
  setActiveTab: (tab: DashboardTab) => void;
  setAutoRefresh: (enabled: boolean) => void;
}

type ObservabilityDashboardStore = ObservabilityDashboardState & ObservabilityDashboardActions;

export const useObservabilityDashboardStore = create<ObservabilityDashboardStore>()(
  persist(
    (set) => ({
      timeRange: '24h',
      activeTab: 'overview',
      autoRefresh: false,

      setTimeRange: (timeRange) => set({ timeRange }),
      setActiveTab: (tab) => set({ activeTab: tab }),
      setAutoRefresh: (enabled) => set({ autoRefresh: enabled }),
    }),
    {
      name: 'cognia-observability-dashboard',
      partialize: (state) => ({
        timeRange: state.timeRange,
        activeTab: state.activeTab,
        autoRefresh: state.autoRefresh,
      }),
    }
  )
);
