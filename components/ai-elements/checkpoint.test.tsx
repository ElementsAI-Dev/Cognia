/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { Checkpoint, CheckpointIcon, CheckpointTrigger } from './checkpoint';

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
}));

jest.mock('@/components/ui/separator', () => ({
  Separator: () => <hr data-testid="separator" />,
}));

jest.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip-content">{children}</div>
  ),
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('Checkpoint', () => {
  it('renders without crashing', () => {
    render(<Checkpoint>Checkpoint content</Checkpoint>);
    expect(screen.getByText('Checkpoint content')).toBeInTheDocument();
  });

  it('renders children', () => {
    render(
      <Checkpoint>
        <span>Child 1</span>
        <span>Child 2</span>
      </Checkpoint>
    );
    expect(screen.getByText('Child 1')).toBeInTheDocument();
    expect(screen.getByText('Child 2')).toBeInTheDocument();
  });

  it('renders separator', () => {
    render(<Checkpoint>Content</Checkpoint>);
    expect(screen.getByTestId('separator')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<Checkpoint className="custom-class">Content</Checkpoint>);
    expect(container.firstChild).toHaveClass('custom-class');
  });
});

describe('CheckpointIcon', () => {
  it('renders default bookmark icon', () => {
    const { container } = render(<CheckpointIcon />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('renders custom children instead of icon', () => {
    render(<CheckpointIcon><span>Custom icon</span></CheckpointIcon>);
    expect(screen.getByText('Custom icon')).toBeInTheDocument();
  });

  it('applies custom className to icon', () => {
    const { container } = render(<CheckpointIcon className="custom-icon" />);
    expect(container.querySelector('svg')).toHaveClass('custom-icon');
  });
});

describe('CheckpointTrigger', () => {
  it('renders without crashing', () => {
    render(<CheckpointTrigger>Click me</CheckpointTrigger>);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('displays children', () => {
    render(<CheckpointTrigger>Button text</CheckpointTrigger>);
    expect(screen.getByText('Button text')).toBeInTheDocument();
  });

  it('renders tooltip when tooltip prop is provided', () => {
    render(<CheckpointTrigger tooltip="Helpful tip">Button</CheckpointTrigger>);
    expect(screen.getByTestId('tooltip-content')).toHaveTextContent('Helpful tip');
  });

  it('renders without tooltip when tooltip prop is not provided', () => {
    render(<CheckpointTrigger>Button</CheckpointTrigger>);
    expect(screen.queryByTestId('tooltip-content')).not.toBeInTheDocument();
  });
});
