/**
 * Tests for useInputCompletionUnified hook
 */

import { renderHook, act } from '@testing-library/react';
import { useInputCompletionUnified } from './use-input-completion-unified';
import type { CompletionProviderType } from '@/types/chat/input-completion';

// Mock useMention hook
const mockHandleMentionChange = jest.fn();
const mockSelectMention = jest.fn();
const mockCloseMention = jest.fn();
const mockParseToolCalls = jest.fn();

jest.mock('@/hooks/ui/use-mention', () => ({
  useMention: jest.fn(() => ({
    mentionState: { isOpen: false, query: '', position: 0 },
    groupedMentions: new Map(),
    filteredMentions: [],
    handleTextChange: mockHandleMentionChange,
    selectMention: mockSelectMention.mockReturnValue({ newText: 'updated text' }),
    closeMention: mockCloseMention,
    parseToolCalls: mockParseToolCalls.mockReturnValue([]),
    isMcpAvailable: true,
  })),
}));

// Mock slash command registry
jest.mock('@/lib/chat/slash-command-registry', () => ({
  searchCommands: jest.fn((query: string) => {
    if (!query) {
      return [
        { id: 'help', command: 'help', description: 'Show help', category: 'general', params: [] },
        { id: 'clear', command: 'clear', description: 'Clear chat', category: 'general', params: [] },
      ];
    }
    return [{ id: 'help', command: 'help', description: 'Show help', category: 'general', params: [] }].filter(
      (cmd) => cmd.command.includes(query)
    );
  }),
}));

// Mock emoji data
jest.mock('@/lib/chat/emoji-data', () => ({
  searchEmojis: jest.fn((query: string, max: number) => {
    if (!query) return [];
    const emojis = [
      { name: 'smile', emoji: '😊', category: 'Smileys', keywords: ['happy'] },
      { name: 'heart', emoji: '❤️', category: 'Symbols', keywords: ['love'] },
    ];
    return emojis.filter((e) => e.name.includes(query)).slice(0, max);
  }),
}));

// Mock logger
jest.mock('@/lib/logger', () => {
  const mockLogger = {
    trace: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    fatal: jest.fn(),
  };
  return {
    createLogger: jest.fn(() => mockLogger),
    logger: mockLogger,
    loggers: new Proxy({}, { get: () => mockLogger }),
    log: {
      trace: jest.fn(),
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    },
    logContext: { newTraceId: jest.fn(), getTraceId: jest.fn() },
    generateTraceId: jest.fn(),
    traced: jest.fn(),
    logSampler: { shouldSample: jest.fn(() => true) },
    initLogger: jest.fn(),
    addTransport: jest.fn(),
    removeTransport: jest.fn(),
    updateLoggerConfig: jest.fn(),
    getLoggerConfig: jest.fn(),
    flushLogs: jest.fn(),
    shutdownLogger: jest.fn(),
  };
});

describe('useInputCompletionUnified', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useInputCompletionUnified());

      expect(result.current.state.isOpen).toBe(false);
      expect(result.current.state.activeProvider).toBeNull();
      expect(result.current.state.trigger).toBeNull();
      expect(result.current.state.query).toBe('');
      expect(result.current.state.items).toEqual([]);
      expect(result.current.state.selectedIndex).toBe(0);
      expect(result.current.state.ghostText).toBeNull();
      expect(result.current.currentText).toBe('');
    });

    it('should return mention data from useMention', () => {
      const { result } = renderHook(() => useInputCompletionUnified());

      expect(result.current.mentionData).toBeDefined();
      expect(result.current.mentionData.mentionState).toBeDefined();
      expect(result.current.mentionData.groupedMentions).toBeDefined();
      expect(result.current.mentionData.filteredMentions).toBeDefined();
      expect(result.current.mentionData.isMcpAvailable).toBe(true);
    });

    it('should accept custom providers', () => {
      const customProviders = [
        { type: 'slash' as CompletionProviderType, trigger: 'symbol' as const, triggerChar: '/', priority: 100, enabled: true },
      ];

      const { result } = renderHook(() =>
        useInputCompletionUnified({ providers: customProviders })
      );

      expect(result.current.state.isOpen).toBe(false);
    });
  });

  describe('handleInputChange', () => {
    it('should detect @ mention trigger', () => {
      const { result } = renderHook(() => useInputCompletionUnified());

      act(() => {
        result.current.handleInputChange('@test', 5);
      });

      expect(result.current.state.activeProvider).toBe('mention');
      expect(result.current.state.trigger).toBe('@');
      expect(result.current.state.query).toBe('test');
    });

    it('should detect / slash command trigger', () => {
      const { result } = renderHook(() => useInputCompletionUnified());

      act(() => {
        result.current.handleInputChange('/hel', 4);
      });

      expect(result.current.state.activeProvider).toBe('slash');
      expect(result.current.state.trigger).toBe('/');
      expect(result.current.state.query).toBe('hel');
      expect(result.current.state.items.length).toBeGreaterThan(0);
    });

    it('should detect : emoji trigger', () => {
      const { result } = renderHook(() => useInputCompletionUnified());

      act(() => {
        result.current.handleInputChange(':smi', 4);
      });

      expect(result.current.state.activeProvider).toBe('emoji');
      expect(result.current.state.trigger).toBe(':');
      expect(result.current.state.query).toBe('smi');
    });

    it('should close completion when no trigger detected', () => {
      const { result } = renderHook(() => useInputCompletionUnified());

      // First trigger completion
      act(() => {
        result.current.handleInputChange('/help', 5);
      });

      expect(result.current.state.isOpen).toBe(true);

      // Then type without trigger
      act(() => {
        result.current.handleInputChange('hello world', 11);
      });

      expect(result.current.state.isOpen).toBe(false);
    });

    it('should update currentText', () => {
      const { result } = renderHook(() => useInputCompletionUnified());

      act(() => {
        result.current.handleInputChange('some text', 9);
      });

      expect(result.current.currentText).toBe('some text');
    });

    it('should call handleMentionChange from useMention', () => {
      const { result } = renderHook(() => useInputCompletionUnified());

      act(() => {
        result.current.handleInputChange('@test', 5);
      });

      expect(mockHandleMentionChange).toHaveBeenCalledWith('@test', 5);
    });

    it('should require trigger at start or after whitespace', () => {
      const { result } = renderHook(() => useInputCompletionUnified());

      // Trigger after text without space - should not trigger
      act(() => {
        result.current.handleInputChange('text/help', 9);
      });

      expect(result.current.state.isOpen).toBe(false);

      // Trigger after space - should trigger
      act(() => {
        result.current.handleInputChange('text /help', 10);
      });

      expect(result.current.state.isOpen).toBe(true);
      expect(result.current.state.activeProvider).toBe('slash');
    });
  });

  describe('handleKeyDown', () => {
    it('should handle ArrowUp navigation', () => {
      const { result } = renderHook(() => useInputCompletionUnified());

      // Trigger slash command completion
      act(() => {
        result.current.handleInputChange('/h', 2);
      });

      // Create mock event
      const event = new KeyboardEvent('keydown', { key: 'ArrowUp' });
      Object.defineProperty(event, 'preventDefault', { value: jest.fn() });

      act(() => {
        const handled = result.current.handleKeyDown(event);
        expect(handled).toBe(true);
      });

      expect(event.preventDefault).toHaveBeenCalled();
    });

    it('should handle ArrowDown navigation', () => {
      const { result } = renderHook(() => useInputCompletionUnified());

      act(() => {
        result.current.handleInputChange('/', 1);
      });

      const event = new KeyboardEvent('keydown', { key: 'ArrowDown' });
      Object.defineProperty(event, 'preventDefault', { value: jest.fn() });

      act(() => {
        const handled = result.current.handleKeyDown(event);
        expect(handled).toBe(true);
      });

      expect(result.current.state.selectedIndex).toBe(1);
    });

    it('should handle Tab to select item', () => {
      const { result } = renderHook(() => useInputCompletionUnified());

      act(() => {
        result.current.handleInputChange('/help', 5);
      });

      const event = new KeyboardEvent('keydown', { key: 'Tab' });
      Object.defineProperty(event, 'preventDefault', { value: jest.fn() });

      act(() => {
        const handled = result.current.handleKeyDown(event);
        expect(handled).toBe(true);
      });

      expect(event.preventDefault).toHaveBeenCalled();
    });

    it('should handle Enter to select item', () => {
      const { result } = renderHook(() => useInputCompletionUnified());

      act(() => {
        result.current.handleInputChange('/help', 5);
      });

      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      Object.defineProperty(event, 'preventDefault', { value: jest.fn() });

      act(() => {
        const handled = result.current.handleKeyDown(event);
        expect(handled).toBe(true);
      });

      expect(event.preventDefault).toHaveBeenCalled();
    });

    it('should handle Escape to close completion', () => {
      const { result } = renderHook(() => useInputCompletionUnified());

      act(() => {
        result.current.handleInputChange('/help', 5);
      });

      expect(result.current.state.isOpen).toBe(true);

      const event = new KeyboardEvent('keydown', { key: 'Escape' });
      Object.defineProperty(event, 'preventDefault', { value: jest.fn() });

      act(() => {
        result.current.handleKeyDown(event);
      });

      expect(result.current.state.isOpen).toBe(false);
    });

    it('should return false when completion is closed', () => {
      const { result } = renderHook(() => useInputCompletionUnified());

      const event = new KeyboardEvent('keydown', { key: 'ArrowDown' });

      let handled: boolean = true;
      act(() => {
        handled = result.current.handleKeyDown(event);
      });

      expect(handled).toBe(false);
    });

    it('should wrap around when navigating past end', () => {
      const { result } = renderHook(() => useInputCompletionUnified());

      act(() => {
        result.current.handleInputChange('/', 1);
      });

      const itemCount = result.current.state.items.length;

      // Navigate to last item
      for (let i = 0; i < itemCount; i++) {
        const event = new KeyboardEvent('keydown', { key: 'ArrowDown' });
        Object.defineProperty(event, 'preventDefault', { value: jest.fn() });
        act(() => {
          result.current.handleKeyDown(event);
        });
      }

      // Should wrap to 0
      expect(result.current.state.selectedIndex).toBe(0);
    });
  });

  describe('selectItem', () => {
    it('should select slash command item', () => {
      const onSelect = jest.fn();
      const { result } = renderHook(() =>
        useInputCompletionUnified({ onSelect })
      );

      act(() => {
        result.current.handleInputChange('/help', 5);
      });

      act(() => {
        result.current.selectItem(0);
      });

      expect(onSelect).toHaveBeenCalled();
      expect(result.current.state.isOpen).toBe(false);
    });

    it('should use selectedIndex when index not provided', () => {
      const { result } = renderHook(() => useInputCompletionUnified());

      act(() => {
        result.current.handleInputChange('/', 1);
      });

      // Move to second item
      const event = new KeyboardEvent('keydown', { key: 'ArrowDown' });
      Object.defineProperty(event, 'preventDefault', { value: jest.fn() });
      act(() => {
        result.current.handleKeyDown(event);
      });

      act(() => {
        result.current.selectItem();
      });

      expect(result.current.state.isOpen).toBe(false);
    });
  });

  describe('closeCompletion', () => {
    it('should close completion and reset state', () => {
      const { result } = renderHook(() => useInputCompletionUnified());

      act(() => {
        result.current.handleInputChange('/help', 5);
      });

      expect(result.current.state.isOpen).toBe(true);

      act(() => {
        result.current.closeCompletion();
      });

      expect(result.current.state.isOpen).toBe(false);
      expect(result.current.state.activeProvider).toBeNull();
      expect(mockCloseMention).toHaveBeenCalled();
    });
  });

  describe('triggerCompletion', () => {
    it('should manually trigger mention completion', () => {
      const { result } = renderHook(() => useInputCompletionUnified());

      act(() => {
        result.current.triggerCompletion('mention');
      });

      expect(result.current.state.activeProvider).toBe('mention');
    });

    it('should manually trigger slash completion', () => {
      const { result } = renderHook(() => useInputCompletionUnified());

      act(() => {
        result.current.triggerCompletion('slash');
      });

      expect(result.current.state.activeProvider).toBe('slash');
      expect(result.current.state.items.length).toBeGreaterThan(0);
    });

    it('should default to mention when type not specified', () => {
      const { result } = renderHook(() => useInputCompletionUnified());

      act(() => {
        result.current.triggerCompletion();
      });

      expect(result.current.state.activeProvider).toBe('mention');
    });

    it('should not trigger disabled provider', () => {
      const customProviders = [
        { type: 'slash' as CompletionProviderType, trigger: 'symbol' as const, triggerChar: '/', priority: 100, enabled: false },
      ];

      const { result } = renderHook(() =>
        useInputCompletionUnified({ providers: customProviders })
      );

      act(() => {
        result.current.triggerCompletion('slash');
      });

      // Should not open because provider is disabled
      expect(result.current.state.isOpen).toBe(false);
    });
  });

  describe('ghost text', () => {
    it('should return null from getGhostText initially', () => {
      const { result } = renderHook(() => useInputCompletionUnified());

      expect(result.current.getGhostText()).toBeNull();
    });

    it('should handle Tab to accept ghost text', () => {
      const { result } = renderHook(() => useInputCompletionUnified());

      // Manually set ghost text state for testing
      // Since ghost text is set internally, we test the keyboard handler
      const event = new KeyboardEvent('keydown', { key: 'Tab' });
      Object.defineProperty(event, 'preventDefault', { value: jest.fn() });

      act(() => {
        result.current.handleKeyDown(event);
      });

      // Without ghost text, should return false when completion closed
      expect(result.current.getGhostText()).toBeNull();
    });

    it('should dismiss ghost text', () => {
      const { result } = renderHook(() => useInputCompletionUnified());

      act(() => {
        result.current.dismissGhostText();
      });

      expect(result.current.state.ghostText).toBeNull();
    });

    it('should accept ghost text and update currentText', () => {
      const { result } = renderHook(() => useInputCompletionUnified());

      act(() => {
        result.current.handleInputChange('hello', 5);
      });

      act(() => {
        result.current.acceptGhostText();
      });

      // Ghost text is null, so no change expected
      expect(result.current.currentText).toBe('hello');
    });
  });

  describe('parseToolCalls', () => {
    it('should have parseToolCalls function from useMention', () => {
      const { result } = renderHook(() => useInputCompletionUnified());

      expect(typeof result.current.parseToolCalls).toBe('function');

      // Call the function
      const calls = result.current.parseToolCalls('some text');

      // Should return an array (empty or with items depending on mock)
      expect(Array.isArray(calls)).toBe(true);
    });
  });

  describe('callbacks', () => {
    it('should call onStateChange when state changes', () => {
      const onStateChange = jest.fn();
      const { result } = renderHook(() =>
        useInputCompletionUnified({ onStateChange })
      );

      act(() => {
        result.current.handleInputChange('/help', 5);
      });

      expect(onStateChange).toHaveBeenCalled();
    });

    it('should call onSelect when item selected', () => {
      const onSelect = jest.fn();
      const { result } = renderHook(() =>
        useInputCompletionUnified({ onSelect })
      );

      act(() => {
        result.current.handleInputChange('/help', 5);
      });

      act(() => {
        result.current.selectItem(0);
      });

      expect(onSelect).toHaveBeenCalled();
    });
  });

  describe('provider priority', () => {
    it('should check providers in priority order', () => {
      const { result } = renderHook(() => useInputCompletionUnified());

      // @ has higher priority than /
      act(() => {
        result.current.handleInputChange('@test /help', 5);
      });

      // Should detect @ mention first (higher priority)
      expect(result.current.state.activeProvider).toBe('mention');
    });
  });

  describe('edge cases', () => {
    it('should handle empty text', () => {
      const { result } = renderHook(() => useInputCompletionUnified());

      act(() => {
        result.current.handleInputChange('', 0);
      });

      expect(result.current.state.isOpen).toBe(false);
      expect(result.current.currentText).toBe('');
    });

    it('should handle cursor at start', () => {
      const { result } = renderHook(() => useInputCompletionUnified());

      act(() => {
        result.current.handleInputChange('/help', 0);
      });

      // Cursor is at position 0, so query is empty from text before cursor
      expect(result.current.state.isOpen).toBe(false);
    });

    it('should handle special characters in query', () => {
      const { result } = renderHook(() => useInputCompletionUnified());

      act(() => {
        result.current.handleInputChange(':smile_', 7);
      });

      expect(result.current.state.activeProvider).toBe('emoji');
    });
  });
});
