import { fireEvent, render, screen } from '@testing-library/react';
import { CanvasContextMenu } from './canvas-context-menu';

const mockFitView = jest.fn();
const mockZoomIn = jest.fn();
const mockZoomOut = jest.fn();
const mockScreenToFlowPosition = jest.fn(({ x, y }: { x: number; y: number }) => ({ x: x + 1, y: y + 2 }));

const mockUndo = jest.fn();
const mockRedo = jest.fn();
const mockPasteSelection = jest.fn();
const mockSelectAll = jest.fn();
const mockAutoLayout = jest.fn();
const mockSaveWorkflow = jest.fn();
const mockExportToFile = jest.fn();

const mockStoreState = {
  undo: mockUndo,
  redo: mockRedo,
  pasteSelection: mockPasteSelection,
  selectAll: mockSelectAll,
  autoLayout: mockAutoLayout,
  copiedNodes: [] as unknown[],
  history: [{}],
  historyIndex: 0,
  saveWorkflow: mockSaveWorkflow,
  exportToFile: mockExportToFile,
};

jest.mock('zustand/react/shallow', () => ({
  useShallow: (fn: (...args: unknown[]) => unknown) => fn,
}));

jest.mock('@xyflow/react', () => ({
  useReactFlow: () => ({
    fitView: mockFitView,
    zoomIn: mockZoomIn,
    zoomOut: mockZoomOut,
    screenToFlowPosition: mockScreenToFlowPosition,
  }),
}));

jest.mock('@/stores/workflow', () => ({
  useWorkflowEditorStore: jest.fn((selector: (state: typeof mockStoreState) => unknown) =>
    selector(mockStoreState)
  ),
}));

jest.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({ children, onClick, disabled }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean }) => (
    <button type="button" onClick={onClick} disabled={disabled}>{children}</button>
  ),
  DropdownMenuSeparator: () => <hr />,
  DropdownMenuSub: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuSubContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuSubTrigger: ({ children }: { children: React.ReactNode }) => <button type="button">{children}</button>,
}));

describe('CanvasContextMenu', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStoreState.copiedNodes = [];
    mockStoreState.history = [{}];
    mockStoreState.historyIndex = 0;
  });

  it('disables undo/redo/paste when actions are not available', () => {
    render(
      <CanvasContextMenu
        open={true}
        position={{ x: 100, y: 200 }}
        onClose={jest.fn()}
        onAddNode={jest.fn()}
      />
    );

    expect(screen.getByText(/undo/i).closest('button')).toBeDisabled();
    expect(screen.getByText(/redo/i).closest('button')).toBeDisabled();
    expect(screen.getByText(/paste/i).closest('button')).toBeDisabled();
  });

  it('adds node with transformed position and closes menu', () => {
    const onAddNode = jest.fn();
    const onClose = jest.fn();
    render(
      <CanvasContextMenu
        open={true}
        position={{ x: 100, y: 200 }}
        onClose={onClose}
        onAddNode={onAddNode}
      />
    );

    fireEvent.click(screen.getByText('AI Node'));
    expect(mockScreenToFlowPosition).toHaveBeenCalledWith({ x: 100, y: 200 });
    expect(onAddNode).toHaveBeenCalledWith('ai', { x: 101, y: 202 });
    expect(onClose).toHaveBeenCalled();
  });

  it('runs menu actions and closes on escape', () => {
    const onClose = jest.fn();
    render(
      <CanvasContextMenu
        open={true}
        position={{ x: 10, y: 20 }}
        onClose={onClose}
        onAddNode={jest.fn()}
      />
    );

    fireEvent.click(screen.getByText(/auto layout/i));
    expect(mockAutoLayout).toHaveBeenCalled();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});
