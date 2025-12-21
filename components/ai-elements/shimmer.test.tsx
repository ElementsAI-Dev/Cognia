/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { Shimmer } from './shimmer';

// Mock framer-motion
jest.mock('motion/react', () => ({
  motion: {
    p: ({ children, className, style, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
      <p className={className} style={style} data-testid="shimmer" {...props}>{children}</p>
    ),
    span: ({ children, className, style, ...props }: React.HTMLAttributes<HTMLSpanElement>) => (
      <span className={className} style={style} data-testid="shimmer" {...props}>{children}</span>
    ),
    div: ({ children, className, style, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div className={className} style={style} data-testid="shimmer" {...props}>{children}</div>
    ),
    h1: ({ children, className, style, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
      <h1 className={className} style={style} data-testid="shimmer" {...props}>{children}</h1>
    ),
    h2: ({ children, className, style, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
      <h2 className={className} style={style} data-testid="shimmer" {...props}>{children}</h2>
    ),
    h3: ({ children, className, style, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
      <h3 className={className} style={style} data-testid="shimmer" {...props}>{children}</h3>
    ),
  },
}));

describe('Shimmer', () => {
  it('renders without crashing', () => {
    render(<Shimmer>Loading text</Shimmer>);
    expect(screen.getByTestId('shimmer')).toBeInTheDocument();
  });

  it('displays children text', () => {
    render(<Shimmer>Loading...</Shimmer>);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders as paragraph by default', () => {
    render(<Shimmer>Text</Shimmer>);
    const element = screen.getByTestId('shimmer');
    expect(element.tagName).toBe('P');
  });

  it('renders as span when specified', () => {
    render(<Shimmer as="span">Text</Shimmer>);
    const element = screen.getByTestId('shimmer');
    expect(element.tagName).toBe('SPAN');
  });

  it('renders as div when specified', () => {
    render(<Shimmer as="div">Text</Shimmer>);
    const element = screen.getByTestId('shimmer');
    expect(element.tagName).toBe('DIV');
  });

  it('renders as heading when specified', () => {
    render(<Shimmer as="h1">Title</Shimmer>);
    const element = screen.getByTestId('shimmer');
    expect(element.tagName).toBe('H1');
  });

  it('applies custom className', () => {
    render(<Shimmer className="custom-class">Text</Shimmer>);
    expect(screen.getByTestId('shimmer')).toHaveClass('custom-class');
  });

  it('applies shimmer styles', () => {
    render(<Shimmer>Text</Shimmer>);
    const element = screen.getByTestId('shimmer');
    expect(element).toHaveClass('bg-clip-text');
    expect(element).toHaveClass('text-transparent');
  });
});
