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
   * Preload video segment
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

    // For now, just mark as loaded since we're using the full video URL
    // In a real implementation, this would use Media Source Extensions
    // to load specific byte ranges
    segment.loaded = true;
    segment.url = this.videoInfo.url;

    this.segments.set(index, segment);

    if (onProgress) {
      onProgress(1, 1, this.currentQuality);
    }

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

    if (this.videoElement) {
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
