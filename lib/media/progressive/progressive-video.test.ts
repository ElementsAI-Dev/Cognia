/**
 * Tests for Progressive Video Loading
 */

import {
  isMSESupported,
  ProgressiveVideoLoader,
  createProgressiveLoader,
  type VideoQuality,
  type LoadingState,
  type VideoSegment,
  type ProgressiveVideoInfo,
} from './progressive-video';

// Mock HTMLVideoElement and related APIs
const mockVideoElement = {
  crossOrigin: '',
  preload: '',
  src: '',
  duration: 120,
  videoWidth: 1920,
  videoHeight: 1080,
  addEventListener: jest.fn((event: string, handler: () => void) => {
    if (event === 'loadedmetadata') {
      setTimeout(handler, 0);
    }
  }),
  removeEventListener: jest.fn(),
};

const mockCanvas = {
  width: 0,
  height: 0,
  getContext: jest.fn(() => ({
    drawImage: jest.fn(),
    getImageData: jest.fn(() => ({
      data: new Uint8ClampedArray(160 * 90 * 4),
      width: 160,
      height: 90,
    })),
  })),
  toDataURL: jest.fn(() => 'data:image/jpeg;base64,test'),
};

// Mock DOM APIs - use spyOn to avoid redefining errors
const originalCreateElement = document.createElement.bind(document);
jest.spyOn(document, 'createElement').mockImplementation((tag: string) => {
  if (tag === 'video') {
    return { ...mockVideoElement } as unknown as HTMLElement;
  }
  if (tag === 'canvas') {
    return { ...mockCanvas } as unknown as HTMLElement;
  }
  return originalCreateElement(tag);
});

// Mock OffscreenCanvas
class MockOffscreenCanvas {
  width: number;
  height: number;
  
  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
  }
  
  getContext() {
    return {
      drawImage: jest.fn(),
      getImageData: jest.fn(() => ({
        data: new Uint8ClampedArray(this.width * this.height * 4),
        width: this.width,
        height: this.height,
      })),
    };
  }
}

(global as unknown as { OffscreenCanvas: typeof MockOffscreenCanvas }).OffscreenCanvas = MockOffscreenCanvas;

// Mock fetch
global.fetch = jest.fn().mockImplementation((url: string, options?: RequestInit) => {
  const _isHead = options?.method === 'HEAD';
  const hasRange = options?.headers && (options.headers as Record<string, string>).Range;
  
  return Promise.resolve({
    ok: true,
    status: hasRange ? 206 : 200,
    headers: {
      get: (name: string) => {
        if (name === 'Content-Length') return '10000000';
        if (name === 'Content-Range') return 'bytes 0-999999/10000000';
        return null;
      },
    },
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(1000)),
  });
});

// Mock MediaSource
const mockMediaSource = {
  readyState: 'open' as MediaSourceReadyState,
  addSourceBuffer: jest.fn(() => ({
    addEventListener: jest.fn(),
    appendBuffer: jest.fn(),
    abort: jest.fn(),
    updating: false,
  })),
  removeSourceBuffer: jest.fn(),
  addEventListener: jest.fn((event: string, handler: () => void) => {
    if (event === 'sourceopen') {
      setTimeout(handler, 0);
    }
  }),
};

(global as unknown as { MediaSource: unknown }).MediaSource = jest.fn(() => mockMediaSource);
(global as unknown as { MediaSource: { isTypeSupported: (type: string) => boolean } }).MediaSource.isTypeSupported = jest.fn(() => true);

// Mock URL.createObjectURL and revokeObjectURL
global.URL.createObjectURL = jest.fn(() => 'blob:test-url');
global.URL.revokeObjectURL = jest.fn();

describe('Progressive Video Loading', () => {
  describe('isMSESupported', () => {
    it('should return true when MediaSource is available', () => {
      expect(isMSESupported()).toBe(true);
    });
  });

  describe('ProgressiveVideoLoader', () => {
    let loader: ProgressiveVideoLoader;

    beforeEach(() => {
      loader = new ProgressiveVideoLoader();
      jest.clearAllMocks();
    });

    afterEach(() => {
      loader.dispose();
    });

    describe('initial state', () => {
      it('should start in idle state', () => {
        const state = loader.getState();
        expect(state.state).toBe('idle');
        expect(state.loadedSegments).toBe(0);
      });

      it('should have no video info initially', () => {
        expect(loader.getVideoInfo()).toBeNull();
      });
    });

    describe('initialize', () => {
      it('should initialize with video URL', async () => {
        const info = await loader.initialize('http://example.com/video.mp4');
        
        expect(info).toBeDefined();
        expect(info.url).toBe('http://example.com/video.mp4');
      });

      it('should set loading state to partial after initialization', async () => {
        await loader.initialize('http://example.com/video.mp4');
        
        const state = loader.getState();
        expect(state.state).toBe('partial');
      });

      it('should store video info after initialization', async () => {
        await loader.initialize('http://example.com/video.mp4');
        
        const info = loader.getVideoInfo();
        expect(info).not.toBeNull();
        expect(info?.duration).toBe(120);
      });
    });

    describe('preloadSegment', () => {
      beforeEach(async () => {
        await loader.initialize('http://example.com/video.mp4');
      });

      it('should preload a video segment', async () => {
        const segment = await loader.preloadSegment(0, 10);
        
        expect(segment).toBeDefined();
        expect(segment.loaded).toBe(true);
        expect(segment.startTime).toBe(0);
        expect(segment.endTime).toBe(10);
      });

      it('should return cached segment if already loaded', async () => {
        const segment1 = await loader.preloadSegment(0, 10);
        const segment2 = await loader.preloadSegment(0, 10);
        
        expect(segment1).toBe(segment2);
      });

      it('should update loaded segments count', async () => {
        await loader.preloadSegment(0, 10);
        await loader.preloadSegment(10, 20);
        
        const state = loader.getState();
        expect(state.loadedSegments).toBe(2);
      });
    });

    describe('setQuality', () => {
      beforeEach(async () => {
        await loader.initialize('http://example.com/video.mp4');
      });

      it('should change quality level', async () => {
        await loader.setQuality('high');
        
        const state = loader.getState();
        expect(state.quality).toBe('high');
      });

      it('should clear segments when quality changes', async () => {
        await loader.preloadSegment(0, 10);
        await loader.setQuality('high');
        
        const state = loader.getState();
        expect(state.loadedSegments).toBe(0);
      });

      it('should not clear segments if quality is the same', async () => {
        await loader.preloadSegment(0, 10);
        await loader.setQuality('preview'); // Default quality
        
        const state = loader.getState();
        expect(state.loadedSegments).toBe(1);
      });
    });

    describe('cancel', () => {
      it('should cancel loading and reset state', async () => {
        await loader.initialize('http://example.com/video.mp4');
        loader.cancel();
        
        const state = loader.getState();
        expect(state.state).toBe('idle');
      });
    });

    describe('dispose', () => {
      it('should clean up all resources', async () => {
        await loader.initialize('http://example.com/video.mp4');
        await loader.preloadSegment(0, 10);
        
        loader.dispose();
        
        const state = loader.getState();
        expect(state.loadedSegments).toBe(0);
        expect(loader.getVideoInfo()).toBeNull();
      });
    });
  });

  describe('createProgressiveLoader', () => {
    it('should create a new ProgressiveVideoLoader instance', () => {
      const loader = createProgressiveLoader();
      expect(loader).toBeInstanceOf(ProgressiveVideoLoader);
      loader.dispose();
    });
  });

  describe('VideoQuality type', () => {
    it('should accept valid quality values', () => {
      const qualities: VideoQuality[] = ['thumbnail', 'preview', 'standard', 'high', 'original'];
      expect(qualities).toHaveLength(5);
    });
  });

  describe('LoadingState type', () => {
    it('should accept valid state values', () => {
      const states: LoadingState[] = ['idle', 'loading', 'partial', 'complete', 'error'];
      expect(states).toHaveLength(5);
    });
  });

  describe('VideoSegment interface', () => {
    it('should have correct structure', () => {
      const segment: VideoSegment = {
        index: 0,
        startTime: 0,
        endTime: 10,
        loaded: true,
        url: 'http://example.com/segment.mp4',
      };

      expect(segment.index).toBe(0);
      expect(segment.startTime).toBe(0);
      expect(segment.endTime).toBe(10);
      expect(segment.loaded).toBe(true);
      expect(segment.url).toBe('http://example.com/segment.mp4');
    });
  });

  describe('ProgressiveVideoInfo interface', () => {
    it('should have correct structure', () => {
      const info: ProgressiveVideoInfo = {
        url: 'http://example.com/video.mp4',
        duration: 120,
        width: 1920,
        height: 1080,
        frameRate: 30,
        fileSize: 10000000,
        mimeType: 'video/mp4',
      };

      expect(info.url).toBe('http://example.com/video.mp4');
      expect(info.duration).toBe(120);
      expect(info.width).toBe(1920);
      expect(info.height).toBe(1080);
      expect(info.frameRate).toBe(30);
      expect(info.fileSize).toBe(10000000);
      expect(info.mimeType).toBe('video/mp4');
    });
  });
});

describe('Byte Range Loading', () => {
  describe('Range header calculation', () => {
    it('should calculate byte ranges from time positions', () => {
      const totalFileSize = 10_000_000; // 10 MB
      const duration = 100; // 100 seconds
      const bytesPerSecond = totalFileSize / duration; // 100,000 bytes/sec

      const startTime = 10;
      const endTime = 20;

      const byteStart = Math.floor(startTime * bytesPerSecond);
      const byteEnd = Math.floor(endTime * bytesPerSecond);

      expect(byteStart).toBe(1_000_000);
      expect(byteEnd).toBe(2_000_000);
    });

    it('should not exceed file size', () => {
      const totalFileSize = 10_000_000;
      const duration = 100;
      const bytesPerSecond = totalFileSize / duration;

      const startTime = 95;
      const endTime = 110; // Beyond video duration

      const byteStart = Math.floor(startTime * bytesPerSecond);
      const byteEnd = Math.min(
        Math.floor(endTime * bytesPerSecond),
        totalFileSize - 1
      );

      expect(byteStart).toBe(9_500_000);
      expect(byteEnd).toBe(9_999_999);
    });
  });

  describe('Content-Range parsing', () => {
    it('should parse Content-Range header', () => {
      const contentRange = 'bytes 0-999999/10000000';
      const match = contentRange.match(/\/(\d+)$/);
      
      expect(match).not.toBeNull();
      expect(match![1]).toBe('10000000');
    });

    it('should handle missing Content-Range', () => {
      const contentRange = null;
      const totalSize = contentRange ? parseInt(contentRange.match(/\/(\d+)$/)?.[1] || '0', 10) : 0;
      
      expect(totalSize).toBe(0);
    });
  });
});
