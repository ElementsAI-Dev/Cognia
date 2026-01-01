import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NodeSearchPanel } from './node-search-panel';
import { useWorkflowEditorStore } from '@/stores/workflow-editor-store';
import { NextIntlClientProvider } from 'next-intl';

jest.mock('@/stores/workflow-editor-store');

const mockUseWorkflowEditorStore = useWorkflowEditorStore as jest.MockedFunction<typeof useWorkflowEditorStore>;

type MockStoreReturn = Partial<ReturnType<typeof useWorkflowEditorStore>>;

const messages = {
  workflowEditor: {
    searchNodes: 'Search',
    searchNodesPlaceholder: 'Search nodes...',
    noNodesFound: 'No nodes found',
  },
};

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {component}
    </NextIntlClientProvider>
  );
};

describe('NodeSearchPanel', () => {
  const mockSelectNodes = jest.fn();
  const mockOnNavigateToNode = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders search button', () => {
    mockUseWorkflowEditorStore.mockReturnValue({
      currentWorkflow: {
        id: 'test-workflow',
        name: 'Test Workflow',
        nodes: [],
        edges: [],
      },
      selectNodes: mockSelectNodes,
      breakpoints: new Set<string>(),
      executionState: null,
    } as MockStoreReturn);

    renderWithProviders(<NodeSearchPanel />);
    
    expect(screen.getByRole('button')).toBeInTheDocument();
    expect(screen.getByText('Search')).toBeInTheDocument();
  });

  it('disables button when no workflow', () => {
    mockUseWorkflowEditorStore.mockReturnValue({
      currentWorkflow: null,
      selectNodes: mockSelectNodes,
      breakpoints: new Set<string>(),
      executionState: null,
    } as MockStoreReturn);

    renderWithProviders(<NodeSearchPanel />);
    
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('opens search popover when clicked', async () => {
    mockUseWorkflowEditorStore.mockReturnValue({
      currentWorkflow: {
        id: 'test-workflow',
        name: 'Test Workflow',
        nodes: [
          {
            id: 'node-1',
            type: 'ai',
            position: { x: 0, y: 0 },
            data: { label: 'AI Node', nodeType: 'ai' },
          },
        ],
        edges: [],
      },
      selectNodes: mockSelectNodes,
      breakpoints: new Set<string>(),
      executionState: null,
    } as MockStoreReturn);

    renderWithProviders(<NodeSearchPanel />);
    
    await userEvent.click(screen.getByRole('button'));
    
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search nodes...')).toBeInTheDocument();
    });
  });

  it('displays nodes in search results', async () => {
    mockUseWorkflowEditorStore.mockReturnValue({
      currentWorkflow: {
        id: 'test-workflow',
        name: 'Test Workflow',
        nodes: [
          {
            id: 'start-1',
            type: 'start',
            position: { x: 0, y: 0 },
            data: { label: 'Start', nodeType: 'start' },
          },
          {
            id: 'ai-1',
            type: 'ai',
            position: { x: 100, y: 0 },
            data: { label: 'Process Input', nodeType: 'ai' },
          },
          {
            id: 'end-1',
            type: 'end',
            position: { x: 200, y: 0 },
            data: { label: 'End', nodeType: 'end' },
          },
        ],
        edges: [],
      },
      selectNodes: mockSelectNodes,
      breakpoints: new Set<string>(),
      executionState: null,
    } as MockStoreReturn);

    renderWithProviders(<NodeSearchPanel />);
    
    await userEvent.click(screen.getByRole('button'));
    
    await waitFor(() => {
      expect(screen.getByText('Start')).toBeInTheDocument();
      expect(screen.getByText('Process Input')).toBeInTheDocument();
      expect(screen.getByText('End')).toBeInTheDocument();
    });
  });

  it('filters nodes based on search query', async () => {
    mockUseWorkflowEditorStore.mockReturnValue({
      currentWorkflow: {
        id: 'test-workflow',
        name: 'Test Workflow',
        nodes: [
          {
            id: 'start-1',
            type: 'start',
            position: { x: 0, y: 0 },
            data: { label: 'Start', nodeType: 'start' },
          },
          {
            id: 'ai-1',
            type: 'ai',
            position: { x: 100, y: 0 },
            data: { label: 'AI Processor', nodeType: 'ai' },
          },
        ],
        edges: [],
      },
      selectNodes: mockSelectNodes,
      breakpoints: new Set<string>(),
      executionState: null,
    } as MockStoreReturn);

    renderWithProviders(<NodeSearchPanel />);
    
    await userEvent.click(screen.getByRole('button'));
    
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search nodes...')).toBeInTheDocument();
    });

    await userEvent.type(screen.getByPlaceholderText('Search nodes...'), 'AI');
    
    await waitFor(() => {
      expect(screen.getByText('AI Processor')).toBeInTheDocument();
    });
  });

  it('shows empty state when no nodes match', async () => {
    mockUseWorkflowEditorStore.mockReturnValue({
      currentWorkflow: {
        id: 'test-workflow',
        name: 'Test Workflow',
        nodes: [
          {
            id: 'start-1',
            type: 'start',
            position: { x: 0, y: 0 },
            data: { label: 'Start', nodeType: 'start' },
          },
        ],
        edges: [],
      },
      selectNodes: mockSelectNodes,
      breakpoints: new Set<string>(),
      executionState: null,
    } as MockStoreReturn);

    renderWithProviders(<NodeSearchPanel />);
    
    await userEvent.click(screen.getByRole('button'));
    
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search nodes...')).toBeInTheDocument();
    });

    await userEvent.type(screen.getByPlaceholderText('Search nodes...'), 'nonexistent');
    
    await waitFor(() => {
      expect(screen.getByText('No nodes found')).toBeInTheDocument();
    });
  });

  it('shows breakpoint indicator for nodes with breakpoints', async () => {
    mockUseWorkflowEditorStore.mockReturnValue({
      currentWorkflow: {
        id: 'test-workflow',
        name: 'Test Workflow',
        nodes: [
          {
            id: 'ai-1',
            type: 'ai',
            position: { x: 0, y: 0 },
            data: { label: 'AI Node', nodeType: 'ai' },
          },
        ],
        edges: [],
      },
      selectNodes: mockSelectNodes,
      breakpoints: new Set<string>(['ai-1']),
      executionState: null,
    } as MockStoreReturn);

    renderWithProviders(<NodeSearchPanel />);
    
    await userEvent.click(screen.getByRole('button'));
    
    await waitFor(() => {
      expect(screen.getByText('AI Node')).toBeInTheDocument();
    });
  });

  it('shows execution status for running nodes', async () => {
    mockUseWorkflowEditorStore.mockReturnValue({
      currentWorkflow: {
        id: 'test-workflow',
        name: 'Test Workflow',
        nodes: [
          {
            id: 'ai-1',
            type: 'ai',
            position: { x: 0, y: 0 },
            data: { label: 'AI Node', nodeType: 'ai' },
          },
        ],
        edges: [],
      },
      selectNodes: mockSelectNodes,
      breakpoints: new Set<string>(),
      executionState: {
        nodeStates: {
          'ai-1': { status: 'running' },
        },
      },
    } as MockStoreReturn);

    renderWithProviders(<NodeSearchPanel />);
    
    await userEvent.click(screen.getByRole('button'));
    
    await waitFor(() => {
      expect(screen.getByText('Running')).toBeInTheDocument();
    });
  });

  it('shows completed status for finished nodes', async () => {
    mockUseWorkflowEditorStore.mockReturnValue({
      currentWorkflow: {
        id: 'test-workflow',
        name: 'Test Workflow',
        nodes: [
          {
            id: 'ai-1',
            type: 'ai',
            position: { x: 0, y: 0 },
            data: { label: 'AI Node', nodeType: 'ai' },
          },
        ],
        edges: [],
      },
      selectNodes: mockSelectNodes,
      breakpoints: new Set<string>(),
      executionState: {
        nodeStates: {
          'ai-1': { status: 'completed' },
        },
      },
    } as MockStoreReturn);

    renderWithProviders(<NodeSearchPanel />);
    
    await userEvent.click(screen.getByRole('button'));
    
    await waitFor(() => {
      expect(screen.getByText('Done')).toBeInTheDocument();
    });
  });

  it('shows failed status for failed nodes', async () => {
    mockUseWorkflowEditorStore.mockReturnValue({
      currentWorkflow: {
        id: 'test-workflow',
        name: 'Test Workflow',
        nodes: [
          {
            id: 'ai-1',
            type: 'ai',
            position: { x: 0, y: 0 },
            data: { label: 'AI Node', nodeType: 'ai' },
          },
        ],
        edges: [],
      },
      selectNodes: mockSelectNodes,
      breakpoints: new Set<string>(),
      executionState: {
        nodeStates: {
          'ai-1': { status: 'failed' },
        },
      },
    } as MockStoreReturn);

    renderWithProviders(<NodeSearchPanel />);
    
    await userEvent.click(screen.getByRole('button'));
    
    await waitFor(() => {
      expect(screen.getByText('Failed')).toBeInTheDocument();
    });
  });

  it('displays node count in footer', async () => {
    mockUseWorkflowEditorStore.mockReturnValue({
      currentWorkflow: {
        id: 'test-workflow',
        name: 'Test Workflow',
        nodes: [
          { id: 'node-1', type: 'start', position: { x: 0, y: 0 }, data: { label: 'Start', nodeType: 'start' } },
          { id: 'node-2', type: 'ai', position: { x: 100, y: 0 }, data: { label: 'AI', nodeType: 'ai' } },
          { id: 'node-3', type: 'end', position: { x: 200, y: 0 }, data: { label: 'End', nodeType: 'end' } },
        ],
        edges: [],
      },
      selectNodes: mockSelectNodes,
      breakpoints: new Set<string>(),
      executionState: null,
    } as MockStoreReturn);

    renderWithProviders(<NodeSearchPanel />);
    
    await userEvent.click(screen.getByRole('button'));
    
    await waitFor(() => {
      expect(screen.getByText('3 nodes')).toBeInTheDocument();
    });
  });

  it('calls onNavigateToNode when node selected', async () => {
    mockUseWorkflowEditorStore.mockReturnValue({
      currentWorkflow: {
        id: 'test-workflow',
        name: 'Test Workflow',
        nodes: [
          {
            id: 'ai-1',
            type: 'ai',
            position: { x: 0, y: 0 },
            data: { label: 'AI Node', nodeType: 'ai' },
          },
        ],
        edges: [],
      },
      selectNodes: mockSelectNodes,
      breakpoints: new Set<string>(),
      executionState: null,
    } as MockStoreReturn);

    renderWithProviders(<NodeSearchPanel onNavigateToNode={mockOnNavigateToNode} />);
    
    await userEvent.click(screen.getByRole('button'));
    
    await waitFor(() => {
      expect(screen.getByText('AI Node')).toBeInTheDocument();
    });
  });

  it('groups nodes by type', async () => {
    mockUseWorkflowEditorStore.mockReturnValue({
      currentWorkflow: {
        id: 'test-workflow',
        name: 'Test Workflow',
        nodes: [
          { id: 'start-1', type: 'start', position: { x: 0, y: 0 }, data: { label: 'Start', nodeType: 'start' } },
          { id: 'ai-1', type: 'ai', position: { x: 100, y: 0 }, data: { label: 'AI 1', nodeType: 'ai' } },
          { id: 'ai-2', type: 'ai', position: { x: 200, y: 0 }, data: { label: 'AI 2', nodeType: 'ai' } },
          { id: 'end-1', type: 'end', position: { x: 300, y: 0 }, data: { label: 'End', nodeType: 'end' } },
        ],
        edges: [],
      },
      selectNodes: mockSelectNodes,
      breakpoints: new Set<string>(),
      executionState: null,
    } as MockStoreReturn);

    renderWithProviders(<NodeSearchPanel />);
    
    await userEvent.click(screen.getByRole('button'));
    
    await waitFor(() => {
      // Should show group headers
      expect(screen.getByText('AI 1')).toBeInTheDocument();
      expect(screen.getByText('AI 2')).toBeInTheDocument();
    });
  });
});
