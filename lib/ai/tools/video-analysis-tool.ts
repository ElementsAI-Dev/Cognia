/**
 * Video Analysis Tool - AI tool for analyzing video content
 * 
 * Provides tools for:
 * - Extracting subtitles from videos
 * - Transcribing videos using Whisper
 * - Analyzing video content (summaries, key moments, Q&A)
 */

import { z } from 'zod';
import type { ToolDefinition } from './registry';
import {
  getVideoSubtitleInfo,
  getVideoSubtitles,
  analyzeVideoContent,
} from '@/lib/media/video-subtitle';
import { parseSubtitle, cuesToPlainText } from '@/lib/media/subtitle-parser';

/**
 * Video subtitle extraction input schema
 */
export const videoSubtitleInputSchema = z.object({
  videoPath: z.string().describe('Path to the video file'),
  language: z.string().optional().describe('Preferred language code (e.g., "en", "zh")'),
  transcribeIfMissing: z.boolean().default(true).describe('Whether to transcribe using Whisper if no subtitles found'),
});

export type VideoSubtitleInput = z.infer<typeof videoSubtitleInputSchema>;

/**
 * Video analysis input schema
 */
export const videoAnalysisInputSchema = z.object({
  videoPath: z.string().describe('Path to the video file'),
  analysisType: z.enum(['summary', 'transcript', 'key-moments', 'qa', 'full']).default('summary').describe('Type of analysis to perform'),
  language: z.string().optional().describe('Output language'),
  customPrompt: z.string().optional().describe('Custom analysis prompt'),
  useSubtitles: z.boolean().default(true).describe('Whether to extract and use subtitles'),
  transcribeIfNeeded: z.boolean().default(true).describe('Whether to transcribe if no subtitles'),
});

export type VideoAnalysisInput = z.infer<typeof videoAnalysisInputSchema>;

/**
 * Subtitle parsing input schema
 */
export const subtitleParseInputSchema = z.object({
  content: z.string().describe('Raw subtitle content (SRT, VTT, or ASS format)'),
  language: z.string().default('en').describe('Language code for the subtitles'),
});

export type SubtitleParseInput = z.infer<typeof subtitleParseInputSchema>;

/**
 * Tool result interface
 */
export interface VideoAnalysisToolResult {
  success: boolean;
  data?: {
    hasSubtitles?: boolean;
    subtitleSource?: 'embedded' | 'external' | 'transcribed' | 'none';
    transcript?: string;
    cueCount?: number;
    duration?: number;
    language?: string;
    summary?: string;
    keyMoments?: Array<{
      timestamp: number;
      formattedTime: string;
      title: string;
      description: string;
    }>;
    topics?: string[];
    format?: string;
    tracks?: Array<{
      streamIndex: number;
      codec: string;
      language?: string;
      title?: string;
    }>;
  };
  error?: string;
}

/**
 * Execute video subtitle extraction
 */
export async function executeVideoSubtitleExtraction(
  input: VideoSubtitleInput,
  apiKey: string
): Promise<VideoAnalysisToolResult> {
  try {
    const { videoPath, language, transcribeIfMissing } = input;
    
    // Get subtitle info first
    const info = await getVideoSubtitleInfo(videoPath);
    
    // Get subtitles (extract or transcribe)
    const result = await getVideoSubtitles(videoPath, apiKey, {
      preferredLanguage: language,
      transcribeIfMissing,
    });
    
    if (!result.success) {
      return {
        success: false,
        data: {
          hasSubtitles: false,
          tracks: info.embeddedTracks.map(t => ({
            streamIndex: t.streamIndex,
            codec: t.codec,
            language: t.language,
            title: t.title,
          })),
        },
        error: result.error,
      };
    }
    
    const track = result.track!;
    
    return {
      success: true,
      data: {
        hasSubtitles: true,
        subtitleSource: result.source,
        transcript: cuesToPlainText(track.cues),
        cueCount: track.cues.length,
        duration: track.duration,
        language: track.language,
        format: track.format,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to extract subtitles',
    };
  }
}

/**
 * Execute video content analysis
 */
export async function executeVideoAnalysis(
  input: VideoAnalysisInput,
  apiKey: string,
  analyzeCallback?: (text: string, prompt: string) => Promise<string>
): Promise<VideoAnalysisToolResult> {
  try {
    const result = await analyzeVideoContent(
      {
        videoPath: input.videoPath,
        analysisType: input.analysisType,
        language: input.language,
        customPrompt: input.customPrompt,
        useSubtitles: input.useSubtitles,
        transcribeIfNeeded: input.transcribeIfNeeded,
      },
      apiKey,
      analyzeCallback
    );
    
    if (!result.success) {
      return {
        success: false,
        error: result.error,
      };
    }
    
    return {
      success: true,
      data: {
        subtitleSource: result.subtitleSource,
        transcript: result.transcript,
        duration: result.duration,
        summary: result.summary,
        keyMoments: result.keyMoments?.map(km => ({
          timestamp: km.timestamp,
          formattedTime: km.formattedTime,
          title: km.title,
          description: km.description,
        })),
        topics: result.topics,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to analyze video',
    };
  }
}

/**
 * Execute subtitle parsing
 */
export function executeSubtitleParse(input: SubtitleParseInput): VideoAnalysisToolResult {
  try {
    const parsed = parseSubtitle(input.content, input.language);
    
    if (parsed.errors.some(e => e.type === 'error')) {
      return {
        success: false,
        error: parsed.errors.find(e => e.type === 'error')?.message || 'Parse error',
      };
    }
    
    const track = parsed.tracks[0];
    
    if (!track) {
      return {
        success: false,
        error: 'No subtitle track found in content',
      };
    }
    
    return {
      success: true,
      data: {
        format: parsed.format,
        cueCount: track.cues.length,
        duration: track.duration,
        language: track.language,
        transcript: cuesToPlainText(track.cues),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to parse subtitles',
    };
  }
}

/**
 * Format video analysis result for AI consumption
 */
export function formatVideoAnalysisForAI(result: VideoAnalysisToolResult): string {
  if (!result.success) {
    return `Video analysis failed: ${result.error}`;
  }
  
  const lines: string[] = ['## Video Analysis Result\n'];
  
  if (result.data?.subtitleSource) {
    lines.push(`**Subtitle Source:** ${result.data.subtitleSource}`);
  }
  
  if (result.data?.duration) {
    const mins = Math.floor(result.data.duration / 60000);
    const secs = Math.floor((result.data.duration % 60000) / 1000);
    lines.push(`**Duration:** ${mins}:${secs.toString().padStart(2, '0')}`);
  }
  
  if (result.data?.cueCount) {
    lines.push(`**Subtitle Cues:** ${result.data.cueCount}`);
  }
  
  if (result.data?.language) {
    lines.push(`**Language:** ${result.data.language}`);
  }
  
  if (result.data?.summary) {
    lines.push('\n### Summary\n');
    lines.push(result.data.summary);
  }
  
  if (result.data?.keyMoments && result.data.keyMoments.length > 0) {
    lines.push('\n### Key Moments\n');
    result.data.keyMoments.forEach((km, i) => {
      lines.push(`${i + 1}. **[${km.formattedTime}]** ${km.title}`);
      if (km.description) {
        lines.push(`   ${km.description}`);
      }
    });
  }
  
  if (result.data?.topics && result.data.topics.length > 0) {
    lines.push('\n### Topics\n');
    result.data.topics.forEach(topic => {
      lines.push(`- ${topic}`);
    });
  }
  
  if (result.data?.transcript) {
    const previewLength = 500;
    const preview = result.data.transcript.length > previewLength
      ? result.data.transcript.substring(0, previewLength) + '...'
      : result.data.transcript;
    lines.push('\n### Transcript Preview\n');
    lines.push(preview);
  }
  
  return lines.join('\n');
}

/**
 * Video subtitle extraction tool definition
 */
export const videoSubtitleTool: ToolDefinition<typeof videoSubtitleInputSchema> = {
  name: 'video_subtitles',
  description: `Extract subtitles from a video file. Supports:
- Extracting embedded subtitles (SRT, ASS, VTT formats)
- Transcribing audio using Whisper if no subtitles found
- Multiple languages

Returns the full transcript text and metadata.`,
  parameters: videoSubtitleInputSchema,
  requiresApproval: false,
  category: 'custom',
  create: (config) => {
    const apiKey = (config.apiKey as string) || '';
    return (input: unknown) => executeVideoSubtitleExtraction(input as VideoSubtitleInput, apiKey);
  },
};

/**
 * Video analysis tool definition
 */
export const videoAnalysisTool: ToolDefinition<typeof videoAnalysisInputSchema> = {
  name: 'video_analyze',
  description: `Analyze video content using subtitles or transcription. Analysis types:
- summary: Generate a summary of the video content
- transcript: Get the full transcript
- key-moments: Identify important timestamps and moments
- qa: Generate Q&A pairs about the content
- full: Comprehensive analysis with all of the above

Uses embedded subtitles when available, or transcribes audio using Whisper.`,
  parameters: videoAnalysisInputSchema,
  requiresApproval: false,
  category: 'custom',
  create: (config) => {
    const apiKey = (config.apiKey as string) || '';
    const analyzeCallback = config.analyzeCallback as ((text: string, prompt: string) => Promise<string>) | undefined;
    return (input: unknown) => executeVideoAnalysis(input as VideoAnalysisInput, apiKey, analyzeCallback);
  },
};

/**
 * Subtitle parse tool definition
 */
export const subtitleParseTool: ToolDefinition<typeof subtitleParseInputSchema> = {
  name: 'subtitle_parse',
  description: `Parse subtitle content in various formats (SRT, VTT, ASS/SSA).
Returns structured data with cues, timestamps, and plain text transcript.`,
  parameters: subtitleParseInputSchema,
  requiresApproval: false,
  category: 'custom',
  create: () => {
    return (input: unknown) => executeSubtitleParse(input as SubtitleParseInput);
  },
};

/**
 * Video analysis tools collection
 */
export const videoAnalysisTools = {
  video_subtitles: videoSubtitleTool,
  video_analyze: videoAnalysisTool,
  subtitle_parse: subtitleParseTool,
};

/**
 * Register video analysis tools to a registry
 */
export function registerVideoAnalysisTools(
  registry: { register: (tool: ToolDefinition) => void }
): void {
  registry.register(videoSubtitleTool);
  registry.register(videoAnalysisTool);
  registry.register(subtitleParseTool);
}
