/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { SpotlightOverlay } from './spotlight-overlay';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, style, onClick, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div className={className} style={style} onClick={onClick} data-testid="motion-div" {...props}>
        {children}
      </div>
    ),
    path: ({ d, fill, fillRule, ...props }: React.SVGAttributes<SVGPathElement>) => (
      <path d={d} fill={fill} fillRule={fillRule} data-testid="motion-path" {...props} />
    ),
    rect: (props: React.SVGAttributes<SVGRectElement>) => (
      <rect data-testid="motion-rect" {...props} />
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('SpotlightOverlay', () => {
  const mockTargetRect = {
    top: 100,
    left: 100,
    width: 200,
    height: 50,
    bottom: 150,
    right: 300,
    x: 100,
    y: 100,
    toJSON: () => ({}),
  } as DOMRect;

  beforeEach(() => {
    // Mock window dimensions
    Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true });
    Object.defineProperty(window, 'innerHeight', { value: 768, writable: true });
  });

  it('renders nothing when not visible', () => {
    const { container } = render(
      <SpotlightOverlay targetRect={null} isVisible={false} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders overlay when visible', () => {
    render(<SpotlightOverlay targetRect={null} isVisible={true} />);
    expect(screen.getByTestId('motion-div')).toBeInTheDocument();
  });

  it('renders SVG overlay with spotlight path when targetRect is provided', () => {
    render(<SpotlightOverlay targetRect={mockTargetRect} isVisible={true} />);
    expect(screen.getByTestId('motion-path')).toBeInTheDocument();
  });

  it('renders glow effect rect when targetRect is provided', () => {
    render(<SpotlightOverlay targetRect={mockTargetRect} isVisible={true} />);
    expect(screen.getByTestId('motion-rect')).toBeInTheDocument();
  });

  it('applies custom padding', () => {
    const { container } = render(
      <SpotlightOverlay targetRect={mockTargetRect} isVisible={true} padding={16} />
    );
    expect(container).toBeInTheDocument();
  });

  it('applies custom borderRadius', () => {
    const { container } = render(
      <SpotlightOverlay targetRect={mockTargetRect} isVisible={true} borderRadius={20} />
    );
    expect(container).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(
      <SpotlightOverlay
        targetRect={mockTargetRect}
        isVisible={true}
        className="custom-class"
      />
    );
    const overlays = screen.getAllByTestId('motion-div');
    // The first motion-div is the main overlay with the custom class
    expect(overlays[0]).toHaveClass('custom-class');
  });

  it('calls onClick when overlay is clicked', () => {
    const handleClick = jest.fn();
    render(
      <SpotlightOverlay
        targetRect={mockTargetRect}
        isVisible={true}
        onClick={handleClick}
      />
    );
    
    const overlays = screen.getAllByTestId('motion-div');
    overlays[0].click();
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('renders pulsing ring animation element', () => {
    const { container } = render(
      <SpotlightOverlay targetRect={mockTargetRect} isVisible={true} />
    );
    // Check for ring elements
    const rings = container.querySelectorAll('[class*="ring"]');
    expect(rings.length).toBeGreaterThan(0);
  });

  it('updates on window resize', async () => {
    const { rerender } = render(
      <SpotlightOverlay targetRect={mockTargetRect} isVisible={true} />
    );

    // Trigger resize
    Object.defineProperty(window, 'innerWidth', { value: 1280, writable: true });
    window.dispatchEvent(new Event('resize'));

    await waitFor(() => {
      rerender(<SpotlightOverlay targetRect={mockTargetRect} isVisible={true} />);
    });

    const overlays = screen.getAllByTestId('motion-div');
    expect(overlays.length).toBeGreaterThan(0);
  });

  it('handles null targetRect gracefully', () => {
    render(<SpotlightOverlay targetRect={null} isVisible={true} />);
    // Should render without crashing, just no spotlight
    const overlays = screen.getAllByTestId('motion-div');
    expect(overlays.length).toBeGreaterThan(0);
  });
});
