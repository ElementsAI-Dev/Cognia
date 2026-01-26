/**
 * useElementTreeVisibility - Hook for managing element tree virtualization state
 * Enables efficient rendering of large element trees with lazy expansion
 */

import { useCallback, useMemo, useState } from 'react';
import type { DesignerElement } from '@/types/designer';

export interface VirtualElementTreeNode {
  id: string;
  depth: number;
  visible: boolean;
  expanded: boolean;
  childCount: number;
  element: DesignerElement;
  parentId: string | null;
}

interface UseElementTreeVisibilityOptions {
  defaultExpandDepth?: number;
  maxVisibleNodes?: number;
}

interface UseElementTreeVisibilityReturn {
  flattenedNodes: VirtualElementTreeNode[];
  expandedIds: Set<string>;
  toggleExpand: (id: string) => void;
  expandAll: () => void;
  collapseAll: () => void;
  isExpanded: (id: string) => boolean;
  getVisibleNodes: () => VirtualElementTreeNode[];
  totalCount: number;
}

/**
 * Flatten element tree into array for virtualization
 */
function flattenTree(
  element: DesignerElement | null,
  expandedIds: Set<string>,
  depth: number = 0,
  parentId: string | null = null
): VirtualElementTreeNode[] {
  if (!element) return [];

  const isExpanded = expandedIds.has(element.id);
  const node: VirtualElementTreeNode = {
    id: element.id,
    depth,
    visible: true,
    expanded: isExpanded,
    childCount: element.children.length,
    element,
    parentId,
  };

  const result: VirtualElementTreeNode[] = [node];

  if (isExpanded && element.children.length > 0) {
    for (const child of element.children) {
      result.push(...flattenTree(child, expandedIds, depth + 1, element.id));
    }
  }

  return result;
}

/**
 * Collect all element IDs from tree
 */
function collectAllIds(element: DesignerElement | null): string[] {
  if (!element) return [];
  
  const ids = [element.id];
  for (const child of element.children) {
    ids.push(...collectAllIds(child));
  }
  return ids;
}

/**
 * Collect IDs up to a certain depth
 */
function collectIdsToDepth(
  element: DesignerElement | null,
  maxDepth: number,
  currentDepth: number = 0
): string[] {
  if (!element || currentDepth > maxDepth) return [];
  
  const ids = [element.id];
  if (currentDepth < maxDepth) {
    for (const child of element.children) {
      ids.push(...collectIdsToDepth(child, maxDepth, currentDepth + 1));
    }
  }
  return ids;
}

export function useElementTreeVisibility(
  elementTree: DesignerElement | null,
  options: UseElementTreeVisibilityOptions = {}
): UseElementTreeVisibilityReturn {
  const { defaultExpandDepth = 2 } = options;

  // Initialize expanded IDs based on default depth
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    if (!elementTree) return new Set();
    return new Set(collectIdsToDepth(elementTree, defaultExpandDepth));
  });

  // Toggle expansion of a node
  const toggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Expand all nodes
  const expandAll = useCallback(() => {
    if (!elementTree) return;
    setExpandedIds(new Set(collectAllIds(elementTree)));
  }, [elementTree]);

  // Collapse all nodes
  const collapseAll = useCallback(() => {
    setExpandedIds(new Set());
  }, []);

  // Check if node is expanded
  const isExpanded = useCallback(
    (id: string) => expandedIds.has(id),
    [expandedIds]
  );

  // Flatten tree into virtualized list
  const flattenedNodes = useMemo(() => {
    return flattenTree(elementTree, expandedIds);
  }, [elementTree, expandedIds]);

  // Get visible nodes (all flattened nodes are visible)
  const getVisibleNodes = useCallback(() => {
    return flattenedNodes;
  }, [flattenedNodes]);

  // Total count of all elements (not just visible)
  const totalCount = useMemo(() => {
    return collectAllIds(elementTree).length;
  }, [elementTree]);

  return {
    flattenedNodes,
    expandedIds,
    toggleExpand,
    expandAll,
    collapseAll,
    isExpanded,
    getVisibleNodes,
    totalCount,
  };
}

export default useElementTreeVisibility;
