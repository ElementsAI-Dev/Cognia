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
} from './prompt-self-optimizer';
import type { PromptFeedback, PromptABTest } from '@/types/content/prompt-template';

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
});
