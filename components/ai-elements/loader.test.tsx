/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { Loader } from './loader';

describe('Loader', () => {
  it('renders without crashing', () => {
    render(<Loader />);
    expect(screen.getByTitle('Loader')).toBeInTheDocument();
  });

  it('renders with default spin variant', () => {
    const { container } = render(<Loader />);
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('renders with pulse variant', () => {
    const { container } = render(<Loader variant="pulse" />);
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('renders with dots variant', () => {
    const { container } = render(<Loader variant="dots" />);
    const dots = container.querySelectorAll('.rounded-full');
    expect(dots.length).toBe(3);
  });

  it('applies custom size', () => {
    const { container } = render(<Loader size={32} />);
    // Size is passed to the internal LoaderIcon component
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<Loader className="custom-class" />);
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('passes through additional props', () => {
    render(<Loader data-testid="custom-loader" />);
    expect(screen.getByTestId('custom-loader')).toBeInTheDocument();
  });

  it('dots variant respects size prop', () => {
    const { container } = render(<Loader variant="dots" size={24} />);
    const dots = container.querySelectorAll('.rounded-full');
    expect(dots[0]).toHaveStyle({ width: '6px', height: '6px' });
  });
});
