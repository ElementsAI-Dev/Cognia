'use client';

/**
 * WorkflowEditorPanel - Main React Flow-based workflow editor
 * Enhanced with responsive design for mobile and desktop
 */

import { useCallback, useRef, useEffect, useState } from 'react';
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
} from '@xyflow/react';
import { useShallow } from 'zustand/react/shallow';
import { Controls } from '@/components/ai-elements/controls';
import { Panel } from '@/components/ai-elements/panel';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Plus, Settings, Play, LayoutGrid } from 'lucide-react';
import '@xyflow/react/dist/style.css';

import { cn } from '@/lib/utils';
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
import type { WorkflowNodeType, WorkflowNode } from '@/types/workflow/workflow-editor';

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

  // Keyboard shortcuts
  useWorkflowKeyboardShortcuts({
    enabled: true,
    onSave: () => {
      void useWorkflowEditorStore.getState().saveWorkflow();
    },
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
    (changes: EdgeChange[]) => {
      onEdgesChange(changes as never);
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
    },
    [screenToFlowPosition, addNode]
  );

  // Get node class based on execution state (reserved for future use)
  const _getNodeClassName = useCallback(
    (node: Node) => {
      if (!executionState) return '';
      const nodeState = executionState.nodeStates[node.id];
      if (!nodeState) return '';

      switch (nodeState.status) {
        case 'running':
          return 'ring-2 ring-blue-500 ring-offset-2';
        case 'completed':
          return 'ring-2 ring-green-500 ring-offset-2';
        case 'failed':
          return 'ring-2 ring-red-500 ring-offset-2';
        default:
          return '';
      }
    },
    [executionState]
  );

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
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Loading...</div>
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
        {/* Node palette - Desktop only */}
        {!isMobile && showNodePalette && (
          <NodePalette className="w-64 shrink-0 h-full hidden md:flex" />
        )}

        {/* React Flow canvas */}
        <div
          ref={reactFlowWrapper}
          className="flex-1 h-full relative"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <ReactFlow
            nodes={currentWorkflow.nodes as Node[]}
            edges={currentWorkflow.edges}
            onNodesChange={handleNodesChange}
            onEdgesChange={handleEdgesChange}
            onConnect={handleConnect}
            onSelectionChange={handleSelectionChange}
            onNodeDragStart={() => {
              isDragHistoryPendingRef.current = true;
            }}
            onNodeDragStop={() => {
              if (!isDragHistoryPendingRef.current) return;
              isDragHistoryPendingRef.current = false;
              pushHistory();
            }}
            onMoveEnd={(_event, viewport) => {
              setViewport(viewport);
            }}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            connectionLineComponent={CustomConnectionLine}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            defaultViewport={currentWorkflow.viewport}
            snapToGrid={currentWorkflow.settings.snapToGrid}
            snapGrid={[currentWorkflow.settings.gridSize, currentWorkflow.settings.gridSize]}
            deleteKeyCode={['Backspace', 'Delete']}
            multiSelectionKeyCode={['Shift', 'Meta', 'Control']}
            selectionOnDrag
            panOnScroll
            zoomOnPinch
            panOnDrag={isMobile ? [1, 2] : true}
            selectNodesOnDrag={false}
            className="bg-background touch-none"
            proOptions={{ hideAttribution: true }}
          >
            <Controls className="hidden md:flex" />
            {/* Workflow info panel */}
            <Panel position="top-left">
              <div className="text-xs text-muted-foreground px-2 py-1 bg-background/80 backdrop-blur-sm rounded">
                {currentWorkflow.name} · {currentWorkflow.nodes.length} nodes
              </div>
            </Panel>
            {showMinimap && !isMobile && (
              <MiniMap
                className="bg-background border rounded-lg shadow-sm hidden md:block"
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
          {isMobile && (
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
          )}

          {/* Mobile zoom controls */}
          {isMobile && (
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
          )}
        </div>

        {/* Config panel - Desktop only */}
        {!isMobile && showConfigPanel && selectedNodes.length > 0 && (
          <NodeConfigPanel
            nodeId={selectedNodes[0]}
            className="w-80 shrink-0 hidden md:flex"
          />
        )}

        {/* Execution panel - Desktop only */}
        {!isMobile && (showExecutionPanel || isExecuting) && (
          <ExecutionPanel className="w-80 shrink-0 hidden md:flex" />
        )}
      </div>

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
