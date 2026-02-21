/**
 * Transformers.js Web Worker tests
 */

const mockPipeline = jest.fn();
const mockDispose = jest.fn();

const postedMessages: Array<{
  id: string;
  type: string;
  data?: unknown;
  error?: string;
  errorCode?: string;
  duration?: number;
  progress?: unknown;
}> = [];

let messageHandler: ((event: MessageEvent) => Promise<void>) | null = null;

const origAddEventListener = globalThis.addEventListener;
const origPostMessage = globalThis.postMessage;

globalThis.addEventListener = ((type: string, listener: EventListenerOrEventListenerObject) => {
  if (type === 'message') {
    messageHandler = listener as unknown as (event: MessageEvent) => Promise<void>;
  }
}) as typeof globalThis.addEventListener;

globalThis.postMessage = ((msg: unknown) => {
  postedMessages.push(msg as (typeof postedMessages)[number]);
}) as typeof globalThis.postMessage;

jest.mock('@huggingface/transformers', () => ({
  pipeline: (...args: unknown[]) => mockPipeline(...args),
  env: { allowLocalModels: true },
}));

require('./worker');

afterAll(() => {
  globalThis.addEventListener = origAddEventListener;
  globalThis.postMessage = origPostMessage;
});

beforeEach(async () => {
  postedMessages.length = 0;
  mockPipeline.mockReset();
  mockDispose.mockReset();
  if (messageHandler) {
    await sendMessage('dispose', {}, 'test-reset');
    postedMessages.length = 0;
  }
});

async function sendMessage(type: string, payload: Record<string, unknown>, id = 'test-1') {
  if (!messageHandler) throw new Error('Worker message handler not captured');
  const event = { data: { id, type, payload } } as MessageEvent;
  await messageHandler(event);
  await new Promise((resolve) => setTimeout(resolve, 5));
}

function createDisposablePipeline() {
  const callable = jest.fn().mockResolvedValue([]);
  Object.assign(callable, { dispose: mockDispose });
  return callable;
}

describe('worker message handler', () => {
  it('handler was captured', () => {
    expect(messageHandler).not.toBeNull();
  });

  it('loads a model and responds with loaded message', async () => {
    const mockPipe = jest.fn();
    mockPipeline.mockResolvedValue(mockPipe);

    await sendMessage('load', { task: 'text-classification', modelId: 'Xenova/test-model' });

    expect(mockPipeline).toHaveBeenCalledWith(
      'text-classification',
      'Xenova/test-model',
      expect.objectContaining({ progress_callback: expect.any(Function) })
    );

    const loadedMsg = postedMessages.find((m) => m.type === 'loaded');
    expect(loadedMsg).toBeDefined();
    expect(loadedMsg!.data).toEqual({ task: 'text-classification', modelId: 'Xenova/test-model' });
  });

  it('includes task in progress events', async () => {
    mockPipeline.mockImplementation((_task: string, _model: string, options: Record<string, unknown>) => {
      const cb = options.progress_callback as (p: Record<string, unknown>) => void;
      cb({ status: 'downloading', progress: 50, file: 'model.onnx' });
      return Promise.resolve(jest.fn());
    });

    await sendMessage('load', { task: 'feature-extraction', modelId: 'Xenova/progress-test' }, 'progress-test');

    const progressMsg = postedMessages.find((m) => m.type === 'progress');
    expect(progressMsg).toBeDefined();
    expect(progressMsg!.progress).toEqual(
      expect.objectContaining({
        task: 'feature-extraction',
        modelId: 'Xenova/progress-test',
      })
    );
  });

  it('runs inference and returns result', async () => {
    const mockPipe = jest.fn().mockResolvedValue([{ label: 'POSITIVE', score: 0.99 }]);
    mockPipeline.mockResolvedValue(mockPipe);

    await sendMessage('infer', {
      task: 'text-classification',
      modelId: 'Xenova/infer-model',
      input: 'I love this!',
      options: {},
    });

    const resultMsg = postedMessages.find((m) => m.type === 'result');
    expect(resultMsg).toBeDefined();
    expect(resultMsg!.data).toEqual([{ label: 'POSITIVE', score: 0.99 }]);
  });

  it('supports cache eviction policy', async () => {
    mockPipeline.mockImplementation(async () => createDisposablePipeline());

    await sendMessage('load', {
      task: 'text-classification',
      modelId: 'Xenova/model-a',
      cachePolicy: { enabled: true, maxCachedModels: 1 },
    }, 'load-a');

    await sendMessage('load', {
      task: 'feature-extraction',
      modelId: 'Xenova/model-b',
      cachePolicy: { enabled: true, maxCachedModels: 1 },
    }, 'load-b');

    await sendMessage('status', {}, 'status-cache');

    const statusMsg = postedMessages.find((m) => m.id === 'status-cache' && m.type === 'status');
    expect(statusMsg).toBeDefined();
    const statusData = statusMsg!.data as {
      count: number;
      loadedModels: Array<{ modelId: string }>;
      cache: { currentCachedModels: number; maxCachedModels: number };
    };

    expect(statusData.count).toBe(1);
    expect(statusData.cache.maxCachedModels).toBe(1);
    expect(statusData.cache.currentCachedModels).toBe(1);
    expect(statusData.loadedModels[0].modelId).toBe('Xenova/model-b');
    expect(mockDispose).toHaveBeenCalled();
  });

  it('returns status with cache metadata', async () => {
    mockPipeline.mockResolvedValue(jest.fn());
    await sendMessage('load', { task: 'text-classification', modelId: 'Xenova/status-model' }, 'load-status');

    await sendMessage('status', {}, 'status-1');

    const statusMsg = postedMessages.find((m) => m.id === 'status-1' && m.type === 'status');
    expect(statusMsg).toBeDefined();
    expect(statusMsg!.data).toEqual(
      expect.objectContaining({
        count: expect.any(Number),
        loadedModels: expect.any(Array),
        cache: expect.objectContaining({
          enabled: expect.any(Boolean),
          maxCachedModels: expect.any(Number),
          currentCachedModels: expect.any(Number),
        }),
      })
    );
  });

  it('disposes all models when no task/modelId given', async () => {
    mockPipeline.mockImplementation(async () => createDisposablePipeline());

    await sendMessage('load', { task: 'text-classification', modelId: 'Xenova/dispose-all' }, 'load-dispose-all');
    postedMessages.length = 0;

    await sendMessage('dispose', {}, 'dispose-all');

    const resultMsg = postedMessages.find((m) => m.type === 'result');
    expect(resultMsg).toBeDefined();
    expect(resultMsg!.data).toEqual({ disposed: true });
  });

  it('returns typed error for invalid request', async () => {
    await sendMessage('load', { modelId: 'Xenova/test-model' });

    const errorMsg = postedMessages.find((m) => m.type === 'error');
    expect(errorMsg).toBeDefined();
    expect(errorMsg!.errorCode).toBe('invalid_request');
  });

  it('returns typed error for unknown message type', async () => {
    await sendMessage('unknown-type', {});

    const errorMsg = postedMessages.find((m) => m.type === 'error');
    expect(errorMsg).toBeDefined();
    expect(errorMsg!.errorCode).toBe('invalid_request');
  });
});
