import {
  useAgentTraceStore,
  selectSessionObservation,
} from './agent-trace-store';

describe('agent-trace-store', () => {
  beforeEach(() => {
    useAgentTraceStore.getState().clearAll();
  });

  it('tracks terminal session summary fields and correlation identifiers', () => {
    const store = useAgentTraceStore.getState();

    store.startSession('session-1', 'openai/gpt-test');
    store.addEvent({
      id: 'evt-1',
      sessionId: 'session-1',
      eventType: 'tool_call_result',
      timestamp: Date.UTC(2026, 2, 14, 12, 0, 0),
      stepNumber: 2,
      toolName: 'code_edit',
      success: false,
      error: 'edit failed',
      duration: 125,
      responsePreview: 'failure preview',
      traceId: 'trace-1',
      turnId: 'turn-1',
      spanId: 'span-1',
      tokenUsage: {
        promptTokens: 10,
        completionTokens: 5,
        totalTokens: 15,
      },
    });
    store.endSession('session-1', 'error');

    const summary = selectSessionObservation('session-1')(useAgentTraceStore.getState());

    expect(summary).toMatchObject({
      sessionId: 'session-1',
      status: 'error',
      currentStep: 2,
      lastEventType: 'tool_call_result',
      lastError: 'edit failed',
      lastResponsePreview: 'failure preview',
      toolCalls: 1,
      toolFailures: 1,
      correlation: {
        traceId: 'trace-1',
        turnId: 'turn-1',
        spanId: 'span-1',
      },
    });
    expect(summary?.tokenUsage.totalTokens).toBe(15);
  });

  it('keeps completed sessions inspectable until explicitly removed', () => {
    const store = useAgentTraceStore.getState();

    store.startSession('session-2');
    store.addEvent({
      id: 'evt-2',
      sessionId: 'session-2',
      eventType: 'response',
      timestamp: Date.UTC(2026, 2, 14, 12, 5, 0),
      responsePreview: 'done',
    });
    store.endSession('session-2', 'completed');

    expect(selectSessionObservation('session-2')(useAgentTraceStore.getState())).toMatchObject({
      sessionId: 'session-2',
      status: 'completed',
      lastResponsePreview: 'done',
    });

    store.removeSession('session-2');

    expect(selectSessionObservation('session-2')(useAgentTraceStore.getState())).toBeUndefined();
  });
});
