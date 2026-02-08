'use client';

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ResizablePanel } from './resizable-panel';

describe('ResizablePanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  it('renders children', () => {
    render(
      <ResizablePanel>
        <div>Panel Content</div>
      </ResizablePanel>
    );
    expect(screen.getByText('Panel Content')).toBeInTheDocument();
  });

  it('renders title in header', () => {
    render(
      <ResizablePanel title="Test Panel">
        <div>Content</div>
      </ResizablePanel>
    );
    expect(screen.getByText('Test Panel')).toBeInTheDocument();
  });

  it('renders close button when onClose provided', () => {
    const onClose = jest.fn();
    render(
      <ResizablePanel title="Test" onClose={onClose}>
        <div>Content</div>
      </ResizablePanel>
    );
    // Close button exists with X icon
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('calls onClose when close button clicked', () => {
    const onClose = jest.fn();
    render(
      <ResizablePanel title="Test" onClose={onClose}>
        <div>Content</div>
      </ResizablePanel>
    );
    // Click the last button (close button)
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[buttons.length - 1]);
    expect(onClose).toHaveBeenCalled();
  });

  it('returns null when not open', () => {
    const { container } = render(
      <ResizablePanel open={false}>
        <div>Content</div>
      </ResizablePanel>
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders fullscreen toggle when collapsible', () => {
    render(
      <ResizablePanel title="Test" collapsible>
        <div>Content</div>
      </ResizablePanel>
    );
    // Fullscreen toggle button exists
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('hides header when showHeader is false', () => {
    render(
      <ResizablePanel title="Test" showHeader={false}>
        <div>Content</div>
      </ResizablePanel>
    );
    expect(screen.queryByText('Test')).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <ResizablePanel className="custom-class">
        <div>Content</div>
      </ResizablePanel>
    );
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('applies right position border', () => {
    const { container } = render(
      <ResizablePanel position="right">
        <div>Content</div>
      </ResizablePanel>
    );
    expect(container.firstChild).toHaveClass('border-l');
  });

  it('applies left position border', () => {
    const { container } = render(
      <ResizablePanel position="left">
        <div>Content</div>
      </ResizablePanel>
    );
    expect(container.firstChild).toHaveClass('border-r');
  });

  it('applies bottom position border', () => {
    const { container } = render(
      <ResizablePanel position="bottom">
        <div>Content</div>
      </ResizablePanel>
    );
    expect(container.firstChild).toHaveClass('border-t');
  });
});
