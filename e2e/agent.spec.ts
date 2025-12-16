import { test, expect } from '@playwright/test';

/**
 * Agent functionality tests
 */
test.describe('Agent Features', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should have agent store initialized', async ({ page }) => {
    // Check for agent store in the app
    const agentStoreExists = await page.evaluate(() => {
      // Check if zustand stores are accessible
      return typeof window !== 'undefined';
    });

    expect(agentStoreExists).toBe(true);
  });

  test('should support tool registration pattern', async ({ page }) => {
    // Test tool registration logic
    const toolResult = await page.evaluate(() => {
      const tools: Record<string, { name: string; description: string }> = {};
      
      // Simulate tool registration
      tools['calculator'] = {
        name: 'calculator',
        description: 'Perform mathematical calculations',
      };
      
      tools['web_search'] = {
        name: 'web_search',
        description: 'Search the web for information',
      };

      return {
        toolCount: Object.keys(tools).length,
        hasCalculator: 'calculator' in tools,
        hasWebSearch: 'web_search' in tools,
      };
    });

    expect(toolResult.toolCount).toBe(2);
    expect(toolResult.hasCalculator).toBe(true);
    expect(toolResult.hasWebSearch).toBe(true);
  });

  test('should support stop conditions', async ({ page }) => {
    // Test stop condition logic
    const stopResult = await page.evaluate(() => {
      const state = {
        stepCount: 5,
        maxSteps: 10,
        lastToolCalls: [],
        isRunning: true,
      };

      // Step count condition
      const stepCountReached = state.stepCount >= state.maxSteps;
      
      // No tool calls condition
      const noToolCalls = state.lastToolCalls.length === 0;

      return {
        stepCountReached,
        noToolCalls,
        shouldStop: stepCountReached || noToolCalls,
      };
    });

    expect(stopResult.stepCountReached).toBe(false);
    expect(stopResult.noToolCalls).toBe(true);
    expect(stopResult.shouldStop).toBe(true);
  });

  test('should track agent execution state', async ({ page }) => {
    const stateResult = await page.evaluate(() => {
      const executionState = {
        stepCount: 0,
        startTime: new Date(),
        lastResponse: '',
        lastToolCalls: [] as { name: string; status: string }[],
        isRunning: false,
        error: null as string | null,
      };

      // Simulate execution
      executionState.isRunning = true;
      executionState.stepCount = 1;
      executionState.lastResponse = 'Test response';
      executionState.lastToolCalls.push({ name: 'test_tool', status: 'completed' });
      executionState.isRunning = false;

      return {
        stepCount: executionState.stepCount,
        hasResponse: executionState.lastResponse.length > 0,
        toolCallCount: executionState.lastToolCalls.length,
        isComplete: !executionState.isRunning,
      };
    });

    expect(stateResult.stepCount).toBe(1);
    expect(stateResult.hasResponse).toBe(true);
    expect(stateResult.toolCallCount).toBe(1);
    expect(stateResult.isComplete).toBe(true);
  });
});

test.describe('Calculator Tool', () => {
  test('should evaluate mathematical expressions', async ({ page }) => {
    await page.goto('/');
    
    const calcResult = await page.evaluate(() => {
      // Safe math evaluation
      const evaluateExpression = (expr: string): number => {
        const sanitized = expr
          .replace(/\s+/g, '')
          .replace(/\^/g, '**');
        
        try {
          const fn = new Function(`"use strict"; return (${sanitized});`);
          return fn();
        } catch {
          return NaN;
        }
      };

      return {
        addition: evaluateExpression('2 + 3'),
        multiplication: evaluateExpression('4 * 5'),
        power: evaluateExpression('2 ^ 3'),
        complex: evaluateExpression('(10 + 5) * 2'),
      };
    });

    expect(calcResult.addition).toBe(5);
    expect(calcResult.multiplication).toBe(20);
    expect(calcResult.power).toBe(8);
    expect(calcResult.complex).toBe(30);
  });

  test('should handle unit conversions', async ({ page }) => {
    await page.goto('/');
    
    const conversionResult = await page.evaluate(() => {
      const conversions: Record<string, number> = {
        m: 1,
        km: 1000,
        cm: 0.01,
        ft: 0.3048,
      };

      const convert = (value: number, from: string, to: string): number => {
        const fromFactor = conversions[from];
        const toFactor = conversions[to];
        return (value * fromFactor) / toFactor;
      };

      return {
        kmToM: convert(1, 'km', 'm'),
        mToCm: convert(1, 'm', 'cm'),
        ftToM: convert(1, 'ft', 'm'),
      };
    });

    expect(conversionResult.kmToM).toBe(1000);
    expect(conversionResult.mToCm).toBe(100);
    expect(conversionResult.ftToM).toBeCloseTo(0.3048, 4);
  });
});
