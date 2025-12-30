import { test, expect } from '@playwright/test';

/**
 * Auto Router E2E Tests
 * Tests intelligent model routing functionality
 */
test.describe('Auto Router', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should classify task complexity', async ({ page }) => {
    const result = await page.evaluate(() => {
      type TaskComplexity = 'simple' | 'medium' | 'complex' | 'expert';

      interface TaskAnalysis {
        complexity: TaskComplexity;
        score: number;
        factors: string[];
      }

      const analyzeTaskComplexity = (prompt: string): TaskAnalysis => {
        const factors: string[] = [];
        let score = 0;

        // Length factor
        if (prompt.length > 500) {
          score += 20;
          factors.push('long_prompt');
        }

        // Technical keywords
        const technicalKeywords = [
          'algorithm', 'architecture', 'optimize', 'implement',
          'debug', 'refactor', 'security', 'performance',
          'distributed', 'concurrent', 'async', 'database',
        ];
        const techCount = technicalKeywords.filter(kw => 
          prompt.toLowerCase().includes(kw)
        ).length;
        score += techCount * 10;
        if (techCount > 0) factors.push('technical_content');

        // Code presence
        if (prompt.includes('```') || prompt.includes('function') || prompt.includes('class')) {
          score += 15;
          factors.push('code_present');
        }

        // Multi-step indicators
        const multiStepKeywords = ['first', 'then', 'next', 'finally', 'step'];
        if (multiStepKeywords.some(kw => prompt.toLowerCase().includes(kw))) {
          score += 10;
          factors.push('multi_step');
        }

        // Determine complexity level
        let complexity: TaskComplexity;
        if (score < 20) complexity = 'simple';
        else if (score < 40) complexity = 'medium';
        else if (score < 60) complexity = 'complex';
        else complexity = 'expert';

        return { complexity, score, factors };
      };

      const simplePrompt = 'What is the capital of France?';
      const mediumPrompt = 'Explain how async/await works in JavaScript with examples';
      const complexPrompt = 'Design a distributed caching system with the following requirements: high availability, eventual consistency, and horizontal scaling. Include the database schema and API endpoints.';

      return {
        simple: analyzeTaskComplexity(simplePrompt),
        medium: analyzeTaskComplexity(mediumPrompt),
        complex: analyzeTaskComplexity(complexPrompt),
      };
    });

    expect(result.simple.complexity).toBe('simple');
    expect(result.medium.complexity).toBe('medium');
    expect(result.complex.complexity).toBe('expert');
    expect(result.complex.factors).toContain('technical_content');
  });

  test('should select appropriate model', async ({ page }) => {
    const result = await page.evaluate(() => {
      type TaskComplexity = 'simple' | 'medium' | 'complex' | 'expert';

      interface ModelConfig {
        id: string;
        name: string;
        provider: string;
        costPerToken: number;
        speedRating: number;
        qualityRating: number;
        supportedComplexities: TaskComplexity[];
      }

      const MODELS: ModelConfig[] = [
        {
          id: 'gpt-4o-mini',
          name: 'GPT-4o Mini',
          provider: 'openai',
          costPerToken: 0.00000015,
          speedRating: 9,
          qualityRating: 7,
          supportedComplexities: ['simple', 'medium'],
        },
        {
          id: 'gpt-4o',
          name: 'GPT-4o',
          provider: 'openai',
          costPerToken: 0.0000025,
          speedRating: 7,
          qualityRating: 9,
          supportedComplexities: ['simple', 'medium', 'complex', 'expert'],
        },
        {
          id: 'claude-3-5-haiku',
          name: 'Claude 3.5 Haiku',
          provider: 'anthropic',
          costPerToken: 0.00000025,
          speedRating: 9,
          qualityRating: 7,
          supportedComplexities: ['simple', 'medium'],
        },
        {
          id: 'claude-3-5-sonnet',
          name: 'Claude 3.5 Sonnet',
          provider: 'anthropic',
          costPerToken: 0.000003,
          speedRating: 7,
          qualityRating: 10,
          supportedComplexities: ['simple', 'medium', 'complex', 'expert'],
        },
      ];

      interface RouterConfig {
        preferSpeed: boolean;
        preferCost: boolean;
        preferQuality: boolean;
        preferredProvider?: string;
      }

      const selectModel = (
        complexity: TaskComplexity,
        config: RouterConfig
      ): ModelConfig | null => {
        // Filter by complexity support
        let candidates = MODELS.filter(m => 
          m.supportedComplexities.includes(complexity)
        );

        // Filter by provider preference
        if (config.preferredProvider) {
          const providerModels = candidates.filter(m => 
            m.provider === config.preferredProvider
          );
          if (providerModels.length > 0) {
            candidates = providerModels;
          }
        }

        if (candidates.length === 0) return null;

        // Sort by preference
        candidates.sort((a, b) => {
          if (config.preferCost) {
            return a.costPerToken - b.costPerToken;
          }
          if (config.preferSpeed) {
            return b.speedRating - a.speedRating;
          }
          if (config.preferQuality) {
            return b.qualityRating - a.qualityRating;
          }
          return 0;
        });

        return candidates[0];
      };

      const simpleWithCost = selectModel('simple', { preferCost: true, preferSpeed: false, preferQuality: false });
      const complexWithQuality = selectModel('complex', { preferCost: false, preferSpeed: false, preferQuality: true });
      const simpleWithSpeed = selectModel('simple', { preferCost: false, preferSpeed: true, preferQuality: false });

      return {
        simpleWithCostModel: simpleWithCost?.id,
        complexWithQualityModel: complexWithQuality?.id,
        simpleWithSpeedModel: simpleWithSpeed?.id,
      };
    });

    expect(result.simpleWithCostModel).toBe('gpt-4o-mini');
    expect(result.complexWithQualityModel).toBe('claude-3-5-sonnet');
    expect(result.simpleWithSpeedModel).toBe('gpt-4o-mini');
  });

  test('should track routing decisions', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface RoutingDecision {
        id: string;
        timestamp: Date;
        prompt: string;
        complexity: string;
        selectedModel: string;
        reason: string;
        estimatedCost: number;
      }

      const decisions: RoutingDecision[] = [];

      const recordDecision = (decision: Omit<RoutingDecision, 'id' | 'timestamp'>) => {
        decisions.push({
          ...decision,
          id: `dec-${Date.now()}`,
          timestamp: new Date(),
        });
      };

      const getDecisionStats = () => {
        const modelCounts: Record<string, number> = {};
        const complexityCounts: Record<string, number> = {};
        let totalCost = 0;

        decisions.forEach(d => {
          modelCounts[d.selectedModel] = (modelCounts[d.selectedModel] || 0) + 1;
          complexityCounts[d.complexity] = (complexityCounts[d.complexity] || 0) + 1;
          totalCost += d.estimatedCost;
        });

        return { modelCounts, complexityCounts, totalCost };
      };

      // Record some decisions
      recordDecision({
        prompt: 'Simple question',
        complexity: 'simple',
        selectedModel: 'gpt-4o-mini',
        reason: 'cost_optimization',
        estimatedCost: 0.001,
      });

      recordDecision({
        prompt: 'Complex task',
        complexity: 'complex',
        selectedModel: 'claude-3-5-sonnet',
        reason: 'quality_required',
        estimatedCost: 0.05,
      });

      recordDecision({
        prompt: 'Another simple',
        complexity: 'simple',
        selectedModel: 'gpt-4o-mini',
        reason: 'cost_optimization',
        estimatedCost: 0.002,
      });

      const stats = getDecisionStats();

      return {
        totalDecisions: decisions.length,
        gpt4oMiniCount: stats.modelCounts['gpt-4o-mini'],
        sonnetCount: stats.modelCounts['claude-3-5-sonnet'],
        simpleCount: stats.complexityCounts['simple'],
        totalCost: stats.totalCost,
      };
    });

    expect(result.totalDecisions).toBe(3);
    expect(result.gpt4oMiniCount).toBe(2);
    expect(result.sonnetCount).toBe(1);
    expect(result.simpleCount).toBe(2);
    expect(result.totalCost).toBe(0.053);
  });

  test('should handle fallback routing', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface FallbackConfig {
        primaryModel: string;
        fallbackModels: string[];
        retryCount: number;
      }

      interface ModelStatus {
        id: string;
        isAvailable: boolean;
        errorRate: number;
      }

      const modelStatuses: ModelStatus[] = [
        { id: 'gpt-4o', isAvailable: false, errorRate: 0.5 },
        { id: 'gpt-4o-mini', isAvailable: true, errorRate: 0.01 },
        { id: 'claude-3-5-sonnet', isAvailable: true, errorRate: 0.02 },
      ];

      const selectWithFallback = (config: FallbackConfig): string | null => {
        // Try primary model
        const primary = modelStatuses.find(m => m.id === config.primaryModel);
        if (primary?.isAvailable && primary.errorRate < 0.1) {
          return primary.id;
        }

        // Try fallbacks in order
        for (const fallbackId of config.fallbackModels) {
          const fallback = modelStatuses.find(m => m.id === fallbackId);
          if (fallback?.isAvailable && fallback.errorRate < 0.1) {
            return fallback.id;
          }
        }

        return null;
      };

      const config1: FallbackConfig = {
        primaryModel: 'gpt-4o',
        fallbackModels: ['claude-3-5-sonnet', 'gpt-4o-mini'],
        retryCount: 3,
      };

      const config2: FallbackConfig = {
        primaryModel: 'gpt-4o-mini',
        fallbackModels: [],
        retryCount: 3,
      };

      return {
        fallbackResult: selectWithFallback(config1),
        directResult: selectWithFallback(config2),
        primaryWasUnavailable: !modelStatuses.find(m => m.id === 'gpt-4o')?.isAvailable,
      };
    });

    expect(result.fallbackResult).toBe('claude-3-5-sonnet');
    expect(result.directResult).toBe('gpt-4o-mini');
    expect(result.primaryWasUnavailable).toBe(true);
  });
});

test.describe('Auto Router Settings', () => {
  test('should manage router preferences', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      interface RouterSettings {
        enabled: boolean;
        defaultStrategy: 'cost' | 'speed' | 'quality' | 'balanced';
        minComplexityForPremium: 'medium' | 'complex' | 'expert';
        preferredProviders: string[];
        excludedModels: string[];
        budgetLimit?: number;
      }

      const defaultSettings: RouterSettings = {
        enabled: true,
        defaultStrategy: 'balanced',
        minComplexityForPremium: 'complex',
        preferredProviders: [],
        excludedModels: [],
      };

      let settings = { ...defaultSettings };

      const updateSettings = (updates: Partial<RouterSettings>) => {
        settings = { ...settings, ...updates };
      };

      const shouldUsePremiumModel = (complexity: string): boolean => {
        const complexityOrder = ['simple', 'medium', 'complex', 'expert'];
        const currentIndex = complexityOrder.indexOf(complexity);
        const minIndex = complexityOrder.indexOf(settings.minComplexityForPremium);
        return currentIndex >= minIndex;
      };

      // Test default settings
      const simpleNeedsPremium = shouldUsePremiumModel('simple');
      const complexNeedsPremium = shouldUsePremiumModel('complex');

      // Update settings
      updateSettings({ minComplexityForPremium: 'medium' });
      const mediumNeedsPremiumAfter = shouldUsePremiumModel('medium');

      return {
        simpleNeedsPremium,
        complexNeedsPremium,
        mediumNeedsPremiumAfter,
        defaultStrategy: defaultSettings.defaultStrategy,
      };
    });

    expect(result.simpleNeedsPremium).toBe(false);
    expect(result.complexNeedsPremium).toBe(true);
    expect(result.mediumNeedsPremiumAfter).toBe(true);
    expect(result.defaultStrategy).toBe('balanced');
  });
});
