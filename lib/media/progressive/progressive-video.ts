/**
 * Progressive Video Loading
 *
 * Implements progressive loading for video files:
 * - Low-res preview first, then high-res
 * - Thumbnail generation for timeline
 * - Lazy loading for large videos
 * - Streaming support
 */

/**
 * Video quality level
 */
export type VideoQuality = 'thumbnail' | 'preview' | 'standard' | 'high' | 'original';

/**
 * Progressive loading state
 */
export type LoadingState = 'idle' | 'loading' | 'partial' | 'complete' | 'error';

/**
 * Video segment information
 */
export interface VideoSegment {
  index: number;
  startTime: number;
  endTime: number;
  loaded: boolean;
  url?: string;
  blob?: Blob;
}

/**
 * Progressive video info
 */
export interface ProgressiveVideoInfo {
  url: string;
  duration: number;
  width: number;
  height: number;
  frameRate: number;
  fileSize: number;
  mimeType: string;
}

/**
 * Thumbnail strip info
 */
export interface ThumbnailStrip {
  imageUrl: string;
  count: number;
  width: number;
  height: number;
  interval: number;
}

/**
 * Progressive load options
 */
export interface ProgressiveLoadOptions {
  initialQuality?: VideoQuality;
  maxQuality?: VideoQuality;
  preloadSegments?: number;
  thumbnailCount?: number;
  thumbnailWidth?: number;
  thumbnailHeight?: number;
}

/**
 * Progress callback
 */
export type LoadProgressCallback = (loaded: number, total: number, quality: VideoQuality) => void;

/**
 * Quality dimensions
 */
const QUALITY_DIMENSIONS: Record<VideoQuality, { width: number; height: number }> = {
  thumbnail: { width: 160, height: 90 },
  preview: { width: 640, height: 360 },
  standard: { width: 1280, height: 720 },
  high: { width: 1920, height: 1080 },
  original: { width: 0, height: 0 }, // Use original dimensions
};

/**
 * Check if MediaSource Extensions are available
 */
export function isMSESupported(): boolean {
  return typeof MediaSource !== 'undefined' && MediaSource.isTypeSupported('video/mp4; codecs="avc1.42E01E"');
}

/**
 * Progressive Video Loader
 */
export class ProgressiveVideoLoader {
  private videoInfo: ProgressiveVideoInfo | null = null;
  private loadingState: LoadingState = 'idle';
  private currentQuality: VideoQuality = 'preview';
  private segments: Map<number, VideoSegment> = new Map();
  private thumbnails: Map<number, string> = new Map();
  private thumbnailStrip: ThumbnailStrip | null = null;
  private abortController: AbortController | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  
  // MSE support
  private mediaSource: MediaSource | null = null;
  private sourceBuffer: SourceBuffer | null = null;
  private pendingSegments: ArrayBuffer[] = [];
  private totalFileSize: number = 0;
  private segmentSize: number = 1024 * 1024; // 1MB segments

  /**
   * Initialize with video URL
   */
  public async initialize(
    url: string,
    options: ProgressiveLoadOptions = {}
  ): Promise<ProgressiveVideoInfo> {
    this.loadingState = 'loading';
    this.abortController = new AbortController();

    try {
      // Create video element for metadata extraction
      this.videoElement = document.createElement('video');
      this.videoElement.crossOrigin = 'anonymous';
      this.videoElement.preload = 'metadata';

      // Load metadata
      const info = await this.loadMetadata(url);
      this.videoInfo = info;

      // Set initial quality
      this.currentQuality = options.initialQuality || 'preview';

      // Generate thumbnail strip if requested
      if (options.thumbnailCount && options.thumbnailCount > 0) {
        await this.generateThumbnailStrip(
          options.thumbnailCount,
          options.thumbnailWidth || QUALITY_DIMENSIONS.thumbnail.width,
          options.thumbnailHeight || QUALITY_DIMENSIONS.thumbnail.height
        );
      }

      this.loadingState = 'partial';
      return info;
    } catch (error) {
      this.loadingState = 'error';
      throw error;
    }
  }

  /**
   * Load video metadata
   */
  private loadMetadata(url: string): Promise<ProgressiveVideoInfo> {
    return new Promise((resolve, reject) => {
      if (!this.videoElement) {
        reject(new Error('Video element not initialized'));
        return;
      }

      const video = this.videoElement;

      const onLoadedMetadata = () => {
        cleanup();
        resolve({
          url,
          duration: video.duration,
          width: video.videoWidth,
          height: video.videoHeight,
          frameRate: 30, // Default, actual detection requires frame analysis
          fileSize: 0, // Will be updated when full file is loaded
          mimeType: 'video/mp4',
        });
      };

      const onError = () => {
        cleanup();
        reject(new Error('Failed to load video metadata'));
      };

      const cleanup = () => {
        video.removeEventListener('loadedmetadata', onLoadedMetadata);
        video.removeEventListener('error', onError);
      };

      video.addEventListener('loadedmetadata', onLoadedMetadata);
      video.addEventListener('error', onError);
      video.src = url;
    });
  }

  /**
   * Generate thumbnail strip for timeline
   */
  public async generateThumbnailStrip(
    count: number,
    width: number = 160,
    height: number = 90
  ): Promise<ThumbnailStrip | null> {
    if (!this.videoElement || !this.videoInfo) return null;

    // Create canvas for thumbnail extraction
    if (!this.canvas) {
      this.canvas = document.createElement('canvas');
    }

    const canvas = this.canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Set canvas size for strip
    canvas.width = width * count;
    canvas.height = height;

    const video = this.videoElement;
    const interval = this.videoInfo.duration / count;

    // Extract frames
    for (let i = 0; i < count; i++) {
      if (this.abortController?.signal.aborted) break;

      const time = i * interval;
      await this.seekToTime(video, time);

      // Draw frame to canvas
      ctx.drawImage(video, i * width, 0, width, height);

      // Store individual thumbnail
      const thumbCanvas = document.createElement('canvas');
      thumbCanvas.width = width;
      thumbCanvas.height = height;
      const thumbCtx = thumbCanvas.getContext('2d');
      if (thumbCtx) {
        thumbCtx.drawImage(video, 0, 0, width, height);
        this.thumbnails.set(i, thumbCanvas.toDataURL('image/jpeg', 0.7));
      }
    }

    // Create thumbnail strip
    this.thumbnailStrip = {
      imageUrl: canvas.toDataURL('image/jpeg', 0.8),
      count,
      width,
      height,
      interval,
    };

    return this.thumbnailStrip;
  }

  /**
   * Seek video to specific time
   */
  private seekToTime(video: HTMLVideoElement, time: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const onSeeked = () => {
        video.removeEventListener('seeked', onSeeked);
        video.removeEventListener('error', onError);
        resolve();
      };

      const onError = () => {
        video.removeEventListener('seeked', onSeeked);
        video.removeEventListener('error', onError);
        reject(new Error('Seek failed'));
      };

      video.addEventListener('seeked', onSeeked);
      video.addEventListener('error', onError);
      video.currentTime = time;
    });
  }

  /**
   * Get thumbnail at specific time
   */
  public getThumbnailAtTime(time: number): string | null {
    if (!this.thumbnailStrip || !this.videoInfo) return null;

    const index = Math.floor(time / this.thumbnailStrip.interval);
    return this.thumbnails.get(index) || null;
  }

  /**
   * Get thumbnail strip URL
   */
  public getThumbnailStrip(): ThumbnailStrip | null {
    return this.thumbnailStrip;
  }

  /**
   * Extract single frame at time
   */
  public async extractFrame(time: number, quality: VideoQuality = 'standard'): Promise<string> {
    if (!this.videoElement) {
      throw new Error('Video not initialized');
    }

    const dimensions = QUALITY_DIMENSIONS[quality];
    const video = this.videoElement;

    await this.seekToTime(video, time);

    const canvas = document.createElement('canvas');
    const width = dimensions.width || video.videoWidth;
    const height = dimensions.height || video.videoHeight;

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');

    ctx.drawImage(video, 0, 0, width, height);
    return canvas.toDataURL('image/jpeg', 0.9);
  }

  /**
   * Fetch byte range from URL
   */
  private async fetchByteRange(
    url: string,
    start: number,
    end: number,
    signal?: AbortSignal
  ): Promise<ArrayBuffer> {
    const response = await fetch(url, {
      headers: {
        Range: `bytes=${start}-${end}`,
      },
      signal,
    });

    if (!response.ok && response.status !== 206) {
      throw new Error(`Failed to fetch byte range: ${response.status}`);
    }

    // Update total file size from Content-Range header
    const contentRange = response.headers.get('Content-Range');
    if (contentRange) {
      const match = contentRange.match(/\/(\d+)$/);
      if (match) {
        this.totalFileSize = parseInt(match[1], 10);
      }
    }

    return response.arrayBuffer();
  }

  /**
   * Initialize MediaSource for streaming
   */
  private initializeMediaSource(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!isMSESupported()) {
        reject(new Error('MediaSource Extensions not supported'));
        return;
      }

      this.mediaSource = new MediaSource();
      
      const sourceOpenHandler = () => {
        try {
          // Determine MIME type based on video info
          const mimeType = this.videoInfo?.mimeType === 'video/webm'
            ? 'video/webm; codecs="vp8, vorbis"'
            : 'video/mp4; codecs="avc1.42E01E, mp4a.40.2"';

          if (!MediaSource.isTypeSupported(mimeType)) {
            reject(new Error(`MIME type not supported: ${mimeType}`));
            return;
          }

          this.sourceBuffer = this.mediaSource!.addSourceBuffer(mimeType);
          
          this.sourceBuffer.addEventListener('updateend', () => {
            this.processPendingSegments();
          });

          resolve();
        } catch (error) {
          reject(error);
        }
      };

      this.mediaSource.addEventListener('sourceopen', sourceOpenHandler, { once: true });

      if (this.videoElement) {
        this.videoElement.src = URL.createObjectURL(this.mediaSource);
      }
    });
  }

  /**
   * Process pending segments queue
   */
  private processPendingSegments(): void {
    if (!this.sourceBuffer || this.sourceBuffer.updating || this.pendingSegments.length === 0) {
      return;
    }

    const segment = this.pendingSegments.shift();
    if (segment) {
      try {
        this.sourceBuffer.appendBuffer(segment);
      } catch (error) {
        console.error('Failed to append buffer:', error);
      }
    }
  }

  /**
   * Append segment data to MediaSource
   */
  private appendSegmentData(data: ArrayBuffer): void {
    if (!this.sourceBuffer) {
      this.pendingSegments.push(data);
      return;
    }

    if (this.sourceBuffer.updating) {
      this.pendingSegments.push(data);
    } else {
      try {
        this.sourceBuffer.appendBuffer(data);
      } catch {
        this.pendingSegments.push(data);
      }
    }
  }

  /**
   * Preload video segment using byte-range requests
   */
  public async preloadSegment(
    startTime: number,
    endTime: number,
    onProgress?: LoadProgressCallback
  ): Promise<VideoSegment> {
    if (!this.videoInfo) {
      throw new Error('Video not initialized');
    }

    const index = Math.floor(startTime);
    const existingSegment = this.segments.get(index);

    if (existingSegment?.loaded) {
      return existingSegment;
    }

    const segment: VideoSegment = {
      index,
      startTime,
      endTime,
      loaded: false,
    };

    // Check if MSE is supported for true byte-range loading
    if (isMSESupported() && this.totalFileSize > 0) {
      try {
        // Initialize MediaSource if not already done
        if (!this.mediaSource) {
          await this.initializeMediaSource();
        }

        // Calculate byte range based on time position
        const duration = this.videoInfo.duration || 1;
        const bytesPerSecond = this.totalFileSize / duration;
        const byteStart = Math.floor(startTime * bytesPerSecond);
        const byteEnd = Math.min(
          Math.floor(endTime * bytesPerSecond),
          this.totalFileSize - 1
        );

        // Fetch byte range
        const data = await this.fetchByteRange(
          this.videoInfo.url,
          byteStart,
          byteEnd,
          this.abortController?.signal
        );

        // Append to MediaSource
        this.appendSegmentData(data);

        // Create blob for segment
        segment.blob = new Blob([data], { type: this.videoInfo.mimeType });
        segment.loaded = true;

        if (onProgress) {
          onProgress(1, 1, this.currentQuality);
        }
      } catch (error) {
        // Fall back to full URL loading on error
        console.warn('MSE byte-range loading failed, falling back to full URL:', error);
        segment.loaded = true;
        segment.url = this.videoInfo.url;
      }
    } else {
      // Fallback: Use full video URL (no byte-range support or file size unknown)
      // First try to get file size via HEAD request
      if (this.totalFileSize === 0) {
        try {
          const headResponse = await fetch(this.videoInfo.url, {
            method: 'HEAD',
            signal: this.abortController?.signal,
          });
          const contentLength = headResponse.headers.get('Content-Length');
          if (contentLength) {
            this.totalFileSize = parseInt(contentLength, 10);
            // Retry with MSE if we now have file size
            return this.preloadSegment(startTime, endTime, onProgress);
          }
        } catch {
          // HEAD request failed, continue with fallback
        }
      }

      segment.loaded = true;
      segment.url = this.videoInfo.url;

      if (onProgress) {
        onProgress(1, 1, this.currentQuality);
      }
    }

    this.segments.set(index, segment);
    return segment;
  }

  /**
   * Change quality level
   */
  public async setQuality(
    quality: VideoQuality,
    onProgress?: LoadProgressCallback
  ): Promise<void> {
    if (!this.videoInfo) return;

    if (quality === this.currentQuality) return;

    this.currentQuality = quality;

    // Clear segments for reload at new quality
    this.segments.clear();

    // Notify progress
    if (onProgress) {
      onProgress(0, 1, quality);
    }
  }

  /**
   * Get current loading state
   */
  public getState(): {
    state: LoadingState;
    quality: VideoQuality;
    loadedSegments: number;
    totalSegments: number;
  } {
    const loadedCount = Array.from(this.segments.values()).filter((s) => s.loaded).length;
    const totalSegments = this.videoInfo ? Math.ceil(this.videoInfo.duration) : 0;

    return {
      state: this.loadingState,
      quality: this.currentQuality,
      loadedSegments: loadedCount,
      totalSegments,
    };
  }

  /**
   * Get video info
   */
  public getVideoInfo(): ProgressiveVideoInfo | null {
    return this.videoInfo;
  }

  /**
   * Cancel loading
   */
  public cancel(): void {
    this.abortController?.abort();
    this.loadingState = 'idle';
  }

  /**
   * Dispose resources
   */
  public dispose(): void {
    this.cancel();

    // Clean up MediaSource resources
    if (this.sourceBuffer && this.mediaSource) {
      try {
        if (this.mediaSource.readyState === 'open') {
          this.sourceBuffer.abort();
          this.mediaSource.removeSourceBuffer(this.sourceBuffer);
        }
      } catch {
        // Ignore errors during cleanup
      }
    }
    this.sourceBuffer = null;
    this.mediaSource = null;
    this.pendingSegments = [];

    if (this.videoElement) {
      // Revoke object URL if it was created for MediaSource
      if (this.videoElement.src.startsWith('blob:')) {
        URL.revokeObjectURL(this.videoElement.src);
      }
      this.videoElement.src = '';
      this.videoElement = null;
    }

    if (this.canvas) {
      this.canvas = null;
    }

    this.segments.clear();
    this.thumbnails.clear();
    this.thumbnailStrip = null;
    this.videoInfo = null;
    this.totalFileSize = 0;
  }
}

/**
 * Create a progressive video loader
 */
export function createProgressiveLoader(): ProgressiveVideoLoader {
  return new ProgressiveVideoLoader();
}

/**
 * Quick function to generate thumbnails for a video
 */
export async function generateVideoThumbnails(
  videoUrl: string,
  count: number = 10,
  width: number = 160,
  height: number = 90
): Promise<string[]> {
  const loader = new ProgressiveVideoLoader();

  try {
    await loader.initialize(videoUrl);
    await loader.generateThumbnailStrip(count, width, height);

    const thumbnails: string[] = [];
    for (let i = 0; i < count; i++) {
      const thumb = loader.getThumbnailAtTime(
        (i / count) * (loader.getVideoInfo()?.duration || 0)
      );
      if (thumb) thumbnails.push(thumb);
    }

    return thumbnails;
  } finally {
    loader.dispose();
  }
}
