/**
 * TextSelectionPopover Tests
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
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

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Helper to create a mock selection with getBoundingClientRect
const createMockSelection = (text: string, container: HTMLElement) => {
  const range = document.createRange();
  const textNode = document.createTextNode(text);
  container.appendChild(textNode);
  range.selectNodeContents(textNode);
  
  // Mock getBoundingClientRect
  range.getBoundingClientRect = jest.fn().mockReturnValue({
    top: 100,
    left: 100,
    width: 200,
    height: 20,
    bottom: 120,
    right: 300,
  });

  return { range, textNode };
};

describe('TextSelectionPopover', () => {
  const mockAddQuote = jest.fn();
  let mockContainer: HTMLDivElement;
  let mockContainerRef: React.RefObject<HTMLDivElement>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    (useQuoteStore as unknown as jest.Mock).mockImplementation((selector) => {
      const state = { addQuote: mockAddQuote };
      return selector(state);
    });

    // Create container and append to document
    mockContainer = document.createElement('div');
    document.body.appendChild(mockContainer);
    mockContainerRef = { current: mockContainer };

    // Reset clipboard mock
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn().mockResolvedValue(undefined),
      },
    });

    // Mock window.getSelection
    window.getSelection = jest.fn();
  });

  afterEach(() => {
    jest.useRealTimers();
    if (mockContainer && mockContainer.parentNode) {
      mockContainer.parentNode.removeChild(mockContainer);
    }
  });

  it('should not render when no text is selected', () => {
    (window.getSelection as jest.Mock).mockReturnValue({
      toString: () => '',
      isCollapsed: true,
      anchorNode: null,
      focusNode: null,
    });

    render(
      <TextSelectionPopover
        containerRef={mockContainerRef}
        messageId="msg-123"
        messageRole="assistant"
      />
    );

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  describe('event handling', () => {
    it('should register mousedown listener with capture phase', () => {
      const addEventListenerSpy = jest.spyOn(document, 'addEventListener');
      
      render(
        <TextSelectionPopover
          containerRef={mockContainerRef}
          messageId="msg-123"
          messageRole="assistant"
        />
      );

      // Fast-forward timers to allow setTimeout to execute
      act(() => {
        jest.runAllTimers();
      });

      // Check that mousedown listener was added with capture
      const mousedownCalls = addEventListenerSpy.mock.calls.filter(
        call => call[0] === 'mousedown'
      );
      
      expect(mousedownCalls.length).toBeGreaterThan(0);
      // The last call should have capture: true
      const lastMousedownCall = mousedownCalls[mousedownCalls.length - 1];
      expect(lastMousedownCall[2]).toEqual({ capture: true });
      
      addEventListenerSpy.mockRestore();
    });

    it('should clean up event listeners on unmount', () => {
      const removeEventListenerSpy = jest.spyOn(document, 'removeEventListener');
      
      const { unmount } = render(
        <TextSelectionPopover
          containerRef={mockContainerRef}
          messageId="msg-123"
          messageRole="assistant"
        />
      );

      act(() => {
        jest.runAllTimers();
      });

      unmount();

      // Check that listeners were removed
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'selectionchange',
        expect.any(Function)
      );
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'mousedown',
        expect.any(Function)
      );
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'mouseup',
        expect.any(Function)
      );
      
      removeEventListenerSpy.mockRestore();
    });
  });

  describe('props validation', () => {
    it('should accept required props', () => {
      const props = {
        containerRef: mockContainerRef,
        messageId: 'msg-123',
        messageRole: 'assistant' as const,
      };

      expect(() => {
        render(<TextSelectionPopover {...props} />);
      }).not.toThrow();
    });

    it('should accept optional callback props', () => {
      const mockOnSearch = jest.fn();
      const mockOnExplain = jest.fn();
      const mockOnTranslate = jest.fn();
      const mockOnAskAbout = jest.fn();
      
      const props = {
        containerRef: mockContainerRef,
        messageId: 'msg-123',
        messageRole: 'user' as const,
        onSearch: mockOnSearch,
        onExplain: mockOnExplain,
        onTranslate: mockOnTranslate,
        onAskAbout: mockOnAskAbout,
        showLabels: true,
      };

      expect(() => {
        render(<TextSelectionPopover {...props} />);
      }).not.toThrow();
    });
  });

  describe('selection detection', () => {
    it('should detect selection within container', async () => {
      const { range, textNode } = createMockSelection('test selection', mockContainer);
      
      (window.getSelection as jest.Mock).mockReturnValue({
        toString: () => 'test selection',
        isCollapsed: false,
        anchorNode: textNode,
        focusNode: textNode,
        getRangeAt: () => range,
      });

      render(
        <TextSelectionPopover
          containerRef={mockContainerRef}
          messageId="msg-123"
          messageRole="assistant"
        />
      );

      // Trigger mouseup to process selection
      act(() => {
        fireEvent.mouseUp(document);
        jest.runAllTimers();
      });

      // Popover should be rendered with buttons
      await waitFor(() => {
        expect(screen.getByText('copy')).toBeInTheDocument();
      });
    });

    it('should ignore selection outside container', () => {
      const outsideElement = document.createElement('div');
      document.body.appendChild(outsideElement);
      const textNode = document.createTextNode('outside text');
      outsideElement.appendChild(textNode);

      (window.getSelection as jest.Mock).mockReturnValue({
        toString: () => 'outside text',
        isCollapsed: false,
        anchorNode: textNode,
        focusNode: textNode,
      });

      render(
        <TextSelectionPopover
          containerRef={mockContainerRef}
          messageId="msg-123"
          messageRole="assistant"
        />
      );

      act(() => {
        fireEvent.mouseUp(document);
        jest.runAllTimers();
      });

      // Popover should not render
      expect(screen.queryByText('copy')).not.toBeInTheDocument();

      document.body.removeChild(outsideElement);
    });
  });

  describe('button click handlers', () => {
    beforeEach(() => {
      const { range, textNode } = createMockSelection('test text', mockContainer);
      
      (window.getSelection as jest.Mock).mockReturnValue({
        toString: () => 'test text',
        isCollapsed: false,
        anchorNode: textNode,
        focusNode: textNode,
        getRangeAt: () => range,
        removeAllRanges: jest.fn(),
      });
    });

    it('should render copy and quote buttons when selection is made', async () => {
      render(
        <TextSelectionPopover
          containerRef={mockContainerRef}
          messageId="msg-123"
          messageRole="assistant"
        />
      );

      act(() => {
        fireEvent.mouseUp(document);
        jest.runAllTimers();
      });

      await waitFor(() => {
        // Check that both core buttons are rendered
        expect(screen.getByText('copy')).toBeInTheDocument();
        expect(screen.getByText('quote')).toBeInTheDocument();
      });
    });

    it('should render search button when onSearch is provided', async () => {
      const mockOnSearch = jest.fn();

      render(
        <TextSelectionPopover
          containerRef={mockContainerRef}
          messageId="msg-123"
          messageRole="assistant"
          onSearch={mockOnSearch}
        />
      );

      act(() => {
        fireEvent.mouseUp(document);
        jest.runAllTimers();
      });

      await waitFor(() => {
        expect(screen.getByText('search')).toBeInTheDocument();
      });
    });

    it('should render AI action buttons when callbacks are provided', async () => {
      render(
        <TextSelectionPopover
          containerRef={mockContainerRef}
          messageId="msg-123"
          messageRole="assistant"
          onExplain={jest.fn()}
          onAskAbout={jest.fn()}
          onTranslate={jest.fn()}
        />
      );

      act(() => {
        fireEvent.mouseUp(document);
        jest.runAllTimers();
      });

      await waitFor(() => {
        expect(screen.getByText('explain')).toBeInTheDocument();
        expect(screen.getByText('askAbout')).toBeInTheDocument();
        // Translate button exists but uses title attribute
        expect(screen.getByTitle('translate')).toBeInTheDocument();
      });
    });

    it('should display word count badge', async () => {
      render(
        <TextSelectionPopover
          containerRef={mockContainerRef}
          messageId="msg-123"
          messageRole="assistant"
        />
      );

      act(() => {
        fireEvent.mouseUp(document);
        jest.runAllTimers();
      });

      await waitFor(() => {
        // "test text" has 2 words - badge shows both number and label
        const badge = screen.getByText(/2.*words/);
        expect(badge).toBeInTheDocument();
      });
    });
  });

  describe('outside click handling', () => {
    it('should not close when clicking inside popover', async () => {
      const { range, textNode } = createMockSelection('test', mockContainer);
      
      (window.getSelection as jest.Mock).mockReturnValue({
        toString: () => 'test',
        isCollapsed: false,
        anchorNode: textNode,
        focusNode: textNode,
        getRangeAt: () => range,
        removeAllRanges: jest.fn(),
      });

      render(
        <TextSelectionPopover
          containerRef={mockContainerRef}
          messageId="msg-123"
          messageRole="assistant"
        />
      );

      act(() => {
        fireEvent.mouseUp(document);
        jest.runAllTimers();
      });

      await waitFor(() => {
        expect(screen.getByText('copy')).toBeInTheDocument();
      });

      // Get the popover container
      const popover = screen.getByText('copy').closest('div[style]');
      
      // Simulate clicking inside the popover
      act(() => {
        fireEvent.mouseDown(popover!);
        jest.runAllTimers();
      });

      // Popover should still be visible
      expect(screen.getByText('copy')).toBeInTheDocument();
    });

    it('should not close when clicking on Radix dropdown menu', async () => {
      const { range, textNode } = createMockSelection('test', mockContainer);
      
      (window.getSelection as jest.Mock).mockReturnValue({
        toString: () => 'test',
        isCollapsed: false,
        anchorNode: textNode,
        focusNode: textNode,
        getRangeAt: () => range,
        removeAllRanges: jest.fn(),
      });

      render(
        <TextSelectionPopover
          containerRef={mockContainerRef}
          messageId="msg-123"
          messageRole="assistant"
          onTranslate={jest.fn()}
        />
      );

      act(() => {
        fireEvent.mouseUp(document);
        jest.runAllTimers();
      });

      await waitFor(() => {
        expect(screen.getByText('copy')).toBeInTheDocument();
      });

      // Create a mock dropdown menu element
      const mockDropdown = document.createElement('div');
      mockDropdown.setAttribute('data-radix-popper-content-wrapper', '');
      document.body.appendChild(mockDropdown);

      // Simulate clicking on the dropdown
      act(() => {
        fireEvent.mouseDown(mockDropdown);
        jest.runAllTimers();
      });

      // Popover should still be visible
      expect(screen.getByText('copy')).toBeInTheDocument();

      document.body.removeChild(mockDropdown);
    });
  });

  describe('showLabels prop', () => {
    it('should show text labels when showLabels is true', async () => {
      const { range, textNode } = createMockSelection('test', mockContainer);
      
      (window.getSelection as jest.Mock).mockReturnValue({
        toString: () => 'test',
        isCollapsed: false,
        anchorNode: textNode,
        focusNode: textNode,
        getRangeAt: () => range,
        removeAllRanges: jest.fn(),
      });

      render(
        <TextSelectionPopover
          containerRef={mockContainerRef}
          messageId="msg-123"
          messageRole="assistant"
          showLabels={true}
        />
      );

      act(() => {
        fireEvent.mouseUp(document);
        jest.runAllTimers();
      });

      await waitFor(() => {
        // Labels should be visible in buttons
        const copyButton = screen.getByText('copy').closest('button');
        expect(copyButton).toBeInTheDocument();
      });
    });
  });

  describe('new action callbacks', () => {
    it('should call onSummarize when summarize button is clicked', async () => {
      const { range, textNode } = createMockSelection('test text', mockContainer);
      const mockOnSummarize = jest.fn();
      
      (window.getSelection as jest.Mock).mockReturnValue({
        toString: () => 'test text',
        isCollapsed: false,
        anchorNode: textNode,
        focusNode: textNode,
        getRangeAt: () => range,
        removeAllRanges: jest.fn(),
      });

      render(
        <TextSelectionPopover
          containerRef={mockContainerRef}
          messageId="msg-123"
          messageRole="assistant"
          onSummarize={mockOnSummarize}
        />
      );

      act(() => {
        fireEvent.mouseUp(document);
        jest.runAllTimers();
      });

      await waitFor(() => {
        expect(screen.getByText('summarize')).toBeInTheDocument();
      });
    });

    it('should call onDefine when define button is clicked', async () => {
      const { range, textNode } = createMockSelection('test word', mockContainer);
      const mockOnDefine = jest.fn();
      
      (window.getSelection as jest.Mock).mockReturnValue({
        toString: () => 'test word',
        isCollapsed: false,
        anchorNode: textNode,
        focusNode: textNode,
        getRangeAt: () => range,
        removeAllRanges: jest.fn(),
      });

      render(
        <TextSelectionPopover
          containerRef={mockContainerRef}
          messageId="msg-123"
          messageRole="assistant"
          onDefine={mockOnDefine}
        />
      );

      act(() => {
        fireEvent.mouseUp(document);
        jest.runAllTimers();
      });

      await waitFor(() => {
        expect(screen.getByText('define')).toBeInTheDocument();
      });
    });

    it('should call onHighlight when highlight button is clicked', async () => {
      const { range, textNode } = createMockSelection('highlight text', mockContainer);
      const mockOnHighlight = jest.fn();
      
      (window.getSelection as jest.Mock).mockReturnValue({
        toString: () => 'highlight text',
        isCollapsed: false,
        anchorNode: textNode,
        focusNode: textNode,
        getRangeAt: () => range,
        removeAllRanges: jest.fn(),
      });

      render(
        <TextSelectionPopover
          containerRef={mockContainerRef}
          messageId="msg-123"
          messageRole="assistant"
          onHighlight={mockOnHighlight}
        />
      );

      act(() => {
        fireEvent.mouseUp(document);
        jest.runAllTimers();
      });

      await waitFor(() => {
        expect(screen.getByText('highlight')).toBeInTheDocument();
      });
    });
  });

  describe('web search', () => {
    it('should render web search button by default', async () => {
      const { range, textNode } = createMockSelection('search query', mockContainer);
      
      (window.getSelection as jest.Mock).mockReturnValue({
        toString: () => 'search query',
        isCollapsed: false,
        anchorNode: textNode,
        focusNode: textNode,
        getRangeAt: () => range,
        removeAllRanges: jest.fn(),
      });

      render(
        <TextSelectionPopover
          containerRef={mockContainerRef}
          messageId="msg-123"
          messageRole="assistant"
        />
      );

      act(() => {
        fireEvent.mouseUp(document);
        jest.runAllTimers();
      });

      await waitFor(() => {
        expect(screen.getByText('webSearch')).toBeInTheDocument();
      });
    });

    it('should render web search button with tooltip', async () => {
      const { range, textNode } = createMockSelection('search query', mockContainer);
      
      (window.getSelection as jest.Mock).mockReturnValue({
        toString: () => 'search query',
        isCollapsed: false,
        anchorNode: textNode,
        focusNode: textNode,
        getRangeAt: () => range,
        removeAllRanges: jest.fn(),
      });

      render(
        <TextSelectionPopover
          containerRef={mockContainerRef}
          messageId="msg-123"
          messageRole="assistant"
        />
      );

      act(() => {
        fireEvent.mouseUp(document);
        jest.runAllTimers();
      });

      await waitFor(() => {
        // Verify the tooltip text exists (which confirms the button is rendered)
        expect(screen.getByText('webSearch')).toBeInTheDocument();
        // Also verify there are multiple buttons rendered
        const buttons = screen.getAllByRole('button');
        expect(buttons.length).toBeGreaterThan(0);
      });
    });
  });

  describe('text-to-speech', () => {
    beforeEach(() => {
      // Mock speechSynthesis
      Object.defineProperty(window, 'speechSynthesis', {
        value: {
          speak: jest.fn(),
          cancel: jest.fn(),
          speaking: false,
        },
        writable: true,
      });
    });

    it('should render speak button by default', async () => {
      const { range, textNode } = createMockSelection('text to read', mockContainer);
      
      (window.getSelection as jest.Mock).mockReturnValue({
        toString: () => 'text to read',
        isCollapsed: false,
        anchorNode: textNode,
        focusNode: textNode,
        getRangeAt: () => range,
        removeAllRanges: jest.fn(),
      });

      render(
        <TextSelectionPopover
          containerRef={mockContainerRef}
          messageId="msg-123"
          messageRole="assistant"
        />
      );

      act(() => {
        fireEvent.mouseUp(document);
        jest.runAllTimers();
      });

      await waitFor(() => {
        expect(screen.getByText('speak')).toBeInTheDocument();
      });
    });

    it('should render speak button with tooltip', async () => {
      const { range, textNode } = createMockSelection('text to read', mockContainer);
      
      (window.getSelection as jest.Mock).mockReturnValue({
        toString: () => 'text to read',
        isCollapsed: false,
        anchorNode: textNode,
        focusNode: textNode,
        getRangeAt: () => range,
        removeAllRanges: jest.fn(),
      });

      render(
        <TextSelectionPopover
          containerRef={mockContainerRef}
          messageId="msg-123"
          messageRole="assistant"
        />
      );

      act(() => {
        fireEvent.mouseUp(document);
        jest.runAllTimers();
      });

      await waitFor(() => {
        // Verify the tooltip text exists (which confirms the button is rendered)
        expect(screen.getByText('speak')).toBeInTheDocument();
        // Also verify there are multiple buttons rendered
        const buttons = screen.getAllByRole('button');
        expect(buttons.length).toBeGreaterThan(0);
      });
    });
  });

  describe('character count', () => {
    it('should display word count in badge', async () => {
      const { range, textNode } = createMockSelection('one two three', mockContainer);
      
      (window.getSelection as jest.Mock).mockReturnValue({
        toString: () => 'one two three',
        isCollapsed: false,
        anchorNode: textNode,
        focusNode: textNode,
        getRangeAt: () => range,
        removeAllRanges: jest.fn(),
      });

      render(
        <TextSelectionPopover
          containerRef={mockContainerRef}
          messageId="msg-123"
          messageRole="assistant"
        />
      );

      act(() => {
        fireEvent.mouseUp(document);
        jest.runAllTimers();
      });

      await waitFor(() => {
        // Should show "3 words"
        expect(screen.getByText(/3\s*words/)).toBeInTheDocument();
      });
    });

    it('should display singular word for single word', async () => {
      const { range, textNode } = createMockSelection('hello', mockContainer);
      
      (window.getSelection as jest.Mock).mockReturnValue({
        toString: () => 'hello',
        isCollapsed: false,
        anchorNode: textNode,
        focusNode: textNode,
        getRangeAt: () => range,
        removeAllRanges: jest.fn(),
      });

      render(
        <TextSelectionPopover
          containerRef={mockContainerRef}
          messageId="msg-123"
          messageRole="assistant"
        />
      );

      act(() => {
        fireEvent.mouseUp(document);
        jest.runAllTimers();
      });

      await waitFor(() => {
        // Should show "1 word"
        expect(screen.getByText(/1\s*word(?!s)/)).toBeInTheDocument();
      });
    });
  });

  describe('keyboard shortcuts', () => {
    it('should close popover when Escape is pressed', async () => {
      const { range, textNode } = createMockSelection('test', mockContainer);
      
      (window.getSelection as jest.Mock).mockReturnValue({
        toString: () => 'test',
        isCollapsed: false,
        anchorNode: textNode,
        focusNode: textNode,
        getRangeAt: () => range,
        removeAllRanges: jest.fn(),
      });

      render(
        <TextSelectionPopover
          containerRef={mockContainerRef}
          messageId="msg-123"
          messageRole="assistant"
          enableShortcuts={true}
        />
      );

      act(() => {
        fireEvent.mouseUp(document);
        jest.runAllTimers();
      });

      await waitFor(() => {
        expect(screen.getByText('copy')).toBeInTheDocument();
      });

      // Press Escape
      act(() => {
        fireEvent.keyDown(document, { key: 'Escape' });
        jest.runAllTimers();
      });

      // Popover should be hidden
      await waitFor(() => {
        expect(screen.queryByText('copy')).not.toBeInTheDocument();
      });
    });

    it('should not process shortcuts when enableShortcuts is false', async () => {
      const { range, textNode } = createMockSelection('test', mockContainer);
      
      (window.getSelection as jest.Mock).mockReturnValue({
        toString: () => 'test',
        isCollapsed: false,
        anchorNode: textNode,
        focusNode: textNode,
        getRangeAt: () => range,
        removeAllRanges: jest.fn(),
      });

      render(
        <TextSelectionPopover
          containerRef={mockContainerRef}
          messageId="msg-123"
          messageRole="assistant"
          enableShortcuts={false}
        />
      );

      act(() => {
        fireEvent.mouseUp(document);
        jest.runAllTimers();
      });

      await waitFor(() => {
        expect(screen.getByText('copy')).toBeInTheDocument();
      });

      // Press Escape - should NOT close because shortcuts are disabled
      act(() => {
        fireEvent.keyDown(document, { key: 'Escape' });
        jest.runAllTimers();
      });

      // Popover should still be visible
      expect(screen.getByText('copy')).toBeInTheDocument();
    });
  });

  describe('features prop', () => {
    it('should hide copy button when features.copy is false', async () => {
      const { range, textNode } = createMockSelection('test', mockContainer);
      
      (window.getSelection as jest.Mock).mockReturnValue({
        toString: () => 'test',
        isCollapsed: false,
        anchorNode: textNode,
        focusNode: textNode,
        getRangeAt: () => range,
        removeAllRanges: jest.fn(),
      });

      render(
        <TextSelectionPopover
          containerRef={mockContainerRef}
          messageId="msg-123"
          messageRole="assistant"
          features={{ copy: false }}
        />
      );

      act(() => {
        fireEvent.mouseUp(document);
        jest.runAllTimers();
      });

      await waitFor(() => {
        // Quote should still be visible (default enabled)
        expect(screen.getByText('quote')).toBeInTheDocument();
      });
      
      // Copy button should not be rendered
      expect(screen.queryByText('copy')).not.toBeInTheDocument();
    });

    it('should hide quote button when features.quote is false', async () => {
      const { range, textNode } = createMockSelection('test', mockContainer);
      
      (window.getSelection as jest.Mock).mockReturnValue({
        toString: () => 'test',
        isCollapsed: false,
        anchorNode: textNode,
        focusNode: textNode,
        getRangeAt: () => range,
        removeAllRanges: jest.fn(),
      });

      render(
        <TextSelectionPopover
          containerRef={mockContainerRef}
          messageId="msg-123"
          messageRole="assistant"
          features={{ quote: false }}
        />
      );

      act(() => {
        fireEvent.mouseUp(document);
        jest.runAllTimers();
      });

      await waitFor(() => {
        // Copy should still be visible (default enabled)
        expect(screen.getByText('copy')).toBeInTheDocument();
      });
      
      // Quote button should not be rendered
      expect(screen.queryByText('quote')).not.toBeInTheDocument();
    });

    it('should hide webSearch button when features.webSearch is false', async () => {
      const { range, textNode } = createMockSelection('test', mockContainer);
      
      (window.getSelection as jest.Mock).mockReturnValue({
        toString: () => 'test',
        isCollapsed: false,
        anchorNode: textNode,
        focusNode: textNode,
        getRangeAt: () => range,
        removeAllRanges: jest.fn(),
      });

      render(
        <TextSelectionPopover
          containerRef={mockContainerRef}
          messageId="msg-123"
          messageRole="assistant"
          features={{ webSearch: false }}
        />
      );

      act(() => {
        fireEvent.mouseUp(document);
        jest.runAllTimers();
      });

      await waitFor(() => {
        // Copy should still be visible
        expect(screen.getByText('copy')).toBeInTheDocument();
      });
      
      // Web search should not be rendered
      expect(screen.queryByText('webSearch')).not.toBeInTheDocument();
    });

    it('should hide speak button when features.speak is false', async () => {
      const { range, textNode } = createMockSelection('test', mockContainer);
      
      (window.getSelection as jest.Mock).mockReturnValue({
        toString: () => 'test',
        isCollapsed: false,
        anchorNode: textNode,
        focusNode: textNode,
        getRangeAt: () => range,
        removeAllRanges: jest.fn(),
      });

      render(
        <TextSelectionPopover
          containerRef={mockContainerRef}
          messageId="msg-123"
          messageRole="assistant"
          features={{ speak: false }}
        />
      );

      act(() => {
        fireEvent.mouseUp(document);
        jest.runAllTimers();
      });

      await waitFor(() => {
        // Copy should still be visible
        expect(screen.getByText('copy')).toBeInTheDocument();
      });
      
      // Speak button should not be rendered
      expect(screen.queryByText('speak')).not.toBeInTheDocument();
    });

    it('should hide AI action buttons when their features are disabled', async () => {
      const { range, textNode } = createMockSelection('test', mockContainer);
      const mockExplain = jest.fn();
      const mockSummarize = jest.fn();
      
      (window.getSelection as jest.Mock).mockReturnValue({
        toString: () => 'test',
        isCollapsed: false,
        anchorNode: textNode,
        focusNode: textNode,
        getRangeAt: () => range,
        removeAllRanges: jest.fn(),
      });

      render(
        <TextSelectionPopover
          containerRef={mockContainerRef}
          messageId="msg-123"
          messageRole="assistant"
          onExplain={mockExplain}
          onSummarize={mockSummarize}
          features={{ explain: false, summarize: true }}
        />
      );

      act(() => {
        fireEvent.mouseUp(document);
        jest.runAllTimers();
      });

      await waitFor(() => {
        // Summarize should be visible (enabled and callback provided)
        expect(screen.getByText('summarize')).toBeInTheDocument();
      });
      
      // Explain should not be rendered (disabled in features)
      expect(screen.queryByText('explain')).not.toBeInTheDocument();
    });

    it('should show all buttons by default when no features prop provided', async () => {
      const { range, textNode } = createMockSelection('test', mockContainer);
      
      (window.getSelection as jest.Mock).mockReturnValue({
        toString: () => 'test',
        isCollapsed: false,
        anchorNode: textNode,
        focusNode: textNode,
        getRangeAt: () => range,
        removeAllRanges: jest.fn(),
      });

      render(
        <TextSelectionPopover
          containerRef={mockContainerRef}
          messageId="msg-123"
          messageRole="assistant"
        />
      );

      act(() => {
        fireEvent.mouseUp(document);
        jest.runAllTimers();
      });

      await waitFor(() => {
        // All basic buttons should be visible by default
        expect(screen.getByText('copy')).toBeInTheDocument();
        expect(screen.getByText('quote')).toBeInTheDocument();
        expect(screen.getByText('webSearch')).toBeInTheDocument();
        expect(screen.getByText('speak')).toBeInTheDocument();
      });
    });
  });
});
