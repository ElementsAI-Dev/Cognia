/**
 * @jest-environment jsdom
 */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';

import { WorkflowInspectorPanel } from './workflow-inspector-panel';

const mockSetActiveInspectorSection = jest.fn();
const mockRetryFromNode = jest.fn();
const mockUpdateNode = jest.fn();

const mockStore = {
  currentWorkflow: {
    id: 'workflow-1',
    name: 'Inspector Workflow',
    nodes: [
      {
        id: 'node-1',
        type: 'tool',
        data: {
          id: 'node-1',
          label: 'Search Tool',
          nodeType: 'tool',
          description: 'Fetches data',
          executionStatus: 'failed',
          executionOutput: { ok: true },
          pinnedData: { isPinned: false },
          inputs: {
            query: { type: 'string', description: 'Search query' },
          },
          outputs: {
            result: { type: 'string', description: 'Result value' },
          },
        },
      },
    ],
  },
  selectedNodes: ['node-1'],
  activeInspectorSection: 'config',
  setActiveInspectorSection: mockSetActiveInspectorSection,
  retryFromNode: mockRetryFromNode,
  updateNode: mockUpdateNode,
  executionState: {
    nodeStates: {
      'node-1': {
        nodeId: 'node-1',
        status: 'failed',
        logs: [],
        retryCount: 0,
      },
    },
  },
  validationErrors: [{ nodeId: 'node-1', message: 'Missing query', severity: 'error' }],
};

jest.mock('@/stores/workflow', () => ({
  useWorkflowEditorStore: (selector?: (state: typeof mockStore) => unknown) =>
    (typeof selector === 'function' ? selector(mockStore) : mockStore),
}));

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

jest.mock('@/components/ui/tabs', () => ({
  Tabs: ({
    children,
    value,
    onValueChange,
  }: {
    children: React.ReactNode;
    value: string;
    onValueChange?: (value: string) => void;
  }) => (
    <div data-testid="tabs" data-value={value}>
      <button onClick={() => onValueChange?.('config')}>config-tab</button>
      <button onClick={() => onValueChange?.('data')}>data-tab</button>
      <button onClick={() => onValueChange?.('execution')}>execution-tab</button>
      {children}
    </div>
  ),
  TabsList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsContent: ({
    children,
    value,
  }: {
    children: React.ReactNode;
    value: string;
  }) => <div data-testid={`content-${value}`}>{children}</div>,
}));

jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
  }) => <button onClick={onClick}>{children}</button>,
}));

jest.mock('./node-config-panel', () => ({
  NodeConfigPanel: ({ nodeId }: { nodeId: string }) => <div data-testid="node-config-panel">{nodeId}</div>,
}));

jest.mock('../execution/execution-panel', () => ({
  ExecutionPanel: () => <div data-testid="execution-panel" />,
}));

jest.mock('./workflow-input-test-panel', () => ({
  WorkflowInputTestPanel: () => <div data-testid="workflow-input-test-panel" />,
}));

jest.mock('./node-config/node-output-preview', () => ({
  NodeOutputPreview: ({ executionOutput }: { executionOutput: unknown }) => (
    <div data-testid="node-output-preview">{JSON.stringify(executionOutput)}</div>
  ),
}));

describe('WorkflowInspectorPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStore.activeInspectorSection = 'config';
  });

  it('renders the selected node config panel in config section', () => {
    render(<WorkflowInspectorPanel />);

    expect(screen.getByTestId('node-config-panel')).toHaveTextContent('node-1');
  });

  it('renders output preview and node data summary in data section', () => {
    mockStore.activeInspectorSection = 'data';

    render(<WorkflowInspectorPanel />);

    expect(screen.getByTestId('node-output-preview')).toBeInTheDocument();
    expect(screen.getByText('query')).toBeInTheDocument();
    expect(screen.getByText('result')).toBeInTheDocument();
  });

  it('renders execution surfaces and retries the selected node in execution section', () => {
    mockStore.activeInspectorSection = 'execution';

    render(<WorkflowInspectorPanel />);

    expect(screen.getByTestId('workflow-input-test-panel')).toBeInTheDocument();
    expect(screen.getByTestId('execution-panel')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Retry node-1'));
    expect(mockRetryFromNode).toHaveBeenCalledWith('node-1');
  });

  it('updates the active inspector section when tabs change', () => {
    render(<WorkflowInspectorPanel />);

    fireEvent.click(screen.getByText('execution-tab'));
    expect(mockSetActiveInspectorSection).toHaveBeenCalledWith('execution');
  });

  it('does not force execution section again after the user switches tabs manually', () => {
    const { rerender } = render(<WorkflowInspectorPanel preferredSection="execution" />);

    expect(mockSetActiveInspectorSection).toHaveBeenCalledWith('execution');

    mockStore.activeInspectorSection = 'execution';
    rerender(<WorkflowInspectorPanel preferredSection="execution" />);

    mockSetActiveInspectorSection.mockClear();

    fireEvent.click(screen.getByText('config-tab'));
    expect(mockSetActiveInspectorSection).toHaveBeenCalledWith('config');

    mockStore.activeInspectorSection = 'config';
    mockSetActiveInspectorSection.mockClear();
    rerender(<WorkflowInspectorPanel preferredSection="execution" />);

    expect(mockSetActiveInspectorSection).not.toHaveBeenCalledWith('execution');
  });
});
