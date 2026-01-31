import 'fake-indexeddb/auto';

import { db } from '../schema';
import { agentTraceRepository } from './agent-trace-repository';

describe('agentTraceRepository', () => {
  beforeEach(async () => {
    await db.agentTraces.clear();
  });

  afterAll(async () => {
    await db.close();
  });

  describe('create and read', () => {
    it('creates and reads a trace record', async () => {
      const id = 'trace-test-1';
      const now = new Date().toISOString();

      await agentTraceRepository.create({
        record: {
          version: '0.1.0',
          id,
          timestamp: now,
          files: [
            {
              path: 'artifact:abc',
              conversations: [
                {
                  ranges: [{ start_line: 1, end_line: 2 }],
                },
              ],
            },
          ],
        },
        sessionId: 'session-1',
        vcsType: 'git',
        vcsRevision: 'deadbeef',
      });

      const record = await agentTraceRepository.getById(id);
      expect(record).not.toBeNull();
      expect(record?.id).toBe(id);
      expect(record?.version).toBe('0.1.0');
    });

    it('returns null for non-existent id', async () => {
      const record = await agentTraceRepository.getById('non-existent');
      expect(record).toBeNull();
    });

    it('gets db record by id', async () => {
      const id = 'trace-db-1';
      await agentTraceRepository.create({
        record: { version: '0.1.0', id, timestamp: new Date().toISOString(), files: [] },
        sessionId: 'session-1',
      });

      const dbRecord = await agentTraceRepository.getDbById(id);
      expect(dbRecord).not.toBeNull();
      expect(dbRecord?.id).toBe(id);
      expect(dbRecord?.sessionId).toBe('session-1');
    });
  });

  describe('getBySessionId', () => {
    it('returns traces for a session', async () => {
      await agentTraceRepository.create({
        record: { version: '0.1.0', id: 't1', timestamp: new Date().toISOString(), files: [] },
        sessionId: 'session-a',
      });
      await agentTraceRepository.create({
        record: { version: '0.1.0', id: 't2', timestamp: new Date().toISOString(), files: [] },
        sessionId: 'session-a',
      });
      await agentTraceRepository.create({
        record: { version: '0.1.0', id: 't3', timestamp: new Date().toISOString(), files: [] },
        sessionId: 'session-b',
      });

      const results = await agentTraceRepository.getBySessionId('session-a');
      expect(results).toHaveLength(2);
      expect(results.map((r) => r.id).sort()).toEqual(['t1', 't2']);
    });

    it('respects limit option', async () => {
      for (let i = 0; i < 5; i++) {
        await agentTraceRepository.create({
          record: { version: '0.1.0', id: `t${i}`, timestamp: new Date().toISOString(), files: [] },
          sessionId: 'session-limit',
        });
      }

      const results = await agentTraceRepository.getBySessionId('session-limit', { limit: 3 });
      expect(results).toHaveLength(3);
    });
  });

  describe('delete', () => {
    it('deletes a single trace', async () => {
      await agentTraceRepository.create({
        record: { version: '0.1.0', id: 'del-1', timestamp: new Date().toISOString(), files: [] },
      });

      await agentTraceRepository.delete('del-1');
      const record = await agentTraceRepository.getById('del-1');
      expect(record).toBeNull();
    });
  });

  describe('deleteBySessionId', () => {
    it('deletes all traces for a session', async () => {
      await agentTraceRepository.create({
        record: { version: '0.1.0', id: 's1-t1', timestamp: new Date().toISOString(), files: [] },
        sessionId: 'session-del',
      });
      await agentTraceRepository.create({
        record: { version: '0.1.0', id: 's1-t2', timestamp: new Date().toISOString(), files: [] },
        sessionId: 'session-del',
      });
      await agentTraceRepository.create({
        record: { version: '0.1.0', id: 's2-t1', timestamp: new Date().toISOString(), files: [] },
        sessionId: 'session-keep',
      });

      const deleted = await agentTraceRepository.deleteBySessionId('session-del');
      expect(deleted).toBe(2);

      const remaining = await agentTraceRepository.getBySessionId('session-del');
      expect(remaining).toHaveLength(0);

      const kept = await agentTraceRepository.getBySessionId('session-keep');
      expect(kept).toHaveLength(1);
    });

    it('returns 0 when no traces match', async () => {
      const deleted = await agentTraceRepository.deleteBySessionId('non-existent');
      expect(deleted).toBe(0);
    });
  });

  describe('deleteOlderThan', () => {
    it('deletes traces older than specified days', async () => {
      const now = new Date();
      const oldDate = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000); // 10 days ago
      const recentDate = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000); // 2 days ago

      await agentTraceRepository.create({
        record: { version: '0.1.0', id: 'old-1', timestamp: oldDate.toISOString(), files: [] },
      });
      await agentTraceRepository.create({
        record: { version: '0.1.0', id: 'recent-1', timestamp: recentDate.toISOString(), files: [] },
      });

      const deleted = await agentTraceRepository.deleteOlderThan(5);
      expect(deleted).toBe(1);

      const oldRecord = await agentTraceRepository.getById('old-1');
      expect(oldRecord).toBeNull();

      const recentRecord = await agentTraceRepository.getById('recent-1');
      expect(recentRecord).not.toBeNull();
    });
  });

  describe('count', () => {
    it('returns total count of traces', async () => {
      expect(await agentTraceRepository.count()).toBe(0);

      await agentTraceRepository.create({
        record: { version: '0.1.0', id: 'c1', timestamp: new Date().toISOString(), files: [] },
      });
      await agentTraceRepository.create({
        record: { version: '0.1.0', id: 'c2', timestamp: new Date().toISOString(), files: [] },
      });

      expect(await agentTraceRepository.count()).toBe(2);
    });
  });

  describe('getAll', () => {
    it('returns all traces with pagination', async () => {
      for (let i = 0; i < 5; i++) {
        await agentTraceRepository.create({
          record: { version: '0.1.0', id: `p${i}`, timestamp: new Date().toISOString(), files: [] },
        });
      }

      const page1 = await agentTraceRepository.getAll({ limit: 2 });
      expect(page1).toHaveLength(2);

      const page2 = await agentTraceRepository.getAll({ limit: 2, offset: 2 });
      expect(page2).toHaveLength(2);

      const all = await agentTraceRepository.getAll();
      expect(all).toHaveLength(5);
    });
  });

  describe('clear', () => {
    it('clears all traces', async () => {
      await agentTraceRepository.create({
        record: { version: '0.1.0', id: 'cl1', timestamp: new Date().toISOString(), files: [] },
      });
      await agentTraceRepository.create({
        record: { version: '0.1.0', id: 'cl2', timestamp: new Date().toISOString(), files: [] },
      });

      await agentTraceRepository.clear();
      expect(await agentTraceRepository.count()).toBe(0);
    });
  });
});
