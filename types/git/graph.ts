/**
 * Git Graph Types
 *
 * Types for commit graph lane assignment and visualization.
 */

import type { GitGraphCommit } from '@/types/system/git';

/** Result of the lane assignment algorithm */
export interface LaneAssignment {
  commits: GitGraphCommit[];
  maxLane: number;
}
