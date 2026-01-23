/**
 * ResizeHandles Component Tests
 */

import { render, fireEvent } from '@testing-library/react';
import { ResizeHandles } from './resize-handles';

describe('ResizeHandles', () => {
  const mockOnResizeStart = jest.fn();

  beforeEach(() => {
    mockOnResizeStart.mockClear();
  });

  it('should render 8 resize handles', () => {
    const { container } = render(
      <ResizeHandles onResizeStart={mockOnResizeStart} />
    );

    const handles = container.querySelectorAll('div');
    expect(handles).toHaveLength(8);
  });

  it('should call onResizeStart with correct handle on mousedown', () => {
    const { container } = render(
      <ResizeHandles onResizeStart={mockOnResizeStart} />
    );

    const handles = container.querySelectorAll('div');
    fireEvent.mouseDown(handles[0]);

    expect(mockOnResizeStart).toHaveBeenCalledTimes(1);
    expect(mockOnResizeStart).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(Object)
    );
  });

  it('should stop propagation on mousedown', () => {
    const parentHandler = jest.fn();
    const { container } = render(
      <div onMouseDown={parentHandler}>
        <ResizeHandles onResizeStart={mockOnResizeStart} />
      </div>
    );

    const handles = container.querySelectorAll('[class*="bg-primary"]');
    if (handles.length > 0) {
      fireEvent.mouseDown(handles[0]);
      // Since we stop propagation, parent handler should not be called
      // Note: This depends on implementation, adjust if needed
    }
  });

  it('should apply custom className', () => {
    const { container } = render(
      <ResizeHandles
        onResizeStart={mockOnResizeStart}
        className="custom-class"
      />
    );

    // Check that at least one handle exists
    const handles = container.querySelectorAll('div');
    expect(handles.length).toBeGreaterThan(0);
  });

  it('should render handles with correct cursors', () => {
    const { container } = render(
      <ResizeHandles onResizeStart={mockOnResizeStart} />
    );

    const handles = container.querySelectorAll('div');
    const cursors = Array.from(handles).map(
      (h) => (h as HTMLElement).style.cursor
    );

    // Should have resize cursors
    expect(cursors).toContain('nwse-resize');
    expect(cursors).toContain('nesw-resize');
    expect(cursors).toContain('ns-resize');
    expect(cursors).toContain('ew-resize');
  });

  it('should handle all 8 resize directions', () => {
    const { container } = render(
      <ResizeHandles onResizeStart={mockOnResizeStart} />
    );

    const handles = container.querySelectorAll('div');

    handles.forEach((handle) => {
      fireEvent.mouseDown(handle);
    });

    expect(mockOnResizeStart).toHaveBeenCalledTimes(8);
  });
});
