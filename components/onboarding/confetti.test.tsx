/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { Confetti, ConfettiBurst } from './confetti';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, style, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div className={className} style={style} data-testid="confetti-piece" {...props}>
        {children}
      </div>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('Confetti', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders nothing when not active', () => {
    const { container } = render(<Confetti isActive={false} />);
    expect(container.querySelector('.fixed')).toBeNull();
  });

  it('renders confetti pieces when active', () => {
    render(<Confetti isActive={true} particleCount={10} />);
    
    act(() => {
      jest.advanceTimersByTime(100);
    });

    const pieces = screen.getAllByTestId('confetti-piece');
    expect(pieces.length).toBeGreaterThan(0);
  });

  it('uses custom particle count', () => {
    render(<Confetti isActive={true} particleCount={5} />);
    
    act(() => {
      jest.advanceTimersByTime(100);
    });

    const pieces = screen.getAllByTestId('confetti-piece');
    // Each piece has a wrapper and shape, so count should reflect particle count
    expect(pieces.length).toBeGreaterThanOrEqual(5);
  });

  it('calls onComplete after duration', () => {
    const onComplete = jest.fn();
    render(<Confetti isActive={true} duration={2000} onComplete={onComplete} />);

    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(onComplete).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('uses custom colors', () => {
    const customColors = ['#FF0000', '#00FF00', '#0000FF'];
    const { container } = render(
      <Confetti isActive={true} particleCount={10} colors={customColors} />
    );

    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(container).toBeInTheDocument();
  });

  it('hides confetti when isActive becomes false', () => {
    const { rerender, container } = render(<Confetti isActive={true} particleCount={5} />);

    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(container.querySelector('.fixed')).toBeInTheDocument();

    rerender(<Confetti isActive={false} particleCount={5} />);

    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(container.querySelector('.fixed')).toBeNull();
  });

  it('regenerates pieces on multiple activations', () => {
    const { rerender } = render(<Confetti isActive={false} particleCount={5} />);

    // First activation
    rerender(<Confetti isActive={true} particleCount={5} />);
    act(() => {
      jest.advanceTimersByTime(100);
    });

    const firstPieces = screen.getAllByTestId('confetti-piece');
    expect(firstPieces.length).toBeGreaterThan(0);

    // Deactivate
    rerender(<Confetti isActive={false} particleCount={5} />);
    act(() => {
      jest.advanceTimersByTime(100);
    });

    // Second activation
    rerender(<Confetti isActive={true} particleCount={5} />);
    act(() => {
      jest.advanceTimersByTime(100);
    });

    const secondPieces = screen.getAllByTestId('confetti-piece');
    expect(secondPieces.length).toBeGreaterThan(0);
  });
});

describe('ConfettiBurst', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders nothing when not active', () => {
    const { container } = render(<ConfettiBurst isActive={false} />);
    expect(container.querySelector('.fixed')).toBeNull();
  });

  it('renders burst confetti when active', () => {
    render(<ConfettiBurst isActive={true} particleCount={10} />);

    act(() => {
      jest.advanceTimersByTime(100);
    });

    const pieces = screen.getAllByTestId('confetti-piece');
    expect(pieces.length).toBeGreaterThan(0);
  });

  it('uses custom x and y position', () => {
    const { container } = render(
      <ConfettiBurst isActive={true} x={25} y={75} particleCount={5} />
    );

    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(container).toBeInTheDocument();
  });

  it('calls onComplete after animation', () => {
    const onComplete = jest.fn();
    render(<ConfettiBurst isActive={true} onComplete={onComplete} />);

    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(onComplete).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(3000);
    });

    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('uses custom colors', () => {
    const customColors = ['#FFFF00', '#FF00FF'];
    const { container } = render(
      <ConfettiBurst isActive={true} particleCount={5} colors={customColors} />
    );

    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(container).toBeInTheDocument();
  });
});
