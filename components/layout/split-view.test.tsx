'use client';

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SplitView } from './split-view';

describe('SplitView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  it('renders primary content', () => {
    render(
      <SplitView primary={<div>Primary Content</div>} />
    );
    expect(screen.getByText('Primary Content')).toBeInTheDocument();
  });

  it('renders secondary content when provided', () => {
    render(
      <SplitView
        primary={<div>Primary</div>}
        secondary={<div>Secondary</div>}
      />
    );
    expect(screen.getByText('Secondary')).toBeInTheDocument();
  });

  it('renders layout toggle when showLayoutToggle and secondary', () => {
    render(
      <SplitView
        primary={<div>Primary</div>}
        secondary={<div>Secondary</div>}
        showLayoutToggle
      />
    );
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('does not show layout toggle without secondary', () => {
    const { container } = render(
      <SplitView
        primary={<div>Primary</div>}
        showLayoutToggle
      />
    );
    expect(container.querySelector('[data-radix-dropdown-menu-trigger]')).not.toBeInTheDocument();
  });

  it('applies horizontal direction by default', () => {
    const { container } = render(
      <SplitView
        primary={<div>Primary</div>}
        secondary={<div>Secondary</div>}
      />
    );
    expect(container.firstChild).toHaveClass('flex-row');
  });

  it('applies vertical direction', () => {
    const { container } = render(
      <SplitView
        primary={<div>Primary</div>}
        secondary={<div>Secondary</div>}
        direction="vertical"
      />
    );
    expect(container.firstChild).toHaveClass('flex-col');
  });

  it('applies custom className', () => {
    const { container } = render(
      <SplitView
        primary={<div>Primary</div>}
        className="custom-class"
      />
    );
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('opens layout menu on button click', () => {
    render(
      <SplitView
        primary={<div>Primary</div>}
        secondary={<div>Secondary</div>}
        showLayoutToggle
      />
    );
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByText('Single View')).toBeInTheDocument();
    expect(screen.getByText('Split Equal')).toBeInTheDocument();
  });

  it('calls onLayoutChange when layout changes', () => {
    const onLayoutChange = jest.fn();
    render(
      <SplitView
        primary={<div>Primary</div>}
        secondary={<div>Secondary</div>}
        showLayoutToggle
        onLayoutChange={onLayoutChange}
      />
    );
    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getByText('Single View'));
    expect(onLayoutChange).toHaveBeenCalledWith('single');
  });
});
