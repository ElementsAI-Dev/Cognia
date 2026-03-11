/**
 * useVideoEditor - Composition hook for video editing operations
 *
 * Composes focused sub-hooks into a single unified interface:
 * - useTrackManagement -- track & clip CRUD, audio, utilities
 * - usePlayback -- play, pause, seek, speed
 * - useClipEffects -- effects & transitions
 *
 * Also manages zoom, timeline ref, export, and reset.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { loggers } from '@/lib/logger';
import type {
  VideoEffectDefinition,
  VideoTransitionDefinition,
  VideoExportOptions,
} from '@/lib/plugin/api/media-api';

import type {
  AudioMixTrack,
  SubtitleTrackBinding,
  TimelineLayer,
  TimelineMarker,
  VideoClip,
  VideoEditorState,
  VideoTrack,
} from '@/types/video-studio/types';
import { useTrackManagement } from './use-track-management';
import { usePlayback } from './use-playback';
import { useClipEffects } from './use-clip-effects';
import {
  createVideoRenderService,
  normalizeVideoRenderError,
  type VideoRenderContext,
  type VideoRenderExportOptions,
  type VideoRenderProgress,
} from '@/lib/media/video-render-service';
import { useVideoEditorStore, type HistorySnapshot } from '@/stores/media';

// Re-export for backward compatibility
export type { VideoClip, VideoTrack, VideoEditorState } from '@/types/video-studio/types';

export interface VideoEditorExportState {
  phase: 'idle' | 'running' | 'success' | 'error' | 'cancelled';
  progress: VideoRenderProgress | null;
  errorCode?: string;
  errorMessage?: string;
  retryable: boolean;
}

export interface CommitTimelineMutationOptions {
  action: string;
  markers?: TimelineMarker[];
  layers?: TimelineLayer[];
  subtitleBindings?: SubtitleTrackBinding[];
  audioMix?: AudioMixTrack[];
  selectedClipIds?: string[];
  selectedTrackId?: string | null;
  currentTime?: number;
  pushHistory?: boolean;
}

export interface UseVideoEditorOptions {
  maxTracks?: number;
  defaultTrackHeight?: number;
  onClipChange?: (clips: VideoClip[]) => void;
  onPlaybackChange?: (isPlaying: boolean, currentTime: number) => void;
  onError?: (error: string) => void;
  enableUnifiedTimelineMutation?: boolean;
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
  setEffectEnabled: (clipId: string, effectId: string, enabled: boolean) => void;
  reorderEffects: (clipId: string, fromIndex: number, toIndex: number) => void;
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
  timeline: {
    markers: TimelineMarker[];
    layers: TimelineLayer[];
    subtitleBindings: SubtitleTrackBinding[];
    audioMix: AudioMixTrack[];
  };
  setTimelineMarkers: (markers: TimelineMarker[]) => void;
  setTimelineLayers: (layers: TimelineLayer[]) => void;
  setSubtitleBindings: (bindings: SubtitleTrackBinding[]) => void;
  setAudioMixTracks: (tracks: AudioMixTrack[]) => void;
  commitTimelineMutation: (input: CommitTimelineMutationOptions) => void;
  applyHistorySnapshot: (snapshot: HistorySnapshot) => void;

  // Export
  exportVideo: (options: VideoExportOptions) => Promise<Blob | null>;
  retryExport: () => Promise<Blob | null>;
  cancelExport: () => Promise<void>;
  exportState: VideoEditorExportState;
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

type TimelineDataState = {
  markers: TimelineMarker[];
  layers: TimelineLayer[];
  subtitleBindings: SubtitleTrackBinding[];
  audioMix: AudioMixTrack[];
};

function clampTime(time: number, duration: number): number {
  return Math.max(0, Math.min(time, Math.max(0, duration)));
}

function sanitizeSelection(
  tracks: VideoTrack[],
  selectedClipIds: string[],
  selectedTrackId: string | null
): {
  selectedClipIds: string[];
  selectedTrackId: string | null;
} {
  const clipIds = new Set(tracks.flatMap((track) => track.clips.map((clip) => clip.id)));
  const trackIds = new Set(tracks.map((track) => track.id));

  return {
    selectedClipIds: selectedClipIds.filter((clipId) => clipIds.has(clipId)),
    selectedTrackId: selectedTrackId && trackIds.has(selectedTrackId) ? selectedTrackId : null,
  };
}

export function useVideoEditor(options: UseVideoEditorOptions = {}): UseVideoEditorReturn {
  const {
    maxTracks,
    defaultTrackHeight,
    onClipChange,
    onPlaybackChange,
    onError,
    enableUnifiedTimelineMutation = true,
  } = options;

  const commitStoreTimelineMutation = useVideoEditorStore((state) => state.commitTimelineMutation);

  // -- Sub-hook: Track & Clip management ----------------------------------
  const trackMgmt = useTrackManagement({ maxTracks, defaultTrackHeight, onClipChange, onError });
  const { trackState, setTrackState, updateTracks } = trackMgmt;

  // -- Playback-related state (kept here so the full VideoEditorState lives
  //    in one place and the return type stays identical) -------------------
  const [playbackState, setPlaybackState] = useState({
    isPlaying: false,
    currentTime: 0,
    zoom: 1,
    previewUrl: null as string | null,
  });

  const renderServiceRef = useRef(createVideoRenderService());
  const activeExportControllerRef = useRef<AbortController | null>(null);
  const lastExportOptionsRef = useRef<VideoExportOptions | null>(null);
  const committedMutationRevisionRef = useRef<number>(0);

  const initialTimelineData: TimelineDataState = {
    markers: [],
    layers: [],
    subtitleBindings: [],
    audioMix: [],
  };
  const [timelineData, setTimelineData] = useState<TimelineDataState>(initialTimelineData);
  const timelineDataRef = useRef<TimelineDataState>(initialTimelineData);
  const setTimelineDataState = useCallback((nextTimeline: TimelineDataState) => {
    timelineDataRef.current = nextTimeline;
    setTimelineData(nextTimeline);
  }, []);

  const [exportState, setExportState] = useState<VideoEditorExportState>({
    phase: 'idle',
    progress: null,
    retryable: false,
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
      if (typeof action === 'function') {
        setTrackState((prevTrack) => {
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

          setPlaybackState({
            isPlaying: next.isPlaying,
            currentTime: next.currentTime,
            zoom: next.zoom,
            previewUrl: next.previewUrl,
          });

          return {
            isLoading: next.isLoading,
            isProcessing: next.isProcessing,
            error: next.error,
            tracks: next.tracks,
            duration: next.duration,
            selectedClipIds: next.selectedClipIds,
            selectedTrackId: next.selectedTrackId,
            mutationRevision: prevTrack.mutationRevision,
            lastMutationAction: prevTrack.lastMutationAction,
          };
        });
      } else {
        const next = action;
        setTrackState((prevTrack) => ({
          isLoading: next.isLoading,
          isProcessing: next.isProcessing,
          error: next.error,
          tracks: next.tracks,
          duration: next.duration,
          selectedClipIds: next.selectedClipIds,
          selectedTrackId: next.selectedTrackId,
          mutationRevision: prevTrack.mutationRevision,
          lastMutationAction: prevTrack.lastMutationAction,
        }));
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

  // -- Sub-hook: Playback ---------------------------------------------------
  const playbackHook = usePlayback(state, setFullState, trackMgmt.updateClip, {
    onPlaybackChange,
  });
  const pausePlayback = playbackHook.pause;

  // -- Sub-hook: Effects & Transitions -------------------------------------
  const effectsHook = useClipEffects(updateTracks, trackMgmt.updateClip);

  // -- Refs ----------------------------------------------------------------
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const timelineRef = useRef<HTMLDivElement | null>(null);

  // Keep playhead in a valid range when duration changes.
  useEffect(() => {
    const clamped = clampTime(playbackState.currentTime, trackState.duration);
    if (clamped === playbackState.currentTime) {
      return;
    }

    setPlaybackState((prev) => ({ ...prev, currentTime: clamped }));
    onPlaybackChange?.(playbackState.isPlaying, clamped);
  }, [playbackState.currentTime, playbackState.isPlaying, trackState.duration, onPlaybackChange]);

  // Commit track/clip/effect/transition mutations through the store pipeline.
  useEffect(() => {
    if (!enableUnifiedTimelineMutation) {
      return;
    }

    if (trackState.mutationRevision === 0) {
      return;
    }

    if (trackState.mutationRevision === committedMutationRevisionRef.current) {
      return;
    }

    committedMutationRevisionRef.current = trackState.mutationRevision;

    const action = trackState.lastMutationAction ?? 'timeline:tracks';
    if (action === 'history:apply') {
      return;
    }

    const currentTime = clampTime(playbackState.currentTime, trackState.duration);

    commitStoreTimelineMutation({
      action,
      tracks: trackState.tracks,
      duration: trackState.duration,
      selectedClipIds: trackState.selectedClipIds,
      selectedTrackId: trackState.selectedTrackId,
      currentTime,
      markers: timelineData.markers,
      layers: timelineData.layers,
      subtitleBindings: timelineData.subtitleBindings,
      audioMix: timelineData.audioMix,
    });
  }, [
    enableUnifiedTimelineMutation,
    trackState.mutationRevision,
    trackState.lastMutationAction,
    trackState.tracks,
    trackState.duration,
    trackState.selectedClipIds,
    trackState.selectedTrackId,
    playbackState.currentTime,
    timelineData,
    commitStoreTimelineMutation,
  ]);

  // -- Timeline zoom --------------------------------------------------------

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
    const zoom = containerWidth / (trackState.duration * 100);
    setPlaybackState((prev) => ({ ...prev, zoom: Math.max(0.1, Math.min(10, zoom)) }));
  }, [trackState.duration]);

  const commitTimelineMutation = useCallback(
    (input: CommitTimelineMutationOptions) => {
      const currentTimeline = timelineDataRef.current;
      const nextTimeline = {
        markers: input.markers ?? currentTimeline.markers,
        layers: input.layers ?? currentTimeline.layers,
        subtitleBindings: input.subtitleBindings ?? currentTimeline.subtitleBindings,
        audioMix: input.audioMix ?? currentTimeline.audioMix,
      };

      if (
        input.markers ||
        input.layers ||
        input.subtitleBindings ||
        input.audioMix
      ) {
        setTimelineDataState(nextTimeline);
      }

      const selection = sanitizeSelection(
        trackState.tracks,
        input.selectedClipIds ?? trackState.selectedClipIds,
        input.selectedTrackId ?? trackState.selectedTrackId
      );
      const nextCurrentTime = clampTime(
        input.currentTime ?? playbackState.currentTime,
        trackState.duration
      );

      if (
        selection.selectedClipIds !== trackState.selectedClipIds ||
        selection.selectedTrackId !== trackState.selectedTrackId
      ) {
        setTrackState((prev) => ({
          ...prev,
          selectedClipIds: selection.selectedClipIds,
          selectedTrackId: selection.selectedTrackId,
        }));
      }

      if (nextCurrentTime !== playbackState.currentTime) {
        setPlaybackState((prev) => ({ ...prev, currentTime: nextCurrentTime }));
        onPlaybackChange?.(playbackState.isPlaying, nextCurrentTime);
      }

      if (input.pushHistory === false || !enableUnifiedTimelineMutation) {
        return;
      }

      commitStoreTimelineMutation({
        action: input.action,
        tracks: trackState.tracks,
        duration: trackState.duration,
        selectedClipIds: selection.selectedClipIds,
        selectedTrackId: selection.selectedTrackId,
        currentTime: nextCurrentTime,
        markers: nextTimeline.markers,
        layers: nextTimeline.layers,
        subtitleBindings: nextTimeline.subtitleBindings,
        audioMix: nextTimeline.audioMix,
      });
    },
    [
      trackState.tracks,
      trackState.duration,
      trackState.selectedClipIds,
      trackState.selectedTrackId,
      playbackState.currentTime,
      playbackState.isPlaying,
      onPlaybackChange,
      setTrackState,
      setTimelineDataState,
      commitStoreTimelineMutation,
      enableUnifiedTimelineMutation,
    ]
  );

  const setTimelineMarkers = useCallback(
    (markers: TimelineMarker[]) => {
      commitTimelineMutation({ action: 'timeline:markers', markers });
    },
    [commitTimelineMutation]
  );

  const setTimelineLayers = useCallback(
    (layers: TimelineLayer[]) => {
      commitTimelineMutation({ action: 'timeline:layers', layers });
    },
    [commitTimelineMutation]
  );

  const setSubtitleBindings = useCallback(
    (subtitleBindings: SubtitleTrackBinding[]) => {
      commitTimelineMutation({ action: 'timeline:subtitle-bindings', subtitleBindings });
    },
    [commitTimelineMutation]
  );

  const setAudioMixTracks = useCallback(
    (audioMix: AudioMixTrack[]) => {
      commitTimelineMutation({ action: 'timeline:audio-mix', audioMix });
    },
    [commitTimelineMutation]
  );

  const applyHistorySnapshot = useCallback(
    (snapshot: HistorySnapshot) => {
      const selection = sanitizeSelection(
        snapshot.tracks,
        snapshot.selectedClipIds,
        snapshot.selectedTrackId
      );
      const nextCurrentTime = clampTime(snapshot.currentTime, snapshot.duration);

      setTrackState((prev) => ({
        ...prev,
        tracks: structuredClone(snapshot.tracks),
        duration: snapshot.duration,
        selectedClipIds: selection.selectedClipIds,
        selectedTrackId: selection.selectedTrackId,
        mutationRevision: prev.mutationRevision + 1,
        lastMutationAction: 'history:apply',
      }));
      setPlaybackState((prev) => ({
        ...prev,
        isPlaying: false,
        currentTime: nextCurrentTime,
      }));
      setTimelineDataState({
        markers: structuredClone(snapshot.markers),
        layers: structuredClone(snapshot.layers),
        subtitleBindings: structuredClone(snapshot.subtitleBindings),
        audioMix: structuredClone(snapshot.audioMix),
      });
      onClipChange?.(snapshot.tracks.flatMap((track) => track.clips));
      onPlaybackChange?.(false, nextCurrentTime);
    },
    [onClipChange, onPlaybackChange, setTrackState, setTimelineDataState]
  );

  // -- Export ---------------------------------------------------------------

  const setError = useCallback(
    (error: string) => {
      setTrackState((prev) => ({ ...prev, error }));
      onError?.(error);
    },
    [onError, setTrackState]
  );

  const runExport = useCallback(
    async (exportOpts: VideoExportOptions): Promise<Blob | null> => {
      if (activeExportControllerRef.current) {
        return null;
      }

      const allClips = trackState.tracks.flatMap((track) => track.clips);
      if (allClips.length === 0) {
        const progress: VideoRenderProgress = {
          phase: 'error',
          percent: 0,
          message: 'No clips to export',
        };
        exportOpts.onProgress?.(progress);
        setExportState({
          phase: 'error',
          progress,
          errorCode: 'no-clips',
          errorMessage: 'No clips to export',
          retryable: false,
        });
        setError('No clips to export');
        return null;
      }

      const controller = new AbortController();
      activeExportControllerRef.current = controller;
      lastExportOptionsRef.current = exportOpts;

      setTrackState((prev) => ({ ...prev, isProcessing: true, error: null }));
      setExportState({
        phase: 'running',
        progress: { phase: 'preparing', percent: 0, message: 'Starting export...' },
        retryable: false,
      });

      try {
        const context: VideoRenderContext = {
          duration: trackState.duration,
          tracks: trackState.tracks,
          markers: timelineData.markers,
          layers: timelineData.layers,
          subtitleBindings: timelineData.subtitleBindings,
          audioMix: timelineData.audioMix,
        };

        const renderOptions: VideoRenderExportOptions = {
          format: exportOpts.format,
          resolution: exportOpts.resolution,
          fps: exportOpts.fps,
          quality: exportOpts.quality,
          codec: exportOpts.codec,
          audioBitrate: exportOpts.audioBitrate,
          videoBitrate: exportOpts.videoBitrate,
          includeSubtitles: exportOpts.includeSubtitles,
          subtitleMode: exportOpts.subtitleMode,
          subtitleTracks: exportOpts.subtitleTracks,
          destinationPath: exportOpts.destinationPath,
          overwrite: exportOpts.overwrite,
          signal: controller.signal,
          onProgress: (progress: VideoRenderProgress) => {
            setExportState((prev) => ({
              ...prev,
              phase: progress.phase === 'error' ? 'error' : 'running',
              progress,
            }));
            exportOpts.onProgress?.(progress);
          },
        };

        const blob = await renderServiceRef.current.exportTimeline(context, renderOptions);

        const completeProgress: VideoRenderProgress = {
          phase: 'complete',
          percent: 100,
          message: 'Export complete',
        };

        setExportState({
          phase: 'success',
          progress: completeProgress,
          retryable: false,
        });
        exportOpts.onProgress?.(completeProgress);

        loggers.media.info('Video exported', {
          format: exportOpts.format,
          resolution: exportOpts.resolution,
          duration: trackState.duration,
        });

        return blob;
      } catch (error) {
        const normalizedError = normalizeVideoRenderError(error);
        const errorProgress: VideoRenderProgress = {
          phase: 'error',
          percent: 0,
          message: normalizedError.message,
        };

        exportOpts.onProgress?.(errorProgress);

        if (normalizedError.code === 'cancelled') {
          setExportState({
            phase: 'cancelled',
            progress: {
              phase: 'error',
              percent: 0,
              message: normalizedError.message,
            },
            errorCode: normalizedError.code,
            errorMessage: normalizedError.message,
            retryable: true,
          });
          return null;
        }

        setExportState({
          phase: 'error',
          progress: errorProgress,
          errorCode: normalizedError.code,
          errorMessage: normalizedError.message,
          retryable: true,
        });
        setError(normalizedError.message);
        return null;
      } finally {
        if (activeExportControllerRef.current === controller) {
          activeExportControllerRef.current = null;
        }
        setTrackState((prev) => ({ ...prev, isProcessing: false }));
      }
    },
    [setError, setTrackState, timelineData, trackState.duration, trackState.tracks]
  );

  const exportVideo = useCallback(
    async (exportOpts: VideoExportOptions): Promise<Blob | null> => {
      return runExport(exportOpts);
    },
    [runExport]
  );

  const retryExport = useCallback(async (): Promise<Blob | null> => {
    if (!lastExportOptionsRef.current) {
      return null;
    }
    return runExport(lastExportOptionsRef.current);
  }, [runExport]);

  const cancelExport = useCallback(async (): Promise<void> => {
    const controller = activeExportControllerRef.current;
    if (!controller) {
      return;
    }

    controller.abort();
    setExportState({
      phase: 'cancelled',
      progress: {
        phase: 'error',
        percent: 0,
        message: 'Export cancelled',
      },
      errorCode: 'cancelled',
      errorMessage: 'Export cancelled',
      retryable: true,
    });
    setTrackState((prev) => ({ ...prev, isProcessing: false }));
  }, [setTrackState]);

  const generatePreview = useCallback(async (): Promise<string | null> => {
    try {
      const context: VideoRenderContext = {
        duration: trackState.duration,
        tracks: trackState.tracks,
        markers: timelineData.markers,
        layers: timelineData.layers,
        subtitleBindings: timelineData.subtitleBindings,
        audioMix: timelineData.audioMix,
      };
      const preview = await renderServiceRef.current.generatePreviewFrame(
        context,
        playbackState.currentTime
      );
      if (preview) {
        setPlaybackState((prev) => ({ ...prev, previewUrl: preview }));
      }
      return preview;
    } catch {
      return playbackState.previewUrl;
    }
  }, [
    playbackState.currentTime,
    playbackState.previewUrl,
    timelineData,
    trackState.duration,
    trackState.tracks,
  ]);

  // -- Utilities ------------------------------------------------------------

  const setTracks = useCallback(
    (tracks: VideoTrack[], duration?: number) => {
      const nextDuration = duration ?? trackMgmt.calculateDuration(tracks);
      const selection = sanitizeSelection(
        tracks,
        trackState.selectedClipIds,
        trackState.selectedTrackId
      );
      const nextCurrentTime = clampTime(playbackState.currentTime, nextDuration);

      setTrackState((prev) => ({
        ...prev,
        tracks,
        duration: nextDuration,
        selectedClipIds: selection.selectedClipIds,
        selectedTrackId: selection.selectedTrackId,
        mutationRevision: prev.mutationRevision + 1,
        lastMutationAction: 'history:apply',
      }));
      setPlaybackState((prev) => ({ ...prev, currentTime: nextCurrentTime }));
      onClipChange?.(tracks.flatMap((track) => track.clips));
      onPlaybackChange?.(playbackState.isPlaying, nextCurrentTime);
    },
    [
      trackMgmt,
      trackState.selectedClipIds,
      trackState.selectedTrackId,
      playbackState.currentTime,
      playbackState.isPlaying,
      onClipChange,
      onPlaybackChange,
      setTrackState,
    ]
  );

  // -- Reset ----------------------------------------------------------------

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
      mutationRevision: 0,
      lastMutationAction: null,
    });
    setPlaybackState({
      isPlaying: false,
      currentTime: 0,
      zoom: 1,
      previewUrl: null,
    });
    setTimelineDataState({
      markers: [],
      layers: [],
      subtitleBindings: [],
      audioMix: [],
    });
    setExportState({ phase: 'idle', progress: null, retryable: false });
    activeExportControllerRef.current = null;
    lastExportOptionsRef.current = null;
  }, [pausePlayback, setTrackState, setTimelineDataState]);

  // -- Return unified interface --------------------------------------------

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
    setEffectEnabled: effectsHook.setEffectEnabled,
    reorderEffects: effectsHook.reorderEffects,
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
    timeline: timelineData,
    setTimelineMarkers,
    setTimelineLayers,
    setSubtitleBindings,
    setAudioMixTracks,
    commitTimelineMutation,
    applyHistorySnapshot,

    // Export
    exportVideo,
    retryExport,
    cancelExport,
    exportState,
    generatePreview,

    // Utilities
    getClipAtTime: trackMgmt.getClipAtTime,
    getTracksWithClipsAtTime: trackMgmt.getTracksWithClipsAtTime,
    getDuration: trackMgmt.getDuration,
    setTracks,
    reset,

    // Refs
    videoRef,
    timelineRef,
  };
}

export default useVideoEditor;
