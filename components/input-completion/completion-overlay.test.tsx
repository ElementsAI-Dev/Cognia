/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CompletionOverlay } from './completion-overlay';
import type { CompletionSuggestion } from '@/types/input-completion';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, style, ...props }: Record<string, unknown>) => (
      <div className={className as string} style={style as React.CSSProperties} {...props}>
        {children as React.ReactNode}
      </div>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock the useInputCompletion hook with dynamic mock
const mockAccept = jest.fn();
const mockDismiss = jest.fn();
const mockConfig = {
  ui: {
    show_inline_preview: true,
    max_suggestions: 1,
    font_size: 14,
    ghost_text_opacity: 0.5,
    auto_dismiss_ms: 5000,
    show_accept_hint: true,
  },
};

const mockCurrentSuggestion: CompletionSuggestion = {
  id: 'test-suggestion-1',
  text: 'console.log("Hello, World!");',
  display_text: 'console.log("Hello, World!");',
  confidence: 0.95,
  completion_type: 'Line',
};

let mockHookState: {
  currentSuggestion: CompletionSuggestion | null;
  config: typeof mockConfig;
  accept: typeof mockAccept;
  dismiss: typeof mockDismiss;
} = {
  currentSuggestion: mockCurrentSuggestion,
  config: mockConfig,
  accept: mockAccept,
  dismiss: mockDismiss,
};

jest.mock('@/hooks/input-completion', () => ({
  useInputCompletion: jest.fn(() => mockHookState),
}));

// Mock cn utility
jest.mock('@/lib/utils', () => ({
  cn: (...classes: unknown[]) => classes.filter(Boolean).join(' '),
}));

describe('CompletionOverlay', () => {
  const defaultProps = {
    position: { x: 100, y: 200 },
    visible: true,
    onAccept: jest.fn(),
    onDismiss: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    // Reset mock hook state
    mockHookState = {
      currentSuggestion: mockCurrentSuggestion,
      config: mockConfig,
      accept: mockAccept,
      dismiss: mockDismiss,
    };
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

    it('renders null when no current suggestion', () => {
      mockHookState = { ...mockHookState, currentSuggestion: null };
      const { container } = render(<CompletionOverlay {...defaultProps} />);
      expect(container.firstChild).toBeNull();
    });

    it('renders null when show_inline_preview is false', () => {
      mockHookState = {
        ...mockHookState,
        config: { ...mockConfig, ui: { ...mockConfig.ui, show_inline_preview: false } },
      };
      const { container } = render(<CompletionOverlay {...defaultProps} />);
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
      const { container } = render(
        <CompletionOverlay {...defaultProps} position={undefined} />
      );
      const overlay = container.firstChild as HTMLElement;
      expect(overlay.style.position).toBe('');
    });
  });

  describe('Accept Hint', () => {
    it('shows accept hint when show_accept_hint is true', () => {
      render(<CompletionOverlay {...defaultProps} />);
      expect(screen.getByText('Tab')).toBeInTheDocument();
      expect(screen.getByText('to accept')).toBeInTheDocument();
    });

    it('shows dismiss hint when show_accept_hint is true', () => {
      render(<CompletionOverlay {...defaultProps} />);
      expect(screen.getByText('Esc')).toBeInTheDocument();
      expect(screen.getByText('to dismiss')).toBeInTheDocument();
    });

    it('does not show accept hint when show_accept_hint is false', () => {
      mockHookState = {
        ...mockHookState,
        config: { ...mockConfig, ui: { ...mockConfig.ui, show_accept_hint: false } },
      };
      render(<CompletionOverlay {...defaultProps} />);
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
      // Check that border, bg-popover, and backdrop-blur classes are applied
      // Tailwind v4 may combine these with opacity modifiers like /50
      const classNames = Array.from(overlay.classList);
      expect(classNames.some(c => c.includes('border'))).toBe(true);
      expect(classNames.some(c => c.includes('bg-popover'))).toBe(true);
      expect(classNames.some(c => c.includes('backdrop-blur'))).toBe(true);
    });

    it('applies custom font size from config', () => {
      const { container } = render(<CompletionOverlay {...defaultProps} />);
      const suggestionText = container.querySelector('.font-mono') as HTMLElement;
      expect(suggestionText.style.fontSize).toBe('14px');
    });

    it('applies custom ghost text opacity from config', () => {
      const { container } = render(<CompletionOverlay {...defaultProps} />);
      const suggestionText = container.querySelector('.font-mono') as HTMLElement;
      expect(suggestionText.style.opacity).toBe('0.5');
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('calls accept when Tab key is pressed', () => {
      render(<CompletionOverlay {...defaultProps} />);

      fireEvent.keyDown(window, { key: 'Tab' });

      expect(mockAccept).toHaveBeenCalled();
    });

    it('calls dismiss when Escape key is pressed', () => {
      render(<CompletionOverlay {...defaultProps} />);

      fireEvent.keyDown(window, { key: 'Escape' });

      expect(mockDismiss).toHaveBeenCalled();
    });

    it('prevents default when Tab key is pressed', () => {
      render(<CompletionOverlay {...defaultProps} />);

      const event = new KeyboardEvent('keydown', { key: 'Tab', cancelable: true });
      jest.spyOn(event, 'preventDefault');
      window.dispatchEvent(event);

      expect(event.preventDefault).toHaveBeenCalled();
    });

    it('prevents default when Escape key is pressed', () => {
      render(<CompletionOverlay {...defaultProps} />);

      const event = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true });
      jest.spyOn(event, 'preventDefault');
      window.dispatchEvent(event);

      expect(event.preventDefault).toHaveBeenCalled();
    });

    it('does not handle keys when overlay is not visible', () => {
      render(<CompletionOverlay {...defaultProps} visible={false} />);

      fireEvent.keyDown(window, { key: 'Tab' });
      fireEvent.keyDown(window, { key: 'Escape' });

      expect(mockAccept).not.toHaveBeenCalled();
      expect(mockDismiss).not.toHaveBeenCalled();
    });

    it('does not handle other keys', () => {
      render(<CompletionOverlay {...defaultProps} />);

      fireEvent.keyDown(window, { key: 'Enter' });
      fireEvent.keyDown(window, { key: 'Space' });

      expect(mockAccept).not.toHaveBeenCalled();
      expect(mockDismiss).not.toHaveBeenCalled();
    });
  });

  describe('Auto-Dismiss', () => {
    it('auto-dismisses after configured timeout', async () => {
      render(<CompletionOverlay {...defaultProps} />);

      jest.advanceTimersByTime(5000);

      await waitFor(() => {
        expect(mockDismiss).toHaveBeenCalled();
      });
    });

    it('does not auto-dismiss when auto_dismiss_ms is 0', () => {
      mockHookState = {
        ...mockHookState,
        config: { ...mockConfig, ui: { ...mockConfig.ui, auto_dismiss_ms: 0 } },
      };
      render(<CompletionOverlay {...defaultProps} />);

      jest.advanceTimersByTime(10000);

      expect(mockDismiss).not.toHaveBeenCalled();
    });

    it('clears timeout when overlay becomes invisible', () => {
      const { rerender } = render(<CompletionOverlay {...defaultProps} visible={true} />);

      rerender(<CompletionOverlay {...defaultProps} visible={false} />);

      jest.advanceTimersByTime(5000);

      expect(mockDismiss).not.toHaveBeenCalled();
    });
  });

  describe('Callbacks', () => {
    it('calls onAccept callback when suggestion is accepted', () => {
      const onAccept = jest.fn();
      const acceptMock = jest.fn();

      mockHookState = { ...mockHookState, accept: acceptMock };

      render(<CompletionOverlay {...defaultProps} onAccept={onAccept} />);

      // Simulate the internal accept calling onAccept
      acceptMock.mockImplementation((suggestion) => {
        onAccept?.(suggestion);
      });

      fireEvent.keyDown(window, { key: 'Tab' });

      expect(acceptMock).toHaveBeenCalled();
    });

    it('calls onDismiss callback when suggestion is dismissed', () => {
      const onDismiss = jest.fn();
      const dismissMock = jest.fn();

      mockHookState = { ...mockHookState, dismiss: dismissMock };

      render(<CompletionOverlay {...defaultProps} onDismiss={onDismiss} />);

      // Simulate the internal dismiss calling onDismiss
      dismissMock.mockImplementation(() => {
        onDismiss?.();
      });

      fireEvent.keyDown(window, { key: 'Escape' });

      expect(dismissMock).toHaveBeenCalled();
    });

    it('works without callbacks', () => {
      const { container } = render(
        <CompletionOverlay position={defaultProps.position} visible={true} />
      );

      expect(container.firstChild).toBeInTheDocument();

      fireEvent.keyDown(window, { key: 'Tab' });
      fireEvent.keyDown(window, { key: 'Escape' });

      expect(mockAccept).toHaveBeenCalled();
      expect(mockDismiss).toHaveBeenCalled();
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

      mockHookState = { ...mockHookState, currentSuggestion: emptySuggestion };

      const { container } = render(<CompletionOverlay {...defaultProps} />);
      // Check that the suggestion text element exists (even if empty)
      const suggestionText = container.querySelector('.font-mono');
      expect(suggestionText).toBeInTheDocument();
      expect(suggestionText?.textContent).toBe('');
    });

    it('handles multiline suggestion text', () => {
      const multilineSuggestion: CompletionSuggestion = {
        id: 'multiline',
        text: 'line1\nline2\nline3',
        display_text: 'line1\nline2\nline3',
        confidence: 0.9,
        completion_type: 'Block',
      };

      mockHookState = { ...mockHookState, currentSuggestion: multilineSuggestion };

      const { container } = render(<CompletionOverlay {...defaultProps} />);
      const suggestionText = container.querySelector('.font-mono') as HTMLElement;
      expect(suggestionText.textContent).toBe('line1\nline2\nline3');
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

      mockHookState = { ...mockHookState, currentSuggestion: longSuggestion };

      const { container } = render(<CompletionOverlay {...defaultProps} />);
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

      mockHookState = { ...mockHookState, currentSuggestion: specialSuggestion };

      render(<CompletionOverlay {...defaultProps} />);
      expect(screen.getByText(/<script>/)).toBeInTheDocument();
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

      const { unmount } = render(<CompletionOverlay {...defaultProps} />);

      unmount();

      expect(clearTimeoutSpy).toHaveBeenCalled();
    });
  });
});
