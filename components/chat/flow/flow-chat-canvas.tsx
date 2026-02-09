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
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from '@/components/ui/empty';
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
  onParallelGenerate,
  onDeleteNode,
  onAddReference,
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

  // Rating & Notes state
  const [ratingNodeId, setRatingNodeId] = useState<string | null>(null);
  const [notesNodeId, setNotesNodeId] = useState<string | null>(null);
  const [notesContent, setNotesContent] = useState('');
  const [_editingNodeId, _setEditingNodeId] = useState<string | null>(null);
  const [_editingContent, _setEditingContent] = useState('');

  // Handle parallel generation from node action
  const handleParallelGenerate = useCallback(
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
        case 'follow-up': {
          const msg = messages.find((m) => m.id === messageId);
          onFollowUp?.(messageId, msg?.content || '');
          break;
        }
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
            onEdgesChange([{ type: 'add', item: referenceEdge as FlowChatEdgeType }]);
          }
          // Also notify parent for input area integration
          const refMsg = messages.find((m) => m.id === messageId);
          if (refMsg) {
            onAddReference?.({
              nodeId,
              messageId,
              previewText: (refMsg.content || '').slice(0, 200),
              startIndex: 0,
              endIndex: 0,
            });
          }
          break;
        }
        case 'parallel': {
          handleParallelGenerate(messageId);
          break;
        }
        case 'rate': {
          setRatingNodeId(nodeId);
          break;
        }
        case 'add-note': {
          const existingNotes = canvasState.nodeNotes?.[nodeId] || '';
          setNotesContent(existingNotes);
          setNotesNodeId(nodeId);
          break;
        }
        case 'edit': {
          const editMsg = messages.find((m) => m.id === messageId);
          if (editMsg?.content) {
            _setEditingContent(editMsg.content);
            _setEditingNodeId(nodeId);
          }
          break;
        }
        case 'add-tag': {
          const tagId = data?.tagId as string;
          if (tagId) {
            const currentTags = canvasState.nodeTags[nodeId] || [];
            if (!currentTags.includes(tagId)) {
              onCanvasStateChange?.({
                nodeTags: {
                  ...canvasState.nodeTags,
                  [nodeId]: [...currentTags, tagId],
                },
              });
            }
          }
          break;
        }
        case 'remove-tag': {
          const removeTagId = data?.tagId as string;
          if (removeTagId) {
            const currentNodeTags = canvasState.nodeTags[nodeId] || [];
            onCanvasStateChange?.({
              nodeTags: {
                ...canvasState.nodeTags,
                [nodeId]: currentNodeTags.filter((id) => id !== removeTagId),
              },
            });
          }
          break;
        }
        case 'add-to-group': {
          const groupId = data?.groupId as string;
          if (groupId) {
            const groups = canvasState.nodeGroups.map((g) =>
              g.id === groupId && !g.nodeIds.includes(nodeId)
                ? { ...g, nodeIds: [...g.nodeIds, nodeId] }
                : g
            );
            onCanvasStateChange?.({ nodeGroups: groups });
          }
          break;
        }
        case 'remove-from-group': {
          const rmGroupId = data?.groupId as string;
          if (rmGroupId) {
            const updatedGroups = canvasState.nodeGroups.map((g) =>
              g.id === rmGroupId
                ? { ...g, nodeIds: g.nodeIds.filter((id) => id !== nodeId) }
                : g
            );
            onCanvasStateChange?.({ nodeGroups: updatedGroups });
          }
          break;
        }
      }
    },
    [onNodeAction, onFollowUp, onRegenerate, onCreateBranch, onDeleteNode, onCanvasStateChange, onEdgesChange, onAddReference, handleParallelGenerate, canvasState, messages, nodes, showComparison]
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
      // Ctrl/Cmd + Shift + T: Toggle tool panel (avoid browser new-tab conflict)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'T') {
        e.preventDefault();
        setShowToolPanel((prev) => !prev);
      }
      // Ctrl/Cmd + Shift + L: Auto layout (avoid browser address-bar conflict)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'L') {
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
            <Empty className="border-0 bg-transparent">
              <EmptyHeader>
                <EmptyTitle>{t('emptyCanvas')}</EmptyTitle>
                <EmptyDescription>{t('emptyCanvasHint')}</EmptyDescription>
              </EmptyHeader>
            </Empty>
          </div>
        )}

        {/* Tool Panel Sidebar */}
        {showToolPanel && (
          <div className="absolute right-0 top-0 bottom-0 w-72 bg-background border-l shadow-lg z-10">
            <FlowToolPanel
              onToolExecute={() => {
                // Tool execution handled internally by FlowToolPanel
              }}
              onInsertResult={(content) => {
                // Insert tool result into the chat input via follow-up
                onFollowUp?.('', `Tool result:\n${content}`);
              }}
            />
          </div>
        )}

        {/* Parallel Generation Dialog */}
        <FlowParallelGeneration
          prompt={parallelPrompt}
          open={showParallelGeneration}
          onOpenChange={setShowParallelGeneration}
          onGenerationStart={() => {
            // Generation started — UI shows progress internally
          }}
          onModelResult={(result) => {
            // Notify parent about parallel generation results for message creation
            if (result.content) {
              onParallelGenerate?.({
                sourceMessageId: parallelPrompt,
                models: [{ provider: result.provider || '', model: result.model }],
                customPrompts: { [result.model]: result.content },
              });
            }
          }}
          onGenerationComplete={(results) => {
            // Add all results to comparison view for side-by-side evaluation
            for (const result of results) {
              if (result.content) {
                setComparisonNodes((prev) => [
                  ...prev,
                  {
                    messageId: `parallel-${result.model}-${Date.now()}`,
                    message: {
                      id: `parallel-${result.model}-${Date.now()}`,
                      role: 'assistant' as const,
                      content: result.content || '',
                      createdAt: new Date(),
                    } as typeof messages[0],
                    model: result.model,
                    provider: result.provider,
                  },
                ]);
              }
            }
            if (results.length > 1) {
              setShowComparison(true);
            }
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
            // Save preferred response to canvas state
            onCanvasStateChange?.({ comparisonNodeIds: [messageId] });
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
        {/* Rating Popover */}
        {ratingNodeId && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-background border rounded-lg shadow-xl p-4 space-y-3">
            <p className="text-sm font-medium">{t('rateResponse')}</p>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => {
                    onCanvasStateChange?.({
                      nodeRatings: {
                        ...canvasState.nodeRatings,
                        [ratingNodeId]: star,
                      },
                    });
                    setRatingNodeId(null);
                  }}
                  className={cn(
                    'text-2xl cursor-pointer hover:scale-125 transition-transform',
                    star <= (canvasState.nodeRatings[ratingNodeId] || 0)
                      ? 'text-yellow-400'
                      : 'text-muted-foreground/30'
                  )}
                >
                  ★
                </button>
              ))}
            </div>
            <button
              onClick={() => setRatingNodeId(null)}
              className="text-xs text-muted-foreground hover:underline"
            >
              {t('cancel')}
            </button>
          </div>
        )}

        {/* Notes Dialog */}
        {notesNodeId && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-background border rounded-lg shadow-xl p-4 space-y-3 w-80">
            <p className="text-sm font-medium">{t('addNote')}</p>
            <textarea
              value={notesContent}
              onChange={(e) => setNotesContent(e.target.value)}
              className="w-full h-24 text-sm border rounded-md p-2 bg-muted/30 resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder={t('addNote')}
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setNotesNodeId(null); setNotesContent(''); }}
                className="text-xs px-3 py-1.5 text-muted-foreground hover:bg-muted rounded"
              >
                {t('cancel')}
              </button>
              <button
                onClick={() => {
                  onCanvasStateChange?.({
                    nodeNotes: {
                      ...canvasState.nodeNotes,
                      [notesNodeId]: notesContent,
                    },
                  });
                  setNotesNodeId(null);
                  setNotesContent('');
                }}
                className="text-xs px-3 py-1.5 bg-primary text-primary-foreground rounded hover:bg-primary/90"
              >
                {t('done')}
              </button>
            </div>
          </div>
        )}
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
