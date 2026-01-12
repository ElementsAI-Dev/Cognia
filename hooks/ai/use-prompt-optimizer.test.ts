/**
 * Tests for usePromptOptimizer hook
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { usePromptOptimizer } from './use-prompt-optimizer';

// Mock stores
jest.mock('@/stores', () => ({
  useSettingsStore: jest.fn((selector) => {
    const state = {
      providerSettings: {
        openai: {
          enabled: true,
          apiKey: 'test-api-key',
          baseURL: undefined,
        },
      },
    };
    return selector(state);
  }),
  useSessionStore: jest.fn((selector) => {
    const state = {
      getActiveSession: () => ({
        provider: 'openai',
        model: 'gpt-4o-mini',
      }),
    };
    return selector(state);
  }),
}));

// Mock prompt template store
const mockGetTemplate = jest.fn();
const mockGetFeedback = jest.fn();
const mockGetActiveABTest = jest.fn();
const mockRecordFeedback = jest.fn();
const mockStartABTest = jest.fn();
const mockRecordABTestResult = jest.fn();
const mockCompleteABTest = jest.fn();
const mockMarkAsOptimized = jest.fn();
const mockRecordOptimization = jest.fn();
const mockGetOptimizationHistory = jest.fn().mockReturnValue([]);
const mockGetRecommendations = jest.fn().mockReturnValue([]);
const mockGetTopCandidates = jest.fn().mockReturnValue([]);

jest.mock('@/stores/prompt/prompt-template-store', () => ({
  usePromptTemplateStore: jest.fn((selector) => {
    const state = {
      getTemplate: mockGetTemplate,
      getFeedback: mockGetFeedback,
      getActiveABTest: mockGetActiveABTest,
      recordFeedback: mockRecordFeedback,
      startABTest: mockStartABTest,
      recordABTestResult: mockRecordABTestResult,
      completeABTest: mockCompleteABTest,
      markAsOptimized: mockMarkAsOptimized,
      recordOptimization: mockRecordOptimization,
      getOptimizationHistory: mockGetOptimizationHistory,
      getRecommendations: mockGetRecommendations,
      getTopCandidates: mockGetTopCandidates,
    };
    return selector(state);
  }),
}));

// Mock prompt-self-optimizer functions
jest.mock('@/lib/ai/prompts/prompt-self-optimizer', () => ({
  analyzePrompt: jest.fn(),
  optimizePromptFromAnalysis: jest.fn(),
  analyzeUserFeedback: jest.fn(),
  autoOptimize: jest.fn(),
  calculateOptimizationImprovement: jest.fn().mockReturnValue({
    totalOptimizations: 0,
    averageImprovement: 0,
    bestImprovement: 0,
    successRate: 0,
  }),
}));

import {
  analyzePrompt,
  optimizePromptFromAnalysis,
} from '@/lib/ai/prompts/prompt-self-optimizer';

const mockAnalyzePrompt = analyzePrompt as jest.MockedFunction<typeof analyzePrompt>;
const mockOptimizePromptFromAnalysis = optimizePromptFromAnalysis as jest.MockedFunction<typeof optimizePromptFromAnalysis>;

describe('usePromptOptimizer', () => {
  const mockTemplate = {
    id: 'test-template-id',
    name: 'Test Template',
    content: 'Test content',
    description: 'Test description',
    tags: [],
    variables: [],
    source: 'user' as const,
    usageCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetTemplate.mockReturnValue(mockTemplate);
    mockGetFeedback.mockReturnValue([]);
    mockGetActiveABTest.mockReturnValue(null);
  });

  describe('initial state', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() => usePromptOptimizer());

      expect(result.current.isAnalyzing).toBe(false);
      expect(result.current.isOptimizing).toBe(false);
      expect(result.current.analysisResult).toBeNull();
      expect(result.current.suggestions).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it('should get template when templateId is provided', () => {
      const { result } = renderHook(() => 
        usePromptOptimizer({ templateId: 'test-template-id' })
      );

      expect(result.current.template).toEqual(mockTemplate);
    });

    it('should get feedback when templateId is provided', () => {
      const mockFeedback = [
        { id: '1', templateId: 'test', rating: 5, effectiveness: 'excellent', createdAt: new Date() },
      ];
      mockGetFeedback.mockReturnValue(mockFeedback);

      const { result } = renderHook(() => 
        usePromptOptimizer({ templateId: 'test-template-id' })
      );

      expect(result.current.feedback).toEqual(mockFeedback);
    });
  });

  describe('getConfig', () => {
    it('should return config with API key', () => {
      const { result } = renderHook(() => usePromptOptimizer());

      const config = result.current.getConfig();

      expect(config).not.toBeNull();
      expect(config?.provider).toBe('openai');
      expect(config?.model).toBe('gpt-4o-mini');
      expect(config?.apiKey).toBe('test-api-key');
    });
  });

  describe('analyze', () => {
    it('should analyze template successfully', async () => {
      const mockResult = {
        success: true,
        originalContent: 'Test content',
        suggestions: [
          {
            id: '1',
            type: 'clarity' as const,
            priority: 'high' as const,
            description: 'Improve clarity',
            confidence: 0.9,
          },
        ],
        analysis: {
          clarity: 75,
          specificity: 80,
          structureQuality: 70,
          overallScore: 75,
        },
      };

      mockAnalyzePrompt.mockResolvedValue(mockResult);

      const { result } = renderHook(() => 
        usePromptOptimizer({ templateId: 'test-template-id' })
      );

      await act(async () => {
        await result.current.analyze();
      });

      await waitFor(() => {
        expect(result.current.analysisResult).toEqual(mockResult);
        expect(result.current.suggestions).toEqual(mockResult.suggestions);
        expect(result.current.error).toBeNull();
      });
    });

    it('should handle analysis error', async () => {
      const mockResult = {
        success: false,
        originalContent: 'Test content',
        suggestions: [],
        analysis: { clarity: 0, specificity: 0, structureQuality: 0, overallScore: 0 },
        error: 'Analysis failed',
      };

      mockAnalyzePrompt.mockResolvedValue(mockResult);

      const { result } = renderHook(() => 
        usePromptOptimizer({ templateId: 'test-template-id' })
      );

      await act(async () => {
        await result.current.analyze();
      });

      await waitFor(() => {
        expect(result.current.error).toBe('Analysis failed');
      });
    });

    it('should set error when no template provided', async () => {
      mockGetTemplate.mockReturnValue(undefined);

      const { result } = renderHook(() => usePromptOptimizer());

      await act(async () => {
        await result.current.analyze();
      });

      expect(result.current.error).toBe('No template provided for analysis');
    });
  });

  describe('optimize', () => {
    it('should optimize with suggestions successfully', async () => {
      const mockSuggestions = [
        {
          id: '1',
          type: 'clarity' as const,
          priority: 'high' as const,
          description: 'Improve clarity',
          confidence: 0.9,
        },
      ];

      const mockResult = {
        success: true,
        originalContent: 'Test content',
        optimizedContent: 'Optimized test content',
        suggestions: mockSuggestions,
        analysis: { clarity: 90, specificity: 85, structureQuality: 88, overallScore: 88 },
      };

      mockOptimizePromptFromAnalysis.mockResolvedValue(mockResult);

      const { result } = renderHook(() => 
        usePromptOptimizer({ templateId: 'test-template-id' })
      );

      // Set suggestions first
      await act(async () => {
        // Manually set suggestions for testing
        const analysisResult = {
          success: true,
          originalContent: 'Test',
          suggestions: mockSuggestions,
          analysis: { clarity: 50, specificity: 50, structureQuality: 50, overallScore: 50 },
        };
        mockAnalyzePrompt.mockResolvedValue(analysisResult);
        await result.current.analyze();
      });

      await act(async () => {
        await result.current.optimize();
      });

      await waitFor(() => {
        expect(result.current.analysisResult?.optimizedContent).toBe('Optimized test content');
      });
    });

    it('should set error when no template selected', async () => {
      mockGetTemplate.mockReturnValue(undefined);

      const { result } = renderHook(() => usePromptOptimizer());

      await act(async () => {
        await result.current.optimize();
      });

      expect(result.current.error).toBe('No template selected for optimization');
    });
  });

  describe('applyOptimization', () => {
    it('should call markAsOptimized with content', () => {
      const { result } = renderHook(() => 
        usePromptOptimizer({ templateId: 'test-template-id' })
      );

      act(() => {
        result.current.applyOptimization('New optimized content');
      });

      expect(mockMarkAsOptimized).toHaveBeenCalledWith(
        'test-template-id',
        'New optimized content',
        []
      );
    });

    it('should set error when no templateId', () => {
      const { result } = renderHook(() => usePromptOptimizer());

      act(() => {
        result.current.applyOptimization('Content');
      });

      expect(result.current.error).toBe('No template ID to apply optimization');
    });
  });

  describe('submitFeedback', () => {
    it('should call recordFeedback with data', () => {
      const { result } = renderHook(() => 
        usePromptOptimizer({ templateId: 'test-template-id' })
      );

      const feedbackData = {
        rating: 5 as const,
        effectiveness: 'excellent' as const,
        comment: 'Great prompt!',
      };

      act(() => {
        result.current.submitFeedback(feedbackData);
      });

      expect(mockRecordFeedback).toHaveBeenCalledWith('test-template-id', feedbackData);
    });
  });

  describe('A/B Testing', () => {
    it('should start A/B test', () => {
      const mockABTest = {
        id: 'ab-test-1',
        templateId: 'test-template-id',
        variantA: { content: 'A', uses: 0, successRate: 0, averageRating: 0 },
        variantB: { content: 'B', uses: 0, successRate: 0, averageRating: 0 },
        status: 'running' as const,
        startedAt: new Date(),
        minSampleSize: 50,
      };

      mockStartABTest.mockReturnValue(mockABTest);

      const { result } = renderHook(() => 
        usePromptOptimizer({ templateId: 'test-template-id' })
      );

      let abTest;
      act(() => {
        abTest = result.current.startABTest('Variant B content', 'Test hypothesis');
      });

      expect(mockStartABTest).toHaveBeenCalledWith(
        'test-template-id',
        'Variant B content',
        'Test hypothesis'
      );
      expect(abTest).toEqual(mockABTest);
    });

    it('should record A/B test result', () => {
      const { result } = renderHook(() => 
        usePromptOptimizer({ templateId: 'test-template-id' })
      );

      act(() => {
        result.current.recordABTestResult('A', true, 5);
      });

      expect(mockRecordABTestResult).toHaveBeenCalledWith('test-template-id', 'A', true, 5);
    });

    it('should complete A/B test', () => {
      const completedTest = {
        id: 'ab-test-1',
        templateId: 'test-template-id',
        variantA: { content: 'A', uses: 50, successRate: 0.8, averageRating: 4 },
        variantB: { content: 'B', uses: 50, successRate: 0.9, averageRating: 4.5 },
        status: 'completed' as const,
        winner: 'B' as const,
        startedAt: new Date(),
        completedAt: new Date(),
        minSampleSize: 50,
      };

      mockCompleteABTest.mockReturnValue(completedTest);

      const { result } = renderHook(() => 
        usePromptOptimizer({ templateId: 'test-template-id' })
      );

      let testResult;
      act(() => {
        testResult = result.current.completeABTest();
      });

      expect(mockCompleteABTest).toHaveBeenCalledWith('test-template-id');
      expect(testResult).toEqual(completedTest);
    });
  });

  describe('reset', () => {
    it('should reset all state', async () => {
      const mockResult = {
        success: true,
        originalContent: 'Test',
        suggestions: [{ id: '1', type: 'clarity' as const, priority: 'high' as const, description: 'Test', confidence: 0.9 }],
        analysis: { clarity: 75, specificity: 80, structureQuality: 70, overallScore: 75 },
      };

      mockAnalyzePrompt.mockResolvedValue(mockResult);

      const { result } = renderHook(() => 
        usePromptOptimizer({ templateId: 'test-template-id' })
      );

      // First analyze to set some state
      await act(async () => {
        await result.current.analyze();
      });

      // Then reset
      act(() => {
        result.current.reset();
      });

      expect(result.current.isAnalyzing).toBe(false);
      expect(result.current.isOptimizing).toBe(false);
      expect(result.current.analysisResult).toBeNull();
      expect(result.current.suggestions).toEqual([]);
      expect(result.current.error).toBeNull();
    });
  });

  describe('optimization history and recommendations', () => {
    it('should return optimization history for template', () => {
      const mockHistory = [
        {
          id: 'hist-1',
          templateId: 'test-template-id',
          originalContent: 'Original',
          optimizedContent: 'Optimized',
          suggestions: ['Improved clarity'],
          scores: {
            before: { clarity: 50, specificity: 50, structure: 50, overall: 50 },
            after: { clarity: 75, specificity: 75, structure: 75, overall: 75 },
          },
          appliedAt: new Date(),
          appliedBy: 'user' as const,
        },
      ];
      mockGetOptimizationHistory.mockReturnValue(mockHistory);

      const { result } = renderHook(() => 
        usePromptOptimizer({ templateId: 'test-template-id' })
      );

      expect(result.current.optimizationHistory).toEqual(mockHistory);
    });

    it('should return empty history when no templateId', () => {
      const { result } = renderHook(() => usePromptOptimizer());

      expect(result.current.optimizationHistory).toEqual([]);
    });

    it('should return optimization stats', () => {
      const { result } = renderHook(() => 
        usePromptOptimizer({ templateId: 'test-template-id' })
      );

      expect(result.current.optimizationStats).toEqual({
        totalOptimizations: 0,
        averageImprovement: 0,
        bestImprovement: 0,
        successRate: 0,
      });
    });

    it('should return recommendations across all templates', () => {
      const mockRecommendations = [
        {
          templateId: 'tpl-1',
          templateName: 'Template 1',
          priority: 'high' as const,
          reason: 'Low success rate',
          metrics: { usageCount: 20, averageRating: 2, successRate: 0.4 },
          suggestedActions: ['Run AI analysis'],
        },
      ];
      mockGetRecommendations.mockReturnValue(mockRecommendations);

      const { result } = renderHook(() => usePromptOptimizer());

      expect(result.current.recommendations).toEqual(mockRecommendations);
    });

    it('should return top optimization candidates', () => {
      const mockCandidates = [
        {
          template: mockTemplate,
          score: 75,
          reasons: ['Low overall quality score', 'Never been optimized'],
        },
      ];
      mockGetTopCandidates.mockReturnValue(mockCandidates);

      const { result } = renderHook(() => usePromptOptimizer());

      expect(result.current.topCandidates).toEqual(mockCandidates);
    });

    it('should call recordOptimization when applying optimization', () => {
      const { result } = renderHook(() => 
        usePromptOptimizer({ templateId: 'test-template-id' })
      );

      act(() => {
        result.current.applyOptimization('New optimized content', 'concise');
      });

      expect(mockMarkAsOptimized).toHaveBeenCalledWith(
        'test-template-id',
        'New optimized content',
        []
      );
      expect(mockRecordOptimization).toHaveBeenCalledWith(
        'test-template-id',
        'Test content',
        'New optimized content',
        [],
        'concise',
        'user'
      );
    });
  });
});
