'use client';

/**
 * FlowChatCanvas - Main canvas component for flow-based chat view
 * Similar to Flowith's infinite canvas for conversation visualization
 */

import { useCallback, useMemo, useRef, useEffect, useState } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  MiniMap,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  useReactFlow,
  getNodesBounds,
  getViewportForBounds,
  type NodeChange,
  type EdgeChange,
  type Connection,
  type Node,
} from '@xyflow/react';
import { toPng, toSvg } from 'html-to-image';
import '@xyflow/react/dist/style.css';
import { useTranslations } from 'next-intl';
import { TooltipProvider } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { FlowChatNode } from './flow-chat-node';
import { FlowChatEdge } from './flow-chat-edge';
import { FlowChatControls } from './flow-chat-controls';
import { FlowToolPanel } from './flow-tool-panel';
import { FlowParallelGeneration } from './flow-parallel-generation';
import { FlowSearchPanel } from './flow-search-panel';
import { FlowComparisonView } from './flow-comparison-view';
import { FlowKeyboardShortcuts } from './flow-keyboard-shortcuts';
import { FlowNodeGroup } from './flow-node-group';
import { createReferenceEdge } from './flow-node-reference';
import { messagesToFlowNodes, autoLayoutNodes, getNodePositions } from '@/lib/chat/flow-layout';
import type {
  FlowChatCanvasProps,
  FlowChatNode as FlowChatNodeType,
  FlowChatEdge as FlowChatEdgeType,
  NodeActionParams,
  FlowLayoutDirection,
  ChatViewMode,
  FlowChatCanvasState,
} from '@/types/chat/flow-chat';
import { DEFAULT_FLOW_CANVAS_STATE } from '@/types/chat/flow-chat';

// Node types for ReactFlow - use type assertion for compatibility
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const nodeTypes: any = {
  user: FlowChatNode,
  assistant: FlowChatNode,
  system: FlowChatNode,
  group: FlowNodeGroup,
};

// MiniMap node color based on role
const getMinimapNodeColor = (node: Node): string => {
  const role = node.data?.role;
  switch (role) {
    case 'user':
      return '#3b82f6'; // blue-500
    case 'assistant':
      return '#22c55e'; // green-500
    case 'system':
      return '#f59e0b'; // amber-500
    default:
      return '#6b7280'; // gray-500
  }
};

// Edge types for ReactFlow
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const edgeTypes: any = {
  default: FlowChatEdge,
  conversation: FlowChatEdge,
  branch: FlowChatEdge,
  reference: FlowChatEdge,
  parallel: FlowChatEdge,
};

interface FlowChatCanvasInnerProps extends FlowChatCanvasProps {
  initialNodes: FlowChatNodeType[];
  initialEdges: FlowChatEdgeType[];
}

function FlowChatCanvasInner({
  sessionId,
  messages,
  branches,
  activeBranchId: _activeBranchId,
  canvasState,
  isLoading: _isLoading,
  isStreaming,
  streamingMessageId,
  onNodeAction,
  onCanvasStateChange,
  onNodeSelect,
  onFollowUp,
  onRegenerate,
  onCreateBranch,
  onParallelGenerate: _onParallelGenerate,
  onDeleteNode,
  onAddReference: _onAddReference,
  className,
  initialNodes,
  initialEdges,
}: FlowChatCanvasInnerProps) {
  const t = useTranslations('flowChat');
  const { fitView, getNodes } = useReactFlow();
  const containerRef = useRef<HTMLDivElement>(null);

  // Tool panel state
  const [showToolPanel, setShowToolPanel] = useState(false);
  
  // Parallel generation state
  const [showParallelGeneration, setShowParallelGeneration] = useState(false);
  const [parallelPrompt, setParallelPrompt] = useState('');

  // Search panel state
  const [showSearchPanel, setShowSearchPanel] = useState(false);

  // Comparison view state
  const [showComparison, setShowComparison] = useState(false);
  const [comparisonNodes, setComparisonNodes] = useState<Array<{
    messageId: string;
    message: typeof messages[0];
    model?: string;
    provider?: string;
    rating?: number;
  }>>([]);

  // Keyboard shortcuts help dialog
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);

  // Handle parallel generation from node action
  const _handleParallelGenerate = useCallback(
    (messageId: string) => {
      const message = messages.find((m) => m.id === messageId);
      if (message?.content) {
        setParallelPrompt(message.content);
        setShowParallelGeneration(true);
      }
    },
    [messages]
  );

  // Ref for handleAutoLayout to use in keyboard shortcuts
  const handleAutoLayoutRef = useRef<() => void>(() => {});

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes as any);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges as any);

  // Update nodes when messages change
  useEffect(() => {
    const { nodes: newNodes, edges: newEdges } = messagesToFlowNodes(
      messages,
      branches,
      canvasState
    );

    // Update streaming state
    const updatedNodes = newNodes.map((node) => ({
      ...node,
      data: {
        ...node.data,
        isStreaming: node.id === streamingMessageId && isStreaming,
      },
    }));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setNodes(updatedNodes as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setEdges(newEdges as any);
  }, [messages, branches, canvasState, isStreaming, streamingMessageId, setNodes, setEdges]);

  // Handle node action
  const handleNodeAction = useCallback(
    (action: string, data?: Record<string, unknown>) => {
      const nodeId = data?.nodeId as string;
      const messageId = data?.messageId as string;

      if (!nodeId || !messageId) return;

      const params: NodeActionParams = {
        action: action as NodeActionParams['action'],
        nodeId,
        messageId,
      };

      onNodeAction?.(params);

      // Handle specific actions
      switch (action) {
        case 'follow-up':
          onFollowUp?.(messageId, '');
          break;
        case 'regenerate':
          onRegenerate?.(messageId);
          break;
        case 'branch':
          onCreateBranch?.(messageId);
          break;
        case 'delete':
          onDeleteNode?.(messageId, true);
          break;
        case 'collapse': {
          // Toggle collapse state
          const currentCollapsed = canvasState.collapsedNodeIds.includes(nodeId);
          const newCollapsedIds = currentCollapsed
            ? canvasState.collapsedNodeIds.filter((id) => id !== nodeId)
            : [...canvasState.collapsedNodeIds, nodeId];
          onCanvasStateChange?.({ collapsedNodeIds: newCollapsedIds });
          break;
        }
        case 'bookmark': {
          // Toggle bookmark state
          const currentBookmarked = canvasState.bookmarkedNodeIds?.includes(nodeId) ?? false;
          const newBookmarkedIds = currentBookmarked
            ? (canvasState.bookmarkedNodeIds || []).filter((id) => id !== nodeId)
            : [...(canvasState.bookmarkedNodeIds || []), nodeId];
          onCanvasStateChange?.({ bookmarkedNodeIds: newBookmarkedIds });
          break;
        }
        case 'add-to-compare': {
          // Add node to comparison
          const message = messages.find((m) => m.id === messageId);
          if (message) {
            const nodeData = nodes.find((n) => n.id === nodeId)?.data;
            setComparisonNodes((prev) => [
              ...prev.filter((n) => n.messageId !== messageId),
              {
                messageId,
                message,
                model: nodeData?.model as string | undefined,
                provider: nodeData?.provider as string | undefined,
              },
            ]);
            if (!showComparison) setShowComparison(true);
          }
          break;
        }
        case 'reference': {
          // Create a reference edge from selected node to this node
          const selectedNodes = canvasState.selectedNodeIds.filter((id) => id !== nodeId);
          if (selectedNodes.length > 0) {
            const sourceNodeId = selectedNodes[0];
            const referenceEdge = createReferenceEdge(sourceNodeId, nodeId);
            // Add the reference edge to edges
            onEdgesChange([{ type: 'add', item: referenceEdge as FlowChatEdgeType }]);
          }
          break;
        }
      }
    },
    [onNodeAction, onFollowUp, onRegenerate, onCreateBranch, onDeleteNode, onCanvasStateChange, onEdgesChange, canvasState.collapsedNodeIds, canvasState.bookmarkedNodeIds, canvasState.selectedNodeIds, messages, nodes, showComparison]
  );

  // Handle node changes (position, selection)
  const handleNodesChange = useCallback(
    (changes: NodeChange<Node>[]) => {
      onNodesChange(changes);

      // Update positions in canvas state
      const positionChanges = changes.filter(
        (c) => c.type === 'position' && 'position' in c && c.position
      );
      if (positionChanges.length > 0) {
        const currentNodes = getNodes();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const positions = getNodePositions(currentNodes as any);
        const positionMap: Record<string, { messageId: string; x: number; y: number }> = {};
        for (const pos of positions) {
          positionMap[pos.messageId] = pos;
        }
        onCanvasStateChange?.({ nodePositions: positionMap });
      }

      // Update selection
      const selectionChanges = changes.filter((c) => c.type === 'select');
      if (selectionChanges.length > 0) {
        const selectedIds = getNodes()
          .filter((n) => n.selected)
          .map((n) => n.id);
        onNodeSelect?.(selectedIds);
        onCanvasStateChange?.({ selectedNodeIds: selectedIds });
      }
    },
    [onNodesChange, getNodes, onCanvasStateChange, onNodeSelect]
  );

  // Handle edge changes
  const handleEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      onEdgesChange(changes);
    },
    [onEdgesChange]
  );

  // Handle new connections (not typically used in chat flow)
  const handleConnect = useCallback((_connection: Connection) => {
    // Chat flow doesn't allow manual connections
  }, []);

  // Handle view mode change
  const handleViewModeChange = useCallback(
    (mode: ChatViewMode) => {
      onCanvasStateChange?.({ viewMode: mode });
    },
    [onCanvasStateChange]
  );

  // Handle layout direction change
  const handleLayoutChange = useCallback(
    (direction: FlowLayoutDirection) => {
      onCanvasStateChange?.({ layoutDirection: direction });
      // Re-layout nodes
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const layoutedNodes = autoLayoutNodes(nodes as any, edges as any, direction);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setNodes(layoutedNodes as any);
      setTimeout(() => fitView({ padding: 0.2, duration: 300 }), 100);
    },
    [nodes, edges, setNodes, fitView, onCanvasStateChange]
  );

  // Handle auto layout
  const handleAutoLayout = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const layoutedNodes = autoLayoutNodes(nodes as any, edges as any, canvasState.layoutDirection);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setNodes(layoutedNodes as any);
    setTimeout(() => fitView({ padding: 0.2, duration: 300 }), 100);
  }, [nodes, edges, canvasState.layoutDirection, setNodes, fitView]);

  // Update ref for keyboard shortcuts
  useEffect(() => {
    handleAutoLayoutRef.current = handleAutoLayout;
  }, [handleAutoLayout]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + T: Toggle tool panel
      if ((e.ctrlKey || e.metaKey) && e.key === 't') {
        e.preventDefault();
        setShowToolPanel((prev) => !prev);
      }
      // Ctrl/Cmd + L: Auto layout
      if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
        e.preventDefault();
        handleAutoLayoutRef.current();
      }
      // Ctrl/Cmd + 0: Fit view
      if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        e.preventDefault();
        fitView({ padding: 0.2, duration: 300 });
      }
      // Ctrl/Cmd + F: Toggle search panel
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        setShowSearchPanel((prev) => !prev);
      }
      // Escape: Close panels
      if (e.key === 'Escape') {
        setShowToolPanel(false);
        setShowParallelGeneration(false);
        setShowSearchPanel(false);
        setShowComparison(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fitView]);

  // Handle canvas state changes
  const handleCanvasStateChange = useCallback(
    (updates: Partial<FlowChatCanvasState>) => {
      onCanvasStateChange?.(updates);
    },
    [onCanvasStateChange]
  );

  // Handle export
  const handleExport = useCallback(
    async (format: 'png' | 'svg' | 'json') => {
      if (format === 'json') {
        const data = {
          messages,
          branches,
          canvasState,
          nodes,
          edges,
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], {
          type: 'application/json',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `chat-flow-${sessionId}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        // Export as PNG or SVG using ReactFlow's built-in export
        try {
          const nodesBounds = getNodesBounds(nodes);
          const imageWidth = nodesBounds.width + 100;
          const imageHeight = nodesBounds.height + 100;
          const viewport = getViewportForBounds(
            nodesBounds,
            imageWidth,
            imageHeight,
            0.5,
            2,
            0.1
          );

          const exportOptions = {
            width: imageWidth,
            height: imageHeight,
            viewport,
            style: {
              backgroundColor: 'hsl(var(--background))',
            },
          };

          let dataUrl: string;
          let filename: string;

          if (format === 'png') {
            dataUrl = await toPng(containerRef.current!, exportOptions);
            filename = `chat-flow-${sessionId}.png`;
          } else {
            dataUrl = await toSvg(containerRef.current!, exportOptions);
            filename = `chat-flow-${sessionId}.svg`;
          }

          // Download the file
          const a = document.createElement('a');
          a.href = dataUrl;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        } catch (error) {
          console.error(`Failed to export as ${format}:`, error);
        }
      }
    },
    [messages, branches, canvasState, nodes, edges, sessionId]
  );

  // Pass action handler to nodes
  const nodesWithHandlers = useMemo(() => {
    return nodes.map((node) => ({
      ...node,
      data: {
        ...node.data,
        onAction: handleNodeAction,
      },
    }));
  }, [nodes, handleNodeAction]);

  return (
    <TooltipProvider>
      <div
        ref={containerRef}
        className={cn('relative h-full w-full', className)}
      >
        <ReactFlow
          nodes={nodesWithHandlers}
          edges={edges}
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
          onConnect={handleConnect}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          defaultViewport={canvasState.viewport}
          snapToGrid={canvasState.snapToGrid}
          snapGrid={[canvasState.gridSize, canvasState.gridSize]}
          deleteKeyCode={null} // Disable delete key for nodes
          multiSelectionKeyCode={['Shift', 'Meta', 'Control']}
          panOnDrag
          panOnScroll
          zoomOnDoubleClick={false}
          minZoom={0.1}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
        >
          {/* Background */}
          {canvasState.showGrid && (
            <Background
              variant={BackgroundVariant.Dots}
              gap={canvasState.gridSize}
              size={1}
              color="hsl(var(--muted-foreground) / 0.2)"
            />
          )}

          {/* Minimap with role-based node colors */}
          {canvasState.showMinimap && (
            <MiniMap
              nodeStrokeWidth={3}
              zoomable
              pannable
              nodeColor={getMinimapNodeColor}
              className="!bg-background/80 !border-border"
            />
          )}

          {/* Controls */}
          <FlowChatControls
            viewMode={canvasState.viewMode}
            canvasState={canvasState}
            onViewModeChange={handleViewModeChange}
            onLayoutChange={handleLayoutChange}
            onAutoLayout={handleAutoLayout}
            onCanvasStateChange={handleCanvasStateChange}
            onExport={handleExport}
          />
        </ReactFlow>

        {/* Empty state */}
        {messages.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50 pointer-events-none">
            <div className="text-center text-muted-foreground">
              <p className="text-lg font-medium">{t('emptyCanvas')}</p>
              <p className="text-sm">{t('emptyCanvasHint')}</p>
            </div>
          </div>
        )}

        {/* Tool Panel Sidebar */}
        {showToolPanel && (
          <div className="absolute right-0 top-0 bottom-0 w-72 bg-background border-l shadow-lg z-10">
            <FlowToolPanel
              onToolExecute={(result) => {
                console.log('Tool executed:', result);
              }}
              onInsertResult={(content) => {
                // Could insert result as a new message or reference
                console.log('Insert result:', content);
              }}
            />
          </div>
        )}

        {/* Parallel Generation Dialog */}
        <FlowParallelGeneration
          prompt={parallelPrompt}
          open={showParallelGeneration}
          onOpenChange={setShowParallelGeneration}
          onGenerationStart={(models) => {
            console.log('Starting parallel generation with models:', models);
          }}
          onGenerationComplete={(results) => {
            // Handle parallel generation results
            console.log('Parallel generation completed:', results);
          }}
        />

        {/* Search Panel */}
        {showSearchPanel && (
          <div className="absolute left-0 top-0 bottom-0 w-80 bg-background border-r shadow-lg z-10">
            <FlowSearchPanel
              searchState={canvasState.searchState}
              availableTags={canvasState.tagDefinitions || []}
              messages={messages}
              onSearchStateChange={(state) => {
                onCanvasStateChange?.({ searchState: state });
              }}
              onResultClick={(messageId) => {
                // Find and select the node
                const node = nodes.find((n) => n.id === messageId);
                if (node) {
                  fitView({
                    nodes: [{ id: messageId }],
                    padding: 0.5,
                    duration: 300,
                  });
                }
              }}
              onClearSearch={() => {
                onCanvasStateChange?.({ searchState: undefined });
              }}
            />
          </div>
        )}

        {/* Comparison View */}
        <FlowComparisonView
          nodes={comparisonNodes}
          open={showComparison}
          onOpenChange={setShowComparison}
          onRemoveNode={(messageId) => {
            setComparisonNodes((prev) =>
              prev.filter((n) => n.messageId !== messageId)
            );
          }}
          onRateNode={(messageId, rating) => {
            setComparisonNodes((prev) =>
              prev.map((n) =>
                n.messageId === messageId ? { ...n, rating } : n
              )
            );
          }}
          onSelectPreferred={(messageId) => {
            console.log('Preferred response:', messageId);
          }}
        />

        {/* Keyboard Shortcuts */}
        <FlowKeyboardShortcuts
          enabled={true}
          selectedNodeIds={canvasState.selectedNodeIds || []}
          onNodeAction={(action, nodeId) => {
            const message = messages.find((m) => m.id === nodeId);
            if (message) {
              handleNodeAction(action, { nodeId, messageId: message.id });
            }
          }}
          onCanvasAction={(action) => {
            if (action === 'clearSelection') {
              onCanvasStateChange?.({ selectedNodeIds: [] });
            }
          }}
          onOpenSearch={() => setShowSearchPanel(true)}
          onAutoLayout={handleAutoLayout}
          onFitView={() => fitView({ padding: 0.2, duration: 300 })}
          showHelp={showShortcutsHelp}
          onShowHelpChange={setShowShortcutsHelp}
        />
      </div>
    </TooltipProvider>
  );
}

/**
 * FlowChatCanvas - Wrapper component with ReactFlowProvider
 */
export function FlowChatCanvas(props: FlowChatCanvasProps) {
  const { messages, branches, canvasState } = props;

  // Calculate initial nodes and edges
  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => messagesToFlowNodes(messages, branches, canvasState || DEFAULT_FLOW_CANVAS_STATE),
    [messages, branches, canvasState]
  );

  return (
    <ReactFlowProvider>
      <FlowChatCanvasInner
        {...props}
        canvasState={canvasState || DEFAULT_FLOW_CANVAS_STATE}
        initialNodes={initialNodes}
        initialEdges={initialEdges}
      />
    </ReactFlowProvider>
  );
}

export default FlowChatCanvas;
