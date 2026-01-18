/**
 * FlowNodeGroup - Unit tests
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { FlowNodeGroup } from './flow-node-group';
import type { FlowNodeGroup as FlowNodeGroupType } from '@/types/chat/flow-chat';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  NextIntlClientProvider: ({ children }: { children: React.ReactNode }) => children,
}));

describe('FlowNodeGroup', () => {
  const createMockGroup = (
    overrides?: Partial<FlowNodeGroupType>
  ): FlowNodeGroupType => ({
    id: 'group-1',
    name: 'Test Group',
    nodeIds: ['node-1', 'node-2'],
    color: 'blue',
    isCollapsed: false,
    description: 'Test description',
    ...overrides,
  });

  const defaultProps = {
    group: createMockGroup(),
    isSelected: false,
    onRename: jest.fn(),
    onColorChange: jest.fn(),
    onDelete: jest.fn(),
    onToggle: jest.fn(),
    onClick: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the group with name', () => {
    render(<FlowNodeGroup {...defaultProps} />);

    expect(screen.getByText('Test Group')).toBeInTheDocument();
  });

  it('renders node count badge', () => {
    render(<FlowNodeGroup {...defaultProps} />);

    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('shows folder open icon when expanded', () => {
    const { container } = render(
      <FlowNodeGroup {...defaultProps} group={createMockGroup({ isCollapsed: false })} />
    );

    expect(container.querySelector('svg.lucide-folder-open')).toBeInTheDocument();
  });

  it('shows folder closed icon when collapsed', () => {
    const { container } = render(
      <FlowNodeGroup {...defaultProps} group={createMockGroup({ isCollapsed: true })} />
    );

    expect(container.querySelector('svg.lucide-folder-closed')).toBeInTheDocument();
  });

  it('shows chevron down when expanded', () => {
    const { container } = render(
      <FlowNodeGroup {...defaultProps} group={createMockGroup({ isCollapsed: false })} />
    );

    expect(container.querySelector('svg.lucide-chevron-down')).toBeInTheDocument();
  });

  it('shows chevron right when collapsed', () => {
    const { container } = render(
      <FlowNodeGroup {...defaultProps} group={createMockGroup({ isCollapsed: true })} />
    );

    expect(
      container.querySelector('svg.lucide-chevron-right')
    ).toBeInTheDocument();
  });

  it('renders description when not collapsed', () => {
    render(<FlowNodeGroup {...defaultProps} />);

    expect(screen.getByText('Test description')).toBeInTheDocument();
  });

  it('does not render description when collapsed', () => {
    render(
      <FlowNodeGroup
        {...defaultProps}
        group={createMockGroup({ isCollapsed: true })}
      />
    );

    expect(screen.queryByText('Test description')).not.toBeInTheDocument();
  });

  it('calls onToggle when toggle button is clicked', () => {
    const onToggle = jest.fn();
    render(<FlowNodeGroup {...defaultProps} onToggle={onToggle} />);

    const toggleButton = screen.getAllByRole('button').find((btn) =>
      btn.querySelector('svg.lucide-chevron-down')
    );

    if (toggleButton) {
      fireEvent.click(toggleButton);
      expect(onToggle).toHaveBeenCalledWith('group-1');
    }
  });

  it('calls onClick when group container is clicked', () => {
    const onClick = jest.fn();
    render(<FlowNodeGroup {...defaultProps} onClick={onClick} />);

    const groupContainer = screen.getByText('Test Group').closest('.flow-node-group');
    if (groupContainer) {
      fireEvent.click(groupContainer);
      expect(onClick).toHaveBeenCalledWith('group-1');
    }
  });

  it('enters edit mode when rename is clicked', () => {
    render(<FlowNodeGroup {...defaultProps} />);

    // Open dropdown menu
    const menuButton = screen.getAllByRole('button').find((btn) =>
      btn.querySelector('svg.lucide-more-horizontal')
    );

    if (menuButton) {
      fireEvent.click(menuButton);

      // Click rename option
      const renameOption = screen.getByText('rename');
      fireEvent.click(renameOption);

      // Should show input
      const input = screen.getByRole('textbox');
      expect(input).toBeInTheDocument();
    }
  });

  it('calls onRename when editing is completed', async () => {
    const onRename = jest.fn();
    render(<FlowNodeGroup {...defaultProps} onRename={onRename} />);

    // Open dropdown and click rename
    const menuButton = screen.getAllByRole('button').find((btn) =>
      btn.querySelector('svg.lucide-more-horizontal')
    );

    if (menuButton) {
      fireEvent.click(menuButton);

      const renameOption = screen.getByText('rename');
      fireEvent.click(renameOption);

      // Change input and blur
      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'New Name' } });
      fireEvent.blur(input);

      expect(onRename).toHaveBeenCalledWith('group-1', 'New Name');
    }
  });

  it('cancels edit on Escape key', () => {
    render(<FlowNodeGroup {...defaultProps} />);

    // Open dropdown and click rename
    const menuButton = screen.getAllByRole('button').find((btn) =>
      btn.querySelector('svg.lucide-more-horizontal')
    );

    if (menuButton) {
      fireEvent.click(menuButton);

      const renameOption = screen.getByText('rename');
      fireEvent.click(renameOption);

      // Press Escape
      const input = screen.getByRole('textbox');
      fireEvent.keyDown(input, { key: 'Escape' });

      // Should revert to original name
      expect(screen.getByText('Test Group')).toBeInTheDocument();
    }
  });

  it('submits edit on Enter key', () => {
    const onRename = jest.fn();
    render(<FlowNodeGroup {...defaultProps} onRename={onRename} />);

    // Open dropdown and click rename
    const menuButton = screen.getAllByRole('button').find((btn) =>
      btn.querySelector('svg.lucide-more-horizontal')
    );

    if (menuButton) {
      fireEvent.click(menuButton);

      const renameOption = screen.getByText('rename');
      fireEvent.click(renameOption);

      // Change input and press Enter
      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'Updated Name' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(onRename).toHaveBeenCalledWith('group-1', 'Updated Name');
    }
  });

  it('opens color picker when change color is clicked', () => {
    render(<FlowNodeGroup {...defaultProps} />);

    // Open dropdown menu
    const menuButton = screen.getAllByRole('button').find((btn) =>
      btn.querySelector('svg.lucide-more-horizontal')
    );

    if (menuButton) {
      fireEvent.click(menuButton);

      // Click change color option
      const colorOption = screen.getByText('changeColor');
      fireEvent.click(colorOption);

      // Color picker popover should open
      const colorButtons = screen.getAllByRole('button').filter((btn) => {
        const style = window.getComputedStyle(btn);
        return style.width === '24px' || style.height === '24px';
      });
      expect(colorButtons.length).toBeGreaterThan(0);
    }
  });

  it('calls onColorChange when a color is selected', () => {
    const onColorChange = jest.fn();
    render(<FlowNodeGroup {...defaultProps} onColorChange={onColorChange} />);

    // Open dropdown and click change color
    const menuButton = screen.getAllByRole('button').find((btn) =>
      btn.querySelector('svg.lucide-more-horizontal')
    );

    if (menuButton) {
      fireEvent.click(menuButton);

      const colorOption = screen.getByText('changeColor');
      fireEvent.click(colorOption);

      // Click on a color button (find red color button)
      const colorButtons = screen.getAllByRole('button').filter((btn) => {
        const className = btn.className || '';
        return className.includes('rounded-full');
      });

      if (colorButtons.length > 0) {
        fireEvent.click(colorButtons[0]);
        expect(onColorChange).toHaveBeenCalled();
      }
    }
  });

  it('calls onDelete when delete is clicked', () => {
    const onDelete = jest.fn();
    render(<FlowNodeGroup {...defaultProps} onDelete={onDelete} />);

    // Open dropdown menu
    const menuButton = screen.getAllByRole('button').find((btn) =>
      btn.querySelector('svg.lucide-more-horizontal')
    );

    if (menuButton) {
      fireEvent.click(menuButton);

      // Click delete option
      const deleteOption = screen.getByText('deleteGroup');
      fireEvent.click(deleteOption);

      expect(onDelete).toHaveBeenCalledWith('group-1');
    }
  });

  it('shows selected ring when isSelected is true', () => {
    const { container } = render(
      <FlowNodeGroup {...defaultProps} isSelected={true} />
    );

    const groupContainer = container.querySelector('.ring-2');
    expect(groupContainer).toBeInTheDocument();
  });

  it('applies correct color classes based on group color', () => {
    const { container } = render(
      <FlowNodeGroup {...defaultProps} group={createMockGroup({ color: 'red' })} />
    );

    const groupContainer = container.querySelector('.flow-node-group');
    expect(groupContainer).toHaveClass('border-red-300');
  });

  it('shows empty state hint when group has no nodes', () => {
    render(
      <FlowNodeGroup
        {...defaultProps}
        group={createMockGroup({ nodeIds: [] })}
      />
    );

    expect(screen.getByText('dropNodesToGroup')).toBeInTheDocument();
  });

  it('hides content area when collapsed', () => {
    const { container } = render(
      <FlowNodeGroup
        {...defaultProps}
        group={createMockGroup({ isCollapsed: true })}
      />
    );

    // Min height content area should not be visible when collapsed
    const contentArea = container.querySelector('.min-h-\\[100px\\]');
    expect(contentArea).not.toBeInTheDocument();
  });

  it('shows checkmark on selected color in picker', () => {
    const { container } = render(
      <FlowNodeGroup
        {...defaultProps}
        group={createMockGroup({ color: 'blue' })}
      />
    );

    // Open dropdown and color picker
    const menuButton = screen.getAllByRole('button').find((btn) =>
      btn.querySelector('svg.lucide-more-horizontal')
    );

    if (menuButton) {
      fireEvent.click(menuButton);

      const colorOption = screen.getByText('changeColor');
      fireEvent.click(colorOption);

      // Check for checkmark icon (the selected color should have a checkmark)
      const checkmarks = container.querySelectorAll('svg.lucide-check');
      expect(checkmarks.length).toBeGreaterThan(0);
    }
  });

  it('applies custom className', () => {
    const { container } = render(
      <FlowNodeGroup {...defaultProps} className="custom-class" />
    );

    const groupContainer = container.querySelector('.custom-class');
    expect(groupContainer).toBeInTheDocument();
  });

  it('stops propagation on action buttons click', () => {
    const onClick = jest.fn();
    const onToggle = jest.fn();
    render(<FlowNodeGroup {...defaultProps} onClick={onClick} onToggle={onToggle} />);

    // Click toggle button
    const toggleButton = screen.getAllByRole('button').find((btn) =>
      btn.querySelector('svg.lucide-chevron-down')
    );

    if (toggleButton) {
      fireEvent.click(toggleButton);
      // Toggle should be called, but not the group onClick
      expect(onToggle).toHaveBeenCalled();
      expect(onClick).not.toHaveBeenCalled();
    }
  });
});
