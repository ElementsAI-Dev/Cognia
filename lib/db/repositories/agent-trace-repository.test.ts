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

  describe('filePaths indexing', () => {
    it('extracts and stores filePaths from record files', async () => {
      const result = await agentTraceRepository.create({
        record: {
          version: '0.1.0',
          id: 'fp-1',
          timestamp: new Date().toISOString(),
          files: [
            { path: '/src/app.ts', conversations: [] },
            { path: '/src/utils.ts', conversations: [] },
          ],
        },
      });

      expect(result.filePaths).toEqual(['/src/app.ts', '/src/utils.ts']);
    });

    it('stores undefined filePaths when no files', async () => {
      const result = await agentTraceRepository.create({
        record: { version: '0.1.0', id: 'fp-2', timestamp: new Date().toISOString(), files: [] },
      });

      expect(result.filePaths).toBeUndefined();
    });

    it('findByFilePath uses indexed query', async () => {
      await agentTraceRepository.create({
        record: {
          version: '0.1.0',
          id: 'idx-1',
          timestamp: new Date().toISOString(),
          files: [{ path: '/src/target.ts', conversations: [] }],
        },
      });
      await agentTraceRepository.create({
        record: {
          version: '0.1.0',
          id: 'idx-2',
          timestamp: new Date().toISOString(),
          files: [{ path: '/src/other.ts', conversations: [] }],
        },
      });

      const results = await agentTraceRepository.findByFilePath('/src/target.ts');
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('idx-1');
    });

    it('findByFilePath respects limit option', async () => {
      for (let i = 0; i < 5; i++) {
        await agentTraceRepository.create({
          record: {
            version: '0.1.0',
            id: `lim-${i}`,
            timestamp: new Date().toISOString(),
            files: [{ path: '/shared/path.ts', conversations: [] }],
          },
        });
      }

      const results = await agentTraceRepository.findByFilePath('/shared/path.ts', { limit: 3 });
      expect(results).toHaveLength(3);
    });

    it('findByFilePath returns empty array for non-existent path', async () => {
      const results = await agentTraceRepository.findByFilePath('/non/existent.ts');
      expect(results).toHaveLength(0);
    });
  });

  describe('getSessionSummary', () => {
    it('returns null for non-existent session', async () => {
      const summary = await agentTraceRepository.getSessionSummary('non-existent');
      expect(summary).toBeNull();
    });

    it('returns summary with correct trace count', async () => {
      const now = new Date();
      for (let i = 0; i < 3; i++) {
        await agentTraceRepository.create({
          record: {
            version: '0.1.0',
            id: `sum-${i}`,
            timestamp: new Date(now.getTime() + i * 1000).toISOString(),
            eventType: 'step_start',
            files: [{ path: `/src/file${i}.ts`, conversations: [] }],
          },
          sessionId: 'session-summary',
        });
      }

      const summary = await agentTraceRepository.getSessionSummary('session-summary');
      expect(summary).not.toBeNull();
      expect(summary!.sessionId).toBe('session-summary');
      expect(summary!.traceCount).toBe(3);
      expect(summary!.totalSteps).toBe(3);
    });

    it('aggregates event type counts', async () => {
      await agentTraceRepository.create({
        record: {
          version: '0.1.0',
          id: 'evt-1',
          timestamp: new Date().toISOString(),
          eventType: 'step_start',
          files: [],
        },
        sessionId: 'session-evt',
      });
      await agentTraceRepository.create({
        record: {
          version: '0.1.0',
          id: 'evt-2',
          timestamp: new Date().toISOString(),
          eventType: 'tool_call_result',
          files: [],
          metadata: { toolName: 'file_write', success: true },
        },
        sessionId: 'session-evt',
      });
      await agentTraceRepository.create({
        record: {
          version: '0.1.0',
          id: 'evt-3',
          timestamp: new Date().toISOString(),
          eventType: 'tool_call_result',
          files: [],
          metadata: { toolName: 'code_edit', success: false, error: 'File not found' },
        },
        sessionId: 'session-evt',
      });

      const summary = await agentTraceRepository.getSessionSummary('session-evt');
      expect(summary!.eventTypeCounts.step_start).toBe(1);
      expect(summary!.eventTypeCounts.tool_call_result).toBe(2);
      expect(summary!.toolCallCount).toBe(2);
      expect(summary!.toolSuccessCount).toBe(1);
      expect(summary!.toolFailureCount).toBe(1);
      expect(summary!.toolSuccessRate).toBe(0.5);
      expect(summary!.uniqueToolNames).toEqual(expect.arrayContaining(['file_write', 'code_edit']));
    });

    it('collects unique file paths', async () => {
      await agentTraceRepository.create({
        record: {
          version: '0.1.0',
          id: 'fp-sum-1',
          timestamp: new Date().toISOString(),
          files: [
            { path: '/src/a.ts', conversations: [] },
            { path: '/src/b.ts', conversations: [] },
          ],
        },
        sessionId: 'session-fp',
      });
      await agentTraceRepository.create({
        record: {
          version: '0.1.0',
          id: 'fp-sum-2',
          timestamp: new Date().toISOString(),
          files: [{ path: '/src/a.ts', conversations: [] }],
        },
        sessionId: 'session-fp',
      });

      const summary = await agentTraceRepository.getSessionSummary('session-fp');
      expect(summary!.uniqueFilePaths).toEqual(expect.arrayContaining(['/src/a.ts', '/src/b.ts']));
      expect(summary!.uniqueFilePaths).toHaveLength(2);
    });

    it('computes duration from first to last timestamp', async () => {
      const t1 = new Date('2024-01-15T10:00:00Z');
      const t2 = new Date('2024-01-15T10:05:00Z');

      await agentTraceRepository.create({
        record: { version: '0.1.0', id: 'dur-1', timestamp: t1.toISOString(), files: [] },
        sessionId: 'session-dur',
      });
      await agentTraceRepository.create({
        record: { version: '0.1.0', id: 'dur-2', timestamp: t2.toISOString(), files: [] },
        sessionId: 'session-dur',
      });

      const summary = await agentTraceRepository.getSessionSummary('session-dur');
      expect(summary!.durationMs).toBe(300000); // 5 minutes
    });

    it('aggregates token usage from metadata', async () => {
      await agentTraceRepository.create({
        record: {
          version: '0.1.0',
          id: 'tok-1',
          timestamp: new Date().toISOString(),
          files: [],
          metadata: {
            tokenUsage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
          },
        },
        sessionId: 'session-tok',
      });
      await agentTraceRepository.create({
        record: {
          version: '0.1.0',
          id: 'tok-2',
          timestamp: new Date().toISOString(),
          files: [],
          metadata: {
            tokenUsage: { promptTokens: 200, completionTokens: 100, totalTokens: 300 },
          },
        },
        sessionId: 'session-tok',
      });

      const summary = await agentTraceRepository.getSessionSummary('session-tok');
      expect(summary!.tokenUsage.promptTokens).toBe(300);
      expect(summary!.tokenUsage.completionTokens).toBe(150);
      expect(summary!.tokenUsage.totalTokens).toBe(450);
    });

    it('computes average latency', async () => {
      await agentTraceRepository.create({
        record: {
          version: '0.1.0',
          id: 'lat-1',
          timestamp: new Date().toISOString(),
          files: [],
          metadata: { latencyMs: 100 },
        },
        sessionId: 'session-lat',
      });
      await agentTraceRepository.create({
        record: {
          version: '0.1.0',
          id: 'lat-2',
          timestamp: new Date().toISOString(),
          files: [],
          metadata: { latencyMs: 300 },
        },
        sessionId: 'session-lat',
      });

      const summary = await agentTraceRepository.getSessionSummary('session-lat');
      expect(summary!.avgLatencyMs).toBe(200);
      expect(summary!.totalLatencyMs).toBe(400);
    });
  });

  describe('getStats', () => {
    it('returns zeroed stats when empty', async () => {
      const stats = await agentTraceRepository.getStats();
      expect(stats.totalTraces).toBe(0);
      expect(stats.sessionCount).toBe(0);
      expect(stats.totalTokens).toBe(0);
      expect(stats.oldestTimestamp).toBeNull();
      expect(stats.newestTimestamp).toBeNull();
    });

    it('returns correct total trace count', async () => {
      for (let i = 0; i < 3; i++) {
        await agentTraceRepository.create({
          record: { version: '0.1.0', id: `stat-${i}`, timestamp: new Date().toISOString(), files: [] },
        });
      }

      const stats = await agentTraceRepository.getStats();
      expect(stats.totalTraces).toBe(3);
    });

    it('counts unique sessions', async () => {
      await agentTraceRepository.create({
        record: { version: '0.1.0', id: 'sc-1', timestamp: new Date().toISOString(), files: [] },
        sessionId: 'sa',
      });
      await agentTraceRepository.create({
        record: { version: '0.1.0', id: 'sc-2', timestamp: new Date().toISOString(), files: [] },
        sessionId: 'sa',
      });
      await agentTraceRepository.create({
        record: { version: '0.1.0', id: 'sc-3', timestamp: new Date().toISOString(), files: [] },
        sessionId: 'sb',
      });

      const stats = await agentTraceRepository.getStats();
      expect(stats.sessionCount).toBe(2);
    });

    it('aggregates event type counts', async () => {
      await agentTraceRepository.create({
        record: {
          version: '0.1.0',
          id: 'etc-1',
          timestamp: new Date().toISOString(),
          eventType: 'step_start',
          files: [],
        },
      });
      await agentTraceRepository.create({
        record: {
          version: '0.1.0',
          id: 'etc-2',
          timestamp: new Date().toISOString(),
          eventType: 'response',
          files: [],
        },
      });

      const stats = await agentTraceRepository.getStats();
      expect(stats.eventTypeCounts.step_start).toBe(1);
      expect(stats.eventTypeCounts.response).toBe(1);
    });

    it('tracks oldest and newest timestamps', async () => {
      const old = new Date('2024-01-01T00:00:00Z');
      const recent = new Date('2024-01-15T00:00:00Z');

      await agentTraceRepository.create({
        record: { version: '0.1.0', id: 'ts-1', timestamp: old.toISOString(), files: [] },
      });
      await agentTraceRepository.create({
        record: { version: '0.1.0', id: 'ts-2', timestamp: recent.toISOString(), files: [] },
      });

      const stats = await agentTraceRepository.getStats();
      expect(stats.oldestTimestamp).toBe(old.toISOString());
      expect(stats.newestTimestamp).toBe(recent.toISOString());
    });

    it('estimates storage size', async () => {
      await agentTraceRepository.create({
        record: { version: '0.1.0', id: 'stor-1', timestamp: new Date().toISOString(), files: [] },
      });

      const stats = await agentTraceRepository.getStats();
      expect(stats.storageEstimateBytes).toBeGreaterThan(0);
    });

    it('aggregates total tokens from metadata', async () => {
      await agentTraceRepository.create({
        record: {
          version: '0.1.0',
          id: 'toks-1',
          timestamp: new Date().toISOString(),
          files: [],
          metadata: { tokenUsage: { totalTokens: 500 } },
        },
      });
      await agentTraceRepository.create({
        record: {
          version: '0.1.0',
          id: 'toks-2',
          timestamp: new Date().toISOString(),
          files: [],
          metadata: { tokenUsage: { totalTokens: 300 } },
        },
      });

      const stats = await agentTraceRepository.getStats();
      expect(stats.totalTokens).toBe(800);
    });
  });

  describe('observation rows', () => {
    it('derives parse-safe observation rows with correlation metadata', async () => {
      await agentTraceRepository.create({
        record: {
          version: '0.1.0',
          id: 'obs-1',
          timestamp: new Date('2026-03-14T08:00:00.000Z').toISOString(),
          eventType: 'tool_call_result',
          traceId: 'trace-1',
          turnId: 'turn-1',
          files: [{ path: '/src/file.ts', conversations: [] }],
          metadata: {
            sessionId: 'session-obs',
            toolName: 'file_write',
            success: false,
            error: 'write failed',
            responsePreview: 'denied',
            agentId: 'agent-1',
            agentName: 'Agent One',
            acpSessionId: 'acp-1',
          },
        },
        sessionId: 'session-obs',
      });

      await db.agentTraces.add({
        id: 'obs-malformed',
        sessionId: 'session-obs',
        timestamp: new Date('2026-03-14T08:01:00.000Z'),
        record: '{"version":"0.1.0","id":"broken"',
        createdAt: new Date('2026-03-14T08:01:00.000Z'),
      });

      const rows = await agentTraceRepository.getObservationRows({ sessionId: 'session-obs' });

      expect(rows).toHaveLength(2);
      expect(rows[0]).toMatchObject({
        id: 'obs-malformed',
        parseStatus: 'degraded',
        eventType: 'parse_error',
        outcome: 'error',
        sessionId: 'session-obs',
      });
      expect(rows[1]).toMatchObject({
        id: 'obs-1',
        parseStatus: 'ok',
        eventType: 'tool_call_result',
        outcome: 'error',
        toolName: 'file_write',
        error: 'write failed',
        responsePreview: 'denied',
        correlation: {
          traceId: 'trace-1',
          turnId: 'turn-1',
          agentId: 'agent-1',
          agentName: 'Agent One',
          externalSessionId: 'acp-1',
        },
      });
    });

    it('filters observation rows by outcome, tool name, and correlation fields', async () => {
      await agentTraceRepository.create({
        record: {
          version: '0.1.0',
          id: 'obs-success',
          timestamp: new Date('2026-03-14T09:00:00.000Z').toISOString(),
          eventType: 'tool_call_result',
          traceId: 'trace-success',
          turnId: 'turn-success',
          files: [],
          metadata: {
            sessionId: 'session-filter',
            toolName: 'file_write',
            success: true,
          },
        },
        sessionId: 'session-filter',
      });

      await agentTraceRepository.create({
        record: {
          version: '0.1.0',
          id: 'obs-error',
          timestamp: new Date('2026-03-14T09:01:00.000Z').toISOString(),
          eventType: 'tool_call_result',
          traceId: 'trace-error',
          turnId: 'turn-error',
          files: [],
          metadata: {
            sessionId: 'session-filter',
            toolName: 'code_edit',
            success: false,
            error: 'edit failed',
          },
        },
        sessionId: 'session-filter',
      });

      const rows = await agentTraceRepository.getObservationRows({
        outcome: 'error',
        toolName: 'code',
        traceId: 'trace-error',
        turnId: 'turn-error',
      });

      expect(rows).toHaveLength(1);
      expect(rows[0].id).toBe('obs-error');
    });

    it('exports enriched observation bundle with filters and session summaries', async () => {
      await agentTraceRepository.create({
        record: {
          version: '0.1.0',
          id: 'bundle-1',
          timestamp: new Date('2026-03-14T10:00:00.000Z').toISOString(),
          eventType: 'response',
          files: [],
          metadata: {
            sessionId: 'session-bundle',
            success: true,
            responsePreview: 'completed',
            tokenUsage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
          },
        },
        sessionId: 'session-bundle',
      });

      const bundle = await agentTraceRepository.exportObservationBundle({
        sessionId: 'session-bundle',
      });

      expect(bundle.filters).toMatchObject({ sessionId: 'session-bundle' });
      expect(bundle.rows).toHaveLength(1);
      expect(bundle.rows[0].id).toBe('bundle-1');
      expect(bundle.sessionSummaries).toHaveLength(1);
      expect(bundle.sessionSummaries[0].sessionId).toBe('session-bundle');
      expect(bundle.parseFailureCount).toBe(0);
    });
  });
});
