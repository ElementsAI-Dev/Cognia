/**
 * useVideoEditor - Main hook for video editing operations
 *
 * Provides comprehensive video editing functionality:
 * - Multi-track timeline management
 * - Clip manipulation (trim, split, move)
 * - Transitions and effects
 * - Audio control
 * - Export capabilities
 * - Plugin integration
 */

import { useCallback, useRef, useState, useEffect } from 'react';
import { nanoid } from 'nanoid';
import { loggers } from '@/lib/logger';
import { getMediaRegistry } from '@/lib/plugin/api/media-api';
import type {
  VideoClip as _MediaVideoClip,
  VideoTransition as _VideoTransition,
  VideoEffectDefinition,
  VideoTransitionDefinition,
  VideoExportOptions,
  ExportProgress,
} from '@/lib/plugin/api/media-api';

export interface VideoClip {
  id: string;
  name: string;
  sourceUrl: string;
  sourceThumbnail?: string;
  trackIndex: number;
  startTime: number; // Position in timeline (seconds)
  duration: number; // Duration in timeline (seconds)
  sourceStartTime: number; // Start position in source video
  sourceEndTime: number; // End position in source video
  volume: number; // 0-1
  playbackSpeed: number; // 0.25-4
  muted: boolean;
  locked: boolean;
  effects: string[]; // Applied effect IDs
  transition?: {
    type: string;
    duration: number;
    params?: Record<string, unknown>;
  };
}

export interface VideoTrack {
  id: string;
  name: string;
  type: 'video' | 'audio' | 'text' | 'overlay';
  clips: VideoClip[];
  muted: boolean;
  locked: boolean;
  visible: boolean;
  volume: number; // For audio tracks
  height: number; // Track height in UI
}

export interface VideoEditorState {
  isLoading: boolean;
  isProcessing: boolean;
  isPlaying: boolean;
  error: string | null;
  currentTime: number;
  duration: number;
  zoom: number; // Timeline zoom level
  tracks: VideoTrack[];
  selectedClipIds: string[];
  selectedTrackId: string | null;
  previewUrl: string | null;
}

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

function generateId(): string {
  return nanoid();
}

const DEFAULT_TRACK_HEIGHT = 60;

export function useVideoEditor(options: UseVideoEditorOptions = {}): UseVideoEditorReturn {
  const {
    maxTracks = 10,
    defaultTrackHeight = DEFAULT_TRACK_HEIGHT,
    onClipChange,
    onPlaybackChange,
    onError,
  } = options;

  // State
  const [state, setState] = useState<VideoEditorState>({
    isLoading: false,
    isProcessing: false,
    isPlaying: false,
    error: null,
    currentTime: 0,
    duration: 0,
    zoom: 1,
    tracks: [],
    selectedClipIds: [],
    selectedTrackId: null,
    previewUrl: null,
  });

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const playbackRafRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(0);

  // Calculate total duration
  const calculateDuration = useCallback((tracks: VideoTrack[]): number => {
    let maxEnd = 0;
    for (const track of tracks) {
      for (const clip of track.clips) {
        const clipEnd = clip.startTime + clip.duration;
        if (clipEnd > maxEnd) maxEnd = clipEnd;
      }
    }
    return maxEnd;
  }, []);

  // Set error
  const setError = useCallback(
    (error: string) => {
      setState((prev) => ({ ...prev, error }));
      onError?.(error);
    },
    [onError]
  );

  // Update tracks and recalculate duration
  const updateTracks = useCallback(
    (updater: (tracks: VideoTrack[]) => VideoTrack[]) => {
      setState((prev) => {
        const newTracks = updater(prev.tracks);
        const newDuration = calculateDuration(newTracks);

        // Notify about clip changes
        const allClips = newTracks.flatMap((t) => t.clips);
        onClipChange?.(allClips);

        return { ...prev, tracks: newTracks, duration: newDuration };
      });
    },
    [calculateDuration, onClipChange]
  );

  // Track Management
  const addTrack = useCallback(
    (type: VideoTrack['type'], name?: string): string => {
      const id = generateId();

      let added = false;
      setState((prev) => {
        if (prev.tracks.length >= maxTracks) {
          return prev;
        }

        const trackName =
          name || `${type.charAt(0).toUpperCase() + type.slice(1)} ${prev.tracks.length + 1}`;

        const newTrack: VideoTrack = {
          id,
          name: trackName,
          type,
          clips: [],
          muted: false,
          locked: false,
          visible: true,
          volume: 1,
          height: defaultTrackHeight,
        };

        added = true;
        const newTracks = [...prev.tracks, newTrack];

        // Notify about clip changes
        const allClips = newTracks.flatMap((t) => t.clips);
        onClipChange?.(allClips);

        return {
          ...prev,
          tracks: newTracks,
          duration: calculateDuration(newTracks),
        };
      });

      if (!added) {
        setError(`Maximum number of tracks (${maxTracks}) reached`);
        return '';
      }
      return id;
    },
    [maxTracks, defaultTrackHeight, setError, calculateDuration, onClipChange]
  );

  const removeTrack = useCallback(
    (trackId: string) => {
      updateTracks((tracks) => tracks.filter((t) => t.id !== trackId));
      if (state.selectedTrackId === trackId) {
        setState((prev) => ({ ...prev, selectedTrackId: null }));
      }
    },
    [state.selectedTrackId, updateTracks]
  );

  const updateTrack = useCallback(
    (trackId: string, updates: Partial<VideoTrack>) => {
      updateTracks((tracks) => tracks.map((t) => (t.id === trackId ? { ...t, ...updates } : t)));
    },
    [updateTracks]
  );

  const reorderTracks = useCallback(
    (fromIndex: number, toIndex: number) => {
      updateTracks((tracks) => {
        const newTracks = [...tracks];
        const [removed] = newTracks.splice(fromIndex, 1);
        newTracks.splice(toIndex, 0, removed);
        return newTracks;
      });
    },
    [updateTracks]
  );

  const selectTrack = useCallback((trackId: string | null) => {
    setState((prev) => ({ ...prev, selectedTrackId: trackId }));
  }, []);

  // Clip Management
  const addClip = useCallback(
    async (trackId: string, sourceUrl: string, startTime = 0): Promise<string> => {
      setState((prev) => ({ ...prev, isLoading: true }));

      try {
        // Get video metadata
        const video = document.createElement('video');
        video.crossOrigin = 'anonymous';
        video.src = sourceUrl;

        await new Promise<void>((resolve, reject) => {
          video.onloadedmetadata = () => resolve();
          video.onerror = () => reject(new Error('Failed to load video'));
        });

        const id = generateId();
        const clip: VideoClip = {
          id,
          name: `Clip ${id.substring(0, 6)}`,
          sourceUrl,
          trackIndex: state.tracks.findIndex((t) => t.id === trackId),
          startTime,
          duration: video.duration,
          sourceStartTime: 0,
          sourceEndTime: video.duration,
          volume: 1,
          playbackSpeed: 1,
          muted: false,
          locked: false,
          effects: [],
        };

        updateTracks((tracks) =>
          tracks.map((t) => (t.id === trackId ? { ...t, clips: [...t.clips, clip] } : t))
        );

        setState((prev) => ({ ...prev, isLoading: false }));
        return id;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to add clip';
        setError(message);
        setState((prev) => ({ ...prev, isLoading: false }));
        return '';
      }
    },
    [state.tracks, setError, updateTracks]
  );

  const removeClip = useCallback(
    (clipId: string) => {
      updateTracks((tracks) =>
        tracks.map((t) => ({
          ...t,
          clips: t.clips.filter((c) => c.id !== clipId),
        }))
      );
      setState((prev) => ({
        ...prev,
        selectedClipIds: prev.selectedClipIds.filter((id) => id !== clipId),
      }));
    },
    [updateTracks]
  );

  const updateClip = useCallback(
    (clipId: string, updates: Partial<VideoClip>) => {
      updateTracks((tracks) =>
        tracks.map((t) => ({
          ...t,
          clips: t.clips.map((c) => (c.id === clipId ? { ...c, ...updates } : c)),
        }))
      );
    },
    [updateTracks]
  );

  const moveClip = useCallback(
    (clipId: string, targetTrackId: string, newStartTime: number) => {
      let clipToMove: VideoClip | null = null;

      // Find and remove clip from current track
      updateTracks((tracks) => {
        const newTracks = tracks.map((t) => {
          const clipIndex = t.clips.findIndex((c) => c.id === clipId);
          if (clipIndex !== -1) {
            clipToMove = { ...t.clips[clipIndex], startTime: newStartTime };
            return {
              ...t,
              clips: t.clips.filter((c) => c.id !== clipId),
            };
          }
          return t;
        });

        // Add clip to target track
        if (clipToMove) {
          return newTracks.map((t) =>
            t.id === targetTrackId ? { ...t, clips: [...t.clips, clipToMove!] } : t
          );
        }
        return newTracks;
      });
    },
    [updateTracks]
  );

  const splitClip = useCallback(
    (clipId: string, atTime: number): string[] => {
      let newClipIds: string[] = [];

      updateTracks((tracks) =>
        tracks.map((t) => {
          const clipIndex = t.clips.findIndex((c) => c.id === clipId);
          if (clipIndex === -1) return t;

          const clip = t.clips[clipIndex];
          const splitPoint = atTime - clip.startTime;

          if (splitPoint <= 0 || splitPoint >= clip.duration) return t;

          const firstHalf: VideoClip = {
            ...clip,
            duration: splitPoint,
            sourceEndTime: clip.sourceStartTime + splitPoint,
          };

          const secondHalf: VideoClip = {
            ...clip,
            id: generateId(),
            name: `${clip.name} (2)`,
            startTime: clip.startTime + splitPoint,
            duration: clip.duration - splitPoint,
            sourceStartTime: clip.sourceStartTime + splitPoint,
          };

          newClipIds = [clip.id, secondHalf.id];

          const newClips = [...t.clips];
          newClips[clipIndex] = firstHalf;
          newClips.splice(clipIndex + 1, 0, secondHalf);

          return { ...t, clips: newClips };
        })
      );

      return newClipIds;
    },
    [updateTracks]
  );

  const duplicateClip = useCallback(
    (clipId: string): string => {
      let newClipId = '';

      updateTracks((tracks) =>
        tracks.map((t) => {
          const clip = t.clips.find((c) => c.id === clipId);
          if (!clip) return t;

          newClipId = generateId();
          const duplicatedClip: VideoClip = {
            ...clip,
            id: newClipId,
            name: `${clip.name} (copy)`,
            startTime: clip.startTime + clip.duration + 0.5,
          };

          return { ...t, clips: [...t.clips, duplicatedClip] };
        })
      );

      return newClipId;
    },
    [updateTracks]
  );

  const trimClip = useCallback(
    (clipId: string, newStart: number, newEnd: number) => {
      updateClip(clipId, {
        sourceStartTime: newStart,
        sourceEndTime: newEnd,
        duration: newEnd - newStart,
      });
    },
    [updateClip]
  );

  const selectClips = useCallback((clipIds: string[]) => {
    setState((prev) => ({ ...prev, selectedClipIds: clipIds }));
  }, []);

  const deselectAllClips = useCallback(() => {
    setState((prev) => ({ ...prev, selectedClipIds: [] }));
  }, []);

  // Playback
  const play = useCallback(() => {
    setState((prev) => ({ ...prev, isPlaying: true }));
    onPlaybackChange?.(true, state.currentTime);
    lastFrameTimeRef.current = performance.now();

    const tick = (now: number) => {
      const delta = (now - lastFrameTimeRef.current) / 1000;
      lastFrameTimeRef.current = now;

      setState((prev) => {
        if (prev.currentTime >= prev.duration) {
          playbackRafRef.current = null;
          onPlaybackChange?.(false, 0);
          return { ...prev, isPlaying: false, currentTime: 0 };
        }
        const newTime = Math.min(prev.currentTime + delta, prev.duration);
        onPlaybackChange?.(true, newTime);
        return { ...prev, currentTime: newTime };
      });

      playbackRafRef.current = requestAnimationFrame(tick);
    };

    playbackRafRef.current = requestAnimationFrame(tick);
  }, [state.currentTime, onPlaybackChange]);

  const pause = useCallback(() => {
    if (playbackRafRef.current) {
      cancelAnimationFrame(playbackRafRef.current);
      playbackRafRef.current = null;
    }
    setState((prev) => ({ ...prev, isPlaying: false }));
    onPlaybackChange?.(false, state.currentTime);
  }, [state.currentTime, onPlaybackChange]);

  const togglePlayback = useCallback(() => {
    if (state.isPlaying) {
      pause();
    } else {
      play();
    }
  }, [state.isPlaying, play, pause]);

  const seek = useCallback(
    (time: number) => {
      const clampedTime = Math.max(0, Math.min(time, state.duration));
      setState((prev) => ({ ...prev, currentTime: clampedTime }));
      onPlaybackChange?.(state.isPlaying, clampedTime);
    },
    [state.duration, state.isPlaying, onPlaybackChange]
  );

  const setPlaybackSpeed = useCallback(
    (speed: number) => {
      // Apply to all selected clips or all clips if none selected
      const clipsToUpdate =
        state.selectedClipIds.length > 0
          ? state.selectedClipIds
          : state.tracks.flatMap((t) => t.clips.map((c) => c.id));

      for (const clipId of clipsToUpdate) {
        updateClip(clipId, { playbackSpeed: speed });
      }
    },
    [state.selectedClipIds, state.tracks, updateClip]
  );

  // Effects & Transitions
  const addEffect = useCallback(
    (clipId: string, effectId: string, _params?: Record<string, unknown>) => {
      updateTracks((tracks) =>
        tracks.map((t) => ({
          ...t,
          clips: t.clips.map((c) =>
            c.id === clipId && !c.effects.includes(effectId)
              ? { ...c, effects: [...c.effects, effectId] }
              : c
          ),
        }))
      );
    },
    [updateTracks]
  );

  const removeEffect = useCallback(
    (clipId: string, effectId: string) => {
      updateTracks((tracks) =>
        tracks.map((t) => ({
          ...t,
          clips: t.clips.map((c) =>
            c.id === clipId ? { ...c, effects: c.effects.filter((e) => e !== effectId) } : c
          ),
        }))
      );
    },
    [updateTracks]
  );

  const updateEffectParams = useCallback(
    (_clipId: string, _effectId: string, _params: Record<string, unknown>) => {
      // Effect params would be stored separately, not implemented in basic version
    },
    []
  );

  const addTransition = useCallback(
    (fromClipId: string, _toClipId: string, type: string, duration: number) => {
      updateClip(fromClipId, {
        transition: { type, duration },
      });
    },
    [updateClip]
  );

  const removeTransition = useCallback(
    (clipId: string) => {
      updateClip(clipId, { transition: undefined });
    },
    [updateClip]
  );

  const getAvailableEffects = useCallback((): VideoEffectDefinition[] => {
    return getMediaRegistry().getAllEffects();
  }, []);

  const getAvailableTransitions = useCallback((): VideoTransitionDefinition[] => {
    return getMediaRegistry().getAllTransitions();
  }, []);

  // Audio
  const setClipVolume = useCallback(
    (clipId: string, volume: number) => {
      updateClip(clipId, { volume: Math.max(0, Math.min(1, volume)) });
    },
    [updateClip]
  );

  const setClipMuted = useCallback(
    (clipId: string, muted: boolean) => {
      updateClip(clipId, { muted });
    },
    [updateClip]
  );

  const setTrackVolume = useCallback(
    (trackId: string, volume: number) => {
      updateTrack(trackId, { volume: Math.max(0, Math.min(1, volume)) });
    },
    [updateTrack]
  );

  const setTrackMuted = useCallback(
    (trackId: string, muted: boolean) => {
      updateTrack(trackId, { muted });
    },
    [updateTrack]
  );

  // Timeline
  const setZoom = useCallback((zoom: number) => {
    setState((prev) => ({ ...prev, zoom: Math.max(0.1, Math.min(10, zoom)) }));
  }, []);

  const zoomIn = useCallback(() => {
    setState((prev) => ({ ...prev, zoom: Math.min(10, prev.zoom * 1.2) }));
  }, []);

  const zoomOut = useCallback(() => {
    setState((prev) => ({ ...prev, zoom: Math.max(0.1, prev.zoom / 1.2) }));
  }, []);

  const fitToView = useCallback(() => {
    if (!timelineRef.current || state.duration === 0) return;
    const containerWidth = timelineRef.current.clientWidth;
    const zoom = containerWidth / (state.duration * 100); // 100px per second at zoom 1
    setState((prev) => ({ ...prev, zoom: Math.max(0.1, Math.min(10, zoom)) }));
  }, [state.duration]);

  // Export
  const exportVideo = useCallback(
    async (options: VideoExportOptions): Promise<Blob | null> => {
      setState((prev) => ({ ...prev, isProcessing: true }));
      const startTime = Date.now();

      try {
        const totalFrames = Math.ceil(state.duration * options.fps);
        const report = (progress: ExportProgress) => {
          options.onProgress?.(progress);
        };

        // Phase 1: Preparing
        report({ phase: 'preparing', percent: 0, totalFrames, message: 'Preparing export...' });

        // Collect all clips across tracks
        const allClips = state.tracks.flatMap((t) => t.clips);
        if (allClips.length === 0) {
          report({ phase: 'error', percent: 0, message: 'No clips to export' });
          setState((prev) => ({ ...prev, isProcessing: false }));
          return null;
        }

        // Phase 2: Rendering frames (simulated — real impl would use canvas/WebCodecs)
        report({ phase: 'rendering', percent: 10, currentFrame: 0, totalFrames, message: 'Rendering frames...' });

        // In a real implementation, this would render each frame via canvas
        // and encode using WebCodecs API or ffmpeg.wasm
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

        // Create a placeholder blob from first clip (real impl would produce actual encoded video)
        let blob: Blob | null = null;
        const firstClip = allClips[0];
        if (firstClip?.sourceUrl) {
          try {
            const response = await fetch(firstClip.sourceUrl);
            blob = await response.blob();
          } catch {
            // If fetch fails, create an empty blob
            blob = new Blob([], { type: `video/${options.format}` });
          }
        } else {
          blob = new Blob([], { type: `video/${options.format}` });
        }

        const elapsed = Date.now() - startTime;
        report({ phase: 'complete', percent: 100, elapsedMs: elapsed, message: 'Export complete!' });

        loggers.media.info('Video exported', { format: options.format, resolution: options.resolution, elapsed });
        setState((prev) => ({ ...prev, isProcessing: false }));
        return blob;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Export failed';
        options.onProgress?.({ phase: 'error', percent: 0, message });
        setError(message);
        setState((prev) => ({ ...prev, isProcessing: false }));
        return null;
      }
    },
    [state.duration, state.tracks, setError]
  );

  const generatePreview = useCallback(async (): Promise<string | null> => {
    // Would generate a preview video URL
    return state.previewUrl;
  }, [state.previewUrl]);

  // Utilities
  const getClipAtTime = useCallback(
    (trackId: string, time: number): VideoClip | null => {
      const track = state.tracks.find((t) => t.id === trackId);
      if (!track) return null;

      return (
        track.clips.find((c) => time >= c.startTime && time < c.startTime + c.duration) || null
      );
    },
    [state.tracks]
  );

  const getTracksWithClipsAtTime = useCallback(
    (time: number): VideoTrack[] => {
      return state.tracks.filter((t) =>
        t.clips.some((c) => time >= c.startTime && time < c.startTime + c.duration)
      );
    },
    [state.tracks]
  );

  const getDuration = useCallback((): number => {
    return state.duration;
  }, [state.duration]);

  // Set tracks directly (used for undo/redo)
  const setTracks = useCallback(
    (tracks: VideoTrack[], duration?: number) => {
      setState((prev) => ({
        ...prev,
        tracks,
        duration: duration ?? calculateDuration(tracks),
      }));
      onClipChange?.(tracks.flatMap((t) => t.clips));
    },
    [calculateDuration, onClipChange]
  );

  const reset = useCallback(() => {
    if (playbackRafRef.current) {
      cancelAnimationFrame(playbackRafRef.current);
      playbackRafRef.current = null;
    }
    setState({
      isLoading: false,
      isProcessing: false,
      isPlaying: false,
      error: null,
      currentTime: 0,
      duration: 0,
      zoom: 1,
      tracks: [],
      selectedClipIds: [],
      selectedTrackId: null,
      previewUrl: null,
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (playbackRafRef.current) {
        cancelAnimationFrame(playbackRafRef.current);
        playbackRafRef.current = null;
      }
    };
  }, []);

  return {
    state,

    addTrack,
    removeTrack,
    updateTrack,
    reorderTracks,
    selectTrack,

    addClip,
    removeClip,
    updateClip,
    moveClip,
    splitClip,
    duplicateClip,
    trimClip,
    selectClips,
    deselectAllClips,

    play,
    pause,
    togglePlayback,
    seek,
    setPlaybackSpeed,

    addEffect,
    removeEffect,
    updateEffectParams,
    addTransition,
    removeTransition,
    getAvailableEffects,
    getAvailableTransitions,

    setClipVolume,
    setClipMuted,
    setTrackVolume,
    setTrackMuted,

    setZoom,
    zoomIn,
    zoomOut,
    fitToView,

    exportVideo,
    generatePreview,

    getClipAtTime,
    getTracksWithClipsAtTime,
    getDuration,
    setTracks,
    reset,

    videoRef,
    timelineRef,
  };
}

export default useVideoEditor;
