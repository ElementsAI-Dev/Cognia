'use client';

/**
 * WorkflowEditorPanel - Main React Flow-based workflow editor
 */

import { useCallback, useRef, useEffect } from 'react';
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
import { Controls } from '@/components/ai-elements/controls';
import { Panel } from '@/components/ai-elements/panel';
import '@xyflow/react/dist/style.css';

import { cn } from '@/lib/utils';
import { useWorkflowEditorStore } from '@/stores/workflow-editor-store';
import { nodeTypes } from './nodes';
import { NodePalette } from './node-palette';
import { WorkflowToolbar } from './workflow-toolbar';
import { NodeConfigPanel } from './node-config-panel';
import type { WorkflowNodeType, WorkflowNode } from '@/types/workflow-editor';

interface WorkflowEditorPanelProps {
  className?: string;
}

function WorkflowEditorContent({ className }: WorkflowEditorPanelProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { fitView, zoomIn, zoomOut, screenToFlowPosition } = useReactFlow();

  const {
    currentWorkflow,
    showNodePalette,
    showConfigPanel,
    showMinimap,
    selectedNodes,
    executionState,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addNode,
    selectNodes,
    createWorkflow,
  } = useWorkflowEditorStore();

  // Initialize workflow if none exists
  useEffect(() => {
    if (!currentWorkflow) {
      createWorkflow('New Workflow');
    }
  }, [currentWorkflow, createWorkflow]);

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

  // Handle export
  const handleExport = useCallback(() => {
    if (!currentWorkflow) return;
    const data = JSON.stringify(currentWorkflow, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentWorkflow.name.replace(/\s+/g, '-').toLowerCase()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [currentWorkflow]);

  // Handle import
  const handleImport = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const workflow = JSON.parse(text);
        useWorkflowEditorStore.getState().loadWorkflow(workflow);
      } catch (error) {
        console.error('Failed to import workflow:', error);
      }
    };
    input.click();
  }, []);

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
        onExport={handleExport}
        onImport={handleImport}
      />

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Node palette */}
        {showNodePalette && (
          <NodePalette className="w-64 shrink-0" />
        )}

        {/* React Flow canvas */}
        <div
          ref={reactFlowWrapper}
          className="flex-1 h-full"
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
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            defaultViewport={currentWorkflow.viewport}
            snapToGrid={currentWorkflow.settings.snapToGrid}
            snapGrid={[currentWorkflow.settings.gridSize, currentWorkflow.settings.gridSize]}
            deleteKeyCode={['Backspace', 'Delete']}
            multiSelectionKeyCode={['Shift', 'Meta', 'Control']}
            selectionOnDrag
            panOnScroll
            selectNodesOnDrag={false}
            className="bg-background"
            proOptions={{ hideAttribution: true }}
          >
            <Controls />
            {/* Workflow info panel */}
            <Panel position="top-left">
              <div className="text-xs text-muted-foreground px-2 py-1">
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

        {/* Config panel */}
        {showConfigPanel && selectedNodes.length > 0 && (
          <NodeConfigPanel
            nodeId={selectedNodes[0]}
            className="w-80 shrink-0"
          />
        )}
      </div>
    </div>
  );
}

export function WorkflowEditorPanel(props: WorkflowEditorPanelProps) {
  return (
    <ReactFlowProvider>
      <WorkflowEditorContent {...props} />
    </ReactFlowProvider>
  );
}

export default WorkflowEditorPanel;
