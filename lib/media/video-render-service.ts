/**
 * Video render service
 *
 * Unifies timeline rendering across desktop (Tauri + native FFmpeg)
 * and web fallback (Web APIs + optional ffmpeg.wasm).
 */

import { isTauri } from '@/lib/utils';
import type {
  AudioMixTrack,
  SubtitleTrackBinding,
  TimelineLayer,
  TimelineMarker,
  VideoTrack,
} from '@/types/video-studio/types';
import {
  isVideoEffectInstance,
  normalizeClipEffects,
} from '@/types/video-studio/types';

export interface VideoRenderProgress {
  phase: 'preparing' | 'rendering' | 'encoding' | 'finalizing' | 'complete' | 'error';
  percent: number;
  currentFrame?: number;
  totalFrames?: number;
  elapsedMs?: number;
  estimatedRemainingMs?: number;
  message?: string;
}

export interface VideoRenderSubtitleTrack {
  id: string;
  format: 'srt' | 'vtt' | 'ass';
  content: string;
  burnIn?: boolean;
}

export interface VideoRenderExportOptions {
  format: 'mp4' | 'webm' | 'gif';
  resolution: '480p' | '720p' | '1080p' | '4k';
  fps: number;
  quality: 'low' | 'medium' | 'high' | 'maximum';
  codec?: string;
  audioBitrate?: number;
  videoBitrate?: number;
  includeSubtitles?: boolean;
  subtitleMode?: 'burn-in' | 'sidecar' | 'both';
  subtitleTracks?: VideoRenderSubtitleTrack[];
  destinationPath?: string;
  overwrite?: boolean;
  onProgress?: (progress: VideoRenderProgress) => void;
}

export interface VideoRenderContext {
  duration: number;
  tracks: VideoTrack[];
  markers?: TimelineMarker[];
  layers?: TimelineLayer[];
  subtitleBindings?: SubtitleTrackBinding[];
  audioMix?: AudioMixTrack[];
}

interface TimelineRenderPlanPayload {
  duration: number;
  tracks: Array<{
    id: string;
    type: string;
    clips: Array<{
      id: string;
      sourceUrl: string;
      startTime: number;
      duration: number;
      sourceStartTime: number;
      sourceEndTime?: number;
      volume: number;
      muted: boolean;
      playbackSpeed: number;
      effects: Array<{
        effectId: string;
        enabled: boolean;
        params: Record<string, unknown>;
      }>;
    }>;
    muted: boolean;
    volume: number;
  }>;
  transitions: Array<{
    id: string;
    type: string;
    duration: number;
    fromClipId: string;
    toClipId: string;
  }>;
}

interface NativeTimelineRenderOptions {
  outputPath: string;
  format?: string;
  resolution?: string;
  fps?: number;
  quality?: string;
  codec?: string;
  audioBitrate?: number;
  videoBitrate?: number;
  overwrite?: boolean;
}

interface NativeRenderResult {
  success: boolean;
  outputPath: string;
  fileSize: number;
  durationMs: number;
  error?: string;
}

interface NativeVideoProgressEvent {
  operation: string;
  progress: number;
  currentTime: number;
  totalDuration?: number;
  etaSeconds?: number;
  error?: string;
}

interface PluginMediaClip {
  id: string;
  sourceUrl: string;
}

interface FrameResult {
  data: number[] | Uint8Array;
  width: number;
  height: number;
}

interface FfmpegWasmInstance {
  load: () => Promise<void>;
  writeFile: (path: string, data: Uint8Array) => Promise<void>;
  exec: (args: string[]) => Promise<void>;
  readFile: (path: string) => Promise<Uint8Array | number[]>;
}

interface FfmpegWasmModule {
  FFmpeg: new () => FfmpegWasmInstance;
  fetchFile: (source: string | Blob) => Promise<Uint8Array>;
}

const PREVIEW_PLUGIN_ID = 'video-render-service';

function randomId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function stripFileProtocol(path: string): string {
  return path.startsWith('file://') ? path.replace('file://', '') : path;
}

function toBlobPart(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

function getOutputPath(context: VideoRenderContext, options: VideoRenderExportOptions): string {
  if (options.destinationPath) {
    return options.destinationPath;
  }

  const firstClip = context.tracks.flatMap((track) => track.clips)[0];
  const source = firstClip?.sourceUrl ? stripFileProtocol(firstClip.sourceUrl) : '';
  const ext = options.format;

  if (!source) {
    return `video-export-${Date.now()}.${ext}`;
  }

  const normalized = source.replace(/\\/g, '/');
  const dotIndex = normalized.lastIndexOf('.');
  if (dotIndex > 0) {
    return `${normalized.slice(0, dotIndex)}.export-${Date.now()}.${ext}`;
  }
  return `${normalized}.export-${Date.now()}.${ext}`;
}

function mapEffectToFfmpegFilter(effectId: string, params: Record<string, unknown>): string | null {
  switch (effectId) {
    case 'brightness-contrast': {
      const brightness = Number(params.brightness ?? 0) / 100;
      const contrast = 1 + Number(params.contrast ?? 0) / 100;
      return `eq=brightness=${brightness}:contrast=${contrast}`;
    }
    case 'saturation':
      return `eq=saturation=${1 + Number(params.amount ?? 0) / 100}`;
    case 'hue':
      return `hue=h=${Number(params.amount ?? 0)}`;
    case 'blur':
      return `boxblur=${Math.max(0, Number(params.amount ?? 0) / 10)}`;
    case 'sharpen': {
      const amount = Math.max(0, Number(params.amount ?? 0) / 100);
      return `unsharp=5:5:${amount}:5:5:0.0`;
    }
    case 'grayscale':
      return 'hue=s=0';
    case 'sepia':
      return 'colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131';
    default:
      return null;
  }
}

async function invokeTauri<T>(command: string, payload: Record<string, unknown>): Promise<T> {
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<T>(command, payload);
}

function buildRenderPlan(context: VideoRenderContext): TimelineRenderPlanPayload {
  const tracks = context.tracks.map((track) => ({
    id: track.id,
    type: track.type,
    muted: track.muted,
    volume: track.volume,
    clips: [...track.clips]
      .sort((left, right) => left.startTime - right.startTime)
      .map((clip) => ({
        id: clip.id,
        sourceUrl: clip.sourceUrl,
        startTime: clip.startTime,
        duration: clip.duration,
        sourceStartTime: clip.sourceStartTime,
        sourceEndTime: clip.sourceEndTime,
        volume: clip.volume,
        muted: clip.muted || track.muted,
        playbackSpeed: clip.playbackSpeed,
        effects: normalizeClipEffects(clip.effects)
          .filter((effect) => effect.enabled)
          .map((effect) => ({
            effectId: effect.effectId,
            enabled: effect.enabled,
            params: effect.params,
          })),
      })),
  }));

  const transitions: TimelineRenderPlanPayload['transitions'] = [];
  for (const track of context.tracks) {
    const ordered = [...track.clips].sort((left, right) => left.startTime - right.startTime);
    for (let index = 0; index < ordered.length; index++) {
      const current = ordered[index];
      const next = ordered[index + 1];
      if (!current?.transition || !next) {
        continue;
      }

      const relationToClip =
        typeof current.transition.params?.toClipId === 'string'
          ? String(current.transition.params.toClipId)
          : next.id;
      transitions.push({
        id: randomId('transition'),
        type: current.transition.type,
        duration: current.transition.duration,
        fromClipId: current.id,
        toClipId: relationToClip,
      });
    }
  }

  return {
    duration: context.duration,
    tracks,
    transitions,
  };
}

async function createImageDataUrl(frame: FrameResult): Promise<string> {
  const bytes = frame.data instanceof Uint8Array ? frame.data : new Uint8Array(frame.data);
  const imageData = new ImageData(new Uint8ClampedArray(bytes), frame.width, frame.height);
  const canvas = document.createElement('canvas');
  canvas.width = frame.width;
  canvas.height = frame.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to create preview canvas context');
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/png');
}

async function createFrameFromVideo(sourceUrl: string, time: number): Promise<string | null> {
  if (typeof document === 'undefined') {
    return null;
  }

  return new Promise<string | null>((resolve) => {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.preload = 'metadata';
    video.src = sourceUrl;

    const cleanup = () => {
      video.pause();
      video.removeAttribute('src');
      video.load();
    };

    video.onloadedmetadata = () => {
      const safeTime = Math.min(Math.max(0, time), Math.max(0, video.duration - 0.05));
      video.currentTime = Number.isFinite(safeTime) ? safeTime : 0;
    };

    video.onseeked = () => {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 1;
      canvas.height = video.videoHeight || 1;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        cleanup();
        resolve(null);
        return;
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/png');
      cleanup();
      resolve(dataUrl);
    };

    video.onerror = () => {
      cleanup();
      resolve(null);
    };
  });
}

class DesktopNativeRenderer {
  async exportTimeline(
    context: VideoRenderContext,
    options: VideoRenderExportOptions
  ): Promise<Blob> {
    const plan = buildRenderPlan(context);
    const outputPath = getOutputPath(context, options);
    const nativeOptions: NativeTimelineRenderOptions = {
      outputPath,
      format: options.format,
      resolution: options.resolution,
      fps: options.fps,
      quality: options.quality,
      codec: options.codec ?? 'libx264',
      audioBitrate: options.audioBitrate,
      videoBitrate: options.videoBitrate,
      overwrite: options.overwrite ?? true,
    };

    const startedAt = Date.now();
    const unlistenFns: Array<() => void> = [];
    try {
      if (options.onProgress) {
        const { listen } = await import('@tauri-apps/api/event');

        const unlistenStarted = await listen<NativeVideoProgressEvent>(
          'video-processing-started',
          (event) => {
            if (event.payload.operation !== 'timeline-render') {
              return;
            }
            options.onProgress?.({
              phase: 'preparing',
              percent: 0,
              message: 'Preparing timeline render...',
            });
          }
        );

        const unlistenProgress = await listen<NativeVideoProgressEvent>(
          'video-processing-progress',
          (event) => {
            if (event.payload.operation !== 'timeline-render') {
              return;
            }
            const percent = Math.max(0, Math.min(100, Math.round((event.payload.progress ?? 0) * 100)));
            const elapsedMs = Date.now() - startedAt;
            options.onProgress?.({
              phase: percent < 85 ? 'rendering' : 'encoding',
              percent,
              elapsedMs,
              estimatedRemainingMs:
                typeof event.payload.etaSeconds === 'number'
                  ? Math.round(event.payload.etaSeconds * 1000)
                  : undefined,
              message: `Rendering timeline (${percent}%)`,
            });
          }
        );

        const unlistenCompleted = await listen<{ operation: string; outputPath: string }>(
          'video-processing-completed',
          (event) => {
            if (event.payload.operation !== 'timeline-render') {
              return;
            }
            options.onProgress?.({
              phase: 'finalizing',
              percent: 98,
              elapsedMs: Date.now() - startedAt,
              message: 'Finalizing output...',
            });
          }
        );

        const unlistenError = await listen<NativeVideoProgressEvent>(
          'video-processing-error',
          (event) => {
            if (event.payload.operation !== 'timeline-render') {
              return;
            }
            options.onProgress?.({
              phase: 'error',
              percent: 0,
              message: event.payload.error ?? 'Timeline render failed',
            });
          }
        );

        unlistenFns.push(unlistenStarted, unlistenProgress, unlistenCompleted, unlistenError);
      }

      const result = await invokeTauri<NativeRenderResult>('video_render_timeline_with_progress', {
        plan,
        options: nativeOptions,
      });

      if (!result.success) {
        throw new Error(result.error || 'Timeline render failed');
      }

      const { readFile, writeFile, exists } = await import('@tauri-apps/plugin-fs');
      const data = await readFile(result.outputPath);
      const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
      const blob = new Blob([toBlobPart(bytes)], { type: `video/${options.format}` });

      if (options.destinationPath && options.destinationPath !== result.outputPath) {
        const fileExists = await exists(options.destinationPath).catch(() => false);
        if (fileExists && options.overwrite === false) {
          throw new Error(`Output file already exists: ${options.destinationPath}`);
        }
        await writeFile(options.destinationPath, bytes);
      }

      if (options.onProgress) {
        options.onProgress({
          phase: 'complete',
          percent: 100,
          elapsedMs: Date.now() - startedAt,
          message: 'Export complete',
        });
      }

      return blob;
    } finally {
      for (const unlisten of unlistenFns) {
        unlisten();
      }
    }
  }

  async generatePreviewFrame(sourceUrl: string, time: number): Promise<string | null> {
    try {
      const clip = await invokeTauri<PluginMediaClip>('plugin_media_load_video_clip', {
        pluginId: PREVIEW_PLUGIN_ID,
        source: sourceUrl,
      });
      const frame = await invokeTauri<FrameResult>('plugin_media_get_video_frame', {
        pluginId: PREVIEW_PLUGIN_ID,
        clipId: clip.id,
        time,
      });
      return createImageDataUrl(frame);
    } catch {
      return createFrameFromVideo(sourceUrl, time);
    }
  }
}

class WebRenderer {
  private async loadFfmpegModule(): Promise<FfmpegWasmModule> {
    const ffmpegModuleName = '@ffmpeg/ffmpeg';
    const utilModuleName = '@ffmpeg/util';
    const ffmpegModule = (await import(ffmpegModuleName)) as {
      FFmpeg: new () => FfmpegWasmInstance;
    };
    const utilModule = (await import(utilModuleName)) as {
      fetchFile: (source: string | Blob) => Promise<Uint8Array>;
    };
    return {
      FFmpeg: ffmpegModule.FFmpeg,
      fetchFile: utilModule.fetchFile,
    };
  }

  private async renderWithFfmpegWasm(
    context: VideoRenderContext,
    options: VideoRenderExportOptions
  ): Promise<Blob> {
    const { FFmpeg, fetchFile } = await this.loadFfmpegModule();
    const ffmpeg = new FFmpeg();
    await ffmpeg.load();

    const allClips = context.tracks
      .flatMap((track) => track.clips.map((clip) => ({ ...clip, trackMuted: track.muted })))
      .sort((left, right) => left.startTime - right.startTime);

    const segmentNames: string[] = [];

    for (let index = 0; index < allClips.length; index++) {
      const clip = allClips[index];
      const inputName = `input_${index}.mp4`;
      const outputName = `segment_${index}.mp4`;
      const inputData = await fetchFile(clip.sourceUrl);
      await ffmpeg.writeFile(inputName, inputData);

      const videoFilters: string[] = [];
      if (Math.abs(clip.playbackSpeed - 1) > Number.EPSILON) {
        videoFilters.push(`setpts=PTS/${clip.playbackSpeed.toFixed(6)}`);
      }

      for (const effect of normalizeClipEffects(clip.effects)) {
        if (!effect.enabled) {
          continue;
        }
        const filter = mapEffectToFfmpegFilter(effect.effectId, effect.params);
        if (filter) {
          videoFilters.push(filter);
        }
      }

      const audioFilters: string[] = [];
      if (clip.muted || clip.trackMuted) {
        audioFilters.push('volume=0');
      } else if (Math.abs(clip.volume - 1) > Number.EPSILON) {
        audioFilters.push(`volume=${clip.volume.toFixed(6)}`);
      }

      const args = [
        '-y',
        '-ss',
        `${Math.max(0, clip.sourceStartTime).toFixed(3)}`,
        '-i',
        inputName,
        '-t',
        `${Math.max(0.01, clip.duration).toFixed(3)}`,
      ];

      if (videoFilters.length > 0) {
        args.push('-vf', videoFilters.join(','));
      }
      if (audioFilters.length > 0) {
        args.push('-af', audioFilters.join(','));
      }

      args.push(
        '-r',
        String(options.fps),
        '-c:v',
        options.codec || 'libx264',
        '-preset',
        'veryfast',
        '-crf',
        '22',
        '-c:a',
        'aac',
        outputName
      );

      await ffmpeg.exec(args);
      segmentNames.push(outputName);
    }

    if (segmentNames.length === 0) {
      throw new Error('No clips available for export');
    }

    if (segmentNames.length > 1) {
      const concatContent = segmentNames.map((name) => `file '${name}'`).join('\n');
      await ffmpeg.writeFile('concat.txt', new TextEncoder().encode(concatContent));
      await ffmpeg.exec([
        '-y',
        '-f',
        'concat',
        '-safe',
        '0',
        '-i',
        'concat.txt',
        '-c:v',
        options.codec || 'libx264',
        '-c:a',
        'aac',
        'output.mp4',
      ]);
    } else {
      await ffmpeg.exec(['-y', '-i', segmentNames[0], '-c', 'copy', 'output.mp4']);
    }

    const output = await ffmpeg.readFile('output.mp4');
    const bytes = output instanceof Uint8Array ? output : new Uint8Array(output);
    return new Blob([toBlobPart(bytes)], { type: `video/${options.format}` });
  }

  async exportTimeline(
    context: VideoRenderContext,
    options: VideoRenderExportOptions
  ): Promise<Blob> {
    const allClips = context.tracks.flatMap((track) => track.clips);
    if (allClips.length === 0) {
      throw new Error('No clips to export');
    }

    options.onProgress?.({
      phase: 'preparing',
      percent: 0,
      message: 'Preparing web renderer...',
    });

    const hasComplexGraph = allClips.some(
      (clip) =>
        clip.effects.some((effect) => {
          if (isVideoEffectInstance(effect)) {
            return effect.enabled;
          }
          return true;
        }) ||
        Math.abs(clip.playbackSpeed - 1) > Number.EPSILON ||
        Boolean(clip.transition)
    );

    try {
      if (allClips.length > 1 || hasComplexGraph) {
        options.onProgress?.({
          phase: 'rendering',
          percent: 10,
          message: 'Rendering with ffmpeg.wasm...',
        });
        const wasmResult = await this.renderWithFfmpegWasm(context, options);
        options.onProgress?.({
          phase: 'complete',
          percent: 100,
          message: 'Export complete',
        });
        return wasmResult;
      }
    } catch {
      // Fallback to direct clip blob.
    }

    const firstClip = allClips[0];
    const response = await fetch(firstClip.sourceUrl);
    const blob = await response.blob();
    options.onProgress?.({
      phase: 'complete',
      percent: 100,
      message: 'Export complete',
    });
    return blob;
  }

  async generatePreviewFrame(sourceUrl: string, time: number): Promise<string | null> {
    return createFrameFromVideo(sourceUrl, time);
  }
}

export class VideoRenderService {
  private readonly desktopRenderer = new DesktopNativeRenderer();
  private readonly webRenderer = new WebRenderer();

  async exportTimeline(context: VideoRenderContext, options: VideoRenderExportOptions): Promise<Blob> {
    if (isTauri()) {
      return this.desktopRenderer.exportTimeline(context, options);
    }
    return this.webRenderer.exportTimeline(context, options);
  }

  async generatePreviewFrame(context: VideoRenderContext, time: number): Promise<string | null> {
    const firstClip = context.tracks.flatMap((track) => track.clips)[0];
    if (!firstClip?.sourceUrl) {
      return null;
    }

    if (isTauri()) {
      return this.desktopRenderer.generatePreviewFrame(firstClip.sourceUrl, time);
    }
    return this.webRenderer.generatePreviewFrame(firstClip.sourceUrl, time);
  }
}

export function createVideoRenderService(): VideoRenderService {
  return new VideoRenderService();
}
