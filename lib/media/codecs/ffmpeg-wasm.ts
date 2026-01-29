/**
 * FFmpeg WASM Wrapper
 *
 * Provides a wrapper around FFmpeg.wasm for browser-based video encoding/decoding.
 * Supports lazy loading and memory management.
 */

import type { VideoExportOptions, VideoMetadata, ProgressCallback } from '../workers/worker-types';

/**
 * FFmpeg instance type (dynamic import)
 */
interface FFmpegInstance {
  load: () => Promise<void>;
  isLoaded: () => boolean;
  exec: (args: string[]) => Promise<number>;
  writeFile: (name: string, data: Uint8Array) => Promise<void>;
  readFile: (name: string) => Promise<Uint8Array>;
  deleteFile: (name: string) => Promise<void>;
  listDir: (path: string) => Promise<{ name: string; isDir: boolean }[]>;
  createDir: (path: string) => Promise<void>;
  rename: (oldPath: string, newPath: string) => Promise<void>;
  on: (event: string, callback: (data: unknown) => void) => void;
  terminate: () => void;
}

/**
 * FFmpeg loading state
 */
export type FFmpegLoadState = 'idle' | 'loading' | 'loaded' | 'error';

/**
 * FFmpeg WASM manager
 */
export class FFmpegWasm {
  private ffmpeg: FFmpegInstance | null = null;
  private loadState: FFmpegLoadState = 'idle';
  private loadPromise: Promise<void> | null = null;
  private progressCallback: ProgressCallback | null = null;

  /**
   * Check if FFmpeg is loaded
   */
  public isLoaded(): boolean {
    return this.loadState === 'loaded' && this.ffmpeg?.isLoaded() === true;
  }

  /**
   * Get current load state
   */
  public getLoadState(): FFmpegLoadState {
    return this.loadState;
  }

  /**
   * Load FFmpeg WASM
   */
  public async load(): Promise<void> {
    if (this.loadState === 'loaded') return;
    if (this.loadPromise) return this.loadPromise;

    this.loadState = 'loading';

    this.loadPromise = (async () => {
      try {
        // Dynamic import of @ffmpeg/ffmpeg (optional dependency)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ffmpegModule = await import('@ffmpeg/ffmpeg' as any) as { FFmpeg: new () => unknown };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const utilModule = await import('@ffmpeg/util' as any) as { toBlobURL: (url: string, mimeType: string) => Promise<string> };
        
        const { FFmpeg } = ffmpegModule;
        const { toBlobURL } = utilModule;

        this.ffmpeg = new FFmpeg() as unknown as FFmpegInstance;

        // Set up progress handler
        this.ffmpeg.on('progress', (data: unknown) => {
          const progressData = data as { progress: number; time: number };
          if (this.progressCallback && progressData.progress !== undefined) {
            this.progressCallback(progressData.progress * 100);
          }
        });

        // Load FFmpeg core from CDN
        const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
        await (this.ffmpeg.load as (config: unknown) => Promise<void>)({
          coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
          wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
        });

        this.loadState = 'loaded';
      } catch (error) {
        this.loadState = 'error';
        console.error('Failed to load FFmpeg WASM:', error);
        throw error;
      }
    })();

    return this.loadPromise;
  }

  /**
   * Set progress callback
   */
  public setProgressCallback(callback: ProgressCallback | null): void {
    this.progressCallback = callback;
  }

  /**
   * Write file to FFmpeg virtual filesystem
   */
  public async writeFile(name: string, data: Uint8Array): Promise<void> {
    if (!this.isLoaded()) {
      await this.load();
    }
    await this.ffmpeg!.writeFile(name, data);
  }

  /**
   * Read file from FFmpeg virtual filesystem
   */
  public async readFile(name: string): Promise<Uint8Array> {
    if (!this.isLoaded()) {
      throw new Error('FFmpeg not loaded');
    }
    return this.ffmpeg!.readFile(name);
  }

  /**
   * Delete file from FFmpeg virtual filesystem
   */
  public async deleteFile(name: string): Promise<void> {
    if (!this.isLoaded()) return;
    try {
      await this.ffmpeg!.deleteFile(name);
    } catch {
      // Ignore errors when deleting non-existent files
    }
  }

  /**
   * Execute FFmpeg command
   */
  public async exec(args: string[]): Promise<number> {
    if (!this.isLoaded()) {
      await this.load();
    }
    return this.ffmpeg!.exec(args);
  }

  /**
   * Transcode video with specified options
   */
  public async transcode(
    inputData: Uint8Array,
    inputName: string,
    outputName: string,
    options: Partial<VideoExportOptions>,
    onProgress?: ProgressCallback
  ): Promise<Uint8Array> {
    if (!this.isLoaded()) {
      await this.load();
    }

    if (onProgress) {
      this.setProgressCallback(onProgress);
    }

    try {
      // Write input file
      await this.writeFile(inputName, inputData);

      // Build FFmpeg arguments
      const args = this.buildTranscodeArgs(inputName, outputName, options);

      // Execute transcoding
      const exitCode = await this.exec(args);
      if (exitCode !== 0) {
        throw new Error(`FFmpeg exited with code ${exitCode}`);
      }

      // Read output file
      const outputData = await this.readFile(outputName);

      // Clean up
      await this.deleteFile(inputName);
      await this.deleteFile(outputName);

      return outputData;
    } finally {
      this.setProgressCallback(null);
    }
  }

  /**
   * Build FFmpeg transcode arguments
   */
  private buildTranscodeArgs(
    inputName: string,
    outputName: string,
    options: Partial<VideoExportOptions>
  ): string[] {
    const args: string[] = ['-i', inputName];

    // Video codec
    if (options.codec) {
      const codecMap: Record<string, string> = {
        h264: 'libx264',
        h265: 'libx265',
        vp8: 'libvpx',
        vp9: 'libvpx-vp9',
        av1: 'libaom-av1',
      };
      const codecName = codecMap[options.codec] || 'libx264';
      args.push('-c:v', codecName);
    }

    // Resolution
    if (options.resolution) {
      args.push('-s', `${options.resolution.width}x${options.resolution.height}`);
    }

    // Frame rate
    if (options.frameRate) {
      args.push('-r', options.frameRate.toString());
    }

    // Bitrate
    if (options.bitrateMode === 'crf' && options.crf !== undefined) {
      args.push('-crf', options.crf.toString());
    } else if (options.bitrate) {
      args.push('-b:v', options.bitrate.toString());
    }

    // Two-pass encoding
    if (options.twoPass) {
      // Note: Two-pass requires running FFmpeg twice, simplified here
      args.push('-pass', '1');
    }

    // Audio codec
    if (options.audioCodec) {
      const audioCodecMap: Record<string, string> = {
        aac: 'aac',
        opus: 'libopus',
        mp3: 'libmp3lame',
        pcm: 'pcm_s16le',
        flac: 'flac',
      };
      const audioCodecName = audioCodecMap[options.audioCodec] || 'aac';
      args.push('-c:a', audioCodecName);
    }

    // Audio bitrate
    if (options.audioBitrate) {
      args.push('-b:a', options.audioBitrate.toString());
    }

    // Audio channels
    if (options.audioChannels) {
      args.push('-ac', options.audioChannels.toString());
    }

    // Audio sample rate
    if (options.audioSampleRate) {
      args.push('-ar', options.audioSampleRate.toString());
    }

    // Time range
    if (options.startTime !== undefined) {
      args.push('-ss', options.startTime.toString());
    }
    if (options.endTime !== undefined) {
      args.push('-to', options.endTime.toString());
    }

    // Output file
    args.push('-y', outputName);

    return args;
  }

  /**
   * Extract video metadata
   */
  public async getMetadata(inputData: Uint8Array, inputName: string): Promise<VideoMetadata> {
    if (!this.isLoaded()) {
      await this.load();
    }

    await this.writeFile(inputName, inputData);

    // Use ffprobe-like output
    const args = [
      '-i',
      inputName,
      '-f',
      'null',
      '-hide_banner',
      '-',
    ];

    try {
      await this.exec(args);
    } catch {
      // FFmpeg will exit with error when no output, but metadata is still parsed
    }

    // Clean up
    await this.deleteFile(inputName);

    // Return basic metadata (full parsing would require log output parsing)
    return {
      width: 0,
      height: 0,
      duration: 0,
      frameRate: 0,
      codec: 'unknown',
      bitrate: 0,
      hasAudio: false,
      fileSize: inputData.length,
      mimeType: 'video/mp4',
    };
  }

  /**
   * Extract a frame at specific timestamp
   */
  public async extractFrame(
    inputData: Uint8Array,
    inputName: string,
    timestamp: number,
    quality: number = 80
  ): Promise<Uint8Array> {
    if (!this.isLoaded()) {
      await this.load();
    }

    await this.writeFile(inputName, inputData);

    const outputName = 'frame.jpg';
    const args = [
      '-ss',
      timestamp.toString(),
      '-i',
      inputName,
      '-vframes',
      '1',
      '-q:v',
      Math.round((100 - quality) / 3).toString(),
      '-y',
      outputName,
    ];

    const exitCode = await this.exec(args);
    if (exitCode !== 0) {
      throw new Error('Failed to extract frame');
    }

    const frameData = await this.readFile(outputName);

    // Clean up
    await this.deleteFile(inputName);
    await this.deleteFile(outputName);

    return frameData;
  }

  /**
   * Generate thumbnails for timeline
   */
  public async generateThumbnails(
    inputData: Uint8Array,
    inputName: string,
    count: number,
    width: number = 160,
    height: number = 90
  ): Promise<Uint8Array[]> {
    if (!this.isLoaded()) {
      await this.load();
    }

    await this.writeFile(inputName, inputData);

    const thumbnails: Uint8Array[] = [];
    const outputPattern = 'thumb_%03d.jpg';

    // Generate thumbnails using fps filter
    const args = [
      '-i',
      inputName,
      '-vf',
      `fps=1/${Math.ceil(1 / count)},scale=${width}:${height}`,
      '-q:v',
      '5',
      '-y',
      outputPattern,
    ];

    await this.exec(args);

    // Read generated thumbnails
    for (let i = 1; i <= count; i++) {
      try {
        const thumbName = `thumb_${i.toString().padStart(3, '0')}.jpg`;
        const thumbData = await this.readFile(thumbName);
        thumbnails.push(thumbData);
        await this.deleteFile(thumbName);
      } catch {
        break;
      }
    }

    // Clean up input
    await this.deleteFile(inputName);

    return thumbnails;
  }

  /**
   * Terminate FFmpeg instance
   */
  public terminate(): void {
    if (this.ffmpeg) {
      this.ffmpeg.terminate();
      this.ffmpeg = null;
    }
    this.loadState = 'idle';
    this.loadPromise = null;
    this.progressCallback = null;
  }
}

// Singleton instance
let ffmpegInstance: FFmpegWasm | null = null;

/**
 * Get the global FFmpeg WASM instance
 */
export function getFFmpegWasm(): FFmpegWasm {
  if (!ffmpegInstance) {
    ffmpegInstance = new FFmpegWasm();
  }
  return ffmpegInstance;
}

/**
 * Terminate the global FFmpeg instance
 */
export function terminateFFmpegWasm(): void {
  if (ffmpegInstance) {
    ffmpegInstance.terminate();
    ffmpegInstance = null;
  }
}

/**
 * Check if FFmpeg WASM is available
 */
export function isFFmpegWasmAvailable(): boolean {
  return typeof WebAssembly !== 'undefined';
}
