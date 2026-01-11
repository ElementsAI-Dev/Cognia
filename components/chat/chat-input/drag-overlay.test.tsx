/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { DragOverlay } from './drag-overlay';

describe('DragOverlay', () => {
  it('renders when isDragging is true', () => {
    render(<DragOverlay isDragging={true} label="Drop files here" />);
    
    expect(screen.getByText('Drop files here')).toBeInTheDocument();
  });

  it('does not render when isDragging is false', () => {
    const { container } = render(<DragOverlay isDragging={false} label="Drop files here" />);
    
    expect(container.firstChild).toBeNull();
  });

  it('displays the label text', () => {
    render(<DragOverlay isDragging={true} label="Custom label" />);
    
    expect(screen.getByText('Custom label')).toBeInTheDocument();
  });
});
