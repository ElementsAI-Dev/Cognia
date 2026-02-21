import { act, renderHook } from '@testing-library/react';
import { useClipEffects } from './use-clip-effects';
import type { VideoClip, VideoTrack } from '@/types/video-studio/types';
import { getMediaRegistry } from '@/lib/plugin/api/media-api';

jest.mock('@/lib/plugin/api/media-api', () => ({
  getMediaRegistry: jest.fn(),
}));

function createClip(id: string): VideoClip {
  return {
    id,
    name: id,
    sourceUrl: `file:///${id}.mp4`,
    trackIndex: 0,
    startTime: 0,
    duration: 10,
    sourceStartTime: 0,
    sourceEndTime: 10,
    volume: 1,
    playbackSpeed: 1,
    muted: false,
    locked: false,
    effects: [],
  };
}

function createTrack(clips: VideoClip[]): VideoTrack {
  return {
    id: 'track-1',
    name: 'Track 1',
    type: 'video',
    clips,
    muted: false,
    locked: false,
    visible: true,
    volume: 1,
    height: 120,
  };
}

describe('useClipEffects', () => {
  const mockRegistry = {
    getAllEffects: jest.fn(() => []),
    getAllTransitions: jest.fn(() => []),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getMediaRegistry as jest.Mock).mockReturnValue(mockRegistry);
  });

  it('updates effect params and enabled state', () => {
    let tracks: VideoTrack[] = [createTrack([createClip('clip-1')])];

    const updateTracks = (updater: (value: VideoTrack[]) => VideoTrack[]) => {
      tracks = updater(tracks);
    };
    const updateClip = (clipId: string, updates: Partial<VideoClip>) => {
      tracks = tracks.map((track) => ({
        ...track,
        clips: track.clips.map((clip) => (clip.id === clipId ? { ...clip, ...updates } : clip)),
      }));
    };

    const { result } = renderHook(() => useClipEffects(updateTracks, updateClip));

    act(() => {
      result.current.addEffect('clip-1', 'brightness-contrast', { brightness: 10 });
      result.current.updateEffectParams('clip-1', 'brightness-contrast', { contrast: 20 });
      result.current.setEffectEnabled('clip-1', 'brightness-contrast', false);
    });

    const clip = tracks[0].clips[0];
    expect(Array.isArray(clip.effects)).toBe(true);
    expect(clip.effects).toHaveLength(1);

    const effect = clip.effects[0];
    expect(typeof effect).not.toBe('string');
    if (typeof effect !== 'string') {
      expect(effect.enabled).toBe(false);
      expect(effect.params).toMatchObject({
        brightness: 10,
        contrast: 20,
      });
    }
  });

  it('reorders effects by index', () => {
    let tracks: VideoTrack[] = [createTrack([createClip('clip-1')])];

    const updateTracks = (updater: (value: VideoTrack[]) => VideoTrack[]) => {
      tracks = updater(tracks);
    };
    const updateClip = (clipId: string, updates: Partial<VideoClip>) => {
      tracks = tracks.map((track) => ({
        ...track,
        clips: track.clips.map((clip) => (clip.id === clipId ? { ...clip, ...updates } : clip)),
      }));
    };

    const { result } = renderHook(() => useClipEffects(updateTracks, updateClip));

    act(() => {
      result.current.addEffect('clip-1', 'effect-a', { a: 1 });
      result.current.addEffect('clip-1', 'effect-b', { b: 2 });
      result.current.reorderEffects('clip-1', 0, 1);
    });

    const clip = tracks[0].clips[0];
    const effectIds = clip.effects.map((effect) =>
      typeof effect === 'string' ? effect : effect.effectId
    );
    expect(effectIds).toEqual(['effect-b', 'effect-a']);
  });

  it('stores transitions as from-to clip relationship', () => {
    const clipOne = createClip('clip-1');
    const clipTwo = createClip('clip-2');
    clipTwo.startTime = 10;

    let tracks: VideoTrack[] = [createTrack([clipOne, clipTwo])];

    const updateTracks = (updater: (value: VideoTrack[]) => VideoTrack[]) => {
      tracks = updater(tracks);
    };
    const updateClip = (clipId: string, updates: Partial<VideoClip>) => {
      tracks = tracks.map((track) => ({
        ...track,
        clips: track.clips.map((clip) => (clip.id === clipId ? { ...clip, ...updates } : clip)),
      }));
    };

    const { result } = renderHook(() => useClipEffects(updateTracks, updateClip));

    act(() => {
      result.current.addTransition('clip-1', 'clip-2', 'fade', 0.75);
    });

    const transition = tracks[0].clips[0].transition;
    expect(transition).toBeDefined();
    expect(transition?.type).toBe('fade');
    expect(transition?.duration).toBe(0.75);
    expect(transition?.params?.toClipId).toBe('clip-2');
  });
});
