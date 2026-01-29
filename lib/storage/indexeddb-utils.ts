/**
 * IndexedDB Utilities
 * Enhanced utilities for IndexedDB management and optimization
 */

import { db } from '@/lib/db';

/**
 * IndexedDB table statistics
 */
export interface TableStats {
  name: string;
  recordCount: number;
  estimatedSize: number;
}

/**
 * IndexedDB database statistics
 */
export interface DatabaseStats {
  name: string;
  version: number;
  tables: TableStats[];
  totalRecords: number;
  totalSize: number;
}

/**
 * Get CogniaDB statistics
 */
export async function getCogniaDBStats(): Promise<DatabaseStats> {
  const tables: TableStats[] = [];
  let totalRecords = 0;
  let totalSize = 0;

  // Define table configurations with average record sizes
  const tableConfigs = [
    { name: 'sessions', avgSize: 512 },
    { name: 'messages', avgSize: 2048 },
    { name: 'documents', avgSize: 4096 },
    { name: 'mcpServers', avgSize: 1024 },
    { name: 'projects', avgSize: 1024 },
    { name: 'knowledgeFiles', avgSize: 2048 },
    { name: 'workflows', avgSize: 2048 },
    { name: 'workflowExecutions', avgSize: 4096 },
    { name: 'summaries', avgSize: 1024 },
    { name: 'assets', avgSize: 8192 },
    { name: 'folders', avgSize: 256 },
  ];

  for (const config of tableConfigs) {
    try {
      const table = (db as unknown as Record<string, { count: () => Promise<number> }>)[config.name];
      if (table && typeof table.count === 'function') {
        const count = await table.count();
        const estimatedSize = count * config.avgSize;
        tables.push({
          name: config.name,
          recordCount: count,
          estimatedSize,
        });
        totalRecords += count;
        totalSize += estimatedSize;
      }
    } catch {
      // Table might not exist yet
    }
  }

  return {
    name: 'CogniaDB',
    version: db.verno,
    tables,
    totalRecords,
    totalSize,
  };
}

/**
 * Cleanup options for IndexedDB
 */
export interface IndexedDBCleanupOptions {
  /** Maximum messages per session */
  maxMessagesPerSession?: number;
  /** Maximum workflow executions per workflow */
  maxExecutionsPerWorkflow?: number;
  /** Maximum age for messages in days */
  maxMessageAgeDays?: number;
  /** Dry run - don't actually delete */
  dryRun?: boolean;
}

/**
 * Cleanup result
 */
export interface IndexedDBCleanupResult {
  messagesDeleted: number;
  executionsDeleted: number;
  orphanedRecordsDeleted: number;
  freedSpace: number;
}

/**
 * Cleanup old and excessive IndexedDB records
 */
export async function cleanupIndexedDB(
  options: IndexedDBCleanupOptions = {}
): Promise<IndexedDBCleanupResult> {
  const {
    maxMessagesPerSession = 1000,
    maxExecutionsPerWorkflow = 50,
    maxMessageAgeDays = 90,
    dryRun = false,
  } = options;

  const result: IndexedDBCleanupResult = {
    messagesDeleted: 0,
    executionsDeleted: 0,
    orphanedRecordsDeleted: 0,
    freedSpace: 0,
  };

  try {
    // Cleanup old messages per session
    const sessions = await db.sessions.toArray();
    
    for (const session of sessions) {
      const messages = await db.messages
        .where('sessionId')
        .equals(session.id)
        .sortBy('createdAt');

      if (messages.length > maxMessagesPerSession) {
        const toDelete = messages.slice(0, messages.length - maxMessagesPerSession);
        
        if (!dryRun) {
          await db.messages.bulkDelete(toDelete.map((m) => m.id));
        }
        
        result.messagesDeleted += toDelete.length;
        result.freedSpace += toDelete.length * 2048;
      }
    }

    // Cleanup old messages by age
    if (maxMessageAgeDays > 0) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - maxMessageAgeDays);

      const oldMessages = await db.messages
        .filter((m) => new Date(m.createdAt) < cutoffDate)
        .toArray();

      if (oldMessages.length > 0 && !dryRun) {
        await db.messages.bulkDelete(oldMessages.map((m) => m.id));
        result.messagesDeleted += oldMessages.length;
        result.freedSpace += oldMessages.length * 2048;
      }
    }

    // Cleanup workflow executions
    const workflows = await db.workflows.toArray();

    for (const workflow of workflows) {
      const executions = await db.workflowExecutions
        .where('workflowId')
        .equals(workflow.id)
        .sortBy('startedAt');

      if (executions.length > maxExecutionsPerWorkflow) {
        const toDelete = executions.slice(0, executions.length - maxExecutionsPerWorkflow);
        
        if (!dryRun) {
          await db.workflowExecutions.bulkDelete(toDelete.map((e) => e.id));
        }
        
        result.executionsDeleted += toDelete.length;
        result.freedSpace += toDelete.length * 4096;
      }
    }

    // Cleanup orphaned records
    const orphanedResult = await cleanupOrphanedRecords(dryRun);
    result.orphanedRecordsDeleted = orphanedResult;
    result.freedSpace += orphanedResult * 1024;

  } catch (error) {
    console.error('IndexedDB cleanup failed:', error);
  }

  return result;
}

/**
 * Cleanup orphaned records (references to deleted entities)
 */
export async function cleanupOrphanedRecords(dryRun = false): Promise<number> {
  let cleaned = 0;

  try {
    // Find messages without valid sessions
    const sessions = await db.sessions.toArray();
    const sessionIds = new Set(sessions.map((s) => s.id));

    const allMessages = await db.messages.toArray();
    const orphanedMessages = allMessages.filter((m) => !sessionIds.has(m.sessionId));

    if (orphanedMessages.length > 0 && !dryRun) {
      await db.messages.bulkDelete(orphanedMessages.map((m) => m.id));
      cleaned += orphanedMessages.length;
    }

    // Find knowledge files without valid projects
    const projects = await db.projects.toArray();
    const projectIds = new Set(projects.map((p) => p.id));

    const allKnowledgeFiles = await db.knowledgeFiles.toArray();
    const orphanedFiles = allKnowledgeFiles.filter((f) => !projectIds.has(f.projectId));

    if (orphanedFiles.length > 0 && !dryRun) {
      await db.knowledgeFiles.bulkDelete(orphanedFiles.map((f) => f.id));
      cleaned += orphanedFiles.length;
    }

    // Find workflow executions without valid workflows
    const workflows = await db.workflows.toArray();
    const workflowIds = new Set(workflows.map((w) => w.id));

    const allExecutions = await db.workflowExecutions.toArray();
    const orphanedExecutions = allExecutions.filter((e) => !workflowIds.has(e.workflowId));

    if (orphanedExecutions.length > 0 && !dryRun) {
      await db.workflowExecutions.bulkDelete(orphanedExecutions.map((e) => e.id));
      cleaned += orphanedExecutions.length;
    }

  } catch (error) {
    console.error('Failed to cleanup orphaned records:', error);
  }

  return cleaned;
}

/**
 * Vacuum/compact IndexedDB (trigger browser's internal optimization)
 * Note: Browsers automatically compact IndexedDB, this just clears and rewrites to trigger it
 */
export async function optimizeDatabase(): Promise<void> {
  // Re-open the database to trigger any pending optimizations
  await db.close();
  await db.open();
}

/**
 * Export all data from IndexedDB
 */
export async function exportAllData(): Promise<{
  sessions: unknown[];
  messages: unknown[];
  documents: unknown[];
  projects: unknown[];
  workflows: unknown[];
  exportedAt: string;
}> {
  const [sessions, messages, documents, projects, workflows] = await Promise.all([
    db.sessions.toArray(),
    db.messages.toArray(),
    db.documents.toArray(),
    db.projects.toArray(),
    db.workflows.toArray(),
  ]);

  return {
    sessions,
    messages,
    documents,
    projects,
    workflows,
    exportedAt: new Date().toISOString(),
  };
}

/**
 * Clear all data from a specific table
 */
export async function clearTable(tableName: string): Promise<number> {
  const table = (db as unknown as Record<string, { clear: () => Promise<void>; count: () => Promise<number> }>)[tableName];
  
  if (!table) {
    throw new Error(`Table ${tableName} not found`);
  }

  const count = await table.count();
  await table.clear();
  return count;
}

/**
 * Get estimated storage usage
 */
export async function getStorageEstimate(): Promise<{
  usage: number;
  quota: number;
  usagePercent: number;
}> {
  if (typeof navigator === 'undefined' || !navigator.storage?.estimate) {
    return { usage: 0, quota: 0, usagePercent: 0 };
  }

  try {
    const estimate = await navigator.storage.estimate();
    const usage = estimate.usage || 0;
    const quota = estimate.quota || 0;
    const usagePercent = quota > 0 ? (usage / quota) * 100 : 0;

    return { usage, quota, usagePercent };
  } catch {
    return { usage: 0, quota: 0, usagePercent: 0 };
  }
}

/**
 * Request persistent storage
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.storage?.persist) {
    return false;
  }

  try {
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

/**
 * Check if storage is persistent
 */
export async function isPersistentStorage(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.storage?.persisted) {
    return false;
  }

  try {
    return await navigator.storage.persisted();
  } catch {
    return false;
  }
}
