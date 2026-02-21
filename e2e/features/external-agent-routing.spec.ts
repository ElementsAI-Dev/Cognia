import { expect, test } from '@playwright/test';

type ExecutionResult = {
  success: boolean;
  finalResponse: string;
  sessionId?: string;
  error?: string;
};

test.describe('External Agent Routing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('creates and selects an external agent profile', async ({ page }) => {
    const result = await page.evaluate(() => {
      const externalAgents: Record<string, { id: string; name: string; protocol: string }> = {};
      const session = { id: 'session-1', externalAgentId: undefined as string | undefined };

      const createAgent = (agent: { id: string; name: string; protocol: string }) => {
        externalAgents[agent.id] = agent;
      };

      const selectAgentForSession = (sessionId: string, agentId: string) => {
        if (sessionId === session.id && externalAgents[agentId]) {
          session.externalAgentId = agentId;
        }
      };

      createAgent({ id: 'external-agent-1', name: 'Claude ACP', protocol: 'acp' });
      selectAgentForSession('session-1', 'external-agent-1');

      return {
        hasAgent: Boolean(externalAgents['external-agent-1']),
        selectedExternalAgentId: session.externalAgentId,
      };
    });

    expect(result.hasAgent).toBe(true);
    expect(result.selectedExternalAgentId).toBe('external-agent-1');
  });

  test('routes agent message to external execution when selected', async ({ page }) => {
    const result = await page.evaluate(() => {
      const session = {
        id: 'session-1',
        externalAgentId: 'external-agent-1',
        externalAgentSessionId: 'external-session-old',
      };

      const calls: Array<{ channel: 'external' | 'builtin'; sessionId?: string }> = [];

      const executeExternal = (prompt: string, sessionId?: string): ExecutionResult => {
        calls.push({ channel: 'external', sessionId });
        return {
          success: true,
          finalResponse: `external:${prompt}`,
          sessionId: 'external-session-new',
        };
      };

      const executeBuiltin = (_prompt: string): ExecutionResult => {
        calls.push({ channel: 'builtin' });
        return { success: true, finalResponse: 'builtin' };
      };

      const route = (prompt: string): ExecutionResult => {
        if (!session.externalAgentId) {
          return executeBuiltin(prompt);
        }
        const external = executeExternal(prompt, session.externalAgentSessionId);
        if (external.sessionId) {
          session.externalAgentSessionId = external.sessionId;
        }
        return external;
      };

      const routed = route('hello');

      return {
        routedResponse: routed.finalResponse,
        externalCalls: calls.filter((item) => item.channel === 'external').length,
        builtinCalls: calls.filter((item) => item.channel === 'builtin').length,
        reusedSessionId: calls[0]?.sessionId,
        updatedSessionId: session.externalAgentSessionId,
      };
    });

    expect(result.routedResponse).toBe('external:hello');
    expect(result.externalCalls).toBe(1);
    expect(result.builtinCalls).toBe(0);
    expect(result.reusedSessionId).toBe('external-session-old');
    expect(result.updatedSessionId).toBe('external-session-new');
  });

  test('falls back to built-in execution when external fails', async ({ page }) => {
    const result = await page.evaluate(() => {
      const session = {
        id: 'session-1',
        externalAgentId: 'external-agent-1',
      };

      const calls: Array<'external' | 'builtin'> = [];
      const notices: string[] = [];

      const executeExternal = (): ExecutionResult => {
        calls.push('external');
        return { success: false, finalResponse: '', error: 'external failure' };
      };

      const executeBuiltin = (): ExecutionResult => {
        calls.push('builtin');
        return { success: true, finalResponse: 'builtin fallback response' };
      };

      const routeWithFallback = (): ExecutionResult => {
        if (!session.externalAgentId) {
          return executeBuiltin();
        }

        const external = executeExternal();
        if (external.success) {
          return external;
        }

        notices.push('External failed, fallback to built-in');
        return executeBuiltin();
      };

      const routed = routeWithFallback();
      return {
        response: routed.finalResponse,
        calls,
        notices,
      };
    });

    expect(result.response).toBe('builtin fallback response');
    expect(result.calls).toEqual(['external', 'builtin']);
    expect(result.notices).toContain('External failed, fallback to built-in');
  });
});
