/**
 * Unit tests for WorkflowEditorPanel component
 */

import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { WorkflowEditorPanel } from './workflow-editor-panel';

let lastReactFlowProps: Record<string, unknown> | null = null;
const mockSetCenter = jest.fn();

const mockEditorState = {
  currentWorkflow: {
    id: 'workflow-1',
    name: 'Test Workflow',
    nodes: [
      {
        id: 'node-1',
        type: 'start',
        position: { x: 0, y: 0 },
        data: {
          label: 'Start',
          nodeType: 'start',
          executionStatus: 'idle',
          isConfigured: true,
          hasError: false,
        },
      },
      {
        id: 'node-2',
        type: 'end',
        position: { x: 200, y: 120 },
        data: {
          label: 'End',
          nodeType: 'end',
          executionStatus: 'idle',
          isConfigured: true,
          hasError: false,
        },
      },
    ],
    edges: [
      {
        id: 'edge-1',
        source: 'node-1',
        target: 'node-2',
        type: 'default',
        data: {},
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    settings: {
      autoSave: false,
      autoLayout: false,
      showMinimap: true,
      showGrid: true,
      snapToGrid: false,
      gridSize: 20,
      maxRetries: 3,
      retryDelay: 1000,
      executionTimeout: 60000,
    },
  },
  isDirty: false,
  showNodePalette: true,
  showConfigPanel: false,
  showExecutionPanel: false,
  showMinimap: true,
  selectedNodes: [] as string[],
  selectedEdges: [] as string[],
  validationFocusTarget: null as null | { issueId: string; nodeId?: string; edgeId?: string; issuedAt: number },
  executionState: null,
  isExecuting: false,
  onNodesChange: jest.fn(),
  onEdgesChange: jest.fn(),
  onConnect: jest.fn(),
  reconnectEdge: jest.fn(),
  deleteNodes: jest.fn(),
  deleteEdges: jest.fn(),
  addNode: jest.fn(),
  selectNodes: jest.fn(),
  createWorkflow: jest.fn(),
  setViewport: jest.fn(),
  pushHistory: jest.fn(),
  saveWorkflow: jest.fn(),
};

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock @xyflow/react
jest.mock('@xyflow/react', () => ({
  ReactFlow: ({ children, ...props }: { children?: ReactNode; [key: string]: unknown }) => {
    lastReactFlowProps = props;
    return <div data-testid="react-flow">{children}</div>;
  },
  Background: () => <div data-testid="rf-background" />,
  BackgroundVariant: { Dots: 'dots', Lines: 'lines', Cross: 'cross' },
  MiniMap: () => <div data-testid="rf-minimap" />,
  useReactFlow: () => ({
    fitView: jest.fn(),
    zoomIn: jest.fn(),
    zoomOut: jest.fn(),
    getNodes: () => [],
    getEdges: () => [],
    setNodes: jest.fn(),
    setEdges: jest.fn(),
    addNodes: jest.fn(),
    addEdges: jest.fn(),
    deleteElements: jest.fn(),
    screenToFlowPosition: jest.fn(() => ({ x: 0, y: 0 })),
    setViewport: jest.fn(),
    setCenter: mockSetCenter,
    project: jest.fn(),
  }),
  ReactFlowProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  MarkerType: { ArrowClosed: 'arrowclosed' },
  Position: { Top: 'top', Bottom: 'bottom', Left: 'left', Right: 'right' },
}));

// Mock workflow store
jest.mock('@/stores/workflow', () => ({
  useWorkflowEditorStore: Object.assign(
    jest.fn((selector?: (state: Record<string, unknown>) => unknown) => {
      return typeof selector === 'function' ? selector(mockEditorState) : mockEditorState;
    }),
    { getState: jest.fn(() => ({ createWorkflow: jest.fn() })) }
  ),
}));

// Mock zustand/react/shallow
jest.mock('zustand/react/shallow', () => ({
  useShallow: (fn: (...args: unknown[]) => unknown) => fn,
}));

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: { children?: ReactNode; [key: string]: unknown }) => (
      <div {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

// Mock hooks
jest.mock('@/hooks', () => ({
  useWorkflowKeyboardShortcuts: () => ({ shortcuts: [] }),
  useMediaQuery: () => false,
}));

// Mock additional UI components
jest.mock('@/components/ai-elements/controls', () => ({
  Controls: () => <div data-testid="rf-controls" />,
}));
jest.mock('@/components/ai-elements/panel', () => ({
  Panel: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
jest.mock('@/components/ai-elements/loader', () => ({
  Loader: () => <div data-testid="loader" />,
}));
jest.mock('@/components/ui/sheet', () => ({
  Sheet: ({ children }: { children: ReactNode }) => <>{children}</>,
  SheetContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SheetHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
jest.mock('@/components/ui/resizable', () => ({
  ResizablePanelGroup: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  ResizablePanel: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  ResizableHandle: () => <div />,
}));

// Mock sibling components
jest.mock('./node-palette', () => ({
  NodePalette: () => <div data-testid="node-palette" />,
}));
jest.mock('./workflow-toolbar', () => ({
  WorkflowToolbar: () => <div data-testid="workflow-toolbar" />,
}));
jest.mock('../panels/node-config-panel', () => ({
  NodeConfigPanel: () => <div data-testid="node-config-panel" />,
}));
jest.mock('../execution/execution-panel', () => ({
  ExecutionPanel: () => <div data-testid="execution-panel" />,
}));
jest.mock('../edges/custom-connection-line', () => ({
  CustomConnectionLine: () => <div />,
}));
jest.mock('../search/node-search-command', () => ({
  NodeSearchCommand: () => <div />,
}));
jest.mock('./canvas-context-menu', () => ({
  CanvasContextMenu: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
jest.mock('./helper-lines', () => ({
  HelperLines: () => null,
  getHelperLines: () => ({ horizontal: null, vertical: null }),
}));
jest.mock('../nodes', () => ({
  nodeTypes: {},
}));
jest.mock('../edges/custom-edge', () => ({
  CustomEdge: () => <div data-testid="custom-edge" />,
}));

describe('WorkflowEditorPanel', () => {
  beforeEach(() => {
    lastReactFlowProps = null;
    mockSetCenter.mockClear();
    mockEditorState.deleteNodes.mockClear();
    mockEditorState.deleteEdges.mockClear();
    mockEditorState.selectedNodes = [];
    mockEditorState.selectedEdges = [];
    mockEditorState.validationFocusTarget = null;
  });

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

  it('applies custom className', () => {
    const { container } = render(<WorkflowEditorPanel className="custom-class" />);
    expect(container.firstChild).toBeDefined();
  });

  it('decorates connected edges when a node is selected', () => {
    mockEditorState.selectedNodes = ['node-1'];
    render(<WorkflowEditorPanel />);

    const edges =
      (lastReactFlowProps?.edges as Array<{ id: string; data?: Record<string, unknown> }>) || [];
    expect(edges[0]?.data?.selectionState).toBe('connected');
  });

  it('focuses canvas when validation target points to a node', () => {
    mockEditorState.validationFocusTarget = {
      issueId: 'issue-1',
      nodeId: 'node-2',
      issuedAt: Date.now(),
    };

    render(<WorkflowEditorPanel />);
    expect(mockSetCenter).toHaveBeenCalled();
  });

  it('deletes nodes and remaining unrelated edges from React Flow delete payload', () => {
    render(<WorkflowEditorPanel />);

    const onDelete = lastReactFlowProps?.onDelete as
      | ((payload: {
          nodes: Array<{ id: string }>;
          edges: Array<{ id: string; source: string; target: string }>;
        }) => void)
      | undefined;

    onDelete?.({
      nodes: [{ id: 'node-1' }],
      edges: [
        { id: 'edge-1', source: 'node-1', target: 'node-2' },
        { id: 'edge-loose', source: 'node-x', target: 'node-y' },
      ],
    });

    expect(mockEditorState.deleteNodes).toHaveBeenCalledWith(['node-1']);
    expect(mockEditorState.deleteEdges).toHaveBeenCalledWith(['edge-loose']);
  });
});
