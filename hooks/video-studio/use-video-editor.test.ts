/**
 * Tests for useVideoEditor hook
 */

import { renderHook, act } from '@testing-library/react';
import { useVideoEditor } from './use-video-editor';

// Mock the media registry
jest.mock('@/lib/plugin/api/media-api', () => ({
  getMediaRegistry: jest.fn(() => ({
    getAllEffects: jest.fn(() => []),
    getAllTransitions: jest.fn(() => []),
  })),
}));

describe('useVideoEditor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('initialization', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useVideoEditor());

      expect(result.current.state.isLoading).toBe(false);
      expect(result.current.state.isProcessing).toBe(false);
      expect(result.current.state.isPlaying).toBe(false);
      expect(result.current.state.error).toBeNull();
      expect(result.current.state.currentTime).toBe(0);
      expect(result.current.state.duration).toBe(0);
      expect(result.current.state.zoom).toBe(1);
      expect(result.current.state.tracks).toHaveLength(0);
      expect(result.current.state.selectedClipIds).toHaveLength(0);
      expect(result.current.state.selectedTrackId).toBeNull();
    });
  });

  describe('track management', () => {
    it('should add a video track', () => {
      const { result } = renderHook(() => useVideoEditor());

      act(() => {
        result.current.addTrack('video', 'Video Track');
      });

      expect(result.current.state.tracks).toHaveLength(1);
      expect(result.current.state.tracks[0].type).toBe('video');
      expect(result.current.state.tracks[0].name).toBe('Video Track');
    });

    it('should add an audio track', () => {
      const { result } = renderHook(() => useVideoEditor());

      act(() => {
        result.current.addTrack('audio', 'Audio Track');
      });

      expect(result.current.state.tracks).toHaveLength(1);
      expect(result.current.state.tracks[0].type).toBe('audio');
    });

    it('should remove a track', () => {
      const { result } = renderHook(() => useVideoEditor());

      let trackId: string;
      act(() => {
        trackId = result.current.addTrack('video');
      });

      act(() => {
        result.current.removeTrack(trackId!);
      });

      expect(result.current.state.tracks).toHaveLength(0);
    });

    it('should update track properties', () => {
      const { result } = renderHook(() => useVideoEditor());

      let trackId: string;
      act(() => {
        trackId = result.current.addTrack('video', 'Original Name');
      });

      act(() => {
        result.current.updateTrack(trackId!, { name: 'Updated Name', muted: true });
      });

      expect(result.current.state.tracks[0].name).toBe('Updated Name');
      expect(result.current.state.tracks[0].muted).toBe(true);
    });

    it('should reorder tracks', () => {
      const { result } = renderHook(() => useVideoEditor());

      act(() => {
        result.current.addTrack('video', 'Track 1');
        result.current.addTrack('video', 'Track 2');
        result.current.addTrack('video', 'Track 3');
      });

      act(() => {
        result.current.reorderTracks(0, 2);
      });

      expect(result.current.state.tracks[0].name).toBe('Track 2');
      expect(result.current.state.tracks[2].name).toBe('Track 1');
    });

    it('should select a track', () => {
      const { result } = renderHook(() => useVideoEditor());

      let trackId: string;
      act(() => {
        trackId = result.current.addTrack('video');
      });

      act(() => {
        result.current.selectTrack(trackId!);
      });

      expect(result.current.state.selectedTrackId).toBe(trackId!);
    });

    it('should enforce max tracks limit', () => {
      const { result } = renderHook(() => useVideoEditor({ maxTracks: 2 }));

      act(() => {
        result.current.addTrack('video', 'Track 1');
        result.current.addTrack('video', 'Track 2');
        result.current.addTrack('video', 'Track 3'); // Should fail
      });

      expect(result.current.state.tracks).toHaveLength(2);
    });
  });

  describe('clip management', () => {
    it('should remove a clip', () => {
      const { result } = renderHook(() => useVideoEditor());

      // Add a track with a mock clip
      let trackId: string;
      act(() => {
        trackId = result.current.addTrack('video');
      });

      // Manually add a clip to the track for testing
      act(() => {
        result.current.updateTrack(trackId!, {
          clips: [
            {
              id: 'clip-1',
              name: 'Test Clip',
              sourceUrl: 'test.mp4',
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
            },
          ],
        });
      });

      expect(result.current.state.tracks[0].clips).toHaveLength(1);

      act(() => {
        result.current.removeClip('clip-1');
      });

      expect(result.current.state.tracks[0].clips).toHaveLength(0);
    });

    it('should update clip properties', () => {
      const { result } = renderHook(() => useVideoEditor());

      let trackId: string;
      act(() => {
        trackId = result.current.addTrack('video');
        result.current.updateTrack(trackId!, {
          clips: [
            {
              id: 'clip-1',
              name: 'Test Clip',
              sourceUrl: 'test.mp4',
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
            },
          ],
        });
      });

      act(() => {
        result.current.updateClip('clip-1', { volume: 0.5, muted: true });
      });

      expect(result.current.state.tracks[0].clips[0].volume).toBe(0.5);
      expect(result.current.state.tracks[0].clips[0].muted).toBe(true);
    });

    it('should select clips', () => {
      const { result } = renderHook(() => useVideoEditor());

      act(() => {
        result.current.selectClips(['clip-1', 'clip-2']);
      });

      expect(result.current.state.selectedClipIds).toEqual(['clip-1', 'clip-2']);
    });

    it('should deselect all clips', () => {
      const { result } = renderHook(() => useVideoEditor());

      act(() => {
        result.current.selectClips(['clip-1', 'clip-2']);
      });

      act(() => {
        result.current.deselectAllClips();
      });

      expect(result.current.state.selectedClipIds).toHaveLength(0);
    });

    it('should trim clip', () => {
      const { result } = renderHook(() => useVideoEditor());

      let trackId: string;
      act(() => {
        trackId = result.current.addTrack('video');
        result.current.updateTrack(trackId!, {
          clips: [
            {
              id: 'clip-1',
              name: 'Test Clip',
              sourceUrl: 'test.mp4',
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
            },
          ],
        });
      });

      act(() => {
        result.current.trimClip('clip-1', 2, 8);
      });

      expect(result.current.state.tracks[0].clips[0].sourceStartTime).toBe(2);
      expect(result.current.state.tracks[0].clips[0].sourceEndTime).toBe(8);
      expect(result.current.state.tracks[0].clips[0].duration).toBe(6);
    });
  });

  describe('playback controls', () => {
    it('should start playback', () => {
      const { result } = renderHook(() => useVideoEditor());

      act(() => {
        result.current.play();
      });

      expect(result.current.state.isPlaying).toBe(true);
    });

    it('should pause playback', () => {
      const { result } = renderHook(() => useVideoEditor());

      act(() => {
        result.current.play();
      });

      act(() => {
        result.current.pause();
      });

      expect(result.current.state.isPlaying).toBe(false);
    });

    it('should toggle playback', () => {
      const { result } = renderHook(() => useVideoEditor());

      act(() => {
        result.current.togglePlayback();
      });

      expect(result.current.state.isPlaying).toBe(true);

      act(() => {
        result.current.togglePlayback();
      });

      expect(result.current.state.isPlaying).toBe(false);
    });

    it('should seek to specific time', () => {
      const { result } = renderHook(() => useVideoEditor());

      // Set duration first
      act(() => {
        const trackId = result.current.addTrack('video');
        result.current.updateTrack(trackId, {
          clips: [
            {
              id: 'clip-1',
              name: 'Test',
              sourceUrl: 'test.mp4',
              trackIndex: 0,
              startTime: 0,
              duration: 30,
              sourceStartTime: 0,
              sourceEndTime: 30,
              volume: 1,
              playbackSpeed: 1,
              muted: false,
              locked: false,
              effects: [],
            },
          ],
        });
      });

      act(() => {
        result.current.seek(15);
      });

      expect(result.current.state.currentTime).toBe(15);
    });
  });

  describe('effects and transitions', () => {
    it('should add effect to clip', () => {
      const { result } = renderHook(() => useVideoEditor());

      let trackId: string;
      act(() => {
        trackId = result.current.addTrack('video');
        result.current.updateTrack(trackId!, {
          clips: [
            {
              id: 'clip-1',
              name: 'Test',
              sourceUrl: 'test.mp4',
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
            },
          ],
        });
      });

      act(() => {
        result.current.addEffect('clip-1', 'brightness-contrast');
      });

      expect(result.current.state.tracks[0].clips[0].effects).toContain('brightness-contrast');
    });

    it('should remove effect from clip', () => {
      const { result } = renderHook(() => useVideoEditor());

      let trackId: string;
      act(() => {
        trackId = result.current.addTrack('video');
        result.current.updateTrack(trackId!, {
          clips: [
            {
              id: 'clip-1',
              name: 'Test',
              sourceUrl: 'test.mp4',
              trackIndex: 0,
              startTime: 0,
              duration: 10,
              sourceStartTime: 0,
              sourceEndTime: 10,
              volume: 1,
              playbackSpeed: 1,
              muted: false,
              locked: false,
              effects: ['brightness-contrast'],
            },
          ],
        });
      });

      act(() => {
        result.current.removeEffect('clip-1', 'brightness-contrast');
      });

      expect(result.current.state.tracks[0].clips[0].effects).not.toContain('brightness-contrast');
    });

    it('should add transition to clip', () => {
      const { result } = renderHook(() => useVideoEditor());

      let trackId: string;
      act(() => {
        trackId = result.current.addTrack('video');
        result.current.updateTrack(trackId!, {
          clips: [
            {
              id: 'clip-1',
              name: 'Test',
              sourceUrl: 'test.mp4',
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
            },
          ],
        });
      });

      act(() => {
        result.current.addTransition('clip-1', 'clip-2', 'fade', 1.5);
      });

      expect(result.current.state.tracks[0].clips[0].transition).toBeDefined();
      expect(result.current.state.tracks[0].clips[0].transition?.type).toBe('fade');
      expect(result.current.state.tracks[0].clips[0].transition?.duration).toBe(1.5);
    });

    it('should remove transition from clip', () => {
      const { result } = renderHook(() => useVideoEditor());

      let trackId: string;
      act(() => {
        trackId = result.current.addTrack('video');
        result.current.updateTrack(trackId!, {
          clips: [
            {
              id: 'clip-1',
              name: 'Test',
              sourceUrl: 'test.mp4',
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
              transition: { type: 'fade', duration: 1 },
            },
          ],
        });
      });

      act(() => {
        result.current.removeTransition('clip-1');
      });

      expect(result.current.state.tracks[0].clips[0].transition).toBeUndefined();
    });

    it('should get available effects', () => {
      const { result } = renderHook(() => useVideoEditor());

      const effects = result.current.getAvailableEffects();

      expect(Array.isArray(effects)).toBe(true);
    });

    it('should get available transitions', () => {
      const { result } = renderHook(() => useVideoEditor());

      const transitions = result.current.getAvailableTransitions();

      expect(Array.isArray(transitions)).toBe(true);
    });
  });

  describe('audio controls', () => {
    it('should set clip volume', () => {
      const { result } = renderHook(() => useVideoEditor());

      let trackId: string;
      act(() => {
        trackId = result.current.addTrack('video');
        result.current.updateTrack(trackId!, {
          clips: [
            {
              id: 'clip-1',
              name: 'Test',
              sourceUrl: 'test.mp4',
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
            },
          ],
        });
      });

      act(() => {
        result.current.setClipVolume('clip-1', 0.7);
      });

      expect(result.current.state.tracks[0].clips[0].volume).toBe(0.7);
    });

    it('should clamp volume to valid range', () => {
      const { result } = renderHook(() => useVideoEditor());

      let trackId: string;
      act(() => {
        trackId = result.current.addTrack('video');
        result.current.updateTrack(trackId!, {
          clips: [
            {
              id: 'clip-1',
              name: 'Test',
              sourceUrl: 'test.mp4',
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
            },
          ],
        });
      });

      act(() => {
        result.current.setClipVolume('clip-1', 2);
      });

      expect(result.current.state.tracks[0].clips[0].volume).toBe(1);

      act(() => {
        result.current.setClipVolume('clip-1', -0.5);
      });

      expect(result.current.state.tracks[0].clips[0].volume).toBe(0);
    });

    it('should mute/unmute clip', () => {
      const { result } = renderHook(() => useVideoEditor());

      let trackId: string;
      act(() => {
        trackId = result.current.addTrack('video');
        result.current.updateTrack(trackId!, {
          clips: [
            {
              id: 'clip-1',
              name: 'Test',
              sourceUrl: 'test.mp4',
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
            },
          ],
        });
      });

      act(() => {
        result.current.setClipMuted('clip-1', true);
      });

      expect(result.current.state.tracks[0].clips[0].muted).toBe(true);
    });

    it('should set track volume', () => {
      const { result } = renderHook(() => useVideoEditor());

      let trackId: string;
      act(() => {
        trackId = result.current.addTrack('audio');
      });

      act(() => {
        result.current.setTrackVolume(trackId!, 0.5);
      });

      expect(result.current.state.tracks[0].volume).toBe(0.5);
    });

    it('should mute/unmute track', () => {
      const { result } = renderHook(() => useVideoEditor());

      let trackId: string;
      act(() => {
        trackId = result.current.addTrack('audio');
      });

      act(() => {
        result.current.setTrackMuted(trackId!, true);
      });

      expect(result.current.state.tracks[0].muted).toBe(true);
    });
  });

  describe('timeline controls', () => {
    it('should set zoom level', () => {
      const { result } = renderHook(() => useVideoEditor());

      act(() => {
        result.current.setZoom(2);
      });

      expect(result.current.state.zoom).toBe(2);
    });

    it('should clamp zoom to valid range', () => {
      const { result } = renderHook(() => useVideoEditor());

      act(() => {
        result.current.setZoom(100);
      });

      expect(result.current.state.zoom).toBe(10);

      act(() => {
        result.current.setZoom(0.01);
      });

      expect(result.current.state.zoom).toBe(0.1);
    });

    it('should zoom in', () => {
      const { result } = renderHook(() => useVideoEditor());

      const initialZoom = result.current.state.zoom;

      act(() => {
        result.current.zoomIn();
      });

      expect(result.current.state.zoom).toBeGreaterThan(initialZoom);
    });

    it('should zoom out', () => {
      const { result } = renderHook(() => useVideoEditor());

      act(() => {
        result.current.setZoom(2);
      });

      const zoomBefore = result.current.state.zoom;

      act(() => {
        result.current.zoomOut();
      });

      expect(result.current.state.zoom).toBeLessThan(zoomBefore);
    });
  });

  describe('utilities', () => {
    it('should get clip at specific time', () => {
      const { result } = renderHook(() => useVideoEditor());

      let trackId: string;
      act(() => {
        trackId = result.current.addTrack('video');
        result.current.updateTrack(trackId!, {
          clips: [
            {
              id: 'clip-1',
              name: 'Test',
              sourceUrl: 'test.mp4',
              trackIndex: 0,
              startTime: 5,
              duration: 10,
              sourceStartTime: 0,
              sourceEndTime: 10,
              volume: 1,
              playbackSpeed: 1,
              muted: false,
              locked: false,
              effects: [],
            },
          ],
        });
      });

      const clip = result.current.getClipAtTime(trackId!, 7);

      expect(clip).not.toBeNull();
      expect(clip?.id).toBe('clip-1');
    });

    it('should return null when no clip at time', () => {
      const { result } = renderHook(() => useVideoEditor());

      let trackId: string;
      act(() => {
        trackId = result.current.addTrack('video');
        result.current.updateTrack(trackId!, {
          clips: [
            {
              id: 'clip-1',
              name: 'Test',
              sourceUrl: 'test.mp4',
              trackIndex: 0,
              startTime: 5,
              duration: 10,
              sourceStartTime: 0,
              sourceEndTime: 10,
              volume: 1,
              playbackSpeed: 1,
              muted: false,
              locked: false,
              effects: [],
            },
          ],
        });
      });

      const clip = result.current.getClipAtTime(trackId!, 2);

      expect(clip).toBeNull();
    });

    it('should get duration', () => {
      const { result } = renderHook(() => useVideoEditor());

      let trackId: string;
      act(() => {
        trackId = result.current.addTrack('video');
        result.current.updateTrack(trackId!, {
          clips: [
            {
              id: 'clip-1',
              name: 'Test',
              sourceUrl: 'test.mp4',
              trackIndex: 0,
              startTime: 0,
              duration: 20,
              sourceStartTime: 0,
              sourceEndTime: 20,
              volume: 1,
              playbackSpeed: 1,
              muted: false,
              locked: false,
              effects: [],
            },
          ],
        });
      });

      expect(result.current.getDuration()).toBe(20);
    });

    it('should reset state', () => {
      const { result } = renderHook(() => useVideoEditor());

      act(() => {
        result.current.addTrack('video');
        result.current.addTrack('audio');
        result.current.play();
      });

      act(() => {
        result.current.reset();
      });

      expect(result.current.state.tracks).toHaveLength(0);
      expect(result.current.state.isPlaying).toBe(false);
      expect(result.current.state.currentTime).toBe(0);
    });
  });

  describe('callbacks', () => {
    it('should call onClipChange callback when clips change', () => {
      const onClipChange = jest.fn();
      const { result } = renderHook(() => useVideoEditor({ onClipChange }));

      act(() => {
        result.current.addTrack('video');
      });

      expect(onClipChange).toHaveBeenCalled();
    });

    it('should call onError callback on error', () => {
      const onError = jest.fn();
      const { result } = renderHook(() => useVideoEditor({ onError, maxTracks: 1 }));

      act(() => {
        result.current.addTrack('video');
        result.current.addTrack('video'); // Should trigger error
      });

      expect(onError).toHaveBeenCalled();
    });
  });
});
