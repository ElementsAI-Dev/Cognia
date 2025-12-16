/**
 * Usage Store - tracks token usage and costs
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import {
  type UsageRecord,
  type DailyUsage,
  type ProviderUsage,
  calculateCost,
} from '@/types/usage';

interface UsageState {
  // State
  records: UsageRecord[];
  totalTokens: number;
  totalCost: number;

  // Actions
  addUsageRecord: (record: Omit<UsageRecord, 'id' | 'cost' | 'createdAt'>) => void;
  clearUsageRecords: () => void;
  clearRecordsBefore: (date: Date) => void;

  // Selectors
  getUsageBySession: (sessionId: string) => UsageRecord[];
  getUsageByProvider: () => ProviderUsage[];
  getDailyUsage: (days?: number) => DailyUsage[];
  getTotalUsage: () => { tokens: number; cost: number; requests: number };
}

export const useUsageStore = create<UsageState>()(
  persist(
    (set, get) => ({
      records: [],
      totalTokens: 0,
      totalCost: 0,

      addUsageRecord: (record) => {
        const cost = calculateCost(record.model, record.tokens);
        const newRecord: UsageRecord = {
          ...record,
          id: nanoid(),
          cost,
          createdAt: new Date(),
        };

        set((state) => ({
          records: [...state.records, newRecord],
          totalTokens: state.totalTokens + record.tokens.total,
          totalCost: state.totalCost + cost,
        }));
      },

      clearUsageRecords: () =>
        set({
          records: [],
          totalTokens: 0,
          totalCost: 0,
        }),

      clearRecordsBefore: (date) =>
        set((state) => {
          const filteredRecords = state.records.filter(
            (r) => r.createdAt >= date
          );
          const totalTokens = filteredRecords.reduce(
            (sum, r) => sum + r.tokens.total,
            0
          );
          const totalCost = filteredRecords.reduce((sum, r) => sum + r.cost, 0);

          return {
            records: filteredRecords,
            totalTokens,
            totalCost,
          };
        }),

      getUsageBySession: (sessionId) => {
        const { records } = get();
        return records.filter((r) => r.sessionId === sessionId);
      },

      getUsageByProvider: () => {
        const { records } = get();
        const providerMap = new Map<string, ProviderUsage>();

        for (const record of records) {
          const existing = providerMap.get(record.provider);
          if (existing) {
            existing.tokens += record.tokens.total;
            existing.cost += record.cost;
            existing.requests += 1;
          } else {
            providerMap.set(record.provider, {
              provider: record.provider,
              tokens: record.tokens.total,
              cost: record.cost,
              requests: 1,
            });
          }
        }

        return Array.from(providerMap.values()).sort(
          (a, b) => b.tokens - a.tokens
        );
      },

      getDailyUsage: (days = 7) => {
        const { records } = get();
        const now = new Date();
        const startDate = new Date(now);
        startDate.setDate(startDate.getDate() - days);

        const dailyMap = new Map<string, DailyUsage>();

        // Initialize all days
        for (let i = 0; i <= days; i++) {
          const date = new Date(startDate);
          date.setDate(date.getDate() + i);
          const dateStr = date.toISOString().split('T')[0];
          dailyMap.set(dateStr, {
            date: dateStr,
            tokens: 0,
            cost: 0,
            requests: 0,
          });
        }

        // Aggregate records
        for (const record of records) {
          const dateStr = record.createdAt.toISOString().split('T')[0];
          const existing = dailyMap.get(dateStr);
          if (existing) {
            existing.tokens += record.tokens.total;
            existing.cost += record.cost;
            existing.requests += 1;
          }
        }

        return Array.from(dailyMap.values()).sort((a, b) =>
          a.date.localeCompare(b.date)
        );
      },

      getTotalUsage: () => {
        const { records, totalTokens, totalCost } = get();
        return {
          tokens: totalTokens,
          cost: totalCost,
          requests: records.length,
        };
      },
    }),
    {
      name: 'cognia-usage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        records: state.records.map((r) => ({
          ...r,
          createdAt:
            r.createdAt instanceof Date
              ? r.createdAt.toISOString()
              : r.createdAt,
        })),
        totalTokens: state.totalTokens,
        totalCost: state.totalCost,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.records) {
          state.records = state.records.map((r) => ({
            ...r,
            createdAt: new Date(r.createdAt),
          }));
        }
      },
    }
  )
);

export default useUsageStore;
