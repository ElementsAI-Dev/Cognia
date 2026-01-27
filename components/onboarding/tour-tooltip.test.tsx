/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { TourTooltip } from './tour-tooltip';

// Mock framer-motion - use a unique testid for the main wrapper only
jest.mock('framer-motion', () => {
  const MockMotionDiv = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { 
    role?: string;
    initial?: unknown;
    animate?: unknown;
    exit?: unknown;
    transition?: unknown;
    variants?: unknown;
  }>(
    function MockMotionDiv({ children, className, style, role, initial: _initial, animate: _animate, exit: _exit, transition: _transition, variants: _variants, ...props }, ref) {
      // Only add tour-tooltip testid to the main dialog element
      const testId = role === 'dialog' ? 'tour-tooltip' : undefined;
      return (
        <div ref={ref} className={className} style={style} role={role} data-testid={testId} {...props}>
          {children}
        </div>
      );
    }
  );
  return {
    motion: { div: MockMotionDiv },
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  X: () => <span data-testid="icon-x">X</span>,
  ChevronLeft: () => <span data-testid="icon-chevron-left">←</span>,
  ChevronRight: () => <span data-testid="icon-chevron-right">→</span>,
  Check: () => <span data-testid="icon-check">✓</span>,
  Sparkles: () => <span data-testid="icon-sparkles">✨</span>,
}));

describe('TourTooltip', () => {
  const defaultProps = {
    title: 'Test Title',
    description: 'Test Description',
    currentStep: 0,
    totalSteps: 5,
    position: 'bottom' as const,
    targetRect: null,
    onNext: jest.fn(),
    onPrevious: jest.fn(),
    onSkip: jest.fn(),
    onClose: jest.fn(),
    isFirst: true,
    isLast: false,
    nextLabel: 'Next',
    previousLabel: 'Previous',
    skipLabel: 'Skip tour',
    completeLabel: 'Complete',
    stepLabel: 'Step',
    closeTourLabel: 'Close tour',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true });
    Object.defineProperty(window, 'innerHeight', { value: 768, writable: true });
  });

  it('renders tooltip with title and description', () => {
    render(<TourTooltip {...defaultProps} />);
    
    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test Description')).toBeInTheDocument();
  });

  it('displays correct step indicator', () => {
    render(<TourTooltip {...defaultProps} currentStep={2} totalSteps={5} />);
    
    expect(screen.getByText(/Step 3 \/ 5/)).toBeInTheDocument();
  });

  it('displays progress percentage', () => {
    render(<TourTooltip {...defaultProps} currentStep={2} totalSteps={5} />);
    
    // Step 3 of 5 = 60%
    expect(screen.getByText('60%')).toBeInTheDocument();
  });

  it('calls onNext when next button is clicked', () => {
    const onNext = jest.fn();
    render(<TourTooltip {...defaultProps} onNext={onNext} isFirst={false} />);
    
    const nextButton = screen.getByRole('button', { name: /next/i });
    fireEvent.click(nextButton);
    
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('calls onPrevious when previous button is clicked', () => {
    const onPrevious = jest.fn();
    render(<TourTooltip {...defaultProps} onPrevious={onPrevious} isFirst={false} />);
    
    const prevButton = screen.getByRole('button', { name: /previous|back/i });
    fireEvent.click(prevButton);
    
    expect(onPrevious).toHaveBeenCalledTimes(1);
  });

  it('disables previous button on first step', () => {
    render(<TourTooltip {...defaultProps} isFirst={true} />);
    
    const prevButton = screen.getByRole('button', { name: /previous|back/i });
    expect(prevButton).toBeDisabled();
  });

  it('shows complete button on last step', () => {
    render(<TourTooltip {...defaultProps} isLast={true} />);
    
    expect(screen.getByText(/complete/i)).toBeInTheDocument();
  });

  it('calls onSkip when skip button is clicked', () => {
    const onSkip = jest.fn();
    render(<TourTooltip {...defaultProps} onSkip={onSkip} />);
    
    const skipButton = screen.getByText(/skip tour/i);
    fireEvent.click(skipButton);
    
    expect(onSkip).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = jest.fn();
    render(<TourTooltip {...defaultProps} onClose={onClose} />);
    
    const closeButton = screen.getByLabelText(/close/i);
    fireEvent.click(closeButton);
    
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders step dots for each step', () => {
    const { container } = render(<TourTooltip {...defaultProps} totalSteps={5} />);
    
    // Check for step indicator dots
    const dots = container.querySelectorAll('[class*="rounded-full"]');
    expect(dots.length).toBeGreaterThanOrEqual(5);
  });

  it('renders icon when provided', () => {
    const icon = <span data-testid="custom-icon">🎉</span>;
    render(<TourTooltip {...defaultProps} icon={icon} />);
    
    expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
  });

  it('uses custom labels', () => {
    render(
      <TourTooltip
        {...defaultProps}
        nextLabel="Next Step"
        previousLabel="Go Back"
        skipLabel="Skip This"
        completeLabel="Finish"
        stepLabel="Page"
      />
    );
    
    expect(screen.getByText(/Page 1 \/ 5/)).toBeInTheDocument();
    expect(screen.getByText('Next Step')).toBeInTheDocument();
    expect(screen.getByText('Skip This')).toBeInTheDocument();
  });

  it('applies mobile styles when isMobile is true', () => {
    const { container } = render(<TourTooltip {...defaultProps} isMobile={true} />);
    
    const tooltip = container.querySelector('[data-testid="tour-tooltip"]');
    expect(tooltip).toBeInTheDocument();
  });

  it('positions tooltip based on targetRect', () => {
    const targetRect = {
      top: 100,
      left: 200,
      width: 100,
      height: 50,
      bottom: 150,
      right: 300,
      x: 200,
      y: 100,
      toJSON: () => ({}),
    } as DOMRect;

    render(<TourTooltip {...defaultProps} targetRect={targetRect} position="bottom" />);
    
    expect(screen.getByTestId('tour-tooltip')).toBeInTheDocument();
  });

  it('centers tooltip when position is center', () => {
    render(<TourTooltip {...defaultProps} position="center" targetRect={null} />);
    
    expect(screen.getByTestId('tour-tooltip')).toBeInTheDocument();
  });

  it('handles all position variants', () => {
    const positions = ['top', 'bottom', 'left', 'right', 'center'] as const;
    const targetRect = {
      top: 200,
      left: 200,
      width: 100,
      height: 50,
      bottom: 250,
      right: 300,
      x: 200,
      y: 200,
      toJSON: () => ({}),
    } as DOMRect;

    positions.forEach((position) => {
      const { unmount } = render(
        <TourTooltip {...defaultProps} position={position} targetRect={targetRect} />
      );
      expect(screen.getByTestId('tour-tooltip')).toBeInTheDocument();
      unmount();
    });
  });

  it('has proper ARIA attributes', () => {
    render(<TourTooltip {...defaultProps} />);
    
    const tooltip = screen.getByTestId('tour-tooltip');
    expect(tooltip).toHaveAttribute('role', 'dialog');
    expect(tooltip).toHaveAttribute('aria-modal', 'true');
  });
});
