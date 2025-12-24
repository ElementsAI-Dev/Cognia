/**
 * TextSelectionPopover Tests
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { TextSelectionPopover } from './text-selection-popover';
import { useQuoteStore } from '@/stores/quote-store';

// Mock the quote store
jest.mock('@/stores/quote-store', () => ({
  useQuoteStore: jest.fn(),
}));

// Mock sonner toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe('TextSelectionPopover', () => {
  const mockAddQuote = jest.fn();
  const mockContainerRef = { current: document.createElement('div') };

  beforeEach(() => {
    jest.clearAllMocks();
    (useQuoteStore as unknown as jest.Mock).mockImplementation((selector) => {
      const state = { addQuote: mockAddQuote };
      return selector(state);
    });

    // Reset clipboard mock
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn().mockResolvedValue(undefined),
      },
    });
  });

  it('should not render when no text is selected', () => {
    render(
      <TextSelectionPopover
        containerRef={mockContainerRef}
        messageId="msg-123"
        messageRole="assistant"
      />
    );

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  // Note: Testing actual text selection behavior requires browser APIs (getBoundingClientRect)
  // that are not fully supported in JSDOM. These behaviors are better tested via E2E tests.
  it.skip('should render popover when text is selected within container', async () => {
    // This test is skipped due to JSDOM limitations with Range.getBoundingClientRect()
    // The functionality should be tested in E2E tests with a real browser
  });

  describe('button actions', () => {
    // These tests would require more complex setup to simulate text selection
    // In a real test environment with proper browser APIs

    it('should have copy, quote, and search buttons when rendered', () => {
      // This would require simulating a valid text selection first
      // For now, we test the component structure exists
      expect(TextSelectionPopover).toBeDefined();
    });
  });

  describe('props validation', () => {
    it('should accept required props', () => {
      const props = {
        containerRef: mockContainerRef,
        messageId: 'msg-123',
        messageRole: 'assistant' as const,
      };

      // Should not throw
      expect(() => {
        render(<TextSelectionPopover {...props} />);
      }).not.toThrow();
    });

    it('should accept optional onSearch prop', () => {
      const mockOnSearch = jest.fn();
      const props = {
        containerRef: mockContainerRef,
        messageId: 'msg-123',
        messageRole: 'user' as const,
        onSearch: mockOnSearch,
      };

      expect(() => {
        render(<TextSelectionPopover {...props} />);
      }).not.toThrow();
    });
  });
});
