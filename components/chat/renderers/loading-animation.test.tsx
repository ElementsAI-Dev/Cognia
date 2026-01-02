/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { LoadingAnimation, SkeletonShimmer } from './loading-animation';

// Mock cn
jest.mock('@/lib/utils', () => ({
  cn: (...classes: (string | undefined)[]) => classes.filter(Boolean).join(' '),
}));

describe('LoadingAnimation', () => {
  describe('Default rendering', () => {
    it('renders with default props', () => {
      render(<LoadingAnimation />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('renders with default aria-label "Loading"', () => {
      render(<LoadingAnimation />);
      expect(screen.getByLabelText('Loading')).toBeInTheDocument();
    });

    it('uses ring variant by default', () => {
      const { container } = render(<LoadingAnimation />);
      // Ring variant contains an SVG element
      expect(container.querySelector('svg')).toBeInTheDocument();
    });
  });

  describe('Variant rendering', () => {
    it('renders pulse variant', () => {
      const { container } = render(<LoadingAnimation variant="pulse" />);
      // Pulse variant has nested divs with rounded-full class
      const roundedElements = container.querySelectorAll('.rounded-full');
      expect(roundedElements.length).toBeGreaterThan(0);
    });

    it('renders dots variant', () => {
      const { container } = render(<LoadingAnimation variant="dots" />);
      // Dots variant has 3 bouncing dots
      const dots = container.querySelectorAll('.animate-bounce');
      expect(dots.length).toBe(3);
    });

    it('renders wave variant', () => {
      const { container } = render(<LoadingAnimation variant="wave" />);
      // Wave variant has 5 bars
      const bars = container.querySelectorAll('.rounded-full');
      expect(bars.length).toBe(5);
    });

    it('renders spinner variant', () => {
      const { container } = render(<LoadingAnimation variant="spinner" />);
      // Spinner variant has animate-spin class
      expect(container.querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('renders bars variant', () => {
      const { container } = render(<LoadingAnimation variant="bars" />);
      // Bars variant has multiple bar elements
      const bars = container.querySelectorAll('.bg-muted');
      expect(bars.length).toBeGreaterThan(0);
    });

    it('renders ring variant', () => {
      const { container } = render(<LoadingAnimation variant="ring" />);
      // Ring variant has SVG with gradient
      expect(container.querySelector('svg')).toBeInTheDocument();
      expect(container.querySelector('linearGradient')).toBeInTheDocument();
    });
  });

  describe('Size variations', () => {
    it('renders small size', () => {
      const { container } = render(<LoadingAnimation size="sm" />);
      expect(container.querySelector('.p-4')).toBeInTheDocument();
    });

    it('renders medium size', () => {
      const { container } = render(<LoadingAnimation size="md" />);
      expect(container.querySelector('.p-6')).toBeInTheDocument();
    });

    it('renders large size', () => {
      const { container } = render(<LoadingAnimation size="lg" />);
      expect(container.querySelector('.p-8')).toBeInTheDocument();
    });
  });

  describe('Text display', () => {
    it('renders with text when provided', () => {
      render(<LoadingAnimation text="Please wait..." />);
      expect(screen.getByText('Please wait...')).toBeInTheDocument();
    });

    it('uses text as aria-label when provided', () => {
      render(<LoadingAnimation text="Loading data" />);
      expect(screen.getByLabelText('Loading data')).toBeInTheDocument();
    });

    it('hides text when showText is false', () => {
      render(<LoadingAnimation text="Hidden text" showText={false} />);
      expect(screen.queryByText('Hidden text')).not.toBeInTheDocument();
    });

    it('shows text by default when showText is true', () => {
      render(<LoadingAnimation text="Visible text" showText={true} />);
      expect(screen.getByText('Visible text')).toBeInTheDocument();
    });

    it('renders without text element when text is not provided', () => {
      const { container } = render(<LoadingAnimation />);
      const textElement = container.querySelector('.text-muted-foreground.font-medium');
      expect(textElement).toBeNull();
    });
  });

  describe('Custom className', () => {
    it('applies custom className', () => {
      const { container } = render(<LoadingAnimation className="custom-class" />);
      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('merges custom className with default classes', () => {
      const { container } = render(<LoadingAnimation className="my-custom" />);
      const element = container.firstChild as HTMLElement;
      expect(element.className).toContain('my-custom');
      expect(element.className).toContain('flex');
      expect(element.className).toContain('items-center');
    });
  });

  describe('Accessibility', () => {
    it('has role="status"', () => {
      render(<LoadingAnimation />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('has aria-label attribute', () => {
      render(<LoadingAnimation text="Processing" />);
      const status = screen.getByRole('status');
      expect(status).toHaveAttribute('aria-label', 'Processing');
    });
  });

  describe('Animation classes', () => {
    it('pulse variant has animate-ping and animate-pulse', () => {
      const { container } = render(<LoadingAnimation variant="pulse" />);
      expect(container.querySelector('.animate-ping')).toBeInTheDocument();
      expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
    });

    it('dots variant has animate-bounce with staggered delays', () => {
      const { container } = render(<LoadingAnimation variant="dots" />);
      const dots = container.querySelectorAll('.animate-bounce');
      expect(dots.length).toBe(3);
      // Check that dots have different animation delays
      dots.forEach((dot, index) => {
        expect(dot).toHaveStyle({ animationDelay: `${index * 150}ms` });
      });
    });

    it('spinner variant has animate-spin', () => {
      const { container } = render(<LoadingAnimation variant="spinner" />);
      expect(container.querySelector('.animate-spin')).toBeInTheDocument();
    });
  });
});

describe('SkeletonShimmer', () => {
  it('renders with default 3 lines', () => {
    const { container } = render(<SkeletonShimmer />);
    const lines = container.querySelectorAll('.h-4');
    expect(lines.length).toBe(3);
  });

  it('renders custom number of lines', () => {
    const { container } = render(<SkeletonShimmer lines={5} />);
    const skeletonLines = container.querySelectorAll('.h-4');
    expect(skeletonLines.length).toBe(5);
  });

  it('renders single line when lines=1', () => {
    const { container } = render(<SkeletonShimmer lines={1} />);
    const lines = container.querySelectorAll('.h-4');
    expect(lines.length).toBe(1);
  });

  it('last line has reduced width', () => {
    const { container } = render(<SkeletonShimmer lines={3} />);
    const lines = container.querySelectorAll('.h-4');
    // Last line should have width: 60%
    expect(lines[2]).toHaveStyle({ width: '60%' });
  });

  it('non-last lines have full width', () => {
    const { container } = render(<SkeletonShimmer lines={3} />);
    const lines = container.querySelectorAll('.h-4');
    expect(lines[0]).toHaveStyle({ width: '100%' });
    expect(lines[1]).toHaveStyle({ width: '100%' });
  });

  it('applies custom className', () => {
    const { container } = render(<SkeletonShimmer className="custom-skeleton" />);
    expect(container.firstChild).toHaveClass('custom-skeleton');
  });

  it('has shimmer animation via inline style', () => {
    const { container } = render(<SkeletonShimmer />);
    const lines = container.querySelectorAll('.h-4');
    // Each line should have staggered animation delay
    lines.forEach((line, index) => {
      expect(line).toHaveStyle({ animationDelay: `${index * 100}ms` });
    });
  });

  it('renders with default padding', () => {
    const { container } = render(<SkeletonShimmer />);
    expect(container.firstChild).toHaveClass('p-4');
  });

  it('renders with space-y-3 for line spacing', () => {
    const { container } = render(<SkeletonShimmer />);
    expect(container.firstChild).toHaveClass('space-y-3');
  });

  it('lines have rounded-md corners', () => {
    const { container } = render(<SkeletonShimmer />);
    const lines = container.querySelectorAll('.rounded-md');
    expect(lines.length).toBeGreaterThan(0);
  });

  it('lines have gradient background', () => {
    const { container } = render(<SkeletonShimmer />);
    const lines = container.querySelectorAll('.bg-gradient-to-r');
    expect(lines.length).toBeGreaterThan(0);
  });
});
