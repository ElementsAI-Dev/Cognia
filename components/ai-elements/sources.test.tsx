/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { Sources, SourcesTrigger, SourcesContent, Source } from './sources';

// Mock UI components
jest.mock('@/components/ui/collapsible', () => ({
  Collapsible: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="collapsible" className={className}>{children}</div>
  ),
  CollapsibleTrigger: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <button data-testid="collapsible-trigger" className={className}>{children}</button>
  ),
  CollapsibleContent: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="collapsible-content" className={className}>{children}</div>
  ),
}));

describe('Sources', () => {
  it('renders without crashing', () => {
    render(<Sources>Content</Sources>);
    expect(screen.getByTestId('collapsible')).toBeInTheDocument();
  });

  it('renders children', () => {
    render(<Sources><span>Source list</span></Sources>);
    expect(screen.getByText('Source list')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<Sources className="custom-class">Content</Sources>);
    expect(screen.getByTestId('collapsible')).toHaveClass('custom-class');
  });
});

describe('SourcesTrigger', () => {
  it('renders without crashing', () => {
    render(<SourcesTrigger count={5} />);
    expect(screen.getByTestId('collapsible-trigger')).toBeInTheDocument();
  });

  it('displays source count', () => {
    render(<SourcesTrigger count={3} />);
    expect(screen.getByText('Used 3 sources')).toBeInTheDocument();
  });

  it('renders custom children', () => {
    render(<SourcesTrigger count={5}><span>Custom trigger</span></SourcesTrigger>);
    expect(screen.getByText('Custom trigger')).toBeInTheDocument();
    expect(screen.queryByText('Used 5 sources')).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<SourcesTrigger count={2} className="custom-class" />);
    expect(screen.getByTestId('collapsible-trigger')).toHaveClass('custom-class');
  });
});

describe('SourcesContent', () => {
  it('renders without crashing', () => {
    render(<SourcesContent>Content</SourcesContent>);
    expect(screen.getByTestId('collapsible-content')).toBeInTheDocument();
  });

  it('renders children', () => {
    render(<SourcesContent><span>Source items</span></SourcesContent>);
    expect(screen.getByText('Source items')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<SourcesContent className="custom-class">Content</SourcesContent>);
    expect(screen.getByTestId('collapsible-content')).toHaveClass('custom-class');
  });
});

describe('Source', () => {
  it('renders without crashing', () => {
    render(<Source href="https://example.com" title="Example" />);
    expect(screen.getByRole('link')).toBeInTheDocument();
  });

  it('displays title', () => {
    render(<Source href="https://example.com" title="Test Source" />);
    expect(screen.getByText('Test Source')).toBeInTheDocument();
  });

  it('has correct href', () => {
    render(<Source href="https://example.com" title="Example" />);
    expect(screen.getByRole('link')).toHaveAttribute('href', 'https://example.com');
  });

  it('opens in new tab', () => {
    render(<Source href="https://example.com" title="Example" />);
    expect(screen.getByRole('link')).toHaveAttribute('target', '_blank');
    expect(screen.getByRole('link')).toHaveAttribute('rel', 'noreferrer');
  });

  it('renders custom children instead of default content', () => {
    render(
      <Source href="https://example.com" title="Hidden">
        <span>Custom content</span>
      </Source>
    );
    expect(screen.getByText('Custom content')).toBeInTheDocument();
    expect(screen.queryByText('Hidden')).not.toBeInTheDocument();
  });
});
