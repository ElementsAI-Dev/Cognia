/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { DraggableComponent } from './draggable-component';

// Mock @dnd-kit/core
const mockUseDraggable = jest.fn();

jest.mock('@dnd-kit/core', () => ({
  useDraggable: (config: unknown) => mockUseDraggable(config),
}));

describe('DraggableComponent', () => {
  const defaultProps = {
    id: 'drag-1',
    componentCode: '<div>Test Component</div>',
    componentName: 'TestComponent',
    children: <span>Drag me</span>,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDraggable.mockReturnValue({
      attributes: { 'aria-describedby': 'draggable-desc' },
      listeners: { onMouseDown: jest.fn() },
      setNodeRef: jest.fn(),
      isDragging: false,
      transform: null,
    });
  });

  it('should render children', () => {
    render(<DraggableComponent {...defaultProps} />);
    expect(screen.getByText('Drag me')).toBeInTheDocument();
  });

  it('should call useDraggable with correct config', () => {
    render(<DraggableComponent {...defaultProps} />);
    
    expect(mockUseDraggable).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'drag-1',
        data: expect.objectContaining({
          id: 'drag-1',
          type: 'component',
          componentCode: '<div>Test Component</div>',
          componentName: 'TestComponent',
        }),
        disabled: false,
      })
    );
  });

  it('should pass disabled prop to useDraggable', () => {
    render(<DraggableComponent {...defaultProps} disabled={true} />);
    
    expect(mockUseDraggable).toHaveBeenCalledWith(
      expect.objectContaining({
        disabled: true,
      })
    );
  });

  it('should apply grab cursor class', () => {
    const { container } = render(<DraggableComponent {...defaultProps} />);
    expect(container.firstChild).toHaveClass('cursor-grab');
  });

  it('should apply opacity when dragging', () => {
    mockUseDraggable.mockReturnValue({
      attributes: {},
      listeners: {},
      setNodeRef: jest.fn(),
      isDragging: true,
      transform: null,
    });

    const { container } = render(<DraggableComponent {...defaultProps} />);
    expect(container.firstChild).toHaveClass('opacity-50');
  });

  it('should apply transform style when transform is provided', () => {
    mockUseDraggable.mockReturnValue({
      attributes: {},
      listeners: {},
      setNodeRef: jest.fn(),
      isDragging: true,
      transform: { x: 100, y: 50 },
    });

    const { container } = render(<DraggableComponent {...defaultProps} />);
    const element = container.firstChild as HTMLElement;
    expect(element.style.transform).toBe('translate3d(100px, 50px, 0)');
  });
});
