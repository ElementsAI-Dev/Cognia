/**
 * Tests for flow-layout.ts
 * Layout algorithm for flow chat canvas using dagre
 */

import {
  messagesToFlowNodes,
  autoLayoutNodes,
  getNodePositions,
  calculateFitViewport,
} from './flow-layout';
import type { UIMessage } from '@/types/core/message';
import type { ConversationBranch } from '@/types/core/session';
import type { FlowChatCanvasState, FlowChatNode, FlowChatEdge } from '@/types/chat/flow-chat';

// Mock dagre library
jest.mock('@dagrejs/dagre', () => {
  const mockGraph = {
    setGraph: jest.fn(),
    setDefaultEdgeLabel: jest.fn(),
    setNode: jest.fn(),
    setEdge: jest.fn(),
    nodes: jest.fn().mockReturnValue(['msg1', 'msg2']),
    node: jest.fn().mockImplementation((id: string) => ({
      x: id === 'msg1' ? 200 : 200,
      y: id === 'msg1' ? 75 : 275,
    })),
  };
  return {
    graphlib: {
      Graph: jest.fn().mockReturnValue(mockGraph),
    },
    layout: jest.fn(),
  };
});

// Mock messages
const createMockMessage = (
  id: string,
  role: 'user' | 'assistant' | 'system',
  branchId?: string
): UIMessage => ({
  id,
  role,
  content: `Test message ${id}`,
  createdAt: new Date(),
  branchId,
});

// Mock canvas state
const createMockCanvasState = (
  overrides: Partial<FlowChatCanvasState> = {}
): FlowChatCanvasState => ({
  viewMode: 'flow',
  viewport: { x: 0, y: 0, zoom: 1 },
  selectedNodeIds: [],
  collapsedNodeIds: [],
  nodePositions: {},
  layoutAlgorithm: 'dagre',
  layoutDirection: 'TB',
  showMinimap: true,
  showGrid: true,
  snapToGrid: true,
  gridSize: 20,
  nodeGroups: [],
  bookmarkedNodeIds: [],
  tagDefinitions: [],
  nodeTags: {},
  comparisonNodeIds: [],
  showThumbnails: true,
  showNodeStats: true,
  ...overrides,
});

// Mock branch
const createMockBranch = (
  id: string,
  branchPointMessageId: string,
  name: string = 'Branch'
): ConversationBranch => ({
  id,
  branchPointMessageId,
  createdAt: new Date(),
  updatedAt: new Date(),
  name,
  messageCount: 0,
  isActive: true,
});

// Mock flow node
const createMockFlowNode = (
  id: string,
  role: 'user' | 'assistant' | 'system' = 'user',
  position = { x: 0, y: 0 }
): FlowChatNode => ({
  id,
  type: role,
  position,
  data: {
    message: createMockMessage(id, role),
    role,
    collapseState: 'expanded',
    isSelected: false,
    isBranchPoint: false,
  },
  draggable: true,
  selectable: true,
});

describe('flow-layout', () => {
  describe('messagesToFlowNodes', () => {
    it('should convert empty messages to empty result', () => {
      const result = messagesToFlowNodes([], [], createMockCanvasState());
      
      expect(result.nodes).toHaveLength(0);
      expect(result.edges).toHaveLength(0);
    });

    it('should convert single message to single node with no edges', () => {
      const messages: UIMessage[] = [createMockMessage('msg1', 'user')];
      const result = messagesToFlowNodes(messages, [], createMockCanvasState());
      
      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].id).toBe('msg1');
      expect(result.nodes[0].type).toBe('user');
      expect(result.nodes[0].data.message.id).toBe('msg1');
      expect(result.edges).toHaveLength(0);
    });

    it('should create edges between consecutive messages', () => {
      const messages: UIMessage[] = [
        createMockMessage('msg1', 'user'),
        createMockMessage('msg2', 'assistant'),
        createMockMessage('msg3', 'user'),
      ];
      const result = messagesToFlowNodes(messages, [], createMockCanvasState());
      
      expect(result.nodes).toHaveLength(3);
      expect(result.edges).toHaveLength(2);
      expect(result.edges[0].source).toBe('msg1');
      expect(result.edges[0].target).toBe('msg2');
      expect(result.edges[1].source).toBe('msg2');
      expect(result.edges[1].target).toBe('msg3');
    });

    it('should handle branch messages correctly', () => {
      const messages: UIMessage[] = [
        createMockMessage('msg1', 'user'),
        createMockMessage('msg2', 'assistant'),
        createMockMessage('msg3', 'assistant', 'branch1'),
      ];
      const branches: ConversationBranch[] = [
        createMockBranch('branch1', 'msg1', 'Branch 1'),
      ];
      const result = messagesToFlowNodes(messages, branches, createMockCanvasState());
      
      expect(result.nodes).toHaveLength(3);
      expect(result.nodes[2].data.branchId).toBe('branch1');
      
      // Branch point should be marked
      const branchPointNode = result.nodes.find(n => n.id === 'msg1');
      expect(branchPointNode?.data.isBranchPoint).toBe(true);
      expect(branchPointNode?.data.childBranchIds).toContain('branch1');
    });

    it('should use manual positions when specified', () => {
      const messages: UIMessage[] = [createMockMessage('msg1', 'user')];
      const canvasState = createMockCanvasState({
        layoutAlgorithm: 'manual',
        nodePositions: {
          msg1: { messageId: 'msg1', x: 100, y: 200 },
        },
      });
      const result = messagesToFlowNodes(messages, [], canvasState);
      
      expect(result.nodes[0].position).toEqual({ x: 100, y: 200 });
    });

    it('should mark selected nodes', () => {
      const messages: UIMessage[] = [
        createMockMessage('msg1', 'user'),
        createMockMessage('msg2', 'assistant'),
      ];
      const canvasState = createMockCanvasState({
        selectedNodeIds: ['msg1'],
      });
      const result = messagesToFlowNodes(messages, [], canvasState);
      
      expect(result.nodes[0].data.isSelected).toBe(true);
      expect(result.nodes[1].data.isSelected).toBe(false);
    });

    it('should mark collapsed nodes', () => {
      const messages: UIMessage[] = [
        createMockMessage('msg1', 'user'),
        createMockMessage('msg2', 'assistant'),
      ];
      const canvasState = createMockCanvasState({
        collapsedNodeIds: ['msg2'],
      });
      const result = messagesToFlowNodes(messages, [], canvasState);
      
      expect(result.nodes[0].data.collapseState).toBe('expanded');
      expect(result.nodes[1].data.collapseState).toBe('collapsed');
    });

    it('should set correct edge type for branch edges', () => {
      const messages: UIMessage[] = [
        createMockMessage('msg1', 'user'),
        createMockMessage('msg2', 'assistant', 'branch1'),
      ];
      const branches: ConversationBranch[] = [
        createMockBranch('branch1', 'msg1', 'Branch 1'),
      ];
      const result = messagesToFlowNodes(messages, branches, createMockCanvasState());
      
      const branchEdge = result.edges.find(e => e.target === 'msg2');
      expect(branchEdge?.data?.edgeType).toBe('branch');
      expect(branchEdge?.data?.branchId).toBe('branch1');
    });

    it('should set correct edge type for conversation edges', () => {
      const messages: UIMessage[] = [
        createMockMessage('msg1', 'user'),
        createMockMessage('msg2', 'assistant'),
      ];
      const result = messagesToFlowNodes(messages, [], createMockCanvasState());
      
      expect(result.edges[0].data?.edgeType).toBe('conversation');
      expect(result.edges[0].data?.branchId).toBeUndefined();
    });

    it('should apply custom layout options', () => {
      const messages: UIMessage[] = [
        createMockMessage('msg1', 'user'),
        createMockMessage('msg2', 'assistant'),
      ];
      const result = messagesToFlowNodes(messages, [], createMockCanvasState(), {
        nodeWidth: 500,
        nodeHeight: 200,
      });
      
      expect(result.nodes).toHaveLength(2);
      // Nodes should have positions calculated with custom options
      expect(result.nodes[0].position).toBeDefined();
      expect(result.nodes[1].position).toBeDefined();
    });
  });

  describe('autoLayoutNodes', () => {
    it('should return empty array for empty input', () => {
      const result = autoLayoutNodes([], [], 'TB');
      expect(result).toHaveLength(0);
    });

    it('should layout single node at origin', () => {
      const nodes = [createMockFlowNode('node1')];
      const result = autoLayoutNodes(nodes, [], 'TB');
      
      expect(result).toHaveLength(1);
      expect(result[0].position).toBeDefined();
    });

    it('should layout nodes in top-to-bottom direction', () => {
      const nodes = [createMockFlowNode('node1'), createMockFlowNode('node2')];
      const edges: FlowChatEdge[] = [
        { id: 'edge1', source: 'node1', target: 'node2', type: 'default' },
      ];
      const result = autoLayoutNodes(nodes, edges, 'TB');
      
      expect(result[0].position.y).toBeLessThan(result[1].position.y);
    });

    it('should layout nodes in bottom-to-top direction', () => {
      const nodes = [createMockFlowNode('node1'), createMockFlowNode('node2')];
      const edges: FlowChatEdge[] = [
        { id: 'edge1', source: 'node1', target: 'node2', type: 'default' },
      ];
      const result = autoLayoutNodes(nodes, edges, 'BT');
      
      expect(result[0].position.y).toBeGreaterThan(result[1].position.y);
    });

    it('should layout nodes in left-to-right direction', () => {
      const nodes = [createMockFlowNode('node1'), createMockFlowNode('node2')];
      const edges: FlowChatEdge[] = [
        { id: 'edge1', source: 'node1', target: 'node2', type: 'default' },
      ];
      const result = autoLayoutNodes(nodes, edges, 'LR');
      
      expect(result[0].position.x).toBeLessThan(result[1].position.x);
    });

    it('should layout nodes in right-to-left direction', () => {
      const nodes = [createMockFlowNode('node1'), createMockFlowNode('node2')];
      const edges: FlowChatEdge[] = [
        { id: 'edge1', source: 'node1', target: 'node2', type: 'default' },
      ];
      const result = autoLayoutNodes(nodes, edges, 'RL');
      
      expect(result[0].position.x).toBeGreaterThan(result[1].position.x);
    });

    it('should handle branching graph structures', () => {
      const nodes = [
        createMockFlowNode('root'),
        createMockFlowNode('child1'),
        createMockFlowNode('child2'),
      ];
      const edges: FlowChatEdge[] = [
        { id: 'edge1', source: 'root', target: 'child1', type: 'default' },
        { id: 'edge2', source: 'root', target: 'child2', type: 'default' },
      ];
      const result = autoLayoutNodes(nodes, edges, 'TB');
      
      expect(result).toHaveLength(3);
      // Root should be above children
      const root = result.find(n => n.id === 'root')!;
      const child1 = result.find(n => n.id === 'child1')!;
      const child2 = result.find(n => n.id === 'child2')!;
      expect(root.position.y).toBeLessThan(child1.position.y);
      expect(root.position.y).toBeLessThan(child2.position.y);
    });

    it('should handle disconnected nodes', () => {
      const nodes = [
        createMockFlowNode('node1'),
        createMockFlowNode('node2'),
        createMockFlowNode('isolated'),
      ];
      const edges: FlowChatEdge[] = [
        { id: 'edge1', source: 'node1', target: 'node2', type: 'default' },
      ];
      const result = autoLayoutNodes(nodes, edges, 'TB');
      
      expect(result).toHaveLength(3);
      // All nodes should have positions
      result.forEach(node => {
        expect(node.position).toBeDefined();
        expect(typeof node.position.x).toBe('number');
        expect(typeof node.position.y).toBe('number');
      });
    });

    it('should apply custom layout options', () => {
      const nodes = [createMockFlowNode('node1'), createMockFlowNode('node2')];
      const edges: FlowChatEdge[] = [
        { id: 'edge1', source: 'node1', target: 'node2', type: 'default' },
      ];
      const result = autoLayoutNodes(nodes, edges, 'TB', {
        nodeWidth: 500,
        nodeHeight: 300,
        verticalSpacing: 100,
      });
      
      const yDiff = result[1].position.y - result[0].position.y;
      expect(yDiff).toBeGreaterThanOrEqual(300 + 100); // nodeHeight + verticalSpacing
    });
  });

  describe('getNodePositions', () => {
    it('should return empty array for empty nodes', () => {
      const result = getNodePositions([]);
      expect(result).toHaveLength(0);
    });

    it('should extract positions from nodes', () => {
      const nodes: FlowChatNode[] = [
        createMockFlowNode('node1', 'user', { x: 100, y: 200 }),
        createMockFlowNode('node2', 'assistant', { x: 300, y: 400 }),
      ];
      
      const result = getNodePositions(nodes);
      
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        messageId: 'node1',
        x: 100,
        y: 200,
        width: undefined,
        height: undefined,
      });
      expect(result[1]).toEqual({
        messageId: 'node2',
        x: 300,
        y: 400,
        width: undefined,
        height: undefined,
      });
    });

    it('should include measured dimensions when available', () => {
      const node = createMockFlowNode('node1', 'user', { x: 100, y: 200 });
      node.measured = { width: 400, height: 150 };
      const nodes: FlowChatNode[] = [node];
      
      const result = getNodePositions(nodes);
      
      expect(result[0]).toEqual({
        messageId: 'node1',
        x: 100,
        y: 200,
        width: 400,
        height: 150,
      });
    });
  });

  describe('calculateFitViewport', () => {
    it('should return default viewport for empty nodes', () => {
      const result = calculateFitViewport([]);
      expect(result).toEqual({ x: 0, y: 0, zoom: 1 });
    });

    it('should calculate viewport for single node', () => {
      const nodes: FlowChatNode[] = [createMockFlowNode('node1')];
      
      const result = calculateFitViewport(nodes);
      
      expect(result.zoom).toBeGreaterThan(0);
      expect(result.zoom).toBeLessThanOrEqual(1);
      expect(typeof result.x).toBe('number');
      expect(typeof result.y).toBe('number');
    });

    it('should fit all nodes within viewport', () => {
      const node1 = createMockFlowNode('node1', 'user', { x: 0, y: 0 });
      node1.measured = { width: 400, height: 150 };
      const node2 = createMockFlowNode('node2', 'assistant', { x: 0, y: 200 });
      node2.measured = { width: 400, height: 150 };
      const nodes: FlowChatNode[] = [node1, node2];
      
      const result = calculateFitViewport(nodes);
      
      expect(result.zoom).toBeGreaterThan(0);
      expect(result.zoom).toBeLessThanOrEqual(1);
    });

    it('should respect custom padding', () => {
      const nodes: FlowChatNode[] = [createMockFlowNode('node1')];
      
      const resultSmallPadding = calculateFitViewport(nodes, 10);
      const resultLargePadding = calculateFitViewport(nodes, 200);
      
      // Larger padding should result in smaller zoom
      expect(resultLargePadding.zoom).toBeLessThanOrEqual(resultSmallPadding.zoom);
    });

    it('should handle widely spread nodes', () => {
      const nodes: FlowChatNode[] = [
        createMockFlowNode('node1', 'user', { x: -1000, y: -1000 }),
        createMockFlowNode('node2', 'assistant', { x: 1000, y: 1000 }),
      ];
      
      const result = calculateFitViewport(nodes);
      
      // Should zoom out to fit all nodes
      expect(result.zoom).toBeLessThan(1);
    });

    it('should use default dimensions for nodes without measured size', () => {
      const nodes: FlowChatNode[] = [createMockFlowNode('node1')];
      
      const result = calculateFitViewport(nodes);
      
      // Should still calculate valid viewport using defaults
      expect(result.zoom).toBeGreaterThan(0);
      expect(typeof result.x).toBe('number');
      expect(typeof result.y).toBe('number');
    });
  });
});
