/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Suggestions, Suggestion } from './suggestion';

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string; size?: string }) => (
    <button onClick={onClick} className={className} {...props}>{children}</button>
  ),
}));

jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className} data-testid="scroll-area">{children}</div>
  ),
  ScrollBar: () => null,
}));

describe('Suggestions', () => {
  it('renders without crashing', () => {
    render(<Suggestions>Test content</Suggestions>);
    expect(screen.getByTestId('scroll-area')).toBeInTheDocument();
  });

  it('renders children', () => {
    render(
      <Suggestions>
        <span>Suggestion 1</span>
        <span>Suggestion 2</span>
      </Suggestions>
    );
    expect(screen.getByText('Suggestion 1')).toBeInTheDocument();
    expect(screen.getByText('Suggestion 2')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <Suggestions className="custom-class">Content</Suggestions>
    );
    expect(container.querySelector('.custom-class')).toBeInTheDocument();
  });
});

describe('Suggestion', () => {
  it('renders without crashing', () => {
    render(<Suggestion suggestion="Test suggestion" />);
    expect(screen.getByText('Test suggestion')).toBeInTheDocument();
  });

  it('displays suggestion text', () => {
    render(<Suggestion suggestion="Click me" />);
    expect(screen.getByRole('button')).toHaveTextContent('Click me');
  });

  it('calls onClick with suggestion when clicked', () => {
    const handleClick = jest.fn();
    render(<Suggestion suggestion="Test" onClick={handleClick} />);
    
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledWith('Test');
  });

  it('renders custom children instead of suggestion', () => {
    render(
      <Suggestion suggestion="hidden">
        <span>Custom content</span>
      </Suggestion>
    );
    expect(screen.getByText('Custom content')).toBeInTheDocument();
    expect(screen.queryByText('hidden')).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<Suggestion suggestion="Test" className="custom-class" />);
    expect(screen.getByRole('button')).toHaveClass('custom-class');
  });

  it('handles missing onClick gracefully', () => {
    render(<Suggestion suggestion="Test" />);
    expect(() => fireEvent.click(screen.getByRole('button'))).not.toThrow();
  });
});
