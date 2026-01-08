/**
 * Video Subtitle Processing
 * 
 * Provides functionality to:
 * - Extract subtitles from video files (via FFmpeg/Tauri)
 * - Detect embedded subtitle tracks
 * - Transcribe audio when no subtitles available (via Whisper)
 * - Analyze video content using subtitles
 */

import { invoke } from '@tauri-apps/api/core';
import { transcribeAudio, type TranscribeOptions } from '@/lib/ai/media/speech-api';
import { parseSubtitle, cuesToPlainText } from './subtitle-parser';
import type {
  VideoSubtitleInfo,
  SubtitleExtractionOptions,
  SubtitleExtractionResult,
  SubtitleTrack,
  TranscriptionResult,
  VideoAnalysisInput,
  VideoAnalysisResult,
  KeyMoment,
} from '@/types/subtitle';

/**
 * Check if video has embedded subtitles
 */
export async function getVideoSubtitleInfo(videoPath: string): Promise<VideoSubtitleInfo> {
  try {
    const result = await invoke<{
      has_subtitles: boolean;
      tracks: Array<{
        stream_index: number;
        codec: string;
        language?: string;
        title?: string;
        is_default: boolean;
        is_forced: boolean;
      }>;
    }>('video_get_subtitle_info', { videoPath });
    
    return {
      hasEmbeddedSubtitles: result.has_subtitles,
      embeddedTracks: result.tracks.map(t => ({
        streamIndex: t.stream_index,
        codec: t.codec,
        language: t.language,
        title: t.title,
        isDefault: t.is_default,
        isForced: t.is_forced,
      })),
      hasExternalSubtitles: false,
      externalFiles: [],
    };
  } catch (error) {
    console.warn('Failed to get subtitle info via Tauri, using fallback:', error);
    return {
      hasEmbeddedSubtitles: false,
      embeddedTracks: [],
      hasExternalSubtitles: false,
      externalFiles: [],
    };
  }
}

/**
 * Extract subtitles from video file
 */
export async function extractSubtitles(
  options: SubtitleExtractionOptions
): Promise<SubtitleExtractionResult> {
  try {
    const result = await invoke<{
      success: boolean;
      extracted_files: Array<{
        stream_index: number;
        file_path: string;
        format: string;
        language?: string;
        cue_count: number;
      }>;
      error?: string;
    }>('video_extract_subtitles', { options });
    
    return {
      success: result.success,
      extractedFiles: result.extracted_files.map(f => ({
        streamIndex: f.stream_index,
        filePath: f.file_path,
        format: f.format as 'srt' | 'vtt' | 'ass' | 'ssa' | 'unknown',
        language: f.language,
        cueCount: f.cue_count,
      })),
      error: result.error,
    };
  } catch (error) {
    return {
      success: false,
      extractedFiles: [],
      error: error instanceof Error ? error.message : 'Failed to extract subtitles',
    };
  }
}

/**
 * Extract audio from video for transcription
 */
export async function extractAudioFromVideo(
  videoPath: string,
  outputPath?: string
): Promise<{ success: boolean; audioPath?: string; error?: string }> {
  try {
    const result = await invoke<{
      success: boolean;
      audio_path?: string;
      error?: string;
    }>('video_extract_audio', { 
      videoPath,
      outputPath,
      format: 'mp3', // Whisper supports mp3
    });
    
    return {
      success: result.success,
      audioPath: result.audio_path,
      error: result.error,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to extract audio',
    };
  }
}

/**
 * Transcribe video using Whisper API
 */
export async function transcribeVideo(
  videoPath: string,
  apiKey: string,
  options: {
    language?: string;
    prompt?: string;
    includeTimestamps?: boolean;
  } = {}
): Promise<TranscriptionResult> {
  try {
    // First extract audio from video
    const audioResult = await extractAudioFromVideo(videoPath);
    
    if (!audioResult.success || !audioResult.audioPath) {
      return {
        success: false,
        error: audioResult.error || 'Failed to extract audio from video',
      };
    }
    
    // Read audio file as blob
    const audioBlob = await readFileAsBlob(audioResult.audioPath);
    
    if (!audioBlob) {
      return {
        success: false,
        error: 'Failed to read extracted audio file',
      };
    }
    
    // Transcribe using Whisper
    const transcribeOptions: TranscribeOptions = {
      apiKey,
      language: options.language as Parameters<typeof transcribeAudio>[1]['language'],
      prompt: options.prompt,
      model: 'whisper-1',
    };
    
    const result = await transcribeAudio(audioBlob, transcribeOptions);
    
    if (!result.success) {
      return {
        success: false,
        error: result.error,
      };
    }
    
    // Convert to TranscriptionResult format
    const transcriptionResult: TranscriptionResult = {
      success: true,
      text: result.text,
      language: result.language,
      duration: result.duration,
    };
    
    // Generate subtitle track from transcription
    if (result.text) {
      transcriptionResult.subtitleTrack = createSubtitleTrackFromText(
        result.text,
        result.duration || 0,
        result.language || options.language || 'en'
      );
    }
    
    return transcriptionResult;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to transcribe video',
    };
  }
}

/**
 * Get subtitles from video - extracts embedded or transcribes
 */
export async function getVideoSubtitles(
  videoPath: string,
  apiKey: string,
  options: {
    preferredLanguage?: string;
    transcribeIfMissing?: boolean;
    transcriptionPrompt?: string;
  } = {}
): Promise<{
  success: boolean;
  source: 'embedded' | 'transcribed' | 'none';
  track?: SubtitleTrack;
  error?: string;
}> {
  const { preferredLanguage, transcribeIfMissing = true, transcriptionPrompt } = options;
  
  // Check for embedded subtitles
  const subtitleInfo = await getVideoSubtitleInfo(videoPath);
  
  if (subtitleInfo.hasEmbeddedSubtitles && subtitleInfo.embeddedTracks.length > 0) {
    // Find best matching track
    let targetTrack = subtitleInfo.embeddedTracks.find(t => t.isDefault);
    
    if (preferredLanguage) {
      const langTrack = subtitleInfo.embeddedTracks.find(
        t => t.language?.toLowerCase().startsWith(preferredLanguage.toLowerCase())
      );
      if (langTrack) targetTrack = langTrack;
    }
    
    if (!targetTrack) {
      targetTrack = subtitleInfo.embeddedTracks[0];
    }
    
    // Extract the subtitle track
    const extractResult = await extractSubtitles({
      videoPath,
      trackIndices: [targetTrack.streamIndex],
      outputFormat: 'srt',
    });
    
    if (extractResult.success && extractResult.extractedFiles.length > 0) {
      const subtitleContent = await readFileAsText(extractResult.extractedFiles[0].filePath);
      
      if (subtitleContent) {
        const parsed = parseSubtitle(subtitleContent, targetTrack.language || 'en');
        
        if (parsed.tracks.length > 0) {
          return {
            success: true,
            source: 'embedded',
            track: parsed.tracks[0],
          };
        }
      }
    }
  }
  
  // No embedded subtitles - try transcription
  if (transcribeIfMissing && apiKey) {
    const transcriptionResult = await transcribeVideo(videoPath, apiKey, {
      language: preferredLanguage,
      prompt: transcriptionPrompt,
      includeTimestamps: true,
    });
    
    if (transcriptionResult.success && transcriptionResult.subtitleTrack) {
      return {
        success: true,
        source: 'transcribed',
        track: transcriptionResult.subtitleTrack,
      };
    }
    
    return {
      success: false,
      source: 'none',
      error: transcriptionResult.error || 'Failed to transcribe video',
    };
  }
  
  return {
    success: false,
    source: 'none',
    error: 'No subtitles found and transcription not enabled',
  };
}

/**
 * Analyze video content using subtitles
 */
export async function analyzeVideoContent(
  input: VideoAnalysisInput,
  apiKey: string,
  analyzeCallback?: (text: string, prompt: string) => Promise<string>
): Promise<VideoAnalysisResult> {
  const { videoPath, analysisType, language, customPrompt, useSubtitles = true, transcribeIfNeeded = true } = input;
  
  let transcript = '';
  let subtitleSource: 'embedded' | 'external' | 'transcribed' | 'none' = 'none';
  
  // Get subtitles or transcription
  if (useSubtitles || transcribeIfNeeded) {
    const subtitleResult = await getVideoSubtitles(videoPath, apiKey, {
      preferredLanguage: language,
      transcribeIfMissing: transcribeIfNeeded,
    });
    
    if (subtitleResult.success && subtitleResult.track) {
      transcript = cuesToPlainText(subtitleResult.track.cues);
      subtitleSource = subtitleResult.source;
    }
  }
  
  if (!transcript) {
    return {
      success: false,
      subtitleSource: 'none',
      error: 'Could not obtain video transcript',
    };
  }
  
  // Build analysis based on type
  const result: VideoAnalysisResult = {
    success: true,
    transcript,
    subtitleSource,
  };
  
  // If we have an analysis callback, use it for AI analysis
  if (analyzeCallback) {
    const prompt = buildAnalysisPrompt(analysisType, transcript, customPrompt, language);
    
    try {
      const analysisResult = await analyzeCallback(transcript, prompt);
      
      // Parse analysis result based on type
      if (analysisType === 'summary' || analysisType === 'full') {
        result.summary = analysisResult;
      }
      
      if (analysisType === 'key-moments' || analysisType === 'full') {
        result.keyMoments = parseKeyMoments(analysisResult);
      }
    } catch (error) {
      result.error = error instanceof Error ? error.message : 'Analysis failed';
    }
  }
  
  return result;
}

/**
 * Build analysis prompt based on type
 */
function buildAnalysisPrompt(
  type: VideoAnalysisInput['analysisType'],
  _transcript: string,
  customPrompt?: string,
  language?: string
): string {
  const langInstruction = language ? `Respond in ${language}.` : '';
  
  if (customPrompt) {
    return `${customPrompt}\n\n${langInstruction}`;
  }
  
  switch (type) {
    case 'summary':
      return `Summarize the main points of this video transcript. Include:
1. Main topic/theme
2. Key points discussed
3. Important conclusions
${langInstruction}`;
    
    case 'key-moments':
      return `Identify the key moments in this video transcript. For each moment, provide:
- Approximate timestamp (if discernible from context)
- Brief title
- Description of what happens/is discussed
Format as a numbered list.
${langInstruction}`;
    
    case 'qa':
      return `Based on this video transcript, generate 5-10 question-answer pairs that test understanding of the content.
${langInstruction}`;
    
    case 'full':
      return `Analyze this video transcript comprehensively:
1. Summary (2-3 paragraphs)
2. Key topics covered
3. Important timestamps/moments
4. Main takeaways
5. Target audience
${langInstruction}`;
    
    default:
      return `Analyze this video transcript: ${langInstruction}`;
  }
}

/**
 * Parse key moments from analysis text
 */
function parseKeyMoments(analysisText: string): KeyMoment[] {
  const moments: KeyMoment[] = [];
  const lines = analysisText.split('\n');
  
  for (const line of lines) {
    // Try to parse timestamp patterns like [00:00], (0:00), etc.
    const timestampMatch = line.match(/[\[\(]?(\d{1,2}):(\d{2})[\]\)]?/);
    
    if (timestampMatch) {
      const minutes = parseInt(timestampMatch[1], 10);
      const seconds = parseInt(timestampMatch[2], 10);
      const timestamp = minutes * 60 + seconds;
      
      // Extract title/description from the rest of the line
      const textAfterTimestamp = line.substring(line.indexOf(timestampMatch[0]) + timestampMatch[0].length).trim();
      const parts = textAfterTimestamp.split(/[-:]/);
      
      moments.push({
        timestamp,
        formattedTime: `${minutes}:${seconds.toString().padStart(2, '0')}`,
        title: parts[0]?.trim() || 'Key Moment',
        description: parts.slice(1).join(' ').trim() || textAfterTimestamp,
        importance: 0.5,
      });
    }
  }
  
  return moments;
}

/**
 * Create subtitle track from plain text (for transcriptions without timestamps)
 */
function createSubtitleTrackFromText(
  text: string,
  durationSeconds: number,
  language: string
): SubtitleTrack {
  // Split text into sentences
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const cueCount = sentences.length;
  const cueDuration = (durationSeconds * 1000) / cueCount;
  
  return {
    id: 'transcribed-track',
    label: 'Transcription',
    language,
    format: 'srt',
    isDefault: true,
    isSDH: false,
    duration: durationSeconds * 1000,
    cues: sentences.map((sentence, index) => ({
      id: `cue-${index + 1}`,
      index: index + 1,
      startTime: Math.floor(index * cueDuration),
      endTime: Math.floor((index + 1) * cueDuration),
      text: sentence.trim(),
    })),
  };
}

/**
 * Read file as text (via Tauri)
 */
async function readFileAsText(filePath: string): Promise<string | null> {
  try {
    return await invoke<string>('read_text_file', { path: filePath });
  } catch {
    return null;
  }
}

/**
 * Read file as blob (via Tauri)
 */
async function readFileAsBlob(filePath: string): Promise<Blob | null> {
  try {
    const bytes = await invoke<number[]>('read_binary_file', { path: filePath });
    return new Blob([new Uint8Array(bytes)]);
  } catch {
    return null;
  }
}

/**
 * Format seconds to display time
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
