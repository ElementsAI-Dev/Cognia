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
  type UsageRecordStatus,
  type DailyUsage,
  type ProviderUsage,
  calculateCost,
  calculateCostFromTokens,
} from '@/types/system/usage';

/** Maximum number of records to keep in the store */
const MAX_RECORDS = 5000;

/** Auto-cleanup: remove records older than this (ms) - 90 days */
const RECORD_RETENTION_MS = 90 * 24 * 60 * 60 * 1000;

/** Model usage breakdown */
export interface ModelUsage {
  model: string;
  provider: string;
  tokens: number;
  cost: number;
  requests: number;
  avgLatency: number;
  errorCount: number;
}

/** Performance metrics for a given set of records */
export interface PerformanceMetrics {
  avgLatency: number;
  p95Latency: number;
  avgTimeToFirstToken: number;
  errorRate: number;
  successRate: number;
  avgTokensPerSecond: number;
  totalErrors: number;
  totalSuccesses: number;
}

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
  /** Add a record from AI SDK token counts (inputTokens/outputTokens) */
  addUsageFromTokens: (params: {
    sessionId: string;
    messageId: string;
    provider: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
    latency?: number;
    status?: UsageRecordStatus;
    errorMessage?: string;
    timeToFirstToken?: number;
  }) => void;
  clearUsageRecords: () => void;
  clearRecordsBefore: (date: Date) => void;
  /** Run auto-cleanup: trim old records and enforce max limit */
  autoCleanup: () => void;

  // Quota Actions
  setQuotaLimits: (providerId: string, limits: QuotaLimits) => void;
  clearQuotaLimits: (providerId: string) => void;

  // Selectors
  getUsageBySession: (sessionId: string) => UsageRecord[];
  getUsageByProvider: () => ProviderUsage[];
  /** Get usage breakdown by model */
  getUsageByModel: () => ModelUsage[];
  getDailyUsage: (days?: number) => DailyUsage[];
  getTotalUsage: () => { tokens: number; cost: number; requests: number };
  /** Get records filtered by date range */
  getUsageByDateRange: (startDate: Date, endDate?: Date) => UsageRecord[];
  /** Get performance metrics (latency, error rate, TTFT, tokens/s) */
  getPerformanceMetrics: (providerId?: string) => PerformanceMetrics;
  /** Get error rate for a provider (0-1) */
  getErrorRate: (providerId?: string) => number;

  // Quota Selectors
  getQuotaStatus: (providerId: string) => QuotaStatus;
  canMakeRequest: (providerId: string) => { allowed: boolean; reason?: string };
  getProviderUsageToday: (providerId: string) => { requests: number; tokens: number; cost: number };
  getProviderUsageThisMonth: (providerId: string) => {
    requests: number;
    tokens: number;
    cost: number;
  };
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

        set((state) => {
          const newRecords = [...state.records, newRecord];
          // Auto-trim if exceeds max records
          if (newRecords.length > MAX_RECORDS) {
            newRecords.splice(0, newRecords.length - MAX_RECORDS);
          }
          return {
            records: newRecords,
            totalTokens: state.totalTokens + record.tokens.total,
            totalCost: state.totalCost + cost,
          };
        });
      },

      addUsageFromTokens: (params) => {
        const cost = calculateCostFromTokens(params.model, params.inputTokens, params.outputTokens);
        const total = params.inputTokens + params.outputTokens;
        const newRecord: UsageRecord = {
          id: nanoid(),
          sessionId: params.sessionId,
          messageId: params.messageId,
          provider: params.provider,
          model: params.model,
          tokens: {
            prompt: params.inputTokens,
            completion: params.outputTokens,
            total,
            inputTokens: params.inputTokens,
            outputTokens: params.outputTokens,
          },
          cost,
          createdAt: new Date(),
          latency: params.latency,
          status: params.status ?? 'success',
          errorMessage: params.errorMessage,
          timeToFirstToken: params.timeToFirstToken,
        };

        set((state) => {
          const newRecords = [...state.records, newRecord];
          if (newRecords.length > MAX_RECORDS) {
            newRecords.splice(0, newRecords.length - MAX_RECORDS);
          }
          return {
            records: newRecords,
            totalTokens: state.totalTokens + total,
            totalCost: state.totalCost + cost,
          };
        });
      },

      clearUsageRecords: () =>
        set({
          records: [],
          totalTokens: 0,
          totalCost: 0,
        }),

      clearRecordsBefore: (date) =>
        set((state) => {
          const dateTime = date.getTime();
          const filteredRecords = state.records.filter((r) => {
            const t = r.createdAt instanceof Date ? r.createdAt.getTime() : new Date(r.createdAt).getTime();
            return t >= dateTime;
          });
          const totalTokens = filteredRecords.reduce((sum, r) => sum + r.tokens.total, 0);
          const totalCost = filteredRecords.reduce((sum, r) => sum + r.cost, 0);

          return {
            records: filteredRecords,
            totalTokens,
            totalCost,
          };
        }),

      autoCleanup: () => {
        const { records } = get();
        const cutoff = Date.now() - RECORD_RETENTION_MS;
        const filtered = records.filter((r) => {
          const t = r.createdAt instanceof Date ? r.createdAt.getTime() : new Date(r.createdAt).getTime();
          return t >= cutoff;
        });
        // Also trim to max records
        const trimmed = filtered.length > MAX_RECORDS ? filtered.slice(filtered.length - MAX_RECORDS) : filtered;
        if (trimmed.length !== records.length) {
          const totalTokens = trimmed.reduce((sum, r) => sum + r.tokens.total, 0);
          const totalCost = trimmed.reduce((sum, r) => sum + r.cost, 0);
          set({ records: trimmed, totalTokens, totalCost });
        }
      },

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

        return Array.from(providerMap.values()).sort((a, b) => b.tokens - a.tokens);
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

        return Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));
      },

      getUsageByModel: () => {
        const { records } = get();
        const modelMap = new Map<string, ModelUsage>();

        for (const record of records) {
          const key = `${record.provider}/${record.model}`;
          const existing = modelMap.get(key);
          const latency = record.latency ?? 0;
          const isError = record.status === 'error' || record.status === 'timeout';
          if (existing) {
            existing.tokens += record.tokens.total;
            existing.cost += record.cost;
            existing.requests += 1;
            existing.avgLatency = (existing.avgLatency * (existing.requests - 1) + latency) / existing.requests;
            if (isError) existing.errorCount += 1;
          } else {
            modelMap.set(key, {
              model: record.model,
              provider: record.provider,
              tokens: record.tokens.total,
              cost: record.cost,
              requests: 1,
              avgLatency: latency,
              errorCount: isError ? 1 : 0,
            });
          }
        }

        return Array.from(modelMap.values()).sort((a, b) => b.tokens - a.tokens);
      },

      getTotalUsage: () => {
        const { records, totalTokens, totalCost } = get();
        return {
          tokens: totalTokens,
          cost: totalCost,
          requests: records.length,
        };
      },

      getUsageByDateRange: (startDate, endDate) => {
        const { records } = get();
        const startTime = startDate.getTime();
        const endTime = endDate ? endDate.getTime() : Date.now();
        return records.filter((r) => {
          const t = r.createdAt instanceof Date ? r.createdAt.getTime() : new Date(r.createdAt).getTime();
          return t >= startTime && t <= endTime;
        });
      },

      getPerformanceMetrics: (providerId) => {
        const { records } = get();
        const filtered = providerId ? records.filter((r) => r.provider === providerId) : records;

        if (filtered.length === 0) {
          return {
            avgLatency: 0,
            p95Latency: 0,
            avgTimeToFirstToken: 0,
            errorRate: 0,
            successRate: 1,
            avgTokensPerSecond: 0,
            totalErrors: 0,
            totalSuccesses: 0,
          };
        }

        const withLatency = filtered.filter((r) => r.latency !== undefined && r.latency > 0);
        const sortedLatencies = withLatency.map((r) => r.latency!).sort((a, b) => a - b);
        const avgLatency = sortedLatencies.length > 0
          ? sortedLatencies.reduce((sum, l) => sum + l, 0) / sortedLatencies.length
          : 0;
        const p95Index = Math.floor(sortedLatencies.length * 0.95);
        const p95Latency = sortedLatencies.length > 0 ? sortedLatencies[Math.min(p95Index, sortedLatencies.length - 1)] : 0;

        const withTTFT = filtered.filter((r) => r.timeToFirstToken !== undefined && r.timeToFirstToken > 0);
        const avgTimeToFirstToken = withTTFT.length > 0
          ? withTTFT.reduce((sum, r) => sum + r.timeToFirstToken!, 0) / withTTFT.length
          : 0;

        const errors = filtered.filter((r) => r.status === 'error' || r.status === 'timeout');
        const successes = filtered.filter((r) => !r.status || r.status === 'success');
        const errorRate = filtered.length > 0 ? errors.length / filtered.length : 0;

        // Tokens per second: total output tokens / total latency in seconds
        const streamingRecords = filtered.filter((r) => r.latency && r.latency > 0 && r.tokens.completion > 0);
        const avgTokensPerSecond = streamingRecords.length > 0
          ? streamingRecords.reduce((sum, r) => sum + (r.tokens.completion / (r.latency! / 1000)), 0) / streamingRecords.length
          : 0;

        return {
          avgLatency,
          p95Latency,
          avgTimeToFirstToken,
          errorRate,
          successRate: 1 - errorRate,
          avgTokensPerSecond,
          totalErrors: errors.length,
          totalSuccesses: successes.length,
        };
      },

      getErrorRate: (providerId) => {
        const { records } = get();
        const filtered = providerId ? records.filter((r) => r.provider === providerId) : records;
        if (filtered.length === 0) return 0;
        const errors = filtered.filter((r) => r.status === 'error' || r.status === 'timeout');
        return errors.length / filtered.length;
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
          (r) => r.provider === providerId && r.createdAt.toISOString().split('T')[0] === today
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
      version: 1,
      storage: createJSONStorage(() => localStorage),
      migrate: (persistedState: unknown, version: number) => {
        const state = persistedState as Record<string, unknown>;
        if (version === 0) {
          // v0 -> v1: Ensure quotaLimits field exists
          if (!state.quotaLimits || typeof state.quotaLimits !== 'object') {
            state.quotaLimits = {};
          }
          if (state.totalTokens === undefined) {
            state.totalTokens = 0;
          }
          if (state.totalCost === undefined) {
            state.totalCost = 0;
          }
        }
        return state;
      },
      partialize: (state) => ({
        records: state.records.map((r) => ({
          ...r,
          createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
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
