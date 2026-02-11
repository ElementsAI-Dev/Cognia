/**
 * @jest-environment jsdom
 */

import { render, screen, waitFor } from '@testing-library/react';
import { NodeConfigPanel } from './node-config-panel';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock zustand/react/shallow
jest.mock('zustand/react/shallow', () => ({
  useShallow: (fn: (...args: unknown[]) => unknown) => fn,
}));

// Mock validation
jest.mock('@/lib/workflow-editor/validation', () => ({
  validateNode: jest.fn(() => ({ isValid: false, errors: ['AI prompt is required'], warnings: ['No model selected, will use default'] })),
}));

// Mock the store
const mockUpdateNode = jest.fn();
const mockDeleteNode = jest.fn();

jest.mock('@/stores/workflow', () => ({
  useWorkflowEditorStore: jest.fn((selector?: (state: Record<string, unknown>) => unknown) => {
    const state = {
      currentWorkflow: {
        id: 'test-workflow',
        nodes: [
          {
            id: 'node-1',
            type: 'ai',
            data: {
              nodeType: 'ai',
              label: 'AI Node',
              prompt: '',
            },
          },
          {
            id: 'node-2',
            type: 'tool',
            data: {
              nodeType: 'tool',
              label: 'Tool Node',
              toolId: 'test-tool',
            },
          },
        ],
      },
      updateNode: mockUpdateNode,
      deleteNode: mockDeleteNode,
      activeConfigTab: 'config',
      setActiveConfigTab: jest.fn(),
    };
    return typeof selector === 'function' ? selector(state) : state;
  }),
}));

// Mock lazy-loaded config components
jest.mock('./node-config', () => ({
  AINodeConfig: () => <div data-testid="ai-config">AI Config</div>,
  ToolNodeConfig: () => <div data-testid="tool-config">Tool Config</div>,
  ConditionalNodeConfig: () => <div data-testid="conditional-config" />,
  CodeNodeConfig: () => <div data-testid="code-config" />,
  LoopNodeConfig: () => <div data-testid="loop-config" />,
  HumanNodeConfig: () => <div data-testid="human-config" />,
  StartNodeConfig: () => <div data-testid="start-config" />,
  EndNodeConfig: () => <div data-testid="end-config" />,
  ParallelNodeConfig: () => <div data-testid="parallel-config" />,
  DelayNodeConfig: () => <div data-testid="delay-config" />,
  SubworkflowNodeConfig: () => <div data-testid="subworkflow-config" />,
  WebhookNodeConfig: () => <div data-testid="webhook-config" />,
  TransformNodeConfig: () => <div data-testid="transform-config" />,
  MergeNodeConfig: () => <div data-testid="merge-config" />,
  GroupNodeConfig: () => <div data-testid="group-config" />,
  AnnotationNodeConfig: () => <div data-testid="annotation-config" />,
  KnowledgeRetrievalNodeConfig: () => <div data-testid="kr-config" />,
  ParameterExtractorNodeConfig: () => <div data-testid="pe-config" />,
  VariableAggregatorNodeConfig: () => <div data-testid="va-config" />,
  QuestionClassifierNodeConfig: () => <div data-testid="qc-config" />,
  TemplateTransformNodeConfig: () => <div data-testid="tt-config" />,
  ChartNodeConfig: () => <div data-testid="chart-config" />,
  IOSchemaEditor: () => <div data-testid="io-schema" />,
  NodeErrorConfigPanel: () => <div data-testid="error-config" />,
  NodeOutputPreview: () => <div data-testid="output-preview" />,
  ConfigLoadingFallback: () => <div data-testid="config-loading" />,
}));

describe('NodeConfigPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders node label and type when node selected', () => {
    render(<NodeConfigPanel nodeId="node-1" />);
    
    expect(screen.getByText('AI Node')).toBeInTheDocument();
    expect(screen.getByText('ai')).toBeInTheDocument();
  });

  it('displays selected node label', async () => {
    render(<NodeConfigPanel nodeId="node-1" />);
    
    await waitFor(() => {
      expect(screen.getByText('AI Node')).toBeInTheDocument();
    });
  });

  it('shows node type badge', async () => {
    render(<NodeConfigPanel nodeId="node-1" />);
    
    await waitFor(() => {
      expect(screen.getByText('ai')).toBeInTheDocument();
    });
  });

  it('renders config content for node type', () => {
    render(<NodeConfigPanel nodeId="node-1" />);
    
    // The panel renders with tabs for configuration
    expect(screen.getByText('AI Node')).toBeInTheDocument();
  });
});

describe('NodeConfigPanel with no selection', () => {
  it('shows no selection message when no node selected', () => {
    const { useWorkflowEditorStore } = jest.requireMock('@/stores/workflow') as {
      useWorkflowEditorStore: jest.Mock;
    };
    useWorkflowEditorStore.mockReturnValueOnce({
      currentWorkflow: { id: 'test', nodes: [] },
      selectedNodes: [],
      updateNode: mockUpdateNode,
      showConfigPanel: true,
      toggleConfigPanel: jest.fn(),
    });

    render(<NodeConfigPanel nodeId="node-1" />);
    
    expect(screen.getByText('selectNodeToConfig')).toBeInTheDocument();
  });
});

describe('NodeConfigPanel with unknown node', () => {
  it('shows no selection message when node not found', () => {
    render(<NodeConfigPanel nodeId="nonexistent-node" />);
    
    expect(screen.getByText('selectNodeToConfig')).toBeInTheDocument();
  });
});
