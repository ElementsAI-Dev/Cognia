/**
 * TTS Text Utilities - Text processing for TTS
 * Handles long text segmentation, text normalization, and preprocessing
 */

import type { TTSProvider } from '@/types/media/tts';
import { TTS_PROVIDERS } from '@/types/media/tts';

/**
 * Split text into chunks suitable for TTS processing
 * Respects sentence boundaries and provider limits
 */
export function splitTextForTTS(
  text: string,
  provider: TTSProvider,
  maxChunkSize?: number
): string[] {
  const providerInfo = TTS_PROVIDERS[provider];
  const limit = maxChunkSize || providerInfo.maxTextLength;
  
  // If text is within limit, return as is
  if (text.length <= limit) {
    return [text];
  }

  const chunks: string[] = [];
  let remainingText = text;

  while (remainingText.length > 0) {
    if (remainingText.length <= limit) {
      chunks.push(remainingText.trim());
      break;
    }

    // Find the best split point
    const chunk = findBestSplitPoint(remainingText, limit);
    chunks.push(chunk.trim());
    remainingText = remainingText.substring(chunk.length).trim();
  }

  return chunks.filter(chunk => chunk.length > 0);
}

/**
 * Find the best point to split text
 * Prefers sentence boundaries, then clause boundaries, then word boundaries
 */
function findBestSplitPoint(text: string, maxLength: number): string {
  const searchText = text.substring(0, maxLength);
  
  // Priority 1: End of sentence (. ! ?)
  const sentenceEnders = ['. ', '! ', '? ', '。', '！', '？'];
  let bestIndex = -1;
  
  for (const ender of sentenceEnders) {
    const index = searchText.lastIndexOf(ender);
    if (index > bestIndex) {
      bestIndex = index + ender.length;
    }
  }
  
  if (bestIndex > maxLength * 0.5) {
    return text.substring(0, bestIndex);
  }

  // Priority 2: Clause boundaries (; : , )
  const clauseEnders = ['; ', ': ', ', ', '；', '：', '，'];
  
  for (const ender of clauseEnders) {
    const index = searchText.lastIndexOf(ender);
    if (index > bestIndex) {
      bestIndex = index + ender.length;
    }
  }
  
  if (bestIndex > maxLength * 0.3) {
    return text.substring(0, bestIndex);
  }

  // Priority 3: Word boundaries (space)
  const lastSpace = searchText.lastIndexOf(' ');
  if (lastSpace > 0) {
    return text.substring(0, lastSpace);
  }

  // Fallback: Hard cut at limit
  return text.substring(0, maxLength);
}

/**
 * Normalize text for TTS processing
 * Removes or replaces characters that may cause issues
 */
export function normalizeTextForTTS(text: string): string {
  let normalized = text;

  // Remove excessive whitespace
  normalized = normalized.replace(/\s+/g, ' ');

  // Replace common abbreviations with spoken forms
  const abbreviations: Record<string, string> = {
    'Mr.': 'Mister',
    'Mrs.': 'Misses',
    'Ms.': 'Miss',
    'Dr.': 'Doctor',
    'Prof.': 'Professor',
    'Jr.': 'Junior',
    'Sr.': 'Senior',
    'vs.': 'versus',
    'etc.': 'etcetera',
    'e.g.': 'for example',
    'i.e.': 'that is',
  };

  for (const [abbr, full] of Object.entries(abbreviations)) {
    normalized = normalized.replace(new RegExp(escapeRegExp(abbr), 'gi'), full);
  }

  // Replace special characters
  normalized = normalized
    .replace(/&/g, ' and ')
    .replace(/@/g, ' at ')
    .replace(/#/g, ' number ')
    .replace(/%/g, ' percent ')
    .replace(/\+/g, ' plus ')
    .replace(/=/g, ' equals ')
    .replace(/\*/g, '')
    .replace(/_/g, ' ');

  // Remove markdown formatting
  normalized = normalized
    .replace(/\*\*(.*?)\*\*/g, '$1') // Bold
    .replace(/\*(.*?)\*/g, '$1') // Italic
    .replace(/~~(.*?)~~/g, '$1') // Strikethrough
    .replace(/`(.*?)`/g, '$1') // Code
    .replace(/^#+\s*/gm, '') // Headers
    .replace(/^\s*[-*+]\s+/gm, '') // List items
    .replace(/^\s*\d+\.\s+/gm, '') // Numbered lists
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1'); // Links

  // Remove URLs
  normalized = normalized.replace(/https?:\/\/[^\s]+/g, '');

  // Remove code blocks
  normalized = normalized.replace(/```[\s\S]*?```/g, '');

  // Normalize quotes
  normalized = normalized
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'");

  // Remove excessive punctuation
  normalized = normalized
    .replace(/\.{3,}/g, '...')
    .replace(/!{2,}/g, '!')
    .replace(/\?{2,}/g, '?');

  // Trim and normalize spaces
  normalized = normalized.trim().replace(/\s+/g, ' ');

  return normalized;
}

/**
 * Escape special regex characters
 */
function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Estimate speech duration in seconds
 * Based on average speaking rate of 150 words per minute
 */
export function estimateSpeechDuration(text: string, rate: number = 1.0): number {
  const words = text.split(/\s+/).length;
  const baseWPM = 150; // Average words per minute
  const adjustedWPM = baseWPM * rate;
  return (words / adjustedWPM) * 60;
}

/**
 * Get word count
 */
export function getWordCount(text: string): number {
  return text.split(/\s+/).filter(word => word.length > 0).length;
}

/**
 * Check if text contains primarily CJK characters
 */
export function isCJKText(text: string): boolean {
  const cjkRegex = /[\u4E00-\u9FFF\u3400-\u4DBF\uF900-\uFAFF\u3040-\u309F\u30A0-\u30FF\uAC00-\uD7AF]/;
  const cjkMatches = text.match(new RegExp(cjkRegex.source, 'g')) || [];
  return cjkMatches.length > text.length * 0.3;
}

/**
 * Detect language from text (simplified)
 */
export function detectLanguage(text: string): string {
  // Check for CJK
  if (/[\u4E00-\u9FFF]/.test(text)) {
    // Chinese
    if (/[\u3100-\u312F\u31A0-\u31BF]/.test(text)) {
      return 'zh-TW'; // Traditional Chinese (Bopomofo)
    }
    return 'zh-CN'; // Simplified Chinese
  }
  
  if (/[\u3040-\u309F\u30A0-\u30FF]/.test(text)) {
    return 'ja-JP'; // Japanese
  }
  
  if (/[\uAC00-\uD7AF]/.test(text)) {
    return 'ko-KR'; // Korean
  }
  
  // European languages (simplified detection)
  if (/[äöüß]/i.test(text)) {
    return 'de-DE'; // German
  }
  
  if (/[éèêëàâùûç]/i.test(text)) {
    return 'fr-FR'; // French
  }
  
  if (/[ñ¿¡]/i.test(text)) {
    return 'es-ES'; // Spanish
  }
  
  // Default to English
  return 'en-US';
}

/**
 * Preprocess text for a specific provider
 */
export function preprocessTextForProvider(
  text: string,
  provider: TTSProvider
): string {
  let processed = normalizeTextForTTS(text);

  switch (provider) {
    case 'system':
      // Browser TTS handles most things well
      break;
      
    case 'openai':
      // OpenAI TTS handles markdown well, minimal processing needed
      break;
      
    case 'gemini':
      // Gemini prefers clean text
      processed = processed.replace(/[<>]/g, '');
      break;
      
    case 'edge':
      // Edge TTS uses SSML, escape XML characters
      processed = processed
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
      break;
      
    case 'elevenlabs':
    case 'lmnt':
    case 'hume':
    case 'deepgram':
      // These providers handle text well
      break;

    case 'cartesia':
      // Cartesia supports SSML-like tags for emotion, remove raw angle brackets from content
      processed = processed.replace(/[<>]/g, '');
      break;
  }

  return processed;
}

/**
 * Generate SSML for supported providers
 */
export function generateSSML(
  text: string,
  options: {
    voice?: string;
    rate?: number;
    pitch?: number;
    volume?: number;
    language?: string;
  } = {}
): string {
  const { voice, rate = 1.0, pitch = 1.0, volume = 1.0, language = 'en-US' } = options;

  // Escape XML characters
  const escapedText = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

  // Convert rate/pitch/volume to SSML format
  const rateStr = `${Math.round((rate - 1) * 100)}%`;
  const pitchStr = `${Math.round((pitch - 1) * 50)}Hz`;
  const volumeStr = `${Math.round((volume - 1) * 100)}%`;

  let ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${language}">`;
  
  if (voice) {
    ssml += `<voice name="${voice}">`;
  }
  
  ssml += `<prosody rate="${rateStr}" pitch="${pitchStr}" volume="${volumeStr}">`;
  ssml += escapedText;
  ssml += '</prosody>';
  
  if (voice) {
    ssml += '</voice>';
  }
  
  ssml += '</speak>';

  return ssml;
}
