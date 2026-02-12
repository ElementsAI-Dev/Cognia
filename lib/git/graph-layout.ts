/**
 * Git Graph Layout
 *
 * Lane assignment algorithm and constants for SVG-based
 * commit graph visualization.
 */

import type { GitGraphCommit } from '@/types/system/git';
import type { LaneAssignment } from '@/types/git';

// ==================== Constants ====================

export const LANE_WIDTH = 20;
export const NODE_RADIUS = 5;
export const ROW_HEIGHT = 32;
export const SVG_PADDING_LEFT = 10;
export const SVG_PADDING_TOP = 16;

export const LANE_COLORS = [
  'hsl(210, 80%, 60%)', // blue
  'hsl(150, 70%, 50%)', // green
  'hsl(30, 90%, 55%)',  // orange
  'hsl(280, 70%, 60%)', // purple
  'hsl(0, 80%, 60%)',   // red
  'hsl(180, 70%, 50%)', // cyan
  'hsl(60, 80%, 50%)',  // yellow
  'hsl(330, 70%, 60%)', // pink
];

// ==================== Lane Algorithm ====================

/**
 * Assign visual lanes to commits for graph rendering.
 *
 * Iterates through commits and assigns each to an available lane,
 * ensuring parent-child relationships are maintained visually.
 * Handles both linear histories and merge commits by reserving
 * lanes for parents and finding new lanes when necessary.
 */
export function assignLanes(commits: GitGraphCommit[]): LaneAssignment {
  if (commits.length === 0) return { commits: [], maxLane: 0 };

  const hashToIndex = new Map<string, number>();
  commits.forEach((c, i) => hashToIndex.set(c.hash, i));

  // Track which lanes are occupied at each row
  const activeLanes: (string | null)[] = [];
  const result = commits.map((commit) => ({ ...commit, lane: 0 }));

  for (let i = 0; i < result.length; i++) {
    const commit = result[i];

    // Check if this commit is already assigned to a lane (as a parent target)
    let assignedLane = activeLanes.indexOf(commit.hash);

    if (assignedLane === -1) {
      // Find first free lane
      assignedLane = activeLanes.indexOf(null);
      if (assignedLane === -1) {
        assignedLane = activeLanes.length;
        activeLanes.push(null);
      }
    }

    commit.lane = assignedLane;
    activeLanes[assignedLane] = null;

    // Reserve lanes for parents
    for (let p = 0; p < commit.parents.length; p++) {
      const parentHash = commit.parents[p];
      const parentIdx = hashToIndex.get(parentHash);
      if (parentIdx === undefined) continue;

      if (p === 0) {
        // First parent continues in same lane
        if (activeLanes[assignedLane] === null) {
          activeLanes[assignedLane] = parentHash;
        } else {
          // Lane taken, find a new one
          let freeLane = activeLanes.indexOf(null);
          if (freeLane === -1) {
            freeLane = activeLanes.length;
            activeLanes.push(null);
          }
          activeLanes[freeLane] = parentHash;
        }
      } else {
        // Merge parent: assign to a new lane if not already tracked
        const existing = activeLanes.indexOf(parentHash);
        if (existing === -1) {
          let freeLane = activeLanes.indexOf(null);
          if (freeLane === -1) {
            freeLane = activeLanes.length;
            activeLanes.push(null);
          }
          activeLanes[freeLane] = parentHash;
        }
      }
    }
  }

  const maxLane = Math.max(0, ...result.map((c) => c.lane));
  return { commits: result, maxLane };
}
