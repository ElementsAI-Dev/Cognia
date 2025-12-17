/**
 * Tests for Agent Stop Conditions
 */

import {
  stepCountIs,
  durationExceeds,
  noToolCalls,
  toolCalled,
  responseContains,
  allToolsSucceeded,
  anyToolFailed,
  allOf,
  anyOf,
  not,
  defaultStopCondition,
  checkStopCondition,
  namedCondition,
  type AgentExecutionState,
} from './stop-conditions';

const createState = (overrides: Partial<AgentExecutionState> = {}): AgentExecutionState => ({
  stepCount: 0,
  startTime: new Date(),
  lastToolCalls: [],
  isRunning: true,
  ...overrides,
});

describe('stepCountIs', () => {
  it('returns true when step count equals max', () => {
    const condition = stepCountIs(5);
    const state = createState({ stepCount: 5 });
    
    expect(condition(state)).toBe(true);
  });

  it('returns true when step count exceeds max', () => {
    const condition = stepCountIs(5);
    const state = createState({ stepCount: 10 });
    
    expect(condition(state)).toBe(true);
  });

  it('returns false when step count is below max', () => {
    const condition = stepCountIs(5);
    const state = createState({ stepCount: 3 });
    
    expect(condition(state)).toBe(false);
  });

  it('handles zero step count', () => {
    const condition = stepCountIs(0);
    const state = createState({ stepCount: 0 });
    
    expect(condition(state)).toBe(true);
  });
});

describe('durationExceeds', () => {
  it('returns true when duration exceeds max', () => {
    const condition = durationExceeds(1000);
    const pastTime = new Date(Date.now() - 2000);
    const state = createState({ startTime: pastTime });
    
    expect(condition(state)).toBe(true);
  });

  it('returns false when duration is below max', () => {
    const condition = durationExceeds(10000);
    const state = createState({ startTime: new Date() });
    
    expect(condition(state)).toBe(false);
  });

  it('returns true when duration equals max', () => {
    const condition = durationExceeds(0);
    const state = createState({ startTime: new Date() });
    
    expect(condition(state)).toBe(true);
  });
});

describe('noToolCalls', () => {
  it('returns true when no tool calls', () => {
    const condition = noToolCalls();
    const state = createState({ lastToolCalls: [] });
    
    expect(condition(state)).toBe(true);
  });

  it('returns false when there are tool calls', () => {
    const condition = noToolCalls();
    const state = createState({
      lastToolCalls: [{ name: 'test', status: 'completed' }],
    });
    
    expect(condition(state)).toBe(false);
  });
});

describe('toolCalled', () => {
  it('returns true when specific tool was called', () => {
    const condition = toolCalled('calculator');
    const state = createState({
      lastToolCalls: [{ name: 'calculator', status: 'completed' }],
    });
    
    expect(condition(state)).toBe(true);
  });

  it('returns false when specific tool was not called', () => {
    const condition = toolCalled('calculator');
    const state = createState({
      lastToolCalls: [{ name: 'search', status: 'completed' }],
    });
    
    expect(condition(state)).toBe(false);
  });

  it('returns false when no tools called', () => {
    const condition = toolCalled('calculator');
    const state = createState({ lastToolCalls: [] });
    
    expect(condition(state)).toBe(false);
  });

  it('returns true when tool is among multiple calls', () => {
    const condition = toolCalled('calculator');
    const state = createState({
      lastToolCalls: [
        { name: 'search', status: 'completed' },
        { name: 'calculator', status: 'completed' },
        { name: 'file', status: 'completed' },
      ],
    });
    
    expect(condition(state)).toBe(true);
  });
});

describe('responseContains', () => {
  it('returns true when response contains text', () => {
    const condition = responseContains('done');
    const state = createState({ lastResponse: 'Task is done!' });
    
    expect(condition(state)).toBe(true);
  });

  it('returns false when response does not contain text', () => {
    const condition = responseContains('done');
    const state = createState({ lastResponse: 'Still working' });
    
    expect(condition(state)).toBe(false);
  });

  it('is case insensitive', () => {
    const condition = responseContains('DONE');
    const state = createState({ lastResponse: 'Task is done!' });
    
    expect(condition(state)).toBe(true);
  });

  it('returns false when no response', () => {
    const condition = responseContains('done');
    const state = createState({ lastResponse: undefined });
    
    expect(condition(state)).toBe(false);
  });
});

describe('allToolsSucceeded', () => {
  it('returns true when all tools completed', () => {
    const condition = allToolsSucceeded();
    const state = createState({
      lastToolCalls: [
        { name: 'tool1', status: 'completed' },
        { name: 'tool2', status: 'completed' },
      ],
    });
    
    expect(condition(state)).toBe(true);
  });

  it('returns false when any tool failed', () => {
    const condition = allToolsSucceeded();
    const state = createState({
      lastToolCalls: [
        { name: 'tool1', status: 'completed' },
        { name: 'tool2', status: 'error' },
      ],
    });
    
    expect(condition(state)).toBe(false);
  });

  it('returns false when no tool calls', () => {
    const condition = allToolsSucceeded();
    const state = createState({ lastToolCalls: [] });
    
    expect(condition(state)).toBe(false);
  });
});

describe('anyToolFailed', () => {
  it('returns true when any tool has error status', () => {
    const condition = anyToolFailed();
    const state = createState({
      lastToolCalls: [
        { name: 'tool1', status: 'completed' },
        { name: 'tool2', status: 'error' },
      ],
    });
    
    expect(condition(state)).toBe(true);
  });

  it('returns false when all tools completed', () => {
    const condition = anyToolFailed();
    const state = createState({
      lastToolCalls: [
        { name: 'tool1', status: 'completed' },
        { name: 'tool2', status: 'completed' },
      ],
    });
    
    expect(condition(state)).toBe(false);
  });

  it('returns false when no tool calls', () => {
    const condition = anyToolFailed();
    const state = createState({ lastToolCalls: [] });
    
    expect(condition(state)).toBe(false);
  });
});

describe('allOf', () => {
  it('returns true when all conditions are met', () => {
    const condition = allOf(
      stepCountIs(5),
      noToolCalls()
    );
    const state = createState({ stepCount: 5, lastToolCalls: [] });
    
    expect(condition(state)).toBe(true);
  });

  it('returns false when any condition is not met', () => {
    const condition = allOf(
      stepCountIs(5),
      noToolCalls()
    );
    const state = createState({
      stepCount: 5,
      lastToolCalls: [{ name: 'tool', status: 'completed' }],
    });
    
    expect(condition(state)).toBe(false);
  });

  it('returns true for empty conditions', () => {
    const condition = allOf();
    const state = createState();
    
    expect(condition(state)).toBe(true);
  });
});

describe('anyOf', () => {
  it('returns true when any condition is met', () => {
    const condition = anyOf(
      stepCountIs(10),
      noToolCalls()
    );
    const state = createState({ stepCount: 5, lastToolCalls: [] });
    
    expect(condition(state)).toBe(true);
  });

  it('returns false when no conditions are met', () => {
    const condition = anyOf(
      stepCountIs(10),
      toolCalled('specific')
    );
    const state = createState({
      stepCount: 5,
      lastToolCalls: [{ name: 'other', status: 'completed' }],
    });
    
    expect(condition(state)).toBe(false);
  });

  it('returns false for empty conditions', () => {
    const condition = anyOf();
    const state = createState();
    
    expect(condition(state)).toBe(false);
  });
});

describe('not', () => {
  it('inverts true to false', () => {
    const condition = not(stepCountIs(5));
    const state = createState({ stepCount: 5 });
    
    expect(condition(state)).toBe(false);
  });

  it('inverts false to true', () => {
    const condition = not(stepCountIs(5));
    const state = createState({ stepCount: 3 });
    
    expect(condition(state)).toBe(true);
  });
});

describe('defaultStopCondition', () => {
  it('stops after max steps', () => {
    const condition = defaultStopCondition(5);
    const state = createState({
      stepCount: 5,
      lastToolCalls: [{ name: 'tool', status: 'completed' }],
    });
    
    expect(condition(state)).toBe(true);
  });

  it('stops when no tool calls', () => {
    const condition = defaultStopCondition(10);
    const state = createState({ stepCount: 3, lastToolCalls: [] });
    
    expect(condition(state)).toBe(true);
  });

  it('continues when under max steps and has tool calls', () => {
    const condition = defaultStopCondition(10);
    const state = createState({
      stepCount: 3,
      lastToolCalls: [{ name: 'tool', status: 'completed' }],
    });
    
    expect(condition(state)).toBe(false);
  });

  it('uses default max of 10', () => {
    const condition = defaultStopCondition();
    const state = createState({
      stepCount: 10,
      lastToolCalls: [{ name: 'tool', status: 'completed' }],
    });
    
    expect(condition(state)).toBe(true);
  });
});

describe('checkStopCondition', () => {
  it('returns shouldStop true when condition met', () => {
    const condition = stepCountIs(5);
    const state = createState({ stepCount: 5 });
    const result = checkStopCondition(state, condition);
    
    expect(result.shouldStop).toBe(true);
  });

  it('returns shouldStop false when condition not met', () => {
    const condition = stepCountIs(5);
    const state = createState({ stepCount: 3 });
    const result = checkStopCondition(state, condition);
    
    expect(result.shouldStop).toBe(false);
  });

  it('includes reason when condition met', () => {
    const condition = stepCountIs(5);
    const state = createState({ stepCount: 5 });
    const result = checkStopCondition(state, condition, 'Max steps reached');
    
    expect(result.reason).toBe('Max steps reached');
  });

  it('has undefined reason when condition not met', () => {
    const condition = stepCountIs(5);
    const state = createState({ stepCount: 3 });
    const result = checkStopCondition(state, condition, 'Max steps reached');
    
    expect(result.reason).toBeUndefined();
  });

  it('uses default reason when name not provided', () => {
    const condition = stepCountIs(5);
    const state = createState({ stepCount: 5 });
    const result = checkStopCondition(state, condition);
    
    expect(result.reason).toBe('Stop condition met');
  });
});

describe('namedCondition', () => {
  it('creates condition with name', () => {
    const condition = namedCondition('custom', stepCountIs(5));
    
    expect(condition.conditionName).toBe('custom');
  });

  it('preserves original condition behavior', () => {
    const condition = namedCondition('custom', stepCountIs(5));
    const state = createState({ stepCount: 5 });
    
    expect(condition(state)).toBe(true);
  });

  it('returns false when original condition returns false', () => {
    const condition = namedCondition('custom', stepCountIs(5));
    const state = createState({ stepCount: 3 });
    
    expect(condition(state)).toBe(false);
  });
});
