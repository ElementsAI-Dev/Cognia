/**
 * Tests for useVideoSubtitles hook
 */

import { renderHook, act } from '@testing-library/react';
import { useVideoSubtitles } from './use-video-subtitles';

// Mock the settings store
jest.mock('@/stores', () => ({
  useSettingsStore: jest.fn((selector) => {
    const state = {
      providerSettings: {
        openai: { apiKey: 'test-api-key' },
      },
    };
    return selector(state);
  }),
}));

// Mock the subtitle modules
jest.mock('@/lib/media/video-subtitle', () => ({
  getVideoSubtitleInfo: jest.fn(),
  extractSubtitles: jest.fn(),
  transcribeVideo: jest.fn(),
}));

jest.mock('@/lib/media/subtitle-parser', () => ({
  parseSubtitle: jest.fn(),
  detectFormat: jest.fn(),
}));

describe('useVideoSubtitles', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useVideoSubtitles());

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isExtracting).toBe(false);
      expect(result.current.isTranscribing).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.tracks).toHaveLength(0);
      expect(result.current.activeTrackId).toBeNull();
      expect(result.current.activeTrack).toBeNull();
      expect(result.current.currentCue).toBeNull();
    });

    it('should initialize with custom options', () => {
      const onSubtitlesLoaded = jest.fn();
      const { result } = renderHook(() =>
        useVideoSubtitles({
          language: 'zh-CN',
          onSubtitlesLoaded,
        })
      );

      expect(result.current.tracks).toHaveLength(0);
    });
  });

  describe('track management', () => {
    it('should add a subtitle track', () => {
      const { result } = renderHook(() => useVideoSubtitles());

      let trackId: string;
      act(() => {
        trackId = result.current.addTrack({
          name: 'Test Track',
          language: 'en',
          format: 'srt',
          isDefault: true,
          isVisible: true,
          isLocked: false,
          cues: [],
        });
      });

      expect(result.current.tracks).toHaveLength(1);
      expect(result.current.tracks[0].name).toBe('Test Track');
      expect(result.current.activeTrackId).toBe(trackId!);
    });

    it('should remove a subtitle track', () => {
      const { result } = renderHook(() => useVideoSubtitles());

      let trackId: string;
      act(() => {
        trackId = result.current.addTrack({
          name: 'Test Track',
          language: 'en',
          format: 'srt',
          isDefault: true,
          isVisible: true,
          isLocked: false,
          cues: [],
        });
      });

      act(() => {
        result.current.removeTrack(trackId!);
      });

      expect(result.current.tracks).toHaveLength(0);
      expect(result.current.activeTrackId).toBeNull();
    });

    it('should update a subtitle track', () => {
      const { result } = renderHook(() => useVideoSubtitles());

      let trackId: string;
      act(() => {
        trackId = result.current.addTrack({
          name: 'Test Track',
          language: 'en',
          format: 'srt',
          isDefault: true,
          isVisible: true,
          isLocked: false,
          cues: [],
        });
      });

      act(() => {
        result.current.updateTrack(trackId!, { name: 'Updated Track' });
      });

      expect(result.current.tracks[0].name).toBe('Updated Track');
    });

    it('should set active track', () => {
      const { result } = renderHook(() => useVideoSubtitles());

      let _trackId1: string;
      let trackId2: string;
      act(() => {
        _trackId1 = result.current.addTrack({
          name: 'Track 1',
          language: 'en',
          format: 'srt',
          isDefault: true,
          isVisible: true,
          isLocked: false,
          cues: [],
        });
        trackId2 = result.current.addTrack({
          name: 'Track 2',
          language: 'zh',
          format: 'vtt',
          isDefault: false,
          isVisible: true,
          isLocked: false,
          cues: [],
        });
      });

      act(() => {
        result.current.setActiveTrack(trackId2!);
      });

      expect(result.current.activeTrackId).toBe(trackId2!);
      expect(result.current.activeTrack?.name).toBe('Track 2');
    });

    it('should duplicate a track', () => {
      const { result } = renderHook(() => useVideoSubtitles());

      act(() => {
        result.current.addTrack({
          name: 'Original Track',
          language: 'en',
          format: 'srt',
          isDefault: true,
          isVisible: true,
          isLocked: false,
          cues: [{ id: 'cue-1', index: 1, startTime: 0, endTime: 1000, text: 'Hello' }],
        });
      });

      act(() => {
        result.current.duplicateTrack(result.current.tracks[0].id);
      });

      expect(result.current.tracks).toHaveLength(2);
      expect(result.current.tracks[1].name).toBe('Original Track (Copy)');
    });
  });

  describe('cue management', () => {
    it('should add a cue to a track', () => {
      const { result } = renderHook(() => useVideoSubtitles());

      let trackId: string;
      act(() => {
        trackId = result.current.addTrack({
          name: 'Test Track',
          language: 'en',
          format: 'srt',
          isDefault: true,
          isVisible: true,
          isLocked: false,
          cues: [],
        });
      });

      act(() => {
        result.current.addCue(trackId!, {
          startTime: 0,
          endTime: 1000,
          text: 'Hello World',
        });
      });

      expect(result.current.tracks[0].cues).toHaveLength(1);
      expect(result.current.tracks[0].cues[0].text).toBe('Hello World');
    });

    it('should remove a cue from a track', () => {
      const { result } = renderHook(() => useVideoSubtitles());

      let trackId: string;
      let cueId: string;
      act(() => {
        trackId = result.current.addTrack({
          name: 'Test Track',
          language: 'en',
          format: 'srt',
          isDefault: true,
          isVisible: true,
          isLocked: false,
          cues: [],
        });
        cueId = result.current.addCue(trackId!, {
          startTime: 0,
          endTime: 1000,
          text: 'Hello',
        });
      });

      act(() => {
        result.current.removeCue(trackId!, cueId!);
      });

      expect(result.current.tracks[0].cues).toHaveLength(0);
    });

    it('should update a cue', () => {
      const { result } = renderHook(() => useVideoSubtitles());

      let trackId: string;
      let cueId: string;
      act(() => {
        trackId = result.current.addTrack({
          name: 'Test Track',
          language: 'en',
          format: 'srt',
          isDefault: true,
          isVisible: true,
          isLocked: false,
          cues: [],
        });
        cueId = result.current.addCue(trackId!, {
          startTime: 0,
          endTime: 1000,
          text: 'Hello',
        });
      });

      act(() => {
        result.current.updateCue(trackId!, cueId!, { text: 'Updated Text' });
      });

      expect(result.current.tracks[0].cues[0].text).toBe('Updated Text');
    });

    it('should split a cue', () => {
      const { result } = renderHook(() => useVideoSubtitles());

      let trackId: string;
      let cueId: string;
      act(() => {
        trackId = result.current.addTrack({
          name: 'Test Track',
          language: 'en',
          format: 'srt',
          isDefault: true,
          isVisible: true,
          isLocked: false,
          cues: [],
        });
        cueId = result.current.addCue(trackId!, {
          startTime: 0,
          endTime: 2000,
          text: 'Hello World',
        });
      });

      act(() => {
        result.current.splitCue(trackId!, cueId!, 1000);
      });

      expect(result.current.tracks[0].cues).toHaveLength(2);
      expect(result.current.tracks[0].cues[0].endTime).toBe(1000);
      expect(result.current.tracks[0].cues[1].startTime).toBe(1000);
    });

    it('should merge cues', () => {
      const { result } = renderHook(() => useVideoSubtitles());

      let trackId: string;
      let cueId1: string;
      let cueId2: string;
      act(() => {
        trackId = result.current.addTrack({
          name: 'Test Track',
          language: 'en',
          format: 'srt',
          isDefault: true,
          isVisible: true,
          isLocked: false,
          cues: [],
        });
        cueId1 = result.current.addCue(trackId!, {
          startTime: 0,
          endTime: 1000,
          text: 'Hello',
        });
        cueId2 = result.current.addCue(trackId!, {
          startTime: 1000,
          endTime: 2000,
          text: 'World',
        });
      });

      act(() => {
        result.current.mergeCues(trackId!, [cueId1!, cueId2!]);
      });

      expect(result.current.tracks[0].cues).toHaveLength(1);
      expect(result.current.tracks[0].cues[0].text).toBe('Hello World');
      expect(result.current.tracks[0].cues[0].endTime).toBe(2000);
    });
  });

  describe('time-based operations', () => {
    it('should get cue at time', () => {
      const { result } = renderHook(() => useVideoSubtitles());

      let trackId: string;
      act(() => {
        trackId = result.current.addTrack({
          name: 'Test Track',
          language: 'en',
          format: 'srt',
          isDefault: true,
          isVisible: true,
          isLocked: false,
          cues: [
            { id: 'cue-1', index: 1, startTime: 0, endTime: 1000, text: 'First' },
            { id: 'cue-2', index: 2, startTime: 2000, endTime: 3000, text: 'Second' },
          ],
        });
      });

      const cue = result.current.getCueAtTime(trackId!, 500);

      expect(cue).not.toBeNull();
      expect(cue?.text).toBe('First');
    });

    it('should return null when no cue at time', () => {
      const { result } = renderHook(() => useVideoSubtitles());

      let trackId: string;
      act(() => {
        trackId = result.current.addTrack({
          name: 'Test Track',
          language: 'en',
          format: 'srt',
          isDefault: true,
          isVisible: true,
          isLocked: false,
          cues: [{ id: 'cue-1', index: 1, startTime: 0, endTime: 1000, text: 'First' }],
        });
      });

      const cue = result.current.getCueAtTime(trackId!, 1500);

      expect(cue).toBeNull();
    });

    it('should get cues in range', () => {
      const { result } = renderHook(() => useVideoSubtitles());

      let trackId: string;
      act(() => {
        trackId = result.current.addTrack({
          name: 'Test Track',
          language: 'en',
          format: 'srt',
          isDefault: true,
          isVisible: true,
          isLocked: false,
          cues: [
            { id: 'cue-1', index: 1, startTime: 0, endTime: 1000, text: 'First' },
            { id: 'cue-2', index: 2, startTime: 1500, endTime: 2500, text: 'Second' },
            { id: 'cue-3', index: 3, startTime: 3000, endTime: 4000, text: 'Third' },
          ],
        });
      });

      const cues = result.current.getCuesInRange(trackId!, 500, 2000);

      expect(cues).toHaveLength(2);
    });

    it('should shift cues', () => {
      const { result } = renderHook(() => useVideoSubtitles());

      let trackId: string;
      act(() => {
        trackId = result.current.addTrack({
          name: 'Test Track',
          language: 'en',
          format: 'srt',
          isDefault: true,
          isVisible: true,
          isLocked: false,
          cues: [{ id: 'cue-1', index: 1, startTime: 1000, endTime: 2000, text: 'First' }],
        });
      });

      act(() => {
        result.current.shiftCues(trackId!, 500);
      });

      expect(result.current.tracks[0].cues[0].startTime).toBe(1500);
      expect(result.current.tracks[0].cues[0].endTime).toBe(2500);
    });
  });

  describe('export', () => {
    it('should export track to SRT format', () => {
      const { result } = renderHook(() => useVideoSubtitles());

      let trackId: string;
      act(() => {
        trackId = result.current.addTrack({
          name: 'Test Track',
          language: 'en',
          format: 'srt',
          isDefault: true,
          isVisible: true,
          isLocked: false,
          cues: [{ id: 'cue-1', index: 1, startTime: 0, endTime: 1000, text: 'Hello' }],
        });
      });

      const srt = result.current.exportTrack(trackId!, 'srt');

      expect(srt).toContain('1');
      expect(srt).toContain('-->');
      expect(srt).toContain('Hello');
    });

    it('should export track to VTT format', () => {
      const { result } = renderHook(() => useVideoSubtitles());

      let trackId: string;
      act(() => {
        trackId = result.current.addTrack({
          name: 'Test Track',
          language: 'en',
          format: 'vtt',
          isDefault: true,
          isVisible: true,
          isLocked: false,
          cues: [{ id: 'cue-1', index: 1, startTime: 0, endTime: 1000, text: 'Hello' }],
        });
      });

      const vtt = result.current.exportTrack(trackId!, 'vtt');

      expect(vtt).toContain('WEBVTT');
      expect(vtt).toContain('Hello');
    });
  });

  describe('utilities', () => {
    it('should search cues', () => {
      const { result } = renderHook(() => useVideoSubtitles());

      act(() => {
        result.current.addTrack({
          name: 'Test Track',
          language: 'en',
          format: 'srt',
          isDefault: true,
          isVisible: true,
          isLocked: false,
          cues: [
            { id: 'cue-1', index: 1, startTime: 0, endTime: 1000, text: 'Hello World' },
            { id: 'cue-2', index: 2, startTime: 1000, endTime: 2000, text: 'Goodbye' },
          ],
        });
      });

      const results = result.current.searchCues('hello');

      expect(results).toHaveLength(1);
      expect(results[0].text).toBe('Hello World');
    });

    it('should get plain text', () => {
      const { result } = renderHook(() => useVideoSubtitles());

      let trackId: string;
      act(() => {
        trackId = result.current.addTrack({
          name: 'Test Track',
          language: 'en',
          format: 'srt',
          isDefault: true,
          isVisible: true,
          isLocked: false,
          cues: [
            { id: 'cue-1', index: 1, startTime: 0, endTime: 1000, text: 'Hello' },
            { id: 'cue-2', index: 2, startTime: 1000, endTime: 2000, text: 'World' },
          ],
        });
      });

      const text = result.current.getPlainText(trackId!);

      expect(text).toBe('Hello World');
    });

    it('should validate track', () => {
      const { result } = renderHook(() => useVideoSubtitles());

      let trackId: string;
      act(() => {
        trackId = result.current.addTrack({
          name: 'Test Track',
          language: 'en',
          format: 'srt',
          isDefault: true,
          isVisible: true,
          isLocked: false,
          cues: [{ id: 'cue-1', index: 1, startTime: 0, endTime: 1000, text: 'Valid' }],
        });
      });

      const validation = result.current.validateTrack(trackId!);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect overlapping cues', () => {
      const { result } = renderHook(() => useVideoSubtitles());

      let trackId: string;
      act(() => {
        trackId = result.current.addTrack({
          name: 'Test Track',
          language: 'en',
          format: 'srt',
          isDefault: true,
          isVisible: true,
          isLocked: false,
          cues: [
            { id: 'cue-1', index: 1, startTime: 0, endTime: 1500, text: 'First' },
            { id: 'cue-2', index: 2, startTime: 1000, endTime: 2000, text: 'Second' },
          ],
        });
      });

      const validation = result.current.validateTrack(trackId!);

      expect(validation.isValid).toBe(false);
      expect(validation.errors.some((e) => e.includes('overlap'))).toBe(true);
    });

    it('should reset state', () => {
      const { result } = renderHook(() => useVideoSubtitles());

      act(() => {
        result.current.addTrack({
          name: 'Test Track',
          language: 'en',
          format: 'srt',
          isDefault: true,
          isVisible: true,
          isLocked: false,
          cues: [],
        });
      });

      act(() => {
        result.current.reset();
      });

      expect(result.current.tracks).toHaveLength(0);
      expect(result.current.activeTrackId).toBeNull();
    });
  });
});
