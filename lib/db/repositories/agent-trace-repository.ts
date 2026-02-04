import { nanoid } from 'nanoid';
import Dexie from 'dexie';
import { db, type DBAgentTrace } from '../schema';
import { withRetry } from '../utils';
import type { AgentTraceRecord, TraceFile } from '@/types/agent-trace';
import { gitService, type GitBlameLineInfo } from '@/lib/native/git';
import { useGitStore } from '@/stores/git';
import { loggers } from '@/lib/logger';

const log = loggers.store;

function parseTraceRecord(json: string): AgentTraceRecord {
  return JSON.parse(json) as AgentTraceRecord;
}

function safeStringify(obj: unknown): string {
  return JSON.stringify(obj);
}

function extractFilePaths(files: TraceFile[]): string[] {
  const paths: string[] = [];
  for (const f of files) {
    if (typeof f.path === 'string') paths.push(f.path);
  }
  return paths;
}

export interface LineAttribution {
  record: AgentTraceRecord;
  file: TraceFile;
  conversation: TraceFile['conversations'][0];
  range: TraceFile['conversations'][0]['ranges'][0];
}

function findAttributionForLine(
  record: AgentTraceRecord,
  filePath: string,
  lineNumber: number
): LineAttribution | null {
  for (const file of record.files) {
    if (file.path !== filePath) continue;

    for (const conversation of file.conversations) {
      for (const range of conversation.ranges) {
        if (lineNumber >= range.start_line && lineNumber <= range.end_line) {
          return { record, file, conversation, range };
        }
      }
    }
  }
  return null;
}

export const agentTraceRepository = {
  async create(input: {
    record: AgentTraceRecord;
    sessionId?: string;
    vcsType?: string;
    vcsRevision?: string;
  }): Promise<DBAgentTrace> {
    const id = input.record.id || nanoid();
    const normalizedRecord: AgentTraceRecord = {
      ...input.record,
      id,
      timestamp: input.record.timestamp || new Date().toISOString(),
    };
    const timestamp = new Date(normalizedRecord.timestamp);

    // Extract file paths for indexed queries
    const filePaths = extractFilePaths(normalizedRecord.files);

    const row: DBAgentTrace = {
      id,
      sessionId: input.sessionId,
      timestamp,
      vcsType: input.vcsType,
      vcsRevision: input.vcsRevision,
      record: safeStringify(normalizedRecord),
      createdAt: new Date(),
      filePaths: filePaths.length > 0 ? filePaths : undefined,
    };

    await withRetry(async () => {
      await db.agentTraces.add(row);
    }, 'agentTraceRepository.create');

    return row;
  },

  async getById(id: string): Promise<AgentTraceRecord | null> {
    const row = await db.agentTraces.get(id);
    if (!row) return null;
    return parseTraceRecord(row.record);
  },

  async getDbById(id: string): Promise<DBAgentTrace | null> {
    const row = await db.agentTraces.get(id);
    return row ?? null;
  },

  async getBySessionId(sessionId: string, options?: { limit?: number }): Promise<AgentTraceRecord[]> {
    const rows = await db.agentTraces
      .where('[sessionId+timestamp]')
      .between(
        [sessionId, Dexie.minKey],
        [sessionId, Dexie.maxKey]
      )
      .reverse()
      .toArray();

    const limited = options?.limit ? rows.slice(0, options.limit) : rows;
    return limited.map((r) => parseTraceRecord(r.record));
  },

  async getByVcsRevision(vcsRevision: string, options?: { limit?: number }): Promise<AgentTraceRecord[]> {
    const rows = await db.agentTraces
      .where('[vcsRevision+timestamp]')
      .between(
        [vcsRevision, Dexie.minKey],
        [vcsRevision, Dexie.maxKey]
      )
      .reverse()
      .toArray();

    const limited = options?.limit ? rows.slice(0, options.limit) : rows;
    return limited.map((r) => parseTraceRecord(r.record));
  },

  async findByFilePath(filePath: string, options?: { limit?: number }): Promise<AgentTraceRecord[]> {
    // Use the filePaths multi-entry index for efficient queries
    const rows = await db.agentTraces
      .where('filePaths')
      .equals(filePath)
      .reverse()
      .sortBy('timestamp');

    const matched: AgentTraceRecord[] = [];
    for (const row of rows) {
      try {
        matched.push(parseTraceRecord(row.record));
      } catch (error) {
        log.error('Failed to parse agent trace record', error as Error);
      }
    }

    // Sort by timestamp descending (newest first)
    matched.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return options?.limit ? matched.slice(0, options.limit) : matched;
  },

  async delete(id: string): Promise<void> {
    await withRetry(async () => {
      await db.agentTraces.delete(id);
    }, 'agentTraceRepository.delete');
  },

  async deleteBySessionId(sessionId: string): Promise<number> {
    const toDelete = await db.agentTraces
      .where('[sessionId+timestamp]')
      .between([sessionId, Dexie.minKey], [sessionId, Dexie.maxKey])
      .toArray();

    const ids = toDelete.map((t) => t.id);
    await withRetry(async () => {
      await db.agentTraces.bulkDelete(ids);
    }, 'agentTraceRepository.deleteBySessionId');

    return ids.length;
  },

  async deleteOlderThan(days: number): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffTime = cutoff.getTime();

    // Use filter with Date normalization for reliable comparison
    const toDelete = await db.agentTraces
      .filter((trace) => {
        const ts = trace.timestamp instanceof Date ? trace.timestamp : new Date(trace.timestamp);
        return ts.getTime() < cutoffTime;
      })
      .toArray();

    const ids = toDelete.map((t) => t.id);
    await withRetry(async () => {
      await db.agentTraces.bulkDelete(ids);
    }, 'agentTraceRepository.deleteOlderThan');

    return ids.length;
  },

  async count(): Promise<number> {
    return db.agentTraces.count();
  },

  /**
   * Delete the oldest N records to enforce a maximum record limit
   */
  async deleteOldest(count: number): Promise<number> {
    if (count <= 0) return 0;

    // Get the oldest records by timestamp
    const toDelete = await db.agentTraces
      .orderBy('timestamp')
      .limit(count)
      .toArray();

    const ids = toDelete.map((t) => t.id);
    await withRetry(async () => {
      await db.agentTraces.bulkDelete(ids);
    }, 'agentTraceRepository.deleteOldest');

    return ids.length;
  },

  async getAll(options?: { limit?: number; offset?: number }): Promise<AgentTraceRecord[]> {
    let query = db.agentTraces.orderBy('timestamp').reverse();

    if (options?.offset) {
      query = query.offset(options.offset);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const rows = await query.toArray();
    return rows.map((r) => parseTraceRecord(r.record));
  },

  async clear(): Promise<void> {
    await withRetry(async () => {
      await db.agentTraces.clear();
    }, 'agentTraceRepository.clear');
  },

  /**
   * Find attribution for a specific line in a file.
   * Per spec section 6.5: "To query ownership of a specific line of code:
   * 1. Use VCS blame to find the revision that last touched line N
   * 2. Look up the trace for that revision and file
   * 3. Find the range containing line N"
   */
  async findByLineNumber(
    filePath: string,
    lineNumber: number,
    vcsRevision?: string
  ): Promise<LineAttribution | null> {
    // If VCS revision is provided, search only in that revision
    if (vcsRevision) {
      const records = await this.getByVcsRevision(vcsRevision);
      for (const record of records) {
        const attribution = findAttributionForLine(record, filePath, lineNumber);
        if (attribution) return attribution;
      }
      return null;
    }

    // Otherwise, search all records for the file
    const records = await this.findByFilePath(filePath);
    for (const record of records) {
      const attribution = findAttributionForLine(record, filePath, lineNumber);
      if (attribution) return attribution;
    }
    return null;
  },

  /**
   * Export traces as a single spec-compliant record (merging multiple records)
   */
  async exportAsSpecRecord(options?: {
    sessionId?: string;
    vcsRevision?: string;
    limit?: number;
  }): Promise<AgentTraceRecord | null> {
    let records: AgentTraceRecord[] = [];

    if (options?.sessionId) {
      records = await this.getBySessionId(options.sessionId, { limit: options?.limit });
    } else if (options?.vcsRevision) {
      records = await this.getByVcsRevision(options.vcsRevision, { limit: options?.limit });
    } else {
      records = await this.getAll({ limit: options?.limit || 100 });
    }

    if (records.length === 0) return null;

    // Merge all records into a single spec-compliant record
    const mergedFiles = new Map<string, TraceFile>();

    for (const record of records) {
      for (const file of record.files) {
        const existing = mergedFiles.get(file.path);
        if (existing) {
          // Merge conversations
          existing.conversations.push(...file.conversations);
        } else {
          mergedFiles.set(file.path, { ...file, conversations: [...file.conversations] });
        }
      }
    }

    // Use the most recent record's metadata as base
    const baseRecord = records[0];

    return {
      version: baseRecord.version,
      id: baseRecord.id,
      timestamp: baseRecord.timestamp,
      vcs: baseRecord.vcs,
      tool: baseRecord.tool,
      files: Array.from(mergedFiles.values()),
      metadata: {
        ...baseRecord.metadata,
        mergedRecordCount: records.length,
      },
    };
  },

  /**
   * Find attribution for a line using git blame to get the revision,
   * then looking up the agent trace for that revision.
   * Per spec section 6.5: "Use VCS blame to find the revision that last touched line N"
   */
  async findLineAttributionWithBlame(
    filePath: string,
    lineNumber: number
  ): Promise<{
    blameInfo: GitBlameLineInfo | null;
    traceAttribution: LineAttribution | null;
  }> {
    const gitState = useGitStore.getState();
    const repoPath = gitState.currentRepoPath;

    // Get git blame info for the line
    let blameInfo: GitBlameLineInfo | null = null;
    if (repoPath) {
      try {
        const result = await gitService.blameLine(repoPath, filePath, lineNumber);
        if (result.success && result.data) {
          blameInfo = result.data;
        }
      } catch {
        // Git blame not available or failed
      }
    }

    // Look up agent trace using the commit hash from blame
    const vcsRevision = blameInfo?.commitHash;
    const traceAttribution = await this.findByLineNumber(filePath, lineNumber, vcsRevision);

    return { blameInfo, traceAttribution };
  },
};
