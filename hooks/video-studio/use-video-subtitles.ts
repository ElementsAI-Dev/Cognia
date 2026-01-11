/**
 * useVideoSubtitles - Hook for managing video subtitles in the video editor
 * 
 * Integrates with existing subtitle functionality to provide:
 * - Subtitle track management
 * - Subtitle extraction from video
 * - AI transcription via Whisper
 * - Subtitle editing and synchronization
 * - Export in multiple formats
 */

import { useState, useCallback, useMemo } from 'react';
import { useSettingsStore } from '@/stores';
import type {
  SubtitleTrack,
  SubtitleCue,
  SubtitleFormat,
  VideoSubtitleInfo,
  TranscriptionResult,
} from '@/types/media/subtitle';

export interface SubtitleClip {
  id: string;
  trackId: string;
  cue: SubtitleCue;
  isSelected: boolean;
  isEditing: boolean;
}

export interface SubtitleTrackState {
  id: string;
  name: string;
  language: string;
  format: SubtitleFormat;
  isDefault: boolean;
  isVisible: boolean;
  isLocked: boolean;
  cues: SubtitleCue[];
  source?: string;
  style?: SubtitleTrackStyle;
}

export interface SubtitleTrackStyle {
  fontFamily: string;
  fontSize: number;
  color: string;
  backgroundColor: string;
  position: 'top' | 'middle' | 'bottom';
  align: 'left' | 'center' | 'right';
}

export interface UseVideoSubtitlesOptions {
  videoPath?: string;
  language?: string;
  autoExtract?: boolean;
  onSubtitlesLoaded?: (tracks: SubtitleTrackState[]) => void;
  onSubtitleChange?: (cue: SubtitleCue) => void;
  onError?: (error: string) => void;
}

export interface UseVideoSubtitlesReturn {
  // State
  isLoading: boolean;
  isExtracting: boolean;
  isTranscribing: boolean;
  error: string | null;
  
  // Subtitle tracks
  tracks: SubtitleTrackState[];
  activeTrackId: string | null;
  activeTrack: SubtitleTrackState | null;
  
  // Current cue (for video playback sync)
  currentCue: SubtitleCue | null;
  
  // Track management
  addTrack: (track: Omit<SubtitleTrackState, 'id'>) => string;
  removeTrack: (trackId: string) => void;
  updateTrack: (trackId: string, updates: Partial<SubtitleTrackState>) => void;
  setActiveTrack: (trackId: string | null) => void;
  duplicateTrack: (trackId: string) => string;
  
  // Cue management
  addCue: (trackId: string, cue: Omit<SubtitleCue, 'id' | 'index'>) => string;
  removeCue: (trackId: string, cueId: string) => void;
  updateCue: (trackId: string, cueId: string, updates: Partial<SubtitleCue>) => void;
  splitCue: (trackId: string, cueId: string, atTime: number) => string[];
  mergeCues: (trackId: string, cueIds: string[]) => string;
  
  // Time-based operations
  getCueAtTime: (trackId: string, timeMs: number) => SubtitleCue | null;
  getCuesInRange: (trackId: string, startMs: number, endMs: number) => SubtitleCue[];
  shiftCues: (trackId: string, offsetMs: number, cueIds?: string[]) => void;
  syncToPlayhead: (trackId: string, cueId: string, timeMs: number) => void;
  
  // Extraction and transcription
  extractFromVideo: (videoPath: string) => Promise<SubtitleTrackState[] | null>;
  transcribeVideo: (videoPath: string) => Promise<SubtitleTrackState | null>;
  loadFromFile: (content: string, format?: SubtitleFormat) => Promise<SubtitleTrackState | null>;
  
  // Export
  exportTrack: (trackId: string, format: SubtitleFormat) => string;
  exportAllTracks: (format: SubtitleFormat) => Record<string, string>;
  
  // Utilities
  searchCues: (query: string, trackId?: string) => SubtitleCue[];
  getPlainText: (trackId: string) => string;
  validateTrack: (trackId: string) => { isValid: boolean; errors: string[] };
  reset: () => void;
}

// Generate unique ID
function generateId(): string {
  return `subtitle-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function useVideoSubtitles(options: UseVideoSubtitlesOptions = {}): UseVideoSubtitlesReturn {
  const {
    language = 'en',
    onSubtitlesLoaded,
    onSubtitleChange,
    onError,
  } = options;

  // Get API key for Whisper
  const providerSettings = useSettingsStore((state) => state.providerSettings);
  const getApiKey = useCallback((): string => {
    return providerSettings.openai?.apiKey || '';
  }, [providerSettings]);

  // State
  const [isLoading, setIsLoading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tracks, setTracks] = useState<SubtitleTrackState[]>([]);
  const [activeTrackId, setActiveTrackId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);

  // Computed
  const activeTrack = useMemo(() => {
    return tracks.find(t => t.id === activeTrackId) || null;
  }, [tracks, activeTrackId]);

  const currentCue = useMemo(() => {
    if (!activeTrack) return null;
    return activeTrack.cues.find(
      cue => cue.startTime <= currentTime && cue.endTime >= currentTime
    ) || null;
  }, [activeTrack, currentTime]);

  // Dynamic imports
  const getSubtitleModule = useCallback(async () => {
    return import('@/lib/media/video-subtitle');
  }, []);

  const getParserModule = useCallback(async () => {
    return import('@/lib/media/subtitle-parser');
  }, []);

  // Track management
  const addTrack = useCallback((track: Omit<SubtitleTrackState, 'id'>): string => {
    const id = generateId();
    const newTrack: SubtitleTrackState = {
      ...track,
      id,
    };
    setTracks(prev => [...prev, newTrack]);
    if (!activeTrackId) {
      setActiveTrackId(id);
    }
    return id;
  }, [activeTrackId]);

  const removeTrack = useCallback((trackId: string) => {
    setTracks(prev => prev.filter(t => t.id !== trackId));
    if (activeTrackId === trackId) {
      setActiveTrackId(null);
    }
  }, [activeTrackId]);

  const updateTrack = useCallback((trackId: string, updates: Partial<SubtitleTrackState>) => {
    setTracks(prev => prev.map(t => 
      t.id === trackId ? { ...t, ...updates } : t
    ));
  }, []);

  const setActiveTrack = useCallback((trackId: string | null) => {
    setActiveTrackId(trackId);
  }, []);

  const duplicateTrack = useCallback((trackId: string): string => {
    const track = tracks.find(t => t.id === trackId);
    if (!track) return '';
    
    const newId = generateId();
    const newTrack: SubtitleTrackState = {
      ...track,
      id: newId,
      name: `${track.name} (Copy)`,
      cues: track.cues.map(cue => ({
        ...cue,
        id: generateId(),
      })),
    };
    setTracks(prev => [...prev, newTrack]);
    return newId;
  }, [tracks]);

  // Cue management
  const addCue = useCallback((trackId: string, cue: Omit<SubtitleCue, 'id' | 'index'>): string => {
    const id = generateId();
    setTracks(prev => prev.map(track => {
      if (track.id !== trackId) return track;
      
      const newCue: SubtitleCue = {
        ...cue,
        id,
        index: track.cues.length + 1,
      };
      
      // Insert in sorted order by startTime
      const cues = [...track.cues, newCue].sort((a, b) => a.startTime - b.startTime);
      // Re-index
      cues.forEach((c, i) => { c.index = i + 1; });
      
      return { ...track, cues };
    }));
    return id;
  }, []);

  const removeCue = useCallback((trackId: string, cueId: string) => {
    setTracks(prev => prev.map(track => {
      if (track.id !== trackId) return track;
      
      const cues = track.cues.filter(c => c.id !== cueId);
      // Re-index
      cues.forEach((c, i) => { c.index = i + 1; });
      
      return { ...track, cues };
    }));
  }, []);

  const updateCue = useCallback((trackId: string, cueId: string, updates: Partial<SubtitleCue>) => {
    setTracks(prev => prev.map(track => {
      if (track.id !== trackId) return track;
      
      const cues = track.cues.map(c => 
        c.id === cueId ? { ...c, ...updates } : c
      );
      
      // Re-sort if time changed
      if (updates.startTime !== undefined) {
        cues.sort((a, b) => a.startTime - b.startTime);
        cues.forEach((c, i) => { c.index = i + 1; });
      }
      
      const updatedCue = cues.find(c => c.id === cueId);
      if (updatedCue) {
        onSubtitleChange?.(updatedCue);
      }
      
      return { ...track, cues };
    }));
  }, [onSubtitleChange]);

  const splitCue = useCallback((trackId: string, cueId: string, atTime: number): string[] => {
    const track = tracks.find(t => t.id === trackId);
    const cue = track?.cues.find(c => c.id === cueId);
    if (!cue || atTime <= cue.startTime || atTime >= cue.endTime) return [];

    const firstId = cueId;
    const secondId = generateId();
    
    // Split text roughly in half at the time point
    const ratio = (atTime - cue.startTime) / (cue.endTime - cue.startTime);
    const words = cue.text.split(' ');
    const splitIndex = Math.floor(words.length * ratio);
    
    setTracks(prev => prev.map(t => {
      if (t.id !== trackId) return t;
      
      const cues = t.cues.flatMap(c => {
        if (c.id !== cueId) return [c];
        
        return [
          {
            ...c,
            endTime: atTime,
            text: words.slice(0, splitIndex).join(' '),
          },
          {
            ...c,
            id: secondId,
            startTime: atTime,
            text: words.slice(splitIndex).join(' '),
          },
        ];
      });
      
      cues.forEach((c, i) => { c.index = i + 1; });
      return { ...t, cues };
    }));
    
    return [firstId, secondId];
  }, [tracks]);

  const mergeCues = useCallback((trackId: string, cueIds: string[]): string => {
    if (cueIds.length < 2) return cueIds[0] || '';
    
    const track = tracks.find(t => t.id === trackId);
    if (!track) return '';
    
    const cuesToMerge = track.cues
      .filter(c => cueIds.includes(c.id))
      .sort((a, b) => a.startTime - b.startTime);
    
    if (cuesToMerge.length < 2) return cueIds[0] || '';
    
    const mergedId = cuesToMerge[0].id;
    
    setTracks(prev => prev.map(t => {
      if (t.id !== trackId) return t;
      
      const cues = t.cues.filter(c => !cueIds.includes(c.id) || c.id === mergedId);
      const mergedCue = cues.find(c => c.id === mergedId);
      
      if (mergedCue) {
        mergedCue.endTime = cuesToMerge[cuesToMerge.length - 1].endTime;
        mergedCue.text = cuesToMerge.map(c => c.text).join(' ');
      }
      
      cues.forEach((c, i) => { c.index = i + 1; });
      return { ...t, cues };
    }));
    
    return mergedId;
  }, [tracks]);

  // Time-based operations
  const getCueAtTime = useCallback((trackId: string, timeMs: number): SubtitleCue | null => {
    const track = tracks.find(t => t.id === trackId);
    if (!track) return null;
    
    return track.cues.find(
      cue => cue.startTime <= timeMs && cue.endTime >= timeMs
    ) || null;
  }, [tracks]);

  const getCuesInRange = useCallback((trackId: string, startMs: number, endMs: number): SubtitleCue[] => {
    const track = tracks.find(t => t.id === trackId);
    if (!track) return [];
    
    return track.cues.filter(
      cue => cue.startTime < endMs && cue.endTime > startMs
    );
  }, [tracks]);

  const shiftCues = useCallback((trackId: string, offsetMs: number, cueIds?: string[]) => {
    setTracks(prev => prev.map(track => {
      if (track.id !== trackId) return track;
      
      const cues = track.cues.map(cue => {
        if (cueIds && !cueIds.includes(cue.id)) return cue;
        
        return {
          ...cue,
          startTime: Math.max(0, cue.startTime + offsetMs),
          endTime: Math.max(0, cue.endTime + offsetMs),
        };
      });
      
      return { ...track, cues };
    }));
  }, []);

  const syncToPlayhead = useCallback((trackId: string, cueId: string, timeMs: number) => {
    const track = tracks.find(t => t.id === trackId);
    const cue = track?.cues.find(c => c.id === cueId);
    if (!cue) return;
    
    const duration = cue.endTime - cue.startTime;
    updateCue(trackId, cueId, {
      startTime: timeMs,
      endTime: timeMs + duration,
    });
  }, [tracks, updateCue]);

  // Extraction and transcription
  const extractFromVideo = useCallback(async (videoPath: string): Promise<SubtitleTrackState[] | null> => {
    setIsExtracting(true);
    setError(null);
    
    try {
      const { getVideoSubtitleInfo, extractSubtitles } = await getSubtitleModule();
      const { parseSubtitle } = await getParserModule();
      
      // Get subtitle info
      const info: VideoSubtitleInfo = await getVideoSubtitleInfo(videoPath);
      
      if (!info.hasEmbeddedSubtitles && !info.hasExternalSubtitles) {
        setError('No subtitles found in video');
        return null;
      }
      
      // Extract subtitles
      const result = await extractSubtitles({
        videoPath,
        outputFormat: 'srt',
      });
      
      if (!result.success) {
        setError(result.error || 'Failed to extract subtitles');
        return null;
      }
      
      // Parse extracted files and create tracks
      const newTracks: SubtitleTrackState[] = [];
      
      for (const file of result.extractedFiles) {
        // Read and parse file content
        const response = await fetch(`file://${file.filePath}`);
        const content = await response.text();
        const parsed = parseSubtitle(content, file.language || language);
        
        if (parsed.tracks.length > 0) {
          const track = parsed.tracks[0];
          newTracks.push({
            id: generateId(),
            name: file.language ? `Subtitles (${file.language})` : 'Subtitles',
            language: file.language || language,
            format: file.format,
            isDefault: newTracks.length === 0,
            isVisible: true,
            isLocked: false,
            cues: track.cues,
            source: file.filePath,
          });
        }
      }
      
      setTracks(prev => [...prev, ...newTracks]);
      if (newTracks.length > 0 && !activeTrackId) {
        setActiveTrackId(newTracks[0].id);
      }
      
      onSubtitlesLoaded?.(newTracks);
      return newTracks;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to extract subtitles';
      setError(message);
      onError?.(message);
      return null;
    } finally {
      setIsExtracting(false);
    }
  }, [getSubtitleModule, getParserModule, language, activeTrackId, onSubtitlesLoaded, onError]);

  const transcribeVideo = useCallback(async (videoPath: string): Promise<SubtitleTrackState | null> => {
    const apiKey = getApiKey();
    
    if (!apiKey) {
      const message = 'OpenAI API key required for transcription';
      setError(message);
      onError?.(message);
      return null;
    }
    
    setIsTranscribing(true);
    setError(null);
    
    try {
      const { transcribeVideo: transcribe } = await getSubtitleModule();
      
      const result: TranscriptionResult = await transcribe(videoPath, apiKey, {
        language,
        includeTimestamps: true,
      });
      
      if (!result.success || !result.subtitleTrack) {
        setError(result.error || 'Transcription failed');
        return null;
      }
      
      const newTrack: SubtitleTrackState = {
        id: generateId(),
        name: `Transcription (${result.language || language})`,
        language: result.language || language,
        format: 'srt',
        isDefault: tracks.length === 0,
        isVisible: true,
        isLocked: false,
        cues: result.subtitleTrack.cues,
      };
      
      setTracks(prev => [...prev, newTrack]);
      if (!activeTrackId) {
        setActiveTrackId(newTrack.id);
      }
      
      onSubtitlesLoaded?.([newTrack]);
      return newTrack;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Transcription failed';
      setError(message);
      onError?.(message);
      return null;
    } finally {
      setIsTranscribing(false);
    }
  }, [getApiKey, getSubtitleModule, language, tracks.length, activeTrackId, onSubtitlesLoaded, onError]);

  const loadFromFile = useCallback(async (content: string, format?: SubtitleFormat): Promise<SubtitleTrackState | null> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { parseSubtitle, detectFormat } = await getParserModule();
      
      const detectedFormat = format || detectFormat(content);
      const parsed = parseSubtitle(content, language);
      
      if (parsed.errors.some(e => e.type === 'error')) {
        setError(parsed.errors.find(e => e.type === 'error')?.message || 'Parse error');
        return null;
      }
      
      if (parsed.tracks.length === 0) {
        setError('No subtitle tracks found');
        return null;
      }
      
      const track = parsed.tracks[0];
      const newTrack: SubtitleTrackState = {
        id: generateId(),
        name: `Imported (${detectedFormat})`,
        language: track.language || language,
        format: detectedFormat,
        isDefault: tracks.length === 0,
        isVisible: true,
        isLocked: false,
        cues: track.cues,
      };
      
      setTracks(prev => [...prev, newTrack]);
      if (!activeTrackId) {
        setActiveTrackId(newTrack.id);
      }
      
      return newTrack;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to parse subtitle file';
      setError(message);
      onError?.(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [getParserModule, language, tracks.length, activeTrackId, onError]);

  // Export
  const exportTrack = useCallback((trackId: string, format: SubtitleFormat): string => {
    const track = tracks.find(t => t.id === trackId);
    if (!track) return '';
    
    switch (format) {
      case 'srt':
        return track.cues.map((cue, i) => {
          const formatTime = (ms: number) => {
            const h = Math.floor(ms / 3600000);
            const m = Math.floor((ms % 3600000) / 60000);
            const s = Math.floor((ms % 60000) / 1000);
            const ms_ = ms % 1000;
            return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')},${ms_.toString().padStart(3, '0')}`;
          };
          return `${i + 1}\n${formatTime(cue.startTime)} --> ${formatTime(cue.endTime)}\n${cue.text}\n`;
        }).join('\n');
        
      case 'vtt':
        const header = 'WEBVTT\n\n';
        return header + track.cues.map((cue, i) => {
          const formatTime = (ms: number) => {
            const h = Math.floor(ms / 3600000);
            const m = Math.floor((ms % 3600000) / 60000);
            const s = Math.floor((ms % 60000) / 1000);
            const ms_ = ms % 1000;
            return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms_.toString().padStart(3, '0')}`;
          };
          return `${i + 1}\n${formatTime(cue.startTime)} --> ${formatTime(cue.endTime)}\n${cue.text}\n`;
        }).join('\n');
        
      default:
        return track.cues.map(c => c.text).join('\n');
    }
  }, [tracks]);

  const exportAllTracks = useCallback((format: SubtitleFormat): Record<string, string> => {
    const result: Record<string, string> = {};
    tracks.forEach(track => {
      result[track.id] = exportTrack(track.id, format);
    });
    return result;
  }, [tracks, exportTrack]);

  // Utilities
  const searchCues = useCallback((query: string, trackId?: string): SubtitleCue[] => {
    const searchTracks = trackId 
      ? tracks.filter(t => t.id === trackId)
      : tracks;
    
    const lowerQuery = query.toLowerCase();
    return searchTracks.flatMap(track =>
      track.cues.filter(cue => cue.text.toLowerCase().includes(lowerQuery))
    );
  }, [tracks]);

  const getPlainText = useCallback((trackId: string): string => {
    const track = tracks.find(t => t.id === trackId);
    if (!track) return '';
    return track.cues.map(c => c.text).join(' ');
  }, [tracks]);

  const validateTrack = useCallback((trackId: string): { isValid: boolean; errors: string[] } => {
    const track = tracks.find(t => t.id === trackId);
    if (!track) {
      return { isValid: false, errors: ['Track not found'] };
    }
    
    const errors: string[] = [];
    
    // Check for overlapping cues
    for (let i = 0; i < track.cues.length - 1; i++) {
      if (track.cues[i].endTime > track.cues[i + 1].startTime) {
        errors.push(`Cues ${i + 1} and ${i + 2} overlap`);
      }
    }
    
    // Check for empty cues
    track.cues.forEach((cue, i) => {
      if (!cue.text.trim()) {
        errors.push(`Cue ${i + 1} has empty text`);
      }
      if (cue.startTime >= cue.endTime) {
        errors.push(`Cue ${i + 1} has invalid timing`);
      }
    });
    
    return { isValid: errors.length === 0, errors };
  }, [tracks]);

  const reset = useCallback(() => {
    setTracks([]);
    setActiveTrackId(null);
    setError(null);
    setCurrentTime(0);
  }, []);

  return {
    // State
    isLoading,
    isExtracting,
    isTranscribing,
    error,
    
    // Tracks
    tracks,
    activeTrackId,
    activeTrack,
    currentCue,
    
    // Track management
    addTrack,
    removeTrack,
    updateTrack,
    setActiveTrack,
    duplicateTrack,
    
    // Cue management
    addCue,
    removeCue,
    updateCue,
    splitCue,
    mergeCues,
    
    // Time-based
    getCueAtTime,
    getCuesInRange,
    shiftCues,
    syncToPlayhead,
    
    // Extraction/Transcription
    extractFromVideo,
    transcribeVideo,
    loadFromFile,
    
    // Export
    exportTrack,
    exportAllTracks,
    
    // Utilities
    searchCues,
    getPlainText,
    validateTrack,
    reset,
  };
}

export type { SubtitleCue, SubtitleFormat, SubtitleTrack };
