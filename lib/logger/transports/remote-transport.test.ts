import { RemoteTransport } from './remote-transport';
import type {
  RemoteRetryQueueBatch,
  RemoteRetryQueueEnqueueResult,
  RemoteRetryQueueLimits,
  RemoteRetryQueueStats,
  RemoteRetryQueueStore,
} from './remote-retry-queue-store';
import type { StructuredLogEntry, TransportDiagnosticEvent } from '../types';

class MemoryQueueStore implements RemoteRetryQueueStore {
  private limits: RemoteRetryQueueLimits;
  private records: RemoteRetryQueueBatch[];
  private nextId = 1;

  constructor(
    limits: RemoteRetryQueueLimits = { maxEntries: 5_000, maxBytes: 10 * 1024 * 1024 },
    seed: RemoteRetryQueueBatch[] = []
  ) {
    this.limits = limits;
    this.records = seed.map((item) => ({
      ...item,
      entries: [...item.entries],
    }));
    const maxId = seed.reduce((acc, item) => Math.max(acc, item.id), 0);
    this.nextId = maxId + 1;
  }

  updateLimits(limits: Partial<RemoteRetryQueueLimits>): void {
    this.limits = {
      maxEntries: limits.maxEntries ?? this.limits.maxEntries,
      maxBytes: limits.maxBytes ?? this.limits.maxBytes,
    };
  }

  async enqueueBatch(entries: StructuredLogEntry[]): Promise<RemoteRetryQueueEnqueueResult> {
    const batch: RemoteRetryQueueBatch = {
      id: this.nextId++,
      createdAt: new Date().toISOString(),
      entries: [...entries],
      bytes: JSON.stringify(entries).length,
    };
    this.records.push(batch);

    let droppedEntries = 0;
    let droppedBatches = 0;
    while (this.computeStats().entryCount > this.limits.maxEntries || this.computeStats().totalBytes > this.limits.maxBytes) {
      const removed = this.records.shift();
      if (!removed) break;
      droppedEntries += removed.entries.length;
      droppedBatches += 1;
    }

    return {
      droppedEntries,
      droppedBatches,
      stats: this.computeStats(),
    };
  }

  async listBatches(): Promise<RemoteRetryQueueBatch[]> {
    return this.records.map((item) => ({
      ...item,
      entries: [...item.entries],
    }));
  }

  async deleteBatch(id: number): Promise<void> {
    this.records = this.records.filter((item) => item.id !== id);
  }

  async getStats(): Promise<RemoteRetryQueueStats> {
    return this.computeStats();
  }

  async clear(): Promise<void> {
    this.records = [];
  }

  async close(): Promise<void> {
    return;
  }

  private computeStats(): RemoteRetryQueueStats {
    return this.records.reduce<RemoteRetryQueueStats>(
      (acc, batch) => {
        acc.batchCount += 1;
        acc.entryCount += batch.entries.length;
        acc.totalBytes += batch.bytes;
        return acc;
      },
      { batchCount: 0, entryCount: 0, totalBytes: 0 }
    );
  }
}

function createEntry(id: string, message = 'test'): StructuredLogEntry {
  return {
    id,
    timestamp: new Date().toISOString(),
    level: 'info',
    module: 'test',
    message,
  };
}

describe('RemoteTransport', () => {
  const fetchMock = jest.fn();

  beforeAll(() => {
    Object.defineProperty(global, 'fetch', {
      value: fetchMock,
      writable: true,
    });
  });

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('replays persisted batches on startup in order', async () => {
    fetchMock.mockResolvedValue({ ok: true } as Response);

    const seed: RemoteRetryQueueBatch[] = [
      { id: 1, createdAt: new Date().toISOString(), entries: [createEntry('a')], bytes: 10 },
      { id: 2, createdAt: new Date().toISOString(), entries: [createEntry('b')], bytes: 10 },
    ];
    const queueStore = new MemoryQueueStore(undefined, seed);

    const transport = new RemoteTransport({
      endpoint: 'https://example.com/logs',
      queueStore,
      flushInterval: 60_000,
    });

    await transport.flush();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][1]?.body as string).toContain('"id":"a"');
    expect(fetchMock.mock.calls[1][1]?.body as string).toContain('"id":"b"');

    const stats = await queueStore.getStats();
    expect(stats.entryCount).toBe(0);

    await transport.close();
  });

  it('persists failed sends and emits overflow diagnostics when queue limits are exceeded', async () => {
    fetchMock.mockRejectedValue(new Error('network down'));

    const diagnostics: TransportDiagnosticEvent[] = [];
    const queueStore = new MemoryQueueStore({ maxEntries: 1, maxBytes: 10 * 1024 * 1024 });
    const transport = new RemoteTransport({
      endpoint: 'https://example.com/logs',
      queueStore,
      batchSize: 1,
      maxQueueEntries: 1,
      maxRetries: 0,
      flushInterval: 60_000,
      diagnosticEmitter: (event) => diagnostics.push(event),
      diagnosticRateLimitMs: 0,
    });

    transport.log(createEntry('1', 'first'));
    transport.log(createEntry('2', 'second'));

    await transport.flush();

    const stats = await queueStore.getStats();
    expect(stats.entryCount).toBeLessThanOrEqual(1);
    expect(diagnostics.some((event) => event.code === 'logger.remote.queue_overflow')).toBe(true);
    expect(transport.getHealth().droppedEntries).toBeGreaterThan(0);

    await transport.close();
  });

  it('updates health snapshot through failure and recovery transitions', async () => {
    const queueStore = new MemoryQueueStore();
    const diagnostics: TransportDiagnosticEvent[] = [];

    fetchMock.mockRejectedValueOnce(new Error('remote unavailable'));

    const transport = new RemoteTransport({
      endpoint: 'https://example.com/logs',
      queueStore,
      maxRetries: 0,
      flushInterval: 60_000,
      diagnosticEmitter: (event) => diagnostics.push(event),
      diagnosticRateLimitMs: 0,
    });

    transport.log(createEntry('health-1'));
    await transport.flush();

    const degraded = transport.getHealth();
    expect(degraded.status).toBe('degraded');
    expect(degraded.queueDepth).toBeGreaterThan(0);
    expect(degraded.retryCount).toBeGreaterThan(0);
    expect(degraded.lastFailureAt).toBeDefined();

    fetchMock.mockResolvedValue({ ok: true } as Response);

    await transport.flush();

    const recovered = transport.getHealth();
    expect(recovered.status).toBe('healthy');
    expect(recovered.queueDepth).toBe(0);
    expect(recovered.retryCount).toBe(0);
    expect(recovered.lastSuccessAt).toBeDefined();
    expect(diagnostics.some((event) => event.code === 'logger.remote.recovered')).toBe(true);

    await transport.close();
  });
});
