/**
 * Tests for useElementTreeVisibility hook
 */

import { renderHook, act } from '@testing-library/react';
import { useElementTreeVisibility } from './use-element-tree-visibility';
import type { DesignerElement } from '@/types/designer';

describe('useElementTreeVisibility', () => {
  const createMockElement = (
    id: string,
    children: DesignerElement[] = []
  ): DesignerElement => ({
    id,
    tagName: 'div',
    className: '',
    attributes: {},
    children,
    styles: {},
    parentId: null,
  });

  const mockTree: DesignerElement = createMockElement('root', [
    createMockElement('child-1', [
      createMockElement('grandchild-1-1'),
      createMockElement('grandchild-1-2'),
    ]),
    createMockElement('child-2', [
      createMockElement('grandchild-2-1', [
        createMockElement('great-grandchild-2-1-1'),
      ]),
    ]),
    createMockElement('child-3'),
  ]);

  describe('initialization', () => {
    it('should initialize with empty expandedIds for null tree', () => {
      const { result } = renderHook(() => useElementTreeVisibility(null));

      expect(result.current.flattenedNodes).toEqual([]);
      expect(result.current.expandedIds.size).toBe(0);
      expect(result.current.totalCount).toBe(0);
    });

    it('should expand nodes up to defaultExpandDepth', () => {
      const { result } = renderHook(() =>
        useElementTreeVisibility(mockTree, { defaultExpandDepth: 1 })
      );

      // Depth 0: root, Depth 1: child-1, child-2, child-3
      expect(result.current.expandedIds.has('root')).toBe(true);
      expect(result.current.expandedIds.has('child-1')).toBe(true);
      expect(result.current.expandedIds.has('child-2')).toBe(true);
      expect(result.current.expandedIds.has('child-3')).toBe(true);
    });

    it('should use default depth of 2', () => {
      const { result } = renderHook(() => useElementTreeVisibility(mockTree));

      // Default depth is 2, so grandchildren should be expanded
      expect(result.current.expandedIds.has('root')).toBe(true);
      expect(result.current.expandedIds.has('child-1')).toBe(true);
      expect(result.current.expandedIds.has('grandchild-1-1')).toBe(true);
    });
  });

  describe('flattenedNodes', () => {
    it('should flatten tree based on expanded state', () => {
      const { result } = renderHook(() =>
        useElementTreeVisibility(mockTree, { defaultExpandDepth: 0 })
      );

      // Only root expanded initially at depth 0
      // With depth 0, only root is expanded
      const nodes = result.current.flattenedNodes;
      expect(nodes.length).toBeGreaterThanOrEqual(1);
      expect(nodes[0].id).toBe('root');
    });

    it('should include correct depth information', () => {
      const { result } = renderHook(() =>
        useElementTreeVisibility(mockTree, { defaultExpandDepth: 3 })
      );

      const rootNode = result.current.flattenedNodes.find((n) => n.id === 'root');
      const childNode = result.current.flattenedNodes.find((n) => n.id === 'child-1');
      const grandchildNode = result.current.flattenedNodes.find(
        (n) => n.id === 'grandchild-1-1'
      );

      expect(rootNode?.depth).toBe(0);
      expect(childNode?.depth).toBe(1);
      expect(grandchildNode?.depth).toBe(2);
    });

    it('should include parentId information', () => {
      const { result } = renderHook(() =>
        useElementTreeVisibility(mockTree, { defaultExpandDepth: 3 })
      );

      const rootNode = result.current.flattenedNodes.find((n) => n.id === 'root');
      const childNode = result.current.flattenedNodes.find((n) => n.id === 'child-1');

      expect(rootNode?.parentId).toBeNull();
      expect(childNode?.parentId).toBe('root');
    });

    it('should include childCount', () => {
      const { result } = renderHook(() =>
        useElementTreeVisibility(mockTree, { defaultExpandDepth: 3 })
      );

      const rootNode = result.current.flattenedNodes.find((n) => n.id === 'root');
      const childNode = result.current.flattenedNodes.find((n) => n.id === 'child-1');
      const leafNode = result.current.flattenedNodes.find(
        (n) => n.id === 'grandchild-1-1'
      );

      expect(rootNode?.childCount).toBe(3);
      expect(childNode?.childCount).toBe(2);
      expect(leafNode?.childCount).toBe(0);
    });
  });

  describe('toggleExpand', () => {
    it('should collapse expanded node', () => {
      const { result } = renderHook(() =>
        useElementTreeVisibility(mockTree, { defaultExpandDepth: 2 })
      );

      expect(result.current.isExpanded('child-1')).toBe(true);

      act(() => {
        result.current.toggleExpand('child-1');
      });

      expect(result.current.isExpanded('child-1')).toBe(false);
    });

    it('should expand collapsed node', () => {
      const { result } = renderHook(() =>
        useElementTreeVisibility(mockTree, { defaultExpandDepth: 0 })
      );

      // At depth 0, only root is expanded, children are not
      const initialExpanded = result.current.isExpanded('child-1');

      act(() => {
        result.current.toggleExpand('child-1');
      });

      expect(result.current.isExpanded('child-1')).toBe(!initialExpanded);
    });

    it('should update flattenedNodes after toggle', () => {
      const { result } = renderHook(() =>
        useElementTreeVisibility(mockTree, { defaultExpandDepth: 1 })
      );

      const initialNodeCount = result.current.flattenedNodes.length;

      act(() => {
        result.current.toggleExpand('child-1');
      });

      // After collapsing child-1, grandchildren should not be visible
      const newNodeCount = result.current.flattenedNodes.length;
      expect(newNodeCount).not.toBe(initialNodeCount);
    });
  });

  describe('expandAll', () => {
    it('should expand all nodes', () => {
      const { result } = renderHook(() =>
        useElementTreeVisibility(mockTree, { defaultExpandDepth: 0 })
      );

      act(() => {
        result.current.expandAll();
      });

      // All nodes should be expanded
      expect(result.current.isExpanded('root')).toBe(true);
      expect(result.current.isExpanded('child-1')).toBe(true);
      expect(result.current.isExpanded('child-2')).toBe(true);
      expect(result.current.isExpanded('grandchild-1-1')).toBe(true);
      expect(result.current.isExpanded('grandchild-2-1')).toBe(true);
    });

    it('should do nothing when tree is null', () => {
      const { result } = renderHook(() => useElementTreeVisibility(null));

      act(() => {
        result.current.expandAll();
      });

      expect(result.current.expandedIds.size).toBe(0);
    });

    it('should show all nodes in flattenedNodes', () => {
      const { result } = renderHook(() =>
        useElementTreeVisibility(mockTree, { defaultExpandDepth: 0 })
      );

      act(() => {
        result.current.expandAll();
      });

      expect(result.current.flattenedNodes.length).toBe(result.current.totalCount);
    });
  });

  describe('collapseAll', () => {
    it('should collapse all nodes', () => {
      const { result } = renderHook(() =>
        useElementTreeVisibility(mockTree, { defaultExpandDepth: 3 })
      );

      act(() => {
        result.current.collapseAll();
      });

      expect(result.current.expandedIds.size).toBe(0);
      expect(result.current.isExpanded('root')).toBe(false);
      expect(result.current.isExpanded('child-1')).toBe(false);
    });

    it('should show only root in flattenedNodes', () => {
      const { result } = renderHook(() =>
        useElementTreeVisibility(mockTree, { defaultExpandDepth: 3 })
      );

      act(() => {
        result.current.collapseAll();
      });

      // Only root should be visible (not expanded, but still rendered)
      expect(result.current.flattenedNodes.length).toBe(1);
      expect(result.current.flattenedNodes[0].id).toBe('root');
    });
  });

  describe('isExpanded', () => {
    it('should return true for expanded node', () => {
      const { result } = renderHook(() =>
        useElementTreeVisibility(mockTree, { defaultExpandDepth: 2 })
      );

      expect(result.current.isExpanded('root')).toBe(true);
    });

    it('should return false for collapsed node', () => {
      const { result } = renderHook(() =>
        useElementTreeVisibility(mockTree, { defaultExpandDepth: 0 })
      );

      // With depth 0, root is expanded, but check deeper nodes
      act(() => {
        result.current.collapseAll();
      });

      expect(result.current.isExpanded('child-1')).toBe(false);
    });
  });

  describe('getVisibleNodes', () => {
    it('should return flattenedNodes', () => {
      const { result } = renderHook(() =>
        useElementTreeVisibility(mockTree, { defaultExpandDepth: 1 })
      );

      const visibleNodes = result.current.getVisibleNodes();

      expect(visibleNodes).toEqual(result.current.flattenedNodes);
    });
  });

  describe('totalCount', () => {
    it('should count all elements in tree', () => {
      const { result } = renderHook(() => useElementTreeVisibility(mockTree));

      // root + 3 children + 2 grandchildren under child-1 + 1 grandchild under child-2 + 1 great-grandchild
      // = 1 + 3 + 2 + 1 + 1 = 8
      expect(result.current.totalCount).toBe(8);
    });

    it('should return 0 for null tree', () => {
      const { result } = renderHook(() => useElementTreeVisibility(null));

      expect(result.current.totalCount).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('should handle single node tree', () => {
      const singleNode = createMockElement('single');
      const { result } = renderHook(() => useElementTreeVisibility(singleNode));

      expect(result.current.flattenedNodes.length).toBe(1);
      expect(result.current.totalCount).toBe(1);
    });

    it('should handle deeply nested tree', () => {
      const deepTree = createMockElement('level-0', [
        createMockElement('level-1', [
          createMockElement('level-2', [
            createMockElement('level-3', [
              createMockElement('level-4', [
                createMockElement('level-5'),
              ]),
            ]),
          ]),
        ]),
      ]);

      const { result } = renderHook(() =>
        useElementTreeVisibility(deepTree, { defaultExpandDepth: 10 })
      );

      expect(result.current.totalCount).toBe(6);
      expect(result.current.flattenedNodes.length).toBe(6);
    });

    it('should handle tree with many siblings', () => {
      const wideTree = createMockElement('root', [
        createMockElement('child-1'),
        createMockElement('child-2'),
        createMockElement('child-3'),
        createMockElement('child-4'),
        createMockElement('child-5'),
      ]);

      const { result } = renderHook(() =>
        useElementTreeVisibility(wideTree, { defaultExpandDepth: 1 })
      );

      expect(result.current.totalCount).toBe(6);
    });

    it('should preserve expanded state across renders', () => {
      const { result, rerender } = renderHook(() =>
        useElementTreeVisibility(mockTree, { defaultExpandDepth: 1 })
      );

      act(() => {
        result.current.toggleExpand('child-1');
      });

      const wasExpanded = result.current.isExpanded('child-1');

      rerender();

      expect(result.current.isExpanded('child-1')).toBe(wasExpanded);
    });
  });

  describe('VirtualElementTreeNode structure', () => {
    it('should include all required properties', () => {
      const { result } = renderHook(() =>
        useElementTreeVisibility(mockTree, { defaultExpandDepth: 1 })
      );

      const node = result.current.flattenedNodes[0];

      expect(node).toHaveProperty('id');
      expect(node).toHaveProperty('depth');
      expect(node).toHaveProperty('visible');
      expect(node).toHaveProperty('expanded');
      expect(node).toHaveProperty('childCount');
      expect(node).toHaveProperty('element');
      expect(node).toHaveProperty('parentId');
    });

    it('should mark nodes as visible', () => {
      const { result } = renderHook(() =>
        useElementTreeVisibility(mockTree, { defaultExpandDepth: 1 })
      );

      result.current.flattenedNodes.forEach((node) => {
        expect(node.visible).toBe(true);
      });
    });

    it('should correctly set expanded property', () => {
      const { result } = renderHook(() =>
        useElementTreeVisibility(mockTree, { defaultExpandDepth: 1 })
      );

      const rootNode = result.current.flattenedNodes.find((n) => n.id === 'root');
      expect(rootNode?.expanded).toBe(true);
    });
  });
});
