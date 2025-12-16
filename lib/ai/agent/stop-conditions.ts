/**
 * Stop Conditions - Define when agent execution should stop
 */

export interface AgentExecutionState {
  stepCount: number;
  startTime: Date;
  lastResponse?: string;
  lastToolCalls: Array<{ name: string; status: string }>;
  isRunning: boolean;
  error?: string;
}

export type StopCondition = (state: AgentExecutionState) => boolean;

export interface StopConditionResult {
  shouldStop: boolean;
  reason?: string;
}

/**
 * Stop after a specific number of steps
 */
export function stepCountIs(maxSteps: number): StopCondition {
  return (state) => state.stepCount >= maxSteps;
}

/**
 * Stop after a specific duration (in milliseconds)
 */
export function durationExceeds(maxDurationMs: number): StopCondition {
  return (state) => {
    const elapsed = Date.now() - state.startTime.getTime();
    return elapsed >= maxDurationMs;
  };
}

/**
 * Stop when no more tool calls are made
 */
export function noToolCalls(): StopCondition {
  return (state) => state.lastToolCalls.length === 0;
}

/**
 * Stop when a specific tool is called
 */
export function toolCalled(toolName: string): StopCondition {
  return (state) => state.lastToolCalls.some((call) => call.name === toolName);
}

/**
 * Stop when response contains specific text
 */
export function responseContains(text: string): StopCondition {
  return (state) => state.lastResponse?.toLowerCase().includes(text.toLowerCase()) ?? false;
}

/**
 * Stop when all tools have been executed successfully
 */
export function allToolsSucceeded(): StopCondition {
  return (state) => {
    if (state.lastToolCalls.length === 0) return false;
    return state.lastToolCalls.every((call) => call.status === 'completed');
  };
}

/**
 * Stop when any tool fails
 */
export function anyToolFailed(): StopCondition {
  return (state) => state.lastToolCalls.some((call) => call.status === 'error');
}

/**
 * Combine multiple conditions with AND logic
 */
export function allOf(...conditions: StopCondition[]): StopCondition {
  return (state) => conditions.every((condition) => condition(state));
}

/**
 * Combine multiple conditions with OR logic
 */
export function anyOf(...conditions: StopCondition[]): StopCondition {
  return (state) => conditions.some((condition) => condition(state));
}

/**
 * Negate a condition
 */
export function not(condition: StopCondition): StopCondition {
  return (state) => !condition(state);
}

/**
 * Default stop condition: stop after max steps or when no tool calls
 */
export function defaultStopCondition(maxSteps: number = 10): StopCondition {
  return anyOf(stepCountIs(maxSteps), noToolCalls());
}

/**
 * Check stop condition and return result with reason
 */
export function checkStopCondition(
  state: AgentExecutionState,
  condition: StopCondition,
  conditionName?: string
): StopConditionResult {
  const shouldStop = condition(state);
  return {
    shouldStop,
    reason: shouldStop ? conditionName || 'Stop condition met' : undefined,
  };
}

/**
 * Create a custom stop condition with a name
 */
export function namedCondition(
  name: string,
  condition: StopCondition
): StopCondition & { conditionName: string } {
  const namedFn = (state: AgentExecutionState) => condition(state);
  (namedFn as StopCondition & { conditionName: string }).conditionName = name;
  return namedFn as StopCondition & { conditionName: string };
}
