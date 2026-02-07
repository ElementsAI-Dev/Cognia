/**
 * Tests for Prompt Self-Optimizer
 */

import {
  calculatePromptStats,
  createABTest,
  updateABTestResult,
  evaluateABTest,
  getABTestVariant,
  compareOptimization,
  suggestBestPractices,
  quickAnalyze,
  extractLearningPatterns,
  generateOptimizationRecommendations,
  createOptimizationHistoryEntry,
  calculateOptimizationImprovement,
  getTopOptimizationCandidates,
} from './prompt-self-optimizer';
import type { PromptFeedback, PromptABTest, PromptTemplate } from '@/types/content/prompt-template';

describe('prompt-self-optimizer', () => {
  describe('calculatePromptStats', () => {
    it('should return zero stats for empty feedback', () => {
      const stats = calculatePromptStats([]);
      
      expect(stats.totalUses).toBe(0);
      expect(stats.successfulUses).toBe(0);
      expect(stats.averageRating).toBe(0);
      expect(stats.ratingCount).toBe(0);
    });
    
    it('should calculate correct stats from feedback', () => {
      const feedback: PromptFeedback[] = [
        {
          id: '1',
          templateId: 'test',
          rating: 5,
          effectiveness: 'excellent',
          createdAt: new Date(),
        },
        {
          id: '2',
          templateId: 'test',
          rating: 4,
          effectiveness: 'good',
          createdAt: new Date(),
        },
        {
          id: '3',
          templateId: 'test',
          rating: 3,
          effectiveness: 'average',
          createdAt: new Date(),
        },
        {
          id: '4',
          templateId: 'test',
          rating: 2,
          effectiveness: 'poor',
          createdAt: new Date(),
        },
      ];
      
      const stats = calculatePromptStats(feedback);
      
      expect(stats.totalUses).toBe(4);
      expect(stats.successfulUses).toBe(2); // excellent + good
      expect(stats.averageRating).toBe(3.5); // (5+4+3+2)/4
      expect(stats.ratingCount).toBe(4);
    });
    
    it('should calculate average response time when available', () => {
      const feedback: PromptFeedback[] = [
        {
          id: '1',
          templateId: 'test',
          rating: 5,
          effectiveness: 'excellent',
          context: { responseTime: 1000 },
          createdAt: new Date(),
        },
        {
          id: '2',
          templateId: 'test',
          rating: 4,
          effectiveness: 'good',
          context: { responseTime: 2000 },
          createdAt: new Date(),
        },
      ];
      
      const stats = calculatePromptStats(feedback);
      
      expect(stats.averageResponseTime).toBe(1500);
    });
  });
  
  describe('createABTest', () => {
    it('should create a new A/B test with correct structure', () => {
      const test = createABTest(
        'template-1',
        'Original content',
        'Variant content',
        'Test hypothesis'
      );
      
      expect(test.id).toBeDefined();
      expect(test.templateId).toBe('template-1');
      expect(test.variantA.content).toBe('Original content');
      expect(test.variantB.content).toBe('Variant content');
      expect(test.status).toBe('running');
      expect(test.variantA.uses).toBe(0);
      expect(test.variantB.uses).toBe(0);
      expect(test.minSampleSize).toBe(50);
    });
  });
  
  describe('updateABTestResult', () => {
    it('should update variant A stats correctly', () => {
      const test = createABTest('t1', 'A', 'B', 'hypothesis');
      
      const updated = updateABTestResult(test, 'A', true, 5);
      
      expect(updated.variantA.uses).toBe(1);
      expect(updated.variantA.successRate).toBe(1);
      expect(updated.variantA.averageRating).toBe(5);
      expect(updated.variantB.uses).toBe(0);
    });
    
    it('should update variant B stats correctly', () => {
      const test = createABTest('t1', 'A', 'B', 'hypothesis');
      
      const updated = updateABTestResult(test, 'B', false, 2);
      
      expect(updated.variantB.uses).toBe(1);
      expect(updated.variantB.successRate).toBe(0);
      expect(updated.variantB.averageRating).toBe(2);
    });
    
    it('should accumulate stats over multiple updates', () => {
      let test = createABTest('t1', 'A', 'B', 'hypothesis');
      
      test = updateABTestResult(test, 'A', true, 5);
      test = updateABTestResult(test, 'A', true, 4);
      test = updateABTestResult(test, 'A', false, 2);
      
      expect(test.variantA.uses).toBe(3);
      expect(test.variantA.successRate).toBeCloseTo(0.667, 2);
      expect(test.variantA.averageRating).toBeCloseTo(3.667, 2);
    });
  });
  
  describe('evaluateABTest', () => {
    it('should not complete test if sample size not met', () => {
      const test: PromptABTest = {
        id: 'test-1',
        templateId: 't1',
        variantA: { content: 'A', uses: 10, successRate: 0.8, averageRating: 4 },
        variantB: { content: 'B', uses: 10, successRate: 0.9, averageRating: 4.5 },
        status: 'running',
        startedAt: new Date(),
        minSampleSize: 50,
      };
      
      const result = evaluateABTest(test);
      
      expect(result.status).toBe('running');
      expect(result.winner).toBeUndefined();
    });
    
    it('should determine winner when sample size is met', () => {
      const test: PromptABTest = {
        id: 'test-1',
        templateId: 't1',
        variantA: { content: 'A', uses: 50, successRate: 0.6, averageRating: 3 },
        variantB: { content: 'B', uses: 50, successRate: 0.9, averageRating: 4.5 },
        status: 'running',
        startedAt: new Date(),
        minSampleSize: 50,
      };
      
      const result = evaluateABTest(test);
      
      expect(result.status).toBe('completed');
      expect(result.winner).toBe('B');
      expect(result.completedAt).toBeDefined();
    });
    
    it('should return none when difference is not significant', () => {
      const test: PromptABTest = {
        id: 'test-1',
        templateId: 't1',
        variantA: { content: 'A', uses: 50, successRate: 0.8, averageRating: 4 },
        variantB: { content: 'B', uses: 50, successRate: 0.81, averageRating: 4.05 },
        status: 'running',
        startedAt: new Date(),
        minSampleSize: 50,
      };
      
      const result = evaluateABTest(test);
      
      expect(result.status).toBe('completed');
      expect(result.winner).toBe('none');
    });
  });
  
  describe('getABTestVariant', () => {
    it('should return winner variant when test is completed', () => {
      const test: PromptABTest = {
        id: 'test-1',
        templateId: 't1',
        variantA: { content: 'A', uses: 50, successRate: 0.6, averageRating: 3 },
        variantB: { content: 'B', uses: 50, successRate: 0.9, averageRating: 4.5 },
        status: 'completed',
        winner: 'B',
        startedAt: new Date(),
        completedAt: new Date(),
        minSampleSize: 50,
      };
      
      const variant = getABTestVariant(test);
      
      expect(variant).toBe('B');
    });
    
    it('should balance variants when test is running', () => {
      const test: PromptABTest = {
        id: 'test-1',
        templateId: 't1',
        variantA: { content: 'A', uses: 10, successRate: 0.8, averageRating: 4 },
        variantB: { content: 'B', uses: 5, successRate: 0.9, averageRating: 4.5 },
        status: 'running',
        startedAt: new Date(),
        minSampleSize: 50,
      };
      
      // A has more uses, so should return B
      const variant = getABTestVariant(test);
      
      expect(variant).toBe('B');
    });
  });
  
  describe('compareOptimization', () => {
    it('should compare two analysis results', () => {
      const original = {
        clarity: 50,
        specificity: 40,
        structureQuality: 60,
        overallScore: 50,
      };
      
      const optimized = {
        clarity: 70,
        specificity: 65,
        structureQuality: 80,
        overallScore: 72,
      };
      
      const comparison = compareOptimization(original, optimized);
      
      expect(comparison).toHaveLength(4);
      
      const clarityComp = comparison.find(c => c.metric === 'clarity');
      expect(clarityComp?.original).toBe(50);
      expect(clarityComp?.optimized).toBe(70);
      expect(clarityComp?.improvement).toBe(20);
      expect(clarityComp?.improvementPercent).toBe(40);
    });
    
    it('should handle zero values', () => {
      const original = {
        clarity: 0,
        specificity: 50,
        structureQuality: 50,
        overallScore: 33,
      };
      
      const optimized = {
        clarity: 50,
        specificity: 75,
        structureQuality: 75,
        overallScore: 67,
      };
      
      const comparison = compareOptimization(original, optimized);
      
      const clarityComp = comparison.find(c => c.metric === 'clarity');
      expect(clarityComp?.improvementPercent).toBe(0); // Division by zero handled
    });
  });
  
  describe('suggestBestPractices', () => {
    it('should suggest role definition when missing', () => {
      const content = 'Write a poem about nature.';
      const suggestions = suggestBestPractices(content);
      
      const roleSuggestion = suggestions.find(s => s.type === 'context');
      expect(roleSuggestion).toBeDefined();
      expect(roleSuggestion?.priority).toBe('high');
    });
    
    it('should not suggest role definition when present', () => {
      const content = 'You are a creative poet. Write a poem about nature.';
      const suggestions = suggestBestPractices(content);
      
      const roleSuggestion = suggestions.find(s => 
        s.type === 'context' && s.description.includes('role definition')
      );
      expect(roleSuggestion).toBeUndefined();
    });
    
    it('should suggest output format when missing', () => {
      const content = 'You are an expert. Explain machine learning.';
      const suggestions = suggestBestPractices(content);
      
      const formatSuggestion = suggestions.find(s => s.type === 'formatting');
      expect(formatSuggestion).toBeDefined();
    });
    
    it('should suggest examples when missing', () => {
      const content = 'You are an expert. Explain the concept clearly.';
      const suggestions = suggestBestPractices(content);
      
      const exampleSuggestion = suggestions.find(s => s.type === 'examples');
      expect(exampleSuggestion).toBeDefined();
    });
    
    it('should flag short prompts', () => {
      const content = 'Write code.';
      const suggestions = suggestBestPractices(content);
      
      const lengthSuggestion = suggestions.find(s => 
        s.type === 'specificity' && s.description.includes('short')
      );
      expect(lengthSuggestion).toBeDefined();
      expect(lengthSuggestion?.priority).toBe('high');
    });
    
    it('should detect variables', () => {
      const content = 'You are an expert in {{topic}}. Explain {{concept}} to {{audience}}.';
      const suggestions = suggestBestPractices(content);
      
      const variableSuggestion = suggestions.find(s => s.type === 'variables');
      expect(variableSuggestion).toBeDefined();
      expect(variableSuggestion?.description).toContain('3 variable');
    });

    it('should recognize Chinese role definitions', () => {
      const content = '你是一个专业的数据分析师。请分析以下数据并给出建议。';
      const suggestions = suggestBestPractices(content);

      const roleSuggestion = suggestions.find(s =>
        s.type === 'context' && s.description.includes('role definition')
      );
      expect(roleSuggestion).toBeUndefined();
    });

    it('should suggest step-by-step for long prompts without CoT', () => {
      const content = 'You are an expert analyst. ' + 'Analyze the following data thoroughly and provide insights based on the patterns you find. Consider multiple perspectives and evaluate the implications of each finding. '.repeat(2);
      const suggestions = suggestBestPractices(content);

      const cotSuggestion = suggestions.find(s =>
        s.type === 'structure' && s.description.includes('step-by-step')
      );
      expect(cotSuggestion).toBeDefined();
    });

    it('should not suggest step-by-step when already present', () => {
      const content = 'You are an expert. ' + 'Please analyze step by step the following data. Consider each aspect carefully before moving to the next. '.repeat(2);
      const suggestions = suggestBestPractices(content);

      const cotSuggestion = suggestions.find(s =>
        s.type === 'structure' && s.description.includes('step-by-step')
      );
      expect(cotSuggestion).toBeUndefined();
    });

    it('should suggest delimiters for long prompts without them', () => {
      const content = 'You are an expert. ' + 'Please analyze the data and provide detailed output with formatting. '.repeat(5);
      const suggestions = suggestBestPractices(content);

      const delimiterSuggestion = suggestions.find(s =>
        s.type === 'structure' && s.description.includes('delimiter')
      );
      expect(delimiterSuggestion).toBeDefined();
    });

    it('should recognize Chinese constraints', () => {
      const content = '你是一个专家。请分析数据，不要包含个人观点，避免使用专业术语。输出格式为JSON。';
      const suggestions = suggestBestPractices(content);

      const constraintSuggestion = suggestions.find(s => s.type === 'constraints');
      expect(constraintSuggestion).toBeUndefined();
    });
  });
  
  describe('quickAnalyze', () => {
    it('should analyze basic prompt', () => {
      const content = 'Write something.';
      const analysis = quickAnalyze(content);
      
      expect(analysis.clarity).toBeGreaterThanOrEqual(0);
      expect(analysis.clarity).toBeLessThanOrEqual(100);
      expect(analysis.specificity).toBeGreaterThanOrEqual(0);
      expect(analysis.specificity).toBeLessThanOrEqual(100);
      expect(analysis.structureQuality).toBeGreaterThanOrEqual(0);
      expect(analysis.structureQuality).toBeLessThanOrEqual(100);
      expect(analysis.overallScore).toBeGreaterThanOrEqual(0);
      expect(analysis.overallScore).toBeLessThanOrEqual(100);
    });
    
    it('should give higher scores for well-structured prompts', () => {
      const basicContent = 'Write code.';
      const structuredContent = `You are an expert programmer.

## Task
Write code that demonstrates the concept clearly.

## Requirements
1. Use best practices
2. Include examples
3. Format the output properly

## Example
Input: simple task
Output: structured code`;
      
      const basicAnalysis = quickAnalyze(basicContent);
      const structuredAnalysis = quickAnalyze(structuredContent);
      
      expect(structuredAnalysis.overallScore).toBeGreaterThan(basicAnalysis.overallScore);
      expect(structuredAnalysis.structureQuality).toBeGreaterThan(basicAnalysis.structureQuality);
    });
    
    it('should cap scores at 100', () => {
      const content = `You are an expert in specifically providing clear examples.
      
## Step 1
Do this clearly and specifically.

1. First step with example
2. Second step

Format: structured output`;
      
      const analysis = quickAnalyze(content);
      
      expect(analysis.clarity).toBeLessThanOrEqual(100);
      expect(analysis.specificity).toBeLessThanOrEqual(100);
      expect(analysis.structureQuality).toBeLessThanOrEqual(100);
      expect(analysis.overallScore).toBeLessThanOrEqual(100);
    });

    it('should score Chinese prompts with role definitions', () => {
      const content = '你是一个专业的数据分析师。请分析以下数据并给出建议。';
      const analysis = quickAnalyze(content);

      // Should detect Chinese role definition and give structure points
      expect(analysis.structureQuality).toBeGreaterThanOrEqual(50);
    });

    it('should recognize Chinese keywords for specificity', () => {
      const content = '你是一个专家。请逐步分析数据，输出格式为JSON。示例：{"name": "test"}';
      const analysis = quickAnalyze(content);

      // Should detect 逐步 (step), 输出 (output), 示例 (example)
      expect(analysis.specificity).toBeGreaterThan(50);
    });

    it('should penalize very short prompts', () => {
      const shortContent = 'hi';
      const analysis = quickAnalyze(shortContent);

      expect(analysis.clarity).toBeLessThan(50);
      expect(analysis.specificity).toBeLessThan(50);
    });

    it('should give bonus for delimiter usage', () => {
      const withDelimiters = `You are an expert.
      
### Instructions
Follow these steps.

---
Output your answer.`;
      
      const withoutDelimiters = 'You are an expert. Follow these steps. Output your answer.';
      
      const withAnalysis = quickAnalyze(withDelimiters);
      const withoutAnalysis = quickAnalyze(withoutDelimiters);
      
      expect(withAnalysis.structureQuality).toBeGreaterThan(withoutAnalysis.structureQuality);
    });
  });
  
  describe('extractLearningPatterns', () => {
    it('should extract patterns from feedback', () => {
      const feedback: PromptFeedback[] = [
        {
          id: '1',
          templateId: 'test',
          rating: 5,
          effectiveness: 'excellent',
          comment: 'Great clarity in instructions',
          createdAt: new Date(),
        },
        {
          id: '2',
          templateId: 'test',
          rating: 1,
          effectiveness: 'poor',
          comment: 'Too vague, needs more examples',
          createdAt: new Date(),
        },
      ];
      
      const patterns = extractLearningPatterns(feedback, 'Analyze the code');
      
      expect(patterns.successfulPatterns).toContain('Great clarity in instructions');
      expect(patterns.failedPatterns).toContain('Too vague, needs more examples');
    });
    
    it('should detect domain context', () => {
      const feedback: PromptFeedback[] = [];
      
      const codePatterns = extractLearningPatterns(feedback, 'Write a function that calculates...');
      expect(codePatterns.domainKnowledge).toContain('Technical/coding context');
      
      const creativePatterns = extractLearningPatterns(feedback, 'Create a story about...');
      expect(creativePatterns.domainKnowledge).toContain('Creative writing context');
      
      const analyticalPatterns = extractLearningPatterns(feedback, 'Analyze and explain...');
      expect(analyticalPatterns.domainKnowledge).toContain('Analytical context');
    });
    
    it('should calculate user preferences from ratings', () => {
      const highRatedFeedback: PromptFeedback[] = [
        { id: '1', templateId: 't', rating: 5, effectiveness: 'excellent', createdAt: new Date() },
        { id: '2', templateId: 't', rating: 4, effectiveness: 'good', createdAt: new Date() },
      ];
      
      const lowRatedFeedback: PromptFeedback[] = [
        { id: '1', templateId: 't', rating: 2, effectiveness: 'poor', createdAt: new Date() },
        { id: '2', templateId: 't', rating: 1, effectiveness: 'poor', createdAt: new Date() },
      ];
      
      const highPatterns = extractLearningPatterns(highRatedFeedback, 'test');
      const lowPatterns = extractLearningPatterns(lowRatedFeedback, 'test');
      
      expect(highPatterns.userPreferences.quality).toBe('high');
      expect(lowPatterns.userPreferences.quality).toBe('needs-improvement');
    });
    
    it('should limit pattern counts', () => {
      const feedback: PromptFeedback[] = Array(10).fill(null).map((_, i) => ({
        id: `${i}`,
        templateId: 'test',
        rating: 5,
        effectiveness: 'excellent' as const,
        comment: `Pattern ${i}`,
        createdAt: new Date(),
      }));
      
      const patterns = extractLearningPatterns(feedback, 'test');
      
      expect(patterns.successfulPatterns.length).toBeLessThanOrEqual(5);
    });
  });

  describe('generateOptimizationRecommendations', () => {
    it('should return empty for templates without issues', () => {
      const templates = [createMockTemplate({ id: '1', name: 'Test' })];
      const feedbackMap: Record<string, PromptFeedback[]> = {};
      
      const recommendations = generateOptimizationRecommendations(templates, feedbackMap);
      
      expect(recommendations).toHaveLength(0);
    });

    it('should return high priority for low success rate', () => {
      const templates = [createMockTemplate({ id: '1', name: 'Test' })];
      const feedbackMap: Record<string, PromptFeedback[]> = {
        '1': Array(10).fill(null).map((_, i) => ({
          id: `${i}`,
          templateId: '1',
          rating: 2,
          effectiveness: 'poor' as const,
          createdAt: new Date(),
        })),
      };
      
      const recommendations = generateOptimizationRecommendations(templates, feedbackMap);
      
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0].priority).toBe('high');
    });

    it('should sort recommendations by priority', () => {
      const templates = [
        createMockTemplate({ id: '1', name: 'Low Priority' }),
        createMockTemplate({ id: '2', name: 'High Priority' }),
      ];
      const feedbackMap: Record<string, PromptFeedback[]> = {
        '1': Array(5).fill(null).map((_, i) => ({
          id: `1-${i}`,
          templateId: '1',
          rating: 3,
          effectiveness: 'good' as const,
          createdAt: new Date(),
        })),
        '2': Array(10).fill(null).map((_, i) => ({
          id: `2-${i}`,
          templateId: '2',
          rating: 2,
          effectiveness: 'poor' as const,
          createdAt: new Date(),
        })),
      };
      
      const recommendations = generateOptimizationRecommendations(templates, feedbackMap);
      
      if (recommendations.length >= 2) {
        const priorities = recommendations.map(r => r.priority);
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        for (let i = 1; i < priorities.length; i++) {
          expect(priorityOrder[priorities[i]]).toBeGreaterThanOrEqual(priorityOrder[priorities[i - 1]]);
        }
      }
    });
  });

  describe('createOptimizationHistoryEntry', () => {
    it('should create history entry with scores', () => {
      const entry = createOptimizationHistoryEntry(
        'template-1',
        'short prompt',
        'You are an expert. Please analyze the code for bugs. Provide step-by-step feedback.',
        ['Added role', 'Added structure']
      );
      
      expect(entry.templateId).toBe('template-1');
      expect(entry.originalContent).toBe('short prompt');
      expect(entry.suggestions).toEqual(['Added role', 'Added structure']);
      expect(entry.scores.before.overall).toBeLessThan(entry.scores.after.overall);
      expect(entry.appliedBy).toBe('user');
    });

    it('should support auto applied optimizations', () => {
      const entry = createOptimizationHistoryEntry(
        'template-1',
        'original',
        'optimized',
        [],
        'concise',
        'auto'
      );
      
      expect(entry.appliedBy).toBe('auto');
      expect(entry.style).toBe('concise');
    });
  });

  describe('calculateOptimizationImprovement', () => {
    it('should return zeros for empty history', () => {
      const result = calculateOptimizationImprovement([]);
      
      expect(result.totalOptimizations).toBe(0);
      expect(result.averageImprovement).toBe(0);
      expect(result.bestImprovement).toBe(0);
      expect(result.successRate).toBe(0);
    });

    it('should calculate improvement stats', () => {
      const history = [
        {
          id: '1',
          templateId: 't1',
          originalContent: 'short',
          optimizedContent: 'better',
          suggestions: [],
          scores: {
            before: { clarity: 40, specificity: 40, structure: 40, overall: 40 },
            after: { clarity: 70, specificity: 70, structure: 70, overall: 70 },
          },
          appliedAt: new Date(),
        },
        {
          id: '2',
          templateId: 't2',
          originalContent: 'ok',
          optimizedContent: 'better',
          suggestions: [],
          scores: {
            before: { clarity: 60, specificity: 60, structure: 60, overall: 60 },
            after: { clarity: 80, specificity: 80, structure: 80, overall: 80 },
          },
          appliedAt: new Date(),
        },
      ];
      
      const result = calculateOptimizationImprovement(history);
      
      expect(result.totalOptimizations).toBe(2);
      expect(result.averageImprovement).toBe(25); // (30 + 20) / 2
      expect(result.bestImprovement).toBe(30);
      expect(result.successRate).toBe(1); // Both improved
    });
  });

  describe('getTopOptimizationCandidates', () => {
    it('should return candidates sorted by score', () => {
      const templates = [
        createMockTemplate({ id: '1', name: 'Low usage', content: 'short', usageCount: 5 }),
        createMockTemplate({ id: '2', name: 'High usage', content: 'short', usageCount: 25 }),
        createMockTemplate({ 
          id: '3', 
          name: 'Good template', 
          content: 'You are an expert. Please analyze step by step. Format your output clearly.',
          usageCount: 10 
        }),
      ];
      
      const candidates = getTopOptimizationCandidates(templates, 3);
      
      expect(candidates.length).toBeGreaterThan(0);
      // Should be sorted by score (descending)
      for (let i = 1; i < candidates.length; i++) {
        expect(candidates[i].score).toBeLessThanOrEqual(candidates[i - 1].score);
      }
    });

    it('should respect limit parameter', () => {
      const templates = Array(10).fill(null).map((_, i) => 
        createMockTemplate({ id: `${i}`, name: `Template ${i}`, content: 'short', usageCount: i + 1 })
      );
      
      const candidates = getTopOptimizationCandidates(templates, 3);
      
      expect(candidates.length).toBeLessThanOrEqual(3);
    });

    it('should include reasons for recommendation', () => {
      const templates = [
        createMockTemplate({ id: '1', name: 'Short', content: 'hi', usageCount: 25 }),
      ];
      
      const candidates = getTopOptimizationCandidates(templates);
      
      expect(candidates[0].reasons.length).toBeGreaterThan(0);
    });
  });
});

// Helper function
function createMockTemplate(overrides: Partial<PromptTemplate> = {}): PromptTemplate {
  return {
    id: 'mock-id',
    name: 'Mock Template',
    content: 'Test content',
    tags: [],
    variables: [],
    source: 'user' as const,
    usageCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}
