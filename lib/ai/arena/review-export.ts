import type { ArenaBattle, ArenaBattleReview } from '@/types/arena';
import {
  battleToRLHFPair,
  exportBattles,
  type ExportFormat,
} from './rlhf-export';

export type ReviewedBattleExportReasonCode =
  | 'notFound'
  | 'notReviewed'
  | 'notJudged'
  | 'insufficientResponses'
  | 'unsupportedOutcome';

export interface ReviewedBattleExportItem {
  battleId: string;
  exportable: boolean;
  reasonCodes: ReviewedBattleExportReasonCode[];
}

export interface ReviewedBattleExportPreview {
  selectedBattleIds: string[];
  selectedCount: number;
  exportableCount: number;
  blockedCount: number;
  skippedCount: number;
  exportableBattleIds: string[];
  items: ReviewedBattleExportItem[];
}

export interface ReviewedBattleExportResult {
  preview: ReviewedBattleExportPreview;
  data: string | null;
}

interface ReviewedBattleExportArgs {
  battles: ArenaBattle[];
  reviewMetadata: Record<string, ArenaBattleReview>;
  selectedBattleIds?: string[];
  format: ExportFormat;
  minResponseLength?: number;
}

function isBattleJudged(battle: ArenaBattle): boolean {
  return Boolean(battle.winnerId || battle.isTie || battle.isBothBad);
}

function supportsOutcome(format: ExportFormat, battle: ArenaBattle): boolean {
  if (battle.isBothBad) {
    return false;
  }

  if (format === 'openai' || format === 'openai-comparison') {
    return Boolean(battle.winnerId || battle.isTie);
  }

  return Boolean(battle.winnerId) && !battle.isTie;
}

function hasSufficientResponses(battle: ArenaBattle, minResponseLength: number): boolean {
  return battle.contestants.every((contestant) => contestant.response.length >= minResponseLength);
}

function resolveSelectedBattleIds({
  battles,
  reviewMetadata,
  selectedBattleIds,
  format,
  minResponseLength,
}: Required<ReviewedBattleExportArgs>): string[] {
  if (selectedBattleIds.length > 0) {
    return selectedBattleIds;
  }

  return battles
    .filter((battle) => {
      const review = reviewMetadata[battle.id];
      return (
        review?.reviewed &&
        isBattleJudged(battle) &&
        supportsOutcome(format, battle) &&
        hasSufficientResponses(battle, minResponseLength)
      );
    })
    .map((battle) => battle.id);
}

export function buildReviewedBattleExportPreview(
  args: ReviewedBattleExportArgs
): ReviewedBattleExportPreview {
  const minResponseLength = args.minResponseLength ?? 10;
  const selectedBattleIds = resolveSelectedBattleIds({
    ...args,
    selectedBattleIds: args.selectedBattleIds ?? [],
    minResponseLength,
  });

  const items: ReviewedBattleExportItem[] = selectedBattleIds.map((battleId) => {
    const battle = args.battles.find((candidate) => candidate.id === battleId);
    const review = args.reviewMetadata[battleId];
    const reasonCodes: ReviewedBattleExportReasonCode[] = [];

    if (!battle) {
      reasonCodes.push('notFound');
    } else {
      if (!review?.reviewed) {
        reasonCodes.push('notReviewed');
      }
      const judged = isBattleJudged(battle);
      if (!judged) {
        reasonCodes.push('notJudged');
      }
      if (!hasSufficientResponses(battle, minResponseLength)) {
        reasonCodes.push('insufficientResponses');
      }
      if (judged && !supportsOutcome(args.format, battle)) {
        reasonCodes.push('unsupportedOutcome');
      }
    }

    return {
      battleId,
      exportable: reasonCodes.length === 0,
      reasonCodes,
    };
  });

  const exportableBattleIds = items
    .filter((item) => item.exportable)
    .map((item) => item.battleId);
  const blockedItems = items.filter((item) => !item.exportable);
  const skippedCount = blockedItems.filter((item) =>
    item.reasonCodes.some((reasonCode) =>
      reasonCode === 'insufficientResponses' || reasonCode === 'unsupportedOutcome'
    )
  ).length;

  return {
    selectedBattleIds,
    selectedCount: selectedBattleIds.length,
    exportableCount: exportableBattleIds.length,
    blockedCount: blockedItems.length,
    skippedCount,
    exportableBattleIds,
    items,
  };
}

export function prepareReviewedBattleExport(
  args: ReviewedBattleExportArgs
): ReviewedBattleExportResult {
  const preview = buildReviewedBattleExportPreview(args);
  if (preview.exportableCount === 0) {
    return {
      preview,
      data: null,
    };
  }

  const exportableBattles = preview.exportableBattleIds
    .map((battleId) => args.battles.find((battle) => battle.id === battleId))
    .filter((battle): battle is ArenaBattle => Boolean(battle));

  let data: string;

  if (args.format === 'rlhf' || args.format === 'jsonl') {
    const pairs = exportableBattles
      .map((battle) =>
        battleToRLHFPair(battle, {
          includeMetadata: true,
          reviewMetadata: args.reviewMetadata[battle.id],
        })
      )
      .filter((pair): pair is NonNullable<ReturnType<typeof battleToRLHFPair>> => pair !== null);

    data =
      args.format === 'jsonl'
        ? pairs.map((pair) => JSON.stringify(pair)).join('\n')
        : JSON.stringify(pairs, null, 2);
  } else {
    data = exportBattles(exportableBattles, {
      format: args.format,
      includeMetadata: true,
      includeTies: args.format === 'openai' || args.format === 'openai-comparison',
      minResponseLength: args.minResponseLength ?? 10,
    });
  }

  return {
    preview,
    data,
  };
}
