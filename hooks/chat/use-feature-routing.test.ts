/**
 * Unit tests for useFeatureRouting hook
 */

import { renderHook, act } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import { useFeatureRouting } from './use-feature-routing';
import type { FeatureRoute, FeatureRouteResult, FeatureRoutingSettings } from '@/lib/ai/routing';

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
  })),
}));

jest.mock('@/stores', () => ({
  useSettingsStore: jest.fn(),
}));

jest.mock('@/lib/ai/routing', () => ({
  detectFeatureIntent: jest.fn(),
  detectFeatureIntentRuleBased: jest.fn(),
  mightTriggerFeatureRouting: jest.fn(),
  buildFeatureNavigationUrl: jest.fn(),
}));

import { useSettingsStore } from '@/stores';
import { 
  detectFeatureIntent, 
  detectFeatureIntentRuleBased, 
  mightTriggerFeatureRouting, 
  buildFeatureNavigationUrl
} from '@/lib/ai/routing';

// Mock implementations
const mockPush = jest.fn();
const mockRouter = { push: mockPush };
const mockUseRouter = useRouter as jest.Mock;
const mockUseSettingsStore = useSettingsStore as unknown as jest.Mock;
const mockDetectFeatureIntent = detectFeatureIntent as jest.Mock;
const mockDetectFeatureIntentRuleBased = detectFeatureIntentRuleBased as jest.Mock;
const mockMightTriggerFeatureRouting = mightTriggerFeatureRouting as jest.Mock;
const mockBuildFeatureNavigationUrl = buildFeatureNavigationUrl as jest.Mock;

// Test data
const mockFeatureRoute: FeatureRoute = {
  id: 'designer',
  name: 'Designer',
  nameZh: '设计师',
  path: '/designer',
  icon: 'palette',
  category: 'creation',
  description: 'Design tool',
  descriptionZh: '设计工具',
  patterns: {
    chinese: [/设计/],
    english: [/design/]
  },
  keywords: {
    chinese: ['设计'],
    english: ['design']
  },
  priority: 1,
  enabled: true,
  carryContext: true
};

const mockDetectionResult: FeatureRouteResult = {
  detected: true,
  feature: mockFeatureRoute,
  confidence: 0.8,
  matchedPatterns: ['design'],
  reason: 'Detected design intent',
  reasonZh: '检测到设计意图',
  alternatives: []
};

const defaultSettings: FeatureRoutingSettings = {
  enabled: true,
  routingMode: 'rule-based',
  confidenceThreshold: 0.7,
  autoNavigateThreshold: 0.9,
  autoNavigateEnabled: false,
  disabledRoutes: [],
  maxSuggestionsPerSession: 3,
  rememberPreferences: true,
  routePreferences: {} as Record<string, number>
};

describe('useFeatureRouting', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default router mock
    mockUseRouter.mockReturnValue(mockRouter);
    
    // Setup default store mock
    mockUseSettingsStore.mockImplementation((selector) => {
      const state = {
        featureRoutingSettings: defaultSettings,
        providerSettings: {
          openai: { apiKey: 'test-key', baseURL: 'https://api.openai.com' }
        },
        defaultProvider: 'openai'
      };
      return selector(state);
    });
    
    // Setup default routing mocks - ALWAYS reset to defaults
    mockMightTriggerFeatureRouting.mockReturnValue(true);
    mockDetectFeatureIntent.mockResolvedValue(mockDetectionResult);
    mockDetectFeatureIntentRuleBased.mockResolvedValue({
      detected: false,
      feature: null,
      confidence: 0,
      matchedPatterns: [],
      reason: '',
      reasonZh: '',
      alternatives: []
    });
    mockBuildFeatureNavigationUrl.mockReturnValue('/designer?message=test');
  });

  afterEach(() => {
    // Reset all mocks to prevent test interference
    jest.resetAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useFeatureRouting());
      
      expect(result.current.detectionResult).toBeNull();
      expect(result.current.hasPendingSuggestion).toBe(false);
      expect(result.current.pendingFeature).toBeNull();
      expect(result.current.pendingMessage).toBe('');
      expect(result.current.suggestionCount).toBe(0);
      expect(result.current.isEnabled).toBe(true);
    });

    it('should merge settings correctly', () => {
      const customSettings = {
        enabled: false,
        confidenceThreshold: 0.9
      };
      
      const { result } = renderHook(() => useFeatureRouting({ settings: customSettings }));
      
      expect(result.current.routingSettings.enabled).toBe(false);
      expect(result.current.routingSettings.confidenceThreshold).toBe(0.9);
      expect(result.current.routingSettings.autoNavigateThreshold).toBe(0.9);
    });

    it('should be disabled when routing is disabled', () => {
      mockUseSettingsStore.mockImplementation((selector) => {
        const state = {
          featureRoutingSettings: { ...defaultSettings, enabled: false },
          providerSettings: { openai: { apiKey: 'test-key', baseURL: 'https://api.openai.com' } },
          defaultProvider: 'openai'
        };
        return selector(state);
      });
      
      const { result } = renderHook(() => useFeatureRouting());
      
      expect(result.current.isEnabled).toBe(false);
    });
  });

  describe('checkFeatureIntent', () => {
    it('should not show suggestion for dismissed features', async () => {
      // Ensure fresh mock setup - this is critical
      const mockFeature = {
        id: 'designer',
        name: 'Designer',
        nameZh: '设计师',
        path: '/designer',
        icon: 'palette',
        category: 'creation',
        description: 'Design tool',
        descriptionZh: '设计工具',
        patterns: { chinese: [/设计/], english: [/design/] },
        keywords: { chinese: ['设计'], english: ['design'] },
        priority: 1,
        enabled: true,
        carryContext: true
      };
      
      const detectionResult = {
        detected: true,
        feature: mockFeature,
        confidence: 0.8,
        matchedPatterns: ['design'],
        reason: 'Detected design intent',
        reasonZh: '检测到设计意图',
        alternatives: []
      };
      
      mockDetectFeatureIntent.mockResolvedValue(detectionResult);
      
      const { result } = renderHook(() => useFeatureRouting());
      
      // Step 1: First detection should show suggestion
      await act(async () => {
        await result.current.checkFeatureIntent('design something');
      });
      
      expect(result.current.hasPendingSuggestion).toBe(true);
      expect(result.current.pendingFeature?.id).toBe('designer');
      
      // Step 2: Dismiss should clear suggestion
      await act(async () => {
        result.current.dismissSuggestion();
      });
      
      expect(result.current.hasPendingSuggestion).toBe(false);
      expect(result.current.pendingFeature).toBeNull();
      
      // Step 3: Second detection should not show suggestion (dismissed)
      await act(async () => {
        await result.current.checkFeatureIntent('design something else');
      });
      
      expect(result.current.hasPendingSuggestion).toBe(false);
      expect(result.current.pendingFeature).toBeNull();
    });

    it('should return no result when routing is disabled', async () => {
      mockUseSettingsStore.mockImplementation((selector) => {
        const state = {
          featureRoutingSettings: { ...defaultSettings, enabled: false },
          providerSettings: { openai: { apiKey: 'test-key', baseURL: 'https://api.openai.com' } },
          defaultProvider: 'openai'
        };
        return selector(state);
      });
      
      const { result } = renderHook(() => useFeatureRouting());
      
      const detectionResult = await result.current.checkFeatureIntent('test message');
      
      expect(detectionResult.detected).toBe(false);
      expect(detectionResult.feature).toBeNull();
      expect(mockDetectFeatureIntent).not.toHaveBeenCalled();
    });

    it('should return no result when message does not trigger routing', async () => {
      mockMightTriggerFeatureRouting.mockReturnValue(false);
      
      const { result } = renderHook(() => useFeatureRouting());
      
      const detectionResult = await result.current.checkFeatureIntent('test message');
      
      expect(detectionResult.detected).toBe(false);
      expect(detectionResult.feature).toBeNull();
      expect(mockDetectFeatureIntent).not.toHaveBeenCalled();
    });

    it('should detect feature intent and show suggestion', async () => {
      const onIntentDetected = jest.fn();
      const { result } = renderHook(() => useFeatureRouting({ onIntentDetected }));
      
      await act(async () => {
        await result.current.checkFeatureIntent('design something');
      });
      
      expect(result.current.detectionResult).toEqual(mockDetectionResult);
      expect(result.current.hasPendingSuggestion).toBe(true);
      expect(result.current.pendingFeature).toBe(mockFeatureRoute);
      expect(result.current.pendingMessage).toBe('design something');
      expect(result.current.suggestionCount).toBe(1);
      expect(onIntentDetected).toHaveBeenCalledWith(mockDetectionResult);
    });

    it('should not show suggestion for low confidence', async () => {
      const lowConfidenceResult: FeatureRouteResult = {
        ...mockDetectionResult,
        confidence: 0.5 // Lower than threshold of 0.7
      };
      mockDetectFeatureIntent.mockResolvedValue(lowConfidenceResult);
      
      const { result } = renderHook(() => useFeatureRouting());
      
      await act(async () => {
        await result.current.checkFeatureIntent('design something');
      });
      
      expect(result.current.hasPendingSuggestion).toBe(false);
      expect(result.current.pendingFeature).toBeNull();
    });

    it('should auto-navigate when confidence is high and auto-navigate is enabled', async () => {
      const onNavigate = jest.fn();
      const highConfidenceResult: FeatureRouteResult = {
        ...mockDetectionResult,
        confidence: 0.95
      };
      mockDetectFeatureIntent.mockResolvedValue(highConfidenceResult);
      
      mockUseSettingsStore.mockImplementation((selector) => {
        const state = {
          featureRoutingSettings: { 
            ...defaultSettings, 
            autoNavigateEnabled: true,
            autoNavigateThreshold: 0.9
          },
          providerSettings: { openai: { apiKey: 'test-key', baseURL: 'https://api.openai.com' } },
          defaultProvider: 'openai'
        };
        return selector(state);
      });
      
      const { result } = renderHook(() => useFeatureRouting({ onNavigate }));
      
      await act(async () => {
        await result.current.checkFeatureIntent('design something');
      });
      
      expect(mockPush).toHaveBeenCalledWith('/designer?message=test');
      expect(onNavigate).toHaveBeenCalledWith(mockFeatureRoute, '/designer?message=test');
      expect(result.current.hasPendingSuggestion).toBe(false);
    });
  });

  describe('confirmNavigation', () => {
    it('should navigate to pending feature and clear state', async () => {
      const onNavigate = jest.fn();
      const { result } = renderHook(() => useFeatureRouting({ onNavigate }));
      
      // Set up pending suggestion
      await act(async () => {
        await result.current.checkFeatureIntent('design something');
      });
      
      // Confirm navigation
      await act(async () => {
        result.current.confirmNavigation();
      });
      
      expect(mockPush).toHaveBeenCalledWith('/designer?message=test');
      expect(onNavigate).toHaveBeenCalledWith(mockFeatureRoute, '/designer?message=test');
      expect(result.current.hasPendingSuggestion).toBe(false);
      expect(result.current.pendingFeature).toBeNull();
      expect(result.current.pendingMessage).toBe('');
    });

    it('should not navigate if no pending feature', async () => {
      const { result } = renderHook(() => useFeatureRouting());
      
      await act(async () => {
        result.current.confirmNavigation();
      });
      
      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  describe('continueInChat', () => {
    it('should clear suggestion but keep message', async () => {
      const { result } = renderHook(() => useFeatureRouting());
      
      // Set up pending suggestion
      await act(async () => {
        await result.current.checkFeatureIntent('design something');
      });
      
      // Continue in chat
      await act(async () => {
        result.current.continueInChat();
      });
      
      expect(result.current.hasPendingSuggestion).toBe(false);
      expect(result.current.pendingFeature).toBeNull();
      expect(result.current.pendingMessage).toBe('design something'); // Should keep message
    });
  });

  describe('dismissSuggestion', () => {
    it('should dismiss suggestion and add to dismissed features', async () => {
      const { result } = renderHook(() => useFeatureRouting());
      
      // Set up pending suggestion
      await act(async () => {
        await result.current.checkFeatureIntent('design something');
      });
      
      // Dismiss suggestion
      await act(async () => {
        result.current.dismissSuggestion();
      });
      
      expect(result.current.hasPendingSuggestion).toBe(false);
      expect(result.current.pendingFeature).toBeNull();
      expect(result.current.pendingMessage).toBe('');
      
      // Try again - should not show suggestion
      await act(async () => {
        await result.current.checkFeatureIntent('design something else');
      });
      
      expect(result.current.hasPendingSuggestion).toBe(false);
    });
  });

  describe('resetState', () => {
    it('should reset all state to initial values', async () => {
      const { result } = renderHook(() => useFeatureRouting());
      
      // Set up some state
      await act(async () => {
        await result.current.checkFeatureIntent('design something');
        result.current.dismissSuggestion();
      });
      
      // Reset state
      await act(async () => {
        result.current.resetState();
      });
      
      expect(result.current.detectionResult).toBeNull();
      expect(result.current.hasPendingSuggestion).toBe(false);
      expect(result.current.pendingFeature).toBeNull();
      expect(result.current.pendingMessage).toBe('');
      expect(result.current.suggestionCount).toBe(0);
      
      // Should be able to show suggestion again after reset
      await act(async () => {
        await result.current.checkFeatureIntent('design something');
      });
      
      expect(result.current.hasPendingSuggestion).toBe(true);
    });
  });

  describe('callbacks', () => {
    it('should call onNavigate callback when navigation is triggered', async () => {
      const onNavigate = jest.fn();
      
      // Ensure fresh mock setup - this is critical
      const mockFeature = {
        id: 'designer',
        name: 'Designer',
        nameZh: '设计师',
        path: '/designer',
        icon: 'palette',
        category: 'creation',
        description: 'Design tool',
        descriptionZh: '设计工具',
        patterns: { chinese: [/设计/], english: [/design/] },
        keywords: { chinese: ['设计'], english: ['design'] },
        priority: 1,
        enabled: true,
        carryContext: true
      };
      
      const detectionResult = {
        detected: true,
        feature: mockFeature,
        confidence: 0.8,
        matchedPatterns: ['design'],
        reason: 'Detected design intent',
        reasonZh: '检测到设计意图',
        alternatives: []
      };
      
      mockDetectFeatureIntent.mockResolvedValue(detectionResult);
      mockBuildFeatureNavigationUrl.mockReturnValue('/designer?message=test');
      
      const { result } = renderHook(() => useFeatureRouting({ onNavigate }));
      
      // Step 1: Detect feature intent
      await act(async () => {
        await result.current.checkFeatureIntent('design something');
      });
      
      // Verify suggestion is shown
      expect(result.current.hasPendingSuggestion).toBe(true);
      expect(result.current.pendingFeature?.id).toBe('designer');
      
      // Step 2: Confirm navigation
      await act(async () => {
        result.current.confirmNavigation();
      });
      
      // Verify callback was called
      expect(onNavigate).toHaveBeenCalledWith(mockFeature, '/designer?message=test');
      
      // Verify state is cleared
      expect(result.current.hasPendingSuggestion).toBe(false);
      expect(result.current.pendingFeature).toBeNull();
    });

    it('should call onIntentDetected callback when intent is detected', async () => {
      const onIntentDetected = jest.fn();
      const { result } = renderHook(() => useFeatureRouting({ onIntentDetected }));
      
      await act(async () => {
        await result.current.checkFeatureIntent('design something');
      });
      
      expect(onIntentDetected).toHaveBeenCalledWith(mockDetectionResult);
    });
  });

  describe('LLM configuration', () => {
    it('should return undefined for rule-based mode', () => {
      mockUseSettingsStore.mockImplementation((selector) => {
        const state = {
          featureRoutingSettings: { ...defaultSettings, routingMode: 'rule-based' },
          providerSettings: { openai: { apiKey: 'test-key', baseURL: 'https://api.openai.com' } },
          defaultProvider: 'openai'
        };
        return selector(state);
      });
      
      const { result } = renderHook(() => useFeatureRouting());
      
      act(() => {
        result.current.checkFeatureIntent('test');
      });
      
      expect(mockDetectFeatureIntent).toHaveBeenCalledWith(
        'test',
        expect.any(Object),
        undefined
      );
    });

    it('should return undefined when no API key', () => {
      mockUseSettingsStore.mockImplementation((selector) => {
        const state = {
          featureRoutingSettings: { ...defaultSettings, routingMode: 'llm-based' },
          providerSettings: {},
          defaultProvider: 'openai'
        };
        return selector(state);
      });
      
      const { result } = renderHook(() => useFeatureRouting());
      
      act(() => {
        result.current.checkFeatureIntent('test');
      });
      
      expect(mockDetectFeatureIntent).toHaveBeenCalledWith(
        'test',
        expect.any(Object),
        undefined
      );
    });

    it('should return LLM config when API key is available', () => {
      mockUseSettingsStore.mockImplementation((selector) => {
        const state = {
          featureRoutingSettings: { ...defaultSettings, routingMode: 'llm-based' },
          providerSettings: { openai: { apiKey: 'test-key', baseURL: 'https://api.openai.com' } },
          defaultProvider: 'openai'
        };
        return selector(state);
      });
      
      const { result } = renderHook(() => useFeatureRouting());
      
      act(() => {
        result.current.checkFeatureIntent('test');
      });
      
      expect(mockDetectFeatureIntent).toHaveBeenCalledWith(
        'test',
        expect.any(Object),
        {
          apiKey: 'test-key',
          provider: 'openai',
          baseURL: 'https://api.openai.com'
        }
      );
    });
  });

  describe('edge cases', () => {
    it('should handle null feature in detection result', async () => {
      const nullFeatureResult: FeatureRouteResult = {
        detected: true,
        feature: null,
        confidence: 0.8,
        matchedPatterns: [],
        reason: '',
        reasonZh: '',
        alternatives: []
      };
      mockDetectFeatureIntent.mockResolvedValue(nullFeatureResult);
      
      const { result } = renderHook(() => useFeatureRouting());
      
      await act(async () => {
        await result.current.checkFeatureIntent('test');
      });
      
      expect(result.current.hasPendingSuggestion).toBe(false);
      expect(result.current.pendingFeature).toBeNull();
    });

    it('should handle empty message', async () => {
      const { result } = renderHook(() => useFeatureRouting());
      
      await act(async () => {
        await result.current.checkFeatureIntent('');
      });
      
      expect(result.current.detectionResult).toBeDefined();
    });

    it('should handle API errors gracefully', async () => {
      mockDetectFeatureIntent.mockRejectedValue(new Error('API Error'));
      
      const { result } = renderHook(() => useFeatureRouting());
      
      await expect(result.current.checkFeatureIntent('test')).rejects.toThrow('API Error');
    });
  });
});
