/**
 * Summary Repository - data access layer for chat summaries
 */

import { db, type DBSummary } from '../schema';
import { withRetry } from '../utils';
import { nanoid } from 'nanoid';

export interface SummaryData {
  id: string;
  sessionId: string;
  type: string;
  summary: string;
  keyPoints?: unknown[];
  topics?: unknown[];
  diagram?: string;
  diagramType?: string;
  messageRange?: { startIndex: number; endIndex: number; startMessageId?: string; endMessageId?: string };
  messageCount: number;
  sourceTokens: number;
  summaryTokens: number;
  compressionRatio: number;
  language?: string;
  format: string;
  style?: string;
  template?: string;
  usedAI: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSummaryInput {
  sessionId: string;
  type: string;
  summary: string;
  keyPoints?: unknown[];
  topics?: unknown[];
  diagram?: string;
  diagramType?: string;
  messageRange?: { startIndex: number; endIndex: number };
  messageCount: number;
  sourceTokens: number;
  summaryTokens: number;
  compressionRatio: number;
  language?: string;
  format: string;
  style?: string;
  template?: string;
  usedAI: boolean;
}

function toSummaryData(row: DBSummary): SummaryData {
  return {
    id: row.id,
    sessionId: row.sessionId,
    type: row.type,
    summary: row.summary,
    keyPoints: row.keyPoints ? JSON.parse(row.keyPoints) : [],
    topics: row.topics ? JSON.parse(row.topics) : [],
    diagram: row.diagram,
    diagramType: row.diagramType,
    messageRange: row.messageRange ? JSON.parse(row.messageRange) : undefined,
    messageCount: row.messageCount,
    sourceTokens: row.sourceTokens,
    summaryTokens: row.summaryTokens,
    compressionRatio: row.compressionRatio,
    language: row.language,
    format: row.format,
    style: row.style,
    template: row.template,
    usedAI: row.usedAI,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toDBSummary(data: SummaryData): DBSummary {
  return {
    id: data.id,
    sessionId: data.sessionId,
    type: data.type,
    summary: data.summary,
    keyPoints: data.keyPoints ? JSON.stringify(data.keyPoints) : undefined,
    topics: data.topics ? JSON.stringify(data.topics) : undefined,
    diagram: data.diagram,
    diagramType: data.diagramType,
    messageRange: data.messageRange ? JSON.stringify(data.messageRange) : undefined,
    messageCount: data.messageCount,
    sourceTokens: data.sourceTokens,
    summaryTokens: data.summaryTokens,
    compressionRatio: data.compressionRatio,
    language: data.language,
    format: data.format,
    style: data.style,
    template: data.template,
    usedAI: data.usedAI,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

export const summaryRepository = {
  async listBySession(sessionId: string): Promise<SummaryData[]> {
    const rows = await db.summaries
      .where('sessionId')
      .equals(sessionId)
      .sortBy('createdAt');
    return rows.map(toSummaryData);
  },

  async getById(id: string): Promise<SummaryData | undefined> {
    const row = await db.summaries.get(id);
    return row ? toSummaryData(row) : undefined;
  },

  async create(input: CreateSummaryInput): Promise<SummaryData> {
    const now = new Date();
    const data: SummaryData = {
      ...input,
      id: nanoid(),
      createdAt: now,
      updatedAt: now,
    };

    await withRetry(async () => {
      await db.summaries.add(toDBSummary(data));
    }, 'summaryRepository.create');

    return data;
  },

  async upsert(data: SummaryData): Promise<void> {
    await withRetry(async () => {
      await db.summaries.put(toDBSummary(data));
    }, 'summaryRepository.upsert');
  },

  async remove(id: string): Promise<void> {
    await withRetry(async () => {
      await db.summaries.delete(id);
    }, 'summaryRepository.remove');
  },

  async removeBySession(sessionId: string): Promise<number> {
    const keys = await db.summaries
      .where('sessionId')
      .equals(sessionId)
      .primaryKeys();

    if (keys.length === 0) return 0;

    await withRetry(async () => {
      await db.summaries.bulkDelete(keys);
    }, 'summaryRepository.removeBySession');

    return keys.length;
  },

  async count(): Promise<number> {
    return db.summaries.count();
  },

  async clear(): Promise<void> {
    await withRetry(async () => {
      await db.summaries.clear();
    }, 'summaryRepository.clear');
  },
};
