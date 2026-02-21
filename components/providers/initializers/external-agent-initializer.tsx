'use client';

import { useEffect, useRef } from 'react';
import { getExternalAgentManager } from '@/lib/ai/agent/external/manager';
import {
  getExternalAgentExecutionBlockReason,
  isExternalAgentExecutable,
} from '@/lib/ai/agent/external/config-normalizer';
import { useExternalAgentStore } from '@/stores/agent/external-agent-store';

export function ExternalAgentInitializer() {
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (hasInitialized.current) {
      return;
    }
    hasInitialized.current = true;

    let isActive = true;

    const initialize = async () => {
      const store = useExternalAgentStore.getState();
      const manager = getExternalAgentManager();
      const persistedAgents = store.getAllAgents();

      for (const config of persistedAgents) {
        if (!isActive) {
          return;
        }

        if (!manager.getAgent(config.id) && config.protocol === 'acp') {
          try {
            await manager.addAgent(config);
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            if (!message.includes('Agent already exists')) {
              store.setConnectionStatus(config.id, 'error');
              useExternalAgentStore.setState({
                lastError: message,
              });
            }
          }
        }

        const executionBlockedReason = getExternalAgentExecutionBlockReason(config);
        if (executionBlockedReason) {
          store.setConnectionStatus(config.id, config.protocol === 'acp' ? 'disconnected' : 'error');
          continue;
        }

        if (!store.autoConnectOnStartup) {
          const instance = manager.getAgent(config.id);
          store.setConnectionStatus(config.id, instance?.connectionStatus ?? 'disconnected');
          continue;
        }

        if (!isExternalAgentExecutable(config)) {
          store.setConnectionStatus(config.id, 'error');
          continue;
        }

        try {
          await manager.connect(config.id);
          const instance = manager.getAgent(config.id);
          store.setConnectionStatus(config.id, instance?.connectionStatus ?? 'connected');
        } catch (error) {
          store.setConnectionStatus(config.id, 'error');
          useExternalAgentStore.setState({
            lastError: error instanceof Error ? error.message : String(error),
          });
        }
      }
    };

    void initialize();

    return () => {
      isActive = false;
    };
  }, []);

  return null;
}

export default ExternalAgentInitializer;
