/**
 * TTS Streaming - Streaming audio playback support
 * Enables real-time audio playback as chunks arrive
 */

import type { TTSPlaybackState } from '@/types/media/tts';

export interface StreamingPlaybackOptions {
  onStateChange?: (state: TTSPlaybackState) => void;
  onProgress?: (progress: number) => void;
  onError?: (error: Error) => void;
  volume?: number;
}

/**
 * Streaming Audio Player
 * Plays audio chunks as they arrive using Web Audio API
 */
export class StreamingAudioPlayer {
  private audioContext: AudioContext | null = null;
  private sourceNodes: AudioBufferSourceNode[] = [];
  private gainNode: GainNode | null = null;
  private state: TTSPlaybackState = 'idle';
  private chunks: Uint8Array[] = [];
  private totalDuration = 0;
  private playedDuration = 0;
  private isPlaying = false;
  private options: StreamingPlaybackOptions;

  constructor(options: StreamingPlaybackOptions = {}) {
    this.options = options;
  }

  /**
   * Initialize audio context
   */
  private async init(): Promise<void> {
    if (this.audioContext) return;

    this.audioContext = new AudioContext();
    this.gainNode = this.audioContext.createGain();
    this.gainNode.connect(this.audioContext.destination);
    this.gainNode.gain.value = this.options.volume ?? 1.0;
  }

  /**
   * Set volume
   */
  setVolume(volume: number): void {
    if (this.gainNode) {
      this.gainNode.gain.value = Math.max(0, Math.min(1, volume));
    }
  }

  /**
   * Add audio chunk for playback
   */
  async addChunk(chunk: Uint8Array): Promise<void> {
    await this.init();
    if (!this.audioContext || !this.gainNode) return;

    this.chunks.push(chunk);

    try {
      // Decode audio data - ensure we have a proper ArrayBuffer
      const buffer = chunk.buffer instanceof ArrayBuffer 
        ? chunk.buffer.slice(0) 
        : new ArrayBuffer(chunk.byteLength);
      if (!(chunk.buffer instanceof ArrayBuffer)) {
        new Uint8Array(buffer).set(chunk);
      }
      const audioBuffer = await this.audioContext.decodeAudioData(buffer);
      
      // Create source node
      const sourceNode = this.audioContext.createBufferSource();
      sourceNode.buffer = audioBuffer;
      sourceNode.connect(this.gainNode);
      
      // Track duration
      this.totalDuration += audioBuffer.duration;
      
      // Schedule playback
      const startTime = this.playedDuration;
      sourceNode.start(this.audioContext.currentTime + startTime);
      
      sourceNode.onended = () => {
        const index = this.sourceNodes.indexOf(sourceNode);
        if (index > -1) {
          this.sourceNodes.splice(index, 1);
        }
        
        // Update progress
        this.playedDuration += audioBuffer.duration;
        if (this.totalDuration > 0) {
          this.options.onProgress?.(this.playedDuration / this.totalDuration);
        }
        
        // Check if all chunks finished
        if (this.sourceNodes.length === 0 && this.isPlaying) {
          this.setState('stopped');
          this.isPlaying = false;
        }
      };
      
      this.sourceNodes.push(sourceNode);
      
      if (!this.isPlaying) {
        this.isPlaying = true;
        this.setState('playing');
      }
    } catch (error) {
      console.error('Failed to decode audio chunk:', error);
    }
  }

  /**
   * Set state and notify
   */
  private setState(state: TTSPlaybackState): void {
    this.state = state;
    this.options.onStateChange?.(state);
  }

  /**
   * Get current state
   */
  getState(): TTSPlaybackState {
    return this.state;
  }

  /**
   * Pause playback
   */
  pause(): void {
    if (this.audioContext && this.state === 'playing') {
      this.audioContext.suspend();
      this.setState('paused');
    }
  }

  /**
   * Resume playback
   */
  resume(): void {
    if (this.audioContext && this.state === 'paused') {
      this.audioContext.resume();
      this.setState('playing');
    }
  }

  /**
   * Stop playback
   */
  stop(): void {
    // Stop all source nodes
    for (const node of this.sourceNodes) {
      try {
        node.stop();
      } catch {
        // Node may already be stopped
      }
    }
    this.sourceNodes = [];
    this.chunks = [];
    this.totalDuration = 0;
    this.playedDuration = 0;
    this.isPlaying = false;
    this.setState('stopped');
  }

  /**
   * Destroy player
   */
  destroy(): void {
    this.stop();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.gainNode = null;
  }
}

/**
 * Stream TTS from provider with real-time playback
 */
export async function streamTTSWithPlayback(
  streamFn: (onChunk: (chunk: Uint8Array) => void) => Promise<void>,
  options: StreamingPlaybackOptions = {}
): Promise<StreamingAudioPlayer> {
  const player = new StreamingAudioPlayer(options);

  try {
    options.onStateChange?.('loading');
    
    await streamFn(async (chunk) => {
      await player.addChunk(chunk);
    });
  } catch (error) {
    options.onError?.(error instanceof Error ? error : new Error('Streaming failed'));
    player.stop();
  }

  return player;
}

/**
 * Create a streaming response handler for fetch
 */
export function createStreamingHandler(
  onChunk: (chunk: Uint8Array) => Promise<void> | void
): (response: Response) => Promise<void> {
  return async (response: Response) => {
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        await onChunk(value);
      }
    }
  };
}

/**
 * Buffered streaming player
 * Buffers chunks before playback for smoother experience
 */
export class BufferedStreamingPlayer {
  private chunks: Uint8Array[] = [];
  private audioElement: HTMLAudioElement | null = null;
  private mediaSource: MediaSource | null = null;
  private sourceBuffer: SourceBuffer | null = null;
  private state: TTSPlaybackState = 'idle';
  private options: StreamingPlaybackOptions;
  private mimeType: string;
  private isSourceOpen = false;
  private pendingChunks: Uint8Array[] = [];

  constructor(mimeType: string = 'audio/mpeg', options: StreamingPlaybackOptions = {}) {
    this.mimeType = mimeType;
    this.options = options;
  }

  /**
   * Initialize media source
   */
  async init(): Promise<void> {
    if (typeof MediaSource === 'undefined') {
      throw new Error('MediaSource API not supported');
    }

    this.mediaSource = new MediaSource();
    this.audioElement = new Audio();
    this.audioElement.src = URL.createObjectURL(this.mediaSource);
    this.audioElement.volume = this.options.volume ?? 1.0;

    // Event handlers
    this.audioElement.onplay = () => this.setState('playing');
    this.audioElement.onpause = () => {
      if (this.audioElement && this.audioElement.currentTime < this.audioElement.duration) {
        this.setState('paused');
      }
    };
    this.audioElement.onended = () => this.setState('stopped');
    this.audioElement.onerror = () => {
      this.options.onError?.(new Error('Audio playback error'));
      this.setState('error');
    };
    this.audioElement.ontimeupdate = () => {
      if (this.audioElement && this.audioElement.duration) {
        this.options.onProgress?.(this.audioElement.currentTime / this.audioElement.duration);
      }
    };

    // Wait for media source to open
    await new Promise<void>((resolve, reject) => {
      this.mediaSource!.addEventListener('sourceopen', () => {
        try {
          this.sourceBuffer = this.mediaSource!.addSourceBuffer(this.mimeType);
          this.isSourceOpen = true;
          
          // Process any pending chunks
          this.processPendingChunks();
          resolve();
        } catch (error) {
          reject(error);
        }
      });
      
      this.mediaSource!.addEventListener('error', () => {
        reject(new Error('MediaSource error'));
      });
    });
  }

  /**
   * Process pending chunks
   */
  private processPendingChunks(): void {
    if (!this.sourceBuffer || this.sourceBuffer.updating) return;

    const chunk = this.pendingChunks.shift();
    if (chunk) {
      try {
        // appendBuffer accepts BufferSource (ArrayBuffer or ArrayBufferView)
        this.sourceBuffer.appendBuffer(chunk as BufferSource);
        this.sourceBuffer.addEventListener('updateend', () => {
          this.processPendingChunks();
        }, { once: true });
      } catch (error) {
        console.error('Failed to append buffer:', error);
      }
    }
  }

  /**
   * Add audio chunk
   */
  addChunk(chunk: Uint8Array): void {
    this.chunks.push(chunk);

    if (!this.isSourceOpen) {
      this.pendingChunks.push(chunk);
      return;
    }

    if (this.sourceBuffer && !this.sourceBuffer.updating) {
      try {
        // appendBuffer accepts BufferSource (ArrayBuffer or ArrayBufferView)
        this.sourceBuffer.appendBuffer(chunk as BufferSource);
      } catch {
        this.pendingChunks.push(chunk);
      }
    } else {
      this.pendingChunks.push(chunk);
    }
  }

  /**
   * Set state
   */
  private setState(state: TTSPlaybackState): void {
    this.state = state;
    this.options.onStateChange?.(state);
  }

  /**
   * Get state
   */
  getState(): TTSPlaybackState {
    return this.state;
  }

  /**
   * Start playback
   */
  play(): void {
    this.audioElement?.play().catch(console.error);
  }

  /**
   * Pause
   */
  pause(): void {
    this.audioElement?.pause();
  }

  /**
   * Resume
   */
  resume(): void {
    this.play();
  }

  /**
   * Stop
   */
  stop(): void {
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.currentTime = 0;
    }
    this.setState('stopped');
  }

  /**
   * End stream (call when all chunks are added)
   */
  endStream(): void {
    if (this.mediaSource && this.mediaSource.readyState === 'open') {
      // Wait for all buffers to finish updating
      if (this.sourceBuffer && !this.sourceBuffer.updating) {
        this.mediaSource.endOfStream();
      } else if (this.sourceBuffer) {
        this.sourceBuffer.addEventListener('updateend', () => {
          if (this.mediaSource?.readyState === 'open') {
            this.mediaSource.endOfStream();
          }
        }, { once: true });
      }
    }
  }

  /**
   * Set volume
   */
  setVolume(volume: number): void {
    if (this.audioElement) {
      this.audioElement.volume = Math.max(0, Math.min(1, volume));
    }
  }

  /**
   * Destroy
   */
  destroy(): void {
    this.stop();
    if (this.audioElement) {
      URL.revokeObjectURL(this.audioElement.src);
      this.audioElement = null;
    }
    this.mediaSource = null;
    this.sourceBuffer = null;
    this.chunks = [];
    this.pendingChunks = [];
  }
}

/**
 * Check if streaming is supported
 */
export function isStreamingSupported(): boolean {
  return typeof MediaSource !== 'undefined' && 
         MediaSource.isTypeSupported('audio/mpeg');
}

/**
 * Check if a MIME type is supported for streaming
 */
export function isStreamingMimeTypeSupported(mimeType: string): boolean {
  if (typeof MediaSource === 'undefined') return false;
  return MediaSource.isTypeSupported(mimeType);
}
