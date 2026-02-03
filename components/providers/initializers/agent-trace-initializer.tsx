'use client';

/**
 * Agent Trace Initializer
 * Runs auto-cleanup for agent traces on application startup
 */

import { useEffect } from 'react';
import { runAgentTraceAutoCleanup } from '@/lib/agent-trace';

export function AgentTraceInitializer() {
  useEffect(() => {
    // Run auto-cleanup on mount (only runs once due to internal flag)
    runAgentTraceAutoCleanup().catch((error) => {
      console.error('[AgentTraceInitializer] Auto-cleanup failed:', error);
    });
  }, []);

  return null;
}
