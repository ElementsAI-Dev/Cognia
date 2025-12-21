/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { Task, TaskTrigger, TaskContent, TaskItem, TaskItemFile } from './task';

// Mock UI components
jest.mock('@/components/ui/collapsible', () => ({
  Collapsible: ({ children, className, defaultOpen }: { children: React.ReactNode; className?: string; defaultOpen?: boolean }) => (
    <div data-testid="collapsible" className={className} data-default-open={defaultOpen}>{children}</div>
  ),
  CollapsibleTrigger: ({ children, className, asChild }: { children: React.ReactNode; className?: string; asChild?: boolean }) => (
    <div data-testid="collapsible-trigger" className={className} data-as-child={asChild}>{children}</div>
  ),
  CollapsibleContent: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="collapsible-content" className={className}>{children}</div>
  ),
}));

describe('Task', () => {
  it('renders without crashing', () => {
    render(<Task>Task content</Task>);
    expect(screen.getByTestId('collapsible')).toBeInTheDocument();
  });

  it('is open by default', () => {
    render(<Task>Content</Task>);
    expect(screen.getByTestId('collapsible')).toHaveAttribute('data-default-open', 'true');
  });

  it('can be closed by default', () => {
    render(<Task defaultOpen={false}>Content</Task>);
    expect(screen.getByTestId('collapsible')).toHaveAttribute('data-default-open', 'false');
  });

  it('applies custom className', () => {
    render(<Task className="custom-class">Content</Task>);
    expect(screen.getByTestId('collapsible')).toHaveClass('custom-class');
  });
});

describe('TaskTrigger', () => {
  it('renders without crashing', () => {
    render(<TaskTrigger title="Search task" />);
    expect(screen.getByTestId('collapsible-trigger')).toBeInTheDocument();
  });

  it('displays title', () => {
    render(<TaskTrigger title="Searching documents" />);
    expect(screen.getByText('Searching documents')).toBeInTheDocument();
  });

  it('renders custom children instead of default', () => {
    render(<TaskTrigger title="Hidden"><span>Custom trigger</span></TaskTrigger>);
    expect(screen.getByText('Custom trigger')).toBeInTheDocument();
    expect(screen.queryByText('Hidden')).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<TaskTrigger title="Task" className="custom-class" />);
    expect(screen.getByTestId('collapsible-trigger')).toHaveClass('custom-class');
  });
});

describe('TaskContent', () => {
  it('renders without crashing', () => {
    render(<TaskContent>Content</TaskContent>);
    expect(screen.getByTestId('collapsible-content')).toBeInTheDocument();
  });

  it('renders children', () => {
    render(<TaskContent><span>Task items</span></TaskContent>);
    expect(screen.getByText('Task items')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<TaskContent className="custom-class">Content</TaskContent>);
    expect(screen.getByTestId('collapsible-content')).toHaveClass('custom-class');
  });
});

describe('TaskItem', () => {
  it('renders without crashing', () => {
    render(<TaskItem>Item content</TaskItem>);
    expect(screen.getByText('Item content')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<TaskItem className="custom-class">Content</TaskItem>);
    expect(container.firstChild).toHaveClass('custom-class');
  });
});

describe('TaskItemFile', () => {
  it('renders without crashing', () => {
    render(<TaskItemFile>file.txt</TaskItemFile>);
    expect(screen.getByText('file.txt')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<TaskItemFile className="custom-class">file.txt</TaskItemFile>);
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('has file styling', () => {
    const { container } = render(<TaskItemFile>file.txt</TaskItemFile>);
    expect(container.firstChild).toHaveClass('rounded-md');
    expect(container.firstChild).toHaveClass('border');
  });
});
