/**
 * Git File Tree Builder
 *
 * Builds a hierarchical tree structure from a flat list of
 * Git file statuses for tree-view rendering.
 */

import type { GitFileStatus } from '@/types/system/git';
import type { TreeNode } from '@/types/git';

/**
 * Build a hierarchical TreeNode structure from a flat list of GitFileStatus entries.
 *
 * Splits file paths into directory segments, creates intermediate directory nodes
 * as needed, and sorts the result with directories first (alphabetically),
 * then files (alphabetically).
 */
export function buildFileTree(files: GitFileStatus[]): TreeNode {
  const root: TreeNode = {
    name: '',
    path: '',
    isDirectory: true,
    children: [],
  };

  for (const file of files) {
    const parts = file.path.split('/');
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const path = parts.slice(0, i + 1).join('/');
      const isFile = i === parts.length - 1;

      let child = current.children.find((c) => c.name === part);
      if (!child) {
        child = {
          name: part,
          path,
          isDirectory: !isFile,
          status: isFile ? file : undefined,
          children: [],
        };
        current.children.push(child);
      }
      current = child;
    }
  }

  // Sort: directories first, then files, both alphabetically
  const sortChildren = (node: TreeNode) => {
    node.children.sort((a, b) => {
      if (a.isDirectory !== b.isDirectory) {
        return a.isDirectory ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
    node.children.forEach(sortChildren);
  };
  sortChildren(root);

  return root;
}
