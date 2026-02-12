/**
 * useMcpToolUsage - Hook for MCP tool usage statistics logic
 * Extracted from mcp-tool-usage-stats.tsx component
 */

import { useState, useMemo } from 'react';
import { useMcpStore } from '@/stores';
import {
  getSuccessRate,
  getToolDisplayName,
  getServerNameFromToolName,
} from '@/lib/mcp/format-utils';
import type { ToolUsageRecord } from '@/types/mcp';

export type ToolUsageSortKey = 'usage' | 'success' | 'time';

export interface UseMcpToolUsageOptions {
  maxItems?: number;
}

export interface ProcessedUsageRecord extends ToolUsageRecord {
  successRate: number;
  displayName: string;
  serverName: string;
}

export interface UseMcpToolUsageReturn {
  usageRecords: ProcessedUsageRecord[];
  maxUsageCount: number;
  sortBy: ToolUsageSortKey;
  setSortBy: (key: ToolUsageSortKey) => void;
  resetHistory: () => void;
}

export function useMcpToolUsage({
  maxItems = 20,
}: UseMcpToolUsageOptions = {}): UseMcpToolUsageReturn {
  const toolUsageHistory = useMcpStore((state) => state.toolUsageHistory);
  const resetToolUsageHistory = useMcpStore((state) => state.resetToolUsageHistory);
  const [sortBy, setSortBy] = useState<ToolUsageSortKey>('usage');

  const usageRecords = useMemo(() => {
    const records: ToolUsageRecord[] = Array.from(toolUsageHistory.values());

    records.sort((a, b) => {
      switch (sortBy) {
        case 'usage':
          return b.usageCount - a.usageCount;
        case 'success': {
          const rateA = a.usageCount > 0 ? a.successCount / a.usageCount : 0;
          const rateB = b.usageCount > 0 ? b.successCount / b.usageCount : 0;
          return rateB - rateA;
        }
        case 'time':
          return b.avgExecutionTime - a.avgExecutionTime;
        default:
          return 0;
      }
    });

    return records.slice(0, maxItems).map((record) => ({
      ...record,
      successRate: getSuccessRate(record),
      displayName: getToolDisplayName(record.toolName),
      serverName: getServerNameFromToolName(record.toolName),
    }));
  }, [toolUsageHistory, sortBy, maxItems]);

  const maxUsageCount = useMemo(
    () => Math.max(1, ...usageRecords.map((r) => r.usageCount)),
    [usageRecords]
  );

  return {
    usageRecords,
    maxUsageCount,
    sortBy,
    setSortBy,
    resetHistory: resetToolUsageHistory,
  };
}
