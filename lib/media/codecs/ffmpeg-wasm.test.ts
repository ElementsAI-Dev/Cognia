/**
 * Tests for FFmpeg WASM Wrapper
 */

// Mock FFmpeg module before importing
let mockIsLoaded = false;

const mockFFmpegInstance = {
  load: jest.fn().mockImplementation(async () => {
    mockIsLoaded = true;
  }),
  isLoaded: jest.fn().mockImplementation(() => mockIsLoaded),
  exec: jest.fn().mockResolvedValue(0),
  writeFile: jest.fn().mockResolvedValue(undefined),
  readFile: jest.fn().mockResolvedValue(new Uint8Array([0x00, 0x00, 0x00, 0x18])),
  deleteFile: jest.fn().mockResolvedValue(undefined),
  on: jest.fn(),
  off: jest.fn(),
  terminate: jest.fn().mockImplementation(() => {
    mockIsLoaded = false;
  }),
};

jest.mock('@ffmpeg/ffmpeg', () => ({
  FFmpeg: jest.fn().mockImplementation(() => mockFFmpegInstance),
}), { virtual: true });

jest.mock('@ffmpeg/util', () => ({
  toBlobURL: jest.fn().mockResolvedValue('blob:test'),
}), { virtual: true });

import { FFmpegWasm, isFFmpegWasmAvailable } from './ffmpeg-wasm';

describe('FFmpegWasm', () => {
  let ffmpeg: FFmpegWasm;

  beforeEach(() => {
    mockIsLoaded = false;
    jest.clearAllMocks();
    ffmpeg = new FFmpegWasm();
  });

  afterEach(() => {
    ffmpeg.terminate();
  });

  describe('isFFmpegWasmAvailable', () => {
    it('should return true when WebAssembly is available', () => {
      expect(isFFmpegWasmAvailable()).toBe(true);
    });
  });

  describe('load state', () => {
    it('should start in idle state', () => {
      expect(ffmpeg.getLoadState()).toBe('idle');
    });

    it('should report not loaded initially', () => {
      expect(ffmpeg.isLoaded()).toBe(false);
    });
  });

  describe('load', () => {
    it('should load FFmpeg successfully', async () => {
      await ffmpeg.load();
      expect(ffmpeg.getLoadState()).toBe('loaded');
    });

    it('should not reload if already loaded', async () => {
      await ffmpeg.load();
      const firstState = ffmpeg.getLoadState();
      await ffmpeg.load();
      expect(ffmpeg.getLoadState()).toBe(firstState);
    });
  });

  describe('file operations', () => {
    beforeEach(async () => {
      await ffmpeg.load();
    });

    it('should write file to virtual filesystem', async () => {
      const data = new Uint8Array([1, 2, 3, 4]);
      await expect(ffmpeg.writeFile('test.mp4', data)).resolves.not.toThrow();
    });

    it('should read file from virtual filesystem', async () => {
      const result = await ffmpeg.readFile('test.mp4');
      expect(result).toBeInstanceOf(Uint8Array);
    });

    it('should delete file from virtual filesystem', async () => {
      await expect(ffmpeg.deleteFile('test.mp4')).resolves.not.toThrow();
    });
  });

  describe('exec', () => {
    beforeEach(async () => {
      await ffmpeg.load();
    });

    it('should execute FFmpeg command', async () => {
      const exitCode = await ffmpeg.exec(['-version']);
      expect(exitCode).toBe(0);
    });
  });

  describe('progress callback', () => {
    it('should set and clear progress callback', () => {
      const callback = jest.fn();
      ffmpeg.setProgressCallback(callback);
      ffmpeg.setProgressCallback(null);
      // Should not throw
    });
  });

  describe('terminate', () => {
    it('should terminate and reset state', async () => {
      await ffmpeg.load();
      ffmpeg.terminate();
      expect(ffmpeg.getLoadState()).toBe('idle');
      expect(ffmpeg.isLoaded()).toBe(false);
    });
  });

  describe('getMetadata', () => {
    beforeEach(async () => {
      await ffmpeg.load();
    });

    it('should return metadata object', async () => {
      const inputData = new Uint8Array([0x00, 0x00, 0x00, 0x18]);
      const metadata = await ffmpeg.getMetadata(inputData, 'test.mp4');
      
      expect(metadata).toHaveProperty('width');
      expect(metadata).toHaveProperty('height');
      expect(metadata).toHaveProperty('duration');
      expect(metadata).toHaveProperty('frameRate');
      expect(metadata).toHaveProperty('codec');
      expect(metadata).toHaveProperty('bitrate');
      expect(metadata).toHaveProperty('hasAudio');
      expect(metadata).toHaveProperty('fileSize');
      expect(metadata).toHaveProperty('mimeType');
    });

    it('should detect correct MIME type from filename', async () => {
      const inputData = new Uint8Array([0x00, 0x00, 0x00, 0x18]);
      
      const mp4Metadata = await ffmpeg.getMetadata(inputData, 'video.mp4');
      expect(mp4Metadata.mimeType).toBe('video/mp4');
      
      const webmMetadata = await ffmpeg.getMetadata(inputData, 'video.webm');
      expect(webmMetadata.mimeType).toBe('video/webm');
      
      const movMetadata = await ffmpeg.getMetadata(inputData, 'video.mov');
      expect(movMetadata.mimeType).toBe('video/quicktime');
    });
  });

  describe('transcode', () => {
    beforeEach(async () => {
      await ffmpeg.load();
    });

    it('should transcode video with options', async () => {
      const inputData = new Uint8Array([0x00, 0x00, 0x00, 0x18]);
      const progressCallback = jest.fn();
      
      const result = await ffmpeg.transcode(
        inputData,
        'input.mp4',
        'output.mp4',
        { codec: 'h264', frameRate: 30 },
        progressCallback
      );
      
      expect(result).toBeInstanceOf(Uint8Array);
    });
  });

  describe('extractFrame', () => {
    beforeEach(async () => {
      await ffmpeg.load();
    });

    it('should extract frame at timestamp', async () => {
      const inputData = new Uint8Array([0x00, 0x00, 0x00, 0x18]);
      
      const result = await ffmpeg.extractFrame(inputData, 'input.mp4', 1.5, 80);
      expect(result).toBeInstanceOf(Uint8Array);
    });
  });

  describe('generateThumbnails', () => {
    beforeEach(async () => {
      await ffmpeg.load();
    });

    it('should generate thumbnail array', async () => {
      const inputData = new Uint8Array([0x00, 0x00, 0x00, 0x18]);
      
      const result = await ffmpeg.generateThumbnails(inputData, 'input.mp4', 5, 160, 90);
      expect(Array.isArray(result)).toBe(true);
    });
  });
});
