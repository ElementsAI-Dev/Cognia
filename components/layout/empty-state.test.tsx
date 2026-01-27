'use client';

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Search, Plus } from 'lucide-react';
import { EmptyState } from './empty-state';

describe('EmptyState', () => {
  it('renders title', () => {
    render(<EmptyState title="No results found" />);
    expect(screen.getByText('No results found')).toBeInTheDocument();
  });

  it('renders description when provided', () => {
    render(
      <EmptyState title="No results" description="Try a different search" />
    );
    expect(screen.getByText('Try a different search')).toBeInTheDocument();
  });

  it('renders icon when provided as LucideIcon', () => {
    const { container } = render(
      <EmptyState title="No results" icon={<Search data-testid="search-icon" />} />
    );
    const icon = container.querySelector('svg');
    expect(icon).toBeInTheDocument();
  });

  it('renders icon when provided as ReactNode', () => {
    render(
      <EmptyState
        title="No results"
        icon={<span data-testid="custom-icon">🔍</span>}
      />
    );
    expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
  });

  it('renders custom action', () => {
    render(
      <EmptyState
        title="No results"
        action={<button>Custom Action</button>}
      />
    );
    expect(screen.getByText('Custom Action')).toBeInTheDocument();
  });

  it('renders actions array', () => {
    const onClick = jest.fn();
    render(
      <EmptyState
        title="No results"
        actions={[
          { label: 'Add New', onClick },
          { label: 'Browse', onClick, variant: 'outline' },
        ]}
      />
    );
    expect(screen.getByText('Add New')).toBeInTheDocument();
    expect(screen.getByText('Browse')).toBeInTheDocument();
  });

  it('calls onClick when action clicked', () => {
    const onClick = jest.fn();
    render(
      <EmptyState
        title="No results"
        actions={[{ label: 'Add New', onClick }]}
      />
    );
    fireEvent.click(screen.getByText('Add New'));
    expect(onClick).toHaveBeenCalled();
  });

  it('renders action with icon', () => {
    const { container } = render(
      <EmptyState
        title="No results"
        actions={[{ label: 'Add', onClick: jest.fn(), icon: Plus }]}
      />
    );
    const icons = container.querySelectorAll('svg');
    expect(icons.length).toBeGreaterThan(0);
  });

  it('applies compact mode', () => {
    const { container } = render(
      <EmptyState title="No results" compact />
    );
    expect(container.firstChild).toHaveClass('py-8');
  });

  it('applies custom className', () => {
    const { container } = render(
      <EmptyState title="No results" className="custom-class" />
    );
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('applies custom icon className', () => {
    const { container } = render(
      <EmptyState title="No results" icon={<Search className="custom-icon" />} iconClassName="custom-icon" />
    );
    const icon = container.querySelector('svg');
    expect(icon).toHaveClass('custom-icon');
  });
});
