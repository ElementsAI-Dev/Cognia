/**
 * Subtitle Types - Type definitions for video subtitle processing
 * 
 * Supports formats:
 * - SRT (SubRip Text)
 * - VTT (WebVTT)
 * - ASS/SSA (Advanced SubStation Alpha)
 */

export type SubtitleFormat = 'srt' | 'vtt' | 'ass' | 'ssa' | 'unknown';

export interface SubtitleCue {
  /** Unique identifier for the cue */
  id: string;
  /** Cue index (1-based for SRT) */
  index: number;
  /** Start time in milliseconds */
  startTime: number;
  /** End time in milliseconds */
  endTime: number;
  /** Subtitle text content */
  text: string;
  /** Speaker name if available */
  speaker?: string;
  /** Styling information */
  style?: SubtitleStyle;
}

export interface SubtitleStyle {
  /** Font family */
  fontFamily?: string;
  /** Font size */
  fontSize?: number;
  /** Text color (hex) */
  color?: string;
  /** Background color (hex) */
  backgroundColor?: string;
  /** Bold text */
  bold?: boolean;
  /** Italic text */
  italic?: boolean;
  /** Underline text */
  underline?: boolean;
  /** Text alignment */
  align?: 'left' | 'center' | 'right';
  /** Vertical position */
  position?: 'top' | 'middle' | 'bottom';
}

export interface SubtitleTrack {
  /** Track identifier */
  id: string;
  /** Track label/title */
  label: string;
  /** Language code (e.g., 'en', 'zh-CN') */
  language: string;
  /** Subtitle format */
  format: SubtitleFormat;
  /** Whether this is the default track */
  isDefault: boolean;
  /** Whether this track is for hearing impaired */
  isSDH: boolean;
  /** List of subtitle cues */
  cues: SubtitleCue[];
  /** Total duration in milliseconds */
  duration: number;
  /** Source file path or URL */
  source?: string;
}

export interface SubtitleMetadata {
  /** Title from subtitle file header */
  title?: string;
  /** Original script author */
  author?: string;
  /** Creation date */
  createdAt?: string;
  /** Video resolution (for ASS) */
  videoResolution?: { width: number; height: number };
  /** Custom metadata */
  custom?: Record<string, string>;
}

export interface ParsedSubtitle {
  /** Detected format */
  format: SubtitleFormat;
  /** Subtitle tracks */
  tracks: SubtitleTrack[];
  /** Metadata from file header */
  metadata: SubtitleMetadata;
  /** Raw content */
  rawContent: string;
  /** Parse errors/warnings */
  errors: SubtitleParseError[];
}

export interface SubtitleParseError {
  /** Error type */
  type: 'warning' | 'error';
  /** Error message */
  message: string;
  /** Line number where error occurred */
  line?: number;
  /** Cue index where error occurred */
  cueIndex?: number;
}

export interface VideoSubtitleInfo {
  /** Whether video has embedded subtitles */
  hasEmbeddedSubtitles: boolean;
  /** List of embedded subtitle tracks */
  embeddedTracks: EmbeddedSubtitleTrack[];
  /** Whether external subtitle file was found */
  hasExternalSubtitles: boolean;
  /** External subtitle file paths */
  externalFiles: string[];
}

export interface EmbeddedSubtitleTrack {
  /** Stream index in the video file */
  streamIndex: number;
  /** Codec name (e.g., 'subrip', 'ass', 'mov_text') */
  codec: string;
  /** Language code */
  language?: string;
  /** Track title */
  title?: string;
  /** Whether this is the default track */
  isDefault: boolean;
  /** Whether this is forced subtitles */
  isForced: boolean;
}

export interface SubtitleExtractionOptions {
  /** Video file path */
  videoPath: string;
  /** Output directory for extracted subtitles */
  outputDir?: string;
  /** Track indices to extract (empty = all) */
  trackIndices?: number[];
  /** Output format */
  outputFormat?: SubtitleFormat;
  /** Whether to include styling */
  includeStyles?: boolean;
}

export interface SubtitleExtractionResult {
  /** Whether extraction was successful */
  success: boolean;
  /** Extracted subtitle files */
  extractedFiles: ExtractedSubtitleFile[];
  /** Error message if failed */
  error?: string;
}

export interface ExtractedSubtitleFile {
  /** Stream index */
  streamIndex: number;
  /** Output file path */
  filePath: string;
  /** Subtitle format */
  format: SubtitleFormat;
  /** Language code */
  language?: string;
  /** Number of cues */
  cueCount: number;
}

export interface TranscriptionOptions {
  /** Video/audio file path */
  filePath: string;
  /** Language hint for transcription */
  language?: string;
  /** Prompt to guide transcription */
  prompt?: string;
  /** Model to use */
  model?: 'whisper-1' | 'whisper-large-v3';
  /** Whether to include timestamps */
  includeTimestamps?: boolean;
  /** Whether to detect speakers */
  detectSpeakers?: boolean;
  /** Translation target language */
  translateTo?: string;
}

export interface TranscriptionResult {
  /** Whether transcription was successful */
  success: boolean;
  /** Full transcription text */
  text?: string;
  /** Detected language */
  language?: string;
  /** Duration in seconds */
  duration?: number;
  /** Timestamped segments */
  segments?: TranscriptionSegment[];
  /** Generated subtitle track */
  subtitleTrack?: SubtitleTrack;
  /** Error message if failed */
  error?: string;
}

export interface TranscriptionSegment {
  /** Segment ID */
  id: number;
  /** Start time in seconds */
  start: number;
  /** End time in seconds */
  end: number;
  /** Segment text */
  text: string;
  /** Confidence score (0-1) */
  confidence?: number;
  /** Detected speaker */
  speaker?: string;
  /** Word-level timestamps */
  words?: WordTimestamp[];
}

export interface WordTimestamp {
  /** Word text */
  word: string;
  /** Start time in seconds */
  start: number;
  /** End time in seconds */
  end: number;
  /** Confidence score */
  confidence?: number;
}

export interface VideoAnalysisInput {
  /** Video file path or URL */
  videoPath: string;
  /** Analysis type */
  analysisType: 'summary' | 'transcript' | 'key-moments' | 'qa' | 'full';
  /** Language for output */
  language?: string;
  /** Custom analysis prompt */
  customPrompt?: string;
  /** Whether to extract and use subtitles */
  useSubtitles?: boolean;
  /** Whether to transcribe if no subtitles */
  transcribeIfNeeded?: boolean;
  /** Time range to analyze (in seconds) */
  timeRange?: { start: number; end: number };
}

export interface VideoAnalysisResult {
  /** Whether analysis was successful */
  success: boolean;
  /** Video duration in seconds */
  duration?: number;
  /** Full transcript text */
  transcript?: string;
  /** Subtitle source used */
  subtitleSource?: 'embedded' | 'external' | 'transcribed' | 'none';
  /** Summary of video content */
  summary?: string;
  /** Key moments/timestamps */
  keyMoments?: KeyMoment[];
  /** Extracted topics */
  topics?: string[];
  /** Sentiment analysis */
  sentiment?: 'positive' | 'negative' | 'neutral' | 'mixed';
  /** Error message if failed */
  error?: string;
}

export interface KeyMoment {
  /** Timestamp in seconds */
  timestamp: number;
  /** Formatted timestamp */
  formattedTime: string;
  /** Title/label for the moment */
  title: string;
  /** Description */
  description: string;
  /** Importance score (0-1) */
  importance: number;
}

/**
 * Format milliseconds to SRT timestamp (HH:MM:SS,mmm)
 */
export function formatSrtTimestamp(ms: number): string {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const milliseconds = ms % 1000;
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')},${milliseconds.toString().padStart(3, '0')}`;
}

/**
 * Format milliseconds to VTT timestamp (HH:MM:SS.mmm)
 */
export function formatVttTimestamp(ms: number): string {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const milliseconds = ms % 1000;
  
  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
}

/**
 * Parse SRT timestamp to milliseconds
 */
export function parseSrtTimestamp(timestamp: string): number {
  const match = timestamp.match(/(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/);
  if (!match) return 0;
  
  const [, hours, minutes, seconds, ms] = match;
  return (
    parseInt(hours, 10) * 3600000 +
    parseInt(minutes, 10) * 60000 +
    parseInt(seconds, 10) * 1000 +
    parseInt(ms, 10)
  );
}

/**
 * Parse VTT timestamp to milliseconds
 */
export function parseVttTimestamp(timestamp: string): number {
  // VTT can have MM:SS.mmm or HH:MM:SS.mmm
  const parts = timestamp.split(':');
  let hours = 0, minutes = 0, seconds = 0, ms = 0;
  
  if (parts.length === 3) {
    hours = parseInt(parts[0], 10);
    minutes = parseInt(parts[1], 10);
    const secParts = parts[2].split('.');
    seconds = parseInt(secParts[0], 10);
    ms = parseInt(secParts[1] || '0', 10);
  } else if (parts.length === 2) {
    minutes = parseInt(parts[0], 10);
    const secParts = parts[1].split('.');
    seconds = parseInt(secParts[0], 10);
    ms = parseInt(secParts[1] || '0', 10);
  }
  
  return hours * 3600000 + minutes * 60000 + seconds * 1000 + ms;
}

/**
 * Convert subtitle track to SRT format string
 */
export function toSrtString(track: SubtitleTrack): string {
  return track.cues.map((cue, index) => {
    const startTime = formatSrtTimestamp(cue.startTime);
    const endTime = formatSrtTimestamp(cue.endTime);
    return `${index + 1}\n${startTime} --> ${endTime}\n${cue.text}\n`;
  }).join('\n');
}

/**
 * Convert subtitle track to VTT format string
 */
export function toVttString(track: SubtitleTrack): string {
  const header = 'WEBVTT\n\n';
  const cues = track.cues.map(cue => {
    const startTime = formatVttTimestamp(cue.startTime);
    const endTime = formatVttTimestamp(cue.endTime);
    return `${cue.id}\n${startTime} --> ${endTime}\n${cue.text}\n`;
  }).join('\n');
  
  return header + cues;
}

/**
 * Get plain text from subtitle track
 */
export function getPlainText(track: SubtitleTrack): string {
  return track.cues.map(cue => cue.text).join('\n');
}

/**
 * Merge consecutive cues with same speaker
 */
export function mergeCues(cues: SubtitleCue[], maxGapMs: number = 1000): SubtitleCue[] {
  if (cues.length === 0) return [];
  
  const merged: SubtitleCue[] = [];
  let current = { ...cues[0] };
  
  for (let i = 1; i < cues.length; i++) {
    const cue = cues[i];
    const gap = cue.startTime - current.endTime;
    
    if (gap <= maxGapMs && current.speaker === cue.speaker) {
      current.endTime = cue.endTime;
      current.text += ' ' + cue.text;
    } else {
      merged.push(current);
      current = { ...cue };
    }
  }
  
  merged.push(current);
  return merged;
}
