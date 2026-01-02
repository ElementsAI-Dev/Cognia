/**
 * QuotedContent Tests
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { QuotedContent } from './quoted-content';
import { useQuoteStore } from '@/stores/chat';

// Mock the quote store
jest.mock('@/stores/chat', () => ({
  useQuoteStore: jest.fn(),
}));

// Mock settings store
jest.mock('@/stores/settings', () => ({
  useSettingsStore: jest.fn((selector) => {
    const state = {
      fontSize: 'medium',
      size: 'medium',
    };
    return typeof selector === 'function' ? selector(state) : state;
  }),
}));

describe('QuotedContent', () => {
  const mockRemoveQuote = jest.fn();
  const mockClearQuotes = jest.fn();

  const createMockQuote = (overrides = {}) => ({
    id: 'quote-1',
    content: 'Test quoted content',
    messageId: 'msg-123',
    messageRole: 'assistant' as const,
    createdAt: new Date(),
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const setupMockStore = (quotedTexts: ReturnType<typeof createMockQuote>[]) => {
    (useQuoteStore as unknown as jest.Mock).mockImplementation((selector) => {
      const state = {
        quotedTexts,
        removeQuote: mockRemoveQuote,
        clearQuotes: mockClearQuotes,
      };
      return selector(state);
    });
  };

  it('should not render when there are no quotes', () => {
    setupMockStore([]);

    const { container } = render(<QuotedContent />);

    expect(container.firstChild).toBeNull();
  });

  it('should render when there is one quote', () => {
    setupMockStore([createMockQuote()]);

    render(<QuotedContent />);

    expect(screen.getByText('Quoted (1)')).toBeInTheDocument();
    expect(screen.getByText(/Test quoted content/)).toBeInTheDocument();
  });

  it('should render multiple quotes', () => {
    setupMockStore([
      createMockQuote({ id: 'quote-1', content: 'First quote' }),
      createMockQuote({ id: 'quote-2', content: 'Second quote' }),
    ]);

    render(<QuotedContent />);

    expect(screen.getByText('Quoted (2)')).toBeInTheDocument();
    expect(screen.getByText(/First quote/)).toBeInTheDocument();
    expect(screen.getByText(/Second quote/)).toBeInTheDocument();
  });

  it('should show "Clear all" button when there are multiple quotes', () => {
    setupMockStore([
      createMockQuote({ id: 'quote-1' }),
      createMockQuote({ id: 'quote-2' }),
    ]);

    render(<QuotedContent />);

    expect(screen.getByText('Clear all')).toBeInTheDocument();
  });

  it('should not show "Clear all" button when there is only one quote', () => {
    setupMockStore([createMockQuote()]);

    render(<QuotedContent />);

    expect(screen.queryByText('Clear all')).not.toBeInTheDocument();
  });

  it('should call clearQuotes when "Clear all" is clicked', () => {
    setupMockStore([
      createMockQuote({ id: 'quote-1' }),
      createMockQuote({ id: 'quote-2' }),
    ]);

    render(<QuotedContent />);

    fireEvent.click(screen.getByText('Clear all'));

    expect(mockClearQuotes).toHaveBeenCalledTimes(1);
  });

  it('should display correct role badge for user quotes', () => {
    setupMockStore([createMockQuote({ messageRole: 'user' })]);

    render(<QuotedContent />);

    expect(screen.getByText('You')).toBeInTheDocument();
  });

  it('should display correct role badge for assistant quotes', () => {
    setupMockStore([createMockQuote({ messageRole: 'assistant' })]);

    render(<QuotedContent />);

    expect(screen.getByText('AI')).toBeInTheDocument();
  });

  it('should truncate long content', () => {
    const longContent = 'A'.repeat(200);
    setupMockStore([createMockQuote({ content: longContent })]);

    render(<QuotedContent />);

    // Content should be truncated to 150 chars + '...'
    const expectedTruncated = 'A'.repeat(150) + '...';
    expect(screen.getByText(expectedTruncated)).toBeInTheDocument();
  });

  it('should not truncate short content', () => {
    const shortContent = 'Short content';
    setupMockStore([createMockQuote({ content: shortContent })]);

    render(<QuotedContent />);

    expect(screen.getByText(shortContent)).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    setupMockStore([createMockQuote()]);

    const { container } = render(<QuotedContent className="custom-class" />);

    expect(container.firstChild).toHaveClass('custom-class');
  });
});
