'use client';

/**
 * WorkflowEditorPanel - Main React Flow-based workflow editor
 * Enhanced with responsive design for mobile and desktop
 */

import { useCallback, useRef, useEffect, useState, useMemo } from 'react';
import {
  ReactFlow,
  MiniMap,
  Background,
  BackgroundVariant,
  useReactFlow,
  ReactFlowProvider,
  type Connection,
  type NodeChange,
  type EdgeChange,
  type Node,
  type Edge,
} from '@xyflow/react';
import { useShallow } from 'zustand/react/shallow';
import { Controls } from '@/components/ai-elements/controls';
import { Panel } from '@/components/ai-elements/panel';
import { Loader } from '@/components/ai-elements/loader';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';
import { Plus, Settings, Play, LayoutGrid } from 'lucide-react';
import '@xyflow/react/dist/style.css';

import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useWorkflowEditorStore } from '@/stores/workflow';
import { useWorkflowKeyboardShortcuts, useMediaQuery } from '@/hooks';
import { nodeTypes } from '../nodes';
import { NodePalette } from './node-palette';
import { WorkflowToolbar } from './workflow-toolbar';
import { NodeConfigPanel } from '../panels/node-config-panel';
import { ExecutionPanel } from '../execution/execution-panel';
import { CustomEdge } from '../edges/custom-edge';
import { CustomConnectionLine } from '../edges/custom-connection-line';
import { NodeSearchCommand } from '../search/node-search-command';
import { CanvasContextMenu } from './canvas-context-menu';
import { HelperLines, getHelperLines } from './helper-lines';
import type { WorkflowNodeType, WorkflowNode, WorkflowEdge } from '@/types/workflow/workflow-editor';

// Define edge types for React Flow
const edgeTypes = {
  default: CustomEdge,
  custom: CustomEdge,
};

interface WorkflowEditorPanelProps {
  className?: string;
}

function WorkflowEditorContent({ className }: WorkflowEditorPanelProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { fitView, zoomIn, zoomOut, screenToFlowPosition, setViewport: setReactFlowViewport } = useReactFlow();
  const isDragHistoryPendingRef = useRef(false);
  
  // Mobile responsive state
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [mobilePanel, setMobilePanel] = useState<'palette' | 'config' | 'execution' | null>(null);

  // Canvas context menu state
  const [contextMenu, setContextMenu] = useState<{ open: boolean; x: number; y: number }>({ open: false, x: 0, y: 0 });

  // Helper lines state for alignment guides during drag
  const [helperLines, setHelperLines] = useState<{ horizontal: number | null; vertical: number | null }>({ horizontal: null, vertical: null });

  // Drag-over visual feedback state
  const [isDragOver, setIsDragOver] = useState(false);

  const {
    currentWorkflow,
    isDirty,
    showNodePalette,
    showConfigPanel,
    showExecutionPanel,
    showMinimap,
    selectedNodes,
    executionState,
    isExecuting,
    onNodesChange,
    onEdgesChange,
    onConnect,
    reconnectEdge,
    deleteNodes,
    deleteEdges,
    addNode,
    selectNodes,
    createWorkflow,
    setViewport,
    pushHistory,
    saveWorkflow,
  } = useWorkflowEditorStore(
    useShallow((state) => ({
      currentWorkflow: state.currentWorkflow,
      isDirty: state.isDirty,
      showNodePalette: state.showNodePalette,
      showConfigPanel: state.showConfigPanel,
      showExecutionPanel: state.showExecutionPanel,
      showMinimap: state.showMinimap,
      selectedNodes: state.selectedNodes,
      executionState: state.executionState,
      isExecuting: state.isExecuting,
      onNodesChange: state.onNodesChange,
      onEdgesChange: state.onEdgesChange,
      onConnect: state.onConnect,
      reconnectEdge: state.reconnectEdge,
      deleteNodes: state.deleteNodes,
      deleteEdges: state.deleteEdges,
      addNode: state.addNode,
      selectNodes: state.selectNodes,
      createWorkflow: state.createWorkflow,
      setViewport: state.setViewport,
      pushHistory: state.pushHistory,
      saveWorkflow: state.saveWorkflow,
    }))
  );

  // Initialize workflow if none exists
  useEffect(() => {
    if (!currentWorkflow) {
      createWorkflow('New Workflow');
    }
  }, [currentWorkflow, createWorkflow]);

  // Restore viewport when switching workflows
  useEffect(() => {
    if (!currentWorkflow) return;
    setReactFlowViewport(currentWorkflow.viewport);
  }, [currentWorkflow?.id, currentWorkflow, setReactFlowViewport]);

  // Auto-save
  useEffect(() => {
    if (!currentWorkflow?.settings.autoSave) return;
    if (!isDirty) return;

    const timer = setTimeout(() => {
      void saveWorkflow();
    }, 1000);

    return () => clearTimeout(timer);
  }, [currentWorkflow?.id, currentWorkflow?.settings.autoSave, isDirty, saveWorkflow]);

  // Keyboard shortcuts - pass view callbacks for zoom/fit
  useWorkflowKeyboardShortcuts({
    enabled: true,
    onSave: () => {
      void useWorkflowEditorStore.getState().saveWorkflow();
    },
    onFitView: () => fitView({ padding: 0.2 }),
    onZoomIn: () => zoomIn(),
    onZoomOut: () => zoomOut(),
  });

  // Handle node changes
  const handleNodesChange = useCallback(
    (changes: NodeChange<Node>[]) => {
      onNodesChange(changes as NodeChange<WorkflowNode>[]);
    },
    [onNodesChange]
  );

  // Handle edge changes
  const handleEdgesChange = useCallback(
    (changes: EdgeChange<WorkflowEdge>[]) => {
      onEdgesChange(changes);
    },
    [onEdgesChange]
  );

  // Handle connections
  const handleConnect = useCallback(
    (connection: Connection) => {
      onConnect(connection);
    },
    [onConnect]
  );

  // Handle edge reconnection (React Flow v12)
  const handleReconnect = useCallback(
    (oldEdge: Edge, newConnection: Connection) => {
      reconnectEdge(oldEdge as import('@/types/workflow/workflow-editor').WorkflowEdge, newConnection);
    },
    [reconnectEdge]
  );

  // Validate connections - prevent self-connections and duplicate edges
  const isValidConnection = useCallback(
    (connection: Edge | Connection) => {
      if (!currentWorkflow) return false;
      // Prevent self-connections
      if (connection.source === connection.target) return false;
      // Prevent duplicate edges
      const exists = currentWorkflow.edges.some(
        (e) =>
          e.source === connection.source &&
          e.target === connection.target &&
          e.sourceHandle === connection.sourceHandle &&
          e.targetHandle === connection.targetHandle
      );
      if (exists) return false;
      // Prevent connecting end node as source
      const sourceNode = currentWorkflow.nodes.find((n) => n.id === connection.source);
      if (sourceNode?.type === 'end') return false;
      // Prevent connecting start node as target
      const targetNode = currentWorkflow.nodes.find((n) => n.id === connection.target);
      if (targetNode?.type === 'start') return false;
      return true;
    },
    [currentWorkflow]
  );

  // Handle combined delete for nodes and edges (React Flow v12)
  const handleDelete = useCallback(
    ({ nodes: deletedNodes, edges: deletedEdges }: { nodes: Node[]; edges: Edge[] }) => {
      const nodeIds = deletedNodes.map((n) => n.id);
      const edgeIds = deletedEdges.map((e) => e.id);
      if (nodeIds.length > 0) deleteNodes(nodeIds);
      if (edgeIds.length > 0) deleteEdges(edgeIds);
    },
    [deleteNodes, deleteEdges]
  );

  // Handle pane context menu (right-click on blank canvas)
  const handlePaneContextMenu = useCallback(
    (event: MouseEvent | React.MouseEvent) => {
      event.preventDefault();
      setContextMenu({ open: true, x: event.clientX, y: event.clientY });
    },
    []
  );

  const handleCloseContextMenu = useCallback(() => {
    setContextMenu((prev) => ({ ...prev, open: false }));
  }, []);

  // Handle node drag for helper lines
  const handleNodeDrag = useCallback(
    (_event: React.MouseEvent, dragNode: Node) => {
      if (!currentWorkflow) return;
      const otherNodes = currentWorkflow.nodes
        .filter((n) => n.id !== dragNode.id)
        .map((n) => ({
          id: n.id,
          x: n.position.x,
          y: n.position.y,
          width: (n.measured?.width ?? n.width ?? 180) as number,
          height: (n.measured?.height ?? n.height ?? 60) as number,
        }));

      const dragging = {
        id: dragNode.id,
        x: dragNode.position.x,
        y: dragNode.position.y,
        width: (dragNode.measured?.width ?? dragNode.width ?? 180) as number,
        height: (dragNode.measured?.height ?? dragNode.height ?? 60) as number,
      };

      const lines = getHelperLines(dragging, otherNodes);
      setHelperLines({ horizontal: lines.horizontal, vertical: lines.vertical });
    },
    [currentWorkflow]
  );

  const handleNodeDragStop = useCallback(() => {
    // Clear helper lines when drag stops
    setHelperLines({ horizontal: null, vertical: null });
    if (!isDragHistoryPendingRef.current) return;
    isDragHistoryPendingRef.current = false;
    pushHistory();
  }, [pushHistory]);

  // Handle selection changes
  const handleSelectionChange = useCallback(
    ({ nodes }: { nodes: Node[] }) => {
      selectNodes(nodes.map((n) => n.id));
    },
    [selectNodes]
  );

  // Handle drag over for dropping nodes
  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    if (!isDragOver) setIsDragOver(true);
  }, [isDragOver]);

  // Handle drag leave
  const handleDragLeave = useCallback((event: React.DragEvent) => {
    // Only clear if leaving the wrapper (not entering a child)
    if (!event.currentTarget.contains(event.relatedTarget as globalThis.Node | null)) {
      setIsDragOver(false);
    }
  }, []);

  // Handle drop for adding nodes
  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/workflow-node') as WorkflowNodeType;
      if (!type) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      addNode(type, position);
      setIsDragOver(false);
    },
    [screenToFlowPosition, addNode]
  );

  // Compute nodes with execution state className applied
  const nodeStates = executionState?.nodeStates;
  const nodesWithExecState = useMemo(() => {
    if (!currentWorkflow) return [];
    if (!nodeStates) return currentWorkflow.nodes as Node[];

    return currentWorkflow.nodes.map((node) => {
      const nodeState = nodeStates[node.id];
      if (!nodeState) return node as Node;

      let execClassName = '';
      switch (nodeState.status) {
        case 'running':
          execClassName = 'ring-2 ring-blue-500 ring-offset-2';
          break;
        case 'completed':
          execClassName = 'ring-2 ring-green-500 ring-offset-2';
          break;
        case 'failed':
          execClassName = 'ring-2 ring-red-500 ring-offset-2';
          break;
      }

      if (!execClassName) return node as Node;
      return {
        ...node,
        className: cn(node.className, execClassName),
      } as Node;
    });
  }, [currentWorkflow, nodeStates]);

  // Stable handler refs — these don't change between renders
  const handleNodeDragStartRef = useCallback(() => {
    isDragHistoryPendingRef.current = true;
  }, []);

  const handleMoveEndRef = useCallback(
    (_event: unknown, viewport: { x: number; y: number; zoom: number }) => {
      setViewport(viewport);
    },
    [setViewport]
  );

  // Extract specific settings to avoid re-creating memo on unrelated settings changes
  const snapToGrid = currentWorkflow?.settings.snapToGrid;
  const gridSize = currentWorkflow?.settings.gridSize ?? 20;

  // Shared ReactFlow props — avoids duplicating config between mobile & desktop
  const sharedReactFlowProps = useMemo(() => ({
    nodes: nodesWithExecState,
    edges: currentWorkflow?.edges ?? [],
    onNodesChange: handleNodesChange,
    onEdgesChange: handleEdgesChange,
    onConnect: handleConnect,
    onReconnect: handleReconnect,
    onDelete: handleDelete,
    isValidConnection,
    onPaneContextMenu: handlePaneContextMenu,
    onSelectionChange: handleSelectionChange,
    onNodeDragStart: handleNodeDragStartRef,
    onNodeDrag: handleNodeDrag,
    onNodeDragStop: handleNodeDragStop,
    onMoveEnd: handleMoveEndRef,
    nodeTypes,
    edgeTypes,
    edgesReconnectable: true,
    connectionLineComponent: CustomConnectionLine,
    fitView: true,
    fitViewOptions: { padding: 0.2 },
    defaultViewport: currentWorkflow?.viewport,
    snapToGrid,
    snapGrid: [gridSize, gridSize] as [number, number],
    deleteKeyCode: ['Backspace', 'Delete'],
    multiSelectionKeyCode: ['Shift', 'Meta', 'Control'],
    selectionOnDrag: true,
    panOnScroll: true,
    zoomOnPinch: true,
    panOnDrag: [1, 2] as [number, number],
    selectNodesOnDrag: false,
    className: 'bg-background touch-none',
    proOptions: { hideAttribution: true },
  }), [
    nodesWithExecState,
    currentWorkflow?.edges,
    currentWorkflow?.viewport,
    snapToGrid,
    gridSize,
    handleNodesChange,
    handleEdgesChange,
    handleConnect,
    handleReconnect,
    handleDelete,
    isValidConnection,
    handlePaneContextMenu,
    handleSelectionChange,
    handleNodeDragStartRef,
    handleNodeDrag,
    handleNodeDragStop,
    handleMoveEndRef,
  ]);

  // Derive mobile panel visibility - close when switching to desktop
  const effectiveMobilePanel = isMobile ? mobilePanel : null;
  
  // Handle mobile panel open for config when node selected
  const handleMobilePanelChange = useCallback((panel: 'palette' | 'config' | 'execution' | null) => {
    if (isMobile) {
      setMobilePanel(panel);
    }
  }, [isMobile]);

  if (!currentWorkflow) {
    return (
      <div className="flex items-center justify-center h-full gap-2">
        <Loader size={20} className="text-muted-foreground" />
        <span className="text-muted-foreground">Loading...</span>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Toolbar */}
      <WorkflowToolbar
        onFitView={() => fitView({ padding: 0.2 })}
        onZoomIn={() => zoomIn()}
        onZoomOut={() => zoomOut()}
        isMobile={isMobile}
        onOpenMobilePanel={handleMobilePanelChange}
      />

      {/* Main content */}
      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        {isMobile ? (
          /* Mobile layout - no resizable panels */
          <div
            ref={reactFlowWrapper}
            className={cn('flex-1 h-full relative transition-shadow duration-200', isDragOver && 'ring-2 ring-primary/40 ring-inset')}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <ReactFlow {...sharedReactFlowProps}>
              <HelperLines horizontal={helperLines.horizontal} vertical={helperLines.vertical} />
              {showMinimap && (
                <MiniMap
                  className="bg-background border rounded-lg shadow-sm"
                  nodeStrokeWidth={3}
                  zoomable
                  pannable
                />
              )}
              {currentWorkflow.settings.showGrid && (
                <Background
                  variant={BackgroundVariant.Dots}
                  gap={currentWorkflow.settings.gridSize}
                  size={1}
                  className="bg-muted/30"
                />
              )}
            </ReactFlow>

            {/* Mobile FAB (Floating Action Buttons) */}
            <div className="absolute bottom-4 right-4 flex flex-col gap-2 z-10">
              <Button
                size="icon"
                variant="default"
                className="h-12 w-12 rounded-full shadow-lg"
                onClick={() => handleMobilePanelChange('palette')}
              >
                <Plus className="h-5 w-5" />
              </Button>
              {selectedNodes.length > 0 && (
                <Button
                  size="icon"
                  variant="secondary"
                  className="h-10 w-10 rounded-full shadow-lg"
                  onClick={() => handleMobilePanelChange('config')}
                >
                  <Settings className="h-4 w-4" />
                </Button>
              )}
              {isExecuting && (
                <Button
                  size="icon"
                  variant="secondary"
                  className="h-10 w-10 rounded-full shadow-lg"
                  onClick={() => handleMobilePanelChange('execution')}
                >
                  <Play className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Mobile zoom controls */}
            <div className="absolute bottom-4 left-4 flex flex-col gap-1 z-10">
              <Button
                size="icon"
                variant="outline"
                className="h-8 w-8 bg-background/80 backdrop-blur-sm"
                onClick={() => zoomIn()}
              >
                <span className="text-lg font-bold">+</span>
              </Button>
              <Button
                size="icon"
                variant="outline"
                className="h-8 w-8 bg-background/80 backdrop-blur-sm"
                onClick={() => zoomOut()}
              >
                <span className="text-lg font-bold">−</span>
              </Button>
              <Button
                size="icon"
                variant="outline"
                className="h-8 w-8 bg-background/80 backdrop-blur-sm"
                onClick={() => fitView({ padding: 0.2 })}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          /* Desktop layout - resizable panels */
          <ResizablePanelGroup direction="horizontal" className="h-full">
            {/* Node Palette Panel */}
            <AnimatePresence mode="popLayout">
              {showNodePalette && (
                <>
                  <ResizablePanel
                    id="node-palette"
                    order={1}
                    defaultSize={18}
                    minSize={15}
                    maxSize={30}
                    className="hidden md:block"
                  >
                    <motion.div
                      key="node-palette"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="h-full"
                    >
                      <NodePalette className="h-full" />
                    </motion.div>
                  </ResizablePanel>
                  <ResizableHandle withHandle className="hidden md:flex" />
                </>
              )}
            </AnimatePresence>

            {/* Main Canvas Panel */}
            <ResizablePanel id="canvas" order={2} defaultSize={64} minSize={30}>
              <div
                ref={reactFlowWrapper}
                className={cn('h-full relative transition-shadow duration-200', isDragOver && 'ring-2 ring-primary/40 ring-inset')}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <ReactFlow {...sharedReactFlowProps}>
                  <HelperLines horizontal={helperLines.horizontal} vertical={helperLines.vertical} />
                  <Controls className="hidden md:flex" />
                  <Panel position="top-left">
                    <div className="text-xs text-muted-foreground px-2 py-1 bg-background/80 backdrop-blur-sm rounded">
                      {currentWorkflow.name} · {currentWorkflow.nodes.length} nodes
                    </div>
                  </Panel>
                  {showMinimap && (
                    <MiniMap
                      className="bg-background border rounded-lg shadow-sm"
                      nodeStrokeWidth={3}
                      zoomable
                      pannable
                    />
                  )}
                  {currentWorkflow.settings.showGrid && (
                    <Background
                      variant={BackgroundVariant.Dots}
                      gap={currentWorkflow.settings.gridSize}
                      size={1}
                      className="bg-muted/30"
                    />
                  )}
                </ReactFlow>
              </div>
            </ResizablePanel>

          {/* Config/Execution Panels */}
          <AnimatePresence mode="popLayout">
            {(showConfigPanel || showExecutionPanel || isExecuting) && (
              <>
                <ResizableHandle withHandle className="hidden md:flex" />
                <ResizablePanel
                  id="right-panel"
                  order={3}
                  defaultSize={18}
                  minSize={15}
                  maxSize={35}
                  className="hidden md:block"
                >
                  <motion.div
                    key="right-panel"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="h-full flex flex-col"
                  >
                    {/* Show Config Panel if enabled */}
                    {showConfigPanel && (
                      <div className={cn(
                        "flex flex-col border-b",
                        (showExecutionPanel || isExecuting) ? "h-1/2" : "h-full"
                      )}>
                        {selectedNodes.length > 0 ? (
                          <NodeConfigPanel
                            nodeId={selectedNodes[0]}
                            className="h-full"
                          />
                        ) : (
                          <div className="h-full flex flex-col bg-background">
                            <div className="p-3 border-b shrink-0">
                              <span className="text-sm font-medium">Node Configuration</span>
                            </div>
                            <div className="flex-1 flex items-center justify-center text-muted-foreground">
                              <div className="text-center p-4">
                                <Settings className="h-10 w-10 mx-auto mb-3 opacity-30" />
                                <p className="text-sm">Select a node to configure</p>
                                <p className="text-xs mt-1">Click on any node in the canvas</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Show Execution Panel if executing or panel toggled */}
                    {(showExecutionPanel || isExecuting) && (
                      <div className={cn(
                        "flex flex-col",
                        showConfigPanel ? "h-1/2" : "h-full"
                      )}>
                        <ExecutionPanel className="h-full" />
                      </div>
                    )}
                  </motion.div>
                </ResizablePanel>
              </>
            )}
          </AnimatePresence>
        </ResizablePanelGroup>
        )}
      </div>

      {/* Canvas right-click context menu */}
      <CanvasContextMenu
        open={contextMenu.open}
        position={{ x: contextMenu.x, y: contextMenu.y }}
        onClose={handleCloseContextMenu}
        onAddNode={addNode}
      />

      {/* Mobile Sheets/Drawers */}
      {isMobile && (
        <>
          {/* Node Palette Sheet */}
          <Sheet open={effectiveMobilePanel === 'palette'} onOpenChange={(open) => !open && handleMobilePanelChange(null)}>
            <SheetContent side="bottom" className="h-[70vh] p-0">
              <SheetHeader className="px-4 py-3 border-b">
                <SheetTitle>Add Node</SheetTitle>
              </SheetHeader>
              <NodePalette 
                className="h-full border-0" 
                onDragStart={() => handleMobilePanelChange(null)}
              />
            </SheetContent>
          </Sheet>

          {/* Config Panel Sheet */}
          <Sheet open={effectiveMobilePanel === 'config'} onOpenChange={(open) => !open && handleMobilePanelChange(null)}>
            <SheetContent side="right" className="w-full sm:w-[400px] p-0">
              <SheetHeader className="px-4 py-3 border-b">
                <SheetTitle>Node Configuration</SheetTitle>
              </SheetHeader>
              {selectedNodes.length > 0 && (
                <NodeConfigPanel
                  nodeId={selectedNodes[0]}
                  className="h-full border-0"
                />
              )}
            </SheetContent>
          </Sheet>

          {/* Execution Panel Sheet */}
          <Sheet open={effectiveMobilePanel === 'execution'} onOpenChange={(open) => !open && handleMobilePanelChange(null)}>
            <SheetContent side="right" className="w-full sm:w-[400px] p-0">
              <SheetHeader className="px-4 py-3 border-b">
                <SheetTitle>Execution</SheetTitle>
              </SheetHeader>
              <ExecutionPanel className="h-full border-0" />
            </SheetContent>
          </Sheet>
        </>
      )}
    </div>
  );
}

export function WorkflowEditorPanel(props: WorkflowEditorPanelProps) {
  return (
    <ReactFlowProvider>
      <WorkflowEditorContent {...props} />
      <NodeSearchCommand />
    </ReactFlowProvider>
  );
}

export default WorkflowEditorPanel;
