/**
 * Unit tests for WorkflowEditorPanel component
 */

import { render, screen } from '@testing-library/react';
import { WorkflowEditorPanel } from './workflow-editor-panel';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock @xyflow/react
jest.mock('@xyflow/react', () => ({
  ReactFlow: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="react-flow">{children}</div>
  ),
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
    project: jest.fn(),
  }),
  ReactFlowProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  MarkerType: { ArrowClosed: 'arrowclosed' },
  Position: { Top: 'top', Bottom: 'bottom', Left: 'left', Right: 'right' },
}));

// Mock zustand/react/shallow
jest.mock('zustand/react/shallow', () => ({
  useShallow: (fn: (...args: unknown[]) => unknown) => fn,
}));

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: { div: ({ children, ...props }: { children?: React.ReactNode;[key: string]: unknown }) => <div {...props}>{children}</div> },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
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
  Panel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
jest.mock('@/components/ai-elements/loader', () => ({
  Loader: () => <div data-testid="loader" />,
}));
jest.mock('@/components/ui/sheet', () => ({
  Sheet: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SheetContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
jest.mock('@/components/ui/resizable', () => ({
  ResizablePanelGroup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ResizablePanel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
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
  CanvasContextMenu: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
jest.mock('./helper-lines', () => ({
  HelperLines: () => null,
  getHelperLines: () => ({ horizontal: null, vertical: null }),
}));
jest.mock('../nodes', () => ({
  nodeTypes: {},
}));

// Mock workflow store
jest.mock('@/stores/workflow', () => ({
  useWorkflowEditorStore: Object.assign(
    jest.fn((selector?: (state: Record<string, unknown>) => unknown) => {
      const state = {
        currentWorkflow: {
          id: 'workflow-1',
          name: 'Test Workflow',
          nodes: [],
          edges: [],
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
        selectedNodes: [],
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
      return typeof selector === 'function' ? selector(state) : state;
    }),
    { getState: jest.fn(() => ({ createWorkflow: jest.fn() })) }
  ),
}));

// Mock edges
jest.mock('../edges/custom-edge', () => ({
  CustomEdge: () => <div data-testid="custom-edge" />,
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

  it('applies custom className', () => {
    const { container } = render(<WorkflowEditorPanel className="custom-class" />);
    expect(container.firstChild).toBeDefined();
  });
});
