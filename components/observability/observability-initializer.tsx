'use client';

/**
 * ObservabilityInitializer - Initializes observability systems on app start
 */

import { useEffect, useMemo } from 'react';
import { useSettingsStore } from '@/stores';
import { buildObservabilitySettingsProjection, normalizeObservabilitySettings } from '@/lib/observability';
import { loggers } from '@/lib/logger';

export function ObservabilityInitializer() {
  const observabilitySettings = useSettingsStore((state) => state.observabilitySettings);
  const agentTraceSettings = useSettingsStore((state) => state.agentTraceSettings);
  const settings = useMemo(
    () => normalizeObservabilitySettings(observabilitySettings),
    [observabilitySettings]
  );
  const projection = useMemo(
    () =>
      buildObservabilitySettingsProjection({
        observabilitySettings: settings,
        agentTraceSettings,
      }),
    [agentTraceSettings, settings]
  );

  useEffect(() => {
    if (!projection.runtimeCaptureEnabled) {
      return;
    }

    const initObservability = async () => {
      try {
        const { initializeObservability } = await import('@/lib/ai/observability');

        await initializeObservability({
          langfuse: {
            publicKey: settings.langfusePublicKey || undefined,
            secretKey: settings.langfuseSecretKey || undefined,
            host: settings.langfuseHost || undefined,
            enabled: projection.langfuse.active,
          },
          openTelemetry: {
            serviceName: settings.serviceName || 'cognia-ai',
            traceEndpoint: settings.openTelemetryEndpoint || undefined,
            tracingEnabled: projection.openTelemetry.active,
          },
        });

        loggers.ai.info('[Observability] Initialized successfully');
      } catch (error) {
        loggers.ai.warn('[Observability] Failed to initialize', { error });
      }
    };

    initObservability();

    return () => {
      // Cleanup on unmount
      import('@/lib/ai/observability').then(({ shutdownObservability }) => {
        shutdownObservability().catch((err) => loggers.ai.warn('[Observability] Shutdown error', { error: err }));
      });
    };
  }, [projection.langfuse.active, projection.openTelemetry.active, projection.runtimeCaptureEnabled, settings]);

  return null;
}
