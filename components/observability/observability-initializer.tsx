'use client';

/**
 * ObservabilityInitializer - Initializes observability systems on app start
 */

import { useEffect } from 'react';
import { useSettingsStore } from '@/stores';

export function ObservabilityInitializer() {
  const observabilitySettings = useSettingsStore((state) => state.observabilitySettings);

  useEffect(() => {
    if (!observabilitySettings?.enabled) {
      return;
    }

    const initObservability = async () => {
      try {
        const { initializeObservability } = await import('@/lib/ai/observability');

        await initializeObservability({
          langfuse: {
            publicKey: observabilitySettings.langfusePublicKey || undefined,
            secretKey: observabilitySettings.langfuseSecretKey || undefined,
            host: observabilitySettings.langfuseHost || undefined,
            enabled: observabilitySettings.langfuseEnabled,
          },
          openTelemetry: {
            serviceName: observabilitySettings.serviceName || 'cognia-ai',
            traceEndpoint: observabilitySettings.openTelemetryEndpoint || undefined,
            tracingEnabled: observabilitySettings.openTelemetryEnabled,
          },
        });

        console.log('[Observability] Initialized successfully');
      } catch (error) {
        console.warn('[Observability] Failed to initialize:', error);
      }
    };

    initObservability();

    return () => {
      // Cleanup on unmount
      import('@/lib/ai/observability').then(({ shutdownObservability }) => {
        shutdownObservability().catch(console.warn);
      });
    };
  }, [observabilitySettings]);

  return null;
}
