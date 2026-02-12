/**
 * Arena constants - shared constant values used across arena components
 */

import type { ArenaWinReason } from '@/types/arena';
import type { TaskCategory } from '@/types/provider/auto-router';

/**
 * All available win reasons for arena voting
 */
export const WIN_REASONS: ArenaWinReason[] = [
  'quality',
  'accuracy',
  'clarity',
  'speed',
  'completeness',
  'creativity',
  'conciseness',
  'other',
];

/**
 * Category IDs for leaderboard tabs
 */
export const CATEGORY_IDS: Array<TaskCategory | 'all'> = [
  'all',
  'coding',
  'math',
  'analysis',
  'creative',
  'research',
  'translation',
];
