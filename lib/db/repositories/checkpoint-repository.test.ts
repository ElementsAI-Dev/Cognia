/**
 * Tests for Checkpoint Repository
 */

import 'fake-indexeddb/auto';
import { db } from '../schema';
import { checkpointRepository, type CreateCheckpointInput } from './checkpoint-repository';

function makeCheckpointInput(overrides?: Partial<CreateCheckpointInput>): CreateCheckpointInput {
  return {
    sessionId: 'session-1',
    traceId: 'trace-1',
    filePath: '/src/app.ts',
    originalContent: 'const x = 1;',
    modifiedContent: 'const x = 2;',
    modelId: 'gpt-4',
    ...overrides,
  };
}

describe('checkpointRepository', () => {
  beforeEach(async () => {
    await db.checkpoints.clear();
  });

  afterAll(async () => {
    await db.close();
  });

  describe('create', () => {
    it('creates a checkpoint with all fields', async () => {
      const result = await checkpointRepository.create(makeCheckpointInput());

      expect(result.id).toBeDefined();
      expect(result.sessionId).toBe('session-1');
      expect(result.traceId).toBe('trace-1');
      expect(result.filePath).toBe('/src/app.ts');
      expect(result.originalContent).toBe('const x = 1;');
      expect(result.modifiedContent).toBe('const x = 2;');
      expect(result.modelId).toBe('gpt-4');
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.createdAt).toBeInstanceOf(Date);
    });

    it('creates a checkpoint with optional fields omitted', async () => {
      const result = await checkpointRepository.create({
        sessionId: 'session-2',
        traceId: 'trace-2',
        filePath: '/src/index.ts',
        originalContent: 'export {};',
      });

      expect(result.modifiedContent).toBeNull();
      expect(result.modelId).toBeNull();
    });

    it('uses provided timestamp when given', async () => {
      const customTimestamp = new Date('2024-06-15T10:00:00Z');
      const result = await checkpointRepository.create(
        makeCheckpointInput({ timestamp: customTimestamp })
      );

      expect(result.timestamp.getTime()).toBe(customTimestamp.getTime());
    });
  });

  describe('getById', () => {
    it('returns checkpoint when found', async () => {
      const created = await checkpointRepository.create(makeCheckpointInput());

      const found = await checkpointRepository.getById(created.id);
      expect(found).toBeDefined();
      expect(found?.filePath).toBe('/src/app.ts');
    });

    it('returns undefined when not found', async () => {
      const found = await checkpointRepository.getById('non-existent');
      expect(found).toBeUndefined();
    });
  });

  describe('getBySession', () => {
    it('returns checkpoints for a session in reverse timestamp order', async () => {
      await checkpointRepository.create(
        makeCheckpointInput({ filePath: '/a.ts', timestamp: new Date('2024-01-01') })
      );
      await checkpointRepository.create(
        makeCheckpointInput({ filePath: '/b.ts', timestamp: new Date('2024-01-03') })
      );
      await checkpointRepository.create(
        makeCheckpointInput({ filePath: '/c.ts', timestamp: new Date('2024-01-02') })
      );
      await checkpointRepository.create(
        makeCheckpointInput({ sessionId: 'session-other', filePath: '/d.ts' })
      );

      const results = await checkpointRepository.getBySession('session-1');
      expect(results).toHaveLength(3);
      expect(results[0].filePath).toBe('/b.ts');
      expect(results[1].filePath).toBe('/c.ts');
      expect(results[2].filePath).toBe('/a.ts');
    });

    it('returns empty array for session with no checkpoints', async () => {
      const results = await checkpointRepository.getBySession('no-such-session');
      expect(results).toHaveLength(0);
    });
  });

  describe('getBySessionAndFile', () => {
    it('returns checkpoints for a specific session and file', async () => {
      await checkpointRepository.create(makeCheckpointInput({ filePath: '/src/app.ts' }));
      await checkpointRepository.create(makeCheckpointInput({ filePath: '/src/app.ts' }));
      await checkpointRepository.create(makeCheckpointInput({ filePath: '/src/other.ts' }));

      const results = await checkpointRepository.getBySessionAndFile('session-1', '/src/app.ts');
      expect(results).toHaveLength(2);
    });
  });

  describe('getByTrace', () => {
    it('returns checkpoints for a specific trace', async () => {
      await checkpointRepository.create(makeCheckpointInput({ traceId: 'trace-A' }));
      await checkpointRepository.create(makeCheckpointInput({ traceId: 'trace-A' }));
      await checkpointRepository.create(makeCheckpointInput({ traceId: 'trace-B' }));

      const results = await checkpointRepository.getByTrace('trace-A');
      expect(results).toHaveLength(2);
    });
  });

  describe('delete', () => {
    it('deletes a checkpoint by id', async () => {
      const created = await checkpointRepository.create(makeCheckpointInput());

      await checkpointRepository.delete(created.id);

      const found = await checkpointRepository.getById(created.id);
      expect(found).toBeUndefined();
    });
  });

  describe('deleteBySession', () => {
    it('deletes all checkpoints for a session', async () => {
      await checkpointRepository.create(makeCheckpointInput());
      await checkpointRepository.create(makeCheckpointInput());
      await checkpointRepository.create(makeCheckpointInput({ sessionId: 'session-2' }));

      const deleted = await checkpointRepository.deleteBySession('session-1');
      expect(deleted).toBe(2);

      const remaining = await checkpointRepository.count();
      expect(remaining).toBe(1);
    });

    it('returns 0 when no checkpoints to delete', async () => {
      const deleted = await checkpointRepository.deleteBySession('empty-session');
      expect(deleted).toBe(0);
    });
  });

  describe('count', () => {
    it('returns the total count', async () => {
      await checkpointRepository.create(makeCheckpointInput());
      await checkpointRepository.create(makeCheckpointInput());

      const count = await checkpointRepository.count();
      expect(count).toBe(2);
    });
  });

  describe('clear', () => {
    it('removes all checkpoints', async () => {
      await checkpointRepository.create(makeCheckpointInput());
      await checkpointRepository.create(makeCheckpointInput());

      await checkpointRepository.clear();

      const count = await checkpointRepository.count();
      expect(count).toBe(0);
    });
  });
});
