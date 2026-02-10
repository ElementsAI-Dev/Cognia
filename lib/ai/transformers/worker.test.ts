/**
 * Transformers.js Web Worker tests
 * Tests the message handler logic by intercepting self.addEventListener
 * before the worker module loads.
 */

const mockPipeline = jest.fn();
const mockDispose = jest.fn();

// Messages collected from self.postMessage
const postedMessages: Array<{ id: string; type: string; data?: unknown; error?: string; duration?: number; progress?: unknown }> = [];

// Captured message handler
let messageHandler: ((event: MessageEvent) => Promise<void>) | null = null;

// Intercept addEventListener and postMessage BEFORE worker loads
const origAddEventListener = globalThis.addEventListener;
const origPostMessage = globalThis.postMessage;

globalThis.addEventListener = ((type: string, listener: EventListenerOrEventListenerObject) => {
  if (type === 'message') {
    messageHandler = listener as unknown as (event: MessageEvent) => Promise<void>;
  }
}) as typeof globalThis.addEventListener;

globalThis.postMessage = ((msg: unknown) => {
  postedMessages.push(msg as typeof postedMessages[0]);
}) as typeof globalThis.postMessage;

// Mock @huggingface/transformers before loading worker
jest.mock('@huggingface/transformers', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pipeline: (...args: any[]) => mockPipeline(...args),
  env: { allowLocalModels: true },
}));

// Now load the worker — it will call self.addEventListener('message', handler)
// eslint-disable-next-line @typescript-eslint/no-require-imports
require('./worker');

afterAll(() => {
  globalThis.addEventListener = origAddEventListener;
  globalThis.postMessage = origPostMessage;
});

beforeEach(() => {
  postedMessages.length = 0;
  mockPipeline.mockReset();
  mockDispose.mockReset();
});

async function sendMessage(type: string, payload: Record<string, unknown>, id = 'test-1') {
  if (!messageHandler) throw new Error('Worker message handler not captured');
  const event = { data: { id, type, payload } } as MessageEvent;
  await messageHandler(event);
  // Allow microtasks to flush
  await new Promise((resolve) => setTimeout(resolve, 10));
}

describe('worker message handler', () => {
  it('handler was captured', () => {
    expect(messageHandler).not.toBeNull();
  });

  describe('load', () => {
    it('loads a model and responds with loaded message', async () => {
      const mockPipe = jest.fn();
      mockPipeline.mockResolvedValue(mockPipe);

      await sendMessage('load', { task: 'text-classification', modelId: 'Xenova/test-model' });

      expect(mockPipeline).toHaveBeenCalledWith(
        'text-classification',
        'Xenova/test-model',
        expect.objectContaining({
          progress_callback: expect.any(Function),
        })
      );

      const loadedMsg = postedMessages.find((m) => m.type === 'loaded');
      expect(loadedMsg).toBeDefined();
      expect(loadedMsg!.data).toEqual({ task: 'text-classification', modelId: 'Xenova/test-model' });
      expect(loadedMsg!.duration).toBeGreaterThanOrEqual(0);
    });

    it('sends error when task is missing', async () => {
      await sendMessage('load', { modelId: 'Xenova/test-model' });

      const errorMsg = postedMessages.find((m) => m.type === 'error');
      expect(errorMsg).toBeDefined();
      expect(errorMsg!.error).toContain('task and modelId are required');
    });

    it('sends error when modelId is missing', async () => {
      await sendMessage('load', { task: 'text-classification' });

      const errorMsg = postedMessages.find((m) => m.type === 'error');
      expect(errorMsg).toBeDefined();
      expect(errorMsg!.error).toContain('task and modelId are required');
    });

    it('passes device and dtype options to pipeline', async () => {
      mockPipeline.mockResolvedValue(jest.fn());

      await sendMessage('load', {
        task: 'feature-extraction',
        modelId: 'Xenova/embed',
        device: 'webgpu',
        dtype: 'fp16',
      });

      expect(mockPipeline).toHaveBeenCalledWith(
        'feature-extraction',
        'Xenova/embed',
        expect.objectContaining({
          device: 'webgpu',
          dtype: 'fp16',
        })
      );
    });

    it('sends progress events during download', async () => {
      mockPipeline.mockImplementation((_task: string, _model: string, options: Record<string, unknown>) => {
        const cb = options.progress_callback as (p: Record<string, unknown>) => void;
        cb({ status: 'downloading', progress: 50, file: 'model.onnx' });
        cb({ status: 'ready' });
        return Promise.resolve(jest.fn());
      });

      await sendMessage('load', { task: 'text-classification', modelId: 'Xenova/progress-test' }, 'progress-test');

      const progressMsgs = postedMessages.filter((m) => m.type === 'progress');
      expect(progressMsgs.length).toBeGreaterThanOrEqual(1);
      expect(progressMsgs[0].progress).toEqual(
        expect.objectContaining({
          modelId: 'Xenova/progress-test',
          status: 'downloading',
          progress: 50,
        })
      );
    });
  });

  describe('infer', () => {
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
      expect(resultMsg!.duration).toBeGreaterThanOrEqual(0);
    });

    it('sends error when task is missing for infer', async () => {
      await sendMessage('infer', { modelId: 'Xenova/test', input: 'test' });

      const errorMsg = postedMessages.find((m) => m.type === 'error');
      expect(errorMsg).toBeDefined();
      expect(errorMsg!.error).toContain('task and modelId are required');
    });
  });

  describe('dispose', () => {
    it('disposes a specific model', async () => {
      const mockPipe = { dispose: mockDispose };
      mockPipeline.mockResolvedValue(mockPipe);

      // First load
      await sendMessage('load', { task: 'text-classification', modelId: 'Xenova/dispose-test' }, 'load-1');
      postedMessages.length = 0;

      // Then dispose
      await sendMessage('dispose', { task: 'text-classification', modelId: 'Xenova/dispose-test' }, 'dispose-1');

      const resultMsg = postedMessages.find((m) => m.type === 'result');
      expect(resultMsg).toBeDefined();
      expect(resultMsg!.data).toEqual({ disposed: true });
    });

    it('disposes all models when no task/modelId given', async () => {
      const mockPipe = { dispose: mockDispose };
      mockPipeline.mockResolvedValue(mockPipe);

      await sendMessage('load', { task: 'text-classification', modelId: 'Xenova/dispose-all-test' }, 'l1');
      postedMessages.length = 0;

      await sendMessage('dispose', {}, 'dispose-all');

      const resultMsg = postedMessages.find((m) => m.type === 'result');
      expect(resultMsg).toBeDefined();
      expect(resultMsg!.data).toEqual({ disposed: true });
    });
  });

  describe('status', () => {
    it('returns loaded models info', async () => {
      await sendMessage('status', {}, 'status-1');

      const statusMsg = postedMessages.find((m) => m.type === 'status');
      expect(statusMsg).toBeDefined();
      expect(statusMsg!.data).toEqual(
        expect.objectContaining({
          count: expect.any(Number),
          loadedModels: expect.any(Array),
        })
      );
    });
  });

  describe('unknown message type', () => {
    it('sends error for unknown type', async () => {
      await sendMessage('unknown-type', {});

      const errorMsg = postedMessages.find((m) => m.type === 'error');
      expect(errorMsg).toBeDefined();
      expect(errorMsg!.error).toContain('Unknown message type');
    });
  });
});
