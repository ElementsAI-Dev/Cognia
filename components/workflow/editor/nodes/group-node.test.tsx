/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { GroupNode } from './group-node';
import type { GroupNodeData } from './group-node';

// Mock dependencies
jest.mock('@xyflow/react', () => ({
  NodeResizer: ({
    isVisible,
    minWidth,
    minHeight,
    lineClassName,
    handleClassName,
  }: {
    isVisible?: boolean;
    minWidth?: number;
    minHeight?: number;
    lineClassName?: string;
    handleClassName?: string;
  }) =>
    isVisible ? (
      <div data-testid="node-resizer" data-min-width={minWidth} data-min-height={minHeight}>
        <div className={lineClassName} data-testid="resizer-line" />
        <div className={handleClassName} data-testid="resizer-handle" />
      </div>
    ) : null,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    className,
    onClick,
    disabled,
    ...props
  }: {
    children?: React.ReactNode;
    className?: string;
    onClick?: () => void;
    disabled?: boolean;
    [key: string]: unknown;
  }) => (
    <button
      data-testid="button"
      className={className}
      onClick={onClick}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/input', () => ({
  Input: ({
    value,
    onChange,
    className,
    ...props
  }: {
    value?: string;
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    className?: string;
    [key: string]: unknown;
  }) => (
    <input data-testid="input" value={value} onChange={onChange} className={className} {...props} />
  ),
}));

jest.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="dropdown-menu">{children}</div>
  ),
  DropdownMenuTrigger: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  DropdownMenuContent: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="dropdown-content">{children}</div>
  ),
  DropdownMenuItem: ({
    children,
    onClick,
    className,
  }: {
    children?: React.ReactNode;
    onClick?: () => void;
    className?: string;
  }) => (
    <button data-testid="dropdown-item" className={className} onClick={onClick}>
      {children}
    </button>
  ),
  DropdownMenuSeparator: () => <div data-testid="dropdown-separator" />,
}));

jest.mock('@/stores/workflow', () => ({
  useWorkflowEditorStore: () => ({
    updateNode: jest.fn(),
    deleteNode: jest.fn(),
    duplicateNode: jest.fn(),
  }),
}));

jest.mock('lucide-react', () => ({
  MoreHorizontal: () => <svg data-testid="more-horizontal-icon" />,
  Trash2: () => <svg data-testid="trash-icon" />,
  Palette: () => <svg data-testid="palette-icon" />,
  Copy: () => <svg data-testid="copy-icon" />,
  Minimize2: () => <svg data-testid="minimize-icon" />,
  Maximize2: () => <svg data-testid="maximize-icon" />,
  Edit2: () => <svg data-testid="edit-icon" />,
  Check: () => <svg data-testid="check-icon" />,
  X: () => <svg data-testid="x-icon" />,
  FolderOpen: () => <svg data-testid="folder-open-icon" />,
  Folder: () => <svg data-testid="folder-icon" />,
}));

const mockData: GroupNodeData = {
  label: 'My Group',
  description: 'A group of nodes',
  nodeType: 'group',
  isCollapsed: false,
  color: '#3b82f6',
  childNodeIds: ['node-1', 'node-2'],
  minWidth: 200,
  minHeight: 150,
};

const mockProps = {
  id: 'group-1',
  data: mockData,
  selected: false,
  type: 'group',
  draggable: true,
  selectable: true,
  deletable: true,
  dragging: false,
  zIndex: 0,
  isConnectable: true,
  positionAbsoluteX: 0,
  positionAbsoluteY: 0,
};

describe('GroupNode', () => {
  it('renders without crashing', () => {
    render(<GroupNode {...mockProps} />);
    expect(screen.getByText('My Group')).toBeInTheDocument();
  });

  it('renders group label', () => {
    render(<GroupNode {...mockProps} />);
    expect(screen.getByText('My Group')).toBeInTheDocument();
  });

  it('renders description when not collapsed', () => {
    render(<GroupNode {...mockProps} />);
    expect(screen.getByText('A group of nodes')).toBeInTheDocument();
  });

  it('does not render description when collapsed', () => {
    const collapsedData = { ...mockData, isCollapsed: true };
    render(<GroupNode {...mockProps} data={collapsedData} />);
    expect(screen.queryByText('A group of nodes')).not.toBeInTheDocument();
  });

  it('shows NodeResizer when selected', () => {
    render(<GroupNode {...mockProps} selected={true} />);
    expect(screen.getByTestId('node-resizer')).toBeInTheDocument();
  });

  it('does not show NodeResizer when not selected', () => {
    render(<GroupNode {...mockProps} selected={false} />);
    expect(screen.queryByTestId('node-resizer')).not.toBeInTheDocument();
  });

  it('renders FolderOpen icon when not collapsed', () => {
    render(<GroupNode {...mockProps} />);
    expect(screen.getByTestId('folder-open-icon')).toBeInTheDocument();
  });

  it('renders Folder icon when collapsed', () => {
    const collapsedData = { ...mockData, isCollapsed: true };
    render(<GroupNode {...mockProps} data={collapsedData} />);
    expect(screen.getByTestId('folder-icon')).toBeInTheDocument();
  });

  it('renders child count badge', () => {
    render(<GroupNode {...mockProps} />);
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('does not render child count badge when no children', () => {
    const noChildrenData = { ...mockData, childNodeIds: [] };
    render(<GroupNode {...mockProps} data={noChildrenData} />);
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('renders more options button', () => {
    render(<GroupNode {...mockProps} />);
    expect(screen.getByTestId('more-horizontal-icon')).toBeInTheDocument();
  });

  it('applies shadow when selected', () => {
    const { container } = render(<GroupNode {...mockProps} selected={true} />);
    const node = container.querySelector('.shadow-lg');
    expect(node).toBeInTheDocument();
  });

  it('applies smaller shadow when not selected', () => {
    const { container } = render(<GroupNode {...mockProps} selected={false} />);
    const node = container.querySelector('.shadow-sm');
    expect(node).toBeInTheDocument();
  });

  it('applies border with custom color', () => {
    const { container } = render(<GroupNode {...mockProps} />);
    const node = container.firstChild as HTMLElement;
    expect(node.style.borderColor).toMatch(/^(#3b82f6|rgb\(59,\s*130,\s*246\))$/);
  });

  it('has rounded corners', () => {
    const { container } = render(<GroupNode {...mockProps} />);
    const node = container.firstChild as HTMLElement;
    expect(node.classList.contains('rounded-lg')).toBe(true);
  });

  it('has border-2 class', () => {
    const { container } = render(<GroupNode {...mockProps} />);
    const node = container.firstChild as HTMLElement;
    expect(node.classList.contains('border-2')).toBe(true);
  });

  it('has collapsed height when collapsed', () => {
    const collapsedData = { ...mockData, isCollapsed: true };
    const { container } = render(<GroupNode {...mockProps} data={collapsedData} />);
    const node = container.firstChild as HTMLElement;
    expect(node.classList.contains('h-12')).toBe(true);
  });

  it('has full height when not collapsed', () => {
    render(<GroupNode {...mockProps} />);
    const node = screen.getByText('My Group').closest('.border-2');
    expect(node?.classList.contains('h-full')).toBe(true);
  });

  it('renders dropdown menu', () => {
    render(<GroupNode {...mockProps} />);
    expect(screen.getByTestId('dropdown-menu')).toBeInTheDocument();
  });

  it('renders dropdown content', () => {
    render(<GroupNode {...mockProps} />);
    expect(screen.getByTestId('dropdown-content')).toBeInTheDocument();
  });

  it('has Rename option in menu', () => {
    render(<GroupNode {...mockProps} />);
    expect(screen.getByText('Rename')).toBeInTheDocument();
  });

  it('has Expand option when collapsed', () => {
    const collapsedData = { ...mockData, isCollapsed: true };
    render(<GroupNode {...mockProps} data={collapsedData} />);
    expect(screen.getByText('Expand')).toBeInTheDocument();
  });

  it('has Collapse option when not collapsed', () => {
    render(<GroupNode {...mockProps} />);
    expect(screen.getByText('Collapse')).toBeInTheDocument();
  });

  it('has Color section in menu', () => {
    render(<GroupNode {...mockProps} />);
    expect(screen.getByText('Color')).toBeInTheDocument();
  });

  it('has palette icon in color section', () => {
    render(<GroupNode {...mockProps} />);
    expect(screen.getByTestId('palette-icon')).toBeInTheDocument();
  });

  it('has Duplicate option', () => {
    render(<GroupNode {...mockProps} />);
    expect(screen.getByText('Duplicate')).toBeInTheDocument();
  });

  it('has Delete option', () => {
    render(<GroupNode {...mockProps} />);
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  it('has copy icon for duplicate', () => {
    render(<GroupNode {...mockProps} />);
    expect(screen.getByTestId('copy-icon')).toBeInTheDocument();
  });

  it('has trash icon for delete', () => {
    render(<GroupNode {...mockProps} />);
    expect(screen.getByTestId('trash-icon')).toBeInTheDocument();
  });

  it('has edit icon for rename', () => {
    render(<GroupNode {...mockProps} />);
    expect(screen.getByTestId('edit-icon')).toBeInTheDocument();
  });

  it('has multiple dropdown separators', () => {
    render(<GroupNode {...mockProps} />);
    const separators = screen.getAllByTestId('dropdown-separator');
    expect(separators.length).toBeGreaterThan(0);
  });

  it('renders empty state when no children', () => {
    const noChildrenData = { ...mockData, childNodeIds: [] };
    render(<GroupNode {...mockProps} data={noChildrenData} />);
    expect(screen.getByText('Drag nodes here to group them')).toBeInTheDocument();
  });

  it('does not render empty state when has children', () => {
    render(<GroupNode {...mockProps} />);
    expect(screen.queryByText('Drag nodes here to group them')).not.toBeInTheDocument();
  });
});

describe('GroupNode interactions', () => {
  it('enters edit mode on double click', () => {
    render(<GroupNode {...mockProps} />);
    const label = screen.getByText('My Group');
    fireEvent.doubleClick(label);
    expect(screen.getByTestId('input')).toBeInTheDocument();
  });

  it('can toggle collapse state', () => {
    render(<GroupNode {...mockProps} />);
    const buttons = screen.getAllByTestId('button');
    const collapseButton = buttons[0]; // First button is the collapse toggle
    fireEvent.click(collapseButton);
    // In a real scenario, this would update the state
  });

  it('renders input field when editing', () => {
    render(<GroupNode {...mockProps} />);
    const label = screen.getByText('My Group');
    fireEvent.doubleClick(label);
    const input = screen.getByTestId('input') as HTMLInputElement;
    expect(input.value).toBe('My Group');
  });

  it('shows check button when editing', () => {
    render(<GroupNode {...mockProps} />);
    const label = screen.getByText('My Group');
    fireEvent.doubleClick(label);
    expect(screen.getByTestId('check-icon')).toBeInTheDocument();
  });

  it('shows x button when editing', () => {
    render(<GroupNode {...mockProps} />);
    const label = screen.getByText('My Group');
    fireEvent.doubleClick(label);
    expect(screen.getByTestId('x-icon')).toBeInTheDocument();
  });

  it('handles Enter key in edit mode', () => {
    render(<GroupNode {...mockProps} />);
    const label = screen.getByText('My Group');
    fireEvent.doubleClick(label);
    const input = screen.getByTestId('input');
    fireEvent.keyDown(input, { key: 'Enter' });
    // In a real scenario, this would save the label
  });

  it('handles Escape key in edit mode', () => {
    render(<GroupNode {...mockProps} />);
    const label = screen.getByText('My Group');
    fireEvent.doubleClick(label);
    const input = screen.getByTestId('input');
    fireEvent.keyDown(input, { key: 'Escape' });
    // In a real scenario, this would cancel editing
  });
});

describe('GroupNode with different colors', () => {
  it('handles blue color', () => {
    const blueData = { ...mockData, color: '#3b82f6' };
    const { container } = render(<GroupNode {...mockProps} data={blueData} />);
    const node = container.firstChild as HTMLElement;
    expect(node.style.borderColor).toMatch(/^(#3b82f6|rgb\(59,\s*130,\s*246\))$/);
  });

  it('handles purple color', () => {
    const purpleData = { ...mockData, color: '#8b5cf6' };
    const { container } = render(<GroupNode {...mockProps} data={purpleData} />);
    const node = container.firstChild as HTMLElement;
    expect(node.style.borderColor).toMatch(/^(#8b5cf6|rgb\(139,\s*92,\s*246\))$/);
  });

  it('handles green color', () => {
    const greenData = { ...mockData, color: '#22c55e' };
    const { container } = render(<GroupNode {...mockProps} data={greenData} />);
    const node = container.firstChild as HTMLElement;
    expect(node.style.borderColor).toMatch(/^(#22c55e|rgb\(34,\s*197,\s*94\))$/);
  });
});

describe('GroupNode edge cases', () => {
  it('handles missing color gracefully', () => {
    const noColorData = { ...mockData, color: '' };
    const { container } = render(<GroupNode {...mockProps} data={noColorData} />);
    const node = container.firstChild as HTMLElement;
    expect(node.style.borderColor).toMatch(/^(#6b7280|rgb\(107,\s*114,\s*128\))$/); // Default gray
  });

  it('handles undefined childNodeIds', () => {
    const noChildrenData = { ...mockData, childNodeIds: undefined as unknown as string[] };
    render(<GroupNode {...mockProps} data={noChildrenData} />);
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('handles empty label', () => {
    const emptyLabelData = { ...mockData, label: '' };
    const { container } = render(<GroupNode {...mockProps} data={emptyLabelData} />);
    // Empty label renders as empty div, so we check the container exists
    expect(container.querySelector('.truncate')).toBeInTheDocument();
  });

  it('handles very long label', () => {
    const longLabel = 'A'.repeat(100);
    const longLabelData = { ...mockData, label: longLabel };
    render(<GroupNode {...mockProps} data={longLabelData} />);
    expect(screen.getByText(longLabel)).toBeInTheDocument();
  });

  it('handles custom minWidth', () => {
    const customWidthData = { ...mockData, minWidth: 300 };
    const { container } = render(<GroupNode {...mockProps} data={customWidthData} />);
    const node = container.firstChild as HTMLElement;
    expect(node.style.minWidth).toBe('300px');
  });

  it('handles custom minHeight', () => {
    const customHeightData = { ...mockData, minHeight: 200 };
    const { container } = render(<GroupNode {...mockProps} data={customHeightData} />);
    const node = container.firstChild as HTMLElement;
    expect(node.style.minHeight).toBe('200px');
  });
});

describe('GroupNode with many children', () => {
  it('handles many child nodes', () => {
    const manyChildrenData = {
      ...mockData,
      childNodeIds: Array.from({ length: 50 }, (_, i) => `node-${i}`),
    };
    render(<GroupNode {...mockProps} data={manyChildrenData} />);
    expect(screen.getByText('50')).toBeInTheDocument();
  });

  it('handles single child node', () => {
    const singleChildData = { ...mockData, childNodeIds: ['node-1'] };
    render(<GroupNode {...mockProps} data={singleChildData} />);
    expect(screen.getByText('1')).toBeInTheDocument();
  });
});

describe('GroupNode header styling', () => {
  it('has colored header background', () => {
    const { container } = render(<GroupNode {...mockProps} />);
    const header = container.querySelector('.px-3') as HTMLElement;
    // Browser converts hex with alpha to rgba
    expect(header.style.backgroundColor).toMatch(/^(#3b82f615|rgba\(59,\s*130,\s*246,\s*0\.0\d+\))$/);
  });

  it('header has rounded top corners', () => {
    const { container } = render(<GroupNode {...mockProps} />);
    const header = container.querySelector('.rounded-t-md');
    expect(header).toBeInTheDocument();
  });

  it('header has proper padding', () => {
    const { container } = render(<GroupNode {...mockProps} />);
    const header = container.querySelector('.px-3.py-2');
    expect(header).toBeInTheDocument();
  });
});
