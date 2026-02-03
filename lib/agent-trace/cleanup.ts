/**
 * Agent Trace Auto-Cleanup
 * Automatically cleans up old agent trace records based on settings
 */

import { useSettingsStore } from '@/stores';
import { agentTraceRepository } from '@/lib/db/repositories/agent-trace-repository';

/** Flag to prevent multiple cleanup runs */
let cleanupExecuted = false;

/**
 * Run auto-cleanup for agent traces based on settings
 * This should be called once during application initialization
 * @returns Number of records deleted, or -1 if cleanup was skipped
 */
export async function runAgentTraceAutoCleanup(): Promise<number> {
  // Prevent multiple runs
  if (cleanupExecuted) {
    return -1;
  }
  cleanupExecuted = true;

  try {
    const { agentTraceSettings } = useSettingsStore.getState();
    const { enabled, autoCleanupDays, maxRecords } = agentTraceSettings;

    // Skip cleanup if agent trace is disabled
    if (!enabled) {
      return 0;
    }

    let totalDeleted = 0;

    // Clean up old records if autoCleanupDays is set
    if (autoCleanupDays > 0) {
      const deletedByAge = await agentTraceRepository.deleteOlderThan(autoCleanupDays);
      totalDeleted += deletedByAge;

      if (deletedByAge > 0) {
        console.log(`[AgentTrace] Auto-cleanup: deleted ${deletedByAge} records older than ${autoCleanupDays} days`);
      }
    }

    // Enforce max records limit if set
    if (maxRecords > 0) {
      const currentCount = await agentTraceRepository.count();
      if (currentCount > maxRecords) {
        const excessCount = currentCount - maxRecords;
        const deletedByLimit = await agentTraceRepository.deleteOldest(excessCount);
        totalDeleted += deletedByLimit;
        
        if (deletedByLimit > 0) {
          console.log(`[AgentTrace] Auto-cleanup: deleted ${deletedByLimit} records to enforce max limit of ${maxRecords}`);
        }
      }
    }

    return totalDeleted;
  } catch (error) {
    console.error('[AgentTrace] Auto-cleanup failed:', error);
    return 0;
  }
}

/**
 * Reset the cleanup flag (for testing purposes)
 */
export function resetCleanupFlag(): void {
  cleanupExecuted = false;
}
