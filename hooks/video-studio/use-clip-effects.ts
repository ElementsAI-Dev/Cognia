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
import type {
  VideoClip,
  VideoEffectInstance,
  VideoTrack,
} from '@/types/video-studio/types';
import { normalizeClipEffects } from '@/types/video-studio/types';

export interface UseClipEffectsReturn {
  addEffect: (clipId: string, effectId: string, params?: Record<string, unknown>) => void;
  removeEffect: (clipId: string, effectId: string) => void;
  updateEffectParams: (clipId: string, effectId: string, params: Record<string, unknown>) => void;
  setEffectEnabled: (clipId: string, effectId: string, enabled: boolean) => void;
  reorderEffects: (clipId: string, fromIndex: number, toIndex: number) => void;
  addTransition: (fromClipId: string, toClipId: string, type: string, duration: number) => void;
  removeTransition: (clipId: string) => void;
  getAvailableEffects: () => VideoEffectDefinition[];
  getAvailableTransitions: () => VideoTransitionDefinition[];
}

function createEffectInstance(
  effectId: string,
  params: Record<string, unknown> = {}
): VideoEffectInstance {
  return {
    id: `effect-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    effectId,
    enabled: true,
    params,
  };
}

function mapClipEffects(
  clip: VideoClip,
  mapper: (effects: VideoEffectInstance[]) => VideoEffectInstance[]
): VideoClip {
  const normalized = normalizeClipEffects(clip.effects);
  return {
    ...clip,
    effects: mapper(normalized),
  };
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
    (clipId: string, effectId: string, params?: Record<string, unknown>) => {
      updateTracks((tracks) =>
        tracks.map((t) => ({
          ...t,
          clips: t.clips.map((c) =>
            c.id === clipId
              ? mapClipEffects(c, (effects) => {
                  const existing = effects.find((effect) => effect.effectId === effectId);
                  if (existing) {
                    return effects.map((effect) =>
                      effect.effectId === effectId
                        ? {
                            ...effect,
                            enabled: true,
                            params: {
                              ...effect.params,
                              ...(params ?? {}),
                            },
                          }
                        : effect
                    );
                  }
                  return [...effects, createEffectInstance(effectId, params)];
                })
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
            c.id === clipId
              ? mapClipEffects(c, (effects) =>
                  effects.filter((effect) => effect.effectId !== effectId && effect.id !== effectId)
                )
              : c
          ),
        }))
      );
    },
    [updateTracks]
  );

  const updateEffectParams = useCallback(
    (clipId: string, effectId: string, params: Record<string, unknown>) => {
      updateTracks((tracks) =>
        tracks.map((t) => ({
          ...t,
          clips: t.clips.map((c) =>
            c.id === clipId
              ? mapClipEffects(c, (effects) =>
                  effects.map((effect) =>
                    effect.effectId === effectId || effect.id === effectId
                      ? { ...effect, params: { ...effect.params, ...params } }
                      : effect
                  )
                )
              : c
          ),
        }))
      );
    },
    [updateTracks]
  );

  const setEffectEnabled = useCallback(
    (clipId: string, effectId: string, enabled: boolean) => {
      updateTracks((tracks) =>
        tracks.map((t) => ({
          ...t,
          clips: t.clips.map((c) =>
            c.id === clipId
              ? mapClipEffects(c, (effects) =>
                  effects.map((effect) =>
                    effect.effectId === effectId || effect.id === effectId
                      ? { ...effect, enabled }
                      : effect
                  )
                )
              : c
          ),
        }))
      );
    },
    [updateTracks]
  );

  const reorderEffects = useCallback(
    (clipId: string, fromIndex: number, toIndex: number) => {
      updateTracks((tracks) =>
        tracks.map((t) => ({
          ...t,
          clips: t.clips.map((c) => {
            if (c.id !== clipId) {
              return c;
            }
            return mapClipEffects(c, (effects) => {
              if (
                fromIndex < 0 ||
                toIndex < 0 ||
                fromIndex >= effects.length ||
                toIndex >= effects.length
              ) {
                return effects;
              }
              const reordered = [...effects];
              const [moved] = reordered.splice(fromIndex, 1);
              reordered.splice(toIndex, 0, moved);
              return reordered;
            });
          }),
        }))
      );
    },
    [updateTracks]
  );

  const addTransition = useCallback(
    (fromClipId: string, toClipId: string, type: string, duration: number) => {
      updateClip(fromClipId, {
        transition: {
          type,
          duration,
          params: {
            toClipId,
          },
        },
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
    setEffectEnabled,
    reorderEffects,
    addTransition,
    removeTransition,
    getAvailableEffects,
    getAvailableTransitions,
  };
}
