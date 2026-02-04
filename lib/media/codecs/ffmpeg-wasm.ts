/**
 * FFmpeg WASM Wrapper
 *
 * Provides a wrapper around FFmpeg.wasm for browser-based video encoding/decoding.
 * Supports lazy loading and memory management.
 */

import type { VideoExportOptions, VideoMetadata, ProgressCallback } from '../workers/worker-types';
import { loggers } from '@/lib/logger';

const log = loggers.app;

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
  off: (event: string, callback?: (data: unknown) => void) => void;
  terminate: () => void;
}

/**
 * FFmpeg log message type
 */
interface FFmpegLogMessage {
  type: string;
  message: string;
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
        log.error('Failed to load FFmpeg WASM', error as Error);
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

    // Wrap progress callback for two-pass encoding
    const progressWrapper = onProgress 
      ? (progress: number) => {
          if (options.twoPass) {
            // Scale progress: 0-50% for pass 1, 50-100% for pass 2
            onProgress(progress / 2);
          } else {
            onProgress(progress);
          }
        }
      : undefined;

    if (progressWrapper) {
      this.setProgressCallback(progressWrapper);
    }

    try {
      // Write input file
      await this.writeFile(inputName, inputData);

      if (options.twoPass) {
        // Two-pass encoding for better quality
        await this.executeTwoPassEncode(inputName, outputName, options, onProgress);
      } else {
        // Single pass encoding
        const args = this.buildTranscodeArgs(inputName, outputName, options);
        const exitCode = await this.exec(args);
        if (exitCode !== 0) {
          throw new Error(`FFmpeg exited with code ${exitCode}`);
        }
      }

      // Read output file
      const outputData = await this.readFile(outputName);

      // Clean up
      await this.deleteFile(inputName);
      await this.deleteFile(outputName);
      // Clean up two-pass log files if they exist
      await this.deleteFile('ffmpeg2pass-0.log').catch(() => {});
      await this.deleteFile('ffmpeg2pass-0.log.mbtree').catch(() => {});

      return outputData;
    } finally {
      this.setProgressCallback(null);
    }
  }

  /**
   * Execute two-pass video encoding
   */
  private async executeTwoPassEncode(
    inputName: string,
    outputName: string,
    options: Partial<VideoExportOptions>,
    onProgress?: ProgressCallback
  ): Promise<void> {
    // Build base arguments without output
    const baseArgs = this.buildTranscodeArgs(inputName, outputName, options);
    
    // Remove the output file from args (last two elements: '-y', outputName)
    const argsWithoutOutput = baseArgs.slice(0, -2);

    // Pass 1: Analyze video and create log file
    const pass1Args = [
      ...argsWithoutOutput,
      '-pass', '1',
      '-an', // No audio in pass 1
      '-f', 'null',
      '-'
    ];

    if (onProgress) {
      this.setProgressCallback((p) => onProgress(p / 2)); // 0-50%
    }

    const pass1Exit = await this.exec(pass1Args);
    if (pass1Exit !== 0) {
      throw new Error(`FFmpeg two-pass encoding (pass 1) failed with code ${pass1Exit}`);
    }

    // Pass 2: Actual encoding using the log file
    const pass2Args = [
      ...argsWithoutOutput,
      '-pass', '2',
      '-y',
      outputName
    ];

    if (onProgress) {
      this.setProgressCallback((p) => onProgress(50 + p / 2)); // 50-100%
    }

    const pass2Exit = await this.exec(pass2Args);
    if (pass2Exit !== 0) {
      throw new Error(`FFmpeg two-pass encoding (pass 2) failed with code ${pass2Exit}`);
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

    // Two-pass encoding is handled separately in transcode method
    // This builds args for single pass or individual passes

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
   * Extract video metadata by parsing FFmpeg output
   */
  public async getMetadata(inputData: Uint8Array, inputName: string): Promise<VideoMetadata> {
    if (!this.isLoaded()) {
      await this.load();
    }

    await this.writeFile(inputName, inputData);

    // Collect FFmpeg log output for parsing
    const logMessages: string[] = [];
    const logHandler = (data: unknown) => {
      const logData = data as FFmpegLogMessage;
      if (logData.message) {
        logMessages.push(logData.message);
      }
    };

    this.ffmpeg!.on('log', logHandler);

    try {
      // Run FFmpeg to get metadata (will fail but logs contain info)
      await this.exec(['-i', inputName, '-f', 'null', '-']);
    } catch {
      // Expected - FFmpeg exits with error when no output specified
    }

    this.ffmpeg!.off('log', logHandler);

    // Clean up
    await this.deleteFile(inputName);

    // Parse metadata from logs
    return this.parseMetadataFromLogs(logMessages, inputData.length, inputName);
  }

  /**
   * Parse video metadata from FFmpeg log output
   */
  private parseMetadataFromLogs(logs: string[], fileSize: number, fileName: string): VideoMetadata {
    const fullLog = logs.join('\n');
    
    // Initialize with defaults
    const metadata: VideoMetadata = {
      width: 0,
      height: 0,
      duration: 0,
      frameRate: 0,
      codec: 'unknown',
      bitrate: 0,
      hasAudio: false,
      fileSize,
      mimeType: this.getMimeType(fileName),
    };

    // Parse duration: "Duration: 00:01:30.50"
    const durationMatch = fullLog.match(/Duration:\s*(\d{2}):(\d{2}):(\d{2})\.(\d{2})/);
    if (durationMatch) {
      const [, hours, minutes, seconds, centiseconds] = durationMatch;
      metadata.duration = 
        parseInt(hours) * 3600 + 
        parseInt(minutes) * 60 + 
        parseInt(seconds) + 
        parseInt(centiseconds) / 100;
    }

    // Parse bitrate: "bitrate: 1234 kb/s"
    const bitrateMatch = fullLog.match(/bitrate:\s*(\d+)\s*kb\/s/);
    if (bitrateMatch) {
      metadata.bitrate = parseInt(bitrateMatch[1]) * 1000;
    }

    // Parse video stream: "Stream #0:0: Video: h264, 1920x1080, 30 fps"
    const videoStreamMatch = fullLog.match(
      /Stream\s*#\d+:\d+.*Video:\s*(\w+).*?,\s*(\d+)x(\d+).*?,\s*([\d.]+)\s*(?:fps|tbr)/
    );
    if (videoStreamMatch) {
      metadata.codec = videoStreamMatch[1];
      metadata.width = parseInt(videoStreamMatch[2]);
      metadata.height = parseInt(videoStreamMatch[3]);
      metadata.frameRate = parseFloat(videoStreamMatch[4]);
    } else {
      // Try alternative pattern for resolution
      const resolutionMatch = fullLog.match(/(\d{2,5})x(\d{2,5})/);
      if (resolutionMatch) {
        metadata.width = parseInt(resolutionMatch[1]);
        metadata.height = parseInt(resolutionMatch[2]);
      }
      
      // Try alternative pattern for codec
      const codecMatch = fullLog.match(/Video:\s*(\w+)/);
      if (codecMatch) {
        metadata.codec = codecMatch[1];
      }
      
      // Try alternative pattern for fps
      const fpsMatch = fullLog.match(/([\d.]+)\s*fps/);
      if (fpsMatch) {
        metadata.frameRate = parseFloat(fpsMatch[1]);
      }
    }

    // Parse audio stream: "Stream #0:1: Audio: aac, 48000 Hz, stereo, 320 kb/s"
    const audioStreamMatch = fullLog.match(
      /Stream\s*#\d+:\d+.*Audio:\s*(\w+).*?,\s*(\d+)\s*Hz.*?,\s*(\w+)/
    );
    if (audioStreamMatch) {
      metadata.hasAudio = true;
      metadata.audioCodec = audioStreamMatch[1];
      metadata.audioSampleRate = parseInt(audioStreamMatch[2]);
      
      // Parse audio channels
      const channelStr = audioStreamMatch[3].toLowerCase();
      if (channelStr === 'mono') {
        metadata.audioChannels = 1;
      } else if (channelStr === 'stereo') {
        metadata.audioChannels = 2;
      } else if (channelStr.includes('5.1') || channelStr.includes('surround')) {
        metadata.audioChannels = 6;
      } else {
        metadata.audioChannels = 2; // Default to stereo
      }
      
      // Parse audio bitrate
      const audioBitrateMatch = fullLog.match(/Audio:.*?(\d+)\s*kb\/s/);
      if (audioBitrateMatch) {
        metadata.audioBitrate = parseInt(audioBitrateMatch[1]) * 1000;
      }
    }

    return metadata;
  }

  /**
   * Get MIME type from file extension
   */
  private getMimeType(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    const mimeTypes: Record<string, string> = {
      mp4: 'video/mp4',
      webm: 'video/webm',
      mov: 'video/quicktime',
      avi: 'video/x-msvideo',
      mkv: 'video/x-matroska',
      m4v: 'video/x-m4v',
      flv: 'video/x-flv',
      wmv: 'video/x-ms-wmv',
      '3gp': 'video/3gpp',
      ogv: 'video/ogg',
    };
    return mimeTypes[ext] || 'video/mp4';
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
