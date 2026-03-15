import { fireEvent, render, screen } from '@testing-library/react';
import { NodeSearchCommand } from './node-search-command';

const mockSetCenter = jest.fn();
const mockGetNode = jest.fn(() => ({ position: { x: 10, y: 20 }, measured: { width: 100, height: 60 } }));

const mockSelectNodes = jest.fn();
const mockStartExecution = jest.fn();
const mockCancelExecution = jest.fn();
const mockDeleteNodes = jest.fn();
const mockSaveWorkflow = jest.fn();
const mockCreateWorkflow = jest.fn();
const mockAddNode = jest.fn();
const mockInsertNodeFromIntent = jest.fn();
const mockAddRecentNode = jest.fn();
const mockAddNodeFromTemplate = jest.fn();
const mockClearInsertionIntent = jest.fn();
const mockUndo = jest.fn();
const mockRedo = jest.fn();
const mockAutoLayout = jest.fn();
const mockToggleNodePalette = jest.fn();
const mockToggleConfigPanel = jest.fn();
const mockToggleMinimap = jest.fn();

const mockStore = {
  currentWorkflow: {
    id: 'wf-1',
    nodes: [
      {
        id: 'node-1',
        type: 'tool',
        data: { label: 'Search Tool', description: 'query node' },
      },
    ],
  },
  selectNodes: mockSelectNodes,
  saveWorkflow: mockSaveWorkflow,
  undo: mockUndo,
  redo: mockRedo,
  deleteNodes: mockDeleteNodes,
  addNode: mockAddNode,
  insertNodeFromIntent: mockInsertNodeFromIntent,
  addRecentNode: mockAddRecentNode,
  addNodeFromTemplate: mockAddNodeFromTemplate,
  clearInsertionIntent: mockClearInsertionIntent,
  nodeTemplates: [
    {
      id: 'template-knowledge-answer',
      name: 'Knowledge Answer',
      description: 'Answer with knowledge',
      nodeType: 'answer',
      data: {},
    },
  ],
  recentNodes: ['knowledgeRetrieval'],
  favoriteNodes: ['knowledgeRetrieval'],
  insertionIntent: null as null | Record<string, unknown>,
  selectedNodes: ['node-1'],
  autoLayout: mockAutoLayout,
  toggleNodePalette: mockToggleNodePalette,
  toggleConfigPanel: mockToggleConfigPanel,
  toggleMinimap: mockToggleMinimap,
  startExecution: mockStartExecution,
  cancelExecution: mockCancelExecution,
  isExecuting: false,
  createWorkflow: mockCreateWorkflow,
};

jest.mock('@xyflow/react', () => ({
  useReactFlow: () => ({
    setCenter: mockSetCenter,
    getNode: mockGetNode,
  }),
}));

jest.mock('@/stores/workflow', () => ({
  useWorkflowEditorStore: () => mockStore,
}));

jest.mock('@/components/ui/command', () => ({
  CommandDialog: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
    open ? <div>{children}</div> : null,
  CommandInput: ({ value, onValueChange, placeholder }: { value?: string; onValueChange?: (value: string) => void; placeholder?: string }) => (
    <input
      placeholder={placeholder}
      value={value}
      onChange={(e) => onValueChange?.(e.target.value)}
    />
  ),
  CommandList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CommandEmpty: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CommandGroup: ({ children, heading }: { children: React.ReactNode; heading?: React.ReactNode }) => (
    <div>
      <div>{heading}</div>
      {children}
    </div>
  ),
  CommandItem: ({ children, onSelect }: { children: React.ReactNode; onSelect?: () => void }) => (
    <button type="button" onClick={onSelect}>{children}</button>
  ),
  CommandSeparator: () => <hr />,
}));

describe('NodeSearchCommand', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockStore.insertionIntent = null;
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('opens with Ctrl/Cmd + K and executes run command', () => {
    render(<NodeSearchCommand />);
    fireEvent.keyDown(document, { key: 'k', ctrlKey: true });

    expect(screen.getByRole('textbox')).toBeInTheDocument();
    const runButton = screen.getAllByRole('button').find((btn) => /run/i.test(btn.textContent || ''));
    fireEvent.click(runButton!);
    expect(mockStartExecution).toHaveBeenCalledWith({});
  });

  it('selects a matching node and centers viewport', () => {
    render(<NodeSearchCommand />);
    fireEvent.keyDown(document, { key: 'k', ctrlKey: true });
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'search' } });

    fireEvent.click(screen.getByText('Search Tool'));
    expect(mockSelectNodes).toHaveBeenCalledWith(['node-1']);

    jest.runAllTimers();
    expect(mockSetCenter).toHaveBeenCalledWith(60, 50, { zoom: 1, duration: 500 });
  });

  it('shows matching node catalog entries and inserts a node from the command palette', () => {
    render(<NodeSearchCommand />);
    fireEvent.keyDown(document, { key: 'k', ctrlKey: true });
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'knowledge' } });

    fireEvent.click(screen.getByText('Knowledge Retrieval'));

    expect(mockAddNode).toHaveBeenCalledWith('knowledgeRetrieval', { x: 250, y: 250 });
    expect(mockAddRecentNode).toHaveBeenCalledWith('knowledgeRetrieval');
  });

  it('uses insertion intent to insert into an existing path', () => {
    mockStore.insertionIntent = {
      mode: 'insert-between',
      origin: 'edge-gap',
      edgeId: 'edge-1',
      sourceNodeId: 'node-1',
      targetNodeId: 'node-2',
      openedAt: Date.now(),
    };

    render(<NodeSearchCommand />);

    expect(screen.getByRole('textbox')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'knowledge' } });
    fireEvent.click(screen.getByText('Knowledge Retrieval'));

    expect(mockInsertNodeFromIntent).toHaveBeenCalledWith('knowledgeRetrieval');
    expect(mockAddNode).not.toHaveBeenCalled();
  });
});
