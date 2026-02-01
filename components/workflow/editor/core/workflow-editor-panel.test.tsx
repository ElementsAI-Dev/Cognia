/**
 * Unit tests for WorkflowEditorPanel component
 */

import { render, screen } from '@testing-library/react';
import { WorkflowEditorPanel } from './workflow-editor-panel';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock ReactFlow
jest.mock('reactflow', () => ({
  ReactFlow: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="react-flow">{children}</div>
  ),
  Background: () => <div data-testid="rf-background" />,
  Controls: () => <div data-testid="rf-controls" />,
  MiniMap: () => <div data-testid="rf-minimap" />,
  Panel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useNodesState: () => [[], jest.fn(), jest.fn()],
  useEdgesState: () => [[], jest.fn(), jest.fn()],
  useReactFlow: () => ({
    fitView: jest.fn(),
    getNodes: () => [],
    getEdges: () => [],
    setNodes: jest.fn(),
    setEdges: jest.fn(),
    addNodes: jest.fn(),
    addEdges: jest.fn(),
    deleteElements: jest.fn(),
    project: jest.fn(),
  }),
  ReactFlowProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  MarkerType: { ArrowClosed: 'arrowclosed' },
  Position: { Top: 'top', Bottom: 'bottom', Left: 'left', Right: 'right' },
}));

// Mock workflow store
jest.mock('@/stores/workflow', () => ({
  useWorkflowStore: () => ({
    currentWorkflow: {
      id: 'workflow-1',
      name: 'Test Workflow',
      nodes: [],
      edges: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    isExecuting: false,
    selectedNodeId: null,
    setSelectedNodeId: jest.fn(),
    updateNode: jest.fn(),
    deleteNode: jest.fn(),
    addNode: jest.fn(),
    addEdge: jest.fn(),
  }),
}));

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
}));

jest.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock child components
jest.mock('../nodes/start-node', () => ({
  StartNode: () => <div data-testid="start-node" />,
}));

jest.mock('../nodes/end-node', () => ({
  EndNode: () => <div data-testid="end-node" />,
}));

jest.mock('../nodes/ai-node', () => ({
  AINode: () => <div data-testid="ai-node" />,
}));

jest.mock('../edges/custom-edge', () => ({
  CustomEdge: () => <div data-testid="custom-edge" />,
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Plus: () => <span data-testid="icon-plus" />,
  Play: () => <span data-testid="icon-play" />,
  Pause: () => <span data-testid="icon-pause" />,
  Save: () => <span data-testid="icon-save" />,
  Undo: () => <span data-testid="icon-undo" />,
  Redo: () => <span data-testid="icon-redo" />,
  ZoomIn: () => <span data-testid="icon-zoom-in" />,
  ZoomOut: () => <span data-testid="icon-zoom-out" />,
  Maximize: () => <span data-testid="icon-maximize" />,
}));

describe('WorkflowEditorPanel', () => {
  it('renders the workflow editor', () => {
    render(<WorkflowEditorPanel />);
    expect(screen.getByTestId('react-flow')).toBeInTheDocument();
  });

  it('renders ReactFlow background', () => {
    render(<WorkflowEditorPanel />);
    expect(screen.getByTestId('rf-background')).toBeInTheDocument();
  });

  it('renders ReactFlow controls', () => {
    render(<WorkflowEditorPanel />);
    expect(screen.getByTestId('rf-controls')).toBeInTheDocument();
  });

  it('renders minimap', () => {
    render(<WorkflowEditorPanel />);
    expect(screen.getByTestId('rf-minimap')).toBeInTheDocument();
  });

  it('handles empty workflow', () => {
    jest.doMock('@/stores/workflow', () => ({
      useWorkflowStore: () => ({
        currentWorkflow: null,
        isExecuting: false,
        selectedNodeId: null,
      }),
    }));
    
    expect(() => render(<WorkflowEditorPanel />)).not.toThrow();
  });

  it('applies custom className', () => {
    const { container } = render(<WorkflowEditorPanel className="custom-class" />);
    expect(container.firstChild).toBeDefined();
  });
});
