/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { SortableElement } from './sortable-element';

// Mock @dnd-kit/sortable and utilities
const mockUseSortable = jest.fn();

jest.mock('@dnd-kit/sortable', () => ({
  useSortable: (config: unknown) => mockUseSortable(config),
}));

jest.mock('@dnd-kit/utilities', () => ({
  CSS: {
    Transform: {
      toString: (transform: { x: number; y: number } | null) =>
        transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    },
  },
}));

describe('SortableElement', () => {
  const defaultProps = {
    id: 'sort-1',
    elementId: 'el-1',
    children: <span>Sortable item</span>,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSortable.mockReturnValue({
      attributes: { 'aria-describedby': 'sortable-desc' },
      listeners: { onMouseDown: jest.fn() },
      setNodeRef: jest.fn(),
      transform: null,
      transition: undefined,
      isDragging: false,
      isOver: false,
      active: null,
    });
  });

  it('should render children', () => {
    render(<SortableElement {...defaultProps} />);
    expect(screen.getByText('Sortable item')).toBeInTheDocument();
  });

  it('should call useSortable with correct config', () => {
    render(<SortableElement {...defaultProps} />);
    
    expect(mockUseSortable).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'sort-1',
        data: expect.objectContaining({
          id: 'sort-1',
          type: 'element',
          elementId: 'el-1',
        }),
        disabled: false,
      })
    );
  });

  it('should pass disabled prop to useSortable', () => {
    render(<SortableElement {...defaultProps} disabled={true} />);
    
    expect(mockUseSortable).toHaveBeenCalledWith(
      expect.objectContaining({
        disabled: true,
      })
    );
  });

  it('should apply opacity when dragging', () => {
    mockUseSortable.mockReturnValue({
      attributes: {},
      listeners: {},
      setNodeRef: jest.fn(),
      transform: null,
      transition: undefined,
      isDragging: true,
      isOver: false,
      active: null,
    });

    const { container } = render(<SortableElement {...defaultProps} />);
    expect(container.firstChild).toHaveClass('opacity-50');
    expect(container.firstChild).toHaveClass('z-50');
  });

  it('should apply ring styles when receiving component drop', () => {
    mockUseSortable.mockReturnValue({
      attributes: {},
      listeners: {},
      setNodeRef: jest.fn(),
      transform: null,
      transition: undefined,
      isDragging: false,
      isOver: true,
      active: {
        data: {
          current: { type: 'component' },
        },
      },
    });

    const { container } = render(<SortableElement {...defaultProps} />);
    expect(container.firstChild).toHaveClass('ring-2');
    expect(container.firstChild).toHaveClass('ring-primary');
  });

  it('should not apply ring styles when not receiving component drop', () => {
    mockUseSortable.mockReturnValue({
      attributes: {},
      listeners: {},
      setNodeRef: jest.fn(),
      transform: null,
      transition: undefined,
      isDragging: false,
      isOver: true,
      active: {
        data: {
          current: { type: 'element' },
        },
      },
    });

    const { container } = render(<SortableElement {...defaultProps} />);
    expect(container.firstChild).not.toHaveClass('ring-2');
  });
});
