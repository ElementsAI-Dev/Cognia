import {
  buildReviewedBattleExportPreview,
  prepareReviewedBattleExport,
} from './review-export';
import type { ArenaBattle, ArenaBattleReview, ArenaContestant } from '@/types/arena';

function createContestant(id: string, overrides?: Partial<ArenaContestant>): ArenaContestant {
  return {
    id,
    provider: 'openai',
    model: `model-${id}`,
    displayName: `Model ${id}`,
    response: `This is a sufficiently long response from ${id}.`,
    status: 'completed',
    ...overrides,
  };
}

function createBattle(overrides?: Partial<ArenaBattle>): ArenaBattle {
  return {
    id: 'battle-1',
    prompt: 'Compare these answers',
    mode: 'blind',
    contestants: [
      createContestant('a', { provider: 'openai', model: 'gpt-4o-mini' }),
      createContestant('b', { provider: 'anthropic', model: 'claude-3-5-sonnet' }),
    ],
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    winnerId: 'a',
    winReason: 'quality',
    completedAt: new Date('2026-01-01T00:01:00.000Z'),
    ...overrides,
  };
}

describe('review export orchestration', () => {
  it('blocks export when selected battles are not reviewed or not judged', () => {
    const reviewedBattles: Record<string, ArenaBattleReview> = {
      judged: {
        battleId: 'judged',
        reviewed: false,
        bookmarked: false,
        updatedAt: new Date('2026-01-01T00:02:00.000Z'),
      },
      pending: {
        battleId: 'pending',
        reviewed: true,
        bookmarked: false,
        updatedAt: new Date('2026-01-01T00:03:00.000Z'),
      },
    };

    const preview = buildReviewedBattleExportPreview({
      battles: [
        createBattle({ id: 'judged' }),
        createBattle({ id: 'pending', winnerId: undefined, completedAt: undefined }),
      ],
      reviewMetadata: reviewedBattles,
      selectedBattleIds: ['judged', 'pending'],
      format: 'rlhf',
    });

    expect(preview.selectedCount).toBe(2);
    expect(preview.exportableCount).toBe(0);
    expect(preview.blockedCount).toBe(2);
    expect(preview.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ battleId: 'judged', reasonCodes: ['notReviewed'] }),
        expect.objectContaining({ battleId: 'pending', reasonCodes: ['notJudged'] }),
      ])
    );
  });

  it('previews mixed exportable and blocked reviewed battles', () => {
    const preview = buildReviewedBattleExportPreview({
      battles: [
        createBattle({ id: 'winner-reviewed' }),
        createBattle({ id: 'tie-reviewed', winnerId: undefined, isTie: true }),
        createBattle({
          id: 'short-response',
          contestants: [
            createContestant('a', { response: 'short' }),
            createContestant('b', { response: 'also short' }),
          ],
        }),
      ],
      reviewMetadata: {
        'winner-reviewed': {
          battleId: 'winner-reviewed',
          reviewed: true,
          bookmarked: true,
          note: 'gold sample',
          updatedAt: new Date('2026-01-01T00:02:00.000Z'),
        },
        'tie-reviewed': {
          battleId: 'tie-reviewed',
          reviewed: true,
          bookmarked: false,
          updatedAt: new Date('2026-01-01T00:02:00.000Z'),
        },
        'short-response': {
          battleId: 'short-response',
          reviewed: true,
          bookmarked: false,
          updatedAt: new Date('2026-01-01T00:02:00.000Z'),
        },
      },
      selectedBattleIds: ['winner-reviewed', 'tie-reviewed', 'short-response'],
      format: 'rlhf',
    });

    expect(preview.selectedCount).toBe(3);
    expect(preview.exportableCount).toBe(1);
    expect(preview.blockedCount).toBe(2);
    expect(preview.exportableBattleIds).toEqual(['winner-reviewed']);
  });

  it('defaults to all eligible reviewed battles when no explicit selection is provided', () => {
    const preview = buildReviewedBattleExportPreview({
      battles: [
        createBattle({ id: 'reviewed-winner' }),
        createBattle({ id: 'reviewed-tie', winnerId: undefined, isTie: true }),
        createBattle({ id: 'not-reviewed' }),
      ],
      reviewMetadata: {
        'reviewed-winner': {
          battleId: 'reviewed-winner',
          reviewed: true,
          bookmarked: true,
          updatedAt: new Date('2026-01-01T00:02:00.000Z'),
        },
        'reviewed-tie': {
          battleId: 'reviewed-tie',
          reviewed: true,
          bookmarked: false,
          updatedAt: new Date('2026-01-01T00:02:00.000Z'),
        },
      },
      format: 'openai-comparison',
    });

    expect(preview.selectedBattleIds).toEqual(['reviewed-winner', 'reviewed-tie']);
    expect(preview.exportableCount).toBe(2);
  });

  it('prepares export data only for exportable reviewed battles and includes review metadata', () => {
    const result = prepareReviewedBattleExport({
      battles: [
        createBattle({ id: 'winner-reviewed' }),
        createBattle({ id: 'unreviewed' }),
      ],
      reviewMetadata: {
        'winner-reviewed': {
          battleId: 'winner-reviewed',
          reviewed: true,
          bookmarked: true,
          note: 'excellent sample',
          updatedAt: new Date('2026-01-01T00:02:00.000Z'),
        },
      },
      selectedBattleIds: ['winner-reviewed', 'unreviewed'],
      format: 'rlhf',
    });

    expect(result.preview.exportableCount).toBe(1);
    expect(result.data).toBeTruthy();

    const parsed = JSON.parse(result.data || '[]');
    expect(parsed).toHaveLength(1);
    expect(parsed[0].metadata.review_note).toBe('excellent sample');
    expect(parsed[0].metadata.bookmarked).toBe(true);
  });
});
