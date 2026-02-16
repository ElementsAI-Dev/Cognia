import type { IsolatedSessionContext } from './types';

export function createIsolatedContext(sessionId: string): IsolatedSessionContext {
  return {
    sessionId,
    createdAt: new Date(),
    lastActivityAt: new Date(),
    workingMemory: [],
    toolResults: new Map(),
    tempData: new Map(),
    isActive: true,
  };
}

export function getToolCacheKey(toolName: string, args: Record<string, unknown>): string {
  return `${toolName}:${JSON.stringify(args)}`;
}
