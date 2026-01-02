/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { DroppableZone } from './droppable-zone';

// Mock @dnd-kit/core
const mockUseDroppable = jest.fn();

jest.mock('@dnd-kit/core', () => ({
  useDroppable: (config: unknown) => mockUseDroppable(config),
}));

describe('DroppableZone', () => {
  const defaultProps = {
    id: 'drop-1',
    children: <span>Drop here</span>,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDroppable.mockReturnValue({
      isOver: false,
      setNodeRef: jest.fn(),
      active: null,
    });
  });

  it('should render children', () => {
    render(<DroppableZone {...defaultProps} />);
    expect(screen.getByText('Drop here')).toBeInTheDocument();
  });

  it('should call useDroppable with correct config', () => {
    render(<DroppableZone {...defaultProps} elementId="el-1" />);
    
    expect(mockUseDroppable).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'drop-1',
        data: expect.objectContaining({
          type: 'drop-zone',
          elementId: 'el-1',
          accepts: ['component', 'element'],
        }),
      })
    );
  });

  it('should use default accepts when not provided', () => {
    render(<DroppableZone {...defaultProps} />);
    
    expect(mockUseDroppable).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          accepts: ['component', 'element'],
        }),
      })
    );
  });

  it('should use custom accepts when provided', () => {
    render(<DroppableZone {...defaultProps} accepts={['component']} />);
    
    expect(mockUseDroppable).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          accepts: ['component'],
        }),
      })
    );
  });

  it('should apply custom className', () => {
    const { container } = render(
      <DroppableZone {...defaultProps} className="custom-class" />
    );
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('should apply highlight styles when active item is over and can drop', () => {
    mockUseDroppable.mockReturnValue({
      isOver: true,
      setNodeRef: jest.fn(),
      active: {
        data: {
          current: { type: 'component' },
        },
      },
    });

    const { container } = render(<DroppableZone {...defaultProps} />);
    expect(container.firstChild).toHaveClass('ring-2');
    expect(container.firstChild).toHaveClass('ring-inset');
  });

  it('should not apply highlight when item type is not accepted', () => {
    mockUseDroppable.mockReturnValue({
      isOver: true,
      setNodeRef: jest.fn(),
      active: {
        data: {
          current: { type: 'other' },
        },
      },
    });

    const { container } = render(
      <DroppableZone {...defaultProps} accepts={['component']} />
    );
    expect(container.firstChild).not.toHaveClass('ring-2');
  });
});
