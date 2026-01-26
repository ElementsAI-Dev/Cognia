/**
 * Delay Step Executor
 * Waits for specified duration before continuing
 */

import type { WorkflowStepDefinition } from './types';

export async function executeDelayStep(
  step: WorkflowStepDefinition
): Promise<unknown> {
  switch (step.delayType) {
    case 'fixed': {
      const ms = step.delayMs || 1000;
      await new Promise(resolve => setTimeout(resolve, ms));
      return { delayed: ms };
    }
    case 'until': {
      if (step.untilTime) {
        const targetTime = new Date(step.untilTime).getTime();
        const now = Date.now();
        if (targetTime > now) {
          await new Promise(resolve => setTimeout(resolve, targetTime - now));
        }
      }
      return { delayed: true, until: step.untilTime };
    }
    case 'cron':
    default:
      // Cron expressions would need a proper scheduler - just pass through for now
      return { delayed: false, reason: 'Cron scheduling not supported in immediate execution' };
  }
}
