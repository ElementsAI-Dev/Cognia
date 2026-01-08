/**
 * Usage Store - tracks token usage, costs, and quota limits
 * 
 * This is the unified store for all usage tracking and quota management.
 * It handles:
 * - Usage recording (tokens, costs, requests)
 * - Quota limits per provider
 * - Usage statistics and history
 * - Quota alerts and enforcement
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

/** Quota limits for a provider */
export interface QuotaLimits {
  maxRequestsPerDay?: number;
  maxRequestsPerMonth?: number;
  maxTokensPerDay?: number;
  maxCostPerDay?: number;
  maxCostPerMonth?: number;
}

/** Quota status for a provider */
export interface QuotaStatus {
  providerId: string;
  limits: QuotaLimits;
  usage: {
    requestsToday: number;
    requestsThisMonth: number;
    tokensToday: number;
    costToday: number;
    costThisMonth: number;
  };
  remaining: {
    requestsToday?: number;
    tokensToday?: number;
    costToday?: number;
    costThisMonth?: number;
  };
  isBlocked: boolean;
  blockReason?: string;
}

interface UsageState {
  // State
  records: UsageRecord[];
  totalTokens: number;
  totalCost: number;
  quotaLimits: Record<string, QuotaLimits>;

  // Actions
  addUsageRecord: (record: Omit<UsageRecord, 'id' | 'cost' | 'createdAt'>) => void;
  clearUsageRecords: () => void;
  clearRecordsBefore: (date: Date) => void;
  
  // Quota Actions
  setQuotaLimits: (providerId: string, limits: QuotaLimits) => void;
  clearQuotaLimits: (providerId: string) => void;

  // Selectors
  getUsageBySession: (sessionId: string) => UsageRecord[];
  getUsageByProvider: () => ProviderUsage[];
  getDailyUsage: (days?: number) => DailyUsage[];
  getTotalUsage: () => { tokens: number; cost: number; requests: number };
  
  // Quota Selectors
  getQuotaStatus: (providerId: string) => QuotaStatus;
  canMakeRequest: (providerId: string) => { allowed: boolean; reason?: string };
  getProviderUsageToday: (providerId: string) => { requests: number; tokens: number; cost: number };
  getProviderUsageThisMonth: (providerId: string) => { requests: number; tokens: number; cost: number };
}

export const useUsageStore = create<UsageState>()(
  persist(
    (set, get) => ({
      records: [],
      totalTokens: 0,
      totalCost: 0,
      quotaLimits: {},

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

      // Quota Actions
      setQuotaLimits: (providerId, limits) =>
        set((state) => ({
          quotaLimits: { ...state.quotaLimits, [providerId]: limits },
        })),

      clearQuotaLimits: (providerId) =>
        set((state) => {
          const { [providerId]: _, ...rest } = state.quotaLimits;
          return { quotaLimits: rest };
        }),

      // Quota Selectors
      getProviderUsageToday: (providerId) => {
        const { records } = get();
        const today = new Date().toISOString().split('T')[0];
        const todayRecords = records.filter(
          (r) =>
            r.provider === providerId &&
            r.createdAt.toISOString().split('T')[0] === today
        );
        return {
          requests: todayRecords.length,
          tokens: todayRecords.reduce((sum, r) => sum + r.tokens.total, 0),
          cost: todayRecords.reduce((sum, r) => sum + r.cost, 0),
        };
      },

      getProviderUsageThisMonth: (providerId) => {
        const { records } = get();
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthRecords = records.filter(
          (r) => r.provider === providerId && r.createdAt >= monthStart
        );
        return {
          requests: monthRecords.length,
          tokens: monthRecords.reduce((sum, r) => sum + r.tokens.total, 0),
          cost: monthRecords.reduce((sum, r) => sum + r.cost, 0),
        };
      },

      getQuotaStatus: (providerId) => {
        const { quotaLimits } = get();
        const limits = quotaLimits[providerId] || {};
        const today = get().getProviderUsageToday(providerId);
        const month = get().getProviderUsageThisMonth(providerId);

        const remaining: QuotaStatus['remaining'] = {};
        if (limits.maxRequestsPerDay !== undefined) {
          remaining.requestsToday = Math.max(0, limits.maxRequestsPerDay - today.requests);
        }
        if (limits.maxTokensPerDay !== undefined) {
          remaining.tokensToday = Math.max(0, limits.maxTokensPerDay - today.tokens);
        }
        if (limits.maxCostPerDay !== undefined) {
          remaining.costToday = Math.max(0, limits.maxCostPerDay - today.cost);
        }
        if (limits.maxCostPerMonth !== undefined) {
          remaining.costThisMonth = Math.max(0, limits.maxCostPerMonth - month.cost);
        }

        let isBlocked = false;
        let blockReason: string | undefined;

        if (limits.maxRequestsPerDay && today.requests >= limits.maxRequestsPerDay) {
          isBlocked = true;
          blockReason = 'Daily request limit exceeded';
        } else if (limits.maxCostPerDay && today.cost >= limits.maxCostPerDay) {
          isBlocked = true;
          blockReason = 'Daily cost limit exceeded';
        } else if (limits.maxCostPerMonth && month.cost >= limits.maxCostPerMonth) {
          isBlocked = true;
          blockReason = 'Monthly cost limit exceeded';
        }

        return {
          providerId,
          limits,
          usage: {
            requestsToday: today.requests,
            requestsThisMonth: month.requests,
            tokensToday: today.tokens,
            costToday: today.cost,
            costThisMonth: month.cost,
          },
          remaining,
          isBlocked,
          blockReason,
        };
      },

      canMakeRequest: (providerId) => {
        const status = get().getQuotaStatus(providerId);
        if (status.isBlocked) {
          return { allowed: false, reason: status.blockReason };
        }
        return { allowed: true };
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
        quotaLimits: state.quotaLimits,
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
