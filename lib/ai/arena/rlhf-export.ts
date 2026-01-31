/**
 * RLHF Export - Export arena battle data for reinforcement learning from human feedback
 * Supports various formats for preference learning and fine-tuning
 */

import type { ArenaBattle, ArenaPreference } from '@/types/arena';

/**
 * Standard RLHF preference pair format
 */
export interface RLHFPreferencePair {
  prompt: string;
  chosen: string;
  rejected: string;
  chosen_model?: string;
  rejected_model?: string;
  category?: string;
  metadata?: {
    battle_id?: string;
    timestamp?: string;
    win_reason?: string;
    task_classification?: string;
  };
}

/**
 * DPO (Direct Preference Optimization) format
 */
export interface DPODataset {
  prompt: string;
  chosen: string;
  rejected: string;
}

/**
 * Anthropic HH-RLHF format
 */
export interface HHRLHFFormat {
  chosen: string;
  rejected: string;
}

/**
 * OpenAI comparison format
 */
export interface OpenAIComparisonFormat {
  prompt: string;
  completion_a: string;
  completion_b: string;
  label: 'a' | 'b' | 'tie';
}

/**
 * Export format options
 */
export type ExportFormat = 'rlhf' | 'dpo' | 'hh-rlhf' | 'openai' | 'jsonl';

/**
 * Export options
 */
export interface ExportOptions {
  format: ExportFormat;
  includeMetadata?: boolean;
  includeTies?: boolean;
  minResponseLength?: number;
  filterCategory?: string;
}

/**
 * Convert a battle to RLHF preference pair
 */
export function battleToRLHFPair(
  battle: ArenaBattle,
  options?: { includeMetadata?: boolean }
): RLHFPreferencePair | null {
  // Skip battles without clear winner
  if (!battle.winnerId || battle.isTie) {
    return null;
  }

  const winner = battle.contestants.find((c) => c.id === battle.winnerId);
  const loser = battle.contestants.find((c) => c.id !== battle.winnerId);

  if (!winner || !loser) {
    return null;
  }

  // Skip if responses are too short
  if (winner.response.length < 10 || loser.response.length < 10) {
    return null;
  }

  const pair: RLHFPreferencePair = {
    prompt: battle.prompt,
    chosen: winner.response,
    rejected: loser.response,
    chosen_model: `${winner.provider}:${winner.model}`,
    rejected_model: `${loser.provider}:${loser.model}`,
    category: battle.taskClassification?.category,
  };

  if (options?.includeMetadata) {
    pair.metadata = {
      battle_id: battle.id,
      timestamp: battle.createdAt.toISOString(),
      win_reason: battle.winReason,
      task_classification: battle.taskClassification?.category,
    };
  }

  return pair;
}

/**
 * Convert battles to DPO format
 */
export function battlesToDPO(battles: ArenaBattle[]): DPODataset[] {
  return battles
    .map((battle) => battleToRLHFPair(battle))
    .filter((pair): pair is RLHFPreferencePair => pair !== null)
    .map((pair) => ({
      prompt: pair.prompt,
      chosen: pair.chosen,
      rejected: pair.rejected,
    }));
}

/**
 * Convert battles to Anthropic HH-RLHF format
 * Format: "Human: {prompt}\n\nAssistant: {response}"
 */
export function battlesToHHRLHF(battles: ArenaBattle[]): HHRLHFFormat[] {
  return battles
    .map((battle) => battleToRLHFPair(battle))
    .filter((pair): pair is RLHFPreferencePair => pair !== null)
    .map((pair) => ({
      chosen: `Human: ${pair.prompt}\n\nAssistant: ${pair.chosen}`,
      rejected: `Human: ${pair.prompt}\n\nAssistant: ${pair.rejected}`,
    }));
}

/**
 * Convert battles to OpenAI comparison format
 */
export function battlesToOpenAIComparison(
  battles: ArenaBattle[],
  options?: { includeTies?: boolean }
): OpenAIComparisonFormat[] {
  return battles
    .filter((battle) => {
      if (options?.includeTies) {
        return battle.contestants.length >= 2;
      }
      return battle.winnerId && !battle.isTie;
    })
    .map((battle) => {
      const [a, b] = battle.contestants;
      let label: 'a' | 'b' | 'tie' = 'tie';

      if (battle.winnerId === a.id) {
        label = 'a';
      } else if (battle.winnerId === b.id) {
        label = 'b';
      }

      return {
        prompt: battle.prompt,
        completion_a: a.response,
        completion_b: b.response,
        label,
      };
    });
}

/**
 * Export battles in specified format
 */
export function exportBattles(
  battles: ArenaBattle[],
  options: ExportOptions
): string {
  const {
    format,
    includeMetadata = false,
    includeTies = false,
    minResponseLength = 10,
    filterCategory,
  } = options;

  // Filter battles
  const filteredBattles = battles.filter((b) => {
    // Check min response length
    const hasValidResponses = b.contestants.every(
      (c) => c.response.length >= minResponseLength
    );
    if (!hasValidResponses) return false;

    // Check category filter
    if (filterCategory && b.taskClassification?.category !== filterCategory) {
      return false;
    }

    // Check for valid result
    if (!includeTies && (!b.winnerId || b.isTie)) {
      return false;
    }

    return true;
  });

  let data: unknown[];

  switch (format) {
    case 'rlhf':
      data = filteredBattles
        .map((b) => battleToRLHFPair(b, { includeMetadata }))
        .filter((p): p is RLHFPreferencePair => p !== null);
      break;

    case 'dpo':
      data = battlesToDPO(filteredBattles);
      break;

    case 'hh-rlhf':
      data = battlesToHHRLHF(filteredBattles);
      break;

    case 'openai':
      data = battlesToOpenAIComparison(filteredBattles, { includeTies });
      break;

    case 'jsonl':
    default:
      data = filteredBattles
        .map((b) => battleToRLHFPair(b, { includeMetadata }))
        .filter((p): p is RLHFPreferencePair => p !== null);
      // Return JSONL format (one JSON object per line)
      return data.map((d) => JSON.stringify(d)).join('\n');
  }

  return JSON.stringify(data, null, 2);
}

/**
 * Export preferences in RLHF format
 */
export function exportPreferences(
  preferences: ArenaPreference[],
  battles: ArenaBattle[],
  options?: { includeMetadata?: boolean }
): RLHFPreferencePair[] {
  return preferences
    .map((pref) => {
      const battle = battles.find((b) => b.id === pref.battleId);
      if (!battle) return null;

      const winner = battle.contestants.find(
        (c) => `${c.provider}:${c.model}` === pref.winner
      );
      const loser = battle.contestants.find(
        (c) => `${c.provider}:${c.model}` === pref.loser
      );

      if (!winner || !loser) return null;

      const pair: RLHFPreferencePair = {
        prompt: battle.prompt,
        chosen: winner.response,
        rejected: loser.response,
        chosen_model: pref.winner,
        rejected_model: pref.loser,
        category: pref.taskCategory,
      };

      if (options?.includeMetadata) {
        pair.metadata = {
          battle_id: pref.battleId,
          timestamp: pref.timestamp.toISOString(),
          win_reason: pref.reason,
          task_classification: pref.taskCategory,
        };
      }

      return pair;
    })
    .filter((p): p is RLHFPreferencePair => p !== null);
}

/**
 * Calculate export statistics
 */
export function getExportStats(battles: ArenaBattle[]): {
  totalBattles: number;
  validPairs: number;
  byCategory: Record<string, number>;
  avgPromptLength: number;
  avgResponseLength: number;
} {
  const validBattles = battles.filter(
    (b) => b.winnerId && !b.isTie && b.contestants.every((c) => c.response.length > 0)
  );

  const byCategory: Record<string, number> = {};
  let totalPromptLength = 0;
  let totalResponseLength = 0;
  let responseCount = 0;

  for (const battle of validBattles) {
    const category = battle.taskClassification?.category || 'unknown';
    byCategory[category] = (byCategory[category] || 0) + 1;

    totalPromptLength += battle.prompt.length;
    for (const c of battle.contestants) {
      totalResponseLength += c.response.length;
      responseCount++;
    }
  }

  return {
    totalBattles: battles.length,
    validPairs: validBattles.length,
    byCategory,
    avgPromptLength: validBattles.length > 0 ? totalPromptLength / validBattles.length : 0,
    avgResponseLength: responseCount > 0 ? totalResponseLength / responseCount : 0,
  };
}

/**
 * Download exported data as file
 */
export function downloadExport(
  data: string,
  filename: string,
  format: ExportFormat
): void {
  const mimeTypes: Record<ExportFormat, string> = {
    rlhf: 'application/json',
    dpo: 'application/json',
    'hh-rlhf': 'application/json',
    openai: 'application/json',
    jsonl: 'application/jsonl',
  };

  const extensions: Record<ExportFormat, string> = {
    rlhf: 'json',
    dpo: 'json',
    'hh-rlhf': 'json',
    openai: 'json',
    jsonl: 'jsonl',
  };

  const blob = new Blob([data], { type: mimeTypes[format] });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.${extensions[format]}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
