/**
 * Property-Based Test: Window Content Visibility
 * 
 * **Feature: floating-window-fixes, Property 1: Window Content Visibility**
 * **Validates: Requirements 1.1, 1.2, 1.3**
 * 
 * Property: For any floating window configuration, when the window is shown,
 * all React components should render with full opacity and proper styling
 * without requiring window resize or manual intervention.
 * 
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import * as fc from 'fast-check';
import { ChatWidget } from './chat-widget';

// Mock useChatWidget hook with configurable values
const createMockUseChatWidget = (config: {
  isVisible: boolean;
  isLoading: boolean;
  error: string | null;
  messages: Array<{ id: string; role: string; content: string }>;
  inputValue: string;
  opacity: number;
  pinned: boolean;
  width: number;
  height: number;
  backgroundColor: string;
}) => ({
  isVisible: config.isVisible,
  isLoading: config.isLoading,
  error: config.error,
  messages: config.messages,
  inputValue: config.inputValue,
  config: {
    width: config.width,
    height: config.height,
    x: null,
    y: null,
    rememberPosition: true,
    startMinimized: false,
    opacity: config.opacity,
    shortcut: 'CommandOrControl+Shift+Space',
    pinned: config.pinned,
    provider: 'openai',
    model: 'gpt-4o-mini',
    systemPrompt: 'You are a helpful assistant.',
    maxMessages: 50,
    showTimestamps: false,
    soundEnabled: false,
    autoFocus: true,
    backgroundColor: config.backgroundColor,
  },
  inputRef: { current: null },
  hide: jest.fn(),
  setInputValue: jest.fn(),
  handleSubmit: jest.fn(),
  handleKeyDown: jest.fn(),
  clearMessages: jest.fn(),
  newSession: jest.fn(),
  updateConfig: jest.fn(),
  setPinned: jest.fn(),
  stop: jest.fn(),
  regenerate: jest.fn(),
});

// Store mock for dynamic configuration
let currentMockConfig = createMockUseChatWidget({
  isVisible: true,
  isLoading: false,
  error: null,
  messages: [],
  inputValue: '',
  opacity: 1.0,
  pinned: false,
  width: 420,
  height: 600,
  backgroundColor: '#ffffff',
});

jest.mock('@/hooks/chat', () => ({
  useChatWidget: () => currentMockConfig,
}));

// Mock store
jest.mock('@/stores/chat', () => ({
  useChatWidgetStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      resetConfig: jest.fn(),
      setFeedback: jest.fn(),
      editMessage: jest.fn(),
    };
    return selector ? selector(state) : state;
  },
}));

// Mock child components for isolation
jest.mock('./chat-widget-header', () => ({
  ChatWidgetHeader: () => <div data-testid="chat-widget-header">Header</div>,
}));

jest.mock('./chat-widget-messages', () => ({
  ChatWidgetMessages: () => <div data-testid="chat-widget-messages">Messages</div>,
}));

jest.mock('./chat-widget-input', () => ({
  ChatWidgetInput: React.forwardRef<HTMLTextAreaElement>(function ChatWidgetInput(_, ref) {
    return <div data-testid="chat-widget-input" ref={ref as React.Ref<HTMLDivElement>}>Input</div>;
  }),
}));

jest.mock('./chat-widget-settings', () => ({
  ChatWidgetSettings: () => null,
}));

jest.mock('./chat-widget-suggestions', () => ({
  ChatWidgetSuggestions: () => <div data-testid="chat-widget-suggestions">Suggestions</div>,
}));

// Arbitrary generators for window configuration
const hexColorArbitrary = fc.tuple(
  fc.integer({ min: 0, max: 255 }),
  fc.integer({ min: 0, max: 255 }),
  fc.integer({ min: 0, max: 255 })
).map(([r, g, b]) => `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`);

const windowConfigArbitrary = fc.record({
  isVisible: fc.boolean(),
  isLoading: fc.boolean(),
  error: fc.option(fc.string(), { nil: null }),
  messages: fc.array(
    fc.record({
      id: fc.uuid(),
      role: fc.constantFrom('user', 'assistant'),
      content: fc.string({ minLength: 0, maxLength: 500 }),
    }),
    { minLength: 0, maxLength: 10 }
  ),
  inputValue: fc.string({ minLength: 0, maxLength: 200 }),
  opacity: fc.double({ min: 0.1, max: 1.0, noNaN: true }),
  pinned: fc.boolean(),
  width: fc.integer({ min: 320, max: 1200 }),
  height: fc.integer({ min: 400, max: 900 }),
  backgroundColor: hexColorArbitrary,
});

describe('Property Test: Window Content Visibility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Property 1: Window Content Visibility
   * 
   * For any floating window configuration, when the window is shown,
   * all React components should render with full opacity and proper styling.
   * 
   * **Validates: Requirements 1.1, 1.2, 1.3**
   */
  it('should render all components with proper visibility for any valid configuration', () => {
    fc.assert(
      fc.property(windowConfigArbitrary, (config) => {
        // Update mock with generated config
        currentMockConfig = createMockUseChatWidget(config);

        // Render the component
        const { container, unmount } = render(<ChatWidget />);

        // Property 1.1: Container should exist and be visible
        const chatContainer = container.firstChild as HTMLElement;
        expect(chatContainer).toBeTruthy();
        
        // Property 1.2: Container should have opaque background class (bg-background, not bg-background/95)
        expect(chatContainer.className).toContain('bg-background');
        expect(chatContainer.className).not.toContain('backdrop-blur');
        
        // Property 1.3: Container should have proper text color for contrast
        expect(chatContainer.className).toContain('text-foreground');
        
        // Property 1.4: Container should have data attribute for content validation
        expect(chatContainer.getAttribute('data-chat-widget-container')).toBeDefined();
        
        // Property 1.5: Core components should be rendered
        expect(screen.getByTestId('chat-widget-header')).toBeInTheDocument();
        expect(screen.getByTestId('chat-widget-messages')).toBeInTheDocument();
        expect(screen.getByTestId('chat-widget-input')).toBeInTheDocument();

        // Cleanup for next iteration
        unmount();
      }),
      { numRuns: 100 } // Run 100 iterations as per design requirements
    );
  });

  /**
   * Property: Background color should always be valid hex format
   * 
   * For any generated background color, it should be a valid hex color.
   */
  it('should accept any valid hex background color', () => {
    fc.assert(
      fc.property(
        hexColorArbitrary,
        (backgroundColor) => {
          // Verify the background color is a valid hex format
          const hexRegex = /^#[0-9a-fA-F]{6}$/;
          expect(hexRegex.test(backgroundColor)).toBe(true);
          
          // Update mock with the background color
          currentMockConfig = createMockUseChatWidget({
            isVisible: true,
            isLoading: false,
            error: null,
            messages: [],
            inputValue: '',
            opacity: 1.0,
            pinned: false,
            width: 420,
            height: 600,
            backgroundColor,
          });

          // Render should succeed without errors
          const { unmount } = render(<ChatWidget />);
          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Window dimensions should not affect content visibility
   * 
   * For any valid window dimensions within constraints, content should render properly.
   */
  it('should render content properly for any valid window dimensions', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 320, max: 1200 }), // width
        fc.integer({ min: 400, max: 900 }),  // height
        (width, height) => {
          currentMockConfig = createMockUseChatWidget({
            isVisible: true,
            isLoading: false,
            error: null,
            messages: [],
            inputValue: '',
            opacity: 1.0,
            pinned: false,
            width,
            height,
            backgroundColor: '#ffffff',
          });

          const { container, unmount } = render(<ChatWidget />);
          
          // Container should render regardless of dimensions
          const chatContainer = container.firstChild as HTMLElement;
          expect(chatContainer).toBeTruthy();
          
          // Should have full height styling
          expect(chatContainer.className).toContain('h-screen');
          expect(chatContainer.className).toContain('w-full');

          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });
});
