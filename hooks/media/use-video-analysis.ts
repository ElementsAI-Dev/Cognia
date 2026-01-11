/**
 * useVideoAnalysis - Hook for video subtitle extraction and analysis
 * 
 * Provides functionality to:
 * - Extract subtitles from video files
 * - Transcribe videos using Whisper when no subtitles
 * - Analyze video content with AI
 */

import { useState, useCallback } from 'react';
import { useSettingsStore } from '@/stores';
import type {
  SubtitleTrack,
  SubtitleCue,
  VideoSubtitleInfo,
  VideoAnalysisResult,
  TranscriptionResult,
} from '@/types/media/subtitle';

export interface UseVideoAnalysisOptions {
  /** Preferred language for subtitles/transcription */
  language?: string;
  /** Whether to transcribe if no subtitles found */
  transcribeIfMissing?: boolean;
  /** Custom analysis prompt */
  customPrompt?: string;
  /** Callback when subtitles are extracted */
  onSubtitlesExtracted?: (track: SubtitleTrack) => void;
  /** Callback when transcription completes */
  onTranscriptionComplete?: (result: TranscriptionResult) => void;
  /** Callback when analysis completes */
  onAnalysisComplete?: (result: VideoAnalysisResult) => void;
}

export interface UseVideoAnalysisReturn {
  // State
  isLoading: boolean;
  isTranscribing: boolean;
  isAnalyzing: boolean;
  error: string | null;
  
  // Data
  subtitleInfo: VideoSubtitleInfo | null;
  subtitleTrack: SubtitleTrack | null;
  transcript: string | null;
  analysisResult: VideoAnalysisResult | null;
  
  // Actions
  getSubtitleInfo: (videoPath: string) => Promise<VideoSubtitleInfo | null>;
  extractSubtitles: (videoPath: string) => Promise<SubtitleTrack | null>;
  transcribeVideo: (videoPath: string) => Promise<TranscriptionResult | null>;
  analyzeVideo: (videoPath: string, type?: 'summary' | 'transcript' | 'key-moments' | 'qa' | 'full') => Promise<VideoAnalysisResult | null>;
  parseSubtitleContent: (content: string, format?: string) => Promise<SubtitleTrack | null>;
  
  // Utilities
  searchCues: (query: string) => SubtitleCue[];
  getCueAtTime: (timeMs: number) => SubtitleCue | null;
  getPlainText: () => string;
  reset: () => void;
}

export function useVideoAnalysis(options: UseVideoAnalysisOptions = {}): UseVideoAnalysisReturn {
  const {
    language = 'en',
    transcribeIfMissing = true,
    customPrompt,
    onSubtitlesExtracted,
    onTranscriptionComplete,
    onAnalysisComplete,
  } = options;

  // Get API key for Whisper (OpenAI)
  const providerSettings = useSettingsStore((state) => state.providerSettings);
  const getApiKey = useCallback((): string => {
    // Use OpenAI API key for Whisper
    return providerSettings.openai?.apiKey || '';
  }, [providerSettings]);

  // State
  const [isLoading, setIsLoading] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subtitleInfo, setSubtitleInfo] = useState<VideoSubtitleInfo | null>(null);
  const [subtitleTrack, setSubtitleTrack] = useState<SubtitleTrack | null>(null);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<VideoAnalysisResult | null>(null);

  // Dynamic imports to avoid SSR issues
  const getVideoSubtitleModule = useCallback(async () => {
    return import('@/lib/media/video-subtitle');
  }, []);

  // Get subtitle info from video
  const getSubtitleInfo = useCallback(async (videoPath: string): Promise<VideoSubtitleInfo | null> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { getVideoSubtitleInfo } = await getVideoSubtitleModule();
      const info = await getVideoSubtitleInfo(videoPath);
      setSubtitleInfo(info);
      return info;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get subtitle info';
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [getVideoSubtitleModule]);

  // Extract subtitles from video
  const extractSubtitles = useCallback(async (videoPath: string): Promise<SubtitleTrack | null> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const apiKey = getApiKey();
      const { getVideoSubtitles } = await getVideoSubtitleModule();
      
      const result = await getVideoSubtitles(videoPath, apiKey, {
        preferredLanguage: language,
        transcribeIfMissing,
      });
      
      if (result.success && result.track) {
        setSubtitleTrack(result.track);
        setTranscript(result.track.cues.map(c => c.text).join(' '));
        onSubtitlesExtracted?.(result.track);
        return result.track;
      }
      
      setError(result.error || 'Failed to extract subtitles');
      return null;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to extract subtitles';
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [getVideoSubtitleModule, getApiKey, language, transcribeIfMissing, onSubtitlesExtracted]);

  // Transcribe video using Whisper
  const transcribeVideo = useCallback(async (videoPath: string): Promise<TranscriptionResult | null> => {
    const apiKey = getApiKey();
    
    if (!apiKey) {
      setError('OpenAI API key required for transcription');
      return null;
    }
    
    setIsTranscribing(true);
    setError(null);
    
    try {
      const { transcribeVideo: transcribe } = await getVideoSubtitleModule();
      
      const result = await transcribe(videoPath, apiKey, {
        language,
        includeTimestamps: true,
      });
      
      if (result.success) {
        if (result.subtitleTrack) {
          setSubtitleTrack(result.subtitleTrack);
        }
        if (result.text) {
          setTranscript(result.text);
        }
        onTranscriptionComplete?.(result);
        return result;
      }
      
      setError(result.error || 'Transcription failed');
      return null;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Transcription failed';
      setError(message);
      return null;
    } finally {
      setIsTranscribing(false);
    }
  }, [getVideoSubtitleModule, getApiKey, language, onTranscriptionComplete]);

  // Analyze video content
  const analyzeVideo = useCallback(async (
    videoPath: string,
    type: 'summary' | 'transcript' | 'key-moments' | 'qa' | 'full' = 'summary'
  ): Promise<VideoAnalysisResult | null> => {
    const apiKey = getApiKey();
    
    setIsAnalyzing(true);
    setError(null);
    
    try {
      const { analyzeVideoContent } = await getVideoSubtitleModule();
      
      const result = await analyzeVideoContent(
        {
          videoPath,
          analysisType: type,
          language,
          customPrompt,
          useSubtitles: true,
          transcribeIfNeeded: transcribeIfMissing,
        },
        apiKey
      );
      
      if (result.success) {
        setAnalysisResult(result);
        if (result.transcript) {
          setTranscript(result.transcript);
        }
        onAnalysisComplete?.(result);
        return result;
      }
      
      setError(result.error || 'Analysis failed');
      return null;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Analysis failed';
      setError(message);
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  }, [getVideoSubtitleModule, getApiKey, language, customPrompt, transcribeIfMissing, onAnalysisComplete]);

  // Parse subtitle content directly
  const parseSubtitleContent = useCallback(async (content: string, _format?: string): Promise<SubtitleTrack | null> => {
    try {
      const { parseSubtitle } = await import('@/lib/media/subtitle-parser');
      const result = parseSubtitle(content, language);
      
      if (result.tracks.length > 0) {
        const track = result.tracks[0];
        setSubtitleTrack(track);
        setTranscript(track.cues.map((c: SubtitleCue) => c.text).join(' '));
        return track;
      }
      
      return null;
    } catch {
      return null;
    }
  }, [language]);

  // Search cues by text
  const searchCues = useCallback((query: string): SubtitleCue[] => {
    if (!subtitleTrack) return [];
    
    const lowerQuery = query.toLowerCase();
    return subtitleTrack.cues.filter(cue => 
      cue.text.toLowerCase().includes(lowerQuery)
    );
  }, [subtitleTrack]);

  // Get cue at specific time
  const getCueAtTime = useCallback((timeMs: number): SubtitleCue | null => {
    if (!subtitleTrack) return null;
    
    return subtitleTrack.cues.find(cue => 
      timeMs >= cue.startTime && timeMs <= cue.endTime
    ) || null;
  }, [subtitleTrack]);

  // Get plain text from all cues
  const getPlainText = useCallback((): string => {
    if (!subtitleTrack) return transcript || '';
    return subtitleTrack.cues.map(c => c.text).join(' ');
  }, [subtitleTrack, transcript]);

  // Reset state
  const reset = useCallback(() => {
    setIsLoading(false);
    setIsTranscribing(false);
    setIsAnalyzing(false);
    setError(null);
    setSubtitleInfo(null);
    setSubtitleTrack(null);
    setTranscript(null);
    setAnalysisResult(null);
  }, []);

  return {
    // State
    isLoading,
    isTranscribing,
    isAnalyzing,
    error,
    
    // Data
    subtitleInfo,
    subtitleTrack,
    transcript,
    analysisResult,
    
    // Actions
    getSubtitleInfo,
    extractSubtitles,
    transcribeVideo,
    analyzeVideo,
    parseSubtitleContent,
    
    // Utilities
    searchCues,
    getCueAtTime,
    getPlainText,
    reset,
  };
}

export default useVideoAnalysis;
