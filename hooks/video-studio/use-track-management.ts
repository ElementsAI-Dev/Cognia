/**
 * useTrackManagement - Track & clip CRUD operations for video editing
 *
 * Extracted from useVideoEditor to manage:
 * - Track CRUD (add, remove, update, reorder, select)
 * - Clip CRUD (add, remove, update, move, split, duplicate, trim, select)
 * - Audio state (volume, mute for clips and tracks)
 * - Utility queries (getClipAtTime, getTracksWithClipsAtTime, getDuration, setTracks)
 */

import { useCallback, useState } from 'react';
import { nanoid } from 'nanoid';
import type { VideoClip, VideoTrack } from '@/types/video-studio/types';

function generateId(): string {
  return nanoid();
}

const DEFAULT_TRACK_HEIGHT = 60;

export interface UseTrackManagementOptions {
  maxTracks?: number;
  defaultTrackHeight?: number;
  onClipChange?: (clips: VideoClip[]) => void;
  onError?: (error: string) => void;
}

/** Track-related state exposed to the composition hook */
export interface TrackState {
  isLoading: boolean;
  isProcessing: boolean;
  error: string | null;
  tracks: VideoTrack[];
  duration: number;
  selectedClipIds: string[];
  selectedTrackId: string | null;
}

export interface UseTrackManagementReturn {
  // State
  trackState: TrackState;
  setTrackState: React.Dispatch<React.SetStateAction<TrackState>>;

  // Internal helpers (needed by composition hook)
  calculateDuration: (tracks: VideoTrack[]) => number;
  updateTracks: (updater: (tracks: VideoTrack[]) => VideoTrack[]) => void;

  // Track operations
  addTrack: (type: VideoTrack['type'], name?: string) => string;
  removeTrack: (trackId: string) => void;
  updateTrack: (trackId: string, updates: Partial<VideoTrack>) => void;
  reorderTracks: (fromIndex: number, toIndex: number) => void;
  selectTrack: (trackId: string | null) => void;

  // Clip operations
  addClip: (trackId: string, sourceUrl: string, startTime?: number) => Promise<string>;
  removeClip: (clipId: string) => void;
  updateClip: (clipId: string, updates: Partial<VideoClip>) => void;
  moveClip: (clipId: string, targetTrackId: string, newStartTime: number) => void;
  splitClip: (clipId: string, atTime: number) => string[];
  duplicateClip: (clipId: string) => string;
  trimClip: (clipId: string, newStart: number, newEnd: number) => void;
  selectClips: (clipIds: string[]) => void;
  deselectAllClips: () => void;

  // Audio
  setClipVolume: (clipId: string, volume: number) => void;
  setClipMuted: (clipId: string, muted: boolean) => void;
  setTrackVolume: (trackId: string, volume: number) => void;
  setTrackMuted: (trackId: string, muted: boolean) => void;

  // Utilities
  getClipAtTime: (trackId: string, time: number) => VideoClip | null;
  getTracksWithClipsAtTime: (time: number) => VideoTrack[];
  getDuration: () => number;
  setTracks: (tracks: VideoTrack[], duration?: number) => void;
}

export function useTrackManagement(
  options: UseTrackManagementOptions = {}
): UseTrackManagementReturn {
  const {
    maxTracks = 10,
    defaultTrackHeight = DEFAULT_TRACK_HEIGHT,
    onClipChange,
    onError,
  } = options;

  const [trackState, setTrackState] = useState<TrackState>({
    isLoading: false,
    isProcessing: false,
    error: null,
    tracks: [],
    duration: 0,
    selectedClipIds: [],
    selectedTrackId: null,
  });

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
      setTrackState((prev) => ({ ...prev, error }));
      onError?.(error);
    },
    [onError]
  );

  // Update tracks and recalculate duration
  const updateTracks = useCallback(
    (updater: (tracks: VideoTrack[]) => VideoTrack[]) => {
      setTrackState((prev) => {
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

  // ── Track Management ────────────────────────────────────────────────────

  const addTrack = useCallback(
    (type: VideoTrack['type'], name?: string): string => {
      const id = generateId();

      let added = false;
      setTrackState((prev) => {
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
      if (trackState.selectedTrackId === trackId) {
        setTrackState((prev) => ({ ...prev, selectedTrackId: null }));
      }
    },
    [trackState.selectedTrackId, updateTracks]
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
    setTrackState((prev) => ({ ...prev, selectedTrackId: trackId }));
  }, []);

  // ── Clip Management ─────────────────────────────────────────────────────

  const addClip = useCallback(
    async (trackId: string, sourceUrl: string, startTime = 0): Promise<string> => {
      setTrackState((prev) => ({ ...prev, isLoading: true }));

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
          trackIndex: trackState.tracks.findIndex((t) => t.id === trackId),
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

        setTrackState((prev) => ({ ...prev, isLoading: false }));
        return id;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to add clip';
        setError(message);
        setTrackState((prev) => ({ ...prev, isLoading: false }));
        return '';
      }
    },
    [trackState.tracks, setError, updateTracks]
  );

  const removeClip = useCallback(
    (clipId: string) => {
      updateTracks((tracks) =>
        tracks.map((t) => ({
          ...t,
          clips: t.clips.filter((c) => c.id !== clipId),
        }))
      );
      setTrackState((prev) => ({
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
    setTrackState((prev) => ({ ...prev, selectedClipIds: clipIds }));
  }, []);

  const deselectAllClips = useCallback(() => {
    setTrackState((prev) => ({ ...prev, selectedClipIds: [] }));
  }, []);

  // ── Audio ───────────────────────────────────────────────────────────────

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

  // ── Utilities ───────────────────────────────────────────────────────────

  const getClipAtTime = useCallback(
    (trackId: string, time: number): VideoClip | null => {
      const track = trackState.tracks.find((t) => t.id === trackId);
      if (!track) return null;

      return (
        track.clips.find((c) => time >= c.startTime && time < c.startTime + c.duration) || null
      );
    },
    [trackState.tracks]
  );

  const getTracksWithClipsAtTime = useCallback(
    (time: number): VideoTrack[] => {
      return trackState.tracks.filter((t) =>
        t.clips.some((c) => time >= c.startTime && time < c.startTime + c.duration)
      );
    },
    [trackState.tracks]
  );

  const getDuration = useCallback((): number => {
    return trackState.duration;
  }, [trackState.duration]);

  const setTracks = useCallback(
    (tracks: VideoTrack[], duration?: number) => {
      setTrackState((prev) => ({
        ...prev,
        tracks,
        duration: duration ?? calculateDuration(tracks),
      }));
      onClipChange?.(tracks.flatMap((t) => t.clips));
    },
    [calculateDuration, onClipChange]
  );

  return {
    trackState,
    setTrackState,

    calculateDuration,
    updateTracks,

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

    setClipVolume,
    setClipMuted,
    setTrackVolume,
    setTrackMuted,

    getClipAtTime,
    getTracksWithClipsAtTime,
    getDuration,
    setTracks,
  };
}
