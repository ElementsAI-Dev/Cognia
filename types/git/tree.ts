/**
 * Git File Tree Types
 *
 * Types for hierarchical file tree representation of Git file status.
 */

import type { GitFileStatus } from '@/types/system/git';

/** A node in the file tree (file or directory) */
export interface TreeNode {
  name: string;
  path: string;
  isDirectory: boolean;
  status?: GitFileStatus;
  children: TreeNode[];
}
