/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CompletionOverlay } from './completion-overlay';
import type { CompletionSuggestion } from '@/types/input-completion';

// Mock motion/react
jest.mock('motion/react', () => ({
  motion: {
    div: ({ children, className, style, ...props }: Record<string, unknown>) => (
      <div className={className as string} style={style as React.CSSProperties} {...props}>
        {children as React.ReactNode}
      </div>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock cn utility
jest.mock('@/lib/utils', () => ({
  cn: (...classes: unknown[]) => classes.filter(Boolean).join(' '),
}));

const mockSuggestion: CompletionSuggestion = {
  id: 'test-suggestion-1',
  text: 'console.log("Hello, World!");',
  display_text: 'console.log("Hello, World!");',
  confidence: 0.95,
  completion_type: 'Line',
};

describe('CompletionOverlay', () => {
  const defaultProps = {
    position: { x: 100, y: 200 },
    visible: true,
    suggestions: [mockSuggestion],
    onAccept: jest.fn(),
    onDismiss: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Rendering', () => {
    it('renders without crashing', () => {
      render(<CompletionOverlay {...defaultProps} />);
      expect(screen.getByText(/console\.log/)).toBeInTheDocument();
    });

    it('renders null when visible is false', () => {
      const { container } = render(<CompletionOverlay {...defaultProps} visible={false} />);
      expect(container.firstChild).toBeNull();
    });

    it('renders null when no suggestions provided', () => {
      const { container } = render(<CompletionOverlay {...defaultProps} suggestions={[]} />);
      expect(container.firstChild).toBeNull();
    });

    it('renders null when suggestions is undefined', () => {
      const { container } = render(<CompletionOverlay {...defaultProps} suggestions={undefined} />);
      expect(container.firstChild).toBeNull();
    });

    it('displays suggestion text correctly', () => {
      render(<CompletionOverlay {...defaultProps} />);
      expect(screen.getByText('console.log("Hello, World!");')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(
        <CompletionOverlay {...defaultProps} className="custom-class" />
      );
      const overlay = container.querySelector('.custom-class');
      expect(overlay).toBeInTheDocument();
    });

    it('applies position styles when position is provided', () => {
      const { container } = render(<CompletionOverlay {...defaultProps} />);
      const overlay = container.firstChild as HTMLElement;
      expect(overlay.style.position).toBe('fixed');
      expect(overlay.style.left).toBe('100px');
      expect(overlay.style.top).toBe('200px');
      expect(overlay.style.zIndex).toBe('9999');
    });

    it('does not apply position styles when position is not provided', () => {
      const { container } = render(<CompletionOverlay {...defaultProps} position={undefined} />);
      const overlay = container.firstChild as HTMLElement;
      expect(overlay.style.position).toBe('');
    });
  });

  describe('Accept Hint', () => {
    it('shows accept hint by default', () => {
      render(<CompletionOverlay {...defaultProps} />);
      expect(screen.getByText('Tab')).toBeInTheDocument();
      expect(screen.getByText('to accept')).toBeInTheDocument();
    });

    it('shows dismiss hint by default', () => {
      render(<CompletionOverlay {...defaultProps} />);
      expect(screen.getByText('Esc')).toBeInTheDocument();
      expect(screen.getByText('to dismiss')).toBeInTheDocument();
    });

    it('does not show accept hint when showAcceptHint is false', () => {
      render(<CompletionOverlay {...defaultProps} showAcceptHint={false} />);
      expect(screen.queryByText('Tab')).not.toBeInTheDocument();
      expect(screen.queryByText('Esc')).not.toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('applies pointer-events-none and select-none classes', () => {
      const { container } = render(<CompletionOverlay {...defaultProps} />);
      const overlay = container.firstChild as HTMLElement;
      expect(overlay.classList.contains('pointer-events-none')).toBe(true);
      expect(overlay.classList.contains('select-none')).toBe(true);
    });

    it('applies border and background classes', () => {
      const { container } = render(<CompletionOverlay {...defaultProps} />);
      const overlay = container.firstChild as HTMLElement;
      const classNames = Array.from(overlay.classList);
      expect(classNames.some((c) => c.includes('border'))).toBe(true);
      expect(classNames.some((c) => c.includes('bg-popover'))).toBe(true);
      expect(classNames.some((c) => c.includes('backdrop-blur'))).toBe(true);
    });

    it('applies custom font size', () => {
      const { container } = render(<CompletionOverlay {...defaultProps} fontSize={16} />);
      const suggestionText = container.querySelector('.font-mono') as HTMLElement;
      expect(suggestionText.style.fontSize).toBe('16px');
    });

    it('uses default font size of 13', () => {
      const { container } = render(<CompletionOverlay {...defaultProps} />);
      const suggestionText = container.querySelector('.font-mono') as HTMLElement;
      expect(suggestionText.style.fontSize).toBe('13px');
    });

    it('applies custom ghost text opacity', () => {
      const { container } = render(<CompletionOverlay {...defaultProps} ghostTextOpacity={0.8} />);
      const suggestionText = container.querySelector('.font-mono') as HTMLElement;
      expect(suggestionText.style.opacity).toBe('0.8');
    });

    it('uses default ghost text opacity of 0.5', () => {
      const { container } = render(<CompletionOverlay {...defaultProps} />);
      const suggestionText = container.querySelector('.font-mono') as HTMLElement;
      expect(suggestionText.style.opacity).toBe('0.5');
    });
  });

  describe('Auto-Dismiss', () => {
    it('auto-dismisses after configured timeout', async () => {
      const onDismiss = jest.fn();
      render(<CompletionOverlay {...defaultProps} onDismiss={onDismiss} autoDismissMs={3000} />);

      jest.advanceTimersByTime(3000);

      await waitFor(() => {
        expect(onDismiss).toHaveBeenCalled();
      });
    });

    it('does not auto-dismiss when autoDismissMs is 0 (default)', () => {
      const onDismiss = jest.fn();
      render(<CompletionOverlay {...defaultProps} onDismiss={onDismiss} />);

      jest.advanceTimersByTime(10000);

      expect(onDismiss).not.toHaveBeenCalled();
    });

    it('clears timeout when overlay becomes invisible', () => {
      const onDismiss = jest.fn();
      const { rerender } = render(
        <CompletionOverlay {...defaultProps} onDismiss={onDismiss} autoDismissMs={3000} visible={true} />
      );

      rerender(
        <CompletionOverlay {...defaultProps} onDismiss={onDismiss} autoDismissMs={3000} visible={false} />
      );

      jest.advanceTimersByTime(5000);

      expect(onDismiss).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('handles empty suggestion text', () => {
      const emptySuggestion: CompletionSuggestion = {
        id: 'empty',
        text: '',
        display_text: '',
        confidence: 0,
        completion_type: 'Line',
      };

      const { container } = render(
        <CompletionOverlay {...defaultProps} suggestions={[emptySuggestion]} />
      );
      const suggestionText = container.querySelector('.font-mono');
      expect(suggestionText).toBeInTheDocument();
      expect(suggestionText?.textContent).toBe('');
    });

    it('handles multiline suggestion text with line break indicators', () => {
      const multilineSuggestion: CompletionSuggestion = {
        id: 'multiline',
        text: 'line1\nline2\nline3',
        display_text: 'line1\nline2\nline3',
        confidence: 0.9,
        completion_type: 'Block',
      };

      const { container } = render(
        <CompletionOverlay {...defaultProps} suggestions={[multilineSuggestion]} />
      );
      const suggestionText = container.querySelector('.font-mono') as HTMLElement;
      expect(suggestionText.textContent).toContain('line1');
      expect(suggestionText.textContent).toContain('line2');
      expect(suggestionText.textContent).toContain('line3');
    });

    it('handles very long suggestion text', () => {
      const longText = 'a'.repeat(1000);
      const longSuggestion: CompletionSuggestion = {
        id: 'long',
        text: longText,
        display_text: longText,
        confidence: 0.8,
        completion_type: 'Line',
      };

      const { container } = render(
        <CompletionOverlay {...defaultProps} suggestions={[longSuggestion]} />
      );
      const suggestionText = container.querySelector('.font-mono') as HTMLElement;
      expect(suggestionText.textContent).toBe(longText);
    });

    it('handles special characters in suggestion text', () => {
      const specialSuggestion: CompletionSuggestion = {
        id: 'special',
        text: '<script>alert("XSS")</script>',
        display_text: '<script>alert("XSS")</script>',
        confidence: 0.7,
        completion_type: 'Line',
      };

      render(<CompletionOverlay {...defaultProps} suggestions={[specialSuggestion]} />);
      expect(screen.getByText(/<script>/)).toBeInTheDocument();
    });

    it('works without callbacks', () => {
      const { container } = render(
        <CompletionOverlay
          position={defaultProps.position}
          visible={true}
          suggestions={[mockSuggestion]}
        />
      );
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  describe('Multi-Suggestion Navigation', () => {
    const multipleSuggestions: CompletionSuggestion[] = [
      {
        id: 'suggestion-1',
        text: 'console.log("First");',
        display_text: 'console.log("First");',
        confidence: 0.95,
        completion_type: 'Line',
      },
      {
        id: 'suggestion-2',
        text: 'console.log("Second");',
        display_text: 'console.log("Second");',
        confidence: 0.85,
        completion_type: 'Line',
      },
      {
        id: 'suggestion-3',
        text: 'console.log("Third");',
        display_text: 'console.log("Third");',
        confidence: 0.75,
        completion_type: 'Line',
      },
    ];

    it('renders with multiple suggestions', () => {
      render(<CompletionOverlay {...defaultProps} suggestions={multipleSuggestions} />);
      expect(screen.getByText(/First/)).toBeInTheDocument();
    });

    it('shows navigation indicator for multiple suggestions', () => {
      render(<CompletionOverlay {...defaultProps} suggestions={multipleSuggestions} />);
      expect(screen.getByText('1/3')).toBeInTheDocument();
    });

    it('navigates to next suggestion with Alt+]', () => {
      const onIndexChange = jest.fn();
      render(
        <CompletionOverlay
          {...defaultProps}
          suggestions={multipleSuggestions}
          onIndexChange={onIndexChange}
        />
      );

      fireEvent.keyDown(window, { key: ']', altKey: true });

      expect(onIndexChange).toHaveBeenCalledWith(1);
    });

    it('navigates to previous suggestion with Alt+[', () => {
      const onIndexChange = jest.fn();
      render(
        <CompletionOverlay
          {...defaultProps}
          suggestions={multipleSuggestions}
          onIndexChange={onIndexChange}
        />
      );

      fireEvent.keyDown(window, { key: ']', altKey: true });
      fireEvent.keyDown(window, { key: '[', altKey: true });

      expect(onIndexChange).toHaveBeenLastCalledWith(0);
    });

    it('wraps around when navigating past last suggestion', () => {
      const onIndexChange = jest.fn();
      render(
        <CompletionOverlay
          {...defaultProps}
          suggestions={multipleSuggestions}
          onIndexChange={onIndexChange}
        />
      );

      fireEvent.keyDown(window, { key: ']', altKey: true }); // 0 -> 1
      fireEvent.keyDown(window, { key: ']', altKey: true }); // 1 -> 2
      fireEvent.keyDown(window, { key: ']', altKey: true }); // 2 -> 0 (wrap)

      expect(onIndexChange).toHaveBeenLastCalledWith(0);
    });

    it('does not show navigation indicator for single suggestion', () => {
      render(<CompletionOverlay {...defaultProps} suggestions={[multipleSuggestions[0]]} />);
      expect(screen.queryByText('1/1')).not.toBeInTheDocument();
    });

    it('does not navigate when only one suggestion', () => {
      const onIndexChange = jest.fn();
      render(
        <CompletionOverlay
          {...defaultProps}
          suggestions={[multipleSuggestions[0]]}
          onIndexChange={onIndexChange}
        />
      );

      fireEvent.keyDown(window, { key: ']', altKey: true });
      fireEvent.keyDown(window, { key: '[', altKey: true });

      expect(onIndexChange).not.toHaveBeenCalled();
    });
  });

  describe('Component Lifecycle', () => {
    it('sets up keyboard event listeners on mount', () => {
      const addEventListenerSpy = jest.spyOn(window, 'addEventListener');

      render(<CompletionOverlay {...defaultProps} />);

      expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    });

    it('removes keyboard event listeners on unmount', () => {
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');

      const { unmount } = render(<CompletionOverlay {...defaultProps} />);

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    });

    it('cleans up auto-dismiss timer on unmount', () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

      const { unmount } = render(
        <CompletionOverlay {...defaultProps} autoDismissMs={5000} />
      );

      unmount();

      expect(clearTimeoutSpy).toHaveBeenCalled();
    });
  });
});
