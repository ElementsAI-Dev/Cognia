/**
 * Tests for Summary Repository
 */

import 'fake-indexeddb/auto';
import { db } from '../schema';
import { summaryRepository, type CreateSummaryInput } from './summary-repository';

function makeSummaryInput(overrides?: Partial<CreateSummaryInput>): CreateSummaryInput {
  return {
    sessionId: 'session-1',
    type: 'auto',
    summary: 'Test summary content',
    keyPoints: [{ text: 'point 1' }],
    topics: [{ name: 'topic 1' }],
    messageCount: 10,
    sourceTokens: 500,
    summaryTokens: 100,
    compressionRatio: 0.2,
    format: 'markdown',
    usedAI: true,
    ...overrides,
  };
}

describe('summaryRepository', () => {
  beforeEach(async () => {
    await db.summaries.clear();
  });

  afterAll(async () => {
    await db.close();
  });

  describe('create', () => {
    it('creates a summary with all fields', async () => {
      const result = await summaryRepository.create(makeSummaryInput());

      expect(result.id).toBeDefined();
      expect(result.sessionId).toBe('session-1');
      expect(result.type).toBe('auto');
      expect(result.summary).toBe('Test summary content');
      expect(result.keyPoints).toEqual([{ text: 'point 1' }]);
      expect(result.topics).toEqual([{ name: 'topic 1' }]);
      expect(result.messageCount).toBe(10);
      expect(result.sourceTokens).toBe(500);
      expect(result.summaryTokens).toBe(100);
      expect(result.compressionRatio).toBe(0.2);
      expect(result.format).toBe('markdown');
      expect(result.usedAI).toBe(true);
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });

    it('creates a summary with optional fields omitted', async () => {
      const result = await summaryRepository.create({
        sessionId: 'session-2',
        type: 'manual',
        summary: 'Simple summary',
        messageCount: 5,
        sourceTokens: 200,
        summaryTokens: 50,
        compressionRatio: 0.25,
        format: 'text',
        usedAI: false,
      });

      expect(result.id).toBeDefined();
      expect(result.keyPoints).toBeUndefined();
      expect(result.topics).toBeUndefined();
      expect(result.diagram).toBeUndefined();
      expect(result.language).toBeUndefined();

      // When read back from DB, toSummaryData provides default []
      const fromDb = await summaryRepository.getById(result.id);
      expect(fromDb?.keyPoints).toEqual([]);
      expect(fromDb?.topics).toEqual([]);
    });
  });

  describe('getById', () => {
    it('returns summary when found', async () => {
      const created = await summaryRepository.create(makeSummaryInput());

      const found = await summaryRepository.getById(created.id);
      expect(found).toBeDefined();
      expect(found?.sessionId).toBe('session-1');
      expect(found?.summary).toBe('Test summary content');
    });

    it('returns undefined when not found', async () => {
      const found = await summaryRepository.getById('non-existent');
      expect(found).toBeUndefined();
    });
  });

  describe('listBySession', () => {
    it('returns summaries for a session ordered by createdAt', async () => {
      await summaryRepository.create(makeSummaryInput({ summary: 'First' }));
      await summaryRepository.create(makeSummaryInput({ summary: 'Second' }));
      await summaryRepository.create(makeSummaryInput({ sessionId: 'session-other', summary: 'Other' }));

      const results = await summaryRepository.listBySession('session-1');
      expect(results).toHaveLength(2);
      expect(results[0].summary).toBe('First');
      expect(results[1].summary).toBe('Second');
    });

    it('returns empty array for session with no summaries', async () => {
      const results = await summaryRepository.listBySession('no-such-session');
      expect(results).toHaveLength(0);
    });
  });

  describe('upsert', () => {
    it('inserts new summary via upsert', async () => {
      const created = await summaryRepository.create(makeSummaryInput());
      const updated = { ...created, summary: 'Updated content' };

      await summaryRepository.upsert(updated);

      const found = await summaryRepository.getById(created.id);
      expect(found?.summary).toBe('Updated content');
    });
  });

  describe('remove', () => {
    it('removes a summary by id', async () => {
      const created = await summaryRepository.create(makeSummaryInput());

      await summaryRepository.remove(created.id);

      const found = await summaryRepository.getById(created.id);
      expect(found).toBeUndefined();
    });
  });

  describe('removeBySession', () => {
    it('removes all summaries for a session', async () => {
      await summaryRepository.create(makeSummaryInput());
      await summaryRepository.create(makeSummaryInput({ summary: 'Another' }));
      await summaryRepository.create(makeSummaryInput({ sessionId: 'session-2' }));

      const removed = await summaryRepository.removeBySession('session-1');
      expect(removed).toBe(2);

      const remaining = await summaryRepository.listBySession('session-2');
      expect(remaining).toHaveLength(1);
    });

    it('returns 0 when no summaries to remove', async () => {
      const removed = await summaryRepository.removeBySession('empty-session');
      expect(removed).toBe(0);
    });
  });

  describe('count', () => {
    it('returns the total count', async () => {
      await summaryRepository.create(makeSummaryInput());
      await summaryRepository.create(makeSummaryInput({ sessionId: 'session-2' }));

      const count = await summaryRepository.count();
      expect(count).toBe(2);
    });
  });

  describe('clear', () => {
    it('removes all summaries', async () => {
      await summaryRepository.create(makeSummaryInput());
      await summaryRepository.create(makeSummaryInput());

      await summaryRepository.clear();

      const count = await summaryRepository.count();
      expect(count).toBe(0);
    });
  });

  describe('JSON serialization', () => {
    it('round-trips keyPoints and topics through JSON', async () => {
      const complexKeyPoints = [
        { text: 'Point A', importance: 0.9 },
        { text: 'Point B', importance: 0.5, nested: { data: true } },
      ];
      const complexTopics = [
        { name: 'Topic X', messageIds: ['m1', 'm2'] },
      ];

      const created = await summaryRepository.create(
        makeSummaryInput({ keyPoints: complexKeyPoints, topics: complexTopics })
      );

      const found = await summaryRepository.getById(created.id);
      expect(found?.keyPoints).toEqual(complexKeyPoints);
      expect(found?.topics).toEqual(complexTopics);
    });

    it('round-trips messageRange through JSON', async () => {
      const created = await summaryRepository.create(
        makeSummaryInput({ messageRange: { startIndex: 0, endIndex: 15 } })
      );

      const found = await summaryRepository.getById(created.id);
      expect(found?.messageRange).toEqual({ startIndex: 0, endIndex: 15 });
    });
  });
});
