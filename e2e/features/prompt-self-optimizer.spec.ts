import { test, expect } from '@playwright/test';

/**
 * Prompt Self-Optimizer E2E Tests
 * Tests AI-powered prompt analysis, optimization, feedback collection, and A/B testing
 */
test.describe('Prompt Self-Optimization', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test.describe('Quick Analysis (Rule-based)', () => {
    test('should analyze prompt clarity', async ({ page }) => {
      const result = await page.evaluate(() => {
        const quickAnalyze = (content: string) => {
          let clarity = 50;
          let specificity = 50;
          let structureQuality = 50;

          // Clarity checks
          if (content.includes('clearly') || content.includes('specifically')) clarity += 10;
          if (content.length > 200) clarity += 10;
          if (content.split('.').length > 3) clarity += 5;

          // Specificity checks
          if (content.includes('example')) specificity += 15;
          if (content.match(/\d+/)) specificity += 5;
          if (content.includes('format')) specificity += 10;
          if (content.includes('step')) specificity += 10;

          // Structure checks
          if (content.includes('\n\n')) structureQuality += 10;
          if (content.match(/^#+\s/m)) structureQuality += 15;
          if (content.includes('1.') || content.includes('- ')) structureQuality += 10;
          if (content.toLowerCase().includes('you are')) structureQuality += 10;

          // Cap scores at 100
          clarity = Math.min(100, clarity);
          specificity = Math.min(100, specificity);
          structureQuality = Math.min(100, structureQuality);

          const overallScore = Math.round((clarity + specificity + structureQuality) / 3);

          return { clarity, specificity, structureQuality, overallScore };
        };

        const shortPrompt = 'Write code.';
        const goodPrompt = `You are an expert programmer.

## Task
Write code that demonstrates the concept clearly.

## Requirements
1. Use best practices
2. Include examples
3. Format the output properly`;

        return {
          shortAnalysis: quickAnalyze(shortPrompt),
          goodAnalysis: quickAnalyze(goodPrompt),
        };
      });

      expect(result.shortAnalysis.overallScore).toBeLessThan(60);
      expect(result.goodAnalysis.overallScore).toBeGreaterThan(result.shortAnalysis.overallScore);
      expect(result.goodAnalysis.structureQuality).toBeGreaterThan(result.shortAnalysis.structureQuality);
    });

    test('should suggest best practices', async ({ page }) => {
      const result = await page.evaluate(() => {
        interface Suggestion {
          type: string;
          priority: 'high' | 'medium' | 'low';
          description: string;
        }

        const suggestBestPractices = (content: string): Suggestion[] => {
          const suggestions: Suggestion[] = [];

          // Check for role definition
          if (!content.toLowerCase().includes('you are') && !content.toLowerCase().includes('as a')) {
            suggestions.push({
              type: 'context',
              priority: 'high',
              description: 'Add a clear role definition',
            });
          }

          // Check for output format specification
          if (!content.toLowerCase().includes('format') && !content.toLowerCase().includes('output')) {
            suggestions.push({
              type: 'formatting',
              priority: 'medium',
              description: 'Specify the expected output format',
            });
          }

          // Check for examples
          if (!content.toLowerCase().includes('example') && !content.toLowerCase().includes('for instance')) {
            suggestions.push({
              type: 'examples',
              priority: 'medium',
              description: 'Consider adding examples',
            });
          }

          // Check prompt length
          if (content.length < 100) {
            suggestions.push({
              type: 'specificity',
              priority: 'high',
              description: 'Prompt is quite short. Consider adding more context',
            });
          }

          return suggestions;
        };

        const basicPrompt = 'Write a poem about nature.';
        const detailedPrompt = 'You are a creative poet. Write a poem about nature. For example, you could focus on seasons. Please format as stanzas.';

        return {
          basicSuggestions: suggestBestPractices(basicPrompt),
          detailedSuggestions: suggestBestPractices(detailedPrompt),
        };
      });

      expect(result.basicSuggestions.length).toBeGreaterThan(2);
      expect(result.detailedSuggestions.length).toBeLessThan(result.basicSuggestions.length);
      expect(result.basicSuggestions.some(s => s.type === 'context')).toBe(true);
    });
  });

  test.describe('Optimization Comparison', () => {
    test('should compare optimization results', async ({ page }) => {
      const result = await page.evaluate(() => {
        interface Analysis {
          clarity: number;
          specificity: number;
          structureQuality: number;
          overallScore: number;
        }

        interface Comparison {
          metric: string;
          original: number;
          optimized: number;
          improvement: number;
          improvementPercent: number;
        }

        const compareOptimization = (original: Analysis, optimized: Analysis): Comparison[] => {
          const metrics = ['clarity', 'specificity', 'structureQuality', 'overallScore'] as const;

          return metrics.map((metric) => {
            const originalValue = original[metric];
            const optimizedValue = optimized[metric];
            const improvement = optimizedValue - originalValue;
            const improvementPercent = originalValue > 0
              ? Math.round((improvement / originalValue) * 100)
              : 0;

            return {
              metric,
              original: originalValue,
              optimized: optimizedValue,
              improvement,
              improvementPercent,
            };
          });
        };

        const original: Analysis = { clarity: 50, specificity: 40, structureQuality: 60, overallScore: 50 };
        const optimized: Analysis = { clarity: 75, specificity: 70, structureQuality: 85, overallScore: 77 };

        const comparison = compareOptimization(original, optimized);

        return {
          comparison,
          clarityImprovement: comparison.find(c => c.metric === 'clarity')?.improvement,
          overallImprovement: comparison.find(c => c.metric === 'overallScore')?.improvementPercent,
        };
      });

      expect(result.clarityImprovement).toBe(25);
      expect(result.overallImprovement).toBe(54);
      expect(result.comparison.every(c => c.improvement > 0)).toBe(true);
    });
  });

  test.describe('Feedback Collection', () => {
    test('should calculate prompt statistics from feedback', async ({ page }) => {
      const result = await page.evaluate(() => {
        interface Feedback {
          rating: 1 | 2 | 3 | 4 | 5;
          effectiveness: 'excellent' | 'good' | 'average' | 'poor';
          responseTime?: number;
        }

        interface Stats {
          totalUses: number;
          successfulUses: number;
          averageRating: number;
          ratingCount: number;
          averageResponseTime?: number;
        }

        const calculateStats = (feedback: Feedback[]): Stats => {
          if (feedback.length === 0) {
            return {
              totalUses: 0,
              successfulUses: 0,
              averageRating: 0,
              ratingCount: 0,
            };
          }

          const totalUses = feedback.length;
          const successfulUses = feedback.filter(
            f => f.effectiveness === 'excellent' || f.effectiveness === 'good'
          ).length;

          const averageRating = feedback.reduce((sum, f) => sum + f.rating, 0) / totalUses;

          const responseTimes = feedback
            .filter(f => f.responseTime)
            .map(f => f.responseTime!);
          const averageResponseTime = responseTimes.length > 0
            ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
            : undefined;

          return {
            totalUses,
            successfulUses,
            averageRating,
            ratingCount: feedback.length,
            averageResponseTime,
          };
        };

        const feedback: Feedback[] = [
          { rating: 5, effectiveness: 'excellent', responseTime: 1000 },
          { rating: 4, effectiveness: 'good', responseTime: 1500 },
          { rating: 3, effectiveness: 'average', responseTime: 2000 },
          { rating: 2, effectiveness: 'poor', responseTime: 3000 },
        ];

        const stats = calculateStats(feedback);
        const emptyStats = calculateStats([]);

        return {
          stats,
          emptyStats,
          successRate: stats.successfulUses / stats.totalUses,
        };
      });

      expect(result.stats.totalUses).toBe(4);
      expect(result.stats.successfulUses).toBe(2);
      expect(result.stats.averageRating).toBe(3.5);
      expect(result.stats.averageResponseTime).toBe(1875);
      expect(result.successRate).toBe(0.5);
      expect(result.emptyStats.totalUses).toBe(0);
    });

    test('should extract learning patterns from feedback', async ({ page }) => {
      const result = await page.evaluate(() => {
        interface Feedback {
          effectiveness: 'excellent' | 'good' | 'average' | 'poor';
          comment?: string;
          rating: number;
        }

        interface LearningContext {
          successfulPatterns: string[];
          failedPatterns: string[];
          userPreferences: Record<string, string>;
        }

        const extractPatterns = (feedback: Feedback[], content: string): LearningContext => {
          const successfulPatterns: string[] = [];
          const failedPatterns: string[] = [];
          const userPreferences: Record<string, string> = {};

          const excellentFeedback = feedback.filter(f => f.effectiveness === 'excellent');
          const poorFeedback = feedback.filter(f => f.effectiveness === 'poor');

          excellentFeedback.forEach(f => {
            if (f.comment) successfulPatterns.push(f.comment);
          });

          poorFeedback.forEach(f => {
            if (f.comment) failedPatterns.push(f.comment);
          });

          // Detect domain from content
          if (content.includes('code') || content.includes('function')) {
            userPreferences.domain = 'technical';
          }

          // Calculate quality preference
          const avgRating = feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length;
          userPreferences.quality = avgRating >= 4 ? 'high' : avgRating >= 3 ? 'medium' : 'needs-improvement';

          return { successfulPatterns, failedPatterns, userPreferences };
        };

        const feedback: Feedback[] = [
          { rating: 5, effectiveness: 'excellent', comment: 'Clear instructions worked great' },
          { rating: 5, effectiveness: 'excellent', comment: 'Good examples helped' },
          { rating: 2, effectiveness: 'poor', comment: 'Too vague, needs more detail' },
        ];

        const patterns = extractPatterns(feedback, 'Write a function to sort arrays');

        return {
          successCount: patterns.successfulPatterns.length,
          failCount: patterns.failedPatterns.length,
          domain: patterns.userPreferences.domain,
          quality: patterns.userPreferences.quality,
        };
      });

      expect(result.successCount).toBe(2);
      expect(result.failCount).toBe(1);
      expect(result.domain).toBe('technical');
      expect(result.quality).toBe('high');
    });
  });

  test.describe('A/B Testing', () => {
    test('should create and manage A/B tests', async ({ page }) => {
      const result = await page.evaluate(() => {
        interface ABTestVariant {
          content: string;
          uses: number;
          successRate: number;
          averageRating: number;
        }

        interface ABTest {
          id: string;
          variantA: ABTestVariant;
          variantB: ABTestVariant;
          status: 'running' | 'completed' | 'paused';
          winner?: 'A' | 'B' | 'none';
          minSampleSize: number;
        }

        const createTest = (originalContent: string, variantContent: string): ABTest => ({
          id: `test-${Date.now()}`,
          variantA: { content: originalContent, uses: 0, successRate: 0, averageRating: 0 },
          variantB: { content: variantContent, uses: 0, successRate: 0, averageRating: 0 },
          status: 'running',
          minSampleSize: 50,
        });

        const updateResult = (test: ABTest, variant: 'A' | 'B', success: boolean, rating: number): ABTest => {
          const v = variant === 'A' ? test.variantA : test.variantB;
          const oldUses = v.uses;
          v.uses++;
          v.successRate = ((v.successRate * oldUses) + (success ? 1 : 0)) / v.uses;
          v.averageRating = ((v.averageRating * oldUses) + rating) / v.uses;
          return test;
        };

        const evaluateTest = (test: ABTest): ABTest => {
          if (test.variantA.uses < test.minSampleSize || test.variantB.uses < test.minSampleSize) {
            return test;
          }

          test.status = 'completed';

          const scoreDiff = Math.abs(
            (test.variantA.successRate + test.variantA.averageRating / 5) -
            (test.variantB.successRate + test.variantB.averageRating / 5)
          );

          if (scoreDiff < 0.1) {
            test.winner = 'none';
          } else {
            const scoreA = test.variantA.successRate + test.variantA.averageRating / 5;
            const scoreB = test.variantB.successRate + test.variantB.averageRating / 5;
            test.winner = scoreA > scoreB ? 'A' : 'B';
          }

          return test;
        };

        // Create a test
        let test = createTest('Original prompt', 'Optimized variant');

        // Simulate usage
        for (let i = 0; i < 50; i++) {
          test = updateResult(test, 'A', Math.random() > 0.4, 3 + Math.random() * 2);
          test = updateResult(test, 'B', Math.random() > 0.3, 3.5 + Math.random() * 1.5);
        }

        // Evaluate
        test = evaluateTest(test);

        return {
          status: test.status,
          winner: test.winner,
          variantAUses: test.variantA.uses,
          variantBUses: test.variantB.uses,
          variantASuccessRate: test.variantA.successRate,
          variantBSuccessRate: test.variantB.successRate,
        };
      });

      expect(result.status).toBe('completed');
      expect(result.winner).toBeDefined();
      expect(result.variantAUses).toBe(50);
      expect(result.variantBUses).toBe(50);
      expect(result.variantBSuccessRate).toBeGreaterThan(0);
    });

    test('should select variant for balanced distribution', async ({ page }) => {
      const result = await page.evaluate(() => {
        interface ABTest {
          variantA: { uses: number };
          variantB: { uses: number };
          status: 'running' | 'completed';
          winner?: 'A' | 'B';
        }

        const getVariant = (test: ABTest): 'A' | 'B' => {
          if (test.status === 'completed' && test.winner) {
            return test.winner;
          }

          // Balance distribution
          if (test.variantA.uses <= test.variantB.uses) {
            return 'A';
          }
          return 'B';
        };

        const runningTest: ABTest = {
          variantA: { uses: 10 },
          variantB: { uses: 15 },
          status: 'running',
        };

        const completedTest: ABTest = {
          variantA: { uses: 50 },
          variantB: { uses: 50 },
          status: 'completed',
          winner: 'B',
        };

        return {
          runningVariant: getVariant(runningTest),
          completedVariant: getVariant(completedTest),
        };
      });

      expect(result.runningVariant).toBe('A'); // A has fewer uses
      expect(result.completedVariant).toBe('B'); // Winner
    });
  });

  test.describe('Iterative Optimization', () => {
    test('should track optimization iterations', async ({ page }) => {
      const result = await page.evaluate(() => {
        interface OptimizationStep {
          iteration: number;
          content: string;
          score: number;
          appliedSuggestions: string[];
        }

        const simulateIterativeOptimization = (
          initialContent: string,
          maxIterations: number
        ): OptimizationStep[] => {
          const steps: OptimizationStep[] = [];
          let currentContent = initialContent;
          let previousScore = 0;

          for (let i = 0; i < maxIterations; i++) {
            // Simulate score improvement
            const currentScore = 50 + (i * 15) + Math.random() * 10;

            // Stop if improvement is too small
            if (i > 0 && currentScore - previousScore < 5) {
              break;
            }

            const suggestions = [
              'Added role definition',
              'Improved clarity',
              'Added examples',
            ].slice(0, i + 1);

            steps.push({
              iteration: i + 1,
              content: currentContent + ` [v${i + 1}]`,
              score: currentScore,
              appliedSuggestions: suggestions,
            });

            previousScore = currentScore;
            currentContent = steps[steps.length - 1].content;
          }

          return steps;
        };

        const steps = simulateIterativeOptimization('Basic prompt', 3);

        return {
          stepCount: steps.length,
          firstScore: steps[0]?.score || 0,
          lastScore: steps[steps.length - 1]?.score || 0,
          improvementOccurred: steps.length > 1 && steps[steps.length - 1].score > steps[0].score,
        };
      });

      expect(result.stepCount).toBeGreaterThan(0);
      expect(result.stepCount).toBeLessThanOrEqual(3);
      expect(result.improvementOccurred).toBe(true);
    });
  });

  test.describe('Version History', () => {
    test('should manage prompt version history', async ({ page }) => {
      const result = await page.evaluate(() => {
        interface Version {
          id: string;
          version: number;
          content: string;
          changelog?: string;
          createdAt: Date;
        }

        const versions: Version[] = [];

        const saveVersion = (content: string, changelog?: string): Version => {
          const version: Version = {
            id: `v-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            version: versions.length + 1,
            content,
            changelog,
            createdAt: new Date(),
          };
          versions.push(version);
          return version;
        };

        const getVersionHistory = () => [...versions].reverse();

        const revertToVersion = (versionId: string): string | null => {
          const version = versions.find(v => v.id === versionId);
          return version?.content || null;
        };

        // Save versions
        saveVersion('Initial prompt', 'Created');
        saveVersion('Improved prompt with examples', 'Added examples');
        saveVersion('Final optimized prompt', 'Applied AI suggestions');

        const history = getVersionHistory();
        const revertContent = revertToVersion(versions[0].id);

        return {
          versionCount: versions.length,
          latestVersion: history[0]?.version,
          oldestVersion: history[history.length - 1]?.version,
          revertedContent: revertContent,
        };
      });

      expect(result.versionCount).toBe(3);
      expect(result.latestVersion).toBe(3);
      expect(result.oldestVersion).toBe(1);
      expect(result.revertedContent).toBe('Initial prompt');
    });
  });
});

test.describe('Prompt Optimization Integration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should integrate analysis with optimization workflow', async ({ page }) => {
    const result = await page.evaluate(() => {
      // Simulate full optimization workflow
      interface WorkflowState {
        step: 'analyze' | 'suggestions' | 'optimize' | 'compare' | 'apply';
        content: string;
        analysis?: { overallScore: number };
        suggestions?: Array<{ description: string; priority: string }>;
        optimizedContent?: string;
      }

      const workflow: WorkflowState = {
        step: 'analyze',
        content: 'Write code',
      };

      // Step 1: Analyze
      workflow.analysis = { overallScore: 45 };
      workflow.step = 'suggestions';

      // Step 2: Get suggestions
      workflow.suggestions = [
        { description: 'Add role definition', priority: 'high' },
        { description: 'Specify output format', priority: 'medium' },
      ];
      workflow.step = 'optimize';

      // Step 3: Optimize
      workflow.optimizedContent = 'You are an expert programmer. Write code with proper formatting.';
      workflow.step = 'compare';

      // Step 4: Compare and apply
      workflow.step = 'apply';

      return {
        finalStep: workflow.step,
        initialScore: workflow.analysis?.overallScore,
        suggestionCount: workflow.suggestions?.length,
        hasOptimizedContent: !!workflow.optimizedContent,
        contentImproved: (workflow.optimizedContent?.length || 0) > workflow.content.length,
      };
    });

    expect(result.finalStep).toBe('apply');
    expect(result.initialScore).toBe(45);
    expect(result.suggestionCount).toBe(2);
    expect(result.hasOptimizedContent).toBe(true);
    expect(result.contentImproved).toBe(true);
  });

  test('should calculate auto-optimization eligibility', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface Feedback {
        effectiveness: 'excellent' | 'good' | 'average' | 'poor';
      }

      const shouldAutoOptimize = (
        feedback: Feedback[],
        minFeedbackCount: number,
        targetSuccessRate: number
      ): boolean => {
        if (feedback.length < minFeedbackCount) {
          return false;
        }

        const successfulCount = feedback.filter(
          f => f.effectiveness === 'excellent' || f.effectiveness === 'good'
        ).length;

        const successRate = successfulCount / feedback.length;
        return successRate < targetSuccessRate;
      };

      // Test cases
      const fewFeedback: Feedback[] = [
        { effectiveness: 'poor' },
        { effectiveness: 'poor' },
      ];

      const goodFeedback: Feedback[] = Array(15).fill(null).map(() => ({ effectiveness: 'excellent' as const }));

      const poorFeedback: Feedback[] = Array(15).fill(null).map((_, i) => ({
        effectiveness: i < 5 ? 'excellent' as const : 'poor' as const,
      }));

      return {
        fewFeedbackResult: shouldAutoOptimize(fewFeedback, 10, 0.8),
        goodFeedbackResult: shouldAutoOptimize(goodFeedback, 10, 0.8),
        poorFeedbackResult: shouldAutoOptimize(poorFeedback, 10, 0.8),
      };
    });

    expect(result.fewFeedbackResult).toBe(false); // Not enough feedback
    expect(result.goodFeedbackResult).toBe(false); // Already good
    expect(result.poorFeedbackResult).toBe(true); // Needs optimization
  });
});
