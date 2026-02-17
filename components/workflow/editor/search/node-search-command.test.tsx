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
const mockUndo = jest.fn();
const mockRedo = jest.fn();
const mockAutoLayout = jest.fn();
const mockToggleNodePalette = jest.fn();
const mockToggleConfigPanel = jest.fn();
const mockToggleMinimap = jest.fn();

jest.mock('@xyflow/react', () => ({
  useReactFlow: () => ({
    setCenter: mockSetCenter,
    getNode: mockGetNode,
  }),
}));

jest.mock('@/stores/workflow', () => ({
  useWorkflowEditorStore: () => ({
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
    selectedNodes: ['node-1'],
    autoLayout: mockAutoLayout,
    toggleNodePalette: mockToggleNodePalette,
    toggleConfigPanel: mockToggleConfigPanel,
    toggleMinimap: mockToggleMinimap,
    startExecution: mockStartExecution,
    cancelExecution: mockCancelExecution,
    isExecuting: false,
    createWorkflow: mockCreateWorkflow,
  }),
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
});
