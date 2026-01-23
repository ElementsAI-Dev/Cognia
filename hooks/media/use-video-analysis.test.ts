/**
 * useVideoAnalysis Hook Tests
 * 
 * Tests for video subtitle extraction, transcription, and analysis functionality
 */

import { renderHook, act } from '@testing-library/react';
import { useVideoAnalysis } from './use-video-analysis';
import type {
  SubtitleTrack,
  VideoSubtitleInfo,
  VideoAnalysisResult,
  TranscriptionResult,
} from '@/types/media/subtitle';

// Mock the media modules
const mockGetVideoSubtitleInfo = jest.fn();
const mockGetVideoSubtitles = jest.fn();
const mockTranscribeVideo = jest.fn();
const mockAnalyzeVideoContent = jest.fn();
const mockParseSubtitle = jest.fn();

jest.mock('@/lib/media/video-subtitle', () => ({
  getVideoSubtitleInfo: mockGetVideoSubtitleInfo,
  getVideoSubtitles: mockGetVideoSubtitles,
  transcribeVideo: mockTranscribeVideo,
  analyzeVideoContent: mockAnalyzeVideoContent,
}));

jest.mock('@/lib/media/subtitle-parser', () => ({
  parseSubtitle: mockParseSubtitle,
}));

// Mock the stores
jest.mock('@/stores', () => ({
  useSettingsStore: jest.fn(),
}));

import { useSettingsStore } from '@/stores';

// Mock implementation
const mockUseSettingsStore = useSettingsStore as jest.MockedFunction<typeof useSettingsStore>;

// Test data
const mockVideoPath = '/path/to/test-video.mp4';
const mockApiKey = 'test-openai-api-key';

const mockSubtitleInfo: VideoSubtitleInfo = {
  hasEmbeddedSubtitles: true,
  embeddedTracks: [
    {
      streamIndex: 0,
      codec: 'subrip',
      language: 'en',
      title: 'English',
      isDefault: true,
      isForced: false,
    },
  ],
  hasExternalSubtitles: false,
  externalFiles: [],
};

const mockSubtitleTrack: SubtitleTrack = {
  id: 'track-1',
  label: 'English',
  language: 'en',
  format: 'srt',
  isDefault: true,
  isSDH: false,
  cues: [
    {
      id: '1',
      index: 1,
      startTime: 1000,
      endTime: 4000,
      text: 'Hello, world!',
      speaker: 'Speaker 1',
    },
    {
      id: '2',
      index: 2,
      startTime: 5000,
      endTime: 8000,
      text: 'This is a test subtitle.',
      speaker: 'Speaker 2',
    },
  ],
  duration: 10000,
  source: 'embedded',
};

const mockTranscriptionResult: TranscriptionResult = {
  success: true,
  text: 'Hello, world! This is a test subtitle.',
  language: 'en',
  duration: 10,
  segments: [
    {
      id: 1,
      start: 1.0,
      end: 4.0,
      text: 'Hello, world!',
      confidence: 0.95,
    },
    {
      id: 2,
      start: 5.0,
      end: 8.0,
      text: 'This is a test subtitle.',
      confidence: 0.92,
    },
  ],
  subtitleTrack: mockSubtitleTrack,
};

const mockAnalysisResult: VideoAnalysisResult = {
  success: true,
  duration: 10,
  transcript: 'Hello, world! This is a test subtitle.',
  subtitleSource: 'embedded',
  summary: 'A short test video with basic greetings.',
  keyMoments: [
    {
      timestamp: 1.0,
      formattedTime: '00:01',
      title: 'Greeting',
      description: 'Speaker says hello',
      importance: 0.8,
    },
  ],
  topics: ['greeting', 'test'],
  sentiment: 'positive',
};

describe('useVideoAnalysis', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Mock settings store with API key
    mockUseSettingsStore.mockReturnValue({
      openai: { enabled: true, apiKey: mockApiKey },
    } as Record<string, unknown>);
  });

  describe('Initial State', () => {
    it('should return correct initial state', () => {
      const { result } = renderHook(() => useVideoAnalysis());

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isTranscribing).toBe(false);
      expect(result.current.isAnalyzing).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.subtitleInfo).toBe(null);
      expect(result.current.subtitleTrack).toBe(null);
      expect(result.current.transcript).toBe(null);
      expect(result.current.analysisResult).toBe(null);
    });

    it('should use custom options', () => {
      const customOptions = {
        language: 'zh-CN',
        transcribeIfMissing: false,
        customPrompt: 'Custom analysis prompt',
      };

      const { result } = renderHook(() => useVideoAnalysis(customOptions));

      // Verify options are used (tested through API calls)
      expect(result.current).toBeDefined();
    });
  });

  describe('getSubtitleInfo', () => {
    it('should get subtitle info successfully', async () => {
      mockGetVideoSubtitleInfo.mockResolvedValue(mockSubtitleInfo);

      const { result } = renderHook(() => useVideoAnalysis());

      let info: VideoSubtitleInfo | null = null;
      
      await act(async () => {
        info = await result.current.getSubtitleInfo(mockVideoPath);
      });

      expect(mockGetVideoSubtitleInfo).toHaveBeenCalledWith(mockVideoPath);
      expect(info).toEqual(mockSubtitleInfo);
      expect(result.current.subtitleInfo).toEqual(mockSubtitleInfo);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
    });

    it('should handle errors when getting subtitle info', async () => {
      const errorMessage = 'Failed to read video file';
      mockGetVideoSubtitleInfo.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useVideoAnalysis());

      let info: VideoSubtitleInfo | null = null;
      
      await act(async () => {
        info = await result.current.getSubtitleInfo(mockVideoPath);
      });

      expect(info).toBe(null);
      expect(result.current.subtitleInfo).toBe(null);
      expect(result.current.error).toBe(errorMessage);
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('extractSubtitles', () => {
    it('should extract subtitles successfully', async () => {
      mockGetVideoSubtitles.mockResolvedValue({
        success: true,
        track: mockSubtitleTrack,
      });

      const onSubtitlesExtracted = jest.fn();
      const { result } = renderHook(() => useVideoAnalysis({ onSubtitlesExtracted }));

      let track: SubtitleTrack | null = null;
      
      await act(async () => {
        track = await result.current.extractSubtitles(mockVideoPath);
      });

      expect(mockGetVideoSubtitles).toHaveBeenCalledWith(mockVideoPath, mockApiKey, {
        preferredLanguage: 'en',
        transcribeIfMissing: true,
      });
      expect(track).toEqual(mockSubtitleTrack);
      expect(result.current.subtitleTrack).toEqual(mockSubtitleTrack);
      expect(result.current.transcript).toBe('Hello, world! This is a test subtitle.');
      expect(onSubtitlesExtracted).toHaveBeenCalledWith(mockSubtitleTrack);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
    });

    it('should handle subtitle extraction failure', async () => {
      const errorMessage = 'No subtitles found';
      mockGetVideoSubtitles.mockResolvedValue({
        success: false,
        error: errorMessage,
      });

      const { result } = renderHook(() => useVideoAnalysis());

      let track: SubtitleTrack | null = null;
      
      await act(async () => {
        track = await result.current.extractSubtitles(mockVideoPath);
      });

      expect(track).toBe(null);
      expect(result.current.subtitleTrack).toBe(null);
      expect(result.current.error).toBe(errorMessage);
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle extraction errors', async () => {
      mockGetVideoSubtitles.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useVideoAnalysis());

      let track: SubtitleTrack | null = null;
      
      await act(async () => {
        track = await result.current.extractSubtitles(mockVideoPath);
      });

      expect(track).toBe(null);
      expect(result.current.error).toBe('Network error');
      expect(result.current.isLoading).toBe(false);
    });

    it('should use custom language and transcription settings', async () => {
      mockGetVideoSubtitles.mockResolvedValue({
        success: true,
        track: mockSubtitleTrack,
      });

      const customOptions = {
        language: 'zh-CN',
        transcribeIfMissing: false,
      };

      const { result } = renderHook(() => useVideoAnalysis(customOptions));

      await act(async () => {
        await result.current.extractSubtitles(mockVideoPath);
      });

      expect(mockGetVideoSubtitles).toHaveBeenCalledWith(mockVideoPath, mockApiKey, {
        preferredLanguage: 'zh-CN',
        transcribeIfMissing: false,
      });
    });
  });

  describe('transcribeVideo', () => {
    it('should transcribe video successfully', async () => {
      mockTranscribeVideo.mockResolvedValue(mockTranscriptionResult);

      const onTranscriptionComplete = jest.fn();
      const { result } = renderHook(() => useVideoAnalysis({ onTranscriptionComplete }));

      let transcription: TranscriptionResult | null = null;
      
      await act(async () => {
        transcription = await result.current.transcribeVideo(mockVideoPath);
      });

      expect(mockTranscribeVideo).toHaveBeenCalledWith(mockVideoPath, mockApiKey, {
        language: 'en',
        includeTimestamps: true,
      });
      expect(transcription).toEqual(mockTranscriptionResult);
      expect(result.current.subtitleTrack).toEqual(mockSubtitleTrack);
      expect(result.current.transcript).toBe('Hello, world! This is a test subtitle.');
      expect(onTranscriptionComplete).toHaveBeenCalledWith(mockTranscriptionResult);
      expect(result.current.isTranscribing).toBe(false);
      expect(result.current.error).toBe(null);
    });

    it('should fail when no API key is available', async () => {
      mockUseSettingsStore.mockReturnValue({
        openai: { enabled: true, apiKey: '' },
      } as Record<string, unknown>);

      const { result } = renderHook(() => useVideoAnalysis());

      let transcription: TranscriptionResult | null = null;
      
      await act(async () => {
        transcription = await result.current.transcribeVideo(mockVideoPath);
      });

      expect(transcription).toBe(null);
      expect(result.current.error).toBe('OpenAI API key required for transcription');
      expect(result.current.isTranscribing).toBe(false);
    });

    it('should handle transcription failure', async () => {
      mockTranscribeVideo.mockResolvedValue({
        success: false,
        error: 'Transcription service unavailable',
      });

      const { result } = renderHook(() => useVideoAnalysis());

      let transcription: TranscriptionResult | null = null;
      
      await act(async () => {
        transcription = await result.current.transcribeVideo(mockVideoPath);
      });

      expect(transcription).toBe(null);
      expect(result.current.error).toBe('Transcription service unavailable');
      expect(result.current.isTranscribing).toBe(false);
    });

    it('should handle transcription errors', async () => {
      mockTranscribeVideo.mockRejectedValue(new Error('Audio processing failed'));

      const { result } = renderHook(() => useVideoAnalysis());

      let transcription: TranscriptionResult | null = null;
      
      await act(async () => {
        transcription = await result.current.transcribeVideo(mockVideoPath);
      });

      expect(transcription).toBe(null);
      expect(result.current.error).toBe('Audio processing failed');
      expect(result.current.isTranscribing).toBe(false);
    });
  });

  describe('analyzeVideo', () => {
    it('should analyze video successfully with default type', async () => {
      mockAnalyzeVideoContent.mockResolvedValue(mockAnalysisResult);

      const onAnalysisComplete = jest.fn();
      const { result } = renderHook(() => useVideoAnalysis({ onAnalysisComplete }));

      let analysis: VideoAnalysisResult | null = null;
      
      await act(async () => {
        analysis = await result.current.analyzeVideo(mockVideoPath);
      });

      expect(mockAnalyzeVideoContent).toHaveBeenCalledWith(
        {
          videoPath: mockVideoPath,
          analysisType: 'summary',
          language: 'en',
          customPrompt: undefined,
          useSubtitles: true,
          transcribeIfNeeded: true,
        },
        mockApiKey
      );
      expect(analysis).toEqual(mockAnalysisResult);
      expect(result.current.analysisResult).toEqual(mockAnalysisResult);
      expect(result.current.transcript).toBe('Hello, world! This is a test subtitle.');
      expect(onAnalysisComplete).toHaveBeenCalledWith(mockAnalysisResult);
      expect(result.current.isAnalyzing).toBe(false);
      expect(result.current.error).toBe(null);
    });

    it('should analyze video with custom type and options', async () => {
      mockAnalyzeVideoContent.mockResolvedValue(mockAnalysisResult);

      const customOptions = {
        language: 'zh-CN',
        customPrompt: 'Analyze this video in detail',
        transcribeIfMissing: false,
      };

      const { result } = renderHook(() => useVideoAnalysis(customOptions));

      await act(async () => {
        await result.current.analyzeVideo(mockVideoPath, 'key-moments');
      });

      expect(mockAnalyzeVideoContent).toHaveBeenCalledWith(
        {
          videoPath: mockVideoPath,
          analysisType: 'key-moments',
          language: 'zh-CN',
          customPrompt: 'Analyze this video in detail',
          useSubtitles: true,
          transcribeIfNeeded: false,
        },
        mockApiKey
      );
    });

    it('should handle analysis failure', async () => {
      mockAnalyzeVideoContent.mockResolvedValue({
        success: false,
        error: 'Analysis service unavailable',
      });

      const { result } = renderHook(() => useVideoAnalysis());

      let analysis: VideoAnalysisResult | null = null;
      
      await act(async () => {
        analysis = await result.current.analyzeVideo(mockVideoPath);
      });

      expect(analysis).toBe(null);
      expect(result.current.error).toBe('Analysis service unavailable');
      expect(result.current.isAnalyzing).toBe(false);
    });

    it('should handle analysis errors', async () => {
      mockAnalyzeVideoContent.mockRejectedValue(new Error('Content analysis failed'));

      const { result } = renderHook(() => useVideoAnalysis());

      let analysis: VideoAnalysisResult | null = null;
      
      await act(async () => {
        analysis = await result.current.analyzeVideo(mockVideoPath);
      });

      expect(analysis).toBe(null);
      expect(result.current.error).toBe('Content analysis failed');
      expect(result.current.isAnalyzing).toBe(false);
    });
  });

  describe('parseSubtitleContent', () => {
    it('should parse subtitle content successfully', async () => {
      mockParseSubtitle.mockReturnValue({
        format: 'srt',
        tracks: [mockSubtitleTrack],
        metadata: {},
        rawContent: 'mock content',
        errors: [],
      });

      const { result } = renderHook(() => useVideoAnalysis());

      let track: SubtitleTrack | null = null;
      
      await act(async () => {
        track = await result.current.parseSubtitleContent('1\n00:00:01,000 --> 00:00:04,000\nHello, world!');
      });

      expect(mockParseSubtitle).toHaveBeenCalledWith('1\n00:00:01,000 --> 00:00:04,000\nHello, world!', 'en');
      expect(track).toEqual(mockSubtitleTrack);
      expect(result.current.subtitleTrack).toEqual(mockSubtitleTrack);
      expect(result.current.transcript).toBe('Hello, world! This is a test subtitle.');
    });

    it('should handle parsing failure', async () => {
      mockParseSubtitle.mockReturnValue({
        format: 'srt',
        tracks: [],
        metadata: {},
        rawContent: 'invalid content',
        errors: [{ type: 'error', message: 'Invalid format' }],
      });

      const { result } = renderHook(() => useVideoAnalysis());

      let track: SubtitleTrack | null = null;
      
      await act(async () => {
        track = await result.current.parseSubtitleContent('invalid content');
      });

      expect(track).toBe(null);
      expect(result.current.subtitleTrack).toBe(null);
    });

    it('should handle parsing errors', async () => {
      mockParseSubtitle.mockImplementation(() => {
        throw new Error('Parse error');
      });

      const { result } = renderHook(() => useVideoAnalysis());

      let track: SubtitleTrack | null = null;
      
      await act(async () => {
        track = await result.current.parseSubtitleContent('content');
      });

      expect(track).toBe(null);
    });
  });

  describe('Utility Functions', () => {
    it('should search cues by text', async () => {
      const { result } = renderHook(() => useVideoAnalysis());
      
      // Mock subtitleTrack by simulating successful extraction
      mockGetVideoSubtitles.mockResolvedValue({
        success: true,
        track: mockSubtitleTrack,
      });

      await act(async () => {
        await result.current.extractSubtitles(mockVideoPath);
      });

      // Search should work after extraction
      const searchResults = result.current.searchCues('hello');
      expect(searchResults).toHaveLength(1);
      expect(searchResults[0].text).toBe('Hello, world!');
    });

    it('should search cues case-insensitively', async () => {
      const { result } = renderHook(() => useVideoAnalysis());
      
      // Mock subtitleTrack by simulating successful extraction
      mockGetVideoSubtitles.mockResolvedValue({
        success: true,
        track: mockSubtitleTrack,
      });

      await act(async () => {
        await result.current.extractSubtitles(mockVideoPath);
      });

      const searchResults = result.current.searchCues('TEST');
      expect(searchResults).toHaveLength(1);
      expect(searchResults[0].text).toBe('This is a test subtitle.');
    });

    it('should return empty array for search when no subtitle track', () => {
      const { result } = renderHook(() => useVideoAnalysis());

      const searchResults = result.current.searchCues('hello');
      expect(searchResults).toHaveLength(0);
    });

    it('should get cue at specific time', async () => {
      const { result } = renderHook(() => useVideoAnalysis());
      
      // Mock subtitleTrack by simulating successful extraction
      mockGetVideoSubtitles.mockResolvedValue({
        success: true,
        track: mockSubtitleTrack,
      });

      await act(async () => {
        await result.current.extractSubtitles(mockVideoPath);
      });

      const cue = result.current.getCueAtTime(2000);
      expect(cue).toEqual(mockSubtitleTrack.cues[0]);
    });

    it('should return null for time outside cue range', async () => {
      const { result } = renderHook(() => useVideoAnalysis());
      
      // Mock subtitleTrack by simulating successful extraction
      mockGetVideoSubtitles.mockResolvedValue({
        success: true,
        track: mockSubtitleTrack,
      });

      await act(async () => {
        await result.current.extractSubtitles(mockVideoPath);
      });

      const cue = result.current.getCueAtTime(4500);
      expect(cue).toBe(null);
    });

    it('should return null when getting cue at time with no subtitle track', () => {
      const { result } = renderHook(() => useVideoAnalysis());

      const cue = result.current.getCueAtTime(2000);
      expect(cue).toBe(null);
    });

    it('should get plain text from subtitle track', async () => {
      const { result } = renderHook(() => useVideoAnalysis());
      
      // Mock subtitleTrack by simulating successful extraction
      mockGetVideoSubtitles.mockResolvedValue({
        success: true,
        track: mockSubtitleTrack,
      });

      await act(async () => {
        await result.current.extractSubtitles(mockVideoPath);
      });

      const plainText = result.current.getPlainText();
      expect(plainText).toBe('Hello, world! This is a test subtitle.');
    });

    it('should return transcript when no subtitle track', async () => {
      const { result } = renderHook(() => useVideoAnalysis());
      
      // Mock transcription to set transcript but no subtitle track
      mockTranscribeVideo.mockResolvedValue({
        success: true,
        text: 'Fallback transcript',
      });

      await act(async () => {
        await result.current.transcribeVideo(mockVideoPath);
      });

      const plainText = result.current.getPlainText();
      expect(plainText).toBe('Fallback transcript');
    });

    it('should return empty string when no subtitle track or transcript', () => {
      const { result } = renderHook(() => useVideoAnalysis());

      const plainText = result.current.getPlainText();
      expect(plainText).toBe('');
    });
  });

  describe('reset', () => {
    it('should reset all state', async () => {
      const { result } = renderHook(() => useVideoAnalysis());

      // Set some state through successful operations
      mockGetVideoSubtitleInfo.mockResolvedValue(mockSubtitleInfo);
      mockGetVideoSubtitles.mockResolvedValue({
        success: true,
        track: mockSubtitleTrack,
      });
      mockAnalyzeVideoContent.mockResolvedValue(mockAnalysisResult);

      await act(async () => {
        await result.current.getSubtitleInfo(mockVideoPath);
        await result.current.extractSubtitles(mockVideoPath);
        await result.current.analyzeVideo(mockVideoPath);
      });

      // Verify state is set
      expect(result.current.subtitleInfo).toEqual(mockSubtitleInfo);
      expect(result.current.subtitleTrack).toEqual(mockSubtitleTrack);
      expect(result.current.analysisResult).toEqual(mockAnalysisResult);

      // Reset
      act(() => {
        result.current.reset();
      });

      expect(result.current.subtitleInfo).toBe(null);
      expect(result.current.subtitleTrack).toBe(null);
      expect(result.current.transcript).toBe(null);
      expect(result.current.analysisResult).toBe(null);
      expect(result.current.error).toBe(null);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isTranscribing).toBe(false);
      expect(result.current.isAnalyzing).toBe(false);
    });
  });

  describe('Loading States', () => {
    it('should set loading state during subtitle info extraction', async () => {
      let resolvePromise: (value: VideoSubtitleInfo) => void;
      const promise = new Promise<VideoSubtitleInfo>((resolve) => {
        resolvePromise = resolve;
      });
      mockGetVideoSubtitleInfo.mockReturnValue(promise);

      const { result } = renderHook(() => useVideoAnalysis());

      act(() => {
        result.current.getSubtitleInfo(mockVideoPath);
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolvePromise!(mockSubtitleInfo);
        await promise;
      });

      expect(result.current.isLoading).toBe(false);
    });

    it('should set transcribing state during transcription', async () => {
      let resolvePromise: (value: TranscriptionResult) => void;
      const promise = new Promise<TranscriptionResult>((resolve) => {
        resolvePromise = resolve;
      });
      mockTranscribeVideo.mockReturnValue(promise);

      const { result } = renderHook(() => useVideoAnalysis());

      act(() => {
        result.current.transcribeVideo(mockVideoPath);
      });

      expect(result.current.isTranscribing).toBe(true);

      await act(async () => {
        resolvePromise!(mockTranscriptionResult);
        await promise;
      });

      expect(result.current.isTranscribing).toBe(false);
    });

    it('should set analyzing state during analysis', async () => {
      let resolvePromise: (value: VideoAnalysisResult) => void;
      const promise = new Promise<VideoAnalysisResult>((resolve) => {
        resolvePromise = resolve;
      });
      mockAnalyzeVideoContent.mockReturnValue(promise);

      const { result } = renderHook(() => useVideoAnalysis());

      act(() => {
        result.current.analyzeVideo(mockVideoPath);
      });

      expect(result.current.isAnalyzing).toBe(true);

      await act(async () => {
        resolvePromise!(mockAnalysisResult);
        await promise;
      });

      expect(result.current.isAnalyzing).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should clear error on successful operation', async () => {
      // First call fails
      mockGetVideoSubtitleInfo.mockRejectedValueOnce(new Error('First error'));
      // Second call succeeds
      mockGetVideoSubtitleInfo.mockResolvedValueOnce(mockSubtitleInfo);

      const { result } = renderHook(() => useVideoAnalysis());

      // First call - should set error
      await act(async () => {
        await result.current.getSubtitleInfo(mockVideoPath);
      });
      expect(result.current.error).toBe('First error');

      // Second call - should clear error
      await act(async () => {
        await result.current.getSubtitleInfo(mockVideoPath);
      });
      expect(result.current.error).toBe(null);
    });
  });

  describe('Callback Integration', () => {
    it('should call all appropriate callbacks during complete workflow', async () => {
      mockGetVideoSubtitles.mockResolvedValue({
        success: true,
        track: mockSubtitleTrack,
      });
      
      mockTranscribeVideo.mockResolvedValue(mockTranscriptionResult);
      mockAnalyzeVideoContent.mockResolvedValue(mockAnalysisResult);

      const onSubtitlesExtracted = jest.fn();
      const onTranscriptionComplete = jest.fn();
      const onAnalysisComplete = jest.fn();

      const { result } = renderHook(() => useVideoAnalysis({
        onSubtitlesExtracted,
        onTranscriptionComplete,
        onAnalysisComplete,
      }));

      // Extract subtitles
      await act(async () => {
        await result.current.extractSubtitles(mockVideoPath);
      });
      expect(onSubtitlesExtracted).toHaveBeenCalledWith(mockSubtitleTrack);

      // Transcribe
      await act(async () => {
        await result.current.transcribeVideo(mockVideoPath);
      });
      expect(onTranscriptionComplete).toHaveBeenCalledWith(mockTranscriptionResult);

      // Analyze
      await act(async () => {
        await result.current.analyzeVideo(mockVideoPath);
      });
      expect(onAnalysisComplete).toHaveBeenCalledWith(mockAnalysisResult);
    });
  });
});
