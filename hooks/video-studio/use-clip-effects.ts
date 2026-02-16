/**
 * useClipEffects - Effects & transitions for video clips
 *
 * Extracted from useVideoEditor to manage:
 * - Add/remove/update effects on clips
 * - Add/remove transitions between clips
 * - Query available effects and transitions from the plugin registry
 */

import { useCallback } from 'react';
import { getMediaRegistry } from '@/lib/plugin/api/media-api';
import type {
  VideoEffectDefinition,
  VideoTransitionDefinition,
} from '@/lib/plugin/api/media-api';
import type { VideoClip, VideoTrack } from '@/types/video-studio/types';

export interface UseClipEffectsReturn {
  addEffect: (clipId: string, effectId: string, params?: Record<string, unknown>) => void;
  removeEffect: (clipId: string, effectId: string) => void;
  updateEffectParams: (clipId: string, effectId: string, params: Record<string, unknown>) => void;
  addTransition: (fromClipId: string, toClipId: string, type: string, duration: number) => void;
  removeTransition: (clipId: string) => void;
  getAvailableEffects: () => VideoEffectDefinition[];
  getAvailableTransitions: () => VideoTransitionDefinition[];
}

/**
 * @param updateTracks - Updater function that replaces all tracks via a mapper
 * @param updateClip - Function to update a single clip's properties
 */
export function useClipEffects(
  updateTracks: (updater: (tracks: VideoTrack[]) => VideoTrack[]) => void,
  updateClip: (clipId: string, updates: Partial<VideoClip>) => void
): UseClipEffectsReturn {
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

  return {
    addEffect,
    removeEffect,
    updateEffectParams,
    addTransition,
    removeTransition,
    getAvailableEffects,
    getAvailableTransitions,
  };
}
