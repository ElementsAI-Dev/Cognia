/**
 * usePlayback - Playback control for video editing
 *
 * Extracted from useVideoEditor to manage:
 * - Play, pause, toggle, seek
 * - Playback speed (applies to selected or all clips)
 * - requestAnimationFrame loop for timing
 * - Cleanup on unmount
 */

import { useCallback, useRef, useEffect } from 'react';
import type { VideoEditorState } from '@/types/video-studio/types';

export interface UsePlaybackOptions {
  onPlaybackChange?: (isPlaying: boolean, currentTime: number) => void;
}

export interface PlaybackState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
}

export interface UsePlaybackReturn {
  play: () => void;
  pause: () => void;
  togglePlayback: () => void;
  seek: (time: number) => void;
  setPlaybackSpeed: (speed: number) => void;
  playbackRafRef: React.RefObject<number | null>;
  lastFrameTimeRef: React.RefObject<number>;
}

/**
 * @param state - Latest editor state snapshot
 * @param setState - State setter for the full VideoEditorState
 * @param updateClip - Function to update a single clip's properties
 * @param options - Playback options
 */
export function usePlayback(
  state: VideoEditorState,
  setState: React.Dispatch<React.SetStateAction<VideoEditorState>>,
  updateClip: (clipId: string, updates: Record<string, unknown>) => void,
  options: UsePlaybackOptions = {}
): UsePlaybackReturn {
  const { onPlaybackChange } = options;

  const playbackRafRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(0);

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
  }, [state.currentTime, setState, onPlaybackChange]);

  const pause = useCallback(() => {
    if (playbackRafRef.current) {
      cancelAnimationFrame(playbackRafRef.current);
      playbackRafRef.current = null;
    }
    setState((prev) => ({ ...prev, isPlaying: false }));
    onPlaybackChange?.(false, state.currentTime);
  }, [state.currentTime, setState, onPlaybackChange]);

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
    [state.duration, state.isPlaying, setState, onPlaybackChange]
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
    play,
    pause,
    togglePlayback,
    seek,
    setPlaybackSpeed,
    playbackRafRef,
    lastFrameTimeRef,
  };
}
