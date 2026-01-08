/**
 * Subtitle Parser - Parse various subtitle formats
 * 
 * Supports:
 * - SRT (SubRip Text)
 * - VTT (WebVTT)
 * - ASS/SSA (Advanced SubStation Alpha)
 */

import type {
  SubtitleFormat,
  SubtitleCue,
  SubtitleTrack,
  SubtitleMetadata,
  ParsedSubtitle,
  SubtitleParseError,
} from '@/types/subtitle';
import { parseSrtTimestamp, parseVttTimestamp } from '@/types/subtitle';

/**
 * Detect subtitle format from content
 */
export function detectFormat(content: string): SubtitleFormat {
  const trimmed = content.trim();
  
  if (trimmed.startsWith('WEBVTT')) {
    return 'vtt';
  }
  
  if (trimmed.includes('[Script Info]') || trimmed.includes('ScriptType:')) {
    return trimmed.toLowerCase().includes('v4.00+') ? 'ass' : 'ssa';
  }
  
  // Check for SRT format (starts with number, then timestamp)
  const srtPattern = /^\d+\s*\n\d{2}:\d{2}:\d{2}[,.]\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}[,.]\d{3}/m;
  if (srtPattern.test(trimmed)) {
    return 'srt';
  }
  
  return 'unknown';
}

/**
 * Parse subtitle content
 */
export function parseSubtitle(content: string, language: string = 'en'): ParsedSubtitle {
  const format = detectFormat(content);
  const errors: SubtitleParseError[] = [];
  let tracks: SubtitleTrack[] = [];
  let metadata: SubtitleMetadata = {};
  
  switch (format) {
    case 'srt':
      const srtResult = parseSrt(content, language);
      tracks = [srtResult.track];
      errors.push(...srtResult.errors);
      break;
      
    case 'vtt':
      const vttResult = parseVtt(content, language);
      tracks = [vttResult.track];
      metadata = vttResult.metadata;
      errors.push(...vttResult.errors);
      break;
      
    case 'ass':
    case 'ssa':
      const assResult = parseAss(content, language);
      tracks = [assResult.track];
      metadata = assResult.metadata;
      errors.push(...assResult.errors);
      break;
      
    default:
      errors.push({
        type: 'error',
        message: 'Unknown subtitle format',
      });
  }
  
  return {
    format,
    tracks,
    metadata,
    rawContent: content,
    errors,
  };
}

/**
 * Parse SRT format
 */
function parseSrt(content: string, language: string): {
  track: SubtitleTrack;
  errors: SubtitleParseError[];
} {
  const errors: SubtitleParseError[] = [];
  const cues: SubtitleCue[] = [];
  
  // Split by double newline (cue separator)
  const blocks = content.trim().split(/\n\s*\n/);
  
  for (const block of blocks) {
    const lines = block.trim().split('\n');
    if (lines.length < 2) continue;
    
    // First line is index
    const indexLine = lines[0].trim();
    const index = parseInt(indexLine, 10);
    
    if (isNaN(index)) {
      errors.push({
        type: 'warning',
        message: `Invalid cue index: ${indexLine}`,
        line: cues.length + 1,
      });
      continue;
    }
    
    // Second line is timestamp
    const timestampLine = lines[1].trim();
    const timestampMatch = timestampLine.match(
      /(\d{2}:\d{2}:\d{2}[,.]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,.]\d{3})/
    );
    
    if (!timestampMatch) {
      errors.push({
        type: 'warning',
        message: `Invalid timestamp: ${timestampLine}`,
        cueIndex: index,
      });
      continue;
    }
    
    const startTime = parseSrtTimestamp(timestampMatch[1]);
    const endTime = parseSrtTimestamp(timestampMatch[2]);
    
    // Rest is text
    const text = lines.slice(2).join('\n').trim();
    
    if (text) {
      cues.push({
        id: `cue-${index}`,
        index,
        startTime,
        endTime,
        text: cleanSubtitleText(text),
      });
    }
  }
  
  const duration = cues.length > 0 ? cues[cues.length - 1].endTime : 0;
  
  return {
    track: {
      id: 'srt-track-1',
      label: 'Subtitles',
      language,
      format: 'srt',
      isDefault: true,
      isSDH: false,
      cues,
      duration,
    },
    errors,
  };
}

/**
 * Parse VTT format
 */
function parseVtt(content: string, language: string): {
  track: SubtitleTrack;
  metadata: SubtitleMetadata;
  errors: SubtitleParseError[];
} {
  const errors: SubtitleParseError[] = [];
  const cues: SubtitleCue[] = [];
  const metadata: SubtitleMetadata = {};
  
  const lines = content.split('\n');
  let i = 0;
  
  // Skip WEBVTT header
  if (lines[i]?.trim().startsWith('WEBVTT')) {
    // Check for metadata after WEBVTT
    const headerMatch = lines[i].match(/WEBVTT\s+-\s+(.+)/);
    if (headerMatch) {
      metadata.title = headerMatch[1].trim();
    }
    i++;
  }
  
  // Skip any NOTE blocks and metadata
  while (i < lines.length) {
    const line = lines[i].trim();
    if (line === '' || line.startsWith('NOTE') || line.startsWith('STYLE')) {
      i++;
      // Skip until empty line for multi-line blocks
      if (line.startsWith('NOTE') || line.startsWith('STYLE')) {
        while (i < lines.length && lines[i].trim() !== '') {
          i++;
        }
      }
    } else {
      break;
    }
  }
  
  let cueIndex = 1;
  
  while (i < lines.length) {
    // Skip empty lines
    while (i < lines.length && lines[i].trim() === '') {
      i++;
    }
    
    if (i >= lines.length) break;
    
    let cueId = '';
    
    // Check if line is a cue ID (optional in VTT)
    if (!lines[i].includes('-->')) {
      cueId = lines[i].trim();
      i++;
    }
    
    if (i >= lines.length) break;
    
    // Parse timestamp line
    const timestampLine = lines[i].trim();
    const timestampMatch = timestampLine.match(
      /(\d{2}:)?\d{2}:\d{2}\.\d{3}\s*-->\s*(\d{2}:)?\d{2}:\d{2}\.\d{3}/
    );
    
    if (!timestampMatch) {
      i++;
      continue;
    }
    
    const [timestamps] = timestampLine.split('-->').map(t => t.trim());
    const endTimestamp = timestampLine.split('-->')[1]?.trim().split(/\s+/)[0];
    
    const startTime = parseVttTimestamp(timestamps);
    const endTime = parseVttTimestamp(endTimestamp || '');
    
    i++;
    
    // Collect text lines until empty line
    const textLines: string[] = [];
    while (i < lines.length && lines[i].trim() !== '') {
      textLines.push(lines[i]);
      i++;
    }
    
    const text = textLines.join('\n').trim();
    
    if (text) {
      cues.push({
        id: cueId || `cue-${cueIndex}`,
        index: cueIndex,
        startTime,
        endTime,
        text: cleanSubtitleText(text),
      });
      cueIndex++;
    }
  }
  
  const duration = cues.length > 0 ? cues[cues.length - 1].endTime : 0;
  
  return {
    track: {
      id: 'vtt-track-1',
      label: 'Subtitles',
      language,
      format: 'vtt',
      isDefault: true,
      isSDH: false,
      cues,
      duration,
    },
    metadata,
    errors,
  };
}

/**
 * Parse ASS/SSA format
 */
function parseAss(content: string, language: string): {
  track: SubtitleTrack;
  metadata: SubtitleMetadata;
  errors: SubtitleParseError[];
} {
  const errors: SubtitleParseError[] = [];
  const cues: SubtitleCue[] = [];
  const metadata: SubtitleMetadata = { custom: {} };
  
  const lines = content.split('\n');
  let inEvents = false;
  let formatFields: string[] = [];
  let cueIndex = 1;
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Parse metadata from Script Info section
    if (trimmed.startsWith('Title:')) {
      metadata.title = trimmed.substring(6).trim();
    } else if (trimmed.startsWith('Original Script:')) {
      metadata.author = trimmed.substring(16).trim();
    } else if (trimmed.startsWith('PlayResX:')) {
      const width = parseInt(trimmed.substring(9).trim(), 10);
      metadata.videoResolution = { width, height: metadata.videoResolution?.height || 0 };
    } else if (trimmed.startsWith('PlayResY:')) {
      const height = parseInt(trimmed.substring(9).trim(), 10);
      metadata.videoResolution = { width: metadata.videoResolution?.width || 0, height };
    }
    
    // Detect Events section
    if (trimmed === '[Events]') {
      inEvents = true;
      continue;
    }
    
    if (trimmed.startsWith('[') && trimmed !== '[Events]') {
      inEvents = false;
      continue;
    }
    
    if (!inEvents) continue;
    
    // Parse Format line
    if (trimmed.startsWith('Format:')) {
      formatFields = trimmed.substring(7).split(',').map(f => f.trim().toLowerCase());
      continue;
    }
    
    // Parse Dialogue lines
    if (trimmed.startsWith('Dialogue:')) {
      const values = parseAssDialogueLine(trimmed.substring(9), formatFields.length);
      
      const startIndex = formatFields.indexOf('start');
      const endIndex = formatFields.indexOf('end');
      const textIndex = formatFields.indexOf('text');
      const nameIndex = formatFields.indexOf('name');
      
      if (startIndex === -1 || endIndex === -1 || textIndex === -1) {
        errors.push({
          type: 'warning',
          message: 'Missing required format fields',
          cueIndex,
        });
        continue;
      }
      
      const startTime = parseAssTimestamp(values[startIndex] || '');
      const endTime = parseAssTimestamp(values[endIndex] || '');
      const text = cleanAssText(values[textIndex] || '');
      const speaker = nameIndex >= 0 ? values[nameIndex] : undefined;
      
      if (text) {
        cues.push({
          id: `cue-${cueIndex}`,
          index: cueIndex,
          startTime,
          endTime,
          text,
          speaker,
        });
        cueIndex++;
      }
    }
  }
  
  const duration = cues.length > 0 ? cues[cues.length - 1].endTime : 0;
  
  return {
    track: {
      id: 'ass-track-1',
      label: metadata.title || 'Subtitles',
      language,
      format: 'ass',
      isDefault: true,
      isSDH: false,
      cues,
      duration,
    },
    metadata,
    errors,
  };
}

/**
 * Parse ASS dialogue line values
 */
function parseAssDialogueLine(line: string, expectedFields: number): string[] {
  const values: string[] = [];
  let current = '';
  let fieldCount = 0;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    // The last field (Text) can contain commas
    if (char === ',' && fieldCount < expectedFields - 1) {
      values.push(current.trim());
      current = '';
      fieldCount++;
    } else {
      current += char;
    }
  }
  
  values.push(current.trim());
  return values;
}

/**
 * Parse ASS timestamp (H:MM:SS.cc)
 */
function parseAssTimestamp(timestamp: string): number {
  const match = timestamp.match(/(\d+):(\d{2}):(\d{2})\.(\d{2})/);
  if (!match) return 0;
  
  const [, hours, minutes, seconds, centiseconds] = match;
  return (
    parseInt(hours, 10) * 3600000 +
    parseInt(minutes, 10) * 60000 +
    parseInt(seconds, 10) * 1000 +
    parseInt(centiseconds, 10) * 10
  );
}

/**
 * Clean ASS text (remove style tags)
 */
function cleanAssText(text: string): string {
  return text
    .replace(/\{[^}]+\}/g, '') // Remove style tags
    .replace(/\\N/g, '\n')     // Convert line breaks
    .replace(/\\n/g, '\n')
    .replace(/\\h/g, ' ')      // Convert hard space
    .trim();
}

/**
 * Clean subtitle text (remove HTML tags, etc.)
 */
function cleanSubtitleText(text: string): string {
  return text
    .replace(/<[^>]+>/g, '')   // Remove HTML tags
    .replace(/\{[^}]+\}/g, '') // Remove ASS-style tags
    .trim();
}

/**
 * Convert cues to plain text for analysis
 */
export function cuesToPlainText(cues: SubtitleCue[]): string {
  return cues.map(cue => cue.text).join(' ');
}

/**
 * Convert cues to timestamped text
 */
export function cuesToTimestampedText(cues: SubtitleCue[]): string {
  return cues.map(cue => {
    const startSeconds = Math.floor(cue.startTime / 1000);
    const minutes = Math.floor(startSeconds / 60);
    const seconds = startSeconds % 60;
    const timestamp = `[${minutes}:${seconds.toString().padStart(2, '0')}]`;
    return `${timestamp} ${cue.text}`;
  }).join('\n');
}

/**
 * Find cue at specific time
 */
export function findCueAtTime(cues: SubtitleCue[], timeMs: number): SubtitleCue | undefined {
  return cues.find(cue => timeMs >= cue.startTime && timeMs <= cue.endTime);
}

/**
 * Search cues by text
 */
export function searchCues(cues: SubtitleCue[], query: string): SubtitleCue[] {
  const lowerQuery = query.toLowerCase();
  return cues.filter(cue => cue.text.toLowerCase().includes(lowerQuery));
}
