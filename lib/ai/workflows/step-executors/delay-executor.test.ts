/**
 * Delay Step Executor Tests
 */

import { executeDelayStep } from './delay-executor';
import type { WorkflowStepDefinition } from './types';

const createStep = (overrides: Partial<WorkflowStepDefinition>): WorkflowStepDefinition => ({
  id: 'test-step',
  name: 'Test Step',
  description: 'Test step description',
  type: 'delay',
  inputs: {},
  outputs: {},
  ...overrides,
} as WorkflowStepDefinition);

describe('executeDelayStep', () => {
  describe('fixed delay', () => {
    it('should delay for specified milliseconds', async () => {
      const step = createStep({
        id: 'delay-1',
        name: 'Fixed Delay',
        delayType: 'fixed',
        delayMs: 50,
      });

      const start = Date.now();
      const result = await executeDelayStep(step);
      const elapsed = Date.now() - start;

      expect(result).toEqual({ delayed: 50 });
      expect(elapsed).toBeGreaterThanOrEqual(45);
    });

    it('should use default 1000ms when delayMs not specified', async () => {
      const step = createStep({
        id: 'delay-2',
        name: 'Default Delay',
        delayType: 'fixed',
      });

      const start = Date.now();
      const result = await executeDelayStep(step);
      const elapsed = Date.now() - start;

      expect(result).toEqual({ delayed: 1000 });
      expect(elapsed).toBeGreaterThanOrEqual(950);
    }, 2000);
  });

  describe('until delay', () => {
    it('should delay until specified time', async () => {
      const targetTime = new Date(Date.now() + 50).toISOString();
      const step = createStep({
        id: 'delay-3',
        name: 'Until Delay',
        delayType: 'until',
        untilTime: targetTime,
      });

      const result = await executeDelayStep(step);

      expect(result).toEqual({ delayed: true, until: targetTime });
    });

    it('should not delay if target time is in the past', async () => {
      const pastTime = new Date(Date.now() - 1000).toISOString();
      const step = createStep({
        id: 'delay-4',
        name: 'Past Delay',
        delayType: 'until',
        untilTime: pastTime,
      });

      const start = Date.now();
      const result = await executeDelayStep(step);
      const elapsed = Date.now() - start;

      expect(result).toEqual({ delayed: true, until: pastTime });
      expect(elapsed).toBeLessThan(50);
    });

    it('should handle missing untilTime', async () => {
      const step = createStep({
        id: 'delay-5',
        name: 'No Time Delay',
        delayType: 'until',
      });

      const result = await executeDelayStep(step);

      expect(result).toEqual({ delayed: true, until: undefined });
    });
  });

  describe('cron delay', () => {
    it('should return unsupported message for cron', async () => {
      const step = createStep({
        id: 'delay-6',
        name: 'Cron Delay',
        delayType: 'cron',
        cronExpression: '0 * * * *',
      });

      const result = await executeDelayStep(step);

      expect(result).toEqual({
        delayed: false,
        reason: 'Cron scheduling not supported in immediate execution',
      });
    });
  });

  describe('unknown delay type', () => {
    it('should handle unknown delay type as cron', async () => {
      const step = createStep({
        id: 'delay-7',
        name: 'Unknown Delay',
        delayType: 'unknown' as never,
      });

      const result = await executeDelayStep(step);

      expect(result).toEqual({
        delayed: false,
        reason: 'Cron scheduling not supported in immediate execution',
      });
    });
  });
});
