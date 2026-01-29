/**
 * Tests for TTS Streaming
 */

import {
  StreamingAudioPlayer,
  BufferedStreamingPlayer,
  isStreamingSupported,
  isStreamingMimeTypeSupported,
  createStreamingHandler,
} from './tts-streaming';

// Mock AudioContext
const mockAudioContext = {
  createGain: jest.fn(() => ({
    connect: jest.fn(),
    gain: { value: 1 },
  })),
  createBufferSource: jest.fn(() => ({
    connect: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
    buffer: null,
    onended: null,
  })),
  decodeAudioData: jest.fn(() =>
    Promise.resolve({
      duration: 1,
    })
  ),
  destination: {},
  currentTime: 0,
  suspend: jest.fn(),
  resume: jest.fn(),
  close: jest.fn(),
};

// Mock global AudioContext
(global as Record<string, unknown>).AudioContext = jest.fn(() => mockAudioContext);

// Mock MediaSource
const mockSourceBuffer = {
  appendBuffer: jest.fn(),
  updating: false,
  addEventListener: jest.fn(),
};

const mockMediaSource = {
  readyState: 'open',
  addSourceBuffer: jest.fn(() => mockSourceBuffer),
  endOfStream: jest.fn(),
  addEventListener: jest.fn((event: string, callback: () => void) => {
    if (event === 'sourceopen') {
      setTimeout(callback, 0);
    }
  }),
};

(global as Record<string, unknown>).MediaSource = Object.assign(
  jest.fn(() => mockMediaSource),
  {
    isTypeSupported: jest.fn(() => true),
  }
);

// Mock URL
global.URL.createObjectURL = jest.fn(() => 'blob:test');
global.URL.revokeObjectURL = jest.fn();

describe('TTS Streaming', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('StreamingAudioPlayer', () => {
    it('should create instance', () => {
      const player = new StreamingAudioPlayer();
      expect(player).toBeDefined();
    });

    it('should accept options', () => {
      const onStateChange = jest.fn();
      const onProgress = jest.fn();
      const onError = jest.fn();

      const player = new StreamingAudioPlayer({
        onStateChange,
        onProgress,
        onError,
        volume: 0.8,
      });

      expect(player).toBeDefined();
    });

    it('should get initial state as idle', () => {
      const player = new StreamingAudioPlayer();
      expect(player.getState()).toBe('idle');
    });

    it('should stop without error', () => {
      const player = new StreamingAudioPlayer();
      expect(() => player.stop()).not.toThrow();
    });

    it('should pause without error', () => {
      const player = new StreamingAudioPlayer();
      expect(() => player.pause()).not.toThrow();
    });

    it('should resume without error', () => {
      const player = new StreamingAudioPlayer();
      expect(() => player.resume()).not.toThrow();
    });

    it('should destroy without error', () => {
      const player = new StreamingAudioPlayer();
      expect(() => player.destroy()).not.toThrow();
    });

    it('should set volume', () => {
      const player = new StreamingAudioPlayer();
      expect(() => player.setVolume(0.5)).not.toThrow();
    });
  });

  describe('BufferedStreamingPlayer', () => {
    it('should create instance with default mime type', () => {
      const player = new BufferedStreamingPlayer();
      expect(player).toBeDefined();
    });

    it('should create instance with custom mime type', () => {
      const player = new BufferedStreamingPlayer('audio/wav');
      expect(player).toBeDefined();
    });

    it('should get initial state as idle', () => {
      const player = new BufferedStreamingPlayer();
      expect(player.getState()).toBe('idle');
    });

    it('should stop without error', () => {
      const player = new BufferedStreamingPlayer();
      expect(() => player.stop()).not.toThrow();
    });

    it('should pause without error', () => {
      const player = new BufferedStreamingPlayer();
      expect(() => player.pause()).not.toThrow();
    });

    it('should set volume without error', () => {
      const player = new BufferedStreamingPlayer();
      expect(() => player.setVolume(0.5)).not.toThrow();
    });

    it('should destroy without error', () => {
      const player = new BufferedStreamingPlayer();
      expect(() => player.destroy()).not.toThrow();
    });

    it('should add chunk to pending when source not open', () => {
      const player = new BufferedStreamingPlayer();
      const chunk = new Uint8Array([1, 2, 3, 4]);
      expect(() => player.addChunk(chunk)).not.toThrow();
    });
  });

  describe('isStreamingSupported', () => {
    it('should return boolean', () => {
      const result = isStreamingSupported();
      expect(typeof result).toBe('boolean');
    });

    it('should return true when MediaSource is available', () => {
      expect(isStreamingSupported()).toBe(true);
    });
  });

  describe('isStreamingMimeTypeSupported', () => {
    it('should check audio/mpeg support', () => {
      const result = isStreamingMimeTypeSupported('audio/mpeg');
      expect(typeof result).toBe('boolean');
    });

    it('should check audio/wav support', () => {
      const result = isStreamingMimeTypeSupported('audio/wav');
      expect(typeof result).toBe('boolean');
    });
  });

  describe('createStreamingHandler', () => {
    it('should create a handler function', () => {
      const onChunk = jest.fn();
      const handler = createStreamingHandler(onChunk);
      expect(typeof handler).toBe('function');
    });

    it('should handle response without body', async () => {
      const onChunk = jest.fn();
      const handler = createStreamingHandler(onChunk);
      const mockResponse = { body: null } as Response;

      await expect(handler(mockResponse)).rejects.toThrow('No response body');
    });

    it('should process chunks from response', async () => {
      const onChunk = jest.fn();
      const handler = createStreamingHandler(onChunk);

      const mockReader = {
        read: jest
          .fn()
          .mockResolvedValueOnce({ done: false, value: new Uint8Array([1, 2, 3]) })
          .mockResolvedValueOnce({ done: true, value: undefined }),
      };

      const mockResponse = {
        body: {
          getReader: () => mockReader,
        },
      } as unknown as Response;

      await handler(mockResponse);

      expect(onChunk).toHaveBeenCalledTimes(1);
      expect(onChunk).toHaveBeenCalledWith(expect.any(Uint8Array));
    });
  });
});
