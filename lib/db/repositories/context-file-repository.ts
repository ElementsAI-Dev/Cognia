/**
 * Context File Repository - data access layer for ContextFS persistence
 */

import { db, type DBContextFile } from '../schema';
import { withRetry } from '../utils';
import { nanoid } from 'nanoid';

export interface ContextFileData {
  id: string;
  path: string;
  category: string;
  source: string;
  filename?: string;
  content: string;
  sizeBytes: number;
  estimatedTokens: number;
  tags: string[];
  ttlMs?: number;
  createdAt: Date;
  lastAccessedAt: Date;
}

export interface CreateContextFileInput {
  path: string;
  category: string;
  source: string;
  filename?: string;
  content: string;
  sizeBytes: number;
  estimatedTokens: number;
  tags?: string[];
  ttlMs?: number;
}

function toContextFileData(row: DBContextFile): ContextFileData {
  return {
    id: row.id,
    path: row.path,
    category: row.category,
    source: row.source,
    filename: row.filename,
    content: row.content,
    sizeBytes: row.sizeBytes,
    estimatedTokens: row.estimatedTokens,
    tags: row.tags,
    ttlMs: row.ttlMs,
    createdAt: row.createdAt,
    lastAccessedAt: row.lastAccessedAt,
  };
}

export const contextFileRepository = {
  async getById(id: string): Promise<ContextFileData | undefined> {
    const row = await db.contextFiles.get(id);
    return row ? toContextFileData(row) : undefined;
  },

  async getByCategory(category: string): Promise<ContextFileData[]> {
    const rows = await db.contextFiles
      .where('category')
      .equals(category)
      .toArray();
    return rows.map(toContextFileData);
  },

  async getByCategoryAndSource(category: string, source: string): Promise<ContextFileData[]> {
    const rows = await db.contextFiles
      .where('[category+source]')
      .equals([category, source])
      .toArray();
    return rows.map(toContextFileData);
  },

  async getByPath(path: string): Promise<ContextFileData | undefined> {
    const row = await db.contextFiles
      .where('path')
      .equals(path)
      .first();
    return row ? toContextFileData(row) : undefined;
  },

  async create(input: CreateContextFileInput): Promise<ContextFileData> {
    const now = new Date();
    const row: DBContextFile = {
      id: nanoid(),
      path: input.path,
      category: input.category,
      source: input.source,
      filename: input.filename,
      content: input.content,
      sizeBytes: input.sizeBytes,
      estimatedTokens: input.estimatedTokens,
      tags: input.tags ?? [],
      ttlMs: input.ttlMs,
      createdAt: now,
      lastAccessedAt: now,
    };

    await withRetry(async () => {
      await db.contextFiles.add(row);
    }, 'contextFileRepository.create');

    return toContextFileData(row);
  },

  async upsert(data: ContextFileData): Promise<void> {
    await withRetry(async () => {
      await db.contextFiles.put(data);
    }, 'contextFileRepository.upsert');
  },

  async touch(id: string): Promise<void> {
    await db.contextFiles.update(id, {
      lastAccessedAt: new Date(),
    });
  },

  async delete(id: string): Promise<void> {
    await withRetry(async () => {
      await db.contextFiles.delete(id);
    }, 'contextFileRepository.delete');
  },

  async deleteByCategory(category: string): Promise<number> {
    const keys = await db.contextFiles
      .where('category')
      .equals(category)
      .primaryKeys();

    if (keys.length === 0) return 0;

    await withRetry(async () => {
      await db.contextFiles.bulkDelete(keys);
    }, 'contextFileRepository.deleteByCategory');

    return keys.length;
  },

  async cleanupExpired(): Promise<number> {
    const now = Date.now();
    const expiredIds: string[] = [];

    await db.contextFiles.each((file) => {
      if (file.ttlMs) {
        const expiresAt = new Date(file.createdAt).getTime() + file.ttlMs;
        if (now > expiresAt) {
          expiredIds.push(file.id);
        }
      }
    });

    if (expiredIds.length === 0) return 0;

    await withRetry(async () => {
      await db.contextFiles.bulkDelete(expiredIds);
    }, 'contextFileRepository.cleanupExpired');

    return expiredIds.length;
  },

  async count(): Promise<number> {
    return db.contextFiles.count();
  },

  async clear(): Promise<void> {
    await withRetry(async () => {
      await db.contextFiles.clear();
    }, 'contextFileRepository.clear');
  },
};
