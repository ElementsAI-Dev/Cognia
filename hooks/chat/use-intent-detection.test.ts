/**
 * Tests for useIntentDetection hook
 */

import { renderHook, act } from '@testing-library/react';
import { useIntentDetection } from './use-intent-detection';
import { getEnhancedModeSuggestion } from '@/lib/ai/tools/intent-detection';
import type { ChatMode } from '@/types/core/session';

// Mock the intent detection library
jest.mock('@/lib/ai/tools/intent-detection', () => ({
  getEnhancedModeSuggestion: jest.fn(),
}));

const mockGetEnhancedModeSuggestion = getEnhancedModeSuggestion as jest.MockedFunction<typeof getEnhancedModeSuggestion>;

describe('useIntentDetection', () => {
  const defaultMockResult = {
    shouldSuggest: false,
    suggestedMode: null,
    reason: '',
    confidence: 0,
    direction: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetEnhancedModeSuggestion.mockReturnValue(defaultMockResult);
  });

  describe('initialization', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() => 
        useIntentDetection({ currentMode: 'chat' })
      );

      expect(result.current.detectionResult).toBeNull();
      expect(result.current.showSuggestion).toBe(false);
      expect(result.current.suggestionCount).toBe(0);
      expect(typeof result.current.checkIntent).toBe('function');
      expect(typeof result.current.acceptSuggestion).toBe('function');
      expect(typeof result.current.dismissSuggestion).toBe('function');
      expect(typeof result.current.keepCurrentMode).toBe('function');
      expect(typeof result.current.resetSuggestion).toBe('function');
    });

    it('should accept custom options', () => {
      const mockOnModeSwitch = jest.fn();
      const { result } = renderHook(() => 
        useIntentDetection({ 
          currentMode: 'learning',
          enabled: false,
          maxSuggestionsPerSession: 5,
          onModeSwitch: mockOnModeSwitch,
        })
      );

      expect(result.current.suggestionCount).toBe(0);
      expect(typeof result.current.checkIntent).toBe('function');
    });
  });

  describe('checkIntent', () => {
    it('should return no intent when disabled', () => {
      const { result } = renderHook(() => 
        useIntentDetection({ currentMode: 'chat', enabled: false })
      );

      const detectionResult = result.current.checkIntent('教我React');

      expect(detectionResult).toEqual({
        hasIntent: false,
        intentType: null,
        suggestedMode: null,
        confidence: 0,
        reason: '',
        matchedKeywords: [],
        direction: null,
      });

      expect(mockGetEnhancedModeSuggestion).not.toHaveBeenCalled();
      expect(result.current.showSuggestion).toBe(false);
    });

    it('should call getEnhancedModeSuggestion when enabled', () => {
      const { result } = renderHook(() => 
        useIntentDetection({ currentMode: 'chat' })
      );

      mockGetEnhancedModeSuggestion.mockReturnValue({
        shouldSuggest: true,
        suggestedMode: 'learning',
        reason: '检测到学习意图',
        confidence: 0.8,
        direction: 'specialize' as const,
      });

      const detectionResult = result.current.checkIntent('教我React');

      expect(mockGetEnhancedModeSuggestion).toHaveBeenCalledWith(
        '教我React',
        'chat',
        0
      );
      expect(detectionResult.hasIntent).toBe(true);
      expect(detectionResult.suggestedMode).toBe('learning');
      expect(detectionResult.intentType).toBe('learning');
      expect(detectionResult.confidence).toBe(0.8);
      expect(detectionResult.direction).toBe('specialize');
    });

    it('should show suggestion when criteria are met', () => {
      const { result } = renderHook(() => 
        useIntentDetection({ currentMode: 'chat' })
      );

      mockGetEnhancedModeSuggestion.mockReturnValue({
        shouldSuggest: true,
        suggestedMode: 'learning',
        reason: '检测到学习意图',
        confidence: 0.8,
        direction: 'specialize' as const,
      });

      act(() => {
        result.current.checkIntent('教我React');
      });

      expect(result.current.showSuggestion).toBe(true);
      expect(result.current.detectionResult).not.toBeNull();
      expect(result.current.detectionResult?.suggestedMode).toBe('learning');
      expect(result.current.suggestionCount).toBe(1);
    });

    it('should not show suggestion when shouldSuggest is false', () => {
      const { result } = renderHook(() => 
        useIntentDetection({ currentMode: 'chat' })
      );

      mockGetEnhancedModeSuggestion.mockReturnValue({
        shouldSuggest: false,
        suggestedMode: 'learning',
        reason: '检测到学习意图',
        confidence: 0.8,
        direction: null,
      });

      act(() => {
        result.current.checkIntent('教我React');
      });

      expect(result.current.showSuggestion).toBe(false);
      expect(result.current.detectionResult).toBeNull();
      expect(result.current.suggestionCount).toBe(0);
    });

    it('should not show suggestion when suggestedMode is null', () => {
      const { result } = renderHook(() => 
        useIntentDetection({ currentMode: 'chat' })
      );

      mockGetEnhancedModeSuggestion.mockReturnValue({
        shouldSuggest: true,
        suggestedMode: null,
        reason: '',
        confidence: 0.8,
        direction: 'specialize' as const,
      });

      act(() => {
        result.current.checkIntent('教我React');
      });

      expect(result.current.showSuggestion).toBe(false);
      expect(result.current.detectionResult).toBeNull();
      expect(result.current.suggestionCount).toBe(0);
    });

    it('should not show suggestion when mode was dismissed', () => {
      const { result } = renderHook(() => 
        useIntentDetection({ currentMode: 'chat' })
      );

      // First suggestion
      mockGetEnhancedModeSuggestion.mockReturnValue({
        shouldSuggest: true,
        suggestedMode: 'learning',
        reason: '检测到学习意图',
        confidence: 0.8,
        direction: 'specialize' as const,
      });

      act(() => {
        result.current.checkIntent('教我React');
      });

      expect(result.current.showSuggestion).toBe(true);

      // Dismiss the suggestion
      act(() => {
        result.current.dismissSuggestion();
      });

      expect(result.current.showSuggestion).toBe(false);

      // Try to suggest the same mode again
      act(() => {
        result.current.checkIntent('教我更多React');
      });

      expect(result.current.showSuggestion).toBe(false);
      expect(result.current.suggestionCount).toBe(1);
    });

    it('should not show suggestion when keepCurrent is true', () => {
      const { result } = renderHook(() => 
        useIntentDetection({ currentMode: 'chat' })
      );

      mockGetEnhancedModeSuggestion.mockReturnValue({
        shouldSuggest: true,
        suggestedMode: 'learning',
        reason: '检测到学习意图',
        confidence: 0.8,
        direction: 'specialize' as const,
      });

      // User chooses to keep current mode
      act(() => {
        result.current.checkIntent('教我React');
        result.current.keepCurrentMode();
      });

      expect(result.current.showSuggestion).toBe(false);

      // Try to suggest again
      act(() => {
        result.current.checkIntent('教我更多React');
      });

      expect(result.current.showSuggestion).toBe(false);
    });

    it('should not show suggestion when max suggestions reached', () => {
      const { result } = renderHook(() => 
        useIntentDetection({ currentMode: 'chat', maxSuggestionsPerSession: 2 })
      );

      // First suggestion
      mockGetEnhancedModeSuggestion.mockReturnValue({
        shouldSuggest: true,
        suggestedMode: 'learning',
        reason: '检测到学习意图',
        confidence: 0.8,
        direction: 'specialize' as const,
      });

      act(() => {
        result.current.checkIntent('教我React');
      });
      expect(result.current.suggestionCount).toBe(1);
      expect(result.current.showSuggestion).toBe(true);

      // Dismiss first suggestion to allow second one
      act(() => {
        result.current.dismissSuggestion();
      });
      expect(result.current.showSuggestion).toBe(false);

      // Second suggestion (different mode)
      mockGetEnhancedModeSuggestion.mockReturnValue({
        shouldSuggest: true,
        suggestedMode: 'research',
        reason: '检测到研究意图',
        confidence: 0.8,
        direction: 'specialize' as const,
      });

      act(() => {
        result.current.checkIntent('找一些论文');
      });
      expect(result.current.suggestionCount).toBe(2);
      expect(result.current.showSuggestion).toBe(true);

      // Dismiss second suggestion
      act(() => {
        result.current.dismissSuggestion();
      });
      expect(result.current.showSuggestion).toBe(false);

      // Third suggestion - should not show due to limit
      mockGetEnhancedModeSuggestion.mockReturnValue({
        shouldSuggest: true,
        suggestedMode: 'agent',
        reason: '检测到复杂任务意图',
        confidence: 0.8,
        direction: 'specialize' as const,
      });

      act(() => {
        result.current.checkIntent('创建一个PPT');
      });

      expect(result.current.suggestionCount).toBe(2);
      expect(result.current.showSuggestion).toBe(false);
    });

    it('should map intent types correctly', () => {
      const { result } = renderHook(() => 
        useIntentDetection({ currentMode: 'chat' })
      );

      // Test learning mode
      mockGetEnhancedModeSuggestion.mockReturnValue({
        shouldSuggest: true,
        suggestedMode: 'learning',
        reason: '检测到学习意图',
        confidence: 0.8,
        direction: 'specialize' as const,
      });

      let detectionResult = result.current.checkIntent('教我React');
      expect(detectionResult.intentType).toBe('learning');

      // Test research mode
      mockGetEnhancedModeSuggestion.mockReturnValue({
        shouldSuggest: true,
        suggestedMode: 'research',
        reason: '检测到研究意图',
        confidence: 0.8,
        direction: 'specialize' as const,
      });

      detectionResult = result.current.checkIntent('找一些论文');
      expect(detectionResult.intentType).toBe('research');

      // Test agent mode
      mockGetEnhancedModeSuggestion.mockReturnValue({
        shouldSuggest: true,
        suggestedMode: 'agent',
        reason: '检测到复杂任务意图',
        confidence: 0.8,
        direction: 'specialize' as const,
      });

      detectionResult = result.current.checkIntent('创建一个PPT');
      expect(detectionResult.intentType).toBe('agent');

      // Test unknown mode
      mockGetEnhancedModeSuggestion.mockReturnValue({
        shouldSuggest: true,
        suggestedMode: 'chat',
        reason: '检测到聊天意图',
        confidence: 0.8,
        direction: 'generalize' as const,
      });

      detectionResult = result.current.checkIntent('你好');
      expect(detectionResult.intentType).toBeNull();
    });
  });

  describe('acceptSuggestion', () => {
    it('should call onModeSwitch when suggestion is accepted', () => {
      const mockOnModeSwitch = jest.fn();
      const { result } = renderHook(() => 
        useIntentDetection({ currentMode: 'chat', onModeSwitch: mockOnModeSwitch })
      );

      mockGetEnhancedModeSuggestion.mockReturnValue({
        shouldSuggest: true,
        suggestedMode: 'learning',
        reason: '检测到学习意图',
        confidence: 0.8,
        direction: 'specialize' as const,
      });

      act(() => {
        result.current.checkIntent('教我React');
      });

      act(() => {
        result.current.acceptSuggestion();
      });

      expect(mockOnModeSwitch).toHaveBeenCalledWith('learning');
      expect(result.current.showSuggestion).toBe(false);
      expect(result.current.detectionResult).toBeNull();
    });

    it('should not call onModeSwitch when no suggestion exists', () => {
      const mockOnModeSwitch = jest.fn();
      const { result } = renderHook(() => 
        useIntentDetection({ currentMode: 'chat', onModeSwitch: mockOnModeSwitch })
      );

      act(() => {
        result.current.acceptSuggestion();
      });

      expect(mockOnModeSwitch).not.toHaveBeenCalled();
      expect(result.current.showSuggestion).toBe(false);
      expect(result.current.detectionResult).toBeNull();
    });

    it('should not call onModeSwitch when onModeSwitch is not provided', () => {
      const { result } = renderHook(() => 
        useIntentDetection({ currentMode: 'chat' })
      );

      mockGetEnhancedModeSuggestion.mockReturnValue({
        shouldSuggest: true,
        suggestedMode: 'learning',
        reason: '检测到学习意图',
        confidence: 0.8,
        direction: 'specialize' as const,
      });

      act(() => {
        result.current.checkIntent('教我React');
      });

      act(() => {
        result.current.acceptSuggestion();
      });

      expect(result.current.showSuggestion).toBe(false);
      expect(result.current.detectionResult).toBeNull();
    });
  });

  describe('dismissSuggestion', () => {
    it('should add mode to dismissed set and hide suggestion', () => {
      const { result } = renderHook(() => 
        useIntentDetection({ currentMode: 'chat' })
      );

      mockGetEnhancedModeSuggestion.mockReturnValue({
        shouldSuggest: true,
        suggestedMode: 'learning',
        reason: '检测到学习意图',
        confidence: 0.8,
        direction: 'specialize' as const,
      });

      act(() => {
        result.current.checkIntent('教我React');
      });

      expect(result.current.showSuggestion).toBe(true);

      act(() => {
        result.current.dismissSuggestion();
      });

      expect(result.current.showSuggestion).toBe(false);
      expect(result.current.detectionResult).toBeNull();

      // Try to suggest the same mode again
      act(() => {
        result.current.checkIntent('教我更多React');
      });

      expect(result.current.showSuggestion).toBe(false);
    });

    it('should handle dismiss when no suggestion exists', () => {
      const { result } = renderHook(() => 
        useIntentDetection({ currentMode: 'chat' })
      );

      act(() => {
        result.current.dismissSuggestion();
      });

      expect(result.current.showSuggestion).toBe(false);
      expect(result.current.detectionResult).toBeNull();
    });
  });

  describe('keepCurrentMode', () => {
    it('should set keepCurrent flag and hide suggestion', () => {
      const { result } = renderHook(() => 
        useIntentDetection({ currentMode: 'chat' })
      );

      mockGetEnhancedModeSuggestion.mockReturnValue({
        shouldSuggest: true,
        suggestedMode: 'learning',
        reason: '检测到学习意图',
        confidence: 0.8,
        direction: 'specialize' as const,
      });

      act(() => {
        result.current.checkIntent('教我React');
      });

      expect(result.current.showSuggestion).toBe(true);

      act(() => {
        result.current.keepCurrentMode();
      });

      expect(result.current.showSuggestion).toBe(false);
      expect(result.current.detectionResult).toBeNull();

      // Try to suggest again
      act(() => {
        result.current.checkIntent('教我更多React');
      });

      expect(result.current.showSuggestion).toBe(false);
    });
  });

  describe('resetSuggestion', () => {
    it('should reset all suggestion state', () => {
      const { result } = renderHook(() => 
        useIntentDetection({ currentMode: 'chat' })
      );

      mockGetEnhancedModeSuggestion.mockReturnValue({
        shouldSuggest: true,
        suggestedMode: 'learning',
        reason: '检测到学习意图',
        confidence: 0.8,
        direction: 'specialize' as const,
      });

      // Create a suggestion and dismiss it
      act(() => {
        result.current.checkIntent('教我React');
        result.current.dismissSuggestion();
      });

      expect(result.current.suggestionCount).toBe(1);
      expect(result.current.showSuggestion).toBe(false);

      // Reset
      act(() => {
        result.current.resetSuggestion();
      });

      expect(result.current.suggestionCount).toBe(0);
      expect(result.current.showSuggestion).toBe(false);
      expect(result.current.detectionResult).toBeNull();

      // Should be able to suggest again
      act(() => {
        result.current.checkIntent('教我React');
      });

      expect(result.current.showSuggestion).toBe(true);
      expect(result.current.suggestionCount).toBe(1);
    });
  });

  describe('mode change handling', () => {
    it('should reset state when mode changes', () => {
      const { result, rerender } = renderHook(
        ({ currentMode }) => useIntentDetection({ currentMode }),
        { initialProps: { currentMode: 'chat' as ChatMode } }
      );

      mockGetEnhancedModeSuggestion.mockReturnValue({
        shouldSuggest: true,
        suggestedMode: 'learning',
        reason: '检测到学习意图',
        confidence: 0.8,
        direction: 'specialize' as const,
      });

      // Create state in chat mode
      act(() => {
        result.current.checkIntent('教我React');
      });
      expect(result.current.suggestionCount).toBe(1);
      expect(result.current.showSuggestion).toBe(true);

      // Dismiss the suggestion
      act(() => {
        result.current.dismissSuggestion();
      });
      expect(result.current.showSuggestion).toBe(false);

      // Change mode - note: suggestionCount is NOT reset by the hook
      rerender({ currentMode: 'learning' as ChatMode });

      // State should be reset except suggestionCount
      expect(result.current.suggestionCount).toBe(1); // Remains from previous
      expect(result.current.showSuggestion).toBe(false);
      expect(result.current.detectionResult).toBeNull();
    });

    it('should not reset state when mode stays the same', () => {
      const { result, rerender } = renderHook(
        ({ currentMode }) => useIntentDetection({ currentMode }),
        { initialProps: { currentMode: 'chat' as ChatMode } }
      );

      mockGetEnhancedModeSuggestion.mockReturnValue({
        shouldSuggest: true,
        suggestedMode: 'learning',
        reason: '检测到学习意图',
        confidence: 0.8,
        direction: 'specialize' as const,
      });

      // Create state
      act(() => {
        result.current.checkIntent('教我React');
      });

      expect(result.current.suggestionCount).toBe(1);
      expect(result.current.showSuggestion).toBe(true);

      // Rerender with same mode
      rerender({ currentMode: 'chat' as ChatMode });

      // State should be preserved
      expect(result.current.suggestionCount).toBe(1);
      expect(result.current.showSuggestion).toBe(true);
    });
  });

  describe('dependency array', () => {
    it('should update checkIntent when dependencies change', () => {
      const { result, rerender } = renderHook(
        ({ enabled, maxSuggestionsPerSession }) => 
          useIntentDetection({ 
            currentMode: 'chat', 
            enabled, 
            maxSuggestionsPerSession 
          }),
        { 
          initialProps: { 
            enabled: true, 
            maxSuggestionsPerSession: 3 
          } 
        }
      );

      mockGetEnhancedModeSuggestion.mockReturnValue({
        shouldSuggest: true,
        suggestedMode: 'learning',
        reason: '检测到学习意图',
        confidence: 0.8,
        direction: 'specialize' as const,
      });

      // First call
      act(() => {
        result.current.checkIntent('教我React');
      });
      expect(mockGetEnhancedModeSuggestion).toHaveBeenCalledWith('教我React', 'chat', 0);

      // Clear mock
      mockGetEnhancedModeSuggestion.mockClear();

      // Change dependency
      rerender({ enabled: false, maxSuggestionsPerSession: 3 });

      act(() => {
        result.current.checkIntent('教我React');
      });

      // Should not call getEnhancedModeSuggestion when disabled
      expect(mockGetEnhancedModeSuggestion).not.toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should handle empty message', () => {
      const { result } = renderHook(() => 
        useIntentDetection({ currentMode: 'chat' })
      );

      const detectionResult = result.current.checkIntent('');

      expect(detectionResult).toBeDefined();
      expect(detectionResult.hasIntent).toBe(false);
    });

    it('should handle null/undefined suggestedMode from backend', () => {
      const { result } = renderHook(() => 
        useIntentDetection({ currentMode: 'chat' })
      );

      mockGetEnhancedModeSuggestion.mockReturnValue({
        shouldSuggest: true,
        suggestedMode: null,
        reason: '',
        confidence: 0.8,
        direction: 'specialize' as const,
      });

      act(() => {
        result.current.checkIntent('教我React');
      });

      expect(result.current.showSuggestion).toBe(false);
      expect(result.current.detectionResult).toBeNull();
    });

    it('should handle multiple rapid calls', () => {
      const { result } = renderHook(() => 
        useIntentDetection({ currentMode: 'chat' })
      );

      mockGetEnhancedModeSuggestion.mockReturnValue({
        shouldSuggest: true,
        suggestedMode: 'learning',
        reason: '检测到学习意图',
        confidence: 0.8,
        direction: 'specialize' as const,
      });

      // Multiple rapid calls - each call increments count if shouldSuggest is true
      act(() => {
        result.current.checkIntent('教我React');
        result.current.checkIntent('教我更多React');
        result.current.checkIntent('教我高级React');
      });

      // Each call increments the count because shouldSuggest is true
      expect(result.current.suggestionCount).toBe(3);
      expect(result.current.showSuggestion).toBe(true);
    });
  });
});

describe('useIntentDetection - different modes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should work in learning mode', () => {
    const { result } = renderHook(() => 
      useIntentDetection({ currentMode: 'learning' })
    );

    mockGetEnhancedModeSuggestion.mockReturnValue({
      shouldSuggest: true,
      suggestedMode: 'chat',
      reason: '检测到聊天意图',
      confidence: 0.8,
      direction: 'generalize' as const,
    });

    const detectionResult = result.current.checkIntent('你好');

    expect(detectionResult.hasIntent).toBe(true);
    expect(detectionResult.suggestedMode).toBe('chat');
    expect(detectionResult.intentType).toBeNull(); // chat mode maps to null
  });

  it('should work in research mode', () => {
    const { result } = renderHook(() => 
      useIntentDetection({ currentMode: 'research' })
    );

    mockGetEnhancedModeSuggestion.mockReturnValue({
      shouldSuggest: true,
      suggestedMode: 'agent',
      reason: '检测到复杂任务意图',
      confidence: 0.8,
      direction: 'specialize' as const,
    });

    const detectionResult = result.current.checkIntent('创建一个PPT');

    expect(detectionResult.hasIntent).toBe(true);
    expect(detectionResult.suggestedMode).toBe('agent');
    expect(detectionResult.intentType).toBe('agent');
  });

  it('should work in agent mode', () => {
    const { result } = renderHook(() => 
      useIntentDetection({ currentMode: 'agent' })
    );

    mockGetEnhancedModeSuggestion.mockReturnValue({
      shouldSuggest: true,
      suggestedMode: 'chat',
      reason: '检测到聊天意图',
      confidence: 0.8,
      direction: 'generalize' as const,
    });

    const detectionResult = result.current.checkIntent('随便聊聊');

    expect(detectionResult.hasIntent).toBe(true);
    expect(detectionResult.suggestedMode).toBe('chat');
    expect(detectionResult.intentType).toBeNull();
  });
});
