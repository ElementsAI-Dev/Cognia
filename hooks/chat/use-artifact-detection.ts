/**
 * useArtifactDetection - Hook to detect and extract artifacts from AI responses
 *
 * Delegates to centralized utilities in @/lib/artifacts and @/lib/ai/generation/artifact-detector
 * to avoid duplicate detection logic.
 */

import { useMemo } from 'react';
import type { ArtifactType, ArtifactLanguage } from '@/types';
import {
  mapToArtifactLanguage as centralMapToArtifactLanguage,
  LANGUAGE_MAP,
} from '@/lib/artifacts';
import { generateArtifactTitle } from '@/lib/artifacts';
import {
  detectArtifactType as centralDetectArtifactType,
  extractCodeBlocks,
} from '@/lib/ai/generation/artifact-detector';

export interface DetectedArtifact {
  type: ArtifactType;
  language?: ArtifactLanguage;
  content: string;
  title: string;
  startIndex: number;
  endIndex: number;
}

interface UseArtifactDetectionOptions {
  enabled?: boolean;
  minCodeLength?: number;
}

/**
 * Hook to detect artifacts in text content
 */
export function useArtifactDetection(
  content: string,
  options: UseArtifactDetectionOptions = {}
): DetectedArtifact[] {
  const { enabled = true, minCodeLength = 50 } = options;

  const artifacts = useMemo(() => {
    if (!enabled || !content) return [];

    const detected: DetectedArtifact[] = [];
    const codeBlocks = extractCodeBlocks(content);

    for (const block of codeBlocks) {
      const trimmedContent = block.code;

      // Skip short code blocks
      if (trimmedContent.length < minCodeLength) continue;

      const { type } = centralDetectArtifactType(trimmedContent, block.language);
      const language = LANGUAGE_MAP[block.language.toLowerCase()] || (block.language as ArtifactLanguage);
      const title = generateArtifactTitle(trimmedContent, type, block.language);

      detected.push({
        type,
        language: language || undefined,
        content: trimmedContent,
        title,
        startIndex: block.startIndex,
        endIndex: block.endIndex,
      });
    }

    return detected;
  }, [content, enabled, minCodeLength]);

  return artifacts;
}

/**
 * Utility function to detect artifact type from language string
 */
export function detectArtifactType(language?: string, content?: string): ArtifactType {
  if (!language) return 'code';
  const { type } = centralDetectArtifactType(content || '', language);
  return type;
}

/**
 * Utility function to map language to ArtifactLanguage
 */
export const mapToArtifactLanguage = centralMapToArtifactLanguage;

export default useArtifactDetection;
