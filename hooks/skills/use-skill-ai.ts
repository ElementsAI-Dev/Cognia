/**
 * useSkillAI Hook
 *
 * Shared hook that wraps processSelectionWithAI for use with SkillEditor's onRequestAI prop.
 * Eliminates the duplicated inline async callback pattern across skill-panel and skill-detail.
 */

import { useCallback } from 'react';
import { processSelectionWithAI } from '@/lib/ai/generation/selection-ai';

/**
 * Returns a stable callback for AI text processing,
 * compatible with SkillEditor's `onRequestAI` prop signature.
 */
export function useSkillAI() {
  const requestAI = useCallback(async (prompt: string): Promise<string> => {
    const result = await processSelectionWithAI({
      action: 'rewrite',
      text: prompt,
      customPrompt: prompt,
    });
    if (result.success && result.result) return result.result;
    throw new Error(result.error || 'AI request failed');
  }, []);

  return requestAI;
}
