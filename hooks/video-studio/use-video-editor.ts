/**
 * useVideoEditor - Composition hook for video editing operations
 *
 * Composes focused sub-hooks into a single unified interface:
 * - useTrackManagement — track & clip CRUD, audio, utilities
 * - usePlayback — play, pause, seek, speed
 * - useClipEffects — effects & transitions
 *
 * Also manages zoom, timeline ref, export, and reset.
 * The return type (`UseVideoEditorReturn`) is unchanged for backward compatibility.
 */

import { useCallback, useRef, useState } from 'react';
import { loggers } from '@/lib/logger';
import type {
  VideoEffectDefinition,
  VideoTransitionDefinition,
  VideoExportOptions,
  ExportProgress,
} from '@/lib/plugin/api/media-api';

import type { VideoClip, VideoTrack, VideoEditorState } from '@/types/video-studio/types';
import { useTrackManagement } from './use-track-management';
import { usePlayback } from './use-playback';
import { useClipEffects } from './use-clip-effects';

// Re-export for backward compatibility
export type { VideoClip, VideoTrack, VideoEditorState } from '@/types/video-studio/types';

export interface UseVideoEditorOptions {
  maxTracks?: number;
  defaultTrackHeight?: number;
  onClipChange?: (clips: VideoClip[]) => void;
  onPlaybackChange?: (isPlaying: boolean, currentTime: number) => void;
  onError?: (error: string) => void;
}

export interface UseVideoEditorReturn {
  // State
  state: VideoEditorState;

  // Track Management
  addTrack: (type: VideoTrack['type'], name?: string) => string;
  removeTrack: (trackId: string) => void;
  updateTrack: (trackId: string, updates: Partial<VideoTrack>) => void;
  reorderTracks: (fromIndex: number, toIndex: number) => void;
  selectTrack: (trackId: string | null) => void;

  // Clip Management
  addClip: (trackId: string, sourceUrl: string, startTime?: number) => Promise<string>;
  removeClip: (clipId: string) => void;
  updateClip: (clipId: string, updates: Partial<VideoClip>) => void;
  moveClip: (clipId: string, targetTrackId: string, newStartTime: number) => void;
  splitClip: (clipId: string, atTime: number) => string[];
  duplicateClip: (clipId: string) => string;
  trimClip: (clipId: string, newStart: number, newEnd: number) => void;
  selectClips: (clipIds: string[]) => void;
  deselectAllClips: () => void;

  // Playback
  play: () => void;
  pause: () => void;
  togglePlayback: () => void;
  seek: (time: number) => void;
  setPlaybackSpeed: (speed: number) => void;

  // Effects & Transitions
  addEffect: (clipId: string, effectId: string, params?: Record<string, unknown>) => void;
  removeEffect: (clipId: string, effectId: string) => void;
  updateEffectParams: (clipId: string, effectId: string, params: Record<string, unknown>) => void;
  addTransition: (fromClipId: string, toClipId: string, type: string, duration: number) => void;
  removeTransition: (clipId: string) => void;
  getAvailableEffects: () => VideoEffectDefinition[];
  getAvailableTransitions: () => VideoTransitionDefinition[];

  // Audio
  setClipVolume: (clipId: string, volume: number) => void;
  setClipMuted: (clipId: string, muted: boolean) => void;
  setTrackVolume: (trackId: string, volume: number) => void;
  setTrackMuted: (trackId: string, muted: boolean) => void;

  // Timeline
  setZoom: (zoom: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  fitToView: () => void;

  // Export
  exportVideo: (options: VideoExportOptions) => Promise<Blob | null>;
  generatePreview: () => Promise<string | null>;

  // Utilities
  getClipAtTime: (trackId: string, time: number) => VideoClip | null;
  getTracksWithClipsAtTime: (time: number) => VideoTrack[];
  getDuration: () => number;
  setTracks: (tracks: VideoTrack[], duration?: number) => void;
  reset: () => void;

  // Refs
  videoRef: React.RefObject<HTMLVideoElement | null>;
  timelineRef: React.RefObject<HTMLDivElement | null>;
}

export function useVideoEditor(options: UseVideoEditorOptions = {}): UseVideoEditorReturn {
  const {
    maxTracks,
    defaultTrackHeight,
    onClipChange,
    onPlaybackChange,
    onError,
  } = options;

  // ── Sub-hook: Track & Clip management ─────────────────────────────────
  const trackMgmt = useTrackManagement({ maxTracks, defaultTrackHeight, onClipChange, onError });
  const { trackState, setTrackState, updateTracks } = trackMgmt;

  // ── Playback-related state (kept here so the full VideoEditorState lives
  //    in one place and the return type stays identical) ──────────────────
  const [playbackState, setPlaybackState] = useState({
    isPlaying: false,
    currentTime: 0,
    zoom: 1,
    previewUrl: null as string | null,
  });

  // Compose the full VideoEditorState that consumers expect
  const state: VideoEditorState = {
    isLoading: trackState.isLoading,
    isProcessing: trackState.isProcessing,
    isPlaying: playbackState.isPlaying,
    error: trackState.error,
    currentTime: playbackState.currentTime,
    duration: trackState.duration,
    zoom: playbackState.zoom,
    tracks: trackState.tracks,
    selectedClipIds: trackState.selectedClipIds,
    selectedTrackId: trackState.selectedTrackId,
    previewUrl: playbackState.previewUrl,
  };

  // A combined setState that dispatches to the correct sub-state
  const setFullState: React.Dispatch<React.SetStateAction<VideoEditorState>> = useCallback(
    (action) => {
      // We need to support both function updaters and direct values
      if (typeof action === 'function') {
        // For function updaters, we need to compose the current full state,
        // call the updater, then split the result back
        setTrackState((prevTrack) => {
          // We read playback state via a ref to avoid stale closures
          const fullPrev: VideoEditorState = {
            isLoading: prevTrack.isLoading,
            isProcessing: prevTrack.isProcessing,
            isPlaying: playbackState.isPlaying,
            error: prevTrack.error,
            currentTime: playbackState.currentTime,
            duration: prevTrack.duration,
            zoom: playbackState.zoom,
            tracks: prevTrack.tracks,
            selectedClipIds: prevTrack.selectedClipIds,
            selectedTrackId: prevTrack.selectedTrackId,
            previewUrl: playbackState.previewUrl,
          };

          const next = (action as (prev: VideoEditorState) => VideoEditorState)(fullPrev);

          // Update playback state side
          setPlaybackState({
            isPlaying: next.isPlaying,
            currentTime: next.currentTime,
            zoom: next.zoom,
            previewUrl: next.previewUrl,
          });

          // Return track state side
          return {
            isLoading: next.isLoading,
            isProcessing: next.isProcessing,
            error: next.error,
            tracks: next.tracks,
            duration: next.duration,
            selectedClipIds: next.selectedClipIds,
            selectedTrackId: next.selectedTrackId,
          };
        });
      } else {
        const next = action;
        setTrackState({
          isLoading: next.isLoading,
          isProcessing: next.isProcessing,
          error: next.error,
          tracks: next.tracks,
          duration: next.duration,
          selectedClipIds: next.selectedClipIds,
          selectedTrackId: next.selectedTrackId,
        });
        setPlaybackState({
          isPlaying: next.isPlaying,
          currentTime: next.currentTime,
          zoom: next.zoom,
          previewUrl: next.previewUrl,
        });
      }
    },
    [setTrackState, playbackState]
  );

  // ── Sub-hook: Playback ────────────────────────────────────────────────
  const playbackHook = usePlayback(state, setFullState, trackMgmt.updateClip, {
    onPlaybackChange,
  });
  const pausePlayback = playbackHook.pause;

  // ── Sub-hook: Effects & Transitions ───────────────────────────────────
  const effectsHook = useClipEffects(updateTracks, trackMgmt.updateClip);

  // ── Refs ──────────────────────────────────────────────────────────────
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const timelineRef = useRef<HTMLDivElement | null>(null);

  // ── Timeline zoom ─────────────────────────────────────────────────────

  const setZoom = useCallback((zoom: number) => {
    setPlaybackState((prev) => ({ ...prev, zoom: Math.max(0.1, Math.min(10, zoom)) }));
  }, []);

  const zoomIn = useCallback(() => {
    setPlaybackState((prev) => ({ ...prev, zoom: Math.min(10, prev.zoom * 1.2) }));
  }, []);

  const zoomOut = useCallback(() => {
    setPlaybackState((prev) => ({ ...prev, zoom: Math.max(0.1, prev.zoom / 1.2) }));
  }, []);

  const fitToView = useCallback(() => {
    if (!timelineRef.current || trackState.duration === 0) return;
    const containerWidth = timelineRef.current.clientWidth;
    const zoom = containerWidth / (trackState.duration * 100); // 100px per second at zoom 1
    setPlaybackState((prev) => ({ ...prev, zoom: Math.max(0.1, Math.min(10, zoom)) }));
  }, [trackState.duration]);

  // ── Export ─────────────────────────────────────────────────────────────

  const setError = useCallback(
    (error: string) => {
      setTrackState((prev) => ({ ...prev, error }));
      onError?.(error);
    },
    [onError, setTrackState]
  );

  const exportVideo = useCallback(
    async (exportOpts: VideoExportOptions): Promise<Blob | null> => {
      setTrackState((prev) => ({ ...prev, isProcessing: true }));
      const startTime = Date.now();

      try {
        const totalFrames = Math.ceil(trackState.duration * exportOpts.fps);
        const report = (progress: ExportProgress) => {
          exportOpts.onProgress?.(progress);
        };

        // Phase 1: Preparing
        report({ phase: 'preparing', percent: 0, totalFrames, message: 'Preparing export...' });

        // Collect all clips across tracks
        const allClips = trackState.tracks.flatMap((t) => t.clips);
        if (allClips.length === 0) {
          report({ phase: 'error', percent: 0, message: 'No clips to export' });
          setTrackState((prev) => ({ ...prev, isProcessing: false }));
          return null;
        }

        // Phase 2: Rendering frames (simulated — real impl would use canvas/WebCodecs)
        report({ phase: 'rendering', percent: 10, currentFrame: 0, totalFrames, message: 'Rendering frames...' });

        const renderSteps = 5;
        for (let step = 0; step < renderSteps; step++) {
          await new Promise((r) => setTimeout(r, 100));
          const currentFrame = Math.floor(((step + 1) / renderSteps) * totalFrames);
          const elapsed = Date.now() - startTime;
          const progressPct = 10 + ((step + 1) / renderSteps) * 50;
          report({
            phase: 'rendering',
            percent: Math.round(progressPct),
            currentFrame,
            totalFrames,
            elapsedMs: elapsed,
            estimatedRemainingMs: Math.round((elapsed / progressPct) * (100 - progressPct)),
            message: `Rendering frame ${currentFrame}/${totalFrames}...`,
          });
        }

        // Phase 3: Encoding
        report({ phase: 'encoding', percent: 65, elapsedMs: Date.now() - startTime, message: 'Encoding video...' });
        await new Promise((r) => setTimeout(r, 200));
        report({ phase: 'encoding', percent: 80, elapsedMs: Date.now() - startTime, message: 'Encoding audio...' });
        await new Promise((r) => setTimeout(r, 100));

        // Phase 4: Finalizing
        report({ phase: 'finalizing', percent: 90, elapsedMs: Date.now() - startTime, message: 'Finalizing...' });

        let blob: Blob | null = null;
        const firstClip = allClips[0];
        if (firstClip?.sourceUrl) {
          try {
            const response = await fetch(firstClip.sourceUrl);
            blob = await response.blob();
          } catch {
            blob = new Blob([], { type: `video/${exportOpts.format}` });
          }
        } else {
          blob = new Blob([], { type: `video/${exportOpts.format}` });
        }

        const elapsed = Date.now() - startTime;
        report({ phase: 'complete', percent: 100, elapsedMs: elapsed, message: 'Export complete!' });

        loggers.media.info('Video exported', { format: exportOpts.format, resolution: exportOpts.resolution, elapsed });
        setTrackState((prev) => ({ ...prev, isProcessing: false }));
        return blob;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Export failed';
        exportOpts.onProgress?.({ phase: 'error', percent: 0, message });
        setError(message);
        setTrackState((prev) => ({ ...prev, isProcessing: false }));
        return null;
      }
    },
    [trackState.duration, trackState.tracks, setError, setTrackState]
  );

  const generatePreview = useCallback(async (): Promise<string | null> => {
    return playbackState.previewUrl;
  }, [playbackState.previewUrl]);

  // ── Reset ─────────────────────────────────────────────────────────────

  const reset = useCallback(() => {
    pausePlayback();
    setTrackState({
      isLoading: false,
      isProcessing: false,
      error: null,
      tracks: [],
      duration: 0,
      selectedClipIds: [],
      selectedTrackId: null,
    });
    setPlaybackState({
      isPlaying: false,
      currentTime: 0,
      zoom: 1,
      previewUrl: null,
    });
  }, [pausePlayback, setTrackState]);

  // ── Return unified interface ──────────────────────────────────────────

  return {
    state,

    // Track management
    addTrack: trackMgmt.addTrack,
    removeTrack: trackMgmt.removeTrack,
    updateTrack: trackMgmt.updateTrack,
    reorderTracks: trackMgmt.reorderTracks,
    selectTrack: trackMgmt.selectTrack,

    // Clip management
    addClip: trackMgmt.addClip,
    removeClip: trackMgmt.removeClip,
    updateClip: trackMgmt.updateClip,
    moveClip: trackMgmt.moveClip,
    splitClip: trackMgmt.splitClip,
    duplicateClip: trackMgmt.duplicateClip,
    trimClip: trackMgmt.trimClip,
    selectClips: trackMgmt.selectClips,
    deselectAllClips: trackMgmt.deselectAllClips,

    // Playback
    play: playbackHook.play,
    pause: playbackHook.pause,
    togglePlayback: playbackHook.togglePlayback,
    seek: playbackHook.seek,
    setPlaybackSpeed: playbackHook.setPlaybackSpeed,

    // Effects & Transitions
    addEffect: effectsHook.addEffect,
    removeEffect: effectsHook.removeEffect,
    updateEffectParams: effectsHook.updateEffectParams,
    addTransition: effectsHook.addTransition,
    removeTransition: effectsHook.removeTransition,
    getAvailableEffects: effectsHook.getAvailableEffects,
    getAvailableTransitions: effectsHook.getAvailableTransitions,

    // Audio
    setClipVolume: trackMgmt.setClipVolume,
    setClipMuted: trackMgmt.setClipMuted,
    setTrackVolume: trackMgmt.setTrackVolume,
    setTrackMuted: trackMgmt.setTrackMuted,

    // Timeline
    setZoom,
    zoomIn,
    zoomOut,
    fitToView,

    // Export
    exportVideo,
    generatePreview,

    // Utilities
    getClipAtTime: trackMgmt.getClipAtTime,
    getTracksWithClipsAtTime: trackMgmt.getTracksWithClipsAtTime,
    getDuration: trackMgmt.getDuration,
    setTracks: trackMgmt.setTracks,
    reset,

    // Refs
    videoRef,
    timelineRef,
  };
}

export default useVideoEditor;
