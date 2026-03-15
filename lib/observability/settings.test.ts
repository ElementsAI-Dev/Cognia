import { DEFAULT_AGENT_TRACE_SETTINGS } from '@/stores/settings';
import type { ObservabilitySettingsData } from '@/types/observability';
import {
  buildObservabilitySettingsProjection,
  normalizeAgentTraceSettings,
  normalizeObservabilitySettings,
} from './settings';

describe('observability settings projection', () => {
  const baseObservabilitySettings: ObservabilitySettingsData = {
    enabled: false,
    langfuseEnabled: false,
    langfusePublicKey: '',
    langfuseSecretKey: '',
    langfuseHost: 'https://cloud.langfuse.com',
    openTelemetryEnabled: false,
    openTelemetryEndpoint: 'http://localhost:4318/v1/traces',
    serviceName: 'cognia-ai',
  };

  it('normalizes missing observability settings with migration-safe defaults', () => {
    expect(normalizeObservabilitySettings(undefined)).toEqual(baseObservabilitySettings);
  });

  it('normalizes missing agent trace settings with migration-safe defaults', () => {
    expect(normalizeAgentTraceSettings(undefined)).toEqual(DEFAULT_AGENT_TRACE_SETTINGS);
  });

  it('derives incomplete remote configuration when Langfuse is enabled without credentials', () => {
    const projection = buildObservabilitySettingsProjection({
      observabilitySettings: {
        ...baseObservabilitySettings,
        langfuseEnabled: true,
      },
      agentTraceSettings: {
        ...DEFAULT_AGENT_TRACE_SETTINGS,
        enabled: false,
      },
    });

    expect(projection.langfuse.status).toBe('incomplete');
    expect(projection.langfuse.missingFields).toEqual([
      'langfusePublicKey',
      'langfuseSecretKey',
    ]);
    expect(projection.surfaces.sidebar.status).toBe('incomplete');
  });

  it('derives ready state when agent trace recording is enabled even if remote capture is off', () => {
    const projection = buildObservabilitySettingsProjection({
      observabilitySettings: baseObservabilitySettings,
      agentTraceSettings: {
        ...DEFAULT_AGENT_TRACE_SETTINGS,
        enabled: true,
      },
    });

    expect(projection.agentTrace.status).toBe('ready');
    expect(projection.surfaces.dashboard.status).toBe('ready');
  });

  it('derives history-only discoverability when capture is off but local history exists', () => {
    const projection = buildObservabilitySettingsProjection({
      observabilitySettings: baseObservabilitySettings,
      agentTraceSettings: {
        ...DEFAULT_AGENT_TRACE_SETTINGS,
        enabled: false,
      },
      usageRecordCount: 3,
      traceRecordCount: 0,
    });

    expect(projection.history.hasAnyHistory).toBe(true);
    expect(projection.surfaces.sidebar.status).toBe('history-only');
    expect(projection.surfaces.sidebar.visible).toBe(true);
  });

  it('keeps external trace drill-down available when Langfuse is configured but global capture is disabled', () => {
    const projection = buildObservabilitySettingsProjection({
      observabilitySettings: {
        ...baseObservabilitySettings,
        langfuseEnabled: true,
        langfusePublicKey: 'pk-test',
        langfuseSecretKey: 'sk-test',
      },
      agentTraceSettings: {
        ...DEFAULT_AGENT_TRACE_SETTINGS,
        enabled: false,
      },
    });

    expect(projection.langfuse.configured).toBe(true);
    expect(projection.surfaces.traceViewerExternal.available).toBe(true);
    expect(projection.surfaces.traceViewerExternal.status).toBe('ready');
  });
});
