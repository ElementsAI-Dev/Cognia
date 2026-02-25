/**
 * Checkpoint Repository - data access layer for agent trace checkpoints
 */

import Dexie from 'dexie';
import { db, type DBCheckpoint } from '../schema';
import { withRetry } from '../utils';
import { nanoid } from 'nanoid';

export interface CheckpointData {
  id: string;
  sessionId: string;
  traceId: string;
  filePath: string;
  originalContent: string;
  modifiedContent: string | null;
  modelId: string | null;
  timestamp: Date;
  createdAt: Date;
}

export interface CreateCheckpointInput {
  sessionId: string;
  traceId: string;
  filePath: string;
  originalContent: string;
  modifiedContent?: string | null;
  modelId?: string | null;
  timestamp?: Date;
}

function toCheckpointData(row: DBCheckpoint): CheckpointData {
  return {
    id: row.id,
    sessionId: row.sessionId,
    traceId: row.traceId,
    filePath: row.filePath,
    originalContent: row.originalContent,
    modifiedContent: row.modifiedContent,
    modelId: row.modelId,
    timestamp: row.timestamp,
    createdAt: row.createdAt,
  };
}

export const checkpointRepository = {
  async getById(id: string): Promise<CheckpointData | undefined> {
    const row = await db.checkpoints.get(id);
    return row ? toCheckpointData(row) : undefined;
  },

  async getBySession(sessionId: string): Promise<CheckpointData[]> {
    const rows = await db.checkpoints
      .where('[sessionId+timestamp]')
      .between(
        [sessionId, Dexie.minKey],
        [sessionId, Dexie.maxKey]
      )
      .reverse()
      .toArray();
    return rows.map(toCheckpointData);
  },

  async getBySessionAndFile(sessionId: string, filePath: string): Promise<CheckpointData[]> {
    const rows = await db.checkpoints
      .where('[sessionId+filePath]')
      .equals([sessionId, filePath])
      .toArray();
    return rows.map(toCheckpointData);
  },

  async getByTrace(traceId: string): Promise<CheckpointData[]> {
    const rows = await db.checkpoints
      .where('traceId')
      .equals(traceId)
      .toArray();
    return rows.map(toCheckpointData);
  },

  async create(input: CreateCheckpointInput): Promise<CheckpointData> {
    const now = new Date();
    const row: DBCheckpoint = {
      id: nanoid(),
      sessionId: input.sessionId,
      traceId: input.traceId,
      filePath: input.filePath,
      originalContent: input.originalContent,
      modifiedContent: input.modifiedContent ?? null,
      modelId: input.modelId ?? null,
      timestamp: input.timestamp ?? now,
      createdAt: now,
    };

    await withRetry(async () => {
      await db.checkpoints.add(row);
    }, 'checkpointRepository.create');

    return toCheckpointData(row);
  },

  async delete(id: string): Promise<void> {
    await withRetry(async () => {
      await db.checkpoints.delete(id);
    }, 'checkpointRepository.delete');
  },

  async deleteBySession(sessionId: string): Promise<number> {
    const keys = await db.checkpoints
      .where('[sessionId+timestamp]')
      .between(
        [sessionId, Dexie.minKey],
        [sessionId, Dexie.maxKey]
      )
      .primaryKeys();

    if (keys.length === 0) return 0;

    await withRetry(async () => {
      await db.checkpoints.bulkDelete(keys);
    }, 'checkpointRepository.deleteBySession');

    return keys.length;
  },

  async count(): Promise<number> {
    return db.checkpoints.count();
  },

  async clear(): Promise<void> {
    await withRetry(async () => {
      await db.checkpoints.clear();
    }, 'checkpointRepository.clear');
  },
};
